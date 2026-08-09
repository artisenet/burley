from datetime import datetime
from app.extensions import db


class StaffPayout(db.Model):
    """
    A single payout run to one staff member. For per_event pay structures this
    usually covers one assignment; for weekly/monthly casuals this batches
    together every assignment that fell due in the period, so she can pay
    once instead of per-event. Actual money movement happens via SasaPay B2C,
    tracked in payment_transactions (direction=payout, payout_id=this.id).
    """

    __tablename__ = "staff_payouts"

    id = db.Column(db.Integer, primary_key=True)
    user_id = db.Column(db.Integer, db.ForeignKey("users.id"), nullable=False)

    period_start = db.Column(db.Date, nullable=True)  # null for a pure per_event payout
    period_end = db.Column(db.Date, nullable=True)

    total_amount = db.Column(db.Numeric(12, 2), nullable=False, default=0)
    status = db.Column(db.String(20), nullable=False, default="pending")  # pending | paid | failed

    paid_at = db.Column(db.DateTime, nullable=True)
    payment_method = db.Column(db.String(20), nullable=True)  # sasapay | bank | cash
    provider_ref = db.Column(db.String(100), nullable=True)

    created_at = db.Column(db.DateTime, default=datetime.utcnow)

    items = db.relationship("StaffPayoutItem", backref="payout", cascade="all, delete-orphan", lazy="dynamic")

    def to_dict(self):
        return {
            "id": self.id,
            "user_id": self.user_id,
            "period_start": self.period_start.isoformat() if self.period_start else None,
            "period_end": self.period_end.isoformat() if self.period_end else None,
            "total_amount": str(self.total_amount),
            "status": self.status,
            "paid_at": self.paid_at.isoformat() if self.paid_at else None,
            "payment_method": self.payment_method,
            "items": [i.to_dict() for i in self.items],
        }


class StaffPayoutItem(db.Model):
    __tablename__ = "staff_payout_items"

    id = db.Column(db.Integer, primary_key=True)
    payout_id = db.Column(db.Integer, db.ForeignKey("staff_payouts.id"), nullable=False)
    event_staff_assignment_id = db.Column(db.Integer, db.ForeignKey("event_staff_assignments.id"), nullable=False)
    amount = db.Column(db.Numeric(12, 2), nullable=False)

    def to_dict(self):
        return {
            "id": self.id,
            "payout_id": self.payout_id,
            "event_staff_assignment_id": self.event_staff_assignment_id,
            "amount": str(self.amount),
        }
