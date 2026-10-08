import { BadRequestException, ConflictException } from '@nestjs/common'
import { Column, Entity, PrimaryGeneratedColumn, type EntityManager } from 'typeorm'
import { EmployeeObligation } from '../requests/entities/financial.entities'
import type { Request } from '../requests/entities/request.entity'
import type { RequestType } from '../requests/entities/request-type.entity'
import { advanceCode, attachedAdvance, TravelAdvance } from './travel-advances'

// B5.3 (أ): تقارير المصروفات — تقرير ببنود وإيصال لكل بند وحد لكل فئة. ميزة فرعية `expenses.reports` (مقفولة افتراضيًا) جوه موديول
//  المصروفات القائم. الاعتماد كله في محرك الطلبات: التقرير بيتقدّم كطلب وجهته `expense_report`، والخادم بيثبّت إجماليه وبنوده في الحمولة
//  عند كل تقديم، وعند الاعتماد النهائي بيتكتب قيد دائن واحد في الدفتر بنفس شكل قيد «صرف مصروفات» القائم.
//  (ج) حد الفئة ممكن يختلف بدرجة الموظف، وبند «بدل يومي» مبلغه بيحسبه الخادم = الأيام × سعر درجة الموظف للوجهة.
//  (ب) سلفة مأمورية مربوطة بالتقرير بتتسوّى في نفس الاعتماد: الصافي = الإجمالي − السلفة ← قيد دائن أو مدين أو من غير قيد.
//  ترتيب الأقفال واحد: صف الطلب ← صف التقرير ← صف السلفة. كله بـem بس: مفيش نداء لخدمة تانية جوه معاملة.

export const EXPENSE_REPORTS_FEATURE = 'expenses.reports'
export const EXPENSE_REPORT_HANDLER = 'expense_report'
/** من العميل: رقم التقرير. ومن الخادم عند كل تقديم: الإجمالي (شروط السلسلة على المبلغ) والعنوان وفترة المأمورية والبنود، والسلفة المربوطة وصافيها */
export const EXPENSE_REPORT_CLIENT_KEYS = ['reportId'] as const
export const EXPENSE_REPORT_STAGED_KEYS = ['amount', 'reportTitle', 'tripFrom', 'tripTo', 'lines', 'advanceAmount', 'netAmount'] as const

export const EXPENSE_MIGRATION_MISSING = 'جداول تقارير المصروفات ناقصة — طبّق ترحيلات 149 لحد 154 الأول'
export const REPORT_NOT_FOUND = 'تقرير المصروفات غير موجود'
export const REPORT_BUSY = 'التقرير متقدّم في طلب تاني لسه شغال'
export const REPORT_DONE = 'التقرير اتعتمد واتصرف قبل كده'
export const REPORT_EMPTY = 'التقرير من غير بنود — ضيف بند واحد على الأقل'
export const SETTLEMENT_CATEGORY = 'adjustment'
export const REPORT_CHANGED = 'التقرير اتغيّر — حدّث الصفحة وجرّب تاني'
export const REPORT_NOT_LINKED = 'تقرير المصروفات مش مربوط بالطلب ده — ارفض الطلب، أو رجّعه لمقدّمه يقدّمه تاني'
export const REPORT_TOTAL_CHANGED = 'إجمالي بنود التقرير مش مطابق للمبلغ المتقدّم — رجّع الطلب لمقدّمه يقدّمه تاني'
export const LINES_MAX = 50
export const LINE_AMOUNT_MAX = 9_999_999.99
export const PER_DIEM_DAYS_MAX = 90
export const PER_DIEM_NONE = 'مفيش بدل يومي معرّف للوجهة دي لدرجتك'
export const perDiemChanged = (destination: string) => `البدل اليومي لـ«${destination}» اتغيّر أو اتقفل — امسح البند وضيفه تاني`
export const LIMIT_MODES = ['WARN', 'BLOCK'] as const
export type LimitMode = (typeof LIMIT_MODES)[number]

@Entity('expense_categories')
export class ExpenseCategory {
  @PrimaryGeneratedColumn({ primaryKeyConstraintName: 'PK_expense_categories' })
  id: number

  @Column({ type: 'nvarchar', length: 120 })
  name: string

  /** حد البند الواحد بعملة فرع الموظف؛ null = من غير حد */
  @Column({ type: 'decimal', precision: 12, scale: 2, nullable: true })
  limitPerLine: number | null

  /** WARN: البند بيتحفظ وبيتعلّم للمعتمد · BLOCK: البند بيترفض */
  @Column({ type: 'nvarchar', length: 10 })
  limitMode: string

  @Column({ type: 'bit' })
  receiptRequired: boolean

  @Column({ type: 'bit' })
  isActive: boolean

  @Column({ type: 'int' })
  updatedByUserId: number

  @Column({ type: 'datetime2' })
  updatedAt: Date
}

