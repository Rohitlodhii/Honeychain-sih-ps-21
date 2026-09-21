"""Runtime configuration with explicit, documented development defaults."""

import os
from pathlib import Path
from dotenv import load_dotenv

# Load the backend-local file for manual development. Production injects these
# values through the hosting platform; no secret is committed to Git.
load_dotenv(Path(__file__).resolve().parents[1] / ".env")


def is_production() -> bool:
    return os.getenv("APP_ENV", "development").lower() == "production"


def required_secret_key() -> str:
    """Return the JWT signing key; production never falls back to a default."""
    secret = os.getenv("SECRET_KEY")
    if secret:
        return secret
    if is_production():
        raise RuntimeError("SECRET_KEY must be set when APP_ENV=production")
    # Explicit development-only key keeps local quick-start usable while making
    # the insecure state visible in configuration and documentation.
    return "development-only-not-for-production"


def frontend_url() -> str:
    """Local development default; production must supply the public domain."""
    value = os.getenv("FRONTEND_URL")
    if value:
        return value.rstrip("/")
    if is_production():
        raise RuntimeError("FRONTEND_URL must be set when APP_ENV=production")
    return "http://localhost:3000"


def cors_origins() -> list[str]:
    """Allowed browser origins, configured as a comma-separated env value."""
    value = os.getenv("CORS_ORIGINS")
    if value:
        return [origin.strip() for origin in value.split(",") if origin.strip()]
    if is_production():
        raise RuntimeError("CORS_ORIGINS must be set when APP_ENV=production")
    return ["http://localhost:3000"]


def admin_invite_code() -> str | None:
    return os.getenv("ADMIN_INVITE_CODE")
