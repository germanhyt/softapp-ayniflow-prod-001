from datetime import datetime

from pydantic import BaseModel, EmailStr, Field


class LoginRequest(BaseModel):
    username: str = Field(min_length=3, max_length=100)
    password: str = Field(min_length=6, max_length=128)


class TokenResponse(BaseModel):
    access_token: str
    token_type: str = "bearer"


class PermissionResponse(BaseModel):
    id: int
    code: str
    description: str | None

    model_config = {"from_attributes": True}


class RoleResponse(BaseModel):
    id: int
    slug: str
    name: str
    description: str | None
    permissions: list[PermissionResponse] = []

    model_config = {"from_attributes": True}


class UserResponse(BaseModel):
    id: int
    email: str
    username: str
    full_name: str | None
    is_active: bool
    roles: list[RoleResponse]
    permissions: list[str]
    created_at: datetime | None = None

    model_config = {"from_attributes": True}


class CreateUserRequest(BaseModel):
    email: EmailStr
    username: str = Field(min_length=3, max_length=100)
    password: str = Field(min_length=8, max_length=128)
    full_name: str | None = Field(default=None, max_length=255)
    role_slugs: list[str] = Field(min_length=1)
