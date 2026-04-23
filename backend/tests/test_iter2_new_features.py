"""Backend regression + new-feature tests for iteration 2+3.

Covers:
- OAuth endpoint shape (invalid session_id => 401)
- Public /api/settings + admin PUT /api/admin/settings (theme switch, invalid theme)
- Merchant profile update with new fields (logo_url, photo_url, tv_photo_url, hours_text, is_open)
- Admin subscription packages CRUD + public /api/packages
- Payments/subscriptions mocked flow (create, confirm, subscription created with credits)
- Quota enforcement on /api/queue/join (402 without sub, success + decrement with sub, guest bypasses)
- GET /api/admin/queue-stats
- Queue TV display includes merchant logo / photo / tv_photo_url
"""
import os
import uuid
import pytest
import requests

BASE_URL = os.environ.get("EXPO_PUBLIC_BACKEND_URL", "https://merchant-lineup.preview.emergentagent.com").rstrip("/")


def _auth(token): return {"Authorization": f"Bearer {token}"}


# ---------- helpers ----------
@pytest.fixture(scope="module")
def suffix():
    return uuid.uuid4().hex[:8]


@pytest.fixture(scope="module")
def merchant_token(suffix):
    email = f"TEST_it2_merch_{suffix}@x.com"
    r = requests.post(f"{BASE_URL}/api/auth/register", json={
        "email": email, "password": "pass1234", "name": "It2 Merch", "role": "merchant"}, timeout=15)
    assert r.status_code == 200, r.text
    return r.json()["token"]


@pytest.fixture(scope="module")
def customer_token(suffix):
    email = f"TEST_it2_cust_{suffix}@x.com"
    r = requests.post(f"{BASE_URL}/api/auth/register", json={
        "email": email, "password": "pass1234", "name": "It2 Cust", "role": "customer"}, timeout=15)
    assert r.status_code == 200, r.text
    return r.json()["token"]


@pytest.fixture(scope="module")
def customer2_token(suffix):
    email = f"TEST_it2_cust2_{suffix}@x.com"
    r = requests.post(f"{BASE_URL}/api/auth/register", json={
        "email": email, "password": "pass1234", "name": "It2 Cust2", "role": "customer"}, timeout=15)
    assert r.status_code == 200, r.text
    return r.json()["token"]


@pytest.fixture(scope="module")
def approved_merchant(merchant_token, admin_token, suffix):
    r = requests.post(f"{BASE_URL}/api/merchants",
                      json={"name": f"TEST_It2_Shop_{suffix}",
                            "description": "desc",
                            "address": "addr",
                            "logo_url": "https://example.com/logo.png",
                            "photo_url": "https://example.com/photo.jpg",
                            "tv_photo_url": "https://example.com/tv.jpg",
                            "hours_text": "09:00-17:00",
                            "is_open": True},
                      headers=_auth(merchant_token), timeout=15)
    assert r.status_code == 200, r.text
    mid = r.json()["id"]
    r2 = requests.put(f"{BASE_URL}/api/admin/merchants/{mid}/status",
                      json={"status": "approved"}, headers=_auth(admin_token), timeout=15)
    assert r2.status_code == 200
    # Add a category
    r3 = requests.post(f"{BASE_URL}/api/merchants/{mid}/categories",
                       json={"name": "Default", "avg_service_minutes": 5},
                       headers=_auth(merchant_token), timeout=15)
    assert r3.status_code == 200, r3.text
    return {"id": mid, "category_id": r3.json()["id"]}


# ---------- OAuth endpoint ----------
class TestOAuth:
    def test_invalid_session_id_returns_401(self, api):
        r = api.post(f"{BASE_URL}/api/auth/oauth/process",
                     json={"session_id": "totally-fake-session-id"}, timeout=20)
        # Backend proxies to emergentagent; fake session => 401
        assert r.status_code == 401, f"Expected 401, got {r.status_code} / {r.text}"


