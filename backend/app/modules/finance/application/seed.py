from datetime import date, time
from decimal import Decimal

from app.core.database import SessionLocal
from app.modules.finance.domain.models import Budget, MovementType, Transaction


def seed_finance_data() -> None:
    db = SessionLocal()
    try:
        has_transactions = db.query(Transaction.id).first()
        if has_transactions:
            return

        sample_transactions = [
            Transaction(
                transaction_date=date.today(),
                transaction_time=time(10, 30),
                movement_type=MovementType.INGRESO,
                concept="Venta del día",
                bank="BCP",
                payment_type="TRANSFERENCIA",
                recipient="Cliente A",
                operation_number="OP-001",
                amount=Decimal("1500.00"),
                category="Personal",
            ),
            Transaction(
                transaction_date=date.today(),
                transaction_time=time(14, 15),
                movement_type=MovementType.EGRESO,
                concept="Compra de insumos",
                bank="BBVA",
                payment_type="YAPEO CELULAR",
                recipient="Proveedor B",
                operation_number="OP-002",
                amount=Decimal("420.50"),
                category="Alimentación",
            ),
            Transaction(
                transaction_date=date.today(),
                transaction_time=time(18, 0),
                movement_type=MovementType.EGRESO,
                concept="Servicios básicos",
                bank="BCP",
                payment_type="TRANSFERENCIA",
                recipient="Servicios SA",
                operation_number="OP-003",
                amount=Decimal("280.00"),
                category="Servicios",
            ),
        ]

        db.add_all(sample_transactions)

        month_year = date.today().strftime("%Y-%m")
        sample_budgets = [
            Budget(month_year=month_year, category="Alimentación", budgeted_amount=Decimal("2000.00")),
            Budget(month_year=month_year, category="Servicios", budgeted_amount=Decimal("800.00")),
            Budget(month_year=month_year, category="Personal", budgeted_amount=Decimal("10000.00")),
        ]
        db.add_all(sample_budgets)
        db.commit()
    finally:
        db.close()
