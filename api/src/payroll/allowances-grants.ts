import { BadRequestException } from '@nestjs/common'
import { PayrollDecimal } from './payroll-decimal'

// «تابة البدلات» في شاشة المسير — قواعد نقية بلا قاعدة بيانات:
// أنواع البدلات (للشركة كلها أو لفرع)، وصرف بدل لشهر بمبلغ ثابت لكل موظف على استهداف موحد
// (الشركة ← فرع ← أقسام الفرع ← فرق الفرع ← موظفين) = سطر لكل موظف، وكل سطر بيتحول لإضافة في دفتر المديونيات
// (CREDIT / allowance) باسم نوع البدل وبشهره، فيدخل «إضافات أخرى» في مسير الشهر وإجمالياته والقسيمة.
// المسير المسودة/المحسوب بياخده عند الحساب أو إعادة الحساب؛ المعتمد والمصروف ما بيتغيرش.

export const ALLOWANCE_OBLIGATION_CATEGORY = 'allowance'
export const ALLOWANCE_SOURCE_PREFIX = 'allowance-grant:'
export const ALLOWANCE_TARGET_LEVELS = ['company', 'branch', 'departments', 'teams', 'employees'] as const
export type AllowanceTargetLevel = typeof ALLOWANCE_TARGET_LEVELS[number]
export const isAllowanceTargetLevel = (value: unknown): value is AllowanceTargetLevel =>
  typeof value === 'string' && (ALLOWANCE_TARGET_LEVELS as readonly string[]).includes(value)

// بدل دوام أيام العطلات بيتحسب لوحده من أوامر الشغل في العطلات؛ ما يتعملش نوع يدوي بنفس الاسم عشان ما يتصرفش مرتين
export const RESERVED_ALLOWANCE_NAMES = ['بدل دوام أيام العطلات']
export const ALLOWANCE_MAX_AMOUNT = '1000000'
export const ALLOWANCE_MAX_EMPLOYEES = 5000

// حالة سطر البدل كما تظهر في التابة (مشتقة من قيد الدفتر والمسيرات)
export const ALLOWANCE_LINE_STATES = ['PENDING', 'IN_RUN', 'NEEDS_RECALC', 'APPROVED', 'PAID', 'REVERSED', 'CANCELLED'] as const
export type AllowanceLineState = typeof ALLOWANCE_LINE_STATES[number]
export const ALLOWANCE_LINE_STATE_LABELS: Record<AllowanceLineState, string> = {
  PENDING: 'مستني حساب المسير',
  IN_RUN: 'محسوب في مسير لسه ما اتعتمدش',
  NEEDS_RECALC: 'أعد حساب المسير عشان يدخل',
  APPROVED: 'في مسير معتمد',
  PAID: 'اتصرف',
  REVERSED: 'اتعكس صرفه',
  CANCELLED: 'ملغى',
}

export interface AllowanceTarget {
  level: AllowanceTargetLevel
  branchId: number | null
  departmentIds: number[]
  teamIds: number[]
  employeeIds: number[]
}

export interface AllowanceEmployeeOrg {
  id: number
  branchId: number | null
  departmentId: number | null
  teamId: number | null
  status?: string | null
  isActive?: boolean | null
}

const fail = (message: string): never => { throw new BadRequestException(message) }

// الموظف اللي ساب الشغل ما يتصرفلوش بدل (نفس فلتر منتقي الاستهداف)
export const isAllowanceTargetable = (employee: AllowanceEmployeeOrg) =>
  !['terminated', 'archived'].includes(String(employee.status ?? '')) && employee.isActive !== false

export const uniqueIds = (ids: unknown): number[] =>
  [...new Set((Array.isArray(ids) ? ids : []).map(Number))].filter(id => Number.isSafeInteger(id) && id > 0).sort((a, b) => a - b)

/** الموظفين اللي عليهم الاستهداف فعلًا (مرتبين): الأقسام والفرق والموظفين جوه فرع الاستهداف بس. */
export function resolveAllowanceTargetEmployees(target: AllowanceTarget, employees: readonly AllowanceEmployeeOrg[]): number[] {
  const active = employees.filter(isAllowanceTargetable)
  let picked: AllowanceEmployeeOrg[]
  if (target.level === 'company') picked = active
  else if (target.branchId == null) picked = []
  else {
    const inBranch = active.filter(employee => employee.branchId === target.branchId)
    if (target.level === 'branch') picked = inBranch
    else if (target.level === 'departments') {
      const set = new Set(target.departmentIds)
      picked = inBranch.filter(employee => employee.departmentId != null && set.has(employee.departmentId))
    } else if (target.level === 'teams') {
      const set = new Set(target.teamIds)
      picked = inBranch.filter(employee => employee.teamId != null && set.has(employee.teamId))
    } else if (target.level === 'employees') {
      const set = new Set(target.employeeIds)
      picked = inBranch.filter(employee => set.has(employee.id))
    } else picked = []
  }
  return uniqueIds(picked.map(employee => employee.id))
}

