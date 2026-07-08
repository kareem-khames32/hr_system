import { Injectable, Logger } from '@nestjs/common'
import { EntityManager, In } from 'typeorm'
import {
  ClearanceItem,
  OffboardingCase,
} from '../offboarding/offboarding.entities'
import { LeaveBalancesService } from './leave-balances.service'
import { Request } from './entities/request.entity'
import { RequestType } from './entities/request-type.entity'
import { Leave, LeaveType } from './entities/leave.entities'
import {
  AttendanceCorrection,
  OvertimeEntry,
} from './entities/attendance.entities'
import { Loan, LoanInstallment } from './entities/financial.entities'
import {
  EmployeeStatusHistory,
  Promotion,
  Transfer,
} from './entities/employment.entities'
import { Asset, CustodyAssignment } from './entities/custody.entities'
import { LetterRequest } from './entities/letter.entities'
import { Employee } from '../employees/employee.entity'

// ناتج تنفيذ الوجهة: المرجع الدائم + هل اكتمل فوراً أم ينتظر (سريان/تأكيد استلام)
export interface DestinationResult {
  ref: string
  completed: boolean
  note?: string
}

type Handler = (
  em: EntityManager,
  req: Request,
  type: RequestType,
  payload: Record<string, any>
) => Promise<DestinationResult>

const refOf = (prefix: string, id: number): string =>
  `${prefix}-${new Date().getFullYear()}-${String(id).padStart(6, '0')}`

@Injectable()
export class DestinationsService {
  private readonly logger = new Logger(DestinationsService.name)

  constructor(private readonly leaveBalances: LeaveBalancesService) {}

  // ===== القاعدة الذهبية: كل طلب معتمد يُكتب في سجل دائم =====
  async execute(
    em: EntityManager,
    req: Request,
    type: RequestType
  ): Promise<DestinationResult> {
    const payload = req.payload ? JSON.parse(req.payload) : {}
    // «بدون تنفيذ آلي»: الطلب نفسه هو السجل الدائم
    if (type.destinationHandler === 'none') {
      return { ref: refOf('REQ', req.id), completed: true }
    }
    const handler = this.handlers[type.destinationHandler]
    if (!handler) {
      // handler لسه متبنّاش — الطلب نفسه هو السجل الدائم القابل للفلترة
      this.logger.warn(
        `لا يوجد handler لـ ${type.destinationHandler} — سجل عام REQ`
      )
      return { ref: refOf('REQ', req.id), completed: true }
    }
    return handler(em, req, type, payload)
  }

  // ========== الإجازات ==========

  private leaveHandler =
    (deductBalance: boolean): Handler =>
    async (em, req, _type, payload) => {
      const leave = await em.getRepository(Leave).save({
        requestId: req.id,
        employeeId: req.requesterId,
        leaveType: String(payload.leaveType ?? _type.code.replace('LEAVE_', '')),
        fromDate: String(payload.fromDate),
        toDate: String(payload.toDate),
        days: Number(payload.days),
        status: 'APPROVED',
      })

      if (deductBalance) {
        const lt = await em.getRepository(LeaveType).findOne({
          where: { code: leave.leaveType },
        })
        const balanceType = lt?.balanceSource ?? 'annual'
        if (balanceType !== 'none') {
          // خصم بالطبقات: الافتتاحي الساري أولاً ثم استحقاق السنة
          await this.leaveBalances.deduct(
            em,
            req.requesterId,
            balanceType,
            Number(leave.days),
            leave.fromDate
          )
        }
      }
      return { ref: refOf('LV', leave.id), completed: true }
    }

