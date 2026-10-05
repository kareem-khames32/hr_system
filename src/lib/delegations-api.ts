// B2.6-ب: تفويض الاعتمادات — قايمة، إنشاء، إلغاء؛ ونص «بالنيابة عن» لسطر في سجل الطلب.
// مسارات نسبية (لا @/) عشان الاختبارات تقرا الملف مباشرة.
import { apiFetch } from './api'

export type DelegationState = 'UPCOMING' | 'ACTIVE' | 'ENDED' | 'REVOKED'
export const DELEGATION_STATE_LABELS: Record<DelegationState, string> = { UPCOMING: 'لسه مابدأش', ACTIVE: 'ساري', ENDED: 'انتهى', REVOKED: 'ملغي' }
/** أقصى فترة تفويض بالأيام (نفس حد الخادم) */
export const DELEGATION_DAYS_MAX = 366

export interface ApiDelegation {
  id: number
  delegatorEmployeeId: number
  /** رقم البديل واسمه لطرفي التفويض ولموظفي نطاق القارئ — غير كده null */
  delegateEmployeeId: number | null
  /** الاسم لطرفي التفويض ولموظفي نطاق القارئ — غير كده null */
  delegatorName: string | null
  delegateName: string | null
  startDate: string
  endDate: string
  /** null = كل فئات الطلبات */
  categories: string[] | null
  reason: string | null
  createdAt: string
  revokedAt: string | null
  state: DelegationState
  canRevoke: boolean
}

export interface ApiDelegations {
  /** false = ترحيل 090 لسه ماتطبقش */
  available: boolean
  /** صاحب «بانِي دورات الاعتماد»: ينشئ تفويض عن موظف في نطاقه ويلغيه */
  canManageOthers: boolean
  /** الحساب معتمد هيكلي (مدير لموظفين، أو مدير وحدة أو فرع أو فريق، أو مسمّى في سلسلة): بند «بانتظار موافقتي» بيظهر له والصندوق فاضي */
  approver: boolean
  /** أنا المفوِّض */
  mine: ApiDelegation[]
  /** أنا البديل (الساري والجاي) */
  toMe: ApiDelegation[]
  /** تفويضات موظفي نطاقي (لصاحب الصلاحية) */
  others: ApiDelegation[]
}

export interface DelegationInput {
  /** فاضي = أنا */
  delegatorEmployeeId?: number
  delegateEmployeeId: number
  startDate: string
  endDate: string
  /** فاضي = كل الفئات */
  categories?: string[] | null
  reason?: string | null
}

export const fetchDelegations = () => apiFetch<ApiDelegations>('/requests/delegations')
export const createDelegation = (input: DelegationInput) => apiFetch<{ id: number }>('/requests/delegations', { method: 'POST', body: JSON.stringify(input) })
export const revokeDelegation = (id: number) => apiFetch<{ id: number }>(`/requests/delegations/${id}/revoke`, { method: 'POST' })

/** سطر في سجل الطلب اتاخد بتفويض: «فلان بالنيابة عن فلان» (الأسماء لأطراف الطلب بس) — فاضي لو السطر مش بتفويض */
export const onBehalfText = (row: { onBehalf?: boolean; onBehalfOfName?: string | null; actedByName?: string | null }): string =>
  !row.onBehalf ? '' : row.onBehalfOfName ? `${row.actedByName ? `${row.actedByName} ` : ''}بالنيابة عن ${row.onBehalfOfName}` : 'بالنيابة (تفويض)'
