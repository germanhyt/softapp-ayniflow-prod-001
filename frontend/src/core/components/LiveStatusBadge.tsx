import { Radio } from 'lucide-react'

import { useFinanceSocket } from '../../modules/finance/application/realtime/FinanceSocketProvider'

export function LiveStatusBadge() {
  const { connected, connecting } = useFinanceSocket()

  if (connecting) {
    return (
      <span
        className="live-status live-status-connecting hidden items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-medium sm:inline-flex"
        title="Reconectando canal en tiempo real"
      >
        <Radio size={12} className="live-status-icon" aria-hidden />
        Reconectando...
      </span>
    )
  }

  if (connected) {
    return (
      <span
        className="live-status live-status-on hidden items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-medium sm:inline-flex"
        title="Datos financieros en tiempo real activos"
      >
        <span className="live-status-dot" aria-hidden />
        En vivo
      </span>
    )
  }

  return (
    <span
      className="live-status live-status-off hidden items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-medium sm:inline-flex"
      title="Canal en tiempo real desconectado"
    >
      <Radio size={12} className="live-status-icon" aria-hidden />
      Sin conexión en vivo
    </span>
  )
}
