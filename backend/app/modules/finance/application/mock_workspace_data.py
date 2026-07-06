"""Mock data specs por usuario para pruebas locales."""

from __future__ import annotations

from dataclasses import dataclass

from app.modules.finance.domain.models import MovementType


@dataclass(frozen=True)
class MockWorkspaceSpec:
    name: str
    slug: str
    workspace_type: str
    owner_username: str
    members: tuple[tuple[str, str], ...]  # (username, role)


@dataclass(frozen=True)
class MockTransactionSpec:
    day_offset: int
    hour: int
    minute: int
    movement: MovementType
    concept: str
    bank: str
    payment_type: str
    amount: str
    category: str


MOCK_WORKSPACES: tuple[MockWorkspaceSpec, ...] = (
    MockWorkspaceSpec(
        name="Personal Ivan",
        slug="personal-ivan",
        workspace_type="personal",
        owner_username="admin",
        members=(("lector", "viewer"),),
    ),
    MockWorkspaceSpec(
        name="Emprendimiento Lima",
        slug="emprendimiento-lima",
        workspace_type="business",
        owner_username="admin",
        members=(("operador", "member"),),
    ),
)

# Mock personal — gastos del hogar
PERSONAL_TRANSACTIONS: tuple[MockTransactionSpec, ...] = (
    MockTransactionSpec(-2, 9, 0, MovementType.INGRESO, "Sueldo quincena", "BCP", "TRANSFERENCIA", "2500.00", "Personal"),
    MockTransactionSpec(0, 10, 0, MovementType.EGRESO, "Alquiler departamento", "BCP", "TRANSFERENCIA", "1200.00", "Vivienda"),
    MockTransactionSpec(0, 12, 30, MovementType.EGRESO, "Supermercado", "YAPE", "YAPEO CELULAR", "180.00", "Alimentación"),
    MockTransactionSpec(-1, 8, 0, MovementType.EGRESO, "Combustible", "BBVA", "COMPRA", "90.00", "Transporte"),
    MockTransactionSpec(-1, 19, 0, MovementType.EGRESO, "Cena familiar", "YAPE", "YAPEO CELULAR", "75.00", "Alimentación"),
    MockTransactionSpec(-3, 11, 0, MovementType.EGRESO, "Farmacia", "BCP", "PAGO QR", "45.00", "Salud"),
    MockTransactionSpec(0, 20, 0, MovementType.EGRESO, "Streaming", "BBVA", "PAGO SERVICIO", "39.90", "Entretenimiento"),
    MockTransactionSpec(-5, 15, 0, MovementType.EGRESO, "Curso idiomas", "BCP", "TRANSFERENCIA", "120.00", "Educación"),
)

PERSONAL_BUDGETS: tuple[tuple[str, str], ...] = (
    ("Vivienda", "1500.00"),
    ("Alimentación", "600.00"),
    ("Transporte", "300.00"),
    ("Salud", "400.00"),
    ("Entretenimiento", "200.00"),
)

PERSONAL_SAVINGS: tuple[tuple[str, str, str], ...] = (
    ("Vacaciones familia", "4000.00", "1800.00"),
    ("Fondo emergencia", "8000.00", "6200.00"),
)

