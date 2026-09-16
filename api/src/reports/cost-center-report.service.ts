import { Injectable } from '@nestjs/common'
import { InjectDataSource } from '@nestjs/typeorm'
import { DataSource } from 'typeorm'
import { payrollLineNotReversedSql } from '../payroll/payroll-reversal-sql'
import { aggregateCostCenterReport, COST_CENTER_DEDUCTION_FIELDS, COST_CENTER_EARNING_FIELDS, type CostCenterReportRow } from './cost-center-report'

// خصم التأمينات (حصة الموظف) عمود من ترحيل 049 — لو مش موجود لسه نتخطاه، وحصة صاحب العمل تظهر «—»
const INSURANCE_DEDUCTION_COLUMN = 'socialInsuranceDeduction'

export interface CostCenterReportQuery {
  period: string
  /** فرع محدد، أو null = كل الفروع المسموحة */
  branchId: number | null
  /** true = يشمل المسيرات المحسوبة غير المعتمدة (مسودة) */
  includeDraft: boolean
}

@Injectable()
export class CostCenterReportService {
  constructor(@InjectDataSource() private readonly ds: DataSource) {}

  private async insuranceAvailable(): Promise<boolean> {
    const rows: Array<{ size: number | null }> = await this.ds.query(`SELECT COL_LENGTH('dbo.payroll_items', '${INSURANCE_DEDUCTION_COLUMN}') AS [size]`)
    return rows[0]?.size !== null && rows[0]?.size !== undefined
  }

  async report(query: CostCenterReportQuery) {
    const insurance = await this.insuranceAvailable()
    const moneyColumns = [...COST_CENTER_EARNING_FIELDS, ...COST_CENTER_DEDUCTION_FIELDS, 'netPay'].filter(column => insurance || column !== INSURANCE_DEDUCTION_COLUMN)
    const statuses = query.includeDraft ? `r.[status] <> 'CANCELLED'` : `r.[status] IN ('APPROVED', 'PAID')`
    const params: unknown[] = [query.period]
    let branchFilter = ''
    if (query.branchId !== null) {
      params.push(query.branchId)
      branchFilter = `WHERE x.[branchId] = @1`
    }
    // الفرع ومركز التكلفة من لقطة العضو وقت المسير، ولو مفيش لقطة (مسير قديم) من ملف الموظف الحالي
    const rows: CostCenterReportRow[] = await this.ds.query(
      `SELECT x.*, b.[name] AS [branchName], cc.[code] AS [costCenterCode], COALESCE(cc.[name], x.[snapCostCenterName]) AS [costCenterName]
       FROM (
         SELECT i.[runId], r.[name] AS [runName], r.[status] AS [runStatus], i.[employeeId],
           COALESCE(JSON_VALUE(s.[snap], '$.employeeCode'), e.[employeeCode]) AS [employeeCode],
           COALESCE(JSON_VALUE(s.[snap], '$.fullName'), e.[fullName]) AS [fullName],
           CASE WHEN s.[snap] IS NOT NULL THEN TRY_CONVERT(int, JSON_VALUE(s.[snap], '$.branchId')) ELSE e.[branchId] END AS [branchId],
           CASE WHEN s.[snap] IS NOT NULL THEN TRY_CONVERT(int, JSON_VALUE(s.[snap], '$.costCenterId')) ELSE e.[costCenterId] END AS [costCenterId],
           JSON_VALUE(s.[snap], '$.costCenterName') AS [snapCostCenterName],
           ${moneyColumns.map(column => `CONVERT(varchar(40), i.[${column}]) AS [${column}]`).join(', ')},
           ${insurance ? `CASE WHEN ISJSON(i.[breakdown]) = 1 AND JSON_VALUE(i.[breakdown], '$.socialInsurance.applies') = 'true'
             THEN JSON_VALUE(i.[breakdown], '$.socialInsurance.employerShare') END` : 'NULL'} AS [employerInsurance]
         FROM [payroll_items] i
         JOIN [payroll_runs] r ON r.[id] = i.[runId]
         LEFT JOIN [payroll_run_members] m ON m.[runId] = i.[runId] AND m.[employeeId] = i.[employeeId]
         LEFT JOIN [employees] e ON e.[id] = i.[employeeId]
         OUTER APPLY (SELECT CASE WHEN ISJSON(CAST(m.[snapshot] AS nvarchar(max))) = 1 THEN CAST(m.[snapshot] AS nvarchar(max)) END AS [snap]) s
         WHERE r.[period] = @0 AND ${statuses} AND ISNULL(r.[runType], 'REGULAR') <> 'REVERSAL'
           AND ${payrollLineNotReversedSql('i.[runId]', 'i.[employeeId]')}
       ) x
       LEFT JOIN [branches] b ON b.[id] = x.[branchId]
       LEFT JOIN [cost_centers] cc ON cc.[id] = x.[costCenterId]
       ${branchFilter}`,
      params,
    )
    return { period: query.period, branchId: query.branchId, includeDraft: query.includeDraft, employerInsuranceAvailable: insurance,
      ...aggregateCostCenterReport(rows, insurance) }
  }
}
