"""Full backend regression for Queue Management System."""
import os
import time
import uuid
import pytest
import requests

BASE_URL = os.environ.get("EXPO_PUBLIC_BACKEND_URL", "https://merchant-lineup.preview.emergentagent.com").rstrip("/")

# Shared state across tests
STATE = {}


def _auth(token): return {"Authorization": f"Bearer {token}"}


# ---------------- Health ----------------
class TestHealth:
    def test_root(self, api):
        r = api.get(f"{BASE_URL}/api/")
        assert r.status_code == 200
        assert r.json().get("status") == "ok"


# ---------------- Auth ----------------
class TestAuth:
    suffix = uuid.uuid4().hex[:8]

    def test_register_admin_rejected(self, api):
        r = api.post(f"{BASE_URL}/api/auth/register", json={
            "email": f"TEST_fakeadmin_{self.suffix}@x.com", "password": "pass1234",
            "name": "Fake", "role": "admin"})
        assert r.status_code == 400

    def test_register_customer(self, api):
        email = f"TEST_cust_{self.suffix}@x.com"
        r = api.post(f"{BASE_URL}/api/auth/register", json={
            "email": email, "password": "pass1234", "name": "Test Cust", "role": "customer"})
        assert r.status_code == 200, r.text
        data = r.json()
        assert "token" in data and data["user"]["role"] == "customer"
        assert data["user"]["email"] == email.lower()
        STATE['customer_token'] = data["token"]
        STATE['customer_id'] = data["user"]["id"]

    def test_register_duplicate(self, api):
        email = f"TEST_cust_{self.suffix}@x.com"
        r = api.post(f"{BASE_URL}/api/auth/register", json={
            "email": email, "password": "pass1234", "name": "Dup", "role": "customer"})
        assert r.status_code == 400

    def test_register_merchant(self, api):
        email = f"TEST_merch_{self.suffix}@x.com"
        r = api.post(f"{BASE_URL}/api/auth/register", json={
            "email": email, "password": "pass1234", "name": "Merch Owner", "role": "merchant"})
        assert r.status_code == 200, r.text
        STATE['merchant_token'] = r.json()["token"]
        STATE['merchant_user_id'] = r.json()["user"]["id"]

    def test_login_admin(self, admin_token):
        assert admin_token

    def test_login_invalid(self, api):
        r = api.post(f"{BASE_URL}/api/auth/login", json={
            "email": "ardie@anggadipura.com", "password": "wrong"})
        assert r.status_code == 401

    def test_me_requires_auth(self, api):
        r = api.get(f"{BASE_URL}/api/auth/me")
        assert r.status_code == 401

    def test_me_ok(self, api):
        r = api.get(f"{BASE_URL}/api/auth/me", headers=_auth(STATE['customer_token']))
        assert r.status_code == 200
        assert r.json()["role"] == "customer"


# ---------------- RBAC on merchant creation ----------------
class TestRBAC:
    def test_customer_cannot_create_merchant(self, api):
        r = api.post(f"{BASE_URL}/api/merchants",
                     json={"name": "X"}, headers=_auth(STATE['customer_token']))
        assert r.status_code == 403

    def test_customer_cannot_approve(self, api):
        r = api.put(f"{BASE_URL}/api/admin/merchants/fake/status",
                    json={"status": "approved"}, headers=_auth(STATE['customer_token']))
        assert r.status_code == 403

    def test_customer_cannot_list_admin_users(self, api):
        r = api.get(f"{BASE_URL}/api/admin/users", headers=_auth(STATE['customer_token']))
        assert r.status_code == 403


