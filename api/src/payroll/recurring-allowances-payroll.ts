import { ConflictException } from '@nestjs/common'
import type { EntityManager } from 'typeorm'
import { EmployeeObligation } from '../requests/entities/financial.entities'
import { ALLOWANCE_OBLIGATION_CATEGORY } from './allowances-grants'
import {
  isManagedRecurringCredit, parseRecurringAllowanceSourceRef, planRecurringAllowanceMonth, recurringAllowanceCovers, recurringAllowanceMonthCents,
  recurringAllowanceSourceRef, type RecurringAllowanceWindow, type RecurringCreditRow,
} from './recurring-allowances'

// البدل الثابت الشهري جوه المسير (القواعد النقية في recurring-allowances.ts):
// - الحساب/إعادة الحساب: لكل موظف مغطى في المسير، لكل إسناد بيغطي شهر المسير = قيد «بدل» CREDIT واحد بالمرجع الثابت
//   (بيتعمل أو بيتحدّث بمبلغ الشهر بعد تناسب المنضم/المغادر)، وقيد إسناد ماعادش بيغطي الشهر بيتلغي. المحجوز والمصروف ما يتلمسش.
// - الاعتماد: الإسنادات اللي بتغطي الشهر دلوقتي لازم تكون نفس اللي اتحسب بيها المسير (اتضاف أو اتوقف بعد الحساب = أعد الحساب).
// - موظف خرج من المسير أو مسير اتلغى: قيد شهره المُدار يتلغي، إلا لو في مسير مفتوح تاني لنفس الشهر فيه الموظف (القيد بتاعه).

const inList = (values: readonly unknown[], offset = 0) => values.map((_, index) => `@${index + offset}`).join(', ')
const chunks = <T>(rows: readonly T[], size = 500) => Array.from({ length: Math.ceil(rows.length / size) }, (_, index) => rows.slice(index * size, (index + 1) * size))
const uniqueIds = (ids: readonly unknown[]) => [...new Set(ids.map(Number))].filter(id => Number.isSafeInteger(id) && id > 0).sort((a, b) => a - b)
const cents = (value: unknown) => Math.round(Number(value ?? 0) * 100)

export async function recurringAllowanceTableReady(em: EntityManager): Promise<boolean> {
  const rows: Array<{ id: number | null }> = await em.query(`SELECT OBJECT_ID(N'dbo.payroll_recurring_allowances', N'U') AS [id]`)
  return rows[0]?.id != null
}

export interface RecurringAssignmentRow extends RecurringAllowanceWindow {
  id: number; employeeId: number; allowanceTypeId: number; typeName: string; amount: string; status: string
}
export interface RecurringCreditDbRow extends RecurringCreditRow {
  employeeId: number; sourceRef: string; assignmentId: number; period: string
  appliedPayrollRunId: number | null; payrollReversalRunId: number | null
}

const numberOrNull = (value: unknown) => value == null ? null : Number(value)

/** إسنادات الموظفين اللي بدأت في الشهر ده أو قبله (المنادي بيفلتر بـrecurringAllowanceCovers). */
export async function readRecurringAssignments(em: EntityManager, employeeIds: readonly number[], period: string): Promise<RecurringAssignmentRow[]> {
  const result: RecurringAssignmentRow[] = []
  for (const chunk of chunks(uniqueIds(employeeIds))) {
    const rows: Array<Record<string, unknown>> = await em.query(`SELECT [id], [employeeId], [allowanceTypeId], [typeName], CAST([amount] AS nvarchar(40)) AS [amount],
        [fromPeriod], [untilPeriod], [stoppedFromPeriod], [status]
      FROM [payroll_recurring_allowances] WHERE [fromPeriod] <= @0 AND [employeeId] IN (${inList(chunk, 1)})`, [period, ...chunk])
    for (const row of rows) result.push({ id: Number(row.id), employeeId: Number(row.employeeId), allowanceTypeId: Number(row.allowanceTypeId), typeName: String(row.typeName),
      amount: String(row.amount), fromPeriod: String(row.fromPeriod), untilPeriod: (row.untilPeriod as string | null) ?? null,
      stoppedFromPeriod: (row.stoppedFromPeriod as string | null) ?? null, status: String(row.status) })
  }
  return result.sort((a, b) => a.id - b.id)
}

