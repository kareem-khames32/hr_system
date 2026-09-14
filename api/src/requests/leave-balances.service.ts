import type { BalanceType } from '../common/domain-status'
import { BadRequestException, ConflictException, Injectable, NotFoundException } from '@nestjs/common'
import { InjectRepository } from '@nestjs/typeorm'
import { EntityManager, In, Not, Repository } from 'typeorm'
import { Employee } from '../employees/employee.entity'
import { Leave, LeaveBalance, LeaveBalanceAdjustment } from './entities/leave.entities'
import { Request } from './entities/request.entity'
import { RequestsConfig } from './entities/requests-config.entity'
import { localDateOf } from '../attendance/attendance.service'

// ============================================================
// الأرصدة بالطبقات:
// طبقة 1: الرصيد الافتتاحي المُرحّل (بصلاحية) — تُستهلك أولاً
// طبقة 2: استحقاق السنة الحالية
// الترحيل السنوي: المتبقي حتى حد أقصى → طبقة افتتاحية للسنة الجديدة
// ============================================================

export interface BalanceView {
  employeeId: number
  balanceType: BalanceType
  period: string
  opening: {
    days: number
    taken: number
    expiry: string | null
    expired: boolean
    available: number
  }
  // استحقاق السنة كاملة: السنة الجارية وما بعدها من سياسة الإجازات (السنوي 0
  // لغير المستحق)، والسنوات المنقضية كما خُزّنت في الصف
  annualEntitlement: number
  // المتراكم لتاريخه من استحقاق السنة حسب طريقة الاستحقاق — منه يُحسب المتبقي
  accruedToDate: number
  // = accruedToDate (للتوافق مع المستهلكين القدامى) — لا يُعرض كـ«استحقاق السنة»
  entitled: number
  entitledTaken: number
  totalTaken: number
  adjustmentDays: number
  remaining: number
  // المسحوب على المكشوف من الاستحقاق بعد نفاد المُرحّل (LEV-3) — 0 لو مفيش عجز
  deficit: number
}

// سياق الاستحقاق لموظف: التعيين + طريقة الاستحقاق + التجربة + استحقاق السياسة
interface AccrualContext {
  joinDate: string | null
  mode: string
  probationMonths: number
  policy: { annual: number; sick: number }
}

// إعدادات الاستحقاق العامة (مشتركة بين كل الموظفين) — الحساب الجماعي يقرأها مرة
interface AccrualSettings {
  mode: string
  probationMonths: number
  annual: number
  sick: number
}

const num = (v: unknown) => Number(v ?? 0)

@Injectable()
export class LeaveBalancesService {
  private rolloverRunning = false
  constructor(
    @InjectRepository(LeaveBalance)
    private readonly balances: Repository<LeaveBalance>,
    @InjectRepository(Employee)
    private readonly employees: Repository<Employee>,
    @InjectRepository(RequestsConfig)
    private readonly config: Repository<RequestsConfig>
  ) {}

  // الاستحقاق المتراكم لتاريخه من استحقاق السنة (entitled) بعد فترة التجربة:
  // شهري = entitled÷12 لكل شهر خدمة مكتمل داخل السنة، يومي = entitled÷أيام
  // السنة لكل يوم خدمة داخلها حتى onDate شاملاً، سنوي = كامل مقدماً
  private accruedEntitlement(
    bal: LeaveBalance,
    entitled: number,
    onDate: string,
    joinDate: string | null,
    mode: string,
    probationMonths: number,
    inclusiveEnd = false
  ): number {
    // الأنواع القانونية (مرضي) والوضع «سنوي» (مقدماً) → الاستحقاق كامل
    if (bal.balanceType !== 'annual' || (mode !== 'monthly' && mode !== 'daily')) {
      return entitled
    }

    const periodStart = new Date(`${bal.period}-01-01T12:00:00`)
    let start = periodStart
    if (joinDate) {
      const jd = new Date(`${joinDate}T12:00:00`)
      jd.setMonth(jd.getMonth() + probationMonths)
      if (jd > start) start = jd
    }
    const now = new Date(`${onDate}T12:00:00`)
    if (now < start) return 0
    if (mode === 'daily') {
      // أيام الخدمة داخل السنة حتى onDate شاملاً (بحدّ آخر يوم في السنة)
      const DAY = 24 * 60 * 60 * 1000
      const periodEnd = new Date(`${bal.period}-12-31T12:00:00`)
      const end = now > periodEnd ? periodEnd : now
      const yearDays =
        Math.round((periodEnd.getTime() - periodStart.getTime()) / DAY) + 1
      const days = Math.round((end.getTime() - start.getTime()) / DAY) + 1
      const accruedDaily = Math.round((days * entitled) / yearDays * 100) / 100
      return Math.min(entitled, Math.max(0, accruedDaily))
    }
    // Settlement includes the final working day, without changing opening-balance expiry or its year.
    if (inclusiveEnd) now.setDate(now.getDate() + 1)
    // عدد الشهور المكتملة من بداية الاستحقاق حتى اليوم
    let months =
      (now.getFullYear() - start.getFullYear()) * 12 +
      (now.getMonth() - start.getMonth())
    if (now.getDate() < start.getDate()) months -= 1
    months = Math.max(0, months)
    const accrued = Math.round((months * entitled) / 12 * 100) / 100
    return Math.min(entitled, accrued)
  }

