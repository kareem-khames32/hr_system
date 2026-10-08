import { Column, Entity, PrimaryGeneratedColumn, type EntityManager } from 'typeorm'

// B5.6: بصمة الموبايل — مواقع بصمة بنطاق جغرافي لكل فرع، والحكم على الخادم (وقت الخادم، حد دقة، مسافة لأقرب موقع)، وتسجيل كل محاولة.
//  ميزة فرعية `attendance.mobile_punch` (مقفولة افتراضيًا). البصمة المقبولة بتدخل من `AttendanceService.ingest` القايم — هنا القواعد والقراءات بس.

export const MOBILE_PUNCH_FEATURE = 'attendance.mobile_punch'
export const MOBILE_PUNCH_MIGRATION_MISSING = 'جداول بصمة الموبايل ناقصة — طبّق ترحيلي 167 و168 الأول'
export const SITE_NOT_FOUND = 'موقع البصمة مش موجود'
/** أسوأ دقة مقبولة للموقع بالمتر */
export const ACCURACY_LIMIT_METERS = 100
/** أقل مهلة بين بصمتين مقبولتين لنفس الموظف */
export const MIN_GAP_SECONDS = 60
export const MOBILE_DEVICE_PREFIX = 'MOBILE-'
export const OUTCOMES = ['ACCEPTED', 'OUT_OF_RANGE', 'LOW_ACCURACY', 'NO_SITE'] as const
export type Outcome = (typeof OUTCOMES)[number]
export const OUTCOME_LABELS: Record<Outcome, string> = { ACCEPTED: 'اتسجّلت', OUT_OF_RANGE: 'برّه نطاق الموقع', LOW_ACCURACY: 'دقة الموقع ضعيفة', NO_SITE: 'مفيش موقع بصمة للفرع' }
export const OUTCOME_MESSAGES: Record<Exclude<Outcome, 'ACCEPTED'>, string> = {
  OUT_OF_RANGE: 'إنت برّه نطاق موقع البصمة — قرّب من الموقع وجرّب تاني',
  LOW_ACCURACY: `دقة تحديد موقعك ضعيفة (المطلوب ${ACCURACY_LIMIT_METERS} متر أو أدق) — افتح تحديد الموقع الدقيق وجرّب تاني`,
  NO_SITE: 'مفيش موقع بصمة متعرّف لفرعك — راجع الموارد البشرية',
}

@Entity('punch_sites')
export class PunchSite {
  @PrimaryGeneratedColumn({ primaryKeyConstraintName: 'PK_punch_sites' })
  id: number

  @Column({ type: 'nvarchar', length: 120 })
  name: string

  @Column({ type: 'int' })
  branchId: number

  @Column({ type: 'decimal', precision: 9, scale: 6 })
  latitude: number

  @Column({ type: 'decimal', precision: 9, scale: 6 })
  longitude: number

  @Column({ type: 'int' })
  radiusMeters: number

  @Column({ type: 'bit' })
  isActive: boolean

  @Column({ type: 'int' })
  updatedByUserId: number

  @Column({ type: 'datetime2' })
  updatedAt: Date
}

@Entity('mobile_punch_attempts')
export class MobilePunchAttempt {
  @PrimaryGeneratedColumn({ primaryKeyConstraintName: 'PK_mobile_punch_attempts' })
  id: number

  @Column({ type: 'int' })
  employeeId: number

  /** أقرب موقع اتحكم عليه (null = مفيش مواقع للفرع) */
  @Column({ type: 'int', nullable: true })
  siteId: number | null

  @Column({ type: 'decimal', precision: 9, scale: 6 })
  latitude: number

  @Column({ type: 'decimal', precision: 9, scale: 6 })
  longitude: number

  @Column({ type: 'int' })
  accuracyMeters: number

  @Column({ type: 'int', nullable: true })
  distanceMeters: number | null

  /** ACCEPTED اتسجّلت بصمة · OUT_OF_RANGE · LOW_ACCURACY · NO_SITE */
  @Column({ type: 'nvarchar', length: 20 })
  outcome: string

  /** وقت الخادم */
  @Column({ type: 'datetime2' })
  createdAt: Date
}

const positiveId = (value: unknown): value is number => typeof value === 'number' && Number.isSafeInteger(value) && value > 0
const coordinate = (value: unknown, limit: number): number | null =>
  typeof value === 'number' && Number.isFinite(value) && Math.abs(value) <= limit ? Math.round(value * 1e6) / 1e6 : null

