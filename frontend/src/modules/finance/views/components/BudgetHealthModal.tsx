import { Info } from 'lucide-react'
import { useEffect, useState } from 'react'

import { CategoryChip } from '../../../../core/components/CategoryChip'
import { HealthBadge } from '../../../../core/components/HealthBadge'
import { Modal } from '../../../../core/components/Modal'
import { ProgressBar } from '../../../../core/components/ProgressBar'
import {
  budgetHealthLabel,
  budgetHealthProgressVariant,
  budgetHealthTone,
  budgetProgressValue,
  getBudgetHealthStatus,
} from '../../application/utils/budgetHealth'
import { colorForCategory } from '../../application/utils/chartColors'
import { formatCurrency } from '../../application/utils/formatters'
import type { BudgetHealthBreakdown } from '../../domain/models/finance.types'

type HealthTab = 'at_risk' | 'exceeded'

interface BudgetHealthModalProps {
  isOpen: boolean
  onClose: () => void
  breakdown: BudgetHealthBreakdown | undefined
  initialTab?: HealthTab
}

export function BudgetHealthModal({
  isOpen,
  onClose,
  breakdown,
  initialTab = 'at_risk',
}: BudgetHealthModalProps) {
  const [tab, setTab] = useState<HealthTab>(initialTab)

  useEffect(() => {
    if (isOpen) setTab(initialTab)
  }, [isOpen, initialTab])
  const items = tab === 'at_risk' ? (breakdown?.at_risk ?? []) : (breakdown?.exceeded ?? [])
  const title =
    tab === 'at_risk'
      ? 'Presupuestos en riesgo (80%–99%)'
      : 'Presupuestos excedidos (≥100%)'
  const description =
    tab === 'at_risk'
      ? 'Categorías que ya consumieron entre el 80% y el 99% del monto presupuestado. Aún no superan el límite, pero conviene vigilarlas.'
      : 'Categorías cuyo gasto real superó el monto presupuestado. El conteo indica cuántas categorías están en esta situación, no el monto excedido total.'

  return (
    <Modal isOpen={isOpen} onClose={onClose} title={title} size="lg">
      <div className="space-y-4">
        <div className="flex flex-wrap gap-2">
          <button
            type="button"
            className={tab === 'at_risk' ? 'btn-primary' : 'btn-secondary'}
            onClick={() => setTab('at_risk')}
          >
            En riesgo ({breakdown?.at_risk_count ?? 0})
          </button>
          <button
            type="button"
            className={tab === 'exceeded' ? 'btn-primary' : 'btn-secondary'}
            onClick={() => setTab('exceeded')}
          >
            Excedidos ({breakdown?.exceeded_count ?? 0})
          </button>
        </div>

        <div
          className="flex gap-2 rounded-lg border p-3 text-sm"
          style={{ borderColor: 'var(--premium-border)' }}
        >
          <Info size={18} className="mt-0.5 shrink-0 text-premium-primary" />
          <p className="text-muted">{description}</p>
        </div>

        {items.length ? (
          <>
            <div className="space-y-2 lg:hidden">
              {items.map((item, index) => {
                const status = getBudgetHealthStatus(item.percentage)
                return (
                  <article key={item.id} className="budget-card space-y-2 !rounded-xl !p-3">
                    <div className="flex items-start justify-between gap-2">
                      <CategoryChip
                        name={item.category}
                        color={colorForCategory(item.category, index)}
                        size="sm"
                      />
                      <HealthBadge
                        label={budgetHealthLabel(status)}
                        tone={budgetHealthTone(status)}
                      />
                    </div>
                    <ProgressBar
                      value={budgetProgressValue(item.percentage)}
                      variant={budgetHealthProgressVariant(status)}
                      showLabel
                      size="lg"
                    />
                    <div className="grid grid-cols-3 gap-2 text-xs">
                      <div>
                        <p className="text-muted">Plan</p>
                        <p className="font-medium tabular-nums">
                          {formatCurrency(item.budgeted_amount)}
                        </p>
                      </div>
                      <div>
                        <p className="text-muted">Real</p>
                        <p className="font-medium tabular-nums">
                          {formatCurrency(item.actual_amount)}
                        </p>
                      </div>
                      <div className="text-right">
                        <p className="text-muted">Diff</p>
                        <p className="font-medium tabular-nums">
                          {formatCurrency(item.difference)}
                        </p>
                      </div>
                    </div>
                  </article>
                )
              })}
            </div>

            <div className="table-shell hidden overflow-x-auto lg:block">
              <table className="min-w-full text-left text-sm">
                <thead className="table-head">
                  <tr>
                    <th className="px-4 py-3">Categoría</th>
                    <th className="min-w-40 px-4 py-3">Progreso</th>
                    <th className="px-4 py-3">Presupuestado</th>
                    <th className="px-4 py-3">Ejecutado</th>
                    <th className="px-4 py-3">Diferencia</th>
                  </tr>
                </thead>
                <tbody>
                  {items.map((item, index) => {
                    const status = getBudgetHealthStatus(item.percentage)
                    return (
                      <tr key={item.id} className="table-row">
                        <td className="px-4 py-3">
                          <CategoryChip
                            name={item.category}
                            color={colorForCategory(item.category, index)}
                            size="sm"
                          />
                        </td>
                        <td className="px-4 py-3">
                          <ProgressBar
                            value={budgetProgressValue(item.percentage)}
                            variant={budgetHealthProgressVariant(status)}
                            showLabel
                            size="lg"
                          />
                        </td>
                        <td className="px-4 py-3 tabular-nums">
                          {formatCurrency(item.budgeted_amount)}
                        </td>
                        <td className="px-4 py-3 tabular-nums">
                          {formatCurrency(item.actual_amount)}
                        </td>
                        <td className="px-4 py-3 tabular-nums">
                          {formatCurrency(item.difference)}
                        </td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>
          </>
        ) : (
          <p className="py-4 text-center text-sm text-muted">
            No hay categorías en esta condición para el mes seleccionado.
          </p>
        )}

        <div className="modal-actions -mx-5 -mb-4 mt-2">
          <button type="button" onClick={onClose} className="btn-primary">
            Cerrar
          </button>
        </div>
      </div>
    </Modal>
  )
}
