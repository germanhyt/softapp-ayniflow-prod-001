from collections import defaultdict
from datetime import date
from decimal import Decimal

from app.modules.finance.application.pagination import offset_limit, paginate_list
from app.modules.finance.domain.models import MovementType, Transaction
from app.modules.finance.infrastructure.repositories import FinanceRepository
from app.modules.finance.presentation.schemas import (
    BudgetHealthBreakdownResponse,
    BudgetHealthItem,
    BudgetPaginatedResponse,
    BudgetResponse,
    CashClosingResponse,
    DailyBalanceItem,
    FinanceSummaryResponse,
    LoanPaginatedResponse,
    LoanRecordResponse,
    LoanSummaryResponse,
    PaginatedMeta,
    SavingsGoalResponse,
    SavingsPaginatedResponse,
    SavingsSummaryResponse,
    TransactionPaginatedResponse,
    TransactionResponse,
    TypeSummaryItem,
)
from app.shared.exceptions import AppException
from app.shared.datetime_utils import serialize_datetime


class FinanceService:
    def __init__(self, repository: FinanceRepository):
        self.repository = repository

    @staticmethod
    def serialize_transaction(transaction: Transaction) -> TransactionResponse:
        return TransactionResponse(
            id=transaction.id,
            transaction_date=transaction.transaction_date,
            transaction_time=transaction.transaction_time,
            movement_type=transaction.movement_type.value,
            concept=transaction.concept,
            bank=transaction.bank,
            payment_type=transaction.payment_type,
            recipient=transaction.recipient,
            operation_number=transaction.operation_number,
            amount=transaction.amount,
            category=transaction.category,
            savings_goal_id=transaction.savings_goal_id,
            loan_record_id=transaction.loan_record_id,
            notes=transaction.notes,
            created_at=serialize_datetime(transaction.created_at),
        )

    def get_summary(
        self,
        *,
        from_date: date | None = None,
        to_date: date | None = None,
        movement_type: MovementType | None = None,
        search: str | None = None,
    ) -> FinanceSummaryResponse:
        transactions = self.repository.aggregate_summary(
            from_date=from_date,
            to_date=to_date,
            movement_type=movement_type,
            search=search,
        )

        total_income = Decimal("0")
        total_expense = Decimal("0")
        daily_map: dict[str, dict[str, Decimal]] = defaultdict(
            lambda: {"income": Decimal("0"), "expense": Decimal("0")}
        )
        type_map: dict[str, dict[str, Decimal | int]] = defaultdict(
            lambda: {"amount": Decimal("0"), "count": 0}
        )

        for tx in transactions:
            amount = Decimal(str(tx.amount))
            day_key = tx.transaction_date.isoformat()
            type_key = tx.payment_type

            type_map[type_key]["amount"] = (
                Decimal(str(type_map[type_key]["amount"])) + amount
            )
            type_map[type_key]["count"] = int(type_map[type_key]["count"]) + 1

            if tx.movement_type == MovementType.INGRESO:
                total_income += amount
                daily_map[day_key]["income"] += amount
            else:
                total_expense += amount
                daily_map[day_key]["expense"] += amount

        daily_balances = [
            DailyBalanceItem(
                date=day,
                income=values["income"],
                expense=values["expense"],
            )
            for day, values in sorted(daily_map.items())
        ]

        by_payment_type = [
            TypeSummaryItem(
                payment_type=payment_type,
                amount=Decimal(str(values["amount"])),
                count=int(values["count"]),
            )
            for payment_type, values in sorted(
                type_map.items(), key=lambda item: item[1]["amount"], reverse=True
            )
        ]

        return FinanceSummaryResponse(
            total_income=total_income,
            total_expense=total_expense,
            balance=total_income - total_expense,
            transaction_count=len(transactions),
            daily_balances=daily_balances,
            by_payment_type=by_payment_type,
        )

    def get_cash_closing(self, from_date: date, to_date: date) -> CashClosingResponse:
        if from_date > to_date:
            raise AppException(
                "La fecha inicial no puede ser mayor que la final", status_code=400
            )

        summary = self.get_summary(from_date=from_date, to_date=to_date)
        transactions = self.repository.aggregate_summary(
            from_date=from_date, to_date=to_date
        )
        income_count = sum(
            1 for tx in transactions if tx.movement_type == MovementType.INGRESO
        )
        expense_count = len(transactions) - income_count
        return CashClosingResponse(
            from_date=from_date,
            to_date=to_date,
            total_income=summary.total_income,
            total_expense=summary.total_expense,
            balance=summary.balance,
            transaction_count=summary.transaction_count,
            income_count=income_count,
            expense_count=expense_count,
            daily_balances=summary.daily_balances,
            by_payment_type=summary.by_payment_type,
        )

    def list_transactions_paginated(
        self,
        *,
        from_date: date | None = None,
        to_date: date | None = None,
        movement_type: MovementType | None = None,
        search: str | None = None,
        page: int = 1,
        page_size: int = 20,
    ) -> TransactionPaginatedResponse:
        offset, limit = offset_limit(page, page_size)
        items, total = self.repository.list_transactions_paginated(
            from_date=from_date,
            to_date=to_date,
            movement_type=movement_type,
            search=search,
            offset=offset,
            limit=limit,
        )
        total_pages = max(1, (total + limit - 1) // limit) if total else 1
        safe_page = max(1, min(page, total_pages))
        return TransactionPaginatedResponse(
            items=[self.serialize_transaction(item) for item in items],
            meta=PaginatedMeta(
                total=total,
                page=safe_page,
                page_size=page_size if page_size in {20, 50, 100, 200} else 20,
                total_pages=total_pages,
            ),
        )

    def serialize_budget(self, budget) -> BudgetResponse:
        actual = self.repository.sum_expenses_by_category(
            budget.month_year, budget.category
        )
        budgeted = Decimal(str(budget.budgeted_amount))
        percentage = (
            actual / budgeted * Decimal("100")
            if budgeted > 0
            else Decimal("0")
        )
        difference = budgeted - actual

        return BudgetResponse(
            id=budget.id,
            month_year=budget.month_year,
            category=budget.category,
            budgeted_amount=budgeted,
            actual_amount=actual,
            percentage=percentage.quantize(Decimal("0.01")),
            difference=difference.quantize(Decimal("0.01")),
            created_at=serialize_datetime(budget.created_at),
            updated_at=serialize_datetime(budget.updated_at),
        )

    def ensure_transaction(self, transaction_id: int) -> Transaction:
        transaction = self.repository.get_transaction(transaction_id)
        if transaction is None:
            raise AppException("Transacción no encontrada", status_code=404)
        return transaction

    def ensure_budget(self, budget_id: int):
        budget = self.repository.get_budget(budget_id)
        if budget is None:
            raise AppException("Presupuesto no encontrado", status_code=404)
        return budget

    def serialize_savings_goal(self, goal) -> SavingsGoalResponse:
        target_amount = Decimal(str(goal.target_amount))
        current_amount = Decimal(str(goal.current_amount))
        progress = (
            current_amount / target_amount * Decimal("100")
            if target_amount > 0
            else Decimal("0")
        )
        return SavingsGoalResponse(
            id=goal.id,
            name=goal.name,
            target_amount=target_amount,
            current_amount=current_amount,
            progress_percentage=progress.quantize(Decimal("0.01")),
            due_date=goal.due_date,
            notes=goal.notes,
            created_at=serialize_datetime(goal.created_at),
            updated_at=serialize_datetime(goal.updated_at),
        )

    def get_savings_summary(self) -> SavingsSummaryResponse:
        goals = self.repository.list_savings_goals()
        total_target = sum(
            (Decimal(str(item.target_amount)) for item in goals), Decimal("0")
        )
        total_current = sum(
            (Decimal(str(item.current_amount)) for item in goals), Decimal("0")
        )
        completion = (
            total_current / total_target * Decimal("100")
            if total_target > 0
            else Decimal("0")
        )
        return SavingsSummaryResponse(
            goals_count=len(goals),
            total_target_amount=total_target,
            total_saved_amount=total_current,
            completion_percentage=completion.quantize(Decimal("0.01")),
        )

    def ensure_savings_goal(self, goal_id: int):
        goal = self.repository.get_savings_goal(goal_id)
        if goal is None:
            raise AppException("Meta de ahorro no encontrada", status_code=404)
        return goal

    def serialize_loan_record(self, loan) -> LoanRecordResponse:
        principal_amount = Decimal(str(loan.principal_amount))
        outstanding_amount = Decimal(str(loan.outstanding_amount))
        paid_amount = principal_amount - outstanding_amount
        paid_percentage = (
            paid_amount / principal_amount * Decimal("100")
            if principal_amount > 0
            else Decimal("0")
        )
        return LoanRecordResponse(
            id=loan.id,
            loan_type=getattr(loan, "loan_type", "payable") or "payable",
            lender=loan.lender,
            principal_amount=principal_amount,
            outstanding_amount=outstanding_amount,
            paid_amount=paid_amount.quantize(Decimal("0.01")),
            paid_percentage=paid_percentage.quantize(Decimal("0.01")),
            interest_rate=(
                Decimal(str(loan.interest_rate))
                if loan.interest_rate is not None
                else None
            ),
            next_payment_date=loan.next_payment_date,
            status=loan.status,
            notes=loan.notes,
            created_at=serialize_datetime(loan.created_at),
            updated_at=serialize_datetime(loan.updated_at),
        )

    def get_loan_summary(self) -> LoanSummaryResponse:
        loans = self.repository.list_loan_records()
        total_principal = sum(
            (Decimal(str(item.principal_amount)) for item in loans), Decimal("0")
        )
        total_outstanding = sum(
            (Decimal(str(item.outstanding_amount)) for item in loans),
            Decimal("0"),
        )
        active_loans = [item for item in loans if item.status.lower() == "active"]
        payables = [
            item for item in loans if str(getattr(item, "loan_type", "payable")).lower() == "payable"
        ]
        receivables = [
            item for item in loans if str(getattr(item, "loan_type", "payable")).lower() == "receivable"
        ]
        payable_outstanding = sum(
            (Decimal(str(item.outstanding_amount)) for item in payables), Decimal("0")
        )
        receivable_outstanding = sum(
            (Decimal(str(item.outstanding_amount)) for item in receivables), Decimal("0")
        )
        return LoanSummaryResponse(
            loans_count=len(loans),
            active_loans_count=len(active_loans),
            total_principal_amount=total_principal,
            total_outstanding_amount=total_outstanding,
            payable_count=len(payables),
            receivable_count=len(receivables),
            payable_outstanding_amount=payable_outstanding,
            receivable_outstanding_amount=receivable_outstanding,
        )

    def ensure_loan_record(self, loan_id: int):
        loan = self.repository.get_loan_record(loan_id)
        if loan is None:
            raise AppException("Préstamo no encontrado", status_code=404)
        return loan

    @staticmethod
    def budget_health_status(percentage: Decimal) -> str:
        pct = float(percentage)
        if pct >= 100:
            return "exceeded"
        if pct >= 80:
            return "risk"
        return "ok"

    def _filter_budgets_by_health(
        self, items: list[BudgetResponse], health: str | None
    ) -> list[BudgetResponse]:
        if not health or health == "all":
            return items
        return [
            item
            for item in items
            if self.budget_health_status(item.percentage) == health
        ]

    def list_budgets_paginated(
        self,
        *,
        month_year: str | None = None,
        category: str | None = None,
        health: str | None = None,
        page: int = 1,
        page_size: int = 20,
    ) -> BudgetPaginatedResponse:
        budgets = self.repository.list_budgets(
            month_year=month_year, category=category
        )
        serialized = [self.serialize_budget(budget) for budget in budgets]
        filtered = self._filter_budgets_by_health(serialized, health)
        page_items, total, total_pages = paginate_list(
            filtered, page=page, page_size=page_size
        )
        return BudgetPaginatedResponse(
            items=page_items,
            meta=PaginatedMeta(
                total=total,
                page=max(1, min(page, total_pages)),
                page_size=page_size if page_size in {20, 50, 100, 200} else 20,
                total_pages=total_pages,
            ),
        )

    def get_budget_health_breakdown(
        self, month_year: str
    ) -> BudgetHealthBreakdownResponse:
        budgets = self.repository.list_budgets(month_year=month_year)
        serialized = [self.serialize_budget(budget) for budget in budgets]

        ok: list[BudgetHealthItem] = []
        at_risk: list[BudgetHealthItem] = []
        exceeded: list[BudgetHealthItem] = []
        total_budgeted = Decimal("0")
        total_actual = Decimal("0")

        for item in serialized:
            total_budgeted += item.budgeted_amount
            total_actual += item.actual_amount
            health = self.budget_health_status(item.percentage)
            health_item = BudgetHealthItem(
                **item.model_dump(),
                health_status=health,
            )
            if health == "exceeded":
                exceeded.append(health_item)
            elif health == "risk":
                at_risk.append(health_item)
            else:
                ok.append(health_item)

        return BudgetHealthBreakdownResponse(
            month_year=month_year,
            ok_count=len(ok),
            at_risk_count=len(at_risk),
            exceeded_count=len(exceeded),
            total_budgeted=total_budgeted,
            total_actual=total_actual,
            ok=ok,
            at_risk=at_risk,
            exceeded=exceeded,
        )

    def list_savings_paginated(
        self,
        *,
        search: str | None = None,
        progress: str | None = None,
        page: int = 1,
        page_size: int = 20,
    ) -> SavingsPaginatedResponse:
        offset, limit = offset_limit(page, page_size)
        goals, total = self.repository.list_savings_goals_paginated(
            search=search,
            progress=progress,
            offset=offset,
            limit=limit,
        )
        total_pages = max(1, (total + limit - 1) // limit) if total else 1
        safe_page = max(1, min(page, total_pages))
        return SavingsPaginatedResponse(
            items=[self.serialize_savings_goal(goal) for goal in goals],
            meta=PaginatedMeta(
                total=total,
                page=safe_page,
                page_size=page_size if page_size in {20, 50, 100, 200} else 20,
                total_pages=total_pages,
            ),
        )

    def list_loans_paginated(
        self,
        *,
        search: str | None = None,
        status: str | None = None,
        loan_type: str | None = None,
        page: int = 1,
        page_size: int = 20,
    ) -> LoanPaginatedResponse:
        offset, limit = offset_limit(page, page_size)
        loans, total = self.repository.list_loan_records_paginated(
            search=search,
            status=status,
            loan_type=loan_type,
            offset=offset,
            limit=limit,
        )
        total_pages = max(1, (total + limit - 1) // limit) if total else 1
        safe_page = max(1, min(page, total_pages))
        return LoanPaginatedResponse(
            items=[self.serialize_loan_record(item) for item in loans],
            meta=PaginatedMeta(
                total=total,
                page=safe_page,
                page_size=page_size if page_size in {20, 50, 100, 200} else 20,
                total_pages=total_pages,
            ),
        )
