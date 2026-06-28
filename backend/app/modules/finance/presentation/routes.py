from datetime import date

from decimal import Decimal

from fastapi import APIRouter, Depends, Query
from sqlalchemy.orm import Session

from app.core.database import get_db
from app.modules.auth.domain.models import User
from app.modules.auth.presentation.deps import require_permission
from app.modules.finance.application.services import FinanceService
from app.modules.finance.application.transaction_link_service import TransactionLinkService
from app.modules.finance.application.ws_events import notify_transactions_changed
from app.modules.finance.domain.models import MovementType
from app.modules.finance.infrastructure.repositories import FinanceRepository
from app.modules.finance.presentation.schemas import (
    BudgetCreate,
    BudgetHealthBreakdownResponse,
    BudgetPaginatedResponse,
    BudgetResponse,
    LoanPaginatedResponse,
    LoanRecordCreate,
    LoanRecordResponse,
    LoanRecordUpdate,
    LoanSummaryResponse,
    LoanTypeSchema,
    SavingsGoalCreate,
    SavingsGoalResponse,
    SavingsGoalUpdate,
    SavingsPaginatedResponse,
    SavingsSummaryResponse,
    BudgetUpdate,
    CashClosingResponse,
    FinanceSummaryResponse,
    MovementTypeSchema,
    TransactionCreate,
    TransactionBulkCategoryUpdate,
    TransactionBulkDelete,
    TransactionBulkResult,
    TransactionPaginatedResponse,
    TransactionResponse,
    TransactionUpdate,
)

router = APIRouter(prefix="/finance", tags=["finance"])


def get_finance_service(db: Session = Depends(get_db)) -> FinanceService:
    return FinanceService(FinanceRepository(db))


def serialize_transaction(transaction) -> TransactionResponse:
    return FinanceService.serialize_transaction(transaction)


@router.get("/transactions", response_model=TransactionPaginatedResponse)
def list_transactions(
    from_date: date | None = Query(default=None, alias="from"),
    to_date: date | None = Query(default=None, alias="to"),
    movement_type: MovementTypeSchema | None = None,
    search: str | None = None,
    page: int = Query(default=1, ge=1),
    page_size: int = Query(default=20, ge=1, le=200),
    _: User = Depends(require_permission("finance:read")),
    service: FinanceService = Depends(get_finance_service),
):
    movement = MovementType(movement_type.value) if movement_type else None
    return service.list_transactions_paginated(
        from_date=from_date,
        to_date=to_date,
        movement_type=movement,
        search=search or None,
        page=page,
        page_size=page_size,
    )


@router.post(
    "/transactions", response_model=TransactionResponse, status_code=201
)
def create_transaction(
    payload: TransactionCreate,
    _: User = Depends(require_permission("finance:write")),
    service: FinanceService = Depends(get_finance_service),
    db: Session = Depends(get_db),
):
    repository = FinanceRepository(db)
    link_service = TransactionLinkService(repository)
    movement = MovementType(payload.movement_type.value)
    link_service.validate_links(
        movement_type=movement,
        savings_goal_id=payload.savings_goal_id,
        loan_record_id=payload.loan_record_id,
    )
    transaction = repository.create_transaction(
        {
            **payload.model_dump(),
            "movement_type": movement,
        }
    )
    link_service.apply_links(transaction)
    result = serialize_transaction(transaction)
    notify_transactions_changed("created", transaction_id=transaction.id, transaction=result)
    return result


