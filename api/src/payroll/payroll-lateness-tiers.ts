import { BadRequestException, ConflictException } from '@nestjs/common'
import { createHash } from 'node:crypto'
import type { EntityManager } from 'typeorm'
import { PayrollDecimal } from './payroll-decimal'
import { PayrollLatenessTierSet, PayrollLatenessTierSetTier } from './payroll-lateness-tier-sets.entities'

/**
 * الخطوة 21 — الشرائح الحية: شرائح التأخير القديمة (جدول lateness_tiers بلا تاريخ ولا تحقق) صارت «مجموعة شرائح مؤرخة»:
 * - كل مجموعة تسري من شهر رواتب (effectivePeriod) حتى تحل محلها مجموعة أحدث؛ المسير يأخذ مجموعة شهره كاملة (لا تقسيم داخل الشهر).
 * - الحفظ يرفض التداخل (حدود شاملة: من ≤ الدقائق ≤ إلى)، والفجوة مسموحة وتُعرض: الدقائق بلا شريحة تُخصم بالدقيقة (السلوك القديم).
 * - الطرق: FRACTION = كسر يوم × سعر اليوم، MULTIPLIER = الدقائق × المضاعف × سعر الدقيقة، MINUTES = الدقائق × سعر الدقيقة، NONE = بلا خصم.
 * - بصمة المحتوى تُحفظ وتُتحقق عند القراءة؛ لقطة المسير (الخطوة 19) تحفظ المجموعة كما حُسبت.
 */
export const PAYROLL_LATENESS_TIER_MODES = ['FRACTION', 'MULTIPLIER', 'MINUTES', 'NONE'] as const
export type PayrollLatenessTierMode = typeof PAYROLL_LATENESS_TIER_MODES[number]
export const PAYROLL_LATENESS_TIER_LIMITS = Object.freeze({ rows: 100, maxMinutes: 1440, maxDayFraction: '31', maxMultiplier: '100', labelLength: 200, reasonLength: 500 })
export const PAYROLL_LATENESS_TIER_MODE_LABELS: Record<PayrollLatenessTierMode, string> = {
  FRACTION: 'كسر من اليوم', MULTIPLIER: 'الدقائق × مضاعف × سعر الدقيقة', MINUTES: 'الدقائق × سعر الدقيقة', NONE: 'بلا خصم',
}

export interface PayrollLatenessTierRow {
  sequence: number; fromMinutes: number; toMinutes: number | null; mode: PayrollLatenessTierMode; value: string; label: string | null
}
export interface PayrollLatenessTierGap { fromMinutes: number; toMinutes: number | null; message: string }
export interface PayrollLatenessTierSetSnapshot {
  setId: number | null; effectivePeriod: string | null; contentHash: string | null
  source: 'LEGACY_CONVERSION' | 'EDITOR' | 'NONE'; tiers: PayrollLatenessTierRow[]
}
export interface PayrollLatenessTierTrace {
  minutes: number; matched: boolean; sequence: number | null; fromMinutes: number | null; toMinutes: number | null
  mode: PayrollLatenessTierMode | 'NO_MATCH_PER_MINUTE'; value: string | null; label: string | null
  dayRate: number; minuteRate: number; amount: number; formula: string
}

const bad = (code: string, message: string, details: Record<string, unknown> = {}): never => { throw new BadRequestException({ code, message, ...details }) }
const range = (row: { fromMinutes: number; toMinutes: number | null }) => `${row.fromMinutes}–${row.toMinutes ?? '∞'}`

function decimalValue(value: unknown, path: string): PayrollDecimal {
  const text = typeof value === 'number' && Number.isFinite(value) ? String(value) : value
  if (typeof text !== 'string' || !/^\d{1,6}(?:\.\d{1,3})?$/.test(text.trim())) bad('LATE-TIERS-VALUE-INVALID', `${path}: قيمة موجبة بحد أقصى 3 منازل عشرية`)
  return PayrollDecimal.from((text as string).trim())
}

