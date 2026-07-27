import type { ReactNode } from 'react'

interface FormFieldProps {
  label: string
  children: ReactNode
  className?: string
  hint?: ReactNode
  htmlFor?: string
}

export function FormField({ label, children, className = '', hint, htmlFor }: FormFieldProps) {
  return (
    <label className={`form-field ${className}`.trim()} htmlFor={htmlFor}>
      <span className="form-field__label">{label}</span>
      {children}
      {hint ? <p className="form-field__hint">{hint}</p> : null}
    </label>
  )
}

interface ModalFormActionsProps {
  children: ReactNode
  className?: string
}

export function ModalFormActions({ children, className = '' }: ModalFormActionsProps) {
  return (
    <div className={`modal-actions -mx-5 -mb-4 mt-2 ${className}`.trim()}>{children}</div>
  )
}
