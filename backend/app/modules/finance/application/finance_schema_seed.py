from sqlalchemy import inspect, text

from app.core.database import engine


def ensure_finance_schema() -> None:
    inspector = inspect(engine)
    if "transactions" in inspector.get_table_names():
        columns = {col["name"] for col in inspector.get_columns("transactions")}
        alters: list[str] = []
        if "savings_goal_id" not in columns:
            alters.append("ADD COLUMN savings_goal_id INT NULL")
        if "loan_record_id" not in columns:
            alters.append("ADD COLUMN loan_record_id INT NULL")

        if alters:
            with engine.begin() as conn:
                for clause in alters:
                    conn.execute(text(f"ALTER TABLE transactions {clause}"))

    if "loan_records" not in inspector.get_table_names():
        return

    loan_columns = {col["name"] for col in inspector.get_columns("loan_records")}
    if "loan_type" not in loan_columns:
        with engine.begin() as conn:
            conn.execute(
                text(
                    "ALTER TABLE loan_records ADD COLUMN loan_type VARCHAR(20) NOT NULL DEFAULT 'payable'"
                )
            )
