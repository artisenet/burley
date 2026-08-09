from app.extensions import db


class ServiceCategory(db.Model):
    __tablename__ = "service_categories"

    id = db.Column(db.Integer, primary_key=True)
    name = db.Column(db.String(100), nullable=False, unique=True)

    services = db.relationship("Service", backref="category", lazy="dynamic")

    def to_dict(self):
        return {"id": self.id, "name": self.name}


class Service(db.Model):
    __tablename__ = "services"

    id = db.Column(db.Integer, primary_key=True)
    category_id = db.Column(db.Integer, db.ForeignKey("service_categories.id"), nullable=False)

    name = db.Column(db.String(150), nullable=False)
    description = db.Column(db.Text, nullable=True)

    cost_price = db.Column(db.Numeric(12, 2), nullable=False, default=0)
    default_markup_pct = db.Column(db.Numeric(5, 2), nullable=False, default=35)

    unit = db.Column(db.String(20), nullable=False, default="flat")  # flat | per_guest | per_hour
    is_vendor_sourced = db.Column(db.Boolean, default=False)

    active = db.Column(db.Boolean, default=True)

    @property
    def default_selling_price(self):
        markup_multiplier = 1 + (float(self.default_markup_pct) / 100)
        return round(float(self.cost_price) * markup_multiplier, 2)

    def to_dict(self):
        return {
            "id": self.id,
            "category_id": self.category_id,
            "name": self.name,
            "description": self.description,
            "cost_price": str(self.cost_price),
            "default_markup_pct": str(self.default_markup_pct),
            "default_selling_price": self.default_selling_price,
            "unit": self.unit,
            "is_vendor_sourced": self.is_vendor_sourced,
            "active": self.active,
        }
