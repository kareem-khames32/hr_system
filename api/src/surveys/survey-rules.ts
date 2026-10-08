import { BadRequestException } from '@nestjs/common'
import { Column, Entity, PrimaryGeneratedColumn, type EntityManager } from 'typeorm'

// B3.13 (ترحيلات 129–131): الاستبيانات — الكيانات والقواعد. نفس الشكل في الترحيلات بالحرف (من غير افتراضي).
//  السرية الحقيقية للاستبيان المجهول: الرد مافيهوش موظف ولا حساب ولا ساعة (اليوم بس)، والدعوة مافيهاش رقم الرد — وعلامة «رد» على الدعوة
//  بتتكتب في معاملة لوحدها. والنتايج مابتظهرش لمجموعة أقل من الحد الأدنى، ولا بتتعرض مجموعات تخلّي مجموعة مخفية تتحسب بالطرح.

export const SURVEY_KINDS = ['SATISFACTION', 'ENPS', 'PULSE', 'ONBOARDING', 'EXIT', 'TRAINING', 'SERVICE'] as const
export type SurveyKind = (typeof SURVEY_KINDS)[number]
export type SurveyStatus = 'DRAFT' | 'OPEN' | 'CLOSED'
export const SURVEY_QUESTION_TYPES = ['rating', 'enps', 'choice', 'text'] as const
export type SurveyQuestionType = (typeof SURVEY_QUESTION_TYPES)[number]
export interface SurveyQuestion { key: string; label: string; type: SurveyQuestionType; required: boolean; options?: string[] }
export type SurveyAnswers = Record<string, number | string>

@Entity('surveys')
export class Survey {
  @PrimaryGeneratedColumn({ primaryKeyConstraintName: 'PK_surveys' })
  id: number

  @Column({ type: 'nvarchar', length: 200 })
  title: string

  @Column({ type: 'nvarchar', length: 20 })
  kind: SurveyKind

  // جمهور الاستبيان بصيغة جمهور الإعلانات؛ NULL = كل الشركة
  @Column({ type: 'nvarchar', length: 2000, nullable: true })
  audience: string | null

  @Column({ type: 'bit' })
  isAnonymous: boolean

  // أقل عدد ردود تتعرض له نتايج مجموعة
  @Column({ type: 'int' })
  minGroup: number

  @Column({ type: 'nvarchar', length: 'max' })
  questions: string

  @Column({ type: 'date', nullable: true })
  closeDate: string | null

  @Column({ type: 'nvarchar', length: 20 })
  status: SurveyStatus

  @Column({ type: 'int' })
  createdByUserId: number

  @Column({ type: 'datetime2' })
  createdAt: Date

  @Column({ type: 'datetime2', nullable: true })
  openedAt: Date | null

  @Column({ type: 'datetime2', nullable: true })
  closedAt: Date | null
}

@Entity('survey_invitations')
export class SurveyInvitation {
  @PrimaryGeneratedColumn({ primaryKeyConstraintName: 'PK_survey_invitations' })
  id: number

  @Column({ type: 'int' })
  surveyId: number

  @Column({ type: 'int' })
  employeeId: number

  // قسم الموظف وفرعه وقت فتح الاستبيان — مجموعته في النتايج
  @Column({ type: 'int', nullable: true })
  departmentId: number | null

  @Column({ type: 'int', nullable: true })
  branchId: number | null

  // يوم الرد بس — من غير ساعة ومن غير رقم الرد
  @Column({ type: 'date', nullable: true })
  respondedOn: string | null

  @Column({ type: 'datetime2' })
  createdAt: Date
}

@Entity('survey_responses')
export class SurveyResponse {
  @PrimaryGeneratedColumn({ primaryKeyConstraintName: 'PK_survey_responses' })
  id: number

  @Column({ type: 'int' })
  surveyId: number

  @Column({ type: 'int', nullable: true })
  departmentId: number | null

  @Column({ type: 'int', nullable: true })
  branchId: number | null

  // في الاستبيان المجهول فاضي دايمًا
  @Column({ type: 'int', nullable: true })
  employeeId: number | null

  @Column({ type: 'nvarchar', length: 'max' })
  answers: string

  // يوم الرد بس
  @Column({ type: 'date' })
  submittedOn: string
}

