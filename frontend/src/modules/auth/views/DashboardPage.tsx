import {
  ArrowLeftRight,
  BarChart3,
  Calculator,
  CalendarRange,
  Clock3,
  HandCoins,
  Landmark,
  LayoutDashboard,
  LayoutList,
  PiggyBank,
  Plug,
  Scale,
  ShieldCheck,
  Wallet,
} from 'lucide-react'
import { useState } from 'react'
import { Link } from 'react-router-dom'

import { HealthBadge } from '../../../core/components/HealthBadge'
import { ProgressBar } from '../../../core/components/ProgressBar'
import { StatSummary } from '../../../core/components/StatSummary'
import { ensureArray } from '../../../core/utils/collections'
import {
  formatCurrency,
  firstDayOfMonthIsoDate,
  todayIsoDate,
  currentHourInLima,
  formatDateTimeWithSeconds,
} from '../../finance/application/utils/formatters'
import {
  useBudgetHealthBreakdown,
  useFinanceSummary,
  useGmailPollStatus,
  useIntegrationsStatus,
  useLoanSummary,
  useSavingsSummary,
} from '../../finance/application/hooks/useFinance'
import {
  budgetHealthProgressVariant,
  getBudgetHealthStatus,
} from '../../finance/application/utils/budgetHealth'
import { BalanceByDayChart } from '../../finance/views/components/BalanceByDayChart'
import { BudgetHealthModal } from '../../finance/views/components/BudgetHealthModal'
import { PaymentTypePieChart } from '../../finance/views/components/PaymentTypePieChart'
import { CategoryPieChart } from '../../finance/views/components/CategoryPieChart'
import { hasPermission, useCurrentUser } from '../application/hooks/useAuth'
import type { Role } from '../domain/models/auth.types'

const QUICK_LINKS = [
  {
    to: '/finance/transactions',
    icon: ArrowLeftRight,
    title: 'Transacciones',
    description: 'Registro, filtros y operaciones masivas',
  },
  {
    to: '/finance',
    icon: BarChart3,
    title: 'Análisis financiero',
    description: 'Métricas, gráficos y tendencias',
  },
  {
    to: '/finance/cash-closing',
    icon: Calculator,
    title: 'Cierre de caja',
    description: 'Cuadre por periodo y exportación',
  },
  {
    to: '/finance/budgets',
    icon: LayoutList,
    title: 'Presupuestos',
    description: 'Plan vs ejecutado por categoría',
  },
  {
    to: '/finance/savings',
    icon: PiggyBank,
    title: 'Ahorros',
    description: 'Metas y avance acumulado',
  },
  {
    to: '/finance/loans',
    icon: Landmark,
    title: 'Préstamos y cobranzas',
    description: 'Deuda activa y amortización',
  },
] as const

