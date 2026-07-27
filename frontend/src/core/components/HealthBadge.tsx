type HealthTone = 'success' | 'warning' | 'danger' | 'info' | 'primary'

interface HealthBadgeProps {
  label: string
  tone?: HealthTone
  className?: string
}

const TONE_CLASS: Record<HealthTone, string> = {
  success: 'badge badge-success',
  warning: 'badge badge-warning',
  danger: 'badge badge-danger',
  info: 'badge badge-info',
  primary: 'badge',
}

export function HealthBadge({ label, tone = 'primary', className = '' }: HealthBadgeProps) {
  return <span className={`${TONE_CLASS[tone]} ${className}`.trim()}>{label}</span>
}