  // استحقاق السنة كاملة: للسنة الجارية وما بعدها من سياسة الإجازات عشان تعديل
  // الإعدادات يسري فوراً (السنوي 0 لغير المستحق)؛ السنوات المنقضية كما خُزّنت
  private annualEntitlementOf(bal: LeaveBalance, ctx?: AccrualContext): number {
    const stored = num(bal.entitled)
    if (!ctx || bal.period < String(new Date().getFullYear())) return stored
    if (bal.balanceType === 'annual') return ctx.policy.annual
    if (bal.balanceType === 'sick') return ctx.policy.sick
    return stored
  }

  private view(
    bal: LeaveBalance,
    onDate: string,
    ctx?: AccrualContext,
    inclusiveEnd = false
  ): BalanceView {
    const expired =
      !!bal.openingExpiry && bal.openingExpiry < onDate ? true : false
    const openingAvailable = expired
      ? 0
      : Math.max(0, num(bal.openingDays) - num(bal.openingTaken))
    const entitledTaken = Math.max(0, num(bal.taken) - num(bal.openingTaken))
    // استحقاق السنة كاملة (من السياسة للسنة الجارية) والمتراكم منه لتاريخه
    // حسب طريقة الاستحقاق إن توفّر السياق، وإلا الكامل
    const annualEntitlement = this.annualEntitlementOf(bal, ctx)
    const effectiveEntitled = ctx
      ? this.accruedEntitlement(
          bal,
          annualEntitlement,
          onDate,
          ctx.joinDate,
          ctx.mode,
          ctx.probationMonths,
          inclusiveEnd
        )
      : annualEntitlement
    const adjustmentDays = num(bal.adjustmentDays)
    const realRemaining = Math.round((openingAvailable + effectiveEntitled + adjustmentDays - entitledTaken) * 100) / 100
    return {
      employeeId: bal.employeeId,
      balanceType: bal.balanceType,
      period: bal.period,
      opening: {
        days: num(bal.openingDays),
        taken: num(bal.openingTaken),
        expiry: bal.openingExpiry ?? null,
        expired,
        available: openingAvailable,
      },
      annualEntitlement,
      accruedToDate: effectiveEntitled,
      entitled: effectiveEntitled,
      entitledTaken,
      totalTaken: num(bal.taken),
      adjustmentDays,
      remaining: Math.max(0, realRemaining),
      deficit: Math.max(0, -realRemaining),
    }
  }

  // سياق الاستحقاق: تاريخ تعيين الموظف + وضع الاستحقاق + فترة التجربة +
  // استحقاق السياسة الحالي (السنوي 0 لغير المستحق)
  private async accrualContext(employeeId: number): Promise<AccrualContext> {
    const emp = await this.employees.findOne({ where: { id: employeeId } })
    return this.contextOf(emp, await this.accrualSettings())
  }

