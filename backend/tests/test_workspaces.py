def test_create_user_returns_friendly_validation_message(client, admin_headers):
    response = client.post(
        "/users",
        headers=admin_headers,
        json={
            "email": "correo-invalido",
            "username": "ab",
            "password": "corta",
            "role_slug": "reader",
        },
    )
    assert response.status_code == 422, response.text
    message = response.json()["message"]
    assert "Email" in message
    assert "Contraseña" in message or "Usuario" in message


def test_update_user_allows_editing_role_and_status(client, admin_headers):
    created = client.post(
        "/users",
        headers=admin_headers,
        json={
            "email": "edicion@example.com",
            "username": "edicion",
            "password": "Edicion123!",
            "full_name": "Usuario Edicion",
            "role_slug": "reader",
        },
    )
    assert created.status_code == 201, created.text
    user_id = created.json()["id"]

    updated = client.put(
        f"/users/{user_id}",
        headers=admin_headers,
        json={
            "full_name": "Usuario Editado",
            "role_slug": "operator",
            "is_active": False,
        },
    )
    assert updated.status_code == 200, updated.text
    payload = updated.json()
    assert payload["full_name"] == "Usuario Editado"
    assert payload["is_active"] is False
    assert payload["roles"][0]["slug"] == "operator"


def test_update_user_requires_users_write_permission(client):
    login = client.post(
        "/auth/login",
        json={"username": "lector", "password": "Lector123!"},
    )
    if login.status_code != 200:
        import pytest

        pytest.skip("Usuario lector no disponible para este entorno de test")
    token = login.json()["access_token"]
    response = client.put(
        "/users/1",
        headers={"Authorization": f"Bearer {token}"},
        json={"full_name": "Intento sin permiso"},
    )
    assert response.status_code == 403


def test_update_user_password_manual_and_auto(client, admin_headers):
    created = client.post(
        "/users",
        headers=admin_headers,
        json={
            "email": "pwd@example.com",
            "username": "pwduser",
            "password": "PwdUser123!",
            "full_name": "Pwd User",
            "role_slug": "reader",
        },
    )
    assert created.status_code == 201, created.text
    user_id = created.json()["id"]

    manual = client.patch(
        f"/users/{user_id}/password",
        headers=admin_headers,
        json={"password": "NuevaClave123!"},
    )
    assert manual.status_code == 200, manual.text
    assert manual.json()["password"] == "NuevaClave123!"

    login_ok = client.post("/auth/login", json={"username": "pwduser", "password": "NuevaClave123!"})
    assert login_ok.status_code == 200

    auto = client.patch(
        f"/users/{user_id}/password",
        headers=admin_headers,
        json={"auto_generate": True},
    )
    assert auto.status_code == 200, auto.text
    generated = auto.json()["password"]
    assert len(generated) >= 8

    login_auto = client.post("/auth/login", json={"username": "pwduser", "password": generated})
    assert login_auto.status_code == 200


def test_delete_user_removes_account(client, admin_headers):
    created = client.post(
        "/users",
        headers=admin_headers,
        json={
            "email": "borrar@example.com",
            "username": "borrar",
            "password": "Borrar123!",
            "full_name": "Usuario Borrar",
            "role_slug": "reader",
        },
    )
    assert created.status_code == 201, created.text
    user_id = created.json()["id"]

    deleted = client.delete(f"/users/{user_id}", headers=admin_headers)
    assert deleted.status_code == 204

    missing = client.get("/users", headers=admin_headers)
    assert all(user["id"] != user_id for user in missing.json())


def test_delete_user_blocks_self_deletion(client, admin_headers):
    me = client.get("/auth/me", headers=admin_headers)
    assert me.status_code == 200
    user_id = me.json()["id"]

    response = client.delete(f"/users/{user_id}", headers=admin_headers)
    assert response.status_code == 400
