import type { LucideIcon } from 'lucide-react'
import type { ReactNode } from 'react'

interface IntegrationPanelProps {
  title: string
  description?: ReactNode
  icon?: LucideIcon
  badge?: ReactNode
  headerAction?: ReactNode
  children: ReactNode
  className?: string
}

export function IntegrationPanel({
  title,
  description,
  icon: Icon,
  badge,
  headerAction,
  children,
  className = '',
}: IntegrationPanelProps) {
  return (
    <section className={`integration-panel ${className}`.trim()}>
      <div className="integration-panel__header">
        <div className="min-w-0 flex-1">
          <div className="integration-panel__title-row">
            {Icon ? <Icon size={18} className="integration-panel__icon" aria-hidden /> : null}
            <h3 className="integration-panel__title">{title}</h3>
            {badge}
          </div>
          {description ? <p className="integration-panel__description">{description}</p> : null}
        </div>
        {headerAction ? <div className="shrink-0 self-start">{headerAction}</div> : null}
      </div>
      <div className="integration-panel__body">{children}</div>
    </section>
  )
}
