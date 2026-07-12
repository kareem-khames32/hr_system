import {
  BadRequestException,
  Controller,
  Get,
  NotFoundException,
  Param,
  ParseIntPipe,
  Post,
  Query,
  UseGuards,
} from '@nestjs/common'
import { InjectRepository } from '@nestjs/typeorm'
import { DataSource, In, Repository } from 'typeorm'
import type { JwtPayload } from '../auth/auth.service'
import { branchScopeOf, CurrentUser, JwtAuthGuard, Perm, RolesGuard } from '../auth/guards'
import { AttendanceService } from '../attendance/attendance.service'
import { Employee } from '../employees/employee.entity'
import { Leave, LeaveType } from './entities/leave.entities'
import { LeaveBalancesService } from './leave-balances.service'

// سجل الإجازات (الوجهة الدائمة) — قراءة بنطاق الفرع
@UseGuards(JwtAuthGuard, RolesGuard)
@Perm('leaves.view_all')
@Controller('leaves')
export class LeavesController {
  constructor(
    @InjectRepository(Leave) private readonly leaves: Repository<Leave>,
    @InjectRepository(Employee)
    private readonly employees: Repository<Employee>,
    private readonly balances: LeaveBalancesService,
    private readonly attendance: AttendanceService,
    private readonly ds: DataSource
  ) {}

  @Get()
  async list(
    @CurrentUser() user: JwtPayload,
    @Query('month') month?: string // YYYY-MM اختياري
  ) {
    const scope = branchScopeOf(user)
    const emps = await this.employees.find({
      where: scope !== null ? { branchId: scope } : {},
    })
    const byId = new Map(emps.map((e) => [e.id, e]))
    let rows = await this.leaves.find({
      where:
        scope !== null ? { employeeId: In(emps.map((e) => e.id)) } : {},
      order: { fromDate: 'DESC' },
      take: 500,
    })
    if (month) rows = rows.filter((l) => l.fromDate.startsWith(month))
    // إثراء بأسماء الموظفين للعرض المباشر
    return rows.map((l) => ({
      ...l,
      employeeName: byId.get(l.employeeId)?.fullName ?? `#${l.employeeId}`,
      employeeCode: byId.get(l.employeeId)?.employeeCode ?? '',
    }))
  }

  // إلغاء إجازة معتمدة مباشرة من HR: الموظف رجع الشغل ومحدش أخذها —
  // الرصيد يرجع بالطبقات وأيام الحضور تُعاد فوراً
  @Perm('leaves.revoke')
  @Post(':id/revoke')
  async revoke(
    @CurrentUser() user: JwtPayload,
    @Param('id', ParseIntPipe) id: number
  ) {
    const leave = await this.leaves.findOne({ where: { id } })
    if (!leave) throw new NotFoundException('الإجازة غير موجودة')
    // نطاق الفرع — HR الفرع لا يلغي إجازات فرع آخر
    const scope = branchScopeOf(user)
    if (scope !== null) {
      const emp = await this.employees.findOne({
        where: { id: leave.employeeId },
      })
      if (emp?.branchId !== scope) {
        throw new BadRequestException('الإجازة خارج نطاق فرعك')
      }
    }
    if (leave.status !== 'APPROVED') {
      throw new BadRequestException('تُلغى الإجازات المعتمدة فقط')
    }

    await this.ds.transaction(async (em) => {
      leave.status = 'CANCELLED'
      leave.revokedByUserId = user.sub
      leave.revokedAt = new Date()
      await em.getRepository(Leave).save(leave)
      const lt = await em.getRepository(LeaveType).findOne({
        where: { code: leave.leaveType },
      })
      const balanceType = lt?.balanceSource ?? 'annual'
      if (balanceType !== 'none') {
        await this.balances.restore(
          em,
          leave.employeeId,
          balanceType,
          Number(leave.days),
          leave.fromDate.slice(0, 4)
        )
      }
    })

    // بعد الالتزام: أيام الإجازة تتحسب تاني كأيام عادية (≤62 يوم)
    try {
      const from = new Date(`${leave.fromDate}T12:00:00`)
      const to = new Date(`${leave.toDate}T12:00:00`)
      for (
        let d = new Date(from), i = 0;
        d <= to && i < 62;
        d.setDate(d.getDate() + 1), i++
      ) {
        const date = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
        await this.attendance.computeDay(leave.employeeId, date)
      }
    } catch {
      /* أفضل جهد — الإلغاء نفسه اتحفظ */
    }
    return { ...leave, revokedBy: user.sub }
  }
}
