import { BadRequestException, Logger } from '@nestjs/common'
import { createCipheriv, createDecipheriv, hkdfSync, randomBytes } from 'node:crypto'
import { isIP } from 'node:net'
import type { EntityManager } from 'typeorm'
import type { MailConfig } from '../../auth/mail.service'
import { deliverableEmail, notificationEventDef, type NotificationEventCode } from '../notification-events'

// B-ADD.5: قنوات الإشعارات — القواعد النقية (من غير DI ولا اتصال): ختم الأسرار، إعداد خادم البريد واختياراته الجاهزة، إعداد الواتساب،
// رقم الواتساب وتخفيته، ربط قالب Meta بالحدث، وقاعدة «الحدث × القناة».
//  قبل ترحيل 187: مفيش إعداد محفوظ ولا قاعدة لحدث ولا واتساب — المحرك بسلوكه الحالي بالحرف.

export const NOTIFICATION_CHANNELS_MIGRATION_MISSING = 'قنوات الإشعارات محتاجة ترحيل 20261011_187 على قاعدة البيانات'

const logger = new Logger('NotificationChannels')
let ready: boolean | null = null, warned = false

/** جداول القنوات موجودة (ترحيل 187)؟ الموجود بيتحفظ، والناقص بيتفحص مع كل نداء (نفس قاعدة notificationTablesReady — CRP2N-B01) */
export async function notificationChannelTablesReady(em: EntityManager): Promise<boolean> {
  if (ready === true) return true
  const [row] = await em.query(`SELECT CASE WHEN OBJECT_ID(N'dbo.notification_channel_settings', N'U') IS NOT NULL AND OBJECT_ID(N'dbo.notification_event_rules', N'U') IS NOT NULL
    AND OBJECT_ID(N'dbo.employee_whatsapp_numbers', N'U') IS NOT NULL THEN 1 ELSE 0 END AS [ready]`)
  ready = Number(row?.ready) === 1
  if (!ready && !warned) { warned = true; logger.warn(NOTIFICATION_CHANNELS_MIGRATION_MISSING + ' — البريد بإعداد الخادم الحالي، والواتساب مقفول لحد ما يتطبق') }
  return ready
}

/** للاختبارات: نسيان حالة الجداول */
export function resetNotificationChannelTablesCache() { ready = null; warned = false }

// ===== ختم الأسرار =====
// كلمة سر البريد وتوكن الواتساب لازم يتقروا تاني وقت الإرسال، فبيتخزنوا مختومين (AES-256-GCM) بمفتاح مشتق من سر الخادم (JWT_SECRET) —
// نفس طريقة سر الـwebhook وسر تطبيق المصادقة: نسخة القاعدة لوحدها ماتطلّعهمش. تغيير JWT_SECRET = السر لازم يتكتب تاني من الشاشة.
const SEAL_VERSION = 'n1'
const sealKey = (serverSecret: string): Buffer => Buffer.from(hkdfSync('sha256', Buffer.from(serverSecret), Buffer.from('hr-notification-channels'), Buffer.from('channel-secret-v1'), 32))
export const CHANNEL_SECRET_MAX = 4000

export function sealChannelSecret(secret: string, serverSecret: string): string {
  const iv = randomBytes(12), cipher = createCipheriv('aes-256-gcm', sealKey(serverSecret), iv)
  const sealed = Buffer.concat([cipher.update(secret, 'utf8'), cipher.final()])
  return [SEAL_VERSION, iv.toString('base64'), cipher.getAuthTag().toString('base64'), sealed.toString('base64')].join('.')
}

/** null لو النص مش بصيغتنا أو اتغيّر أو مفتاحه مش مفتاح الخادم الحالي */
export function openChannelSecret(sealed: unknown, serverSecret: string): string | null {
  const parts = typeof sealed === 'string' ? sealed.split('.') : []
  if (parts.length !== 4 || parts[0] !== SEAL_VERSION) return null
  try {
    const decipher = createDecipheriv('aes-256-gcm', sealKey(serverSecret), Buffer.from(parts[1], 'base64'))
    decipher.setAuthTag(Buffer.from(parts[2], 'base64'))
    const secret = Buffer.concat([decipher.update(Buffer.from(parts[3], 'base64')), decipher.final()]).toString('utf8')
    return secret || null
  } catch {
    return null
  }
}

