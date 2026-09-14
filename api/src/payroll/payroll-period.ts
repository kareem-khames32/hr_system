import type { EntityManager } from 'typeorm'

/**
 * الخطوة 14 / PR-08: اشتقاق فترة المسير من الشهر ويوم بداية الدورة.
 * نهاية شهر M = يوم (بداية الدورة − 1) مقصوصًا على آخر أيام M، وبداية M = نهاية M−1 + يوم.
 * بهذا تتجاور الفترات دائمًا: دورة 31 تعطي فبراير 31/1 → 28/2 ومارس 1/3 → 30/3 بلا يوم مشترك ولا فجوة.
 * دورة 23 (قاعدة الشركة) لا تتغير: «راتب سبتمبر» = 23 أغسطس → 22 سبتمبر.
 */
export class PayrollPeriodError extends Error {
  constructor(readonly code: 'PAYROLL_PERIOD_INVALID' | 'PAYROLL_CYCLE_INVALID' | 'PAYROLL_DATE_INVALID', message: string) {
    super(message)
    this.name = 'PayrollPeriodError'
  }
}

export interface PayrollPeriodBounds { startDate: string; endDate: string }
export interface PayrollPeriodRange extends PayrollPeriodBounds { period: string }
export interface PayrollPeriodIssue {
  kind: 'GAP' | 'OVERLAP'
  previousPeriod: string
  nextPeriod: string
  previousEndDate: string
  nextStartDate: string
  /** أول وآخر يوم في الفجوة أو في التداخل (شاملان). */
  from: string
  to: string
  days: number
}

const DAY_MS = 86_400_000
const leap = (year: number) => year % 4 === 0 && (year % 100 !== 0 || year % 400 === 0)
const lastDayOf = (year: number, month: number) => [31, leap(year) ? 29 : 28, 31, 30, 31, 30, 31, 31, 30, 31, 30, 31][month - 1]
const iso = (year: number, month: number, day: number) =>
  `${String(year).padStart(4, '0')}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`

function parsePeriod(period: unknown): { year: number; month: number } {
  if (typeof period !== 'string' || !/^\d{4}-(0[1-9]|1[0-2])$/.test(period) || period.startsWith('0000-')) {
    throw new PayrollPeriodError('PAYROLL_PERIOD_INVALID', 'صيغة شهر المسير YYYY-MM')
  }
  return { year: Number(period.slice(0, 4)), month: Number(period.slice(5, 7)) }
}

function assertCycle(cycleStartDay: unknown): asserts cycleStartDay is number {
  if (typeof cycleStartDay !== 'number' || !Number.isInteger(cycleStartDay) || cycleStartDay < 1 || cycleStartDay > 31) {
    throw new PayrollPeriodError('PAYROLL_CYCLE_INVALID', 'يوم بداية دورة الرواتب يجب أن يكون من 1 إلى 31')
  }
}

function parseDate(value: unknown): { year: number; month: number; day: number } {
  if (typeof value !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(value)) throw new PayrollPeriodError('PAYROLL_DATE_INVALID', 'التاريخ يجب أن يكون بصيغة YYYY-MM-DD')
  const year = Number(value.slice(0, 4)), month = Number(value.slice(5, 7)), day = Number(value.slice(8, 10))
  if (year < 1 || month < 1 || month > 12 || day < 1 || day > lastDayOf(year, month)) {
    throw new PayrollPeriodError('PAYROLL_DATE_INVALID', 'التاريخ غير موجود في التقويم')
  }
  return { year, month, day }
}

/** يوم نهاية دورة شهر معين (داخل الشهر نفسه دائمًا). */
export function payrollCycleEndDay(year: number, month: number, cycleStartDay: number): number {
  assertCycle(cycleStartDay)
  const last = lastDayOf(year, month)
  return cycleStartDay === 1 ? last : Math.min(cycleStartDay - 1, last)
}

export function addPayrollDays(date: string, days: number): string {
  const { year, month, day } = parseDate(date)
  // setUTCFullYear لا يحوّل السنوات 0–99 إلى 1900+ كما يفعل Date.UTC.
  const base = new Date(0)
  base.setUTCFullYear(year, month - 1, day)
  base.setUTCHours(12, 0, 0, 0)
  const moved = new Date(base.getTime() + days * DAY_MS)
  return iso(moved.getUTCFullYear(), moved.getUTCMonth() + 1, moved.getUTCDate())
}

export function shiftPayrollPeriod(period: string, months: number): string {
  const { year, month } = parsePeriod(period)
  const index = year * 12 + (month - 1) + months
  const nextYear = Math.floor(index / 12), nextMonth = index - nextYear * 12 + 1
  if (nextYear < 1 || nextYear > 9999) throw new PayrollPeriodError('PAYROLL_PERIOD_INVALID', 'شهر المسير خارج نطاق التاريخ المدعوم')
  return `${String(nextYear).padStart(4, '0')}-${String(nextMonth).padStart(2, '0')}`
}

