import {
  ArrowDownCircle,
  ArrowLeftRight,
  ArrowUpCircle,
  Calculator,
  CalendarRange,
  FileSpreadsheet,
  FileText,
  Scale,
} from 'lucide-react'
import { useMemo, useState } from 'react'
import { Link } from 'react-router-dom'

import { useCashClosing, useExportReports } from '../application/hooks/useFinance'
import {
  daysAgoIsoDate,
  firstDayOfMonthIsoDate,
  formatCurrency,
  startOfWeekIsoDate,
  todayIsoDate,
} from '../application/utils/formatters'
import { BalanceByDayChart } from './components/BalanceByDayChart'

type PeriodPreset = 'today' | 'yesterday' | 'week' | 'month' | 'custom'

const PRESETS: { id: PeriodPreset; label: string; getRange: () => { from: string; to: string } }[] = [
  { id: 'today', label: 'Hoy', getRange: () => ({ from: todayIsoDate(), to: todayIsoDate() }) },
  {
    id: 'yesterday',
    label: 'Ayer',
    getRange: () => ({ from: daysAgoIsoDate(1), to: daysAgoIsoDate(1) }),
  },
  {
    id: 'week',
    label: 'Esta semana',
    getRange: () => ({ from: startOfWeekIsoDate(), to: todayIsoDate() }),
  },
  {
    id: 'month',
    label: 'Este mes',
    getRange: () => ({ from: firstDayOfMonthIsoDate(), to: todayIsoDate() }),
  },
]

