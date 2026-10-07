import { BadRequestException } from '@nestjs/common'

// B2.4: كتالوج أحداث الإشعارات — الفئات (للتفضيلات)، والقنوات، ونص كل حدث الافتراضي بمتغيراته.
// النص المعدَّل من الإعدادات بيتخزن في notification_templates؛ ومن غير صف، النص اللي هنا.
// كل موديول بيضيف أحداثه هنا (حدث من غير مصدر مابيتضافش).

export const NOTIFICATION_CHANNELS = ['IN_APP', 'EMAIL'] as const
export type NotificationChannelCode = typeof NOTIFICATION_CHANNELS[number]
export const NOTIFICATION_CHANNEL_LABELS: Record<NotificationChannelCode, string> = { IN_APP: 'داخل النظام', EMAIL: 'البريد' }

/** واجهة القناة: الواتساب (عن طريق مزوّد) والـpush بيتضافوا بنفس الشكل لما مزوّدهم يتحدد — مفيش تنفيذ ليهم هنا */
export interface NotificationChannel {
  readonly code: string
  /** القناة مضبوطة وشغالة على مستوى الشركة؟ */
  enabled(): Promise<boolean>
}

export const NOTIFICATION_CATEGORIES = {
  approval: 'طلبات بانتظار اعتمادي',
  request: 'قرارات طلباتي',
  payroll: 'الرواتب',
  // B2.5
  task: 'المهام',
  // B2.8
  comment: 'التعليقات والإشارات',
  // B2.15
  document: 'مستنداتي',
  // B2.16
  announcement: 'الإعلانات',
} as const
export type NotificationCategoryCode = keyof typeof NOTIFICATION_CATEGORIES
export const isNotificationCategory = (value: unknown): value is NotificationCategoryCode =>
  typeof value === 'string' && Object.prototype.hasOwnProperty.call(NOTIFICATION_CATEGORIES, value)

/** اختيار المستخدم: شغال، مقفول، أو ملخص يومي (للبريد بس) */
export const NOTIFICATION_MODES = ['ON', 'OFF', 'DIGEST'] as const
export type NotificationMode = typeof NOTIFICATION_MODES[number]

export interface NotificationText { title: string; body: string }
export interface NotificationVariable { key: string; label: string; sample: string }
export interface NotificationEventDef {
  label: string
  category: NotificationCategoryCode
  kind: 'success' | 'error' | 'warning' | 'info'
  /** ليه عنصر مخزّن في قايمة الإشعارات؟ false = جوه التطبيق متغطي بعنصر محسوب موجود (العدّاد أو «قرار طلبك») */
  storedInApp: boolean
  variables: readonly NotificationVariable[]
  templates: Record<NotificationChannelCode, NotificationText>
}

const COMMON: readonly NotificationVariable[] = [
  { key: 'recipient.name', label: 'اسم المستلم', sample: 'أحمد محمد — بيانات توضيحية' },
  { key: 'company.name', label: 'اسم الشركة', sample: 'شركة المثال — معاينة' },
  { key: 'link', label: 'رابط الفتح في النظام', sample: 'https://hr.example.invalid/requests' },
]
const REQUEST: readonly NotificationVariable[] = [
  { key: 'request.type', label: 'نوع الطلب', sample: 'إجازة سنوية' },
  { key: 'request.requester', label: 'اسم مقدّم الطلب', sample: 'سارة أحمد — بيانات توضيحية' },
]
// B2.5: المهمة بعنوانها وموعدها بس — وصفها مابيتبعتش في البريد
const TASK: readonly NotificationVariable[] = [
  { key: 'task.title', label: 'عنوان المهمة', sample: 'تجهيز ملف التأمين الطبي' },
  { key: 'task.due', label: 'موعد المهمة', sample: '2026-10-15' },
]
const greeting = 'السلام عليكم {{recipient.name}}،'
const closing = '{{company.name}}'

