import { BadRequestException, ConflictException } from '@nestjs/common'
import { createHash } from 'node:crypto'
import { EntityManager, In, Like, Repository } from 'typeorm'
import { RequestsConfig } from '../requests/entities/requests-config.entity'
import { parseFactor, TERMINATION_REASON_LABELS, type EosPolicy } from './eos'
import {
  isBuiltinTerminationReason,
  OffboardingCase,
  TERMINATION_REASONS,
  type TerminationReason,
} from './offboarding.entities'

// ============================================================
// أسباب إنهاء الخدمة (قرار المالك 27 سبتمبر): الثمانية الأساسية ثابتة بأكوادها ومسمياتها ومعاملاتها
// (eos.reason_factors وجدول الاستقالة)، والمالك يضيف فوقها أسباب مخصصة من «سياسات النظام» — كل سبب
// بمسمى ونسبة من مكافأة نهاية الخدمة (المكافأة الكاملة بنفس الشرائح × النسبة، زي أي سبب غير الاستقالة).
// التخزين في requests_config (مفيش جدول جديد): المفتاح offboarding.custom_termination_reasons بمصفوفة JSON
// [{ code, label, eosFactor, active }]، وغيابه = الافتراضي «انقطاع عن العمل» بلا مكافأة.
// عمود القيمة nvarchar(500): القائمة الأطول بتكمل في صفوف .2 و.3… كل صف مصفوفة JSON صالحة لوحده والقائمة
// = الصفوف بترتيب أرقامها — والكتابة كلها في معاملة واحدة تحت قفل.
// ============================================================

export const CUSTOM_TERMINATION_REASONS_KEY = 'offboarding.custom_termination_reasons'
// آخر رقم اتولّد لكود مخصص (custom_N) — الرقم مايرجعش يتولّد تاني حتى لو سببه اتشال
export const CUSTOM_TERMINATION_REASONS_SEQ_KEY = 'offboarding.custom_termination_reasons_seq'
const PART_KEY = /^offboarding\.custom_termination_reasons\.(\d+)$/
const CONFIG_VALUE_MAX = 500 // requests_config.value nvarchar(500)
export const CUSTOM_TERMINATION_REASONS_MAX = 40
export const TERMINATION_REASON_LABEL_MIN = 2
export const TERMINATION_REASON_LABEL_MAX = 60
const FACTOR_TEXT_MAX = 12
// كود السبب: حروف لاتينية صغيرة وأرقام و_ بحد 30 (عمود offboarding_cases.terminationReason)
export const TERMINATION_REASON_CODE = /^[a-z][a-z0-9_]{0,29}$/
const CUSTOM_CODE = /^custom_(\d+)$/

export interface CustomTerminationReason {
  code: string
  label: string
  eosFactor: string // نسبة من المكافأة الكاملة: عشري 0..1 أو كسر زي 1/3 (بصيغة محلل eos.ts)
  active: boolean
}

// الافتراضي لما المفتاح مش موجود: «انقطاع عن العمل» بلا مكافأة (زي الفصل التأديبي) — والمالك يغيّر نسبته
export const DEFAULT_CUSTOM_TERMINATION_REASONS: readonly CustomTerminationReason[] = [
  { code: 'absence', label: 'انقطاع عن العمل', eosFactor: '0', active: true },
]

// مسميات الأسباب الأساسية في الشاشات (مرآة src/lib/termination-reasons.ts). تلاتة منها بتختلف عن مسمى بند
// المكافأة وسجل التغييرات (TERMINATION_REASON_LABELS في eos.ts) — وده فاضل زي ما هو
export const TERMINATION_REASON_DISPLAY_LABELS: Record<TerminationReason, string> = {
  resignation: 'استقالة موثقة',
  termination: 'إنهاء من صاحب العمل',
  dismissal: 'فصل تأديبي',
  contract_end: 'انتهاء مدة العقد',
  retirement: 'تقاعد',
  death: 'وفاة',
  disability: 'عجز صحي',
  force_majeure: 'قوة قاهرة',
}

// صفوف القائمة ليها مسارها (PUT /offboarding/termination-reasons) — PATCH /settings/config مايكتبهاش
export const isCustomTerminationReasonsKey = (key: string): boolean => {
  const k = String(key ?? '').trim().toLowerCase()
  return k === CUSTOM_TERMINATION_REASONS_KEY || k === CUSTOM_TERMINATION_REASONS_SEQ_KEY || PART_KEY.test(k)
}

