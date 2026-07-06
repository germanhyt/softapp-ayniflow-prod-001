"""Datos mock de demostración para AyniFlow."""

from __future__ import annotations

from datetime import date, time, timedelta
from decimal import Decimal

from sqlalchemy.orm import Session

from app.core.database import SessionLocal
from app.modules.auth.infrastructure.repositories import AuthRepository
from app.modules.finance.application.mock_workspace_data import (
    BUSINESS_BUDGETS,
    BUSINESS_LOANS,
    BUSINESS_SAVINGS,
    BUSINESS_TRANSACTIONS,
    PERSONAL_BUDGETS,
    PERSONAL_SAVINGS,
    PERSONAL_TRANSACTIONS,
    READER_BUDGETS,
    READER_SAVINGS,
    READER_TRANSACTIONS,
    MockTransactionSpec,
)
from app.modules.finance.application.notification_service import NotificationService
from app.modules.finance.application.services import FinanceService
from app.modules.finance.domain.models import (
    Budget,
    FinanceGmailCredential,
    FinanceNotification,
    LoanRecord,
    MovementType,
    ProcessedGmailMessage,
    SavingsGoal,
    Transaction,
    WebhookEvent,
)
from app.modules.finance.infrastructure.repositories import FinanceRepository

DEMO_USERS = [
    {
        "email": "operador@example.com",
        "username": "operador",
        "password": "Operador123!",
        "full_name": "Operador Finanzas",
        "role_slug": "operator",
    },
    {
        "email": "lector@example.com",
        "username": "lector",
        "password": "Lector123!",
        "full_name": "Usuario Solo Lectura",
        "role_slug": "reader",
    },
]

DEMO_GMAIL_INTEGRATIONS: dict[str, dict[str, str]] = {
    "admin": {
        "connected_email": "admin.finanzas@example.com",
        "refresh_token": "mock-refresh-token-admin",
    },
    "operador": {
        "connected_email": "operador.negocio@example.com",
        "refresh_token": "mock-refresh-token-operador",
    },
}

FINANCE_PROFILES: dict[str, dict] = {
    "admin": {
        "tx_specs": PERSONAL_TRANSACTIONS,
        "budgets": PERSONAL_BUDGETS,
        "savings": PERSONAL_SAVINGS,
        "loans": None,
        "op_prefix": "MOCK-ADM",
    },
    "operador": {
        "tx_specs": BUSINESS_TRANSACTIONS,
        "budgets": BUSINESS_BUDGETS,
        "savings": BUSINESS_SAVINGS,
        "loans": BUSINESS_LOANS,
        "op_prefix": "MOCK-OPE",
    },
    "lector": {
        "tx_specs": READER_TRANSACTIONS,
        "budgets": READER_BUDGETS,
        "savings": READER_SAVINGS,
        "loans": None,
        "op_prefix": "MOCK-LEC",
    },
}


def _month_year(day: date) -> str:
    return day.strftime("%Y-%m")


def clear_finance_data(db: Session) -> None:
    db.query(Transaction).delete(synchronize_session=False)
    db.query(FinanceNotification).delete(synchronize_session=False)
    db.query(WebhookEvent).delete(synchronize_session=False)
    db.query(ProcessedGmailMessage).delete(synchronize_session=False)
    db.query(FinanceGmailCredential).delete(synchronize_session=False)
    db.query(Budget).delete(synchronize_session=False)
    db.query(SavingsGoal).delete(synchronize_session=False)
    db.query(LoanRecord).delete(synchronize_session=False)
    db.commit()


def clear_workspace_data(db: Session) -> None:
    """Compatibilidad histórica: hoy el scope es por usuario."""
    db.commit()


