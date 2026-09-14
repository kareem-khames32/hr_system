import { BadRequestException } from '@nestjs/common'
import type { EntityManager } from 'typeorm'
import { MONTHLY_SALARY_COMPONENTS } from '../employees/compensation'
import { payrollEmploymentCoverage } from './payroll-employment'
import { PAYROLL_LIVE_SOURCE_ROW_LIMIT, payrollLiveSourcePeriod, PayrollLiveSourceIssue, PayrollLiveSourceSection } from './payroll-live-source-contract'

const employeeStates = ['active', 'probation', 'notice_period', 'suspended', 'terminated', 'archived']
const endStates = ['IN_CLEARANCE', 'IN_SETTLEMENT', 'SETTLED', 'CLOSED', 'CANCELLED']
const attendanceStates = ['present', 'late', 'absent', 'early_leave', 'leave', 'partial_leave', 'holiday', 'missing_punch', 'mission', 'remote', 'exempt']
const nullableMetrics = ['rawLateMinutes', 'unexcusedLateMinutes', 'shortfallMinutes', 'countedWorkMinutes', 'earlyArrivalMinutes', 'graceUsed']
const metrics = ['lateMinutes', 'earlyLeaveMinutes', 'excusedMinutes', 'deductibleMinutes', 'workMinutes', ...nullableMetrics]
const validDate = (value: unknown): value is string => typeof value === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(value) && !value.startsWith('0000-') && Number.isFinite(Date.parse(`${value}T00:00:00Z`)) && new Date(`${value}T00:00:00Z`).toISOString().slice(0, 10) === value
const issue = (code: string, message: string, sourceRef?: string): PayrollLiveSourceIssue => ({ code, message, ...(sourceRef ? { sourceRef } : {}) })
const sourceId = (value: unknown) => typeof value === 'number' && Number.isSafeInteger(value) && value > 0
const bit = (value: unknown) => typeof value === 'boolean'
function freeze<T>(value: T): T { if (value !== null && typeof value === 'object') { Object.values(value).forEach(freeze); Object.freeze(value) }; return value }
const refs = (values: string[]) => [...new Set(values)].sort()

/**
 * قراءة فقط داخل معاملة المستدعي: لا إنشاء أيام حضور ولا استنتاج جدول تاريخي من الكتالوج الحي.
 * أعمدة الأجر الحالية لا تشكل تاريخ أجور مؤرخًا، والحضور بالدقائق ليس مصدر ثوانٍ خام.
 */
