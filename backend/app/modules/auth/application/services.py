from app.core.security import create_access_token, verify_password
from app.modules.auth.domain.models import User
from app.modules.auth.infrastructure.repositories import AuthRepository
from app.shared.exceptions import AppException


def collect_permissions(user: User) -> set[str]:
    permissions: set[str] = set()
    for role in user.roles:
        for permission in role.permissions:
            permissions.add(permission.code)
    return permissions


def collect_role_slugs(user: User) -> list[str]:
    return [role.slug for role in user.roles]


class AuthService:
    def __init__(self, repository: AuthRepository):
        self.repository = repository

    def login(self, username: str, password: str) -> tuple[str, User]:
        user = self.repository.get_user_by_username(username)
        if user is None or not verify_password(password, user.hashed_password):
            raise AppException("Credenciales inválidas", status_code=401)
        if not user.is_active:
            raise AppException("Usuario inactivo", status_code=403)

        token = create_access_token(
            subject=str(user.id),
            extra={"username": user.username, "roles": collect_role_slugs(user)},
        )
        return token, user

    def create_user(
        self,
        *,
        email: str,
        username: str,
        password: str,
        full_name: str | None,
        role_slugs: list[str],
    ) -> User:
        if self.repository.get_user_by_username(username):
            raise AppException("El nombre de usuario ya existe", status_code=409)

        try:
            return self.repository.create_user(
                email=email,
                username=username,
                password=password,
                full_name=full_name,
                role_slugs=role_slugs,
            )
        except ValueError as exc:
            raise AppException(str(exc), status_code=400) from exc
