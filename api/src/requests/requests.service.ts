import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  Logger,
  NotFoundException,
} from '@nestjs/common'
import { InjectRepository } from '@nestjs/typeorm'
import { DataSource, In, IsNull, Repository } from 'typeorm'
import type { JwtPayload } from '../auth/auth.service'
import { branchScopeOf } from '../auth/guards'
import { Employee } from '../employees/employee.entity'
import { PermissionType } from '../attendance/attendance.entities'
import { AttendanceService } from '../attendance/attendance.service'
import { ApproverResolver, ResolvedStep } from './approver-resolver.service'
import { DestinationsService } from './destinations.service'
import { LeaveBalancesService } from './leave-balances.service'
import { Leave, LeaveType } from './entities/leave.entities'
import { ApprovalChain } from './entities/approval-chain.entity'
import { ApprovalStep } from './entities/approval-step.entity'
import { RequestApproval } from './entities/request-approval.entity'
import { RequestType } from './entities/request-type.entity'
import { Request, RequestStatus } from './entities/request.entity'
import { Asset, CustodyAssignment } from './entities/custody.entities'
import { Transfer } from './entities/employment.entities'
import { assertTransition } from './state-machine'

export interface ActDto {
  action: 'APPROVE' | 'REJECT' | 'RETURN'
  comment?: string
}

@Injectable()
export class RequestsService {
  private readonly logger = new Logger(RequestsService.name)

  constructor(
    private readonly ds: DataSource,
    private readonly resolver: ApproverResolver,
    private readonly destinations: DestinationsService,
    private readonly leaveBalances: LeaveBalancesService,
    private readonly attendance: AttendanceService,
    @InjectRepository(Request) private readonly requests: Repository<Request>,
    @InjectRepository(RequestType)
    private readonly types: Repository<RequestType>,
    @InjectRepository(ApprovalChain)
    private readonly chains: Repository<ApprovalChain>,
    @InjectRepository(ApprovalStep)
    private readonly steps: Repository<ApprovalStep>,
    @InjectRepository(RequestApproval)
    private readonly approvals: Repository<RequestApproval>,
    @InjectRepository(Employee)
    private readonly employees: Repository<Employee>
  ) {}

  // ===== الكتالوج — مفلتر بجمهور كل نوع (visible_to) =====
  async catalog(user?: JwtPayload) {
    const all = await this.types.find({
      where: { isActive: true },
      order: { category: 'ASC', id: 'ASC' },
    })
    if (!user) return all
    const emp = user.employeeId
      ? await this.employees.findOne({ where: { id: user.employeeId } })
      : null
    return all.filter((t) => this.audienceAllows(t, user, emp))
  }

  // هل النوع متاح للمستخدم ده؟ (الأدمن/HR يشوفون الكل)
  private audienceAllows(
    type: RequestType,
    user: JwtPayload,
    emp: Employee | null
  ): boolean {
    if (
      user.role === 'super_admin' ||
      (user.permissions ?? []).includes('*') ||
      (user.permissions ?? []).includes('request_types.manage')
    ) {
      return true
    }
    if (!type.visibleTo) return true
    try {
      const v = JSON.parse(type.visibleTo) as {
        mode: string
        ids: Array<number | string>
      }
      switch (v.mode) {
        case 'all':
          return true
        case 'departments':
          return !!emp?.departmentId && v.ids.map(Number).includes(emp.departmentId)
        case 'roles':
          return v.ids.map(String).includes(user.role)
        case 'employees':
          return !!user.employeeId && v.ids.map(Number).includes(user.employeeId)
        default:
          return true
      }
    } catch {
      return true
    }
  }

