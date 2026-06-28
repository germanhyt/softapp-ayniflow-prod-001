from collections.abc import Callable

from fastapi import Depends, HTTPException, status
from fastapi.security import HTTPAuthorizationCredentials, HTTPBearer
from sqlalchemy.orm import Session

from app.core.database import get_db
from app.core.security import decode_access_token
from app.modules.auth.application.services import AuthService, collect_permissions, collect_role_slugs
from app.modules.auth.domain.models import User
from app.modules.auth.infrastructure.repositories import AuthRepository
from app.modules.auth.presentation.schemas import UserResponse

security_scheme = HTTPBearer(auto_error=False)


def get_auth_repository(db: Session = Depends(get_db)) -> AuthRepository:
    return AuthRepository(db)


def get_auth_service(repository: AuthRepository = Depends(get_auth_repository)) -> AuthService:
    return AuthService(repository)


def get_current_user(
    credentials: HTTPAuthorizationCredentials | None = Depends(security_scheme),
    repository: AuthRepository = Depends(get_auth_repository),
) -> User:
    if credentials is None or credentials.scheme.lower() != "bearer":
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="No autenticado")

    try:
        payload = decode_access_token(credentials.credentials)
        user_id = int(payload["sub"])
    except (ValueError, KeyError) as exc:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Token inválido") from exc

    user = repository.get_user_by_id(user_id)
    if user is None or not user.is_active:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Usuario no disponible")
    return user


def serialize_user(user: User) -> UserResponse:
    return UserResponse(
        id=user.id,
        email=user.email,
        username=user.username,
        full_name=user.full_name,
        is_active=user.is_active,
        roles=user.roles,
        permissions=sorted(collect_permissions(user)),
        created_at=user.created_at,
    )


def require_permission(permission_code: str) -> Callable:
    def dependency(current_user: User = Depends(get_current_user)) -> User:
        permissions = collect_permissions(current_user)
        if permission_code not in permissions:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail=f"Permiso requerido: {permission_code}",
            )
        return current_user

    return dependency


def require_any_role(*role_slugs: str) -> Callable:
    def dependency(current_user: User = Depends(get_current_user)) -> User:
        user_roles = set(collect_role_slugs(current_user))
        if not user_roles.intersection(role_slugs):
            raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Rol no autorizado")
        return current_user

    return dependency
