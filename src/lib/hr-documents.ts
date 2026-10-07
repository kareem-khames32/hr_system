import { ApiError, apiFetch, clearSession, hasSession, sessionInit } from './api'

export type HrDocumentCategory = 'contract' | 'acknowledgement' | 'certificate' | 'general'
export interface HrDocumentContent { title: string; greeting: string; body: string; closing: string; footer: string }
export interface HrDocumentCustomField { key: string; label: string; required: boolean }
export interface HrDocumentVariable { key: string; label: string; sample: string | number }
export interface HrDocumentRevision {
  id: number; revision: number; name: string; category: HrDocumentCategory
  content: HrDocumentContent; customFields: HrDocumentCustomField[]; publishedAt: string
}
export interface HrDocumentTemplate {
  id: number; name: string; category: HrDocumentCategory; version: number; isActive: boolean
  draft: HrDocumentContent; customFields: HrDocumentCustomField[]; publishedRevision: HrDocumentRevision | null
}
export interface HrDocumentCatalog { templates: HrDocumentTemplate[]; variables: HrDocumentVariable[] }
export interface HrDocumentEmployee { id: number; fullName: string; employeeCode: string }
// B2.7-ب: طلب إقرار الموظف بالمستند وحالته
export type HrDocumentAckState = 'PENDING' | 'OVERDUE' | 'ACKNOWLEDGED'
export type HrDocumentAckFilter = 'pending' | 'overdue' | 'acknowledged'
export interface HrDocumentAck { requestedAt: string; dueDate: string | null; acknowledgedAt: string | null; state: HrDocumentAckState }
export interface IssuedHrDocument {
  id: number; reference: string; employeeId: number | null; employeeDocumentId: number | null
  fileRef: string; templateName: string; createdAt: string
  // null = من غير طلب إقرار
  ack: HrDocumentAck | null
}
export interface HrDocumentIssueInput {
  templateId: number; revisionId: number; employeeId?: number; values: Record<string, string>
  // مطلوب إقرار الموظف (لمستند صادر لموظف)، وآخر موعد اختياري بصيغة YYYY-MM-DD
  requireAck?: boolean; ackDueDate?: string
}
// مستند مطلوب إقراري بيه (أو أقرّيت بيه)
export interface MyHrDocumentAck extends HrDocumentAck { id: number; reference: string; templateName: string; category: HrDocumentCategory; createdAt: string }
// قراءة المستند قبل الإقرار: معاه بصمة ملفه، والإقرار بيها
export interface HrDocumentAckContent extends HrDocumentAck { id: number; reference: string; templateName: string; category: HrDocumentCategory; contentHash: string }
export interface HrDocumentTemplateInput {
  name: string; category: HrDocumentCategory; draft: HrDocumentContent; customFields: HrDocumentCustomField[]
}

const PREFIX = '/hr-documents'
const API_BASE = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:4000/api'
const json = <T>(path: string, method: string, body: unknown) => apiFetch<T>(PREFIX + path, { method, body: JSON.stringify(body) })

