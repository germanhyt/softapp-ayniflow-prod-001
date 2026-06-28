import { LogOut, Menu, PanelLeftClose, PanelLeftOpen } from 'lucide-react'
import { useNavigate } from 'react-router-dom'

import { NotificationBell } from '../core/components/NotificationBell'
import { LiveStatusBadge } from '../core/components/LiveStatusBadge'
import { APP_NAME } from '../core/constants/app'
import { PwaInstallButton } from '../core/pwa/PwaInstallButton'
import { ThemeToggle } from '../core/components/ThemeToggle'
import { hasPermission, useCurrentUser, useLogout } from '../modules/auth/application/hooks/useAuth'
import { useSidebar } from './SidebarContext'

export function AppTopbar() {
  const { data: user } = useCurrentUser()
  const logout = useLogout()
  const navigate = useNavigate()
  const { isMobile, isCollapsed, toggleOpen, toggleCollapsed } = useSidebar()
  const canReadFinance = hasPermission(user, 'finance:read')

  const handleLogout = () => {
    logout()
    navigate('/login')
  }

  return (
    <header className="admin-topbar panel-header flex items-center justify-between gap-4 px-4 py-3 lg:px-6">
      <div className="flex items-center gap-2">
        <button
          type="button"
          className="btn-icon"
          onClick={isMobile ? toggleOpen : toggleCollapsed}
          aria-label={isMobile ? 'Abrir menú' : isCollapsed ? 'Expandir sidebar' : 'Colapsar sidebar'}
        >
          {isMobile ? (
            <Menu size={20} />
          ) : isCollapsed ? (
            <PanelLeftOpen size={20} />
          ) : (
            <PanelLeftClose size={20} />
          )}
        </button>
        <div className="hidden">
          <p className="text-xs uppercase tracking-wide text-muted">Panel administrativo</p>
          <p className="text-sm font-semibold">{APP_NAME}</p>
        </div>
      </div>

      <div className="flex items-center gap-2">
        <span className="hidden text-sm text-muted md:inline">{user?.full_name ?? user?.username}</span>
        {canReadFinance && <LiveStatusBadge />}
        {canReadFinance && <NotificationBell />}
        <PwaInstallButton />
        <ThemeToggle />
        <button type="button" onClick={handleLogout} className="btn-icon" title="Salir" aria-label="Salir">
          <LogOut size={18} />
        </button>
      </div>
    </header>
  )
}
