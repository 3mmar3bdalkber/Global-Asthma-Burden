/* =============================================================================
   00_drop_all.sql  (v2)
   Two options depending on your permissions. Run ONLY ONE of the two blocks
   below, not both.
   ========================================================================== */

-- ---------------------------------------------------------------------------
-- OPTION A — you have sysadmin/dbcreator rights (works on your own local
-- SQL Server install). Drops the whole database in one shot.
-- ---------------------------------------------------------------------------
USE master;
GO
IF DB_ID('AsthmaAnalytics') IS NOT NULL
BEGIN
    ALTER DATABASE AsthmaAnalytics SET SINGLE_USER WITH ROLLBACK IMMEDIATE;
    DROP DATABASE AsthmaAnalytics;
END
GO

-- Verify it's actually gone before continuing to 01. If this still returns
-- a row, Option A did not work (permissions) -- use Option B below instead.
SELECT name FROM sys.databases WHERE name = 'AsthmaAnalytics';
GO


-- ---------------------------------------------------------------------------
-- OPTION B — you only have db_owner rights inside AsthmaAnalytics (typical
-- on managed/shared/restricted SQL Server, or if Option A returned a row
-- above). Drops every object inside the database instead of the database
-- itself, in dependency order. Uncomment and run this whole block.
-- ---------------------------------------------------------------------------
/*
USE AsthmaAnalytics;
GO

IF OBJECT_ID('dbo.sp_asthma_summary') IS NOT NULL DROP PROCEDURE dbo.sp_asthma_summary;
IF OBJECT_ID('patient.sp_patient_risk_profile') IS NOT NULL DROP PROCEDURE patient.sp_patient_risk_profile;
IF OBJECT_ID('gbd.sp_country_compare') IS NOT NULL DROP PROCEDURE gbd.sp_country_compare;
GO

IF OBJECT_ID('patient.vw_local_vs_global_prevalence') IS NOT NULL DROP VIEW patient.vw_local_vs_global_prevalence;
IF OBJECT_ID('patient.vw_risk_factor_summary') IS NOT NULL DROP VIEW patient.vw_risk_factor_summary;
IF OBJECT_ID('patient.vw_patient_enriched') IS NOT NULL DROP VIEW patient.vw_patient_enriched;
IF OBJECT_ID('gbd.vw_country_latest') IS NOT NULL DROP VIEW gbd.vw_country_latest;
IF OBJECT_ID('gbd.vw_burden') IS NOT NULL DROP VIEW gbd.vw_burden;
GO

IF OBJECT_ID('patient.stg_patient_rejects') IS NOT NULL DROP TABLE patient.stg_patient_rejects;
IF OBJECT_ID('patient.stg_patient_raw') IS NOT NULL DROP TABLE patient.stg_patient_raw;
IF OBJECT_ID('gbd.stg_burden_rejects') IS NOT NULL DROP TABLE gbd.stg_burden_rejects;
IF OBJECT_ID('gbd.stg_burden_raw') IS NOT NULL DROP TABLE gbd.stg_burden_raw;
GO

IF OBJECT_ID('patient.fact_prediction') IS NOT NULL DROP TABLE patient.fact_prediction;
IF OBJECT_ID('patient.fact_patient') IS NOT NULL DROP TABLE patient.fact_patient;   -- has FK to gbd.dim_location, must drop before dim tables
IF OBJECT_ID('gbd.fact_burden') IS NOT NULL DROP TABLE gbd.fact_burden;
GO

IF OBJECT_ID('patient.dim_ethnicity') IS NOT NULL DROP TABLE patient.dim_ethnicity;
IF OBJECT_ID('patient.dim_education') IS NOT NULL DROP TABLE patient.dim_education;
IF OBJECT_ID('gbd.dim_location') IS NOT NULL DROP TABLE gbd.dim_location;
IF OBJECT_ID('gbd.dim_measure') IS NOT NULL DROP TABLE gbd.dim_measure;
IF OBJECT_ID('gbd.dim_sex') IS NOT NULL DROP TABLE gbd.dim_sex;
IF OBJECT_ID('gbd.dim_age') IS NOT NULL DROP TABLE gbd.dim_age;
IF OBJECT_ID('gbd.dim_metric') IS NOT NULL DROP TABLE gbd.dim_metric;
IF OBJECT_ID('gbd.dim_year') IS NOT NULL DROP TABLE gbd.dim_year;
GO

IF DATABASE_PRINCIPAL_ID('gbd_reader') IS NOT NULL DROP ROLE gbd_reader;
IF DATABASE_PRINCIPAL_ID('patient_reader') IS NOT NULL DROP ROLE patient_reader;
GO

IF EXISTS (SELECT 1 FROM sys.schemas WHERE name = 'gbd') DROP SCHEMA gbd;
IF EXISTS (SELECT 1 FROM sys.schemas WHERE name = 'patient') DROP SCHEMA patient;
GO

-- Confirm clean
SELECT s.name AS schema_name, t.name AS table_name
FROM sys.tables t JOIN sys.schemas s ON s.schema_id = t.schema_id
WHERE s.name IN ('gbd','patient');
-- Should return zero rows.
*/
