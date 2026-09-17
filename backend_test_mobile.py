#!/usr/bin/env python3
"""
Comprehensive test suite for Mobile Backend Endpoints
Tests GET /api/mobile/config, POST /api/mobile/verify, POST /api/mobile/submit
"""

import requests
import json
from typing import Optional

# Backend base URL
BASE_URL = "https://epcs-nasrul-1.preview.emergentagent.com/api"

# Test credentials
ADMIN_CREDS = {"email": "admin@eqms.id", "password": "EQMS1234"}
PETUGAS_CREDS = {"email": "petugas@eqms.id", "password": "PETUGAS1234"}
VIEWER_CREDS = {"email": "ras2026@eqms.id", "password": "RAS1234"}

# DEMO record details (kebun=DEMO)
DEMO_QR = "DEMO1A01TS01109,8885770,164244"
DEMO_LAT = 0.164244
DEMO_LNG = 109.888577
DEMO_LAT_FAR = 0.164694  # ~50m away

# Test results
test_results = []


def log_test(test_num: int, description: str, passed: bool, details: str = ""):
    """Log test result"""
    status = "✅ PASS" if passed else "❌ FAIL"
    result = f"Test {test_num}: {status} - {description}"
    if details:
        result += f"\n  Details: {details}"
    test_results.append((test_num, passed, description, details))
    print(result)


def login(email: str, password: str) -> Optional[str]:
    """Login and return Bearer token"""
    try:
        response = requests.post(
            f"{BASE_URL}/auth/login",
            json={"email": email, "password": password},
            timeout=10
        )
        if response.status_code == 200:
            data = response.json()
            token = data.get("access_token")
            role = data.get("role", "unknown")
            print(f"  ✓ Login successful: {email} (role: {role})")
            if token:
                print(f"  ✓ Token received: {token[:20]}...")
                return token
            else:
                print(f"  ✗ No access_token in response: {data}")
                return None
        else:
            print(f"  ✗ Login failed: {response.status_code} - {response.text}")
            return None
    except Exception as e:
        print(f"  ✗ Login error: {e}")
        return None


def test_1_config_endpoint():
    """Test 1: GET /api/mobile/config -> returns {tolerance_m: 5}"""
    print("\n" + "="*80)
    print("TEST 1: GET /api/mobile/config")
    print("="*80)
    
    # Login as admin
    token = login(ADMIN_CREDS["email"], ADMIN_CREDS["password"])
    if not token:
        log_test(1, "GET /api/mobile/config", False, "Login failed")
        return
    
    try:
        response = requests.get(
            f"{BASE_URL}/mobile/config",
            headers={"Authorization": f"Bearer {token}"},
            timeout=10
        )
        
        if response.status_code == 200:
            data = response.json()
            tolerance = data.get("tolerance_m")
            
            if tolerance == 5:
                log_test(1, "GET /api/mobile/config", True, 
                        f"Response: {json.dumps(data)} - tolerance_m is 5 as expected")
            else:
                log_test(1, "GET /api/mobile/config", False, 
                        f"Expected tolerance_m=5, got {tolerance}")
        else:
            log_test(1, "GET /api/mobile/config", False, 
                    f"HTTP {response.status_code}: {response.text}")
    except Exception as e:
        log_test(1, "GET /api/mobile/config", False, f"Exception: {e}")


