import type { JwtPayload } from '../auth/auth.service'
import { definitionInBranch } from '../common/definition-branch'
import { nationalityKind } from '../employees/employee-required-fields'

// ===== ب4 (قرار المالك): «جمهور» نوع الطلب — مين يقدر يقدّمه =====
// إعداد واحد ومقيّم واحد: الكتالوج (عرض الكارت) ومحرك الطلبات (التقديم) وشاشتا «خصم» و«مكافأة»
// كلها تسأل الدالة دي، فما تختلفش الإجابة من باب لباب.
// خارج القيد: المالك (super_admin أو '*') وحده في البابين؛ وبانِي أنواع الطلبات (request_types.manage)
// في العرض فقط — يرى النوع في الكتالوج لأنه يضبطه، ولا يقدّمه إن كان الجمهور يستثنيه.
// التقديم نيابةً عن موظف آخر لا يحكمه جمهور النوع (القرار ج1) — يحكمه صلاحية النيابة.
//
// قرار المالك 16 سبتمبر: الجمهور «مين» + «فين».
//   مين: الكل / حسب المنصب / أدوار / موظفون بعينهم           ← mode + ids (الشكل القديم كما هو)
//   فين: كل الشركة / فروع محددة / أقسام محددة / فرق محددة    ← where: { mode, ids } (غيابه = كل الشركة)
// مثال: «مديرو الأقسام في فرع مصر فقط» = { mode: 'positions', ids: ['DEPARTMENT_MANAGERS'], where: { mode: 'branches', ids: [2] } }
// الوضع القديم mode: 'departments' يفضل شغال كما هو (= الكل في أقسام محددة).
// «فرق محددة» ({ mode: 'teams', ids }) إضافة: الشكل القديم كله زي ما هو.
export type RequestAudiencePurpose = 'catalog' | 'submit'
export type AudienceWhereMode = 'company' | 'branches' | 'departments' | 'teams'
export type AudienceWhere = { mode?: string; ids?: Array<number | string> }
// B2.9: شروط على صفات الموظف فوق «مين + فين» — كلها لازم تتحقق:
//   conditions: [{ field: 'nationality', values: ['SAUDI'] }, { field: 'contractType', values: ['fixed_term'] },
//                { field: 'grade', values: [3] }, { field: 'joinDate', op: 'before' | 'from', value: '2025-01-01' }]
// مثال: «السعوديين على عقد محدد المدة» = { mode: 'all', ids: [], conditions: [الجنسية SAUDI، ونوع العقد fixed_term] }
// من غير conditions الشكل المتخزّن زي ما هو. والشرط قيد: موظف مالوش الصفة، أو شرط تالف أو مش معروف = مش من الجمهور
// (عكس «مين» و«فين» التالفين: دول بيفتحوا، والشرط مايفتحش). الجنسية بمصنّفها الموجود (nationalityKind) مش بنصها الحر.
// B2.9-ب: وشرط على حقل مخصص في ملف الموظف (نوعه «اختيار» أو «نعم/لا»، وغير مقيّد): { field: 'custom', key: 'مفتاح الحقل', values: [...] }.
// قيمة الموظف في الحقل لازم تكون من القايمة؛ موظف من غير قيمة، أو حقل اتعطّل أو بقى مقيّد = مش من الجمهور.
export type AudienceCondition = { field?: string; key?: string; values?: Array<number | string>; op?: string; value?: string }
export type RequestAudience = { mode?: string; ids?: Array<number | string>; where?: AudienceWhere | null; conditions?: AudienceCondition[] | null }
export const AUDIENCE_NATIONALITY_KINDS = ['SAUDI', 'EGYPTIAN', 'RESIDENT'] as const
export const AUDIENCE_CONTRACT_TYPES = ['permanent', 'fixed_term', 'part_time', 'seasonal'] as const
export const AUDIENCE_JOIN_DATE_OPS = ['before', 'from'] as const
export type AudienceAttributes = { nationality?: string | null; contractType?: string | null; gradeId?: number | null; joinDate?: string | null; customValues?: Record<string, string> | null }
// المنصب في الهيكل (قرار المالك 16 سبتمبر): قادة الفرق ومديرو الأقسام غالبًا دورهم «موظف»،
// فالجمهور «حسب المنصب» يعرفهم من الهيكل نفسه لا من الدور.
export type AudiencePositions = { departmentManager?: boolean; teamLeader?: boolean; branchManager?: boolean }
export const AUDIENCE_POSITION_KEYS = ['DEPARTMENT_MANAGERS', 'TEAM_LEADERS', 'BRANCH_MANAGERS'] as const
// «مين»: الأوضاع المقبولة عند الحفظ (departments قديم ومقبول لتوافق العملاء القدامى)
export const AUDIENCE_WHO_MODES = ['all', 'positions', 'roles', 'employees', 'departments'] as const
export const AUDIENCE_WHERE_MODES = ['company', 'branches', 'departments', 'teams'] as const
export type AudienceSubject = {
  role?: string | null
  permissions?: string[] | null
  employeeId?: number | null
  departmentId?: number | null
  teamId?: number | null
  branchId?: number | null
  positions?: AudiencePositions | null
  attributes?: AudienceAttributes | null
}

