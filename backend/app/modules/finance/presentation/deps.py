from fastapi import Depends
from sqlalchemy.orm import Session

from app.core.database import get_db
from app.modules.auth.domain.models import User
from app.modules.auth.presentation.deps import get_current_user
from app.modules.finance.application.services import FinanceService
from app.modules.finance.infrastructure.repositories import FinanceRepository


def get_finance_repository(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
) -> FinanceRepository:
    return FinanceRepository(db, workspace_id=current_user.id)


def get_finance_service(
    repository: FinanceRepository = Depends(get_finance_repository),
) -> FinanceService:
    return FinanceService(repository)
