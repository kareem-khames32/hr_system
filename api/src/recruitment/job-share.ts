// B-ADD.6: نشر الوظيفة على السوشيال ميديا — قواعد من غير قاعدة بيانات: مصادر التقديم المعروفة (اللي بتيجي في `?src=` في لينك التقديم)،
// وعنوان الواجهة العام اللي اللينك بيتبني عليه، وفيد XML للوظائف المنشورة للعموم. النشر نفسه من متصفح مسؤول التوظيف: الخادم مابينشرش
// حاجة ولا بينادي أي منصة.

/**
 * المصادر المعروفة: المفتاح هو اللي في اللينك (`?src=linkedin`)، والاسم هو اللي بيتخزّن في خانة المصدر القايمة وبيظهر في «مصادر المرشحين»
 * (اسم المنصة زي ما هو — نفسه في العربي والإنجليزي). الكتابات التانية بتتجمّع على نفس الاسم.
 */
export const JOB_SOURCES = [
  { key: 'linkedin', label: 'LinkedIn', aliases: ['لينكد إن', 'لينكدإن', 'لينكد ان'] },
  { key: 'facebook', label: 'Facebook', aliases: ['فيسبوك', 'فيس بوك', 'fb'] },
  { key: 'x', label: 'X', aliases: ['twitter', 'تويتر', 'إكس'] },
  { key: 'whatsapp', label: 'WhatsApp', aliases: ['واتساب', 'واتس اب', 'واتس آب'] },
  { key: 'instagram', label: 'Instagram', aliases: ['انستجرام', 'إنستجرام', 'انستغرام', 'إنستغرام'] },
  { key: 'indeed', label: 'Indeed', aliases: ['إنديد', 'انديد'] },
] as const
export type JobSourceKey = (typeof JOB_SOURCES)[number]['key']

const plain = (value: string): string => value.replace(/\s+/g, ' ').trim().toLowerCase()
const SOURCE_BY_TEXT = new Map<string, string>(JOB_SOURCES.flatMap((source) => [source.key, source.label, ...source.aliases].map((text): [string, string] => [plain(text), source.label])))

/** اسم المصدر المعروف (LinkedIn، Facebook…) من مفتاحه أو اسمه أو كتابته بالعربي، أو null لو مش من القايمة */
export function knownSourceLabel(raw: unknown): string | null {
  return typeof raw === 'string' ? SOURCE_BY_TEXT.get(plain(raw)) ?? null : null
}

export interface PublicBase {
  /** عنوان الواجهة من غير شرطة في الآخر، أو null لو مش مضبوط أو مش عنوان http(s) */
  url: string | null
  /** العنوان داخلي (مش https، أو جهاز محلي، أو عنوان شبكة خاصة): اللينك مش هيفتح من برّه الشركة */
  internal: boolean
}

const PRIVATE_HOST = /^(localhost|127\.\d+\.\d+\.\d+|10\.\d+\.\d+\.\d+|192\.168\.\d+\.\d+|169\.254\.\d+\.\d+|172\.(1[6-9]|2\d|3[01])\.\d+\.\d+|\[[0-9a-f:.]+\])$/i

/** عنوان عام من إعداد الخادم: لازم http أو https ومن غير بيانات دخول. لينك التقديم بيتبني عليه مش على عنوان متصفح مسؤول التوظيف. */
export function publicBaseOf(raw: unknown): PublicBase {
  const text = typeof raw === 'string' ? raw.trim() : ''
  let parsed: URL | null = null
  try { parsed = text ? new URL(text) : null } catch { parsed = null }
  if (!parsed || (parsed.protocol !== 'http:' && parsed.protocol !== 'https:') || parsed.username || parsed.password) return { url: null, internal: false }
  const host = parsed.hostname.toLowerCase()
  // اسم من غير نقطة (اسم جهاز على الشبكة) أو بنهاية محلية = داخلي
  const internal = parsed.protocol !== 'https:' || PRIVATE_HOST.test(host) || !host.includes('.') || /\.(local|localhost|test|internal|lan|invalid)$/.test(host)
  return { url: `${parsed.origin}${parsed.pathname.replace(/\/+$/, '')}`, internal }
}

/**
 * عنوان صفحة الوظائف العام: CAREERS_PUBLIC_URL لو مضبوط (النظام داخلي وصفحة الوظائف بس متاحة على دومين عام)، وإلا عنوان الواجهة
 * FRONTEND_URL. القيمة المضبوطة الغلط مابتتعوّضش بالتانية — بتظهر «مش مضبوط» عشان تتصلّح.
 */
