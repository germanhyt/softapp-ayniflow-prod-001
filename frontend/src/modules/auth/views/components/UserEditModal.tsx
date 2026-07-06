import { KeyRound, UserRound } from 'lucide-react'
import { useState } from 'react'

import { Modal } from '../../../../core/components/Modal'
import { PasswordInput } from '../../../../core/components/PasswordInput'
import { ToggleSwitch } from '../../../../core/components/ToggleSwitch'
import { alertSuccess } from '../../../../core/utils/alerts'
import { getApiErrorMessage } from '../../../../core/utils/apiError'
import type { Role, User } from '../../domain/models/auth.types'
import { useUpdateUser, useUpdateUserPassword } from '../../application/hooks/useAuth'
import { UserFormField } from './UserFormField'

interface UserEditModalProps {
  isOpen: boolean
  onClose: () => void
  user: User | null
  roles: Role[]
  isCurrentUser: boolean
}

function buildFormState(user: User, roles: Role[]) {
  return {
    fullName: user.full_name ?? '',
    roleSlug: user.roles[0]?.slug ?? roles[0]?.slug ?? 'reader',
    isActive: user.is_active,
  }
}

function UserEditForm({
  user,
  roles,
  isCurrentUser,
  onClose,
}: {
  user: User
  roles: Role[]
  isCurrentUser: boolean
  onClose: () => void
}) {
  const updateUser = useUpdateUser()
  const updatePassword = useUpdateUserPassword()
  const initialState = buildFormState(user, roles)
  const [error, setError] = useState<string | null>(null)
  const [passwordError, setPasswordError] = useState<string | null>(null)
  const [fullName, setFullName] = useState(initialState.fullName)
  const [roleSlug, setRoleSlug] = useState(initialState.roleSlug)
  const [isActive, setIsActive] = useState(initialState.isActive)
  const [newPassword, setNewPassword] = useState('')

  const selectedRole = roles.find((role) => role.slug === roleSlug)
  const isDirty =
    fullName !== initialState.fullName ||
    roleSlug !== initialState.roleSlug ||
    isActive !== initialState.isActive

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault()
    if (!isDirty) return
    setError(null)

    try {
      await updateUser.mutateAsync({
        userId: user.id,
        payload: {
          full_name: fullName.trim() || null,
          role_slug: roleSlug,
          is_active: isActive,
        },
      })
      await alertSuccess('Usuario actualizado', `Los cambios de «${user.username}» se guardaron correctamente.`)
      onClose()
    } catch (err) {
      setError(getApiErrorMessage(err, 'No se pudo actualizar el usuario.'))
    }
  }

  const handleUpdatePassword = async () => {
    if (newPassword.length < 8) {
      setPasswordError('La contraseña debe tener al menos 8 caracteres.')
      return
    }
    setPasswordError(null)

    try {
      await updatePassword.mutateAsync({
        userId: user.id,
        payload: { password: newPassword },
      })
      setNewPassword('')
      await alertSuccess(
        'Contraseña actualizada',
        `La nueva contraseña de «${user.username}» se guardó correctamente.`,
      )
    } catch (err) {
      setPasswordError(getApiErrorMessage(err, 'No se pudo actualizar la contraseña.'))
    }
  }

  const handleAutoGeneratePassword = async () => {
    setPasswordError(null)

    try {
      const result = await updatePassword.mutateAsync({
        userId: user.id,
        payload: { auto_generate: true },
      })
      setNewPassword(result.password)
      await alertSuccess(
        'Contraseña generada',
        `Nueva contraseña para «${user.username}»: ${result.password}`,
      )
    } catch (err) {
      setPasswordError(getApiErrorMessage(err, 'No se pudo generar la contraseña.'))
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-5">
      <section
        className="flex flex-wrap items-start gap-3 rounded-xl border p-4"
        style={{ borderColor: 'var(--premium-border)', backgroundColor: 'var(--premium-surface-high)' }}
      >
        <span
          className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full"
          style={{ backgroundColor: 'rgba(var(--premium-primary-rgb), 0.14)' }}
        >
          <UserRound size={20} className="text-premium-primary" />
        </span>
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-2">
            <p className="font-semibold">{user.username}</p>
            {isCurrentUser && <span className="badge">Tú</span>}
            <span className={`badge ${user.is_active ? '' : 'opacity-60'}`}>
              {user.is_active ? 'Activo' : 'Inactivo'}
            </span>
          </div>
          <p className="mt-0.5 truncate text-sm text-muted">{user.email}</p>
          <p className="mt-1 text-xs text-muted">
            Rol actual: <strong>{user.roles[0]?.name ?? 'Sin rol'}</strong>
          </p>
        </div>
      </section>

      <div className="space-y-1">
        <p className="text-sm font-medium">Datos editables</p>
        <p className="text-xs text-muted">
          El usuario y el correo no se modifican desde aquí. Puedes ajustar nombre, rol y estado.
        </p>
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        <UserFormField label="Nombre completo" className="md:col-span-2">
          <input
            type="text"
            value={fullName}
            onChange={(e) => setFullName(e.target.value)}
            className="input-field"
            placeholder="Opcional"
            autoComplete="name"
          />
        </UserFormField>

        <UserFormField
          label="Rol"
          className="md:col-span-2"
          hint={selectedRole?.description ?? 'Selecciona el rol del usuario.'}
        >
          <select
            value={roleSlug}
            onChange={(e) => setRoleSlug(e.target.value)}
            className="input-field"
          >
            {roles.map((role) => (
              <option key={role.id} value={role.slug}>
                {role.name}
              </option>
            ))}
          </select>
        </UserFormField>

        <div
          className="flex flex-wrap items-center justify-between gap-3 rounded-lg border px-3 py-3 md:col-span-2"
          style={{ borderColor: 'var(--premium-border)' }}
        >
          <div>
            <p className="font-medium">Estado de la cuenta</p>
            <p className="text-sm text-muted">
              {isActive
                ? 'El usuario puede iniciar sesión y usar el sistema.'
                : 'El usuario no podrá iniciar sesión hasta reactivarlo.'}
            </p>
            {isCurrentUser && (
              <p className="mt-1 text-xs text-muted">No puedes desactivar tu propia cuenta.</p>
            )}
          </div>
          <ToggleSwitch
            id={`user-active-${user.id}`}
            checked={isActive}
            disabled={isCurrentUser}
            label={isActive ? 'Activo' : 'Inactivo'}
            onChange={setIsActive}
          />
        </div>
      </div>

      <section className="space-y-3 rounded-xl border p-4" style={{ borderColor: 'var(--premium-border)' }}>
        <div className="flex items-start gap-2">
          <KeyRound size={18} className="mt-0.5 text-premium-primary" />
          <div>
            <p className="font-medium">Contraseña</p>
            <p className="text-xs text-muted">
              Establece una contraseña manual o genera una segura automáticamente.
            </p>
          </div>
        </div>

        <UserFormField label="Nueva contraseña">
          <PasswordInput
            value={newPassword}
            onChange={setNewPassword}
            placeholder="Mínimo 8 caracteres"
            autoComplete="new-password"
          />
        </UserFormField>

        {passwordError && <p className="alert-error">{passwordError}</p>}

        <div className="flex flex-wrap gap-2">
          <button
            type="button"
            className="btn-secondary"
            onClick={handleAutoGeneratePassword}
            disabled={updatePassword.isPending}
          >
            {updatePassword.isPending ? 'Generando...' : 'Autogenerar y aplicar'}
          </button>
          <button
            type="button"
            className="btn-primary"
            onClick={handleUpdatePassword}
            disabled={updatePassword.isPending || newPassword.length < 8}
          >
            {updatePassword.isPending ? 'Guardando...' : 'Actualizar contraseña'}
          </button>
        </div>
      </section>

      {error && <p className="alert-error">{error}</p>}

      <div className="modal-actions -mx-5 -mb-4 mt-2">
        <button type="button" onClick={onClose} className="btn-secondary" disabled={updateUser.isPending}>
          Cancelar
        </button>
        <button type="submit" className="btn-primary" disabled={updateUser.isPending || !isDirty}>
          {updateUser.isPending ? 'Guardando...' : 'Guardar cambios'}
        </button>
      </div>
    </form>
  )
}

export function UserEditModal({ isOpen, onClose, user, roles, isCurrentUser }: UserEditModalProps) {
  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Editar usuario" size="lg">
      {user ? (
        <UserEditForm
          key={user.id}
          user={user}
          roles={roles}
          isCurrentUser={isCurrentUser}
          onClose={onClose}
        />
      ) : (
        <p className="text-sm text-muted">Selecciona un usuario para editar.</p>
      )}
    </Modal>
  )
}
