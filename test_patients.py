#!/usr/bin/env python3
"""
Quick Test Script for HT-1 Triage System
Tests different priority levels to verify scoring works correctly
"""

import requests
import time

API_URL = "http://localhost:4000"

# Test patients covering all priority levels
test_patients = [
    {
        "name": "CRITICAL Patient",
        "data": {
            "device_patient_id": "TEST-CRITICAL-001",
            "age": 72,
            "sex": "male",
            "symptoms": ["chest_pain", "shortness_of_breath"],
            "vitals": {"hr": 145, "sbp": 85, "spo2": 88, "temp": 39.2, "rr": 28},
            "comorbid": 2
        },
        "expected_range": (85, 100),
        "priority": "🔴 CRITICAL"
    },
    {
        "name": "HIGH Priority Patient",
        "data": {
            "device_patient_id": "TEST-HIGH-001",
            "age": 55,
            "sex": "female",
            "symptoms": ["chest_pain"],
            "vitals": {"hr": 110, "sbp": 130, "spo2": 94, "temp": 37.8, "rr": 22},
            "comorbid": 1
        },
        "expected_range": (70, 84),
        "priority": "🟠 HIGH"
    },
    {
        "name": "MODERATE Priority Patient",
        "data": {
            "device_patient_id": "TEST-MODERATE-001",
            "age": 45,
            "sex": "other",
            "symptoms": ["abdominal_pain", "fever"],
            "vitals": {"hr": 95, "sbp": 120, "spo2": 97, "temp": 38.3, "rr": 18},
            "comorbid": 0
        },
        "expected_range": (50, 69),
        "priority": "🟡 MODERATE"
    },
    {
        "name": "LOW Priority Patient",
        "data": {
            "device_patient_id": "TEST-LOW-001",
            "age": 28,
            "sex": "female",
            "symptoms": ["headache"],
            "vitals": {"hr": 75, "sbp": 118, "spo2": 99, "temp": 36.8, "rr": 14},
            "comorbid": 0
        },
        "expected_range": (0, 49),
        "priority": "🟢 LOW"
    },
    {
        "name": "EXTREME CRITICAL Patient",
        "data": {
            "device_patient_id": "TEST-EXTREME-001",
            "age": 80,
            "sex": "male",
            "symptoms": ["chest_pain", "shortness_of_breath", "altered_consciousness"],
            "vitals": {"hr": 155, "sbp": 75, "spo2": 82, "temp": 40.1, "rr": 32},
            "comorbid": 3
        },
        "expected_range": (90, 100),
        "priority": "🚨 EXTREME"
    }
]

print("🏥 HT-1 Triage System - Automated Test")
print("=" * 60)
print()

# Test backend health
try:
    health = requests.get(f"{API_URL}/api/health")
    if health.status_code == 200:
        print("✅ Backend is healthy and running")
    else:
        print("❌ Backend health check failed")
        exit(1)
except Exception as e:
    print(f"❌ Cannot connect to backend: {e}")
    print("   Make sure backend is running on port 4000")
    exit(1)

print()
print("🧪 Testing Triage Scoring...")
print("-" * 60)

results = []

for i, test in enumerate(test_patients, 1):
    print(f"\n{i}. Testing: {test['priority']} - {test['name']}")
    print(f"   ID: {test['data']['device_patient_id']}")
    
    try:
        response = requests.post(f"{API_URL}/api/checkin", json=test['data'])
        
        if response.status_code == 200:
            data = response.json()
            patient = data['patient']
            score = patient['triage_score']
            method = patient['triage_method']
            
            min_score, max_score = test['expected_range']
            
            if min_score <= score <= max_score:
                status = "✅ PASS"
                results.append(True)
            else:
                status = "❌ FAIL"
                results.append(False)
            
            print(f"   Score: {score} (expected {min_score}-{max_score})")
            print(f"   Method: {method.upper()}")
            print(f"   Result: {status}")
            
            if score >= 85:
                print(f"   🚨 Critical alert triggered!")
                
        else:
            print(f"   ❌ FAIL: HTTP {response.status_code}")
            print(f"   Error: {response.text}")
            results.append(False)
            
    except Exception as e:
        print(f"   ❌ FAIL: {e}")
        results.append(False)
    
    time.sleep(0.5)  # Small delay between patients

print()
print("=" * 60)
print("📊 Test Summary")
print("=" * 60)

passed = sum(results)
total = len(results)
pass_rate = (passed / total * 100) if total > 0 else 0

print(f"Passed: {passed}/{total} ({pass_rate:.0f}%)")

if passed == total:
    print()
    print("🎉 ALL TESTS PASSED! Your triage system is working correctly!")
    print()
    print("Next steps:")
    print("1. Visit http://localhost:3000/dashboard to see the queue")
    print("2. Check the alerts feed for critical patients")
    print("3. Try http://localhost:3000/admin to adjust weights")
else:
    print()
    print("⚠️  Some tests failed. Check the output above for details.")

print()
print("=" * 60)
