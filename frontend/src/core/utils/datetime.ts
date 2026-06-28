import { APP_LOCALE, APP_TIMEZONE } from '../constants/datetime'

type ZonedParts = {
  year: string
  month: string
  day: string
  hour: string
  minute: string
  second: string
  weekday: string
}

function getZonedParts(date: Date, timeZone = APP_TIMEZONE): ZonedParts {
  const parts = Object.fromEntries(
    new Intl.DateTimeFormat('en-US', {
      timeZone,
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
      weekday: 'short',
      hour12: false,
    })
      .formatToParts(date)
      .filter((part) => part.type !== 'literal')
      .map((part) => [part.type, part.value]),
  ) as ZonedParts

  return parts
}

/** yyyy-MM-dd en America/Lima */
export function todayIsoDate(): string {
  return new Intl.DateTimeFormat('en-CA', { timeZone: APP_TIMEZONE }).format(new Date())
}

/** yyyy-MM en America/Lima */
export function currentMonthYear(): string {
  const parts = getZonedParts(new Date())
  return `${parts.year}-${parts.month}`
}

/** Primer día del mes actual en America/Lima */
export function firstDayOfMonthIsoDate(): string {
  const parts = getZonedParts(new Date())
  return `${parts.year}-${parts.month}-01`
}

export function addDaysToIsoDate(isoDate: string, days: number): string {
  const [year, month, day] = isoDate.split('-').map(Number)
  const anchor = new Date(Date.UTC(year, month - 1, day + days, 12))
  return new Intl.DateTimeFormat('en-CA', { timeZone: APP_TIMEZONE }).format(anchor)
}

export function daysAgoIsoDate(days: number): string {
  return addDaysToIsoDate(todayIsoDate(), -days)
}

/** Lunes de la semana actual en America/Lima */
export function startOfWeekIsoDate(): string {
  const today = todayIsoDate()
  const weekday = getZonedParts(new Date()).weekday.slice(0, 3)
  const weekdayIndex: Record<string, number> = {
    Mon: 0,
    Tue: 1,
    Wed: 2,
    Thu: 3,
    Fri: 4,
    Sat: 5,
    Sun: 6,
  }
  const index = weekdayIndex[weekday] ?? 0
  return addDaysToIsoDate(today, -index)
}

export function currentHourInLima(): number {
  return Number(getZonedParts(new Date()).hour)
}

/** HH:mm:ss en America/Lima */
export function currentTimeInLima(): string {
  const parts = getZonedParts(new Date())
  return `${parts.hour}:${parts.minute}:${parts.second}`
}

export function parseInstant(value: string): Date | null {
  const date = new Date(value)
  return Number.isNaN(date.getTime()) ? null : date
}

export function formatDateTime(
  value?: string | null,
  options?: { includeSeconds?: boolean; fallback?: string },
): string {
  const fallback = options?.fallback ?? '—'
  if (!value?.trim()) return fallback
  const date = parseInstant(value)
  if (!date) return value
  return new Intl.DateTimeFormat(APP_LOCALE, {
    timeZone: APP_TIMEZONE,
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
    ...(options?.includeSeconds ? { second: '2-digit' as const } : {}),
    hour12: false,
  }).format(date)
}

/** Fecha y hora de registro (sin segundos). */
export function formatRegisteredAt(value?: string | null): string {
  return formatDateTime(value)
}

/** Fecha y hora con segundos (auditoría, polling, etc.). */
export function formatDateTimeWithSeconds(value?: string | null, fallback = '—'): string {
  return formatDateTime(value, { includeSeconds: true, fallback })
}

/** Solo fecha en America/Lima */
export function formatDate(value?: string | null): string {
  if (!value?.trim()) return '—'
  const date = parseInstant(value)
  if (!date) return value
  return new Intl.DateTimeFormat(APP_LOCALE, {
    timeZone: APP_TIMEZONE,
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
  }).format(date)
}