export function payrollLatenessTierPeriod(value: unknown): string {
  if (typeof value !== 'string' || !/^\d{4}-(0[1-9]|1[0-2])$/.test(value)) bad('LATE-TIERS-PERIOD-INVALID', 'شهر سريان المجموعة بصيغة YYYY-MM (شهر رواتب)')
  return value as string
}

/** تحقق وتطبيع: الترتيب بالبداية، رفض التداخل برقمي الشريحتين وحدودهما، وعرض الفجوات. لا يكتب شيئًا. */
export function validatePayrollLatenessTiers(input: unknown): { tiers: PayrollLatenessTierRow[]; gaps: PayrollLatenessTierGap[] } {
  if (!Array.isArray(input) || !input.length || input.length > PAYROLL_LATENESS_TIER_LIMITS.rows) bad('LATE-TIERS-REQUIRED', `المجموعة تحتاج شريحة واحدة على الأقل وبحد أقصى ${PAYROLL_LATENESS_TIER_LIMITS.rows}`)
  const rows = (input as unknown[]).map((raw, index) => {
    const path = `الشريحة ${index + 1}`
    if (!raw || typeof raw !== 'object' || Array.isArray(raw)) bad('LATE-TIERS-ROW-INVALID', `${path}: بيانات غير صالحة`)
    const row = raw as Record<string, unknown>
    const from = Number(row.fromMinutes), to = row.toMinutes === null || row.toMinutes === undefined || row.toMinutes === '' ? null : Number(row.toMinutes)
    if (!Number.isSafeInteger(from) || from < 0 || from > PAYROLL_LATENESS_TIER_LIMITS.maxMinutes) bad('LATE-TIERS-BOUNDS-INVALID', `${path}: «من دقيقة» عدد صحيح من 0 إلى ${PAYROLL_LATENESS_TIER_LIMITS.maxMinutes}`)
    if (to !== null && (!Number.isSafeInteger(to) || to < from || to > PAYROLL_LATENESS_TIER_LIMITS.maxMinutes)) bad('LATE-TIERS-BOUNDS-INVALID', `${path}: «إلى دقيقة» عدد صحيح لا يقل عن «من» (${from}) ولا يتجاوز ${PAYROLL_LATENESS_TIER_LIMITS.maxMinutes}، أو فارغ للنهاية المفتوحة`)
    const mode = row.mode as PayrollLatenessTierMode
    if (!PAYROLL_LATENESS_TIER_MODES.includes(mode)) bad('LATE-TIERS-MODE-INVALID', `${path}: طريقة الخصم ${PAYROLL_LATENESS_TIER_MODES.join(' أو ')}`)
    let value = '0.000'
    if (mode === 'FRACTION' || mode === 'MULTIPLIER') {
      const parsed = decimalValue(row.value, path)
      const max = PayrollDecimal.from(mode === 'FRACTION' ? PAYROLL_LATENESS_TIER_LIMITS.maxDayFraction : PAYROLL_LATENESS_TIER_LIMITS.maxMultiplier)
      if (parsed.isZero() || parsed.compare(max) > 0) bad('LATE-TIERS-VALUE-INVALID', mode === 'FRACTION'
        ? `${path}: كسر اليوم أكبر من صفر وبحد أقصى ${PAYROLL_LATENESS_TIER_LIMITS.maxDayFraction} (مثل 0.25)`
        : `${path}: المضاعف أكبر من صفر وبحد أقصى ${PAYROLL_LATENESS_TIER_LIMITS.maxMultiplier} (مثل 1.5)`)
      value = parsed.format(3, 'HALF_UP')
    }
    const label = row.label === null || row.label === undefined || String(row.label).trim() === '' ? null : String(row.label).trim()
    if (label !== null && label.length > PAYROLL_LATENESS_TIER_LIMITS.labelLength) bad('LATE-TIERS-LABEL-INVALID', `${path}: الوصف بحد أقصى ${PAYROLL_LATENESS_TIER_LIMITS.labelLength} حرف`)
    return { index: index + 1, fromMinutes: from, toMinutes: to, mode, value, label }
  }).sort((a, b) => a.fromMinutes - b.fromMinutes || a.index - b.index)
  for (let i = 1; i < rows.length; i++) {
    const previous = rows[i - 1], current = rows[i]
    if (previous.toMinutes === null || current.fromMinutes <= previous.toMinutes) {
      bad('LATE-TIERS-OVERLAP', `تداخل في الشرائح: الشريحة ${previous.index} (${range(previous)}) والشريحة ${current.index} (${range(current)}) تغطيان الدقيقة ${current.fromMinutes}؛ الحدود شاملة، فاجعل بداية الثانية بعد نهاية الأولى`,
        { rows: [previous.index, current.index] })
    }
  }
  const tiers = rows.map((row, i) => ({ sequence: i + 1, fromMinutes: row.fromMinutes, toMinutes: row.toMinutes, mode: row.mode, value: row.value, label: row.label }))
  const gaps: PayrollLatenessTierGap[] = []
  const gap = (from: number, to: number | null) => { if (to === null || to >= from) gaps.push({ fromMinutes: from, toMinutes: to, message: `الدقائق ${from}–${to ?? '∞'} بلا شريحة: تُخصم بالدقيقة × سعر الدقيقة` }) }
  if (tiers[0].fromMinutes > 1) gap(1, tiers[0].fromMinutes - 1)
  for (let i = 1; i < tiers.length; i++) if (tiers[i].fromMinutes > tiers[i - 1].toMinutes! + 1) gap(tiers[i - 1].toMinutes! + 1, tiers[i].fromMinutes - 1)
  const last = tiers[tiers.length - 1]
  if (last.toMinutes !== null) gap(last.toMinutes + 1, null)
  return { tiers, gaps }
}

