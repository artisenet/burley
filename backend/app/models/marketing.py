from datetime import datetime
from app.extensions import db


class MailingListSubscriber(db.Model):
    __tablename__ = "mailing_list"

    id = db.Column(db.Integer, primary_key=True)
    email = db.Column(db.String(150), nullable=False, unique=True)
    name = db.Column(db.String(150), nullable=True)
    subscribed_at = db.Column(db.DateTime, default=datetime.utcnow)
    is_active = db.Column(db.Boolean, default=True)
    source = db.Column(db.String(50), nullable=True)  # landing_page | booking_flow | manual

    def to_dict(self):
        return {
            "id": self.id,
            "email": self.email,
            "name": self.name,
            "subscribed_at": self.subscribed_at.isoformat() if self.subscribed_at else None,
            "is_active": self.is_active,
            "source": self.source,
        }
