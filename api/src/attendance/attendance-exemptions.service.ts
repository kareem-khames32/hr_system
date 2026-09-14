import { BadRequestException, ConflictException, ForbiddenException, Injectable, NotFoundException } from '@nestjs/common'
import { InjectRepository } from '@nestjs/typeorm'
import { EntityManager, Repository } from 'typeorm'
import type { JwtPayload } from '../auth/auth.service'
import { branchScopeOf, userHasPerm } from '../auth/guards'
import { Employee } from '../employees/employee.entity'
import { RequestsConfig } from '../requests/entities/requests-config.entity'
import { lockPayrollEmployees } from '../payroll/payroll-settlement-boundary'
import { AttendanceExemption, AttendanceExemptionEvent, AttendanceExemptionReasonCode } from './attendance-exemption.entities'
import { loadAttendanceExemptions } from './attendance-exemption-resolver'

type ExemptionInput = {
  employeeId: number; effectiveFrom: string; effectiveTo?: string | null; reasonCode: AttendanceExemptionReasonCode; reason: string
  overtimeEligibleOverride?: boolean | null; unpaidLeaveDeductibleOverride?: boolean | null; requiresCheckinForPresence?: boolean
}

// ⑨ / EX-09، EX-13: نافذة معتمدة واحدة هي مصدر الاستثناء، دون علم دائم يغير التاريخ.
@Injectable()
export class AttendanceExemptionsService {
  constructor(@InjectRepository(AttendanceExemption) private readonly windows: Repository<AttendanceExemption>) {}

  private permission(user: JwtPayload, permission: string) {
    if (!userHasPerm(user, permission)) throw new ForbiddenException('ليست لديك صلاحية إدارة هذا الاستثناء')
  }

  private async employee(user: JwtPayload, employeeId: number, em = this.windows.manager) {
    const employee = await em.getRepository(Employee).findOneBy({ id: employeeId })
    if (!employee) throw new NotFoundException('الموظف غير موجود')
    const branch = branchScopeOf(user)
    if (branch !== null && employee.branchId !== branch) throw new ForbiddenException('الموظف خارج الفرع المسموح لك')
    return employee
  }

  private date(date: string) {
    const parsed = new Date(`${date}T12:00:00Z`)
    if (!/^\d{4}-\d{2}-\d{2}$/.test(date) || !Number.isFinite(parsed.getTime()) || parsed.toISOString().slice(0, 10) !== date || date < '1900-01-01') {
      throw new BadRequestException('تاريخ الاستثناء غير صالح')
    }
    return date
  }

  private async config(em: EntityManager, key: string, fallback: string) {
    return (await em.getRepository(RequestsConfig).findOneBy({ key }))?.value ?? fallback
  }

  private async reason(em: EntityManager, reason: string) {
    const minimum = Number(await this.config(em, 'payroll.exemption_reason_min_length', '20'))
    if (!Number.isInteger(minimum) || minimum < 1 || minimum > 500) throw new BadRequestException('إعداد طول سبب الاستثناء غير صالح')
    if (typeof reason !== 'string' || reason.trim().length < minimum || reason.trim().length > 500) {
      throw new BadRequestException(`سبب الاستثناء مطلوب من ${minimum} إلى 500 حرف`)
    }
    return reason.trim()
  }

  private async currentPeriodStart(em: EntityManager) {
    const now = new Date()
    const startDay = Number(await this.config(em, 'payroll.cycle_start_day', '23'))
    if (!Number.isInteger(startDay) || startDay < 1 || startDay > 31) throw new BadRequestException('إعداد بداية فترة الرواتب غير صالح')
    const start = new Date(now.getFullYear(), now.getMonth(), Math.min(startDay, new Date(now.getFullYear(), now.getMonth() + 1, 0).getDate()), 12)
    if (start.getDate() > now.getDate()) start.setFullYear(now.getFullYear(), now.getMonth() - 1, Math.min(startDay, new Date(now.getFullYear(), now.getMonth(), 0).getDate()))
    return `${start.getFullYear()}-${String(start.getMonth() + 1).padStart(2, '0')}-${String(start.getDate()).padStart(2, '0')}`
  }

