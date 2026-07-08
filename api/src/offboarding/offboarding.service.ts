import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  Logger,
  NotFoundException,
} from '@nestjs/common'
import { Cron } from '@nestjs/schedule'
import { InjectRepository } from '@nestjs/typeorm'
import { In, Repository } from 'typeorm'
import type { JwtPayload } from '../auth/auth.service'
import { userHasPerm } from '../auth/guards'
import { Employee } from '../employees/employee.entity'
import { ApproverResolver } from '../requests/approver-resolver.service'
import { CustodyAssignment } from '../requests/entities/custody.entities'
import { EmployeeStatusHistory } from '../requests/entities/employment.entities'
import { OvertimeEntry } from '../requests/entities/attendance.entities'
import { Loan, LoanInstallment } from '../requests/entities/financial.entities'
import { LeaveBalance } from '../requests/entities/leave.entities'
import { RequestsConfig } from '../requests/entities/requests-config.entity'
import {
  ClearanceItem,
  ClearanceParty,
  OffboardingCase,
  SettlementLine,
} from './offboarding.entities'

const round2 = (n: number) => Math.round(n * 100) / 100

// صلاحية كل جهة في الـ checklist
const PARTY_PERMS: Record<ClearanceParty, string[]> = {
  manager: [], // المدير المباشر يُتحقق منه هيكلياً
  custody: ['custody.assign', 'approve.custody'],
  it: ['approve.it'],
  finance: ['approve.finance'],
  hr: ['offboarding.manage'],
}

@Injectable()
export class OffboardingService {
  private readonly logger = new Logger(OffboardingService.name)

  constructor(
    @InjectRepository(OffboardingCase)
    private readonly cases: Repository<OffboardingCase>,
    @InjectRepository(ClearanceItem)
    private readonly items: Repository<ClearanceItem>,
    @InjectRepository(SettlementLine)
    private readonly lines: Repository<SettlementLine>,
    @InjectRepository(Employee)
    private readonly employees: Repository<Employee>,
    @InjectRepository(CustodyAssignment)
    private readonly custody: Repository<CustodyAssignment>,
    @InjectRepository(LeaveBalance)
    private readonly balances: Repository<LeaveBalance>,
    @InjectRepository(OvertimeEntry)
    private readonly overtime: Repository<OvertimeEntry>,
    @InjectRepository(Loan) private readonly loans: Repository<Loan>,
    @InjectRepository(LoanInstallment)
    private readonly installments: Repository<LoanInstallment>,
    @InjectRepository(EmployeeStatusHistory)
    private readonly history: Repository<EmployeeStatusHistory>,
    @InjectRepository(RequestsConfig)
    private readonly config: Repository<RequestsConfig>,
    private readonly resolver: ApproverResolver
  ) {}

  // ===== القائمة والتفاصيل =====
  async list() {
    const rows = await this.cases.find({ order: { createdAt: 'DESC' } })
    const empIds = [...new Set(rows.map((c) => c.employeeId))]
    const emps = empIds.length
      ? await this.employees.find({ where: { id: In(empIds) } })
      : []
    const byId = new Map(emps.map((e) => [e.id, e]))
    return rows.map((c) => ({
      ...c,
      employeeName: byId.get(c.employeeId)?.fullName ?? `#${c.employeeId}`,
      employeeCode: byId.get(c.employeeId)?.employeeCode ?? '',
    }))
  }

  async detail(id: number) {
    const kase = await this.cases.findOne({ where: { id } })
    if (!kase) throw new NotFoundException('حالة إنهاء الخدمة غير موجودة')
    const employee = await this.employees.findOne({
      where: { id: kase.employeeId },
    })
    const items = await this.items.find({
      where: { caseId: id },
      order: { id: 'ASC' },
    })
    const lines = await this.lines.find({
      where: { caseId: id },
      order: { id: 'ASC' },
    })
    // العهد المفتوحة — بند العهدة لا يكتمل وهي موجودة
    const openCustody = await this.custody.find({
      where: {
        employeeId: kase.employeeId,
        status: In(['PENDING_ACK', 'PENDING_MANAGER_CONFIRM', 'ACTIVE', 'RETURN_REQUESTED']),
      },
    })
    const credits = lines
      .filter((l) => l.type === 'CREDIT')
      .reduce((s, l) => s + Number(l.amount), 0)
    const debits = lines
      .filter((l) => l.type === 'DEBIT')
      .reduce((s, l) => s + Number(l.amount), 0)
    return {
      ...kase,
      employee,
      items,
      lines,
      openCustodyCount: openCustody.length,
      net: round2(credits - debits),
    }
  }