  private async accrualSettings(): Promise<AccrualSettings> {
    const cfg = async (k: string, d: string) =>
      (await this.config.findOne({ where: { key: k } }))?.value ?? d
    return {
      mode: await cfg('leave.accrual_mode', 'monthly'),
      probationMonths: Number(await cfg('leave.probation_months', '0')),
      annual: Number(await cfg('leave.annual_entitled', '21')),
      sick: Number(await cfg('leave.sick_entitled', '180')),
    }
  }

  private contextOf(
    emp: Pick<Employee, 'joinDate' | 'annualLeaveEntitled'> | null,
    s: AccrualSettings
  ): AccrualContext {
    return {
      joinDate: emp?.joinDate ?? null,
      mode: s.mode,
      probationMonths: s.probationMonths,
      policy: {
        annual: emp?.annualLeaveEntitled === false ? 0 : s.annual,
        sick: s.sick,
      },
    }
  }

  // صف رصيد السنة من سياسة الإجازات لو ناقص (LEV-2) — بدل ما الإجازة تعدّي بلا
  // حد ولا خصم. السنوي 0 لغير المستحق؛ نوع غير السنوي/المرضي بلا صف = خطأ صريح
  private async ensureRow(
    repo: Repository<LeaveBalance>,
    employeeId: number,
    balanceType: BalanceType,
    period: string
  ): Promise<LeaveBalance> {
    const found = await repo.findOne({ where: { employeeId, balanceType, period } })
    if (found) return found
    if (balanceType !== 'annual' && balanceType !== 'sick') {
      throw new BadRequestException(
        `لا يوجد رصيد «${balanceType}» للموظف في سنة ${period}`
      )
    }
    const ctx = await this.accrualContext(employeeId)
    try {
      return await repo.save(
        repo.create({
          employeeId,
          balanceType,
          period,
          entitled: balanceType === 'annual' ? ctx.policy.annual : ctx.policy.sick,
          taken: 0,
          openingDays: 0,
          openingTaken: 0,
        })
      )
    } catch (e) {
      // صف اتعمل بالتوازي (قيد التفرّد موظف/نوع/سنة) — نقرأه
      const again = await repo.findOne({ where: { employeeId, balanceType, period } })
      if (again) return again
      throw e
    }
  }

  // تاريخ فحص رصيد سنة من إجازة (بوابة الاعتماد والخصم عند التنفيذ بنفس التاريخ):
  // سنة البداية = المتراكم حتى تاريخ البداية؛ السنة اللي بعدها = استحقاق السنة كلها
  // (المتراكم في 1 يناير صفر في الاستحقاق الشهري فكان الخصم يفشل بعد نجاح البوابة)
  balanceGateDate(year: string, fromDate: string): string {
    return year === String(fromDate).slice(0, 4) ? String(fromDate) : `${year}-12-31`
  }

  // أول يوم فعلي للإجازة داخل السنة — صلاحية الطبقة الافتتاحية تُقاس عليه لا على البوابة
  leaveYearStart(year: string, fromDate: string): string {
    return year === String(fromDate).slice(0, 4) ? String(fromDate) : `${year}-01-01`
  }

  // أيام الإجازة لكل سنة: من تقسيم التقديم (daysByYear) لو الإجازة بتعدّي
  // السنة، وإلا كلها على سنة تاريخ البداية
  splitByYear(payload: unknown, fromDate: string, days: number): Record<string, number> {
    const split = (payload as { daysByYear?: unknown } | null)?.daysByYear
    if (split && typeof split === 'object') {
      const out: Record<string, number> = {}
      for (const [y, d] of Object.entries(split as Record<string, unknown>)) {
        if (/^\d{4}$/.test(y) && Number(d) > 0) out[y] = Number(d)
      }
      if (Object.keys(out).length > 0) return out
    }
    return { [String(fromDate).slice(0, 4)]: Number(days) }
  }

  // حدّ الأثر الرجعي لطلب إجازة الموظف (يوم) — الأقدم للموارد البشرية بس (LEV-20)
  async maxBackdateDays(): Promise<number> {
    const v = (
      await this.config.findOne({ where: { key: 'leave.max_backdate_days' } })
    )?.value
    const n = Number(v ?? '30')
    return Number.isFinite(n) && n >= 0 ? n : 30
  }

