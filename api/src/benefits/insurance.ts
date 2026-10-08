import { Column, Entity, PrimaryGeneratedColumn, type EntityManager } from 'typeorm'

// B5.2 (أ): التأمين الطبي — الوثيقة وفئاتها وأهلية الفئة بالدرجة. بيانات تعريفية: مفيش مبلغ بيتخصم من هنا
// («حصة الموظف» رقم على الفئة للعلم). الوثيقة لدولة (مصر/السعودية) أو لكل الشركة؛ والموظف بياخد وثيقة دولة فرعه الحالي.

@Entity('insurance_policies')
export class InsurancePolicy {
  @PrimaryGeneratedColumn({ primaryKeyConstraintName: 'PK_insurance_policies' })
  id: number

  @Column({ type: 'nvarchar', length: 150 })
  name: string

  @Column({ type: 'nvarchar', length: 150 })
  insurerName: string

  @Column({ type: 'nvarchar', length: 60, nullable: true })
  policyNumber: string | null

  /** EG أو SA، أو فاضي = لكل الشركة */
  @Column({ type: 'nvarchar', length: 2, nullable: true })
  country: string | null

  @Column({ type: 'date' })
  startDate: string

  @Column({ type: 'date' })
  endDate: string

  @Column({ type: 'bit' })
  isActive: boolean

  @Column({ type: 'nvarchar', length: 500, nullable: true })
  note: string | null

  @Column({ type: 'int' })
  createdByUserId: number

  @Column({ type: 'datetime2' })
  createdAt: Date

  @Column({ type: 'int', nullable: true })
  updatedByUserId: number | null

  @Column({ type: 'datetime2', nullable: true })
  updatedAt: Date | null
}

@Entity('insurance_classes')
export class InsuranceClass {
  @PrimaryGeneratedColumn({ primaryKeyConstraintName: 'PK_insurance_classes' })
  id: number

  @Column({ type: 'int' })
  policyId: number

  @Column({ type: 'nvarchar', length: 60 })
  name: string

  /** حصة الموظف الشهرية في القسط، بعملة فرعه — بيان على الفئة؛ الخصم نفسه في الجزء (ج) ورا إعداد */
  @Column({ type: 'decimal', precision: 12, scale: 2 })
  employeeShareMonthly: number

  /** فئة اللي درجته مش مربوطة بفئة (واحدة بالكتير في الوثيقة) */
  @Column({ type: 'bit' })
  isDefault: boolean

  @Column({ type: 'bit' })
  isActive: boolean

  @Column({ type: 'int', nullable: true })
  updatedByUserId: number | null

  @Column({ type: 'datetime2', nullable: true })
  updatedAt: Date | null
}

@Entity('insurance_class_grades')
export class InsuranceClassGrade {
  @PrimaryGeneratedColumn({ primaryKeyConstraintName: 'PK_insurance_class_grades' })
  id: number

  @Column({ type: 'int' })
  classId: number

  @Column({ type: 'int' })
  gradeId: number
}

// ===== القواعد (حساب نقي) =====

export const POLICY_COUNTRIES = ['EG', 'SA'] as const
export const POLICY_EXPIRY_SOON_DAYS = 60
export type PolicyState = 'UPCOMING' | 'ACTIVE' | 'EXPIRING' | 'EXPIRED' | 'DISABLED'
export const POLICY_STATE_LABELS: Record<PolicyState, string> = { UPCOMING: 'لسه مابدأتش', ACTIVE: 'سارية', EXPIRING: 'هتنتهي قريب', EXPIRED: 'انتهت', DISABLED: 'متعطّلة' }
const DAY = /^\d{4}-(0[1-9]|1[0-2])-(0[1-9]|[12]\d|3[01])$/
const realDay = (value: unknown): value is string => {
  if (typeof value !== 'string' || !DAY.test(value)) return false
  const date = new Date(`${value}T00:00:00Z`)
  // شهر أو يوم برّه المدى = تاريخ مش صالح (toISOString بترمي عليه)
  return !Number.isNaN(date.getTime()) && date.toISOString().slice(0, 10) === value
}
const daysBetween = (from: string, to: string) => Math.round((Date.parse(`${to}T00:00:00Z`) - Date.parse(`${from}T00:00:00Z`)) / 86400000)
const day = (value: unknown) => String(value ?? '').slice(0, 10)

