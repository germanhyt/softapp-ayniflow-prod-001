from datetime import datetime, timedelta, timezone

from app.modules.auth.application.user_stats import build_user_stats
from app.modules.auth.domain.models import Role, User


def _user(
    *,
    user_id: int,
    username: str,
    created_at: datetime,
    role_slug: str = "member",
    google: bool = False,
    active: bool = True,
) -> User:
    role = Role(id=user_id, slug=role_slug, name=role_slug.title(), description=None)
    return User(
        id=user_id,
        email=f"{username}@test.com",
        username=username,
        hashed_password="hashed",
        full_name=username,
        google_sub=f"google-{user_id}" if google else None,
        is_active=active,
        created_at=created_at,
        roles=[role],
    )


def test_build_user_stats_groups_registrations_and_roles():
    now = datetime.now(timezone.utc)
    users = [
        _user(user_id=1, username="admin", created_at=now - timedelta(days=40), role_slug="admin"),
        _user(user_id=2, username="u1", created_at=now - timedelta(days=3), google=True),
        _user(user_id=3, username="u2", created_at=now - timedelta(days=1), google=True, active=False),
        _user(user_id=4, username="u3", created_at=now, role_slug="operator"),
    ]

    stats = build_user_stats(users)

    assert stats["summary"]["total"] == 4
    assert stats["summary"]["active"] == 3
    assert stats["summary"]["inactive"] == 1
    assert stats["summary"]["google_linked"] == 2
    assert stats["summary"]["manual"] == 2
    assert stats["summary"]["registered_last_7_days"] == 3
    assert len(stats["registrations_by_day"]) == 30
    assert sum(item["count"] for item in stats["registrations_by_day"]) == 3
    assert {item["slug"] for item in stats["by_role"]} == {"admin", "member", "operator"}
    assert len(stats["recent_users"]) == 4
    assert stats["recent_users"][0]["username"] == "u3"


def test_user_stats_endpoint_admin_only(client, admin_headers):
    stats = client.get("/users/stats", headers=admin_headers)
    assert stats.status_code == 200, stats.text
    payload = stats.json()
    assert payload["summary"]["total"] >= 1
    assert len(payload["registrations_by_day"]) == 30
    assert "generated_at" in payload

    created = client.post(
        "/users",
        headers=admin_headers,
        json={
            "email": "operator-stats@test.com",
            "username": "operatorstats",
            "password": "Operator123!",
            "full_name": "Operator Stats",
            "role_slug": "operator",
        },
    )
    assert created.status_code == 201, created.text

    login = client.post(
        "/auth/login",
        json={"username": "operatorstats", "password": "Operator123!"},
    )
    assert login.status_code == 200
    operator_headers = {"Authorization": f"Bearer {login.json()['access_token']}"}

    forbidden = client.get("/users/stats", headers=operator_headers)
    assert forbidden.status_code == 403

    client.delete(f"/users/{created.json()['id']}", headers=admin_headers)
