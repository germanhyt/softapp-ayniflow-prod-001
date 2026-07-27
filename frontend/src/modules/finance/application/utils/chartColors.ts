const FALLBACK_PALETTE = [
  'var(--premium-primary)',
  'var(--premium-accent)',
  '#6b7c5c',
  '#4a8f6a',
  '#5a7d9a',
  '#b07d3a',
  '#7a6b9a',
  '#3d8a8a',
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

/** Colores por categoría — tonos suaves compatibles con olive AyniFlow */
export const CATEGORY_COLORS: Record<string, string> = {
  Vivienda: '#6b7c5c',
  Alimentación: '#4a8f6a',
  Transporte: '#5a7d9a',
  Salud: '#c45c4a',
  Servicios: '#b07d3a',
  Entretenimiento: '#7a6b9a',
  Educación: '#3d8a8a',
  Personal: '#9a6b7c',
  Otros: '#7a8270',
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
