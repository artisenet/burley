from datetime import date, datetime
from calendar import monthrange
from flask import Blueprint, jsonify
from app.models import (
    Event,
    Lead,
    Quote,
    Invoice,
    InvoicePaymentSchedule,
    Expense,
    StaffPayout,
    User,
    PaymentTransaction,
)
from app.utils.decorators import requires_role

admin_overview_bp = Blueprint("admin_overview", __name__, url_prefix="/api/admin/overview")

PIPELINE_STAGES = ["new", "contacted", "consultation_booked", "quoted", "won"]


def _month_bounds(year, month):
    start = date(year, month, 1)
    _, last_day = monthrange(year, month)
    end = date(year, month, last_day)
    return start, end


def _previous_month(year, month):
    if month == 1:
        return year - 1, 12
    return year, month - 1


@admin_overview_bp.get("")
@requires_role("admin")
def overview():
    today = date.today()
    this_year, this_month = today.year, today.month
    last_year, last_month = _previous_month(this_year, this_month)

    this_start, this_end = _month_bounds(this_year, this_month)
    last_start, last_end = _month_bounds(last_year, last_month)

    # --- Active events + delta ---
    active_events = Event.query.filter(Event.status.in_(["confirmed", "in_progress"])).all()
    events_this_month = Event.query.filter(
        Event.created_at >= datetime.combine(this_start, datetime.min.time())
    ).count()
    events_last_month = Event.query.filter(
        Event.created_at >= datetime.combine(last_start, datetime.min.time()),
        Event.created_at <= datetime.combine(last_end, datetime.max.time()),
    ).count()

    # --- Leads pipeline + delta ---
    pipeline_leads = Lead.query.filter(~Lead.status.in_(["lost"])).all()
    leads_this_month = Lead.query.filter(
        Lead.created_at >= datetime.combine(this_start, datetime.min.time())
    ).count()
    leads_last_month = Lead.query.filter(
        Lead.created_at >= datetime.combine(last_start, datetime.min.time()),
        Lead.created_at <= datetime.combine(last_end, datetime.max.time()),
    ).count()

    pipeline_counts = {stage: 0 for stage in PIPELINE_STAGES}
    for lead in Lead.query.all():
        if lead.status in pipeline_counts:
            pipeline_counts[lead.status] += 1

    # --- Revenue + profit this month vs last month ---
    invoices_this_month = Invoice.query.filter(
        Invoice.created_at >= datetime.combine(this_start, datetime.min.time())
    ).all()
    invoices_last_month = Invoice.query.filter(
        Invoice.created_at >= datetime.combine(last_start, datetime.min.time()),
        Invoice.created_at <= datetime.combine(last_end, datetime.max.time()),
    ).all()
    revenue_this_month = sum(float(i.total_amount) for i in invoices_this_month)
    revenue_last_month = sum(float(i.total_amount) for i in invoices_last_month)

    expenses_this_month = sum(
        float(e.amount)
        for e in Expense.query.filter(
            Expense.created_at >= datetime.combine(this_start, datetime.min.time())
        ).all()
    )
    profit_this_month = revenue_this_month - expenses_this_month

    # --- Average margin across accepted quotes (all-time - too little data for a monthly cut) ---
    accepted_quotes = Quote.query.filter_by(status="accepted").all()
    margins = [q.margin_pct for q in accepted_quotes if q.margin_pct is not None]
    avg_margin = round(sum(margins) / len(margins), 1) if margins else None

    # --- Needs attention today ---
    overdue_items = InvoicePaymentSchedule.query.filter(
        InvoicePaymentSchedule.status == "pending",
        InvoicePaymentSchedule.due_date.isnot(None),
        InvoicePaymentSchedule.due_date < today,
    ).all()
    pending_quotes_count = Quote.query.filter_by(status="sent").count()
    pending_payouts = StaffPayout.query.filter_by(status="pending").all()

    needs_attention = []
    if overdue_items:
        needs_attention.append(
            {
                "type": "overdue_invoices",
                "count": len(overdue_items),
                "total": sum(float(i.amount_due) for i in overdue_items),
            }
        )
    if pending_quotes_count:
        needs_attention.append({"type": "pending_quotes", "count": pending_quotes_count})
    if pending_payouts:
        needs_attention.append(
            {
                "type": "pending_payouts",
                "count": len(pending_payouts),
                "total": sum(float(p.total_amount) for p in pending_payouts),
            }
        )

    # --- Upcoming events ---
    upcoming_events = (
        Event.query.filter(Event.event_date.isnot(None), Event.event_date >= today)
        .order_by(Event.event_date.asc())
        .limit(5)
        .all()
    )

    # --- Top clients (all-time, top 5) ---
    clients_with_invoices = {}
    for invoice in Invoice.query.all():
        clients_with_invoices.setdefault(invoice.client_id, []).append(invoice)
    top_clients = []
    for client_id, invs in clients_with_invoices.items():
        user = User.query.get(client_id)
        if not user:
            continue
        top_clients.append(
            {
                "client_id": client_id,
                "name": user.name,
                "total_invoiced": sum(float(i.total_amount) for i in invs),
                "invoice_count": len(invs),
            }
        )
    top_clients.sort(key=lambda c: c["total_invoiced"], reverse=True)
    top_clients = top_clients[:5]

    # --- Revenue trend, last 6 months ---
    trend = []
    year, month = this_year, this_month
    months_back = []
    for _ in range(6):
        months_back.append((year, month))
        year, month = _previous_month(year, month)
    months_back.reverse()

    for y, m in months_back:
        m_start, m_end = _month_bounds(y, m)
        month_invoices = Invoice.query.filter(
            Invoice.created_at >= datetime.combine(m_start, datetime.min.time()),
            Invoice.created_at <= datetime.combine(m_end, datetime.max.time()),
        ).all()
        trend.append(
            {
                "label": m_start.strftime("%b"),
                "revenue": sum(float(i.total_amount) for i in month_invoices),
            }
        )

    # --- Recent activity, last 10 across quotes/payments/events ---
    activity = []
    for q in Quote.query.filter_by(status="accepted").order_by(Quote.created_at.desc()).limit(10).all():
        activity.append(
            {
                "type": "quote_accepted",
                "message": f"Quote #{q.id} accepted",
                "timestamp": q.created_at.isoformat() if q.created_at else None,
            }
        )
    for txn in (
        PaymentTransaction.query.filter_by(direction="collection", status="success")
        .order_by(PaymentTransaction.confirmed_at.desc())
        .limit(10)
        .all()
    ):
        activity.append(
            {
                "type": "payment_received",
                "message": f"Payment of KES {float(txn.amount):,.0f} received",
                "timestamp": txn.confirmed_at.isoformat() if txn.confirmed_at else None,
            }
        )
    for e in Event.query.filter_by(status="confirmed").order_by(Event.created_at.desc()).limit(10).all():
        activity.append(
            {
                "type": "event_confirmed",
                "message": f"{e.venue or 'Event #' + str(e.id)} confirmed",
                "timestamp": e.created_at.isoformat() if e.created_at else None,
            }
        )
    activity = [a for a in activity if a["timestamp"]]
    activity.sort(key=lambda a: a["timestamp"], reverse=True)
    activity = activity[:10]

    def _delta(current, previous):
        if previous == 0:
            return None
        return round((current - previous) / previous * 100, 1)

    return jsonify(
        {
            "stats": {
                "active_events": {
                    "value": len(active_events),
                    "delta_count": events_this_month - events_last_month,
                },
                "leads_pipeline": {
                    "value": len(pipeline_leads),
                    "delta_count": leads_this_month - leads_last_month,
                },
                "revenue_this_month": {
                    "value": revenue_this_month,
                    "delta_pct": _delta(revenue_this_month, revenue_last_month),
                },
                "profit_this_month": {
                    "value": profit_this_month,
                },
                "avg_margin_pct": avg_margin,
            },
            "needs_attention": needs_attention,
            "pipeline": pipeline_counts,
            "upcoming_events": [e.to_dict() for e in upcoming_events],
            "top_clients": top_clients,
            "revenue_trend": trend,
            "recent_activity": activity,
        }
    )
