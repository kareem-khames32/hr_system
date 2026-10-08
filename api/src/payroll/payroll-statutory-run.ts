import { In, type EntityManager } from 'typeorm'
import { Branch } from '../org/entities/branch.entity'
import { dependentsReady } from '../dependents/dependent-rules'
import { branchCountryOf } from '../org/branch-currency'
import { RequestsConfig } from '../requests/entities/requests-config.entity'
import { statutoryNumber, verifiedStatutoryAt } from '../statutory/statutory'
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
// B4.4 (د): التأمين الصحي الشامل — مفعّل؟ وفي أنهي فروع (قايمة أرقام فروع JSON: المحافظات اللي اتطبق فيها)
export const EG_HEALTH_ENABLED_KEY = 'eg.health_insurance.enabled'
export const EG_HEALTH_BRANCHES_KEY = 'eg.health_insurance.branch_ids'
export const EG_HEALTH_KEY = 'eg.health_insurance'
export const PAYROLL_STATUTORY_KEYS = [EG_TAX_ENABLED_KEY, EG_TAX_START_PERIOD_KEY, EG_MARTYRS_ENABLED_KEY, EG_HEALTH_ENABLED_KEY, EG_HEALTH_BRANCHES_KEY] as const
/** قايمة أرقام الفروع المحفوظة في الإعداد (نص تالف أو مش قايمة = فاضية) */
export function parseStatutoryBranchIds(value: string | null | undefined): number[] {
  try {
    const parsed: unknown = JSON.parse(value || '[]')
    return Array.isArray(parsed) ? [...new Set(parsed.filter((id): id is number => Number.isSafeInteger(id) && id > 0))].sort((a, b) => a - b) : []
  } catch { return [] }
}
const PERIOD = /^\d{4}-(0[1-9]|1[0-2])$/

export interface PayrollStatutoryContext {
  period: string
  /** الضريبة مفعّلة والفترة من فترة البداية وطالع وجدولها ساري */
  tax: { table: EgTaxTable; startPeriod: string } | null
  /** صندوق الشهداء مفعّل ونسبته سارية — وللمسير الأساسي بس */
  martyrs: { pct: number; effectiveFrom: string } | null
  /** B4.4 (د): التأمين الصحي الشامل مفعّل ونسبه سارية، لفروعه المختارة (من فروع مصر) — وللمسير الأساسي بس */
  health: { employeePct: number; employerPct: number; spousePct: number; dependentPct: number; effectiveFrom: string; branchIds: Set<number> } | null
  taxable: Map<string, boolean>
  egyptBranchIds: Set<number>
}

/**
 * سياق الخصومات القانونية لمسير: null لو مفيش حاجة هتتحسب (الإعدادين مقفولين، أو الفترة قبل البداية، أو الصفوف مش سارية) — ده الوضع
 * الافتراضي، ومعاه حساب المسير مابيعملش ولا خطوة زيادة.
 */
