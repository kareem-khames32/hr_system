import { Column, Entity, PrimaryGeneratedColumn, type EntityManager } from 'typeorm'

// B5.4 (أ): المهارات — مكتبة مهارات للشركة، والمهارات المطلوبة لكل وظيفة معتمدة بأقل مستوى، وتقييم مهارة الموظف بمصدره، وفجوته.
//  موديول `skills` (مقفول افتراضيًا). المستويات هي الأربعة القايمة في ملف الموظف. مهارة الموظف المتقيّمة صف في `employee_skills` القايم
//  (أعمدة الربط من ترحيل 157 برّه كيان ملف الموظف: القراءة والكتابة هنا بـSQL، فملف الموظف شغال قبل الترحيل).

export const SKILL_LEVELS = ['beginner', 'intermediate', 'advanced', 'expert'] as const
export type SkillLevel = (typeof SKILL_LEVELS)[number]
export const SKILL_LEVEL_LABELS: Record<SkillLevel, string> = { beginner: 'مبتدئ', intermediate: 'متوسط', advanced: 'متقدم', expert: 'خبير' }
export const SKILL_SOURCES = ['ASSESSMENT', 'CERTIFICATE'] as const
export type SkillSource = (typeof SKILL_SOURCES)[number]
export const SKILL_SOURCE_LABELS: Record<SkillSource, string> = { ASSESSMENT: 'تقييم', CERTIFICATE: 'شهادة' }
export const REQUIREMENTS_MAX = 40

export const SKILLS_MIGRATION_MISSING = 'جداول المهارات ناقصة — طبّق ترحيلات 155 و156 و157 (وترحيلات الوظائف المعتمدة) الأول'
export const SKILL_NOT_FOUND = 'المهارة مش موجودة'
export const POSITION_NOT_FOUND = 'الوظيفة المعتمدة مش موجودة'
export const EMPLOYEE_NOT_FOUND = 'الموظف غير موجود'

@Entity('skills')
export class Skill {
  @PrimaryGeneratedColumn({ primaryKeyConstraintName: 'PK_skills' })
  id: number

  @Column({ type: 'nvarchar', length: 120 })
  name: string

  @Column({ type: 'nvarchar', length: 80, nullable: true })
  category: string | null

  @Column({ type: 'nvarchar', length: 300, nullable: true })
  description: string | null

  @Column({ type: 'bit' })
  isActive: boolean

  @Column({ type: 'int' })
  updatedByUserId: number

  @Column({ type: 'datetime2' })
  updatedAt: Date
}

@Entity('position_skill_requirements')
export class PositionSkillRequirement {
  @PrimaryGeneratedColumn({ primaryKeyConstraintName: 'PK_position_skill_requirements' })
  id: number

  @Column({ type: 'int' })
  positionId: number

  @Column({ type: 'int' })
  skillId: number

  /** أقل مستوى مقبول للوظيفة */
  @Column({ type: 'nvarchar', length: 30 })
  requiredLevel: string

  @Column({ type: 'int' })
  updatedByUserId: number

  @Column({ type: 'datetime2' })
  updatedAt: Date
}

const cleanText = (value: unknown, max: number): string | null => {
  if (value === undefined || value === null) return ''
  if (typeof value !== 'string') return null
  const text = value.trim().replace(/\s+/g, ' ')
  return text.length > max ? null : text
}
const validYmd = (value: unknown): value is string => {
  if (typeof value !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(value)) return false
  const date = new Date(`${value}T00:00:00Z`)
  // شهر أو يوم برّه المدى = تاريخ مش صالح (toISOString بترمي عليه)
  return !Number.isNaN(date.getTime()) && date.toISOString().slice(0, 10) === value
}
export const isSkillLevel = (value: unknown): value is SkillLevel => (SKILL_LEVELS as readonly unknown[]).includes(value)
/** ترتيب المستوى: 1 مبتدئ … 4 خبير؛ صفر = من غير مستوى معروف */
export const levelRank = (value: unknown): number => (isSkillLevel(value) ? SKILL_LEVELS.indexOf(value) + 1 : 0)

export interface SkillFields { name: string; category: string | null; description: string | null; isActive: boolean }
/** مهارة في المكتبة: الاسم، وتصنيف ووصف اختياريين، والتفعيل */
export function skillFields(body: unknown): { fields: SkillFields | null; error: string | null } {
  const input = (body ?? {}) as Record<string, unknown>
  const name = cleanText(input.name, 120)
  if (!name || name.length < 2) return { fields: null, error: 'اسم المهارة من حرفين لحد 120 حرف' }
  const category = cleanText(input.category, 80)
  if (category === null) return { fields: null, error: 'التصنيف 80 حرف بالكتير' }
  const description = cleanText(input.description, 300)
  if (description === null) return { fields: null, error: 'الوصف 300 حرف بالكتير' }
  if (input.isActive !== undefined && typeof input.isActive !== 'boolean') return { fields: null, error: '«مفعّلة» نعم أو لا' }
  return { fields: { name, category: category || null, description: description || null, isActive: input.isActive !== false }, error: null }
}

