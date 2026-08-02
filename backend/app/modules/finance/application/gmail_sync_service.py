import json
from typing import Any

from sqlalchemy.exc import IntegrityError

from app.core.logging import logger
from app.modules.finance.application.integration_service import IntegrationService
from app.modules.finance.application.integration_settings_service import IntegrationSettingsService
from app.modules.finance.application.notification_service import NotificationService
from app.modules.finance.application.services import FinanceService
from app.modules.finance.application.ws_events import (
    notify_finance_invalidate,
    notify_transactions_changed,
    notify_webhook_events_changed,
)
from app.modules.finance.domain.models import ProcessedGmailMessage, WebhookEvent
from app.modules.finance.infrastructure.bcp_email_parser import parse_bcp_email
from app.modules.finance.infrastructure.gmail_client import GmailClient
from app.modules.finance.infrastructure.legacy_adapter import LegacyFinanzasNegocioAdapter
from app.modules.finance.infrastructure.repositories import FinanceRepository


class GmailSyncService:
    def __init__(self, repository: FinanceRepository):
        self.repository = repository
        self.integration_service = IntegrationService(repository)
        self.notification_service = NotificationService(repository)
        self.settings_service = IntegrationSettingsService(repository)

    def sync_historical(self, *, max_messages: int | None = None) -> dict[str, int]:
        refresh_token = self.repository.get_gmail_refresh_token()
        query = self.settings_service.get_effective_value("gmail_query")
        message_ids = GmailClient.list_message_ids(
            query=query, max_results=max_messages, refresh_token=refresh_token
        )
        return self._process_messages(
            message_ids, mode="historical", mark_read=False, use_body_datetime=True, refresh_token=refresh_token
        )

    def poll_new(self, *, max_messages: int = 50, mark_read: bool = True) -> dict[str, int]:
        refresh_token = self.repository.get_gmail_refresh_token()
        base_query = self.settings_service.get_effective_value("gmail_query")
        query = f"{base_query} is:unread".strip()
        message_ids = GmailClient.list_message_ids(
            query=query, max_results=max_messages, refresh_token=refresh_token
        )
        return self._process_messages(
            message_ids,
            mode="realtime",
            mark_read=mark_read,
            use_body_datetime=False,
            refresh_token=refresh_token,
        )

    def _safe_rollback(self) -> None:
        try:
            self.repository.db.rollback()
        except Exception:
            pass

    def _process_messages(
        self,
        message_ids: list[str],
        *,
        mode: str,
        mark_read: bool,
        use_body_datetime: bool,
        refresh_token: str | None,
    ) -> dict[str, int]:
        created = 0
        skipped = 0
        invalid = 0

        for message_id in message_ids:
            if self.repository.get_processed_gmail_message(message_id):
                skipped += 1
                continue

            try:
                email = GmailClient.get_message(message_id, refresh_token=refresh_token)
                parsed = parse_bcp_email(
                    subject=email["subject"],
                    body=email["text"],
                    raw_date=email["date"],
                    use_body_datetime=use_body_datetime,
                )

                if not parsed.is_importable():
                    if parsed.banco == "PENDIENTE_MAPEO":
                        invalid += 1
                        continue
                    claimed = self._record_processed(message_id, None, None, mode)
                    if claimed:
                        invalid += 1
                        if mark_read:
                            GmailClient.mark_as_read(message_id, refresh_token=refresh_token)
                    else:
                        skipped += 1
                    continue

                payload = parsed.to_webhook_payload()
                operation_number = payload.get("num_operacion")

                # Releer dedup justo antes de crear (evita carrera poll/histórico o multi-workspace).
                if self.repository.get_processed_gmail_message(message_id):
                    skipped += 1
                    continue

                if operation_number and self.repository.get_by_operation_number(operation_number):
                    self._record_processed(message_id, operation_number, None, mode)
                    skipped += 1
                    if mark_read:
                        GmailClient.mark_as_read(message_id, refresh_token=refresh_token)
                    continue

                # Reclamar el message_id ANTES de crear la transacción (dedup atómico).
                claimed = self._record_processed(message_id, operation_number, None, mode)
                if not claimed:
                    skipped += 1
                    continue

                mapped = LegacyFinanzasNegocioAdapter.from_legacy_row(payload)
                transaction = self.repository.create_transaction(mapped)

                # Actualiza el registro con el transaction_id resultante.
                claimed.transaction_id = transaction.id
                self.repository.db.commit()

                event = WebhookEvent(
                    source=f"gmail:{mode}",
                    operation_number=operation_number,
                    status="processed",
                    payload=json.dumps(payload, ensure_ascii=False, default=str),
                    transaction_id=transaction.id,
                )
                self.repository.db.add(event)
                self.repository.db.commit()

                self.notification_service.notify_webhook_transaction(
                    operation_number=operation_number,
                    transaction_id=transaction.id,
                    concept=str(mapped.get("concept", "")),
                    amount=str(mapped.get("amount", "")),
                    movement_type=str(
                        mapped.get("movement_type", "").value
                        if hasattr(mapped.get("movement_type"), "value")
                        else mapped.get("movement_type", "")
                    ),
                )

                result_tx = FinanceService.serialize_transaction(transaction)
                if mode == "realtime":
                    notify_transactions_changed(
                        "created",
                        workspace_id=self.repository.workspace_id,
                        transaction_id=transaction.id,
                        transaction=result_tx,
                    )
                    notify_webhook_events_changed(workspace_id=self.repository.workspace_id)

                created += 1

                if mark_read:
                    GmailClient.mark_as_read(message_id, refresh_token=refresh_token)

            except IntegrityError as exc:
                self._safe_rollback()
                logger.info("Correo %s omitido por carrera/duplicado: %s", message_id, exc)
                skipped += 1
            except Exception as exc:
                self._safe_rollback()
                logger.warning("Error procesando correo %s: %s", message_id, exc)
                invalid += 1

        if created:
            if mode != "realtime":
                notify_transactions_changed("bulk", workspace_id=self.repository.workspace_id)
            notify_finance_invalidate("summary", workspace_id=self.repository.workspace_id)

        return {
            "created": created,
            "skipped": skipped,
            "invalid": invalid,
            "total": len(message_ids),
        }

    def _record_processed(
        self,
        gmail_message_id: str,
        operation_number: str | None,
        transaction_id: int | None,
        mode: str,
    ) -> ProcessedGmailMessage | None:
        """Intenta reclamar el message_id. None = ya existía (dedup/carrera)."""
        if self.repository.get_processed_gmail_message(gmail_message_id):
            return None

        record = ProcessedGmailMessage(
            gmail_message_id=gmail_message_id,
            operation_number=operation_number,
            transaction_id=transaction_id,
            sync_mode=mode,
        )
        saved, created = self.repository.create_processed_gmail_message(record)
        return saved if created else None
