import { httpClient } from '../../../../core/interceptors/httpClient'
import type {
  Budget,
  BudgetHealthBreakdown,
  BudgetListFilters,
  BudgetPayload,
  CashClosing,
  FinanceFilters,
  FinanceSummary,
  GmailConnection,
  GmailPollStatus,
  GmailSyncResult,
  ImportResult,
  IntegrationsStatus,
  IntegrationSettingItem,
  LoanListFilters,
  LoanRecord,
  LoanRecordPayload,
  LoanSummary,
  NotificationList,
  OcrExtractResult,
  PaginatedResponse,
  SavingsGoal,
  SavingsGoalPayload,
  SavingsListFilters,
  SavingsSummary,
  Transaction,
  TransactionBulkResult,
  TransactionPayload,
  WebhookEvent,
} from '../../domain/models/finance.types'

function buildListParams(filters: Record<string, string | number | undefined>) {
  const params = new URLSearchParams()
  Object.entries(filters).forEach(([key, value]) => {
    if (value !== undefined && value !== '' && value !== 'all') {
      params.set(key, String(value))
    }
  })
  return params
}

function buildReportParams(filters?: FinanceFilters) {
  const params = new URLSearchParams()
  if (filters?.from) params.set('from', filters.from)
  if (filters?.to) params.set('to', filters.to)
  if (filters?.movement_type) params.set('movement_type', filters.movement_type)
  if (filters?.search) params.set('search', filters.search)
  return params
}

function buildParams(filters?: FinanceFilters) {
  const params = new URLSearchParams()
  if (filters?.from) params.set('from', filters.from)
  if (filters?.to) params.set('to', filters.to)
  if (filters?.movement_type) params.set('movement_type', filters.movement_type)
  if (filters?.search) params.set('search', filters.search)
  if (filters?.page) params.set('page', String(filters.page))
  if (filters?.page_size) params.set('page_size', String(filters.page_size))
  return params
}

export async function fetchTransactions(filters?: FinanceFilters): Promise<PaginatedResponse<Transaction>> {
  const params = buildParams({ page: 1, page_size: 20, ...filters })
  const { data } = await httpClient.get<PaginatedResponse<Transaction>>(
    `/finance/transactions?${params.toString()}`,
  )
  return data
}

export async function createTransaction(payload: TransactionPayload): Promise<Transaction> {
  const { data } = await httpClient.post<Transaction>('/finance/transactions', payload)
  return data
}

export async function updateTransaction(id: number, payload: TransactionPayload): Promise<Transaction> {
  const { data } = await httpClient.put<Transaction>(`/finance/transactions/${id}`, payload)
  return data
}

export async function deleteTransaction(id: number): Promise<void> {
  await httpClient.delete(`/finance/transactions/${id}`)
}

export async function bulkUpdateTransactionCategory(
  ids: number[],
  category: string,
): Promise<TransactionBulkResult> {
  const { data } = await httpClient.patch<TransactionBulkResult>(
    '/finance/transactions/bulk/category',
    { ids, category },
  )
  return data
}

export async function bulkDeleteTransactions(ids: number[]): Promise<TransactionBulkResult> {
  const { data } = await httpClient.post<TransactionBulkResult>(
    '/finance/transactions/bulk/delete',
    { ids },
  )
  return data
}

export async function fetchFinanceSummary(filters?: FinanceFilters): Promise<FinanceSummary> {
  const params = buildParams(filters)
  const { data } = await httpClient.get<FinanceSummary>(`/finance/summary?${params.toString()}`)
  return data
}

export async function fetchCashClosing(from: string, to: string): Promise<CashClosing> {
  const params = new URLSearchParams({ from, to })
  const { data } = await httpClient.get<CashClosing>(`/finance/cash-closing?${params.toString()}`)
  return data
}

export async function fetchBudgets(filters: BudgetListFilters = {}): Promise<PaginatedResponse<Budget>> {
  const params = buildListParams({
    month_year: filters.month_year,
    category: filters.category,
    health: filters.health,
    page: filters.page ?? 1,
    page_size: filters.page_size ?? 20,
  })
  const { data } = await httpClient.get<PaginatedResponse<Budget>>(`/finance/budgets?${params.toString()}`)
  return data
}

