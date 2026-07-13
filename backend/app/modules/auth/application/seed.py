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

# Roles de sistema: sus permisos se re-sincronizan al arrancar con estos defaults.
# Si personalizas un rol desde la UI y reinicias el backend, volverá a esta matriz.
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
}


def seed_auth_data() -> None:
    db = SessionLocal()
    try:
        repository = AuthRepository(db)

        for code, description in PERMISSIONS:
            repository.upsert_permission(code, description)

        repository.commit()

        for slug, data in ROLES.items():
            role, _created = repository.ensure_role(
                slug,
                data["name"],
                data["description"],
                data["permissions"],
            )
            # Matriz canónica de roles de sistema (admin / operator / reader).
            repository.sync_role_permissions(role, data["permissions"])

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
