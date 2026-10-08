import { Column, Entity, PrimaryGeneratedColumn, type EntityManager } from 'typeorm'
import { levelRank, skillsReady } from '../skills/skills'
import { weekAfter } from './schedule-tools'

// B5.5 (ب): فحص جدول الأسبوع — قواعد راحة وحد ساعات بشدتين (تحذير/منع)، وتغطية الوردية بمهارة وشهادة سارية. الفحص عند الطلب وعند النشر:
//  مخالفة «منع» بتوقّف النشر إلا بسبب تجاوز، وكل مخالفات النشر بتتسجّل. جوه ميزة `shifts.advanced` (مقفولة افتراضيًا). من غير قواعد معرّفة مفيش فحص.
//  أيام الراحة الأسبوعية من جدول دوام الموظف القايم (weekendDays)، ووردية اليوم الخاص بتسبق وردية الأسبوع — قراءة بس.

export const RULE_KINDS = ['MIN_REST_HOURS', 'MAX_DAY_HOURS', 'MAX_WEEK_HOURS'] as const
export type RuleKind = (typeof RULE_KINDS)[number]
export const RULE_KIND_LABELS: Record<RuleKind, string> = { MIN_REST_HOURS: 'أقل راحة بين ورديتين (ساعات)', MAX_DAY_HOURS: 'أقصى ساعات وردية اليوم', MAX_WEEK_HOURS: 'أقصى ساعات الأسبوع' }
export const SEVERITIES = ['WARN', 'BLOCK'] as const
export type Severity = (typeof SEVERITIES)[number]
export const SEVERITY_LABELS: Record<Severity, string> = { WARN: 'تحذير', BLOCK: 'منع' }
export const SCHEDULE_CHECKS_MIGRATION_MISSING = 'جداول فحص الجدول ناقصة — طبّق ترحيلات 163 و164 و165 الأول'
export const RULE_NOT_FOUND = 'القاعدة مش موجودة'
export const COVERAGE_KIND = 'SKILL_COVERAGE'

@Entity('schedule_rules')
export class ScheduleRule {
  @PrimaryGeneratedColumn({ primaryKeyConstraintName: 'PK_schedule_rules' })
  id: number

  @Column({ type: 'nvarchar', length: 20 })
  kind: string

  @Column({ type: 'decimal', precision: 6, scale: 2 })
  limitHours: number

  @Column({ type: 'nvarchar', length: 10 })
  severity: string

  /** فرع القاعدة؛ null = لكل الفروع */
  @Column({ type: 'int', nullable: true })
  branchId: number | null

  @Column({ type: 'bit' })
  isActive: boolean

  @Column({ type: 'int' })
  updatedByUserId: number

  @Column({ type: 'datetime2' })
  updatedAt: Date
}

@Entity('shift_coverage_rules')
export class ShiftCoverageRule {
  @PrimaryGeneratedColumn({ primaryKeyConstraintName: 'PK_shift_coverage_rules' })
  id: number

  @Column({ type: 'int' })
  shiftId: number

  @Column({ type: 'int' })
  skillId: number

  @Column({ type: 'nvarchar', length: 30 })
  minLevel: string

  /** أقل عدد موظفين على الوردية معاهم المهارة بالمستوى ده وشهادتها سارية */
  @Column({ type: 'int' })
  minCount: number

  @Column({ type: 'nvarchar', length: 10 })
  severity: string

  @Column({ type: 'bit' })
  isActive: boolean

  @Column({ type: 'int' })
  updatedByUserId: number

  @Column({ type: 'datetime2' })
  updatedAt: Date
}

@Entity('schedule_violations')
export class ScheduleViolation {
  @PrimaryGeneratedColumn({ primaryKeyConstraintName: 'PK_schedule_violations' })
  id: number

  /** النشر اللي المخالفة كانت موجودة وقته */
  @Column({ type: 'int' })
  publicationId: number

  @Column({ type: 'nvarchar', length: 30 })
  ruleKind: string

  @Column({ type: 'nvarchar', length: 10 })
  severity: string

  @Column({ type: 'int', nullable: true })
  employeeId: number | null

  @Column({ type: 'int', nullable: true })
  shiftId: number | null

  @Column({ type: 'nvarchar', length: 300 })
  detail: string

  /** سبب تجاوز مخالفة «منع» (اللي نشر كتبه) */
  @Column({ type: 'nvarchar', length: 300, nullable: true })
  overrideReason: string | null

  @Column({ type: 'datetime2' })
  createdAt: Date
}

