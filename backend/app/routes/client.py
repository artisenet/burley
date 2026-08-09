from flask import Blueprint, request, jsonify, current_app, send_file
from flask_jwt_extended import jwt_required, get_jwt_identity
from app.extensions import db
from app.models import Quote, Invoice, InvoicePaymentSchedule, Event, PaymentTransaction, Lead, User, Service, ServiceCategory, QuoteItem
from app.services import sasapay
from app.services import pdf as pdf_service
from app.services.quotes import accept_quote_to_invoice

client_bp = Blueprint("client", __name__, url_prefix="/api/client")


def _current_client_id():
    return int(get_jwt_identity())


@client_bp.post("/quote-requests")
@jwt_required()
def submit_quote_request():
    """
    A logged-in client asking for a new quote (a fresh event, or an addition
    to an existing one) - reuses the Lead model rather than inventing a
    parallel pipeline, since a Lead is already exactly "something the admin
    needs to turn into a quote." It's tagged client_user_id so it shows up
    linked to their existing account (the admin Leads UI already shows
    "Client account linked" instead of a convert button for these), and
    source='client_portal' distinguishes it from a first-time public inquiry.

    Body: { "category": "Decor", "event_date": "2026-11-01",
            "guest_count": 80, "notes": "..." }
    """
    client_id = _current_client_id()
    user = User.query.get(client_id)
    if not user:
        return jsonify({"error": "Account not found"}), 404

    data = request.get_json() or {}
    category = data.get("category", "General")
    event_date = data.get("event_date")
    guest_count = data.get("guest_count")
    notes_text = data.get("notes", "")

    combined_notes = f"Requested via client portal.\nCategory: {category}"
    if event_date:
        combined_notes += f"\nPreferred date: {event_date}"
    if guest_count:
        combined_notes += f"\nGuest count: {guest_count}"
    if notes_text:
        combined_notes += f"\nNotes: {notes_text}"

    lead = Lead(
        name=user.name,
        email=user.email,
        phone=user.phone,
        source="client_portal",
        status="new",
        notes=combined_notes,
        client_user_id=user.id,
    )
    db.session.add(lead)
    db.session.commit()

    return jsonify(lead.to_dict()), 201


@client_bp.get("/services")
@jwt_required()
def browse_services():
    """
    Read-only catalog view for clients who already know what they want and
    don't need a consultation first. Deliberately excludes cost_price and
    markup_pct - a client should see the selling price, never the cost or
    margin behind it.
    """
    services = Service.query.filter_by(active=True).all()
    result = []
    for s in services:
        category = ServiceCategory.query.get(s.category_id)
        result.append(
            {
                "id": s.id,
                "name": s.name,
                "description": s.description,
                "category": category.name if category else None,
                "selling_price": s.default_selling_price,
                "unit": s.unit,
            }
        )
    return jsonify(result)


@client_bp.post("/bookings")
@jwt_required()
def submit_booking_request():
    """
    Self-service booking for a client who already knows what they want -
    skips the consultation/negotiation flow entirely. Always prices at the
    catalog's current default (cost_price + default_markup_pct) - a client
    can pick services and quantities but never touch pricing, so this can't
    be used to undercut the margin floor the way a manually-typed quote item
    could.

    Creates a draft Quote tagged requested_by_client=True, so it shows up in
    the admin Quotes list ready for a one-click "Send to client" rather than
    landing unnoticed - she still has to actively confirm it before the
    client can accept and pay, she just doesn't have to build it from
    scratch.

    Body: { "items": [{"service_id": 3, "quantity": 1}, ...], "notes": "..." }
    """
    client_id = _current_client_id()
    data = request.get_json() or {}
    items_data = data.get("items", [])

    if not items_data:
        return jsonify({"error": "At least one service is required"}), 400

    quote = Quote(client_id=client_id, version=1, status="draft", requested_by_client=True)
    db.session.add(quote)
    db.session.flush()

    for item in items_data:
        service = Service.query.filter_by(id=item.get("service_id"), active=True).first()
        if not service:
            db.session.rollback()
            return jsonify({"error": f"Service #{item.get('service_id')} not found or unavailable"}), 400

        quantity = item.get("quantity", 1)
        unit_price = service.default_selling_price

        db.session.add(
            QuoteItem(
                quote_id=quote.id,
                service_id=service.id,
                description=service.name,
                quantity=quantity,
                cost_price=service.cost_price,
                markup_pct=service.default_markup_pct,
                unit_price=unit_price,
                total_price=round(unit_price * float(quantity), 2),
            )
        )

    db.session.commit()
    return jsonify(quote.to_dict()), 201


@client_bp.get("/quotes")
@jwt_required()
def my_quotes():
    client_id = _current_client_id()
    quotes = Quote.query.filter_by(client_id=client_id).order_by(Quote.created_at.desc()).all()
    return jsonify([q.to_dict() for q in quotes])