  // ===== الإنشاء — لنفسي أو نيابة عن موظف آخر (بصلاحية) =====
  async create(
    user: JwtPayload,
    dto: {
      typeCode: string
      payload?: Record<string, any>
      submit?: boolean
      onBehalfEmployeeId?: number
    }
  ) {
    const type = await this.types.findOne({
      where: { code: dto.typeCode, isActive: true },
    })
    if (!type) throw new NotFoundException('نوع الطلب غير موجود')

    // نيابة عن الغير: صلاحية requests.create_on_behalf إجبارية
    let requesterId = user.employeeId
    if (
      dto.onBehalfEmployeeId &&
      dto.onBehalfEmployeeId !== user.employeeId
    ) {
      const canOnBehalf =
        user.role === 'super_admin' ||
        (user.permissions ?? []).includes('*') ||
        (user.permissions ?? []).includes('requests.create_on_behalf')
      if (!canOnBehalf) {
        throw new ForbiddenException('لا تملك صلاحية التقديم نيابة عن الغير')
      }
      const target = await this.employees.findOne({
        where: { id: dto.onBehalfEmployeeId },
      })
      if (!target) throw new BadRequestException('الموظف المستهدف غير موجود')
      requesterId = target.id
    }
    if (!requesterId) {
      throw new BadRequestException('الحساب غير مربوط بموظف')
    }
    // من هنا: كل المنطق باسم الطالب الفعلي
    user = { ...user, employeeId: requesterId }

    // جمهور النوع: مين يقدر يقدّمه (§2.2)
    const requester = await this.employees.findOne({
      where: { id: requesterId },
    })
    if (!this.audienceAllows(type, user, requester)) {
      throw new ForbiddenException('هذا النوع من الطلبات غير متاح لك')
    }

    // التحقق من الحقول: القديمة (أسماء) + المخصّصة (كاملة الوصف)
    const required: string[] = type.requiredFields
      ? JSON.parse(type.requiredFields)
      : []
    try {
      const custom: Array<{ key: string; label: string; required: boolean; type: string; options?: string[] }> =
        type.customFields ? JSON.parse(type.customFields) : []
      const payload0 = dto.payload ?? {}
      for (const f of custom) {
        if (f.required && !required.includes(f.key)) required.push(f.key)
        // قائمة اختيار: القيمة لازم من الخيارات
        if (
          f.type === 'select' &&
          payload0[f.key] !== undefined &&
          payload0[f.key] !== '' &&
          Array.isArray(f.options) &&
          !f.options.includes(String(payload0[f.key]))
        ) {
          throw new BadRequestException(
            `قيمة «${f.label}» خارج الخيارات المسموحة`
          )
        }
        if (
          f.type === 'number' &&
          payload0[f.key] !== undefined &&
          payload0[f.key] !== '' &&
          Number.isNaN(Number(payload0[f.key]))
        ) {
          throw new BadRequestException(`«${f.label}» لازم يكون رقماً`)
        }
      }
    } catch (e) {
      if (e instanceof BadRequestException) throw e
      /* customFields تالف — تجاهل */
    }
    const payload = dto.payload ?? {}
    const missing = required.filter(
      (f) => payload[f] === undefined || payload[f] === null || payload[f] === ''
    )
    if (dto.submit && missing.length > 0) {
      throw new BadRequestException(`حقول ناقصة: ${missing.join('، ')}`)
    }

    const emp = requester

    let req = this.requests.create({
      typeCode: type.code,
      requesterId,
      createdByUserId: user.sub,
      branchId: emp?.branchId ?? user.branchId ?? undefined,
      status: 'DRAFT' as RequestStatus,
      payload: JSON.stringify(payload),
    })
    req = await this.requests.save(req)

    if (dto.submit) {
      return this.submit(user, req.id)
    }
    return req
  }