/** (ج) حد البند لفئة عند درجة وظيفية معيّنة — بيسبق حد الفئة العام لموظفين الدرجة */
@Entity('expense_category_limits')
export class ExpenseCategoryLimit {
  @PrimaryGeneratedColumn({ primaryKeyConstraintName: 'PK_expense_category_limits' })
  id: number

  @Column({ type: 'int' })
  categoryId: number

  @Column({ type: 'int' })
  gradeId: number

  @Column({ type: 'decimal', precision: 12, scale: 2 })
  limitPerLine: number

  @Column({ type: 'int' })
  updatedByUserId: number

  @Column({ type: 'datetime2' })
  updatedAt: Date
}

/** (ج) سعر البدل اليومي لوجهة — لدرجة معيّنة أو لكل الدرجات (gradeId فاضي)، وبيتسجّل تحت فئة مصروف */
@Entity('per_diem_rates')
export class PerDiemRate {
  @PrimaryGeneratedColumn({ primaryKeyConstraintName: 'PK_per_diem_rates' })
  id: number

  @Column({ type: 'int' })
  categoryId: number

  @Column({ type: 'int', nullable: true })
  gradeId: number | null

  @Column({ type: 'nvarchar', length: 80 })
  destination: string

  /** بعملة فرع الموظف */
  @Column({ type: 'decimal', precision: 12, scale: 2 })
  dailyAmount: number

  @Column({ type: 'bit' })
  isActive: boolean

  @Column({ type: 'int' })
  updatedByUserId: number

  @Column({ type: 'datetime2' })
  updatedAt: Date
}

@Entity('expense_reports')
export class ExpenseReport {
  @PrimaryGeneratedColumn({ primaryKeyConstraintName: 'PK_expense_reports' })
  id: number

  @Column({ type: 'int' })
  employeeId: number

  @Column({ type: 'nvarchar', length: 200 })
  title: string

  @Column({ type: 'date', nullable: true })
  tripFrom: string | null

  @Column({ type: 'date', nullable: true })
  tripTo: string | null

  /** DRAFT مسودة · SUBMITTED اتقدّم في طلب (حالته الفعلية من حالة طلبه) · APPROVED اتعتمد واتكتب قيده */
  @Column({ type: 'nvarchar', length: 20 })
  status: string

  /** الطلب اللي التقرير اتقدّم بيه آخر مرة */
  @Column({ type: 'int', nullable: true })
  requestId: number | null

  /** قيد الدفتر اللي اتكتب عند الاعتماد النهائي */
  @Column({ type: 'int', nullable: true })
  obligationId: number | null

  /** الإجمالي المثبّت عند آخر تقديم */
  @Column({ type: 'decimal', precision: 12, scale: 2, nullable: true })
  totalAmount: number | null

  @Column({ type: 'datetime2' })
  createdAt: Date

  @Column({ type: 'datetime2' })
  updatedAt: Date

  @Column({ type: 'datetime2', nullable: true })
  submittedAt: Date | null

  @Column({ type: 'datetime2', nullable: true })
  approvedAt: Date | null
}

@Entity('expense_lines')
export class ExpenseLine {
  @PrimaryGeneratedColumn({ primaryKeyConstraintName: 'PK_expense_lines' })
  id: number

  @Column({ type: 'int' })
  reportId: number

  @Column({ type: 'int' })
  categoryId: number

  @Column({ type: 'date' })
  expenseDate: string

  @Column({ type: 'decimal', precision: 12, scale: 2 })
  amount: number

  @Column({ type: 'nvarchar', length: 300, nullable: true })
  note: string | null

  /** إيصال البند: ملف رفعه صاحب التقرير بنوع «طلب» (الاطلاع عليه بيتبع الطلب اللي التقرير اتقدّم بيه) */
  @Column({ type: 'int', nullable: true })
  receiptFileId: number | null

  /** (ج) بند «بدل يومي»: السعر اللي اتحسب بيه وعدد الأيام (المبلغ = الأيام × سعر اليوم). الفاضي = بند مصروف عادي */
  @Column({ type: 'int', nullable: true })
  perDiemRateId: number | null

  @Column({ type: 'int', nullable: true })
  perDiemDays: number | null

  @Column({ type: 'datetime2' })
  createdAt: Date
}

const flag = (value: unknown) => value === true || value === 1
const cents = (value: unknown) => Math.round(Number(value) * 100)
const money = (value: number) => (value / 100).toFixed(2)
const ymd = (value: unknown) => (value instanceof Date ? value.toISOString().slice(0, 10) : String(value ?? '').slice(0, 10))
const validYmd = (value: unknown): value is string => {
  if (typeof value !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(value)) return false
  const date = new Date(`${value}T00:00:00Z`)
  // شهر أو يوم برّه المدى = تاريخ مش صالح (toISOString بترمي عليه)
  return !Number.isNaN(date.getTime()) && date.toISOString().slice(0, 10) === value
}
const cleanText = (value: unknown, max: number): string | null => {
  if (value === undefined || value === null) return ''
  if (typeof value !== 'string') return null
  const text = value.trim().replace(/\s+/g, ' ')
  return text.length > max ? null : text
}

