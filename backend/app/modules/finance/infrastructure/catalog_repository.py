from sqlalchemy.orm import Session

from app.modules.finance.domain.models import FinanceBank, FinanceCategory, FinancePaymentType
from app.shared.exceptions import AppException


class CatalogRepository:
    def __init__(self, db: Session):
        self.db = db

    def list_banks(self, *, active_only: bool = True) -> list[FinanceBank]:
        query = self.db.query(FinanceBank)
        if active_only:
            query = query.filter(FinanceBank.is_active.is_(True))
        return query.order_by(FinanceBank.sort_order.asc(), FinanceBank.name.asc()).all()

    def list_payment_types(self, *, active_only: bool = True) -> list[FinancePaymentType]:
        query = self.db.query(FinancePaymentType)
        if active_only:
            query = query.filter(FinancePaymentType.is_active.is_(True))
        return query.order_by(FinancePaymentType.sort_order.asc(), FinancePaymentType.name.asc()).all()

    def list_categories(self, *, active_only: bool = True) -> list[FinanceCategory]:
        query = self.db.query(FinanceCategory)
        if active_only:
            query = query.filter(FinanceCategory.is_active.is_(True))
        return query.order_by(FinanceCategory.sort_order.asc(), FinanceCategory.name.asc()).all()

    def get_bank(self, item_id: int) -> FinanceBank | None:
        return self.db.query(FinanceBank).filter(FinanceBank.id == item_id).first()

    def get_payment_type(self, item_id: int) -> FinancePaymentType | None:
        return self.db.query(FinancePaymentType).filter(FinancePaymentType.id == item_id).first()

    def get_category(self, item_id: int) -> FinanceCategory | None:
        return self.db.query(FinanceCategory).filter(FinanceCategory.id == item_id).first()

    def create_bank(self, name: str) -> FinanceBank:
        return self._create(FinanceBank, name)

    def create_payment_type(self, name: str) -> FinancePaymentType:
        return self._create(FinancePaymentType, name)

    def create_category(self, name: str) -> FinanceCategory:
        return self._create(FinanceCategory, name)

    def update_bank(self, item: FinanceBank, data: dict) -> FinanceBank:
        return self._update(item, data)

    def update_payment_type(self, item: FinancePaymentType, data: dict) -> FinancePaymentType:
        return self._update(item, data)

    def update_category(self, item: FinanceCategory, data: dict) -> FinanceCategory:
        return self._update(item, data)

    def delete_bank(self, item: FinanceBank) -> None:
        self._delete(item)

    def delete_payment_type(self, item: FinancePaymentType) -> None:
        self._delete(item)

    def delete_category(self, item: FinanceCategory) -> None:
        self._delete(item)

    def _create(self, model, name: str):
        normalized = name.strip()
        if not normalized:
            raise AppException("El nombre es obligatorio", status_code=400)
        exists = self.db.query(model).filter(model.name == normalized).first()
        if exists:
            raise AppException("Ya existe un registro con ese nombre", status_code=409)
        last = self.db.query(model).order_by(model.sort_order.desc()).first()
        next_order = (last.sort_order + 1) if last else 0
        item = model(name=normalized, sort_order=next_order, is_active=True)
        self.db.add(item)
        self.db.commit()
        self.db.refresh(item)
        return item

    def _update(self, item, data: dict):
        if "name" in data and data["name"] is not None:
            normalized = data["name"].strip()
            if not normalized:
                raise AppException("El nombre es obligatorio", status_code=400)
            data["name"] = normalized
        for key, value in data.items():
            setattr(item, key, value)
        self.db.commit()
        self.db.refresh(item)
        return item

    def _delete(self, item) -> None:
        self.db.delete(item)
        self.db.commit()
