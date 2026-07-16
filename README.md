<div align="center">

# 🫁 Global Asthma Analysis Platform

### DEPI Round 4 — AST Group | Data Analytics Track
### Digital Egypt Pioneers Initiative — Ministry of Communications & IT

[![Python](https://img.shields.io/badge/Python-3.10+-3776AB?style=for-the-badge&logo=python&logoColor=white)](https://python.org)
[![Power BI](https://img.shields.io/badge/Power_BI-F2C811?style=for-the-badge&logo=powerbi&logoColor=black)](https://powerbi.microsoft.com)
[![Tableau](https://img.shields.io/badge/Tableau-E97627?style=for-the-badge&logo=tableau&logoColor=white)](https://tableau.com)
[![Excel](https://img.shields.io/badge/Excel-217346?style=for-the-badge&logo=microsoftexcel&logoColor=white)](https://microsoft.com/excel)
[![SQL Server](https://img.shields.io/badge/SQL_Server-CC2927?style=for-the-badge&logo=microsoftsqlserver&logoColor=white)](https://microsoft.com/sql-server)
[![Gemini](https://img.shields.io/badge/Gemini_AI-4285F4?style=for-the-badge&logo=google&logoColor=white)](https://aistudio.google.com)
[![License](https://img.shields.io/badge/License-MIT-green?style=for-the-badge)](LICENSE)

---

*A comprehensive healthcare analytics platform combining Global Burden Analysis,  
Business Intelligence, Machine Learning, and AI-powered Assistance  
to transform asthma data into actionable insights.*

[Overview](#overview) • [Datasets](#datasets) • [Dashboards](#dashboards) • [ML Models](#machine-learning) • [AI Chatbot](#ai-chatbot) • [Setup](#setup) • [Team](#team)

</div>

---

## 📋 Project Overview

Asthma is one of the most common chronic respiratory diseases worldwide,
affecting over **262 million people** across all age groups and placing a
significant burden on healthcare systems globally.

This platform integrates:

- 🌍 **Global Burden of Disease (GBD 2023)** population-level analytics
- 🤖 **Patient-level Machine Learning** prediction & risk assessment
- 📊 **Interactive Dashboards** — Power BI, Tableau & Excel
- 💬 **AI-powered Healthcare Chatbot** — AsthmAI (Gemini API)
- 🗄️ **SQL Server** data warehouse

---

## ✨ Key Highlights

| Feature | Details |
|---|---|
| 🌍 Countries analyzed | 204 countries |
| 📅 Time period | 1990 – 2023 |
| 📊 GBD dataset rows | 304,776 rows |
| 👥 Patient records | 2,392 patients · 28 features |
| 🤖 ML models | 5 algorithms compared |
| 📈 Dashboards | Power BI + Tableau + Excel |
| 💬 AI Chatbot | Gemini 2.5 Flash API |
| 🏆 Program | DEPI Round 4 · AST Group |

---

## 📁 Project Structure

```
Global-Asthma-Analysis/
│
├── 📂 data/
│   ├── raw/
│   │   ├── GBD_Asthma_Final.csv          ← 304,776 rows · 204 countries
│   │   └── asthma_disease_data.csv        ← 2,392 patients · 28 features
│   ├── processed/
│   │   ├── gbd_cleaned.csv
│   │   ├── patient_cleaned.csv
│   │   └── patient_encoded.csv
│   └── metadata/
│       └── column_descriptions.md
│
├── 📂 notebooks/
│   ├── 01_Data_Cleaning_GBD.ipynb
│   ├── 02_Data_Cleaning_Patient.ipynb
│   ├── 03_EDA_GBD.ipynb                  ← GBD analysis (7 charts)
│   ├── 04_EDA_Patient.ipynb              ← Patient analysis
│   ├── 05_Machine_Learning.ipynb         ← 5 ML models
│   └── 06_Model_Evaluation.ipynb         ← ROC, confusion matrix
│
├── 📂 src/
│   ├── preprocessing/
│   │   ├── clean_gbd.py
│   │   └── clean_patient.py
│   ├── analytics/
│   │   ├── gbd_analysis.py
│   │   └── patient_analysis.py
│   ├── machine_learning/
│   │   ├── train_models.py
│   │   ├── evaluate_models.py
│   │   └── predict.py
│   └── chatbot/
│       └── asthmai.html                  ← AsthmAI chatbot (Gemini API)
│
├── 📂 dashboards/
│   ├── PowerBI/
│   │   └── Asthma_Dashboard.pbix
│   ├── Tableau/
│   │   └── Asthma_Dashboard.twbx
│   └── Excel/
│       └── Asthma_Dashboard.xlsx
│
├── 📂 database/
│   ├── schema/
│   │   └── create_tables.sql
│   ├── views/
│   │   └── create_views.sql
│   └── stored_procedures/
│       └── sp_asthma_summary.sql
│
├── 📂 reports/
│   ├── Final_Report.pdf
│   └── Presentation.pptx
│
├── 📂 docs/
│   ├── Excel_PowerQuery_Steps.md
│   ├── PowerBI_Tableau_Formulas.md
│   └── ML_Model_Results.md
│
├── requirements.txt
├── .gitignore
└── README.md
```

---

## 📊 Datasets

### 1. Global Burden of Disease (GBD 2023)
> Source: [IHME — Institute for Health Metrics and Evaluation](https://vizhub.healthdata.org/gbd-results/)

| Column | Type | Description |
|---|---|---|
| `measure_name` | text | Deaths / Prevalence / Incidence / DALYs / YLDs |
| `location_name` | text | Country name (204 countries) |
| `sex_name` | text | Male / Female |
| `age_name` | text | 0-14 / 15-49 / 50-69 / 70+ / All ages / Age-std |
| `metric_name` | text | Number / Percent / Rate |
| `year` | int | 1990 / 1995 / 2000 / 2005 / 2010 / 2015 / 2019 / 2021 / 2023 |
| `val` | float | Central estimate value |
| `upper` | float | Upper confidence interval |
| `lower` | float | Lower confidence interval |

**⚠️ Important:** When `metric_name = "Percent"`, multiply `val × 100` for display.  
Example: `val = 0.052` → `5.2%`

---

### 2. Asthma Disease Dataset (Patient Level)
> Source: [Kaggle — Asthma Disease Dataset](https://www.kaggle.com/datasets/rabieelkharoua/asthma-disease-dataset)

| Category | Features |
|---|---|
| Demographics | Age, Gender, Ethnicity, EducationLevel |
| Lifestyle | BMI, Smoking, PhysicalActivity, DietQuality, SleepQuality |
| Environmental | PollutionExposure, PollenExposure, DustExposure |
| Medical History | FamilyHistoryAsthma, HistoryOfAllergies, Eczema, HayFever, GastroesophagealReflux |
| Lung Function | LungFunctionFEV1, LungFunctionFVC |
| Symptoms | Wheezing, ShortnessOfBreath, ChestTightness, Coughing, NighttimeSymptoms, ExerciseInduced |
| **Target** | **Diagnosis** (0 = No Asthma, 1 = Asthma) |

**Stats:** 2,392 patients · 124 diagnosed (5.2%) · Age range 5–79

---

## 🖥️ Dashboards

### Power BI Dashboard
- 🗺️ World map: Prevalence by country
- 📈 Deaths trend: 1990–2023
- 📊 Top 10 countries bar chart
- 🍩 DALYs by age group (donut)
- ♂♀ Male vs Female comparison
- 🃏 KPI cards: Deaths / Prevalence / DALYs / Incidence
- 🎛️ Slicers: Year · Measure · Metric · Sex · Age · Location

### Tableau Dashboard
- 🔥 Heatmap: Countries × Years
- 🫧 Bubble chart: Incidence vs Deaths vs Prevalence
- 📊 Stacked area: DALYs by age over time
- 📖 Story: 5-slide narrative

### Excel Dashboard
- Pivot tables: 5 pivots (one per measure)
- Charts: Line, Bar, Pie, Clustered Bar
- Summary stats sheet

---

## 🤖 Machine Learning

### Target: `Diagnosis` (0 or 1)

| Algorithm | Expected Accuracy |
|---|---|
| Logistic Regression | ~85% |
| Decision Tree | ~82% |
| Random Forest | ~89% |
| XGBoost | ~91% |
| SVM | ~87% |

### Evaluation Metrics
- Accuracy · Precision · Recall · F1-Score
- ROC-AUC curve
- Confusion Matrix
- Feature Importance (top risk factors)

---

## 💬 AI Chatbot — AsthmAI

Powered by **Google Gemini 2.5 Flash API**

**Features:**
- Answer asthma questions with GBD context
- Generate interactive charts from real data
- Patient risk score (ML-based, 8 factors)
- Prevention tips & recommendations
- Country comparison queries

**Run:** Open `src/chatbot/asthmai.html` in any browser → enter Gemini API key

---

## 🛠️ Tech Stack

| Category | Tools |
|---|---|
| Language | Python 3.10+ |
| Data Analysis | Pandas, NumPy |
| Visualization | Matplotlib, Seaborn, Plotly |
| Machine Learning | Scikit-Learn, XGBoost |
| BI Tools | Power BI, Tableau, Excel |
| Database | Microsoft SQL Server |
| AI | Google Gemini 2.5 Flash API |
| Dev Tools | Jupyter Notebook, VS Code, Git, GitHub |

---

## ⚙️ Setup & Installation

```bash
# 1. Clone repository
git clone https://github.com/YOUR_USERNAME/Global-Asthma-Analysis.git
cd Global-Asthma-Analysis

# 2. Install Python dependencies
pip install -r requirements.txt

# 3. Place datasets in data/raw/
#    - GBD_Asthma_Final.csv
#    - asthma_disease_data.csv

# 4. Run notebooks in order
jupyter notebook notebooks/01_Data_Cleaning_GBD.ipynb

# 5. Open chatbot
# Open src/chatbot/asthmai.html in Chrome/Edge
# Enter your Gemini API key (get free at aistudio.google.com)
```

---

## 📦 Requirements

```
pandas>=2.0.0
numpy>=1.24.0
matplotlib>=3.7.0
seaborn>=0.12.0
scikit-learn>=1.3.0
xgboost>=1.7.0
jupyter>=1.0.0
openpyxl>=3.1.0
plotly>=5.15.0
```

---

## 👥 Team — DEPI R4 AST

| Name | Role |
|---|---|
| Ammar Abdelqader | Project Lead · ML · Chatbot |
| Nour | Excel Dashboard · Data Cleaning |
| Mohamed | Power BI Dashboard |
| Adham| Power BI Dashboard |
| Abdelrhman | Tableau Dashboard |
| NAancy | Tableau Dashboard · Python EDA |

**Program:** Digital Egypt Pioneers Initiative (DEPI) — Round 4  
**Track:** Data Analytics  
**Group:** AST  
**Institution:** Minia University

---

<div align="center">

**🫁 Global Asthma Analysis Platform**  
DEPI Round 4 · AST Group · Minia University · Egypt 🇪🇬

*Transforming healthcare data into actionable insights*

</div>
