from datetime import datetime
from flask import Blueprint, request, jsonify
from app.extensions import db
from app.models import BlogPost
from app.utils.decorators import requires_role

admin_blog_bp = Blueprint("admin_blog", __name__, url_prefix="/api/admin/blog")
public_blog_bp = Blueprint("public_blog", __name__, url_prefix="/api/public/blog")


@admin_blog_bp.get("")
@requires_role("admin")
def list_all_posts():
    posts = BlogPost.query.order_by(BlogPost.created_at.desc()).all()
    return jsonify([p.to_dict(include_content=False) for p in posts])


@admin_blog_bp.get("/<int:post_id>")
@requires_role("admin")
def get_post(post_id):
    post = BlogPost.query.get_or_404(post_id)
    return jsonify(post.to_dict())


@admin_blog_bp.post("")
@requires_role("admin")
def create_post():
    data = request.get_json() or {}
    title = data.get("title")
    content = data.get("content")
    if not title or not content:
        return jsonify({"error": "title and content are required"}), 400

    status = data.get("status", "draft")
    post = BlogPost(
        title=title,
        slug=BlogPost.make_unique_slug(title),
        excerpt=data.get("excerpt"),
        content=content,
        cover_image_url=data.get("cover_image_url"),
        author=data.get("author", "Burley Events"),
        status=status,
        published_at=datetime.utcnow() if status == "published" else None,
    )
    db.session.add(post)
    db.session.commit()
    return jsonify(post.to_dict()), 201


@admin_blog_bp.put("/<int:post_id>")
@requires_role("admin")
def update_post(post_id):
    post = BlogPost.query.get_or_404(post_id)
    data = request.get_json() or {}

    was_draft = post.status != "published"

    for field in ["title", "excerpt", "content", "cover_image_url", "author"]:
        if field in data:
            setattr(post, field, data[field])

    if "status" in data:
        post.status = data["status"]
        if was_draft and post.status == "published" and not post.published_at:
            post.published_at = datetime.utcnow()

    db.session.commit()
    return jsonify(post.to_dict())


@admin_blog_bp.delete("/<int:post_id>")
@requires_role("admin")
def delete_post(post_id):
    post = BlogPost.query.get_or_404(post_id)
    db.session.delete(post)
    db.session.commit()
    return jsonify({"deleted": True})


@public_blog_bp.get("")
def list_published_posts():
    posts = (
        BlogPost.query.filter_by(status="published")
        .order_by(BlogPost.published_at.desc())
        .all()
    )
    return jsonify([p.to_dict(include_content=False) for p in posts])


@public_blog_bp.get("/<slug>")
def get_published_post(slug):
    post = BlogPost.query.filter_by(slug=slug, status="published").first()
    if not post:
        return jsonify({"error": "Post not found"}), 404
    return jsonify(post.to_dict())
