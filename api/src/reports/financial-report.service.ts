import { Injectable } from '@nestjs/common'
import { ModuleRef } from '@nestjs/core'
import { InjectDataSource } from '@nestjs/typeorm'
import { DataSource } from 'typeorm'
import { localDateOf } from '../attendance/attendance.service'
import { payrollLineNotReversedSql } from '../payroll/payroll-reversal-sql'
import { PayrollService } from '../payroll/payroll.service'
import {
  buildDeductionsReport, buildLoansReport, buildOvertimeReport, buildPayrollCostSummary, buildPayrollRegister, computeFinancialRow,
  type FinancialInstallmentSource, type FinancialItemSource, type FinancialLoanSource, type FinancialObligationInfo, type FinancialRow,
} from './financial-report'

export interface FinancialReportQuery {
  /** شهر الرواتب YYYY-MM؛ فاضي = شهر الرواتب الجاري بدورة payroll.cycle_start_day */
  period?: string
  /** فرع محدد (أو فرع حساب الفرع إجباريًا)، null = كل الفروع */
  branchId: number | null
  departmentId?: number | null
  /** فريق محدد، null = كل الفرق (نفس مرشح /reports/payroll/*) */
  teamId?: number | null
  costCenterId?: number | null
  /** true = يشمل المسيرات المحسوبة اللي لسه ما اتعتمدتش */
  includeDraft: boolean
}

// خصم التأمينات (حصة الموظف) عمود من ترحيل 049 — لو مش موجود لسه يتخطى، وحصة صاحب العمل تظهر «—»
const INSURANCE_COLUMN = 'socialInsuranceDeduction'
const MONEY_COLUMNS = ['basicSalary', 'allowances', 'overtimeAmount', 'overtimeHours', 'otherAdditions', 'latenessDeduction', 'shortfallDeduction',
  'absenceDeduction', 'unpaidLeaveDeduction', 'loanInstallments', 'otherDeductions', 'netPay'] as const
const BREAKDOWN_ARRAYS = ['salaryComponents', 'earnedComponents', 'obligationLines', 'leaveDeductionLines', 'overtimeEntryIds'] as const
const APPROVED_STATUSES = ['APPROVED', 'PAID']

@Injectable()
export class FinancialReportService {
  constructor(@InjectDataSource() private readonly ds: DataSource, private readonly moduleRef: ModuleRef) {}

  // حدود شهر الرواتب بالظبط من نفس دالة المسير (يوم بداية الدورة من الإعدادات)
  async periodOf(period?: string) {
    const payroll = this.moduleRef.get(PayrollService, { strict: false })
    let chosen = period
    if (!chosen) {
      const today = localDateOf(new Date())
      chosen = today.slice(0, 7)
      if (today > (await payroll.periodRange(chosen)).endDate) {
        const [year, month] = chosen.split('-').map(Number)
        chosen = month === 12 ? `${year + 1}-01` : `${year}-${String(month + 1).padStart(2, '0')}`
      }
    }
    const range = await payroll.periodRange(chosen)
    return { period: chosen, startDate: range.startDate, endDate: range.endDate }
  }

  private async insuranceAvailable(): Promise<boolean> {
    const rows: Array<{ size: number | null }> = await this.ds.query(`SELECT COL_LENGTH('dbo.payroll_items', '${INSURANCE_COLUMN}') AS [size]`)
    return rows[0]?.size !== null && rows[0]?.size !== undefined
  }

