import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'

import type {
  BudgetListFilters,
  BudgetPayload,
  FinanceFilters,
  IntegrationSettingItem,
  LoanListFilters,
  LoanRecordPayload,
  SavingsGoalPayload,
  SavingsListFilters,
  TransactionPayload,
} from '../../domain/models/finance.types'
import {
  createBudget,
  createLoanRecord,
  createSavingsGoal,
  createTransaction,
  updateTransaction,
  deleteBudget,
  deleteLoanRecord,
  deleteSavingsGoal,
  deleteTransaction,
  bulkDeleteTransactions,
  bulkUpdateTransactionCategory,
  downloadExcelReport,
  downloadPdfReport,
  disconnectGmail,
  extractVoucherOcr,
  fetchBudgetHealthBreakdown,
  fetchBudgets,
  fetchCashClosing,
  fetchFinanceSummary,
  fetchGmailConnection,
  fetchGmailPollStatus,
  fetchIntegrationsStatus,
  fetchIntegrationSettingsList,
  fetchLoanRecords,
  fetchLoanSummary,
  fetchNotifications,
  fetchSavingsGoals,
  fetchSavingsSummary,
  fetchTransactions,
  fetchWebhookEvents,
  importLegacyRows,
  markAllNotificationsRead,
  pollGmailNew,
  startGmailOAuth,
  syncGmailHistorical,
  syncGoogleSheets,
  updateBudget,
  updateIntegrationSetting,
  updateLoanRecord,
  updateSavingsGoal,
} from '../../infrastructure/repository/financeRepository'
import { normalizeTransactionFilters } from '../realtime/transactionFilters'
import { alertError } from '../../../../core/utils/alerts'

export function useFinanceSummary(filters: FinanceFilters, options?: { enabled?: boolean }) {
  return useQuery({
    queryKey: ['finance', 'summary', filters],
    queryFn: () => fetchFinanceSummary(filters),
    enabled: options?.enabled ?? true,
  })
}

export function useTransactions(filters: FinanceFilters) {
  const normalized = normalizeTransactionFilters(filters)
  return useQuery({
    queryKey: ['finance', 'transactions', normalized],
    queryFn: () => fetchTransactions(normalized),
    staleTime: 30_000,
  })
}

export function useCreateTransaction() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: (payload: TransactionPayload) => createTransaction(payload),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['finance'] })
      queryClient.invalidateQueries({ queryKey: ['finance', 'savings'] })
      queryClient.invalidateQueries({ queryKey: ['finance', 'loans'] })
    },
  })
}

export function useUpdateTransaction() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: ({ id, payload }: { id: number; payload: TransactionPayload }) =>
      updateTransaction(id, payload),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['finance'] })
      queryClient.invalidateQueries({ queryKey: ['finance', 'savings'] })
      queryClient.invalidateQueries({ queryKey: ['finance', 'loans'] })
    },
  })
}

export function useDeleteTransaction() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: (id: number) => deleteTransaction(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['finance'] })
      queryClient.invalidateQueries({ queryKey: ['finance', 'savings'] })
      queryClient.invalidateQueries({ queryKey: ['finance', 'loans'] })
    },
  })
}

export function useBulkUpdateTransactionCategory() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: ({ ids, category }: { ids: number[]; category: string }) =>
      bulkUpdateTransactionCategory(ids, category),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['finance'] })
    },
  })
}

export function useBulkDeleteTransactions() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (ids: number[]) => bulkDeleteTransactions(ids),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['finance'] })
      queryClient.invalidateQueries({ queryKey: ['finance', 'savings'] })
      queryClient.invalidateQueries({ queryKey: ['finance', 'loans'] })
    },
  })
}

export function useBudgets(filters: BudgetListFilters = {}, options?: { enabled?: boolean }) {
  return useQuery({
    queryKey: ['finance', 'budgets', filters],
    queryFn: () => fetchBudgets(filters),
    enabled: options?.enabled ?? true,
  })
}

export function useBudgetHealthBreakdown(monthYear?: string) {
  return useQuery({
    queryKey: ['finance', 'budgets', 'health-breakdown', monthYear],
    queryFn: () => fetchBudgetHealthBreakdown(monthYear!),
    enabled: Boolean(monthYear),
  })
}