/** مبلغ موجب بخانتين عشريتين بالكتير */
export function expenseAmount(raw: unknown, max = LINE_AMOUNT_MAX): number | null {
  const text = typeof raw === 'number' ? String(raw) : typeof raw === 'string' ? raw.trim() : ''
  if (!/^\d{1,9}(\.\d{1,2})?$/.test(text)) return null
  const amount = Number(text)
  return amount > 0 && amount <= max ? amount : null
}

export interface CategoryFields { name: string; limitPerLine: number | null; limitMode: LimitMode; receiptRequired: boolean; isActive: boolean }
/** اسم الفئة، وحد البند (فاضي = من غير حد) ووضعه، والإيصال الإجباري، والتفعيل */
export function categoryFields(body: unknown): { fields: CategoryFields | null; error: string | null } {
  const input = (body ?? {}) as Record<string, unknown>
  const name = cleanText(input.name, 120)
  if (!name || name.length < 2) return { fields: null, error: 'اسم الفئة من حرفين لحد 120 حرف' }
  let limitPerLine: number | null = null
  if (input.limitPerLine !== undefined && input.limitPerLine !== null && input.limitPerLine !== '') {
    limitPerLine = expenseAmount(input.limitPerLine)
    if (limitPerLine === null) return { fields: null, error: `حد البند مبلغ موجب بخانتين عشريتين بالكتير (لحد ${LINE_AMOUNT_MAX})` }
  }
  const mode = input.limitMode === undefined || input.limitMode === null || input.limitMode === '' ? 'WARN' : input.limitMode
  if (!(LIMIT_MODES as readonly unknown[]).includes(mode)) return { fields: null, error: 'وضع الحد «تحذير» أو «منع»' }
  for (const key of ['receiptRequired', 'isActive'] as const) {
    if (input[key] !== undefined && typeof input[key] !== 'boolean') return { fields: null, error: key === 'receiptRequired' ? '«الإيصال إجباري» نعم أو لا' : '«مفعّلة» نعم أو لا' }
  }
  return { fields: { name, limitPerLine, limitMode: mode as LimitMode, receiptRequired: input.receiptRequired === true, isActive: input.isActive !== false }, error: null }
}

export interface ReportFields { title: string; tripFrom: string | null; tripTo: string | null }
/** عنوان التقرير، وفترة المأمورية (الاتنين أو ولا واحد) */
export function reportFields(body: unknown): { fields: ReportFields | null; error: string | null } {
  const input = (body ?? {}) as Record<string, unknown>
  const title = cleanText(input.title, 200)
  if (!title || title.length < 2) return { fields: null, error: 'عنوان التقرير من حرفين لحد 200 حرف' }
  const blank = (value: unknown) => value === undefined || value === null || value === ''
  if (blank(input.tripFrom) && blank(input.tripTo)) return { fields: { title, tripFrom: null, tripTo: null }, error: null }
  if (!validYmd(input.tripFrom) || !validYmd(input.tripTo)) return { fields: null, error: 'فترة المأمورية: تاريخ البداية والنهاية الاتنين (أو سيبهم فاضيين)' }
  if (input.tripFrom > input.tripTo) return { fields: null, error: 'نهاية المأمورية قبل بدايتها' }
  return { fields: { title, tripFrom: input.tripFrom, tripTo: input.tripTo }, error: null }
}

export interface LineFields { categoryId: number; expenseDate: string; amount: number; note: string | null; receiptFileId: number | null }
/** بند: فئة، تاريخ مش في المستقبل، مبلغ، ملاحظة، ورقم ملف الإيصال (اختياري هنا — الإجباري بيتحكم عند التقديم) */
export function lineFields(body: unknown, today: string): { fields: LineFields | null; error: string | null } {
  const input = (body ?? {}) as Record<string, unknown>
  if (typeof input.categoryId !== 'number' || !Number.isSafeInteger(input.categoryId) || input.categoryId < 1) return { fields: null, error: 'اختار فئة المصروف' }
  if (!validYmd(input.expenseDate)) return { fields: null, error: 'تاريخ المصروف مطلوب' }
  if (input.expenseDate > today) return { fields: null, error: 'تاريخ المصروف في المستقبل' }
  const amount = expenseAmount(input.amount)
  if (amount === null) return { fields: null, error: `مبلغ البند موجب بخانتين عشريتين بالكتير (لحد ${LINE_AMOUNT_MAX})` }
  const note = cleanText(input.note, 300)
  if (note === null) return { fields: null, error: 'الملاحظة 300 حرف بالكتير' }
  let receiptFileId: number | null = null
  if (input.receiptFileId !== undefined && input.receiptFileId !== null) {
    if (typeof input.receiptFileId !== 'number' || !Number.isSafeInteger(input.receiptFileId) || input.receiptFileId < 1) return { fields: null, error: 'إيصال البند مش صحيح' }
    receiptFileId = input.receiptFileId
  }
  return { fields: { categoryId: input.categoryId, expenseDate: input.expenseDate, amount, note: note || null, receiptFileId }, error: null }
}

