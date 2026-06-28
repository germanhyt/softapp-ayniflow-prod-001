import { useEffect, useState } from 'react'

import { Modal } from '../../../../core/components/Modal'
import { alertError, alertSuccess } from '../../../../core/utils/alerts'
import { useCreateSavingsGoal, useUpdateSavingsGoal } from '../../application/hooks/useFinance'
import type { SavingsGoal } from '../../domain/models/finance.types'

interface SavingsModalProps {
  isOpen: boolean
  onClose: () => void
  editing?: SavingsGoal | null
}

export function SavingsModal({ isOpen, onClose, editing }: SavingsModalProps) {
  const createGoal = useCreateSavingsGoal()
  const updateGoal = useUpdateSavingsGoal()
  const isEditing = Boolean(editing)
  const [error, setError] = useState<string | null>(null)

  const [form, setForm] = useState({
    name: '',
    target_amount: '',
    current_amount: '',
    due_date: '',
    notes: '',
  })

  useEffect(() => {
    if (!isOpen) return
    setError(null)
    if (editing) {
      setForm({
        name: editing.name,
        target_amount: editing.target_amount,
        current_amount: editing.current_amount,
        due_date: editing.due_date ?? '',
        notes: editing.notes ?? '',
      })
      return
    }
    setForm({ name: '', target_amount: '', current_amount: '', due_date: '', notes: '' })
  }, [isOpen, editing])

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault()
    setError(null)
    const payload = {
      name: form.name,
      target_amount: Number(form.target_amount),
      current_amount: Number(form.current_amount),
      due_date: form.due_date || null,
      notes: form.notes || null,
    }
    try {
      if (isEditing && editing) {
        await updateGoal.mutateAsync({ id: editing.id, payload })
        await alertSuccess('Meta actualizada')
      } else {
        await createGoal.mutateAsync(payload)
        await alertSuccess('Meta creada')
      }
      onClose()
    } catch {
      setError('No se pudo guardar la meta de ahorro.')
      await alertError('Error', 'No se pudo guardar la meta de ahorro.')
    }
  }

  const pending = createGoal.isPending || updateGoal.isPending

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={isEditing ? 'Editar meta de ahorro' : 'Nueva meta de ahorro'}
      size="lg"
    >
      <form onSubmit={handleSubmit} className="space-y-4">
        <div className="grid gap-4 md:grid-cols-2">
          <Field label="Nombre de la meta">
            <input
              className="input-field"
              value={form.name}
              onChange={(e) => setForm((prev) => ({ ...prev, name: e.target.value }))}
              placeholder="Ej. Fondo emergencia"
              required
            />
          </Field>
          <Field label="Fecha objetivo">
            <input
              type="date"
              className="input-field"
              value={form.due_date}
              onChange={(e) => setForm((prev) => ({ ...prev, due_date: e.target.value }))}
            />
          </Field>
          <Field label="Objetivo (S/)">
            <input
              type="number"
              step="0.01"
              min="0.01"
              className="input-field"
              value={form.target_amount}
              onChange={(e) => setForm((prev) => ({ ...prev, target_amount: e.target.value }))}
              required
            />
          </Field>
          <Field label="Acumulado (S/)">
            <input
              type="number"
              step="0.01"
              min="0"
              className="input-field"
              value={form.current_amount}
              onChange={(e) => setForm((prev) => ({ ...prev, current_amount: e.target.value }))}
              required
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
