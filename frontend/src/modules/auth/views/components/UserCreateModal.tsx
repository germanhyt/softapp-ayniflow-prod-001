import { useState } from 'react'

import { Modal } from '../../../../core/components/Modal'
import { alertSuccess } from '../../../../core/utils/alerts'
import { getApiErrorMessage } from '../../../../core/utils/apiError'
import type { Role } from '../../domain/models/auth.types'
import { useCreateUser } from '../../application/hooks/useAuth'
import { UserFormField } from './UserFormField'

interface UserCreateModalProps {
  isOpen: boolean
  onClose: () => void
  roles: Role[]
}

function buildEmptyForm(roles: Role[]) {
  return {
    email: '',
    username: '',
    password: '',
    fullName: '',
    roleSlug: roles[0]?.slug ?? 'reader',
  }
}

function UserCreateForm({ roles, onClose }: { roles: Role[]; onClose: () => void }) {
  const createUser = useCreateUser()
  const [error, setError] = useState<string | null>(null)
  const [form, setForm] = useState(() => buildEmptyForm(roles))
  const selectedRole = roles.find((role) => role.slug === form.roleSlug)

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault()
    setError(null)

    try {
      const created = await createUser.mutateAsync({
        email: form.email,
        username: form.username,
        password: form.password,
        full_name: form.fullName || undefined,
        role_slug: form.roleSlug,
      })
      await alertSuccess('Usuario creado', `«${created.username}» fue registrado correctamente.`)
      onClose()
    } catch (err) {
      setError(getApiErrorMessage(err, 'No se pudo crear el usuario.'))
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div className="grid gap-4 md:grid-cols-2">
        <UserFormField label="Email">
          <input
            type="email"
            value={form.email}
            onChange={(e) => setForm({ ...form, email: e.target.value })}
            className="input-field"
            placeholder="usuario@empresa.com"
            required
          />
        </UserFormField>
        <UserFormField label="Usuario">
          <input
            type="text"
            value={form.username}
            onChange={(e) => setForm({ ...form, username: e.target.value })}
            className="input-field"
            placeholder="nombre.usuario"
            required
          />
        </UserFormField>
        <UserFormField label="Contraseña">
          <input
            type="password"
            value={form.password}
            onChange={(e) => setForm({ ...form, password: e.target.value })}
            className="input-field"
            placeholder="Mínimo 8 caracteres"
            required
          />
        </UserFormField>
        <UserFormField label="Nombre completo">
          <input
            type="text"
            value={form.fullName}
            onChange={(e) => setForm({ ...form, fullName: e.target.value })}
            className="input-field"
            placeholder="Opcional"
          />
        </UserFormField>
        <UserFormField
          label="Rol"
          className="md:col-span-2"
          hint={selectedRole?.description ?? 'Cada usuario tiene un único rol.'}
        >
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
        </UserFormField>
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
  )
}

export function UserCreateModal({ isOpen, onClose, roles }: UserCreateModalProps) {
  const formKey = roles.map((role) => role.id).join('-') || 'default'

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Nuevo usuario" size="lg">
      {isOpen ? <UserCreateForm key={formKey} roles={roles} onClose={onClose} /> : null}
    </Modal>
  )
}
