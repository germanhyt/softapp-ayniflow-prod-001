import { colorForCategory } from '../../application/utils/chartColors'
import { ensureArray } from '../../../../core/utils/collections'
import { DistributionPieChart } from './DistributionPieChart'

interface CategoryPieChartProps {
  data: { category: string; amount: string; count: number }[]
  height?: number
}

export function CategoryPieChart({ data, height }: CategoryPieChartProps) {
  const chartData = ensureArray<{ category: string; amount: string; count: number }>(data).map((item) => ({
    name: item.category,
    value: Number(item.amount),
    count: item.count,
  }))

  return (
    <DistributionPieChart
      data={chartData}
      resolveColor={colorForCategory}
      emptyMessage="Sin categorías registradas."
      height={height}
    />
  )
}
