import { createCipheriv, createDecipheriv, createHmac, hkdfSync, randomBytes, timingSafeEqual } from 'node:crypto'
import { request as httpRequest } from 'node:http'
import { request as httpsRequest, type RequestOptions } from 'node:https'
import { isIP } from 'node:net'
import type { DomainEventType } from '../queue/outbox'

// B6.3 (ج): الـwebhooks — القواعد النقية: الأحداث المتاحة، سر التوقيع (مختوم في القاعدة)، التوقيع HMAC-SHA256، وفحص عنوان الاستقبال (ضد عناوين داخلية).
//  الحدث الخارجي مراجع بس (رقم الموظف / المسير): النظام المستقبِل بيقرا التفاصيل من الـAPI العام بمفتاحه ونطاقه.

/** حدث النظام ← اسمه للأنظمة الخارجية */
export const WEBHOOK_EVENTS = {
  EMPLOYEE_HIRED: 'employee.hired',
  EMPLOYEE_UPDATED: 'employee.updated',
  EMPLOYEE_TERMINATED: 'employee.terminated',
  PAYROLL_RUN_APPROVED: 'payroll.approved',
} as const satisfies Partial<Record<DomainEventType, string>>
export type WebhookEventName = (typeof WEBHOOK_EVENTS)[keyof typeof WEBHOOK_EVENTS]
export const WEBHOOK_EVENT_NAMES = Object.values(WEBHOOK_EVENTS) as WebhookEventName[]
export const WEBHOOK_EVENT_LABELS: Record<WebhookEventName, string> = { 'employee.hired': 'تعيين موظف', 'employee.updated': 'تعديل بيانات موظف', 'employee.terminated': 'إنهاء خدمة موظف', 'payroll.approved': 'اعتماد مسير' }
export const WEBHOOK_FANOUT_JOB = 'webhooks.fanout'
export const WEBHOOK_DELIVER_JOB = 'webhooks.deliver'
export const WEBHOOK_DELIVER_MAX_ATTEMPTS = 8
export const WEBHOOK_TIMEOUT_MS = 10_000
export const WEBHOOK_ENDPOINTS_MAX = 20
export const WEBHOOKS_MIGRATION_MISSING = 'جدول نقاط الاستقبال ناقص — طبّق ترحيل 184 الأول'
export const WEBHOOK_NOT_FOUND = 'نقطة الاستقبال مش موجودة'
export const WEBHOOK_SIGNATURE_HEADER = 'X-HR-Signature'
export const WEBHOOK_TOLERANCE_SECONDS = 300

export const generateWebhookSecret = (bytes: (size: number) => Buffer = randomBytes): string => `whsec_${bytes(24).toString('hex')}`

// السر لازم يتقري تاني وقت التوقيع، فبيتخزن مختوم (AES-256-GCM) بمفتاح مشتق من سر الخادم — نسخة القاعدة لوحدها ماتطلّعوش
const SEAL_VERSION = 'w1'
const sealKey = (serverSecret: string): Buffer => Buffer.from(hkdfSync('sha256', Buffer.from(serverSecret), Buffer.from('hr-webhooks'), Buffer.from('webhook-secret-v1'), 32))
export function sealWebhookSecret(secret: string, serverSecret: string): string {
  const iv = randomBytes(12), cipher = createCipheriv('aes-256-gcm', sealKey(serverSecret), iv)
  const sealed = Buffer.concat([cipher.update(secret, 'utf8'), cipher.final()])
  return [SEAL_VERSION, iv.toString('base64'), cipher.getAuthTag().toString('base64'), sealed.toString('base64')].join('.')
}
/** null لو النص مش بصيغتنا أو اتغيّر أو مفتاحه مش مفتاح الخادم الحالي */
export function openWebhookSecret(sealed: unknown, serverSecret: string): string | null {
  const parts = typeof sealed === 'string' ? sealed.split('.') : []
  if (parts.length !== 4 || parts[0] !== SEAL_VERSION) return null
  try {
    const decipher = createDecipheriv('aes-256-gcm', sealKey(serverSecret), Buffer.from(parts[1], 'base64'))
    decipher.setAuthTag(Buffer.from(parts[2], 'base64'))
    const secret = Buffer.concat([decipher.update(Buffer.from(parts[3], 'base64')), decipher.final()]).toString('utf8')
    return /^whsec_[a-f0-9]{48}$/.test(secret) ? secret : null
  } catch {
    return null
  }
}

/** التوقيع: HMAC-SHA256 على `<الوقت بالثواني>.<نص الجسم>` — والترويسة `t=<الوقت>,v1=<التوقيع>` */
export const signatureOf = (secret: string, timestamp: number, body: string): string => createHmac('sha256', secret).update(`${timestamp}.${body}`, 'utf8').digest('hex')
export const signatureHeader = (secret: string, timestamp: number, body: string): string => `t=${timestamp},v1=${signatureOf(secret, timestamp, body)}`
/** تحقق المستقبِل (نفس اللي في الدليل): التوقيع مطابق والوقت جوه المهلة */
export function verifySignature(secret: string, header: unknown, body: string, nowSeconds: number, toleranceSeconds = WEBHOOK_TOLERANCE_SECONDS): boolean {
  const match = typeof header === 'string' ? /^t=(\d{1,12}),v1=([a-f0-9]{64})$/.exec(header.trim()) : null
  if (!match) return false
  const timestamp = Number(match[1])
  if (Math.abs(nowSeconds - timestamp) > toleranceSeconds) return false
  const given = Buffer.from(match[2], 'hex'), expected = Buffer.from(signatureOf(secret, timestamp, body), 'hex')
  return given.length === expected.length && timingSafeEqual(given, expected)
}