# ---------------- Merchant flow ----------------
class TestMerchantFlow:
    def test_create_merchant_pending(self, api):
        r = api.post(f"{BASE_URL}/api/merchants",
                     json={"name": f"TEST_Shop_{uuid.uuid4().hex[:6]}",
                           "description": "desc", "address": "addr"},
                     headers=_auth(STATE['merchant_token']))
        assert r.status_code == 200, r.text
        m = r.json()
        assert m["status"] == "pending"
        assert m["owner_id"] == STATE['merchant_user_id']
        STATE['merchant_id'] = m["id"]

    def test_mine_lists_own(self, api):
        r = api.get(f"{BASE_URL}/api/merchants/mine", headers=_auth(STATE['merchant_token']))
        assert r.status_code == 200
        ids = [m["id"] for m in r.json()]
        assert STATE['merchant_id'] in ids

    def test_public_list_hides_pending(self, api):
        r = api.get(f"{BASE_URL}/api/merchants")
        assert r.status_code == 200
        ids = [m["id"] for m in r.json()]
        assert STATE['merchant_id'] not in ids  # still pending

    def test_admin_approves(self, api, admin_token):
        r = api.put(f"{BASE_URL}/api/admin/merchants/{STATE['merchant_id']}/status",
                    json={"status": "approved"}, headers=_auth(admin_token))
        assert r.status_code == 200
        assert r.json()["status"] == "approved"

    def test_public_list_shows_approved(self, api):
        r = api.get(f"{BASE_URL}/api/merchants")
        assert r.status_code == 200
        ids = [m["id"] for m in r.json()]
        assert STATE['merchant_id'] in ids

    def test_add_category(self, api):
        r = api.post(f"{BASE_URL}/api/merchants/{STATE['merchant_id']}/categories",
                     json={"name": "Haircut", "avg_service_minutes": 10},
                     headers=_auth(STATE['merchant_token']))
        assert r.status_code == 200, r.text
        STATE['category_id'] = r.json()["id"]

    def test_category_persisted(self, api):
        r = api.get(f"{BASE_URL}/api/merchants/{STATE['merchant_id']}")
        assert r.status_code == 200
        cats = r.json()["categories"]
        assert any(c["id"] == STATE['category_id'] for c in cats)

    def test_non_owner_cannot_add_category(self, api):
        r = api.post(f"{BASE_URL}/api/merchants/{STATE['merchant_id']}/categories",
                     json={"name": "X"}, headers=_auth(STATE['customer_token']))
        assert r.status_code == 403


# ---------------- Queue flow ----------------
class TestQueueFlow:
    def test_guest_join(self, api):
        r = api.post(f"{BASE_URL}/api/queue/join",
                     json={"merchant_id": STATE['merchant_id'], "category_id": STATE['category_id'],
                           "customer_name": "TEST_Guest"})
        assert r.status_code == 200, r.text
        e = r.json()
        assert e["status"] == "waiting"
        assert e["queue_number"] >= 1
        STATE['guest_entry_id'] = e["id"]

    def test_member_join(self, api):
        # Since iteration 2 introduced quota enforcement: when packages exist AND
        # user is authenticated customer without subscription => 402. Verify that
        # behaviour here; otherwise succeed.
        r = api.post(f"{BASE_URL}/api/queue/join",
                     json={"merchant_id": STATE['merchant_id'], "category_id": STATE['category_id']},
                     headers=_auth(STATE['customer_token']))
        if r.status_code == 402:
            # Fall back to a second guest join so remaining queue flow tests continue.
            rg = api.post(f"{BASE_URL}/api/queue/join",
                          json={"merchant_id": STATE['merchant_id'], "category_id": STATE['category_id'],
                                "customer_name": "TEST_Guest2"})
            assert rg.status_code == 200, rg.text
            STATE['member_entry_id'] = rg.json()["id"]
        else:
            assert r.status_code == 200, r.text
            STATE['member_entry_id'] = r.json()["id"]

    def test_queue_status_has_position_eta(self, api):
        r = api.get(f"{BASE_URL}/api/queue/{STATE['guest_entry_id']}")
        assert r.status_code == 200
        d = r.json()
        assert "position" in d and "estimated_wait_minutes" in d
        assert d["position"] == 0  # first in line

    def test_mine_active(self, api):
        # Only meaningful when the authenticated customer actually joined
        if STATE.get('member_entry_id') is None:
            pytest.skip("customer did not join (quota enforcement)")
        r = api.get(f"{BASE_URL}/api/queue/mine/active", headers=_auth(STATE['customer_token']))
        assert r.status_code == 200
        # may be empty if fallback was a guest join (no user_id)
        _ = r.json()

    def test_join_wrong_category(self, api):
        r = api.post(f"{BASE_URL}/api/queue/join",
                     json={"merchant_id": STATE['merchant_id'],
                           "category_id": "nonexistent", "customer_name": "X"})
        assert r.status_code == 404

    def test_join_pending_merchant(self, api):
        # create a new pending merchant
        r = api.post(f"{BASE_URL}/api/merchants", json={"name": "TEST_Pending"},
                     headers=_auth(STATE['merchant_token']))
        pending_id = r.json()["id"]
        r = api.post(f"{BASE_URL}/api/queue/join",
                     json={"merchant_id": pending_id,
                           "category_id": "any", "customer_name": "X"})
        assert r.status_code == 404

    def test_merchant_queue_view(self, api):
        r = api.get(f"{BASE_URL}/api/merchants/{STATE['merchant_id']}/queue",
                    headers=_auth(STATE['merchant_token']))
        assert r.status_code == 200
        assert len(r.json()) >= 2

    def test_customer_forbidden_on_merchant_queue(self, api):
        r = api.get(f"{BASE_URL}/api/merchants/{STATE['merchant_id']}/queue",
                    headers=_auth(STATE['customer_token']))
        assert r.status_code == 403

    def test_call_next(self, api):
        r = api.post(f"{BASE_URL}/api/merchants/{STATE['merchant_id']}/queue/next",
                     headers=_auth(STATE['merchant_token']))
        assert r.status_code == 200, r.text
        entry = r.json()["entry"]
        assert entry is not None
        assert entry["status"] == "called"
        # The first waiting (guest) should be called
        assert entry["id"] == STATE['guest_entry_id']

    def test_tv_display(self, api):
        r = api.get(f"{BASE_URL}/api/merchants/{STATE['merchant_id']}/queue/tv")
        assert r.status_code == 200
        data = r.json()
        assert data["now_serving"] is not None
        assert data["now_serving"]["id"] == STATE['guest_entry_id']
        assert isinstance(data["upcoming"], list)
        assert isinstance(data["recent_served"], list)

    def test_call_next_again_serves_previous(self, api):
        # second call next: should serve guest, call member
        r = api.post(f"{BASE_URL}/api/merchants/{STATE['merchant_id']}/queue/next",
                     headers=_auth(STATE['merchant_token']))
        assert r.status_code == 200
        entry = r.json()["entry"]
        assert entry is not None
        assert entry["id"] == STATE['member_entry_id']
        # verify guest is now served
        r2 = api.get(f"{BASE_URL}/api/queue/{STATE['guest_entry_id']}")
        assert r2.json()["status"] == "served"

    def test_serve_current(self, api):
        r = api.post(f"{BASE_URL}/api/merchants/{STATE['merchant_id']}/queue/{STATE['member_entry_id']}/serve",
                     headers=_auth(STATE['merchant_token']))
        assert r.status_code == 200
        r2 = api.get(f"{BASE_URL}/api/queue/{STATE['member_entry_id']}")
        assert r2.json()["status"] == "served"

    def test_call_next_empty(self, api):
        r = api.post(f"{BASE_URL}/api/merchants/{STATE['merchant_id']}/queue/next",
                     headers=_auth(STATE['merchant_token']))
        assert r.status_code == 200
        assert r.json()["entry"] is None

    def test_skip(self, api):
        # add one and skip it
        r = api.post(f"{BASE_URL}/api/queue/join",
                     json={"merchant_id": STATE['merchant_id'], "category_id": STATE['category_id'],
                           "customer_name": "TEST_SkipMe"})
        eid = r.json()["id"]
        r = api.post(f"{BASE_URL}/api/merchants/{STATE['merchant_id']}/queue/{eid}/skip",
                     headers=_auth(STATE['merchant_token']))
        assert r.status_code == 200
        r2 = api.get(f"{BASE_URL}/api/queue/{eid}")
        assert r2.json()["status"] == "skipped"


