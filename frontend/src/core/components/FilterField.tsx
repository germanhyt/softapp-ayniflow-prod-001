import type { ReactNode } from 'react'

interface FilterFieldProps {
  label: string
  children: ReactNode
  icon?: ReactNode
}

export function FilterField({ label, children, icon }: FilterFieldProps) {
  return (
    <label className="filter-field">
      <span className="filter-field__label">
        {icon ? <span className="filter-field__icon">{icon}</span> : null}
        {label}
      </span>
      {children}
    </label>
  )
}

interface FilterPanelProps {
  children: ReactNode
  columns?: 2 | 3 | 4
  className?: string
}

export function FilterPanel({ children, columns = 3, className = '' }: FilterPanelProps) {
  const colClass =
    columns === 4 ? 'md:grid-cols-4' : columns === 2 ? 'md:grid-cols-2' : 'md:grid-cols-3'

  return <section className={`filter-panel grid gap-4 ${colClass} ${className}`.trim()}>{children}</section>
}
