// B-ADD.5: «الإعدادات ← قنوات الإشعارات» — إعداد خادم البريد والواتساب (الأسرار بتتكتب بس ومابترجعش)، وجدول «الحدث × القناة» وربط
// قالب Meta، ومين ناقصه رقم أو بريد، ورقم واتساب الموظف في ملفه، والبحث في سجل الإرسال. الخادم هو اللي بيحكم (مدير النظام بس للإعداد).
// مسارات نسبية (لا @/) عشان الاختبارات تقرا الملف مباشرة.
import { apiFetch } from './api'
import type { ApiNotificationDeliveries, ApiNotificationTemplates, ApiNotificationText, NotificationChannel, NotificationDeliveryStatus } from './notifications-api'

export type DeliveryChannel = NotificationChannel | 'WHATSAPP'
export const DELIVERY_CHANNEL_LABELS: Record<DeliveryChannel, string> = { IN_APP: 'داخل النظام', EMAIL: 'البريد', WHATSAPP: 'الواتساب' }
export type TemplateLanguage = 'ar' | 'en'
export const TEMPLATE_LANGUAGE_LABELS: Record<TemplateLanguage, string> = { ar: 'عربي', en: 'English' }

export interface MailSettings {
  preset: string
  host: string
  port: number
  encryption: string
  user: string
  fromName: string
  fromAddress: string
}
export interface WhatsappSettings {
  provider: string
  phoneNumber: string
  phoneNumberId: string
  businessAccountId: string
  apiVersion: string
  defaultCountryCode: string
  fallbackToPhone: boolean
}
export interface WhatsappBinding { templateName: string; languageCode: string; variables: string[] }
export interface ChannelEvent {
  code: string
  label: string
  category: string
  /** false = جوه النظام عدّاد محسوب: دايمًا ظاهر ومالوش اختيار */
  storedInApp: boolean
  variables: Array<{ key: string; label: string; sample: string }>
  inApp: boolean
  email: boolean
  whatsapp: boolean
  mandatory: boolean
  customized: boolean
  whatsappTemplates: Record<TemplateLanguage, WhatsappBinding | null>
}
export interface ApiNotificationChannels {
  /** false = ترحيل 187 لسه ماتطبقش */
  available: boolean
  email: {
    enabled: boolean
    settings: MailSettings
    /** كلمة السر: متسجّلة ولا لأ — قيمتها مابترجعش أبدًا */
    passwordSet: boolean
    passwordReadable: boolean
    presets: Record<string, { label: string; host: string; port: number; encryption: string }>
    encryptions: Record<string, string>
    active: { configured: boolean; server: string | null; from: string | null; source: 'env' | 'screen' }
    notificationsEnabled: boolean
    linkConfigured: boolean
  }
  whatsapp: {
    enabled: boolean
    settings: WhatsappSettings
    tokenSet: boolean
    tokenReadable: boolean
    providers: Record<string, string>
    languages: TemplateLanguage[]
  }
  events: ChannelEvent[]
}
export interface ChannelTestResult { ok: boolean; detail: string; to: string; source?: 'env' | 'screen' }

export const fetchNotificationChannels = () => apiFetch<ApiNotificationChannels>('/notification-channels')

/** password: undefined = المحفوظة زي ما هي؛ '' = مسحها */
export const saveMailChannel = (input: MailSettings & { enabled: boolean; password?: string }) =>
  apiFetch<ApiNotificationChannels>('/notification-channels/email', { method: 'PUT', body: JSON.stringify(input) })

export const testMailChannel = (to: string) =>
  apiFetch<ChannelTestResult>('/notification-channels/email/test', { method: 'POST', body: JSON.stringify({ to }) })

/** token: undefined = المحفوظ زي ما هو؛ '' = مسحه */
export const saveWhatsappChannel = (input: WhatsappSettings & { enabled: boolean; token?: string }) =>
  apiFetch<ApiNotificationChannels>('/notification-channels/whatsapp', { method: 'PUT', body: JSON.stringify(input) })

export const testWhatsappChannel = (to: string, eventCode: string, language: TemplateLanguage) =>
  apiFetch<ChannelTestResult>('/notification-channels/whatsapp/test', { method: 'POST', body: JSON.stringify({ to, eventCode, language }) })

