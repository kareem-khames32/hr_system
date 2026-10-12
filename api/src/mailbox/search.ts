import type * as Ews from 'ews-javascript-api'

// B-ADD.16: بحث دقيق — قيود Exchange (مطابقة جزء من النص الحقيقي) بدل فهرس البحث: الفهرس بيطابق بدايات الكلمات، وبيفوّت كلمات
// ماتفهرستش، وبيعامل الإملاء العربي المختلف ككلمات مختلفة. النتيجة زي قراية كل رسالة، من غير فرق بين الحروف الكبيرة والصغيرة.

/** اللي الموظف طلبه: خانة البحث (بأسلوب Outlook: from:/to:/subject:) + لوحة الاختيارات */
export interface MailQuery {
  text: string
  from: string
  to: string
  subject: string
  after?: string // yyyy-mm-dd بتوقيت الرياض
  before?: string
  attachments: boolean
  unreadOnly: boolean
}

const MAX_TERMS = 8
const MAX_VARIANTS = 16
const TASHKEEL = /[ً-ْٰـ]/g // التشكيل والألف الخنجرية والتطويل

// حروف بتتكتب بالشكلين في العربي، في المواضع اللي بتتكتب فيها بالشكلين
const ALEFS = ['ا', 'أ', 'إ', 'آ']
const ENDINGS: Record<string, string[]> = { ه: ['ه', 'ة'], ة: ['ة', 'ه'], ي: ['ي', 'ى'], ى: ['ى', 'ي'] }

/**
 * الإملاءات اللي بندوّر عليها لكل كلمة: «احمد» بتلاقي «أحمد»، و«الاداره» بتلاقي «الإدارة»، و«مستشفي» بتلاقي «مستشفى».
 * الهمزات في أول الكلمة (وبعد «ال»)، وة/ه وى/ي في آخرها؛ والتشكيل والتطويل متجاهلين.
 */
export function arabicVariants(term: string): string[] {
  const base = term.replace(TASHKEEL, '')
  // كل كلمة من «عبارة بين علامتين» بتتعامل نفس المعاملة
  const words = base.split(' ').map((w) => {
    const chars = [...w]
    const options = chars.map((ch) => [ch])
    const start = /^(ال|وال|بال|فال|كال|لل)/.exec(w)?.[0].length ?? 0
    const i = start
    if (ALEFS.includes(chars[i])) options[i] = [chars[i], ...ALEFS.filter((a) => a !== chars[i])]
    const last = chars.length - 1
    if (last > 0 && ENDINGS[chars[last]]) options[last] = ENDINGS[chars[last]]
    return options
  })
  const options = words.flatMap((w, i) => (i ? [[' '], ...w] : w))
  const out: string[] = []
  const walk = (i: number, acc: string) => {
    if (out.length >= MAX_VARIANTS) return
    if (i === options.length) return void out.push(acc)
    for (const o of options[i]) walk(i + 1, acc + o)
  }
  walk(0, '')
  return out
}

/** كلمات الخانة؛ «النص بين علامتين» بيفضل عبارة واحدة */
export function terms(s: string): string[] {
  const out: string[] = []
  for (const m of s.matchAll(/"([^"]+)"|(\S+)/g)) {
    const t = (m[1] ?? m[2]).trim()
    if (t) out.push(t)
  }
  return out.slice(0, MAX_TERMS)
}

/** بيطلّع from:/to:/subject: (وبالعربي من:/إلى:/الموضوع:) من نص خانة البحث */
export function parseBox(box: string): Pick<MailQuery, 'text' | 'from' | 'to' | 'subject'> {
  const field: Record<string, string[]> = { from: [], to: [], subject: [] }
  const alias: Record<string, string> = { from: 'from', 'من': 'from', to: 'to', 'إلى': 'to', 'الى': 'to', subject: 'subject', 'الموضوع': 'subject' }
  const text = box.replace(/(\S+?):("[^"]*"|\S+)/g, (all, key: string, value: string) => {
    const k = alias[key.toLowerCase()]
    if (!k) return all
    field[k].push(value)
    return ' '
  })
  return { text: text.trim(), from: field.from.join(' '), to: field.to.join(' '), subject: field.subject.join(' ') }
}

