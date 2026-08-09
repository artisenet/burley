from flask import Flask
from config import config_by_name
from app.extensions import db, migrate, jwt, cors, bcrypt


def create_app(config_name="development"):
    app = Flask(__name__)
    app.config.from_object(config_by_name[config_name])

    db.init_app(app)
    migrate.init_app(app, db)
    jwt.init_app(app)
    bcrypt.init_app(app)
    cors.init_app(app, resources={r"/api/*": {"origins": app.config["FRONTEND_ORIGIN"]}})

    import cloudinary
    cloudinary.config(
        cloud_name=app.config["CLOUDINARY_CLOUD_NAME"],
        api_key=app.config["CLOUDINARY_API_KEY"],
        api_secret=app.config["CLOUDINARY_API_SECRET"],
        secure=True,
    )

    # Make sure every model is imported so Flask-Migrate can see them
    from app import models  # noqa: F401

    from app.routes.auth import auth_bp
    from app.routes.public import public_bp
    from app.routes.payments import payments_bp
    from app.routes.admin_catalog import admin_catalog_bp
    from app.routes.admin_quotes import admin_quotes_bp
    from app.routes.admin_invoices import admin_invoices_bp
    from app.routes.admin_events import admin_events_bp
    from app.routes.admin_operations import admin_operations_bp
    from app.routes.admin_payouts import admin_payouts_bp
    from app.routes.admin_reports import admin_reports_bp
    from app.routes.admin_overview import admin_overview_bp
    from app.routes.admin_wallet import admin_wallet_bp
    from app.routes.admin_settings import admin_settings_bp
    from app.routes.blog import admin_blog_bp, public_blog_bp
    from app.routes.reviews import admin_reviews_bp, client_reviews_bp, public_reviews_bp
    from app.routes.media import admin_media_bp, public_media_bp
    from app.routes.calendar import calendar_public_bp, calendar_admin_bp
    from app.routes.client import client_bp

    app.register_blueprint(auth_bp)
    app.register_blueprint(public_bp)
    app.register_blueprint(payments_bp)
    app.register_blueprint(admin_catalog_bp)
    app.register_blueprint(admin_quotes_bp)
    app.register_blueprint(admin_invoices_bp)
    app.register_blueprint(admin_events_bp)
    app.register_blueprint(admin_operations_bp)
    app.register_blueprint(admin_payouts_bp)
    app.register_blueprint(admin_reports_bp)
    app.register_blueprint(admin_overview_bp)
    app.register_blueprint(admin_wallet_bp)
    app.register_blueprint(admin_settings_bp)
    app.register_blueprint(admin_blog_bp)
    app.register_blueprint(public_blog_bp)
    app.register_blueprint(admin_reviews_bp)
    app.register_blueprint(client_reviews_bp)
    app.register_blueprint(public_reviews_bp)
    app.register_blueprint(admin_media_bp)
    app.register_blueprint(public_media_bp)
    app.register_blueprint(calendar_public_bp)
    app.register_blueprint(calendar_admin_bp)
    app.register_blueprint(client_bp)

    @app.get("/api/health")
    def health():
        return {"status": "ok"}

    return app
