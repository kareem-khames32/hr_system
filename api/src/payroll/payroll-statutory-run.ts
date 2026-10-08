import { In, type EntityManager } from 'typeorm'
import { Branch } from '../org/entities/branch.entity'
import { branchCountryOf } from '../org/branch-currency'
import { RequestsConfig } from '../requests/entities/requests-config.entity'
import { statutoryAt, statutoryNumber } from '../statutory/statutory'
import { readStatutoryEntries } from '../statutory/statutory.service'
import { EG_TAX_COUNTRY, egNetIncomeOfLines, egPeriodTax, egTaxDaysOf, egTaxTableAt, type EgTaxTable } from './eg-salary-tax'
import { loadPayrollLineFacts, projectPayrollItemLines, type PayrollLineItem } from './payroll-item-lines'
import { payrollStatutorySnapshot } from './payroll-statutory'
import { SALARY_ITEM_SEED, salaryItemsReady } from './salary-items'

// B4.4 (ب): الخصومات القانونية المصرية في حساب المسير — ورا إعدادين مقفولين افتراضيًا. بتتحسب بعد ما البند يتبني زي النهارده بالحرف:
// صافي الدخل الخاضع من سطور قسيمة البند نفسها (نفس دالة المعاينة)، والضريبة تراكمية مع اللي اتسجّل قبل كده في السنة، وصندوق الشهداء نسبة
// من إجمالي الاستحقاقات في المسير الأساسي. الإعدادين مقفولين = readPayrollStatutoryContext بيرجّع null = ولا قراءة ولا تغيير.

export const EG_TAX_ENABLED_KEY = 'eg.salary_tax.enabled'
/** أول فترة مسير (YYYY-MM) الضريبة بتتخصم فيها — الفترات اللي قبلها في نفس السنة اتسوّت برّه النظام */
export const EG_TAX_START_PERIOD_KEY = 'eg.salary_tax.start_period'
export const EG_MARTYRS_ENABLED_KEY = 'eg.martyrs_fund.enabled'
export const EG_MARTYRS_FUND_KEY = 'eg.martyrs_fund'
export const PAYROLL_STATUTORY_KEYS = [EG_TAX_ENABLED_KEY, EG_TAX_START_PERIOD_KEY, EG_MARTYRS_ENABLED_KEY] as const
const PERIOD = /^\d{4}-(0[1-9]|1[0-2])$/

export interface PayrollStatutoryContext {
  period: string
  /** الضريبة مفعّلة والفترة من فترة البداية وطالع وجدولها ساري */
  tax: { table: EgTaxTable; startPeriod: string } | null
  /** صندوق الشهداء مفعّل ونسبته سارية — وللمسير الأساسي بس */
  martyrs: { pct: number; effectiveFrom: string } | null
  taxable: Map<string, boolean>
  egyptBranchIds: Set<number>
}

/**
 * سياق الخصومات القانونية لمسير: null لو مفيش حاجة هتتحسب (الإعدادين مقفولين، أو الفترة قبل البداية، أو الصفوف مش سارية) — ده الوضع
 * الافتراضي، ومعاه حساب المسير مابيعملش ولا خطوة زيادة.
 */
export async function readPayrollStatutoryContext(em: EntityManager, run: { period: string; endDate: string; runType?: string | null }): Promise<PayrollStatutoryContext | null> {
  const values = new Map((await em.getRepository(RequestsConfig).find({ where: { key: In([...PAYROLL_STATUTORY_KEYS]) } })).map((row) => [row.key, row.value]))
  const taxOn = values.get(EG_TAX_ENABLED_KEY) === 'true', martyrsOn = values.get(EG_MARTYRS_ENABLED_KEY) === 'true'
  if (!taxOn && !martyrsOn) return null
  const entries = await readStatutoryEntries(em), endDate = String(run.endDate).slice(0, 10)
  const startPeriod = values.get(EG_TAX_START_PERIOD_KEY) ?? ''
  const table = taxOn && PERIOD.test(startPeriod) && run.period >= startPeriod ? egTaxTableAt(entries, endDate) : null
  const fund = martyrsOn && (run.runType ?? 'REGULAR') === 'REGULAR' ? statutoryAt(entries, EG_TAX_COUNTRY, EG_MARTYRS_FUND_KEY, endDate) : null
  const pct = statutoryNumber(fund, 'employee_pct')
  if (!table && !(fund && pct)) return null
  const taxable = new Map(SALARY_ITEM_SEED.map((seed) => [seed.code, seed.taxable]))
  if (await salaryItemsReady(em)) {
    const rows: Array<{ code: string; taxable: boolean | number }> = await em.query('SELECT [code], [taxable] FROM dbo.salary_items')
    for (const row of rows) taxable.set(String(row.code), row.taxable === true || Number(row.taxable) === 1)
  }
  const branches = await em.getRepository(Branch).find({ select: { id: true, country: true } })
  return { period: run.period, tax: table ? { table, startPeriod } : null, martyrs: fund && pct ? { pct, effectiveFrom: fund.effectiveFrom } : null, taxable,
    egyptBranchIds: new Set(branches.filter((branch) => branchCountryOf(branch.country) === EG_TAX_COUNTRY).map((branch) => branch.id)) }
}

export interface EgTaxYearToDate { netIncome: number; days: number; tax: number; periodCounted: boolean }

