from database import run_query

def build_grounding_context(lang: str = "en") -> str:
    latest_year_row = run_query("SELECT MAX(year) AS yr FROM gbd.vw_burden")
    latest_year = latest_year_row[0]["yr"] if latest_year_row else None

    top_deaths = run_query(
        """
        SELECT TOP 10 location_name, SUM(val) AS total_deaths
        FROM gbd.vw_burden
        WHERE measure_name = 'Deaths' AND metric_name = 'Number'
          AND age_name = 'All ages' AND year = :yr
        GROUP BY location_name
        ORDER BY total_deaths DESC
        """,
        {"yr": latest_year},
    )

    top_prevalence = run_query(
        """
        SELECT TOP 10 location_name, val_display AS prevalence_pct
        FROM gbd.vw_burden
        WHERE measure_name = 'Prevalence' AND metric_name = 'Percent'
          AND age_name = 'All ages' AND year = :yr
        ORDER BY val_display DESC
        """,
        {"yr": latest_year},
    )

    risk_factors = run_query("SELECT * FROM patient.vw_risk_factor_summary")

    patient_count_row = run_query("SELECT COUNT(*) AS n FROM patient.fact_patient")
    patient_count = patient_count_row[0]["n"] if patient_count_row else 0

    context = {
        "latest_gbd_year": latest_year,
        "top_10_countries_by_deaths": top_deaths,
        "top_10_countries_by_prevalence_pct": top_prevalence,
        "risk_factor_prevalence_in_patient_sample": risk_factors,
        "patient_sample_size": patient_count,
    }

    import json
    return json.dumps(context, ensure_ascii=False, default=str)
