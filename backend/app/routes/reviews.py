from flask import Blueprint, request, jsonify
from flask_jwt_extended import jwt_required, get_jwt_identity
from app.extensions import db
from app.models import Review, User
from app.utils.decorators import requires_role

admin_reviews_bp = Blueprint("admin_reviews", __name__, url_prefix="/api/admin/reviews")
client_reviews_bp = Blueprint("client_reviews", __name__, url_prefix="/api/client/reviews")
public_reviews_bp = Blueprint("public_reviews", __name__, url_prefix="/api/public/reviews")


@admin_reviews_bp.get("")
@requires_role("admin")
def list_reviews():
    status = request.args.get("status")
    query = Review.query
    if status:
        query = query.filter_by(status=status)
    reviews = query.order_by(Review.created_at.desc()).all()
    return jsonify([r.to_dict() for r in reviews])


@admin_reviews_bp.post("")
@requires_role("admin")
def create_review():
    """Admin adding a review directly on a client's behalf - goes straight
    to approved since she's vouching for it herself (e.g. transcribing
    something a client said elsewhere)."""
    data = request.get_json() or {}
    name = data.get("name")
    content = data.get("content")
    if not name or not content:
        return jsonify({"error": "name and content are required"}), 400

    review = Review(
        name=name,
        content=content,
        rating=data.get("rating"),
        source="admin_added",
        status="approved",
    )
    db.session.add(review)
    db.session.commit()
    return jsonify(review.to_dict()), 201


@admin_reviews_bp.put("/<int:review_id>")
@requires_role("admin")
def moderate_review(review_id):
    """Approve or reject a client-submitted review."""
    review = Review.query.get_or_404(review_id)
    data = request.get_json() or {}
    if "status" in data:
        review.status = data["status"]
    db.session.commit()
    return jsonify(review.to_dict())


@admin_reviews_bp.delete("/<int:review_id>")
@requires_role("admin")
def delete_review(review_id):
    review = Review.query.get_or_404(review_id)
    db.session.delete(review)
    db.session.commit()
    return jsonify({"deleted": True})


@client_reviews_bp.post("")
@jwt_required()
def submit_review():
    client_id = int(get_jwt_identity())
    user = User.query.get(client_id)
    if not user:
        return jsonify({"error": "Account not found"}), 404

    data = request.get_json() or {}
    content = data.get("content")
    if not content:
        return jsonify({"error": "content is required"}), 400

    rating = data.get("rating")
    if rating is not None and (not isinstance(rating, int) or rating < 1 or rating > 5):
        return jsonify({"error": "rating must be an integer between 1 and 5"}), 400

    review = Review(
        client_user_id=user.id,
        name=user.name,
        content=content,
        rating=rating,
        source="client_submitted",
        status="pending",
    )
    db.session.add(review)
    db.session.commit()
    return jsonify(review.to_dict()), 201


@public_reviews_bp.get("")
def list_approved_reviews():
    reviews = (
        Review.query.filter_by(status="approved")
        .order_by(Review.created_at.desc())
        .limit(10)
        .all()
    )
    return jsonify([r.to_dict() for r in reviews])
