import asyncio

from app.core.config import settings
from app.core.database import SessionLocal
from app.core.logging import logger
from app.modules.finance.application.gmail_sync_service import GmailSyncService
from app.modules.finance.application.integration_settings_service import IntegrationSettingsService
from app.modules.finance.infrastructure.gmail_client import GmailClient
from app.modules.finance.infrastructure.repositories import FinanceRepository
from app.shared.datetime_utils import now_app, serialize_datetime

_poll_runtime_state: dict[str, object] = {
    "last_checked_at": None,
    "last_result": None,
    "last_error": None,
}


def get_poll_runtime_state() -> dict[str, object]:
    return dict(_poll_runtime_state)


async def run_gmail_poll_loop() -> None:
    while True:
        interval = settings.gmail_poll_interval_seconds
        try:
            db = SessionLocal()
            try:
                settings_service = IntegrationSettingsService(FinanceRepository(db))
                interval = settings_service.get_effective_int(
                    "gmail_poll_interval_seconds",
                    fallback=settings.gmail_poll_interval_seconds,
                )
            finally:
                db.close()
        except Exception as exc:
            logger.warning("No se pudo leer intervalo de polling: %s", exc)

        await asyncio.sleep(interval)

        try:
            db = SessionLocal()
            try:
                repository = FinanceRepository(db)
                settings_service = IntegrationSettingsService(repository)
                _poll_runtime_state["last_checked_at"] = serialize_datetime(now_app())
                _poll_runtime_state["last_error"] = None
                if not settings_service.is_enabled("gmail_realtime"):
                    _poll_runtime_state["last_result"] = {
                        "status": "skipped",
                        "reason": "gmail_realtime_disabled",
                    }
                    continue
                if not GmailClient.is_configured(repository.get_gmail_refresh_token()):
                    _poll_runtime_state["last_result"] = {
                        "status": "skipped",
                        "reason": "gmail_not_configured",
                    }
                    continue
                result = GmailSyncService(repository).poll_new()
                _poll_runtime_state["last_result"] = {
                    "status": "ok",
                    "created": result["created"],
                    "skipped": result["skipped"],
                    "invalid": result["invalid"],
                    "total": result["total"],
                }
                if result["created"] > 0:
                    logger.info(
                        "Gmail poll: %s creadas, %s omitidas, %s inválidas",
                        result["created"],
                        result["skipped"],
                        result["invalid"],
                    )
            finally:
                db.close()
        except Exception as exc:
            _poll_runtime_state["last_checked_at"] = serialize_datetime(now_app())
            err_str = str(exc)
            if "invalid_grant" in err_str.lower():
                try:
                    db = SessionLocal()
                    try:
                        FinanceRepository(db).delete_gmail_credential()
                    finally:
                        db.close()
                except Exception as cleanup_exc:
                    logger.warning("No se pudo limpiar credencial Gmail inválida: %s", cleanup_exc)
                _poll_runtime_state["last_error"] = (
                    "Token Gmail expirado o revocado. Reconecta Gmail en Integraciones."
                )
            else:
                _poll_runtime_state["last_error"] = err_str
            _poll_runtime_state["last_result"] = {"status": "error"}
            logger.warning("Gmail poll falló: %s", exc)
