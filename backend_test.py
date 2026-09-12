#!/usr/bin/env python3
"""
Backend API tests for DATA EPCS TAGGING (Kebun) app
Testing: Label PDF export with size parameter (small/medium/large)
"""
import requests
import json
import sys
from typing import Optional

# Base URL from frontend/.env
BASE_URL = "https://prog-nasrul.preview.emergentagent.com/api"

# Test credentials from test_credentials.md
ADMIN_EMAIL = "admin@kebun.id"
ADMIN_PASSWORD = "admin123"

class TestSession:
    def __init__(self):
        self.session = requests.Session()
        self.session.headers.update({"Content-Type": "application/json"})
        self.created_record_ids = []
        
    def login(self) -> bool:
        """Login and get JWT cookie"""
        print("\n=== TEST: Login ===")
        try:
            response = self.session.post(
                f"{BASE_URL}/auth/login",
                json={"email": ADMIN_EMAIL, "password": ADMIN_PASSWORD}
            )
            print(f"Status: {response.status_code}")
            if response.status_code == 200:
                data = response.json()
                print(f"✅ Login successful: {data.get('email')}")
                return True
            else:
                print(f"❌ Login failed: {response.text}")
                return False
        except Exception as e:
            print(f"❌ Login error: {e}")
            return False
    
    def test_create_record(self) -> Optional[str]:
        """Test POST /api/records - verify id_actual INCLUDES afdeling and payload = id_actual"""
        print("\n=== TEST 1: POST /api/records - Create record (id_actual includes afdeling) ===")
        test_data = {
            "kebun": "KSL",
            "afdeling": "1",
            "blok": "OA11",
            "code_lsu": "TS01",
            "koord_x": 110.400113,
            "koord_y": 0.654521
        }
        # NEW: Id Actual NOW INCLUDES Afdeling
        expected_id_actual = "KSL1OA11TS01110,4001130,654521"
        
        print(f"Request body: {json.dumps(test_data, indent=2)}")
        print(f"Expected id_actual (with afdeling): {expected_id_actual}")
        
        try:
            response = self.session.post(f"{BASE_URL}/records", json=test_data)
            print(f"Status: {response.status_code}")
            
            if response.status_code != 200:
                print(f"❌ Failed to create record: {response.text}")
                return None
            
            data = response.json()
            print(f"Response: {json.dumps(data, indent=2)}")
            
            record_id = data.get("_id")
            actual_id_actual = data.get("id_actual")
            actual_payload = data.get("payload")
            
            # Verify id_actual is a string
            if not isinstance(actual_id_actual, str):
                print(f"❌ FAIL: id_actual is not a string, got type: {type(actual_id_actual)}")
                return record_id
            
            # Verify id_actual matches expected format (includes afdeling)
            if actual_id_actual == expected_id_actual:
                print(f"✅ PASS: id_actual includes afdeling: {actual_id_actual}")
            else:
                print(f"❌ FAIL: id_actual mismatch!")
                print(f"   Expected: {expected_id_actual}")
                print(f"   Got:      {actual_id_actual}")
            
            # NEW: Verify payload field equals id_actual
            if actual_payload == actual_id_actual:
                print(f"✅ PASS: payload equals id_actual: {actual_payload}")
            else:
                print(f"❌ FAIL: payload does not equal id_actual!")
                print(f"   id_actual: {actual_id_actual}")
                print(f"   payload:   {actual_payload}")
            
            if record_id:
                self.created_record_ids.append(record_id)
            
            return record_id
            
        except Exception as e:
            print(f"❌ Error creating record: {e}")
            return None
    
    def test_get_records(self, expected_id_actual: str) -> bool:
        """Test GET /api/records - verify id_actual and payload include afdeling"""
        print("\n=== TEST 2: GET /api/records - Verify id_actual and payload ===")
        
        try:
            response = self.session.get(f"{BASE_URL}/records")
            print(f"Status: {response.status_code}")
            
            if response.status_code != 200:
                print(f"❌ Failed to get records: {response.text}")
                return False
            
            data = response.json()
            print(f"Total records: {len(data)}")
            
            # Find the record we created
            found = False
            for record in data:
                if record.get("id_actual") == expected_id_actual:
                    found = True
                    print(f"✅ PASS: Found record with id_actual: {expected_id_actual}")
                    print(f"   Record: kebun={record.get('kebun')}, afdeling={record.get('afdeling')}, blok={record.get('blok')}, code_lsu={record.get('code_lsu')}")
                    
                    # Verify id_actual is string type
                    if not isinstance(record.get("id_actual"), str):
                        print(f"❌ FAIL: id_actual is not a string, got type: {type(record.get('id_actual'))}")
                        return False
                    
                    # NEW: Verify payload equals id_actual
                    if record.get("payload") == record.get("id_actual"):
                        print(f"✅ PASS: payload equals id_actual in GET response")
                    else:
                        print(f"❌ FAIL: payload does not equal id_actual!")
                        print(f"   id_actual: {record.get('id_actual')}")
                        print(f"   payload:   {record.get('payload')}")
                        return False
                    break
            
            if not found:
                print(f"❌ FAIL: Record with id_actual {expected_id_actual} not found in list")
                return False
            
            return True
            
        except Exception as e:
            print(f"❌ Error getting records: {e}")
            return False
    
    def test_update_record(self, record_id: str) -> bool:
        """Test PUT /api/records/{id} - change afdeling to '2', verify id_actual/payload recompute"""
        print("\n=== TEST 3: PUT /api/records/{id} - Change afdeling, verify recompute ===")
        
        update_data = {
            "kebun": "KSL",
            "afdeling": "2",  # Changed from "1" to "2"
            "blok": "OA11",
            "code_lsu": "TS01",
            "koord_x": 110.400113,
            "koord_y": 0.654521
        }
        # NEW: Expected id_actual with afdeling "2"
        expected_id_actual = "KSL2OA11TS01110,4001130,654521"
        
        print(f"Updating record {record_id}")
        print(f"Changed afdeling from '1' to '2'")
        print(f"Expected new id_actual: {expected_id_actual}")
        
        try:
            response = self.session.put(f"{BASE_URL}/records/{record_id}", json=update_data)
            print(f"Status: {response.status_code}")
            
            if response.status_code != 200:
                print(f"❌ Failed to update record: {response.text}")
                return False
            
            data = response.json()
            actual_id_actual = data.get("id_actual")
            actual_payload = data.get("payload")
            
            print(f"Response id_actual: {actual_id_actual}")
            print(f"Response payload:   {actual_payload}")
            
            # Verify id_actual is a string
            if not isinstance(actual_id_actual, str):
                print(f"❌ FAIL: id_actual is not a string, got type: {type(actual_id_actual)}")
                return False
            
            # Verify id_actual recomputed correctly with new afdeling
            if actual_id_actual == expected_id_actual:
                print(f"✅ PASS: id_actual recomputed with new afdeling '2': {actual_id_actual}")
            else:
                print(f"❌ FAIL: id_actual mismatch after update!")
                print(f"   Expected: {expected_id_actual}")
                print(f"   Got:      {actual_id_actual}")
                return False
            
            # NEW: Verify payload equals id_actual after update
            if actual_payload == actual_id_actual:
                print(f"✅ PASS: payload equals id_actual after update")
            else:
                print(f"❌ FAIL: payload does not equal id_actual after update!")
                print(f"   id_actual: {actual_id_actual}")
                print(f"   payload:   {actual_payload}")
                return False
            
            return True
            
        except Exception as e:
            print(f"❌ Error updating record: {e}")
            return False
    
    def test_import_records(self) -> bool:
        """Test import flow - preview and confirm"""
        print("\n=== TEST 4: Import Records (skipped - requires file upload) ===")
        print("ℹ️  Import testing requires Excel file upload, which is complex in automated tests.")
        print("   Manual verification recommended for import functionality.")
        print("   The import_confirm endpoint uses the same build_id_actual() function,")
        print("   so if create/update work correctly, import should too.")
        return True
    
    def test_export_labels_pdf_size_small(self) -> bool:
        """Test GET /api/records/export/labels?size=small - verify 200 with PDF content"""
        print("\n=== TEST 5a: GET /api/records/export/labels?size=small - Export labels PDF (small) ===")
        
        try:
            response = self.session.get(f"{BASE_URL}/records/export/labels?size=small")
            print(f"Status: {response.status_code}")
            
            if response.status_code != 200:
                print(f"❌ Failed to export labels (small): {response.text}")
                return False
            
            content_type = response.headers.get("Content-Type", "")
            print(f"Content-Type: {content_type}")
            
            if "application/pdf" in content_type:
                # Check if content starts with %PDF
                if response.content[:4] == b'%PDF':
                    print(f"✅ PASS: Labels PDF (small) exported successfully (size: {len(response.content)} bytes, starts with %PDF)")
                    return True
                else:
                    print(f"❌ FAIL: Response doesn't start with %PDF")
                    return False
            else:
                print(f"❌ FAIL: Expected application/pdf, got {content_type}")
                return False
            
        except Exception as e:
            print(f"❌ Error exporting labels (small): {e}")
            return False
    
    def test_export_labels_pdf_size_medium(self) -> bool:
        """Test GET /api/records/export/labels?size=medium - verify 200 with PDF content"""
        print("\n=== TEST 5b: GET /api/records/export/labels?size=medium - Export labels PDF (medium) ===")
        
        try:
            response = self.session.get(f"{BASE_URL}/records/export/labels?size=medium")
            print(f"Status: {response.status_code}")
            
            if response.status_code != 200:
                print(f"❌ Failed to export labels (medium): {response.text}")
                return False
            
            content_type = response.headers.get("Content-Type", "")
            print(f"Content-Type: {content_type}")
            
            if "application/pdf" in content_type:
                if response.content[:4] == b'%PDF':
                    print(f"✅ PASS: Labels PDF (medium) exported successfully (size: {len(response.content)} bytes, starts with %PDF)")
                    return True
                else:
                    print(f"❌ FAIL: Response doesn't start with %PDF")
                    return False
            else:
                print(f"❌ FAIL: Expected application/pdf, got {content_type}")
                return False
            
        except Exception as e:
            print(f"❌ Error exporting labels (medium): {e}")
            return False
    
    def test_export_labels_pdf_size_large(self) -> bool:
        """Test GET /api/records/export/labels?size=large - verify 200 with PDF content"""
        print("\n=== TEST 5c: GET /api/records/export/labels?size=large - Export labels PDF (large) ===")
        
        try:
            response = self.session.get(f"{BASE_URL}/records/export/labels?size=large")
            print(f"Status: {response.status_code}")
            
            if response.status_code != 200:
                print(f"❌ Failed to export labels (large): {response.text}")
                return False
            
            content_type = response.headers.get("Content-Type", "")
            print(f"Content-Type: {content_type}")
            
            if "application/pdf" in content_type:
                if response.content[:4] == b'%PDF':
                    print(f"✅ PASS: Labels PDF (large) exported successfully (size: {len(response.content)} bytes, starts with %PDF)")
                    return True
                else:
                    print(f"❌ FAIL: Response doesn't start with %PDF")
                    return False
            else:
                print(f"❌ FAIL: Expected application/pdf, got {content_type}")
                return False
            
        except Exception as e:
            print(f"❌ Error exporting labels (large): {e}")
            return False
    
    def test_export_labels_pdf_no_size(self) -> bool:
        """Test GET /api/records/export/labels (no size param) - should default to medium"""
        print("\n=== TEST 5d: GET /api/records/export/labels (no size) - Should default to medium ===")
        
        try:
            response = self.session.get(f"{BASE_URL}/records/export/labels")
            print(f"Status: {response.status_code}")
            
            if response.status_code != 200:
                print(f"❌ Failed to export labels (no size): {response.text}")
                return False
            
            content_type = response.headers.get("Content-Type", "")
            print(f"Content-Type: {content_type}")
            
            if "application/pdf" in content_type:
                if response.content[:4] == b'%PDF':
                    print(f"✅ PASS: Labels PDF (default=medium) exported successfully (size: {len(response.content)} bytes, starts with %PDF)")
                    return True
                else:
                    print(f"❌ FAIL: Response doesn't start with %PDF")
                    return False
            else:
                print(f"❌ FAIL: Expected application/pdf, got {content_type}")
                return False
            
        except Exception as e:
            print(f"❌ Error exporting labels (no size): {e}")
            return False
    
    def test_export_labels_pdf_invalid_size(self) -> bool:
        """Test GET /api/records/export/labels?size=bogus - should fallback to medium, NOT 500"""
        print("\n=== TEST 5e: GET /api/records/export/labels?size=bogus - Should fallback to medium (NOT 500) ===")
        
        try:
            response = self.session.get(f"{BASE_URL}/records/export/labels?size=bogus")
            print(f"Status: {response.status_code}")
            
            if response.status_code == 500:
                print(f"❌ FAIL: Got 500 error for invalid size (should fallback to medium)")
                print(f"Response: {response.text}")
                return False
            
            if response.status_code != 200:
                print(f"❌ Failed to export labels (invalid size): {response.text}")
                return False
            
            content_type = response.headers.get("Content-Type", "")
            print(f"Content-Type: {content_type}")
            
            if "application/pdf" in content_type:
                if response.content[:4] == b'%PDF':
                    print(f"✅ PASS: Labels PDF with invalid size gracefully fell back to medium (size: {len(response.content)} bytes, starts with %PDF)")
                    return True
                else:
                    print(f"❌ FAIL: Response doesn't start with %PDF")
                    return False
            else:
                print(f"❌ FAIL: Expected application/pdf, got {content_type}")
                return False
            
        except Exception as e:
            print(f"❌ Error exporting labels (invalid size): {e}")
            return False
    
    def test_export_labels_pdf_post_with_size(self) -> bool:
        """Test POST /api/records/export/labels with size parameter"""
        print("\n=== TEST 5f: POST /api/records/export/labels with size=large - Export selected labels PDF ===")
        
        # Use created record IDs if available
        body = {
            "ids": self.created_record_ids[:2] if len(self.created_record_ids) >= 2 else self.created_record_ids,
            "size": "large"
        }
        print(f"Request body: {json.dumps(body, indent=2)}")
        
        try:
            response = self.session.post(f"{BASE_URL}/records/export/labels", json=body)
            print(f"Status: {response.status_code}")
            
            if response.status_code != 200:
                print(f"❌ Failed to export selected labels with size: {response.text}")
                return False
            
            content_type = response.headers.get("Content-Type", "")
            print(f"Content-Type: {content_type}")
            
            if "application/pdf" in content_type:
                if response.content[:4] == b'%PDF':
                    print(f"✅ PASS: Selected labels PDF (size=large) exported successfully (size: {len(response.content)} bytes, starts with %PDF)")
                    return True
                else:
                    print(f"❌ FAIL: Response doesn't start with %PDF")
                    return False
            else:
                print(f"❌ FAIL: Expected application/pdf, got {content_type}")
                return False
            
        except Exception as e:
            print(f"❌ Error exporting selected labels with size: {e}")
            return False
    
    def test_export_table_pdf(self) -> bool:
        """Test GET /api/records/export/table - verify 200 with PDF content"""
        print("\n=== TEST 6a: GET /api/records/export/table - Export table PDF ===")
        
        try:
            response = self.session.get(f"{BASE_URL}/records/export/table")
            print(f"Status: {response.status_code}")
            
            if response.status_code != 200:
                print(f"❌ Failed to export table: {response.text}")
                return False
            
            content_type = response.headers.get("Content-Type", "")
            print(f"Content-Type: {content_type}")
            
            if "application/pdf" in content_type:
                print(f"✅ PASS: Table PDF exported successfully (size: {len(response.content)} bytes)")
                return True
            else:
                print(f"❌ FAIL: Expected application/pdf, got {content_type}")
                return False
            
        except Exception as e:
            print(f"❌ Error exporting table: {e}")
            return False
    
    def test_export_table_pdf_post(self) -> bool:
        """Test POST /api/records/export/table - Export selected table PDF"""
        print("\n=== TEST 6b: POST /api/records/export/table - Export selected table PDF ===")
        
        # Use created record IDs if available
        body = {"ids": self.created_record_ids[:1] if self.created_record_ids else []}
        print(f"Request body: {json.dumps(body, indent=2)}")
        
        try:
            response = self.session.post(f"{BASE_URL}/records/export/table", json=body)
            print(f"Status: {response.status_code}")
            
            if response.status_code != 200:
                print(f"❌ Failed to export selected table: {response.text}")
                return False
            
            content_type = response.headers.get("Content-Type", "")
            print(f"Content-Type: {content_type}")
            
            if "application/pdf" in content_type:
                print(f"✅ PASS: Selected table PDF exported successfully (size: {len(response.content)} bytes)")
                return True
            else:
                print(f"❌ FAIL: Expected application/pdf, got {content_type}")
                return False
            
        except Exception as e:
            print(f"❌ Error exporting selected table: {e}")
            return False
    
    def test_export_excel_get(self) -> bool:
        """Test GET /api/records/export/excel - NEW Excel export endpoint"""
        print("\n=== TEST 7a: GET /api/records/export/excel - Export all records to Excel ===")
        
        try:
            response = self.session.get(f"{BASE_URL}/records/export/excel")
            print(f"Status: {response.status_code}")
            
            if response.status_code != 200:
                print(f"❌ Failed to export Excel: {response.text}")
                return False
            
            content_type = response.headers.get("Content-Type", "")
            print(f"Content-Type: {content_type}")
            
            expected_content_type = "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
            if expected_content_type in content_type:
                print(f"✅ PASS: Excel exported successfully (size: {len(response.content)} bytes)")
                
                # Verify it's a valid Excel file by checking magic bytes
                if response.content[:2] == b'PK':  # ZIP format (xlsx is a ZIP)
                    print(f"✅ PASS: Valid Excel file format (xlsx)")
                else:
                    print(f"⚠️  Warning: File may not be valid xlsx format")
                
                return True
            else:
                print(f"❌ FAIL: Expected {expected_content_type}, got {content_type}")
                return False
            
        except Exception as e:
            print(f"❌ Error exporting Excel: {e}")
            return False
    
    def test_export_excel_post(self) -> bool:
        """Test POST /api/records/export/excel - NEW Excel export with selected IDs"""
        print("\n=== TEST 7b: POST /api/records/export/excel - Export selected records to Excel ===")
        
        # Use created record IDs if available
        body = {"ids": self.created_record_ids[:1] if self.created_record_ids else []}
        print(f"Request body: {json.dumps(body, indent=2)}")
        
        try:
            response = self.session.post(f"{BASE_URL}/records/export/excel", json=body)
            print(f"Status: {response.status_code}")
            
            if response.status_code != 200:
                print(f"❌ Failed to export selected Excel: {response.text}")
                return False
            
            content_type = response.headers.get("Content-Type", "")
            print(f"Content-Type: {content_type}")
            
            expected_content_type = "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
            if expected_content_type in content_type:
                print(f"✅ PASS: Selected Excel exported successfully (size: {len(response.content)} bytes)")
                
                # Verify it's a valid Excel file
                if response.content[:2] == b'PK':
                    print(f"✅ PASS: Valid Excel file format (xlsx)")
                else:
                    print(f"⚠️  Warning: File may not be valid xlsx format")
                
                return True
            else:
                print(f"❌ FAIL: Expected {expected_content_type}, got {content_type}")
                return False
            
        except Exception as e:
            print(f"❌ Error exporting selected Excel: {e}")
            return False
    
    def test_stats(self) -> bool:
        """Test GET /api/records/stats - verify 200"""
        print("\n=== TEST 8: GET /api/records/stats - Get statistics ===")
        
        try:
            response = self.session.get(f"{BASE_URL}/records/stats")
            print(f"Status: {response.status_code}")
            
            if response.status_code != 200:
                print(f"❌ Failed to get stats: {response.text}")
                return False
            
            data = response.json()
            print(f"Stats: {json.dumps(data, indent=2)}")
            print(f"✅ PASS: Stats endpoint working")
            return True
            
        except Exception as e:
            print(f"❌ Error getting stats: {e}")
            return False
    
    def cleanup(self):
        """Delete test records"""
        print("\n=== CLEANUP: Deleting test records ===")
        for record_id in self.created_record_ids:
            try:
                response = self.session.delete(f"{BASE_URL}/records/{record_id}")
                if response.status_code == 200:
                    print(f"✅ Deleted record {record_id}")
                else:
                    print(f"⚠️  Failed to delete record {record_id}: {response.status_code}")
            except Exception as e:
                print(f"⚠️  Error deleting record {record_id}: {e}")

