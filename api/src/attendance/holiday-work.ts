import { BadRequestException } from '@nestjs/common'
import type { EntityManager } from 'typeorm'
import { suspendedDatesBetween } from '../employees/employee-suspensions'
import { EmployeeObligation } from '../requests/entities/financial.entities'
import { resolveEmployeeCalendarDay } from './attendance-calendar-resolver'
import { HolidayWorkOrder } from './holiday-work.entities'

// «بدل دوام أيام العطلات» (قرار المالك 19 سبتمبر):
// - أمر من الموارد البشرية (معتمد من الأول) بأيام عطلة لشركة/فرع/أقسام/فرق/موظفين، أو طلب «دوام يوم عطلة» معتمد لموظف.
// - كل موظف مستهدف جه في اليوم ده: ساعاته من أول بصمة لآخر بصمة (ناقص الاستراحة غير المدفوعة زي الحضور)
//   × سعر الساعة (إجمالي الراتب ÷ أيام الشهر ÷ ساعات اليوم — نفس أساس الإضافي) × المضاعف، مقصوص لقرشين.
// - بيتحسب في مسير الفترة اللي فيها اليوم كقيد «بدل» (CREDIT) في دفتر المديونيات، فيظهر في الاستحقاقات والقسيمة،
//   والاعتماد بيحجزه والصرف بيستهلكه — فالمعتمد والمصروف ما بيتغيرش، والمسودة بتتحدث مع إعادة الحساب.
// - لا تأخير ولا خروج مبكر ولا غياب ولا خصم يوم العطلة؛ واللي ماجاش ما ياخدش حاجة وما يتخصمش.
// - اللي جه من نفسه من غير أمر ولا طلب معتمد: مالوش بدل ولا خصم. واليوم المغطى بأمر ما بيطلعش إضافي مكتشف.

export const HOLIDAY_WORK_REQUEST_TYPE = 'HOLIDAY_WORK'
export const HOLIDAY_WORK_HANDLER = 'holiday_work'
export const HOLIDAY_WORK_MULTIPLIER_KEY = 'attendance.holiday_work_multiplier'
export const HOLIDAY_WORK_DEFAULT_MULTIPLIER = '1.5'
export const HOLIDAY_WORK_LABEL = 'بدل دوام أيام العطلات'
export const HOLIDAY_WORK_SOURCE_PREFIX = 'holiday_work:'
export const HOLIDAY_WORK_OBLIGATION_CATEGORY = 'allowance'
export const HOLIDAY_WORK_MAX_DATES = 62
export const HOLIDAY_WORK_LEVELS = ['company', 'branch', 'departments', 'teams', 'employees'] as const
export type HolidayWorkLevel = typeof HOLIDAY_WORK_LEVELS[number]
export type HolidayWorkKind = 'ORDER' | 'REQUEST'

const pad = (n: number) => String(n).padStart(2, '0')
/** تاريخ محلي YYYY-MM-DD (نفس localDateOf في الحضور، من غير استيراد دائري). */
export const holidayWorkToday = (now = new Date()) => `${now.getFullYear()}-${pad(now.getMonth() + 1)}-${pad(now.getDate())}`

export function isHolidayWorkYmd(value: unknown): boolean {
  if (typeof value !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(value)) return false
  const [y, m, d] = value.split('-').map(Number)
  const time = new Date(Date.UTC(y, m - 1, d))
  return y >= 2000 && y <= 2100 && time.getUTCFullYear() === y && time.getUTCMonth() === m - 1 && time.getUTCDate() === d
}

/** الأيام من مصفوفة أو نص مفصول بفواصل/مسافات (نموذج الطلب خانة نص واحدة) — مرتبة ومن غير تكرار. */
export function parseHolidayWorkDates(raw: unknown, options: { notAfter?: string; max?: number } = {}): string[] {
  const parts = Array.isArray(raw) ? raw.map(value => String(value ?? '')) : typeof raw === 'string' ? raw.split(/[\s,،;؛]+/) : []
  const values = parts.map(value => value.trim()).filter(Boolean)
  if (!values.length) throw new BadRequestException('اكتب يوم عطلة واحد على الأقل بصيغة YYYY-MM-DD')
  const bad = values.find(value => !isHolidayWorkYmd(value))
  if (bad !== undefined) throw new BadRequestException(`«${bad.slice(0, 20)}» مش تاريخ صحيح — اكتب الأيام بصيغة YYYY-MM-DD`)
  const dates = [...new Set(values)].sort()
  const max = options.max ?? HOLIDAY_WORK_MAX_DATES
  if (dates.length > max) throw new BadRequestException(`أقصى عدد أيام في المرة الواحدة ${max} يوم`)
  const notAfter = options.notAfter
  if (notAfter) {
    const future = dates.find(date => date > notAfter)
    if (future) throw new BadRequestException(`يوم ${future} لسه ماجاش — قدّم على أيام العطلة اللي اشتغلتها فعلًا`)
  }
  return dates
}

