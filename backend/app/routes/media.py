import cloudinary.uploader
from flask import Blueprint, request, jsonify
from app.extensions import db
from app.models import PortfolioImage
from app.utils.decorators import requires_role

admin_media_bp = Blueprint("admin_media", __name__, url_prefix="/api/admin/portfolio")
public_media_bp = Blueprint("public_media", __name__, url_prefix="/api/public/portfolio")

ALLOWED_IMAGE_EXTENSIONS = {"jpg", "jpeg", "png", "webp", "gif"}
ALLOWED_VIDEO_EXTENSIONS = {"mp4", "webm"}
ALLOWED_EXTENSIONS = ALLOWED_IMAGE_EXTENSIONS | ALLOWED_VIDEO_EXTENSIONS

MAX_IMAGE_SIZE_BYTES = 8 * 1024 * 1024   # 8MB
MAX_VIDEO_SIZE_BYTES = 40 * 1024 * 1024  # 40MB - background videos should be short and compressed;
                                          # this is a ceiling, not a target.

CLOUDINARY_FOLDER = "burley-events/portfolio"


def _allowed_file(filename):
    return "." in filename and filename.rsplit(".", 1)[1].lower() in ALLOWED_EXTENSIONS


def _media_type_for(extension):
    return "video" if extension in ALLOWED_VIDEO_EXTENSIONS else "image"


@admin_media_bp.get("")
@requires_role("admin")
def list_portfolio_images():
    images = PortfolioImage.query.order_by(PortfolioImage.display_order.asc(), PortfolioImage.created_at.desc()).all()
    return jsonify([img.to_dict() for img in images])


@admin_media_bp.post("")
@requires_role("admin")
def upload_portfolio_image():
    """
    Uploads to Cloudinary rather than local disk - local storage doesn't
    survive a redeploy/restart on hosts like Render, so this is required
    for anything uploaded to actually persist in production. Works
    identically in local dev as long as CLOUDINARY_* env vars are set.
    """
    if "file" not in request.files:
        return jsonify({"error": "No file provided"}), 400

    file = request.files["file"]
    if file.filename == "":
        return jsonify({"error": "No file selected"}), 400

    if not _allowed_file(file.filename):
        return jsonify({"error": "Unsupported file type - use jpg, png, webp, gif, mp4, or webm"}), 400

    extension = file.filename.rsplit(".", 1)[1].lower()
    media_type = _media_type_for(extension)

    file.seek(0, 2)
    size = file.tell()
    file.seek(0)
    size_limit = MAX_VIDEO_SIZE_BYTES if media_type == "video" else MAX_IMAGE_SIZE_BYTES
    if size > size_limit:
        limit_mb = size_limit // (1024 * 1024)
        return jsonify({"error": f"File too large - max {limit_mb}MB for {media_type}s"}), 400

    try:
        result = cloudinary.uploader.upload(
            file,
            folder=CLOUDINARY_FOLDER,
            resource_type="auto",  # let Cloudinary detect image vs video
        )
    except Exception as e:
        return jsonify({"error": f"Upload failed: {str(e)}"}), 502

    image = PortfolioImage(
        filename=result.get("public_id", ""),
        url=result.get("secure_url"),
        cloudinary_public_id=result.get("public_id"),
        media_type="video" if result.get("resource_type") == "video" else "image",
        caption=request.form.get("caption"),
        category=request.form.get("category"),
        display_order=request.form.get("display_order", 0, type=int),
    )
    db.session.add(image)
    db.session.commit()

    return jsonify(image.to_dict()), 201


@admin_media_bp.put("/<int:image_id>")
@requires_role("admin")
def update_portfolio_image(image_id):
    image = PortfolioImage.query.get_or_404(image_id)
    data = request.get_json() or {}
    for field in ["caption", "category", "display_order", "is_active"]:
        if field in data:
            setattr(image, field, data[field])
    db.session.commit()
    return jsonify(image.to_dict())


@admin_media_bp.delete("/<int:image_id>")
@requires_role("admin")
def delete_portfolio_image(image_id):
    image = PortfolioImage.query.get_or_404(image_id)

    if image.cloudinary_public_id:
        try:
            cloudinary.uploader.destroy(
                image.cloudinary_public_id,
                resource_type="video" if image.media_type == "video" else "image",
            )
        except Exception:
            pass  # don't block DB cleanup if Cloudinary deletion fails (e.g. already gone)

    db.session.delete(image)
    db.session.commit()
    return jsonify({"deleted": True})


@public_media_bp.get("")
def list_public_portfolio_images():
    """Only active images, in display order - what the landing page gallery fetches."""
    images = (
        PortfolioImage.query.filter_by(is_active=True)
        .order_by(PortfolioImage.display_order.asc(), PortfolioImage.created_at.desc())
        .all()
    )
    return jsonify([img.to_dict() for img in images])
