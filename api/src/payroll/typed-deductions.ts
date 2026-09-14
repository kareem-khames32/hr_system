import { BadRequestException } from '@nestjs/common'
import { createHash } from 'node:crypto'
import { PayrollDecimal } from './payroll-decimal'

// قواعد الخصومات المصنّفة النقية (بلا قاعدة بيانات): الكتالوج، طرق الحساب والحدود (DD-01/02)،
// التصعيد (DD-03)، التقسيط (DD-10)، وسلسلة الاعتماد الملتقطة (DD-06). المال بكسور دقيقة ومنزلتين نصف لأعلى (D4).
export const TYPED_DEDUCTIONS_VERSION = 'DD_TYPED_DEDUCTIONS_V1_20260914' as const

export const DEDUCTION_CATEGORIES = ['DISCIPLINARY', 'PERFORMANCE', 'ADMINISTRATIVE', 'STATUTORY', 'COURT_ORDER'] as const
export type DeductionCategory = typeof DEDUCTION_CATEGORIES[number]
export const DEDUCTION_CALC_METHODS = ['FIXED_AMOUNT', 'DAYS_OF_SALARY', 'HOURS_OF_SALARY', 'PERCENT_OF_BASE', 'PERCENT_OF_GROSS'] as const
export type DeductionCalcMethod = typeof DEDUCTION_CALC_METHODS[number]
// FUNCTION_OWNER (DD-03 قاعدة 2 / DD-04 قاعدة 2): مدير الجهة المالكة للنوع على نطاقه الوظيفي المعرّف صراحةً
export const DEDUCTION_CREATOR_BASES = ['DIRECT_MANAGER', 'TEAM_LEADER', 'DEPARTMENT_MANAGER', 'BRANCH_MANAGER', 'FUNCTION_OWNER', 'HR'] as const
export type DeductionCreatorBasis = typeof DEDUCTION_CREATOR_BASES[number]
// الأدوار الهيكلية المُنشئة التي يقيّدها «النوع المملوك لجهة» (DD-03 قاعدة 3)
export const DEDUCTION_ORG_CREATOR_BASES: readonly DeductionCreatorBasis[] = ['DIRECT_MANAGER', 'TEAM_LEADER', 'DEPARTMENT_MANAGER', 'BRANCH_MANAGER']
export const DEDUCTION_APPROVAL_ROLES = ['DIRECT_MANAGER', 'TEAM_LEADER', 'DEPARTMENT_MANAGER', 'BRANCH_MANAGER', 'HR', 'EXECUTIVE'] as const
export type DeductionApprovalRole = typeof DEDUCTION_APPROVAL_ROLES[number]
export const DEDUCTION_STRUCTURAL_ROLES = ['DIRECT_MANAGER', 'TEAM_LEADER', 'DEPARTMENT_MANAGER', 'BRANCH_MANAGER'] as const
export type DeductionStructuralRole = typeof DEDUCTION_STRUCTURAL_ROLES[number]
export const DEDUCTION_ESCALATION_ROLES = ['DEPARTMENT_MANAGER', 'BRANCH_MANAGER', 'EXECUTIVE'] as const
export const DEDUCTION_REQUEST_STATUSES = ['IN_APPROVAL', 'APPROVED', 'REJECTED', 'WITHDRAWN', 'CANCELLED'] as const
// المعتمِد المفقود: NEXT_LEVEL يصعد لمستوى هيكلي أعلى (وخطوة التصعيد تنتهي بالإدارة التنفيذية)، SKIP يتخطى بسبب مسجل
export const DEDUCTION_MISSING_APPROVER_FALLBACKS = ['NEXT_LEVEL', 'SKIP'] as const
export type DeductionMissingApproverFallback = typeof DEDUCTION_MISSING_APPROVER_FALLBACKS[number]
// DD-06 قاعدة 1: سلوك انتهاء مهلة الخطوة
export const DEDUCTION_SLA_ACTIONS = ['ESCALATE', 'WAIT', 'AUTO_REJECT'] as const
export type DeductionSlaAction = typeof DEDUCTION_SLA_ACTIONS[number]
// DD-12: قيد العكس الموجب بعد الاستهلاك
export const DEDUCTION_REVERSAL_OBLIGATION_CATEGORY = 'deduction_reversal'
export const DEDUCTION_SELECTION_MODES = ['EMPLOYEES', 'TEAM', 'DEPARTMENT', 'BRANCH'] as const
export type DeductionSelectionMode = typeof DEDUCTION_SELECTION_MODES[number]
// التصنيف المحمي: لا إعفاء مالي عليه أبدًا (DD-01 قاعدة 2)
export const DEDUCTION_PROTECTED_CATEGORIES: readonly DeductionCategory[] = ['STATUTORY', 'COURT_ORDER']
export const TYPED_DEDUCTION_OBLIGATION_CATEGORY = 'typed_deduction'

export const DEDUCTION_LABELS = {
  categories: { DISCIPLINARY: 'تأديبي', PERFORMANCE: 'أداء وجودة', ADMINISTRATIVE: 'إداري', STATUTORY: 'نظامي', COURT_ORDER: 'حكم قضائي' } as Record<DeductionCategory, string>,
  calcMethods: { FIXED_AMOUNT: 'مبلغ ثابت', DAYS_OF_SALARY: 'أيام من الراتب', HOURS_OF_SALARY: 'ساعات من الراتب', PERCENT_OF_BASE: 'نسبة من الأساسي', PERCENT_OF_GROSS: 'نسبة من إجمالي الراتب' } as Record<DeductionCalcMethod, string>,
  roles: { DIRECT_MANAGER: 'المدير المباشر', TEAM_LEADER: 'قائد الفريق', DEPARTMENT_MANAGER: 'مدير القسم', BRANCH_MANAGER: 'مدير الفرع', FUNCTION_OWNER: 'مدير الجهة المالكة', HR: 'الموارد البشرية', EXECUTIVE: 'الإدارة التنفيذية' } as Record<DeductionApprovalRole | DeductionCreatorBasis, string>,
  statuses: { IN_APPROVAL: 'قيد الاعتماد', APPROVED: 'معتمد — بانتظار المسير', REJECTED: 'مرفوض', WITHDRAWN: 'مسحوب', CANCELLED: 'ملغى' } as Record<string, string>,
  obligationStatuses: { PENDING: 'بانتظار المسير', APPLIED: 'مستهلك في مسير مصروف', CANCELLED: 'ملغى', SUSPENDED: 'معلق — بانتظار قرار الموارد البشرية' } as Record<string, string>,
}