/** المضاعف: من 0.01 لـ 99.99 بمنزلتين بالكتير (نفس حدود مضاعفات الإضافي). */
export function parseHolidayWorkMultiplier(raw: unknown): number {
  const text = typeof raw === 'number' ? String(raw) : typeof raw === 'string' ? raw.trim() : ''
  const value = Number(text)
  if (text === '' || !Number.isFinite(value) || value < 0.01 || value > 99.99 || Math.abs(value * 100 - Math.round(value * 100)) > 1e-9) {
    throw new BadRequestException('المضاعف رقم من 0.01 لـ 99.99 بمنزلتين عشريتين بالكتير (مثال 1.5)')
  }
  return Math.round(value * 100) / 100
}

export interface HolidayWorkRateBasis {
  // إجمالي الراتب الشهري (كل المكونات) — نفس أساس سعر ساعة الإضافي
  grossMonthly: number
  monthlyDays: number
  dailyHours: number
}

export function holidayWorkHourlyRate(basis: HolidayWorkRateBasis): number {
  return basis.grossMonthly / basis.monthlyDays / basis.dailyHours
}

/** المبلغ = الساعات × (الإجمالي ÷ أيام الشهر ÷ ساعات اليوم) × المضاعف، مقصوص لقرشين (قرار المالك: لا تقريب للفلوس). */
export function holidayWorkAmount(basis: HolidayWorkRateBasis, minutes: number, multiplier: number): number {
  const values = [basis.grossMonthly, basis.monthlyDays, basis.dailyHours, minutes, multiplier]
  if (!values.every(value => Number.isFinite(value) && value >= 0) || basis.monthlyDays <= 0 || basis.dailyHours <= 0) {
    throw new BadRequestException('أساس سعر ساعة بدل دوام العطلات غير صالح؛ راجع الراتب وأيام الشهر وساعات اليوم')
  }
  const raw = basis.grossMonthly * multiplier * minutes / (basis.monthlyDays * basis.dailyHours * 60)
  return Math.trunc(Number((raw * 100).toFixed(6))) / 100
}

export type HolidayWorkSkipCode = 'FUTURE_DATE' | 'SUSPENDED' | 'NO_PUNCH' | 'NOT_HOLIDAY' | 'MISSING_PUNCH' | 'SESSION_TOO_LONG' | 'NO_WORK' | 'OVERTIME_APPROVED'
export const HOLIDAY_WORK_SKIP_LABELS: Record<HolidayWorkSkipCode, string> = {
  FUTURE_DATE: 'اليوم لسه ماجاش',
  SUSPENDED: 'الموظف موقوف عن العمل في اليوم ده',
  NO_PUNCH: 'ماجاش — مالوش بصمة في اليوم ده',
  NOT_HOLIDAY: 'اليوم مش عطلة للموظف ده — بيتحسب دوام عادي',
  MISSING_PUNCH: 'بصمة ناقصة (دخول من غير خروج أو العكس) — صحّح البصمة الأول',
  SESSION_TOO_LONG: 'المدة بين أول وآخر بصمة أطول من الحد المسموح — راجع البصمات',
  NO_WORK: 'مفيش ساعات شغل بعد الاستراحة',
  OVERTIME_APPROVED: 'اليوم ده له إضافي معتمد — بيتصرف إضافي مش بدل عشان مايتصرفش مرتين',
}

export interface HolidayWorkAttendanceDay {
  status: string
  checkIn: string | null
  checkOut: string | null
  workMinutes: number | null
}

export type HolidayWorkDayResult =
  | { eligible: true; minutes: number; rawMinutes: number }
  | { eligible: false; code: HolidayWorkSkipCode; message: string; rawMinutes: number | null }