/** حدود فترة شهر مسير: البداية = نهاية الشهر السابق + يوم، والنهاية داخل الشهر نفسه. */
export function payrollPeriodBounds(period: string, cycleStartDay: number): PayrollPeriodBounds {
  const { year, month } = parsePeriod(period)
  assertCycle(cycleStartDay)
  const endDate = iso(year, month, payrollCycleEndDay(year, month, cycleStartDay))
  if (cycleStartDay === 1) return { startDate: iso(year, month, 1), endDate }
  const previousYear = month === 1 ? year - 1 : year, previousMonth = month === 1 ? 12 : month - 1
  if (previousYear < 1) throw new PayrollPeriodError('PAYROLL_PERIOD_INVALID', 'بداية الدورة تقع خارج نطاق التاريخ المدعوم')
  const previousEnd = payrollCycleEndDay(previousYear, previousMonth, cycleStartDay)
  const startDate = previousEnd === lastDayOf(previousYear, previousMonth)
    ? iso(year, month, 1)
    : iso(previousYear, previousMonth, previousEnd + 1)
  return { startDate, endDate }
}

/** شهر المسير الذي يقع فيه يوم معين (مثلًا يوم عمل الإضافي) وفق الدورة نفسها. */
export function payrollPeriodOfDate(date: string, cycleStartDay: number): string {
  const { year, month, day } = parseDate(date)
  assertCycle(cycleStartDay)
  const own = `${String(year).padStart(4, '0')}-${String(month).padStart(2, '0')}`
  return day <= payrollCycleEndDay(year, month, cycleStartDay) ? own : shiftPayrollPeriod(own, 1)
}

/**
 * دورة نسخة السياسة كاملة (الخطوة 15): نوع الفترة ووضع النهاية ويومها.
 * الفترات الشهرية المتجاورة يحددها يوم البداية وحده؛ لذلك «يوم نهاية ثابت» مقبول فقط إذا كان اليوم السابق للبداية
 * (أو 31 = آخر الشهر لبداية 1) ويُقص على آخر الشهر القصير بالقاعدة نفسها. أي يوم آخر يترك أيامًا بلا مسير أو يكرر يومًا في مسيرين.
 */
export interface PayrollCycleSettings {
  defaultPeriodType: 'CALENDAR_MONTH' | 'CUSTOM_DAY_RANGE' | 'SEMI_MONTHLY'
  cycleStartDay: number
  cycleEndMode: 'DERIVED' | 'FIXED_DAY'
  cycleEndDay: number | null
}

/** يوم النهاية الوحيد الذي يصنع فترات متصلة لبداية معينة (قبل القص على آخر الشهر). */
export function payrollCycleExpectedEndDay(cycleStartDay: number): number {
  assertCycle(cycleStartDay)
  return cycleStartDay === 1 ? 31 : cycleStartDay - 1
}

/** سبب رفض دورة لا تنتج فترات شهرية متجاورة، أو null إن كانت صالحة. */
export function payrollCycleSettingsIssue(cycle: PayrollCycleSettings): string | null {
  if (!['CALENDAR_MONTH', 'CUSTOM_DAY_RANGE', 'SEMI_MONTHLY'].includes(cycle.defaultPeriodType)) return 'نوع فترة المسير غير مدعوم'
  if (typeof cycle.cycleStartDay !== 'number' || !Number.isInteger(cycle.cycleStartDay) || cycle.cycleStartDay < 1 || cycle.cycleStartDay > 31) return 'يوم بداية دورة الرواتب يجب أن يكون من 1 إلى 31'
  if (cycle.defaultPeriodType !== 'CUSTOM_DAY_RANGE') {
    return cycle.cycleStartDay === 1 && cycle.cycleEndMode === 'DERIVED' && cycle.cycleEndDay === null ? null
      : 'الشهر التقويمي ونصف الشهر يتطلبان بداية 1 ونهاية مشتقة دون يوم نهاية ثابت'
  }
  if (cycle.cycleEndMode === 'DERIVED') return cycle.cycleEndDay === null ? null : 'النهاية المشتقة لا تقبل يوم نهاية ثابتًا'
  if (cycle.cycleEndMode !== 'FIXED_DAY') return 'وضع نهاية الدورة غير مدعوم'
  const expected = payrollCycleExpectedEndDay(cycle.cycleStartDay)
  if (cycle.cycleEndDay === expected) return null
  if (cycle.cycleEndDay === null) return `النهاية بيوم ثابت تتطلب يوم النهاية ${expected} (اليوم السابق لبداية الدورة ${cycle.cycleStartDay})`
  return `يوم نهاية الدورة ${cycle.cycleEndDay} لا يصنع فترات متصلة مع بداية ${cycle.cycleStartDay}: الفترة الشهرية تنتهي في اليوم ${expected}` +
    ' (اليوم السابق لبدايتها، ويُقص على آخر الشهر القصير)؛ أي يوم آخر يترك أيامًا بلا مسير أو يكرر يومًا في مسيرين'
}

