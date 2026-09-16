import { BadRequestException, ConflictException, ForbiddenException } from '@nestjs/common'
import type { EntityManager } from 'typeorm'
import type { Request } from './entities/request.entity'
import type { RequestType } from './entities/request-type.entity'
import { RequestApproval } from './entities/request-approval.entity'
import { PayrollDecimal } from '../payroll/payroll-decimal'
import { payrollLiveSourceContent } from '../payroll/payroll-live-source-contract'
import { applyEmployeeSalaryChange, readSalaryCycleStartDay } from '../payroll/payroll-salary-change'
import { readSalaryHistory, readSalaryHistoryCurrent, SALARY_HISTORY_MONEY_KEYS, salaryCurrentSourceHash, salaryHistoryDate, salaryHistoryMoney, salaryHistoryText } from '../payroll/payroll-salary-history'
import { PayrollPeriodSalaryError, salaryPayrollPeriod } from '../payroll/payroll-period-salary'
import { payrollPeriodBounds, payrollPeriodOfDate } from '../payroll/payroll-period'
import { MONTHLY_SALARY_COMPONENTS } from '../employees/compensation'

export const SALARY_CHANGE_HANDLER = 'salary_update_history'
// V2: قاعدة المالك — الزيادة تسري من راتب شهر كامل (effectivePayrollPeriod)؛ دليل V1 اليومي يلزمه إعادة تقديم.
export const SALARY_CHANGE_BASIS_VERSION = 'SALARY_REQUEST_BASIS_V2_20260914'
export const SALARY_CHANGE_CLIENT_FIELDS = ['newSalary', 'effectivePayrollPeriod', 'reason'] as const

function requestPayrollPeriod(value: unknown): string {
  try { return salaryPayrollPeriod(value) } catch (error) {
    if (error instanceof PayrollPeriodSalaryError) throw new BadRequestException({ code: 'SALARY_REQUEST_PAYROLL_PERIOD_INVALID', message: 'اختر «يسري من راتب شهر» بصيغة YYYY-MM صحيحة' })
    throw error
  }
}

/** تاريخ التنفيذ المجدول = بداية دورة شهر السريان وفق الدورة المثبتة؛ الشهر نفسه هو القرار. */
export async function salaryChangeExecutionDate(em: EntityManager, effectivePayrollPeriod: string): Promise<string> {
  return payrollPeriodBounds(requestPayrollPeriod(effectivePayrollPeriod), await readSalaryCycleStartDay(em)).startDate
}
const reserved = ['salaryChangeBasis', 'salaryChangeApproval']
type Salary = Record<typeof SALARY_HISTORY_MONEY_KEYS[number], string> & { currency: 'SAR' | 'EGP' }
type Payload = Record<string, any>
export interface SalaryChangeBasis {
  schemaVersion: typeof SALARY_CHANGE_BASIS_VERSION
  requestId: number; employeeId: number; branchId: number; historyRevision: number; currentSourceHash: string
  salary: Salary; stagedByUserId: number; contentHash: string
}
interface SalaryChangeApproval { actorUserId: number; approvedAt: string; basisContentHash: string }
const positive = (value: unknown): value is number => typeof value === 'number' && Number.isInteger(value) && value > 0 && value <= 2147483647
const hash = (value: unknown): value is string => typeof value === 'string' && /^[a-f0-9]{64}$/.test(value)
const object = (value: unknown): value is Payload => !!value && typeof value === 'object' && !Array.isArray(value) && [Object.prototype, null].includes(Object.getPrototypeOf(value))
const shape = (value: unknown, keys: string[]) => object(value) && Object.keys(value).length === keys.length && keys.every(key => Object.prototype.hasOwnProperty.call(value, key))
const conflict = (code: string, message: string): never => { throw new ConflictException({ code, message }) }
export const isSalaryChangeType = (type: Pick<RequestType, 'destinationHandler'>) => type.destinationHandler === SALARY_CHANGE_HANDLER