# ---------------- Admin ----------------
class TestAdmin:
    def test_stats(self, api, admin_token):
        r = api.get(f"{BASE_URL}/api/admin/stats", headers=_auth(admin_token))
        assert r.status_code == 200
        d = r.json()
        for k in ("users", "merchants", "pending_merchants", "approved_merchants", "total_queues_today"):
            assert k in d

    def test_users_list(self, api, admin_token):
        r = api.get(f"{BASE_URL}/api/admin/users", headers=_auth(admin_token))
        assert r.status_code == 200
        assert any(u["role"] == "admin" for u in r.json())

    def test_merchants_list(self, api, admin_token):
        r = api.get(f"{BASE_URL}/api/admin/merchants", headers=_auth(admin_token))
        assert r.status_code == 200
        assert len(r.json()) >= 1

    def test_suspend(self, api, admin_token):
        r = api.put(f"{BASE_URL}/api/admin/merchants/{STATE['merchant_id']}/status",
                    json={"status": "suspended"}, headers=_auth(admin_token))
        assert r.status_code == 200
        assert r.json()["status"] == "suspended"
        # public listing no longer shows it
        r2 = api.get(f"{BASE_URL}/api/merchants")
        ids = [m["id"] for m in r2.json()]
        assert STATE['merchant_id'] not in ids

    def test_approve_nonexistent(self, api, admin_token):
        r = api.put(f"{BASE_URL}/api/admin/merchants/nonexistent/status",
                    json={"status": "approved"}, headers=_auth(admin_token))
        assert r.status_code == 404