  // ===== إتمام بند إخلاء طرف =====
  async completeItem(
    user: JwtPayload,
    itemId: number,
    dto: { note?: string; amount?: number }
  ) {
    const item = await this.items.findOne({ where: { id: itemId } })
    if (!item) throw new NotFoundException('البند غير موجود')
    if (item.status === 'DONE') {
      throw new BadRequestException('البند مكتمل بالفعل')
    }
    const kase = await this.cases.findOne({ where: { id: item.caseId } })
    if (!kase || kase.status !== 'IN_CLEARANCE') {
      throw new BadRequestException('الحالة ليست في مرحلة إخلاء الطرف')
    }

    // التفويض: المدير المباشر هيكلياً، والجهات بصلاحياتها، وHR/الأدمن دائماً
    const isHr = userHasPerm(user, 'offboarding.manage')
    if (!isHr) {
      if (item.party === 'manager') {
        const mgr = await this.resolver.directManagerOf(kase.employeeId)
        if (user.employeeId !== mgr) {
          throw new ForbiddenException('بند المدير المباشر يعتمده المدير المباشر')
        }
      } else {
        const allowed = PARTY_PERMS[item.party as ClearanceParty] ?? []
        if (!allowed.some((p) => userHasPerm(user, p))) {
          throw new ForbiddenException('لا تملك صلاحية هذه الجهة')
        }
      }
    }

    // §2.7: بند العهدة لا يكتمل والموظف ماسك عهدة
    if (item.party === 'custody') {
      const open = await this.custody.count({
        where: {
          employeeId: kase.employeeId,
          status: In(['PENDING_ACK', 'PENDING_MANAGER_CONFIRM', 'ACTIVE', 'RETURN_REQUESTED']),
        },
      })
      if (open > 0) {
        throw new BadRequestException(
          `الموظف لا يزال ماسكاً ${open} عهدة — أرجعها أولاً (أو وثّق قيمتها كخصم وحوّلها LOST)`
        )
      }
    }

    item.status = 'DONE'
    item.note = dto.note ?? item.note
    if (dto.amount !== undefined) item.amount = dto.amount
    item.doneBy = user.sub
    item.doneAt = new Date()
    await this.items.save(item)

    // كل البنود اكتملت؟ → بناء التصفية والانتقال لمرحلتها
    const remaining = await this.items.count({
      where: { caseId: kase.id, status: In(['PENDING', 'BLOCKED']) },
    })
    if (remaining === 0) {
      await this.buildSettlement(kase)
      kase.status = 'IN_SETTLEMENT'
      await this.cases.save(kase)
    }
    return this.detail(kase.id)
  }

  private async cfg(key: string, fallback: string) {
    const row = await this.config.findOne({ where: { key } })
    return row?.value ?? fallback
  }

