interface SegmentTabOption<T extends string> {
  value: T
  label: string
}

interface SegmentTabsProps<T extends string> {
  options: SegmentTabOption<T>[]
  value: T | string
  onChange: (value: T) => void
  className?: string
}

export function SegmentTabs<T extends string>({
  options,
  value,
  onChange,
  className = '',
}: SegmentTabsProps<T>) {
  return (
    <div className={`segment-tabs ${className}`.trim()} role="tablist">
      {options.map((option) => {
        const active = option.value === value
        return (
          <button
            key={option.value || '__all__'}
            type="button"
            role="tab"
            aria-selected={active}
            onClick={() => onChange(option.value)}
            className={`segment-tab${active ? ' segment-tab--active' : ''}`}
          >
            {option.label}
          </button>
        )
      })}
    </div>
  )
}
