export type BudgetHealthStatus = 'ok' | 'risk' | 'exceeded'

/** Alineado al backend: ok <80%, risk 80–99%, exceeded ≥100%. */
export function getBudgetHealthStatus(percentage: number | string): BudgetHealthStatus {
  const value = typeof percentage === 'string' ? Number(percentage) : percentage
  if (!Number.isFinite(value)) return 'ok'
  if (value >= 100) return 'exceeded'
  if (value >= 80) return 'risk'
  return 'ok'
}

export function budgetHealthLabel(status: BudgetHealthStatus): string {
  switch (status) {
    case 'exceeded':
      return 'Excedido'
    case 'risk':
      return 'En riesgo'
    default:
      return 'En plan'
  }
}

export function budgetHealthTone(status: BudgetHealthStatus): 'success' | 'warning' | 'danger' {
  switch (status) {
    case 'exceeded':
      return 'danger'
    case 'risk':
      return 'warning'
    default:
      return 'success'
  }
}

export function budgetHealthProgressVariant(
  status: BudgetHealthStatus,
): 'ok' | 'risk' | 'exceeded' {
  return status
}

/** Valor numérico del % para la barra (puede superar 100). */
export function budgetProgressValue(percentage: number | string): number {
  const value = typeof percentage === 'string' ? Number(percentage) : percentage
  if (!Number.isFinite(value) || value <= 0) return 0
  return value
}
