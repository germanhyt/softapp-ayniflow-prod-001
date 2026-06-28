export type MovementType = 'Ingreso' | 'Egreso'

export interface Transaction {
  id: number
  transaction_date: string
  transaction_time: string | null
  movement_type: MovementType
  concept: string
  bank: string
  payment_type: string
  recipient: string | null
  operation_number: string | null
  amount: string
  category: string | null
  savings_goal_id?: number | null
  loan_record_id?: number | null
  notes: string | null
  created_at?: string
}

export interface TransactionPayload {
  transaction_date: string
  transaction_time?: string | null
  movement_type: MovementType
  concept: string
  bank: string
  payment_type: string
  recipient?: string | null
  operation_number?: string | null
  amount: number
  category?: string | null
  savings_goal_id?: number | null
  loan_record_id?: number | null
  notes?: string | null
}

export interface Budget {
  id: number
  month_year: string
  category: string
  budgeted_amount: string
  actual_amount: string
  percentage: string
  difference: string
  created_at?: string | null
  updated_at?: string | null
}

export interface BudgetPayload {
  month_year: string
  category: string
  budgeted_amount: number
}

export interface SavingsGoal {
  id: number
  name: string
  target_amount: string
  current_amount: string
  progress_percentage: string
  due_date: string | null
  notes: string | null
  created_at?: string | null
  updated_at?: string | null
}

export interface SavingsGoalPayload {
  name: string
  target_amount: number
  current_amount: number
  due_date?: string | null
  notes?: string | null
}

export interface SavingsSummary {
  goals_count: number
  total_target_amount: string
  total_saved_amount: string
  completion_percentage: string
}

export type LoanType = 'payable' | 'receivable'

export interface LoanRecord {
  id: number
  loan_type: LoanType
  lender: string
  principal_amount: string
  outstanding_amount: string
  paid_amount: string
  paid_percentage: string
  interest_rate: string | null
  next_payment_date: string | null
  status: string
  notes: string | null
  created_at?: string | null
  updated_at?: string | null
}

export interface LoanRecordPayload {
  loan_type: LoanType
  lender: string
  principal_amount: number
  outstanding_amount: number
  interest_rate?: number | null
  next_payment_date?: string | null
  status?: string
  notes?: string | null
}

export interface LoanSummary {
  loans_count: number
  active_loans_count: number
  total_principal_amount: string
  total_outstanding_amount: string
  payable_count: number
  receivable_count: number
  payable_outstanding_amount: string
  receivable_outstanding_amount: string
}

export interface FinanceSummary {
  total_income: string
  total_expense: string
  balance: string
  transaction_count: number
  daily_balances: { date: string; income: string; expense: string }[]
  by_payment_type: { payment_type: string; amount: string; count: number }[]
}

export interface CashClosing {
  from_date: string
  to_date: string
  total_income: string
  total_expense: string
  balance: string
  transaction_count: number
  income_count: number
  expense_count: number
  daily_balances: { date: string; income: string; expense: string }[]
  by_payment_type: { payment_type: string; amount: string; count: number }[]
}

export interface WebhookEvent {
  id: number
  source: string
  operation_number: string | null
  status: string
  transaction_id: number | null
  created_at: string | null
}

export interface ImportResult {
  created: number
  skipped: number
  total: number
}

export interface GmailConnection {
  oauth_app_configured: boolean
  connected: boolean
  connected_email: string | null
  redirect_uri: string
  query: string
}

export interface GmailPollStatus {
  loop_running: boolean
  realtime_enabled: boolean
  connected: boolean
  query: string
  interval_seconds: number
  mark_unread_only: boolean
  last_checked_at: string | null
  last_result: Record<string, unknown> | null
  last_error: string | null
}

export interface GmailSyncResult {
  created: number
  skipped: number
  invalid: number
  total: number
}

export interface IntegrationSettingItem {
  key: string
  label: string
  description: string
  category: string
  kind: 'feature' | 'config'
  is_enabled: boolean
  config_value: string | null
  env_default: string | null
  effective_value: string | null
  value_type?: 'text' | 'secret'
}

export interface FinanceNotification {
  id: number
  kind: string
  title: string
  message: string
  operation_number: string | null
  transaction_id: number | null
  is_read: boolean
  created_at: string | null
}

export interface NotificationList {
  items: FinanceNotification[]
  unread_count: number
}

export interface IntegrationStatusItem {
  configured: boolean
  label: string
  description: string
}

export interface IntegrationsStatus {
  webhook_inbound: IntegrationStatusItem
  webhook_notification: IntegrationStatusItem
  gemini_ocr: IntegrationStatusItem
  google_sheets: IntegrationStatusItem
  gmail: IntegrationStatusItem
}

export interface OcrExtractResult {
  fecha?: string | null
  hora?: string | null
  movimiento?: string | null
  banco?: string | null
  tipo?: string | null
  destinatario?: string | null
  monto?: number | string | null
  num_operacion?: string | null
  concepto?: string | null
}

export interface FinanceFilters {
  from?: string
  to?: string
  movement_type?: MovementType
  search?: string
  page?: number
  page_size?: PageSize
}

export interface TransactionBulkResult {
  updated: number
  deleted: number
  total: number
}

export interface CatalogItem {
  id: number
  name: string
  is_active: boolean
  sort_order: number
}

export type CatalogKind = 'banks' | 'payment-types' | 'categories'

export interface PaginatedMeta {
  total: number
  page: number
  page_size: number
  total_pages: number
}

export interface PaginatedResponse<T> {
  items: T[]
  meta: PaginatedMeta
}

export type PageSize = 20 | 50 | 100 | 200

export const PAGE_SIZE_OPTIONS: PageSize[] = [20, 50, 100, 200]

export interface BudgetListFilters {
  month_year?: string
  category?: string
  health?: 'all' | 'ok' | 'risk' | 'exceeded'
  page?: number
  page_size?: PageSize
}

export interface SavingsListFilters {
  search?: string
  progress?: 'all' | 'in_progress' | 'completed'
  page?: number
  page_size?: PageSize
}

export interface LoanListFilters {
  search?: string
  status?: string
  loan_type?: LoanType
  page?: number
  page_size?: PageSize
}

export interface BudgetHealthItem extends Budget {
  health_status: 'ok' | 'risk' | 'exceeded'
}

export interface BudgetHealthBreakdown {
  month_year: string
  ok_count: number
  at_risk_count: number
  exceeded_count: number
  total_budgeted: string
  total_actual: string
  ok: BudgetHealthItem[]
  at_risk: BudgetHealthItem[]
  exceeded: BudgetHealthItem[]
}
