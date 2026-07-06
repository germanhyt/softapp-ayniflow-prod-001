export function ensureArray<T>(value: T[] | null | undefined | unknown): T[] {
  return Array.isArray(value) ? (value as T[]) : []
}
