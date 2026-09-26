import { Controller, Get, Query, UseGuards } from '@nestjs/common'
import { InjectDataSource } from '@nestjs/typeorm'
import { DataSource } from 'typeorm'
import type { JwtPayload } from '../auth/auth.service'
import { andBranchScopeSql, branchScopeOf, branchScopeSql, CurrentUser, JwtAuthGuard, Perm, RolesGuard } from '../auth/guards'
import type { BranchScope } from '../auth/guards'
import { RequestsService } from '../requests/requests.service'
import { AttendanceService, localDateOf } from '../attendance/attendance.service'

// «حضر فعلاً» — تعريف كارت «الحاضرون اليوم» في stats نفسه (في الموعد + متأخر + منصرف
// بدري، وأي صف آخر ببصمة عدا الإجازة والغياب) لمنحنى الحضور وإحصائيات الأقسام.
// a = بادئة جدول attendance_days في الاستعلام ('ad.' عند الربط بالموظفين)
const attendedSql = (a = '') =>
  `(${a}status IN ('present', 'late', 'early_leave')
    OR (${a}status NOT IN ('leave', 'absent')
        AND (${a}checkIn IS NOT NULL OR ${a}checkOut IS NOT NULL)))`

// EX-14: النافذة اليومية تتقدم على تصنيف قديم لم يُعد حسابه؛ المستثنى خارج مقام الالتزام.
const attendanceExemptSql = (employeeId: string, date: string) =>
  `EXISTS (SELECT 1 FROM attendance_exemptions ex WHERE ex.employeeId=${employeeId}
    AND ex.status='APPROVED' AND ex.effectiveFrom<=${date}
    AND (ex.effectiveTo IS NULL OR ex.effectiveTo>=${date})
    AND (ex.terminatedFrom IS NULL OR ex.terminatedFrom>${date}))`

// عمر حساب غياب اليوم اللحظي المشترك بين ويدجتات اللوحة
const LIVE_ABSENCE_TTL_MS = 30_000

// إحصائيات اللوحة — استعلامات مجمعة بنطاق الفرع
@UseGuards(JwtAuthGuard, RolesGuard)
@Perm('dashboard.view_all')
@Controller('dashboard')
export class DashboardController {
  constructor(
    @InjectDataSource() private readonly ds: DataSource,
    private readonly requestsService: RequestsService,
    private readonly attendance: AttendanceService
  ) {}