  // ===== التقديم: حل السلسلة + الشروط + SLA =====
  async submit(user: JwtPayload, id: number) {
    const req = await this.owned(user, id)
    assertTransition(req.status, 'SUBMITTED')

    const type = await this.types.findOne({ where: { code: req.typeCode } })
    if (!type) throw new NotFoundException('نوع الطلب غير موجود')

    // §2.9: النقل ممنوع وعلى الموظف عهدة مفتوحة — تسليم قبل النقل
    if (type.code === 'TEAM_TRANSFER') {
      const openCustody = await this.ds.getRepository(CustodyAssignment).count({
        where: {
          employeeId: req.requesterId,
          status: In(['PENDING_ACK', 'PENDING_MANAGER_CONFIRM', 'ACTIVE', 'RETURN_REQUESTED']),
        },
      })
      if (openCustody > 0) {
        throw new BadRequestException(
          `على الموظف ${openCustody} عهدة مفتوحة — يجب إرجاعها أو نقلها قبل النقل`
        )
      }
    }

    // طلب العهدة: الأصول المختارة لازم تكون متاحة في الكتالوج
    if (type.code === 'CUSTODY_REQUEST') {
      const p = req.payload ? JSON.parse(req.payload) : {}
      const ids: number[] = Array.isArray(p.assetIds)
        ? p.assetIds.map(Number).filter(Boolean)
        : []
      if (ids.length === 0) {
        throw new BadRequestException('اختر أصلاً واحداً على الأقل من الأصول المتاحة')
      }
      for (const assetId of ids) {
        const asset = await this.ds
          .getRepository(Asset)
          .findOne({ where: { id: assetId } })
        if (!asset || asset.status !== 'AVAILABLE' || asset.currentHolderId) {
          throw new BadRequestException(
            `الأصل «${asset?.name ?? '#' + assetId}» غير متاح — اختر من المتاح فقط`
          )
        }
      }
    }

    // الإذن: تحقق نوعه وأقصى مدته قبل دخول الدورة
    if (type.code === 'PERMISSION') {
      const p = req.payload ? JSON.parse(req.payload) : {}
      if (p.permissionType) {
        const pt = await this.ds
          .getRepository(PermissionType)
          .findOne({ where: { nameAr: String(p.permissionType) } })
        if (!pt || !pt.isActive) {
          throw new BadRequestException('نوع الإذن غير معروف أو معطل')
        }
        if (pt.maxDurationMinutes && p.from && p.to) {
          const [fh, fm] = String(p.from).split(':').map(Number)
          const [th, tm] = String(p.to).split(':').map(Number)
          const dur = th * 60 + tm - (fh * 60 + fm)
          if (dur > pt.maxDurationMinutes) {
            throw new BadRequestException(
              `مدة الإذن ${dur} دقيقة تتجاوز الحد الأقصى لنوع «${pt.nameAr}» (${pt.maxDurationMinutes} دقيقة)`
            )
          }
        }
      }
    }

    // نصف اليوم: لازم يكون يوماً واحداً
    if (type.category === 'leaves') {
      const p = req.payload ? JSON.parse(req.payload) : {}
      if (
        ['MORNING', 'EVENING'].includes(String(p.period)) &&
        p.fromDate !== p.toDate
      ) {
        throw new BadRequestException(
          'إجازة نصف اليوم تكون ليوم واحد فقط (تاريخ البداية = النهاية)'
        )
      }

      // المخصوم من الرصيد = أيام العمل الفعلية فقط —
      // الويك إند والعطلات الرسمية داخل المدى لا تُحسب ولا تُخصم
      if (p.fromDate && p.toDate && p.fromDate <= p.toDate) {
        const emp = await this.employees.findOne({
          where: { id: req.requesterId },
        })
        const { working, skipped } = await this.attendance.workingDaysBetween(
          emp?.branchId ?? 1,
          String(p.fromDate),
          String(p.toDate)
        )
        if (working === 0) {
          throw new BadRequestException(
            'كل الأيام المختارة عطلات (ويك إند/عطلة رسمية) — لا حاجة لطلب إجازة'
          )
        }
        const isHalf = ['MORNING', 'EVENING'].includes(String(p.period))
        const effectiveDays = isHalf ? 0.5 : working
        if (Number(p.days) !== effectiveDays) {
          p.days = effectiveDays
          p.skippedHolidays = skipped
          req.payload = JSON.stringify(p)
        }
      }
    }

    // الإجازات التي تمس الرصيد: تحقق الكفاية بالطبقات قبل دخول الدورة
    if (type.affectsBalance && type.category === 'leaves') {
      const payload = req.payload ? JSON.parse(req.payload) : {}
      const days = Number(payload.days)
      if (days > 0) {
        const ltCode = String(
          payload.leaveType ?? type.code.replace('LEAVE_', '')
        )
        const lt = await this.ds
          .getRepository(LeaveType)
          .findOne({ where: { code: ltCode } })
        const balanceType = lt?.balanceSource ?? 'annual'
        if (balanceType !== 'none') {
          await this.leaveBalances.assertSufficient(
            req.requesterId,
            balanceType,
            days,
            String(payload.fromDate ?? new Date().toISOString().slice(0, 10))
          )
        }
      }
    }

    const resolved = await this.resolveChain(type, req)
    req.resolvedSteps = JSON.stringify(resolved)
    req.submittedAt = new Date()

    if (resolved.length === 0) {
      // أوتوماتيك — بلا موافقات: اعتماد وتنفيذ فوري
      req.status = 'APPROVED'
      await this.requests.save(req)
      return this.executeDestination(req.id)
    }

    req.status = 'UNDER_REVIEW'
    req.currentStep = resolved[0].stepOrder
    return this.requests.save(req)
  }

