import { BadRequestException } from '@nestjs/common'
import { Column, Entity, PrimaryGeneratedColumn, type EntityManager } from 'typeorm'
import { branchCountryOf, branchCurrency, type BranchCountry, type BranchCurrency } from './branch-currency'

// B4.1: الكيان القانوني الأدنى — الكيان وقواعده وقرّاءه. الكيان له دولة، وعملته عملة دولته دايمًا (خريطة B1.1 نفسها — مش خانة حرة)،
// والفرع بيتربط بكيان دولته بس: فعملة الفرع من كيانه = عملته من دولته، ومفيش علامة عملة بتتغيّر لوحدها. الكود شغال قبل ترحيلي 133 و134.

@Entity('legal_entities')
export class LegalEntity {
  @PrimaryGeneratedColumn({ primaryKeyConstraintName: 'PK_legal_entities' })
  id: number

  @Column({ type: 'nvarchar', length: 200 })
  name: string

  @Column({ type: 'nvarchar', length: 200, nullable: true })
  nameEn: string | null

  // EG / SA — مابتتغيّرش بعد الإنشاء
  @Column({ type: 'nvarchar', length: 5 })
  country: BranchCountry

  // عملة الدولة (EGP / SAR)
  @Column({ type: 'nvarchar', length: 3 })
  currency: BranchCurrency

  // منطقة IANA؛ الفاضي = منطقة الخادم
  @Column({ type: 'nvarchar', length: 64, nullable: true })
  timeZone: string | null

  @Column({ type: 'nvarchar', length: 100, nullable: true })
  commercialRegister: string | null

  @Column({ type: 'nvarchar', length: 100, nullable: true })
  taxNumber: string | null

  // رقم منشأة التأمينات (GOSI للسعودية، التأمينات المصرية لمصر)
  @Column({ type: 'nvarchar', length: 100, nullable: true })
  insuranceNumber: string | null

  @Column({ type: 'nvarchar', length: 100, nullable: true })
  qiwaNumber: string | null

  @Column({ type: 'nvarchar', length: 200, nullable: true })
  payrollBankName: string | null

  @Column({ type: 'nvarchar', length: 40, nullable: true })
  payrollIban: string | null

  @Column({ type: 'nvarchar', length: 100, nullable: true })
  wpsNumber: string | null

  // يوم بداية دورة الرواتب؛ الفاضي = الإعداد العام (لسه مابيتقريش — حد معلن في B4.1)
  @Column({ type: 'int', nullable: true })
  cycleStartDay: number | null

  @Column({ type: 'bit' })
  isActive: boolean

  @Column({ type: 'datetime2' })
  createdAt: Date
}

export const LEGAL_ENTITIES_MIGRATION_MISSING = 'الكيانات القانونية محتاجة ترحيلي 20261009_133 و20261009_134 على قاعدة البيانات'
export const LEGAL_ENTITY_NOT_FOUND = 'الكيان القانوني غير موجود'
export const LEGAL_ENTITY_BRANCH = 'الفرع غير موجود'
export const LEGAL_ENTITY_NAME = 'اسم الكيان مطلوب (من 2 لـ200 حرف)'
export const LEGAL_ENTITY_NAME_EN = 'اسم الكيان بالإنجليزي 200 حرف بالكتير'
export const LEGAL_ENTITY_COUNTRY = 'دولة الكيان: مصر (EG) أو السعودية (SA)'
export const LEGAL_ENTITY_COUNTRY_FIXED = 'دولة الكيان مابتتغيّرش — اعمل كيان جديد للدولة التانية'
export const LEGAL_ENTITY_TIME_ZONE = 'المنطقة الزمنية غير معروفة (مثال: Africa/Cairo أو Asia/Riyadh)'
export const LEGAL_ENTITY_TEXT = 'أرقام التسجيل 100 حرف بالكتير، واسم البنك 200'
export const LEGAL_ENTITY_IBAN = 'آيبان بنك الرواتب لازم يكون آيبان دولة الكيان: SA + 22 رقم، أو EG + 27 رقم'
export const LEGAL_ENTITY_CYCLE_DAY = 'يوم بداية الدورة من 1 لـ28'
export const LEGAL_ENTITY_ACTIVE = '«ساري» نعم أو لا'
export const LEGAL_ENTITY_HAS_BRANCHES = 'الكيان مربوط بفروع — انقل فروعه لكيان تاني قبل ما توقفه'
export const LEGAL_ENTITY_INACTIVE = 'الكيان موقوف — الفرع بيتربط بكيان ساري'
export const LEGAL_ENTITY_BRANCH_COUNTRY = 'الفرع بيتربط بكيان دولته بس'
export const LEGAL_ENTITY_NOTHING = 'مفيش بيانات اتغيّرت'

