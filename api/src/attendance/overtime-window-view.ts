import { In, type EntityManager } from 'typeorm'
import { inBranchScope, type BranchScope } from '../auth/guards'
import { OvertimePeriod } from './attendance.entities'

// عرض دليل الإضافي لقارئ (مراجعة Codex الجولة 17، CR17-B02): الدليل المخزّن بيحمل نافذة الإضافي وقت الحساب
// ({ open, governingWindowIds, reason }) — والسبب بأسماء الفترات الحاكمة، وممكن تكون فترة فرع تاني (الموظف اتنقل بعد يوم
// العمل، أو المعاينة لتاريخ قديم). الرد بيبني السبب من الفترات اللي القارئ يشوفها بس (العامة أو فرعها جوه نطاقه) ويشيل أرقام
// الباقي. اللقطة المخزّنة وبصمتها ماتتغيرش — ده عرض بس.
// ملف منفصل عن overtime-evidence.ts: الواجهة بتستورد أنواع ده، والملف ده بيستورد حراس الخادم.

type OvertimeWindowView = { open: boolean; governingWindowIds: number[]; reason: string }
type PeriodRef = Pick<OvertimePeriod, 'id' | 'name' | 'branchId'>

const HIDDEN_PERIOD = 'فترة إضافي في فرع تاني'

const isPlain = (value: unknown): value is Record<string, unknown> =>
  value !== null && typeof value === 'object' && Object.getPrototypeOf(value) === Object.prototype

const isWindow = (value: Record<string, unknown>): value is OvertimeWindowView & Record<string, unknown> =>
  typeof value.open === 'boolean' && typeof value.reason === 'string' && Array.isArray(value.governingWindowIds)

/** كل أرقام الفترات الحاكمة في أي نافذة جوه القيمة (دليل، لقطة، قايمة سجلات…). */
export function collectOvertimeWindowIds(value: unknown, into = new Set<number>()): Set<number> {
  if (Array.isArray(value)) {
    for (const item of value) collectOvertimeWindowIds(item, into)
  } else if (isPlain(value)) {
    if (isWindow(value)) {
      for (const id of value.governingWindowIds) if (Number.isSafeInteger(id) && Number(id) > 0) into.add(Number(id))
    }
    for (const item of Object.values(value)) collectOvertimeWindowIds(item, into)
  }
  return into
}

/** نسخة من القيمة بنوافذ الإضافي على قد نطاق القارئ. القيم اللي مش كائنات عادية (تواريخ، كيانات) بتعدّي زي ما هي. */
export function redactOvertimeWindows<T>(value: T, periods: ReadonlyMap<number, PeriodRef>, scope: BranchScope): T {
  const visible = (id: number) => {
    const period = periods.get(id)
    return period && (period.branchId == null || inBranchScope(scope, period.branchId)) ? period : null
  }
  const walk = (item: unknown): unknown => {
    if (Array.isArray(item)) return item.map(walk)
    if (!isPlain(item)) return item
    const copy: Record<string, unknown> = {}
    for (const [key, child] of Object.entries(item)) copy[key] = walk(child)
    if (!isWindow(item) || !item.governingWindowIds.length) return copy
    const shown = item.governingWindowIds.map(id => visible(Number(id))).filter((period): period is PeriodRef => period != null)
    const hidden = shown.length < item.governingWindowIds.length
    copy.governingWindowIds = shown.map(period => period.id)
    copy.reason = [...shown.map(period => period.name), ...(hidden ? [HIDDEN_PERIOD] : [])].join('، ')
    return copy
  }
  return walk(value) as T
}

/** محوّل جاهز: بيقرا الفترات اللي في القيم مرة واحدة ويرجّع دالة العرض لنطاق القارئ. */
export async function overtimeWindowRedactor(em: EntityManager, scope: BranchScope, values: unknown[]) {
  const ids = new Set<number>()
  for (const value of values) collectOvertimeWindowIds(value, ids)
  const rows = ids.size
    ? await em.getRepository(OvertimePeriod).find({ where: { id: In([...ids]) }, select: { id: true, name: true, branchId: true } })
    : []
  const periods = new Map(rows.map(row => [row.id, row]))
  return <T>(value: T): T => redactOvertimeWindows(value, periods, scope)
}
