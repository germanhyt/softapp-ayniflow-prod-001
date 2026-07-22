from typing import Any

from app.modules.finance.presentation.schemas import TransactionResponse
from app.shared.ws_manager import finance_ws_manager


def notify_transactions_changed(
    action: str,
    *,
    workspace_id: int | None = None,
    transaction_id: int | None = None,
    transaction: TransactionResponse | dict[str, Any] | None = None,
) -> None:
    payload: dict[str, Any] = {
        "type": "transactions.changed",
        "action": action,
        "transaction_id": transaction_id,
        "workspace_id": workspace_id,
    }
    if transaction is not None:
        if isinstance(transaction, TransactionResponse):
            payload["transaction"] = transaction.model_dump(mode="json")
        else:
            payload["transaction"] = transaction
    finance_ws_manager.schedule_finance_event(payload, workspace_id=workspace_id)


def notify_finance_invalidate(scope: str = "all", *, workspace_id: int | None = None) -> None:
    finance_ws_manager.schedule_finance_event(
        {"type": "finance.invalidate", "scope": scope, "workspace_id": workspace_id},
        workspace_id=workspace_id,
    )


def notify_notifications_changed(*, workspace_id: int | None = None) -> None:
    finance_ws_manager.schedule_finance_event(
        {"type": "notifications.changed", "workspace_id": workspace_id},
        workspace_id=workspace_id,
    )


def notify_webhook_events_changed(*, workspace_id: int | None = None) -> None:
    finance_ws_manager.schedule_finance_event(
        {"type": "webhook_events.changed", "workspace_id": workspace_id},
        workspace_id=workspace_id,
    )
