import { Trash2 } from 'lucide-react'
import { useState } from 'react'

import { Modal } from '../../../../core/components/Modal'
import { alertError, alertSuccess, confirmAction } from '../../../../core/utils/alerts'
import type { CatalogItem, CatalogKind } from '../../domain/models/finance.types'
import { useCatalog, useCatalogMutations } from '../../application/hooks/useCatalog'

const TITLES: Record<CatalogKind, string> = {
  banks: 'Gestionar bancos',
  'payment-types': 'Gestionar tipos de pago',
  categories: 'Gestionar categorías',
}

interface CatalogManageModalProps {
  kind: CatalogKind
  isOpen: boolean
  onClose: () => void
}

export function CatalogManageModal({ kind, isOpen, onClose }: CatalogManageModalProps) {
  const { data: items, isLoading } = useCatalog(kind, false)
  const { createItem, updateItem, deleteItem } = useCatalogMutations(kind)
  const [newName, setNewName] = useState('')
  const [editingId, setEditingId] = useState<number | null>(null)
  const [editingName, setEditingName] = useState('')
  const [error, setError] = useState<string | null>(null)

  const handleCreate = async (event: React.FormEvent) => {
    event.preventDefault()
    setError(null)
    try {
      await createItem.mutateAsync(newName.trim())
      setNewName('')
      await alertSuccess('Registro creado')
    } catch {
      setError('No se pudo crear el registro.')
      await alertError('Error', 'No se pudo crear el registro.')
    }
  }

  const startEdit = (item: CatalogItem) => {
    setEditingId(item.id)
    setEditingName(item.name)
    setError(null)
  }

  const saveEdit = async (item: CatalogItem) => {
    setError(null)
    try {
      await updateItem.mutateAsync({ id: item.id, payload: { name: editingName.trim() } })
      setEditingId(null)
      setEditingName('')
      await alertSuccess('Registro actualizado')
    } catch {
      setError('No se pudo actualizar el registro.')
      await alertError('Error', 'No se pudo actualizar el registro.')
    }
  }

  const toggleActive = async (item: CatalogItem) => {
    setError(null)
    try {
      await updateItem.mutateAsync({ id: item.id, payload: { is_active: !item.is_active } })
      await alertSuccess('Estado actualizado')
    } catch {
      setError('No se pudo cambiar el estado.')
      await alertError('Error', 'No se pudo cambiar el estado.')
    }
  }

  const handleDelete = async (item: CatalogItem) => {
    const confirmed = await confirmAction('Eliminar registro', `¿Eliminar "${item.name}"?`, 'Eliminar')
    if (!confirmed) return
    setError(null)
    try {
      await deleteItem.mutateAsync(item.id)
      await alertSuccess('Registro eliminado')
    } catch {
      setError('No se pudo eliminar el registro.')
      await alertError('Error', 'No se pudo eliminar el registro.')
    }
  }

  return (
    <Modal isOpen={isOpen} onClose={onClose} title={TITLES[kind]} size="lg">
      <form onSubmit={handleCreate} className="mb-4 flex gap-2">
        <input
          type="text"
          value={newName}
          onChange={(e) => setNewName(e.target.value)}
          placeholder="Nuevo valor..."
          className="input-field"
          required
        />
        <button type="submit" disabled={createItem.isPending} className="btn-primary shrink-0">
          Agregar
        </button>
      </form>

      {error && <p className="alert-error mb-3">{error}</p>}

      <div className="table-shell">
        <table className="min-w-full text-left text-sm">
          <thead className="table-head">
            <tr>
              <th className="px-4 py-3">Nombre</th>
              <th className="px-4 py-3">Estado</th>
              <th className="px-4 py-3 text-right">Acciones</th>
            </tr>
          </thead>
          <tbody>
            {isLoading ? (
              <tr>
                <td className="px-4 py-3" colSpan={3}>
                  Cargando...
                </td>
              </tr>
            ) : items?.length ? (
              items.map((item) => (
                <tr key={item.id} className="table-row">
                  <td className="px-4 py-3">
                    {editingId === item.id ? (
                      <input
                        type="text"
                        value={editingName}
                        onChange={(e) => setEditingName(e.target.value)}
                        className="input-field"
                      />
                    ) : (
                      item.name
                    )}
                  </td>
                  <td className="px-4 py-3">
                    <button
                      type="button"
                      onClick={() => toggleActive(item)}
                      className={`badge ${item.is_active ? '' : 'opacity-60'}`}
                    >
                      {item.is_active ? 'Activo' : 'Inactivo'}
                    </button>
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex justify-end gap-2">
                      {editingId === item.id ? (
                        <>
                          <button type="button" onClick={() => saveEdit(item)} className="btn-secondary">
                            Guardar
                          </button>
                          <button
                            type="button"
                            onClick={() => setEditingId(null)}
                            className="btn-ghost"
                          >
                            Cancelar
                          </button>
                        </>
                      ) : (
                        <>
                          <button type="button" onClick={() => startEdit(item)} className="btn-ghost">
                            Editar
                          </button>
                          <button
                            type="button"
                            onClick={() => handleDelete(item)}
                            className="btn-icon text-[var(--premium-danger)]"
                            title="Eliminar"
                          >
                            <Trash2 size={16} />
                          </button>
                        </>
                      )}
                    </div>
                  </td>
                </tr>
              ))
            ) : (
              <tr>
                <td className="px-4 py-3 text-muted" colSpan={3}>
                  No hay registros.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </Modal>
  )
}
