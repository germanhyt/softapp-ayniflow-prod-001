import { Building2, CreditCard, FolderTree, Plus, Tags, Trash2 } from 'lucide-react'
import { useEffect, useMemo, useState } from 'react'
import { useLocation } from 'react-router-dom'

import { PaginationControls } from '../../../core/components/PaginationControls'
import { hasPermission, useCurrentUser } from '../../auth/application/hooks/useAuth'
import { alertSuccess, confirmAction } from '../../../core/utils/alerts'
import { getLoanTypeLabel } from '../application/utils/loanLabels'
import { useCatalog } from '../application/hooks/useCatalog'
import { useFinanceSocket } from '../application/realtime/FinanceSocketProvider'
import { normalizeTransactionFilters } from '../application/realtime/transactionFilters'
import { formatCurrency, firstDayOfMonthIsoDate, todayIsoDate } from '../application/utils/formatters'
import {
  useBulkDeleteTransactions,
  useBulkUpdateTransactionCategory,
  useDeleteTransaction,
  useLoanRecords,
  useSavingsGoals,
  useTransactions,
} from '../application/hooks/useFinance'
import type { CatalogKind, FinanceFilters, MovementType, PageSize, Transaction } from '../domain/models/finance.types'
import { CatalogManageModal } from './components/CatalogManageModal'
import { TransactionModal } from './components/TransactionModal'