  private async validateRange(em: EntityManager, employee: Employee, from: string, to: string | null) {
    this.date(from)
    if (to) this.date(to)
    if (to && from > to) throw new BadRequestException('نهاية الاستثناء تسبق بدايته')
    if (from < (employee.actualStartDate || employee.joinDate || '1900-01-01')) throw new BadRequestException('الاستثناء لا يسبق بداية العمل')
    if (from < await this.currentPeriodStart(em)) throw new BadRequestException('الاستثناء بأثر رجعي قبل الفترة الحالية يحتاج تسوية مالية موثقة؛ لا يمكن تغيير الفترة السابقة من هنا')
    // اللقطة المعتمدة لا تتغير بقرار لاحق؛ معالجة الماضي تكون بتسوية مستقلة.
    const locked = await em.query(`SELECT TOP (1) r.id FROM dbo.payroll_runs r
      INNER JOIN dbo.payroll_items i ON i.runId=r.id
      WHERE i.employeeId=@0 AND r.status IN ('APPROVED','PAID') AND r.startDate<=@1 AND r.endDate>=@2`,
    [employee.id, to ?? '9999-12-31', from])
    if (locked.length) throw new ConflictException('تتداخل الفترة مع مسير معتمد أو مصروف؛ راجع التسوية المالية أولًا')
  }

  private async noOverlap(em: EntityManager, employeeId: number, from: string, to: string | null, exceptId?: number) {
    const overlaps = (await loadAttendanceExemptions(em, employeeId, from, to ?? '9999-12-31')).filter(row => row.id !== exceptId)
    if (overlaps.length) throw new ConflictException({ code: 'EXEMPT-OVERLAP', message: 'توجد نافذة استثناء معتمدة متداخلة لهذا الموظف', exemptionId: overlaps[0].id })
  }

  private async record(em: EntityManager, user: JwtPayload, row: AttendanceExemption, eventType: string, reason: string, before: AttendanceExemption | null) {
    await em.getRepository(AttendanceExemptionEvent).save({ exemptionId: row.id, actorUserId: user.sub, eventType, reason, payload: { before, after: row } })
  }

  async create(user: JwtPayload, dto: ExemptionInput) {
    this.permission(user, 'attendance_exemption.manage')
    return this.windows.manager.transaction(async em => {
      await lockPayrollEmployees(em, [dto.employeeId])
      const employee = await this.employee(user, dto.employeeId, em)
      const reason = await this.reason(em, dto.reason)
      await this.validateRange(em, employee, dto.effectiveFrom, dto.effectiveTo ?? null)
      await this.noOverlap(em, employee.id, dto.effectiveFrom, dto.effectiveTo ?? null)
      const row = await em.getRepository(AttendanceExemption).save({ ...dto, effectiveTo: dto.effectiveTo ?? null,
        overtimeEligibleOverride: dto.overtimeEligibleOverride ?? null, unpaidLeaveDeductibleOverride: dto.unpaidLeaveDeductibleOverride ?? null,
        reason, status: 'PENDING', createdByUserId: user.sub, requiresCheckinForPresence: dto.requiresCheckinForPresence ?? false })
      await this.record(em, user, row, 'CREATED', reason, null)
      return row
    })
  }

  private async mutate(user: JwtPayload, id: number, update: (em: EntityManager, row: AttendanceExemption, employee: Employee) => Promise<AttendanceExemption>) {
    return this.windows.manager.transaction(async em => {
      const reference = await em.getRepository(AttendanceExemption).findOneBy({ id })
      if (!reference) throw new NotFoundException('الاستثناء غير موجود')
      await lockPayrollEmployees(em, [reference.employeeId])
      const row = await em.getRepository(AttendanceExemption).findOneByOrFail({ id })
      const employee = await this.employee(user, row.employeeId, em)
      return update(em, row, employee)
    })
  }

