from datetime import date
from decimal import Decimal

from sqlalchemy import func, or_
from sqlalchemy.orm import Session

from app.core.config import settings
from app.modules.finance.domain.models import (
    Budget,
    LoanRecord,
    MovementType,
    SavingsGoal,
    Transaction,
    WebhookEvent,
)


class FinanceRepository:
    def __init__(self, db: Session):
        self.db = db

    def list_transactions(
        self,
        *,
        from_date: date | None = None,
        to_date: date | None = None,
        movement_type: MovementType | None = None,
        search: str | None = None,
    ) -> list[Transaction]:
        return (
            self._transactions_query(
                from_date=from_date,
                to_date=to_date,
                movement_type=movement_type,
                search=search,
            )
            .order_by(Transaction.transaction_date.desc(), Transaction.id.desc())
            .all()
        )

    def list_transactions_paginated(
        self,
        *,
        from_date: date | None = None,
        to_date: date | None = None,
        movement_type: MovementType | None = None,
        search: str | None = None,
        offset: int = 0,
        limit: int = 20,
    ) -> tuple[list[Transaction], int]:
        query = self._transactions_query(
            from_date=from_date,
            to_date=to_date,
            movement_type=movement_type,
            search=search,
        )
        total = query.count()
        items = (
            query.order_by(Transaction.transaction_date.desc(), Transaction.id.desc())
            .offset(offset)
            .limit(limit)
            .all()
        )
        return items, total

    def _transactions_query(
        self,
        *,
        from_date: date | None = None,
        to_date: date | None = None,
        movement_type: MovementType | None = None,
        search: str | None = None,
    ):
        query = self.db.query(Transaction)

        if from_date:
            query = query.filter(Transaction.transaction_date >= from_date)
        if to_date:
            query = query.filter(Transaction.transaction_date <= to_date)
        if movement_type:
            query = query.filter(Transaction.movement_type == movement_type)
        if search:
            pattern = f"%{search.strip().lower()}%"
            query = query.filter(
                or_(
                    func.lower(Transaction.concept).like(pattern),
                    func.lower(Transaction.recipient).like(pattern),
                    func.lower(Transaction.operation_number).like(pattern),
                )
            )
        return query

    def get_transaction(self, transaction_id: int) -> Transaction | None:
        return self.db.query(Transaction).filter(Transaction.id == transaction_id).first()

    def get_by_operation_number(self, operation_number: str) -> Transaction | None:
        return (
            self.db.query(Transaction)
            .filter(Transaction.operation_number == operation_number)
            .first()
        )

    def create_transaction(self, data: dict) -> Transaction:
        transaction = Transaction(**data)
        self.db.add(transaction)
        self.db.commit()
        self.db.refresh(transaction)
        return transaction

    def update_transaction(self, transaction: Transaction, data: dict) -> Transaction:
        for key, value in data.items():
            setattr(transaction, key, value)
        self.db.commit()
        self.db.refresh(transaction)
        return transaction

    def delete_transaction(self, transaction: Transaction) -> None:
        self.db.delete(transaction)
        self.db.commit()

    def list_budgets(
        self, month_year: str | None = None, category: str | None = None
    ) -> list[Budget]:
        query = self.db.query(Budget)
        if month_year:
            query = query.filter(Budget.month_year == month_year)
        if category:
            query = query.filter(Budget.category == category)
        return query.order_by(Budget.month_year.desc(), Budget.category.asc()).all()

    def get_budget(self, budget_id: int) -> Budget | None:
        return self.db.query(Budget).filter(Budget.id == budget_id).first()

    def create_budget(self, data: dict) -> Budget:
        budget = Budget(**data)
        self.db.add(budget)
        self.db.commit()
        self.db.refresh(budget)
        return budget

    def update_budget(self, budget: Budget, data: dict) -> Budget:
        for key, value in data.items():
            setattr(budget, key, value)
        self.db.commit()
        self.db.refresh(budget)
        return budget

    def delete_budget(self, budget: Budget) -> None:
        self.db.delete(budget)
        self.db.commit()

    def list_savings_goals(self) -> list[SavingsGoal]:
        return self.db.query(SavingsGoal).order_by(SavingsGoal.created_at.desc(), SavingsGoal.id.desc()).all()

    def list_savings_goals_paginated(
        self,
        *,
        search: str | None = None,
        progress: str | None = None,
        offset: int = 0,
        limit: int = 20,
    ) -> tuple[list[SavingsGoal], int]:
        query = self.db.query(SavingsGoal)
        if search:
            query = query.filter(SavingsGoal.name.ilike(f"%{search.strip()}%"))
        if progress == "in_progress":
            query = query.filter(SavingsGoal.current_amount < SavingsGoal.target_amount)
        elif progress == "completed":
            query = query.filter(SavingsGoal.current_amount >= SavingsGoal.target_amount)
        total = query.count()
        items = (
            query.order_by(SavingsGoal.created_at.desc(), SavingsGoal.id.desc())
            .offset(offset)
            .limit(limit)
            .all()
        )
        return items, total

    def get_savings_goal(self, goal_id: int) -> SavingsGoal | None:
        return self.db.query(SavingsGoal).filter(SavingsGoal.id == goal_id).first()

    def create_savings_goal(self, data: dict) -> SavingsGoal:
        goal = SavingsGoal(**data)
        self.db.add(goal)
        self.db.commit()
        self.db.refresh(goal)
        return goal

    def update_savings_goal(self, goal: SavingsGoal, data: dict) -> SavingsGoal:
        for key, value in data.items():
            setattr(goal, key, value)
        self.db.commit()
        self.db.refresh(goal)
        return goal

    def delete_savings_goal(self, goal: SavingsGoal) -> None:
        self.db.delete(goal)
        self.db.commit()

    def adjust_savings_goal_amount(self, goal_id: int, delta: Decimal) -> SavingsGoal:
        goal = self.get_savings_goal(goal_id)
        if goal is None:
            raise ValueError("Meta de ahorro no encontrada")
        current = Decimal(str(goal.current_amount)) + delta
        goal.current_amount = max(Decimal("0"), current)
        self.db.commit()
        self.db.refresh(goal)
        return goal

    def list_loan_records(self) -> list[LoanRecord]:
        return self.db.query(LoanRecord).order_by(LoanRecord.created_at.desc(), LoanRecord.id.desc()).all()

    def list_loan_records_paginated(
        self,
        *,
        search: str | None = None,
        status: str | None = None,
        loan_type: str | None = None,
        offset: int = 0,
        limit: int = 20,
    ) -> tuple[list[LoanRecord], int]:
        query = self.db.query(LoanRecord)
        if search:
            query = query.filter(LoanRecord.lender.ilike(f"%{search.strip()}%"))
        if status:
            query = query.filter(LoanRecord.status.ilike(status.strip()))
        if loan_type:
            query = query.filter(LoanRecord.loan_type.ilike(loan_type.strip()))
        total = query.count()
        items = (
            query.order_by(LoanRecord.created_at.desc(), LoanRecord.id.desc())
            .offset(offset)
            .limit(limit)
            .all()
        )
        return items, total

    def get_loan_record(self, loan_id: int) -> LoanRecord | None:
        return self.db.query(LoanRecord).filter(LoanRecord.id == loan_id).first()

    def create_loan_record(self, data: dict) -> LoanRecord:
        loan = LoanRecord(**data)
        self.db.add(loan)
        self.db.commit()
        self.db.refresh(loan)
        return loan

    def update_loan_record(self, loan: LoanRecord, data: dict) -> LoanRecord:
        for key, value in data.items():
            setattr(loan, key, value)
        self.db.commit()
        self.db.refresh(loan)
        return loan

    def delete_loan_record(self, loan: LoanRecord) -> None:
        self.db.delete(loan)
        self.db.commit()

    def adjust_loan_outstanding(self, loan_id: int, delta: Decimal) -> LoanRecord:
        loan = self.get_loan_record(loan_id)
        if loan is None:
            raise ValueError("Préstamo no encontrado")
        outstanding = Decimal(str(loan.outstanding_amount)) + delta
        loan.outstanding_amount = max(Decimal("0"), outstanding)
        self.db.commit()
        self.db.refresh(loan)
        return loan

    def commit_entity(self, entity) -> None:
        self.db.commit()
        self.db.refresh(entity)

    def get_transactions_by_ids(self, ids: list[int]) -> list[Transaction]:
        if not ids:
            return []
        return self.db.query(Transaction).filter(Transaction.id.in_(ids)).all()

    def bulk_update_transaction_category(self, ids: list[int], category: str) -> int:
        updated = (
            self.db.query(Transaction)
            .filter(Transaction.id.in_(ids))
            .update({Transaction.category: category}, synchronize_session=False)
        )
        self.db.commit()
        return int(updated or 0)

    def sum_expenses_by_category(self, month_year: str, category: str) -> Decimal:
        year, month = map(int, month_year.split("-"))
        start = date(year, month, 1)
        end = date(year + 1, 1, 1) if month == 12 else date(year, month + 1, 1)
        normalized_category = category.strip().lower()

        total = (
            self.db.query(func.coalesce(func.sum(Transaction.amount), 0))
            .filter(
                Transaction.movement_type == MovementType.EGRESO,
                func.lower(func.trim(func.coalesce(Transaction.category, "")))
                == normalized_category,
                Transaction.transaction_date >= start,
                Transaction.transaction_date < end,
            )
            .scalar()
        )
        return Decimal(str(total or 0))

    def aggregate_summary(
        self,
        *,
        from_date: date | None = None,
        to_date: date | None = None,
        movement_type: MovementType | None = None,
        search: str | None = None,
    ) -> list[Transaction]:
        return self.list_transactions(
            from_date=from_date,
            to_date=to_date,
            movement_type=movement_type,
            search=search,
        )

    def list_webhook_events(self, limit: int = 20) -> list[WebhookEvent]:
        return (
            self.db.query(WebhookEvent)
            .order_by(WebhookEvent.id.desc())
            .limit(limit)
            .all()
        )

    def list_notifications(self, *, limit: int = 20, unread_only: bool = False) -> list:
        from app.modules.finance.domain.models import FinanceNotification

        query = self.db.query(FinanceNotification)
        if unread_only:
            query = query.filter(FinanceNotification.is_read.is_(False))
        return query.order_by(FinanceNotification.id.desc()).limit(limit).all()

    def count_unread_notifications(self) -> int:
        from app.modules.finance.domain.models import FinanceNotification

        return (
            self.db.query(FinanceNotification)
            .filter(FinanceNotification.is_read.is_(False))
            .count()
        )

    def get_notification(self, notification_id: int):
        from app.modules.finance.domain.models import FinanceNotification

        return self.db.query(FinanceNotification).filter(FinanceNotification.id == notification_id).first()

    def get_notification_by_reference(self, reference_key: str):
        from app.modules.finance.domain.models import FinanceNotification

        return (
            self.db.query(FinanceNotification)
            .filter(FinanceNotification.reference_key == reference_key)
            .first()
        )

    def create_notification(self, notification) -> object:
        self.db.add(notification)
        self.db.commit()
        self.db.refresh(notification)
        return notification

    def mark_notification_read(self, notification) -> object:
        notification.is_read = True
        self.db.commit()
        self.db.refresh(notification)
        return notification

    def mark_all_notifications_read(self) -> int:
        from app.modules.finance.domain.models import FinanceNotification

        updated = (
            self.db.query(FinanceNotification)
            .filter(FinanceNotification.is_read.is_(False))
            .update({FinanceNotification.is_read: True})
        )
        self.db.commit()
        return int(updated or 0)

    def get_processed_gmail_message(self, gmail_message_id: str):
        from app.modules.finance.domain.models import ProcessedGmailMessage

        return (
            self.db.query(ProcessedGmailMessage)
            .filter(ProcessedGmailMessage.gmail_message_id == gmail_message_id)
            .first()
        )

    def create_processed_gmail_message(self, record) -> object:
        self.db.add(record)
        self.db.commit()
        self.db.refresh(record)
        return record

    def get_gmail_credential(self):
        from app.modules.finance.domain.models import FinanceGmailCredential

        return self.db.query(FinanceGmailCredential).order_by(FinanceGmailCredential.id.desc()).first()

    def get_gmail_refresh_token(self) -> str | None:
        if settings.gmail_refresh_token:
            return settings.gmail_refresh_token
        credential = self.get_gmail_credential()
        return credential.refresh_token if credential else None

    def save_gmail_credential(self, refresh_token: str, connected_email: str | None) -> None:
        from app.modules.finance.domain.models import FinanceGmailCredential

        credential = self.get_gmail_credential()
        if credential:
            credential.refresh_token = refresh_token
            credential.connected_email = connected_email
        else:
            self.db.add(
                FinanceGmailCredential(refresh_token=refresh_token, connected_email=connected_email)
            )
        self.db.commit()

    def delete_gmail_credential(self) -> None:
        from app.modules.finance.domain.models import FinanceGmailCredential

        self.db.query(FinanceGmailCredential).delete()
        self.db.commit()

    def list_integration_settings(self) -> list:
        from app.modules.finance.domain.models import IntegrationSetting

        return self.db.query(IntegrationSetting).order_by(IntegrationSetting.category, IntegrationSetting.key).all()

    def get_integration_setting(self, key: str):
        from app.modules.finance.domain.models import IntegrationSetting

        return self.db.get(IntegrationSetting, key)

    def update_integration_setting(
        self,
        setting,
        *,
        is_enabled: bool | None = None,
        config_value: str | None = None,
    ):
        if is_enabled is not None:
            setting.is_enabled = is_enabled
        if config_value is not None:
            stripped = config_value.strip()
            setting.config_value = stripped if stripped else None
        self.db.commit()
        self.db.refresh(setting)
        return setting