# Mock negocio — flujo emprendimiento Lima
BUSINESS_TRANSACTIONS: tuple[MockTransactionSpec, ...] = (
    MockTransactionSpec(-2, 9, 15, MovementType.INGRESO, "Venta productos tienda", "BCP", "TRANSFERENCIA", "2800.00", "Personal"),
    MockTransactionSpec(-1, 11, 0, MovementType.INGRESO, "Cobro servicio consultoría", "BBVA", "PAGO QR", "1500.00", "Personal"),
    MockTransactionSpec(0, 10, 30, MovementType.INGRESO, "Venta del día", "BCP", "TRANSFERENCIA", "1200.00", "Personal"),
    MockTransactionSpec(0, 16, 45, MovementType.INGRESO, "Yape recibido cliente", "YAPE", "YAPEO CELULAR", "350.00", "Personal"),
    MockTransactionSpec(-5, 14, 20, MovementType.INGRESO, "Venta efectivo", "EFECTIVO", "EFECTIVO", "480.00", "Otros"),
    MockTransactionSpec(-3, 8, 30, MovementType.EGRESO, "Alquiler local comercial", "BCP", "TRANSFERENCIA", "1800.00", "Vivienda"),
    MockTransactionSpec(0, 12, 30, MovementType.EGRESO, "Almuerzo equipo", "YAPE", "YAPEO CELULAR", "85.00", "Alimentación"),
    MockTransactionSpec(0, 13, 15, MovementType.EGRESO, "Insumos producción", "PLIN", "PAGO QR", "420.00", "Alimentación"),
    MockTransactionSpec(-2, 19, 0, MovementType.EGRESO, "Compra mayorista", "BCP", "COMPRA", "650.00", "Alimentación"),
    MockTransactionSpec(-4, 9, 0, MovementType.EGRESO, "Delivery combustible", "BBVA", "COMPRA", "120.00", "Transporte"),
    MockTransactionSpec(0, 15, 0, MovementType.EGRESO, "Luz y agua local", "BCP", "PAGO SERVICIO", "280.00", "Servicios"),
    MockTransactionSpec(-1, 16, 0, MovementType.EGRESO, "Internet negocio", "BCP", "PAGO SERVICIO", "89.90", "Servicios"),
    MockTransactionSpec(-3, 20, 0, MovementType.EGRESO, "Publicidad redes", "BBVA", "PAGO SERVICIO", "150.00", "Servicios"),
    MockTransactionSpec(-2, 21, 30, MovementType.EGRESO, "Material marketing", "YAPE", "YAPEO CELULAR", "65.00", "Entretenimiento"),
    MockTransactionSpec(-1, 9, 30, MovementType.EGRESO, "Papelería y packaging", "BCP", "TRANSFERENCIA", "150.00", "Personal"),
    MockTransactionSpec(-4, 15, 45, MovementType.EGRESO, "Gasto operativo", "EFECTIVO", "OTROS", "55.00", "Otros"),
    MockTransactionSpec(-18, 12, 0, MovementType.EGRESO, "Mantenimiento local", "BCP", "TRANSFERENCIA", "350.00", "Vivienda"),
    MockTransactionSpec(-20, 10, 0, MovementType.INGRESO, "Venta fin de mes", "BCP", "TRANSFERENCIA", "2100.00", "Personal"),
)

BUSINESS_BUDGETS: tuple[tuple[str, str], ...] = (
    ("Vivienda", "2000.00"),
    ("Alimentación", "800.00"),
    ("Servicios", "500.00"),
    ("Transporte", "400.00"),
    ("Entretenimiento", "300.00"),
    ("Salud", "600.00"),
    ("Personal", "10000.00"),
)

BUSINESS_SAVINGS: tuple[tuple[str, str, str], ...] = (
    ("Ampliación local", "5000.00", "3200.00"),
    ("Capital de trabajo", "10000.00", "8500.00"),
    ("Maquinaria", "3000.00", "500.00"),
)

BUSINESS_LOANS: tuple[tuple[str, str, str, str, str], ...] = (
    ("payable", "Banco Demo", "2000.00", "1200.00", "Préstamo negocio"),
    ("receivable", "Juan Pérez", "1500.00", "800.00", "Me debe por servicio"),
    ("payable", "Carlos López", "500.00", "200.00", "Préstamo personal"),
)

# Mock lectura — dataset reducido para rol reader (solo consulta)
READER_TRANSACTIONS: tuple[MockTransactionSpec, ...] = (
    MockTransactionSpec(-1, 9, 0, MovementType.INGRESO, "Ingreso quincenal", "BCP", "TRANSFERENCIA", "1800.00", "Personal"),
    MockTransactionSpec(0, 11, 0, MovementType.EGRESO, "Mercado semanal", "YAPE", "YAPEO CELULAR", "95.00", "Alimentación"),
    MockTransactionSpec(-2, 18, 0, MovementType.EGRESO, "Transporte urbano", "BBVA", "COMPRA", "35.00", "Transporte"),
    MockTransactionSpec(-3, 20, 0, MovementType.EGRESO, "Servicios hogar", "BCP", "PAGO SERVICIO", "120.00", "Servicios"),
)

READER_BUDGETS: tuple[tuple[str, str], ...] = (
    ("Alimentación", "400.00"),
    ("Transporte", "150.00"),
    ("Servicios", "250.00"),
)

READER_SAVINGS: tuple[tuple[str, str, str], ...] = (
    ("Meta lectura demo", "1500.00", "450.00"),
)

# Perfiles demo por usuario (scope = user.id)
DEMO_USER_PROFILES: tuple[tuple[str, str], ...] = (
    ("admin", "personal"),
    ("operador", "business"),
    ("lector", "reader"),
)
