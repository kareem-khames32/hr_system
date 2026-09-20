import { BadRequestException, ConflictException, ForbiddenException, Injectable, Logger, NotFoundException } from '@nestjs/common'
import { InjectRepository } from '@nestjs/typeorm'
import { EntityManager, Repository } from 'typeorm'
import type { JwtPayload } from '../auth/auth.service'
import { assertCompanyWideWrite, branchScopeOf, userHasPerm } from '../auth/guards'
import { RequestsConfig } from '../requests/entities/requests-config.entity'
import { AttendanceService } from './attendance.service'
// تراكم المسير يومًا بيوم: أمر دوام العطلة بيغيّر أيام الموظفين المشمولين
import { markPayrollDaysDirty } from '../payroll/payroll-daily-accrual'
import { HolidayWorkOrder } from './holiday-work.entities'
import {
  cancelHolidayWorkObligations, holidayWorkAmount, holidayWorkDayResult, holidayWorkGrantMatches, holidayWorkGrantOf, holidayWorkGrantsByDate,
  holidayWorkToday, HOLIDAY_WORK_LEVELS, HOLIDAY_WORK_MULTIPLIER_KEY, parseHolidayWorkDates, parseHolidayWorkIds, parseHolidayWorkMultiplier,
  parseHolidayWorkSourceRef, parseStoredHolidayWorkDates, readHolidayWorkAttendanceRules, readHolidayWorkMultiplier,
  type HolidayWorkAttendanceDay, type HolidayWorkGrant, type HolidayWorkLevel, type HolidayWorkOrg,
} from './holiday-work'

// شاشة «دوام أيام العطلات» (تحت الحضور): أوامر الموارد البشرية وطلبات الموظفين المعتمدة، وتفصيل كل أمر من البصمات.
// عزل الفروع: حساب الفرع بيعمل أوامر لفرعه بس، وبيشوف أوامر الشركة كلها بموظفين فرعه بس.

export interface HolidayWorkOrderInput {
  name?: unknown
  targetLevel?: unknown
  branchId?: unknown
  departmentIds?: unknown
  teamIds?: unknown
  employeeIds?: unknown
  dates?: unknown
  multiplier?: unknown
  note?: unknown
}

interface EmployeeLite extends HolidayWorkOrg {
  fullName: string
  employeeCode: string
  status: string
  gross: number
}
interface AttendanceRow extends HolidayWorkAttendanceDay { employeeId: number; date: string }
interface ObligationRow { id: number; employeeId: number; sourceRef: string; status: string; amount: string; reservedPayrollRunId: number | null; appliedPayrollRunId: number | null }

const INACTIVE_STATUSES = new Set(['terminated', 'archived'])
const inList = (values: unknown[], offset = 0) => values.map((_, index) => `@${index + offset}`).join(', ')
const chunks = <T>(rows: T[], size = 500) => Array.from({ length: Math.ceil(rows.length / size) }, (_, index) => rows.slice(index * size, (index + 1) * size))
const cents = (value: unknown) => Math.round(Number(value ?? 0) * 100)
const uniqueIds = (raw: unknown) => [...new Set((Array.isArray(raw) ? raw : []).map(Number))].filter(id => Number.isSafeInteger(id) && id > 0).sort((a, b) => a - b)

@Injectable()
export class HolidayWorkService {
  private readonly logger = new Logger(HolidayWorkService.name)

  constructor(
    @InjectRepository(HolidayWorkOrder) private readonly orders: Repository<HolidayWorkOrder>,
    private readonly attendance: AttendanceService,
  ) {}

  private get em(): EntityManager { return this.orders.manager }

  private scope(user: JwtPayload) {
    const scope = branchScopeOf(user)
    if (scope !== null && scope < 1) throw new ForbiddenException('حسابك مش مربوط بفرع')
    return scope
  }

  private visible(order: Pick<HolidayWorkOrder, 'targetLevel' | 'branchId'>, scope: number | null) {
    return scope === null || order.targetLevel === 'company' || order.branchId === scope
  }