/** عنوان IP داخلي أو محلي أو مش قابل للتوجيه (IPv4 وIPv6) — نقطة الاستقبال ماينفعش تبقى عليه */
export function isPrivateAddress(address: string): boolean {
  const value = address.trim().toLowerCase().replace(/^\[|\]$/g, '')
  const kind = isIP(value)
  if (kind === 4) {
    const [a, b] = value.split('.').map(Number)
    return a === 0 || a === 10 || a === 127 || (a === 100 && b >= 64 && b <= 127) || (a === 169 && b === 254) || (a === 172 && b >= 16 && b <= 31) || (a === 192 && b === 168) || (a === 192 && b === 0) || (a === 198 && (b === 18 || b === 19)) || a >= 224
  }
  if (kind === 6) {
    if (value === '::' || value === '::1') return true
    const mapped = /^::ffff:(\d+\.\d+\.\d+\.\d+)$/.exec(value)
    if (mapped) return isPrivateAddress(mapped[1])
    return /^(fc|fd)/.test(value) || /^fe[89ab]/.test(value) || /^ff/.test(value) || value.startsWith('::ffff:') || value.startsWith('64:ff9b:')
  }
  return true
}

/**
 * عنوان نقطة الاستقبال صالح؟ https بس، من غير اسم مستخدم وكلمة سر في العنوان، ومش اسم محلي ولا IP داخلي. `allowLocal` (بيئة تطوير أو اختبار بس)
 * بيسمح بـhttp وبالعناوين المحلية. الاسم اللي بيتحل لعنوان داخلي بيتفحص وقت الإرسال (بعد حل الاسم).
 */
export function targetIssue(raw: unknown, allowLocal: boolean): string | null {
  if (typeof raw !== 'string' || raw.length < 10 || raw.length > 500) return 'عنوان نقطة الاستقبال من 10 لحد 500 حرف'
  let url: URL
  try { url = new URL(raw) } catch { return 'عنوان نقطة الاستقبال مش عنوان صالح' }
  if (url.username || url.password) return 'العنوان من غير اسم مستخدم ولا كلمة سر'
  if (url.hash) return 'العنوان من غير #'
  if (url.protocol !== 'https:' && !(allowLocal && url.protocol === 'http:')) return 'عنوان نقطة الاستقبال لازم يبدأ بـhttps://'
  const host = url.hostname.toLowerCase().replace(/^\[|\]$/g, '')
  if (allowLocal) return null
  // عنوان IP مكتوب: العام مسموح والداخلي لأ؛ والاسم لازم يكون نطاق عام (مش اسم محلي ولا من غير نقطة)
  if (isIP(host)) return isPrivateAddress(host) ? 'عنوان نقطة الاستقبال ماينفعش يكون عنوان داخلي' : null
  if (host === 'localhost' || host.endsWith('.localhost') || host.endsWith('.local') || host.endsWith('.internal') || !host.includes('.')) return 'عنوان نقطة الاستقبال لازم يكون اسم نطاق عام'
  return null
}

/** الأحداث المطلوبة: قايمة مش فاضية من المعروف بس */
export function cleanWebhookEvents(raw: unknown): { events: WebhookEventName[]; issue: string | null } {
  if (!Array.isArray(raw) || !raw.length) return { events: [], issue: 'اختار حدث واحد على الأقل' }
  if (raw.some(item => !(WEBHOOK_EVENT_NAMES as unknown[]).includes(item))) return { events: [], issue: 'حدث مش معروف' }
  return { events: WEBHOOK_EVENT_NAMES.filter(name => raw.includes(name)), issue: null }
}
export function storedWebhookEvents(stored: string): WebhookEventName[] {
  try {
    const parsed = JSON.parse(stored)
    return Array.isArray(parsed) ? WEBHOOK_EVENT_NAMES.filter(name => parsed.includes(name)) : []
  } catch { return [] }
}

/** جسم الرسالة (نص JSON ثابت الترتيب): المعرّف والنوع والوقت والمراجع */
export function webhookBody(input: { eventId: string; type: WebhookEventName; occurredAt: string; data: Record<string, unknown> }): string {
  return JSON.stringify({ id: `evt_${input.eventId}`, type: input.type, occurredAt: input.occurredAt, data: input.data })
}

/**
 * CRP6A-B04: إرسال POST لعنوان **مثبّت**: الاتصال بيروح لعنوان الـIP اللي اتفحص بالظبط (الاسم مابيتحلش تاني وقت الاتصال)، والاسم بيفضل في
 * ترويسة Host وفي التحقق من شهادة TLS. من غير تتبّع تحويل. بيرجّع رقم حالة الرد.
 */
export function postPinned(url: URL, pinned: { address: string; family: number }, headers: Record<string, string>, body: string, timeoutMs: number): Promise<number> {
  return new Promise((resolve, reject) => {
    const send = url.protocol === 'https:' ? httpsRequest : httpRequest
    const call = send({ protocol: url.protocol, hostname: url.hostname.replace(/^\[|\]$/g, ''), port: url.port || undefined, path: url.pathname + url.search, method: 'POST', agent: false, timeout: timeoutMs,
      headers: { ...headers, 'Content-Length': String(Buffer.byteLength(body)) },
      // حل الاسم الوحيد المسموح: العنوان المثبّت
      lookup: (_hostname: string, options: unknown, callback: (...args: unknown[]) => void) => ((options as { all?: boolean } | undefined)?.all
        ? callback(null, [{ address: pinned.address, family: pinned.family }]) : callback(null, pinned.address, pinned.family)) } as unknown as RequestOptions, response => {
      response.resume()
      response.on('end', () => resolve(response.statusCode ?? 0))
    })
    call.on('timeout', () => call.destroy(new Error('انتهت مهلة نقطة الاستقبال')))
    call.on('error', reject)
    call.end(body)
  })
}
