import { BadRequestException } from '@nestjs/common'

// B-ADD.16: البريد (صندوق Exchange بتاع الموظف جوه النظام) — القواعد النقية من غير DI ولا اتصال: إعداد الخادم من api/.env، الرسايل والأكواد،
// اسم دخول الموظف على Exchange، وفحص قيم الطلب (العناوين، الصفحات، الصندوق المشترك).
// النظام مابيخزنش أي رسالة: القوايم بتتجاب صفحة صفحة، والرسالة لما تتفتح، والمرفق بيعدّي للمتصفح وقت تنزيله.

export const MAIL_MODULE = 'mail'
export const MAIL_SHARED_PERMISSION = 'mail.shared.manage'
export const MAILBOX_MIGRATION_MISSING = 'الصناديق المشتركة واسم دخول البريد محتاجين ترحيل 20261012_192 على قاعدة البيانات'

// أكواد ورسايل — الواجهة بتعرض الرسالة زي ما هي، وبتفتح نموذج «افتح بريدك» على MAIL_LOCKED
export const MAIL_NOT_CONFIGURED = 'البريد مش مضبوط على الخادم — مدير النظام يكتب عنوان خادم البريد (MAIL_EWS_URL) في إعدادات الخادم'
export const MAIL_LOCKED = 'افتح بريدك: اكتب كلمة مرور بريد الشركة مرة واحدة للجلسة دي'
export const MAIL_PASSWORD_REJECTED = 'خادم البريد رفض كلمة المرور — لو غيّرتها قريب، افتح بريدك بالجديدة'
export const MAIL_BAD_PASSWORD = 'كلمة مرور البريد مش صح، أو حسابك مش معروف لخادم البريد — لو متأكد منها ادخل النظام مرة بـ«حساب الشركة»'
export const MAIL_PASSWORD_REQUIRED = 'اكتب كلمة مرور بريد الشركة'
export const MAIL_NO_ACCESS = 'مالكش صلاحية على الصندوق ده'
export const MAIL_NO_MAILBOX = 'الحساب ده مالوش صندوق بريد على خادم الشركة'
export const MAIL_BUSY = 'خادم البريد مشغول دلوقتي — جرّب تاني بعد لحظة'
export const MAIL_ITEM_NOT_FOUND = 'الرسالة مش موجودة (اتنقلت أو اتمسحت)'
export const MAIL_UNAVAILABLE = 'تعذّر الوصول لخادم البريد — جرّب تاني بعد شوية'
export const MAIL_NO_RECIPIENTS = 'اكتب مستلم واحد على الأقل'
export const MAIL_TOO_LARGE = 'المرفقات أكبر من 25 ميجا'
export const MAIL_BAD_ADDRESS = 'عنوان بريد مش صحيح'
export const MAIL_BAD_ID = 'معرّف الرسالة أو المجلد مش صحيح'
export const MAIL_BAD_PAYLOAD = 'بيانات الرسالة مش مقروءة'
export const MAIL_SEARCH_EMPTY = 'اكتب كلمة للبحث'
export const SHARED_NOT_FOUND = 'الصندوق المشترك مش موجود'
export const SHARED_ADDRESS = 'اكتب عنوان بريد الصندوق المشترك صح'
export const SHARED_NAME = 'اسم الصندوق من حرفين لـ200 حرف'
export const SHARED_DUPLICATE = 'فيه صندوق مشترك بنفس العنوان'
export const SHARED_USERS = 'اختار حسابات موجودة ومفعّلة (لحد 200 حساب)'

export const MAX_ATTACHMENTS_BYTES = 25 * 1024 * 1024 // حد حجم الرسالة الافتراضي في Exchange
export const MAX_ATTACHMENT_FILES = 20
export const MAIL_PAGE_MAX = 100
const EMAIL_RE = /^[^\s@<>,;]+@[^\s@<>,;]+\.[^\s@<>,;]+$/
/** معرّفات Exchange (رسالة، مجلد، محادثة): base64 بطول معقول — أي حاجة تانية مابتوصلش للخادم */
export const EWS_ID_RE = /^[A-Za-z0-9+/=_-]{20,512}$/

// ===== إعداد الخادم (api/.env بس — عنوان خادم البريد عمره ما بييجي من طلب) =====

export interface MailboxConfig {
  enabled: boolean
  /** عنوان EWS الكامل (‎https://mail.example/EWS/Exchange.asmx) */
  url: string
  /** اسم المجال القصير (NetBIOS) لو الدخول بـDOMAIN\user؛ فاضي = الدخول باسم المستخدم الكامل (UPN) */
  domain: string
  /** التحقق من شهادة الخادم — مفتوح دايمًا إلا لو MAIL_EWS_TLS_REJECT_UNAUTHORIZED=false صريحة */
  rejectUnauthorized: boolean
  timeoutMs: number
  /** الناقص أو الغلط في الإعداد (أسماء المفاتيح بس — من غير قيم) */
  gaps: string[]
}

