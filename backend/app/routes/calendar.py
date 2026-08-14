from datetime import datetime, timedelta
from flask import Blueprint, request, jsonify, current_app
from app.models import Consultation, Event, Lead, User
from app.utils.decorators import requires_role

calendar_public_bp = Blueprint("calendar_public", __name__, url_prefix="/api/public")
calendar_admin_bp = Blueprint("calendar_admin", __name__, url_prefix="/api/admin/calendar")


def _parse_date(value, field_name):
    try:
        return datetime.fromisoformat(value).date()
    except (TypeError, ValueError):
        raise ValueError(f"{field_name} must be an ISO date (YYYY-MM-DD)")


@calendar_public_bp.get("/availability")
def get_availability():
    """
    Returns already-booked consultation windows for a given date, so the
    booking UI can show what's taken. Open-availability model: any time
    within business hours is bookable unless it falls within
    CONSULTATION_BUFFER_MINUTES of an existing pending/confirmed
    consultation - not a fixed slot grid.
    """
    date_param = request.args.get("date")
    if not date_param:
        return jsonify({"error": "date query param is required (YYYY-MM-DD)"}), 400

    try:
        target_date = _parse_date(date_param, "date")
    except ValueError as e:
        return jsonify({"error": str(e)}), 400

    day_start = datetime.combine(target_date, datetime.min.time())
    day_end = day_start + timedelta(days=1)

    consultations = (
        Consultation.query.filter(
            Consultation.scheduled_at >= day_start,
            Consultation.scheduled_at < day_end,
            Consultation.status.in_(["pending", "confirmed"]),
        )
        .all()
    )

    busy_windows = [
        {
            "start": c.scheduled_at.isoformat(),
            "end": (c.scheduled_at + timedelta(minutes=c.duration_mins or 45)).isoformat(),
        }
        for c in consultations
    ]

    return jsonify(
        {
            "date": target_date.isoformat(),
            "business_hours": {
                "start": current_app.config["BUSINESS_HOURS_START"],
                "end": current_app.config["BUSINESS_HOURS_END"],
            },
            "buffer_minutes": current_app.config["CONSULTATION_BUFFER_MINUTES"],
            "busy_windows": busy_windows,
        }
    )


def check_consultation_conflict(scheduled_at, duration_mins):
    """
    Returns an error message string if the requested slot conflicts with an
    existing consultation (within the configured buffer either side), or
    None if the slot is free. Used by the public booking endpoint before a
    consultation row is actually created - the single source of truth for
    the "no double-booking" rule, so it isn't duplicated across routes.
    """
    buffer_minutes = current_app.config["CONSULTATION_BUFFER_MINUTES"]
    requested_start = scheduled_at - timedelta(minutes=buffer_minutes)
    requested_end = scheduled_at + timedelta(minutes=(duration_mins or 45) + buffer_minutes)

    day_start = datetime.combine(scheduled_at.date(), datetime.min.time())
    day_end = day_start + timedelta(days=1)

    existing = Consultation.query.filter(
        Consultation.scheduled_at >= day_start,
        Consultation.scheduled_at < day_end,
        Consultation.status.in_(["pending", "confirmed"]),
    ).all()

    for c in existing:
        c_start = c.scheduled_at
        c_end = c_start + timedelta(minutes=c.duration_mins or 45)
        if requested_start < c_end and c_start < requested_end:
            return (
                f"That time is too close to another booking "
                f"({c_start.strftime('%H:%M')}-{c_end.strftime('%H:%M')}). "
                f"Please choose a different time."
            )

    business_start = current_app.config["BUSINESS_HOURS_START"]
    business_end = current_app.config["BUSINESS_HOURS_END"]
    if scheduled_at.hour < business_start or scheduled_at.hour >= business_end:
        return f"Please choose a time between {business_start}:00 and {business_end}:00."

    return None


@calendar_admin_bp.get("")
@requires_role("admin")
def admin_calendar():
    """
    Combined calendar feed for the admin dashboard: consultations and events
    in one range, each tagged with a `type` field so the frontend can render
    them differently while sharing one view. Enriched with real names/contact
    details (not just IDs) so the calendar is actually useful at a glance
    rather than requiring a click-through for basic context.
    """
    start_param = request.args.get("start")
    end_param = request.args.get("end")
    if not start_param or not end_param:
        return jsonify({"error": "start and end query params are required (YYYY-MM-DD)"}), 400

    try:
        start_date = _parse_date(start_param, "start")
        end_date = _parse_date(end_param, "end")
    except ValueError as e:
        return jsonify({"error": str(e)}), 400

    range_start = datetime.combine(start_date, datetime.min.time())
    range_end = datetime.combine(end_date, datetime.min.time()) + timedelta(days=1)

    consultations = Consultation.query.filter(
        Consultation.scheduled_at >= range_start,
        Consultation.scheduled_at < range_end,
    ).all()

    events = Event.query.filter(
        Event.event_date.isnot(None),
        Event.event_date >= start_date,
        Event.event_date <= end_date,
    ).all()

    items = []
    for c in consultations:
        lead = Lead.query.get(c.lead_id)
        items.append(
            {
                "type": "consultation",
                "id": c.id,
                "title": lead.name if lead else f"Lead #{c.lead_id}",
                "subtitle": f"{c.mode.replace('_', ' ').title()} consultation" if c.mode else "Consultation",
                "phone": lead.phone if lead else None,
                "email": lead.email if lead else None,
                "date": c.scheduled_at.date().isoformat(),
                "time": c.scheduled_at.strftime("%H:%M"),
                "duration_mins": c.duration_mins,
                "status": c.status,
                "fee_waived": c.fee_waived,
                "fee_paid": c.fee_paid,
                "lead_id": c.lead_id,
            }
        )
    for e in events:
        client = User.query.get(e.client_id)
        items.append(
            {
                "type": "event",
                "id": e.id,
                "title": e.venue or f"Event #{e.id}",
                "subtitle": client.name if client else "No client on file",
                "phone": client.phone if client else None,
                "email": client.email if client else None,
                "date": e.event_date.isoformat(),
                "time": None,
                "guest_count": e.guest_count,
                "status": e.status,
            }
        )

    return jsonify(items)
