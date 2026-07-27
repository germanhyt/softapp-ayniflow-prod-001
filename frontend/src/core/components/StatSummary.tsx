import type { ReactNode } from 'react'

type StatSummaryTone = 'neutral' | 'success' | 'warning' | 'danger' | 'info'

interface StatSummaryProps {
  label: string
  value: string
  hint?: ReactNode
  tone?: StatSummaryTone
  className?: string
}

const TONE_CLASS: Record<StatSummaryTone, string> = {
  neutral: '',
  success: 'stat-summary--success',
  warning: 'stat-summary--warning',
  danger: 'stat-summary--danger',
  info: 'stat-summary--info',
}

export function StatSummary({
  label,
  value,
  hint,
  tone = 'neutral',
  className = '',
}: StatSummaryProps) {
  return (
    <div className={`stat-summary ${TONE_CLASS[tone]} ${className}`.trim()}>
      <p className="stat-summary__label">{label}</p>
      <p className="stat-summary__value">{value}</p>
      {hint ? <div className="mt-1 text-xs text-muted">{hint}</div> : null}
    </div>
  )
}
