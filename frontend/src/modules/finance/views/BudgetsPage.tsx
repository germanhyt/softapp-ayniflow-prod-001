import { Pencil, Plus, Trash2, Wallet } from 'lucide-react'
import { useMemo, useState } from 'react'

import { CategoryChip } from '../../../core/components/CategoryChip'
import { HealthBadge } from '../../../core/components/HealthBadge'
import { PaginationControls } from '../../../core/components/PaginationControls'
import { ProgressBar } from '../../../core/components/ProgressBar'
import { StatSummary } from '../../../core/components/StatSummary'
import { alertSuccess, confirmAction } from '../../../core/utils/alerts'
import { hasPermission, useCurrentUser } from '../../auth/application/hooks/useAuth'
import { useCatalog } from '../application/hooks/useCatalog'
import {
  useBudgetHealthBreakdown,
  useBudgets,
  useDeleteBudget,
} from '../application/hooks/useFinance'
import {
  budgetHealthLabel,
  budgetHealthProgressVariant,
  budgetHealthTone,
  budgetProgressValue,
  getBudgetHealthStatus,
} from '../application/utils/budgetHealth'
import { colorForCategory } from '../application/utils/chartColors'
import { currentMonthYear, formatCurrency, formatRegisteredAt } from '../application/utils/formatters'
import type { Budget, PageSize } from '../domain/models/finance.types'
import { BudgetModal } from './components/BudgetModal'

type HealthFilter = 'all' | 'ok' | 'risk' | 'exceeded'