let ready: boolean | null = null
/** جدول ترحيل 133 وعمود ترحيل 134 موجودين؟ الموجود بيتحفظ */
export async function legalEntitiesReady(em: EntityManager): Promise<boolean> {
  if (ready === true) return true
  const [row] = await em.query(`SELECT CASE WHEN OBJECT_ID(N'dbo.legal_entities', N'U') IS NOT NULL AND COL_LENGTH(N'dbo.branches', N'legalEntityId') IS NOT NULL THEN 1 ELSE 0 END AS [ready]`)
  ready = Number(row?.ready) === 1
  return ready
}
/** للاختبارات: نسيان حالة الترحيل */
export function resetLegalEntitiesCache() { ready = null }

/** عملة دولة كيان (الخريطة نفسها اللي بتحدد عملة الفرع) */
export const entityCurrencyOf = (country: BranchCountry): BranchCurrency => branchCurrency(country, 'SAR')

/** عملة فرع: عملة كيانه لو مربوط بكيان عملته معروفة، وإلا عملة دولته (وإلا عملة النظام) — القاعدة القايمة بالحرف للفرع غير المربوط */
export function currencyOfBranch(entityCurrency: unknown, country: unknown, systemCurrency: BranchCurrency): BranchCurrency {
  return entityCurrency === 'EGP' || entityCurrency === 'SAR' ? entityCurrency : branchCurrency(country, systemCurrency)
}

// ===== المنظّفات =====

const line = (raw: unknown): string => (typeof raw === 'string' ? raw.replace(/\s+/g, ' ').trim() : '')
const blank = (raw: unknown): boolean => raw === null || raw === undefined || raw === ''

export function validTimeZone(value: string): boolean {
  try { new Intl.DateTimeFormat('en-US', { timeZone: value }); return /^[A-Za-z_]+(\/[A-Za-z0-9_+-]+)+$/.test(value) } catch { return false }
}

export interface LegalEntityInput {
  name?: unknown; nameEn?: unknown; country?: unknown; timeZone?: unknown; commercialRegister?: unknown; taxNumber?: unknown; insuranceNumber?: unknown; qiwaNumber?: unknown
  payrollBankName?: unknown; payrollIban?: unknown; wpsNumber?: unknown; cycleStartDay?: unknown; isActive?: unknown
}
export type LegalEntityValues = Partial<Pick<LegalEntity, 'name' | 'nameEn' | 'country' | 'currency' | 'timeZone' | 'commercialRegister' | 'taxNumber' | 'insuranceNumber' | 'qiwaNumber' | 'payrollBankName'
  | 'payrollIban' | 'wpsNumber' | 'cycleStartDay' | 'isActive'>>

const TEXT_FIELDS: Array<['commercialRegister' | 'taxNumber' | 'insuranceNumber' | 'qiwaNumber' | 'wpsNumber' | 'payrollBankName', number]> = [
  ['commercialRegister', 100], ['taxNumber', 100], ['insuranceNumber', 100], ['qiwaNumber', 100], ['wpsNumber', 100], ['payrollBankName', 200]]

/**
 * قيم كيان نضيفة. `current` فاضي = إنشاء (الاسم والدولة إلزاميين، والعملة من الدولة)؛ غير كده تعديل (المبعوت بس، والفاضي بيفضّي الاختياري،
 * والدولة مابتتغيّرش). الآيبان بيتحكم بدولة الكيان.
 */