export async function readPayrollLiveEmployment(em: EntityManager, employeeId: number, periodStart: string, periodEnd: string): Promise<{ employment: PayrollLiveSourceSection; compensation: PayrollLiveSourceSection; attendance: PayrollLiveSourceSection }> {
  if (!sourceId(employeeId)) throw new BadRequestException({ code: 'LIVE_SOURCE_EMPLOYEE_INVALID', message: 'معرف موظف صحيح موجب مطلوب' })
  const period = payrollLiveSourcePeriod(periodStart, periodEnd)
  // CAST قبل وصول DECIMAL إلى برنامج التشغيل؛ لا نعيد بناء سنتات ضاعت في Number.
  const employeeRows = await em.query(`SELECT [id], CONVERT(varchar(10), [joinDate], 23) AS [joinDate],
    CONVERT(varchar(10), [actualStartDate], 23) AS [actualStartDate], [status], [isActive],
    CONVERT(varchar(33), [archivedAt], 126) AS [archivedAt], [currency],
    CAST([basicSalary] AS nvarchar(80)) AS [basicSalary], CAST([housingAllowance] AS nvarchar(80)) AS [housingAllowance],
    CAST([transportAllowance] AS nvarchar(80)) AS [transportAllowance], CAST([phoneAllowance] AS nvarchar(80)) AS [phoneAllowance],
    CAST([workNatureAllowance] AS nvarchar(80)) AS [workNatureAllowance], CAST([otherAllowance] AS nvarchar(80)) AS [otherAllowance]
    FROM [employees] WHERE [id] = @0`, [employeeId])
  const employeeRef = `employees:${employeeId}`
  if (!employeeRows.length) {
    const missing: PayrollLiveSourceSection = { state: 'MISSING', data: null, issues: [issue('EMPLOYEE_SOURCE_MISSING', 'سجل الموظف غير موجود في لقطة القراءة', employeeRef)], sourceRefs: [] }
    return freeze({ employment: missing, compensation: { ...missing }, attendance: { ...missing } })
  }
  if (employeeRows.length !== 1 || employeeRows[0].id !== employeeId) throw new BadRequestException({ code: 'LIVE_SOURCE_EMPLOYEE_INVALID', message: 'مصدر الموظف لا يطابق المعرف المطلوب' })
  const employee = employeeRows[0]
  const caseRows = await em.query(`SELECT TOP (5001) [id], [employeeId], CONVERT(varchar(10), [lastWorkingDay], 23) AS [lastWorkingDay], [status], [resignationRequestId]
    FROM [offboarding_cases] WHERE [employeeId] = @0 ORDER BY [id]`, [employeeId])
  // changedAt دليل تغيير مسجل وليس تاريخ سريان يُركّب منه عقد إعادة تعيين أو إيقاف.
  const historyRows = await em.query(`SELECT TOP (5001) [id], [employeeId], [changeType], [fieldName], [oldStatus], [newStatus],
    [oldValue] AS [oldValueRaw], [newValue] AS [newValueRaw], CONVERT(varchar(33), [changedAt], 126) AS [changedAt], [requestId]
    FROM [employee_status_history] WHERE [employeeId] = @0 AND CONVERT(date, [changedAt]) <= @1
    AND ([changeType] = 'STATUS' OR [fieldName] IN ('status', 'isActive', 'joinDate', 'actualStartDate')
      OR ([changeType] IS NULL AND ([oldStatus] IN ('active', 'probation', 'notice_period', 'suspended', 'terminated', 'archived')
        OR [newStatus] IN ('active', 'probation', 'notice_period', 'suspended', 'terminated', 'archived'))))
    ORDER BY [changedAt], [id]`, [employeeId, periodEnd])
  const attendanceRows = await em.query(`SELECT TOP (5001) [id], [employeeId], [branchId], CONVERT(varchar(10), [date], 23) AS [date],
    [checkIn], [checkOut], [shiftName], [shiftStart], [shiftEnd], [shiftId], [scheduleSource], [unscheduled], [status],
    [lateMinutes], [earlyLeaveMinutes], [excusedMinutes], [deductibleMinutes], [workMinutes],
    [rawLateMinutes], [unexcusedLateMinutes], [shortfallMinutes], [countedWorkMinutes], [earlyArrivalMinutes],
    [flexOutcome], [attendanceReviewRequired], [attendanceReviewReason], [leaveConflict], [punchAnomalies], [graceUsed],
    [attendanceRuleSnapshot] AS [attendanceRuleSnapshotRaw], CONVERT(varchar(33), [computedAt], 126) AS [computedAt]
    FROM [attendance_days] WHERE [employeeId] = @0 AND [date] >= @1 AND [date] <= @2 ORDER BY [date], [id]`, [employeeId, periodStart, periodEnd])

  const employmentIssues: PayrollLiveSourceIssue[] = [], employmentRefs = [employeeRef]
  let employmentState: PayrollLiveSourceSection['state'] = 'AVAILABLE'
  const reportEmployment = (state: 'MISSING' | 'INVALID' | 'UNSUPPORTED', code: string, message: string, ref = employeeRef) => {
    employmentIssues.push(issue(code, message, ref))
    const rank = { AVAILABLE: 0, MISSING: 1, UNSUPPORTED: 2, INVALID: 3 }
    if (rank[state] > rank[employmentState]) employmentState = state
  }
  if (!employeeStates.includes(employee.status) || !bit(employee.isActive)) reportEmployment('INVALID', 'EMPLOYMENT_STATUS_INVALID', 'حالة الموظف الحالية أو علامة التفعيل غير صالحة')
  const current = { joinDate: employee.joinDate ?? null, actualStartDate: employee.actualStartDate ?? null, status: employee.status ?? null, isActive: employee.isActive ?? null, archivedAt: employee.archivedAt ?? null }
  const hireDateSource = employee.actualStartDate != null ? 'ACTUAL_START_DATE' : employee.joinDate != null ? 'JOIN_DATE' : null
  const hireDate = employee.actualStartDate ?? employee.joinDate ?? null
  if (hireDate === null) reportEmployment('MISSING', 'EMPLOYMENT_HIRE_DATE_MISSING', 'تاريخ بدء الخدمة غير مسجل؛ لا يستخدم تاريخ 1900 كبديل')
  else if (!validDate(hireDate)) reportEmployment('INVALID', 'EMPLOYMENT_HIRE_DATE_INVALID', 'تاريخ بدء الخدمة المسجل غير صالح')
  for (const key of ['joinDate', 'actualStartDate']) if (employee[key] != null && !validDate(employee[key])) reportEmployment('INVALID', 'EMPLOYMENT_DATE_INVALID', `تاريخ ${key === 'joinDate' ? 'التعيين' : 'المباشرة الفعلية'} غير صالح`)
  if (employee.status === 'suspended') reportEmployment('UNSUPPORTED', 'EMPLOYMENT_SUSPENSION_UNSUPPORTED', 'الإيقاف يحتاج فترات خدمة واستحقاق مؤرخة؛ الحالة الحالية وحدها لا تحددها')
  if (caseRows.length > PAYROLL_LIVE_SOURCE_ROW_LIMIT || historyRows.length > PAYROLL_LIVE_SOURCE_ROW_LIMIT) reportEmployment('UNSUPPORTED', 'EMPLOYMENT_SOURCE_LIMIT', 'مصادر نهاية الخدمة أو تاريخ الحالة تتجاوز حد 5000 صف؛ القراءة غير مكتملة')
  const caseIds = new Set<number>()
  const offboardingCases = caseRows.slice(0, PAYROLL_LIVE_SOURCE_ROW_LIMIT).map((row: any) => {
    const sourceRef = sourceId(row.id) ? `offboarding_cases:${row.id}` : employeeRef
    if (sourceRef !== employeeRef) employmentRefs.push(sourceRef)
    if (!sourceId(row.id) || caseIds.has(row.id) || row.employeeId !== employeeId || !validDate(row.lastWorkingDay) || !endStates.includes(row.status)) reportEmployment('INVALID', 'EMPLOYMENT_END_DOCUMENT_INVALID', 'مرجع إنهاء خدمة مكرر أو غير صالح أو لا يخص الموظف', sourceRef)
    caseIds.add(row.id)
    return { id: row.id ?? null, lastWorkingDay: row.lastWorkingDay ?? null, status: row.status ?? null, resignationRequestId: row.resignationRequestId ?? null, sourceRef }
  })
  let jsonNodes = 0
  const readJson = (raw: unknown): { state: 'MISSING' | 'AVAILABLE' | 'INVALID'; raw: string | null; value: unknown; omitted: boolean } => {
    if (raw === null || raw === undefined) return { state: 'MISSING', raw: null, value: null, omitted: false }
    if (typeof raw !== 'string' || raw.length > 40000) return { state: 'INVALID', raw: null, value: null, omitted: true }
    try {
      const value: unknown = JSON.parse(raw)
      const visit = (node: unknown, depth = 0): boolean => {
        if (++jsonNodes > 100000 || depth > 20) return false
        if (node === null || typeof node === 'string' || typeof node === 'boolean') return true
        if (typeof node === 'number') return Number.isFinite(node) && (!Number.isInteger(node) || Number.isSafeInteger(node))
        if (Array.isArray(node)) return node.every(item => visit(item, depth + 1))
        if (node && typeof node === 'object') return Object.entries(node).every(([key, value]) => !['__proto__', 'constructor', 'prototype'].includes(key) && visit(value, depth + 1))
        return false
      }
      return visit(value) ? { state: 'AVAILABLE', raw, value, omitted: false } : { state: 'INVALID', raw, value: null, omitted: false }
    } catch { return { state: 'INVALID', raw, value: null, omitted: false } }
  }
  const historyIds = new Set<number>()
  const lifecycleEvidence = historyRows.slice(0, PAYROLL_LIVE_SOURCE_ROW_LIMIT).map((row: any) => {
    const sourceRef = sourceId(row.id) ? `employee_status_history:${row.id}` : employeeRef
    if (sourceRef !== employeeRef) employmentRefs.push(sourceRef)
    if (!sourceId(row.id) || historyIds.has(row.id) || row.employeeId !== employeeId) reportEmployment('INVALID', 'EMPLOYMENT_HISTORY_INVALID', 'مرجع تاريخ الحالة مكرر أو لا يخص الموظف', sourceRef)
    historyIds.add(row.id)
    const oldValue = readJson(row.oldValueRaw), newValue = readJson(row.newValueRaw)
    if (oldValue.state === 'INVALID' || newValue.state === 'INVALID') reportEmployment('INVALID', 'EMPLOYMENT_HISTORY_JSON_INVALID', 'قيم تاريخ الحالة المخزنة لا يمكن قراءتها دون فقد بيانات', sourceRef)
    const oldStatus = row.oldStatus ?? oldValue.value, newStatus = row.newStatus ?? newValue.value
    if (oldStatus === 'suspended' || newStatus === 'suspended') reportEmployment('UNSUPPORTED', 'EMPLOYMENT_SUSPENSION_HISTORY_UNSUPPORTED', 'سجل إيقاف أو استئناف موجود دون فترات استحقاق مؤرخة معتمدة', sourceRef)
    if (['terminated', 'archived'].includes(oldStatus) && ['active', 'probation', 'notice_period'].includes(newStatus)) reportEmployment('UNSUPPORTED', 'EMPLOYMENT_REHIRE_UNSUPPORTED', 'سجل عودة للخدمة يحتاج عقد فترات إعادة تعيين مؤرخًا قبل بناء التغطية', sourceRef)
    if (['joinDate', 'actualStartDate'].includes(row.fieldName)) reportEmployment('UNSUPPORTED', 'EMPLOYMENT_START_HISTORY_UNSUPPORTED', 'يوجد تعديل مسجل لتاريخ البداية؛ لا يعاد تفسير سريانه التاريخي من changedAt', sourceRef)
    return { id: row.id ?? null, changeType: row.changeType ?? null, fieldName: row.fieldName ?? null, oldStatus: row.oldStatus ?? null, newStatus: row.newStatus ?? null,
      oldValue, newValue, changedAt: row.changedAt ?? null, requestId: row.requestId ?? null, sourceRef }
  })
  const effectiveCases = offboardingCases.filter((row: any) => row.status !== 'CANCELLED' && validDate(row.lastWorkingDay))
  const relevantCases = effectiveCases.filter((row: any) => validDate(hireDate) && row.lastWorkingDay >= hireDate)
  const ends = [...new Set<string>(relevantCases.map((row: any) => row.lastWorkingDay))]
  if (ends.length > 1) reportEmployment('UNSUPPORTED', 'EMPLOYMENT_END_CONFLICT', 'نهايات خدمة متعددة متعارضة؛ لا تختار القراءة إحداها أو تخترع فترات إعادة تعيين')
  if (effectiveCases.some((row: any) => validDate(hireDate) && row.lastWorkingDay < hireDate)) reportEmployment('UNSUPPORTED', 'EMPLOYMENT_REHIRE_UNSUPPORTED', 'يوجد إنهاء أقدم من التعيين الحالي؛ ربط فترات إعادة التعيين غير مدعوم بهذه القراءة')
  if (employee.isActive && ['active', 'probation'].includes(employee.status) && relevantCases.some((row: any) => row.status === 'CLOSED' && row.lastWorkingDay <= periodEnd)) reportEmployment('UNSUPPORTED', 'EMPLOYMENT_ACTIVE_AFTER_END', 'الحالة نشطة بعد إنهاء مغلق؛ تاريخ العودة للخدمة يحتاج توثيقًا')
  if ((!employee.isActive || ['terminated', 'archived'].includes(employee.status)) && !ends.length) reportEmployment('MISSING', 'EMPLOYMENT_END_DOCUMENT_MISSING', 'نهاية الخدمة الموثقة غير موجودة؛ archivedAt ليس مصدرًا لتاريخ الاستحقاق')
  let coverage: { from: string; to: string; days: number } | null = null
  if (employmentState === 'AVAILABLE') {
    try {
      // الحارسان أعلاه يمنعان fallback1900 والأرشفة والإيقاف قبل استعمال المنطق القديم.
      const result = payrollEmploymentCoverage({ ...current, archivedAt: null }, relevantCases, periodStart, periodEnd)
      coverage = result ? { from: result.coverFrom, to: result.coverTo, days: result.coverDays } : null
    } catch { reportEmployment('UNSUPPORTED', 'EMPLOYMENT_COVERAGE_UNSUPPORTED', 'المصادر الحالية لا تثبت تغطية خدمة واحدة غير ملتبسة لهذه الفترة') }
  }
  const employment: PayrollLiveSourceSection = { state: employmentState, data: { employeeId, periodStart, periodEnd, current, hireDate, hireDateSource,
    coverage, coverageInterpretation: 'DOCUMENTED_CURRENT_EMPLOYMENT_INTERVAL_ONLY', endDate: ends.length === 1 ? ends[0] : null,
    endSourceRefs: relevantCases.map((row: any) => row.sourceRef), offboardingCases, lifecycleEvidence }, issues: employmentIssues, sourceRefs: refs(employmentRefs) }

  const compensationIssues = [issue('COMPENSATION_EFFECTIVE_HISTORY_UNSUPPORTED', 'المتاح الأجر الحالي فقط؛ سريانه على أيام الفترة غير موثق، ويلزم استكماله قبل الحساب', employeeRef)]
  const salaries: Record<string, string | null> = {}
  for (const component of MONTHLY_SALARY_COMPONENTS) {
    const value = employee[component.key]
    salaries[component.key] = typeof value === 'string' ? value : null
    if (value == null) compensationIssues.push(issue('COMPENSATION_COMPONENT_MISSING', `قيمة ${component.nameAr} الحالية غير مسجلة ولا تستبدل بصفر`, employeeRef))
    else if (typeof value !== 'string' || !/^\d{1,16}(?:\.\d{1,2})?$/.test(value)) compensationIssues.push(issue('COMPENSATION_COMPONENT_INVALID', `قيمة ${component.nameAr} غير صالحة أو تعذر قراءتها بالدقة المطلوبة`, employeeRef))
  }
  if (!['SAR', 'EGP'].includes(employee.currency)) compensationIssues.push(issue('COMPENSATION_CURRENCY_UNSUPPORTED', 'عملة الموظف الحالية مفقودة أو غير مدعومة؛ لا تُستبدل بعملة عامة', employeeRef))
  const compensation: PayrollLiveSourceSection = { state: 'UNSUPPORTED', data: { basis: 'CURRENT_EMPLOYEE_COLUMNS_ONLY', current: salaries, currency: employee.currency ?? null, currentSourceRef: employeeRef, datedSegments: null }, issues: compensationIssues, sourceRefs: [employeeRef] }

  const attendanceIssues = [issue('ATTENDANCE_TRUSTED_INPUT_UNSUPPORTED', 'الأيام المخزنة للتشخيص فقط؛ لا تثبت وحدها جدول عمل الفترة التاريخي أو ثواني التأخير الخام')]
  if (attendanceRows.length > PAYROLL_LIVE_SOURCE_ROW_LIMIT) attendanceIssues.push(issue('ATTENDANCE_SOURCE_LIMIT', 'صفوف الحضور تتجاوز حد 5000؛ لا تُعامل القراءة المقطوعة كفترة مكتملة'))
  const dateCounts = new Map<string, number>(), attendanceIds = new Set<number>(), attendanceRefs: string[] = []
  const rows = attendanceRows.slice(0, PAYROLL_LIVE_SOURCE_ROW_LIMIT).map((row: any) => {
    const sourceRef = sourceId(row.id) ? `attendance_days:${row.id}` : employeeRef
    if (sourceRef !== employeeRef) attendanceRefs.push(sourceRef)
    if (!sourceId(row.id) || attendanceIds.has(row.id) || row.employeeId !== employeeId || !validDate(row.date) || row.date < periodStart || row.date > periodEnd) attendanceIssues.push(issue('ATTENDANCE_ROW_INVALID', 'سجل حضور مكرر أو خارج الموظف/الفترة المطلوبة أو ذو تاريخ غير صالح', sourceRef))
    attendanceIds.add(row.id)
    if (validDate(row.date) && row.date >= periodStart && row.date <= periodEnd) dateCounts.set(row.date, (dateCounts.get(row.date) ?? 0) + 1)
    const values: Record<string, number | null> = {}
    for (const key of metrics) {
      const value = row[key]
      values[key] = typeof value === 'number' && Number.isSafeInteger(value) ? value : null
      if (value == null && nullableMetrics.includes(key)) { if (['rawLateMinutes', 'unexcusedLateMinutes', 'countedWorkMinutes'].includes(key)) attendanceIssues.push(issue('ATTENDANCE_METRIC_MISSING', `قيمة ${key} غير محفوظة؛ لا تُشتق من الدقائق المقربة`, sourceRef)) }
      else if (!Number.isSafeInteger(value) || value < 0 || value > 2147483647) attendanceIssues.push(issue('ATTENDANCE_METRIC_INVALID', `قيمة ${key} المخزنة غير صالحة`, sourceRef))
    }
    const ruleSnapshot = readJson(row.attendanceRuleSnapshotRaw)
    if (ruleSnapshot.state === 'MISSING') attendanceIssues.push(issue('ATTENDANCE_RULE_SNAPSHOT_MISSING', 'لقطة قاعدة اليوم غير محفوظة', sourceRef))
    else if (ruleSnapshot.state === 'INVALID' || !ruleSnapshot.value || typeof ruleSnapshot.value !== 'object' || Array.isArray(ruleSnapshot.value)) attendanceIssues.push(issue('ATTENDANCE_RULE_SNAPSHOT_INVALID', 'JSON لقطة الحضور تالف أو لا يمثل كائنًا قابلًا للقراءة', sourceRef))
    else {
      const snapshot = ruleSnapshot.value as Record<string, unknown>
      if (snapshot.schemaVersion !== 1 || snapshot.date !== row.date) attendanceIssues.push(issue('ATTENDANCE_RULE_SNAPSHOT_UNSUPPORTED', 'إصدار لقطة قاعدة الحضور أو تاريخها لا يطابق اليوم', sourceRef))
    }
    if (!attendanceStates.includes(row.status) || !bit(row.unscheduled) || !bit(row.attendanceReviewRequired) || !bit(row.leaveConflict)) attendanceIssues.push(issue('ATTENDANCE_FLAGS_INVALID', 'حالة اليوم أو أعلام المراجعة المخزنة غير صالحة', sourceRef))
    if (row.attendanceReviewRequired || row.leaveConflict || row.unscheduled || row.status === 'missing_punch') attendanceIssues.push(issue('ATTENDANCE_REVIEW_REQUIRED', 'سجل اليوم يحتاج مراجعة؛ لا يُعرض كمصدر رواتب جاهز', sourceRef))
    if (row.computedAt == null) attendanceIssues.push(issue('ATTENDANCE_COMPUTED_AT_MISSING', 'وقت حساب اليوم غير محفوظ', sourceRef))
    else if (typeof row.computedAt !== 'string' || !Number.isFinite(Date.parse(row.computedAt))) attendanceIssues.push(issue('ATTENDANCE_COMPUTED_AT_INVALID', 'وقت حساب اليوم غير صالح', sourceRef))
    return { id: row.id ?? null, date: row.date ?? null, branchId: row.branchId ?? null, status: row.status ?? null, checkIn: row.checkIn ?? null, checkOut: row.checkOut ?? null,
      shiftName: row.shiftName ?? null, shiftStart: row.shiftStart ?? null, shiftEnd: row.shiftEnd ?? null, shiftId: row.shiftId ?? null, scheduleSource: row.scheduleSource ?? null,
      unscheduled: row.unscheduled ?? null, ...values, flexOutcome: row.flexOutcome ?? null, attendanceReviewRequired: row.attendanceReviewRequired ?? null,
      attendanceReviewReason: row.attendanceReviewReason ?? null, leaveConflict: row.leaveConflict ?? null, punchAnomalies: row.punchAnomalies ?? null,
      ruleSnapshot, computedAt: row.computedAt ?? null, sourceRef }
  })
  const periodDates = Array.from({ length: period.periodDays }, (_, index) => new Date(Date.parse(`${periodStart}T00:00:00Z`) + index * 86400000).toISOString().slice(0, 10))
  const missingDates = periodDates.filter(date => !dateCounts.has(date)), duplicateDates = [...dateCounts].filter(([, count]) => count > 1).map(([date]) => date).sort()
  if (missingDates.length) attendanceIssues.push(issue('ATTENDANCE_DAYS_MISSING', `${missingDates.length} يومًا بلا صف حضور محفوظ؛ لا يعني ذلك غيابًا أو عطلة`))
  if (duplicateDates.length) attendanceIssues.push(issue('ATTENDANCE_DAYS_DUPLICATED', 'توجد تواريخ ذات أكثر من صف حضور؛ لا تجمعها القراءة تلقائيًا'))
  const attendance: PayrollLiveSourceSection = { state: 'UNSUPPORTED', data: { basis: 'STORED_ATTENDANCE_DAYS_ONLY', periodStart, periodEnd, rows, missingDates, duplicateDates,
    rawSecondsAvailable: false, historicalScheduleAvailable: false }, issues: attendanceIssues, sourceRefs: refs(attendanceRefs) }
  return freeze({ employment, compensation, attendance })
}