export function useCreateBudget() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: (payload: BudgetPayload) => createBudget(payload),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['finance', 'budgets'] })
    },
  })
}

export function useUpdateBudget() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: ({ id, payload }: { id: number; payload: BudgetPayload }) => updateBudget(id, payload),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['finance', 'budgets'] })
    },
  })
}

export function useDeleteBudget() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: (id: number) => deleteBudget(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['finance', 'budgets'] })
    },
  })
}

export function useSavingsGoals(filters: SavingsListFilters = {}) {
  return useQuery({
    queryKey: ['finance', 'savings', filters],
    queryFn: () => fetchSavingsGoals(filters),
  })
}

export function useSavingsSummary(options?: { enabled?: boolean }) {
  return useQuery({
    queryKey: ['finance', 'savings', 'summary'],
    queryFn: () => fetchSavingsSummary(),
    enabled: options?.enabled ?? true,
  })
}

export function useCreateSavingsGoal() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: createSavingsGoal,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['finance', 'savings'] })
      queryClient.invalidateQueries({ queryKey: ['finance', 'savings', 'summary'] })
    },
  })
}

export function useUpdateSavingsGoal() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: ({ id, payload }: { id: number; payload: Partial<SavingsGoalPayload> }) =>
      updateSavingsGoal(id, payload),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['finance', 'savings'] })
      queryClient.invalidateQueries({ queryKey: ['finance', 'savings', 'summary'] })
    },
  })
}

export function useDeleteSavingsGoal() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (id: number) => deleteSavingsGoal(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['finance', 'savings'] })
      queryClient.invalidateQueries({ queryKey: ['finance', 'savings', 'summary'] })
    },
  })
}

export function useLoanRecords(filters: LoanListFilters = {}) {
  return useQuery({
    queryKey: ['finance', 'loans', filters],
    queryFn: () => fetchLoanRecords(filters),
  })
}

export function useLoanSummary(options?: { enabled?: boolean }) {
  return useQuery({
    queryKey: ['finance', 'loans', 'summary'],
    queryFn: () => fetchLoanSummary(),
    enabled: options?.enabled ?? true,
  })
}

export function useCreateLoanRecord() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: createLoanRecord,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['finance', 'loans'] })
      queryClient.invalidateQueries({ queryKey: ['finance', 'loans', 'summary'] })
    },
  })
}

export function useUpdateLoanRecord() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: ({ id, payload }: { id: number; payload: Partial<LoanRecordPayload> }) =>
      updateLoanRecord(id, payload),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['finance', 'loans'] })
      queryClient.invalidateQueries({ queryKey: ['finance', 'loans', 'summary'] })
    },
  })
}

export function useDeleteLoanRecord() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (id: number) => deleteLoanRecord(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['finance', 'loans'] })
      queryClient.invalidateQueries({ queryKey: ['finance', 'loans', 'summary'] })
    },
  })
}

export function useCashClosing(from: string, to: string, enabled = true) {
  return useQuery({
    queryKey: ['finance', 'cash-closing', from, to],
    queryFn: () => fetchCashClosing(from, to),
    enabled: enabled && Boolean(from && to),
  })
}

export function useWebhookEvents(limit = 10) {
  return useQuery({
    queryKey: ['finance', 'webhook-events', limit],
    queryFn: () => fetchWebhookEvents(limit),
  })
}

export function useImportLegacy() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (rows: Record<string, unknown>[]) => importLegacyRows(rows),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['finance'] }),
  })
}

export function useSyncGoogleSheets() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: () => syncGoogleSheets(),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['finance'] }),
  })
}

export function useSyncGmailHistorical() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: () => syncGmailHistorical(),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['finance'] }),
  })
}

export function usePollGmailNew() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (maxMessages?: number) => pollGmailNew(maxMessages),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['finance'] })
      queryClient.invalidateQueries({ queryKey: ['finance', 'notifications'] })
    },
  })
}

export function useIntegrationsStatus(options?: { enabled?: boolean }) {
  return useQuery({
    queryKey: ['finance', 'integrations', 'status'],
    queryFn: () => fetchIntegrationsStatus(),
    enabled: options?.enabled ?? true,
  })
}

