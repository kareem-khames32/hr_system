import { ApiError, apiFetch, clearSession, getToken } from './api'

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
export interface IssuedHrDocument {
  id: number; reference: string; employeeId: number | null; employeeDocumentId: number | null
  fileRef: string; templateName: string; createdAt: string
}
export interface HrDocumentIssueInput {
  templateId: number; revisionId: number; employeeId?: number; values: Record<string, string>
}
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
export const fetchIssuedHrDocuments = (employeeId?: number) => apiFetch<IssuedHrDocument[]>(PREFIX + '/issued' + (employeeId === undefined ? '' : `?employeeId=${employeeId}`))

async function pdf(path: string, input?: unknown): Promise<Blob> {
  const token = getToken()
  const response = await fetch(API_BASE + PREFIX + path, {
    method: input === undefined ? 'GET' : 'POST',
    headers: { ...(token ? { Authorization: `Bearer ${token}` } : {}), ...(input === undefined ? {} : { 'Content-Type': 'application/json' }) },
    body: input === undefined ? undefined : JSON.stringify(input),
  })
  if (!response.ok) {
    if (response.status === 401 && token && typeof window !== 'undefined') {
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
  return response.blob()
}

export const previewHrDocumentTemplate = (draft: HrDocumentContent, customFields: HrDocumentCustomField[]) => pdf('/templates/preview', { draft, customFields })
export const previewHrDocument = (input: HrDocumentIssueInput) => pdf('/preview', input)
export const downloadIssuedHrDocument = (id: number) => pdf(`/issued/${id}/download`)

export const HR_DOCUMENT_CATEGORY_LABELS: Record<HrDocumentCategory, string> = {
  contract: 'عقد', acknowledgement: 'إقرار', certificate: 'شهادة', general: 'مستند عام',
}
