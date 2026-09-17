// ===== مجال الحضور: الورديات، جداول العمل، التسطيح الأسبوعي، الأجهزة، سجلات الشهر، الأذونات =====
// المواصفة: scratchpad/migration/mapping-attendance.md — مكيّفة على مخرجات الـAPI (Resources/Controllers) لا أعمدة القاعدة.
//
// القرارات:
// - الجدول الفعلي لكل موظف يؤخذ من «لوحة الجدولة الأسبوعية» القديمة (attendance/weekly-board) لأنها تحل السلسلة
//   نفسها التي يستخدمها محرك الحضور القديم (استثناء > منشور > إسناد نطاق > جدول أسبوعي > work_days)، من أسبوع اليوم
//   حتى نهاية الشهر القادم؛ ثم تُسطّح: عطلة أسبوعية → جدول عمل للموظف، وردية غالبة لكل أسبوع → weekly_schedule_entries،
//   وأيام مختلفة → schedule_day_overrides. ما لا يمثّله نموذجنا (يوم عطلة/عمل مؤرخ لموظف) يُسجّل تنبيهًا.
// - القواعد الشهرية المتكررة على مستوى الشركة/الفرع → schedule_exception_rules (+ مزامنة نسخة التقويم الأساسية إن وُجدت).
// - سجلات الحضور تُنسخ كما هي لفترة المسير الحالية (دورة الشركة من payroll/formulas، وإلا إعدادنا، وإلا 23)،
//   والبصمات (أول/آخر من السجل + بصمات الدفتر اليدوية) من اليوم السابق للفترة حتى اليوم.
// - الأذونات المعلقة تُستورد مسودة (DRAFT) مع تنبيه: سلسلة اعتمادنا تُحل بالخدمة عند التقديم فقط.

import { Between } from 'typeorm'
import { chunk, readRaw, readRawEach, safeBatchSize, type Ctx, type Source } from './framework'
import { BiometricDevice, Shift, WorkSchedule } from '../../src/assets/assets.entities'
import {
  AttendanceDay,
  AttendancePunch,
  PermissionType,
  ScheduleDayOverride,
  ScheduleEntry,
  ScheduleExceptionRule,
  type AttendanceStatus,
} from '../../src/attendance/attendance.entities'
import { AttendanceRuleVersion, type AttendanceRuleSourceType } from '../../src/attendance/attendance-rule.entities'
import { appendAttendanceRuleVersion, attendanceSourceSnapshot } from '../../src/attendance/attendance-rule-history'
import { calendarVersionEnvelope, readCalendarSource } from '../../src/attendance/attendance-calendar-history'
import { WEEK_DAY_CODES, normalizeWeekendDays } from '../../src/attendance/weekend-days'
import { Employee } from '../../src/employees/employee.entity'
import { Branch } from '../../src/org/entities/branch.entity'
import { Request } from '../../src/requests/entities/request.entity'
import { RequestsConfig } from '../../src/requests/entities/requests-config.entity'

type Rec = Record<string, any>

// ===================== أدوات صغيرة =====================

const pad = (n: number) => String(n).padStart(2, '0')
const str = (v: unknown): string => (v == null ? '' : String(v).trim())
const num = (v: unknown): number | null => {
  if (v === null || v === undefined || v === '' || typeof v === 'boolean') return null
  const n = Number(v)
  return Number.isFinite(n) ? n : null
}
const int0 = (v: unknown): number => Math.max(0, Math.round(num(v) ?? 0))
const intOrNull = (v: unknown): number | null => (num(v) == null ? null : Math.round(num(v)!))
const bool = (v: unknown, fallback = false): boolean =>
  v === undefined || v === null ? fallback : v === true || v === 1 || v === '1' || v === 'true'
const trunc = (s: string, n: number) => (s.length > n ? s.slice(0, n) : s)
const round2 = (n: number) => Math.round(n * 100) / 100

// HH:mm من TIME أو نص؛ null لو غير صالح
function hm(v: unknown): string | null {
  const m = /^(\d{1,2}):(\d{2})(?::(\d{2}))?/.exec(str(v))
  if (!m) return null
  const h = Number(m[1])
  const mi = Number(m[2])
  return h > 23 || mi > 59 ? null : `${pad(h)}:${pad(mi)}`
}
const hasSeconds = (v: unknown) => /^\d{1,2}:\d{2}:(\d{2})/.test(str(v)) && !/^\d{1,2}:\d{2}:00/.test(str(v))
const minutesOf = (t: string) => Number(t.slice(0, 2)) * 60 + Number(t.slice(3, 5))

// التوقيت الجداري من ISO القديم (المنطقة UTC في التطبيق القديم = أرقام القاعدة كما هي) — بلا إزاحة
function wall(v: unknown): { date: string; hms: string; hm: string } | null {
  const m = /^(\d{4}-\d{2}-\d{2})[T ](\d{2}):(\d{2})(?::(\d{2}))?/.exec(str(v))
  if (!m) return null
  return { date: m[1], hms: `${m[2]}:${m[3]}:${m[4] ?? '00'}`, hm: `${m[2]}:${m[3]}` }
}
// نفس تفسير استقبال البصمات عندنا: new Date('YYYY-MM-DDTHH:mm:ss') بتوقيت العملية (TZ من api/.env)
const localDateTime = (w: { date: string; hms: string }) => new Date(`${w.date}T${w.hms}`)
function isoDate(v: unknown): Date | null {
  const s = str(v)
  if (!s) return null
  const d = new Date(s)
  return Number.isNaN(d.getTime()) ? null : d
}
const ymdOf = (v: unknown): string | null => {
  const m = /^(\d{4}-\d{2}-\d{2})/.exec(str(v))
  return m ? m[1] : null
}

const localYmd = (d: Date) => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`
const addDays = (ymd: string, n: number) => {
  const d = new Date(`${ymd}T12:00:00Z`)
  d.setUTCDate(d.getUTCDate() + n)
  return d.toISOString().slice(0, 10)
}
const dowOf = (ymd: string) => new Date(`${ymd}T12:00:00Z`).getUTCDay()
const weekStartOf = (ymd: string) => addDays(ymd, -dowOf(ymd))
const daysBetween = (a: string, b: string) => Math.round((Date.parse(`${b}T12:00:00Z`) - Date.parse(`${a}T12:00:00Z`)) / 86400000)
const clampDay = (year: number, month0: number, day: number) => {
  const last = new Date(Date.UTC(year, month0 + 1, 0)).getUTCDate()
  const d = new Date(Date.UTC(year, month0, Math.min(Math.max(1, day), last)))
  return d.toISOString().slice(0, 10)
}
// بداية دورة المسير التي تحتوي اليوم: شهر ميلادي أو «من يوم X من الشهر السابق»
function cycleStart(today: string, type: 'calendar' | 'custom', startDay: number): string {
  const [y, m] = today.split('-').map(Number)
  if (type === 'calendar') return `${y}-${pad(m)}-01`
  const thisMonth = clampDay(y, m - 1, startDay)
  return today >= thisMonth ? thisMonth : clampDay(y, m - 2, startDay)
}
const endOfNextMonth = (today: string) => {
  const [y, m] = today.split('-').map(Number)
  return new Date(Date.UTC(y, m + 1, 0)).toISOString().slice(0, 10)
}

// ===================== المصادر =====================

// تُحسب لحظة بناء البيان (الاستخراج يجري في نفس يوم الاستيراد)
const MANIFEST_TODAY = localYmd(new Date())
const EXTRACT_FROM = addDays([cycleStart(MANIFEST_TODAY, 'custom', 23), cycleStart(MANIFEST_TODAY, 'calendar', 1)].sort()[0], -1)
const HORIZON_FROM = weekStartOf(MANIFEST_TODAY)
const BOARD_WEEKS = Math.ceil((daysBetween(HORIZON_FROM, endOfNextMonth(MANIFEST_TODAY)) + 1) / 7)
const MAX_BOARD_WEEKS = 16
const boardKey = (i: number) => `attendance-board-w${pad(i)}`

export const DOMAIN = 'attendance'
export const DEPENDS_ON: string[] = ['org', 'employees']
export const SOURCES: Source[] = [
  { key: 'attendance-shifts', path: 'attendance/shifts', paginated: true, params: { per_page: 200 } },
  { key: 'attendance-shift-versions', path: 'attendance/shifts/{id}/versions', each: { from: 'attendance-shifts' } },
  { key: 'attendance-work-schedules', path: 'settings/work-schedules' },
  { key: 'attendance-work-days', path: 'settings/work-days' },
  { key: 'attendance-schedule-exceptions', path: 'attendance/schedule-exceptions' },
  { key: 'attendance-working-day-patterns', path: 'attendance/working-day-patterns' },
  // اللوحة: الصفحات داخل data.meta (last_page) — per_page أقصاه 100 في القديم
  ...Array.from({ length: Math.min(BOARD_WEEKS, MAX_BOARD_WEEKS) }, (_, i): Source => ({
    key: boardKey(i + 1),
    path: 'attendance/weekly-board',
    paginated: true,
    params: { week_start: addDays(HORIZON_FROM, i * 7), per_page: 100 },
  })),
  { key: 'attendance-employees', path: 'employees', paginated: true, params: { per_page: 200 } },
  { key: 'attendance-devices', path: 'attendance/biometric-devices' },
  { key: 'attendance-records', path: 'attendance', paginated: true, params: { date_from: EXTRACT_FROM, date_to: MANIFEST_TODAY, per_page: 200 } },
  { key: 'attendance-record-punches', path: 'attendance/{id}/punches', each: { from: 'attendance-records' } },
  { key: 'attendance-permit-types', path: 'attendance/permit-types' },
  { key: 'attendance-exit-permits', path: 'attendance/exit-permits', paginated: true, params: { date_from: EXTRACT_FROM, date_to: MANIFEST_TODAY, per_page: 200 } },
  { key: 'attendance-exit-permits-pending', path: 'attendance/exit-permits', paginated: true, params: { status: 'pending', per_page: 200 } },
  { key: 'attendance-payroll-formulas', path: 'payroll/formulas' },
]

// ===================== الحالة المشتركة =====================

interface TargetEmp {
  id: number
  startDate: string | null
  employeeCode: string
  fingerprintCode: string | null
  branchId: number | null
  workScheduleId: number | null
}
interface ShiftInfo { id: number; name: string; startTime: string; endTime: string }
interface SchedInfo { id: number; name: string; weekendDays: string; startTime: string; endTime: string; isDefault: boolean; isActive: boolean }

interface State {
  today: string
  window: { from: string; to: string }
  emps: Map<number, TargetEmp>
  srcEmps: Map<string, Rec>
  branches: Map<number, { weekendDays: string | null; isHeadquarters: boolean }>
  hqBranchId: number | null
  shifts: Map<string, ShiftInfo> // معرّف الوردية القديم → الجديد
  shiftNames: Set<string> // أسماء محجوزة (بحروف صغيرة — ترتيب SQL Server غير حساس لحالة الحروف)
  schedules: SchedInfo[]
  schedByLegacy: Map<string, SchedInfo>
  scheduleNames: Set<string>
  empId(legacyId: unknown, employeeNumber?: unknown): number | undefined
  branchId(legacyId: unknown): number | undefined
  userId(legacyId: unknown): number | undefined
}

function idFrom(ctx: Ctx, kinds: string[], legacyId: unknown): number | undefined {
  const s = str(legacyId)
  if (!s) return undefined
  for (const k of kinds) {
    const v = ctx.ids.get(k, s)
    if (v) return v
  }
  return undefined
}

function uniqueName(ctx: Ctx, taken: Set<string>, desired: string, legacyId: string, kind: string, max = 100): string {
  let name = trunc(desired, max)
  if (desired.length > max) ctx.flag(`${kind}_NAME_TRUNCATED`, legacyId, 'الاسم أطول من حد الحقل — اقتُطع')
  if (taken.has(name.toLowerCase())) {
    const suffix = ` (#${legacyId})`
    name = `${trunc(name, max - suffix.length)}${suffix}`
    ctx.flag(`${kind}_NAME_DEDUPED`, legacyId, 'اسم مكرر — أُضيف رقم المعرّف القديم')
  }
  taken.add(name.toLowerCase())
  return name
}