  // إلغاء/تعديل إجازة: يلغي الإجازة الأصلية ويرجّع الرصيد
  private leaveRestoreHandler: Handler = async (em, req, _type, payload) => {
    const originalLeaveId = Number(payload.leaveId)
    const leave = await em.getRepository(Leave).findOne({
      where: { id: originalLeaveId, employeeId: req.requesterId },
    })
    if (!leave) {
      return {
        ref: refOf('LVX', req.id),
        completed: true,
        note: 'الإجازة الأصلية غير موجودة',
      }
    }
    leave.status = 'CANCELLED'
    await em.getRepository(Leave).save(leave)

    const lt = await em.getRepository(LeaveType).findOne({
      where: { code: leave.leaveType },
    })
    const balanceType = lt?.balanceSource ?? 'annual'
    if (balanceType !== 'none') {
      await this.leaveBalances.restore(
        em,
        req.requesterId,
        balanceType,
        Number(leave.days),
        leave.fromDate.slice(0, 4)
      )
    }
    return { ref: refOf('LVX', leave.id), completed: true }
  }

  // ========== الحضور والأوفرتايم ==========

  private overtimeHandler: Handler = async (em, req, _type, payload) => {
    const entry = await em.getRepository(OvertimeEntry).save({
      requestId: req.id,
      employeeId: req.requesterId,
      date: String(payload.date),
      source: 'PRE_REQUESTED',
      hoursRequested: Number(payload.hours),
      // payable = min(المعتمد، الفعلي) — يُحسب عند مزامنة البصمة
      rate: payload.rate ? Number(payload.rate) : 1.5,
      status: 'APPROVED',
    })
    return { ref: refOf('OT', entry.id), completed: true }
  }

  private punchCorrectionHandler: Handler = async (em, req, _t, payload) => {
    const row = await em.getRepository(AttendanceCorrection).save({
      requestId: req.id,
      employeeId: req.requesterId,
      date: String(payload.date),
      reason: String(payload.reason ?? ''),
      correctedPunch: JSON.stringify({
        in: payload.in ?? null,
        out: payload.out ?? null,
      }),
    })
    return { ref: refOf('AC', row.id), completed: true }
  }

  // ========== المالية ==========

  private loanHandler: Handler = async (em, req, _t, payload) => {
    const amount = Number(payload.amount)
    const months = Math.max(1, Number(payload.months ?? 1))
    const loan = await em.getRepository(Loan).save({
      requestId: req.id,
      employeeId: req.requesterId,
      amount,
      status: 'APPROVED',
    })
    // جدول السداد: أقساط شهرية متساوية تبدأ من الشهر القادم
    const per = Math.round((amount / months) * 100) / 100
    const rows: Partial<LoanInstallment>[] = []
    const start = new Date()
    for (let i = 1; i <= months; i++) {
      // تنسيق محلي — toISOString يزحزح اليوم بفارق التوقيت
      const due = new Date(start.getFullYear(), start.getMonth() + i, 1)
      const dueDate = `${due.getFullYear()}-${String(due.getMonth() + 1).padStart(2, '0')}-01`
      rows.push({
        loanId: loan.id,
        dueDate,
        // القسط الأخير يمتص فروق التقريب
        amount: i === months ? amount - per * (months - 1) : per,
      })
    }
    await em.getRepository(LoanInstallment).save(rows)
    return { ref: refOf('LN', loan.id), completed: true }
  }

  private salaryUpdateHandler: Handler = async (em, req, _t, payload) => {
    const emp = await em.getRepository(Employee).findOne({
      where: { id: req.requesterId },
    })
    if (!emp) return { ref: refOf('SAL', req.id), completed: true }
    const oldSalary = emp.basicSalary
    emp.basicSalary = Number(payload.newSalary)
    await em.getRepository(Employee).save(emp)
    const hist = await em.getRepository(EmployeeStatusHistory).save({
      employeeId: emp.id,
      oldStatus: `salary:${oldSalary ?? 0}`,
      newStatus: `salary:${emp.basicSalary}`,
      reason: String(payload.reason ?? 'زيادة راتب معتمدة'),
      requestId: req.id,
    })
    return { ref: refOf('SAL', hist.id), completed: true }
  }

  // ========== الحالة الوظيفية ==========