@router.put(
    "/transactions/{transaction_id}", response_model=TransactionResponse
)
def update_transaction(
    transaction_id: int,
    payload: TransactionUpdate,
    _: User = Depends(require_permission("finance:write")),
    service: FinanceService = Depends(get_finance_service),
    db: Session = Depends(get_db),
):
    repository = FinanceRepository(db)
    link_service = TransactionLinkService(repository)
    transaction = service.ensure_transaction(transaction_id)
    link_service.reverse_links(transaction)

    data = payload.model_dump(exclude_unset=True)
    if "movement_type" in data and data["movement_type"] is not None:
        data["movement_type"] = MovementType(data["movement_type"].value)

    movement = data.get("movement_type", transaction.movement_type)
    savings_goal_id = data.get("savings_goal_id", transaction.savings_goal_id)
    loan_record_id = data.get("loan_record_id", transaction.loan_record_id)
    link_service.validate_links(
        movement_type=movement,
        savings_goal_id=savings_goal_id,
        loan_record_id=loan_record_id,
    )

    updated = repository.update_transaction(transaction, data)
    link_service.apply_links(updated)
    result = serialize_transaction(updated)
    notify_transactions_changed("updated", transaction_id=updated.id, transaction=result)
    return result


@router.delete("/transactions/{transaction_id}", status_code=204)
def delete_transaction(
    transaction_id: int,
    _: User = Depends(require_permission("finance:write")),
    service: FinanceService = Depends(get_finance_service),
    db: Session = Depends(get_db),
):
    repository = FinanceRepository(db)
    link_service = TransactionLinkService(repository)
    transaction = service.ensure_transaction(transaction_id)
    link_service.reverse_links(transaction)
    repository.delete_transaction(transaction)
    notify_transactions_changed("deleted", transaction_id=transaction_id)


@router.patch("/transactions/bulk/category", response_model=TransactionBulkResult)
def bulk_update_transaction_category(
    payload: TransactionBulkCategoryUpdate,
    _: User = Depends(require_permission("finance:write")),
    db: Session = Depends(get_db),
):
    repository = FinanceRepository(db)
    updated = repository.bulk_update_transaction_category(payload.ids, payload.category)
    if updated:
        notify_transactions_changed("bulk")
    return TransactionBulkResult(updated=updated, deleted=0, total=len(payload.ids))


@router.post("/transactions/bulk/delete", response_model=TransactionBulkResult)
def bulk_delete_transactions(
    payload: TransactionBulkDelete,
    _: User = Depends(require_permission("finance:write")),
    service: FinanceService = Depends(get_finance_service),
    db: Session = Depends(get_db),
):
    repository = FinanceRepository(db)
    link_service = TransactionLinkService(repository)
    transactions = repository.get_transactions_by_ids(payload.ids)
    deleted = 0
    for transaction in transactions:
        link_service.reverse_links(transaction)
        repository.delete_transaction(transaction)
        deleted += 1
    if deleted:
        notify_transactions_changed("bulk")
    return TransactionBulkResult(updated=0, deleted=deleted, total=len(payload.ids))


@router.get("/summary", response_model=FinanceSummaryResponse)
def get_summary(
    from_date: date | None = Query(default=None, alias="from"),
    to_date: date | None = Query(default=None, alias="to"),
    movement_type: MovementTypeSchema | None = None,
    search: str | None = None,
    _: User = Depends(require_permission("finance:read")),
    service: FinanceService = Depends(get_finance_service),
):
    movement = MovementType(movement_type.value) if movement_type else None
    return service.get_summary(
        from_date=from_date,
        to_date=to_date,
        movement_type=movement,
        search=search,
    )


@router.get("/cash-closing", response_model=CashClosingResponse)
def get_cash_closing(
    from_date: date = Query(alias="from"),
    to_date: date = Query(alias="to"),
    _: User = Depends(require_permission("finance:read")),
    service: FinanceService = Depends(get_finance_service),
):
    return service.get_cash_closing(from_date, to_date)


@router.get("/budgets/health-breakdown", response_model=BudgetHealthBreakdownResponse)
def get_budget_health_breakdown(
    month_year: str = Query(..., min_length=7, max_length=7),
    _: User = Depends(require_permission("finance:read")),
    service: FinanceService = Depends(get_finance_service),
):
    return service.get_budget_health_breakdown(month_year)


