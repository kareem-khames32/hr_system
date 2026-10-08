import { BadRequestException } from '@nestjs/common'
import type { EntityManager } from 'typeorm'
import { REVIEW_AUDIENCE_MODES, REVIEW_CYCLE_KINDS, type ReviewAudienceMode, type ReviewAssignmentStatus, type ReviewCycleKind, type ReviewCycleStatus } from './review.entities'

// B3.7: قواعد دورات التقييم — فحص وجود ترحيلات 112–115، وشكل نموذج التقييم (أقسام موزونة)، وقيم الدورة، والإجابات، والدرجة المحسوبة بالأوزان.
// بنود النموذج بنفس شكل حقول بانِي الطلبات (key، label، type، required) بنوعين: تقدير أو نص.

export const REVIEWS_MIGRATION_MISSING = 'دورات التقييم محتاجة ترحيلات 20261009_112 لـ20261009_115 على قاعدة البيانات'
export const REVIEW_NOT_FOUND = 'التقييم غير موجود'
export const REVIEW_CYCLE_NOT_FOUND = 'دورة التقييم غير موجودة'
export const REVIEW_TEMPLATE_NOT_FOUND = 'نموذج التقييم غير موجود'
export const REVIEW_NAME = 'الاسم مطلوب (من 3 لـ200 حرف)'
export const REVIEW_RATING_MAX = 'مقياس التقدير: أعلى درجة من 3 لـ10'
export const REVIEW_SECTIONS = 'النموذج محتاج أقسام (من 1 لـ8)، وأوزانها أرقام صحيحة مجموعها 100'
export const REVIEW_SECTION = 'كل قسم محتاج عنوان (2–100 حرف) ونوع (أهداف، جدارات، أسئلة)، وقسم أهداف واحد بالكتير'
export const REVIEW_ITEMS = 'قسم الجدارات أو الأسئلة محتاج بنود (من 1 لـ20) بعنوان (2–200 حرف) ونوع (تقدير أو نص)؛ والقسم اللي له وزن لازم فيه بند تقدير'
export const REVIEW_KIND = 'نوع الدورة: سنوي أو نصف سنوي أو فترة تجربة أو مشروع'
export const REVIEW_DATES = 'تواريخ الدورة: فترة صالحة (النهاية مش قبل البداية)، وآخر يوم للتقييم الذاتي مش بعد آخر يوم لتقييم المدير'
export const REVIEW_AUDIENCE = 'جمهور الدورة: الشركة، أو فروع محددة، أو أقسام محددة'
export const REVIEW_ANSWERS = 'إجابات التقييم ناقصة أو غير صالحة: كل بند مطلوب لازم يتجاوب، والتقدير من 1 لأعلى درجة في المقياس'
export const REVIEW_SUBMITTED = 'التقييم اتسلّم قبل كده — مابيتعدّلش'
export const REVIEW_CYCLE_STATUS_LABELS: Record<ReviewCycleStatus, string> = { DRAFT: 'مسودة', ACTIVE: 'شغالة', CLOSED: 'مقفولة' }
export const REVIEW_CYCLE_KIND_LABELS: Record<ReviewCycleKind, string> = { ANNUAL: 'سنوي', SEMI_ANNUAL: 'نصف سنوي', PROBATION: 'فترة تجربة', PROJECT: 'مشروع' }
export const REVIEW_STATUS_LABELS: Record<ReviewAssignmentStatus, string> = { OPEN: 'مفتوح', COMPLETED: 'المدير سلّم', APPROVED: 'معتمد', ANNOUNCED: 'معلن', ACKNOWLEDGED: 'الموظف أقرّ' }
export const REVIEW_TEXT_MAX = 2000