# ---------- Settings ----------
class TestSettings:
    def test_public_settings(self, api):
        r = api.get(f"{BASE_URL}/api/settings")
        assert r.status_code == 200
        d = r.json()
        for k in ("app_logo_url", "app_name", "theme", "available_themes"):
            assert k in d
        assert isinstance(d["available_themes"], list)
        assert len(d["available_themes"]) >= 5

    def test_admin_update_valid_theme(self, api, admin_token):
        r = api.put(f"{BASE_URL}/api/admin/settings",
                    json={"theme_key": "navy_gold"}, headers=_auth(admin_token))
        assert r.status_code == 200, r.text
        assert r.json()["theme_key"] == "navy_gold"
        # verify via public
        r2 = api.get(f"{BASE_URL}/api/settings")
        assert r2.json()["theme_key"] == "navy_gold"
        # reset
        api.put(f"{BASE_URL}/api/admin/settings",
                json={"theme_key": "slate_emerald"}, headers=_auth(admin_token))

    def test_admin_invalid_theme_400(self, api, admin_token):
        r = api.put(f"{BASE_URL}/api/admin/settings",
                    json={"theme_key": "nope_bad_theme"}, headers=_auth(admin_token))
        assert r.status_code == 400

    def test_non_admin_cannot_update_settings(self, api, customer_token):
        r = api.put(f"{BASE_URL}/api/admin/settings",
                    json={"theme_key": "navy_gold"}, headers=_auth(customer_token))
        assert r.status_code == 403


# ---------- Merchant profile new fields ----------
class TestMerchantProfileFields:
    def test_create_carries_new_fields(self, api, approved_merchant):
        r = api.get(f"{BASE_URL}/api/merchants/{approved_merchant['id']}")
        assert r.status_code == 200
        d = r.json()
        assert d["logo_url"] == "https://example.com/logo.png"
        assert d["photo_url"] == "https://example.com/photo.jpg"
        assert d["tv_photo_url"] == "https://example.com/tv.jpg"
        assert d["hours_text"] == "09:00-17:00"
        assert d["is_open"] is True

    def test_update_fields(self, api, approved_merchant, merchant_token):
        # PUT /merchants requires full MerchantIn body (name required)
        full_body = {"name": "TEST_It2_Shop_Upd", "description": "desc", "address": "addr",
                     "logo_url": "https://example.com/l2.png",
                     "photo_url": "https://example.com/photo.jpg",
                     "tv_photo_url": "https://example.com/tv.jpg",
                     "hours_text": "08:00-20:00", "is_open": False}
        r = api.put(f"{BASE_URL}/api/merchants/{approved_merchant['id']}",
                    json=full_body, headers=_auth(merchant_token))
        assert r.status_code == 200, r.text
        r2 = api.get(f"{BASE_URL}/api/merchants/{approved_merchant['id']}")
        d = r2.json()
        assert d["logo_url"] == "https://example.com/l2.png"
        assert d["hours_text"] == "08:00-20:00"
        assert d["is_open"] is False
        # Re-open for queue tests
        full_body["is_open"] = True
        api.put(f"{BASE_URL}/api/merchants/{approved_merchant['id']}",
                json=full_body, headers=_auth(merchant_token))

    def test_closed_merchant_rejects_join(self, api, approved_merchant, merchant_token):
        full_body = {"name": "TEST_It2_Shop_Upd", "description": "desc", "address": "addr",
                     "logo_url": "https://example.com/l2.png",
                     "photo_url": "https://example.com/photo.jpg",
                     "tv_photo_url": "https://example.com/tv.jpg",
                     "hours_text": "08:00-20:00", "is_open": False}
        api.put(f"{BASE_URL}/api/merchants/{approved_merchant['id']}",
                json=full_body, headers=_auth(merchant_token))
        r = api.post(f"{BASE_URL}/api/queue/join",
                     json={"merchant_id": approved_merchant['id'],
                           "category_id": approved_merchant['category_id'],
                           "customer_name": "TEST_Guest"})
        assert r.status_code == 400
        # Re-open
        full_body["is_open"] = True
        api.put(f"{BASE_URL}/api/merchants/{approved_merchant['id']}",
                json=full_body, headers=_auth(merchant_token))


