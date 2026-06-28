from pydantic import BaseModel, Field


class CatalogItemResponse(BaseModel):
    id: int
    name: str
    is_active: bool
    sort_order: int


class CatalogItemCreate(BaseModel):
    name: str = Field(min_length=1, max_length=100)


class CatalogItemUpdate(BaseModel):
    name: str | None = Field(default=None, min_length=1, max_length=100)
    is_active: bool | None = None
    sort_order: int | None = None
