import { ConflictException } from '@nestjs/common'
import { EntityManager } from 'typeorm'
import { payrollLineNotReversedSql } from './payroll-reversal-sql'

/**
 * قرار المالك (20 سبتمبر): راتب آخر شهر للموظف المنتهي خدمته يتحسب مرة واحدة بس.
 * المصدر الوحيد = بند المسير للشهر اللي فيه آخر يوم عمل (نفس التغطية والتناسب والخصومات)،
 * والتصفية بتاخد نفس الرقم بالظبط كبند فيها. صف الموظف في المسير بيتعلّم «تصفية — مصروف مع التصفية»:
 * مبلغه داخل في إجمالي المسير (عشان تكلفة الشهر تبقى كاملة) وبرّه كشف البنك والمبلغ المستحق للصرف،
 * فمستحيل يتصرف مرتين ومستحيل الرقمين يختلفوا.
 */
export const SETTLEMENT_RUN_ROW_LABEL = 'تصفية — مصروف مع التصفية'
export const SETTLEMENT_SALARY_LINE_PREFIX = 'راتب آخر شهر'

export const settlementSalaryLineLabel = (period: string, runId: number) =>
  `${SETTLEMENT_SALARY_LINE_PREFIX} ${period} (مسير #${runId}) — مصروف مع التصفية`

export interface PayrollSettlementCase { caseId: number; lastWorkingDay: string; status: string }
export interface PayrollItemSettlementPayout { caseId: number; lastWorkingDay: string; label: string }

/** علامة «مصروف مع التصفية» من تفصيل بند المسير المحفوظ (بلا إعادة حساب). */
export function payrollItemSettlementPayout(breakdown: string | null | undefined): PayrollItemSettlementPayout | null {
  try {
    const payout = (JSON.parse(breakdown || '{}') as { settlementPayout?: PayrollItemSettlementPayout }).settlementPayout
    return payout && /^\d{4}-\d{2}-\d{2}$/.test(String(payout.lastWorkingDay))
      ? { caseId: Number(payout.caseId) || 0, lastWorkingDay: String(payout.lastWorkingDay), label: SETTLEMENT_RUN_ROW_LABEL } : null
  } catch { return null }
}

/** ملف إنهاء الخدمة اللي آخر يوم عمل فيه جوه فترة المسير — ده الشهر اللي راتبه بيتصرف مع التصفية. */
export function payrollSettlementCase(
  cases: ReadonlyArray<{ id?: number; status: string; lastWorkingDay: string }>, startDate: string, endDate: string,
): PayrollSettlementCase | null {
  const found = cases.filter(kase => kase.status !== 'CANCELLED'
    && String(kase.lastWorkingDay).slice(0, 10) >= startDate && String(kase.lastWorkingDay).slice(0, 10) <= endDate)
    .sort((a, b) => String(a.lastWorkingDay).localeCompare(String(b.lastWorkingDay)) || (a.id ?? 0) - (b.id ?? 0))
  const last = found[found.length - 1]
  return last ? { caseId: last.id ?? 0, lastWorkingDay: String(last.lastWorkingDay).slice(0, 10), status: last.status } : null
}

export interface PayrollSettlementSalary {
  found: boolean
  runId: number | null
  runName: string | null
  period: string | null
  runStatus: string | null
  /** صافي بند المسير للشهر — نفس الرقم اللي بيدخل التصفية. */
  amount: number
}

/** راتب آخر شهر من المسير نفسه (المصدر الوحيد) — التصفية بتقرأه ولا بتعيد حسابه. */
export async function readPayrollSettlementSalary(
  em: EntityManager, employeeId: number, lastWorkingDay: string,
): Promise<PayrollSettlementSalary> {
  const day = String(lastWorkingDay).slice(0, 10)
  const empty: PayrollSettlementSalary = { found: false, runId: null, runName: null, period: null, runStatus: null, amount: 0 }
  if (!/^\d{4}-\d{2}-\d{2}$/.test(day) || !Number.isSafeInteger(employeeId) || employeeId < 1) return empty
  const rows: Array<{ runId: number; name: string | null; period: string; status: string; netPay: unknown }> = await em.query(
    `SELECT i.[runId] AS runId, r.[name] AS name, r.[period] AS period, r.[status] AS status, i.[netPay] AS netPay
     FROM [payroll_items] i INNER JOIN [payroll_runs] r ON r.[id] = i.[runId]
     WHERE i.[employeeId] = @0 AND r.[status] <> 'CANCELLED' AND ISNULL(r.[runType], 'REGULAR') = 'REGULAR'
       AND r.[startDate] <= @1 AND r.[endDate] >= @1 AND ${payrollLineNotReversedSql('i.[runId]', 'i.[employeeId]')}
     ORDER BY i.[runId] DESC`, [employeeId, day])
  if (!rows.length) return empty
  if (rows.length > 1) {
    throw new ConflictException('للموظف أكتر من مسير غير ملغى في شهر آخر يوم عمل؛ سوّي المسيرات قبل بناء التصفية')
  }
  const row = rows[0]
  return { found: true, runId: Number(row.runId), runName: row.name ?? null, period: row.period ?? null,
    runStatus: row.status ?? null, amount: Math.round(Number(row.netPay) * 100) / 100 }
}

