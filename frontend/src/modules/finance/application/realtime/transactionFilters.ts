import type { FinanceFilters } from '../../domain/models/finance.types'
import { firstDayOfMonthIsoDate, todayIsoDate } from '../utils/formatters'

export function normalizeTransactionFilters(filters: FinanceFilters): FinanceFilters {
  const normalized: FinanceFilters = {
    from: filters.from ?? firstDayOfMonthIsoDate(),
    to: filters.to ?? todayIsoDate(),
    page: filters.page ?? 1,
    page_size: filters.page_size ?? 20,
  }
  if (filters.movement_type) normalized.movement_type = filters.movement_type
  if (filters.search?.trim()) normalized.search = filters.search.trim()
  return normalized
}

export function transactionQueryKey(filters: FinanceFilters) {
  return ['finance', 'transactions', normalizeTransactionFilters(filters)] as const
}
