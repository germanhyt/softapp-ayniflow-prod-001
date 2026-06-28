export const APP_NAME = 'AyniFlow'

const configuredApiBase = (import.meta.env.VITE_API_BASE_URL ?? 'http://localhost:8000').trim()

/** En producción con nginx, dejar vacío para usar el mismo origen. */
export const API_BASE_URL = configuredApiBase

export function getFinanceWsUrl(token: string): string {
  if (!configuredApiBase) {
    const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:'
    return `${protocol}//${window.location.host}/finance/ws?token=${encodeURIComponent(token)}`
  }

  const base = configuredApiBase.replace(/^http:\/\//, 'ws://').replace(/^https:\/\//, 'wss://')
  return `${base}/finance/ws?token=${encodeURIComponent(token)}`
}