export function BudgetsPage() {
  const { data: user } = useCurrentUser()
  const canWrite = hasPermission(user, 'finance:write')
  const [monthYear, setMonthYear] = useState(currentMonthYear())
  const [categoryFilter, setCategoryFilter] = useState('')
  const [healthFilter, setHealthFilter] = useState<HealthFilter>('all')
  const [page, setPage] = useState(1)
  const [pageSize, setPageSize] = useState<PageSize>(20)
  const [modalOpen, setModalOpen] = useState(false)
  const [editing, setEditing] = useState<Budget | null>(null)

  const { data, isLoading } = useBudgets({
    month_year: monthYear,
    category: categoryFilter || undefined,
    health: healthFilter,
    page,
    page_size: pageSize,
  })
  const { data: budgetHealth } = useBudgetHealthBreakdown(monthYear)
  const deleteBudget = useDeleteBudget()
  const { data: categories = [] } = useCatalog('categories')

  const budgets = data?.items ?? []
  const meta = data?.meta ?? { total: 0, page: 1, page_size: pageSize, total_pages: 1 }

  const remaining = useMemo(() => {
    const budgeted = Number(budgetHealth?.total_budgeted ?? 0)
    const actual = Number(budgetHealth?.total_actual ?? 0)
    return budgeted - actual
  }, [budgetHealth])

  const handleFilterChange = <T,>(setter: (value: T) => void, value: T) => {
    setter(value)
    setPage(1)
  }

  const handleDelete = async (budget: Budget) => {
    const confirmed = await confirmAction(
      'Eliminar presupuesto',
      `¿Eliminar el presupuesto de "${budget.category}" (${budget.month_year})?`,
      'Eliminar',
    )
    if (!confirmed) return
    await deleteBudget.mutateAsync(budget.id)
    await alertSuccess('Presupuesto eliminado')
  }

  const openCreate = () => {
    setEditing(null)
    setModalOpen(true)
  }

  const openEdit = (budget: Budget) => {
    setEditing(budget)
    setModalOpen(true)
  }

  const closeModal = () => {
    setModalOpen(false)
    setEditing(null)
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h2 className="text-xl font-semibold tracking-tight">Presupuestos</h2>
          <p className="text-sm text-muted">
            Vista clara de lo planificado versus lo gastado, por categoría.
          </p>
        </div>
        {canWrite && (
          <button type="button" onClick={openCreate} className="btn-primary inline-flex items-center gap-2">
            <Plus size={16} />
            Nuevo presupuesto
          </button>
        )}
      </div>

      <section className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <StatSummary
          label="Presupuestado"
          value={formatCurrency(budgetHealth?.total_budgeted ?? 0)}
          hint={monthYear}
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
        <StatSummary
          label="Alertas"
          value={String((budgetHealth?.at_risk_count ?? 0) + (budgetHealth?.exceeded_count ?? 0))}
          tone={
            (budgetHealth?.exceeded_count ?? 0) > 0
              ? 'danger'
              : (budgetHealth?.at_risk_count ?? 0) > 0
                ? 'warning'
                : 'success'
          }
          hint={`${budgetHealth?.at_risk_count ?? 0} riesgo · ${budgetHealth?.exceeded_count ?? 0} excedidos`}
        />
      </section>

      <section className="card grid gap-4 md:grid-cols-3">
        <FilterField label="Mes">
          <input
            type="month"
            value={monthYear}
            onChange={(e) => handleFilterChange(setMonthYear, e.target.value)}
            className="input-field"
          />
        </FilterField>
        <FilterField label="Categoría">
          <select
            value={categoryFilter}
            onChange={(e) => handleFilterChange(setCategoryFilter, e.target.value)}
            className="input-field"
          >
            <option value="">Todas</option>
            {categories.map((item) => (
              <option key={item.id} value={item.name}>
                {item.name}
              </option>
            ))}
          </select>
        </FilterField>
        <FilterField label="Salud">
          <select
            value={healthFilter}
            onChange={(e) => handleFilterChange(setHealthFilter, e.target.value as HealthFilter)}
            className="input-field"
          >
            <option value="all">Todas</option>
            <option value="ok">Dentro del plan (&lt;80%)</option>
            <option value="risk">En riesgo (80-99%)</option>
            <option value="exceeded">Excedidos (≥100%)</option>
          </select>
        </FilterField>
      </section>

      {/* Mobile / tablet: cards estilo Spendee */}
      <div className="space-y-3 lg:hidden">
        {isLoading ? (
          Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="budget-card space-y-3">
              <div className="skeleton h-8 w-40" />
              <div className="skeleton h-2.5 w-full" />
              <div className="skeleton h-4 w-28" />
            </div>
          ))
        ) : budgets.length ? (
          budgets.map((budget, index) => (
            <BudgetCard
              key={budget.id}
              budget={budget}
              color={colorForCategory(budget.category, index)}
              canWrite={canWrite}
              onEdit={() => openEdit(budget)}
              onDelete={() => handleDelete(budget)}
            />
          ))
        ) : (
          <EmptyBudgets canWrite={canWrite} onCreate={openCreate} />
        )}
      </div>

      {/* Desktop: tabla con progreso */}
      <div className="table-shell hidden overflow-x-auto lg:block">
        <table className="min-w-full text-left text-sm">
          <thead className="table-head">
            <tr>
              <th className="px-4 py-3">Categoría</th>
              <th className="min-w-48 px-4 py-3">Progreso</th>
              <th className="px-4 py-3">Presupuestado</th>
              <th className="px-4 py-3">Real</th>
              <th className="px-4 py-3">Diferencia</th>
              <th className="px-4 py-3 whitespace-nowrap">Actualizado</th>
              {canWrite && <th className="px-4 py-3">Acciones</th>}
            </tr>
          </thead>
          <tbody>
            {isLoading ? (
              <tr>
                <td className="px-4 py-6" colSpan={canWrite ? 7 : 6}>
                  <div className="space-y-2">
                    <div className="skeleton h-4 w-full max-w-md" />
                    <div className="skeleton h-4 w-full max-w-sm" />
                  </div>
                </td>
              </tr>
            ) : budgets.length ? (
              budgets.map((budget, index) => {
                const status = getBudgetHealthStatus(budget.percentage)
                const pct = budgetProgressValue(budget.percentage)
                return (
                  <tr key={budget.id} className="table-row">
                    <td className="px-4 py-3">
                      <div className="flex flex-col gap-1.5">
                        <CategoryChip
                          name={budget.category}
                          color={colorForCategory(budget.category, index)}
                          size="sm"
                        />
                        <span className="pl-9 text-xs text-muted">{budget.month_year}</span>
                      </div>
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex flex-col gap-1.5">
                        <ProgressBar
                          value={pct}
                          variant={budgetHealthProgressVariant(status)}
                          showLabel
                          size="lg"
                        />
                        <HealthBadge label={budgetHealthLabel(status)} tone={budgetHealthTone(status)} />
                      </div>
                    </td>
                    <td className="px-4 py-3 tabular-nums">{formatCurrency(budget.budgeted_amount)}</td>
                    <td className="px-4 py-3 tabular-nums">{formatCurrency(budget.actual_amount)}</td>
                    <td className="px-4 py-3 tabular-nums">{formatCurrency(budget.difference)}</td>
                    <td className="px-4 py-3 whitespace-nowrap text-muted">
                      {formatRegisteredAt(budget.updated_at)}
                    </td>
                    {canWrite && (
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-2">
                          <button
                            type="button"
                            onClick={() => openEdit(budget)}
                            className="btn-ghost inline-flex items-center gap-1"
                            aria-label={`Editar ${budget.category}`}
                          >
                            <Pencil size={14} />
                            Editar
                          </button>
                          <button
                            type="button"
                            onClick={() => handleDelete(budget)}
                            className="btn-ghost inline-flex items-center gap-1 text-(--premium-danger)"
                            aria-label={`Eliminar ${budget.category}`}
                          >
                            <Trash2 size={14} />
                            Eliminar
                          </button>
                        </div>
                      </td>
                    )}
                  </tr>
                )
              })
            ) : (
              <tr>
                <td className="px-4 py-3" colSpan={canWrite ? 7 : 6}>
                  <EmptyBudgets canWrite={canWrite} onCreate={openCreate} />
                </td>
              </tr>
            )}
          </tbody>
        </table>
        {(budgets.length > 0 || isLoading) && (
          <PaginationControls
            meta={meta}
            pageSize={pageSize}
            onPageChange={setPage}
            onPageSizeChange={(size) => {
              setPageSize(size)
              setPage(1)
            }}
          />
        )}
      </div>

      {budgets.length > 0 && !isLoading && (
        <div className="lg:hidden">
          <PaginationControls
            meta={meta}
            pageSize={pageSize}
            onPageChange={setPage}
            onPageSizeChange={(size) => {
              setPageSize(size)
              setPage(1)
            }}
          />
        </div>
      )}

      {canWrite && (
        <BudgetModal
          isOpen={modalOpen}
          onClose={closeModal}
          categories={categories}
          editing={editing}
          defaultMonthYear={monthYear}
        />
      )}
    </div>
  )
}