  async approve(user: JwtPayload, id: number, note: string, executive: boolean) {
    this.permission(user, executive ? 'attendance_exemption.approve_executive' : 'attendance_exemption.approve')
    return this.mutate(user, id, async (em, row, employee) => {
      if (row.status !== 'PENDING') throw new BadRequestException('الاستثناء ليس بانتظار الاعتماد')
      const reason = await this.reason(em, note)
      await this.validateRange(em, employee, row.effectiveFrom, row.effectiveTo)
      await this.noOverlap(em, row.employeeId, row.effectiveFrom, row.effectiveTo, row.id)
      const before = { ...row }
      if (executive) {
        if (row.reasonCode !== 'executive' || !row.approvedByUserId || row.executiveApprovedByUserId) throw new BadRequestException('هذه الخطوة تتطلب استثناء قياديًا اعتمدته الموارد البشرية أولًا')
        row.executiveApprovedByUserId = user.sub
        row.executiveApprovedAt = new Date()
      } else {
        if (row.approvedByUserId) throw new BadRequestException('اعتماد الموارد البشرية مسجل بالفعل؛ الاستثناء بانتظار الاعتماد التنفيذي')
        row.approvedByUserId = user.sub
        row.approvedAt = new Date()
      }
      if (row.reasonCode !== 'executive' || row.executiveApprovedByUserId) row.status = 'APPROVED'
      await em.getRepository(AttendanceExemption).save(row)
      await this.record(em, user, row, executive ? 'EXECUTIVE_APPROVED' : 'HR_APPROVED', reason, before)
      return row
    })
  }

  async cancel(user: JwtPayload, id: number, note: string) {
    this.permission(user, 'attendance_exemption.manage')
    return this.mutate(user, id, async (em, row) => {
      if (row.status !== 'PENDING') throw new BadRequestException('المعتمد يُنهى بتاريخ سريان بدل إلغاء تاريخه')
      const reason = await this.reason(em, note)
      const before = { ...row }
      row.status = 'CANCELLED'
      await em.getRepository(AttendanceExemption).save(row)
      await this.record(em, user, row, 'CANCELLED', reason, before)
      return row
    })
  }

  async terminate(user: JwtPayload, id: number, from: string, note: string) {
    this.permission(user, 'attendance_exemption.approve')
    return this.mutate(user, id, async (em, row, employee) => {
      if (row.status !== 'APPROVED' || row.terminatedFrom) throw new BadRequestException('الاستثناء غير معتمد أو سبق إنهاؤه')
      const reason = await this.reason(em, note)
      await this.validateRange(em, employee, from, row.effectiveTo)
      if (from < row.effectiveFrom) throw new BadRequestException('تاريخ الإنهاء لا يسبق بداية الاستثناء')
      const before = { ...row }
      row.terminatedFrom = from
      row.terminationReason = reason
      row.terminatedByUserId = user.sub
      await em.getRepository(AttendanceExemption).save(row)
      await this.record(em, user, row, 'TERMINATED', reason, before)
      return row
    })
  }

  async list(user: JwtPayload, employeeId: number) {
    this.permission(user, 'attendance_exemption.view')
    await this.employee(user, employeeId)
    return this.windows.find({ where: { employeeId }, order: { effectiveFrom: 'DESC', id: 'DESC' } })
  }

  async mine(user: JwtPayload) {
    if (!user.employeeId) return []
    return this.windows.find({ where: { employeeId: user.employeeId, status: 'APPROVED' }, order: { effectiveFrom: 'DESC' } })
  }

  async events(user: JwtPayload, id: number) {
    this.permission(user, 'attendance_exemption.view')
    const row = await this.windows.findOneBy({ id })
    if (!row) throw new NotFoundException('الاستثناء غير موجود')
    await this.employee(user, row.employeeId)
    return this.windows.manager.getRepository(AttendanceExemptionEvent).find({ where: { exemptionId: id }, order: { id: 'ASC' } })
  }
}