  private canWrite(user: JwtPayload, order: Pick<HolidayWorkOrder, 'targetLevel' | 'branchId'>) {
    if (!userHasPerm(user, 'attendance.manage')) return false
    const scope = branchScopeOf(user)
    if (order.targetLevel === 'company' || order.branchId == null) return scope === null
    return scope === null || order.branchId === scope
  }

  private assertWrite(user: JwtPayload, order: Pick<HolidayWorkOrder, 'targetLevel' | 'branchId'>) {
    if (order.targetLevel === 'company' || order.branchId == null) assertCompanyWideWrite(user)
    else if (this.scope(user) !== null && order.branchId !== this.scope(user)) throw new ForbiddenException('صلاحيتك على فرعك بس')
  }

  // ===== المضاعف الافتراضي =====
  async settings(user: JwtPayload) {
    return { multiplier: await readHolidayWorkMultiplier(this.em), canEdit: branchScopeOf(user) === null && userHasPerm(user, 'attendance.manage') }
  }

  async updateSettings(user: JwtPayload, raw: unknown) {
    assertCompanyWideWrite(user)
    const multiplier = parseHolidayWorkMultiplier(raw)
    await this.em.getRepository(RequestsConfig).save({ key: HOLIDAY_WORK_MULTIPLIER_KEY, value: String(multiplier) })
    return { multiplier, canEdit: true }
  }

  // ===== القراءة =====
  private async employeesLite(): Promise<Map<number, EmployeeLite>> {
    const rows: Array<Record<string, any>> = await this.em.query(`SELECT [id], [fullName], [employeeCode], [branchId], [departmentId], [teamId], [status],
        ISNULL([basicSalary], 0) + ISNULL([housingAllowance], 0) + ISNULL([transportAllowance], 0) + ISNULL([phoneAllowance], 0)
          + ISNULL([workNatureAllowance], 0) + ISNULL([otherAllowance], 0) AS [gross]
      FROM [employees]`)
    return new Map(rows.map(row => [Number(row.id), { employeeId: Number(row.id), fullName: String(row.fullName ?? ''), employeeCode: String(row.employeeCode ?? ''),
      branchId: row.branchId == null ? null : Number(row.branchId), departmentId: row.departmentId == null ? null : Number(row.departmentId),
      teamId: row.teamId == null ? null : Number(row.teamId), status: String(row.status ?? ''), gross: Number(row.gross ?? 0) }]))
  }

  private async orgNames() {
    const map = async (table: string) => new Map<number, string>((await this.em.query(`SELECT [id], [name] FROM [${table}]`) as Array<{ id: number; name: string }>)
      .map(row => [Number(row.id), row.name]))
    return { branches: await map('branches'), departments: await map('departments'), teams: await map('teams') }
  }

  private describeTarget(order: HolidayWorkOrder, names: Awaited<ReturnType<HolidayWorkService['orgNames']>>, employees: Map<number, EmployeeLite>) {
    const ids = parseHolidayWorkIds(order.targetIds)
    if (order.targetLevel === 'company') return 'الشركة كلها'
    const branch = order.branchId ? names.branches.get(order.branchId) ?? `فرع #${order.branchId}` : 'فرع'
    if (order.targetLevel === 'branch') return `${branch} كله`
    const list = (map: Map<number, string>, prefix: string) => ids.map(id => map.get(id) ?? `${prefix} #${id}`).join('، ')
    if (order.targetLevel === 'departments') return `${branch} — أقسام: ${list(names.departments, 'قسم')}`
    if (order.targetLevel === 'teams') return `${branch} — فرق: ${list(names.teams, 'فريق')}`
    const shown = ids.slice(0, 5).map(id => employees.get(id)?.fullName ?? `موظف #${id}`).join('، ')
    return `${branch} — ${ids.length > 5 ? `${ids.length} موظف (${shown}…)` : shown}`
  }

  private async userNames(ids: Array<number | null>) {
    const unique = [...new Set(ids.filter((id): id is number => Number.isInteger(id) && Number(id) > 0))]
    const map = new Map<number, string>()
    for (const chunk of chunks(unique)) {
      const rows: Array<{ id: number; displayName: string | null }> = await this.em.query(`SELECT [id], [displayName] FROM [users] WHERE [id] IN (${inList(chunk)})`, chunk)
      for (const row of rows) map.set(Number(row.id), row.displayName || `مستخدم #${row.id}`)
    }
    return map
  }