export function assertSalaryChangeClientPayload(raw: unknown, required = false): Payload {
  if (!object(raw)) throw new BadRequestException('حمولة طلب زيادة الراتب يجب أن تكون حقولًا مسماة')
  if (reserved.some(key => Object.prototype.hasOwnProperty.call(raw, key))) throw new BadRequestException('دليل الأجر وهوية المعتمد يثبتهما الخادم ولا يقبلان من مقدم الطلب')
  if (Object.prototype.hasOwnProperty.call(raw, 'effectiveDate')) {
    throw new BadRequestException({ code: 'SALARY_REQUEST_PAYROLL_PERIOD_REQUIRED', message: 'زيادة الراتب تسري من راتب شهر كامل؛ اختر «يسري من راتب شهر» بدل تاريخ السريان' })
  }
  const result = { ...raw }
  // النسبة القديمة للعرض فقط؛ لا تُقبل كقرار لتخطي خطوة موافقة.
  delete result.increase_pct
  if (required || result.newSalary != null && result.newSalary !== '') result.newSalary = salaryHistoryMoney(result.newSalary)
  if (required || result.effectivePayrollPeriod != null && result.effectivePayrollPeriod !== '') result.effectivePayrollPeriod = requestPayrollPeriod(result.effectivePayrollPeriod)
  if (required || result.reason != null && result.reason !== '') result.reason = salaryHistoryText(result.reason, 500, 'سبب زيادة الراتب')
  return result
}

function salaryShape(raw: unknown): Salary {
  if (!shape(raw, ['currency', ...SALARY_HISTORY_MONEY_KEYS])) conflict('SALARY_REQUEST_BASIS_INVALID', 'دليل مكونات الأجر غير مكتمل؛ أعد تقديم الطلب')
  const value = raw as Payload
  if (!['SAR', 'EGP'].includes(value.currency)) conflict('SALARY_REQUEST_BASIS_INVALID', 'عملة دليل الأجر غير صالحة')
  return { currency: value.currency, ...Object.fromEntries(SALARY_HISTORY_MONEY_KEYS.map(key => [key, salaryHistoryMoney(value[key])])) } as Salary
}

/** ملف أجر ناقص (عملة غير محددة أو مكوّن فارغ) لا يُبنى عليه دليل زيادة. كان يرجع 409 «عملة دليل الأجر غير صالحة»
 * أو «كل مكوّن أجر مبلغ نصي صريح…» دون أن يعرف الموظف أو المعتمد ما الناقص ولا من يستكمله. */
export function assertSalaryRequestFileComplete(current: Record<string, unknown> & { currency?: unknown }) {
  if (current.currency !== 'SAR' && current.currency !== 'EGP') {
    throw new BadRequestException({ code: 'SALARY_REQUEST_CURRENCY_REQUIRED', message: 'عملة أجر الموظف غير محددة في ملفه (ريال SAR أو جنيه EGP) — تضبطها الموارد البشرية من ملف الموظف ثم يُقدَّم طلب زيادة الراتب' })
  }
  const missing = MONTHLY_SALARY_COMPONENTS.filter(component => current[component.key] == null || current[component.key] === '')
  if (missing.length) {
    throw new BadRequestException({ code: 'SALARY_REQUEST_COMPONENTS_REQUIRED', message: `مكونات أجر الموظف غير مكتملة في ملفه (${missing.map(component => component.nameAr).join('، ')}) — تُدخلها الموارد البشرية (الصفر مقبول) ثم يُقدَّم طلب زيادة الراتب` })
  }
}

function increase(newSalary: string, salary: Salary) {
  const old = PayrollDecimal.from(salary.basicSalary), next = PayrollDecimal.from(newSalary)
  if (old.compare(PayrollDecimal.from('0')) <= 0) throw new BadRequestException({ code: 'SALARY_INCREASE_BASE_INVALID', message: 'الراتب الأساسي الحالي يجب أن يكون موجبًا لإثبات نسبة الزيادة؛ راجع الأجر أولًا' })
  if (next.compare(old) <= 0) throw new BadRequestException({ code: 'SALARY_INCREASE_NOT_HIGHER', message: 'طلب الزيادة يتطلب راتبًا أساسيًا جديدًا أكبر من الحالي' })
  return next.subtract(old).multiply(PayrollDecimal.from('100')).divide(old)
}

function basisHash(basis: Omit<SalaryChangeBasis, 'contentHash'>, payload: Payload) {
  return payrollLiveSourceContent({ basis, newSalary: payload.newSalary, effectivePayrollPeriod: payload.effectivePayrollPeriod, reason: payload.reason }).contentHash
}