  // حل السلسلة: دورة الفرع لو موجودة وإلا العامة + تفعيل الخطوات الشرطية فقط
  private async resolveChain(
    type: RequestType,
    req: Request
  ): Promise<ResolvedStep[]> {
    if (!type.approvalChainId) return []
    const globalChain = await this.chains.findOne({
      where: { id: type.approvalChainId },
    })
    if (!globalChain) return []

    // دورة خاصة بالفرع بنفس الكود تتقدم على العامة (فرع المعادي ≠ الرياض)
    let chain = globalChain
    if (req.branchId) {
      const branchChain = await this.chains.findOne({
        where: {
          code: globalChain.code,
          branchId: req.branchId,
          isActive: true,
        },
      })
      if (branchChain) chain = branchChain
    }

    const steps = await this.steps.find({
      where: { chainId: chain.id },
      order: { stepOrder: 'ASC' },
    })
    const payload = req.payload ? JSON.parse(req.payload) : {}
    const active = steps.filter((s) => this.thresholdMet(s, payload))

    const resolved: ResolvedStep[] = []
    for (const s of active) {
      const approverEmployeeId = await this.resolver.resolveApproverEmployee(
        s.approverRole,
        req.requesterId,
        payload,
        s.specificEmployeeId
      )
      // السرّي يتخطى المدير المباشر (الشكاوى/البلاغات)
      if (
        type.isConfidential &&
        s.approverRole === 'direct_manager_of_requester'
      ) {
        continue
      }
      const dueAt = s.slaDays
        ? new Date(Date.now() + s.slaDays * 86400000).toISOString()
        : null
      resolved.push({
        stepOrder: s.stepOrder,
        role: s.approverRole,
        approverEmployeeId,
        slaDays: s.slaDays ?? null,
        escalateTo: s.escalateTo ?? null,
        dueAt,
        actedAt: null,
        action: null,
      })
    }
    return resolved
  }

  // الخطوة الشرطية: تُفعَّل فقط عند تحقق الشرط (loan >= 5000 → مالية)
  private thresholdMet(step: ApprovalStep, payload: Record<string, any>) {
    if (!step.thresholdField || !step.thresholdOp) return true
    const value = Number(payload[step.thresholdField])
    const threshold = Number(step.thresholdValue)
    if (Number.isNaN(value)) return false
    switch (step.thresholdOp) {
      case '>=':
        return value >= threshold
      case '>':
        return value > threshold
      case '<':
        return value < threshold
      case '<=':
        return value <= threshold
      default:
        return true
    }
  }