/** (ج) حدود الدرجات على فئة: قايمة درجة ← حد، من غير تكرار درجة. `undefined` = مااتبعتتش (ماتتغيّرش) */
export function gradeLimitsOf(raw: unknown): { limits: Array<{ gradeId: number; limitPerLine: number }> | undefined; error: string | null } {
  if (raw === undefined) return { limits: undefined, error: null }
  if (!Array.isArray(raw) || raw.length > 100) return { limits: undefined, error: 'حدود الدرجات قايمة (درجة وحد)' }
  const limits: Array<{ gradeId: number; limitPerLine: number }> = []
  for (const item of raw as Array<Record<string, unknown> | null>) {
    const gradeId = item?.gradeId, limitPerLine = expenseAmount(item?.limitPerLine)
    if (typeof gradeId !== 'number' || !Number.isSafeInteger(gradeId) || gradeId < 1 || limitPerLine === null) return { limits: undefined, error: 'حد الدرجة: اختار الدرجة واكتب مبلغ موجب بخانتين عشريتين بالكتير' }
    if (limits.some((row) => row.gradeId === gradeId)) return { limits: undefined, error: 'الدرجة متكررة في حدود الفئة' }
    limits.push({ gradeId, limitPerLine })
  }
  return { limits, error: null }
}

export interface RateFields { categoryId: number; gradeId: number | null; destination: string; dailyAmount: number; isActive: boolean }
/** (ج) سعر بدل يومي: الوجهة، والدرجة (فاضية = كل الدرجات)، وسعر اليوم، والفئة اللي البند بيتسجّل تحتها */
export function rateFields(body: unknown): { fields: RateFields | null; error: string | null } {
  const input = (body ?? {}) as Record<string, unknown>
  const destination = cleanText(input.destination, 80)
  if (!destination || destination.length < 2) return { fields: null, error: 'الوجهة من حرفين لحد 80 حرف' }
  if (typeof input.categoryId !== 'number' || !Number.isSafeInteger(input.categoryId) || input.categoryId < 1) return { fields: null, error: 'اختار فئة المصروف اللي البدل بيتسجّل تحتها' }
  let gradeId: number | null = null
  if (input.gradeId !== undefined && input.gradeId !== null) {
    if (typeof input.gradeId !== 'number' || !Number.isSafeInteger(input.gradeId) || input.gradeId < 1) return { fields: null, error: 'الدرجة مش صحيحة' }
    gradeId = input.gradeId
  }
  const dailyAmount = expenseAmount(input.dailyAmount, 99_999.99)
  if (dailyAmount === null) return { fields: null, error: 'سعر اليوم مبلغ موجب بخانتين عشريتين بالكتير (لحد 99999.99)' }
  if (input.isActive !== undefined && typeof input.isActive !== 'boolean') return { fields: null, error: '«مفعّل» نعم أو لا' }
  return { fields: { categoryId: input.categoryId, gradeId, destination, dailyAmount, isActive: input.isActive !== false }, error: null }
}

export interface PerDiemFields { destination: string; days: number; expenseDate: string; note: string | null }
/** (ج) بند بدل يومي من العميل: الوجهة وعدد الأيام وتاريخ البداية — المبلغ من الخادم */
export function perDiemFields(body: unknown, today: string): { fields: PerDiemFields | null; error: string | null } {
  const input = (body ?? {}) as Record<string, unknown>
  const destination = cleanText(input.destination, 80)
  if (!destination) return { fields: null, error: 'اختار الوجهة' }
  if (typeof input.days !== 'number' || !Number.isInteger(input.days) || input.days < 1 || input.days > PER_DIEM_DAYS_MAX) return { fields: null, error: `عدد الأيام رقم صحيح من 1 لحد ${PER_DIEM_DAYS_MAX}` }
  if (!validYmd(input.expenseDate)) return { fields: null, error: 'تاريخ أول يوم مطلوب' }
  if (input.expenseDate > today) return { fields: null, error: 'تاريخ المصروف في المستقبل' }
  const note = cleanText(input.note, 300)
  if (note === null) return { fields: null, error: 'الملاحظة 300 حرف بالكتير' }
  return { fields: { destination, days: input.days, expenseDate: input.expenseDate, note: note || null }, error: null }
}

