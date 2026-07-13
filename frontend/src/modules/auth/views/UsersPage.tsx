import { Plus, Shield } from 'lucide-react'
import { useState } from 'react'

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
          <h2 className="text-xl font-semibold">Usuarios</h2>
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

      {isLoading ? (
        <p className="text-sm text-muted">Cargando usuarios...</p>
      ) : (
        <div className="table-shell">
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
              {users?.length ? (
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
                          {isSelf && <span className="badge">Tú</span>}
                        </div>
                        {user.full_name && (
                          <p className="text-xs text-muted">{user.full_name}</p>
                        )}
                      </td>
                      <td className="px-4 py-3">{user.email}</td>
                      <td className="px-4 py-3">
                        {role ? <span className="badge">{role.name}</span> : <span className="text-muted">—</span>}
                      </td>
                      <td className="px-4 py-3">
                        <span className={`badge ${user.is_active ? '' : 'opacity-60'}`}>
                          {user.is_active ? 'Activo' : 'Inactivo'}
                        </span>
                      </td>
                      {canManage && (
                        <td className="px-4 py-3">
                          <div className="flex items-center gap-3">
                            <button
                              type="button"
                              onClick={() => openEditModal(user)}
                              className="text-sm hover:underline"
                            >
                              Editar
                            </button>
                            {!isSelf && (
                              <button
                                type="button"
                                onClick={() => handleDeleteUser(user)}
                                className="alert-error text-sm hover:underline"
                                disabled={deleteUser.isPending}
                              >
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
                  <td className="px-4 py-3 text-muted" colSpan={canManage ? 5 : 4}>
                    No hay usuarios registrados.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      )}

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
