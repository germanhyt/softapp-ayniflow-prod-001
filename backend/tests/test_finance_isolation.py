from datetime import date
from decimal import Decimal

from fastapi.testclient import TestClient


def _auth_headers(client: TestClient, username: str, password: str) -> dict[str, str]:
    login = client.post("/auth/login", json={"username": username, "password": password})
    assert login.status_code == 200, login.text
    return {"Authorization": f"Bearer {login.json()['access_token']}"}


def _create_tx(client: TestClient, headers: dict[str, str], concept: str, amount: str = "10.00") -> dict:
    response = client.post(
        "/finance/transactions",
        headers=headers,
        json={
            "transaction_date": date.today().isoformat(),
            "movement_type": "Egreso",
            "amount": amount,
            "concept": concept,
            "bank": "BCP",
            "payment_type": "Transferencia",
            "operation_number": f"ISO-{concept[:8]}-{amount}",
        },
    )
    assert response.status_code == 201, response.text
    return response.json()


def test_rest_finance_is_isolated_per_user(client: TestClient, admin_headers):
    created = client.post(
        "/users",
        headers=admin_headers,
        json={
            "email": "aislado@example.com",
            "username": "aislado",
            "password": "Aislado123!",
            "full_name": "Usuario Aislado",
            "role_slug": "operator",
        },
    )
    assert created.status_code == 201, created.text

    other_headers = _auth_headers(client, "aislado", "Aislado123!")
    admin_tx = _create_tx(client, admin_headers, "Solo admin")
    other_tx = _create_tx(client, other_headers, "Solo aislado")

    admin_list = client.get("/finance/transactions?page=1&page_size=100", headers=admin_headers)
    other_list = client.get("/finance/transactions?page=1&page_size=100", headers=other_headers)
    assert admin_list.status_code == 200
    assert other_list.status_code == 200

    admin_ids = {item["id"] for item in admin_list.json()["items"]}
    other_ids = {item["id"] for item in other_list.json()["items"]}

    assert admin_tx["id"] in admin_ids
    assert other_tx["id"] not in admin_ids
    assert other_tx["id"] in other_ids
    assert admin_tx["id"] not in other_ids

    admin_summary = client.get("/finance/summary", headers=admin_headers).json()
    other_summary = client.get("/finance/summary", headers=other_headers).json()
    assert Decimal(str(admin_summary["total_expense"])) != Decimal(str(other_summary["total_expense"]))


def test_ws_preload_only_returns_current_user_transactions(client: TestClient, admin_headers):
    created = client.post(
        "/users",
        headers=admin_headers,
        json={
            "email": "wsuser@example.com",
            "username": "wsuser",
            "password": "WsUser123!",
            "full_name": "WS User",
            "role_slug": "operator",
        },
    )
    assert created.status_code == 201, created.text

    other_headers = _auth_headers(client, "wsuser", "WsUser123!")
    admin_tx = _create_tx(client, admin_headers, "Admin WS leak check")
    other_tx = _create_tx(client, other_headers, "Other WS own tx")

    other_token = other_headers["Authorization"].removeprefix("Bearer ")
    with client.websocket_connect(f"/finance/ws?token={other_token}") as websocket:
        connected = websocket.receive_json()
        assert connected["type"] == "connected"
        preload = websocket.receive_json()
        assert preload["type"] == "transactions.preload"
        items = preload["data"]["items"]
        ids = {item["id"] for item in items}
        assert other_tx["id"] in ids
        assert admin_tx["id"] not in ids
