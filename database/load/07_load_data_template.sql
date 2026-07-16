/* 
   07_load_data_template.sql  
   */

USE AsthmaAnalytics;
GO
IF DB_NAME() <> 'AsthmaAnalytics'
BEGIN
    RAISERROR('Wrong database context. Select AsthmaAnalytics in the toolbar dropdown and re-run.', 16, 1);
    RETURN;
END
GO

/* ---------------------------------------------------------------------------
   STEP 1 — GBD load
   ------------------------------------------------------------------------ */
IF OBJECT_ID('gbd.stg_burden_raw') IS NOT NULL DROP TABLE gbd.stg_burden_raw;
CREATE TABLE gbd.stg_burden_raw (
    measure_name    NVARCHAR(100),
    location_name   NVARCHAR(100),
    sex_name        NVARCHAR(20),
    age_name        NVARCHAR(30),
    metric_name     NVARCHAR(20),
    year            NVARCHAR(20),
    val             NVARCHAR(50),
    upper_val       NVARCHAR(50),
    lower_val       NVARCHAR(50),
    val_display     NVARCHAR(50),
    ci_width        NVARCHAR(50),
    ci_reliability  NVARCHAR(50),
    age_order       NVARCHAR(20),
    sex_code        NVARCHAR(20),
    risk_category   NVARCHAR(50),
    decade          NVARCHAR(20)
);
GO

BULK INSERT gbd.stg_burden_raw
FROM 'D:\DEPI\Final Project\Data\GBD_Asthma_Final.csv'
WITH (
    FORMAT = 'CSV',
    FIRSTROW = 2,
    FIELDTERMINATOR = ',',
    ROWTERMINATOR = '0x0d0a',      
    CODEPAGE = '65001',            
    TABLOCK
);
GO

SELECT TOP 5 * FROM gbd.stg_burden_raw;   
                                         
GO

-- Populate dim_location from whatever distinct countries actually appear
INSERT INTO gbd.dim_location (location_name)
SELECT DISTINCT s.location_name
FROM gbd.stg_burden_raw s
WHERE s.location_name IS NOT NULL
  AND NOT EXISTS (SELECT 1 FROM gbd.dim_location d WHERE d.location_name = s.location_name);
GO

-- Rejects log: rows where val/upper/lower/year didn't convert to numbers
IF OBJECT_ID('gbd.stg_burden_rejects') IS NOT NULL DROP TABLE gbd.stg_burden_rejects;
SELECT *
INTO gbd.stg_burden_rejects
FROM gbd.stg_burden_raw s
WHERE TRY_CONVERT(FLOAT, s.val) IS NULL
   OR TRY_CONVERT(FLOAT, s.upper_val) IS NULL
   OR TRY_CONVERT(FLOAT, s.lower_val) IS NULL
   OR TRY_CONVERT(SMALLINT, s.year) IS NULL
   OR NOT EXISTS (SELECT 1 FROM gbd.dim_measure m WHERE m.measure_name = s.measure_name)
   OR NOT EXISTS (SELECT 1 FROM gbd.dim_sex sx WHERE sx.sex_name = s.sex_name)
   OR NOT EXISTS (SELECT 1 FROM gbd.dim_age a WHERE a.age_name = s.age_name)
   OR NOT EXISTS (SELECT 1 FROM gbd.dim_metric mt WHERE mt.metric_name = s.metric_name)
   OR NOT EXISTS (SELECT 1 FROM gbd.dim_year y WHERE y.year_value = TRY_CONVERT(SMALLINT, s.year));
GO

