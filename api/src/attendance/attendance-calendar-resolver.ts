import { BadRequestException, ConflictException } from '@nestjs/common'
import type { EntityManager } from 'typeorm'
import { Employee } from '../employees/employee.entity'
import { WorkSchedule } from '../assets/assets.entities'
import { attendanceRuleDate } from './attendance-rule-history'
import { readCalendarSource } from './attendance-calendar-history'
import { parseWorkScheduleExceptions, scheduleExceptionMatches } from './work-schedule-exceptions'
import type { WorkScheduleException } from './work-schedule-exceptions'

export type CalendarDayKind = 'WORKING' | 'WEEKEND' | 'HOLIDAY'
export interface CalendarVersionRef {
  sourceType: string; sourceId: number; versionId: number | null; version: number | null
  effectiveFrom: string | null; legacyBaseline: boolean
}
export interface ResolvedCalendarDay {
  state: 'AVAILABLE' | 'MISSING' | 'INVALID'
  date: string; working: boolean | null; dayKind: CalendarDayKind | null
  branchId: number | null; country: string | null; weekendDays: string[] | null
  versionRefs: CalendarVersionRef[]; legacyFallback: boolean
  issues: Array<{ code: string; message: string }>
}
type Holiday = { id: number; name: string; date: string; endDate: string | null; country: string | null }
type Exception = { id: number; name: string; weekday: string; occurrence: string; effect: 'WORK' | 'OFF'; isActive: boolean }
type GlobalCalendar = { weekendDays: string | null; holidays: Holiday[]; exceptions: Exception[] }
type BranchCalendar = { id: number; country: string | null; weekendDays: string | null; exceptions: Exception[] }
type Version = { id: number; version: number; effectiveFrom: string | null; legacyBaseline: boolean; snapshot: Record<string, any> }
type Source = { current: Record<string, any>; currentSourceHash: string; revision: number; versions: Version[]; currentMatchesHistory?: boolean }
type Selected = { value: Record<string, any> | null; ref: CalendarVersionRef; missing: boolean; drift: boolean }
export interface CalendarResolverCache { readonly manager: EntityManager; readonly values: Map<string, Promise<any>> }
export function createCalendarResolverCache(manager: EntityManager): CalendarResolverCache { return { manager, values: new Map() } }
type Options = { strict?: boolean; cache?: CalendarResolverCache }
function memo<T>(em: EntityManager, cache: CalendarResolverCache | undefined, key: string, read: () => Promise<T>): Promise<T> {
  if (!cache) return read()
  if (cache.manager !== em) throw new Error('ذاكرة التقويم تخص دورة قراءة بمعاملة أخرى')
  if (!cache.values.has(key)) cache.values.set(key, read())
  return cache.values.get(key)!
}
const days = ['SUN', 'MON', 'TUE', 'WED', 'THU', 'FRI', 'SAT']
const idValid = (value: unknown): value is number => typeof value === 'number' && Number.isInteger(value) && value > 0 && value <= 2147483647
const invalid = (message: string): never => { throw new ConflictException({ code: 'CALENDAR_SOURCE_INVALID', message }) }
const plain = (value: unknown): value is Record<string, any> => !!value && typeof value === 'object' && !Array.isArray(value)

/** أولوية اليوم واحدة للحضور والإجازات والإضافي؛ الوردية الأسبوعية لا تبطل يوم الراحة.
 *  الترتيب: العطلة الرسمية تكسب دايمًا ← أيام راحة الجدول/الفرع/الشركة ← قواعد الشركة ← قواعد الفرع ← استثناءات جدول الموظف. */
