import type { LoanType } from '../../domain/models/finance.types'

export const LOAN_TYPE_LABELS: Record<LoanType, string> = {
  payable: 'Debo',
  receivable: 'Me deben',
}

export const LOAN_COUNTERPARTY_LABELS: Record<LoanType, string> = {
  payable: 'Acreedor / prestamista',
  receivable: 'Deudor',
}

export function getLoanTypeLabel(loanType: LoanType): string {
  return LOAN_TYPE_LABELS[loanType] ?? loanType
}

export function getLoanLinkLabel(loanType: LoanType, movementType: 'Ingreso' | 'Egreso'): string {
  if (loanType === 'payable') return 'Pagar deuda'
  return movementType === 'Ingreso' ? 'Registrar cobro' : 'Desembolsar / prestar'
}
