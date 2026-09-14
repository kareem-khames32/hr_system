import { BadRequestException, ConflictException, NotFoundException } from '@nestjs/common'
import type { EntityManager } from 'typeorm'
import { localDateOf } from '../attendance/attendance.service'
import { recordEmployeeChange } from '../employees/employee-change-log'
import { payrollLiveSourceContent } from './payroll-live-source-contract'
import { lockPayrollEmployees } from './payroll-settlement-boundary'
import { appendSalaryHistoryRevision, normalizeSalaryHistorySegments, readSalaryHistory, readSalaryHistoryCurrent,
  SALARY_HISTORY_MONEY_KEYS, salaryCurrentSourceHash, salaryHistoryDate, salaryHistorySchemaMissing,
  salaryHistoryText, type SalaryHistoryCurrent, type SalaryHistoryRead, type SalaryHistorySegment } from './payroll-salary-history'

export type EmployeeSalaryValue = Pick<SalaryHistorySegment, typeof SALARY_HISTORY_MONEY_KEYS[number] | 'currency'>
export interface EmployeeSalaryChangeInput {
  employeeId: number
  actorUserId: number
  effectiveDate: string
  reason: string
  evidenceReference: string
  expectedRevision: number
  expectedCurrentSourceHash: string
  salary: EmployeeSalaryValue
  previousEffectiveFrom?: string
  requestId?: number
}
export interface EmployeeSalaryChangeResult { history: SalaryHistoryRead; current: SalaryHistoryCurrent; changed: boolean; applied: true }
const bad = (code: string, message: string): never => { throw new BadRequestException({ code, message }) }
const conflict = (code: string, message: string): never => { throw new ConflictException({ code, message }) }
const dayBefore = (date: string) => new Date(Date.parse(date + 'T00:00:00Z') - 86400000).toISOString().slice(0, 10)
const salaryOf = (row: SalaryHistorySegment): EmployeeSalaryValue => ({ currency: row.currency, ...Object.fromEntries(SALARY_HISTORY_MONEY_KEYS.map(key => [key, row[key]])) } as EmployeeSalaryValue)
const equal = (a: unknown, b: unknown) => payrollLiveSourceContent(a).contentHash === payrollLiveSourceContent(b).contentHash

/** يغيّر فترة واحدة ويحافظ على القرارات المؤرخة التالية دون نسب الأجر الحالي للماضي. */
export function planEmployeeSalaryChange(input: {
  previous: SalaryHistorySegment[]; current: SalaryHistoryCurrent; salary: EmployeeSalaryValue;
  effectiveDate: string; today: string; previousEffectiveFrom?: string
}) {
  const effectiveDate = salaryHistoryDate(input.effectiveDate), today = salaryHistoryDate(input.today)
  if (effectiveDate > today) bad('SALARY_CHANGE_FUTURE_REQUIRES_REQUEST', 'تغيير الأجر بتاريخ مستقبلي يُقدّم بطلب زيادة راتب مجدول؛ ملف الموظف يحتفظ بالأجر الحالي حتى السريان')
  const previous = input.previous.length ? normalizeSalaryHistorySegments(input.previous) : []
  const next = previous.find(row => row.effectiveFrom > effectiveDate)
  const effectiveTo = next ? dayBefore(next.effectiveFrom) : null
  const replacement = normalizeSalaryHistorySegments([{ ...input.salary, effectiveFrom: effectiveDate, effectiveTo }])[0]
  const retained = previous.flatMap(row => {
    if (row.effectiveFrom > effectiveDate) return [{ ...row }]
    if (row.effectiveFrom === effectiveDate) return []
    return [{ ...row, effectiveTo: row.effectiveTo !== null && row.effectiveTo < effectiveDate ? row.effectiveTo : dayBefore(effectiveDate) }]
  })
  if (input.previousEffectiveFrom !== undefined) {
    if (previous.length) bad('SALARY_CHANGE_PREVIOUS_ALREADY_DOCUMENTED', 'الأجر السابق موثق بالفعل؛ لا تقبل بداية افتتاحية جديدة فوق السجل')
    const from = salaryHistoryDate(input.previousEffectiveFrom)
    if (from >= effectiveDate) bad('SALARY_CHANGE_PREVIOUS_RANGE_INVALID', 'بداية الأجر السابق يجب أن تسبق تاريخ تغيير الأجر')
    try { retained.push(normalizeSalaryHistorySegments([{ ...input.current, effectiveFrom: from, effectiveTo: dayBefore(effectiveDate) }])[0]) }
    catch { bad('SALARY_CHANGE_PREVIOUS_SALARY_INCOMPLETE', 'الأجر السابق أو العملة غير مكتملين؛ لا يمكن إثبات فترة سابقة من بيانات ناقصة') }
  }
  const segments = normalizeSalaryHistorySegments([...retained, replacement])
  const active = segments.find(row => row.effectiveFrom <= today && (row.effectiveTo === null || row.effectiveTo >= today))
  if (!active) conflict('SALARY_CHANGE_CURRENT_COVERAGE_MISSING', 'السجل الناتج لا يثبت أجر اليوم الحالي؛ راجع الفترات التالية قبل تطبيق التعديل')
  const current = salaryOf(active!), timelineChanged = !equal(previous, segments)
  const currentChanged = salaryCurrentSourceHash(current) !== salaryCurrentSourceHash(input.current)
  return { effectiveFrom: effectiveDate, effectiveTo: effectiveTo ?? '9999-12-31', segments, current, timelineChanged, currentChanged }
}