  private transferHandler: Handler = async (em, req, _t, payload) => {
    const emp = await em.getRepository(Employee).findOne({
      where: { id: Number(payload.employeeId ?? req.requesterId) },
    })
    if (!emp) return { ref: refOf('TR', req.id), completed: true }

    const effectiveDate = String(payload.effectiveDate)
    const today = new Date().toISOString().slice(0, 10)
    const transfer = await em.getRepository(Transfer).save({
      requestId: req.id,
      employeeId: emp.id,
      fromTeam: emp.teamId ?? 0,
      toTeam: Number(payload.toTeamId),
      effectiveDate,
      status: 'SCHEDULED',
    })

    // §7.2: التنفيذ الآلي بتاريخ السريان — لو التاريخ حل نفّذ فوراً،
    // غير كده يبقى الطلب IN_EXECUTION والـ scheduler اليومي ينفّذه
    if (effectiveDate <= today) {
      await this.executeTransfer(em, transfer.id)
      return { ref: refOf('TR', transfer.id), completed: true }
    }
    return {
      ref: refOf('TR', transfer.id),
      completed: false,
      note: `مجدول للتنفيذ في ${effectiveDate}`,
    }
  }

  // ينفّذ نقلاً مجدولاً: يحدّث فريق الموظف + يسجّل التاريخ الوظيفي
  async executeTransfer(em: EntityManager, transferId: number): Promise<void> {
    const transfer = await em.getRepository(Transfer).findOne({
      where: { id: transferId },
    })
    if (!transfer || transfer.status === 'EXECUTED') return
    const emp = await em.getRepository(Employee).findOne({
      where: { id: transfer.employeeId },
    })
    if (emp) {
      emp.teamId = transfer.toTeam
      await em.getRepository(Employee).save(emp)
    }
    transfer.status = 'EXECUTED'
    transfer.executedAt = new Date()
    await em.getRepository(Transfer).save(transfer)
    await em.getRepository(EmployeeStatusHistory).save({
      employeeId: transfer.employeeId,
      oldStatus: `team:${transfer.fromTeam}`,
      newStatus: `team:${transfer.toTeam}`,
      reason: 'نقل بين الفرق — تنفيذ بتاريخ السريان',
      requestId: transfer.requestId,
    })
  }

  private promotionHandler: Handler = async (em, req, _t, payload) => {
    const emp = await em.getRepository(Employee).findOne({
      where: { id: Number(payload.employeeId ?? req.requesterId) },
    })
    if (!emp) return { ref: refOf('PR', req.id), completed: true }
    const promo = await em.getRepository(Promotion).save({
      requestId: req.id,
      employeeId: emp.id,
      fromTitle: emp.jobTitle ?? '',
      toTitle: String(payload.toTitle),
      effectiveDate: String(
        payload.effectiveDate ?? new Date().toISOString().slice(0, 10)
      ),
    })
    emp.jobTitle = String(payload.toTitle)
    await em.getRepository(Employee).save(emp)
    await em.getRepository(EmployeeStatusHistory).save({
      employeeId: emp.id,
      oldStatus: `title:${promo.fromTitle}`,
      newStatus: `title:${promo.toTitle}`,
      reason: 'ترقية معتمدة',
      requestId: req.id,
    })
    return { ref: refOf('PR', promo.id), completed: true }
  }

  // تحديث بيانات الموظف (حقول مسموحة فقط) + سجل تدقيق
  private employeeRecordHandler: Handler = async (em, req, _t, payload) => {
    const emp = await em.getRepository(Employee).findOne({
      where: { id: req.requesterId },
    })
    if (!emp) return { ref: refOf('EMP', req.id), completed: true }
    const allowed = ['phone', 'email', 'bankName'] as const
    const changes: string[] = []
    for (const f of allowed) {
      if (payload[f] !== undefined && payload[f] !== (emp as any)[f]) {
        changes.push(`${f}: ${(emp as any)[f] ?? '—'} → ${payload[f]}`)
        ;(emp as any)[f] = payload[f]
      }
    }
    await em.getRepository(Employee).save(emp)
    const hist = await em.getRepository(EmployeeStatusHistory).save({
      employeeId: emp.id,
      oldStatus: 'data_update',
      newStatus: 'data_update',
      reason: changes.join(' | ') || 'تحديث بيانات',
      requestId: req.id,
    })
    return { ref: refOf('EMP', hist.id), completed: true }
  }

