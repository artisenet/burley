from datetime import datetime
from flask import Blueprint, request, jsonify, current_app
from app.extensions import db
from app.models import Lead, Consultation, Quote, MailingListSubscriber
from app.services import sasapay
from app.routes.calendar import check_consultation_conflict

public_bp = Blueprint("public", __name__, url_prefix="/api/public")

DEFAULT_CONSULTATION_FEE = 1500  # KES - adjust to whatever the planner charges


@public_bp.post("/leads")
def create_lead():
    """Capture a new lead from the landing page contact/quote-request form."""
    data = request.get_json() or {}
    name = data.get("name")
    if not name:
        return jsonify({"error": "name is required"}), 400

    lead = Lead(
        name=name,
        email=data.get("email"),
        phone=data.get("phone"),
        source=data.get("source", "website"),
        notes=data.get("notes"),
        status="new",
    )
    db.session.add(lead)
    db.session.commit()
    return jsonify(lead.to_dict()), 201


@public_bp.post("/consultations/book")
def book_consultation():
    """
    Core booking fork:
      - intent='consultation_only' -> paid consultation, must pay the fee to confirm
      - intent='service_booking'   -> tied to a quote the client is accepting with a
                                       deposit; consultation fee is waived automatically

    Body:
      { "lead_id": 1, "scheduled_at": "...", "mode": "virtual",
        "intent": "consultation_only" | "service_booking",
        "quote_id": <required if intent=service_booking> }
    """
    data = request.get_json() or {}
    lead_id = data.get("lead_id")
    scheduled_at_raw = data.get("scheduled_at")
    intent = data.get("intent", "consultation_only")

    if not lead_id or not scheduled_at_raw:
        return jsonify({"error": "lead_id and scheduled_at are required"}), 400

    lead = Lead.query.get(lead_id)
    if not lead:
        return jsonify({"error": "Lead not found"}), 404

    try:
        scheduled_at = datetime.fromisoformat(scheduled_at_raw)
    except ValueError:
        return jsonify({"error": "scheduled_at must be an ISO 8601 datetime"}), 400

    duration_mins = data.get("duration_mins", 45)
    conflict_message = check_consultation_conflict(scheduled_at, duration_mins)
    if conflict_message:
        return jsonify({"error": conflict_message}), 409

    fee_waived = False
    linked_quote_id = None

    if intent == "service_booking":
        quote_id = data.get("quote_id")
        quote = Quote.query.get(quote_id) if quote_id else None
        if not quote:
            return jsonify({"error": "A valid quote_id is required when intent=service_booking"}), 400
        fee_waived = True
        linked_quote_id = quote.id

    consultation = Consultation(
        lead_id=lead.id,
        scheduled_at=scheduled_at,
        mode=data.get("mode", "virtual"),
        duration_mins=duration_mins,
        fee_amount=0 if fee_waived else DEFAULT_CONSULTATION_FEE,
        fee_waived=fee_waived,
        linked_quote_id=linked_quote_id,
        status="pending",
    )
    db.session.add(consultation)
    lead.status = "consultation_booked"
    db.session.commit()

    return jsonify(
        {
            "consultation": consultation.to_dict(),
            "requires_payment": consultation.requires_payment(),
        }
    ), 201


@public_bp.post("/consultations/<int:consultation_id>/pay")
def pay_consultation_fee(consultation_id):
    """Initiate a SasaPay collection for a consultation fee that isn't waived."""
    consultation = Consultation.query.get_or_404(consultation_id)

    if not consultation.requires_payment():
        return jsonify({"error": "This consultation does not require payment"}), 400

    data = request.get_json() or {}
    phone_number = data.get("phone_number")
    if not phone_number:
        return jsonify({"error": "phone_number is required"}), 400

    from app.models import PaymentTransaction

    try:
        result = sasapay.initiate_collection(
            phone_number=phone_number,
            amount=consultation.fee_amount,
            account_reference=f"CONSULT-{consultation.id}",
            description="Consultation fee",
        )
    except sasapay.SasaPayError as e:
        current_app.logger.error(f"SasaPay collection failed: {e}")
        return jsonify({"error": "Payment initiation failed, please try again"}), 502

    txn = PaymentTransaction(
        direction="collection",
        consultation_id=consultation.id,
        amount=consultation.fee_amount,
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


@public_bp.post("/mailing-list")
def join_mailing_list():
    data = request.get_json() or {}
    email = data.get("email")
    if not email:
        return jsonify({"error": "email is required"}), 400

    existing = MailingListSubscriber.query.filter_by(email=email).first()
    if existing:
        existing.is_active = True
        db.session.commit()
        return jsonify(existing.to_dict())

    subscriber = MailingListSubscriber(
        email=email,
        name=data.get("name"),
        source=data.get("source", "landing_page"),
    )
    db.session.add(subscriber)
    db.session.commit()
    return jsonify(subscriber.to_dict()), 201