SELECT COUNT(*) AS rejected_row_count FROM gbd.stg_burden_rejects;
-- If this is > 0, check gbd.stg_burden_rejects to see why (usually a

GO

TRUNCATE TABLE gbd.fact_burden;
GO

INSERT INTO gbd.fact_burden (measure_id, location_id, sex_id, age_id, metric_id, year_id, val, upper, lower)
SELECT
    m.measure_id, l.location_id, sx.sex_id, a.age_id, mt.metric_id, y.year_id,
    TRY_CONVERT(FLOAT, s.val), TRY_CONVERT(FLOAT, s.upper_val), TRY_CONVERT(FLOAT, s.lower_val)
FROM gbd.stg_burden_raw s
JOIN gbd.dim_measure  m  ON m.measure_name  = s.measure_name
JOIN gbd.dim_location l  ON l.location_name = s.location_name
JOIN gbd.dim_sex      sx ON sx.sex_name     = s.sex_name
JOIN gbd.dim_age      a  ON a.age_name      = s.age_name
JOIN gbd.dim_metric   mt ON mt.metric_name  = s.metric_name
JOIN gbd.dim_year     y  ON y.year_value    = TRY_CONVERT(SMALLINT, s.year)
WHERE TRY_CONVERT(FLOAT, s.val) IS NOT NULL
  AND TRY_CONVERT(FLOAT, s.upper_val) IS NOT NULL
  AND TRY_CONVERT(FLOAT, s.lower_val) IS NOT NULL;
GO

DROP TABLE gbd.stg_burden_raw;
GO

/* ---------------------------------------------------------------------------
   STEP 2 — Patient load (no location column in source yet -> location_id
   stays NULL for all rows; that's expected, see the note about the FK)
   ------------------------------------------------------------------------ */
IF OBJECT_ID('patient.stg_patient_raw') IS NOT NULL DROP TABLE patient.stg_patient_raw;
CREATE TABLE patient.stg_patient_raw (
    PatientID NVARCHAR(20), Age NVARCHAR(10), Gender NVARCHAR(10), Ethnicity NVARCHAR(10),
    EducationLevel NVARCHAR(10), BMI NVARCHAR(50), Smoking NVARCHAR(10), PhysicalActivity NVARCHAR(50),
    DietQuality NVARCHAR(50), SleepQuality NVARCHAR(50), PollutionExposure NVARCHAR(50),
    PollenExposure NVARCHAR(50), DustExposure NVARCHAR(50), PetAllergy NVARCHAR(10),
    FamilyHistoryAsthma NVARCHAR(10), HistoryOfAllergies NVARCHAR(10), Eczema NVARCHAR(10),
    HayFever NVARCHAR(10), GastroesophagealReflux NVARCHAR(10), LungFunctionFEV1 NVARCHAR(50),
    LungFunctionFVC NVARCHAR(50), Wheezing NVARCHAR(10), ShortnessOfBreath NVARCHAR(10),
    ChestTightness NVARCHAR(10), Coughing NVARCHAR(10), NighttimeSymptoms NVARCHAR(10),
    ExerciseInduced NVARCHAR(10), Diagnosis NVARCHAR(10), DoctorInCharge NVARCHAR(50)
);
GO

BULK INSERT patient.stg_patient_raw
FROM 'D:\DEPI\Final Project\Data\asthma_disease_data_realistic.csv'
WITH (
    FIRSTROW = 2,
    FIELDTERMINATOR = ',',
    ROWTERMINATOR = '0x0a',       
    CODEPAGE = '65001',
    TABLOCK
);
GO


SELECT TOP 5 * FROM patient.stg_patient_raw;
GO

IF OBJECT_ID('patient.stg_patient_rejects') IS NOT NULL DROP TABLE patient.stg_patient_rejects;
SELECT * INTO patient.stg_patient_rejects
FROM patient.stg_patient_raw s
WHERE TRY_CONVERT(INT, s.PatientID) IS NULL
   OR TRY_CONVERT(FLOAT, s.BMI) IS NULL
   OR TRY_CONVERT(FLOAT, s.LungFunctionFEV1) IS NULL
   OR TRY_CONVERT(FLOAT, s.LungFunctionFVC) IS NULL;
GO
SELECT COUNT(*) AS rejected_row_count FROM patient.stg_patient_rejects;
GO

INSERT INTO patient.fact_patient (
    patient_id, age, gender, ethnicity_id, education_id, location_id, bmi, smoking,
    physical_activity, diet_quality, sleep_quality, pollution_exposure,
    pollen_exposure, dust_exposure, pet_allergy, family_history_asthma,
    history_of_allergies, eczema, hay_fever, gastroesophageal_reflux,
    lung_function_fev1, lung_function_fvc, wheezing, shortness_of_breath,
    chest_tightness, coughing, nighttime_symptoms, exercise_induced,
    diagnosis, doctor_in_charge
)
SELECT
    TRY_CONVERT(INT, PatientID), TRY_CONVERT(TINYINT, Age), TRY_CONVERT(TINYINT, Gender),
    TRY_CONVERT(TINYINT, Ethnicity), TRY_CONVERT(TINYINT, EducationLevel),
    NULL,                                       -- location_id: not in source data yet
    TRY_CONVERT(FLOAT, BMI), TRY_CONVERT(BIT, Smoking),
    TRY_CONVERT(FLOAT, PhysicalActivity), TRY_CONVERT(FLOAT, DietQuality), TRY_CONVERT(FLOAT, SleepQuality),
    TRY_CONVERT(FLOAT, PollutionExposure), TRY_CONVERT(FLOAT, PollenExposure), TRY_CONVERT(FLOAT, DustExposure),
    TRY_CONVERT(BIT, PetAllergy), TRY_CONVERT(BIT, FamilyHistoryAsthma),
    TRY_CONVERT(BIT, HistoryOfAllergies), TRY_CONVERT(BIT, Eczema), TRY_CONVERT(BIT, HayFever),
    TRY_CONVERT(BIT, GastroesophagealReflux),
    TRY_CONVERT(FLOAT, LungFunctionFEV1), TRY_CONVERT(FLOAT, LungFunctionFVC),
    TRY_CONVERT(BIT, Wheezing), TRY_CONVERT(BIT, ShortnessOfBreath), TRY_CONVERT(BIT, ChestTightness),
    TRY_CONVERT(BIT, Coughing), TRY_CONVERT(BIT, NighttimeSymptoms), TRY_CONVERT(BIT, ExerciseInduced),
    TRY_CONVERT(BIT, Diagnosis), DoctorInCharge
FROM patient.stg_patient_raw s
WHERE TRY_CONVERT(INT, s.PatientID) IS NOT NULL
  AND NOT EXISTS (SELECT 1 FROM patient.fact_patient fp WHERE fp.patient_id = TRY_CONVERT(INT, s.PatientID));
GO

DROP TABLE patient.stg_patient_raw;
GO

-- Sanity checks
SELECT COUNT(*) AS gbd_rows FROM gbd.fact_burden;
SELECT COUNT(*) AS patient_rows FROM patient.fact_patient;
SELECT COUNT(*) AS patients_with_location FROM patient.fact_patient WHERE location_id IS NOT NULL;
GO
