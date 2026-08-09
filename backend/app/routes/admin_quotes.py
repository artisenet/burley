from datetime import datetime, date
from flask import Blueprint, request, jsonify
from app.extensions import db
from app.models import Quote, QuoteItem, Service, Invoice, InvoicePaymentSchedule, Event
from app.services import pricing
from app.services.quotes import accept_quote_to_invoice
from app.utils.decorators import requires_role

admin_quotes_bp = Blueprint("admin_quotes", __name__, url_prefix="/api/admin/quotes")


@admin_quotes_bp.get("")
@requires_role("admin")
def list_quotes():
    client_id = request.args.get("client_id", type=int)
    query = Quote.query
    if client_id:
        query = query.filter_by(client_id=client_id)
    quotes = query.order_by(Quote.created_at.desc()).all()
    return jsonify([q.to_dict(include_items=False) for q in quotes])


@admin_quotes_bp.get("/<int:quote_id>")
@requires_role("admin")
def get_quote(quote_id):
    quote = Quote.query.get_or_404(quote_id)
    return jsonify(quote.to_dict())


@admin_quotes_bp.post("")
@requires_role("admin")
def create_quote():
    """
    Create a quote with line items in one call.
    Body: {
      "client_id": 3, "event_id": null, "valid_until": "2026-08-15",
      "items": [
        {"service_id": 2, "description": "Decor - full venue", "quantity": 1,
         "cost_price": 20000, "markup_pct": 35}   // markup_pct optional, defaults to service default
      ]
    }
    """
    data = request.get_json() or {}
    client_id = data.get("client_id")
    items_data = data.get("items", [])

    if not client_id or not items_data:
        return jsonify({"error": "client_id and at least one item are required"}), 400

    quote = Quote(
        client_id=client_id,
        event_id=data.get("event_id"),
        version=1,
        status="draft",
        valid_until=datetime.fromisoformat(data["valid_until"]).date() if data.get("valid_until") else None,
    )
    db.session.add(quote)
    db.session.flush()  # get quote.id before adding items

    warnings = []
    for item in items_data:
        service = Service.query.get(item.get("service_id")) if item.get("service_id") else None
        cost_price = item.get("cost_price", service.cost_price if service else 0)
        markup_pct = item.get("markup_pct", service.default_markup_pct if service else 35)
        unit_price = pricing.compute_selling_price(cost_price, markup_pct)
        quantity = item.get("quantity", 1)

        quote_item = QuoteItem(
            quote_id=quote.id,
            service_id=service.id if service else None,
            description=item.get("description", service.name if service else "Custom item"),
            quantity=quantity,
            cost_price=cost_price,
            markup_pct=markup_pct,
            unit_price=unit_price,
            total_price=round(unit_price * float(quantity), 2),
        )
        db.session.add(quote_item)

        warning = pricing.margin_warning(cost_price, unit_price)
        if warning:
            warnings.append({"description": quote_item.description, "warning": warning})

    db.session.commit()

    response = quote.to_dict()
    if warnings:
        response["margin_warnings"] = warnings
    return jsonify(response), 201


@admin_quotes_bp.post("/<int:quote_id>/new-version")
@requires_role("admin")
def create_new_version(quote_id):
    """Clone a quote as a new version - used when the client wants revisions
    after negotiation, without losing the original for reference."""
    original = Quote.query.get_or_404(quote_id)

    new_quote = Quote(
        client_id=original.client_id,
        event_id=original.event_id,
        version=original.version + 1,
        status="draft",
        valid_until=original.valid_until,
    )
    db.session.add(new_quote)
    db.session.flush()

    for item in original.items:
        db.session.add(
            QuoteItem(
                quote_id=new_quote.id,
                service_id=item.service_id,
                description=item.description,
                quantity=item.quantity,
                cost_price=item.cost_price,
                markup_pct=item.markup_pct,
                unit_price=item.unit_price,
                total_price=item.total_price,
            )
        )

    db.session.commit()
    return jsonify(new_quote.to_dict()), 201


@admin_quotes_bp.post("/<int:quote_id>/send")
@requires_role("admin")
def send_quote(quote_id):
    quote = Quote.query.get_or_404(quote_id)
    quote.status = "sent"
    db.session.commit()
    return jsonify(quote.to_dict())


@admin_quotes_bp.post("/<int:quote_id>/accept")
@requires_role("admin")
def accept_quote_and_create_invoice(quote_id):
    """
    Converts an accepted quote into an invoice with a payment schedule.
    Body: {
      "schedule": [
        {"label": "deposit", "amount_due": 10000, "due_date": "2026-08-01"},
        {"label": "balance", "amount_due": 17000, "due_date": "2026-09-01"}
      ],
      "due_date": "2026-09-01",     // overall invoice due date
      "create_event": true,         // optional - create an Event tied to this invoice
      "event_date": "2026-09-15",
      "venue": "...", "guest_count": 150
    }
    If "schedule" is omitted, a single "full" schedule item for the whole
    invoice total is created instead.
    """
    quote = Quote.query.get_or_404(quote_id)
    if quote.status == "accepted":
        return jsonify({"error": "Quote has already been accepted"}), 409

    data = request.get_json() or {}

    event_id = quote.event_id
    if data.get("create_event") and not event_id:
        event = Event(
            client_id=quote.client_id,
            quote_id=quote.id,
            event_date=datetime.fromisoformat(data["event_date"]).date() if data.get("event_date") else None,
            venue=data.get("venue"),
            guest_count=data.get("guest_count"),
            status="confirmed",
        )
        db.session.add(event)
        db.session.flush()
        event_id = event.id
        quote.event_id = event_id

    schedule = data.get("schedule")
    if schedule:
        for entry in schedule:
            if entry.get("due_date"):
                entry["due_date"] = datetime.fromisoformat(entry["due_date"]).date()

    invoice = accept_quote_to_invoice(
        quote,
        due_date=datetime.fromisoformat(data["due_date"]).date() if data.get("due_date") else None,
        schedule=schedule,
        event_id=event_id,
    )

    db.session.commit()
    return jsonify({"quote": quote.to_dict(), "invoice": invoice.to_dict()}), 201
    db.session.commit()
    return jsonify({"quote": quote.to_dict(), "invoice": invoice.to_dict()}), 201
