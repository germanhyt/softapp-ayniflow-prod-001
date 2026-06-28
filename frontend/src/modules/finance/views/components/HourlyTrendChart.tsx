import type { Transaction } from '../../domain/models/finance.types'
import {
  CartesianGrid,
  Legend,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts'

interface HourlyTrendChartProps {
  transactions: Transaction[]
}

function buildHourlyData(transactions: Transaction[]) {
  const hours = Array.from({ length: 24 }, (_, hour) => ({
    hour: `${String(hour).padStart(2, '0')}:00`,
    ingresos: 0,
    egresos: 0,
  }))

  for (const tx of transactions) {
    const time = tx.transaction_time ?? '12:00:00'
    const hour = Number(time.split(':')[0] ?? 12)
    if (Number.isNaN(hour) || hour < 0 || hour > 23) continue
    const amount = Number(tx.amount)
    if (tx.movement_type === 'Ingreso') {
      hours[hour].ingresos += amount
    } else {
      hours[hour].egresos += amount
    }
  }

  return hours.filter((item) => item.ingresos > 0 || item.egresos > 0)
}

export function HourlyTrendChart({ transactions }: HourlyTrendChartProps) {
  const chartData = buildHourlyData(transactions)

  if (!chartData.length) {
    return <p className="py-8 text-center text-sm text-muted">Sin hora registrada en transacciones.</p>
  }

  return (
    <ResponsiveContainer width="100%" height={280}>
      <LineChart data={chartData} margin={{ top: 12, right: 12, left: 0, bottom: 0 }}>
        <CartesianGrid strokeDasharray="3 3" stroke="var(--premium-border)" />
        <XAxis dataKey="hour" stroke="var(--premium-text-muted)" fontSize={11} />
        <YAxis
          stroke="var(--premium-text-muted)"
          fontSize={11}
          tickFormatter={(value) => `S/ ${value}`}
        />
        <Tooltip
          contentStyle={{
            backgroundColor: 'var(--premium-surface)',
            border: '1px solid var(--premium-border)',
            borderRadius: '8px',
          }}
          formatter={(value) => [`S/ ${Number(value).toFixed(2)}`, '']}
        />
        <Legend wrapperStyle={{ fontSize: '0.85rem' }} />
        <Line
          type="monotone"
          dataKey="ingresos"
          name="Ingresos"
          stroke="var(--premium-primary)"
          strokeWidth={2}
          dot={false}
        />
        <Line
          type="monotone"
          dataKey="egresos"
          name="Egresos"
          stroke="var(--premium-danger)"
          strokeWidth={2}
          dot={false}
        />
      </LineChart>
    </ResponsiveContainer>
  )
}
