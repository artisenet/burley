from datetime import datetime
from app.extensions import db


class Lead(db.Model):
    __tablename__ = "leads"

    id = db.Column(db.Integer, primary_key=True)
    name = db.Column(db.String(150), nullable=False)
    email = db.Column(db.String(150), nullable=True)
    phone = db.Column(db.String(20), nullable=True)
    source = db.Column(db.String(50), nullable=True)  # website | referral | social | other

    # new -> contacted -> consultation_booked -> quoted -> won -> lost
    status = db.Column(db.String(30), nullable=False, default="new")
    notes = db.Column(db.Text, nullable=True)

    # Once a lead converts, link to the user account they eventually create
    client_user_id = db.Column(db.Integer, db.ForeignKey("users.id"), nullable=True)

    created_at = db.Column(db.DateTime, default=datetime.utcnow)

    consultations = db.relationship("Consultation", backref="lead", lazy="dynamic")

    def to_dict(self):
        return {
            "id": self.id,
            "name": self.name,
            "email": self.email,
            "phone": self.phone,
            "source": self.source,
            "status": self.status,
            "notes": self.notes,
            "client_user_id": self.client_user_id,
            "created_at": self.created_at.isoformat() if self.created_at else None,
        }


class Consultation(db.Model):
    __tablename__ = "consultations"

    id = db.Column(db.Integer, primary_key=True)
    lead_id = db.Column(db.Integer, db.ForeignKey("leads.id"), nullable=False)

    scheduled_at = db.Column(db.DateTime, nullable=False)
    duration_mins = db.Column(db.Integer, default=45)
    mode = db.Column(db.String(20), default="virtual")  # in_person | virtual

    # pending -> confirmed -> completed / cancelled / no_show
    status = db.Column(db.String(20), nullable=False, default="pending")

    # If this consultation is tied to a service booking that carries a deposit,
    # the fee is waived. See fee logic in services/consultations.py
    linked_quote_id = db.Column(db.Integer, db.ForeignKey("quotes.id"), nullable=True)

    fee_amount = db.Column(db.Numeric(10, 2), nullable=False, default=0)
    fee_waived = db.Column(db.Boolean, default=False)
    fee_paid = db.Column(db.Boolean, default=False)

    created_at = db.Column(db.DateTime, default=datetime.utcnow)

    def requires_payment(self):
        return not self.fee_waived and self.fee_amount > 0 and not self.fee_paid

    def to_dict(self):
        return {
            "id": self.id,
            "lead_id": self.lead_id,
            "scheduled_at": self.scheduled_at.isoformat() if self.scheduled_at else None,
            "duration_mins": self.duration_mins,
            "mode": self.mode,
            "status": self.status,
            "linked_quote_id": self.linked_quote_id,
            "fee_amount": str(self.fee_amount),
            "fee_waived": self.fee_waived,
            "fee_paid": self.fee_paid,
        }
