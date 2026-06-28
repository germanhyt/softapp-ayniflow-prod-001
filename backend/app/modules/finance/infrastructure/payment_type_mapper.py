PAYMENT_TYPE_ALIASES: dict[str, str] = {
    "PAGO_QR": "PAGO QR",
    "PAGO QR": "PAGO QR",
    "YAPEO_CELULAR": "YAPEO CELULAR",
    "YAPEO CELULAR": "YAPEO CELULAR",
    "PAGO_SERVICIO": "PAGO SERVICIO",
    "PAGO SERVICIO": "PAGO SERVICIO",
    "TRANSFERENCIA": "TRANSFERENCIA",
    "EFECTIVO": "EFECTIVO",
    "COMPRA": "COMPRA",
    "CONSUMO_DEBITO": "COMPRA",
    "CONSUMO DEBITO": "COMPRA",
    "VENTA": "VENTA",
    "DESCONOCIDO": "OTROS",
}


def normalize_payment_type(value: str | None) -> str:
    if not value:
        return "TRANSFERENCIA"

    raw = value.strip()
    upper = raw.upper()
    if upper in PAYMENT_TYPE_ALIASES:
        return PAYMENT_TYPE_ALIASES[upper]

    underscored = upper.replace(" ", "_")
    if underscored in PAYMENT_TYPE_ALIASES:
        return PAYMENT_TYPE_ALIASES[underscored]

    spaced = upper.replace("_", " ")
    if spaced in PAYMENT_TYPE_ALIASES:
        return PAYMENT_TYPE_ALIASES[spaced]

    return raw
