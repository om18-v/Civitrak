"""Create Backend/.env without exposing the PostgreSQL password in chat or logs."""

from getpass import getpass
from pathlib import Path
from urllib.parse import quote

BACKEND_DIR = Path(__file__).resolve().parent
env_path = BACKEND_DIR / ".env"

print("Civitrak backend setup")
print("Database: sihps124")
print("Host: localhost:5432")
print()

password = getpass("Enter the PostgreSQL password for user 'postgres': ")
if not password:
    raise SystemExit("Password cannot be empty.")

encoded = quote(password, safe="")
env_path.write_text(
    f"DATABASE_URL=postgresql://postgres:{encoded}@localhost:5432/sihps124\n",
    encoding="utf-8",
)

print(f"\nCreated: {env_path}")
print("Your password was not printed.")
