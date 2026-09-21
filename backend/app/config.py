"""Runtime configuration with explicit, documented development defaults."""

import os
import base64
import hashlib
import hmac
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


def development_only_features_enabled() -> bool:
    """Demo seed endpoints must never be exposed by a production process."""
    return not is_production()


def validate_twilio_signature(signature: str | None, request_url: str, params: dict[str, str]) -> bool:
    """Validate Twilio's HMAC-SHA1 form-webhook signature in production.

    Twilio signs the exact URL plus alphabetically sorted POST parameters using
    the account auth token. Development deliberately bypasses this check so
    `/api/sms/simulate` and local webhook exercises work without credentials.
    """
    if not is_production():
        return True
    token = os.getenv("TWILIO_AUTH_TOKEN")
    configured_url = os.getenv("TWILIO_WEBHOOK_URL")
    if not token or not configured_url or not signature:
        return False
    signed_value = configured_url + "".join(key + params[key] for key in sorted(params))
    expected = base64.b64encode(hmac.new(token.encode(), signed_value.encode(), hashlib.sha1).digest()).decode()
    return hmac.compare_digest(expected, signature)


class ApicultureThresholds:
    """Rule-engine inputs, centralized for review and calibration.

    Temperature (33–36 C), humidity (50–65%), and worker-bee sound
    (180–260 Hz) are the prototype's field ranges derived from the
    apiculture rationale cited in the project brief. Moisture <=20% follows
    the BIS/Codex limit used for this screening-only report. They are not
    substitutes for laboratory certification.
    """
    TEMP_MIN_OPTIMAL = 33.0
    TEMP_MAX_OPTIMAL = 36.0
    TEMP_CRITICAL_LOW = 28.0
    TEMP_CRITICAL_HIGH = 40.0
    HUMIDITY_MIN_OPTIMAL = 50.0
    HUMIDITY_MAX_OPTIMAL = 65.0
    HUMIDITY_CRITICAL_LOW = 40.0
    HUMIDITY_CRITICAL_HIGH = 75.0
    SOUND_MIN_HEALTHY = 180.0
    SOUND_MAX_HEALTHY = 260.0
    SOUND_ANOMALY_RANGE = 25.0
    MOISTURE_MAX_ACCEPTABLE = 20.0
    MOISTURE_CAUTION = 18.0
    WEIGHT_GAIN_HEALTHY_MIN = 0.5
