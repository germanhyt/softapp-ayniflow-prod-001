import { ArrowLeftRight, BarChart3, FileSpreadsheet, FileText, Wallet } from 'lucide-react'
import { useMemo, useState } from 'react'
import { Link } from 'react-router-dom'

import { CategoryChip } from '../../../core/components/CategoryChip'
import { FilterField, FilterPanel } from '../../../core/components/FilterField'
import { ChartSkeleton } from '../../../core/components/skeleton/ChartSkeleton'
import { HealthBadge } from '../../../core/components/HealthBadge'
import { PageHeader } from '../../../core/components/PageHeader'
import { ProgressBar } from '../../../core/components/ProgressBar'
import { StatSummary } from '../../../core/components/StatSummary'
import { ensureArray } from '../../../core/utils/collections'
import { hasPermission, useCurrentUser } from '../../auth/application/hooks/useAuth'
import {
  useBudgetHealthBreakdown,
  useExportReports,
  useFinanceSummary,
  useTransactions,
} from '../application/hooks/useFinance'
import { colorForCategory } from '../application/utils/chartColors'
import {
  formatCurrency,
  currentMonthYear,
  firstDayOfMonthIsoDate,
  todayIsoDate,
} from '../application/utils/formatters'
import type { FinanceFilters, MovementType, Transaction } from '../domain/models/finance.types'
import { BalanceByDayChart } from './components/BalanceByDayChart'
import { BudgetHealthModal } from './components/BudgetHealthModal'
import { HourlyTrendChart } from './components/HourlyTrendChart'
import { PaymentTypePieChart } from './components/PaymentTypePieChart'
import { CategoryPieChart } from './components/CategoryPieChart'