// جمهور «حسب المنصب» وحده يحتاج قراءة الهيكل؛ باقي الأوضاع لا تكلّف استعلامًا
export const audienceNeedsPositions = (visibleTo: string | null | undefined): boolean =>
  parseRequestAudience(visibleTo)?.mode === 'positions'

// قسم الموظف وفريقه وفرعه يُقرؤوا فقط لو الجمهور محصور في أقسام أو فرق أو فروع
export const audienceNeedsEmployee = (visibleTo: string | null | undefined): boolean => {
  const audience = parseRequestAudience(visibleTo)
  if (!audience) return false
  const where = audienceWhereOf(audience)
  return audience.mode === 'departments' || where.mode !== 'company' || audienceConditionsOf(audience).length > 0
}

// جمهور فيه شروط على صفات الموظف؟ (شاشتي المال بيقروا الصفات لما يبقى فيه شروط بس)
export const audienceHasConditions = (visibleTo: string | null | undefined): boolean =>
  audienceConditionsOf(parseRequestAudience(visibleTo)).length > 0

// جمهور فيه شرط على حقل مخصص؟ (قيم الحقول المخصصة بتتقري لما يبقى فيه الشرط ده بس)
export const audienceNeedsCustomValues = (visibleTo: string | null | undefined): boolean =>
  audienceConditionsOf(parseRequestAudience(visibleTo)).some((condition) => condition?.field === 'custom')

export function parseRequestAudience(visibleTo: string | null | undefined): RequestAudience | null {
  if (!visibleTo) return null
  try {
    const value = JSON.parse(visibleTo) as RequestAudience
    return value && typeof value === 'object' ? value : null
  } catch {
    return null
  }
}

// «فين» بعد التطبيع: وضع غير معروف أو قائمة فاضية = كل الشركة (الباب لا يُقفل صامتًا)
export function audienceWhereOf(audience: RequestAudience | null | undefined): { mode: AudienceWhereMode; ids: number[] } {
  const where = audience?.where
  const ids = Array.isArray(where?.ids) ? where!.ids.map(Number).filter((n) => Number.isInteger(n) && n > 0) : []
  if (where && (where.mode === 'branches' || where.mode === 'departments' || where.mode === 'teams') && ids.length) {
    return { mode: where.mode, ids }
  }
  return { mode: 'company', ids: [] }
}

// شروط الجمهور بعد التطبيع: غايبة = من غير شروط؛ وقيمة مش قايمة = شرط تالف (مش من الجمهور)
function audienceConditionsOf(audience: RequestAudience | null | undefined): AudienceCondition[] {
  const conditions = audience?.conditions
  if (conditions == null) return []
  return Array.isArray(conditions) ? conditions : [{}]
}

