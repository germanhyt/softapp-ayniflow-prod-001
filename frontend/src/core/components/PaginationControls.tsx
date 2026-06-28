import { PAGE_SIZE_OPTIONS, type PageSize, type PaginatedMeta } from '../../modules/finance/domain/models/finance.types'

interface PaginationControlsProps {
  meta: PaginatedMeta
  pageSize: PageSize
  onPageChange: (page: number) => void
  onPageSizeChange: (size: PageSize) => void
}

export function PaginationControls({
  meta,
  pageSize,
  onPageChange,
  onPageSizeChange,
}: PaginationControlsProps) {
  const { page, total_pages, total } = meta
  const from = total === 0 ? 0 : (page - 1) * pageSize + 1
  const to = Math.min(page * pageSize, total)

  return (
    <div className="flex flex-wrap items-center justify-between gap-3 border-t px-4 py-3 text-sm" style={{ borderColor: 'var(--premium-border)' }}>
      <p className="text-muted">
        Mostrando {from}–{to} de {total}
      </p>
      <div className="flex flex-wrap items-center gap-3">
        <label className="flex items-center gap-2">
          <span className="text-muted">Filas</span>
          <select
            value={pageSize}
            onChange={(e) => onPageSizeChange(Number(e.target.value) as PageSize)}
            className="input-field py-1"
          >
            {PAGE_SIZE_OPTIONS.map((size) => (
              <option key={size} value={size}>
                {size}
              </option>
            ))}
          </select>
        </label>
        <div className="flex items-center gap-2">
          <button
            type="button"
            className="btn-secondary px-3 py-1"
            disabled={page <= 1}
            onClick={() => onPageChange(page - 1)}
          >
            Anterior
          </button>
          <span className="text-muted">
            Página {page} / {total_pages}
          </span>
          <button
            type="button"
            className="btn-secondary px-3 py-1"
            disabled={page >= total_pages}
            onClick={() => onPageChange(page + 1)}
          >
            Siguiente
          </button>
        </div>
      </div>
    </div>
  )
}