  // ===== فعل الموافقة (اعتماد/رفض/إرجاع) =====
  // الخطوات بنفس stepOrder = مجموعة متوازية: كلهم لازم يعتمدوا للتقدم،
  // وأي رفض يرفض الطلب كله
  async act(user: JwtPayload, id: number, dto: ActDto) {
    const req = await this.scoped(user, id)
    if (req.status !== 'UNDER_REVIEW') {
      throw new BadRequestException('الطلب ليس قيد المراجعة')
    }
    const resolved: ResolvedStep[] = JSON.parse(req.resolvedSteps ?? '[]')
    const group = resolved.filter((s) => s.stepOrder === req.currentStep)
    if (group.length === 0) throw new BadRequestException('لا توجد خطوة حالية')

    // عضو المجموعة الذي لم يتصرف بعد ويطابق المستخدم
    const mine = group.find(
      (s) => !s.actedAt && this.resolver.satisfies(user, s)
    )
    if (!mine) {
      throw new ForbiddenException(
        group.every((s) => s.actedAt)
          ? 'كل أعضاء هذه الخطوة تصرفوا بالفعل'
          : 'لا تملك صلاحية التصرف في هذه الخطوة'
      )
    }

    // سجل التدقيق غير القابل للتعديل — قبل أي تغيير حالة
    await this.approvals.save({
      requestId: req.id,
      step: mine.stepOrder,
      approverId: user.sub,
      action:
        dto.action === 'APPROVE'
          ? 'APPROVED'
          : dto.action === 'REJECT'
            ? 'REJECTED'
            : 'RETURNED_FOR_INFO',
      comment: dto.comment,
    })

    mine.actedAt = new Date().toISOString()
    mine.action = dto.action

    if (dto.action === 'REJECT') {
      assertTransition(req.status, 'REJECTED')
      req.status = 'REJECTED'
      req.resolvedSteps = JSON.stringify(resolved)
      req.completedAt = new Date()
      return this.requests.save(req)
    }

    if (dto.action === 'RETURN') {
      assertTransition(req.status, 'RETURNED_FOR_INFO')
      req.status = 'RETURNED_FOR_INFO'
      req.resolvedSteps = JSON.stringify(resolved)
      return this.requests.save(req)
    }

    // APPROVE: باقي موازيين في نفس المجموعة؟ ننتظرهم
    const stillPending = group.filter((s) => !s.actedAt)
    if (stillPending.length > 0) {
      req.resolvedSteps = JSON.stringify(resolved)
      return this.requests.save(req)
    }

    // المجموعة اكتملت → المجموعة التالية أو التنفيذ
    const orders = [...new Set(resolved.map((s) => s.stepOrder))].sort(
      (a, b) => a - b
    )
    const nextOrder = orders[orders.indexOf(req.currentStep!) + 1]
    if (nextOrder !== undefined) {
      req.currentStep = nextOrder
      req.resolvedSteps = JSON.stringify(resolved)
      return this.requests.save(req)
    }

    assertTransition(req.status, 'APPROVED')
    req.status = 'APPROVED'
    req.currentStep = null as unknown as number
    req.resolvedSteps = JSON.stringify(resolved)
    await this.requests.save(req)
    return this.executeDestination(req.id)
  }

