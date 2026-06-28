import re
from dataclasses import dataclass
from datetime import datetime, timedelta
from typing import Any


@dataclass
class ParsedBcpEmail:
    fecha: str | None
    hora: str | None
    movimiento: str
    concepto: str
    banco: str
    tipo: str
    categoria: str
    monto: float
    destinatario: str
    num_operacion: str

    def is_importable(self) -> bool:
        return (
            self.movimiento not in ("N/A", "")
            and self.banco != "PENDIENTE_MAPEO"
            and self.num_operacion not in ("N/A", "", None)
            and self.monto > 0
            and bool(self.fecha)
        )

    def to_webhook_payload(self) -> dict[str, Any]:
        return {
            "fecha": self.fecha,
            "hora": self.hora,
            "movimiento": self.movimiento,
            "concepto": self.concepto,
            "banco": self.banco,
            "tipo": self.tipo,
            "categoria": self.categoria,
            "monto": self.monto,
            "destinatario": self.destinatario,
            "num_operacion": self.num_operacion,
        }


def clean_text(text: str | None) -> str:
    if not text:
        return ""
    return text.replace("\n", " ").strip()


def extraer_fecha_hora_texto(text: str) -> tuple[str | None, str | None]:
    meses = {
        "enero": "01",
        "febrero": "02",
        "marzo": "03",
        "abril": "04",
        "mayo": "05",
        "junio": "06",
        "julio": "07",
        "agosto": "08",
        "setiembre": "09",
        "septiembre": "09",
        "octubre": "10",
        "noviembre": "11",
        "diciembre": "12",
    }

    patron = (
        r"Fecha y hora:?\s*(?:[A-Za-záéíóúÁÉÍÓÚ]+,?\s*)?"
        r"(\d{1,2})\s+(?:de\s+)?([A-Za-z]+)\s+(?:de\s+)?(\d{4})\s*-\s*"
        r"(\d{1,2}):(\d{2})\s*(A\.?\s*M\.?|P\.?\s*M\.?|AM|PM)"
    )
    match = re.search(patron, text, re.IGNORECASE | re.DOTALL)

    if not match:
        return None, None

    dia = match.group(1).zfill(2)
    mes_str = match.group(2).lower()
    mes = meses.get(mes_str, "01")
    anio = match.group(3)
    hora = int(match.group(4))
    minuto = match.group(5)
    ampm = re.sub(r"[\.\s]", "", match.group(6)).upper()

    if ampm == "PM" and hora < 12:
        hora += 12
    if ampm == "AM" and hora == 12:
        hora = 0

    hora_str = str(hora).zfill(2)
    return f"{anio}-{mes}-{dia}", f"{hora_str}:{minuto}:00"


def _fecha_hora_fallback(raw_date: str) -> tuple[str | None, str | None]:
    if not raw_date:
        return None, None

    try:
        utc_dt = datetime.strptime(raw_date[:19], "%Y-%m-%dT%H:%M:%S")
        lima_dt = utc_dt - timedelta(hours=5)
        return lima_dt.strftime("%Y-%m-%d"), lima_dt.strftime("%H:%M:%S")
    except ValueError:
        if "T" in raw_date:
            partes = raw_date.split("T")
            return partes[0], partes[1][:8]
    return None, None