# ---------- Admin Packages + Public Packages ----------
class TestPackages:
    def test_admin_create_package(self, api, admin_token):
        r = api.post(f"{BASE_URL}/api/admin/packages",
                     json={"name": "TEST_Pkg_Basic", "price_idr": 25000,
                           "quota_count": 3, "duration_days": 30, "active": True},
                     headers=_auth(admin_token))
        assert r.status_code == 200, r.text
        d = r.json()
        assert d["name"] == "TEST_Pkg_Basic"
        assert d["quota_count"] == 3
        assert d["price_idr"] == 25000
        TestPackages.pkg_id = d["id"]

    def test_admin_list_packages(self, api, admin_token):
        r = api.get(f"{BASE_URL}/api/admin/packages", headers=_auth(admin_token))
        assert r.status_code == 200
        ids = [p["id"] for p in r.json()]
        assert TestPackages.pkg_id in ids

    def test_public_packages_active_only(self, api):
        r = api.get(f"{BASE_URL}/api/packages")
        assert r.status_code == 200
        for p in r.json():
            assert p.get("active", True) is True

    def test_update_package(self, api, admin_token):
        r = api.put(f"{BASE_URL}/api/admin/packages/{TestPackages.pkg_id}",
                    json={"name": "TEST_Pkg_Basic_v2", "price_idr": 30000,
                          "quota_count": 3, "duration_days": 30, "active": True},
                    headers=_auth(admin_token))
        assert r.status_code == 200
        assert r.json()["name"] == "TEST_Pkg_Basic_v2"
        assert r.json()["price_idr"] == 30000

    def test_non_admin_cannot_create(self, api, customer_token):
        r = api.post(f"{BASE_URL}/api/admin/packages",
                     json={"name": "X", "price_idr": 1,
                           "quota_count": 1, "duration_days": 1, "active": True},
                     headers=_auth(customer_token))
        assert r.status_code == 403


# ---------- Payments + Subscriptions flow ----------
class TestPaymentsSubscriptions:
    def test_create_payment(self, api, customer_token):
        pkg_id = TestPackages.pkg_id
        r = api.post(f"{BASE_URL}/api/payments/create",
                     json={"package_id": pkg_id}, headers=_auth(customer_token))
        assert r.status_code == 200, r.text
        d = r.json()
        assert d["package_id"] == pkg_id
        assert d["amount_idr"] == 30000
        assert d["status"] == "pending"
        TestPaymentsSubscriptions.payment_id = d["id"]

    def test_get_payment(self, api, customer_token):
        r = api.get(f"{BASE_URL}/api/payments/{TestPaymentsSubscriptions.payment_id}",
                    headers=_auth(customer_token))
        assert r.status_code == 200
        assert r.json()["id"] == TestPaymentsSubscriptions.payment_id

    def test_confirm_payment_creates_subscription(self, api, customer_token):
        r = api.post(f"{BASE_URL}/api/payments/{TestPaymentsSubscriptions.payment_id}/confirm",
                     headers=_auth(customer_token))
        assert r.status_code == 200, r.text
        d = r.json()
        assert d["status"] in ("paid", "success", "confirmed", "lunas")

    def test_my_subscriptions_shows_active(self, api, customer_token):
        r = api.get(f"{BASE_URL}/api/subscriptions/mine", headers=_auth(customer_token))
        assert r.status_code == 200
        d = r.json()
        assert "subscriptions" in d and "active" in d
        assert d["active"] is not None
        assert d["active"]["credits_remaining"] == 3
        TestPaymentsSubscriptions.sub_id = d["active"]["id"]

    def test_admin_list_subscriptions(self, api, admin_token):
        r = api.get(f"{BASE_URL}/api/admin/subscriptions", headers=_auth(admin_token))
        assert r.status_code == 200
        ids = [s["id"] for s in r.json()]
        assert TestPaymentsSubscriptions.sub_id in ids

    def test_admin_update_subscription_status(self, api, admin_token):
        r = api.put(f"{BASE_URL}/api/admin/subscriptions/{TestPaymentsSubscriptions.sub_id}",
                    json={"status": "suspended"}, headers=_auth(admin_token))
        assert r.status_code == 200
        assert r.json()["status"] == "suspended"
        # restore
        r2 = api.put(f"{BASE_URL}/api/admin/subscriptions/{TestPaymentsSubscriptions.sub_id}",
                     json={"status": "active"}, headers=_auth(admin_token))
        assert r2.json()["status"] == "active"


