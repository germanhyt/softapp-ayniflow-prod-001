import { Plus, Shield } from 'lucide-react'
import { useState } from 'react'

import {
  hasPermission,
  useCurrentUser,
  useRoles,
  useUsers,
} from '../application/hooks/useAuth'
import { RolesInfoModal } from './components/RolesInfoModal'
import { UserCreateModal } from './components/UserCreateModal'

export function UsersPage() {
  const { data: currentUser } = useCurrentUser()
  const { data: users, isLoading } = useUsers()
  const canCreate = hasPermission(currentUser, 'users:write')
  const canViewRoles = hasPermission(currentUser, 'roles:read')
  const { data: roles = [] } = useRoles(canViewRoles || canCreate)

  const [createModalOpen, setCreateModalOpen] = useState(false)
  const [rolesModalOpen, setRolesModalOpen] = useState(false)

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h2 className="text-xl font-semibold">Usuarios</h2>
          <p className="text-sm text-muted">
            Gestión básica de usuarios protegida por RBAC.
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
              Ver roles
            </button>
          )}
          {canCreate && (
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
          <table className="min-w-[640px] w-full text-left text-sm">
            <thead className="table-head">
              <tr>
                <th className="px-4 py-3 font-medium">Usuario</th>
                <th className="px-4 py-3 font-medium">Email</th>
                <th className="px-4 py-3 font-medium">Roles</th>
                <th className="px-4 py-3 font-medium">Estado</th>
              </tr>
            </thead>
            <tbody>
              {users?.length ? (
                users.map((user) => (
                  <tr key={user.id} className="table-row">
                    <td className="px-4 py-3">{user.username}</td>
                    <td className="px-4 py-3">{user.email}</td>
                    <td className="px-4 py-3">
                      <div className="flex flex-wrap gap-1">
                        {user.roles.map((role) => (
                          <span key={role.id} className="badge">
                            {role.name}
                          </span>
                        ))}
                      </div>
                    </td>
                    <td className="px-4 py-3">
                      <span className={`badge ${user.is_active ? '' : 'opacity-60'}`}>
                        {user.is_active ? 'Activo' : 'Inactivo'}
                      </span>
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td className="px-4 py-3 text-muted" colSpan={4}>
                    No hay usuarios registrados.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      )}

      {canViewRoles && (
        <RolesInfoModal isOpen={rolesModalOpen} onClose={() => setRolesModalOpen(false)} roles={roles} />
      )}

      {canCreate && (
        <UserCreateModal
          isOpen={createModalOpen}
          onClose={() => setCreateModalOpen(false)}
          roles={roles}
        />
      )}
    </div>
  )
}
