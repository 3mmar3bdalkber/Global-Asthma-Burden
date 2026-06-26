<h1 align="center">
   Global Asthma Burden
</h1>

<p align="center">
  <strong>Analyzing global asthma prevalence, mortality, demographic trends, and patient-level risk using the Global Burden of Disease (GBD) dataset and Machine Learning.</strong><br/>
  A comprehensive healthcare analytics platform combining <strong>Global Burden Analysis</strong>, <strong>Business Intelligence</strong>, <strong>Machine Learning</strong>, and an <strong>AI-powered Healthcare Assistant</strong> to transform asthma data into actionable insights.
</p>

<p align="center">
  <img src="https://img.shields.io/badge/Python-3.10%2B-blue" alt="Python"/>
  <img src="https://img.shields.io/badge/SQL%20Server-CC2927?logo=microsoftsqlserver&logoColor=white" alt="SQL Server"/>
  <img src="https://img.shields.io/badge/Power%20BI-F2C811?logo=powerbi&logoColor=black" alt="Power BI"/>
  <img src="https://img.shields.io/badge/Tableau-E97627?logo=tableau&logoColor=white" alt="Tableau"/>
  <img src="https://img.shields.io/badge/Excel-217346?logo=microsoftexcel&logoColor=white" alt="Excel"/>
  <img src="https://img.shields.io/badge/Machine%20Learning-FF6F00" alt="Machine Learning"/>
  <img src="https://img.shields.io/badge/AI%20Chatbot-Gemini-blueviolet" alt="AI"/>
  <img src="https://img.shields.io/badge/Dataset-GBD%202023-success" alt="GBD"/>
</p>

<p align="center">
  <a href="#project-overview">Overview</a> •
  <a href="#highlights">Highlights</a> •
  <a href="#datasets">Datasets</a> •
  <a href="#dashboard-features">Dashboard</a> •
  <a href="#machine-learning">Machine Learning</a> •
  <a href="#ai-chatbot">AI Chatbot</a> •
  <a href="#tech-stack">Tech Stack</a> •
  <a href="#project-structure">Structure</a> •
  <a href="#future-work">Future Work</a> •
  <a href="#contributors">Contributors</a>
</p>

---

# Project Overview

Asthma is one of the most common chronic respiratory diseases worldwide, affecting millions of people across all age groups and placing a significant burden on healthcare systems.

This project combines **population-level analytics** with **patient-level prediction** to provide a complete understanding of asthma from both public health and clinical perspectives.

The platform integrates:

-  Global Burden of Disease (GBD) analytics
-  Patient-level Machine Learning prediction
-  Interactive dashboards (Power BI, Tableau & Excel)
-  AI-powered healthcare chatbot
-  SQL Server data warehouse

The goal is to transform large healthcare datasets into interactive visualizations, predictive models, and intelligent insights that support healthcare professionals, researchers, students, and decision-makers.

---

# Highlights

- Global asthma burden analysis
- Worldwide prevalence and mortality visualization
- Country & regional comparison
- Age-group and gender analysis
- Interactive Power BI dashboards
- Tableau storytelling dashboards
- Executive Excel dashboard
- SQL Server data warehouse
- Patient-level Machine Learning prediction
- AI-powered healthcare chatbot
- Data-driven recommendations and insights

---

# Datasets

## Global Burden of Disease (GBD)

Population-level dataset used to analyze:

- Asthma prevalence
- Incidence
- Mortality
- DALYs
- Countries
- Years
- Gender
- Age groups

Purpose:

- Global analysis
- Geographic comparison
- Disease burden exploration
- Healthcare insights

---

## Asthma Disease Dataset (Patient-Level)

Patient records containing:

- Demographics
- Symptoms
- Lifestyle
- Environmental exposure
- Lung function
- Medical history
- Asthma diagnosis

Purpose:

- Machine Learning
- Patient prediction
- Feature importance
- Risk assessment

---

# Problem Statement

Despite the availability of large healthcare datasets, extracting meaningful insights about asthma remains difficult due to data complexity and the lack of integrated analytical platforms.

This project addresses that challenge by combining global disease burden analysis with patient-level prediction and AI-powered assistance in one unified platform.

---

# Dashboard Features

## Executive Dashboard

- Total Cases
- Total Deaths
- DALYs
- Countries
- Years

---

## Global Analytics

- Global prevalence map
- Country ranking
- Regional comparison
- Disease burden analysis

---

## Demographic Analysis