/**
 * السر الجديد من الشاشة: undefined = سيب المحفوظ زي ما هو، null أو فاضي = امسحه، نص = بدّله. السر مابيتقصّش ولا بيتنضّف (كلمة السر بالحرف).
 */
export function incomingSecret(raw: unknown, label: string): string | null | undefined {
  if (raw === undefined) return undefined
  if (raw === null || raw === '') return null
  if (typeof raw !== 'string' || raw.length > CHANNEL_SECRET_MAX || /[\r\n\0]/.test(raw)) throw new BadRequestException(`${label} غير صالح`)
  return raw
}

const record = (raw: unknown): Record<string, unknown> => raw && typeof raw === 'object' && !Array.isArray(raw) ? raw as Record<string, unknown> : {}
const line = (value: unknown): string => typeof value === 'string' ? value.trim() : ''
export const parseStored = (stored: unknown): Record<string, unknown> => {
  try { return record(typeof stored === 'string' && stored ? JSON.parse(stored) : null) } catch { return {} }
}

// ===== خادم البريد =====
export const MAIL_ENCRYPTIONS = { STARTTLS: 'STARTTLS (المنفذ 587)', SSL: 'SSL/TLS (المنفذ 465)' } as const
export type MailEncryption = keyof typeof MAIL_ENCRYPTIONS
// الاختيارات الجاهزة بتملى الخادم والمنفذ والتشفير بس: الدخول لسه مستخدم وكلمة سر التطبيق (App Password) على SMTP — من غير OAuth
export const MAIL_PRESETS = {
  SMTP: { label: 'خادم SMTP', host: '', port: 587, encryption: 'STARTTLS' },
  MICROSOFT_365: { label: 'Microsoft 365', host: 'smtp.office365.com', port: 587, encryption: 'STARTTLS' },
  GOOGLE_WORKSPACE: { label: 'Google Workspace', host: 'smtp.gmail.com', port: 587, encryption: 'STARTTLS' },
} as const satisfies Record<string, { label: string; host: string; port: number; encryption: MailEncryption }>
export type MailPreset = keyof typeof MAIL_PRESETS
export const MAIL_TIMEOUT_MS = 15_000

export interface MailSettings {
  preset: MailPreset
  host: string
  port: number
  encryption: MailEncryption
  user: string
  fromName: string
  fromAddress: string
}

const HOST_NAME = /^(?=.{1,253}$)[a-z0-9](?:[a-z0-9-]{0,61}[a-z0-9])?(?:\.[a-z0-9](?:[a-z0-9-]{0,61}[a-z0-9])?)*$/i

