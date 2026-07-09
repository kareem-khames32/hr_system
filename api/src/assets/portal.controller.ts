import { Controller, Get, Query, UseGuards } from '@nestjs/common'
import { InjectRepository } from '@nestjs/typeorm'
import { Between, In, MoreThanOrEqual, Repository } from 'typeorm'
import type { JwtPayload } from '../auth/auth.service'
import { branchScopeOf, CurrentUser, JwtAuthGuard, RolesGuard, userHasPerm } from '../auth/guards'
import { AttendanceDay } from '../attendance/attendance.entities'
import { Employee } from '../employees/employee.entity'
import { RequestApproval } from '../requests/entities/request-approval.entity'
import { Request } from '../requests/entities/request.entity'
import { RequestType } from '../requests/entities/request-type.entity'
import { Leave } from '../requests/entities/leave.entities'
import { PublicHoliday } from './assets.entities'

// التقويم الموحّد + الإشعارات المشتقة (بلا جدول إشعارات — من الأحداث الفعلية)
@UseGuards(JwtAuthGuard, RolesGuard)
@Controller()
export class PortalController {
  constructor(
    @InjectRepository(PublicHoliday)
    private readonly holidays: Repository<PublicHoliday>,
    @InjectRepository(Leave) private readonly leaves: Repository<Leave>,
    @InjectRepository(Employee)
    private readonly employees: Repository<Employee>,
    @InjectRepository(Request) private readonly requests: Repository<Request>,
    @InjectRepository(RequestType)
    private readonly requestTypes: Repository<RequestType>,
    @InjectRepository(RequestApproval)
    private readonly approvals: Repository<RequestApproval>,
    @InjectRepository(AttendanceDay)
    private readonly attendanceDays: Repository<AttendanceDay>
  ) {}

  // ===== التقويم: عطلات + إجازات معتمدة في الشهر =====
  @Get('calendar')
  async calendar(@CurrentUser() user: JwtPayload, @Query('month') month: string) {
    const m = /^\d{4}-\d{2}$/.test(month ?? '')
      ? month
      : new Date().toISOString().slice(0, 7)
    const scope = branchScopeOf(user)
    const emps = await this.employees.find({
      where: scope !== null ? { branchId: scope } : {},
    })
    const empById = new Map(emps.map((e) => [e.id, e.fullName]))

    const allHolidays = await this.holidays.find({ order: { date: 'ASC' } })
    const monthHolidays = allHolidays.filter(
      (h) => h.date.startsWith(m) || (h.endDate && h.endDate.startsWith(m))
    )
    const allLeaves = await this.leaves.find({
      where:
        scope !== null
          ? { status: 'APPROVED', employeeId: In(emps.map((e) => e.id)) }
          : { status: 'APPROVED' },
    })
    const visibleLeaves = userHasPerm(user, 'calendar.view_all')
      ? allLeaves
      : allLeaves.filter((l) => l.employeeId === user.employeeId)
    const monthLeaves = visibleLeaves.filter(
      (l) => l.fromDate.slice(0, 7) <= m && l.toDate.slice(0, 7) >= m
    )
    return {
      month: m,
      holidays: monthHolidays,
      leaves: monthLeaves.map((l) => ({
        ...l,
        employeeName: empById.get(l.employeeId) ?? `#${l.employeeId}`,
      })),
    }
  }

  // ===== الإشعارات المشتقة للمستخدم الحالي =====
  @Get('notifications')
  async notifications(@CurrentUser() user: JwtPayload) {
    const items: Array<{
      id: string
      kind: string
      title: string
      body: string
      at: Date | string
      link: string
    }> = []

    // 1) قرارات على طلباتي
    if (user.employeeId) {
      const myRequests = await this.requests.find({
        where: { requesterId: user.employeeId },
        order: { createdAt: 'DESC' },
        take: 50,
      })
      const reqById = new Map(myRequests.map((r) => [r.id, r]))
      if (myRequests.length > 0) {
        const acts = await this.approvals.find({
          where: { requestId: In(myRequests.map((r) => r.id)) },
          order: { actedAt: 'DESC' },
          take: 20,
        })
        const actLabel: Record<string, string> = {
          APPROVED: 'تمت الموافقة على',
          REJECTED: 'تم رفض',
          RETURNED_FOR_INFO: 'أُعيد لاستكمال معلومات',
          ESCALATED: 'تم تصعيد',
        }
        // الاسم العربي للنوع — الكود لا يظهر للمستخدم أبداً
        const typeCodes = [...new Set(myRequests.map((r) => r.typeCode))]
        const typeRows = typeCodes.length
          ? await this.requestTypes.find({ where: { code: In(typeCodes) } })
          : []
        const nameByCode = new Map(typeRows.map((t) => [t.code, t.nameAr]))
        for (const a of acts) {
          const req = reqById.get(a.requestId)
          const typeName = req
            ? (nameByCode.get(req.typeCode) ?? 'طلب')
            : 'طلب'
          items.push({
            id: `act-${a.id}`,
            kind: a.action === 'APPROVED' ? 'success' : a.action === 'REJECTED' ? 'error' : 'warning',
            title: `${actLabel[a.action] ?? a.action} طلبك`,
            body: `${typeName}${a.comment ? ` — ${a.comment}` : ''}`,
            at: a.actedAt,
            link: '/requests',
          })
        }
      }
    }

    // 2) تعارض بصمة×إجازة (آخر 7 أيام) — لمن يملك قرار الإلغاء
    const scope = branchScopeOf(user)
    if (userHasPerm(user, 'leaves.revoke')) {
      const since = new Date(Date.now() - 7 * 86400000)
      const sinceStr = `${since.getFullYear()}-${String(since.getMonth() + 1).padStart(2, '0')}-${String(since.getDate()).padStart(2, '0')}`
      const conflictWhere: Record<string, unknown> = {
        leaveConflict: true,
        date: MoreThanOrEqual(sinceStr),
      }
      if (scope !== null) conflictWhere.branchId = scope
      const conflicts = await this.attendanceDays.find({
        where: conflictWhere as any,
        order: { date: 'DESC' },
        take: 10,
      })
      if (conflicts.length > 0) {
        const empIds = [...new Set(conflicts.map((c) => c.employeeId))]
        const emps = await this.employees.find({ where: { id: In(empIds) } })
        const nameById = new Map(emps.map((e) => [e.id, e.fullName]))
        for (const c of conflicts) {
          items.push({
            id: `leave-conflict-${c.employeeId}-${c.date}`,
            kind: 'warning',
            title: 'موظف بصم يوم إجازته',
            body: `${nameById.get(c.employeeId) ?? `#${c.employeeId}`} حضر يوم ${c.date} رغم إجازته المعتمدة — القرار: إلغاء الإجازة (يرجع الرصيد ويتحسب دوام) أو إبقاؤها`,
            at: c.date,
            link: '/leaves',
          })
        }
      }
    }

    // 3) طلبات بانتظار موافقتي (عدّاد)
    const where: Record<string, unknown> = { status: 'UNDER_REVIEW' }
    if (scope !== null) where.branchId = scope
    const pending = await this.requests.count({ where: where as any })
    if (pending > 0 && user.role !== 'employee') {
      items.push({
        id: 'inbox-pending',
        kind: 'info',
        title: 'موافقات بانتظارك',
        body: `${pending} طلب قيد المراجعة في نطاقك`,
        at: new Date(),
        link: '/approvals-inbox',
      })
    }

    return items
      .sort((a, b) => new Date(b.at).getTime() - new Date(a.at).getTime())
      .slice(0, 15)
  }
}
