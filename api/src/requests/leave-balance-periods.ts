// ============================================================
// سنة الرصيد حسب إعداد نوع الإجازة (شاشة أنواع الإجازات):
// - YEAR_START: صف بمفتاح السنة 'YYYY' = من 1 يناير إلى 31 ديسمبر (السلوك القديم)
// - HIRE_ANNIVERSARY: صف بمفتاح تاريخ ذكرى التعيين 'YYYY-MM-DD' حتى اليوم السابق للذكرى التالية
// الصفوف القائمة تبقى بمعناها: صف السنة لا يُعاد تفسيره. أول سنة ذكرى بعد صف سنة تبدأ
// اليوم التالي لنهايته (والعكس)، واستحقاقها بنسبة أيامها الفعلية من السنة الكاملة.
// دوال صرفة بلا قاعدة بيانات — تُختبر في test/leave-balance-periods.test.cjs
// ============================================================

export type RenewalBasis = 'YEAR_START' | 'HIRE_ANNIVERSARY'

export interface BalanceTypeSettings {
  annualDays: number
  renewalBasis: RenewalBasis
  carryOverEnabled: boolean
  // null = بلا سقف
  carryOverMaxDays: number | null
  // الموظف الجديد: الاستحقاق السنوي يبدأ بعد كام شهر من التعيين (null = الإعداد العام leave.probation_months)
  entitlementStartMonths: number | null
  // أول سنة يستحق فيها: بالنسبة من يوم الاستحقاق لآخر السنة، أو كاملة
  firstYearProrated: boolean
}

export interface LeaveTypeBalanceFields {
  id?: number
  code: string
  category?: string | null
  balanceType?: string | null
  isActive?: boolean | null
  annualDays?: number | string | null
  renewalBasis?: string | null
  carryOverEnabled?: boolean | null
  carryOverMaxDays?: number | string | null
  entitlementStartMonths?: number | string | null
  firstYearProrated?: boolean | null
}

// الإعدادات العامة القديمة — احتياطي لو النوع غير موجود أو أيامه فارغة
export interface BalanceGlobals {
  annual: number
  sick: number
  carryOverMaxDays: number
}

export interface PeriodEntry<R> {
  row: R
  key: string
  calendar: boolean
  nominalStart: string
  nominalEnd: string
  // النافذة الفعلية بعد قصّ التداخل مع الصف السابق
  start: string
  end: string
}

const DAY = 86_400_000
const DATE_RE = /^\d{4}-\d{2}-\d{2}$/
const YEAR_RE = /^\d{4}$/
const pad = (n: number, w = 2) => String(n).padStart(w, '0')
const parts = (d: string) => d.split('-').map(Number) as [number, number, number]
const utc = (d: string) => {
  const [y, m, day] = parts(d)
  return Date.UTC(y, m - 1, day)
}
const fmt = (t: number) => {
  const d = new Date(t)
  return `${pad(d.getUTCFullYear(), 4)}-${pad(d.getUTCMonth() + 1)}-${pad(d.getUTCDate())}`
}
export const round2 = (n: number) => Math.round(n * 100) / 100

export const isDateKey = (s: unknown): boolean => typeof s === 'string' && DATE_RE.test(s)
export const isYearKey = (s: unknown): boolean => typeof s === 'string' && YEAR_RE.test(s)
export const addDays = (d: string, n: number) => fmt(utc(d) + n * DAY)
// نفس سلوك Date.setMonth (تجاوز اليوم يرحّل للشهر التالي)
export const addMonths = (d: string, n: number) => {
  const [y, m, day] = parts(d)
  return fmt(Date.UTC(y, m - 1 + n, day))
}
export const dayCount = (from: string, to: string) => Math.round((utc(to) - utc(from)) / DAY) + 1