def test_2_verify_exact_location():
    """Test 2: POST /api/mobile/verify with exact location -> qr_found=true, ok=true, distance_m ~0"""
    print("\n" + "="*80)
    print("TEST 2: POST /api/mobile/verify (exact location)")
    print("="*80)
    
    token = login(ADMIN_CREDS["email"], ADMIN_CREDS["password"])
    if not token:
        log_test(2, "Verify exact location", False, "Login failed")
        return
    
    try:
        payload = {
            "qr": DEMO_QR,
            "lat": DEMO_LAT,
            "lng": DEMO_LNG
        }
        
        response = requests.post(
            f"{BASE_URL}/mobile/verify",
            json=payload,
            headers={"Authorization": f"Bearer {token}"},
            timeout=10
        )
        
        if response.status_code == 200:
            data = response.json()
            
            # Check all required fields
            checks = []
            checks.append(("qr_found", data.get("qr_found") == True))
            checks.append(("ok", data.get("ok") == True))
            checks.append(("within_tolerance", data.get("within_tolerance") == True))
            checks.append(("distance_m", data.get("distance_m") is not None and data.get("distance_m") <= 1))
            checks.append(("record.kebun", data.get("record", {}).get("kebun") == "DEMO"))
            checks.append(("record.id", data.get("record", {}).get("id") is not None))
            
            # Check identity fields
            record = data.get("record", {})
            identity_fields = ["afdeling", "code_lsu", "blok", "kategori", "luas_ha", 
                             "jumlah_pokok", "titik_sample"]
            for field in identity_fields:
                checks.append((f"record.{field}", field in record))
            
            failed_checks = [name for name, result in checks if not result]
            
            if not failed_checks:
                log_test(2, "Verify exact location", True, 
                        f"qr_found=true, ok=true, within_tolerance=true, distance_m={data.get('distance_m')}, "
                        f"record.kebun=DEMO, all identity fields present")
            else:
                log_test(2, "Verify exact location", False, 
                        f"Failed checks: {failed_checks}. Response: {json.dumps(data, indent=2)}")
        else:
            log_test(2, "Verify exact location", False, 
                    f"HTTP {response.status_code}: {response.text}")
    except Exception as e:
        log_test(2, "Verify exact location", False, f"Exception: {e}")


def test_3_verify_far_location():
    """Test 3: POST /api/mobile/verify with lat ~50m away -> ok=false, within_tolerance=false"""
    print("\n" + "="*80)
    print("TEST 3: POST /api/mobile/verify (far location ~50m)")
    print("="*80)
    
    token = login(ADMIN_CREDS["email"], ADMIN_CREDS["password"])
    if not token:
        log_test(3, "Verify far location", False, "Login failed")
        return
    
    try:
        payload = {
            "qr": DEMO_QR,
            "lat": DEMO_LAT_FAR,  # ~50m away
            "lng": DEMO_LNG
        }
        
        response = requests.post(
            f"{BASE_URL}/mobile/verify",
            json=payload,
            headers={"Authorization": f"Bearer {token}"},
            timeout=10
        )
        
        if response.status_code == 200:
            data = response.json()
            
            qr_found = data.get("qr_found")
            ok = data.get("ok")
            within_tolerance = data.get("within_tolerance")
            distance_m = data.get("distance_m")
            
            if qr_found == True and ok == False and within_tolerance == False and distance_m and distance_m > 40:
                log_test(3, "Verify far location", True, 
                        f"qr_found=true, ok=false, within_tolerance=false, distance_m={distance_m} (around 50m)")
            else:
                log_test(3, "Verify far location", False, 
                        f"Expected ok=false, within_tolerance=false, distance ~50m. "
                        f"Got: qr_found={qr_found}, ok={ok}, within_tolerance={within_tolerance}, distance_m={distance_m}")
        else:
            log_test(3, "Verify far location", False, 
                    f"HTTP {response.status_code}: {response.text}")
    except Exception as e:
        log_test(3, "Verify far location", False, f"Exception: {e}")


