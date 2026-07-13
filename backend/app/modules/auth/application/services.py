from app.core.security import create_access_token, generate_secure_password, verify_password
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
        role_slug: str,
    ) -> User:
        if self.repository.get_user_by_username(username):
            raise AppException("El nombre de usuario ya existe", status_code=409)

        try:
            return self.repository.create_user(
                email=email,
                username=username,
                password=password,
                full_name=full_name,
                role_slug=role_slug,
            )
        except ValueError as exc:
            raise AppException(str(exc), status_code=400) from exc

    def update_user(
        self,
        *,
        user_id: int,
        full_name: str | None = None,
        is_active: bool | None = None,
        role_slug: str | None = None,
    ) -> User:
        user = self.repository.get_user_by_id(user_id)
        if user is None:
            raise AppException("Usuario no encontrado", status_code=404)

        try:
            return self.repository.update_user(
                user,
                full_name=full_name,
                is_active=is_active,
                role_slug=role_slug,
            )
        except ValueError as exc:
            raise AppException(str(exc), status_code=400) from exc

    def update_user_password(
        self,
        *,
        user_id: int,
        password: str | None = None,
        auto_generate: bool = False,
    ) -> str:
        user = self.repository.get_user_by_id(user_id)
        if user is None:
            raise AppException("Usuario no encontrado", status_code=404)

        if auto_generate:
            plain_password = generate_secure_password()
        elif password:
            plain_password = password
        else:
            raise AppException("Indica una contraseña o activa autogeneración", status_code=400)

        self.repository.update_password(user, plain_password)
        return plain_password

    def delete_user(self, *, user_id: int, current_user_id: int) -> None:
        if user_id == current_user_id:
            raise AppException("No puedes eliminar tu propio usuario", status_code=400)

        user = self.repository.get_user_by_id(user_id)
        if user is None:
            raise AppException("Usuario no encontrado", status_code=404)

        self.repository.delete_user(user)

    def update_role_permissions(self, *, role_id: int, permission_codes: list[str]):
        role = self.repository.get_role_by_id(role_id)
        if role is None:
            raise AppException("Rol no encontrado", status_code=404)

        try:
            return self.repository.update_role_permissions(role, permission_codes)
        except ValueError as exc:
            raise AppException(str(exc), status_code=400) from exc