export function TransactionsPage() {
  const { data: user } = useCurrentUser()
  const canWrite = hasPermission(user, 'finance:write')
  const location = useLocation()

  const [filters, setFilters] = useState<FinanceFilters>({
    from: firstDayOfMonthIsoDate(),
    to: todayIsoDate(),
    page: 1,
    page_size: 20,
  })

  useEffect(() => {
    const state = location.state as { from?: string; to?: string } | null
    if (state?.from || state?.to) {
      setFilters((prev) => ({
        ...prev,
        from: state.from ?? prev.from,
        to: state.to ?? prev.to,
        page: 1,
      }))
    }
  }, [location.state])

  const normalizedFilters = useMemo(() => normalizeTransactionFilters(filters), [filters])
  const { subscribeTransactions } = useFinanceSocket()

  useEffect(() => {
    subscribeTransactions(normalizedFilters)
  }, [normalizedFilters, subscribeTransactions])

  const { data, isLoading: txLoading } = useTransactions(normalizedFilters)
  const transactions = data?.items ?? []
  const meta = data?.meta ?? {
    total: 0,
    page: 1,
    page_size: filters.page_size ?? 20,
    total_pages: 1,
  }
  const pageSize = (filters.page_size ?? 20) as PageSize

  const updateFilters = (patch: Partial<FinanceFilters>) => {
    setFilters((prev) => ({ ...prev, ...patch, page: patch.page ?? 1 }))
  }
  const deleteTransaction = useDeleteTransaction()
  const bulkUpdateCategory = useBulkUpdateTransactionCategory()
  const bulkDelete = useBulkDeleteTransactions()

  const { data: banks = [] } = useCatalog('banks')
  const { data: paymentTypes = [] } = useCatalog('payment-types')
  const { data: categories = [] } = useCatalog('categories')
  const { data: savingsData } = useSavingsGoals({ page: 1, page_size: 200 })
  const { data: loansData } = useLoanRecords({ page: 1, page_size: 200 })
  const savingsGoals = savingsData?.items ?? []
  const loanRecords = loansData?.items ?? []
  const loanById = useMemo(
    () => new Map(loanRecords.map((loan) => [loan.id, loan])),
    [loanRecords],
  )

  const formatLinkLabel = (tx: (typeof transactions)[number]) => {
    if (tx.savings_goal_id) return `Ahorro #${tx.savings_goal_id}`
    if (!tx.loan_record_id) return '—'
    const loan = loanById.get(tx.loan_record_id)
    if (!loan) return `Crédito #${tx.loan_record_id}`
    return `${getLoanTypeLabel(loan.loan_type ?? 'payable')}: ${loan.lender}`
  }

  const [transactionModalOpen, setTransactionModalOpen] = useState(false)
  const [editingTransaction, setEditingTransaction] = useState<Transaction | null>(null)
  const [catalogModal, setCatalogModal] = useState<CatalogKind | null>(null)
  const [selectedIds, setSelectedIds] = useState<number[]>([])
  const [bulkCategory, setBulkCategory] = useState('')

  const visibleIds = useMemo(() => transactions.map((tx) => tx.id), [transactions])
  const allVisibleSelected =
    visibleIds.length > 0 && visibleIds.every((id) => selectedIds.includes(id))

  const toggleSelectAll = () => {
    if (allVisibleSelected) {
      setSelectedIds((prev) => prev.filter((id) => !visibleIds.includes(id)))
      return
    }
    setSelectedIds((prev) => Array.from(new Set([...prev, ...visibleIds])))
  }

  const toggleSelectOne = (id: number) => {
    setSelectedIds((prev) =>
      prev.includes(id) ? prev.filter((item) => item !== id) : [...prev, id],
    )
  }

  const handleBulkCategory = async () => {
    if (!bulkCategory || selectedIds.length === 0) return
    const count = selectedIds.length
    await bulkUpdateCategory.mutateAsync({ ids: selectedIds, category: bulkCategory })
    setSelectedIds([])
    setBulkCategory('')
    await alertSuccess('Categoría actualizada', `${count} transacción(es) actualizada(s).`)
  }

  const handleBulkDelete = async () => {
    if (selectedIds.length === 0) return
    const confirmed = await confirmAction(
      'Eliminar transacciones',
      `¿Eliminar ${selectedIds.length} transacción(es) seleccionada(s)?`,
      'Eliminar',
    )
    if (!confirmed) return
    const count = selectedIds.length
    await bulkDelete.mutateAsync(selectedIds)
    setSelectedIds([])
    await alertSuccess('Transacciones eliminadas', `${count} registro(s) eliminado(s).`)
  }

  const handleDeleteOne = async (id: number) => {
    const confirmed = await confirmAction(
      'Eliminar transacción',
      '¿Eliminar esta transacción?',
      'Eliminar',
    )
    if (!confirmed) return
    await deleteTransaction.mutateAsync(id)
    await alertSuccess('Transacción eliminada')
  }

  const openCreateModal = () => {
    setEditingTransaction(null)
    setTransactionModalOpen(true)
  }

  const openEditModal = (tx: Transaction) => {
    setEditingTransaction(tx)
    setTransactionModalOpen(true)
  }

  const closeTransactionModal = () => {
    setTransactionModalOpen(false)
    setEditingTransaction(null)
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h2 className="text-xl font-semibold">Transacciones</h2>
          <p className="text-sm text-muted">
            Registro, filtros y gestión de movimientos financieros.
          </p>
        </div>

        <div className="flex flex-wrap justify-end gap-2">
          {canWrite && (
            <>
              <button
                type="button"
                onClick={() => setCatalogModal('banks')}
                className="btn-secondary inline-flex items-center gap-2"
              >
                <Building2 size={16} />
                Bancos
              </button>
              <button
                type="button"
                onClick={() => setCatalogModal('payment-types')}
                className="btn-secondary inline-flex items-center gap-2"
              >
                <CreditCard size={16} />
                Tipos de pago
              </button>
              <button
                type="button"
                onClick={() => setCatalogModal('categories')}
                className="btn-secondary inline-flex items-center gap-2"
              >
                <FolderTree size={16} />
                Categorías
              </button>
              <button
                type="button"
                onClick={openCreateModal}
                className="btn-primary inline-flex items-center gap-2"
              >
                <Plus size={16} />
                Nueva transacción
              </button>
            </>
          )}
        </div>
      </div>

      <section className="card grid gap-4 md:grid-cols-4">
        <FilterField label="Desde">
          <input
            type="date"
            value={filters.from ?? ''}
            onChange={(e) => updateFilters({ from: e.target.value || undefined })}
            className="input-field"
          />
        </FilterField>
        <FilterField label="Hasta">
          <input
            type="date"
            value={filters.to ?? ''}
            onChange={(e) => updateFilters({ to: e.target.value || undefined })}
            className="input-field"
          />
        </FilterField>
        <FilterField label="Movimiento">
          <select
            value={filters.movement_type ?? ''}
            onChange={(e) =>
              updateFilters({
                movement_type: (e.target.value as MovementType) || undefined,
              })
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
            onChange={(e) => updateFilters({ search: e.target.value || undefined })}
            className="input-field"
          />
        </FilterField>
      </section>

      {canWrite && selectedIds.length > 0 && (
        <section className="card flex flex-wrap items-end gap-3">
          <p className="text-sm font-medium">{selectedIds.length} seleccionada(s)</p>
          <select
            value={bulkCategory}
            onChange={(e) => setBulkCategory(e.target.value)}
            className="input-field min-w-[180px]"
          >
            <option value="">Nueva categoría</option>
            {categories.map((item) => (
              <option key={item.id} value={item.name}>
                {item.name}
              </option>
            ))}
          </select>
          <button
            type="button"
            onClick={handleBulkCategory}
            disabled={!bulkCategory || bulkUpdateCategory.isPending}
            className="btn-secondary inline-flex items-center gap-2"
          >
            <Tags size={16} />
            {bulkUpdateCategory.isPending ? 'Actualizando...' : 'Cambiar categoría'}
          </button>
          <button
            type="button"
            onClick={handleBulkDelete}
            disabled={bulkDelete.isPending}
            className="btn-secondary inline-flex items-center gap-2 alert-error"
          >
            <Trash2 size={16} />
            {bulkDelete.isPending ? 'Eliminando...' : 'Eliminar seleccionadas'}
          </button>
        </section>
      )}

      <section className="table-shell">
        <table className="min-w-[960px] w-full text-left text-sm">
          <thead className="table-head">
            <tr>
              {canWrite && (
                <th className="px-4 py-3">
                  <input
                    type="checkbox"
                    checked={allVisibleSelected}
                    onChange={toggleSelectAll}
                    aria-label="Seleccionar todas las transacciones visibles"
                  />
                </th>
              )}
              <th className="px-4 py-3">Fecha</th>
              <th className="px-4 py-3">Movimiento</th>
              <th className="px-4 py-3">Concepto</th>
              <th className="px-4 py-3">Banco</th>
              <th className="px-4 py-3">Tipo</th>
              <th className="px-4 py-3">Categoría</th>
              <th className="px-4 py-3">Vínculo</th>
              <th className="px-4 py-3">Monto</th>
              {canWrite && <th className="px-4 py-3">Acciones</th>}
            </tr>
          </thead>
          <tbody>
            {txLoading ? (
              <tr>
                <td className="px-4 py-3" colSpan={canWrite ? 10 : 8}>
                  Cargando...
                </td>
              </tr>
            ) : transactions.length ? (
              transactions.map((tx) => (
                <tr key={tx.id} className="table-row">
                  {canWrite && (
                    <td className="px-4 py-3">
                      <input
                        type="checkbox"
                        checked={selectedIds.includes(tx.id)}
                        onChange={() => toggleSelectOne(tx.id)}
                        aria-label={`Seleccionar transacción ${tx.id}`}
                      />
                    </td>
                  )}
                  <td className="px-4 py-3">{tx.transaction_date}</td>
                  <td className="px-4 py-3">{tx.movement_type}</td>
                  <td className="px-4 py-3">{tx.concept}</td>
                  <td className="px-4 py-3">{tx.bank}</td>
                  <td className="px-4 py-3">{tx.payment_type}</td>
                  <td className="px-4 py-3">{tx.category ?? '—'}</td>
                  <td className="px-4 py-3">{formatLinkLabel(tx)}</td>
                  <td className="px-4 py-3">{formatCurrency(tx.amount)}</td>
                  {canWrite && (
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-3">
                        <button
                          type="button"
                          onClick={() => openEditModal(tx)}
                          className="text-sm hover:underline"
                        >
                          Editar
                        </button>
                        <button
                          type="button"
                          onClick={() => handleDeleteOne(tx.id)}
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
                <td className="px-4 py-3 text-muted" colSpan={canWrite ? 10 : 8}>
                  No hay transacciones para los filtros seleccionados.
                </td>
              </tr>
            )}
          </tbody>
        </table>
        <PaginationControls
          meta={meta}
          pageSize={pageSize}
          onPageChange={(page) => setFilters((prev) => ({ ...prev, page }))}
          onPageSizeChange={(size) => setFilters((prev) => ({ ...prev, page_size: size, page: 1 }))}
        />
      </section>

      {canWrite && (
        <>
          <TransactionModal
            isOpen={transactionModalOpen}
            onClose={closeTransactionModal}
            banks={banks}
            paymentTypes={paymentTypes}
            categories={categories}
            savingsGoals={savingsGoals}
            loanRecords={loanRecords}
            editing={editingTransaction}
          />
          {catalogModal && (
            <CatalogManageModal
              kind={catalogModal}
              isOpen={Boolean(catalogModal)}
              onClose={() => setCatalogModal(null)}
            />
          )}
        </>
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
