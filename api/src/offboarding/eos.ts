import { TERMINATION_REASONS, type TerminationReason } from './offboarding.entities'

// ============================================================
// مكافأة نهاية الخدمة (EMP-2): شرائح بسنوات الخدمة × معامل سبب الإنهاء.
// القيم من إعدادات المحرك (eos.*) وافتراضياتها نظام العمل السعودي:
// م84: نصف أجر شهر عن كل سنة من الخمس الأولى، وأجر شهر عن كل سنة بعدها.
// م85: المستقيل لا شيء قبل سنتين، والثلث من سنتين لخمس، والثلثان من خمس لعشر،
//      والمكافأة كاملة من عشر. م80: الفصل التأديبي بلا مكافأة.
// الإنهاء من صاحب العمل وانتهاء العقد والتقاعد والوفاة والعجز والقوة القاهرة = كاملة.
// ============================================================

const round2 = (n: number) => Math.round(n * 100) / 100

export const TERMINATION_REASON_LABELS: Record<TerminationReason, string> = {
  resignation: 'استقالة',
  termination: 'إنهاء من صاحب العمل',
  dismissal: 'فصل تأديبي (م80)',
  contract_end: 'انتهاء العقد',
  retirement: 'تقاعد',
  death: 'وفاة',
  disability: 'عجز صحي',
  force_majeure: 'قوة قاهرة',
}

// الملفات القديمة بلا سبب = استقالة (كانت المسار الوحيد لفتح ملف)
export const caseReason = (k: {
  terminationReason?: TerminationReason | null
}): TerminationReason => k.terminationReason ?? 'resignation'

// افتراضيات النظام = القيم المزروعة في configSeed (نظام العمل السعودي)
export const EOS_DEFAULTS = {
  firstTierMonths: '0.5', // eos.months_per_year
  firstTierYears: '5', // eos.tier1_years
  laterMonths: '1', // eos.months_per_year_after
  resignationFactors: '2:1/3,5:2/3,10:1', // eos.resignation_factors
  reasonFactors:
    'termination:1,dismissal:0,contract_end:1,retirement:1,death:1,disability:1,force_majeure:1', // eos.reason_factors
}

export interface EosFactor {
  factor: number
  label: string // المعامل كما كُتب في الإعداد (1/3، 0.5...)
}
export interface EosPolicy {
  firstTierMonths: number // أشهر الأجر عن كل سنة من الشريحة الأولى
  firstTierYears: number // سنوات الشريحة الأولى
  laterMonths: number // أشهر الأجر عن كل سنة بعدها
  resignation: Array<EosFactor & { fromYears: number }>
  reasons: Partial<Record<TerminationReason, EosFactor>>
}

// معامل: عشري (0.5) أو كسر (1/3) — بين 0 و1
const parseFactor = (raw: string | undefined): EosFactor | null => {
  const s = (raw ?? '').replace(/\s+/g, '')
  const frac = /^(\d+(?:\.\d+)?)\/(\d+(?:\.\d+)?)$/.exec(s)
  const n = frac
    ? Number(frac[1]) / Number(frac[2])
    : /^\d+(?:\.\d+)?$/.test(s)
      ? Number(s)
      : NaN
  return Number.isFinite(n) && n >= 0 && n <= 1 ? { factor: n, label: s } : null
}

const splitPairs = (v: string) =>
  String(v ?? '')
    .split(/[,،]/)
    .map((p) => p.trim())
    .filter(Boolean)

// جدول الاستقالة «سنوات:معامل» تصاعدي — من كل حد يسري معامله، وقبل أول حد لا مكافأة
export function parseResignationFactors(value: string): {
  rows?: EosPolicy['resignation']
  error?: string
} {
  const parts = splitPairs(value)
  if (parts.length === 0) {
    return { error: 'أدخل جدول الاستقالة بصيغة سنوات:معامل — مثال 2:1/3,5:2/3,10:1' }
  }
  const rows: EosPolicy['resignation'] = []
  for (const p of parts) {
    const [y, f, extra] = p.split(':')
    const years = Number((y ?? '').trim())
    const factor = parseFactor(f)
    if (extra !== undefined || !(y ?? '').trim() || !Number.isFinite(years) || years < 0 || !factor) {
      return {
        error: `«${p}» غير صالح — الصيغة سنوات:معامل والمعامل بين 0 و1 (مثل 1/3 أو 0.5)`,
      }
    }
    if (rows.length > 0 && years <= rows[rows.length - 1].fromYears) {
      return { error: 'سنوات جدول الاستقالة لازم تكون تصاعدية ومن غير تكرار' }
    }
    rows.push({ fromYears: years, ...factor })
  }
  return { rows }
}

// معامل كل سبب «سبب:معامل» — الاستقالة تتبع جدولها، والسبب غير المذكور ياخد افتراضي النظام
export function parseReasonFactors(value: string): {
  map?: EosPolicy['reasons']
  error?: string
} {
  const map: EosPolicy['reasons'] = {}
  for (const p of splitPairs(value)) {
    const [code, f, extra] = p.split(':')
    const reason = (code ?? '').trim() as TerminationReason
    if (!TERMINATION_REASONS.includes(reason) || reason === 'resignation') {
      return {
        error: `«${(code ?? '').trim()}» ليس سبب إنهاء معروفاً — المتاح: ${TERMINATION_REASONS.filter(
          (r) => r !== 'resignation'
        ).join('، ')} (الاستقالة لها جدولها)`,
      }
    }
    const factor = parseFactor(f)
    if (extra !== undefined || !factor) {
      return { error: `«${p}» غير صالح — الصيغة سبب:معامل والمعامل بين 0 و1` }
    }
    if (map[reason]) return { error: `السبب «${reason}» مكرر` }
    map[reason] = factor
  }
  return { map }
}

