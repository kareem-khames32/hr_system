import { Column, Entity, PrimaryGeneratedColumn, type EntityManager } from 'typeorm'

// B5.1 (ب): دورة الزيادات — الدورة، وميزانية كل إدارة فيها، وسطر اقتراح لكل موظف.
//  - السطر اقتراح بس: **مابيغيّرش راتب**. الراتب بيتكتب بعد الاعتماد من خدمة تاريخ الراتب (الجزء ج).
//  - المبلغ = زيادة شهرية على الأساسي بعملة فرع الموظف. المدير بيكتب المبلغ ومابيشوفش الراتب.
//  - الميزانية تحذير مش منع: السطر بيتحفظ حتى لو عدّاها، والشاشة بتقول.

export type CycleStatus = 'DRAFT' | 'OPEN' | 'REVIEW' | 'APPROVED' | 'APPLIED' | 'CANCELLED'
export const CYCLE_STATUS_LABELS: Record<CycleStatus, string> = {
  DRAFT: 'مسودة', OPEN: 'مفتوحة للاقتراحات', REVIEW: 'تحت المراجعة', APPROVED: 'معتمدة', APPLIED: 'اتطبّقت', CANCELLED: 'ملغاة',
}

@Entity('compensation_cycles')
export class CompensationCycle {
  @PrimaryGeneratedColumn({ primaryKeyConstraintName: 'PK_compensation_cycles' })
  id: number

  @Column({ type: 'nvarchar', length: 120 })
  name: string

  /** «يسري من راتب شهر» (YYYY-MM): الزيادة على الشهر كامل */
  @Column({ type: 'nvarchar', length: 7 })
  effectivePayrollPeriod: string

  @Column({ type: 'nvarchar', length: 20 })
  status: CycleStatus

  @Column({ type: 'nvarchar', length: 500, nullable: true })
  note: string | null

  @Column({ type: 'int' })
  createdByUserId: number

  @Column({ type: 'datetime2' })
  createdAt: Date

  @Column({ type: 'datetime2', nullable: true })
  openedAt: Date | null

  /** مين بعت الدورة للمراجعة (اللي بيعتمد لازم يبقى غيره — الجزء ج) */
  @Column({ type: 'int', nullable: true })
  reviewByUserId: number | null

  @Column({ type: 'datetime2', nullable: true })
  reviewAt: Date | null

  @Column({ type: 'int', nullable: true })
  approvedByUserId: number | null

  @Column({ type: 'datetime2', nullable: true })
  approvedAt: Date | null

  @Column({ type: 'datetime2', nullable: true })
  appliedAt: Date | null

  @Column({ type: 'int', nullable: true })
  updatedByUserId: number | null

  @Column({ type: 'datetime2', nullable: true })
  updatedAt: Date | null
}

@Entity('compensation_budgets')
export class CompensationBudget {
  @PrimaryGeneratedColumn({ primaryKeyConstraintName: 'PK_compensation_budgets' })
  id: number

  @Column({ type: 'int' })
  cycleId: number

  /** الإدارة أو القسم (جدول departments) — الميزانية بتغطي الوحدة واللي تحتها */
  @Column({ type: 'int' })
  departmentId: number

  /** إجمالي الزيادة الشهرية المسموح بيه للوحدة، بعملة فرعها */
  @Column({ type: 'decimal', precision: 12, scale: 2 })
  amount: number

  @Column({ type: 'int' })
  updatedByUserId: number

  @Column({ type: 'datetime2' })
  updatedAt: Date
}

@Entity('compensation_proposals')
export class CompensationProposal {
  @PrimaryGeneratedColumn({ primaryKeyConstraintName: 'PK_compensation_proposals' })
  id: number

  @Column({ type: 'int' })
  cycleId: number

  @Column({ type: 'int' })
  employeeId: number

  /** أساسي الموظف وقت آخر كتابة على السطر — التطبيق بيرفض السطر لو الأساسي اتغيّر بعدها */
  @Column({ type: 'decimal', precision: 12, scale: 2 })
  currentBasic: number

  /** اقتراح المدير (أو أول مبلغ اتكتب) */
  @Column({ type: 'decimal', precision: 12, scale: 2 })
  proposedAmount: number

  @Column({ type: 'int' })
  proposedByUserId: number

  @Column({ type: 'datetime2' })
  proposedAt: Date

  @Column({ type: 'nvarchar', length: 500, nullable: true })
  note: string | null

  /** المبلغ اللي هيتعتمد: الاقتراح لحد ما المراجعة تعدّله */
  @Column({ type: 'decimal', precision: 12, scale: 2 })
  finalAmount: number

  @Column({ type: 'int', nullable: true })
  adjustedByUserId: number | null

  @Column({ type: 'datetime2', nullable: true })
  adjustedAt: Date | null

  @Column({ type: 'nvarchar', length: 500, nullable: true })
  adjustNote: string | null