export const careersBaseOf = (own: unknown, frontend: unknown): PublicBase => publicBaseOf(typeof own === 'string' && own.trim() ? own : frontend)

/** لينك التقديم على وظيفة (صفحة الوظيفة العامة)، وبمصدره لو اتحدد */
export const jobApplyLink = (base: string, jobId: number, source?: JobSourceKey): string => `${base}/careers/${jobId}${source ? `?src=${source}` : ''}`

// ===== فيد XML =====

/** الفيدات المتاحة باسم ملفها في اللينك الثابت، والمصدر اللي بيتحط في لينك التقديم جوّه كل واحد */
export const JOB_FEEDS = { 'indeed.xml': { source: 'indeed', label: 'Indeed' }, 'linkedin.xml': { source: 'linkedin', label: 'LinkedIn Limited Listings' } } as const
export type JobFeedName = keyof typeof JOB_FEEDS
export const isJobFeedName = (name: unknown): name is JobFeedName => typeof name === 'string' && Object.prototype.hasOwnProperty.call(JOB_FEEDS, name)

/** الوظيفة زي ما الصفحة العامة بتعرضها — الفيد مابياخدش غير الخانات دي */
export interface FeedJob {
  id: number; code: string; title: string; branchName: string | null; openings: number
  description: string | null; requirements: string | null; startDate: string | null; publishedAt: Date | string | null
}

// الحروف اللي XML 1.0 مابيقبلهاش بتتشال، ونهاية CDATA جوّه النص بتتقسم
const xmlSafe = (value: string): string => value.replace(/[^\u0009\u000A\u000D\u0020-\uD7FF\uE000-\uFFFD\u{10000}-\u{10FFFF}]/gu, '')
const cdata = (value: unknown): string => `<![CDATA[${xmlSafe(String(value ?? '')).replace(/]]>/g, ']]]]><![CDATA[>')}]]>`
const xmlText = (value: string): string => xmlSafe(value).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
// وصف الوظيفة في الفيد HTML بسيط: النص بحروفه (من غير أي وسم من عند كاتبه) وسطوره <br>
const htmlLines = (value: string): string => value.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/\r?\n/g, '<br>')
const feedDescription = (job: FeedJob): string =>
  [job.description ? htmlLines(job.description) : '', job.requirements ? `<b>المتطلبات</b><br>${htmlLines(job.requirements)}` : ''].filter(Boolean).join('<br><br>')
const feedDate = (value: Date | string | null, fallback: Date): string => {
  const at = value ? new Date(value) : fallback
  return (Number.isNaN(at.getTime()) ? fallback : at).toUTCString()
}

/**
 * فيد الوظائف المنشورة للعموم بصيغة المنصة (Indeed XML أو LinkedIn Limited Listings): المسمى، والمكان (اسم الفرع)، والوصف والمتطلبات،
 * وتاريخ النشر، ولينك التقديم بمصدره. من غير راتب ولا قسم ولا سبب احتياج ولا أي بيان مرشح.
 */
export function jobsFeedXml(name: JobFeedName, jobs: readonly FeedJob[], company: string, base: string, now: Date = new Date()): string {
  const source = JOB_FEEDS[name].source
  const head = name === 'linkedin.xml'
    ? [`<lastBuildDate>${xmlText(now.toUTCString())}</lastBuildDate>`, `<publisherUrl>${xmlText(`${base}/careers`)}</publisherUrl>`, `<publisher>${xmlText(company)}</publisher>`]
    : [`<publisher>${xmlText(company)}</publisher>`, `<publisherurl>${xmlText(`${base}/careers`)}</publisherurl>`, `<lastBuildDate>${xmlText(now.toUTCString())}</lastBuildDate>`]
  const body = jobs.map((job) => {
    const link = jobApplyLink(base, job.id, source)
    const fields = name === 'linkedin.xml'
      ? [['partnerJobId', job.code], ['company', company], ['title', job.title], ['description', feedDescription(job)], ['applyUrl', link], ['location', job.branchName ?? ''],
        ['listDate', feedDate(job.publishedAt, now)]]
      : [['title', job.title], ['date', feedDate(job.publishedAt, now)], ['referencenumber', job.code], ['url', link], ['company', company], ['city', job.branchName ?? ''],
        ['description', feedDescription(job)]]
    return `<job>\n${fields.map(([tag, value]) => `<${tag}>${cdata(value)}</${tag}>`).join('\n')}\n</job>`
  })
  return ['<?xml version="1.0" encoding="utf-8"?>', '<source>', ...head, ...body, '</source>', ''].join('\n')
}
