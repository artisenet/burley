from flask import Blueprint, request, jsonify
from app.extensions import db
from app.models import Service, ServiceCategory
from app.services import pricing
from app.utils.decorators import requires_role

admin_catalog_bp = Blueprint("admin_catalog", __name__, url_prefix="/api/admin")


@admin_catalog_bp.get("/categories")
@requires_role("admin")
def list_categories():
    categories = ServiceCategory.query.all()
    return jsonify([c.to_dict() for c in categories])


@admin_catalog_bp.post("/categories")
@requires_role("admin")
def create_category():
    data = request.get_json() or {}
    name = data.get("name")
    if not name:
        return jsonify({"error": "name is required"}), 400
    category = ServiceCategory(name=name)
    db.session.add(category)
    db.session.commit()
    return jsonify(category.to_dict()), 201


@admin_catalog_bp.get("/services")
@requires_role("admin")
def list_services():
    services = Service.query.filter_by(active=True).all()
    return jsonify([s.to_dict() for s in services])


@admin_catalog_bp.post("/services")
@requires_role("admin")
def create_service():
    data = request.get_json() or {}
    name = data.get("name")
    category_id = data.get("category_id")
    cost_price = data.get("cost_price", 0)

    if not name or not category_id:
        return jsonify({"error": "name and category_id are required"}), 400

    markup_pct = data.get("default_markup_pct", 35)

    service = Service(
        name=name,
        category_id=category_id,
        description=data.get("description"),
        cost_price=cost_price,
        default_markup_pct=markup_pct,
        unit=data.get("unit", "flat"),
        is_vendor_sourced=data.get("is_vendor_sourced", False),
    )
    db.session.add(service)
    db.session.commit()

    response = service.to_dict()
    warning = pricing.margin_warning(cost_price, service.default_selling_price)
    if warning:
        response["margin_warning"] = warning

    return jsonify(response), 201


@admin_catalog_bp.put("/services/<int:service_id>")
@requires_role("admin")
def update_service(service_id):
    service = Service.query.get_or_404(service_id)
    data = request.get_json() or {}

    for field in ["name", "description", "cost_price", "default_markup_pct", "unit", "is_vendor_sourced", "active"]:
        if field in data:
            setattr(service, field, data[field])

    db.session.commit()

    response = service.to_dict()
    warning = pricing.margin_warning(service.cost_price, service.default_selling_price)
    if warning:
        response["margin_warning"] = warning

    return jsonify(response)
