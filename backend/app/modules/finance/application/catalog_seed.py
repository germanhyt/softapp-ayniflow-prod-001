from app.core.database import SessionLocal
from app.modules.finance.domain.models import FinanceBank, FinanceCategory, FinancePaymentType

DEFAULT_BANKS = [
    "BCP",
    "BBVA",
    "INTERBANK",
    "SCOTIABANK",
    "YAPE",
    "PLIN",
    "EFECTIVO",
    "OTROS",
]

DEFAULT_PAYMENT_TYPES = [
    "PAGO QR",
    "YAPEO CELULAR",
    "PAGO SERVICIO",
    "TRANSFERENCIA",
    "EFECTIVO",
    "COMPRA",
    "VENTA",
    "OTROS",
]

DEFAULT_CATEGORIES = [
    "Vivienda",
    "Alimentación",
    "Transporte",
    "Salud",
    "Servicios",
    "Entretenimiento",
    "Educación",
    "Personal",
    "Otros",
]


def seed_finance_catalogs() -> None:
    db = SessionLocal()
    try:
        if db.query(FinanceBank.id).first():
            return

        db.add_all(
            FinanceBank(name=name, sort_order=index, is_active=True)
            for index, name in enumerate(DEFAULT_BANKS)
        )
        db.add_all(
            FinancePaymentType(name=name, sort_order=index, is_active=True)
            for index, name in enumerate(DEFAULT_PAYMENT_TYPES)
        )
        db.add_all(
            FinanceCategory(name=name, sort_order=index, is_active=True)
            for index, name in enumerate(DEFAULT_CATEGORIES)
        )
        db.commit()
    finally:
        db.close()
