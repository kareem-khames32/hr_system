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
import { ApproverResolver, ResolvedStep } from './approver-resolver.service'
import { DestinationsService } from './destinations.service'
import { LeaveBalancesService } from './leave-balances.service'
import { LeaveType } from './entities/leave.entities'
import { ApprovalChain } from './entities/approval-chain.entity'
import { ApprovalStep } from './entities/approval-step.entity'
import { RequestApproval } from './entities/request-approval.entity'
import { RequestType } from './entities/request-type.entity'
import { Request, RequestStatus } from './entities/request.entity'
import { CustodyAssignment } from './entities/custody.entities'
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

  // ===== الكتالوج =====
  catalog() {
    return this.types.find({
      where: { isActive: true },
      order: { category: 'ASC', id: 'ASC' },
    })
  }

  // ===== الإنشاء =====
  async create(
    user: JwtPayload,
    dto: { typeCode: string; payload?: Record<string, any>; submit?: boolean }
  ) {
    const type = await this.types.findOne({
      where: { code: dto.typeCode, isActive: true },
    })
    if (!type) throw new NotFoundException('نوع الطلب غير موجود')
    if (!user.employeeId) {
      throw new BadRequestException('الحساب غير مربوط بموظف')
    }

    // التحقق من الحقول المطلوبة المعرّفة على النوع
    const required: string[] = type.requiredFields
      ? JSON.parse(type.requiredFields)
      : []
    const payload = dto.payload ?? {}
    const missing = required.filter(
      (f) => payload[f] === undefined || payload[f] === null || payload[f] === ''
    )
    if (dto.submit && missing.length > 0) {
      throw new BadRequestException(`حقول ناقصة: ${missing.join('، ')}`)
    }

    const emp = await this.employees.findOne({
      where: { id: user.employeeId },
    })

    let req = this.requests.create({
      typeCode: type.code,
      requesterId: user.employeeId,
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
  async act(user: JwtPayload, id: number, dto: ActDto) {
    const req = await this.scoped(user, id)
    if (req.status !== 'UNDER_REVIEW') {
      throw new BadRequestException('الطلب ليس قيد المراجعة')
    }
    const resolved: ResolvedStep[] = JSON.parse(req.resolvedSteps ?? '[]')
    const current = resolved.find((s) => s.stepOrder === req.currentStep)
    if (!current) throw new BadRequestException('لا توجد خطوة حالية')

    if (!this.resolver.satisfies(user, current)) {
      throw new ForbiddenException('لا تملك صلاحية التصرف في هذه الخطوة')
    }

    // سجل التدقيق غير القابل للتعديل — قبل أي تغيير حالة
    await this.approvals.save({
      requestId: req.id,
      step: current.stepOrder,
      approverId: user.sub,
      action:
        dto.action === 'APPROVE'
          ? 'APPROVED'
          : dto.action === 'REJECT'
            ? 'REJECTED'
            : 'RETURNED_FOR_INFO',
      comment: dto.comment,
    })

    current.actedAt = new Date().toISOString()
    current.action = dto.action

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

    // APPROVE: الخطوة التالية أو التنفيذ
    const idx = resolved.findIndex((s) => s.stepOrder === current.stepOrder)
    const next = resolved[idx + 1]
    if (next) {
      req.currentStep = next.stepOrder
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
    return this.ds.transaction(async (em) => {
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

  // ===== تأكيد استلام العهدة — يُكمل الطلب المعلّق =====
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
    row.status = 'ACTIVE'
    row.acknowledgedAt = new Date()
    await this.ds.getRepository(CustodyAssignment).save(row)
    await this.ds
      .getRepository('assets')
      .update({ id: row.assetId }, { currentHolderId: row.employeeId })

    if (row.requestId) {
      const req = await this.requests.findOne({
        where: { id: row.requestId },
      })
      if (req && req.status === 'IN_EXECUTION') {
        req.status = 'COMPLETED'
        req.completedAt = new Date()
        await this.requests.save(req)
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
      const current = resolved.find((s) => s.stepOrder === req.currentStep)
      return current ? this.resolver.satisfies(user, current) : false
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
      const current = resolved.find((s) => s.stepOrder === req.currentStep)
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

  // طلب يملكه المستخدم (مقدّمه)
  private async owned(user: JwtPayload, id: number): Promise<Request> {
    const req = await this.requests.findOne({ where: { id } })
    if (!req) throw new NotFoundException('الطلب غير موجود')
    if (req.requesterId !== user.employeeId && user.role !== 'super_admin') {
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
