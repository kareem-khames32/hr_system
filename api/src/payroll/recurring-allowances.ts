import { BadRequestException } from '@nestjs/common'

// «البدل الثابت الشهري» في «تابة البدلات» (طلب المالك 26 سبتمبر — أول استخدام «بدل ضغط عمل») — قواعد نقية بلا قاعدة بيانات:
// - الموارد البشرية بتسند نوع بدل (من أنواع التابة نفسها) لموظفين بمبلغ شهري ثابت لكل موظف، من شهر رواتب (YYYY-MM) ولحد شهر
//   اختياري؛ بينزل لوحده في مسير كل شهر بيغطيه، سطر باسم النوع مع الراتب (قيد «بدل» CREDIT في دفتر المديونيات، زي بدل الشهر الواحد).
// - مالوش أي مؤثرات: مش داخل في أساس سعر ساعة الإضافي، ولا في أساس خصم التأخير أو الغياب أو الانصراف المبكر أو نقص الساعات
//   أو الإجازة بدون راتب أو الإيقاف (كلهم على الراتب لوحده)، ولا في سقف الخصم ولا أرضية الصافي (حماية الصافي بتحسب مساحة الخصم
//   من غيره، فبيتصرف كامل مهما كانت الخصومات والأقساط)، ولا في مكافأة نهاية الخدمة. الغياب والتأخير والإضافي والإجازة بدون راتب
//   ما بيغيروش مبلغه.
// - التعديل الوحيد: اللي بيبدأ أو بينتهي شغله جوه فترة المسير بياخده بنسبة أيام خدمته فيها — نفس أساس راتب المنضم والمغادر بالحرف
//   (payroll-employment + payroll.service): الدورة كاملة = المبلغ كامل، وغير كده المبلغ × أيام التغطية ÷ أيام الشهر (30) مقصوص
//   لقرشين وبسقف المبلغ. اللي مش في الخدمة خالص في الفترة ما ياخدش حاجة.
// - كل شهر لكل إسناد = قيد واحد بمرجع ثابت recurring-allowance:<رقم الإسناد>:<الشهر>: إعادة حساب المسير بتحدّث نفس القيد
//   (ما بيتكررش)، والمحجوز لمسير معتمد والمصروف ما بيتلمسش. والقيد بيتصرف في مسير شهره بس — ما بيترحّلش لشهر تاني.

export const RECURRING_ALLOWANCE_SOURCE_PREFIX = 'recurring-allowance:'
export const RECURRING_ALLOWANCE_STATUSES = ['ACTIVE', 'STOPPED'] as const
export type RecurringAllowanceStatus = typeof RECURRING_ALLOWANCE_STATUSES[number]

const MONTH = /^\d{4}-(0[1-9]|1[0-2])$/
const SOURCE_REF = /^recurring-allowance:(\d{1,10}):(\d{4}-(?:0[1-9]|1[0-2]))$/
const fail = (message: string): never => { throw new BadRequestException(message) }

export const isPayrollMonth = (value: unknown): value is string => typeof value === 'string' && MONTH.test(value)

/** الشهر بعد/قبل كام شهر (YYYY-MM). */
export function shiftPayrollMonth(period: string, months: number): string {
  if (!isPayrollMonth(period) || !Number.isInteger(months)) throw new Error('شهر رواتب غير صالح')
  const [year, month] = period.split('-').map(Number)
  const index = year * 12 + (month - 1) + months
  return `${Math.floor(index / 12)}-${String((index % 12) + 1).padStart(2, '0')}`
}

export const recurringAllowanceSourceRef = (assignmentId: number, period: string) => `${RECURRING_ALLOWANCE_SOURCE_PREFIX}${assignmentId}:${period}`

export function parseRecurringAllowanceSourceRef(ref: unknown): { assignmentId: number; period: string } | null {
  const match = typeof ref === 'string' ? SOURCE_REF.exec(ref) : null
  if (!match) return null
  const assignmentId = Number(match[1])
  return Number.isSafeInteger(assignmentId) && assignmentId > 0 ? { assignmentId, period: match[2] } : null
}

export const isRecurringAllowanceSourceRef = (ref: unknown): boolean => typeof ref === 'string' && ref.startsWith(RECURRING_ALLOWANCE_SOURCE_PREFIX)

// ===== شهور الإسناد =====
export interface RecurringAllowanceWindow {
  fromPeriod: string
  // آخر شهر مخطط (شامل)؛ null = مفتوح
  untilPeriod: string | null
  // أول شهر ما يتصرفش بعد «إيقاف»؛ null = ما اتوقفش
  stoppedFromPeriod: string | null
}

