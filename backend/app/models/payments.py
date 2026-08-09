from datetime import datetime
from app.extensions import db


class PaymentTransaction(db.Model):
    """
    Represents one money movement through SasaPay - either a client paying in
    (invoice deposit/installment/balance, or a consultation fee) or a payout
    going out (staff/vendor). Direction is inferred by which foreign key is set
    plus `direction`.

    SasaPay (like raw M-Pesa STK Push) is asynchronous: initiating a payment
    returns a CheckoutRequestID immediately, but the actual result arrives later
    via callback. Always create the row at initiation time with status=initiated,
    then update it when the callback lands. Never assume success at initiation.
    """

    __tablename__ = "payment_transactions"

    id = db.Column(db.Integer, primary_key=True)

    direction = db.Column(db.String(10), nullable=False)  # collection | payout

    invoice_id = db.Column(db.Integer, db.ForeignKey("invoices.id"), nullable=True)
    schedule_item_id = db.Column(db.Integer, db.ForeignKey("invoice_payment_schedule.id"), nullable=True)
    consultation_id = db.Column(db.Integer, db.ForeignKey("consultations.id"), nullable=True)
    payout_id = db.Column(db.Integer, db.ForeignKey("staff_payouts.id"), nullable=True)

    amount = db.Column(db.Numeric(12, 2), nullable=False)
    provider = db.Column(db.String(20), nullable=False, default="sasapay")

    provider_merchant_request_id = db.Column(db.String(100), nullable=True)
    provider_checkout_request_id = db.Column(db.String(100), nullable=True, index=True)
    provider_ref = db.Column(db.String(100), nullable=True)  # SasaPay TransID once confirmed
    # What we sent as AccountReference (C2B) or MerchantTransactionReference
    # (B2C) - SasaPay's actual result/IPN callback payload for C2B doesn't
    # reliably echo back CheckoutRequestID (confirmed from their docs' sample
    # callback, which instead shows BillRefNumber/TransID/MSISDN), so this is
    # kept as a second, more reliable way to match an inbound callback to the
    # transaction that triggered it.
    account_reference = db.Column(db.String(120), nullable=True, index=True)

    # initiated -> pending -> success / failed / cancelled / timeout
    status = db.Column(db.String(20), nullable=False, default="initiated")

    raw_callback_payload = db.Column(db.JSON, nullable=True)

    initiated_at = db.Column(db.DateTime, default=datetime.utcnow)
    confirmed_at = db.Column(db.DateTime, nullable=True)

    def to_dict(self):
        return {
            "id": self.id,
            "direction": self.direction,
            "invoice_id": self.invoice_id,
            "schedule_item_id": self.schedule_item_id,
            "consultation_id": self.consultation_id,
            "payout_id": self.payout_id,
            "amount": str(self.amount),
            "provider": self.provider,
            "provider_checkout_request_id": self.provider_checkout_request_id,
            "account_reference": self.account_reference,
            "provider_ref": self.provider_ref,
            "status": self.status,
            "initiated_at": self.initiated_at.isoformat() if self.initiated_at else None,
            "confirmed_at": self.confirmed_at.isoformat() if self.confirmed_at else None,
        }
