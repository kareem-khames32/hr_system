import { BadRequestException, ConflictException, ForbiddenException, Injectable, NotFoundException } from '@nestjs/common'
import { InjectRepository } from '@nestjs/typeorm'
import { EntityManager, In, Repository } from 'typeorm'
import type { JwtPayload } from '../auth/auth.service'
import { branchScopeOf, userHasPerm } from '../auth/guards'
import { User } from '../auth/user.entity'
import { hasHrOverride } from '../requests/approver-resolver.service'
import { Employee } from '../employees/employee.entity'
import { Branch } from '../org/entities/branch.entity'
import { RequestsConfig } from '../requests/entities/requests-config.entity'
import { lockPayrollEmployees } from '../payroll/payroll-settlement-boundary'
// C8 / الخطوة 31: بند مسير عُكس صرفه بسطر منفذ لا يُقفل الفترة أمام قرار الاستثناء
import { payrollLineNotReversedSql } from '../payroll/payroll-reversal-sql'
import { payrollPeriodBounds, payrollPeriodOfDate, shiftPayrollPeriod } from '../payroll/payroll-period'
import { AttendanceExemption, AttendanceExemptionEvent, AttendanceExemptionReasonCode, AttendanceExemptionStatus } from './attendance-exemption.entities'
import { loadAttendanceExemptions } from './attendance-exemption-resolver'