def test_4_verify_invalid_qr():
    """Test 4: POST /api/mobile/verify with invalid QR -> qr_found=false, ok=false"""
    print("\n" + "="*80)
    print("TEST 4: POST /api/mobile/verify (invalid QR)")
    print("="*80)
    
    token = login(ADMIN_CREDS["email"], ADMIN_CREDS["password"])
    if not token:
        log_test(4, "Verify invalid QR", False, "Login failed")
        return
    
    try:
        payload = {
            "qr": "NGAWUR123",
            "lat": DEMO_LAT,
            "lng": DEMO_LNG
        }
        
        response = requests.post(
            f"{BASE_URL}/mobile/verify",
            json=payload,
            headers={"Authorization": f"Bearer {token}"},
            timeout=10
        )
        
        if response.status_code == 200:
            data = response.json()
            
            qr_found = data.get("qr_found")
            ok = data.get("ok")
            
            if qr_found == False and ok == False:
                log_test(4, "Verify invalid QR", True, 
                        f"qr_found=false, ok=false as expected. Message: {data.get('message', '')}")
            else:
                log_test(4, "Verify invalid QR", False, 
                        f"Expected qr_found=false, ok=false. Got: qr_found={qr_found}, ok={ok}")
        else:
            log_test(4, "Verify invalid QR", False, 
                    f"HTTP {response.status_code}: {response.text}")
    except Exception as e:
        log_test(4, "Verify invalid QR", False, f"Exception: {e}")


def test_5_submit_as_petugas():
    """Test 5: POST /api/mobile/submit as PETUGAS with valid data -> HTTP 200, ok=true, lai>0"""
    print("\n" + "="*80)
    print("TEST 5: POST /api/mobile/submit as PETUGAS (valid data)")
    print("="*80)
    
    # First, login as admin to get record_id from verify
    admin_token = login(ADMIN_CREDS["email"], ADMIN_CREDS["password"])
    if not admin_token:
        log_test(5, "Submit as PETUGAS", False, "Admin login failed")
        return
    
    # Get record_id from verify
    try:
        verify_response = requests.post(
            f"{BASE_URL}/mobile/verify",
            json={"qr": DEMO_QR, "lat": DEMO_LAT, "lng": DEMO_LNG},
            headers={"Authorization": f"Bearer {admin_token}"},
            timeout=10
        )
        
        if verify_response.status_code != 200:
            log_test(5, "Submit as PETUGAS", False, "Verify failed to get record_id")
            return
        
        record_id = verify_response.json().get("record", {}).get("id")
        if not record_id:
            log_test(5, "Submit as PETUGAS", False, "No record_id in verify response")
            return
        
        print(f"  ✓ Got record_id: {record_id}")
    except Exception as e:
        log_test(5, "Submit as PETUGAS", False, f"Verify exception: {e}")
        return
    
    # Now login as PETUGAS and submit
    petugas_token = login(PETUGAS_CREDS["email"], PETUGAS_CREDS["password"])
    if not petugas_token:
        log_test(5, "Submit as PETUGAS", False, "PETUGAS login failed")
        return
    
    try:
        submit_payload = {
            "record_id": record_id,
            "qr": DEMO_QR,
            "lat": DEMO_LAT,
            "lng": DEMO_LNG,
            "jumlah_pelepah": 40,
            "panjang_pelepah": 500,
            "lebar_petiol": 6.5,
            "tebal_petiol": 3.2,
            "panjang_helai_1": 95,
            "panjang_helai_2": 96,
            "lebar_helai_1": 5,
            "lebar_helai_2": 5.1,
            "jumlah_anak_daun": 300
        }
        
        response = requests.post(
            f"{BASE_URL}/mobile/submit",
            json=submit_payload,
            headers={"Authorization": f"Bearer {petugas_token}"},
            timeout=10
        )
        
        if response.status_code == 200:
            data = response.json()
            
            ok = data.get("ok")
            distance_m = data.get("distance_m")
            record = data.get("record", {})
            lai = record.get("lai", 0)
            sph = record.get("sph", 0)
            measured_by = record.get("measured_by")
            
            checks = []
            checks.append(("ok", ok == True))
            checks.append(("distance_m", distance_m is not None and distance_m <= 5))
            checks.append(("record.lai", lai > 0))
            checks.append(("record.sph", sph > 0))
            checks.append(("measured_by", measured_by == PETUGAS_CREDS["email"]))
            
            failed_checks = [name for name, result in checks if not result]
            
            if not failed_checks:
                log_test(5, "Submit as PETUGAS", True, 
                        f"HTTP 200, ok=true, distance_m={distance_m}, lai={lai}, sph={sph}, measured_by={measured_by}")
            else:
                log_test(5, "Submit as PETUGAS", False, 
                        f"Failed checks: {failed_checks}. Response: {json.dumps(data, indent=2)}")
        else:
            log_test(5, "Submit as PETUGAS", False, 
                    f"HTTP {response.status_code}: {response.text}")
    except Exception as e:
        log_test(5, "Submit as PETUGAS", False, f"Exception: {e}")


