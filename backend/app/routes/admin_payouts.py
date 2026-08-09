from datetime import datetime
from flask import Blueprint, request, jsonify, current_app
from app.extensions import db
from app.models import StaffPayout, StaffPayoutItem, EventStaffAssignment, User, StaffProfile, PaymentTransaction
from app.services import sasapay
from app.utils.decorators import requires_role

admin_payouts_bp = Blueprint("admin_payouts", __name__, url_prefix="/api/admin/payouts")


@admin_payouts_bp.get("")
@requires_role("admin")
def list_payouts():
    status = request.args.get("status")
    query = StaffPayout.query
    if status:
        query = query.filter_by(status=status)
    payouts = query.order_by(StaffPayout.created_at.desc()).all()
    return jsonify([p.to_dict() for p in payouts])


@admin_payouts_bp.get("/pending-by-staff")
@requires_role("admin")
def pending_by_staff():
    """
    Overview screen: for every staff member, how much is currently owed and
    unbatched. Groups unpaid EventStaffAssignments by user, which is what she'll
    look at before deciding to run a weekly/monthly payout, or settle a
    per-event assignment on the spot.
    """
    unpaid = EventStaffAssignment.query.filter_by(paid_status="unpaid").all()

    by_user = {}
    for a in unpaid:
        by_user.setdefault(a.user_id, []).append(a)

    result = []
    for user_id, assignments in by_user.items():
        user = User.query.get(user_id)
        profile = StaffProfile.query.filter_by(user_id=user_id).first()
        result.append(
            {
                "user_id": user_id,
                "name": user.name if user else None,
                "pay_structure": profile.pay_structure if profile else None,
                "total_owed": sum(float(a.agreed_rate) for a in assignments),
                "assignment_count": len(assignments),
                "assignments": [a.to_dict() for a in assignments],
            }
        )
    return jsonify(result)


@admin_payouts_bp.post("/generate")
@requires_role("admin")
def generate_payout():
    """
    Creates a StaffPayout batch for one user, pulling in all currently-unpaid
    EventStaffAssignment rows for them (optionally filtered to a date range -
    relevant for weekly/monthly casuals where she wants to settle just this
    period, not their entire unpaid history in one go).

    For a per_event casual who wants to be paid immediately after one gig,
    just call this right after assigning them with no date filter - it'll
    produce a payout containing exactly that one assignment.

    Body: { "user_id": 5, "period_start": "2026-07-21", "period_end": "2026-07-27" }
    period_start/period_end are optional.
    """
    data = request.get_json() or {}
    user_id = data.get("user_id")
    if not user_id:
        return jsonify({"error": "user_id is required"}), 400

    query = EventStaffAssignment.query.filter_by(user_id=user_id, paid_status="unpaid")
    assignments = query.all()

    if not assignments:
        return jsonify({"error": "No unpaid assignments found for this staff member"}), 404

    total = sum(float(a.agreed_rate) for a in assignments)

    period_start = datetime.fromisoformat(data["period_start"]).date() if data.get("period_start") else None
    period_end = datetime.fromisoformat(data["period_end"]).date() if data.get("period_end") else None

    payout = StaffPayout(
        user_id=user_id,
        period_start=period_start,
        period_end=period_end,
        total_amount=total,
        status="pending",
    )
    db.session.add(payout)
    db.session.flush()

    for a in assignments:
        db.session.add(
            StaffPayoutItem(payout_id=payout.id, event_staff_assignment_id=a.id, amount=a.agreed_rate)
        )
        a.payout_batch_id = payout.id
        a.paid_status = "partial"  # will flip to 'paid' once the payout actually settles

    db.session.commit()
    return jsonify(payout.to_dict()), 201


@admin_payouts_bp.post("/<int:payout_id>/disburse")
@requires_role("admin")
def disburse_payout(payout_id):
    """
    Actually sends the money via SasaPay B2C. Separate from /generate so she
    can review the batch (and the total) before committing to the transfer.
    Body: { "phone_number": "2547...", "channel_code": "63902" }  // defaults to M-Pesa
    """
    payout = StaffPayout.query.get_or_404(payout_id)
    if payout.status == "paid":
        return jsonify({"error": "This payout has already been disbursed"}), 409

    data = request.get_json() or {}
    phone_number = data.get("phone_number")
    if not phone_number:
        profile = StaffProfile.query.filter_by(user_id=payout.user_id).first()
        phone_number = profile.mpesa_number if profile else None
    if not phone_number:
        return jsonify({"error": "No phone number on file - provide phone_number in the request"}), 400

    channel_code = data.get("channel_code", "63902")

    try:
        result = sasapay.initiate_payout(
            phone_number=phone_number,
            amount=payout.total_amount,
            channel_code=channel_code,
            reason="Staff payout",
            reference=f"PAYOUT-{payout.id}",
        )
    except sasapay.SasaPayError as e:
        current_app.logger.error(f"SasaPay payout failed: {e}")
        return jsonify({"error": "Payout initiation failed, please try again"}), 502

    txn = PaymentTransaction(
        direction="payout",
        payout_id=payout.id,
        amount=payout.total_amount,
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
            "message": "Payout initiated - will confirm once SasaPay processes it.",
        }
    ), 202


@admin_payouts_bp.post("/<int:payout_id>/mark-paid-manual")
@requires_role("admin")
def mark_payout_paid_manual(payout_id):
    """For cash or direct bank transfer payouts done outside SasaPay."""
    payout = StaffPayout.query.get_or_404(payout_id)
    payout.status = "paid"
    payout.payment_method = "cash"
    payout.paid_at = datetime.utcnow()

    for item in payout.items:
        assignment = EventStaffAssignment.query.get(item.event_staff_assignment_id)
        if assignment:
            assignment.paid_status = "paid"

    db.session.commit()
    return jsonify(payout.to_dict())
