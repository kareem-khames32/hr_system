import { BadRequestException, ConflictException } from '@nestjs/common'
import { Column, Entity, PrimaryGeneratedColumn, type EntityManager } from 'typeorm'
import { EmployeeObligation } from '../requests/entities/financial.entities'
import type { Request } from '../requests/entities/request.entity'
import type { RequestType } from '../requests/entities/request-type.entity'

// B5.3 (أ): تقارير المصروفات — تقرير ببنود وإيصال لكل بند وحد لكل فئة. ميزة فرعية `expenses.reports` (مقفولة افتراضيًا) جوه موديول
//  المصروفات القائم. الاعتماد كله في محرك الطلبات: التقرير بيتقدّم كطلب وجهته `expense_report`، والخادم بيثبّت إجماليه وبنوده في الحمولة
//  عند كل تقديم، وعند الاعتماد النهائي بيتكتب قيد دائن واحد في الدفتر بنفس شكل قيد «صرف مصروفات» القائم.
//  ترتيب الأقفال واحد: صف الطلب ← صف التقرير. كله بـem بس: مفيش نداء لخدمة تانية جوه معاملة.

export const EXPENSE_REPORTS_FEATURE = 'expenses.reports'
export const EXPENSE_REPORT_HANDLER = 'expense_report'
/** من العميل: رقم التقرير. ومن الخادم عند كل تقديم: الإجمالي (شروط السلسلة على المبلغ) والعنوان وفترة المأمورية والبنود */
export const EXPENSE_REPORT_CLIENT_KEYS = ['reportId'] as const
export const EXPENSE_REPORT_STAGED_KEYS = ['amount', 'reportTitle', 'tripFrom', 'tripTo', 'lines'] as const

export const EXPENSE_MIGRATION_MISSING = 'جداول تقارير المصروفات ناقصة — طبّق ترحيلات 149 و150 و151 الأول'
export const REPORT_NOT_FOUND = 'تقرير المصروفات غير موجود'
export const REPORT_BUSY = 'التقرير متقدّم في طلب تاني لسه شغال'
export const REPORT_DONE = 'التقرير اتعتمد واتصرف قبل كده'
export const REPORT_EMPTY = 'التقرير من غير بنود — ضيف بند واحد على الأقل'
export const REPORT_CHANGED = 'التقرير اتغيّر — حدّث الصفحة وجرّب تاني'
export const REPORT_NOT_LINKED = 'تقرير المصروفات مش مربوط بالطلب ده — ارفض الطلب، أو رجّعه لمقدّمه يقدّمه تاني'
export const REPORT_TOTAL_CHANGED = 'إجمالي بنود التقرير مش مطابق للمبلغ المتقدّم — رجّع الطلب لمقدّمه يقدّمه تاني'
export const LINES_MAX = 50
export const LINE_AMOUNT_MAX = 9_999_999.99
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

  @Column({ type: 'datetime2' })
  createdAt: Date
}

const flag = (value: unknown) => value === true || value === 1
const cents = (value: unknown) => Math.round(Number(value) * 100)
const money = (value: number) => (value / 100).toFixed(2)
const ymd = (value: unknown) => (value instanceof Date ? value.toISOString().slice(0, 10) : String(value ?? '').slice(0, 10))
const validYmd = (value: unknown): value is string => typeof value === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(value) && new Date(`${value}T00:00:00Z`).toISOString().slice(0, 10) === value
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

type CategoryRule = Pick<ExpenseCategory, 'name' | 'limitPerLine' | 'limitMode' | 'receiptRequired' | 'isActive'>
/**
 * حكم السياسة على بند: `block` بيمنع (فئة مقفولة، فوق حد «منع»، ولو `atSubmit` إيصال إجباري ناقص)، و`warn` بيتعلّم للمعتمد (فوق حد «تحذير»).
 * الحكم بقيم الفئة دلوقتي — نفس الدالة عند حفظ البند وعند التقديم.
 */