export function CashClosingPage() {
  const [from, setFrom] = useState(todayIsoDate())
  const [to, setTo] = useState(todayIsoDate())
  const [activePreset, setActivePreset] = useState<PeriodPreset>('today')

  const invalidRange = from > to
  const { data, isLoading, isFetching } = useCashClosing(from, to, !invalidRange)
  const { exportExcel, exportPdf } = useExportReports()
  const filters = { from, to }

  const incomeTotal = Number(data?.total_income ?? 0)
  const expenseTotal = Number(data?.total_expense ?? 0)
  const flowTotal = incomeTotal + expenseTotal
  const incomeShare = flowTotal > 0 ? Math.round((incomeTotal / flowTotal) * 100) : 50
  const balanceValue = Number(data?.balance ?? 0)

  const periodLabel = useMemo(() => {
    if (from === to) return from
    return `${from} → ${to}`
  }, [from, to])

  const applyPreset = (preset: PeriodPreset) => {
    if (preset === 'custom') {
      setActivePreset('custom')
      return
    }
    const range = PRESETS.find((item) => item.id === preset)?.getRange()
    if (!range) return
    setFrom(range.from)
    setTo(range.to)
    setActivePreset(preset)
  }

  const handleDateChange = (field: 'from' | 'to', value: string) => {
    if (field === 'from') setFrom(value)
    else setTo(value)
    setActivePreset('custom')
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <div className="mb-1 flex items-center gap-2">
            <Calculator size={22} className="text-premium-primary" />
            <h2 className="text-xl font-semibold">Cierre de caja</h2>
          </div>
          <p className="text-sm text-muted">
            Cuadre del periodo con ingresos, egresos, balance y desglose operativo.
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <button
            type="button"
            onClick={() => exportExcel(filters)}
            disabled={invalidRange || !data}
            className="btn-secondary inline-flex items-center gap-2"
          >
            <FileSpreadsheet size={16} />
            Excel
          </button>
          <button
            type="button"
            onClick={() => exportPdf(filters)}
            disabled={invalidRange || !data}
            className="btn-secondary inline-flex items-center gap-2"
          >
            <FileText size={16} />
            PDF
          </button>
        </div>
      </div>

      <section className="card space-y-4">
        <div className="flex flex-wrap gap-2">
          {PRESETS.map((preset) => (
            <button
              key={preset.id}
              type="button"
              onClick={() => applyPreset(preset.id)}
              className={activePreset === preset.id ? 'btn-primary' : 'btn-secondary'}
            >
              {preset.label}
            </button>
          ))}
        </div>

        <div className="grid gap-4 md:grid-cols-2">
          <FilterField label="Desde" icon={<CalendarRange size={16} />}>
            <input
              type="date"
              value={from}
              onChange={(e) => handleDateChange('from', e.target.value)}
              className="input-field"
            />
          </FilterField>
          <FilterField label="Hasta" icon={<CalendarRange size={16} />}>
            <input
              type="date"
              value={to}
              onChange={(e) => handleDateChange('to', e.target.value)}
              className="input-field"
            />
          </FilterField>
        </div>

        {invalidRange && (
          <p className="alert-error rounded-lg px-3 py-2 text-sm">
            La fecha inicial no puede ser posterior a la final.
          </p>
        )}

        {!invalidRange && (
          <p className="text-sm text-muted">
            Periodo activo: <strong>{periodLabel}</strong>
            {isFetching && !isLoading ? ' · actualizando…' : ''}
          </p>
        )}
      </section>

      {invalidRange ? null : isLoading ? (
        <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
          {Array.from({ length: 4 }).map((_, index) => (
            <div key={index} className="card animate-pulse">
              <div className="mb-2 h-4 w-24 rounded" style={{ backgroundColor: 'var(--premium-border)' }} />
              <div className="h-8 w-32 rounded" style={{ backgroundColor: 'var(--premium-border)' }} />
            </div>
          ))}
        </section>
      ) : data ? (
        <>
          <section
            className={`card border-l-4 ${
              balanceValue >= 0 ? 'stat-card-balance' : 'stat-card-expense'
            }`}
            style={{
              borderLeftColor: balanceValue >= 0 ? 'var(--premium-primary)' : 'var(--premium-danger)',
            }}
          >
            <div className="flex flex-wrap items-center justify-between gap-4">
              <div>
                <p className="flex items-center gap-2 text-sm text-muted">
                  <Scale size={16} />
                  Resultado del cierre
                </p>
                <p className="mt-1 text-3xl font-semibold">{formatCurrency(data.balance)}</p>
                <p className="mt-1 text-sm text-muted">
                  {balanceValue >= 0 ? 'Superávit en el periodo' : 'Déficit en el periodo'}
                </p>
              </div>
              <div className="text-right text-sm">
                <p className="text-muted">{data.transaction_count} movimiento(s)</p>
                <p className="text-muted">
                  {data.income_count} ingreso(s) · {data.expense_count} egreso(s)
                </p>
              </div>
            </div>
          </section>

          <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
            <KpiCard
              label="Total ingresos"
              value={formatCurrency(data.total_income)}
              tone="income"
              icon={<ArrowUpCircle size={18} />}
              detail={`${data.income_count} operación(es)`}
            />
            <KpiCard
              label="Total egresos"
              value={formatCurrency(data.total_expense)}
              tone="expense"
              icon={<ArrowDownCircle size={18} />}
              detail={`${data.expense_count} operación(es)`}
            />
            <KpiCard
              label="Flujo neto"
              value={formatCurrency(data.balance)}
              tone="balance"
              icon={<Scale size={18} />}
              detail="Ingresos − egresos"
            />
            <KpiCard
              label="Periodo"
              value={periodLabel}
              tone="neutral"
              icon={<CalendarRange size={18} />}
              detail={`${data.transaction_count} transacciones`}
            />
          </section>

          {flowTotal > 0 && (
            <section className="card space-y-3">
              <h3 className="font-medium">Composición del flujo</h3>
              <div className="flex h-3 overflow-hidden rounded-full" style={{ backgroundColor: 'var(--premium-border)' }}>
                <div
                  className="h-full transition-all"
                  style={{ width: `${incomeShare}%`, backgroundColor: 'var(--premium-success, #22c55e)' }}
                  title={`Ingresos ${incomeShare}%`}
                />
                <div
                  className="h-full flex-1 transition-all"
                  style={{ backgroundColor: 'var(--premium-danger, #ef4444)' }}
                  title={`Egresos ${100 - incomeShare}%`}
                />
              </div>
              <div className="flex flex-wrap justify-between gap-2 text-sm">
                <span className="text-muted">
                  Ingresos: <strong>{formatCurrency(data.total_income)}</strong> ({incomeShare}%)
                </span>
                <span className="text-muted">
                  Egresos: <strong>{formatCurrency(data.total_expense)}</strong> ({100 - incomeShare}%)
                </span>
              </div>
            </section>
          )}

          <section className="grid gap-4 xl:grid-cols-5">
            <div className="chart-panel xl:col-span-3">
              <h3 className="mb-3 font-medium">Movimiento diario</h3>
              <BalanceByDayChart data={data.daily_balances} />
            </div>
            <div className="card xl:col-span-2">
              <h3 className="mb-3 font-medium">Por tipo de pago</h3>
              {data.by_payment_type.length ? (
                <div className="table-shell overflow-x-auto">
                  <table className="min-w-full text-left text-sm">
                    <thead className="table-head">
                      <tr>
                        <th className="px-3 py-2">Tipo</th>
                        <th className="px-3 py-2">Monto</th>
                        <th className="px-3 py-2">Ops.</th>
                      </tr>
                    </thead>
                    <tbody>
                      {data.by_payment_type.map((item) => (
                        <tr key={item.payment_type} className="table-row">
                          <td className="px-3 py-2">{item.payment_type}</td>
                          <td className="px-3 py-2">{formatCurrency(item.amount)}</td>
                          <td className="px-3 py-2 text-muted">{item.count}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              ) : (
                <p className="text-sm text-muted">Sin movimientos en el periodo.</p>
              )}
            </div>
          </section>

          <section className="card flex flex-wrap items-center justify-between gap-3">
            <p className="text-sm text-muted">
              ¿Necesitas revisar o ajustar movimientos del periodo?
            </p>
            <Link
              to="/finance/transactions"
              state={{ from, to }}
              className="btn-primary inline-flex items-center gap-2"
            >
              <ArrowLeftRight size={16} />
              Ir a transacciones
            </Link>
          </section>
        </>
      ) : (
        <p className="text-sm text-muted">Selecciona un periodo válido para calcular el cierre.</p>
      )}
    </div>
  )
}

function FilterField({
  label,
  icon,
  children,
}: {
  label: string
  icon?: React.ReactNode
  children: React.ReactNode
}) {
  return (
    <label className="block space-y-1 text-sm">
      <span className="flex items-center gap-1.5 font-medium">
        {icon}
        {label}
      </span>
      {children}
    </label>
  )
}

function KpiCard({
  label,
  value,
  tone,
  icon,
  detail,
}: {
  label: string
  value: string
  tone: 'income' | 'expense' | 'balance' | 'neutral'
  icon: React.ReactNode
  detail?: string
}) {
  const toneClass = {
    income: 'stat-card-income',
    expense: 'stat-card-expense',
    balance: 'stat-card-balance',
    neutral: '',
  }[tone]

  return (
    <div className={`stat-card ${toneClass}`}>
      <p className="flex items-center gap-1.5 text-sm text-muted">
        {icon}
        {label}
      </p>
      <p className="mt-1 text-xl font-semibold">{value}</p>
      {detail && <p className="mt-1 text-xs text-muted">{detail}</p>}
    </div>
  )
}
