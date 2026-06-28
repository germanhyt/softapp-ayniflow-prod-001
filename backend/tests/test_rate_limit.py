def test_login_rate_limit(client):
    payload = {"username": "admin", "password": "wrong-password"}

    for _ in range(10):
        response = client.post("/auth/login", json=payload)
        assert response.status_code in {401, 422}

    blocked = client.post("/auth/login", json=payload)
    assert blocked.status_code == 429
    assert blocked.json()["success"] is False