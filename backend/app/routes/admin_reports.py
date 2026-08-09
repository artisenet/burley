from datetime import date, datetime, timedelta
from calendar import monthrange
from flask import Blueprint, request, jsonify, send_file
from sqlalchemy import func
from app.extensions import db
from app.models import (
    Invoice,
    InvoicePaymentSchedule,
    Event,
    Quote,
    QuoteItem,
    Service,
    ServiceCategory,
    User,
    Expense,
    EventStaffAssignment,
    EventVendor,
    StaffPayout,
)
from app.services import pdf as pdf_service
from app.utils.decorators import requires_role

admin_reports_bp = Blueprint("admin_reports", __name__, url_prefix="/api/admin/reports")


@admin_reports_bp.get("/cash-flow")
@requires_role("admin")
def cash_flow():
    """
    What's coming in over the next N days (default 30), and what's overdue.
    This is the "will I have money next week" view.
    """
    days_ahead = request.args.get("days", 30, type=int)
    today = date.today()
    horizon = today + timedelta(days=days_ahead)

    upcoming = (
        InvoicePaymentSchedule.query.filter(
            InvoicePaymentSchedule.status == "pending",
            InvoicePaymentSchedule.due_date.isnot(None),
            InvoicePaymentSchedule.due_date <= horizon,
            InvoicePaymentSchedule.due_date >= today,
        )
        .order_by(InvoicePaymentSchedule.due_date.asc())
        .all()
    )

    overdue = (
        InvoicePaymentSchedule.query.filter(
            InvoicePaymentSchedule.status == "pending",
            InvoicePaymentSchedule.due_date.isnot(None),
            InvoicePaymentSchedule.due_date < today,
        )
        .order_by(InvoicePaymentSchedule.due_date.asc())
        .all()
    )

    return jsonify(
        {
            "upcoming_total": sum(float(s.amount_due) for s in upcoming),
            "upcoming": [s.to_dict() for s in upcoming],
            "overdue_total": sum(float(s.amount_due) for s in overdue),
            "overdue": [s.to_dict() for s in overdue],
        }
    )


@admin_reports_bp.get("/margin-by-event")
@requires_role("admin")
def margin_by_event():
    """Every event with a linked invoice, ranked by actual margin - surfaces
    the events quietly bleeding money so she can see the pattern, not just
    one bad event in isolation."""
    events = Event.query.filter(Event.invoice_id.isnot(None)).all()
    rows = []
    for e in events:
        p = e.profitability()
        rows.append(
            {
                "event_id": e.id,
                "event_date": e.event_date.isoformat() if e.event_date else None,
                "venue": e.venue,
                "status": e.status,
                **p,
            }
        )
    rows.sort(key=lambda r: (r["margin_pct"] if r["margin_pct"] is not None else 9999))
    return jsonify(rows)


@admin_reports_bp.get("/margin-by-category")
@requires_role("admin")
def margin_by_category():
    """Rolls up quote-item margin performance by service category - tells her
    whether, say, decor consistently comes in under her 35% target while
    coordination doesn't, so she can adjust pricing per category rather than
    across the board."""
    results = (
        db.session.query(
            ServiceCategory.name,
            func.sum(QuoteItem.cost_price * QuoteItem.quantity).label("total_cost"),
            func.sum(QuoteItem.total_price).label("total_price"),
        )
        .join(Service, Service.id == QuoteItem.service_id)
        .join(ServiceCategory, ServiceCategory.id == Service.category_id)
        .join(Quote, Quote.id == QuoteItem.quote_id)
        .filter(Quote.status == "accepted")
        .group_by(ServiceCategory.name)
        .all()
    )

    rows = []
    for name, total_cost, total_price in results:
        total_cost = float(total_cost or 0)
        total_price = float(total_price or 0)
        margin_pct = round((total_price - total_cost) / total_cost * 100, 2) if total_cost > 0 else None
        rows.append(
            {
                "category": name,
                "total_cost": total_cost,
                "total_price": total_price,
                "margin_pct": margin_pct,
                "below_floor": margin_pct is not None and margin_pct < 35,
            }
        )
    return jsonify(rows)


