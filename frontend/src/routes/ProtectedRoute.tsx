import { Navigate, Outlet } from 'react-router-dom'

import { AppShellSkeleton } from '../core/components/skeleton/AppShellSkeleton'
import { isAuthenticated } from '../core/sessions/authStorage'
import { useCurrentUser } from '../modules/auth/application/hooks/useAuth'

interface ProtectedRouteProps {
  permission?: string
  anyPermission?: string[]
}

export function ProtectedRoute({ permission, anyPermission }: ProtectedRouteProps) {
  if (!isAuthenticated()) {
    return <Navigate to="/login" replace />
  }

  return <ProtectedContent permission={permission} anyPermission={anyPermission} />
}

function ProtectedContent({ permission, anyPermission }: ProtectedRouteProps) {
  const { data: user, isLoading, isError } = useCurrentUser()

  if (isLoading) {
    return <AppShellSkeleton />
  }

  if (isError || !user) {
    return <Navigate to="/login" replace />
  }

  if (permission && !user.permissions.includes(permission)) {
    return <Navigate to="/dashboard" replace />
  }

  if (
    anyPermission?.length &&
    !anyPermission.some((code) => user.permissions.includes(code))
  ) {
    return <Navigate to="/dashboard" replace />
  }

  return <Outlet context={{ user }} />
}