type RateRule = Pick<PerDiemRate, 'id' | 'gradeId' | 'destination' | 'dailyAmount' | 'isActive'>
/** (ج) سعر الوجهة لدرجة الموظف: سعر درجته المفعّل، وإلا سعر «كل الدرجات» المفعّل */
export function pickRate<T extends RateRule>(rates: readonly T[], destination: string, gradeId: number | null): T | null {
  const open = rates.filter((rate) => flag(rate.isActive) && rate.destination === destination)
  return (gradeId == null ? undefined : open.find((rate) => rate.gradeId != null && Number(rate.gradeId) === gradeId)) ?? open.find((rate) => rate.gradeId == null) ?? null
}
/** (ج) مبلغ البدل بالقروش = الأيام × سعر اليوم */
export const perDiemCents = (days: number, dailyAmount: unknown) => days * cents(dailyAmount)
/**
 * (ج) حكم بند بدل يومي محفوظ: سعره لسه هو سعر درجة الموظف للوجهة دلوقتي، ومبلغه = الأيام × السعر الحالي. أي تغيير = مانع
 * (البند بيتمسح ويتضاف تاني بالسعر الجديد) — المبلغ المحسوب مايتصرفش بسعر اتغيّر من غير ما صاحبه والمعتمد يشوفوه.
 */
export function perDiemIssue(rates: readonly RateRule[], line: { perDiemRateId: number | null; perDiemDays: number | null; amount: unknown }, gradeId: number | null): string | null {
  const rate = rates.find((row) => row.id === line.perDiemRateId)
  if (!rate) return 'سعر البدل اليومي للبند مش موجود — امسح البند وضيفه تاني'
  const current = pickRate(rates, rate.destination, gradeId)
  const days = Number(line.perDiemDays)
  if (!current || current.id !== rate.id || !Number.isInteger(days) || days < 1 || perDiemCents(days, rate.dailyAmount) !== cents(line.amount)) return perDiemChanged(rate.destination)
  return null
}

type CategoryRule = Pick<ExpenseCategory, 'name' | 'limitPerLine' | 'limitMode' | 'receiptRequired' | 'isActive'>
/**
 * حكم السياسة على بند: `block` بيمنع (فئة مقفولة، فوق حد «منع»، ولو `atSubmit` إيصال إجباري ناقص)، و`warn` بيتعلّم للمعتمد (فوق حد «تحذير»).
 * الحكم بقيم الفئة دلوقتي — نفس الدالة عند حفظ البند وعند التقديم. (ج) `gradeLimit` = حد درجة الموظف على الفئة لو متعرّف: بيسبق حد الفئة العام.
 */
export function lineIssue(category: CategoryRule | null | undefined, line: { amount: unknown; receiptFileId: number | null }, atSubmit: boolean, gradeLimit: number | null = null): { block: string | null; warn: string | null } {
  if (!category) return { block: 'فئة البند مش موجودة', warn: null }
  if (!flag(category.isActive)) return { block: `فئة «${category.name}» مقفولة — غيّر فئة البند`, warn: null }
  const limit = gradeLimit ?? category.limitPerLine
  const over = limit != null && cents(line.amount) > cents(limit)
  if (over && category.limitMode === 'BLOCK') return { block: `بند «${category.name}» بمبلغ ${money(cents(line.amount))} فوق حد الفئة ${money(cents(limit))}`, warn: null }
  if (atSubmit && flag(category.receiptRequired) && !line.receiptFileId) return { block: `بند «${category.name}» محتاج إيصال`, warn: null }
  return { block: null, warn: over ? `فوق حد الفئة (${money(cents(limit))})` : null }
}

export type ReportPhase = 'DRAFT' | 'PENDING' | 'RETURNED' | 'REJECTED' | 'APPROVED'
export const REPORT_PHASE_LABELS: Record<ReportPhase, string> = { DRAFT: 'مسودة', PENDING: 'تحت الاعتماد', RETURNED: 'راجع للاستكمال', REJECTED: 'مرفوض — يتعدّل ويتقدّم تاني', APPROVED: 'معتمد' }
/** حالات الطلب اللي بتفكّ التقرير: اترفض، اتلغى، رجع مسودة، أو مابقاش موجود */
const RELEASED = ['REJECTED', 'CANCELLED', 'DRAFT']
/** حالة التقرير الفعلية = حالته + حالة الطلب اللي اتقدّم بيه (`null` = الطلب مش موجود) */
export function reportPhase(status: string, linkedStatus: string | null): ReportPhase {
  if (status === 'APPROVED') return 'APPROVED'
  if (status !== 'SUBMITTED') return 'DRAFT'
  if (linkedStatus === 'RETURNED_FOR_INFO') return 'RETURNED'
  return linkedStatus === null || RELEASED.includes(linkedStatus) ? 'REJECTED' : 'PENDING'
}
/** البنود والعنوان بيتعدّلوا في المسودة والراجع والمرفوض بس */
export const phaseEditable = (phase: ReportPhase) => phase === 'DRAFT' || phase === 'RETURNED' || phase === 'REJECTED'
export const reportCode = (id: number) => `EXP-${String(id).padStart(5, '0')}`

