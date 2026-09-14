import { BadRequestException, ConflictException, NotFoundException } from '@nestjs/common'
import type { EntityManager } from 'typeorm'
import { localDateOf } from '../attendance/attendance.service'
import { recordEmployeeChange } from '../employees/employee-change-log'
import { payrollLiveSourceContent } from './payroll-live-source-contract'
import { lockPayrollEmployees } from './payroll-settlement-boundary'
import { appendMonthlySalaryHistoryRevision, readSalaryHistory, readSalaryHistoryCurrent,
  SALARY_HISTORY_MONEY_KEYS, salaryCurrentSourceHash, salaryHistorySchemaMissing,
  salaryHistoryText, type SalaryHistoryCurrent, type SalaryHistoryRead, type SalaryHistorySegment } from './payroll-salary-history'
import { type MonthlySalaryPeriod, normalizeMonthlySalaryPeriods, PAYROLL_MONTHLY_SALARY_HISTORY_VERSION, PayrollPeriodSalaryError, salaryPayrollPeriod } from './payroll-period-salary'
import { payrollPeriodBounds, payrollPeriodOfDate, shiftPayrollPeriod } from './payroll-period'

export type EmployeeSalaryValue = Pick<SalaryHistorySegment, typeof SALARY_HISTORY_MONEY_KEYS[number] | 'currency'>
export interface EmployeeSalaryChangeInput {
  employeeId: number
  actorUserId: number
  /** قاعدة المالك: يسري من راتب شهر (YYYY-MM) كامل؛ تاريخ إدخال القرار منفصل عن شهر استحقاقه. */
  effectivePayrollPeriod: string
  reason: string
  evidenceReference: string
  expectedRevision: number
  expectedCurrentSourceHash: string
  salary: EmployeeSalaryValue
  /** أول سجل فقط: أجر الملف الحالي يسري من هذا الشهر حتى الشهر السابق للتغيير. */
  previousEffectivePayrollPeriod?: string
  requestId?: number
}
export interface EmployeeSalaryChangeResult { history: SalaryHistoryRead; current: SalaryHistoryCurrent; changed: boolean; applied: true }
const bad = (code: string, message: string): never => { throw new BadRequestException({ code, message }) }
const conflict = (code: string, message: string): never => { throw new ConflictException({ code, message }) }
const salaryOf = (row: SalaryHistorySegment | MonthlySalaryPeriod): EmployeeSalaryValue => ({ currency: row.currency, ...Object.fromEntries(SALARY_HISTORY_MONEY_KEYS.map(key => [key, row[key]])) } as EmployeeSalaryValue)
const equal = (a: unknown, b: unknown) => payrollLiveSourceContent(a).contentHash === payrollLiveSourceContent(b).contentHash
const month = (value: unknown): string => {
  try { return salaryPayrollPeriod(value) } catch (error) {
    if (error instanceof PayrollPeriodSalaryError) bad('SALARY_CHANGE_PAYROLL_PERIOD_INVALID', 'اختر شهر السريان «يسري من راتب شهر» بصيغة YYYY-MM صحيحة')
    throw error
  }
}
const periodOnly = (row: SalaryHistorySegment | MonthlySalaryPeriod): MonthlySalaryPeriod => ({ ...salaryOf(row),
  effectivePayrollPeriod: row.effectivePayrollPeriod as string, effectiveToPayrollPeriod: row.effectiveToPayrollPeriod ?? null } as MonthlySalaryPeriod)

/** يوم بداية دورة الرواتب المثبت؛ يُقرأ داخل معاملة الكاتب ولا يُفترض. */
export async function readSalaryCycleStartDay(em: EntityManager): Promise<number> {
  const config = await em.query('SELECT [value] FROM dbo.requests_config WHERE [key]=@0', ['payroll.cycle_start_day'])
  if (config.length !== 1 || typeof config[0].value !== 'string' || !/^(?:[1-9]|[12][0-9]|3[01])$/.test(config[0].value)) {
    conflict('SALARY_PAYROLL_CYCLE_INVALID', 'إعداد بداية دورة الرواتب غير مثبت أو غير صالح؛ راجعه قبل تعديل الأجر')
  }
  return Number(config[0].value)
}