const fail = (code: string, message: string, details: Record<string, unknown> = {}): never => {
  throw new BadRequestException({ code, message, ...details })
}
const D = (value: string) => PayrollDecimal.from(value)
const ZERO = D('0'), HUNDRED = D('100')

/** نص عشري قانوني من رقم أو نص؛ بلا تقريب صامت للمنازل الزائدة. */
export function deductionDecimal(value: unknown, label: string, options: { scale: number; positive?: boolean; max?: string }): string {
  let text: unknown = value
  if (typeof value === 'number') {
    if (!Number.isFinite(value)) fail('DEDUCTION_VALUE_INVALID', `${label}: رقم صالح مطلوب`)
    text = PayrollDecimal.from(value).canonical()
  }
  if (typeof text !== 'string' || !/^\d{1,14}(?:\.\d+)?$/.test(text.trim())) fail('DEDUCTION_VALUE_INVALID', `${label}: رقم عشري غير سالب مطلوب`)
  const trimmed = (text as string).trim()
  if ((trimmed.split('.')[1]?.length ?? 0) > options.scale) fail('DEDUCTION_VALUE_INVALID', `${label}: بحد أقصى ${options.scale} منازل عشرية`)
  const decimal = D(trimmed)
  if (options.positive !== false && decimal.compare(ZERO) <= 0) fail('DEDUCTION_VALUE_INVALID', `${label} يجب أن يكون أكبر من صفر`)
  if (options.max !== undefined && decimal.compare(D(options.max)) > 0) fail('DEDUCTION_VALUE_INVALID', `${label} لا يتجاوز ${options.max}`)
  return decimal.canonical()
}
const optionalDecimal = (value: unknown, label: string, options: { scale: number; positive?: boolean; max?: string }) =>
  value === null || value === undefined || value === '' ? null : deductionDecimal(value, label, options)
const money = (value: PayrollDecimal) => value.format(2, 'HALF_UP')

// ===== إعدادات الخصومات المصنفة: حدود واحدة يقرؤها الخادم ويتحقق بها PATCH /settings/config =====
export const DEDUCTION_NUMERIC_SETTINGS: Record<string, { min: number; max: number; fallback: number; label: string }> = {
  'deductions.reason_min_length': { min: 1, max: 1000, fallback: 20, label: 'أقل طول لسبب الخصم' },
  'deductions.duplicate_window_hours': { min: 0, max: 8760, fallback: 24, label: 'نافذة كشف التكرار بالساعات' },
  'deductions.bulk_max_employees': { min: 1, max: 5000, fallback: 500, label: 'حد الموظفين في الدفعة الجماعية' },
  'deductions.step_sla_hours': { min: 0, max: 8760, fallback: 48, label: 'مهلة خطوة الاعتماد بالساعات (0 = بلا مهلة)' },
  'deductions.objection_window_days': { min: 0, max: 365, fallback: 5, label: 'مهلة اعتراض الموظف بالأيام (0 = بلا اعتراض)' },
  'deductions.max_carry_forward_count': { min: 0, max: 99, fallback: 3, label: 'أقصى ترحيلات للقسط قبل تعليقه (0 = بلا حد)' },
  'deductions.repeat_deduction_threshold': { min: 1, max: 99, fallback: 3, label: 'عدد الخصومات خلال 90 يومًا لوسم التكرار' },
}
export const DEDUCTION_ENUM_SETTINGS: Record<string, { values: readonly string[]; fallback: string }> = {
  'deductions.manager_creation_enabled': { values: ['true', 'false'], fallback: 'true' },
  'deductions.missing_approver_fallback': { values: DEDUCTION_MISSING_APPROVER_FALLBACKS, fallback: 'NEXT_LEVEL' },
  'deductions.sla_breach_action': { values: DEDUCTION_SLA_ACTIONS, fallback: 'ESCALATE' },
  'deductions.objection_blocks_approval': { values: ['true', 'false'], fallback: 'true' },
}
export const DEDUCTION_SETTING_KEYS = [...Object.keys(DEDUCTION_NUMERIC_SETTINGS), ...Object.keys(DEDUCTION_ENUM_SETTINGS)]
// القيم المبذورة عند الإقلاع (configSeed): نفس الافتراضات أعلاه
export const DEDUCTION_CONFIG_SEED: Array<{ key: string; value: string }> = [
  ...Object.entries(DEDUCTION_NUMERIC_SETTINGS).map(([key, rule]) => ({ key, value: String(rule.fallback) })),
  ...Object.entries(DEDUCTION_ENUM_SETTINGS).map(([key, rule]) => ({ key, value: rule.fallback })),
]