  // ===== تنفيذ الوجهة داخل معاملة — الكتابة في السجل الدائم =====
  private async executeDestination(requestId: number) {
    const saved = await this.ds.transaction(async (em) => {
      const req = await em.getRepository(Request).findOne({
        where: { id: requestId },
      })
      if (!req) throw new NotFoundException()
      const type = await em.getRepository(RequestType).findOne({
        where: { code: req.typeCode },
      })
      if (!type) throw new NotFoundException()

      const result = await this.destinations.execute(em, req, type)
      req.destinationRef = result.ref
      if (result.completed) {
        req.status = 'COMPLETED'
        req.completedAt = new Date()
      } else {
        req.status = 'IN_EXECUTION'
      }
      return em.getRepository(Request).save(req)
    })

    // بعد الالتزام: إجازة/إذن معتمد يعيد حساب أيام الحضور المتأثرة فوراً
    // (خارج المعاملة — عشان الحساب يشوف السجل الجديد)
    try {
      const payload = saved.payload ? JSON.parse(saved.payload) : {}
      const isLeave = saved.typeCode.startsWith('LEAVE_')
      const isPermission = saved.typeCode === 'PERMISSION'
      // إلغاء إجازة (payload.leaveId): مدى الإجازة الأصلية هو المتأثر
      let fromDate: string | undefined = payload.fromDate
      let toDate: string | undefined = payload.toDate
      if (isLeave && !fromDate && payload.leaveId) {
        const original = await this.ds
          .getRepository(Leave)
          .findOne({ where: { id: Number(payload.leaveId) } })
        if (original) {
          fromDate = original.fromDate
          toDate = original.toDate
        }
      }
      if (isLeave && fromDate && toDate) {
        const from = new Date(`${fromDate}T12:00:00`)
        const to = new Date(`${toDate}T12:00:00`)
        for (
          let d = new Date(from), i = 0;
          d <= to && i < 62;
          d.setDate(d.getDate() + 1), i++
        ) {
          const ds = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
          await this.attendance.computeDay(saved.requesterId, ds)
        }
      } else if (isPermission && payload.date) {
        await this.attendance.computeDay(saved.requesterId, String(payload.date))
      }
    } catch {
      /* إعادة الحساب best-effort — اليوم يتصحح مع أي بصمة/recompute */
    }
    return saved
  }

  // ===== إعادة التقديم بعد الإرجاع لاستكمال معلومات =====
  async resubmit(
    user: JwtPayload,
    id: number,
    payload?: Record<string, any>
  ) {
    const req = await this.owned(user, id)
    assertTransition(req.status, 'SUBMITTED')
    if (req.status !== 'RETURNED_FOR_INFO') {
      throw new BadRequestException('الطلب ليس مُرجَعاً لاستكمال معلومات')
    }
    if (payload) {
      const merged = {
        ...(req.payload ? JSON.parse(req.payload) : {}),
        ...payload,
      }
      req.payload = JSON.stringify(merged)
    }
    req.status = 'DRAFT'
    await this.requests.save(req)
    return this.submit(user, id)
  }

  // ===== الإلغاء (صاحب الطلب قبل البت فيه) =====
  async cancel(user: JwtPayload, id: number) {
    const req = await this.owned(user, id)
    assertTransition(req.status, 'CANCELLED')
    req.status = 'CANCELLED'
    req.completedAt = new Date()
    return this.requests.save(req)
  }

  // ===== تأكيد استلام العهدة (الموظف) → بانتظار اعتماد المدير المباشر =====
  async acknowledgeCustody(user: JwtPayload, assignmentId: number) {
    const row = await this.ds.getRepository(CustodyAssignment).findOne({
      where: { id: assignmentId },
    })
    if (!row) throw new NotFoundException('إسناد العهدة غير موجود')
    if (row.employeeId !== user.employeeId) {
      throw new ForbiddenException('العهدة ليست باسمك')
    }
    if (row.status !== 'PENDING_ACK') {
      throw new BadRequestException('العهدة ليست بانتظار التأكيد')
    }
    row.status = 'PENDING_MANAGER_CONFIRM'
    row.acknowledgedAt = new Date()
    return this.ds.getRepository(CustodyAssignment).save(row)
  }

  // ===== الموظف يعلّم «سلّمت العهدة» → بانتظار تأكيد مسؤول العهد =====
  async requestCustodyHandover(user: JwtPayload, assignmentId: number) {
    const row = await this.ds.getRepository(CustodyAssignment).findOne({
      where: { id: assignmentId },
    })
    if (!row) throw new NotFoundException('إسناد العهدة غير موجود')
    if (row.employeeId !== user.employeeId) {
      throw new ForbiddenException('العهدة ليست باسمك')
    }
    if (!['ACTIVE', 'PENDING_MANAGER_CONFIRM', 'PENDING_ACK'].includes(row.status)) {
      throw new BadRequestException('العهدة ليست بحوزتك حالياً')
    }
    row.status = 'RETURN_REQUESTED'
    return this.ds.getRepository(CustodyAssignment).save(row)
  }

