import { Injectable, NotFoundException } from '@nestjs/common'
import { InjectDataSource } from '@nestjs/typeorm'
import { DataSource } from 'typeorm'
import type { JwtPayload } from '../auth/auth.service'
import { branchIdIn, branchScopeOf } from '../auth/guards'
import { Employee } from '../employees/employee.entity'
import { grossMonthlySalary } from '../employees/compensation'
import { readBranchCurrencyOf } from '../org/branch-currency-db'
import { totalsByCurrency } from '../org/currency-totals'
import { PayrollDailyAccrualService } from './payroll-daily-accrual.service'
import { roundPayrollMoney as round2 } from './payroll-money'

// B1.14 (الراتب الحي): معاينة الفترة الجارية «لحد امبارح» من جدول التراكم اليومي الموجود (payroll_daily_accrual) — من غير مسير.
// قراءة بس: مجموع صفوف التراكم لكل موظف. المبالغ دي استرشادية (راتب الملف الحالي وقواعد يوم الحساب)؛ الرقم النهائي من المسير نفسه
// بلقطة سياسته وحماية الصافي والسلف والتأمينات وقيود الدفتر، فالمعاينة مكتوب عليها «تقديري» ومابتغيّرش أي مبلغ في أي مسير.

// «حدّث الحساب»: كل طلب بيحسب لحد المدة دي وبيقول الباقي، والشاشة بتكمّل (أول حساب لـ500 موظف بياخد دقيقتين تقريبًا)
export const PAYROLL_LIVE_REFRESH_BUDGET_MS = 20_000

export const PAYROLL_LIVE_NOTE = 'تقديري من حضور الفترة لحد امبارح؛ والنهائي في المسير بعد الحساب والاعتماد (السلف والتأمينات وقيود الدفتر مش هنا)'

interface AccrualSums {
  employeeId: number; days: number; absentDays: number; unpaidLeaveDays: number; suspendedDays: number
  lateMinutes: number; shortfallMinutes: number; overtimeMinutes: number
  earnings: number; overtime: number; lateness: number; shortfall: number; absence: number; unpaidLeave: number; suspension: number
  dirtyDays: number; lastDate: string | null
}
export interface PayrollLiveRow extends Omit<AccrualSums, 'earnings'> {
  employeeCode: string; fullName: string; branchId: number | null; branchName: string | null; departmentName: string | null; currency: string
  earned: number; deductions: number; estimatedNet: number
  /** أيامه محسوبة كلها لحد اليوم المطلوب ومن غير يوم محتاج إعادة حساب (واللي تعيينه بعد اليوم المطلوب مفيش عليه أيام تتحسب) */
  complete: boolean
}
const MONEY = ['earned', 'overtime', 'lateness', 'shortfall', 'absence', 'unpaidLeave', 'suspension', 'deductions', 'estimatedNet'] as const
type MoneyTotals = Record<typeof MONEY[number], number> & { employees: number }
const sumRows = (rows: readonly PayrollLiveRow[]): MoneyTotals => ({
  employees: rows.length,
  ...Object.fromEntries(MONEY.map(key => [key, round2(rows.reduce((total, row) => total + row[key], 0))])) as Record<typeof MONEY[number], number>,
})

@Injectable()
export class PayrollLiveService {
  constructor(@InjectDataSource() private readonly ds: DataSource, private readonly accrual: PayrollDailyAccrualService) {}