function BudgetCard({
  budget,
  color,
  canWrite,
  onEdit,
  onDelete,
}: {
  budget: Budget
  color: string
  canWrite: boolean
  onEdit: () => void
  onDelete: () => void
}) {
  const status = getBudgetHealthStatus(budget.percentage)
  const pct = budgetProgressValue(budget.percentage)

  return (
    <article className="budget-card space-y-3">
      <div className="flex items-start justify-between gap-3">
        <CategoryChip name={budget.category} color={color} />
        <HealthBadge label={budgetHealthLabel(status)} tone={budgetHealthTone(status)} />
      </div>

      <ProgressBar value={pct} variant={budgetHealthProgressVariant(status)} showLabel size="lg" />

      <div className="grid grid-cols-3 gap-2 text-sm">
        <div>
          <p className="text-xs text-muted">Plan</p>
          <p className="font-medium tabular-nums">{formatCurrency(budget.budgeted_amount)}</p>
        </div>
        <div>
          <p className="text-xs text-muted">Real</p>
          <p className="font-medium tabular-nums">{formatCurrency(budget.actual_amount)}</p>
        </div>
        <div className="text-right">
          <p className="text-xs text-muted">Diff</p>
          <p className="font-medium tabular-nums">{formatCurrency(budget.difference)}</p>
        </div>
      </div>

      {canWrite && (
        <div className="flex items-center gap-2 border-t pt-3" style={{ borderColor: 'var(--premium-border)' }}>
          <button type="button" onClick={onEdit} className="btn-secondary flex-1 inline-flex items-center justify-center gap-1.5">
            <Pencil size={14} />
            Editar
          </button>
          <button
            type="button"
            onClick={onDelete}
            className="btn-ghost inline-flex items-center justify-center gap-1.5 text-(--premium-danger)"
          >
            <Trash2 size={14} />
          </button>
        </div>
      )}
    </article>
  )
}

function EmptyBudgets({ canWrite, onCreate }: { canWrite: boolean; onCreate: () => void }) {
  return (
    <div className="empty-state">
      <div className="empty-state__icon">
        <Wallet size={28} />
      </div>
      <div>
        <p className="font-medium">Sin presupuestos en este filtro</p>
        <p className="mt-1 text-sm text-muted">
          Crea un presupuesto por categoría para ver el progreso del mes.
        </p>
      </div>
      {canWrite && (
        <button type="button" onClick={onCreate} className="btn-primary inline-flex items-center gap-2">
          <Plus size={16} />
          Nuevo presupuesto
        </button>
      )}
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
