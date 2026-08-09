from datetime import datetime
from flask import Blueprint, request, jsonify, send_file
from app.extensions import db
from app.models import Event, EventStaffAssignment, EventVendor, Quote, User
from app.services import pdf as pdf_service
from app.utils.decorators import requires_role

admin_events_bp = Blueprint("admin_events", __name__, url_prefix="/api/admin/events")


@admin_events_bp.get("")
@requires_role("admin")
def list_events():
    status = request.args.get("status")
    query = Event.query
    if status:
        query = query.filter_by(status=status)
    events = query.order_by(Event.event_date.asc()).all()
    return jsonify([e.to_dict(include_profitability=True) for e in events])


@admin_events_bp.get("/<int:event_id>")
@requires_role("admin")
def get_event(event_id):
    """
    Full detail view for one event - everything the admin event-management
    screen needs in a single call: the event itself, who's assigned (staff
    and vendors, with names resolved rather than just IDs), expenses logged
    against it, and the client's contact info.
    """
    from app.models import User, StaffProfile, Vendor, Expense

    event = Event.query.get_or_404(event_id)
    client = User.query.get(event.client_id)

    staff_assignments = []
    for a in event.staff_assignments:
        staff_user = User.query.get(a.user_id)
        entry = a.to_dict()
        entry["staff_name"] = staff_user.name if staff_user else None
        staff_assignments.append(entry)

    vendor_assignments = []
    for v in event.vendor_assignments:
        vendor = Vendor.query.get(v.vendor_id)
        entry = v.to_dict()
        entry["vendor_name"] = vendor.name if vendor else None
        vendor_assignments.append(entry)

    expenses = [e.to_dict() for e in event.expenses]

    data = event.to_dict(include_profitability=True)
    data["client"] = {"id": client.id, "name": client.name, "email": client.email, "phone": client.phone} if client else None
    data["staff_assignments"] = staff_assignments
    data["vendor_assignments"] = vendor_assignments
    data["expenses"] = expenses

    return jsonify(data)


@admin_events_bp.put("/<int:event_id>")
@requires_role("admin")
def update_event(event_id):
    event = Event.query.get_or_404(event_id)
    data = request.get_json() or {}

    if "event_date" in data and data["event_date"]:
        event.event_date = datetime.fromisoformat(data["event_date"]).date()
    for field in ["venue", "guest_count", "status"]:
        if field in data:
            setattr(event, field, data[field])

    db.session.commit()
    return jsonify(event.to_dict(include_profitability=True))


@admin_events_bp.post("/<int:event_id>/staff")
@requires_role("admin")
def assign_staff(event_id):
    """
    Assign a staff member (permanent or casual) to an event.
    Body: { "user_id": 5, "role": "setup crew", "pay_structure_used": "per_event",
            "agreed_rate": 3000, "hours_or_days": null }
    pay_structure_used defaults to the staff member's default if omitted,
    but can be overridden here for a one-off arrangement.
    """
    event = Event.query.get_or_404(event_id)
    data = request.get_json() or {}

    from app.models import StaffProfile

    user_id = data.get("user_id")
    if not user_id:
        return jsonify({"error": "user_id is required"}), 400

    staff_profile = StaffProfile.query.filter_by(user_id=user_id).first()
    pay_structure = data.get("pay_structure_used") or (staff_profile.pay_structure if staff_profile else "per_event")
    agreed_rate = data.get("agreed_rate", staff_profile.rate_amount if staff_profile else 0)

    assignment = EventStaffAssignment(
        event_id=event.id,
        user_id=user_id,
        role=data.get("role"),
        pay_structure_used=pay_structure,
        agreed_rate=agreed_rate,
        hours_or_days=data.get("hours_or_days"),
    )
    db.session.add(assignment)
    db.session.commit()
    return jsonify(assignment.to_dict()), 201


@admin_events_bp.post("/<int:event_id>/vendors")
@requires_role("admin")
def assign_vendor(event_id):
    """Body: { "vendor_id": 2, "service_description": "Catering for 150", "agreed_cost": 45000 }"""
    event = Event.query.get_or_404(event_id)
    data = request.get_json() or {}

    vendor_id = data.get("vendor_id")
    agreed_cost = data.get("agreed_cost")
    if not vendor_id or agreed_cost is None:
        return jsonify({"error": "vendor_id and agreed_cost are required"}), 400

    assignment = EventVendor(
        event_id=event.id,
        vendor_id=vendor_id,
        service_description=data.get("service_description"),
        agreed_cost=agreed_cost,
    )
    db.session.add(assignment)
    db.session.commit()
    return jsonify(assignment.to_dict()), 201


@admin_events_bp.get("/<int:event_id>/profitability")
@requires_role("admin")
def event_profitability(event_id):
    event = Event.query.get_or_404(event_id)
    return jsonify(event.profitability())


@admin_events_bp.get("/<int:event_id>/contract.pdf")
@requires_role("admin")
def download_contract_pdf(event_id):
    event = Event.query.get_or_404(event_id)
    client = User.query.get(event.client_id)
    quote = Quote.query.get(event.quote_id) if event.quote_id else None
    buffer = pdf_service.generate_contract_pdf(event, quote, client)
    return send_file(buffer, mimetype="application/pdf", as_attachment=True, download_name=f"contract-event-{event.id}.pdf")
