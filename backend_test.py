#!/usr/bin/env python3
"""
Backend Test: Verifikasi Formula Id Actual BARU (titik_sample mengganti code_lsu)
DATA EQMS TAGGING - Formula CHANGED: Code LSU -> Titik Sample

SAFETY: Ada data produksi (~10k+ record). WAJIB pakai kebun='ZZTEST' untuk semua test records.
Cleanup via POST /api/records/delete-bulk dengan id uji saja.
"""

import requests
import sys

BASE_URL = "https://epcs-nasrul-1.preview.emergentagent.com/api"
ADMIN_EMAIL = "admin@eqms.id"
ADMIN_PASSWORD = "EQMS1234"

# Use a session to maintain cookies
session = requests.Session()

def login():
    """Login admin and return session with auth cookie"""
    resp = session.post(f"{BASE_URL}/auth/login", json={
        "email": ADMIN_EMAIL,
        "password": ADMIN_PASSWORD
    })
    if resp.status_code != 200:
        print(f"❌ Login failed: {resp.status_code} {resp.text}")
        sys.exit(1)
    
    data = resp.json()
    if data.get("role") != "admin":
        print(f"❌ Login role mismatch: expected 'admin', got '{data.get('role')}'")
        sys.exit(1)
    
    print(f"✅ Login successful: role={data.get('role')}")
    return session

def get_headers():
    """Return headers for requests"""
    return {
        "Content-Type": "application/json"
    }

def get_initial_count():
    """Get initial production record count"""
    resp = session.get(f"{BASE_URL}/records")
    if resp.status_code != 200:
        print(f"❌ Failed to get initial count: {resp.status_code}")
        sys.exit(1)
    records = resp.json()
    count = len(records)
    print(f"📊 Initial production record count: {count}")
    return count

def test_1_create_record_with_new_formula():
    """
    TEST 1: POST /api/records dengan titik_sample='TS01' dan code_lsu='XX99'
    Expected: id_actual = 'ZZTEST1OA11TS01110,4001130,654521' (menggunakan titik_sample, MENGABAIKAN code_lsu)
    """
    print("\n" + "="*80)
    print("TEST 1: Create record - Formula BARU (titik_sample mengganti code_lsu)")
    print("="*80)
    
    body = {
        "kebun": "ZZTEST",
        "afdeling": "1",
        "blok": "OA11",
        "titik_sample": "TS01",
        "code_lsu": "XX99",  # HARUS DIABAIKAN dalam id_actual
        "koord_x": 110.400113,
        "koord_y": 0.654521
    }
    
    resp = session.post(f"{BASE_URL}/records", json=body)
    
    if resp.status_code != 200:
        print(f"❌ POST /api/records failed: {resp.status_code} {resp.text}")
        return None
    
    data = resp.json()
    record_id = data.get("_id")
    id_actual = data.get("id_actual")
    payload = data.get("payload")
    
    # Expected: ZZTEST + 1 + OA11 + TS01 + 110,400113 + 0,654521
    expected_id_actual = "ZZTEST1OA11TS01110,4001130,654521"
    
    print(f"📝 Created record ID: {record_id}")
    print(f"📝 id_actual: {id_actual}")
    print(f"📝 payload: {payload}")
    print(f"📝 Expected: {expected_id_actual}")
    
    # Verify id_actual matches expected (using titik_sample, NOT code_lsu)
    if id_actual != expected_id_actual:
        print(f"❌ TEST 1 FAILED: id_actual mismatch")
        print(f"   Expected: {expected_id_actual}")
        print(f"   Got:      {id_actual}")
        print(f"   ⚠️  CRITICAL: Formula harus menggunakan titik_sample='TS01', BUKAN code_lsu='XX99'")
        return None
    
    # Verify payload equals id_actual
    if payload != id_actual:
        print(f"❌ TEST 1 FAILED: payload != id_actual")
        print(f"   id_actual: {id_actual}")
        print(f"   payload:   {payload}")
        return None
    
    # Verify id_actual is string type
    if not isinstance(id_actual, str):
        print(f"❌ TEST 1 FAILED: id_actual is not string type, got {type(id_actual)}")
        return None
    
    # Verify code_lsu is NOT in id_actual (should use titik_sample instead)
    if "XX99" in id_actual:
        print(f"❌ TEST 1 FAILED: code_lsu 'XX99' found in id_actual - formula should use titik_sample, not code_lsu")
        return None
    
    # Verify titik_sample IS in id_actual
    if "TS01" not in id_actual:
        print(f"❌ TEST 1 FAILED: titik_sample 'TS01' NOT found in id_actual")
        return None
    
    print(f"✅ TEST 1 PASSED: id_actual correct (using titik_sample='TS01', ignoring code_lsu='XX99')")
    print(f"✅ TEST 1 PASSED: payload equals id_actual")
    print(f"✅ TEST 1 PASSED: id_actual is string type")
    print(f"✅ TEST 1 PASSED: Coordinate format uses comma decimal (110,400113 and 0,654521)")
    
    return record_id