/** قيمة رقمية صحيحة محفوظة: خارج الحدود تُقصّ إلى الحد، وغير الصالحة تعود للافتراضي. */
export function deductionNumericSetting(key: string, raw: string | null | undefined): number {
  const rule = DEDUCTION_NUMERIC_SETTINGS[key]
  if (!rule) throw new Error(`إعداد خصومات غير معروف: ${key}`)
  const text = typeof raw === 'string' ? raw.trim() : ''
  if (!/^-?\d+$/.test(text)) return rule.fallback
  return Math.min(rule.max, Math.max(rule.min, Number(text)))
}
export function deductionEnumSetting(key: string, raw: string | null | undefined): string {
  const rule = DEDUCTION_ENUM_SETTINGS[key]
  if (!rule) throw new Error(`إعداد خصومات غير معروف: ${key}`)
  const text = typeof raw === 'string' ? raw.trim() : ''
  return rule.values.includes(text) ? text : rule.fallback
}
/** تحقق PATCH /settings/config لمفاتيح deductions.*؛ null = صالح أو مفتاح آخر. */
export function deductionSettingError(key: string, value: string): string | null {
  const numeric = DEDUCTION_NUMERIC_SETTINGS[key]
  if (numeric) {
    const text = String(value ?? '').trim()
    return /^\d+$/.test(text) && Number(text) >= numeric.min && Number(text) <= numeric.max ? null : `${numeric.label}: عدد صحيح من ${numeric.min} إلى ${numeric.max}`
  }
  const choice = DEDUCTION_ENUM_SETTINGS[key]
  if (choice) return choice.values.includes(String(value ?? '').trim()) ? null : `القيم المسموحة لـ«${key}»: ${choice.values.join('، ')}`
  return null
}

export interface DeductionTypeRules {
  code: string
  nameAr: string
  nameEn: string | null
  category: DeductionCategory
  calcMethod: DeductionCalcMethod
  defaultValue: string | null
  valueStep: string | null
  minAmount: string | null
  maxAmount: string | null
  maxPctOfGross: string | null
  isExemptable: boolean
  installmentAllowed: boolean
  maxInstallments: number
  requiresAttachment: boolean
  creatorScopes: DeductionCreatorBasis[]
  approvalSteps: DeductionApprovalRole[]
  escalationDays: string | null
  escalationStep: DeductionApprovalRole | null
  maxIncidentAgeDays: number
  carryForwardPriority: number
  isActive: boolean
  // DD-01: الجهة المالكة (قسم)؛ null = نوع غير مملوك لجهة
  ownerDepartmentId: number | null
  // DD-04 قاعدة 2: النطاق الوظيفي الصريح للجهة المالكة؛ null = شجرة القسم المالك نفسها
  functionalScope: DeductionFunctionalScope | null
  // DD-03 قاعدة 1/5: مصفوفة «أقصى مبلغ بلا تصعيد» لكل دور مُنشئ بأيام الراتب؛ غياب الدور = حد النوع، null = بلا تصعيد لهذا الدور
  basisEscalationDays: Partial<Record<DeductionCreatorBasis, string | null>>
}
export interface DeductionFunctionalScope { departmentIds: number[]; teamIds: number[]; employeeIds: number[] }
// التعديل على أي منها يرفع نسخة النوع (DD-01 قاعدة 4)
export const DEDUCTION_TYPE_FINANCIAL_FIELDS: ReadonlyArray<keyof DeductionTypeRules> = ['category', 'calcMethod', 'defaultValue', 'valueStep', 'minAmount', 'maxAmount',
  'maxPctOfGross', 'isExemptable', 'installmentAllowed', 'maxInstallments', 'requiresAttachment', 'creatorScopes', 'approvalSteps', 'escalationDays', 'escalationStep',
  'maxIncidentAgeDays', 'carryForwardPriority', 'ownerDepartmentId', 'functionalScope', 'basisEscalationDays']

function list<T extends string>(value: unknown, allowed: readonly T[], label: string): T[] {
  const raw = Array.isArray(value) ? value : typeof value === 'string' ? value.split(',') : null
  if (!raw) fail('DEDUCTION_TYPE_INVALID', `${label}: قائمة مطلوبة`)
  const items = (raw as unknown[]).map(item => typeof item === 'string' ? item.trim() : item).filter(item => item !== '')
  if (items.some(item => !allowed.includes(item as T))) fail('DEDUCTION_TYPE_INVALID', `${label}: قيمة غير معروفة`)
  return [...new Set(items as T[])]
}
function bool(value: unknown, fallback: boolean, label: string): boolean {
  if (value === undefined) return fallback
  if (typeof value !== 'boolean') fail('DEDUCTION_TYPE_INVALID', `${label}: نعم/لا مطلوب`)
  return value as boolean
}
function integer(value: unknown, fallback: number, min: number, max: number, label: string): number {
  if (value === undefined) return fallback
  const number = typeof value === 'string' && /^\d+$/.test(value) ? Number(value) : value
  if (typeof number !== 'number' || !Number.isInteger(number) || number < min || number > max) fail('DEDUCTION_TYPE_INVALID', `${label}: عدد صحيح من ${min} إلى ${max}`)
  return number as number
}

