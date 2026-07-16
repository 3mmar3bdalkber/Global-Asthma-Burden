/* 1.  database_and_schemas.sql
   */

IF DB_ID('AsthmaAnalytics') IS NULL
BEGIN
    CREATE DATABASE AsthmaAnalytics;
END
GO

USE AsthmaAnalytics;
GO

IF NOT EXISTS (SELECT 1 FROM sys.schemas WHERE name = 'gbd')
    EXEC('CREATE SCHEMA gbd AUTHORIZATION dbo');
GO
IF NOT EXISTS (SELECT 1 FROM sys.schemas WHERE name = 'patient')
    EXEC('CREATE SCHEMA patient AUTHORIZATION dbo');
GO

/* dedicated read-only role per schema */
IF DATABASE_PRINCIPAL_ID('gbd_reader') IS NULL
    CREATE ROLE gbd_reader AUTHORIZATION dbo;
GO
IF DATABASE_PRINCIPAL_ID('patient_reader') IS NULL
    CREATE ROLE patient_reader AUTHORIZATION dbo;
GO
GRANT SELECT ON SCHEMA::gbd TO gbd_reader;
GRANT SELECT ON SCHEMA::patient TO patient_reader;
GO