@router.get("/budgets", response_model=BudgetPaginatedResponse)
def list_budgets(
    month_year: str | None = None,
    category: str | None = None,
    health: str | None = Query(default=None, pattern="^(all|ok|risk|exceeded)$"),
    page: int = Query(default=1, ge=1),
    page_size: int = Query(default=20, ge=1, le=200),
    _: User = Depends(require_permission("finance:read")),
    service: FinanceService = Depends(get_finance_service),
    db: Session = Depends(get_db),
):
    result = service.list_budgets_paginated(
        month_year=month_year,
        category=category or None,
        health=health,
        page=page,
        page_size=page_size,
    )

    from app.modules.finance.application.notification_service import (
        NotificationService,
    )

    repository = FinanceRepository(db)
    notification_service = NotificationService(repository)
    if month_year:
        breakdown = service.get_budget_health_breakdown(month_year)
        alert_items = breakdown.ok + breakdown.at_risk + breakdown.exceeded
    else:
        alert_items = result.items
    notification_service.check_budget_alerts(
        [
            {
                "month_year": item.month_year,
                "category": item.category,
                "budgeted_amount": str(item.budgeted_amount),
                "actual_amount": str(item.actual_amount),
                "percentage": float(item.percentage),
                "difference": str(item.difference),
            }
            for item in alert_items
        ]
    )

    return result


@router.post("/budgets", response_model=BudgetResponse, status_code=201)
def create_budget(
    payload: BudgetCreate,
    _: User = Depends(require_permission("finance:write")),
    service: FinanceService = Depends(get_finance_service),
    db: Session = Depends(get_db),
):
    repository = FinanceRepository(db)
    budget = repository.create_budget(payload.model_dump())
    return service.serialize_budget(budget)


@router.put("/budgets/{budget_id}", response_model=BudgetResponse)
def update_budget(
    budget_id: int,
    payload: BudgetUpdate,
    _: User = Depends(require_permission("finance:write")),
    service: FinanceService = Depends(get_finance_service),
    db: Session = Depends(get_db),
):
    repository = FinanceRepository(db)
    budget = service.ensure_budget(budget_id)
    updated = repository.update_budget(
        budget, payload.model_dump(exclude_unset=True)
    )
    return service.serialize_budget(updated)


@router.delete("/budgets/{budget_id}", status_code=204)
def delete_budget(
    budget_id: int,
    _: User = Depends(require_permission("finance:write")),
    service: FinanceService = Depends(get_finance_service),
    db: Session = Depends(get_db),
):
    repository = FinanceRepository(db)
    budget = service.ensure_budget(budget_id)
    repository.delete_budget(budget)


@router.get("/savings", response_model=SavingsPaginatedResponse)
def list_savings_goals(
    search: str | None = None,
    progress: str | None = Query(default=None, pattern="^(all|in_progress|completed)$"),
    page: int = Query(default=1, ge=1),
    page_size: int = Query(default=20, ge=1, le=200),
    _: User = Depends(require_permission("finance:read")),
    service: FinanceService = Depends(get_finance_service),
):
    return service.list_savings_paginated(
        search=search or None,
        progress=progress,
        page=page,
        page_size=page_size,
    )


@router.get("/savings/summary", response_model=SavingsSummaryResponse)
def get_savings_summary(
    _: User = Depends(require_permission("finance:read")),
    service: FinanceService = Depends(get_finance_service),
):
    return service.get_savings_summary()


@router.post("/savings", response_model=SavingsGoalResponse, status_code=201)
def create_savings_goal(
    payload: SavingsGoalCreate,
    _: User = Depends(require_permission("finance:write")),
    service: FinanceService = Depends(get_finance_service),
    db: Session = Depends(get_db),
):
    repository = FinanceRepository(db)
    goal = repository.create_savings_goal(payload.model_dump())
    return service.serialize_savings_goal(goal)


