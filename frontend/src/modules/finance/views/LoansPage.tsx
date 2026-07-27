import { HandCoins, Pencil, Plus, Trash2 } from 'lucide-react'
import { useState } from 'react'

import { HealthBadge } from '../../../core/components/HealthBadge'
import { PaginationControls } from '../../../core/components/PaginationControls'
import { ProgressBar } from '../../../core/components/ProgressBar'
import { StatSummary } from '../../../core/components/StatSummary'
import { alertSuccess, confirmAction } from '../../../core/utils/alerts'
import { hasPermission, useCurrentUser } from '../../auth/application/hooks/useAuth'
import {
  useDeleteLoanRecord,
  useLoanRecords,
  useLoanSummary,
} from '../application/hooks/useFinance'
import { getLoanTypeLabel } from '../application/utils/loanLabels'
import { formatCurrency, formatNotesPreview, formatRegisteredAt } from '../application/utils/formatters'
import type { LoanRecord, LoanType, PageSize } from '../domain/models/finance.types'
import { LoanModal } from './components/LoanModal'

const STATUS_FILTER_OPTIONS = [
  { value: '', label: 'Todos' },
  { value: 'active', label: 'Activo' },
  { value: 'paid', label: 'Pagado' },
  { value: 'overdue', label: 'Vencido' },
]

const STATUS_LABELS: Record<string, string> = {
  active: 'Activo',
  paid: 'Pagado',
  overdue: 'Vencido',
}

const TAB_OPTIONS: { value: '' | LoanType; label: string }[] = [
  { value: '', label: 'Todos' },
  { value: 'payable', label: 'Debo' },
  { value: 'receivable', label: 'Me deben' },
]

function getLoanStatusLabel(status: string): string {
  return STATUS_LABELS[status.trim().toLowerCase()] ?? status
}

function loanStatusTone(status: string): 'success' | 'warning' | 'danger' | 'info' {
  switch (status.trim().toLowerCase()) {
    case 'paid':
      return 'success'
    case 'overdue':
      return 'danger'
    case 'active':
      return 'info'
    default:
      return 'info'
  }
}

function loanTypeTone(type: LoanType): 'warning' | 'success' {
  return type === 'payable' ? 'warning' : 'success'
}

function paidProgress(percentage: number | string): number {
  const value = typeof percentage === 'string' ? Number(percentage) : percentage
  if (!Number.isFinite(value) || value <= 0) return 0
  return value
}

