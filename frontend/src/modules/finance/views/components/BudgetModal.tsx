import { useEffect, useState } from 'react'

import { Modal } from '../../../../core/components/Modal'
import { alertError, alertSuccess } from '../../../../core/utils/alerts'
import { useCreateBudget, useUpdateBudget } from '../../application/hooks/useFinance'
import type { Budget, CatalogItem } from '../../domain/models/finance.types'
import { currentMonthYear } from '../../application/utils/formatters'

interface BudgetModalProps {
  isOpen: boolean
  onClose: () => void
  categories: CatalogItem[]
  editing?: Budget | null
  defaultMonthYear?: string
}

export function BudgetModal({
  isOpen,
  onClose,
  categories,
  editing,
  defaultMonthYear,
}: BudgetModalProps) {
  const createBudget = useCreateBudget()
  const updateBudget = useUpdateBudget()
  const isEditing = Boolean(editing)
  const [error, setError] = useState<string | null>(null)

  const [form, setForm] = useState({
    month_year: defaultMonthYear ?? currentMonthYear(),
    category: '',
    budgeted_amount: '',
  })

  useEffect(() => {
    if (!isOpen) return
    setError(null)
    if (editing) {
      setForm({
        month_year: editing.month_year,
        category: editing.category,
        budgeted_amount: editing.budgeted_amount,
      })
      return
    }
    setForm({
      month_year: defaultMonthYear ?? currentMonthYear(),
      category: categories[0]?.name ?? '',
      budgeted_amount: '',
    })
  }, [isOpen, editing, categories, defaultMonthYear])

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault()
    setError(null)
    const payload = {
      month_year: form.month_year,
      category: form.category,
      budgeted_amount: Number(form.budgeted_amount),
    }
    try {
      if (isEditing && editing) {
        await updateBudget.mutateAsync({ id: editing.id, payload })
        await alertSuccess('Presupuesto actualizado')
      } else {
        await createBudget.mutateAsync(payload)
        await alertSuccess('Presupuesto creado')
      }
      onClose()
    } catch {
      setError('No se pudo guardar el presupuesto.')
      await alertError('Error', 'No se pudo guardar el presupuesto.')
    }
  }

  const pending = createBudget.isPending || updateBudget.isPending

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={isEditing ? 'Editar presupuesto' : 'Nuevo presupuesto'}
      size="md"
    >
      <form onSubmit={handleSubmit} className="space-y-4">
        <Field label="Mes">
          <input
            type="month"
            value={form.month_year}
            onChange={(e) => setForm((prev) => ({ ...prev, month_year: e.target.value }))}
            className="input-field"
            required
          />
        </Field>
        <Field label="Categoría">
          <select
            value={form.category}
            onChange={(e) => setForm((prev) => ({ ...prev, category: e.target.value }))}
            className="input-field"
            required
          >
            <option value="">Seleccionar categoría</option>
            {categories.map((item) => (
              <option key={item.id} value={item.name}>
                {item.name}
              </option>
            ))}
          </select>
        </Field>
        <Field label="Monto presupuestado">
          <input
            type="number"
            step="0.01"
            min="0.01"
            value={form.budgeted_amount}
            onChange={(e) => setForm((prev) => ({ ...prev, budgeted_amount: e.target.value }))}
            className="input-field"
            required
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