export function readStoredSalaryChangePayload(raw: unknown, requireBasis = true): Payload & { salaryChangeBasis?: SalaryChangeBasis; salaryChangeApproval?: SalaryChangeApproval } {
  if (!object(raw)) conflict('SALARY_REQUEST_BASIS_INVALID', 'حمولة طلب الأجر المخزنة غير صالحة')
  const payload = raw as Payload
  // الطلب القديم (بلا تاريخ أو بتاريخ يومي) لا يُحوَّل إلى شهر مفترض؛ يُرجع لاختيار «يسري من راتب شهر».
  if (payload.effectivePayrollPeriod == null || payload.effectivePayrollPeriod === '') conflict('SALARY_REQUEST_PAYROLL_PERIOD_REQUIRED', 'طلب الأجر القديم لا يحدد «يسري من راتب شهر»؛ أرجعه لاستكمال المعلومات دون افتراض شهر')
  const client = assertSalaryChangeClientPayload(Object.fromEntries(Object.entries(payload).filter(([key]) => !reserved.includes(key))), true)
  const rawBasis = payload.salaryChangeBasis
  if (rawBasis == null) {
    if (requireBasis) conflict('SALARY_REQUEST_BASIS_REQUIRED', 'طلب الأجر يحتاج دليلًا حديثًا قبل الاعتماد؛ أرجعه لاستكمال المعلومات ثم أعد تقديمه')
    return client
  }
  if (!shape(rawBasis, ['schemaVersion', 'requestId', 'employeeId', 'branchId', 'historyRevision', 'currentSourceHash', 'salary', 'stagedByUserId', 'contentHash']) || rawBasis.schemaVersion !== SALARY_CHANGE_BASIS_VERSION ||
    !positive(rawBasis.requestId) || !positive(rawBasis.employeeId) || !positive(rawBasis.branchId) || !positive(rawBasis.stagedByUserId) || !Number.isInteger(rawBasis.historyRevision) || rawBasis.historyRevision < 0 || rawBasis.historyRevision >= 2147483647 || !hash(rawBasis.currentSourceHash) || !hash(rawBasis.contentHash)) conflict('SALARY_REQUEST_BASIS_INVALID', 'دليل طلب الأجر المخزن غير صالح؛ لا يمكن تنفيذ الزيادة')
  const salary = salaryShape(rawBasis.salary), { contentHash, ...withoutHash } = rawBasis
  const basis = { ...withoutHash, salary } as Omit<SalaryChangeBasis, 'contentHash'>
  if (salaryCurrentSourceHash(salary) !== basis.currentSourceHash || basisHash(basis, client) !== contentHash) conflict('SALARY_REQUEST_BASIS_INVALID', 'تغيرت قيم دليل طلب الأجر أو حمولته بعد التقديم؛ يلزم إعادة التقديم')
  const normalizedBasis: SalaryChangeBasis = { ...basis, contentHash }
  const result: Payload = { ...client, increase_pct: increase(client.newSalary, salary).format(6, 'HALF_UP'), salaryChangeBasis: normalizedBasis }
  if (payload.salaryChangeApproval != null) {
    const approval = payload.salaryChangeApproval
    if (!shape(approval, ['actorUserId', 'approvedAt', 'basisContentHash']) || !positive(approval.actorUserId) || typeof approval.approvedAt !== 'string' ||
      !/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}Z$/.test(approval.approvedAt) || !Number.isFinite(Date.parse(approval.approvedAt)) || new Date(approval.approvedAt).toISOString() !== approval.approvedAt || approval.basisContentHash !== contentHash) conflict('SALARY_REQUEST_APPROVAL_INVALID', 'مرجع اعتماد طلب الأجر غير صالح')
    result.salaryChangeApproval = { ...approval }
  }
  return result
}