/** يطبّع تعريف نوع جديد أو تعديل نوع قائم. الكود ثابت بعد الإنشاء. */
export function normalizeDeductionTypeRules(input: Record<string, unknown>, existing?: DeductionTypeRules): DeductionTypeRules {
  if (!input || typeof input !== 'object' || Array.isArray(input)) fail('DEDUCTION_TYPE_INVALID', 'تعريف النوع مطلوب')
  const has = (key: string) => Object.prototype.hasOwnProperty.call(input, key) && input[key] !== undefined
  const pick = <K extends keyof DeductionTypeRules>(key: K): unknown => has(key) ? input[key] : existing?.[key]
  let code: string
  if (existing) {
    if (has('code') && input.code !== existing.code) fail('DEDUCTION_TYPE_CODE_IMMUTABLE', 'كود نوع الخصم ثابت بعد إنشائه')
    code = existing.code
  } else {
    if (typeof input.code !== 'string' || !/^[A-Z][A-Z0-9_]{1,39}$/.test(input.code.trim())) fail('DEDUCTION_TYPE_INVALID', 'الكود: حروف إنجليزية كبيرة وأرقام وشرطة سفلية (2-40)')
    code = (input.code as string).trim()
  }
  const nameAr = typeof pick('nameAr') === 'string' ? (pick('nameAr') as string).trim() : ''
  if (nameAr.length < 2 || nameAr.length > 120) fail('DEDUCTION_TYPE_INVALID', 'الاسم العربي للنوع مطلوب (2-120 حرفًا)')
  const nameEnRaw = pick('nameEn')
  if (nameEnRaw != null && (typeof nameEnRaw !== 'string' || nameEnRaw.trim().length > 120)) fail('DEDUCTION_TYPE_INVALID', 'الاسم الإنجليزي بحد أقصى 120 حرفًا')
  const nameEn = typeof nameEnRaw === 'string' && nameEnRaw.trim() ? nameEnRaw.trim() : null
  const category = pick('category') as DeductionCategory
  if (!DEDUCTION_CATEGORIES.includes(category)) fail('DEDUCTION_TYPE_INVALID', 'فئة النوع غير معروفة')
  // DD-01 قاعدة 2: النظامي والحكم القضائي لا يُحوَّلان لفئة أخرى (وإلا صار الإعفاء ممكنًا بتعديلين)
  if (existing && DEDUCTION_PROTECTED_CATEGORIES.includes(existing.category) && category !== existing.category) {
    fail('DEDUCTION_TYPE_PROTECTED_CATEGORY', 'فئة الاستقطاع النظامي أو الحكم القضائي ثابتة ولا تُعدّل؛ أنشئ نوعًا جديدًا')
  }
  const calcMethod = pick('calcMethod') as DeductionCalcMethod
  if (!DEDUCTION_CALC_METHODS.includes(calcMethod)) fail('DEDUCTION_TYPE_INVALID', 'طريقة الحساب غير معروفة')
  const unitScale = calcMethod === 'FIXED_AMOUNT' ? 2 : 4
  const defaultValue = optionalDecimal(pick('defaultValue'), 'القيمة الافتراضية', { scale: unitScale })
  const stepDefault = existing && existing.calcMethod === calcMethod ? existing.valueStep : ['DAYS_OF_SALARY', 'HOURS_OF_SALARY'].includes(calcMethod) ? '0.25' : null
  const valueStep = ['DAYS_OF_SALARY', 'HOURS_OF_SALARY'].includes(calcMethod)
    ? (has('valueStep') ? optionalDecimal(input.valueStep, 'خطوة المدخل', { scale: 4, max: '24' }) : stepDefault) : null
  const minAmount = has('minAmount') || existing ? optionalDecimal(pick('minAmount'), 'الحد الأدنى', { scale: 2 }) : '1'
  const maxAmount = optionalDecimal(pick('maxAmount'), 'الحد الأعلى', { scale: 2 })
  const maxPctOfGross = has('maxPctOfGross') || existing ? optionalDecimal(pick('maxPctOfGross'), 'أقصى نسبة من الإجمالي', { scale: 4, max: '100' }) : '25'
  if (minAmount && maxAmount && D(minAmount).compare(D(maxAmount)) > 0) fail('DEDUCTION_TYPE_INVALID', 'الحد الأدنى أكبر من الحد الأعلى')
  const protectedCategory = DEDUCTION_PROTECTED_CATEGORIES.includes(category)
  if (protectedCategory && input.isExemptable === true) fail('DEDUCTION_TYPE_NOT_EXEMPTABLE', 'الاستقطاع النظامي أو الحكم القضائي لا يقبل الإعفاء المالي')
  const isExemptable = protectedCategory ? false : bool(pick('isExemptable'), true, 'قابل للإعفاء')
  const installmentAllowed = bool(pick('installmentAllowed'), false, 'يسمح بالتقسيط')
  const maxInstallments = installmentAllowed ? integer(pick('maxInstallments'), 6, 1, 24, 'أقصى عدد أقساط') : 1
  const requiresAttachment = bool(pick('requiresAttachment'), false, 'المرفق إلزامي')
  const creatorScopes = list(pick('creatorScopes') ?? 'DIRECT_MANAGER,TEAM_LEADER,DEPARTMENT_MANAGER,HR', DEDUCTION_CREATOR_BASES, 'نطاق المُنشئ')
  if (!creatorScopes.length) fail('DEDUCTION_TYPE_INVALID', 'حدد نطاق مُنشئ واحدًا على الأقل')
  // DD-06 قاعدة 2: خطوة الموارد البشرية الأخيرة لا تُحذف
  const approvalSteps = [...list(pick('approvalSteps') ?? 'HR', DEDUCTION_APPROVAL_ROLES, 'سلسلة الاعتماد').filter(role => role !== 'HR'), 'HR'] as DeductionApprovalRole[]
  const escalationDays = optionalDecimal(has('escalationDays') || existing ? pick('escalationDays') : '1', 'حد التصعيد بالأيام', { scale: 4, max: '365' })
  let escalationStep: DeductionApprovalRole | null = null
  if (escalationDays !== null) {
    escalationStep = (pick('escalationStep') ?? 'DEPARTMENT_MANAGER') as DeductionApprovalRole
    if (!(DEDUCTION_ESCALATION_ROLES as readonly string[]).includes(escalationStep)) fail('DEDUCTION_TYPE_INVALID', 'خطوة التصعيد: مدير القسم أو مدير الفرع أو الإدارة التنفيذية')
  }
  const ownerRaw = pick('ownerDepartmentId')
  const ownerDepartmentId = ownerRaw === null || ownerRaw === undefined || ownerRaw === '' ? null : integer(ownerRaw, 0, 1, 2147483647, 'الجهة المالكة')
  const functionalScope = normalizeFunctionalScope(pick('functionalScope'))
  if (functionalScope && ownerDepartmentId === null) fail('DEDUCTION_TYPE_INVALID', 'النطاق الوظيفي يتطلب تحديد الجهة المالكة للنوع')
  if (creatorScopes.includes('FUNCTION_OWNER') && ownerDepartmentId === null) fail('DEDUCTION_TYPE_INVALID', 'إنشاء «مدير الجهة المالكة» يتطلب تحديد الجهة المالكة للنوع')
  const basisEscalationDays = normalizeBasisEscalation(pick('basisEscalationDays'), creatorScopes)
  return {
    code, nameAr, nameEn, category, calcMethod, defaultValue, valueStep, minAmount, maxAmount, maxPctOfGross, isExemptable, installmentAllowed, maxInstallments,
    requiresAttachment, creatorScopes, approvalSteps, escalationDays, escalationStep,
    maxIncidentAgeDays: integer(pick('maxIncidentAgeDays'), 90, 0, 3650, 'أقصى عمر للواقعة بالأيام'),
    carryForwardPriority: integer(pick('carryForwardPriority'), 3, 1, 99, 'أولوية الترحيل'),
    isActive: bool(pick('isActive'), true, 'مفعل'),
    ownerDepartmentId, functionalScope, basisEscalationDays,
  }
}

