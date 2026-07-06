def test_finance_summary_includes_by_category(client, admin_headers):
    response = client.get("/finance/summary", headers=admin_headers)
    assert response.status_code == 200
    payload = response.json()
    assert "by_category" in payload
    assert isinstance(payload["by_category"], list)
    if payload["by_category"]:
        item = payload["by_category"][0]
        assert "category" in item
        assert "amount" in item
        assert "count" in item
