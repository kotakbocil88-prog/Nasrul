"""Backend API tests for Sistem Kebun LSU."""
import io
import os
import pytest
import requests
import openpyxl

def _load_frontend_env():
    p = os.path.join(os.path.dirname(__file__), '..', '..', 'frontend', '.env')
    try:
        with open(p) as f:
            for line in f:
                if line.startswith('REACT_APP_BACKEND_URL='):
                    return line.split('=', 1)[1].strip()
    except FileNotFoundError:
        pass
    return None


BASE_URL = (os.environ.get('REACT_APP_BACKEND_URL') or _load_frontend_env()).rstrip('/')
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

    def test_update_record(self, auth_session):
        rid = TestRecords.created_ids[0]
        payload = {"kebun": "TEST_Kebun_A2", "afdeling": "OB", "blok": "B02",
                   "code_lsu": "TEST-002", "koord_x": 1.0, "koord_y": 2.0}
        r = auth_session.put(f"{API}/records/{rid}", json=payload)
        assert r.status_code == 200
        assert r.json()["kebun"] == "TEST_Kebun_A2"
        r2 = auth_session.get(f"{API}/records")
        rec = next(x for x in r2.json() if x["_id"] == rid)
        assert rec["kebun"] == "TEST_Kebun_A2"

    def test_delete_record(self, auth_session):
        rid = TestRecords.created_ids[0]
        r = auth_session.delete(f"{API}/records/{rid}")
        assert r.status_code == 200


# ---- Excel: preview + confirm two-step
class TestExcelImport:
    def _make_xlsx(self, rows):
        wb = openpyxl.Workbook()
        ws = wb.active
        ws.append(["Kebun", "Afdeling", "Blok", "Code_LSU", "Koord_X", "Koord_Y"])
        for r in rows:
            ws.append(r)
        buf = io.BytesIO()
        wb.save(buf)
        buf.seek(0)
        return buf.getvalue()

    def test_template_download(self, auth_session):
        r = auth_session.get(f"{API}/records/template")
        assert r.status_code == 200
        assert "spreadsheet" in r.headers.get("content-type", "")

    def test_import_preview_does_not_insert(self, auth_session):
        content = self._make_xlsx([
            ["TEST_ImpK", "OA", "IB1", "TEST-IMP-1", 100.1, -1.1],
            ["TEST_ImpK", "OB", "IB2", "TEST-IMP-2", 100.2, -1.2],
        ])
        before = len(auth_session.get(f"{API}/records").json())
        s = requests.Session()
        s.cookies.update(auth_session.cookies)
        r = s.post(f"{API}/records/import/preview",
                   files={"file": ("t.xlsx", content,
                                   "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet")})
        assert r.status_code == 200, r.text
        d = r.json()
        assert d["count"] == 2
        assert len(d["rows"]) == 2
        assert d["rows"][0]["kebun"] == "TEST_ImpK"
        # verify not inserted
        after = len(auth_session.get(f"{API}/records").json())
        assert after == before, "preview should not insert rows"

    def test_import_confirm_inserts(self, auth_session):
        rows = [
            {"kebun": "TEST_ImpK", "afdeling": "OA", "blok": "IB1", "code_lsu": "TEST-IMP-1", "koord_x": 100.1, "koord_y": -1.1},
            {"kebun": "TEST_ImpK", "afdeling": "OB", "blok": "IB2", "code_lsu": "TEST-IMP-2", "koord_x": 100.2, "koord_y": -1.2},
        ]
        r = auth_session.post(f"{API}/records/import/confirm", json={"rows": rows})
        assert r.status_code == 200, r.text
        assert r.json()["inserted"] == 2
        listed = auth_session.get(f"{API}/records").json()
        assert any(x["code_lsu"] == "TEST-IMP-1" for x in listed)


# ---- PDF exports (GET all + POST selected)
class TestPDFExports:
    def test_export_labels_all_get(self, auth_session):
        r = auth_session.get(f"{API}/records/export/labels")
        assert r.status_code == 200
        assert r.headers.get("content-type", "").startswith("application/pdf")
        assert r.content[:4] == b"%PDF"

    def test_export_table_all_get(self, auth_session):
        r = auth_session.get(f"{API}/records/export/table")
        assert r.status_code == 200
        assert r.content[:4] == b"%PDF"

    def test_export_labels_selected_post(self, auth_session):
        listed = auth_session.get(f"{API}/records").json()
        assert listed, "need records to test selected export"
        ids = [x["_id"] for x in listed[:2]]
        r = auth_session.post(f"{API}/records/export/labels", json={"ids": ids})
        assert r.status_code == 200
        assert r.headers.get("content-type", "").startswith("application/pdf")
        assert r.content[:4] == b"%PDF"

    def test_export_table_selected_post(self, auth_session):
        listed = auth_session.get(f"{API}/records").json()
        ids = [x["_id"] for x in listed[:1]]
        r = auth_session.post(f"{API}/records/export/table", json={"ids": ids})
        assert r.status_code == 200
        assert r.content[:4] == b"%PDF"

    def test_export_labels_empty_ids(self, auth_session):
        r = auth_session.post(f"{API}/records/export/labels", json={"ids": []})
        # empty ids -> fetch all (per _fetch_docs)
        assert r.status_code == 200
        assert r.content[:4] == b"%PDF"


# ---- Cleanup
def test_zz_cleanup(auth_session):
    r = auth_session.get(f"{API}/records")
    for rec in r.json():
        if rec.get("kebun", "").startswith("TEST_") or rec.get("code_lsu", "").startswith("TEST-"):
            auth_session.delete(f"{API}/records/{rec['_id']}")