def parse_notificacion_bcp(text: str, tipo: str, *, ingreso: bool = False) -> dict[str, Any]:
    monto_patterns = [
        r"(?:Monto enviado|yapeo a celular de|recibiste un yapeo de)\s*(?:S/|PEN|s/.)?\s*([\d,]+\.\d{2})",
        r"(?:Monto recibido|Pago con QR de)\s*(?:S/|PEN|s/.)?\s*([\d,]+\.\d{2})",
        r"(?:Monto total|Importe)\s*(?:S/|PEN|s/.)?\s*([\d,]+\.\d{2})",
    ]
    monto_match = None
    for pattern in monto_patterns:
        monto_match = re.search(pattern, text, re.IGNORECASE | re.DOTALL)
        if monto_match:
            break

    if ingreso:
        destinatario_match = re.search(
            r"Recibiste un yapeo de\s*(?:S/|PEN|s/.)?\s*[\d,.]+\s+de\s+(.*?)\.",
            text,
            re.IGNORECASE | re.DOTALL,
        )
        if not destinatario_match:
            destinatario_match = re.search(
                r"Enviado por\s*(.*?)(?:\?|¿No reconoces|Número de operación|\n\s*\n)",
                text,
                re.IGNORECASE | re.DOTALL,
            )
    else:
        destinatario_match = re.search(
            r"Enviado a\s*(.*?)(?:\*+|Destino|Desde|Moneda|Cuenta|Número de operación)",
            text,
            re.IGNORECASE | re.DOTALL,
        )
    num_op_match = re.search(r"Número de operación\D*(\d{6,})", text, re.IGNORECASE)
    concepto_match = re.search(r"Mensaje\s*(.*?)\s*(?:Canal|Número de operación)", text, re.IGNORECASE | re.DOTALL)
    concepto_limpio = clean_text(concepto_match.group(1)) if concepto_match else ""
    monto = float(monto_match.group(1).replace(",", "")) if monto_match else 0.0
    num_operacion = num_op_match.group(1) if num_op_match else "N/A"

    if num_operacion == "N/A" and ingreso and monto > 0:
        remitente = clean_text(destinatario_match.group(1)) if destinatario_match else "desconocido"
        slug = re.sub(r"[^A-Za-z0-9]", "", remitente)[:12] or "YAPEO"
        num_operacion = f"YRI-{slug}-{int(monto * 100)}"

    return {
        "movimiento": "INGRESO" if ingreso else "EGRESO",
        "concepto": concepto_limpio if concepto_limpio else ("Yapeo recibido" if ingreso else "Sin mensaje"),
        "banco": "BCP",
        "tipo_operacion": tipo,
        "categoria": "-",
        "monto": monto,
        "destinatario": clean_text(destinatario_match.group(1)) if destinatario_match else "Desconocido",
        "num_operacion": num_operacion,
    }


def parse_pago_servicio_bcp(text: str) -> dict[str, Any]:
    monto_match = re.search(
        r"(?:Monto total|Importe).*?(?:S/|PEN).*?([\d,]+\.\d{2})",
        text,
        re.IGNORECASE | re.DOTALL,
    )
    destinatario_match = re.search(
        r"Empresa\s*:(.*?)(?:Servicio|Titular)",
        text,
        re.IGNORECASE | re.DOTALL,
    )
    num_op_match = re.search(r"Número de operación\D*(\d{6,})", text, re.IGNORECASE)
    concepto_match = re.search(
        r"Servicio\s*:(.*?)(?:Titular del servicio:|Código de usuario:)",
        text,
        re.IGNORECASE | re.DOTALL,
    )

    return {
        "movimiento": "EGRESO",
        "concepto": clean_text(concepto_match.group(1)) if concepto_match else "Pago de Servicio",
        "banco": "BCP",
        "tipo_operacion": "PAGO_SERVICIO",
        "categoria": "-",
        "monto": float(monto_match.group(1).replace(",", "")) if monto_match else 0.0,
        "destinatario": clean_text(destinatario_match.group(1)) if destinatario_match else "Desconocido",
        "num_operacion": num_op_match.group(1) if num_op_match else "N/A",
    }


