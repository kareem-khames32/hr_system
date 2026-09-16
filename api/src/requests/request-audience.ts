import type { JwtPayload } from '../auth/auth.service'

// ===== ب4 (قرار المالك): «جمهور» نوع الطلب — مين يقدر يقدّمه =====
// إعداد واحد ومقيّم واحد: الكتالوج (عرض الكارت) ومحرك الطلبات (التقديم) وشاشتا «خصم» و«مكافأة»
// كلها تسأل الدالة دي، فما تختلفش الإجابة من باب لباب.
// خارج القيد: المالك (super_admin أو '*') وحده في البابين؛ وبانِي أنواع الطلبات (request_types.manage)
// في العرض فقط — يرى النوع في الكتالوج لأنه يضبطه، ولا يقدّمه إن كان الجمهور يستثنيه.
// التقديم نيابةً عن موظف آخر لا يحكمه جمهور النوع (القرار ج1) — يحكمه صلاحية النيابة.
export type RequestAudiencePurpose = 'catalog' | 'submit'
export type RequestAudience = { mode?: string; ids?: Array<number | string> }
// المنصب في الهيكل (قرار المالك 16 سبتمبر): قادة الفرق ومديرو الأقسام غالبًا دورهم «موظف»،
// فالجمهور «حسب المنصب» يعرفهم من الهيكل نفسه لا من الدور.
export type AudiencePositions = { departmentManager?: boolean; teamLeader?: boolean; branchManager?: boolean }
export const AUDIENCE_POSITION_KEYS = ['DEPARTMENT_MANAGERS', 'TEAM_LEADERS', 'BRANCH_MANAGERS'] as const
export type AudienceSubject = {
  role?: string | null
  permissions?: string[] | null
  employeeId?: number | null
  departmentId?: number | null
  positions?: AudiencePositions | null
}

// جمهور «حسب المنصب» وحده يحتاج قراءة الهيكل؛ باقي الأوضاع لا تكلّف استعلامًا
export const audienceNeedsPositions = (visibleTo: string | null | undefined): boolean =>
  parseRequestAudience(visibleTo)?.mode === 'positions'

export function parseRequestAudience(visibleTo: string | null | undefined): RequestAudience | null {
  if (!visibleTo) return null
  try {
    const value = JSON.parse(visibleTo) as RequestAudience
    return value && typeof value === 'object' ? value : null
  } catch {
    return null
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

export const audienceSubjectOf = (
  user: JwtPayload,
  employee?: { departmentId?: number | null } | null
): AudienceSubject => ({
  role: user.role,
  permissions: user.permissions ?? [],
  employeeId: user.employeeId ?? null,
  departmentId: employee?.departmentId ?? null,
})
