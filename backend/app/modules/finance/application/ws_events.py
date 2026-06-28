from typing import Any

from app.modules.finance.presentation.schemas import TransactionResponse
from app.shared.ws_manager import finance_ws_manager


def notify_transactions_changed(
    action: str,
    *,
    transaction_id: int | None = None,
    transaction: TransactionResponse | dict[str, Any] | None = None,
) -> None:
    payload: dict[str, Any] = {
        "type": "transactions.changed",
        "action": action,
        "transaction_id": transaction_id,
    }
    if transaction is not None:
        if isinstance(transaction, TransactionResponse):
            payload["transaction"] = transaction.model_dump(mode="json")
        else:
            payload["transaction"] = transaction
    finance_ws_manager.schedule_finance_event(payload)


def notify_finance_invalidate(scope: str = "all") -> None:
    finance_ws_manager.schedule_finance_event(
        {"type": "finance.invalidate", "scope": scope},
    )


def notify_notifications_changed() -> None:
    finance_ws_manager.schedule_finance_event({"type": "notifications.changed"})


def notify_webhook_events_changed() -> None:
    finance_ws_manager.schedule_finance_event({"type": "webhook_events.changed"})