  // المسار الأمني: تغيير الحساب البنكي — بعد الدورة الأمنية فقط
  private bankChangeHandler: Handler = async (em, req, _t, payload) => {
    const emp = await em.getRepository(Employee).findOne({
      where: { id: req.requesterId },
    })
    if (!emp) return { ref: refOf('BNK', req.id), completed: true }
    const old = emp.iban
    emp.iban = String(payload.iban)
    if (payload.bankName) emp.bankName = String(payload.bankName)
    await em.getRepository(Employee).save(emp)
    const hist = await em.getRepository(EmployeeStatusHistory).save({
      employeeId: emp.id,
      oldStatus: `iban:${old ?? '—'}`,
      newStatus: `iban:${emp.iban}`,
      reason: 'تغيير حساب بنكي — مسار أمني',
      requestId: req.id,
    })
    return { ref: refOf('BNK', hist.id), completed: true }
  }

  // تغيير الحالة الوظيفية: استقالة → فترة إشعار + فتح إخلاء الطرف أوتوماتيك
  private employeeStatusHandler: Handler = async (em, req, type, payload) => {
    const emp = await em.getRepository(Employee).findOne({
      where: { id: req.requesterId },
    })
    if (!emp) return { ref: refOf('ST', req.id), completed: true }
    const oldStatus = emp.status
    const newStatus =
      type.code === 'RESIGNATION'
        ? 'notice_period'
        : type.code === 'RETIREMENT'
          ? 'archived'
          : String(payload.newStatus ?? emp.status)
    emp.status = newStatus as any
    if (newStatus === 'archived') emp.isActive = false
    await em.getRepository(Employee).save(emp)
    const hist = await em.getRepository(EmployeeStatusHistory).save({
      employeeId: emp.id,
      oldStatus,
      newStatus,
      reason:
        type.code === 'RESIGNATION'
          ? `استقالة — آخر يوم عمل ${payload.lastWorkingDate ?? '—'}: ${payload.reason ?? ''}`
          : String(payload.reason ?? type.nameAr),
      requestId: req.id,
    })

    // §2.7: الاستقالة المعتمدة تفتح حالة إخلاء طرف بجهاتها الخمس
    if (type.code === 'RESIGNATION') {
      const existing = await em.getRepository(OffboardingCase).findOne({
        where: { employeeId: emp.id, status: In(['IN_CLEARANCE', 'IN_SETTLEMENT', 'SETTLED']) },
      })
      if (!existing) {
        const kase = await em.getRepository(OffboardingCase).save({
          employeeId: emp.id,
          resignationRequestId: req.id,
          lastWorkingDay: String(
            payload.lastWorkingDate ?? new Date().toISOString().slice(0, 10)
          ),
          status: 'IN_CLEARANCE' as const,
        })
        const openCustody = await em.getRepository(CustodyAssignment).count({
          where: {
            employeeId: emp.id,
            status: In(['PENDING_ACK', 'PENDING_MANAGER_CONFIRM', 'ACTIVE', 'RETURN_REQUESTED']),
          },
        })
        await em.getRepository(ClearanceItem).save([
          { caseId: kase.id, party: 'manager', label: 'تسليم المهام ونقل المعرفة' },
          {
            caseId: kase.id,
            party: 'custody',
            label: `إرجاع العهد والأصول${openCustody ? ` (${openCustody} عهدة مفتوحة)` : ' (لا عهد مفتوحة)'}`,
          },
          { caseId: kase.id, party: 'it', label: 'إلغاء الصلاحيات والأجهزة' },
          { caseId: kase.id, party: 'finance', label: 'تسوية السلف وحساب المستحقات' },
          { caseId: kase.id, party: 'hr', label: 'تسليم الوثائق وشهادة الخبرة' },
        ] as any)
        return {
          ref: refOf('OFB', kase.id),
          completed: true,
          note: 'فُتحت حالة إخلاء الطرف',
        }
      }
    }
    return { ref: refOf('ST', hist.id), completed: true }
  }

