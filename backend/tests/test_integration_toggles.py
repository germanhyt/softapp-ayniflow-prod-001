import uuid


def test_webhook_inbound_respects_toggle(client, admin_token):
    headers = {"Authorization": f"Bearer {admin_token}"}

    disable = client.patch(
        "/finance/integrations/settings/webhook_inbound",
        headers=headers,
        json={"is_enabled": False},
    )
    assert disable.status_code == 200
    assert disable.json()["is_enabled"] is False

    response = client.post(
        "/finance/webhook",
        headers={"X-Webhook-Secret": "test-webhook-secret"},
        json={
            "fecha": "2026-06-21",
            "hora": "12:00",
            "banco": "BCP",
            "tipo": "Yape",
            "monto": 50,
            "destinatario": "Cliente",
            "num_operacion": f"WH-TGL-{uuid.uuid4().hex[:8]}",
        },
    )
    assert response.status_code == 403

    enable = client.patch(
        "/finance/integrations/settings/webhook_inbound",
        headers=headers,
        json={"is_enabled": True},
    )
    assert enable.status_code == 200
    assert enable.json()["is_enabled"] is True


def test_gemini_ocr_endpoint_respects_toggle(client, admin_token):
    headers = {"Authorization": f"Bearer {admin_token}"}

    disable = client.patch(
        "/finance/integrations/settings/gemini_ocr",
        headers=headers,
        json={"is_enabled": False},
    )
    assert disable.status_code == 200
    assert disable.json()["is_enabled"] is False

    response = client.post(
        "/finance/integrations/ocr",
        headers=headers,
        files={"file": ("voucher.png", b"fake-image", "image/png")},
    )
    assert response.status_code == 403

    enable = client.patch(
        "/finance/integrations/settings/gemini_ocr",
        headers=headers,
        json={"is_enabled": True},
    )
    assert enable.status_code == 200
