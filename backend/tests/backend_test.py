"""Backend tests for QC Estate Audit."""
import os
import uuid
import base64
import pytest
import requests

BASE_URL = os.environ.get("EXPO_PUBLIC_BACKEND_URL", "https://kotakbocil-tools.preview.emergentagent.com").rstrip("/")
API = f"{BASE_URL}/api"

# 1x1 transparent PNG base64
PNG_B64 = (
    "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNkYAAAAAYAAjCB0C8AAAAASUVORK5CYII="
)


@pytest.fixture(scope="session")
def creds():
    rnd = uuid.uuid4().hex[:8]
    return {"email": f"qc.tester+{rnd}@estate.com", "password": "secret123", "name": "QC Tester"}


@pytest.fixture(scope="session")
def token(creds):
    # Register
    r = requests.post(f"{API}/auth/register", json=creds, timeout=30)
    assert r.status_code == 200, f"register failed: {r.status_code} {r.text}"
    body = r.json()
    assert "access_token" in body and body["user"]["email"] == creds["email"]
    return body["access_token"]


@pytest.fixture(scope="session")
def auth_headers(token):
    return {"Authorization": f"Bearer {token}"}


# --------- Auth ---------
class TestAuth:
    def test_login_success(self, creds, token):  # depend on token to ensure registration
        _ = token
        r = requests.post(f"{API}/auth/login", json={"email": creds["email"], "password": creds["password"]}, timeout=30)
        assert r.status_code == 200
        assert "access_token" in r.json()

    def test_login_wrong_password(self, creds):
        r = requests.post(f"{API}/auth/login", json={"email": creds["email"], "password": "WRONG"}, timeout=30)
        assert r.status_code == 401

    def test_me_valid(self, auth_headers, creds):
        r = requests.get(f"{API}/auth/me", headers=auth_headers, timeout=30)
        assert r.status_code == 200
        assert r.json()["email"] == creds["email"]

    def test_me_missing_token(self):
        r = requests.get(f"{API}/auth/me", timeout=30)
        assert r.status_code == 401

    def test_register_duplicate(self, creds):
        r = requests.post(f"{API}/auth/register", json=creds, timeout=30)
        assert r.status_code == 409


# --------- Upload ---------
class TestUpload:
    def test_upload_base64_requires_auth(self):
        r = requests.post(f"{API}/upload-base64", json={"image": PNG_B64}, timeout=30)
        assert r.status_code == 401

    def test_upload_base64_success(self, auth_headers):
        r = requests.post(f"{API}/upload-base64", headers=auth_headers, json={"image": PNG_B64}, timeout=60)
        assert r.status_code == 200, r.text
        path = r.json().get("path")
        assert path and path.startswith("qc-estate-audit/uploads/")
        pytest.shared_upload_path = path

    def test_files_requires_token(self):
        path = getattr(pytest, "shared_upload_path", None)
        if not path:
            pytest.skip("no upload path")
        r = requests.get(f"{API}/files/{path}", timeout=30)
        assert r.status_code == 401

    def test_files_with_token(self, token):
        path = getattr(pytest, "shared_upload_path", None)
        if not path:
            pytest.skip("no upload path")
        r = requests.get(f"{API}/files/{path}?token={token}", timeout=30)
        assert r.status_code == 200
        assert r.content  # bytes returned


# --------- Inspections ---------
FORM_TYPES = [
    ("land_clearing", "FORM AUDIT LAND CLEARING"),
    ("land_preparation", "FORM AUDIT LAND PREPARATION"),
    ("tanam", "FORM AUDIT TANAM"),
    ("kesehatan", "FORM AUDIT KESEHATAN TANAMAN BARU"),
]


