import json
from datetime import date, datetime, time
from decimal import Decimal
from typing import Any

from app.modules.finance.infrastructure.payment_type_mapper import normalize_payment_type
from app.modules.finance.domain.models import MovementType
from app.shared.exceptions import AppException


def _parse_date(value: str) -> date:
    value = value.strip()
    for fmt in ("%Y-%m-%d", "%d/%m/%Y", "%d-%m-%Y"):
        try:
            return datetime.strptime(value, fmt).date()
        except ValueError:
            continue
    raise AppException(f"Fecha inválida: {value}", status_code=400)


def _parse_time(value: str | None) -> time | None:
    if not value:
        return None
    value = value.strip()
    for fmt in ("%H:%M:%S", "%H:%M"):
        try:
            return datetime.strptime(value, fmt).time()
        except ValueError:
            continue
    return None


def _parse_movement(value: str | None) -> MovementType:
    if not value:
        return MovementType.EGRESO
    normalized = value.strip().lower()
    if normalized.startswith("ing"):
        return MovementType.INGRESO
    return MovementType.EGRESO


def _parse_amount(value: Any) -> Decimal:
    if isinstance(value, str):
        value = value.replace(",", ".")
    amount = Decimal(str(value))
    if amount <= 0:
        raise AppException("El monto debe ser mayor a cero", status_code=400)
    return amount


class LegacyFinanzasNegocioAdapter:
    """Adaptador para filas del proyecto finanzas-negocio (Google Sheets / JSON legacy)."""

    SHEET_HEADERS = [
        "Fecha",
        "Hora",
        "Movimiento",
        "Concepto",
        "Banco",
        "Tipo",
        "Destinatario",
        "Num_Operacion",
        "Monto",
        "Categoria",
    ]

    @classmethod
    def from_legacy_row(cls, row: dict[str, Any]) -> dict[str, Any]:
        return {
            "transaction_date": _parse_date(str(row.get("Fecha") or row.get("fecha"))),
            "transaction_time": _parse_time(row.get("Hora") or row.get("hora")),
            "movement_type": _parse_movement(row.get("Movimiento") or row.get("movimiento")),
            "concept": str(row.get("Concepto") or row.get("concepto") or "Sin concepto"),
            "bank": str(row.get("Banco") or row.get("banco") or "General"),
            "payment_type": normalize_payment_type(str(row.get("Tipo") or row.get("tipo") or "Transferencia")),
            "recipient": row.get("Destinatario") or row.get("destinatario"),
            "operation_number": row.get("Num_Operacion") or row.get("num_operacion"),
            "amount": _parse_amount(row.get("Monto") if row.get("Monto") is not None else row.get("monto")),
            "category": row.get("Categoria") or row.get("categoria"),
            "notes": "Importado desde finanzas-negocio",
        }

    @classmethod
    def from_webhook_payload(cls, payload: dict[str, Any]) -> dict[str, Any]:
        if not payload.get("num_operacion") or payload.get("monto") is None:
            raise AppException("Payload inválido: num_operacion y monto son requeridos", status_code=400)
        return cls.from_legacy_row(payload)

    @classmethod
    def from_sheet_rows(cls, rows: list[list[Any]]) -> list[dict[str, Any]]:
        if not rows:
            return []

        header = [str(cell).strip() for cell in rows[0]]
        mapped: list[dict[str, Any]] = []

        for row in rows[1:]:
            if not any(row):
                continue
            record = {header[i]: row[i] if i < len(row) else None for i in range(len(header))}
            mapped.append(cls.from_legacy_row(record))

        return mapped
