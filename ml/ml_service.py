# ml_service.py
# FastAPI service that serves triage predictions using the trained model

from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
import joblib
import os
from typing import List

class PredictRequest(BaseModel):
    age: int
    hr: int
    sbp: int
    spo2: int
    temp: float = 37.0  # Default normal temperature
    rr: int = 16  # Default normal respiratory rate
    injury_score: int = 0  # New core feature
    symptoms: List[str]
    comorbid: int = 0

class PredictResponse(BaseModel):
    probability: float
    triage_score: int
    method: str
    features_used: dict

app = FastAPI(
    title="HT-1 Triage ML Service",
    description="Lightweight ML service for patient triage scoring",
    version="1.0.0"
)

# CORS middleware for cross-origin requests
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Load model at startup
model = None
model_path = 'triage_model.pkl'

@app.on_event("startup")
async def load_model():
    global model
    if os.path.exists(model_path):
        model = joblib.load(model_path)
        print(f"✓ Model loaded from {model_path}")
    else:
        print(f"⚠ Warning: Model file '{model_path}' not found. Run generate_and_train.py first.")

@app.get("/")
def root():
    return {
        "service": "HT-1 Triage ML Service",
        "status": "running",
        "model_loaded": model is not None
    }

@app.get("/health")
def health():
    return {
        "status": "healthy",
        "model_loaded": model is not None
    }

@app.post("/predict", response_model=PredictResponse)
def predict(req: PredictRequest):
    if model is None:
        raise HTTPException(
            status_code=503,
            detail="Model not loaded. Please train the model first using generate_and_train.py"
        )
    
    # Extract features in the correct order (must match training order)
    # Order: age, hr, sbp, spo2, temp, rr, chest_pain, breathless, comorbid, injury_score
    chest_pain = 1 if 'chest_pain' in req.symptoms else 0
    breathless = 1 if 'shortness_of_breath' in req.symptoms else 0
    
    features = [[
        req.age,
        req.hr,
        req.sbp,
        req.spo2,
        req.temp,
        req.rr,
        chest_pain,
        breathless,
        req.comorbid,
        req.injury_score
    ]]
    
    # Get probability
    prob = model.predict_proba(features)[0][1]
    score = int(round(prob * 100))
    
    # Feature contributions for explainability
    # Feature contributions for explainability
    feature_names = ['age', 'hr', 'sbp', 'spo2', 'temp', 'rr', 'chest_pain', 'breathless', 'comorbid', 'injury_score']
    features_used = {
        name: float(val) for name, val in zip(feature_names, features[0])
    }
    
    return {
        'probability': float(prob),
        'triage_score': score,
        'method': 'ml',
        'features_used': features_used
    }

if __name__ == "__main__":
    import uvicorn
    port = int(os.getenv("ML_PORT", 8000))
    uvicorn.run(app, host="0.0.0.0", port=port)