export const SURVEYS_PERMISSION = 'surveys.manage'
export const SURVEYS_MIGRATION_MISSING = 'الاستبيانات محتاجة ترحيلات 20261009_129 لـ20261009_131 على قاعدة البيانات'
export const SURVEY_NOT_FOUND = 'الاستبيان غير موجود'
export const SURVEY_TITLE = 'عنوان الاستبيان مطلوب (من 3 لـ200 حرف)'
export const SURVEY_KIND = 'نوع الاستبيان غير معروف'
export const SURVEY_MIN_GROUP = 'الحد الأدنى لعرض النتايج: من 3 لـ50'
export const SURVEY_QUESTIONS = 'الأسئلة: من 1 لـ30 — كل سؤال بنص (2–300 حرف) ونوع (تقدير 1–5، eNPS من 0 لـ10، اختيار من 2 لـ10 اختيارات، أو نص)'
export const SURVEY_CLOSE_DATE = 'آخر يوم للرد تاريخ صحيح مش فايت'
export const SURVEY_NOT_DRAFT = 'الاستبيان اتفتح: مابيتعدّلش — اقفله واعمل واحد جديد'
export const SURVEY_NOT_OPEN = 'الاستبيان مش مفتوح'
export const SURVEY_RESULTS_AFTER_CLOSE = 'النتايج بتتعرض بعد قفل الاستبيان — عرضها وهو مفتوح بيكشف رد اللي يرد بعد كده'
export const SURVEY_EMPTY_AUDIENCE = 'مفيش موظفين في جمهور الاستبيان'
export const SURVEY_ANSWERS = 'الإجابات ناقصة أو غير صالحة: كل سؤال مطلوب لازم يتجاوب بقيمة من نوعه'
export const SURVEY_ANSWERED = 'ردّك اتسجّل قبل كده'
export const SURVEY_BRANCH_AUDIENCE = 'حساب الفروع بيعمل استبيان لفروعه بس: اختار «فروع محددة» من فروعك في الجمهور'
export const SURVEY_MIN_GROUP_DEFAULT = 5
/** أقل عدد ردود تتعرض معاه التعليقات النصية (إعداد في requests_config)؛ الغايب أو الغلط = 10 */
export const SURVEY_COMMENT_MIN_KEY = 'surveys.comment_min'
export const SURVEY_COMMENT_MIN_DEFAULT = 10
export const SURVEY_KIND_LABELS: Record<SurveyKind, string> = { SATISFACTION: 'رضا', ENPS: 'eNPS', PULSE: 'نبض', ONBOARDING: 'تهيئة', EXIT: 'خروج', TRAINING: 'تقييم تدريب', SERVICE: 'رضا الخدمة' }
export const SURVEY_STATUS_LABELS: Record<SurveyStatus, string> = { DRAFT: 'مسودة', OPEN: 'مفتوح', CLOSED: 'مقفول' }

let ready: boolean | null = null
/** جداول ترحيلات 129–131 موجودة؟ الموجود بيتحفظ */
export async function surveysReady(em: EntityManager): Promise<boolean> {
  if (ready === true) return true
  const [row] = await em.query(`SELECT CASE WHEN OBJECT_ID(N'dbo.surveys', N'U') IS NOT NULL AND OBJECT_ID(N'dbo.survey_invitations', N'U') IS NOT NULL
    AND OBJECT_ID(N'dbo.survey_responses', N'U') IS NOT NULL THEN 1 ELSE 0 END AS [ready]`)
  ready = Number(row?.ready) === 1
  return ready
}
/** للاختبارات: نسيان حالة الترحيل */
export function resetSurveysCache() { ready = null }

const line = (raw: unknown): string => (typeof raw === 'string' ? raw.replace(/\s+/g, ' ').trim() : '')

export function cleanSurveyTitle(raw: unknown): string {
  const value = line(raw)
  if (value.length < 3 || value.length > 200) throw new BadRequestException(SURVEY_TITLE)
  return value
}
export function cleanSurveyKind(raw: unknown): SurveyKind {
  if (typeof raw !== 'string' || !(SURVEY_KINDS as readonly string[]).includes(raw)) throw new BadRequestException(SURVEY_KIND)
  return raw as SurveyKind
}
export function cleanMinGroup(raw: unknown): number {
  if (raw === undefined || raw === null) return SURVEY_MIN_GROUP_DEFAULT
  if (typeof raw !== 'number' || !Number.isInteger(raw) || raw < 3 || raw > 50) throw new BadRequestException(SURVEY_MIN_GROUP)
  return raw
}
/** الأسئلة: المفاتيح الخادم بيحطها (q1، q2…)، والاختيارات نصوص فريدة */
export function cleanSurveyQuestions(raw: unknown): SurveyQuestion[] {
  if (!Array.isArray(raw) || raw.length < 1 || raw.length > 30) throw new BadRequestException(SURVEY_QUESTIONS)
  return raw.map((entry, index) => {
    const item = entry as { label?: unknown; type?: unknown; required?: unknown; options?: unknown }
    const label = line(item?.label)
    if (!entry || typeof entry !== 'object' || label.length < 2 || label.length > 300 || typeof item.type !== 'string' || !(SURVEY_QUESTION_TYPES as readonly string[]).includes(item.type)) throw new BadRequestException(SURVEY_QUESTIONS)
    const question: SurveyQuestion = { key: `q${index + 1}`, label, type: item.type as SurveyQuestionType, required: item.required !== false }
    if (question.type === 'choice') {
      const options = Array.isArray(item.options) ? [...new Set(item.options.map(line).filter(Boolean))] : []
      if (options.length < 2 || options.length > 10 || options.some((option) => option.length > 100)) throw new BadRequestException(SURVEY_QUESTIONS)
      question.options = options
    }
    return question
  })
}
export const parseSurveyQuestions = (text: string | null | undefined): SurveyQuestion[] => { try { const value = JSON.parse(text || '[]'); return Array.isArray(value) ? (value as SurveyQuestion[]) : [] } catch { return [] } }