  /** بنود مسيرات الشهر في النطاق (الفرع/القسم/مركز التكلفة من لقطة المسير، ولو مفيش لقطة من ملف الموظف) مع قيود الدفتر المشار إليها. */
  async loadMonth(query: FinancialReportQuery) {
    const header = await this.periodOf(query.period)
    const insurance = await this.insuranceAvailable()
    const params: unknown[] = [header.period]
    const filters: string[] = []
    const filter = (column: string, value: number | null | undefined) => {
      if (value === null || value === undefined) return
      params.push(value)
      filters.push(`x.[${column}] = @${params.length - 1}`)
    }
    filter('branchId', query.branchId)
    filter('departmentId', query.departmentId)
    filter('teamId', query.teamId)
    filter('costCenterId', query.costCenterId)
    const money = [...MONEY_COLUMNS, ...(insurance ? [INSURANCE_COLUMN] : [])]
    const snapped = (key: string, fallback: string) => `CASE WHEN s.[snap] IS NOT NULL THEN TRY_CONVERT(int, JSON_VALUE(s.[snap], '$.${key}')) ELSE ${fallback} END`
    const sources: Array<FinancialItemSource & { runStart: string; runEnd: string }> = await this.ds.query(
      `SELECT x.*, b.[name] AS [branchName], d.[name] AS [departmentName], COALESCE(cc.[name], x.[snapCostCenterName]) AS [costCenterName]
       FROM (
         SELECT i.[runId], r.[name] AS [runName], r.[status] AS [runStatus], r.[runType],
           CONVERT(varchar(10), r.[startDate], 23) AS [runStart], CONVERT(varchar(10), r.[endDate], 23) AS [runEnd], i.[employeeId],
           COALESCE(JSON_VALUE(s.[snap], '$.employeeCode'), e.[employeeCode]) AS [employeeCode],
           COALESCE(JSON_VALUE(s.[snap], '$.fullName'), e.[fullName]) AS [fullName],
           ${snapped('branchId', 'e.[branchId]')} AS [branchId],
           ${snapped('departmentId', 'e.[departmentId]')} AS [departmentId],
           ${snapped('teamId', 'e.[teamId]')} AS [teamId],
           ${snapped('costCenterId', 'e.[costCenterId]')} AS [costCenterId],
           JSON_VALUE(s.[snap], '$.costCenterName') AS [snapCostCenterName],
           i.[payMethod] AS [itemPayMethod], e.[payMethod] AS [employeePayMethod], CONVERT(varchar(40), e.[bankTransferAmount]) AS [bankTransferAmount],
           pd.[status] AS [disbursementStatus], pd.[payMethod] AS [disbursedPayMethod],
           CONVERT(varchar(40), pd.[bankAmount]) AS [disbursedBankAmount], CONVERT(varchar(40), pd.[cashAmount]) AS [disbursedCashAmount],
           ${money.map(column => `CONVERT(varchar(40), i.[${column}]) AS [${column}]`).join(', ')},
           ${BREAKDOWN_ARRAYS.map(key => `CASE WHEN bd.[ok] = 1 THEN JSON_QUERY(i.[breakdown], '$.${key}') END AS [${key}]`).join(', ')},
           CASE WHEN bd.[ok] = 1 THEN JSON_QUERY(i.[breakdown], '$.settlementPayout') END AS [settlementPayout],
           ${insurance ? `CASE WHEN bd.[ok] = 1 AND JSON_VALUE(i.[breakdown], '$.socialInsurance.applies') = 'true'
             THEN JSON_VALUE(i.[breakdown], '$.socialInsurance.employerShare') END` : 'NULL'} AS [employerInsurance]
         FROM [payroll_items] i
         INNER JOIN [payroll_runs] r ON r.[id] = i.[runId]
         LEFT JOIN [payroll_run_members] m ON m.[runId] = i.[runId] AND m.[employeeId] = i.[employeeId]
         LEFT JOIN [employees] e ON e.[id] = i.[employeeId]
         -- اللي اتصرف فعلًا للبند (صف واحد لكل بند بقيد فريد): تقسيمه المثبت يغلب طريقة الصرف الحالية في الملف
         LEFT JOIN [payroll_item_disbursements] pd ON pd.[itemId] = i.[id]
         OUTER APPLY (SELECT CASE WHEN ISJSON(CAST(m.[snapshot] AS nvarchar(max))) = 1 THEN CAST(m.[snapshot] AS nvarchar(max)) END AS [snap]) s
         OUTER APPLY (SELECT CASE WHEN ISJSON(i.[breakdown]) = 1 THEN 1 ELSE 0 END AS [ok]) bd
         WHERE r.[period] = @0 AND r.[status] NOT IN ('CANCELLED', 'DRAFT') AND ISNULL(r.[runType], 'REGULAR') <> 'REVERSAL'
           AND ${payrollLineNotReversedSql('i.[runId]', 'i.[employeeId]')}
       ) x
       LEFT JOIN [branches] b ON b.[id] = x.[branchId]
       LEFT JOIN [departments] d ON d.[id] = x.[departmentId]
       LEFT JOIN [cost_centers] cc ON cc.[id] = x.[costCenterId]
       ${filters.length ? `WHERE ${filters.join(' AND ')}` : ''}`,
      params,
    )
    // المسيرات اللي لسه ما اتعتمدتش تتعد عشان الشاشة تنبّه عليها، ومش بتدخل الأرقام إلا بالاختيار
    const included = sources.filter(row => query.includeDraft || APPROVED_STATUSES.includes(row.runStatus))
    const runs = new Map<number, { id: number; name: string | null; status: string; runType: string | null; startDate: string; endDate: string; items: number; included: boolean }>()
    for (const row of sources) {
      const id = Number(row.runId)
      const run = runs.get(id) ?? { id, name: row.runName ?? null, status: row.runStatus, runType: row.runType ?? null, startDate: row.runStart, endDate: row.runEnd, items: 0,
        included: query.includeDraft || APPROVED_STATUSES.includes(row.runStatus) }
      run.items++
      runs.set(id, run)
    }
    const obligations = await this.loadObligations(included)
    const rows: FinancialRow[] = included.map(source => computeFinancialRow(source, obligations))
    const runList = [...runs.values()].sort((a, b) => a.startDate.localeCompare(b.startDate) || a.id - b.id)
    return {
      header: { ...header, includeDraft: query.includeDraft, branchId: query.branchId, departmentId: query.departmentId ?? null,
        teamId: query.teamId ?? null, costCenterId: query.costCenterId ?? null,
        runs: runList.filter(run => run.included), pendingRuns: runList.filter(run => !run.included), employerInsuranceAvailable: insurance },
      rows, insurance,
    }
  }

