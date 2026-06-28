from datetime import date, time
from decimal import Decimal
from enum import Enum

from pydantic import BaseModel, Field, model_validator


class MovementTypeSchema(str, Enum):
    INGRESO = "Ingreso"
    EGRESO = "Egreso"


class LoanTypeSchema(str, Enum):
    PAYABLE = "payable"
    RECEIVABLE = "receivable"


class TransactionBase(BaseModel):
    transaction_date: date
    transaction_time: time | None = None
    movement_type: MovementTypeSchema
    concept: str = Field(min_length=1, max_length=255)
    bank: str = Field(default="General", max_length=100)
    payment_type: str = Field(default="Transferencia", max_length=100)
    recipient: str | None = Field(default=None, max_length=255)
    operation_number: str | None = Field(default=None, max_length=100)
    amount: Decimal = Field(gt=0, decimal_places=2)
    category: str | None = Field(default=None, max_length=100)
    notes: str | None = None


class TransactionCreate(TransactionBase):
    savings_goal_id: int | None = None
    loan_record_id: int | None = None


class TransactionUpdate(BaseModel):
    transaction_date: date | None = None
    transaction_time: time | None = None
    movement_type: MovementTypeSchema | None = None
    concept: str | None = Field(default=None, min_length=1, max_length=255)
    bank: str | None = Field(default=None, max_length=100)
    payment_type: str | None = Field(default=None, max_length=100)
    recipient: str | None = Field(default=None, max_length=255)
    operation_number: str | None = Field(default=None, max_length=100)
    amount: Decimal | None = Field(default=None, gt=0, decimal_places=2)
    category: str | None = Field(default=None, max_length=100)
    savings_goal_id: int | None = None
    loan_record_id: int | None = None
    notes: str | None = None


class TransactionBulkCategoryUpdate(BaseModel):
    ids: list[int] = Field(min_length=1)
    category: str = Field(min_length=1, max_length=100)


class TransactionBulkDelete(BaseModel):
    ids: list[int] = Field(min_length=1)


class TransactionBulkResult(BaseModel):
    updated: int = 0
    deleted: int = 0
    total: int


class TransactionResponse(TransactionBase):
    id: int
    savings_goal_id: int | None = None
    loan_record_id: int | None = None
    created_at: str | None = None

    model_config = {"from_attributes": True}


class BudgetBase(BaseModel):
    month_year: str = Field(pattern=r"^\d{4}-\d{2}$")
    category: str = Field(min_length=1, max_length=100)
    budgeted_amount: Decimal = Field(gt=0, decimal_places=2)


class BudgetCreate(BudgetBase):
    pass


class BudgetUpdate(BaseModel):
    month_year: str | None = Field(default=None, pattern=r"^\d{4}-\d{2}$")
    category: str | None = Field(default=None, min_length=1, max_length=100)
    budgeted_amount: Decimal | None = Field(default=None, gt=0, decimal_places=2)


class BudgetResponse(BudgetBase):
    id: int
    actual_amount: Decimal = Decimal("0")
    percentage: Decimal = Decimal("0")
    difference: Decimal = Decimal("0")
    created_at: str | None = None
    updated_at: str | None = None

    model_config = {"from_attributes": True}


class PaginatedMeta(BaseModel):
    total: int
    page: int
    page_size: int
    total_pages: int


class TransactionPaginatedResponse(BaseModel):
    items: list[TransactionResponse]
    meta: PaginatedMeta


class BudgetPaginatedResponse(BaseModel):
    items: list[BudgetResponse]
    meta: PaginatedMeta


class BudgetHealthItem(BudgetResponse):
    health_status: str


class BudgetHealthBreakdownResponse(BaseModel):
    month_year: str
    ok_count: int
    at_risk_count: int
    exceeded_count: int
    total_budgeted: Decimal
    total_actual: Decimal
    ok: list[BudgetHealthItem]
    at_risk: list[BudgetHealthItem]
    exceeded: list[BudgetHealthItem]


class SavingsGoalBase(BaseModel):
    name: str = Field(min_length=1, max_length=120)
    target_amount: Decimal = Field(gt=0, decimal_places=2)
    current_amount: Decimal = Field(ge=0, decimal_places=2)
    due_date: date | None = None
    notes: str | None = None


class SavingsGoalCreate(SavingsGoalBase):
    pass


class SavingsGoalUpdate(BaseModel):
    name: str | None = Field(default=None, min_length=1, max_length=120)
    target_amount: Decimal | None = Field(default=None, gt=0, decimal_places=2)
    current_amount: Decimal | None = Field(default=None, ge=0, decimal_places=2)
    due_date: date | None = None
    notes: str | None = None


class SavingsGoalResponse(SavingsGoalBase):
    id: int
    progress_percentage: Decimal = Decimal("0")
    created_at: str | None = None
    updated_at: str | None = None

    model_config = {"from_attributes": True}


class SavingsSummaryResponse(BaseModel):
    goals_count: int
    total_target_amount: Decimal
    total_saved_amount: Decimal
    completion_percentage: Decimal


class SavingsPaginatedResponse(BaseModel):
    items: list[SavingsGoalResponse]
    meta: PaginatedMeta


class LoanRecordBase(BaseModel):
    loan_type: LoanTypeSchema = LoanTypeSchema.PAYABLE
    lender: str = Field(min_length=1, max_length=120)
    principal_amount: Decimal = Field(gt=0, decimal_places=2)
    outstanding_amount: Decimal = Field(ge=0, decimal_places=2)
    interest_rate: Decimal | None = Field(default=None, ge=0, le=100, decimal_places=2)
    next_payment_date: date | None = None
    status: str = Field(default="active", max_length=20)
    notes: str | None = None

    @model_validator(mode="after")
    def validate_outstanding_amount(self):
        self.status = self.status.strip().lower()
        allowed_status = {"active", "paid", "overdue"}
        if self.status not in allowed_status:
            raise ValueError("Estado inválido. Use: active, paid u overdue")
        if self.outstanding_amount > self.principal_amount:
            raise ValueError("El saldo pendiente no puede superar el principal")
        return self