def parse_consumo_debito_bcp(text: str, *, fecha: str | None, hora: str | None) -> dict[str, Any]:
    monto_match = re.search(
        r"(?:consumo de|Monto(?:\s+Total del consumo)?)\s*(?:S/|PEN|s/.)?\s*([\d,]+\.\d{2})",
        text,
        re.IGNORECASE | re.DOTALL,
    )
    comercio_match = re.search(
        r"consumo de\s*S/?\s*[\d,.]+\s*con tu Tarjeta de Débito BCP en\s*(.+?)\.",
        text,
        re.IGNORECASE | re.DOTALL,
    )
    concepto_match = re.search(
        r"Concepto\s*(.*?)(?:Número de Tarjeta|Número de operación|Fecha y hora|$)",
        text,
        re.IGNORECASE | re.DOTALL,
    )
    tarjeta_match = re.search(r"Número de Tarjeta de Débito\s*(\*+\d{4})", text, re.IGNORECASE)
    num_op_match = re.search(r"Número de operación\D*(\d{6,})", text, re.IGNORECASE)
    auth_match = re.search(r"Código de autorización\s*(\w+)", text, re.IGNORECASE)

    comercio = clean_text(comercio_match.group(1)) if comercio_match else ""
    concepto = clean_text(concepto_match.group(1)) if concepto_match else comercio
    monto = float(monto_match.group(1).replace(",", "")) if monto_match else 0.0

    if num_op_match:
        num_operacion = num_op_match.group(1)
    elif auth_match:
        num_operacion = auth_match.group(1)
    else:
        last4 = tarjeta_match.group(1)[-4:] if tarjeta_match else "0000"
        fecha_key = (fecha or "00000000").replace("-", "")
        hora_key = (hora or "000000").replace(":", "")[:6]
        monto_key = f"{monto:.2f}".replace(".", "")
        num_operacion = f"TD-{last4}-{fecha_key}-{hora_key}-{monto_key}"

    return {
        "movimiento": "EGRESO",
        "concepto": concepto or comercio or "Consumo tarjeta débito",
        "banco": "BCP",
        "tipo_operacion": "CONSUMO_DEBITO",
        "categoria": "-",
        "monto": monto,
        "destinatario": comercio or concepto or "Comercio",
        "num_operacion": num_operacion,
    }


def _is_consumo_debito_subject(subject_upper: str) -> bool:
    normalized = subject_upper.replace("É", "E").replace("Í", "I")
    return "CONSUMO" in normalized and "TARJETA DE DEBITO" in normalized


def parse_bcp_email(*, subject: str, body: str, raw_date: str = "", use_body_datetime: bool = True) -> ParsedBcpEmail:
    subject_upper = (subject or "").upper()
    body_text = body or ""

    fecha_solo, hora_solo = (None, None)
    if use_body_datetime:
        fecha_solo, hora_solo = extraer_fecha_hora_texto(body_text)

    if not fecha_solo or not hora_solo:
        fecha_solo, hora_solo = _fecha_hora_fallback(raw_date)

    if "PAGO CON QR" in subject_upper:
        data = parse_notificacion_bcp(body_text, "PAGO_QR")
    elif "RECEPCI" in subject_upper and "YAPEO" in subject_upper:
        data = parse_notificacion_bcp(body_text, "YAPEO_CELULAR", ingreso=True)
    elif "YAPEO A CELULAR" in subject_upper or "TRANSFERENCIA" in subject_upper:
        data = parse_notificacion_bcp(body_text, "YAPEO_CELULAR")
    elif "PAGO DE SERVICIO" in subject_upper:
        data = parse_pago_servicio_bcp(body_text)
    elif _is_consumo_debito_subject(subject_upper) or re.search(
        r"Consumo Tarjeta de Débito", body_text, re.IGNORECASE
    ):
        data = parse_consumo_debito_bcp(body_text, fecha=fecha_solo, hora=hora_solo)
    else:
        data = {
            "movimiento": "N/A",
            "concepto": "N/A",
            "banco": "PENDIENTE_MAPEO",
            "tipo_operacion": "DESCONOCIDO",
            "categoria": "-",
            "monto": 0.0,
            "destinatario": "N/A",
            "num_operacion": "N/A",
        }

    return ParsedBcpEmail(
        fecha=fecha_solo,
        hora=hora_solo,
        movimiento=data["movimiento"],
        concepto=data["concepto"],
        banco=data["banco"],
        tipo=data["tipo_operacion"],
        categoria=data["categoria"],
        monto=data["monto"],
        destinatario=data["destinatario"],
        num_operacion=data["num_operacion"],
    )