export async function readPayrollStatutoryContext(em: EntityManager, run: { period: string; endDate: string; runType?: string | null }): Promise<PayrollStatutoryContext | null> {
  const values = new Map((await em.getRepository(RequestsConfig).find({ where: { key: In([...PAYROLL_STATUTORY_KEYS]) } })).map((row) => [row.key, row.value]))
  const taxOn = values.get(EG_TAX_ENABLED_KEY) === 'true', martyrsOn = values.get(EG_MARTYRS_ENABLED_KEY) === 'true', healthOn = values.get(EG_HEALTH_ENABLED_KEY) === 'true'
  if (!taxOn && !martyrsOn && !healthOn) return null
  const entries = await readStatutoryEntries(em), endDate = String(run.endDate).slice(0, 10)
  const startPeriod = values.get(EG_TAX_START_PERIOD_KEY) ?? ''
  // P4A-B01: الصف الساري في آخر يوم في المسير لازم «اتأكد» — صف قديم «محتاج تحقق» مابيتحسبش بيه حتى لو الحساب مفعّل بصف أحدث
  const dated = taxOn && PERIOD.test(startPeriod) && run.period >= startPeriod ? egTaxTableAt(entries, endDate) : null
  const table = dated && dated.verified ? dated : null
  const fund = martyrsOn && (run.runType ?? 'REGULAR') === 'REGULAR' ? verifiedStatutoryAt(entries, EG_TAX_COUNTRY, EG_MARTYRS_FUND_KEY, endDate) : null
  const pct = statutoryNumber(fund, 'employee_pct')
  const regular = (run.runType ?? 'REGULAR') === 'REGULAR'
  const healthRow = healthOn && regular ? verifiedStatutoryAt(entries, EG_TAX_COUNTRY, EG_HEALTH_KEY, endDate) : null
  const healthPct = { employee: statutoryNumber(healthRow, 'employee_pct'), employer: statutoryNumber(healthRow, 'employer_pct'), spouse: statutoryNumber(healthRow, 'spouse_pct'), dependent: statutoryNumber(healthRow, 'dependent_pct') }
  const healthBranches = healthRow && healthPct.employee !== null ? parseStatutoryBranchIds(values.get(EG_HEALTH_BRANCHES_KEY)) : []
  if (!table && !(fund && pct) && !healthBranches.length) return null
  const taxable = new Map(SALARY_ITEM_SEED.map((seed) => [seed.code, seed.taxable]))
  if (await salaryItemsReady(em)) {
    const rows: Array<{ code: string; taxable: boolean | number }> = await em.query('SELECT [code], [taxable] FROM dbo.salary_items')
    for (const row of rows) taxable.set(String(row.code), row.taxable === true || Number(row.taxable) === 1)
  }
  const branches = await em.getRepository(Branch).find({ select: { id: true, country: true } })
  const egyptBranchIds = new Set(branches.filter((branch) => branchCountryOf(branch.country) === EG_TAX_COUNTRY).map((branch) => branch.id))
  // فرع اتغيّرت دولته بعد ما اتختار: برّه (الحكم بدولة الفرع الحالية)
  const healthIds = new Set(healthBranches.filter((id) => egyptBranchIds.has(id)))
  return { period: run.period, tax: table ? { table, startPeriod } : null, martyrs: fund && pct ? { pct, effectiveFrom: fund.effectiveFrom } : null,
    health: healthRow && healthIds.size ? { employeePct: healthPct.employee ?? 0, employerPct: healthPct.employer ?? 0, spousePct: healthPct.spouse ?? 0, dependentPct: healthPct.dependent ?? 0,
      effectiveFrom: healthRow.effectiveFrom, branchIds: healthIds } : null,
    taxable, egyptBranchIds }
}

export interface EgTaxYearToDate {
  netIncome: number; days: number; tax: number; periodCounted: boolean
  /** P4A-B02: أرقام بنود المسيرات اللي التراكمي اتجمع منها — بتتثبت في لقطة البند والاعتماد بيراجعها */
  sourceItemIds: number[]
}

/**
 * اللي اتسجّل للموظف في السنة الضريبية (سنة فترة المسير) من فترة البداية لحد الفترة دي، من بنود المسيرات المحسوبة والمعتمدة والمصروفة
 * غير المسير ده، ومن غير البنود اللي اتعكس صرفها: صافي الدخل، والأيام، والضريبة. periodCounted = الفترة دي نفسها ليها بند تاني (مسير
 * تكميلي): أيامها اتحسبت مرة فماتتحسبش تاني.
 * finalOnly (P4A-B02): المعتمد والمصروف بس — ده اللي الاعتماد بيقارن بيه المصادر المثبتة (المحسوب لسه ممكن يتلغى أو يتعاد حسابه).
 */