/** حالة الوثيقة يوم today */
export function policyState(policy: { startDate: unknown; endDate: unknown; isActive: unknown }, today: string): { state: PolicyState; daysLeft: number | null } {
  const start = day(policy.startDate), end = day(policy.endDate)
  if (!(policy.isActive === true || policy.isActive === 1)) return { state: 'DISABLED', daysLeft: null }
  if (today < start) return { state: 'UPCOMING', daysLeft: null }
  if (today > end) return { state: 'EXPIRED', daysLeft: daysBetween(today, end) }
  const daysLeft = daysBetween(today, end)
  return { state: daysLeft <= POLICY_EXPIRY_SOON_DAYS ? 'EXPIRING' : 'ACTIVE', daysLeft }
}
/** الوثيقة بتغطي يوم today؟ (مفعّلة وجوه مدتها) */
export const policyCovers = (policy: { startDate: unknown; endDate: unknown; isActive: unknown }, today: string) => ['ACTIVE', 'EXPIRING'].includes(policyState(policy, today).state)

export interface PolicyFields { name: string; insurerName: string; policyNumber: string | null; country: string | null; startDate: string; endDate: string; note: string | null }
const text = (raw: unknown, max: number): string | null | undefined => {
  if (raw === undefined || raw === null) return null
  if (typeof raw !== 'string') return undefined
  const value = raw.trim()
  return value.length > max ? undefined : value || null
}
export function policyFields(body: unknown): { fields: PolicyFields | null; error: string | null } {
  const input = (body ?? {}) as Record<string, unknown>
  const name = text(input.name, 150), insurerName = text(input.insurerName, 150), policyNumber = text(input.policyNumber, 60), note = text(input.note, 500)
  if (!name) return { fields: null, error: 'اسم الوثيقة مطلوب (150 حرف بالكتير)' }
  if (!insurerName) return { fields: null, error: 'اسم شركة التأمين مطلوب (150 حرف بالكتير)' }
  if (policyNumber === undefined) return { fields: null, error: 'رقم الوثيقة 60 حرف بالكتير' }
  if (note === undefined) return { fields: null, error: 'الملاحظة 500 حرف بالكتير' }
  const country = input.country === undefined || input.country === null || input.country === '' ? null : input.country
  if (country !== null && !(POLICY_COUNTRIES as readonly unknown[]).includes(country)) return { fields: null, error: 'دولة الوثيقة مصر أو السعودية، أو فاضية لكل الشركة' }
  if (!realDay(input.startDate) || !realDay(input.endDate)) return { fields: null, error: 'تاريخ بداية ونهاية الوثيقة مطلوبين بصيغة YYYY-MM-DD' }
  if (input.endDate < input.startDate) return { fields: null, error: 'نهاية الوثيقة قبل بدايتها' }
  return { fields: { name, insurerName, policyNumber, country: country as string | null, startDate: input.startDate, endDate: input.endDate, note }, error: null }
}