export const NOTIFICATION_EVENTS = {
  'request.pending_approval': {
    label: 'طلب بانتظار اعتمادك', category: 'approval', kind: 'info', storedInApp: false,
    variables: [...REQUEST, ...COMMON],
    templates: {
      IN_APP: { title: 'طلب بانتظار اعتمادك', body: '{{request.type}} — {{request.requester}}' },
      EMAIL: { title: 'طلب بانتظار اعتمادك: {{request.type}}',
        body: `${greeting}\n\nلديك طلب «{{request.type}}» من {{request.requester}} بانتظار اعتمادك.\n\nافتح الطلب من هنا:\n{{link}}\n\n${closing}` },
    },
  },
  'request.escalated': {
    label: 'طلب تم تصعيده لك', category: 'approval', kind: 'warning', storedInApp: false,
    variables: [...REQUEST, ...COMMON],
    templates: {
      IN_APP: { title: 'طلب تم تصعيده لك', body: '{{request.type}} — {{request.requester}}' },
      EMAIL: { title: 'طلب تم تصعيده لك: {{request.type}}',
        body: `${greeting}\n\nتجاوز الطلب «{{request.type}}» من {{request.requester}} مهلة اعتماده وتم تصعيده لك، وهو بانتظار اعتمادك.\n\nافتح الطلب من هنا:\n{{link}}\n\n${closing}` },
    },
  },
  'request.decided': {
    label: 'قرار على طلبك', category: 'request', kind: 'info', storedInApp: false,
    variables: [{ key: 'request.type', label: 'نوع الطلب', sample: 'إجازة سنوية' },
      { key: 'request.decision', label: 'القرار', sample: 'تمت الموافقة على طلبك' }, ...COMMON],
    templates: {
      IN_APP: { title: '{{request.decision}}', body: '{{request.type}}' },
      EMAIL: { title: '{{request.decision}}: {{request.type}}',
        body: `${greeting}\n\n{{request.decision}}: «{{request.type}}».\n\nالتفاصيل في النظام:\n{{link}}\n\n${closing}` },
    },
  },
  // «أُعيد لاستكمال» بكوده: بيتفحص وقت الإرسال إن الطلب لسه مرتجع (صاحبه ممكن يكون كمّله وقدّمه قبل ما البريد يطلع)
  'request.returned': {
    label: 'طلبك أُعيد لاستكمال المعلومات', category: 'request', kind: 'warning', storedInApp: false,
    variables: [{ key: 'request.type', label: 'نوع الطلب', sample: 'إجازة سنوية' }, ...COMMON],
    templates: {
      IN_APP: { title: 'أُعيد طلبك لاستكمال المعلومات', body: '{{request.type}}' },
      EMAIL: { title: 'أُعيد طلبك لاستكمال المعلومات: {{request.type}}',
        body: `${greeting}\n\nأُعيد طلبك «{{request.type}}» لاستكمال المعلومات. افتح الطلب وكمّل المطلوب وأعد تقديمه:\n{{link}}\n\n${closing}` },
    },
  },
  // الطلب السري: نفس النص لأي حدث عليه — من غير نوع ولا اسم ولا قرار (المحتوى مابيتبعتش في البريد)
  'request.confidential': {
    label: 'تحديث على طلب سري', category: 'request', kind: 'info', storedInApp: false,
    variables: [...COMMON],
    templates: {
      IN_APP: { title: 'تحديث على طلب سري', body: 'افتح النظام للتفاصيل' },
      EMAIL: { title: 'تحديث على طلب سري',
        body: `${greeting}\n\nلديك تحديث على طلب سري في النظام. التفاصيل لا تُرسل بالبريد.\n\nافتح النظام:\n{{link}}\n\n${closing}` },
    },
  },
  'payroll.payslip_available': {
    label: 'قسيمة راتبك متاحة', category: 'payroll', kind: 'info', storedInApp: true,
    variables: [{ key: 'payslip.period', label: 'شهر المسير', sample: '2026-10' }, ...COMMON],
    templates: {
      IN_APP: { title: 'قسيمة راتبك متاحة', body: 'قسيمة {{payslip.period}} متاحة في «قسائم راتبي»' },
      EMAIL: { title: 'قسيمة راتبك متاحة: {{payslip.period}}',
        body: `${greeting}\n\nقسيمة راتب {{payslip.period}} متاحة الآن في «قسائم راتبي».\n\nافتحها من هنا:\n{{link}}\n\n${closing}` },
    },
  },
  // B2.15: مستند الموظف وصل ليوم تنبيه قبل انتهائه (بياناته هو: نوع المستند وتاريخ انتهائه). جوه النظام العنصر المحسوب القايم
  // («مستند ينتهي خلال 60 يومًا» في قايمة الإشعارات)، والمحرك بيضيف البريد
  'document.expiring': {
    label: 'مستندك هينتهي', category: 'document', kind: 'warning', storedInApp: false,
    variables: [{ key: 'document.type', label: 'نوع المستند', sample: 'إقامة' }, { key: 'document.expiry', label: 'تاريخ الانتهاء', sample: '2026-11-15' }, ...COMMON],
    templates: {
      IN_APP: { title: 'مستندك هينتهي', body: '«{{document.type}}» هينتهي يوم {{document.expiry}} — راجع الموارد البشرية للتجديد' },
      EMAIL: { title: 'مستندك هينتهي: {{document.type}}',
        body: `${greeting}\n\nمستندك «{{document.type}}» هينتهي يوم {{document.expiry}}. راجع الموارد البشرية لتجديده.\n\nمستنداتك من هنا:\n{{link}}\n\n${closing}` },
    },
  },
  // B2.16: إعلان اتنشر لجمهوره (العنوان بس؛ النص في لوحة الإعلانات)
  'announcement.published': {
    label: 'إعلان جديد', category: 'announcement', kind: 'info', storedInApp: true,
    variables: [{ key: 'announcement.title', label: 'عنوان الإعلان', sample: 'عطلة اليوم الوطني' }, ...COMMON],
    templates: {
      IN_APP: { title: 'إعلان جديد', body: '{{announcement.title}}' },
      EMAIL: { title: 'إعلان جديد: {{announcement.title}}',
        body: `${greeting}\n\nفيه إعلان جديد: {{announcement.title}}.\n\nاقراه من هنا:\n{{link}}\n\n${closing}` },
    },
  },
  // B2.5 (محرك المهام): جوه النظام العدّاد المحسوب على «مهامي»، والمحرك بيضيف البريد
  'task.assigned': {
    label: 'مهمة جديدة عليك', category: 'task', kind: 'info', storedInApp: false,
    variables: [...TASK, ...COMMON],
    templates: {
      IN_APP: { title: 'مهمة جديدة عليك', body: '{{task.title}}' },
      EMAIL: { title: 'مهمة جديدة عليك: {{task.title}}',
        body: `${greeting}\n\nاتكلّفت بمهمة «{{task.title}}».\nالموعد: {{task.due}}\n\nافتحها من هنا:\n{{link}}\n\n${closing}` },
    },
  },
  'task.due_soon': {
    label: 'موعد مهمتك قرّب', category: 'task', kind: 'warning', storedInApp: false,
    variables: [...TASK, ...COMMON],
    templates: {
      IN_APP: { title: 'موعد مهمتك قرّب', body: '{{task.title}} — {{task.due}}' },
      EMAIL: { title: 'موعد مهمتك قرّب: {{task.title}}',
        body: `${greeting}\n\nالمهمة «{{task.title}}» موعدها {{task.due}} ولسه مفتوحة.\n\nافتحها من هنا:\n{{link}}\n\n${closing}` },
    },
  },
  'task.overdue': {
    label: 'مهمة متأخرة عن موعدها', category: 'task', kind: 'warning', storedInApp: false,
    variables: [...TASK, { key: 'task.assignee', label: 'المسؤول عن المهمة', sample: 'سارة أحمد — بيانات توضيحية' }, ...COMMON],
    templates: {
      IN_APP: { title: 'مهمة متأخرة عن موعدها', body: '{{task.title}} — {{task.assignee}}' },
      EMAIL: { title: 'مهمة متأخرة: {{task.title}}',
        body: `${greeting}\n\nالمهمة «{{task.title}}» على {{task.assignee}} عدّت موعدها ({{task.due}}) ولسه مفتوحة.\n\nافتحها من هنا:\n{{link}}\n\n${closing}` },
    },
  },
  // B2.8: إشارة في تعليق — من غير نص التعليق ولا اسم ولا نوع الطلب (الموضوع ممكن يكون سري): المستلم بيفتحه من اللينك
  'comment.mentioned': {
    label: 'إشارة لك في تعليق', category: 'comment', kind: 'info', storedInApp: true,
    variables: [{ key: 'comment.where', label: 'مكان التعليق', sample: 'على طلب' }, ...COMMON],
    templates: {
      IN_APP: { title: 'إشارة لك في تعليق', body: '{{comment.where}}' },
      EMAIL: { title: 'إشارة لك في تعليق',
        body: `${greeting}\n\nتمت الإشارة إليك في تعليق {{comment.where}} في النظام. نص التعليق لا يُرسل بالبريد.\n\nافتحه من هنا:\n{{link}}\n\n${closing}` },
    },
  },
} as const satisfies Record<string, NotificationEventDef>

