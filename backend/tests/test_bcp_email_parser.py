from app.modules.finance.infrastructure.bcp_email_parser import parse_bcp_email

MOCK_YAPE_BODY = """Hola German Ivan,

Realizaste un yapeo a celular de S/ 3.50 desde tu Cuenta de ahorro Soles.

A continuación, te enviamos los datos de tu operación.

Montos

Monto enviado S/ 3.50

Datos de la operación

Operación realizada Yapear a celular Fecha y hora 19 de febrero de 2026 - 08:26
AM Enviado a Test testing.
*** **3 403 Destino Yape Desde Cuenta de ahorro
**** 5057 Moneda Soles Mensaje Canal Banca Móvil BCP Número de operación
0099116666"""


def test_parse_yapeo_celular_historical():
    parsed = parse_bcp_email(
        subject="Constancia de Yapeo a Celular - Servicio de Notificaciones BCP",
        body=MOCK_YAPE_BODY,
        raw_date="2026-02-19T13:26:46.000Z",
        use_body_datetime=True,
    )

    assert parsed.fecha == "2026-02-19"
    assert parsed.hora == "08:26:00"
    assert parsed.movimiento == "EGRESO"
    assert parsed.banco == "BCP"
    assert parsed.tipo == "YAPEO_CELULAR"
    assert parsed.monto == 3.50
    assert parsed.destinatario == "Test testing."
    assert parsed.num_operacion == "0099116666"
    assert parsed.is_importable()


def test_parse_realtime_uses_email_date_fallback():
    parsed = parse_bcp_email(
        subject="Constancia de Yapeo a Celular - Servicio de Notificaciones BCP",
        body=MOCK_YAPE_BODY,
        raw_date="2026-02-19T13:26:46.000Z",
        use_body_datetime=False,
    )

    assert parsed.fecha == "2026-02-19"
    assert parsed.hora.startswith("08:26")
    assert parsed.is_importable()


def test_unknown_subject_not_importable():
    parsed = parse_bcp_email(
        subject="Correo genérico",
        body="sin datos",
        raw_date="2026-02-19T13:26:46.000Z",
    )
    assert parsed.banco == "PENDIENTE_MAPEO"
    assert not parsed.is_importable()


MOCK_DEBITO_BODY = """Hola German Ivan,

Realizaste un consumo de S/ 6.90 con tu Tarjeta de Débito BCP en LISTO HIPODROMO.

Datos de la operación

Monto S/ 6.90 Total del consumo
Operación realizada Consumo Tarjeta de Débito Fecha y hora 19 de junio de 2024 - 02:12 PM
Número de Tarjeta de Débito ************4543
Concepto LISTO HIPODROMO"""


def test_parse_consumo_tarjeta_debito():
    parsed = parse_bcp_email(
        subject="Realizaste un consumo con tu Tarjeta de Débito BCP - Servicio de Notificaciones BCP",
        body=MOCK_DEBITO_BODY,
        raw_date="2024-06-19T19:12:00.000Z",
        use_body_datetime=True,
    )

    assert parsed.fecha == "2024-06-19"
    assert parsed.hora == "14:12:00"
    assert parsed.movimiento == "EGRESO"
    assert parsed.banco == "BCP"
    assert parsed.tipo == "CONSUMO_DEBITO"
    assert parsed.monto == 6.90
    assert parsed.destinatario == "LISTO HIPODROMO"
    assert parsed.concepto == "LISTO HIPODROMO"
    assert parsed.num_operacion.startswith("TD-4543-")
    assert parsed.is_importable()


MOCK_YAPE_HTML = """<!DOCTYPE html><html><body>
<p>Realizaste un yapeo a celular de <b>S/ 3.00</b> desde tu <b>Cuenta de ahorro Soles.</b></p>
<table>
<tr><td>Operación realizada</td><td>Yapear a celular</td></tr>
<tr><td>Fecha y hora</td><td>16 de junio de 2026 - 10:15 AM</td></tr>
<tr><td>Enviado a</td><td><b>Samantha A Banos S.</b></td></tr>
<tr><td>Número de operación</td><td><b>00685413</b></td></tr>
</table>
</body></html>"""


def test_parse_yapeo_from_html_body():
    from app.modules.finance.infrastructure.gmail_client import GmailClient

    text = GmailClient._html_to_text(MOCK_YAPE_HTML)
    parsed = parse_bcp_email(
        subject="Constancia de Yapeo a Celular - Servicio de Notificaciones BCP",
        body=text,
        raw_date="2026-06-16T15:15:00.000Z",
        use_body_datetime=True,
    )

    assert parsed.monto == 3.00
    assert parsed.num_operacion == "00685413"
    assert "Samantha" in parsed.destinatario
    assert parsed.is_importable()


MOCK_QR_HTML = """<!DOCTYPE html><html><body>
<p>Realizaste un pago con QR de <b>S/ 12.50</b></p>
<tr><td>Número de operación</td><td><b>0011223344</b></td></tr>
<tr><td>Enviado a</td><td><b>COMERCIO QR SAC</b></td></tr>
</body></html>"""


def test_parse_pago_qr_from_html_body():
    from app.modules.finance.infrastructure.gmail_client import GmailClient

    text = GmailClient._html_to_text(MOCK_QR_HTML)
    parsed = parse_bcp_email(
        subject="Constancia de Pago con QR - Servicios de Notificaciones BCP",
        body=text,
        raw_date="2026-06-13T12:00:00.000Z",
        use_body_datetime=False,
    )

    assert parsed.tipo == "PAGO_QR"
    assert parsed.monto == 12.50
    assert parsed.num_operacion == "0011223344"
    assert parsed.is_importable()


MOCK_RECEPCION_YAPE = """Hola German Ivan,
Recibiste un yapeo de S/ 4.00 de Huaytalla Aquino German Ivan.
Monto recibido S/ 4.00
Operación realizada Yapeo a celular Fecha y hora 15 de marzo de 2026 - 02:27 PM
Enviado por Huaytalla Aquino German Ivan
¿No reconoces esta operación?"""


def test_parse_recepcion_yapeo_sin_num_operacion():
    parsed = parse_bcp_email(
        subject="Constancia de recepción de Yapeo a celular BCP - Servicio de Notificaciones BCP",
        body=MOCK_RECEPCION_YAPE,
        raw_date="2026-03-15T19:27:00.000Z",
        use_body_datetime=True,
    )

    assert parsed.movimiento == "INGRESO"
    assert parsed.monto == 4.00
    assert parsed.num_operacion.startswith("YRI-")
    assert "Huaytalla" in parsed.destinatario
    assert parsed.is_importable()