  // ===== اعتماد المدير المباشر → ACTIVE (الملزِم قانونياً) =====
  async managerConfirmCustody(user: JwtPayload, assignmentId: number) {
    const row = await this.ds.getRepository(CustodyAssignment).findOne({
      where: { id: assignmentId },
    })
    if (!row) throw new NotFoundException('إسناد العهدة غير موجود')
    if (row.status !== 'PENDING_MANAGER_CONFIRM') {
      throw new BadRequestException('العهدة ليست بانتظار اعتماد المدير')
    }
    // المدير المباشر لصاحب العهدة، أو صاحب صلاحية العهدة، أو super_admin
    const directManager = await this.resolver.directManagerOf(row.employeeId)
    const isManager = user.employeeId === directManager
    const hasPerm =
      user.role === 'super_admin' ||
      (user.permissions ?? []).includes('*') ||
      (user.permissions ?? []).includes('custody.assign')
    if (!isManager && !hasPerm) {
      throw new ForbiddenException('اعتماد العهدة للمدير المباشر أو مسؤول العهدة')
    }
    row.status = 'ACTIVE'
    row.managerConfirmAt = new Date()
    await this.ds.getRepository(CustodyAssignment).save(row)
    // الأصل يتعلّم «مُسنَد» في المخزون
    await this.ds
      .getRepository('assets')
      .update(
        { id: row.assetId },
        { currentHolderId: row.employeeId, status: 'ASSIGNED' }
      )

    if (row.requestId) {
      // الطلب يكتمل فقط لما كل أصوله تتسلّم فعلياً (لا إسنادات معلّقة شقيقة)
      const stillPending = await this.ds
        .getRepository(CustodyAssignment)
        .count({
          where: {
            requestId: row.requestId,
            status: In(['PENDING_ACK', 'PENDING_MANAGER_CONFIRM']),
          },
        })
      if (stillPending === 0) {
        const req = await this.requests.findOne({
          where: { id: row.requestId },
        })
        if (req && req.status === 'IN_EXECUTION') {
          req.status = 'COMPLETED'
          req.completedAt = new Date()
          await this.requests.save(req)
        }
      }
    }
    return row
  }

  // ===== السجل الكامل (كونسول HR) — بنطاق الفرع مع فلاتر =====
  async listAll(
    user: JwtPayload,
    filters: { status?: string; typeCode?: string } = {}
  ) {
    const scope = branchScopeOf(user)
    const where: Record<string, unknown> = {}
    if (scope !== null) where.branchId = scope
    if (filters.status) where.status = filters.status
    if (filters.typeCode) where.typeCode = filters.typeCode
    return this.requests.find({
      where: where as any,
      order: { createdAt: 'DESC' },
      take: 500,
    })
  }

  // إجازاتي المعتمدة (خدمة ذاتية) — لمنتقي «إلغاء/تعديل إجازة»
  async myApprovedLeaves(user: JwtPayload) {
    if (!user.employeeId) return []
    return this.ds.getRepository(Leave).find({
      where: { employeeId: user.employeeId, status: 'APPROVED' },
      order: { fromDate: 'DESC' },
      take: 50,
    })
  }

  // ===== طلباتي =====
  async mine(user: JwtPayload) {
    if (!user.employeeId) return []
    return this.requests.find({
      where: { requesterId: user.employeeId },
      order: { createdAt: 'DESC' },
      take: 200,
    })
  }

  // ===== صندوق الموافقات: الطلبات المنتظرة فعلي =====
  async inbox(user: JwtPayload) {
    const scope = branchScopeOf(user)
    const where: Record<string, unknown> = { status: 'UNDER_REVIEW' }
    if (scope !== null) where.branchId = scope
    const candidates = await this.requests.find({
      where: where as any,
      order: { submittedAt: 'ASC' },
      take: 500,
    })
    return candidates.filter((req) => {
      const resolved: ResolvedStep[] = JSON.parse(req.resolvedSteps ?? '[]')
      // المجموعة الحالية: أي عضو لم يتصرف ويطابق المستخدم
      return resolved.some(
        (s) =>
          s.stepOrder === req.currentStep &&
          !s.actedAt &&
          this.resolver.satisfies(user, s)
      )
    })
  }

