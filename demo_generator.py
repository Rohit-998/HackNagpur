#!/usr/bin/env python3
"""
Demo Data Generator for HT-1 Triage System
Generates synthetic patient check-ins to populate the queue for demonstrations
"""

import requests
import random
import time

API_URL = "http://localhost:4000"

SYMPTOMS_POOL = [
    'chest_pain',
    'shortness_of_breath',
    'altered_consciousness',
    'abdominal_pain',
    'headache',
    'fever',
    'nausea',
    'bleeding',
    'trauma'
]

FIRST_NAMES = ['John', 'Mary', 'James', 'Patricia', 'Robert', 'Jennifer', 'Michael', 'Linda']
LAST_NAMES = ['Smith', 'Johnson', 'Williams', 'Brown', 'Jones', 'Garcia', 'Miller', 'Davis']

def generate_patient(index):
    """Generate a single synthetic patient"""
    # Critical patient (1 in 5)
    is_critical = random.random() < 0.2
    
    if is_critical:
        age = random.randint(65, 85)
        symptoms = random.sample(['chest_pain', 'shortness_of_breath', 'altered_consciousness'], k=random.randint(1, 2))
        hr = random.randint(120, 150)
        sbp = random.randint(75, 95)
        spo2 = random.randint(85, 92)
        comorbid = random.randint(1, 3)
    else:
        age = random.randint(18, 75)
        symptoms = random.sample(SYMPTOMS_POOL, k=random.randint(0, 2))
        hr = random.randint(60, 110)
        sbp = random.randint(100, 140)
        spo2 = random.randint(94, 100)
        comorbid = random.randint(0, 1)
    
    return {
        "device_patient_id": f"DEMO-{index:03d}",
        "age": age,
        "sex": random.choice(["male", "female", "other"]),
        "symptoms": symptoms,
        "vitals": {
            "hr": hr,
            "sbp": sbp,
            "spo2": spo2
        },
        "comorbid": comorbid
    }

def main():
    print("🏥 HT-1 Demo Data Generator")
    print("=" * 50)
    
    num_patients = int(input("How many patients to generate? (default: 10): ") or "10")
    delay = float(input("Delay between patients in seconds? (default: 1): ") or "1")
    
    print(f"\n📝 Generating {num_patients} patients with {delay}s delay...\n")
    
    for i in range(num_patients):
        patient = generate_patient(i + 1)
        
        try:
            resp = requests.post(f"{API_URL}/api/checkin", json=patient)
            
            if resp.status_code == 200:
                data = resp.json()
                score = data['patient']['triage_score']
                method = data['patient']['triage_method']
                
                indicator = "🚨" if score >= 85 else "⚠️" if score >= 70 else "✅"
                print(f"{indicator} Patient {i+1:2d}: {patient['device_patient_id']} | Score: {score:3d} | Method: {method.upper()}")
            else:
                print(f"❌ Patient {i+1}: Failed - {resp.status_code}")
                
        except Exception as e:
            print(f"❌ Patient {i+1}: Error - {str(e)}")
        
        if i < num_patients - 1:
            time.sleep(delay)
    
    print(f"\n✓ Generated {num_patients} patients successfully!")
    print(f"→ View dashboard at http://localhost:3000/dashboard")

if __name__ == "__main__":
    main()
