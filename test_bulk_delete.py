#!/usr/bin/env python3
"""
Backend API test for Bulk Delete endpoint
Testing: POST /api/records/delete-bulk
CRITICAL: Only deletes test records created by this script, NOT production data
"""
import requests
import json
import sys

# Base URL from frontend/.env
BASE_URL = "https://epcs-nasrul.preview.emergentagent.com/api"

# Test credentials
ADMIN_EMAIL = "admin@kebun.id"
ADMIN_PASSWORD = "admin123"

class BulkDeleteTest:
    def __init__(self):
        self.session = requests.Session()
        self.session.headers.update({"Content-Type": "application/json"})
        self.initial_count = 0
        self.test_record_ids = []
        
    def login(self) -> bool:
        """Login and get JWT cookie"""
        print("\n=== STEP 0: Login ===")
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
    
    def get_record_count(self) -> int:
        """Get current total record count"""
        try:
            response = self.session.get(f"{BASE_URL}/records")
            if response.status_code == 200:
                records = response.json()
                return len(records)
            else:
                print(f"⚠️  Failed to get records: {response.status_code}")
                return -1
        except Exception as e:
            print(f"⚠️  Error getting records: {e}")
            return -1
    
    def verify_record_exists(self, record_id: str) -> bool:
        """Check if a specific record exists"""
        try:
            response = self.session.get(f"{BASE_URL}/records")
            if response.status_code == 200:
                records = response.json()
                for record in records:
                    if record.get("_id") == record_id:
                        return True
                return False
            else:
                return False
        except Exception as e:
            print(f"⚠️  Error checking record existence: {e}")
            return False
    
    def test_step_1_record_initial_count(self) -> bool:
        """STEP 1: Record the current total count N"""
        print("\n=== STEP 1: Record initial count ===")
        
        self.initial_count = self.get_record_count()
        if self.initial_count < 0:
            print(f"❌ FAIL: Could not get initial record count")
            return False
        
        print(f"✅ Initial record count: {self.initial_count}")
        print(f"   (Expected ~3268 production records)")
        return True
    
    def test_step_2_create_test_records(self) -> bool:
        """STEP 2: Create 3 NEW test records with distinct data"""
        print("\n=== STEP 2: Create 3 test records ===")
        
        test_records = [
            {
                "kebun": "ZZTEST",
                "afdeling": "9",
                "blok": "BULK1",
                "code_lsu": "T01",
                "koord_x": 100.1,
                "koord_y": 1.1
            },
            {
                "kebun": "ZZTEST",
                "afdeling": "9",
                "blok": "BULK2",
                "code_lsu": "T01",
                "koord_x": 100.1,
                "koord_y": 1.1
            },
            {
                "kebun": "ZZTEST",
                "afdeling": "9",
                "blok": "BULK3",
                "code_lsu": "T01",
                "koord_x": 100.1,
                "koord_y": 1.1
            }
        ]
        
        for i, record_data in enumerate(test_records, 1):
            print(f"\nCreating test record {i}/3:")
            print(f"  Data: {json.dumps(record_data, indent=2)}")
            
            try:
                response = self.session.post(f"{BASE_URL}/records", json=record_data)
                print(f"  Status: {response.status_code}")
                
                if response.status_code != 200:
                    print(f"❌ FAIL: Failed to create test record {i}: {response.text}")
                    return False
                
                data = response.json()
                record_id = data.get("_id")
                
                if not record_id:
                    print(f"❌ FAIL: No _id returned for test record {i}")
                    return False
                
                self.test_record_ids.append(record_id)
                print(f"✅ Created test record {i}: _id={record_id}")
                
            except Exception as e:
                print(f"❌ FAIL: Error creating test record {i}: {e}")
                return False
        
        print(f"\n✅ Successfully created 3 test records")
        print(f"   IDs: {self.test_record_ids}")
        
        # Verify count increased by 3
        current_count = self.get_record_count()
        expected_count = self.initial_count + 3
        
        if current_count == expected_count:
            print(f"✅ Record count increased correctly: {self.initial_count} -> {current_count}")
        else:
            print(f"⚠️  WARNING: Expected count {expected_count}, got {current_count}")
        
        return True
    
    def test_step_3_bulk_delete_two_records(self) -> bool:
        """STEP 3: POST /api/records/delete-bulk with 2 ids -> expect deleted: 2"""
        print("\n=== STEP 3: Bulk delete 2 records ===")
        
        if len(self.test_record_ids) < 2:
            print(f"❌ FAIL: Not enough test records created")
            return False
        
        id1 = self.test_record_ids[0]
        id2 = self.test_record_ids[1]
        
        body = {"ids": [id1, id2]}
        print(f"Request body: {json.dumps(body, indent=2)}")
        
        try:
            response = self.session.post(f"{BASE_URL}/records/delete-bulk", json=body)
            print(f"Status: {response.status_code}")
            
            if response.status_code != 200:
                print(f"❌ FAIL: Expected 200, got {response.status_code}")
                print(f"Response: {response.text}")
                return False
            
            data = response.json()
            print(f"Response: {json.dumps(data, indent=2)}")
            
            # Verify response structure
            if "ok" not in data or "deleted" not in data:
                print(f"❌ FAIL: Response missing 'ok' or 'deleted' fields")
                return False
            
            if data.get("ok") != True:
                print(f"❌ FAIL: Expected ok=true, got ok={data.get('ok')}")
                return False
            
            if data.get("deleted") != 2:
                print(f"❌ FAIL: Expected deleted=2, got deleted={data.get('deleted')}")
                return False
            
            print(f"✅ PASS: Bulk delete returned correct response: ok=true, deleted=2")
            return True
            
        except Exception as e:
            print(f"❌ FAIL: Error during bulk delete: {e}")
            return False
    
    def test_step_4_verify_deletion(self) -> bool:
        """STEP 4: Verify id1 and id2 are GONE, but id3 still present"""
        print("\n=== STEP 4: Verify deletion ===")
        
        if len(self.test_record_ids) < 3:
            print(f"❌ FAIL: Not enough test records")
            return False
        
        id1 = self.test_record_ids[0]
        id2 = self.test_record_ids[1]
        id3 = self.test_record_ids[2]
        
        # Check id1 is gone
        print(f"\nChecking if id1 ({id1}) is deleted...")
        if self.verify_record_exists(id1):
            print(f"❌ FAIL: id1 still exists (should be deleted)")
            return False
        else:
            print(f"✅ PASS: id1 is deleted")
        
        # Check id2 is gone
        print(f"\nChecking if id2 ({id2}) is deleted...")
        if self.verify_record_exists(id2):
            print(f"❌ FAIL: id2 still exists (should be deleted)")
            return False
        else:
            print(f"✅ PASS: id2 is deleted")
        
        # Check id3 still exists
        print(f"\nChecking if id3 ({id3}) still exists...")
        if not self.verify_record_exists(id3):
            print(f"❌ FAIL: id3 is deleted (should still exist)")
            return False
        else:
            print(f"✅ PASS: id3 still exists")
        
        # Verify count
        current_count = self.get_record_count()
        expected_count = self.initial_count + 1  # 3 created, 2 deleted = +1
        
        print(f"\nCurrent count: {current_count}")
        print(f"Expected count: {expected_count} (initial {self.initial_count} + 1 remaining test record)")
        
        if current_count == expected_count:
            print(f"✅ PASS: Record count is correct")
        else:
            print(f"⚠️  WARNING: Count mismatch (expected {expected_count}, got {current_count})")
        
        return True
    
    def test_step_5_empty_ids_array(self) -> bool:
        """STEP 5: POST /api/records/delete-bulk with empty ids -> expect deleted: 0"""
        print("\n=== STEP 5: Bulk delete with empty ids array ===")
        
        body = {"ids": []}
        print(f"Request body: {json.dumps(body, indent=2)}")
        
        try:
            response = self.session.post(f"{BASE_URL}/records/delete-bulk", json=body)
            print(f"Status: {response.status_code}")
            
            if response.status_code != 200:
                print(f"❌ FAIL: Expected 200, got {response.status_code}")
                print(f"Response: {response.text}")
                return False
            
            data = response.json()
            print(f"Response: {json.dumps(data, indent=2)}")
            
            # Verify response
            if data.get("ok") != True:
                print(f"❌ FAIL: Expected ok=true, got ok={data.get('ok')}")
                return False
            
            if data.get("deleted") != 0:
                print(f"❌ FAIL: Expected deleted=0, got deleted={data.get('deleted')}")
                return False
            
            print(f"✅ PASS: Empty ids array handled correctly: ok=true, deleted=0")
            return True
            
        except Exception as e:
            print(f"❌ FAIL: Error during bulk delete with empty ids: {e}")
            return False
    
    def test_step_6_delete_last_record(self) -> bool:
        """STEP 6: POST /api/records/delete-bulk with id3 -> expect deleted: 1"""
        print("\n=== STEP 6: Delete last test record ===")
        
        if len(self.test_record_ids) < 3:
            print(f"❌ FAIL: Not enough test records")
            return False
        
        id3 = self.test_record_ids[2]
        
        body = {"ids": [id3]}
        print(f"Request body: {json.dumps(body, indent=2)}")
        
        try:
            response = self.session.post(f"{BASE_URL}/records/delete-bulk", json=body)
            print(f"Status: {response.status_code}")
            
            if response.status_code != 200:
                print(f"❌ FAIL: Expected 200, got {response.status_code}")
                print(f"Response: {response.text}")
                return False
            
            data = response.json()
            print(f"Response: {json.dumps(data, indent=2)}")
            
            # Verify response
            if data.get("ok") != True:
                print(f"❌ FAIL: Expected ok=true, got ok={data.get('ok')}")
                return False
            
            if data.get("deleted") != 1:
                print(f"❌ FAIL: Expected deleted=1, got deleted={data.get('deleted')}")
                return False
            
            print(f"✅ PASS: Last record deleted correctly: ok=true, deleted=1")
            
            # Verify id3 is gone
            print(f"\nVerifying id3 ({id3}) is deleted...")
            if self.verify_record_exists(id3):
                print(f"❌ FAIL: id3 still exists (should be deleted)")
                return False
            else:
                print(f"✅ PASS: id3 is deleted")
            
            return True
            
        except Exception as e:
            print(f"❌ FAIL: Error during bulk delete: {e}")
            return False
    
    def test_step_7_verify_final_count(self) -> bool:
        """STEP 7: Verify count returns to original N"""
        print("\n=== STEP 7: Verify final count ===")
        
        final_count = self.get_record_count()
        
        print(f"Initial count: {self.initial_count}")
        print(f"Final count:   {final_count}")
        
        if final_count == self.initial_count:
            print(f"✅ PASS: Count returned to original value (cleanup complete)")
            print(f"   No test data left in database")
            return True
        else:
            print(f"❌ FAIL: Count mismatch!")
            print(f"   Expected: {self.initial_count}")
            print(f"   Got:      {final_count}")
            print(f"   Difference: {final_count - self.initial_count}")
            return False
    
    def test_step_8_nonexistent_id(self) -> bool:
        """STEP 8 (Optional): Test with non-existent id -> should return deleted: 0"""
        print("\n=== STEP 8 (Optional): Bulk delete with non-existent id ===")
        
        # Use a valid-format-but-nonexistent 24-hex Mongo ObjectId
        fake_id = "0123456789abcdef01234567"
        
        body = {"ids": [fake_id]}
        print(f"Request body: {json.dumps(body, indent=2)}")
        print(f"Note: Using valid-format-but-nonexistent 24-hex id")
        
        try:
            response = self.session.post(f"{BASE_URL}/records/delete-bulk", json=body)
            print(f"Status: {response.status_code}")
            
            if response.status_code == 500:
                print(f"❌ FAIL: Got 500 error (should handle gracefully)")
                print(f"Response: {response.text}")
                return False
            
            if response.status_code != 200:
                print(f"⚠️  WARNING: Expected 200, got {response.status_code}")
                print(f"Response: {response.text}")
                return False
            
            data = response.json()
            print(f"Response: {json.dumps(data, indent=2)}")
            
            # Verify response
            if data.get("ok") != True:
                print(f"❌ FAIL: Expected ok=true, got ok={data.get('ok')}")
                return False
            
            if data.get("deleted") != 0:
                print(f"⚠️  WARNING: Expected deleted=0 for non-existent id, got deleted={data.get('deleted')}")
            else:
                print(f"✅ PASS: Non-existent id handled correctly: ok=true, deleted=0")
            
            return True
            
        except Exception as e:
            print(f"❌ FAIL: Error during bulk delete with non-existent id: {e}")
            return False

