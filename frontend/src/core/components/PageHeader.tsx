import type { LucideIcon } from 'lucide-react'
import type { ReactNode } from 'react'

interface PageHeaderProps {
  title: string
  description?: ReactNode
  icon?: LucideIcon
  badge?: ReactNode
  actions?: ReactNode
}

export function PageHeader({ title, description, icon: Icon, badge, actions }: PageHeaderProps) {
  return (
    <header className="page-header">
      <div className="page-header__main">
        <div className="page-header__title-row">
          {Icon ? <Icon size={22} className="page-header__icon" aria-hidden /> : null}
          <h2 className="page-header__title">{title}</h2>
          {badge}
        </div>
        {description ? <p className="page-header__description">{description}</p> : null}
      </div>
      {actions ? <div className="page-header__actions">{actions}</div> : null}
    </header>
  )
}
