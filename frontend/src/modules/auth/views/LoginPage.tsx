import { useState } from 'react'
import { useNavigate } from 'react-router-dom'

import { HealthBadge } from '../../../core/components/HealthBadge'
import { PasswordInput } from '../../../core/components/PasswordInput'
import { useLogin } from '../application/hooks/useAuth'

export function LoginPage() {
  const navigate = useNavigate()
  const login = useLogin()
  const [username, setUsername] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState<string | null>(null)

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

  return (
    <form className="space-y-4" onSubmit={handleSubmit}>
      <div>
        <label htmlFor="username" className="mb-1 block text-sm font-medium">
          Usuario
        </label>
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
      </div>

      <div>
        <label htmlFor="password" className="mb-1 block text-sm font-medium">
          Contraseña
        </label>
        <PasswordInput
          id="password"
          value={password}
          onChange={setPassword}
          placeholder="Contraseña"
          autoComplete="current-password"
          required
        />
      </div>

      {error && (
        <div className="alert-error rounded-lg px-3 py-2 text-sm">
          <HealthBadge label="Error" tone="danger" className="mb-2" />
          {error}
        </div>
      )}

      <button type="submit" disabled={login.isPending} className="btn-primary w-full">
        {login.isPending ? 'Ingresando…' : 'Entrar'}
      </button>
    </form>
  )
}
