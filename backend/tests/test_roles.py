def test_list_permissions_requires_roles_read(client, admin_headers):
    response = client.get("/permissions", headers=admin_headers)
    assert response.status_code == 200, response.text
    payload = response.json()
    assert isinstance(payload, list)
    codes = {item["code"] for item in payload}
    assert "users:read" in codes
    assert "roles:write" in codes
    assert "finance:read" in codes


def test_update_role_permissions_persists_and_survives_seed(client, admin_headers):
    from app.modules.auth.application.seed import seed_auth_data

    roles = client.get("/roles", headers=admin_headers)
    assert roles.status_code == 200, roles.text
    operator = next(role for role in roles.json() if role["slug"] == "operator")

    updated = client.put(
        f"/roles/{operator['id']}/permissions",
        headers=admin_headers,
        json={"permission_codes": ["finance:read", "users:read"]},
    )
    assert updated.status_code == 200, updated.text
    codes = {item["code"] for item in updated.json()["permissions"]}
    assert codes == {"finance:read", "users:read"}

    # Seed no debe pisar permisos custom de operator.
    seed_auth_data()

    refreshed = client.get("/roles", headers=admin_headers)
    assert refreshed.status_code == 200, refreshed.text
    operator_after = next(role for role in refreshed.json() if role["slug"] == "operator")
    codes_after = {item["code"] for item in operator_after["permissions"]}
    assert codes_after == {"finance:read", "users:read"}

    # Restaura matriz default del operator para no contaminar otros tests.
    restored = client.put(
        f"/roles/{operator['id']}/permissions",
        headers=admin_headers,
        json={
            "permission_codes": [
                "finance:read",
                "finance:write",
                "integrations:read",
                "integrations:gmail_connect",
            ]
        },
    )
    assert restored.status_code == 200, restored.text