  // ===== §2.8: بناء بنود التصفية آلياً من مالية الموظف الفعلية =====
  private async buildSettlement(kase: OffboardingCase) {
    const existing = await this.lines.count({ where: { caseId: kase.id } })
    if (existing > 0) return // مبنية من قبل
    const emp = await this.employees.findOne({ where: { id: kase.employeeId } })
    if (!emp) return

    const gross =
      Number(emp.basicSalary ?? 0) +
      Number(emp.housingAllowance ?? 0) +
      Number(emp.transportAllowance ?? 0) +
      Number(emp.otherAllowance ?? 0)
    const dayRate = gross / Number(await this.cfg('payroll.monthly_days', '30'))

    const rows: Partial<SettlementLine>[] = []

    // (+) مكافأة نهاية الخدمة — صيغة قابلة للإعداد:
    // شهور لكل سنة خدمة (الافتراضي 0.5 شهر/سنة — راجِعها مع القانوني)
    const monthsPerYear = Number(await this.cfg('eos.months_per_year', '0.5'))
    const start = new Date(emp.joinDate ?? emp.createdAt)
    const end = new Date(kase.lastWorkingDay)
    const years = Math.max(0, (end.getTime() - start.getTime()) / (365.25 * 86400000))
    const eos = round2(gross * monthsPerYear * years)
    if (eos > 0) {
      rows.push({
        caseId: kase.id,
        label: `مكافأة نهاية الخدمة (${years.toFixed(1)} سنة × ${monthsPerYear} شهر)`,
        type: 'CREDIT',
        amount: eos,
        isAuto: true,
      })
    }

    // (+) بدل رصيد الإجازات المتبقي (encashment)
    const period = kase.lastWorkingDay.slice(0, 4)
    const annual = await this.balances.findOne({
      where: { employeeId: emp.id, balanceType: 'annual', period },
    })
    if (annual) {
      const today = kase.lastWorkingDay
      const openingValid =
        !annual.openingExpiry || annual.openingExpiry >= today
      const openingAvail = openingValid
        ? Math.max(0, Number(annual.openingDays) - Number(annual.openingTaken))
        : 0
      const entitledTaken = Math.max(
        0,
        Number(annual.taken) - Number(annual.openingTaken)
      )
      const remaining =
        openingAvail + Math.max(0, Number(annual.entitled) - entitledTaken)
      if (remaining > 0) {
        rows.push({
          caseId: kase.id,
          label: `بدل رصيد إجازات (${remaining} يوم)`,
          type: 'CREDIT',
          amount: round2(remaining * dayRate),
          isAuto: true,
        })
      }
    }

    // (+) أوفرتايم معتمد لم يُصرف
    const unpaidOt = await this.overtime.find({
      where: { employeeId: emp.id, status: 'APPROVED' },
    })
    const otHours = unpaidOt.reduce((s, o) => s + Number(o.payableHours ?? 0), 0)
    if (otHours > 0) {
      const hourRate = dayRate / Number(await this.cfg('payroll.daily_hours', '8'))
      rows.push({
        caseId: kase.id,
        label: `أوفرتايم معتمد غير مصروف (${otHours} ساعة)`,
        type: 'CREDIT',
        amount: round2(otHours * 1.5 * hourRate),
        isAuto: true,
      })
    }

    // (−) رصيد السلف المتبقي
    const empLoans = await this.loans.find({ where: { employeeId: emp.id } })
    let loanRemaining = 0
    for (const loan of empLoans) {
      const inst = await this.installments.find({
        where: { loanId: loan.id, paid: false },
      })
      loanRemaining += inst.reduce((s, i) => s + Number(i.amount), 0)
    }
    if (loanRemaining > 0) {
      rows.push({
        caseId: kase.id,
        label: 'رصيد سلف متبقٍ',
        type: 'DEBIT',
        amount: round2(loanRemaining),
        isAuto: true,
      })
    }

    // (−) خصومات موثقة في بنود الإخلاء (عهدة تالفة/مفقودة...)
    const blockedAmounts = await this.items.find({
      where: { caseId: kase.id },
    })
    for (const it of blockedAmounts) {
      if (Number(it.amount ?? 0) > 0) {
        rows.push({
          caseId: kase.id,
          label: `خصم من إخلاء الطرف (${it.label})`,
          type: 'DEBIT',
          amount: Number(it.amount),
          isAuto: true,
        })
      }
    }

    if (rows.length > 0) await this.lines.save(this.lines.create(rows))
  }

  // ===== تحرير بنود التصفية (قبل الاعتماد فقط) =====
  private async editableCase(caseId: number) {
    const kase = await this.cases.findOne({ where: { id: caseId } })
    if (!kase) throw new NotFoundException('الحالة غير موجودة')
    if (kase.status !== 'IN_SETTLEMENT') {
      throw new BadRequestException(
        kase.status === 'IN_CLEARANCE'
          ? 'أكمل إخلاء الطرف أولاً'
          : 'التصفية معتمدة ومقفولة — لا تعديل'
      )
    }
    return kase
  }

