# generate_and_train.py
# Generates synthetic triage training data and trains a LogisticRegression model

import random
import pandas as pd
from sklearn.linear_model import LogisticRegression
from sklearn.model_selection import train_test_split
import joblib

print("Generating synthetic training data...")
rows = []
for _ in range(4000):
    age = random.randint(1, 90)
    hr = random.randint(50, 170)
    sbp = random.randint(70, 160)
    spo2 = random.randint(80, 100)
    chest_pain = 1 if random.random() < 0.12 else 0
    breathless = 1 if random.random() < 0.12 else 0
    comorbid = 0 if random.random() < 0.7 else (1 if random.random() < 0.8 else 2)

    # Label heuristic - synthetic high priority determination
    high_priority = 1 if (
        chest_pain == 1 or 
        breathless == 1 or 
        spo2 < 92 or 
        sbp < 90 or 
        hr > 130 or 
        age > 75
    ) else 0

    rows.append([age, hr, sbp, spo2, chest_pain, breathless, comorbid, high_priority])

cols = ['age', 'hr', 'sbp', 'spo2', 'chest_pain', 'breathless', 'comorbid', 'label']
df = pd.DataFrame(rows, columns=cols)

print(f"Generated {len(df)} samples")
print(f"High priority cases: {df['label'].sum()} ({df['label'].sum()/len(df)*100:.1f}%)")

# Split and train
X = df.drop('label', axis=1)
y = df['label']
X_train, X_test, y_train, y_test = train_test_split(X, y, test_size=0.2, random_state=42)

print("\nTraining LogisticRegression model...")
model = LogisticRegression(max_iter=1000, random_state=42)
model.fit(X_train, y_train)

train_acc = model.score(X_train, y_train)
val_acc = model.score(X_test, y_test)

print(f"Training accuracy: {train_acc:.3f}")
print(f"Validation accuracy: {val_acc:.3f}")

# Save model
joblib.dump(model, 'triage_model.pkl')
print("\nModel saved to 'triage_model.pkl'")

# Print feature importance (coefficients)
print("\nFeature coefficients:")
for feat, coef in zip(cols[:-1], model.coef_[0]):
    print(f"  {feat:20s}: {coef:+.3f}")
