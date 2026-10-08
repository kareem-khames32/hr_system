import { Column, Entity, PrimaryGeneratedColumn, type EntityManager } from 'typeorm'
import { skillsReady } from './skills'

// B5.4 (ب): الإحلال — وظيفة معتمدة متعلّمة «حرجة»، ومرشحين خلفاء لها مرتّبين بدرجة جاهزية. بيانات سرّية: كلها ورا `succession.manage`،
//  ومفيش مسار بيعرضها للموظف نفسه. كل كتابة تحت قفل صف الوظيفة. جوه موديول `skills` (مقفول افتراضيًا).

export const READINESS = ['READY_NOW', 'ONE_TO_TWO', 'THREE_PLUS'] as const
export type Readiness = (typeof READINESS)[number]
export const READINESS_LABELS: Record<Readiness, string> = { READY_NOW: 'جاهز الآن', ONE_TO_TWO: 'خلال سنة لسنتين', THREE_PLUS: 'بعد 3 سنين أو أكتر' }
export const NOMINEES_MAX = 10
export const SUCCESSION_MIGRATION_MISSING = 'جداول الإحلال ناقصة — طبّق ترحيلي 158 و159 (وترحيلات المهارات) الأول'
export const NOMINATION_NOT_FOUND = 'الترشيح مش موجود'
export const HIDDEN_NOMINEE = 'مرشح خارج نطاقك'
// (ج) شبكة 9-box: ميزة فرعية مقفولة افتراضيًا. محور الأداء من آخر تقييم معلن (الدرجة من 100)، ومحور الإمكانات تقدير بيتسجّل هنا.
export const NINE_BOX_FEATURE = 'skills.nine_box'
export const NINE_BOX_MIGRATION_MISSING = 'جدول تقدير الإمكانات ناقص — طبّق ترحيل 160 الأول'
export const BANDS = ['LOW', 'MEDIUM', 'HIGH'] as const
export type Band = (typeof BANDS)[number]
export const BAND_LABELS: Record<Band, string> = { LOW: 'منخفض', MEDIUM: 'متوسط', HIGH: 'عالي' }
/** حدود محور الأداء من درجة التقييم (من 100): أقل من 60 منخفض، من 60 لأقل من 80 متوسط، 80 فأكتر عالي */
export const PERFORMANCE_MEDIUM_FROM = 60
export const PERFORMANCE_HIGH_FROM = 80

@Entity('critical_positions')
export class CriticalPosition {
  @PrimaryGeneratedColumn({ primaryKeyConstraintName: 'PK_critical_positions' })
  id: number

  /** الوظيفة المعتمدة — صف واحد للوظيفة */
  @Column({ type: 'int' })
  positionId: number

  @Column({ type: 'nvarchar', length: 300, nullable: true })
  reason: string | null

  @Column({ type: 'bit' })
  isActive: boolean

  @Column({ type: 'int' })
  updatedByUserId: number

  @Column({ type: 'datetime2' })
  updatedAt: Date
}

@Entity('succession_nominations')
export class SuccessionNomination {
  @PrimaryGeneratedColumn({ primaryKeyConstraintName: 'PK_succession_nominations' })
  id: number

  @Column({ type: 'int' })
  positionId: number

  @Column({ type: 'int' })
  employeeId: number

  /** ترتيب المرشح على الوظيفة (1 = الأول) */
  @Column({ type: 'int' })
  rank: number

  @Column({ type: 'nvarchar', length: 20 })
  readiness: string

  @Column({ type: 'nvarchar', length: 300, nullable: true })
  note: string | null

  /** ACTIVE ساري · REMOVED اتشال */
  @Column({ type: 'nvarchar', length: 20 })
  status: string

  @Column({ type: 'int' })
  nominatedByUserId: number

  @Column({ type: 'datetime2' })
  nominatedAt: Date

  @Column({ type: 'int', nullable: true })
  removedByUserId: number | null

  @Column({ type: 'datetime2', nullable: true })
  removedAt: Date | null
}

const cleanText = (value: unknown, max: number): string | null => {
  if (value === undefined || value === null) return ''
  if (typeof value !== 'string') return null
  const text = value.trim().replace(/\s+/g, ' ')
  return text.length > max ? null : text
}
export const isReadiness = (value: unknown): value is Readiness => (READINESS as readonly unknown[]).includes(value)

/** علامة «حرجة»: نعم أو لا، وسبب مطلوب عند التعليم */
export function criticalFields(body: unknown): { fields: { critical: boolean; reason: string | null } | null; error: string | null } {
  const input = (body ?? {}) as Record<string, unknown>
  if (typeof input.critical !== 'boolean') return { fields: null, error: '«حرجة» نعم أو لا' }
  const reason = cleanText(input.reason, 300)
  if (reason === null) return { fields: null, error: 'السبب 300 حرف بالكتير' }
  if (input.critical && reason.length < 2) return { fields: null, error: 'اكتب سبب اعتبار الوظيفة حرجة' }
  return { fields: { critical: input.critical, reason: reason || null }, error: null }
}