class LoanRecordCreate(LoanRecordBase):
    pass


class LoanRecordUpdate(BaseModel):
    loan_type: LoanTypeSchema | None = None
    lender: str | None = Field(default=None, min_length=1, max_length=120)
    principal_amount: Decimal | None = Field(default=None, gt=0, decimal_places=2)
    outstanding_amount: Decimal | None = Field(default=None, ge=0, decimal_places=2)
    interest_rate: Decimal | None = Field(default=None, ge=0, le=100, decimal_places=2)
    next_payment_date: date | None = None
    status: str | None = Field(default=None, max_length=20)
    notes: str | None = None

    @model_validator(mode="after")
    def validate_amounts(self):
        if self.status is not None:
            normalized = self.status.strip().lower()
            if normalized not in {"active", "paid", "overdue"}:
                raise ValueError("Estado inválido. Use: active, paid u overdue")
            self.status = normalized
        if (
            self.principal_amount is not None
            and self.outstanding_amount is not None
            and self.outstanding_amount > self.principal_amount
        ):
            raise ValueError("El saldo pendiente no puede superar el principal")
        return self


class LoanRecordResponse(LoanRecordBase):
    id: int
    paid_amount: Decimal = Decimal("0")
    paid_percentage: Decimal = Decimal("0")
    created_at: str | None = None
    updated_at: str | None = None

    model_config = {"from_attributes": True}


class LoanSummaryResponse(BaseModel):
    loans_count: int
    active_loans_count: int
    total_principal_amount: Decimal
    total_outstanding_amount: Decimal
    payable_count: int
    receivable_count: int
    payable_outstanding_amount: Decimal
    receivable_outstanding_amount: Decimal


class LoanPaginatedResponse(BaseModel):
    items: list[LoanRecordResponse]
    meta: PaginatedMeta


class DailyBalanceItem(BaseModel):
    date: str
    income: Decimal
    expense: Decimal


class TypeSummaryItem(BaseModel):
    payment_type: str
    amount: Decimal
    count: int


class FinanceSummaryResponse(BaseModel):
    total_income: Decimal
    total_expense: Decimal
    balance: Decimal
    transaction_count: int
    daily_balances: list[DailyBalanceItem]
    by_payment_type: list[TypeSummaryItem]


class CashClosingResponse(BaseModel):
    from_date: date
    to_date: date
    total_income: Decimal
    total_expense: Decimal
    balance: Decimal
    transaction_count: int
    income_count: int
    expense_count: int
    daily_balances: list[DailyBalanceItem]
    by_payment_type: list[TypeSummaryItem]


class WebhookPayload(BaseModel):
    fecha: str
    hora: str | None = None
    movimiento: str | None = None
    concepto: str | None = None
    banco: str
    tipo: str
    monto: Decimal
    destinatario: str | None = None
    num_operacion: str


class WebhookEventResponse(BaseModel):
    id: int
    source: str
    operation_number: str | None
    status: str
    transaction_id: int | None
    created_at: str | None

    model_config = {"from_attributes": True}


class LegacyImportRequest(BaseModel):
    rows: list[dict]


class ImportResultResponse(BaseModel):
    created: int
    skipped: int
    total: int


class GmailSyncResultResponse(BaseModel):
    created: int
    skipped: int
    invalid: int
    total: int


class GmailConnectionResponse(BaseModel):
    oauth_app_configured: bool
    connected: bool
    connected_email: str | None = None
    redirect_uri: str
    query: str


class GmailOAuthStartResponse(BaseModel):
    authorization_url: str


class GmailPollStatusResponse(BaseModel):
    loop_running: bool
    realtime_enabled: bool
    connected: bool
    query: str
    interval_seconds: int
    mark_unread_only: bool = True
    last_checked_at: str | None = None
    last_result: dict | None = None
    last_error: str | None = None


class NotificationResponse(BaseModel):
    id: int
    kind: str
    title: str
    message: str
    operation_number: str | None = None
    transaction_id: int | None = None
    is_read: bool
    created_at: str | None = None

    model_config = {"from_attributes": True}


class NotificationListResponse(BaseModel):
    items: list[NotificationResponse]
    unread_count: int


class IntegrationStatusItem(BaseModel):
    configured: bool
    label: str
    description: str


class IntegrationSettingResponse(BaseModel):
    key: str
    label: str
    description: str
    category: str
    kind: str
    is_enabled: bool
    config_value: str | None = None
    env_default: str | None = None
    effective_value: str | None = None
    value_type: str = "text"


class IntegrationSettingUpdate(BaseModel):
    is_enabled: bool | None = None
    config_value: str | None = None


class IntegrationsStatusResponse(BaseModel):
    webhook_inbound: IntegrationStatusItem
    webhook_notification: IntegrationStatusItem
    gemini_ocr: IntegrationStatusItem
    google_sheets: IntegrationStatusItem
    gmail: IntegrationStatusItem


class OcrExtractResponse(BaseModel):
    fecha: str | None = None
    hora: str | None = None
    movimiento: str | None = None
    banco: str | None = None
    tipo: str | None = None
    destinatario: str | None = None
    monto: float | str | None = None
    num_operacion: str | None = None
    concepto: str | None = None