# ---------- Quota enforcement on queue/join ----------
class TestQuotaEnforcement:
    def test_customer_without_sub_gets_402(self, api, customer2_token, approved_merchant):
        # customer2 has no subscription, packages exist -> 402
        r = api.post(f"{BASE_URL}/api/queue/join",
                     json={"merchant_id": approved_merchant['id'],
                           "category_id": approved_merchant['category_id']},
                     headers=_auth(customer2_token))
        assert r.status_code == 402, r.text

    def test_guest_allowed_without_sub(self, api, approved_merchant):
        # Guest (no auth) bypasses subscription even when packages exist
        r = api.post(f"{BASE_URL}/api/queue/join",
                     json={"merchant_id": approved_merchant['id'],
                           "category_id": approved_merchant['category_id'],
                           "customer_name": "TEST_GuestOK"})
        assert r.status_code == 200, r.text

    def test_customer_with_sub_join_and_credits_decrement(self, api, customer_token, approved_merchant):
        # Pre: credits_remaining == 3
        r_before = api.get(f"{BASE_URL}/api/subscriptions/mine", headers=_auth(customer_token))
        credits_before = r_before.json()["active"]["credits_remaining"]
        r = api.post(f"{BASE_URL}/api/queue/join",
                     json={"merchant_id": approved_merchant['id'],
                           "category_id": approved_merchant['category_id']},
                     headers=_auth(customer_token))
        assert r.status_code == 200, r.text
        r_after = api.get(f"{BASE_URL}/api/subscriptions/mine", headers=_auth(customer_token))
        credits_after = r_after.json()["active"]["credits_remaining"]
        assert credits_after == credits_before - 1


# ---------- Admin queue-stats ----------
class TestQueueStats:
    def test_queue_stats_shape(self, api, admin_token, approved_merchant):
        r = api.get(f"{BASE_URL}/api/admin/queue-stats", headers=_auth(admin_token))
        assert r.status_code == 200
        data = r.json()
        assert isinstance(data, list)
        # find our merchant
        ours = next((x for x in data if x["merchant_id"] == approved_merchant['id']), None)
        assert ours is not None
        for k in ("waiting", "called", "served_today", "total_today", "name"):
            assert k in ours

    def test_non_admin_forbidden(self, api, customer_token):
        r = api.get(f"{BASE_URL}/api/admin/queue-stats", headers=_auth(customer_token))
        assert r.status_code == 403


# ---------- TV endpoint ----------
class TestTV:
    def test_tv_has_merchant_photos(self, api, approved_merchant):
        r = api.get(f"{BASE_URL}/api/merchants/{approved_merchant['id']}/queue/tv")
        assert r.status_code == 200
        d = r.json()
        assert "merchant" in d
        m = d["merchant"]
        # logo was updated to l2.png in test_update_fields
        assert "logo_url" in m and "photo_url" in m and "tv_photo_url" in m
        assert m["tv_photo_url"] == "https://example.com/tv.jpg"
        assert isinstance(d["upcoming"], list)
        assert isinstance(d["recent_served"], list)
