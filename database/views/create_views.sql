/* =============================================================================
   05_create_views.sql
   Analytical views consumed directly by Power BI / Tableau / Excel and by the
   AsthmAI chatbot layer. Views do the "join dims back to fact + apply display
   rules" work once, so BI tools and the chatbot query a single flat object.
   ========================================================================== */

USE AsthmaAnalytics;
GO

-- ---------------------------------------------------------------------------
-- gbd.vw_burden  — flat, display-ready GBD fact table
-- Applies the project rule: when metric_name = 'Percent', val is a proportion
-- (e.g. 0.052) and must be multiplied by 100 for display (-> 5.2%).
-- ---------------------------------------------------------------------------
CREATE OR ALTER VIEW gbd.vw_burden AS
SELECT
    f.fact_id,
    m.measure_name,
    l.location_name,
    l.iso3_code,
    s.sex_name,
    a.age_name,
    a.age_order,
    mt.metric_name,
    y.year_value                                                   AS year,
    y.decade,
    f.val,
    f.upper,
    f.lower,
    CASE WHEN mt.metric_name = 'Percent' THEN f.val   * 100 ELSE f.val   END AS val_display,
    CASE WHEN mt.metric_name = 'Percent' THEN f.upper * 100 ELSE f.upper END AS upper_display,
    CASE WHEN mt.metric_name = 'Percent' THEN f.lower * 100 ELSE f.lower END AS lower_display,
    (f.upper - f.lower)                                             AS ci_width,
    CASE
        WHEN f.val = 0 THEN NULL
        ELSE 1.0 - ((f.upper - f.lower) / NULLIF(f.val, 0))
    END                                                              AS ci_reliability,
    CASE
        WHEN mt.metric_name = 'Percent' AND f.val >= 0.10 THEN 'Very High (>=10%)'
        WHEN mt.metric_name = 'Percent' AND f.val >= 0.07 THEN 'High (7-10%)'
        WHEN mt.metric_name = 'Percent' AND f.val >= 0.04 THEN 'Moderate (4-7%)'
        WHEN mt.metric_name = 'Percent'                   THEN 'Low (<4%)'
        ELSE NULL
    END                                                              AS risk_category
FROM gbd.fact_burden f
JOIN gbd.dim_measure  m  ON m.measure_id  = f.measure_id
JOIN gbd.dim_location l  ON l.location_id = f.location_id
JOIN gbd.dim_sex      s  ON s.sex_id      = f.sex_id
JOIN gbd.dim_age      a  ON a.age_id      = f.age_id
JOIN gbd.dim_metric   mt ON mt.metric_id  = f.metric_id
JOIN gbd.dim_year     y  ON y.year_id     = f.year_id;
GO

-- ---------------------------------------------------------------------------
-- gbd.vw_country_latest  — most recent year's headline KPIs per country
-- Powers the world-map / KPI-card visuals directly.
-- ---------------------------------------------------------------------------
CREATE OR ALTER VIEW gbd.vw_country_latest AS
WITH latest_year AS (
    SELECT MAX(year) AS yr FROM gbd.vw_burden
)
SELECT b.location_name, b.measure_name, b.sex_name, b.age_name, b.metric_name,
       b.year, b.val_display, b.risk_category
FROM gbd.vw_burden b
CROSS JOIN latest_year ly
WHERE b.year = ly.yr;
GO

-- ---------------------------------------------------------------------------
-- patient.vw_patient_enriched  — patient fact + all engineered features
-- (mirrors 01_Data_Cleaning_Patient.ipynb: AgeGroup, BMICategory,
--  FEV1_FVC_Ratio, SymptomCount, RiskFactorCount, plus label columns)
-- ---------------------------------------------------------------------------
CREATE OR ALTER VIEW patient.vw_patient_enriched AS
SELECT
    p.patient_id,
    p.age,
    CASE WHEN p.age <= 17 THEN '0-17'
         WHEN p.age <= 34 THEN '18-34'
         WHEN p.age <= 54 THEN '35-54'
         WHEN p.age <= 64 THEN '55-64'
         ELSE '65+' END                                    AS age_group,
    p.gender,
    CASE WHEN p.gender = 1 THEN 'Male' ELSE 'Female' END    AS gender_label,
    e.ethnicity_name,
    ed.education_name,
    l.location_name,                                        -- NULL until collected
    p.bmi,
    CASE WHEN p.bmi < 18.5 THEN 'Underweight'
         WHEN p.bmi < 25   THEN 'Normal'
         WHEN p.bmi < 30   THEN 'Overweight'
         ELSE 'Obese' END                                  AS bmi_category,
    p.smoking, p.physical_activity, p.diet_quality, p.sleep_quality,
    p.pollution_exposure, p.pollen_exposure, p.dust_exposure,
    p.pet_allergy, p.family_history_asthma, p.history_of_allergies,
    p.eczema, p.hay_fever, p.gastroesophageal_reflux,
    (CAST(p.family_history_asthma AS INT) + CAST(p.history_of_allergies AS INT)
     + CAST(p.eczema AS INT) + CAST(p.hay_fever AS INT)
     + CAST(p.gastroesophageal_reflux AS INT))             AS risk_factor_count,
    p.lung_function_fev1, p.lung_function_fvc,
    CAST(p.lung_function_fev1 AS FLOAT) / NULLIF(p.lung_function_fvc, 0) AS fev1_fvc_ratio,
    p.wheezing, p.shortness_of_breath, p.chest_tightness, p.coughing,
    p.nighttime_symptoms, p.exercise_induced,
    (CAST(p.wheezing AS INT) + CAST(p.shortness_of_breath AS INT)
     + CAST(p.chest_tightness AS INT) + CAST(p.coughing AS INT)
     + CAST(p.nighttime_symptoms AS INT) + CAST(p.exercise_induced AS INT)) AS symptom_count,
    p.diagnosis,
    CASE WHEN p.diagnosis = 1 THEN 'Asthma' ELSE 'No Asthma' END AS diagnosis_label