export function salaryIncreaseThresholdMet(payload: unknown, field: string, operation: string, threshold: string | null | undefined) {
  const stored = readStoredSalaryChangePayload(payload), basis = stored.salaryChangeBasis!
  if (typeof threshold !== 'string') conflict('SALARY_REQUEST_THRESHOLD_INVALID', 'حد موافقة الأجر غير مثبت بدقة؛ راجع إعداد السلسلة')
  let comparison: number
  try {
    const value = field === 'increase_pct' ? increase(stored.newSalary, basis.salary) : PayrollDecimal.from(stored.newSalary)
    comparison = value.compare(PayrollDecimal.from(threshold as string))
  } catch { return conflict('SALARY_REQUEST_THRESHOLD_INVALID', 'حد موافقة الأجر غير صالح') }
  if (operation === '>=') return comparison >= 0
  if (operation === '>') return comparison > 0
  if (operation === '<=') return comparison <= 0
  if (operation === '<') return comparison < 0
  return conflict('SALARY_REQUEST_THRESHOLD_INVALID', 'عملية مقارنة حد موافقة الأجر غير صالحة')
}

async function currentBasis(em: EntityManager, req: Pick<Request, 'requesterId' | 'branchId'>) {
  if (!em.queryRunner?.isTransactionActive) throw new Error('دليل طلب الأجر يتطلب معاملة نشطة')
  const identity = await em.query('SELECT [id], [branchId], [status], [isActive] FROM dbo.employees WHERE [id]=@0', [req.requesterId])
  if (identity.length !== 1 || identity[0].id !== req.requesterId) conflict('SALARY_REQUEST_EMPLOYEE_MISSING', 'الموظف المستهدف غير موجود؛ لم ينفذ طلب الأجر')
  const employee = identity[0]
  if (employee.isActive !== true || !['active', 'probation', 'notice_period'].includes(employee.status)) conflict('SALARY_REQUEST_EMPLOYEE_INACTIVE', 'الموظف غير نشط؛ يلزم مراجعة طلب الأجر')
  if (!positive(req.branchId) || employee.branchId !== req.branchId) throw new ForbiddenException('تغير فرع الموظف منذ إنشاء الطلب؛ أعد تقديمه من الفرع الحالي')
  const current = await readSalaryHistoryCurrent(em, req.requesterId), history = await readSalaryHistory(em, req.requesterId)
  if (!current || current.employee.branchId !== req.branchId) conflict('SALARY_REQUEST_EMPLOYEE_CHANGED', 'تغير نطاق الموظف أثناء قراءة دليل الأجر')
  assertSalaryRequestFileComplete(current!.current)
  const salary = salaryShape(current!.current)
  if (history.version && history.version.currentSourceHash !== current!.currentSourceHash) conflict('SALARY_REQUEST_HISTORY_DRIFT', 'سجل الأجر السابق لا يطابق الملف الحالي؛ راجعه قبل تقديم زيادة جديدة')
  return { current: current!, salary, history }
}

export async function stageSalaryChangeRequest(em: EntityManager, req: Pick<Request, 'id' | 'requesterId' | 'branchId'>, raw: unknown, actorUserId: number) {
  if (!positive(req.id) || !positive(req.requesterId) || !positive(actorUserId)) throw new BadRequestException('هوية طلب الأجر أو مقدمه غير صالحة')
  const client = assertSalaryChangeClientPayload(raw, true), { current, salary, history } = await currentBasis(em, req)
  const pct = increase(client.newSalary, salary)
  const basis: Omit<SalaryChangeBasis, 'contentHash'> = { schemaVersion: SALARY_CHANGE_BASIS_VERSION, requestId: req.id, employeeId: req.requesterId, branchId: req.branchId,
    historyRevision: history.revision, currentSourceHash: current.currentSourceHash, salary, stagedByUserId: actorUserId }
  return { ...client, increase_pct: pct.format(6, 'HALF_UP'), salaryChangeBasis: { ...basis, contentHash: basisHash(basis, client) } }
}

