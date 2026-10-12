// B-ADD.16: البريد — صندوق Exchange بتاع الموظف جوه النظام. الخادم مابيخزنش أي رسالة: كل نداء هنا بيقرا من خادم البريد بدخول صاحب الجلسة.
// كلمة مرور البريد بتتبعت مرة واحدة للجلسة («افتح بريدك») ومفتاحها بيرجع في cookie مابتتقريش من سكربت الصفحة — الواجهة مابتحفظش منها حاجة.
import { ApiError, apiFetch, downloadApiFile, sessionInit } from './api'

const API_BASE = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:4000/api'

export interface MailStatus { configured: boolean; unlocked: boolean; login: string; address: string; canManageShared: boolean }
export interface MailAddress { name: string; address: string }
export interface MailFolder { key: string; id: string; name: string; unread: number; total: number; parentId?: string | null }
export interface SharedMailbox { address: string; name: string }
export interface MailFolders { wellKnown: MailFolder[]; custom: MailFolder[]; rootIds: string[]; shared?: SharedMailbox[] }
export interface MailItem {
  id: string; subject: string; from: MailAddress | null; to: string; date: string | null; isRead: boolean; hasAttachments: boolean; important: boolean; flagged: boolean; preview: string
  /** في البحث في كل المجلدات: الرسالة في أنهي مجلد */
  folder?: { key: string; name: string }
}
export interface MailPage { total: number; more: boolean; truncated?: boolean; items: MailItem[] }
/** صف في عرض المحادثات: رسالة وكل ردودها */
export interface MailThread {
  id: string; subject: string; senders: string[]; recipients: string[]; date: string | null; count: number; unread: number; hasAttachments: boolean; important: boolean; flagged: boolean; preview: string
}
export interface MailThreadPage { total: number; more: boolean; items: MailThread[] }
/** رسالة جوه محادثة مفتوحة (نصها بيتجاب لما تتفتح) */
export interface MailThreadMessage { id: string; subject: string; from: MailAddress | null; to: string; cc: string; date: string | null; isRead: boolean; hasAttachments: boolean; preview: string }
export interface MailAttachment { id: string; name: string; size: number; contentType: string }
export interface MailMessage {
  id: string; subject: string; from: MailAddress | null; to: MailAddress[]; cc: MailAddress[]; date: string | null; important: boolean; flagged: boolean; html: string
  /** اللي الرسالة دي زودته بس، من غير التاريخ المقتبس ('' لما مش معروف) */
  uniqueHtml: string
  attachments: MailAttachment[]
}
export type ComposeMode = 'new' | 'reply' | 'replyAll' | 'forward'
export interface ComposeDraft {
  mode: ComposeMode; refId?: string; to: string[]; cc: string[]; bcc: string[]; subject: string
  /** سطر الاقتباس الظاهر تحت المحرر في الرد والتحويل (خادم البريد هو اللي بيضيف الاقتباس الحقيقي) */
  quote?: string
}
export interface MailContact { displayName: string; email: string }
export interface MailPatch { isRead?: boolean; flagged?: boolean; folder?: string }

const M = '/mail'
export const qs = (value: string) => encodeURIComponent(value)
/** ‎&mbx=‎ لصندوق مشترك ('' = صندوق الموظف نفسه) */
export const mbxParam = (mbx: string) => (mbx ? `&mbx=${qs(mbx)}` : '')

/** الخادم قال إن البريد مقفول للجلسة دي (محتاج «افتح بريدك») */
export const isMailLocked = (error: unknown): boolean => error instanceof ApiError && error.details?.code === 'MAIL_LOCKED'

export const fetchMailStatus = () => apiFetch<MailStatus>(`${M}/status`)
export const unlockMailbox = (password: string) => apiFetch<{ unlocked: boolean }>('/mail/unlock', { method: 'POST', body: JSON.stringify({ password }) })
export const lockMailbox = () => apiFetch<{ unlocked: boolean }>(`${M}/lock`, { method: 'POST' })

export const fetchMailFolders = (mbx = '') => apiFetch<MailFolders>(`${M}/folders${mbx ? `?mbx=${qs(mbx)}` : ''}`)
export const fetchMailList = <T>(kind: 'messages' | 'conversations', params: URLSearchParams) => apiFetch<T>(`${M}/${kind}?${params.toString()}`)
export const fetchMailThread = (id: string, folder: string, mbx = '') => apiFetch<MailThreadMessage[]>(`${M}/conversation?id=${qs(id)}&folder=${qs(folder)}${mbxParam(mbx)}`)
export const fetchMailMessage = (id: string, mbx = '', peek = true) => apiFetch<MailMessage>(`${M}/message?id=${qs(id)}${peek ? '&peek=1' : ''}${mbxParam(mbx)}`)
export const patchMailMessage = (id: string, body: MailPatch, mbx = '') =>
  apiFetch<{ ok: boolean }>(`${M}/message?id=${qs(id)}${mbxParam(mbx)}`, { method: 'PATCH', body: JSON.stringify(body) })