function jsonValue(value: unknown): unknown {
  if (typeof value !== 'string') return value
  if (!value.trim()) return null
  try { return JSON.parse(value) } catch { return fail('DEDUCTION_TYPE_INVALID', 'قيمة JSON غير صالحة في تعريف النوع') }
}

/** قوائم معرفات موجبة فريدة مرتبة؛ القوائم الثلاث الفارغة = null. */
function normalizeFunctionalScope(value: unknown): DeductionFunctionalScope | null {
  const raw = jsonValue(value)
  if (raw === null || raw === undefined) return null
  if (typeof raw !== 'object' || Array.isArray(raw)) fail('DEDUCTION_TYPE_INVALID', 'النطاق الوظيفي: أقسام وفرق وموظفون')
  const ids = (key: keyof DeductionFunctionalScope, label: string) => {
    const list = (raw as Record<string, unknown>)[key] ?? []
    if (!Array.isArray(list) || list.length > 500 || list.some(item => !Number.isSafeInteger(item) || Number(item) < 1)) fail('DEDUCTION_TYPE_INVALID', `النطاق الوظيفي: ${label} معرفات صحيحة موجبة (حتى 500)`)
    return [...new Set(list as number[])].sort((a, b) => a - b)
  }
  const scope = { departmentIds: ids('departmentIds', 'الأقسام'), teamIds: ids('teamIds', 'الفرق'), employeeIds: ids('employeeIds', 'الموظفون') }
  return scope.departmentIds.length || scope.teamIds.length || scope.employeeIds.length ? scope : null
}

/** مصفوفة التصعيد لكل دور: مفاتيح من أدوار الإنشاء المسموحة، وقيم أيام (4 منازل حتى 365) أو null. */
function normalizeBasisEscalation(value: unknown, creatorScopes: DeductionCreatorBasis[]): Partial<Record<DeductionCreatorBasis, string | null>> {
  const raw = jsonValue(value)
  if (raw === null || raw === undefined) return {}
  if (typeof raw !== 'object' || Array.isArray(raw)) fail('DEDUCTION_TYPE_INVALID', 'مصفوفة التصعيد لكل دور غير صالحة')
  const result: Partial<Record<DeductionCreatorBasis, string | null>> = {}
  for (const key of Object.keys(raw as object).sort()) {
    if (!DEDUCTION_CREATOR_BASES.includes(key as DeductionCreatorBasis)) fail('DEDUCTION_TYPE_INVALID', `مصفوفة التصعيد: دور غير معروف ${key}`)
    if (!creatorScopes.includes(key as DeductionCreatorBasis)) continue
    const days = (raw as Record<string, unknown>)[key]
    result[key as DeductionCreatorBasis] = days === null ? null : deductionDecimal(days, `حد التصعيد لدور ${DEDUCTION_LABELS.roles[key as DeductionCreatorBasis]}`, { scale: 4, max: '365' })
  }
  return result
}

/** حد التصعيد الفعلي لدور المُنشئ (DD-03 قاعدة 5). */
export function deductionEscalationDaysFor(rules: Pick<DeductionTypeRules, 'escalationDays' | 'basisEscalationDays'>, basis: DeductionCreatorBasis | string | null | undefined): string | null {
  const matrix = rules.basisEscalationDays ?? {}
  return basis && Object.prototype.hasOwnProperty.call(matrix, basis) ? matrix[basis as DeductionCreatorBasis] ?? null : rules.escalationDays
}

/** قراءة صف الكتالوج أو لقطته إلى قواعد مطبّعة (الأرقام العشرية تُحوّل إلى نص قانوني). */
export function deductionTypeRulesFromRow(row: Record<string, any>): DeductionTypeRules {
  const text = (value: unknown) => value === null || value === undefined ? null : PayrollDecimal.from(typeof value === 'number' ? value : String(value)).canonical()
  return normalizeDeductionTypeRules({
    code: row.code, nameAr: row.nameAr, nameEn: row.nameEn ?? null, category: row.category, calcMethod: row.calcMethod,
    defaultValue: text(row.defaultValue), valueStep: text(row.valueStep), minAmount: text(row.minAmount), maxAmount: text(row.maxAmount),
    maxPctOfGross: text(row.maxPctOfGross), isExemptable: Boolean(row.isExemptable), installmentAllowed: Boolean(row.installmentAllowed),
    maxInstallments: Number(row.maxInstallments), requiresAttachment: Boolean(row.requiresAttachment), creatorScopes: row.creatorScopes,
    approvalSteps: row.approvalSteps, escalationDays: text(row.escalationDays), escalationStep: row.escalationStep ?? null,
    maxIncidentAgeDays: Number(row.maxIncidentAgeDays), carryForwardPriority: Number(row.carryForwardPriority), isActive: Boolean(row.isActive),
    // الأعمدة الجديدة NULL للأنواع القائمة وللقطات الطلبات السابقة لها
    ownerDepartmentId: row.ownerDepartmentId ?? null, functionalScope: row.functionalScope ?? null, basisEscalationDays: row.basisEscalationDays ?? null,
  }, { code: row.code } as DeductionTypeRules)
}