/** استحقاق اليوم: يوم عطلة (حالة الحضور holiday) ببصمة دخول وخروج، والساعات = المدة − الاستراحة غير المدفوعة. */
export function holidayWorkDayResult(input: {
  date: string
  today: string
  day: HolidayWorkAttendanceDay | null
  unpaidBreakMinutes: number
  maxSessionMinutes: number
  approvedOvertime?: boolean
  suspended?: boolean
}): HolidayWorkDayResult {
  const skip = (code: HolidayWorkSkipCode, rawMinutes: number | null = null): HolidayWorkDayResult =>
    ({ eligible: false, code, message: HOLIDAY_WORK_SKIP_LABELS[code], rawMinutes })
  if (input.date > input.today) return skip('FUTURE_DATE')
  if (input.suspended) return skip('SUSPENDED')
  const day = input.day
  if (!day || (!day.checkIn && !day.checkOut)) return skip('NO_PUNCH')
  if (day.status !== 'holiday') return skip('NOT_HOLIDAY')
  if (!day.checkIn || !day.checkOut) return skip('MISSING_PUNCH')
  const rawMinutes = Math.max(0, Math.floor(Number(day.workMinutes ?? 0) + 1e-8))
  if (input.maxSessionMinutes > 0 && rawMinutes > input.maxSessionMinutes) return skip('SESSION_TOO_LONG', rawMinutes)
  const minutes = Math.max(0, rawMinutes - Math.max(0, Math.floor(input.unpaidBreakMinutes || 0)))
  if (minutes <= 0) return skip('NO_WORK', rawMinutes)
  if (input.approvedOvertime) return skip('OVERTIME_APPROVED', rawMinutes)
  return { eligible: true, minutes, rawMinutes }
}

export interface HolidayWorkGrant {
  id: number
  kind: HolidayWorkKind
  name: string
  targetLevel: string
  branchId: number | null
  targetIds: number[]
  dates: string[]
  multiplier: number
  sourceRequestId: number | null
}

export interface HolidayWorkOrg {
  employeeId: number
  branchId: number | null
  departmentId: number | null
  teamId: number | null
}

export function parseHolidayWorkIds(raw: string | null | undefined): number[] {
  if (!raw) return []
  try {
    const parsed = JSON.parse(raw)
    return Array.isArray(parsed) ? parsed.map(Number).filter(id => Number.isSafeInteger(id) && id > 0) : []
  } catch {
    return []
  }
}

export function parseStoredHolidayWorkDates(raw: string | null | undefined): string[] {
  if (!raw) return []
  try {
    const parsed = JSON.parse(raw)
    return Array.isArray(parsed) ? [...new Set(parsed.filter(isHolidayWorkYmd))].sort() : []
  } catch {
    return []
  }
}

/** الأمر ينطبق على الموظف؟ الأقسام والفرق جوه فرع الأمر بس، والموظفين بالاسم مهما اتنقلوا (نفس ترتيب «شيل خصم»). */
export function holidayWorkGrantMatches(grant: Pick<HolidayWorkGrant, 'targetLevel' | 'branchId' | 'targetIds'>, org: HolidayWorkOrg): boolean {
  if (grant.targetLevel === 'company') return true
  if (grant.targetLevel === 'employees') return grant.targetIds.includes(org.employeeId)
  if (grant.branchId == null || org.branchId !== grant.branchId) return false
  if (grant.targetLevel === 'branch') return true
  if (grant.targetLevel === 'departments') return org.departmentId != null && grant.targetIds.includes(org.departmentId)
  if (grant.targetLevel === 'teams') return org.teamId != null && grant.targetIds.includes(org.teamId)
  return false
}

/** أمر واحد لكل يوم: لو أكتر من أمر/طلب غطّى نفس الموظف ونفس اليوم بيتحسب مرة واحدة بأعلى مضاعف (ثم الأقدم). */
export function holidayWorkGrantsByDate(grants: readonly HolidayWorkGrant[], org: HolidayWorkOrg, from: string, to: string): Map<string, HolidayWorkGrant> {
  const byDate = new Map<string, HolidayWorkGrant>()
  for (const grant of grants) {
    if (!holidayWorkGrantMatches(grant, org)) continue
    for (const date of grant.dates) {
      if (date < from || date > to) continue
      const current = byDate.get(date)
      if (!current || grant.multiplier > current.multiplier || (grant.multiplier === current.multiplier && grant.id < current.id)) byDate.set(date, grant)
    }
  }
  return byDate
}

export function holidayWorkSourceRef(grantId: number, date: string) {
  return `${HOLIDAY_WORK_SOURCE_PREFIX}${grantId}:${date}`
}

export function parseHolidayWorkSourceRef(ref: string | null | undefined): { grantId: number; date: string } | null {
  const match = /^holiday_work:(\d+):(\d{4}-\d{2}-\d{2})$/.exec(String(ref ?? ''))
  return match ? { grantId: Number(match[1]), date: match[2] } : null
}