/** قيود البدل الثابت غير الملغاة للموظفين؛ period = شهر واحد (بالشهر المستهدف)، أو null = كل الشهور. */
export async function readRecurringCredits(em: EntityManager, employeeIds: readonly number[], period: string | null): Promise<RecurringCreditDbRow[]> {
  const result: RecurringCreditDbRow[] = []
  for (const chunk of chunks(uniqueIds(employeeIds))) {
    const params: unknown[] = [...chunk]
    const periodClause = period ? `AND [targetPeriod] = @${params.push(period) - 1}` : ''
    const rows: Array<Record<string, unknown>> = await em.query(`SELECT [id], [employeeId], [sourceRef], [status], CAST([amount] AS nvarchar(40)) AS [amount], [label], [targetPeriod],
        [reservedPayrollRunId], [appliedPayrollRunId], [payrollReversalRunId], [payrollReversalOfObligationId], [carriedFromObligationId]
      FROM [employee_obligations]
      WHERE [sourceRef] LIKE N'recurring-allowance:%' AND [status] <> N'CANCELLED' AND [employeeId] IN (${inList(chunk)}) ${periodClause}`, params)
    for (const row of rows) {
      const ref = parseRecurringAllowanceSourceRef(row.sourceRef)
      if (!ref || (period && ref.period !== period)) continue
      result.push({ id: Number(row.id), employeeId: Number(row.employeeId), sourceRef: String(row.sourceRef), assignmentId: ref.assignmentId, period: ref.period,
        status: String(row.status), amount: String(row.amount), label: (row.label as string | null) ?? null, targetPeriod: (row.targetPeriod as string | null) ?? null,
        reservedPayrollRunId: numberOrNull(row.reservedPayrollRunId), appliedPayrollRunId: numberOrNull(row.appliedPayrollRunId),
        payrollReversalRunId: numberOrNull(row.payrollReversalRunId), payrollReversalOfObligationId: numberOrNull(row.payrollReversalOfObligationId),
        carriedFromObligationId: numberOrNull(row.carriedFromObligationId) })
    }
  }
  return result.sort((a, b) => a.id - b.id)
}

/** إلغاء قيود مُدارة بس (مستحقة ومش محجوزة ولا إعادة بعد عكس ولا مرحّلة)؛ بيرجع اللي اتلغى فعلًا. */
export async function cancelManagedRecurringCredits(em: EntityManager, ids: readonly number[]): Promise<number[]> {
  const cancelled: number[] = []
  for (const chunk of chunks(uniqueIds(ids))) {
    const rows: Array<{ id: number }> = await em.query(`UPDATE [employee_obligations] SET [status] = N'CANCELLED' OUTPUT INSERTED.[id]
      WHERE [status] = N'PENDING' AND [reservedPayrollRunId] IS NULL AND [payrollReversalOfObligationId] IS NULL AND [carriedFromObligationId] IS NULL
        AND [sourceRef] LIKE N'recurring-allowance:%' AND [id] IN (${inList(chunk)})`, chunk)
    for (const row of rows) cancelled.push(Number(row.id))
  }
  return cancelled.sort((a, b) => a - b)
}

export interface RecurringAllowancePayrollLine {
  assignmentId: number
  allowanceTypeId: number
  name: string
  // المبلغ الشهري الكامل، ومبلغ الشهر ده (بعد تناسب المنضم/المغادر، أو قيد اتسوّى قبل كده)
  monthlyAmount: number
  amount: number
  coverDays: number
  monthlyDays: number
  prorated: boolean
  obligationId: number | null
  // IN_RUN = قيده داخل المسير ده؛ ALREADY_SETTLED = الشهر ده اتعمل حسابه (محجوز لمسير معتمد/اتصرف/إعادة بعد عكس)؛ NO_AMOUNT = مبلغه صفر
  status: 'IN_RUN' | 'ALREADY_SETTLED' | 'NO_AMOUNT'
}

export interface RecurringAllowancesSyncInput {
  employeeId: number
  startDate: string
  // نفس شرط الراتب: التغطية من أول يوم في الفترة لآخر يوم
  fullCoverage: boolean
  coverDays: number
  monthlyDays: number
  actorUserId: number | null
}

