import { Modal } from '../../../../core/components/Modal'
import type { Role } from '../../domain/models/auth.types'

interface RolesInfoModalProps {
  isOpen: boolean
  onClose: () => void
  roles: Role[]
}

export function RolesInfoModal({ isOpen, onClose, roles }: RolesInfoModalProps) {
  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Roles y permisos" size="lg">
      <div className="space-y-4">
        {roles.length ? (
          roles.map((role) => (
            <div key={role.id} className="card space-y-2">
              <div>
                <p className="font-medium">{role.name}</p>
                {role.description && <p className="text-sm text-muted">{role.description}</p>}
              </div>
              <div className="flex flex-wrap gap-2">
                {role.permissions.map((permission) => (
                  <span key={permission.id} className="badge">
                    {permission.code}
                  </span>
                ))}
              </div>
            </div>
          ))
        ) : (
          <p className="text-sm text-muted">No hay roles disponibles.</p>
        )}
      </div>
      <div className="modal-actions -mx-5 -mb-4 mt-4">
        <button type="button" onClick={onClose} className="btn-secondary">
          Cerrar
        </button>
      </div>
    </Modal>
  )
}
