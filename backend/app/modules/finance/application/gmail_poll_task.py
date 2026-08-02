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
                settings_repo = FinanceRepository(db)
                settings_service = IntegrationSettingsService(settings_repo)
                _poll_runtime_state["last_checked_at"] = serialize_datetime(now_app())
                _poll_runtime_state["last_error"] = None
                if not settings_service.is_enabled("gmail_realtime"):
                    _poll_runtime_state["last_result"] = {
                        "status": "skipped",
                        "reason": "gmail_realtime_disabled",
                    }
                    continue

                credentials = settings_repo.list_gmail_credentials()
                if not credentials and not settings.gmail_refresh_token:
                    _poll_runtime_state["last_result"] = {
                        "status": "skipped",
                        "reason": "gmail_not_configured",
                    }
                    continue

                totals = {"created": 0, "skipped": 0, "invalid": 0, "total": 0, "workspaces": 0}
                # Poll por cada cuenta vinculada, escribiendo en su workspace_id.
                targets: list[tuple[int | None, object]] = [
                    (cred.workspace_id, cred) for cred in credentials
                ]
                if settings.gmail_refresh_token and not credentials:
                    targets = [(1, None)]

                for workspace_id, _cred in targets:
                    scoped = FinanceRepository(db, workspace_id=workspace_id or 1)
                    if not GmailClient.is_configured(scoped.get_gmail_refresh_token()):
                        continue
                    try:
                        result = GmailSyncService(scoped).poll_new()
                        totals["created"] += result["created"]
                        totals["skipped"] += result["skipped"]
                        totals["invalid"] += result["invalid"]
                        totals["total"] += result["total"]
                        totals["workspaces"] += 1
                    except Exception as workspace_exc:
                        try:
                            db.rollback()
                        except Exception:
                            pass
                        logger.warning(
                            "Gmail poll falló en workspace %s: %s",
                            workspace_id,
                            workspace_exc,
                        )
                        _poll_runtime_state["last_error"] = str(workspace_exc)

                _poll_runtime_state["last_result"] = {"status": "ok", **totals}
                if totals["created"] > 0:
                    logger.info(
                        "Gmail poll: %s creadas, %s omitidas, %s inválidas (%s workspaces)",
                        totals["created"],
                        totals["skipped"],
                        totals["invalid"],
                        totals["workspaces"],
                    )
            finally:
                db.close()
        except Exception as exc:
            _poll_runtime_state["last_checked_at"] = serialize_datetime(now_app())
            err_str = str(exc)
            if "invalid_grant" in err_str.lower():
                # No borrar todas las credenciales: el fallo puede ser de una sola cuenta.
                _poll_runtime_state["last_error"] = (
                    "Token Gmail expirado o revocado. Reconecta Gmail en Integraciones."
                )
            else:
                _poll_runtime_state["last_error"] = err_str
            _poll_runtime_state["last_result"] = {"status": "error"}
            logger.warning("Gmail poll falló: %s", exc)
