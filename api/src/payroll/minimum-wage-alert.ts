import { Injectable } from '@nestjs/common'
import { InjectDataSource } from '@nestjs/typeorm'
import { DataSource } from 'typeorm'
import { localDateOf } from '../attendance/attendance.service'
import type { JwtPayload } from '../auth/auth.service'
import { branchScopeOf, inBranchScope } from '../auth/guards'
import { MONTHLY_SALARY_COMPONENTS } from '../employees/compensation'
import { branchCountryOf } from '../org/branch-currency'
import { statutoryAt, statutoryNumber, type StatutoryEntry } from '../statutory/statutory'
import { readStatutoryEntries } from '../statutory/statutory.service'

// B4.5 (هـ): تنبيه الحد الأدنى للأجور (C-EG-06) — تقرير قراءة بس: الموظفين النشطين اللي إجمالي راتبهم الشهري أقل من الحد الأدنى لدولة فرعهم.
// مابيغيّرش راتب ولا بيمنع حفظه ولا بيدخل في أي حساب. الرقم من حزمة الدولة بتاريخ النهارده، وبيتوسم «محتاج تحقق» لحد ما المالك يراجعه.
// الإجمالي = المكونات الشهرية الست (من غير بدل ضغط العمل ولا الإضافي). السعودية مالهاش صف حد أدنى في الحزمة = مفيش تنبيه لفروعها.

export const EG_MINIMUM_WAGE_KEY = 'eg.minimum_wage'
export interface MinimumWage { country: 'EG'; amount: number; key: string; effectiveFrom: string; verified: boolean }

const round2 = (value: number) => Math.round((value + Number.EPSILON) * 100) / 100

/** الحد الأدنى للأجر الشهري لدولة يوم date، أو null لو الدولة مالهاش صف في الحزمة */
export function minimumWageAt(entries: readonly StatutoryEntry[], country: string | null | undefined, date: string): MinimumWage | null {
  if (country !== 'EG') return null
  const row = statutoryAt(entries, 'EG', EG_MINIMUM_WAGE_KEY, date)
  const amount = statutoryNumber(row, 'monthly_amount')
  return row && amount !== null && amount > 0 ? { country: 'EG', amount, key: EG_MINIMUM_WAGE_KEY, effectiveFrom: row.effectiveFrom, verified: row.verified } : null
}

/** الفرق تحت الحد الأدنى (موجب)، أو null لو الإجمالي عند الحد أو فوقه */
export function minimumWageShortfall(gross: number, minimum: MinimumWage | null): number | null {
  return minimum && Number.isFinite(gross) && gross < minimum.amount ? round2(minimum.amount - gross) : null
}

@Injectable()
export class MinimumWageAlertService {
  constructor(@InjectDataSource() private readonly ds: DataSource) {}

  /** الموظفين النشطين في نطاق الحساب اللي إجماليهم تحت الحد الأدنى لدولة فرعهم الحالي */
  async report(user: JwtPayload) {
    const em = this.ds.manager, today = localDateOf(new Date()), scope = branchScopeOf(user)
    const entries = await readStatutoryEntries(em)
    const branches: Array<{ id: number; name: string; country: string | null }> = await em.query('SELECT [id], [name], [country] FROM [branches]')
    const minimums = new Map<number, { name: string; minimum: MinimumWage }>()
    for (const branch of branches) {
      if (!inBranchScope(scope, Number(branch.id))) continue
      const minimum = minimumWageAt(entries, branchCountryOf(branch.country), today)
      if (minimum) minimums.set(Number(branch.id), { name: branch.name, minimum })
    }
    const base = { asOf: today, minimums: [...new Map([...minimums.values()].map(({ minimum }) => [minimum.country, minimum])).values()] }
    if (!minimums.size) return { ...base, employees: [] }
    const ids = [...minimums.keys()]
    const columns = MONTHLY_SALARY_COMPONENTS.map(component => `e.[${component.key}]`).join(', ')
    const rows: Array<Record<string, unknown>> = await em.query(
      `SELECT e.[id], e.[fullName], e.[employeeCode], e.[branchId], ${columns} FROM [employees] e
       WHERE e.[isActive] = 1 AND e.[status] IN (N'active', N'probation', N'notice_period') AND e.[branchId] IN (${ids.map((_, index) => `@${index}`).join(', ')}) ORDER BY e.[id]`, ids)
    const employees = rows.flatMap(row => {
      const branch = minimums.get(Number(row.branchId))!
      const gross = round2(MONTHLY_SALARY_COMPONENTS.reduce((total, component) => total + Number(row[component.key] ?? 0), 0))
      const shortfall = minimumWageShortfall(gross, branch.minimum)
      return shortfall === null ? [] : [{ employeeId: Number(row.id), fullName: String(row.fullName), employeeCode: (row.employeeCode as string | null) ?? null, branchName: branch.name,
        country: branch.minimum.country, gross, minimum: branch.minimum.amount, shortfall }]
    })
    return { ...base, employees }
  }
}
