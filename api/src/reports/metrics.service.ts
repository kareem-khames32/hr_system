import { Injectable } from '@nestjs/common'
import { ModuleRef } from '@nestjs/core'
import { InjectDataSource } from '@nestjs/typeorm'
import { DataSource } from 'typeorm'
import { localDateOf } from '../attendance/attendance.service'
import type { JwtPayload } from '../auth/auth.service'
import { andBranchScopeSql, branchScopeOf, userHasPerm } from '../auth/guards'
import type { BranchScope } from '../auth/guards'
import { readOpenSuspensions } from '../employees/employee-suspensions'
import { displayEmployeeStatus } from '../employees/employee-suspension-rules'
import { employmentPeriodsReady } from '../employees/employment-periods'
import { ModulesService } from '../modules-registry/modules.service'
import type { ModuleKey } from '../modules-registry/registry'
import { EMPTY_ORG_FILTER, orgFilterSql, type OrgFilter } from '../org/org-filter-params'
import { reportCents, reportMoney } from '../payroll/payroll-reports'
import { FinancialReportService } from './financial-report.service'
import {
  METRICS, OVERTIME_COUNTED_STATUSES, absenceOutsideServiceSql, absenceRate, isActiveEmployee, isCurrentEmployee, serviceEndSql,
  serviceStartSql, turnoverRate, type MetricDefinition, type MetricKey,
} from './metrics'

export interface WorkforceCounts {
  /** اليوم اللي الأرقام محسوبة له (توقيت الشركة) */
  date: string
  headcount: number
  active: number
  probation: number
  byBranch: Array<{ branchName: string; total: number; active: number }>
  byDepartment: Array<{ departmentName: string; total: number }>
  byStatus: Array<{ status: string; total: number }>
}

export interface MetricValue extends Omit<MetricDefinition, 'modules' | 'perm'> {
  /** رقم المؤشر؛ null = مفيش رقم يتقال (مقام صفر، أو أكتر من عملة) */
  value: number | null
  /** أرقام الحساب (البسط والمقام) */
  parts: Record<string, number>
  /** تكلفة الموظف: قيمة لكل عملة لوحدها */
  byCurrency?: Array<{ currency: string; value: string; employees: number }>
}

const round2 = (value: unknown): number => Math.round(Number(value ?? 0) * 100) / 100
// قسمة قروش على عدد بتقريب نصف لأعلى (نفس تقريب التقارير المالية)
const divideCents = (cents: bigint, by: number): bigint => {
  const divisor = BigInt(by), negative = cents < 0n, abs = negative ? -cents : cents
  const quotient = (abs * 2n + divisor) / (divisor * 2n)
  return negative ? -quotient : quotient
}

// B2.13: حساب مؤشرات القاموس — المصدر الواحد للعدد والنشطين في اللوحة والتقرير والتصدير
@Injectable()
export class MetricsService {
  constructor(
    @InjectDataSource() private readonly ds: DataSource,
    private readonly modules: ModulesService,
    private readonly moduleRef: ModuleRef,
  ) {}