let ready: boolean | null = null
/** جداول ترحيلات 149–151 و153–154 موجودة (وجدول البنود بعمودي البدل اليومي)؟ الموجود بيتحفظ؛ الناقص بيتفحص مع كل نداء لحد ما الترحيل يتطبق */
export async function expenseReportsReady(em: EntityManager): Promise<boolean> {
  if (ready === true) return true
  const [row] = await em.query(`SELECT CASE WHEN OBJECT_ID(N'dbo.expense_categories', N'U') IS NOT NULL AND OBJECT_ID(N'dbo.expense_reports', N'U') IS NOT NULL
    AND OBJECT_ID(N'dbo.expense_lines', N'U') IS NOT NULL AND OBJECT_ID(N'dbo.expense_category_limits', N'U') IS NOT NULL AND OBJECT_ID(N'dbo.per_diem_rates', N'U') IS NOT NULL
    AND COL_LENGTH(N'dbo.expense_lines', N'perDiemRateId') IS NOT NULL AND COL_LENGTH(N'dbo.expense_lines', N'perDiemDays') IS NOT NULL THEN 1 ELSE 0 END AS [ready]`)
  ready = Number(row?.ready) === 1
  return ready
}
/** للاختبارات: نسيان حالة الترحيل */
export function resetExpenseReportsCache() { ready = null }

/**
 * قفل صف التقرير بترتيب الأقفال الواحد (صف الطلب ← صف التقرير): لو التقرير مربوط بطلب غير `heldRequestId` (اللي المنادي ماسك قفله)،
 * صف الطلب ده بيتقفل الأول وحالته بترجع. بعد قفل التقرير لازم ربطه يكون زي ما اتشاف، وإلا `REPORT_CHANGED`.
 */
export async function lockReport(em: EntityManager, reportId: number, held: { id: number; status: string } | null): Promise<{ report: ExpenseReport; linkedStatus: string | null } | null> {
  const [peek]: Array<{ requestId: number | null }> = await em.query('SELECT [requestId] FROM dbo.expense_reports WHERE [id] = @0', [reportId])
  if (!peek) return null
  const linkedId = peek.requestId == null ? null : Number(peek.requestId)
  let linkedStatus: string | null = null
  if (linkedId !== null && held && linkedId === held.id) linkedStatus = held.status
  else if (linkedId !== null) {
    const [linked]: Array<{ status: string }> = await em.query('SELECT [status] FROM dbo.requests WITH (UPDLOCK, ROWLOCK) WHERE [id] = @0', [linkedId])
    linkedStatus = linked ? String(linked.status) : null
  }
  const report = await em.getRepository(ExpenseReport).findOne({ where: { id: reportId }, lock: { mode: 'pessimistic_write' } })
  if (!report) return null
  if ((report.requestId == null ? null : Number(report.requestId)) !== linkedId) throw new ConflictException(REPORT_CHANGED)
  return { report, linkedStatus }
}

export interface StagedLine { category: string; date: string; amount: number; note: string | null; receipt: string | null; warning: string | null; perDiem?: string }
/** (ج) درجة الموظف دلوقتي، وحدود درجته على الفئات (فئة ← حد)، وأسعار البدل اليومي كلها */
export async function gradePolicy(em: EntityManager, employeeId: number): Promise<{ gradeId: number | null; limits: Map<number, number>; rates: PerDiemRate[] }> {
  const [person]: Array<{ gradeId: number | null }> = await em.query('SELECT [gradeId] FROM dbo.employees WHERE [id] = @0', [employeeId])
  const gradeId = person?.gradeId == null ? null : Number(person.gradeId)
  const limits = new Map<number, number>()
  if (gradeId !== null) for (const row of await em.getRepository(ExpenseCategoryLimit).find({ where: { gradeId } })) limits.set(row.categoryId, Number(row.limitPerLine))
  return { gradeId, limits, rates: await em.getRepository(PerDiemRate).find({ order: { id: 'ASC' } }) }
}
/** نص البدل اليومي على البند: «3 يوم × 200.00 (الرياض)» */
export const perDiemText = (days: number | null, rate: Pick<PerDiemRate, 'destination' | 'dailyAmount'> | undefined) => `${days ?? 0} يوم × ${rate ? money(cents(rate.dailyAmount)) : '؟'} (${rate?.destination ?? '؟'})`
/** بنود التقرير بحكم السياسة دلوقتي (بدرجة صاحبه الحالية): أول مانع (لو فيه)، والإجمالي بالقروش، والبنود زي ما هتتثبّت في الحمولة */
export async function judgeLines(em: EntityManager, report: Pick<ExpenseReport, 'id' | 'employeeId'>): Promise<{ block: string | null; totalCents: number; lines: StagedLine[] }> {
  const lines = await em.getRepository(ExpenseLine).find({ where: { reportId: report.id }, order: { expenseDate: 'ASC', id: 'ASC' } })
  const categories = new Map((await em.getRepository(ExpenseCategory).find()).map((row) => [row.id, row]))
  const policy = await gradePolicy(em, report.employeeId)
  let block: string | null = null, totalCents = 0
  const staged: StagedLine[] = []
  for (const line of lines) {
    const category = categories.get(line.categoryId)
    if (line.perDiemRateId != null) {
      // بند بدل يومي: مالوش إيصال ولا حد فئة — الحكم على سعره ومبلغه المحسوب
      block ??= perDiemIssue(policy.rates, line, policy.gradeId)
      totalCents += cents(line.amount)
      staged.push({ category: category?.name ?? '—', date: ymd(line.expenseDate), amount: cents(line.amount) / 100, note: line.note ?? null, receipt: null, warning: null,
        perDiem: perDiemText(line.perDiemDays, policy.rates.find((rate) => rate.id === line.perDiemRateId)) })
      continue
    }
    const issue = lineIssue(category, line, true, policy.limits.get(line.categoryId) ?? null)
    block ??= issue.block
    totalCents += cents(line.amount)
    staged.push({ category: category?.name ?? '—', date: ymd(line.expenseDate), amount: cents(line.amount) / 100, note: line.note ?? null, receipt: line.receiptFileId ? `file:${line.receiptFileId}` : null, warning: issue.warn })
  }
  return { block, totalCents, lines: staged }
}