  private async sums(period: string, from: string, upTo: string, employeeIds: readonly number[]): Promise<Map<number, AccrualSums>> {
    const result = new Map<number, AccrualSums>()
    for (let offset = 0; offset < employeeIds.length; offset += 1000) {
      const rows: Array<Record<string, unknown>> = await this.ds.query(`SELECT a.[employeeId], COUNT(*) AS [days],
          SUM(CAST(a.[isAbsent] AS int)) AS [absentDays], SUM(CAST(a.[isUnpaidLeave] AS int)) AS [unpaidLeaveDays], SUM(CAST(a.[isSuspended] AS int)) AS [suspendedDays],
          SUM(a.[lateMinutes]) AS [lateMinutes], SUM(a.[shortfallMinutes]) AS [shortfallMinutes], SUM(a.[overtimeMinutes]) AS [overtimeMinutes],
          CONVERT(varchar(40), SUM(a.[earningsAmount])) AS [earnings], CONVERT(varchar(40), SUM(a.[overtimeAmount])) AS [overtime],
          CONVERT(varchar(40), SUM(a.[latenessAmount])) AS [lateness], CONVERT(varchar(40), SUM(a.[shortfallAmount])) AS [shortfall],
          CONVERT(varchar(40), SUM(a.[absenceAmount])) AS [absence], CONVERT(varchar(40), SUM(a.[leaveAmount])) AS [unpaidLeave],
          CONVERT(varchar(40), SUM(a.[suspensionAmount])) AS [suspension], SUM(CAST(a.[isDirty] AS int)) AS [dirtyDays],
          CONVERT(varchar(10), MAX(CASE WHEN a.[isDirty] = 0 THEN a.[date] END), 23) AS [lastDate]
        FROM [payroll_daily_accrual] a
        WHERE a.[period] = @0 AND a.[date] >= @1 AND a.[date] <= @2 AND a.[employeeId] IN (SELECT CAST([value] AS int) FROM OPENJSON(@3))
        GROUP BY a.[employeeId]`, [period, from, upTo, JSON.stringify(employeeIds.slice(offset, offset + 1000))])
      for (const row of rows) {
        const number = (key: string) => Number(row[key] ?? 0) || 0
        result.set(Number(row.employeeId), { employeeId: Number(row.employeeId), days: number('days'), absentDays: number('absentDays'), unpaidLeaveDays: number('unpaidLeaveDays'),
          suspendedDays: number('suspendedDays'), lateMinutes: number('lateMinutes'), shortfallMinutes: number('shortfallMinutes'), overtimeMinutes: number('overtimeMinutes'),
          earnings: number('earnings'), overtime: number('overtime'), lateness: number('lateness'), shortfall: number('shortfall'), absence: number('absence'),
          unpaidLeave: number('unpaidLeave'), suspension: number('suspension'), dirtyDays: number('dirtyDays'), lastDate: row.lastDate ? String(row.lastDate).slice(0, 10) : null })
      }
    }
    return result
  }

  private row(employee: Employee, sums: AccrualSums | undefined, upTo: string, names: { branch: (id: number | null) => string | null; department: (id: number | null) => string | null },
    currency: string): PayrollLiveRow {
    const empty: AccrualSums = { employeeId: employee.id, days: 0, absentDays: 0, unpaidLeaveDays: 0, suspendedDays: 0, lateMinutes: 0, shortfallMinutes: 0, overtimeMinutes: 0,
      earnings: 0, overtime: 0, lateness: 0, shortfall: 0, absence: 0, unpaidLeave: 0, suspension: 0, dirtyDays: 0, lastDate: null }
    const { earnings, ...facts } = sums ?? empty
    // الشهر 30 يوم مهما كان طوله (قاعدة المسير): استحقاق أيام الفترة مايعدّيش راتب الشهر
    const earned = round2(Math.min(earnings, grossMonthlySalary(employee)))
    const deductions = round2(facts.lateness + facts.shortfall + facts.absence + facts.unpaidLeave + facts.suspension)
    return { ...facts, overtime: round2(facts.overtime), lateness: round2(facts.lateness), shortfall: round2(facts.shortfall), absence: round2(facts.absence),
      unpaidLeave: round2(facts.unpaidLeave), suspension: round2(facts.suspension),
      employeeCode: employee.employeeCode ?? '', fullName: employee.fullName ?? `#${employee.id}`, branchId: employee.branchId ?? null,
      branchName: names.branch(employee.branchId ?? null), departmentName: names.department(employee.departmentId ?? null), currency,
      earned, deductions, estimatedNet: round2(earned + facts.overtime - deductions),
      complete: facts.dirtyDays === 0 && (facts.lastDate === upTo || String(employee.actualStartDate || employee.joinDate || '').slice(0, 10) > upTo) }
  }