export const CLASS_SHARE_MAX = 99999.99
export interface ClassFields { name: string; employeeShareMonthly: number; isDefault: boolean; gradeIds: number[] }
export function classFields(body: unknown): { fields: ClassFields | null; error: string | null } {
  const input = (body ?? {}) as Record<string, unknown>
  const name = text(input.name, 60)
  if (!name) return { fields: null, error: 'اسم الفئة مطلوب (60 حرف بالكتير)' }
  const share = input.employeeShareMonthly === undefined || input.employeeShareMonthly === null ? 0 : input.employeeShareMonthly
  if (typeof share !== 'number' || !Number.isFinite(share) || share < 0 || share > CLASS_SHARE_MAX || Math.abs(share * 100 - Math.round(share * 100)) > 1e-7) {
    return { fields: null, error: 'حصة الموظف الشهرية رقم من صفر بمنزلتين عشريتين بالكتير' }
  }
  if (input.isDefault !== undefined && typeof input.isDefault !== 'boolean') return { fields: null, error: '«الفئة الافتراضية» نعم أو لا' }
  const gradeIds = input.gradeIds === undefined || input.gradeIds === null ? [] : input.gradeIds
  if (!Array.isArray(gradeIds) || gradeIds.some(id => !Number.isSafeInteger(id) || (id as number) < 1)) return { fields: null, error: 'درجات الفئة قايمة أرقام درجات' }
  return { fields: { name, employeeShareMonthly: Math.round(share * 100) / 100, isDefault: input.isDefault === true, gradeIds: [...new Set(gradeIds as number[])].sort((a, b) => a - b) }, error: null }
}

export interface EligibilityClass { id: number; policyId: number; name: string; isDefault: boolean; isActive: boolean; gradeIds: readonly number[] }
export interface EligibilityPolicy { id: number; name: string; country: string | null; startDate: unknown; endDate: unknown; isActive: unknown }
/**
 * وثيقة الموظف وفئته يوم today: الوثيقة السارية لدولة فرعه (ولو مفيش، السارية لكل الشركة)؛ والفئة المفعّلة المربوطة بدرجته، وإلا الافتراضية،
 * وإلا من غير فئة. أكتر من وثيقة سارية لنفس الدولة = الأحدث بداية (ثم الأكبر رقمًا).
 */
export function eligibleCoverage(employee: { country: string | null | undefined; gradeId: number | null | undefined }, policies: readonly EligibilityPolicy[], classes: readonly EligibilityClass[], today: string):
  { policy: EligibilityPolicy; insuranceClass: EligibilityClass | null; by: 'GRADE' | 'DEFAULT' | null } | null {
  const country = String(employee.country ?? '').trim().toUpperCase() || null
  const live = policies.filter(policy => policyCovers(policy, today))
  const newest = (rows: EligibilityPolicy[]) => [...rows].sort((a, b) => day(b.startDate).localeCompare(day(a.startDate)) || b.id - a.id)[0] ?? null
  const policy = newest(live.filter(row => row.country !== null && row.country === country)) ?? newest(live.filter(row => row.country === null))
  if (!policy) return null
  const own = classes.filter(row => row.policyId === policy.id && row.isActive)
  const byGrade = employee.gradeId == null ? null : own.find(row => row.gradeIds.includes(Number(employee.gradeId))) ?? null
  if (byGrade) return { policy, insuranceClass: byGrade, by: 'GRADE' }
  const fallback = own.find(row => row.isDefault) ?? null
  return { policy, insuranceClass: fallback, by: fallback ? 'DEFAULT' : null }
}

// ===== جاهزية الترحيل =====

let ready: boolean | null = null
/** جداول ترحيلات 143–145 موجودة؟ الموجود بيتحفظ؛ الناقص بيتفحص مع كل نداء لحد ما الترحيل يتطبق */
export async function insuranceReady(em: EntityManager): Promise<boolean> {
  if (ready === true) return true
  const [row] = await em.query(`SELECT CASE WHEN OBJECT_ID(N'dbo.insurance_policies', N'U') IS NOT NULL AND OBJECT_ID(N'dbo.insurance_classes', N'U') IS NOT NULL
    AND OBJECT_ID(N'dbo.insurance_class_grades', N'U') IS NOT NULL THEN 1 ELSE 0 END AS [ready]`)
  ready = Number(row?.ready) === 1
  return ready
}
/** للاختبارات: نسيان حالة الترحيل */
export function resetInsuranceCache() { ready = null }
