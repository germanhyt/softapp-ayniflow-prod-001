from sqlalchemy import inspect, text

from app.core.config import settings
from app.core.database import SessionLocal, engine
from app.modules.finance.application.integration_config_defaults import ENV_CONFIG_DEFAULTS
from app.modules.finance.domain.models import IntegrationSetting, Transaction
from app.modules.finance.infrastructure.payment_type_mapper import PAYMENT_TYPE_ALIASES

INTEGRATION_SETTINGS_SEED: list[dict] = [
    {
        "key": "gmail_historical",
        "label": "Importación histórica Gmail",
        "description": "Importar todos los correos BCP/Yape con la etiqueta configurada.",
        "category": "gmail",
        "kind": "feature",
        "is_enabled": True,
    },
    {
        "key": "gmail_realtime",
        "label": "Correos nuevos / polling Gmail",
        "description": "Procesar correos no leídos y polling automático en background.",
        "category": "gmail",
        "kind": "feature",
        "is_enabled": settings.gmail_poll_enabled,
    },
    {
        "key": "gmail_query",
        "label": "Query / etiqueta Gmail",
        "description": "Búsqueda Gmail para importar correos (ej. label:PAGOS/BCP/YAPE).",
        "category": "gmail",
        "kind": "config",
        "is_enabled": True,
        "env_default": settings.gmail_query_label,
    },
    {
        "key": "gmail_poll_interval_seconds",
        "label": "Intervalo de polling (segundos)",
        "description": "Frecuencia del polling automático de correos nuevos.",
        "category": "gmail",
        "kind": "config",
        "is_enabled": True,
        "env_default": str(settings.gmail_poll_interval_seconds),
    },
    {
        "key": "google_sheets",
        "label": "Sincronización Google Sheets",
        "description": "Importar filas desde la hoja de cálculo configurada.",
        "category": "sheets",
        "kind": "feature",
        "is_enabled": True,
    },
    {
        "key": "google_spreadsheet_id",
        "label": "ID de hoja Google Sheets",
        "description": "Identificador del documento en Google Sheets.",
        "category": "sheets",
        "kind": "config",
        "is_enabled": True,
        "env_default": settings.google_spreadsheet_id or "",
    },
    {
        "key": "google_spreadsheet_range",
        "label": "Rango de celdas",
        "description": "Rango a importar (ej. Transacciones!A:J).",
        "category": "sheets",
        "kind": "config",
        "is_enabled": True,
        "env_default": settings.google_spreadsheet_range,
    },
    {
        "key": "webhook_inbound",
        "label": "Webhook entrante",
        "description": "Recibir transacciones vía POST /finance/webhook.",
        "category": "webhook",
        "kind": "feature",
        "is_enabled": True,
    },
    {
        "key": "webhook_notifications",
        "label": "Alertas de presupuesto (n8n)",
        "description": "Enviar alertas 80%/100% al webhook de notificaciones.",
        "category": "webhook",
        "kind": "feature",
        "is_enabled": bool(settings.webhook_notification_url),
    },
    {
        "key": "webhook_notification_url",
        "label": "URL webhook de notificaciones",
        "description": "Endpoint saliente para alertas (n8n u otro).",
        "category": "webhook",
        "kind": "config",
        "is_enabled": True,
        "env_default": settings.webhook_notification_url or "",
    },
    {
        "key": "gemini_ocr",
        "label": "OCR vouchers (Gemini)",
        "description": "Escanear vouchers desde el modal de transacciones.",
        "category": "ocr",
        "kind": "feature",
        "is_enabled": bool(settings.gemini_api_key),
    },
    {
        "key": "gemini_api_key",
        "label": "API key Gemini",
        "description": "Clave de Google AI Studio. También puede definirse como GEMINI_API_KEY en .env.",
        "category": "ocr",
        "kind": "config",
        "is_enabled": True,
        "env_default": "",
    },
]


def _ensure_integration_settings_schema() -> None:
    inspector = inspect(engine)
    if "integration_settings" not in inspector.get_table_names():
        return

    columns = {col["name"] for col in inspector.get_columns("integration_settings")}
    alters: list[str] = []
    if "kind" not in columns:
        alters.append("ADD COLUMN kind VARCHAR(20) NOT NULL DEFAULT 'feature'")
    if "config_value" not in columns:
        alters.append("ADD COLUMN config_value VARCHAR(500) NULL")
    if "env_default" not in columns:
        alters.append("ADD COLUMN env_default VARCHAR(500) NULL")

    if not alters:
        return

    with engine.begin() as conn:
        for clause in alters:
            conn.execute(text(f"ALTER TABLE integration_settings {clause}"))


def seed_integration_settings() -> None:
    _ensure_integration_settings_schema()
    db = SessionLocal()
    try:
        for item in INTEGRATION_SETTINGS_SEED:
            existing = db.get(IntegrationSetting, item["key"])
            if existing:
                if existing.kind == "config":
                    existing.env_default = item.get("env_default")
                continue
            db.add(IntegrationSetting(**item))
        db.commit()

        for key, resolver in ENV_CONFIG_DEFAULTS.items():
            row = db.get(IntegrationSetting, key)
            if row and row.kind == "config":
                row.env_default = resolver()

        db.commit()

        for legacy_key, normalized in PAYMENT_TYPE_ALIASES.items():
            if legacy_key == normalized:
                continue
            (
                db.query(Transaction)
                .filter(Transaction.payment_type == legacy_key)
                .update({Transaction.payment_type: normalized}, synchronize_session=False)
            )
        db.commit()
    finally:
        db.close()