@client_bp.get("/quotes/<int:quote_id>")
@jwt_required()
def my_quote_detail(quote_id):
    client_id = _current_client_id()
    quote = Quote.query.filter_by(id=quote_id, client_id=client_id).first()
    if not quote:
        return jsonify({"error": "Quote not found"}), 404
    return jsonify(quote.to_dict())


@client_bp.post("/quotes/<int:quote_id>/accept")
@jwt_required()
def accept_my_quote(quote_id):
    """
    Client self-service acceptance. Always uses a single 'full' payment
    schedule item - a client isn't given control over splitting up their own
    payment schedule, that stays an admin decision. If she wants a deposit
    arrangement for a given client, she accepts it on their behalf from the
    admin side instead with a custom schedule.
    """
    client_id = _current_client_id()
    quote = Quote.query.filter_by(id=quote_id, client_id=client_id).first()
    if not quote:
        return jsonify({"error": "Quote not found"}), 404
    if quote.status != "sent":
        return jsonify({"error": "This quote is not currently awaiting your decision"}), 409

    invoice = accept_quote_to_invoice(quote)
    db.session.commit()
    return jsonify({"quote": quote.to_dict(), "invoice": invoice.to_dict()}), 201


@client_bp.post("/quotes/<int:quote_id>/reject")
@jwt_required()
def reject_my_quote(quote_id):
    client_id = _current_client_id()
    quote = Quote.query.filter_by(id=quote_id, client_id=client_id).first()
    if not quote:
        return jsonify({"error": "Quote not found"}), 404
    if quote.status != "sent":
        return jsonify({"error": "This quote is not currently awaiting your decision"}), 409

    quote.status = "rejected"
    db.session.commit()
    return jsonify(quote.to_dict())


@client_bp.get("/invoices")
@jwt_required()
def my_invoices():
    client_id = _current_client_id()
    invoices = Invoice.query.filter_by(client_id=client_id).order_by(Invoice.created_at.desc()).all()
    return jsonify([i.to_dict() for i in invoices])


@client_bp.get("/invoices/<int:invoice_id>")
@jwt_required()
def my_invoice_detail(invoice_id):
    client_id = _current_client_id()
    invoice = Invoice.query.filter_by(id=invoice_id, client_id=client_id).first()
    if not invoice:
        return jsonify({"error": "Invoice not found"}), 404
    return jsonify(invoice.to_dict())


@client_bp.post("/invoices/schedule-items/<int:schedule_item_id>/pay")
@jwt_required()
def pay_schedule_item(schedule_item_id):
    """Client self-service payment - same underlying flow as the admin-initiated
    collection, but scoped so a client can only pay their own invoices."""
    client_id = _current_client_id()

    schedule_item = InvoicePaymentSchedule.query.get_or_404(schedule_item_id)
    invoice = Invoice.query.get(schedule_item.invoice_id)
    if not invoice or invoice.client_id != client_id:
        return jsonify({"error": "Invoice not found"}), 404

    if schedule_item.status == "paid":
        return jsonify({"error": "This payment has already been made"}), 409

    data = request.get_json() or {}
    phone_number = data.get("phone_number")
    if not phone_number:
        return jsonify({"error": "phone_number is required"}), 400

    try:
        result = sasapay.initiate_collection(
            phone_number=phone_number,
            amount=schedule_item.amount_due,
            account_reference=f"INV-{invoice.id}-{schedule_item.label}",
            description=f"Invoice #{invoice.id} - {schedule_item.label}",
        )
    except sasapay.SasaPayError as e:
        current_app.logger.error(f"SasaPay collection failed: {e}")
        return jsonify({"error": "Payment initiation failed, please try again"}), 502

    txn = PaymentTransaction(
        direction="collection",
        invoice_id=invoice.id,
        schedule_item_id=schedule_item.id,
        amount=schedule_item.amount_due,
        provider="sasapay",
        provider_merchant_request_id=result["merchant_request_id"],
        provider_checkout_request_id=result["checkout_request_id"],
        account_reference=result.get("account_reference"),
        status="initiated",
    )
    db.session.add(txn)
    db.session.commit()

    return jsonify(
        {
            "transaction_id": txn.id,
            "checkout_request_id": result["checkout_request_id"],
            "message": "Payment prompt sent - check your phone to complete it.",
        }
    ), 202