/**
 * قاعدة المالك: تغيير الراتب يسري على شهر مسير كامل ولا يُقسم داخله. يستبدل الشهور من شهر السريان حتى
 * القرار الشهري التالي، ويحافظ على الشهور السابقة والقرارات التالية، ولا ينسب أجر الملف الحالي لشهور سابقة.
 */
export function planEmployeeSalaryChange(input: {
  history: Pick<SalaryHistoryRead, 'version' | 'segments'>; current: SalaryHistoryCurrent; salary: EmployeeSalaryValue
  effectivePayrollPeriod: string; currentPayrollPeriod: string; cycleStartDay: number; previousEffectivePayrollPeriod?: string
}) {
  const effective = month(input.effectivePayrollPeriod), currentPeriod = month(input.currentPayrollPeriod)
  if (effective > currentPeriod) bad('SALARY_CHANGE_FUTURE_REQUIRES_REQUEST', 'تغيير الأجر من راتب شهر لاحق يُقدَّم بطلب زيادة راتب مجدول؛ ملف الموظف يحتفظ بالأجر الحالي حتى يبدأ ذلك الشهر')
  if (input.history.version && input.history.version.contractVersion !== PAYROLL_MONTHLY_SALARY_HISTORY_VERSION) {
    conflict('SALARY_CHANGE_MONTHLY_HISTORY_REQUIRED', 'سجل أجر الموظف مثبت بتواريخ يومية لا تحدد شهر الراتب؛ حوّله إلى «يسري من راتب شهر» من شاشة سجل الأجر قبل تعديل الراتب')
  }
  const previous = input.history.segments.map(periodOnly)
  const next = previous.find(row => row.effectivePayrollPeriod > effective)
  const effectiveTo = next ? shiftPayrollPeriod(next.effectivePayrollPeriod, -1) : null
  const replacement: MonthlySalaryPeriod = { ...salaryOf(input.salary as MonthlySalaryPeriod), effectivePayrollPeriod: effective, effectiveToPayrollPeriod: effectiveTo }
  const retained = previous.flatMap(row => {
    if (row.effectivePayrollPeriod > effective) return [{ ...row }]
    if (row.effectivePayrollPeriod === effective) return []
    return [{ ...row, effectiveToPayrollPeriod: row.effectiveToPayrollPeriod !== null && row.effectiveToPayrollPeriod < effective ? row.effectiveToPayrollPeriod : shiftPayrollPeriod(effective, -1) }]
  })
  if (input.previousEffectivePayrollPeriod !== undefined) {
    if (previous.length) bad('SALARY_CHANGE_PREVIOUS_ALREADY_DOCUMENTED', 'الأجر السابق موثق بالفعل؛ لا تقبل بداية افتتاحية جديدة فوق السجل')
    const from = month(input.previousEffectivePayrollPeriod)
    if (from >= effective) bad('SALARY_CHANGE_PREVIOUS_RANGE_INVALID', 'شهر بداية الأجر السابق يجب أن يسبق شهر تغيير الأجر')
    let opening: MonthlySalaryPeriod | null = null
    try { opening = periodOnly(normalizeMonthlySalaryPeriods([{ ...input.current, effectivePayrollPeriod: from, effectiveToPayrollPeriod: shiftPayrollPeriod(effective, -1) }], input.cycleStartDay)[0]) }
    catch { bad('SALARY_CHANGE_PREVIOUS_SALARY_INCOMPLETE', 'الأجر السابق أو العملة غير مكتملين؛ لا يمكن إثبات شهور سابقة من بيانات ناقصة') }
    retained.push(opening!)
  }
  let segments: ReturnType<typeof normalizeMonthlySalaryPeriods>
  try { segments = normalizeMonthlySalaryPeriods([...retained, replacement], input.cycleStartDay) }
  catch (error) {
    if (error instanceof PayrollPeriodSalaryError) bad('SALARY_HISTORY_AMOUNT_INVALID', 'مكونات الأجر ستة مبالغ غير سالبة بمنزلتين عشريتين على الأكثر والعملة SAR أو EGP')
    throw error
  }
  const active = segments.find(row => row.effectivePayrollPeriod <= currentPeriod && (row.effectiveToPayrollPeriod === null || row.effectiveToPayrollPeriod >= currentPeriod))
  if (!active) conflict('SALARY_CHANGE_CURRENT_COVERAGE_MISSING', 'السجل الناتج لا يثبت راتب شهر المسير الحالي؛ راجع الشهور التالية قبل تطبيق التعديل')
  const current = salaryOf(active!), timelineChanged = !equal(previous, segments.map(periodOnly))
  const currentChanged = salaryCurrentSourceHash(current) !== salaryCurrentSourceHash(input.current)
  return { effectivePayrollPeriod: effective, effectiveToPayrollPeriod: effectiveTo, segments, periods: segments.map(periodOnly), current, timelineChanged, currentChanged }
}

