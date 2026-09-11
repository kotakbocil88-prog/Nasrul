"""Tests for the 4 new features: score, stats, PDF photo embedding, filter."""
import os
import uuid
import base64
import pytest
import requests

BASE_URL = os.environ["EXPO_PUBLIC_BACKEND_URL"].rstrip("/")
API = f"{BASE_URL}/api"

# 1x1 transparent PNG base64
PNG_B64 = (
    "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNkYAAAAAYAAjCB0C8AAAAASUVORK5CYII="
)


@pytest.fixture(scope="session")
def user_ctx():
    rnd = uuid.uuid4().hex[:8]
    creds = {"email": f"qc.new+{rnd}@estate.com", "password": "secret123", "name": "QC New"}
    r = requests.post(f"{API}/auth/register", json=creds, timeout=30)
    assert r.status_code == 200, r.text
    token = r.json()["access_token"]
    return {"creds": creds, "token": token, "headers": {"Authorization": f"Bearer {token}"}}


def _create(headers, form_type, header, samples):
    payload = {
        "form_type": form_type,
        "form_title": f"FORM {form_type.upper()}",
        "header": header,
        "samples": samples,
        "signature_pemeriksa": None,
        "signature_mengetahui": None,
    }
    r = requests.post(f"{API}/inspections", headers=headers, json=payload, timeout=30)
    assert r.status_code == 200, r.text
    return r.json()


class TestScoreObject:
    """Feature 2: score in inspection responses."""

    def test_score_50_percent(self, user_ctx):
        """values a=Standar, b=Tidak Standart -> percent=50"""
        insp = _create(
            user_ctx["headers"],
            "land_clearing",
            {"kebun": "KEBUN A", "blok": "B01", "estate": "EST-A"},
            [{"jalur": 1, "titik": 1, "values": {"a": "Standar", "b": "Tidak Standart"},
              "keterangan": {}, "dates": {}, "photos": {}}],
        )
        assert "score" in insp
        assert insp["score"]["standar"] == 1
        assert insp["score"]["total"] == 2
        assert insp["score"]["percent"] == 50

    def test_score_100_percent(self, user_ctx):
        insp = _create(
            user_ctx["headers"], "tanam",
            {"kebun": "KEBUN B", "blok": "B02", "estate": "EST-A"},
            [{"jalur": 1, "titik": 1, "values": {"x": "Standar", "y": "Standar"},
              "keterangan": {}, "dates": {}, "photos": {}}],
        )
        assert insp["score"]["percent"] == 100
        assert insp["score"]["standar"] == 2
        assert insp["score"]["total"] == 2

    def test_score_null_when_no_std_answers(self, user_ctx):
        insp = _create(
            user_ctx["headers"], "kesehatan",
            {"kebun": "KEBUN C", "blok": "B03", "estate": "EST-B"},
            [{"jalur": 1, "titik": 1, "values": {"note": "Some text"},
              "keterangan": {}, "dates": {}, "photos": {}}],
        )
        assert insp["score"]["total"] == 0
        assert insp["score"]["percent"] is None

    def test_score_present_in_list_and_detail(self, user_ctx):
        r = requests.get(f"{API}/inspections", headers=user_ctx["headers"], timeout=30)
        assert r.status_code == 200
        arr = r.json()
        assert len(arr) >= 1
        for it in arr:
            assert "score" in it and set(it["score"].keys()) == {"standar", "total", "percent"}
        iid = arr[0]["id"]
        r2 = requests.get(f"{API}/inspections/{iid}", headers=user_ctx["headers"], timeout=30)
        assert r2.status_code == 200
        assert "score" in r2.json()