/** ‎?search=‎ (نص الخانة) + خانات لوحة اختيارات البحث */
export function mailQueryOf(q: Record<string, unknown>): MailQuery {
  const str = (v: unknown, max = 200) => (typeof v === 'string' ? v.trim().slice(0, max) : '')
  const box = parseBox(str(q.search))
  const date = (v: unknown) => (typeof v === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(v) ? v : undefined)
  return {
    text: box.text,
    from: [box.from, str(q.from)].filter(Boolean).join(' '),
    to: [box.to, str(q.to)].filter(Boolean).join(' '),
    subject: [box.subject, str(q.subject)].filter(Boolean).join(' '),
    after: date(q.after),
    before: date(q.before),
    attachments: q.attach === '1',
    unreadOnly: q.unread === '1',
  }
}

/** نص الليل بتوقيت الرياض (UTC+3 من غير توقيت صيفي) ليوم yyyy-mm-dd — بالمللي ثانية، أو null */
export function riyadhDayMs(d: string, plusDays = 0): number | null {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(d)) return null
  const ms = Date.parse(`${d}T00:00:00+03:00`)
  return Number.isNaN(ms) ? null : ms + plusDays * 86_400_000
}

export function isEmptyQuery(q: MailQuery) {
  return !q.text && !q.from && !q.to && !q.subject && !q.after && !q.before && !q.attachments && !q.unreadOnly
}

/** قيد FindItems؛ null لما مفيش حاجة مطلوبة. المكتبة بتتبعت من المنادي (بتتحمّل عند أول استخدام للبريد بس) */
export function buildFilter(ews: typeof Ews, q: MailQuery): Ews.SearchFilter | null {
  const { ComparisonMode, ContainmentMode, DateTime, EmailMessageSchema, ExtendedPropertyDefinition, ItemSchema, LogicalOperator, MapiPropertyType, SearchFilter } = ews
  const SENDER_NAME = new ExtendedPropertyDefinition(0x0c1a, MapiPropertyType.String) // PidTagSenderName
  const SENDER_SMTP = new ExtendedPropertyDefinition(0x5d01, MapiPropertyType.String) // PidTagSenderSmtpAddress
  const SENT_FOR_NAME = new ExtendedPropertyDefinition(0x0042, MapiPropertyType.String) // PidTagSentRepresentingName
  const contains = (prop: Ews.PropertyDefinitionBase, value: string) => new SearchFilter.ContainsSubstring(prop, value, ContainmentMode.Substring, ComparisonMode.IgnoreCase)
  const anyOf = (props: Ews.PropertyDefinitionBase[], term: string): Ews.SearchFilter => {
    const filters = props.flatMap((p) => arabicVariants(term).map((v) => contains(p, v)))
    return filters.length === 1 ? filters[0] : new SearchFilter.SearchFilterCollection(LogicalOperator.Or, filters)
  }
  const all: Ews.SearchFilter[] = []
  // كل كلمة لازم تظهر في حتة (الموضوع، النص، المرسل، المستلمين)
  for (const t of terms(q.text)) all.push(anyOf([ItemSchema.Subject, ItemSchema.Body, SENDER_NAME, SENDER_SMTP, ItemSchema.DisplayTo, ItemSchema.DisplayCc], t))
  for (const t of terms(q.from)) all.push(anyOf([SENDER_NAME, SENDER_SMTP, SENT_FOR_NAME], t))
  for (const t of terms(q.to)) all.push(anyOf([ItemSchema.DisplayTo, ItemSchema.DisplayCc], t))
  for (const t of terms(q.subject)) all.push(anyOf([ItemSchema.Subject], t))
  const after = q.after ? riyadhDayMs(q.after) : null
  const before = q.before ? riyadhDayMs(q.before, 1) : null // يوم «إلى» كله داخل
  if (after !== null) all.push(new SearchFilter.IsGreaterThanOrEqualTo(ItemSchema.DateTimeReceived, new DateTime(after)))
  if (before !== null) all.push(new SearchFilter.IsLessThan(ItemSchema.DateTimeReceived, new DateTime(before)))
  if (q.attachments) all.push(new SearchFilter.IsEqualTo(ItemSchema.HasAttachments, true))
  if (q.unreadOnly) all.push(new SearchFilter.IsEqualTo(EmailMessageSchema.IsRead, false))
  if (!all.length) return null
  return all.length === 1 ? all[0] : new SearchFilter.SearchFilterCollection(LogicalOperator.And, all)
}