export function holidayWorkLabel(grant: Pick<HolidayWorkGrant, 'kind' | 'name' | 'sourceRequestId' | 'multiplier'>, date: string, minutes: number): string {
  const hours = (Math.round(minutes / 60 * 100) / 100).toString()
  const source = grant.kind === 'REQUEST' && grant.sourceRequestId ? `طلب #${grant.sourceRequestId}` : `أمر «${grant.name}»`
  return `${HOLIDAY_WORK_LABEL} — ${date}: ${hours} ساعة × ${grant.multiplier} (${source})`.slice(0, 300)
}

// ===== قراءة من القاعدة (محمية لو ترحيل 055 لسه ما اتطبقش: بلا أوامر = بلا أثر) =====

export async function holidayWorkTableReady(em: EntityManager): Promise<boolean> {
  const rows: Array<{ id: number | null }> = await em.query(`SELECT OBJECT_ID(N'dbo.holiday_work_orders', N'U') AS [id]`)
  return rows[0]?.id != null
}

interface GrantRow {
  id: number; kind: string; name: string; targetLevel: string; branchId: number | null; targetIds: string | null
  dates: string; multiplier: string | number; sourceRequestId: number | null
}

export function holidayWorkGrantOf(row: GrantRow): HolidayWorkGrant | null {
  const dates = parseStoredHolidayWorkDates(row.dates)
  const multiplier = Number(row.multiplier)
  if (!dates.length || !Number.isFinite(multiplier) || multiplier <= 0 || !(HOLIDAY_WORK_LEVELS as readonly string[]).includes(row.targetLevel)) return null
  return { id: Number(row.id), kind: row.kind === 'REQUEST' ? 'REQUEST' : 'ORDER', name: row.name, targetLevel: row.targetLevel,
    branchId: row.branchId == null ? null : Number(row.branchId), targetIds: parseHolidayWorkIds(row.targetIds), dates,
    multiplier: Math.round(multiplier * 100) / 100, sourceRequestId: row.sourceRequestId == null ? null : Number(row.sourceRequestId) }
}

/** الأوامر والطلبات المعتمدة السارية اللي فيها يوم جوه المدى. */
export async function readHolidayWorkGrants(em: EntityManager, from: string, to: string, tableChecked = false): Promise<HolidayWorkGrant[]> {
  if (!tableChecked && !(await holidayWorkTableReady(em))) return []
  const rows: GrantRow[] = await em.query(`SELECT [id], [kind], [name], [targetLevel], [branchId], [targetIds], [dates],
      CAST([multiplier] AS nvarchar(20)) AS [multiplier], [sourceRequestId]
    FROM [holiday_work_orders] WHERE [status] = N'ACTIVE' AND [firstDate] <= @0 AND [lastDate] >= @1`, [to, from])
  return rows.map(holidayWorkGrantOf).filter((grant): grant is HolidayWorkGrant => grant !== null)
    .map(grant => ({ ...grant, dates: grant.dates.filter(date => date >= from && date <= to) }))
    .filter(grant => grant.dates.length > 0)
}

/** هل اليوم ده للموظف ده عليه أمر/طلب دوام يوم عطلة ساري؟ (محرك الحضور بيوقف كشف الإضافي لليوم). */
export async function holidayWorkCoversDay(em: EntityManager, org: HolidayWorkOrg, date: string): Promise<boolean> {
  const grants = await readHolidayWorkGrants(em, date, date)
  return grants.some(grant => grant.dates.includes(date) && holidayWorkGrantMatches(grant, org))
}

// ===== الإضافي والبدل ما يجتمعوش على نفس اليوم =====

export const HOLIDAY_WORK_OVERTIME_REFUSAL = 'اليوم ده متغطي بأمر/طلب دوام يوم عطلة وبيتحسب «بدل دوام أيام العطلات» مش إضافي'

/**
 * يوم الإضافي متغطي بأمر ساري أو طلب «دوام يوم عطلة» معتمد للموظف؟ يوم العمل العادي للموظف (أمر شركة وفرعه شغال اليوم ده)
 * مش متغطي — الأمر مالوش أثر عليه وبيتحسب دوام عادي بقواعده (زي محرك الحضور: عطلة + أمر). التقويم المش مثبت بيتعامل كعطلة.
 */
export function holidayWorkCoversOvertimeDay(grants: ReadonlyArray<Pick<HolidayWorkGrant, 'targetLevel' | 'branchId' | 'targetIds' | 'dates'>>,
  org: HolidayWorkOrg, date: string, workingDay: boolean | null): boolean {
  if (workingDay === true) return false
  return grants.some(grant => grant.dates.includes(date) && holidayWorkGrantMatches(grant, org))
}

