from app.analytics import ApicultureAnalytics
from app.auth import AuthService
from app.config import validate_twilio_signature
import base64
import hashlib
import hmac


def test_bcrypt_password_round_trip():
    password_hash = AuthService.hash_password("a-test-password")
    assert password_hash != "a-test-password"
    assert AuthService.verify_password("a-test-password", password_hash)
    assert not AuthService.verify_password("incorrect", password_hash)


def test_purity_scoring_uses_measured_moisture():
    passing = ApicultureAnalytics.score_purity(17.5)
    failing = ApicultureAnalytics.score_purity(21.0)
    assert passing["status"] == "PASS"
    assert failing["status"] == "REJECT"


def test_twilio_signature_is_required_and_verified_in_production(monkeypatch):
    monkeypatch.setenv("APP_ENV", "production")
    monkeypatch.setenv("TWILIO_AUTH_TOKEN", "twilio-test-token")
    url = "https://api.example.test/api/sms/webhook"
    monkeypatch.setenv("TWILIO_WEBHOOK_URL", url)
    params = {"Body": "HIVE1 TEMP 34 HUM 55", "From": "+919876543210"}
    signed = url + "".join(key + params[key] for key in sorted(params))
    signature = base64.b64encode(hmac.new(b"twilio-test-token", signed.encode(), hashlib.sha1).digest()).decode()
    assert validate_twilio_signature(signature, url, params)
    assert not validate_twilio_signature("invalid", url, params)
