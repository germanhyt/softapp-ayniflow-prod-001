import json
from typing import Any

from app.modules.finance.application.ws_events import (
    notify_finance_invalidate,
    notify_transactions_changed,
    notify_webhook_events_changed,
)
from app.modules.finance.domain.models import WebhookEvent
from app.modules.finance.infrastructure.legacy_adapter import LegacyFinanzasNegocioAdapter
from app.modules.finance.infrastructure.repositories import FinanceRepository
from app.shared.exceptions import AppException


class IntegrationService:
    def __init__(self, repository: FinanceRepository):
        self.repository = repository

    def import_legacy_rows(self, rows: list[dict[str, Any]]) -> dict[str, int]:
        created = 0
        skipped = 0

        for row in rows:
            mapped = LegacyFinanzasNegocioAdapter.from_legacy_row(row)
            operation_number = mapped.get("operation_number")

            if operation_number and self.repository.get_by_operation_number(operation_number):
                skipped += 1
                continue

            self.repository.create_transaction(mapped)
            created += 1

        if created:
            notify_transactions_changed("bulk")
            notify_finance_invalidate("transactions")
        return {"created": created, "skipped": skipped, "total": len(rows)}

    def import_mapped_rows(self, mapped_rows: list[dict[str, Any]]) -> dict[str, int]:
        created = 0
        skipped = 0

        for mapped in mapped_rows:
            operation_number = mapped.get("operation_number")
            if operation_number and self.repository.get_by_operation_number(operation_number):
                skipped += 1
                continue
            self.repository.create_transaction(mapped)
            created += 1

        if created:
            notify_transactions_changed("bulk")
            notify_finance_invalidate("transactions")
        return {"created": created, "skipped": skipped, "total": len(mapped_rows)}

    def process_webhook(self, payload: dict[str, Any], source: str = "n8n") -> dict[str, Any]:
        mapped = LegacyFinanzasNegocioAdapter.from_webhook_payload(payload)
        operation_number = mapped.get("operation_number")

        if operation_number and self.repository.get_by_operation_number(operation_number):
            duplicate_event = WebhookEvent(
                source=source,
                operation_number=operation_number,
                status="duplicate",
                payload=json.dumps(payload, ensure_ascii=False, default=str),
            )
            self.repository.db.add(duplicate_event)
            self.repository.db.commit()
            raise AppException("Transacción duplicada por número de operación", status_code=409)

        transaction = self.repository.create_transaction(mapped)
        event = WebhookEvent(
            source=source,
            operation_number=operation_number,
            status="processed",
            payload=json.dumps(payload, ensure_ascii=False, default=str),
            transaction_id=transaction.id,
        )
        self.repository.db.add(event)
        self.repository.db.commit()

        from app.modules.finance.application.notification_service import NotificationService
        from app.modules.finance.application.services import FinanceService

        NotificationService(self.repository).notify_webhook_transaction(
            operation_number=operation_number,
            transaction_id=transaction.id,
            concept=str(mapped.get("concept", "")),
            amount=str(mapped.get("amount", "")),
            movement_type=str(mapped.get("movement_type", "").value if hasattr(mapped.get("movement_type"), "value") else mapped.get("movement_type", "")),
        )

        result_tx = FinanceService.serialize_transaction(transaction)
        notify_transactions_changed("created", transaction_id=transaction.id, transaction=result_tx)
        notify_webhook_events_changed()
        notify_finance_invalidate("summary")

        return {
            "event_id": event.id,
            "transaction_id": transaction.id,
            "operation_number": operation_number,
        }