export interface Requirement { skillId: number; level: SkillLevel }
/** المهارات المطلوبة لوظيفة: قايمة (مهارة، أقل مستوى) من غير تكرار مهارة */
export function requirementsOf(body: unknown): { requirements: Requirement[] | null; error: string | null } {
  const raw = ((body ?? {}) as Record<string, unknown>).requirements
  if (!Array.isArray(raw) || raw.length > REQUIREMENTS_MAX) return { requirements: null, error: `المهارات المطلوبة قايمة (لحد ${REQUIREMENTS_MAX} مهارة)` }
  const requirements: Requirement[] = []
  for (const item of raw as Array<Record<string, unknown> | null>) {
    const skillId = item?.skillId, level = item?.level
    if (typeof skillId !== 'number' || !Number.isSafeInteger(skillId) || skillId < 1 || !isSkillLevel(level)) return { requirements: null, error: 'كل مهارة مطلوبة: اختار المهارة والمستوى' }
    if (requirements.some((row) => row.skillId === skillId)) return { requirements: null, error: 'المهارة متكررة في متطلبات الوظيفة' }
    requirements.push({ skillId, level })
  }
  return { requirements, error: null }
}

export interface AssessmentFields { level: SkillLevel; source: SkillSource; validUntil: string | null }
/** تقييم مهارة موظف: المستوى، والمصدر (تقييم أو شهادة)، وصلاحية الشهادة (للشهادة بس، اختيارية) */
export function assessmentFields(body: unknown): { fields: AssessmentFields | null; error: string | null } {
  const input = (body ?? {}) as Record<string, unknown>
  if (!isSkillLevel(input.level)) return { fields: null, error: 'اختار المستوى: مبتدئ، متوسط، متقدم، أو خبير' }
  const source = input.source === undefined || input.source === null || input.source === '' ? 'ASSESSMENT' : input.source
  if (!(SKILL_SOURCES as readonly unknown[]).includes(source)) return { fields: null, error: 'المصدر «تقييم» أو «شهادة»' }
  let validUntil: string | null = null
  if (input.validUntil !== undefined && input.validUntil !== null && input.validUntil !== '') {
    if (source !== 'CERTIFICATE') return { fields: null, error: 'تاريخ الصلاحية للشهادة بس' }
    if (!validYmd(input.validUntil)) return { fields: null, error: 'تاريخ صلاحية الشهادة مش صحيح' }
    validUntil = input.validUntil
  }
  return { fields: { level: input.level, source: source as SkillSource, validUntil }, error: null }
}

export type GapStatus = 'MET' | 'BELOW' | 'MISSING' | 'EXPIRED'
export const GAP_LABELS: Record<GapStatus, string> = { MET: 'مستوفاة', BELOW: 'أقل من المطلوب', MISSING: 'مش متقيّمة', EXPIRED: 'شهادتها منتهية' }
export interface HeldSkill { level: string | null; source?: string | null; validUntil?: string | null }
/**
 * حكم مهارة مطلوبة على اللي عند الموظف: شهادة عدّى تاريخ صلاحيتها = منتهية (حتى لو مستواها كفاية)، مفيش صف أو من غير مستوى = مش متقيّمة،
 * مستوى أقل من المطلوب = أقل، وغير كده مستوفاة.
 */
export function gapOf(required: string, held: HeldSkill | null | undefined, today: string): GapStatus {
  if (!held || levelRank(held.level) === 0) return 'MISSING'
  if (held.validUntil && String(held.validUntil).slice(0, 10) < today) return 'EXPIRED'
  return levelRank(held.level) >= levelRank(required) ? 'MET' : 'BELOW'
}

let ready: boolean | null = null
/** جدولي ترحيلي 155 و156 وأعمدة ترحيل 157 (وجدولي الوظائف المعتمدة) موجودين؟ الموجود بيتحفظ؛ الناقص بيتفحص مع كل نداء لحد ما الترحيل يتطبق */
export async function skillsReady(em: EntityManager): Promise<boolean> {
  if (ready === true) return true
  const [row] = await em.query(`SELECT CASE WHEN OBJECT_ID(N'dbo.positions', N'U') IS NOT NULL AND OBJECT_ID(N'dbo.position_holders', N'U') IS NOT NULL AND OBJECT_ID(N'dbo.skills', N'U') IS NOT NULL AND OBJECT_ID(N'dbo.position_skill_requirements', N'U') IS NOT NULL
    AND COL_LENGTH(N'dbo.employee_skills', N'skillId') IS NOT NULL AND COL_LENGTH(N'dbo.employee_skills', N'source') IS NOT NULL AND COL_LENGTH(N'dbo.employee_skills', N'assessedByUserId') IS NOT NULL
    AND COL_LENGTH(N'dbo.employee_skills', N'assessedAt') IS NOT NULL AND COL_LENGTH(N'dbo.employee_skills', N'validUntil') IS NOT NULL THEN 1 ELSE 0 END AS [ready]`)
  ready = Number(row?.ready) === 1
  return ready
}
/** للاختبارات: نسيان حالة الترحيل */
export function resetSkillsCache() { ready = null }