export function evaluateCalendarDay(date: string, country: string | null, weekendDays: string[], holidays: Holiday[], globalRules: Exception[], branchRules: Exception[],
  scheduleRules: WorkScheduleException[] = []): CalendarDayKind {
  attendanceRuleDate(date)
  const normalizedCountry = String(country ?? '').trim().toUpperCase()
  if (holidays.some(holiday => (!normalizedCountry || !String(holiday.country ?? '').trim() || String(holiday.country).trim().toUpperCase() === normalizedCountry)
    && holiday.date <= date && (holiday.endDate ?? holiday.date) >= date)) return 'HOLIDAY'
  const parsed = new Date(`${date}T12:00:00Z`), weekday = days[parsed.getUTCDay()]
  const occurrence = Math.floor((parsed.getUTCDate() - 1) / 7) + 1
  const after = new Date(parsed); after.setUTCDate(parsed.getUTCDate() + 7)
  const last = after.getUTCMonth() !== parsed.getUTCMonth()
  const occurrenceIndex: Record<string, number> = { '1ST': 1, '2ND': 2, '3RD': 3, '4TH': 4 }
  let off = weekendDays.includes(weekday)
  for (const rules of [globalRules, branchRules]) for (const rule of [...rules].sort((a, b) => a.id - b.id)) {
    if (!rule.isActive || rule.weekday !== weekday || !(rule.occurrence === 'ALL' || rule.occurrence === 'LAST' && last || occurrenceIndex[rule.occurrence] === occurrence)) continue
    off = rule.effect === 'OFF'
  }
  // استثناءات جدول الموظف نفسه (قرار المالك 26 سبتمبر) — الأخص فبتيجي بعد الشركة والفرع
  for (const rule of scheduleRules) if (scheduleExceptionMatches(date, weekday, rule)) off = rule.effect === 'OFF'
  return off ? 'WEEKEND' : 'WORKING'
}

function weekend(value: unknown, allowEmpty = false): string[] {
  if (typeof value !== 'string') return invalid('أيام الراحة الأسبوعية غير موثقة أو غير صالحة')
  if (value === '' && allowEmpty) return []
  const result = value.split(',').map(day => day.trim().toUpperCase())
  if (!result.length || result.some(day => !days.includes(day)) || new Set(result).size === 7) return invalid('رموز أيام الراحة الأسبوعية غير صالحة')
  return [...new Set(result)]
}

/** القيم القديمة لا تكتسب تاريخًا من لحظة قراءتها؛ strict لا يستعملها. */
export function selectCalendarVersion(read: Source, sourceType: string, sourceId: number, date: string, strict: boolean): Selected {
  attendanceRuleDate(date)
  if (read.currentMatchesHistory === false && strict) return invalid('القيم الحالية لا تطابق آخر نسخة للتقويم؛ يلزم مراجعة المصدر قبل استخدامه المالي')
  const drift = read.currentMatchesHistory === false
  const active = read.versions.filter(row => row.effectiveFrom !== null && row.effectiveFrom <= date)
    .sort((a, b) => b.effectiveFrom!.localeCompare(a.effectiveFrom!) || b.version - a.version)[0]
  const legacy = read.versions.find(row => row.legacyBaseline && row.effectiveFrom === null)
  const chosen = active ?? (!strict ? legacy : undefined)
  const ref: CalendarVersionRef = { sourceType, sourceId, versionId: chosen?.id ?? null, version: chosen?.version ?? null,
    effectiveFrom: chosen?.effectiveFrom ?? null, legacyBaseline: chosen?.legacyBaseline ?? true }
  if (chosen) return { value: chosen.snapshot, ref, missing: false, drift }
  if (!strict && !read.versions.length) return { value: read.current, ref, missing: false, drift }
  return { value: null, ref, missing: true, drift }
}

function result(date: string): ResolvedCalendarDay {
  return { state: 'AVAILABLE', date, working: null, dayKind: null, branchId: null, country: null, weekendDays: null,
    versionRefs: [], legacyFallback: false, issues: [] }
}
function selectedValue(out: ResolvedCalendarDay, selected: Selected, label: string) {
  out.versionRefs.push(selected.ref)
  if (selected.drift) out.issues.push({ code: 'CALENDAR_CURRENT_SOURCE_DRIFT', message: 'القيم الحالية تختلف عن نسخ التقويم؛ استخدمت النسخة التاريخية ويحتاج المصدر مراجعة قبل الحساب المالي' })
  if (selected.missing) {
    out.state = 'MISSING'; out.issues.push({ code: 'CALENDAR_VERSION_MISSING', message: `لا توجد نسخة مؤرخة تثبت ${label} في ${out.date}` })
    return null
  }
  if (selected.ref.legacyBaseline) out.legacyFallback = true
  return selected.value
}
function failed(out: ResolvedCalendarDay, error: unknown, strict: boolean) {
  if (!strict) throw error
  const response = error instanceof ConflictException || error instanceof BadRequestException ? error.getResponse() : null
  if (!response) throw error
  out.state = 'INVALID'; out.working = null; out.dayKind = null
  out.issues.push({ code: typeof response === 'object' && 'code' in response ? String(response.code) : 'CALENDAR_SOURCE_INVALID',
    message: typeof response === 'object' && 'message' in response ? String(response.message) : String(response) })
  return out
}

