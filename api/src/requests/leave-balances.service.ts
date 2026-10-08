import type { BalanceType } from '../common/domain-status'
import { BadRequestException, ConflictException, Injectable, NotFoundException } from '@nestjs/common'
import { InjectRepository } from '@nestjs/typeorm'
import { EntityManager, In, Like, Not, Repository } from 'typeorm'
import { Employee } from '../employees/employee.entity'
import { Leave, LeaveBalance, LeaveBalanceAdjustment, LeaveType } from './entities/leave.entities'
import { Request } from './entities/request.entity'
import { RequestsConfig } from './entities/requests-config.entity'
import { localDateOf } from '../attendance/attendance.service'
import {
  BalanceTypeSettings,
  PeriodEntry,
  RenewalBasis,
  accruedDays,
  addDays,
  balanceTimeline,
  balanceTypeRow,
  balanceTypeSettings,
  carryOverDays,
  carryOverExpiry,
  dayCount,
  effectiveBasis,
  entitlementEligibleDate,
  isDateKey,
  isYearKey,
  nominalWindow,
  periodAt,
  periodKeyFor,
  previousEntry,
  prorate,
} from './leave-balance-periods'
import { parseEntitlementTiers, tieredAnnualDays, type EntitlementTier } from './leave-entitlement-tiers'
import { readLeaveTypeExtras } from './leave-type-extras'
import { yearEndSplit } from './leave-year-end.math'
import { branchIdIn, branchScopeQb, inBranchScope } from '../auth/guards'
import type { BranchScope } from '../auth/guards'
import { closedServiceThrough } from '../employees/employment-periods'

// نطاق الفروع في خدمة الأرصدة: null = الشركة، مصفوفة = الفروع دي (branchScopeOf)، ورقم = فرع واحد (فرع مختار/نداء قديم)
const asBranchScope = (scope: BranchScope | number): BranchScope => (typeof scope === 'number' ? [scope] : scope)
const branchScopeWhere = (scope: BranchScope | number) => {
  const list = asBranchScope(scope)
  return list === null ? {} : { branchId: list.length === 1 ? list[0] : branchIdIn(list) }
}

// ============================================================
// الأرصدة بالطبقات:
// طبقة 1: الرصيد الافتتاحي المُرحّل (بصلاحية) — تُستهلك أولاً
// طبقة 2: استحقاق سنة الرصيد الحالية
// الترحيل عند التجديد: المتبقي حتى سقف نوع الإجازة → طبقة افتتاحية للسنة الجديدة
// سنة الرصيد من إعداد النوع (leave-balance-periods.ts): بداية السنة 'YYYY' أو ذكرى
// التعيين 'YYYY-MM-DD'. الاستحقاق والترحيل وسقفه من نوعي ANNUAL وSICK.
// ============================================================

export interface BalanceView {
  employeeId: number
  balanceType: BalanceType
  period: string
  // نافذة سنة الرصيد الفعلية (أول يوم وآخر يوم)
  periodStart: string
  periodEnd: string
  opening: {
    days: number
    taken: number
    expiry: string | null
    expired: boolean
    available: number
  }
  // استحقاق السنة كاملة: السنة الجارية وما بعدها من نوع الإجازة (السنوي 0 لغير
  // المستحق)، والسنوات المنقضية كما خُزّنت في الصف؛ بنسبة الأيام لسنة انتقالية أقصر
  annualEntitlement: number
  // المتراكم لتاريخه من استحقاق السنة حسب طريقة الاستحقاق — منه يُحسب المتبقي
  accruedToDate: number
  // = accruedToDate (للتوافق مع المستهلكين القدامى) — لا يُعرض كـ«استحقاق السنة»
  entitled: number
  entitledTaken: number
  totalTaken: number
  adjustmentDays: number
  // أيام اتسوّت (اتصرفت فلوس أو اتصفّرت) من شاشة إقفال سنة الإجازات — بتنقص من المتبقي
  settledDays: number
  remaining: number
  // المسحوب على المكشوف من الاستحقاق بعد نفاد المُرحّل (LEV-3) — 0 لو مفيش عجز
  deficit: number
}

// صف معاينة «إقفال سنة الإجازات» لموظف (السنوي)
export interface YearEndFigures {
  period: string
  periodStart: string
  periodEnd: string
  ended: boolean
  measureDate: string
  annualEntitlement: number
  accrued: number
  opening: number
  adjustments: number
  entitledTotal: number
  used: number
  settled: number
  remaining: number
  deficit: number
  carried: number
  lapsed: number
  closed: boolean
  settleable: number
  eligibleFrom: string | null
}
export type YearEndRow = {
  employee: { id: number; fullName: string; employeeCode: string; branchId: number; departmentId: number; joinDate: string | null }
  error?: string
} & Partial<YearEndFigures>

type TypedBalance = 'annual' | 'sick'
const TYPED: TypedBalance[] = ['annual', 'sick']
const isTyped = (t: string): t is TypedBalance => t === 'annual' || t === 'sick'
type Entry = PeriodEntry<LeaveBalance>

// سياق الاستحقاق لموظف: التعيين + طريقة الاستحقاق + التجربة + استحقاق النوع وإعداده
interface AccrualContext {
  joinDate: string | null
  mode: string
  // السنوي: الاستحقاق يبدأ بعد كام شهر من التعيين (من نوع ANNUAL، وإلا الإعداد العام) وأول سنة بالنسبة؟
  probationMonths: number
  prorateFirstYear: boolean
  policy: { annual: number; sick: number }
  settings: Record<TypedBalance, BalanceTypeSettings>
}

// إعدادات الاستحقاق العامة (مشتركة بين كل الموظفين) — الحساب الجماعي يقرأها مرة
interface AccrualSettings {
  mode: string
  probationMonths: number
  expiryMonths: number
  types: Record<TypedBalance, BalanceTypeSettings>
  // B4.5 (ج): شرائح السنوية بالخدمة والسن — موجودة بس لو نوع السنوية ليه شرائح (غير كده أيام النوع زي الأول)
  annualTiers?: { tiers: EntitlementTier[]; facts: Map<number, { country: string | null; birthDate: string | null }> }
}

const num = (v: unknown) => Number(v ?? 0)
// CRP2V (B2.10): صف الموظف ممسوك دلوقتي (تعديل ملفه، إيقاف، إعادة تعيين) والخصم أو الإرجاع مابيستناش
export const LEAVE_EMPLOYEE_BUSY = 'ملف الموظف بيتعدّل دلوقتي — جرّب تاني بعد لحظة'
const LEAVE_CONFIG_KEYS = [
  'leave.accrual_mode',
  'leave.probation_months',
  'leave.annual_entitled',
  'leave.sick_entitled',
  'leave.carryover_max_days',
  'leave.carryover_expiry_months',
]

@Injectable()
export class LeaveBalancesService {
  private rolloverRunning = false
  private renewalRunning = false
  constructor(
    @InjectRepository(LeaveBalance)
    private readonly balances: Repository<LeaveBalance>,
    @InjectRepository(Employee)
    private readonly employees: Repository<Employee>,
    @InjectRepository(RequestsConfig)
    private readonly config: Repository<RequestsConfig>
  ) {}

  private basisOf(ctx: AccrualContext | undefined, balanceType: string): RenewalBasis {
    return ctx && isTyped(balanceType)
      ? effectiveBasis(ctx.settings[balanceType].renewalBasis, ctx.joinDate)
      : 'YEAR_START'
  }

  // نافذة الصف وحده (بلا باقي صفوف الموظف) — للسنة 'YYYY' = السنة الميلادية
  private entryOf(bal: LeaveBalance, ctx?: AccrualContext): Entry {
    const y = String(bal.period).slice(0, 4)
    const w = nominalWindow(String(bal.period), ctx?.joinDate) ?? { start: `${y}-01-01`, end: `${y}-12-31`, calendar: true }
    return { row: bal, key: String(bal.period), calendar: w.calendar, nominalStart: w.start, nominalEnd: w.end, start: w.start, end: w.end }
  }