const payloadOf = (raw: string | null | undefined): Record<string, unknown> => {
  try { const value: unknown = JSON.parse(raw || '{}'); return value && typeof value === 'object' && !Array.isArray(value) ? (value as Record<string, unknown>) : {} } catch { return {} }
}
const reportIdOf = (raw: unknown): number | null => {
  const id = typeof raw === 'number' ? raw : typeof raw === 'string' && /^\d{1,9}$/.test(raw.trim()) ? Number(raw.trim()) : NaN
  return Number.isSafeInteger(id) && id > 0 ? id : null
}

/**
 * التقديم (وكل إعادة تقديم) جوه معاملته، وصف الطلب مقفول: التقرير تحت قفل صفه — بتاع مقدّم الطلب وإلا «غير موجود»، مش معتمد، ومش متقدّم في
 * طلب تاني شغال؛ فيه بنود (أو مربوط بسلفة مأمورية — اعتماده بيخصمها)، ومفيش بند ممنوع بالسياسة. التقرير بيتربط بالطلب، وبترجع الحمولة اللي هتتخزّن: الإجمالي والعنوان والبنود
 * من الخادم فوق أي قيمة جاية من العميل.
 */
export async function stageExpenseReport(em: EntityManager, req: Pick<Request, 'id' | 'payload' | 'requesterId' | 'status'>): Promise<Record<string, unknown>> {
  const payload = payloadOf(req.payload)
  for (const key of EXPENSE_REPORT_STAGED_KEYS) delete payload[key]
  const reportId = reportIdOf(payload.reportId)
  if (reportId === null) throw new BadRequestException(REPORT_NOT_FOUND)
  if (!(await expenseReportsReady(em))) throw new BadRequestException(EXPENSE_MIGRATION_MISSING)
  const locked = await lockReport(em, reportId, { id: req.id, status: req.status })
  // تقرير حد تاني زي اللي مش موجود
  if (!locked || locked.report.employeeId !== req.requesterId) throw new BadRequestException(REPORT_NOT_FOUND)
  const { report, linkedStatus } = locked
  if (report.status === 'APPROVED') throw new ConflictException(REPORT_DONE)
  const own = report.requestId != null && Number(report.requestId) === req.id
  if (!own && reportPhase(report.status, linkedStatus) === 'PENDING') throw new ConflictException(REPORT_BUSY)
  if (!own && reportPhase(report.status, linkedStatus) === 'RETURNED') throw new ConflictException(REPORT_BUSY)
  const judged = await judgeLines(em, report)
  // سلفة المأمورية المربوطة تحت قفل صفها (بعد قفل التقرير)
  const advance = await attachedAdvance(em, report.id)
  if (!judged.lines.length && !advance) throw new BadRequestException(REPORT_EMPTY)
  if (judged.block) throw new BadRequestException(judged.block)
  const now = new Date()
  await em.getRepository(ExpenseReport).update({ id: report.id }, { status: 'SUBMITTED', requestId: req.id, totalAmount: judged.totalCents / 100, submittedAt: now, updatedAt: now })
  return { ...payload, reportId: report.id, amount: judged.totalCents / 100, reportTitle: report.title, tripFrom: report.tripFrom ? ymd(report.tripFrom) : null,
    tripTo: report.tripTo ? ymd(report.tripTo) : null, lines: judged.lines,
    ...(advance ? { advanceAmount: cents(advance.amount) / 100, netAmount: (judged.totalCents - cents(advance.amount)) / 100 } : {}) }
}

/**
 * التنفيذ عند الاعتماد النهائي، جوه معاملة الاعتماد وصف الطلب مقفول: التقرير تحت قفل صفه لازم يكون بتاع مقدّم الطلب ومربوط بالطلب ده
 * نفسه ولسه «اتقدّم»، والإجمالي — محسوب تاني من البنود — يساوي المثبّت عند التقديم والمبلغ اللي المعتمدين شافوه، والسلفة المربوطة هي اللي
 * شافوها. بعدها قيد واحد في الدفتر مربوط بالطلب: من غير سلفة قيد دائن بنفس شكل «صرف مصروفات»؛ وبسلفة الصافي (الإجمالي − السلفة) دائن لو
 * موجب ومدين لو سالب ومن غير قيد لو صفر، والسلفة بتتقفل «اتسوّت». تنفيذ اتعاد مابيكتبش تاني.
 */