const text = (value: unknown): string => (typeof value === 'string' ? value.trim() : '')
const isLoopback = (host: string) => host === '127.0.0.1' || host === 'localhost' || host === '[::1]'

/**
 * مضبوط = MAIL_EWS_URL عنوان https صالح و MAIL_EWS_ENABLED مش false. عنوان http مرفوض (كلمة السر والرسايل كانت هتعدّي من غير تشفير)
 * إلا لخادم على نفس الجهاز (اختبارات).
 */
export function readMailboxConfig(env: Record<string, unknown>): MailboxConfig {
  const raw = text(env.MAIL_EWS_URL)
  const gaps: string[] = []
  let url = ''
  if (!raw) gaps.push('MAIL_EWS_URL')
  else {
    try {
      const parsed = new URL(raw)
      const ok = parsed.protocol === 'https:' || (parsed.protocol === 'http:' && isLoopback(parsed.hostname))
      if (!ok || parsed.username || parsed.password) gaps.push('MAIL_EWS_URL (لازم https ومن غير اسم مستخدم)')
      else url = parsed.toString()
    } catch {
      gaps.push('MAIL_EWS_URL (مش عنوان صالح)')
    }
  }
  const timeoutMs = Number(text(env.MAIL_EWS_TIMEOUT_MS) || '30000')
  return {
    enabled: gaps.length === 0 && text(env.MAIL_EWS_ENABLED).toLowerCase() !== 'false',
    url,
    domain: /^[A-Za-z0-9._-]{1,64}$/.test(text(env.MAIL_EWS_DOMAIN)) ? text(env.MAIL_EWS_DOMAIN) : '',
    rejectUnauthorized: text(env.MAIL_EWS_TLS_REJECT_UNAUTHORIZED).toLowerCase() !== 'false',
    timeoutMs: Number.isFinite(timeoutMs) && timeoutMs >= 1000 && timeoutMs <= 120_000 ? timeoutMs : 30_000,
    gaps,
  }
}

export const MAILBOX_ENV_KEYS = ['MAIL_EWS_URL', 'MAIL_EWS_ENABLED', 'MAIL_EWS_DOMAIN', 'MAIL_EWS_TLS_REJECT_UNAUTHORIZED', 'MAIL_EWS_TIMEOUT_MS'] as const

/** نفس القراءة من ConfigService (الخدمات بتبعت دالة القراءة — الملف ده من غير DI) */
export const mailboxConfigFrom = (get: (key: string) => unknown): MailboxConfig =>
  readMailboxConfig(Object.fromEntries(MAILBOX_ENV_KEYS.map((key) => [key, get(key)])))

/** تحذير الإقلاع لما التحقق من شهادة خادم البريد مقفول: حد في النص يقدر ينتحل الخادم وياخد كلمات السر. null = مفيش تحذير */
export function mailboxInsecureWarning(config: MailboxConfig): string | null {
  if (!config.enabled || config.rejectUnauthorized) return null
  return 'البريد شغال و MAIL_EWS_TLS_REJECT_UNAUTHORIZED=false — شهادة خادم البريد مش متحقَّق منها، فحد في المنتصف يقدر ينتحل الخادم. حمّل شهادة الشركة على الخادم واضبطه true.'
}

/** الاختبار مايطلعش برّه الجهاز: في NODE_ENV=test عنوان الخادم لازم يكون على نفس الجهاز */
export function testNetworkAllowed(url: string): boolean {
  try {
    return isLoopback(new URL(url).hostname)
  } catch {
    return false
  }
}

/**
 * اسم الدخول على Exchange من اسم الموظف في المجال (UPN): مع MAIL_EWS_DOMAIN يبقى DOMAIN\user (زي Outlook على الشبكة)، ومن غيره الـUPN نفسه.
 */
export function ewsCredentialName(login: string, domain: string): string {
  const clean = text(login)
  return domain ? `${domain}\\${clean.includes('@') ? clean.slice(0, clean.indexOf('@')) : clean}` : clean
}

// ===== قيم الطلب =====

const refuse = (code: string, message: string): never => {
  throw new BadRequestException({ code, message })
}

export const isEmailAddress = (value: unknown): value is string => typeof value === 'string' && value.length <= 200 && EMAIL_RE.test(value.trim())

