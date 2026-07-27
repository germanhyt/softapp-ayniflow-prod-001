import { Pencil, Plus, Shield, Trash2, Users } from 'lucide-react'
import { useMemo, useState } from 'react'

import { HealthBadge } from '../../../core/components/HealthBadge'
import { StatSummary } from '../../../core/components/StatSummary'
import { ensureArray } from '../../../core/utils/collections'
import { alertError, alertSuccess, confirmAction } from '../../../core/utils/alerts'
import { getApiErrorMessage } from '../../../core/utils/apiError'
import {
  hasPermission,
  useCurrentUser,
  useDeleteUser,
  useRoles,
  useUsers,
} from '../application/hooks/useAuth'
import type { Role, User } from '../domain/models/auth.types'
import { RolesInfoModal } from './components/RolesInfoModal'
import { UserFormModal } from './components/UserFormModal'

export function UsersPage() {
  const { data: currentUser } = useCurrentUser()
  const { data: usersData, isLoading } = useUsers()
  const deleteUser = useDeleteUser()
  const canManage = hasPermission(currentUser, 'users:write')
  const canViewRoles = hasPermission(currentUser, 'roles:read')
  const canEditRoles = hasPermission(currentUser, 'roles:write')
  const { data: rolesData } = useRoles(canViewRoles || canManage)
  const roles = ensureArray<Role>(rolesData)
  const users = ensureArray<User>(usersData)

  const [createModalOpen, setCreateModalOpen] = useState(false)
  const [editModalOpen, setEditModalOpen] = useState(false)
  const [selectedUser, setSelectedUser] = useState<User | null>(null)
  const [rolesModalOpen, setRolesModalOpen] = useState(false)

  const stats = useMemo(() => {
    const active = users.filter((u) => u.is_active).length
    return {
      total: users.length,
      active,
      inactive: users.length - active,
      roles: roles.length,
    }
  }, [users, roles.length])

  const openEditModal = (user: User) => {
    setSelectedUser(user)
    setEditModalOpen(true)
  }

  const closeEditModal = () => {
    setEditModalOpen(false)
    setSelectedUser(null)
  }

  const handleDeleteUser = async (user: User) => {
    if (user.id === currentUser?.id) return

    const confirmed = await confirmAction(
      'Eliminar usuario',
      `¿Eliminar a «${user.username}»? Se borrarán también sus datos financieros e integraciones.`,
      'Eliminar',
    )
    if (!confirmed) return

    try {
      await deleteUser.mutateAsync(user.id)
      await alertSuccess('Usuario eliminado', `«${user.username}» fue eliminado correctamente.`)
      if (selectedUser?.id === user.id) {
        closeEditModal()
      }
    } catch (err) {
      await alertError('Error', getApiErrorMessage(err, 'No se pudo eliminar el usuario.'))
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h2 className="text-xl font-semibold tracking-tight">Usuarios</h2>
          <p className="text-sm text-muted">
            Cada cuenta tiene un único rol. Los permisos efectivos dependen del rol asignado.
          </p>
        </div>

        <div className="flex flex-wrap justify-end gap-2">
          {canViewRoles && (
            <button
              type="button"
              onClick={() => setRolesModalOpen(true)}
              className="btn-secondary inline-flex items-center gap-2"
            >
              <Shield size={16} />
              {canEditRoles ? 'Editar roles' : 'Ver roles'}
            </button>
          )}
          {canManage && (
            <button
              type="button"
              onClick={() => setCreateModalOpen(true)}
              className="btn-primary inline-flex items-center gap-2"
            >
              <Plus size={16} />
              Nuevo usuario
            </button>
          )}
        </div>
      </div>

      <section className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <StatSummary label="Total usuarios" value={String(stats.total)} />
        <StatSummary label="Activos" value={String(stats.active)} tone="success" />
        <StatSummary label="Inactivos" value={String(stats.inactive)} tone={stats.inactive > 0 ? 'warning' : 'neutral'} />
        <StatSummary label="Roles" value={String(stats.roles)} tone="info" />
      </section>

      <div className="space-y-3 lg:hidden">
        {isLoading ? (
          Array.from({ length: 3 }).map((_, i) => (
            <div key={i} className="budget-card space-y-3">
              <div className="skeleton h-6 w-36" />
              <div className="skeleton h-4 w-48" />
              <div className="skeleton h-4 w-24" />
            </div>
          ))
        ) : users.length ? (
          users.map((user) => (
            <UserCard
              key={user.id}
              user={user}
              role={ensureArray<Role>(user.roles)[0]}
              isSelf={user.id === currentUser?.id}
              canManage={canManage}
              onEdit={() => openEditModal(user)}
              onDelete={() => handleDeleteUser(user)}
              deletePending={deleteUser.isPending}
            />
          ))
        ) : (
          <EmptyUsers canManage={canManage} onCreate={() => setCreateModalOpen(true)} />
        )}
      </div>

      <div className="table-shell hidden overflow-x-auto lg:block">
        <table className="min-w-[720px] w-full text-left text-sm">
          <thead className="table-head">
            <tr>
              <th className="px-4 py-3 font-medium">Usuario</th>
              <th className="px-4 py-3 font-medium">Email</th>
              <th className="px-4 py-3 font-medium">Rol</th>
              <th className="px-4 py-3 font-medium">Estado</th>
              {canManage && <th className="px-4 py-3 font-medium">Acciones</th>}
            </tr>
          </thead>
          <tbody>
            {isLoading ? (
              <tr>
                <td className="px-4 py-6" colSpan={canManage ? 5 : 4}>
                  <div className="space-y-2">
                    <div className="skeleton h-4 w-full max-w-md" />
                    <div className="skeleton h-4 w-full max-w-sm" />
                  </div>
                </td>
              </tr>
            ) : users.length ? (
              users.map((user) => {
                const isSelf = user.id === currentUser?.id
                const role = ensureArray<Role>(user.roles)[0]

                return (
                  <tr
                    key={user.id}
                    className="table-row"
                    style={
                      isSelf
                        ? { backgroundColor: 'rgba(var(--premium-primary-rgb), 0.04)' }
                        : undefined
                    }
                  >
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-2">
                        <span className="font-medium">{user.username}</span>
                        {isSelf && <HealthBadge label="Tú" tone="info" />}
                      </div>
                      {user.full_name && <p className="text-xs text-muted">{user.full_name}</p>}
                    </td>
                    <td className="px-4 py-3">{user.email}</td>
                    <td className="px-4 py-3">
                      {role ? (
                        <HealthBadge label={role.name} tone="primary" />
                      ) : (
                        <span className="text-muted">—</span>
                      )}
                    </td>
                    <td className="px-4 py-3">
                      <HealthBadge
                        label={user.is_active ? 'Activo' : 'Inactivo'}
                        tone={user.is_active ? 'success' : 'warning'}
                      />
                    </td>
                    {canManage && (
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-2">
                          <button
                            type="button"
                            onClick={() => openEditModal(user)}
                            className="btn-ghost inline-flex items-center gap-1"
                          >
                            <Pencil size={14} />
                            Editar
                          </button>
                          {!isSelf && (
                            <button
                              type="button"
                              onClick={() => handleDeleteUser(user)}
                              className="btn-ghost inline-flex items-center gap-1 text-(--premium-danger)"
                              disabled={deleteUser.isPending}
                            >
                              <Trash2 size={14} />
                              Eliminar
                            </button>
                          )}
                        </div>
                      </td>
                    )}
                  </tr>
                )
              })
            ) : (
              <tr>
                <td className="px-4 py-3" colSpan={canManage ? 5 : 4}>
                  <EmptyUsers canManage={canManage} onCreate={() => setCreateModalOpen(true)} />
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {canViewRoles && (
        <RolesInfoModal
          isOpen={rolesModalOpen}
          onClose={() => setRolesModalOpen(false)}
          roles={roles}
          canEdit={canEditRoles}
        />
      )}

      {canManage && (
        <UserFormModal
          isOpen={createModalOpen}
          onClose={() => setCreateModalOpen(false)}
          mode="create"
          roles={roles}
        />
      )}

      {canManage && (
        <UserFormModal
          isOpen={editModalOpen}
          onClose={closeEditModal}
          mode="edit"
          user={selectedUser}
          roles={roles}
          isCurrentUser={Boolean(selectedUser && selectedUser.id === currentUser?.id)}
        />
      )}
    </div>
  )
}

function UserCard({
  user,
  role,
  isSelf,
  canManage,
  onEdit,
  onDelete,
  deletePending,
}: {
  user: User
  role: Role | undefined
  isSelf: boolean
  canManage: boolean
  onEdit: () => void
  onDelete: () => void
  deletePending: boolean
}) {
  return (
    <article className="budget-card space-y-3">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-2">
            <p className="truncate font-semibold">{user.username}</p>
            {isSelf && <HealthBadge label="Tú" tone="info" />}
          </div>
          {user.full_name ? <p className="text-xs text-muted">{user.full_name}</p> : null}
          <p className="mt-1 truncate text-sm text-muted">{user.email}</p>
        </div>
        <HealthBadge
          label={user.is_active ? 'Activo' : 'Inactivo'}
          tone={user.is_active ? 'success' : 'warning'}
        />
      </div>

      {role ? <HealthBadge label={role.name} tone="primary" /> : null}

      {canManage && (
        <div className="flex items-center gap-2 border-t pt-3" style={{ borderColor: 'var(--premium-border)' }}>
          <button
            type="button"
            onClick={onEdit}
            className="btn-secondary inline-flex flex-1 items-center justify-center gap-1.5"
          >
            <Pencil size={14} />
            Editar
          </button>
          {!isSelf && (
            <button
              type="button"
              onClick={onDelete}
              disabled={deletePending}
              className="btn-ghost inline-flex items-center justify-center gap-1.5 text-(--premium-danger)"
            >
              <Trash2 size={14} />
            </button>
          )}
        </div>
      )}
    </article>
  )
}

function EmptyUsers({ canManage, onCreate }: { canManage: boolean; onCreate: () => void }) {
  return (
    <div className="empty-state">
      <div className="empty-state__icon">
        <Users size={28} />
      </div>
      <div>
        <p className="font-medium">Sin usuarios registrados</p>
        <p className="mt-1 text-sm text-muted">Crea la primera cuenta para empezar a operar.</p>
      </div>
      {canManage && (
        <button type="button" onClick={onCreate} className="btn-primary inline-flex items-center gap-2">
          <Plus size={16} />
          Nuevo usuario
        </button>
      )}
    </div>
  )
}
