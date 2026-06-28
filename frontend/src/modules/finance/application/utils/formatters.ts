import {
  addDaysToIsoDate,
  currentHourInLima,
  currentMonthYear,
  currentTimeInLima,
  daysAgoIsoDate,
  firstDayOfMonthIsoDate,
  formatDate,
  formatDateTime,
  formatDateTimeWithSeconds,
  formatRegisteredAt,
  startOfWeekIsoDate,
  todayIsoDate,
} from '../../../../core/utils/datetime'

export {
  addDaysToIsoDate,
  currentHourInLima,
  currentMonthYear,
  currentTimeInLima,
  daysAgoIsoDate,
  firstDayOfMonthIsoDate,
  formatDate,
  formatDateTime,
  formatDateTimeWithSeconds,
  formatRegisteredAt,
  startOfWeekIsoDate,
  todayIsoDate,
}

export function formatCurrency(value: string | number): string {
  const amount = typeof value === 'string' ? Number(value) : value
  return new Intl.NumberFormat('es-PE', {
    style: 'currency',
    currency: 'PEN',
  }).format(amount)
}

export function formatNotesPreview(value?: string | null, max = 40): string {
  if (!value?.trim()) return '—'
  return value.length > max ? `${value.slice(0, max)}…` : value
}
