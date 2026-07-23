import os
import urllib.parse
from dotenv import load_dotenv
from sqlalchemy import create_engine, text

load_dotenv()

DB_SERVER = os.getenv("DB_SERVER", "localhost")
DB_NAME = os.getenv("DB_NAME", "AsthmaAnalytics")
DB_DRIVER = os.getenv("DB_DRIVER", "ODBC Driver 17 for SQL Server")
DB_USER = os.getenv("DB_USER", "")
DB_PASSWORD = os.getenv("DB_PASSWORD", "")

if DB_USER and DB_PASSWORD:
    # SQL Server Authentication
    odbc_str = (
        f"DRIVER={{{DB_DRIVER}}};SERVER={DB_SERVER};DATABASE={DB_NAME};"
        f"UID={DB_USER};PWD={DB_PASSWORD};TrustServerCertificate=yes;"
    )
else:
    # Windows Authentication
    odbc_str = (
        f"DRIVER={{{DB_DRIVER}}};SERVER={DB_SERVER};DATABASE={DB_NAME};"
        f"Trusted_Connection=yes;TrustServerCertificate=yes;"
    )

params = urllib.parse.quote_plus(odbc_str)
engine = create_engine(f"mssql+pyodbc:///?odbc_connect={params}", fast_executemany=True, pool_pre_ping=True)


def run_query(sql: str, params: dict | None = None) -> list[dict]:
    with engine.connect() as conn:
        result = conn.execute(text(sql), params or {})
        cols = result.keys()
        return [dict(zip(cols, row)) for row in result.fetchall()]


def run_proc(proc_name: str, params: dict) -> list[dict]:
    placeholders = ", ".join(f"@{k} = :{k}" for k in params.keys())
    sql = f"EXEC {proc_name} {placeholders}" if placeholders else f"EXEC {proc_name}"
    with engine.connect() as conn:
        result = conn.execute(text(sql), params)
        cols = result.keys()
        return [dict(zip(cols, row)) for row in result.fetchall()]


def test_connection() -> bool:
    with engine.connect() as conn:
        conn.execute(text("SELECT 1"))
    return True
