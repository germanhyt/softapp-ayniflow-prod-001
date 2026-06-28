import {
  ArrowDownCircle,
  ArrowLeftRight,
  ArrowUpCircle,
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
  Receipt,
  Scale,
  ShieldCheck,
  Wallet,
} from 'lucide-react'
import { useState } from 'react'
import { Link } from 'react-router-dom'

import { hasPermission, useCurrentUser } from '../application/hooks/useAuth'
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
import { BalanceByDayChart } from '../../finance/views/components/BalanceByDayChart'
import { BudgetHealthModal } from '../../finance/views/components/BudgetHealthModal'

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
          <ProfileChip label="Usuario" value={user?.username ?? '—'} />
          <ProfileChip label="Roles" value={user?.roles.map((r) => r.name).join(', ') || '—'} />
          <ProfileChip label="Permisos" value={String(user?.permissions.length ?? 0)} />
          <ProfileChip
            label="Módulos"
            value={canFinance ? 'Auth + Finanzas' : 'Autenticación'}
          />
        </div>
      </section>

      {canFinance && (
        <>
          {summaryLoading ? (
            <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
              {Array.from({ length: 4 }).map((_, i) => (
                <div key={i} className="card animate-pulse">
                  <div className="mb-2 h-4 w-20 rounded" style={{ backgroundColor: 'var(--premium-border)' }} />
                  <div className="h-8 w-28 rounded" style={{ backgroundColor: 'var(--premium-border)' }} />
                </div>
              ))}
            </section>
          ) : (
            <>
              <section
                className={`card border-l-4 ${
                  balanceValue >= 0 ? 'stat-card-balance' : 'stat-card-expense'
                }`}
                style={{
                  borderLeftColor:
                    balanceValue >= 0 ? 'var(--premium-primary)' : 'var(--premium-danger)',
                }}
              >
                <div className="flex flex-wrap items-center justify-between gap-4">
                  <div>
                    <p className="flex items-center gap-2 text-sm text-muted">
                      <Scale size={16} />
                      Balance del mes
                    </p>
                    <p className="mt-1 text-3xl font-semibold">{formatCurrency(balanceValue)}</p>
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

              <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
                <KpiCard
                  label="Ingresos"
                  value={formatCurrency(incomeTotal)}
                  tone="income"
                  icon={<ArrowUpCircle size={18} />}
                  detail={`${summary?.transaction_count ?? 0} mov. totales`}
                />
                <KpiCard
                  label="Egresos"
                  value={formatCurrency(expenseTotal)}
                  tone="expense"
                  icon={<ArrowDownCircle size={18} />}
                />
                <KpiCard
                  label="Transacciones"
                  value={String(summary?.transaction_count ?? 0)}
                  tone="neutral"
                  icon={<Receipt size={18} />}
                  detail="Registradas en el mes"
                />
                <KpiCard
                  label="Integraciones"
                  value={`${configuredIntegrations}/${totalIntegrations}`}
                  tone="balance"
                  icon={<Plug size={18} />}
                  detail="Configuradas y activas"
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
                  <div
                    className="flex h-3 overflow-hidden rounded-full"
                    style={{ backgroundColor: 'var(--premium-border)' }}
                  >
                    <div
                      className="h-full"
                      style={{
                        width: `${incomeShare}%`,
                        backgroundColor: 'var(--premium-primary)',
                      }}
                    />
                    <div
                      className="h-full flex-1"
                      style={{ backgroundColor: 'var(--premium-danger)' }}
                    />
                  </div>
                  <div className="flex flex-wrap justify-between gap-2 text-sm text-muted">
                    <span>
                      Ingresos <strong>{formatCurrency(incomeTotal)}</strong> ({incomeShare}%)
                    </span>
                    <span>
                      Egresos <strong>{formatCurrency(expenseTotal)}</strong> ({100 - incomeShare}%)
                    </span>
                  </div>
                </section>
              )}
            </>
          )}

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

                  <div className="space-y-2">
                    <div className="flex justify-between">
                      <span className="text-muted">Presupuestado</span>
                      <strong>{formatCurrency(totalBudgeted)}</strong>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-muted">Ejecutado</span>
                      <strong>{formatCurrency(totalActual)}</strong>
                    </div>
                  </div>

                  <div>
                    <div className="mb-1 flex justify-between">
                      <span className="text-muted">Uso del presupuesto</span>
                      <strong
                        className={
                          budgetExecutionPct >= 100
                            ? 'text-[var(--premium-danger)]'
                            : budgetExecutionPct >= 80
                              ? 'text-amber-500'
                              : ''
                        }
                      >
                        {budgetExecutionPct}%
                      </strong>
                    </div>
                    <div
                      className="h-2.5 overflow-hidden rounded-full"
                      style={{ backgroundColor: 'var(--premium-border)' }}
                    >
                      <div
                        className="h-full rounded-full transition-all"
                        style={{
                          width: `${Math.min(budgetExecutionPct, 100)}%`,
                          backgroundColor:
                            budgetExecutionPct >= 100
                              ? 'var(--premium-danger)'
                              : budgetExecutionPct >= 80
                                ? '#f59e0b'
                                : 'var(--premium-primary)',
                        }}
                      />
                    </div>
                  </div>

                  <div className="mt-auto grid grid-cols-3 gap-2">
                    <HealthPill label="OK" count={budgetHealth?.ok_count ?? 0} tone="ok" />
                    <HealthPill
                      label="Riesgo"
                      count={budgetHealth?.at_risk_count ?? 0}
                      tone="risk"
                      onClick={() => openHealthModal('at_risk')}
                    />
                    <HealthPill
                      label="Excedido"
                      count={budgetHealth?.exceeded_count ?? 0}
                      tone="exceeded"
                      onClick={() => openHealthModal('exceeded')}
                    />
                  </div>
                </div>
              ) : (
                <div className="flex flex-1 flex-col items-center justify-center gap-2 py-6 text-center">
                  <LayoutList size={28} className="text-muted opacity-50" />
                  <p className="text-sm text-muted">Sin presupuestos para {monthYear}.</p>
                  <Link to="/finance/budgets" className="btn-secondary text-sm">
                    Crear presupuesto
                  </Link>
                </div>
              )}
            </div>
          </section>

          <section className="grid gap-4 md:grid-cols-2">
            <div className="card">
              <div className="mb-3 flex items-center gap-2">
                <PiggyBank size={18} className="text-premium-primary" />
                <h3 className="font-medium">Ahorros</h3>
              </div>
              <div className="grid grid-cols-2 gap-3 text-sm">
                <MiniStat label="Metas" value={String(savingsSummary?.goals_count ?? 0)} />
                <MiniStat
                  label="Avance global"
                  value={`${savingsSummary?.completion_percentage ?? 0}%`}
                />
                <MiniStat
                  label="Objetivo total"
                  value={formatCurrency(savingsSummary?.total_target_amount ?? 0)}
                />
                <MiniStat
                  label="Ahorrado"
                  value={formatCurrency(savingsSummary?.total_saved_amount ?? 0)}
                />
              </div>
              <Link to="/finance/savings" className="mt-3 inline-block text-sm text-premium-primary hover:underline">
                Gestionar metas →
              </Link>
            </div>

            <div className="card">
              <div className="mb-3 flex items-center gap-2">
                <HandCoins size={18} className="text-premium-primary" />
                <h3 className="font-medium">Préstamos y cobranzas</h3>
              </div>
              <div className="grid grid-cols-2 gap-3 text-sm">
                <MiniStat label="Debo" value={formatCurrency(loanSummary?.payable_outstanding_amount ?? 0)} />
                <MiniStat label="Me deben" value={formatCurrency(loanSummary?.receivable_outstanding_amount ?? 0)} />
                <MiniStat label="Registros activos" value={String(loanSummary?.active_loans_count ?? 0)} />
                <MiniStat label="Total registros" value={String(loanSummary?.loans_count ?? 0)} />
              </div>
              <Link to="/finance/loans" className="mt-3 inline-block text-sm text-premium-primary hover:underline">
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
                  <div className="mb-1 flex justify-between text-sm">
                    <span className="text-muted">Configuración</span>
                    <strong>
                      {configuredIntegrations}/{totalIntegrations}
                    </strong>
                  </div>
                  <div
                    className="h-2 overflow-hidden rounded-full"
                    style={{ backgroundColor: 'var(--premium-border)' }}
                  >
                    <div
                      className="h-full rounded-full"
                      style={{
                        width: `${
                          totalIntegrations
                            ? Math.round((configuredIntegrations / totalIntegrations) * 100)
                            : 0
                        }%`,
                        backgroundColor: 'var(--premium-primary)',
                      }}
                    />
                  </div>
                </div>

                <div className="flex flex-wrap gap-2">
                  {Object.entries(integrationsStatus).map(([key, item]) => (
                    <span
                      key={key}
                      className={`badge ${item.configured ? '' : 'opacity-60'}`}
                    >
                      {item.label}: {item.configured ? 'OK' : 'Pendiente'}
                    </span>
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
                      <span
                        className={`badge ${gmailPollStatus.realtime_enabled ? '' : 'opacity-60'}`}
                      >
                        {gmailPollStatus.realtime_enabled ? 'Activo' : 'Inactivo'}
                      </span>
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
                    className="group flex items-start gap-3 rounded-xl border p-3 transition-all hover:border-[rgba(var(--premium-primary-rgb),0.4)] hover:bg-[rgba(var(--premium-primary-rgb),0.04)]"
                    style={{ borderColor: 'var(--premium-border)' }}
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
            {user?.permissions.map((permission) => (
              <span key={permission} className="badge">
                {permission}
              </span>
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

function ProfileChip({ label, value }: { label: string; value: string }) {
  return (
    <div
      className="rounded-lg px-3 py-2 text-sm"
      style={{ backgroundColor: 'var(--premium-surface-high)' }}
    >
      <p className="text-xs text-muted">{label}</p>
      <p className="mt-0.5 truncate font-medium" title={value}>
        {value}
      </p>
    </div>
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

function MiniStat({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <p className="text-xs text-muted">{label}</p>
      <p className="font-medium">{value}</p>
    </div>
  )
}

function HealthPill({
  label,
  count,
  tone,
  onClick,
}: {
  label: string
  count: number
  tone: 'ok' | 'risk' | 'exceeded'
  onClick?: () => void
}) {
  const colors = {
    ok: 'var(--premium-primary)',
    risk: '#f59e0b',
    exceeded: 'var(--premium-danger)',
  }
  const Tag = onClick ? 'button' : 'div'

  return (
    <Tag
      type={onClick ? 'button' : undefined}
      onClick={onClick}
      className={`rounded-lg border px-2 py-2 text-center ${onClick ? 'transition-opacity hover:opacity-90' : ''}`}
      style={{ borderColor: 'var(--premium-border)' }}
    >
      <p className="text-xs text-muted">{label}</p>
      <p className="text-lg font-semibold" style={{ color: colors[tone] }}>
        {count}
      </p>
    </Tag>
  )
}