export type NotificationEventCode = keyof typeof NOTIFICATION_EVENTS
export const NOTIFICATION_EVENT_CODES = Object.keys(NOTIFICATION_EVENTS) as NotificationEventCode[]
export const isNotificationEvent = (value: unknown): value is NotificationEventCode =>
  typeof value === 'string' && Object.prototype.hasOwnProperty.call(NOTIFICATION_EVENTS, value)
export const notificationEventDef = (code: NotificationEventCode): NotificationEventDef => NOTIFICATION_EVENTS[code]

export const NOTIFICATION_TITLE_MAX = 300
export const NOTIFICATION_BODY_MAX = 2000
// نفس كتابة المتغير في قوالب الخطابات: {{اسم.المتغير}}
const TOKEN = /\{\{\s*([a-zA-Z][a-zA-Z0-9._]*)\s*\}\}/g

/** نص قالب معدَّل: متغيرات الحدث بس، وصيغة مكتملة، وطول محدود */
export function validateNotificationTemplate(code: NotificationEventCode, raw: unknown): NotificationText {
  if (!raw || typeof raw !== 'object' || Array.isArray(raw)) throw new BadRequestException('بيانات القالب غير صالحة')
  const value = raw as Record<string, unknown>
  const allowed = new Set(notificationEventDef(code).variables.map(variable => variable.key))
  const clean = (text: unknown, label: string, max: number, min: number) => {
    if (typeof text !== 'string' || text.trim().length < min || text.length > max) throw new BadRequestException(`${label} مطلوب وبحد أقصى ${max} حرف`)
    const remaining = text.replace(TOKEN, (_all, key: string) => {
      if (!allowed.has(key)) throw new BadRequestException(`متغير غير معروف في القالب: ${key}`)
      return ''
    })
    if (remaining.includes('{{') || remaining.includes('}}')) throw new BadRequestException('صيغة متغير غير مكتملة؛ استخدم أزرار إدراج المتغيرات')
    return text.trim()
  }
  const title = clean(value.title, 'عنوان القالب', NOTIFICATION_TITLE_MAX, 2)
  if (/[\r\n]/.test(title)) throw new BadRequestException('عنوان القالب سطر واحد')
  return { title, body: clean(value.body, 'نص القالب', NOTIFICATION_BODY_MAX, 2) }
}