export type ReviewSectionKind = 'GOALS' | 'COMPETENCIES' | 'QUESTIONS'
export interface ReviewItem { key: string; label: string; type: 'rating' | 'text'; required: boolean }
export interface ReviewSection { key: string; title: string; kind: ReviewSectionKind; weight: number; items: ReviewItem[] }
export interface ReviewTemplateShape { ratingMax: number; sections: ReviewSection[] }
export interface ReviewGoalRef { id: number; title: string; weight: number }
export interface ReviewAnswers { sections: Record<string, Record<string, { rating?: number; text?: string }>>; goals: Record<string, { rating: number; comment?: string }> }

let ready: boolean | null = null
/** جداول ترحيلات 112–115 موجودة؟ الموجود بيتحفظ. الناقص بيتفحص مع كل نداء لحد ما الترحيلات تتطبق. */
export async function reviewsReady(em: EntityManager): Promise<boolean> {
  if (ready === true) return true
  const [row] = await em.query(`SELECT CASE WHEN OBJECT_ID(N'dbo.review_templates', N'U') IS NOT NULL AND OBJECT_ID(N'dbo.review_cycles', N'U') IS NOT NULL
    AND OBJECT_ID(N'dbo.review_assignments', N'U') IS NOT NULL AND OBJECT_ID(N'dbo.review_responses', N'U') IS NOT NULL THEN 1 ELSE 0 END AS [ready]`)
  ready = Number(row?.ready) === 1
  return ready
}
/** للاختبارات: نسيان حالة الترحيل */
export function resetReviewsCache() { ready = null }

const line = (raw: unknown): string => (typeof raw === 'string' ? raw.replace(/\s+/g, ' ').trim() : '')
export function cleanReviewName(raw: unknown): string {
  const value = line(raw)
  if (value.length < 3 || value.length > 200) throw new BadRequestException(REVIEW_NAME)
  return value
}
export function cleanRatingMax(raw: unknown): number {
  if (!Number.isSafeInteger(raw) || (raw as number) < 3 || (raw as number) > 10) throw new BadRequestException(REVIEW_RATING_MAX)
  return raw as number
}

/** أقسام النموذج: مفاتيح الأقسام والبنود بيحطها الخادم (s1، s1i1…) فالإجابات بتتربط بيها مهما العناوين اتغيّرت في نموذج تاني */
export function cleanSections(raw: unknown): ReviewSection[] {
  if (!Array.isArray(raw) || raw.length < 1 || raw.length > 8) throw new BadRequestException(REVIEW_SECTIONS)
  const sections = raw.map((entry, at): ReviewSection => {
    const section = (entry ?? {}) as { title?: unknown; kind?: unknown; weight?: unknown; items?: unknown }
    const title = line(section.title), kind = section.kind
    if (title.length < 2 || title.length > 100 || (kind !== 'GOALS' && kind !== 'COMPETENCIES' && kind !== 'QUESTIONS')) throw new BadRequestException(REVIEW_SECTION)
    if (!Number.isSafeInteger(section.weight) || (section.weight as number) < 0 || (section.weight as number) > 100) throw new BadRequestException(REVIEW_SECTIONS)
    const key = `s${at + 1}`
    if (kind === 'GOALS') {
      if (Array.isArray(section.items) && section.items.length) throw new BadRequestException('قسم الأهداف من غير بنود: بنوده هي أهداف الموظف في فترة الدورة')
      return { key, title, kind, weight: section.weight as number, items: [] }
    }
    if (!Array.isArray(section.items) || section.items.length < 1 || section.items.length > 20) throw new BadRequestException(REVIEW_ITEMS)
    const items = section.items.map((value, index): ReviewItem => {
      const item = (value ?? {}) as { label?: unknown; type?: unknown; required?: unknown }
      const label = line(item.label)
      if (label.length < 2 || label.length > 200 || (item.type !== 'rating' && item.type !== 'text')) throw new BadRequestException(REVIEW_ITEMS)
      return { key: `${key}i${index + 1}`, label, type: item.type, required: item.required !== false }
    })
    if ((section.weight as number) > 0 && !items.some((item) => item.type === 'rating')) throw new BadRequestException(REVIEW_ITEMS)
    return { key, title, kind, weight: section.weight as number, items }
  })
  if (sections.filter((section) => section.kind === 'GOALS').length > 1) throw new BadRequestException(REVIEW_SECTION)
  if (sections.reduce((sum, section) => sum + section.weight, 0) !== 100) throw new BadRequestException(REVIEW_SECTIONS)
  return sections
}