  private async names() {
    const branches: Array<{ id: number; name: string }> = await this.ds.query('SELECT [id], [name] FROM [branches]')
    const departments: Array<{ id: number; name: string }> = await this.ds.query('SELECT [id], [name] FROM [departments]')
    const branchNames = new Map(branches.map(row => [Number(row.id), row.name])), departmentNames = new Map(departments.map(row => [Number(row.id), row.name]))
    return { branch: (id: number | null) => id == null ? null : branchNames.get(id) ?? null, department: (id: number | null) => id == null ? null : departmentNames.get(id) ?? null }
  }

  /** موظفو نطاق القارئ النشطون (بفرعهم الحالي — المعاينة مالهاش لقطة عضوية) */
  private scopedEmployees(user: JwtPayload) {
    const scope = branchScopeOf(user)
    return this.ds.getRepository(Employee).find({ where: { isActive: true, ...(scope === null ? {} : { branchId: branchIdIn(scope) }) }, order: { id: 'ASC' } })
  }

  /** معاينة الفترة الجارية لحد امبارح لقارئ الرواتب بنطاق فروعه: صف لكل موظف، وإجمالي لكل فرع ولكل عملة */
  async preview(user: JwtPayload) {
    const window = await this.accrual.liveWindow()
    const base = { period: window.period, startDate: window.startDate, endDate: window.endDate, upTo: window.upTo, estimated: true as const, note: PAYROLL_LIVE_NOTE }
    if (!(await this.accrual.accrualTableReady(this.ds.manager))) {
      return { ...base, available: false as const, rows: [] as PayrollLiveRow[], byBranch: [], byCurrency: [], counts: { employees: 0, complete: 0, pending: 0 } }
    }
    const employees = await this.scopedEmployees(user)
    const started = window.startDate <= window.upTo
    const sums = started ? await this.sums(window.period, window.startDate, window.upTo, employees.map(employee => employee.id)) : new Map<number, AccrualSums>()
    const names = await this.names(), currencyOf = await readBranchCurrencyOf(this.ds.manager)
    const rows = employees.map(employee => this.row(employee, sums.get(employee.id), window.upTo, names, currencyOf(employee.branchId ?? null)))
      .sort((a, b) => a.fullName.localeCompare(b.fullName, 'ar') || a.employeeId - b.employeeId)
    const branches = new Map<number | null, PayrollLiveRow[]>()
    for (const row of rows) branches.set(row.branchId, [...(branches.get(row.branchId) ?? []), row])
    const byBranch = [...branches].map(([branchId, list]) => ({ branchId, branchName: list[0].branchName, currency: list[0].currency, totals: sumRows(list) }))
      .sort((a, b) => String(a.branchName ?? '').localeCompare(String(b.branchName ?? ''), 'ar'))
    const complete = rows.filter(row => row.complete).length
    return { ...base, available: true as const, rows, byBranch, byCurrency: totalsByCurrency(rows, row => row.currency, sumRows),
      counts: { employees: rows.length, complete, pending: rows.length - complete } }
  }

  /**
   * زرار «حدّث الحساب»: يحسب الناقص والمتسخ دلوقتي لموظفي نطاق القارئ اللي لسه مش جاهزين، ويرجّع المعاينة بعده.
   * الطلب بيحسب لحد PAYROLL_LIVE_REFRESH_BUDGET_MS وبيرجّع `remaining`؛ الشاشة بتكمّل لحد ما يبقى صفر.
   */
  async refresh(user: JwtPayload) {
    const pending = (await this.preview(user)).rows.filter(row => !row.complete).map(row => row.employeeId)
    const totals = await this.accrual.refreshLive(pending, { budgetMs: PAYROLL_LIVE_REFRESH_BUDGET_MS })
    return { ...totals, preview: await this.preview(user) }
  }

