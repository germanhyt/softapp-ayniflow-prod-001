import json
import re
from typing import TYPE_CHECKING, Any

import google.generativeai as genai

from app.core.config import settings
from app.shared.exceptions import AppException

if TYPE_CHECKING:
    from app.modules.finance.application.integration_settings_service import IntegrationSettingsService

OCR_PROMPT = """Analiza la imagen de este voucher bancario (Yape, Plin, BCP, BBVA, Interbank, Scotiabank) y extrae los siguientes datos en formato JSON puro.
Los campos son:
- Fecha (formato YYYY-MM-DD)
- Hora (formato HH:MM:SS)
- Movimiento (SOLO puede ser 'INGRESO' o 'EGRESO'. Por defecto EGRESO si es un pago)
- Banco (Identifica el banco emisor: BCP, BBVA, INTERBANK, SCOTIABANK, YAPE, PLIN, etc.)
- Tipo (PAGO QR, YAPEO CELULAR, TRANSFERENCIA, EFECTIVO, COMPRA, VENTA)
- Destinatario (Nombre de la persona o entidad)
- Monto (Número sin símbolos)
- Num_Operacion (Código de referencia)
- Concepto (Breve descripción si existe)

Responde ÚNICAMENTE el objeto JSON sin bloques de código markdown ni texto adicional."""


class OcrService:
    @classmethod
    def resolve_api_key(cls, settings_service: "IntegrationSettingsService | None" = None) -> str:
        if settings_service is not None:
            effective = settings_service.get_effective_value("gemini_api_key")
            if effective:
                return effective
        return (settings.gemini_api_key or "").strip()

    @classmethod
    def is_configured(cls, settings_service: "IntegrationSettingsService | None" = None) -> bool:
        return bool(cls.resolve_api_key(settings_service))

    @classmethod
    def extract_voucher(
        cls,
        *,
        content: bytes,
        mime_type: str,
        settings_service: "IntegrationSettingsService | None" = None,
    ) -> dict[str, Any]:
        api_key = cls.resolve_api_key(settings_service)
        if not api_key:
            raise AppException(
                "OCR no configurado. Define la API key en Integraciones o GEMINI_API_KEY en .env.",
                status_code=503,
            )

        genai.configure(api_key=api_key)
        model = genai.GenerativeModel("gemini-2.0-flash")

        try:
            result = model.generate_content(
                [
                    OCR_PROMPT,
                    {"mime_type": mime_type or "image/jpeg", "data": content},
                ]
            )
            response_text = result.text or ""
            clean_json = re.sub(r"```json|```", "", response_text).strip()
            data = json.loads(clean_json)
        except json.JSONDecodeError as exc:
            raise AppException("No se pudo interpretar la respuesta del OCR", status_code=422) from exc
        except Exception as exc:
            raise AppException("Error al procesar la imagen con Gemini", status_code=500) from exc

        movement = str(data.get("Movimiento", "EGRESO")).upper()
        return {
            "fecha": data.get("Fecha"),
            "hora": data.get("Hora"),
            "movimiento": "Ingreso" if movement.startswith("ING") else "Egreso",
            "banco": data.get("Banco"),
            "tipo": data.get("Tipo"),
            "destinatario": data.get("Destinatario"),
            "monto": data.get("Monto"),
            "num_operacion": data.get("Num_Operacion"),
            "concepto": data.get("Concepto"),
        }