export function cleanCycleKind(raw: unknown): ReviewCycleKind {
  if (typeof raw !== 'string' || !(REVIEW_CYCLE_KINDS as readonly string[]).includes(raw)) throw new BadRequestException(REVIEW_KIND)
  return raw as ReviewCycleKind
}
const dateOf = (raw: unknown): string | null => {
  const text = typeof raw === 'string' ? raw.trim() : ''
  const time = /^\d{4}-\d{2}-\d{2}$/.test(text) ? Date.parse(`${text}T00:00:00Z`) : NaN
  return !Number.isNaN(time) && new Date(time).toISOString().slice(0, 10) === text ? text : null
}
export function cleanCycleDates(input: { periodStart?: unknown; periodEnd?: unknown; selfDueDate?: unknown; managerDueDate?: unknown }) {
  const periodStart = dateOf(input.periodStart), periodEnd = dateOf(input.periodEnd), selfDueDate = dateOf(input.selfDueDate), managerDueDate = dateOf(input.managerDueDate)
  if (!periodStart || !periodEnd || !selfDueDate || !managerDueDate || periodEnd < periodStart || managerDueDate < selfDueDate) throw new BadRequestException(REVIEW_DATES)
  return { periodStart, periodEnd, selfDueDate, managerDueDate }
}
/** جمهور الدورة: الوضع، وأرقام صحيحة مرتّبة من غير تكرار (فاضية مع «الشركة») */
export function cleanCycleAudience(rawMode: unknown, rawIds: unknown): { audienceMode: ReviewAudienceMode; ids: number[] } {
  if (typeof rawMode !== 'string' || !(REVIEW_AUDIENCE_MODES as readonly string[]).includes(rawMode)) throw new BadRequestException(REVIEW_AUDIENCE)
  const audienceMode = rawMode as ReviewAudienceMode
  if (audienceMode === 'COMPANY') return { audienceMode, ids: [] }
  if (!Array.isArray(rawIds) || rawIds.length < 1 || rawIds.length > 200 || rawIds.some((id) => !Number.isSafeInteger(id) || id < 1)) throw new BadRequestException(REVIEW_AUDIENCE)
  return { audienceMode, ids: [...new Set(rawIds as number[])].sort((a, b) => a - b) }
}

export const parseTemplate = (snapshot: string | null | undefined): ReviewTemplateShape | null => {
  try {
    const value = snapshot ? JSON.parse(snapshot) : null
    return value && Number.isSafeInteger(value.ratingMax) && Array.isArray(value.sections) ? (value as ReviewTemplateShape) : null
  } catch { return null }
}

/**
 * إجابات تقييم على نموذج الدورة المتجمّد وأهداف الموظف: كل بند مطلوب لازم يتجاوب؛ التقدير رقم صحيح من 1 لأعلى المقياس؛ النص لحد 2000 حرف؛
 * وكل هدف من أهداف الفترة لازم يتقدّر (لو النموذج فيه قسم أهداف). أي مفتاح مش في النموذج مرفوض.
 */