export async function holidayWorkCoversOvertime(em: EntityManager, employeeId: number, date: string): Promise<boolean> {
  if (!isHolidayWorkYmd(date) || !(await holidayWorkTableReady(em))) return false
  const grants = await readHolidayWorkGrants(em, date, date, true)
  if (!grants.length) return false
  const rows: Array<{ branchId: number | null; departmentId: number | null; teamId: number | null }> =
    await em.query('SELECT [branchId], [departmentId], [teamId] FROM [employees] WHERE [id] = @0', [employeeId])
  if (!rows.length) return false
  const id = (value: unknown) => value == null ? null : Number(value)
  const org: HolidayWorkOrg = { employeeId, branchId: id(rows[0].branchId), departmentId: id(rows[0].departmentId), teamId: id(rows[0].teamId) }
  if (!holidayWorkCoversOvertimeDay(grants, org, date, null)) return false
  let working: boolean | null = null
  try {
    const calendar = await resolveEmployeeCalendarDay(em, employeeId, date)
    if (calendar.state === 'AVAILABLE' && typeof calendar.working === 'boolean') working = calendar.working
  } catch { /* تقويم مش مثبت: الأمر هو الحكم */ }
  return holidayWorkCoversOvertimeDay(grants, org, date, working)
}

/**
 * طلب الإضافي (أو قيد الإضافي المكتشف) ليوم متغطي بيترفض عند التقديم وعند كل خطوة اعتماد — اليوم بيتحسب «بدل دوام أيام العطلات» بس.
 * والعكس في مزامنة المسير: اليوم اللي له إضافي معتمد/مصروف بيتخطى في البدل. فاليوم مايتصرفش مرتين.
 */
export async function assertOvertimeNotHolidayWork(em: EntityManager, employeeId: number, date: string): Promise<void> {
  if (await holidayWorkCoversOvertime(em, employeeId, date)) throw new BadRequestException(HOLIDAY_WORK_OVERTIME_REFUSAL)
}

async function configNumber(em: EntityManager, key: string, fallback: number): Promise<number> {
  const rows: Array<{ value: string }> = await em.query('SELECT [value] FROM [requests_config] WHERE [key] = @0', [key])
  const value = Number(rows[0]?.value ?? fallback)
  return Number.isFinite(value) && value >= 0 ? value : fallback
}

export async function readHolidayWorkMultiplier(em: EntityManager): Promise<number> {
  const rows: Array<{ value: string }> = await em.query('SELECT [value] FROM [requests_config] WHERE [key] = @0', [HOLIDAY_WORK_MULTIPLIER_KEY])
  try { return parseHolidayWorkMultiplier(rows[0]?.value ?? HOLIDAY_WORK_DEFAULT_MULTIPLIER) } catch { return Number(HOLIDAY_WORK_DEFAULT_MULTIPLIER) }
}

/** إعدادات الحضور اللي بتحدد ساعات اليوم: الاستراحة غير المدفوعة وأقصى مدة جلسة (زي الحضور والإضافي). */
export async function readHolidayWorkAttendanceRules(em: EntityManager) {
  return {
    unpaidBreakMinutes: await configNumber(em, 'attendance.flex.unpaid_break_minutes', 0),
    maxSessionMinutes: await configNumber(em, 'attendance.flex.max_session_minutes', 900),
  }
}

const inList = (values: unknown[], offset: number) => values.map((_, index) => `@${index + offset}`).join(', ')

export async function readHolidayWorkAttendanceDays(em: EntityManager, employeeId: number, dates: string[]): Promise<Map<string, HolidayWorkAttendanceDay>> {
  const map = new Map<string, HolidayWorkAttendanceDay>()
  for (let index = 0; index < dates.length; index += 500) {
    const chunk = dates.slice(index, index + 500)
    const rows: Array<HolidayWorkAttendanceDay & { date: string }> = await em.query(`SELECT CONVERT(nvarchar(10), [date], 23) AS [date], [status], [checkIn], [checkOut], [workMinutes]
      FROM [attendance_days] WHERE [employeeId] = @0 AND [date] IN (${inList(chunk, 1)})`, [employeeId, ...chunk])
    for (const row of rows) map.set(row.date, { status: row.status, checkIn: row.checkIn ?? null, checkOut: row.checkOut ?? null,
      workMinutes: row.workMinutes == null ? null : Number(row.workMinutes) })
  }
  return map
}

export async function readApprovedOvertimeDates(em: EntityManager, employeeId: number, dates: string[]): Promise<Set<string>> {
  const found = new Set<string>()
  for (let index = 0; index < dates.length; index += 500) {
    const chunk = dates.slice(index, index + 500)
    const rows: Array<{ date: string }> = await em.query(`SELECT CONVERT(nvarchar(10), [date], 23) AS [date] FROM [overtime_entries]
      WHERE [employeeId] = @0 AND [status] IN (N'APPROVED', N'PAID') AND [date] IN (${inList(chunk, 1)})`, [employeeId, ...chunk])
    for (const row of rows) found.add(row.date)
  }
  return found
}

