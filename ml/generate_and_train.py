# generate_and_train.py
# Generates synthetic triage training data and trains a LogisticRegression model
# Now includes Temperature and Respiratory Rate

import random
import pandas as pd
from sklearn.linear_model import LogisticRegression
from sklearn.model_selection import train_test_split
import joblib

print("🏥 HT-1 Triage Model Training")
print("=" * 60)
print("Generating synthetic training data with 9 features...")
print("Features: age, hr, sbp, spo2, temp, rr, chest_pain, breathless, comorbid")
print()

rows = []
for _ in range(5000):
    age = random.randint(1, 90)
    hr = random.randint(50, 170)
    sbp = random.randint(70, 180)
    spo2 = random.randint(80, 100)
    
    # Temperature: Normal 36.1-37.2°C, Fever >37.5°C, High fever >38.5°C
    temp_rand = random.random()
    if temp_rand < 0.70:  # 70% normal
        temp = round(random.uniform(36.1, 37.2), 1)
    elif temp_rand < 0.85:  # 15% mild fever
        temp = round(random.uniform(37.3, 38.4), 1)
    elif temp_rand < 0.95:  # 10% high fever
        temp = round(random.uniform(38.5, 40.0), 1)
    else:  # 5% hypothermia or very high fever
        temp = round(random.uniform(35.0, 41.0), 1)
    
    # Respiratory Rate: Normal 12-20, Tachypnea >20, Bradypnea <12
    rr_rand = random.random()
    if rr_rand < 0.70:  # 70% normal
        rr = random.randint(12, 20)
    elif rr_rand < 0.85:  # 15% mild tachypnea
        rr = random.randint(21, 24)
    elif rr_rand < 0.95:  # 10% severe tachypnea
        rr = random.randint(25, 35)
    else:  # 5% bradypnea
        rr = random.randint(8, 11)
    
    chest_pain = 1 if random.random() < 0.12 else 0
    breathless = 1 if random.random() < 0.12 else 0
    comorbid = 0 if random.random() < 0.7 else (1 if random.random() < 0.8 else 2)

    # Injury Score (0-100): Usually 0, but sometimes high
    injury_rand = random.random()
    if injury_rand < 0.85:
        injury_score = 0
    elif injury_rand < 0.95:
        injury_score = random.randint(10, 40) # Minor
    else:
        injury_score = random.randint(50, 100) # Severe

    # Enhanced label heuristic - includes injury score
    high_priority = 1 if (
        chest_pain == 1 or 
        breathless == 1 or 
        spo2 < 92 or 
        sbp < 90 or 
        sbp > 160 or
        hr > 130 or 
        hr < 50 or
        age > 75 or
        temp > 38.5 or  # High fever
        temp < 36.0 or  # Hypothermia
        rr > 24 or      # Tachypnea
        rr < 10 or      # Bradypnea
        injury_score > 40 # Significant visible injury
    ) else 0

    rows.append([age, hr, sbp, spo2, temp, rr, chest_pain, breathless, comorbid, injury_score, high_priority])

cols = ['age', 'hr', 'sbp', 'spo2', 'temp', 'rr', 'chest_pain', 'breathless', 'comorbid', 'injury_score', 'label']
df = pd.DataFrame(rows, columns=cols)

# Save to CSV as requested
df.to_csv('data_for_ml.csv', index=False)
print(f"✓ Saved {len(df)} samples to 'data_for_ml.csv'")

print(f"✓ High priority cases: {df['label'].sum()} ({df['label'].sum()/len(df)*100:.1f}%)")
print()

# Data statistics
print("Dataset Statistics:")
print(f"  Temperature range: {df['temp'].min():.1f}°C - {df['temp'].max():.1f}°C")
print(f"  Respiratory Rate range: {df['rr'].min()} - {df['rr'].max()} breaths/min")
print(f"  Fever cases (>38.5°C): {(df['temp'] > 38.5).sum()}")
print(f"  Tachypnea cases (>24): {(df['rr'] > 24).sum()}")
print()

# Split and train
X = df.drop('label', axis=1)
y = df['label']
X_train, X_test, y_train, y_test = train_test_split(X, y, test_size=0.2, random_state=42)

print("Training LogisticRegression model...")
model = LogisticRegression(max_iter=1000, random_state=42)
model.fit(X_train, y_train)

train_acc = model.score(X_train, y_train)
val_acc = model.score(X_test, y_test)

print(f"✓ Training accuracy: {train_acc:.3f}")
print(f"✓ Validation accuracy: {val_acc:.3f}")
print()

# Save model
joblib.dump(model, 'triage_model.pkl')
print("✓ Model saved to 'triage_model.pkl'")
print()

# Print feature importance (coefficients)
print("Feature Coefficients (importance):")
print("-" * 60)
for feat, coef in zip(cols[:-1], model.coef_[0]):
    indicator = "🔴" if abs(coef) > 0.3 else "🟡" if abs(coef) > 0.15 else "🟢"
    print(f"  {indicator} {feat:20s}: {coef:+.3f}")

print()
print("=" * 60)
print("✓ Training complete! Model ready to use.")
print("=" * 60)
