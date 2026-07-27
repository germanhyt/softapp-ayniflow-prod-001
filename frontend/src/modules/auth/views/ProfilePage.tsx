import {
  AtSign,
  CalendarDays,
  KeyRound,
  Lock,
  Mail,
  ShieldCheck,
  UserCircle,
  UserRound,
} from 'lucide-react'
import { useEffect, useMemo, useState } from 'react'

import { FormField } from '../../../core/components/FormField'
import { GoogleIcon } from '../../../core/components/GoogleIcon'
import { HealthBadge } from '../../../core/components/HealthBadge'
import { ModalSection } from '../../../core/components/ModalSection'
import { PageHeader } from '../../../core/components/PageHeader'
import { PasswordInput } from '../../../core/components/PasswordInput'
import { SegmentTabs } from '../../../core/components/SegmentTabs'
import { StatSummary } from '../../../core/components/StatSummary'
import { UserAvatar } from '../../../core/components/UserAvatar'
import { formatDateTime } from '../../../core/utils/datetime'
import { alertSuccess } from '../../../core/utils/alerts'
import { getApiErrorMessage, validateUserPassword } from '../../../core/utils/apiError'
import { ensureArray } from '../../../core/utils/collections'
import {
  useChangeOwnPassword,
  useCurrentUser,
  useUpdateProfile,
} from '../application/hooks/useAuth'
import type { Role } from '../domain/models/auth.types'
import { ProfileAvatarUpload } from './components/ProfileAvatarUpload'

type ProfileTab = 'personal' | 'security' | 'access'

const PROFILE_TABS: { value: ProfileTab; label: string }[] = [
  { value: 'personal', label: 'Datos' },
  { value: 'security', label: 'Seguridad' },
  { value: 'access', label: 'Acceso' },
]

