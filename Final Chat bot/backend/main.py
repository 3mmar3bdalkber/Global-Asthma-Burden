import os
from typing import Optional

from fastapi import FastAPI, HTTPException, Query
from fastapi.middleware.cors import CORSMiddleware
from dotenv import load_dotenv

from pydantic import BaseModel

from database import run_query, run_proc, test_connection
from chat_context import build_grounding_context
import llm_service
import ml_service

load_dotenv()

app = FastAPI(title="AsthmAI Backend API", version="1.0.0")

allowed_origins = os.getenv(
    "ALLOWED_ORIGINS", "http://localhost:3000,http://127.0.0.1:5500"
).split(",")

app.add_middleware(
    CORSMiddleware,
    allow_origins=allowed_origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


@app.get("/api/health")
def health():
    try:
        test_connection()
        return {"status": "ok", "db": "connected"}
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"DB connection failed: {e}")


# GBD (Global Burden of Disease) endpoints

@app.get("/api/gbd/burden")
def get_burden(
    measure: Optional[str] = None,
    country: Optional[str] = None,
    year: Optional[int] = None,
    limit: Optional[int] = None,
):
    sql = "SELECT * FROM gbd.vw_burden WHERE 1=1"
    params = {}

    if measure:
        sql += " AND measure_name = :measure"
        params["measure"] = measure

    if country:
        sql += " AND location_name = :country"
        params["country"] = country

    if year:
        sql += " AND year = :year"
        params["year"] = year

    sql += " ORDER BY year"

    if limit:
        sql = sql.replace(
            "SELECT",
            f"SELECT TOP ({limit})",
            1
        )

    return run_query(sql, params)

@app.get("/api/gbd/country-latest")
def get_country_latest():
    return run_query("SELECT * FROM gbd.vw_country_latest")


@app.get("/api/gbd/summary")
def gbd_summary(country: Optional[str] = None, year: Optional[int] = None, measure: str = "Prevalence"):
    return run_proc(
        "dbo.sp_asthma_summary",
        {"Country": country, "Year": year, "MeasureName": measure},
    )


@app.get("/api/gbd/compare")
def gbd_compare(country_a: str, country_b: str):
    return run_proc(
        "gbd.sp_country_compare",
        {"CountryA": country_a, "CountryB": country_b},
    )


# Patient endpoints

@app.get("/api/patient/enriched")
def get_patients(limit: int = Query(5000, le=20000)):
    return run_query(f"SELECT TOP {limit} * FROM patient.vw_patient_enriched")


@app.get("/api/patient/{patient_id}")
def get_patient_by_id(patient_id: int):
    rows = run_query(
        "SELECT * FROM patient.vw_patient_enriched WHERE patient_id = :pid",
        {"pid": patient_id},
    )
    if not rows:
        raise HTTPException(status_code=404, detail="Patient not found")
    return rows[0]


@app.get("/api/patient/{patient_id}/risk-profile")
def patient_risk_profile(patient_id: int):
    rows = run_proc("patient.sp_patient_risk_profile", {"PatientId": patient_id})
    if not rows:
        raise HTTPException(status_code=404, detail="Patient not found")
    return rows


@app.get("/api/patient/risk-factor-summary")
def risk_factor_summary():
    return run_query("SELECT * FROM patient.vw_risk_factor_summary")


@app.get("/api/patient/local-vs-global")
def local_vs_global():
    return run_query("SELECT * FROM patient.vw_local_vs_global_prevalence")


# ML predictions (fact_prediction) 

@app.post("/api/patient/{patient_id}/predict")
def save_prediction(
    patient_id: int,
    model_name: str,
    predicted_label: bool,
    predicted_probability: float,
    is_best_model: bool = False,
):
    from database import engine
    from sqlalchemy import text

    with engine.begin() as conn:
        conn.execute(
            text(
                """
                INSERT INTO patient.fact_prediction
                    (patient_id, model_name, predicted_label, predicted_probability, is_best_model)
                VALUES
                    (:pid, :model, :label, :prob, :best)
                """
            ),
            {
                "pid": patient_id,
                "model": model_name,
                "label": predicted_label,
                "prob": predicted_probability,
                "best": is_best_model,
            },
        )
    return {"status": "saved"}


@app.post("/api/patient/{patient_id}/predict-ml")
def predict_ml(patient_id: int, save: bool = True):
    rows = run_query(
        "SELECT * FROM patient.vw_patient_enriched WHERE patient_id = :pid", {"pid": patient_id}
    )
    if not rows:
        raise HTTPException(status_code=404, detail="Patient not found")
    patient = rows[0]

    try:
        result = ml_service.predict_from_patient_row(patient)
    except FileNotFoundError as e:
        raise HTTPException(status_code=503, detail=str(e))
    except ValueError as e:
        raise HTTPException(status_code=422, detail=str(e))

    if save:
        from database import engine
        from sqlalchemy import text
        with engine.begin() as conn:
            conn.execute(
                text(
                    """
                    INSERT INTO patient.fact_prediction
                        (patient_id, model_name, predicted_label, predicted_probability, is_best_model)
                    VALUES (:pid, :model, :label, :prob, 1)
                    """
                ),
                {
                    "pid": patient_id,
                    "model": result["model_name"],
                    "label": result["predicted_label"],
                    "prob": result["predicted_probability"],
                },
            )

    return {"patient_id": patient_id, **result}


@app.get("/api/patient/{patient_id}/predictions")
def get_predictions(patient_id: int):
    return run_query(
        "SELECT * FROM patient.fact_prediction WHERE patient_id = :pid ORDER BY scored_at DESC",
        {"pid": patient_id},
    )

class ChatRequest(BaseModel):
    question: str
    lang: str = "en"  # "en" or "ar"


@app.post("/api/chat")
async def chat(req: ChatRequest):
    context_json = build_grounding_context(req.lang)

    if req.lang == "ar":
        system = (
            "أنت مساعد بيانات متخصص في الربو. أجب فقط بناءً على السياق الرقمي المرفق أدناه، "
            "ولا تختلق أي أرقام غير موجودة فيه. إذا لم يحتوِ السياق على إجابة، قل ذلك بوضوح."
        )
        prompt = f"سؤال المستخدم: {req.question}\n\nالسياق (JSON):\n{context_json}"
    else:
        system = (
            "You are a data-grounded asthma analytics assistant. Answer ONLY using the numeric "
            "context provided below — never invent numbers not present in it. If the context "
            "doesn't contain the answer, say so clearly."
        )
        prompt = f"User question: {req.question}\n\nContext (JSON):\n{context_json}"

    try:
        answer = await llm_service.generate(prompt, system=system, max_tokens=2000, temperature=0.4)
    except Exception as e:
        raise HTTPException(status_code=502, detail=f"LLM call failed: {e}")

    return {"answer": answer}


class GenerateRequest(BaseModel):
    prompt: str
    system: Optional[str] = None
    max_tokens: int = 1200
    temperature: float = 0.3


@app.post("/api/ai/generate")
async def ai_generate(req: GenerateRequest):
    try:
        text = await llm_service.generate(
            req.prompt, system=req.system, max_tokens=req.max_tokens, temperature=req.temperature
        )
    except Exception as e:
        raise HTTPException(status_code=502, detail=f"LLM call failed: {e}")
    return {"text": text}


# ML model retraining endpoint xgboost

@app.post("/api/patient/retrain-model")
def retrain_model():
    try:
        return ml_service.retrain()
    except ValueError as e:
        raise HTTPException(status_code=422, detail=str(e))
