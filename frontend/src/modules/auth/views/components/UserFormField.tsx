interface UserFormFieldProps {
  label: string
  children: React.ReactNode
  className?: string
  hint?: string
}

export function UserFormField({ label, children, className = '', hint }: UserFormFieldProps) {
  return (
    <label className={`block space-y-1 text-sm ${className}`}>
      <span className="font-medium">{label}</span>
      {children}
      {hint && <p className="text-xs text-muted">{hint}</p>}
    </label>
  )
}
