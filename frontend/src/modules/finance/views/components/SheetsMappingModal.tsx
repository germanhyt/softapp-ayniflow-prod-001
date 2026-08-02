import { Modal } from '../../../../core/components/Modal'
import { ModalFormActions } from '../../../../core/components/FormField'

interface SheetsMappingModalProps {
  isOpen: boolean
  onClose: () => void
}

const SHEET_COLUMNS = [
  {
    column: 'Fecha',
    field: 'Fecha del movimiento',
    note: 'Formatos: AAAA-MM-DD o DD/MM/AAAA',
  },
  {
    column: 'Hora',
    field: 'Hora del movimiento',
    note: 'Opcional · HH:MM o HH:MM:SS',
  },
  {
    column: 'Movimiento',
    field: 'Tipo de movimiento',
    note: 'Ingreso o Egreso',
  },
  {
    column: 'Concepto',
    field: 'Concepto / descripción',
    note: 'Texto libre',
  },
  {
    column: 'Banco',
    field: 'Banco o entidad',
    note: 'Ej. BCP, Yape, Interbank',
  },
  {
    column: 'Tipo',
    field: 'Medio de pago',
    note: 'Ej. Transferencia, Yape, Efectivo',
  },
  {
    column: 'Destinatario',
    field: 'Destinatario',
    note: 'Opcional',
  },
  {
    column: 'Num_Operacion',
    field: 'Número de operación',
    note: 'Usado para evitar duplicados',
  },
  {
    column: 'Monto',
    field: 'Monto',
    note: 'Número positivo (coma o punto decimal)',
  },
  {
    column: 'Categoria',
    field: 'Categoría',
    note: 'Opcional · alinea con presupuestos',
  },
] as const

export function SheetsMappingModal({ isOpen, onClose }: SheetsMappingModalProps) {
  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="Mapeo de columnas · Google Sheets"
      subtitle="Orden esperado en el rango configurado (por defecto Transacciones!A:J)"
      size="lg"
    >
      <div className="space-y-4">
        <p className="text-sm text-muted">
          La primera fila debe ser el encabezado. Cada columna del sheet se importa así a AyniFlow:
        </p>

        <div className="table-shell overflow-x-auto">
          <table className="min-w-full w-full text-left text-sm">
            <thead className="table-head">
              <tr>
                <th className="px-3 py-2 font-medium">Columna en el sheet</th>
                <th className="px-3 py-2 font-medium">Campo en AyniFlow</th>
                <th className="px-3 py-2 font-medium">Notas</th>
              </tr>
            </thead>
            <tbody>
              {SHEET_COLUMNS.map((item) => (
                <tr key={item.column} className="table-row">
                  <td className="px-3 py-2">
                    <code className="text-xs font-medium">{item.column}</code>
                  </td>
                  <td className="px-3 py-2 font-medium">{item.field}</td>
                  <td className="px-3 py-2 text-muted">{item.note}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        <p className="text-xs text-muted">
          Filas vacías se omiten. Si el número de operación ya existe en tu workspace, la fila se
          marca como omitida.
        </p>
      </div>

      <ModalFormActions className="mt-4">
        <button type="button" onClick={onClose} className="btn-secondary">
          Cerrar
        </button>
      </ModalFormActions>
    </Modal>
  )
}