/** فترات شهر مسير وفق دورة السياسة كاملة؛ الشهري فترة واحدة ونصف الشهر فترتان. ترفض الدورة غير المتصلة. */
export function payrollPolicyPeriodRanges(period: string, cycle: PayrollCycleSettings): PayrollPeriodBounds[] {
  const issue = payrollCycleSettingsIssue(cycle)
  if (issue) throw new PayrollPeriodError('PAYROLL_CYCLE_INVALID', issue)
  const { year, month } = parsePeriod(period)
  if (cycle.defaultPeriodType === 'SEMI_MONTHLY') {
    return [{ startDate: iso(year, month, 1), endDate: iso(year, month, 15) }, { startDate: iso(year, month, 16), endDate: iso(year, month, lastDayOf(year, month)) }]
  }
  // FIXED_DAY الصالح = اليوم السابق للبداية، فحدوده هي حدود الاشتقاق نفسها (ومنها قص 29/30/31).
  return [payrollPeriodBounds(period, cycle.defaultPeriodType === 'CALENDAR_MONTH' ? 1 : cycle.cycleStartDay)]
}

/** حدود فترة شهر مسير لدورة شهرية؛ هذا ما تستخدمه المسيرات المرتبطة بنسخة سياسة. */
export function payrollPolicyPeriodBounds(period: string, cycle: PayrollCycleSettings): PayrollPeriodBounds {
  if (cycle.defaultPeriodType === 'SEMI_MONTHLY') throw new PayrollPeriodError('PAYROLL_CYCLE_INVALID', 'دورة نصف الشهر لها فترتان في الشهر؛ استخدم payrollPolicyPeriodRanges')
  return payrollPolicyPeriodRanges(period, cycle)[0]
}

/** شهر المسير الذي يقع فيه يوم معين وفق دورة السياسة الشهرية. */
export function payrollPolicyPeriodOfDate(date: string, cycle: PayrollCycleSettings): string {
  const issue = payrollCycleSettingsIssue(cycle)
  if (issue) throw new PayrollPeriodError('PAYROLL_CYCLE_INVALID', issue)
  if (cycle.defaultPeriodType === 'SEMI_MONTHLY') throw new PayrollPeriodError('PAYROLL_CYCLE_INVALID', 'دورة نصف الشهر لها فترتان في الشهر')
  return payrollPeriodOfDate(date, cycle.defaultPeriodType === 'CALENDAR_MONTH' ? 1 : cycle.cycleStartDay)
}

const daysBetween = (from: string, to: string) => {
  const a = parseDate(from), b = parseDate(to)
  return Math.round((Date.UTC(b.year, b.month - 1, b.day) - Date.UTC(a.year, a.month - 1, a.day)) / DAY_MS) + 1
}

/**
 * كشف الفجوات والتداخلات بين فترات مسير: أي تداخل تاريخي بين شهرين مختلفين، أو شهر نفسه بحدود مختلفة،
 * وأي فجوة بين شهرين متتاليين (الشهر الغائب كليًا ليس فجوة اشتقاق؛ يغطيه تقرير «بلا مسير»).
 */
