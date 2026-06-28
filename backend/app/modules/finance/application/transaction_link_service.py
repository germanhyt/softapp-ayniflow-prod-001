from decimal import Decimal

from app.modules.finance.domain.models import LoanType, MovementType, Transaction
from app.modules.finance.infrastructure.repositories import FinanceRepository
from app.shared.exceptions import AppException


def _normalize_loan_type(loan) -> str:
    raw = getattr(loan, "loan_type", LoanType.PAYABLE.value) or LoanType.PAYABLE.value
    if isinstance(raw, LoanType):
        return raw.value
    return str(raw).strip().lower()


class TransactionLinkService:
    def __init__(self, repository: FinanceRepository):
        self.repository = repository

    def validate_links(
        self,
        *,
        movement_type: MovementType,
        savings_goal_id: int | None,
        loan_record_id: int | None,
    ) -> None:
        if savings_goal_id and loan_record_id:
            raise AppException(
                "Una transacción no puede vincularse a ahorro y crédito a la vez",
                status_code=400,
            )
        if savings_goal_id:
            if movement_type != MovementType.EGRESO:
                raise AppException(
                    "Solo egresos pueden vincularse a metas de ahorro",
                    status_code=400,
                )
            if not self.repository.get_savings_goal(savings_goal_id):
                raise AppException("Meta de ahorro no encontrada", status_code=404)

        if loan_record_id:
            loan = self.repository.get_loan_record(loan_record_id)
            if loan is None:
                raise AppException("Crédito no encontrado", status_code=404)
            loan_type = _normalize_loan_type(loan)
            if loan_type == LoanType.PAYABLE.value:
                if movement_type != MovementType.EGRESO:
                    raise AppException(
                        "Las deudas que debes solo se pagan con egresos",
                        status_code=400,
                    )
            elif loan_type == LoanType.RECEIVABLE.value:
                if movement_type not in {MovementType.INGRESO, MovementType.EGRESO}:
                    raise AppException(
                        "Las cobranzas usan ingresos; los desembolsos, egresos",
                        status_code=400,
                    )
            else:
                raise AppException("Tipo de crédito inválido", status_code=400)

    def _loan_outstanding_delta(self, loan, movement_type: MovementType, amount: Decimal) -> Decimal:
        loan_type = _normalize_loan_type(loan)
        if loan_type == LoanType.PAYABLE.value:
            return -amount
        if movement_type == MovementType.INGRESO:
            return -amount
        return amount

    def apply_links(self, transaction: Transaction) -> None:
        amount = Decimal(str(transaction.amount))
        if transaction.loan_record_id:
            loan = self.repository.get_loan_record(transaction.loan_record_id)
            if loan is None:
                raise AppException("Crédito no encontrado", status_code=404)
            delta = self._loan_outstanding_delta(loan, transaction.movement_type, amount)
            self.repository.adjust_loan_outstanding(transaction.loan_record_id, delta)
            loan = self.repository.get_loan_record(transaction.loan_record_id)
            if loan and Decimal(str(loan.outstanding_amount)) <= 0:
                loan.status = "paid"
                self.repository.commit_entity(loan)
        if transaction.savings_goal_id:
            self.repository.adjust_savings_goal_amount(transaction.savings_goal_id, amount)

    def reverse_links(self, transaction: Transaction) -> None:
        amount = Decimal(str(transaction.amount))
        if transaction.loan_record_id:
            loan = self.repository.get_loan_record(transaction.loan_record_id)
            if loan is None:
                return
            delta = self._loan_outstanding_delta(loan, transaction.movement_type, amount)
            self.repository.adjust_loan_outstanding(transaction.loan_record_id, -delta)
            loan = self.repository.get_loan_record(transaction.loan_record_id)
            if loan and loan.status == "paid":
                loan.status = "active"
                self.repository.commit_entity(loan)
        if transaction.savings_goal_id:
            self.repository.adjust_savings_goal_amount(transaction.savings_goal_id, -amount)