export function LoansPage() {
  const { data: user } = useCurrentUser()
  const canWrite = hasPermission(user, 'finance:write')
  const [typeTab, setTypeTab] = useState<'' | LoanType>('')
  const [search, setSearch] = useState('')
  const [statusFilter, setStatusFilter] = useState('')
  const [page, setPage] = useState(1)
  const [pageSize, setPageSize] = useState<PageSize>(20)
  const [modalOpen, setModalOpen] = useState(false)
  const [editing, setEditing] = useState<LoanRecord | null>(null)

  const { data, isLoading } = useLoanRecords({
    search: search.trim() || undefined,
    status: statusFilter || undefined,
    loan_type: typeTab || undefined,
    page,
    page_size: pageSize,
  })
  const { data: summary } = useLoanSummary()
  const deleteLoan = useDeleteLoanRecord()

  const loans = data?.items ?? []
  const meta = data?.meta ?? { total: 0, page: 1, page_size: pageSize, total_pages: 1 }
  const defaultLoanType: LoanType = typeTab || 'payable'

  const handleFilterChange = <T,>(setter: (value: T) => void, value: T) => {
    setter(value)
    setPage(1)
  }

  const handleDelete = async (loan: LoanRecord) => {
    const confirmed = await confirmAction(
      'Eliminar registro',
      `¿Eliminar el crédito de "${loan.lender}"?`,
      'Eliminar',
    )
    if (!confirmed) return
    await deleteLoan.mutateAsync(loan.id)
    await alertSuccess('Registro eliminado')
  }

  const openCreate = () => {
    setEditing(null)
    setModalOpen(true)
  }

  const openEdit = (loan: LoanRecord) => {
    setEditing(loan)
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
          <h2 className="text-xl font-semibold tracking-tight">Préstamos y cobranzas</h2>
          <p className="text-sm text-muted">
            Deudas y cobros con avance de pago a la vista.
          </p>
        </div>
        {canWrite && (
          <button type="button" onClick={openCreate} className="btn-primary inline-flex items-center gap-2">
            <Plus size={16} />
            Nuevo registro
          </button>
        )}
      </div>

      <section className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <StatSummary label="Total registros" value={String(summary?.loans_count ?? 0)} />
        <StatSummary
          label="Debo (pendiente)"
          value={formatCurrency(summary?.payable_outstanding_amount ?? 0)}
          tone="warning"
        />
        <StatSummary
          label="Me deben (pendiente)"
          value={formatCurrency(summary?.receivable_outstanding_amount ?? 0)}
          tone="success"
        />
        <StatSummary
          label="Activos"
          value={String(summary?.active_loans_count ?? 0)}
          tone="info"
        />
      </section>

      <div className="flex flex-wrap gap-2">
        {TAB_OPTIONS.map((tab) => (
          <button
            key={tab.value || 'all'}
            type="button"
            onClick={() => {
              setTypeTab(tab.value)
              setPage(1)
            }}
            className={typeTab === tab.value ? 'btn-primary' : 'btn-secondary'}
          >
            {tab.label}
          </button>
        ))}
      </div>

      <section className="card grid gap-4 md:grid-cols-2">
        <FilterField label="Buscar contraparte">
          <input
            type="text"
            placeholder="Nombre o entidad..."
            value={search}
            onChange={(e) => handleFilterChange(setSearch, e.target.value)}
            className="input-field"
          />
        </FilterField>
        <FilterField label="Estado">
          <select
            value={statusFilter}
            onChange={(e) => handleFilterChange(setStatusFilter, e.target.value)}
            className="input-field"
          >
            {STATUS_FILTER_OPTIONS.map((option) => (
              <option key={option.value || 'all'} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>
        </FilterField>
      </section>

      <div className="space-y-3 lg:hidden">
        {isLoading ? (
          Array.from({ length: 3 }).map((_, i) => (
            <div key={i} className="budget-card space-y-3">
              <div className="skeleton h-6 w-40" />
              <div className="skeleton h-2.5 w-full" />
              <div className="skeleton h-4 w-28" />
            </div>
          ))
        ) : loans.length ? (
          loans.map((loan) => (
            <LoanCard
              key={loan.id}
              loan={loan}
              canWrite={canWrite}
              onEdit={() => openEdit(loan)}
              onDelete={() => handleDelete(loan)}
            />
          ))
        ) : (
          <EmptyLoans canWrite={canWrite} onCreate={openCreate} />
        )}
      </div>

      <section className="table-shell hidden overflow-x-auto lg:block">
        <table className="min-w-full text-left text-sm">
          <thead className="table-head">
            <tr>
              <th className="px-4 py-3">Contraparte</th>
              <th className="px-4 py-3">Tipo</th>
              <th className="min-w-48 px-4 py-3">Avance pago</th>
              <th className="px-4 py-3">Principal</th>
              <th className="px-4 py-3">Pendiente</th>
              <th className="px-4 py-3">Próx. pago</th>
              <th className="px-4 py-3">Estado</th>
              <th className="px-4 py-3 whitespace-nowrap">Actualizado</th>
              {canWrite && <th className="px-4 py-3">Acciones</th>}
            </tr>
          </thead>
          <tbody>
            {isLoading ? (
              <tr>
                <td className="px-4 py-6" colSpan={canWrite ? 9 : 8}>
                  <div className="space-y-2">
                    <div className="skeleton h-4 w-full max-w-md" />
                    <div className="skeleton h-4 w-full max-w-sm" />
                  </div>
                </td>
              </tr>
            ) : loans.length ? (
              loans.map((loan) => {
                const type = loan.loan_type ?? 'payable'
                const pct = paidProgress(loan.paid_percentage)
                const statusKey = loan.status.trim().toLowerCase()
                return (
                  <tr key={loan.id} className="table-row">
                    <td className="px-4 py-3">
                      <p className="font-medium">{loan.lender}</p>
                      <p className="text-xs text-muted">{formatRegisteredAt(loan.created_at)}</p>
                    </td>
                    <td className="px-4 py-3">
                      <HealthBadge label={getLoanTypeLabel(type)} tone={loanTypeTone(type)} />
                    </td>
                    <td className="px-4 py-3">
                      <ProgressBar
                        value={pct}
                        variant={statusKey === 'paid' ? 'ok' : statusKey === 'overdue' ? 'exceeded' : 'primary'}
                        showLabel
                        size="lg"
                      />
                      <p className="mt-1 text-xs text-muted tabular-nums">
                        Pagado {formatCurrency(loan.paid_amount)}
                      </p>
                    </td>
                    <td className="px-4 py-3 tabular-nums">{formatCurrency(loan.principal_amount)}</td>
                    <td className="px-4 py-3 font-medium tabular-nums">
                      {formatCurrency(loan.outstanding_amount)}
                    </td>
                    <td className="px-4 py-3">{loan.next_payment_date ?? '—'}</td>
                    <td className="px-4 py-3">
                      <HealthBadge
                        label={getLoanStatusLabel(loan.status)}
                        tone={loanStatusTone(loan.status)}
                      />
                    </td>
                    <td className="px-4 py-3 whitespace-nowrap text-muted">
                      {formatRegisteredAt(loan.updated_at)}
                    </td>
                    {canWrite && (
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-2">
                          <button
                            type="button"
                            onClick={() => openEdit(loan)}
                            className="btn-ghost inline-flex items-center gap-1"
                          >
                            <Pencil size={14} />
                            Editar
                          </button>
                          <button
                            type="button"
                            onClick={() => handleDelete(loan)}
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
                <td className="px-4 py-3" colSpan={canWrite ? 9 : 8}>
                  <EmptyLoans canWrite={canWrite} onCreate={openCreate} />
                </td>
              </tr>
            )}
          </tbody>
        </table>
        {(loans.length > 0 || isLoading) && (
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

      {loans.length > 0 && !isLoading && (
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

      <LoanModal
        isOpen={modalOpen}
        onClose={closeModal}
        editing={editing}
        defaultLoanType={editing?.loan_type ?? defaultLoanType}
      />
    </div>
  )
}

function LoanCard({
  loan,
  canWrite,
  onEdit,
  onDelete,
}: {
  loan: LoanRecord
  canWrite: boolean
  onEdit: () => void
  onDelete: () => void
}) {
  const type = loan.loan_type ?? 'payable'
  const pct = paidProgress(loan.paid_percentage)
  const statusKey = loan.status.trim().toLowerCase()

  return (
    <article className="budget-card space-y-3">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="truncate font-semibold">{loan.lender}</p>
          <div className="mt-1 flex flex-wrap items-center gap-1.5">
            <HealthBadge label={getLoanTypeLabel(type)} tone={loanTypeTone(type)} />
            <HealthBadge
              label={getLoanStatusLabel(loan.status)}
              tone={loanStatusTone(loan.status)}
            />
          </div>
        </div>
        <div className="text-right">
          <p className="text-xs text-muted">Pendiente</p>
          <p className="font-semibold tabular-nums">{formatCurrency(loan.outstanding_amount)}</p>
        </div>
      </div>

      <ProgressBar
        value={pct}
        variant={statusKey === 'paid' ? 'ok' : statusKey === 'overdue' ? 'exceeded' : 'primary'}
        showLabel
        size="lg"
      />

      <div className="grid grid-cols-3 gap-2 text-sm">
        <div>
          <p className="text-xs text-muted">Principal</p>
          <p className="font-medium tabular-nums">{formatCurrency(loan.principal_amount)}</p>
        </div>
        <div>
          <p className="text-xs text-muted">Pagado</p>
          <p className="font-medium tabular-nums">{formatCurrency(loan.paid_amount)}</p>
        </div>
        <div className="text-right">
          <p className="text-xs text-muted">Próx.</p>
          <p className="font-medium">{loan.next_payment_date ?? '—'}</p>
        </div>
      </div>

      {loan.notes ? (
        <p className="line-clamp-2 text-xs text-muted">{formatNotesPreview(loan.notes)}</p>
      ) : null}

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

function EmptyLoans({ canWrite, onCreate }: { canWrite: boolean; onCreate: () => void }) {
  return (
    <div className="empty-state">
      <div className="empty-state__icon">
        <HandCoins size={28} />
      </div>
      <div>
        <p className="font-medium">Sin registros de crédito</p>
        <p className="mt-1 text-sm text-muted">Registra lo que debes o lo que te deben.</p>
      </div>
      {canWrite && (
        <button type="button" onClick={onCreate} className="btn-primary inline-flex items-center gap-2">
          <Plus size={16} />
          Nuevo registro
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