/** لا تُنشأ فروقات ضمنية: مسير معتمد أو مصروف للموظف لأي شهر ضمن مدى التغيير، أو تصفية معتمدة، يمنعه. */
export async function assertSalaryChangePeriodOpen(em: EntityManager, employeeId: number, fromPeriod: string, toPeriod: string | null, cycleStartDay: number) {
  if (!em.queryRunner?.isTransactionActive) throw new Error('فحص فترة تغيير الأجر يتطلب معاملة نشطة')
  const from = month(fromPeriod), to = toPeriod === null ? null : month(toPeriod)
  const runs = await em.query(`SELECT TOP (1) r.[id] FROM dbo.payroll_runs r WHERE r.[status] IN ('APPROVED','PAID') AND r.[period]>=@0 AND (@1 IS NULL OR r.[period]<=@1) AND (
    EXISTS (SELECT 1 FROM dbo.payroll_items i WHERE i.[runId]=r.[id] AND i.[employeeId]=@2)
    OR EXISTS (SELECT 1 FROM dbo.payroll_run_members m WHERE m.[runId]=r.[id] AND m.[employeeId]=@2 AND (m.[membershipStatus] IS NULL OR m.[membershipStatus]='INCLUDED')))`, [from, to, employeeId])
  if (runs.length) conflict('SALARY_CHANGE_CLOSED_PERIOD', 'شهر تغيير الأجر يشمل مسيرًا معتمدًا أو مصروفًا للموظف؛ يلزم مسار فروقات الفترات السابقة بدل تعديل الأجر مباشرة')
  const settlements = await em.query(`SELECT TOP (1) [id] FROM dbo.offboarding_cases WHERE [employeeId]=@0 AND [status] IN ('SETTLED','CLOSED') AND [lastWorkingDay]>=@1`, [employeeId, payrollPeriodBounds(from, cycleStartDay).startDate])
  if (settlements.length) conflict('SALARY_CHANGE_CLOSED_PERIOD', 'شهر تغيير الأجر يمس خدمة لها تصفية معتمدة؛ يلزم مراجعة فروقات التصفية أولًا')
}

/**
 * شاشة سجل الأجر الشهري: راتب شهر دخل مسيرًا معتمدًا أو مصروفًا لا يتغير (قيمةً وعملة) بمراجعة لاحقة.
 * المقارنة بالسجل الشهري السابق، أو بمصدر الراتب المحفوظ في لقطة العضو؛ المسير القديم بلا لقطة لا يُفترض له راتب.
 */
