from app.modules.finance.infrastructure.payment_type_mapper import normalize_payment_type


def test_normalize_payment_type_aliases():
    assert normalize_payment_type("PAGO_SERVICIO") == "PAGO SERVICIO"
    assert normalize_payment_type("PAGO_QR") == "PAGO QR"
    assert normalize_payment_type("YAPEO_CELULAR") == "YAPEO CELULAR"
    assert normalize_payment_type("TRANSFERENCIA") == "TRANSFERENCIA"
