import { Plus } from 'lucide-react'
import { useState } from 'react'

import { PaginationControls } from '../../../core/components/PaginationControls'
import { alertSuccess, confirmAction } from '../../../core/utils/alerts'
import { hasPermission, useCurrentUser } from '../../auth/application/hooks/useAuth'
import {
  useDeleteSavingsGoal,
  useSavingsGoals,
  useSavingsSummary,
} from '../application/hooks/useFinance'
import { formatCurrency, formatNotesPreview, formatRegisteredAt } from '../application/utils/formatters'
import type { PageSize, SavingsGoal } from '../domain/models/finance.types'
import { SavingsModal } from './components/SavingsModal'

type ProgressFilter = 'all' | 'in_progress' | 'completed'

export function SavingsPage() {
  const { data: user } = useCurrentUser()
  const canWrite = hasPermission(user, 'finance:write')
  const [search, setSearch] = useState('')
  const [progressFilter, setProgressFilter] = useState<ProgressFilter>('all')
  const [page, setPage] = useState(1)
  const [pageSize, setPageSize] = useState<PageSize>(20)
  const [modalOpen, setModalOpen] = useState(false)
  const [editing, setEditing] = useState<SavingsGoal | null>(null)

  const { data, isLoading } = useSavingsGoals({
    search: search.trim() || undefined,
    progress: progressFilter,
    page,
    page_size: pageSize,
  })
  const { data: summary } = useSavingsSummary()
  const deleteGoal = useDeleteSavingsGoal()

  const goals = data?.items ?? []
  const meta = data?.meta ?? { total: 0, page: 1, page_size: pageSize, total_pages: 1 }

  const handleFilterChange = <T,>(setter: (value: T) => void, value: T) => {
    setter(value)
    setPage(1)
  }

  const handleDelete = async (goal: SavingsGoal) => {
    const confirmed = await confirmAction(
      'Eliminar meta de ahorro',
      `¿Eliminar la meta "${goal.name}"?`,
      'Eliminar',
    )
    if (!confirmed) return
    await deleteGoal.mutateAsync(goal.id)
    await alertSuccess('Meta eliminada')
  }

  const openCreate = () => {
    setEditing(null)
    setModalOpen(true)
  }

  const openEdit = (goal: SavingsGoal) => {
    setEditing(goal)
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
          <h2 className="text-xl font-semibold">Ahorros</h2>
          <p className="text-sm text-muted">Gestiona metas de ahorro y su avance acumulado.</p>
        </div>
        {canWrite && (
          <button type="button" onClick={openCreate} className="btn-primary inline-flex items-center gap-2">
            <Plus size={16} />
            Nueva meta
          </button>
        )}
      </div>

      <section className="grid gap-4 md:grid-cols-4">
        <Stat title="Metas" value={String(summary?.goals_count ?? 0)} />
        <Stat title="Meta total" value={formatCurrency(summary?.total_target_amount ?? 0)} />
        <Stat title="Ahorrado" value={formatCurrency(summary?.total_saved_amount ?? 0)} />
        <Stat title="Avance global" value={`${summary?.completion_percentage ?? 0}%`} />
      </section>

      <section className="card grid gap-4 md:grid-cols-2">
        <FilterField label="Buscar meta">
          <input
            type="text"
            placeholder="Nombre de la meta..."
            value={search}
            onChange={(e) => handleFilterChange(setSearch, e.target.value)}
            className="input-field"
          />
        </FilterField>
        <FilterField label="Avance">
          <select
            value={progressFilter}
            onChange={(e) => handleFilterChange(setProgressFilter, e.target.value as ProgressFilter)}
            className="input-field"
          >
            <option value="all">Todas</option>
            <option value="in_progress">En progreso (&lt;100%)</option>
            <option value="completed">Completadas (≥100%)</option>
          </select>
        </FilterField>
      </section>

      <section className="table-shell overflow-x-auto">
        <table className="min-w-full text-left text-sm">
          <thead className="table-head">
            <tr>
              <th className="px-4 py-3 whitespace-nowrap">Registro</th>
              <th className="px-4 py-3">Meta</th>
              <th className="px-4 py-3">Objetivo</th>
              <th className="px-4 py-3">Acumulado</th>
              <th className="px-4 py-3">Avance</th>
              <th className="px-4 py-3">Fecha objetivo</th>
              <th className="px-4 py-3">Notas</th>
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
            ) : goals.length ? (
              goals.map((goal) => (
                <tr key={goal.id} className="table-row">
                  <td className="px-4 py-3 whitespace-nowrap text-muted">
                    {formatRegisteredAt(goal.created_at)}
                  </td>
                  <td className="px-4 py-3">{goal.name}</td>
                  <td className="px-4 py-3">{formatCurrency(goal.target_amount)}</td>
                  <td className="px-4 py-3">{formatCurrency(goal.current_amount)}</td>
                  <td className="px-4 py-3">{goal.progress_percentage}%</td>
                  <td className="px-4 py-3">{goal.due_date ?? '—'}</td>
                  <td className="px-4 py-3 max-w-[200px] truncate" title={goal.notes ?? undefined}>
                    {formatNotesPreview(goal.notes)}
                  </td>
                  <td className="px-4 py-3 whitespace-nowrap text-muted">
                    {formatRegisteredAt(goal.updated_at)}
                  </td>
                  {canWrite && (
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-3">
                        <button
                          type="button"
                          onClick={() => openEdit(goal)}
                          className="text-sm hover:underline"
                        >
                          Editar
                        </button>
                        <button
                          type="button"
                          onClick={() => handleDelete(goal)}
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
                  No hay metas para los filtros seleccionados.
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
      </section>

      {canWrite && <SavingsModal isOpen={modalOpen} onClose={closeModal} editing={editing} />}
    </div>
  )
}

function Stat({ title, value }: { title: string; value: string }) {
  return (
    <div className="card">
      <p className="text-sm text-muted">{title}</p>
      <p className="mt-1 text-lg font-semibold">{value}</p>
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