// يوم حقيقي بصيغة YYYY-MM-DD بالحرف (من غير أي نص بعده)
const audienceDay = (value: unknown): string | null => {
  if (typeof value !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(value)) return null
  const parsed = new Date(`${value}T00:00:00Z`)
  return !Number.isNaN(parsed.getTime()) && parsed.toISOString().slice(0, 10) === value ? value : null
}
// تاريخ تعيين الموظف زي ما القاعدة بترجّعه (نص يوم، وممكن وراه وقت)
const employeeDay = (value: unknown): string | null => typeof value === 'string' ? audienceDay(value.slice(0, 10)) : null
// قيم الشرط: قايمة غير فاضية، وإلا الشرط تالف
const audienceConditionValues = (condition: AudienceCondition): Array<number | string> | null =>
  Array.isArray(condition.values) && condition.values.length > 0 ? condition.values : null
const knownStrings = (values: Array<number | string> | null, known: readonly string[]): string[] | null =>
  values && values.every((value) => typeof value === 'string' && known.includes(value)) ? values as string[] : null

// Codex CRP2T-A-B02: الشرط المتخزّن بيتدقق كله وقت التقييم بقواعد الحفظ نفسها (ماعدا اللي محتاج قاعدة البيانات)، والتالف مابيتحققش لحد:
// قيم من القايمة المعروفة بس (جنسية UNKNOWN كانت بتطابق موظف جنسيته فاضية)، ودرجات أرقام صحيحة موجبة، وتاريخ يوم حقيقي بالحرف وعملية معروفة.
function audienceConditionAllows(condition: AudienceCondition, attributes: AudienceAttributes | null | undefined): boolean {
  if (!condition || typeof condition !== 'object' || Array.isArray(condition) || !attributes) return false
  const values = audienceConditionValues(condition)
  switch (condition.field) {
    case 'nationality': {
      const kinds = knownStrings(values, AUDIENCE_NATIONALITY_KINDS)
      return !!kinds && kinds.includes(nationalityKind(attributes.nationality))
    }
    case 'contractType': {
      const types = knownStrings(values, AUDIENCE_CONTRACT_TYPES)
      return !!types && !!attributes.contractType && types.includes(attributes.contractType)
    }
    case 'grade': {
      if (!values || !values.every((value) => typeof value === 'number' && Number.isSafeInteger(value) && value > 0)) return false
      return attributes.gradeId != null && (values as number[]).includes(Number(attributes.gradeId))
    }
    case 'joinDate': {
      const joined = employeeDay(attributes.joinDate), limit = audienceDay(condition.value)
      if (!joined || !limit || (condition.op !== 'before' && condition.op !== 'from')) return false
      return condition.op === 'before' ? joined < limit : joined >= limit
    }
    case 'custom': {
      if (!values || !values.every((value) => typeof value === 'string') || typeof condition.key !== 'string' || !condition.key) return false
      const custom = attributes.customValues
      const value = custom && Object.prototype.hasOwnProperty.call(custom, condition.key) ? custom[condition.key] : null
      return typeof value === 'string' && (values as string[]).includes(value)
    }
    default:
      return false
  }
}

function audienceWhoAllows(audience: RequestAudience, subject: AudienceSubject): boolean {
  const ids = Array.isArray(audience.ids) ? audience.ids : []
  switch (audience.mode) {
    case 'departments':
      return subject.departmentId != null && ids.map(Number).includes(Number(subject.departmentId))
    case 'roles':
      return !!subject.role && ids.map(String).includes(subject.role)
    case 'employees':
      return subject.employeeId != null && ids.map(Number).includes(Number(subject.employeeId))
    // حسب المنصب: أي منصب مختار يكفي (مدير قسم / قائد فريق / مدير فرع)، أو دور مختار (الموارد البشرية، الإدارة العليا)
    case 'positions': {
      const keys = ids.map(String)
      const positions = subject.positions ?? {}
      return (!!subject.role && keys.includes(subject.role))
        || (keys.includes('DEPARTMENT_MANAGERS') && !!positions.departmentManager)
        || (keys.includes('TEAM_LEADERS') && !!positions.teamLeader)
        || (keys.includes('BRANCH_MANAGERS') && !!positions.branchManager)
    }
    // 'all' أو وضع غير معروف أو قيمة تالفة: الباب لا يُقفل صامتًا
    default:
      return true
  }
}