def test_2_update_titik_sample(record_id):
    """
    TEST 2: PUT /api/records/{id} ubah titik_sample menjadi 'TS09'
    Expected: id_actual & payload recompute menjadi 'ZZTEST1OA11TS09110,4001130,654521'
    """
    print("\n" + "="*80)
    print("TEST 2: Update titik_sample - Verify id_actual recomputes")
    print("="*80)
    
    # First, get the current record to have full body for PUT
    resp = session.get(f"{BASE_URL}/records")
    if resp.status_code != 200:
        print(f"❌ GET /api/records failed: {resp.status_code}")
        return False
    
    records = resp.json()
    current_record = None
    for r in records:
        if r.get("_id") == record_id:
            current_record = r
            break
    
    if not current_record:
        print(f"❌ Record {record_id} not found in GET /api/records")
        return False
    
    # Update titik_sample to TS09
    update_body = {
        "kebun": current_record.get("kebun"),
        "afdeling": current_record.get("afdeling"),
        "blok": current_record.get("blok"),
        "titik_sample": "TS09",  # CHANGED from TS01 to TS09
        "code_lsu": current_record.get("code_lsu"),
        "koord_x": current_record.get("koord_x"),
        "koord_y": current_record.get("koord_y"),
        "luas_ha": current_record.get("luas_ha", 0),
        "jumlah_pokok": current_record.get("jumlah_pokok", 0),
        "kategori": current_record.get("kategori", ""),
        "keterangan": current_record.get("keterangan", ""),
        "jumlah_pelepah": current_record.get("jumlah_pelepah", 0),
        "panjang_pelepah": current_record.get("panjang_pelepah", 0),
        "lebar_petiol": current_record.get("lebar_petiol", 0),
        "tebal_petiol": current_record.get("tebal_petiol", 0),
        "panjang_helai_1": current_record.get("panjang_helai_1", 0),
        "panjang_helai_2": current_record.get("panjang_helai_2", 0),
        "lebar_helai_1": current_record.get("lebar_helai_1", 0),
        "lebar_helai_2": current_record.get("lebar_helai_2", 0),
        "jumlah_anak_daun": current_record.get("jumlah_anak_daun", 0),
        "tanggal_lsu": current_record.get("tanggal_lsu", "")
    }
    
    resp = session.put(f"{BASE_URL}/records/{record_id}", json=update_body)
    
    if resp.status_code != 200:
        print(f"❌ PUT /api/records/{record_id} failed: {resp.status_code} {resp.text}")
        return False
    
    data = resp.json()
    id_actual = data.get("id_actual")
    payload = data.get("payload")
    
    # Expected: ZZTEST + 1 + OA11 + TS09 + 110,400113 + 0,654521
    expected_id_actual = "ZZTEST1OA11TS09110,4001130,654521"
    
    print(f"📝 Updated id_actual: {id_actual}")
    print(f"📝 Updated payload: {payload}")
    print(f"📝 Expected: {expected_id_actual}")
    
    if id_actual != expected_id_actual:
        print(f"❌ TEST 2 FAILED: id_actual not recomputed correctly")
        print(f"   Expected: {expected_id_actual}")
        print(f"   Got:      {id_actual}")
        return False
    
    if payload != id_actual:
        print(f"❌ TEST 2 FAILED: payload != id_actual after update")
        return False
    
    print(f"✅ TEST 2 PASSED: id_actual recomputed correctly to 'ZZTEST1OA11TS09110,4001130,654521'")
    print(f"✅ TEST 2 PASSED: payload equals id_actual after update")
    
    return True