  @Column({ type: 'datetime2', nullable: true })
  appliedAt: Date | null

  @Column({ type: 'int', nullable: true })
  appliedByUserId: number | null

  /** رقم مراجعة تاريخ الراتب اللي اتكتبت من السطر ده */
  @Column({ type: 'int', nullable: true })
  appliedRevision: number | null
}

// ===== القواعد (حساب نقي) =====

export type CycleStep = 'open' | 'review' | 'reopen' | 'cancel'
/** خطوات الجزء (ب): الحالة اللي بتبدأ منها كل خطوة واللي بتروحها */
export const CYCLE_STEPS: Record<CycleStep, { from: CycleStatus[]; to: CycleStatus; label: string }> = {
  open: { from: ['DRAFT'], to: 'OPEN', label: 'فتح الدورة للاقتراحات' },
  review: { from: ['OPEN'], to: 'REVIEW', label: 'قفل الاقتراحات وبدء المراجعة' },
  reopen: { from: ['REVIEW'], to: 'OPEN', label: 'رجوع الدورة للاقتراحات' },
  cancel: { from: ['DRAFT', 'OPEN', 'REVIEW'], to: 'CANCELLED', label: 'إلغاء الدورة' },
}
export const cycleStepOf = (raw: unknown): CycleStep | null => (typeof raw === 'string' && Object.prototype.hasOwnProperty.call(CYCLE_STEPS, raw) ? raw as CycleStep : null)
/** المدير بيقترح والدورة مفتوحة بس؛ والمراجعة بتعدّل والدورة مفتوحة أو تحت المراجعة؛ والميزانية لحد قبل الاعتماد */
export const PROPOSE_STATUSES: readonly CycleStatus[] = ['OPEN']
export const ADJUST_STATUSES: readonly CycleStatus[] = ['OPEN', 'REVIEW']
export const BUDGET_STATUSES: readonly CycleStatus[] = ['DRAFT', 'OPEN', 'REVIEW']

export const RAISE_AMOUNT_MAX = 9999999.99
export const RAISE_AMOUNT_ERROR = 'مبلغ الزيادة رقم من صفر لحد 9,999,999.99 وبمنزلتين عشريتين بالكتير (الصفر = من غير زيادة)'
/** مبلغ زيادة أو ميزانية: رقم مش سالب بمنزلتين بالكتير — من غير تقريب صامت */
export function raiseAmount(raw: unknown): number | null {
  if (typeof raw !== 'number' || !Number.isFinite(raw) || raw < 0 || raw > RAISE_AMOUNT_MAX) return null
  return Math.abs(raw * 100 - Math.round(raw * 100)) < 1e-7 ? Math.round(raw * 100) / 100 : null
}

const NOTE_MAX = 500
/** ملاحظة اختيارية (أو مطلوبة) بحد 500 حرف */
export function raiseNote(raw: unknown, required: boolean): { note: string | null; error: string | null } {
  if (raw !== undefined && raw !== null && typeof raw !== 'string') return { note: null, error: 'الملاحظة نص' }
  const note = typeof raw === 'string' ? raw.trim() : ''
  if (note.length > NOTE_MAX) return { note: null, error: `الملاحظة ${NOTE_MAX} حرف بالكتير` }
  if (required && !note) return { note: null, error: 'اكتب سبب التعديل' }
  return { note: note || null, error: null }
}

export interface CycleFields { name: string; effectivePayrollPeriod: string; note: string | null }
export function cycleFields(body: unknown): { fields: CycleFields | null; error: string | null } {
  const input = (body ?? {}) as Record<string, unknown>
  const name = typeof input.name === 'string' ? input.name.trim() : ''
  if (!name || name.length > 120) return { fields: null, error: 'اسم الدورة مطلوب (120 حرف بالكتير)' }
  const period = input.effectivePayrollPeriod
  if (typeof period !== 'string' || !/^\d{4}-(0[1-9]|1[0-2])$/.test(period) || period.startsWith('0000-')) return { fields: null, error: 'اختر «يسري من راتب شهر» بصيغة YYYY-MM' }
  const note = raiseNote(input.note, false)
  if (note.error !== null) return { fields: null, error: note.error }
  return { fields: { name, effectivePayrollPeriod: period, note: note.note }, error: null }
}

const money = (value: number) => Math.round(value * 100) / 100
/** المستخدم من الميزانية والباقي، و«عدّت» تحذير بس */
export function budgetUsage(budget: number, used: number): { budget: number; used: number; remaining: number; over: boolean } {
  return { budget: money(budget), used: money(used), remaining: money(budget - used), over: money(used) > money(budget) }
}

/** الوحدات اللي ميزانيتها بتغطي موظف القسم ده: قسمه وكل اللي فوقه (بحارس من الدوران) */
export function coveringUnits(departmentId: number | null, parentOf: ReadonlyMap<number, number | null>): number[] {
  const out: number[] = []
  for (let unit = departmentId; unit != null && !out.includes(unit); unit = parentOf.get(unit) ?? null) out.push(unit)
  return out
}

