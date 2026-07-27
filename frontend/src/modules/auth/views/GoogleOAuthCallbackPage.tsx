import { useEffect } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'

import {
  GOOGLE_AUTH_MESSAGE_TYPE,
  type GoogleAuthResultMessage,
} from '../infrastructure/repository/googleAuthRepository'

export function GoogleOAuthCallbackPage() {
  const [searchParams] = useSearchParams()
  const navigate = useNavigate()

  useEffect(() => {
    const status = searchParams.get('google_auth')
    const accessToken = searchParams.get('access_token')
    const reason = searchParams.get('reason')

    const payload: GoogleAuthResultMessage = {
      type: GOOGLE_AUTH_MESSAGE_TYPE,
      status: status === 'success' && accessToken ? 'success' : 'error',
      access_token: accessToken,
      reason,
    }

    if (window.opener && !window.opener.closed) {
      window.opener.postMessage(payload, window.location.origin)
      window.close()
      return
    }

    if (payload.status === 'success' && accessToken) {
      navigate(`/login?google_auth=success&access_token=${encodeURIComponent(accessToken)}`, {
        replace: true,
      })
      return
    }

    navigate('/login', { replace: true })
  }, [navigate, searchParams])

  return (
    <div className="app-shell flex min-h-screen items-center justify-center p-6">
      <div className="card max-w-md space-y-3 text-center">
        <div className="mx-auto skeleton h-10 w-10 rounded-full" />
        <div className="skeleton mx-auto h-4 w-40" />
        <p className="text-sm text-muted">Completando inicio de sesión con Google…</p>
      </div>
    </div>
  )
}
