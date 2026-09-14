import { BadRequestException, ConflictException, ForbiddenException, NotFoundException } from '@nestjs/common'
import { IsInt, IsString, Matches, MaxLength, Min, MinLength } from 'class-validator'
import { EntityManager, IsNull } from 'typeorm'
import { PublicHoliday } from '../assets/assets.entities'
import { JwtPayload } from '../auth/auth.service'
import { branchScopeOf, userHasPerm } from '../auth/guards'
import { Employee } from '../employees/employee.entity'
import { Branch } from '../org/entities/branch.entity'
import { payrollLiveSourceContent } from '../payroll/payroll-live-source-contract'
import { RequestsConfig } from '../requests/entities/requests-config.entity'
import { AttendanceRuleSourceType, AttendanceRuleVersion } from './attendance-rule.entities'
import { assertAttendanceRulePeriodOpen, attendanceRuleDate, lockAttendanceRuleMutation } from './attendance-rule-history'
import { ScheduleExceptionRule } from './attendance.entities'
import { normalizeWeekendDays, weekendDaysError } from './weekend-days'

export type CalendarScope = 'GLOBAL' | 'BRANCH' | 'EMPLOYEE'
export const CALENDAR_SCHEMA_VERSION = 1
export class CalendarChangeDto {
  @Matches(/^\d{4}-\d{2}-\d{2}$/) effectiveFrom: string
  @IsString() @MinLength(3) @MaxLength(500) reason: string
  @IsInt() @Min(0) expectedRevision: number
  @Matches(/^[a-f0-9]{64}$/) expectedCurrentSourceHash: string
}
export interface CalendarException { id: number; name: string; weekday: string; occurrence: string; effect: string; isActive: boolean }
export interface CalendarHoliday { id: number; name: string; date: string; endDate: string | null; country: string | null }
export interface GlobalCalendarSnapshot { weekendDays: string | null; holidays: CalendarHoliday[]; exceptions: CalendarException[] }
export interface BranchCalendarSnapshot { id: number; country: string | null; weekendDays: string | null; exceptions: CalendarException[] }
export interface EmployeeOrgCalendarSnapshot { branchId: number | null }
export type CalendarSnapshot = GlobalCalendarSnapshot | BranchCalendarSnapshot | EmployeeOrgCalendarSnapshot
export interface CalendarSourceRead {
  scope: CalendarScope; sourceId: number; current: CalendarSnapshot; currentSourceHash: string; revision: number
  currentMatchesHistory: boolean
  versions: Array<{ id: number; version: number; effectiveFrom: string | null; legacyBaseline: boolean; snapshot: CalendarSnapshot }>
}
const SOURCE: Record<CalendarScope, AttendanceRuleSourceType> = { GLOBAL: 'CALENDAR_GLOBAL', BRANCH: 'CALENDAR_BRANCH', EMPLOYEE: 'EMPLOYEE_ORG' }
const LIMIT = 5000
function fail(code: string, message: string): never { throw new ConflictException({ code, message }) }
function identity(scope: CalendarScope, sourceId: number) {
  if (!Object.prototype.hasOwnProperty.call(SOURCE, scope) || !Number.isSafeInteger(sourceId) || sourceId > 2147483647 || (scope === 'GLOBAL' ? sourceId !== 0 : sourceId < 1)) {
    throw new BadRequestException('نطاق مصدر التقويم أو رقمه غير صالح')
  }
}
function transaction(em: EntityManager) {
  if (!em.queryRunner?.isTransactionActive) throw new Error('Calendar mutation requires a transaction and attendance/employee finance locks')
}
function exact(value: any, keys: string[]) {
  if (!value || typeof value !== 'object' || Array.isArray(value) || Object.keys(value).sort().join('|') !== [...keys].sort().join('|')) {
    fail('CALENDAR_SNAPSHOT_INVALID', 'بنية لقطة التقويم غير صالحة')
  }
}
function positive(value: unknown) { if (!Number.isSafeInteger(value) || Number(value) < 1 || Number(value) > 2147483647) fail('CALENDAR_SNAPSHOT_INVALID', 'رقم مصدر التقويم غير صالح'); return Number(value) }
function label(value: unknown, max = 200) { if (typeof value !== 'string' || !value.trim() || value.length > max) fail('CALENDAR_SNAPSHOT_INVALID', 'اسم مصدر التقويم غير صالح'); return value }
function country(value: unknown): string | null {
  if (value === null) return null
  if (typeof value !== 'string' || !/^[A-Z]{2,5}$/.test(value)) fail('CALENDAR_SNAPSHOT_INVALID', 'دولة التقويم غير صالحة')
  return value
}
function weekends(value: unknown): string | null {
  if (value === null) return null
  if (typeof value !== 'string' || weekendDaysError(value)) fail('CALENDAR_SNAPSHOT_INVALID', 'أيام راحة التقويم غير صالحة')
  return normalizeWeekendDays(value)
}
function collection<T>(value: unknown, read: (row: any) => T): T[] {
  if (!Array.isArray(value) || value.length > LIMIT) fail('CALENDAR_SNAPSHOT_LIMIT', 'عدد مصادر التقويم يتجاوز حد القراءة')
  const rows = value.map(read)
  const ids = rows.map((row: any) => row.id)
  if (new Set(ids).size !== ids.length) fail('CALENDAR_SNAPSHOT_INVALID', 'مصدر مكرر في لقطة التقويم')
  return rows.sort((a: any, b: any) => a.id - b.id)
}
export function normalizeCalendarSnapshot(scope: CalendarScope, sourceId: number, value: unknown): CalendarSnapshot {
  identity(scope, sourceId)
  const data: any = value
  if (scope === 'EMPLOYEE') {
    exact(data, ['branchId'])
    return { branchId: data.branchId === null ? null : positive(data.branchId) }
  }
  exact(data, scope === 'GLOBAL' ? ['weekendDays', 'holidays', 'exceptions'] : ['id', 'country', 'weekendDays', 'exceptions'])
  const exceptions = collection(data.exceptions, row => {
    exact(row, ['id', 'name', 'weekday', 'occurrence', 'effect', 'isActive'])
    if (!['SUN','MON','TUE','WED','THU','FRI','SAT'].includes(row.weekday) || !['ALL','1ST','2ND','3RD','4TH','LAST'].includes(row.occurrence)
      || !['WORK','OFF'].includes(row.effect) || typeof row.isActive !== 'boolean') fail('CALENDAR_SNAPSHOT_INVALID', 'قاعدة تقويم غير صالحة')
    return { id: positive(row.id), name: label(row.name), weekday: row.weekday, occurrence: row.occurrence, effect: row.effect, isActive: row.isActive }
  })
  const weekendDays = weekends(data.weekendDays)
  if (scope === 'BRANCH') {
    if (positive(data.id) !== sourceId) fail('CALENDAR_SNAPSHOT_INVALID', 'لقطة التقويم تخص فرعًا آخر')
    return { id: sourceId, country: country(data.country), weekendDays, exceptions }
  }
  const holidays = collection(data.holidays, row => {
    exact(row, ['id', 'name', 'date', 'endDate', 'country'])
    const date = attendanceRuleDate(row.date), endDate = row.endDate === null ? null : attendanceRuleDate(row.endDate)
    if (endDate && endDate < date) fail('CALENDAR_SNAPSHOT_INVALID', 'مدى العطلة غير صالح')
    return { id: positive(row.id), name: label(row.name), date, endDate, country: country(row.country) }
  })
  return { weekendDays, holidays, exceptions }
}
const digest = (data: unknown) => payrollLiveSourceContent(data).contentHash
export function calendarSourceHash(scope: CalendarScope, sourceId: number, data: CalendarSnapshot) {
  return digest({ scope, sourceId, data: normalizeCalendarSnapshot(scope, sourceId, data) })
}
export function calendarVersionEnvelope(scope: CalendarScope, sourceId: number, version: number, effectiveFrom: string | null, data: CalendarSnapshot) {
  const normalized = normalizeCalendarSnapshot(scope, sourceId, data)
  return { schemaVersion: CALENDAR_SCHEMA_VERSION, data: normalized,
    contentHash: digest({ schemaVersion: CALENDAR_SCHEMA_VERSION, sourceType: SOURCE[scope], sourceId, version, effectiveFrom, data: normalized }) }
}
export function calendarVersionSnapshot(scope: CalendarScope, sourceId: number, row: Pick<AttendanceRuleVersion, 'sourceType' | 'sourceId' | 'version' | 'effectiveFrom' | 'legacyBaseline' | 'snapshot'>) {
  if (row.sourceType !== SOURCE[scope] || row.sourceId !== sourceId || !Number.isSafeInteger(row.version) || row.version < 0
    || (row.legacyBaseline ? row.version !== 0 || row.effectiveFrom !== null : row.version < 1 || !row.effectiveFrom)) fail('CALENDAR_HISTORY_INVALID', 'ترويسة نسخة التقويم غير صالحة')
  if (row.effectiveFrom !== null) attendanceRuleDate(row.effectiveFrom)
  exact(row.snapshot, ['schemaVersion', 'data', 'contentHash'])
  const expected = calendarVersionEnvelope(scope, sourceId, row.version, row.effectiveFrom, row.snapshot.data)
  if (row.snapshot.schemaVersion !== CALENDAR_SCHEMA_VERSION || row.snapshot.contentHash !== expected.contentHash) fail('CALENDAR_HISTORY_HASH_MISMATCH', 'بصمة نسخة التقويم لا تطابق محتواها')
  return expected.data
}
async function currentCalendar(em: EntityManager, scope: CalendarScope, id: number): Promise<CalendarSnapshot> {
  if (scope === 'EMPLOYEE') {
    const employee = await em.findOne(Employee, { where: { id }, select: { id: true, branchId: true } })
    if (!employee) throw new NotFoundException('الموظف غير موجود')
    return { branchId: employee.branchId ?? null }
  }
  const rows = await em.find(ScheduleExceptionRule, { where: { branchId: scope === 'GLOBAL' ? IsNull() : id }, order: { id: 'ASC' }, take: LIMIT + 1 })
  const exceptions = rows.map(row => ({ id: row.id, name: row.name, weekday: row.weekday, occurrence: row.occurrence, effect: row.effect, isActive: row.isActive }))
  if (scope === 'BRANCH') {
    const branch = await em.findOneBy(Branch, { id })
    if (!branch) throw new NotFoundException('الفرع غير موجود')
    return { id, country: branch.country?.trim().toUpperCase() || null, weekendDays: branch.weekendDays ?? null, exceptions }
  }
  const config = await em.findOneBy(RequestsConfig, { key: 'attendance.weekend_days' })
  const holidays = (await em.find(PublicHoliday, { order: { id: 'ASC' }, take: LIMIT + 1 })).map(row => ({ id: row.id, name: row.name,
    date: row.date, endDate: row.endDate ?? null, country: row.country?.trim().toUpperCase() || null }))
  return { weekendDays: config?.value ?? null, holidays, exceptions }
}
export async function readCalendarSource(em: EntityManager, scope: CalendarScope, sourceId: number): Promise<CalendarSourceRead> {
  identity(scope, sourceId)
  const current = normalizeCalendarSnapshot(scope, sourceId, await currentCalendar(em, scope, sourceId))
  // Bound JSON before the driver parses it. Invalid or oversized history is never
  // replaced by today's settings, and a corrupt row can be reported explicitly.
  const rows: AttendanceRuleVersion[] = await em.query(`SELECT TOP (5001) [id], [sourceType], [sourceId], [version],
      CONVERT(varchar(10), [effectiveFrom], 23) AS [effectiveFrom], [legacyBaseline], [actorUserId], [reason],
      CASE WHEN DATALENGTH([snapshot])<=4000000
        AND SUM(CAST(DATALENGTH([snapshot]) AS bigint)) OVER (ORDER BY [version] ROWS UNBOUNDED PRECEDING)<=20000000
        THEN [snapshot] ELSE NULL END AS [snapshotRaw]
    FROM dbo.attendance_rule_versions WHERE [sourceType]=@0 AND [sourceId]=@1 ORDER BY [version]`, [SOURCE[scope], sourceId])
  if (rows.length > LIMIT) fail('CALENDAR_HISTORY_LIMIT', 'عدد نسخ التقويم يتجاوز حد القراءة')
  let previousVersion = -1, previousDate = ''
  const versions = rows.map(row => {
    positive(row.id)
    if (typeof row.legacyBaseline !== 'boolean' || (!row.legacyBaseline && (!Number.isSafeInteger(row.actorUserId) || Number(row.actorUserId) < 1))
      || typeof row.reason !== 'string' || !row.reason.trim() || row.reason.length > 500) fail('CALENDAR_HISTORY_INVALID', 'بيانات توثيق نسخة التقويم غير مكتملة')
    const raw = (row as any).snapshotRaw
    if (typeof raw !== 'string') fail('CALENDAR_HISTORY_LIMIT', 'تفاصيل سجل التقويم تتجاوز حد القراءة')
    try { row.snapshot = JSON.parse(raw) } catch { fail('CALENDAR_HISTORY_INVALID', 'بيانات JSON لنسخة التقويم تالفة') }
    if (row.version <= previousVersion || (previousVersion >= 0 && row.version !== previousVersion + 1)
      || (row.effectiveFrom !== null && row.effectiveFrom < previousDate)) fail('CALENDAR_HISTORY_INVALID', 'تسلسل نسخ التقويم غير صالح')
    if (previousVersion === -1 && row.version > 1) fail('CALENDAR_HISTORY_INVALID', 'بداية سجل التقويم مفقودة')
    previousVersion = row.version; previousDate = row.effectiveFrom ?? previousDate
    return { id: row.id, version: row.version, effectiveFrom: row.effectiveFrom, legacyBaseline: row.legacyBaseline, snapshot: calendarVersionSnapshot(scope, sourceId, row) }
  })
  const currentSourceHash = calendarSourceHash(scope, sourceId, current)
  const latest = versions.at(-1)
  return { scope, sourceId, current, currentSourceHash, revision: latest?.version ?? 0, versions,
    currentMatchesHistory: !latest || currentSourceHash === calendarSourceHash(scope, sourceId, latest.snapshot) }
}
export function normalizeCalendarChange(value: unknown): CalendarChangeDto {
  const input: any = value
  if (!input || typeof input !== 'object' || Array.isArray(input)
    || Object.keys(input).sort().join('|') !== ['effectiveFrom','expectedCurrentSourceHash','expectedRevision','reason'].sort().join('|')) throw new BadRequestException({ code: 'CALENDAR_CHANGE_REQUIRED', message: 'تعديل التقويم يحتاج تاريخ السريان والسبب ونسخة المصدر المقروءة' })
  const effectiveFrom = attendanceRuleDate(input.effectiveFrom)
  if (typeof input.reason !== 'string' || input.reason.trim().length < 3 || input.reason.trim().length > 500
    || !Number.isSafeInteger(input.expectedRevision) || input.expectedRevision < 0 || !/^[a-f0-9]{64}$/.test(input.expectedCurrentSourceHash)) throw new BadRequestException('بيانات اعتماد تغيير التقويم غير مكتملة')
  return { effectiveFrom, reason: input.reason.trim(), expectedRevision: input.expectedRevision, expectedCurrentSourceHash: input.expectedCurrentSourceHash }
}
function assertChange(before: CalendarSourceRead, change: CalendarChangeDto, actorUserId: number) {
  positive(actorUserId)
  if (change.expectedRevision !== before.revision || change.expectedCurrentSourceHash !== before.currentSourceHash) fail('CALENDAR_SOURCE_CHANGED', 'تغيّر مصدر التقويم؛ حدّث البيانات وراجع التغيير قبل الحفظ')
  if (!before.currentMatchesHistory) fail('CALENDAR_CURRENT_SOURCE_DRIFT', 'القيم الحالية لا تطابق آخر نسخة تقويم؛ يلزم فحص التغيير غير المسجل قبل المتابعة')
  const latest = before.versions.at(-1)?.effectiveFrom
  if (latest && change.effectiveFrom < latest) fail('CALENDAR_EFFECTIVE_ORDER_CONFLICT', 'يوجد تغيير أحدث سريانًا؛ تاريخ التغيير الجديد يجب ألا يسبقه')
}
export async function beginCalendarChange(em: EntityManager, scope: CalendarScope, sourceId: number, value: unknown, actorUserId: number) {
  transaction(em)
  const change = normalizeCalendarChange(value), before = await readCalendarSource(em, scope, sourceId)
  assertChange(before, change, actorUserId)
  // Conservative for branch changes: historical transfers can make a past member
  // affected even though the current employee row points at a different branch.
  const ids = scope === 'EMPLOYEE' ? [sourceId] : (await em.find(Employee, { select: { id: true } })).map(row => row.id)
  await assertCalendarPeriodOpen(em, ids, change.effectiveFrom)
  return before
}
async function assertCalendarPeriodOpen(em: EntityManager, ids: number[], from: string) {
  await assertAttendanceRulePeriodOpen(em, ids, from)
  for (const employeeId of ids) {
    const settled = await em.query(`SELECT TOP (1) [id] FROM dbo.offboarding_cases WHERE [employeeId]=@0
      AND [status] IN ('SETTLED','CLOSED') AND [lastWorkingDay]>=@1`, [employeeId, from])
    if (settled.length) fail('CALENDAR_CLOSED_SETTLEMENT', 'سريان التقويم يمس خدمة تمت تصفيتها؛ يلزم تصحيح بفروقات لاحقة')
  }
}
export async function finishCalendarChange(em: EntityManager, before: CalendarSourceRead, value: unknown, actorUserId: number) {
  transaction(em)
  const change = normalizeCalendarChange(value)
  assertChange(before, change, actorUserId)
  const sourceType = SOURCE[before.scope], sourceId = before.sourceId
  const rows = await em.find(AttendanceRuleVersion, { where: { sourceType, sourceId }, order: { version: 'DESC' }, take: 1 })
  if ((rows[0]?.version ?? 0) !== before.revision) fail('CALENDAR_SOURCE_CHANGED', 'تغيّر سجل التقويم أثناء الحفظ')
  const current = normalizeCalendarSnapshot(before.scope, sourceId, await currentCalendar(em, before.scope, sourceId))
  if (!before.versions.length) await em.save(AttendanceRuleVersion, em.create(AttendanceRuleVersion, { sourceType, sourceId, version: 0,
    effectiveFrom: null, legacyBaseline: true, actorUserId, reason: 'حفظ القيم السابقة دون افتراض تاريخ سريان قديم',
    snapshot: calendarVersionEnvelope(before.scope, sourceId, 0, null, before.current) }))
  const version = before.revision + 1
  await em.save(AttendanceRuleVersion, em.create(AttendanceRuleVersion, { sourceType, sourceId, version, effectiveFrom: change.effectiveFrom,
    legacyBaseline: false, actorUserId, reason: change.reason, snapshot: calendarVersionEnvelope(before.scope, sourceId, version, change.effectiveFrom, current) }))
  return readCalendarSource(em, before.scope, sourceId)
}
export async function assertCalendarScope(user: JwtPayload, scope: CalendarScope, sourceId: number, em: EntityManager, write: boolean) {
  identity(scope, sourceId)
  const branchScope = branchScopeOf(user)
  if (scope === 'GLOBAL') {
    if (write && branchScope !== null) throw new ForbiddenException('تعديل التقويم العام متاح للمستخدم ذي نطاق جميع الفروع فقط')
    return
  }
  const row = scope === 'BRANCH' ? await em.findOneBy(Branch, { id: sourceId }) : await em.findOneBy(Employee, { id: sourceId })
  const branchId = scope === 'BRANCH' ? row?.id : (row as Employee | null)?.branchId
  if (!row || (branchScope !== null && branchId !== branchScope)) throw new NotFoundException('مصدر التقويم غير موجود في نطاقك')
}
export async function calendarSourceContext(em: EntityManager, user: JwtPayload, scope: CalendarScope, sourceId: number) {
  if (!['settings.manage','settings.view','attendance.manage','org.manage','employees.edit'].some(perm => userHasPerm(user, perm))) throw new ForbiddenException('ليس لديك صلاحية قراءة مصدر التقويم')
  await assertCalendarScope(user, scope, sourceId, em, false)
  const source = await readCalendarSource(em, scope, sourceId), latest = source.versions.at(-1)
  return { scope, sourceId, revision: source.revision, currentSourceHash: source.currentSourceHash,
    effectiveFrom: latest?.effectiveFrom ?? null, legacyBaseline: !latest || latest.legacyBaseline,
    currentMatchesHistory: source.currentMatchesHistory, current: source.current }
}
export async function confirmCalendarSource(em: EntityManager, user: JwtPayload, scope: CalendarScope, sourceId: number, change: unknown) {
  transaction(em)
  const permissions = scope === 'GLOBAL' ? ['settings.manage'] : scope === 'BRANCH' ? ['org.manage','settings.manage'] : ['employees.edit']
  if (!permissions.some(perm => userHasPerm(user, perm))) throw new ForbiddenException('ليس لديك صلاحية اعتماد مصدر التقويم')
  await lockAttendanceRuleMutation(em)
  await assertCalendarScope(user, scope, sourceId, em, true)
  const before = await beginCalendarChange(em, scope, sourceId, change, user.sub)
  await finishCalendarChange(em, before, change, user.sub)
  return calendarSourceContext(em, user, scope, sourceId)
}
/** Transfer caller owns employee-finance before touching transfer/employee rows. */
export async function appendEmployeeOrgCalendar(em: EntityManager, input: { employeeId: number; beforeBranchId: number | null; branchId: number | null; effectiveFrom: string; reason: string; actorUserId: number }) {
  transaction(em)
  const after = await readCalendarSource(em, 'EMPLOYEE', input.employeeId)
  if ((after.current as EmployeeOrgCalendarSnapshot).branchId !== input.branchId) fail('CALENDAR_EMPLOYEE_SOURCE_MISMATCH', 'فرع الموظف لا يطابق حركة النقل')
  const current = normalizeCalendarSnapshot('EMPLOYEE', input.employeeId, { branchId: input.beforeBranchId })
  const currentSourceHash = calendarSourceHash('EMPLOYEE', input.employeeId, current)
  const latest = after.versions.at(-1)
  const before = { ...after, current, currentSourceHash, currentMatchesHistory: !latest || currentSourceHash === calendarSourceHash('EMPLOYEE', input.employeeId, latest.snapshot) }
  const change = normalizeCalendarChange({ effectiveFrom: input.effectiveFrom, reason: input.reason, expectedRevision: before.revision, expectedCurrentSourceHash: currentSourceHash })
  assertChange(before, change, input.actorUserId)
  await assertCalendarPeriodOpen(em, [input.employeeId], change.effectiveFrom)
  return finishCalendarChange(em, before, change, input.actorUserId)
}
