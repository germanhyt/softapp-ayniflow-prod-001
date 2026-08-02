import { Plus, X } from 'lucide-react'
import { useEffect, useState } from 'react'

import {
  buildGmailQueryFromLabels,
  normalizeLabelName,
  parseGmailLabels,
} from '../../application/utils/gmailLabels'

interface GmailLabelsEditorProps {
  label: string
  description: string
  value: string
  envDefault?: string | null
  disabled?: boolean
  onSave: (query: string) => void
}

const SUGGESTIONS = ['PAGOS/BCP/YAPE']

export function GmailLabelsEditor({
  label,
  description,
  value,
  envDefault,
  disabled,
  onSave,
}: GmailLabelsEditorProps) {
  const [labels, setLabels] = useState<string[]>(() => parseGmailLabels(value))
  const [draft, setDraft] = useState('')

  useEffect(() => {
    setLabels(parseGmailLabels(value))
  }, [value])

  const persist = (next: string[]) => {
    setLabels(next)
    const query = buildGmailQueryFromLabels(next)
    if (query !== (value || '')) {
      onSave(query)
    }
  }

  const addLabel = (raw: string) => {
    const name = normalizeLabelName(raw)
    if (!name || disabled) return
    if (labels.some((item) => item.toLowerCase() === name.toLowerCase())) {
      setDraft('')
      return
    }
    persist([...labels, name])
    setDraft('')
  }

  const removeLabel = (name: string) => {
    if (disabled) return
    persist(labels.filter((item) => item !== name))
  }

  const effectiveQuery = buildGmailQueryFromLabels(labels) || value || envDefault || '—'
  const unusedSuggestions = SUGGESTIONS.filter(
    (item) => !labels.some((labelItem) => labelItem.toLowerCase() === item.toLowerCase()),
  )

  return (
    <div className="integration-config-field space-y-2">
      <div>
        <p className="font-medium">{label}</p>
        <p className="text-sm text-muted">{description}</p>
      </div>

      <div className="flex flex-wrap gap-2">
        {labels.length ? (
          labels.map((item) => (
            <span
              key={item}
              className="badge inline-flex items-center gap-1.5"
              style={{ backgroundColor: 'rgba(var(--premium-primary-rgb), 0.12)' }}
            >
              {item}
              {!disabled && (
                <button
                  type="button"
                  className="btn-icon !h-5 !w-5"
                  aria-label={`Quitar ${item}`}
                  onClick={() => removeLabel(item)}
                >
                  <X size={12} />
                </button>
              )}
            </span>
          ))
        ) : (
          <span className="text-sm text-muted">Sin etiquetas. Agrega al menos una.</span>
        )}
      </div>

      {!disabled && (
        <div className="flex flex-wrap items-center gap-2">
          <input
            type="text"
            className="input-field max-w-xs flex-1"
            placeholder="Ej. PAGOS/BBVA o ALERTAS/INTERBANK"
            value={draft}
            onChange={(e) => setDraft(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter') {
                e.preventDefault()
                addLabel(draft)
              }
            }}
          />
          <button
            type="button"
            className="btn-secondary inline-flex items-center gap-1.5"
            onClick={() => addLabel(draft)}
            disabled={!draft.trim()}
          >
            <Plus size={14} />
            Agregar
          </button>
        </div>
      )}

      {!disabled && unusedSuggestions.length > 0 && (
        <div className="flex flex-wrap items-center gap-2 text-xs text-muted">
          <span>Sugeridas:</span>
          {unusedSuggestions.map((item) => (
            <button
              key={item}
              type="button"
              className="btn-ghost px-2 py-1 text-xs"
              onClick={() => addLabel(item)}
            >
              {item}
            </button>
          ))}
        </div>
      )}

      <p className="env-hint">
        Query efectiva: <code className="font-mono text-xs">{effectiveQuery}</code>
      </p>
    </div>
  )
}
