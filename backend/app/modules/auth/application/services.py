from app.core.config import settings
from app.core.security import create_access_token, generate_secure_password, hash_password, verify_password
from app.modules.auth.application.avatar_service import AvatarService, delete_avatar_file
from app.modules.auth.application.google_oauth_service import GoogleUserProfile, sanitize_username_base
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

    def login_with_google(self, profile: GoogleUserProfile) -> tuple[str, User]:
        if not profile.email_verified:
            raise AppException("El email de Google no está verificado", status_code=403)

        user = self.repository.get_user_by_google_sub(profile.sub)
        if user is None:
            user = self.repository.get_user_by_email(profile.email)
            if user is not None:
                if user.google_sub and user.google_sub != profile.sub:
                    raise AppException(
                        "Este email ya está vinculado a otra cuenta de Google",
                        status_code=409,
                    )
                user = self.repository.link_google_sub(user, profile.sub, profile.name)
            elif settings.google_auth_auto_register:
                user = self._register_google_user(profile)
            else:
                raise AppException(
                    "No existe una cuenta con este email. Contacta al administrador.",
                    status_code=403,
                )

        if user is None:
            raise AppException("No se pudo autenticar con Google", status_code=500)

        if not user.is_active:
            raise AppException("Usuario inactivo", status_code=403)

        token = create_access_token(
            subject=str(user.id),
            extra={"username": user.username, "roles": collect_role_slugs(user)},
        )
        return token, user

    def _register_google_user(self, profile: GoogleUserProfile) -> User:
        email_local = profile.email.split("@", 1)[0]
        base_username = sanitize_username_base(email_local)
        username = base_username
        suffix = 1
        while self.repository.username_exists(username):
            username = f"{base_username}{suffix}"
            suffix += 1

        password = generate_secure_password()
        try:
            created = self.repository.create_user(
                email=profile.email,
                username=username,
                password=password,
                full_name=profile.name,
                role_slug=settings.google_auth_default_role_slug,
                google_sub=profile.sub,
            )
        except ValueError as exc:
            raise AppException(str(exc), status_code=400) from exc

        reloaded = self.repository.get_user_by_id(created.id)
        if reloaded is None:
            raise AppException("No se pudo crear el usuario", status_code=500)
        return reloaded

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
        if self.repository.get_user_by_email(email):
            raise AppException("El email ya está registrado", status_code=409)

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

    def update_profile(self, *, user: User, full_name: str | None) -> User:
        try:
            return self.repository.update_user(user, full_name=full_name)
        except ValueError as exc:
            raise AppException(str(exc), status_code=400) from exc

    def change_own_password(
        self,
        *,
        user: User,
        current_password: str,
        new_password: str,
    ) -> None:
        if user.google_sub:
            raise AppException(
                "Tu cuenta usa Google Sign-In. Cambia la contraseña desde tu cuenta de Google.",
                status_code=400,
            )

        if not verify_password(current_password, user.hashed_password):
            raise AppException("Contraseña actual incorrecta", status_code=400)

        if current_password == new_password:
            raise AppException("La nueva contraseña debe ser distinta a la actual", status_code=400)

        self.repository.update_password(user, new_password)

    async def upload_avatar(self, *, user: User, file) -> User:
        avatar_url = await AvatarService.save_user_avatar(user=user, file=file)
        return self.repository.update_avatar_url(user, avatar_url)

    def remove_avatar(self, *, user: User) -> User:
        delete_avatar_file(user.avatar_url)
        return self.repository.update_avatar_url(user, None)

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
