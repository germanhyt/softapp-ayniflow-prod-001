from sqlalchemy.orm import Session, joinedload

from app.core.security import hash_password
from app.modules.auth.domain.models import Permission, Role, User


class AuthRepository:
    def __init__(self, db: Session):
        self.db = db

    def get_user_by_username(self, username: str) -> User | None:
        return (
            self.db.query(User)
            .options(joinedload(User.roles).joinedload(Role.permissions))
            .filter(User.username == username)
            .first()
        )

    def get_user_by_id(self, user_id: int) -> User | None:
        return (
            self.db.query(User)
            .options(joinedload(User.roles).joinedload(Role.permissions))
            .filter(User.id == user_id)
            .first()
        )

    def list_users(self) -> list[User]:
        return (
            self.db.query(User)
            .options(joinedload(User.roles))
            .order_by(User.id.asc())
            .all()
        )

    def get_role_by_slug(self, slug: str) -> Role | None:
        return self.db.query(Role).filter(Role.slug == slug).first()

    def list_roles(self) -> list[Role]:
        return (
            self.db.query(Role)
            .options(joinedload(Role.permissions))
            .order_by(Role.id.asc())
            .all()
        )

    def list_permissions(self) -> list[Permission]:
        return self.db.query(Permission).order_by(Permission.code.asc()).all()

    def create_user(
        self,
        *,
        email: str,
        username: str,
        password: str,
        full_name: str | None,
        role_slugs: list[str],
    ) -> User:
        roles = self.db.query(Role).filter(Role.slug.in_(role_slugs)).all()
        if len(roles) != len(set(role_slugs)):
            raise ValueError("Uno o más roles no existen")

        user = User(
            email=email,
            username=username,
            hashed_password=hash_password(password),
            full_name=full_name,
            roles=roles,
        )
        self.db.add(user)
        self.db.commit()
        self.db.refresh(user)
        return user

    def upsert_permission(self, code: str, description: str) -> Permission:
        permission = self.db.query(Permission).filter(Permission.code == code).first()
        if permission:
            permission.description = description
            return permission

        permission = Permission(code=code, description=description)
        self.db.add(permission)
        return permission

    def upsert_role(self, slug: str, name: str, description: str, permission_codes: list[str]) -> Role:
        role = self.db.query(Role).filter(Role.slug == slug).first()
        permissions = self.db.query(Permission).filter(Permission.code.in_(permission_codes)).all()

        if role is None:
            role = Role(slug=slug, name=name, description=description, permissions=permissions)
            self.db.add(role)
            return role

        role.name = name
        role.description = description
        role.permissions = permissions
        return role

    def commit(self) -> None:
        self.db.commit()
