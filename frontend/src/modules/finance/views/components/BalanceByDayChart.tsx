import {
  Bar,
  BarChart,
  CartesianGrid,
  Legend,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts'

interface BalanceByDayChartProps {
  data: { date: string; income: string; expense: string }[]
}

export function BalanceByDayChart({ data }: BalanceByDayChartProps) {
  if (!data.length) {
    return <p className="py-8 text-center text-sm text-muted">Sin datos para el periodo.</p>
  }

  const chartData = data.slice(-30).map((item) => ({
    date: item.date.slice(5),
    ingresos: Number(item.income),
    egresos: Number(item.expense),
  }))

  return (
    <ResponsiveContainer width="100%" height={300}>
      <BarChart data={chartData} margin={{ top: 12, right: 12, left: 0, bottom: 0 }}>
        <CartesianGrid strokeDasharray="3 3" stroke="var(--premium-border)" />
        <XAxis dataKey="date" stroke="var(--premium-text-muted)" fontSize={11} tickMargin={8} />
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
            color: 'var(--premium-text)',
          }}
          formatter={(value) => [`S/ ${Number(value).toFixed(2)}`, '']}
        />
        <Legend wrapperStyle={{ fontSize: '0.85rem' }} />
        <Bar dataKey="ingresos" name="Ingresos" fill="var(--premium-primary)" radius={[4, 4, 0, 0]} />
        <Bar dataKey="egresos" name="Egresos" fill="var(--premium-danger)" radius={[4, 4, 0, 0]} />
      </BarChart>
    </ResponsiveContainer>
  )
}
