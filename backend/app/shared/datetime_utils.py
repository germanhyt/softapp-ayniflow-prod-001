from datetime import datetime, timedelta, timezone
from functools import lru_cache
from zoneinfo import ZoneInfo, ZoneInfoNotFoundError

from app.core.config import settings

# Perú no usa horario de verano; fallback fijo UTC-5 si falta tzdata (Windows).
_LIMA_FALLBACK = timezone(timedelta(hours=-5), name="America/Lima")


@lru_cache
def get_app_timezone():
    tz_name = (settings.app_timezone or "America/Lima").strip()
    try:
        return ZoneInfo(tz_name)
    except ZoneInfoNotFoundError:
        if tz_name in {"America/Lima", "America/Bogota", "America/Guayaquil"}:
            return _LIMA_FALLBACK
        return timezone.utc


def now_app() -> datetime:
    return datetime.now(get_app_timezone())


def to_app_timezone(dt: datetime | None) -> datetime | None:
    if dt is None:
        return None
    if dt.tzinfo is None:
        dt = dt.replace(tzinfo=timezone.utc)
    return dt.astimezone(get_app_timezone())


def serialize_datetime(dt: datetime | None) -> str | None:
    localized = to_app_timezone(dt)
    if localized is None:
        return None
    return localized.isoformat()


def format_datetime_display(dt: datetime | None) -> str | None:
    localized = to_app_timezone(dt)
    if localized is None:
        return None
    return localized.strftime("%d/%m/%Y %H:%M:%S")
