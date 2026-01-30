# test_model.py - Test the trained triage model

import joblib
import numpy as np

# Load the LogisticRegression model (for probability scores)
model = joblib.load('triage_model_lr.pkl')
print('Model loaded successfully!')
print(f'Model type: {type(model).__name__}')

# Test cases
test_cases = [
    {'name': 'Critical: elderly + chest pain + low SpO2', 'age': 75, 'hr': 110, 'sbp': 90, 'spo2': 88, 'chest_pain': 1, 'breathless': 1, 'comorbid': 2},
    {'name': 'Low priority: young healthy', 'age': 25, 'hr': 80, 'sbp': 120, 'spo2': 99, 'chest_pain': 0, 'breathless': 0, 'comorbid': 0},
    {'name': 'Medium: middle-aged chest pain', 'age': 65, 'hr': 95, 'sbp': 140, 'spo2': 94, 'chest_pain': 1, 'breathless': 0, 'comorbid': 1},
    {'name': 'Low: routine checkup', 'age': 45, 'hr': 72, 'sbp': 135, 'spo2': 98, 'chest_pain': 0, 'breathless': 0, 'comorbid': 0},
    {'name': 'High: tachycardia + breathless', 'age': 55, 'hr': 145, 'sbp': 100, 'spo2': 91, 'chest_pain': 0, 'breathless': 1, 'comorbid': 1},
]

print('\nTest Predictions:')
print('-' * 70)
for case in test_cases:
    features = np.array([[case['age'], case['hr'], case['sbp'], case['spo2'], case['chest_pain'], case['breathless'], case['comorbid']]])
    prob = model.predict_proba(features)[0][1]
    score = int(prob * 100)
    status = 'CRITICAL' if score >= 85 else 'HIGH' if score >= 50 else 'LOW'
    print(f"{case['name']}")
    print(f"  -> Triage Score: {score}/100 ({status})")
    print()

# Feature coefficients
print('\nFeature Coefficients:')
print('-' * 40)
feature_names = ['age', 'hr', 'sbp', 'spo2', 'chest_pain', 'breathless', 'comorbid']
for feat, coef in zip(feature_names, model.coef_[0]):
    sign = '+' if coef > 0 else ''
    print(f"  {feat:15s}: {sign}{coef:.4f}")