export async function executeSalaryChangeRequest(em: EntityManager, req: Request, payload: unknown, today: string) {
  salaryHistoryDate(today)
  if (!em.queryRunner?.isTransactionActive || !['APPROVED', 'IN_EXECUTION'].includes(req.status)) conflict('SALARY_REQUEST_NOT_APPROVED', 'تطبيق الأجر يتطلب طلبًا معتمدًا داخل معاملته')
  const stored = readStoredSalaryChangePayload(payload), basis = stored.salaryChangeBasis!
  if (basis.requestId !== req.id || basis.employeeId !== req.requesterId || basis.branchId !== req.branchId) conflict('SALARY_REQUEST_BASIS_INVALID', 'هوية دليل الأجر لا تطابق الطلب')
  const live = await currentBasis(em, req)
  if (live.current.currentSourceHash !== basis.currentSourceHash || live.history.revision !== basis.historyRevision) conflict('SALARY_REQUEST_SOURCE_CHANGED', 'تغير الأجر أو سجل سريانه منذ تقديم الطلب؛ يلزم إعادة مراجعته قبل التنفيذ')
  const decision = await em.getRepository(RequestApproval).findOne({ where: { requestId: req.id, action: 'APPROVED' }, order: { id: 'DESC' } })
  const returned = await em.getRepository(RequestApproval).findOne({ where: { requestId: req.id, action: 'RETURNED_FOR_INFO' }, order: { id: 'DESC' } })
  // الموافقة السابقة على إرجاع الطلب لا تعتمد القيم الجديدة بعد إعادة تقديمه.
  const currentDecision = decision && (!returned || decision.id > returned.id) ? decision : null
  const autoActor = (em.queryRunner!.data.salaryRequestAutoActors as Map<number, number> | undefined)?.get(req.id)
  const candidateActor = req.status === 'APPROVED' ? autoActor ?? currentDecision?.approverId : currentDecision?.approverId ?? stored.salaryChangeApproval?.actorUserId
  if (!positive(candidateActor)) conflict('SALARY_REQUEST_APPROVER_MISSING', 'لا يوجد مرجع معتمد موثوق لطلب الأجر')
  const actor = candidateActor as number
  if (stored.salaryChangeApproval && stored.salaryChangeApproval.actorUserId !== actor) conflict('SALARY_REQUEST_APPROVAL_INVALID', 'هوية المعتمد المخزنة لا تطابق قرار الطلب')
  if (req.status === 'IN_EXECUTION' && !stored.salaryChangeApproval) conflict('SALARY_REQUEST_APPROVAL_INVALID', 'طلب الأجر المجدول لا يحمل دليل اعتماده؛ يلزم مراجعته')
  // لا نكتب الأجر أو تاريخه مبكرًا؛ نثبت مرجع القرار في الطلب نفسه فقط.
  stored.salaryChangeApproval ??= { actorUserId: actor, approvedAt: new Date().toISOString(), basisContentHash: basis.contentHash }
  req.payload = JSON.stringify(stored)
  const ref = `SAL-REQUEST-${req.id}`
  const cycleStartDay = await readSalaryCycleStartDay(em)
  if (stored.effectivePayrollPeriod > payrollPeriodOfDate(today, cycleStartDay)) {
    return { ref, completed: false, note: `زيادة راتب معتمدة مجدولة: تسري من راتب شهر ${stored.effectivePayrollPeriod} الذي تبدأ دورته ${payrollPeriodBounds(stored.effectivePayrollPeriod, cycleStartDay).startDate}` }
  }
  await applyEmployeeSalaryChange(em, { employeeId: req.requesterId, actorUserId: actor, effectivePayrollPeriod: stored.effectivePayrollPeriod, reason: stored.reason,
    evidenceReference: `request:${req.id}`, requestId: req.id, expectedRevision: basis.historyRevision, expectedCurrentSourceHash: basis.currentSourceHash,
    salary: { ...basis.salary, basicSalary: stored.newSalary } })
  return { ref, completed: true }
}

/** إغلاق القرار المعتمد لا يعكس أجرًا كُتب؛ وجود أي أثر مرتبط يفرض المراجعة بدل الإلغاء. */
export async function assertSalaryRequestUnexecuted(em: EntityManager, req: Request) {
  if (!em.queryRunner?.isTransactionActive || !positive(req.id) || !['APPROVED', 'IN_EXECUTION'].includes(req.status)) conflict('SALARY_REQUEST_REJECTION_INVALID', 'إغلاق زيادة الأجر المعتمدة يتطلب طلبًا غير منفذ داخل معاملته')
  const history = await em.query('SELECT TOP (1) [id] FROM dbo.employee_salary_history_versions WHERE [evidenceReference]=@0', [`request:${req.id}`])
  const changes = await em.query('SELECT TOP (1) [id] FROM dbo.employee_status_history WHERE [requestId]=@0', [req.id])
  if (history.length || changes.length) conflict('SALARY_REQUEST_ALREADY_APPLIED', 'يوجد أثر مالي مرتبط بهذا الطلب؛ لا يمكن رفض التنفيذ أو عكسه من مسار الطلبات')
}