  // ========== الخطابات ==========

  private letterHandler: Handler = async (em, req, type, payload) => {
    const letter = await em.getRepository(LetterRequest).save({
      requestId: req.id,
      employeeId: req.requesterId,
      letterType: type.code.replace('LETTER_', ''),
      purpose: String(payload.purpose ?? ''),
      status: 'GENERATED',
      // توليد PDF فعلي لاحقاً — المرجع محجوز من الآن
      generatedPdfRef: `letters/${type.code}/${req.id}.pdf`,
    })
    return { ref: refOf('LTR', letter.id), completed: true }
  }

  // ========== العهدة ==========

  // تسليم عهدة: يُنشئ الإسناد بانتظار تأكيد استلام الموظف (الملزِم قانونياً)
  private custodyAssignHandler: Handler = async (em, req, _t, payload) => {
    let assetId = Number(payload.assetId)
    if (!assetId) {
      const asset = await em.getRepository(Asset).save({
        name: String(payload.assetName ?? 'أصل جديد'),
        category: String(payload.category ?? 'عام'),
        serialNumber: payload.serialNumber
          ? String(payload.serialNumber)
          : undefined,
      })
      assetId = asset.id
    }
    const row = await em.getRepository(CustodyAssignment).save({
      requestId: req.id,
      assetId,
      employeeId: req.requesterId,
      status: 'PENDING_ACK',
    })
    return {
      ref: refOf('CU', row.id),
      completed: false,
      note: 'بانتظار تأكيد استلام الموظف',
    }
  }

  // إرجاع عهدة
  private custodyReturnHandler: Handler = async (em, req, _t, payload) => {
    const row = await em.getRepository(CustodyAssignment).findOne({
      where: {
        id: Number(payload.assignmentId),
        employeeId: req.requesterId,
      },
    })
    if (!row) {
      return {
        ref: refOf('CUR', req.id),
        completed: true,
        note: 'الإسناد غير موجود',
      }
    }
    row.status = 'RETURNED'
    row.returnedAt = new Date()
    row.condition = String(payload.condition ?? 'سليمة')
    await em.getRepository(CustodyAssignment).save(row)
    await em
      .getRepository(Asset)
      .update({ id: row.assetId }, { currentHolderId: undefined as any })
    return { ref: refOf('CUR', row.id), completed: true }
  }

  // ========== سجل الـ handlers — الأكواد من كتالوج الطلبات ==========

  private readonly handlers: Record<string, Handler> = {
    // إجازات
    leave_calendar_balance: this.leaveHandler(true),
    leave_calendar: this.leaveHandler(true),
    leave_calendar_payroll: this.leaveHandler(false),
    leave_calendar_once: this.leaveHandler(false),
    leave_balance_restore: this.leaveRestoreHandler,
    // حضور
    overtime_entries: this.overtimeHandler,
    attendance_corrections: this.punchCorrectionHandler,
    // مالية
    loans_installments: this.loanHandler,
    salary_update_history: this.salaryUpdateHandler,
    // حالة وظيفية
    transfers_effective_date: this.transferHandler,
    employee_update_promotions: this.promotionHandler,
    // بيانات شخصية
    employee_record: this.employeeRecordHandler,
    employee_record_auto: this.employeeRecordHandler,
    payroll_bank_secure: this.bankChangeHandler,
    // حالة وظيفية (استقالة/تقاعد)
    employee_status: this.employeeStatusHandler,
    // خطابات
    letter_pdf_generator: this.letterHandler,
    // عهدة
    custody_assignments_ack: this.custodyAssignHandler,
    custody_assignments: this.custodyReturnHandler,
    // الباقي (تدريب/ER/مصروفات...) يسقط على السجل العام REQ لحين بناء موديولاته
  }
}
