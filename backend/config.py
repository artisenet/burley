import os
from datetime import timedelta

basedir = os.path.abspath(os.path.dirname(__file__))


class Config:
    SECRET_KEY = os.environ.get("SECRET_KEY", "dev-secret-change-me")
    JWT_SECRET_KEY = os.environ.get("JWT_SECRET_KEY", "dev-jwt-secret-change-me")
    JWT_ACCESS_TOKEN_EXPIRES = timedelta(hours=8)
    JWT_REFRESH_TOKEN_EXPIRES = timedelta(days=30)

    SQLALCHEMY_DATABASE_URI = os.environ.get(
        "DATABASE_URL", "mysql+pymysql://root:123Enter$@localhost:3306/burley"
    )
    SQLALCHEMY_TRACK_MODIFICATIONS = False

    # Business rule default - can be overridden per-service in the DB,
    # this is just the fallback used when creating new services.
    DEFAULT_MARKUP_PCT = float(os.environ.get("DEFAULT_MARKUP_PCT", 35))

    # Calendar / availability
    BUSINESS_HOURS_START = int(os.environ.get("BUSINESS_HOURS_START", 9))   # 9am
    BUSINESS_HOURS_END = int(os.environ.get("BUSINESS_HOURS_END", 17))      # 5pm
    CONSULTATION_BUFFER_MINUTES = int(os.environ.get("CONSULTATION_BUFFER_MINUTES", 60))

    # SasaPay
    SASAPAY_ENV = os.environ.get("SASAPAY_ENV", "sandbox")
    SASAPAY_BASE_URL = os.environ.get("SASAPAY_BASE_URL", "https://sandbox.sasapay.app")
    SASAPAY_CLIENT_ID = os.environ.get("SASAPAY_CLIENT_ID", "")
    SASAPAY_CLIENT_SECRET = os.environ.get("SASAPAY_CLIENT_SECRET", "")
    SASAPAY_MERCHANT_CODE = os.environ.get("SASAPAY_MERCHANT_CODE", "")
    SASAPAY_CALLBACK_BASE_URL = os.environ.get("SASAPAY_CALLBACK_BASE_URL", "http://localhost:5000")

    FRONTEND_ORIGIN = os.environ.get("FRONTEND_ORIGIN", "http://localhost:5173")

    # Cloudinary - image/video storage. Required in production since hosts
    # like Render have ephemeral disks; local disk storage only survives
    # between deploys/restarts in local development.
    CLOUDINARY_CLOUD_NAME = os.environ.get("CLOUDINARY_CLOUD_NAME", "Root")
    CLOUDINARY_API_KEY = os.environ.get("CLOUDINARY_API_KEY", "722178519996868")
    CLOUDINARY_API_SECRET = os.environ.get("CLOUDINARY_API_SECRET", "rRihxj9G6iuPPzx8srAs0YtdgMY")


class DevelopmentConfig(Config):
    DEBUG = True


class ProductionConfig(Config):
    DEBUG = False


class TestingConfig(Config):
    TESTING = True
    SQLALCHEMY_DATABASE_URI = os.environ.get(
        "TEST_DATABASE_URL", "mysql+pymysql://root:password@localhost:3306/burley_events_test"
    )


config_by_name = {
    "development": DevelopmentConfig,
    "production": ProductionConfig,
    "testing": TestingConfig,
}
