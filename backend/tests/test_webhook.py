import uuid


def test_webhook_requires_secret(client):
    response = client.post(
        "/finance/webhook",
        json={
            "fecha": "2026-06-21",
            "hora": "12:00",
            "banco": "BCP",
            "tipo": "Yape",
            "monto": 50,
            "destinatario": "Cliente",
            "num_operacion": f"WH-{uuid.uuid4().hex[:8]}",
        },
    )
    assert response.status_code == 401


def test_webhook_creates_transaction(client):
    operation_number = f"WH-{uuid.uuid4().hex[:8]}"
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
            "num_operacion": operation_number,
        },
    )
    assert response.status_code == 200
    assert response.json()["success"] is True


def test_webhook_rejects_duplicate(client):
    operation_number = f"WH-DUP-{uuid.uuid4().hex[:8]}"
    payload = {
        "fecha": "2026-06-21",
        "hora": "13:00",
        "banco": "BBVA",
        "tipo": "Transferencia",
        "monto": 75,
        "destinatario": "Proveedor",
        "num_operacion": operation_number,
    }
    headers = {"X-Webhook-Secret": "test-webhook-secret"}

    first = client.post("/finance/webhook", headers=headers, json=payload)
    second = client.post("/finance/webhook", headers=headers, json=payload)

    assert first.status_code == 200
    assert second.status_code == 409
