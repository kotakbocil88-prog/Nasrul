#!/usr/bin/env python3
"""
Backend Test: Mobile Support (Petugas Role + Lookup Endpoint)
Tests new mobile-support backend changes in /app/backend/server.py

SAFETY: Only creates/modifies test data with kebun='ZZTEST'
Cleans up all ZZTEST records at the end via POST /api/records/delete-bulk
"""

import requests
import os
from dotenv import load_dotenv

# Load environment
load_dotenv('/app/frontend/.env')
BASE_URL = os.getenv('REACT_APP_BACKEND_URL', 'http://localhost:8001')
API_URL = f"{BASE_URL}/api"

# Test credentials from /app/memory/test_credentials.md
ADMIN_EMAIL = "admin@eqms.id"
ADMIN_PASSWORD = "EQMS1234"
PETUGAS_EMAIL = "petugas@eqms.id"
PETUGAS_PASSWORD = "PETUGAS1234"
VIEWER_EMAIL = "ras2026@eqms.id"
VIEWER_PASSWORD = "RAS1234"

def login(email: str, password: str) -> tuple[str, str]:
    """Login and return (token, role)"""
    resp = requests.post(f"{API_URL}/auth/login", json={"email": email, "password": password})
    print(f"[LOGIN] {email} -> {resp.status_code}")
    if resp.status_code != 200:
        print(f"  ERROR: {resp.text}")
        return None, None
    data = resp.json()
    role = data.get("role", "")
    # Extract token from Set-Cookie header or use Authorization
    token = None
    if "Set-Cookie" in resp.headers:
        cookie = resp.headers["Set-Cookie"]
        if "token=" in cookie:
            token = cookie.split("token=")[1].split(";")[0]
    print(f"  Role: {role}, Token: {token[:20] if token else 'None'}...")
    return token, role

def get_headers(token: str) -> dict:
    """Return headers with Bearer token"""
    if token:
        return {"Authorization": f"Bearer {token}"}
    return {}

def test_1_login_petugas():
    """TEST 1: Login petugas -> returns 200 and role == 'petugas'"""
    print("\n" + "="*80)
    print("TEST 1: Login petugas")
    print("="*80)
    
    token, role = login(PETUGAS_EMAIL, PETUGAS_PASSWORD)
    
    if token is None:
        print("❌ FAIL: Login failed")
        return False, None
    
    if role != "petugas":
        print(f"❌ FAIL: Expected role='petugas', got role='{role}'")
        return False, token
    
    print(f"✅ PASS: Login successful, role='petugas'")
    return True, token

