import { ArrowLeft, Check, Shield } from 'lucide-react'
import { useMemo, useState } from 'react'

import { Modal } from '../../../../core/components/Modal'
import { ModalFormActions } from '../../../../core/components/FormField'
import { ensureArray } from '../../../../core/utils/collections'
import { alertError, alertSuccess } from '../../../../core/utils/alerts'
import { getApiErrorMessage } from '../../../../core/utils/apiError'
import {
  usePermissions,
  useUpdateRolePermissions,
} from '../../application/hooks/useAuth'
import { permissionLabel } from '../../application/utils/permissionLabels'
import type { Permission, Role } from '../../domain/models/auth.types'

interface RolesInfoModalProps {
  isOpen: boolean
  onClose: () => void
  roles?: Role[]
  canEdit?: boolean
}

function PermissionCheckbox({
  permission,
  checked,
  disabled,
  onToggle,
}: {
  permission: Permission
  checked: boolean
  disabled?: boolean
  onToggle: () => void
}) {
  return (
    <button
      type="button"
      onClick={onToggle}
      disabled={disabled}
      className={`permission-card ${checked ? 'permission-card--checked' : 'permission-card--unchecked'}`}
      aria-pressed={checked}
    >
      <span
        className="mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-md border transition-colors"
        style={{
          borderColor: checked ? 'transparent' : 'var(--premium-border)',
          backgroundColor: checked ? 'var(--premium-primary)' : 'var(--premium-bg)',
          color: checked ? 'var(--premium-bg)' : 'transparent',
        }}
        aria-hidden
      >
        <Check size={14} strokeWidth={3} />
      </span>
      <span className="min-w-0">
        <span className="block text-sm font-medium">
          {permissionLabel(permission.code, permission.description)}
        </span>
        <span className="mt-0.5 block font-mono text-xs text-muted">{permission.code}</span>
      </span>
    </button>
  )
}

function RolePermissionsEditor({
  role,
  allPermissions,
  permissionsLoading,
  canEdit,
  onBack,
}: {
  role: Role
  allPermissions: Permission[]
  permissionsLoading?: boolean
  canEdit: boolean
  onBack: () => void
}) {
  const updateRolePermissions = useUpdateRolePermissions()
  const initialCodes = useMemo(
    () =>
      ensureArray<Permission>(role.permissions)
        .map((permission) => permission.code)
        .sort(),
    [role.permissions],
  )
  // Remounted via key={role.id}; no need to sync state in an effect.
  const [selectedCodes, setSelectedCodes] = useState<string[]>(initialCodes)
  const [error, setError] = useState<string | null>(null)

  const isDirty =
    selectedCodes.length !== initialCodes.length ||
    selectedCodes.some((code) => !initialCodes.includes(code))

  const toggleCode = (code: string) => {
    if (!canEdit) return
    setSelectedCodes((current) =>
      current.includes(code) ? current.filter((item) => item !== code) : [...current, code].sort(),
    )
  }

  const handleSave = async () => {
    if (!canEdit) {
      onBack()
      return
    }
    setError(null)
    try {
      await updateRolePermissions.mutateAsync({
        roleId: role.id,
        payload: { permission_codes: selectedCodes },
      })
      await alertSuccess(
        'Permisos actualizados',
        `Los permisos del rol «${role.name}» se guardaron correctamente.`,
      )
      onBack()
    } catch (err) {
      const message = getApiErrorMessage(err, 'No se pudieron actualizar los permisos.')
      setError(message)
      await alertError('Error', message)
    }
  }

  const selectedCount = selectedCodes.length
  const totalCount = allPermissions.length || ensureArray<Permission>(role.permissions).length

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-start justify-between gap-2">
        <div className="min-w-0">
          <button
            type="button"
            className="mb-2 inline-flex items-center gap-1 text-sm text-muted hover:underline"
            onClick={onBack}
            disabled={updateRolePermissions.isPending}
          >
            <ArrowLeft size={14} />
            Volver a roles
          </button>
          <p className="font-medium">{role.name}</p>
          {role.description && <p className="text-sm text-muted">{role.description}</p>}
          <p className="mt-1 text-xs text-muted">
            {selectedCount} de {totalCount || selectedCount} permisos seleccionados
          </p>
        </div>
        {canEdit && (
          <div className="flex flex-wrap gap-2">
            <button
              type="button"
              className="btn-secondary"
              onClick={() => setSelectedCodes(allPermissions.map((item) => item.code).sort())}
              disabled={updateRolePermissions.isPending || !allPermissions.length}
            >
              Todos
            </button>
            <button
              type="button"
              className="btn-secondary"
              onClick={() => setSelectedCodes([])}
              disabled={updateRolePermissions.isPending}
            >
              Ninguno
            </button>
          </div>
        )}
      </div>

      {canEdit ? (
        permissionsLoading ? (
          <div className="space-y-2">
            {Array.from({ length: 4 }).map((_, i) => (
              <div key={i} className="skeleton h-14 w-full rounded-xl" />
            ))}
          </div>
        ) : allPermissions.length ? (
          <div className="grid max-h-[50vh] gap-2 overflow-y-auto pr-1 sm:grid-cols-2">
            {allPermissions.map((permission) => (
              <PermissionCheckbox
                key={permission.id}
                permission={permission}
                checked={selectedCodes.includes(permission.code)}
                disabled={updateRolePermissions.isPending}
                onToggle={() => toggleCode(permission.code)}
              />
            ))}
          </div>
        ) : (
          <p className="text-sm text-muted">No hay permisos disponibles en el catálogo.</p>
        )
      ) : (
        <div className="flex flex-wrap gap-2">
          {ensureArray<Permission>(role.permissions).length ? (
            ensureArray<Permission>(role.permissions).map((permission) => (
              <span
                key={permission.id}
                className="badge"
                title={permission.code}
              >
                {permissionLabel(permission.code, permission.description)}
              </span>
            ))
          ) : (
            <p className="text-sm text-muted">Este rol no tiene permisos asignados.</p>
          )}
        </div>
      )}

      {error && <p className="alert-error">{error}</p>}

      <ModalFormActions className="mt-4">
        <button
          type="button"
          onClick={onBack}
          className="btn-secondary"
          disabled={updateRolePermissions.isPending}
        >
          {canEdit ? 'Cancelar' : 'Volver'}
        </button>
        {canEdit && (
          <button
            type="button"
            className="btn-primary"
            disabled={!isDirty || updateRolePermissions.isPending || !allPermissions.length}
            onClick={handleSave}
          >
            {updateRolePermissions.isPending ? 'Guardando...' : 'Guardar permisos'}
          </button>
        )}
      </ModalFormActions>
    </div>
  )
}

