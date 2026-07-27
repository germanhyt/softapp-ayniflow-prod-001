import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Legend,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts'
import { Activity, CalendarDays, Mail, UserPlus, Users } from 'lucide-react'

import { HealthBadge } from '../../../../core/components/HealthBadge'
import { Modal } from '../../../../core/components/Modal'
import { StatSummary } from '../../../../core/components/StatSummary'
import { ensureArray } from '../../../../core/utils/collections'
import { useUserStats } from '../../application/hooks/useAuth'
import type { RoleCount, RegistrationByDay } from '../../domain/models/auth.types'

interface UserStatsModalProps {
  isOpen: boolean
  onClose: () => void
}

const ROLE_COLORS = [
  'var(--premium-primary)',
  'var(--premium-success)',
  'var(--premium-warning)',
  'var(--premium-danger)',
  '#8b5cf6',
  '#06b6d4',
]

const AUTH_COLORS = ['#4285F4', 'var(--premium-primary)']

function formatDateTime(value: string | null): string {
  if (!value) return '—'
  return new Intl.DateTimeFormat('es-PE', {
    dateStyle: 'medium',
    timeStyle: 'short',
  }).format(new Date(value))
}

function roleColor(index: number): string {
  return ROLE_COLORS[index % ROLE_COLORS.length]
}

