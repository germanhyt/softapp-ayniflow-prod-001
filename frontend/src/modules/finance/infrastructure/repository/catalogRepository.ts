import { httpClient } from '../../../../core/interceptors/httpClient'
import type { CatalogItem, CatalogKind } from '../../domain/models/finance.types'

const CATALOG_PATH: Record<CatalogKind, string> = {
  banks: '/finance/catalog/banks',
  'payment-types': '/finance/catalog/payment-types',
  categories: '/finance/catalog/categories',
}

export async function fetchCatalog(kind: CatalogKind, activeOnly = true): Promise<CatalogItem[]> {
  const { data } = await httpClient.get<CatalogItem[]>(
    `${CATALOG_PATH[kind]}?active_only=${activeOnly}`,
  )
  return data
}

export async function createCatalogItem(kind: CatalogKind, name: string): Promise<CatalogItem> {
  const { data } = await httpClient.post<CatalogItem>(CATALOG_PATH[kind], { name })
  return data
}

export async function updateCatalogItem(
  kind: CatalogKind,
  id: number,
  payload: Partial<Pick<CatalogItem, 'name' | 'is_active' | 'sort_order'>>,
): Promise<CatalogItem> {
  const { data } = await httpClient.put<CatalogItem>(`${CATALOG_PATH[kind]}/${id}`, payload)
  return data
}

export async function deleteCatalogItem(kind: CatalogKind, id: number): Promise<void> {
  await httpClient.delete(`${CATALOG_PATH[kind]}/${id}`)
}