export function cleanLegalEntityValues(raw: LegalEntityInput, current: Pick<LegalEntity, 'country'> | null): LegalEntityValues {
  const out: LegalEntityValues = {}
  if (!current || raw.name !== undefined) {
    const name = line(raw.name)
    if (name.length < 2 || name.length > 200) throw new BadRequestException(LEGAL_ENTITY_NAME)
    out.name = name
  }
  if (raw.nameEn !== undefined) {
    if (!blank(raw.nameEn) && typeof raw.nameEn !== 'string') throw new BadRequestException(LEGAL_ENTITY_NAME_EN)
    const name = line(raw.nameEn)
    if (name.length > 200) throw new BadRequestException(LEGAL_ENTITY_NAME_EN)
    out.nameEn = name || null
  }
  let country: BranchCountry
  if (!current) {
    const value = typeof raw.country === 'string' ? branchCountryOf(raw.country) : null
    if (!value) throw new BadRequestException(LEGAL_ENTITY_COUNTRY)
    country = value
    out.country = value
    out.currency = entityCurrencyOf(value)
  } else {
    country = current.country
    if (raw.country !== undefined && (typeof raw.country !== 'string' || branchCountryOf(raw.country) !== current.country)) throw new BadRequestException(LEGAL_ENTITY_COUNTRY_FIXED)
  }
  if (raw.timeZone !== undefined) {
    if (blank(raw.timeZone)) out.timeZone = null
    else {
      if (typeof raw.timeZone !== 'string' || raw.timeZone.length > 64 || !validTimeZone(raw.timeZone.trim())) throw new BadRequestException(LEGAL_ENTITY_TIME_ZONE)
      out.timeZone = raw.timeZone.trim()
    }
  }
  for (const [key, max] of TEXT_FIELDS) {
    if (raw[key] === undefined) continue
    if (!blank(raw[key]) && typeof raw[key] !== 'string') throw new BadRequestException(LEGAL_ENTITY_TEXT)
    const value = line(raw[key])
    if (value.length > max) throw new BadRequestException(LEGAL_ENTITY_TEXT)
    out[key] = value || null
  }
  if (raw.payrollIban !== undefined) {
    if (blank(raw.payrollIban)) out.payrollIban = null
    else {
      const value = typeof raw.payrollIban === 'string' ? raw.payrollIban.replace(/[\s-]/g, '').toUpperCase() : ''
      if (!/^(SA\d{22}|EG\d{27})$/.test(value) || !value.startsWith(country)) throw new BadRequestException(LEGAL_ENTITY_IBAN)
      out.payrollIban = value
    }
  }
  if (raw.cycleStartDay !== undefined) {
    if (blank(raw.cycleStartDay)) out.cycleStartDay = null
    else {
      if (typeof raw.cycleStartDay !== 'number' || !Number.isInteger(raw.cycleStartDay) || raw.cycleStartDay < 1 || raw.cycleStartDay > 28) throw new BadRequestException(LEGAL_ENTITY_CYCLE_DAY)
      out.cycleStartDay = raw.cycleStartDay
    }
  }
  if (raw.isActive !== undefined) {
    if (typeof raw.isActive !== 'boolean') throw new BadRequestException(LEGAL_ENTITY_ACTIVE)
    out.isActive = raw.isActive
  }
  return out
}

/** البيانات الناقصة في كيان (تحذير في الشاشة — مش مانع) */
export function legalEntityGaps(row: Pick<LegalEntity, 'country' | 'commercialRegister' | 'taxNumber' | 'insuranceNumber' | 'qiwaNumber' | 'payrollIban' | 'wpsNumber'>): string[] {
  const gaps: string[] = []
  if (!row.commercialRegister) gaps.push('السجل التجاري')
  if (!row.taxNumber) gaps.push('الرقم الضريبي')
  if (!row.insuranceNumber) gaps.push('رقم منشأة التأمينات')
  if (!row.payrollIban) gaps.push('آيبان بنك الرواتب')
  if (row.country === 'SA') {
    if (!row.qiwaNumber) gaps.push('رقم قوى')
    if (!row.wpsNumber) gaps.push('رقم حماية الأجور')
  }
  return gaps
}