// المسمى كما يُحفظ: من غير مسافات في الأول والآخر، ومسافة واحدة بين الكلمات
export const normalizeReasonLabel = (label: unknown): string =>
  typeof label === 'string' ? label.replace(/\s+/g, ' ').trim() : ''
// مفتاح مقارنة المسميات: من غير فرق حروف كبيرة وصغيرة ولا مسافات
const labelKey = (label: string) => normalizeReasonLabel(label).normalize('NFKC').toLowerCase().replace(/\s+/g, '')

const factorText = (value: unknown) =>
  typeof value === 'number' && Number.isFinite(value) ? String(value) : typeof value === 'string' ? value : undefined

// عنصر مخزن → سبب صالح، أو null للتالف (اتكتب من برّه المسار) — القراءة بتسقطه بدل ما تخمّن نسبته
function storedReason(raw: unknown): CustomTerminationReason | null {
  if (!raw || typeof raw !== 'object' || Array.isArray(raw)) return null
  const row = raw as Record<string, unknown>
  const code = typeof row.code === 'string' ? row.code : ''
  const label = normalizeReasonLabel(row.label)
  const factor = parseFactor(factorText(row.eosFactor))
  if (!TERMINATION_REASON_CODE.test(code) || isBuiltinTerminationReason(code) || !label || !factor) return null
  return { code, label, eosFactor: factor.label, active: row.active !== false }
}

export interface StoredCustomTerminationReasons {
  reasons: CustomTerminationReason[]
  lastSeq: number
  stored: boolean // المفتاح موجود (false = القائمة الافتراضية)
  damaged: boolean // صف أو عنصر تالف اتشال من القراءة
}

// القائمة الفعالة من صفوف الإعداد — مصدر واحد للحساب والعرض والحفظ
export function parseCustomTerminationReasons(
  rows: Array<Pick<RequestsConfig, 'key' | 'value'>>
): StoredCustomTerminationReasons {
  const byKey = new Map(rows.map((row) => [String(row.key).trim().toLowerCase(), String(row.value ?? '')]))
  const seq = Number(byKey.get(CUSTOM_TERMINATION_REASONS_SEQ_KEY))
  const lastSeq = Number.isSafeInteger(seq) && seq > 0 ? seq : 0
  const main = byKey.get(CUSTOM_TERMINATION_REASONS_KEY)
  if (main === undefined) {
    return { reasons: DEFAULT_CUSTOM_TERMINATION_REASONS.map((r) => ({ ...r })), lastSeq, stored: false, damaged: false }
  }
  const parts: Array<[number, string]> = [[1, main]]
  for (const [key, value] of byKey) {
    const m = PART_KEY.exec(key)
    if (m && Number(m[1]) >= 2) parts.push([Number(m[1]), value])
  }
  parts.sort((a, b) => a[0] - b[0])
  let damaged = false
  const reasons: CustomTerminationReason[] = []
  for (const [, value] of parts) {
    let list: unknown
    try {
      list = JSON.parse(value)
    } catch {
      damaged = true
      continue
    }
    if (!Array.isArray(list)) {
      damaged = true
      continue
    }
    for (const item of list) {
      const reason = storedReason(item)
      if (!reason || reasons.some((r) => r.code === reason.code)) {
        damaged = true
        continue
      }
      reasons.push(reason)
    }
  }
  return { reasons, lastSeq, stored: true, damaged }
}

// القراءة: غياب المفتاح (الافتراضي) بسؤال على المفتاح والعدّاد، والموجود بكل صفوفه في استعلام واحد.
// القائمة لحد 500 حرف (حوالي 5 أسباب) صف واحد فقراءتها ذرية؛ الأطول لو اتقرت في نفس لحظة حفظ ممكن تطلع
// ناقصة للحظتها (العرض يبيّن الكود، والمكافأة ترفض 409 بدل ما تخمّن) — والمسارات الحاكمة (الحفظ، وفتح ملف
// بسبب مخصص) بتقرا تحت القفل (lockTerminationReasons)
export async function readCustomTerminationReasons(
  config: Pick<Repository<RequestsConfig>, 'find' | 'findOne'>
): Promise<StoredCustomTerminationReasons> {
  const main = await config.findOne({ where: { key: CUSTOM_TERMINATION_REASONS_KEY } })
  if (!main) {
    const seq = await config.findOne({ where: { key: CUSTOM_TERMINATION_REASONS_SEQ_KEY } })
    return parseCustomTerminationReasons(seq ? [seq] : [])
  }
  return parseCustomTerminationReasons(
    await config.find({ where: { key: Like(`${CUSTOM_TERMINATION_REASONS_KEY}%`) } })
  )
}