export const fetchHrDocumentTemplateCatalog = () => apiFetch<HrDocumentCatalog>(PREFIX + '/templates/catalog')
export const fetchPublishedHrDocumentTemplates = () => apiFetch<HrDocumentCatalog>(PREFIX + '/templates')
export const createHrDocumentTemplate = (input: HrDocumentTemplateInput) => json<HrDocumentTemplate>('/templates', 'POST', input)
export const updateHrDocumentTemplate = (id: number, input: Partial<HrDocumentTemplateInput> & { version: number; isActive?: boolean }) => json<HrDocumentTemplate>(`/templates/${id}`, 'PATCH', input)
export const publishHrDocumentTemplate = (id: number, version: number) => json<HrDocumentTemplate>(`/templates/${id}/publish`, 'POST', { version })
export const fetchHrDocumentEmployees = () => apiFetch<HrDocumentEmployee[]>(PREFIX + '/employees')
export const issueHrDocument = (input: HrDocumentIssueInput & { idempotencyKey: string }) => json<IssuedHrDocument>('/issue', 'POST', input)
export const fetchIssuedHrDocuments = (employeeId?: number, ack?: HrDocumentAckFilter) => {
  const params = new URLSearchParams()
  if (employeeId !== undefined) params.set('employeeId', String(employeeId))
  if (ack) params.set('ack', ack)
  const query = params.toString()
  return apiFetch<IssuedHrDocument[]>(PREFIX + '/issued' + (query ? `?${query}` : ''))
}
export const fetchMyHrDocumentAcks = () => apiFetch<{ available: boolean; documents: MyHrDocumentAck[] }>(PREFIX + '/mine/acknowledgements')
export const fetchHrDocumentAck = (id: number) => apiFetch<HrDocumentAckContent>(PREFIX + `/issued/${id}/acknowledgement`)
export const acknowledgeHrDocument = (id: number, contentHash: string) => json<{ id: number; acknowledgedAt: string; already: boolean }>(`/issued/${id}/acknowledge`, 'POST', { contentHash })
export const cancelHrDocumentAck = (id: number) => json<IssuedHrDocument>(`/issued/${id}/acknowledgement/cancel`, 'POST', {})

async function pdf(path: string, input?: unknown): Promise<Blob> {
  const signedIn = hasSession()
  let response: Response
  try {
    response = await fetch(API_BASE + PREFIX + path, await sessionInit({
      method: input === undefined ? 'GET' : 'POST',
      headers: input === undefined ? {} : { 'Content-Type': 'application/json' },
      body: input === undefined ? undefined : JSON.stringify(input),
    }))
  } catch {
    // انقطاع الاتصال: رسالة مفهومة بدل نص المتصفح الإنجليزي
    throw new ApiError(0, 'تعذر الاتصال بالخادم — تحقق من الاتصال ثم أعد المحاولة')
  }
  if (!response.ok) {
    if (response.status === 401 && signedIn && typeof window !== 'undefined') {
      clearSession()
      if (!window.location.pathname.startsWith('/login')) window.location.href = '/login?expired=1'
    }
    let message = `تعذر تحميل المستند (${response.status})`
    try {
      const body: { message?: string | string[] } = await response.json()
      if (body.message) message = Array.isArray(body.message) ? body.message.join('، ') : body.message
    } catch { /* Keep the HTTP error when the server did not return JSON. */ }
    throw new ApiError(response.status, message)
  }
  if (!response.headers.get('content-type')?.includes('application/pdf')) throw new Error('استجابة الخادم ليست ملف PDF صالحًا.')
  // تحميل انقطع في منتصفه (ومنه ملف تغيّر على التخزين فقطع الخادم الرد)
  try { return await response.blob() } catch { throw new ApiError(0, 'انقطع تحميل ملف المستند — حاول مرة أخرى') }
}

export const previewHrDocumentTemplate = (draft: HrDocumentContent, customFields: HrDocumentCustomField[]) => pdf('/templates/preview', { draft, customFields })
// المعاينة من غير طلب الإقرار: مابتحفظش مستند ومابتطلبش حاجة من الموظف
export const previewHrDocument = ({ templateId, revisionId, employeeId, values }: HrDocumentIssueInput) => pdf('/preview', { templateId, revisionId, ...(employeeId === undefined ? {} : { employeeId }), values })
export const downloadIssuedHrDocument = (id: number) => pdf(`/issued/${id}/download`)

export const HR_DOCUMENT_CATEGORY_LABELS: Record<HrDocumentCategory, string> = {
  contract: 'عقد', acknowledgement: 'إقرار', certificate: 'شهادة', general: 'مستند عام',
}
export const HR_DOCUMENT_ACK_LABELS: Record<HrDocumentAckState, string> = { PENDING: 'بانتظار الإقرار', OVERDUE: 'إقرار متأخر', ACKNOWLEDGED: 'أقرّ الموظف' }