export interface SiteFields { name: string; branchId: number; latitude: number; longitude: number; radiusMeters: number; isActive: boolean }
/** موقع بصمة: اسم، فرع، إحداثيات، ونصف قطر من 20 لحد 5000 متر */
export function siteFields(body: unknown): { fields: SiteFields | null; error: string | null } {
  const input = (body ?? {}) as Record<string, unknown>
  const name = typeof input.name === 'string' ? input.name.trim().replace(/\s+/g, ' ') : ''
  if (name.length < 2 || name.length > 120) return { fields: null, error: 'اسم الموقع من حرفين لحد 120 حرف' }
  if (!positiveId(input.branchId)) return { fields: null, error: 'اختار الفرع' }
  const latitude = coordinate(input.latitude, 90), longitude = coordinate(input.longitude, 180)
  if (latitude === null || longitude === null) return { fields: null, error: 'الإحداثيات مش صحيحة (خط العرض من -90 لـ90، والطول من -180 لـ180)' }
  if (typeof input.radiusMeters !== 'number' || !Number.isInteger(input.radiusMeters) || input.radiusMeters < 20 || input.radiusMeters > 5000) return { fields: null, error: 'نصف القطر رقم صحيح من 20 لحد 5000 متر' }
  if (input.isActive !== undefined && typeof input.isActive !== 'boolean') return { fields: null, error: '«مفعّل» نعم أو لا' }
  return { fields: { name, branchId: input.branchId, latitude, longitude, radiusMeters: input.radiusMeters, isActive: input.isActive !== false }, error: null }
}

export interface Position { latitude: number; longitude: number; accuracyMeters: number }
/** موقع الموظف من المتصفح: إحداثيات ودقة موجبة — من غيرهم مفيش حكم */
export function positionFields(body: unknown): { fields: Position | null; error: string | null } {
  const input = (body ?? {}) as Record<string, unknown>
  const latitude = coordinate(input.latitude, 90), longitude = coordinate(input.longitude, 180)
  if (latitude === null || longitude === null) return { fields: null, error: 'موقعك مااتحددش — اسمح للمتصفح بتحديد الموقع وجرّب تاني' }
  if (typeof input.accuracy !== 'number' || !Number.isFinite(input.accuracy) || input.accuracy <= 0 || input.accuracy > 1_000_000) return { fields: null, error: 'دقة الموقع مش معروفة — جرّب تاني' }
  return { fields: { latitude, longitude, accuracyMeters: Math.ceil(input.accuracy) }, error: null }
}

/** المسافة بالمتر بين نقطتين (haversine) */
export function distanceMeters(a: { latitude: number; longitude: number }, b: { latitude: number; longitude: number }): number {
  const rad = (degrees: number) => (degrees * Math.PI) / 180
  const dLat = rad(Number(b.latitude) - Number(a.latitude)), dLng = rad(Number(b.longitude) - Number(a.longitude))
  const h = Math.sin(dLat / 2) ** 2 + Math.cos(rad(Number(a.latitude))) * Math.cos(rad(Number(b.latitude))) * Math.sin(dLng / 2) ** 2
  return Math.round(6371000 * 2 * Math.asin(Math.min(1, Math.sqrt(h))))
}

type SiteArea = Pick<PunchSite, 'id' | 'name' | 'latitude' | 'longitude' | 'radiusMeters'>
/**
 * حكم الموقع على مواقع فرع الموظف المفعّلة: مفيش مواقع = مرفوض؛ دقة أسوأ من الحد = مرفوض (حتى لو النقطة جوه)؛ وإلا المسافة لأقرب موقع
 * لازم تكون جوه نصف قطره.
 */
export function judgePosition<T extends SiteArea>(position: Position, sites: readonly T[]): { outcome: Outcome; site: T | null; distance: number | null } {
  if (!sites.length) return { outcome: 'NO_SITE', site: null, distance: null }
  let site = sites[0], distance = distanceMeters(position, sites[0])
  for (const other of sites.slice(1)) {
    const far = distanceMeters(position, other)
    if (far < distance) { site = other; distance = far }
  }
  if (position.accuracyMeters > ACCURACY_LIMIT_METERS) return { outcome: 'LOW_ACCURACY', site, distance }
  return { outcome: distance <= Number(site.radiusMeters) ? 'ACCEPTED' : 'OUT_OF_RANGE', site, distance }
}

let ready: boolean | null = null
/** جدولي ترحيلي 167 و168 موجودين؟ */
export async function mobilePunchReady(em: EntityManager): Promise<boolean> {
  if (ready === true) return true
  const [row] = await em.query(`SELECT CASE WHEN OBJECT_ID(N'dbo.punch_sites', N'U') IS NOT NULL AND OBJECT_ID(N'dbo.mobile_punch_attempts', N'U') IS NOT NULL THEN 1 ELSE 0 END AS [ready]`)
  ready = Number(row?.ready) === 1
  return ready
}
/** للاختبارات: نسيان حالة الترحيل */
export function resetMobilePunchCache() { ready = null }
