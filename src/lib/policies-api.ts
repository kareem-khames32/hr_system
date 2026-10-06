// B2.7-أ: مكتبة السياسات والإقرار — الإدارة (سياسة، نسخة، سحب، تقرير)، والموظف («سياساتي»، «اللي مستنيني»، قراءة نسخة، إقرار).
// مسارات نسبية (لا @/) عشان الاختبارات تقرا الملف مباشرة.
import { ApiError, apiFetch, getToken, uploadFile } from './api'

const API_BASE = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:4000/api'

export type PolicyStatus = 'DRAFT' | 'PUBLISHED' | 'WITHDRAWN'
export type PolicyAckState = 'ACKNOWLEDGED' | 'PENDING' | 'OVERDUE'
export const POLICY_STATUS_LABELS: Record<PolicyStatus, string> = { DRAFT: 'مسودة', PUBLISHED: 'منشورة', WITHDRAWN: 'مسحوبة' }
export const POLICY_ACK_LABELS: Record<PolicyAckState, string> = { ACKNOWLEDGED: 'أقرّ', PENDING: 'لسه (جوه المهلة)', OVERDUE: 'عدّى المهلة' }
/** نفس حدود الخادم */
export const POLICY_GRACE_MAX = 365
export const POLICY_BODY_MAX = 30_000
/** «سياسة واحدة / سياستين / 3 سياسات / 11 سياسة» */
export const policyCountText = (count: number) => (count === 1 ? 'سياسة واحدة' : count === 2 ? 'سياستين' : count >= 3 && count <= 10 ? `${count} سياسات` : `${count} سياسة`)
/** «مهلة 5 أيام» بصياغتها، وصفر = من غير مهلة */
export const policyGraceText = (days: number) => (days <= 0 ? 'من غير مهلة' : days === 1 ? 'مهلة يوم واحد' : days === 2 ? 'مهلة يومين' : days <= 10 ? `مهلة ${days} أيام` : `مهلة ${days} يوم`)
/** نص الإقرار اللي الموظف بيوافق عليه */
export const POLICY_ACK_STATEMENT = 'إقرار إلكتروني بالاطلاع والموافقة، بيتسجّل باسم حسابك ووقته وجهازك. مش توقيع معتمد.'

/** جمهور السياسة «مين + فين» بنفس شكل جمهور أنواع الطلبات والموديولات — null = كل الموظفين */
export interface PolicyAudience { mode?: string; ids?: Array<number | string>; where?: { mode?: string; ids?: Array<number | string> } | null }

export interface ApiPolicyVersion {
  id: number
  versionNo: number
  effectiveDate: string
  isMaterial: boolean
  kind: 'TEXT' | 'FILE'
  contentHash: string
  publishedAt: string
}

export interface ApiPolicy {
  id: number
  title: string
  category: string | null
  isMandatory: boolean
  graceDays: number
  status: PolicyStatus
  /** لمدير السياسات بس (فيه أرقام فروع وأدوار) */
  audience: PolicyAudience | null
  createdAt: string
  withdrawnAt: string | null
  /** النسخة السارية دلوقتي */
  current: ApiPolicyVersion | null
  /** نسخة منشورة لسه تاريخ سريانها ماجاش */
  upcoming: ApiPolicyVersion | null
  versions: number
}

export interface ApiPolicies {
  /** false = ترحيل 091 لسه ماتطبقش */
  available: boolean
  /** صاحب «إدارة السياسات» ونطاقه كل الفروع */
  canManage: boolean
  policies: ApiPolicy[]
}

export interface ApiPolicyReportRow {
  employeeId: number
  employeeCode: string | null
  fullName: string
  branchId: number | null
  hasAccount: boolean
  state: PolicyAckState
  lockDate: string | null
  acknowledgedVersionNo: number | null
  acknowledgedAt: string | null
}

export interface ApiPolicyReport {
  policy: { id: number; title: string; isMandatory: boolean; graceDays: number; status: PolicyStatus }
  current: ApiPolicyVersion | null
  summary: { audience: number; acknowledged: number; pending: number; overdue: number }
  rows: ApiPolicyReportRow[]
}

/** سياسة عليّ وحالتي معاها */
export interface ApiMyPolicy {
  policyId: number
  title: string
  category: string | null
  isMandatory: boolean
  /** من غير بصمة النسخة: البصمة بتيجي من قراءة النسخة نفسها (fetchPolicyVersion)، فالإقرار مايتمش من القايمة لوحدها */
  version: Omit<ApiPolicyVersion, 'contentHash'>
  state: PolicyAckState
  /** أول يوم النظام بيقفل فيه لو مااقرّيتش (للإلزامية) — مش آخر يوم للإقرار */
  lockDate: string | null
  acknowledgedVersionNo: number | null
  acknowledgedAt: string | null
}