// ===== المسير: مزامنة قيود «بدل دوام أيام العطلات» في دفتر المديونيات =====

export interface HolidayWorkPayrollLine {
  date: string
  grantId: number
  grantKind: HolidayWorkKind
  grantName: string
  multiplier: number
  minutes: number | null
  hours: number | null
  hourlyRate: number
  amount: number
  obligationId: number | null
  status: 'IN_RUN' | 'ALREADY_SETTLED' | 'SKIPPED'
  code?: HolidayWorkSkipCode
  message?: string
  /** يوم قبل تغطية المسير ماتصرفش في مسير فترته (أمر اتعمل أو طلب اتعتمد بعد اعتماده) — داخل أول مسير مفتوح بعده. */
  carried?: true
}

interface ObligationRow {
  id: number; sourceRef: string; status: string; amount: string; label: string; targetPeriod: string | null
  reservedPayrollRunId: number | null; payrollReversalOfObligationId: number | null; carriedFromObligationId: number | null
  sourceRequestId: number | null
}

const cents = (value: unknown) => Math.round(Number(value ?? 0) * 100)
// قيد يديره المسير: مستحق ومش محجوز لمسير معتمد ومش إعادة بعد عكس ولا مرحّل. غيره اتسوّى (اتصرف/محجوز) وما يتلمسش.
const managedRow = (row: ObligationRow) => row.status === 'PENDING' && row.reservedPayrollRunId == null &&
  row.payrollReversalOfObligationId == null && row.carriedFromObligationId == null

async function cancelObligations(em: EntityManager, ids: number[]) {
  for (let index = 0; index < ids.length; index += 500) {
    const chunk = ids.slice(index, index + 500)
    await em.query(`UPDATE [employee_obligations] SET [status] = N'CANCELLED'
      WHERE [status] = N'PENDING' AND [reservedPayrollRunId] IS NULL AND [id] IN (${inList(chunk, 0)})`, chunk)
  }
}

/** أقدم يوم بيرجع له المسير يدوّر على أيام عطلة مغطاة ماتصرفتش (الأوامر نفسها بدأت مع ترحيل 055 في سبتمبر 2026). */
export const HOLIDAY_WORK_CARRY_FLOOR = '2000-01-01'

/**
 * قبل قراءة قيود الدفتر في حساب المسير: لكل يوم عطلة مغطى بأمر/طلب معتمد داخل تغطية الموظف في الفترة،
 * ينشئ أو يحدّث قيد «بدل» PENDING بالمبلغ المحسوب، ويلغي القيد اللي ماعادش له مبرر (أمر اتلغى، بصمة اتشالت).
 * والأيام اللي قبل التغطية وماتصرفتش (أمر اتعمل أو طلب اتعتمد بعد اعتماد مسير فترتها) بتدخل أول مسير مفتوح للموظف
 * بعدها — زي أي قيد مستحق شهره المستهدف لا يتجاوز شهر المسير؛ واليوم اللي قيده في إيد مسير مفتوح تاني بيفضل معاه.
 * القيد المحجوز لمسير معتمد أو المصروف ما يتلمسش (المعتمد والمصروف ما بيتغيرش).
 */
