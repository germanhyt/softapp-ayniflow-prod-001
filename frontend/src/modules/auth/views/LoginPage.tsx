import { useEffect, useState } from 'react'
import { useQueryClient } from '@tanstack/react-query'
import { useNavigate, useSearchParams } from 'react-router-dom'

import { FormField } from '../../../core/components/FormField'
import { GoogleIcon } from '../../../core/components/GoogleIcon'
import { GoogleOAuthModal } from '../../../core/components/GoogleOAuthModal'
import { PasswordInput } from '../../../core/components/PasswordInput'
import { setAccessToken } from '../../../core/sessions/authStorage'
import { useGoogleAuthStatus } from '../application/hooks/useGoogleAuthStatus'
import { useLogin } from '../application/hooks/useAuth'

export function LoginPage() {
  const navigate = useNavigate()
  const queryClient = useQueryClient()
  const [searchParams, setSearchParams] = useSearchParams()
  const login = useLogin()
  const { data: googleStatus } = useGoogleAuthStatus()
  const [username, setUsername] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [googleModalOpen, setGoogleModalOpen] = useState(false)

  useEffect(() => {
    const status = searchParams.get('google_auth')
    const token = searchParams.get('access_token')
    if (status === 'success' && token) {
      setAccessToken(token)
      void queryClient.invalidateQueries({ queryKey: ['auth', 'me'] })
      setSearchParams({}, { replace: true })
      navigate('/dashboard', { replace: true })
    }
  }, [navigate, queryClient, searchParams, setSearchParams])

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault()
    setError(null)

    try {
      await login.mutateAsync({ username, password })
      navigate('/dashboard')
    } catch {
      setError('Credenciales inválidas o usuario inactivo.')
    }
  }

  const handleGoogleSuccess = (accessToken: string) => {
    setAccessToken(accessToken)
    void queryClient.invalidateQueries({ queryKey: ['auth', 'me'] })
    navigate('/dashboard')
  }

  const googleEnabled = googleStatus?.configured ?? false

  return (
    <>
      <form className="modal-form" onSubmit={handleSubmit}>
        {googleEnabled && (
          <>
            <button
              type="button"
              onClick={() => setGoogleModalOpen(true)}
              className="btn-secondary inline-flex w-full items-center justify-center gap-2"
            >
              <GoogleIcon size={18} />
              Continuar con Google
            </button>
            <div className="auth-divider">
              <span className="auth-divider__label">o con usuario</span>
              <div className="auth-divider__line" />
            </div>
          </>
        )}

        <FormField label="Usuario" htmlFor="username">
          <input
            id="username"
            type="text"
            value={username}
            onChange={(event) => setUsername(event.target.value)}
            className="input-field"
            placeholder="Usuario"
            autoComplete="username"
            required
          />
        </FormField>

        <FormField label="Contraseña" htmlFor="password">
          <PasswordInput
            id="password"
            value={password}
            onChange={setPassword}
            placeholder="Contraseña"
            autoComplete="current-password"
            required
          />
        </FormField>

        {error && <p className="alert-error rounded-lg px-3 py-2 text-sm">{error}</p>}

        <button type="submit" disabled={login.isPending} className="btn-primary w-full">
          {login.isPending ? 'Ingresando…' : 'Entrar'}
        </button>
      </form>

      <GoogleOAuthModal
        isOpen={googleModalOpen}
        onClose={() => setGoogleModalOpen(false)}
        onSuccess={handleGoogleSuccess}
        onError={setError}
      />
    </>
  )
}