// تحقق مفاتيح الجداول قبل الحفظ (PATCH /settings/config) — null = صالحة
export function eosConfigError(key: string, value: string): string | null {
  if (key === 'eos.resignation_factors') {
    return parseResignationFactors(value).error ?? null
  }
  if (key === 'eos.reason_factors') return parseReasonFactors(value).error ?? null
  return null
}

const DEFAULT_RESIGNATION = parseResignationFactors(EOS_DEFAULTS.resignationFactors).rows!
const DEFAULT_REASONS = parseReasonFactors(EOS_DEFAULTS.reasonFactors).map!

// السياسة من قيم الإعدادات الخام — القيمة التالفة ترجع لافتراضي النظام
export function buildEosPolicy(raw: {
  firstTierMonths: string
  firstTierYears: string
  laterMonths: string
  resignationFactors: string
  reasonFactors: string
}): EosPolicy {
  const num = (v: string, d: string) => {
    const n = Number(v)
    return v !== '' && Number.isFinite(n) && n >= 0 ? n : Number(d)
  }
  return {
    firstTierMonths: num(raw.firstTierMonths, EOS_DEFAULTS.firstTierMonths),
    firstTierYears: num(raw.firstTierYears, EOS_DEFAULTS.firstTierYears),
    laterMonths: num(raw.laterMonths, EOS_DEFAULTS.laterMonths),
    resignation:
      parseResignationFactors(raw.resignationFactors).rows ?? DEFAULT_RESIGNATION,
    reasons: {
      ...DEFAULT_REASONS,
      ...(parseReasonFactors(raw.reasonFactors).map ?? {}),
    },
  }
}

// 'YYYY-MM-DD' → UTC ms (NaN للتاريخ غير الحقيقي مثل 2026-02-30)
const utcOf = (ymd: string) => {
  const m = /^(\d{4})-(\d{2})-(\d{2})/.exec(String(ymd ?? ''))
  if (!m) return NaN
  const t = Date.UTC(+m[1], +m[2] - 1, +m[3])
  const d = new Date(t)
  return d.getUTCMonth() === +m[2] - 1 && d.getUTCDate() === +m[3] ? t : NaN
}
export const isValidYmd = (s: string) => Number.isFinite(utcOf(s))

// سنوات الخدمة بالتقويم من تاريخ التعيين حتى نهاية آخر يوم عمل (شاملاً له):
// سنوات كاملة بالذكرى السنوية + كسر السنة الجارية بالأيام — خدمة 2021-01-01 →
// 2022-12-31 سنتان بالضبط (حد م85)، مش 1.99 زي القسمة على 365.25
export function serviceYears(joinDate: string, lastWorkingDay: string): number {
  const start = utcOf(joinDate)
  const end = utcOf(lastWorkingDay) + 86400000
  if (!Number.isFinite(start) || !Number.isFinite(end) || end <= start) return 0
  const s = new Date(start)
  const anniv = (n: number) =>
    Date.UTC(s.getUTCFullYear() + n, s.getUTCMonth(), s.getUTCDate())
  let years = new Date(end).getUTCFullYear() - s.getUTCFullYear()
  while (years > 0 && anniv(years) > end) years--
  const from = anniv(years)
  return years + (end - from) / (anniv(years + 1) - from)
}

export interface EosResult {
  reason: TerminationReason
  years: number
  firstYears: number // سنوات محسوبة بمعدل الشريحة الأولى
  laterYears: number // سنوات بعدها
  fullMonths: number // أشهر الأجر للمكافأة الكاملة
  factor: number // معامل سبب الإنهاء (الاستقالة من جدولها)
  factorLabel: string
  full: number // المكافأة الكاملة قبل المعامل
  amount: number // المستحق
}

export function computeEos(
  wage: number,
  years: number,
  reason: TerminationReason,
  p: EosPolicy
): EosResult {
  const firstYears = Math.min(years, p.firstTierYears)
  const laterYears = Math.max(0, years - p.firstTierYears)
  const fullMonths = firstYears * p.firstTierMonths + laterYears * p.laterMonths
  const f: EosFactor =
    reason === 'resignation'
      ? ([...p.resignation].reverse().find((r) => years >= r.fromYears) ?? {
          factor: 0,
          label: '0',
        })
      : (p.reasons[reason] ?? { factor: 1, label: '1' })
  const full = round2(wage * fullMonths)
  return {
    reason,
    years,
    firstYears,
    laterYears,
    fullMonths,
    factor: f.factor,
    factorLabel: f.label,
    full,
    amount: round2(full * f.factor),
  }
}

// وصف بند المكافأة في التصفية (≤ 200 حرف) — الشرائح والمعامل ظاهرين للمراجِع
export function eosLineLabel(r: EosResult, p: EosPolicy): string {
  const n = (x: number) => String(round2(x))
  const formula =
    r.laterYears > 0
      ? `${n(r.firstYears)}×${n(p.firstTierMonths)} + ${n(r.laterYears)}×${n(p.laterMonths)} شهر`
      : `${n(r.firstYears)}×${n(p.firstTierMonths)} شهر`
  const factor = r.factor !== 1 ? ` × ${r.factorLabel}` : ''
  const none = r.amount === 0 ? ' — لا تستحق' : ''
  return `مكافأة نهاية الخدمة — ${TERMINATION_REASON_LABELS[r.reason]} (${r.years.toFixed(2)} سنة: ${formula}${factor})${none}`
}
