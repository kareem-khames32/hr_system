import { assertExemptionOvertimeAllowed } from '../attendance/attendance-exemption-overtime'
import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  HttpException,
  Injectable,
  Logger,
  NotFoundException,
} from '@nestjs/common'
import { Cron } from '@nestjs/schedule'
import { LetterTemplatesService } from '../letters/letter-templates.service'
import { InjectRepository } from '@nestjs/typeorm'
import {
  DataSource,
  EntityManager,
  In,
  IsNull,
  LessThanOrEqual,
  MoreThanOrEqual,
  Not,
  QueryFailedError,
  Repository,
} from 'typeorm'
import type { JwtPayload } from '../auth/auth.service'
import { branchScopeOf, userHasPerm } from '../auth/guards'
import { Employee } from '../employees/employee.entity'
import { StoredFile } from '../files/stored-file.entity'
import { PermissionType } from '../attendance/attendance.entities'
import {
  AttendanceService,
  localDateOf,
  MAX_RANGE_DAYS,
} from '../attendance/attendance.service'
import { OvertimeEntry } from './entities/attendance.entities'
import { ApproverResolver, ResolvedStep } from './approver-resolver.service'
import {
  assertBankName,
  assertIban,
  assertJobTitle,
  DestinationsService,
  RECORD_UPDATE_FIELDS,
} from './destinations.service'
import { LeaveBalancesService } from './leave-balances.service'
import { Leave, LeaveType } from './entities/leave.entities'
import { ApprovalChain } from './entities/approval-chain.entity'
import { ApprovalStep } from './entities/approval-step.entity'
import { ApprovalAction, RequestApproval } from './entities/request-approval.entity'
import { normalizeApprovalAction } from './approval-actions'
import { RequestType } from './entities/request-type.entity'
import { Request, RequestStatus } from './entities/request.entity'
import { Asset, CustodyAssignment } from './entities/custody.entities'
import { Transfer } from './entities/employment.entities'
import { assertTransition } from './state-machine'
import {
  assertEmployeeId, assertEmploymentValues, EMPLOYMENT_PAYLOAD_KEYS, employmentEffectiveDate,
  SCHEDULED_EMPLOYMENT_HANDLERS, validateEmploymentRequest,
} from './employment-destinations'
import { custodyTransferTarget, finishCustodyRequest, startCustodyTransfer } from './custody-execution'
import { definitionCodeOf, groupLeaveProfiles, isLeaveDefinition, isLeaveRequest, legacyLeaveCode, leaveCodeOf, normalizedLeavePayload } from '../common/leave-contract'
import { isValidYmd } from '../offboarding/eos'
import { lockPayrollEmployees } from '../payroll/payroll-settlement-boundary'
import { buildOvertimeApprovalSnapshot } from '../payroll/overtime-financial'
import { appendOvertimeEvent, assertOvertimeSubmission, claimOvertimeDay, releaseOvertimeDayClaim } from './overtime-day-claims'
import { OvertimeEntryEvent } from './entities/overtime-workflow.entities'
import { getLoanInstallmentDeferralEvidence } from '../payroll/payroll-installment-ledger'
import { assertLoanDeferralClientPayload, assertLoanReferenceId, LOAN_DEFERRAL_FIELDS, LOAN_DEFERRAL_HANDLER, LOAN_DEFERRAL_TYPE,
  LoanDeferralPayload, loanAmountThresholdMet, loanScheduleAmounts, readStoredLoanDeferralPayload, stageLoanDeferralPayload } from './loan-installment-requests'
import { assertSalaryChangeClientPayload, assertSalaryRequestUnexecuted, isSalaryChangeType, readStoredSalaryChangePayload, SALARY_CHANGE_CLIENT_FIELDS, SALARY_CHANGE_HANDLER,
  salaryIncreaseThresholdMet, stageSalaryChangeRequest } from './salary-change-requests'

export interface ActDto {
  action: 'APPROVE' | 'REJECT' | 'RETURN'
  comment?: string
  approvedMinutes?: number
  reductionReason?: string
}

