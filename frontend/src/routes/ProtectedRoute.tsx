import { Navigate, Outlet } from 'react-router-dom'

import { isAuthenticated } from '../core/sessions/authStorage'
import { useCurrentUser } from '../modules/auth/application/hooks/useAuth'

interface ProtectedRouteProps {
  permission?: string
}

export function ProtectedRoute({ permission }: ProtectedRouteProps) {
  if (!isAuthenticated()) {
    return <Navigate to="/login" replace />
  }

  return <ProtectedContent permission={permission} />
}

function ProtectedContent({ permission }: ProtectedRouteProps) {
  const { data: user, isLoading, isError } = useCurrentUser()

  if (isLoading) {
    return (
      <div className="app-shell flex min-h-screen items-center justify-center">
        <p className="text-muted">Cargando sesión...</p>
      </div>
    )
  }

  if (isError || !user) {
    return <Navigate to="/login" replace />
  }

  if (permission && !user.permissions.includes(permission)) {
    return <Navigate to="/dashboard" replace />
  }

  return <Outlet context={{ user }} />
}