export async function executeExpenseReport(em: EntityManager, req: Request, _type: RequestType, payload: Record<string, unknown>): Promise<{ ref: string; completed: boolean; note?: string }> {
  if (!(await expenseReportsReady(em))) throw new BadRequestException(EXPENSE_MIGRATION_MISSING)
  const reportId = reportIdOf(payload.reportId)
  const locked = reportId === null ? null : await lockReport(em, reportId, { id: req.id, status: req.status })
  if (!locked || locked.report.employeeId !== req.requesterId || locked.report.requestId == null || Number(locked.report.requestId) !== req.id) throw new BadRequestException(REPORT_NOT_LINKED)
  const report = locked.report
  if (report.status === 'APPROVED') return { ref: reportCode(report.id), completed: true }
  if (report.status !== 'SUBMITTED') throw new BadRequestException(REPORT_NOT_LINKED)
  const judged = await judgeLines(em, report)
  const advance = await attachedAdvance(em, report.id)
  const centsOf = (value: unknown) => (typeof value === 'number' && Number.isFinite(value) ? cents(value) : NaN)
  const stagedAdvance = payload.advanceAmount === undefined || payload.advanceAmount === null ? null : centsOf(payload.advanceAmount)
  const advanceCents = advance ? cents(advance.amount) : null
  if ((!judged.lines.length && !advance) || centsOf(payload.amount) !== judged.totalCents || cents(report.totalAmount) !== judged.totalCents || stagedAdvance !== advanceCents) {
    throw new BadRequestException(REPORT_TOTAL_CHANGED)
  }
  // الصافي بعد السلفة: موجب = دائن للموظف، سالب = مدين عليه (تسوية)، صفر = من غير قيد
  const netCents = judged.totalCents - (advanceCents ?? 0), amount = Math.abs(netCents) / 100
  const label = advance
    ? `تسوية سلفة مأمورية ${advanceCode(advance.id)}: تقرير ${reportCode(report.id)} (المصروف ${money(judged.totalCents)} − السلفة ${money(advanceCents ?? 0)})`
    : `مصروفات: تقرير ${reportCode(report.id)} — ${report.title}`
  const entry = netCents === 0 ? null : await em.getRepository(EmployeeObligation).save({
    employeeId: req.requesterId, type: netCents > 0 ? 'CREDIT' : 'DEBIT', category: netCents > 0 ? 'expense' : SETTLEMENT_CATEGORY, amount, label: label.slice(0, 300), status: 'PENDING',
    sourceRequestId: req.id, effectiveDate: null as unknown as string,
  })
  const now = new Date()
  if (advance) await em.getRepository(TravelAdvance).update({ id: advance.id }, { status: 'SETTLED', closedAt: now })
  await em.getRepository(ExpenseReport).update({ id: report.id }, { status: 'APPROVED', obligationId: entry ? entry.id : null, approvedAt: now, updatedAt: now })
  const effect = netCents === 0 ? 'من غير قيد (المصروف = السلفة)' : `${netCents > 0 ? 'إضافة' : 'خصم'} ${amount} في دفتر المديونيات`
  return { ref: reportCode(report.id), completed: true, note: `${effect} (تقرير ${reportCode(report.id)}، ${judged.lines.length} بند${advance ? `، سلفة ${advanceCode(advance.id)}` : ''})` }
}

/** حقل نموذج الطلب: رقم التقرير (التقديم المعتاد من شاشة «مصروفاتي»)، وبعده أي حقول زوّدها مسؤول النظام على النوع */
export function expenseReportFields(type: Pick<RequestType, 'requiredFields' | 'customFields'>): { requiredFields: string; customFields: string } {
  const listOf = (raw: string | null | undefined): unknown[] => { try { const parsed: unknown = JSON.parse(raw || '[]'); return Array.isArray(parsed) ? parsed : [] } catch { return [] } }
  const reserved: string[] = [...EXPENSE_REPORT_CLIENT_KEYS, ...EXPENSE_REPORT_STAGED_KEYS, 'description']
  const extra = listOf(type.customFields).filter((field): field is { key: string } => !!field && typeof field === 'object' && typeof (field as { key?: unknown }).key === 'string'
    && !reserved.includes((field as { key: string }).key))
  const required = [...new Set(['reportId', ...listOf(type.requiredFields).filter((key): key is string => typeof key === 'string' && !reserved.includes(key))])]
  return { requiredFields: JSON.stringify(required), customFields: JSON.stringify([{ key: 'reportId', label: 'رقم تقرير المصروفات (من شاشة «مصروفاتي»)', type: 'number', required: true }, ...extra]) }
}
