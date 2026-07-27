import { API_BASE_URL } from '../constants/app'

export function resolveMediaUrl(path?: string | null): string | null {
  if (!path) return null
  if (path.startsWith('http://') || path.startsWith('https://') || path.startsWith('data:')) {
    return path
  }
  if (path.startsWith('/')) {
    return API_BASE_URL ? `${API_BASE_URL}${path}` : path
  }
  return API_BASE_URL ? `${API_BASE_URL}/${path}` : `/${path}`
}

export function profileInitials(
  fullName: string | null | undefined,
  username: string | undefined,
): string {
  const source = (fullName?.trim() || username || '?').trim()
  const parts = source.split(/\s+/).filter(Boolean)
  if (parts.length >= 2) {
    return `${parts[0][0]}${parts[1][0]}`.toUpperCase()
  }
  return source.slice(0, 2).toUpperCase()
}
