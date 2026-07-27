interface ChartSkeletonProps {
  height?: number
  variant?: 'pie' | 'bar' | 'line'
}

export function ChartSkeleton({ height = 240, variant = 'bar' }: ChartSkeletonProps) {
  return (
    <div className="chart-skeleton" style={{ minHeight: height }} aria-hidden>
      {variant === 'pie' ? (
        <div className="chart-skeleton__pie">
          <div className="skeleton chart-skeleton__ring" />
        </div>
      ) : (
        <div className="chart-skeleton__bars">
          {Array.from({ length: variant === 'line' ? 12 : 8 }).map((_, i) => (
            <div
              key={i}
              className="skeleton chart-skeleton__bar"
              style={{ height: `${30 + ((i * 17) % 55)}%` }}
            />
          ))}
        </div>
      )}
      <div className="chart-skeleton__legend">
        <div className="skeleton h-3 w-16" />
        <div className="skeleton h-3 w-20" />
        <div className="skeleton h-3 w-14" />
      </div>
    </div>
  )
}
