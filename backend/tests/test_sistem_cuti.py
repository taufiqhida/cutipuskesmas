"""Comprehensive backend tests for Sistem Cuti UPTD Puskesmas Bugangan."""
import os
import uuid
import pytest
import requests
from datetime import date, timedelta

BASE_URL = os.environ.get("REACT_APP_BACKEND_URL", "https://employee-leave-9.preview.emergentagent.com").rstrip("/")
API = f"{BASE_URL}/api"

ADMIN = {"email": "admin@puskesmas-bugangan.go.id", "password": "admin123"}
KEPALA = {"email": "kepala@puskesmas-bugangan.go.id", "password": "kepala123"}
PEGAWAI = {"email": "tedy@puskesmas-bugangan.go.id", "password": "pegawai123"}


def login(creds):
    r = requests.post(f"{API}/auth/login", json=creds, timeout=20)
    assert r.status_code == 200, f"login failed {creds['email']}: {r.status_code} {r.text}"
    data = r.json()
    assert "access_token" in data and "user" in data
    return data


def auth_headers(token):
    return {"Authorization": f"Bearer {token}"}


# ---------------- Auth ----------------
class TestAuth:
    def test_admin_login(self):
        d = login(ADMIN)
        assert d["user"]["role"] == "admin"
        assert d["token_type"] == "bearer"

    def test_kepala_login(self):
        d = login(KEPALA)
        assert d["user"]["role"] == "kepala"

    def test_pegawai_login(self):
        d = login(PEGAWAI)
        assert d["user"]["role"] == "pegawai"

    def test_invalid_login(self):
        r = requests.post(f"{API}/auth/login", json={"email": "x@x.com", "password": "bad"}, timeout=10)
        assert r.status_code == 401

    def test_me(self):
        tok = login(ADMIN)["access_token"]
        r = requests.get(f"{API}/auth/me", headers=auth_headers(tok), timeout=10)
        assert r.status_code == 200
        body = r.json()
        assert body["email"] == ADMIN["email"]
        assert "password_hash" not in body
        assert "_id" not in body

    def test_me_no_token(self):
        r = requests.get(f"{API}/auth/me", timeout=10)
        assert r.status_code == 401


# ---------------- User CRUD (admin) ----------------
class TestUsers:
    def setup_method(self):
        self.tok = login(ADMIN)["access_token"]
        self.h = auth_headers(self.tok)
        self.created_id = None

    def teardown_method(self):
        if self.created_id:
            try:
                requests.delete(f"{API}/users/{self.created_id}", headers=self.h, timeout=10)
            except Exception:
                pass

    def test_list_users_admin(self):
        r = requests.get(f"{API}/users", headers=self.h, timeout=10)
        assert r.status_code == 200
        users = r.json()
        emails = [u["email"] for u in users]
        assert ADMIN["email"] in emails
        assert KEPALA["email"] in emails
        assert PEGAWAI["email"] in emails
        # ensure no _id, no password_hash leak
        for u in users:
            assert "_id" not in u
            assert "password_hash" not in u

    def test_list_users_forbidden_for_pegawai(self):
        tok = login(PEGAWAI)["access_token"]
        r = requests.get(f"{API}/users", headers=auth_headers(tok), timeout=10)
        assert r.status_code == 403

    def test_create_update_delete_user(self):
        email = f"test_{uuid.uuid4().hex[:8]}@example.com"
        payload = {
            "email": email,
            "password": "secret123",
            "name": "TEST User",
            "nik": "1234567890",
            "jabatan": "Staf",
            "masa_kerja_tahun": 1,
            "masa_kerja_bulan": 2,
            "alamat": "Jl. Test",
            "telepon": "0811",
            "role": "pegawai",
            "signature_base64": "data:image/png;base64,iVBORw0KGgo=",
            "balances": {
                "cuti_tahunan": 5, "cuti_besar": 0, "cuti_sakit": 12,
                "cuti_melahirkan": 90, "cuti_alasan_penting": 30, "cuti_luar_tanggungan": 0
            },
        }
        r = requests.post(f"{API}/users", headers=self.h, json=payload, timeout=10)
        assert r.status_code == 200, r.text
        user = r.json()
        assert user["email"] == email
        assert user["balances"]["cuti_tahunan"] == 5
        assert "password_hash" not in user
        self.created_id = user["id"]

        # verify persistence via list
        r2 = requests.get(f"{API}/users", headers=self.h, timeout=10)
        assert any(u["id"] == self.created_id for u in r2.json())

        # update
        r3 = requests.put(f"{API}/users/{self.created_id}", headers=self.h,
                          json={"name": "TEST Updated", "balances": {
                              "cuti_tahunan": 3, "cuti_besar": 0, "cuti_sakit": 12,
                              "cuti_melahirkan": 90, "cuti_alasan_penting": 30, "cuti_luar_tanggungan": 0
                          }}, timeout=10)
        assert r3.status_code == 200
        assert r3.json()["name"] == "TEST Updated"
        assert r3.json()["balances"]["cuti_tahunan"] == 3

        # delete
        r4 = requests.delete(f"{API}/users/{self.created_id}", headers=self.h, timeout=10)
        assert r4.status_code == 200
        self.created_id = None

    def test_cannot_delete_self(self):
        me = requests.get(f"{API}/auth/me", headers=self.h, timeout=10).json()
        r = requests.delete(f"{API}/users/{me['id']}", headers=self.h, timeout=10)
        assert r.status_code == 400

    def test_duplicate_email_rejected(self):
        r = requests.post(f"{API}/users", headers=self.h, json={
            "email": ADMIN["email"], "password": "x", "name": "x", "jabatan": "x"
        }, timeout=10)
        assert r.status_code == 400


