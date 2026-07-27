import { useEffect, useState } from 'react'
import { useLocation } from 'react-router-dom'

import { isAuthenticated } from '../../sessions/authStorage'
import { AppShellSkeleton, AuthSessionSkeleton } from './AppShellSkeleton'

const AUTH_PATHS = ['/login', '/oauth/google/callback']

function isAuthPath(pathname: string) {
  return AUTH_PATHS.some((path) => pathname === path || pathname.startsWith(`${path}/`))
}

export function AppBootstrap({ children }: { children: React.ReactNode }) {
  const [ready, setReady] = useState(false)
  const location = useLocation()
  const authed = isAuthenticated()

  useEffect(() => {
    setReady(true)
  }, [])

  if (!ready) {
    if (!authed || isAuthPath(location.pathname)) {
      return <AuthSessionSkeleton />
    }
    return <AppShellSkeleton />
  }

  return children
}
