# RespiTrack AI: Asthma Insights & Diagnostics

RespiTrack AI is an interactive, multi-dimensional analytics dashboard designed to explore global asthma trends and analyze clinical patient records. Leveraging Python, Streamlit, and XGBoost, the application integrates public epidemiological data with clinical metrics to offer robust data visualization and an AI-powered diagnostic prediction tool.

## 🚀 Key Features

*   **🌍 Global Asthma Analytics**: 
    *   Visualizes GBD (Global Burden of Disease) asthma datasets.
    *   Includes interactive map projections (Choropleth), heatmaps (Age × Year), trend lines, and confidence intervals.
*   **👨‍⚕️ Clinical Patient Dashboard**: 
    *   Provides cohort filtering by lifestyle choices, demographics, and age.
    *   Features dynamic data breakdown charts (Donut, Violin, Box plots, and Sunburst hierarchy) and a complete Spearman rank correlation matrix.
*   **🔮 AI Patient Diagnosis Predictor**: 
    *   Integrates an optimized **XGBoost Classifier** to predict the likelihood of an asthma diagnosis based on 24 clinical parameters.
    *   Handles highly unbalanced medical datasets accurately using automated class-weight balancing (`scale_pos_weight`).

---

## 🛠️ Tech Stack

*   **Frontend & Application Framework:** Streamlit
*   **Data Manipulation:** Pandas, NumPy
*   **Interactive Visualizations:** Plotly Express & Plotly Graph Objects
*   **Machine Learning:** XGBoost (eXtreme Gradient Boosting), Scikit-Learn

---

## 📂 Data Sources & Requirements

The dashboard is built to consume two primary CSV datasets (ensure they are present in the root directory):
1.  `GBD_Asthma_Final.csv` – Global epidemiological indicators (measures, metrics, countries, age groups, and confidence intervals).
2.  `asthma_disease_data_realistic.csv` – Realistic clinical patient cohort data containing lifestyle factors, lung function tests ($FEV_1$ and $FVC$), symptoms, allergies, and diagnoses.

---

## ⚙️ Installation & Local Setup

Follow these steps to run the application locally:

### 1. Clone the Repository
```bash
git clone [https://github.com/yourusername/RespiTrack-AI.git](https://github.com/yourusername/RespiTrack-AI.git)
cd RespiTrack-AI