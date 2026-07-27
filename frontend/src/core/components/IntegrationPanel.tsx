import type { LucideIcon } from 'lucide-react'
import type { ReactNode } from 'react'

interface IntegrationPanelProps {
  title: string
  description?: ReactNode
  icon?: LucideIcon
  badge?: ReactNode
  children: ReactNode
  className?: string
}

export function IntegrationPanel({
  title,
  description,
  icon: Icon,
  badge,
  children,
  className = '',
}: IntegrationPanelProps) {
  return (
    <section className={`integration-panel ${className}`.trim()}>
      <div className="integration-panel__header">
        <div className="min-w-0">
          <div className="integration-panel__title-row">
            {Icon ? <Icon size={18} className="integration-panel__icon" aria-hidden /> : null}
            <h3 className="integration-panel__title">{title}</h3>
            {badge}
          </div>
          {description ? <p className="integration-panel__description">{description}</p> : null}
        </div>
      </div>
      <div className="integration-panel__body">{children}</div>
    </section>
  )
}