FROM patient.fact_patient p
JOIN patient.dim_ethnicity e  ON e.ethnicity_id = p.ethnicity_id
JOIN patient.dim_education ed ON ed.education_id = p.education_id
LEFT JOIN gbd.dim_location l  ON l.location_id = p.location_id;
GO

-- ---------------------------------------------------------------------------
-- patient.vw_local_vs_global_prevalence — compares YOUR patient sample's
-- diagnosis rate per country against the OFFICIAL GBD prevalence for that
-- country. This is a side-by-side comparison, NOT a write-back: GBD figures
-- are never modified by patient data. Only returns countries that currently
-- have at least one patient with a location_id set.
-- ---------------------------------------------------------------------------
CREATE OR ALTER VIEW patient.vw_local_vs_global_prevalence AS
WITH local_sample AS (
    SELECT
        l.location_name,
        COUNT(*)                                       AS sample_size,
        SUM(CAST(p.diagnosis AS INT))                  AS sample_diagnosed,
        AVG(CAST(p.diagnosis AS FLOAT))                AS sample_diagnosis_rate
    FROM patient.fact_patient p
    JOIN gbd.dim_location l ON l.location_id = p.location_id
    GROUP BY l.location_name
),
gbd_latest AS (
    SELECT location_name, val_display AS gbd_prevalence_pct, year AS gbd_year
    FROM gbd.vw_burden
    WHERE measure_name = 'Prevalence' AND metric_name = 'Percent'
      AND age_name = 'All ages'
      AND year = (SELECT MAX(year) FROM gbd.vw_burden)
)
SELECT
    s.location_name,
    s.sample_size,
    s.sample_diagnosed,
    s.sample_diagnosis_rate,
    g.gbd_prevalence_pct,
    g.gbd_year,
    (s.sample_diagnosis_rate * 100) - g.gbd_prevalence_pct AS pct_point_gap
FROM local_sample s
LEFT JOIN gbd_latest g ON g.location_name = s.location_name;
GO

-- ---------------------------------------------------------------------------
-- patient.vw_risk_factor_summary  — prevalence + diagnosis rate per risk
-- factor, unpivoted for easy charting (mirrors 03_EDA_Patient.ipynb section 6)
-- ---------------------------------------------------------------------------
CREATE OR ALTER VIEW patient.vw_risk_factor_summary AS
SELECT 'FamilyHistoryAsthma' AS risk_factor, AVG(CAST(family_history_asthma AS FLOAT)) AS prevalence,
       AVG(CASE WHEN family_history_asthma = 1 THEN CAST(diagnosis AS FLOAT) END) AS diagnosis_rate_if_present
FROM patient.fact_patient
UNION ALL
SELECT 'HistoryOfAllergies', AVG(CAST(history_of_allergies AS FLOAT)),
       AVG(CASE WHEN history_of_allergies = 1 THEN CAST(diagnosis AS FLOAT) END)
FROM patient.fact_patient
UNION ALL
SELECT 'Eczema', AVG(CAST(eczema AS FLOAT)),
       AVG(CASE WHEN eczema = 1 THEN CAST(diagnosis AS FLOAT) END)
FROM patient.fact_patient
UNION ALL
SELECT 'HayFever', AVG(CAST(hay_fever AS FLOAT)),
       AVG(CASE WHEN hay_fever = 1 THEN CAST(diagnosis AS FLOAT) END)
FROM patient.fact_patient
UNION ALL
SELECT 'GastroesophagealReflux', AVG(CAST(gastroesophageal_reflux AS FLOAT)),
       AVG(CASE WHEN gastroesophageal_reflux = 1 THEN CAST(diagnosis AS FLOAT) END)
FROM patient.fact_patient;
GO
