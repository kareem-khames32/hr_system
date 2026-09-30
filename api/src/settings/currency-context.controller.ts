import { Controller, Get, UseGuards } from '@nestjs/common'
import { DataSource } from 'typeorm'
import type { JwtPayload } from '../auth/auth.service'
import { branchScopeOf, CurrentUser, JwtAuthGuard, RolesGuard } from '../auth/guards'
import { branchCurrency } from '../org/branch-currency'
import { readBranchCurrencies, readSystemCurrency } from '../org/branch-currency-db'

// عملة الشاشات لأي مستخدم داخل (قرار المالك 30 سبتمبر: العملة تبع الفرع) — من غير settings.manage، فالموظف مابقاش يشوف «ر.س» وشركته
// بالجنيه. الرد: عملة النظام العامة، وعملة فرع موظف الحساب نفسه، ورقم كل فرع في نطاق الحساب وعملته بس (مفيش اسم ولا بيان تاني،
// ومفيش فرع برّه النطاق).
@UseGuards(JwtAuthGuard, RolesGuard)
@Controller('settings')
export class CurrencyContextController {
  constructor(private readonly ds: DataSource) {}

  @Get('currency-context')
  async currencyContext(@CurrentUser() user: JwtPayload) {
    const em = this.ds.manager
    const defaultCurrency = await readSystemCurrency(em)
    const branches = await readBranchCurrencies(em, branchScopeOf(user), defaultCurrency)
    let ownCurrency: string | null = null
    const employeeId = Number(user.employeeId)
    if (Number.isSafeInteger(employeeId) && employeeId > 0) {
      const rows: Array<{ branchId: number | null; country: string | null }> = await em.query(
        'SELECT e.[branchId], b.[country] FROM dbo.employees e LEFT JOIN dbo.branches b ON b.[id]=e.[branchId] WHERE e.[id]=@0', [employeeId])
      if (rows[0]?.branchId != null) ownCurrency = branchCurrency(rows[0].country, defaultCurrency)
    }
    return { defaultCurrency, ownCurrency, branches }
  }
}