// ===== القائمة البيضاء لحمولة كل نوع (SEC-REQ-2) =====
// المسموح = حقول تعريف النوع (المطلوبة + المخصّصة) + المفاتيح العامة + ما تضيفه
// الشاشات/المحرك لأنواع بعينها + كل مدخلات معالجَي «تحديث البيانات» والبنك
// (HANDLER_PAYLOAD_KEYS). مدخلات المعالجات الأخرى الاختيارية — rate/employeeId/
// newStatus/type، وeffectiveDate للترقية والدفتر، وcondition للإرجاع، وin/out
// القديمة للبصمة — لا تُقبل إلا إن عُرّفت حقلاً في «أنواع الطلبات»، عمداً: فلا
// يغيّر مفتاح يقرؤه المعالج التنفيذَ خفيةً عن المعتمد. أي مفتاح غيرها يُرفض عند التقديم
const COMMON_PAYLOAD_KEYS = ['note', 'reason', 'attachmentUrl']
const CATEGORY_PAYLOAD_KEYS: Record<string, string[]> = {
  // نوع الإجازة + نطاق اليوم + العطلات المستبعدة (يكتبها التقديم) + رقم التواصل
  // daysByYear: تقسيم أيام الإجازة اللي بتعدّي السنة (يكتبه التقديم ويُعاد حسابه)
  leaves: ['leaveTypeCode', 'leaveType', 'period', 'skippedHolidays', 'contactNumber', 'daysByYear'],
  letters: ['purpose', 'destination'],
}
const TYPE_PAYLOAD_KEYS: Record<string, string[]> = {
  // المعرّف مرجع الحساب، والاسم للعرض (يُثبَّتان عند التقديم من الكتالوج)
  PERMISSION: ['permissionType', 'permissionTypeId'],
  CUSTODY_REQUEST: ['assetIds'],
  // يُنشأ آلياً من البصمة — يُعاد تقديمه بعد الإرجاع بنفس حمولته
  OVERTIME_AUTO: ['date', 'hours', 'autoDetected'],
  OVERTIME: ['date', 'hours'],
  // توافق شاشة المكافآت (الموظف المختار) — معالج الدفتر لا يقرؤه
  BONUS: ['employeeId'],
  RETIREMENT: ['effectiveDate', 'lastWorkingDate'],
}
const HANDLER_PAYLOAD_KEYS: Record<string, string[]> = {
  ...EMPLOYMENT_PAYLOAD_KEYS,
  ...Object.fromEntries(
    Object.entries(RECORD_UPDATE_FIELDS).map(([h, map]) => [h, Object.keys(map)])
  ),
  // المسار الأمني وحده يغيّر البنك
  payroll_bank_secure: ['iban', 'bankName'],
  salary_update_history: ['newSalary', 'effectiveDate', 'reason', 'increase_pct'],
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
    private readonly letterTemplates: LetterTemplatesService,
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
    private readonly employees: Repository<Employee>,
    @InjectRepository(OvertimeEntry)
    private readonly overtimeEntries: Repository<OvertimeEntry>
  ) {}

  // ===== الكتالوج — مفلتر بجمهور كل نوع (visible_to) =====
  async catalog(user?: JwtPayload) {
    const chains = await this.chains.find()
    const letterTypes = await this.letterTemplates.availableTypeCodes()
    const actualLoanType = await this.types.findOneBy({ code: 'LOAN' })
    const all = (
      await this.types.find({
        where: { isActive: true },
        order: { category: 'ASC', id: 'ASC' },
      })
    ).map(t => t.code === LOAN_DEFERRAL_TYPE
      ? { ...t, approvalChainId: actualLoanType?.approvalChainId ?? (null as unknown as number), isConfidential: actualLoanType?.isConfidential ?? t.isConfidential }
      : t).map((t) => ({
      ...t,
      approvalChainName: (() => {
        const configured = chains.find(c => c.id === t.approvalChainId)
        const effective = configured && user?.branchId
          ? chains.find(c => c.code === configured.code && c.branchId === user.branchId && c.isActive) ?? configured
          : configured
        return effective ? `${effective.nameAr}${effective.isActive ? '' : ' (معطلة)'}` : 'لم يُحدد مسار الاعتماد'
      })(),
      // هل للنوع تنفيذ بعد الاعتماد؟ منتقي التقديم يخفي غير المبني (REQ-3)
      destinationSupported: this.destinations.supports(t) && (t.destinationHandler !== 'letter_pdf_generator' || letterTypes.has(t.code)),
      autoGeneratesPdf: t.destinationHandler === 'letter_pdf_generator'
        ? letterTypes.has(t.code)
        : t.autoGeneratesPdf,
      ...this.executionFormFields(t),
      ...(t.code === 'RETIREMENT' ? {
        requiredFields: JSON.stringify([...new Set([...JSON.parse(t.requiredFields || '[]'), 'effectiveDate'])]),
      } : {}),
    }))
    if (!user) return groupLeaveProfiles(all)
    const emp = user.employeeId
      ? await this.employees.findOne({ where: { id: user.employeeId } })
      : null
    return groupLeaveProfiles(all.filter((t) => this.audienceAllows(t, user, emp)))
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
      definitionCode?: string
      payload?: Record<string, any>
      submit?: boolean
      onBehalfEmployeeId?: number
    }
  ) {
    const type = await this.types.findOne({
      where: { code: dto.definitionCode || dto.typeCode, isActive: true },
    })
    if (!type) throw new NotFoundException('نوع الطلب غير موجود')
    if (dto.definitionCode && !(dto.typeCode === 'LEAVE' && isLeaveDefinition(type))) {
      throw new BadRequestException('تعريف الطلب لا يطابق فئة الطلب')
    }
    if (isLeaveDefinition(type)) dto = { ...dto, payload: this.leavePayload(type, dto.payload ?? {}) }
    if (this.isOvertimeDefinition(type)) {
      if (type.code === 'OVERTIME_AUTO' || type.destinationHandler === 'overtime_auto') throw new BadRequestException('طلب الإضافي المكتشف يُنشأ من محرك الحضور فقط')
      this.assertOvertimeClientPayload(dto.payload ?? {})
    }
    // وجهة لسه متبنّتش: لا مسودة ولا تقديم — كان يُعتمد ويُقفل «مكتمل» بلا أثر (REQ-3)
    if (!this.destinations.supports(type)) {
      throw new BadRequestException(this.destinations.unsupportedMessage(type))
    }
    if (type.code === LOAN_DEFERRAL_TYPE) dto = { ...dto, payload: assertLoanDeferralClientPayload(dto.payload ?? {}, !!dto.submit) }
    if (isSalaryChangeType(type)) dto = { ...dto, payload: assertSalaryChangeClientPayload(dto.payload ?? {}, !!dto.submit) }

    // Legacy personnel screens sent employeeId inside the payload. Resolve it as
    // the actual requester before ownership, branch and approval-chain checks.
    if (['transfers_effective_date', 'employee_update_promotions'].includes(type.destinationHandler) && dto.payload?.employeeId != null) {
      const targetId = assertEmployeeId(dto.payload.employeeId)
      if (dto.onBehalfEmployeeId != null && targetId !== Number(dto.onBehalfEmployeeId)) {
        throw new BadRequestException('الموظف المحدد في الطلب لا يطابق الموظف المقدم نيابة عنه')
      }
      dto = { ...dto, onBehalfEmployeeId: targetId }
    }

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
      const scope = branchScopeOf(user)
      if (scope !== null && target.branchId !== scope) {
        throw new ForbiddenException('لا يمكنك تقديم طلب لموظف خارج نطاق فرعك')
      }
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
    if (!requester) throw new BadRequestException('الموظف المستهدف غير موجود')
    // الموظف المنتهي/المؤرشف (isActive=false) لا يقدّم طلبات جديدة — حارس على
    // مستوى الفعل لتوكن قديم صالح (فترة الإشعار notice_period تبقى نشطة فتُقدّم)
    if (requester && !requester.isActive) {
      throw new ForbiddenException(
        'حساب الموظف غير نشط (منتهي/مؤرشف) — لا يقدّم طلبات جديدة'
      )
    }
    if (!this.audienceAllows(type, user, requester)) {
      throw new ForbiddenException('هذا النوع من الطلبات غير متاح لك')
    }

    // التحقق من الحقول: القديمة (أسماء) + المخصّصة (كاملة الوصف)
    const required = this.requiredRequestFields(type)
    try {
      const custom: Array<{ key: string; label: string; required: boolean; type: string; options?: string[] }> =
        type.customFields ? JSON.parse(type.customFields) : []
      const payload0 = dto.payload ?? {}
      for (const f of custom) {
        if (isSalaryChangeType(type) && ['increase_pct', 'salaryChangeBasis', 'salaryChangeApproval'].includes(f.key)) continue
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
    // القائمة البيضاء قبل الحفظ — المرفوض لا يترك مسودة مخزّنة بالمفتاح الممنوع (SEC-REQ-2)
    this.assertPayloadKeys(type, JSON.stringify(payload))
    // التقديم المباشر: قيم البنك/المسمى قبل الحفظ — لا مسودة يتيمة (SEC-EMP-2)
    if (dto.submit) this.assertSubmitValues(type, JSON.stringify(payload))
    if (dto.submit && type.destinationHandler === 'letter_pdf_generator') await this.letterTemplates.publishedFor(this.ds.manager, type.code)

    const emp = requester

    let req = this.requests.create({
      typeCode: isLeaveDefinition(type) ? 'LEAVE' : type.code,
      definitionCode: isLeaveDefinition(type) ? type.code : null,
      requesterId,
      createdByUserId: user.sub,
      branchId: emp?.branchId ?? user.branchId ?? undefined,
      status: 'DRAFT' as RequestStatus,
      payload: JSON.stringify(payload),
    })
    await this.assertAttachmentOwnership(req, user)
    req = await this.requests.save(req)

    if (dto.submit) {
      try {
        return await this.submit(user, req.id)
      } catch (error) {
        // Failed direct submission must not leave an unusable draft. A request
        // that advanced concurrently is preserved by the status predicate.
        await this.requests.delete({ id: req.id, status: 'DRAFT' })
        throw error
      }
    }
    return req
  }

  // ===== التقديم: حل السلسلة + الشروط + SLA =====
  async submit(user: JwtPayload, id: number) {
    const saved = await this.ds.transaction(em => this.submitLocked(user, id, em))
    return this.afterSubmission(saved)
  }

  // Every transition reads the request after acquiring its transaction lock.
  // Re-submission uses this same manager so payload edits and execution roll back together.
  private async submitLocked(user: JwtPayload, id: number, em: EntityManager, resubmission = false) {
    const req = await this.owned(user, id, em)
    assertTransition(req.status, 'SUBMITTED')

    const type = await em.getRepository(RequestType).findOne({ where: { code: definitionCodeOf(req) } })
    if (!type) throw new NotFoundException('نوع الطلب غير موجود')
    if (!type.isActive) throw new BadRequestException('نوع الطلب معطّل')
    if (isLeaveDefinition(type)) {
      req.payload = JSON.stringify(this.leavePayload(type, JSON.parse(req.payload || '{}')))
      req.definitionCode = definitionCodeOf(req)
      req.typeCode = 'LEAVE'
    }
    // وجهة لسه متبنّتش (مسودة قديمة/إعادة تقديم): لا تقديم (REQ-3)
    if (!this.destinations.supports(type)) {
      throw new BadRequestException(this.destinations.unsupportedMessage(type))
    }
    // مفاتيح الحمولة من قائمة النوع البيضاء فقط (SEC-REQ-2)
    this.assertPayloadKeys(type, req.payload)
    // قيم البنك/المسمى إلزامية وصالحة عند التقديم (SEC-EMP-2)
    this.assertSubmitValues(type, req.payload)
    if (type.code === 'OVERTIME') {
      const payload = JSON.parse(req.payload || '{}')
      await assertExemptionOvertimeAllowed(em, req.requesterId, String(payload.date ?? ''))
    }
    if (type.destinationHandler === 'letter_pdf_generator') await this.letterTemplates.publishedFor(em, type.code)
    await this.assertAttachmentOwnership(req, user)
    await validateEmploymentRequest(em, req, type)
    if (type.destinationHandler === 'custody_transfer') {
      const payload = JSON.parse(req.payload || '{}')
      await custodyTransferTarget(em, Number(payload.assignmentId), Number(payload.toEmployeeId), req, user)
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
        const asset = await em
          .getRepository(Asset)
          .findOne({ where: { id: assetId } })
        if (!asset || asset.status !== 'AVAILABLE' || asset.currentHolderId) {
          throw new BadRequestException(
            `الأصل «${asset?.name ?? '#' + assetId}» غير متاح — اختر من المتاح فقط`
          )
        }
        // رفض مبكر لو للأصل إسناد مفتوح (يظل AVAILABLE طوال PENDING_ACK)
        const open = await em.getRepository(CustodyAssignment).count({
          where: {
            assetId,
            status: In([
              'PENDING_ACK',
              'PENDING_MANAGER_CONFIRM',
              'ACTIVE',
              'RETURN_REQUESTED',
            ]),
          },
        })
        if (open > 0) {
          throw new BadRequestException(
            `الأصل «${asset.name}» له إسناد عهدة مفتوح — لا يُسنَد لموظفين`
          )
        }
      }
    }

    // الإذن: نوعه إلزامي (بلا نوع كان عذراً مجانياً بلا حد) + أقصى مدته قبل الدورة.
    // المطابقة بالمعرّف permissionTypeId، والاسم للعملاء القدامى فقط؛ ثم يُثبَّت
    // المعرّف والاسم الحالي في الحمولة — الحساب بالمعرّف فلا تكسره إعادة التسمية
    if (type.code === 'PERMISSION') {
      const p = req.payload ? JSON.parse(req.payload) : {}
      const ptId = Number(p.permissionTypeId)
      const ptName = String(p.permissionType ?? '').trim()
      if (!(Number.isInteger(ptId) && ptId > 0) && !ptName) {
        throw new BadRequestException('اختر نوع الإذن قبل التقديم')
      }
      {
        const pt =
          Number.isInteger(ptId) && ptId > 0
            ? await em.getRepository(PermissionType).findOne({ where: { id: ptId } })
            : await em.getRepository(PermissionType).findOne({ where: { nameAr: ptName } })
        if (!pt || !pt.isActive) {
          throw new BadRequestException('نوع الإذن غير معروف أو معطل')
        }
        if (p.permissionTypeId !== pt.id || p.permissionType !== pt.nameAr) {
          p.permissionTypeId = pt.id
          p.permissionType = pt.nameAr
          req.payload = JSON.stringify(p)
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

    // مأمورية/عمل عن بُعد: مدى تواريخ صالح — محرك الحضور يقرؤه يوماً بيوم ويُعاد
    // حسابه كاملاً بعد التنفيذ (مدى معكوس كان يُعتمد بلا أي أثر، والمفتوح يحسب آلاف الأيام)
    if (type.code === 'BUSINESS_TRIP' || type.code === 'REMOTE_WORK') {
      const p = req.payload ? JSON.parse(req.payload) : {}
      const isDate = (d: unknown) =>
        /^\d{4}-\d{2}-\d{2}$/.test(String(d ?? '')) &&
        localDateOf(new Date(`${d}T12:00:00`)) === String(d)
      if (!isDate(p.fromDate) || !isDate(p.toDate)) {
        throw new BadRequestException('تاريخ البداية والنهاية مطلوبان بصيغة YYYY-MM-DD')
      }
      if (String(p.toDate) < String(p.fromDate)) {
        throw new BadRequestException('تاريخ النهاية قبل تاريخ البداية')
      }
      const span =
        Math.round(
          (new Date(`${p.toDate}T12:00:00`).getTime() -
            new Date(`${p.fromDate}T12:00:00`).getTime()) /
            86400000
        ) + 1
      if (span > MAX_RANGE_DAYS) {
        throw new BadRequestException(
          `المدى ${span} يوماً أطول من الحد المسموح (${MAX_RANGE_DAYS} يوماً) — قسّمه على أكثر من طلب`
        )
      }
    }

    // نصف اليوم: لازم يكون يوماً واحداً
    if (type.category === 'leaves') {
      const p = req.payload ? JSON.parse(req.payload) : {}

      // النوع الموحّد «طلب إجازة»: نوع الإجازة مطلوب ولازم يكون معروفاً ومفعّلاً —
      // بلا هذا التحقق يُخصم كود مجهول من «السنوي» بصمت (لا default آمن)
      let leaveTypeDef: LeaveType | null = null
      if (isLeaveDefinition(type)) {
        const ltCode = leaveCodeOf(p, type.code)
        if (!ltCode) {
          throw new BadRequestException('اختر نوع الإجازة قبل التقديم')
        }
        if (ltCode) {
          leaveTypeDef = await em
            .getRepository(LeaveType)
            .findOne({ where: { code: ltCode } })
          if (!leaveTypeDef || !leaveTypeDef.isActive) {
            throw new BadRequestException(
              `نوع الإجازة «${ltCode}» غير معروف أو معطل — اختر من الأنواع المتاحة`
            )
          }
        }
      }

      if (p.leaveId != null) {
        // إلغاء إجازة: لازم تكون معتمدة ومافيش طلب إلغاء تاني حي عليها —
        // وإلا الرصيد بيرجع مرتين (LEV-7)
        const target = await em.getRepository(Leave).findOne({
          where: { id: Number(p.leaveId), employeeId: req.requesterId },
        })
        if (!target || target.status !== 'APPROVED') {
          throw new BadRequestException(
            'الإجازة المطلوب إلغاؤها غير موجودة أو ملغاة بالفعل'
          )
        }
        const live = await em.getRepository(Request).find({
          where: {
            requesterId: req.requesterId,
            status: In(['SUBMITTED', 'UNDER_REVIEW', 'APPROVED', 'IN_EXECUTION']),
          },
        })
        const dup = live.some((r) => {
          if (r.id === req.id) return false
          try {
            return Number(JSON.parse(r.payload ?? '{}').leaveId) === Number(p.leaveId)
          } catch {
            return false
          }
        })
        if (dup) {
          throw new BadRequestException('في طلب إلغاء تاني قيد المعالجة لنفس الإجازة')
        }
      } else {
        // باقي الإجازات لازم تواريخ صحيحة — من غيرها الأيام كانت بتيجي من العميل
        // من غير حساب ولا فحص تداخل، والمقلوبة كانت بتتقبل وتخصم (LEV-4)
        const isDate = (d: unknown) =>
          /^\d{4}-\d{2}-\d{2}$/.test(String(d ?? '')) &&
          localDateOf(new Date(`${d}T12:00:00`)) === String(d)
        if (!isDate(p.fromDate) || !isDate(p.toDate)) {
          throw new BadRequestException(
            'تاريخ بداية ونهاية الإجازة مطلوبان بصيغة YYYY-MM-DD'
          )
        }
        if (String(p.toDate) < String(p.fromDate)) {
          throw new BadRequestException('تاريخ نهاية الإجازة قبل تاريخ بدايتها')
        }
        // الأثر الرجعي بحدّ من الإعدادات؛ الأقدم منه للموارد البشرية بس (LEV-20)
        const maxBack = await this.leaveBalances.maxBackdateDays()
        const oldest = localDateOf(new Date(Date.now() - maxBack * 86400000))
        if (
          String(p.fromDate) < oldest &&
          !userHasPerm(user, 'requests.create_on_behalf')
        ) {
          throw new BadRequestException(
            `الإجازة بأثر رجعي أقدم من ${maxBack} يوم بتتسجل عن طريق الموارد البشرية`
          )
        }
      }

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
        const { working, skipped } =
          await this.attendance.workingDaysForEmployee(
            req.requesterId,
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
        // الأيام دايماً من السيرفر — رقم العميل مابيتاخدش (LEV-4)
        p.days = effectiveDays
        p.skippedHolidays = skipped
        // إجازة بتعدّي السنة: أيامها بتتقسم على رصيد كل سنة (LEV-2)
        const y1 = Number(String(p.fromDate).slice(0, 4))
        const y2 = Number(String(p.toDate).slice(0, 4))
        if (!isHalf && y2 > y1) {
          const byYear: Record<string, number> = {}
          for (let y = y1; y <= y2; y++) {
            const seg = await this.attendance.workingDaysForEmployee(
              req.requesterId,
              y === y1 ? String(p.fromDate) : `${y}-01-01`,
              y === y2 ? String(p.toDate) : `${y}-12-31`
            )
            if (seg.working > 0) byYear[String(y)] = seg.working
          }
          p.daysByYear = byYear
        } else {
          delete p.daysByYear
        }
        req.payload = JSON.stringify(p)

        // منع تداخل الإجازات: لا إجازتان لنفس الموظف على أيام متقاطعة (خصم
        // مضاعف). سجل الإجازة يُكتب عند التنفيذ فقط، فنفحص: (أ) إجازة معتمدة
        // متداخلة، و(ب) طلب إجازة آخر لا يزال في المسار على أيام متقاطعة
        const reqFrom = String(p.fromDate)
        const reqTo = String(p.toDate)
        const overlapApproved = await em.getRepository(Leave).findOne({
          where: {
            employeeId: req.requesterId,
            status: 'APPROVED',
            fromDate: LessThanOrEqual(reqTo),
            toDate: MoreThanOrEqual(reqFrom),
          },
        })
        if (overlapApproved) {
          throw new BadRequestException(
            `للموظف إجازة معتمدة متداخلة مع هذه الفترة (${overlapApproved.fromDate} → ${overlapApproved.toDate})`
          )
        }
        const liveLeaves = await em.getRepository(Request).find({
          where: {
            requesterId: req.requesterId,
            status: In(['SUBMITTED', 'UNDER_REVIEW', 'IN_EXECUTION']),
          },
        })
        const overlapPending = liveLeaves.some((r) => {
          if (r.id === req.id) return false
          if (!isLeaveRequest(r)) {
            return false
          }
          try {
            const rp = JSON.parse(r.payload ?? '{}')
            if (!rp.fromDate || !rp.toDate) return false
            return String(rp.fromDate) <= reqTo && String(rp.toDate) >= reqFrom
          } catch {
            return false
          }
        })
        if (overlapPending) {
          throw new BadRequestException(
            'للموظف طلب إجازة آخر قيد المعالجة يتداخل مع هذه الفترة'
          )
        }
      }

      // قواعد نوع الإجازة من الكتالوج (تُطبَّق بعد تثبيت أيام العمل الفعلية):
      if (leaveTypeDef) {
        // حدّ أيام النوع — رفض ما يتجاوزه (مرضية 180، عارضة 7، حج 21…)
        const effDays = Number(p.days)
        if (
          leaveTypeDef.maxDays != null &&
          effDays > Number(leaveTypeDef.maxDays)
        ) {
          throw new BadRequestException(
            `«${leaveTypeDef.nameAr}» حدّها الأقصى ${leaveTypeDef.maxDays} يوم (أيام عمل) — طلبت ${effDays}`
          )
        }
        // مرة واحدة طوال الخدمة (الحج) — رفض لو للموظف سابقة من النوع:
        // (أ) سجل إجازة معتمد (منفَّذ)، أو (ب) طلب إجازة آخر لا يزال في المسار.
        // سجل الإجازة يُكتب عند التنفيذ فقط، فلا يكفي فحص السجلات وحدها —
        // بدونه يمرّ طلبان حج مقدَّمان قبل اعتماد الأول (العدّ = صفر لكليهما)
        if (leaveTypeDef.oncePerService) {
          const onceCode = leaveTypeDef.code
          const priorLeaves = await em.getRepository(Leave).count({
            where: {
              employeeId: req.requesterId,
              leaveTypeCode: onceCode,
              status: 'APPROVED',
            },
          })
          let inFlight = 0
          if (priorLeaves === 0) {
            const live = await em.getRepository(Request).find({
              where: {
                requesterId: req.requesterId,
                status: In([
                  'SUBMITTED',
                  'UNDER_REVIEW',
                  'IN_EXECUTION',
                  'APPROVED',
                  'COMPLETED',
                ]),
              },
            })
            inFlight = live.filter((r) => {
              if (r.id === req.id) return false
              let effCode = ''
              try {
                if (isLeaveRequest(r)) effCode = leaveCodeOf(JSON.parse(r.payload ?? '{}'), definitionCodeOf(r))
              } catch {
                effCode = ''
              }
              return effCode === onceCode
            }).length
          }
          if (priorLeaves > 0 || inFlight > 0) {
            throw new BadRequestException(
              `«${leaveTypeDef.nameAr}» تُمنح مرة واحدة طوال الخدمة — للموظف طلب/إجازة سابقة من هذا النوع`
            )
          }
        }
        // مرفق إجباري (تقرير طبي/عقد زواج…) — يُرحّل مرجعه في payload.attachmentUrl
        if (
          leaveTypeDef.requiredAttachment &&
          !String(p.attachmentUrl ?? '').trim()
        ) {
          throw new BadRequestException(
            `«${leaveTypeDef.nameAr}» تتطلب إرفاق: ${leaveTypeDef.requiredAttachment}`
          )
        }
      }
    }

    // الإجازات التي تمس الرصيد: تحقق الكفاية بالطبقات قبل دخول الدورة — لكل
    // سنة بأيامها، بعد حجز أيام الطلبات المعلّقة على نفس الرصيد (LEV-2/LEV-3)
    if (type.affectsBalance && type.category === 'leaves') {
      const payload = req.payload ? JSON.parse(req.payload) : {}
      if (Number(payload.days) > 0 && payload.leaveId == null) {
        await this.assertLeaveBalance(req, type, payload, em)
      }
    }

    if (type.code === LOAN_DEFERRAL_TYPE) {
      // المبلغ المستخدم في شروط السلسلة يأتي من الرصيد المقفل، لا من حمولة العميل.
      const stored = readStoredLoanDeferralPayload(JSON.parse(req.payload || '{}'))
      const client = assertLoanDeferralClientPayload(Object.fromEntries(LOAN_DEFERRAL_FIELDS.map(key => [key, stored[key]])), true) as LoanDeferralPayload
      const evidence = await getLoanInstallmentDeferralEvidence(em, { employeeId: req.requesterId, loanId: client.loanId, installmentId: client.installmentId, toPeriod: client.toPeriod })
      req.payload = JSON.stringify(stageLoanDeferralPayload(client, evidence))
    }
    if (type.destinationHandler === 'loans_installments' && type.code !== 'EARLY_LOAN_SETTLEMENT') {
      const payload = JSON.parse(req.payload || '{}'), schedule = loanScheduleAmounts(payload.amount, payload.months ?? 1)
      req.payload = JSON.stringify({ ...payload, amount: schedule.amount, months: schedule.months })
    }
    if (isSalaryChangeType(type)) req.payload = JSON.stringify(await stageSalaryChangeRequest(em, req, JSON.parse(req.payload || '{}'), user.sub))
    const { steps: resolved, chain, inactiveChain } = await this.resolveChain(type, req, em)
    if (this.isOvertimeDefinition(type)) {
      if (!resolved.length) throw new BadRequestException('الإضافي يتطلب خطوات اعتماد صريحة؛ لا يسمح بتنفيذه فورياً دون معتمدين')
      await this.stageOvertimeSubmission(em, req, resolved, user.sub, resubmission)
    }
    // السلسلة اللي هيمشي فيها الطلب معطّلة (SET-3): التعطيل يوقف التقديم الجديد برسالة
    // واضحة — كان بيتجاهل فتمشي الطلبات فيها عادي. الجارية تكمل بخطواتها المخزّنة
    if (inactiveChain) {
      throw new BadRequestException(
        `سلسلة اعتماد نوع «${type.nameAr}» («${inactiveChain.nameAr}») معطّلة — لا تُقبل عليها طلبات جديدة. ` +
          `فعّلها من «سلاسل الاعتماد» أو اربط النوع بسلسلة مفعّلة ثم أعد التقديم`
      )
    }
    req.resolvedSteps = JSON.stringify(resolved)
    req.submittedAt = new Date()

    if (resolved.length === 0) {
      // بلا خطوات فعّالة: نقرّر بناءً على السلسلة المستخدمة فعلاً (لا العامة)
      // 1) بلا سلسلة أصلاً (نوع مخصّص/سلسلة محذوفة) → توقف آمن، ممنوع تنفيذ بلا اعتماد
      if (!chain) {
        throw new BadRequestException(
          `لا توجد سلسلة اعتماد مربوطة بنوع «${type.nameAr}» — ` +
            `اربطه بسلسلة من «سلاسل الاعتماد» وأضِف المعتمدين ثم أعد التقديم`
        )
      }
      // 2) سلسلة فاضية غير معلّمة «تنفيذ فوري» → توقف لحد ما تُضبط
      if (!chain.autoApprove) {
        throw new BadRequestException(
          `لم تُحدَّد خطوات الاعتماد لنوع «${type.nameAr}» بعد — ` +
            `افتح «سلاسل الاعتماد» وأضِف المعتمدين لسلسلة «${chain.nameAr}» ثم أعد التقديم`
        )
      }
      // 3) تنفيذ فوري بلا موافقات (اختيار صريح من المالك على هذه السلسلة) — الحالة
      // والوجهة في معاملة واحدة (REQ-2): فشل المعالج يرجّع كله ويفضل الطلب زي ما كان
      req.status = 'APPROVED'
      if (isSalaryChangeType(type)) (em.queryRunner!.data.salaryRequestAutoActors ??= new Map<number, number>()).set(req.id, user.sub)
      // القرار التلقائي للنقل يحمل هوية منفذه صراحة ليستعملها التنفيذ المجدول لاحقًا.
      if (type.destinationHandler === 'transfers_effective_date') await em.getRepository(RequestApproval).save({
        requestId: req.id, step: 0, approverId: user.sub, action: 'APPROVED', comment: 'تنفيذ تلقائي وفق سلسلة الاعتماد المضبوطة',
      })
      await em.getRepository(Request).save(req)
      return this.executeDestinationLocked(em, req)
    }

    req.status = 'UNDER_REVIEW'
    req.currentStep = resolved[0].stepOrder
    return em.getRepository(Request).save(req)
  }

  // نوع الرصيد لطلب إجازة (من كتالوج أنواع الإجازة؛ الافتراضي السنوي)
  private async balanceTypeOf(
    type: RequestType,
    payload: Record<string, any>,
    em: EntityManager = this.ds.manager
  ): Promise<string> {
    const ltCode = leaveCodeOf(payload, type.code)
    const lt = await em
      .getRepository(LeaveType)
      .findOne({ where: { code: ltCode } })
    return lt?.balanceType ?? 'annual'
  }

  // كفاية رصيد طلب إجازة لكل سنة بأيامها، بعد حجز أيام طلبات الإجازة الحيّة
  // التانية على نفس الرصيد (LEV-3) — عند التقديم وقبل الاعتماد النهائي
  private async assertLeaveBalance(
    req: Request,
    type: RequestType,
    payload: Record<string, any>,
    em: EntityManager = this.ds.manager
  ) {
    const balanceType = await this.balanceTypeOf(type, payload, em)
    if (balanceType === 'none') return
    const fromDate = String(payload.fromDate)
    const pending: Record<string, number> = {}
    const live = await em.getRepository(Request).find({
      where: {
        requesterId: req.requesterId,
        status: In(['SUBMITTED', 'UNDER_REVIEW', 'APPROVED', 'IN_EXECUTION']),
      },
    })
    for (const r of live) {
      if (r.id === req.id) continue
      if (!isLeaveRequest(r)) continue
      let rp: Record<string, any>
      try {
        rp = JSON.parse(r.payload ?? '{}')
      } catch {
        continue
      }
      if (rp.leaveId != null || !(Number(rp.days) > 0) || !rp.fromDate) continue
      const rt = await em.getRepository(RequestType).findOne({ where: { code: definitionCodeOf(r) } })
      if (!rt?.affectsBalance) continue
      if ((await this.balanceTypeOf(rt, rp, em)) !== balanceType) continue
      const split = this.leaveBalances.splitByYear(
        rp,
        String(rp.fromDate),
        Number(rp.days)
      )
      for (const [y, d] of Object.entries(split)) pending[y] = (pending[y] ?? 0) + d
    }
    const byYear = this.leaveBalances.splitByYear(
      payload,
      fromDate,
      Number(payload.days)
    )
    for (const [year, d] of Object.entries(byYear)) {
      // سنة البداية: المتراكم حتى تاريخ البداية؛ السنة اللي بعدها: استحقاق السنة
      // كلها (المتراكم في أول يناير صفر في الاستحقاق الشهري)
      const onDate = year === fromDate.slice(0, 4) ? fromDate : `${year}-12-31`
      await this.leaveBalances.assertSufficient(
        req.requesterId,
        balanceType,
        d,
        onDate,
        pending[year] ?? 0
      )
    }
  }

  // حل السلسلة: دورة الفرع لو موجودة وإلا العامة + تفعيل الخطوات الشرطية فقط
  // ترجع السلسلة المستخدمة فعلاً (لقرار autoApprove في submit) — null لو
  // النوع بلا سلسلة أو سلسلته محذوفة (يُحسم كـ«غير مضبوط» = يتوقف)، و inactiveChain
  // لو السلسلة الفعلية معطّلة (SET-3)
  private async resolveChain(
    type: RequestType,
    req: Request,
    em: EntityManager = this.ds.manager
  ): Promise<{
    steps: ResolvedStep[]
    chain: ApprovalChain | null
    inactiveChain?: ApprovalChain
  }> {
    if (type.code === LOAN_DEFERRAL_TYPE) {
      const loanType = await em.getRepository(RequestType).findOneBy({ code: 'LOAN' })
      if (!loanType?.approvalChainId) throw new BadRequestException('طلب تأجيل القسط يتبع سلسلة السلف الحالية؛ اضبط سلسلة نوع السلفة أولًا')
      type = { ...type, approvalChainId: loanType.approvalChainId, isConfidential: loanType.isConfidential }
    }
    if (!type.approvalChainId) return { steps: [], chain: null }
    const globalChain = await em.getRepository(ApprovalChain).findOne({
      where: { id: type.approvalChainId },
    })
    if (!globalChain) return { steps: [], chain: null }

    // دورة خاصة بالفرع بنفس الكود تتقدم على العامة (فرع المعادي ≠ الرياض)
    let chain = globalChain
    if (req.branchId) {
      const branchChain = await em.getRepository(ApprovalChain).findOne({
        where: {
          code: globalChain.code,
          branchId: req.branchId,
          isActive: true,
        },
      })
      if (branchChain) chain = branchChain
    }
    // السلسلة الفعلية معطّلة (SET-3): لا توجيه عليها — نسخة الفرع المفعّلة تتقدم على
    // العامة المعطّلة، والعامة المعطّلة من غير نسخة فرع مفعّلة = توقف
    if (!chain.isActive) return { steps: [], chain: null, inactiveChain: chain }

    const steps = await em.getRepository(ApprovalStep).find({
      where: { chainId: chain.id },
      order: { stepOrder: 'ASC' },
    })
    const payload = req.payload ? JSON.parse(req.payload) : {}
    const loanAmountConditions = type.code === LOAN_DEFERRAL_TYPE || (type.destinationHandler === 'loans_installments' && type.code !== 'EARLY_LOAN_SETTLEMENT')
    const salaryConditions = isSalaryChangeType(type)
    const exactThresholds = new Map<number, string | null>()
    if ((loanAmountConditions && steps.some(step => step.thresholdField === 'amount' && step.thresholdOp)) || (salaryConditions && steps.some(step => ['increase_pct', 'newSalary'].includes(step.thresholdField) && step.thresholdOp))) {
      const rows: Array<{ id: number; value: string | null }> = await em.query('SELECT [id], CAST([thresholdValue] AS nvarchar(80)) AS [value] FROM [approval_steps] WHERE [chainId]=@0', [chain.id])
      for (const row of rows) exactThresholds.set(row.id, row.value)
    }
    const active = steps.filter(step => salaryConditions && ['increase_pct', 'newSalary'].includes(step.thresholdField) && step.thresholdOp
      ? salaryIncreaseThresholdMet(payload, step.thresholdField, step.thresholdOp, exactThresholds.get(step.id))
      : loanAmountConditions && step.thresholdField === 'amount' && step.thresholdOp
        ? loanAmountThresholdMet(payload.amount, step.thresholdOp, exactThresholds.get(step.id)) : this.thresholdMet(step, payload))

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
      if (['direct_manager_of_requester', 'department_manager_of_requester',
        'branch_manager_of_requester', 'receiving_team_manager', 'specific_employee'].includes(s.approverRole)
        && !approverEmployeeId) {
        throw new BadRequestException('لا يوجد معتمد محدد لهذه الخطوة — أكمل الهيكل التنظيمي أو عدّل سلسلة الاعتماد')
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
    return { steps: resolved, chain }
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
    const comment = typeof dto.comment === 'string' ? dto.comment.trim() : undefined
    if ((dto.action === 'REJECT' || dto.action === 'RETURN') && !comment) {
      throw new BadRequestException('سبب الرفض أو الإرجاع مطلوب')
    }
    const saved = await this.ds.transaction(async em => {
      const req = await this.scoped(user, id, em)
      if (req.status !== 'UNDER_REVIEW') {
        throw new BadRequestException('الطلب ليس قيد المراجعة')
      }
      const resolved = this.parseSteps(req.resolvedSteps)
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

      if (this.isOvertimeRequest(req, em)) {
        if (req.requesterId === user.employeeId) throw new ForbiddenException('لا يجوز اعتماد أو تعديل طلب الإضافي الخاص بك')
        if (dto.action === 'APPROVE') await this.reviewOvertimeApproval(em, req, user, dto)
        else if (dto.approvedMinutes != null || dto.reductionReason != null) throw new BadRequestException('تعديل الدقائق متاح مع قرار الموافقة فقط')
        const entry = await this.overtimeEntryForRequest(em, req)
        if (entry) await appendOvertimeEvent(em, { entryId: entry.id, requestId: req.id, actorUserId: user.sub,
          eventType: dto.action === 'APPROVE' ? 'STEP_APPROVED' : dto.action === 'RETURN' ? 'RETURNED' : 'REJECTED',
          stepOrder: mine.stepOrder, reason: comment, payload: { role: mine.role, approvedMinutes: entry.calculationSnapshot?.review?.approvedMinutes ?? null } })
      } else if (dto.approvedMinutes != null || dto.reductionReason != null) throw new BadRequestException('حقول دقائق الإضافي غير صالحة لهذا النوع من الطلبات')

      // إعادة فحص الرصيد قبل الاعتماد النهائي (LEV-3): الرصيد ممكن يكون اتسحب من
      // ساعة التقديم. قبل سجل التدقيق عشان الرفض مايسيبش سجل «معتمد» من غير أثر
      if (dto.action === 'APPROVE') {
        const othersPending = group.filter((s) => s !== mine && !s.actedAt).length
        const stepOrders = [...new Set(resolved.map((s) => s.stepOrder))].sort(
          (a, b) => a - b
        )
        const isLastGroup =
          stepOrders.indexOf(req.currentStep!) === stepOrders.length - 1
        if (othersPending === 0 && isLastGroup) {
          const t = await em.getRepository(RequestType).findOne({ where: { code: definitionCodeOf(req) } })
          const ap = req.payload ? JSON.parse(req.payload) : {}
          if (
            t?.affectsBalance &&
            t.category === 'leaves' &&
            Number(ap.days) > 0 &&
            ap.leaveId == null
          ) {
            await this.assertLeaveBalance(req, t, ap, em)
          }
        }
      }

      // سجل التدقيق غير القابل للتعديل — قبل أي تغيير حالة. سجل الاعتماد النهائي بيتكتب
      // جوه معاملة التنفيذ نفسها (REQ-2) — فشل الوجهة مايسيبش «معتمد» من غير أثر
      const action: ApprovalAction = dto.action === 'APPROVE' ? 'APPROVED' : dto.action === 'REJECT' ? 'REJECTED' : 'RETURNED_FOR_INFO'
      const audit: Partial<RequestApproval> = {
        requestId: req.id,
        step: mine.stepOrder,
        approverId: user.sub,
        action,
        comment,
      }
      await em.getRepository(RequestApproval).save(audit)

      mine.actedAt = new Date().toISOString()
      mine.action = action

      if (dto.action === 'REJECT') {
        await this.releaseRequestOvertime(em, req, 'REJECTED', user.sub, comment)
        assertTransition(req.status, 'REJECTED')
        req.status = 'REJECTED'
        req.resolvedSteps = JSON.stringify(resolved)
        req.completedAt = new Date()
        return em.getRepository(Request).save(req)
      }

      if (dto.action === 'RETURN') {
        assertTransition(req.status, 'RETURNED_FOR_INFO')
        req.status = 'RETURNED_FOR_INFO'
        req.resolvedSteps = JSON.stringify(resolved)
        return em.getRepository(Request).save(req)
      }

      // APPROVE: باقي موازيين في نفس المجموعة؟ ننتظرهم
      const stillPending = group.filter((s) => !s.actedAt)
      if (stillPending.length > 0) {
        req.resolvedSteps = JSON.stringify(resolved)
        return em.getRepository(Request).save(req)
      }

      // المجموعة اكتملت → المجموعة التالية أو التنفيذ
      const orders = [...new Set(resolved.map((s) => s.stepOrder))].sort(
        (a, b) => a - b
      )
      const nextOrder = orders[orders.indexOf(req.currentStep!) + 1]
      if (nextOrder !== undefined) {
        req.currentStep = nextOrder
        req.resolvedSteps = JSON.stringify(resolved)
        return em.getRepository(Request).save(req)
      }

      // الاعتماد النهائي: سجل التدقيق + APPROVED + الوجهة في معاملة واحدة (REQ-2) — لو
      // المعالج رمى، كله بيرجع: الطلب قيد المراجعة عند نفس الخطوة والمعتمد يشوف السبب
      assertTransition(req.status, 'APPROVED')
      req.status = 'APPROVED'
      req.currentStep = null as unknown as number
      req.resolvedSteps = JSON.stringify(resolved)
      try {
        if (this.isOvertimeRequest(req, em)) await this.finalizeOvertimeApproval(em, req, user.sub)
        await em.getRepository(Request).save(req)
        return await this.executeDestinationLocked(em, req)
      } catch (e) {
        if (e instanceof BadRequestException) {
          throw new BadRequestException(
            `لم يُعتمد الطلب — ${e.message}. الطلب باقٍ في صندوقك: ارفضه أو أرجعه لاستكمال المعلومات`
          )
        }
        throw e
      }
    })
    return this.afterSubmission(saved)
  }

  // ===== تنفيذ الوجهة داخل معاملة — الكتابة في السجل الدائم =====
  // prepare بيكتب قرار الاعتماد (سجل التدقيق + APPROVED) في نفس المعاملة (REQ-2): لو
  // المعالج رمى، القرار والحالة والوجهة بيرجعوا مع بعض — مفيش طلب APPROVED من غير أثر
  private async executeDestination(
    requestId: number,
    prepare?: (em: EntityManager) => Promise<void>
  ) {
    const saved = await this.ds.transaction(async (em) => {
      await this.lockFinancialRequestPrelude(em, requestId)
      const locked = await em.getRepository(Request).findOne({ where: { id: requestId }, lock: { mode: 'pessimistic_write' } })
      if (!locked) throw new NotFoundException()
      if (locked.status === 'COMPLETED') return locked
      if (prepare && locked.status === 'IN_EXECUTION') return locked
      if (['CANCELLED', 'REJECTED', 'RETURNED_FOR_INFO'].includes(locked.status)) throw new BadRequestException('حالة الطلب تغيرت — حدّث القائمة قبل إعادة المحاولة')
      if (prepare) await prepare(em)
      const req = await em.getRepository(Request).findOne({
        where: { id: requestId },
      })
      if (!req) throw new NotFoundException()
      return this.executeDestinationLocked(em, req)
    })

    return this.afterDestination(saved)
  }

  private async executeDestinationLocked(em: EntityManager, req: Request) {
    const type = await em.getRepository(RequestType).findOne({
      where: { code: definitionCodeOf(req) },
    })
    if (!type) throw new NotFoundException()

    const result = await this.destinations
      .execute(em, req, type)
      .catch((e: unknown) => this.executionFailure(req.id, e))
    req.destinationRef = result.ref
    if (result.completed) {
      req.status = 'COMPLETED'
      req.completedAt = new Date()
    } else {
      req.status = 'IN_EXECUTION'
    }
    return em.getRepository(Request).save(req)
  }

  private async afterSubmission(saved: Request) {
    if (saved.status === 'COMPLETED' || saved.status === 'IN_EXECUTION') return this.afterDestination(saved)
    return saved
  }

  private async afterDestination(saved: Request) {
    // بعد الالتزام: إجازة/إذن معتمد يعيد حساب أيام الحضور المتأثرة فوراً
    // (خارج المعاملة — عشان الحساب يشوف السجل الجديد)
    try {
      const payload = saved.payload ? JSON.parse(saved.payload) : {}
      const isLeave = isLeaveRequest(saved) || saved.typeCode === 'LEAVE_MODIFY_CANCEL'
      const isPermission = saved.typeCode === 'PERMISSION'
      // مأمورية/عمل عن بُعد: مدى أيام معذورة يقرؤها محرك الحضور — يُعاد حسابه كالإجازة
      // (وإلا تبقى أيامه المجسَّدة «غائب» وتُخصم بالمسير)
      const isExcusedRange =
        saved.typeCode === 'BUSINESS_TRIP' || saved.typeCode === 'REMOTE_WORK'
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
      if ((isLeave || isExcusedRange) && fromDate && toDate) {
        const from = new Date(`${fromDate}T12:00:00`)
        const to = new Date(`${toDate}T12:00:00`)
        // المدى كامل بلا حدّ (كان 62 يوماً فتبقى أيام إجازة الوضع 63-90 «غائب»)؛
        // الأيام المستقبلية لا تُكتب «غائب» — computeDay يمسح صفوفها
        for (let d = new Date(from); d <= to; d.setDate(d.getDate() + 1)) {
          const ds = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
          try {
            await this.attendance.computeDay(saved.requesterId, ds)
          } catch (e) {
            // يوم واحد لا يوقف باقي المدى — والخطأ يُسجَّل ولا يُبلع
            this.logger.error(
              `تعذّرت إعادة حساب حضور ${ds} للموظف #${saved.requesterId} بعد تنفيذ الطلب #${saved.id}`,
              (e as Error)?.stack
            )
          }
        }
      } else if (isPermission && payload.date) {
        await this.attendance.computeDay(saved.requesterId, String(payload.date))
      } else if (saved.typeCode === 'PUNCH_CORRECTION' && payload.date) {
        // تصحيح بصمة معتمد → يُطبَّق على اليوم فوراً
        await this.attendance.computeDay(saved.requesterId, String(payload.date))
      } else if (saved.typeCode === 'SHIFT_SWAP' && saved.status === 'COMPLETED') {
        for (const [employeeId, date] of [[saved.requesterId, payload.date], [Number(payload.withEmployeeId), payload.withDate || payload.date]] as const) {
          // Both neighbours matter when a shift spans midnight.
          for (const offset of [-1, 0, 1]) {
            const day = new Date(`${date}T12:00:00`)
            day.setDate(day.getDate() + offset)
            try { await this.attendance.computeDay(employeeId, localDateOf(day)) }
            catch (error) { this.logger.error(`تعذّرت إعادة حساب يوم مبادلة الوردية للموظف #${employeeId}`, (error as Error).stack) }
          }
        }
      }
    } catch (e) {
      // إعادة الحساب best-effort — اليوم يتصحح مع أي بصمة/recompute؛ لكن يُسجَّل
      this.logger.error(
        `تعذّرت إعادة حساب الحضور بعد تنفيذ الطلب #${saved.id}`,
        (e as Error)?.stack
      )
    }
    return saved
  }

  // خطأ المعالج وقت التنفيذ: رسائله (BadRequest/نص عربي) زي ما هي، وأي خطأ تاني
  // (برمجي/قاعدة بيانات) بيتسجّل ويطلع برسالة عامة — والمعاملة كلها بترجع (REQ-2)
  private executionFailure(requestId: number, e: unknown): never {
    if (e instanceof HttpException) throw e
    // رسالة عربية من المعالج = رفض قاعدة عمل معالج (أصل غير متاح، تداخل…): تحذير بالسبب بلا stack؛
    // غير ذلك (SQL أو خطأ برمجي) يبقى ERROR كاملًا
    const businessRule = e instanceof Error && !(e instanceof QueryFailedError) && /[؀-ۿ]/.test(e.message)
    if (businessRule) this.logger.warn(`تعذّر تنفيذ وجهة الطلب #${requestId}: ${(e as Error).message}`)
    else this.logger.error(`تعذّر تنفيذ وجهة الطلب #${requestId}`, (e as Error)?.stack)
    const reason = businessRule ? `: ${(e as Error).message}` : ' (خطأ داخلي — راجع سجل الخادم)'
    throw new BadRequestException(`تعذّر تنفيذ الطلب في وجهته${reason}`)
  }

  // ===== طلب اتعلّق APPROVED من غير وجهة (قبل REQ-2 فشل المعالج بعد الحفظ كان يسيبه كده) =====
  // إعادة التنفيذ للإدارة: نفس المعاملة الواحدة، ولو فشل تاني يفضل زي ما هو والسبب يظهر
  async retryExecution(user: JwtPayload, id: number) {
    const saved = await this.ds.transaction(async em => {
      const req = await this.scoped(user, id, em)
      if (req.status !== 'APPROVED') {
        throw new BadRequestException('إعادة التنفيذ للطلب المعتمد اللي تعذّر تنفيذه بس')
      }
      // الرصيد ممكن يكون اتغيّر من ساعة الاعتماد — نفس فحص الاعتماد النهائي (LEV-3)
      const t = await em.getRepository(RequestType).findOne({ where: { code: definitionCodeOf(req) } })
      const ap = req.payload ? JSON.parse(req.payload) : {}
      if (
        t?.affectsBalance &&
        t.category === 'leaves' &&
        Number(ap.days) > 0 &&
        ap.leaveId == null
      ) {
        await this.assertLeaveBalance(req, t, ap, em)
      }
      return this.executeDestinationLocked(em, req)
    })
    return this.afterDestination(saved)
  }

  // قفله بالرفض لو التنفيذ مستحيل (إجازة متداخلة، أصل اتسلّم لغيره…) — بسبب إلزامي
  // في سجل التدقيق
  async rejectFailedExecution(user: JwtPayload, id: number, comment: string) {
    const reason = typeof comment === 'string' ? comment.trim() : ''
    if (!reason) throw new BadRequestException('سبب الرفض مطلوب')
    return this.ds.transaction(async em => {
      const req = await this.scoped(user, id, em)
      // الإغلاق الإداري يلتزم بفرع الطلب حتى لو كان المستخدم صاحبه أو منشئه.
      const scope = branchScopeOf(user)
      if (scope !== null && req.branchId !== scope) throw new ForbiddenException('الطلب خارج نطاق فرعك الإداري')
      const type = await em.getRepository(RequestType).findOne({ where: { code: definitionCodeOf(req) } })
      const salary = !!type && isSalaryChangeType(type)
      const scheduledSalary = req.status === 'IN_EXECUTION' && salary
      if (req.status !== 'APPROVED' && !scheduledSalary) {
        throw new BadRequestException('الرفض هنا للطلب المعتمد اللي تعذّر تنفيذه بس')
      }
      // استثناء محصور في قرار الأجر المؤجل قبل أي كتابة مالية؛ لا يغير انتقالات الوجهات الأخرى.
      if (salary) await assertSalaryRequestUnexecuted(em, req)
      if (!scheduledSalary) assertTransition(req.status, 'REJECTED')
      const steps = this.parseSteps(req.resolvedSteps)
      await em.getRepository(RequestApproval).save({
        requestId: req.id,
        step: steps.length ? Math.max(...steps.map((s) => s.stepOrder)) : 0,
        approverId: user.sub,
        action: 'REJECTED',
        comment: `${scheduledSalary ? 'إغلاق زيادة الأجر قبل تنفيذها' : 'رفض بعد تعذّر التنفيذ'}: ${reason}`,
      })
      req.status = 'REJECTED'
      req.completedAt = new Date()
      await this.releaseRequestOvertime(em, req, 'REJECTED', user.sub, reason)
      return em.getRepository(Request).save(req)
    })
  }

  // ===== إعادة التقديم بعد الإرجاع لاستكمال معلومات =====
  async resubmit(
    user: JwtPayload,
    id: number,
    payload?: Record<string, any>
  ) {
    const saved = await this.ds.transaction(async em => {
      const req = await this.owned(user, id, em)
      assertTransition(req.status, 'SUBMITTED')
      if (req.status !== 'RETURNED_FOR_INFO') {
        throw new BadRequestException('الطلب ليس مُرجَعاً لاستكمال معلومات')
      }
      const type = await em.getRepository(RequestType).findOne({ where: { code: definitionCodeOf(req) } })
      if (!type) throw new NotFoundException('نوع الطلب غير موجود')
      if (isSalaryChangeType(type)) {
        if (payload) payload = assertSalaryChangeClientPayload(payload)
        // إعادة التقديم تبطل أساس الموافقة السابق وتعيد بناءه من الأجر المقفل.
        const stored = JSON.parse(req.payload || '{}')
        req.payload = JSON.stringify(Object.fromEntries(Object.entries(stored).filter(([key]) => !['salaryChangeBasis', 'salaryChangeApproval', 'increase_pct'].includes(key))))
      }
      if (payload) {
        if (this.isOvertimeRequest(req, em)) this.assertOvertimeClientPayload(payload)
        if (req.typeCode === LOAN_DEFERRAL_TYPE) {
          payload = assertLoanDeferralClientPayload(payload, false)
          const before = readStoredLoanDeferralPayload(JSON.parse(req.payload || '{}'))
          // إعادة التقديم تبدأ من اختيارات العميل فقط؛ لقطة جديدة تُبنى قبل حل السلسلة.
          req.payload = JSON.stringify(Object.fromEntries(LOAN_DEFERRAL_FIELDS.filter(key => before[key] !== undefined).map(key => [key, before[key]])))
        }
        // Either public spelling may change the value; do not keep a stale copy of
        // the other alias from the saved payload. Conflicting explicit aliases fail.
        const patch = { ...payload }
        if (patch.leaveTypeCode !== undefined && patch.leaveType === undefined) patch.leaveType = patch.leaveTypeCode
        if (patch.leaveType !== undefined && patch.leaveTypeCode === undefined) patch.leaveTypeCode = patch.leaveType
        const merged = {
          ...(req.payload ? JSON.parse(req.payload) : {}),
          ...patch,
        }
        req.payload = JSON.stringify(merged)
      }
      // القائمة البيضاء قبل الحفظ — المرفوض لا يُخزَّن ولا يُسقط المُرجَع لمسودة (SEC-REQ-2)
      if (isLeaveDefinition(type)) req.payload = JSON.stringify(this.leavePayload(type, JSON.parse(req.payload || '{}')))
      // وجهة لسه متبنّتش: قبل الحفظ عشان المُرجَع مايقعش لمسودة (REQ-3)
      if (!this.destinations.supports(type)) {
        throw new BadRequestException(this.destinations.unsupportedMessage(type))
      }
      this.assertPayloadKeys(type, req.payload)
      // وقيم البنك/المسمى قبل الحفظ أيضاً — الفارغ لا يُسقط المُرجَع لمسودة (SEC-EMP-2)
      this.assertSubmitValues(type, req.payload)
      await this.assertAttachmentOwnership(req, user)
      req.status = 'DRAFT'
      await em.getRepository(Request).save(req)
      return this.submitLocked(user, id, em, true)
      })
    return this.afterSubmission(saved)
  }

  // ===== الإلغاء (صاحب الطلب قبل البت فيه) =====
  async cancel(user: JwtPayload, id: number) {
    return this.ds.transaction(async em => {
      const req = await this.owned(user, id, em)
      assertTransition(req.status, 'CANCELLED')
      await this.releaseRequestOvertime(em, req, 'CANCELLED', user.sub, 'إلغاء صاحب الطلب قبل اكتمال الاعتماد')
      req.status = 'CANCELLED'
      req.completedAt = new Date()
      return em.getRepository(Request).save(req)
    })
  }

  // ===== تأكيد استلام العهدة (الموظف) → بانتظار اعتماد المدير المباشر =====
  async acknowledgeCustody(user: JwtPayload, assignmentId: number) {
    const found = await this.ds.getRepository(CustodyAssignment).findOne({
      where: { id: assignmentId },
    })
    if (!found) throw new NotFoundException('إسناد العهدة غير موجود')
    return this.ds.transaction(async em => {
      const asset = await em.getRepository(Asset).findOne({ where: { id: found.assetId }, lock: { mode: 'pessimistic_write' } })
      if (!asset || asset.status === 'RETIRED') throw new BadRequestException('الأصل غير موجود أو متقاعد')
      const row = await em.getRepository(CustodyAssignment).findOneBy({ id: assignmentId })
      if (!row || row.employeeId !== user.employeeId) throw new ForbiddenException('العهدة ليست باسمك')
      if (row.status !== 'PENDING_ACK') throw new BadRequestException('العهدة ليست بانتظار التأكيد')
      row.status = 'PENDING_MANAGER_CONFIRM'
      row.acknowledgedAt = new Date()
      return em.getRepository(CustodyAssignment).save(row)
    })
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
    const transferPending = await this.ds.getRepository(CustodyAssignment).count({ where: {
      assetId: row.assetId, id: Not(row.id), status: In(['PENDING_ACK', 'PENDING_MANAGER_CONFIRM']),
    } })
    if (transferPending) throw new BadRequestException('للأصل نقل معلق — ألغِ النقل أو أكمله قبل طلب الإرجاع')
    row.status = 'RETURN_REQUESTED'
    return this.ds.getRepository(CustodyAssignment).save(row)
  }

  // ===== نقل عهدة نشطة لموظف آخر (أمين العهدة) =====
  // تُفتح عهدة PENDING_ACK للمستلم؛ العهدة الحالية تبقى ACTIVE حتى تأكيد مديره.
  async transferCustody(
    user: JwtPayload,
    assignmentId: number,
    toEmployeeId: number,
    note?: string
  ) {
    if (!userHasPerm(user, 'custody.assign')) throw new ForbiddenException('نقل العهدة لمسؤول العهدة فقط')
    if (note != null && (typeof note !== 'string' || note.trim().length > 100)) throw new BadRequestException('ملاحظة النقل بحد أقصى 100 حرف')
    return this.ds.transaction(async em => {
      const created = await startCustodyTransfer(em, assignmentId, toEmployeeId, undefined, user)
      if (note?.trim()) {
        created.condition = note.trim()
        await em.getRepository(CustodyAssignment).save(created)
      }
      return created
    })
  }

  // The current holder remains responsible until manager confirmation commits.
  async managerConfirmCustody(user: JwtPayload, assignmentId: number) {
    const found = await this.ds.getRepository(CustodyAssignment).findOneBy({ id: assignmentId })
    if (!found) throw new NotFoundException('إسناد العهدة غير موجود')
    const directManager = await this.resolver.directManagerOf(found.employeeId)
    if (user.employeeId !== directManager && !userHasPerm(user, 'custody.assign')) throw new ForbiddenException('اعتماد العهدة للمدير المباشر أو مسؤول العهدة')
    if (user.employeeId === found.employeeId) throw new ForbiddenException('لا يمكنك اعتماد عهدتك بنفسك')
    return this.ds.transaction(async em => {
      const asset = await em.getRepository(Asset).findOne({ where: { id: found.assetId }, lock: { mode: 'pessimistic_write' } })
      const repo = em.getRepository(CustodyAssignment)
      const row = await repo.findOneBy({ id: assignmentId })
      if (!row || row.status !== 'PENDING_MANAGER_CONFIRM') throw new BadRequestException('العهدة ليست بانتظار اعتماد المدير')
      const employee = await em.getRepository(Employee).findOneBy({ id: row.employeeId })
      const scope = branchScopeOf(user)
      if (!employee || !employee.isActive) throw new BadRequestException('الموظف المستلم غير نشط')
      if (scope !== null && employee.branchId !== scope) throw new ForbiddenException('العهدة خارج نطاق فرعك')
      if (!asset || asset.status === 'RETIRED') throw new BadRequestException('الأصل غير موجود أو متقاعد')
      const active = await repo.find({ where: { assetId: row.assetId, id: Not(row.id), status: In(['ACTIVE', 'RETURN_REQUESTED']) } })
      const source = active.length === 1 && active[0].status === 'ACTIVE' && active[0].employeeId === asset.currentHolderId
        && active[0].employeeId === row.assignedBy ? active[0] : null
      if ((active.length && !source) || (asset.currentHolderId && !source && asset.currentHolderId !== row.employeeId)) {
        throw new BadRequestException('الأصل مُسنَد فعلاً لموظف آخر — لا يُسنَد لموظفين')
      }
      if (source) {
        source.status = 'TRANSFERRED'
        source.returnedAt = new Date()
        source.condition = 'نُقلت بعد قبول المستلم واعتماد مديره'
        await repo.save(source)
      }
      row.status = 'ACTIVE'
      row.managerConfirmAt = new Date()
      await repo.save(row)
      await em.getRepository(Asset).update(asset.id, { currentHolderId: row.employeeId, status: 'ASSIGNED' })
      await finishCustodyRequest(em, row.requestId)
      return row
    })
  }

  async rejectCustody(user: JwtPayload, assignmentId: number, reason: string) {
    if (typeof reason !== 'string' || reason.trim().length < 3 || reason.trim().length > 100) throw new BadRequestException('سبب رفض الاستلام مطلوب — من 3 إلى 100 حرف')
    const found = await this.ds.getRepository(CustodyAssignment).findOneBy({ id: assignmentId })
    if (!found) throw new NotFoundException('إسناد العهدة غير موجود')
    return this.ds.transaction(async em => {
      const asset = await em.getRepository(Asset).findOne({ where: { id: found.assetId }, lock: { mode: 'pessimistic_write' } })
      const repo = em.getRepository(CustodyAssignment)
      const row = await repo.findOneBy({ id: assignmentId })
      if (!row || !['PENDING_ACK', 'PENDING_MANAGER_CONFIRM'].includes(row.status)) throw new BadRequestException('يمكن رفض العهدة المعلقة قبل تفعيلها فقط')
      const employee = await em.getRepository(Employee).findOneBy({ id: row.employeeId })
      const source = asset?.currentHolderId ? await repo.findOneBy({ assetId: row.assetId, employeeId: asset.currentHolderId, status: 'ACTIVE' }) : null
      const recipient = user.employeeId === row.employeeId
      const sender = !!source && source.employeeId === user.employeeId && row.assignedBy === user.employeeId
      const scope = branchScopeOf(user)
      if (!recipient && !sender && !(userHasPerm(user, 'custody.assign') && employee && (scope === null || employee.branchId === scope))) throw new ForbiddenException('لا تملك صلاحية رفض استلام هذه العهدة أو إلغاء نقلها')
      row.status = 'REJECTED'
      row.returnedAt = new Date()
      row.condition = reason.trim()
      await repo.save(row)
      if (asset) {
        const otherOpen = await repo.count({ where: { assetId: row.assetId, id: Not(row.id), status: In(['ACTIVE', 'PENDING_ACK', 'PENDING_MANAGER_CONFIRM', 'RETURN_REQUESTED']) } })
        if (!otherOpen) await em.getRepository(Asset).update(asset.id, { currentHolderId: null as any, status: asset.status === 'RETIRED' ? 'RETIRED' : 'AVAILABLE' })
      }
      if (row.requestId) await em.getRepository(RequestApproval).save({ requestId: row.requestId, step: 0, approverId: user.sub, action: 'REJECTED', comment: 'رفض استلام العهدة: ' + reason.trim() })
      await finishCustodyRequest(em, row.requestId)
      return row
    })
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
    if (filters.typeCode) {
      const filterDefinition = await this.types.findOneBy({ code: filters.typeCode })
      if (filterDefinition && isLeaveDefinition(filterDefinition) && filters.typeCode !== 'LEAVE') where.definitionCode = filters.typeCode
      else where.typeCode = filters.typeCode
    }
    const rows = await this.requests.find({
      where: where as any,
      order: { createdAt: 'DESC' },
      take: 500,
    })
    // السرّي: هوية المقدّم ومحتواه لصاحبه ومنشئه والمعتمد الفعلي فقط — الباقي
    // محجوب من السيرفر لا من الواجهة (SEC-REQ-3). الصفوف كلها داخل النطاق أصلاً
    const confidential = new Set(
      (await this.types.find({ where: { isConfidential: true } })).map((t) => t.code)
    )
    const confIds = rows.filter((r) => confidential.has(definitionCodeOf(r))).map((r) => r.id)
    if (confIds.length === 0) return rows.map(r => this.withCanonicalStepActions(r))
    const acted = new Set(
      (
        await this.approvals.find({
          where: { requestId: In(confIds), approverId: user.sub },
        })
      ).map((a) => a.requestId)
    )
    return rows.map((r) =>
      !confidential.has(definitionCodeOf(r)) ||
      this.seesConfidential(user, r, true, acted.has(r.id))
        ? this.withCanonicalStepActions(r)
        : this.maskConfidential(r)
    )
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
    return (await this.requests.find({
      where: { requesterId: user.employeeId },
      order: { createdAt: 'DESC' },
      take: 200,
    })).map(r => this.withCanonicalStepActions(r))
  }

  // Personal audit history: only decisions actually recorded by this account, across role changes.
  async myDecisions(user: JwtPayload, before?: string) {
    const cursor = before === undefined ? undefined : Number(before)
    if (cursor !== undefined && (!/^\d+$/.test(before!) || !Number.isSafeInteger(cursor) || cursor < 1)) throw new BadRequestException('مؤشر صفحة القرارات غير صالح')
    const query = this.approvals.createQueryBuilder('decision')
      .innerJoin(Request, 'request', 'request.id = decision.requestId')
      .where('decision.approverId = :actor', { actor: user.sub })
      .andWhere('decision.action IN (:...actions)', { actions: ['APPROVED', 'APPROVE', 'APPPROVE', 'REJECTED', 'REJECT', 'RETURNED_FOR_INFO', 'RETURN'] })
      .orderBy('decision.id', 'DESC').take(51)
    if (cursor !== undefined) query.andWhere('decision.id < :cursor', { cursor })
    const found = await query.getMany()
    const page = found.slice(0, 50)
    const requests = page.length ? await this.requests.findBy({ id: In([...new Set(page.map(row => row.requestId))]) }) : []
    const types = requests.length ? await this.types.findBy({ code: In([...new Set(requests.map(definitionCodeOf))]) }) : []
    const typeNames = new Map(types.map(type => [type.code, type.nameAr]))
    const byId = new Map(requests.map(req => [req.id, req]))
    return { items: page.map(row => {
      const req = byId.get(row.requestId)!
      return { id: row.id, requestId: row.requestId, step: row.step, action: normalizeApprovalAction(row.action),
        comment: row.comment, actedAt: row.actedAt, requestStatus: req.status, requestTitle: typeNames.get(definitionCodeOf(req)) || 'طلب' }
    }), nextCursor: found.length > 50 ? String(page[page.length - 1].id) : null }
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
    const pending = candidates.filter((req) => {
      const resolved = this.parseSteps(req.resolvedSteps)
      // المجموعة الحالية: أي عضو لم يتصرف ويطابق المستخدم
      return resolved.some(
        (s) =>
          s.stepOrder === req.currentStep &&
          !s.actedAt &&
          this.resolver.satisfies(user, s)
      )
    })
    // اسم مقدّم الطلب ضمن الحمولة — المعتمد يعرضه بلا حاجة لصلاحية employees.view
    const ids = [...new Set(pending.map((r) => r.requesterId))]
    const emps = ids.length
      ? await this.employees.find({
          where: { id: In(ids) },
          select: ['id', 'fullName', 'employeeCode', 'jobTitle'],
        })
      : []
    const empById = new Map(emps.map((e) => [e.id, e]))
    return pending.map((req) => ({
      ...this.withCanonicalStepActions(req),
      requesterName: empById.get(req.requesterId)?.fullName,
      requesterCode: empById.get(req.requesterId)?.employeeCode,
      requesterJobTitle: empById.get(req.requesterId)?.jobTitle,
    }))
  }

  // ===== تفاصيل طلب + سجل الموافقات =====
  // يراه: صاحبه، أو منشئه (نيابة)، أو معتمد فعلي عليه، أو صاحب requests.view_all
  // في نطاق فرعه — غيرهم 403 (SEC-REQ-1). والسرّي لصاحب view_all وحده محجوب
  async detail(user: JwtPayload, id: number) {
    const req = await this.requests.findOne({ where: { id } })
    if (!req) throw new NotFoundException('الطلب غير موجود')
    const approvals = await this.approvals.find({
      where: { requestId: req.id },
      order: { actedAt: 'ASC' },
    })
    const scope = branchScopeOf(user)
    const inScope = scope === null || req.branchId === scope
    const party = this.seesConfidential(
      user,
      req,
      inScope,
      approvals.some((a) => a.approverId === user.sub)
    )
    if (!party && !(inScope && userHasPerm(user, 'requests.view_all'))) {
      throw new ForbiddenException('لا تملك صلاحية عرض هذا الطلب')
    }
    const full = { ...this.withCanonicalStepActions(req), approvals }
    const type = await this.types.findOne({ where: { code: definitionCodeOf(req) } })
    if (!party && type?.isConfidential) return this.maskConfidential(full)
    if (!type || !this.isOvertimeDefinition(type)) return full
    const entries = await this.overtimeEntries.find({ where: { requestId: req.id, employeeId: req.requesterId } })
    const entry = entries.length === 1 ? entries[0] : null
    if (!entry) return { ...full, overtime: null, overtimeReviewRequired: true }
    const events = await this.ds.getRepository(OvertimeEntryEvent).find({ where: { entryId: entry.id }, order: { id: 'ASC' } })
    const saved = entry.calculationSnapshot
    const approved = saved?.approval
    return { ...full, overtime: {
      id: entry.id, requestId: entry.requestId, date: entry.date, status: entry.status, source: entry.source,
      hoursRequested: entry.hoursRequested, hoursActual: entry.hoursActual, approvedMinutes: entry.approvedMinutes,
      amountSnapshot: entry.amountSnapshot, hourlyRateSnapshot: entry.hourlyRateSnapshot, originalPeriod: entry.originalPeriod,
      deferredFromRunId: entry.deferredFromRunId, calculationSnapshot: saved ? { schemaVersion: saved.schemaVersion,
        submission: saved.submission ?? null, review: saved.review ?? null,
        // تفاصيل الأجر الأساسي ليست حقلاً عاماً في شاشة الطلب؛ المعتمد يرى ناتج الإضافي فقط.
        approval: approved ? { approvedMinutes: approved.approvedMinutes, hourlyRate: approved.hourlyRate, multiplier: approved.multiplier,
          amount: approved.amount, dayKind: approved.dayKind, approvedAt: approved.approvedAt, approverId: approved.approverId } : null } : null,
      events: events.map(event => ({ id: event.id, eventType: event.eventType, actorUserId: event.actorUserId,
        stepOrder: event.stepOrder, reason: event.reason, createdAt: event.createdAt,
        beforeMinutes: event.payload?.beforeMinutes ?? null, approvedMinutes: event.payload?.approvedMinutes ?? null })),
    } }
  }

  // الكشف يُوجّه للمراجعة فقط؛ لا يحوّل إعداد التنفيذ الفوري إلى اعتماد مالي.
  @Cron('45 */3 * * * *')
  async reconcileAutoOvertime() {
    return this.routeDetectedOvertime()
  }

  /** التوجيه الفوري لا يمس كشف معاملات أخرى؛ المهمة الدورية تبقى للاستدراك العام. */
  async dispatchDetectedOvertime(entryIds: number[]) {
    const ids = [...new Set(entryIds.filter(id => Number.isSafeInteger(id) && id > 0))]
    let routed = 0
    // نحافظ على دفعات صغيرة دون تجاوز حد معاملات SQL عند حساب نطاق حضور كبير.
    for (let offset = 0; offset < ids.length; offset += 100) {
      routed += (await this.routeDetectedOvertime(ids.slice(offset, offset + 100))).routed
    }
    return { routed }
  }

  private async routeDetectedOvertime(entryIds?: number[]) {
    const type = await this.types.findOneBy({ code: 'OVERTIME_AUTO' })
    if (!type?.isActive || !type.approvalChainId) return { routed: 0 }
    const pending = await this.overtimeEntries.find({ where: { source: 'BIOMETRIC_DETECTED', status: 'DETECTED', requestId: IsNull(),
      ...(entryIds ? { id: In(entryIds) } : {}) }, take: 100 })
    let routed = 0
    for (const found of pending) {
      try {
        const changed = await this.ds.transaction(async em => {
          await lockPayrollEmployees(em, [found.employeeId])
          em.queryRunner!.data.requestFinanceEmployeeIds = new Set([found.employeeId])
          const entry = await em.getRepository(OvertimeEntry).findOneBy({ id: found.id })
          if (!entry || entry.status !== 'DETECTED' || entry.requestId) return false
          const employee = await em.getRepository(Employee).findOneBy({ id: entry.employeeId })
          if (!employee?.isActive) return false
          const evidence = await this.attendance.overtimeEvidence(entry.employeeId, entry.date, em)
          if (!evidence.window.open || evidence.blockers.length || evidence.evidenceMode !== 'PUNCH') return false
          await assertOvertimeSubmission(em, evidence, entry.id)
          const req = em.getRepository(Request).create({ typeCode: 'OVERTIME_AUTO', requesterId: employee.id,
            branchId: employee.branchId, payload: JSON.stringify({ date: entry.date, hours: evidence.detectedMinutes / 60, autoDetected: true }), status: 'DRAFT' })
          const { steps, inactiveChain } = await this.resolveChain(type, req, em)
          if (inactiveChain || !steps.length) return false
          req.resolvedSteps = JSON.stringify(steps)
          req.submittedAt = new Date()
          req.currentStep = steps[0].stepOrder
          req.status = 'UNDER_REVIEW'
          await em.getRepository(Request).save(req)
          em.queryRunner!.data.overtimeRequestIds = new Set([req.id])
          // كتابة الطلب تسبق قفل سجل الإضافي؛ القفل المالي يحمي الهوية طوال المعاملة.
          const locked = await em.getRepository(OvertimeEntry).findOne({ where: { id: entry.id }, lock: { mode: 'pessimistic_write' } })
          if (!locked || locked.requestId || locked.status !== 'DETECTED') throw new ConflictException('تغير سجل الكشف قبل توجيهه')
          locked.requestId = req.id
          await em.getRepository(OvertimeEntry).save(locked)
          await this.stageOvertimeSubmission(em, req, steps, null)
          return true
        })
        if (changed) routed++
      } catch (error) {
        this.logger.warn('تعذر توجيه سجل إضافي مكتشف #' + found.id + '؛ بقي للمراجعة: ' + (error as Error).message)
      }
    }
    return { routed }
  }

  // طلبات ألغاها النظام آلياً (سجل CANCELLED بـ approverId = 0 — مثلاً أوفرتايم
  // مكتشف لم يعد حساب الحضور يبرره) وكانت خطوتها الحالية بانتظار المستخدم —
  // لإشعار المعتمد (الإشعارات مشتقة بلا جدول). صاحب الطلب يُبلَّغ من «قرارات على طلباتي»
  async autoCancelledAwaiting(user: JwtPayload, since: Date) {
    const acts = await this.approvals.find({
      where: { action: 'CANCELLED', approverId: 0, actedAt: MoreThanOrEqual(since) },
      order: { actedAt: 'DESC' },
      take: 50,
    })
    if (acts.length === 0) return []
    const reqs = await this.requests.find({
      where: { id: In([...new Set(acts.map((a) => a.requestId))]) },
    })
    const byId = new Map(reqs.map((r) => [r.id, r]))
    const scope = branchScopeOf(user)
    const out: Array<{ act: RequestApproval; request: Request }> = []
    for (const act of acts) {
      const request = byId.get(act.requestId)
      if (!request || request.requesterId === user.employeeId) continue
      if (scope !== null && request.branchId !== scope) continue
      let steps: ResolvedStep[] = []
      try {
        steps = this.parseSteps(request.resolvedSteps)
      } catch {
        /* خطوات تالفة — تجاهل */
      }
      if (
        steps.some(
          (s) => s.stepOrder === act.step && !s.actedAt && this.resolver.satisfies(user, s)
        )
      ) {
        out.push({ act, request })
      }
    }
    return out
  }

  // ===== محرك التصعيد: خطوة تجاوزت SLA تتصعّد للدور المحدد =====
  async runEscalations() {
    const overdue = await this.requests.find({ where: { status: 'UNDER_REVIEW' } })
    let escalated = 0
    for (const candidate of overdue) {
      try {
        const changed = await this.ds.transaction(async em => {
          await this.lockFinancialRequestPrelude(em, candidate.id)
          const req = await em.getRepository(Request).findOne({ where: { id: candidate.id }, lock: { mode: 'pessimistic_write' } })
          if (!req || req.status !== 'UNDER_REVIEW') return false
          const resolved = this.parseSteps(req.resolvedSteps)
          const current = resolved.find(step => step.stepOrder === req.currentStep && !step.actedAt)
          if (!current?.dueAt || current.dueAt > new Date().toISOString() || !current.escalateTo) return false
          await em.getRepository(RequestApproval).save({
            requestId: req.id, step: current.stepOrder, approverId: 0, action: 'ESCALATED',
            comment: `تجاوز SLA — تصعيد من ${current.role} إلى ${current.escalateTo}`,
          })
          if (this.isOvertimeRequest(req, em)) {
            const entry = await this.overtimeEntryForRequest(em, req)
            if (entry) await appendOvertimeEvent(em, { entryId: entry.id, requestId: req.id, actorUserId: null,
              eventType: 'STEP_ESCALATED', stepOrder: current.stepOrder, reason: 'تجاوز مهلة اعتماد الخطوة',
              payload: { fromRole: current.role, toRole: current.escalateTo } })
          }
          current.role = current.escalateTo as ResolvedStep['role']
          current.escalateTo = null
          current.dueAt = current.slaDays ? new Date(Date.now() + current.slaDays * 86400000).toISOString() : null
          req.resolvedSteps = JSON.stringify(resolved)
          await em.getRepository(Request).save(req)
          return true
        })
        if (changed) escalated++
      } catch (error) {
        this.logger.error(`تعذّر تصعيد الطلب #${candidate.id} — لم يتوقف فحص بقية الطلبات`, (error as Error).stack)
      }
    }
    return { escalated }
  }

  // ===== تنفيذ النقل المجدول بتاريخ السريان (يومي) =====
  async runScheduledTransfers() {
    const today = localDateOf(new Date())
    const due = await this.ds.getRepository(Transfer).find({
      where: { status: 'SCHEDULED' },
    })
    let executed = 0
    for (const t of due) {
      if (t.effectiveDate > today) continue
      try {
      const changed = await this.ds.transaction(async (em) => {
        const changed = await this.destinations.executeTransfer(em, t.id)
        if (!changed) return false
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
        return true
      })
      if (changed) executed++
      } catch (error) {
        // رفض قاعدة عمل (عهدة قائمة، فريق غير صالح…) حالة معالجة وليست عطلًا: تحذير بالسبب العربي بلا stack؛
        // الأخطاء غير المتوقعة تبقى ERROR كاملة
        const status = error instanceof HttpException ? error.getStatus() : 500
        if (status < 500) this.logger.warn(`النقل المجدول #${t.id} ما زال بانتظار التنفيذ: ${(error as Error).message}`)
        else this.logger.error(`تعذّر تنفيذ النقل المجدول #${t.id} — ما زال بانتظار التنفيذ`, (error as Error).stack)
      }
    }
    const scheduledTypes = await this.types.find({ where: { destinationHandler: In([...SCHEDULED_EMPLOYMENT_HANDLERS, SALARY_CHANGE_HANDLER]) } })
    let employmentExecuted = 0
    if (scheduledTypes.length) {
      const byCode = new Map(scheduledTypes.map(type => [type.code, type]))
      const pending = await this.requests.find({ where: { typeCode: In([...byCode.keys()]), status: 'IN_EXECUTION' }, order: { id: 'ASC' } })
      for (const req of pending) {
        try {
          const type = byCode.get(req.typeCode)!, payload = JSON.parse(req.payload || '{}')
          const effectiveDate = isSalaryChangeType(type) ? readStoredSalaryChangePayload(payload).effectiveDate : employmentEffectiveDate(type, payload)
          if (effectiveDate > today) continue
          if ((await this.executeDestination(req.id)).status === 'COMPLETED') employmentExecuted++
        } catch (error) {
          this.logger.error(`تعذّر تنفيذ التغيير الوظيفي المجدول #${req.id} — ما زال بانتظار التنفيذ`, (error as Error).stack)
        }
      }
    }
    return { executed, employmentExecuted }
  }

  // ===== أدوات وصول =====

  private isOvertimeDefinition(type: Pick<RequestType, 'code' | 'destinationHandler'>) {
    return ['OVERTIME', 'OVERTIME_AUTO'].includes(type.code) || ['overtime_entries', 'overtime_auto'].includes(type.destinationHandler)
  }

  private isOvertimeRequest(req: Request, em: EntityManager) {
    return ['OVERTIME', 'OVERTIME_AUTO'].includes(req.typeCode) || (em.queryRunner?.data.overtimeRequestIds as Set<number> | undefined)?.has(req.id) === true
  }

  // قراءة الهوية فقط تسبق القفل المالي؛ كل إعادة قراءة مقفلة للطلب تأتي بعده.
  private async lockFinancialRequestPrelude(em: EntityManager, id: number) {
    if (!em.queryRunner?.isTransactionActive) throw new Error('انتقال الطلب يتطلب معاملة')
    const data = em.queryRunner.data
    const requestIds: Set<number> = data.financialRequestIds ??= new Set<number>()
    if (requestIds.has(id)) return
    const identity = await em.getRepository(Request).findOne({ where: { id }, select: { id: true, requesterId: true, typeCode: true, definitionCode: true } })
    if (!identity) return
    const type = await em.getRepository(RequestType).findOneBy({ code: definitionCodeOf(identity) })
    const overtime = ['OVERTIME', 'OVERTIME_AUTO'].includes(identity.typeCode) || (!!type && this.isOvertimeDefinition(type))
    const loan = ['LOAN', 'EARLY_LOAN_SETTLEMENT', LOAN_DEFERRAL_TYPE].includes(identity.typeCode) || ['loans_installments', 'loan_early_settlement', LOAN_DEFERRAL_HANDLER].includes(type?.destinationHandler ?? '')
    const salary = identity.typeCode === 'SALARY_INCREASE' || type?.destinationHandler === SALARY_CHANGE_HANDLER
    const transfer = identity.typeCode === 'TRANSFER' || type?.destinationHandler === 'transfers_effective_date'
    if (!overtime && !loan && !salary && !transfer) return
    const employeeIds: Set<number> = data.requestFinanceEmployeeIds ??= new Set<number>()
    if (!employeeIds.has(identity.requesterId)) {
      await lockPayrollEmployees(em, [identity.requesterId])
      employeeIds.add(identity.requesterId)
    }
    // مجموعة الإضافي تحدد سلوكه أيضًا؛ لا تُسجل السلف فيها لمجرد اشتراكهما في القفل المالي.
    if (overtime) (data.overtimeRequestIds ??= new Set<number>()).add(id)
    requestIds.add(id)
  }

  private assertOvertimeClientPayload(payload: Record<string, unknown>, allowStoredAutoDetected = false) {
    const reserved = new Set(['employeeId', 'requestId', 'source', 'status', 'rate', 'payableHours', 'hoursActual', 'hoursRequested',
      'rawMinutes', 'detectedMinutes', 'approvedMinutes', 'amount', 'amountSnapshot', 'hourlyRate', 'hourlyRateSnapshot',
      'calculationSnapshot', 'evidence', 'fingerprint', 'payrollRunId', 'originalPeriod', 'deferredFromRunId', 'autoDetected'])
    const forbidden = Object.keys(payload).filter(key => reserved.has(key) && !(key === 'autoDetected' && allowStoredAutoDetected))
    if (forbidden.length) throw new BadRequestException(`حقول الإضافي المحسوبة يحددها الخادم ولا تقبل داخل الطلب: ${forbidden.join('، ')}`)
  }

  private async overtimeEntryForRequest(em: EntityManager, req: Request) {
    const entries = await em.getRepository(OvertimeEntry).createQueryBuilder('entry').where('entry.requestId = :id', { id: req.id }).setLock('pessimistic_write').getMany()
    if (entries.length > 1) throw new ConflictException('يرتبط الطلب بأكثر من سجل إضافي قديم؛ يلزم مراجعة التاريخ قبل المتابعة')
    const entry = entries[0] ?? null
    if (entry && entry.employeeId !== req.requesterId) throw new ConflictException('هوية سجل الإضافي لا تطابق صاحب الطلب')
    return entry
  }

  private assertOvertimeChain(steps: ResolvedStep[], exempt: boolean) {
    if (!steps.length) throw new BadRequestException('الإضافي لا ينفذ دون خطوات اعتماد صريحة')
    if (exempt && (!steps.some(step => step.role === 'hr') || !steps.some(step => ['direct_manager_of_requester', 'department_manager_of_requester', 'branch_manager_of_requester', 'executive'].includes(step.role)))) {
      throw new BadRequestException('إضافي الموظف المستثنى يتطلب اعتماد مدير واعتماد الموارد البشرية صراحةً في السلسلة')
    }
  }

  private async stageOvertimeSubmission(em: EntityManager, req: Request, steps: ResolvedStep[], actorUserId: number | null, resubmission = false) {
    const payload = JSON.parse(req.payload || '{}')
    const date = String(payload.date ?? '')
    if (!isValidYmd(date)) throw new BadRequestException('تاريخ طلب الإضافي غير صالح')
    if (payload.reason != null && (typeof payload.reason !== 'string' || payload.reason.length > 500)) throw new BadRequestException('سبب الإضافي يجب أن يكون نصاً لا يتجاوز 500 حرف')
    if (payload.hours != null && !['number', 'string'].includes(typeof payload.hours)) throw new BadRequestException('ساعات الإضافي المطلوبة يجب أن تكون رقماً')
    const employee = await em.getRepository(Employee).findOneBy({ id: req.requesterId })
    if (!employee?.isActive) throw new BadRequestException('تقديم الإضافي متاح للموظف النشط؛ راجع حالة الموظف قبل التقديم')
    const repo = em.getRepository(OvertimeEntry)
    let entry = await this.overtimeEntryForRequest(em, req)
    const automatic = req.typeCode === 'OVERTIME_AUTO'
    if (automatic && !entry) throw new ConflictException('طلب كشف قديم بلا سجل إضافي مرتبط؛ لا يمكن اختراع مرجع كشف أثناء إعادة التقديم')
    if (automatic && entry!.date !== date) throw new BadRequestException('تاريخ طلب الإضافي المكتشف ثابت؛ راجع دليل اليوم نفسه عند إعادة التقديم')
    if (entry && (['APPROVED', 'PAID', 'REJECTED', 'CANCELLED'].includes(entry.status) || entry.calculationSnapshot?.approval)) throw new ConflictException('حالة سجل الإضافي لا تسمح بإعادة تقديمه')
    const evidence = await this.attendance.overtimeEvidence(req.requesterId, date, em)
    if (payload.previewFingerprint != null && payload.previewFingerprint !== evidence.fingerprint) {
      throw new ConflictException({ code: 'OVERTIME_PREVIEW_CHANGED', message: 'تغير سجل اليوم أو إعداد الإضافي بعد المعاينة؛ حدّث المعاينة قبل إرسال الطلب' })
    }
    if (evidence.blockers.length) throw new BadRequestException({ message: evidence.blockers.map(blocker => blocker.message).join('؛ '), blockers: evidence.blockers })
    if (!evidence.window.open && !String(payload.reason ?? '').trim()) throw new BadRequestException('سبب طلب الإضافي إلزامي داخل الفترة المغلقة')
    this.assertOvertimeChain(steps, evidence.evidenceMode === 'EXEMPT_APPROVAL')
    await assertOvertimeSubmission(em, evidence, entry?.id)
    const hours = payload.hours == null || payload.hours === '' || automatic ? null : Number(payload.hours)
    if (hours != null && (!Number.isFinite(hours) || hours <= 0 || hours > 999.99)) throw new BadRequestException('ساعات الإضافي المطلوبة يجب أن تكون رقماً موجباً صالحاً')
    const requestedMinutes = hours == null ? null : Math.floor(hours * 60 + 1e-8)
    if (requestedMinutes === 0 || (evidence.evidenceMode === 'EXEMPT_APPROVAL' && requestedMinutes == null)) throw new BadRequestException('حدد دقائق عمل إضافي موجبة للطلب')
    const before = entry?.calculationSnapshot ?? null
    // هذه ملاحظة للقيم الموجودة لحظة المراجعة؛ لا ندعي أنها لقطة تقديم أو اعتماد تاريخية.
    const observedSourceBefore = entry ? { id: entry.id, date: entry.date, source: entry.source, status: entry.status,
      hoursRequested: entry.hoursRequested, hoursActual: entry.hoursActual, payableHours: entry.payableHours,
      legacySnapshotAbsent: entry.calculationSnapshot == null } : null
    if (entry && entry.date !== date) await releaseOvertimeDayClaim(em, entry.id)
    entry ??= repo.create({ employeeId: req.requesterId, requestId: req.id, source: automatic ? 'BIOMETRIC_DETECTED' : 'PRE_REQUESTED' })
    entry.date = date
    entry.hoursRequested = hours
    entry.hoursActual = evidence.evidenceMode === 'PUNCH' ? evidence.detectedMinutes / 60 : null
    entry.payableHours = null
    entry.status = 'SUBMITTED'
    entry.calculationSnapshot = { schemaVersion: 1, submission: { evidence, requestedMinutes, submittedAt: new Date().toISOString(), submittedByUserId: actorUserId } }
    await repo.save(entry)
    await claimOvertimeDay(em, entry)
    await appendOvertimeEvent(em, { entryId: entry.id, requestId: req.id, actorUserId, eventType: resubmission || before?.submission ? 'RESUBMITTED' : 'SUBMITTED',
      reason: String(payload.reason ?? '').trim() || null, payload: { before, observedSourceBefore, submission: entry.calculationSnapshot.submission } })
    return entry
  }

  private async currentOvertimeEvidence(em: EntityManager, req: Request, entry: OvertimeEntry) {
    const submission = entry.calculationSnapshot?.submission
    if (!submission?.evidence || ['APPROVED', 'PAID', 'REJECTED', 'CANCELLED'].includes(entry.status)) throw new ConflictException('طلب الإضافي لا يحمل دليل تقديم صالحاً؛ أرجعه ثم أعد تقديمه لمراجعة الأدلة الحالية')
    const evidence = await this.attendance.overtimeEvidence(entry.employeeId, entry.date, em)
    if (evidence.blockers.length || evidence.fingerprint !== submission.evidence.fingerprint) throw new ConflictException({
      code: 'OVERTIME_EVIDENCE_CHANGED', message: 'تغيرت أدلة الإضافي أو سياسة يومه بعد التقديم؛ أرجع الطلب لإعادة تقديمه ومراجعة الدليل الحالي', blockers: evidence.blockers,
    })
    this.assertOvertimeChain(this.parseSteps(req.resolvedSteps), evidence.evidenceMode === 'EXEMPT_APPROVAL')
    await claimOvertimeDay(em, entry)
    return evidence
  }

  private async reviewOvertimeApproval(em: EntityManager, req: Request, user: JwtPayload, dto: ActDto) {
    const entry = await this.overtimeEntryForRequest(em, req)
    if (!entry) throw new ConflictException('طلب إضافي قديم بلا سجل ودليل تقديم؛ أرجعه ثم أعد تقديمه قبل الاعتماد')
    const evidence = await this.currentOvertimeEvidence(em, req, entry)
    const requested = entry.calculationSnapshot!.submission.requestedMinutes
    const cap = evidence.evidenceMode === 'EXEMPT_APPROVAL' ? requested : Math.min(evidence.detectedMinutes, requested ?? evidence.detectedMinutes)
    const currentMinutes = entry.calculationSnapshot?.review?.approvedMinutes ?? cap
    if (!Number.isSafeInteger(currentMinutes) || currentMinutes <= 0) throw new BadRequestException('لا توجد دقائق إضافي موجبة قابلة للاعتماد')
    if (dto.approvedMinutes != null) {
      if (!Number.isSafeInteger(dto.approvedMinutes) || dto.approvedMinutes <= 0 || dto.approvedMinutes > currentMinutes) throw new BadRequestException('الدقائق المعتمدة يجب أن تكون موجبة ولا تزيد عن آخر حد معتمد')
      if (dto.approvedMinutes < currentMinutes) {
        if (!userHasPerm(user, 'overtime.adjust')) throw new ForbiddenException('تخفيض الإضافي يتطلب صلاحية تعديل الإضافي')
        const reason = String(dto.reductionReason ?? '').trim()
        if (!reason) throw new BadRequestException('سبب تخفيض دقائق الإضافي مطلوب')
        entry.calculationSnapshot = { ...entry.calculationSnapshot, review: { approvedMinutes: dto.approvedMinutes, reductionReason: reason, actorUserId: user.sub } }
        await em.getRepository(OvertimeEntry).save(entry)
        await appendOvertimeEvent(em, { entryId: entry.id, requestId: req.id, actorUserId: user.sub, eventType: 'MINUTES_REDUCED',
          reason, stepOrder: req.currentStep, payload: { beforeMinutes: currentMinutes, approvedMinutes: dto.approvedMinutes } })
      }
    } else if (dto.reductionReason != null) throw new BadRequestException('سبب التخفيض يحتاج تحديد الدقائق المعتمدة')
  }

  private async finalizeOvertimeApproval(em: EntityManager, req: Request, actorUserId: number) {
    const entry = await this.overtimeEntryForRequest(em, req)
    if (!entry) throw new ConflictException('لا يوجد سجل إضافي مرتبط يمكن اعتماده')
    const evidence = await this.currentOvertimeEvidence(em, req, entry)
    const steps = this.parseSteps(req.resolvedSteps)
    if (steps.some(step => step.action !== 'APPROVED' || !step.actedAt)) throw new ConflictException('لم تكتمل خطوات اعتماد الإضافي')
    const requested = entry.calculationSnapshot!.submission.requestedMinutes
    const approvedMinutes = entry.calculationSnapshot?.review?.approvedMinutes ?? (evidence.evidenceMode === 'EXEMPT_APPROVAL' ? requested : Math.min(evidence.detectedMinutes, requested ?? evidence.detectedMinutes))
    const values = await buildOvertimeApprovalSnapshot(em, entry, evidence, { approvedMinutes, approverId: actorUserId, reason: entry.calculationSnapshot?.review?.reductionReason })
    Object.assign(entry, values, { status: 'APPROVED' })
    await em.getRepository(OvertimeEntry).save(entry)
    await appendOvertimeEvent(em, { entryId: entry.id, requestId: req.id, actorUserId, eventType: 'APPROVED', payload: { approval: entry.calculationSnapshot?.approval } })
  }

  private async releaseRequestOvertime(em: EntityManager, req: Request, status: 'REJECTED' | 'CANCELLED', actorUserId: number, reason?: string) {
    if (!this.isOvertimeRequest(req, em)) return
    const entry = await this.overtimeEntryForRequest(em, req)
    if (!entry) return
    if (['APPROVED', 'PAID'].includes(entry.status) || entry.calculationSnapshot?.approval) throw new ConflictException('الإضافي المعتمد لا يُلغى من مسار طلب معلق؛ راجع أثره المالي أولاً')
    entry.status = status
    await em.getRepository(OvertimeEntry).save(entry)
    await releaseOvertimeDayClaim(em, entry.id)
    await appendOvertimeEvent(em, { entryId: entry.id, requestId: req.id, actorUserId, eventType: 'CLAIM_RELEASED', reason, payload: { status } })
    if (status === 'CANCELLED') await appendOvertimeEvent(em, { entryId: entry.id, requestId: req.id, actorUserId, eventType: status, reason })
  }

  // طلب يملكه المستخدم: صاحبه أو منشئه (نيابة عن الغير) أو الأدمن
  private async owned(user: JwtPayload, id: number, em?: EntityManager): Promise<Request> {
    if (em) await this.lockFinancialRequestPrelude(em, id)
    const repo = em ? em.getRepository(Request) : this.requests
    const req = await repo.findOne({ where: { id }, ...(em ? { lock: { mode: 'pessimistic_write' as const } } : {}) })
    if (!req) throw new NotFoundException('الطلب غير موجود')
    const isOwner = req.requesterId === user.employeeId
    const isCreator = req.createdByUserId === user.sub
    if (!isOwner && !isCreator && user.role !== 'super_admin') {
      throw new ForbiddenException('الطلب ليس لك')
    }
    return req
  }

  // صاحب الطلب أو منشئه أو معتمد فعلي عليه: تصرّف فيه، أو تنطبق عليه خطوة من
  // سلسلته (حالية/سابقة/لاحقة) — المسمّاة باسمه تكفي بذاتها، والوظيفية (hr/مالية…)
  // بنطاق الفرع مثل الصندوق والفعل
  private seesConfidential(
    user: JwtPayload,
    req: Request,
    inScope: boolean,
    hasActed: boolean
  ): boolean {
    if (req.requesterId === user.employeeId || req.createdByUserId === user.sub) {
      return true
    }
    if (hasActed) return true
    return this.parseSteps(req.resolvedSteps).some(
      (s) =>
        (inScope ||
          (s.approverEmployeeId != null && s.approverEmployeeId === user.employeeId)) &&
        this.resolver.satisfies(user, s)
    )
  }

  // السرّي لغير أطرافه: تُحجب هوية المقدّم ومنشئه ومحتواه وتعليقات المعتمدين،
  // ومعرّف المعتمد المحلول ومن تصرّف فعلاً (مدير القسم/الفرع يكشف إدارة المقدّم)
  private maskConfidential(r: Request & { approvals?: RequestApproval[] }) {
    return {
      ...r,
      requesterId: null,
      createdByUserId: null,
      payload: null,
      resolvedSteps: JSON.stringify(
        this.parseSteps(r.resolvedSteps).map((s) => ({ ...s, approverEmployeeId: null }))
      ),
      ...(r.approvals
        ? {
            approvals: r.approvals.map((a) => ({ ...a, approverId: null, comment: null })),
          }
        : {}),
      confidentialMasked: true,
    }
  }

  private parseSteps(raw?: string | null): ResolvedStep[] {
    try {
      const v = JSON.parse(raw ?? '[]')
      return Array.isArray(v) ? v.filter(s => s && typeof s === 'object').map(s => ({ ...s, action: normalizeApprovalAction(s.action) })) : []
    } catch {
      return []
    }
  }

  private withCanonicalStepActions<T extends Request>(request: T): T {
    return { ...request, resolvedSteps: JSON.stringify(this.parseSteps(request.resolvedSteps)) }
  }

  private leavePayload(type: RequestType, payload: Record<string, unknown>) {
    try {
      const value = normalizedLeavePayload(payload, type.code)
      const fixed = legacyLeaveCode(type.code)
      if (fixed && leaveCodeOf(value, type.code) !== fixed) throw new Error('LEAVE_CODE_CONFLICT')
      return value
    } catch {
      throw new BadRequestException('كود الإجازة لا يطابق تعريف الطلب أو يوجد تعارض بين leaveTypeCode وleaveType')
    }
  }

  // Old catalog rows must expose the inputs their newly implemented destinations
  // require, without running a seed or changing customer configuration.
  private executionFormFields(type: RequestType) {
    if (isSalaryChangeType(type)) {
      const required = this.requiredRequestFields(type)
      const configured = type.customFields ? JSON.parse(type.customFields) : []
      const fields = (Array.isArray(configured) ? configured : []).filter(field => !['increase_pct', 'salaryChangeBasis', 'salaryChangeApproval', ...SALARY_CHANGE_CLIENT_FIELDS].includes(field.key))
      fields.push({ key: 'newSalary', label: 'الراتب الأساسي الجديد', type: 'text', required: true },
        { key: 'effectiveDate', label: 'تاريخ سريان الزيادة', type: 'date', required: true }, { key: 'reason', label: 'سبب زيادة الراتب', type: 'text', required: true })
      for (const key of required) if (!fields.some(field => field.key === key)) fields.push({ key, label: key, type: 'text', required: true })
      return { requiredFields: JSON.stringify(required), customFields: JSON.stringify(fields) }
    }
    if (type.code === 'OVERTIME' && type.destinationHandler === 'overtime_entries') {
      return { requiredFields: JSON.stringify(this.requiredRequestFields(type)) }
    }
    type Field = { key: string; label: string; type: string; required?: boolean; options?: string[] }
    const definitions: Record<string, Field[]> = {
      LOAN_INSTALLMENT_DEFER: [
        { key: 'loanId', label: 'رقم السلفة', type: 'number', required: true },
        { key: 'installmentId', label: 'رقم القسط المفتوح', type: 'number', required: true },
        { key: 'toPeriod', label: 'شهر التأجيل (YYYY-MM)', type: 'text', required: true },
        { key: 'reason', label: 'سبب التأجيل', type: 'text', required: true },
      ],
      PERSONAL_DATA_UPDATE: [{ key: 'phone', label: 'رقم الهاتف', type: 'text' }, { key: 'phoneAlt', label: 'رقم هاتف بديل', type: 'text' }, { key: 'address', label: 'العنوان', type: 'text' }, { key: 'maritalStatus', label: 'الحالة الاجتماعية', type: 'select', options: ['single', 'married', 'divorced', 'widowed'] }],
      EMERGENCY_CONTACT: [{ key: 'name', label: 'اسم جهة اتصال الطوارئ', type: 'text', required: true }, { key: 'phone', label: 'رقم جهة اتصال الطوارئ', type: 'text', required: true }, { key: 'relation', label: 'صلة القرابة', type: 'text' }, { key: 'phoneAlt', label: 'رقم طوارئ بديل', type: 'text' }],
      TITLE_CHANGE: [{ key: 'toTitle', label: 'المسمى الوظيفي الجديد', type: 'text', required: true }, { key: 'effectiveDate', label: 'تاريخ السريان (اختياري)', type: 'date' }],
      CONTRACT_RENEWAL: [{ key: 'contractStart', label: 'بداية العقد الجديد', type: 'date', required: true }, { key: 'contractEnd', label: 'نهاية العقد الجديد', type: 'date', required: true }, { key: 'contractNumber', label: 'رقم العقد', type: 'text' }],
      CONTRACT_TYPE_CHANGE: [{ key: 'contractType', label: 'نوع العقد الجديد', type: 'select', required: true, options: ['permanent', 'fixed_term', 'part_time', 'seasonal'] }, { key: 'contractStart', label: 'بداية العقد (اختياري)', type: 'date' }, { key: 'contractEnd', label: 'نهاية العقد (للعقد محدد المدة)', type: 'date' }, { key: 'contractNumber', label: 'رقم العقد', type: 'text' }, { key: 'effectiveDate', label: 'تاريخ السريان (اختياري)', type: 'date' }],
      SHIFT_SWAP: [{ key: 'date', label: 'تاريخ ورديتك', type: 'date', required: true }, { key: 'withEmployeeId', label: 'رقم الموظف البديل', type: 'number', required: true }, { key: 'withDate', label: 'تاريخ وردية الموظف البديل (اختياري؛ نفس اليوم افتراضياً)', type: 'date' }],
    }
    const defaults = type.destinationHandler === 'letter_pdf_generator'
      ? [{ key: 'purpose', label: 'الغرض من الخطاب', type: 'text' }] : definitions[type.code]
    if (!defaults) return {}
    const required: string[] = type.requiredFields ? JSON.parse(type.requiredFields) : []
    const custom: Field[] = type.customFields ? JSON.parse(type.customFields) : []
    const fields = [...custom]
    for (const field of defaults) {
      if (!fields.some(f => f.key === field.key)) fields.push(field)
      if (field.required && !required.includes(field.key)) required.push(field.key)
    }
    // Custom forms take precedence over requiredFields in the client. Keep every
    // configured required key visible when adding a default custom input.
    for (const key of required) if (!fields.some(f => f.key === key)) fields.push({ key, label: key, type: 'text', required: true })
    return { requiredFields: JSON.stringify(required), customFields: JSON.stringify(fields) }
  }

  private async assertAttachmentOwnership(req: Request, actor: JwtPayload) {
    const fileIds = new Set<number>()
    const inspect = (value: unknown) => {
      if (typeof value === 'string' && /^file:\d+$/.test(value)) fileIds.add(Number(value.slice(5)))
      else if (Array.isArray(value)) value.forEach(inspect)
      else if (value && typeof value === 'object') Object.values(value).forEach(inspect)
    }
    inspect(JSON.parse(req.payload || '{}'))
    for (const id of fileIds) {
      const file = Number.isSafeInteger(id) && id > 0 ? await this.ds.getRepository(StoredFile).findOne({ where: { id } }) : null
      if (!file || !(file.uploadedBy === actor.sub || (!!req.createdByUserId && file.uploadedBy === req.createdByUserId) || file.employeeId === req.requesterId)) {
        throw new ForbiddenException('أحد المرفقات غير موجود أو لا يخص مقدم الطلب أو الموظف المستهدف')
      }
    }
  }

  // القائمة البيضاء لحمولة النوع (SEC-REQ-2): أي مفتاح خارجها يُرفض بالاسم
  private assertPayloadKeys(type: RequestType, rawPayload?: string | null) {
    let payload: Record<string, unknown> | null = null
    try {
      payload = rawPayload ? JSON.parse(rawPayload) : null
    } catch {
      payload = null
    }
    if (type.code === LOAN_DEFERRAL_TYPE) { readStoredLoanDeferralPayload(payload ?? {}); return }
    const allowed = new Set<string>([
      ...COMMON_PAYLOAD_KEYS,
      ...(CATEGORY_PAYLOAD_KEYS[type.category] ?? []),
      ...(TYPE_PAYLOAD_KEYS[type.code] ?? []),
      ...(HANDLER_PAYLOAD_KEYS[type.destinationHandler] ?? []),
    ])
    // هذان الحقلان يكتبهما التقديم والاعتماد فقط؛ إنشاء العميل وإعادة تقديمه يرفضان تمريرهما.
    if (isSalaryChangeType(type)) { allowed.add('salaryChangeBasis'); allowed.add('salaryChangeApproval') }
    if (this.isOvertimeDefinition(type)) {
      allowed.add('previewFingerprint')
      this.assertOvertimeClientPayload(payload ?? {}, type.code === 'OVERTIME_AUTO')
      if (payload?.previewFingerprint != null && (typeof payload.previewFingerprint !== 'string' || !/^[a-f0-9]{64}$/.test(payload.previewFingerprint))) {
        throw new BadRequestException('مرجع معاينة الإضافي غير صالح؛ حدّث المعاينة وأعد المحاولة')
      }
    }
    try {
      const declared: unknown = JSON.parse(type.requiredFields || '[]')
      if (Array.isArray(declared)) declared.forEach((k) => allowed.add(String(k)))
    } catch {
      /* requiredFields تالف — تجاهل */
    }
    try {
      const custom: unknown = JSON.parse(type.customFields || '[]')
      if (Array.isArray(custom)) {
        for (const f of custom) if (f && typeof f.key === 'string') allowed.add(f.key)
      }
    } catch {
      /* customFields تالف — تجاهل */
    }
    const extra = Object.keys(payload ?? {}).filter((k) => !allowed.has(k))
    if (extra.length > 0) {
      throw new BadRequestException(
        `حقول غير معرّفة لنوع «${type.nameAr}»: ${extra.join('، ')} — أزِلها أو عرّفها في «أنواع الطلبات»`
      )
    }
    // SEC-EMP-2: قيم تُكتب في ملف الموظف — تُرفض من التقديم لا عند الاعتماد
    // النهائي (رمي المعالج بعد APPROVED يعلّق الطلب)
    const p = payload ?? {}
    if (type.destinationHandler === 'payroll_bank_secure' && p.iban != null && p.iban !== '') {
      assertIban(p.iban)
    }
    // اسم البنك اختياري — لكنه إن وُجد يُكتب في ملف الموظف (عمود 100)
    if (type.destinationHandler === 'payroll_bank_secure' && p.bankName) {
      assertBankName(p.bankName)
    }
    // «تحديث البيانات»: القيمة تُكتب كما هي في عمود الموظف (والطوارئ تُنفَّذ آلياً
    // بلا معتمد) — نوعها وطولها بطول العمود نفسه يُفحصان هنا، لا بخطأ قاعدة داخل المعالج
    const recordFields = RECORD_UPDATE_FIELDS[type.destinationHandler]
    if (recordFields) {
      const labels: Record<string, string> = {
        phone: 'رقم الهاتف',
        email: 'البريد الإلكتروني',
        name: 'الاسم',
        relation: 'صلة القرابة',
      }
      const meta = this.ds.getMetadata(Employee)
      for (const [key, col] of Object.entries(recordFields)) {
        const v = p[key]
        if (v === undefined || v === null || v === '') continue
        const label = labels[key] ?? key
        if (typeof v !== 'string' && typeof v !== 'number') {
          throw new BadRequestException(`«${label}» يجب أن يكون نصاً`)
        }
        const max = Number(meta.findColumnWithPropertyName(String(col))?.length) || 0
        if (max > 0 && String(v).length > max) {
          throw new BadRequestException(`«${label}» أطول من الحد المسموح (${max} حرفاً)`)
        }
      }
    }
    if (
      type.destinationHandler === 'employee_update_promotions' &&
      p.toTitle != null &&
      p.toTitle !== ''
    ) {
      assertJobTitle(p.toTitle)
    }
  }

  // SEC-EMP-2: عند التقديم البنك/المسمى إلزاميان وصالحان (المسودة وحدها تُحفظ ناقصة) —
  // الفارغ كان يصل المعالج فيرمي بعد APPROVED ويعلّق الطلب. يُستدعى من التقديم
  // المباشر وتقديم المسودة وإعادة التقديم
  private assertSubmitValues(type: RequestType, rawPayload?: string | null) {
    let p: Record<string, unknown> = {}
    try {
      p = rawPayload ? JSON.parse(rawPayload) : {}
    } catch {
      /* حمولة تالفة — تُعامل كفارغة فتُرفض أدناه */
    }
    if (type.code === LOAN_DEFERRAL_TYPE) {
      const stored = readStoredLoanDeferralPayload(p)
      assertLoanDeferralClientPayload(Object.fromEntries(LOAN_DEFERRAL_FIELDS.map(key => [key, stored[key]])), true)
      return
    }
    if (isSalaryChangeType(type)) {
      if (p.salaryChangeBasis != null || p.salaryChangeApproval != null) readStoredSalaryChangePayload(p)
      else assertSalaryChangeClientPayload(p, true)
    }
    if (type.destinationHandler === 'loans_installments' && type.code !== 'EARLY_LOAN_SETTLEMENT') loanScheduleAmounts(p.amount, p.months ?? 1)
    if (type.code === 'EARLY_LOAN_SETTLEMENT' || type.destinationHandler === 'loan_early_settlement') assertLoanReferenceId(p.loanId)
    const required = this.requiredRequestFields(type)
    const custom: Array<{ key: string; label: string; required?: boolean; type: string; options?: string[] }> =
      type.customFields ? JSON.parse(type.customFields) : []
    for (const f of custom) {
      if (isSalaryChangeType(type) && ['increase_pct', 'salaryChangeBasis', 'salaryChangeApproval'].includes(f.key)) continue
      if (f.required && !required.includes(f.key)) required.push(f.key)
      const value = p[f.key]
      if (value == null || value === '') continue
      if (f.type === 'number' && !Number.isFinite(Number(value))) {
        throw new BadRequestException(`قيمة «${f.label}» يجب أن تكون رقماً`)
      }
      if (f.type === 'select' && f.options && !f.options.includes(String(value))) {
        throw new BadRequestException(`قيمة «${f.label}» خارج الخيارات المسموحة`)
      }
    }
    const missing = required.filter(key => p[key] == null || (typeof p[key] === 'string' && !String(p[key]).trim()))
    if (missing.length) throw new BadRequestException(`حقول ناقصة: ${missing.join('، ')}`)
    if (type.destinationHandler === 'payroll_bank_secure') assertIban(p.iban)
    if (type.destinationHandler === 'employee_update_promotions') {
      assertJobTitle(p.toTitle)
    }
    assertEmploymentValues(type, p)
  }

  private requiredRequestFields(type: RequestType): string[] {
    if (type.code === LOAN_DEFERRAL_TYPE) return [...LOAN_DEFERRAL_FIELDS]
    const required: string[] = type.requiredFields ? JSON.parse(type.requiredFields) : []
    if (isSalaryChangeType(type)) return [...new Set([...required.filter(key => !['increase_pct', 'salaryChangeBasis', 'salaryChangeApproval'].includes(key)), ...SALARY_CHANGE_CLIENT_FIELDS])]
    // الساعات الاختيارية القديمة للعادي تأتي من البصمة؛ إلزام المستثنى يُفحص من دليل يومه عند التقديم.
    // حقول العميل المخصصة المطلوبة تُضاف بعد هذه القائمة ولا تتغير إعداداتها المحفوظة.
    return type.code === 'OVERTIME' && type.destinationHandler === 'overtime_entries' ? required.filter(key => key !== 'hours') : required
  }

  // طلب داخل نطاق فرع المستخدم
  private async scoped(user: JwtPayload, id: number, em?: EntityManager): Promise<Request> {
    if (em) await this.lockFinancialRequestPrelude(em, id)
    const repo = em ? em.getRepository(Request) : this.requests
    const req = await repo.findOne({ where: { id }, ...(em ? { lock: { mode: 'pessimistic_write' as const } } : {}) })
    if (!req) throw new NotFoundException('الطلب غير موجود')
    const scope = branchScopeOf(user)
    const isOwner = req.requesterId === user.employeeId
    if (scope !== null && req.branchId !== scope && !isOwner) {
      throw new ForbiddenException('خارج نطاق فرعك')
    }
    return req
  }
}
