from datetime import datetime
from app.extensions import db


class PortfolioImage(db.Model):
    """
    Images the admin uploads to showcase past work on the public landing
    page gallery. Stored on disk under app/static/uploads/portfolio/, served
    via Flask's static route - fine for this scale; if this ever needs to
    survive redeploys on a host with an ephemeral filesystem, swap the
    storage for S3/Cloudinary and keep this model's `url` field as the
    pointer, nothing else changes.
    """

    __tablename__ = "portfolio_images"

    id = db.Column(db.Integer, primary_key=True)
    filename = db.Column(db.String(255), nullable=False)
    url = db.Column(db.String(500), nullable=False)
    cloudinary_public_id = db.Column(db.String(255), nullable=True)
    media_type = db.Column(db.String(10), nullable=False, default="image")  # image | video
    caption = db.Column(db.String(255), nullable=True)
    category = db.Column(db.String(100), nullable=True)  # e.g. "Decor", "Weddings", "Hero Video"
    display_order = db.Column(db.Integer, nullable=False, default=0)
    is_active = db.Column(db.Boolean, default=True)
    created_at = db.Column(db.DateTime, default=datetime.utcnow)

    def to_dict(self):
        return {
            "id": self.id,
            "url": self.url,
            "media_type": self.media_type,
            "caption": self.caption,
            "category": self.category,
            "display_order": self.display_order,
            "is_active": self.is_active,
            "created_at": self.created_at.isoformat() if self.created_at else None,
        }
