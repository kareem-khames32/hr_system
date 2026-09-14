export type CalendarView = 'month' | 'week'

export const localDateKey = (date: Date) => `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`
export function parseLocalDate(value: string) {
  const [year, month, day] = value.slice(0, 10).split('-').map(Number)
  return new Date(year, month - 1, day)
}
export const addLocalDays = (date: Date, days: number) => new Date(date.getFullYear(), date.getMonth(), date.getDate() + days)

export function calendarRange(anchor: Date, view: CalendarView) {
  const start = view === 'week' ? addLocalDays(anchor, -anchor.getDay()) : new Date(anchor.getFullYear(), anchor.getMonth(), 1)
  const end = view === 'week' ? addLocalDays(start, 6) : new Date(anchor.getFullYear(), anchor.getMonth() + 1, 0)
  const gridStart = view === 'week' ? start : addLocalDays(start, -start.getDay())
  const days = Array.from({ length: view === 'week' ? 7 : 42 }, (_, index) => addLocalDays(gridStart, index))
  const months: string[] = []
  for (let cursor = new Date(start.getFullYear(), start.getMonth(), 1); cursor <= end; cursor = new Date(cursor.getFullYear(), cursor.getMonth() + 1, 1)) months.push(localDateKey(cursor).slice(0, 7))
  return { from: localDateKey(start), to: localDateKey(end), days, months }
}

export function intersectDateRange(from: string, to: string, visibleFrom: string, visibleTo: string) {
  const start = from > visibleFrom ? from : visibleFrom
  const end = to < visibleTo ? to : visibleTo
  return start <= end ? { from: start, to: end } : null
}
