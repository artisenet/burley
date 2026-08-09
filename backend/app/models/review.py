from datetime import datetime
from app.extensions import db


class Review(db.Model):
    """
    Client testimonials, moderated before they appear publicly. A logged-in
    client submits one (source='client_submitted', status='pending'); admin
    can also add one directly on a client's behalf (source='admin_added',
    e.g. transcribing a review left elsewhere), which goes straight to
    'approved' since she's vouching for it herself. Only 'approved' reviews
    are ever returned by the public endpoint - this is what replaces the
    hardcoded placeholder testimonials on the landing page.
    """
    __tablename__ = "reviews"

    id = db.Column(db.Integer, primary_key=True)
    client_user_id = db.Column(db.Integer, db.ForeignKey("users.id"), nullable=True)
    name = db.Column(db.String(150), nullable=False)
    content = db.Column(db.Text, nullable=False)
    rating = db.Column(db.Integer, nullable=True)  # 1-5, optional
    source = db.Column(db.String(20), nullable=False, default="client_submitted")
    status = db.Column(db.String(20), nullable=False, default="pending")  # pending | approved | rejected
    created_at = db.Column(db.DateTime, default=datetime.utcnow)

    def to_dict(self):
        return {
            "id": self.id,
            "client_user_id": self.client_user_id,
            "name": self.name,
            "content": self.content,
            "rating": self.rating,
            "source": self.source,
            "status": self.status,
            "created_at": self.created_at.isoformat() if self.created_at else None,
        }