type ExemptionInput = {
  employeeId: number; effectiveFrom: string; effectiveTo?: string | null; reasonCode: AttendanceExemptionReasonCode; reason: string
  requiresCheckinForPresence?: boolean
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

  // asOf = لحظة القرار المرجعية. اعتماد طلب معلق يُقاس على الفترة التي كانت مفتوحة وقت إنشائه،
  // فلا يسقط الطلب لمجرد بدء دورة جديدة (يوم 23)؛ والمسير المعتمد/المصروف يبقى حاجزًا مستقلًا أدناه.
  private async currentPeriodStart(em: EntityManager, asOf: Date = new Date()) {
    const now = Number.isFinite(asOf?.getTime?.()) ? new Date(asOf.getTime()) : new Date()
    const startDay = Number(await this.config(em, 'payroll.cycle_start_day', '23'))
    if (!Number.isInteger(startDay) || startDay < 1 || startDay > 31) throw new BadRequestException('إعداد بداية فترة الرواتب غير صالح')
    // الخطوة 14: نفس اشتقاق فترة المسير الفعلي (بداية الفترة = نهاية السابقة + يوم؛ دورات 29/30/31 بلا يوم مشترك).
    const today = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`
    return payrollPeriodBounds(payrollPeriodOfDate(today, startDay), startDay).startDate
  }

  // تبسيط الرواتب (2026-09-15): مسير الشهر يُصرف بعد انتهاء فترته (مسير أغسطس في سبتمبر)، فالاستثناء يبدأ من أول الفترة السابقة
  // ما دام مسيرها للموظف لم يُعتمد (حاجز المسير المعتمد/المصروف أدناه باقٍ). ما قبل الفترة السابقة يحتاج تسوية مالية.
  private async earliestStart(em: EntityManager, asOf: Date = new Date()) {
    const startDay = Number(await this.config(em, 'payroll.cycle_start_day', '23'))
    const current = await this.currentPeriodStart(em, asOf)
    return payrollPeriodBounds(shiftPayrollPeriod(payrollPeriodOfDate(current, startDay), -1), startDay).startDate
  }

  private async validateRange(em: EntityManager, employee: Employee, from: string, to: string | null, asOf?: Date, allowPreviousPeriod = false) {
    this.date(from)
    if (to) this.date(to)
    if (to && from > to) throw new BadRequestException('نهاية الاستثناء تسبق بدايته')
    if (from < (employee.actualStartDate || employee.joinDate || '1900-01-01')) throw new BadRequestException('الاستثناء لا يسبق بداية العمل')
    const earliest = allowPreviousPeriod ? await this.earliestStart(em, asOf) : await this.currentPeriodStart(em, asOf)
    if (from < earliest) {
      throw new BadRequestException(allowPreviousPeriod
        ? `الاستثناء لا يبدأ قبل بداية فترة الرواتب السابقة (${earliest})؛ ما قبلها يحتاج تسوية مالية موثقة`
        : 'الاستثناء بأثر رجعي قبل الفترة الحالية يحتاج تسوية مالية موثقة؛ لا يمكن تغيير الفترة السابقة من هنا')
    }
    // اللقطة المعتمدة لا تتغير بقرار لاحق؛ معالجة الماضي تكون بتسوية مستقلة.
    const locked = await em.query(`SELECT TOP (1) r.id FROM dbo.payroll_runs r
      INNER JOIN dbo.payroll_items i ON i.runId=r.id
      WHERE i.employeeId=@0 AND r.status IN ('APPROVED','PAID') AND r.startDate<=@1 AND r.endDate>=@2
        AND ${payrollLineNotReversedSql('r.id', 'i.employeeId')}`,
    [employee.id, to ?? '9999-12-31', from])
    if (locked.length) throw new ConflictException('تتداخل الفترة مع مسير معتمد أو مصروف؛ راجع التسوية المالية أولًا')
  }

  private async noOverlap(em: EntityManager, employeeId: number, from: string, to: string | null, exceptId?: number) {
    const overlaps = (await loadAttendanceExemptions(em, employeeId, from, to ?? '9999-12-31')).filter(row => row.id !== exceptId)
    if (overlaps.length) throw new ConflictException({ code: 'EXEMPT-OVERLAP', message: 'توجد نافذة استثناء معتمدة متداخلة لهذا الموظف', exemptionId: overlaps[0].id })
  }

  // خطة المراجعة ⑨: الطلبات المعلقة المتداخلة كانت تتراكم لأن التداخل يُفحص على المعتمد فقط.
  // الإنشاء يجري تحت قفل الموظف، فلا ينشأ طلبان معلقان متداخلان لنفس الموظف.
  private async noPendingOverlap(em: EntityManager, employeeId: number, from: string, to: string | null) {
    const pending = await em.getRepository(AttendanceExemption).createQueryBuilder('exemption')
      .where('exemption.employeeId = :employeeId', { employeeId })
      .andWhere('exemption.status = :status', { status: 'PENDING' })
      .andWhere('exemption.effectiveFrom <= :to', { to: to ?? '9999-12-31' })
      .andWhere('(exemption.effectiveTo IS NULL OR exemption.effectiveTo >= :from)', { from })
      .orderBy('exemption.id', 'ASC').getOne()
    if (pending) throw new ConflictException({ code: 'EXEMPT-OVERLAP-PENDING',
      message: `يوجد طلب استثناء متداخل بانتظار القرار (#${pending.id}) لهذا الموظف؛ اعتمده أو ارفضه أو ألغه أولًا`, exemptionId: pending.id })
  }

  // قرار المالك 26 سبتمبر: صاحب سلطة الموارد البشرية قراره نهائي — في استثناء موظف غيره. استثناؤه هو لنفسه
  // كموظف يفضل يمشي في مساره بقرار مستخدم آخر.
  private hrFinal(user: JwtPayload, employeeId: number) {
    return hasHrOverride(user) && employeeId !== user.employeeId
  }

  // خطة المراجعة 24 (وبند الصلاحيات 4): فصل المهام داخل القرار نفسه — منشئ الطلب لا يعتمده ولا يرفضه (يلغيه فقط)،
  // ومعتمد خطوة الموارد البشرية لا يتخذ القرار التنفيذي. قرار المالك 26 سبتمبر: القاعدتان مابيسرّوش على صاحب سلطة
  // الموارد البشرية في استثناء غيره (قراره نهائي، وإنشاؤه بيتعتمد لحظتها أصلًا) — وبيسرّوا على الباقي وعلى استثنائه هو لنفسه.
  private separation(user: JwtPayload, row: AttendanceExemption, executiveStage: boolean) {
    const hrFinal = this.hrFinal(user, row.employeeId)
    if (row.createdByUserId === user.sub && !hrFinal) {
      throw new ForbiddenException({ code: 'EXEMPT-SOD-CREATOR', message: 'منشئ طلب الاستثناء لا يعتمده ولا يرفضه؛ القرار لمستخدم آخر، ويستطيع المنشئ إلغاء طلبه' })
    }
    if (executiveStage && row.approvedByUserId === user.sub && !hrFinal) {
      throw new ForbiddenException({ code: 'EXEMPT-SOD-EXECUTIVE', message: 'من اعتمد خطوة الموارد البشرية لا يتخذ القرار التنفيذي لنفس الاستثناء' })
    }
  }

  private today() {
    const now = new Date()
    return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`
  }

  private stateOf(row: AttendanceExemption, today: string) {
    if (row.status === 'PENDING') return row.reasonCode === 'executive' && row.approvedByUserId ? 'PENDING_EXECUTIVE' : 'PENDING_HR'
    if (row.status !== 'APPROVED') return row.status
    if (row.terminatedFrom && (row.terminatedFrom <= today || row.terminatedFrom <= row.effectiveFrom)) return 'ENDED'
    if (row.effectiveTo && row.effectiveTo < today) return 'ENDED'
    return row.effectiveFrom > today ? 'SCHEDULED' : 'ACTIVE'
  }

  // الإجراءات المسموحة لهذا المستخدم على الصف — الشاشة تعرضها كما هي، والخدمة تعيد كل فحص عند التنفيذ.
  private actionsFor(user: JwtPayload, row: AttendanceExemption, today: string) {
    const pending = row.status === 'PENDING'
    const executiveStage = pending && row.reasonCode === 'executive' && !!row.approvedByUserId
    // نفس separation(): منع المنشئ ومعتمد خطوة الموارد البشرية مابيسريش على صاحب سلطة الموارد البشرية في استثناء غيره
    const hrFinal = this.hrFinal(user, row.employeeId)
    const creator = row.createdByUserId === user.sub && !hrFinal
    const hrApprover = executiveStage && row.approvedByUserId === user.sub && !hrFinal
    const decisionPerm = executiveStage ? 'attendance_exemption.approve_executive' : 'attendance_exemption.approve'
    const blockedBy: 'CREATOR' | 'HR_APPROVER' | null = !pending ? null : creator ? 'CREATOR' : hrApprover ? 'HR_APPROVER' : null
    return {
      approve: pending && !executiveStage && !creator && userHasPerm(user, 'attendance_exemption.approve'),
      approveExecutive: executiveStage && !creator && !hrApprover && userHasPerm(user, 'attendance_exemption.approve_executive'),
      reject: pending && !creator && !hrApprover && userHasPerm(user, decisionPerm),
      cancel: pending && userHasPerm(user, 'attendance_exemption.manage'),
      terminate: row.status === 'APPROVED' && !row.terminatedFrom && (!row.effectiveTo || row.effectiveTo >= today) &&
        userHasPerm(user, 'attendance_exemption.approve'),
      blockedBy,
    }
  }

  private async userNames(em: EntityManager, ids: Array<number | null | undefined>) {
    const unique = [...new Set(ids.filter((id): id is number => Number.isInteger(id)))]
    if (!unique.length) return new Map<number, string>()
    const users = await em.getRepository(User).find({ where: { id: In(unique) }, select: { id: true, displayName: true } })
    return new Map(users.map(row => [row.id, row.displayName]))
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
      await this.validateRange(em, employee, dto.effectiveFrom, dto.effectiveTo ?? null, undefined, true)
      await this.noOverlap(em, employee.id, dto.effectiveFrom, dto.effectiveTo ?? null)
      await this.noPendingOverlap(em, employee.id, dto.effectiveFrom, dto.effectiveTo ?? null)
      // أ7: النافذة بلا تجاوز فردي — الإضافي والإجازة بلا أجر للمستثنى يتبعان قرار الشركة الواحد.
      const row: AttendanceExemption = await em.getRepository(AttendanceExemption).save({ ...dto, effectiveTo: dto.effectiveTo ?? null,
        overtimeEligibleOverride: null, unpaidLeaveDeductibleOverride: null,
        reason, status: 'PENDING', createdByUserId: user.sub, requiresCheckinForPresence: dto.requiresCheckinForPresence ?? false })
      await this.record(em, user, row, 'CREATED', reason, null)
      // قرار المالك 26 سبتمبر: صاحب سلطة الموارد البشرية بصلاحية الاعتماد قراره نهائي — الاستثناء اللي بينشئه لموظف غيره
      // بيتعتمد لحظتها باسمه وبسبب الإنشاء نفسه، بنفس أثر approve(): نفس الحقول والحالة وسجل القرار (فحوص الفترة والتداخل
      // اتعملت فوق على نفس اللحظة). التصنيف القيادي بيتعتمد تنفيذيًا كمان لو معاه صلاحية الاعتماد التنفيذي، وإلا بيفضل
      // بانتظار الاعتماد التنفيذي وحده. غيره من المنشئين: الطلب بانتظار قرار مستخدم آخر كما كان
      if (this.hrFinal(user, employee.id) && userHasPerm(user, 'attendance_exemption.approve')) {
        const pending = { ...row }, now = new Date(), executive = row.reasonCode === 'executive'
        row.approvedByUserId = user.sub
        row.approvedAt = now
        if (!executive) row.status = 'APPROVED'
        await em.getRepository(AttendanceExemption).save(row)
        await this.record(em, user, row, 'HR_INSTANT_APPROVED', reason, pending)
        if (executive && userHasPerm(user, 'attendance_exemption.approve_executive')) {
          const hrApproved = { ...row }
          row.executiveApprovedByUserId = user.sub
          row.executiveApprovedAt = now
          row.status = 'APPROVED'
          await em.getRepository(AttendanceExemption).save(row)
          await this.record(em, user, row, 'EXECUTIVE_INSTANT_APPROVED', reason, hrApproved)
        }
      }
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
      this.separation(user, row, executive)
      const reason = await this.reason(em, note)
      // الفترة المرجعية = وقت إنشاء الطلب (⑨): الطلب المعلق لا يسقط ببدء دورة جديدة، والمسير المعتمد يبقى حاجزًا.
      await this.validateRange(em, employee, row.effectiveFrom, row.effectiveTo, row.createdAt, true)
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

  // الرفض قرار موثق على طلب معلق: السجل والأحداث باقية ولا تنشأ نافذة. المنشئ يلغي طلبه بدل رفضه.
  async reject(user: JwtPayload, id: number, note: string) {
    return this.mutate(user, id, async (em, row) => {
      if (row.status !== 'PENDING') throw new BadRequestException('الاستثناء ليس بانتظار القرار')
      const executiveStage = row.reasonCode === 'executive' && !!row.approvedByUserId
      this.permission(user, executiveStage ? 'attendance_exemption.approve_executive' : 'attendance_exemption.approve')
      this.separation(user, row, executiveStage)
      const reason = await this.reason(em, note)
      const before = { ...row }
      row.status = 'REJECTED'
      await em.getRepository(AttendanceExemption).save(row)
      await this.record(em, user, row, executiveStage ? 'EXECUTIVE_REJECTED' : 'REJECTED', reason, before)
      return row
    })
  }

  async terminate(user: JwtPayload, id: number, from: string, note: string) {
    this.permission(user, 'attendance_exemption.approve')
    return this.mutate(user, id, async (em, row, employee) => {
      if (row.status !== 'APPROVED' || row.terminatedFrom) throw new BadRequestException('الاستثناء غير معتمد أو سبق إنهاؤه')
      const reason = await this.reason(em, note)
      this.date(from)
      if (from < row.effectiveFrom) throw new BadRequestException('تاريخ الإنهاء لا يسبق بداية الاستثناء')
      if (row.effectiveTo && from > row.effectiveTo) throw new BadRequestException('تاريخ الإنهاء بعد نهاية الاستثناء؛ النافذة تنتهي وحدها في تاريخ نهايتها')
      await this.validateRange(em, employee, from, row.effectiveTo)
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

  // شاشة استثناء الحضور (خطة المراجعة 24): الطلبات في نطاق فرع المستخدم مع الأسماء والحالة الفعلية
  // والإجراءات المسموحة له على كل صف. قراءة فقط؛ الإجراءات نفسها تعيد كل فحص عند التنفيذ.
  async listScoped(user: JwtPayload, filters: { status?: AttendanceExemptionStatus; employeeId?: number; branchId?: number }) {
    this.permission(user, 'attendance_exemption.view')
    const em = this.windows.manager
    const scope = branchScopeOf(user)
    const limit = 500
    const query = em.getRepository(AttendanceExemption).createQueryBuilder('exemption')
      .innerJoin(Employee, 'employee', 'employee.id = exemption.employeeId')
      .where('1 = 1')
    if (scope !== null) query.andWhere('employee.branchId = :scope', { scope })
    if (filters.branchId) query.andWhere('employee.branchId = :branchId', { branchId: filters.branchId })
    if (filters.employeeId) query.andWhere('exemption.employeeId = :employeeId', { employeeId: filters.employeeId })
    if (filters.status) query.andWhere('exemption.status = :status', { status: filters.status })
    const found = await query.orderBy('exemption.id', 'DESC').limit(limit + 1).getMany()
    const rows = found.slice(0, limit)
    const employeeIds = [...new Set(rows.map(row => row.employeeId))]
    const employees = employeeIds.length ? await em.getRepository(Employee).find({ where: { id: In(employeeIds) },
      select: { id: true, fullName: true, employeeCode: true, branchId: true } }) : []
    const branchIds = [...new Set(employees.map(row => row.branchId).filter((id): id is number => Number.isInteger(id)))]
    const branches = branchIds.length ? await em.getRepository(Branch).find({ where: { id: In(branchIds) }, select: { id: true, name: true } }) : []
    const names = await this.userNames(em, rows.flatMap(row => [row.createdByUserId, row.approvedByUserId, row.executiveApprovedByUserId, row.terminatedByUserId]))
    const employeeById = new Map(employees.map(row => [row.id, row]))
    const branchName = new Map(branches.map(row => [row.id, row.name]))
    const nameOf = (id: number | null) => (id ? names.get(id) ?? null : null)
    const today = this.today()
    return {
      rows: rows.map(row => {
        const employee = employeeById.get(row.employeeId)
        return { ...row,
          employee: employee ? { id: employee.id, fullName: employee.fullName, employeeCode: employee.employeeCode,
            branchId: employee.branchId ?? null, branchName: branchName.get(employee.branchId) ?? null } : null,
          createdByName: nameOf(row.createdByUserId), approvedByName: nameOf(row.approvedByUserId),
          executiveApprovedByName: nameOf(row.executiveApprovedByUserId), terminatedByName: nameOf(row.terminatedByUserId),
          state: this.stateOf(row, today), actions: this.actionsFor(user, row, today) }
      }),
      today,
      currentPeriodStart: await this.currentPeriodStart(em),
      earliestStart: await this.earliestStart(em),
      reasonMinLength: Number(await this.config(em, 'payroll.exemption_reason_min_length', '20')),
      limit,
      truncated: found.length > limit,
    }
  }

  async events(user: JwtPayload, id: number) {
    this.permission(user, 'attendance_exemption.view')
    const row = await this.windows.findOneBy({ id })
    if (!row) throw new NotFoundException('الاستثناء غير موجود')
    await this.employee(user, row.employeeId)
    const events = await this.windows.manager.getRepository(AttendanceExemptionEvent).find({ where: { exemptionId: id }, order: { id: 'ASC' } })
    const names = await this.userNames(this.windows.manager, events.map(event => event.actorUserId))
    return events.map(event => ({ ...event, actorName: names.get(event.actorUserId) ?? null }))
  }
}