/**
 * اللي اتسجّل للموظف في السنة الضريبية (سنة فترة المسير) من فترة البداية لحد الفترة دي، من بنود المسيرات المحسوبة والمعتمدة والمصروفة
 * غير المسير ده، ومن غير البنود اللي اتعكس صرفها: صافي الدخل، والأيام، والضريبة. periodCounted = الفترة دي نفسها ليها بند تاني (مسير
 * تكميلي): أيامها اتحسبت مرة فماتتحسبش تاني.
 */
export async function readEgTaxYearToDate(em: EntityManager, employeeId: number, run: { id?: number | null; period: string }, startPeriod: string): Promise<EgTaxYearToDate> {
  const from = [`${run.period.slice(0, 4)}-01`, startPeriod].sort()[1]
  const rows: Array<{ period: string; netIncome: string | null; days: string | null; tax: string | null }> = await em.query(
    `SELECT r.[period], JSON_VALUE(i.[breakdown], '$.statutory.egTax.netIncome') AS [netIncome], JSON_VALUE(i.[breakdown], '$.statutory.egTax.days') AS [days],
            JSON_VALUE(i.[breakdown], '$.statutory.egTax.tax') AS [tax]
     FROM [payroll_items] i INNER JOIN [payroll_runs] r ON r.[id] = i.[runId]
     WHERE i.[employeeId] = @0 AND r.[id] <> @1 AND r.[status] IN (N'CALCULATED', N'APPROVED', N'PAID') AND r.[period] >= @2 AND r.[period] <= @3
       AND ISJSON(i.[breakdown]) = 1 AND JSON_VALUE(i.[breakdown], '$.statutory.egTax.tax') IS NOT NULL
       AND NOT EXISTS (SELECT 1 FROM [payroll_run_reversal_lines] l WHERE l.[originalItemId] = i.[id] AND l.[status] = N'POSTED')`,
    [employeeId, run.id ?? 0, from, run.period])
  const number = (value: string | null) => { const parsed = Number(value); return Number.isFinite(parsed) ? parsed : 0 }
  const cents = (value: number) => Math.round(value * 100)
  return {
    netIncome: rows.reduce((sum, row) => sum + cents(number(row.netIncome)), 0) / 100,
    days: rows.reduce((sum, row) => sum + Math.round(number(row.days)), 0),
    tax: rows.reduce((sum, row) => sum + cents(number(row.tax)), 0) / 100,
    periodCounted: rows.some((row) => row.period === run.period),
  }
}

const round2 = (value: number) => Math.round((value + Number.EPSILON) * 100) / 100

/**
 * بيحسب الخصومات القانونية لبند اتبنى وبيطرحها من صافيه وبيسجّلها في تفصيله (breakdown.statutory). بيرجّع المجموع (0 = البند زي ما هو
 * بالحرف: موظف فرعه مش في مصر، أو مفيش حاجة سارية). لازم يتنده قبل حفظ البند وبعد ما قيود الدفتر بتاعته اتحددت.
 */
export async function applyPayrollStatutory(em: EntityManager, context: PayrollStatutoryContext, run: { id?: number | null; period: string },
  item: PayrollLineItem & { netPay: number | string; breakdown?: string | null }, employeeId: number, branchId: number | null | undefined): Promise<number> {
  if (branchId == null || !context.egyptBranchIds.has(Number(branchId))) return 0
  const breakdown = item.breakdown ? JSON.parse(item.breakdown) as Record<string, unknown> : {}
  const lines = projectPayrollItemLines(item, await loadPayrollLineFacts(em, [item]))
  let tax = 0, egTax: Record<string, unknown> | undefined
  if (context.tax) {
    const ytd = await readEgTaxYearToDate(em, employeeId, run, context.tax.startPeriod)
    const netIncome = egNetIncomeOfLines(lines, context.taxable)
    // فترة أيامها اتحسبت قبل كده (مسير تكميلي لنفس الفترة): دخلها بيتضاف للتراكمي من غير أيام جديدة
    const result = egPeriodTax({ netIncome, days: ytd.periodCounted ? 0 : egTaxDaysOf(breakdown), ytdNetIncome: ytd.netIncome, ytdDays: ytd.days, ytdTax: ytd.tax }, context.tax.table)
    tax = result.tax
    egTax = { netIncome: round2(netIncome), days: result.days, ytdNetIncome: ytd.netIncome, ytdDays: ytd.days, ytdTax: ytd.tax, annualized: result.annualized,
      exemption: context.tax.table.exemption, taxable: result.taxable, annualTax: result.annualTax, cumulativeTax: result.cumulativeTax, tax,
      tableEffectiveFrom: context.tax.table.effectiveFrom, tableVerified: context.tax.table.verified, startPeriod: context.tax.startPeriod }
  }
  let fund = 0, martyrsFund: Record<string, unknown> | undefined
  if (context.martyrs) {
    const base = lines.earnings.reduce((sum, line) => sum + Math.round(line.amount * 100), 0) / 100
    fund = base > 0 ? round2(base * context.martyrs.pct / 100) : 0
    martyrsFund = { base, pct: context.martyrs.pct, amount: fund, effectiveFrom: context.martyrs.effectiveFrom }
  }
  if (!egTax && !martyrsFund) return 0
  const snapshot = payrollStatutorySnapshot({ INCOME_TAX: tax, MARTYRS_FUND: fund }, { ...(egTax ? { egTax } : {}), ...(martyrsFund ? { martyrsFund } : {}) })
  item.breakdown = JSON.stringify({ ...breakdown, statutory: snapshot })
  item.netPay = round2(Number(item.netPay) - snapshot.total)
  return snapshot.total
}
