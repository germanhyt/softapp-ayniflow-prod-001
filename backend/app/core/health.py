from sqlalchemy import text
from sqlalchemy.exc import SQLAlchemyError

from app.core.config import settings
from app.core.database import engine


def check_database() -> dict[str, str]:
    try:
        with engine.connect() as connection:
            connection.execute(text("SELECT 1"))
        return {"database": "up"}
    except SQLAlchemyError as exc:
        return {"database": "down", "detail": str(exc)}


def build_health_payload() -> dict:
    db_status = check_database()
    overall = "ok" if db_status.get("database") == "up" else "degraded"

    return {
        "status": overall,
        "service": "ayniflow-api",
        "version": settings.app_version,
        "checks": db_status,
    }
