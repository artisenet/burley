from flask import Blueprint, jsonify
from app.models import PaymentTransaction
from app.services import sasapay
from app.utils.decorators import requires_role

admin_wallet_bp = Blueprint("admin_wallet", __name__, url_prefix="/api/admin/wallet")


@admin_wallet_bp.get("")
@requires_role("admin")
def wallet_overview():
    """
    Money in / money out overview: live SasaPay balance where credentials
    are configured and reachable, plus a local ledger computed from our own
    successful transactions (works regardless of whether the live balance
    call succeeds, so this page is still useful before/without a real
    SasaPay connection - e.g. while credentials are still pending onboarding).
    """
    live_balance = None
    live_balance_error = None
    try:
        live_balance = sasapay.get_account_balance()
    except sasapay.SasaPayError as e:
        live_balance_error = str(e)

    collections = PaymentTransaction.query.filter_by(direction="collection", status="success").all()
    payouts = PaymentTransaction.query.filter_by(direction="payout", status="success").all()

    total_in = sum(float(t.amount) for t in collections)
    total_out = sum(float(t.amount) for t in payouts)

    recent = (
        PaymentTransaction.query.filter(PaymentTransaction.status.in_(["success", "failed"]))
        .order_by(PaymentTransaction.confirmed_at.desc())
        .limit(25)
        .all()
    )

    return jsonify(
        {
            "live_balance": live_balance,
            "live_balance_error": live_balance_error,
            "ledger": {
                "total_in": total_in,
                "total_out": total_out,
                "net": total_in - total_out,
                "collection_count": len(collections),
                "payout_count": len(payouts),
            },
            "recent_transactions": [t.to_dict() for t in recent],
        }
    )
