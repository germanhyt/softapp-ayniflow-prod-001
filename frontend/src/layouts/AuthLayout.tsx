import type { ReactNode } from 'react'

import { BrandLogo } from '../core/components/BrandLogo'
import { ThemeToggle } from '../core/components/ThemeToggle'

export function AuthLayout({ children }: { children: ReactNode }) {
  return (
    <div className="app-shell hero-bg relative flex min-h-screen items-center justify-center px-4">
      <div className="absolute right-4 top-4">
        <ThemeToggle />
      </div>
      <div className="glass-panel w-full max-w-md rounded-2xl p-8 shadow-lg">
        <div className="mb-6 flex flex-col items-center gap-3 text-center">
          <BrandLogo centered />
          <h1 className="text-lg font-semibold tracking-tight">
            <span className="text-gradient">Iniciar sesión</span>
          </h1>
        </div>
        {children}
      </div>
    </div>
  )
}
