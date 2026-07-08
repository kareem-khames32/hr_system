import { BadRequestException, Injectable } from '@nestjs/common'
import { InjectRepository } from '@nestjs/typeorm'
import { EntityManager, Repository } from 'typeorm'
import { Employee } from '../employees/employee.entity'
import { LeaveBalance } from './entities/leave.entities'
import { RequestsConfig } from './entities/requests-config.entity'

// ============================================================
// الأرصدة بالطبقات:
// طبقة 1: الرصيد الافتتاحي المُرحّل (بصلاحية) — تُستهلك أولاً
// طبقة 2: استحقاق السنة الحالية
// الترحيل السنوي: المتبقي حتى حد أقصى → طبقة افتتاحية للسنة الجديدة
// ============================================================

export interface BalanceView {
  employeeId: number
  balanceType: string
  period: string
  opening: {
    days: number
    taken: number
    expiry: string | null
    expired: boolean
    available: number
  }
  entitled: number
  entitledTaken: number
  totalTaken: number
  remaining: number
}

const num = (v: unknown) => Number(v ?? 0)

@Injectable()
export class LeaveBalancesService {
  constructor(
    @InjectRepository(LeaveBalance)
    private readonly balances: Repository<LeaveBalance>,
    @InjectRepository(Employee)
    private readonly employees: Repository<Employee>,
    @InjectRepository(RequestsConfig)
    private readonly config: Repository<RequestsConfig>
  ) {}

  private view(bal: LeaveBalance, onDate: string): BalanceView {
    const expired =
      !!bal.openingExpiry && bal.openingExpiry < onDate ? true : false
    const openingAvailable = expired
      ? 0
      : Math.max(0, num(bal.openingDays) - num(bal.openingTaken))
    const entitledTaken = Math.max(0, num(bal.taken) - num(bal.openingTaken))
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
      entitled: num(bal.entitled),
      entitledTaken,
      totalTaken: num(bal.taken),
      remaining: openingAvailable + Math.max(0, num(bal.entitled) - entitledTaken),
    }
  }

  async balanceOf(
    employeeId: number,
    balanceType: string,
    onDate = new Date().toISOString().slice(0, 10)
  ): Promise<BalanceView | null> {
    const period = onDate.slice(0, 4)
    const bal = await this.balances.findOne({
      where: { employeeId, balanceType, period },
    })
    return bal ? this.view(bal, onDate) : null
  }

  async allBalances(employeeId: number) {
    const onDate = new Date().toISOString().slice(0, 10)
    const rows = await this.balances.find({
      where: { employeeId, period: onDate.slice(0, 4) },
    })
    return rows.map((b) => this.view(b, onDate))
  }

  // التحقق قبل التقديم — يرمي برسالة واضحة لو الرصيد غير كافٍ
  async assertSufficient(
    employeeId: number,
    balanceType: string,
    days: number,
    onDate: string
  ) {
    const view = await this.balanceOf(employeeId, balanceType, onDate)
    if (!view) return // لا صف رصيد = لا تقييد (أنواع بلا رصيد)
    if (view.remaining < days) {
      throw new BadRequestException(
        `الرصيد غير كافٍ: المتبقي ${view.remaining} يوم والمطلوب ${days}`
      )
    }
  }

  // الخصم بالطبقات: الافتتاحي الساري أولاً ثم استحقاق السنة
  async deduct(
    em: EntityManager,
    employeeId: number,
    balanceType: string,
    days: number,
    onDate: string
  ) {
    const period = onDate.slice(0, 4)
    const bal = await em.getRepository(LeaveBalance).findOne({
      where: { employeeId, balanceType, period },
    })
    if (!bal) return
    const openingValid = !bal.openingExpiry || bal.openingExpiry >= onDate
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
    balanceType: string,
    days: number,
    period: string
  ) {
    const bal = await em.getRepository(LeaveBalance).findOne({
      where: { employeeId, balanceType, period },
    })
    if (!bal) return
    const entitledTaken = Math.max(0, num(bal.taken) - num(bal.openingTaken))
    const fromEntitled = Math.min(days, entitledTaken)
    const fromOpening = Math.min(days - fromEntitled, num(bal.openingTaken))
    bal.openingTaken = num(bal.openingTaken) - fromOpening
    bal.taken = Math.max(0, num(bal.taken) - days)
    await em.getRepository(LeaveBalance).save(bal)
  }

  // ===== الترحيل السنوي: متبقي سنة → طبقة افتتاحية للسنة الجديدة =====
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
    const annualEntitled = Number(
      (await this.config.findOne({ where: { key: 'leave.annual_entitled' } }))
        ?.value ?? '21'
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
      if (existing) continue
      const view = this.view(bal, endOfYear)
      const carry = Math.min(maxCarry, Math.max(0, view.remaining))
      await this.balances.save(
        this.balances.create({
          employeeId: bal.employeeId,
          balanceType: 'annual',
          period: toPeriod,
          entitled: annualEntitled,
          taken: 0,
          openingDays: carry,
          openingTaken: 0,
          openingExpiry: expiry,
        })
      )
      created++
    }
    return { fromPeriod, toPeriod, created, maxCarry, expiry }
  }
}