class TestInspections:
    def test_create_all_form_types(self, auth_headers):
        created = []
        for ft, title in FORM_TYPES:
            payload = {
                "form_type": ft,
                "form_title": title,
                "header": {"Kebun": "KEBUN A", "Afdeling": "OA", "Estate": "EST-1", "Blok": "B01", "Luas": "10 Ha"},
                "samples": [
                    {"jalur": 3, "titik": 1, "values": {"standar": "Standar"}, "keterangan": {}, "dates": {}, "photos": {}},
                    {"jalur": 5, "titik": 2, "values": {"standar": "Tidak Standart"}, "keterangan": {}, "dates": {}, "photos": {}},
                ],
                "signature_pemeriksa": None,
                "signature_mengetahui": None,
            }
            r = requests.post(f"{API}/inspections", headers=auth_headers, json=payload, timeout=30)
            assert r.status_code == 200, f"{ft}: {r.status_code} {r.text}"
            data = r.json()
            assert data["form_type"] == ft
            assert data["form_title"] == title
            assert len(data["samples"]) == 2
            assert "id" in data
            created.append(data["id"])
        pytest.shared_inspection_ids = created

    def test_list_only_current_user_newest_first(self, auth_headers):
        r = requests.get(f"{API}/inspections", headers=auth_headers, timeout=30)
        assert r.status_code == 200
        arr = r.json()
        assert isinstance(arr, list)
        ids = [x["id"] for x in arr]
        for iid in pytest.shared_inspection_ids:
            assert iid in ids
        # sort desc
        dates = [x["created_at"] for x in arr]
        assert dates == sorted(dates, reverse=True)

    def test_get_owned(self, auth_headers):
        iid = pytest.shared_inspection_ids[0]
        r = requests.get(f"{API}/inspections/{iid}", headers=auth_headers, timeout=30)
        assert r.status_code == 200
        assert r.json()["id"] == iid

    def test_get_invalid_id_returns_404(self, auth_headers):
        r = requests.get(f"{API}/inspections/notanid", headers=auth_headers, timeout=30)
        assert r.status_code == 404

    def test_get_other_users_inspection_returns_404(self, auth_headers):
        # Register another user
        other = {"email": f"other+{uuid.uuid4().hex[:6]}@estate.com", "password": "secret123", "name": "Other"}
        rr = requests.post(f"{API}/auth/register", json=other, timeout=30)
        assert rr.status_code == 200
        other_token = rr.json()["access_token"]
        other_headers = {"Authorization": f"Bearer {other_token}"}
        iid = pytest.shared_inspection_ids[0]
        r = requests.get(f"{API}/inspections/{iid}", headers=other_headers, timeout=30)
        assert r.status_code == 404

    def test_export_pdf(self, token):
        iid = pytest.shared_inspection_ids[0]
        r = requests.get(f"{API}/inspections/{iid}/export?fmt=pdf&token={token}", timeout=60)
        assert r.status_code == 200
        assert r.headers.get("content-type", "").startswith("application/pdf")
        assert len(r.content) > 500

    def test_export_excel(self, token):
        iid = pytest.shared_inspection_ids[0]
        r = requests.get(f"{API}/inspections/{iid}/export?fmt=excel&token={token}", timeout=60)
        assert r.status_code == 200
        assert "spreadsheetml" in r.headers.get("content-type", "")
        assert len(r.content) > 500

    def test_export_requires_token(self):
        iid = pytest.shared_inspection_ids[0]
        r = requests.get(f"{API}/inspections/{iid}/export?fmt=pdf", timeout=30)
        assert r.status_code == 401

    def test_delete_soft_removes_from_list(self, auth_headers):
        iid = pytest.shared_inspection_ids[-1]
        r = requests.delete(f"{API}/inspections/{iid}", headers=auth_headers, timeout=30)
        assert r.status_code == 200
        # verify not returned in list
        r2 = requests.get(f"{API}/inspections", headers=auth_headers, timeout=30)
        assert iid not in [x["id"] for x in r2.json()]
        # get returns 404 after delete
        r3 = requests.get(f"{API}/inspections/{iid}", headers=auth_headers, timeout=30)
        assert r3.status_code == 404
