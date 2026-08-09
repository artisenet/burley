from flask import Blueprint, request, jsonify, current_app, send_file
from app.extensions import db
from app.models import Invoice, InvoicePaymentSchedule, PaymentTransaction, Quote, User
from app.services import sasapay
from app.services import pdf as pdf_service
from app.utils.decorators import requires_role

admin_invoices_bp = Blueprint("admin_invoices", __name__, url_prefix="/api/admin/invoices")


@admin_invoices_bp.get("")
@requires_role("admin")
def list_invoices():
    status = request.args.get("status")
    query = Invoice.query
    if status:
        query = query.filter_by(status=status)
    invoices = query.order_by(Invoice.created_at.desc()).all()
    return jsonify([i.to_dict() for i in invoices])


@admin_invoices_bp.get("/<int:invoice_id>")
@requires_role("admin")
def get_invoice(invoice_id):
    invoice = Invoice.query.get_or_404(invoice_id)
    return jsonify(invoice.to_dict())


@admin_invoices_bp.post("/schedule-items/<int:schedule_item_id>/collect")
@requires_role("admin")
def collect_schedule_item(schedule_item_id):
    """
    Admin-initiated collection - e.g. she's on the phone with the client and
    wants to trigger the STK push for the deposit right then. The client-facing
    portal has its own version of this that clients trigger themselves; both
    end up creating the same kind of PaymentTransaction row.
    """
    schedule_item = InvoicePaymentSchedule.query.get_or_404(schedule_item_id)
    if schedule_item.status == "paid":
        return jsonify({"error": "This payment has already been made"}), 409

    data = request.get_json() or {}
    phone_number = data.get("phone_number")
    if not phone_number:
        return jsonify({"error": "phone_number is required"}), 400

    try:
        result = sasapay.initiate_collection(
            phone_number=phone_number,
            amount=schedule_item.amount_due,
            account_reference=f"INV-{schedule_item.invoice_id}-{schedule_item.label}",
            description=f"Invoice #{schedule_item.invoice_id} - {schedule_item.label}",
        )
    except sasapay.SasaPayError as e:
        current_app.logger.error(f"SasaPay collection failed: {e}")
        return jsonify({"error": "Payment initiation failed, please try again"}), 502

    txn = PaymentTransaction(
        direction="collection",
        invoice_id=schedule_item.invoice_id,
        schedule_item_id=schedule_item.id,
        amount=schedule_item.amount_due,
        provider="sasapay",
        provider_merchant_request_id=result["merchant_request_id"],
        provider_checkout_request_id=result["checkout_request_id"],
        account_reference=result.get("account_reference"),
        status="initiated",
    )
    db.session.add(txn)
    db.session.commit()

    return jsonify(
        {
            "transaction_id": txn.id,
            "checkout_request_id": result["checkout_request_id"],
            "message": "Payment prompt sent - check your phone to complete it.",
        }
    ), 202


@admin_invoices_bp.post("/schedule-items/<int:schedule_item_id>/mark-paid-manual")
@requires_role("admin")
def mark_paid_manual(schedule_item_id):
    """For cash payments or bank transfers she collects outside SasaPay -
    keeps the books accurate even when the money didn't move through the app."""
    schedule_item = InvoicePaymentSchedule.query.get_or_404(schedule_item_id)
    schedule_item.status = "paid"

    invoice = Invoice.query.get(schedule_item.invoice_id)
    invoice.recompute_status()

    db.session.add(
        PaymentTransaction(
            direction="collection",
            invoice_id=invoice.id,
            schedule_item_id=schedule_item.id,
            amount=schedule_item.amount_due,
            provider="cash",
            status="success",
        )
    )
    db.session.commit()
    return jsonify(invoice.to_dict())


@admin_invoices_bp.get("/<int:invoice_id>/pdf")
@requires_role("admin")
def download_invoice_pdf(invoice_id):
    invoice = Invoice.query.get_or_404(invoice_id)
    client = User.query.get(invoice.client_id)
    quote = Quote.query.get(invoice.quote_id) if invoice.quote_id else None
    buffer = pdf_service.generate_invoice_pdf(invoice, client, quote)
    return send_file(buffer, mimetype="application/pdf", as_attachment=True, download_name=f"invoice-{invoice.id}.pdf")


@admin_invoices_bp.get("/schedule-items/<int:schedule_item_id>/receipt.pdf")
@requires_role("admin")
def download_receipt_pdf(schedule_item_id):
    schedule_item = InvoicePaymentSchedule.query.get_or_404(schedule_item_id)
    txn = PaymentTransaction.query.filter_by(schedule_item_id=schedule_item.id, status="success").first()
    if not txn:
        return jsonify({"error": "No successful payment found for this item yet"}), 404
    invoice = Invoice.query.get(schedule_item.invoice_id)
    client = User.query.get(invoice.client_id) if invoice else None
    buffer = pdf_service.generate_receipt_pdf(txn, client, f"Invoice #{invoice.id} - {schedule_item.label}" if invoice else "Payment")
    return send_file(buffer, mimetype="application/pdf", as_attachment=True, download_name=f"receipt-{txn.id}.pdf")