  /** القوى العاملة النهارده في نطاق القارئ والفلتر: العدد والنشطين بتعريف القاموس، والتوزيع بالفرع والقسم والحالة. */
  async workforce(scope: BranchScope, org: OrgFilter = EMPTY_ORG_FILTER): Promise<WorkforceCounts> {
    const params: unknown[] = []
    const inScope = andBranchScopeSql('e.branchId', scope, params)
    const inOrg = this.orgSql({ branch: 'e.branchId', department: 'e.departmentId', team: 'e.teamId' }, org, params)
    const rows: Array<{ id: number; status: string; isActive: unknown; branchName: string | null; departmentName: string | null }> =
      await this.ds.query(
        `SELECT e.id AS id, e.status AS status, e.isActive AS isActive, b.name AS branchName, d.name AS departmentName
         FROM employees e JOIN branches b ON b.id = e.branchId
         LEFT JOIN departments d ON d.id = e.departmentId
         WHERE 1=1 ${inScope} ${inOrg}`,
        params
      )
    const today = localDateOf(new Date())
    const suspensions = await readOpenSuspensions(this.ds.manager, today)
    const branches = new Map<string, { total: number; active: number }>()
    const departments = new Map<string, { total: number; active: number }>()
    const statuses = new Map<string, number>()
    const bump = (map: Map<string, { total: number; active: number }>, key: string, current: boolean, active: boolean) => {
      const cell = map.get(key) ?? { total: 0, active: 0 }
      if (current) cell.total += 1
      if (active) cell.active += 1
      map.set(key, cell)
    }
    let headcount = 0, active = 0, probation = 0
    for (const row of rows) {
      // الحالة المعروضة: الموقوف بفترة «موقوف» (نفس قاعدة شاشة الموظفين)
      const status = displayEmployeeStatus(row.status, suspensions.get(Number(row.id)) ?? [], today)
      const current = isCurrentEmployee(row), isActive = isActiveEmployee(row, status)
      if (current) headcount += 1
      if (isActive) active += 1
      if (current && status === 'probation') probation += 1
      if (row.branchName) bump(branches, row.branchName, current, isActive)
      if (row.departmentName) bump(departments, row.departmentName, current, isActive)
      statuses.set(status, (statuses.get(status) ?? 0) + 1)
    }
    return {
      date: today, headcount, active, probation,
      byBranch: [...branches.entries()].map(([branchName, cell]) => ({ branchName, total: cell.total, active: cell.active })),
      byDepartment: [...departments.entries()].map(([departmentName, cell]) => ({ departmentName, total: cell.total })),
      byStatus: [...statuses.entries()].map(([status, total]) => ({ status, total })),
    }
  }

  /**
   * قيم مؤشرات القاموس لشهر رواتب (الجاري لو مش مبعوت) في نطاق القارئ والفلتر. المؤشر اللي موديوله مقفول للقارئ أو صلاحيته
   * ناقصة مابيطلعش في الرد (زي ما يكون مش موجود).
   */
  async values(user: JwtPayload, org: OrgFilter = EMPTY_ORG_FILTER, period?: string) {
    const financial = this.moduleRef.get(FinancialReportService, { strict: false })
    const range = await financial.periodOf(period)
    const scope = branchScopeOf(user)
    const workforce = await this.workforce(scope, org)
    const metrics: MetricValue[] = []
    for (const metric of METRICS) {
      if (!(await this.visible(metric, user))) continue
      const { modules: _modules, perm: _perm, ...shown } = metric
      metrics.push({ ...shown, ...(await this.valueOf(metric.key, { user, scope, org, workforce, period: range.period, from: range.startDate, to: range.endDate })) })
    }
    return { period: range.period, from: range.startDate, to: range.endDate, date: workforce.date, metrics }
  }

  private async visible(metric: MetricDefinition, user: JwtPayload): Promise<boolean> {
    if (metric.perm && !userHasPerm(user, metric.perm)) return false
    for (const module of metric.modules) if (!(await this.modules.allowedFor(module as ModuleKey, user))) return false
    return true
  }

  private orgSql(columns: { branch: string; department: string; team: string }, org: OrgFilter, params: unknown[]) {
    return orgFilterSql(columns, org, params).map(clause => `AND ${clause}`).join(' ')
  }

