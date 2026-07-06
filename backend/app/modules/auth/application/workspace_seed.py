from sqlalchemy import inspect, text

from app.core.database import engine


WORKSPACE_SCOPED_TABLES = (
    "transactions",
    "budgets",
    "savings_goals",
    "loan_records",
    "finance_notifications",
    "finance_gmail_credentials",
)


def ensure_workspace_schema() -> None:
    inspector = inspect(engine)
    for table in WORKSPACE_SCOPED_TABLES:
        if table not in inspector.get_table_names():
            continue
        columns = {col["name"] for col in inspector.get_columns(table)}
        if "workspace_id" not in columns:
            with engine.begin() as conn:
                conn.execute(
                    text(f"ALTER TABLE {table} ADD COLUMN workspace_id INT NOT NULL DEFAULT 1")
                )