  private async attendanceRows(dates: string[]): Promise<Map<string, AttendanceRow[]>> {
    const map = new Map<string, AttendanceRow[]>()
    for (const chunk of chunks(dates, 300)) {
      const rows: AttendanceRow[] = await this.em.query(`SELECT [employeeId], CONVERT(nvarchar(10), [date], 23) AS [date], [status], [checkIn], [checkOut], [workMinutes]
        FROM [attendance_days] WHERE [status] = N'holiday' AND ([checkIn] IS NOT NULL OR [checkOut] IS NOT NULL) AND [date] IN (${inList(chunk)})`, chunk)
      for (const row of rows) map.set(row.date, [...(map.get(row.date) ?? []), { ...row, employeeId: Number(row.employeeId),
        workMinutes: row.workMinutes == null ? null : Number(row.workMinutes) }])
    }
    return map
  }

  private async approvedOvertime(dates: string[]): Promise<Set<string>> {
    const found = new Set<string>()
    for (const chunk of chunks(dates, 300)) {
      const rows: Array<{ employeeId: number; date: string }> = await this.em.query(`SELECT [employeeId], CONVERT(nvarchar(10), [date], 23) AS [date]
        FROM [overtime_entries] WHERE [status] IN (N'APPROVED', N'PAID') AND [date] IN (${inList(chunk)})`, chunk)
      for (const row of rows) found.add(`${Number(row.employeeId)}|${row.date}`)
    }
    return found
  }

  private async obligations(from: string, to: string): Promise<Map<string, ObligationRow>> {
    const rows: ObligationRow[] = await this.em.query(`SELECT [id], [employeeId], [sourceRef], [status], CAST([amount] AS nvarchar(40)) AS [amount],
        [reservedPayrollRunId], [appliedPayrollRunId]
      FROM [employee_obligations] WHERE [sourceRef] LIKE N'holiday[_]work:%' AND [status] <> N'CANCELLED' AND [effectiveDate] >= @0 AND [effectiveDate] <= @1`, [from, to])
    const map = new Map<string, ObligationRow>()
    for (const row of rows) {
      const ref = parseHolidayWorkSourceRef(row.sourceRef)
      if (ref) map.set(`${ref.grantId}|${Number(row.employeeId)}|${ref.date}`, row)
    }
    return map
  }

  private async payrollBasis() {
    const rows: Array<{ key: string; value: string }> = await this.em.query(`SELECT [key], [value] FROM [requests_config] WHERE [key] IN (N'payroll.monthly_days', N'payroll.daily_hours')`)
    const value = (key: string, fallback: number) => { const n = Number(rows.find(row => row.key === key)?.value ?? fallback); return Number.isFinite(n) && n > 0 ? n : fallback }
    return { monthlyDays: value('payroll.monthly_days', 30), dailyHours: value('payroll.daily_hours', 8) }
  }