/** بصمة محتوى المجموعة: شهر السريان والشرائح المطبّعة فقط (لا المعرّف ولا المنشئ ولا الوقت). */
export function payrollLatenessTierSetHash(effectivePeriod: string, tiers: PayrollLatenessTierRow[]): string {
  const canonical = JSON.stringify({ effectivePeriod, tiers: tiers.map(tier => [tier.sequence, tier.fromMinutes, tier.toMinutes, tier.mode, tier.value, tier.label]) })
  return createHash('sha256').update(canonical, 'utf8').digest('hex')
}

const six = (value: number) => (Number.isFinite(value) ? value : 0).toFixed(6)

/** خصم تأخير يوم واحد بمجموعة الشرائح (نفس دلالة المسير القديم: أول شريحة تحتوي الدقائق، وبلا مطابقة = بالدقيقة) مع أثر الشريحة للقسيمة. */
export function payrollLatenessTierDeduction(lateMinutes: number, tiers: readonly PayrollLatenessTierRow[], dayRate: number, minuteRate: number): { amount: number; trace: PayrollLatenessTierTrace | null } {
  const minutes = Number(lateMinutes)
  if (!(minutes > 0)) return { amount: 0, trace: null }
  const tier = tiers.find(row => minutes >= row.fromMinutes && (row.toMinutes === null || minutes <= row.toMinutes))
  const base = { minutes, dayRate, minuteRate }
  if (!tier) {
    const amount = minutes * minuteRate
    return { amount, trace: { ...base, matched: false, sequence: null, fromMinutes: null, toMinutes: null, mode: 'NO_MATCH_PER_MINUTE', value: null, label: null,
      amount, formula: `${minutes} دقيقة × سعر الدقيقة ${six(minuteRate)} (بلا شريحة مطابقة)` } }
  }
  let amount = 0, formula = ''
  if (tier.mode === 'FRACTION') { amount = Number(tier.value) * dayRate; formula = `${Number(tier.value)} يوم × سعر اليوم ${six(dayRate)}` }
  else if (tier.mode === 'MULTIPLIER') { amount = minutes * Number(tier.value) * minuteRate; formula = `${minutes} دقيقة × ${Number(tier.value)} × سعر الدقيقة ${six(minuteRate)}` }
  else if (tier.mode === 'MINUTES') { amount = minutes * minuteRate; formula = `${minutes} دقيقة × سعر الدقيقة ${six(minuteRate)}` }
  else formula = 'شريحة بلا خصم'
  return { amount, trace: { ...base, matched: true, sequence: tier.sequence, fromMinutes: tier.fromMinutes, toMinutes: tier.toMinutes, mode: tier.mode,
    value: tier.value, label: tier.label, amount, formula } }
}