  // ===== تفاصيل طلب + سجل الموافقات =====
  async detail(user: JwtPayload, id: number) {
    const req = await this.scoped(user, id)
    const approvals = await this.approvals.find({
      where: { requestId: req.id },
      order: { actedAt: 'ASC' },
    })
    return { ...req, approvals }
  }

  // ===== محرك التصعيد: خطوة تجاوزت SLA تتصعّد للدور المحدد =====
  async runEscalations() {
    const overdue = await this.requests.find({
      where: { status: 'UNDER_REVIEW' },
    })
    const now = new Date().toISOString()
    let escalated = 0
    for (const req of overdue) {
      const resolved: ResolvedStep[] = JSON.parse(req.resolvedSteps ?? '[]')
      // مع المجموعات المتوازية: نصعّد أول عضو متأخر لم يتصرف
      const current = resolved.find(
        (s) => s.stepOrder === req.currentStep && !s.actedAt
      )
      if (!current?.dueAt || current.dueAt > now) continue
      if (!current.escalateTo) continue
      // التصعيد: الدور يتغير + سجل تدقيق + SLA جديد بنفس المدة
      await this.approvals.save({
        requestId: req.id,
        step: current.stepOrder,
        approverId: 0, // النظام
        action: 'ESCALATED',
        comment: `تجاوز SLA — تصعيد من ${current.role} إلى ${current.escalateTo}`,
      })
      current.role = current.escalateTo as ResolvedStep['role']
      current.escalateTo = null
      current.dueAt = current.slaDays
        ? new Date(Date.now() + current.slaDays * 86400000).toISOString()
        : null
      req.resolvedSteps = JSON.stringify(resolved)
      await this.requests.save(req)
      escalated++
    }
    return { escalated }
  }

  // ===== تنفيذ النقل المجدول بتاريخ السريان (يومي) =====
  async runScheduledTransfers() {
    const today = new Date().toISOString().slice(0, 10)
    const due = await this.ds.getRepository(Transfer).find({
      where: { status: 'SCHEDULED' },
    })
    let executed = 0
    for (const t of due) {
      if (t.effectiveDate > today) continue
      await this.ds.transaction(async (em) => {
        await this.destinations.executeTransfer(em, t.id)
        if (t.requestId) {
          const req = await em.getRepository(Request).findOne({
            where: { id: t.requestId },
          })
          if (req && req.status === 'IN_EXECUTION') {
            req.status = 'COMPLETED'
            req.completedAt = new Date()
            await em.getRepository(Request).save(req)
          }
        }
      })
      executed++
    }
    return { executed }
  }

  // ===== أدوات وصول =====

  // طلب يملكه المستخدم: صاحبه أو منشئه (نيابة عن الغير) أو الأدمن
  private async owned(user: JwtPayload, id: number): Promise<Request> {
    const req = await this.requests.findOne({ where: { id } })
    if (!req) throw new NotFoundException('الطلب غير موجود')
    const isOwner = req.requesterId === user.employeeId
    const isCreator = req.createdByUserId === user.sub
    if (!isOwner && !isCreator && user.role !== 'super_admin') {
      throw new ForbiddenException('الطلب ليس لك')
    }
    return req
  }

  // طلب داخل نطاق فرع المستخدم
  private async scoped(user: JwtPayload, id: number): Promise<Request> {
    const req = await this.requests.findOne({ where: { id } })
    if (!req) throw new NotFoundException('الطلب غير موجود')
    const scope = branchScopeOf(user)
    const isOwner = req.requesterId === user.employeeId
    if (scope !== null && req.branchId !== scope && !isOwner) {
      throw new ForbiddenException('خارج نطاق فرعك')
    }
    return req
  }
}
