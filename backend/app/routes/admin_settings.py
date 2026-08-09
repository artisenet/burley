from flask import Blueprint, request, jsonify
from app.extensions import db
from app.models import AppSetting
from app.utils.decorators import requires_role

admin_settings_bp = Blueprint("admin_settings", __name__, url_prefix="/api/admin/settings")

SASAPAY_KEYS = {
    "client_id": "sasapay_client_id",
    "client_secret": "sasapay_client_secret",
    "merchant_code": "sasapay_merchant_code",
    "base_url": "sasapay_base_url",
    "callback_base_url": "sasapay_callback_base_url",
}

DEFAULT_BASE_URL = "https://sandbox.sasapay.app"


@admin_settings_bp.get("/sasapay")
@requires_role("admin")
def get_sasapay_settings():
    """
    Returns current SasaPay settings for the admin Settings page.
    client_secret is never sent back in full once saved - only whether one
    is configured - same pattern most platforms use to avoid re-exposing a
    stored secret every time the page loads.
    """
    client_secret_value = AppSetting.get(SASAPAY_KEYS["client_secret"])
    return jsonify(
        {
            "client_id": AppSetting.get(SASAPAY_KEYS["client_id"], ""),
            "merchant_code": AppSetting.get(SASAPAY_KEYS["merchant_code"], ""),
            "base_url": AppSetting.get(SASAPAY_KEYS["base_url"], DEFAULT_BASE_URL),
            "callback_base_url": AppSetting.get(SASAPAY_KEYS["callback_base_url"], ""),
            "client_secret_configured": bool(client_secret_value),
        }
    )


@admin_settings_bp.post("/sasapay")
@requires_role("admin")
def save_sasapay_settings():
    """
    Saves SasaPay credentials without requiring a code edit + server
    restart. client_secret is only overwritten if a non-empty value is
    submitted - leaving the field blank in the form keeps the existing
    stored secret, so re-saving other fields doesn't accidentally wipe it.
    """
    data = request.get_json() or {}

    if "client_id" in data:
        AppSetting.set(SASAPAY_KEYS["client_id"], data["client_id"].strip())
    if "merchant_code" in data:
        AppSetting.set(SASAPAY_KEYS["merchant_code"], data["merchant_code"].strip())
    if "base_url" in data and data["base_url"].strip():
        AppSetting.set(SASAPAY_KEYS["base_url"], data["base_url"].strip().rstrip("/"))
    if "callback_base_url" in data and data["callback_base_url"].strip():
        AppSetting.set(SASAPAY_KEYS["callback_base_url"], data["callback_base_url"].strip().rstrip("/"))
    if data.get("client_secret"):
        AppSetting.set(SASAPAY_KEYS["client_secret"], data["client_secret"].strip())

    db.session.commit()
    return get_sasapay_settings()