def seed_demo_users(db: Session) -> list[str]:
    repository = AuthRepository(db)
    created: list[str] = []

    for spec in DEMO_USERS:
        if repository.get_user_by_username(spec["username"]):
            continue
        repository.create_user(
            email=spec["email"],
            username=spec["username"],
            password=spec["password"],
            full_name=spec["full_name"],
            role_slug=spec["role_slug"],
        )
        created.append(spec["username"])

    return created


def seed_demo_user_scopes(db: Session) -> dict[str, int]:
    """Asigna datos mock por usuario (scope = user.id)."""
    auth = AuthRepository(db)
    scopes: dict[str, int] = {}
    for username in FINANCE_PROFILES:
        user = auth.get_user_by_username(username)
        if user is None:
            raise RuntimeError(
                f"Usuario {username} no encontrado. Ejecuta con --force o sin --no-users."
            )
        scopes[username] = user.id
    return scopes


def seed_demo_integrations(db: Session, user_scopes: dict[str, int]) -> dict[str, str | None]:
    """Gmail mock por usuario. Lector queda sin integración (estado pendiente)."""
    connected: dict[str, str | None] = {username: None for username in user_scopes}

    for username, spec in DEMO_GMAIL_INTEGRATIONS.items():
        user_id = user_scopes.get(username)
        if user_id is None:
            continue
        db.add(
            FinanceGmailCredential(
                workspace_id=user_id,
                refresh_token=spec["refresh_token"],
                connected_email=spec["connected_email"],
            )
        )
        connected[username] = spec["connected_email"]

    db.commit()
    return connected


def _build_transactions_from_specs(
    *,
    workspace_id: int,
    today: date,
    specs: tuple[MockTransactionSpec, ...],
    op_prefix: str,
) -> list[Transaction]:
    rows: list[Transaction] = []
    for index, spec in enumerate(specs, start=1):
        rows.append(
            Transaction(
                workspace_id=workspace_id,
                transaction_date=today + timedelta(days=spec.day_offset),
                transaction_time=time(spec.hour, spec.minute),
                movement_type=spec.movement,
                concept=spec.concept,
                bank=spec.bank,
                payment_type=spec.payment_type,
                recipient="Mock data",
                operation_number=f"{op_prefix}-{index:04d}",
                amount=Decimal(spec.amount),
                category=spec.category,
            )
        )
    return rows