  // استحقاق السنة كاملة: للسنة الجارية وما بعدها من نوع الإجازة عشان تعديل
  // الإعدادات يسري فوراً (السنوي 0 لغير المستحق)؛ السنوات المنقضية كما خُزّنت.
  // السنة الانتقالية الأقصر (تغيير أساس التجديد) بنسبة أيامها
  private annualEntitlementOf(bal: LeaveBalance, entry: Entry, ctx?: AccrualContext) {
    let fullYear = num(bal.entitled)
    const ended = entry.calendar
      ? bal.period < String(new Date().getFullYear())
      : entry.end < localDateOf(new Date())
    if (ctx && !ended) {
      if (bal.balanceType === 'annual') fullYear = ctx.policy.annual
      else if (bal.balanceType === 'sick') fullYear = ctx.policy.sick
    }
    return { fullYear, entitlement: prorate(fullYear, entry) }
  }

  private view(
    bal: LeaveBalance,
    onDate: string,
    ctx?: AccrualContext,
    inclusiveEnd = false,
    entry: Entry = this.entryOf(bal, ctx)
  ): BalanceView {
    const expired =
      !!bal.openingExpiry && bal.openingExpiry < onDate ? true : false
    const openingAvailable = expired
      ? 0
      : Math.max(0, num(bal.openingDays) - num(bal.openingTaken))
    const entitledTaken = Math.max(0, num(bal.taken) - num(bal.openingTaken))
    // استحقاق السنة كاملة (من النوع للسنة الجارية) والمتراكم منه لتاريخه
    // حسب طريقة الاستحقاق إن توفّر السياق، وإلا الكامل
    const { fullYear, entitlement: annualEntitlement } = this.annualEntitlementOf(bal, entry, ctx)
    const effectiveEntitled = ctx
      ? accruedDays({
          balanceType: bal.balanceType,
          fullYear,
          entitlement: annualEntitlement,
          onDate,
          joinDate: ctx.joinDate,
          mode: ctx.mode,
          probationMonths: ctx.probationMonths,
          prorateFirstYear: ctx.prorateFirstYear,
          inclusiveEnd,
          window: entry,
        })
      : annualEntitlement
    const adjustmentDays = num(bal.adjustmentDays)
    const settledDays = num(bal.settledDays)
    const realRemaining = Math.round((openingAvailable + effectiveEntitled + adjustmentDays - entitledTaken - settledDays) * 100) / 100
    return {
      employeeId: bal.employeeId,
      balanceType: bal.balanceType,
      period: bal.period,
      periodStart: entry.start,
      periodEnd: entry.end,
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
      settledDays,
      remaining: Math.max(0, realRemaining),
      deficit: Math.max(0, -realRemaining),
    }
  }

  // سياق الاستحقاق: تاريخ تعيين الموظف + وضع الاستحقاق + فترة التجربة +
  // استحقاق النوع الحالي (السنوي 0 لغير المستحق)
  // settings: الحساب الجماعي (الترحيل) بيقرأ الإعدادات مرة ويمررها بدل استعلامين لكل صف
  private async accrualContext(employeeId: number, manager?: EntityManager, settings?: AccrualSettings): Promise<AccrualContext> {
    const emp = await (manager ? manager.getRepository(Employee) : this.employees).findOne({ where: { id: employeeId } })
    return this.contextOf(emp, settings ?? (await this.accrualSettings(manager, employeeId)))
  }

  // onlyEmployeeId: سياق موظف واحد — بيانات الشرائح (السن ودولة الفرع) بتتقري ليه بس بدل كل الموظفين
  private async accrualSettings(manager?: EntityManager, onlyEmployeeId?: number): Promise<AccrualSettings> {
    const m = manager ?? this.balances.manager
    const rows = await (manager ? manager.getRepository(RequestsConfig) : this.config).find({
      where: { key: In(LEAVE_CONFIG_KEYS) },
    })
    const cfg = (k: string, d: string) => rows.find((r) => r.key === k)?.value ?? d
    const globals = {
      annual: Number(cfg('leave.annual_entitled', '21')),
      sick: Number(cfg('leave.sick_entitled', '180')),
      carryOverMaxDays: Number(cfg('leave.carryover_max_days', '10')),
    }
    const types = await m.getRepository(LeaveType).find({
      select: {
        id: true,
        code: true,
        category: true,
        balanceType: true,
        isActive: true,
        annualDays: true,
        renewalBasis: true,
        carryOverEnabled: true,
        carryOverMaxDays: true,
        entitlementStartMonths: true,
        firstYearProrated: true,
      },
    })
    return {
      mode: cfg('leave.accrual_mode', 'monthly'),
      probationMonths: Number(cfg('leave.probation_months', '0')),
      expiryMonths: Number(cfg('leave.carryover_expiry_months', '3')),
      types: {
        annual: balanceTypeSettings(types, 'annual', globals),
        sick: balanceTypeSettings(types, 'sick', globals),
      },
      annualTiers: await this.annualTiersOf(m, balanceTypeRow(types, 'annual')?.id, onlyEmployeeId),
    }
  }

  // B4.5 (ج): شرائح نوع السنوية (لو ليه شرائح) ومعاها سن الموظفين ودولة فروعهم. من غير شرائح = undefined ومفيش أي قراءة زيادة
  private async annualTiersOf(m: EntityManager, typeId: number | undefined, onlyEmployeeId?: number): Promise<AccrualSettings['annualTiers']> {
    if (typeId == null) return undefined
    const tiers = parseEntitlementTiers((await readLeaveTypeExtras(m, [typeId])).get(typeId)?.entitlementTiers)
    if (!tiers.length) return undefined
    const rows: Array<{ id: number; birthDate: string | null; country: string | null }> = await m.query(
      `SELECT e.[id], CONVERT(char(10), e.[birthDate], 23) AS [birthDate], b.[country] FROM [employees] e LEFT JOIN [branches] b ON b.[id] = e.[branchId]${onlyEmployeeId == null ? '' : ' WHERE e.[id] = @0'}`,
      onlyEmployeeId == null ? [] : [onlyEmployeeId])
    return { tiers, facts: new Map(rows.map(row => [Number(row.id), { country: row.country ?? null, birthDate: row.birthDate ?? null }])) }
  }

  /**
   * P4A-B03: إعدادات الحساب بحقائق شريحة الموظف (دولة فرعه وتاريخ ميلاده) مقروءة بمدير المعاملة **بعد قفل صفه**. الكاتب اللي بيقفل الموظف
   * مايحكمش بالخريطة اللي اتقرت بالجملة قبل القفل — نقل فرع اتثبّت في النص كان بيكتب صف السنة بشريحة الدولة القديمة.
   * من غير شرائح = نفس الإعدادات ومن غير قراءة.
   */
  private async settingsAfterLock(em: EntityManager, employeeId: number, settings: AccrualSettings): Promise<AccrualSettings> {
    if (!settings.annualTiers) return settings
    const rows: Array<{ birthDate: string | null; country: string | null }> = await em.query(
      'SELECT CONVERT(char(10), e.[birthDate], 23) AS [birthDate], b.[country] FROM [employees] e LEFT JOIN [branches] b ON b.[id] = e.[branchId] WHERE e.[id] = @0', [employeeId])
    return { ...settings, annualTiers: { tiers: settings.annualTiers.tiers,
      facts: new Map(rows.map(row => [employeeId, { country: row.country ?? null, birthDate: row.birthDate ?? null }])) } }
  }