export function DashboardPage() {
  const { data: user } = useCurrentUser()
  const canFinance = hasPermission(user, 'finance:read')
  const [healthModalOpen, setHealthModalOpen] = useState(false)
  const [healthModalTab, setHealthModalTab] = useState<'at_risk' | 'exceeded'>('at_risk')
  const [showPermissions, setShowPermissions] = useState(false)

  const monthFilters = { from: firstDayOfMonthIsoDate(), to: todayIsoDate() }
  const monthYear = monthFilters.from.slice(0, 7)
  const { data: summary, isLoading: summaryLoading } = useFinanceSummary(monthFilters, {
    enabled: canFinance,
  })
  const { data: integrationsStatus } = useIntegrationsStatus({ enabled: canFinance })
  const { data: gmailPollStatus } = useGmailPollStatus()
  const { data: budgetHealth } = useBudgetHealthBreakdown(canFinance ? monthYear : undefined)
  const { data: savingsSummary } = useSavingsSummary({ enabled: canFinance })
  const { data: loanSummary } = useLoanSummary({ enabled: canFinance })

  const configuredIntegrations = integrationsStatus
    ? Object.values(integrationsStatus).filter((item) => item.configured).length
    : 0
  const totalIntegrations = integrationsStatus ? Object.keys(integrationsStatus).length : 0

  const totalBudgeted = Number(budgetHealth?.total_budgeted ?? 0)
  const totalActual = Number(budgetHealth?.total_actual ?? 0)
  const budgetExecutionPct =
    totalBudgeted > 0 ? Math.min(100, Math.round((totalActual / totalBudgeted) * 100)) : 0
  const totalBudgetRows =
    (budgetHealth?.ok_count ?? 0) +
    (budgetHealth?.at_risk_count ?? 0) +
    (budgetHealth?.exceeded_count ?? 0)

  const incomeTotal = Number(summary?.total_income ?? 0)
  const expenseTotal = Number(summary?.total_expense ?? 0)
  const balanceValue = Number(summary?.balance ?? 0)
  const flowTotal = incomeTotal + expenseTotal
  const incomeShare = flowTotal > 0 ? Math.round((incomeTotal / flowTotal) * 100) : 50

  const openHealthModal = (tab: 'at_risk' | 'exceeded') => {
    setHealthModalTab(tab)
    setHealthModalOpen(true)
  }

  const greeting = (() => {
    const hour = currentHourInLima()
    if (hour < 12) return 'Buenos días'
    if (hour < 19) return 'Buenas tardes'
    return 'Buenas noches'
  })()

  return (
    <div className="space-y-6">
      <section className="card overflow-hidden">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <div className="mb-1 flex items-center gap-2">
              <LayoutDashboard size={22} className="text-premium-primary" />
              <h2 className="text-xl font-semibold">Dashboard</h2>
            </div>
            <p className="text-sm text-muted">
              {greeting}, <strong>{user?.username}</strong>. Vista ejecutiva del mes en curso.
            </p>
          </div>
          <span className="badge inline-flex items-center gap-1.5">
            <CalendarRange size={14} />
            {monthFilters.from} → {monthFilters.to}
          </span>
        </div>

        <div className="mt-4 grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
          <StatSummary label="Usuario" value={user?.username ?? '—'} />
          <StatSummary
            label="Roles"
            value={ensureArray<Role>(user?.roles).map((r) => r.name).join(', ') || '—'}
          />
          <StatSummary label="Permisos" value={String(user?.permissions.length ?? 0)} tone="info" />
          <StatSummary
            label="Módulos"
            value={canFinance ? 'Auth + Finanzas' : 'Autenticación'}
            tone={canFinance ? 'success' : 'neutral'}
          />
        </div>
      </section>

      {canFinance && (
        <>
          {summaryLoading ? (
            <section className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
              {Array.from({ length: 4 }).map((_, i) => (
                <div key={i} className="stat-summary space-y-3">
                  <div className="skeleton h-3 w-20" />
                  <div className="skeleton h-7 w-28" />
                </div>
              ))}
            </section>
          ) : (
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
                      Balance del mes
                    </p>
                    <p className="stat-summary__value text-3xl">{formatCurrency(balanceValue)}</p>
                    <p className="mt-1 text-sm text-muted">
                      {balanceValue >= 0 ? 'Resultado positivo en el periodo' : 'Resultado negativo en el periodo'}
                    </p>
                  </div>
                  <Link to="/finance" className="btn-secondary inline-flex items-center gap-2 text-sm">
                    <BarChart3 size={16} />
                    Ver análisis
                  </Link>
                </div>
              </section>

              <section className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
                <StatSummary
                  label="Ingresos"
                  value={formatCurrency(incomeTotal)}
                  tone="success"
                  hint={`${summary?.transaction_count ?? 0} mov. totales`}
                />
                <StatSummary label="Egresos" value={formatCurrency(expenseTotal)} tone="danger" />
                <StatSummary
                  label="Transacciones"
                  value={String(summary?.transaction_count ?? 0)}
                  hint="Registradas en el mes"
                />
                <StatSummary
                  label="Integraciones"
                  value={`${configuredIntegrations}/${totalIntegrations}`}
                  tone="info"
                  hint="Configuradas y activas"
                />
              </section>

              {flowTotal > 0 && (
                <section className="card space-y-3">
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <h3 className="font-medium">Composición del flujo mensual</h3>
                    <Link
                      to="/finance/cash-closing"
                      state={{ from: monthFilters.from, to: monthFilters.to }}
                      className="text-sm text-premium-primary hover:underline"
                    >
                      Ir a cierre de caja
                    </Link>
                  </div>
                  <ProgressBar value={incomeShare} variant="ok" showLabel label={`${incomeShare}% ingresos`} />
                  <div className="flex flex-wrap justify-between gap-2 text-sm text-muted">
                    <span>
                      Ingresos <strong className="text-premium-text">{formatCurrency(incomeTotal)}</strong> ({incomeShare}%)
                    </span>
                    <span>
                      Egresos <strong className="text-premium-text">{formatCurrency(expenseTotal)}</strong> ({100 - incomeShare}%)
                    </span>
                  </div>
                </section>
              )}
            </>
          )}

          <section className="grid gap-4 xl:grid-cols-2">
            <div className="chart-panel">
              <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
                <h3 className="font-medium">Medios de pago</h3>
                <Link to="/finance" className="text-sm text-premium-primary hover:underline">
                  Ver análisis
                </Link>
              </div>
              {summaryLoading ? (
                <div className="flex h-[240px] items-center justify-center text-sm text-muted">
                  Cargando…
                </div>
              ) : (
                <PaymentTypePieChart data={summary?.by_payment_type ?? []} height={240} />
              )}
            </div>
            <div className="chart-panel">
              <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
                <h3 className="font-medium">Gasto por categoría</h3>
                <Link to="/finance" className="text-sm text-premium-primary hover:underline">
                  Ver análisis
                </Link>
              </div>
              {summaryLoading ? (
                <div className="flex h-[240px] items-center justify-center text-sm text-muted">
                  Cargando…
                </div>
              ) : (
                <CategoryPieChart data={summary?.by_category ?? []} height={240} />
              )}
            </div>
          </section>

          <section className="grid gap-4 xl:grid-cols-3">
            <div className="chart-panel xl:col-span-2">
              <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
                <h3 className="font-medium">Actividad diaria del mes</h3>
                <Link to="/finance" className="btn-secondary inline-flex items-center gap-2 text-sm">
                  <BarChart3 size={16} />
                  Detalle
                </Link>
              </div>
              {summaryLoading ? (
                <div className="flex h-[300px] items-center justify-center text-sm text-muted">
                  Cargando gráfico…
                </div>
              ) : (
                <BalanceByDayChart data={summary?.daily_balances ?? []} />
              )}
            </div>

            <div className="card flex flex-col">
              <div className="mb-3 flex items-center justify-between gap-2">
                <h3 className="font-medium">Salud presupuestaria</h3>
                <Link to="/finance/budgets" className="btn-secondary inline-flex items-center gap-2 text-sm">
                  <Wallet size={16} />
                  Ver
                </Link>
              </div>

              {totalBudgetRows > 0 ? (
                <div className="flex flex-1 flex-col space-y-4 text-sm">
                  <p className="text-muted">Mes {monthYear}</p>

                  <div className="grid grid-cols-2 gap-3">
                    <StatSummary label="Presupuestado" value={formatCurrency(totalBudgeted)} />
                    <StatSummary label="Ejecutado" value={formatCurrency(totalActual)} tone="info" />
                  </div>

                  <div>
                    <ProgressBar
                      value={budgetExecutionPct}
                      variant={budgetHealthProgressVariant(getBudgetHealthStatus(budgetExecutionPct))}
                      showLabel
                      size="lg"
                    />
                  </div>

                  <div className="mt-auto grid grid-cols-3 gap-2">
                    <HealthStat label="OK" count={budgetHealth?.ok_count ?? 0} tone="success" />
                    <HealthStat
                      label="Riesgo"
                      count={budgetHealth?.at_risk_count ?? 0}
                      tone="warning"
                      onClick={() => openHealthModal('at_risk')}
                    />
                    <HealthStat
                      label="Excedido"
                      count={budgetHealth?.exceeded_count ?? 0}
                      tone="danger"
                      onClick={() => openHealthModal('exceeded')}
                    />
                  </div>
                </div>
              ) : (
                <div className="empty-state py-6">
                  <div className="empty-state__icon">
                    <LayoutList size={24} />
                  </div>
                  <p className="text-sm text-muted">Sin presupuestos para {monthYear}.</p>
                  <Link to="/finance/budgets" className="btn-secondary text-sm">
                    Crear presupuesto
                  </Link>
                </div>
              )}
            </div>
          </section>

          <section className="grid gap-4 md:grid-cols-2">
            <div className="card space-y-3">
              <div className="flex items-center gap-2">
                <PiggyBank size={18} className="text-premium-primary" />
                <h3 className="font-medium">Ahorros</h3>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <StatSummary label="Metas" value={String(savingsSummary?.goals_count ?? 0)} />
                <StatSummary
                  label="Avance global"
                  value={`${savingsSummary?.completion_percentage ?? 0}%`}
                  tone="success"
                />
                <StatSummary
                  label="Objetivo total"
                  value={formatCurrency(savingsSummary?.total_target_amount ?? 0)}
                />
                <StatSummary
                  label="Ahorrado"
                  value={formatCurrency(savingsSummary?.total_saved_amount ?? 0)}
                  tone="info"
                />
              </div>
              <Link to="/finance/savings" className="inline-block text-sm text-premium-primary hover:underline">
                Gestionar metas →
              </Link>
            </div>

            <div className="card space-y-3">
              <div className="flex items-center gap-2">
                <HandCoins size={18} className="text-premium-primary" />
                <h3 className="font-medium">Préstamos y cobranzas</h3>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <StatSummary
                  label="Debo"
                  value={formatCurrency(loanSummary?.payable_outstanding_amount ?? 0)}
                  tone="warning"
                />
                <StatSummary
                  label="Me deben"
                  value={formatCurrency(loanSummary?.receivable_outstanding_amount ?? 0)}
                  tone="success"
                />
                <StatSummary label="Activos" value={String(loanSummary?.active_loans_count ?? 0)} tone="info" />
                <StatSummary label="Total" value={String(loanSummary?.loans_count ?? 0)} />
              </div>
              <Link to="/finance/loans" className="inline-block text-sm text-premium-primary hover:underline">
                Ver créditos →
              </Link>
            </div>
          </section>

          <section className="grid gap-4 xl:grid-cols-5">
            {integrationsStatus && (
              <div className="card xl:col-span-2">
                <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
                  <h3 className="font-medium">Pulso operativo</h3>
                  <Link
                    to="/finance/integrations"
                    className="btn-secondary inline-flex items-center gap-2 text-sm"
                  >
                    <Plug size={16} />
                    Integraciones
                  </Link>
                </div>

                <div className="mb-3">
                  <ProgressBar
                    value={
                      totalIntegrations
                        ? Math.round((configuredIntegrations / totalIntegrations) * 100)
                        : 0
                    }
                    variant="primary"
                    showLabel
                    label={`${configuredIntegrations}/${totalIntegrations} configuradas`}
                  />
                </div>

                <div className="flex flex-wrap gap-2">
                  {Object.entries(integrationsStatus).map(([key, item]) => (
                    <HealthBadge
                      key={key}
                      label={`${item.label}: ${item.configured ? 'OK' : 'Pendiente'}`}
                      tone={item.configured ? 'success' : 'warning'}
                    />
                  ))}
                </div>

                {gmailPollStatus && (
                  <div
                    className="mt-4 rounded-lg border p-3 text-sm"
                    style={{ borderColor: 'var(--premium-border)' }}
                  >
                    <div className="flex items-center justify-between gap-2">
                      <span className="flex items-center gap-2 font-medium">
                        <Clock3 size={15} />
                        Gmail realtime
                      </span>
                      <HealthBadge
                        label={gmailPollStatus.realtime_enabled ? 'Activo' : 'Inactivo'}
                        tone={gmailPollStatus.realtime_enabled ? 'success' : 'warning'}
                      />
                    </div>
                    <p className="mt-2 text-muted">
                      Intervalo: <strong>{gmailPollStatus.interval_seconds}s</strong>
                    </p>
                    <p className="text-muted">
                      Último chequeo:{' '}
                      <strong>
                        {formatDateTimeWithSeconds(
                          gmailPollStatus.last_checked_at,
                          '—',
                        )}
                      </strong>
                    </p>
                  </div>
                )}
              </div>
            )}

            <div className={`card ${integrationsStatus ? 'xl:col-span-3' : 'xl:col-span-5'}`}>
              <h3 className="mb-3 font-medium">Accesos rápidos</h3>
              <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                {QUICK_LINKS.map((item) => (
                  <Link
                    key={item.to}
                    to={item.to}
                    className="budget-card group flex items-start gap-3 !rounded-xl !p-3 transition-colors"
                  >
                    <span className="rounded-lg p-2 transition-colors group-hover:bg-[rgba(var(--premium-primary-rgb),0.12)]">
                      <item.icon size={18} className="text-premium-primary" />
                    </span>
                    <div className="min-w-0">
                      <p className="font-medium">{item.title}</p>
                      <p className="text-xs text-muted">{item.description}</p>
                    </div>
                  </Link>
                ))}
              </div>
            </div>
          </section>
        </>
      )}

      <section className="card">
        <button
          type="button"
          onClick={() => setShowPermissions((prev) => !prev)}
          className="flex w-full items-center justify-between gap-2 text-left"
        >
          <span className="flex items-center gap-2 font-medium">
            <ShieldCheck size={18} className="text-premium-primary" />
            Permisos activos ({user?.permissions.length ?? 0})
          </span>
          <span className="text-sm text-muted">{showPermissions ? 'Ocultar' : 'Mostrar'}</span>
        </button>
        {showPermissions && (
          <div className="mt-3 flex flex-wrap gap-2 border-t pt-3" style={{ borderColor: 'var(--premium-border)' }}>
            {ensureArray<string>(user?.permissions).map((permission) => (
              <HealthBadge key={permission} label={permission} tone="primary" />
            ))}
          </div>
        )}
      </section>

      {canFinance && (
        <BudgetHealthModal
          isOpen={healthModalOpen}
          onClose={() => setHealthModalOpen(false)}
          breakdown={budgetHealth}
          initialTab={healthModalTab}
        />
      )}
    </div>
  )
}

function HealthStat({
  label,
  count,
  tone,
  onClick,
}: {
  label: string
  count: number
  tone: 'success' | 'warning' | 'danger'
  onClick?: () => void
}) {
  const toneClass = {
    success: 'stat-summary--success',
    warning: 'stat-summary--warning',
    danger: 'stat-summary--danger',
  }[tone]
  const Tag = onClick ? 'button' : 'div'

  return (
    <Tag
      type={onClick ? 'button' : undefined}
      onClick={onClick}
      className={`stat-summary px-2 py-2 text-center ${toneClass} ${onClick ? 'transition-opacity hover:opacity-90' : ''}`}
    >
      <p className="stat-summary__label">{label}</p>
      <p className="stat-summary__value text-lg">{count}</p>
    </Tag>
  )
}