async function branchContext(em: EntityManager, branchId: number, date: string, strict: boolean, out: ResolvedCalendarDay, cache?: CalendarResolverCache) {
  out.branchId = branchId
  const globalRead = await memo(em, cache, 'GLOBAL:0', () => readCalendarSource(em, 'GLOBAL', 0))
  const branchRead = await memo(em, cache, `BRANCH:${branchId}`, () => readCalendarSource(em, 'BRANCH', branchId))
  const globalSelected = selectCalendarVersion(globalRead as Source, 'CALENDAR_GLOBAL', 0, date, strict)
  const global = selectedValue(out, globalSelected, 'التقويم العام') as GlobalCalendar | null
  const branch = selectedValue(out, selectCalendarVersion(branchRead as Source, 'CALENDAR_BRANCH', branchId, date, strict), 'تقويم الفرع') as BranchCalendar | null
  if (!global || !branch) return null
  out.country = branch.country
  return { global, branch, globalLegacy: globalSelected.ref.legacyBaseline }
}

async function employeeWeekend(em: EntityManager, employee: Employee, date: string, strict: boolean, out: ResolvedCalendarDay, cache?: CalendarResolverCache) {
  const employeeVersions = await memo(em, cache, `EMPLOYEE_RULE:${employee.id}`, () => readAttendanceCalendarVersions(em, 'EMPLOYEE', employee.id))
  const selected = selectCalendarVersion({ current: { workScheduleId: employee.workScheduleId ?? null }, versions: employeeVersions, revision: 0, currentSourceHash: '' }, 'EMPLOYEE', employee.id, date, strict)
  const assignment = selectedValue(out, selected, 'إسناد جدول الموظف')
  if (!assignment) return { known: false, override: undefined, exceptions: [] as WorkScheduleException[] }
  if (assignment.workScheduleId === null) return { known: true, override: undefined, exceptions: [] as WorkScheduleException[] }
  if (!idValid(assignment.workScheduleId)) return invalid('مرجع جدول الموظف في النسخة غير صالح')
  const id = assignment.workScheduleId, current = await memo(em, cache, `WORK_SCHEDULE_ROW:${id}`, () => em.findOneBy(WorkSchedule, { id }))
  const versions = await memo(em, cache, `WORK_SCHEDULE_RULE:${id}`, () => readAttendanceCalendarVersions(em, 'WORK_SCHEDULE', id))
  if (!current && !versions.length) return invalid('جدول الموظف المشار إليه غير موجود')
  const schedule = selectedValue(out, selectCalendarVersion({ current: current ?? {}, versions, revision: 0, currentSourceHash: '' }, 'WORK_SCHEDULE', id, date, strict), 'أيام راحة جدول الموظف')
  if (!schedule) return { known: false, override: undefined, exceptions: [] as WorkScheduleException[] }
  return { known: true, override: weekend(schedule.weekendDays, true), exceptions: parseWorkScheduleExceptions(schedule.weekendExceptions, invalid) }
}

/** قراءة JSON الخام تمنع فساد نسخة إسناد أو جدول من المرور كقيمة افتراضية. */
async function readAttendanceCalendarVersions(em: EntityManager, sourceType: 'EMPLOYEE' | 'WORK_SCHEDULE', sourceId: number): Promise<Version[]> {
  const rows = await em.query(`SELECT TOP (5001) [id], [sourceType], [sourceId], [version], CONVERT(varchar(10), [effectiveFrom], 23) AS [effectiveFrom], [legacyBaseline], [snapshot] AS [snapshotRaw]
    FROM dbo.attendance_rule_versions WHERE [sourceType]=@0 AND [sourceId]=@1 ORDER BY [version]`, [sourceType, sourceId])
  if (rows.length > 5000) return invalid('عدد نسخ جدول الموظف يتجاوز حد القراءة')
  const ids = new Set<number>(), versions = new Set<number>()
  return rows.map((row: Record<string, any>) => {
    if (!idValid(row.id) || ids.has(row.id) || row.sourceType !== sourceType || row.sourceId !== sourceId || !Number.isInteger(row.version) || row.version < 0 || row.version > 2147483647
      || versions.has(row.version) || typeof row.legacyBaseline !== 'boolean' || (row.legacyBaseline ? row.effectiveFrom !== null || row.version !== 0 : typeof row.effectiveFrom !== 'string' || row.version < 1)) return invalid('ترويسة نسخة جدول الموظف غير صالحة أو مكررة')
    if (row.effectiveFrom !== null) attendanceRuleDate(row.effectiveFrom)
    if (typeof row.snapshotRaw !== 'string' || row.snapshotRaw.length > 100000) return invalid('دليل نسخة جدول الموظف غير صالح أو يتجاوز حد القراءة')
    let snapshot: unknown
    try { snapshot = JSON.parse(row.snapshotRaw) } catch { return invalid('JSON نسخة جدول الموظف تالف؛ لم يُستبدل بإعدادات حالية') }
    if (!plain(snapshot)) return invalid('بنية نسخة جدول الموظف غير صالحة')
    if (sourceType === 'EMPLOYEE' && !(snapshot.workScheduleId === null || idValid(snapshot.workScheduleId))) return invalid('مرجع جدول الموظف مفقود من النسخة')
    if (sourceType === 'WORK_SCHEDULE') weekend(snapshot.weekendDays, true)
    ids.add(row.id); versions.add(row.version)
    return { id: row.id, version: row.version, effectiveFrom: row.effectiveFrom, legacyBaseline: row.legacyBaseline, snapshot }
  })
}

