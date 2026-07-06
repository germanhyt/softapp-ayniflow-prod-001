import { Cell, Legend, Pie, PieChart, ResponsiveContainer, Tooltip } from 'recharts'

import { ensureArray } from '../../../../core/utils/collections'

export interface DistributionSlice {
  name: string
  value: number
  count: number
}

interface DistributionPieChartProps {
  data: DistributionSlice[]
  resolveColor: (name: string, index: number) => string
  emptyMessage?: string
  height?: number
  showPercentLabels?: boolean
}

export function DistributionPieChart({
  data,
  resolveColor,
  emptyMessage = 'Sin datos registrados.',
  height = 300,
  showPercentLabels = true,
}: DistributionPieChartProps) {
  const rows = ensureArray<DistributionSlice>(data)
  if (!rows.length) {
    return <p className="py-8 text-center text-sm text-muted">{emptyMessage}</p>
  }

  const total = rows.reduce((sum, item) => sum + item.value, 0)

  return (
    <ResponsiveContainer width="100%" height={height}>
      <PieChart>
        <Pie
          data={rows}
          dataKey="value"
          nameKey="name"
          cx="50%"
          cy="50%"
          innerRadius={height <= 240 ? 42 : 55}
          outerRadius={height <= 240 ? 72 : 95}
          paddingAngle={2}
          label={
            showPercentLabels
              ? ({ percent }) => (percent && percent >= 0.06 ? `${(percent * 100).toFixed(0)}%` : '')
              : false
          }
          labelLine={false}
        >
          {rows.map((item, index) => (
            <Cell key={item.name} fill={resolveColor(item.name, index)} />
          ))}
        </Pie>
        <Tooltip
          contentStyle={{
            backgroundColor: 'var(--premium-surface)',
            border: '1px solid var(--premium-border)',
            borderRadius: '8px',
          }}
          formatter={(value, _name, item) => {
            const numeric = Number(value)
            const pct = total > 0 ? ((numeric / total) * 100).toFixed(1) : '0'
            return [
              `S/ ${numeric.toFixed(2)} · ${pct}% (${item.payload.count} ops.)`,
              item.payload.name,
            ]
          }}
        />
        <Legend wrapperStyle={{ fontSize: '0.8rem' }} />
      </PieChart>
    </ResponsiveContainer>
  )
}