/** تعويض المتغيرات بقيمها (المتغير من غير قيمة = فاضي). العنوان بيطلع سطر واحد دايمًا */
export function renderNotificationText(template: NotificationText, values: Readonly<Record<string, string>>): NotificationText {
  // القيمة من مفاتيح values نفسها بس (مش من سلسلة الوراثة: «constructor» مش قيمة)، ومابتتفسّرش تاني بعد التعويض
  const fill = (text: string) => text.replace(TOKEN, (_all, key: string) => Object.prototype.hasOwnProperty.call(values, key) ? String(values[key] ?? '') : '')
  return { title: fill(template.title).replace(/\s*[\r\n]+\s*/g, ' ').trim().slice(0, NOTIFICATION_TITLE_MAX), body: fill(template.body).trim() }
}

/** نافذة ساعات الهدوء «HH:MM-HH:MM» بتوقيت النظام. الفاضي أو الغلط = مفيش ساعات هدوء */
export function parseQuietHours(value: unknown): { from: number; to: number } | null {
  const match = /^([01]\d|2[0-3]):([0-5]\d)-([01]\d|2[0-3]):([0-5]\d)$/.exec(String(value ?? '').trim())
  if (!match) return null
  const from = Number(match[1]) * 60 + Number(match[2]), to = Number(match[3]) * 60 + Number(match[4])
  return from === to ? null : { from, to }
}

/**
 * أول وقت بعد `now` برّه ساعات الهدوء (النافذة ممكن تعدّي نص الليل: 22:00-07:00). برّه النافذة = null (ابعت دلوقتي).
 * الحساب بساعة النظام المحلية (TZ الشركة — B1.4).
 */
export function quietHoursEnd(now: Date, window: { from: number; to: number } | null): Date | null {
  if (!window) return null
  const minute = now.getHours() * 60 + now.getMinutes()
  const inside = window.from < window.to ? minute >= window.from && minute < window.to : minute >= window.from || minute < window.to
  if (!inside) return null
  const end = new Date(now)
  end.setHours(Math.floor(window.to / 60), window.to % 60, 0, 0)
  // النافذة اللي بتعدّي نص الليل وإحنا في جزءها المسائي: نهايتها بكرة
  if (end.getTime() <= now.getTime()) end.setDate(end.getDate() + 1)
  return end
}

// نطاق داخلي (اسم دخول المجال زي user@company.local): مش صندوق بريد أكيد
const INTERNAL_MAIL_DOMAIN = /\.(?:local|lan|internal|intranet|corp)$/i

/**
 * عنوان المستلم: بريد الحساب، وإلا البريد اللي في ملف الموظف. العنوان اللي نطاقه داخلي بييجي بعد أي عنوان تاني (لو هو الوحيد بيتجرّب).
 * null = مفيش عنوان بشكل صالح.
 */
export function pickNotificationAddress(accountEmail: unknown, fileEmail: unknown): string | null {
  const candidates = [deliverableEmail(accountEmail), deliverableEmail(fileEmail)].filter((value): value is string => !!value)
  return candidates.find(value => !INTERNAL_MAIL_DOMAIN.test(value)) ?? candidates[0] ?? null
}

/** عنوان بريد يتبعت عليه؟ (فحص شكل بس) */
export const deliverableEmail = (value: unknown): string | null => {
  const email = String(value ?? '').trim()
  return /^[^\s@<>"',;]+@[^\s@<>"',;]+\.[^\s@<>"',;]{2,}$/.test(email) && email.length <= 200 ? email : null
}