  async balanceOf(
    employeeId: number,
    balanceType: BalanceType,
    onDate = localDateOf(new Date()),
    inclusiveEnd = false
  ): Promise<BalanceView | null> {
    const period = onDate.slice(0, 4)
    const bal = await this.balances.findOne({
      where: { employeeId, balanceType, period },
    })
    if (!bal) return null
    const ctx = await this.accrualContext(employeeId)
    return this.view(bal, onDate, ctx, inclusiveEnd)
  }

  async allBalances(employeeId: number) {
    const onDate = localDateOf(new Date())
    const rows = await this.balances.find({
      where: { employeeId, period: onDate.slice(0, 4) },
    })
    const ctx = await this.accrualContext(employeeId)
    return rows.map((b) => this.view(b, onDate, ctx))
  }

  // أرصدة السنة الجارية لكل موظفي النطاق دفعة واحدة — شاشة الأرصدة (LEV-23).
  // استعلام للموظفين وواحد للصفوف والإعدادات مرة، بدل نداء لكل موظف (~180).
  // تعذّر حساب موظف يرجع في صفّه (error) ولا يُسقط الباقي؛ branchId null = كل الفروع
  async bulkBalances(branchId: number | null) {
    const onDate = localDateOf(new Date())
    const period = onDate.slice(0, 4)
    const emps = await this.employees.find({
      select: {
        id: true,
        fullName: true,
        employeeCode: true,
        branchId: true,
        departmentId: true,
        joinDate: true,
        status: true,
        annualLeaveEntitled: true,
      },
      where: branchId != null ? { branchId } : {},
      order: { id: 'ASC' },
    })
    const qb = this.balances
      .createQueryBuilder('b')
      .where('b.period = :period', { period })
    if (branchId != null) {
      qb.andWhere(
        'b.employeeId IN (SELECT e.id FROM employees e WHERE e.branchId = :branchId)',
        { branchId }
      )
    }
    const byEmp = new Map<number, LeaveBalance[]>()
    for (const b of await qb.getMany()) {
      byEmp.set(b.employeeId, [...(byEmp.get(b.employeeId) ?? []), b])
    }
    const settings = await this.accrualSettings()
    return emps.map((e) => {
      const employee = {
        id: e.id,
        fullName: e.fullName,
        employeeCode: e.employeeCode,
        branchId: e.branchId,
        departmentId: e.departmentId,
        joinDate: e.joinDate,
        status: e.status,
      }
      try {
        const ctx = this.contextOf(e, settings)
        return {
          employee,
          balances: (byEmp.get(e.id) ?? []).map((b) => this.view(b, onDate, ctx)),
        }
      } catch (err) {
        return {
          employee,
          balances: [] as BalanceView[],
          error: err instanceof Error ? err.message : 'تعذّر حساب الرصيد',
        }
      }
    })
  }

  // التحقق قبل التقديم والاعتماد — يرمي برسالة واضحة لو الرصيد غير كافٍ.
  // صف السنة الناقص يتعمل من الإعدادات (LEV-2)؛ pendingDays = أيام طلبات إجازة
  // معلّقة على نفس الرصيد والسنة، محجوزة لحد ما تتنفذ أو تترفض (LEV-3)
  async assertSufficient(
    employeeId: number,
    balanceType: BalanceType,
    days: number,
    onDate: string,
    pendingDays = 0
  ) {
    await this.ensureRow(this.balances, employeeId, balanceType, onDate.slice(0, 4))
    const view = await this.balanceOf(employeeId, balanceType, onDate)
    if (!view) return
    const available = Math.round((view.remaining - pendingDays) * 100) / 100
    if (available < days) {
      throw new BadRequestException(
        `الرصيد غير كافٍ: المتبقي ${view.remaining} يوم` +
          (pendingDays > 0
            ? ` (منها ${pendingDays} محجوزة لطلبات قيد الاعتماد)`
            : '') +
          ` والمطلوب ${days}`
      )
    }
  }