const positiveId = (value: unknown): value is number => typeof value === 'number' && Number.isSafeInteger(value) && value > 0
export const isSeverity = (value: unknown): value is Severity => (SEVERITIES as readonly unknown[]).includes(value)
export const isRuleKind = (value: unknown): value is RuleKind => (RULE_KINDS as readonly unknown[]).includes(value)

export interface RuleFields { kind: RuleKind; limitHours: number; severity: Severity; branchId: number | null; isActive: boolean }
/** قاعدة: نوعها، وحدها بالساعات (لحد منزلتين)، وشدتها، وفرعها (فاضي = لكل الفروع) */
export function ruleFields(body: unknown): { fields: RuleFields | null; error: string | null } {
  const input = (body ?? {}) as Record<string, unknown>
  if (!isRuleKind(input.kind)) return { fields: null, error: 'اختار نوع القاعدة' }
  const text = typeof input.limitHours === 'number' ? String(input.limitHours) : ''
  const max = input.kind === 'MAX_WEEK_HOURS' ? 168 : 24
  if (!/^\d{1,3}(\.\d{1,2})?$/.test(text) || Number(text) <= 0 || Number(text) > max) return { fields: null, error: `الحد بالساعات رقم موجب لحد ${max} (بمنزلتين بالكتير)` }
  if (!isSeverity(input.severity)) return { fields: null, error: 'الشدة «تحذير» أو «منع»' }
  let branchId: number | null = null
  if (input.branchId !== undefined && input.branchId !== null) {
    if (!positiveId(input.branchId)) return { fields: null, error: 'الفرع مش صحيح' }
    branchId = input.branchId
  }
  if (input.isActive !== undefined && typeof input.isActive !== 'boolean') return { fields: null, error: '«مفعّلة» نعم أو لا' }
  return { fields: { kind: input.kind, limitHours: Number(text), severity: input.severity, branchId, isActive: input.isActive !== false }, error: null }
}

export interface CoverageFields { shiftId: number; skillId: number; minLevel: string; minCount: number; severity: Severity; isActive: boolean }
/** قاعدة تغطية: وردية، ومهارة بأقل مستوى، وأقل عدد، وشدة */
export function coverageFields(body: unknown): { fields: CoverageFields | null; error: string | null } {
  const input = (body ?? {}) as Record<string, unknown>
  if (!positiveId(input.shiftId)) return { fields: null, error: 'اختار الوردية' }
  if (!positiveId(input.skillId)) return { fields: null, error: 'اختار المهارة' }
  if (levelRank(input.minLevel) === 0) return { fields: null, error: 'اختار أقل مستوى للمهارة' }
  if (typeof input.minCount !== 'number' || !Number.isInteger(input.minCount) || input.minCount < 1 || input.minCount > 500) return { fields: null, error: 'أقل عدد رقم صحيح من 1 لحد 500' }
  if (!isSeverity(input.severity)) return { fields: null, error: 'الشدة «تحذير» أو «منع»' }
  if (input.isActive !== undefined && typeof input.isActive !== 'boolean') return { fields: null, error: '«مفعّلة» نعم أو لا' }
  return { fields: { shiftId: input.shiftId, skillId: input.skillId, minLevel: String(input.minLevel), minCount: input.minCount, severity: input.severity, isActive: input.isActive !== false }, error: null }
}

export interface DayShift { start: string; end: string }
const minutesOf = (time: string) => Number(time.slice(0, 2)) * 60 + Number(time.slice(3, 5))
/** مدة الوردية بالدقايق — اللي نهايتها قبل بدايتها (أو زيها) بتعدّي نص الليل */
export function shiftMinutes(shift: DayShift): number {
  const span = minutesOf(shift.end) - minutesOf(shift.start)
  return span > 0 ? span : span + 1440
}
/** الراحة بالدقايق بين نهاية وردية يوم وبداية وردية اليوم اللي بعده (سالبة = متداخلين) */
export function restMinutes(previous: DayShift, next: DayShift): number {
  return 1440 + minutesOf(next.start) - (minutesOf(previous.start) + shiftMinutes(previous))
}
const hours = (minutes: number) => (Math.round((minutes / 60) * 100) / 100).toString()

export interface CheckRule { kind: string; limitHours: number; severity: string }
export interface Violation { kind: string; severity: Severity; employeeId: number | null; shiftId: number | null; detail: string }
/**
 * مخالفات موظف في أسبوع: `days` تمن خانات — اليوم اللي قبل الأسبوع (السبت) وبعده أيام الأسبوع السبعة من الأحد؛ null = يوم راحة أو من غير وردية.
 * لكل قاعدة مخالفة واحدة بالكتير (أسوأ قيمة).
 */