  private async valueOf(key: MetricKey, input: {
    user: JwtPayload; scope: BranchScope; org: OrgFilter; workforce: WorkforceCounts; period: string; from: string; to: string
  }): Promise<Pick<MetricValue, 'value' | 'parts' | 'byCurrency'>> {
    const { scope, org, workforce, from, to } = input
    switch (key) {
      case 'headcount': return { value: workforce.headcount, parts: {} }
      case 'active_employees': return { value: workforce.active, parts: { headcount: workforce.headcount } }
      case 'turnover': {
        const parts = await this.serviceSpans(scope, org, from, to)
        return { value: turnoverRate(parts.leavers, parts.atStart, parts.atEnd), parts }
      }
      case 'absence': {
        const params: unknown[] = [from, to]
        const [row] = await this.ds.query(
          `SELECT SUM(CASE WHEN a.status = 'absent' THEN 1 ELSE 0 END) AS absentDays,
                  SUM(CASE WHEN a.status IN ('present', 'late', 'early_leave', 'absent') THEN 1 ELSE 0 END) AS requiredDays
           FROM attendance_days a JOIN employees e ON e.id = a.employeeId
           WHERE a.date BETWEEN @0 AND @1 ${andBranchScopeSql('a.branchId', scope, params)}
             ${this.orgSql({ branch: 'a.branchId', department: 'e.departmentId', team: 'e.teamId' }, org, params)}
             AND NOT (a.status = 'absent' AND ${absenceOutsideServiceSql('a', 'e')})`,
          params
        )
        const parts = { absentDays: Number(row?.absentDays ?? 0), requiredDays: Number(row?.requiredDays ?? 0) }
        return { value: absenceRate(parts.absentDays, parts.requiredDays), parts }
      }
      case 'overtime': {
        const params: unknown[] = [from, to]
        const [row] = await this.ds.query(
          `SELECT SUM(o.payableHours) AS hours, COUNT(*) AS entries
           FROM overtime_entries o JOIN employees e ON e.id = o.employeeId
           WHERE o.date BETWEEN @0 AND @1 AND o.status IN (${OVERTIME_COUNTED_STATUSES.map(status => `'${status}'`).join(', ')})
             ${andBranchScopeSql('e.branchId', scope, params)}
             ${this.orgSql({ branch: 'e.branchId', department: 'e.departmentId', team: 'e.teamId' }, org, params)}`,
          params
        )
        return { value: round2(row?.hours), parts: { entries: Number(row?.entries ?? 0) } }
      }
      case 'employee_cost': {
        // نفس دالة «ملخص تكلفة الرواتب» بالحرف: المعتمد والمصروف بس، وكل عملة لوحدها
        const report = await this.moduleRef.get(FinancialReportService, { strict: false }).payrollCost({
          period: input.period, branchId: org.branchId ?? (scope !== null && scope.length === 1 ? scope[0] : null), branchScope: scope,
          departmentId: null, departmentIds: org.departmentIds, teamId: org.teamId, costCenterId: null, includeDraft: false,
        })
        const byCurrency = report.byCurrency.filter(group => group.totals.headcount > 0).map(group => ({
          currency: group.currency, employees: group.totals.headcount,
          value: reportMoney(divideCents(reportCents(group.totals.totalCost), group.totals.headcount)),
        }))
        return { value: byCurrency.length === 1 ? Number(byCurrency[0].value) : null, byCurrency,
          parts: { employees: byCurrency.reduce((sum, group) => sum + group.employees, 0) } }
      }
    }
  }

  /**
   * فترات الخدمة في النطاق (الحالية من ملف الموظف + المقفولة من employment_periods): مين كان موجود أول الفترة وآخرها، ومين آخر
   * يوم له جوه الفترة. موظف خرج من غير ملف إنهاء ولا تاريخ أرشفة تاريخ خروجه مش معروف: بيتعدّ موجود ومابيتعدّش خارج.
   */
  private async serviceSpans(scope: BranchScope, org: OrgFilter, from: string, to: string) {
    const params: unknown[] = [from, to]
    const within = (alias: string) => `${andBranchScopeSql(`${alias}.branchId`, scope, params)} ${
      this.orgSql({ branch: `${alias}.branchId`, department: `${alias}.departmentId`, team: `${alias}.teamId` }, org, params)}`
    const closed = !(await employmentPeriodsReady(this.ds.manager)) ? '' : `
           UNION ALL
           SELECT p.startDate AS startDate, p.endDate AS endDate
           FROM employment_periods p JOIN employees pe ON pe.id = p.employeeId WHERE 1=1 ${within('pe')}`
    const [row] = await this.ds.query(
      `WITH spans AS (
           SELECT ${serviceStartSql('e')} AS startDate, ${serviceEndSql('e')} AS endDate
           FROM employees e WHERE 1=1 ${within('e')}${closed}
       )
       SELECT SUM(CASE WHEN startDate <= @0 AND (endDate IS NULL OR endDate >= @0) THEN 1 ELSE 0 END) AS atStart,
              SUM(CASE WHEN startDate <= @1 AND (endDate IS NULL OR endDate >= @1) THEN 1 ELSE 0 END) AS atEnd,
              SUM(CASE WHEN endDate >= @0 AND endDate <= @1 THEN 1 ELSE 0 END) AS leavers
       FROM spans`,
      params
    )
    return { leavers: Number(row?.leavers ?? 0), atStart: Number(row?.atStart ?? 0), atEnd: Number(row?.atEnd ?? 0) }
  }
}
