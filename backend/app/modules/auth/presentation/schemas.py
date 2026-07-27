from datetime import datetime

from pydantic import BaseModel, EmailStr, Field, model_validator


class LoginRequest(BaseModel):
    username: str = Field(min_length=3, max_length=100)
    password: str = Field(min_length=6, max_length=128)


class TokenResponse(BaseModel):
    access_token: str
    token_type: str = "bearer"


class GoogleAuthStatusResponse(BaseModel):
    configured: bool
    redirect_uri: str


class GoogleOAuthStartResponse(BaseModel):
    authorization_url: str


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
    role_slug: str = Field(min_length=2, max_length=50)


class UpdateUserRequest(BaseModel):
    full_name: str | None = Field(default=None, max_length=255)
    role_slug: str | None = Field(default=None, min_length=2, max_length=50)
    is_active: bool | None = None


class UpdateUserPasswordRequest(BaseModel):
    password: str | None = Field(default=None, min_length=8, max_length=128)
    auto_generate: bool = False

    @model_validator(mode="after")
    def validate_password_source(self):
        if self.auto_generate and self.password:
            raise ValueError("No envíes contraseña si activas autogeneración")
        if not self.auto_generate and not self.password:
            raise ValueError("Indica una contraseña o activa autogeneración")
        return self


class UpdateUserPasswordResponse(BaseModel):
    message: str
    password: str


class UpdateRolePermissionsRequest(BaseModel):
    permission_codes: list[str] = Field(default_factory=list)