async function saveBaseline(ctx: Ctx, sourceType: AttendanceRuleSourceType, sourceId: number, row: object, snapshotOverride?: object) {
  if (await ctx.em.existsBy(AttendanceRuleVersion, { sourceType, sourceId })) return
  const snapshot = await ruleSnapshot(ctx, snapshotOverride ?? row, sourceType, sourceId)
  await ctx.em.save(
    AttendanceRuleVersion,
    ctx.em.create(AttendanceRuleVersion, {
      sourceType, sourceId, version: 0, effectiveFrom: null, legacyBaseline: true, actorUserId: null, snapshot,
      reason: 'ترحيل من النظام القديم — القيم الموجودة وقت الترحيل؛ تاريخ سريانها السابق غير مسجل',
    }),
  )
  ctx.count('attendance_rule_version')
}

async function ruleSnapshot(ctx: Ctx, row: object, sourceType: string, sourceId: number): Promise<Record<string, any>> {
  try {
    return await attendanceSourceSnapshot(ctx.em, { ...(row as Rec) })
  } catch {
    ctx.flag('RULE_SNAPSHOT_POLICY_INVALID', `${sourceType}:${sourceId}`, 'إعدادات المرونة العامة غير صالحة — حُفظت لقطة المصدر بلا سياسة')
    return { ...(row as Rec) }
  }
}

// ===================== التشغيل =====================

export async function run(ctx: Ctx): Promise<void> {
  const state = await buildState(ctx)
  const board = loadBoard(ctx)
  await applyWorkDaySettings(ctx)
  await importShifts(ctx, state, board.shiftNames)
  await importWorkSchedules(ctx, state)
  const ruleExceptionIds = await importExceptionRules(ctx, state, board.mode)
  await flattenSchedules(ctx, state, board, ruleExceptionIds)
  await importDevices(ctx, state)
  const permitTypes = await importPermitTypes(ctx)
  await importExitPermits(ctx, state, permitTypes)
  await importRecordsAndPunches(ctx, state)
}

async function buildState(ctx: Ctx): Promise<State> {
  const em = ctx.em
  const today = localYmd(ctx.now)

  // دورة المسير: من بيانات القديم (payroll_cycle_type/start_day)، وإلا إعدادنا، وإلا 23 من الشهر السابق
  const formulas = new Map(readRaw<Rec>('attendance-payroll-formulas').map((r) => [str(r.key), str(r.value)]))
  let type: 'calendar' | 'custom' = 'custom'
  let startDay = 23
  if (formulas.has('payroll_cycle_type') || formulas.has('payroll_cycle_start_day')) {
    type = formulas.get('payroll_cycle_type') === 'calendar' ? 'calendar' : 'custom'
    const d = num(formulas.get('payroll_cycle_start_day'))
    if (type === 'custom' && d != null && d >= 1 && d <= 31) startDay = Math.round(d)
    else if (type === 'custom') ctx.flag('PAYROLL_CYCLE_DEFAULTED', null, 'يوم بداية الدورة غير صالح في النظام القديم — استُخدم 23')
  } else {
    const cfg = await em.findOneBy(RequestsConfig, { key: 'payroll.cycle_start_day' })
    const d = num(cfg?.value)
    if (d != null && d >= 1 && d <= 31) startDay = Math.round(d)
    ctx.flag('PAYROLL_CYCLE_DEFAULTED', null, 'إعداد دورة المسير غير مستخرج من النظام القديم — استُخدم إعداد نظامنا أو 23')
  }
  const window = { from: cycleStart(today, type, startDay), to: today }
  if (addDays(window.from, -1) < EXTRACT_FROM) {
    ctx.flag('PAYROLL_WINDOW_NOT_EXTRACTED', null, `بداية فترة المسير ${window.from} قبل بداية الاستخراج ${EXTRACT_FROM} — أعد الاستخراج بمدى أوسع`)
  }

  const emps = new Map<number, TargetEmp>()
  const byCode = new Map<string, number>()
  const rows = await em.find(Employee, {
    select: { id: true, employeeCode: true, fingerprintCode: true, branchId: true, workScheduleId: true, actualStartDate: true, joinDate: true },
  })
  const asDate = (v: unknown) => {
    const s = v instanceof Date ? localYmd(v) : ymdOf(v)
    return s && !Number.isNaN(Date.parse(`${s}T12:00:00Z`)) && s >= '1900-01-01' ? s : null
  }
  for (const e of rows) {
    emps.set(e.id, {
      id: e.id, startDate: asDate(e.actualStartDate) ?? asDate(e.joinDate), employeeCode: e.employeeCode,
      fingerprintCode: e.fingerprintCode ?? null, branchId: e.branchId ?? null, workScheduleId: e.workScheduleId ?? null,
    })
    if (e.employeeCode) byCode.set(e.employeeCode.toLowerCase(), e.id)
  }
  const srcEmps = new Map<string, Rec>()
  for (const e of readRaw<Rec>('attendance-employees')) if (str(e.id)) srcEmps.set(str(e.id), e)

  const branches = new Map<number, { weekendDays: string | null; isHeadquarters: boolean }>()
  let hqBranchId: number | null = null
  for (const b of await em.find(Branch, { order: { id: 'ASC' } })) {
    branches.set(b.id, { weekendDays: b.weekendDays ?? null, isHeadquarters: !!b.isHeadquarters })
    if (b.isHeadquarters && hqBranchId == null) hqBranchId = b.id
  }
  if (hqBranchId == null && branches.size) hqBranchId = [...branches.keys()][0]

  return {
    today,
    window,
    emps,
    srcEmps,
    branches,
    hqBranchId,
    shifts: new Map(),
    shiftNames: new Set(),
    schedules: [],
    schedByLegacy: new Map(),
    scheduleNames: new Set(),
    empId(legacyId, employeeNumber) {
      const mapped = idFrom(ctx, ['employee', 'employees'], legacyId)
      if (mapped) return mapped
      const code = str(employeeNumber) || str(srcEmps.get(str(legacyId))?.employee_number)
      return code ? byCode.get(code.toLowerCase()) : undefined
    },
    branchId: (legacyId) => idFrom(ctx, ['branch', 'branches'], legacyId),
    userId: (legacyId) => idFrom(ctx, ['user', 'users'], legacyId),
  }
}

// ===================== اللوحة الأسبوعية =====================

interface BoardEmp { employeeNumber: string; cells: Map<string, Rec> }
interface Board { mode: string | null; emps: Map<string, BoardEmp>; shiftNames: Map<string, string>; shiftCells: Map<string, Rec> }

function loadBoard(ctx: Ctx): Board {
  const board: Board = { mode: null, emps: new Map(), shiftNames: new Map(), shiftCells: new Map() }
  for (let i = 1; i <= MAX_BOARD_WEEKS; i++) {
    const pages = readRaw<Rec>(boardKey(i)).filter((p) => p && Array.isArray(p.rows))
    if (!pages.length) continue
    const seen = new Set<number>()
    let last = 0
    let weekStart = ''
    for (const page of pages) {
      board.mode ??= str(page.consumption_mode) || null
      weekStart ||= str(page.week_start)
      seen.add(Number(page.meta?.current_page ?? seen.size + 1))
      last = Math.max(last, Number(page.meta?.last_page ?? 0))
      for (const row of page.rows as Rec[]) {
        const legacy = str(row.employee_id)
        if (!legacy || !Array.isArray(row.cells)) continue
        const entry = board.emps.get(legacy) ?? { employeeNumber: str(row.employee_number), cells: new Map<string, Rec>() }
        for (const cell of row.cells as Rec[]) {
          const date = ymdOf(cell.date)
          if (!date) continue
          entry.cells.set(date, cell)
          const sid = str(cell.shift_id)
          if (sid && str(cell.shift_name)) board.shiftNames.set(sid, str(cell.shift_name))
          if (sid && !board.shiftCells.has(sid)) board.shiftCells.set(sid, cell)
        }
        board.emps.set(legacy, entry)
      }
    }
    if (last && seen.size < last) {
      ctx.flag('BOARD_PAGES_MISSING', weekStart || boardKey(i), `صفحات لوحة الأسبوع ناقصة (${seen.size} من ${last}) — موظفون بلا جدول مسطّح`)
    }
  }
  if (!board.emps.size) ctx.flag('BOARD_NOT_EXTRACTED', null, 'لوحة الجدولة الأسبوعية غير مستخرجة — لم تُنشأ جداول أسبوعية ولا تجاوزات أيام')
  return board
}

