import { Pencil, PiggyBank, Plus, Trash2 } from 'lucide-react'
import { useState } from 'react'

import { FilterField, FilterPanel } from '../../../core/components/FilterField'
import { HealthBadge } from '../../../core/components/HealthBadge'
import { PageHeader } from '../../../core/components/PageHeader'
import { PaginationControls } from '../../../core/components/PaginationControls'
import { ProgressBar } from '../../../core/components/ProgressBar'
import { StatSummary } from '../../../core/components/StatSummary'
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

function getSavingsStatus(percentage: number | string): 'in_progress' | 'completed' {
  const value = typeof percentage === 'string' ? Number(percentage) : percentage
  return Number.isFinite(value) && value >= 100 ? 'completed' : 'in_progress'
}

function progressValue(percentage: number | string): number {
  const value = typeof percentage === 'string' ? Number(percentage) : percentage
  if (!Number.isFinite(value) || value <= 0) return 0
  return value
}

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
  const globalPct = progressValue(summary?.completion_percentage ?? 0)

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
    <div className="module-page">
      <PageHeader
        title="Ahorros"
        description="Metas con avance visual — cuánto falta para cada objetivo."
        icon={PiggyBank}
        actions={
          canWrite ? (
            <button type="button" onClick={openCreate} className="btn-primary inline-flex items-center gap-2">
              <Plus size={16} />
              Nueva meta
            </button>
          ) : undefined
        }
      />

      <section className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <StatSummary label="Metas" value={String(summary?.goals_count ?? 0)} />
        <StatSummary label="Meta total" value={formatCurrency(summary?.total_target_amount ?? 0)} />
        <StatSummary
          label="Ahorrado"
          value={formatCurrency(summary?.total_saved_amount ?? 0)}
          tone="success"
        />
        <StatSummary
          label="Avance global"
          value={`${summary?.completion_percentage ?? 0}%`}
          tone={globalPct >= 100 ? 'success' : globalPct >= 70 ? 'info' : 'warning'}
          hint={
            <span className="mt-2 block">
              <ProgressBar
                value={globalPct}
                variant={globalPct >= 100 ? 'ok' : 'primary'}
                size="md"
              />
            </span>
          }
        />
      </section>

      <FilterPanel columns={2}>
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
      </FilterPanel>

      <div className="space-y-3 lg:hidden">
        {isLoading ? (
          Array.from({ length: 3 }).map((_, i) => (
            <div key={i} className="budget-card space-y-3">
              <div className="skeleton h-6 w-40" />
              <div className="skeleton h-2.5 w-full" />
              <div className="skeleton h-4 w-28" />
            </div>
          ))
        ) : goals.length ? (
          goals.map((goal) => (
            <SavingsCard
              key={goal.id}
              goal={goal}
              canWrite={canWrite}
              onEdit={() => openEdit(goal)}
              onDelete={() => handleDelete(goal)}
            />
          ))
        ) : (
          <EmptySavings canWrite={canWrite} onCreate={openCreate} />
        )}
      </div>

      <section className="table-shell hidden overflow-x-auto lg:block">
        <table className="min-w-full text-left text-sm">
          <thead className="table-head">
            <tr>
              <th className="px-4 py-3">Meta</th>
              <th className="min-w-48 px-4 py-3">Avance</th>
              <th className="px-4 py-3">Objetivo</th>
              <th className="px-4 py-3">Acumulado</th>
              <th className="px-4 py-3">Fecha objetivo</th>
              <th className="px-4 py-3">Notas</th>
              <th className="px-4 py-3 whitespace-nowrap">Actualizado</th>
              {canWrite && <th className="px-4 py-3">Acciones</th>}
            </tr>
          </thead>
          <tbody>
            {isLoading ? (
              <tr>
                <td className="px-4 py-6" colSpan={canWrite ? 8 : 7}>
                  <div className="space-y-2">
                    <div className="skeleton h-4 w-full max-w-md" />
                    <div className="skeleton h-4 w-full max-w-sm" />
                  </div>
                </td>
              </tr>
            ) : goals.length ? (
              goals.map((goal) => {
                const status = getSavingsStatus(goal.progress_percentage)
                const pct = progressValue(goal.progress_percentage)
                return (
                  <tr key={goal.id} className="table-row">
                    <td className="px-4 py-3">
                      <p className="font-medium">{goal.name}</p>
                      <p className="text-xs text-muted">{formatRegisteredAt(goal.created_at)}</p>
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex flex-col gap-1.5">
                        <ProgressBar
                          value={pct}
                          variant={status === 'completed' ? 'ok' : 'primary'}
                          showLabel
                          size="lg"
                        />
                        <HealthBadge
                          label={status === 'completed' ? 'Completada' : 'En progreso'}
                          tone={status === 'completed' ? 'success' : 'info'}
                        />
                      </div>
                    </td>
                    <td className="px-4 py-3 tabular-nums">{formatCurrency(goal.target_amount)}</td>
                    <td className="px-4 py-3 tabular-nums">{formatCurrency(goal.current_amount)}</td>
                    <td className="px-4 py-3">{goal.due_date ?? '—'}</td>
                    <td className="max-w-[200px] truncate px-4 py-3" title={goal.notes ?? undefined}>
                      {formatNotesPreview(goal.notes)}
                    </td>
                    <td className="px-4 py-3 whitespace-nowrap text-muted">
                      {formatRegisteredAt(goal.updated_at)}
                    </td>
                    {canWrite && (
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-2">
                          <button
                            type="button"
                            onClick={() => openEdit(goal)}
                            className="btn-ghost inline-flex items-center gap-1"
                          >
                            <Pencil size={14} />
                            Editar
                          </button>
                          <button
                            type="button"
                            onClick={() => handleDelete(goal)}
                            className="btn-ghost inline-flex items-center gap-1 text-(--premium-danger)"
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
                <td className="px-4 py-3" colSpan={canWrite ? 8 : 7}>
                  <EmptySavings canWrite={canWrite} onCreate={openCreate} />
                </td>
              </tr>
            )}
          </tbody>
        </table>
        {(goals.length > 0 || isLoading) && (
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
      </section>

      {goals.length > 0 && !isLoading && (
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

      {canWrite && <SavingsModal isOpen={modalOpen} onClose={closeModal} editing={editing} />}
    </div>
  )
}

function SavingsCard({
  goal,
  canWrite,
  onEdit,
  onDelete,
}: {
  goal: SavingsGoal
  canWrite: boolean
  onEdit: () => void
  onDelete: () => void
}) {
  const status = getSavingsStatus(goal.progress_percentage)
  const pct = progressValue(goal.progress_percentage)

  return (
    <article className="budget-card space-y-3">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="truncate font-semibold">{goal.name}</p>
          {goal.due_date ? <p className="text-xs text-muted">Hasta {goal.due_date}</p> : null}
        </div>
        <HealthBadge
          label={status === 'completed' ? 'Completada' : 'En progreso'}
          tone={status === 'completed' ? 'success' : 'info'}
        />
      </div>

      <ProgressBar
        value={pct}
        variant={status === 'completed' ? 'ok' : 'primary'}
        showLabel
        size="lg"
      />

      <div className="grid grid-cols-2 gap-2 text-sm">
        <div>
          <p className="text-xs text-muted">Objetivo</p>
          <p className="font-medium tabular-nums">{formatCurrency(goal.target_amount)}</p>
        </div>
        <div className="text-right">
          <p className="text-xs text-muted">Acumulado</p>
          <p className="font-medium tabular-nums">{formatCurrency(goal.current_amount)}</p>
        </div>
      </div>

      {goal.notes ? <p className="text-xs text-muted line-clamp-2">{formatNotesPreview(goal.notes)}</p> : null}

      {canWrite && (
        <div className="flex items-center gap-2 border-t pt-3" style={{ borderColor: 'var(--premium-border)' }}>
          <button
            type="button"
            onClick={onEdit}
            className="btn-secondary inline-flex flex-1 items-center justify-center gap-1.5"
          >
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

function EmptySavings({ canWrite, onCreate }: { canWrite: boolean; onCreate: () => void }) {
  return (
    <div className="empty-state">
      <div className="empty-state__icon">
        <PiggyBank size={28} />
      </div>
      <div>
        <p className="font-medium">Sin metas de ahorro</p>
        <p className="mt-1 text-sm text-muted">Define un objetivo y sigue el avance mes a mes.</p>
      </div>
      {canWrite && (
        <button type="button" onClick={onCreate} className="btn-primary inline-flex items-center gap-2">
          <Plus size={16} />
          Nueva meta
        </button>
      )}
    </div>
  )
}

