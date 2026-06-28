import { ArrowLeftRight, FileSpreadsheet, FileText, Wallet } from 'lucide-react'
import { useState } from 'react'
import { Link } from 'react-router-dom'

import { hasPermission, useCurrentUser } from '../../auth/application/hooks/useAuth'
import {
  formatCurrency,
  currentMonthYear,
  firstDayOfMonthIsoDate,
  todayIsoDate,
} from '../application/utils/formatters'
import {
  useBudgetHealthBreakdown,
  useExportReports,
  useFinanceSummary,
  useTransactions,
} from '../application/hooks/useFinance'
import type { FinanceFilters, MovementType } from '../domain/models/finance.types'
import { BalanceByDayChart } from './components/BalanceByDayChart'
import { BudgetHealthModal } from './components/BudgetHealthModal'
import { HourlyTrendChart } from './components/HourlyTrendChart'
import { PaymentTypePieChart } from './components/PaymentTypePieChart'

export function FinanceOverviewPage() {
  const { data: user } = useCurrentUser()
  const canWrite = hasPermission(user, 'finance:write')
  const [healthModalOpen, setHealthModalOpen] = useState(false)
  const [healthModalTab, setHealthModalTab] = useState<'at_risk' | 'exceeded'>('at_risk')

  const [filters, setFilters] = useState<FinanceFilters>({
    from: firstDayOfMonthIsoDate(),
    to: todayIsoDate(),
  })
  const monthYear = (filters.from && filters.from.length >= 7 ? filters.from.slice(0, 7) : currentMonthYear())

  const { data: summary, isLoading: summaryLoading } = useFinanceSummary(filters)
  const { data: transactionsData } = useTransactions({ ...filters, page: 1, page_size: 200 })
  const transactions = transactionsData?.items ?? []
  const { data: budgetHealth } = useBudgetHealthBreakdown(monthYear)
  const { exportExcel, exportPdf } = useExportReports()

  const totalRows =
    (budgetHealth?.ok_count ?? 0) +
    (budgetHealth?.at_risk_count ?? 0) +
    (budgetHealth?.exceeded_count ?? 0)

  const openHealthModal = (tab: 'at_risk' | 'exceeded') => {
    setHealthModalTab(tab)
    setHealthModalOpen(true)
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h2 className="text-xl font-semibold">Análisis financiero</h2>
          <p className="text-sm text-muted">
            Métricas, gráficos y tendencias inspiradas en finanzas-negocio.
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          {canWrite && (
            <Link to="/finance/transactions" className="btn-primary inline-flex items-center gap-2">
              <ArrowLeftRight size={16} />
              Gestionar transacciones
            </Link>
          )}
          <button type="button" onClick={() => exportExcel(filters)} className="btn-secondary inline-flex items-center gap-2">
            <FileSpreadsheet size={16} />
            Excel
          </button>
          <button type="button" onClick={() => exportPdf(filters)} className="btn-secondary inline-flex items-center gap-2">
            <FileText size={16} />
            PDF
          </button>
        </div>
      </div>

      <section className="card grid gap-4 md:grid-cols-4">
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
            onChange={(e) => setFilters((prev) => ({ ...prev, search: e.target.value || undefined }))}
            className="input-field"
          />
        </FilterField>
      </section>

      <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard label="Ingresos" value={summaryLoading ? '...' : formatCurrency(summary?.total_income ?? 0)} tone="income" />
        <StatCard label="Egresos" value={summaryLoading ? '...' : formatCurrency(summary?.total_expense ?? 0)} tone="expense" />
        <StatCard label="Balance" value={summaryLoading ? '...' : formatCurrency(summary?.balance ?? 0)} tone="balance" />
        <StatCard label="Transacciones" value={summaryLoading ? '...' : String(summary?.transaction_count ?? 0)} tone="neutral" />
      </section>

      <section className="card space-y-3">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <h3 className="font-medium">Salud presupuestaria ({monthYear})</h3>
          <Link to="/finance/budgets" className="btn-secondary inline-flex items-center gap-2 text-sm">
            <Wallet size={16} />
            Presupuestos
          </Link>
        </div>
        {totalRows > 0 ? (
          <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
            <StatCard label="Presupuestado" value={formatCurrency(budgetHealth?.total_budgeted ?? 0)} tone="neutral" />
            <StatCard label="Ejecutado" value={formatCurrency(budgetHealth?.total_actual ?? 0)} tone="expense" />
            <div className="stat-card stat-card-balance">
              <p className="text-sm text-muted">En riesgo (80–99%)</p>
              <div className="mt-1 flex items-center justify-between gap-2">
                <p className="text-xl font-semibold">{budgetHealth?.at_risk_count ?? 0}</p>
                <button type="button" className="btn-secondary text-xs" onClick={() => openHealthModal('at_risk')}>
                  Ver detalle
                </button>
              </div>
            </div>
            <div className="stat-card stat-card-expense">
              <p className="text-sm text-muted">Excedidos (≥100%)</p>
              <div className="mt-1 flex items-center justify-between gap-2">
                <p className="text-xl font-semibold">{budgetHealth?.exceeded_count ?? 0}</p>
                <button type="button" className="btn-secondary text-xs" onClick={() => openHealthModal('exceeded')}>
                  Ver detalle
                </button>
              </div>
            </div>
          </div>
        ) : (
          <p className="text-sm text-muted">No hay presupuestos cargados para este mes.</p>
        )}
      </section>

      <section className="grid gap-4 xl:grid-cols-2">
        <div className="chart-panel">
          <h3 className="mb-3 font-medium">Balance por día</h3>
          <BalanceByDayChart data={summary?.daily_balances ?? []} />
        </div>
        <div className="chart-panel">
          <h3 className="mb-3 font-medium">Distribución por tipo de pago</h3>
          <PaymentTypePieChart data={summary?.by_payment_type ?? []} />
        </div>
        <div className="chart-panel xl:col-span-2">
          <h3 className="mb-3 font-medium">Tendencia por hora (ingresos vs egresos)</h3>
          <HourlyTrendChart transactions={transactions} />
        </div>
      </section>

      <section className="table-shell">
        <div className="flex items-center justify-between border-b px-4 py-3" style={{ borderColor: 'var(--premium-border)' }}>
          <h3 className="font-medium">Últimas transacciones</h3>
          <Link to="/finance/transactions" className="text-sm text-premium-primary hover:underline">
            Ver todas
          </Link>
        </div>
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
            {transactions.slice(0, 8).map((tx) => (
              <tr key={tx.id} className="table-row">
                <td className="px-4 py-3">{tx.transaction_date}</td>
                <td className="px-4 py-3">{tx.movement_type}</td>
                <td className="px-4 py-3">{tx.concept}</td>
                <td className="px-4 py-3">{formatCurrency(tx.amount)}</td>
              </tr>
            ))}
            {!transactions.length && (
              <tr>
                <td className="px-4 py-3 text-muted" colSpan={4}>
                  No hay transacciones para los filtros seleccionados.
                </td>
              </tr>
            )}
          </tbody>
        </table>
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

function FilterField({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label className="block space-y-1 text-sm">
      <span className="font-medium">{label}</span>
      {children}
    </label>
  )
}

function StatCard({
  label,
  value,
  tone,
}: {
  label: string
  value: string
  tone: 'income' | 'expense' | 'balance' | 'neutral'
}) {
  const toneClass = {
    income: 'stat-card-income',
    expense: 'stat-card-expense',
    balance: 'stat-card-balance',
    neutral: '',
  }[tone]

  return (
    <div className={`stat-card ${toneClass}`}>
      <p className="text-sm text-muted">{label}</p>
      <p className="mt-1 text-xl font-semibold">{value}</p>
    </div>
  )
}