/** أول شهر بعد نهاية البدل (مش داخل): الأصغر بين (شهر النهاية + 1) وشهر الإيقاف؛ null = مفتوح. */
export function recurringAllowanceEndExclusive(row: RecurringAllowanceWindow): string | null {
  const ends = [row.untilPeriod ? shiftPayrollMonth(row.untilPeriod, 1) : null, row.stoppedFromPeriod].filter((value): value is string => !!value).sort()
  return ends[0] ?? null
}

/** البدل بيغطي شهر المسير ده؟ */
export function recurringAllowanceCovers(row: RecurringAllowanceWindow, period: string): boolean {
  const end = recurringAllowanceEndExclusive(row)
  return period >= row.fromPeriod && (end === null || period < end)
}

/** آخر شهر بيتصرف فيه (للعرض): null = مفتوح؛ ولو قبل شهر البداية = الإسناد ما غطاش ولا شهر (اتوقف قبل ما يبدأ). */
export function recurringAllowanceLastMonth(row: RecurringAllowanceWindow): string | null {
  const end = recurringAllowanceEndExclusive(row)
  return end === null ? null : shiftPayrollMonth(end, -1)
}

export const recurringAllowanceCoversAnyMonth = (row: RecurringAllowanceWindow) => {
  const end = recurringAllowanceEndExclusive(row)
  return end === null || end > row.fromPeriod
}

/** إسنادين لنفس النوع ونفس الموظف بيتقاطعوا في شهر واحد على الأقل؟ (نفس البدل ما يتصرفش مرتين في نفس الشهر) */
export function recurringAllowancesOverlap(a: RecurringAllowanceWindow, b: RecurringAllowanceWindow): boolean {
  if (!recurringAllowanceCoversAnyMonth(a) || !recurringAllowanceCoversAnyMonth(b)) return false
  const aEnd = recurringAllowanceEndExclusive(a), bEnd = recurringAllowanceEndExclusive(b)
  return (aEnd === null || b.fromPeriod < aEnd) && (bEnd === null || a.fromPeriod < bEnd)
}

/** شهر البداية والنهاية من الشاشة: البداية إجبارية، والنهاية اختيارية ومش قبل البداية. */
export function recurringAllowanceWindowInput(input: { fromPeriod: unknown; untilPeriod?: unknown }): { fromPeriod: string; untilPeriod: string | null } {
  if (!isPayrollMonth(input.fromPeriod)) fail('اختار شهر البداية بصيغة YYYY-MM')
  const fromPeriod = input.fromPeriod as string
  const rawUntil = input.untilPeriod
  if (rawUntil === undefined || rawUntil === null || rawUntil === '') return { fromPeriod, untilPeriod: null }
  if (!isPayrollMonth(rawUntil)) fail('شهر النهاية بصيغة YYYY-MM أو سيبه فاضي')
  const untilPeriod = rawUntil as string
  if (untilPeriod < fromPeriod) fail('شهر النهاية قبل شهر البداية')
  return { fromPeriod, untilPeriod }
}

// ===== مبلغ الشهر =====
export interface RecurringAllowanceCoverage {
  // التغطية = فترة المسير كلها (نفس شرط الراتب: من أول يوم لآخر يوم)
  fullCoverage: boolean
  coverDays: number
  monthlyDays: number
}

/**
 * مبلغ الشهر بالقروش — نفس تناسب راتب المنضم/المغادر في payroll.service بالحرف: الدورة كاملة = المبلغ كامل مهما كان طولها؛
 * غير كده المبلغ × أيام التغطية ÷ أيام الشهر مقصوص لقرش، بسقف المبلغ كامل. مفيش تغطية = صفر.
 * (الغياب والتأخير والإضافي والإجازة بدون راتب والإيقاف ما بيدخلوش هنا خالص.)
 */
export function recurringAllowanceMonthCents(amountCents: number, coverage: RecurringAllowanceCoverage): number {
  if (!Number.isSafeInteger(amountCents) || amountCents < 0) throw new Error('مبلغ البدل الثابت بالقروش غير صالح')
  if (coverage.fullCoverage) return amountCents
  if (!(coverage.coverDays > 0) || !(coverage.monthlyDays > 0)) return 0
  return Math.min(amountCents, Math.trunc(amountCents * coverage.coverDays / coverage.monthlyDays))
}

// ===== قيد الشهر في الدفتر (الحساب وإعادة الحساب) =====
export interface RecurringCreditRow {
  id: number
  status: string
  amount: string | number
  label?: string | null
  targetPeriod?: string | null
  reservedPayrollRunId: number | null
  payrollReversalOfObligationId: number | null
  carriedFromObligationId: number | null
}

const cents = (value: unknown) => Math.round(Number(value ?? 0) * 100)

/** قيد يديره حساب المسير: مستحق ومش محجوز لمسير معتمد ومش إعادة بعد عكس صرف ولا مرحّل. غيره اتسوّى وما يتلمسش. */
export const isManagedRecurringCredit = (row: Pick<RecurringCreditRow, 'status' | 'reservedPayrollRunId' | 'payrollReversalOfObligationId' | 'carriedFromObligationId'>) =>
  row.status === 'PENDING' && row.reservedPayrollRunId == null && row.payrollReversalOfObligationId == null && row.carriedFromObligationId == null