  private contextOf(
    emp: (Pick<Employee, 'joinDate' | 'annualLeaveEntitled'> & { id?: number }) | null,
    s: AccrualSettings
  ): AccrualContext {
    // B4.5 (ج): أعلى شريحة منطبقة على الموظف النهارده (دولة فرعه، خدمته، سنّه)، وإلا أيام النوع
    const facts = s.annualTiers && emp?.id != null ? s.annualTiers.facts.get(Number(emp.id)) : undefined
    const annualDays = s.annualTiers
      ? tieredAnnualDays(s.types.annual.annualDays, s.annualTiers.tiers, { country: facts?.country, joinDate: emp?.joinDate, birthDate: facts?.birthDate }, localDateOf(new Date()))
      : s.types.annual.annualDays
    return {
      joinDate: emp?.joinDate ?? null,
      mode: s.mode,
      probationMonths: s.types.annual.entitlementStartMonths ?? s.probationMonths,
      prorateFirstYear: s.types.annual.firstYearProrated,
      policy: {
        annual: emp?.annualLeaveEntitled === false ? 0 : annualDays,
        sick: s.types.sick.annualDays,
      },
      settings: s.types,
    }
  }

  // صف سنة الرصيد اللي يغطي تاريخًا من صفوف الموظف/النوع، ومفتاح الصف لو ناقص
  private async resolveAt(
    repo: Repository<LeaveBalance>,
    employeeId: number,
    balanceType: BalanceType,
    date: string,
    ctx: AccrualContext
  ) {
    const rows = await repo.find({ where: { employeeId, balanceType } })
    const basis = this.basisOf(ctx, balanceType)
    const timeline = balanceTimeline(rows, ctx.joinDate, basis)
    const key = periodKeyFor(date, ctx.joinDate, basis)
    let entry = periodAt(timeline, date)
    if (!entry) {
      const byKey = rows.find((r) => r.period === key)
      if (byKey) entry = timeline.find((e) => e.row === byKey) ?? this.entryOf(byKey, ctx)
    }
    return { rows, timeline, entry, key }
  }

  // صف سنة الرصيد من إعداد النوع لو ناقص (LEV-2) — بدل ما الإجازة تعدّي بلا
  // حد ولا خصم. السنوي 0 لغير المستحق؛ نوع غير السنوي/المرضي بلا صف = خطأ صريح
  private async ensureAt(
    repo: Repository<LeaveBalance>,
    employeeId: number,
    balanceType: BalanceType,
    date: string,
    ctx: AccrualContext
  ): Promise<Entry> {
    const found = await this.resolveAt(repo, employeeId, balanceType, date, ctx)
    if (found.entry) return found.entry
    if (!isTyped(balanceType)) {
      throw new BadRequestException(
        `لا يوجد رصيد «${balanceType}» للموظف في سنة ${date.slice(0, 4)}`
      )
    }
    try {
      await repo.save(
        repo.create({
          employeeId,
          balanceType,
          period: found.key,
          entitled: ctx.policy[balanceType],
          taken: 0,
          openingDays: 0,
          openingTaken: 0,
        })
      )
    } catch (e) {
      // صف اتعمل بالتوازي (قيد التفرّد موظف/نوع/سنة) — نقرأه
      const again = await repo.findOne({ where: { employeeId, balanceType, period: found.key } })
      if (!again) throw e
    }
    const after = await this.resolveAt(repo, employeeId, balanceType, date, ctx)
    if (after.entry) return after.entry
    throw new BadRequestException(`تعذّر تحديد سنة رصيد «${balanceType}» للموظف في ${date}`)
  }

  // CRP2W-B02: صف سنة الرصيد اللي بيغطي التاريخ **للحساب بس**: الموجود، أو صف افتراضي بقيم الإعداد لو ناقص — من غير حفظ. بوابة فحص
  // الرصيد (assertSufficient) برّه قفل صف الموظف ومعاملة الطلب، فلو عملت الصف كان ممكن يتكتب بمفتاح ذكرى تعيين قديمة بعد إعادة تعيين
  // ويغيّر استحقاق الفترة الجديدة. الصف الناقص بيتعمل وقت الخصم نفسه (deduct ← ensureAt) تحت القفل وبسياق اتقرا بعده
  private async entryAt(repo: Repository<LeaveBalance>, employeeId: number, balanceType: BalanceType, date: string, ctx: AccrualContext): Promise<Entry> {
    const found = await this.resolveAt(repo, employeeId, balanceType, date, ctx)
    if (found.entry) return found.entry
    if (!isTyped(balanceType)) throw new BadRequestException(`لا يوجد رصيد «${balanceType}» للموظف في سنة ${date.slice(0, 4)}`)
    const row = repo.create({ employeeId, balanceType, period: found.key, entitled: ctx.policy[balanceType], taken: 0, openingDays: 0, openingTaken: 0 })
    // نفس اللي resolveAt كان هيرجّعه بعد حفظ الصف: الصف اللي بيغطي التاريخ، وإلا الصف اللي بالمفتاح
    const timeline = balanceTimeline([...found.rows, row], ctx.joinDate, this.basisOf(ctx, balanceType))
    return periodAt(timeline, date) ?? timeline.find((e) => e.row === row) ?? this.entryOf(row, ctx)
  }

  // بوابة الاعتماد تمرر 31 ديسمبر لجزء السنة اللاحقة من إجازة تعدّي السنة (يبدأ 1 يناير)
  private gateSegment(onDate: string) {
    const later = onDate.slice(5) === '12-31'
    return { start: later ? `${onDate.slice(0, 4)}-01-01` : onDate, later }
  }

  // تاريخ قياس المتراكم: صف السنة الميلادية كما كان (تاريخ البوابة)؛ صف الذكرى لجزء
  // لاحق يبدأ مع سنة رصيد جديدة = استحقاقها كله، وإلا المتراكم حتى أول يوم في الجزء
  private measureDate(entry: Entry, onDate: string, segmentStart: string, later: boolean) {
    if (entry.calendar || !later) return onDate
    return entry.start === segmentStart ? entry.end : segmentStart
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
    const ctx = await this.accrualContext(employeeId)
    const { entry } = await this.resolveAt(this.balances, employeeId, balanceType, onDate, ctx)
    if (!entry) return null
    return this.view(entry.row, onDate, ctx, inclusiveEnd, entry)
  }

  // صف السنة الجارية لكل نوع رصيد (السنوي والمرضي حسب أساس تجديد النوع)
  private currentViews(rows: LeaveBalance[], onDate: string, ctx: AccrualContext): BalanceView[] {
    const types = [...new Set([...rows].sort((a, b) => a.id - b.id).map((r) => r.balanceType))]
    const out: BalanceView[] = []
    for (const t of types) {
      const own = rows.filter((r) => r.balanceType === t)
      const entry = periodAt(balanceTimeline(own, ctx.joinDate, this.basisOf(ctx, t)), onDate)
      if (entry) out.push(this.view(entry.row, onDate, ctx, false, entry))
    }
    return out
  }

  async allBalances(employeeId: number) {
    const onDate = localDateOf(new Date())
    const ctx = await this.accrualContext(employeeId)
    const rows = await this.balances.find({ where: { employeeId } })
    return this.currentViews(rows, onDate, ctx)
  }

