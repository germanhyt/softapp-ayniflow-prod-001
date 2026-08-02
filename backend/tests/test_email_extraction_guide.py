def test_extraction_guide_requires_integrations_write(client, admin_headers):
    response = client.get(
        "/finance/integrations/gmail/extraction-guide",
        headers=admin_headers,
    )
    assert response.status_code == 200, response.text
    payload = response.json()
    assert payload["bank_focus"]
    assert len(payload["types"]) >= 5
    ids = {item["id"] for item in payload["types"]}
    assert "yapeo_celular_egreso" in ids
    assert "pago_qr" in ids

    created = client.post(
        "/users",
        headers=admin_headers,
        json={
            "email": "member-extract@test.com",
            "username": "memberextract",
            "password": "Member123!",
            "full_name": "Member Extract",
            "role_slug": "member",
        },
    )
    assert created.status_code == 201, created.text

    login = client.post(
        "/auth/login",
        json={"username": "memberextract", "password": "Member123!"},
    )
    assert login.status_code == 200
    member_headers = {"Authorization": f"Bearer {login.json()['access_token']}"}

    forbidden = client.get(
        "/finance/integrations/gmail/extraction-guide",
        headers=member_headers,
    )
    assert forbidden.status_code == 403

    client.delete(f"/users/{created.json()['id']}", headers=admin_headers)