@client_bp.get("/dashboard")
@jwt_required()
def dashboard():
    """
    Aggregated 'what needs my attention' view for the client home screen:
    upcoming events, quotes awaiting a decision, and outstanding payments -
    each client only ever sees their own data (scoped via client_id).
    """
    client_id = _current_client_id()

    upcoming_events = (
        Event.query.filter_by(client_id=client_id)
        .filter(Event.status.in_(["inquiry", "confirmed"]))
        .order_by(Event.event_date.asc())
        .limit(5)
        .all()
    )

    pending_quotes = (
        Quote.query.filter_by(client_id=client_id, status="sent")
        .order_by(Quote.created_at.desc())
        .all()
    )

    invoices = Invoice.query.filter_by(client_id=client_id).all()
    outstanding_invoices = [i for i in invoices if i.amount_outstanding > 0]

    next_payment = None
    for inv in outstanding_invoices:
        for item in inv.schedule_items:
            if item.status == "pending":
                if next_payment is None or (
                    item.due_date and (next_payment["due_date"] is None or item.due_date < next_payment["due_date"])
                ):
                    next_payment = {
                        "invoice_id": inv.id,
                        "schedule_item_id": item.id,
                        "label": item.label,
                        "amount_due": str(item.amount_due),
                        "due_date": item.due_date.isoformat() if item.due_date else None,
                    }

    return jsonify(
        {
            "upcoming_events": [e.to_dict() for e in upcoming_events],
            "pending_quotes": [q.to_dict() for q in pending_quotes],
            "outstanding_total": sum(i.amount_outstanding for i in outstanding_invoices),
            "outstanding_invoice_count": len(outstanding_invoices),
            "next_payment": next_payment,
        }
    )


@client_bp.get("/events")
@jwt_required()
def my_events():
    client_id = _current_client_id()
    events = Event.query.filter_by(client_id=client_id).order_by(Event.event_date.asc()).all()
    return jsonify([e.to_dict() for e in events])


@client_bp.get("/events/<int:event_id>")
@jwt_required()
def my_event_detail(event_id):
    """
    Combined view for one event: the event itself, 'what's included' (the
    accepted quote's line items, if any), and payment status (the linked
    invoice's schedule) - everything a client needs to see on one screen
    without stitching together three separate API calls themselves.
    """
    client_id = _current_client_id()
    event = Event.query.filter_by(id=event_id, client_id=client_id).first()
    if not event:
        return jsonify({"error": "Event not found"}), 404

    quote = Quote.query.get(event.quote_id) if event.quote_id else None
    invoice = Invoice.query.get(event.invoice_id) if event.invoice_id else None

    return jsonify(
        {
            "event": event.to_dict(),
            "quote": quote.to_dict() if quote else None,
            "invoice": invoice.to_dict() if invoice else None,
        }
    )




@client_bp.get("/invoices/<int:invoice_id>/pdf")
@jwt_required()
def download_my_invoice_pdf(invoice_id):
    client_id = _current_client_id()
    invoice = Invoice.query.filter_by(id=invoice_id, client_id=client_id).first()
    if not invoice:
        return jsonify({"error": "Invoice not found"}), 404
    client = User.query.get(client_id)
    quote = Quote.query.get(invoice.quote_id) if invoice.quote_id else None
    buffer = pdf_service.generate_invoice_pdf(invoice, client, quote)
    return send_file(buffer, mimetype="application/pdf", as_attachment=True, download_name=f"invoice-{invoice.id}.pdf")


@client_bp.get("/invoices/schedule-items/<int:schedule_item_id>/receipt.pdf")
@jwt_required()
def download_my_receipt_pdf(schedule_item_id):
    client_id = _current_client_id()
    schedule_item = InvoicePaymentSchedule.query.get_or_404(schedule_item_id)
    invoice = Invoice.query.get(schedule_item.invoice_id)
    if not invoice or invoice.client_id != client_id:
        return jsonify({"error": "Receipt not found"}), 404

    txn = PaymentTransaction.query.filter_by(schedule_item_id=schedule_item.id, status="success").first()
    if not txn:
        return jsonify({"error": "No successful payment found for this item yet"}), 404

    client = User.query.get(client_id)
    buffer = pdf_service.generate_receipt_pdf(txn, client, f"Invoice #{invoice.id} - {schedule_item.label}")
    return send_file(buffer, mimetype="application/pdf", as_attachment=True, download_name=f"receipt-{txn.id}.pdf")


@client_bp.get("/events/<int:event_id>/contract.pdf")
@jwt_required()
def download_my_contract_pdf(event_id):
    client_id = _current_client_id()
    event = Event.query.filter_by(id=event_id, client_id=client_id).first()
    if not event:
        return jsonify({"error": "Event not found"}), 404
    client = User.query.get(client_id)
    quote = Quote.query.get(event.quote_id) if event.quote_id else None
    buffer = pdf_service.generate_contract_pdf(event, quote, client)
    return send_file(buffer, mimetype="application/pdf", as_attachment=True, download_name=f"contract-event-{event.id}.pdf")
