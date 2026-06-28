import { Cell, Legend, Pie, PieChart, ResponsiveContainer, Tooltip } from 'recharts'

interface PaymentTypePieChartProps {
  data: { payment_type: string; amount: string; count: number }[]
}

const COLORS = [
  'var(--premium-primary)',
  'var(--premium-accent)',
  'var(--premium-secondary)',
  '#6b7280',
  '#94a3b8',
]

export function PaymentTypePieChart({ data }: PaymentTypePieChartProps) {
  if (!data.length) {
    return <p className="py-8 text-center text-sm text-muted">Sin tipos de pago registrados.</p>
  }

  const chartData = data.map((item) => ({
    name: item.payment_type,
    value: Number(item.amount),
    count: item.count,
  }))

  return (
    <ResponsiveContainer width="100%" height={300}>
      <PieChart>
        <Pie
          data={chartData}
          dataKey="value"
          nameKey="name"
          cx="50%"
          cy="50%"
          innerRadius={55}
          outerRadius={95}
          paddingAngle={2}
        >
          {chartData.map((_, index) => (
            <Cell key={index} fill={COLORS[index % COLORS.length]} />
          ))}
        </Pie>
        <Tooltip
          contentStyle={{
            backgroundColor: 'var(--premium-surface)',
            border: '1px solid var(--premium-border)',
            borderRadius: '8px',
          }}
          formatter={(value, _name, item) => [
            `S/ ${Number(value).toFixed(2)} (${item.payload.count} ops.)`,
            item.payload.name,
          ]}
        />
        <Legend wrapperStyle={{ fontSize: '0.8rem' }} />
      </PieChart>
    </ResponsiveContainer>
  )
}