// ===================== إعدادات work_days =====================

async function applyWorkDaySettings(ctx: Ctx) {
  const days = readRaw<Rec>('attendance-work-days')
  // العطلة الأسبوعية العامة (يملكها هذا المجال): أيام work_days غير العاملة
  const dows = days.map((d) => intOrNull(d.day_of_week)).filter((d): d is number => d != null && d >= 0 && d <= 6)
  if (dows.length) {
    const working = new Set(days.filter((d) => bool(d.is_working_day)).map((d) => Number(d.day_of_week)))
    const weekend = WEEK_DAY_CODES.filter((_, i) => dows.includes(i) && !working.has(i)).join(',')
    if (!weekend || weekend.split(',').length === 7) {
      ctx.flag('WORK_DAYS_WEEKEND_INVALID', null, 'أيام العمل العامة في القديم بلا عطلة أو كلها عطلة — لم يُغيّر إعداد العطلة الأسبوعية')
    } else {
      const row = await ctx.em.findOneBy(RequestsConfig, { key: 'attendance.weekend_days' })
      if (row?.value !== weekend) {
        await ctx.em.save(RequestsConfig, ctx.em.create(RequestsConfig, { key: 'attendance.weekend_days', value: weekend }))
        ctx.count('setting_weekend_days')
      }
    }
  }
  const graces = days.map((d) => intOrNull(d.grace_period_minutes)).filter((g): g is number => g != null && g >= 0)
  if (!graces.length) return
  const freq = new Map<number, number>()
  for (const g of graces) freq.set(g, (freq.get(g) ?? 0) + 1)
  const grace = [...freq.entries()].sort((a, b) => b[1] - a[1] || a[0] - b[0])[0][0]
  if (freq.size > 1) ctx.flag('WORK_DAYS_GRACE_VARIES', null, 'سماحية التأخير تختلف بين أيام الأسبوع في القديم — طُبّقت القيمة الأكثر تكرارًا')
  const row = await ctx.em.findOneBy(RequestsConfig, { key: 'attendance.grace_minutes' })
  if (row?.value === String(grace)) return
  await ctx.em.save(RequestsConfig, ctx.em.create(RequestsConfig, { key: 'attendance.grace_minutes', value: String(grace) }))
  ctx.count('setting_grace_minutes')
}

// ===================== الورديات =====================

function mapShift(ctx: Ctx | null, legacyId: string, src: Rec): Rec {
  const flag = (kind: string, message: string) => ctx?.flag(kind, legacyId, message)
  const mode: 'fixed' | 'flexible' = str(src.mode) === 'flexible' ? 'flexible' : 'fixed'
  let start = hm(src.start_time)
  let end = hm(src.end_time)
  if (!start || !end) {
    flag('SHIFT_TIME_INVALID', 'وقت بداية أو نهاية الوردية مفقود/غير صالح — وُضع 00:00')
    start ??= '00:00'
    end ??= '00:00'
  }
  if (hasSeconds(src.start_time) || hasSeconds(src.end_time)) flag('SHIFT_TIME_SECONDS_DROPPED', 'أوقات الوردية فيها ثوانٍ — حُذفت')
  const rwm = intOrNull(src.required_work_minutes)
  const rh = num(src.required_hours)
  const requiredWorkMinutes = rwm ?? (rh != null ? Math.round(rh * 60) : null)
  const requiredHours = rh != null ? round2(rh) : rwm != null ? round2(rwm / 60) : null

  let flexWindowMinutes: number | null = null
  if (mode === 'flexible') {
    flexWindowMinutes = intOrNull(src.flex_window_minutes)
    const winEnd = hm(src.checkin_window_end)
    if (flexWindowMinutes == null && winEnd) flexWindowMinutes = (minutesOf(winEnd) - minutesOf(start) + 1440) % 1440
    if (flexWindowMinutes == null) flag('FLEX_WINDOW_UNKNOWN', 'وردية مرنة بلا نافذة دخول — نافذة المرونة فارغة')
  }
  if (num(src.grace_before) != null && num(src.grace_before) !== 0) flag('SHIFT_GRACE_BEFORE_DROPPED', 'سماحية الحضور المبكر غير مدعومة عندنا')
  if (num(src.late_out_grace_minutes) != null) flag('SHIFT_LATE_OUT_GRACE_DROPPED', 'سماحية الخروج المتأخر غير مدعومة عندنا')
  if ((num(src.break_duration_minutes) ?? 0) > 0) flag('SHIFT_BREAK_NOT_SUPPORTED', 'القديم يخصم الاستراحة من دقائق العمل؛ نظامنا لا يخصمها')
  if (str(src.missing_checkout_policy) && str(src.missing_checkout_policy) !== 'MANUAL_ONLY') {
    flag('SHIFT_CHECKOUT_POLICY_DROPPED', 'سياسة نسيان بصمة الانصراف مختلفة عن الافتراضي عندنا')
  }
  const otm = num(src.overtime_threshold_minutes)
  const otHours = otm == null ? null : round2(otm / 60)
  if (otm != null && otHours != null && Math.abs(otHours * 60 - otm) > 0.001) flag('SHIFT_OT_THRESHOLD_ROUNDED', 'عتبة الأوفرتايم بالدقائق قُرّبت لساعات بخانتين')
  if (src.is_overnight !== undefined && src.is_overnight !== null && bool(src.is_overnight) !== end < start) {
    flag('SHIFT_OVERNIGHT_MISMATCH', 'علم الوردية الليلية لا يطابق أوقات البداية والنهاية')
  }
  return {
    startTime: start,
    endTime: end,
    shiftMode: mode,
    flexEnabled: mode === 'flexible',
    flexWindowMinutes,
    requiredWorkMinutes,
    requiredHours,
    graceMinutes: intOrNull(src.grace_after) ?? intOrNull(src.grace_period_minutes),
    overtimeThresholdHours: otHours,
    checkinFrom: hm(src.checkin_window_start),
    checkinTo: hm(src.checkin_window_end),
    checkoutFrom: hm(src.checkout_window_start),
    checkoutTo: hm(src.checkout_window_end),
    isActive: bool(src.is_active, true),
    branchId: null,
  }
}

async function importShifts(ctx: Ctx, state: State, boardNames: Map<string, string>) {
  const em = ctx.em
  const existing = await em.find(Shift, { order: { id: 'ASC' } })
  const byName = new Map(existing.map((s) => [s.name.toLowerCase(), s]))
  for (const s of existing) state.shiftNames.add(s.name.toLowerCase())
  const imported = new Set<number>()

  const versions = new Map<string, Rec[]>()
  for (const group of readRawEach<Rec>('attendance-shift-versions')) {
    const list = group.items.flatMap((it) => (Array.isArray(it?.versions) ? (it.versions as Rec[]) : []))
    versions.set(group.id, list)
  }

  const sources = readRaw<Rec>('attendance-shifts').sort((a, b) => Number(a.id) - Number(b.id))
  for (const src of sources) {
    const legacyId = str(src.id)
    if (!legacyId) continue
    const known = ctx.ids.get('shift', legacyId)
    if (known) {
      const row = await em.findOneBy(Shift, { id: known })
      if (row) state.shifts.set(legacyId, { id: row.id, name: row.name, startTime: row.startTime, endTime: row.endTime })
      continue
    }
    const desired = boardNames.get(legacyId) || str(src.name) || `وردية ${legacyId}`
    const fields = mapShift(ctx, legacyId, src)
    const same = byName.get(trunc(desired, 100).toLowerCase())
    let row: Shift
    if (same && !imported.has(same.id)) {
      row = same
      Object.assign(row, fields)
      ctx.flag('SHIFT_MERGED_WITH_EXISTING', legacyId, 'وردية بنفس الاسم موجودة في إعدادات نظامنا — حُدّثت بقيم القديم')
    } else {
      row = em.create(Shift, {} as Shift)
      Object.assign(row, fields, { name: uniqueName(ctx, state.shiftNames, desired, legacyId, 'SHIFT') })
    }
    row = await em.save(Shift, row)
    imported.add(row.id)
    ctx.ids.set('shift', legacyId, row.id)
    state.shifts.set(legacyId, { id: row.id, name: row.name, startTime: row.startTime, endTime: row.endTime })
    ctx.count('shift')

    // نسخ الورديات: تغيير سرى داخل فترة المسير يُحفظ مؤرخًا حتى تُحسب أيام الفترة على الإعداد الساري يومها
    const list = [...(versions.get(legacyId) ?? [])].sort((a, b) => Number(a.version_no) - Number(b.version_no))
    const k = list.findIndex((v) => {
      const d = ymdOf(v.effective_from)
      return !!d && d > state.window.from && d <= state.today
    })
    const exists = await em.existsBy(AttendanceRuleVersion, { sourceType: 'SHIFT', sourceId: row.id })
    if (k > 0 && !exists) {
      const shape = (snap: unknown): Rec => {
        const data = typeof snap === 'string' ? safeJson(snap) : snap
        return { ...row, ...mapShift(null, legacyId, (data as Rec) ?? {}), id: row.id, name: row.name, branchId: null }
      }
      await saveBaseline(ctx, 'SHIFT', row.id, row, shape(list[k - 1].snapshot))
      let version = 1
      for (let j = k; j < list.length; j++) {
        const from = ymdOf(list[j].effective_from)
        if (!from) continue
        const snapshot = await ruleSnapshot(ctx, j === list.length - 1 ? row : shape(list[j].snapshot), 'SHIFT', row.id)
        await em.save(AttendanceRuleVersion, em.create(AttendanceRuleVersion, {
          sourceType: 'SHIFT', sourceId: row.id, version: version++, effectiveFrom: from, legacyBaseline: false, actorUserId: null, snapshot,
          reason: `ترحيل من النظام القديم — نسخة الوردية رقم ${str(list[j].version_no) || j + 1}`,
        }))
        ctx.count('attendance_rule_version_dated')
      }
    } else {
      await saveBaseline(ctx, 'SHIFT', row.id, row)
    }
  }
  const extra = existing.filter((s) => !imported.has(s.id)).length
  if (extra) ctx.flag('CONFIG_EXTRA_SHIFTS', null, `${extra} وردية في إعدادات نظامنا لا تقابلها وردية في القديم — تُركت كما هي`)
}

