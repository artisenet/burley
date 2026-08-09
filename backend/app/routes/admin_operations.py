import uuid
from flask import Blueprint, request, jsonify
from app.extensions import db
from app.models import Vendor, Expense, User, StaffProfile, Lead
from app.utils.decorators import requires_role

admin_operations_bp = Blueprint("admin_operations", __name__, url_prefix="/api/admin")


# --- Leads ---

@admin_operations_bp.get("/leads")
@requires_role("admin")
def list_leads():
    status = request.args.get("status")
    query = Lead.query
    if status:
        query = query.filter_by(status=status)
    leads = query.order_by(Lead.created_at.desc()).all()
    return jsonify([l.to_dict() for l in leads])


@admin_operations_bp.put("/leads/<int:lead_id>")
@requires_role("admin")
def update_lead(lead_id):
    lead = Lead.query.get_or_404(lead_id)
    data = request.get_json() or {}
    for field in ["status", "notes"]:
        if field in data:
            setattr(lead, field, data[field])
    db.session.commit()
    return jsonify(lead.to_dict())


@admin_operations_bp.post("/leads/<int:lead_id>/convert")
@requires_role("admin")
def convert_lead_to_client(lead_id):
    """
    Creates a client User account from a Lead's contact details (or links to
    an existing one if the email already has an account), and records the
    link on lead.client_user_id. This is the piece that was missing between
    the public booking flow (which only creates Leads) and everything else
    in the system (which operates on User IDs) - previously a lead and a
    client account were two unrelated records unless matched up manually.

    Returns the created/linked user, including a temporary password if a
    new account was created (share this with the client directly - it is
    NOT emailed automatically).
    """
    lead = Lead.query.get_or_404(lead_id)

    if lead.client_user_id:
        existing = User.query.get(lead.client_user_id)
        return jsonify({"user": existing.to_dict(), "created": False, "temporary_password": None})

    if not lead.email:
        return jsonify({"error": "This lead has no email on file - add one before converting to a client account"}), 400

    existing_user = User.query.filter_by(email=lead.email).first()
    if existing_user:
        lead.client_user_id = existing_user.id
        db.session.commit()
        return jsonify({"user": existing_user.to_dict(), "created": False, "temporary_password": None})

    temporary_password = uuid.uuid4().hex[:10]
    user = User(name=lead.name, email=lead.email, phone=lead.phone, role="client")
    user.set_password(temporary_password)
    db.session.add(user)
    db.session.flush()

    lead.client_user_id = user.id
    lead.status = "won"
    db.session.commit()

    return jsonify({"user": user.to_dict(), "created": True, "temporary_password": temporary_password}), 201


# --- Clients ---

@admin_operations_bp.get("/clients")
@requires_role("admin")
def list_clients():
    """Registered client accounts, for populating a picker in the admin
    Quotes UI instead of requiring her to know a raw numeric user ID."""
    clients = User.query.filter_by(role="client").order_by(User.name.asc()).all()
    return jsonify([{"id": c.id, "name": c.name, "email": c.email, "phone": c.phone} for c in clients])


# --- Vendors ---

@admin_operations_bp.get("/vendors")
@requires_role("admin")
def list_vendors():
    vendors = Vendor.query.all()
    return jsonify([v.to_dict() for v in vendors])


@admin_operations_bp.post("/vendors")
@requires_role("admin")
def create_vendor():
    data = request.get_json() or {}
    name = data.get("name")
    if not name:
        return jsonify({"error": "name is required"}), 400

    vendor = Vendor(
        name=name,
        category=data.get("category"),
        contact_info=data.get("contact_info"),
        notes=data.get("notes"),
    )
    db.session.add(vendor)
    db.session.commit()
    return jsonify(vendor.to_dict()), 201


# --- Expenses ---

@admin_operations_bp.get("/expenses")
@requires_role("admin")
def list_expenses():
    event_id = request.args.get("event_id", type=int)
    query = Expense.query
    if event_id:
        query = query.filter_by(event_id=event_id)
    expenses = query.order_by(Expense.created_at.desc()).all()
    return jsonify([e.to_dict() for e in expenses])


@admin_operations_bp.post("/expenses")
@requires_role("admin")
def create_expense():
    """event_id is optional - omit it for general overhead (transport, admin
    costs) that isn't tied to one specific event."""
    data = request.get_json() or {}
    amount = data.get("amount")
    if amount is None:
        return jsonify({"error": "amount is required"}), 400

    expense = Expense(
        event_id=data.get("event_id"),
        category=data.get("category"),
        description=data.get("description"),
        amount=amount,
        vendor_id=data.get("vendor_id"),
        paid_by=data.get("paid_by"),
        receipt_url=data.get("receipt_url"),
    )
    db.session.add(expense)
    db.session.commit()
    return jsonify(expense.to_dict()), 201


# --- Staff ---

@admin_operations_bp.get("/staff")
@requires_role("admin")
def list_staff():
    profiles = StaffProfile.query.all()
    result = []
    for p in profiles:
        user = User.query.get(p.user_id)
        entry = p.to_dict()
        entry["name"] = user.name if user else None
        entry["email"] = user.email if user else None
        result.append(entry)
    return jsonify(result)


@admin_operations_bp.post("/staff")
@requires_role("admin")
def create_staff():
    """
    Creates both the User (role='staff') and their StaffProfile in one call.
    Body: { "name": "...", "email": "...", "phone": "...",
            "employment_type": "casual", "pay_structure": "per_event",
            "rate_amount": 3000, "mpesa_number": "2547...", "id_number": "..." }
    """
    data = request.get_json() or {}
    name = data.get("name")
    email = data.get("email")
    if not name or not email:
        return jsonify({"error": "name and email are required"}), 400

    if User.query.filter_by(email=email).first():
        return jsonify({"error": "A user with this email already exists"}), 409

    user = User(name=name, email=email, phone=data.get("phone"), role="staff")
    # Staff accounts get a placeholder password they can reset on first login -
    # admin should share a reset link rather than a real password over chat.
    user.set_password(data.get("password", "changeme123"))
    db.session.add(user)
    db.session.flush()

    profile = StaffProfile(
        user_id=user.id,
        employment_type=data.get("employment_type", "casual"),
        pay_structure=data.get("pay_structure", "per_event"),
        rate_amount=data.get("rate_amount", 0),
        bank_details=data.get("bank_details"),
        mpesa_number=data.get("mpesa_number"),
        id_number=data.get("id_number"),
    )
    db.session.add(profile)
    db.session.commit()

    response = profile.to_dict()
    response["name"] = user.name
    response["email"] = user.email
    return jsonify(response), 201


@admin_operations_bp.put("/staff/<int:profile_id>")
@requires_role("admin")
def update_staff(profile_id):
    profile = StaffProfile.query.get_or_404(profile_id)
    data = request.get_json() or {}

    for field in ["employment_type", "pay_structure", "rate_amount", "bank_details", "mpesa_number", "id_number", "active"]:
        if field in data:
            setattr(profile, field, data[field])

    db.session.commit()
    return jsonify(profile.to_dict())
