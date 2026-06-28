from fastapi import APIRouter, Depends, Query
from sqlalchemy.orm import Session

from app.core.database import get_db
from app.modules.auth.domain.models import User
from app.modules.auth.presentation.deps import require_permission
from app.modules.finance.infrastructure.catalog_repository import CatalogRepository
from app.modules.finance.presentation.catalog_schemas import (
    CatalogItemCreate,
    CatalogItemResponse,
    CatalogItemUpdate,
)
from app.shared.exceptions import AppException

router = APIRouter(prefix="/finance/catalog", tags=["finance-catalog"])


def get_catalog_repository(db: Session = Depends(get_db)) -> CatalogRepository:
    return CatalogRepository(db)


def serialize_item(item) -> CatalogItemResponse:
    return CatalogItemResponse(
        id=item.id,
        name=item.name,
        is_active=item.is_active,
        sort_order=item.sort_order,
    )


def ensure_item(item, label: str):
    if not item:
        raise AppException(f"{label} no encontrado", status_code=404)
    return item


@router.get("/banks", response_model=list[CatalogItemResponse])
def list_banks(
    active_only: bool = Query(default=True),
    _: User = Depends(require_permission("finance:read")),
    repository: CatalogRepository = Depends(get_catalog_repository),
):
    return [serialize_item(item) for item in repository.list_banks(active_only=active_only)]


@router.post("/banks", response_model=CatalogItemResponse, status_code=201)
def create_bank(
    payload: CatalogItemCreate,
    _: User = Depends(require_permission("finance:write")),
    repository: CatalogRepository = Depends(get_catalog_repository),
):
    return serialize_item(repository.create_bank(payload.name))


@router.put("/banks/{item_id}", response_model=CatalogItemResponse)
def update_bank(
    item_id: int,
    payload: CatalogItemUpdate,
    _: User = Depends(require_permission("finance:write")),
    repository: CatalogRepository = Depends(get_catalog_repository),
):
    item = ensure_item(repository.get_bank(item_id), "Banco")
    updated = repository.update_bank(item, payload.model_dump(exclude_unset=True))
    return serialize_item(updated)


@router.delete("/banks/{item_id}", status_code=204)
def delete_bank(
    item_id: int,
    _: User = Depends(require_permission("finance:write")),
    repository: CatalogRepository = Depends(get_catalog_repository),
):
    item = ensure_item(repository.get_bank(item_id), "Banco")
    repository.delete_bank(item)


@router.get("/payment-types", response_model=list[CatalogItemResponse])
def list_payment_types(
    active_only: bool = Query(default=True),
    _: User = Depends(require_permission("finance:read")),
    repository: CatalogRepository = Depends(get_catalog_repository),
):
    return [serialize_item(item) for item in repository.list_payment_types(active_only=active_only)]


@router.post("/payment-types", response_model=CatalogItemResponse, status_code=201)
def create_payment_type(
    payload: CatalogItemCreate,
    _: User = Depends(require_permission("finance:write")),
    repository: CatalogRepository = Depends(get_catalog_repository),
):
    return serialize_item(repository.create_payment_type(payload.name))


@router.put("/payment-types/{item_id}", response_model=CatalogItemResponse)
def update_payment_type(
    item_id: int,
    payload: CatalogItemUpdate,
    _: User = Depends(require_permission("finance:write")),
    repository: CatalogRepository = Depends(get_catalog_repository),
):
    item = ensure_item(repository.get_payment_type(item_id), "Tipo de pago")
    updated = repository.update_payment_type(item, payload.model_dump(exclude_unset=True))
    return serialize_item(updated)


@router.delete("/payment-types/{item_id}", status_code=204)
def delete_payment_type(
    item_id: int,
    _: User = Depends(require_permission("finance:write")),
    repository: CatalogRepository = Depends(get_catalog_repository),
):
    item = ensure_item(repository.get_payment_type(item_id), "Tipo de pago")
    repository.delete_payment_type(item)


@router.get("/categories", response_model=list[CatalogItemResponse])
def list_categories(
    active_only: bool = Query(default=True),
    _: User = Depends(require_permission("finance:read")),
    repository: CatalogRepository = Depends(get_catalog_repository),
):
    return [serialize_item(item) for item in repository.list_categories(active_only=active_only)]


@router.post("/categories", response_model=CatalogItemResponse, status_code=201)
def create_category(
    payload: CatalogItemCreate,
    _: User = Depends(require_permission("finance:write")),
    repository: CatalogRepository = Depends(get_catalog_repository),
):
    return serialize_item(repository.create_category(payload.name))


@router.put("/categories/{item_id}", response_model=CatalogItemResponse)
def update_category(
    item_id: int,
    payload: CatalogItemUpdate,
    _: User = Depends(require_permission("finance:write")),
    repository: CatalogRepository = Depends(get_catalog_repository),
):
    item = ensure_item(repository.get_category(item_id), "Categoría")
    updated = repository.update_category(item, payload.model_dump(exclude_unset=True))
    return serialize_item(updated)


@router.delete("/categories/{item_id}", status_code=204)
def delete_category(
    item_id: int,
    _: User = Depends(require_permission("finance:write")),
    repository: CatalogRepository = Depends(get_catalog_repository),
):
    item = ensure_item(repository.get_category(item_id), "Categoría")
    repository.delete_category(item)