- Age-group comparison
- Gender distribution
- Population trends

---

## Machine Learning Dashboard

- Prediction results
- Model comparison
- Feature importance
- ROC Curve
- Confusion Matrix

---

## Executive Insights

Automatically generated insights including:

- Countries with highest burden
- Most affected age groups
- Gender differences
- Mortality hotspots
- Patient risk factors

---

# Machine Learning

## Target Variable

```text
Diagnosis
```

## Algorithms

- Logistic Regression
- Decision Tree
- Random Forest
- XGBoost
- Support Vector Machine (SVM)

## Model Evaluation

- Accuracy
- Precision
- Recall
- F1-Score
- ROC-AUC
- Confusion Matrix

---

# AI Chatbot

## Asthma Assistant

An AI-powered healthcare assistant integrated into the platform.

### Features

- Answer asthma-related questions
- Explain GBD indicators
- Interpret dashboard findings
- Compare countries
- Explain Machine Learning predictions
- Generate healthcare insights
- Summarize analytical reports
- Provide asthma awareness guidance

### Example Questions

- Which country has the highest asthma prevalence?
- What is DALY?
- Which age group is most affected?
- Compare asthma burden between Egypt and Saudi Arabia.
- Why was this patient classified as high risk?
- Summarize the dashboard insights.

---

# Key Insights

The platform helps identify:

- Countries with the highest asthma burden
- Regions with the highest mortality
- Trends in prevalence over time
- Gender differences
- Most affected age groups
- Geographic hotspots
- Important patient risk factors
- Best-performing prediction models

---

# Recommendations

Based on analytical findings, decision-makers can:

- Improve asthma awareness campaigns
- Increase early screening programs
- Strengthen healthcare access in high-risk regions
- Focus on vulnerable age groups
- Allocate healthcare resources more efficiently
- Support evidence-based healthcare planning

---

# Data Challenges

During the project, several challenges were addressed:

- Large healthcare datasets
- Missing values
- Data cleaning
- Data preprocessing
- Feature engineering
- Dataset integration
- Dashboard performance optimization
- Machine Learning model tuning

---

# Tech Stack

## Programming

- Python

## Data Analysis

- Pandas
- NumPy

## Machine Learning

- Scikit-Learn
- XGBoost

## Database

- Microsoft SQL Server

## Business Intelligence

- Power BI
- Tableau
- Microsoft Excel

## AI

- Gemini API
- Asthma Assistant Chatbot

## Development Tools

- Git
- GitHub
- VS Code
- Jupyter Notebook

---

# Project Structure

```bash
Global-Asthma-Burden/
│
├── Logo Project/
│
├── data/
│   ├── GBD Data/
│   ├── Patient_Level/
│   ├── processed/
│   └── metadata/
│
├── database/
│   ├── schema/
│   ├── views/
│   └── stored_procedures/
│
├── notebooks/
│   ├── 01_Data_Cleaning.ipynb
│   ├── 02_EDA_GBD.ipynb
│   ├── 03_EDA_Patient.ipynb
│   ├── 04_Machine_Learning.ipynb
│   └── 05_Model_Evaluation.ipynb
│
├── src/
│   ├── preprocessing/
│   ├── analytics/
│   ├── visualization/
│   ├── machine_learning/
│   └── chatbot/
│
├── dashboards/
│   ├── PowerBI/
│   │   └── Asthma_Dashboard.pbix
│   │
│   ├── Tableau/
│   │   └── Asthma_Dashboard.twbx
│   │
│   ├── Excel/
│   │   └── Asthma_Dashboard.xlsx
│   │
│   └── screenshots/
│
├── chatbot/
│   ├── prompts/
│   ├── api/
│   └── app/
│
├── reports/
│   ├── Final_Report.pdf
│   └── Presentation.pptx
│
├── docs/
│
├── requirements.txt
│
└── README.md
```

---

# Future Work

- Deep Learning prediction models
- Explainable AI (SHAP/LIME)
- Real-time healthcare monitoring
- Mobile application
- Cloud deployment
- Multi-language AI chatbot
- Time-series forecasting
- Public web dashboard

---

# Contributors

**Ammar Abdelkabir AbdelQader Othman**

**Mohamed Ahmed Hassen Selim**

**Adham Ahmed Mohamed Abdelhafez**

**Abdelrahman Mohamed Hassen**

**Nour Ayman Omar Alsaeed**

**Nancy Abdelnaby Soliman**

