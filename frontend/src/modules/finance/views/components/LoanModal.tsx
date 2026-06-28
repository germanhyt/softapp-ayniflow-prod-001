import { useEffect, useMemo, useState } from 'react'

import { Modal } from '../../../../core/components/Modal'
import { alertError, alertSuccess } from '../../../../core/utils/alerts'
import { useCreateLoanRecord, useUpdateLoanRecord } from '../../application/hooks/useFinance'
import { LOAN_COUNTERPARTY_LABELS, LOAN_TYPE_LABELS } from '../../application/utils/loanLabels'
import type { LoanRecord, LoanType } from '../../domain/models/finance.types'

const STATUS_OPTIONS = [
  { value: 'active', label: 'Activo' },
  { value: 'paid', label: 'Pagado' },
  { value: 'overdue', label: 'Vencido' },
]

const LOAN_TYPE_OPTIONS: { value: LoanType; label: string }[] = [
  { value: 'payable', label: LOAN_TYPE_LABELS.payable },
  { value: 'receivable', label: LOAN_TYPE_LABELS.receivable },
]

interface LoanModalProps {
  isOpen: boolean
  onClose: () => void
  editing?: LoanRecord | null
  defaultLoanType?: LoanType
}

export function LoanModal({ isOpen, onClose, editing, defaultLoanType = 'payable' }: LoanModalProps) {
  const createLoan = useCreateLoanRecord()
  const updateLoan = useUpdateLoanRecord()
  const isEditing = Boolean(editing)
  const [error, setError] = useState<string | null>(null)

  const [form, setForm] = useState({
    loan_type: defaultLoanType as LoanType,
    lender: '',
    principal_amount: '',
    outstanding_amount: '',
    interest_rate: '',
    next_payment_date: '',
    status: 'active',
    notes: '',
  })

  const counterpartyLabel = LOAN_COUNTERPARTY_LABELS[form.loan_type]

  useEffect(() => {
    if (!isOpen) return
    setError(null)
    if (editing) {
      setForm({
        loan_type: editing.loan_type ?? 'payable',
        lender: editing.lender,
        principal_amount: editing.principal_amount,
        outstanding_amount: editing.outstanding_amount,
        interest_rate: editing.interest_rate ?? '',
        next_payment_date: editing.next_payment_date ?? '',
        status: editing.status,
        notes: editing.notes ?? '',
      })
      return
    }
    setForm({
      loan_type: defaultLoanType,
      lender: '',
      principal_amount: '',
      outstanding_amount: '',
      interest_rate: '',
      next_payment_date: '',
      status: 'active',
      notes: '',
    })
  }, [isOpen, editing, defaultLoanType])

  const helperText = useMemo(() => {
    if (form.loan_type === 'receivable') {
      return 'Registra cuánto te deben. Un ingreso vinculado reduce el pendiente; un egreso lo aumenta si prestas más.'
    }
    return 'Registra cuánto debes. Un egreso vinculado reduce el saldo pendiente.'
  }, [form.loan_type])

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault()
    setError(null)
    const payload = {
      loan_type: form.loan_type,
      lender: form.lender,
      principal_amount: Number(form.principal_amount),
      outstanding_amount: Number(form.outstanding_amount),
      interest_rate: form.interest_rate ? Number(form.interest_rate) : null,
      next_payment_date: form.next_payment_date || null,
      status: form.status,
      notes: form.notes || null,
    }
    try {
      if (isEditing && editing) {
        await updateLoan.mutateAsync({ id: editing.id, payload })
        await alertSuccess('Registro actualizado')
      } else {
        await createLoan.mutateAsync(payload)
        await alertSuccess('Registro creado')
      }
      onClose()
    } catch {
      setError('No se pudo guardar el registro.')
      await alertError('Error', 'No se pudo guardar el registro.')
    }
  }

  const pending = createLoan.isPending || updateLoan.isPending

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={isEditing ? 'Editar crédito' : 'Nuevo crédito'}
      size="lg"
    >
      <form onSubmit={handleSubmit} className="space-y-4">
        <p className="text-sm text-muted">{helperText}</p>
        <div className="grid gap-4 md:grid-cols-2">
          <Field label="Tipo">
            <select
              className="input-field"
              value={form.loan_type}
              onChange={(e) =>
                setForm((prev) => ({ ...prev, loan_type: e.target.value as LoanType }))
              }
              disabled={isEditing}
            >
              {LOAN_TYPE_OPTIONS.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>
          </Field>
          <Field label={counterpartyLabel}>
            <input
              className="input-field"
              value={form.lender}
              onChange={(e) => setForm((prev) => ({ ...prev, lender: e.target.value }))}
              required
            />
          </Field>
          <Field label="Estado">
            <select
              className="input-field"
              value={form.status}
              onChange={(e) => setForm((prev) => ({ ...prev, status: e.target.value }))}
            >
              {STATUS_OPTIONS.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>
          </Field>
          <Field label="Principal (S/)">
            <input
              type="number"
              step="0.01"
              min="0.01"
              className="input-field"
              value={form.principal_amount}
              onChange={(e) => setForm((prev) => ({ ...prev, principal_amount: e.target.value }))}
              required
            />
          </Field>
          <Field label="Saldo pendiente (S/)">
            <input
              type="number"
              step="0.01"
              min="0"
              className="input-field"
              value={form.outstanding_amount}
              onChange={(e) => setForm((prev) => ({ ...prev, outstanding_amount: e.target.value }))}
              required
            />
          </Field>
          <Field label="Tasa (%)">
            <input
              type="number"
              step="0.01"
              min="0"
              max="100"
              className="input-field"
              value={form.interest_rate}
              onChange={(e) => setForm((prev) => ({ ...prev, interest_rate: e.target.value }))}
            />
          </Field>
          <Field label="Próximo pago / cobro">
            <input
              type="date"
              className="input-field"
              value={form.next_payment_date}
              onChange={(e) => setForm((prev) => ({ ...prev, next_payment_date: e.target.value }))}
            />
          </Field>
        </div>
        <Field label="Notas">
          <textarea
            className="input-field"
            rows={3}
            value={form.notes}
            onChange={(e) => setForm((prev) => ({ ...prev, notes: e.target.value }))}
            placeholder="Opcional"
          />
        </Field>
        {error && <p className="alert-error">{error}</p>}
        <div className="modal-actions -mx-5 -mb-4 mt-2">
          <button type="button" onClick={onClose} className="btn-secondary" disabled={pending}>
            Cancelar
          </button>
          <button type="submit" className="btn-primary" disabled={pending}>
            {pending ? 'Guardando...' : isEditing ? 'Actualizar' : 'Guardar'}
          </button>
        </div>
      </form>
    </Modal>
  )
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label className="block space-y-1 text-sm">
      <span className="font-medium">{label}</span>
      {children}
    </label>
  )
}
