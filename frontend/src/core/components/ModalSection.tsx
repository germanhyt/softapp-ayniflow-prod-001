import type { LucideIcon } from 'lucide-react'
import type { ReactNode } from 'react'

interface ModalSectionProps {
  title: string
  description?: ReactNode
  icon?: LucideIcon
  actions?: ReactNode
  children: ReactNode
  className?: string
}

export function ModalSection({
  title,
  description,
  icon: Icon,
  actions,
  children,
  className = '',
}: ModalSectionProps) {
  return (
    <section className={`modal-section ${className}`.trim()}>
      <div className="modal-section__header">
        <div className="min-w-0">
          <div className="modal-section__title-row">
            {Icon ? <Icon size={16} className="modal-section__icon" aria-hidden /> : null}
            <h3 className="modal-section__title">{title}</h3>
          </div>
          {description ? <p className="modal-section__description">{description}</p> : null}
        </div>
        {actions ? <div className="modal-section__actions">{actions}</div> : null}
      </div>
      <div className="modal-section__body">{children}</div>
    </section>
  )
}
