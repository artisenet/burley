from datetime import datetime
from app.extensions import db


class AppSetting(db.Model):
    """
    Generic key-value store for admin-editable configuration that shouldn't
    require a code change + restart to update - starting with SasaPay
    credentials, but built generically so other settings (business hours,
    default consultation fee, etc.) can move here later without a new table.

    Secrets stored here (e.g. sasapay_client_secret) are plaintext in the
    database, same trust boundary as storing them in .env - fine for this
    scale, but it means DB access = credential access. Worth encrypting at
    rest if this ever needs a higher security bar.
    """
    __tablename__ = "app_settings"

    id = db.Column(db.Integer, primary_key=True)
    key = db.Column(db.String(100), unique=True, nullable=False, index=True)
    value = db.Column(db.Text, nullable=True)
    updated_at = db.Column(db.DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

    @staticmethod
    def get(key, default=None):
        row = AppSetting.query.filter_by(key=key).first()
        return row.value if row and row.value not in (None, "") else default

    @staticmethod
    def set(key, value):
        row = AppSetting.query.filter_by(key=key).first()
        if row:
            row.value = value
        else:
            row = AppSetting(key=key, value=value)
            db.session.add(row)
        return row