/** لا تُنشأ فروقات ضمنية عن مسير أو تصفية معتمدين. */
export async function assertSalaryChangePeriodOpen(em: EntityManager, employeeId: number, from: string, to: string) {
  if (!em.queryRunner?.isTransactionActive) throw new Error('فحص فترة تغيير الأجر يتطلب معاملة نشطة')
  salaryHistoryDate(from); salaryHistoryDate(to)
  const runs = await em.query(`SELECT TOP (1) r.[id] FROM dbo.payroll_runs r WHERE r.[status] IN ('APPROVED','PAID') AND r.[startDate]<=@0 AND r.[endDate]>=@1 AND (
    EXISTS (SELECT 1 FROM dbo.payroll_items i WHERE i.[runId]=r.[id] AND i.[employeeId]=@2)
    OR EXISTS (SELECT 1 FROM dbo.payroll_run_members m WHERE m.[runId]=r.[id] AND m.[employeeId]=@2 AND (m.[membershipStatus] IS NULL OR m.[membershipStatus]='INCLUDED')))`, [to, from, employeeId])
  if (runs.length) conflict('SALARY_CHANGE_CLOSED_PERIOD', 'تاريخ تغيير الأجر يتداخل مع مسير معتمد أو مصروف؛ يلزم مسار فروقات الفترات السابقة بدل تعديل الأجر مباشرة')
  const settlements = await em.query(`SELECT TOP (1) [id] FROM dbo.offboarding_cases WHERE [employeeId]=@0 AND [status] IN ('SETTLED','CLOSED') AND [lastWorkingDay]>=@1`, [employeeId, from])
  if (settlements.length) conflict('SALARY_CHANGE_CLOSED_PERIOD', 'تاريخ تغيير الأجر يمس خدمة لها تصفية معتمدة؛ يلزم مراجعة فروقات التصفية أولًا')
}