export function deductionTypeColumns(rules: DeductionTypeRules) {
  return { ...rules, creatorScopes: rules.creatorScopes.join(','), approvalSteps: rules.approvalSteps.join(','),
    functionalScope: rules.functionalScope ? JSON.stringify(rules.functionalScope) : null,
    basisEscalationDays: Object.keys(rules.basisEscalationDays).length ? JSON.stringify(rules.basisEscalationDays) : null }
}

export function deductionTypeFinancialChanged(before: DeductionTypeRules, after: DeductionTypeRules) {
  return DEDUCTION_TYPE_FINANCIAL_FIELDS.some(field => JSON.stringify(before[field]) !== JSON.stringify(after[field]))
}

export interface DeductionSalaryBasis { basic: string; gross: string; monthlyDays: string; dailyHours: string; source: string }
export interface DeductionAmountTrace {
  version: typeof TYPED_DEDUCTIONS_VERSION
  calcMethod: DeductionCalcMethod
  inputValue: string
  amount: string
  basic: string
  gross: string
  dayRate: string
  hourRate: string
  pctLimit: string | null
  escalationThreshold: string | null
  escalated: boolean
  salarySource: string
  formula: string
}

/** DD-02: الناتج بالعملة للشهر المستهدف، مع فحص الحدود وحد التصعيد. */
export function computeDeductionAmount(rules: Pick<DeductionTypeRules, 'calcMethod' | 'valueStep' | 'minAmount' | 'maxAmount' | 'maxPctOfGross' | 'escalationDays'>,
  inputValue: unknown, salary: DeductionSalaryBasis): DeductionAmountTrace {
  const method = rules.calcMethod
  const input = method === 'FIXED_AMOUNT' ? deductionDecimal(inputValue, 'المبلغ', { scale: 2, max: '99999999' })
    : method === 'DAYS_OF_SALARY' ? deductionDecimal(inputValue, 'عدد الأيام', { scale: 4, max: '365' })
      : method === 'HOURS_OF_SALARY' ? deductionDecimal(inputValue, 'عدد الساعات', { scale: 4, max: '2920' })
        : deductionDecimal(inputValue, 'النسبة', { scale: 4, max: '100' })
  if (rules.valueStep && ['DAYS_OF_SALARY', 'HOURS_OF_SALARY'].includes(method) && D(input).divide(D(rules.valueStep)).denominator !== 1n) {
    fail('DEDUCTION_STEP_INVALID', `القيمة ${input} ليست من مضاعفات الخطوة ${rules.valueStep}`, { step: rules.valueStep })
  }
  const basic = D(deductionDecimal(salary.basic, 'الراتب الأساسي', { scale: 2, positive: false }))
  const gross = D(deductionDecimal(salary.gross, 'إجمالي الراتب', { scale: 2, positive: false }))
  const days = D(deductionDecimal(salary.monthlyDays, 'أساس أيام الشهر', { scale: 2 }))
  const hours = D(deductionDecimal(salary.dailyHours, 'ساعات اليوم', { scale: 2 }))
  const dayRate = gross.divide(days), hourRate = dayRate.divide(hours)
  const value = D(input)
  if (method !== 'FIXED_AMOUNT' && (method === 'PERCENT_OF_BASE' ? basic : gross).isZero()) {
    fail('DEDUCTION_NO_SALARY', 'لا يوجد راتب مسجل للموظف في الشهر المستهدف لحساب الخصم')
  }
  const raw = method === 'FIXED_AMOUNT' ? value : method === 'DAYS_OF_SALARY' ? value.multiply(dayRate)
    : method === 'HOURS_OF_SALARY' ? value.multiply(hourRate) : method === 'PERCENT_OF_BASE' ? value.multiply(basic).divide(HUNDRED) : value.multiply(gross).divide(HUNDRED)
  const amount = money(raw)
  if (D(amount).compare(ZERO) <= 0) fail('DEDUCTION_ZERO', 'ناتج الخصم صفر؛ راجع القيمة المدخلة')
  if (rules.minAmount && D(amount).compare(D(rules.minAmount)) < 0) fail('DEDUCTION_BELOW_MIN', `مبلغ الخصم ${amount} أقل من الحد الأدنى للنوع ${money(D(rules.minAmount))}`, { limit: money(D(rules.minAmount)), amount })
  if (rules.maxAmount && D(amount).compare(D(rules.maxAmount)) > 0) fail('DEDUCTION_ABOVE_MAX', `مبلغ الخصم ${amount} يتجاوز الحد الأعلى للنوع ${money(D(rules.maxAmount))}`, { limit: money(D(rules.maxAmount)), amount })
  let pctLimit: string | null = null
  if (rules.maxPctOfGross) {
    if (gross.isZero()) fail('DEDUCTION_NO_SALARY', 'لا يوجد راتب مسجل للموظف لفحص حد النسبة من الإجمالي')
    pctLimit = money(gross.multiply(D(rules.maxPctOfGross)).divide(HUNDRED))
    if (D(amount).compare(D(pctLimit)) > 0) {
      fail('DEDUCTION_ABOVE_PCT_OF_GROSS', `مبلغ الخصم ${amount} يتجاوز الحد ${pctLimit} (${rules.maxPctOfGross}% من إجمالي الراتب ${money(gross)})`, { limit: pctLimit, amount })
    }
  }
  const escalationThreshold = rules.escalationDays === null ? null : money(D(rules.escalationDays).multiply(dayRate))
  const unit = method === 'FIXED_AMOUNT' ? '' : method === 'DAYS_OF_SALARY' ? ` يوم × ${money(dayRate)}` : method === 'HOURS_OF_SALARY' ? ` ساعة × ${money(hourRate)}`
    : method === 'PERCENT_OF_BASE' ? `% × ${money(basic)}` : `% × ${money(gross)}`
  return {
    version: TYPED_DEDUCTIONS_VERSION, calcMethod: method, inputValue: input, amount, basic: money(basic), gross: money(gross),
    dayRate: dayRate.format(6, 'HALF_UP'), hourRate: hourRate.format(6, 'HALF_UP'), pctLimit, escalationThreshold,
    escalated: escalationThreshold !== null && D(amount).compare(D(escalationThreshold)) > 0, salarySource: salary.source,
    formula: method === 'FIXED_AMOUNT' ? `${amount}` : `${input}${unit} = ${amount}`,
  }
}