export function FinanceOverviewPage() {
  const { data: user } = useCurrentUser()
  const canWrite = hasPermission(user, 'finance:write')
  const [healthModalOpen, setHealthModalOpen] = useState(false)
  const [healthModalTab, setHealthModalTab] = useState<'at_risk' | 'exceeded'>('at_risk')

  const [filters, setFilters] = useState<FinanceFilters>({
    from: firstDayOfMonthIsoDate(),
    to: todayIsoDate(),
  })
  const monthYear =
    filters.from && filters.from.length >= 7 ? filters.from.slice(0, 7) : currentMonthYear()

  const { data: summary, isLoading: summaryLoading } = useFinanceSummary(filters)
  const { data: transactionsData } = useTransactions({ ...filters, page: 1, page_size: 200 })
  const transactions = ensureArray<Transaction>(transactionsData?.items)
  const { data: budgetHealth } = useBudgetHealthBreakdown(monthYear)
  const { exportExcel, exportPdf } = useExportReports()

  const totalRows =
    (budgetHealth?.ok_count ?? 0) +
    (budgetHealth?.at_risk_count ?? 0) +
    (budgetHealth?.exceeded_count ?? 0)

  const remaining = useMemo(() => {
    const budgeted = Number(budgetHealth?.total_budgeted ?? 0)
    const actual = Number(budgetHealth?.total_actual ?? 0)
    return budgeted - actual
  }, [budgetHealth])

  const openHealthModal = (tab: 'at_risk' | 'exceeded') => {
    setHealthModalTab(tab)
    setHealthModalOpen(true)
  }
  const categoryRows = ensureArray<{ category: string; amount: string; count: number }>(
    summary?.by_category,
  )
  const categoryTotal = categoryRows.reduce((sum, row) => sum + Number(row.amount), 0)
  const recentTx = transactions.slice(0, 8)
  const balance = Number(summary?.balance ?? 0)

  return (
    <div className="module-page">
      <PageHeader
        title="Análisis financiero"
        description="Resumen visual del mes: balance, salud de presupuestos y hábitos de gasto."
        icon={BarChart3}
        actions={
          <>
            {canWrite && (
              <Link to="/finance/transactions" className="btn-primary inline-flex items-center gap-2">
                <ArrowLeftRight size={16} />
                Gestionar transacciones
              </Link>
            )}
            <button
              type="button"
              onClick={() => exportExcel(filters)}
              className="btn-secondary inline-flex items-center gap-2"
            >
              <FileSpreadsheet size={16} />
              Excel
            </button>
            <button
              type="button"
              onClick={() => exportPdf(filters)}
              className="btn-secondary inline-flex items-center gap-2"
            >
              <FileText size={16} />
              PDF
            </button>
          </>
        }
      />

      <FilterPanel columns={4}>
        <FilterField label="Desde">
          <input
            type="date"
            value={filters.from ?? ''}
            onChange={(e) => setFilters((prev) => ({ ...prev, from: e.target.value || undefined }))}
            className="input-field"
          />
        </FilterField>
        <FilterField label="Hasta">
          <input
            type="date"
            value={filters.to ?? ''}
            onChange={(e) => setFilters((prev) => ({ ...prev, to: e.target.value || undefined }))}
            className="input-field"
          />
        </FilterField>
        <FilterField label="Movimiento">
          <select
            value={filters.movement_type ?? ''}
            onChange={(e) =>
              setFilters((prev) => ({
                ...prev,
                movement_type: (e.target.value as MovementType) || undefined,
              }))
            }
            className="input-field"
          >
            <option value="">Todos</option>
            <option value="Ingreso">Ingreso</option>
            <option value="Egreso">Egreso</option>
          </select>
        </FilterField>
        <FilterField label="Buscar">
          <input
            type="text"
            placeholder="Concepto, destinatario..."
            value={filters.search ?? ''}
            onChange={(e) =>
              setFilters((prev) => ({ ...prev, search: e.target.value || undefined }))
            }
            className="input-field"
          />
        </FilterField>
      </FilterPanel>

      <section className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <StatSummary
          label="Ingresos"
          value={summaryLoading ? '…' : formatCurrency(summary?.total_income ?? 0)}
          tone="success"
        />
        <StatSummary
          label="Egresos"
          value={summaryLoading ? '…' : formatCurrency(summary?.total_expense ?? 0)}
          tone="danger"
        />
        <StatSummary
          label="Balance"
          value={summaryLoading ? '…' : formatCurrency(balance)}
          tone={balance >= 0 ? 'info' : 'warning'}
        />
        <StatSummary
          label="Transacciones"
          value={summaryLoading ? '…' : String(summary?.transaction_count ?? 0)}
        />
      </section>

      <section className="card space-y-4">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <h3 className="font-medium">Salud presupuestaria ({monthYear})</h3>
          <Link to="/finance/budgets" className="btn-secondary inline-flex items-center gap-2 text-sm">
            <Wallet size={16} />
            Presupuestos
          </Link>
        </div>
        {totalRows > 0 ? (
          <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
            <StatSummary
              label="Presupuestado"
              value={formatCurrency(budgetHealth?.total_budgeted ?? 0)}
            />
            <StatSummary
              label="Ejecutado"
              value={formatCurrency(budgetHealth?.total_actual ?? 0)}
              tone="info"
            />
            <StatSummary
              label="Restante"
              value={formatCurrency(remaining)}
              tone={remaining < 0 ? 'danger' : 'success'}
              hint={remaining < 0 ? 'Por encima del plan' : 'Disponible del mes'}
            />
            <div className="stat-summary space-y-3">
              <div className="flex items-center justify-between gap-2">
                <div>
                  <p className="stat-summary__label">En riesgo</p>
                  <p className="stat-summary__value">{budgetHealth?.at_risk_count ?? 0}</p>
                </div>
                <button
                  type="button"
                  className="btn-secondary text-xs"
                  onClick={() => openHealthModal('at_risk')}
                >
                  Ver
                </button>
              </div>
              <div className="flex items-center justify-between gap-2 border-t pt-3" style={{ borderColor: 'var(--premium-border)' }}>
                <div>
                  <p className="stat-summary__label">Excedidos</p>
                  <p className="stat-summary__value text-(--premium-danger)">
                    {budgetHealth?.exceeded_count ?? 0}
                  </p>
                </div>
                <button
                  type="button"
                  className="btn-secondary text-xs"
                  onClick={() => openHealthModal('exceeded')}
                >
                  Ver
                </button>
              </div>
            </div>
          </div>
        ) : (
          <div className="empty-state py-8">
            <div className="empty-state__icon">
              <Wallet size={24} />
            </div>
            <p className="text-sm text-muted">No hay presupuestos cargados para este mes.</p>
            <Link to="/finance/budgets" className="btn-secondary text-sm">
              Ir a presupuestos
            </Link>
          </div>
        )}
      </section>

      <section className="grid gap-4 xl:grid-cols-2">
        <div className="chart-panel">
          <h3 className="mb-3 font-medium">Balance por día</h3>
          {summaryLoading ? (
            <ChartSkeleton height={280} variant="line" />
          ) : (
            <BalanceByDayChart data={summary?.daily_balances ?? []} />
          )}
        </div>
        <div className="chart-panel">
          <h3 className="mb-3 font-medium">Distribución por tipo de pago</h3>
          {summaryLoading ? (
            <ChartSkeleton height={240} variant="pie" />
          ) : (
            <PaymentTypePieChart data={summary?.by_payment_type ?? []} />
          )}
        </div>
        <div className="chart-panel xl:col-span-2">
          <h3 className="mb-3 font-medium">Distribución por categoría</h3>
          <div className="grid gap-4 lg:grid-cols-2">
            <CategoryPieChart data={categoryRows} />
            <div className="space-y-2">
              {categoryRows.length ? (
                categoryRows.slice(0, 8).map((row, index) => {
                  const amount = Number(row.amount)
                  const percent = categoryTotal > 0 ? (amount / categoryTotal) * 100 : 0
                  return (
                    <div key={row.category} className="budget-card space-y-2 !rounded-xl !p-3">
                      <div className="flex items-center justify-between gap-3">
                        <CategoryChip
                          name={row.category}
                          color={colorForCategory(row.category, index)}
                          size="sm"
                        />
                        <div className="text-right">
                          <p className="text-sm font-semibold tabular-nums">{formatCurrency(amount)}</p>
                          <p className="text-xs text-muted">{row.count} ops</p>
                        </div>
                      </div>
                      <ProgressBar value={percent} variant="primary" showLabel size="md" />
                    </div>
                  )
                })
              ) : (
                <p className="py-6 text-center text-sm text-muted">Sin categorías para el rango actual.</p>
              )}
            </div>
          </div>
        </div>
        <div className="chart-panel xl:col-span-2">
          <h3 className="mb-3 font-medium">Tendencia por hora (ingresos vs egresos)</h3>
          {summaryLoading ? (
            <ChartSkeleton height={280} variant="bar" />
          ) : (
            <HourlyTrendChart transactions={transactions} />
          )}
        </div>
      </section>

      <section className="space-y-3">
        <div className="flex items-center justify-between gap-2">
          <h3 className="font-medium">Últimas transacciones</h3>
          <Link to="/finance/transactions" className="text-sm text-premium-primary hover:underline">
            Ver todas
          </Link>
        </div>

        <div className="space-y-2 lg:hidden">
          {recentTx.length ? (
            recentTx.map((tx) => <RecentTxCard key={tx.id} tx={tx} />)
          ) : (
            <p className="py-6 text-center text-sm text-muted">
              No hay transacciones para los filtros seleccionados.
            </p>
          )}
        </div>

        <div className="table-shell hidden lg:block">
          <table className="min-w-full text-left text-sm">
            <thead className="table-head">
              <tr>
                <th className="px-4 py-3">Fecha</th>
                <th className="px-4 py-3">Movimiento</th>
                <th className="px-4 py-3">Concepto</th>
                <th className="px-4 py-3">Monto</th>
              </tr>
            </thead>
            <tbody>
              {recentTx.map((tx) => (
                <tr key={tx.id} className="table-row">
                  <td className="px-4 py-3 whitespace-nowrap text-muted">{tx.transaction_date}</td>
                  <td className="px-4 py-3">
                    <MovementBadge type={tx.movement_type} />
                  </td>
                  <td className="px-4 py-3">{tx.concept}</td>
                  <td
                    className={`px-4 py-3 font-medium tabular-nums ${
                      tx.movement_type === 'Egreso' ? 'text-(--premium-danger)' : 'text-premium-primary'
                    }`}
                  >
                    {tx.movement_type === 'Egreso' ? '−' : '+'}
                    {formatCurrency(tx.amount)}
                  </td>
                </tr>
              ))}
              {!recentTx.length && (
                <tr>
                  <td className="px-4 py-6 text-center text-muted" colSpan={4}>
                    No hay transacciones para los filtros seleccionados.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </section>

      <BudgetHealthModal
        isOpen={healthModalOpen}
        onClose={() => setHealthModalOpen(false)}
        breakdown={budgetHealth}
        initialTab={healthModalTab}
      />
    </div>
  )
}

function RecentTxCard({ tx }: { tx: Transaction }) {
  const isExpense = tx.movement_type === 'Egreso'
  return (
    <article className="budget-card flex items-center justify-between gap-3 !rounded-xl !p-3">
      <div className="min-w-0">
        <p className="truncate font-medium">{tx.concept}</p>
        <div className="mt-1 flex items-center gap-2">
          <MovementBadge type={tx.movement_type} />
          <span className="text-xs text-muted">{tx.transaction_date}</span>
        </div>
      </div>
      <p
        className={`shrink-0 font-semibold tabular-nums ${
          isExpense ? 'text-(--premium-danger)' : 'text-premium-primary'
        }`}
      >
        {isExpense ? '−' : '+'}
        {formatCurrency(tx.amount)}
      </p>
    </article>
  )
}

function MovementBadge({ type }: { type: string }) {
  const isExpense = type === 'Egreso'
  return (
    <HealthBadge
      label={type}
      tone={isExpense ? 'danger' : 'success'}
    />
  )
}

