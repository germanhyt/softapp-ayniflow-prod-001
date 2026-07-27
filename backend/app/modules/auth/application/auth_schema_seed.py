from sqlalchemy import inspect, text

from app.core.database import engine


def ensure_auth_schema() -> None:
    inspector = inspect(engine)
    if "users" not in inspector.get_table_names():
        return

    columns = {col["name"] for col in inspector.get_columns("users")}
    if "google_sub" not in columns:
        with engine.begin() as conn:
            conn.execute(text("ALTER TABLE users ADD COLUMN google_sub VARCHAR(255) NULL"))

    indexes = {idx["name"] for idx in inspector.get_indexes("users")}
    if "ix_users_google_sub" not in indexes:
        with engine.begin() as conn:
            conn.execute(text("CREATE UNIQUE INDEX ix_users_google_sub ON users (google_sub)"))