/** إعداد خادم البريد من الشاشة (من غير كلمة السر) — برسالة لكل خانة غلط */
export function cleanMailSettings(raw: unknown): MailSettings {
  const value = record(raw)
  const preset = line(value.preset) || 'SMTP'
  if (!Object.prototype.hasOwnProperty.call(MAIL_PRESETS, preset)) throw new BadRequestException('نوع خادم البريد غير معروف')
  const encryption = line(value.encryption) || 'STARTTLS'
  if (!Object.prototype.hasOwnProperty.call(MAIL_ENCRYPTIONS, encryption)) throw new BadRequestException('تشفير خادم البريد: STARTTLS أو SSL')
  const host = line(value.host).toLowerCase()
  if (!host || !(HOST_NAME.test(host) || isIP(host))) throw new BadRequestException('اسم خادم البريد غير صالح (مثال: smtp.example.com)')
  const port = Number(value.port)
  if (!Number.isInteger(port) || port < 1 || port > 65535) throw new BadRequestException('منفذ خادم البريد رقم من 1 إلى 65535')
  const user = line(value.user)
  if (user.length > 200 || /[\r\n\0]/.test(user)) throw new BadRequestException('اسم مستخدم البريد غير صالح')
  const fromName = line(value.fromName)
  if (fromName.length > 100 || /["<>\\\r\n\0]/.test(fromName)) throw new BadRequestException('اسم المرسل لحد 100 حرف ومن غير " ولا < ولا >')
  const fromAddress = deliverableEmail(value.fromAddress)
  if (!fromAddress) throw new BadRequestException('عنوان المرسل لازم يكون بريد صالح')
  return { preset: preset as MailPreset, host, port, encryption: encryption as MailEncryption, user, fromName, fromAddress }
}

/** الإعداد المحفوظ بشكل صالح؟ (صف اتكتب بإيد أو من نسخة أقدم = null، فالبريد بيرجع لإعداد الخادم) */
export function storedMailSettings(stored: unknown): MailSettings | null {
  try { return cleanMailSettings(parseStored(stored)) } catch { return null }
}

/**
 * إعداد النقل من الإعداد المحفوظ: TLS إلزامي دايمًا (STARTTLS مطلوب أو SSL من أول لحظة) وشهادة الخادم بتتفحص — مفيش اختيار من الشاشة
 * يبعت من غير تشفير (اللي محتاج خادم داخلي من غير TLS يفضل على إعداد api/.env).
 */
export function mailConfigOf(settings: MailSettings, password: string | null): MailConfig {
  const secure = settings.encryption === 'SSL'
  return {
    host: settings.host, port: settings.port, secure, requireTls: !secure, rejectUnauthorized: true, user: settings.user, password: password ?? '',
    from: settings.fromName ? `"${settings.fromName}" <${settings.fromAddress}>` : settings.fromAddress, timeoutMs: MAIL_TIMEOUT_MS,
  }
}

// ===== الواتساب =====
export const WHATSAPP_PROVIDERS = { META_CLOUD: 'WhatsApp Business Cloud API (Meta)' } as const
export type WhatsappProviderCode = keyof typeof WHATSAPP_PROVIDERS
// عنوان Meta ثابت: مفيش عنوان بيتكتب من الشاشة (مفيش طلب بيطلع لعنوان يختاره المستخدم)
export const WHATSAPP_API_HOST = 'graph.facebook.com'
export const WHATSAPP_API_VERSION_DEFAULT = 'v21.0'
export const WHATSAPP_TIMEOUT_MS = 15_000

export interface WhatsappSettings {
  provider: WhatsappProviderCode
  /** رقم واتساب الشركة زي ما بيظهر للمستلم (للعرض بس) */
  phoneNumber: string
  /** معرّف الرقم عند Meta (Phone number ID) — اللي الرسالة بتتبعت منه */
  phoneNumberId: string
  /** معرّف حساب واتساب للأعمال (WABA ID) */
  businessAccountId: string
  apiVersion: string
  /** كود الدولة الافتراضي للأرقام المكتوبة محلي (05xxxxxxxx): فاضي = الرقم لازم يتكتب دولي */
  defaultCountryCode: string
  /** موظف من غير رقم واتساب في ملفه: ابعت على موبايله؟ (مقفول افتراضيًا) */
  fallbackToPhone: boolean
}

export function cleanWhatsappSettings(raw: unknown): WhatsappSettings {
  const value = record(raw)
  const provider = line(value.provider) || 'META_CLOUD'
  if (!Object.prototype.hasOwnProperty.call(WHATSAPP_PROVIDERS, provider)) throw new BadRequestException('مزوّد الواتساب غير معروف')
  const phoneNumberId = line(value.phoneNumberId)
  if (!/^\d{5,30}$/.test(phoneNumberId)) throw new BadRequestException('معرّف رقم الهاتف (Phone number ID) أرقام بس — من لوحة Meta')
  const businessAccountId = line(value.businessAccountId)
  if (businessAccountId && !/^\d{5,30}$/.test(businessAccountId)) throw new BadRequestException('معرّف حساب واتساب للأعمال (WABA ID) أرقام بس')
  const apiVersion = line(value.apiVersion) || WHATSAPP_API_VERSION_DEFAULT
  if (!/^v\d{1,2}\.\d$/.test(apiVersion)) throw new BadRequestException('إصدار واجهة Meta بالشكل v21.0')
  const defaultCountryCode = line(value.defaultCountryCode).replace(/^\+|^00/, '')
  if (defaultCountryCode && !/^[1-9]\d{0,3}$/.test(defaultCountryCode)) throw new BadRequestException('كود الدولة أرقام بس (مثال: 966)')
  const number = line(value.phoneNumber)
  const phoneNumber = number ? normalizeWhatsappNumber(number, defaultCountryCode) : ''
  if (number && !phoneNumber) throw new BadRequestException('رقم واتساب الشركة لازم يتكتب دولي (مثال: +966500000000)')
  return { provider: provider as WhatsappProviderCode, phoneNumber: phoneNumber ?? '', phoneNumberId, businessAccountId, apiVersion, defaultCountryCode,
    fallbackToPhone: value.fallbackToPhone === true }
}

export function storedWhatsappSettings(stored: unknown): WhatsappSettings | null {
  try { return cleanWhatsappSettings(parseStored(stored)) } catch { return null }
}

const ARABIC_DIGITS = /[٠-٩۰-۹]/g
/**
 * رقم الواتساب بصيغة E.164 أرقام بس (من غير +): 8 لـ15 رقم وأوله مش صفر. المكتوب محلي (أوله صفر) بيتحوّل بكود الدولة الافتراضي لو مضبوط،
 * وإلا null. الأرقام العربية والمسافات والشرطات والأقواس مقبولة في الكتابة.
 */
export function normalizeWhatsappNumber(raw: unknown, defaultCountryCode = ''): string | null {
  if (typeof raw !== 'string' && typeof raw !== 'number') return null
  const text = String(raw).trim().replace(ARABIC_DIGITS, digit => String(digit.charCodeAt(0) & 0xf)).replace(/[\s\-().]/g, '')
  if (!/^(?:\+|00)?\d+$/.test(text)) return null
  const international = text.startsWith('+') || text.startsWith('00')
  let digits = text.replace(/^\+|^00/, '')
  if (!international && digits.startsWith('0')) {
    if (!defaultCountryCode) return null
    digits = defaultCountryCode + digits.replace(/^0+/, '')
  }
  return /^[1-9]\d{7,14}$/.test(digits) ? digits : null
}

/** إخفاء الرقم في السجل والردود: +9665*****67 (زي إخفاء عنوان البريد) */
export function maskPhone(digits: unknown): string {
  const value = String(digits ?? '').replace(/\D/g, '')
  if (!value) return ''
  if (value.length <= 6) return `+${value.slice(0, 1)}${'*'.repeat(Math.max(3, value.length - 1))}`
  return `+${value.slice(0, 4)}${'*'.repeat(value.length - 6)}${value.slice(-2)}`
}

// ===== ربط قالب Meta بالحدث =====
// Meta بتسمح للشركة تبدأ الرسالة بقالب معتمد بس، فالحدث بيتربط باسم القالب ولغته وترتيب متغيراته — النص نفسه عند Meta.
export const WHATSAPP_TEMPLATE_LANGUAGES = ['ar', 'en'] as const
export type WhatsappTemplateLanguage = typeof WHATSAPP_TEMPLATE_LANGUAGES[number]
export const WHATSAPP_VARIABLES_MAX = 10
export interface WhatsappBinding {
  templateName: string
  /** كود اللغة عند Meta: ar، en_US … */
  languageCode: string
  /** متغيرات الحدث بترتيب {{1}} {{2}} … في نص القالب */
  variables: string[]
}

/** ربط صالح: اسم قالب Meta (حروف صغيرة وأرقام و_)، وكود لغة، ومتغيرات من متغيرات الحدث نفسه بس (فالسري مايقبلش نوع الطلب ولا اسم صاحبه) */
export function cleanWhatsappBinding(code: NotificationEventCode, raw: unknown): WhatsappBinding {
  const value = record(raw)
  const templateName = line(value.templateName)
  if (!/^[a-z0-9_]{1,512}$/.test(templateName)) throw new BadRequestException('اسم قالب الواتساب زي ما هو عند Meta: حروف إنجليزي صغيرة وأرقام و_ بس')
  const languageCode = line(value.languageCode)
  if (!/^[a-z]{2,3}(?:_[A-Z]{2})?$/.test(languageCode)) throw new BadRequestException('كود لغة القالب زي ما هو عند Meta (مثال: ar أو en_US)')
  if (!Array.isArray(value.variables) || value.variables.length > WHATSAPP_VARIABLES_MAX) throw new BadRequestException(`متغيرات القالب قايمة لحد ${WHATSAPP_VARIABLES_MAX}`)
  const allowed = new Set(notificationEventDef(code).variables.map(variable => variable.key))
  const variables = value.variables.map(key => {
    if (typeof key !== 'string' || !allowed.has(key)) throw new BadRequestException(`متغير غير معروف في قالب الواتساب: ${String(key)}`)
    return key
  })
  return { templateName, languageCode, variables }
}

/** الربط المحفوظ للحدث بكل لغة ({ ar: …, en: … }) — اللي شكله غلط بيتساب */
export function storedWhatsappBindings(code: NotificationEventCode, stored: unknown): Partial<Record<WhatsappTemplateLanguage, WhatsappBinding>> {
  const value = parseStored(stored), out: Partial<Record<WhatsappTemplateLanguage, WhatsappBinding>> = {}
  for (const language of WHATSAPP_TEMPLATE_LANGUAGES) {
    try { if (value[language]) out[language] = cleanWhatsappBinding(code, value[language]) } catch { /* ربط قديم مابقاش صالح */ }
  }
  return out
}

/**
 * قيم متغيرات القالب بترتيبها. Meta بترفض القيمة الفاضية والسطر الجديد والـtab وأكتر من 4 مسافات ورا بعض: القيمة بتتنضّف، والفاضي «-».
 */
export function whatsappParameters(binding: WhatsappBinding, values: Readonly<Record<string, string>>): string[] {
  return binding.variables.map(key => {
    const text = (Object.prototype.hasOwnProperty.call(values, key) ? String(values[key] ?? '') : '').replace(/[\r\n\t]+/g, ' ').replace(/ {2,}/g, ' ').trim().slice(0, 500)
    return text || '-'
  })
}

// ===== الحدث × القناة =====
export interface EventChannelRule {
  /** القناة مفتوحة للحدث ده؟ (البريد لسه محكوم بمفتاح الشركة notifications.email.enabled، والواتساب بفتح قناته) */
  inApp: boolean
  email: boolean
  whatsapp: boolean
  /** إلزامي: اختيار المستخدم «مقفول» أو «ملخص يومي» مابيتطبقش على الحدث ده */
  mandatory: boolean
}
/** من غير صف محفوظ = سلوك النظام الحالي بالحرف: داخل النظام والبريد زي ما هم، والواتساب مقفول */
export const DEFAULT_EVENT_RULE: Readonly<EventChannelRule> = Object.freeze({ inApp: true, email: true, whatsapp: false, mandatory: false })

export function cleanEventRule(raw: unknown): EventChannelRule {
  const value = record(raw)
  for (const key of ['inApp', 'email', 'whatsapp', 'mandatory'] as const) {
    if (typeof value[key] !== 'boolean') throw new BadRequestException('اختيارات القنوات للحدث لازم تكون مفتوح أو مقفول')
  }
  return { inApp: value.inApp === true, email: value.email === true, whatsapp: value.whatsapp === true, mandatory: value.mandatory === true }
}