const money = (value: number) => (Math.round(value * 100) / 100).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })
const isSalaryLine = (line: { isAuto?: boolean | null; type?: string | null; label?: string | null }) =>
  !!line.isAuto && String(line.label ?? '').startsWith(SETTLEMENT_SALARY_LINE_PREFIX)

/**
 * اعتماد/صرف المسير يرفض صف «مصروف مع التصفية» اللي مش مساوي لبند الراتب في تصفيته المعتمدة:
 * إمّا إعادة حساب بأثر رجعي غيّرت الرقم، أو تصفية اتعمدت قبل ما مسير الشهر يتحسب فبقيت بلا بند راتب
 * (ساعتها الصف مستبعد من المستحق والراتب هيضيع) — الحالتين بيتمسكوا قبل ما فلوس تتحرك.
 */
export async function assertSettlementSalaryMatchesItem(em: EntityManager, employeeId: number, caseId: number, netPay: number) {
  if (!Number.isSafeInteger(caseId) || caseId < 1) return
  const kases: Array<{ status: string }> = await em.query(
    'SELECT [status] AS status FROM [offboarding_cases] WHERE [id] = @0 AND [employeeId] = @1', [caseId, employeeId])
  if (!kases.length || !['SETTLED', 'CLOSED'].includes(kases[0].status)) return
  const rows: Array<{ amount: unknown; type: string }> = await em.query(
    `SELECT [amount] AS amount, [type] AS type FROM [settlement_lines]
     WHERE [caseId] = @0 AND [isAuto] = 1 AND [label] LIKE @1`, [caseId, `${SETTLEMENT_SALARY_LINE_PREFIX}%`])
  const settled = Math.round(rows.reduce((sum, row) => sum + (row.type === 'DEBIT' ? -1 : 1) * Number(row.amount) * 100, 0)) / 100
  const item = Math.round(netPay * 100) / 100
  if (!rows.length) {
    throw new ConflictException(
      `التصفية المعتمدة #${caseId} ما فيهاش بند «${SETTLEMENT_SALARY_LINE_PREFIX}» (اتعمدت قبل حساب مسير الشهر) — ` +
      `راتب الشهر (${money(item)}) مستبعد من المستحق للصرف وهيضيع؛ أعد فتح التصفية وولّد بنودها من المسير قبل الاعتماد أو الصرف`)
  }
  if (settled !== item) {
    throw new ConflictException(
      `صافي الموظف في المسير (${money(item)}) لا يطابق راتب آخر شهر في تصفيته المعتمدة #${caseId} (${money(settled)}) — ` +
      'سوّ الفرق بتسوية مالية على التصفية قبل الاعتماد أو الصرف')
  }
}

/**
 * الاعتماد يرفض لو بند راتب آخر شهر المحفوظ في التصفية اختلف عن بند المسير (إعادة حساب بأثر رجعي مثلًا)
 * — نفس أسلوب فحص بند مكافأة نهاية الخدمة.
 */
export function assertSettlementSalaryMatchesRun(
  stored: Array<{ isAuto?: boolean | null; type?: string | null; label?: string | null; amount?: unknown }>,
  fresh: Array<{ isAuto?: boolean | null; type?: string | null; label?: string | null; amount?: unknown }>,
) {
  const signed = (rows: Array<{ type?: string | null; amount?: unknown }>) =>
    Math.round(rows.reduce((sum, row) => sum + (row.type === 'DEBIT' ? -1 : 1) * Number(row.amount ?? 0) * 100, 0)) / 100
  const expectedRows = fresh.filter(isSalaryLine)
  const foundRows = stored.filter(isSalaryLine)
  const expected = signed(expectedRows), actual = signed(foundRows)
  if (foundRows.length > 1 || actual !== expected || (expectedRows.length > 0 && foundRows.length !== 1)) {
    throw new ConflictException(
      `راتب آخر شهر في التصفية (${foundRows.length ? money(actual) : 'غير موجود'}) لا يطابق بند المسير (${money(expected)}) — ` +
      'أعد توليد البنود وراجعها قبل الاعتماد؛ الرقم مصدره الوحيد هو المسير')
  }
}