def test_6_submit_far_location():
    """Test 6: POST /api/mobile/submit with far location -> HTTP 400 (Lokasi terlalu jauh)"""
    print("\n" + "="*80)
    print("TEST 6: POST /api/mobile/submit (far location)")
    print("="*80)
    
    # Get record_id
    admin_token = login(ADMIN_CREDS["email"], ADMIN_CREDS["password"])
    if not admin_token:
        log_test(6, "Submit far location", False, "Admin login failed")
        return
    
    try:
        verify_response = requests.post(
            f"{BASE_URL}/mobile/verify",
            json={"qr": DEMO_QR, "lat": DEMO_LAT, "lng": DEMO_LNG},
            headers={"Authorization": f"Bearer {admin_token}"},
            timeout=10
        )
        record_id = verify_response.json().get("record", {}).get("id")
        if not record_id:
            log_test(6, "Submit far location", False, "No record_id")
            return
    except Exception as e:
        log_test(6, "Submit far location", False, f"Verify exception: {e}")
        return
    
    # Submit with far location
    try:
        submit_payload = {
            "record_id": record_id,
            "qr": DEMO_QR,
            "lat": DEMO_LAT_FAR,  # ~50m away
            "lng": DEMO_LNG,
            "jumlah_pelepah": 40,
            "panjang_pelepah": 500,
            "lebar_petiol": 6.5,
            "tebal_petiol": 3.2,
            "panjang_helai_1": 95,
            "panjang_helai_2": 96,
            "lebar_helai_1": 5,
            "lebar_helai_2": 5.1,
            "jumlah_anak_daun": 300
        }
        
        response = requests.post(
            f"{BASE_URL}/mobile/submit",
            json=submit_payload,
            headers={"Authorization": f"Bearer {admin_token}"},
            timeout=10
        )
        
        if response.status_code == 400:
            detail = response.json().get("detail", "")
            if "terlalu jauh" in detail.lower() or "lokasi" in detail.lower():
                log_test(6, "Submit far location", True, 
                        f"HTTP 400 as expected. Detail: {detail}")
            else:
                log_test(6, "Submit far location", False, 
                        f"HTTP 400 but unexpected detail: {detail}")
        else:
            log_test(6, "Submit far location", False, 
                    f"Expected HTTP 400, got {response.status_code}: {response.text}")
    except Exception as e:
        log_test(6, "Submit far location", False, f"Exception: {e}")