export const saveEventChannels = (code: string, rule: { inApp: boolean; email: boolean; whatsapp: boolean; mandatory: boolean;
  whatsappTemplates?: Partial<Record<TemplateLanguage, WhatsappBinding | null>> }) =>
  apiFetch<ApiNotificationChannels>(`/notification-channels/events/${encodeURIComponent(code)}`, { method: 'PUT', body: JSON.stringify(rule) })

export interface ApiMissingContacts {
  available: boolean
  whatsappOpen: boolean
  fallbackToPhone: boolean
  counts: { employees: number; noAccount: number; noEmail: number; noWhatsapp: number }
  limit: number
  rows: Array<{ id: number; employeeCode: string; fullName: string; branchName: string | null; noAccount: boolean; noEmail: boolean; noWhatsapp: boolean }>
}
export const fetchMissingContacts = () => apiFetch<ApiMissingContacts>('/notification-channels/missing-contacts')

export interface ApiEmployeeContact { available: boolean; whatsappNumber: string | null; email: string | null; phone: string | null }
export const fetchEmployeeContact = (employeeId: number) => apiFetch<ApiEmployeeContact>(`/notification-channels/contacts/${employeeId}`)
export const saveEmployeeContact = (employeeId: number, whatsappNumber: string | null) =>
  apiFetch<ApiEmployeeContact>(`/notification-channels/contacts/${employeeId}`, { method: 'PUT', body: JSON.stringify({ whatsappNumber }) })

// ===== القوالب بلغة، والبحث في سجل الإرسال (نفس مساري B2.4 بفلاترهم الجديدة) =====
const templatePath = (code: string, channel: NotificationChannel, language: TemplateLanguage) =>
  `/notifications/templates/${encodeURIComponent(code)}/${encodeURIComponent(channel)}?language=${language}`
export const fetchNotificationTemplatesIn = (language: TemplateLanguage) => apiFetch<ApiNotificationTemplates & { language: TemplateLanguage }>(`/notifications/templates?language=${language}`)
export const saveNotificationTemplateIn = (code: string, channel: NotificationChannel, language: TemplateLanguage, text: ApiNotificationText) =>
  apiFetch<ApiNotificationTemplates>(templatePath(code, channel, language), { method: 'PUT', body: JSON.stringify(text) })
export const resetNotificationTemplateIn = (code: string, channel: NotificationChannel, language: TemplateLanguage) =>
  apiFetch<ApiNotificationTemplates>(templatePath(code, channel, language), { method: 'DELETE' })

export interface DeliverySearch { status?: NotificationDeliveryStatus | ''; channel?: DeliveryChannel | ''; event?: string; recipient?: string; from?: string; to?: string; page?: number }
export interface ApiDeliverySearch extends Omit<ApiNotificationDeliveries, 'rows'> {
  whatsappEnabled?: boolean
  whatsappCounts?: Partial<Record<NotificationDeliveryStatus, number>>
  total?: number
  page?: number
  pageSize?: number
  rows: Array<Omit<ApiNotificationDeliveries['rows'][number], 'channel'> & { channel: DeliveryChannel }>
}
export const searchNotificationDeliveries = (search: DeliverySearch) => {
  const query = new URLSearchParams()
  for (const [key, value] of Object.entries(search)) if (value !== undefined && value !== '' && value !== null) query.set(key, String(value))
  const text = query.toString()
  return apiFetch<ApiDeliverySearch>(`/notifications/deliveries${text ? `?${text}` : ''}`)
}

// ===== اختيارات المستخدم (إضافات B-ADD.5 على رد /notifications/preferences) =====
export interface PreferenceExtras {
  whatsappEnabled?: boolean
  whatsapp?: Record<string, 'ON' | 'OFF'>
  /** الفئة ← أسماء الأحداث اللي الإدارة معلّماها «إلزامي» */
  mandatory?: Record<string, string[]>
  /** فئات كل أحداثها إلزامية: اختيارها مقفول */
  locked?: string[]
  contact?: { email: string | null; whatsapp: string | null }
}

/** اختيار المستخدم لواتساب فئة: شغال أو مقفول بس (نفس مسار اختيارات B2.4) */
export const setWhatsappPreference = (category: string, mode: 'ON' | 'OFF') =>
  apiFetch<import('./notifications-api').ApiNotificationPreferences & PreferenceExtras>('/notifications/preferences', { method: 'PATCH', body: JSON.stringify({ category, channel: 'WHATSAPP', mode }) })
