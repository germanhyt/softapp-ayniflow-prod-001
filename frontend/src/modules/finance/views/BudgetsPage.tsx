import { Plus } from 'lucide-react'
import { useState } from 'react'

import { PaginationControls } from '../../../core/components/PaginationControls'
import { alertSuccess, confirmAction } from '../../../core/utils/alerts'
import { hasPermission, useCurrentUser } from '../../auth/application/hooks/useAuth'
import { useCatalog } from '../application/hooks/useCatalog'
import { useBudgets, useDeleteBudget } from '../application/hooks/useFinance'
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
  const deleteBudget = useDeleteBudget()
  const { data: categories = [] } = useCatalog('categories')

  const budgets = data?.items ?? []
  const meta = data?.meta ?? { total: 0, page: 1, page_size: pageSize, total_pages: 1 }

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
          <h2 className="text-xl font-semibold">Presupuestos</h2>
          <p className="text-sm text-muted">
            Seguimiento de lo presupuestado versus lo ejecutado por categoría.
          </p>
        </div>
        {canWrite && (
          <button type="button" onClick={openCreate} className="btn-primary inline-flex items-center gap-2">
            <Plus size={16} />
            Nuevo presupuesto
          </button>
        )}
      </div>

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

      <div className="table-shell overflow-x-auto">
        <table className="min-w-full text-left text-sm">
          <thead className="table-head">
            <tr>
              <th className="px-4 py-3 whitespace-nowrap">Registro</th>
              <th className="px-4 py-3">Mes</th>
              <th className="px-4 py-3">Categoría</th>
              <th className="px-4 py-3">Presupuestado</th>
              <th className="px-4 py-3">Real</th>
              <th className="px-4 py-3">%</th>
              <th className="px-4 py-3">Diferencia</th>
              <th className="px-4 py-3 whitespace-nowrap">Actualizado</th>
              {canWrite && <th className="px-4 py-3">Acciones</th>}
            </tr>
          </thead>
          <tbody>
            {isLoading ? (
              <tr>
                <td className="px-4 py-3" colSpan={canWrite ? 9 : 8}>
                  Cargando...
                </td>
              </tr>
            ) : budgets.length ? (
              budgets.map((budget) => (
                <tr key={budget.id} className="table-row">
                  <td className="px-4 py-3 whitespace-nowrap text-muted">
                    {formatRegisteredAt(budget.created_at)}
                  </td>
                  <td className="px-4 py-3">{budget.month_year}</td>
                  <td className="px-4 py-3">{budget.category}</td>
                  <td className="px-4 py-3">{formatCurrency(budget.budgeted_amount)}</td>
                  <td className="px-4 py-3">{formatCurrency(budget.actual_amount)}</td>
                  <td className="px-4 py-3">{budget.percentage}%</td>
                  <td className="px-4 py-3">{formatCurrency(budget.difference)}</td>
                  <td className="px-4 py-3 whitespace-nowrap text-muted">
                    {formatRegisteredAt(budget.updated_at)}
                  </td>
                  {canWrite && (
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-3">
                        <button
                          type="button"
                          onClick={() => openEdit(budget)}
                          className="text-sm hover:underline"
                        >
                          Editar
                        </button>
                        <button
                          type="button"
                          onClick={() => handleDelete(budget)}
                          className="alert-error text-sm hover:underline"
                        >
                          Eliminar
                        </button>
                      </div>
                    </td>
                  )}
                </tr>
              ))
            ) : (
              <tr>
                <td className="px-4 py-3 text-muted" colSpan={canWrite ? 9 : 8}>
                  No hay presupuestos para los filtros seleccionados.
                </td>
              </tr>
            )}
          </tbody>
        </table>
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

function FilterField({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label className="block space-y-1 text-sm">
      <span className="font-medium">{label}</span>
      {children}
    </label>
  )
}
