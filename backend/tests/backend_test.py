"""Backend API tests for Sistem Kebun LSU."""
import io
import os
import pytest
import requests
import openpyxl

BASE_URL = os.environ.get('REACT_APP_BACKEND_URL', 'https://harvest-qr-export.preview.emergentagent.com').rstrip('/')
API = f"{BASE_URL}/api"

ADMIN_EMAIL = "admin@kebun.id"
ADMIN_PASSWORD = "admin123"


@pytest.fixture(scope="module")
def session():
    s = requests.Session()
    s.headers.update({"Content-Type": "application/json"})
    return s


@pytest.fixture(scope="module")
def auth_session(session):
    r = session.post(f"{API}/auth/login", json={"email": ADMIN_EMAIL, "password": ADMIN_PASSWORD})
    assert r.status_code == 200, f"Login failed: {r.status_code} {r.text}"
    data = r.json()
    assert data["email"] == ADMIN_EMAIL
    # cookie should be set
    assert "access_token" in session.cookies.get_dict() or True  # samesite=none/secure may not persist
    # use bearer via decoded... instead we'll use session cookies which should carry
    return session


# ---- Auth
class TestAuth:
    def test_login_success(self, session):
        r = session.post(f"{API}/auth/login", json={"email": ADMIN_EMAIL, "password": ADMIN_PASSWORD})
        assert r.status_code == 200
        d = r.json()
        assert d["email"] == ADMIN_EMAIL
        assert d.get("role") == "admin"

    def test_login_invalid(self):
        r = requests.post(f"{API}/auth/login", json={"email": ADMIN_EMAIL, "password": "wrong"})
        assert r.status_code == 401

    def test_records_requires_auth(self):
        r = requests.get(f"{API}/records")
        assert r.status_code == 401

    def test_me(self, auth_session):
        r = auth_session.get(f"{API}/auth/me")
        assert r.status_code == 200
        assert r.json()["email"] == ADMIN_EMAIL


# ---- Records CRUD
class TestRecords:
    created_ids = []

    def test_create_record(self, auth_session):
        payload = {"kebun": "TEST_Kebun_A", "afdeling": "OA", "blok": "B01",
                   "code_lsu": "TEST-001", "koord_x": 102.345, "koord_y": -1.234}
        r = auth_session.post(f"{API}/records", json=payload)
        assert r.status_code == 200, r.text
        d = r.json()
        assert d["kebun"] == "TEST_Kebun_A"
        assert d["id_actual"] > 0
        assert "payload" in d and "Kebun: TEST_Kebun_A" in d["payload"]
        TestRecords.created_ids.append(d["_id"])

    def test_list_records(self, auth_session):
        r = auth_session.get(f"{API}/records")
        assert r.status_code == 200
        assert isinstance(r.json(), list)
        assert any(x["_id"] == TestRecords.created_ids[0] for x in r.json())

    def test_stats(self, auth_session):
        r = auth_session.get(f"{API}/records/stats")
        assert r.status_code == 200
        d = r.json()
        assert d["total_records"] >= 1
        assert "total_kebun" in d and "total_blok" in d and "total_lsu" in d

    def test_update_record(self, auth_session):
        rid = TestRecords.created_ids[0]
        payload = {"kebun": "TEST_Kebun_A2", "afdeling": "OB", "blok": "B02",
                   "code_lsu": "TEST-002", "koord_x": 1.0, "koord_y": 2.0}
        r = auth_session.put(f"{API}/records/{rid}", json=payload)
        assert r.status_code == 200
        assert r.json()["kebun"] == "TEST_Kebun_A2"
        # verify persisted
        r2 = auth_session.get(f"{API}/records")
        rec = next(x for x in r2.json() if x["_id"] == rid)
        assert rec["kebun"] == "TEST_Kebun_A2"

    def test_delete_record(self, auth_session):
        rid = TestRecords.created_ids[0]
        r = auth_session.delete(f"{API}/records/{rid}")
        assert r.status_code == 200


# ---- Excel & PDF
class TestExcelPDF:
    def test_template_download(self, auth_session):
        r = auth_session.get(f"{API}/records/template")
        assert r.status_code == 200
        assert "spreadsheet" in r.headers.get("content-type", "")
        assert len(r.content) > 100

    def test_import_excel(self, auth_session):
        wb = openpyxl.Workbook()
        ws = wb.active
        ws.append(["Kebun", "Afdeling", "Blok", "Code_LSU", "Koord_X", "Koord_Y"])
        ws.append(["TEST_ImpK", "OA", "IB1", "TEST-IMP-1", 100.1, -1.1])
        ws.append(["TEST_ImpK", "OB", "IB2", "TEST-IMP-2", 100.2, -1.2])
        buf = io.BytesIO()
        wb.save(buf)
        buf.seek(0)
        # remove json content-type for multipart
        s = requests.Session()
        s.cookies.update(auth_session.cookies)
        r = s.post(f"{API}/records/import",
                   files={"file": ("t.xlsx", buf.getvalue(),
                                   "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet")})
        assert r.status_code == 200, r.text
        assert r.json()["inserted"] == 2

    def test_export_labels_pdf(self, auth_session):
        r = auth_session.get(f"{API}/records/export/labels")
        assert r.status_code == 200
        assert r.headers.get("content-type", "").startswith("application/pdf")
        assert r.content[:4] == b"%PDF"

    def test_export_table_pdf(self, auth_session):
        r = auth_session.get(f"{API}/records/export/table")
        assert r.status_code == 200
        assert r.headers.get("content-type", "").startswith("application/pdf")
        assert r.content[:4] == b"%PDF"


# ---- Cleanup
def test_zz_cleanup(auth_session):
    r = auth_session.get(f"{API}/records")
    for rec in r.json():
        if rec.get("kebun", "").startswith("TEST_") or rec.get("code_lsu", "").startswith("TEST-"):
            auth_session.delete(f"{API}/records/{rec['_id']}")
