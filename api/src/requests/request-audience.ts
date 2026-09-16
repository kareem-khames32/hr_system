import type { JwtPayload } from '../auth/auth.service'
import { definitionInBranch } from '../common/definition-branch'

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
export type RequestAudience = { mode?: string; ids?: Array<number | string>; where?: AudienceWhere | null }
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
}

// جمهور «حسب المنصب» وحده يحتاج قراءة الهيكل؛ باقي الأوضاع لا تكلّف استعلامًا
export const audienceNeedsPositions = (visibleTo: string | null | undefined): boolean =>
  parseRequestAudience(visibleTo)?.mode === 'positions'

// قسم الموظف وفريقه وفرعه يُقرؤوا فقط لو الجمهور محصور في أقسام أو فرق أو فروع
export const audienceNeedsEmployee = (visibleTo: string | null | undefined): boolean => {
  const audience = parseRequestAudience(visibleTo)
  if (!audience) return false
  const where = audienceWhereOf(audience)
  return audience.mode === 'departments' || where.mode !== 'company'
}

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
  // مين + فين: الاتنين لازم يتحققوا
  return audienceWhoAllows(audience, subject) && audienceWhereAllows(audience, subject)
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

export const audienceSubjectOf = (
  user: JwtPayload,
  employee?: { departmentId?: number | null; teamId?: number | null; branchId?: number | null } | null
): AudienceSubject => ({
  role: user.role,
  permissions: user.permissions ?? [],
  employeeId: user.employeeId ?? null,
  departmentId: employee?.departmentId ?? null,
  teamId: employee?.teamId ?? null,
  // فرع الموظف نفسه أولًا؛ حساب بلا موظف مربوط يُقاس بفرع حسابه
  branchId: employee?.branchId ?? user.branchId ?? null,
})