@admin_reports_bp.get("/top-clients")
@requires_role("admin")
def top_clients():
    """Ranks clients by total invoiced amount - useful for spotting repeat
    clients worth prioritizing for referrals/loyalty treatment."""
    results = (
        db.session.query(
            User.id, User.name, User.email, func.sum(Invoice.total_amount).label("total_invoiced"), func.count(Invoice.id).label("invoice_count")
        )
        .join(Invoice, Invoice.client_id == User.id)
        .group_by(User.id)
        .order_by(func.sum(Invoice.total_amount).desc())
        .limit(20)
        .all()
    )

    return jsonify(
        [
            {
                "client_id": r[0],
                "name": r[1],
                "email": r[2],
                "total_invoiced": float(r[3]),
                "invoice_count": r[4],
            }
            for r in results
        ]
    )


@admin_reports_bp.get("/overhead")
@requires_role("admin")
def overhead_summary():
    """Total general overhead (expenses with no event_id) over a date range -
    the costs that don't show up in any single event's profitability but
    still eat into overall profit."""
    start = request.args.get("start")
    end = request.args.get("end")

    query = Expense.query.filter(Expense.event_id.is_(None))
    if start:
        query = query.filter(Expense.created_at >= start)
    if end:
        query = query.filter(Expense.created_at <= end)

    expenses = query.all()
    return jsonify(
        {
            "total": sum(float(e.amount) for e in expenses),
            "count": len(expenses),
            "expenses": [e.to_dict() for e in expenses],
        }
    )


@admin_reports_bp.get("/monthly-statement.pdf")
@requires_role("admin")
def download_monthly_statement():
    """
    Downloadable PDF version of a month's financials - revenue, expenses,
    staff payouts, vendor costs, net profit, and the list of invoices
    issued that month. Defaults to the current month if year/month aren't
    given. Query params: ?year=2026&month=8
    """
    today = date.today()
    year = request.args.get("year", today.year, type=int)
    month = request.args.get("month", today.month, type=int)

    month_start = date(year, month, 1)
    _, last_day = monthrange(year, month)
    month_end = date(year, month, last_day)
    range_start = datetime.combine(month_start, datetime.min.time())
    range_end = datetime.combine(month_end, datetime.max.time())

    invoices = Invoice.query.filter(Invoice.created_at >= range_start, Invoice.created_at <= range_end).all()
    revenue = sum(float(i.total_amount) for i in invoices)

    expenses = Expense.query.filter(Expense.created_at >= range_start, Expense.created_at <= range_end).all()
    expense_total = sum(float(e.amount) for e in expenses)

    payouts = StaffPayout.query.filter(
        StaffPayout.status == "paid",
        StaffPayout.paid_at >= range_start,
        StaffPayout.paid_at <= range_end,
    ).all()
    staff_payout_total = sum(float(p.total_amount) for p in payouts)

    vendor_costs = 0.0
    for e in Event.query.all():
        for v in e.vendor_assignments:
            if e.created_at and range_start <= e.created_at <= range_end:
                vendor_costs += float(v.agreed_cost)

    net_profit = revenue - expense_total - staff_payout_total - vendor_costs

    invoice_rows = []
    for inv in invoices:
        client = User.query.get(inv.client_id)
        invoice_rows.append({
            "id": inv.id,
            "client_name": client.name if client else f"Client #{inv.client_id}",
            "amount": float(inv.total_amount),
            "status": inv.status,
        })

    stats = {
        "revenue": revenue,
        "expenses": expense_total,
        "staff_payouts": staff_payout_total,
        "vendor_costs": vendor_costs,
        "net_profit": net_profit,
        "invoices": invoice_rows,
    }

    month_label = month_start.strftime("%B %Y")
    buffer = pdf_service.generate_monthly_statement_pdf(year, month, month_label, stats)
    filename = f"statement-{year}-{month:02d}.pdf"
    return send_file(buffer, mimetype="application/pdf", as_attachment=True, download_name=filename)
