/* 
   4 seed_reference_data.sql
   Static lookup values for both schemas. Fact tables are loaded separately
  */

USE AsthmaAnalytics;
GO

IF DB_NAME() <> 'AsthmaAnalytics'
BEGIN
    RAISERROR('Wrong database context. Select AsthmaAnalytics in the toolbar dropdown and re-run.', 16, 1);
    RETURN;
END
GO

-- GBD dimensions -------------------------------------------------------------
MERGE gbd.dim_measure AS tgt
USING (VALUES ('Deaths'), ('Prevalence'), ('Incidence'), ('DALYs (Disability-Adjusted Life Years)'), ('YLDs (Years Lived with Disability)')) AS src(measure_name)
ON tgt.measure_name = src.measure_name
WHEN NOT MATCHED THEN INSERT (measure_name) VALUES (src.measure_name);
GO

MERGE gbd.dim_sex AS tgt
USING (VALUES ('Male', 1), ('Female', 2)) AS src(sex_name, sex_code)
ON tgt.sex_name = src.sex_name
WHEN NOT MATCHED THEN INSERT (sex_name, sex_code) VALUES (src.sex_name, src.sex_code);
GO

MERGE gbd.dim_age AS tgt
USING (VALUES
    ('0-14 years', 1), ('15-49 years', 2), ('50-69 years', 3),
    ('70+ years', 4), ('All ages', 5), ('Age-standardized', 6)
) AS src(age_name, age_order)
ON tgt.age_name = src.age_name
WHEN NOT MATCHED THEN INSERT (age_name, age_order) VALUES (src.age_name, src.age_order);
GO

MERGE gbd.dim_metric AS tgt
USING (VALUES ('Number'), ('Percent'), ('Rate')) AS src(metric_name)
ON tgt.metric_name = src.metric_name
WHEN NOT MATCHED THEN INSERT (metric_name) VALUES (src.metric_name);
GO

MERGE gbd.dim_year AS tgt
USING (VALUES
    (1990,'1990s'), (1995,'1990s'), (2000,'2000s'), (2005,'2000s'),
    (2010,'2010s'), (2015,'2010s'), (2019,'2010s'), (2021,'2020s'), (2023,'2020s')
) AS src(year_value, decade)
ON tgt.year_value = src.year_value
WHEN NOT MATCHED THEN INSERT (year_value, decade) VALUES (src.year_value, src.decade);
GO


-- Patient dimensions -----------------------------------------------------
MERGE patient.dim_ethnicity AS tgt
USING (VALUES (0,'Caucasian'), (1,'African American'), (2,'Asian'), (3,'Other')) AS src(ethnicity_id, ethnicity_name)
ON tgt.ethnicity_id = src.ethnicity_id
WHEN NOT MATCHED THEN INSERT (ethnicity_id, ethnicity_name) VALUES (src.ethnicity_id, src.ethnicity_name);
GO

MERGE patient.dim_education AS tgt
USING (VALUES (0,'None'), (1,'High School'), (2,'Bachelor''s'), (3,'Higher')) AS src(education_id, education_name)
ON tgt.education_id = src.education_id
WHEN NOT MATCHED THEN INSERT (education_id, education_name) VALUES (src.education_id, src.education_name);
GO