function safeJson(s: string): unknown {
  try {
    return JSON.parse(s)
  } catch {
    return null
  }
}

// وردية تشير إليها اللوحة وليست في القائمة (محذوفة في القديم) — تُنشأ غير نشطة من لقطة الخلية
async function ensureShift(ctx: Ctx, state: State, legacyId: string, cell: Rec | undefined): Promise<ShiftInfo> {
  const found = state.shifts.get(legacyId)
  if (found) return found
  const known = ctx.ids.get('shift', legacyId)
  if (known) {
    const row = await ctx.em.findOneBy(Shift, { id: known })
    if (row) {
      const info = { id: row.id, name: row.name, startTime: row.startTime, endTime: row.endTime }
      state.shifts.set(legacyId, info)
      return info
    }
  }
  const row = ctx.em.create(Shift, {} as Shift)
  Object.assign(row, {
    name: uniqueName(ctx, state.shiftNames, str(cell?.shift_name) || `وردية محذوفة ${legacyId}`, legacyId, 'SHIFT'),
    startTime: hm(cell?.scheduled_start) ?? '00:00',
    endTime: hm(cell?.scheduled_end) ?? '00:00',
    shiftMode: 'fixed',
    flexEnabled: false,
    isActive: false,
    branchId: null,
  })
  const saved = await ctx.em.save(Shift, row)
  ctx.flag('SHIFT_NOT_IN_LIST', legacyId, 'وردية مستخدمة في الجدول وغير موجودة في قائمة الورديات (محذوفة؟) — أُنشئت غير نشطة من لقطة الجدول')
  ctx.ids.set('shift', legacyId, saved.id)
  await saveBaseline(ctx, 'SHIFT', saved.id, saved)
  ctx.count('shift_placeholder')
  const info = { id: saved.id, name: saved.name, startTime: saved.startTime, endTime: saved.endTime }
  state.shifts.set(legacyId, info)
  return info
}

// ===================== جداول العمل =====================

const DAY_NAMES: Record<string, number> = {
  sunday: 0, sun: 0, monday: 1, mon: 1, tuesday: 2, tue: 2, wednesday: 3, wed: 3, thursday: 4, thu: 4, friday: 5, fri: 5, saturday: 6, sat: 6,
}
// work_days القديمة بأشكالها: [0,1,2] أيام عمل | {"0":true} | {"sunday":true} | {"0":{"is_working_day":true}}
function workingDowsOf(value: unknown): Set<number> | null {
  const v = typeof value === 'string' ? safeJson(value) : value
  const out = new Set<number>()
  const truthy = (x: unknown) => (x && typeof x === 'object' ? bool((x as Rec).is_working_day ?? (x as Rec).working ?? (x as Rec).isWorking) : bool(x))
  if (Array.isArray(v)) {
    for (const x of v) if (Number.isInteger(x) && Number(x) >= 0 && Number(x) <= 6) out.add(Number(x))
  } else if (v && typeof v === 'object') {
    let recognized = false
    for (const [key, val] of Object.entries(v as Rec)) {
      const dow = /^\d$/.test(key) ? Number(key) : DAY_NAMES[key.toLowerCase()]
      if (dow === undefined || dow > 6) continue
      recognized = true
      if (truthy(val)) out.add(dow)
    }
    if (!recognized) return null
  } else return null
  return out.size ? out : null
}
const weekendFromWorking = (working: Set<number>) => WEEK_DAY_CODES.filter((_, i) => !working.has(i)).join(',')

async function importWorkSchedules(ctx: Ctx, state: State) {
  const em = ctx.em
  const existing = await em.find(WorkSchedule, { order: { id: 'ASC' } })
  for (const s of existing) state.scheduleNames.add(s.name.toLowerCase())
  const byName = new Map(existing.map((s) => [s.name.toLowerCase(), s]))
  const touched = new Set<number>()
  const sources = readRaw<Rec>('attendance-work-schedules').sort((a, b) => Number(a.id) - Number(b.id))
  const defaultLegacy = sources.find((s) => bool(s.is_default))
  let importedDefaultId: number | null = null

  for (const src of sources) {
    const legacyId = str(src.id)
    if (!legacyId) continue
    const known = ctx.ids.get('work_schedule', legacyId)
    let row: WorkSchedule | null = known ? await em.findOneBy(WorkSchedule, { id: known }) : null
    if (!row) {
      const working = workingDowsOf(src.work_days)
      let weekendDays = 'FRI,SAT'
      if (!working) ctx.flag('WORK_SCHEDULE_WEEKEND_DEFAULTED', legacyId, 'أيام العمل غير مقروءة — وُضعت عطلة الجمعة والسبت')
      else if (working.size === 7) {
        weekendDays = ''
        ctx.flag('WORK_SCHEDULE_NO_WEEKEND', legacyId, 'جدول بلا عطلة أسبوعية — شاشة الجداول عندنا تطلب يومًا واحدًا عند التعديل')
      } else weekendDays = weekendFromWorking(working)
      const hours = (src.work_hours && typeof src.work_hours === 'object' ? src.work_hours : safeJson(str(src.work_hours))) as Rec | null
      let startTime = hm(hours?.start)
      let endTime = hm(hours?.end)
      if (!startTime || !endTime) {
        ctx.flag('WORK_SCHEDULE_HOURS_DEFAULTED', legacyId, 'ساعات الجدول مفقودة — وُضع 08:00-17:00')
        startTime ??= '08:00'
        endTime ??= '17:00'
      }
      if (Array.isArray(src.rules) && src.rules.length) ctx.flag('WORK_SCHEDULE_RULES_DROPPED', legacyId, 'قواعد الجدول (JSON) لا مقابل لها عندنا')
      const isDefault = !!defaultLegacy && str(defaultLegacy.id) === legacyId
      if (bool(src.is_default) && !isDefault) ctx.flag('WORK_SCHEDULE_DEFAULT_DUPLICATE', legacyId, 'أكثر من جدول افتراضي في القديم — بقي الأقدم فقط')
      const fields = {
        description: str(src.description) ? trunc(str(src.description), 200) : null,
        weekendDays, startTime, endTime, flexEnabled: false, flexWindowMinutes: null, requiredWorkMinutes: null,
        isDefault, isActive: true, branchId: null,
      }
      const desired = str(src.name) || `جدول ${legacyId}`
      const same = byName.get(trunc(desired, 100).toLowerCase())
      if (same && !touched.has(same.id)) {
        row = same
        Object.assign(row, fields)
        ctx.flag('WORK_SCHEDULE_MERGED_WITH_EXISTING', legacyId, 'جدول بنفس الاسم موجود في إعدادات نظامنا — حُدّث بقيم القديم')
      } else {
        row = em.create(WorkSchedule, {} as WorkSchedule)
        Object.assign(row, fields, { name: uniqueName(ctx, state.scheduleNames, desired, legacyId, 'WORK_SCHEDULE') })
      }
      row = await em.save(WorkSchedule, row)
      ctx.ids.set('work_schedule', legacyId, row.id)
      ctx.count('work_schedule')
    }
    touched.add(row.id)
    if (row.isDefault) importedDefaultId = row.id
  }

  if (importedDefaultId != null) {
    const others = await em.find(WorkSchedule, { where: { isDefault: true } })
    for (const o of others) {
      if (o.id === importedDefaultId) continue
      o.isDefault = false
      await em.save(WorkSchedule, o)
      ctx.flag('CONFIG_DEFAULT_SCHEDULE_REPLACED', null, 'الجدول الافتراضي صار جدول القديم — أُسقط العلم عن جدول إعدادات نظامنا')
    }
  } else if (!(await em.existsBy(WorkSchedule, { isDefault: true, isActive: true }))) {
    // لا افتراضي هنا ولا هناك: من work_days القديمة (آخر مرجع لمحرك القديم)
    const days = readRaw<Rec>('attendance-work-days').sort((a, b) => Number(a.day_of_week) - Number(b.day_of_week))
    const working = days.filter((d) => bool(d.is_working_day))
    if (working.length) {
      const row = em.create(WorkSchedule, {} as WorkSchedule)
      Object.assign(row, {
        name: uniqueName(ctx, state.scheduleNames, 'الدوام الافتراضي (مرحّل)', 'work_days', 'WORK_SCHEDULE'),
        description: 'من أيام العمل الافتراضية في النظام القديم',
        weekendDays: weekendFromWorking(new Set(working.map((d) => Number(d.day_of_week)))),
        startTime: hm(working[0].start_time) ?? '08:00',
        endTime: hm(working[0].end_time) ?? '17:00',
        flexEnabled: false, isDefault: true, isActive: true, branchId: null,
      })
      await em.save(WorkSchedule, row)
      ctx.count('work_schedule_default_from_work_days')
    }
  }

  const all = await em.find(WorkSchedule, { order: { id: 'ASC' } })
  for (const s of all) {
    if (touched.has(s.id) || s.name === 'الدوام الافتراضي (مرحّل)') await saveBaseline(ctx, 'WORK_SCHEDULE', s.id, s)
  }
  state.schedules = all.map((s) => ({
    id: s.id, name: s.name, weekendDays: normalizeWeekendDays(s.weekendDays ?? ''), startTime: s.startTime, endTime: s.endTime,
    isDefault: !!s.isDefault, isActive: !!s.isActive,
  }))
  for (const src of sources) {
    const id = ctx.ids.get('work_schedule', str(src.id))
    const info = id ? state.schedules.find((s) => s.id === id) : undefined
    if (info) state.schedByLegacy.set(str(src.id), info)
  }
  const extra = existing.filter((s) => !touched.has(s.id)).length
  if (extra) ctx.flag('CONFIG_EXTRA_WORK_SCHEDULES', null, `${extra} جدول عمل في إعدادات نظامنا لا يقابله جدول في القديم — تُرك كما هو`)
}