  @Get('stats')
  async stats(@CurrentUser() user: JwtPayload) {
    const scope = branchScopeOf(user)
    // نطاق الفروع (فرع أو أكتر) شرط بمعاملات @n — كل استعلام له مصفوفة معاملاته
    const where = (column: string, params: unknown[]) => {
      const clause = branchScopeSql(column, scope, params)
      return clause ? `WHERE ${clause}` : ''
    }
    // اليوم بتوقيت الشركة — toISOString (UTC) كانت تعرض حضور امبارح من 00:00 لـ03:00
    const today = localDateOf(new Date())

    // الموظفون الحاليون فقط — المؤرشف والمنتهية خدمته خارج «الإجمالي»
    const empParams: unknown[] = []
    const [emp] = await this.ds.query(
      `SELECT COUNT(*) AS total,
              SUM(CASE WHEN status = 'active' THEN 1 ELSE 0 END) AS active,
              SUM(CASE WHEN status = 'probation' THEN 1 ELSE 0 END) AS probation
       FROM employees
       WHERE isActive = 1 AND status NOT IN ('archived', 'terminated') ${andBranchScopeSql('branchId', scope, empParams)}`,
      empParams
    )
    // الفرق بلا عمود فرع — نطاقها من فرع القسم التابعة له
    const orgParams: unknown[] = []
    const teamsScope = branchScopeSql('d.branchId', scope, orgParams)
    const [org] = await this.ds.query(
      `SELECT
        (SELECT COUNT(*) FROM branches ${where('id', orgParams)}) AS branches,
        (SELECT COUNT(*) FROM departments ${where('branchId', orgParams)}) AS departments,
        (SELECT COUNT(*) FROM teams t
          ${teamsScope ? `JOIN departments d ON d.id = t.departmentId WHERE ${teamsScope}` : ''}) AS teams`,
      orgParams
    )
    const reqParams: unknown[] = []
    const [req] = await this.ds.query(
      `SELECT
        SUM(CASE WHEN status = 'COMPLETED' THEN 1 ELSE 0 END) AS completed,
        SUM(CASE WHEN status = 'REJECTED' THEN 1 ELSE 0 END) AS rejected,
        COUNT(*) AS total
       FROM requests WHERE 1=1 ${andBranchScopeSql('branchId', scope, reqParams)}`,
      reqParams
    )
    // «قيد المراجعة» = ما ينتظر قرار هذا المستخدم فعلاً (نفس حساب صندوق الاعتماد)،
    // لا كل UNDER_REVIEW في الفرع
    const underReview = (await this.requestsService.inbox(user)).length
    // attended = كل من حضر فعلاً: في الموعد + متأخر + منصرف بدري، وأي صف آخر ببصمة دخول
    // أو خروج (عمل يوم عطلة/ويك إند = 'holiday'، نصف يوم إجازة ولو ببصمة خروج فقط).
    // مستبعَد عمداً: 'leave' ببصمة (تعارض إجازة كاملة ينتظر قرار HR — معدود في «في إجازة»)
    // و'absent' (معدود في «الغائبون») — كل صف في كارت واحد فقط
    const attParams: unknown[] = []
    const [att] = await this.ds.query(
      `SELECT
        SUM(CASE WHEN status IN ('present', 'late', 'early_leave')
                   OR (status NOT IN ('leave', 'absent')
                       AND (checkIn IS NOT NULL OR checkOut IS NOT NULL))
                 THEN 1 ELSE 0 END) AS attended,
        SUM(CASE WHEN status = 'present' THEN 1 ELSE 0 END) AS present,
        SUM(CASE WHEN status = 'late' THEN 1 ELSE 0 END) AS late,
        SUM(CASE WHEN status = 'early_leave' THEN 1 ELSE 0 END) AS earlyLeave,
        SUM(CASE WHEN status = 'absent' THEN 1 ELSE 0 END) AS absent
       FROM attendance_days WHERE date = '${today}' ${andBranchScopeSql('branchId', scope, attParams)}
         AND NOT ${attendanceExemptSql('attendance_days.employeeId', 'attendance_days.date')}`,
      attParams
    )
    // في إجازة اليوم: موظفون حاليون في النطاق، كل موظف مرة واحدة ولو تداخلت إجازاته.
    // يوم كامل = FULL (أو صباحي + مسائي معاً)؛ نصف اليوم يُعدّ منفصلاً ولا يدخل «في إجازة»
    const leaveParams: unknown[] = []
    const [onLeave] = await this.ds.query(
      `SELECT
        SUM(CASE WHEN x.fullDay = 1 THEN 1 ELSE 0 END) AS onLeaveToday,
        SUM(CASE WHEN x.fullDay = 0 THEN 1 ELSE 0 END) AS halfDayLeaveToday
       FROM (
         SELECT l.employeeId,
           CASE WHEN MAX(CASE WHEN l.period = 'FULL' THEN 1 ELSE 0 END) = 1
                  OR (MAX(CASE WHEN l.period = 'MORNING' THEN 1 ELSE 0 END) = 1
                      AND MAX(CASE WHEN l.period = 'EVENING' THEN 1 ELSE 0 END) = 1)
                THEN 1 ELSE 0 END AS fullDay
         FROM leaves l
         JOIN employees e ON e.id = l.employeeId
         WHERE l.status = 'APPROVED' AND l.fromDate <= '${today}' AND l.toDate >= '${today}'
           AND e.isActive = 1 AND e.status NOT IN ('archived', 'terminated')
           ${andBranchScopeSql('e.branchId', scope, leaveParams)}
         GROUP BY l.employeeId
       ) x`,
      leaveParams
    )
    const runParams: unknown[] = []
    const payrollRuns = await this.ds.query(
      `SELECT TOP 5 id, branchId, period, status, totalNet FROM payroll_runs
       ${where('branchId', runParams)} ORDER BY period DESC`,
      runParams
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
        underReview,
        completed: Number(req.completed ?? 0),
        rejected: Number(req.rejected ?? 0),
        total: Number(req.total ?? 0),
      },
      attendanceToday: {
        attended: Number(att.attended ?? 0),
        present: Number(att.present ?? 0),
        late: Number(att.late ?? 0),
        earlyLeave: Number(att.earlyLeave ?? 0),
        // المُجسَّد + غياب اليوم اللحظي (بدأت ورديته بلا بصمة ولا إجازة) —
        // الغياب يُجسَّد ليلاً فقط، فكان الكارت صفراً طول اليوم
        absent:
          Number(att.absent ?? 0) +
          (await this.attendance.liveAbsences(today, scope)).length,
      },
      onLeaveToday: Number(onLeave.onLeaveToday ?? 0),
      halfDayLeaveToday: Number(onLeave.halfDayLeaveToday ?? 0),
      payrollRuns,
    }
  }

  // منحنى الحضور (كان أرقاماً ثابتة ~220 حاضر يومياً): آخر 7 أيام (week) أو 30 يوماً
  // (month) حتى اليوم بنطاق الفرع. الأيام المنقضية من صفوفها المُجسَّدة (حضر/غائب/
  // إجازة — التجسيد الليلي يكتب صف «إجازة» لكل يوم عمل فيها)، واليوم الجاري بتعريفات
  // الكروت نفسها: الغياب اللحظي والإجازات المعتمدة (صفوف اليوم لا تُجسَّد إلا ليلاً)
  @Get('attendance-trend')
  async attendanceTrend(
    @CurrentUser() user: JwtPayload,
    @Query('period') period?: string
  ) {
    const scope = branchScopeOf(user)
    const span = period === 'month' ? 30 : 7
    const today = localDateOf(new Date())
    const dates: string[] = []
    for (let i = span - 1; i >= 0; i--) {
      // منتصف النهار — لا انزلاق يوم مع التوقيت الصيفي
      const d = new Date(`${today}T12:00:00`)
      d.setDate(d.getDate() - i)
      dates.push(localDateOf(d))
    }
    const trendParams: unknown[] = []
    const [rows, live, leavesToday] = await Promise.all([
      this.ds.query(
        `SELECT CONVERT(varchar(10), date, 23) AS d,
           SUM(CASE WHEN ${attendedSql()} AND exemptionDay.isExempt=0 THEN 1 ELSE 0 END) AS attended,
           SUM(CASE WHEN status = 'absent' AND exemptionDay.isExempt=0 THEN 1 ELSE 0 END) AS absent,
           SUM(CASE WHEN status = 'leave' THEN 1 ELSE 0 END) AS onLeave
         FROM attendance_days
         OUTER APPLY (SELECT CASE WHEN ${attendanceExemptSql('attendance_days.employeeId', 'attendance_days.date')} THEN 1 ELSE 0 END AS isExempt) exemptionDay
         WHERE date >= '${dates[0]}' AND date <= '${today}'
           ${andBranchScopeSql('branchId', scope, trendParams)}
         GROUP BY date`,
        trendParams
      ) as Promise<Array<{ d: string; attended: number; absent: number; onLeave: number }>>,
      this.liveAbsencesShared(today, scope),
      this.fullDayLeavesToday(today, scope),
    ])
    const byDate = new Map(rows.map((r) => [r.d, r]))
    return {
      period: span === 30 ? 'month' : 'week',
      from: dates[0],
      to: today,
      days: dates.map((date) => {
        const r = byDate.get(date)
        const isToday = date === today
        return {
          date,
          attended: Number(r?.attended ?? 0),
          absent: Number(r?.absent ?? 0) + (isToday ? live.length : 0),
          onLeave: isToday ? leavesToday.length : Number(r?.onLeave ?? 0),
        }
      }),
    }
  }

  // إحصائيات الأقسام لليوم (كانت 7 أقسام مخترعة): لكل قسم الموظفون الحاليون، ومن حضر،
  // والغائب (المُجسَّد + اللحظي)، ومن في إجازة يوم كامل — بتعريفات كروت اليوم، و«بدون
  // قسم» لمن لا قسم له فيطابق المجموع الكروت. القسم بلا موظفين ولا حركة اليوم لا يُعرض
  @Get('departments')
  async departmentStats(@CurrentUser() user: JwtPayload) {
    const scope = branchScopeOf(user)
    const today = localDateOf(new Date())
    const empParams: unknown[] = []
    const attParams: unknown[] = []
    const [emps, att, leavesToday, live, depts] = await Promise.all([
      // موظفو النطاق النشطون — للعدّ ولقسم الغائب اللحظي (صف العرض بلا قسم)
      this.ds.query(
        `SELECT id, departmentId, status,
           CASE WHEN ${attendanceExemptSql('employees.id', `'${today}'`)} THEN 1 ELSE 0 END AS attendanceExempt FROM employees
         WHERE isActive = 1 ${andBranchScopeSql('branchId', scope, empParams)}`,
        empParams
      ) as Promise<Array<{ id: number; departmentId: number | null; status: string; attendanceExempt: number }>>,
      this.ds.query(
        `SELECT e.departmentId,
           SUM(CASE WHEN ${attendedSql('ad.')} THEN 1 ELSE 0 END) AS attended,
           SUM(CASE WHEN ad.status = 'absent' THEN 1 ELSE 0 END) AS absent
         FROM attendance_days ad
         JOIN employees e ON e.id = ad.employeeId
         WHERE ad.date = '${today}' ${andBranchScopeSql('ad.branchId', scope, attParams)}
           AND NOT ${attendanceExemptSql('ad.employeeId', 'ad.date')}
         GROUP BY e.departmentId`,
        attParams
      ) as Promise<Array<{ departmentId: number | null; attended: number; absent: number }>>,
      this.fullDayLeavesToday(today, scope),
      this.liveAbsencesShared(today, scope),
      this.ds.query(`SELECT id, name FROM departments`) as Promise<
        Array<{ id: number; name: string }>
      >,
    ])
    const nameOf = new Map(depts.map((d) => [d.id, d.name]))
    type DeptRow = {
      id: number | null
      name: string
      employees: number
      exempt: number
      attended: number
      absent: number
      onLeave: number
    }
    const byDept = new Map<number | null, DeptRow>()
    const rowOf = (departmentId: number | null | undefined): DeptRow => {
      const id = departmentId ?? null
      let row = byDept.get(id)
      if (!row) {
        row = {
          id,
          name: id === null ? 'بدون قسم' : (nameOf.get(id) ?? `قسم #${id}`),
          employees: 0,
          exempt: 0,
          attended: 0,
          absent: 0,
          onLeave: 0,
        }
        byDept.set(id, row)
      }
      return row
    }
    // الإجمالي = الموظفون الحاليون فقط (المؤرشف والمنتهية خدمته خارجه) كالكارت
    for (const e of emps) {
      if (e.status !== 'archived' && e.status !== 'terminated') {
        rowOf(e.departmentId).employees++
        if (e.attendanceExempt) rowOf(e.departmentId).exempt++
      }
    }
    for (const a of att) {
      const row = rowOf(a.departmentId)
      row.attended += Number(a.attended ?? 0)
      row.absent += Number(a.absent ?? 0)
    }
    for (const l of leavesToday) rowOf(l.departmentId).onLeave++
    const deptOfEmp = new Map(emps.map((e) => [e.id, e.departmentId]))
    for (const r of live) rowOf(deptOfEmp.get(r.employeeId)).absent++
    return {
      date: today,
      departments: [...byDept.values()]
        .filter((d) => d.employees + d.attended + d.absent + d.onLeave > 0)
        // الأكبر أولاً، و«بدون قسم» في الآخر
        .sort(
          (a, b) =>
            Number(a.id === null) - Number(b.id === null) ||
            b.employees - a.employees ||
            a.name.localeCompare(b.name, 'ar')
        ),
    }
  }

  // في إجازة يوم كامل اليوم — تعريف كارت «في إجازة» في stats نفسه: موظفون حاليون في
  // النطاق، كل موظف مرة ولو تداخلت إجازاته، FULL أو صباحي + مسائي معاً
  private fullDayLeavesToday(
    today: string,
    scope: BranchScope
  ): Promise<Array<{ employeeId: number; departmentId: number | null }>> {
    const params: unknown[] = []
    return this.ds.query(
      `SELECT l.employeeId, MAX(e.departmentId) AS departmentId
       FROM leaves l
       JOIN employees e ON e.id = l.employeeId
       WHERE l.status = 'APPROVED' AND l.fromDate <= '${today}' AND l.toDate >= '${today}'
         AND e.isActive = 1 AND e.status NOT IN ('archived', 'terminated')
         ${andBranchScopeSql('e.branchId', scope, params)}
       GROUP BY l.employeeId
       HAVING MAX(CASE WHEN l.period = 'FULL' THEN 1 ELSE 0 END) = 1
          OR (MAX(CASE WHEN l.period = 'MORNING' THEN 1 ELSE 0 END) = 1
              AND MAX(CASE WHEN l.period = 'EVENING' THEN 1 ELSE 0 END) = 1)`,
      params
    )
  }

  // غياب اليوم اللحظي مكلف (وردية كل موظف لم يبصم بعد) — ويدجتا المنحنى والأقسام
  // تُطلبان معاً عند فتح اللوحة فتتشاركان حساباً واحداً لثوانٍ بدل تكراره
  private readonly liveAbsCache = new Map<
    string,
    { at: number; rows: Promise<Array<{ employeeId: number }>> }
  >()

  private liveAbsencesShared(date: string, scope: BranchScope) {
    const now = Date.now()
    this.liveAbsCache.forEach((cached, k) => {
      if (now - cached.at > LIVE_ABSENCE_TTL_MS) this.liveAbsCache.delete(k)
    })
    // مفتاح النطاق: «all» أو أرقام الفروع (النطاق الفاضي «none» — مايتخلطش بالكل)
    const key = `${date}|${scope === null ? 'all' : scope.join(',') || 'none'}`
    let entry = this.liveAbsCache.get(key)
    if (!entry) {
      const rows = this.attendance.liveAbsences(date, scope)
      entry = { at: now, rows }
      this.liveAbsCache.set(key, entry)
      // حساب فاشل لا يبقى في الذاكرة — النداء التالي يعيد المحاولة
      rows.catch(() => this.liveAbsCache.delete(key))
    }
    return entry.rows
  }
}
