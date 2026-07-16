/* 06_stored_procedures.sql
   headline stored procedure named in the project
   README. Returns three result sets: 
   (1) GBD country/year summary,
   (2) patient-level summary, 
   (3) combined executive KPIs. Optional filters
   let Power BI/Tableau/Excel or the AsthmAI chatbot parameterize a single
   call instead of querying both schemas separately.
*/

USE AsthmaAnalytics;
GO

CREATE OR ALTER PROCEDURE dbo.sp_asthma_summary
    @Country      NVARCHAR(100) = NULL,   --  filter GBD result set to one country
    @Year         SMALLINT      = NULL,   --  filter GBD result set to one year (defaults to latest)
    @MeasureName  NVARCHAR(50)  = NULL    --  filter GBD result set to one measure
AS
BEGIN
    SET NOCOUNT ON;

    DECLARE @Yr SMALLINT = COALESCE(@Year, (SELECT MAX(year) FROM gbd.vw_burden));

    -- Result set 1: GBD burden summary --------------------------------------
    SELECT location_name, measure_name, sex_name, age_name, metric_name,
           year, val_display, risk_category
    FROM gbd.vw_burden
    WHERE year = @Yr
      AND (@Country IS NULL OR location_name = @Country)
      AND (@MeasureName IS NULL OR measure_name = @MeasureName)
    ORDER BY location_name, measure_name, sex_name, age_name;

    -- Result set 2: Patient-level summary ------------------------------------
    SELECT
        COUNT(*)                                   AS total_patients,
        SUM(CAST(diagnosis AS INT))                AS diagnosed_count,
        CAST(AVG(CAST(diagnosis AS FLOAT)) AS DECIMAL(5,4)) AS diagnosis_rate,
        CAST(AVG(CAST(age AS FLOAT)) AS DECIMAL(5,2))       AS avg_age,
        CAST(AVG(bmi) AS DECIMAL(5,2))                      AS avg_bmi
    FROM patient.fact_patient;

    -- Result set 3: Combined executive KPIs ----------------------------------
    SELECT
        @Yr                                                        AS gbd_year,
        (SELECT AVG(val_display) FROM gbd.vw_burden
          WHERE measure_name = 'Prevalence' AND metric_name = 'Percent'
            AND age_name = 'All ages'
            AND year = @Yr AND (@Country IS NULL OR location_name = @Country))  AS gbd_prevalence_pct_sample,
        (SELECT COUNT(*) FROM patient.fact_patient)                AS patient_total,
        (SELECT AVG(CAST(diagnosis AS FLOAT)) FROM patient.fact_patient) AS patient_diagnosis_rate;
END
GO

-- ---------------------------------------------------------------------------
-- patient.sp_patient_risk_profile — "why was this patient classified as
-- high risk?" chatbot query (README example question), one patient at a time
-- ---------------------------------------------------------------------------
CREATE OR ALTER PROCEDURE patient.sp_patient_risk_profile
    @PatientId INT
AS
BEGIN
    SET NOCOUNT ON;

    SELECT *
    FROM patient.vw_patient_enriched
    WHERE patient_id = @PatientId;

    SELECT model_name, predicted_label, predicted_probability, is_best_model, scored_at
    FROM patient.fact_prediction
    WHERE patient_id = @PatientId
    ORDER BY scored_at DESC;
END
GO

-- ---------------------------------------------------------------------------
-- gbd.sp_country_compare — "Compare asthma burden between X and Y" (README
-- example chatbot question)
-- ---------------------------------------------------------------------------
CREATE OR ALTER PROCEDURE gbd.sp_country_compare
    @CountryA NVARCHAR(100),
    @CountryB NVARCHAR(100),
    @Year     SMALLINT = NULL
AS
BEGIN
    SET NOCOUNT ON;
    DECLARE @Yr SMALLINT = COALESCE(@Year, (SELECT MAX(year) FROM gbd.vw_burden));

    SELECT location_name, measure_name, sex_name, age_name, metric_name, year, val_display
    FROM gbd.vw_burden
    WHERE year = @Yr AND location_name IN (@CountryA, @CountryB)
    ORDER BY measure_name, location_name;
END
GO
