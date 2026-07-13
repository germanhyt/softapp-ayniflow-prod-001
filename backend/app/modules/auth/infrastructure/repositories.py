from sqlalchemy.orm import Session, joinedload

from app.core.security import hash_password
from app.modules.auth.domain.models import Permission, Role, User, user_roles


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
        role_slug: str,
    ) -> User:
        role = self.db.query(Role).filter(Role.slug == role_slug).first()
        if role is None:
            raise ValueError("El rol indicado no existe")

        user = User(
            email=email,
            username=username,
            hashed_password=hash_password(password),
            full_name=full_name,
            roles=[role],
        )
        self.db.add(user)
        self.db.commit()
        self.db.refresh(user)
        return user

    def update_user(
        self,
        user: User,
        *,
        full_name: str | None = None,
        is_active: bool | None = None,
        role_slug: str | None = None,
    ) -> User:
        if full_name is not None:
            user.full_name = full_name
        if is_active is not None:
            user.is_active = is_active
        if role_slug is not None:
            role = self.db.query(Role).filter(Role.slug == role_slug).first()
            if role is None:
                raise ValueError("El rol indicado no existe")
            user.roles = [role]
        self.db.commit()
        self.db.refresh(user)
        return user

    def update_password(self, user: User, password: str) -> User:
        user.hashed_password = hash_password(password)
        self.db.commit()
        self.db.refresh(user)
        return user

    def delete_user(self, user: User) -> None:
        from app.modules.finance.domain.models import (
            Budget,
            FinanceGmailCredential,
            FinanceNotification,
            LoanRecord,
            SavingsGoal,
            Transaction,
        )

        user_id = user.id
        for model in (
            Transaction,
            FinanceNotification,
            Budget,
            SavingsGoal,
            LoanRecord,
        ):
            self.db.query(model).filter(model.workspace_id == user_id).delete(
                synchronize_session=False
            )
        self.db.query(FinanceGmailCredential).filter(
            FinanceGmailCredential.workspace_id == user_id
        ).delete(synchronize_session=False)
        user.roles.clear()
        self.db.delete(user)
        self.db.commit()

    def upsert_permission(self, code: str, description: str) -> Permission:
        permission = self.db.query(Permission).filter(Permission.code == code).first()
        if permission:
            permission.description = description
            return permission

        permission = Permission(code=code, description=description)
        self.db.add(permission)
        return permission

    def upsert_role(self, slug: str, name: str, description: str, permission_codes: list[str]) -> Role:
        role, _created = self.ensure_role(slug, name, description, permission_codes)
        if not _created:
            self.sync_role_permissions(role, permission_codes)
        return role

    def ensure_role(
        self,
        slug: str,
        name: str,
        description: str,
        permission_codes: list[str],
    ) -> tuple[Role, bool]:
        """Crea el rol con permisos por defecto, o actualiza solo nombre/descripción si ya existe."""
        role = self.db.query(Role).filter(Role.slug == slug).first()
        if role is None:
            permissions = (
                self.db.query(Permission).filter(Permission.code.in_(permission_codes)).all()
                if permission_codes
                else []
            )
            role = Role(slug=slug, name=name, description=description, permissions=permissions)
            self.db.add(role)
            self.db.flush()
            return role, True

        role.name = name
        role.description = description
        return role, False

    def sync_role_permissions(self, role: Role, permission_codes: list[str]) -> Role:
        permissions = (
            self.db.query(Permission).filter(Permission.code.in_(permission_codes)).all()
            if permission_codes
            else []
        )
        role.permissions = permissions
        return role

    def add_permissions_to_role(self, role: Role, permission_codes: list[str]) -> Role:
        if not permission_codes:
            return role
        existing = {permission.code for permission in role.permissions}
        missing_codes = [code for code in permission_codes if code not in existing]
        if not missing_codes:
            return role
        to_add = self.db.query(Permission).filter(Permission.code.in_(missing_codes)).all()
        if to_add:
            role.permissions = [*list(role.permissions), *to_add]
        return role

    def get_role_by_id(self, role_id: int) -> Role | None:
        return (
            self.db.query(Role)
            .options(joinedload(Role.permissions))
            .filter(Role.id == role_id)
            .first()
        )

    def update_role_permissions(self, role: Role, permission_codes: list[str]) -> Role:
        unique_codes = sorted(set(permission_codes))
        if unique_codes:
            permissions = (
                self.db.query(Permission).filter(Permission.code.in_(unique_codes)).all()
            )
            found = {permission.code for permission in permissions}
            missing = [code for code in unique_codes if code not in found]
            if missing:
                raise ValueError(f"Permisos inexistentes: {', '.join(missing)}")
        else:
            permissions = []

        role.permissions = permissions
        self.db.commit()
        self.db.refresh(role)
        return role

    def commit(self) -> None:
        self.db.commit()