export async function assertMonthlySalaryHistoryKeepsClosedPeriods(em: EntityManager, employeeId: number, previous: Pick<SalaryHistoryRead, 'version' | 'segments'>, nextPeriods: MonthlySalaryPeriod[]) {
  if (!em.queryRunner?.isTransactionActive) throw new Error('فحص شهور المسيرات المعتمدة يتطلب معاملة نشطة')
  const rows: Array<{ id: number; period: string; snapshot: string | null }> = await em.query(`SELECT r.[id], r.[period], m.[snapshot] FROM dbo.payroll_runs r
    LEFT JOIN dbo.payroll_run_members m ON m.[runId]=r.[id] AND m.[employeeId]=@0
    WHERE r.[status] IN ('APPROVED','PAID') AND (EXISTS (SELECT 1 FROM dbo.payroll_items i WHERE i.[runId]=r.[id] AND i.[employeeId]=@0)
      OR (m.[id] IS NOT NULL AND (m.[membershipStatus] IS NULL OR m.[membershipStatus]='INCLUDED')))`, [employeeId])
  const pick = (periods: MonthlySalaryPeriod[], period: string) => periods.find(row => row.effectivePayrollPeriod <= period && (row.effectiveToPayrollPeriod === null || row.effectiveToPayrollPeriod >= period)) ?? null
  const amounts = (row: Partial<Record<string, string | null>> | null, withCurrency: boolean) => row ? JSON.stringify([...(withCurrency ? [row.currency] : []), ...SALARY_HISTORY_MONEY_KEYS.map(key => row[key])]) : null
  const monthlyPrevious = previous.version?.contractVersion === PAYROLL_MONTHLY_SALARY_HISTORY_VERSION ? previous.segments.map(periodOnly) : null
  for (const row of rows) {
    let saved: string | null, next: string | null
    if (monthlyPrevious) { saved = amounts(pick(monthlyPrevious, row.period), true); next = amounts(pick(nextPeriods, row.period), true) }
    else {
      let source: { amounts?: Record<string, string> } | null = null
      try { source = row.snapshot ? JSON.parse(row.snapshot)?.salarySource ?? null : null } catch { source = null }
      if (!source?.amounts) continue
      saved = amounts(source.amounts, false); next = amounts(pick(nextPeriods, row.period) as Partial<Record<string, string>> | null, false)
    }
    if (saved !== next) conflict('SALARY_HISTORY_CLOSED_PERIOD', `راتب شهر ${row.period} دخل مسيرًا معتمدًا أو مصروفًا (#${row.id})؛ لا يُعدَّل من سجل الأجر — يلزم مسار فروقات`)
  }
}

export interface EmployeeSalaryStartContext {
  cycleStartDay: number
  currentPayrollPeriod: string
  hireDate: string | null
  hirePayrollPeriod: string | null
  /** أقدم شهر مقبول لأجر التعيين: شهر التعيين نفسه (لا أجر قبل الخدمة). */
  minPayrollPeriod: string | null
  /** أحدث شهر مقبول: شهر التعيين إن كان لاحقًا، وإلا شهر المسير الجاري (الشهر اللاحق يُقدَّم بطلب زيادة). */
  maxPayrollPeriod: string
  /** الافتراض عند غياب الاختيار: شهر التعيين أو شهر المسير الجاري أيهما أحدث — لا يُنسب أجر الملف لشهور سبقت إنشاءه. */
  defaultPayrollPeriod: string
  defaultPayrollPeriodBounds: { startDate: string; endDate: string }
}

/**
 * الخطوة 13 (ملف الموظف عند الإنشاء): حدود «يسري من راتب شهر» لأجر التعيين. دالة صرفة؛ تاريخ اليوم ودورة الرواتب مدخلان.
 * التعيين بتاريخ داخل الشهر الجاري أو لاحقًا يوثَّق من شهر التعيين؛ تاريخ تعيين قديم (ملف منقول من نظام سابق) يوثَّق
 * افتراضيًا من الشهر الجاري، ويُقبل اختيار شهر التعيين صراحةً.
 */
