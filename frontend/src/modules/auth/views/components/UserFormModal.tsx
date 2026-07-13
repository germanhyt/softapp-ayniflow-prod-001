import { Wand2 } from 'lucide-react'
import { useState } from 'react'

import { Modal } from '../../../../core/components/Modal'
import { PasswordInput } from '../../../../core/components/PasswordInput'
import { ToggleSwitch } from '../../../../core/components/ToggleSwitch'
import { ensureArray } from '../../../../core/utils/collections'
import { alertSuccess } from '../../../../core/utils/alerts'
import {
  getApiErrorMessage,
  validateUserEmail,
  validateUserPassword,
} from '../../../../core/utils/apiError'
import {
  useCreateUser,
  useUpdateUser,
  useUpdateUserPassword,
} from '../../application/hooks/useAuth'
import type { Role, User } from '../../domain/models/auth.types'
import { UserFormField } from './UserFormField'

type UserFormMode = 'create' | 'edit'

interface UserFormModalProps {
  isOpen: boolean
  onClose: () => void
  mode: UserFormMode
  roles?: Role[]
  user?: User | null
  isCurrentUser?: boolean
}

const PASSWORD_ALPHABET =
  'abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789!@#$%&*'

function generateLocalPassword(length = 12): string {
  const pick = () => PASSWORD_ALPHABET[Math.floor(Math.random() * PASSWORD_ALPHABET.length)]
  while (true) {
    const password = Array.from({ length }, pick).join('')
    if (
      /[a-z]/.test(password) &&
      /[A-Z]/.test(password) &&
      /\d/.test(password) &&
      /[!@#$%&*]/.test(password)
    ) {
      return password
    }
  }
}

function AutogeneratePasswordButton({ onGenerate }: { onGenerate: () => void }) {
  return (
    <button
      type="button"
      className="btn-icon shrink-0 self-stretch h-auto min-h-10 w-10"
      onClick={onGenerate}
      title="Autogenerar contraseña"
      aria-label="Autogenerar contraseña"
    >
      <Wand2 size={18} />
    </button>
  )
}

function buildCreateForm(roles: Role[]) {
  return {
    email: '',
    username: '',
    password: '',
    confirmPassword: '',
    fullName: '',
    roleSlug: roles[0]?.slug ?? 'reader',
    isActive: true,
  }
}

function buildEditForm(user: User, roles: Role[]) {
  const userRoles = ensureArray<Role>(user.roles)
  return {
    email: user.email,
    username: user.username,
    password: '',
    confirmPassword: '',
    fullName: user.full_name ?? '',
    roleSlug: userRoles[0]?.slug ?? roles[0]?.slug ?? 'reader',
    isActive: user.is_active,
  }
}

function UserForm({
  mode,
  roles: rolesInput,
  user,
  isCurrentUser,
  onClose,
}: {
  mode: UserFormMode
  roles: Role[]
  user?: User | null
  isCurrentUser: boolean
  onClose: () => void
}) {
  const roles = ensureArray<Role>(rolesInput)
  const createUser = useCreateUser()
  const updateUser = useUpdateUser()
  const updatePassword = useUpdateUserPassword()
  const isEdit = mode === 'edit'

  const initial = isEdit && user ? buildEditForm(user, roles) : buildCreateForm(roles)
  const [error, setError] = useState<string | null>(null)
  const [form, setForm] = useState(initial)
  const [newPassword, setNewPassword] = useState('')

  const selectedRole = roles.find((role) => role.slug === form.roleSlug)
  const isPending = createUser.isPending || updateUser.isPending || updatePassword.isPending
  const profileDirty = isEdit
    ? form.fullName !== initial.fullName ||
      form.roleSlug !== initial.roleSlug ||
      form.isActive !== initial.isActive
    : true
  const passwordDirty = isEdit && newPassword.trim().length > 0
  const isDirty = isEdit ? profileDirty || passwordDirty : true

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault()
    setError(null)

    if (isEdit) {
      if (!user || !isDirty) return

      if (passwordDirty && newPassword.trim().length < 8) {
        setError('La contraseña debe tener al menos 8 caracteres.')
        return
      }

      try {
        if (profileDirty) {
          await updateUser.mutateAsync({
            userId: user.id,
            payload: {
              full_name: form.fullName.trim() || null,
              role_slug: form.roleSlug,
              is_active: form.isActive,
            },
          })
        }

        if (passwordDirty) {
          await updatePassword.mutateAsync({
            userId: user.id,
            payload: { password: newPassword.trim() },
          })
        }

        await alertSuccess(
          'Usuario actualizado',
          `Los cambios de «${user.username}» se guardaron correctamente.`,
        )
        onClose()
      } catch (err) {
        setError(getApiErrorMessage(err, 'No se pudo actualizar el usuario.'))
      }
      return
    }

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

    const passwordErrorMessage = validateUserPassword(form.password, form.confirmPassword)
    if (passwordErrorMessage) {
      setError(passwordErrorMessage)
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
    <form onSubmit={handleSubmit} className="space-y-5" autoComplete="off">
      <div className="grid gap-4 md:grid-cols-2">
        {!isEdit && (
          <>
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
            <UserFormField label="Contraseña" hint="Mínimo 8 caracteres." className="md:col-span-2">
              <div className="flex items-stretch gap-2">
                <div className="min-w-0 flex-1">
                  <PasswordInput
                    value={form.password}
                    onChange={(password) => setForm({ ...form, password })}
                    placeholder="Contraseña"
                    autoComplete="new-password"
                    required
                  />
                </div>
                <AutogeneratePasswordButton
                  onGenerate={() => {
                    const password = generateLocalPassword()
                    setForm((current) => ({
                      ...current,
                      password,
                      confirmPassword: password,
                    }))
                  }}
                />
              </div>
            </UserFormField>
            <UserFormField label="Confirmar contraseña" className="md:col-span-2">
              <PasswordInput
                value={form.confirmPassword}
                onChange={(confirmPassword) => setForm({ ...form, confirmPassword })}
                placeholder="Repite la contraseña"
                autoComplete="new-password"
                required
              />
            </UserFormField>
          </>
        )}

        <UserFormField label="Nombre completo" className={isEdit ? 'md:col-span-2' : undefined}>
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

        {isEdit && (
          <div
            className="flex flex-wrap items-center justify-between gap-3 rounded-lg border px-3 py-3 md:col-span-2"
            style={{ borderColor: 'var(--premium-border)' }}
          >
            <div>
              <p className="font-medium">Estado de la cuenta</p>
              <p className="text-sm text-muted">
                {form.isActive
                  ? 'El usuario puede iniciar sesión y usar el sistema.'
                  : 'El usuario no podrá iniciar sesión hasta reactivarlo.'}
              </p>
              {isCurrentUser && (
                <p className="mt-1 text-xs text-muted">No puedes desactivar tu propia cuenta.</p>
              )}
            </div>
            <ToggleSwitch
              id={`user-active-${user?.id ?? 'edit'}`}
              checked={form.isActive}
              disabled={isCurrentUser}
              label={form.isActive ? 'Activo' : 'Inactivo'}
              onChange={(isActive) => setForm({ ...form, isActive })}
            />
          </div>
        )}

        {isEdit && (
          <UserFormField
            label="Nueva contraseña"
            className="md:col-span-2"
            hint="Opcional. Déjala vacía si no quieres cambiarla. Se aplica al guardar."
          >
            <div className="flex items-stretch gap-2">
              <div className="min-w-0 flex-1">
                <PasswordInput
                  value={newPassword}
                  onChange={setNewPassword}
                  placeholder="Mínimo 8 caracteres"
                  autoComplete="new-password"
                />
              </div>
              <AutogeneratePasswordButton onGenerate={() => setNewPassword(generateLocalPassword())} />
            </div>
          </UserFormField>
        )}
      </div>

      {error && <p className="alert-error">{error}</p>}

      <div className="modal-actions -mx-5 -mb-4 mt-2">
        <button type="button" onClick={onClose} className="btn-secondary" disabled={isPending}>
          Cancelar
        </button>
        <button
          type="submit"
          className="btn-primary"
          disabled={isPending || (isEdit && !isDirty)}
        >
          {isPending
            ? isEdit
              ? 'Guardando...'
              : 'Creando...'
            : isEdit
              ? 'Guardar cambios'
              : 'Crear usuario'}
        </button>
      </div>
    </form>
  )
}

export function UserFormModal({
  isOpen,
  onClose,
  mode,
  roles,
  user = null,
  isCurrentUser = false,
}: UserFormModalProps) {
  const safeRoles = ensureArray<Role>(roles)
  const formKey =
    mode === 'edit'
      ? `edit-${user?.id ?? 'none'}`
      : `create-${safeRoles.map((role) => role.id).join('-') || 'default'}-${isOpen ? 'open' : 'closed'}`

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={mode === 'edit' ? 'Editar usuario' : 'Nuevo usuario'}
      size="lg"
    >
      {mode === 'edit' && !user ? (
        <p className="text-sm text-muted">Selecciona un usuario para editar.</p>
      ) : isOpen ? (
        <UserForm
          key={formKey}
          mode={mode}
          roles={safeRoles}
          user={user}
          isCurrentUser={isCurrentUser}
          onClose={onClose}
        />
      ) : null}
    </Modal>
  )
}

/** Compat wrappers para imports existentes. */
export function UserCreateModal({
  isOpen,
  onClose,
  roles,
}: {
  isOpen: boolean
  onClose: () => void
  roles?: Role[]
}) {
  return <UserFormModal isOpen={isOpen} onClose={onClose} mode="create" roles={roles} />
}

export function UserEditModal({
  isOpen,
  onClose,
  user,
  roles,
  isCurrentUser,
}: {
  isOpen: boolean
  onClose: () => void
  user: User | null
  roles: Role[]
  isCurrentUser: boolean
}) {
  return (
    <UserFormModal
      isOpen={isOpen}
      onClose={onClose}
      mode="edit"
      user={user}
      roles={roles}
      isCurrentUser={isCurrentUser}
    />
  )
}