function applyDay(out: ResolvedCalendarDay, global: GlobalCalendar, branch: BranchCalendar, override?: string[], globalLegacy = false,
  scheduleRules: WorkScheduleException[] = []) {
  const base = override ?? (branch.weekendDays ? weekend(branch.weekendDays) : global.weekendDays == null && globalLegacy ? ['FRI', 'SAT'] : weekend(global.weekendDays))
  out.weekendDays = base
  out.dayKind = evaluateCalendarDay(out.date, branch.country, base, global.holidays, global.exceptions, branch.exceptions, scheduleRules)
  out.working = out.dayKind === 'WORKING'
  return out
}

export async function resolveBranchCalendarDay(em: EntityManager, branchId: number, date: string, options: Options & { weekendOverride?: string } = {}): Promise<ResolvedCalendarDay> {
  attendanceRuleDate(date)
  if (!idValid(branchId)) throw new BadRequestException('فرع التقويم مطلوب')
  const strict = options.strict === true, out = result(date)
  try {
    const context = await branchContext(em, branchId, date, strict, out, options.cache)
    if (!context) return out
    return applyDay(out, context.global, context.branch, options.weekendOverride === undefined ? undefined : weekend(options.weekendOverride, true), context.globalLegacy)
  } catch (error) { return failed(out, error, strict) }
}

export async function resolveGlobalCalendarDay(em: EntityManager, date: string, options: Options = {}): Promise<ResolvedCalendarDay> {
  attendanceRuleDate(date)
  const strict = options.strict === true, out = result(date)
  try {
    const read = await memo(em, options.cache, 'GLOBAL:0', () => readCalendarSource(em, 'GLOBAL', 0))
    const selected = selectCalendarVersion(read as Source, 'CALENDAR_GLOBAL', 0, date, strict)
    const global = selectedValue(out, selected, 'التقويم العام') as GlobalCalendar | null
    if (!global) return out
    return applyDay(out, global, { id: 0, country: null, weekendDays: null, exceptions: [] }, undefined, selected.ref.legacyBaseline)
  } catch (error) { return failed(out, error, strict) }
}

export async function resolveEmployeeCalendarDay(em: EntityManager, employeeId: number, date: string, options: Options = {}): Promise<ResolvedCalendarDay> {
  attendanceRuleDate(date)
  if (!idValid(employeeId)) throw new BadRequestException('موظف التقويم مطلوب')
  const strict = options.strict === true, out = result(date)
  try {
    const employee = await memo(em, options.cache, `EMPLOYEE_ROW:${employeeId}`, () => em.findOneBy(Employee, { id: employeeId }))
    if (!employee) { out.state = 'MISSING'; out.issues.push({ code: 'CALENDAR_EMPLOYEE_MISSING', message: 'الموظف غير موجود' }); return out }
    const orgRead = await memo(em, options.cache, `ORG:${employeeId}`, () => readCalendarSource(em, 'EMPLOYEE', employeeId))
    const org = selectedValue(out, selectCalendarVersion(orgRead as Source, 'EMPLOYEE_ORG', employeeId, date, strict), 'فرع الموظف')
    if (!org) return out
    if (!idValid(org.branchId)) return invalid('فرع الموظف غير موثق في نسخة اليوم')
    const context = await branchContext(em, org.branchId, date, strict, out, options.cache)
    if (!context) return out
    const override = await employeeWeekend(em, employee, date, strict, out, options.cache)
    if (!override.known) return out
    return applyDay(out, context.global, context.branch, override.override, context.globalLegacy, override.exceptions)
  } catch (error) { return failed(out, error, strict) }
}
