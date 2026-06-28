from app.core.config import settings
from app.core.database import SessionLocal
from app.core.security import hash_password
from app.modules.auth.domain.models import Permission, Role, User
from app.modules.auth.infrastructure.repositories import AuthRepository

PERMISSIONS = [
    ("users:read", "Ver usuarios"),
    ("users:write", "Gestionar usuarios"),
    ("roles:read", "Ver roles y permisos"),
    ("finance:read", "Ver módulo financiero"),
    ("finance:write", "Gestionar operaciones financieras"),
]

ROLES = {
    "admin": {
        "name": "Administrador",
        "description": "Acceso total al sistema",
        "permissions": [code for code, _ in PERMISSIONS],
    },
    "operator": {
        "name": "Operador",
        "description": "Operaciones financieras y consulta de usuarios",
        "permissions": ["users:read", "finance:read", "finance:write"],
    },
    "reader": {
        "name": "Lector",
        "description": "Solo lectura de información",
        "permissions": ["users:read", "finance:read"],
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
            repository.upsert_role(slug, data["name"], data["description"], data["permissions"])

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
