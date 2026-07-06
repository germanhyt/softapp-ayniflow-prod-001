import { colorForPaymentType } from '../../application/utils/chartColors'
import { ensureArray } from '../../../../core/utils/collections'
import { DistributionPieChart } from './DistributionPieChart'

interface PaymentTypePieChartProps {
  data: { payment_type: string; amount: string; count: number }[]
  height?: number
}

export function PaymentTypePieChart({ data, height }: PaymentTypePieChartProps) {
  const chartData = ensureArray<{ payment_type: string; amount: string; count: number }>(data).map((item) => ({
    name: item.payment_type,
    value: Number(item.amount),
    count: item.count,
  }))

  return (
    <DistributionPieChart
      data={chartData}
      resolveColor={colorForPaymentType}
      emptyMessage="Sin tipos de pago registrados."
      height={height}
    />
  )
}