export interface NominationFields { employeeId: number; readiness: Readiness; note: string | null }
/** ترشيح جديد: الموظف، ودرجة الجاهزية، وملاحظة */
export function nominationFields(body: unknown): { fields: NominationFields | null; error: string | null } {
  const input = (body ?? {}) as Record<string, unknown>
  if (typeof input.employeeId !== 'number' || !Number.isSafeInteger(input.employeeId) || input.employeeId < 1) return { fields: null, error: 'اختار الموظف المرشح' }
  if (!isReadiness(input.readiness)) return { fields: null, error: 'اختار درجة الجاهزية' }
  const note = cleanText(input.note, 300)
  if (note === null) return { fields: null, error: 'الملاحظة 300 حرف بالكتير' }
  return { fields: { employeeId: input.employeeId, readiness: input.readiness, note: note || null }, error: null }
}

export interface NominationPatch { readiness: Readiness; note: string | null; rank: number | null }
/** تعديل ترشيح: الجاهزية والملاحظة، والترتيب اختياري (1 لحد الحد الأقصى) */
export function nominationPatch(body: unknown): { fields: NominationPatch | null; error: string | null } {
  const input = (body ?? {}) as Record<string, unknown>
  if (!isReadiness(input.readiness)) return { fields: null, error: 'اختار درجة الجاهزية' }
  const note = cleanText(input.note, 300)
  if (note === null) return { fields: null, error: 'الملاحظة 300 حرف بالكتير' }
  let rank: number | null = null
  if (input.rank !== undefined && input.rank !== null) {
    if (typeof input.rank !== 'number' || !Number.isInteger(input.rank) || input.rank < 1 || input.rank > NOMINEES_MAX) return { fields: null, error: `الترتيب رقم صحيح من 1 لحد ${NOMINEES_MAX}` }
    rank = input.rank
  }
  return { fields: { readiness: input.readiness, note: note || null, rank }, error: null }
}

let ready: boolean | null = null
/** جدولي ترحيلي 158 و159 موجودين (وجداول المهارات)؟ الموجود بيتحفظ؛ الناقص بيتفحص مع كل نداء لحد ما الترحيل يتطبق */
export async function successionReady(em: EntityManager): Promise<boolean> {
  if (ready === true) return true
  if (!(await skillsReady(em))) return false
  const [row] = await em.query(`SELECT CASE WHEN OBJECT_ID(N'dbo.critical_positions', N'U') IS NOT NULL AND OBJECT_ID(N'dbo.succession_nominations', N'U') IS NOT NULL THEN 1 ELSE 0 END AS [ready]`)
  ready = Number(row?.ready) === 1
  return ready
}
/** للاختبارات: نسيان حالة الترحيل */
export function resetSuccessionCache() { ready = null }

@Entity('talent_potentials')
export class TalentPotential {
  @PrimaryGeneratedColumn({ primaryKeyConstraintName: 'PK_talent_potentials' })
  id: number

  /** صف واحد للموظف */
  @Column({ type: 'int' })
  employeeId: number

  /** LOW / MEDIUM / HIGH */
  @Column({ type: 'nvarchar', length: 10 })
  potential: string

  @Column({ type: 'nvarchar', length: 300, nullable: true })
  note: string | null

  @Column({ type: 'int' })
  updatedByUserId: number

  @Column({ type: 'datetime2' })
  updatedAt: Date
}

export const isBand = (value: unknown): value is Band => (BANDS as readonly unknown[]).includes(value)
/** شريحة الأداء من درجة آخر تقييم معلن؛ من غير درجة = مفيش شريحة */
export function performanceBand(score: number | null | undefined): Band | null {
  if (score == null || !Number.isFinite(Number(score))) return null
  return Number(score) >= PERFORMANCE_HIGH_FROM ? 'HIGH' : Number(score) >= PERFORMANCE_MEDIUM_FROM ? 'MEDIUM' : 'LOW'
}
/** رقم الخانة في الشبكة (1..9): الصف بالإمكانات (العالي فوق) والعمود بالأداء؛ ناقص محور = من غير خانة */
export function boxOf(performance: Band | null, potential: Band | null): number | null {
  if (!performance || !potential) return null
  return BANDS.indexOf(potential) * 3 + BANDS.indexOf(performance) + 1
}
/** تقدير الإمكانات: الشريحة وملاحظة */
export function potentialFields(body: unknown): { fields: { potential: Band; note: string | null } | null; error: string | null } {
  const input = (body ?? {}) as Record<string, unknown>
  if (!isBand(input.potential)) return { fields: null, error: 'اختار تقدير الإمكانات: منخفض، متوسط، أو عالي' }
  const note = cleanText(input.note, 300)
  if (note === null) return { fields: null, error: 'الملاحظة 300 حرف بالكتير' }
  return { fields: { potential: input.potential, note: note || null }, error: null }
}

let potentialsReady: boolean | null = null
/** جدول ترحيل 160 موجود؟ */
export async function nineBoxReady(em: EntityManager): Promise<boolean> {
  if (potentialsReady === true) return true
  const [row] = await em.query(`SELECT CASE WHEN OBJECT_ID(N'dbo.talent_potentials', N'U') IS NOT NULL THEN 1 ELSE 0 END AS [ready]`)
  potentialsReady = Number(row?.ready) === 1
  return potentialsReady
}
/** للاختبارات: نسيان حالة الترحيل */
export function resetNineBoxCache() { potentialsReady = null }
