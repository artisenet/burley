"""
Run once after migrations to create an initial admin account and starter
catalog data (categories + common services). Usage:

    python seed.py

Safe to re-run - everything here checks for existing rows first, so it
won't create duplicates if you run it more than once.
"""
from app import create_app
from app.extensions import db
from app.models import User, ServiceCategory, Service, Vendor

app = create_app("development")

with app.app_context():
    if not User.query.filter_by(email="admin@example.com").first():
        admin = User(name="Admin", email="admin@example.com", phone=None, role="admin")
        admin.set_password("changeme123")
        db.session.add(admin)
        print("Created admin user: admin@example.com / changeme123 - CHANGE THIS PASSWORD")

    default_categories = ["Decor", "Catering Coordination", "Full Planning", "Photography Liaison", "Rentals"]
    for name in default_categories:
        if not ServiceCategory.query.filter_by(name=name).first():
            db.session.add(ServiceCategory(name=name))
    db.session.commit()

    categories_by_name = {c.name: c for c in ServiceCategory.query.all()}

    # Ten services common across event planning businesses - cost prices are
    # reasonable KES starting points, not gospel; edit freely from the admin
    # Catalog page once real supplier/labor costs are known. All carry the
    # default 35% markup unless noted.
    default_services = [
        {
            "name": "Full Wedding Planning",
            "category": "Full Planning",
            "description": "End-to-end planning from concept through the day itself - vendor sourcing, timeline, budget management.",
            "cost_price": 80000,
            "unit": "flat",
        },
        {
            "name": "Day-of Coordination",
            "category": "Full Planning",
            "description": "On-site coordination for an event already planned - timeline management and vendor liaison on the day.",
            "cost_price": 25000,
            "unit": "flat",
        },
        {
            "name": "MC & Entertainment Booking",
            "category": "Full Planning",
            "description": "Sourcing and booking a master of ceremonies and/or entertainment act.",
            "cost_price": 20000,
            "unit": "flat",
            "is_vendor_sourced": True,
        },
        {
            "name": "Full Venue Decor Setup",
            "category": "Decor",
            "description": "Complete decor installation for the venue - staging, backdrop, table settings, lighting accents.",
            "cost_price": 40000,
            "unit": "flat",
        },
        {
            "name": "Floral Arrangements",
            "category": "Decor",
            "description": "Fresh floral arrangements for centerpieces, arches, and bouquets.",
            "cost_price": 15000,
            "unit": "flat",
        },
        {
            "name": "Tent & Canopy Rental",
            "category": "Rentals",
            "description": "Outdoor tent/canopy setup including basic frame and cover.",
            "cost_price": 20000,
            "unit": "flat",
        },
        {
            "name": "Chairs & Tables Rental",
            "category": "Rentals",
            "description": "Seating and table rental, priced per guest.",
            "cost_price": 150,
            "unit": "per_guest",
        },
        {
            "name": "Catering Coordination & Menu Planning",
            "category": "Catering Coordination",
            "description": "Menu planning and coordination with a catering vendor - does not include the food cost itself.",
            "cost_price": 10000,
            "unit": "flat",
        },
        {
            "name": "Photography Package",
            "category": "Photography Liaison",
            "description": "Full-day event photography via a partner photographer.",
            "cost_price": 35000,
            "unit": "flat",
            "is_vendor_sourced": True,
        },
        {
            "name": "Videography Package",
            "category": "Photography Liaison",
            "description": "Full-day event videography and a highlight reel via a partner videographer.",
            "cost_price": 40000,
            "unit": "flat",
            "is_vendor_sourced": True,
        },
    ]

    created_count = 0
    for svc in default_services:
        if Service.query.filter_by(name=svc["name"]).first():
            continue
        category = categories_by_name.get(svc["category"])
        if not category:
            continue
        db.session.add(
            Service(
                name=svc["name"],
                category_id=category.id,
                description=svc.get("description"),
                cost_price=svc["cost_price"],
                default_markup_pct=35,
                unit=svc.get("unit", "flat"),
                is_vendor_sourced=svc.get("is_vendor_sourced", False),
            )
        )
        created_count += 1

    db.session.commit()
    print(f"Seeded {created_count} new service(s) (skipped any that already existed).")

    # Twenty vendor types common to Kenyan event planning - placeholder
    # contact details throughout; replace with real supplier info from the
    # admin Vendors page once she has actual partners lined up.
    default_vendors = [
        {"name": "Nairobi Fresh Florals", "category": "Florist", "contact_info": "0711 000 001 - info@nairobifreshflorals.co.ke"},
        {"name": "Savannah Catering Co.", "category": "Catering", "contact_info": "0711 000 002 - hello@savannahcatering.co.ke"},
        {"name": "Pixel Perfect Photography", "category": "Photography", "contact_info": "0711 000 003 - book@pixelperfect.co.ke"},
        {"name": "Motion Craft Films", "category": "Videography", "contact_info": "0711 000 004 - info@motioncraftfilms.co.ke"},
        {"name": "Beats & Decks DJ Services", "category": "DJ & Entertainment", "contact_info": "0711 000 005 - bookings@beatsanddecks.co.ke"},
        {"name": "Royal Tents & Canopies", "category": "Tent Rental", "contact_info": "0711 000 006 - sales@royaltents.co.ke"},
        {"name": "Elegant Chairs & Linens", "category": "Furniture & Linen Rental", "contact_info": "0711 000 007 - orders@elegantcl.co.ke"},
        {"name": "Sweet Layers Bakery", "category": "Cakes & Desserts", "contact_info": "0711 000 008 - orders@sweetlayers.co.ke"},
        {"name": "SoundWave Audio & Lighting", "category": "Sound & Lighting", "contact_info": "0711 000 009 - info@soundwaveke.co.ke"},
        {"name": "Glow Makeup Studio", "category": "Makeup & Beauty", "contact_info": "0711 000 010 - hello@glowmakeup.co.ke"},
        {"name": "MC Dave Events", "category": "MC / Emcee", "contact_info": "0711 000 011 - mcdave@events.co.ke"},
        {"name": "SafeGuard Security Services", "category": "Security", "contact_info": "0711 000 012 - ops@safeguardke.co.ke"},
        {"name": "PrintCraft Stationery", "category": "Invitations & Stationery", "contact_info": "0711 000 013 - orders@printcraft.co.ke"},
        {"name": "Bright Sparks Fireworks", "category": "Fireworks & Pyrotechnics", "contact_info": "0711 000 014 - info@brightsparks.co.ke"},
        {"name": "Elite Bartending Co.", "category": "Bar & Beverage Service", "contact_info": "0711 000 015 - bookings@elitebartending.co.ke"},
        {"name": "City Wheels Transport", "category": "Transport & Logistics", "contact_info": "0711 000 016 - dispatch@citywheels.co.ke"},
        {"name": "Comfort Portable Toilets", "category": "Sanitation Services", "contact_info": "0711 000 017 - hire@comfortsanitation.co.ke"},
        {"name": "GreenScape Landscaping", "category": "Venue Landscaping", "contact_info": "0711 000 018 - info@greenscapeke.co.ke"},
        {"name": "Crystal Clear Glassware Rentals", "category": "Tableware Rental", "contact_info": "0711 000 019 - orders@crystalclearke.co.ke"},
        {"name": "Golden Moments Photo Booth", "category": "Photo Booth Rental", "contact_info": "0711 000 020 - book@goldenmoments.co.ke"},
    ]

    vendor_created_count = 0
    for v in default_vendors:
        if Vendor.query.filter_by(name=v["name"]).first():
            continue
        db.session.add(Vendor(name=v["name"], category=v["category"], contact_info=v["contact_info"]))
        vendor_created_count += 1

    db.session.commit()
    print(f"Seeded {vendor_created_count} new vendor(s) (skipped any that already existed).")
    print("Seed complete.")
