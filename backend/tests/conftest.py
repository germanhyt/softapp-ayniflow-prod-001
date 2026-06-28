import os

import pytest
from fastapi.testclient import TestClient

os.environ.setdefault("DATABASE_URL", "sqlite://")
os.environ.setdefault("RATE_LIMIT_ENABLED", "true")
os.environ.setdefault("LOG_JSON", "false")
os.environ["WEBHOOK_SECRET"] = "test-webhook-secret"

from app.core.rate_limit import rate_limiter  # noqa: E402
from app.main import app  # noqa: E402


@pytest.fixture(autouse=True)
def reset_rate_limiter():
    rate_limiter.reset()
    yield
    rate_limiter.reset()


@pytest.fixture
def client():
    with TestClient(app) as test_client:
        yield test_client


@pytest.fixture
def admin_token(client: TestClient) -> str:
    response = client.post(
        "/auth/login",
        json={"username": "admin", "password": "Admin123!"},
    )
    assert response.status_code == 200
    return response.json()["access_token"]
