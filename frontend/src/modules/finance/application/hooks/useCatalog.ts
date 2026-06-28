import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'

import type { CatalogKind } from '../../domain/models/finance.types'
import {
  createCatalogItem,
  deleteCatalogItem,
  fetchCatalog,
  updateCatalogItem,
} from '../../infrastructure/repository/catalogRepository'

export function useCatalog(kind: CatalogKind, activeOnly = true) {
  return useQuery({
    queryKey: ['finance', 'catalog', kind, activeOnly],
    queryFn: () => fetchCatalog(kind, activeOnly),
  })
}

export function useCatalogMutations(kind: CatalogKind) {
  const queryClient = useQueryClient()

  const invalidate = () => {
    queryClient.invalidateQueries({ queryKey: ['finance', 'catalog', kind] })
  }

  const createItem = useMutation({
    mutationFn: (name: string) => createCatalogItem(kind, name),
    onSuccess: invalidate,
  })

  const updateItem = useMutation({
    mutationFn: ({
      id,
      payload,
    }: {
      id: number
      payload: Partial<{ name: string; is_active: boolean; sort_order: number }>
    }) => updateCatalogItem(kind, id, payload),
    onSuccess: invalidate,
  })

  const deleteItem = useMutation({
    mutationFn: (id: number) => deleteCatalogItem(kind, id),
    onSuccess: invalidate,
  })

  return { createItem, updateItem, deleteItem }
}