// بصمة محتوى القائمة: الشاشة بترجّعها مع الحفظ، ولو القائمة اتغيرت من حد تاني من وقت ما اتفتحت الحفظ بيترفض
// بدل ما يرجّع نسبة أو تفعيل غيّره غيره من غير ما يشوفه (الحفظ بالقائمة الكاملة)
export const customTerminationReasonsRevision = (reasons: CustomTerminationReason[]): string =>
  createHash('sha256')
    .update(JSON.stringify(reasons.map(({ code, label, eosFactor, active }) => [code, label, eosFactor, active])))
    .digest('hex')
    .slice(0, 16)

// القائمة → قيم الصفوف: كل صف مصفوفة JSON ≤ 500 حرف (الأول على المفتاح نفسه، والباقي .2 و.3…)
export function customTerminationReasonParts(reasons: CustomTerminationReason[]): string[] {
  const parts: CustomTerminationReason[][] = [[]]
  for (const reason of reasons) {
    const last = parts[parts.length - 1]
    if (last.length > 0 && JSON.stringify([...last, reason]).length > CONFIG_VALUE_MAX) parts.push([reason])
    else last.push(reason)
  }
  return parts.map((part) => JSON.stringify(part))
}

// الكتابة (جوه معاملة الحفظ وقفلها): الصفوف الجديدة + العدّاد، وشيل صفوف زيادة من قائمة أطول قبل كده
export async function writeCustomTerminationReasons(
  em: EntityManager,
  reasons: CustomTerminationReason[],
  lastSeq: number
) {
  const repo = em.getRepository(RequestsConfig)
  const rows = customTerminationReasonParts(reasons).map((value, index) => ({
    key: index === 0 ? CUSTOM_TERMINATION_REASONS_KEY : `${CUSTOM_TERMINATION_REASONS_KEY}.${index + 1}`,
    value,
  }))
  await repo.save([...rows, { key: CUSTOM_TERMINATION_REASONS_SEQ_KEY, value: String(lastSeq) }])
  const keep = new Set(rows.map((row) => row.key))
  const stale = (await repo.find({ where: { key: Like(`${CUSTOM_TERMINATION_REASONS_KEY}.%`) } }))
    .map((row) => row.key)
    .filter((key) => PART_KEY.test(key.toLowerCase()) && !keep.has(key.toLowerCase()))
  if (stale.length > 0) await repo.delete({ key: In(stale) })
}

// قفل واحد للقائمة: الحفظ حصري، وفتح ملف بسبب مخصص مشترك — فإيقاف السبب أو شيله مايتزامنش مع ملف
// بيتفتح عليه، ونفس رقم custom_N مايتولّدش مرتين
export async function lockTerminationReasons(em: EntityManager, mode: 'Exclusive' | 'Shared') {
  if (em.connection.options.type !== 'mssql') return
  const rows = await em.query(
    `DECLARE @result int;
      EXEC @result = sys.sp_getapplock @Resource = 'hr:offboarding:termination-reasons', @LockMode = @0, @LockOwner = 'Transaction', @LockTimeout = 10000;
      SELECT @result AS lockResult;`,
    [mode]
  )
  if (!rows.length || Number(rows[0].lockResult) < 0) {
    throw new ConflictException('أسباب إنهاء الخدمة بتتعدل دلوقتي من حد تاني؛ جرّب تاني بعد شوية')
  }
}

// كام ملف إنهاء على كل كود غير أساسي — المستخدم مايتشالش، وأعلى رقم custom_N اتسجل في ملف
export async function customTerminationReasonUsage(em: EntityManager): Promise<Map<string, number>> {
  const rows: Array<{ code: string; n: number | string }> = await em
    .getRepository(OffboardingCase)
    .createQueryBuilder('c')
    .select('c.terminationReason', 'code')
    .addSelect('COUNT(*)', 'n')
    .where('c.terminationReason IS NOT NULL')
    .groupBy('c.terminationReason')
    .getRawMany()
  return new Map(
    rows.filter((row) => !isBuiltinTerminationReason(row.code)).map((row) => [String(row.code), Number(row.n)])
  )
}