// ===================== قواعد الاستثناء الشهرية =====================

const OCCURRENCE: Record<string, ScheduleExceptionRule['occurrence']> = { every: 'ALL', first: '1ST', second: '2ND', third: '3RD', fourth: '4TH', last: 'LAST' }

async function importExceptionRules(ctx: Ctx, state: State, mode: string | null): Promise<Set<string>> {
  const em = ctx.em
  const imported = new Set<string>() // معرّفات استثناءات القديم الممثلة بقاعدة
  const scopes = new Set<number>() // 0 = عام
  const seenKeys = new Set<string>()
  const add = async (kind: string, legacyId: string, rule: Omit<ScheduleExceptionRule, 'id'>) => {
    const key = `${rule.branchId ?? 0}|${rule.weekday}|${rule.occurrence}`
    if (rule.isActive && seenKeys.has(key)) ctx.flag('EXCEPTION_PRIORITY_DROPPED', legacyId, 'قاعدتان نشطتان لنفس اليوم والترتيب — الأولوية لا تُنقل')
    if (rule.isActive) seenKeys.add(key)
    if (!ctx.ids.get(kind, legacyId)) {
      const saved = await em.save(ScheduleExceptionRule, em.create(ScheduleExceptionRule, rule))
      ctx.ids.set(kind, legacyId, saved.id)
      ctx.count('schedule_exception_rule')
      scopes.add(rule.branchId ?? 0)
    }
  }

  const exceptions = readRaw<Rec>('attendance-schedule-exceptions').sort((a, b) => Number(a.id) - Number(b.id))
  for (const ex of exceptions) {
    const legacyId = str(ex.id)
    const effect = str(ex.effect)
    const scope = str(ex.scope_type) || 'company'
    const active = bool(ex.is_active, true)
    if (effect === 'change_shift') continue // يُسطّح تجاوزات أيام
    const recurring = str(ex.match_type) === 'recurring' && (!str(ex.period) || str(ex.period) === 'month')
    const dow = intOrNull(ex.day_of_week)
    const occurrence = OCCURRENCE[str(ex.position) || 'every']
    // المؤرخة (specific_date/date_range) تُفحص يومًا بيوم في التسطيح
    if (!recurring || dow == null || dow < 0 || dow > 6 || !occurrence) continue
    if (scope !== 'company' && scope !== 'branch') {
      if (active) ctx.flag('EXCEPTION_SCOPE_FLATTENED', legacyId, `استثناء متكرر على نطاق ${scope} — يُمثّل بتجاوزات أيام حتى نهاية الشهر القادم فقط`)
      continue
    }
    let branchId: number | null = null
    if (scope === 'branch') {
      const mapped = state.branchId(ex.scope_id)
      if (!mapped) {
        ctx.flag('EXCEPTION_BRANCH_UNMAPPED', legacyId, 'فرع الاستثناء غير مستورد — لم تُنشأ القاعدة')
        continue
      }
      branchId = mapped
    }
    await add('schedule_exception', legacyId, {
      name: trunc(str(ex.name) || `استثناء ${legacyId}`, 200), weekday: WEEK_DAY_CODES[dow] as ScheduleExceptionRule['weekday'],
      occurrence, effect: effect === 'off_to_work' ? 'WORK' : 'OFF', branchId: branchId as number, isActive: active,
    })
    imported.add(legacyId)
  }

  // أنماط أيام العمل تسري في وضع «المنشور» فقط لدى القديم
  if (mode === 'published') {
    for (const p of readRaw<Rec>('attendance-working-day-patterns')) {
      const scope = str(p.scope_type) || 'company'
      const liveTo = ymdOf(p.effective_to)
      const patternActive = str(p.status) === 'active' && (!liveTo || liveTo >= state.today)
      if (!Array.isArray(p.rules)) continue
      let branchId: number | null = null
      if (scope === 'branch') branchId = state.branchId(p.scope_id) ?? null
      if ((scope !== 'company' && scope !== 'branch') || (scope === 'branch' && branchId == null)) {
        if (patternActive && p.rules.length) ctx.flag('PATTERN_SCOPE_DROPPED', str(p.id), `قواعد نمط أيام عمل على نطاق ${scope} لا مقابل لها — تُمثّل بتجاوزات أيام فقط`)
        continue
      }
      for (const r of p.rules as Rec[]) {
        const dow = intOrNull(r.day_of_week)
        const occurrence = OCCURRENCE[str(r.position) || 'every']
        const type = str(r.rule_type)
        if (dow == null || dow < 0 || dow > 6 || !occurrence || (type !== 'make_working' && type !== 'make_off')) continue
        await add('working_day_pattern_rule', `${str(p.id)}:${str(r.id)}`, {
          name: trunc(`${str(p.name) || 'نمط'} — ${type === 'make_working' ? 'دوام' : 'عطلة'} ${WEEK_DAY_CODES[dow]} ${occurrence}`, 200),
          weekday: WEEK_DAY_CODES[dow] as ScheduleExceptionRule['weekday'], occurrence, effect: type === 'make_working' ? 'WORK' : 'OFF',
          branchId: branchId as number, isActive: patternActive && bool(r.is_active, true),
        })
      }
    }
  }

  // نسخة التقويم الأساسية (إن كتبها مجال org) يجب أن تطابق القواعد الجديدة وإلا صار التقويم «منحرفًا»
  for (const id of scopes) {
    const scope = id === 0 ? 'GLOBAL' : 'BRANCH'
    try {
      const read = await readCalendarSource(em, scope, id)
      if (read.currentMatchesHistory || !read.versions.length) continue
      const only = read.versions.length === 1 && read.versions[0].legacyBaseline
      if (!only) {
        ctx.flag('CALENDAR_VERSION_DRIFT', `${scope}:${id}`, 'للتقويم نسخ مؤرخة لا تشمل قواعد الاستثناء المستوردة — يلزم تسجيل تغيير تقويم')
        continue
      }
      await em.update(AttendanceRuleVersion, { id: read.versions[0].id }, { snapshot: calendarVersionEnvelope(scope, id, 0, null, read.current) as Rec })
      ctx.count('calendar_baseline_synced')
    } catch {
      ctx.flag('CALENDAR_VERSION_UNREADABLE', `${scope}:${id}`, 'تعذرت قراءة نسخ التقويم لمزامنة قواعد الاستثناء')
    }
  }
  return imported
}

// ===================== تسطيح الجدول الفعلي =====================

const OFF = 'OFF'
function cellKey(cell: Rec): string {
  if (!bool(cell.is_working)) return OFF
  if (str(cell.shift_id)) return `S:${str(cell.shift_id)}`
  const s = hm(cell.scheduled_start)
  const e = hm(cell.scheduled_end)
  return s && e ? `D:${s}-${e}` : 'D:none'
}
// الأكثر تكرارًا؛ التعادل يُحسم بترتيب prefer (الأسبق أولى)
const topKey = (counts: Map<string, number>, prefer: Array<string | null>): string | null => {
  const rank = (k: string | null) => (k == null ? Number.MAX_SAFE_INTEGER : prefer.indexOf(k) < 0 ? prefer.length : prefer.indexOf(k))
  let best: string | null = null
  let bestN = -1
  for (const [k, n] of counts) {
    if (n > bestN || (n === bestN && rank(k) < rank(best))) {
      best = k
      bestN = n
    }
  }
  return best
}

