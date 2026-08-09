from datetime import datetime
from app.extensions import db, bcrypt


class User(db.Model):
    __tablename__ = "users"

    id = db.Column(db.Integer, primary_key=True)
    name = db.Column(db.String(150), nullable=False)
    email = db.Column(db.String(150), unique=True, nullable=False, index=True)
    phone = db.Column(db.String(20), unique=True, nullable=True, index=True)
    password_hash = db.Column(db.String(255), nullable=False)

    # client | staff | admin  (casual vs permanent is a distinction on staff_profiles,
    # not a separate role, since a casual is still fundamentally "staff")
    role = db.Column(db.String(20), nullable=False, default="client")

    is_active = db.Column(db.Boolean, default=True)
    created_at = db.Column(db.DateTime, default=datetime.utcnow)

    staff_profile = db.relationship("StaffProfile", backref="user", uselist=False, cascade="all, delete-orphan")

    def set_password(self, plain_password):
        self.password_hash = bcrypt.generate_password_hash(plain_password).decode("utf-8")

    def check_password(self, plain_password):
        return bcrypt.check_password_hash(self.password_hash, plain_password)

    def to_dict(self):
        return {
            "id": self.id,
            "name": self.name,
            "email": self.email,
            "phone": self.phone,
            "role": self.role,
            "is_active": self.is_active,
            "created_at": self.created_at.isoformat() if self.created_at else None,
        }


class StaffProfile(db.Model):
    __tablename__ = "staff_profiles"

    id = db.Column(db.Integer, primary_key=True)
    user_id = db.Column(db.Integer, db.ForeignKey("users.id"), nullable=False, unique=True)

    employment_type = db.Column(db.String(20), nullable=False, default="casual")  # permanent | casual

    # Default billing rhythm for this person - individual assignments can override.
    pay_structure = db.Column(db.String(20), nullable=False, default="per_event")  # per_event | weekly | monthly
    rate_amount = db.Column(db.Numeric(12, 2), nullable=False, default=0)

    bank_details = db.Column(db.String(255), nullable=True)
    mpesa_number = db.Column(db.String(20), nullable=True)
    id_number = db.Column(db.String(50), nullable=True)

    active = db.Column(db.Boolean, default=True)

    def to_dict(self):
        return {
            "id": self.id,
            "user_id": self.user_id,
            "employment_type": self.employment_type,
            "pay_structure": self.pay_structure,
            "rate_amount": str(self.rate_amount),
            "mpesa_number": self.mpesa_number,
            "active": self.active,
        }