  /**
   * «مستحقي التقديري لحد امبارح» للموظف عن نفسه (الميزة الفرعية payroll.live_employee_view، مقفولة افتراضيًا): مجموع الفترة ويوم بيوم
   * (اللي عليه خصم أو إضافي بس). بيعرض المعتمد والمحسوب بس؛ الإضافي اللي لسه ماتعتمدش عدده «في انتظار اعتماد» من غير مبلغ.
   */
  async mine(user: JwtPayload) {
    if (!user.employeeId) throw new NotFoundException('الحساب ده مش مربوط بملف موظف')
    const employee = await this.ds.getRepository(Employee).findOne({ where: { id: user.employeeId } })
    if (!employee) throw new NotFoundException('ملف الموظف غير موجود')
    const window = await this.accrual.liveWindow()
    const base = { period: window.period, startDate: window.startDate, endDate: window.endDate, upTo: window.upTo, estimated: true as const,
      note: 'تقديري، والنهائي في القسيمة بعد الاعتماد' }
    if (!(await this.accrual.accrualTableReady(this.ds.manager)) || window.startDate > window.upTo) {
      return { ...base, available: false as const, summary: null, days: [], pendingOvertime: 0 }
    }
    const currency = (await readBranchCurrencyOf(this.ds.manager))(employee.branchId ?? null)
    const sums = (await this.sums(window.period, window.startDate, window.upTo, [employee.id])).get(employee.id)
    const row = this.row(employee, sums, window.upTo, { branch: () => null, department: () => null }, currency)
    const days: Array<Record<string, unknown>> = await this.ds.query(`SELECT CONVERT(varchar(10), a.[date], 23) AS [date], a.[attendanceStatus], a.[lateMinutes], a.[shortfallMinutes],
        a.[overtimeMinutes], CONVERT(varchar(40), a.[latenessAmount]) AS [lateness], CONVERT(varchar(40), a.[shortfallAmount]) AS [shortfall],
        CONVERT(varchar(40), a.[absenceAmount]) AS [absence], CONVERT(varchar(40), a.[leaveAmount]) AS [unpaidLeave],
        CONVERT(varchar(40), a.[suspensionAmount]) AS [suspension], CONVERT(varchar(40), a.[overtimeAmount]) AS [overtime]
      FROM [payroll_daily_accrual] a
      WHERE a.[employeeId] = @0 AND a.[period] = @1 AND a.[date] >= @2 AND a.[date] <= @3 AND a.[isDirty] = 0
        AND (a.[latenessAmount] > 0 OR a.[shortfallAmount] > 0 OR a.[absenceAmount] > 0 OR a.[leaveAmount] > 0 OR a.[suspensionAmount] > 0 OR a.[overtimeAmount] > 0)
      ORDER BY a.[date]`, [employee.id, window.period, window.startDate, window.upTo])
    const [pending] = await this.ds.query(`SELECT COUNT(*) AS [n] FROM [overtime_entries] WHERE [employeeId] = @0 AND [date] >= @1 AND [date] <= @2 AND [status] IN ('DETECTED', 'SUBMITTED')`,
      [employee.id, window.startDate, window.upTo])
    return { ...base, available: true as const, currency,
      summary: { days: row.days, earned: row.earned, overtime: row.overtime, lateness: row.lateness, shortfall: row.shortfall, absence: row.absence,
        unpaidLeave: row.unpaidLeave, suspension: row.suspension, deductions: row.deductions, estimatedNet: row.estimatedNet, complete: row.complete },
      days: days.map(day => ({ date: String(day.date), status: day.attendanceStatus ?? null, lateMinutes: Number(day.lateMinutes ?? 0), shortfallMinutes: Number(day.shortfallMinutes ?? 0),
        overtimeMinutes: Number(day.overtimeMinutes ?? 0), lateness: round2(Number(day.lateness ?? 0)), shortfall: round2(Number(day.shortfall ?? 0)), absence: round2(Number(day.absence ?? 0)),
        unpaidLeave: round2(Number(day.unpaidLeave ?? 0)), suspension: round2(Number(day.suspension ?? 0)), overtime: round2(Number(day.overtime ?? 0)) })),
      pendingOvertime: Number(pending?.n ?? 0) }
  }
}