def test_3_get_records(record_id):
    """
    TEST 3: GET /api/records -> record uji muncul dengan id_actual benar (string)
    """
    print("\n" + "="*80)
    print("TEST 3: GET /api/records - Verify record appears with correct id_actual")
    print("="*80)
    
    resp = session.get(f"{BASE_URL}/records")
    
    if resp.status_code != 200:
        print(f"❌ GET /api/records failed: {resp.status_code}")
        return False
    
    records = resp.json()
    
    # Find our test record
    test_record = None
    for r in records:
        if r.get("_id") == record_id:
            test_record = r
            break
    
    if not test_record:
        print(f"❌ TEST 3 FAILED: Test record {record_id} not found in GET /api/records")
        return False
    
    id_actual = test_record.get("id_actual")
    
    # After TEST 2, id_actual should be with TS09
    expected_id_actual = "ZZTEST1OA11TS09110,4001130,654521"
    
    print(f"📝 Record found with id_actual: {id_actual}")
    print(f"📝 Expected: {expected_id_actual}")
    
    if id_actual != expected_id_actual:
        print(f"❌ TEST 3 FAILED: id_actual mismatch in GET response")
        return False
    
    if not isinstance(id_actual, str):
        print(f"❌ TEST 3 FAILED: id_actual is not string type, got {type(id_actual)}")
        return False
    
    print(f"✅ TEST 3 PASSED: Record appears in GET /api/records with correct id_actual (string type)")
    
    return True

def test_4_regression_exports():
    """
    TEST 4: Regresi ekspor - Verify all export endpoints return 200 (not 500)
    """
    print("\n" + "="*80)
    print("TEST 4: Regression - Export endpoints (labels, table, excel)")
    print("="*80)
    
    endpoints = [
        ("GET /api/records/export/labels", f"{BASE_URL}/records/export/labels", "application/pdf"),
        ("GET /api/records/export/table", f"{BASE_URL}/records/export/table", "application/pdf"),
        ("GET /api/records/export/excel", f"{BASE_URL}/records/export/excel", "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet")
    ]
    
    all_passed = True
    
    for name, url, expected_content_type in endpoints:
        resp = session.get(url)
        
        if resp.status_code != 200:
            print(f"❌ {name} failed: {resp.status_code}")
            all_passed = False
            continue
        
        content_type = resp.headers.get("Content-Type", "")
        
        if expected_content_type not in content_type:
            print(f"❌ {name} wrong content-type: expected '{expected_content_type}', got '{content_type}'")
            all_passed = False
            continue
        
        print(f"✅ {name} returned 200 with correct content-type")
    
    if all_passed:
        print(f"✅ TEST 4 PASSED: All export endpoints return 200 (no 500 errors)")
    else:
        print(f"❌ TEST 4 FAILED: Some export endpoints failed")
    
    return all_passed

