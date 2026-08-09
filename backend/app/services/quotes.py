"""
Shared logic for turning an accepted quote into an invoice + payment schedule.
Used by both the admin "accept on the client's behalf" flow (which can
specify a custom multi-part schedule and optionally create the event) and the
client's own self-service accept button (which always uses a single 'full'
payment schedule item - simpler, since letting a client freehand a payment
schedule isn't something she wants exposed).
"""
from app.extensions import db
from app.models import Invoice, InvoicePaymentSchedule, Event


def accept_quote_to_invoice(quote, due_date=None, schedule=None, event_id=None):
    """
    Marks `quote` as accepted and creates its Invoice + InvoicePaymentSchedule
    rows. Does not commit - caller is responsible for db.session.commit().

    schedule: optional list of dicts [{"label", "amount_due", "due_date"}, ...]
              If omitted, a single 'full' schedule item is created instead.
    event_id: optional Event to link the new invoice to (and vice versa).
              If neither this nor quote.event_id is set, a bare Event is
              auto-created so accepting a quote always guarantees a
              trackable event exists - previously the client's self-service
              accept path left no event behind at all, which meant an
              accepted, paid quote could disappear from the events list.
              Admin can fill in venue/date/guest_count later once confirmed
              with the client.
    """
    quote.status = "accepted"

    linked_event_id = event_id or quote.event_id
    if not linked_event_id:
        auto_event = Event(
            client_id=quote.client_id,
            quote_id=quote.id,
            status="confirmed",
        )
        db.session.add(auto_event)
        db.session.flush()
        linked_event_id = auto_event.id
        quote.event_id = linked_event_id

    invoice = Invoice(
        quote_id=quote.id,
        client_id=quote.client_id,
        event_id=linked_event_id,
        total_amount=quote.total_price,
        due_date=due_date,
    )
    db.session.add(invoice)
    db.session.flush()

    event = Event.query.get(linked_event_id)
    if event:
        event.invoice_id = invoice.id

    if schedule:
        for entry in schedule:
            db.session.add(
                InvoicePaymentSchedule(
                    invoice_id=invoice.id,
                    label=entry["label"],
                    amount_due=entry["amount_due"],
                    due_date=entry.get("due_date"),
                )
            )
    else:
        db.session.add(
            InvoicePaymentSchedule(
                invoice_id=invoice.id,
                label="full",
                amount_due=invoice.total_amount,
                due_date=invoice.due_date,
            )
        )

    return invoice
