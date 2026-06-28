import uuid

import pytest


@pytest.fixture
def auth_headers(admin_token: str) -> dict[str, str]:
    return {"Authorization": f"Bearer {admin_token}"}


def _create_loan(client, headers: dict[str, str], *, loan_type: str, outstanding: str = "1000.00"):
    response = client.post(
        "/finance/loans",
        headers=headers,
        json={
            "loan_type": loan_type,
            "lender": f"Test {loan_type} {uuid.uuid4().hex[:6]}",
            "principal_amount": "1000.00",
            "outstanding_amount": outstanding,
        },
    )
    assert response.status_code == 201, response.text
    return response.json()


def _create_transaction(client, headers: dict[str, str], **overrides):
    payload = {
        "transaction_date": "2026-06-21",
        "movement_type": "Egreso",
        "concept": "Pago vinculado",
        "bank": "BCP",
        "payment_type": "Transferencia",
        "amount": "200.00",
        "operation_number": f"LN-{uuid.uuid4().hex[:8]}",
        **overrides,
    }
    response = client.post("/finance/transactions", headers=headers, json=payload)
    return response


def test_payable_egreso_reduces_outstanding(client, auth_headers):
    loan = _create_loan(client, auth_headers, loan_type="payable")
    response = _create_transaction(
        client,
        auth_headers,
        movement_type="Egreso",
        loan_record_id=loan["id"],
    )
    assert response.status_code == 201

    detail = client.get(f"/finance/loans?page=1&page_size=50", headers=auth_headers)
    assert detail.status_code == 200
    updated = next(item for item in detail.json()["items"] if item["id"] == loan["id"])
    assert updated["outstanding_amount"] == "800.00"
    assert updated["paid_amount"] == "200.00"


def test_receivable_ingreso_reduces_outstanding(client, auth_headers):
    loan = _create_loan(client, auth_headers, loan_type="receivable")
    response = _create_transaction(
        client,
        auth_headers,
        movement_type="Ingreso",
        loan_record_id=loan["id"],
    )
    assert response.status_code == 201

    detail = client.get(f"/finance/loans?page=1&page_size=50", headers=auth_headers)
    updated = next(item for item in detail.json()["items"] if item["id"] == loan["id"])
    assert updated["outstanding_amount"] == "800.00"


def test_receivable_egreso_increases_outstanding(client, auth_headers):
    loan = _create_loan(client, auth_headers, loan_type="receivable", outstanding="500.00")
    response = _create_transaction(
        client,
        auth_headers,
        movement_type="Egreso",
        loan_record_id=loan["id"],
        amount="100.00",
    )
    assert response.status_code == 201

    detail = client.get(f"/finance/loans?page=1&page_size=50", headers=auth_headers)
    updated = next(item for item in detail.json()["items"] if item["id"] == loan["id"])
    assert updated["outstanding_amount"] == "600.00"


def test_payable_rejects_ingreso_link(client, auth_headers):
    loan = _create_loan(client, auth_headers, loan_type="payable")
    response = _create_transaction(
        client,
        auth_headers,
        movement_type="Ingreso",
        loan_record_id=loan["id"],
    )
    assert response.status_code == 400