export function employeeViolations(employeeId: number, days: ReadonlyArray<DayShift | null>, rules: readonly CheckRule[]): Violation[] {
  const found: Violation[] = []
  const week = days.slice(1, 8)
  for (const rule of rules) {
    if (!isSeverity(rule.severity)) continue
    const limit = Math.round(Number(rule.limitHours) * 60)
    if (rule.kind === 'MAX_DAY_HOURS') {
      const longest = Math.max(0, ...week.map((day) => (day ? shiftMinutes(day) : 0)))
      if (longest > limit) found.push({ kind: rule.kind, severity: rule.severity, employeeId, shiftId: null, detail: `وردية ${hours(longest)} ساعة — الحد ${hours(limit)}` })
    } else if (rule.kind === 'MAX_WEEK_HOURS') {
      const total = week.reduce((sum, day) => sum + (day ? shiftMinutes(day) : 0), 0)
      if (total > limit) found.push({ kind: rule.kind, severity: rule.severity, employeeId, shiftId: null, detail: `${hours(total)} ساعة في الأسبوع — الحد ${hours(limit)}` })
    } else if (rule.kind === 'MIN_REST_HOURS') {
      let least: number | null = null
      for (let index = 1; index < 8; index++) {
        const previous = days[index - 1], next = days[index]
        if (previous && next) least = least === null ? restMinutes(previous, next) : Math.min(least, restMinutes(previous, next))
      }
      if (least !== null && least < limit) found.push({ kind: rule.kind, severity: rule.severity, employeeId, shiftId: null, detail: `راحة ${hours(Math.max(0, least))} ساعة بين ورديتين — الحد ${hours(limit)}` })
    }
  }
  return found
}

let ready: boolean | null = null
/** جداول ترحيلات 163–165 موجودة؟ */
export async function scheduleChecksReady(em: EntityManager): Promise<boolean> {
  if (ready === true) return true
  const [row] = await em.query(`SELECT CASE WHEN OBJECT_ID(N'dbo.schedule_rules', N'U') IS NOT NULL AND OBJECT_ID(N'dbo.shift_coverage_rules', N'U') IS NOT NULL
    AND OBJECT_ID(N'dbo.schedule_violations', N'U') IS NOT NULL THEN 1 ELSE 0 END AS [ready]`)
  ready = Number(row?.ready) === 1
  return ready
}
/** للاختبارات: نسيان حالة الترحيل */
export function resetScheduleChecksCache() { ready = null }

const ACTIVE = `e.[isActive] = 1 AND e.[status] IN (N'active', N'probation', N'notice_period')`
const DAY_CODES = ['SUN', 'MON', 'TUE', 'WED', 'THU', 'FRI', 'SAT']
const validTime = (value: unknown): value is string => typeof value === 'string' && /^([01]\d|2[0-3]):[0-5]\d$/.test(value)

/**
 * مخالفات جدول أسبوع لفرع (موظفينه الحاليين اللي على رأس العمل ولهم وردية في الأسبوع): قواعد الفرع وقواعد «كل الفروع» المفعّلة، وقواعد
 * التغطية لو جداول المهارات موجودة. قبل ترحيلات الفحص: مفيش مخالفات. قراءة بس.
 */