export async function readEgTaxYearToDate(em: EntityManager, employeeId: number, run: { id?: number | null; period: string }, startPeriod: string, finalOnly = false): Promise<EgTaxYearToDate> {
  const from = [`${run.period.slice(0, 4)}-01`, startPeriod].sort()[1]
  const rows: Array<{ itemId: number; period: string; netIncome: string | null; days: string | null; tax: string | null }> = await em.query(
    `SELECT i.[id] AS [itemId], r.[period], JSON_VALUE(i.[breakdown], '$.statutory.egTax.netIncome') AS [netIncome], JSON_VALUE(i.[breakdown], '$.statutory.egTax.days') AS [days],
            JSON_VALUE(i.[breakdown], '$.statutory.egTax.tax') AS [tax]
     FROM [payroll_items] i INNER JOIN [payroll_runs] r ON r.[id] = i.[runId]
     WHERE i.[employeeId] = @0 AND r.[id] <> @1 AND r.[status] IN (${finalOnly ? '' : `N'CALCULATED', `}N'APPROVED', N'PAID') AND r.[period] >= @2 AND r.[period] <= @3
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
    sourceItemIds: rows.map((row) => Number(row.itemId)).sort((a, b) => a - b),
  }
}

export const EG_TAX_SOURCES_CHANGED = 'الضريبة التراكمية في المسير ده محسوبة على مسيرات سابقة اتغيّرت أو لسه مااتعتمدتش — اعتمد المسيرات السابقة ثم أعد حساب المسير ده'
export const EG_TAX_HAS_DEPENDENTS = 'فيه مسير معتمد ضريبته التراكمية محسوبة على المسير ده — أعد فتح المسير اللاحق الأول'
const egTaxOf = (breakdown: string | null | undefined): Record<string, unknown> | null => {
  try {
    const parsed = breakdown ? JSON.parse(breakdown) as { statutory?: { egTax?: unknown } } : null
    const tax = parsed?.statutory?.egTax
    return tax && typeof tax === 'object' ? tax as Record<string, unknown> : null
  } catch { return null }
}
const idsOf = (value: unknown): number[] | null => (Array.isArray(value) && value.every((id) => Number.isSafeInteger(id)) ? [...value as number[]].sort((a, b) => a - b) : null)

/**
 * P4A-B02 — قبل الاعتماد (بعد قفل موظفي المسير): كل بند عليه ضريبة، مصادر تراكميّه المثبتة لازم تبقى هي بنود المسيرات **المعتمدة والمصروفة**
 * (غير المعكوسة) للموظف في نفس المدة دلوقتي بالظبط. مصدر لسه «محسوب»، أو اتلغى، أو اتعاد حسابه، أو اتعكس، أو مسير اتعتمد بعد الحساب ومش
 * محسوب في التراكمي = الاعتماد بيرفض لحد ما المسير يتعاد حسابه. بيرجّع رسالة الرفض أو null. مسير مافيهوش ضريبة = ولا قراءة.
 */
export async function egTaxSourcesIssue(em: EntityManager, run: { id: number; period: string }, items: Array<{ employeeId: number; breakdown?: string | null }>): Promise<string | null> {
  for (const item of items) {
    const tax = egTaxOf(item.breakdown)
    if (!tax) continue
    const stored = idsOf(tax.sourceItemIds), startPeriod = typeof tax.startPeriod === 'string' ? tax.startPeriod : ''
    if (!stored || !PERIOD.test(startPeriod)) return EG_TAX_SOURCES_CHANGED
    const current = (await readEgTaxYearToDate(em, item.employeeId, run, startPeriod, true)).sourceItemIds
    if (stored.length !== current.length || stored.some((id, index) => id !== current[index])) return EG_TAX_SOURCES_CHANGED
  }
  return null
}

/**
 * P4A-B02 — قبل إعادة فتح مسير معتمد (بعد قفل موظفيه): لو بند من بنوده مصدر مثبت لتراكمي بند في مسير معتمد أو مصروف تاني (غير معكوس)،
 * إعادة الفتح بترفض — وإلا المسير ده يتلغى أو يتعاد حسابه والمعتمد اللاحق يفضل شايل ضريبة محسوبة عليه. مسير مافيهوش ضريبة = ولا قراءة.
 */
export async function egTaxDependentsIssue(em: EntityManager, run: { id: number; period: string }, items: Array<{ id: number; breakdown?: string | null }>): Promise<string | null> {
  const mine = new Set(items.filter((item) => egTaxOf(item.breakdown)).map((item) => Number(item.id)))
  if (!mine.size) return null
  const rows: Array<{ breakdown: string | null }> = await em.query(
    `SELECT d.[breakdown] FROM [payroll_items] d INNER JOIN [payroll_runs] dr ON dr.[id] = d.[runId]
     WHERE dr.[id] <> @0 AND dr.[status] IN (N'APPROVED', N'PAID') AND dr.[period] >= @1 AND dr.[period] <= @2
       AND d.[employeeId] IN (SELECT [employeeId] FROM [payroll_items] WHERE [runId] = @0)
       AND ISJSON(d.[breakdown]) = 1 AND JSON_VALUE(d.[breakdown], '$.statutory.egTax.tax') IS NOT NULL
       AND NOT EXISTS (SELECT 1 FROM [payroll_run_reversal_lines] l WHERE l.[originalItemId] = d.[id] AND l.[status] = N'POSTED')`,
    [run.id, run.period, `${run.period.slice(0, 4)}-12`])
  return rows.some((row) => (idsOf(egTaxOf(row.breakdown)?.sourceItemIds) ?? []).some((id) => mine.has(id))) ? EG_TAX_HAS_DEPENDENTS : null
}

const round2 = (value: number) => Math.round((value + Number.EPSILON) * 100) / 100

/** معالين الموظف الحاليين المؤمَّن عليهم: الزوج/الزوجة، والباقي. قبل ترحيل سجل المعالين = مفيش */
export async function readInsuredDependents(em: EntityManager, employeeId: number): Promise<{ spouses: number; others: number }> {
  if (!(await dependentsReady(em))) return { spouses: 0, others: 0 }
  const rows: Array<{ relation: string; n: number }> = await em.query(
    `SELECT [relation], COUNT(*) AS [n] FROM dbo.dependents WHERE [employeeId] = @0 AND [status] = N'ACTIVE' AND [isInsured] = 1 GROUP BY [relation]`, [employeeId])
  const spouses = rows.filter((row) => row.relation === 'SPOUSE').reduce((sum, row) => sum + Number(row.n), 0)
  return { spouses, others: rows.reduce((sum, row) => sum + Number(row.n), 0) - spouses }
}

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
      tableEffectiveFrom: context.tax.table.effectiveFrom, tableVerified: context.tax.table.verified, startPeriod: context.tax.startPeriod,
      // P4A-B02: مصادر التراكمي مثبتة — الاعتماد بيراجعها
      sourceItemIds: ytd.sourceItemIds }
  }
  let fund = 0, martyrsFund: Record<string, unknown> | undefined
  if (context.martyrs) {
    const base = lines.earnings.reduce((sum, line) => sum + Math.round(line.amount * 100), 0) / 100
    fund = base > 0 ? round2(base * context.martyrs.pct / 100) : 0
    martyrsFund = { base, pct: context.martyrs.pct, amount: fund, effectiveFrom: context.martyrs.effectiveFrom }
  }
  // B4.4 (د): التأمين الصحي الشامل — لموظف فرعه من الفروع المطبّق فيها وعليه تأمينات في البند ده: من أجر التأمين، حصته + نسبة الزوج/الزوجة
  // المؤمَّن عليه + نسبة لكل معال مؤمَّن عليه تاني (من سجل المعالين). حصة صاحب العمل في اللقطة للعلم بس
  let health = 0, healthInsurance: Record<string, unknown> | undefined
  const insurance = breakdown.socialInsurance as { applies?: unknown; insuredSalary?: unknown } | undefined
  if (context.health && context.health.branchIds.has(Number(branchId)) && insurance?.applies === true && typeof insurance.insuredSalary === 'number' && insurance.insuredSalary > 0) {
    const covered = await readInsuredDependents(em, employeeId)
    const base = insurance.insuredSalary, rate = context.health
    const pct = rate.employeePct + covered.spouses * rate.spousePct + covered.others * rate.dependentPct
    health = round2(base * pct / 100)
    healthInsurance = { base, employeePct: rate.employeePct, spousePct: rate.spousePct, dependentPct: rate.dependentPct, spouses: covered.spouses, dependents: covered.others, amount: health,
      employerPct: rate.employerPct, employerShare: round2(base * rate.employerPct / 100), effectiveFrom: rate.effectiveFrom }
  }
  if (!egTax && !martyrsFund && !healthInsurance) return 0
  const snapshot = payrollStatutorySnapshot({ INCOME_TAX: tax, MARTYRS_FUND: fund, HEALTH_INSURANCE: health },
    { ...(egTax ? { egTax } : {}), ...(martyrsFund ? { martyrsFund } : {}), ...(healthInsurance ? { healthInsurance } : {}) })
  item.breakdown = JSON.stringify({ ...breakdown, statutory: snapshot })
  item.netPay = round2(Number(item.netPay) - snapshot.total)
  return snapshot.total
}