/** DD-10: base = FLOOR(total×100÷n)÷100 والباقي في القسط الأخير. */
export function splitDeductionInstallments(total: string, count: number): string[] {
  if (!Number.isInteger(count) || count < 1 || count > 24) fail('DEDUCTION_INSTALLMENTS_INVALID', 'عدد الأقساط من 1 إلى 24')
  const cents = BigInt(money(D(deductionDecimal(total, 'مبلغ الخصم', { scale: 2 }))).replace('.', ''))
  const n = BigInt(count), base = cents / n, last = cents - base * (n - 1n)
  if (base < 1n) fail('DEDUCTION_INSTALLMENT_TOO_SMALL', 'قيمة القسط أقل من وحدة عملة واحدة؛ قلل عدد الأقساط')
  const format = (value: bigint) => { const digits = value.toString().padStart(3, '0'); return `${digits.slice(0, -2)}.${digits.slice(-2)}` }
  return Array.from({ length: count }, (_, index) => format(index === count - 1 ? last : base))
}

/** DD-10 قاعدة 2: الخصم بالأيام/الساعات يُقسَّط على الوحدة (4 منازل) لا على المبلغ؛ الباقي في القسط الأخير،
 *  وكل قسط يُسعَّر بسعر يوم شهر مسيره. */
export function splitDeductionUnits(total: string, count: number): string[] {
  if (!Number.isInteger(count) || count < 1 || count > 24) fail('DEDUCTION_INSTALLMENTS_INVALID', 'عدد الأقساط من 1 إلى 24')
  const units = D(deductionDecimal(total, 'عدد الوحدات', { scale: 4 })).format(4, 'HALF_UP')
  const scaled = BigInt(units.replace('.', ''))
  const n = BigInt(count), base = scaled / n, last = scaled - base * (n - 1n)
  if (base < 1n) fail('DEDUCTION_INSTALLMENT_TOO_SMALL', 'وحدة القسط أقل من 0.0001؛ قلل عدد الأقساط')
  const format = (value: bigint) => { const digits = value.toString().padStart(5, '0'); return D(`${digits.slice(0, -4)}.${digits.slice(-4)}`).canonical() }
  return Array.from({ length: count }, (_, index) => format(index === count - 1 ? last : base))
}

/** هل تُقسّط الطريقة بالوحدات (DD-10 قاعدة 2)؟ */
export function deductionSplitsByUnits(method: DeductionCalcMethod | string) {
  return method === 'DAYS_OF_SALARY' || method === 'HOURS_OF_SALARY'
}

export function deductionPeriod(value: unknown, label = 'الشهر المستهدف'): string {
  if (typeof value !== 'string' || !/^(19|20|21)\d{2}-(0[1-9]|1[0-2])$/.test(value)) fail('DEDUCTION_PERIOD_INVALID', `${label} بصيغة YYYY-MM صحيحة`)
  return value as string
}
export function addPayrollMonths(period: string, count: number): string {
  deductionPeriod(period)
  const index = Number(period.slice(0, 4)) * 12 + Number(period.slice(5, 7)) - 1 + count
  return `${String(Math.floor(index / 12)).padStart(4, '0')}-${String(index % 12 + 1).padStart(2, '0')}`
}
/** شهر المسير الذي يضم التاريخ: بداية الدورة 23 تعني أن 23 سبتمبر يتبع مسير أكتوبر. */
export function payrollPeriodForDate(date: string, cycleStartDay: number): string {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) fail('DEDUCTION_DATE_INVALID', 'تاريخ غير صالح')
  const period = date.slice(0, 7)
  return cycleStartDay > 1 && Number(date.slice(8, 10)) >= cycleStartDay ? addPayrollMonths(period, 1) : period
}
export function deductionDateValid(value: unknown): value is string {
  return typeof value === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(value) && new Date(`${value}T00:00:00Z`).toISOString().slice(0, 10) === value
}
export function daysBetween(from: string, to: string) {
  return Math.round((Date.parse(`${to}T00:00:00Z`) - Date.parse(`${from}T00:00:00Z`)) / 86400000)
}

export type DeductionStepStatus = 'PENDING' | 'APPROVED' | 'REJECTED' | 'SKIPPED'
export interface DeductionChainStep {
  order: number
  role: DeductionApprovalRole
  approverEmployeeId: number | null
  status: DeductionStepStatus
  note: string | null
  escalation: boolean
  actedByUserId: number | null
  actedAt: string | null
  reason: string | null
  adjustedFrom: string | null
  adjustedTo: string | null
  // الدور الأصلي عندما حلّ محله مستوى أعلى لغياب معتمِده (اللقطات السابقة بلا هذا الحقل)
  fallbackFrom?: DeductionApprovalRole | null
}

// سلم الصعود عند غياب معتمِد الدور الهيكلي: قائد الفريق ← مدير القسم ← مدير الفرع
const DEDUCTION_FALLBACK_LADDER: readonly DeductionStructuralRole[] = ['DIRECT_MANAGER', 'TEAM_LEADER', 'DEPARTMENT_MANAGER', 'BRANCH_MANAGER']