export function lineIssue(category: CategoryRule | null | undefined, line: { amount: unknown; receiptFileId: number | null }, atSubmit: boolean): { block: string | null; warn: string | null } {
  if (!category) return { block: 'فئة البند مش موجودة', warn: null }
  if (!flag(category.isActive)) return { block: `فئة «${category.name}» مقفولة — غيّر فئة البند`, warn: null }
  const over = category.limitPerLine != null && cents(line.amount) > cents(category.limitPerLine)
  if (over && category.limitMode === 'BLOCK') return { block: `بند «${category.name}» بمبلغ ${money(cents(line.amount))} فوق حد الفئة ${money(cents(category.limitPerLine))}`, warn: null }
  if (atSubmit && flag(category.receiptRequired) && !line.receiptFileId) return { block: `بند «${category.name}» محتاج إيصال`, warn: null }
  return { block: null, warn: over ? `فوق حد الفئة (${money(cents(category.limitPerLine))})` : null }
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
/** جداول ترحيلات 149–151 موجودة؟ الموجود بيتحفظ؛ الناقص بيتفحص مع كل نداء لحد ما الترحيل يتطبق */
export async function expenseReportsReady(em: EntityManager): Promise<boolean> {
  if (ready === true) return true
  const [row] = await em.query(`SELECT CASE WHEN OBJECT_ID(N'dbo.expense_categories', N'U') IS NOT NULL AND OBJECT_ID(N'dbo.expense_reports', N'U') IS NOT NULL
    AND OBJECT_ID(N'dbo.expense_lines', N'U') IS NOT NULL THEN 1 ELSE 0 END AS [ready]`)
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

export interface StagedLine { category: string; date: string; amount: number; note: string | null; receipt: string | null; warning: string | null }
/** بنود التقرير بحكم السياسة دلوقتي: أول مانع (لو فيه)، والإجمالي بالقروش، والبنود زي ما هتتثبّت في الحمولة */
export async function judgeLines(em: EntityManager, reportId: number): Promise<{ block: string | null; totalCents: number; lines: StagedLine[] }> {
  const lines = await em.getRepository(ExpenseLine).find({ where: { reportId }, order: { expenseDate: 'ASC', id: 'ASC' } })
  const categories = new Map((await em.getRepository(ExpenseCategory).find()).map((row) => [row.id, row]))
  let block: string | null = null, totalCents = 0
  const staged: StagedLine[] = []
  for (const line of lines) {
    const category = categories.get(line.categoryId)
    const issue = lineIssue(category, line, true)
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
 * طلب تاني شغال؛ فيه بنود، ومفيش بند ممنوع بالسياسة. التقرير بيتربط بالطلب، وبترجع الحمولة اللي هتتخزّن: الإجمالي والعنوان والبنود
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
  const judged = await judgeLines(em, report.id)
  if (!judged.lines.length) throw new BadRequestException(REPORT_EMPTY)
  if (judged.block) throw new BadRequestException(judged.block)
  const now = new Date()
  await em.getRepository(ExpenseReport).update({ id: report.id }, { status: 'SUBMITTED', requestId: req.id, totalAmount: judged.totalCents / 100, submittedAt: now, updatedAt: now })
  return { ...payload, reportId: report.id, amount: judged.totalCents / 100, reportTitle: report.title, tripFrom: report.tripFrom ? ymd(report.tripFrom) : null,
    tripTo: report.tripTo ? ymd(report.tripTo) : null, lines: judged.lines }
}

/**
 * التنفيذ عند الاعتماد النهائي، جوه معاملة الاعتماد وصف الطلب مقفول: التقرير تحت قفل صفه لازم يكون بتاع مقدّم الطلب ومربوط بالطلب ده
 * نفسه ولسه «اتقدّم»، والإجمالي — محسوب تاني من البنود — يساوي المثبّت عند التقديم والمبلغ اللي المعتمدين شافوه. بعدها قيد دائن واحد
 * في الدفتر بنفس شكل قيد «صرف مصروفات»، مربوط بالطلب. تنفيذ اتعاد بيرجّع القيد نفسه.
 */
export async function executeExpenseReport(em: EntityManager, req: Request, _type: RequestType, payload: Record<string, unknown>): Promise<{ ref: string; completed: boolean; note?: string }> {
  if (!(await expenseReportsReady(em))) throw new BadRequestException(EXPENSE_MIGRATION_MISSING)
  const reportId = reportIdOf(payload.reportId)
  const locked = reportId === null ? null : await lockReport(em, reportId, { id: req.id, status: req.status })
  if (!locked || locked.report.employeeId !== req.requesterId || locked.report.requestId == null || Number(locked.report.requestId) !== req.id) throw new BadRequestException(REPORT_NOT_LINKED)
  const report = locked.report
  if (report.status === 'APPROVED' && report.obligationId) return { ref: reportCode(report.id), completed: true }
  if (report.status !== 'SUBMITTED') throw new BadRequestException(REPORT_NOT_LINKED)
  const judged = await judgeLines(em, report.id)
  const staged = expenseAmount(payload.amount, 999_999_999)
  if (!judged.lines.length || staged === null || cents(staged) !== judged.totalCents || cents(report.totalAmount) !== judged.totalCents) throw new BadRequestException(REPORT_TOTAL_CHANGED)
  const amount = judged.totalCents / 100
  const entry = await em.getRepository(EmployeeObligation).save({
    employeeId: req.requesterId, type: 'CREDIT', category: 'expense', amount, label: `مصروفات: تقرير ${reportCode(report.id)} — ${report.title}`.slice(0, 300), status: 'PENDING',
    sourceRequestId: req.id, effectiveDate: null as unknown as string,
  })
  const now = new Date()
  await em.getRepository(ExpenseReport).update({ id: report.id }, { status: 'APPROVED', obligationId: entry.id, approvedAt: now, updatedAt: now })
  return { ref: reportCode(report.id), completed: true, note: `إضافة ${amount} في دفتر المديونيات (تقرير ${reportCode(report.id)}، ${judged.lines.length} بند)` }
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
