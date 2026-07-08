import { Controller, Get, UseGuards } from '@nestjs/common'
import { InjectDataSource } from '@nestjs/typeorm'
import { DataSource } from 'typeorm'
import type { JwtPayload } from '../auth/auth.service'
import { branchScopeOf, CurrentUser, JwtAuthGuard, Perm, RolesGuard } from '../auth/guards'

// إحصائيات اللوحة — استعلامات مجمعة بنطاق الفرع
@UseGuards(JwtAuthGuard, RolesGuard)
@Perm('dashboard.view_all')
@Controller('dashboard')
export class DashboardController {
  constructor(@InjectDataSource() private readonly ds: DataSource) {}

  @Get('stats')
  async stats(@CurrentUser() user: JwtPayload) {
    const scope = branchScopeOf(user)
    const branchWhere = scope !== null ? `WHERE branchId = ${scope}` : ''
    const andBranch = scope !== null ? `AND branchId = ${scope}` : ''
    const today = new Date().toISOString().slice(0, 10)

    const [emp] = await this.ds.query(
      `SELECT COUNT(*) AS total,
              SUM(CASE WHEN status = 'active' THEN 1 ELSE 0 END) AS active,
              SUM(CASE WHEN status = 'probation' THEN 1 ELSE 0 END) AS probation
       FROM employees ${scope !== null ? `WHERE branchId = ${scope}` : ''}`
    )
    const [org] = await this.ds.query(
      `SELECT
        (SELECT COUNT(*) FROM branches ${scope !== null ? `WHERE id = ${scope}` : ''}) AS branches,
        (SELECT COUNT(*) FROM departments ${branchWhere}) AS departments,
        (SELECT COUNT(*) FROM teams) AS teams`
    )
    const [req] = await this.ds.query(
      `SELECT
        SUM(CASE WHEN status = 'UNDER_REVIEW' THEN 1 ELSE 0 END) AS underReview,
        SUM(CASE WHEN status = 'COMPLETED' THEN 1 ELSE 0 END) AS completed,
        SUM(CASE WHEN status = 'REJECTED' THEN 1 ELSE 0 END) AS rejected,
        COUNT(*) AS total
       FROM requests WHERE 1=1 ${andBranch}`
    )
    const [att] = await this.ds.query(
      `SELECT
        SUM(CASE WHEN status = 'present' THEN 1 ELSE 0 END) AS present,
        SUM(CASE WHEN status = 'late' THEN 1 ELSE 0 END) AS late,
        SUM(CASE WHEN status = 'early_leave' THEN 1 ELSE 0 END) AS earlyLeave,
        SUM(CASE WHEN status = 'absent' THEN 1 ELSE 0 END) AS absent
       FROM attendance_days WHERE date = '${today}' ${andBranch}`
    )
    const [onLeave] = await this.ds.query(
      `SELECT COUNT(*) AS onLeaveToday FROM leaves
       WHERE status = 'APPROVED' AND fromDate <= '${today}' AND toDate >= '${today}'`
    )
    const payrollRuns = await this.ds.query(
      `SELECT TOP 5 id, branchId, period, status, totalNet FROM payroll_runs
       ${branchWhere} ORDER BY period DESC`
    )

    return {
      role: user.role,
      employees: {
        total: Number(emp.total ?? 0),
        active: Number(emp.active ?? 0),
        probation: Number(emp.probation ?? 0),
      },
      org: {
        branches: Number(org.branches ?? 0),
        departments: Number(org.departments ?? 0),
        teams: Number(org.teams ?? 0),
      },
      requests: {
        underReview: Number(req.underReview ?? 0),
        completed: Number(req.completed ?? 0),
        rejected: Number(req.rejected ?? 0),
        total: Number(req.total ?? 0),
      },
      attendanceToday: {
        present: Number(att.present ?? 0),
        late: Number(att.late ?? 0),
        earlyLeave: Number(att.earlyLeave ?? 0),
        absent: Number(att.absent ?? 0),
      },
      onLeaveToday: Number(onLeave.onLeaveToday ?? 0),
      payrollRuns,
    }
  }
}