export function payrollPeriodSequenceIssues(ranges: PayrollPeriodRange[]): PayrollPeriodIssue[] {
  const rows = ranges.map(range => {
    parsePeriod(range.period); parseDate(range.startDate); parseDate(range.endDate)
    if (range.endDate < range.startDate) throw new PayrollPeriodError('PAYROLL_DATE_INVALID', `نهاية فترة ${range.period} تسبق بدايتها`)
    return { ...range }
  })
  const unique = [...new Map(rows.map(row => [`${row.period}|${row.startDate}|${row.endDate}`, row])).values()]
    .sort((a, b) => a.startDate.localeCompare(b.startDate) || a.period.localeCompare(b.period) || a.endDate.localeCompare(b.endDate))
  const issues: PayrollPeriodIssue[] = []
  for (let i = 0; i < unique.length; i++) {
    for (let j = i + 1; j < unique.length; j++) {
      const previous = unique[i], next = unique[j]
      if (next.startDate > previous.endDate) break
      const to = next.endDate < previous.endDate ? next.endDate : previous.endDate
      issues.push({ kind: 'OVERLAP', previousPeriod: previous.period, nextPeriod: next.period, previousEndDate: previous.endDate,
        nextStartDate: next.startDate, from: next.startDate, to, days: daysBetween(next.startDate, to) })
    }
  }
  const byPeriod = [...unique].sort((a, b) => a.period.localeCompare(b.period) || a.startDate.localeCompare(b.startDate))
  for (let i = 0; i < byPeriod.length; i++) {
    for (let j = i + 1; j < byPeriod.length; j++) {
      const previous = byPeriod[i], next = byPeriod[j]
      if (next.period !== shiftPayrollPeriod(previous.period, 1)) continue
      const expectedStart = addPayrollDays(previous.endDate, 1)
      if (next.startDate > expectedStart) {
        const to = addPayrollDays(next.startDate, -1)
        issues.push({ kind: 'GAP', previousPeriod: previous.period, nextPeriod: next.period, previousEndDate: previous.endDate,
          nextStartDate: next.startDate, from: expectedStart, to, days: daysBetween(expectedStart, to) })
      }
    }
  }
  return issues.sort((a, b) => a.from.localeCompare(b.from) || a.kind.localeCompare(b.kind))
}

export interface PayrollPeriodContinuityIssue extends PayrollPeriodIssue {
  otherRunId: number
  otherRunName: string | null
  otherStatus: string
  employeeIds: number[]
}

const ID_CHUNK = 500

/**
 * قراءة فقط: فجوات/تداخلات فترة المسير مع مسيرات الشهر السابق والتالي لنفس الموظفين
 * (عضوية INCLUDED أو بند أو حجز نشط). تُعرض على المسير ولا تغيّر شيئًا.
 */
export async function findPayrollPeriodContinuity(em: EntityManager, run: PayrollPeriodRange & { id?: number | null },
  employeeIds: number[]): Promise<PayrollPeriodContinuityIssue[]> {
  const ids = [...new Set(employeeIds)].filter(id => Number.isInteger(id) && id > 0).sort((a, b) => a - b)
  if (!ids.length) return []
  const neighbours = [shiftPayrollPeriod(run.period, -1), shiftPayrollPeriod(run.period, 1)]
  const found = new Map<string, PayrollPeriodContinuityIssue>()
  for (let offset = 0; offset < ids.length; offset += ID_CHUNK) {
    const chunk = ids.slice(offset, offset + ID_CHUNK)
    const params = [run.id ?? 0, neighbours[0], neighbours[1], ...chunk]
    const list = chunk.map((_, index) => `@${index + 3}`).join(', ')
    const rows: Array<{ employeeId: number; runId: number; name: string | null; status: string; period: string; startDate: string; endDate: string }> = await em.query(`
      SELECT DISTINCT member.[employeeId], r.[id] AS [runId], r.[name], r.[status], r.[period],
        CONVERT(varchar(10), r.[startDate], 23) AS [startDate], CONVERT(varchar(10), r.[endDate], 23) AS [endDate]
      FROM [payroll_runs] r
      INNER JOIN (
        SELECT [employeeId], [runId] FROM [payroll_run_members]
        WHERE ([membershipStatus] = 'INCLUDED' OR [membershipStatus] IS NULL) AND [employeeId] IN (${list})
        UNION
        SELECT [employeeId], [runId] FROM [payroll_items] WHERE [employeeId] IN (${list})
        UNION
        SELECT [employeeId], [runId] FROM [payroll_period_claims] WHERE [releasedAt] IS NULL AND [employeeId] IN (${list})
      ) member ON member.[runId] = r.[id]
      WHERE r.[id] <> @0 AND r.[period] IN (@1, @2) AND r.[status] IN ('CALCULATED', 'IN_REVIEW', 'APPROVED', 'PAID')`, params)
    for (const row of rows) {
      const other = { period: String(row.period), startDate: String(row.startDate), endDate: String(row.endDate) }
      for (const issue of payrollPeriodSequenceIssues([{ period: run.period, startDate: run.startDate, endDate: run.endDate }, other])) {
        const key = `${row.runId}|${issue.kind}|${issue.from}|${issue.to}`
        const current = found.get(key)
        if (current) { if (!current.employeeIds.includes(Number(row.employeeId))) current.employeeIds.push(Number(row.employeeId)) }
        else found.set(key, { ...issue, otherRunId: Number(row.runId), otherRunName: row.name ?? null, otherStatus: String(row.status), employeeIds: [Number(row.employeeId)] })
      }
    }
  }
  return [...found.values()].map(issue => ({ ...issue, employeeIds: issue.employeeIds.sort((a, b) => a - b) }))
    .sort((a, b) => a.from.localeCompare(b.from) || a.otherRunId - b.otherRunId)
}
