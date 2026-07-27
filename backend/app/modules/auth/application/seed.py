from app.core.config import settings
from app.core.database import SessionLocal
from app.core.security import hash_password
from app.modules.auth.domain.models import User
from app.modules.auth.infrastructure.repositories import AuthRepository

PERMISSIONS = [
    ("users:read", "Ver usuarios"),
    ("users:write", "Gestionar usuarios"),
    ("roles:read", "Ver roles y permisos"),
    ("roles:write", "Editar permisos de roles"),
    ("finance:read", "Ver módulo financiero"),
    ("finance:write", "Gestionar operaciones financieras"),
    ("integrations:read", "Ver módulo de integraciones"),
    ("integrations:write", "Gestionar configuración de integraciones"),
    ("integrations:gmail_connect", "Vincular y desvincular correo Gmail"),
]

ROLES = {
    "admin": {
        "name": "Administrador",
        "description": "Acceso total al sistema",
        "permissions": [code for code, _ in PERMISSIONS],
    },
    "operator": {
        "name": "Operador",
        "description": "Operaciones financieras y vinculación de correo Gmail",
        "permissions": [
            "finance:read",
            "finance:write",
            "integrations:read",
            "integrations:gmail_connect",
        ],
    },
    "reader": {
        "name": "Lector",
        "description": "Solo lectura del módulo financiero",
        "permissions": [
            "finance:read",
        ],
    },
    "member": {
        "name": "Usuario",
        "description": "Auto-registro Google: finanzas completas e integraciones básicas",
        "permissions": [
            "finance:read",
            "finance:write",
            "integrations:read",
            "integrations:gmail_connect",
        ],
    },
}


def seed_auth_data() -> None:
    """Seed estructural de auth.

    - Siempre upsert de permisos catalogados.
    - Roles nuevos: se crean con la matriz default.
    - Roles existentes (operator/reader/member/custom): solo actualiza nombre/descripción.
      No pisa permisos personalizados desde la UI.
    - Admin existente: agrega permisos faltantes del catálogo (nunca se queda sin acceso).
    """
    db = SessionLocal()
    try:
        repository = AuthRepository(db)

        for code, description in PERMISSIONS:
            repository.upsert_permission(code, description)

        repository.commit()

        all_permission_codes = [code for code, _ in PERMISSIONS]

        for slug, data in ROLES.items():
            role, created = repository.ensure_role(
                slug,
                data["name"],
                data["description"],
                data["permissions"],
            )
            if created:
                continue

            if slug == "admin":
                # Solo agrega permisos nuevos del catálogo; no quita custom extras.
                repository.add_permissions_to_role(role, all_permission_codes)

        repository.commit()

        admin = repository.get_user_by_username(settings.admin_username)
        if admin is None:
            admin_role = repository.get_role_by_slug("admin")
            if admin_role is None:
                raise RuntimeError("Rol admin no encontrado durante el seed")

            admin = User(
                email=settings.admin_email,
                username=settings.admin_username,
                hashed_password=hash_password(settings.admin_password),
                full_name=settings.admin_full_name,
                roles=[admin_role],
            )
            db.add(admin)
            db.commit()
    finally:
        db.close()