# ---------------- Leave request flow ----------------
class TestLeaveFlow:
    @pytest.fixture(scope="class")
    def tokens(self):
        return {
            "admin": login(ADMIN)["access_token"],
            "kepala": login(KEPALA)["access_token"],
            "pegawai": login(PEGAWAI)["access_token"],
        }

    @pytest.fixture(scope="class")
    def pegawai_user(self, tokens):
        # Create a fresh pegawai user via admin to control balance & avoid polluting shared seed
        ah = auth_headers(tokens["admin"])
        email = f"test_peg_{uuid.uuid4().hex[:8]}@example.com"
        payload = {
            "email": email, "password": "pegawai123", "name": "TEST Pegawai LR",
            "nik": "9999", "jabatan": "Staf", "role": "pegawai",
            "balances": {"cuti_tahunan": 10, "cuti_besar": 0, "cuti_sakit": 12,
                         "cuti_melahirkan": 90, "cuti_alasan_penting": 30, "cuti_luar_tanggungan": 0}
        }
        r = requests.post(f"{API}/users", headers=ah, json=payload, timeout=10)
        assert r.status_code == 200, r.text
        user = r.json()
        login_d = login({"email": email, "password": "pegawai123"})
        yield {"id": user["id"], "email": email, "token": login_d["access_token"]}
        # cleanup
        requests.delete(f"{API}/users/{user['id']}", headers=ah, timeout=10)

    def test_create_leave_request_and_balance_check(self, tokens, pegawai_user):
        ph = auth_headers(pegawai_user["token"])
        start = (date.today() + timedelta(days=10)).isoformat()
        end = (date.today() + timedelta(days=12)).isoformat()  # 3 days inclusive
        r = requests.post(f"{API}/leave-requests", headers=ph, json={
            "jenis_cuti": "cuti_tahunan",
            "alasan": "Keperluan keluarga",
            "tanggal_mulai": start,
            "tanggal_selesai": end,
            "alamat_selama_cuti": "Jl. Test 1",
            "telepon_selama_cuti": "0811"
        }, timeout=15)
        assert r.status_code == 200, r.text
        body = r.json()
        assert body["lamanya"] == 3
        assert body["status"] == "menunggu"
        assert body["form_no"].startswith("B/")
        assert "verify_token" in body and len(body["verify_token"]) > 5
        assert "_id" not in body
        pegawai_user["request_id"] = body["id"]
        pegawai_user["verify_token"] = body["verify_token"]

    def test_balance_insufficient_rejected(self, pegawai_user):
        ph = auth_headers(pegawai_user["token"])
        start = (date.today() + timedelta(days=30)).isoformat()
        end = (date.today() + timedelta(days=60)).isoformat()  # 31 days > 10 balance
        r = requests.post(f"{API}/leave-requests", headers=ph, json={
            "jenis_cuti": "cuti_tahunan", "alasan": "Long trip",
            "tanggal_mulai": start, "tanggal_selesai": end,
            "alamat_selama_cuti": "x", "telepon_selama_cuti": "0811"
        }, timeout=10)
        assert r.status_code == 400
        assert "tidak mencukupi" in r.text.lower() or "sisa" in r.text.lower()

    def test_invalid_date_range(self, pegawai_user):
        ph = auth_headers(pegawai_user["token"])
        r = requests.post(f"{API}/leave-requests", headers=ph, json={
            "jenis_cuti": "cuti_tahunan", "alasan": "x",
            "tanggal_mulai": "2026-02-10", "tanggal_selesai": "2026-02-05",
            "alamat_selama_cuti": "x", "telepon_selama_cuti": "0811"
        }, timeout=10)
        assert r.status_code == 400

    def test_scope_mine(self, pegawai_user):
        ph = auth_headers(pegawai_user["token"])
        r = requests.get(f"{API}/leave-requests?scope=mine", headers=ph, timeout=10)
        assert r.status_code == 200
        rows = r.json()
        assert len(rows) >= 1
        assert all(row["user_id"] == pegawai_user["id"] for row in rows)
        # sorted desc by created_at
        if len(rows) >= 2:
            assert rows[0]["created_at"] >= rows[1]["created_at"]

    def test_scope_pending_kepala(self, tokens):
        kh = auth_headers(tokens["kepala"])
        r = requests.get(f"{API}/leave-requests?scope=pending", headers=kh, timeout=10)
        assert r.status_code == 200
        rows = r.json()
        assert all(row["status"] == "menunggu" for row in rows)

    def test_scope_pending_forbidden_pegawai(self, pegawai_user):
        ph = auth_headers(pegawai_user["token"])
        r = requests.get(f"{API}/leave-requests?scope=pending", headers=ph, timeout=10)
        assert r.status_code == 403

    def test_decide_approves_and_deducts_balance(self, tokens, pegawai_user):
        kh = auth_headers(tokens["kepala"])
        ah = auth_headers(tokens["admin"])
        req_id = pegawai_user["request_id"]

        # balance before
        users = requests.get(f"{API}/users", headers=ah, timeout=10).json()
        before = next(u for u in users if u["id"] == pegawai_user["id"])["balances"]["cuti_tahunan"]
        assert before == 10

        r = requests.post(f"{API}/leave-requests/{req_id}/decide", headers=kh,
                          json={"decision": "disetujui", "pesan": "OK"}, timeout=10)
        assert r.status_code == 200, r.text
        body = r.json()
        assert body["status"] == "disetujui"
        assert body["pesan_kepala"] == "OK"
        assert body["approved_by_name"]

        users = requests.get(f"{API}/users", headers=ah, timeout=10).json()
        after = next(u for u in users if u["id"] == pegawai_user["id"])["balances"]["cuti_tahunan"]
        assert after == before - 3, f"expected {before-3}, got {after}"

    def test_decide_reject_already_decided(self, tokens, pegawai_user):
        kh = auth_headers(tokens["kepala"])
        r = requests.post(f"{API}/leave-requests/{pegawai_user['request_id']}/decide",
                          headers=kh, json={"decision": "disetujui"}, timeout=10)
        assert r.status_code == 400

    def test_decide_forbidden_pegawai(self, pegawai_user):
        ph = auth_headers(pegawai_user["token"])
        r = requests.post(f"{API}/leave-requests/{pegawai_user['request_id']}/decide",
                          headers=ph, json={"decision": "disetujui"}, timeout=10)
        assert r.status_code == 403

    def test_pdf_export(self, pegawai_user):
        ph = auth_headers(pegawai_user["token"])
        r = requests.get(f"{API}/leave-requests/{pegawai_user['request_id']}/pdf",
                         headers=ph, timeout=30)
        assert r.status_code == 200
        assert "application/pdf" in r.headers.get("content-type", "").lower()
        assert len(r.content) > 1000
        assert r.content[:4] == b"%PDF"

    def test_public_verify_valid(self, pegawai_user):
        r = requests.get(f"{API}/verify/{pegawai_user['verify_token']}", timeout=10)
        assert r.status_code == 200
        body = r.json()
        assert body["valid"] is True
        assert body["status"] == "disetujui"
        assert body["pegawai_name"] == "TEST Pegawai LR"
        assert body["lamanya"] == 3

    def test_public_verify_invalid(self):
        r = requests.get(f"{API}/verify/nonexistent_token_xyz", timeout=10)
        assert r.status_code == 200
        assert r.json()["valid"] is False
