/* 2 create_tables_gbd
   Star schema : measure_name, location_name, sex_name, age_name,metric_name, year, val, upper, lower.
    fact_burden: one row per (measure, location, sex, age, metric, year).
 */

USE AsthmaAnalytics;
GO

IF OBJECT_ID('gbd.fact_burden') IS NOT NULL DROP TABLE gbd.fact_burden;
GO

-- ---------------------------------------------------------------------------
-- Dimension: Measure  (Deaths / Prevalence / Incidence / DALYs / YLDs)
-- ---------------------------------------------------------------------------
IF OBJECT_ID('gbd.dim_measure') IS NOT NULL DROP TABLE gbd.dim_measure;
GO

CREATE TABLE gbd.dim_measure (
    measure_id      INT IDENTITY(1,1) PRIMARY KEY,
    measure_name    NVARCHAR(50) NOT NULL UNIQUE
);
GO

-- ---------------------------------------------------------------------------
-- Dimension: Location  (204 countries)
-- ---------------------------------------------------------------------------
IF OBJECT_ID('gbd.dim_location') IS NOT NULL DROP TABLE gbd.dim_location;
GO

CREATE TABLE gbd.dim_location (
    location_id     INT IDENTITY(1,1) PRIMARY KEY,
    location_name   NVARCHAR(100) NOT NULL UNIQUE,
    region          NVARCHAR(100) NULL,       --  for map groupings
    iso3_code       CHAR(3) NULL              --  for Power BI map 
);
GO

-- ---------------------------------------------------------------------------
-- Dimension: Age group
-- ---------------------------------------------------------------------------
IF OBJECT_ID('gbd.dim_age') IS NOT NULL DROP TABLE gbd.dim_age;
GO

CREATE TABLE gbd.dim_age (
    age_id          INT IDENTITY(1,1) PRIMARY KEY,
    age_name        NVARCHAR(30) NOT NULL UNIQUE,   -- '0-14 years','15-49 years','50-69 years','70+ years','All ages','Age-standardized'
    age_order       TINYINT NOT NULL                -- 1-6, for correct chart sorting
);
GO

-- ---------------------------------------------------------------------------
-- Dimension: Sex
-- ---------------------------------------------------------------------------
IF OBJECT_ID('gbd.dim_sex') IS NOT NULL DROP TABLE gbd.dim_sex;
GO

CREATE TABLE gbd.dim_sex (
    sex_id          INT IDENTITY(1,1) PRIMARY KEY,
    sex_name        NVARCHAR(10) NOT NULL UNIQUE,   -- 'Male','Female'
    sex_code        TINYINT NOT NULL UNIQUE         -- 1 = Male, 2 = Female
);
GO

-- ---------------------------------------------------------------------------
-- Dimension: Metric  (Number / Percent / Rate)
-- ---------------------------------------------------------------------------
IF OBJECT_ID('gbd.dim_metric') IS NOT NULL DROP TABLE gbd.dim_metric;
GO

CREATE TABLE gbd.dim_metric (
    metric_id       INT IDENTITY(1,1) PRIMARY KEY,
    metric_name     NVARCHAR(20) NOT NULL UNIQUE
);
GO

-- ---------------------------------------------------------------------------
-- Dimension: Year (with decade bucket for grouped views)
-- ---------------------------------------------------------------------------
IF OBJECT_ID('gbd.dim_year') IS NOT NULL DROP TABLE gbd.dim_year;
GO

CREATE TABLE gbd.dim_year (
    year_id         INT IDENTITY(1,1) PRIMARY KEY,
    year_value      SMALLINT NOT NULL UNIQUE,       -- 1990,1995,2000,2005,2010,2015,2019,2021,2023
    decade          CHAR(6) NOT NULL                -- '1990s','2000s','2010s','2020s'
);
GO

-- ---------------------------------------------------------------------------
-- Fact: Burden estimates
-- ---------------------------------------------------------------------------
IF OBJECT_ID('gbd.fact_burden') IS NOT NULL DROP TABLE gbd.fact_burden;
GO

CREATE TABLE gbd.fact_burden (
    fact_id         BIGINT IDENTITY(1,1) PRIMARY KEY,
    measure_id      INT NOT NULL FOREIGN KEY REFERENCES gbd.dim_measure(measure_id),
    location_id     INT NOT NULL FOREIGN KEY REFERENCES gbd.dim_location(location_id),
    sex_id          INT NOT NULL FOREIGN KEY REFERENCES gbd.dim_sex(sex_id),
    age_id          INT NOT NULL FOREIGN KEY REFERENCES gbd.dim_age(age_id),
    metric_id       INT NOT NULL FOREIGN KEY REFERENCES gbd.dim_metric(metric_id),
    year_id         INT NOT NULL FOREIGN KEY REFERENCES gbd.dim_year(year_id),
    val             FLOAT NOT NULL,                 -- central estimate, raw units (multiply by 100 in view if metric = Percent)
    upper           FLOAT NOT NULL,                 -- upper confidence bound
    lower           FLOAT NOT NULL,                 -- lower confidence bound
    CONSTRAINT UQ_fact_burden_grain UNIQUE (measure_id, location_id, sex_id, age_id, metric_id, year_id)
);
GO

CREATE NONCLUSTERED INDEX IX_fact_burden_location ON gbd.fact_burden(location_id);
CREATE NONCLUSTERED INDEX IX_fact_burden_year ON gbd.fact_burden(year_id);
CREATE NONCLUSTERED INDEX IX_fact_burden_measure ON gbd.fact_burden(measure_id);
GO