export const removeMailMessage = (id: string, mbx = '') => apiFetch<{ ok: boolean }>(`${M}/message?id=${qs(id)}${mbxParam(mbx)}`, { method: 'DELETE' })
export const patchMailThread = (id: string, folder: string, body: MailPatch, mbx = '') =>
  apiFetch<{ ok: boolean }>(`${M}/conversation?id=${qs(id)}&folder=${qs(folder)}${mbxParam(mbx)}`, { method: 'PATCH', body: JSON.stringify(body) })
export const removeMailThread = (id: string, folder: string, mbx = '') =>
  apiFetch<{ ok: boolean }>(`${M}/conversation?id=${qs(id)}&folder=${qs(folder)}${mbxParam(mbx)}`, { method: 'DELETE' })
export const searchMailContacts = (q: string) => apiFetch<MailContact[]>(`${M}/contacts?q=${qs(q)}`)

/** تنزيل مرفق: بيعدّي من خادم البريد للمتصفح وقت التنزيل (مابيتخزنش في النظام) */
export const downloadMailAttachment = (messageId: string, attachment: MailAttachment, mbx = '') =>
  downloadApiFile(`${M}/attachment?id=${qs(messageId)}&att=${qs(attachment.id)}${mbxParam(mbx)}`, attachment.name || 'attachment', 'تعذّر تنزيل المرفق')

/** إرسال: نموذج متعدد الأجزاء — payload (JSON الرسالة) + الملفات المرفقة */
export async function sendMail(draft: ComposeDraft, html: string, files: File[], mbx = ''): Promise<void> {
  const form = new FormData()
  form.append('payload', JSON.stringify({ mode: draft.mode, refId: draft.refId, to: draft.to, cc: draft.cc, bcc: draft.bcc, subject: draft.subject, html }))
  files.forEach((file) => form.append('attachments', file, file.name))
  const target = mbx ? `?mbx=${qs(mbx)}` : ''
  let response: Response
  try {
    // بالجلسة (cookie) ورمز CSRF زي كل نداء كتابة — sessionInit
    response = await fetch(`${API_BASE}${M}/send${target}`, await sessionInit({ method: 'POST', body: form }))
  } catch {
    throw new ApiError(0, 'تعذر الاتصال بالخادم — تحقق من الاتصال ثم أعد المحاولة')
  }
  if (response.ok) return
  const body = (await response.json().catch(() => null)) as { message?: string | string[]; code?: string } | null
  const message = Array.isArray(body?.message) ? body?.message.join('، ') : body?.message
  throw new ApiError(response.status, response.status === 413 ? 'المرفقات أكبر من 25 ميجا' : typeof message === 'string' && /[؀-ۿ]/.test(message) ? message : 'تعذّر إرسال الرسالة',
    body && typeof body === 'object' ? (body as Record<string, unknown>) : undefined)
}

// ===== إدارة الصناديق المشتركة (بصلاحية «إدارة صناديق البريد المشتركة») =====
export interface SharedMailboxUser { id: number; displayName: string; email: string; isActive?: boolean }
export interface ManagedSharedMailbox { id: number; address: string; name: string; isActive: boolean; updatedAt: string; users: SharedMailboxUser[] }
export interface SharedMailboxesView { available: boolean; message?: string; mailboxes: ManagedSharedMailbox[] }
export const fetchSharedMailboxes = () => apiFetch<SharedMailboxesView>(`${M}/shared`)
export const searchSharedMailboxUsers = (q: string) => apiFetch<SharedMailboxUser[]>(`${M}/shared/users?q=${qs(q)}`)
export const createSharedMailbox = (body: { address: string; name: string; userIds: number[] }) => apiFetch<SharedMailboxesView>(`${M}/shared`, { method: 'POST', body: JSON.stringify(body) })
export const updateSharedMailbox = (id: number, body: { name?: string; isActive?: boolean; userIds?: number[] }) =>
  apiFetch<SharedMailboxesView>(`${M}/shared/${id}`, { method: 'PATCH', body: JSON.stringify(body) })
export const removeSharedMailbox = (id: number) => apiFetch<SharedMailboxesView>(`${M}/shared/${id}`, { method: 'DELETE' })
