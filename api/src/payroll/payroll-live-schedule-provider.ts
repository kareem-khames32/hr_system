import { BadRequestException } from '@nestjs/common'
import { EntityManager } from 'typeorm'
import { createCalendarResolverCache, resolveEmployeeCalendarDay, type ResolvedCalendarDay } from '../attendance/attendance-calendar-resolver'
import { PAYROLL_LIVE_SOURCE_ROW_LIMIT, PayrollLiveSourceIssue, PayrollLiveSourceSection, PayrollLiveSourceState, payrollLiveSourcePeriod } from './payroll-live-source-contract'

type Row = Record<string, any>
type RuleType = 'EMPLOYEE' | 'SHIFT' | 'WORK_SCHEDULE'
const validId = (value: unknown): value is number => typeof value === 'number' && Number.isSafeInteger(value) && value > 0 && value <= 2147483647
const validDate = (value: unknown): value is string => typeof value === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(value) && !value.startsWith('0000-') && Number.isFinite(Date.parse(`${value}T00:00:00Z`)) && new Date(`${value}T00:00:00Z`).toISOString().slice(0, 10) === value
const time = (value: unknown): value is string => typeof value === 'string' && /^([01]\d|2[0-3]):[0-5]\d$/.test(value)
const text = (value: unknown, max: number): value is string => typeof value === 'string' && value.length <= max
const bit = (value: unknown): value is boolean => typeof value === 'boolean'
const minutes = (value: unknown): value is number => typeof value === 'number' && Number.isSafeInteger(value) && value > 0 && value <= 1440
const weekdayCodes = ['SUN', 'MON', 'TUE', 'WED', 'THU', 'FRI', 'SAT']
const weekend = (value: unknown): value is string => text(value, 40) && (value === '' || value.split(',').every(day => weekdayCodes.includes(day))) && new Set(value.split(',')).size === value.split(',').length
const addDays = (date: string, n: number) => new Date(Math.min(Date.parse('9999-12-31T00:00:00Z'), Math.max(Date.parse('0001-01-01T00:00:00Z'), Date.parse(`${date}T00:00:00Z`) + n * 86400000))).toISOString().slice(0, 10)
const weekOf = (date: string) => addDays(date, -new Date(`${date}T00:00:00Z`).getUTCDay())
const unique = (values: string[]) => [...new Set(values)].sort()
const issue = (code: string, message: string, sourceRef?: string): PayrollLiveSourceIssue => ({ code, message, ...(sourceRef ? { sourceRef } : {}) })
const plain = (value: unknown): value is Row => !!value && typeof value === 'object' && !Array.isArray(value) && Object.getPrototypeOf(value) === Object.prototype
const schemaMissing = (error: any) => [207, 208].includes(error?.number ?? error?.driverError?.number ?? error?.originalError?.info?.number)
function freeze<T>(value: T): T { if (value && typeof value === 'object') { Object.values(value).forEach(freeze); Object.freeze(value) }; return value }

interface RuleEvidence {
  sourceRef: string; sourceType: RuleType | null; sourceId: number | null; versionId: number | null
  version: number | null; effectiveFrom: string | null; legacyBaseline: boolean | null
  state: 'AVAILABLE' | 'UNSUPPORTED' | 'INVALID'
  snapshot: { state: 'AVAILABLE' | 'INVALID'; raw: string | null; value: Row | null; omitted: boolean; rawLength: number | null }
}