const validJoin = (joinDate: string | null | undefined): string | null => {
  const s = joinDate == null ? '' : String(joinDate).slice(0, 10)
  return DATE_RE.test(s) && !Number.isNaN(utc(s)) ? s : null
}
const isLeap = (y: number) => (y % 4 === 0 && y % 100 !== 0) || y % 400 === 0

// ذكرى التعيين في سنة (29 فبراير → 28 فبراير في السنة غير الكبيسة)
export function anniversaryOn(joinDate: string, year: number): string {
  const mm = joinDate.slice(5, 7)
  const dd = mm === '02' && joinDate.slice(8, 10) === '29' && !isLeap(year) ? '28' : joinDate.slice(8, 10)
  return `${pad(year, 4)}-${mm}-${dd}`
}

export function lastAnniversaryOnOrBefore(joinDate: string, date: string): string {
  const y = Number(date.slice(0, 4))
  const a = anniversaryOn(joinDate, y)
  return a <= date ? a : anniversaryOn(joinDate, y - 1)
}

// الأساس الفعلي لموظف: الذكرى تحتاج تاريخ تعيين صالح وإلا بداية السنة
export function effectiveBasis(basis: RenewalBasis, joinDate: string | null | undefined): RenewalBasis {
  return basis === 'HIRE_ANNIVERSARY' && validJoin(joinDate) ? 'HIRE_ANNIVERSARY' : 'YEAR_START'
}

// مفتاح صف السنة الذي يغطي تاريخًا لو لم يوجد صف
export function periodKeyFor(date: string, joinDate: string | null | undefined, basis: RenewalBasis): string {
  const join = validJoin(joinDate)
  return basis === 'HIRE_ANNIVERSARY' && join ? lastAnniversaryOnOrBefore(join, date) : date.slice(0, 4)
}

export function nominalWindow(
  key: string,
  joinDate: string | null | undefined
): { start: string; end: string; calendar: boolean } | null {
  if (isYearKey(key)) return { start: `${key}-01-01`, end: `${key}-12-31`, calendar: true }
  if (!isDateKey(key)) return null
  const join = validJoin(joinDate)
  let next = addMonths(key, 12)
  if (join) {
    // أول ذكرى بعد بداية الصف (تعديل تاريخ التعيين لا يمدّ الصف لأكثر من سنة)
    next = anniversaryOn(join, Number(key.slice(0, 4)))
    if (next <= key) next = anniversaryOn(join, Number(key.slice(0, 4)) + 1)
  }
  return { start: key, end: addDays(next, -1), calendar: false }
}

// الخط الزمني لصفوف موظف/نوع: كل يوم يتبع صفًا واحدًا. الأقدم بداية يحتفظ بنافذته
// والتالي يبدأ بعد نهايته. تحت أساس الذكرى، صف سنة أُنشئ بعد صف ذكرى يغطي 1 يناير
// (من شاشة أخرى) لا يُعتد به.
export function balanceTimeline<R extends { id?: number; period: string }>(
  rows: R[],
  joinDate: string | null | undefined,
  basis: RenewalBasis
): PeriodEntry<R>[] {
  const idOf = (r: R) => Number(r.id ?? Number.MAX_SAFE_INTEGER)
  let entries: PeriodEntry<R>[] = []
  for (const row of rows) {
    const w = nominalWindow(String(row.period), joinDate)
    if (w) entries.push({ row, key: String(row.period), calendar: w.calendar, nominalStart: w.start, nominalEnd: w.end, start: w.start, end: w.end })
  }
  if (effectiveBasis(basis, joinDate) === 'HIRE_ANNIVERSARY') {
    const dated = entries.filter((e) => !e.calendar)
    entries = entries.filter(
      (e) =>
        !e.calendar ||
        !dated.some((d) => d.nominalStart <= e.nominalStart && e.nominalStart <= d.nominalEnd && idOf(d.row) < idOf(e.row))
    )
  }
  entries.sort((a, b) => (a.nominalStart < b.nominalStart ? -1 : a.nominalStart > b.nominalStart ? 1 : idOf(a.row) - idOf(b.row)))
  const out: PeriodEntry<R>[] = []
  let prevEnd: string | null = null
  for (const e of entries) {
    const start: string = prevEnd && addDays(prevEnd, 1) > e.nominalStart ? addDays(prevEnd, 1) : e.nominalStart
    if (start > e.nominalEnd) continue
    out.push({ ...e, start })
    prevEnd = e.nominalEnd
  }
  return out
}

