/* 
   3_create_tables_patient.sql
   */

USE AsthmaAnalytics;
GO

IF OBJECT_ID('patient.fact_prediction') IS NOT NULL DROP TABLE patient.fact_prediction;
IF OBJECT_ID('patient.fact_patient') IS NOT NULL DROP TABLE patient.fact_patient;
GO

-- ---------------------------------------------------------------------------
-- Dimension: Ethnicity  (0=Caucasian,1=African American,2=Asian,3=Other)
-- ---------------------------------------------------------------------------
IF OBJECT_ID('patient.dim_ethnicity') IS NOT NULL DROP TABLE patient.dim_ethnicity;
GO

CREATE TABLE patient.dim_ethnicity (
    ethnicity_id    TINYINT PRIMARY KEY,            -- matches source code 0-3 directly
    ethnicity_name  NVARCHAR(30) NOT NULL UNIQUE
);
GO

-- ---------------------------------------------------------------------------
-- Dimension: Education level (0=None,1=High School,2=Bachelor's,3=Higher)
-- ---------------------------------------------------------------------------
IF OBJECT_ID('patient.dim_education') IS NOT NULL DROP TABLE patient.dim_education;
GO

CREATE TABLE patient.dim_education (
    education_id    TINYINT PRIMARY KEY,
    education_name  NVARCHAR(30) NOT NULL UNIQUE
);
GO

-- ---------------------------------------------------------------------------
-- Fact: Patient  
-- ---------------------------------------------------------------------------
IF OBJECT_ID('patient.fact_patient') IS NOT NULL DROP TABLE patient.fact_patient;
GO

CREATE TABLE patient.fact_patient (
    patient_id                  INT PRIMARY KEY,             
    age                         TINYINT NOT NULL,
    gender                      TINYINT NOT NULL,           -- 0=Female, 1=Male
    ethnicity_id                TINYINT NOT NULL FOREIGN KEY REFERENCES patient.dim_ethnicity(ethnicity_id),
    education_id                TINYINT NOT NULL FOREIGN KEY REFERENCES patient.dim_education(education_id),
    location_id                 INT NULL FOREIGN KEY REFERENCES gbd.dim_location(location_id), -- to Connect to Prevalacne in GBD , Ammar abdalkber
    bmi                         FLOAT NOT NULL,
    smoking                     BIT NOT NULL,
    physical_activity           FLOAT NOT NULL,
    diet_quality                FLOAT NOT NULL,
    sleep_quality               FLOAT NOT NULL,
    pollution_exposure          FLOAT NOT NULL,
    pollen_exposure             FLOAT NOT NULL,
    dust_exposure               FLOAT NOT NULL,
    pet_allergy                 BIT NOT NULL,
    family_history_asthma       BIT NOT NULL,
    history_of_allergies        BIT NOT NULL,
    eczema                      BIT NOT NULL,
    hay_fever                   BIT NOT NULL,
    gastroesophageal_reflux     BIT NOT NULL,
    lung_function_fev1          FLOAT NOT NULL,
    lung_function_fvc           FLOAT NOT NULL,
    wheezing                    BIT NOT NULL,
    shortness_of_breath         BIT NOT NULL,
    chest_tightness             BIT NOT NULL,
    coughing                    BIT NOT NULL,
    nighttime_symptoms          BIT NOT NULL,
    exercise_induced            BIT NOT NULL,
    diagnosis                   BIT NOT NULL,                -- target: 0 = No Asthma, 1 = Asthma
    doctor_in_charge            NVARCHAR(50) NULL            
);
GO

CREATE NONCLUSTERED INDEX IX_fact_patient_diagnosis ON patient.fact_patient(diagnosis);
CREATE NONCLUSTERED INDEX IX_fact_patient_ethnicity ON patient.fact_patient(ethnicity_id);
CREATE NONCLUSTERED INDEX IX_fact_patient_location ON patient.fact_patient(location_id);
GO

-- ---------------------------------------------------------------------------
-- Table: ML model predictions (populated by the Python ML pipeline / chatbot
-- layer, not by hand — schema provided so Power BI/Tableau can join on it)
-- ---------------------------------------------------------------------------
IF OBJECT_ID('patient.fact_prediction') IS NOT NULL DROP TABLE patient.fact_prediction;
GO

CREATE TABLE patient.fact_prediction (
    prediction_id       BIGINT IDENTITY(1,1) PRIMARY KEY,
    patient_id          INT NOT NULL FOREIGN KEY REFERENCES patient.fact_patient(patient_id),
    model_name          NVARCHAR(50) NOT NULL,       -- 'Logistic Regression','Random Forest','XGBoost','SVM','Decision Tree'
    predicted_label     BIT NOT NULL,
    predicted_probability FLOAT NOT NULL,
    is_best_model       BIT NOT NULL DEFAULT 0,
    scored_at           DATETIME2 NOT NULL DEFAULT SYSUTCDATETIME()
);
GO

CREATE NONCLUSTERED INDEX IX_fact_prediction_patient ON patient.fact_prediction(patient_id);
GO
