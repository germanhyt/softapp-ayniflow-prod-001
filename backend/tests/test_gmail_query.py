from app.modules.finance.application.gmail_query import (
    build_gmail_query_from_labels,
    parse_gmail_labels,
)


def test_parse_single_label():
    assert parse_gmail_labels("label:PAGOS/BCP/YAPE") == ["PAGOS/BCP/YAPE"]


def test_parse_multi_label_or_group():
    query = "{label:PAGOS/BCP/YAPE OR label:PAGOS/INTERBANK}"
    assert parse_gmail_labels(query) == ["PAGOS/BCP/YAPE", "PAGOS/INTERBANK"]


def test_build_single_and_multi():
    assert build_gmail_query_from_labels(["PAGOS/BCP/YAPE"]) == "label:PAGOS/BCP/YAPE"
    assert build_gmail_query_from_labels(["PAGOS/BCP/YAPE", "PAGOS/BBVA"]) == (
        "{label:PAGOS/BCP/YAPE OR label:PAGOS/BBVA}"
    )


def test_roundtrip_labels():
    labels = ["PAGOS/BCP/YAPE", "ALERTAS/OTRO"]
    query = build_gmail_query_from_labels(labels)
    assert parse_gmail_labels(query) == labels
