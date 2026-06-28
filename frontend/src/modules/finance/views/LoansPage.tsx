import { Plus } from 'lucide-react'
import { useState } from 'react'

import { PaginationControls } from '../../../core/components/PaginationControls'
import { alertSuccess, confirmAction } from '../../../core/utils/alerts'
import { hasPermission, useCurrentUser } from '../../auth/application/hooks/useAuth'
import {
  useDeleteLoanRecord,
  useLoanRecords,
  useLoanSummary,
} from '../application/hooks/useFinance'
import {
  getLoanTypeLabel,
} from '../application/utils/loanLabels'
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
          <h2 className="text-xl font-semibold">Préstamos y cobranzas</h2>
          <p className="text-sm text-muted">
            Deudas que debes y montos que te deben, con amortización vía transacciones.
          </p>
        </div>
        {canWrite && (
          <button type="button" onClick={openCreate} className="btn-primary inline-flex items-center gap-2">
            <Plus size={16} />
            Nuevo registro
          </button>
        )}
      </div>

      <section className="grid gap-4 md:grid-cols-4">
        <Stat title="Total registros" value={String(summary?.loans_count ?? 0)} />
        <Stat title="Debo (pendiente)" value={formatCurrency(summary?.payable_outstanding_amount ?? 0)} />
        <Stat title="Me deben (pendiente)" value={formatCurrency(summary?.receivable_outstanding_amount ?? 0)} />
        <Stat title="Activos" value={String(summary?.active_loans_count ?? 0)} />
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

      <section className="card overflow-x-auto p-0">
        <table className="min-w-full text-sm">
          <thead>
            <tr className="table-head">
              <th className="px-4 py-3 text-left">Registro</th>
              <th className="px-4 py-3 text-left">Tipo</th>
              <th className="px-4 py-3 text-left">Contraparte</th>
              <th className="px-4 py-3 text-left">Principal</th>
              <th className="px-4 py-3 text-left">Pendiente</th>
              <th className="px-4 py-3 text-left">Pagado</th>
              <th className="px-4 py-3 text-left">Tasa</th>
              <th className="px-4 py-3 text-left">Próx. pago</th>
              <th className="px-4 py-3 text-left">Estado</th>
              <th className="px-4 py-3 text-left">Notas</th>
              <th className="px-4 py-3 text-left">Actualizado</th>
              {canWrite && <th className="px-4 py-3 text-left">Acciones</th>}
            </tr>
          </thead>
          <tbody>
            {isLoading ? (
              <tr>
                <td colSpan={canWrite ? 12 : 11} className="px-4 py-8 text-center text-muted">
                  Cargando...
                </td>
              </tr>
            ) : loans.length ? (
              loans.map((loan) => (
                <tr key={loan.id} className="table-row">
                  <td className="px-4 py-3 whitespace-nowrap text-muted">
                    {formatRegisteredAt(loan.created_at)}
                  </td>
                  <td className="px-4 py-3">
                    <span className="badge">{getLoanTypeLabel(loan.loan_type ?? 'payable')}</span>
                  </td>
                  <td className="px-4 py-3">{loan.lender}</td>
                  <td className="px-4 py-3">{formatCurrency(loan.principal_amount)}</td>
                  <td className="px-4 py-3">{formatCurrency(loan.outstanding_amount)}</td>
                  <td className="px-4 py-3">
                    {formatCurrency(loan.paid_amount)} ({loan.paid_percentage}%)
                  </td>
                  <td className="px-4 py-3">{loan.interest_rate ? `${loan.interest_rate}%` : '—'}</td>
                  <td className="px-4 py-3">{loan.next_payment_date ?? '—'}</td>
                  <td className="px-4 py-3">
                    <span className="badge">{getLoanStatusLabel(loan.status)}</span>
                  </td>
                  <td className="px-4 py-3 max-w-[200px] truncate" title={loan.notes ?? undefined}>
                    {formatNotesPreview(loan.notes)}
                  </td>
                  <td className="px-4 py-3 whitespace-nowrap text-muted">
                    {formatRegisteredAt(loan.updated_at)}
                  </td>
                  {canWrite && (
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-3">
                        <button
                          type="button"
                          onClick={() => openEdit(loan)}
                          className="text-sm hover:underline"
                        >
                          Editar
                        </button>
                        <button
                          type="button"
                          onClick={() => handleDelete(loan)}
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
                <td colSpan={canWrite ? 12 : 11} className="px-4 py-8 text-center text-muted">
                  No hay registros para los filtros seleccionados.
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

      <LoanModal
        isOpen={modalOpen}
        onClose={closeModal}
        editing={editing}
        defaultLoanType={editing?.loan_type ?? defaultLoanType}
      />
    </div>
  )
}

function Stat({ title, value }: { title: string; value: string }) {
  return (
    <div className="card">
      <p className="text-xs uppercase tracking-wide text-muted">{title}</p>
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
