# AsthmAI — Frontend + FastAPI Backend

An asthma analytics platform combining a **FastAPI + SQL Server + XGBoost** backend with a **frontend (HTML/CSS/JS)** that fetches data from the backend and includes an AI-powered chat assistant.

> **Note:** All AI-generated responses (chat and other AI features) are grounded in data returned by **stored procedures in the database**. The LLM does not answer from general knowledge alone — it uses context pulled live from SQL Server via the backend's stored procedures.

---

## Project Structure

```
asthmai-project/
├── backend/     ← FastAPI + SQL Server + XGBoost
└── frontend/    ← Fetches data from backend + HTML/CSS/JS + LLM chat
```

---

## 1) Backend Setup

### Create and activate a virtual environment

```bash
cd backend
python -m venv venv
```

**Windows PowerShell:**
```powershell
.\venv\Scripts\Activate.ps1
```
If you get a "running scripts is disabled" error:
```powershell
Set-ExecutionPolicy -Scope Process -ExecutionPolicy Bypass
.\venv\Scripts\Activate.ps1
```

**Mac/Linux:**
```bash
source venv/bin/activate
```

### Install dependencies

```bash
pip install -r requirements.txt
```

### Configure environment variables

Fill in the `.env` file with your SQL Server credentials:

```ini
DB_SERVER=Server Device Name\SQLEXPRESS   # Edit to match your SQL Server instance name
DB_NAME=AsthmaAnalytics
DB_DRIVER=ODBC Driver 17 for SQL Server
DB_USER=
DB_PASSWORD=

ALLOWED_ORIGINS=http://127.0.0.1:5500,http://localhost:5500

LLM_PROVIDER=gemini
LLM_MODEL=gemini-2.5-flash
GEMINI_API_KEY=YOUR_API_KEY
```

### Run the backend server

```bash
uvicorn main:app --reload --port 8000
```

### Verify the connection

Visit `http://localhost:8000/api/health` to confirm the backend is connected to the database. A healthy response looks like:

```json
{"status": "ok", "db": "connected"}
```

> The ML model trains on the first request to `/api/patient/{id}/predict-ml` and is cached in memory (and optionally on disk) for subsequent requests.

---

## 2) Frontend Setup

The frontend must run on a local server so the JS can call the backend API.

**Option A — VS Code Live Server (easiest):**
1. Open the `frontend/` folder in VS Code.
2. Right-click `index.html` → **Open with Live Server**.

**Option B — Python's built-in server:**
```bash
cd frontend
python -m http.server 5500
```

Then open `http://localhost:5500`.

---

## 3) Backend Endpoints

| Method | Endpoint | Description |
|---|---|---|
| GET | `/api/health` | Checks the database connection |
| GET | `/api/gbd/burden` | Full GBD burden data — alternative to uploading a GBD CSV |
| GET | `/api/gbd/country-latest` | Latest available year per country |
| GET | `/api/gbd/summary` | Runs `dbo.sp_asthma_summary` |
| GET | `/api/gbd/compare` | Runs `gbd.sp_country_compare` |
| GET | `/api/patient/enriched` | Full patient data — alternative to uploading a Patient CSV |
| GET | `/api/patient/{id}` | Fetches a single patient |
| GET | `/api/patient/{id}/risk-profile` | Runs `patient.sp_patient_risk_profile` |
| GET | `/api/patient/risk-factor-summary` | Reads from `patient.vw_risk_factor_summary` |
| GET | `/api/patient/local-vs-global` | Reads from `patient.vw_local_vs_global_prevalence` |
| POST | `/api/patient/{id}/predict` | Records a manual prediction result |
| POST | `/api/patient/{id}/predict-ml` | Runs a live XGBoost prediction (trains on first call) and logs it |
| POST | `/api/patient/retrain-model` | Forces the ML model to retrain |
| GET | `/api/patient/{id}/predictions` | Returns a patient's prediction history |
| POST | `/api/chat` | Free-form chat — LLM response built from database context (stored procedures) |
| POST | `/api/ai/generate` | General LLM passthrough used by all AI features on the frontend |

---

## How the AI Layer Works

- Every AI-facing endpoint (`/api/chat`, `/api/ai/generate`, and the ML prediction endpoints) pulls its context from **stored procedures and views in SQL Server** (e.g. `sp_asthma_summary`, `sp_country_compare`, `sp_patient_risk_profile`, `vw_risk_factor_summary`, `vw_local_vs_global_prevalence`).
- The backend queries these procedures/views, then passes the results as context to the LLM.
- This means the AI's answers reflect the **actual current data in the database**, not just the model's general knowledge — so any changes to the underlying stored procedures directly affect what the AI can see and say.