/** أوقات مؤرخة مع تقويم صريح؛ القيم الحالية تبقى وصفًا تشخيصيًا ولا تملأ فجوة تاريخية. */
export async function readPayrollLiveSchedule(em: EntityManager, employeeId: number, periodStart: string, periodEnd: string): Promise<PayrollLiveSourceSection> {
  if (!validId(employeeId)) throw new BadRequestException({ code: 'LIVE_SOURCE_EMPLOYEE_INVALID', message: 'معرف موظف صحيح موجب مطلوب' })
  const period = payrollLiveSourcePeriod(periodStart, periodEnd)
  if (!em.queryRunner?.isTransactionActive) throw new Error('Payroll schedule source read requires an active transaction')
  const issues: PayrollLiveSourceIssue[] = [], sourceRefs: string[] = []
  let state: PayrollLiveSourceState = 'AVAILABLE', limited = false, rawCharacters = 0, jsonNodes = 0
  const report = (code: string, message: string, ref?: string, invalid = true) => {
    issues.push(issue(code, message, ref)); if (invalid) state = 'INVALID'
  }
  const params = [employeeId, periodStart, periodEnd, weekOf(periodStart)]
  let employeeRows: Row[], weeklyRows: Row[], overrideRows: Row[], versionRows: Row[], configRows: Row[], holidayRows: Row[], exceptionRows: Row[]
  try {
    employeeRows = await em.query(`SELECT e.[id], e.[branchId], e.[workScheduleId], b.[id] AS [branchSourceId], b.[country], b.[weekendDays]
      FROM [employees] e LEFT JOIN [branches] b ON b.[id]=e.[branchId] WHERE e.[id]=@0`, params)
    if (!employeeRows.length) return { state: 'MISSING', data: null, issues: [issue('SCHEDULE_EMPLOYEE_MISSING', 'سجل الموظف غير موجود لقراءة الجدول')], sourceRefs: [] }
    weeklyRows = await em.query(`SELECT TOP (5001) [id], [employeeId], CONVERT(varchar(10), [weekStart], 23) AS [weekStart], [shiftId], [shiftName], [startTime], [endTime]
      FROM [weekly_schedule_entries] WHERE [employeeId]=@0 AND [weekStart]>=@3 AND [weekStart]<=@2 ORDER BY [weekStart], [id]`, params)
    overrideRows = await em.query(`SELECT TOP (5001) [id], [employeeId], CONVERT(varchar(10), [date], 23) AS [date], [shiftId], [shiftName], [startTime], [endTime]
      FROM [schedule_day_overrides] WHERE [employeeId]=@0 AND [date]>=@1 AND [date]<=@2 ORDER BY [date], [id]`, params)
    versionRows = await em.query(`SELECT TOP (5001) v.[id], v.[sourceType], v.[sourceId], v.[version], CONVERT(varchar(10), v.[effectiveFrom], 23) AS [effectiveFrom], v.[legacyBaseline], v.[snapshot] AS [snapshotRaw]
      FROM [attendance_rule_versions] v WHERE (v.[sourceType]='EMPLOYEE' AND v.[sourceId]=@0) OR v.[sourceType]='WORK_SCHEDULE'
        OR (v.[sourceType]='SHIFT' AND (EXISTS (SELECT 1 FROM [weekly_schedule_entries] w WHERE w.[employeeId]=@0 AND w.[weekStart]>=@3 AND w.[weekStart]<=@2 AND w.[shiftId]=v.[sourceId])
          OR EXISTS (SELECT 1 FROM [schedule_day_overrides] d WHERE d.[employeeId]=@0 AND d.[date]>=@1 AND d.[date]<=@2 AND d.[shiftId]=v.[sourceId])))
      ORDER BY v.[sourceType], v.[sourceId], v.[effectiveFrom], v.[version], v.[id]`, params)
    configRows = await em.query(`SELECT TOP (5001) [key], [value] FROM [requests_config] WHERE [key]='attendance.weekend_days' ORDER BY [key]`, params)
    holidayRows = await em.query(`SELECT TOP (5001) [id], [name], CONVERT(varchar(10), [date], 23) AS [date], CONVERT(varchar(10), [endDate], 23) AS [endDate], [country]
      FROM [public_holidays] WHERE [date]<=@2 AND ([endDate]>=@1 OR ([endDate] IS NULL AND [date]>=@1))
      AND (NULLIF(LTRIM(RTRIM([country])), '') IS NULL OR EXISTS (SELECT 1 FROM [employees] e JOIN [branches] b ON b.[id]=e.[branchId]
        WHERE e.[id]=@0 AND (NULLIF(LTRIM(RTRIM(b.[country])), '') IS NULL OR UPPER(LTRIM(RTRIM(b.[country])))=UPPER(LTRIM(RTRIM([public_holidays].[country])))))) ORDER BY [date], [id]`, params)
    exceptionRows = await em.query(`SELECT TOP (5001) [id], [name], [weekday], [occurrence], [effect], [branchId], [isActive]
      FROM [schedule_exception_rules] WHERE [branchId] IS NULL OR [branchId]=(SELECT [branchId] FROM [employees] WHERE [id]=@0) ORDER BY [id]`, params)
  } catch (error) {
    if (!schemaMissing(error)) throw error
    return { state: 'MISSING', data: null, issues: [issue('SCHEDULE_SCHEMA_MISSING', 'أحد جداول أو أعمدة أدلة الجدول غير متاح؛ لم يُفترض جدول بديل')], sourceRefs: [] }
  }
  const allGroups = [employeeRows, weeklyRows, overrideRows, versionRows, configRows, holidayRows, exceptionRows]
  if (allGroups.some(rows => !Array.isArray(rows))) throw new Error('Invalid schedule query result')
  if (allGroups.some(rows => rows.length > PAYROLL_LIVE_SOURCE_ROW_LIMIT) || allGroups.reduce((n, rows) => n + rows.length, 0) > PAYROLL_LIVE_SOURCE_ROW_LIMIT) {
    limited = true; report('SCHEDULE_SOURCE_LIMIT', 'أدلة الجدول تتجاوز حد 5000 صف؛ القراءة غير مكتملة ولا تثبت أوقات الأيام', undefined, false)
  }
  // حد واحد لكل الأدلة المعادة، بالإضافة إلى الحد المنفصل لكل استعلام.
  let remainingRows = PAYROLL_LIVE_SOURCE_ROW_LIMIT
  const take = (rows: Row[]) => { const result = rows.slice(0, Math.max(0, remainingRows)); remainingRows -= result.length; return result }
  ;[employeeRows, weeklyRows, overrideRows, versionRows, configRows, holidayRows, exceptionRows] = allGroups.map(take)
  const employee = employeeRows[0], employeeRef = `employees:${employeeId}`
  sourceRefs.push(employeeRef)
  if (employeeRows.length !== 1 || employee?.id !== employeeId || (employee?.branchId != null && !validId(employee.branchId)) || (employee?.workScheduleId != null && !validId(employee.workScheduleId))) report('SCHEDULE_EMPLOYEE_INVALID', 'مرجع الموظف أو فرعه أو جدول العمل الحالي غير صالح', employeeRef)
  const branchRef = validId(employee?.branchSourceId) ? `branches:${employee.branchSourceId}` : null
  if (branchRef) sourceRefs.push(branchRef)
  if (employee?.branchSourceId !== employee?.branchId || (employee?.country != null && !text(employee.country, 5)) || (employee?.weekendDays != null && !weekend(employee.weekendDays))) report('SCHEDULE_BRANCH_CALENDAR_INVALID', 'إعدادات تقويم الفرع الحالية ناقصة أو غير صالحة؛ لا تستخدم بدل النسخ المؤرخة', branchRef ?? employeeRef, false)

  const plans = (rows: Row[], kind: 'WEEK' | 'OVERRIDE') => {
    const dates = new Set<string>(), ids = new Set<number>()
    return rows.map(row => {
      const table = kind === 'WEEK' ? 'weekly_schedule_entries' : 'schedule_day_overrides'
      const ref = validId(row.id) ? `${table}:${row.id}` : table, date = kind === 'WEEK' ? row.weekStart : row.date
      sourceRefs.push(ref)
      const valid = validId(row.id) && !ids.has(row.id) && row.employeeId === employeeId && validDate(date) && !dates.has(date) &&
        (kind === 'WEEK' ? date === weekOf(date) && date >= params[3] && date <= periodEnd : date >= periodStart && date <= periodEnd) &&
        (row.shiftId == null || validId(row.shiftId)) && text(row.shiftName, 100) && time(row.startTime) && time(row.endTime) && row.startTime !== row.endTime
      if (!valid) report('SCHEDULE_ASSIGNMENT_INVALID', 'إسناد وردية مكرر أو خارج الفترة أو يحمل بيانات غير صالحة', ref)
      ids.add(row.id); dates.add(date)
      return { kind, sourceRef: ref, recordedFrom: validDate(date) ? date : null, recordedTo: validDate(date) ? (kind === 'WEEK' ? addDays(date, 6) : date) : null,
        shiftId: validId(row.shiftId) ? row.shiftId : null, shiftName: text(row.shiftName, 100) ? row.shiftName : null,
        startTime: time(row.startTime) ? row.startTime : null, endTime: time(row.endTime) ? row.endTime : null, valid }
    })
  }
  const weekly = plans(weeklyRows, 'WEEK'), overrides = plans(overrideRows, 'OVERRIDE')
  const selectedShiftIds = new Set([...weekly, ...overrides].flatMap(row => row.shiftId == null ? [] : [row.shiftId]))
  const seenIds = new Set<number>(), seenVersions = new Set<string>()
  const readJson = (raw: unknown): RuleEvidence['snapshot'] => {
    const rawLength = typeof raw === 'string' ? raw.length : null
    const stored = typeof raw === 'string' ? raw.slice(0, Math.min(40000, Math.max(0, 500000 - rawCharacters))) : null
    rawCharacters += stored?.length ?? 0
    const omitted = typeof raw !== 'string' || stored?.length !== raw.length
    const invalid: RuleEvidence['snapshot'] = { state: 'INVALID', raw: stored, rawLength, value: null, omitted }
    if (typeof raw !== 'string' || omitted) return invalid
    try {
      const parsed: unknown = JSON.parse(raw)
      const inspect = (node: unknown, depth = 0): boolean => {
        if (++jsonNodes > 100000 || depth > 16) return false
        if (node === null || typeof node === 'boolean' || typeof node === 'string') return true
        if (typeof node === 'number') return Number.isFinite(node) && (!Number.isInteger(node) || Number.isSafeInteger(node))
        if (Array.isArray(node)) return node.every(child => inspect(child, depth + 1))
        return plain(node) && Object.entries(node).every(([key, value]) => !['__proto__', 'constructor', 'prototype'].includes(key) && inspect(value, depth + 1))
      }
      if (!plain(parsed) || !inspect(parsed)) return invalid
      return { state: 'AVAILABLE', raw: stored, rawLength, value: parsed, omitted: false }
    } catch { return invalid }
  }
  const rules: RuleEvidence[] = versionRows.map(row => {
    const sourceRef = validId(row.id) ? `attendance_rule_versions:${row.id}` : 'attendance_rule_versions'
    sourceRefs.push(sourceRef)
    const key = `${row.sourceType}:${row.sourceId}:${row.version}`
    const snapshot = readJson(row.snapshotRaw)
    const type = ['EMPLOYEE', 'SHIFT', 'WORK_SCHEDULE'].includes(row.sourceType) ? row.sourceType as RuleType : null
    let valid = validId(row.id) && !seenIds.has(row.id) && type !== null && validId(row.sourceId) && Number.isSafeInteger(row.version) && row.version >= 0 && row.version <= 2147483647 && !seenVersions.has(key) && bit(row.legacyBaseline) &&
      ((row.legacyBaseline === true && row.effectiveFrom === null && row.version === 0) || (row.legacyBaseline === false && validDate(row.effectiveFrom) && row.version > 0)) &&
      (type !== 'EMPLOYEE' || row.sourceId === employeeId) && (type !== 'SHIFT' || selectedShiftIds.has(row.sourceId)) && snapshot.state === 'AVAILABLE'
    seenIds.add(row.id); seenVersions.add(key)
    const data = snapshot.value
    if (data) {
      if (type === 'EMPLOYEE') valid = valid && Object.keys(data).every(key => ['workScheduleId', 'flexOverrideMode'].includes(key)) &&
        (data.workScheduleId === null || validId(data.workScheduleId)) && ['INHERIT', 'ENABLED', 'DISABLED'].includes(data.flexOverrideMode)
      else valid = valid && time(data.startTime) && time(data.endTime) && data.startTime !== data.endTime && text(data.name, 100) && bit(data.isActive) &&
        (data.requiredWorkMinutes == null || minutes(data.requiredWorkMinutes)) && (data.flexEnabled == null || bit(data.flexEnabled)) &&
        (data.flexWindowMinutes == null || minutes(data.flexWindowMinutes)) && (type !== 'WORK_SCHEDULE' || (weekend(data.weekendDays) && bit(data.isDefault))) &&
        !(data.flexEnabled === true && (!minutes(data.flexWindowMinutes) || !minutes(data.requiredWorkMinutes) || data.flexWindowMinutes >= data.requiredWorkMinutes))
    }
    if (!valid) report(snapshot.state === 'INVALID' ? 'SCHEDULE_RULE_JSON_INVALID' : 'SCHEDULE_RULE_INVALID', 'نسخة إعداد دوام تالفة أو مكررة أو ذات سريان غير صالح؛ لم تستخدم كبديل تاريخي', sourceRef)
    return { sourceRef, sourceType: type, sourceId: validId(row.sourceId) ? row.sourceId : null, versionId: validId(row.id) ? row.id : null,
      version: Number.isSafeInteger(row.version) && row.version >= 0 && row.version <= 2147483647 ? row.version : null, effectiveFrom: validDate(row.effectiveFrom) ? row.effectiveFrom : null,
      legacyBaseline: bit(row.legacyBaseline) ? row.legacyBaseline : null, state: !valid ? 'INVALID' : row.legacyBaseline ? 'UNSUPPORTED' : 'AVAILABLE', snapshot }
  })
  const ruleView = (row: RuleEvidence | null) => row && ({ sourceRef: row.sourceRef, sourceType: row.sourceType, sourceId: row.sourceId, versionId: row.versionId, version: row.version, effectiveFrom: row.effectiveFrom, legacyBaseline: row.legacyBaseline })
  const ruleAt = (type: RuleType, id: number, date: string): RuleEvidence | null => {
    const candidates = rules.filter(row => row.sourceType === type && row.sourceId === id)
    // قد يكون الصف التالف هو النسخة السارية؛ لا نتجاوزه بصمت لاختيار نسخة أقدم سليمة.
    if (candidates.some(row => row.state === 'INVALID')) return candidates.find(row => row.state === 'INVALID')!
    return candidates.filter(row => row.effectiveFrom !== null && row.effectiveFrom <= date).sort((a, b) => b.effectiveFrom!.localeCompare(a.effectiveFrom!) || b.version! - a.version!)[0]
      ?? candidates.find(row => row.legacyBaseline) ?? null
  }
  const config = configRows.map(row => {
    const ref = 'requests_config:attendance.weekend_days'; sourceRefs.push(ref)
    if (row.key !== 'attendance.weekend_days' || !weekend(row.value) || configRows.length !== 1) report('SCHEDULE_GLOBAL_CALENDAR_INVALID', 'إعداد العطلة الأسبوعية العام الحالي مكرر أو غير صالح', ref, false)
    return { key: text(row.key, 100) ? row.key : null, value: text(row.value, 500) ? row.value : null, sourceRef: ref }
  })
  const holidayIds = new Set<number>()
  const branchCountry = employee?.country == null ? '' : text(employee.country, 5) ? employee.country.trim().toUpperCase() : null
  const holidays = holidayRows.flatMap(row => {
    // حماية إضافية لنتيجة الاستعلام: لا نعيد اسمًا أو معرفًا لعطلة خارج النطاق الحالي.
    if (!text(row.country, 5) || branchCountry === null || (branchCountry !== '' && row.country.trim() !== '' && row.country.trim().toUpperCase() !== branchCountry)) {
      report('SCHEDULE_HOLIDAY_SCOPE_INVALID', 'تضمنت نتيجة قراءة العطلات سجلًا خارج دولة الفرع الحالي أو غير محدد النطاق؛ حجبت تفاصيله', 'public_holidays')
      return []
    }
    const ref = validId(row.id) ? `public_holidays:${row.id}` : 'public_holidays'; sourceRefs.push(ref)
    if (!validId(row.id) || holidayIds.has(row.id) || !text(row.name, 200) || !validDate(row.date) || (row.endDate != null && (!validDate(row.endDate) || row.endDate < row.date)) || !text(row.country, 5) || row.date > periodEnd || (row.endDate ?? row.date) < periodStart) report('SCHEDULE_HOLIDAY_INVALID', 'سجل عطلة رسمية مكرر أو خارج الفترة أو غير صالح', ref)
    holidayIds.add(row.id)
    return [{ id: validId(row.id) ? row.id : null, name: text(row.name, 200) ? row.name : null, date: validDate(row.date) ? row.date : null, endDate: validDate(row.endDate) ? row.endDate : null,
      country: row.country, sourceRef: ref }]
  })
  const exceptionIds = new Set<number>()
  const exceptions = exceptionRows.flatMap(row => {
    if (row.branchId !== null && (!validId(row.branchId) || row.branchId !== employee?.branchId)) {
      report('SCHEDULE_EXCEPTION_SCOPE_INVALID', 'تضمنت نتيجة قراءة قواعد التقويم سجلًا خارج الفرع الحالي أو غير محدد النطاق؛ حجبت تفاصيله', 'schedule_exception_rules')
      return []
    }
    const ref = validId(row.id) ? `schedule_exception_rules:${row.id}` : 'schedule_exception_rules'; sourceRefs.push(ref)
    if (!validId(row.id) || exceptionIds.has(row.id) || !text(row.name, 200) || !weekdayCodes.includes(row.weekday) || !['ALL', '1ST', '2ND', '3RD', '4TH', 'LAST'].includes(row.occurrence) || !['WORK', 'OFF'].includes(row.effect) || (row.branchId != null && !validId(row.branchId)) || !bit(row.isActive)) report('SCHEDULE_EXCEPTION_INVALID', 'قاعدة استثناء تقويم مكررة أو غير صالحة', ref)
    exceptionIds.add(row.id)
    return [{ id: validId(row.id) ? row.id : null, name: text(row.name, 200) ? row.name : null, weekday: weekdayCodes.includes(row.weekday) ? row.weekday : null,
      occurrence: ['ALL', '1ST', '2ND', '3RD', '4TH', 'LAST'].includes(row.occurrence) ? row.occurrence : null, effect: ['WORK', 'OFF'].includes(row.effect) ? row.effect : null,
      branchId: validId(row.branchId) ? row.branchId : null, isActive: bit(row.isActive) ? row.isActive : null, sourceRef: ref }]
  })
  const calendars = new Map<string, ResolvedCalendarDay>(), calendarCache = createCalendarResolverCache(em)
  for (let offset = 0; offset < period.periodDays; offset++) {
    const date = addDays(periodStart, offset)
    const calendar = await resolveEmployeeCalendarDay(em, employeeId, date, { strict: true, cache: calendarCache })
    calendars.set(date, calendar)
  }
  const days = Array.from({ length: period.periodDays }, (_, offset) => {
    const date = addDays(periodStart, offset), dayIssues: PayrollLiveSourceIssue[] = [], refs: string[] = []
    const calendar = calendars.get(date)!
    const calendarRefs = calendar.versionRefs.filter(ref => ref.versionId !== null).map(ref => `attendance_rule_versions:${ref.versionId}`)
    refs.push(...calendarRefs); sourceRefs.push(...calendarRefs)
    let timingState: PayrollLiveSourceState = 'AVAILABLE'
    const dayReport = (code: string, message: string, next: PayrollLiveSourceState, ref?: string) => {
      dayIssues.push(issue(code, message, ref)); const rank = { AVAILABLE: 0, MISSING: 1, UNSUPPORTED: 2, INVALID: 3 }; if (rank[next] > rank[timingState]) timingState = next
      if (next === 'INVALID') state = 'INVALID'
    }
    const employeeRule = ruleAt('EMPLOYEE', employeeId, date)
    if (employeeRule) refs.push(employeeRule.sourceRef)
    if (!employeeRule || employeeRule.state !== 'AVAILABLE') dayReport('SCHEDULE_EMPLOYEE_RULE_UNPROVEN', 'إسناد جدول الموظف واختيار مرونته لا يملكان نسخة مؤرخة صالحة لهذا اليوم', employeeRule?.state ?? 'MISSING', employeeRule?.sourceRef)
    const overrideMatches = overrides.filter(row => row.recordedFrom === date), weeklyMatches = weekly.filter(row => row.recordedFrom === weekOf(date))
    const selectedPlans = overrideMatches.length ? overrideMatches : weeklyMatches
    const plan = selectedPlans[0] ?? null
    let selected: RuleEvidence | null = null, assignment: Row | null = null
    if (plan) {
      refs.push(...selectedPlans.map(row => row.sourceRef))
      assignment = { kind: plan.kind, sourceRef: plan.sourceRef, recordedFrom: plan.recordedFrom, recordedTo: plan.recordedTo }
      if (selectedPlans.length !== 1 || !plan.valid) dayReport('SCHEDULE_DAY_ASSIGNMENT_INVALID', 'إسناد اليوم متعارض أو غير صالح', 'INVALID', plan.sourceRef)
      if (plan.shiftId != null) selected = ruleAt('SHIFT', plan.shiftId, date)
      else dayReport('SCHEDULE_INLINE_PLAN_UNVERSIONED', 'أوقات الإسناد المباشر مسجلة لذلك التاريخ لكن إعداداته ومرونته غير مؤرخة', 'UNSUPPORTED', plan.sourceRef)
    } else if (employeeRule?.state === 'AVAILABLE') {
      const id = employeeRule.snapshot.value!.workScheduleId
      if (id !== null) { selected = ruleAt('WORK_SCHEDULE', id, date); assignment = { kind: 'EMPLOYEE', sourceRef: employeeRule.sourceRef, recordedFrom: employeeRule.effectiveFrom, recordedTo: null } }
      else {
        const ids = [...new Set(rules.filter(row => row.sourceType === 'WORK_SCHEDULE' && row.sourceId !== null).map(row => row.sourceId!))]
        const defaults = ids.map(id => ruleAt('WORK_SCHEDULE', id, date)).filter((row): row is RuleEvidence => !!row && row.state === 'AVAILABLE' && row.snapshot.value!.isDefault === true && row.snapshot.value!.isActive === true)
        if (defaults.length === 1) { selected = defaults[0]; assignment = { kind: 'DEFAULT', sourceRef: selected.sourceRef, recordedFrom: selected.effectiveFrom, recordedTo: null } }
        else if (defaults.length > 1) dayReport('SCHEDULE_DEFAULT_CONFLICT', 'أكثر من جدول افتراضي مؤرخ ساري لهذا اليوم', 'INVALID')
      }
    }
    if (selected) refs.push(selected.sourceRef)
    if (!selected || selected.state !== 'AVAILABLE') dayReport('SCHEDULE_TIMING_RULE_UNPROVEN', 'تعريف أوقات الدوام لا يملك نسخة مؤرخة صالحة لهذا اليوم', selected?.state ?? 'MISSING', selected?.sourceRef)
    const source = selected?.state === 'AVAILABLE' ? selected.snapshot.value : null
    if (source?.isActive === false) dayReport('SCHEDULE_TIMING_INACTIVE', 'تعريف الدوام معطل في نسخة اليوم؛ لا يفترض مصدر بديل', 'UNSUPPORTED', selected!.sourceRef)
    const employeeMode = employeeRule?.state === 'AVAILABLE' ? employeeRule.snapshot.value!.flexOverrideMode : null
    const flexEnabled = employeeMode === 'DISABLED' ? false : employeeMode === 'ENABLED' ? true : employeeMode === 'INHERIT' && bit(source?.flexEnabled) ? source!.flexEnabled : null
    const timing = source || (plan?.valid && plan.shiftId === null) ? {
      startTime: source?.startTime ?? plan?.startTime ?? null, endTime: source?.endTime ?? plan?.endTime ?? null,
      requiredWorkMinutes: minutes(source?.requiredWorkMinutes) ? source!.requiredWorkMinutes : null,
      flexEnabled, flexWindowMinutes: minutes(source?.flexWindowMinutes) ? source!.flexWindowMinutes : null,
    } : null
    if (timing && (timing.requiredWorkMinutes === null || timing.flexEnabled === null)) dayReport('SCHEDULE_TIMING_FIELDS_MISSING', 'دقائق العمل المطلوبة أو اختيار المرونة غير موثقين؛ لم تشتق لهما قيم افتراضية', 'UNSUPPORTED', selected?.sourceRef ?? plan?.sourceRef)
    if (flexEnabled === true && (!timing?.flexWindowMinutes || !timing.requiredWorkMinutes || timing.flexWindowMinutes >= timing.requiredWorkMinutes)) dayReport('SCHEDULE_FLEX_OVERRIDE_INVALID', 'اختيار مرونة الموظف لا يقابله تعريف نافذة ودقائق عمل صالح', 'INVALID', employeeRule?.sourceRef)
    if (limited) dayReport('SCHEDULE_SOURCE_LIMIT', 'تعذر إثبات اختيار النسخة بسبب تجاوز حد القراءة', 'UNSUPPORTED')
    const calendarIssues = calendar.issues.map(row => ({ ...row }))
    dayIssues.push(...calendarIssues)
    const calendarState = limited ? 'UNSUPPORTED' as const : calendar.state
    const dayState = calendarState === 'AVAILABLE' && calendar.working === false ? 'AVAILABLE' :
      ([calendarState, timingState] as PayrollLiveSourceState[]).sort((a, b) => ({ AVAILABLE: 0, MISSING: 1, UNSUPPORTED: 2, INVALID: 3 })[b] - ({ AVAILABLE: 0, MISSING: 1, UNSUPPORTED: 2, INVALID: 3 })[a])[0]
    if (({ AVAILABLE: 0, MISSING: 1, UNSUPPORTED: 2, INVALID: 3 })[dayState] > ({ AVAILABLE: 0, MISSING: 1, UNSUPPORTED: 2, INVALID: 3 })[state]) state = dayState
    issues.push(...dayIssues.map(row => ({ ...row, message: `${date}: ${row.message}` })))
    return { date, timingState, calendarState, assignment, employeeRule: ruleView(employeeRule), sourceRule: ruleView(selected),
      timing, scheduled: calendarState === 'AVAILABLE' ? calendar.working === false ? false : timingState === 'AVAILABLE' ? true : null : null,
      dayKind: calendar.dayKind, branchId: calendar.branchId, calendarVersionRefs: calendar.versionRefs,
      issues: dayIssues, sourceRefs: unique(refs) }
  })
  const historicalCalendarComplete = days.every(day => day.calendarState === 'AVAILABLE')
  return freeze({ state, data: { basis: 'DATED_PLAN_AND_EXPLICIT_CALENDAR', periodStart, periodEnd, days,
    scheduledWorkDates: state === 'AVAILABLE' ? days.filter(day => day.scheduled === true).map(day => day.date) : null, historicalCalendarComplete,
    ruleEvidence: rules, assignmentEvidence: { weekly, overrides }, calendarEvidence: {
      basis: 'EXPLICIT_DATED_CALENDAR', days: [...calendars.values()], currentEmployeeBranchId: validId(employee?.branchId) ? employee.branchId : null,
      currentBranch: { sourceRef: branchRef, country: text(employee?.country, 5) ? employee.country : null, weekendDays: weekend(employee?.weekendDays) ? employee.weekendDays : null },
      globalWeekend: config, holidays, exceptions,
    } }, issues, sourceRefs: unique(sourceRefs) })
}