export async function syncHolidayWorkPayroll(em: EntityManager, input: {
  employeeId: number
  org: HolidayWorkOrg
  from: string
  to: string
  period: string
  basis: HolidayWorkRateBasis
  skipDates?: ReadonlySet<string>
  actorUserId: number | null
  today?: string
  /** أول يوم يتدوّر فيه على الأيام اللي قبل التغطية (الافتراضي HOLIDAY_WORK_CARRY_FLOOR). */
  carryFrom?: string
}): Promise<{ lines: HolidayWorkPayrollLine[]; total: number }> {
  if (input.from > input.to || !(await holidayWorkTableReady(em))) return { lines: [], total: 0 }
  const today = input.today ?? holidayWorkToday()
  const scanFrom = [input.carryFrom ?? HOLIDAY_WORK_CARRY_FLOOR, input.from].sort()[0]
  const grants = await readHolidayWorkGrants(em, scanFrom, input.to, true)
  const byDate = holidayWorkGrantsByDate(grants, input.org, scanFrom, input.to)
  const existing: ObligationRow[] = await em.query(`SELECT [id], [sourceRef], [status], CAST([amount] AS nvarchar(40)) AS [amount], [label], [targetPeriod],
      [reservedPayrollRunId], [payrollReversalOfObligationId], [carriedFromObligationId], [sourceRequestId]
    FROM [employee_obligations] WHERE [employeeId] = @0 AND [sourceRef] LIKE N'holiday[_]work:%' AND [status] <> N'CANCELLED'
      AND [effectiveDate] >= @1 AND [effectiveDate] <= @2`, [input.employeeId, scanFrom, input.to])
  const rowsByDate = new Map<string, ObligationRow[]>()
  for (const row of existing) {
    const ref = parseHolidayWorkSourceRef(row.sourceRef)
    if (!ref) continue
    rowsByDate.set(ref.date, [...(rowsByDate.get(ref.date) ?? []), row])
  }
  // قيد مستحق شهره المستهدف مسير تاني (مسير مفتوح أقدم أو أحدث بيديره): مش بتاع المسير ده
  const ownRow = (row: ObligationRow) => row.targetPeriod == null || row.targetPeriod === input.period
  const toCancel: number[] = []
  const carried = new Set<string>()
  const dates: string[] = []
  for (const date of [...new Set([...byDate.keys(), ...rowsByDate.keys()])].sort()) {
    if (date >= input.from) { dates.push(date); continue }
    // قبل التغطية: يوم عليه أمر/طلب ساري للموظف ومااتسوّاش — مش مصروف ولا محجوز لمسير معتمد ولا في إيد مسير مفتوح تاني
    const rows = rowsByDate.get(date) ?? []
    if (!byDate.has(date) || rows.some(row => !managedRow(row))) continue
    if (rows.some(row => !ownRow(row))) { toCancel.push(...rows.filter(ownRow).map(row => row.id)); continue }
    dates.push(date)
    carried.add(date)
  }
  if (!dates.length) {
    if (toCancel.length) await cancelObligations(em, [...new Set(toCancel)])
    return { lines: [], total: 0 }
  }
  const grantDates = dates.filter(date => byDate.has(date))
  const days = await readHolidayWorkAttendanceDays(em, input.employeeId, grantDates)
  const approvedOvertime = await readApprovedOvertimeDates(em, input.employeeId, grantDates)
  const rules = await readHolidayWorkAttendanceRules(em)
  const carriedDates = [...carried]
  // الإيقاف عن العمل للأيام القديمة من سجل الإيقاف نفسه (أيام التغطية جاية من المسير)
  const carriedSuspended = carriedDates.length
    ? await suspendedDatesBetween(em, input.employeeId, carriedDates[0], carriedDates[carriedDates.length - 1]) : new Set<string>()
  const hourlyRate = Math.round(holidayWorkHourlyRate(input.basis) * 1e6) / 1e6
  const lines: HolidayWorkPayrollLine[] = []
  for (const date of dates) {
    const isCarried = carried.has(date)
    const rows = rowsByDate.get(date) ?? []
    const managed = rows.filter(managedRow), settled = rows.filter(row => !managedRow(row))
    const grant = byDate.get(date)
    if (!grant) { toCancel.push(...managed.map(row => row.id)); continue }
    const base = { date, grantId: grant.id, grantKind: grant.kind, grantName: grant.name, multiplier: grant.multiplier, hourlyRate }
    if (settled.length) {
      // اليوم اتصرف (أو محجوز لمسير معتمد) قبل كده — ما يتحسبش تاني
      toCancel.push(...managed.map(row => row.id))
      lines.push({ ...base, minutes: null, hours: null, amount: cents(settled[0].amount) / 100, obligationId: settled[0].id, status: 'ALREADY_SETTLED' })
      continue
    }
    const result = holidayWorkDayResult({ date, today, day: days.get(date) ?? null, ...rules, approvedOvertime: approvedOvertime.has(date),
      suspended: isCarried ? carriedSuspended.has(date) : input.skipDates?.has(date) ?? false })
    // اليوم القديم اللي مالوش استحقاق (ماجاش، له إضافي معتمد…) ما يظهرش في كل مسير جديد — بيظهر في شاشة الأمر نفسه
    if (!result.eligible) {
      toCancel.push(...managed.map(row => row.id))
      if (!isCarried) lines.push({ ...base, minutes: result.rawMinutes, hours: null, amount: 0, obligationId: null, status: 'SKIPPED', code: result.code, message: result.message })
      continue
    }
    const amount = holidayWorkAmount(input.basis, result.minutes, grant.multiplier)
    const hours = Math.round(result.minutes / 60 * 100) / 100
    if (amount <= 0) {
      toCancel.push(...managed.map(row => row.id))
      if (!isCarried) lines.push({ ...base, minutes: result.minutes, hours, amount: 0, obligationId: null, status: 'SKIPPED', code: 'NO_WORK', message: 'المبلغ صفر (مفيش راتب مسجل)' })
      continue
    }
    const sourceRef = holidayWorkSourceRef(grant.id, date)
    const label = holidayWorkLabel(grant, date, result.minutes)
    const keep = managed.find(row => row.sourceRef === sourceRef) ?? null
    toCancel.push(...managed.filter(row => row !== keep).map(row => row.id))
    let obligationId: number
    if (keep) {
      obligationId = Number(keep.id)
      if (cents(keep.amount) !== Math.round(amount * 100) || keep.label !== label || keep.targetPeriod !== input.period ||
        (keep.sourceRequestId ?? null) !== grant.sourceRequestId) {
        await em.query(`UPDATE [employee_obligations] SET [amount] = CAST(@0 AS decimal(18,2)), [label] = @1, [targetPeriod] = @2, [sourceRequestId] = @3
          WHERE [id] = @4 AND [status] = N'PENDING' AND [reservedPayrollRunId] IS NULL`, [amount.toFixed(2), label, input.period, grant.sourceRequestId, obligationId])
      }
    } else {
      const saved = await em.getRepository(EmployeeObligation).save(em.getRepository(EmployeeObligation).create({
        employeeId: input.employeeId, type: 'CREDIT', category: HOLIDAY_WORK_OBLIGATION_CATEGORY, amount, label, status: 'PENDING',
        effectiveDate: date, sourceRequestId: grant.sourceRequestId as number, sourceRef, createdByUserId: input.actorUserId as number,
        targetPeriod: input.period,
      }))
      obligationId = saved.id
    }
    lines.push({ ...base, minutes: result.minutes, hours, amount, obligationId, status: 'IN_RUN', ...(isCarried ? { carried: true as const } : {}) })
  }
  if (toCancel.length) await cancelObligations(em, [...new Set(toCancel)])
  const total = lines.filter(line => line.status === 'IN_RUN').reduce((sum, line) => sum + Math.round(line.amount * 100), 0) / 100
  return { lines, total }
}