  private async loadObligations(sources: readonly FinancialItemSource[]): Promise<Map<number, FinancialObligationInfo>> {
    const ids = new Set<number>()
    for (const source of sources) {
      if (!source.obligationLines) continue
      try {
        const lines = JSON.parse(source.obligationLines)
        if (Array.isArray(lines)) for (const line of lines) if (Number.isSafeInteger(Number(line?.id)) && Number(line.id) > 0) ids.add(Number(line.id))
      } catch { /* تفصيل تالف: الباقي يظهر «غير مفصل» */ }
    }
    const map = new Map<number, FinancialObligationInfo>()
    const list = [...ids]
    for (let offset = 0; offset < list.length; offset += 1000) {
      const chunk = list.slice(offset, offset + 1000)
      const rows: Array<FinancialObligationInfo> = await this.ds.query(
        `SELECT o.[id], o.[type], o.[category], o.[label], o.[sourceRef],
           COALESCE(CASE WHEN ISJSON(dr.[typeSnapshot]) = 1 THEN JSON_VALUE(dr.[typeSnapshot], '$.nameAr') END,
                    CASE WHEN ISJSON(br.[typeSnapshot]) = 1 THEN JSON_VALUE(br.[typeSnapshot], '$.nameAr') END) AS [typeName]
         FROM [employee_obligations] o
         LEFT JOIN [deduction_requests] dr ON dr.[id] = o.[deductionRequestId]
         LEFT JOIN [bonus_requests] br ON br.[id] = o.[bonusRequestId]
         WHERE o.[id] IN (${chunk.join(', ')})`)
      for (const row of rows) map.set(Number(row.id), { id: Number(row.id), type: row.type, category: row.category, label: row.label, typeName: row.typeName,
        sourceRef: row.sourceRef ?? null })
    }
    return map
  }

  async payrollRegister(query: FinancialReportQuery) {
    const { header, rows, insurance } = await this.loadMonth(query)
    return { ...header, ...buildPayrollRegister(rows, insurance) }
  }

  async payrollCost(query: FinancialReportQuery) {
    const { header, rows, insurance } = await this.loadMonth(query)
    return { ...header, ...buildPayrollCostSummary(rows, insurance) }
  }

  async deductions(query: FinancialReportQuery) {
    const { header, rows } = await this.loadMonth(query)
    return { ...header, ...buildDeductionsReport(rows) }
  }

  async overtime(query: FinancialReportQuery) {
    const { header, rows } = await this.loadMonth(query)
    return { ...header, ...buildOvertimeReport(rows) }
  }

  // السلف: الموظف بفرعه وقسمه ومركز تكلفته الحاليين (السلفة مش مرتبطة بلقطة مسير)، والمخصوم في مسيرات الشهر من بنودها
  async loans(query: FinancialReportQuery) {
    const { header, rows } = await this.loadMonth(query)
    const params: unknown[] = []
    const where: string[] = []
    const filter = (column: string, value: number | null | undefined) => {
      if (value === null || value === undefined) return
      params.push(value)
      where.push(`e.[${column}] = @${params.length - 1}`)
    }
    filter('branchId', query.branchId)
    filter('departmentId', query.departmentId)
    filter('teamId', query.teamId)
    filter('costCenterId', query.costCenterId)
    const whereSql = where.length ? `WHERE ${where.join(' AND ')}` : ''
    const loans: FinancialLoanSource[] = await this.ds.query(
      `SELECT l.[id], l.[employeeId], CONVERT(varchar(40), l.[amount]) AS [amount], l.[status], CONVERT(varchar(10), l.[disbursedAt], 23) AS [disbursedAt],
         e.[employeeCode], e.[fullName], b.[name] AS [branchName], d.[name] AS [departmentName]
       FROM [loans] l
       INNER JOIN [employees] e ON e.[id] = l.[employeeId]
       LEFT JOIN [branches] b ON b.[id] = e.[branchId]
       LEFT JOIN [departments] d ON d.[id] = e.[departmentId]
       ${whereSql}`, params)
    const installments: FinancialInstallmentSource[] = loans.length ? await this.ds.query(
      `SELECT i.[id], i.[loanId], CONVERT(varchar(10), i.[dueDate], 23) AS [dueDate], CONVERT(varchar(40), i.[amount]) AS [amount],
         CONVERT(varchar(40), i.[paidAmount]) AS [paidAmount], i.[paid], i.[financialStatus], i.[parentInstallmentId]
       FROM [loan_installments] i
       INNER JOIN [loans] l ON l.[id] = i.[loanId]
       INNER JOIN [employees] e ON e.[id] = l.[employeeId]
       ${whereSql}`, params) : []
    const deducted = new Map<number, bigint>()
    for (const row of rows) if (row.deductions.LOANS !== 0n) deducted.set(row.employeeId, (deducted.get(row.employeeId) ?? 0n) + row.deductions.LOANS)
    return { ...header, ...buildLoansReport({ loans, installments, startDate: header.startDate, endDate: header.endDate, deductedByEmployee: deducted }) }
  }
}