export function periodAt<R>(timeline: PeriodEntry<R>[], date: string): PeriodEntry<R> | null {
  return timeline.find((e) => e.start <= date && date <= e.end) ?? null
}

// الصف السابق مباشرة في الخط الزمني (اللي انتهى قبل بداية هذا الصف)
export function previousEntry<R>(timeline: PeriodEntry<R>[], entry: PeriodEntry<R>): PeriodEntry<R> | null {
  let prev: PeriodEntry<R> | null = null
  for (const e of timeline) if (e.end < entry.start && (!prev || e.end > prev.end)) prev = e
  return prev
}

// نسبة النافذة الفعلية من السنة الكاملة (1 للسنة العادية)
export function entitlementFactor(e: { start: string; end: string; nominalStart: string; nominalEnd: string }): number {
  const full = dayCount(e.nominalStart, e.nominalEnd)
  const actual = dayCount(e.start, e.end)
  return full > 0 && actual < full ? actual / full : 1
}

export function prorate(fullYear: number, e: { start: string; end: string; nominalStart: string; nominalEnd: string }): number {
  const f = entitlementFactor(e)
  return f === 1 ? fullYear : round2(fullYear * f)
}

// أول يوم يستحق فيه الموظف رصيده السنوي: التعيين + شهور بداية الاستحقاق (0 = يوم التعيين)؛
// بلا تاريخ تعيين صالح = لا بوابة (null)
export function entitlementEligibleDate(joinDate: string | null | undefined, months: number | null | undefined): string | null {
  const join = validJoin(joinDate)
  if (!join) return null
  const m = Number(months)
  return Number.isFinite(m) && m > 0 ? addMonths(join, m) : join
}

// المتراكم لتاريخه: شهري = استحقاق السنة÷12 لكل شهر خدمة مكتمل داخل النافذة، يومي =
// استحقاق السنة÷أيام السنة الكاملة لكل يوم خدمة داخلها، سنوي/غير السنوي = الكامل.
// السنوي قبل يوم الاستحقاق (التعيين + probationMonths) = 0 في كل الطرق. أول سنة يستحق فيها:
// بالنسبة (prorateFirstYear، الافتراضي) = من يوم الاستحقاق بس؛ كاملة = السنوي كامل والشهري/اليومي
// يعدّ من أول النافذة أو التعيين (الشهور اللي قبل الاستحقاق تتحسب لما يستحق)
export function accruedDays(args: {
  balanceType: string
  fullYear: number
  entitlement: number
  onDate: string
  joinDate: string | null | undefined
  mode: string
  probationMonths: number
  prorateFirstYear?: boolean
  inclusiveEnd?: boolean
  window: { start: string; end: string; nominalStart: string; nominalEnd: string }
}): number {
  const { balanceType, fullYear, entitlement, onDate, mode, probationMonths, window } = args
  if (balanceType !== 'annual') return entitlement
  const join = validJoin(args.joinDate)
  const eligible = entitlementEligibleDate(join, probationMonths)
  const prorateFirst = args.prorateFirstYear !== false
  if (eligible && (eligible > window.end || onDate < eligible)) return 0
  if (mode !== 'monthly' && mode !== 'daily') {
    if (!eligible || !prorateFirst || eligible <= window.start) return entitlement
    return Math.min(entitlement, round2((dayCount(eligible, window.end) * fullYear) / dayCount(window.nominalStart, window.nominalEnd)))
  }
  let start = window.start
  if (join && eligible) {
    const from = prorateFirst ? eligible : join
    if (from > start) start = from
  }
  if (onDate < start) return 0
  if (mode === 'daily') {
    const end = onDate > window.end ? window.end : onDate
    const accrued = round2((dayCount(start, end) * fullYear) / dayCount(window.nominalStart, window.nominalEnd))
    return Math.min(entitlement, Math.max(0, accrued))
  }
  // التسوية تشمل آخر يوم عمل
  const now = args.inclusiveEnd ? addDays(onDate, 1) : onDate
  const [ny, nm, nd] = parts(now)
  const [sy, sm, sd] = parts(start)
  let months = (ny - sy) * 12 + (nm - sm)
  if (nd < sd) months -= 1
  months = Math.max(0, months)
  return Math.min(entitlement, round2((months * fullYear) / 12))
}

