import { Injectable } from '@nestjs/common'
import { DataSource } from 'typeorm'
import type { JwtPayload } from '../auth/auth.service'
import { branchScopeOf, inBranchScope } from '../auth/guards'
import { branchCountryOf } from '../org/branch-currency'
import { readStatutoryEntries } from '../statutory/statutory.service'
import { EG_TAX_COUNTRY, egNetIncomeOfLines, egPeriodTax, egTaxDaysOf, egTaxTableAt } from './eg-salary-tax'
import { PayrollRun } from './payroll.entities'
import { PayrollService } from './payroll.service'
import { SALARY_ITEM_SEED, salaryItemsReady } from './salary-items'

// B4.4 (أ): معاينة ضريبة كسب العمل لمسير واحد عند الطلب — قراءة بس: مفيش حاجة بتتخزن ولا بتتخصم (المالك رفض حساب موازي متخزّن).
// المسير بحكم قراءته القايم (PayrollService.runLines: الصلاحية ونطاق المسير)، والسطور هي سطور القسيمة نفسها، والخاضع من جدول بنود الراتب،
// والشرائح من حزمة الدولة بتاريخ آخر يوم في فترة المسير. الأساس «لو الضريبة بدأت من الفترة دي» (الرصيد التراكمي بييجي مع خصمها في المسير).

export const EG_TAX_MISSING = 'شرائح ضريبة كسب العمل مش متسجّلة في حزمة الدولة لتاريخ الفترة دي — المعاينة مش متاحة'

const round2 = (value: number) => Math.round((value + Number.EPSILON) * 100) / 100

@Injectable()
export class EgSalaryTaxService {
  constructor(private readonly ds: DataSource, private readonly payroll: PayrollService) {}

  /** «خاضع للضريبة» لكل بند: من الجدول، وقبل ترحيله من قيمه الأولية */
  private async taxableFlags(): Promise<Map<string, boolean>> {
    const em = this.ds.manager
    const flags = new Map(SALARY_ITEM_SEED.map((seed) => [seed.code, seed.taxable]))
    if (await salaryItemsReady(em)) {
      const rows: Array<{ code: string; taxable: boolean | number }> = await em.query('SELECT [code], [taxable] FROM dbo.salary_items')
      for (const row of rows) flags.set(String(row.code), row.taxable === true || Number(row.taxable) === 1)
    }
    return flags
  }

  async previewRun(user: JwtPayload, runId: number) {
    // الصلاحية ونطاق المسير وسطور كل موظف (بحجبها) من القارئ القايم — اللي مايقدرش يقرا المسير مابيوصلش هنا
    const lines = await this.payroll.runLines(user, runId)
    const em = this.ds.manager
    const run = await em.getRepository(PayrollRun).findOneOrFail({ where: { id: runId } })
    const table = egTaxTableAt(await readStatutoryEntries(em), String(run.endDate).slice(0, 10))
    const base = { runId, period: run.period, basis: 'FROM_THIS_PERIOD' as const }
    if (!table) return { ...base, available: false, message: EG_TAX_MISSING, table: null, rows: [], totals: { netIncome: 0, tax: 0 } }
    const facts: Array<{ id: number; employeeId: number; breakdown: string | null; fullName: string; employeeCode: string | null; branchId: number | null; country: string | null }> = lines.rows.length ? await em.query(
      `SELECT i.[id], i.[employeeId], i.[breakdown], e.[fullName], e.[employeeCode], e.[branchId], b.[country]
       FROM [payroll_items] i INNER JOIN [employees] e ON e.[id] = i.[employeeId] LEFT JOIN [branches] b ON b.[id] = e.[branchId]
       WHERE i.[runId] = @0`, [runId]) : []
    const byItem = new Map(facts.map((row) => [Number(row.id), row]))
    const flags = await this.taxableFlags()
    const scope = branchScopeOf(user)
    const rows = lines.rows.flatMap((line) => {
      const fact = byItem.get(line.itemId)
      // موظفي الفروع اللي دولتها مصر بس (دولة فرع الموظف الحالي) — وموظف فرعه الحالي برّه نطاق الحساب مابيظهرش باسمه ولا برقمه
      if (!fact || branchCountryOf(fact.country) !== EG_TAX_COUNTRY || !inBranchScope(scope, fact.branchId)) return []
      let breakdown: { prorataFactor?: unknown } | null = null
      try { breakdown = fact.breakdown ? JSON.parse(fact.breakdown) : null } catch { breakdown = null }
      const netIncome = egNetIncomeOfLines(line, flags)
      const result = egPeriodTax({ netIncome, days: egTaxDaysOf(breakdown) }, table)
      return [{ itemId: line.itemId, employeeId: line.employeeId, employeeName: fact.fullName, employeeCode: fact.employeeCode, netIncome: round2(netIncome), days: result.days,
        annualized: result.annualized, taxable: result.taxable, annualTax: result.annualTax, tax: result.tax }]
    })
    return { ...base, available: true, table: { effectiveFrom: table.effectiveFrom, verified: table.verified, exemption: table.exemption, yearDays: table.yearDays }, rows,
      totals: { netIncome: round2(rows.reduce((sum, row) => sum + row.netIncome, 0)), tax: round2(rows.reduce((sum, row) => sum + row.tax, 0)) } }
  }
}