def test_7_submit_wrong_qr():
    """Test 7: POST /api/mobile/submit with wrong QR -> HTTP 400"""
    print("\n" + "="*80)
    print("TEST 7: POST /api/mobile/submit (wrong QR)")
    print("="*80)
    
    # Get record_id
    admin_token = login(ADMIN_CREDS["email"], ADMIN_CREDS["password"])
    if not admin_token:
        log_test(7, "Submit wrong QR", False, "Admin login failed")
        return
    
    try:
        verify_response = requests.post(
            f"{BASE_URL}/mobile/verify",
            json={"qr": DEMO_QR, "lat": DEMO_LAT, "lng": DEMO_LNG},
            headers={"Authorization": f"Bearer {admin_token}"},
            timeout=10
        )
        record_id = verify_response.json().get("record", {}).get("id")
        if not record_id:
            log_test(7, "Submit wrong QR", False, "No record_id")
            return
    except Exception as e:
        log_test(7, "Submit wrong QR", False, f"Verify exception: {e}")
        return
    
    # Submit with wrong QR
    try:
        submit_payload = {
            "record_id": record_id,
            "qr": "WRONGQR123",  # Wrong QR
            "lat": DEMO_LAT,
            "lng": DEMO_LNG,
            "jumlah_pelepah": 40,
            "panjang_pelepah": 500,
            "lebar_petiol": 6.5,
            "tebal_petiol": 3.2,
            "panjang_helai_1": 95,
            "panjang_helai_2": 96,
            "lebar_helai_1": 5,
            "lebar_helai_2": 5.1,
            "jumlah_anak_daun": 300
        }
        
        response = requests.post(
            f"{BASE_URL}/mobile/submit",
            json=submit_payload,
            headers={"Authorization": f"Bearer {admin_token}"},
            timeout=10
        )
        
        if response.status_code == 400:
            detail = response.json().get("detail", "")
            if "qr" in detail.lower() or "cocok" in detail.lower():
                log_test(7, "Submit wrong QR", True, 
                        f"HTTP 400 as expected. Detail: {detail}")
            else:
                log_test(7, "Submit wrong QR", False, 
                        f"HTTP 400 but unexpected detail: {detail}")
        else:
            log_test(7, "Submit wrong QR", False, 
                    f"Expected HTTP 400, got {response.status_code}: {response.text}")
    except Exception as e:
        log_test(7, "Submit wrong QR", False, f"Exception: {e}")


def test_8_submit_as_viewer():
    """Test 8: POST /api/mobile/submit as VIEWER -> HTTP 403"""
    print("\n" + "="*80)
    print("TEST 8: POST /api/mobile/submit as VIEWER (should be 403)")
    print("="*80)
    
    # Get record_id
    admin_token = login(ADMIN_CREDS["email"], ADMIN_CREDS["password"])
    if not admin_token:
        log_test(8, "Submit as VIEWER", False, "Admin login failed")
        return
    
    try:
        verify_response = requests.post(
            f"{BASE_URL}/mobile/verify",
            json={"qr": DEMO_QR, "lat": DEMO_LAT, "lng": DEMO_LNG},
            headers={"Authorization": f"Bearer {admin_token}"},
            timeout=10
        )
        record_id = verify_response.json().get("record", {}).get("id")
        if not record_id:
            log_test(8, "Submit as VIEWER", False, "No record_id")
            return
    except Exception as e:
        log_test(8, "Submit as VIEWER", False, f"Verify exception: {e}")
        return
    
    # Login as VIEWER
    viewer_token = login(VIEWER_CREDS["email"], VIEWER_CREDS["password"])
    if not viewer_token:
        log_test(8, "Submit as VIEWER", False, "VIEWER login failed")
        return
    
    # Try to submit as VIEWER
    try:
        submit_payload = {
            "record_id": record_id,
            "qr": DEMO_QR,
            "lat": DEMO_LAT,
            "lng": DEMO_LNG,
            "jumlah_pelepah": 40,
            "panjang_pelepah": 500,
            "lebar_petiol": 6.5,
            "tebal_petiol": 3.2,
            "panjang_helai_1": 95,
            "panjang_helai_2": 96,
            "lebar_helai_1": 5,
            "lebar_helai_2": 5.1,
            "jumlah_anak_daun": 300
        }
        
        response = requests.post(
            f"{BASE_URL}/mobile/submit",
            json=submit_payload,
            headers={"Authorization": f"Bearer {viewer_token}"},
            timeout=10
        )
        
        if response.status_code == 403:
            log_test(8, "Submit as VIEWER", True, 
                    f"HTTP 403 as expected (viewer cannot submit)")
        else:
            log_test(8, "Submit as VIEWER", False, 
                    f"Expected HTTP 403, got {response.status_code}: {response.text}")
    except Exception as e:
        log_test(8, "Submit as VIEWER", False, f"Exception: {e}")