  // صفوف كل أمر من البصمات: مين جه، أول دخول وآخر خروج، الساعات والمبلغ (من المسير لو اتحسب، وإلا تقديري براتب الملف)
  private async computeRows(user: JwtPayload, list: HolidayWorkOrder[], employees: Map<number, EmployeeLite>) {
    const scope = this.scope(user)
    const today = holidayWorkToday()
    const canSeeAmounts = userHasPerm(user, 'payroll.view')
    const allDates = [...new Set(list.flatMap(order => parseStoredHolidayWorkDates(order.dates)))].sort()
    const pastDates = allDates.filter(date => date <= today)
    const attendance = pastDates.length ? await this.attendanceRows(pastDates) : new Map<string, AttendanceRow[]>()
    const overtime = pastDates.length ? await this.approvedOvertime(pastDates) : new Set<string>()
    const obligations = allDates.length ? await this.obligations(allDates[0], allDates[allDates.length - 1]) : new Map<string, ObligationRow>()
    const rules = await readHolidayWorkAttendanceRules(this.em)
    const basis = await this.payrollBasis()
    // كل الأوامر السارية على نفس الأيام: لو يوم الموظف عليه أكتر من أمر بيتحسب مرة واحدة (أعلى مضاعف ثم الأقدم)
    const active = allDates.length ? (await this.orders.createQueryBuilder('o').where('o.status = :status', { status: 'ACTIVE' })
      .andWhere('o.firstDate <= :to AND o.lastDate >= :from', { from: allDates[0], to: allDates[allDates.length - 1] }).getMany()) : []
    const grants = active.map(order => holidayWorkGrantOf({ ...order, multiplier: String(order.multiplier) })).filter((grant): grant is HolidayWorkGrant => grant !== null)
    const result = new Map<number, { rows: Array<Record<string, unknown>>; summary: Record<string, unknown> }>()
    for (const order of list) {
      const grant = holidayWorkGrantOf({ ...order, multiplier: String(order.multiplier) })
      const rows: Array<Record<string, unknown>> = []
      let targeted = 0
      if (grant) for (const emp of employees.values()) {
        if (!INACTIVE_STATUSES.has(emp.status) && (scope === null || emp.branchId === scope) && holidayWorkGrantMatches(grant, emp)) targeted++
      }
      for (const date of grant?.dates ?? []) {
        if (date > today) continue
        for (const day of attendance.get(date) ?? []) {
          const emp = employees.get(day.employeeId)
          if (!emp || !grant || (scope !== null && emp.branchId !== scope) || !holidayWorkGrantMatches(grant, emp)) continue
          const winner = order.status === 'ACTIVE' ? holidayWorkGrantsByDate(grants, emp, date, date).get(date) : grant
          const coveredBy = winner && winner.id !== order.id ? winner : null
          const outcome = holidayWorkDayResult({ date, today, day, ...rules, approvedOvertime: overtime.has(`${emp.employeeId}|${date}`) })
          const obligation = obligations.get(`${order.id}|${emp.employeeId}|${date}`) ?? null
          // الأمر الملغي: قيوده اللي لسه ما اتعتمدتش اتلغت، فالمحسوب منه بس اللي اتحجز لمسير معتمد أو اتصرف قبل الإلغاء
          const active = order.status === 'ACTIVE'
          const counted = active ? outcome.eligible && !coveredBy : !!obligation
          const minutes = outcome.eligible ? outcome.minutes : outcome.rawMinutes
          const amount = obligation ? cents(obligation.amount) / 100
            : counted && outcome.eligible ? holidayWorkAmount({ grossMonthly: emp.gross, monthlyDays: basis.monthlyDays, dailyHours: basis.dailyHours }, outcome.minutes, grant.multiplier) : 0
          rows.push({ employeeId: emp.employeeId, employeeName: emp.fullName, employeeCode: emp.employeeCode, date,
            checkIn: day.checkIn ? String(day.checkIn).slice(0, 5) : null, checkOut: day.checkOut ? String(day.checkOut).slice(0, 5) : null,
            minutes: minutes ?? null, hours: minutes == null ? null : Math.round(minutes / 60 * 100) / 100,
            counted, message: !active && !obligation ? 'الأمر اتلغى' : coveredBy ? `محسوب على «${coveredBy.name}» (مضاعف ${coveredBy.multiplier})` : outcome.eligible ? null : outcome.message,
            amount: canSeeAmounts ? amount : null, amountSource: obligation ? 'PAYROLL' : 'ESTIMATE',
            payrollState: !obligation ? null : obligation.status === 'APPLIED' ? 'PAID' : obligation.reservedPayrollRunId != null ? 'APPROVED_RUN' : 'IN_DRAFT' })
        }
      }
      rows.sort((a, b) => String(a.date).localeCompare(String(b.date)) || String(a.employeeName).localeCompare(String(b.employeeName), 'ar'))
      const countedRows = rows.filter(row => row.counted)
      result.set(order.id, { rows, summary: {
        targetedEmployees: targeted,
        cameEmployees: new Set(countedRows.map(row => row.employeeId)).size,
        countedDays: countedRows.length,
        totalHours: Math.round(countedRows.reduce((sum, row) => sum + Number(row.minutes ?? 0), 0) / 60 * 100) / 100,
        totalAmount: canSeeAmounts ? countedRows.reduce((sum, row) => sum + cents(row.amount), 0) / 100 : null,
        pastDates: (grant?.dates ?? []).filter(date => date <= today).length,
      } })
    }
    return result
  }

