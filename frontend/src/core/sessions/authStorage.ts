const TOKEN_KEY = 'ayniflow_access_token'
const LEGACY_TOKEN_KEY = 'germanhyt_access_token'

export function getAccessToken(): string | null {
  const current = localStorage.getItem(TOKEN_KEY)
  if (current) return current
  const legacy = localStorage.getItem(LEGACY_TOKEN_KEY)
  if (legacy) {
    localStorage.setItem(TOKEN_KEY, legacy)
    localStorage.removeItem(LEGACY_TOKEN_KEY)
  }
  return legacy
}

export function setAccessToken(token: string): void {
  localStorage.setItem(TOKEN_KEY, token)
}

export function clearAccessToken(): void {
  localStorage.removeItem(TOKEN_KEY)
  localStorage.removeItem(LEGACY_TOKEN_KEY)
}

export function isAuthenticated(): boolean {
  return Boolean(getAccessToken())
}
