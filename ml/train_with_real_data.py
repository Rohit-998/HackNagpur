# train_with_real_data.py
# Trains a triage model using REAL hospital data uploaded by user
# Combines multiple datasets for robust training

import pandas as pd
import numpy as np
from sklearn.linear_model import LogisticRegression
from sklearn.ensemble import RandomForestClassifier, GradientBoostingClassifier
from sklearn.model_selection import train_test_split, cross_val_score
from sklearn.preprocessing import StandardScaler
from sklearn.metrics import classification_report, accuracy_score
import joblib
import os

print("=" * 60)
print("🏥 HT-1 Triage Model Training with Real Hospital Data")
print("=" * 60)

DATA_DIR = "../data_for_ml"

# =============================================================================
# DATASET 1: Synthetic Medical Triage (18,000 samples)
# Features: age, heart_rate, sbp, spo2, temperature, symptom_count, 
#           comorbid_count, previous_er_visits, arrival_mode, triage_level
# =============================================================================

print("\n📊 Loading synthetic_medical_triage.csv...")
df_synthetic = pd.read_csv(os.path.join(DATA_DIR, "synthetic_medical_triage.csv"))
print(f"   Loaded {len(df_synthetic)} samples")
print(f"   Columns: {list(df_synthetic.columns)}")

# Map arrival_mode to numeric
df_synthetic['arrival_mode_num'] = df_synthetic['arrival_mode'].map({
    'walk_in': 0,
    'ambulance': 1
}).fillna(0)

# Triage level: 0=low, 1=medium, 2=high, 3=critical
# Convert to binary: 0,1 = low priority (0), 2,3 = high priority (1)
df_synthetic['high_priority'] = (df_synthetic['triage_level'] >= 2).astype(int)

print(f"   High priority distribution: {df_synthetic['high_priority'].value_counts().to_dict()}")

# =============================================================================
# DATASET 2: Real ER Data (1,267 samples with KTAS triage)
# KTAS: 1=Resuscitation, 2=Emergency, 3=Urgent, 4=Less Urgent, 5=Non-urgent
# =============================================================================

print("\n📊 Loading data.csv (real ER data with KTAS triage)...")
df_real = pd.read_csv(os.path.join(DATA_DIR, "data.csv"), sep=';', encoding='latin-1')
print(f"   Loaded {len(df_real)} real emergency room cases")
print(f"   KTAS distribution: {df_real['KTAS_expert'].value_counts().sort_index().to_dict()}")

# Map KTAS to high priority (1,2,3 = high/critical; 4,5 = low priority)
df_real['high_priority'] = (df_real['KTAS_expert'] <= 3).astype(int)

# Extract vital signs (handle missing values)
df_real['Age'] = pd.to_numeric(df_real['Age'], errors='coerce')
df_real['HR'] = pd.to_numeric(df_real['HR'], errors='coerce')
df_real['SBP'] = pd.to_numeric(df_real['SBP'], errors='coerce')
df_real['Saturation'] = pd.to_numeric(df_real['Saturation'], errors='coerce')
df_real['BT'] = pd.to_numeric(df_real['BT'], errors='coerce')
df_real['RR'] = pd.to_numeric(df_real['RR'], errors='coerce')
df_real['NRS_pain'] = pd.to_numeric(df_real['NRS_pain'], errors='coerce')

# Injury indicator
df_real['is_injury'] = (df_real['Injury'] == 2).astype(int)  # 2 = injury in dataset

# Arrival mode (1=walk, 2=119 ambulance, 3=private, 4=transfer)
df_real['arrival_severity'] = df_real['Arrival mode'].map({
    1: 0,  # walk = low
    3: 0,  # private = low  
    2: 1,  # ambulance = high
    4: 1   # transfer = high
}).fillna(0)

print(f"   High priority distribution: {df_real['high_priority'].value_counts().to_dict()}")

# =============================================================================
# COMBINE DATASETS - Create unified feature set
# =============================================================================

print("\n🔄 Combining datasets with unified features...")

# Features we'll use (matching ml_service.py expectations):
# age, hr, sbp, spo2, chest_pain, breathless, comorbid

# From synthetic dataset
X_synthetic = pd.DataFrame({
    'age': df_synthetic['age'],
    'hr': df_synthetic['heart_rate'],
    'sbp': df_synthetic['systolic_blood_pressure'],
    'spo2': df_synthetic['oxygen_saturation'],
    'chest_pain': (df_synthetic['pain_level'] >= 6).astype(int),  # High pain = potential chest pain
    'breathless': (df_synthetic['oxygen_saturation'] < 94).astype(int),  # Low SpO2 = breathing issue
    'comorbid': df_synthetic['chronic_disease_count'].clip(0, 2)
})
y_synthetic = df_synthetic['high_priority']

# From real ER dataset
# Detect chest pain and breathlessness from chief complaint
df_real['Chief_complain'] = df_real['Chief_complain'].fillna('').str.lower()
df_real['chest_pain_detected'] = df_real['Chief_complain'].str.contains(
    'chest|angina|cardiac|coronary|heart', case=False
).astype(int)
df_real['breathless_detected'] = df_real['Chief_complain'].str.contains(
    'breath|dyspnea|sob|respiratory|oxygen', case=False
).astype(int)

X_real = pd.DataFrame({
    'age': df_real['Age'],
    'hr': df_real['HR'],
    'sbp': df_real['SBP'],
    'spo2': df_real['Saturation'],
    'chest_pain': df_real['chest_pain_detected'],
    'breathless': df_real['breathless_detected'],
    'comorbid': df_real['is_injury']  # Using injury as comorbid indicator
})
y_real = df_real['high_priority']

