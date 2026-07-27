type ProgressVariant = 'primary' | 'ok' | 'risk' | 'exceeded'

interface ProgressBarProps {
  /** 0–100+; visualmente se limita a 100. */
  value: number
  variant?: ProgressVariant
  size?: 'md' | 'lg'
  className?: string
  showLabel?: boolean
  label?: string
}

const FILL_CLASS: Record<ProgressVariant, string> = {
  primary: 'progress-fill',
  ok: 'progress-fill progress-fill--ok',
  risk: 'progress-fill progress-fill--risk',
  exceeded: 'progress-fill progress-fill--exceeded',
}

export function ProgressBar({
  value,
  variant = 'primary',
  size = 'md',
  className = '',
  showLabel = false,
  label,
}: ProgressBarProps) {
  const width = Number.isFinite(value) ? Math.min(Math.max(value, 0), 100) : 0
  const display =
    label ??
    (Number.isFinite(value) ? `${value.toFixed(value % 1 === 0 ? 0 : 1)}%` : '0%')

  return (
    <div className={`flex items-center gap-2 ${className}`.trim()}>
      <div
        className={`progress-track ${size === 'lg' ? 'progress-track--lg' : ''} min-w-0 flex-1`}
        role="progressbar"
        aria-valuenow={Math.round(width)}
        aria-valuemin={0}
        aria-valuemax={100}
        aria-label={`Progreso ${display}`}
      >
        <div className={FILL_CLASS[variant]} style={{ width: `${width}%` }} />
      </div>
      {showLabel && (
        <span className="shrink-0 text-xs font-semibold tabular-nums text-muted">{display}</span>
      )}
    </div>
  )
}