export interface ApiPolicyContent {
  versionId: number
  policyId: number
  title: string
  category: string | null
  versionNo: number
  effectiveDate: string
  kind: 'TEXT' | 'FILE'
  bodyText: string | null
  contentHash: string
}

export interface PolicyInput { title?: string; category?: string | null; audience?: PolicyAudience | null; isMandatory?: boolean; graceDays?: number }
export interface PolicyVersionInput { bodyText?: string | null; fileId?: number | null; effectiveDate: string; isMaterial?: boolean }

const send = <T>(method: string, path: string, body?: unknown) => apiFetch<T>(path, { method, ...(body === undefined ? {} : { body: JSON.stringify(body) }) })

// ===== الإدارة والتقرير =====
export const fetchPolicies = () => apiFetch<ApiPolicies>('/policies')
export const createPolicy = (input: PolicyInput) => send<{ id: number }>('POST', '/policies', input)
export const updatePolicy = (id: number, input: PolicyInput) => send<{ id: number }>('PATCH', `/policies/${id}`, input)
export const publishPolicyVersion = (id: number, input: PolicyVersionInput) => send<{ id: number; versionNo: number; contentHash: string }>('POST', `/policies/${id}/versions`, input)
export const withdrawPolicy = (id: number) => send<{ id: number }>('POST', `/policies/${id}/withdraw`)
export const fetchPolicyReport = (id: number) => apiFetch<ApiPolicyReport>(`/policies/${id}/report`)
/** رفع ملف السياسة (PDF بس) — بيرجّع رقمه عشان يتنشر بيه */
export const uploadPolicyFile = (file: File) => uploadFile(file, { entityType: 'policy' })

// ===== الموظف =====
export const fetchMyPolicies = () => apiFetch<{ available: boolean; policies: ApiMyPolicy[] }>('/policies/mine')
/** الإلزامي اللي مااقرّيتش بيه. blocked = فيه واحدة عدّت مهلتها (الخادم قافل الباقي) */
export const fetchPendingPolicies = () => apiFetch<{ blocked: boolean; policies: ApiMyPolicy[] }>('/policies/pending')
export const fetchPolicyVersion = (versionId: number) => apiFetch<ApiPolicyContent>(`/policies/versions/${versionId}`)
export const acknowledgePolicy = (versionId: number, contentHash: string) =>
  send<{ id: number; acknowledgedAt: string; already: boolean }>('POST', `/policies/versions/${versionId}/acknowledge`, { contentHash })

/** ملف النسخة (PDF) كرابط محلي للعارض — المسار محتاج التوكن، فمايتفتحش مباشرة. اللي ينادي بيلغي الرابط بعد ما يخلص */
export async function fetchPolicyFileUrl(versionId: number): Promise<string> {
  const token = getToken()
  let response: Response
  try {
    response = await fetch(`${API_BASE}/policies/versions/${versionId}/file`, { headers: token ? { Authorization: `Bearer ${token}` } : {} })
  } catch {
    throw new ApiError(0, 'تعذر الاتصال بالخادم — تحقق من الاتصال ثم أعد المحاولة')
  }
  if (!response.ok) {
    const body = await response.json().catch(() => ({}))
    // رسالة الخادم العربي زي ما هي؛ ورسائل الإطار الإنجليزي (خطأ خادم) مابتتعرضش للموظف
    throw new ApiError(response.status, typeof body.message === 'string' && /[\u0600-\u06FF]/.test(body.message) ? body.message : 'تعذر تحميل ملف السياسة')
  }
  // الرد اتقطع والملف بيتحمّل (الاتصال وقع، أو الخادم قطعه): رسالة عربي بدل نص المتصفح
  let file: Blob
  try { file = await response.blob() } catch { throw new ApiError(0, 'تحميل ملف السياسة اتقطع — حاول تاني') }
  return URL.createObjectURL(file)
}

// ===== شاشة الإقرار عند الدخول =====
// الفحص عند الدخول مرة لكل دخول: العلامة قيمتها آخر التوكن الحالي، فدخول جديد (توكن جديد) بيعرض الشاشة تاني. و«بعدين» (جوه مهلة السماح)
// بيحط نفس العلامة. لو تخزين المتصفح مقفول مفيش فحص عند الدخول (اللي عدّى مهلته الخادم قافله في كل الأحوال)
const CHECKED_KEY = 'hr_policies_checked'
const sessionMark = () => (getToken() ?? '').slice(-24)
export const policiesCheckedThisSession = (): boolean => {
  try { return typeof window !== 'undefined' && !!sessionMark() && sessionStorage.getItem(CHECKED_KEY) === sessionMark() } catch { return true }
}
export const markPoliciesChecked = () => { try { sessionStorage.setItem(CHECKED_KEY, sessionMark()) } catch { /* التخزين مقفول */ } }