export function cleanAnswers(template: ReviewTemplateShape, raw: unknown, goals: ReviewGoalRef[]): ReviewAnswers {
  const bad = (): never => { throw new BadRequestException(REVIEW_ANSWERS) }
  const input = (raw && typeof raw === 'object' && !Array.isArray(raw) ? raw : bad()) as { sections?: unknown; goals?: unknown }
  const given = (input.sections && typeof input.sections === 'object' && !Array.isArray(input.sections) ? input.sections : {}) as Record<string, unknown>
  const rating = (value: unknown): number => (Number.isSafeInteger(value) && (value as number) >= 1 && (value as number) <= template.ratingMax ? (value as number) : bad())
  const text = (value: unknown): string => {
    const clean = typeof value === 'string' ? value.replace(/\r\n?/g, '\n').trim() : bad()
    return clean.length <= REVIEW_TEXT_MAX ? clean : bad()
  }
  const known = new Set(template.sections.filter((section) => section.kind !== 'GOALS').map((section) => section.key))
  if (Object.keys(given).some((key) => !known.has(key))) bad()
  const sections: ReviewAnswers['sections'] = {}
  for (const section of template.sections) {
    if (section.kind === 'GOALS') continue
    const answers = (given[section.key] && typeof given[section.key] === 'object' ? given[section.key] : {}) as Record<string, { rating?: unknown; text?: unknown } | undefined>
    if (Object.keys(answers).some((key) => !section.items.some((item) => item.key === key))) bad()
    sections[section.key] = {}
    for (const item of section.items) {
      const answer = answers[item.key]
      const value = item.type === 'rating' ? answer?.rating : answer?.text
      const empty = value === undefined || value === null || value === ''
      if (empty) { if (item.required) bad(); continue }
      sections[section.key][item.key] = item.type === 'rating' ? { rating: rating(value) } : { text: text(value) }
    }
  }
  const goalAnswers: ReviewAnswers['goals'] = {}
  const givenGoals = (input.goals && typeof input.goals === 'object' && !Array.isArray(input.goals) ? input.goals : {}) as Record<string, { rating?: unknown; comment?: unknown } | undefined>
  const hasGoals = template.sections.some((section) => section.kind === 'GOALS')
  if (Object.keys(givenGoals).some((key) => !hasGoals || !goals.some((goal) => String(goal.id) === key))) bad()
  if (hasGoals) {
    for (const goal of goals) {
      const answer = givenGoals[String(goal.id)]
      if (!answer) bad()
      const comment = answer!.comment === undefined || answer!.comment === null || answer!.comment === '' ? undefined : text(answer!.comment)
      goalAnswers[String(goal.id)] = { rating: rating(answer!.rating), ...(comment ? { comment } : {}) }
    }
  }
  return { sections, goals: goalAnswers }
}

/**
 * الدرجة الكلية من 100 بالأوزان: درجة القسم = متوسط تقديراته ÷ أعلى المقياس × 100 (قسم الأهداف: متوسط موزون بأوزان الأهداف، أو بالتساوي لو
 * مجموعها صفر). القسم اللي مافيهوش تقدير (أهداف من غير أهداف، أو بنود اختيارية كلها فاضية) بيخرج وأوزان الباقي بتتقسّم عليه. null = مفيش تقدير خالص.
 */
export function reviewScore(template: ReviewTemplateShape, answers: ReviewAnswers, goals: ReviewGoalRef[]): number | null {
  let weighted = 0, weights = 0
  for (const section of template.sections) {
    if (section.weight <= 0) continue
    let score: number | null = null
    if (section.kind === 'GOALS') {
      const rated = goals.filter((goal) => answers.goals[String(goal.id)])
      const total = rated.reduce((sum, goal) => sum + goal.weight, 0)
      if (rated.length) {
        score = total > 0 ? rated.reduce((sum, goal) => sum + answers.goals[String(goal.id)].rating * goal.weight, 0) / total
          : rated.reduce((sum, goal) => sum + answers.goals[String(goal.id)].rating, 0) / rated.length
      }
    } else {
      const ratings = section.items.filter((item) => item.type === 'rating').map((item) => answers.sections[section.key]?.[item.key]?.rating).filter((value): value is number => typeof value === 'number')
      if (ratings.length) score = ratings.reduce((sum, value) => sum + value, 0) / ratings.length
    }
    if (score === null) continue
    weighted += (score / template.ratingMax) * 100 * section.weight
    weights += section.weight
  }
  return weights > 0 ? Math.round((weighted / weights) * 100) / 100 : null
}
