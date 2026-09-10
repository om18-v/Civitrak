from database import SessionLocal
from models import Contractor


contractors = [
    {
        "name": "Raj Infrastructure Services",
        "phone": "9876543210",
        "email": "rajinfra@example.com",
        "assigned_area": "MG Road",
        "rating": 4.8,
    },
    {
        "name": "Urban Road Works",
        "phone": "9876543211",
        "email": "urbanworks@example.com",
        "assigned_area": "Airport Road",
        "rating": 4.6,
    },
    {
        "name": "City Maintenance Solutions",
        "phone": "9876543212",
        "email": "citymaint@example.com",
        "assigned_area": "Station Road",
        "rating": 4.7,
    },
    {
        "name": "Metro Infrastructure Group",
        "phone": "9876543213",
        "email": "metroinfra@example.com",
        "assigned_area": "Ring Road",
        "rating": 4.5,
    },
    {
        "name": "National Road Contractors",
        "phone": "9876543214",
        "email": "nationalroad@example.com",
        "assigned_area": "Main Highway",
        "rating": 4.9,
    },
]


db = SessionLocal()

try:
    for data in contractors:
        existing = (
            db.query(Contractor)
            .filter(Contractor.email == data["email"])
            .first()
        )

        if existing:
            print(f"Already exists: {data['name']}")
            continue

        db.add(Contractor(**data))

    db.commit()
    print("DEMO CONTRACTORS SEEDED SUCCESSFULLY")

finally:
    db.close()