/**
 * دولة فرع اتغيّرت (أو اتشالت): كيانه لو مش كيان دولته الجديدة بيتفك — فعملته بترجع لدولته زي قبل الكيانات، والشاشة بتنبّه إنه من غير
 * كيان. جوه معاملة تعديل الفرع.
 */
export async function unlinkBranchEntityOnCountryChange(em: EntityManager, branchId: number, country: unknown): Promise<void> {
  if (!(await legalEntitiesReady(em))) return
  await em.query(
    'UPDATE dbo.branches SET [legalEntityId] = NULL WHERE [id] = @0 AND [legalEntityId] IS NOT NULL AND [legalEntityId] NOT IN (SELECT [id] FROM dbo.legal_entities WHERE [country] = @1)',
    [branchId, branchCountryOf(country) ?? ''])
}

// ===== القرّاء =====

/** اليوم المحلي (YYYY-MM-DD) في منطقة زمنية */
export function localDateInZone(now: Date, timeZone: string): string {
  const parts = new Intl.DateTimeFormat('en-CA', { timeZone, year: 'numeric', month: '2-digit', day: '2-digit' }).formatToParts(now)
  const part = (type: string) => parts.find((entry) => entry.type === type)?.value ?? ''
  return `${part('year')}-${part('month')}-${part('day')}`
}

/**
 * B4.1-ب: الكيانات السارية اللي لها منطقة زمنية صالحة وفروع مربوطة — بفروعها. فاضي قبل الترحيل أو لو مفيش كيان بمنطقة (الافتراضي):
 * ساعتها كل حاجة بتوقيت الخادم زي الأول.
 */
export async function readEntityZones(em: EntityManager): Promise<Array<{ entityId: number; timeZone: string; branchIds: number[] }>> {
  if (!(await legalEntitiesReady(em))) return []
  const rows: Array<{ entityId: number; timeZone: string; branchId: number }> = await em.query(
    `SELECT e.[id] AS [entityId], e.[timeZone], b.[id] AS [branchId] FROM dbo.legal_entities e INNER JOIN dbo.branches b ON b.[legalEntityId] = e.[id]
     WHERE e.[isActive] = 1 AND e.[timeZone] IS NOT NULL AND e.[timeZone] <> N'' ORDER BY e.[id], b.[id]`)
  const zones = new Map<number, { entityId: number; timeZone: string; branchIds: number[] }>()
  for (const row of rows) {
    if (!validTimeZone(String(row.timeZone))) continue
    const zone = zones.get(Number(row.entityId)) ?? { entityId: Number(row.entityId), timeZone: String(row.timeZone), branchIds: [] }
    zone.branchIds.push(Number(row.branchId))
    zones.set(zone.entityId, zone)
  }
  return [...zones.values()]
}

/** كيان كل فرع مربوط (رقم الفرع ← رقم كيانه) — فاضي قبل الترحيل */
export async function readBranchEntityIds(em: EntityManager, branchIds: number[] | null): Promise<Map<number, number>> {
  const out = new Map<number, number>()
  if ((branchIds && !branchIds.length) || !(await legalEntitiesReady(em))) return out
  const ids = branchIds ? [...new Set(branchIds)] : null
  for (let offset = 0; offset < (ids ? ids.length : 1); offset += 900) {
    const chunk = ids ? ids.slice(offset, offset + 900) : []
    const rows: Array<{ id: number; legalEntityId: number }> = await em.query(
      `SELECT [id], [legalEntityId] FROM dbo.branches WHERE [legalEntityId] IS NOT NULL${ids ? ` AND [id] IN (${chunk.map((_, index) => `@${index}`).join(', ')})` : ''}`, chunk)
    for (const row of rows) out.set(Number(row.id), Number(row.legalEntityId))
  }
  return out
}
