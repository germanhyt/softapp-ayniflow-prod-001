#!/usr/bin/env python3

from __future__ import annotations

import argparse
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
if str(ROOT) not in sys.path:
    sys.path.insert(0, str(ROOT))

from app.core.database import Base, engine  # noqa: E402
from app.modules.auth.application.seed import seed_auth_data  # noqa: E402
from app.modules.auth.domain.models import Permission, Role, User  # noqa: F401,E402
from app.modules.finance.application.catalog_seed import seed_finance_catalogs  # noqa: E402
from app.modules.finance.application.demo_seed import apply_demo_seed  # noqa: E402
from app.modules.finance.application.integration_settings_seed import seed_integration_settings  # noqa: E402
from app.modules.finance.application.finance_schema_seed import ensure_finance_schema  # noqa: E402
from app.modules.auth.application.workspace_seed import ensure_workspace_schema  # noqa: E402
from app.modules.finance.domain.models import (  # noqa: F401,E402
    Budget,
    FinanceBank,
    FinanceCategory,
    FinancePaymentType,
    IntegrationSetting,
    Transaction,
)


def main() -> int:
    parser = argparse.ArgumentParser(description="Seed demo AyniFlow")
    parser.add_argument(
        "--force",
        action="store_true",
        help="Borra datos financieros existentes y recarga el demo",
    )
    parser.add_argument(
        "--no-users",
        action="store_true",
        help="No crear usuarios demo (operador, lector)",
    )
    args = parser.parse_args()

    Base.metadata.create_all(bind=engine)
    ensure_finance_schema()
    ensure_workspace_schema()
    seed_auth_data()
    seed_finance_catalogs()
    seed_integration_settings()

    result = apply_demo_seed(force=args.force, include_users=not args.no_users)

    if result.get("skipped"):
        print(f"⚠️  {result['message']}")
        return 1

    if result.get("users_created"):
        print("Usuarios demo creados:")
        for username in result["users_created"]:
            print(f"  - {username}")

    workspaces = result.get("user_scopes") or {}
    if workspaces:
        print("\nDatos mock por usuario:")
        for username, user_id in workspaces.items():
            print(f"  - {username} (id={user_id})")

    finance = result.get("finance")
    if finance:
        print("\nResumen financiero mock:")
        for username, stats in finance.items():
            print(f"  [{username}] tx={stats['transactions']} budgets={stats['budgets']} "
                  f"ahorros={stats['savings_goals']} préstamos={stats['loan_records']}")

    integrations = result.get("integrations")
    if integrations:
        print("\nIntegraciones Gmail mock:")
        for username, email in integrations.items():
            status = email or "sin conectar (pendiente)"
            print(f"  [{username}] {status}")

    print("\nCredenciales demo:")
    print("  admin    / Admin123!     (finanzas personales + Gmail conectado)")
    print("  operador / Operador123! (finanzas negocio + préstamos + Gmail conectado)")
    print("  lector   / Lector123!   (dataset reducido, solo lectura, sin Gmail)")
    print("\nListo. Reinicia el backend si ya estaba corriendo.")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