export function RolesInfoModal({ isOpen, onClose, roles, canEdit = false }: RolesInfoModalProps) {
  const safeRoles = ensureArray<Role>(roles)
  const { data: permissionsData, isLoading: permissionsLoading, isError: permissionsError } =
    usePermissions(isOpen && canEdit)
  const allPermissions = ensureArray<Permission>(permissionsData)
  const [selectedRoleId, setSelectedRoleId] = useState<number | null>(null)

  const selectedRole = selectedRoleId
    ? safeRoles.find((role) => role.id === selectedRoleId) ?? null
    : null

  const title = selectedRole
    ? canEdit
      ? `Permisos · ${selectedRole.name}`
      : `Ver permisos · ${selectedRole.name}`
    : 'Roles y permisos'

  const handleClose = () => {
    setSelectedRoleId(null)
    onClose()
  }

  if (!isOpen) {
    return null
  }

  return (
    <Modal isOpen={isOpen} onClose={handleClose} title={title} size="lg">
      {selectedRole ? (
        <RolePermissionsEditor
          key={selectedRole.id}
          role={selectedRole}
          allPermissions={allPermissions}
          permissionsLoading={permissionsLoading}
          canEdit={canEdit}
          onBack={() => setSelectedRoleId(null)}
        />
      ) : (
        <>
          <div className="space-y-4">
            <p className="text-sm text-muted">
              {canEdit
                ? 'Elige un rol para asignar o revisar sus permisos.'
                : 'Consulta los permisos asociados a cada rol.'}
            </p>
            {canEdit && permissionsError && (
              <p className="alert-error">No se pudieron cargar los permisos del catálogo.</p>
            )}

            {safeRoles.length ? (
              <div className="space-y-2">
                {safeRoles.map((role) => {
                  const permissionCount = ensureArray<Permission>(role.permissions).length
                  return (
                    <div key={role.id} className="role-card">
                      <div className="min-w-0 flex items-start gap-3">
                        <span className="role-card__icon">
                          <Shield size={18} />
                        </span>
                        <div className="min-w-0">
                          <div className="flex flex-wrap items-center gap-2">
                            <p className="font-medium">{role.name}</p>
                            <span className="badge">{role.slug}</span>
                          </div>
                          {role.description && (
                            <p className="mt-1 text-sm text-muted leading-snug">{role.description}</p>
                          )}
                          <p className="mt-1.5 text-xs text-muted">
                            {permissionCount} permiso{permissionCount === 1 ? '' : 's'} asignado
                            {permissionCount === 1 ? '' : 's'}
                          </p>
                        </div>
                      </div>
                      <button
                        type="button"
                        className="btn-secondary whitespace-nowrap justify-self-end self-center"
                        onClick={() => setSelectedRoleId(role.id)}
                        disabled={canEdit && permissionsLoading}
                      >
                        {canEdit ? 'Asignar permisos' : 'Ver permisos'}
                      </button>
                    </div>
                  )
                })}
              </div>
            ) : (
              <p className="text-sm text-muted">No hay roles disponibles.</p>
            )}
          </div>

          <ModalFormActions className="mt-4">
            <button type="button" onClick={handleClose} className="btn-secondary">
              Cerrar
            </button>
          </ModalFormActions>
        </>
      )}
    </Modal>
  )
}
