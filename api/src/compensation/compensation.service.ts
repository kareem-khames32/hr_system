import { Injectable } from '@nestjs/common'
import { InjectDataSource } from '@nestjs/typeorm'
import { DataSource, type EntityManager } from 'typeorm'
import type { JwtPayload } from '../auth/auth.service'
import { branchScopeOf, inBranchScope } from '../auth/guards'
import { MONTHLY_SALARY_COMPONENTS } from '../employees/compensation'
import { BAND_BASIS_KEY, BAND_BASIS_LABELS, BAND_POSITION_LABELS, bandBasisOf, bandPosition, bandSalaryOf, compaRatio, salaryBandOf, type BandBasis } from './salary-bands'

// B5.1 (أ): تقرير «سلّم الرواتب» — قراءة بس: الدرجات بنطاقها ومنتصفها، والموظفين النشطين في نطاق فروع الحساب بنسبة المقارنة وموقعهم.
// الأرقام بصلاحية عرض الرواتب (في الضابط). مفيش كتابة ولا تغيير راتب من هنا.

export async function readBandBasis(em: EntityManager): Promise<BandBasis> {
  const [row]: Array<{ value: string }> = await em.query('SELECT [value] FROM [requests_config] WHERE [key] = @0', [BAND_BASIS_KEY])
  return bandBasisOf(row?.value)
}

@Injectable()
export class CompensationService {
  constructor(@InjectDataSource() private readonly ds: DataSource) {}

  async bands(user: JwtPayload) {
    const em = this.ds.manager, scope = branchScopeOf(user)
    const basis = await readBandBasis(em)
    const grades: Array<{ id: number; name: string; minSalary: string | null; maxSalary: string | null; isActive: boolean }> = await em.query(
      'SELECT [id], [name], [minSalary], [maxSalary], [isActive] FROM [grades] ORDER BY [id]')
    const columns = MONTHLY_SALARY_COMPONENTS.map(component => `e.[${component.key}]`).join(', ')
    const rows: Array<Record<string, unknown>> = await em.query(
      `SELECT e.[id], e.[fullName], e.[employeeCode], e.[branchId], e.[gradeId], ${columns} FROM [employees] e
       WHERE e.[isActive] = 1 AND e.[status] IN (N'active', N'probation', N'notice_period') ORDER BY e.[id]`)
    const bandOf = new Map(grades.map(grade => [Number(grade.id), salaryBandOf(grade)]))
    const nameOf = new Map(grades.map(grade => [Number(grade.id), grade.name]))
    const employees = rows.filter(row => inBranchScope(scope, row.branchId == null ? null : Number(row.branchId))).map(row => {
      const gradeId = row.gradeId == null ? null : Number(row.gradeId), band = gradeId == null ? null : bandOf.get(gradeId) ?? null
      const gross = MONTHLY_SALARY_COMPONENTS.reduce((total, component) => total + Number(row[component.key] ?? 0), 0)
      const salary = bandSalaryOf({ basic: Number(row.basicSalary ?? 0), gross }, basis), position = bandPosition(salary, band)
      return { employeeId: Number(row.id), fullName: String(row.fullName), employeeCode: (row.employeeCode as string | null) ?? null, gradeId, gradeName: gradeId == null ? null : nameOf.get(gradeId) ?? null,
        salary, compaRatio: compaRatio(salary, band), position, positionLabel: position ? BAND_POSITION_LABELS[position] : null }
    })
    return {
      basis, basisLabel: BAND_BASIS_LABELS[basis],
      grades: grades.map(grade => {
        const band = bandOf.get(Number(grade.id)) ?? null, members = employees.filter(row => row.gradeId === Number(grade.id))
        return { id: Number(grade.id), name: grade.name, isActive: grade.isActive === true || (grade.isActive as unknown) === 1, band, headcount: members.length,
          below: members.filter(row => row.position === 'BELOW').length, above: members.filter(row => row.position === 'ABOVE').length }
      }),
      employees,
      withoutGrade: employees.filter(row => row.gradeId === null).length,
    }
  }
}