/** مبلغ البدل: رقم موجب بمنزلتين بحد أقصى (بلا تقريب صامت)، ويرجع نص عشري بمنزلتين. */
export function allowanceAmount(value: unknown): string {
  let text: string
  if (typeof value === 'number') {
    if (!Number.isFinite(value)) fail('اكتب مبلغ البدل رقم صحيح')
    text = String(value)
  } else if (typeof value === 'string') text = value.trim()
  else return fail('اكتب مبلغ البدل')
  if (!/^\d{1,12}(\.\d{1,2})?$/.test(text)) fail('مبلغ البدل رقم موجب بمنزلتين عشريتين بحد أقصى')
  const amount = PayrollDecimal.from(text)
  if (amount.compare(PayrollDecimal.from('0')) <= 0) fail('مبلغ البدل لازم يكون أكبر من صفر')
  if (amount.compare(PayrollDecimal.from(ALLOWANCE_MAX_AMOUNT)) > 0) fail(`مبلغ البدل ما يزيدش عن ${ALLOWANCE_MAX_AMOUNT}`)
  return amount.format(2, 'DOWN')
}

/** اسم نوع البدل: نص مقصوص من 2 لـ120 حرف، ومش اسم بدل محجوز للنظام. */
export function allowanceTypeName(value: unknown): string {
  const name = typeof value === 'string' ? value.trim().replace(/\s+/g, ' ') : ''
  if (name.length < 2) fail('اكتب اسم البدل')
  if (name.length > 120) fail('اسم البدل أطول من 120 حرف')
  if (RESERVED_ALLOWANCE_NAMES.includes(name)) fail('«بدل دوام أيام العطلات» بيتحسب لوحده من أوامر الشغل في العطلات — مش محتاج نوع يدوي')
  return name
}

/** كود نوع البدل: حروف إنجليزية كبيرة وأرقام و_ و-، ولو فاضي يتولّد. */
export function allowanceTypeCode(value: unknown, generate: () => string): string {
  const raw = typeof value === 'string' ? value.trim().toUpperCase() : ''
  if (!raw) return generate()
  if (!/^[A-Z0-9][A-Z0-9_-]{0,39}$/.test(raw)) fail('الكود حروف إنجليزية وأرقام و _ أو - بس (لحد 40)')
  return raw
}

/** أرقام قيود الدفتر من نافذة نص التفصيل بعد «"obligationIds":[» (القراءة من غير فك JSON كامل لكل بند). */
export function parseObligationIdWindow(text: string | null | undefined): number[] {
  if (!text) return []
  const end = text.indexOf(']')
  const body = end < 0 ? '' : text.slice(0, end)
  if (!/^[\d,\s]*$/.test(body)) return []
  return uniqueIds(body.split(',').map(part => part.trim()).filter(Boolean))
}

export interface AllowanceLineFacts {
  lineStatus: string
  obligation: { status: string; reservedPayrollRunId: number | null; appliedPayrollRunId: number | null; payrollReversalRunId: number | null } | null
  // مسير مفتوح فيه الموظف لشهر البدل أو بعده: هل حسابه شايل القيد ده؟
  openRun: { id: number; includesObligation: boolean } | null
}

/** حالة سطر البدل والمسير المرتبط بيه. */
export function allowanceLineState(facts: AllowanceLineFacts): { state: AllowanceLineState; runId: number | null } {
  const { obligation } = facts
  if (facts.lineStatus === 'CANCELLED' || obligation?.status === 'CANCELLED') return { state: 'CANCELLED', runId: null }
  if (obligation?.status === 'APPLIED') {
    return { state: obligation.payrollReversalRunId != null ? 'REVERSED' : 'PAID', runId: obligation.appliedPayrollRunId }
  }
  if (obligation?.status === 'PENDING' && obligation.reservedPayrollRunId != null) return { state: 'APPROVED', runId: obligation.reservedPayrollRunId }
  if (facts.openRun) return { state: facts.openRun.includesObligation ? 'IN_RUN' : 'NEEDS_RECALC', runId: facts.openRun.id }
  return { state: 'PENDING', runId: null }
}

/** السطر يتلغي لما قيده لسه ما اتحجزش في مسير معتمد وما اتصرفش. */
export const allowanceLineCancellable = (state: AllowanceLineState) => ['PENDING', 'IN_RUN', 'NEEDS_RECALC'].includes(state)