export interface ResolvedTerminationReason {
  code: string
  builtin: boolean
  active: boolean
  label: string // مسمى الشاشات
  historyLabel: string // مسمى بند المكافأة وسجل التغييرات (الأساسي من eos.ts زي ما هو)
}

export function resolveTerminationReason(
  code: string | null | undefined,
  customs: CustomTerminationReason[]
): ResolvedTerminationReason | null {
  if (!code) return null
  if (isBuiltinTerminationReason(code)) {
    return {
      code,
      builtin: true,
      active: true,
      label: TERMINATION_REASON_DISPLAY_LABELS[code],
      historyLabel: TERMINATION_REASON_LABELS[code],
    }
  }
  const custom = customs.find((r) => r.code === code)
  return custom
    ? { code, builtin: false, active: custom.active, label: custom.label, historyLabel: custom.label }
    : null
}

// مسمى السبب في رد الملف: الملف القديم على سبب موقوف بيفضل بمسماه، والكود المش معروف بيظهر زي ما هو،
// والفاضي (ملفات قبل EMP-2) null
export const terminationReasonDisplayLabel = (
  code: string | null | undefined,
  customs: CustomTerminationReason[]
): string | null => (code ? (resolveTerminationReason(code, customs)?.label ?? code) : null)

// سبب ملف جديد (الفتح والمعاينة): أساسي، أو مخصص مفعّل
export function selectableTerminationReason(
  code: string,
  customs: CustomTerminationReason[]
): ResolvedTerminationReason {
  const reason = resolveTerminationReason(code, customs)
  if (!reason) throw new BadRequestException('سبب الإنهاء غير معروف')
  if (!reason.active) {
    throw new BadRequestException(
      `سبب الإنهاء «${reason.label}» موقوف — اختار سبب تاني، أو فعّله من «سياسات النظام» ← «أسباب إنهاء الخدمة»`
    )
  }
  return reason
}

// معاملات المخصص لسياسة المكافأة (المفعّل والموقوف)
export function customTerminationReasonFactors(
  customs: CustomTerminationReason[]
): NonNullable<EosPolicy['custom']> {
  const out: NonNullable<EosPolicy['custom']> = {}
  for (const reason of customs) {
    const factor = parseFactor(reason.eosFactor)
    if (factor) out[reason.code] = { ...factor, reasonLabel: reason.label }
  }
  return out
}

export interface TerminationReasonView {
  code: string
  label: string
  builtin: boolean
  active: boolean
  eosFactor: string | null // النسبة كما اتكتبت — الاستقالة null (بجدولها eos.resignation_factors)
  usedByCases?: number // المخصص: عدد ملفات الإنهاء عليه (المستخدم مايتشالش — يتعطل بس)
}

export function terminationReasonsView(
  policy: EosPolicy,
  customs: CustomTerminationReason[],
  usage: Map<string, number>
): TerminationReasonView[] {
  return [
    ...TERMINATION_REASONS.map((code) => ({
      code,
      label: TERMINATION_REASON_DISPLAY_LABELS[code],
      builtin: true,
      active: true,
      eosFactor: code === 'resignation' ? null : (policy.reasons[code]?.label ?? '1'),
    })),
    ...customs.map((reason) => ({
      code: reason.code,
      label: reason.label,
      builtin: false,
      active: reason.active,
      eosFactor: reason.eosFactor,
      usedByCases: usage.get(reason.code) ?? 0,
    })),
  ]
}

export interface CustomTerminationReasonInput {
  code?: string | null
  label?: unknown
  eosFactor?: unknown
  active?: boolean
}