// الترحيل عند التجديد: فقط لو مفعّل، وبحد أقصى السقف (null = بلا سقف)
export function carryOverDays(settings: Pick<BalanceTypeSettings, 'carryOverEnabled' | 'carryOverMaxDays'>, remaining: number): number {
  if (!settings.carryOverEnabled) return 0
  const r = Math.max(0, round2(Number(remaining) || 0))
  return settings.carryOverMaxDays == null ? r : Math.min(settings.carryOverMaxDays, r)
}

// صلاحية المُرحّل: بداية السنة الجديدة + عدد الشهور − يوم (1 يناير + 3 = 31 مارس)
export function carryOverExpiry(periodStart: string, months: number): string {
  return addDays(addMonths(periodStart, months), -1)
}

const CATEGORY: Record<'annual' | 'sick', string> = { annual: 'ANNUAL', sick: 'SICK' }

// إعداد رصيد النوع: نوع الإجازة ANNUAL/SICK (الكود أولًا ثم الفئة)؛ غيابه = الإعدادات العامة القديمة
export function balanceTypeSettings(
  types: LeaveTypeBalanceFields[],
  balanceType: 'annual' | 'sick',
  globals: BalanceGlobals
): BalanceTypeSettings {
  const cat = CATEGORY[balanceType]
  const candidates = types
    .filter((t) => t.code === cat || (t.category === cat && (t.balanceType ?? balanceType) === balanceType))
    .sort(
      (a, b) =>
        Number(b.code === cat) - Number(a.code === cat) ||
        Number(b.isActive !== false) - Number(a.isActive !== false) ||
        Number(a.id ?? 0) - Number(b.id ?? 0)
    )
  const t = candidates[0]
  const fallbackDays = globals[balanceType]
  if (!t) {
    return {
      annualDays: fallbackDays,
      renewalBasis: 'YEAR_START',
      carryOverEnabled: balanceType === 'annual',
      carryOverMaxDays: balanceType === 'annual' ? globals.carryOverMaxDays : null,
      entitlementStartMonths: null,
      firstYearProrated: true,
    }
  }
  const days = t.annualDays == null || t.annualDays === '' ? NaN : Number(t.annualDays)
  const cap = t.carryOverMaxDays == null || t.carryOverMaxDays === '' ? NaN : Number(t.carryOverMaxDays)
  const start = t.entitlementStartMonths == null || t.entitlementStartMonths === '' ? NaN : Number(t.entitlementStartMonths)
  return {
    annualDays: Number.isFinite(days) && days >= 0 ? days : fallbackDays,
    renewalBasis: t.renewalBasis === 'HIRE_ANNIVERSARY' ? 'HIRE_ANNIVERSARY' : 'YEAR_START',
    carryOverEnabled: t.carryOverEnabled === true,
    carryOverMaxDays: Number.isFinite(cap) && cap >= 0 ? cap : null,
    entitlementStartMonths: Number.isFinite(start) && start >= 0 ? start : null,
    firstYearProrated: t.firstYearProrated !== false,
  }
}
