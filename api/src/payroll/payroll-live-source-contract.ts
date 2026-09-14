import { BadRequestException, ConflictException } from '@nestjs/common'
import { createHash } from 'node:crypto'

export const PAYROLL_LIVE_SOURCE_VERSION = 'SRS_LIVE_SOURCE_READ_V4_20260914' as const
export const PAYROLL_LIVE_SOURCE_ROW_LIMIT = 5000
export type PayrollLiveSourceState = 'AVAILABLE' | 'MISSING' | 'UNSUPPORTED' | 'INVALID'
export interface PayrollLiveSourceIssue { code: string; message: string; sourceRef?: string }
/** AVAILABLE describes a readable source group, never an entitlement or approval decision. */
export interface PayrollLiveSourceSection<T = unknown> {
  state: PayrollLiveSourceState
  data: T
  issues: PayrollLiveSourceIssue[]
  sourceRefs: string[]
}

export function payrollLiveSourcePeriod(start: unknown, end: unknown) {
  const validDate = (value: unknown): value is string => typeof value === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(value) && !value.startsWith('0000-') &&
    Number.isFinite(Date.parse(value + 'T00:00:00Z')) && new Date(value + 'T00:00:00Z').toISOString().slice(0, 10) === value
  if (!validDate(start) || !validDate(end) || end < start) throw new BadRequestException({ code: 'LIVE_SOURCE_PERIOD_INVALID', message: 'حدد بداية ونهاية صحيحتين لفترة القراءة' })
  const days = (Date.parse(end) - Date.parse(start)) / 86400000 + 1
  if (days > 32) throw new BadRequestException({ code: 'LIVE_SOURCE_PERIOD_LIMIT', message: 'قراءة مصادر السياسة تدعم فترة واحدة لا تتجاوز32يومًا' })
  return { startDate: start, endDate: end, periodDays: days, periodKey: end.slice(0, 7) }
}

/** Canonical content hash excludes capture time but rejects lossy JSON instead of changing evidence. */
export function payrollLiveSourceContent<T>(input: T): { snapshot: T; contentHash: string } {
  let nodes = 0
  const canonical = (value: any, depth = 0): any => {
    if (++nodes > 500000 || depth > 32) throw new ConflictException({ code: 'LIVE_SOURCE_CONTENT_LIMIT', message: 'حجم تفاصيل المصدر يتجاوز حد القراءة؛ راجع المصدر المحدد' })
    if (value === null || typeof value === 'boolean' || typeof value === 'string') return value
    if (typeof value === 'number' && Number.isFinite(value) && (!Number.isInteger(value) || Number.isSafeInteger(value))) return value
    if (value instanceof Date && Number.isFinite(value.getTime())) return value.toISOString()
    if (Array.isArray(value)) return value.map(child => canonical(child, depth + 1))
    if (value && typeof value === 'object' && [Object.prototype, null].includes(Object.getPrototypeOf(value))) {
      return Object.fromEntries(Object.keys(value).sort().map(key => [key, canonical(value[key], depth + 1)]))
    }
    throw new ConflictException({ code: 'LIVE_SOURCE_CONTENT_INVALID', message: 'أحد المصادر لا يمكن تثبيته دون فقد بيانات؛ يلزم مراجعته' })
  }
  const snapshot = canonical(input)
  const text = JSON.stringify(snapshot)
  if (Buffer.byteLength(text, 'utf8') > 20000000) throw new ConflictException({ code: 'LIVE_SOURCE_CONTENT_LIMIT', message: 'تفاصيل المصادر أكبر من حد القراءة المتاح' })
  return { snapshot, contentHash: createHash('sha256').update(text).digest('hex') }
}
