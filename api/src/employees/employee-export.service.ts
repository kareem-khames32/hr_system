import { Injectable } from '@nestjs/common'
import { DataSource } from 'typeorm'
import type { JwtPayload } from '../auth/auth.service'
import { andBranchScopeSql, branchScopeOf } from '../auth/guards'
import type { BranchScope } from '../auth/guards'
import { localDateOf } from '../attendance/attendance.service'
import { BULK_CONTENT_TYPES } from './employee-bulk-update.sheet'
import { canSeeEmployeesFinance } from './employee-projection'
import {
  employeeExportCells, employeeExportColumns, writeEmployeesWorkbook,
  type EmployeeExportLookups, type EmployeeExportRow,
} from './employee-export'

// أقل من حد SQL Server (2,100 قيمة للجملة) بهامش
const CHUNK = 1000
// التواريخ نص من SQL نفسه (CONVERT ... 23): التاريخ الراجع كـDate بيتزحزح يوم بفرق المنطقة الزمنية
const date = (column: string) => `CONVERT(varchar(10), e.[${column}], 23) AS [${column}]`
const EXPORT_SELECT = `SELECT e.[id], e.[employeeCode], e.[fingerprintCode], e.[fullName], e.[fullNameEn], e.[nationalId], e.[nationality], e.[gender],
  ${date('birthDate')}, e.[birthPlace], e.[maritalStatus], e.[passportNo], ${date('passportExpiry')},
  e.[phone], e.[phoneAlt], e.[email], e.[personalEmail], e.[address], e.[country], e.[postalCode],
  e.[emergencyContactName], e.[emergencyRelation], e.[emergencyContactPhone], e.[emergencyPhoneAlt],
  e.[branchId], e.[departmentId], e.[teamId], e.[jobTitle], e.[gradeId], e.[managerEmployeeId], e.[costCenterId], e.[workScheduleId],
  e.[workLocation], e.[workType], ${date('joinDate')}, ${date('actualStartDate')}, ${date('probationEndDate')}, ${date('salaryEntitlementStart')},
  e.[recruitmentSource], e.[status], e.[annualLeaveEntitled],
  e.[contractType], e.[contractNumber], ${date('contractStart')}, ${date('contractEnd')}, e.[contractDurationMonths], e.[noticePeriodDays],
  e.[currency], e.[salaryCycle], e.[basicSalary], e.[housingAllowance], e.[transportAllowance], e.[phoneAllowance],
  e.[workNatureAllowance], e.[otherAllowance], e.[workPressureAllowance], e.[payMethod], e.[bankTransferAmount], e.[bankName], e.[bankBranch], e.[iban],
  e.[gosiNumber], e.[isGosiRegistered], e.[gosiBaseSalary], ${date('archivedAt')}, e.[archiveReason]
  FROM dbo.employees e`

@Injectable()
export class EmployeeExportService {
  constructor(private readonly ds: DataSource) {}

  /** ملف Excel بموظفين الشاشة بترتيبهم زي ما هم ظاهرين، في نطاق فرع اللي بيصدّر بس. */
  async export(employeeIds: number[], user: JwtPayload) {
    const ids = [...new Set(employeeIds)]
    const rows = await this.rowsById(ids, branchScopeOf(user))
    const byId = new Map(rows.map(row => [row.id, row]))
    const ordered = ids.map(id => byId.get(id)).filter((row): row is EmployeeExportRow => !!row)
    const columns = employeeExportColumns(canSeeEmployeesFinance(user))
    const lookups = await this.lookups(ordered)
    const buffer = await writeEmployeesWorkbook(columns, ordered.map(row => employeeExportCells(row, lookups, columns)))
    return { buffer, count: ordered.length, fileName: `الموظفين-${localDateOf(new Date())}.xlsx`, contentType: BULK_CONTENT_TYPES.xlsx }
  }

  private async chunked<T>(values: number[], query: (placeholders: string, params: number[]) => Promise<T[]>) {
    const rows: T[] = []
    for (let start = 0; start < values.length; start += CHUNK) {
      const part = values.slice(start, start + CHUNK)
      rows.push(...await query(part.map((_, index) => `@${index}`).join(', '), part))
    }
    return rows
  }

  private rowsById(ids: number[], branchScope: BranchScope): Promise<EmployeeExportRow[]> {
    return this.chunked<EmployeeExportRow>(ids, (list, params) => {
      // فروع النطاق معاملات بعد أرقام الموظفين (@n…) — مش ملزوقة في نص الاستعلام
      const all: unknown[] = [...params]
      const inScope = andBranchScopeSql('e.[branchId]', branchScope, all)
      return this.ds.query(`${EXPORT_SELECT} WHERE e.[id] IN (${list}) ${inScope}`, all)
    })
  }

  private async lookups(rows: EmployeeExportRow[]): Promise<EmployeeExportLookups> {
    const managerIds = [...new Set(rows.map(row => row.managerEmployeeId).filter((id): id is number => id != null))]
    const [branches, departments, teams, grades, costCenters, workSchedules, managers] = await Promise.all([
      this.ds.query(`SELECT [id], [name] FROM dbo.branches`),
      this.ds.query(`SELECT [id], [name] FROM dbo.departments`),
      this.ds.query(`SELECT [id], [name] FROM dbo.teams`),
      this.ds.query(`SELECT [id], [name] FROM dbo.grades`),
      this.ds.query(`SELECT [id], [code], [name] FROM dbo.cost_centers`),
      this.ds.query(`SELECT [id], [name] FROM dbo.work_schedules`),
      this.chunked<{ id: number; employeeCode: string; fullName: string }>(managerIds, (list, params) =>
        this.ds.query(`SELECT [id], [employeeCode], [fullName] FROM dbo.employees WHERE [id] IN (${list})`, params)),
    ])
    const names = (list: Array<{ id: number; name: string }>) => new Map(list.map(item => [Number(item.id), String(item.name)]))
    return {
      branches: names(branches), departments: names(departments), teams: names(teams), grades: names(grades),
      costCenters: new Map((costCenters as Array<{ id: number; code: string | null; name: string }>)
        .map(item => [Number(item.id), item.code ? `${item.code} — ${item.name}` : item.name])),
      workSchedules: names(workSchedules),
      managers: new Map(managers.map(item => [Number(item.id), `${item.employeeCode} — ${item.fullName}`])),
    }
  }
}