/**
 * قبل قراءة قيود الدفتر في حساب المسير: الإسنادات وقيود الشهر لكل موظفي المسير بتتقري مرة واحدة، والمزامنة لكل موظف
 * بتكتب بس لما يتغير حاجة (إعادة الحساب من غير تغيير = ولا كتابة).
 */
export async function prepareRecurringAllowancesRun(em: EntityManager, input: { period: string; employeeIds: readonly number[] }) {
  const period = input.period
  const ready = input.employeeIds.length > 0 && await recurringAllowanceTableReady(em)
  const assignments = new Map<number, RecurringAssignmentRow[]>()
  const credits = new Map<number, RecurringCreditDbRow[]>()
  if (ready) {
    for (const row of await readRecurringAssignments(em, input.employeeIds, period)) assignments.set(row.employeeId, [...(assignments.get(row.employeeId) ?? []), row])
    for (const row of await readRecurringCredits(em, input.employeeIds, period)) credits.set(row.employeeId, [...(credits.get(row.employeeId) ?? []), row])
  }
  return {
    async sync(args: RecurringAllowancesSyncInput): Promise<{ lines: RecurringAllowancePayrollLine[]; total: number }> {
      if (!ready) return { lines: [], total: 0 }
      const mine = (assignments.get(args.employeeId) ?? []).filter(row => recurringAllowanceCovers(row, period))
      const byAssignment = new Map<number, RecurringCreditDbRow[]>()
      for (const row of credits.get(args.employeeId) ?? []) byAssignment.set(row.assignmentId, [...(byAssignment.get(row.assignmentId) ?? []), row])
      const lines: RecurringAllowancePayrollLine[] = []
      const toCancel: number[] = []
      for (const row of mine) {
        const monthlyCents = cents(row.amount)
        const wanted = recurringAllowanceMonthCents(monthlyCents, { fullCoverage: args.fullCoverage, coverDays: args.coverDays, monthlyDays: args.monthlyDays })
        const plan = planRecurringAllowanceMonth(byAssignment.get(row.id) ?? [], wanted, row.typeName, period)
        toCancel.push(...plan.cancel)
        const base = { assignmentId: row.id, allowanceTypeId: row.allowanceTypeId, name: row.typeName, monthlyAmount: monthlyCents / 100,
          coverDays: args.coverDays, monthlyDays: args.monthlyDays, prorated: wanted !== monthlyCents }
        if (plan.kind === 'SETTLED') { lines.push({ ...base, amount: plan.settledCents / 100, obligationId: plan.settledId, status: 'ALREADY_SETTLED' }); continue }
        if (plan.kind === 'NONE') { lines.push({ ...base, amount: 0, obligationId: null, status: 'NO_AMOUNT' }); continue }
        let obligationId: number
        if (plan.kind === 'KEEP') {
          obligationId = plan.id
          if (plan.update) {
            const updated: Array<{ id: number }> = await em.query(`UPDATE [employee_obligations] SET [amount] = CAST(@0 AS decimal(18,2)), [label] = @1, [targetPeriod] = @2
              OUTPUT INSERTED.[id] WHERE [id] = @3 AND [status] = N'PENDING' AND [reservedPayrollRunId] IS NULL`, [(wanted / 100).toFixed(2), row.typeName.slice(0, 300), period, plan.id])
            if (updated.length !== 1) throw new ConflictException('قيد البدل الثابت اتغير أثناء حساب المسير؛ جرّب تاني')
          }
        } else {
          const repo = em.getRepository(EmployeeObligation)
          const saved = await repo.save(repo.create({ employeeId: args.employeeId, type: 'CREDIT', category: ALLOWANCE_OBLIGATION_CATEGORY, amount: wanted / 100,
            label: row.typeName.slice(0, 300), status: 'PENDING', effectiveDate: args.startDate, sourceRef: recurringAllowanceSourceRef(row.id, period),
            createdByUserId: args.actorUserId as number, targetPeriod: period }))
          obligationId = saved.id
        }
        lines.push({ ...base, amount: wanted / 100, obligationId, status: 'IN_RUN' })
      }
      // قيد الشهر لإسناد ماعادش بيغطيه (اتوقف أو اتقصّر شهره): المُدار منه يتلغي
      const covering = new Set(mine.map(row => row.id))
      for (const [assignmentId, rows] of byAssignment) if (!covering.has(assignmentId)) toCancel.push(...rows.filter(isManagedRecurringCredit).map(row => row.id))
      if (toCancel.length) await cancelManagedRecurringCredits(em, toCancel)
      const total = lines.filter(line => line.status === 'IN_RUN').reduce((sum, line) => sum + Math.round(line.amount * 100), 0) / 100
      return { lines, total }
    },
  }
}