export function useGmailConnection() {
  return useQuery({
    queryKey: ['finance', 'integrations', 'gmail'],
    queryFn: () => fetchGmailConnection(),
  })
}

export function useGmailPollStatus() {
  return useQuery({
    queryKey: ['finance', 'integrations', 'gmail-poll-status'],
    queryFn: () => fetchGmailPollStatus(),
    refetchInterval: 15000,
  })
}

export function useConnectGmail() {
  return useMutation({
    mutationFn: () => startGmailOAuth(),
    onSuccess: (url) => {
      window.location.href = url
    },
  })
}

export function useDisconnectGmail() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: () => disconnectGmail(),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['finance', 'integrations'] })
    },
  })
}

export function useIntegrationSettingsList() {
  return useQuery({
    queryKey: ['finance', 'integrations', 'settings'],
    queryFn: () => fetchIntegrationSettingsList(),
    staleTime: 30_000,
  })
}

export function useIsIntegrationEnabled(key: string, defaultEnabled = false) {
  const { data: settings } = useIntegrationSettingsList()
  const item = settings?.find((entry) => entry.key === key)
  if (!settings) return { enabled: defaultEnabled, ready: false }
  return { enabled: item?.is_enabled ?? defaultEnabled, ready: true }
}

export function useUpdateIntegrationSetting() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: ({
      key,
      isEnabled,
      configValue,
    }: {
      key: string
      isEnabled?: boolean
      configValue?: string
    }) =>
      updateIntegrationSetting(key, {
        ...(isEnabled !== undefined ? { is_enabled: isEnabled } : {}),
        ...(configValue !== undefined ? { config_value: configValue } : {}),
      }),
    onMutate: async ({ key, isEnabled, configValue }) => {
      if (isEnabled === undefined && configValue === undefined) return undefined

      await queryClient.cancelQueries({ queryKey: ['finance', 'integrations', 'settings'] })
      const previous = queryClient.getQueryData<IntegrationSettingItem[]>([
        'finance',
        'integrations',
        'settings',
      ])

      if (previous && isEnabled !== undefined) {
        queryClient.setQueryData<IntegrationSettingItem[]>(
          ['finance', 'integrations', 'settings'],
          previous.map((item) => (item.key === key ? { ...item, is_enabled: isEnabled } : item)),
        )
      }

      return { previous }
    },
    onError: (_error, _variables, context) => {
      if (context?.previous) {
        queryClient.setQueryData(['finance', 'integrations', 'settings'], context.previous)
      }
    },
    onSuccess: (updated) => {
      queryClient.setQueryData<IntegrationSettingItem[]>(
        ['finance', 'integrations', 'settings'],
        (current) =>
          current?.map((item) => (item.key === updated.key ? { ...item, ...updated } : item)) ?? current,
      )
    },
    onSettled: (_data, _error, variables) => {
      if (!variables) return
      void queryClient.invalidateQueries({ queryKey: ['finance', 'integrations', 'status'] })
      if (variables.key?.startsWith('gmail')) {
        void queryClient.invalidateQueries({ queryKey: ['finance', 'integrations', 'gmail'] })
      }
    },
  })
}

export function useNotifications(limit = 20) {
  return useQuery({
    queryKey: ['finance', 'notifications', limit],
    queryFn: () => fetchNotifications(limit),
  })
}

export function useMarkAllNotificationsRead() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: () => markAllNotificationsRead(),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['finance', 'notifications'] })
    },
  })
}

export function useVoucherOcr() {
  return useMutation({
    mutationFn: (file: File) => extractVoucherOcr(file),
  })
}

export function useExportReports() {
  return {
    exportExcel: async (filters?: FinanceFilters) => {
      try {
        await downloadExcelReport(filters)
      } catch (error) {
        await alertError(
          'Error al exportar Excel',
          error instanceof Error ? error.message : 'No se pudo generar el archivo.',
        )
      }
    },
    exportPdf: async (filters?: FinanceFilters) => {
      try {
        await downloadPdfReport(filters)
      } catch (error) {
        await alertError(
          'Error al exportar PDF',
          error instanceof Error ? error.message : 'No se pudo generar el archivo.',
        )
      }
    },
  }
}
