"""Catálogo documentado de cómo AyniFlow extrae datos de cada tipo de correo.

Fuente de verdad alineada con `bcp_email_parser.parse_bcp_email`.
"""

from __future__ import annotations

EMAIL_EXTRACTION_CATALOG: list[dict] = [
    {
        "id": "yapeo_celular_egreso",
        "bank": "BCP",
        "name": "Yapeo a celular / Transferencia",
        "movement": "EGRESO",
        "tipo_operacion": "YAPEO_CELULAR",
        "subject_patterns": ["YAPEO A CELULAR", "TRANSFERENCIA"],
        "description": "Constancias de envío Yape o transferencias BCP.",
        "fields": [
            {
                "field": "fecha / hora",
                "source": "Cuerpo: «Fecha y hora … dd de mes de aaaa - hh:mm AM/PM»",
                "required": True,
            },
            {
                "field": "monto",
                "source": "«Monto enviado» o «yapeo a celular de S/ X.XX»",
                "required": True,
            },
            {
                "field": "destinatario",
                "source": "«Enviado a …» hasta Destino/Desde/Número de operación",
                "required": False,
            },
            {
                "field": "num_operacion",
                "source": "«Número de operación» (6+ dígitos)",
                "required": True,
            },
            {
                "field": "concepto",
                "source": "«Mensaje …» o «Sin mensaje»",
                "required": False,
            },
        ],
    },
    {
        "id": "yapeo_recibido",
        "bank": "BCP",
        "name": "Recepción de yapeo",
        "movement": "INGRESO",
        "tipo_operacion": "YAPEO_CELULAR",
        "subject_patterns": ["RECEPCIÓN", "YAPEO"],
        "description": "Avisos de yape recibido (ingreso).",
        "fields": [
            {
                "field": "fecha / hora",
                "source": "Cuerpo «Fecha y hora» o fecha del encabezado del correo",
                "required": True,
            },
            {
                "field": "monto",
                "source": "«recibiste un yapeo de S/ X.XX» / Monto recibido",
                "required": True,
            },
            {
                "field": "destinatario",
                "source": "Remitente: «Recibiste un yapeo de … de NOMBRE» o «Enviado por»",
                "required": False,
            },
            {
                "field": "num_operacion",
                "source": "«Número de operación»; si falta se genera YRI-…",
                "required": True,
            },
            {
                "field": "concepto",
                "source": "Mensaje del yape o «Yapeo recibido»",
                "required": False,
            },
        ],
    },
    {
        "id": "pago_qr",
        "bank": "BCP",
        "name": "Pago con QR",
        "movement": "EGRESO",
        "tipo_operacion": "PAGO_QR",
        "subject_patterns": ["PAGO CON QR"],
        "description": "Pagos realizados con código QR BCP/Yape.",
        "fields": [
            {
                "field": "fecha / hora",
                "source": "Cuerpo «Fecha y hora» o fecha del correo",
                "required": True,
            },
            {
                "field": "monto",
                "source": "«Pago con QR de S/ X.XX» / Monto recibido",
                "required": True,
            },
            {
                "field": "destinatario",
                "source": "«Enviado a …»",
                "required": False,
            },
            {
                "field": "num_operacion",
                "source": "«Número de operación»",
                "required": True,
            },
            {
                "field": "concepto",
                "source": "Mensaje asociado al pago",
                "required": False,
            },
        ],
    },
    {
        "id": "pago_servicio",
        "bank": "BCP",
        "name": "Pago de servicio",
        "movement": "EGRESO",
        "tipo_operacion": "PAGO_SERVICIO",
        "subject_patterns": ["PAGO DE SERVICIO"],
        "description": "Pagos a empresas/servicios desde Banca Móvil BCP.",
        "fields": [
            {
                "field": "fecha / hora",
                "source": "Cuerpo «Fecha y hora» o fecha del correo",
                "required": True,
            },
            {
                "field": "monto",
                "source": "«Monto total» / «Importe» con S/ o PEN",
                "required": True,
            },
            {
                "field": "destinatario",
                "source": "«Empresa : …»",
                "required": False,
            },
            {
                "field": "concepto",
                "source": "«Servicio : …»",
                "required": False,
            },
            {
                "field": "num_operacion",
                "source": "«Número de operación»",
                "required": True,
            },
        ],
    },
    {
        "id": "consumo_debito",
        "bank": "BCP",
        "name": "Consumo tarjeta de débito",
        "movement": "EGRESO",
        "tipo_operacion": "CONSUMO_DEBITO",
        "subject_patterns": ["CONSUMO", "TARJETA DE DÉBITO"],
        "description": "Compras con tarjeta de débito BCP (sujeto o cuerpo).",
        "fields": [
            {
                "field": "fecha / hora",
                "source": "Cuerpo «Fecha y hora» o fecha del correo",
                "required": True,
            },
            {
                "field": "monto",
                "source": "«consumo de S/ X.XX» / Monto total del consumo",
                "required": True,
            },
            {
                "field": "destinatario",
                "source": "Comercio: «… con tu Tarjeta de Débito BCP en COMERCIO.»",
                "required": False,
            },
            {
                "field": "concepto",
                "source": "«Concepto …» o nombre del comercio",
                "required": False,
            },
            {
                "field": "num_operacion",
                "source": "Nº operación, código de autorización, o TD-… sintético",
                "required": True,
            },
        ],
    },
    {
        "id": "desconocido",
        "bank": "—",
        "name": "No reconocido",
        "movement": "N/A",
        "tipo_operacion": "DESCONOCIDO",
        "subject_patterns": [],
        "description": (
            "Asunto/cuerpo que no coincide con los patrones anteriores. "
            "Se marca como inválido (banco PENDIENTE_MAPEO) y no crea transacción."
        ),
        "fields": [],
    },
]


def get_email_extraction_guide() -> dict:
    return {
        "bank_focus": "BCP / Yape",
        "notes": [
            "La importación solo procesa correos que matchean la query/etiquetas Gmail configuradas.",
            "Hoy el parser está optimizado para notificaciones BCP/Yape. Otras etiquetas "
            "(otros bancos) se pueden filtrar en Gmail, pero requieren nuevos parsers para importar.",
            "Si falta fecha en el cuerpo, se usa la fecha del encabezado del correo (zona Lima).",
            "Correos ya procesados (mismo gmail_message_id) se omiten para no duplicar.",
        ],
        "types": EMAIL_EXTRACTION_CATALOG,
    }