async function flattenSchedules(ctx: Ctx, state: State, board: Board, ruleExceptionIds: Set<string>) {
  const em = ctx.em
  if (!board.emps.size) return
  const globalWeekend = normalizeWeekendDays((await em.findOneBy(RequestsConfig, { key: 'attendance.weekend_days' }))?.value || 'FRI,SAT')
  const defaultSched = state.schedules.find((s) => s.isDefault && s.isActive) ?? null
  const derived = new Map<string, SchedInfo>()
  const handled = new Set<number>()

  const allDates = [...board.emps.values()].flatMap((e) => [...e.cells.keys()]).sort()
  const [minDate, maxDate] = [allDates[0], allDates[allDates.length - 1]]
  const existingEntries = new Set(
    (await em.find(ScheduleEntry, { where: { weekStart: Between(weekStartOf(minDate), maxDate) }, select: { employeeId: true, weekStart: true } }))
      .map((r) => `${r.employeeId}|${String(r.weekStart).slice(0, 10)}`),
  )
  const existingOverrides = new Set(
    (await em.find(ScheduleDayOverride, { where: { date: Between(minDate, maxDate) }, select: { employeeId: true, date: true } }))
      .map((r) => `${r.employeeId}|${String(r.date).slice(0, 10)}`),
  )
  const entries: Array<Partial<ScheduleEntry>> = []
  const overrides: Array<Partial<ScheduleDayOverride>> = []

  const findOrCreateSchedule = async (weekend: string, start: string, end: string): Promise<SchedInfo> => {
    const key = `${weekend}|${start}|${end}`
    const cached = derived.get(key)
    if (cached) return cached
    let found = state.schedules.find((s) => s.isActive && s.weekendDays === weekend && s.startTime === start && s.endTime === end)
    if (!found) {
      const row = em.create(WorkSchedule, {} as WorkSchedule)
      Object.assign(row, {
        name: uniqueName(ctx, state.scheduleNames, `مرحّل: عطلة ${weekend || 'بلا'} ${start}-${end}`, key, 'WORK_SCHEDULE'),
        description: 'أُنشئ من الجدول الفعلي في النظام القديم (أيام العطلة الأسبوعية للموظف)',
        weekendDays: weekend, startTime: start, endTime: end, flexEnabled: false, isDefault: false, isActive: true, branchId: null,
      })
      const saved = await em.save(WorkSchedule, row)
      await saveBaseline(ctx, 'WORK_SCHEDULE', saved.id, saved)
      ctx.count('work_schedule_derived')
      found = { id: saved.id, name: saved.name, weekendDays: weekend, startTime: start, endTime: end, isDefault: false, isActive: true }
      state.schedules.push(found)
    }
    derived.set(key, found)
    return found
  }

  for (const [legacy, entry] of [...board.emps.entries()].sort((a, b) => Number(a[0]) - Number(b[0]))) {
    const empId = state.empId(legacy, entry.employeeNumber)
    const emp = empId ? state.emps.get(empId) : undefined
    if (!emp) {
      ctx.flag('SCHEDULE_EMPLOYEE_UNMAPPED', legacy, 'موظف في لوحة الجدولة غير مستورد — لم يُسطّح جدوله')
      continue
    }
    const cells = [...entry.cells.entries()].sort((a, b) => a[0].localeCompare(b[0]))

    // 1) العطلة الأسبوعية الفعلية: اليوم الذي يغلب فيه «عطلة» على مدى الأفق (التعادل → دوام)
    const perDow = Array.from({ length: 7 }, () => ({ work: 0, off: 0 }))
    const workingCounts = new Map<string, number>()
    for (const [date, cell] of cells) {
      const k = cellKey(cell)
      if (k === OFF) perDow[dowOf(date)].off++
      else {
        perDow[dowOf(date)].work++
        workingCounts.set(k, (workingCounts.get(k) ?? 0) + 1)
      }
    }
    const offDows = new Set(perDow.map((c, i) => (c.off > c.work ? i : -1)).filter((i) => i >= 0))
    if (offDows.size === 7 || !workingCounts.size) {
      ctx.flag('SCHEDULE_ALWAYS_OFF', legacy, 'الموظف بلا أي يوم عمل في أفق الجدول — لم يُغيّر جدوله')
      continue
    }
    handled.add(emp.id)
    const weekend = WEEK_DAY_CODES.filter((_, i) => offDows.has(i)).join(',')
    const dominant = topKey(workingCounts, [])!

    // 2) جدول العمل: جدول القديم لو عطلته مطابقة، وإلا جدول مشتق (مع تنبيه عند التعارض)
    const src = state.srcEmps.get(legacy)
    const srcSched = src?.work_schedule_id != null ? state.schedByLegacy.get(str(src.work_schedule_id)) : undefined
    const branchWeekend = emp.branchId ? state.branches.get(emp.branchId)?.weekendDays : null
    const inherited = normalizeWeekendDays(branchWeekend || globalWeekend)
    let target: SchedInfo | null
    if (srcSched && srcSched.weekendDays === weekend) target = srcSched
    else if (!srcSched && weekend === inherited) target = null
    else {
      const defaultHours = topKey(new Map([...workingCounts].filter(([k]) => k.startsWith('D:') && k !== 'D:none')), [])
      let start = defaultSched?.startTime ?? '08:00'
      let end = defaultSched?.endTime ?? '17:00'
      if (defaultHours) [start, end] = defaultHours.slice(2).split('-')
      else if (dominant.startsWith('S:')) {
        const sh = await ensureShift(ctx, state, dominant.slice(2), board.shiftCells.get(dominant.slice(2)))
        ;[start, end] = [sh.startTime, sh.endTime]
      }
      if (srcSched) ctx.flag('SCHEDULE_WEEKEND_CONFLICT', legacy, 'عطلة جدول عمل الموظف في القديم تخالف جدوله الفعلي — اعتُمد الفعلي (جدول مشتق)')
      target = await findOrCreateSchedule(weekend, start, end)
    }
    await setEmployeeSchedule(ctx, emp, target?.id ?? null)
    const base = target ?? defaultSched
    const baseKey = base ? `D:${base.startTime}-${base.endTime}` : null

    // 3) وردية غالبة لكل أسبوع → weekly_schedule_entries؛ 4) الأيام المختلفة → schedule_day_overrides
    const weeks = new Map<string, Array<[string, Rec]>>()
    for (const c of cells) {
      const ws = weekStartOf(c[0])
      weeks.set(ws, [...(weeks.get(ws) ?? []), c])
    }
    for (const [ws, weekCells] of weeks) {
      const counts = new Map<string, number>()
      for (const [, cell] of weekCells) {
        const k = cellKey(cell)
        if (k !== OFF && k !== 'D:none') counts.set(k, (counts.get(k) ?? 0) + 1)
      }
      const chosen = topKey(counts, [baseKey, dominant])
      let weekKey = baseKey
      if (chosen && chosen !== baseKey) {
        const snap = await snapshotFor(ctx, state, board, chosen, weekCells.find(([, c]) => cellKey(c) === chosen)?.[1])
        if (existingEntries.has(`${emp.id}|${ws}`)) ctx.count('schedule_entry_existing')
        else {
          entries.push({ weekStart: ws, employeeId: emp.id, ...snap })
          existingEntries.add(`${emp.id}|${ws}`)
        }
        weekKey = chosen
      }
      for (const [date, cell] of weekCells) {
        const k = cellKey(cell)
        const dow = dowOf(date)
        const exId = cell.exception ? str(cell.exception.id) : ''
        const byRule = !!exId && ruleExceptionIds.has(exId)
        if (k === OFF) {
          if (!offDows.has(dow) && !str(cell.holiday_name) && !byRule) {
            ctx.flag('OFF_DAY_UNREPRESENTABLE', `${legacy}:${date}`, 'يوم عطلة مؤرخ لموظف (استثناء/نمط) لا يمثّله نظامنا — سيُعامل يوم عمل؛ راجعه')
          }
          continue
        }
        if (k === 'D:none') {
          ctx.flag('WORK_DAY_HOURS_UNKNOWN', `${legacy}:${date}`, 'يوم عمل بلا وردية ولا ساعات في القديم — لم يُنشأ تجاوز')
          continue
        }
        if (offDows.has(dow) && !byRule) {
          ctx.flag('WORK_ON_WEEKEND_UNREPRESENTABLE', `${legacy}:${date}`, 'يوم عمل على يوم عطلة الموظف لا يمثّله نظامنا — سيُعامل عطلة؛ راجعه')
        }
        if (k === weekKey) continue
        if (existingOverrides.has(`${emp.id}|${date}`)) {
          ctx.count('schedule_override_existing')
          continue
        }
        overrides.push({ employeeId: emp.id, date, ...(await snapshotFor(ctx, state, board, k, cell)) })
        existingOverrides.add(`${emp.id}|${date}`)
      }
    }
  }

  for (const batch of chunk(entries, safeBatchSize(6))) await em.insert(ScheduleEntry, batch as ScheduleEntry[])
  for (const batch of chunk(overrides, safeBatchSize(6))) await em.insert(ScheduleDayOverride, batch as ScheduleDayOverride[])
  ctx.count('schedule_entry', entries.length)
  ctx.count('schedule_day_override', overrides.length)

  // من ليسوا في اللوحة (غير نشطين): جدول عملهم كما في القديم
  for (const [legacy, src] of state.srcEmps) {
    if (src.work_schedule_id == null) continue
    const empId = state.empId(legacy)
    const emp = empId ? state.emps.get(empId) : undefined
    if (!emp || handled.has(emp.id)) continue
    const sched = state.schedByLegacy.get(str(src.work_schedule_id))
    if (!sched) ctx.flag('EMPLOYEE_WORK_SCHEDULE_UNMAPPED', legacy, 'جدول عمل الموظف في القديم غير مستورد (محذوف؟) — بقي بلا جدول')
    await setEmployeeSchedule(ctx, emp, sched?.id ?? emp.workScheduleId)
  }
}

async function snapshotFor(ctx: Ctx, state: State, board: Board, key: string, cell: Rec | undefined) {
  if (key.startsWith('S:')) {
    const legacyShift = key.slice(2)
    const sh = await ensureShift(ctx, state, legacyShift, cell ?? board.shiftCells.get(legacyShift))
    return { shiftId: sh.id, shiftName: trunc(sh.name, 100), startTime: sh.startTime, endTime: sh.endTime }
  }
  const [start, end] = key.slice(2).split('-')
  return { shiftId: null as unknown as number, shiftName: 'دوام افتراضي', startTime: start, endTime: end }
}

// جدول عمل الموظف + نسخة الدوام EMPLOYEE: مجال الموظفين يؤجلها لمن له جدول في القديم، ويكتبها بجدول فارغ لغيره؛
// هنا تُكتب إن غابت (من تاريخ بدء العمل، نفس صيغة مجال الموظفين)، وتُصحَّح إن حملت قيمة مختلفة حتى يقرأ التقويم نفس الجدول
async function setEmployeeSchedule(ctx: Ctx, emp: TargetEmp, scheduleId: number | null) {
  if (emp.workScheduleId !== scheduleId) {
    await ctx.em.update(Employee, { id: emp.id }, { workScheduleId: scheduleId as unknown as number })
    emp.workScheduleId = scheduleId
    ctx.count('employee_work_schedule_set')
  }
  const versions = await ctx.em.find(AttendanceRuleVersion, { where: { sourceType: 'EMPLOYEE', sourceId: emp.id } })
  if (!versions.length) {
    const effectiveFrom = emp.startDate ?? localYmd(ctx.now)
    if (!emp.startDate) ctx.flag('EMPLOYEE_RULE_START_UNKNOWN', `new:${emp.id}`, 'موظف بلا تاريخ بدء صالح — نسخة الدوام من تاريخ الترحيل')
    try {
      await appendAttendanceRuleVersion(ctx.em, {
        sourceType: 'EMPLOYEE', sourceId: emp.id, before: { workScheduleId: null, flexOverrideMode: 'INHERIT' },
        snapshot: { workScheduleId: scheduleId, flexOverrideMode: 'INHERIT' },
        effectiveFrom, actorUserId: ctx.ids.get('system_user', 'migration'),
        reason: 'دوام الموظف مرحّل من النظام القديم من تاريخ بدء العمل',
      })
      ctx.count('attendance_rule_version')
    } catch {
      ctx.flag('EMPLOYEE_RULE_NOT_DOCUMENTED', `new:${emp.id}`, 'تعذر تسجيل نسخة دوام الموظف')
    }
    return
  }
  for (const v of versions) {
    const snap = (v.snapshot ?? {}) as Rec
    if (snap.workScheduleId === scheduleId || (v.legacyBaseline && snap.workScheduleId == null)) continue
    await ctx.em.update(AttendanceRuleVersion, { id: v.id }, { snapshot: { ...snap, workScheduleId: scheduleId } as Rec })
    ctx.count('employee_rule_version_synced')
  }
}

