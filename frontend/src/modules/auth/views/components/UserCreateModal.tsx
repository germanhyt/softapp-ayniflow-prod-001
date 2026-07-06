import { useState } from 'react'

import { PasswordInput } from '../../../../core/components/PasswordInput'
import { ensureArray } from '../../../../core/utils/collections'
import { Modal } from '../../../../core/components/Modal'
import { alertSuccess } from '../../../../core/utils/alerts'
import { getApiErrorMessage, validateUserEmail, validateUserPassword } from '../../../../core/utils/apiError'
import type { Role } from '../../domain/models/auth.types'
import { useCreateUser } from '../../application/hooks/useAuth'
import { UserFormField } from './UserFormField'

interface UserCreateModalProps {
  isOpen: boolean
  onClose: () => void
  roles?: Role[]
}

function buildEmptyForm(roles: Role[]) {
  return {
    email: '',
    username: '',
    password: '',
    confirmPassword: '',
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

    const emailError = validateUserEmail(form.email)
    if (emailError) {
      setError(emailError)
      return
    }

    const username = form.username.trim()
    if (username.length < 3) {
      setError('El usuario debe tener al menos 3 caracteres.')
      return
    }

    const passwordError = validateUserPassword(form.password, form.confirmPassword)
    if (passwordError) {
      setError(passwordError)
      return
    }

    try {
      const created = await createUser.mutateAsync({
        email: form.email.trim(),
        username,
        password: form.password,
        full_name: form.fullName.trim() || undefined,
        role_slug: form.roleSlug,
      })
      await alertSuccess('Usuario creado', `«${created.username}» fue registrado correctamente.`)
      onClose()
    } catch (err) {
      setError(getApiErrorMessage(err, 'No se pudo crear el usuario.'))
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4" autoComplete="off">
      <div className="grid gap-4 md:grid-cols-2">
        <UserFormField label="Email">
          <input
            type="email"
            name="new-user-email"
            value={form.email}
            onChange={(e) => setForm({ ...form, email: e.target.value })}
            className="input-field"
            placeholder="usuario@empresa.com"
            autoComplete="off"
            inputMode="email"
            required
          />
        </UserFormField>
        <UserFormField label="Usuario">
          <input
            type="text"
            name="new-user-username"
            value={form.username}
            onChange={(e) => setForm({ ...form, username: e.target.value })}
            className="input-field"
            placeholder="nombre.usuario"
            autoComplete="off"
            required
          />
        </UserFormField>
        <UserFormField label="Contraseña" hint="Mínimo 8 caracteres.">
          <PasswordInput
            value={form.password}
            onChange={(password) => setForm({ ...form, password })}
            placeholder="Contraseña"
            autoComplete="new-password"
            required
          />
        </UserFormField>
        <UserFormField label="Confirmar contraseña">
          <PasswordInput
            value={form.confirmPassword}
            onChange={(confirmPassword) => setForm({ ...form, confirmPassword })}
            placeholder="Repite la contraseña"
            autoComplete="new-password"
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
            autoComplete="name"
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
  const safeRoles = ensureArray<Role>(roles)
  const formKey = `${safeRoles.map((role) => role.id).join('-') || 'default'}-${isOpen ? 'open' : 'closed'}`

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Nuevo usuario" size="lg">
      {isOpen ? <UserCreateForm key={formKey} roles={safeRoles} onClose={onClose} /> : null}
    </Modal>
  )
}