  // أرصدة السنة الجارية لكل موظفي النطاق دفعة واحدة — شاشة الأرصدة (LEV-23).
  // استعلام للموظفين وواحد للصفوف والإعدادات مرة، بدل نداء لكل موظف (~180).
  // تعذّر حساب موظف يرجع في صفّه (error) ولا يُسقط الباقي؛ branchId null = كل الفروع، مصفوفة = فروع النطاق
  async bulkBalances(branchId: BranchScope | number) {
    const onDate = localDateOf(new Date())
    const year = Number(onDate.slice(0, 4))
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
      where: branchScopeWhere(branchId),
      order: { id: 'ASC' },
    })
    // صفوف السنة الجارية والسابقة (سنة الذكرى تبدأ في السنة السابقة أحيانًا)
    const qb = this.balances
      .createQueryBuilder('b')
      .where('(b.period IN (:...years) OR b.period LIKE :cur OR b.period LIKE :prev)', {
        years: [String(year), String(year - 1)],
        cur: `${year}-%`,
        prev: `${year - 1}-%`,
      })
    const scope = asBranchScope(branchId)
    if (scope !== null) {
      const [inScope, params] = branchScopeQb('e.branchId', scope)
      qb.andWhere(`b.employeeId IN (SELECT e.id FROM employees e WHERE ${inScope})`, params)
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
          balances: this.currentViews(byEmp.get(e.id) ?? [], onDate, ctx),
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
  // صف السنة الناقص بيتحسب من الإعدادات (LEV-2) من غير ما يتحفظ هنا (CRP2W-B02)؛ pendingDays = أيام طلبات إجازة
  // معلّقة على نفس الرصيد والسنة، محجوزة لحد ما تتنفذ أو تترفض (LEV-3)
  async assertSufficient(
    employeeId: number,
    balanceType: BalanceType,
    days: number,
    onDate: string,
    pendingDays = 0
  ) {
    const ctx = await this.accrualContext(employeeId)
    const segment = this.gateSegment(onDate)
    await this.assertOpenService(this.balances.manager, employeeId, segment.start)
    const entry = await this.entryAt(this.balances, employeeId, balanceType, segment.start, ctx)
    const measure = this.measureDate(entry, onDate, segment.start, segment.later)
    const view = this.view(entry.row, measure, ctx, false, entry)
    const available = Math.round((view.remaining - pendingDays) * 100) / 100
    if (available < days) {
      // موظف جديد لسه ما استحقش سنوي (شهور بداية الاستحقاق من نوع السنوية): نقول السبب بدل «الرصيد غير كافٍ»
      const eligible = balanceType === 'annual' ? entitlementEligibleDate(ctx.joinDate, ctx.probationMonths) : null
      if (eligible && measure < eligible) {
        throw new BadRequestException(
          (Number(ctx.probationMonths) > 0
            ? `الإجازة السنوية بتبدأ بعد ${ctx.probationMonths} شهر من التعيين — أول يوم مستحق ${eligible}`
            : `الإجازة السنوية بتبدأ من تاريخ التعيين ${eligible}`) +
            ` (المتاح قبلها ${Math.max(0, available)} يوم والمطلوب ${days})`
        )
      }
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
  }, actorUserId: number, branchScope: BranchScope | number) {
    const onDate = localDateOf(new Date())
    const reason = dto.reason?.trim()
    const cents = (value: number) => Math.round(value * 100) / 100
    const notCurrent = 'التعديل اليدوي متاح لرصيد السنة الجارية فقط'
    if (!(isYearKey(dto.period) || isDateKey(dto.period)) || (isYearKey(dto.period) && dto.period !== onDate.slice(0, 4))) {
      throw new BadRequestException(notCurrent)
    }
    if (!Number.isFinite(dto.delta) || dto.delta === 0 || Math.abs(dto.delta) > 9999.99 || Math.abs(dto.delta - cents(dto.delta)) > 1e-8) {
      throw new BadRequestException('التعديل يجب أن يكون عدداً غير صفري بدقة منزلتين عشريتين وبحد أقصى 9999.99 يوم')
    }
    if (!reason || reason.length < 3 || reason.length > 500) throw new BadRequestException('سبب التعديل مطلوب من 3 إلى 500 حرف')
    return this.balances.manager.transaction(async em => {
      // Employee first serializes first-row creation and freezes branch scope.
      const employee = await em.findOne(Employee, { where: { id: employeeId }, lock: { mode: 'pessimistic_write' } })
      if (!employee || !inBranchScope(asBranchScope(branchScope), employee.branchId)) throw new NotFoundException('الموظف غير موجود')
      const ctx = this.contextOf(employee, await this.accrualSettings(em, employee.id))
      const repo = em.getRepository(LeaveBalance)
      const current = await this.resolveAt(repo, employeeId, dto.balanceType, onDate, ctx)
      if (dto.period !== (current.entry?.key ?? current.key)) throw new BadRequestException(notCurrent)
      const where = { employeeId, balanceType: dto.balanceType, period: dto.period }
      let bal = await em.findOne(LeaveBalance, { where, lock: { mode: 'pessimistic_write' } })
      const entryFor = (row: LeaveBalance) =>
        periodAt(balanceTimeline([...current.rows.filter((r) => r.period !== row.period), row], ctx.joinDate, this.basisOf(ctx, row.balanceType)), onDate) ??
        this.entryOf(row, ctx)
      const prior = await em.findOneBy(LeaveBalanceAdjustment, { ...where, idempotencyKey: dto.idempotencyKey })
      if (prior) {
        if (num(prior.delta) !== dto.delta || prior.reason !== reason || prior.actorUserId !== actorUserId) {
          throw new ConflictException('مفتاح العملية مستخدم لتعديل مختلف — أعد فتح نموذج التعديل')
        }
        if (!bal) throw new ConflictException('سجل التعديل موجود لكن صف الرصيد غير موجود')
        return { balance: this.view(bal, onDate, ctx, false, entryFor(bal)), adjustment: prior, replayed: true }
      }
      if (['archived', 'terminated'].includes(employee.status)) throw new BadRequestException('لا يمكن تعديل رصيد موظف مؤرشف أو منتهية خدمته')
      if (!bal) {
        if (!isTyped(dto.balanceType)) throw new BadRequestException('لا يوجد رصيد من هذا النوع للموظف')
        bal = await em.save(LeaveBalance, em.create(LeaveBalance, { ...where,
          entitled: ctx.policy[dto.balanceType],
          taken: 0, openingDays: 0, openingTaken: 0, adjustmentDays: 0 }))
      }
      const entry = entryFor(bal)
      const before = this.view(bal, onDate, ctx, false, entry)
      if (dto.expectedRemaining !== undefined && dto.expectedRemaining !== before.remaining) {
        throw new ConflictException('تغير الرصيد منذ فتح النافذة — حدّث البيانات وراجع التعديل')
      }
      const afterAdjustment = cents(num(bal.adjustmentDays) + dto.delta)
      if (Math.abs(afterAdjustment) > 999999.99) throw new BadRequestException('إجمالي التعديلات يتجاوز الحد المدعوم')
      bal.adjustmentDays = afterAdjustment
      const after = this.view(bal, onDate, ctx, false, entry)
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
    if (!isYearKey(period) && !isDateKey(period)) throw new BadRequestException('السنة غير صالحة')
    return this.balances.manager.find(LeaveBalanceAdjustment, {
      where: { employeeId, period }, order: { id: 'DESC' },
    })
  }

  // الخصم بالطبقات: الافتتاحي الساري أولاً ثم استحقاق السنة. الأيام لازم موجبة
  // (السالب كان بيزوّد الرصيد — LEV-4)، وصف السنة الناقص يتعمل (LEV-2).
  // سنة الرصيد = اللي تغطي أول يوم للإجازة داخل السنة (openingOnDate)
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
    // CRP2V (B2.10): صف الموظف الأول (نفس ترتيب التعديل اليدوي وإعادة التعيين: الموظف ثم الرصيد)، وبعده بس بيتقري تاريخ تعيينه وصفوف رصيده —
    // فخصم بدأ قبل إعادة تعيين مايكمّلش بعدها بحكم الفترة القديمة. وتاريخ جوه فترة خدمة مقفولة مالوش رصيد يتخصم منه
    await this.lockEmployee(em, employeeId, false)
    await this.assertOpenService(em, employeeId, openingOnDate)
    const ctx = await this.accrualContext(employeeId, em)
    const repo = em.getRepository(LeaveBalance)
    const entry = await this.ensureAt(repo, employeeId, balanceType, openingOnDate, ctx)
    const bal = await repo.findOneOrFail({ where: { employeeId, balanceType, period: entry.key }, lock: { mode: 'pessimistic_write' } })
    const measure = this.measureDate(entry, onDate, openingOnDate, openingOnDate !== onDate)
    const available = this.view(bal, measure, ctx, false, { ...entry, row: bal }).remaining
    if (available < days) throw new BadRequestException('الرصيد غير كافٍ عند التنفيذ — المتبقي ' + available + ' يوم')
    const openingValid = !bal.openingExpiry || bal.openingExpiry >= openingOnDate
    const openingAvailable = openingValid
      ? Math.max(0, num(bal.openingDays) - num(bal.openingTaken))
      : 0
    const fromOpening = Math.min(days, openingAvailable)
    bal.openingTaken = num(bal.openingTaken) + fromOpening
    bal.taken = num(bal.taken) + days
    await repo.save(bal)
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

  // إرجاع رصيد إجازة بنفس تقسيم السنين وسنة الرصيد اللي اتخصم منها (من حمولة طلبها)
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
    // CRP2V: صف الموظف الأول (زي الخصم)، فالإرجاع بيتحكم بفترات الخدمة المثبتة ومايتقاطعش مع إعادة تعيين شغالة
    await this.lockEmployee(em, leave.employeeId, false)
    const ctx = await this.accrualContext(leave.employeeId, em)
    // B2.10: إجازة من فترة خدمة مقفولة (الموظف اتعيّن تاني بعدها): صف رصيد فترتها متجمّد على حاله، ورصيد الفترة الحالية مابيتزوّدش بيها
    const closedThrough = await closedServiceThrough(em, leave.employeeId)
    for (const [year, d] of Object.entries(byYear)) {
      if (closedThrough && this.leaveYearStart(year, String(leave.fromDate)) <= closedThrough) continue
      const { entry } = await this.resolveAt(
        em.getRepository(LeaveBalance),
        leave.employeeId,
        balanceType,
        this.leaveYearStart(year, String(leave.fromDate)),
        ctx
      )
      await this.restore(em, leave.employeeId, balanceType, d, entry?.key ?? year)
    }
  }

  // صفوف السنوي والمرضي اللي تغطي بداية سنة لكل الموظفين النشطين — المرضي
  // مابيترحّلش فصفه لازم يتعمل مع بداية كل سنة (LEV-2). الموجود مابيتلمسش
  async ensureYearRows(period: string, branchId: BranchScope | number = null) {
    const emps = await this.employees.find({
      where: { status: Not(In(['terminated', 'archived'])), ...branchScopeWhere(branchId) },
      select: { id: true, joinDate: true, annualLeaveEntitled: true },
    })
    return this.ensureRowsOf(period, emps, TYPED)
  }

  // تاريخ صف السنة لموظف: اتعيّن بعد السنة مالوش صف فيها (null)، واللي اتعيّن خلالها صفه من يوم تعيينه
  private yearRowDate(period: string, joinDate: Employee['joinDate']): string | null {
    const join = joinDate ? String(joinDate).slice(0, 10) : ''
    if (join > `${period}-12-31`) return null
    return join > `${period}-01-01` ? join : `${period}-01-01`
  }

  // موظف اتعيّن بعد السنة مالوش صف فيها، واللي اتعيّن خلالها صفه من يوم تعيينه.
  // CRP2W-B02: الفحص الأول من غير قفل على الموظفين اللي اتقروا بالجملة؛ والصف الناقص بيتعمل جوه معاملة ماسكة صف موظفه (نفس قفل إعادة
  // التعيين)، وبتاريخ تعيينه وحالته وصفوفه اللي اتقروا بعد القفل — فمفيش صف بيتكتب بمفتاح تاريخ تعيين قديم
  private async ensureRowsOf(period: string, emps: Array<Pick<Employee, 'id' | 'joinDate' | 'annualLeaveEntitled'>>, types: TypedBalance[]) {
    const settings = await this.accrualSettings()
    let created = 0
    for (const e of emps) {
      const date = this.yearRowDate(period, e.joinDate)
      if (!date) continue
      const ctx = this.contextOf(e, settings)
      for (const t of types) {
        if ((await this.resolveAt(this.balances, e.id, t, date, ctx)).entry) continue
        const made = await this.balances.manager.transaction(async (em) => {
          await this.lockEmployee(em, e.id, true)
          const now = await em.getRepository(Employee).findOne({
            where: { id: e.id, status: Not(In(['terminated', 'archived'])) },
            select: { id: true, joinDate: true, annualLeaveEntitled: true },
          })
          const fresh = now ? this.yearRowDate(period, now.joinDate) : null
          if (!now || !fresh) return false
          const repo = em.getRepository(LeaveBalance), current = this.contextOf(now, await this.settingsAfterLock(em, e.id, settings))
          if ((await this.resolveAt(repo, e.id, t, fresh, current)).entry) return false
          await this.ensureAt(repo, e.id, t, fresh, current)
          return true
        })
        if (made) created++
      }
    }
    return created
  }

  // قبل إقفال سنة: صفوف السنة المقفولة الناقصة للأنواع اللي بتترحّل. موظف ماخدش إجازة ولا اتعدّل رصيده
  // مالوش صف فيها، ومتبقيه كان بيضيع من الترحيل بصمت
  private async ensureClosingRows(fromPeriod: string, branchId: BranchScope | number) {
    const settings = await this.accrualSettings()
    const types = TYPED.filter((t) => settings.types[t].carryOverEnabled)
    if (!types.length) return 0
    const emps = await this.employees.find({
      where: { status: Not(In(['terminated', 'archived'])), ...branchScopeWhere(branchId) },
      select: { id: true, joinDate: true, annualLeaveEntitled: true },
    })
    return this.ensureRowsOf(fromPeriod, emps, types)
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
      const closingEnsured = await this.ensureClosingRows(fromPeriod, null)
      const result = { ...(await this.rollover(fromPeriod)), closingEnsured }
      await this.config.save({ ...(done ?? {}), key, value: fromPeriod })
      return result
    } finally { this.rolloverRunning = false }
  }

  // ===== الترحيل السنوي: متبقي سنة ميلادية → طبقة افتتاحية لسنة الرصيد التالية =====
  // فقط لو الترحيل مفعّل في النوع وبحد سقفه (null = بلا سقف). سنة الرصيد التالية حسب
  // أساس التجديد (سنة ميلادية أو ذكرى تعيين تبدأ بعد نهاية السنة). وبعده صفوف السنة
  // الجديدة الناقصة لكل النشطين. سنة ذكرى التعيين اللي خلصت خلال السنة المقفولة بتترحّل كمان
  // (التجديد اليومي بيرحّلها أول شهر بس). مايتكررش: المُرحّل مرة واحدة على صف السنة الجديدة
  // branchId (فصل الفروع): المستخدم المقيد بفروع يرحّل أرصدة موظفي فروعه فقط؛ null = الشركة (المهمة الآلية ومدير النظام)
  async rollover(fromPeriod: string, branchId: BranchScope | number = null) {
    if (!isYearKey(fromPeriod)) throw new BadRequestException('السنة غير صالحة')
    const toPeriod = String(Number(fromPeriod) + 1)
    const settings = await this.accrualSettings()
    const expiry = carryOverExpiry(`${toPeriod}-01-01`, settings.expiryMonths)
    const today = localDateOf(new Date())
    const inBranch = branchId === null ? null
      : new Set((await this.employees.find({ where: branchScopeWhere(branchId), select: { id: true } })).map((e) => e.id))
    let created = 0
    for (const t of TYPED) {
      if (!settings.types[t].carryOverEnabled) continue
      const rows = [
        ...(await this.balances.find({ where: { period: fromPeriod, balanceType: t } })),
        ...(await this.balances.find({
          where: [
            { balanceType: t, period: Like(`${fromPeriod}-%`) },
            { balanceType: t, period: Like(`${Number(fromPeriod) - 1}-%`) },
          ],
        })),
      ]
      for (const bal of rows) {
        if (inBranch && !inBranch.has(bal.employeeId)) continue
        // CRP2V-B-B02: الصف المصدر بيتحكم ويتكتب جوه معاملة ماسكة صف موظفه (نفس قفل إعادة التعيين)، وكل قراءاته بعد القفل —
        // فصف اتجمّد مع فترة خدمة مقفولة بيخرج من الخط الزمني، ومُرحّله مايوصلش لرصيد الفترة الجديدة
        if (await this.balances.manager.transaction((em) => this.rolloverRow(em, bal.id, bal.employeeId, t, fromPeriod, today, settings))) created++
      }
    }
    const ensured = await this.ensureYearRows(toPeriod, branchId)
    const annual = settings.types.annual
    return {
      fromPeriod,
      toPeriod,
      created,
      ensured,
      maxCarry: annual.carryOverEnabled ? annual.carryOverMaxDays : 0,
      expiry,
    }
  }

  // المُرحّل على صف السنة الجديدة مرة واحدة بس
  private async applyCarry(repo: Repository<LeaveBalance>, row: LeaveBalance, carry: number, expiry: string) {
    if (this.hasOpening(row) || !(carry > 0)) return false
    row.openingDays = carry
    row.openingTaken = 0
    row.openingExpiry = expiry
    await repo.save(row)
    return true
  }

  // CRP2V (B2.10): صف الموظف هو نقطة الترتيب بين كتّاب الرصيد وإعادة التعيين (نفس قفل التعديل اليدوي): اللي بيكتب في رصيد موظف بياخده
  // الأول، وبعده بس بيقرا تاريخ تعيينه وصفوف رصيده — فمفيش حكم اتاخد قبل إعادة تعيين بيتكتب بعدها.
  //  • wait=true للمهام الخلفية (الترحيل السنوي والتجديد اليومي): أول حاجة في معاملة صغيرة مش ماسكة غيره، فالانتظار آمن.
  //  • wait=false للخصم والإرجاع: بيتنادوا جوه معاملة ماسكة صف الطلب أو الإجازة، فالانتظار ممكن يتقاطع مع اللي ماسك صف الموظف وبيقرا
  //    طلباته وإجازاته (الإيقاف، إعادة التعيين) — فلو الصف ممسوك الرد 409 «جرّب تاني» بدل الانتظار
  private async lockEmployee(em: EntityManager, employeeId: number, wait: boolean) {
    try {
      await em.query(`SELECT [id] FROM dbo.employees WITH (UPDLOCK, ROWLOCK${wait ? '' : ', NOWAIT'}) WHERE [id] = @0`, [employeeId])
    } catch (error) {
      const failure = error as { number?: number; driverError?: { number?: number } }
      // 1222 = الصف ممسوك (مهلة القفل صفر)
      if (!wait && Number(failure?.driverError?.number ?? failure?.number) === 1222) throw new ConflictException(LEAVE_EMPLOYEE_BUSY)
      throw error
    }
  }

  // تاريخ جوه فترة خدمة مقفولة (الموظف اتعيّن تاني بعدها): رصيدها اتجمّد مع التصفية، فمفيش خصم جديد عليه — والإلغاء مابيرجّعش (restoreLeave)
  private async assertOpenService(em: EntityManager, employeeId: number, date: string) {
    const closedThrough = await closedServiceThrough(em, employeeId)
    if (closedThrough && date <= closedThrough) {
      throw new BadRequestException(`تاريخ الإجازة (${date}) جوه فترة خدمة مقفولة للموظف (لحد ${closedThrough}) — رصيد الفترة دي اتقفل مع تصفيتها`)
    }
  }

  // صف مصدر واحد في الترحيل السنوي، والمنادي فاتح معاملة: صف الموظف بيتمسك الأول وكل القراءات بعده. true = مُرحّل اتحط على صف السنة التالية
  private async rolloverRow(em: EntityManager, rowId: number, employeeId: number, t: TypedBalance, fromPeriod: string, today: string, settings: AccrualSettings): Promise<boolean> {
    await this.lockEmployee(em, employeeId, true)
    const repo = em.getRepository(LeaveBalance)
    const ctx = await this.accrualContext(employeeId, em, await this.settingsAfterLock(em, employeeId, settings))
    const all = await repo.find({ where: { employeeId, balanceType: t } })
    const timeline = balanceTimeline(all, ctx.joinDate, this.basisOf(ctx, t))
    const own = timeline.find((e) => e.row.id === rowId)
    if (!own) return false
    if (!own.calendar && !(own.end.slice(0, 4) === fromPeriod && own.end < today)) return false
    const carry = carryOverDays(settings.types[t], this.view(own.row, own.end, ctx, true, own).remaining)
    const nextDate = addDays(own.end, 1)
    const next = periodAt(timeline, nextDate)
    // صف السنة الجديدة ممكن يكون اتعمل بدري (إجازة بتعدّي السنة أو خصم) من غير مُرحّل — نكمّل المُرحّل عليه بدل ما يضيع؛ المُرحّل مرة واحدة بس
    if (next) return this.applyCarry(repo, next.row, carry, carryOverExpiry(next.start, settings.expiryMonths))
    const key = periodKeyFor(nextDate, ctx.joinDate, this.basisOf(ctx, t))
    if (all.some((r) => r.period === key)) return false
    try {
      await repo.save(
        repo.create({
          employeeId,
          balanceType: t,
          period: key,
          // استحقاق النوع (0 لغير المستحق) مش رقم ثابت لكل الناس
          entitled: ctx.policy[t],
          taken: 0,
          openingDays: carry,
          openingTaken: 0,
          openingExpiry: carryOverExpiry(nextDate, settings.expiryMonths),
        })
      )
      return true
    } catch (e) {
      // اتعمل بالتوازي (فحص رصيد برّه قفل الموظف) — نكمّل المُرحّل عليه
      const again = await repo.findOne({ where: { employeeId, balanceType: t, period: key } })
      if (!again) throw e
      return this.applyCarry(repo, again, carry, carryOverExpiry(nextDate, settings.expiryMonths))
    }
  }

  // تجديد سنوات رصيد موظف واحد لكل نوع: صف سنة الذكرى اللي بدأت، ومزامنة استحقاق السنة الجارية، وترحيل متبقي السنة اللي قبلها مرة.
  // write=false: عدّ اللي هيتكتب بس، على صفوف اتقرت بالجملة. write=true: الكتابة — والمنادي ماسك صف الموظف وقاري صفوفه بعد القفل
  private async renewEmployee(repo: Repository<LeaveBalance>, e: Pick<Employee, 'id' | 'joinDate' | 'annualLeaveEntitled'>, rows: LeaveBalance[],
    today: string, settings: AccrualSettings, write: boolean) {
    const ctx = this.contextOf(e, settings)
    let created = 0, carried = 0, synced = 0
    for (const t of TYPED) {
      const typeSettings = settings.types[t]
      const basis = this.basisOf(ctx, t)
      const own = rows.filter((r) => r.balanceType === t)
      let timeline = balanceTimeline(own, ctx.joinDate, basis)
      let entry = periodAt(timeline, today)
      if (!entry) {
        const key = periodKeyFor(today, ctx.joinDate, basis)
        const last = timeline.filter((x) => x.end < today).sort((a, b) => (a.end < b.end ? -1 : 1)).pop()
        // سنة ميلادية بلا صف: السلوك القديم (تتعمل عند الحاجة) إلا بعد سنة ذكرى انتهت
        if (isYearKey(key) && !(last && !last.calendar)) continue
        if (own.some((r) => r.period === key)) continue
        let row: LeaveBalance | null = repo.create({
          employeeId: e.id,
          balanceType: t,
          period: key,
          entitled: ctx.policy[t],
          taken: 0,
          openingDays: 0,
          openingTaken: 0,
        })
        if (!write) created++
        else {
          try {
            row = await repo.save(row)
            created++
          } catch (err) {
            row = await repo.findOne({ where: { employeeId: e.id, balanceType: t, period: key } })
            if (!row) throw err
          }
        }
        own.push(row)
        timeline = balanceTimeline(own, ctx.joinDate, basis)
        entry = periodAt(timeline, today)
        if (!entry) continue
      }
      const row = entry.row
      let dirty = false
      if (num(row.entitled) !== ctx.policy[t]) {
        row.entitled = ctx.policy[t]
        dirty = true
        synced++
      }
      const prev = previousEntry(timeline, entry)
      if (
        prev &&
        addDays(prev.end, 1) === entry.start &&
        (!entry.calendar || !prev.calendar) &&
        dayCount(entry.start, today) <= 31 &&
        !this.hasOpening(row)
      ) {
        const carry = carryOverDays(typeSettings, this.view(prev.row, prev.end, ctx, true, prev).remaining)
        if (carry > 0) {
          row.openingDays = carry
          row.openingTaken = 0
          row.openingExpiry = carryOverExpiry(entry.start, settings.expiryMonths)
          dirty = true
          carried++
        }
      }
      if (dirty && write) await repo.save(row)
    }
    return { created, carried, synced }
  }

  // «إقفال السنة» من الشاشة: صفوف السنة المقفولة الناقصة ثم نفس الترحيل، واحد في المرة
  // (المهمة الآلية أو إقفال تاني شغال = تعارض)
  async closeYear(fromPeriod: string, branchId: BranchScope | number) {
    if (!isYearKey(fromPeriod)) throw new BadRequestException('السنة غير صالحة')
    if (this.rolloverRunning) throw new ConflictException('الإقفال أو الترحيل الآلي شغال دلوقتي — استنى دقيقة وجرّب تاني')
    this.rolloverRunning = true
    try {
      const closingEnsured = await this.ensureClosingRows(fromPeriod, branchId)
      return { ...(await this.rollover(fromPeriod, branchId)), closingEnsured }
    } finally {
      this.rolloverRunning = false
    }
  }

  // ===== إقفال سنة الإجازات (السنوي) =====
  // سنة الرصيد اللي بتخلص في السنة المختارة: الميلادية 'YYYY'، أو سنة ذكرى التعيين اللي آخر يوم
  // فيها جوه السنة. موظف بلا صف = صف افتراضي من الإعداد (مابيتحفظش إلا عند التسوية).
  // السنة اللي خلصت تتقاس على آخر يومها (زي الترحيل)، والجارية على النهارده.
  // المُرحّل: الفعلي لو السنة اتقفلت (طبقة افتتاحية على صف السنة اللي بعدها)، وإلا المتوقع بسقف النوع؛
  // اللي يسقط = المتبقي − المُرحّل. اللي يتسوّى بعد الإقفال = اللي سقط بس (المُرحّل بقى في السنة الجديدة)
  private closingState(employeeId: number, rows: LeaveBalance[], ctx: AccrualContext, year: string, today: string) {
    const basis = this.basisOf(ctx, 'annual')
    let timeline = balanceTimeline(rows, ctx.joinDate, basis)
    let entry: Entry | null = timeline.filter((e) => e.end.slice(0, 4) === year).sort((a, b) => (a.end < b.end ? 1 : -1))[0] ?? null
    let virtual = false
    if (!entry) {
      const key = periodKeyFor(`${year}-01-01`, ctx.joinDate, basis)
      if (rows.some((r) => r.period === key)) return null
      const row = this.balances.create({
        employeeId, balanceType: 'annual', period: key, entitled: ctx.policy.annual,
        taken: 0, openingDays: 0, openingTaken: 0, adjustmentDays: 0, settledDays: 0,
      })
      timeline = balanceTimeline([...rows, row], ctx.joinDate, basis)
      entry = timeline.find((e) => e.row === row) ?? null
      if (!entry || entry.end.slice(0, 4) !== year) return null
      virtual = true
    }
    const join = ctx.joinDate ? String(ctx.joinDate).slice(0, 10) : ''
    if (join > entry.end) return null
    const ended = entry.end < today
    const measure = ended ? entry.end : today
    const view = this.view(entry.row, measure, ctx, ended, entry)
    const next = periodAt(timeline, addDays(entry.end, 1))
    const split = yearEndSplit(view.remaining, ctx.settings.annual, next && this.hasOpening(next.row) ? num(next.row.openingDays) : null)
    return {
      entry,
      virtual,
      ended,
      measure,
      view,
      carried: split.carried,
      lapsed: split.lapsed,
      // مفيش حاجة مستنية الإقفال: صف السنة الجديدة موجود والمُرحّل اتحط (أو مفيش حاجة تترحّل)
      closed: ended && !!next && !split.pendingCarry,
      settleable: split.settleable,
      eligibleFrom: entitlementEligibleDate(ctx.joinDate, ctx.probationMonths),
    }
  }

  // معاينة الإقفال لكل موظفي النطاق (branchId null = الشركة، مصفوفة = فروع النطاق): استعلام للموظفين وواحد للصفوف
  async yearEndPreview(year: string, branchId: BranchScope | number, today = localDateOf(new Date())) {
    if (!isYearKey(year)) throw new BadRequestException('السنة غير صالحة')
    const y = Number(year)
    const emps = await this.employees.find({
      select: { id: true, fullName: true, employeeCode: true, branchId: true, departmentId: true, joinDate: true, status: true, annualLeaveEntitled: true },
      where: { status: Not(In(['terminated', 'archived'])), ...branchScopeWhere(branchId) },
      order: { id: 'ASC' },
    })
    const rows = await this.balances.find({
      where: [
        { balanceType: 'annual', period: In([String(y - 1), year, String(y + 1)]) },
        { balanceType: 'annual', period: Like(`${y - 1}-%`) },
        { balanceType: 'annual', period: Like(`${year}-%`) },
        { balanceType: 'annual', period: Like(`${y + 1}-%`) },
      ],
    })
    const byEmp = new Map<number, LeaveBalance[]>()
    for (const b of rows) byEmp.set(b.employeeId, [...(byEmp.get(b.employeeId) ?? []), b])
    const settings = await this.accrualSettings()
    const out: YearEndRow[] = []
    for (const e of emps) {
      const employee = { id: e.id, fullName: e.fullName, employeeCode: e.employeeCode, branchId: e.branchId, departmentId: e.departmentId, joinDate: e.joinDate ?? null }
      try {
        const ctx = this.contextOf(e, settings)
        const own = byEmp.get(e.id) ?? []
        const s = this.closingState(e.id, own, ctx, year, today)
        // مالوش سنة رصيد في السنة دي، أو مش مستحق سنوي ومالوش صف أصلًا
        if (!s || (s.virtual && ctx.policy.annual === 0)) continue
        out.push({ employee, ...this.yearEndFigures(s) })
      } catch (err) {
        out.push({ employee, error: err instanceof Error ? err.message : 'تعذّر حساب الرصيد' })
      }
    }
    return {
      settings: {
        mode: settings.mode,
        carryOverEnabled: settings.types.annual.carryOverEnabled,
        carryOverMaxDays: settings.types.annual.carryOverMaxDays,
        entitlementStartMonths: settings.types.annual.entitlementStartMonths ?? settings.probationMonths,
        firstYearProrated: settings.types.annual.firstYearProrated,
      },
      rows: out,
    }
  }

  private yearEndFigures(s: NonNullable<ReturnType<LeaveBalancesService['closingState']>>): YearEndFigures {
    const v = s.view
    const cents = (x: number) => Math.round(x * 100) / 100
    // المرحّل من السنة اللي قبلها: كله لو ساري، والمستخدم منه بس لو انتهت صلاحيته
    const opening = v.opening.expired ? v.opening.taken : v.opening.days
    return {
      period: s.entry.key,
      periodStart: s.entry.start,
      periodEnd: s.entry.end,
      ended: s.ended,
      measureDate: s.measure,
      annualEntitlement: v.annualEntitlement,
      accrued: v.accruedToDate,
      opening,
      adjustments: v.adjustmentDays,
      entitledTotal: cents(v.accruedToDate + opening + v.adjustmentDays),
      used: v.totalTaken,
      settled: v.settledDays,
      remaining: v.remaining,
      deficit: v.deficit,
      carried: s.carried,
      lapsed: s.lapsed,
      closed: s.closed,
      settleable: s.settleable,
      // موظف جديد: أول يوم يستحق فيه سنوي لو جوه سنة الرصيد دي
      eligibleFrom: s.eligibleFrom && s.eligibleFrom > s.entry.start ? s.eligibleFrom : null,
    }
  }

  // تسوية رصيد موظف جوه معاملة (الموظف مقفول من المنادي): المتبقي القابل للتسوية كله بيتصفّر
  // على صف سنة الرصيد (settledDays)؛ الصف الافتراضي بيتحفظ الأول. expectedDays = اللي ظاهر في
  // الشاشة — لو اتغير (إجازة اتعتمدت في النص) = تعارض بدل ما نسوّي رقم ماشافهوش
  async settleYearEnd(em: EntityManager, employee: Employee, year: string, expectedDays?: number, today = localDateOf(new Date())) {
    if (!isYearKey(year)) throw new BadRequestException('السنة غير صالحة')
    const ctx = this.contextOf(employee, await this.accrualSettings(em, employee.id))
    const repo = em.getRepository(LeaveBalance)
    let rows = await repo.find({ where: { employeeId: employee.id, balanceType: 'annual' } })
    let state = this.closingState(employee.id, rows, ctx, year, today)
    if (!state) throw new BadRequestException(`الموظف مالوش سنة رصيد سنوي بتخلص في ${year}`)
    if (state.virtual) {
      try {
        await repo.save(state.entry.row)
      } catch (e) {
        if (!(await repo.findOne({ where: { employeeId: employee.id, balanceType: 'annual', period: state.entry.key } }))) throw e
      }
    }
    const period = state.entry.key
    const locked = await repo.findOne({ where: { employeeId: employee.id, balanceType: 'annual', period }, lock: { mode: 'pessimistic_write' } })
    if (!locked) throw new ConflictException('صف الرصيد اتغير — حدّث الصفحة')
    rows = [...(await repo.find({ where: { employeeId: employee.id, balanceType: 'annual' } })).filter((r) => r.id !== locked.id), locked]
    state = this.closingState(employee.id, rows, ctx, year, today)
    if (!state || state.entry.row !== locked) throw new ConflictException('سنة الرصيد اتغيرت — حدّث الصفحة')
    const days = state.settleable
    if (!(days > 0)) {
      throw new BadRequestException(
        state.view.remaining > 0 ? 'المتبقي كله اترحّل للسنة الجديدة — سوّيه من رصيد السنة الجديدة' : 'مفيش رصيد متبقي يتسوّى'
      )
    }
    if (expectedDays !== undefined && Math.abs(Number(expectedDays) - days) > 0.001) {
      throw new ConflictException(`الرصيد اتغير من ساعة ما فتحت الشاشة (بقى ${days} يوم) — حدّث وراجع`)
    }
    const before = state.view
    locked.settledDays = Math.round((num(locked.settledDays) + days) * 100) / 100
    await repo.save(locked)
    const after = this.closingState(employee.id, rows, ctx, year, today)!
    return { period, days, beforeRemaining: before.remaining, after: this.yearEndFigures(after) }
  }

  private hasOpening(row: LeaveBalance) {
    return num(row.openingDays) > 0 || num(row.openingTaken) > 0 || !!row.openingExpiry
  }

  // ===== التجديد اليومي لسنوات الرصيد بذكرى التعيين =====
  // لكل موظف نشط ونوع (سنوي/مرضي): صف سنة الذكرى اللي بدأت يتعمل في يومها، والمتبقي
  // من السنة السابقة يترحّل عليه مرة (لو مفعّل وبسقفه) خلال أول شهر منها. السنة
  // الميلادية بعد سنة ميلادية يتولاها rollover. واستحقاق السنة الجارية المخزّن يتزامن
  // مع النوع حتى تُحفظ السنة المنقضية بقيمتها الصحيحة
  async renewBalancePeriods(today = localDateOf(new Date())) {
    if (this.renewalRunning) return null
    this.renewalRunning = true
    try {
      const settings = await this.accrualSettings()
      const emps = await this.employees.find({
        where: { status: Not(In(['terminated', 'archived'])) },
        select: { id: true, joinDate: true, annualLeaveEntitled: true },
      })
      const year = Number(today.slice(0, 4))
      const typeIn = In(TYPED)
      const rows = await this.balances.find({
        where: [
          { balanceType: typeIn, period: In([String(year), String(year - 1)]) },
          { balanceType: typeIn, period: Like(`${year}-%`) },
          { balanceType: typeIn, period: Like(`${year - 1}-%`) },
        ],
      })
      const byEmp = new Map<number, LeaveBalance[]>()
      for (const b of rows) byEmp.set(b.employeeId, [...(byEmp.get(b.employeeId) ?? []), b])
      let created = 0
      let carried = 0
      let synced = 0
      for (const e of emps) {
        // CRP2V-B-B02: التقييم الأول على صفوف اتقرت بالجملة ومن غير كتابة؛ الموظف اللي محتاج كتابة بس بيتعاد حكمه ويتكتب جوه معاملة
        // ماسكة صفه (نفس قفل إعادة التعيين) وبصفوف اتقرت بعد القفل — فمفيش مُرحّل من صف قديم بيتحط بعد إعادة تعيين
        const plan = await this.renewEmployee(this.balances, e, byEmp.get(e.id) ?? [], today, settings, false)
        if (!plan.created && !plan.carried && !plan.synced) continue
        const done = await this.balances.manager.transaction(async (em) => {
          await this.lockEmployee(em, e.id, true)
          const now = await em.getRepository(Employee).findOne({
            where: { id: e.id, status: Not(In(['terminated', 'archived'])) },
            select: { id: true, joinDate: true, annualLeaveEntitled: true },
          })
          if (!now) return { created: 0, carried: 0, synced: 0 }
          const repo = em.getRepository(LeaveBalance)
          const fresh = await repo.find({
            where: [
              { employeeId: e.id, balanceType: typeIn, period: In([String(year), String(year - 1)]) },
              { employeeId: e.id, balanceType: typeIn, period: Like(`${year}-%`) },
              { employeeId: e.id, balanceType: typeIn, period: Like(`${year - 1}-%`) },
            ],
          })
          return this.renewEmployee(repo, now, fresh, today, await this.settingsAfterLock(em, e.id, settings), true)
        })
        created += done.created
        carried += done.carried
        synced += done.synced
      }
      return { created, carried, synced }
    } finally {
      this.renewalRunning = false
    }
  }
}
