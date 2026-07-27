def test_login_success(client):
    response = client.post(
        "/auth/login",
        json={"username": "admin", "password": "Admin123!"},
    )
    assert response.status_code == 200
    assert "access_token" in response.json()


def test_login_invalid_credentials(client):
    response = client.post(
        "/auth/login",
        json={"username": "admin", "password": "wrong-password"},
    )
    assert response.status_code == 401
    assert response.json()["success"] is False


def test_me_requires_auth(client):
    response = client.get("/auth/me")
    assert response.status_code == 401


def test_me_with_token(client, admin_token):
    response = client.get("/auth/me", headers={"Authorization": f"Bearer {admin_token}"})
    assert response.status_code == 200
    assert response.json()["username"] == "admin"
    assert "finance:read" in response.json()["permissions"]
    assert response.json()["google_linked"] is False


def test_update_profile(client, admin_headers):
    response = client.patch(
        "/auth/me",
        headers=admin_headers,
        json={"full_name": "Administrador Actualizado"},
    )
    assert response.status_code == 200
    assert response.json()["full_name"] == "Administrador Actualizado"

    me = client.get("/auth/me", headers=admin_headers)
    assert me.json()["full_name"] == "Administrador Actualizado"


def test_change_own_password(client, admin_headers):
    response = client.patch(
        "/auth/me/password",
        headers=admin_headers,
        json={
            "current_password": "Admin123!",
            "new_password": "Admin1234!",
        },
    )
    assert response.status_code == 200
    assert response.json()["message"] == "Contraseña actualizada correctamente"

    login_old = client.post(
        "/auth/login",
        json={"username": "admin", "password": "Admin123!"},
    )
    assert login_old.status_code == 401

    login_new = client.post(
        "/auth/login",
        json={"username": "admin", "password": "Admin1234!"},
    )
    assert login_new.status_code == 200

    restore = client.patch(
        "/auth/me/password",
        headers={"Authorization": f"Bearer {login_new.json()['access_token']}"},
        json={
            "current_password": "Admin1234!",
            "new_password": "Admin123!",
        },
    )
    assert restore.status_code == 200


def test_change_own_password_wrong_current(client, admin_headers):
    response = client.patch(
        "/auth/me/password",
        headers=admin_headers,
        json={
            "current_password": "wrong-password",
            "new_password": "Admin1234!",
        },
    )
    assert response.status_code == 400


MINIMAL_PNG = (
    b"\x89PNG\r\n\x1a\n\x00\x00\x00\rIHDR\x00\x00\x00\x01"
    b"\x00\x00\x00\x01\x08\x06\x00\x00\x00\x1f\x15\xc4\x89"
    b"\x00\x00\x00\nIDATx\x9cc\x00\x01\x00\x00\x05\x00\x01"
    b"\x0d\n-\xdb\x00\x00\x00\x00IEND\xaeB`\x82"
)


def test_upload_and_remove_avatar(client, admin_headers):
    upload = client.post(
        "/auth/me/avatar",
        headers=admin_headers,
        files={"file": ("avatar.png", MINIMAL_PNG, "image/png")},
    )
    assert upload.status_code == 200
    avatar_url = upload.json()["avatar_url"]
    assert avatar_url.startswith("/uploads/avatars/user_")

    me = client.get("/auth/me", headers=admin_headers)
    assert me.json()["avatar_url"] == avatar_url

    removed = client.delete("/auth/me/avatar", headers=admin_headers)
    assert removed.status_code == 200
    assert removed.json()["avatar_url"] is None


def test_finance_requires_permission(client, admin_token):
    response = client.get(
        "/finance/summary",
        headers={"Authorization": f"Bearer {admin_token}"},
    )
    assert response.status_code == 200
    assert "total_income" in response.json()
