import type { FinanceFilters, PaginatedResponse, Transaction } from '../../domain/models/finance.types'

export type FinanceWsMessage =
  | { type: 'connected'; user_id: number }
  | {
      type: 'transactions.preload'
      filters: FinanceFilters
      data: PaginatedResponse<Transaction>
    }
  | {
      type: 'transactions.changed'
      action: string
      transaction_id?: number | null
      transaction?: Transaction | null
    }
  | { type: 'notifications.changed' }
  | { type: 'webhook_events.changed' }
  | { type: 'finance.invalidate'; scope?: string }
  | { type: 'pong' }
