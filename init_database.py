import models
from database import Base, engine, ensure_member4_schema

def initialize_database():
    print("Creating database tables...")
    Base.metadata.create_all(bind=engine)
    print("Applying schema updates...")
    ensure_member4_schema()
    print("DATABASE INITIALIZATION SUCCESSFUL")

if __name__ == "__main__":
    initialize_database()