export async function fetchBudgetHealthBreakdown(monthYear: string): Promise<BudgetHealthBreakdown> {
  const { data } = await httpClient.get<BudgetHealthBreakdown>(
    `/finance/budgets/health-breakdown?month_year=${monthYear}`,
  )
  return data
}

export async function createBudget(payload: BudgetPayload): Promise<Budget> {
  const { data } = await httpClient.post<Budget>('/finance/budgets', payload)
  return data
}

export async function updateBudget(id: number, payload: BudgetPayload): Promise<Budget> {
  const { data } = await httpClient.put<Budget>(`/finance/budgets/${id}`, payload)
  return data
}

export async function deleteBudget(id: number): Promise<void> {
  await httpClient.delete(`/finance/budgets/${id}`)
}

export async function fetchSavingsGoals(
  filters: SavingsListFilters = {},
): Promise<PaginatedResponse<SavingsGoal>> {
  const params = buildListParams({
    search: filters.search,
    progress: filters.progress,
    page: filters.page ?? 1,
    page_size: filters.page_size ?? 20,
  })
  const { data } = await httpClient.get<PaginatedResponse<SavingsGoal>>(`/finance/savings?${params.toString()}`)
  return data
}

export async function fetchSavingsSummary(): Promise<SavingsSummary> {
  const { data } = await httpClient.get<SavingsSummary>('/finance/savings/summary')
  return data
}

export async function createSavingsGoal(payload: SavingsGoalPayload): Promise<SavingsGoal> {
  const { data } = await httpClient.post<SavingsGoal>('/finance/savings', payload)
  return data
}

export async function deleteSavingsGoal(id: number): Promise<void> {
  await httpClient.delete(`/finance/savings/${id}`)
}

export async function updateSavingsGoal(
  id: number,
  payload: Partial<SavingsGoalPayload>,
): Promise<SavingsGoal> {
  const { data } = await httpClient.put<SavingsGoal>(`/finance/savings/${id}`, payload)
  return data
}

export async function fetchLoanRecords(filters: LoanListFilters = {}): Promise<PaginatedResponse<LoanRecord>> {
  const params = buildListParams({
    search: filters.search,
    status: filters.status,
    loan_type: filters.loan_type,
    page: filters.page ?? 1,
    page_size: filters.page_size ?? 20,
  })
  const { data } = await httpClient.get<PaginatedResponse<LoanRecord>>(`/finance/loans?${params.toString()}`)
  return data
}

export async function fetchLoanSummary(): Promise<LoanSummary> {
  const { data } = await httpClient.get<LoanSummary>('/finance/loans/summary')
  return data
}

export async function createLoanRecord(payload: LoanRecordPayload): Promise<LoanRecord> {
  const { data } = await httpClient.post<LoanRecord>('/finance/loans', payload)
  return data
}

export async function deleteLoanRecord(id: number): Promise<void> {
  await httpClient.delete(`/finance/loans/${id}`)
}

export async function updateLoanRecord(
  id: number,
  payload: Partial<LoanRecordPayload>,
): Promise<LoanRecord> {
  const { data } = await httpClient.put<LoanRecord>(`/finance/loans/${id}`, payload)
  return data
}

async function downloadFile(url: string, filename: string, expectedContentType: string) {
  const response = await httpClient.get(url, { responseType: 'blob' })
  const contentType = String(response.headers['content-type'] ?? '')

  if (!contentType.includes(expectedContentType)) {
    const text = await (response.data as Blob).text()
    let message = 'No se pudo generar el archivo.'
    try {
      const parsed = JSON.parse(text) as { message?: string; detail?: string }
      message = parsed.message ?? parsed.detail ?? message
    } catch {
      // Mantener mensaje genérico
    }
    throw new Error(message)
  }

  const blobUrl = window.URL.createObjectURL(response.data)
  const link = document.createElement('a')
  link.href = blobUrl
  link.download = filename
  link.click()
  window.URL.revokeObjectURL(blobUrl)
}

