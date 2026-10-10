// B-ADD.6: «انشر الوظيفة» — بناء البوست ولينكات المشاركة في المتصفح، من غير أي نداء. البوست من خانات الوظيفة العامة بس (نفس اللي صفحة
// الوظائف بتعرضه): المسمى، المكان، العدد، والمتطلبات باختصار، ولينك التقديم بمصدره (`?src=linkedin`…). مفيش حاجة بتتنشر من الخادم.

export type PostLang = 'ar' | 'en'

/** الوظيفة بشكلها العام (رد الخادم في لوحة النشر — من غير راتب ولا قسم ولا سبب احتياج) */
export interface SharedJob {
  id: number; code: string; title: string; branchName: string | null; openings: number
  description: string | null; requirements: string | null; startDate: string | null
}

/** مصادر لينك التقديم — نفس قايمة الخادم (job-share.ts): أي قيمة تانية في `?src=` بتتسجّل «لينك عام» */
export const SHARE_SOURCES = ['linkedin', 'facebook', 'x', 'whatsapp', 'instagram', 'indeed'] as const
export type ShareSource = (typeof SHARE_SOURCES)[number]

/** مصدر اللينك لو من القايمة المعروفة (بحروف صغيرة)، وإلا فاضي */
export function knownShareSource(raw: unknown): ShareSource | '' {
  const value = typeof raw === 'string' ? raw.trim().toLowerCase() : ''
  return (SHARE_SOURCES as readonly string[]).includes(value) ? (value as ShareSource) : ''
}

/** لينك التقديم على الوظيفة (صفحتها العامة) فوق عنوان الواجهة العام، وبمصدره لو اتحدد */
export const applyLink = (base: string, jobId: number, source?: ShareSource | ''): string =>
  `${base.replace(/\/+$/, '')}/careers/${jobId}${source ? `?src=${source}` : ''}`

const shorten = (text: string, max: number): string => (text.length > max ? `${text.slice(0, max - 1).trimEnd()}…` : text)

/** المتطلبات باختصار: أول كام سطر من غير علامات التعداد، وكل سطر بحد أقصى. من غير متطلبات: أول سطرين من الوصف. */
export function requirementsBrief(job: Pick<SharedJob, 'requirements' | 'description'>, lines = 4, width = 100): string[] {
  const clean = (text: string | null) =>
    (text ?? '').split(/\r?\n/).map((line) => line.replace(/^[\s\-–—•·*▪●◦]+/, '').replace(/^[\d٠-٩]{1,2}\s*[.)\-]\s*/, '').replace(/\s+/g, ' ').trim()).filter(Boolean)
  const required = clean(job.requirements)
  return (required.length ? required.slice(0, lines) : clean(job.description).slice(0, 2)).map((line) => shorten(line, width))
}

/** نص البوست من غير اللينك (اللي مسؤول التوظيف بيعدّل فيه): عربي، أو إطار إنجليزي حوالين بيانات الوظيفة زي ما هي مكتوبة */
export function jobPostBody(job: SharedJob, company: string | null, lang: PostLang): string {
  const brief = requirementsBrief(job)
  const hasRequirements = !!(job.requirements ?? '').trim()
  const lines = lang === 'ar'
    ? [
        company ? `${company} تعلن عن وظيفة شاغرة: ${job.title}` : `وظيفة شاغرة: ${job.title}`,
        job.branchName ? `المكان: ${job.branchName}` : '',
        job.openings > 1 ? `العدد المطلوب: ${job.openings}` : '',
        brief.length ? (hasRequirements ? 'المتطلبات:' : 'عن الوظيفة:') : '',
      ]
    : [
        company ? `${company} is hiring: ${job.title}` : `We are hiring: ${job.title}`,
        job.branchName ? `Location: ${job.branchName}` : '',
        job.openings > 1 ? `Openings: ${job.openings}` : '',
        brief.length ? (hasRequirements ? 'Requirements:' : 'About the role:') : '',
      ]
  return [...lines.filter(Boolean), ...brief.map((line) => `- ${line}`)].join('\n')
}

/** البوست الجاهز: النص ولينك التقديم في آخره */
export const jobPost = (body: string, link: string, lang: PostLang): string => `${body.trim()}\n\n${lang === 'ar' ? 'للتقديم' : 'Apply here'}: ${link}`

/** نص X القصير (اللينك بيتبعت لوحده): أول سطرين من البوست بحد أقصى */
export const shortPost = (body: string, max = 200): string => shorten(body.trim().split(/\r?\n/).filter(Boolean).slice(0, 2).join(' — '), max)

/** المنصات اللي ليها لينك مشاركة قياسي بيفتح نافذة البوست. Instagram مالوش (نسخ البوست والصورة بس). */
export const SHARE_CHANNELS: ReadonlyArray<{ key: ShareSource; label: string; opens: boolean; pasteText: boolean }> = [
  // LinkedIn وFacebook بياخدوا اللينك بس — النص بيتنسخ ويتلصق في النافذة
  { key: 'linkedin', label: 'LinkedIn', opens: true, pasteText: true },
  { key: 'facebook', label: 'Facebook', opens: true, pasteText: true },
  { key: 'x', label: 'X', opens: true, pasteText: false },
  { key: 'whatsapp', label: 'واتساب', opens: true, pasteText: false },
  { key: 'instagram', label: 'Instagram', opens: false, pasteText: true },
]

/** لينك المشاركة القياسي للمنصة (بيتفتح في تبويب جديد)، أو null لو المنصة مالهاش */
export function shareUrl(channel: ShareSource, body: string, link: string, lang: PostLang): string | null {
  const encoded = encodeURIComponent(link)
  if (channel === 'linkedin') return `https://www.linkedin.com/sharing/share-offsite/?url=${encoded}`
  if (channel === 'facebook') return `https://www.facebook.com/sharer/sharer.php?u=${encoded}`
  if (channel === 'x') return `https://twitter.com/intent/tweet?text=${encodeURIComponent(shortPost(body))}&url=${encoded}`
  if (channel === 'whatsapp') return `https://wa.me/?text=${encodeURIComponent(jobPost(body, link, lang))}`
  return null
}

/** مقاسات صورة الوظيفة */
export const SHARE_IMAGE_SIZES = {
  linkedin: { label: 'LinkedIn (1200×627)', width: 1200, height: 627 },
  instagram: { label: 'Instagram (1080×1080)', width: 1080, height: 1080 },
} as const
export type ShareImageSize = keyof typeof SHARE_IMAGE_SIZES

/** تقسيم نص على سطور بعرض أقصى (بدالة قياس العرض)، وبحد أقصى لعدد السطور — الباقي بيتقص بـ«…» */
export function wrapLines(text: string, maxWidth: number, measure: (value: string) => number, maxLines = 3): string[] {
  const words = text.replace(/\s+/g, ' ').trim().split(' ').filter(Boolean)
  const lines: string[] = []
  let line = ''
  for (const word of words) {
    const next = line ? `${line} ${word}` : word
    if (line && measure(next) > maxWidth) {
      lines.push(line)
      line = word
    } else line = next
  }
  if (line) lines.push(line)
  if (lines.length <= maxLines) return lines
  const kept = lines.slice(0, maxLines)
  let last = `${kept[maxLines - 1]}…`
  while (last.length > 2 && measure(last) > maxWidth) last = `${last.slice(0, -2).trimEnd()}…`
  kept[maxLines - 1] = last
  return kept
}
