import { useEffect, useState } from 'react'

import { Modal } from '../../../../core/components/Modal'
import type { Role } from '../../domain/models/auth.types'
import { useCreateUser } from '../../application/hooks/useAuth'

interface UserCreateModalProps {
  isOpen: boolean
  onClose: () => void
  roles: Role[]
}

const EMPTY_FORM = {
  email: '',
  username: '',
  password: '',
  fullName: '',
  roleSlug: 'reader',
}

export function UserCreateModal({ isOpen, onClose, roles }: UserCreateModalProps) {
  const createUser = useCreateUser()
  const [error, setError] = useState<string | null>(null)
  const [form, setForm] = useState(EMPTY_FORM)

  useEffect(() => {
    if (!isOpen) return
    setError(null)
    setForm((prev) => ({
      ...EMPTY_FORM,
      roleSlug: roles[0]?.slug ?? prev.roleSlug,
    }))
  }, [isOpen, roles])

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault()
    setError(null)

    try {
      await createUser.mutateAsync({
        email: form.email,
        username: form.username,
        password: form.password,
        full_name: form.fullName || undefined,
        role_slugs: [form.roleSlug],
      })
      onClose()
      setForm(EMPTY_FORM)
    } catch {
      setError('No se pudo crear el usuario.')
    }
  }

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Nuevo usuario" size="lg">
      <form onSubmit={handleSubmit} className="space-y-4">
        <div className="grid gap-4 md:grid-cols-2">
          <Field label="Email">
            <input
              type="email"
              value={form.email}
              onChange={(e) => setForm({ ...form, email: e.target.value })}
              className="input-field"
              placeholder="usuario@empresa.com"
              required
            />
          </Field>
          <Field label="Usuario">
            <input
              type="text"
              value={form.username}
              onChange={(e) => setForm({ ...form, username: e.target.value })}
              className="input-field"
              placeholder="nombre.usuario"
              required
            />
          </Field>
          <Field label="Contraseña">
            <input
              type="password"
              value={form.password}
              onChange={(e) => setForm({ ...form, password: e.target.value })}
              className="input-field"
              placeholder="Mínimo 8 caracteres"
              required
            />
          </Field>
          <Field label="Nombre completo">
            <input
              type="text"
              value={form.fullName}
              onChange={(e) => setForm({ ...form, fullName: e.target.value })}
              className="input-field"
              placeholder="Opcional"
            />
          </Field>
          <Field label="Rol" className="md:col-span-2">
            <select
              value={form.roleSlug}
              onChange={(e) => setForm({ ...form, roleSlug: e.target.value })}
              className="input-field"
            >
              {roles.map((role) => (
                <option key={role.id} value={role.slug}>
                  {role.name}
                </option>
              ))}
            </select>
          </Field>
        </div>

        {error && <p className="alert-error">{error}</p>}

        <div className="modal-actions -mx-5 -mb-4 mt-2">
          <button type="button" onClick={onClose} className="btn-secondary" disabled={createUser.isPending}>
            Cancelar
          </button>
          <button type="submit" className="btn-primary" disabled={createUser.isPending}>
            {createUser.isPending ? 'Creando...' : 'Crear usuario'}
          </button>
        </div>
      </form>
    </Modal>
  )
}

function Field({
  label,
  children,
  className = '',
}: {
  label: string
  children: React.ReactNode
  className?: string
}) {
  return (
    <label className={`block space-y-1 text-sm ${className}`}>
      <span className="font-medium">{label}</span>
      {children}
    </label>
  )
}
