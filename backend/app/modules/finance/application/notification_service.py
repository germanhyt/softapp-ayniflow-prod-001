import json
from typing import Any

import httpx

from app.core.logging import logger
from app.modules.finance.application.integration_settings_service import IntegrationSettingsService
from app.modules.finance.application.ws_events import notify_notifications_changed
from app.modules.finance.domain.models import FinanceNotification
from app.modules.finance.infrastructure.repositories import FinanceRepository


class NotificationService:
    def __init__(self, repository: FinanceRepository):
        self.repository = repository

    def list_notifications(self, *, limit: int = 20, unread_only: bool = False) -> list[FinanceNotification]:
        return self.repository.list_notifications(limit=limit, unread_only=unread_only)

    def count_unread(self) -> int:
        return self.repository.count_unread_notifications()

    def mark_read(self, notification_id: int) -> FinanceNotification:
        notification = self.repository.get_notification(notification_id)
        if not notification:
            from app.shared.exceptions import AppException

            raise AppException("Notificación no encontrada", status_code=404)
        return self.repository.mark_notification_read(notification)

    def mark_all_read(self) -> int:
        return self.repository.mark_all_notifications_read()

    def notify_webhook_transaction(
        self,
        *,
        operation_number: str | None,
        transaction_id: int,
        concept: str,
        amount: str,
        movement_type: str,
    ) -> FinanceNotification | None:
        reference = f"webhook:{operation_number or transaction_id}"
        if self.repository.get_notification_by_reference(reference):
            return None

        title = "Nueva transacción vía webhook"
        message = f"{movement_type}: {concept} — S/ {amount}"
        return self._create(
            kind="webhook_transaction",
            title=title,
            message=message,
            reference_key=reference,
            operation_number=operation_number,
            transaction_id=transaction_id,
        )

    def check_budget_alerts(self, budgets: list[dict[str, Any]]) -> list[FinanceNotification]:
        created: list[FinanceNotification] = []
        for budget in budgets:
            percentage = float(budget.get("percentage", 0))
            category = budget.get("category", "")
            month_year = budget.get("month_year", "")

            if percentage >= 100 and percentage < 105:
                alert_kind = "budget_limit"
                alert_label = "LÍMITE ALCANZADO (100%)"
            elif percentage >= 80 and percentage < 85:
                alert_kind = "budget_warning"
                alert_label = "ADVERTENCIA (80%)"
            else:
                continue

            reference = f"budget:{month_year}:{category}:{alert_kind}"
            if self.repository.get_notification_by_reference(reference):
                continue

            payload = {
                "alerta": alert_label,
                "categoria": category,
                "presupuestado": budget.get("budgeted_amount"),
                "real": budget.get("actual_amount"),
                "porcentaje": percentage,
                "diferencia": budget.get("difference"),
                "month_year": month_year,
            }
            self._forward_to_n8n(payload)

            notification = self._create(
                kind=alert_kind,
                title=f"Presupuesto — {category}",
                message=f"{alert_label}: {percentage}% ejecutado",
                reference_key=reference,
                payload=payload,
            )
            if notification:
                created.append(notification)
        return created

    def _create(
        self,
        *,
        kind: str,
        title: str,
        message: str,
        reference_key: str | None = None,
        operation_number: str | None = None,
        transaction_id: int | None = None,
        payload: dict[str, Any] | None = None,
    ) -> FinanceNotification | None:
        if reference_key and self.repository.get_notification_by_reference(reference_key):
            return None

        notification = FinanceNotification(
            kind=kind,
            title=title,
            message=message,
            reference_key=reference_key,
            operation_number=operation_number,
            transaction_id=transaction_id,
            payload=json.dumps(payload, ensure_ascii=False, default=str) if payload else None,
        )
        created = self.repository.create_notification(notification)
        if created:
            notify_notifications_changed()
        return created

    def _forward_to_n8n(self, payload: dict[str, Any]) -> None:
        settings_service = IntegrationSettingsService(self.repository)
        enabled = settings_service.is_enabled("webhook_notifications", default=False)
        url = settings_service.get_effective_value("webhook_notification_url")
        if not url or not enabled:
            return
        try:
            httpx.post(url, json=payload, timeout=10.0)
        except Exception as exc:
            logger.warning("No se pudo enviar alerta a n8n: %s", exc)