// الحفظ: القائمة الكاملة الجديدة مقابل المخزنة. الكود الموجود ثابت (المسمى والنسبة والتفعيل بيتعدلوا)،
// والجديد يتبعت من غير كود والخادم بيولّده custom_N برقم عمره ما اتولّد. المستخدم في ملفات مايتشالش
export function planCustomTerminationReasons(input: {
  current: CustomTerminationReason[]
  submitted: CustomTerminationReasonInput[]
  usage: Map<string, number>
  lastSeq: number
  revision?: string // بصمة القائمة اللي الشاشة اتفتحت عليها (اختيارية لنداءات الـAPI المباشرة)
}): { reasons: CustomTerminationReason[]; lastSeq: number; added: string[]; removed: string[] } {
  const { current, submitted, usage } = input
  if (input.revision && input.revision !== customTerminationReasonsRevision(current)) {
    throw new ConflictException('قائمة أسباب إنهاء الخدمة اتغيرت من حد تاني من وقت ما فتحت الشاشة — حدّث الصفحة وأعد تعديلك')
  }
  if (submitted.length > CUSTOM_TERMINATION_REASONS_MAX) {
    throw new BadRequestException(`أقصى عدد للأسباب المخصصة ${CUSTOM_TERMINATION_REASONS_MAX} سبب`)
  }
  const known = new Set(current.map((r) => r.code))
  // المسمى مايتكررش مع مسمى أساسي (بصيغة الشاشات وصيغة بند المكافأة) ولا مع سبب تاني في القائمة
  const taken = new Map<string, { label: string; builtin: boolean }>()
  for (const code of TERMINATION_REASONS) {
    for (const label of [TERMINATION_REASON_DISPLAY_LABELS[code], TERMINATION_REASON_LABELS[code]]) {
      taken.set(labelKey(label), { label: TERMINATION_REASON_DISPLAY_LABELS[code], builtin: true })
    }
  }
  const seenCodes = new Set<string>()
  const rows: Array<Omit<CustomTerminationReason, 'code'> & { code: string | null }> = []
  submitted.forEach((row, index) => {
    const code = typeof row?.code === 'string' ? row.code.trim() : ''
    if (code) {
      if (!known.has(code)) {
        throw new BadRequestException(
          `الكود «${code}» مش لسبب مخصص موجود — السبب الجديد يتبعت من غير كود والنظام بيولّد كوده`
        )
      }
      if (seenCodes.has(code)) throw new BadRequestException(`الكود «${code}» متكرر في القائمة`)
      seenCodes.add(code)
    }
    const label = normalizeReasonLabel(row?.label)
    if (label.length < TERMINATION_REASON_LABEL_MIN || label.length > TERMINATION_REASON_LABEL_MAX) {
      throw new BadRequestException(
        label
          ? `مسمى السبب «${label}» لازم يكون من ${TERMINATION_REASON_LABEL_MIN} لـ ${TERMINATION_REASON_LABEL_MAX} حرف`
          : `مسمى السبب رقم ${index + 1} فاضي — اكتب من ${TERMINATION_REASON_LABEL_MIN} لـ ${TERMINATION_REASON_LABEL_MAX} حرف`
      )
    }
    const clash = taken.get(labelKey(label))
    if (clash) {
      throw new BadRequestException(
        clash.builtin
          ? `المسمى «${label}» هو مسمى السبب الأساسي «${clash.label}» — اختار مسمى مختلف`
          : `المسمى «${label}» متكرر — كل سبب بمسمى مختلف`
      )
    }
    taken.set(labelKey(label), { label, builtin: false })
    const factor = parseFactor(factorText(row?.eosFactor))
    if (!factor || factor.label.length > FACTOR_TEXT_MAX) {
      throw new BadRequestException(`نسبة المكافأة لـ«${label}» مش صالحة — رقم من 0 لـ 1 أو كسر زي 1/3`)
    }
    rows.push({ code: code || null, label, eosFactor: factor.label, active: row?.active !== false })
  })
  const removed = current.filter((r) => !seenCodes.has(r.code))
  const used = removed.filter((r) => (usage.get(r.code) ?? 0) > 0)
  if (used.length > 0) {
    throw new ConflictException(
      `${used.map((r) => `«${r.label}» عليه ${usage.get(r.code)} ملف إنهاء خدمة`).join('، ')} — السبب المستخدم مايتشالش، عطّله بس`
    )
  }
  const numberOf = (code: string) => Number(CUSTOM_CODE.exec(code)?.[1] ?? 0)
  let seq = Math.max(input.lastSeq, ...current.map((r) => numberOf(r.code)), ...[...usage.keys()].map(numberOf))
  const added: string[] = []
  const reasons = rows.map((row) => {
    if (row.code) return { ...row, code: row.code }
    const code = `custom_${++seq}`
    added.push(code)
    return { ...row, code }
  })
  return { reasons, lastSeq: seq, added, removed: removed.map((r) => r.code) }
}
