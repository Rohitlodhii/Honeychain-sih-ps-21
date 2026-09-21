from app.analytics import ApicultureAnalytics
from app.auth import AuthService


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
