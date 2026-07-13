import { useEffect } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'

const GMAIL_OAUTH_MESSAGE_TYPE = 'gmail-oauth-result'

export type GmailOAuthResultMessage = {
  type: typeof GMAIL_OAUTH_MESSAGE_TYPE
  status: 'connected' | 'error'
  email?: string | null
  reason?: string | null
}

export function isGmailOAuthResultMessage(data: unknown): data is GmailOAuthResultMessage {
  if (!data || typeof data !== 'object') return false
  const message = data as Partial<GmailOAuthResultMessage>
  return message.type === GMAIL_OAUTH_MESSAGE_TYPE && (message.status === 'connected' || message.status === 'error')
}

export function GmailOAuthCallbackPage() {
  const [searchParams] = useSearchParams()
  const navigate = useNavigate()

  useEffect(() => {
    const status = searchParams.get('gmail')
    const email = searchParams.get('email')
    const reason = searchParams.get('reason')
    const payload: GmailOAuthResultMessage = {
      type: GMAIL_OAUTH_MESSAGE_TYPE,
      status: status === 'connected' ? 'connected' : 'error',
      email,
      reason,
    }

    if (window.opener && !window.opener.closed) {
      window.opener.postMessage(payload, window.location.origin)
      window.close()
      return
    }

    const params = new URLSearchParams()
    if (status) params.set('gmail', status)
    if (email) params.set('email', email)
    if (reason) params.set('reason', reason)
    navigate(`/finance/integrations?${params.toString()}`, { replace: true })
  }, [navigate, searchParams])

  return (
    <div className="app-shell flex min-h-screen items-center justify-center p-6">
      <div className="card max-w-md space-y-2 text-center">
        <h1 className="text-lg font-semibold">Conectando Gmail…</h1>
        <p className="text-sm text-muted">
          Puedes cerrar esta ventana si no se cierra automáticamente.
        </p>
      </div>
    </div>
  )
}