type TierSetRow = { id: number; effectivePeriod: string; contentHash: string; source: string }

async function tiersOf(em: EntityManager, setId: number): Promise<PayrollLatenessTierRow[]> {
  const rows = await em.getRepository(PayrollLatenessTierSetTier).createQueryBuilder('tier')
    .select(['tier.sequence AS sequence', 'tier.fromMinutes AS fromMinutes', 'tier.toMinutes AS toMinutes', 'tier.mode AS mode', 'tier.label AS label'])
    .addSelect(em.connection.options.type === 'mssql' ? 'CAST(tier.value AS nvarchar(40))' : 'CAST(tier.value AS CHAR)', 'value')
    .where('tier.setId = :setId', { setId }).orderBy('tier.sequence', 'ASC').getRawMany<Record<string, unknown>>()
  return rows.map(row => ({ sequence: Number(row.sequence), fromMinutes: Number(row.fromMinutes), toMinutes: row.toMinutes === null ? null : Number(row.toMinutes),
    mode: row.mode as PayrollLatenessTierMode, value: PayrollDecimal.from(String(row.value)).format(3, 'HALF_UP'), label: (row.label as string | null) ?? null }))
}

/** المجموعة كما خُزنت مع التحقق من بصمتها؛ أي تعديل مباشر في القاعدة يوقف الحساب بدل أن يُطبق صامتًا. */
export async function readPayrollLatenessTierSetById(em: EntityManager, setId: number): Promise<PayrollLatenessTierSetSnapshot & { row: PayrollLatenessTierSet }> {
  const row = await em.getRepository(PayrollLatenessTierSet).findOneBy({ id: setId })
  if (!row) throw new BadRequestException({ code: 'LATE-TIERS-NOT-FOUND', message: `مجموعة الشرائح #${setId} غير موجودة` })
  const tiers = await tiersOf(em, row.id)
  if (payrollLatenessTierSetHash(row.effectivePeriod, tiers) !== row.contentHash) {
    throw new ConflictException({ code: 'LATE-TIERS-HASH-MISMATCH', message: `محتوى مجموعة شرائح التأخير #${row.id} لا يطابق بصمتها المحفوظة؛ عُدّلت خارج الشاشة. أنشئ مجموعة جديدة صحيحة قبل الحساب` })
  }
  return { row, setId: row.id, effectivePeriod: row.effectivePeriod, contentHash: row.contentHash, source: row.source as PayrollLatenessTierSetSnapshot['source'], tiers }
}

/** مجموعة شهر المسير: أحدث مجموعة مفعّلة يسري شهرها في شهر المسير أو قبله؛ بلا مجموعة = بلا شرائح (الخصم بالدقيقة). */
export async function readPayrollLatenessTierSetForPeriod(em: EntityManager, period: string): Promise<PayrollLatenessTierSetSnapshot> {
  const found = await em.getRepository(PayrollLatenessTierSet).createQueryBuilder('tierSet')
    .select(['tierSet.id AS id', 'tierSet.effectivePeriod AS effectivePeriod', 'tierSet.contentHash AS contentHash', 'tierSet.source AS source'])
    .where('tierSet.isActive = :active AND tierSet.effectivePeriod <= :period', { active: true, period })
    .orderBy('tierSet.effectivePeriod', 'DESC').addOrderBy('tierSet.id', 'DESC').limit(1).getRawOne<TierSetRow>()
  if (!found) return { setId: null, effectivePeriod: null, contentHash: null, source: 'NONE', tiers: [] }
  const { row: _row, ...snapshot } = await readPayrollLatenessTierSetById(em, Number(found.id))
  return snapshot
}