function reportFilename(filters: FinanceFilters | undefined, extension: 'pdf' | 'xlsx') {
  const from = filters?.from ?? 'all'
  const to = filters?.to ?? 'all'
  return `reporte-financiero-${from}-${to}.${extension}`
}

export async function downloadExcelReport(filters?: FinanceFilters): Promise<void> {
  const params = buildReportParams(filters)
  await downloadFile(
    `/finance/reports/excel?${params.toString()}`,
    reportFilename(filters, 'xlsx'),
    'spreadsheetml',
  )
}

export async function downloadPdfReport(filters?: FinanceFilters): Promise<void> {
  const params = buildReportParams(filters)
  await downloadFile(
    `/finance/reports/pdf?${params.toString()}`,
    reportFilename(filters, 'pdf'),
    'application/pdf',
  )
}

export async function fetchWebhookEvents(limit = 10): Promise<WebhookEvent[]> {
  const { data } = await httpClient.get<WebhookEvent[]>(`/finance/webhook-events?limit=${limit}`)
  return data
}

export async function importLegacyRows(rows: Record<string, unknown>[]): Promise<ImportResult> {
  const { data } = await httpClient.post<ImportResult>('/finance/integrations/import/legacy', { rows })
  return data
}

export async function syncGoogleSheets(): Promise<ImportResult> {
  const { data } = await httpClient.post<ImportResult>('/finance/integrations/sheets/sync')
  return data
}

export async function syncGmailHistorical(): Promise<GmailSyncResult> {
  const { data } = await httpClient.post<GmailSyncResult>('/finance/integrations/gmail/sync-historical')
  return data
}

export async function pollGmailNew(maxMessages = 50): Promise<GmailSyncResult> {
  const { data } = await httpClient.post<GmailSyncResult>(
    `/finance/integrations/gmail/poll?max_messages=${maxMessages}`,
  )
  return data
}

export async function fetchIntegrationsStatus(): Promise<IntegrationsStatus> {
  const { data } = await httpClient.get<IntegrationsStatus>('/finance/integrations/status')
  return data
}

export async function fetchGmailConnection(): Promise<GmailConnection> {
  const { data } = await httpClient.get<GmailConnection>('/finance/integrations/gmail/connection')
  return data
}

export async function fetchGmailPollStatus(): Promise<GmailPollStatus> {
  const { data } = await httpClient.get<GmailPollStatus>('/finance/integrations/gmail/poll-status')
  return data
}

export async function startGmailOAuth(): Promise<string> {
  const { data } = await httpClient.get<{ authorization_url: string }>(
    '/finance/integrations/gmail/oauth/start',
  )
  return data.authorization_url
}

export async function disconnectGmail(): Promise<void> {
  await httpClient.delete('/finance/integrations/gmail/connection')
}

export async function fetchIntegrationSettingsList(): Promise<IntegrationSettingItem[]> {
  const { data } = await httpClient.get<IntegrationSettingItem[]>('/finance/integrations/settings/list')
  return data
}

export async function updateIntegrationSetting(
  key: string,
  payload: { is_enabled?: boolean; config_value?: string },
): Promise<IntegrationSettingItem> {
  const { data } = await httpClient.patch<IntegrationSettingItem>(`/finance/integrations/settings/${key}`, payload)
  return data
}

export async function fetchNotifications(limit = 20): Promise<NotificationList> {
  const { data } = await httpClient.get<NotificationList>(`/finance/notifications?limit=${limit}`)
  return data
}

export async function markAllNotificationsRead(): Promise<void> {
  await httpClient.patch('/finance/notifications/read-all')
}

export async function extractVoucherOcr(file: File): Promise<OcrExtractResult> {
  const formData = new FormData()
  formData.append('file', file)
  const { data } = await httpClient.post<OcrExtractResult>('/finance/integrations/ocr', formData, {
    headers: { 'Content-Type': 'multipart/form-data' },
  })
  return data
}