  private async view(user: JwtPayload, list: HolidayWorkOrder[], withRows: boolean) {
    const names = await this.orgNames()
    const employees = await this.employeesLite()
    const users = await this.userNames(list.flatMap(order => [order.createdByUserId, order.cancelledByUserId, order.updatedByUserId]))
    const computed = await this.computeRows(user, list, employees)
    return list.map(order => {
      const data = computed.get(order.id)
      return { id: order.id, kind: order.kind, name: order.name, targetLevel: order.targetLevel, branchId: order.branchId,
        targetIds: parseHolidayWorkIds(order.targetIds), targetText: this.describeTarget(order, names, employees),
        dates: parseStoredHolidayWorkDates(order.dates), multiplier: Number(order.multiplier), status: order.status, note: order.note,
        sourceRequestId: order.sourceRequestId, createdAt: order.createdAt, createdByName: order.createdByUserId ? users.get(order.createdByUserId) ?? null : null,
        updatedAt: order.updatedAt, cancelledAt: order.cancelledAt, cancelReason: order.cancelReason,
        cancelledByName: order.cancelledByUserId ? users.get(order.cancelledByUserId) ?? null : null,
        canEdit: order.status === 'ACTIVE' && order.kind === 'ORDER' && this.canWrite(user, order),
        canCancel: order.status === 'ACTIVE' && this.canWrite(user, order),
        summary: data?.summary ?? null, ...(withRows ? { rows: data?.rows ?? [] } : {}) }
    })
  }

  async list(user: JwtPayload, query: { status?: string; kind?: string } = {}) {
    const scope = this.scope(user)
    const qb = this.orders.createQueryBuilder('o').orderBy('o.id', 'DESC').take(300)
    if (query.status === 'ACTIVE' || query.status === 'CANCELLED') qb.andWhere('o.status = :status', { status: query.status })
    if (query.kind === 'ORDER' || query.kind === 'REQUEST') qb.andWhere('o.kind = :kind', { kind: query.kind })
    const rows = (await qb.getMany()).filter(order => this.visible(order, scope))
    return { today: holidayWorkToday(), canSeeAmounts: userHasPerm(user, 'payroll.view'), orders: await this.view(user, rows, false) }
  }

  private async visibleOrder(user: JwtPayload, id: number, em: EntityManager = this.em) {
    const order = await em.getRepository(HolidayWorkOrder).findOne({ where: { id } })
    if (!order || !this.visible(order, this.scope(user))) throw new NotFoundException('الأمر مش موجود')
    return order
  }

  async detail(user: JwtPayload, id: number) {
    const order = await this.visibleOrder(user, id)
    const [view] = await this.view(user, [order], true)
    return { today: holidayWorkToday(), canSeeAmounts: userHasPerm(user, 'payroll.view'), order: view }
  }

