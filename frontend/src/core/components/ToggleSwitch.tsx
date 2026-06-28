import { useId } from 'react'

interface ToggleSwitchProps {
  checked: boolean
  onChange: (checked: boolean) => void
  disabled?: boolean
  label?: string
  id?: string
}

export function ToggleSwitch({ checked, onChange, disabled = false, label, id }: ToggleSwitchProps) {
  const autoId = useId()
  const switchId = id ?? autoId

  return (
    <label htmlFor={switchId} className={`toggle-switch${disabled ? ' toggle-switch--disabled' : ''}`}>
      <input
        id={switchId}
        type="checkbox"
        role="switch"
        checked={checked}
        disabled={disabled}
        onChange={(e) => onChange(e.target.checked)}
        className="toggle-switch__input"
      />
      <span className="toggle-switch__track" aria-hidden="true">
        <span className="toggle-switch__thumb" />
      </span>
      {label && <span className="toggle-switch__label">{label}</span>}
    </label>
  )
}