function audienceWhereAllows(audience: RequestAudience, subject: AudienceSubject): boolean {
  const where = audienceWhereOf(audience)
  switch (where.mode) {
    case 'branches':
      return subject.branchId != null && where.ids.includes(Number(subject.branchId))
    case 'departments':
      return subject.departmentId != null && where.ids.includes(Number(subject.departmentId))
    case 'teams':
      return subject.teamId != null && where.ids.includes(Number(subject.teamId))
    default:
      return true
  }
}

export function requestAudienceAllows(
  visibleTo: string | null | undefined,
  subject: AudienceSubject,
  purpose: RequestAudiencePurpose = 'catalog'
): boolean {
  const permissions = subject.permissions ?? []
  if (subject.role === 'super_admin' || permissions.includes('*')) return true
  // بانِي أنواع الطلبات يرى كل نوع في الكتالوج (هو صاحب الإعداد نفسه)، لكنه عند التقديم
  // كأي مستخدم: الجمهور الذي ضبطه المالك يحكم قدرته فعلاً (ب4).
  if (purpose === 'catalog' && permissions.includes('request_types.manage')) return true
  const audience = parseRequestAudience(visibleTo)
  if (!audience) return true
  // مين + فين + شروط الصفات (B2.9): كلهم لازم يتحققوا
  return audienceWhoAllows(audience, subject) && audienceWhereAllows(audience, subject)
    && audienceConditionsOf(audience).every((condition) => audienceConditionAllows(condition, subject.attributes))
}

// نوع طلب خاص بفرع (branchId) لا يظهر ولا يُستخدم خارج فرعه — حتى للمالك عند التقديم لموظف فرع آخر.
// في الكتالوج: الحساب العام (بلا نطاق فرع) يرى أنواع كل الفروع لأنه قد يقدّم نيابةً عن أي موظف.
export function requestTypeInBranch(
  type: { branchId?: number | null },
  subjectBranchId: number | null | undefined,
  companyWideViewer = false
): boolean {
  return companyWideViewer || definitionInBranch(type.branchId, subjectBranchId)
}

// صفات الموظف بتتحط على الموضوع لما صف الموظف اللي اتقري شايلها بس: محرك الطلبات بيقرا الصف كله، وشاشتي المال بيقروا أعمدة أقل
// وبيزودوا الصفات لما الجمهور فيه شروط. صف من غيرها = من غير صفات، فأي شرط مابيتحققش
const AUDIENCE_ATTRIBUTE_KEYS = ['nationality', 'contractType', 'gradeId', 'joinDate'] as const
function audienceAttributesOf(employee: AudienceAttributes | null | undefined): { attributes?: AudienceAttributes } {
  if (!employee || AUDIENCE_ATTRIBUTE_KEYS.every((key) => employee[key] === undefined)) return {}
  return { attributes: { nationality: employee.nationality ?? null, contractType: employee.contractType ?? null, gradeId: employee.gradeId ?? null, joinDate: employee.joinDate ?? null,
    // قيم الحقول المخصصة بتتحط لما اللي بينادي قراها بس (جمهور فيه شرط على حقل مخصص)
    ...(employee.customValues ? { customValues: employee.customValues } : {}) } }
}

export const audienceSubjectOf = (
  user: JwtPayload,
  employee?: ({ departmentId?: number | null; teamId?: number | null; branchId?: number | null } & AudienceAttributes) | null
): AudienceSubject => ({
  role: user.role,
  permissions: user.permissions ?? [],
  employeeId: user.employeeId ?? null,
  departmentId: employee?.departmentId ?? null,
  teamId: employee?.teamId ?? null,
  // فرع الموظف نفسه أولًا؛ حساب بلا موظف مربوط يُقاس بفرع حسابه
  branchId: employee?.branchId ?? user.branchId ?? null,
  ...audienceAttributesOf(employee),
})