# Fill missing values with medians from synthetic dataset
for col in X_real.columns:
    if X_real[col].isna().sum() > 0:
        median_val = X_synthetic[col].median()
        X_real[col] = X_real[col].fillna(median_val)
        print(f"   Filled {col} NaN with median: {median_val:.1f}")

# Combine datasets
X_combined = pd.concat([X_synthetic, X_real], ignore_index=True)
y_combined = pd.concat([y_synthetic, y_real], ignore_index=True)

print(f"\n📊 Combined dataset: {len(X_combined)} samples")
print(f"   Features: {list(X_combined.columns)}")
print(f"   High priority: {y_combined.sum()} ({y_combined.mean()*100:.1f}%)")
print(f"   Low priority:  {len(y_combined) - y_combined.sum()} ({(1-y_combined.mean())*100:.1f}%)")

# =============================================================================
# TRAIN-TEST SPLIT
# =============================================================================

X_train, X_test, y_train, y_test = train_test_split(
    X_combined, y_combined, test_size=0.2, random_state=42, stratify=y_combined
)

print(f"\n📊 Split: {len(X_train)} train / {len(X_test)} test")

# =============================================================================
# TRAIN MULTIPLE MODELS & COMPARE
# =============================================================================

print("\n" + "=" * 60)
print("🧠 Training Multiple Models...")
print("=" * 60)

models = {
    'LogisticRegression': LogisticRegression(max_iter=1000, random_state=42, class_weight='balanced'),
    'RandomForest': RandomForestClassifier(n_estimators=100, random_state=42, class_weight='balanced'),
    'GradientBoosting': GradientBoostingClassifier(n_estimators=100, random_state=42)
}

best_model = None
best_accuracy = 0
best_model_name = ""

for name, model in models.items():
    print(f"\n🔄 Training {name}...")
    model.fit(X_train, y_train)
    
    train_acc = model.score(X_train, y_train)
    test_acc = model.score(X_test, y_test)
    
    # Cross-validation
    cv_scores = cross_val_score(model, X_combined, y_combined, cv=5)
    
    print(f"   Train Accuracy: {train_acc:.4f}")
    print(f"   Test Accuracy:  {test_acc:.4f}")
    print(f"   CV Mean:        {cv_scores.mean():.4f} (+/- {cv_scores.std()*2:.4f})")
    
    if test_acc > best_accuracy:
        best_accuracy = test_acc
        best_model = model
        best_model_name = name

print(f"\n🏆 Best Model: {best_model_name} (Test Accuracy: {best_accuracy:.4f})")

# =============================================================================
# DETAILED EVALUATION OF BEST MODEL
# =============================================================================

print("\n" + "=" * 60)
print(f"📊 Detailed Evaluation: {best_model_name}")
print("=" * 60)

y_pred = best_model.predict(X_test)
print("\n" + classification_report(y_test, y_pred, target_names=['Low Priority', 'High Priority']))

# Feature importance
if hasattr(best_model, 'feature_importances_'):
    print("\n📊 Feature Importance:")
    importances = pd.DataFrame({
        'feature': X_combined.columns,
        'importance': best_model.feature_importances_
    }).sort_values('importance', ascending=False)
    for _, row in importances.iterrows():
        bar = "█" * int(row['importance'] * 50)
        print(f"   {row['feature']:15s}: {row['importance']:.4f} {bar}")
elif hasattr(best_model, 'coef_'):
    print("\n📊 Feature Coefficients (LogisticRegression):")
    for feat, coef in zip(X_combined.columns, best_model.coef_[0]):
        sign = "+" if coef > 0 else ""
        print(f"   {feat:15s}: {sign}{coef:.4f}")

# =============================================================================
# SAVE THE BEST MODEL
# =============================================================================

model_path = 'triage_model.pkl'
joblib.dump(best_model, model_path)
print(f"\n✅ Model saved to '{model_path}'")

# Also save a LogisticRegression for backwards compatibility (ml_service expects predict_proba)
lr_model = models['LogisticRegression']
joblib.dump(lr_model, 'triage_model_lr.pkl')
print(f"✅ LogisticRegression backup saved to 'triage_model_lr.pkl'")

# =============================================================================
# TEST PREDICTIONS
# =============================================================================

print("\n" + "=" * 60)
print("🧪 Sample Predictions")
print("=" * 60)

test_cases = [
    {"age": 75, "hr": 110, "sbp": 90, "spo2": 88, "chest_pain": 1, "breathless": 1, "comorbid": 2},
    {"age": 25, "hr": 80, "sbp": 120, "spo2": 99, "chest_pain": 0, "breathless": 0, "comorbid": 0},
    {"age": 65, "hr": 95, "sbp": 140, "spo2": 94, "chest_pain": 1, "breathless": 0, "comorbid": 1},
    {"age": 45, "hr": 72, "sbp": 135, "spo2": 98, "chest_pain": 0, "breathless": 0, "comorbid": 0},
]

for i, case in enumerate(test_cases, 1):
    features = np.array([[case[f] for f in ['age', 'hr', 'sbp', 'spo2', 'chest_pain', 'breathless', 'comorbid']]])
    
    # Use LogisticRegression for probability
    prob = lr_model.predict_proba(features)[0][1]
    score = int(prob * 100)
    
    priority = "🔴 HIGH" if score >= 50 else "🟢 LOW"
    print(f"\n   Case {i}: {case}")
    print(f"   → Score: {score}/100 | Priority: {priority}")

print("\n" + "=" * 60)
print("✅ Training Complete!")
print("=" * 60)
print(f"\n📁 Files created:")
print(f"   - triage_model.pkl (Best model: {best_model_name})")
print(f"   - triage_model_lr.pkl (LogisticRegression for probability)")
print(f"\n🚀 Ready to use with ml_service.py!")