  async adjust(employeeId: number, dto: {
    balanceType: BalanceType; period: string; delta: number; reason: string;
    idempotencyKey: string; expectedRemaining?: number
  }, actorUserId: number, branchScope: number | null) {
    const onDate = localDateOf(new Date())
    const reason = dto.reason?.trim()
    const cents = (value: number) => Math.round(value * 100) / 100
    if (dto.period !== onDate.slice(0, 4)) throw new BadRequestException('التعديل اليدوي متاح لرصيد السنة الجارية فقط')
    if (!Number.isFinite(dto.delta) || dto.delta === 0 || Math.abs(dto.delta) > 9999.99 || Math.abs(dto.delta - cents(dto.delta)) > 1e-8) {
      throw new BadRequestException('التعديل يجب أن يكون عدداً غير صفري بدقة منزلتين عشريتين وبحد أقصى 9999.99 يوم')
    }
    if (!reason || reason.length < 3 || reason.length > 500) throw new BadRequestException('سبب التعديل مطلوب من 3 إلى 500 حرف')
    return this.balances.manager.transaction(async em => {
      // Employee first serializes first-row creation and freezes branch scope.
      const employee = await em.findOne(Employee, { where: { id: employeeId }, lock: { mode: 'pessimistic_write' } })
      if (!employee || (branchScope !== null && employee.branchId !== branchScope)) throw new NotFoundException('الموظف غير موجود')
      const ctx = this.contextOf(employee, await this.accrualSettings())
      const where = { employeeId, balanceType: dto.balanceType, period: dto.period }
      let bal = await em.findOne(LeaveBalance, { where, lock: { mode: 'pessimistic_write' } })
      const prior = await em.findOneBy(LeaveBalanceAdjustment, { ...where, idempotencyKey: dto.idempotencyKey })
      if (prior) {
        if (num(prior.delta) !== dto.delta || prior.reason !== reason || prior.actorUserId !== actorUserId) {
          throw new ConflictException('مفتاح العملية مستخدم لتعديل مختلف — أعد فتح نموذج التعديل')
        }
        if (!bal) throw new ConflictException('سجل التعديل موجود لكن صف الرصيد غير موجود')
        return { balance: this.view(bal, onDate, ctx), adjustment: prior, replayed: true }
      }
      if (['archived', 'terminated'].includes(employee.status)) throw new BadRequestException('لا يمكن تعديل رصيد موظف مؤرشف أو منتهية خدمته')
      if (!bal) {
        if (!['annual', 'sick'].includes(dto.balanceType)) throw new BadRequestException('لا يوجد رصيد من هذا النوع للموظف')
        bal = await em.save(LeaveBalance, em.create(LeaveBalance, { ...where,
          entitled: dto.balanceType === 'annual' ? ctx.policy.annual : ctx.policy.sick,
          taken: 0, openingDays: 0, openingTaken: 0, adjustmentDays: 0 }))
      }
      const before = this.view(bal, onDate, ctx)
      if (dto.expectedRemaining !== undefined && dto.expectedRemaining !== before.remaining) {
        throw new ConflictException('تغير الرصيد منذ فتح النافذة — حدّث البيانات وراجع التعديل')
      }
      const afterAdjustment = cents(num(bal.adjustmentDays) + dto.delta)
      if (Math.abs(afterAdjustment) > 999999.99) throw new BadRequestException('إجمالي التعديلات يتجاوز الحد المدعوم')
      bal.adjustmentDays = afterAdjustment
      const after = this.view(bal, onDate, ctx)
      if (after.deficit > 0) throw new BadRequestException('التعديل يؤدي إلى رصيد سالب — راجع قيمة الخصم')
      if (after.remaining > 999999.99) throw new BadRequestException('الرصيد يتجاوز الحد المدعوم')
      await em.save(LeaveBalance, bal)
      const adjustment = await em.save(LeaveBalanceAdjustment, em.create(LeaveBalanceAdjustment, {
        ...where, idempotencyKey: dto.idempotencyKey, delta: dto.delta,
        beforeAdjustment: before.adjustmentDays, afterAdjustment,
        beforeRemaining: cents(before.remaining - before.deficit), afterRemaining: after.remaining,
        reason, actorUserId,
      }))
      return { balance: after, adjustment, replayed: false }
    })
  }