  // ===== الإنشاء والتعديل والإلغاء =====
  private async normalize(user: JwtPayload, input: HolidayWorkOrderInput) {
    const scope = this.scope(user)
    const name = String(input.name ?? '').trim()
    if (name.length < 2 || name.length > 150 || /[<>\x00-\x1f]/.test(name)) throw new BadRequestException('اسم الأمر من 2 لـ 150 حرف من غير < أو >')
    if (!(HOLIDAY_WORK_LEVELS as readonly string[]).includes(String(input.targetLevel))) throw new BadRequestException('اختار على مين')
    const level = input.targetLevel as HolidayWorkLevel
    let branchId: number | null = null
    let ids: number[] = []
    if (level === 'company') {
      assertCompanyWideWrite(user)
    } else {
      branchId = Number(input.branchId)
      if (!Number.isSafeInteger(branchId) || branchId < 1) throw new BadRequestException('اختار الفرع')
      if (scope !== null && branchId !== scope) throw new ForbiddenException('صلاحيتك على فرعك بس')
      const [branch] = await this.em.query('SELECT [id] FROM [branches] WHERE [id] = @0', [branchId])
      if (!branch) throw new BadRequestException('الفرع مش موجود')
      const check = async (sql: string, label: string) => {
        if (!ids.length) throw new BadRequestException(`اختار ${label} واحد على الأقل`)
        for (const chunk of chunks(ids)) {
          const rows = await this.em.query(sql.replace('$IDS', inList(chunk, 1)), [branchId, ...chunk])
          if (rows.length !== chunk.length) throw new BadRequestException(`في ${label} مختار مش تبع الفرع ده`)
        }
      }
      if (level === 'departments') { ids = uniqueIds(input.departmentIds); await check('SELECT [id] FROM [departments] WHERE [branchId] = @0 AND [id] IN ($IDS)', 'قسم') }
      if (level === 'teams') {
        ids = uniqueIds(input.teamIds)
        await check('SELECT t.[id] FROM [teams] t INNER JOIN [departments] d ON d.[id] = t.[departmentId] WHERE d.[branchId] = @0 AND t.[id] IN ($IDS)', 'فريق')
      }
      if (level === 'employees') { ids = uniqueIds(input.employeeIds); await check('SELECT [id] FROM [employees] WHERE [branchId] = @0 AND [id] IN ($IDS)', 'موظف') }
    }
    const dates = parseHolidayWorkDates(input.dates)
    const multiplier = input.multiplier === undefined || input.multiplier === null || input.multiplier === ''
      ? await readHolidayWorkMultiplier(this.em) : parseHolidayWorkMultiplier(input.multiplier)
    const note = input.note == null ? null : String(input.note).trim().slice(0, 500) || null
    await this.assertHolidayDates(dates, level === 'company' ? null : branchId)
    return { name, targetLevel: level, branchId, targetIds: ids.length ? JSON.stringify(ids) : null, dates: JSON.stringify(dates),
      firstDate: dates[0], lastDate: dates[dates.length - 1], multiplier, note }
  }

  // الأيام لازم تكون عطلة (ويك إند أو عطلة رسمية) للفرع المستهدف؛ لأمر الشركة: عطلة في فرع واحد على الأقل.
  // الاستحقاق نفسه بيتحسم لكل موظف من حالة يومه في الحضور (holiday).
  private async assertHolidayDates(dates: string[], branchId: number | null) {
    const branches = branchId ? [branchId] : (await this.em.query('SELECT [id] FROM [branches] WHERE [isActive] = 1') as Array<{ id: number }>).map(row => Number(row.id))
    if (!branches.length) return
    const working: string[] = []
    for (const date of dates) {
      let known = false, off = false
      for (const branch of branches) {
        try {
          known = true
          if (await this.attendance.isNonWorkingDay(date, branch)) { off = true; break }
        } catch {
          // تقويم الفرع مش مثبت لليوم ده: ما نرفضش — حالة اليوم في الحضور هي الحكم وقت الحساب
          off = true
          break
        }
      }
      if (known && !off) working.push(date)
    }
    if (working.length) {
      throw new BadRequestException(`${working.join('، ')} ${working.length > 1 ? 'أيام عمل عادية' : 'يوم عمل عادي'} — أمر الدوام لأيام العطلة (الويك إند أو العطلات الرسمية) بس`)
    }
  }

  async create(user: JwtPayload, input: HolidayWorkOrderInput) {
    const values = await this.normalize(user, input)
    const saved = await this.orders.save(this.orders.create({ ...values, kind: 'ORDER', status: 'ACTIVE', sourceRequestId: null, createdByUserId: user.sub }))
    const overtime = await this.clearCoveredOvertime(saved)
    return { ...(await this.detail(user, saved.id)), overtime }
  }

