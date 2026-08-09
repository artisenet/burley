"""
SasaPay integration, isolated behind this module so nothing else in the app
talks to SasaPay's REST API directly. If SasaPay changes their API, or you
need to swap providers later, this is the only file that should need to change.

Flow for a collection (client paying an invoice/consultation):
    1. call initiate_collection(...) -> returns checkout_request_id immediately
    2. persist a PaymentTransaction row with status='initiated'
    3. SasaPay hits /api/payments/sasapay/collection-callback later with the result
    4. that callback handler looks up the transaction and updates it

Flow for a payout (paying staff/vendors):
    1. call initiate_payout(...) -> returns checkout_request_id immediately
    2. persist a PaymentTransaction row (direction='payout') with status='initiated'
    3. SasaPay hits /api/payments/sasapay/payout-callback (a *different* route
       from collections) - each direction gets its own callback URL so each
       handler only ever has to parse one known payload shape, rather than
       guessing which shape arrived at a shared endpoint.

IMPORTANT: this module currently targets the sandbox/production REST endpoints
documented at https://docs.sasapay.app/ - re-verify field names against the
current docs before going live, payment APIs are exactly the kind of thing
that drift over time.
"""
import time
import requests
from flask import current_app

COLLECTION_CALLBACK_PATH = "/api/payments/sasapay/collection-callback"
PAYOUT_CALLBACK_PATH = "/api/payments/sasapay/payout-callback"


class SasaPayError(Exception):
    pass


def _setting_or_config(setting_key, config_key):
    """Prefer an admin-editable value stored in the database (via the
    Settings page); fall back to the .env-driven app config if nothing's
    been saved there yet - keeps existing .env-only setups working
    unchanged until someone actually uses the Settings page."""
    from app.models import AppSetting
    db_value = AppSetting.get(setting_key)
    if db_value:
        return db_value
    return current_app.config[config_key]


def _get_base_url():
    return _setting_or_config("sasapay_base_url", "SASAPAY_BASE_URL")


def _get_client_id():
    return _setting_or_config("sasapay_client_id", "SASAPAY_CLIENT_ID")


def _get_client_secret():
    return _setting_or_config("sasapay_client_secret", "SASAPAY_CLIENT_SECRET")


def _get_merchant_code():
    return _setting_or_config("sasapay_merchant_code", "SASAPAY_MERCHANT_CODE")


def _get_callback_base_url():
    return _setting_or_config("sasapay_callback_base_url", "SASAPAY_CALLBACK_BASE_URL")



_token_cache = {"access_token": None, "expires_at": 0}


def _get_access_token():
    """OAuth2 client-credentials token, cached until near expiry."""
    now = time.time()
    if _token_cache["access_token"] and now < _token_cache["expires_at"] - 30:
        return _token_cache["access_token"]

    base_url = _get_base_url()
    client_id = _get_client_id()
    client_secret = _get_client_secret()

    resp = requests.get(
        f"{base_url}/api/v1/auth/token/",
        params={"grant_type": "client_credentials"},
        auth=(client_id, client_secret),
        timeout=15,
    )
    if resp.status_code != 200:
        raise SasaPayError(f"Failed to get SasaPay access token: {resp.status_code} {resp.text}")

    data = resp.json()
    access_token = data.get("access_token")
    expires_in = int(data.get("expires_in", 3600))

    _token_cache["access_token"] = access_token
    _token_cache["expires_at"] = now + expires_in
    return access_token


def _auth_headers():
    return {
        "Authorization": f"Bearer {_get_access_token()}",
        "Content-Type": "application/json",
    }


def initiate_collection(*, phone_number, amount, account_reference, description, network_code="63902"):
    """
    Initiate a C2B collection - e.g. client paying a deposit or consultation fee.
    network_code defaults to M-Pesa (63902). Other options include Airtel Money
    (63903), T-Kash (63907), or "0" for SasaPay's own wallet (which triggers an
    OTP flow instead of an STK push - handle that distinction in the caller if
    you expose wallet payments as an option).

    Returns dict with merchant_request_id and checkout_request_id - store both
    on the PaymentTransaction row immediately, status='initiated'.
    """
    base_url = _get_base_url()
    merchant_code = _get_merchant_code()
    callback_url = f"{_get_callback_base_url()}{COLLECTION_CALLBACK_PATH}"

    payload = {
        "MerchantCode": merchant_code,
        "NetworkCode": network_code,
        "PhoneNumber": phone_number,
        "Currency": "KES",
        "Amount": str(amount),
        "Transaction Fee": 0,
        "AccountReference": account_reference,
        "TransactionDesc": description,
        "CallBackURL": callback_url,
    }

    resp = requests.post(
        f"{base_url}/api/v1/payments/request-payment/",
        json=payload,
        headers=_auth_headers(),
        timeout=30,
    )
    if resp.status_code not in (200, 201):
        raise SasaPayError(f"SasaPay collection request failed: {resp.status_code} {resp.text}")

    data = resp.json()
    return {
        "merchant_request_id": data.get("MerchantRequestID"),
        "checkout_request_id": data.get("CheckoutRequestID"),
        "response_code": data.get("ResponseCode"),
        "response_description": data.get("ResponseDescription"),
        "account_reference": account_reference,
        "raw": data,
    }