  adjustmentHistory(employeeId: number, period = String(new Date().getFullYear())) {
    if (!/^\d{4}$/.test(period)) throw new BadRequestException('السنة غير صالحة')
    return this.balances.manager.find(LeaveBalanceAdjustment, {
      where: { employeeId, period }, order: { id: 'DESC' },
    })
  }

  // الخصم بالطبقات: الافتتاحي الساري أولاً ثم استحقاق السنة. الأيام لازم موجبة
  // (السالب كان بيزوّد الرصيد — LEV-4)، وصف السنة الناقص يتعمل (LEV-2)
  async deduct(
    em: EntityManager,
    employeeId: number,
    balanceType: BalanceType,
    days: number,
    onDate: string,
    // أول يوم للإجازة في سنة الرصيد: صلاحية الطبقة الافتتاحية تُقاس عليه؛ الافتراضي onDate
    openingOnDate: string = onDate
  ) {
    if (!Number.isFinite(Number(days)) || !(Number(days) > 0)) {
      throw new BadRequestException('عدد أيام الخصم لازم يكون أكبر من صفر')
    }
    if (openingOnDate.slice(0, 4) !== onDate.slice(0, 4)) {
      throw new BadRequestException('تاريخ الطبقة الافتتاحية يجب أن يكون في سنة الرصيد نفسها')
    }
    const period = onDate.slice(0, 4)
    // Read context before the balance lock: adjustments lock employee then
    // balance, so acquiring those locks in reverse order could deadlock.
    const ctx = await this.accrualContext(employeeId)
    await this.ensureRow(
      em.getRepository(LeaveBalance),
      employeeId,
      balanceType,
      period
    )
    const bal = await em.getRepository(LeaveBalance).findOneOrFail({ where: { employeeId, balanceType, period }, lock: { mode: 'pessimistic_write' } })
    const available = this.view(bal, onDate, ctx).remaining
    if (available < days) throw new BadRequestException('الرصيد غير كافٍ عند التنفيذ — المتبقي ' + available + ' يوم')
    const openingValid = !bal.openingExpiry || bal.openingExpiry >= openingOnDate
    const openingAvailable = openingValid
      ? Math.max(0, num(bal.openingDays) - num(bal.openingTaken))
      : 0
    const fromOpening = Math.min(days, openingAvailable)
    bal.openingTaken = num(bal.openingTaken) + fromOpening
    bal.taken = num(bal.taken) + days
    await em.getRepository(LeaveBalance).save(bal)
  }

  // الإرجاع: يعكس بترتيب عكسي (استحقاق السنة أولاً ثم الطبقة الافتتاحية)
  async restore(
    em: EntityManager,
    employeeId: number,
    balanceType: BalanceType,
    days: number,
    period: string
  ) {
    if (!(Number(days) > 0)) return
    const bal = await em.getRepository(LeaveBalance).findOne({
      where: { employeeId, balanceType, period },
      lock: { mode: 'pessimistic_write' },
    })
    if (!bal) return
    const entitledTaken = Math.max(0, num(bal.taken) - num(bal.openingTaken))
    const fromEntitled = Math.min(days, entitledTaken)
    const fromOpening = Math.min(days - fromEntitled, num(bal.openingTaken))
    bal.openingTaken = num(bal.openingTaken) - fromOpening
    bal.taken = Math.max(0, num(bal.taken) - days)
    await em.getRepository(LeaveBalance).save(bal)
  }

  // إرجاع رصيد إجازة بنفس تقسيم السنين اللي اتخصم بيه (من حمولة طلبها)
  async restoreLeave(em: EntityManager, leave: Leave, balanceType: BalanceType) {
    let payload: unknown = {}
    if (leave.requestId) {
      const req = await em
        .getRepository(Request)
        .findOne({ where: { id: leave.requestId } })
      try {
        payload = req?.payload ? JSON.parse(req.payload) : {}
      } catch {
        payload = {}
      }
    }
    const byYear = this.splitByYear(payload, leave.fromDate, Number(leave.days))
    for (const [year, d] of Object.entries(byYear)) {
      await this.restore(em, leave.employeeId, balanceType, d, year)
    }
  }