/** إجابات على أسئلة الاستبيان: كل مطلوب متجاوب، وكل قيمة من نوع سؤالها، ومفيش مفتاح برّه الأسئلة */
export function cleanSurveyAnswers(questions: SurveyQuestion[], raw: unknown): SurveyAnswers {
  if (!raw || typeof raw !== 'object' || Array.isArray(raw)) throw new BadRequestException(SURVEY_ANSWERS)
  const input = raw as Record<string, unknown>, keys = new Set(questions.map((question) => question.key)), out: SurveyAnswers = {}
  if (Object.keys(input).some((key) => !keys.has(key))) throw new BadRequestException(SURVEY_ANSWERS)
  for (const question of questions) {
    const value = input[question.key]
    const empty = value === undefined || value === null || value === ''
    if (empty) { if (question.required) throw new BadRequestException(SURVEY_ANSWERS); continue }
    if (question.type === 'rating' || question.type === 'enps') {
      const [min, max] = question.type === 'rating' ? [1, 5] : [0, 10]
      if (typeof value !== 'number' || !Number.isInteger(value) || value < min || value > max) throw new BadRequestException(SURVEY_ANSWERS)
      out[question.key] = value
    } else if (question.type === 'choice') {
      if (typeof value !== 'string' || !(question.options ?? []).includes(value)) throw new BadRequestException(SURVEY_ANSWERS)
      out[question.key] = value
    } else {
      const text = typeof value === 'string' ? value.replace(/\r\n?/g, '\n').trim() : ''
      if (typeof value !== 'string' || text.length > 2000) throw new BadRequestException(SURVEY_ANSWERS)
      if (!text) { if (question.required) throw new BadRequestException(SURVEY_ANSWERS); continue }
      out[question.key] = text
    }
  }
  return out
}

export function commentMin(raw: string | null | undefined): number {
  const value = Number(raw)
  return Number.isInteger(value) && value >= 3 && value <= 100 ? value : SURVEY_COMMENT_MIN_DEFAULT
}

/** eNPS: نسبة المروّجين (9–10) ناقص نسبة المنتقدين (0–6)، مقرّبة لرقم صحيح */
export function enpsScore(values: number[]): number | null {
  if (!values.length) return null
  const promoters = values.filter((value) => value >= 9).length, detractors = values.filter((value) => value <= 6).length
  return Math.round(((promoters - detractors) / values.length) * 100)
}

/** ملخص إجابات مجموعة لكل سؤال: المتوسط والتوزيع (تقدير)، الدرجة (eNPS)، العدّ (اختيار). التعليقات النصية مش هنا */
/**
 * ملخص إجابات مجموعة. Codex P3K-B13: الحد الأدنى على إجابات **كل سؤال**: سؤال (اختياري) جاوب عليه أقل من الحد مابيتعرضش له لا متوسط ولا
 * توزيع ولا عدد (`hidden`) — عدد الردود الكلي مش كفاية.
 */
export function summarize(questions: SurveyQuestion[], answers: SurveyAnswers[], minGroup: number) {
  return questions.filter((question) => question.type !== 'text').map((question) => {
    const values = answers.map((entry) => entry[question.key]).filter((value) => value !== undefined)
    if (values.length < minGroup) return { key: question.key, label: question.label, type: question.type, hidden: true as const }
    if (question.type === 'choice') {
      return { key: question.key, label: question.label, type: question.type, answered: values.length, counts: (question.options ?? []).map((option) => ({ option, count: values.filter((value) => value === option).length })) }
    }
    const numbers = values.filter((value): value is number => typeof value === 'number')
    const average = numbers.length ? Math.round((numbers.reduce((sum, value) => sum + value, 0) / numbers.length) * 100) / 100 : null
    return { key: question.key, label: question.label, type: question.type, answered: numbers.length, average, ...(question.type === 'enps' ? { enps: enpsScore(numbers) } : {}) }
  })
}

/**
 * المجموعات اللي نتايجها تتعرض: اللي ردودها وصلت الحد الأدنى — وبعدها، لو مجموع ردود المجموعات المخفية أقل من الحد (يعني تتحسب بطرح
 * المعروض من الإجمالي)، بتتخفى أصغر مجموعة معروضة كمان، وهكذا لحد ما المخفي يبقى مجموعه فوق الحد أو مايفضلش حاجة معروضة.
 */
export function visibleGroups(counts: Array<{ key: number; count: number }>, minGroup: number): number[] {
  const filled = counts.filter((row) => row.count > 0)
  const shown = filled.filter((row) => row.count >= minGroup).sort((left, right) => left.count - right.count || left.key - right.key)
  let hidden = filled.filter((row) => row.count < minGroup).reduce((sum, row) => sum + row.count, 0)
  while (hidden > 0 && hidden < minGroup && shown.length) hidden += shown.shift()!.count
  return shown.map((row) => row.key).sort((left, right) => left - right)
}
