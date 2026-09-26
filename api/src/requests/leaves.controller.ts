import {
  BadRequestException,
  Controller,
  Get,
  Logger,
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
import { branchScopeOf, branchScopeQb, CurrentUser, inBranchScope, JwtAuthGuard, Perm, RolesGuard, scopeWord } from '../auth/guards'
import { AttendanceService } from '../attendance/attendance.service'
import { Employee } from '../employees/employee.entity'
import { Leave, LeaveType } from './entities/leave.entities'
import { LeaveBalancesService } from './leave-balances.service'
import { leaveView } from '../common/leave-contract'

// سجل الإجازات (الوجهة الدائمة) — قراءة بنطاق الفرع
@UseGuards(JwtAuthGuard, RolesGuard)
@Perm('leaves.view_all')
@Controller('leaves')
export class LeavesController {
  private readonly logger = new Logger(LeavesController.name)

  constructor(
    @InjectRepository(Leave) private readonly leaves: Repository<Leave>,
    @InjectRepository(Employee)
    private readonly employees: Repository<Employee>,
    private readonly balances: LeaveBalancesService,
    private readonly attendance: AttendanceService,
    private readonly ds: DataSource
  ) {}

  // سجل مرقّم بفلاتر على السيرفر (لا حدّ 500 ولا فلترة في الذاكرة). الشهر/المدى
  // = الإجازات المتقاطعة معه (fromDate ≤ النهاية و toDate ≥ البداية) فالإجازة
  // اللي بدأت الشهر اللي فات ومكمّلة تظهر. الإحصاءات بنفس الفلاتر عدا الحالة
  @Get()
  async list(
    @CurrentUser() user: JwtPayload,
    @Query('month') month?: string, // YYYY-MM اختياري
    @Query('from') from?: string, // YYYY-MM-DD اختياري
    @Query('to') to?: string, // YYYY-MM-DD اختياري
    @Query('status') status?: string,
    @Query('leaveType') leaveType?: string,
    @Query('q') q?: string, // اسم الموظف أو كوده
    @Query('page') pageRaw?: string,
    @Query('pageSize') pageSizeRaw?: string,
    @Query('leaveTypeCode') leaveTypeCode?: string
  ) {
    if (leaveTypeCode && leaveType && leaveTypeCode !== leaveType) {
      throw new BadRequestException('leaveTypeCode وleaveType يشيران إلى نوعين مختلفين')
    }
    leaveTypeCode ??= leaveType
    if (month && !/^\d{4}-(0[1-9]|1[0-2])$/.test(month)) {
      throw new BadRequestException('الشهر بصيغة YYYY-MM')
    }
    const DATE_RE = /^\d{4}-\d{2}-\d{2}$/
    if ((from && !DATE_RE.test(from)) || (to && !DATE_RE.test(to))) {
      throw new BadRequestException('التاريخ بصيغة YYYY-MM-DD')
    }
    const page = Math.max(1, Number.parseInt(pageRaw ?? '', 10) || 1)
    const pageSize = Math.min(
      200,
      Math.max(1, Number.parseInt(pageSizeRaw ?? '', 10) || 50)
    )
    const scope = branchScopeOf(user)
    const term = q?.trim()

    // الفلاتر المشتركة بين الصفحة والإحصاءات (نطاق الفرع دائماً)
    const filtered = () => {
      const qb = this.leaves.createQueryBuilder('l')
      if (scope !== null) {
        const [inScope, params] = branchScopeQb('e.branchId', scope)
        qb.andWhere(`l.employeeId IN (SELECT e.id FROM employees e WHERE ${inScope})`, params)
      }
      if (month) {
        const [y, m] = month.split('-').map(Number)
        const lastDay = String(new Date(y, m, 0).getDate()).padStart(2, '0')
        qb.andWhere('l.fromDate <= :monthEnd AND l.toDate >= :monthStart', {
          monthStart: `${month}-01`,
          monthEnd: `${month}-${lastDay}`,
        })
      }
      if (from) qb.andWhere('l.toDate >= :from', { from })
      if (to) qb.andWhere('l.fromDate <= :to', { to })
      if (leaveTypeCode) qb.andWhere('l.leaveTypeCode = :leaveTypeCode', { leaveTypeCode })
      if (term) {
        // محارف LIKE في SQL Server مهرّبة ([ % _) — البحث نص حرفي
        const like = `%${term.replace(/[[%_]/g, '[$&]')}%`
        qb.andWhere(
          'l.employeeId IN (SELECT s.id FROM employees s WHERE s.fullName LIKE :like OR s.employeeCode LIKE :like)',
          { like }
        )
      }
      return qb
    }

    const pageQb = filtered()
    if (status) pageQb.andWhere('l.status = :status', { status })
    const [rows, total] = await pageQb
      .orderBy('l.fromDate', 'DESC')
      .addOrderBy('l.id', 'DESC')
      .skip((page - 1) * pageSize)
      .take(pageSize)
      .getManyAndCount()

    const agg = await filtered()
      .select('COUNT(*)', 'cnt')
      .addSelect("SUM(CASE WHEN l.status = 'APPROVED' THEN 1 ELSE 0 END)", 'approved')
      .addSelect("SUM(CASE WHEN l.status = 'CANCELLED' THEN 1 ELSE 0 END)", 'cancelled')
      .addSelect("SUM(CASE WHEN l.status = 'APPROVED' THEN l.days ELSE 0 END)", 'approvedDays')
      .getRawOne()

    // إثراء بأسماء موظفي الصفحة فقط للعرض المباشر
    const empIds = [...new Set(rows.map((l) => l.employeeId))]
    const emps = empIds.length
      ? await this.employees.find({
          where: { id: In(empIds) },
          select: { id: true, fullName: true, employeeCode: true },
        })
      : []
    const byId = new Map(emps.map((e) => [e.id, e]))
    return {
      items: rows.map((l) => ({
        ...leaveView(l),
        employeeName: byId.get(l.employeeId)?.fullName ?? `#${l.employeeId}`,
        employeeCode: byId.get(l.employeeId)?.employeeCode ?? '',
      })),
      total,
      page,
      pageSize,
      stats: {
        all: Number(agg?.cnt ?? 0),
        approved: Number(agg?.approved ?? 0),
        cancelled: Number(agg?.cancelled ?? 0),
        approvedDays: Number(agg?.approvedDays ?? 0),
      },
    }
  }

  // إلغاء إجازة معتمدة مباشرة من HR: الموظف رجع الشغل ومحدش أخذها —
  // الرصيد يرجع بالطبقات وأيام الحضور تُعاد فوراً
  @Perm('leaves.revoke')
  @Post(':id/revoke')
  async revoke(
    @CurrentUser() user: JwtPayload,
    @Param('id', ParseIntPipe) id: number
  ) {
    let leave = await this.leaves.findOne({ where: { id } })
    if (!leave) throw new NotFoundException('الإجازة غير موجودة')
    // نطاق الفرع — HR الفرع لا يلغي إجازات فرع آخر
    const scope = branchScopeOf(user)
    if (scope !== null) {
      const emp = await this.employees.findOne({
        where: { id: leave.employeeId },
      })
      if (!inBranchScope(scope, emp?.branchId)) {
        throw new BadRequestException(`الإجازة خارج نطاق ${scopeWord(scope)}`)
      }
    }
    if (leave.status !== 'APPROVED') {
      throw new BadRequestException('تُلغى الإجازات المعتمدة فقط')
    }

    const savedLeave = await this.ds.transaction(async (em) => {
      const locked = await em.getRepository(Leave).findOne({ where: { id }, lock: { mode: 'pessimistic_write' } })
      if (!locked || locked.status !== 'APPROVED') throw new BadRequestException('تُلغى الإجازات المعتمدة فقط')
      const leave = locked
      leave.status = 'CANCELLED'
      leave.revokedByUserId = user.sub
      leave.revokedAt = new Date()
      await em.getRepository(Leave).save(leave)
      const lt = await em.getRepository(LeaveType).findOne({
        where: { code: leave.leaveTypeCode },
      })
      const balanceType = lt?.balanceType ?? 'annual'
      if (balanceType !== 'none') {
        // بنفس تقسيم السنين اللي اتخصم بيه (الإجازة اللي بتعدّي السنة)
        await this.balances.restoreLeave(em, leave, balanceType)
      }
      return leave
    })
    leave = savedLeave

    // بعد الالتزام: أيام الإجازة كلها تتحسب تاني كأيام عادية (المدى كامل بلا
    // حدّ) — والأيام المستقبلية يمسح computeDay صفوفها بدل ما يكتبها «غائب»
    const from = new Date(`${leave.fromDate}T12:00:00`)
    const to = new Date(`${leave.toDate}T12:00:00`)
    for (let d = new Date(from); d <= to; d.setDate(d.getDate() + 1)) {
      const date = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
      try {
        await this.attendance.computeDay(leave.employeeId, date)
      } catch (e) {
        // أفضل جهد — الإلغاء نفسه اتحفظ؛ الخطأ يُسجَّل ولا يُبلع ولا يوقف باقي الأيام
        this.logger.error(
          `تعذّرت إعادة حساب حضور ${date} للموظف #${leave.employeeId} بعد إلغاء الإجازة #${leave.id}`,
          (e as Error)?.stack
        )
      }
    }
    return { ...leaveView(leave), revokedBy: user.sub }
  }
}
