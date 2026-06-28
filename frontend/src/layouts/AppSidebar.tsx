import {
  ArrowLeftRight,
  BarChart3,
  Calculator,
  ChevronDown,
  HandCoins,
  LayoutDashboard,
  Landmark,
  PiggyBank,
  Plug,
  Users,
  Wallet,
} from 'lucide-react'
import { useEffect, useState } from 'react'
import { NavLink, useLocation } from 'react-router-dom'

import { BrandLogo } from '../core/components/BrandLogo'
import { useCurrentUser } from '../modules/auth/application/hooks/useAuth'
import { useSidebar } from './SidebarContext'

function NavItem({
  to,
  icon: Icon,
  label,
  collapsed,
  onNavigate,
}: {
  to: string
  icon: React.ComponentType<{ className?: string; size?: number }>
  label: string
  collapsed: boolean
  onNavigate?: () => void
}) {
  return (
    <NavLink
      to={to}
      title={collapsed ? label : undefined}
      onClick={onNavigate}
      className={({ isActive }) =>
        `sidebar-link flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm transition-colors${
          isActive ? ' sidebar-link-active' : ''
        }${collapsed ? ' justify-center px-2' : ''}`
      }
    >
      <Icon size={18} className="shrink-0" />
      <span className={`sidebar-label ${collapsed ? 'sidebar-label-collapsed' : ''}`}>{label}</span>
    </NavLink>
  )
}

function FinanceNavGroup({
  collapsed,
  onNavigate,
}: {
  collapsed: boolean
  onNavigate?: () => void
}) {
  const location = useLocation()
  const isFinanceRoute = location.pathname.startsWith('/finance')
  const [expanded, setExpanded] = useState(isFinanceRoute)

  useEffect(() => {
    if (isFinanceRoute) {
      setExpanded(true)
    }
  }, [isFinanceRoute])

  const subItems = [
    { to: '/finance', icon: BarChart3, label: 'Resumen y gráficos', end: true },
    { to: '/finance/transactions', icon: ArrowLeftRight, label: 'Transacciones' },
    { to: '/finance/budgets', icon: PiggyBank, label: 'Presupuestos' },
    { to: '/finance/savings', icon: HandCoins, label: 'Ahorros' },
    { to: '/finance/loans', icon: Landmark, label: 'Préstamos y cobranzas' },
    { to: '/finance/cash-closing', icon: Calculator, label: 'Cierre de caja' },
    { to: '/finance/integrations', icon: Plug, label: 'Integraciones' },
  ]

  if (collapsed) {
    return (
      <div className="space-y-1">
        {subItems.map((item) => (
          <NavItem
            key={item.to}
            to={item.to}
            icon={item.icon}
            label={item.label}
            collapsed
            onNavigate={onNavigate}
          />
        ))}
      </div>
    )
  }

  return (
    <div className="space-y-1">
      <button
        type="button"
        onClick={() => setExpanded((prev) => !prev)}
        className={`sidebar-link flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-sm transition-colors${
          isFinanceRoute ? ' sidebar-link-active' : ''
        }`}
      >
        <Wallet size={18} className="shrink-0" />
        <span className="flex-1 text-left">Finanzas</span>
        <ChevronDown
          size={16}
          className={`shrink-0 transition-transform ${expanded ? 'rotate-180' : ''}`}
        />
      </button>
      {expanded && (
        <div className="ml-3 space-y-1 border-l pl-2" style={{ borderColor: 'var(--premium-border)' }}>
          {subItems.map((item) => (
            <NavLink
              key={item.to}
              to={item.to}
              end={item.end}
              onClick={onNavigate}
              className={({ isActive }) =>
                `sidebar-link flex items-center gap-3 rounded-lg px-3 py-2 text-sm transition-colors${
                  isActive ? ' sidebar-link-active' : ''
                }`
              }
            >
              <item.icon size={16} className="shrink-0 opacity-80" />
              <span>{item.label}</span>
            </NavLink>
          ))}
        </div>
      )}
    </div>
  )
}

export function AppSidebar() {
  const { data: user } = useCurrentUser()
  const { isOpen, isCollapsed, isMobile, closeMobile } = useSidebar()
  const collapsed = !isMobile && isCollapsed

  if (isMobile && !isOpen) {
    return null
  }

  const sidebarClasses = [
    'admin-sidebar glass-panel flex flex-col',
    isMobile ? 'admin-sidebar-mobile' : '',
    collapsed ? 'admin-sidebar-collapsed' : '',
  ]
    .filter(Boolean)
    .join(' ')

  return (
    <>
      {isMobile && isOpen && (
        <button
          type="button"
          className="admin-sidebar-backdrop"
          aria-label="Cerrar menú"
          onClick={closeMobile}
        />
      )}
      <aside className={sidebarClasses}>
        <div className={`border-b px-4 py-4 ${collapsed ? 'flex justify-center' : ''}`} style={{ borderColor: 'var(--premium-border)' }}>
          <BrandLogo compact={collapsed} showText={!collapsed} />
        </div>

        <nav className="flex-1 space-y-1 overflow-y-auto p-3">
          <NavItem
            to="/dashboard"
            icon={LayoutDashboard}
            label="Dashboard"
            collapsed={collapsed}
            onNavigate={isMobile ? closeMobile : undefined}
          />
          {user?.permissions.includes('finance:read') && (
            <FinanceNavGroup collapsed={collapsed} onNavigate={isMobile ? closeMobile : undefined} />
          )}
          {user?.permissions.includes('users:read') && (
            <NavItem
              to="/users"
              icon={Users}
              label="Usuarios"
              collapsed={collapsed}
              onNavigate={isMobile ? closeMobile : undefined}
            />
          )}
        </nav>
        <div
          className={`border-t ${collapsed ? 'px-2 py-2' : 'px-4 py-3'}`}
          style={{ borderColor: 'var(--premium-border)' }}
        >
          {collapsed ? (
            <p className="text-center text-[10px] text-muted" title="Desarrollado por germ4n.hyt">
              by g.h
            </p>
          ) : (
            <p className="text-center text-[11px] text-muted">
              Desarrollado por <span className="font-medium">germ4n.hyt</span>
            </p>
          )}
        </div>
      </aside>
    </>
  )
}