@router.put("/savings/{goal_id}", response_model=SavingsGoalResponse)
def update_savings_goal(
    goal_id: int,
    payload: SavingsGoalUpdate,
    _: User = Depends(require_permission("finance:write")),
    service: FinanceService = Depends(get_finance_service),
    db: Session = Depends(get_db),
):
    repository = FinanceRepository(db)
    goal = service.ensure_savings_goal(goal_id)
    updated = repository.update_savings_goal(goal, payload.model_dump(exclude_unset=True))
    return service.serialize_savings_goal(updated)


@router.delete("/savings/{goal_id}", status_code=204)
def delete_savings_goal(
    goal_id: int,
    _: User = Depends(require_permission("finance:write")),
    service: FinanceService = Depends(get_finance_service),
    db: Session = Depends(get_db),
):
    repository = FinanceRepository(db)
    goal = service.ensure_savings_goal(goal_id)
    repository.delete_savings_goal(goal)


@router.get("/loans", response_model=LoanPaginatedResponse)
def list_loan_records(
    search: str | None = None,
    status: str | None = None,
    loan_type: LoanTypeSchema | None = None,
    page: int = Query(default=1, ge=1),
    page_size: int = Query(default=20, ge=1, le=200),
    _: User = Depends(require_permission("finance:read")),
    service: FinanceService = Depends(get_finance_service),
):
    return service.list_loans_paginated(
        search=search or None,
        status=status or None,
        loan_type=loan_type.value if loan_type else None,
        page=page,
        page_size=page_size,
    )


@router.get("/loans/summary", response_model=LoanSummaryResponse)
def get_loan_summary(
    _: User = Depends(require_permission("finance:read")),
    service: FinanceService = Depends(get_finance_service),
):
    return service.get_loan_summary()


@router.post("/loans", response_model=LoanRecordResponse, status_code=201)
def create_loan_record(
    payload: LoanRecordCreate,
    _: User = Depends(require_permission("finance:write")),
    service: FinanceService = Depends(get_finance_service),
    db: Session = Depends(get_db),
):
    repository = FinanceRepository(db)
    data = payload.model_dump()
    if "loan_type" in data and data["loan_type"] is not None:
        data["loan_type"] = data["loan_type"].value if hasattr(data["loan_type"], "value") else data["loan_type"]
    loan = repository.create_loan_record(data)
    return service.serialize_loan_record(loan)


@router.put("/loans/{loan_id}", response_model=LoanRecordResponse)
def update_loan_record(
    loan_id: int,
    payload: LoanRecordUpdate,
    _: User = Depends(require_permission("finance:write")),
    service: FinanceService = Depends(get_finance_service),
    db: Session = Depends(get_db),
):
    repository = FinanceRepository(db)
    loan = service.ensure_loan_record(loan_id)
    data = payload.model_dump(exclude_unset=True)
    if "loan_type" in data and data["loan_type"] is not None:
        data["loan_type"] = data["loan_type"].value if hasattr(data["loan_type"], "value") else data["loan_type"]
    principal = data.get("principal_amount", loan.principal_amount)
    outstanding = data.get("outstanding_amount", loan.outstanding_amount)
    if Decimal(str(outstanding)) > Decimal(str(principal)):
        from app.shared.exceptions import AppException

        raise AppException(
            "El saldo pendiente no puede superar el principal", status_code=400
        )
    updated = repository.update_loan_record(loan, data)
    return service.serialize_loan_record(updated)


@router.delete("/loans/{loan_id}", status_code=204)
def delete_loan_record(
    loan_id: int,
    _: User = Depends(require_permission("finance:write")),
    service: FinanceService = Depends(get_finance_service),
    db: Session = Depends(get_db),
):
    repository = FinanceRepository(db)
    loan = service.ensure_loan_record(loan_id)
    repository.delete_loan_record(loan)
