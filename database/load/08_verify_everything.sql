/* 
   8 verify_everything.sql
 */

USE AsthmaAnalytics;
GO
IF DB_NAME() <> 'AsthmaAnalytics'
BEGIN
    RAISERROR('Wrong database context. Select AsthmaAnalytics in the toolbar dropdown and re-run.', 16, 1);
    RETURN;
END
GO

PRINT '=== 1. Object inventory: schemas, tables, views, procs all exist ===';
SELECT s.name AS schema_name, t.name AS table_name, 'TABLE' AS obj_type
FROM sys.tables t JOIN sys.schemas s ON s.schema_id = t.schema_id
WHERE s.name IN ('gbd','patient')
UNION ALL
SELECT s.name, v.name, 'VIEW'
FROM sys.views v JOIN sys.schemas s ON s.schema_id = v.schema_id
WHERE s.name IN ('gbd','patient')
UNION ALL
SELECT s.name, p.name, 'PROCEDURE'
FROM sys.procedures p JOIN sys.schemas s ON s.schema_id = p.schema_id
WHERE s.name IN ('gbd','patient','dbo') AND (p.name LIKE '%asthma%' OR p.name LIKE 'sp_%')
ORDER BY obj_type, schema_name, table_name;
-- Expect: 7 gbd tables (6 dims + fact_burden), 4 patient tables (2 dims +
-- fact_patient + fact_prediction), 5 views, 3 procedures.
GO

PRINT '=== 2. Row counts: do they match the source files? ===';
SELECT 'gbd.fact_burden' AS tbl, COUNT(*) AS row_count FROM gbd.fact_burden
UNION ALL SELECT 'gbd.dim_location', COUNT(*) FROM gbd.dim_location
UNION ALL SELECT 'gbd.dim_measure', COUNT(*) FROM gbd.dim_measure
UNION ALL SELECT 'gbd.dim_sex', COUNT(*) FROM gbd.dim_sex
UNION ALL SELECT 'gbd.dim_age', COUNT(*) FROM gbd.dim_age
UNION ALL SELECT 'gbd.dim_metric', COUNT(*) FROM gbd.dim_metric
UNION ALL SELECT 'gbd.dim_year', COUNT(*) FROM gbd.dim_year
UNION ALL SELECT 'patient.fact_patient', COUNT(*) FROM patient.fact_patient
UNION ALL SELECT 'patient.dim_ethnicity', COUNT(*) FROM patient.dim_ethnicity
UNION ALL SELECT 'patient.dim_education', COUNT(*) FROM patient.dim_education;
-- Expect: fact_burden ~304,776 | dim_location 204 | dim_measure 5 | dim_sex 2
-- | dim_age 6 | dim_metric 3 | dim_year 9 | fact_patient 2,392
-- | dim_ethnicity 4 | dim_education 4
GO

PRINT '=== 3. Any rejected rows sitting around unexplained? ===';
IF OBJECT_ID('gbd.stg_burden_rejects') IS NOT NULL
    SELECT 'gbd rejects' AS source, COUNT(*) AS rejected_count FROM gbd.stg_burden_rejects;
IF OBJECT_ID('patient.stg_patient_rejects') IS NOT NULL
    SELECT 'patient rejects' AS source, COUNT(*) AS rejected_count FROM patient.stg_patient_rejects;
-- Expect: 0 for both, or a small number you've already reviewed and accepted.
GO

PRINT '=== 4. Orphan-FK check (should always be empty due to constraints, but verify) ===';
SELECT 'fact_burden -> dim_location' AS relationship, COUNT(*) AS orphan_count
FROM gbd.fact_burden f LEFT JOIN gbd.dim_location d ON d.location_id = f.location_id WHERE d.location_id IS NULL
UNION ALL
SELECT 'fact_patient -> dim_ethnicity', COUNT(*)
FROM patient.fact_patient f LEFT JOIN patient.dim_ethnicity d ON d.ethnicity_id = f.ethnicity_id WHERE d.ethnicity_id IS NULL
UNION ALL
SELECT 'fact_patient -> gbd.dim_location (via new FK)', COUNT(*)
FROM patient.fact_patient f LEFT JOIN gbd.dim_location d ON d.location_id = f.location_id
WHERE f.location_id IS NOT NULL AND d.location_id IS NULL;
-- Expect: 0 for all three.
GO

PRINT '=== 5. Duplicate-grain check on fact_burden (would break the star schema) ===';
SELECT TOP 10 measure_id, location_id, sex_id, age_id, metric_id, year_id, COUNT(*) AS dup_count
FROM gbd.fact_burden
GROUP BY measure_id, location_id, sex_id, age_id, metric_id, year_id
HAVING COUNT(*) > 1;
-- Expect: zero rows returned (no duplicates at the fact grain).
GO

PRINT '=== 6. Views return sane data ===';
SELECT TOP 5 * FROM gbd.vw_burden ORDER BY year DESC;
SELECT TOP 5 * FROM patient.vw_patient_enriched;
SELECT * FROM patient.vw_risk_factor_summary;
SELECT * FROM patient.vw_local_vs_global_prevalence;   -- likely empty until location_id is populated -- that's expected
GO

PRINT '=== 7. Headline numbers sanity check ===';
SELECT
    (SELECT COUNT(*) FROM patient.fact_patient)                                   AS total_patients,
    (SELECT COUNT(*) FROM patient.fact_patient WHERE diagnosis = 1)               AS diagnosed,
    (SELECT CAST(AVG(CAST(diagnosis AS FLOAT)) AS DECIMAL(5,4)) FROM patient.fact_patient) AS diagnosis_rate,
    (SELECT MIN(age) FROM patient.fact_patient)                                   AS min_age,
    (SELECT MAX(age) FROM patient.fact_patient)                                   AS max_age,
    (SELECT COUNT(DISTINCT location_name) FROM gbd.dim_location)                  AS gbd_countries,
    (SELECT MIN(year_value) FROM gbd.dim_year)                                    AS gbd_min_year,
    (SELECT MAX(year_value) FROM gbd.dim_year)                                    AS gbd_max_year;
-- Expect: total_patients 2392, diagnosed ~1171, diagnosis_rate ~0.49,
-- min_age 5, max_age 80, gbd_countries 204, gbd_min_year 1990, gbd_max_year 2023.
GO

PRINT '=== 8. Stored procedures actually run without error ===';
EXEC dbo.sp_asthma_summary @Country = NULL, @Year = NULL, @MeasureName = 'Prevalence';
EXEC gbd.sp_country_compare @CountryA = 'Egypt', @CountryB = 'Saudi Arabia';

DECLARE @FirstPatientId INT = (SELECT TOP 1 patient_id FROM patient.fact_patient);
EXEC patient.sp_patient_risk_profile @PatientId = @FirstPatientId;
GO

PRINT '=== Verification complete. Review each section above against the "Expect" comments. ===';