export function ProfilePage() {
  const { data: user, isLoading } = useCurrentUser()
  const updateProfile = useUpdateProfile()
  const changePassword = useChangeOwnPassword()

  const [activeTab, setActiveTab] = useState<ProfileTab>('personal')
  const [fullName, setFullName] = useState('')
  const [showPermissions, setShowPermissions] = useState(false)
  const [passwordForm, setPasswordForm] = useState({
    currentPassword: '',
    newPassword: '',
    confirmPassword: '',
  })
  const [profileError, setProfileError] = useState<string | null>(null)
  const [passwordError, setPasswordError] = useState<string | null>(null)

  useEffect(() => {
    setFullName(user?.full_name ?? '')
  }, [user?.full_name])

  const roles = ensureArray<Role>(user?.roles)
  const permissions = ensureArray<string>(user?.permissions)
  const profileDirty = fullName.trim() !== (user?.full_name ?? '').trim()
  const googleLinked = Boolean(user?.google_linked)

  const displayName = useMemo(
    () => user?.full_name?.trim() || user?.username || '—',
    [user?.full_name, user?.username],
  )

  const handleProfileSubmit = async (event: React.FormEvent) => {
    event.preventDefault()
    setProfileError(null)

    try {
      await updateProfile.mutateAsync({ full_name: fullName.trim() || null })
      await alertSuccess('Perfil actualizado', 'Tus datos se guardaron correctamente.')
    } catch (error) {
      setProfileError(getApiErrorMessage(error, 'No se pudo actualizar el perfil.'))
    }
  }

  const handlePasswordSubmit = async (event: React.FormEvent) => {
    event.preventDefault()
    setPasswordError(null)

    const validationError = validateUserPassword(
      passwordForm.newPassword,
      passwordForm.confirmPassword,
    )
    if (validationError) {
      setPasswordError(validationError)
      return
    }

    if (!passwordForm.currentPassword.trim()) {
      setPasswordError('Indica tu contraseña actual.')
      return
    }

    try {
      await changePassword.mutateAsync({
        current_password: passwordForm.currentPassword,
        new_password: passwordForm.newPassword,
      })
      setPasswordForm({ currentPassword: '', newPassword: '', confirmPassword: '' })
      await alertSuccess('Contraseña actualizada', 'Usa la nueva contraseña en tu próximo inicio de sesión.')
    } catch (error) {
      setPasswordError(getApiErrorMessage(error, 'No se pudo cambiar la contraseña.'))
    }
  }

  if (isLoading || !user) {
    return (
      <div className="module-page space-y-4">
        <div className="skeleton h-10 w-48" />
        <div className="profile-layout">
          <div className="card skeleton h-96" />
          <div className="card skeleton h-96" />
        </div>
      </div>
    )
  }

  return (
    <div className="module-page">
      <PageHeader
        title="Mi perfil"
        description="Personaliza tu identidad, revisa tu seguridad y consulta tus accesos."
        icon={UserCircle}
        badge={
          user.is_active ? (
            <HealthBadge label="Cuenta activa" tone="success" />
          ) : (
            <HealthBadge label="Cuenta inactiva" tone="danger" />
          )
        }
      />

      <div className="profile-layout">
        <aside className="profile-sidebar">
          <section className="card profile-identity-card">
            <div className="profile-identity-card__header">
              <UserAvatar
                fullName={user.full_name}
                username={user.username}
                avatarUrl={user.avatar_url}
                size="lg"
              />
              <div className="min-w-0">
                <h2 className="truncate text-lg font-semibold tracking-tight">{displayName}</h2>
                <p className="truncate text-sm text-muted">@{user.username}</p>
              </div>
            </div>

            <ProfileAvatarUpload user={user} />

            <div className="profile-identity-card__meta">
              <div className="flex flex-wrap gap-2">
                {roles.map((role) => (
                  <HealthBadge key={role.id} label={role.name} tone="primary" />
                ))}
                {googleLinked && (
                  <span className="badge inline-flex items-center gap-1.5">
                    <GoogleIcon size={14} />
                    Google
                  </span>
                )}
              </div>
            </div>
          </section>

          <section className="grid gap-3 sm:grid-cols-2 xl:grid-cols-1">
            <StatSummary label="Permisos" value={String(permissions.length)} tone="info" />
            <StatSummary label="Miembro desde" value={formatDateTime(user.created_at, { fallback: '—' })} />
          </section>
        </aside>

        <div className="profile-main space-y-4">
          <SegmentTabs options={PROFILE_TABS} value={activeTab} onChange={setActiveTab} />

          {activeTab === 'personal' && (
            <section className="card">
              <ModalSection
                title="Datos personales"
                description="Información visible en la app y en la barra superior."
                icon={UserRound}
              >
                <form onSubmit={handleProfileSubmit} className="space-y-4">
                  <div className="grid gap-4 md:grid-cols-2">
                    <FormField label="Nombre completo" htmlFor="profile-full-name">
                      <input
                        id="profile-full-name"
                        className="input-field"
                        value={fullName}
                        onChange={(event) => setFullName(event.target.value)}
                        placeholder="Tu nombre visible"
                        maxLength={255}
                      />
                    </FormField>

                    <FormField label="Nombre de usuario" htmlFor="profile-username">
                      <div className="relative">
                        <AtSign
                          size={16}
                          className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-muted"
                        />
                        <input
                          id="profile-username"
                          className="input-field pl-9"
                          value={user.username}
                          readOnly
                          disabled
                        />
                      </div>
                    </FormField>

                    <FormField label="Correo electrónico" htmlFor="profile-email">
                      <div className="relative">
                        <Mail
                          size={16}
                          className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-muted"
                        />
                        <input
                          id="profile-email"
                          className="input-field pl-9"
                          value={user.email}
                          readOnly
                          disabled
                        />
                      </div>
                    </FormField>

                    <FormField label="Registro">
                      <div className="relative">
                        <CalendarDays
                          size={16}
                          className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-muted"
                        />
                        <input
                          className="input-field pl-9"
                          value={formatDateTime(user.created_at)}
                          readOnly
                          disabled
                        />
                      </div>
                    </FormField>
                  </div>

                  <p className="text-xs text-muted">
                    El usuario y el email solo pueden modificarse desde administración.
                  </p>

                  {profileError ? <p className="alert-error">{profileError}</p> : null}

                  <div className="flex justify-end">
                    <button
                      type="submit"
                      className="btn-primary"
                      disabled={!profileDirty || updateProfile.isPending}
                    >
                      {updateProfile.isPending ? 'Guardando…' : 'Guardar cambios'}
                    </button>
                  </div>
                </form>
              </ModalSection>
            </section>
          )}

          {activeTab === 'security' && (
            <section className="card">
              <ModalSection
                title="Seguridad de acceso"
                description={
                  googleLinked
                    ? 'Tu cuenta principal usa Google Sign-In.'
                    : 'Actualiza tu contraseña de acceso local.'
                }
                icon={Lock}
              >
                {googleLinked ? (
                  <div className="profile-info-panel">
                    <GoogleIcon size={22} className="shrink-0" />
                    <div className="space-y-1">
                      <p className="font-medium">Inicio de sesión con Google</p>
                      <p className="text-sm text-muted">
                        Las credenciales se gestionan en tu cuenta de Google. Puedes seguir
                        personalizando tu nombre y foto de perfil en AyniFlow.
                      </p>
                    </div>
                  </div>
                ) : (
                  <form onSubmit={handlePasswordSubmit} className="space-y-4">
                    <div className="grid gap-4 md:grid-cols-2">
                      <FormField label="Contraseña actual" htmlFor="profile-current-password">
                        <PasswordInput
                          id="profile-current-password"
                          value={passwordForm.currentPassword}
                          onChange={(value) =>
                            setPasswordForm((prev) => ({ ...prev, currentPassword: value }))
                          }
                          autoComplete="current-password"
                        />
                      </FormField>

                      <div className="hidden md:block" aria-hidden />

                      <FormField label="Nueva contraseña" htmlFor="profile-new-password">
                        <PasswordInput
                          id="profile-new-password"
                          value={passwordForm.newPassword}
                          onChange={(value) =>
                            setPasswordForm((prev) => ({ ...prev, newPassword: value }))
                          }
                          autoComplete="new-password"
                        />
                      </FormField>

                      <FormField label="Confirmar nueva contraseña" htmlFor="profile-confirm-password">
                        <PasswordInput
                          id="profile-confirm-password"
                          value={passwordForm.confirmPassword}
                          onChange={(value) =>
                            setPasswordForm((prev) => ({ ...prev, confirmPassword: value }))
                          }
                          autoComplete="new-password"
                        />
                      </FormField>
                    </div>

                    {passwordError ? <p className="alert-error">{passwordError}</p> : null}

                    <div className="flex justify-end">
                      <button
                        type="submit"
                        className="btn-primary inline-flex items-center gap-2"
                        disabled={
                          changePassword.isPending ||
                          !passwordForm.currentPassword ||
                          !passwordForm.newPassword ||
                          !passwordForm.confirmPassword
                        }
                      >
                        <KeyRound size={16} />
                        {changePassword.isPending ? 'Actualizando…' : 'Cambiar contraseña'}
                      </button>
                    </div>
                  </form>
                )}
              </ModalSection>
            </section>
          )}

          {activeTab === 'access' && (
            <section className="card space-y-4">
              <ModalSection
                title="Roles asignados"
                description="Define qué módulos y capacidades tienes en la plataforma."
                icon={ShieldCheck}
              >
                <div className="grid gap-3 md:grid-cols-2">
                  {roles.length > 0 ? (
                    roles.map((role) => (
                      <div key={role.id} className="role-card">
                        <div className="flex items-start gap-3">
                          <span className="role-card__icon">
                            <ShieldCheck size={18} />
                          </span>
                          <div>
                            <p className="font-medium">{role.name}</p>
                            <p className="mt-1 text-sm text-muted">
                              {role.description ?? 'Sin descripción.'}
                            </p>
                          </div>
                        </div>
                        <HealthBadge label={role.slug} tone="info" />
                      </div>
                    ))
                  ) : (
                    <p className="text-sm text-muted">Sin roles asignados.</p>
                  )}
                </div>
              </ModalSection>

              <ModalSection
                title={`Permisos (${permissions.length})`}
                description="Capacidades efectivas de tu sesión actual."
                icon={ShieldCheck}
                actions={
                  <button
                    type="button"
                    className="btn-secondary text-sm"
                    onClick={() => setShowPermissions((prev) => !prev)}
                  >
                    {showPermissions ? 'Ocultar' : 'Mostrar'}
                  </button>
                }
              >
                {showPermissions ? (
                  <div className="flex flex-wrap gap-2">
                    {permissions.map((permission) => (
                      <HealthBadge key={permission} label={permission} tone="info" />
                    ))}
                  </div>
                ) : (
                  <p className="text-sm text-muted">
                    Pulsa «Mostrar» para ver el listado completo de permisos activos.
                  </p>
                )}
              </ModalSection>
            </section>
          )}
        </div>
      </div>
    </div>
  )
}
