import { BrandLogo } from '../core/components/BrandLogo'
import { HealthBadge } from '../core/components/HealthBadge'
import { ThemeToggle } from '../core/components/ThemeToggle'

export function AuthLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="app-shell hero-bg relative flex min-h-screen items-center justify-center px-4 py-8">
      <div className="absolute right-4 top-4 z-10">
        <ThemeToggle />
      </div>
      <div className="glass-panel auth-card">
        <div className="auth-card__header">
          <BrandLogo centered />
          <div className="space-y-1">
            <h1 className="auth-card__title">
              <span className="text-gradient">Iniciar sesión</span>
            </h1>
            <HealthBadge label="AyniFlow" tone="primary" />
          </div>
          <p className="text-sm text-muted">Gestión modular con enfoque financiero.</p>
        </div>
        {children}
      </div>
    </div>
  )
}