def _seed_workspace_finance(
    db: Session,
    *,
    workspace_id: int,
    tx_specs: tuple[MockTransactionSpec, ...],
    budgets: tuple[tuple[str, str], ...],
    savings: tuple[tuple[str, str, str], ...],
    loans: tuple[tuple[str, str, str, str, str], ...] | None = None,
    op_prefix: str,
) -> dict[str, int]:
    today = date.today()
    month_year = _month_year(today)
    prev_month = _month_year(today.replace(day=1) - timedelta(days=1))

    savings_goals = [
        SavingsGoal(
            workspace_id=workspace_id,
            name=name,
            target_amount=Decimal(target),
            current_amount=Decimal(current),
        )
        for name, target, current in savings
    ]
    db.add_all(savings_goals)
    db.flush()

    loan_records: list[LoanRecord] = []
    if loans:
        loan_records = [
            LoanRecord(
                workspace_id=workspace_id,
                loan_type=loan_type,
                lender=lender,
                principal_amount=Decimal(principal),
                outstanding_amount=Decimal(outstanding),
                status="active",
                notes=notes,
            )
            for loan_type, lender, principal, outstanding, notes in loans
        ]
        db.add_all(loan_records)
        db.flush()

    transactions = _build_transactions_from_specs(
        workspace_id=workspace_id,
        today=today,
        specs=tx_specs,
        op_prefix=op_prefix,
    )

    if loan_records:
        transactions.extend(
            [
                Transaction(
                    workspace_id=workspace_id,
                    transaction_date=today,
                    transaction_time=time(11, 0),
                    movement_type=MovementType.EGRESO,
                    concept="Cuota préstamo banco",
                    bank="BCP",
                    payment_type="TRANSFERENCIA",
                    recipient="Banco Demo",
                    operation_number=f"{op_prefix}-LOAN-01",
                    amount=Decimal("400.00"),
                    category="Personal",
                    loan_record_id=loan_records[0].id,
                ),
                Transaction(
                    workspace_id=workspace_id,
                    transaction_date=today,
                    transaction_time=time(9, 30),
                    movement_type=MovementType.INGRESO,
                    concept="Abono cliente Juan",
                    bank="YAPE",
                    payment_type="YAPEO CELULAR",
                    recipient="Juan Pérez",
                    operation_number=f"{op_prefix}-LOAN-02",
                    amount=Decimal("300.00"),
                    category="Personal",
                    loan_record_id=loan_records[1].id,
                ),
            ]
        )

    if savings_goals:
        transactions.append(
            Transaction(
                workspace_id=workspace_id,
                transaction_date=today,
                transaction_time=time(20, 0),
                movement_type=MovementType.EGRESO,
                concept="Aporte meta ahorro",
                bank="BCP",
                payment_type="TRANSFERENCIA",
                recipient="Ahorro propio",
                operation_number=f"{op_prefix}-SAVE-01",
                amount=Decimal("500.00"),
                category="Personal",
                savings_goal_id=savings_goals[0].id,
            )
        )

    db.add_all(transactions)

    budget_rows = [
        Budget(
            workspace_id=workspace_id,
            month_year=month_year,
            category=category,
            budgeted_amount=Decimal(amount),
        )
        for category, amount in budgets
    ]
    db.add_all(budget_rows)
    db.add(
        Budget(
            workspace_id=workspace_id,
            month_year=prev_month,
            category="Alimentación",
            budgeted_amount=Decimal("750.00"),
        )
    )
    db.commit()

    repository = FinanceRepository(db, workspace_id=workspace_id)
    service = FinanceService(repository)
    breakdown = service.get_budget_health_breakdown(month_year)
    NotificationService(repository).check_budget_alerts(
        [
            {
                "category": item.category,
                "month_year": item.month_year,
                "percentage": float(item.percentage),
                "actual": str(item.actual_amount),
                "budgeted": str(item.budgeted_amount),
            }
            for item in breakdown.ok + breakdown.at_risk + breakdown.exceeded
        ]
    )

    return {
        "transactions": len(transactions),
        "budgets": len(budget_rows) + 1,
        "savings_goals": len(savings_goals),
        "loan_records": len(loan_records),
    }


def seed_demo_finance(db: Session, user_scopes: dict[str, int]) -> dict[str, dict[str, int]]:
    result: dict[str, dict[str, int]] = {}
    for username, profile in FINANCE_PROFILES.items():
        result[username] = _seed_workspace_finance(
            db,
            workspace_id=user_scopes[username],
            tx_specs=profile["tx_specs"],
            budgets=profile["budgets"],
            savings=profile["savings"],
            loans=profile["loans"],
            op_prefix=profile["op_prefix"],
        )
    return result


def apply_demo_seed(*, force: bool = False, include_users: bool = True) -> dict:
    db = SessionLocal()
    result: dict = {
        "users_created": [],
        "user_scopes": {},
        "finance": None,
        "integrations": None,
        "skipped": False,
    }

    try:
        has_data = db.query(Transaction.id).first() is not None

        if has_data and not force:
            result["skipped"] = True
            result["message"] = (
                "Ya existen transacciones. Usa --force para reemplazar los datos mock."
            )
            return result

        if include_users:
            result["users_created"] = seed_demo_users(db)

        if force or not has_data:
            if force:
                clear_finance_data(db)
                clear_workspace_data(db)
            result["user_scopes"] = seed_demo_user_scopes(db)
            result["finance"] = seed_demo_finance(db, result["user_scopes"])
            result["integrations"] = seed_demo_integrations(db, result["user_scopes"])

        return result
    finally:
        db.close()