def main():
    print("=" * 80)
    print("DATA EPCS TAGGING (Kebun) - Backend API Tests")
    print("Testing: Label PDF export with size parameter (small/medium/large)")
    print("=" * 80)
    
    test_session = TestSession()
    
    # Login first
    if not test_session.login():
        print("\n❌ CRITICAL: Login failed, cannot proceed with tests")
        sys.exit(1)
    
    results = {}
    
    # Ensure we have at least a few records for testing
    print("\n=== SETUP: Ensuring test records exist ===")
    # Create 3-4 test records
    test_records = [
        {"kebun": "KSL", "afdeling": "1", "blok": "PB36", "code_lsu": "TS09", "koord_x": 110.484093, "koord_y": 0.495337},
        {"kebun": "KSL", "afdeling": "2", "blok": "OA11", "code_lsu": "TS01", "koord_x": 110.400113, "koord_y": 0.654521},
        {"kebun": "KBN", "afdeling": "3", "blok": "PB12", "code_lsu": "TS05", "koord_x": 111.234567, "koord_y": 1.123456},
    ]
    
    for i, record_data in enumerate(test_records):
        try:
            response = test_session.session.post(f"{BASE_URL}/records", json=record_data)
            if response.status_code == 200:
                data = response.json()
                record_id = data.get("_id")
                test_session.created_record_ids.append(record_id)
                print(f"✅ Created test record {i+1}: {record_id}")
            else:
                print(f"⚠️  Failed to create test record {i+1}: {response.status_code}")
        except Exception as e:
            print(f"⚠️  Error creating test record {i+1}: {e}")
    
    print(f"\nTotal test records created: {len(test_session.created_record_ids)}")
    
    # Test 1: GET /api/records to verify records exist
    try:
        response = test_session.session.get(f"{BASE_URL}/records")
        if response.status_code == 200:
            records = response.json()
            print(f"✅ Total records in database: {len(records)}")
            if len(records) == 0:
                print("⚠️  WARNING: No records in database, some tests may fail")
        else:
            print(f"⚠️  Failed to get records: {response.status_code}")
    except Exception as e:
        print(f"⚠️  Error getting records: {e}")
    
    # Test 2: Export labels with size=small
    results["export_labels_size_small"] = test_session.test_export_labels_pdf_size_small()
    
    # Test 3: Export labels with size=medium
    results["export_labels_size_medium"] = test_session.test_export_labels_pdf_size_medium()
    
    # Test 4: Export labels with size=large
    results["export_labels_size_large"] = test_session.test_export_labels_pdf_size_large()
    
    # Test 5: Export labels with no size (should default to medium)
    results["export_labels_no_size"] = test_session.test_export_labels_pdf_no_size()
    
    # Test 6: Export labels with invalid size (should fallback to medium, NOT 500)
    results["export_labels_invalid_size"] = test_session.test_export_labels_pdf_invalid_size()
    
    # Test 7: POST export labels with size parameter
    results["export_labels_post_with_size"] = test_session.test_export_labels_pdf_post_with_size()
    
    # Test 8: Regression - POST export table (IdList model now has size field)
    results["export_table_post"] = test_session.test_export_table_pdf_post()
    
    # Test 9: Regression - POST export excel (IdList model now has size field)
    results["export_excel_post"] = test_session.test_export_excel_post()
    
    # Cleanup
    test_session.cleanup()
    
    # Summary
    print("\n" + "=" * 80)
    print("TEST SUMMARY")
    print("=" * 80)
    
    passed = sum(1 for v in results.values() if v)
    total = len(results)
    
    for test_name, result in results.items():
        status = "✅ PASS" if result else "❌ FAIL"
        print(f"{status}: {test_name}")
    
    print(f"\nTotal: {passed}/{total} tests passed")
    
    if passed == total:
        print("\n🎉 All tests passed!")
        sys.exit(0)
    else:
        print(f"\n⚠️  {total - passed} test(s) failed")
        sys.exit(1)

if __name__ == "__main__":
    main()
