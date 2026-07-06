def test_apply_demo_seed_on_empty_db():
    from app.core.database import Base, SessionLocal, engine
    from app.modules.auth.application.seed import seed_auth_data
    from app.modules.auth.application.workspace_seed import ensure_workspace_schema
    from app.modules.finance.application.catalog_seed import seed_finance_catalogs
    from app.modules.finance.application.demo_seed import (
        apply_demo_seed,
        clear_finance_data,
        clear_workspace_data,
    )
    from app.modules.finance.application.finance_schema_seed import ensure_finance_schema
    from app.modules.finance.domain.models import Transaction

    Base.metadata.create_all(bind=engine)
    ensure_finance_schema()
    ensure_workspace_schema()
    seed_auth_data()
    seed_finance_catalogs()

    db = SessionLocal()
    try:
        clear_finance_data(db)
        clear_workspace_data(db)
    finally:
        db.close()

    result = apply_demo_seed(force=True, include_users=True)
    assert not result.get("skipped")
    assert "admin" in result["finance"]
    assert "operador" in result["finance"]
    assert "lector" in result["finance"]
    assert result["integrations"]["admin"]
    assert result["integrations"]["operador"]
    assert result["integrations"]["lector"] is None

    total_tx = sum(item["transactions"] for item in result["finance"].values())
    assert total_tx > 20

    db = SessionLocal()
    try:
        count = db.query(Transaction).count()
        assert count == total_tx
    finally:
        db.close()
