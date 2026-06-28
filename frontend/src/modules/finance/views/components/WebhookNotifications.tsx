import { useWebhookEvents } from '../../application/hooks/useFinance'
import type { WebhookEvent } from '../../domain/models/finance.types'

export function WebhookNotifications() {
  const { data: events } = useWebhookEvents(5)
  const recent = events?.filter((event) => event.status === 'processed').slice(0, 3) ?? []

  if (!recent.length) {
    return null
  }

  return (
    <div className="alert-info">
      <p className="mb-2 text-sm font-medium">Notificaciones webhook recientes</p>
      <ul className="space-y-1 text-sm text-muted">
        {recent.map((event: WebhookEvent) => (
          <li key={event.id}>
            Operación {event.operation_number ?? event.id} registrada ({event.source})
          </li>
        ))}
      </ul>
    </div>
  )
}