// ===================== الأجهزة =====================

async function importDevices(ctx: Ctx, state: State) {
  const em = ctx.em
  for (const d of readRaw<Rec>('attendance-devices').sort((a, b) => Number(a.id) - Number(b.id))) {
    const legacyId = str(d.id)
    if (!legacyId || ctx.ids.get('device', legacyId)) continue
    const serialNumber = `LEGACY-DEV-${legacyId}`
    const existing = await em.findOneBy(BiometricDevice, { serialNumber })
    if (existing) {
      ctx.ids.set('device', legacyId, existing.id)
      continue
    }
    let branchId = d.branch_id != null ? state.branchId(d.branch_id) : undefined
    if (!branchId) {
      if (state.hqBranchId == null) {
        ctx.flag('DEVICE_NO_BRANCH', legacyId, 'لا يوجد أي فرع مستورد — لم يُستورد الجهاز')
        continue
      }
      branchId = state.hqBranchId
      ctx.flag('DEVICE_BRANCH_DEFAULTED', legacyId, 'فرع الجهاز غير محدد/غير مستورد — رُبط بالمركز الرئيسي')
    }
    ctx.flag('DEVICE_SERIAL_PLACEHOLDER', legacyId, 'القديم لا يخزن الرقم التسلسلي — وُضع رقم مؤقت؛ يجب استبداله قبل أول مزامنة')
    ctx.flag('DEVICE_COMM_KEY_HIDDEN', legacyId, 'مفتاح اتصال الجهاز مخفي في الـAPI القديم — أدخله يدويًا إن لم يكن 0')
    if (str(d.connection_mode) === 'push') ctx.flag('DEVICE_PUSH_MODE', legacyId, 'جهاز بوضع الدفع — أعد ضبط الوكيل بمفتاح الأجهزة الجديد')
    const ip = str(d.ip_address)
    if (ip.length > 50) ctx.flag('DEVICE_IP_TRUNCATED', legacyId, 'عنوان الجهاز أطول من 50 حرفًا — اقتُطع')
    const status = [str(d.sync_status), str(d.error_message)].filter(Boolean).join(': ')
    const row = em.create(BiometricDevice, {} as BiometricDevice)
    Object.assign(row, {
      name: trunc(str(d.name) || `جهاز ${legacyId}`, 100),
      serialNumber,
      branchId,
      ip: ip ? trunc(ip, 50) : null,
      port: intOrNull(d.port) ?? 4370,
      authKey: null,
      lastSyncAt: isoDate(d.last_sync_at),
      lastStatus: status ? trunc(status, 300) : null,
      lastSyncCount: 0,
      isActive: bool(d.is_active, true),
    })
    const saved = await em.save(BiometricDevice, row)
    ctx.ids.set('device', legacyId, saved.id)
    ctx.count('biometric_device')
  }
}

// ===================== أنواع الأذونات والأذونات =====================

async function importPermitTypes(ctx: Ctx): Promise<Map<string, { id: number; name: string }>> {
  const em = ctx.em
  const out = new Map<string, { id: number; name: string }>()
  const existing = await em.find(PermissionType, { order: { id: 'ASC' } })
  const byName = new Map(existing.map((t) => [t.nameAr.toLowerCase(), t]))
  const taken = new Set(existing.map((t) => t.nameAr.toLowerCase()))
  const touched = new Set<number>()
  const sources = readRaw<Rec>('attendance-permit-types').sort((a, b) => (num(a.sort_order) ?? 0) - (num(b.sort_order) ?? 0) || Number(a.id) - Number(b.id))
  for (const t of sources) {
    const legacyId = str(t.id)
    if (!legacyId) continue
    const known = ctx.ids.get('permission_type', legacyId)
    if (known) {
      const row = await em.findOneBy(PermissionType, { id: known })
      if (row) {
        out.set(legacyId, { id: row.id, name: row.nameAr })
        touched.add(row.id)
      }
      continue
    }
    const count = intOrNull(t.monthly_count_limit)
    const minutes = intOrNull(t.monthly_minutes_limit)
    if (count != null && minutes != null) ctx.flag('PERMIT_TYPE_BOTH_LIMITS', legacyId, 'حد مرات وحد دقائق معًا — القديم يعتمد الدقائق عند اجتماعهما')
    let pct = 100
    const rate = num(t.deduction_rate)
    if (rate != null && rate > 0) pct = Math.min(999.99, round2(rate * 100))
    else if (rate != null) ctx.flag('PERMIT_TYPE_RATE_DEFAULTED', legacyId, 'نسبة خصم صفرية/سالبة — القديم يعاملها 100%')
    const dtype = str(t.deduction_type)
    if (dtype && dtype !== 'full' && dtype !== 'none') ctx.flag('PERMIT_TYPE_DEDUCTION_RULE_DROPPED', legacyId, `نوع الخصم «${dtype}» وعتبته لا مقابل لهما عندنا`)
    if (bool(t.requires_attachment)) ctx.flag('PERMIT_TYPE_ATTACHMENT_RULE_DROPPED', legacyId, 'اشتراط المرفق لا مقابل له عندنا')
    const kind = str(t.kind)
    const timing = str(t.timing)
    const fields = {
      isDeductible: str(t.financial_effect) === 'deduct',
      maxDurationMinutes: intOrNull(t.max_duration_minutes),
      monthlyFreeCount: count,
      monthlyFreeMinutes: minutes,
      deductionPct: pct,
      coverage: kind === 'late_arrival' ? 'morning' : timing === 'morning' ? 'morning' : timing === 'evening' ? 'evening' : 'both',
      isActive: bool(t.is_active, true),
    }
    const desired = str(t.name_ar) || str(t.name) || `إذن ${legacyId}`
    const same = byName.get(trunc(desired, 100).toLowerCase())
    let row: PermissionType
    if (same && !touched.has(same.id)) {
      row = same
      Object.assign(row, fields)
      ctx.flag('PERMIT_TYPE_MERGED_WITH_EXISTING', legacyId, 'نوع إذن بنفس الاسم موجود في إعدادات نظامنا — حُدّث بقيم القديم')
    } else {
      row = em.create(PermissionType, {} as PermissionType)
      Object.assign(row, fields, { nameAr: uniqueName(ctx, taken, desired, legacyId, 'PERMIT_TYPE') })
    }
    row = await em.save(PermissionType, row)
    touched.add(row.id)
    ctx.ids.set('permission_type', legacyId, row.id)
    out.set(legacyId, { id: row.id, name: row.nameAr })
    ctx.count('permission_type')
  }
  const extra = existing.filter((t) => !touched.has(t.id)).length
  if (extra) ctx.flag('CONFIG_EXTRA_PERMIT_TYPES', null, `${extra} نوع إذن في إعدادات نظامنا لا يقابله نوع في القديم — تُرك كما هو`)
  return out
}

async function importExitPermits(ctx: Ctx, state: State, types: Map<string, { id: number; name: string }>) {
  const em = ctx.em
  const rows = new Map<string, Rec>()
  for (const p of [...readRaw<Rec>('attendance-exit-permits'), ...readRaw<Rec>('attendance-exit-permits-pending')]) if (str(p.id)) rows.set(str(p.id), p)
  for (const p of [...rows.values()].sort((a, b) => Number(a.id) - Number(b.id))) {
    const legacyId = str(p.id)
    const status = str(p.status)
    const date = ymdOf(p.date)
    const inWindow = !!date && date >= state.window.from && date <= state.window.to
    if (status !== 'pending' && !inWindow) continue
    if (ctx.ids.get('exit_permit', legacyId)) continue
    const empId = state.empId(p.employee_id, p.employee?.employee_number)
    const emp = empId ? state.emps.get(empId) : undefined
    if (!emp) {
      ctx.flag('PERMIT_EMPLOYEE_UNMAPPED', legacyId, 'صاحب الإذن غير مستورد — لم يُستورد الإذن')
      continue
    }
    const from = hm(p.departure_time)
    const to = hm(p.return_time)
    if (!date || !from || !to || minutesOf(to) <= minutesOf(from)) {
      ctx.flag('PERMIT_TIME_INVALID', legacyId, 'تاريخ/وقت الإذن غير صالح (العودة قبل الخروج؟) — استُورد كما هو لمراجعة HR')
    }
    const type = types.get(str(p.permit_type_id))
    if (!type) ctx.flag('PERMIT_TYPE_UNMAPPED', legacyId, 'نوع الإذن غير موجود — سيُعامل كنوع مجهول (خصم كامل)')
    if (bool(p.deduction_waived)) ctx.flag('PERMIT_DEDUCTION_WAIVED', legacyId, 'خصم الإذن معفى في القديم — نظامنا لا يحفظ الإعفاء؛ يلزم إعادة الإعفاء')
    const reqStatus = status === 'approved' ? 'COMPLETED' : status === 'rejected' ? 'REJECTED' : 'DRAFT'
    if (reqStatus === 'DRAFT') {
      ctx.flag('PERMIT_PENDING_AS_DRAFT', legacyId, status === 'pending'
        ? 'إذن معلق في القديم — استُورد مسودة لصاحبه؛ يلزم تقديمه ليمر بسلسلة اعتمادنا'
        : `حالة إذن غير معروفة «${status}» — استُورد مسودة`)
    }
    const createdAt = isoDate(p.created_at) ?? ctx.now
    const payload = {
      date, from, to,
      permissionTypeId: type?.id ?? null,
      permissionType: type?.name ?? null,
      reason: str(p.reason) || null,
      legacy: {
        exitPermitId: Number(legacyId),
        actualDeparture: hm(p.actual_departure_time),
        actualReturn: hm(p.actual_return_time),
        durationMinutes: intOrNull(p.duration_minutes),
        deductionMinutes: intOrNull(p.deduction_minutes),
        effectiveDeductionMinutes: intOrNull(p.effective_deduction_minutes),
        deductionWaived: bool(p.deduction_waived),
        waivedReason: str(p.deduction_waived_reason) || null,
        approvedBy: intOrNull(p.approved_by),
        approvedAt: str(p.approved_at) || null,
        rejectionReason: str(p.rejection_reason) || null,
        approvalStatus: str(p.approval?.status) || null,
      },
    }
    const result = await em.insert(Request, {
      typeCode: 'PERMISSION',
      definitionCode: null,
      requesterId: emp.id,
      createdByUserId: null as unknown as number,
      branchId: emp.branchId as number,
      status: reqStatus,
      currentStep: null as unknown as number,
      payload: JSON.stringify(payload),
      createdAt,
      submittedAt: (reqStatus === 'DRAFT' ? null : createdAt) as Date,
      completedAt: (reqStatus === 'COMPLETED' ? isoDate(p.approved_at) ?? isoDate(p.updated_at) : reqStatus === 'REJECTED' ? isoDate(p.updated_at) : null) as Date,
    })
    const newId = Number(result.identifiers[0]?.id)
    ctx.ids.set('exit_permit', legacyId, newId)
    ctx.count(`permission_request_${reqStatus.toLowerCase()}`)
  }
}