/** يستدعيه ملف الموظف أو تنفيذ الطلب داخل معاملتهما؛ لا يحفظ كيان الموظف بكامل حقوله. */
export async function applyEmployeeSalaryChange(em: EntityManager, input: EmployeeSalaryChangeInput): Promise<EmployeeSalaryChangeResult> {
  if (!em.queryRunner?.isTransactionActive) throw new Error('تغيير الأجر يتطلب معاملة نشطة')
  const validId = (value: unknown) => typeof value === 'number' && Number.isInteger(value) && value > 0 && value <= 2147483647
  if (!validId(input.employeeId) || !validId(input.actorUserId)) bad('SALARY_CHANGE_IDENTITY_INVALID', 'معرّف الموظف والمستخدم المنفذ مطلوبان لتغيير الأجر')
  if (input.requestId !== undefined && !validId(input.requestId)) bad('SALARY_CHANGE_IDENTITY_INVALID', 'مرجع طلب تغيير الأجر غير صالح')
  if (!Number.isInteger(input.expectedRevision) || input.expectedRevision < 0 || input.expectedRevision >= 2147483647 || typeof input.expectedCurrentSourceHash !== 'string' || !/^[a-f0-9]{64}$/.test(input.expectedCurrentSourceHash)) bad('SALARY_CHANGE_EXPECTATION_INVALID', 'مراجعة سجل الأجر وبصمة المصدر الحالي مطلوبتان')
  const effectiveDate = salaryHistoryDate(input.effectiveDate), today = localDateOf(new Date())
  if (effectiveDate > today) bad('SALARY_CHANGE_FUTURE_REQUIRES_REQUEST', 'تغيير الأجر بتاريخ مستقبلي يُقدّم بطلب زيادة راتب مجدول؛ ملف الموظف يحتفظ بالأجر الحالي حتى السريان')
  const reason = salaryHistoryText(input.reason, 500, 'سبب تغيير الأجر'), evidenceReference = salaryHistoryText(input.evidenceReference, 200, 'مرجع تغيير الأجر')
  try {
    await lockPayrollEmployees(em, [input.employeeId])
    const current = await readSalaryHistoryCurrent(em, input.employeeId)
    if (!current) throw new NotFoundException('الموظف غير موجود')
    const previous = await readSalaryHistory(em, input.employeeId)
    if (previous.revision !== input.expectedRevision) throw new ConflictException({ code: 'SALARY_HISTORY_REVISION_CONFLICT', message: 'تغير سجل الأجر منذ فتحه؛ حدّث البيانات قبل الحفظ', currentRevision: previous.revision })
    if (current.currentSourceHash !== input.expectedCurrentSourceHash) conflict('SALARY_HISTORY_CURRENT_SOURCE_CHANGED', 'تغير الأجر الحالي منذ فتح النموذج؛ حدّث البيانات قبل الحفظ')
    if (previous.version && previous.version.currentSourceHash !== current.currentSourceHash) conflict('SALARY_CHANGE_HISTORY_SOURCE_CHANGED', 'تغير الأجر الحالي خارج سجل السريان؛ راجع إثبات سجل الأجر قبل إضافة تغيير جديد')
    const plan = planEmployeeSalaryChange({ previous: previous.segments, current: current.current, salary: input.salary, effectiveDate, today, previousEffectiveFrom: input.previousEffectiveFrom })
    if (!plan.timelineChanged && !plan.currentChanged) return { history: previous, current: current.current, changed: false, applied: true }
    await assertSalaryChangePeriodOpen(em, input.employeeId, plan.effectiveFrom, plan.effectiveTo)
    if (plan.currentChanged) {
      await em.query(`UPDATE dbo.employees SET ${SALARY_HISTORY_MONEY_KEYS.map((key, index) => `[${key}]=CAST(@${index + 1} AS decimal(18,2))`).join(', ')}, [currency]=@7 WHERE [id]=@0`, [input.employeeId, ...SALARY_HISTORY_MONEY_KEYS.map(key => plan.current[key]), plan.current.currency])
      for (const key of [...SALARY_HISTORY_MONEY_KEYS, 'currency'] as const) {
        if (current.current[key] !== plan.current[key]) await recordEmployeeChange(em, { employeeId: input.employeeId, fieldName: key, oldValue: current.current[key], newValue: plan.current[key], changedByUserId: input.actorUserId, requestId: input.requestId, reason: `${reason} — سريان ${effectiveDate} — ${evidenceReference}` })
      }
    }
    const savedCurrent = await readSalaryHistoryCurrent(em, input.employeeId)
    if (!savedCurrent || savedCurrent.currentSourceHash !== salaryCurrentSourceHash(plan.current)) conflict('SALARY_CHANGE_STORAGE_MISMATCH', 'الأجر المحفوظ لا يطابق التغيير المطلوب بدقته المالية')
    const history = await appendSalaryHistoryRevision(em, { employeeId: input.employeeId, reason, evidenceReference, currentSourceHash: savedCurrent!.currentSourceHash, segments: plan.segments, createdBy: input.actorUserId })
    return { history, current: savedCurrent!.current, changed: true, applied: true }
  } catch (error) {
    if (salaryHistorySchemaMissing(error)) conflict('SALARY_HISTORY_SCHEMA_MISSING', 'ترحيل سجل الأجر المؤرخ غير مطبق على قاعدة البيانات الحالية')
    throw error
  }
}