  // صفوف السنوي والمرضي لسنة لكل الموظفين النشطين — المرضي مابيترحّلش فصفه
  // لازم يتعمل مع بداية كل سنة (LEV-2). الموجود مابيتلمسش
  async ensureYearRows(period: string) {
    const emps = await this.employees.find({
      where: { status: Not(In(['terminated', 'archived'])) },
      select: { id: true },
    })
    let created = 0
    for (const e of emps) {
      for (const t of ['annual', 'sick']) {
        const exists = await this.balances.count({
          where: { employeeId: e.id, balanceType: t, period },
        })
        if (!exists) {
          await this.ensureRow(this.balances, e.id, t, period)
          created++
        }
      }
    }
    return created
  }

  async catchUpRollover() {
    if (this.rolloverRunning) return null
    const fromPeriod = String(new Date().getFullYear() - 1)
    const key = 'leave.rollover_through_period'
    const done = await this.config.findOneBy({ key })
    if (done && Number(done.value) >= Number(fromPeriod)) return null
    if (this.rolloverRunning) return null
    this.rolloverRunning = true
    try {
      const result = await this.rollover(fromPeriod)
      await this.config.save({ ...(done ?? {}), key, value: fromPeriod })
      return result
    } finally { this.rolloverRunning = false }
  }

  // ===== الترحيل السنوي: متبقي سنة → طبقة افتتاحية للسنة الجديدة =====
  // وبعده صفوف السنة الجديدة الناقصة (السنوي بلا مُرحّل + المرضي) لكل النشطين
  async rollover(fromPeriod: string) {
    const toPeriod = String(Number(fromPeriod) + 1)
    const maxCarry = Number(
      (await this.config.findOne({ where: { key: 'leave.carryover_max_days' } }))
        ?.value ?? '10'
    )
    const expiryMonths = Number(
      (
        await this.config.findOne({
          where: { key: 'leave.carryover_expiry_months' },
        })
      )?.value ?? '3'
    )
    // نهاية صلاحية المُرحّل: آخر يوم في الشهر رقم expiryMonths من السنة الجديدة
    // (تنسيق محلي — toISOString يزحزح اليوم بفارق التوقيت)
    const expiryDate = new Date(Number(toPeriod), expiryMonths, 0)
    const expiry = `${expiryDate.getFullYear()}-${String(expiryDate.getMonth() + 1).padStart(2, '0')}-${String(expiryDate.getDate()).padStart(2, '0')}`

    const endOfYear = `${fromPeriod}-12-31`
    const rows = await this.balances.find({
      where: { period: fromPeriod, balanceType: 'annual' },
    })
    let created = 0
    for (const bal of rows) {
      const existing = await this.balances.findOne({
        where: {
          employeeId: bal.employeeId,
          balanceType: 'annual',
          period: toPeriod,
        },
      })
      const ctx = await this.accrualContext(bal.employeeId)
      const view = this.view(bal, endOfYear, ctx, true)
      const carry = Math.min(maxCarry, Math.max(0, view.remaining))
      if (existing) {
        // صف السنة الجديدة ممكن يكون اتعمل بدري (إجازة بتعدّي السنة أو خصم) من
        // غير مُرحّل — نكمّل المُرحّل عليه بدل ما يضيع؛ المُرحّل مرة واحدة بس
        const hasOpening =
          num(existing.openingDays) > 0 ||
          num(existing.openingTaken) > 0 ||
          !!existing.openingExpiry
        if (!hasOpening && carry > 0) {
          existing.openingDays = carry
          existing.openingTaken = 0
          existing.openingExpiry = expiry
          await this.balances.save(existing)
          created++
        }
        continue
      }
      await this.balances.save(
        this.balances.create({
          employeeId: bal.employeeId,
          balanceType: 'annual',
          period: toPeriod,
          // استحقاق السياسة (0 لغير المستحق) مش رقم ثابت لكل الناس
          entitled: ctx.policy.annual,
          taken: 0,
          openingDays: carry,
          openingTaken: 0,
          openingExpiry: expiry,
        })
      )
      created++
    }
    const ensured = await this.ensureYearRows(toPeriod)
    return { fromPeriod, toPeriod, created, ensured, maxCarry, expiry }
  }
}