def test_9_submit_as_admin():
    """Test 9: POST /api/mobile/submit as ADMIN -> HTTP 200 (admin also allowed)"""
    print("\n" + "="*80)
    print("TEST 9: POST /api/mobile/submit as ADMIN (should be 200)")
    print("="*80)
    
    # Get record_id
    admin_token = login(ADMIN_CREDS["email"], ADMIN_CREDS["password"])
    if not admin_token:
        log_test(9, "Submit as ADMIN", False, "Admin login failed")
        return
    
    try:
        verify_response = requests.post(
            f"{BASE_URL}/mobile/verify",
            json={"qr": DEMO_QR, "lat": DEMO_LAT, "lng": DEMO_LNG},
            headers={"Authorization": f"Bearer {admin_token}"},
            timeout=10
        )
        record_id = verify_response.json().get("record", {}).get("id")
        if not record_id:
            log_test(9, "Submit as ADMIN", False, "No record_id")
            return
    except Exception as e:
        log_test(9, "Submit as ADMIN", False, f"Verify exception: {e}")
        return
    
    # Submit as ADMIN
    try:
        submit_payload = {
            "record_id": record_id,
            "qr": DEMO_QR,
            "lat": DEMO_LAT,
            "lng": DEMO_LNG,
            "jumlah_pelepah": 40,
            "panjang_pelepah": 500,
            "lebar_petiol": 6.5,
            "tebal_petiol": 3.2,
            "panjang_helai_1": 95,
            "panjang_helai_2": 96,
            "lebar_helai_1": 5,
            "lebar_helai_2": 5.1,
            "jumlah_anak_daun": 300
        }
        
        response = requests.post(
            f"{BASE_URL}/mobile/submit",
            json=submit_payload,
            headers={"Authorization": f"Bearer {admin_token}"},
            timeout=10
        )
        
        if response.status_code == 200:
            data = response.json()
            ok = data.get("ok")
            if ok == True:
                log_test(9, "Submit as ADMIN", True, 
                        f"HTTP 200, ok=true (admin can submit)")
            else:
                log_test(9, "Submit as ADMIN", False, 
                        f"HTTP 200 but ok={ok}")
        else:
            log_test(9, "Submit as ADMIN", False, 
                    f"Expected HTTP 200, got {response.status_code}: {response.text}")
    except Exception as e:
        log_test(9, "Submit as ADMIN", False, f"Exception: {e}")


def print_summary():
    """Print test summary"""
    print("\n" + "="*80)
    print("TEST SUMMARY")
    print("="*80)
    
    total = len(test_results)
    passed = sum(1 for _, p, _, _ in test_results if p)
    failed = total - passed
    
    print(f"\nTotal Tests: {total}")
    print(f"Passed: {passed} ✅")
    print(f"Failed: {failed} ❌")
    print(f"Success Rate: {(passed/total*100):.1f}%\n")
    
    if failed > 0:
        print("FAILED TESTS:")
        for num, passed, desc, details in test_results:
            if not passed:
                print(f"  Test {num}: {desc}")
                if details:
                    print(f"    {details}")
    
    print("\nDETAILED RESULTS:")
    for num, passed, desc, details in test_results:
        status = "✅ PASS" if passed else "❌ FAIL"
        print(f"  Test {num}: {status} - {desc}")


if __name__ == "__main__":
    print("="*80)
    print("MOBILE BACKEND ENDPOINTS TEST SUITE")
    print("="*80)
    print(f"Backend URL: {BASE_URL}")
    print(f"DEMO Record: {DEMO_QR} at lat={DEMO_LAT}, lng={DEMO_LNG}")
    print("="*80)
    
    # Run all tests
    test_1_config_endpoint()
    test_2_verify_exact_location()
    test_3_verify_far_location()
    test_4_verify_invalid_qr()
    test_5_submit_as_petugas()
    test_6_submit_far_location()
    test_7_submit_wrong_qr()
    test_8_submit_as_viewer()
    test_9_submit_as_admin()
    
    # Print summary
    print_summary()
    
    # Exit with appropriate code
    failed_count = sum(1 for _, p, _, _ in test_results if not p)
    exit(0 if failed_count == 0 else 1)