def main():
    print("=" * 80)
    print("DATA EPCS TAGGING - Bulk Delete Endpoint Test")
    print("Testing: POST /api/records/delete-bulk")
    print("CRITICAL: Only deletes test records (kebun=ZZTEST), NOT production data")
    print("=" * 80)
    
    test = BulkDeleteTest()
    
    # Login first
    if not test.login():
        print("\n❌ CRITICAL: Login failed, cannot proceed with tests")
        sys.exit(1)
    
    results = {}
    
    # Run all test steps in sequence
    results["step_1_record_initial_count"] = test.test_step_1_record_initial_count()
    
    if results["step_1_record_initial_count"]:
        results["step_2_create_test_records"] = test.test_step_2_create_test_records()
    else:
        print("\n❌ CRITICAL: Step 1 failed, cannot proceed")
        sys.exit(1)
    
    if results["step_2_create_test_records"]:
        results["step_3_bulk_delete_two"] = test.test_step_3_bulk_delete_two_records()
    else:
        print("\n❌ CRITICAL: Step 2 failed, cannot proceed")
        sys.exit(1)
    
    if results["step_3_bulk_delete_two"]:
        results["step_4_verify_deletion"] = test.test_step_4_verify_deletion()
    else:
        print("\n⚠️  WARNING: Step 3 failed, continuing with remaining tests")
        results["step_4_verify_deletion"] = False
    
    results["step_5_empty_ids"] = test.test_step_5_empty_ids_array()
    
    if results["step_2_create_test_records"] and results["step_3_bulk_delete_two"]:
        results["step_6_delete_last"] = test.test_step_6_delete_last_record()
    else:
        print("\n⚠️  WARNING: Skipping step 6 (previous steps failed)")
        results["step_6_delete_last"] = False
    
    if results["step_6_delete_last"]:
        results["step_7_verify_final_count"] = test.test_step_7_verify_final_count()
    else:
        print("\n⚠️  WARNING: Skipping step 7 (step 6 failed)")
        results["step_7_verify_final_count"] = False
    
    results["step_8_nonexistent_id"] = test.test_step_8_nonexistent_id()
    
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
    
    # Final safety check
    final_count = test.get_record_count()
    print(f"\n=== SAFETY CHECK ===")
    print(f"Initial count: {test.initial_count}")
    print(f"Final count:   {final_count}")
    
    if final_count == test.initial_count:
        print(f"✅ SAFETY: No production data affected (count unchanged)")
    else:
        print(f"⚠️  WARNING: Count changed by {final_count - test.initial_count}")
        print(f"   This may indicate test records were not fully cleaned up")
    
    if passed == total:
        print("\n🎉 All tests passed!")
        sys.exit(0)
    else:
        print(f"\n⚠️  {total - passed} test(s) failed")
        sys.exit(1)

if __name__ == "__main__":
    main()
