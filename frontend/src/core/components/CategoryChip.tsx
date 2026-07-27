interface CategoryChipProps {
  name: string
  color: string
  className?: string
  size?: 'sm' | 'md'
}

export function CategoryChip({ name, color, className = '', size = 'md' }: CategoryChipProps) {
  const initial = name.trim().charAt(0).toUpperCase() || '?'
  const swatchSize = size === 'sm' ? 'h-7 w-7 text-[0.65rem]' : 'h-8 w-8 text-xs'

  return (
    <span className={`category-chip ${className}`.trim()} title={name}>
      <span
        className={`category-chip__swatch ${swatchSize}`}
        style={{ backgroundColor: color }}
        aria-hidden="true"
      >
        {initial}
      </span>
      <span className="category-chip__label">{name}</span>
    </span>
  )
}