// ===== (ج) الاعتماد والتطبيق =====

/** مرجع تغيير الراتب المكتوب من الدورة — بيربط صف تاريخ الراتب برقمها */
export const cycleEvidenceReference = (cycleId: number) => `COMP-CYCLE-${cycleId}`
export const APPROVER_SENT_REVIEW = 'اللي بعت الدورة للمراجعة مايعتمدهاش — الاعتماد من حد تاني'
export const APPROVER_WROTE_LINE = 'اللي اقترح أو عدّل سطر في الدورة مايعتمدهاش — الاعتماد من حد ماقترحش'
export const APPROVE_NO_LINES = 'الدورة مافيهاش زيادات تتعتمد'
/**
 * اعتماد من حد ماقترحش: مش اللي بعتها للمراجعة، ومش اللي كتب أو عدّل أي سطر — **في أي وقت**: `writerIds` سجل كل اللي كتبوا في الدورة
 * (compensation_writers)، فتعديل لاحق من حد تاني مابيمسحش الكاتب الأول (Codex P5A-B02). بيرجّع رسالة الرفض أو null
 */
export function approverIssue(cycle: { reviewByUserId: number | null }, lines: ReadonlyArray<{ proposedByUserId: number; adjustedByUserId: number | null; finalAmount: number | string }>, userId: number,
  writerIds: readonly number[] = []): string | null {
  if (!lines.some(line => Number(line.finalAmount) > 0)) return APPROVE_NO_LINES
  if (cycle.reviewByUserId === userId) return APPROVER_SENT_REVIEW
  return writerIds.includes(userId) || lines.some(line => line.proposedByUserId === userId || line.adjustedByUserId === userId) ? APPROVER_WROTE_LINE : null
}

/** كل حساب كتب سطر في دورة (اقتراح أو تعديل): صف واحد للحساب والدورة، ومابيتمسحش. نفس الشكل في ترحيل 181 بالحرف. */
@Entity('compensation_writers')
export class CompensationWriter {
  @PrimaryGeneratedColumn({ primaryKeyConstraintName: 'PK_compensation_writers' })
  id: number

  @Column({ type: 'int' })
  cycleId: number

  @Column({ type: 'int' })
  userId: number

  @Column({ type: 'datetime2' })
  createdAt: Date
}

/** تسجيل كاتب سطر في الدورة — جوه معاملة الكتابة (صف الدورة مقفول)، ومرة واحدة للحساب */
export async function recordCycleWriter(em: EntityManager, cycleId: number, userId: number): Promise<void> {
  await em.query(`IF NOT EXISTS (SELECT 1 FROM dbo.compensation_writers WITH (UPDLOCK, HOLDLOCK) WHERE [cycleId] = @0 AND [userId] = @1)
    INSERT INTO dbo.compensation_writers ([cycleId], [userId], [createdAt]) VALUES (@0, @1, SYSDATETIME())`, [cycleId, userId])
}
/** كل اللي كتبوا سطر في الدورة */
export async function cycleWriterIds(em: EntityManager, cycleId: number): Promise<number[]> {
  const rows: Array<{ userId: number }> = await em.query('SELECT [userId] FROM dbo.compensation_writers WHERE [cycleId] = @0', [cycleId])
  return rows.map(row => Number(row.userId))
}

const cents = (value: number | string) => Math.round(Number(value) * 100)
/** الأساسي اللي اتراجع عليه السطر هو أساسي الموظف دلوقتي؟ (بالقروش) */
export const sameBasic = (left: number | string, right: number | string) => cents(left) === cents(right)
/** الأساسي الجديد = الأساسي + الزيادة، نص بمنزلتين (حساب بالقروش) */
export const raisedBasic = (currentBasic: number | string, amount: number | string) => ((cents(currentBasic) + cents(amount)) / 100).toFixed(2)

// ===== جاهزية الترحيل =====

let ready: boolean | null = null
/** جداول ترحيلات 140–142 و181 موجودة؟ الموجود بيتحفظ؛ الناقص بيتفحص مع كل نداء لحد ما الترحيل يتطبق */
export async function compensationCyclesReady(em: EntityManager): Promise<boolean> {
  if (ready === true) return true
  const [row] = await em.query(`SELECT CASE WHEN OBJECT_ID(N'dbo.compensation_cycles', N'U') IS NOT NULL AND OBJECT_ID(N'dbo.compensation_budgets', N'U') IS NOT NULL
    AND OBJECT_ID(N'dbo.compensation_proposals', N'U') IS NOT NULL AND OBJECT_ID(N'dbo.compensation_writers', N'U') IS NOT NULL THEN 1 ELSE 0 END AS [ready]`)
  ready = Number(row?.ready) === 1
  return ready
}
/** للاختبارات: نسيان حالة الترحيل */
export function resetCompensationCyclesCache() { ready = null }
