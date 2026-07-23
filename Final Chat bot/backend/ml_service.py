import os
import joblib
import numpy as np
import pandas as pd
from xgboost import XGBClassifier
from database import run_query

MODEL_DIR = os.path.join(os.path.dirname(__file__), "models")
MODEL_PATH = os.path.join(MODEL_DIR, "asthma_xgb_model.joblib")

FEATURES = [
    "age", "gender", "bmi", "smoking", "physical_activity", "diet_quality",
    "sleep_quality", "pollution_exposure", "pollen_exposure", "dust_exposure",
    "pet_allergy", "family_history_asthma", "history_of_allergies", "eczema",
    "hay_fever", "gastroesophageal_reflux", "lung_function_fev1",
    "lung_function_fvc", "wheezing", "shortness_of_breath", "chest_tightness",
    "coughing", "nighttime_symptoms", "exercise_induced",
]

_model = None  


def _load_patient_dataframe() -> pd.DataFrame:
    rows = run_query("SELECT * FROM patient.fact_patient")
    df = pd.DataFrame(rows)
    if df.empty:
        raise ValueError("patient.fact_patient فاضية — ارفع بيانات المرضى للقاعدة الأول")
    return df


def _train() -> XGBClassifier:
    df = _load_patient_dataframe()
    X = df[FEATURES].astype(float)
    y = df["diagnosis"].astype(int)

    num_neg = (y == 0).sum()
    num_pos = (y == 1).sum()
    scale_weight = num_neg / num_pos if num_pos > 0 else 1.0

    model = XGBClassifier(scale_pos_weight=scale_weight, random_state=42, eval_metric="logloss")
    model.fit(X, y)
    return model


def get_model() -> XGBClassifier:
    global _model
    if _model is not None:
        return _model

    if os.path.exists(MODEL_PATH):
        _model = joblib.load(MODEL_PATH)
        return _model

    _model = _train()
    try:
        os.makedirs(MODEL_DIR, exist_ok=True)
        joblib.dump(_model, MODEL_PATH)
    except Exception:
        pass
    return _model


def retrain() -> dict:
    global _model
    _model = _train()
    try:
        os.makedirs(MODEL_DIR, exist_ok=True)
        joblib.dump(_model, MODEL_PATH)
    except Exception:
        pass
    return {"status": "retrained", "n_features": len(FEATURES)}


def predict_from_patient_row(patient: dict) -> dict:
    model = get_model()
    try:
        x = np.array([[float(patient[col]) for col in FEATURES]])
    except KeyError as e:
        raise ValueError(f"Missing feature column in patient data: {e}")

    label = int(model.predict(x)[0])
    proba = float(model.predict_proba(x)[0][1])

    return {
        "predicted_label": bool(label),
        "predicted_probability": round(proba, 4),
        "model_name": "XGBoost",
    }
