from datetime import datetime
from flask import Blueprint, request, jsonify, current_app
from app.extensions import db
from app.models import PaymentTransaction, Consultation, Invoice, InvoicePaymentSchedule, StaffPayout

payments_bp = Blueprint("payments", __name__, url_prefix="/api/payments")


@payments_bp.post("/sasapay/collection-callback")
def sasapay_collection_callback():
    """
    SasaPay hits this after a C2B collection (client paying an invoice or
    consultation fee) resolves. No auth on this route since it's called by
    SasaPay's servers, not a logged-in user - validate using SasaPay's
    callback-signing mechanism (see their "Callback Security" docs) before
    this goes live; that check is not yet implemented here.

    Matching strategy: SasaPay's documented C2B result/IPN callback sample
    doesn't reliably include CheckoutRequestID - it shows BillRefNumber,
    TransID, MSISDN, TransAmount instead (confirmed from their docs, not
    guessed). So this tries CheckoutRequestID first, then falls back to
    matching on BillRefNumber/AccountReference against what was stored when
    the transaction was initiated.

    Success signal: the confirmed C2B result callback doesn't send an
    explicit ResultCode - a TransID being present IS the success signal for
    that flow. Kept a ResultCode check too in case a variant includes one.
    """
    payload = request.get_json(silent=True) or {}
    current_app.logger.info(f"SasaPay collection callback received: {payload}")

    checkout_request_id = payload.get("CheckoutRequestID")
    account_reference = payload.get("BillRefNumber") or payload.get("AccountReference")

    txn = _find_transaction(checkout_request_id, account_reference)
    if not txn:
        current_app.logger.warning(
            f"No matching collection transaction (checkout_request_id={checkout_request_id}, "
            f"account_reference={account_reference})"
        )
        return jsonify({"error": "Transaction not found"}), 404

    result_code = payload.get("ResultCode", payload.get("ResponseCode"))
    has_trans_id = bool(payload.get("TransID"))
    is_success = (result_code is not None and str(result_code) == "0") or (result_code is None and has_trans_id)

    txn.raw_callback_payload = payload

    if is_success:
        txn.status = "success"
        txn.provider_ref = payload.get("TransID") or payload.get("MpesaReceiptNumber")
        txn.confirmed_at = datetime.utcnow()
        _cascade_collection_success(txn)
    else:
        txn.status = "failed"
        txn.confirmed_at = datetime.utcnow()

    db.session.commit()
    return jsonify({"received": True})


@payments_bp.post("/sasapay/payout-callback")
def sasapay_payout_callback():
    """
    SasaPay hits this after a B2C payout (staff/vendor payment) resolves.
    Separate route from collections so this only ever has to parse the B2C
    shape - confirmed initial-response fields are B2CRequestID/ResponseCode;
    the actual async result callback isn't fully documented in SasaPay's
    public docs at the time this was written, so this stays defensive:
    matches on B2CRequestID first, falls back to the MerchantTransactionReference
    stored as account_reference, and treats a ResultCode/ResponseCode of "0"
    (or a "status": true with no error) as success.
    """
    payload = request.get_json(silent=True) or {}
    current_app.logger.info(f"SasaPay payout callback received: {payload}")

    checkout_request_id = payload.get("B2CRequestID") or payload.get("CheckoutRequestID")
    account_reference = payload.get("MerchantTransactionReference") or payload.get("AccountReference")

    txn = _find_transaction(checkout_request_id, account_reference)
    if not txn:
        current_app.logger.warning(
            f"No matching payout transaction (checkout_request_id={checkout_request_id}, "
            f"account_reference={account_reference})"
        )
        return jsonify({"error": "Transaction not found"}), 404

    result_code = payload.get("ResultCode", payload.get("ResponseCode"))
    status_flag = payload.get("status")
    is_success = (result_code is not None and str(result_code) == "0") or (result_code is None and status_flag is True)

    txn.raw_callback_payload = payload

    if is_success:
        txn.status = "success"
        txn.provider_ref = payload.get("TransactionReceipt") or payload.get("TransID")
        txn.confirmed_at = datetime.utcnow()
        _cascade_payout_success(txn)
    else:
        txn.status = "failed"
        txn.confirmed_at = datetime.utcnow()

    db.session.commit()
    return jsonify({"received": True})


def _find_transaction(checkout_request_id, account_reference):
    txn = None
    if checkout_request_id:
        txn = PaymentTransaction.query.filter_by(provider_checkout_request_id=checkout_request_id).first()
    if not txn and account_reference:
        txn = PaymentTransaction.query.filter_by(account_reference=account_reference, status="initiated").first()
    return txn


def _cascade_collection_success(txn: PaymentTransaction):
    if txn.consultation_id:
        consultation = Consultation.query.get(txn.consultation_id)
        if consultation:
            consultation.fee_paid = True
            consultation.status = "confirmed"

    if txn.schedule_item_id:
        schedule_item = InvoicePaymentSchedule.query.get(txn.schedule_item_id)
        if schedule_item:
            schedule_item.status = "paid"
            invoice = Invoice.query.get(schedule_item.invoice_id)
            if invoice:
                invoice.recompute_status()


def _cascade_payout_success(txn: PaymentTransaction):
    if txn.payout_id:
        payout = StaffPayout.query.get(txn.payout_id)
        if payout:
            payout.status = "paid"
            payout.paid_at = datetime.utcnow()
            payout.provider_ref = txn.provider_ref
            for item in payout.items:
                from app.models import EventStaffAssignment

                assignment = EventStaffAssignment.query.get(item.event_staff_assignment_id)
                if assignment:
                    assignment.paid_status = "paid"


@payments_bp.get("/<int:transaction_id>/status")
def get_transaction_status(transaction_id):
    """Let the frontend poll this while waiting for the async callback."""
    txn = PaymentTransaction.query.get_or_404(transaction_id)
    return jsonify(txn.to_dict())