/** DD-06: سلسلة ملتقطة وقت الإنشاء؛ الأدوار الهيكلية تُحل لموظف محدد وتُتخطى بتسجيل السبب.
 *  غياب المعتمِد مع NEXT_LEVEL: يصعد لأول مستوى أعلى له معتمِد غير المُنشئ والموظف؛ وخطوة التصعيد
 *  التي لا تجد أحدًا تُسند للإدارة التنفيذية حتى لا يسقط التصعيد بصمت. */
export function buildDeductionChain(input: {
  approvalSteps: DeductionApprovalRole[]
  escalated: boolean
  escalationStep: DeductionApprovalRole | null
  creatorEmployeeId: number | null
  employeeId: number
  approvers: Partial<Record<DeductionStructuralRole, number | null>>
  missingApproverFallback?: DeductionMissingApproverFallback
}): DeductionChainStep[] {
  const roles: Array<{ role: DeductionApprovalRole; escalation: boolean }> = input.approvalSteps.filter(role => role !== 'HR').map(role => ({ role, escalation: false }))
  if (input.escalated && input.escalationStep && !roles.some(row => row.role === input.escalationStep)) roles.push({ role: input.escalationStep, escalation: true })
  roles.push({ role: 'HR', escalation: false })
  const acted = new Set<number>()
  let executivePending = false
  const fallback = input.missingApproverFallback ?? 'SKIP'
  return roles.map(({ role: requestedRole, escalation }, index) => {
    let role = requestedRole
    const structural = (DEDUCTION_STRUCTURAL_ROLES as readonly string[]).includes(requestedRole)
    let approverEmployeeId = structural ? input.approvers[requestedRole as DeductionStructuralRole] ?? null : null
    let note: string | null = null
    let fallbackFrom: DeductionApprovalRole | null = null
    if (structural && approverEmployeeId === null && fallback === 'NEXT_LEVEL') {
      const ladder = DEDUCTION_FALLBACK_LADDER.slice(DEDUCTION_FALLBACK_LADDER.indexOf(requestedRole as DeductionStructuralRole) + 1).filter(item => item !== 'DIRECT_MANAGER')
      const next = ladder.find(item => {
        const id = input.approvers[item] ?? null
        return id !== null && id !== input.creatorEmployeeId && id !== input.employeeId
      })
      if (next) {
        role = next; fallbackFrom = requestedRole; approverEmployeeId = input.approvers[next] ?? null
      } else if (escalation) {
        role = 'EXECUTIVE'; fallbackFrom = requestedRole
      }
    }
    const resolvedStructural = (DEDUCTION_STRUCTURAL_ROLES as readonly string[]).includes(role)
    if (resolvedStructural) {
      if (approverEmployeeId === null) note = 'تُخطّي: لا يوجد معتمِد لهذا الدور في هيكل الموظف'
      else if (approverEmployeeId === input.creatorEmployeeId) note = 'تُخطّي: المعتمِد هو المُنزِّل'
      else if (approverEmployeeId === input.employeeId) note = 'تُخطّي: المعتمِد هو الموظف المستهدف'
      else if (acted.has(approverEmployeeId)) note = 'تُخطّي: نفس معتمِد خطوة سابقة'
      if (!note) acted.add(approverEmployeeId!)
      if (!note && fallbackFrom) note = `بديل: لا يوجد ${DEDUCTION_LABELS.roles[fallbackFrom]} في هيكل الموظف — يعتمد ${DEDUCTION_LABELS.roles[role]}`
    } else if (role === 'EXECUTIVE') {
      if (executivePending) note = 'تُخطّي: نفس خطوة الإدارة التنفيذية السابقة'
      else if (fallbackFrom) note = `بديل: لا يوجد ${DEDUCTION_LABELS.roles[fallbackFrom]} ولا مستوى هيكلي أعلى — تعتمد الإدارة التنفيذية`
      executivePending = executivePending || note === null || !!fallbackFrom
    }
    const skipped = !!note && note.startsWith('تُخطّي')
    return { order: index + 1, role, approverEmployeeId, status: skipped ? 'SKIPPED' : 'PENDING', note, escalation, actedByUserId: null, actedAt: null, reason: null,
      adjustedFrom: null, adjustedTo: null, ...(fallbackFrom ? { fallbackFrom } : {}) }
  })
}

/** DD-06 قاعدة 1: بداية انتظار الخطوة الحالية = آخر فعل على خطوة سابقة أو إنشاء الطلب. */
export function deductionStepWaitingSince(steps: DeductionChainStep[], createdAt: Date | string): Date {
  const acted = steps.filter(step => step.status !== 'PENDING' && step.actedAt).map(step => Date.parse(step.actedAt!)).filter(Number.isFinite)
  const created = createdAt instanceof Date ? createdAt.getTime() : Date.parse(createdAt)
  return new Date(Math.max(created, ...acted))
}

export function currentDeductionStep(steps: DeductionChainStep[]): DeductionChainStep | null {
  return steps.find(step => step.status === 'PENDING') ?? null
}

export function parseDeductionSteps(text: string): DeductionChainStep[] {
  let steps: unknown
  try { steps = JSON.parse(text) } catch { steps = null }
  if (!Array.isArray(steps) || !steps.length || steps.some((step: any, index) => !step || step.order !== index + 1 || !DEDUCTION_APPROVAL_ROLES.includes(step.role) ||
    !['PENDING', 'APPROVED', 'REJECTED', 'SKIPPED'].includes(step.status))) {
    throw new BadRequestException({ code: 'DEDUCTION_CHAIN_INVALID', message: 'سلسلة اعتماد الخصم المحفوظة غير صالحة' })
  }
  return steps as DeductionChainStep[]
}

function canonical(value: unknown): unknown {
  if (Array.isArray(value)) return value.map(canonical)
  if (value && typeof value === 'object') return Object.fromEntries(Object.keys(value as object).sort().map(key => [key, canonical((value as any)[key])]))
  return value
}
export function deductionPreviewHash(value: unknown): string {
  return createHash('sha256').update(JSON.stringify(canonical(value))).digest('hex')
}