// ===================== سجلات الحضور والبصمات =====================

function dayStatusOf(ctx: Ctx, r: Rec): AttendanceStatus | null {
  switch (str(r.day_status).toUpperCase()) {
    case 'PRESENT': return 'present'
    case 'LATE': return 'late'
    case 'INCOMPLETE': return 'missing_punch'
    case 'ABSENT': return 'absent'
    case 'ON_LEAVE': return 'leave'
    case 'HOLIDAY': return 'holiday'
    case 'WEEKLY_REST': return null
  }
  switch (str(r.status)) {
    case 'present': return !str(r.check_out) ? 'missing_punch' : (num(r.late_minutes) ?? 0) > 0 ? 'late' : 'present'
    case 'absent': return 'absent'
    case 'on_leave': return 'leave'
    case 'holiday': return 'holiday'
    case 'off_day': return null
  }
  ctx.flag('ATTENDANCE_STATUS_UNKNOWN', str(r.id), 'حالة يوم غير معروفة — استُوردت «حاضر» للمراجعة')
  return 'present'
}

async function importRecordsAndPunches(ctx: Ctx, state: State) {
  const em = ctx.em
  const punchFrom = addDays(state.window.from, -1)
  const records = new Map<string, Rec>()
  for (const r of readRaw<Rec>('attendance-records')) if (str(r.id)) records.set(str(r.id), r)
  const ledger = new Map<string, Rec>()
  for (const g of readRawEach<Rec>('attendance-record-punches')) if (g.items[0]) ledger.set(g.id, g.items[0])

  const existingPunches = new Set(
    (await em.find(AttendancePunch, {
      where: { punchTime: Between(new Date(`${punchFrom}T00:00:00`), new Date(`${addDays(state.window.to, 2)}T00:00:00`)) },
      select: { employeeId: true, punchTime: true },
    })).map((p) => `${p.employeeId}|${new Date(p.punchTime).getTime()}`),
  )
  const existingDays = new Set(
    (await em.find(AttendanceDay, { where: { date: Between(state.window.from, state.window.to) }, select: { employeeId: true, date: true } }))
      .map((d) => `${d.employeeId}|${String(d.date).slice(0, 10)}`),
  )
  const flaggedEmp = new Set<string>()
  const punches: Array<Partial<AttendancePunch>> = []
  const days: Array<Partial<AttendanceDay>> = []

  const sorted = [...records.values()].sort((a, b) => str(a.date).localeCompare(str(b.date)) || Number(a.id) - Number(b.id))
  for (const r of sorted) {
    const legacyId = str(r.id)
    const date = ymdOf(r.date)
    if (!date || date < punchFrom || date > state.window.to) continue
    const empId = state.empId(r.employee_id, r.employee?.employee_number)
    const emp = empId ? state.emps.get(empId) : undefined
    if (!emp) {
      ctx.flag('ATTENDANCE_EMPLOYEE_UNMAPPED', legacyId, 'صاحب سجل الحضور غير مستورد — لم يُستورد السجل')
      continue
    }
    let code = emp.fingerprintCode || emp.employeeCode
    if (!emp.fingerprintCode && !flaggedEmp.has(`fp:${emp.id}`)) {
      flaggedEmp.add(`fp:${emp.id}`)
      ctx.flag('PUNCH_NO_FINGERPRINT_CODE', str(r.employee_id), 'موظف بلا كود بصمة — بصماته المرحّلة تحمل كود الموظف')
    }
    if (code.length > 20) {
      if (!flaggedEmp.has(`len:${emp.id}`)) ctx.flag('PUNCH_CODE_TRUNCATED', str(r.employee_id), 'كود البصمة أطول من 20 حرفًا — اقتُطع في سجل البصمات (الربط بمعرّف الموظف)')
      flaggedEmp.add(`len:${emp.id}`)
      code = code.slice(0, 20)
    }

    // البصمات: أول/آخر من السجل + دفتر البصمات (يدوي/تصحيح/استيراد)
    const add = (w: { date: string; hms: string } | null, source: 'DEVICE' | 'MANUAL', reason: string, createdByUserId?: number) => {
      if (!w) return
      const time = localDateTime(w)
      if (Number.isNaN(time.getTime())) return
      const key = `${emp.id}|${time.getTime()}`
      if (existingPunches.has(key)) return
      existingPunches.add(key)
      punches.push({ employeeCode: code, employeeId: emp.id, punchTime: time, deviceSn: null as unknown as string, source,
        createdByUserId: (createdByUserId ?? null) as unknown as number, reason: trunc(reason, 500) })
    }
    const ci = wall(r.check_in)
    const co = wall(r.check_out)
    const methodIn = str(r.check_in_method)
    const methodOut = str(r.check_out_method)
    add(ci, methodIn === 'biometric' ? 'DEVICE' : 'MANUAL', `مرحّل من النظام القديم: ${methodIn || 'غير محدد'} / دخول`)
    if (co && (!ci || co.date !== ci.date || co.hms !== ci.hms)) add(co, methodOut === 'biometric' ? 'DEVICE' : 'MANUAL', `مرحّل من النظام القديم: ${methodOut || 'غير محدد'} / خروج`)
    if ((ci && methodIn && methodIn !== 'biometric') || (co && methodOut && methodOut !== 'biometric')) {
      ctx.flag('PUNCH_NON_DEVICE_TIMEZONE', legacyId, 'بصمة ويب/GPS/QR/يدوية — القديم قد يخزنها بتوقيت UTC؛ تحقق من الوقت')
    }
    for (const p of (Array.isArray(ledger.get(legacyId)?.punches) ? (ledger.get(legacyId)!.punches as Rec[]) : [])) {
      const src = str(p.source)
      add(wall(p.punched_at), src === 'import' ? 'DEVICE' : 'MANUAL', `مرحّل من النظام القديم: ${src || 'غير محدد'} / ${str(p.direction) || '—'}`, state.userId(p.created_by))
    }

    // اليوم المحسوب كما هو في القديم — لفترة المسير فقط
    if (date < state.window.from) continue
    if (existingDays.has(`${emp.id}|${date}`)) continue
    const status = dayStatusOf(ctx, r)
    if (!status) {
      ctx.count('attendance_day_weekly_rest_skipped')
      continue
    }
    if (co && co.date !== date) ctx.flag('ATTENDANCE_OVERNIGHT_CHECKOUT', legacyId, 'الانصراف في يوم تالٍ — حُفظ وقته فقط في اليوم')
    const shift = str(r.shift_id) ? state.shifts.get(str(r.shift_id)) : undefined
    const start = hm(r.scheduled_start)
    const reviewReason = [str(r.review_reason), str(r.dst_note)].filter(Boolean).join(' | ')
    existingDays.add(`${emp.id}|${date}`)
    days.push({
      employeeId: emp.id,
      branchId: emp.branchId as number,
      date,
      checkIn: (ci?.hm ?? null) as string,
      checkOut: (co?.hm ?? null) as string,
      shiftName: trunc(shift?.name || str(r.shift?.name) || (start ? 'دوام افتراضي' : 'بلا وردية'), 100),
      shiftStart: start ?? '',
      shiftEnd: hm(r.scheduled_end) ?? '',
      shiftId: (shift?.id ?? null) as number,
      scheduleSource: str(r.shift_id) ? 'week' : start ? 'default' : 'none',
      unscheduled: !start && status === 'present',
      status,
      lateMinutes: int0(num(r.effective_lateness_minutes) ?? r.late_minutes),
      earlyLeaveMinutes: int0(r.early_departure_minutes),
      excusedMinutes: int0(r.excused_lateness_minutes) + int0(r.leave_credit_minutes),
      deductibleMinutes: 0,
      workMinutes: int0(r.total_work_minutes),
      rawLateMinutes: intOrNull(r.raw_lateness_minutes),
      unexcusedLateMinutes: intOrNull(r.late_minutes),
      shortfallMinutes: intOrNull(r.shortfall_minutes),
      countedWorkMinutes: intOrNull(r.total_work_minutes),
      earlyArrivalMinutes: intOrNull(r.early_arrival_minutes),
      flexOutcome: null,
      attendanceReviewRequired: bool(r.review_flag),
      attendanceReviewReason: reviewReason ? trunc(reviewReason, 500) : null,
      attendanceRuleSnapshot: null,
      leaveConflict: false,
      punchAnomalies: null as unknown as string,
      graceUsed: null as unknown as number,
      computedAt: (isoDate(r.updated_at) ?? ctx.now) as Date,
    })
  }

  for (const batch of chunk(punches, safeBatchSize(8))) await em.insert(AttendancePunch, batch as AttendancePunch[])
  for (const batch of chunk(days, safeBatchSize(32))) await em.insert(AttendanceDay, batch as AttendanceDay[])
  ctx.count('attendance_punch', punches.length)
  ctx.count('attendance_day', days.length)
  if (!records.size) ctx.flag('ATTENDANCE_RECORDS_NOT_EXTRACTED', null, 'سجلات الحضور غير مستخرجة — لم تُستورد أيام ولا بصمات')
}
