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

import { ProgressBar } from '../../../core/components/ProgressBar'
import { StatSummary } from '../../../core/components/StatSummary'
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
            <h2 className="text-xl font-semibold tracking-tight">Cierre de caja</h2>
          </div>
          <p className="text-sm text-muted">
            Cuadre del periodo: ingresos, egresos y resultado de un vistazo.
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
        <section className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
          {Array.from({ length: 4 }).map((_, index) => (
            <div key={index} className="stat-summary space-y-3">
              <div className="skeleton h-3 w-24" />
              <div className="skeleton h-7 w-32" />
            </div>
          ))}
        </section>
      ) : data ? (
        <>
          <section
            className={`stat-summary border-l-4 ${
              balanceValue >= 0 ? 'stat-summary--success' : 'stat-summary--danger'
            }`}
            style={{
              borderLeftColor:
                balanceValue >= 0 ? 'var(--premium-success)' : 'var(--premium-danger)',
            }}
          >
            <div className="flex flex-wrap items-center justify-between gap-4">
              <div>
                <p className="stat-summary__label flex items-center gap-2">
                  <Scale size={14} />
                  Resultado del cierre
                </p>
                <p className="stat-summary__value text-3xl">{formatCurrency(data.balance)}</p>
                <p className="mt-1 text-sm text-muted">
                  {balanceValue >= 0 ? 'Superávit en el periodo' : 'Déficit en el periodo'}
                </p>
              </div>
              <div className="text-right text-sm text-muted">
                <p>{data.transaction_count} movimiento(s)</p>
                <p>
                  {data.income_count} ingreso(s) · {data.expense_count} egreso(s)
                </p>
              </div>
            </div>
          </section>

          <section className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
            <StatSummary
              label="Total ingresos"
              value={formatCurrency(data.total_income)}
              tone="success"
              hint={
                <span className="inline-flex items-center gap-1">
                  <ArrowUpCircle size={12} />
                  {data.income_count} operación(es)
                </span>
              }
            />
            <StatSummary
              label="Total egresos"
              value={formatCurrency(data.total_expense)}
              tone="danger"
              hint={
                <span className="inline-flex items-center gap-1">
                  <ArrowDownCircle size={12} />
                  {data.expense_count} operación(es)
                </span>
              }
            />
            <StatSummary
              label="Flujo neto"
              value={formatCurrency(data.balance)}
              tone={balanceValue >= 0 ? 'info' : 'warning'}
              hint="Ingresos − egresos"
            />
            <StatSummary
              label="Periodo"
              value={periodLabel}
              hint={`${data.transaction_count} transacciones`}
            />
          </section>

          {flowTotal > 0 && (
            <section className="card space-y-3">
              <h3 className="font-medium">Composición del flujo</h3>
              <div className="flex h-2.5 overflow-hidden rounded-full" style={{ backgroundColor: 'var(--premium-danger-soft)' }}>
                <div
                  className="h-full rounded-full transition-all duration-500"
                  style={{
                    width: `${incomeShare}%`,
                    backgroundColor: 'var(--premium-success)',
                  }}
                  title={`Ingresos ${incomeShare}%`}
                />
              </div>
              <div className="flex flex-wrap justify-between gap-2 text-sm">
                <span className="text-muted">
                  Ingresos: <strong className="text-premium-text">{formatCurrency(data.total_income)}</strong>{' '}
                  ({incomeShare}%)
                </span>
                <span className="text-muted">
                  Egresos: <strong className="text-premium-text">{formatCurrency(data.total_expense)}</strong>{' '}
                  ({100 - incomeShare}%)
                </span>
              </div>
              <ProgressBar value={incomeShare} variant="ok" showLabel label={`${incomeShare}% ingresos`} />
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
                <div className="space-y-2">
                  {data.by_payment_type.map((item) => {
                    const amount = Number(item.amount)
                    const share =
                      expenseTotal + incomeTotal > 0
                        ? (amount / (expenseTotal + incomeTotal)) * 100
                        : 0
                    return (
                      <div key={item.payment_type} className="budget-card space-y-2 !rounded-xl !p-3">
                        <div className="flex items-center justify-between gap-2 text-sm">
                          <p className="font-medium">{item.payment_type}</p>
                          <p className="tabular-nums font-semibold">{formatCurrency(item.amount)}</p>
                        </div>
                        <ProgressBar value={share} variant="primary" showLabel label={`${item.count} ops`} />
                      </div>
                    )
                  })}
                </div>
              ) : (
                <p className="text-sm text-muted">Sin movimientos en el periodo.</p>
              )}
            </div>
          </section>

          <section className="card flex flex-wrap items-center justify-between gap-3">
            <p className="text-sm text-muted">¿Necesitas revisar o ajustar movimientos del periodo?</p>
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
        <div className="empty-state">
          <div className="empty-state__icon">
            <Calculator size={28} />
          </div>
          <p className="text-sm text-muted">Selecciona un periodo válido para calcular el cierre.</p>
        </div>
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
