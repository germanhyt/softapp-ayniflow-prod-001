from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session

from app.core.database import get_db
from app.modules.auth.application.services import AuthService
from app.modules.auth.domain.models import User
from app.modules.auth.infrastructure.repositories import AuthRepository
from app.modules.auth.presentation.deps import (
    get_auth_service,
    get_current_user,
    require_permission,
    serialize_user,
)
from app.modules.auth.presentation.schemas import (
    CreateUserRequest,
    LoginRequest,
    RoleResponse,
    TokenResponse,
    UserResponse,
)

router = APIRouter(prefix="/auth", tags=["auth"])


@router.post("/login", response_model=TokenResponse)
def login(payload: LoginRequest, service: AuthService = Depends(get_auth_service)):
    token, _user = service.login(payload.username, payload.password)
    return TokenResponse(access_token=token)


@router.get("/me", response_model=UserResponse)
def me(current_user: User = Depends(get_current_user)):
    return serialize_user(current_user)


users_router = APIRouter(prefix="/users", tags=["users"])


@users_router.get("", response_model=list[UserResponse])
def list_users(
    _: User = Depends(require_permission("users:read")),
    db: Session = Depends(get_db),
):
    repository = AuthRepository(db)
    return [serialize_user(user) for user in repository.list_users()]


@users_router.post("", response_model=UserResponse, status_code=201)
def create_user(
    payload: CreateUserRequest,
    _: User = Depends(require_permission("users:write")),
    service: AuthService = Depends(get_auth_service),
    db: Session = Depends(get_db),
):
    user = service.create_user(
        email=payload.email,
        username=payload.username,
        password=payload.password,
        full_name=payload.full_name,
        role_slugs=payload.role_slugs,
    )
    repository = AuthRepository(db)
    created = repository.get_user_by_id(user.id)
    return serialize_user(created)


roles_router = APIRouter(prefix="/roles", tags=["roles"])


@roles_router.get("", response_model=list[RoleResponse])
def list_roles(
    _: User = Depends(require_permission("roles:read")),
    db: Session = Depends(get_db),
):
    repository = AuthRepository(db)
    return repository.list_roles()