  async addLine(
    caseId: number,
    dto: { label: string; type: 'CREDIT' | 'DEBIT'; amount: number }
  ) {
    await this.editableCase(caseId)
    if (!dto.label || !['CREDIT', 'DEBIT'].includes(dto.type)) {
      throw new BadRequestException('البند: label + type (CREDIT/DEBIT) + amount')
    }
    if (Number(dto.amount) < 0) {
      throw new BadRequestException('المبلغ لا يكون سالباً — اختر النوع بدلاً من الإشارة')
    }
    await this.lines.save(
      this.lines.create({
        caseId,
        label: dto.label,
        type: dto.type,
        amount: round2(Number(dto.amount)),
        isAuto: false,
      })
    )
    return this.detail(caseId)
  }

  async updateLine(
    lineId: number,
    dto: { label?: string; amount?: number }
  ) {
    const line = await this.lines.findOne({ where: { id: lineId } })
    if (!line) throw new NotFoundException('البند غير موجود')
    if (line.isAuto) {
      throw new BadRequestException(
        'البنود التلقائية يحسبها النظام ولا تُعدَّل — أضف بنداً يدوياً للتسوية'
      )
    }
    await this.editableCase(line.caseId)
    if (dto.label !== undefined) line.label = dto.label
    if (dto.amount !== undefined) {
      if (Number(dto.amount) < 0) {
        throw new BadRequestException('المبلغ لا يكون سالباً')
      }
      line.amount = round2(Number(dto.amount))
    }
    await this.lines.save(line)
    return this.detail(line.caseId)
  }

  // ===== اعتماد التصفية: قفل نهائي + مخرجات + إنهاء عند حلول الموعد =====
  async approveSettlement(user: JwtPayload, caseId: number) {
    const kase = await this.editableCase(caseId)
    const det = await this.detail(caseId)
    kase.settlementNet = det.net
    kase.settlementApprovedBy = user.sub
    kase.settlementApprovedAt = new Date()
    const year = new Date().getFullYear()
    kase.settlementDocRef = `SET-${year}-${String(kase.id).padStart(5, '0')}`
    kase.clearanceCertRef = `CLR-${year}-${String(kase.id).padStart(5, '0')}`
    kase.status = 'SETTLED'
    await this.cases.save(kase)

    // آخر يوم عمل عدّى؟ → إنهاء فوري
    const today = new Date().toISOString().slice(0, 10)
    if (kase.lastWorkingDay <= today) await this.finalize(kase)
    return this.detail(caseId)
  }

  // إنهاء الخدمة فعلياً: TERMINATED + أرشفة + توثيق
  private async finalize(kase: OffboardingCase) {
    const emp = await this.employees.findOne({ where: { id: kase.employeeId } })
    if (!emp || emp.status === 'terminated') return
    const old = emp.status
    emp.status = 'terminated'
    emp.isActive = false
    emp.archivedAt = new Date()
    emp.archiveReason = `انتهاء خدمة — آخر يوم عمل ${kase.lastWorkingDay}`
    await this.employees.save(emp)
    await this.history.save({
      employeeId: emp.id,
      oldStatus: old,
      newStatus: 'terminated',
      reason: `انتهاء خدمة — تصفية ${kase.settlementDocRef} بصافي ${kase.settlementNet}`,
      requestId: kase.resignationRequestId ?? undefined,
    })
    kase.status = 'CLOSED'
    await this.cases.save(kase)
    this.logger.log(`انتهت خدمة الموظف #${emp.id} — ${kase.settlementDocRef}`)
  }

  // يومياً 00:30: الحالات المعتمدة اللي حل آخر يوم عمل فيها
  @Cron('30 0 * * *')
  async finalizeDue() {
    const today = new Date().toISOString().slice(0, 10)
    const due = await this.cases.find({ where: { status: 'SETTLED' } })
    for (const kase of due) {
      if (kase.lastWorkingDay <= today) await this.finalize(kase)
    }
  }
}
