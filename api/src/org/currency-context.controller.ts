import { Controller, Get, UseGuards } from '@nestjs/common'
import { DataSource } from 'typeorm'
import type { JwtPayload } from '../auth/auth.service'
import { branchScopeOf, CurrentUser, JwtAuthGuard, RolesGuard } from '../auth/guards'
import { readBranchCurrencies, readBranchCurrency, readSystemCurrency } from './branch-currency-db'
import { RequireModule } from '../modules-registry/module.guard'

// عملة الشاشات لأي مستخدم داخل (قرار المالك 30 سبتمبر: العملة تبع الفرع) — من غير settings.manage، فالموظف مابقاش يشوف «ر.س» وشركته
// بالجنيه. الرد: عملة النظام العامة، وعملة فرع موظف الحساب نفسه، ورقم كل فرع في نطاق الحساب وعملته بس (مفيش اسم ولا بيان تاني،
// ومفيش فرع برّه النطاق).
@RequireModule('platform')
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
      const rows: Array<{ branchId: number | null }> = await em.query('SELECT e.[branchId] FROM dbo.employees e WHERE e.[id]=@0', [employeeId])
      // B4.1: نفس قارئ عملة الفرع (كيانه لو مربوط، وإلا دولته)
      if (rows[0]?.branchId != null) ownCurrency = await readBranchCurrency(em, rows[0].branchId, defaultCurrency)
    }
    return { defaultCurrency, ownCurrency, branches }
  }
}
