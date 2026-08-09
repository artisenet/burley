from datetime import datetime
from app.extensions import db


class Vendor(db.Model):
    __tablename__ = "vendors"

    id = db.Column(db.Integer, primary_key=True)
    name = db.Column(db.String(150), nullable=False)
    category = db.Column(db.String(100), nullable=True)  # florist, rental, catering, photography...
    contact_info = db.Column(db.String(255), nullable=True)
    notes = db.Column(db.Text, nullable=True)

    def to_dict(self):
        return {
            "id": self.id,
            "name": self.name,
            "category": self.category,
            "contact_info": self.contact_info,
            "notes": self.notes,
        }


class Expense(db.Model):
    __tablename__ = "expenses"

    id = db.Column(db.Integer, primary_key=True)
    event_id = db.Column(db.Integer, db.ForeignKey("events.id"), nullable=True)  # null = general overhead
    category = db.Column(db.String(100), nullable=True)
    description = db.Column(db.String(255), nullable=True)
    amount = db.Column(db.Numeric(12, 2), nullable=False)
    vendor_id = db.Column(db.Integer, db.ForeignKey("vendors.id"), nullable=True)
    paid_by = db.Column(db.String(100), nullable=True)
    receipt_url = db.Column(db.String(255), nullable=True)

    created_at = db.Column(db.DateTime, default=datetime.utcnow)

    def to_dict(self):
        return {
            "id": self.id,
            "event_id": self.event_id,
            "category": self.category,
            "description": self.description,
            "amount": str(self.amount),
            "vendor_id": self.vendor_id,
            "paid_by": self.paid_by,
            "receipt_url": self.receipt_url,
            "created_at": self.created_at.isoformat() if self.created_at else None,
        }