class TestStats:
    """Feature 2: /api/stats aggregated per estate for current user."""

    def test_stats_shape_and_aggregation(self, user_ctx):
        r = requests.get(f"{API}/stats", headers=user_ctx["headers"], timeout=30)
        assert r.status_code == 200, r.text
        s = r.json()
        assert set(s.keys()) >= {"total_inspections", "overall_percent", "estates"}
        assert s["total_inspections"] >= 3
        # estates aggregated: EST-A should have 2 inspections, EST-B 1
        by_estate = {e["estate"]: e for e in s["estates"]}
        assert "EST-A" in by_estate
        assert by_estate["EST-A"]["inspections"] == 2
        # EST-A has one 50%+one 100% -> 3/4 = 75
        assert by_estate["EST-A"]["percent"] == 75
        assert by_estate["EST-A"]["samples"] == 2
        assert "EST-B" in by_estate
        # sorted desc by inspections
        counts = [e["inspections"] for e in s["estates"]]
        assert counts == sorted(counts, reverse=True)
        # overall = 3 standar / 4 total = 75%
        assert s["overall_percent"] == 75

    def test_stats_isolated_per_user(self):
        rnd = uuid.uuid4().hex[:8]
        creds = {"email": f"qc.other+{rnd}@estate.com", "password": "secret123", "name": "Other"}
        r = requests.post(f"{API}/auth/register", json=creds, timeout=30)
        assert r.status_code == 200
        headers = {"Authorization": f"Bearer {r.json()['access_token']}"}
        s = requests.get(f"{API}/stats", headers=headers, timeout=30).json()
        assert s["total_inspections"] == 0
        assert s["estates"] == []
        assert s["overall_percent"] is None

    def test_stats_requires_auth(self):
        r = requests.get(f"{API}/stats", timeout=30)
        assert r.status_code == 401


class TestFilterListing:
    """Feature 4 (backend): list supports form_type filter."""

    def test_list_filter_by_form_type(self, user_ctx):
        r = requests.get(f"{API}/inspections?form_type=land_clearing",
                         headers=user_ctx["headers"], timeout=30)
        assert r.status_code == 200
        arr = r.json()
        assert len(arr) >= 1
        for it in arr:
            assert it["form_type"] == "land_clearing"


class TestPDFPhotoEmbed:
    """Feature 1: PDF should embed photos when samples have `photos`."""

    def test_pdf_grows_with_photo(self, user_ctx):
        headers = user_ctx["headers"]
        token = user_ctx["token"]

        # No-photo inspection
        no_photo = _create(headers, "land_preparation",
                           {"kebun": "K", "blok": "B", "estate": "EST-P"},
                           [{"jalur": 1, "titik": 1, "values": {"x": "Standar"},
                             "keterangan": {}, "dates": {}, "photos": {}}])
        # Upload a real photo via base64
        r_up = requests.post(f"{API}/upload-base64", headers=headers,
                             json={"image": PNG_B64}, timeout=60)
        assert r_up.status_code == 200, r_up.text
        photo_path = r_up.json()["path"]
        assert photo_path

        # Photo inspection referencing uploaded path
        with_photo = _create(headers, "land_preparation",
                             {"kebun": "K", "blok": "B", "estate": "EST-P"},
                             [{"jalur": 1, "titik": 1,
                               "values": {"x": "Standar"},
                               "keterangan": {}, "dates": {},
                               "photos": {"x": photo_path}}])

        r1 = requests.get(f"{API}/inspections/{no_photo['id']}/export?fmt=pdf&token={token}", timeout=60)
        assert r1.status_code == 200
        assert r1.headers.get("content-type", "").startswith("application/pdf")
        assert r1.content[:4] == b"%PDF"
        size_no = len(r1.content)

        r2 = requests.get(f"{API}/inspections/{with_photo['id']}/export?fmt=pdf&token={token}", timeout=60)
        assert r2.status_code == 200
        assert r2.headers.get("content-type", "").startswith("application/pdf")
        assert r2.content[:4] == b"%PDF"
        size_with = len(r2.content)

        # PDF with an embedded image should be larger than one without.
        assert size_with > size_no, f"expected larger PDF w/ photo. no={size_no} with={size_with}"


class TestUploadEndpoints:
    def test_upload_base64_returns_path(self, user_ctx):
        r = requests.post(f"{API}/upload-base64", headers=user_ctx["headers"],
                          json={"image": PNG_B64}, timeout=60)
        assert r.status_code == 200
        assert r.json().get("path", "").startswith("qc-estate-audit/uploads/")

    def test_upload_multipart_returns_path(self, user_ctx):
        raw = base64.b64decode(PNG_B64)
        files = {"file": ("test.png", raw, "image/png")}
        r = requests.post(f"{API}/upload", headers=user_ctx["headers"], files=files, timeout=60)
        assert r.status_code == 200, r.text
        assert r.json().get("path", "").startswith("qc-estate-audit/uploads/")