def initiate_payout(*, phone_number, amount, channel_code, reason, reference):
    """
    Initiate a B2C payout - e.g. paying a casual staff member or vendor via
    mobile money. channel_code follows SasaPay's B2C channel codes (e.g. "00"
    for SasaPay wallet, "63902" for M-Pesa, or a bank code - see SasaPay's
    Channel Codes reference for the full list).

    IMPORTANT: unlike C2B, the confirmed B2C response returns a distinct
    'B2CRequestID' rather than 'CheckoutRequestID' - both are stored on the
    PaymentTransaction's provider_checkout_request_id column (same column
    used as a generic "provider's tracking ID" for matching callbacks,
    regardless of which specific field name SasaPay used to produce it).
    """
    base_url = _get_base_url()
    merchant_code = _get_merchant_code()
    callback_url = f"{_get_callback_base_url()}{PAYOUT_CALLBACK_PATH}"

    payload = {
        "MerchantCode": merchant_code,
        "MerchantTransactionReference": reference,
        "Amount": str(amount),
        "Currency": "KES",
        "ReceiverNumber": phone_number,
        "Channel": channel_code,
        "Reason": reason,
        "CallBackURL": callback_url,
    }

    resp = requests.post(
        f"{base_url}/api/v1/payments/b2c/",
        json=payload,
        headers=_auth_headers(),
        timeout=30,
    )
    if resp.status_code not in (200, 201):
        raise SasaPayError(f"SasaPay payout request failed: {resp.status_code} {resp.text}")

    data = resp.json()
    return {
        "merchant_request_id": data.get("MerchantRequestID"),
        "checkout_request_id": data.get("B2CRequestID") or data.get("CheckoutRequestID"),
        "response_code": data.get("ResponseCode"),
        "response_description": data.get("detail") or data.get("ResponseDescription"),
        "account_reference": reference,
        "raw": data,
    }


def check_transaction_status(checkout_request_id):
    """Query SasaPay directly for a transaction's current status - useful as a
    fallback if a callback never arrives (network issues, etc.), so the admin
    UI can offer a manual 'check status' button rather than leaving a payment
    stuck in 'initiated' forever."""
    base_url = _get_base_url()
    merchant_code = _get_merchant_code()

    resp = requests.get(
        f"{base_url}/api/v1/payments/transaction-status/",
        params={"MerchantCode": merchant_code, "CheckoutRequestID": checkout_request_id},
        headers=_auth_headers(),
        timeout=15,
    )
    if resp.status_code != 200:
        raise SasaPayError(f"SasaPay status check failed: {resp.status_code} {resp.text}")
    return resp.json()


def get_account_balance():
    """
    Live merchant balance from SasaPay - confirmed endpoint/shape from
    SasaPay's docs (Query Merchant's Account Balance):
    GET /api/v1/payments/check-balance/?MerchantCode=...
    Returns the working-account balance plus the full per-account-label
    breakdown (Working Account, Utility Account, Bulk Payment).
    """
    base_url = _get_base_url()
    merchant_code = _get_merchant_code()

    resp = requests.get(
        f"{base_url}/api/v1/payments/check-balance/",
        params={"MerchantCode": merchant_code},
        headers=_auth_headers(),
        timeout=15,
    )
    if resp.status_code != 200:
        raise SasaPayError(f"SasaPay balance check failed: {resp.status_code} {resp.text}")

    data = resp.json()
    account_data = data.get("data", {})
    return {
        "currency": account_data.get("CurrencyCode", "KES"),
        "total_balance": account_data.get("OrgAccountBalance"),
        "accounts": account_data.get("Accounts", []),
    }