export async function weekViolations(em: EntityManager, week: string, branchId: number): Promise<Violation[]> {
  if (!(await scheduleChecksReady(em))) return []
  const rules = (await em.getRepository(ScheduleRule).find({ where: { isActive: true }, order: { id: 'ASC' } })).filter((rule) => rule.branchId == null || Number(rule.branchId) === branchId)
  const coverage = await em.getRepository(ShiftCoverageRule).find({ where: { isActive: true }, order: { id: 'ASC' } })
  if (!rules.length && !coverage.length) return []
  const before = weekAfter(week, -1)
  const people: Array<{ id: number; weekendDays: string | null }> = await em.query(
    `SELECT e.[id], COALESCE(w.[weekendDays], d.[weekendDays]) AS [weekendDays] FROM dbo.employees e LEFT JOIN dbo.work_schedules w ON w.[id] = e.[workScheduleId]
       OUTER APPLY (SELECT TOP (1) x.[weekendDays] FROM dbo.work_schedules x WHERE x.[isDefault] = 1 AND x.[isActive] = 1 ORDER BY x.[id]) d
     WHERE e.[branchId] = @1 AND ${ACTIVE} AND EXISTS (SELECT 1 FROM dbo.weekly_schedule_entries s WHERE s.[employeeId] = e.[id] AND s.[weekStart] = @0) ORDER BY e.[id]`, [week, branchId])
  if (!people.length) return []
  const ids = people.map((row) => Number(row.id)), marks = ids.map((_, index) => `@${index + 2}`).join(', ')
  // الأوقات الحية من كتالوج الورديات لو الصف مربوط بوردية، وإلا اللقطة المحفوظة
  const entries: Array<{ employeeId: number; weekStart: string; shiftId: number | null; startTime: string; endTime: string }> = await em.query(
    `SELECT s.[employeeId], CONVERT(varchar(10), s.[weekStart], 23) AS [weekStart], s.[shiftId], COALESCE(c.[startTime], s.[startTime]) AS [startTime], COALESCE(c.[endTime], s.[endTime]) AS [endTime]
     FROM dbo.weekly_schedule_entries s LEFT JOIN dbo.shifts c ON c.[id] = s.[shiftId] WHERE s.[weekStart] IN (@0, @1) AND s.[employeeId] IN (${marks})`, [before, week, ...ids])
  const overrides: Array<{ employeeId: number; date: string; startTime: string; endTime: string }> = await em.query(
    `SELECT o.[employeeId], CONVERT(varchar(10), o.[date], 23) AS [date], COALESCE(c.[startTime], o.[startTime]) AS [startTime], COALESCE(c.[endTime], o.[endTime]) AS [endTime]
     FROM dbo.schedule_day_overrides o LEFT JOIN dbo.shifts c ON c.[id] = o.[shiftId] WHERE o.[date] >= @0 AND o.[date] < @1 AND o.[employeeId] IN (${marks})`, [dayAfter(week, -1), weekAfter(week, 1), ...ids])
  const found: Violation[] = []
  for (const person of people) {
    const id = Number(person.id)
    const off = new Set(String(person.weekendDays ?? '').toUpperCase().split(',').map((code) => DAY_CODES.indexOf(code.trim())).filter((index) => index >= 0))
    const days: Array<DayShift | null> = []
    // الخانة 0 = السبت اللي قبل الأسبوع؛ 1..7 = الأحد..السبت
    for (let index = 0; index < 8; index++) {
      const date = dayAfter(week, index - 1), weekday = (index + 6) % 7
      const special = overrides.find((row) => Number(row.employeeId) === id && row.date === date)
      const weekly = entries.find((row) => Number(row.employeeId) === id && row.weekStart === (index === 0 ? before : week))
      const shift = special ?? (off.has(weekday) ? null : weekly ?? null)
      days.push(shift && validTime(shift.startTime) && validTime(shift.endTime) ? { start: shift.startTime, end: shift.endTime } : null)
    }
    found.push(...employeeViolations(id, days, rules.map((rule) => ({ kind: rule.kind, limitHours: Number(rule.limitHours), severity: rule.severity }))))
  }
  if (coverage.length && (await skillsReady(em))) {
    const held: Array<{ employeeId: number; skillId: number; level: string | null; validUntil: string | null }> = await em.query(
      `SELECT [employeeId], [skillId], [level], CONVERT(varchar(10), [validUntil], 23) AS [validUntil] FROM dbo.employee_skills WHERE [skillId] IS NOT NULL AND [employeeId] IN (${ids.map((_, index) => `@${index}`).join(', ')})`, ids)
    const names = new Map<number, string>((await em.query('SELECT [id], [name] FROM dbo.skills') as Array<{ id: number; name: string }>).map((row) => [Number(row.id), row.name]))
    for (const rule of coverage) {
      if (!isSeverity(rule.severity)) continue
      const onShift = entries.filter((row) => row.weekStart === week && Number(row.shiftId) === rule.shiftId).map((row) => Number(row.employeeId))
      if (!onShift.length) continue
      // شهادة منتهية قبل بداية الأسبوع ماتتعدّش
      const qualified = onShift.filter((id) => held.some((skill) => Number(skill.employeeId) === id && Number(skill.skillId) === rule.skillId && levelRank(skill.level) >= levelRank(rule.minLevel)
        && (!skill.validUntil || skill.validUntil >= week))).length
      if (qualified < rule.minCount) {
        found.push({ kind: COVERAGE_KIND, severity: rule.severity, employeeId: null, shiftId: rule.shiftId, detail: `الوردية محتاجة ${rule.minCount} بمهارة «${names.get(rule.skillId) ?? '—'}» — الموجود ${qualified}` })
      }
    }
  }
  return found
}
/** اليوم بعد (أو قبل) n يوم */
function dayAfter(day: string, n: number): string {
  const date = new Date(`${day}T12:00:00`)
  date.setDate(date.getDate() + n)
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`
}
export const countOf = (violations: readonly Violation[], severity: Severity) => violations.filter((row) => row.severity === severity).length