  async update(user: JwtPayload, id: number, input: HolidayWorkOrderInput) {
    const current = await this.visibleOrder(user, id)
    if (current.kind !== 'ORDER') throw new BadRequestException('طلب الموظف المعتمد مابيتعدلش — تقدر تلغيه بس')
    if (current.status !== 'ACTIVE') throw new ConflictException('الأمر ملغي')
    this.assertWrite(user, current)
    const values = await this.normalize(user, input)
    await this.em.transaction(async em => {
      const locked = await em.getRepository(HolidayWorkOrder).findOne({ where: { id }, lock: { mode: 'pessimistic_write' } })
      if (!locked || locked.status !== 'ACTIVE') throw new ConflictException('الأمر اتغير أو اتلغى — حدّث الشاشة')
      await em.getRepository(HolidayWorkOrder).update({ id }, { ...values, updatedByUserId: user.sub, updatedAt: new Date() })
      // القيود المستحقة في المسودات تتلغي وإعادة حساب المسير بتبنيها بالأمر الجديد؛ المحجوز/المصروف ما يتلمسش
      await cancelHolidayWorkObligations(em, id)
    })
    const saved = await this.orders.findOneByOrFail({ id })
    const overtime = await this.clearCoveredOvertime(saved)
    return { ...(await this.detail(user, id)), overtime }
  }

  async cancel(user: JwtPayload, id: number, reason?: unknown) {
    const current = await this.visibleOrder(user, id)
    this.assertWrite(user, current)
    if (current.status !== 'ACTIVE') return this.detail(user, id)
    const text = String(reason ?? '').trim().slice(0, 300) || null
    await this.em.transaction(async em => {
      const done = await em.getRepository(HolidayWorkOrder).update({ id, status: 'ACTIVE' },
        { status: 'CANCELLED', cancelledByUserId: user.sub, cancelledAt: new Date(), cancelReason: text })
      if (!done.affected) throw new ConflictException('الأمر اتغير — حدّث الشاشة')
      await cancelHolidayWorkObligations(em, id)
    })
    return this.detail(user, id)
  }

  // اليوم المغطى بأمر ما بيطلعش إضافي مكتشف: أي إضافي مكتشف لسه ما اتعتمدش في أيام الأمر اللي فاتت
  // بيتلغي بإعادة حساب يوم الحضور (محرك الحضور نفسه بيوقف الكشف لليوم المغطى). فشل يوم ما يوقفش الأمر.
  private async clearCoveredOvertime(order: HolidayWorkOrder): Promise<{ recomputed: number; failed: number }> {
    const grant = holidayWorkGrantOf({ ...order, multiplier: String(order.multiplier) })
    const today = holidayWorkToday()
    const dates = (grant?.dates ?? []).filter(date => date <= today)
    if (!grant || !dates.length) return { recomputed: 0, failed: 0 }
    const pairs: Array<{ employeeId: number; date: string }> = []
    for (const chunk of chunks(dates, 300)) {
      pairs.push(...(await this.em.query(`SELECT DISTINCT [employeeId], CONVERT(nvarchar(10), [date], 23) AS [date] FROM [overtime_entries]
        WHERE [source] = N'BIOMETRIC_DETECTED' AND [status] IN (N'DETECTED', N'SUBMITTED') AND [date] IN (${inList(chunk)})`, chunk) as Array<{ employeeId: number; date: string }>))
    }
    if (!pairs.length) return { recomputed: 0, failed: 0 }
    const employees = await this.employeesLite()
    // تراكم المسير: أيام الأمر للموظفين المشمولين تتحسب من جديد (تصنيف اليوم وبدله بيتغيروا)
    for (const emp of employees.values()) {
      if (holidayWorkGrantMatches(grant, emp)) await markPayrollDaysDirty(this.em, emp.employeeId, dates, 'أمر أو طلب دوام يوم عطلة')
    }
    let recomputed = 0, failed = 0
    for (const pair of pairs) {
      const emp = employees.get(Number(pair.employeeId))
      if (!emp || !holidayWorkGrantMatches(grant, emp)) continue
      try {
        await this.attendance.computeDay(emp.employeeId, pair.date)
        recomputed++
      } catch (error) {
        failed++
        this.logger.warn(`تعذر إعادة حساب يوم ${pair.date} للموظف #${emp.employeeId} بعد أمر دوام العطلة #${order.id}: ${String((error as Error)?.message ?? error).slice(0, 200)}`)
      }
    }
    return { recomputed, failed }
  }
}
