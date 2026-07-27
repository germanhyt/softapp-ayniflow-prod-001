from collections import defaultdict
from datetime import date, datetime, timedelta
from zoneinfo import ZoneInfo

from app.core.config import settings
from app.modules.auth.domain.models import User


def _to_local_date(value: datetime, tz: ZoneInfo) -> date:
    if value.tzinfo is None:
        return value.date()
    return value.astimezone(tz).date()


def build_user_stats(users: list[User]) -> dict:
    tz = ZoneInfo(settings.app_timezone)
    today = datetime.now(tz).date()
    month_start = today.replace(day=1)
    last_7_start = today - timedelta(days=6)
    chart_start = today - timedelta(days=29)

    summary = {
        "total": len(users),
        "active": 0,
        "inactive": 0,
        "google_linked": 0,
        "manual": 0,
        "registered_this_month": 0,
        "registered_last_7_days": 0,
    }
    role_counts: dict[str, dict[str, str | int]] = {}
    day_counts: dict[str, int] = defaultdict(int)

    for offset in range(30):
        day = chart_start + timedelta(days=offset)
        day_counts[day.isoformat()] = 0

    recent: list[dict] = []

    for user in users:
        if user.is_active:
            summary["active"] += 1
        else:
            summary["inactive"] += 1

        if user.google_sub:
            summary["google_linked"] += 1
        else:
            summary["manual"] += 1

        created = user.created_at
        if created is not None:
            local_day = _to_local_date(created, tz)
            if local_day >= month_start:
                summary["registered_this_month"] += 1
            if local_day >= last_7_start:
                summary["registered_last_7_days"] += 1
            if local_day >= chart_start:
                day_counts[local_day.isoformat()] += 1

        role = user.roles[0] if user.roles else None
        if role:
            bucket = role_counts.setdefault(
                role.slug,
                {"slug": role.slug, "name": role.name, "count": 0},
            )
            bucket["count"] = int(bucket["count"]) + 1

        recent.append(
            {
                "id": user.id,
                "username": user.username,
                "email": user.email,
                "role_name": role.name if role else None,
                "created_at": created,
                "google_linked": bool(user.google_sub),
                "is_active": user.is_active,
            }
        )

    recent.sort(key=lambda item: item["created_at"] or datetime.min, reverse=True)

    return {
        "summary": summary,
        "registrations_by_day": [
            {"date": day_key, "count": day_counts[day_key]}
            for day_key in sorted(day_counts.keys())
        ],
        "by_role": sorted(role_counts.values(), key=lambda item: (-int(item["count"]), str(item["name"]))),
        "recent_users": recent[:8],
        "generated_at": datetime.now(tz),
    }