export function employeeSalaryStartContext(input: { cycleStartDay: number; today: string; hireDate?: string | null }): EmployeeSalaryStartContext {
  const hireDate = input.hireDate ? input.hireDate : null
  let currentPayrollPeriod: string, hirePayrollPeriod: string | null
  try {
    currentPayrollPeriod = payrollPeriodOfDate(input.today, input.cycleStartDay)
    hirePayrollPeriod = hireDate === null ? null : payrollPeriodOfDate(hireDate, input.cycleStartDay)
  } catch { return bad('EMPLOYEE_SALARY_START_DATE_INVALID', 'تاريخ التعيين أو دورة الرواتب غير صالحين لتحديد «يسري من راتب شهر»') }
  const latest = hirePayrollPeriod !== null && hirePayrollPeriod > currentPayrollPeriod ? hirePayrollPeriod : currentPayrollPeriod
  return { cycleStartDay: input.cycleStartDay, currentPayrollPeriod, hireDate, hirePayrollPeriod, minPayrollPeriod: hirePayrollPeriod,
    maxPayrollPeriod: latest, defaultPayrollPeriod: latest, defaultPayrollPeriodBounds: payrollPeriodBounds(latest, input.cycleStartDay) }
}

/**
 * يستدعيه إنشاء الموظف داخل معاملته بعد حفظ الملف: يوثّق أجر الملف المحفوظ نفسه (بمبالغه الدقيقة من SQL) مراجعةً شهرية أولى
 * «يسري من راتب شهر»، فيدخل الموظف أول مسير له في الوضع الافتراضي بلا توثيق منفصل. أجر صفري لا يُوثَّق (يُستبعد بسبب ظاهر).
 */
export async function documentInitialEmployeeSalary(em: EntityManager, input: { employeeId: number; actorUserId: number; hireDate: string | null;
  effectivePayrollPeriod?: string; evidenceReference?: string }): Promise<{ documented: false } | { documented: true; effectivePayrollPeriod: string; history: SalaryHistoryRead }> {
  if (!em.queryRunner?.isTransactionActive) throw new Error('توثيق أجر التعيين يتطلب معاملة إنشاء الموظف')
  const validId = (value: unknown) => typeof value === 'number' && Number.isInteger(value) && value > 0 && value <= 2147483647
  if (!validId(input.employeeId) || !validId(input.actorUserId)) bad('EMPLOYEE_SALARY_START_IDENTITY_INVALID', 'معرّف الموظف والمستخدم المنشئ مطلوبان لتوثيق أجر التعيين')
  try {
    const current = await readSalaryHistoryCurrent(em, input.employeeId)
    if (!current) throw new NotFoundException('الموظف غير موجود')
    const amounts = Object.fromEntries(SALARY_HISTORY_MONEY_KEYS.map(key => [key, current.current[key] === null ? '0.00' : current.current[key]!])) as Record<typeof SALARY_HISTORY_MONEY_KEYS[number], string>
    if (SALARY_HISTORY_MONEY_KEYS.every(key => /^0+(?:\.0+)?$/.test(amounts[key]))) {
      if (input.effectivePayrollPeriod !== undefined) bad('EMPLOYEE_SALARY_START_WITHOUT_SALARY', 'لا يوجد أجر لتوثيق «يسري من راتب شهر»؛ أدخل مكونات الأجر أو اترك الشهر فارغًا')
      return { documented: false }
    }
    if (current.current.currency !== 'SAR' && current.current.currency !== 'EGP') bad('EMPLOYEE_SALARY_CURRENCY_REQUIRED', 'عملة أجر الموظف يجب أن تكون ريالًا سعوديًا (SAR) أو جنيهًا مصريًا (EGP) ليُوثَّق أجر التعيين ويدخل المسير')
    const cycleStartDay = await readSalaryCycleStartDay(em)
    const context = employeeSalaryStartContext({ cycleStartDay, today: localDateOf(new Date()), hireDate: input.hireDate })
    const effective = input.effectivePayrollPeriod === undefined ? context.defaultPayrollPeriod : month(input.effectivePayrollPeriod)
    if (context.minPayrollPeriod !== null && effective < context.minPayrollPeriod) bad('EMPLOYEE_SALARY_START_BEFORE_HIRE', `أجر التعيين لا يسري قبل راتب شهر التعيين ${context.minPayrollPeriod}`)
    if (effective > context.maxPayrollPeriod) bad('EMPLOYEE_SALARY_START_TOO_LATE', `أجر التعيين يسري من راتب شهر ${context.maxPayrollPeriod} على الأكثر؛ تغيير الأجر من شهر لاحق يُقدَّم بطلب زيادة راتب بعد الإنشاء`)
    const previous = await readSalaryHistory(em, input.employeeId)
    if (previous.revision !== 0) conflict('EMPLOYEE_SALARY_START_ALREADY_DOCUMENTED', 'سجل أجر الموظف موجود بالفعل؛ لا يُكتب أجر تعيين فوقه')
    const evidenceReference = salaryHistoryText(input.evidenceReference ?? `إنشاء ملف الموظف #${input.employeeId}`, 200, 'مرجع أجر التعيين')
    const history = await appendMonthlySalaryHistoryRevision(em, { employeeId: input.employeeId, reason: 'أجر التعيين المثبت عند إنشاء ملف الموظف',
      evidenceReference, currentSourceHash: current.currentSourceHash, cycleStartDay, createdBy: input.actorUserId,
      periods: [{ ...amounts, currency: current.current.currency as 'SAR' | 'EGP', effectivePayrollPeriod: effective, effectiveToPayrollPeriod: null }] })
    return { documented: true, effectivePayrollPeriod: effective, history }
  } catch (error) {
    if (salaryHistorySchemaMissing(error)) conflict('SALARY_HISTORY_SCHEMA_MISSING', 'ترحيل سجل الأجر المؤرخ غير مطبق على قاعدة البيانات الحالية')
    throw error
  }
}