export function cleanAddresses(value: unknown): string[] {
  const list = Array.isArray(value) ? value : []
  if (list.length > 200 || list.some((item) => !isEmailAddress(item))) refuse('MAIL_BAD_ADDRESS', MAIL_BAD_ADDRESS)
  return [...new Set(list.map((item: string) => item.trim()))]
}

export function cleanEwsId(value: unknown): string {
  if (typeof value !== 'string' || !EWS_ID_RE.test(value)) refuse('MAIL_BAD_ID', MAIL_BAD_ID)
  return value as string
}

/** معرّف المرفق من Exchange (أطول من معرّف الرسالة) — بيتقارن بمرفقات الرسالة نفسها، مش بيتبعت كاستعلام */
export function cleanAttachmentId(value: unknown): string {
  if (typeof value !== 'string' || !/^[A-Za-z0-9+/=_-]{20,2048}$/.test(value)) refuse('MAIL_BAD_ID', MAIL_BAD_ID)
  return value as string
}

/** ‎?mbx=‎: صندوق مشترك ظاهر تحت مجلدات الموظف (فاضي = صندوقه) */
export function cleanTarget(value: unknown): string | undefined {
  if (value === undefined || value === null || value === '') return undefined
  if (!isEmailAddress(value)) refuse('MAIL_BAD_ADDRESS', MAIL_BAD_ADDRESS)
  return (value as string).trim().toLowerCase()
}

export function intParam(value: unknown, fallback: number, min: number, max: number): number {
  const number = Number(typeof value === 'string' && /^\d{1,9}$/.test(value) ? value : NaN)
  return Number.isInteger(number) ? Math.min(Math.max(number, min), max) : fallback
}

export type ComposeMode = 'new' | 'reply' | 'replyAll' | 'forward'
export interface ComposeInput {
  mode: ComposeMode
  refId?: string
  to: string[]
  cc: string[]
  bcc: string[]
  subject: string
  html: string
  attachments: { name: string; base64: string }[]
}

/** جسم «إرسال» (JSON جوه حقل payload) من غير المرفقات */
export function cleanCompose(payload: unknown): Omit<ComposeInput, 'attachments'> {
  let body: Record<string, unknown>
  try {
    const parsed: unknown = typeof payload === 'string' ? JSON.parse(payload) : payload
    if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) throw new Error('shape')
    body = parsed as Record<string, unknown>
  } catch {
    return refuse('MAIL_BAD_PAYLOAD', MAIL_BAD_PAYLOAD)
  }
  const mode: ComposeMode = (['new', 'reply', 'replyAll', 'forward'] as const).find((value) => value === body.mode) ?? 'new'
  const input = {
    mode,
    refId: mode === 'new' ? undefined : cleanEwsId(body.refId),
    to: cleanAddresses(body.to),
    cc: cleanAddresses(body.cc),
    bcc: cleanAddresses(body.bcc),
    subject: String(body.subject ?? '').slice(0, 500),
    html: String(body.html ?? '').slice(0, 2_000_000),
  }
  if (!input.to.length && !input.cc.length && !input.bcc.length) refuse('MAIL_NO_RECIPIENTS', MAIL_NO_RECIPIENTS)
  return input
}

/** اسم الملف المرفوع: multer بيقراه latin1 — بيرجع UTF-8 (أسماء عربية)، ومن غير مسار */
export function uploadedFileName(original: unknown): string {
  const raw = typeof original === 'string' ? Buffer.from(original, 'latin1').toString('utf8') : ''
  return raw.replace(/[\\/\u0000-\u001f]/g, '_').trim().slice(0, 200) || 'attachment'
}

// ===== الصناديق المشتركة (تعريف من الشاشة: العنوان والاسم ومين يفتحه — وExchange نفسه بيتحقق من صلاحية الموظف) =====

export function cleanSharedAddress(value: unknown): string {
  if (!isEmailAddress(value)) refuse('MAIL_SHARED_ADDRESS', SHARED_ADDRESS)
  return (value as string).trim().toLowerCase()
}

export function cleanSharedName(value: unknown): string {
  const name = typeof value === 'string' ? value.replace(/\s+/g, ' ').trim() : ''
  if (name.length < 2 || name.length > 200) refuse('MAIL_SHARED_NAME', SHARED_NAME)
  return name
}

export function cleanSharedUserIds(value: unknown): number[] {
  const list = Array.isArray(value) ? value : null
  if (!list || list.length > 200 || list.some((id) => !Number.isSafeInteger(id) || id <= 0)) refuse('MAIL_SHARED_USERS', SHARED_USERS)
  return [...new Set(list as number[])]
}
