from datetime import datetime
from app.extensions import db

# Business rule: the floor margin below which the UI should warn the planner
# that she's about to undercut her target profit. Not enforced server-side as
# a hard block by default - see services/pricing.py for the check function.
MARGIN_FLOOR_PCT = 35


class Quote(db.Model):
    __tablename__ = "quotes"

    id = db.Column(db.Integer, primary_key=True)
    client_id = db.Column(db.Integer, db.ForeignKey("users.id"), nullable=False)
    event_id = db.Column(
        db.Integer,
        db.ForeignKey("events.id", use_alter=True, name="fk_quotes_event_id"),
        nullable=True,
    )

    version = db.Column(db.Integer, nullable=False, default=1)
    # draft -> sent -> accepted / rejected / expired
    status = db.Column(db.String(20), nullable=False, default="draft")
    valid_until = db.Column(db.Date, nullable=True)
    requested_by_client = db.Column(db.Boolean, default=False)

    created_at = db.Column(db.DateTime, default=datetime.utcnow)

    items = db.relationship("QuoteItem", backref="quote", cascade="all, delete-orphan", lazy="dynamic")
    invoice = db.relationship("Invoice", backref="quote", uselist=False)

    @property
    def total_cost(self):
        return sum(float(i.cost_price) * float(i.quantity) for i in self.items)

    @property
    def total_price(self):
        return sum(float(i.total_price) for i in self.items)

    @property
    def margin_pct(self):
        cost = self.total_cost
        if cost == 0:
            return None
        return round((self.total_price - cost) / cost * 100, 2)

    @property
    def is_below_margin_floor(self):
        margin = self.margin_pct
        return margin is not None and margin < MARGIN_FLOOR_PCT

    def to_dict(self, include_items=True):
        data = {
            "id": self.id,
            "client_id": self.client_id,
            "event_id": self.event_id,
            "version": self.version,
            "status": self.status,
            "valid_until": self.valid_until.isoformat() if self.valid_until else None,
            "requested_by_client": self.requested_by_client,
            "total_price": self.total_price,
            "total_cost": self.total_cost,
            "margin_pct": self.margin_pct,
            "is_below_margin_floor": self.is_below_margin_floor,
            "created_at": self.created_at.isoformat() if self.created_at else None,
        }
        if include_items:
            data["items"] = [i.to_dict() for i in self.items]
        return data


class QuoteItem(db.Model):
    __tablename__ = "quote_items"

    id = db.Column(db.Integer, primary_key=True)
    quote_id = db.Column(db.Integer, db.ForeignKey("quotes.id"), nullable=False)
    service_id = db.Column(db.Integer, db.ForeignKey("services.id"), nullable=True)

    description = db.Column(db.String(255), nullable=False)
    quantity = db.Column(db.Numeric(10, 2), nullable=False, default=1)

    # Snapshot at time of quoting - do NOT recompute from services table later,
    # since the catalog price may change after this quote was sent.
    cost_price = db.Column(db.Numeric(12, 2), nullable=False, default=0)
    markup_pct = db.Column(db.Numeric(5, 2), nullable=False, default=35)
    unit_price = db.Column(db.Numeric(12, 2), nullable=False, default=0)
    total_price = db.Column(db.Numeric(12, 2), nullable=False, default=0)

    def to_dict(self):
        return {
            "id": self.id,
            "quote_id": self.quote_id,
            "service_id": self.service_id,
            "description": self.description,
            "quantity": str(self.quantity),
            "cost_price": str(self.cost_price),
            "markup_pct": str(self.markup_pct),
            "unit_price": str(self.unit_price),
            "total_price": str(self.total_price),
        }


class Invoice(db.Model):
    __tablename__ = "invoices"

    id = db.Column(db.Integer, primary_key=True)
    quote_id = db.Column(db.Integer, db.ForeignKey("quotes.id"), nullable=False)
    client_id = db.Column(db.Integer, db.ForeignKey("users.id"), nullable=False)
    event_id = db.Column(db.Integer, db.ForeignKey("events.id"), nullable=True)

    total_amount = db.Column(db.Numeric(12, 2), nullable=False, default=0)
    # unpaid -> partial -> paid ; or overdue if due_date passed and not fully paid
    status = db.Column(db.String(20), nullable=False, default="unpaid")
    due_date = db.Column(db.Date, nullable=True)

    created_at = db.Column(db.DateTime, default=datetime.utcnow)

    schedule_items = db.relationship(
        "InvoicePaymentSchedule", backref="invoice", cascade="all, delete-orphan", lazy="dynamic"
    )

    @property
    def amount_paid(self):
        return sum(
            float(s.amount_due) for s in self.schedule_items if s.status == "paid"
        )

    @property
    def amount_outstanding(self):
        return float(self.total_amount) - self.amount_paid

    def recompute_status(self):
        paid = self.amount_paid
        if paid <= 0:
            self.status = "unpaid"
        elif paid >= float(self.total_amount):
            self.status = "paid"
        else:
            self.status = "partial"

    def to_dict(self):
        return {
            "id": self.id,
            "quote_id": self.quote_id,
            "client_id": self.client_id,
            "event_id": self.event_id,
            "total_amount": str(self.total_amount),
            "amount_paid": self.amount_paid,
            "amount_outstanding": self.amount_outstanding,
            "status": self.status,
            "due_date": self.due_date.isoformat() if self.due_date else None,
            "schedule_items": [s.to_dict() for s in self.schedule_items],
        }


class InvoicePaymentSchedule(db.Model):
    __tablename__ = "invoice_payment_schedule"

    id = db.Column(db.Integer, primary_key=True)
    invoice_id = db.Column(db.Integer, db.ForeignKey("invoices.id"), nullable=False)

    label = db.Column(db.String(50), nullable=False)  # deposit | installment_1 | balance | full
    amount_due = db.Column(db.Numeric(12, 2), nullable=False)
    due_date = db.Column(db.Date, nullable=True)
    status = db.Column(db.String(20), nullable=False, default="pending")  # pending | paid | overdue

    def to_dict(self):
        return {
            "id": self.id,
            "invoice_id": self.invoice_id,
            "label": self.label,
            "amount_due": str(self.amount_due),
            "due_date": self.due_date.isoformat() if self.due_date else None,
            "status": self.status,
        }