/** تعديل أمر أو إلغاؤه: قيوده المستحقة غير المحجوزة تتلغي، وإعادة حساب المسودة بتعيد بناءها بالأمر الجديد. */
export async function cancelHolidayWorkObligations(em: EntityManager, grantId: number): Promise<number> {
  const rows: Array<{ id: number }> = await em.query(`SELECT [id] FROM [employee_obligations]
    WHERE [sourceRef] LIKE @0 AND [status] = N'PENDING' AND [reservedPayrollRunId] IS NULL
      AND [payrollReversalOfObligationId] IS NULL AND [carriedFromObligationId] IS NULL`, [`holiday[_]work:${grantId}:%`])
  await cancelObligations(em, rows.map(row => Number(row.id)))
  return rows.length
}

// ===== طلب «دوام يوم عطلة» المعتمد =====

/** وجهة الطلب: يتسجل كأمر لموظف واحد بأيام الطلب ومضاعف الإعداد وقت الاعتماد؛ الحساب نفسه من البصمة في المسير. */
export async function recordHolidayWorkRequest(em: EntityManager, req: { id: number; requesterId: number }, payload: Record<string, unknown>):
  Promise<{ id: number; dates: string[]; created: boolean }> {
  const repo = em.getRepository(HolidayWorkOrder)
  const existing = await repo.findOne({ where: { sourceRequestId: req.id } })
  if (existing) return { id: existing.id, dates: parseStoredHolidayWorkDates(existing.dates), created: false }
  const dates = parseHolidayWorkDates(payload.dates)
  const employees: Array<{ id: number; branchId: number | null }> = await em.query('SELECT [id], [branchId] FROM [employees] WHERE [id] = @0', [req.requesterId])
  if (!employees.length) throw new BadRequestException('صاحب طلب دوام يوم العطلة مش موجود')
  const multiplier = await readHolidayWorkMultiplier(em)
  const reason = String(payload.reason ?? '').trim().slice(0, 500) || null
  const saved = await repo.save(repo.create({ kind: 'REQUEST', name: `طلب دوام يوم عطلة #${req.id}`.slice(0, 150), targetLevel: 'employees',
    branchId: employees[0].branchId == null ? null : Number(employees[0].branchId), targetIds: JSON.stringify([req.requesterId]),
    dates: JSON.stringify(dates), firstDate: dates[0], lastDate: dates[dates.length - 1], multiplier, status: 'ACTIVE',
    sourceRequestId: req.id, note: reason, createdByUserId: null }))
  return { id: saved.id, dates, created: true }
}