def test_2_rbac_petugas(petugas_token: str, admin_token: str):
    """TEST 2: RBAC petugas - POST/DELETE -> 403, PUT -> 200"""
    print("\n" + "="*80)
    print("TEST 2: RBAC petugas (POST/DELETE -> 403, PUT -> 200)")
    print("="*80)
    
    headers = get_headers(petugas_token)
    results = []
    
    # First, create a test record as admin for PUT test
    admin_headers = get_headers(admin_token)
    test_record = {
        "kebun": "ZZTEST",
        "afdeling": "1",
        "blok": "OA11",
        "code_lsu": "XX99",
        "titik_sample": "TS01",
        "koord_x": 101.4,
        "koord_y": -0.65,
        "luas_ha": 4.5,
        "jumlah_pokok": 630
    }
    resp = requests.post(f"{API_URL}/records", json=test_record, headers=admin_headers)
    if resp.status_code != 200:
        print(f"❌ FAIL: Admin couldn't create test record: {resp.status_code}")
        return False, None
    
    test_id = resp.json().get("_id")
    print(f"  Created test record as admin: {test_id}")
    
    # Test 2a: POST /api/records -> 403
    print("\n  Test 2a: POST /api/records (petugas) -> should be 403")
    resp = requests.post(f"{API_URL}/records", json=test_record, headers=headers)
    print(f"    Status: {resp.status_code}")
    if resp.status_code == 403:
        print(f"    ✅ PASS: POST forbidden for petugas")
        results.append(True)
    else:
        print(f"    ❌ FAIL: Expected 403, got {resp.status_code}")
        results.append(False)
    
    # Test 2b: DELETE /api/records/{id} -> 403
    print("\n  Test 2b: DELETE /api/records/{id} (petugas) -> should be 403")
    resp = requests.delete(f"{API_URL}/records/{test_id}", headers=headers)
    print(f"    Status: {resp.status_code}")
    if resp.status_code == 403:
        print(f"    ✅ PASS: DELETE forbidden for petugas")
        results.append(True)
    else:
        print(f"    ❌ FAIL: Expected 403, got {resp.status_code}")
        results.append(False)
    
    # Test 2c: POST /api/records/import/preview -> 403
    print("\n  Test 2c: POST /api/records/import/preview (petugas) -> should be 403")
    # Create a dummy file
    files = {'file': ('test.xlsx', b'dummy', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet')}
    resp = requests.post(f"{API_URL}/records/import/preview", files=files, headers=headers)
    print(f"    Status: {resp.status_code}")
    if resp.status_code == 403:
        print(f"    ✅ PASS: Import preview forbidden for petugas")
        results.append(True)
    else:
        print(f"    ❌ FAIL: Expected 403, got {resp.status_code}")
        results.append(False)
    
    # Test 2d: PUT /api/records/{id} -> 200 (ALLOWED)
    print("\n  Test 2d: PUT /api/records/{id} (petugas) -> should be 200 (ALLOWED)")
    update_data = test_record.copy()
    update_data["koord_x"] = 102.5
    update_data["koord_y"] = -0.75
    resp = requests.put(f"{API_URL}/records/{test_id}", json=update_data, headers=headers)
    print(f"    Status: {resp.status_code}")
    if resp.status_code == 200:
        print(f"    ✅ PASS: PUT allowed for petugas")
        results.append(True)
    else:
        print(f"    ❌ FAIL: Expected 200, got {resp.status_code}")
        print(f"    Response: {resp.text}")
        results.append(False)
    
    all_pass = all(results)
    if all_pass:
        print(f"\n✅ TEST 2 PASS: All RBAC petugas tests passed (4/4)")
    else:
        print(f"\n❌ TEST 2 FAIL: {sum(results)}/4 tests passed")
    
    return all_pass, test_id

def test_3_rbac_viewer(viewer_token: str, test_id: str):
    """TEST 3: RBAC viewer - PUT -> 403"""
    print("\n" + "="*80)
    print("TEST 3: RBAC viewer (PUT -> 403)")
    print("="*80)
    
    headers = get_headers(viewer_token)
    
    # Test: PUT /api/records/{id} -> 403
    update_data = {
        "kebun": "ZZTEST",
        "afdeling": "1",
        "blok": "OA11",
        "code_lsu": "XX99",
        "titik_sample": "TS01",
        "koord_x": 103.0,
        "koord_y": -0.80,
        "luas_ha": 4.5,
        "jumlah_pokok": 630
    }
    resp = requests.put(f"{API_URL}/records/{test_id}", json=update_data, headers=headers)
    print(f"  Status: {resp.status_code}")
    
    if resp.status_code == 403:
        print(f"✅ PASS: PUT forbidden for viewer")
        return True
    else:
        print(f"❌ FAIL: Expected 403, got {resp.status_code}")
        print(f"  Response: {resp.text}")
        return False

def test_4_rbac_admin(admin_token: str):
    """TEST 4: RBAC admin - POST/PUT/DELETE -> 200"""
    print("\n" + "="*80)
    print("TEST 4: RBAC admin (POST/PUT/DELETE -> 200)")
    print("="*80)
    
    headers = get_headers(admin_token)
    results = []
    
    # Test 4a: POST /api/records -> 200
    print("\n  Test 4a: POST /api/records (admin) -> should be 200")
    test_record = {
        "kebun": "ZZTEST",
        "afdeling": "2",
        "blok": "OA22",
        "code_lsu": "YY88",
        "titik_sample": "TS02",
        "koord_x": 104.0,
        "koord_y": -0.90,
        "luas_ha": 5.0,
        "jumlah_pokok": 700
    }
    resp = requests.post(f"{API_URL}/records", json=test_record, headers=headers)
    print(f"    Status: {resp.status_code}")
    if resp.status_code == 200:
        test_id = resp.json().get("_id")
        print(f"    ✅ PASS: POST allowed for admin, created id={test_id}")
        results.append(True)
    else:
        print(f"    ❌ FAIL: Expected 200, got {resp.status_code}")
        print(f"    Response: {resp.text}")
        results.append(False)
        return False, []
    
    # Test 4b: PUT /api/records/{id} -> 200
    print("\n  Test 4b: PUT /api/records/{id} (admin) -> should be 200")
    update_data = test_record.copy()
    update_data["koord_x"] = 105.0
    resp = requests.put(f"{API_URL}/records/{test_id}", json=update_data, headers=headers)
    print(f"    Status: {resp.status_code}")
    if resp.status_code == 200:
        print(f"    ✅ PASS: PUT allowed for admin")
        results.append(True)
    else:
        print(f"    ❌ FAIL: Expected 200, got {resp.status_code}")
        print(f"    Response: {resp.text}")
        results.append(False)
    
    # Test 4c: DELETE /api/records/{id} -> 200
    print("\n  Test 4c: DELETE /api/records/{id} (admin) -> should be 200")
    resp = requests.delete(f"{API_URL}/records/{test_id}", headers=headers)
    print(f"    Status: {resp.status_code}")
    if resp.status_code == 200:
        print(f"    ✅ PASS: DELETE allowed for admin")
        results.append(True)
    else:
        print(f"    ❌ FAIL: Expected 200, got {resp.status_code}")
        print(f"    Response: {resp.text}")
        results.append(False)
    
    all_pass = all(results)
    if all_pass:
        print(f"\n✅ TEST 4 PASS: All RBAC admin tests passed (3/3)")
    else:
        print(f"\n❌ TEST 4 FAIL: {sum(results)}/3 tests passed")
    
    return all_pass, []

def test_5_lookup_endpoint(admin_token: str):
    """TEST 5: Lookup endpoint - exact match, partial match, empty query"""
    print("\n" + "="*80)
    print("TEST 5: Lookup endpoint")
    print("="*80)
    
    headers = get_headers(admin_token)
    results = []
    
    # Create a test record with specific values
    print("\n  Creating test record for lookup...")
    test_record = {
        "kebun": "ZZTEST",
        "afdeling": "1",
        "blok": "OA11",
        "code_lsu": "XX99",
        "titik_sample": "TS01",
        "koord_x": 101.4,
        "koord_y": -0.65,
        "luas_ha": 4.5,
        "jumlah_pokok": 630
    }
    resp = requests.post(f"{API_URL}/records", json=test_record, headers=headers)
    if resp.status_code != 200:
        print(f"❌ FAIL: Couldn't create test record: {resp.status_code}")
        return False, None
    
    created = resp.json()
    test_id = created.get("_id")
    id_actual = created.get("id_actual", "")
    print(f"  Created record: id={test_id}, id_actual='{id_actual}'")
    
    # Test 5a: Exact match - GET /api/records/lookup?q=<id_actual>
    print(f"\n  Test 5a: GET /api/records/lookup?q={id_actual} (exact match)")
    resp = requests.get(f"{API_URL}/records/lookup", params={"q": id_actual}, headers=headers)
    print(f"    Status: {resp.status_code}")
    if resp.status_code == 200:
        data = resp.json()
        print(f"    Results count: {len(data)}")
        if len(data) > 0 and data[0].get("id_actual") == id_actual:
            print(f"    ✅ PASS: Exact match found, first result is correct record")
            results.append(True)
        else:
            print(f"    ❌ FAIL: Exact match not found or not first result")
            results.append(False)
    else:
        print(f"    ❌ FAIL: Expected 200, got {resp.status_code}")
        results.append(False)
    
    # Test 5b: Partial match - GET /api/records/lookup?q=ZZTEST
    print(f"\n  Test 5b: GET /api/records/lookup?q=ZZTEST (partial match)")
    resp = requests.get(f"{API_URL}/records/lookup", params={"q": "ZZTEST"}, headers=headers)
    print(f"    Status: {resp.status_code}")
    if resp.status_code == 200:
        data = resp.json()
        print(f"    Results count: {len(data)}")
        # Check if our test record is in the results
        found = any(r.get("_id") == test_id for r in data)
        if found:
            print(f"    ✅ PASS: Partial match found, test record included")
            results.append(True)
        else:
            print(f"    ❌ FAIL: Test record not found in partial match results")
            results.append(False)
    else:
        print(f"    ❌ FAIL: Expected 200, got {resp.status_code}")
        results.append(False)
    
    # Test 5c: Empty query - GET /api/records/lookup?q=
    print(f"\n  Test 5c: GET /api/records/lookup?q= (empty query)")
    resp = requests.get(f"{API_URL}/records/lookup", params={"q": ""}, headers=headers)
    print(f"    Status: {resp.status_code}")
    if resp.status_code == 200:
        data = resp.json()
        print(f"    Results count: {len(data)}")
        if len(data) == 0:
            print(f"    ✅ PASS: Empty query returns empty list")
            results.append(True)
        else:
            print(f"    ❌ FAIL: Empty query should return [], got {len(data)} results")
            results.append(False)
    else:
        print(f"    ❌ FAIL: Expected 200, got {resp.status_code}")
        results.append(False)
    
    # Test 5d: Lookup requires auth (test without token)
    print(f"\n  Test 5d: GET /api/records/lookup without auth -> should be 401/403")
    resp = requests.get(f"{API_URL}/records/lookup", params={"q": "ZZTEST"})
    print(f"    Status: {resp.status_code}")
    if resp.status_code in [401, 403]:
        print(f"    ✅ PASS: Lookup requires authentication")
        results.append(True)
    else:
        print(f"    ❌ FAIL: Expected 401/403, got {resp.status_code}")
        results.append(False)
    
    all_pass = all(results)
    if all_pass:
        print(f"\n✅ TEST 5 PASS: All lookup tests passed (4/4)")
    else:
        print(f"\n❌ TEST 5 FAIL: {sum(results)}/4 tests passed")
    
    return all_pass, test_id

def test_6_put_by_petugas(petugas_token: str, test_id: str):
    """TEST 6: PUT by petugas - change coordinates and jumlah_pelepah"""
    print("\n" + "="*80)
    print("TEST 6: PUT by petugas (update coordinates and jumlah_pelepah)")
    print("="*80)
    
    headers = get_headers(petugas_token)
    
    # First, get the current record
    resp = requests.get(f"{API_URL}/records", headers=headers)
    if resp.status_code != 200:
        print(f"❌ FAIL: Couldn't fetch records: {resp.status_code}")
        return False
    
    records = resp.json()
    test_record = next((r for r in records if r.get("_id") == test_id), None)
    if not test_record:
        print(f"❌ FAIL: Test record not found in GET /api/records")
        return False
    
    print(f"  Current record: koord_x={test_record.get('koord_x')}, koord_y={test_record.get('koord_y')}, jumlah_pelepah={test_record.get('jumlah_pelepah')}")
    
    # Update the record
    update_data = {
        "kebun": test_record.get("kebun"),
        "afdeling": test_record.get("afdeling"),
        "blok": test_record.get("blok"),
        "code_lsu": test_record.get("code_lsu"),
        "titik_sample": test_record.get("titik_sample"),
        "koord_x": 106.5,
        "koord_y": -1.25,
        "luas_ha": test_record.get("luas_ha"),
        "jumlah_pokok": test_record.get("jumlah_pokok"),
        "jumlah_pelepah": 45.0
    }
    
    resp = requests.put(f"{API_URL}/records/{test_id}", json=update_data, headers=headers)
    print(f"\n  PUT Status: {resp.status_code}")
    
    if resp.status_code != 200:
        print(f"❌ FAIL: PUT failed with status {resp.status_code}")
        print(f"  Response: {resp.text}")
        return False
    
    updated = resp.json()
    print(f"  Updated record: koord_x={updated.get('koord_x')}, koord_y={updated.get('koord_y')}, jumlah_pelepah={updated.get('jumlah_pelepah')}")
    
    # Verify the values
    if (updated.get("koord_x") == 106.5 and 
        updated.get("koord_y") == -1.25 and 
        updated.get("jumlah_pelepah") == 45.0):
        print(f"✅ PASS: PUT by petugas successful, values updated correctly")
        return True
    else:
        print(f"❌ FAIL: Values not updated correctly")
        return False

def cleanup(admin_token: str, test_ids: list):
    """Cleanup: Delete all ZZTEST records"""
    print("\n" + "="*80)
    print("CLEANUP: Deleting all ZZTEST records")
    print("="*80)
    
    headers = get_headers(admin_token)
    
    # Get all ZZTEST records
    resp = requests.get(f"{API_URL}/records", headers=headers)
    if resp.status_code != 200:
        print(f"❌ FAIL: Couldn't fetch records for cleanup: {resp.status_code}")
        return False
    
    records = resp.json()
    zztest_ids = [r.get("_id") for r in records if r.get("kebun") == "ZZTEST"]
    
    print(f"  Found {len(zztest_ids)} ZZTEST records to delete")
    
    if len(zztest_ids) == 0:
        print(f"✅ No ZZTEST records to clean up")
        return True
    
    # Delete via bulk delete
    resp = requests.post(f"{API_URL}/records/delete-bulk", json={"ids": zztest_ids}, headers=headers)
    print(f"  Bulk delete status: {resp.status_code}")
    
    if resp.status_code == 200:
        data = resp.json()
        deleted_count = data.get("deleted", 0)
        print(f"✅ Cleanup successful: {deleted_count} ZZTEST records deleted")
        return True
    else:
        print(f"❌ Cleanup failed: {resp.status_code}")
        print(f"  Response: {resp.text}")
        return False

def main():
    print("="*80)
    print("BACKEND TEST: Mobile Support (Petugas Role + Lookup Endpoint)")
    print("="*80)
    print(f"API URL: {API_URL}")
    
    # Login all users
    print("\n" + "="*80)
    print("SETUP: Login all users")
    print("="*80)
    
    admin_token, admin_role = login(ADMIN_EMAIL, ADMIN_PASSWORD)
    if not admin_token:
        print("❌ FATAL: Admin login failed")
        return
    
    petugas_token, petugas_role = login(PETUGAS_EMAIL, PETUGAS_PASSWORD)
    viewer_token, viewer_role = login(VIEWER_EMAIL, VIEWER_PASSWORD)
    
    # Track test results
    test_results = []
    test_ids_to_cleanup = []
    
    # TEST 1: Login petugas
    result, petugas_token = test_1_login_petugas()
    test_results.append(("TEST 1: Login petugas", result))
    if not petugas_token:
        print("\n❌ FATAL: Petugas login failed, cannot continue")
        return
    
    # TEST 2: RBAC petugas
    result, test_id = test_2_rbac_petugas(petugas_token, admin_token)
    test_results.append(("TEST 2: RBAC petugas", result))
    if test_id:
        test_ids_to_cleanup.append(test_id)
    
    # TEST 3: RBAC viewer
    if viewer_token and test_id:
        result = test_3_rbac_viewer(viewer_token, test_id)
        test_results.append(("TEST 3: RBAC viewer", result))
    else:
        print("\n⚠️ SKIP TEST 3: Viewer login failed or no test record")
        test_results.append(("TEST 3: RBAC viewer", False))
    
    # TEST 4: RBAC admin
    result, _ = test_4_rbac_admin(admin_token)
    test_results.append(("TEST 4: RBAC admin", result))
    
    # TEST 5: Lookup endpoint
    result, lookup_test_id = test_5_lookup_endpoint(admin_token)
    test_results.append(("TEST 5: Lookup endpoint", result))
    if lookup_test_id:
        test_ids_to_cleanup.append(lookup_test_id)
    
    # TEST 6: PUT by petugas
    if petugas_token and lookup_test_id:
        result = test_6_put_by_petugas(petugas_token, lookup_test_id)
        test_results.append(("TEST 6: PUT by petugas", result))
    else:
        print("\n⚠️ SKIP TEST 6: Petugas token or test record not available")
        test_results.append(("TEST 6: PUT by petugas", False))
    
    # Cleanup
    cleanup(admin_token, test_ids_to_cleanup)
    
    # Summary
    print("\n" + "="*80)
    print("TEST SUMMARY")
    print("="*80)
    
    for test_name, result in test_results:
        status = "✅ PASS" if result else "❌ FAIL"
        print(f"{status}: {test_name}")
    
    passed = sum(1 for _, result in test_results if result)
    total = len(test_results)
    print(f"\nTotal: {passed}/{total} tests passed")
    
    if passed == total:
        print("\n🎉 ALL TESTS PASSED!")
    else:
        print(f"\n⚠️ {total - passed} test(s) failed")

if __name__ == "__main__":
    main()
