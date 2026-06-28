import { useState } from 'react'
import { useNavigate } from 'react-router-dom'

import { useLogin } from '../application/hooks/useAuth'

export function LoginPage() {
  const navigate = useNavigate()
  const login = useLogin()
  const [username, setUsername] = useState('admin')
  const [password, setPassword] = useState('Admin123!')
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
          autoComplete="username"
          required
        />
      </div>

      <div>
        <label htmlFor="password" className="mb-1 block text-sm font-medium">
          Contraseña
        </label>
        <input
          id="password"
          type="password"
          value={password}
          onChange={(event) => setPassword(event.target.value)}
          className="input-field"
          autoComplete="current-password"
          required
        />
      </div>

      {error && <p className="alert-error">{error}</p>}

      <button type="submit" disabled={login.isPending} className="btn-primary w-full">
        {login.isPending ? 'Ingresando...' : 'Entrar'}
      </button>
    </form>
  )
}