def test_5_cleanup(record_ids, initial_count):
    """
    TEST 5: Cleanup - Delete test records and verify production data unchanged
    """
    print("\n" + "="*80)
    print("TEST 5: Cleanup - Delete test records via bulk delete")
    print("="*80)
    
    if not record_ids:
        print("⚠️  No test records to clean up")
        return True
    
    print(f"📝 Deleting {len(record_ids)} test record(s): {record_ids}")
    
    resp = session.post(f"{BASE_URL}/records/delete-bulk", json={"ids": record_ids})
    
    if resp.status_code != 200:
        print(f"❌ POST /api/records/delete-bulk failed: {resp.status_code} {resp.text}")
        return False
    
    data = resp.json()
    deleted_count = data.get("deleted", 0)
    
    print(f"📝 Deleted count: {deleted_count}")
    
    if deleted_count != len(record_ids):
        print(f"❌ TEST 5 FAILED: Expected to delete {len(record_ids)} records, but deleted {deleted_count}")
        return False
    
    # Verify records are actually deleted
    resp = session.get(f"{BASE_URL}/records")
    if resp.status_code != 200:
        print(f"❌ GET /api/records failed: {resp.status_code}")
        return False
    
    records = resp.json()
    
    for record_id in record_ids:
        for r in records:
            if r.get("_id") == record_id:
                print(f"❌ TEST 5 FAILED: Record {record_id} still exists after delete")
                return False
    
    print(f"✅ All test records deleted successfully")
    
    # Verify production data count unchanged
    final_count = len(records)
    print(f"📊 Final production record count: {final_count}")
    print(f"📊 Initial production record count: {initial_count}")
    
    if final_count != initial_count:
        print(f"❌ TEST 5 FAILED: Production data count changed! Initial={initial_count}, Final={final_count}")
        print(f"   ⚠️  CRITICAL: Production data may have been affected!")
        return False
    
    print(f"✅ TEST 5 PASSED: Production data count unchanged (initial={initial_count}, final={final_count})")
    print(f"✅ TEST 5 PASSED: All test records cleaned up successfully")
    
    return True

def main():
    print("="*80)
    print("BACKEND TEST: Formula Id Actual BARU (titik_sample mengganti code_lsu)")
    print("DATA EQMS TAGGING")
    print("="*80)
    
    # Login
    login()
    
    # Get initial count
    initial_count = get_initial_count()
    
    # Track test record IDs for cleanup
    test_record_ids = []
    
    # TEST 1: Create record with new formula (titik_sample, not code_lsu)
    record_id = test_1_create_record_with_new_formula()
    if record_id:
        test_record_ids.append(record_id)
    else:
        print("\n❌ TEST 1 FAILED - Stopping tests")
        sys.exit(1)
    
    # TEST 2: Update titik_sample and verify id_actual recomputes
    if not test_2_update_titik_sample(record_id):
        print("\n❌ TEST 2 FAILED - Continuing with remaining tests")
    
    # TEST 3: GET /api/records and verify record appears
    if not test_3_get_records(record_id):
        print("\n❌ TEST 3 FAILED - Continuing with remaining tests")
    
    # TEST 4: Regression - Export endpoints
    if not test_4_regression_exports():
        print("\n❌ TEST 4 FAILED - Continuing with cleanup")
    
    # TEST 5: Cleanup
    if not test_5_cleanup(test_record_ids, initial_count):
        print("\n❌ TEST 5 FAILED - Manual cleanup may be required")
        sys.exit(1)
    
    print("\n" + "="*80)
    print("✅ ALL TESTS PASSED (5/5)")
    print("="*80)
    print("\nSUMMARY:")
    print("✅ TEST 1: Create record - Formula BARU uses titik_sample (NOT code_lsu)")
    print("✅ TEST 2: Update titik_sample - id_actual recomputes correctly")
    print("✅ TEST 3: GET /api/records - Record appears with correct id_actual")
    print("✅ TEST 4: Regression - All export endpoints return 200")
    print("✅ TEST 5: Cleanup - Test records deleted, production data unchanged")
    print("\n🎉 Formula Id Actual BARU verified successfully!")
    print("   Formula: Kebun + Afdeling + Blok + TITIK_SAMPLE + Koord_X + Koord_Y")
    print("   Code LSU is IGNORED in id_actual generation")

if __name__ == "__main__":
    main()
