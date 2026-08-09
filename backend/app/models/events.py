from datetime import datetime
from app.extensions import db


class Event(db.Model):
    __tablename__ = "events"

    id = db.Column(db.Integer, primary_key=True)
    client_id = db.Column(db.Integer, db.ForeignKey("users.id"), nullable=False)
    quote_id = db.Column(db.Integer, db.ForeignKey("quotes.id"), nullable=True)
    invoice_id = db.Column(
        db.Integer,
        db.ForeignKey("invoices.id", use_alter=True, name="fk_events_invoice_id"),
        nullable=True,
    )

    event_date = db.Column(db.Date, nullable=True)
    venue = db.Column(db.String(255), nullable=True)
    guest_count = db.Column(db.Integer, nullable=True)

    # inquiry -> confirmed -> in_progress -> completed / cancelled
    status = db.Column(db.String(20), nullable=False, default="inquiry")

    created_at = db.Column(db.DateTime, default=datetime.utcnow)

    staff_assignments = db.relationship("EventStaffAssignment", backref="event", lazy="dynamic")
    vendor_assignments = db.relationship("EventVendor", backref="event", lazy="dynamic")
    expenses = db.relationship("Expense", backref="event", lazy="dynamic")

    def profitability(self):
        """
        Live profitability snapshot for this event, used to flag margin erosion.
        actual_cost = logged expenses + staff costs + vendor costs

        A freshly created event (e.g. auto-created the moment a quote is
        accepted) has no logged costs yet, so actual-cost margin would be
        None/blank - not because anything is wrong, just because nothing's
        been recorded. To avoid that confusing blank state, fall back to an
        *estimated* margin pulled straight from the linked quote's own
        cost/price figures until real costs get logged, and flag which kind
        of number is being shown via `margin_is_estimated`.
        """
        from app.models.quotes_invoices import Invoice, Quote

        revenue = 0.0
        if self.invoice_id:
            invoice = Invoice.query.get(self.invoice_id)
            if invoice:
                revenue = float(invoice.total_amount)

        expense_total = sum(float(e.amount) for e in self.expenses)
        staff_total = sum(float(a.agreed_rate) for a in self.staff_assignments)
        vendor_total = sum(float(v.agreed_cost) for v in self.vendor_assignments)

        actual_cost = expense_total + staff_total + vendor_total
        profit = revenue - actual_cost
        margin_pct = (profit / actual_cost * 100) if actual_cost > 0 else None
        margin_is_estimated = False

        if margin_pct is None and self.quote_id:
            quote = Quote.query.get(self.quote_id)
            if quote and quote.total_cost > 0:
                margin_pct = quote.margin_pct
                margin_is_estimated = True

        return {
            "revenue": revenue,
            "expense_total": expense_total,
            "staff_total": staff_total,
            "vendor_total": vendor_total,
            "actual_cost": actual_cost,
            "profit": profit,
            "margin_pct": round(margin_pct, 2) if margin_pct is not None else None,
            "margin_is_estimated": margin_is_estimated,
            "below_margin_floor": margin_pct is not None and margin_pct < 35,
        }

    def to_dict(self, include_profitability=False):
        data = {
            "id": self.id,
            "client_id": self.client_id,
            "quote_id": self.quote_id,
            "invoice_id": self.invoice_id,
            "event_date": self.event_date.isoformat() if self.event_date else None,
            "venue": self.venue,
            "guest_count": self.guest_count,
            "status": self.status,
        }
        if include_profitability:
            data["profitability"] = self.profitability()
        return data


class EventStaffAssignment(db.Model):
    __tablename__ = "event_staff_assignments"

    id = db.Column(db.Integer, primary_key=True)
    event_id = db.Column(db.Integer, db.ForeignKey("events.id"), nullable=False)
    user_id = db.Column(db.Integer, db.ForeignKey("users.id"), nullable=False)

    role = db.Column(db.String(100), nullable=True)

    # Snapshot of pay structure at assignment time - can differ from the
    # staff member's default in staff_profiles for a one-off arrangement.
    pay_structure_used = db.Column(db.String(20), nullable=False, default="per_event")
    agreed_rate = db.Column(db.Numeric(12, 2), nullable=False, default=0)
    hours_or_days = db.Column(db.Numeric(6, 2), nullable=True)  # for prorating weekly/monthly

    paid_status = db.Column(db.String(20), nullable=False, default="unpaid")  # unpaid | partial | paid
    payout_batch_id = db.Column(db.Integer, db.ForeignKey("staff_payouts.id"), nullable=True)

    def to_dict(self):
        return {
            "id": self.id,
            "event_id": self.event_id,
            "user_id": self.user_id,
            "role": self.role,
            "pay_structure_used": self.pay_structure_used,
            "agreed_rate": str(self.agreed_rate),
            "hours_or_days": str(self.hours_or_days) if self.hours_or_days is not None else None,
            "paid_status": self.paid_status,
            "payout_batch_id": self.payout_batch_id,
        }


class EventVendor(db.Model):
    __tablename__ = "event_vendors"

    id = db.Column(db.Integer, primary_key=True)
    event_id = db.Column(db.Integer, db.ForeignKey("events.id"), nullable=False)
    vendor_id = db.Column(db.Integer, db.ForeignKey("vendors.id"), nullable=False)

    service_description = db.Column(db.String(255), nullable=True)
    agreed_cost = db.Column(db.Numeric(12, 2), nullable=False, default=0)
    paid_status = db.Column(db.String(20), nullable=False, default="unpaid")

    def to_dict(self):
        return {
            "id": self.id,
            "event_id": self.event_id,
            "vendor_id": self.vendor_id,
            "service_description": self.service_description,
            "agreed_cost": str(self.agreed_cost),
            "paid_status": self.paid_status,
        }