/**
 * موظفين خرجوا من مسير (إعادة حساب من غيرهم) أو مسير اتلغى: قيد شهرهم المُدار يتلغي — إلا لو في مسير مفتوح تاني لنفس الشهر
 * فيه الموظف (القيد بتاعه، وإعادة حسابه بتحدّثه). المحجوز لمسير معتمد والمصروف ما يتلمسش. بيرجع أرقام القيود اللي اتلغت.
 */
export async function releaseRecurringAllowanceCredits(em: EntityManager, input: { period: string; employeeIds: readonly number[]; exceptRunId: number | null }): Promise<number[]> {
  const employeeIds = uniqueIds(input.employeeIds)
  if (!employeeIds.length || !(await recurringAllowanceTableReady(em))) return []
  const managed = (await readRecurringCredits(em, employeeIds, input.period)).filter(isManagedRecurringCredit)
  if (!managed.length) return []
  const held = new Set<number>()
  for (const chunk of chunks(uniqueIds(managed.map(row => row.employeeId)))) {
    const rows: Array<{ employeeId: number }> = await em.query(`SELECT DISTINCT i.[employeeId] FROM [payroll_items] i INNER JOIN [payroll_runs] r ON r.[id] = i.[runId]
      WHERE r.[period] = @0 AND r.[status] IN (N'DRAFT', N'CALCULATED') AND (r.[runType] IS NULL OR r.[runType] <> N'REVERSAL') AND r.[id] <> @1
        AND i.[employeeId] IN (${inList(chunk, 2)})`, [input.period, input.exceptRunId ?? 0, ...chunk])
    for (const row of rows) held.add(Number(row.employeeId))
  }
  return cancelManagedRecurringCredits(em, managed.filter(row => !held.has(row.employeeId)).map(row => row.id))
}

/**
 * الاعتماد: الإسنادات اللي بتغطي شهر المسير دلوقتي لكل موظف لازم تطابق اللي اتحسب بيها بنده (breakdown.recurringAllowances).
 * بدل ثابت اتضاف أو اتوقف بعد الحساب = المسير محتاج إعادة حساب قبل الاعتماد (عشان الشهر ما يتصرفش ناقص أو زيادة).
 */
export async function assertRecurringAllowancesCurrent(em: EntityManager, run: { period: string }, items: ReadonlyArray<{ employeeId: number; breakdown?: string | null }>) {
  if (!items.length || !(await recurringAllowanceTableReady(em))) return
  const covering = new Map<number, Set<number>>()
  for (const row of await readRecurringAssignments(em, items.map(item => item.employeeId), run.period)) {
    if (!recurringAllowanceCovers(row, run.period)) continue
    covering.set(row.employeeId, (covering.get(row.employeeId) ?? new Set<number>()).add(row.id))
  }
  const stale: number[] = []
  for (const item of items) {
    let breakdown: Record<string, any> = {}
    try { breakdown = item.breakdown ? JSON.parse(item.breakdown) : {} } catch { breakdown = {} }
    const lines: unknown[] = Array.isArray(breakdown.recurringAllowances?.lines) ? breakdown.recurringAllowances.lines : []
    const recorded = new Set(lines.map(line => Number((line as { assignmentId?: unknown } | null)?.assignmentId)))
    const now = covering.get(item.employeeId) ?? new Set<number>()
    if (recorded.size !== now.size || [...now].some(id => !recorded.has(id))) stale.push(item.employeeId)
  }
  if (stale.length) {
    throw new ConflictException({ code: 'PAYRUN-RECURRING-ALLOWANCE-CHANGED',
      message: `البدل الثابت الشهري اتضاف أو اتوقف بعد حساب المسير (${stale.length === 1 ? `الموظف #${stale[0]}` : `${stale.length} موظفين`})؛ أعد حساب المسودة قبل الاعتماد`,
      employeeIds: stale.sort((a, b) => a - b) })
  }
}
