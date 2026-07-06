const FALLBACK_PALETTE = [
  'var(--premium-primary)',
  'var(--premium-accent)',
  '#6366f1',
  '#14b8a6',
  '#f59e0b',
  '#ef4444',
  '#a855f7',
  '#64748b',
]

/** Colores semánticos por medio de pago (Perú: Yape, QR, transferencias, etc.) */
export const PAYMENT_TYPE_COLORS: Record<string, string> = {
  'YAPEO CELULAR': '#7c3aed',
  'PAGO QR': '#06b6d4',
  TRANSFERENCIA: '#2563eb',
  'PAGO SERVICIO': '#f97316',
  EFECTIVO: '#84cc16',
  COMPRA: '#eab308',
  VENTA: '#22c55e',
  OTROS: '#94a3b8',
}

/** Colores por categoría de gasto (alineados al catálogo seed) */
export const CATEGORY_COLORS: Record<string, string> = {
  Vivienda: '#6366f1',
  Alimentación: '#22c55e',
  Transporte: '#3b82f6',
  Salud: '#ef4444',
  Servicios: '#f97316',
  Entretenimiento: '#a855f7',
  Educación: '#14b8a6',
  Personal: '#ec4899',
  Otros: '#94a3b8',
}

function normalizeKey(value: string): string {
  return value.trim().toUpperCase().replace(/\s+/g, ' ')
}

export function colorForPaymentType(name: string, index: number): string {
  const key = normalizeKey(name)
  for (const [label, color] of Object.entries(PAYMENT_TYPE_COLORS)) {
    if (normalizeKey(label) === key) return color
  }
  return FALLBACK_PALETTE[index % FALLBACK_PALETTE.length]
}

export function colorForCategory(name: string, index: number): string {
  const trimmed = name.trim()
  if (CATEGORY_COLORS[trimmed]) return CATEGORY_COLORS[trimmed]
  const upper = trimmed.toUpperCase()
  for (const [label, color] of Object.entries(CATEGORY_COLORS)) {
    if (label.toUpperCase() === upper) return color
  }
  return FALLBACK_PALETTE[index % FALLBACK_PALETTE.length]
}