export function UserStatsModal({ isOpen, onClose }: UserStatsModalProps) {
  const { data, isLoading, isError } = useUserStats(isOpen)

  const registrations = ensureArray<RegistrationByDay>(data?.registrations_by_day).map((item) => ({
    label: item.date.slice(5),
    count: item.count,
  }))

  const roleSlices = ensureArray<RoleCount>(data?.by_role).map((item) => ({
    name: item.name,
    value: item.count,
  }))

  const authSlices = data
    ? [
        { name: 'Google', value: data.summary.google_linked },
        { name: 'Manual', value: data.summary.manual },
      ].filter((item) => item.value > 0)
    : []

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="Panel de usuarios"
      subtitle="Métricas de registro, roles y actividad de cuentas"
      size="xl"
    >
      {isLoading ? (
        <div className="space-y-4">
          <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
            {Array.from({ length: 4 }).map((_, index) => (
              <div key={index} className="skeleton h-24 rounded-xl" />
            ))}
          </div>
          <div className="skeleton h-72 rounded-xl" />
        </div>
      ) : isError || !data ? (
        <p className="py-10 text-center text-sm text-muted">
          No se pudieron cargar las métricas de usuarios.
        </p>
      ) : (
        <div className="space-y-6">
          <section className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
            <StatSummary
              label="Total registrados"
              value={String(data.summary.total)}
              hint="Cuentas en el sistema"
              tone="info"
            />
            <StatSummary
              label="Activos"
              value={String(data.summary.active)}
              hint={`${data.summary.inactive} inactivos`}
              tone="success"
            />
            <StatSummary
              label="Últimos 7 días"
              value={String(data.summary.registered_last_7_days)}
              hint="Nuevos registros recientes"
              tone="info"
            />
            <StatSummary
              label="Este mes"
              value={String(data.summary.registered_this_month)}
              hint="Altas del mes en curso"
              tone="neutral"
            />
          </section>

          <section className="budget-card">
            <div className="mb-4 flex items-center gap-2">
              <CalendarDays size={18} className="text-muted" />
              <div>
                <h3 className="font-semibold">Registros por día</h3>
                <p className="text-xs text-muted">Últimos 30 días (zona Lima)</p>
              </div>
            </div>
            {registrations.some((item) => item.count > 0) ? (
              <ResponsiveContainer width="100%" height={260}>
                <BarChart data={registrations} margin={{ top: 8, right: 8, left: 0, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="var(--premium-border)" />
                  <XAxis
                    dataKey="label"
                    stroke="var(--premium-text-muted)"
                    fontSize={11}
                    tickMargin={8}
                    interval="preserveStartEnd"
                  />
                  <YAxis
                    allowDecimals={false}
                    stroke="var(--premium-text-muted)"
                    fontSize={11}
                    width={28}
                  />
                  <Tooltip
                    contentStyle={{
                      backgroundColor: 'var(--premium-surface)',
                      border: '1px solid var(--premium-border)',
                      borderRadius: '8px',
                    }}
                    formatter={(value) => [`${Number(value)} usuario(s)`, 'Registros']}
                    labelFormatter={(label) => `Fecha ${label}`}
                  />
                  <Bar
                    dataKey="count"
                    name="Registros"
                    fill="var(--premium-primary)"
                    radius={[4, 4, 0, 0]}
                  />
                </BarChart>
              </ResponsiveContainer>
            ) : (
              <p className="py-10 text-center text-sm text-muted">
                Aún no hay registros en los últimos 30 días.
              </p>
            )}
          </section>

          <section className="grid gap-4 lg:grid-cols-2">
            <div className="budget-card">
              <div className="mb-3 flex items-center gap-2">
                <Users size={18} className="text-muted" />
                <h3 className="font-semibold">Distribución por rol</h3>
              </div>
              {roleSlices.length ? (
                <ResponsiveContainer width="100%" height={240}>
                  <PieChart>
                    <Pie
                      data={roleSlices}
                      dataKey="value"
                      nameKey="name"
                      cx="50%"
                      cy="50%"
                      innerRadius={48}
                      outerRadius={78}
                      paddingAngle={2}
                    >
                      {roleSlices.map((_, index) => (
                        <Cell key={index} fill={roleColor(index)} />
                      ))}
                    </Pie>
                    <Tooltip
                      contentStyle={{
                        backgroundColor: 'var(--premium-surface)',
                        border: '1px solid var(--premium-border)',
                        borderRadius: '8px',
                      }}
                      formatter={(value, name) => [`${Number(value)} cuenta(s)`, String(name)]}
                    />
                    <Legend wrapperStyle={{ fontSize: '0.8rem' }} />
                  </PieChart>
                </ResponsiveContainer>
              ) : (
                <p className="py-8 text-center text-sm text-muted">Sin roles asignados.</p>
              )}
            </div>

            <div className="budget-card">
              <div className="mb-3 flex items-center gap-2">
                <Mail size={18} className="text-muted" />
                <h3 className="font-semibold">Origen de acceso</h3>
              </div>
              {authSlices.length ? (
                <ResponsiveContainer width="100%" height={240}>
                  <PieChart>
                    <Pie
                      data={authSlices}
                      dataKey="value"
                      nameKey="name"
                      cx="50%"
                      cy="50%"
                      innerRadius={48}
                      outerRadius={78}
                      paddingAngle={2}
                    >
                      {authSlices.map((item, index) => (
                        <Cell key={item.name} fill={AUTH_COLORS[index % AUTH_COLORS.length]} />
                      ))}
                    </Pie>
                    <Tooltip
                      contentStyle={{
                        backgroundColor: 'var(--premium-surface)',
                        border: '1px solid var(--premium-border)',
                        borderRadius: '8px',
                      }}
                      formatter={(value, name) => [`${Number(value)} cuenta(s)`, String(name)]}
                    />
                    <Legend wrapperStyle={{ fontSize: '0.8rem' }} />
                  </PieChart>
                </ResponsiveContainer>
              ) : (
                <p className="py-8 text-center text-sm text-muted">Sin cuentas registradas.</p>
              )}
            </div>
          </section>

          <section className="budget-card">
            <div className="mb-4 flex items-center justify-between gap-3">
              <div className="flex items-center gap-2">
                <UserPlus size={18} className="text-muted" />
                <div>
                  <h3 className="font-semibold">Últimos registros</h3>
                  <p className="text-xs text-muted">Cuentas más recientes</p>
                </div>
              </div>
              <HealthBadge
                label={`Actualizado ${formatDateTime(data.generated_at)}`}
                tone="info"
              />
            </div>

            <div className="table-shell overflow-x-auto">
              <table className="min-w-[640px] w-full text-left text-sm">
                <thead className="table-head">
                  <tr>
                    <th className="px-3 py-2 font-medium">Usuario</th>
                    <th className="px-3 py-2 font-medium">Rol</th>
                    <th className="px-3 py-2 font-medium">Origen</th>
                    <th className="px-3 py-2 font-medium">Estado</th>
                    <th className="px-3 py-2 font-medium">Registro</th>
                  </tr>
                </thead>
                <tbody>
                  {data.recent_users.map((user) => (
                    <tr key={user.id} className="table-row">
                      <td className="px-3 py-2">
                        <p className="font-medium">{user.username}</p>
                        <p className="text-xs text-muted">{user.email}</p>
                      </td>
                      <td className="px-3 py-2">
                        {user.role_name ? (
                          <HealthBadge label={user.role_name} tone="primary" />
                        ) : (
                          <span className="text-muted">—</span>
                        )}
                      </td>
                      <td className="px-3 py-2">
                        <HealthBadge
                          label={user.google_linked ? 'Google' : 'Manual'}
                          tone={user.google_linked ? 'info' : 'primary'}
                        />
                      </td>
                      <td className="px-3 py-2">
                        <HealthBadge
                          label={user.is_active ? 'Activo' : 'Inactivo'}
                          tone={user.is_active ? 'success' : 'warning'}
                        />
                      </td>
                      <td className="px-3 py-2 text-muted">{formatDateTime(user.created_at)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </section>

          <p className="flex items-center gap-2 text-xs text-muted">
            <Activity size={14} />
            Solo visible para administradores del sistema.
          </p>
        </div>
      )}
    </Modal>
  )
}
