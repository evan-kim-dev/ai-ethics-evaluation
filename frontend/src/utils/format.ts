export function formatDateTime(value: string): string {
  const date = parseApiDate(value)
  if (Number.isNaN(date.getTime())) {
    return value
  }
  return new Intl.DateTimeFormat('ko-KR', {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    timeZone: 'Asia/Seoul',
  }).format(date)
}

/** API가 timezone 없는 UTC ISO를 줄 때 로컬 오전으로 오인되지 않게 보정 */
export function parseApiDate(value: string): Date {
  const trimmed = value.trim()
  if (!trimmed) return new Date(Number.NaN)
  if (/[zZ]|[+-]\d{2}:?\d{2}$/.test(trimmed)) {
    return new Date(trimmed)
  }
  return new Date(`${trimmed}Z`)
}