/** يستدعيه ملف الموظف أو تنفيذ الطلب داخل معاملتهما؛ لا يحفظ كيان الموظف بكامل حقوله. */
export async function applyEmployeeSalaryChange(em: EntityManager, input: EmployeeSalaryChangeInput): Promise<EmployeeSalaryChangeResult> {
  if (!em.queryRunner?.isTransactionActive) throw new Error('تغيير الأجر يتطلب معاملة نشطة')
  const validId = (value: unknown) => typeof value === 'number' && Number.isInteger(value) && value > 0 && value <= 2147483647
  if (!validId(input.employeeId) || !validId(input.actorUserId)) bad('SALARY_CHANGE_IDENTITY_INVALID', 'معرّف الموظف والمستخدم المنفذ مطلوبان لتغيير الأجر')
  if (input.requestId !== undefined && !validId(input.requestId)) bad('SALARY_CHANGE_IDENTITY_INVALID', 'مرجع طلب تغيير الأجر غير صالح')
  if (!Number.isInteger(input.expectedRevision) || input.expectedRevision < 0 || input.expectedRevision >= 2147483647 || typeof input.expectedCurrentSourceHash !== 'string' || !/^[a-f0-9]{64}$/.test(input.expectedCurrentSourceHash)) bad('SALARY_CHANGE_EXPECTATION_INVALID', 'مراجعة سجل الأجر وبصمة المصدر الحالي مطلوبتان')
  const effectivePayrollPeriod = month(input.effectivePayrollPeriod)
  const previousEffectivePayrollPeriod = input.previousEffectivePayrollPeriod === undefined ? undefined : month(input.previousEffectivePayrollPeriod)
  const reason = salaryHistoryText(input.reason, 500, 'سبب تغيير الأجر'), evidenceReference = salaryHistoryText(input.evidenceReference, 200, 'مرجع تغيير الأجر')
  try {
    await lockPayrollEmployees(em, [input.employeeId])
    const cycleStartDay = await readSalaryCycleStartDay(em)
    // شهر المسير الجاري وفق الدورة؛ الشهر اللاحق يُقدَّم بطلب زيادة مجدول.
    const currentPayrollPeriod = payrollPeriodOfDate(localDateOf(new Date()), cycleStartDay)
    if (effectivePayrollPeriod > currentPayrollPeriod) bad('SALARY_CHANGE_FUTURE_REQUIRES_REQUEST', 'تغيير الأجر من راتب شهر لاحق يُقدَّم بطلب زيادة راتب مجدول؛ ملف الموظف يحتفظ بالأجر الحالي حتى يبدأ ذلك الشهر')
    const current = await readSalaryHistoryCurrent(em, input.employeeId)
    if (!current) throw new NotFoundException('الموظف غير موجود')
    const previous = await readSalaryHistory(em, input.employeeId)
    if (previous.revision !== input.expectedRevision) throw new ConflictException({ code: 'SALARY_HISTORY_REVISION_CONFLICT', message: 'تغير سجل الأجر منذ فتحه؛ حدّث البيانات قبل الحفظ', currentRevision: previous.revision })
    if (current.currentSourceHash !== input.expectedCurrentSourceHash) conflict('SALARY_HISTORY_CURRENT_SOURCE_CHANGED', 'تغير الأجر الحالي منذ فتح النموذج؛ حدّث البيانات قبل الحفظ')
    if (previous.version && previous.version.currentSourceHash !== current.currentSourceHash) conflict('SALARY_CHANGE_HISTORY_SOURCE_CHANGED', 'تغير الأجر الحالي خارج سجل السريان؛ راجع إثبات سجل الأجر قبل إضافة تغيير جديد')
    const plan = planEmployeeSalaryChange({ history: previous, current: current.current, salary: input.salary, effectivePayrollPeriod, currentPayrollPeriod, cycleStartDay, previousEffectivePayrollPeriod })
    if (!plan.timelineChanged && !plan.currentChanged) return { history: previous, current: current.current, changed: false, applied: true }
    await assertSalaryChangePeriodOpen(em, input.employeeId, previousEffectivePayrollPeriod ?? plan.effectivePayrollPeriod, plan.effectiveToPayrollPeriod, cycleStartDay)
    if (plan.currentChanged) {
      await em.query(`UPDATE dbo.employees SET ${SALARY_HISTORY_MONEY_KEYS.map((key, index) => `[${key}]=CAST(@${index + 1} AS decimal(18,2))`).join(', ')}, [currency]=@7 WHERE [id]=@0`, [input.employeeId, ...SALARY_HISTORY_MONEY_KEYS.map(key => plan.current[key]), plan.current.currency])
      for (const key of [...SALARY_HISTORY_MONEY_KEYS, 'currency'] as const) {
        if (current.current[key] !== plan.current[key]) await recordEmployeeChange(em, { employeeId: input.employeeId, fieldName: key, oldValue: current.current[key], newValue: plan.current[key], changedByUserId: input.actorUserId, requestId: input.requestId, reason: `${reason} — يسري من راتب شهر ${effectivePayrollPeriod} — ${evidenceReference}` })
      }
    }
    const savedCurrent = await readSalaryHistoryCurrent(em, input.employeeId)
    if (!savedCurrent || savedCurrent.currentSourceHash !== salaryCurrentSourceHash(plan.current)) conflict('SALARY_CHANGE_STORAGE_MISMATCH', 'الأجر المحفوظ لا يطابق التغيير المطلوب بدقته المالية')
    const history = await appendMonthlySalaryHistoryRevision(em, { employeeId: input.employeeId, reason, evidenceReference, currentSourceHash: savedCurrent!.currentSourceHash,
      periods: plan.periods, cycleStartDay, createdBy: input.actorUserId })
    return { history, current: savedCurrent!.current, changed: true, applied: true }
  } catch (error) {
    if (salaryHistorySchemaMissing(error)) conflict('SALARY_HISTORY_SCHEMA_MISSING', 'ترحيل سجل الأجر المؤرخ غير مطبق على قاعدة البيانات الحالية')
    throw error
  }
}