export type RecurringAllowanceMonthPlan =
  | { kind: 'SETTLED'; settledId: number; settledCents: number; cancel: number[] }
  | { kind: 'NONE'; cancel: number[] }
  | { kind: 'KEEP'; id: number; update: boolean; cancel: number[] }
  | { kind: 'CREATE'; cancel: number[] }

/**
 * قرار شهر واحد لإسناد واحد (مفتاح الـidempotency = المرجع الثابت للإسناد والشهر):
 * - فيه قيد اتسوّى (محجوز لمسير معتمد، اتصرف، أو إعادة بعد عكس) = الشهر ده اتعمل حسابه: ولا قيد جديد، والمُدار الزيادة يتلغي.
 * - المبلغ المطلوب صفر = مفيش قيد (والمُدار يتلغي).
 * - فيه قيد مُدار = يفضل الأقدم (ويتحدّث لو المبلغ أو الاسم أو الشهر اختلف) والباقي يتلغي؛ مفيش = قيد جديد.
 */
export function planRecurringAllowanceMonth(rows: readonly RecurringCreditRow[], wantedCents: number, label: string, period: string): RecurringAllowanceMonthPlan {
  const live = rows.filter(row => row.status !== 'CANCELLED')
  const managed = live.filter(isManagedRecurringCredit).sort((a, b) => a.id - b.id)
  const settled = live.filter(row => !isManagedRecurringCredit(row)).sort((a, b) => a.id - b.id)
  if (settled.length) return { kind: 'SETTLED', settledId: settled[0].id, settledCents: cents(settled[0].amount), cancel: managed.map(row => row.id) }
  if (!(wantedCents > 0)) return { kind: 'NONE', cancel: managed.map(row => row.id) }
  const [keep, ...rest] = managed
  if (!keep) return { kind: 'CREATE', cancel: [] }
  return { kind: 'KEEP', id: keep.id, update: cents(keep.amount) !== wantedCents || (keep.label ?? null) !== label || (keep.targetPeriod ?? null) !== period,
    cancel: rest.map(row => row.id) }
}

/** قيد البدل الثابت المُدار لشهر غير شهر المسير: ما يدخلش المسير ده (بيتصرف مع راتب شهره بس، زي ما بيتحسب). */
export function isForeignMonthRecurringCredit(row: { sourceRef?: string | null; targetPeriod?: string | null; payrollReversalOfObligationId?: number | null; carriedFromObligationId?: number | null },
  runPeriod: string): boolean {
  return isRecurringAllowanceSourceRef(row.sourceRef) && row.payrollReversalOfObligationId == null && row.carriedFromObligationId == null &&
    (row.targetPeriod ?? null) !== runPeriod
}

// ===== الإيقاف =====
/**
 * «إيقاف» البدل: أول شهر ما يتصرفش. الافتراضي = الشهر اللي بعد آخر شهر اتعتمد أو اتصرف فيه البدل (أو شهر البداية لو محدش
 * اتسوّى) — يعني أي شهر مسيره لسه ما اتعتمدش ما ياخدوش. المطلوب قبل كده مرفوض (المعتمد والمصروف ما بيتغيرش)، والإيقاف بعد
 * نهاية البدل ملوش معنى.
 */
export function planRecurringAllowanceStop(row: RecurringAllowanceWindow & { status: string }, settledPeriods: readonly string[], requested?: unknown): { stopFrom: string; earliest: string } {
  if (row.status === 'STOPPED') fail('البدل ده موقوف من قبل')
  const sorted = [...settledPeriods].sort()
  const lastSettled = sorted.length ? sorted[sorted.length - 1] : null
  const earliest = lastSettled && lastSettled >= row.fromPeriod ? shiftPayrollMonth(lastSettled, 1) : row.fromPeriod
  const empty = requested === undefined || requested === null || requested === ''
  if (!empty && !isPayrollMonth(requested)) fail('شهر الإيقاف بصيغة YYYY-MM أو سيبه فاضي')
  const stopFrom = empty ? earliest : requested as string
  if (stopFrom < earliest) {
    fail(lastSettled ? `بدل شهر ${lastSettled} في مسير معتمد أو اتصرف — الإيقاف يبدأ من ${earliest} أو بعده` : `الإيقاف يبدأ من شهر البداية ${earliest} أو بعده`)
  }
  const end = recurringAllowanceEndExclusive(row)
  if (end !== null && stopFrom >= end) fail(`البدل بينتهي في ${shiftPayrollMonth(end, -1)} — مفيش شهور بعده توقفها`)
  return { stopFrom, earliest }
}
