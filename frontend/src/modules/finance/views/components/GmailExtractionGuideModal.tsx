import { useQuery } from '@tanstack/react-query'
import { BookOpen } from 'lucide-react'

import { HealthBadge } from '../../../../core/components/HealthBadge'
import { Modal } from '../../../../core/components/Modal'
import { ModalFormActions } from '../../../../core/components/FormField'
import { httpClient } from '../../../../core/interceptors/httpClient'
import { ensureArray } from '../../../../core/utils/collections'
import type {
  EmailExtractionGuide,
  EmailExtractionType,
} from '../../domain/models/finance.types'

interface GmailExtractionGuideModalProps {
  isOpen: boolean
  onClose: () => void
}

async function fetchExtractionGuide(): Promise<EmailExtractionGuide> {
  const { data } = await httpClient.get<EmailExtractionGuide>(
    '/finance/integrations/gmail/extraction-guide',
  )
  return data
}

export function GmailExtractionGuideModal({ isOpen, onClose }: GmailExtractionGuideModalProps) {
  const { data, isLoading, isError } = useQuery({
    queryKey: ['finance', 'gmail', 'extraction-guide'],
    queryFn: fetchExtractionGuide,
    enabled: isOpen,
    staleTime: 5 * 60_000,
  })

  const types = ensureArray<EmailExtractionType>(data?.types)
  const notes = ensureArray<string>(data?.notes)

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="Extracción de datos por correo"
      subtitle="Cómo AyniFlow interpreta cada tipo de notificación bancaria"
      size="xl"
    >
      {isLoading ? (
        <div className="space-y-3">
          {Array.from({ length: 3 }).map((_, index) => (
            <div key={index} className="skeleton h-28 rounded-xl" />
          ))}
        </div>
      ) : isError || !data ? (
        <p className="py-8 text-center text-sm text-muted">
          No se pudo cargar la guía de extracción.
        </p>
      ) : (
        <div className="space-y-5">
          <div className="flex flex-wrap items-center gap-2">
            <BookOpen size={16} className="text-muted" />
            <HealthBadge label={`Enfoque: ${data.bank_focus}`} tone="info" />
            <span className="text-xs text-muted">{types.length} tipos documentados</span>
          </div>

          <ul className="space-y-1 text-sm text-muted">
            {notes.map((note) => (
              <li key={note}>· {note}</li>
            ))}
          </ul>

          <div className="space-y-3">
            {types.map((item) => (
              <article key={item.id} className="budget-card space-y-3">
                <div className="flex flex-wrap items-start justify-between gap-2">
                  <div>
                    <h3 className="font-semibold">{item.name}</h3>
                    <p className="mt-1 text-sm text-muted">{item.description}</p>
                  </div>
                  <div className="flex flex-wrap gap-1.5">
                    <HealthBadge label={item.bank} tone="primary" />
                    <HealthBadge
                      label={item.movement}
                      tone={item.movement === 'INGRESO' ? 'success' : item.movement === 'EGRESO' ? 'danger' : 'warning'}
                    />
                    <HealthBadge label={item.tipo_operacion} tone="info" />
                  </div>
                </div>

                {item.subject_patterns.length > 0 && (
                  <p className="text-xs text-muted">
                    Asunto contiene:{' '}
                    {item.subject_patterns.map((pattern) => (
                      <code key={pattern} className="mr-1.5 font-mono">
                        {pattern}
                      </code>
                    ))}
                  </p>
                )}

                {item.fields.length > 0 ? (
                  <div className="table-shell overflow-x-auto">
                    <table className="min-w-full w-full text-left text-sm">
                      <thead className="table-head">
                        <tr>
                          <th className="px-3 py-2 font-medium">Campo</th>
                          <th className="px-3 py-2 font-medium">Origen en el correo</th>
                          <th className="px-3 py-2 font-medium">Obligatorio</th>
                        </tr>
                      </thead>
                      <tbody>
                        {item.fields.map((field) => (
                          <tr key={`${item.id}-${field.field}`} className="table-row">
                            <td className="px-3 py-2 font-medium">{field.field}</td>
                            <td className="px-3 py-2 text-muted">{field.source}</td>
                            <td className="px-3 py-2">
                              {field.required ? (
                                <HealthBadge label="Sí" tone="warning" />
                              ) : (
                                <span className="text-muted">No</span>
                              )}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                ) : (
                  <p className="text-sm text-muted">No genera transacción importable.</p>
                )}
              </article>
            ))}
          </div>
        </div>
      )}

      <ModalFormActions className="mt-4">
        <button type="button" onClick={onClose} className="btn-secondary">
          Cerrar
        </button>
      </ModalFormActions>
    </Modal>
  )
}
