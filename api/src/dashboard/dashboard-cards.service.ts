import { BadRequestException, ForbiddenException, Injectable, NotFoundException } from '@nestjs/common'
import { ModuleRef } from '@nestjs/core'
import { InjectDataSource } from '@nestjs/typeorm'
import { DataSource } from 'typeorm'
import { documentExpiryReady, docTypeExpirySettings, supersededSql } from '../assets/document-expiry'
import { AttendanceService, localDateOf } from '../attendance/attendance.service'
import type { JwtPayload } from '../auth/auth.service'
import { andBranchScopeSql, branchScopeOf, branchScopeSql, inBranchScope, userHasPerm } from '../auth/guards'
import type { BranchScope } from '../auth/guards'
import { readOpenSuspensions } from '../employees/employee-suspensions'
import { suspensionCovers } from '../employees/employee-suspension-rules'
import { employmentPeriodsReady } from '../employees/employment-periods'
import { ModulesService } from '../modules-registry/modules.service'
import type { ModuleKey } from '../modules-registry/registry'
import { PROBATION_DAYS_KEY, effectiveProbationEnd } from '../onboarding/probation'
import { readBranchCurrencyOf } from '../org/branch-currency-db'
import { orgFilterIsEmpty, orgFilterMatches, orgFilterSql, parseOrgFilter, type OrgFilter, type OrgFilterInput } from '../org/org-filter-params'
import { OrgService } from '../org/org.service'
import { MinimumWageAlertService } from '../payroll/minimum-wage-alert'
import { PayrollLiveService } from '../payroll/payroll-live.service'
import { PayrollService } from '../payroll/payroll.service'
import { FinancialReportService } from '../reports/financial-report.service'
import {
  OVERTIME_COUNTED_STATUSES, absenceOutsideServiceSql, currentEmployeeSql, percent, serviceEndSql, serviceStartSql, turnoverRate,
} from '../reports/metrics'
import { MetricsService } from '../reports/metrics.service'
import { LOAN_DEFERRAL_TYPE } from '../requests/loan-installment-requests'
import { TASK_ROLE_LABELS, tasksTableReady } from '../tasks/task-rules'
import { notPersonalTask, taskExtrasReady } from '../tasks/task-extras'
import { TASK_OPEN_STATUSES } from '../tasks/task.entity'
import {
  AGE_BANDS, ATTENDANCE_BUCKETS, DASHBOARD_CARDS, DASHBOARD_CONTACT_PERM, DASHBOARD_MONEY_PERM, ageBandOf, ageInDays, attendanceBucketOfDay, cardGroupChildren,
  cardTree, dashboardCardOf, dayAfter, emptyBucketCounts, inCardGroup, isAttendanceBucket, isDay, lastMonths, listLimitOf, monthEndOf, monthsBetween, parseCardGroup,
  startGroupOf, TENURE_BANDS, tenureBandOf, toneOfRate, trendDaysOf, visiblePlacement,
  type AttendanceBucket, type BucketCounts, type CardGroup, type CardGroupRow, type CardTree, type DashboardCardKey,
} from './dashboard-cards'

// عمر الحساب المشترك بين الكروت (تصنيف اليوم بس — الشجرة وموظفو النطاق بيتقروا لكل طلب): الكروت بتتطلب مع بعض عند فتح اللوحة
const SHARED_TTL_MS = 30_000
// Codex P7A-B07: الطلب سري؟ بحكم محرك الطلبات (ونفس حكم مصدر «الطلبات» في منشئ التقارير): نوعه الفعلي هو تعريفه (definitionCode) وإلا نوعه
// العام؛ وسري لو تعريفه سري، أو نوعه العام سري، أو تأجيل قسط سلفة ونوع السلفة سري (سرية موروثة). r = الطلب، وt = نوعه العام.
const CONFIDENTIAL_REQUEST_SQL = `(ISNULL(t.isConfidential, 0) = 1
  OR EXISTS (SELECT 1 FROM request_types dt WHERE dt.code = NULLIF(r.definitionCode, N'') AND dt.isConfidential = 1)
  OR (COALESCE(NULLIF(r.definitionCode, N''), r.typeCode) = N'${LOAN_DEFERRAL_TYPE}' AND EXISTS (SELECT 1 FROM request_types lt WHERE lt.code = N'LOAN' AND lt.isConfidential = 1)))`
// أقصى أسماء في قايمة واحدة
const LIST_LIMIT = 500
// نافذة «هتنتهي» في كارت القوى العاملة
const EXPIRY_WINDOW_DAYS = 30
// B-ADD.7: شهور سلسلة «تعيينات مقابل خروج»
const WORKFORCE_MONTHS = 6
// B-ADD.20: شهور سلسلة العدد والدوران في اللوحة الإحصائية
const INSIGHT_MONTHS = 12

const round2 = (value: unknown): number => Math.round(Number(value ?? 0) * 100) / 100
const num = (value: unknown): number | null => (value === null || value === undefined ? null : Number(value))
const day10 = (value: unknown): string | null => (value ? String(value).slice(0, 10) : null)
const scopeKey = (scope: BranchScope): string => (scope === null ? 'all' : scope.join(',') || 'none')
const byArabic = (a: string, b: string) => a.localeCompare(b, 'ar')

/** موظف حالي في نطاق الحساب (بتعريف القاموس) بمكانه وبيانات كروته */
interface Person {
  id: number
  fullName: string
  employeeCode: string | null
  jobTitle: string | null
  phone: string | null
  branchId: number | null
  departmentId: number | null
  teamId: number | null
  status: string
  startDate: string | null
  joinDate: string | null
  actualStartDate: string | null
  probationEndDate: string | null
  contractEnd: string | null
  passportExpiry: string | null
}

/** حالة موظف في يوم: خانته في الكارت وتفصيلها ووردته وأول بصمة */
interface DayState {
  bucket: AttendanceBucket
  detail: string | null
  checkIn: string | null
  shift: string | null
  lateMinutes: number
  /** من غير صف محسوب: ورديته لسه ماتحلّتش (بتتحل لقايمة الأسماء بس) */
  shiftPending?: boolean
}

const shiftText = (name: unknown, start: unknown, end: unknown): string | null =>
  name ? `${name}${start && end ? ` (${start}–${end})` : ''}` : null

export interface CardContext {
  user: JwtPayload
  scope: BranchScope
  filter: OrgFilter
  today: string
  tree: CardTree
  branchName: (id: number | null) => string | null
  /** موظفو النطاق الحاليون جوه الفلتر */
  people: Person[]
}

const STATUS_DETAIL: Record<string, string> = {
  early_leave: 'انصراف مبكر', partial_leave: 'إجازة جزئية', missing_punch: 'بصمة ناقصة', holiday: 'عمل يوم عطلة', mission: 'مأمورية', remote: 'عمل عن بعد',
  exempt: 'مستثنى من البصمة',
}

interface Shared<T> { at: number; value: Promise<T> }

// B-ADD.3: كروت لوحة الإدارة — كل كارت بصلاحيته وموديوله، وكل رقم جوه نطاق فروع الحساب وفلتر اللوحة الموحد.
// الأرقام اللي ليها تعريف في قاموس المؤشرات (B2.13) محسوبة بقواعده (metrics.ts) أو بدالته (MetricsService.workforce)؛ وتصنيف يوم الحضور
// هو تصنيف محرك الحضور المحفوظ في attendance_days ومعاه غياب اليوم اللحظي من AttendanceService.liveAbsences (نفس شاشة الحضور).
@Injectable()
export class DashboardCardsService {
  constructor(
    @InjectDataSource() private readonly ds: DataSource,
    private readonly moduleRef: ModuleRef,
    private readonly modules: ModulesService,
    private readonly metrics: MetricsService,
    private readonly attendance: AttendanceService,
  ) {}

  private readonly shared = new Map<string, Shared<unknown>>()

  /** حساب مشترك لثواني بين الكروت اللي بتتطلب مع بعض؛ الحساب الفاشل مابيتحفظش */
  private share<T>(key: string, compute: () => Promise<T>): Promise<T> {
    const now = Date.now()
    this.shared.forEach((entry, name) => { if (now - entry.at > SHARED_TTL_MS) this.shared.delete(name) })
    const known = this.shared.get(key) as Shared<T> | undefined
    if (known) return known.value
    const value = compute()
    this.shared.set(key, { at: now, value })
    value.catch(() => this.shared.delete(key))
    return value
  }

  // ===== الصلاحيات والموديولات =====

  private async moduleOn(module: string, user: JwtPayload): Promise<boolean> {
    return this.modules.allowedFor(module as ModuleKey, user)
  }

  private async cardAllowed(key: DashboardCardKey, user: JwtPayload): Promise<{ perm: boolean; module: boolean }> {
    const card = dashboardCardOf(key)
    let module = true
    for (const name of card.modules) if (!(await this.moduleOn(name, user))) module = false
    return { perm: card.perms.some(perm => userHasPerm(user, perm)), module }
  }

  /** أي مبلغ في اللوحة: صلاحية عرض الرواتب وموديول الرواتب مفعّل للحساب */
  async moneyAllowed(user: JwtPayload): Promise<boolean> {
    return userHasPerm(user, DASHBOARD_MONEY_PERM) && (await this.moduleOn('payroll', user))
  }

  /** الكروت اللي الحساب يشوفها (بصلاحيته وموديولاته) — الواجهة بترسم دول بس */
  async access(user: JwtPayload) {
    const cards: Array<{ key: DashboardCardKey; title: string; href: string }> = []
    for (const card of DASHBOARD_CARDS) {
      const allowed = await this.cardAllowed(card.key, user)
      if (allowed.perm && allowed.module) cards.push({ key: card.key, title: card.title, href: card.href })
    }
    return {
      today: localDateOf(new Date()), cards,
      money: await this.moneyAllowed(user),
      contact: userHasPerm(user, DASHBOARD_CONTACT_PERM),
      documents: userHasPerm(user, 'documents.manage'),
      buckets: ATTENDANCE_BUCKETS,
    }
  }

  /** موديول الكارت مقفول للحساب = 404 زي مسار مش موجود (نفس رد @RequireModule)؛ صلاحيته ناقصة = 403 */
  async requireCard(key: DashboardCardKey, user: JwtPayload, url: string): Promise<void> {
    const allowed = await this.cardAllowed(key, user)
    if (!allowed.module) throw new NotFoundException(`Cannot GET ${url}`)
    if (!allowed.perm) throw new ForbiddenException('الكارت ده محتاج صلاحية شاشته')
  }

  // ===== السياق: النطاق والفلتر والشجرة وموظفو النطاق =====

  /** اليوم المطلوب: النهارده لو مش مبعوت، ويوم فات بس (المستقبل مرفوض) */
  dayOf(raw: unknown): string {
    const today = localDateOf(new Date())
    if (raw === undefined || raw === null || raw === '') return today
    if (!isDay(raw)) throw new BadRequestException('التاريخ بصيغة YYYY-MM-DD')
    if (raw > today) throw new BadRequestException('التاريخ في المستقبل — اختار النهارده أو يوم فات')
    return raw
  }

  // Codex P7A-B06: الشجرة وموظفين النطاق بيتقروا من القاعدة **لكل طلب** — مش من الحساب المشترك: موظف (أو وحدة) اتنقل برّه نطاق الحساب
  // كان بيفضل اسمه وتليفونه راجعين من اللقطة لحد ما مدتها تخلص. اللقطة القديمة مش إذن لعرض بيانات شخصية؛ الحساب المشترك فاضل لخانات
  // اليوم بس (أرقام حالة بتتربط بموظفين الطلب الحاليين).
  private async treeOf(scope: BranchScope) {
    const context = await this.moduleRef.get(OrgService, { strict: false }).filterContext(scope)
    const names = new Map(context.branches.map(branch => [branch.id, branch.name]))
    return { tree: cardTree(context.units, context.teams), names }
  }

  /** موظفو النطاق الحاليون (شرط «الموظف الحالي» من قاموس المؤشرات) — استعلام واحد للكل */
  private peopleOf(scope: BranchScope): Promise<Person[]> {
    return (async () => {
      const params: unknown[] = []
      const rows: Array<Record<string, unknown>> = await this.ds.query(
        `SELECT e.id AS id, e.fullName AS fullName, e.employeeCode AS employeeCode, e.jobTitle AS jobTitle, e.phone AS phone, e.branchId AS branchId,
                e.departmentId AS departmentId, e.teamId AS teamId, e.status AS status,
                CONVERT(varchar(10), COALESCE(e.actualStartDate, e.joinDate), 23) AS startDate,
                CONVERT(varchar(10), e.joinDate, 23) AS joinDate, CONVERT(varchar(10), e.actualStartDate, 23) AS actualStartDate,
                CONVERT(varchar(10), e.probationEndDate, 23) AS probationEndDate, CONVERT(varchar(10), e.contractEnd, 23) AS contractEnd,
                CONVERT(varchar(10), e.passportExpiry, 23) AS passportExpiry
         FROM employees e WHERE ${currentEmployeeSql('e.')} ${andBranchScopeSql('e.branchId', scope, params)}`,
        params
      )
      return rows.map(row => ({
        id: Number(row.id), fullName: String(row.fullName ?? `#${row.id}`), employeeCode: (row.employeeCode as string | null) ?? null,
        jobTitle: (row.jobTitle as string | null) ?? null, phone: (row.phone as string | null) ?? null, branchId: num(row.branchId),
        departmentId: num(row.departmentId), teamId: num(row.teamId), status: String(row.status), startDate: day10(row.startDate),
        joinDate: day10(row.joinDate), actualStartDate: day10(row.actualStartDate), probationEndDate: day10(row.probationEndDate),
        contractEnd: day10(row.contractEnd), passportExpiry: day10(row.passportExpiry),
      }))
    })()
  }

  /**
   * سياق الكارت: نطاق فروع الحساب، وفلتر اللوحة الموحد فوقه (تضييق مش بديل)، وشجرة النطاق، وموظفيه جوه الفلتر. فرع برّه النطاق مرفوض
   * بنفس رد التقارير (403)، وقسم أو فريق برّه النطاق مابيطابقش حد (صفر صفوف) زيها.
   */
  async context(user: JwtPayload, raw: OrgFilterInput): Promise<CardContext> {
    const scope = branchScopeOf(user)
    const filter = parseOrgFilter(raw)
    if (filter.branchId !== null && !inBranchScope(scope, filter.branchId)) {
      throw new ForbiddenException(scope !== null && scope.length > 1 ? 'حساب الفروع يشوف لوحة فروعه بس' : 'حساب الفرع يشوف لوحة فرعه بس')
    }
    const [{ tree, names }, everyone] = await Promise.all([this.treeOf(scope), this.peopleOf(scope)])
    return {
      user, scope, filter, today: localDateOf(new Date()), tree,
      branchName: id => (id === null ? null : names.get(id) ?? null),
      people: orgFilterIsEmpty(filter) ? everyone : everyone.filter(person => orgFilterMatches(person, filter)),
    }
  }

  /** شروط الفلتر الموحد على جدول موظفين بـalias كـ«AND …» */
  private orgSql(alias: string, filter: OrgFilter, params: unknown[]): string {
    return orgFilterSql({ branch: `${alias}.branchId`, department: `${alias}.departmentId`, team: `${alias}.teamId` }, filter, params)
      .map(clause => `AND ${clause}`).join(' ')
  }

  // ===== «إدارة ← قسم ← فريق» =====

  /** المجموعة المطلوب فتحها: لازم تكون جوه شجرة نطاق الحساب، وإلا 404 (وحدة فرع تاني زي وحدة مش موجودة) */
  groupOf(ctx: CardContext, raw: unknown): CardGroup | null {
    if (raw === undefined || raw === null || raw === '') return startGroupOf(ctx.tree, ctx.filter)
    const group = parseCardGroup(raw)
    if (!group) throw new BadRequestException('المجموعة المطلوبة غير صالحة')
    const known = group.kind === 'none' || (group.kind === 'team' ? ctx.tree.teams.has(group.id) : ctx.tree.units.has(group.id))
    if (!known) throw new NotFoundException(group.kind === 'team' ? 'الفريق غير موجود' : 'القسم غير موجود')
    return group
  }

  private groupLabel(ctx: CardContext, group: CardGroup | null) {
    if (!group) return null
    if (group.kind === 'none') return { group: 'none', name: 'من غير قسم', level: '' }
    if (group.kind === 'team') return { group: `team:${group.id}`, name: ctx.tree.teams.get(group.id)!.name, level: 'فريق' }
    const unit = ctx.tree.units.get(group.id)!
    return group.kind === 'direct'
      ? { group: `direct:${unit.id}`, name: `${unit.name} — من غير فريق`, level: '' }
      : { group: `unit:${unit.id}`, name: unit.name, level: unit.unitType === 'ADMINISTRATION' ? 'إدارة' : 'قسم' }
  }

  /** الموظفين جوه المجموعة، وصفوف المستوى اللي تحتها بأعضاء كل صف (الصف الفاضي مابيتعرضش) */
  private grouped(ctx: CardContext, group: CardGroup | null): { members: Person[]; rows: Array<CardGroupRow & { branchName: string | null; members: Person[] }> } {
    const members = group ? ctx.people.filter(person => inCardGroup(ctx.tree, group, person)) : ctx.people
    const many = ctx.scope === null || ctx.scope.length > 1
    const rows = cardGroupChildren(ctx.tree, group).map(row => {
      const child = parseCardGroup(row.group)!
      return { ...row, branchName: many && ctx.filter.branchId === null ? ctx.branchName(row.branchId) : null,
        members: members.filter(person => inCardGroup(ctx.tree, child, person)) }
    }).filter(row => row.members.length > 0)
    return { members, rows }
  }

  private placeNames(ctx: CardContext, person: Person): { unit: string | null; team: string | null } {
    const place = visiblePlacement(ctx.tree, person)
    return { unit: place.unitId === null ? null : ctx.tree.units.get(place.unitId)!.name, team: place.teamId === null ? null : ctx.tree.teams.get(place.teamId)!.name }
  }

  // ===== كارت 1 و2: حضور اليوم =====

  /**
   * خانة كل موظف حالي في النطاق في يوم — مرة واحدة للنطاق كله (مش لكل موظف): صفوف اليوم المحسوبة، والمستثنين، والإجازات المعتمدة،
   * والمأموريات، والإيقاف، وغياب اليوم اللحظي من محرك الحضور؛ واللي فاضل من غير صف بيتحدد بتقويمه ووردته من نفس المحرك بدفعة قراءة
   * واحدة (readOnlyRange): يوم عمل = «لسه مابصمش» (النهارده) أو «من غير سجل» (يوم فات)، وغيره = «راحة».
   */
  private daySnapshot(date: string, scope: BranchScope): Promise<Map<number, DayState>> {
    return this.share(`day|${date}|${scopeKey(scope)}`, async () => {
      const people = await this.peopleOf(scope)
      const out = new Map<number, DayState>()
      if (!people.length) return out
      const dayParams: unknown[] = [date], exemptParams: unknown[] = [date], leaveParams: unknown[] = [date], excuseParams: unknown[] = []
      const [days, exempt, leaves, excuses, suspensions] = await Promise.all([
        this.ds.query(
          `SELECT a.employeeId AS employeeId, a.status AS status, a.checkIn AS checkIn, a.checkOut AS checkOut, a.shiftName AS shiftName,
                  a.shiftStart AS shiftStart, a.shiftEnd AS shiftEnd, a.lateMinutes AS lateMinutes
           FROM attendance_days a JOIN employees e ON e.id = a.employeeId
           WHERE a.date = @0 AND ${currentEmployeeSql('e.')} ${andBranchScopeSql('e.branchId', scope, dayParams)}`, dayParams
        ) as Promise<Array<Record<string, unknown>>>,
        // EX-14: المستثنى خارج مقام الالتزام — نفس شرط كروت اللوحة القديمة (attendanceExemptSql)
        this.ds.query(
          `SELECT DISTINCT ex.employeeId AS employeeId FROM attendance_exemptions ex JOIN employees e ON e.id = ex.employeeId
           WHERE ex.status = 'APPROVED' AND ex.effectiveFrom <= @0 AND (ex.effectiveTo IS NULL OR ex.effectiveTo >= @0)
             AND (ex.terminatedFrom IS NULL OR ex.terminatedFrom > @0) ${andBranchScopeSql('e.branchId', scope, exemptParams)}`, exemptParams
        ) as Promise<Array<{ employeeId: number }>>,
        // إجازة يوم كامل: FULL أو صباحي + مسائي معًا — تعريف كارت «في إجازة» القديم بالحرف
        this.ds.query(
          `SELECT l.employeeId AS employeeId FROM leaves l JOIN employees e ON e.id = l.employeeId
           WHERE l.status = 'APPROVED' AND l.fromDate <= @0 AND l.toDate >= @0 AND ${currentEmployeeSql('e.')}
             ${andBranchScopeSql('e.branchId', scope, leaveParams)}
           GROUP BY l.employeeId
           HAVING MAX(CASE WHEN l.period = 'FULL' THEN 1 ELSE 0 END) = 1
              OR (MAX(CASE WHEN l.period = 'MORNING' THEN 1 ELSE 0 END) = 1 AND MAX(CASE WHEN l.period = 'EVENING' THEN 1 ELSE 0 END) = 1)`, leaveParams
        ) as Promise<Array<{ employeeId: number }>>,
        // مأمورية أو عمل عن بعد معتمد بيغطي اليوم — نفس قاعدة محرك الحضور (approvedDayExcuses): المدى من حمولة الطلب
        this.ds.query(
          `SELECT r.requesterId AS employeeId, r.typeCode AS typeCode, r.payload AS payload FROM requests r JOIN employees e ON e.id = r.requesterId
           WHERE r.typeCode IN ('BUSINESS_TRIP', 'REMOTE_WORK') AND r.status IN ('COMPLETED', 'APPROVED', 'IN_EXECUTION')
             AND ${currentEmployeeSql('e.')} ${andBranchScopeSql('e.branchId', scope, excuseParams)}`, excuseParams
        ) as Promise<Array<{ employeeId: number; typeCode: string; payload: string | null }>>,
        readOpenSuspensions(this.ds.manager, date),
      ])
      const dayOf = new Map(days.map(row => [Number(row.employeeId), row]))
      const exempted = new Set(exempt.map(row => Number(row.employeeId)))
      const onLeave = new Set(leaves.map(row => Number(row.employeeId)))
      const excused = new Map<number, 'mission' | 'remote'>()
      for (const row of excuses) {
        try {
          const payload = JSON.parse(row.payload ?? '{}')
          const from = String(payload.fromDate ?? payload.date ?? '').slice(0, 10), to = String(payload.toDate ?? payload.fromDate ?? payload.date ?? '').slice(0, 10)
          if (!isDay(from) || !isDay(to) || from > date || to < date) continue
          if (row.typeCode === 'BUSINESS_TRIP') excused.set(Number(row.employeeId), 'mission')
          else if (!excused.has(Number(row.employeeId))) excused.set(Number(row.employeeId), 'remote')
        } catch { /* حمولة تالفة — زي المحرك: تتجاهل */ }
      }
      const open: Person[] = []
      for (const person of people) {
        const row = dayOf.get(person.id)
        const base = { checkIn: (row?.checkIn as string | null) ?? null, shift: row ? shiftText(row.shiftName, row.shiftStart, row.shiftEnd) : null,
          lateMinutes: Number(row?.lateMinutes ?? 0) }
        if (person.startDate && person.startDate > date) out.set(person.id, { ...base, bucket: 'other', detail: 'لسه مابدأش' })
        else if (exempted.has(person.id)) out.set(person.id, { ...base, bucket: 'other', detail: 'مستثنى من البصمة' })
        else if (row) out.set(person.id, { ...base, bucket: attendanceBucketOfDay(row as { status: string; checkIn?: unknown; checkOut?: unknown }), detail: STATUS_DETAIL[String(row.status)] ?? null })
        else if ((suspensions.get(person.id) ?? []).some(period => suspensionCovers(period, date))) out.set(person.id, { ...base, bucket: 'other', detail: 'موقوف' })
        else if (onLeave.has(person.id)) out.set(person.id, { ...base, bucket: 'leave', detail: null })
        else if (excused.has(person.id)) out.set(person.id, { ...base, bucket: 'mission', detail: excused.get(person.id) === 'mission' ? 'مأمورية' : 'عمل عن بعد' })
        else open.push(person)
      }
      // غياب اليوم اللحظي: بدأت ورديته وعدّت السماحية من غير بصمة — نفس دالة شاشة الحضور وكارت «الغائبون» القديم
      const today = date === localDateOf(new Date())
      const live = today && open.length ? await this.attendance.liveAbsences(date, scope) : []
      const liveOf = new Map(live.map(row => [row.employeeId, row]))
      const rest = open.filter(person => {
        const absent = liveOf.get(person.id)
        if (absent) out.set(person.id, { bucket: 'absent', detail: 'من غير بصمة', checkIn: null, shift: shiftText(absent.shiftName, absent.shiftStart, absent.shiftEnd), lateMinutes: 0 })
        return !absent
      })
      if (rest.length) {
        // دفعة قراءة واحدة للباقي: التقويم والوردية من محرك الحضور، وقراءاتهم المرجعية متحمّلة مرة للكل
        const reader = this.attendance.batchScope(this.ds.manager)
        for (let offset = 0; offset < rest.length; offset += 25) {
          await Promise.all(rest.slice(offset, offset + 25).map(async person => {
            try {
              const calendar = await reader.calendarDay(person.id, date)
              if (!calendar.working) {
                out.set(person.id, { bucket: 'rest', detail: calendar.dayKind === 'HOLIDAY' ? 'عطلة رسمية' : 'راحة أسبوعية', checkIn: null, shift: null, lateMinutes: 0 })
                return
              }
              // الوردية نفسها بتتحل وقت فتح قايمة الأسماء بس (fillShifts): العدّ مش محتاجها
              out.set(person.id, today
                ? { bucket: 'pending', detail: null, checkIn: null, shift: null, lateMinutes: 0, shiftPending: true }
                : { bucket: 'other', detail: 'من غير سجل', checkIn: null, shift: null, lateMinutes: 0, shiftPending: true })
            } catch {
              out.set(person.id, { bucket: 'other', detail: 'تقويم اليوم مش مثبت', checkIn: null, shift: null, lateMinutes: 0 })
            }
          }))
        }
      }
      return out
    })
  }

  /** وردية اللي من غير صف محسوب (لسه مابصمش) لأسماء قايمة واحدة — من محرك الحضور بدفعة قراءة، وبتتحفظ على حالة اليوم المشتركة */
  private async fillShifts(date: string, states: Map<number, DayState>, members: readonly Person[]): Promise<void> {
    const waiting = members.filter(person => states.get(person.id)?.shiftPending)
    if (!waiting.length) return
    const reader = await this.attendance.readOnlyRange(this.ds.manager, waiting.map(person => person.id), date, date)
    for (let offset = 0; offset < waiting.length; offset += 25) {
      await Promise.all(waiting.slice(offset, offset + 25).map(async person => {
        const state = states.get(person.id)!
        try {
          const shift = await reader.shiftFor(person.id, date)
          if (shift.source === 'none') state.detail = state.detail ?? 'من غير وردية'
          else state.shift = shiftText(shift.name, shift.start, shift.end)
        } catch { /* وردية مش مقروءة: العمود فاضي */ }
        state.shiftPending = false
      }))
    }
  }

  private countBuckets(states: Map<number, DayState>, members: readonly Person[]): BucketCounts {
    const counts = emptyBucketCounts()
    for (const person of members) counts[states.get(person.id)?.bucket ?? 'other'] += 1
    return counts
  }

  /** كارت 1: خانات حضور اليوم للمجموعة، وصفوف المستوى اللي تحتها (إدارة ← قسم ← فريق) */
  async attendanceCard(ctx: CardContext, date: string, rawGroup: unknown) {
    const group = this.groupOf(ctx, rawGroup)
    const states = await this.daySnapshot(date, ctx.scope)
    const { members, rows } = this.grouped(ctx, group)
    return {
      date, today: ctx.today, isToday: date === ctx.today, group: this.groupLabel(ctx, group),
      total: members.length, counts: this.countBuckets(states, members),
      rows: rows.map(({ members: inRow, ...row }) => ({ ...row, total: inRow.length, counts: this.countBuckets(states, inRow) })),
    }
  }

  private personRow(ctx: CardContext, person: Person, state: DayState | undefined, contact: boolean) {
    const place = this.placeNames(ctx, person)
    const bucket = state?.bucket ?? 'other'
    return {
      id: person.id, name: person.fullName, code: person.employeeCode, jobTitle: person.jobTitle, unit: place.unit, team: place.team,
      shift: state?.shift ?? null, firstPunch: state?.checkIn ?? null, bucket,
      status: ATTENDANCE_BUCKETS.find(item => item.key === bucket)!.label, detail: state?.detail ?? null, lateMinutes: state?.lateMinutes ?? 0,
      // رقم التليفون لصاحب صلاحية عرض الموظفين بس — غيره الحقل مش موجود في الرد
      ...(contact ? { phone: person.phone } : {}),
    }
  }

  /** قايمة أسماء خانة في مجموعة (الضغط على رقم): اسم، فريق، وردية، أول بصمة، الحالة */
  async attendanceEmployees(ctx: CardContext, date: string, rawGroup: unknown, rawBucket: unknown, rawLimit?: unknown) {
    if (!isAttendanceBucket(rawBucket)) throw new BadRequestException('الحالة المطلوبة غير صالحة')
    // B-ADD.20: اللوحة بتطلب أول 50 اسم بس (كروت أشخاص في لوحة جانبية) — من غير limit الحد كله زي الأول
    const limit = listLimitOf(rawLimit, LIST_LIMIT)
    if (limit === null) throw new BadRequestException(`عدد الأسماء من 1 لـ${LIST_LIMIT}`)
    const group = this.groupOf(ctx, rawGroup)
    const states = await this.daySnapshot(date, ctx.scope)
    const members = (group ? ctx.people.filter(person => inCardGroup(ctx.tree, group, person)) : ctx.people)
      .filter(person => (states.get(person.id)?.bucket ?? 'other') === rawBucket)
      .sort((a, b) => byArabic(a.fullName, b.fullName) || a.id - b.id)
    const listed = members.slice(0, limit)
    await this.fillShifts(date, states, listed)
    return {
      date, group: this.groupLabel(ctx, group), bucket: rawBucket, total: members.length, truncated: members.length > listed.length,
      employees: listed.map(person => this.personRow(ctx, person, states.get(person.id), false)),
    }
  }

  /** كارت 2: الغايبين والمتأخرين بالاسم متجمّعين بالفريق — والتليفون لصاحب صلاحية عرض الموظفين بس */
  async absentLateCard(ctx: CardContext, date: string) {
    const states = await this.daySnapshot(date, ctx.scope)
    const contact = userHasPerm(ctx.user, DASHBOARD_CONTACT_PERM)
    const teams = new Map<string, { name: string; unit: string | null; absent: unknown[]; late: unknown[] }>()
    let absent = 0, late = 0, listed = 0
    const sorted = [...ctx.people].sort((a, b) => byArabic(a.fullName, b.fullName) || a.id - b.id)
    for (const person of sorted) {
      const state = states.get(person.id)
      if (state?.bucket !== 'absent' && state?.bucket !== 'late') continue
      if (state.bucket === 'absent') absent += 1
      else late += 1
      if (listed >= LIST_LIMIT) continue
      listed += 1
      const place = this.placeNames(ctx, person)
      const key = `${place.unit ?? ''}|${place.team ?? ''}`
      let team = teams.get(key)
      if (!team) { team = { name: place.team ?? 'من غير فريق', unit: place.unit, absent: [], late: [] }; teams.set(key, team) }
      team[state.bucket].push(this.personRow(ctx, person, state, contact))
    }
    return {
      date, isToday: date === ctx.today, absent, late, contact, truncated: absent + late > LIST_LIMIT,
      teams: [...teams.values()].sort((a, b) => (b.absent.length + b.late.length) - (a.absent.length + a.late.length) || byArabic(a.name, b.name)),
    }
  }

  /**
   * B-ADD.20: خانات حضور اليوم لكل فرع من فروع الحساب جوه فلتر اللوحة — أعداد بس (أول مستوى في النزول «شركة ← فرع ← إدارة ← قسم ← فريق»).
   * اسم الفرع من شجرة نطاق القارئ (filterContext)، والموظف اللي فرعه مش فيها (من غير فرع) في صف واحد من غير رقم فرع.
   */
  async branchesCard(ctx: CardContext, date: string) {
    const states = await this.daySnapshot(date, ctx.scope)
    const byBranch = new Map<number | null, Person[]>()
    for (const person of ctx.people) {
      const branchId = person.branchId !== null && ctx.branchName(person.branchId) !== null ? person.branchId : null
      const list = byBranch.get(branchId)
      if (list) list.push(person)
      else byBranch.set(branchId, [person])
    }
    const rows = [...byBranch.entries()].map(([branchId, members]) => ({
      branchId, name: branchId === null ? 'من غير فرع' : ctx.branchName(branchId)!, total: members.length, counts: this.countBuckets(states, members),
    })).sort((a, b) => b.total - a.total || byArabic(a.name, b.name))
    return { date, isToday: date === ctx.today, total: ctx.people.length, counts: this.countBuckets(states, ctx.people), rows }
  }

  // ===== كارت 3: الإجازات =====

  /** إجازات اليوم المختار، والأسبوع اللي بعده، وأكتر الأقسام إجازات في الأسبوع (اليوم + 7 أيام) */
  async leavesCard(ctx: CardContext, date: string) {
    const weekEnd = dayAfter(date, 7)
    const params: unknown[] = [date, weekEnd]
    const [rows, types]: [Array<Record<string, unknown>>, Array<{ code: string; nameAr: string }>] = await Promise.all([
      this.ds.query(
        `SELECT l.employeeId AS employeeId, l.leaveTypeCode AS leaveTypeCode, CONVERT(varchar(10), l.fromDate, 23) AS fromDate,
                CONVERT(varchar(10), l.toDate, 23) AS toDate, l.period AS period
         FROM leaves l JOIN employees e ON e.id = l.employeeId
         WHERE l.status = 'APPROVED' AND l.fromDate <= @1 AND l.toDate >= @0 AND ${currentEmployeeSql('e.')}
           ${andBranchScopeSql('e.branchId', ctx.scope, params)}`, params),
      this.ds.query(`SELECT code, nameAr FROM leave_types`),
    ])
    const typeName = new Map(types.map(type => [type.code, type.nameAr]))
    const personOf = new Map(ctx.people.map(person => [person.id, person]))
    const mine = rows.map(row => ({ employeeId: Number(row.employeeId), type: String(row.leaveTypeCode), from: String(row.fromDate), to: String(row.toDate),
      period: String(row.period ?? 'FULL') })).filter(row => personOf.has(row.employeeId))
    // النهارده: يوم كامل (FULL أو صباحي + مسائي) = «في إجازة»، ونص اليوم لوحده — نفس تعريف كارت «في إجازة» القديم
    const periodsToday = new Map<number, Set<string>>()
    for (const row of mine) if (row.from <= date && row.to >= date) periodsToday.set(row.employeeId, (periodsToday.get(row.employeeId) ?? new Set()).add(row.period))
    let onLeave = 0, halfDay = 0
    for (const periods of periodsToday.values()) {
      if (periods.has('FULL') || (periods.has('MORNING') && periods.has('EVENING'))) onLeave += 1
      else halfDay += 1
    }
    // الأسبوع الجاي: من بكرة لحد 7 أيام — كل موظف مرة، وأول إجازة له في القايمة
    const tomorrow = dayAfter(date, 1)
    const upcoming = mine.filter(row => row.to >= tomorrow).sort((a, b) => a.from.localeCompare(b.from) || a.employeeId - b.employeeId)
    const nextWeekIds = new Set(upcoming.map(row => row.employeeId))
    const seen = new Set<number>()
    const list = upcoming.filter(row => !seen.has(row.employeeId) && seen.add(row.employeeId)).slice(0, 20).map(row => {
      const person = personOf.get(row.employeeId)!
      return { id: person.id, name: person.fullName, ...this.placeNames(ctx, person), type: typeName.get(row.type) ?? row.type, from: row.from, to: row.to,
        halfDay: row.period !== 'FULL' }
    })
    // أكتر الأقسام إجازات: أيام الإجازة جوه نافذة اليوم + 7 أيام (نص اليوم بنص)، وعدد أصحابها
    const units = new Map<number | null, { days: number; people: Set<number> }>()
    // B-ADD.20: نفس أيام النافذة حسب نوع الإجازة — أعداد بس
    const byType = new Map<string, { days: number; people: Set<number> }>()
    for (const row of mine) {
      const from = row.from > date ? row.from : date, to = row.to < weekEnd ? row.to : weekEnd
      const span = Math.round((Date.parse(`${to}T12:00:00Z`) - Date.parse(`${from}T12:00:00Z`)) / 86_400_000) + 1
      if (span <= 0) continue
      const unitId = visiblePlacement(ctx.tree, personOf.get(row.employeeId)!).unitId
      const cell = units.get(unitId) ?? { days: 0, people: new Set<number>() }
      cell.days += row.period === 'FULL' ? span : span * 0.5
      cell.people.add(row.employeeId)
      units.set(unitId, cell)
      const kind = byType.get(row.type) ?? { days: 0, people: new Set<number>() }
      kind.days += row.period === 'FULL' ? span : span * 0.5
      kind.people.add(row.employeeId)
      byType.set(row.type, kind)
    }
    const leaveTypes = [...byType.entries()].map(([code, cell]) => ({ code, name: typeName.get(code) ?? code, days: round2(cell.days), employees: cell.people.size }))
      .sort((a, b) => b.days - a.days || byArabic(a.name, b.name))
    const topUnits = [...units.entries()].map(([unitId, cell]) => ({
      id: unitId, name: unitId === null ? 'من غير قسم' : ctx.tree.units.get(unitId)!.name, days: round2(cell.days), employees: cell.people.size,
    })).sort((a, b) => b.days - a.days || b.employees - a.employees || byArabic(a.name, b.name)).slice(0, 5)
    return { date, isToday: date === ctx.today, weekEnd, today: { onLeave, halfDay }, nextWeek: { employees: nextWeekIds.size, list }, topUnits, byType: leaveTypes }
  }

  // ===== كارت 4: القوى العاملة =====

  private async configNumber(key: string, fallback: number): Promise<number> {
    const [row] = await this.ds.query(`SELECT [value] FROM [requests_config] WHERE [key] = @0`, [key])
    const value = Number(row?.value)
    return Number.isFinite(value) ? value : fallback
  }

  /**
   * العدد من قاموس المؤشرات (MetricsService.workforce — نفس رقم التقرير والتصدير)، وتوزيعه إدارة ← قسم ← فريق، والجداد والخارجين في
   * شهر الرواتب الجاري (الخارجين بتعريف «دوران العمالة» في القاموس بالحرف)، والتجربة والعقود والجوازات والمستندات اللي هتنتهي في 30 يوم.
   */
  async workforceCard(ctx: CardContext, rawGroup: unknown) {
    const group = this.groupOf(ctx, rawGroup)
    const { members, rows } = this.grouped(ctx, group)
    if (rawGroup !== undefined && rawGroup !== null && rawGroup !== '') {
      // فتح مستوى: الأعداد بس (باقي الكارت اتحمّل مع المستوى الأول)
      return { group: this.groupLabel(ctx, group), total: members.length, rows: rows.map(({ members: inRow, ...row }) => ({ ...row, total: inRow.length })) }
    }
    const today = ctx.today, until = dayAfter(today, EXPIRY_WINDOW_DAYS)
    const financial = this.moduleRef.get(FinancialReportService, { strict: false })
    const [workforce, range, probationDays] = await Promise.all([
      this.metrics.workforce(ctx.scope, ctx.filter), financial.periodOf(), this.configNumber(PROBATION_DAYS_KEY, 0),
    ])
    const leavers = await this.leavers(ctx, range.startDate, range.endDate)
    const soon = (date: string | null) => date !== null && date >= today && date <= until
    const item = (person: Person, date: string) => ({ id: person.id, name: person.fullName, ...this.placeNames(ctx, person), date, daysLeft: ageInDays(today, date) })
    const byDate = (a: { date: string; name: string }, b: { date: string; name: string }) => a.date.localeCompare(b.date) || byArabic(a.name, b.name)
    const joiners = ctx.people.filter(person => person.startDate !== null && person.startDate >= range.startDate && person.startDate <= today)
    const probation = ctx.people.filter(person => person.status === 'probation')
      .map(person => ({ person, end: effectiveProbationEnd(person, probationDays).date }))
      .filter(row => soon(row.end)).map(row => item(row.person, row.end!)).sort(byDate)
    const contracts = ctx.people.filter(person => soon(person.contractEnd)).map(person => item(person, person.contractEnd!)).sort(byDate)
    const passports = ctx.people.filter(person => soon(person.passportExpiry)).map(person => item(person, person.passportExpiry!)).sort(byDate)
    const documents = userHasPerm(ctx.user, 'documents.manage') ? await this.expiringDocuments(ctx, today) : null
    return {
      date: workforce.date, group: this.groupLabel(ctx, group),
      headcount: workforce.headcount, active: workforce.active, onProbation: workforce.probation,
      total: members.length, rows: rows.map(({ members: inRow, ...row }) => ({ ...row, total: inRow.length })),
      period: { period: range.period, from: range.startDate, to: range.endDate },
      joiners: { count: joiners.length, list: joiners.sort((a, b) => (b.startDate ?? '').localeCompare(a.startDate ?? '')).slice(0, 20).map(person => item(person, person.startDate!)) },
      leavers,
      windowDays: EXPIRY_WINDOW_DAYS,
      probationEnding: { count: probation.length, list: probation.slice(0, 20) },
      contractsEnding: { count: contracts.length, expired: ctx.people.filter(person => person.contractEnd !== null && person.contractEnd < today).length, list: contracts.slice(0, 20) },
      passportsEnding: { count: passports.length, list: passports.slice(0, 20) },
      // مستندات الموظفين (ومنها الإقامة كنوع مستند): لصاحب صلاحية إدارة المستندات بس — غيره الحقل مش موجود
      ...(documents ? { documentsEnding: documents } : {}),
    }
  }

  /**
   * فترات الخدمة جوه نطاق الحساب وفلتر اللوحة (serviceSpans — تعريف قاموس المؤشرات بالحرف): خدمة الموظف الحالية، ومعاها فتراته
   * المقفولة لما جدولها موجود. params لازم يبدأ بـ[from, to]: شروط النطاق والفلتر بتتضاف بعدهم.
   */
  private async spansCte(ctx: CardContext, params: unknown[]): Promise<string> {
    const within = (alias: string) => `${andBranchScopeSql(`${alias}.branchId`, ctx.scope, params)} ${this.orgSql(alias, ctx.filter, params)}`
    const closed = !(await employmentPeriodsReady(this.ds.manager)) ? '' : `
           UNION ALL
           SELECT p.startDate AS startDate, p.endDate AS endDate
           FROM employment_periods p JOIN employees pe ON pe.id = p.employeeId WHERE 1=1 ${within('pe')}`
    return `WITH spans AS (
           SELECT ${serviceStartSql('e')} AS startDate, ${serviceEndSql('e')} AS endDate
           FROM employees e WHERE 1=1 ${within('e')}${closed}
       )`
  }

  /** اللي آخر يوم لهم جوه الفترة — تعريف «دوران العمالة» في قاموس المؤشرات (serviceSpans) بالحرف، من غير متوسط العدد */
  private async leavers(ctx: CardContext, from: string, to: string): Promise<number> {
    const params: unknown[] = [from, to]
    const [row] = await this.ds.query(
      `${await this.spansCte(ctx, params)}
       SELECT SUM(CASE WHEN endDate >= @0 AND endDate <= @1 THEN 1 ELSE 0 END) AS leavers FROM spans`,
      params
    )
    return Number(row?.leavers ?? 0)
  }

  /**
   * B-ADD.7: «تعيينات مقابل خروج» لآخر WORKFORCE_MONTHS شهر ميلادي (الشهر الحالي لحد النهارده) — أعداد بس، من نفس فترات الخدمة:
   * التعيين = فترة خدمة بدأت في الشهر، والخروج = فترة آخر يوم لها في الشهر (نفس تعريف «خرجوا» في الكارت). جوه النطاق وفلتر اللوحة.
   */
  async workforceMonthly(ctx: CardContext) {
    const months: string[] = []
    const [year, month] = ctx.today.split('-').map(Number)
    for (let back = WORKFORCE_MONTHS - 1; back >= 0; back--) {
      const at = new Date(Date.UTC(year, month - 1 - back, 1))
      months.push(`${at.getUTCFullYear()}-${String(at.getUTCMonth() + 1).padStart(2, '0')}`)
    }
    const params: unknown[] = [`${months[0]}-01`, ctx.today]
    const rows: Array<{ m: string; joined: number; gone: number }> = await this.ds.query(
      `${await this.spansCte(ctx, params)}
       SELECT x.m AS m, SUM(x.joined) AS joined, SUM(x.gone) AS gone FROM (
         SELECT CONVERT(varchar(7), startDate, 23) AS m, 1 AS joined, 0 AS gone FROM spans WHERE startDate >= @0 AND startDate <= @1
         UNION ALL
         SELECT CONVERT(varchar(7), endDate, 23) AS m, 0 AS joined, 1 AS gone FROM spans WHERE endDate >= @0 AND endDate <= @1
       ) x GROUP BY x.m`,
      params
    )
    const byMonth = new Map(rows.map(row => [String(row.m), row]))
    return {
      from: months[0], to: months[months.length - 1],
      months: months.map(key => ({ month: key, joiners: Number(byMonth.get(key)?.joined ?? 0), leavers: Number(byMonth.get(key)?.gone ?? 0) })),
    }
  }

  /**
   * B-ADD.20: أرقام قسم «القوى العاملة» في اللوحة الإحصائية — أعداد بس، بفحص كارت القوى العاملة ونطاقه وفلتره:
   * العدد آخر كل شهر (الشهر الجاري لحد النهارده) والتعيينات والخروج لآخر INSIGHT_MONTHS شهر من نفس فترات الخدمة (spansCte)، ودوران
   * الفترة بدالة قاموس المؤشرات (turnoverRate: الخارجين ÷ متوسط العدد أول الفترة وآخرها)، وتوزيع الموظفين الحاليين على مدة الخدمة،
   * وعددهم لكل فرع من فروع الحساب.
   */
  async workforceInsights(ctx: CardContext) {
    const months = lastMonths(ctx.today, INSIGHT_MONTHS)
    const from = `${months[0]}-01`
    const params: unknown[] = [from, ctx.today]
    const cte = await this.spansCte(ctx, params)
    const flows: Array<{ m: string; joined: number; gone: number }> = await this.ds.query(
      `${cte}
       SELECT x.m AS m, SUM(x.joined) AS joined, SUM(x.gone) AS gone FROM (
         SELECT CONVERT(varchar(7), startDate, 23) AS m, 1 AS joined, 0 AS gone FROM spans WHERE startDate >= @0 AND startDate <= @1
         UNION ALL
         SELECT CONVERT(varchar(7), endDate, 23) AS m, 0 AS joined, 1 AS gone FROM spans WHERE endDate >= @0 AND endDate <= @1
       ) x GROUP BY x.m`,
      [...params]
    )
    // العدد في يوم = فترات الخدمة اللي اليوم ده جواها (تعريف «أول الفترة وآخرها» في دوران العمالة بالحرف) — أول يوم في النافذة وآخر كل شهر
    const ends = months.map(month => monthEndOf(month, ctx.today))
    const points = [from, ...ends].map(day => `(CONVERT(date, @${params.push(day) - 1}, 23))`).join(', ')
    const counted: Array<{ d: string; n: number }> = await this.ds.query(
      `${cte}
       SELECT CONVERT(varchar(10), p.d, 23) AS d, COUNT(s.startDate) AS n
       FROM (VALUES ${points}) p(d) LEFT JOIN spans s ON s.startDate <= p.d AND (s.endDate IS NULL OR s.endDate >= p.d)
       GROUP BY p.d`,
      params
    )
    const flowOf = new Map(flows.map(row => [String(row.m), row]))
    const countOf = new Map(counted.map(row => [String(row.d), Number(row.n ?? 0)]))
    const series = months.map((month, index) => ({
      month, joiners: Number(flowOf.get(month)?.joined ?? 0), leavers: Number(flowOf.get(month)?.gone ?? 0), headcount: countOf.get(ends[index]) ?? 0,
    }))
    const leavers = series.reduce((sum, row) => sum + row.leavers, 0)
    const atStart = countOf.get(from) ?? 0, atEnd = series[series.length - 1].headcount
    // مدة الخدمة: الموظفين الحاليين جوه الفلتر، من أول يوم فعلي (أو تاريخ التعيين) لحد النهارده
    const bands = new Map(TENURE_BANDS.map(band => [band.key, 0]))
    let known = 0, totalMonths = 0, unknown = 0
    const branches = new Map<number | null, number>()
    for (const person of ctx.people) {
      const branchId = person.branchId !== null && ctx.branchName(person.branchId) !== null ? person.branchId : null
      branches.set(branchId, (branches.get(branchId) ?? 0) + 1)
      if (!person.startDate) { unknown += 1; continue }
      const served = monthsBetween(person.startDate, ctx.today)
      bands.set(tenureBandOf(served).key, (bands.get(tenureBandOf(served).key) ?? 0) + 1)
      known += 1; totalMonths += served
    }
    return {
      from: months[0], to: months[months.length - 1], months: series,
      turnover: { leavers, atStart, atEnd, rate: turnoverRate(leavers, atStart, atEnd) },
      tenure: {
        averageMonths: known > 0 ? Math.round(totalMonths / known) : null, unknown,
        bands: TENURE_BANDS.map(band => ({ key: band.key, label: band.label, count: bands.get(band.key) ?? 0 })),
      },
      byBranch: [...branches.entries()].map(([branchId, total]) => ({ branchId, name: branchId === null ? 'من غير فرع' : ctx.branchName(branchId)!, total }))
        .sort((a, b) => b.total - a.total || byArabic(a.name, b.name)),
    }
  }

  /** مستندات هتنتهي في 30 يوم أو انتهت — نفس شرط تقرير انتهاء المستندات (GET documents/expiry) بالحرف، جوه فلتر اللوحة */
  private async expiringDocuments(ctx: CardContext, today: string) {
    const params: unknown[] = [today, EXPIRY_WINDOW_DAYS]
    const [rows, settings] = await Promise.all([
      this.ds.query(
        `SELECT d.[employeeId] AS [employeeId], d.[docType] AS [docType], CONVERT(nvarchar(10), d.[expiryDate], 23) AS [expiryDate]
         FROM [employee_documents] d INNER JOIN [employees] e ON e.[id] = d.[employeeId]
         WHERE d.[expiryDate] IS NOT NULL AND d.[expiryDate] <= DATEADD(day, @1, CONVERT(date, @0, 23)) AND ${currentEmployeeSql('e.')}
           AND NOT ${supersededSql('d')} ${andBranchScopeSql('e.[branchId]', ctx.scope, params)}
         ORDER BY d.[expiryDate], d.[id]`, params) as Promise<Array<Record<string, unknown>>>,
      (await documentExpiryReady(this.ds.manager)) ? docTypeExpirySettings(this.ds.manager) : Promise.resolve(new Map<string, { nameAr: string }>()),
    ])
    const personOf = new Map(ctx.people.map(person => [person.id, person]))
    const mine = rows.filter(row => personOf.has(Number(row.employeeId))).map(row => {
      const person = personOf.get(Number(row.employeeId))!, date = String(row.expiryDate)
      return { id: person.id, name: person.fullName, ...this.placeNames(ctx, person), type: settings.get(String(row.docType))?.nameAr ?? String(row.docType), date,
        expired: date < today, daysLeft: ageInDays(today, date) }
    })
    const byType = new Map<string, number>()
    for (const row of mine) byType.set(row.type, (byType.get(row.type) ?? 0) + 1)
    return {
      expired: mine.filter(row => row.expired).length, count: mine.filter(row => !row.expired).length,
      byType: [...byType.entries()].map(([type, count]) => ({ type, count })).sort((a, b) => b.count - a.count || byArabic(a.type, b.type)),
      list: mine.slice(0, 20),
    }
  }

  // ===== كارت 5: الطلبات =====

  /**
   * المعلّق (متقدّم أو قيد المراجعة) بالنوع والعمر، والمتأخر عن مهلة خطوته الحالية (dueAt من resolvedSteps — نفس قراءة تصعيد الطلبات)،
   * و«معتمد ومااتنفذش» (APPROVED أو IN_EXECUTION — تعريف كونسول الطلبات). النطاق بفرع الطلب، والفلتر بمكان صاحبه جوه نطاق القارئ،
   * والسرّي بفرعه بس: فلتر إدارة أو قسم أو فريق مابيعدّوش (العدد كان هيكشف مكان صاحبه). Codex P7A-B07: «سرّي» بحكم محرك الطلبات الموحد
   * (CONFIDENTIAL_REQUEST_SQL) — تعريف الطلب الفعلي سري، أو نوعه العام سري، أو تأجيل قسط سلفة ونوع السلفة سري — مش بنوعه العام لوحده.
   */
  async requestsCard(ctx: CardContext) {
    const params: unknown[] = []
    const inScope = andBranchScopeSql('r.branchId', ctx.scope, params)
    let inOrg = ''
    if (!orgFilterIsEmpty(ctx.filter)) {
      const confidential = ctx.filter.departmentIds !== null || ctx.filter.teamId !== null ? '1 = 0'
        : ctx.filter.branchId !== null ? `r.branchId = @${params.push(ctx.filter.branchId) - 1}` : '1 = 1'
      const clauses = orgFilterSql({ branch: 'oe.branchId', department: 'oe.departmentId', team: 'oe.teamId' }, ctx.filter, params)
      const readerScope = branchScopeSql('oe.branchId', ctx.scope, params)
      if (readerScope) clauses.push(readerScope)
      inOrg = `AND ((${CONFIDENTIAL_REQUEST_SQL} AND ${confidential}) OR (NOT ${CONFIDENTIAL_REQUEST_SQL}
        AND r.requesterId IN (SELECT oe.id FROM employees oe WHERE ${clauses.join(' AND ')})))`
    }
    const rows: Array<Record<string, unknown>> = await this.ds.query(
      `SELECT r.id AS id, r.typeCode AS typeCode, t.nameAr AS typeName, r.status AS status, r.currentStep AS currentStep,
              CASE WHEN r.status = 'UNDER_REVIEW' THEN r.resolvedSteps END AS resolvedSteps, r.submittedAt AS submittedAt, r.createdAt AS createdAt
       FROM requests r JOIN request_types t ON t.code = r.typeCode
       WHERE r.status IN ('SUBMITTED', 'UNDER_REVIEW', 'APPROVED', 'IN_EXECUTION') ${inScope} ${inOrg}`,
      params
    )
    const now = new Date().toISOString()
    const types = new Map<string, { code: string; name: string; count: number; overdue: number }>()
    const ages = new Map(AGE_BANDS.map(band => [band.key, 0]))
    let pending = 0, overdue = 0, approvedNotExecuted = 0, oldestDays = 0
    for (const row of rows) {
      const status = String(row.status)
      if (status === 'APPROVED' || status === 'IN_EXECUTION') { approvedNotExecuted += 1; continue }
      pending += 1
      const since = (row.submittedAt ?? row.createdAt) as Date | string | null
      const days = ageInDays(since instanceof Date ? localDateOf(since) : since, ctx.today)
      oldestDays = Math.max(oldestDays, days)
      ages.set(ageBandOf(days).key, (ages.get(ageBandOf(days).key) ?? 0) + 1)
      let late = false
      try {
        const steps: Array<{ stepOrder?: number; actedAt?: string | null; dueAt?: string | null }> = JSON.parse(String(row.resolvedSteps ?? '[]'))
        const current = Array.isArray(steps) ? steps.find(step => step.stepOrder === Number(row.currentStep) && !step.actedAt) : undefined
        late = !!current?.dueAt && current.dueAt < now
      } catch { /* خطوات تالفة = من غير مهلة */ }
      if (late) overdue += 1
      const code = String(row.typeCode)
      const type = types.get(code) ?? { code, name: String(row.typeName ?? code), count: 0, overdue: 0 }
      type.count += 1
      if (late) type.overdue += 1
      types.set(code, type)
    }
    return {
      pending, overdue, approvedNotExecuted, oldestDays,
      byType: [...types.values()].sort((a, b) => b.count - a.count || byArabic(a.name, b.name)),
      byAge: AGE_BANDS.map(band => ({ key: band.key, label: band.label, tone: band.tone, count: ages.get(band.key) ?? 0 })),
    }
  }

  // ===== كارت 6: المهام =====

  /**
   * المهام المفتوحة والمتأخرة (مفتوحة وميعادها فات — تعريف شاشة المهام) بالمسؤول: موظف أو دور. المهمة الشخصية برّه زي شاشة «المهام».
   * النطاق بفرع المهمة، وفلتر الإدارة والقسم والفريق بمكان المسؤول جوه نطاق القارئ (مهمة مسنودة لدور مالهاش مكان، فمابتطابقش).
   * Codex P7A-B06: اسم المسؤول ورقمه بفرعه **الحالي** — موظف اتنقل برّه نطاق الحساب مهامه القديمة بتتعدّ (بفرع المهمة) في صف واحد
   * «موظفين برّه نطاقك» من غير اسم ولا رقم.
   */
  async tasksCard(ctx: CardContext) {
    const em = this.ds.manager
    if (!(await tasksTableReady(em))) return { available: false, open: 0, overdue: 0, assignees: [] }
    const params: unknown[] = [ctx.today]
    const inScope = andBranchScopeSql('t.branchId', ctx.scope, params)
    const clauses: string[] = []
    if (ctx.filter.branchId !== null) clauses.push(`t.branchId = @${params.push(ctx.filter.branchId) - 1}`)
    if (ctx.filter.departmentIds !== null || ctx.filter.teamId !== null) {
      const place = orgFilterSql({ branch: 'e.branchId', department: 'e.departmentId', team: 'e.teamId' }, { ...ctx.filter, branchId: null }, params)
      const readerScope = branchScopeSql('e.branchId', ctx.scope, params)
      clauses.push(...place, ...(readerScope ? [readerScope] : []))
    }
    const personal = (await taskExtrasReady(em)) ? `AND ${notPersonalTask('t')}` : ''
    const rows: Array<Record<string, unknown>> = await this.ds.query(
      `SELECT t.assigneeEmployeeId AS employeeId, t.assigneeRole AS role, e.fullName AS fullName, e.branchId AS employeeBranchId, COUNT(*) AS openCount,
              SUM(CASE WHEN t.dueDate IS NOT NULL AND t.dueDate < @0 THEN 1 ELSE 0 END) AS overdue
       FROM tasks t LEFT JOIN employees e ON e.id = t.assigneeEmployeeId
       WHERE t.status IN (${TASK_OPEN_STATUSES.map(status => `'${status}'`).join(', ')}) ${inScope} ${clauses.map(clause => `AND ${clause}`).join(' ')} ${personal}
       GROUP BY t.assigneeEmployeeId, t.assigneeRole, e.fullName, e.branchId`,
      params
    )
    // المسؤول اللي فرعه الحالي برّه نطاق القارئ (أو صفه مش موجود): من غير اسم ولا رقم، وكلهم في صف واحد
    const hidden = (row: Record<string, unknown>) => ctx.scope !== null && row.employeeId !== null && row.employeeId !== undefined
      && (row.employeeBranchId === null || row.employeeBranchId === undefined || !inBranchScope(ctx.scope, Number(row.employeeBranchId)))
    const outside = rows.filter(hidden)
    const assignees = rows.filter(row => !hidden(row)).map(row => ({
      employeeId: num(row.employeeId), role: (row.role as string | null) ?? null,
      name: row.employeeId !== null && row.employeeId !== undefined ? String(row.fullName ?? `موظف #${row.employeeId}`)
        : (TASK_ROLE_LABELS as Record<string, string>)[String(row.role)] ?? String(row.role ?? 'من غير مسؤول'),
      open: Number(row.openCount ?? 0), overdue: Number(row.overdue ?? 0),
    })).concat(outside.length ? [{ employeeId: null, role: null, name: 'موظفين برّه نطاقك',
      open: outside.reduce((sum, row) => sum + Number(row.openCount ?? 0), 0), overdue: outside.reduce((sum, row) => sum + Number(row.overdue ?? 0), 0) }] : []).sort((a, b) => b.overdue - a.overdue || b.open - a.open || byArabic(a.name, b.name))
    return {
      available: true, open: assignees.reduce((sum, row) => sum + row.open, 0), overdue: assignees.reduce((sum, row) => sum + row.overdue, 0),
      people: assignees.length, assignees: assignees.slice(0, 10),
    }
  }

  // ===== كارت 7: الإضافي =====

  /**
   * ساعات شهر الرواتب الجاري بالقسم — مؤشر «ساعات الإضافي» في القاموس بالحرف (الساعات المستحقة في المعتمد والمصروف، بنطاق فرع
   * الموظف وفلتره)، فمجموع الأقسام = رقم المؤشر في التقرير. المبلغ (amountSnapshot للمعتمد والمصروف — عمود «قيمة المعتمد» في تقرير
   * الإضافي) لصاحب صلاحية الرواتب بس، ولكل عملة لوحدها.
   */
  async overtimeCard(ctx: CardContext) {
    const money = await this.moneyAllowed(ctx.user)
    const range = await this.moduleRef.get(FinancialReportService, { strict: false }).periodOf()
    const counted = OVERTIME_COUNTED_STATUSES.map(status => `'${status}'`).join(', ')
    const params: unknown[] = [range.startDate, range.endDate]
    const rows: Array<Record<string, unknown>> = await this.ds.query(
      `SELECT e.branchId AS branchId, e.departmentId AS departmentId,
              SUM(CASE WHEN o.status IN (${counted}) THEN o.payableHours ELSE 0 END) AS hours,
              SUM(CASE WHEN o.status IN (${counted}) THEN 1 ELSE 0 END) AS entries,
              SUM(CASE WHEN o.status IN ('DETECTED', 'SUBMITTED') THEN 1 ELSE 0 END) AS pendingEntries${
                money ? `, CONVERT(varchar(40), SUM(CASE WHEN o.status IN (${counted}) THEN o.amountSnapshot END)) AS amount` : ''}
       FROM overtime_entries o JOIN employees e ON e.id = o.employeeId
       WHERE o.date BETWEEN @0 AND @1 AND o.status IN (${counted}, 'DETECTED', 'SUBMITTED')
         ${andBranchScopeSql('e.branchId', ctx.scope, params)} ${this.orgSql('e', ctx.filter, params)}
       GROUP BY e.branchId, e.departmentId`,
      params
    )
    const currencyOf = money ? await readBranchCurrencyOf(this.ds.manager) : null
    const units = new Map<number | null, { hours: number; entries: number; amounts: Map<string, number> }>()
    const totals = new Map<string, number>()
    let hours = 0, entries = 0, pendingEntries = 0
    for (const row of rows) {
      const unitId = visiblePlacement(ctx.tree, { branchId: num(row.branchId), departmentId: num(row.departmentId), teamId: null }).unitId
      const cell = units.get(unitId) ?? { hours: 0, entries: 0, amounts: new Map<string, number>() }
      cell.hours += Number(row.hours ?? 0)
      cell.entries += Number(row.entries ?? 0)
      hours += Number(row.hours ?? 0)
      entries += Number(row.entries ?? 0)
      pendingEntries += Number(row.pendingEntries ?? 0)
      if (currencyOf && row.amount !== null && row.amount !== undefined) {
        const currency = currencyOf(num(row.branchId))
        cell.amounts.set(currency, (cell.amounts.get(currency) ?? 0) + Number(row.amount))
        totals.set(currency, (totals.get(currency) ?? 0) + Number(row.amount))
      }
      units.set(unitId, cell)
    }
    const amountsOf = (map: Map<string, number>) => [...map.entries()].sort(([a], [b]) => a.localeCompare(b)).map(([currency, amount]) => ({ currency, amount: round2(amount) }))
    return {
      period: range.period, from: range.startDate, to: range.endDate, hours: round2(hours), entries, pendingEntries,
      // المبلغ لصاحب صلاحية الرواتب بس — غيره الحقل مش موجود في الرد (مش مخفي في الواجهة)
      ...(money ? { amounts: amountsOf(totals) } : {}),
      byUnit: [...units.entries()].filter(([, cell]) => cell.entries > 0).map(([unitId, cell]) => ({
        id: unitId, name: unitId === null ? 'من غير قسم' : ctx.tree.units.get(unitId)!.name, hours: round2(cell.hours), entries: cell.entries,
        ...(money ? { amounts: amountsOf(cell.amounts) } : {}),
      })).sort((a, b) => b.hours - a.hours || byArabic(a.name, b.name)),
    }
  }

  // ===== كارت 8: الرواتب =====

  /**
   * لصاحب صلاحية الرواتب بس: مسيرات الفترة الجارية بحالتها (قايمة المسير نفسها — المسيرات اللي كلها جوه نطاق الحساب)، والمستحق لحد
   * امبارح من المعاينة الحيّة (B1.14) لكل عملة، وتنبيهات قبل الاعتماد.
   */
  async payrollCard(ctx: CardContext) {
    const live = await this.moduleRef.get(PayrollLiveService, { strict: false }).preview(ctx.user)
    const filtered = !orgFilterIsEmpty(ctx.filter)
    const inFilter = new Set(ctx.people.map(person => person.id))
    const liveRows = filtered ? live.rows.filter(row => inFilter.has(row.employeeId)) : live.rows
    const sums = new Map<string, { employees: number; earned: number; overtime: number; deductions: number; estimatedNet: number }>()
    for (const row of liveRows) {
      const cell = sums.get(row.currency) ?? { employees: 0, earned: 0, overtime: 0, deductions: 0, estimatedNet: 0 }
      cell.employees += 1; cell.earned += row.earned; cell.overtime += row.overtime; cell.deductions += row.deductions; cell.estimatedNet += row.estimatedNet
      sums.set(row.currency, cell)
    }
    const incomplete = liveRows.filter(row => !row.complete).length
    const runs = (await this.moduleRef.get(PayrollService, { strict: false }).list(ctx.user)).filter(run => run.period === live.period)
    const open = runs.filter(run => run.status === 'DRAFT' || run.status === 'CALCULATED')
    const alerts: Array<{ tone: 'red' | 'yellow'; text: string; count: number }> = []
    if (open.length) {
      const [row] = await this.ds.query(
        `SELECT COUNT(*) AS total FROM payroll_items WHERE netPay <= 0 AND runId IN (${open.map((_, index) => `@${index}`).join(', ')})`, open.map(run => run.id))
      if (Number(row?.total ?? 0) > 0) alerts.push({ tone: 'red', text: 'موظفين صافيهم صفر أو بالسالب في مسير مستني اعتماد', count: Number(row.total) })
    }
    const belowMinimum = (await this.moduleRef.get(MinimumWageAlertService, { strict: false }).report(ctx.user)).employees
      .filter(row => !filtered || inFilter.has(row.employeeId)).length
    if (belowMinimum > 0) alerts.push({ tone: 'red', text: 'موظفين إجماليهم تحت الحد الأدنى للأجور', count: belowMinimum })
    if (live.available && incomplete > 0) alerts.push({ tone: 'yellow', text: 'موظفين مستحقهم التقديري لسه ناقص أيام', count: incomplete })
    const calculated = runs.filter(run => run.status === 'CALCULATED').length
    if (calculated > 0) alerts.push({ tone: 'yellow', text: 'مسيرات محسوبة مستنية اعتماد', count: calculated })
    return {
      period: live.period, from: live.startDate, to: live.endDate, upTo: live.upTo, note: live.note,
      runs: runs.map(run => ({ id: run.id, name: run.name ?? null, status: run.status, runType: run.runType ?? 'REGULAR', totalNet: Number(run.totalNet ?? 0) })),
      // المسيرات بنطاق الحساب كله: المسير مابيتقسمش على إدارة أو قسم
      runsFiltered: false,
      accrued: {
        available: live.available, employees: liveRows.length, incomplete,
        byCurrency: [...sums.entries()].sort(([a], [b]) => a.localeCompare(b)).map(([currency, cell]) => ({
          currency, employees: cell.employees, earned: round2(cell.earned), overtime: round2(cell.overtime), deductions: round2(cell.deductions),
          estimatedNet: round2(cell.estimatedNet),
        })),
      },
      alerts,
    }
  }

  // ===== كارت 9: الاتجاهات =====

  /**
   * نسبة الحضور والتأخير والغياب آخر 30 يوم لحد اليوم المختار، يوم بيوم، وللمستوى اللي تحت المجموعة (إدارة أو قسم). المقام مقام مؤشر
   * «نسبة الغياب» في القاموس بالحرف: أيام العمل المطلوبة (حضور + تأخير + انصراف مبكر + غياب)، من غير غياب برّه فترة الخدمة.
   * B-ADD.20: النافذة من فلتر اللوحة (7 أو 30 أو 90 يوم) — من غيرها 30 زي الأول.
   */
  async trendsCard(ctx: CardContext, date: string, rawGroup: unknown, rawDays?: unknown) {
    const window = trendDaysOf(rawDays)
    if (window === null) throw new BadRequestException('الفترة المتاحة: 7 أو 30 أو 90 يوم')
    const group = this.groupOf(ctx, rawGroup)
    const from = dayAfter(date, -(window - 1))
    const params: unknown[] = [from, date]
    // مع اختيار إدارة أو قسم أو فريق: مكان الموظف الحالي بيتقري جوه نطاق القارئ بس (CR21-B01) — موظف اتنقل لفرع برّه النطاق مايطابقش
    // قسمه الجديد، فالنسبة ماتكشفش تنظيم فرع تاني
    const placedInScope = ctx.filter.departmentIds !== null || ctx.filter.teamId !== null ? andBranchScopeSql('e.branchId', ctx.scope, params) : ''
    const rows: Array<Record<string, unknown>> = await this.ds.query(
      `SELECT CONVERT(varchar(10), a.date, 23) AS d, e.branchId AS branchId, e.departmentId AS departmentId, e.teamId AS teamId,
              SUM(CASE WHEN a.status IN ('present', 'early_leave') THEN 1 ELSE 0 END) AS onTime,
              SUM(CASE WHEN a.status = 'late' THEN 1 ELSE 0 END) AS late,
              SUM(CASE WHEN a.status = 'absent' THEN 1 ELSE 0 END) AS absent
       FROM attendance_days a JOIN employees e ON e.id = a.employeeId
       WHERE a.date BETWEEN @0 AND @1 AND a.status IN ('present', 'late', 'early_leave', 'absent')
         ${andBranchScopeSql('a.branchId', ctx.scope, params)} ${placedInScope}
         ${orgFilterSql({ branch: 'a.branchId', department: 'e.departmentId', team: 'e.teamId' }, ctx.filter, params).map(clause => `AND ${clause}`).join(' ')}
         AND NOT (a.status = 'absent' AND ${absenceOutsideServiceSql('a', 'e')})
       GROUP BY a.date, e.branchId, e.departmentId, e.teamId`,
      params
    )
    type Cell = { onTime: number; late: number; absent: number }
    const empty = (): Cell => ({ onTime: 0, late: 0, absent: 0 })
    const add = (cell: Cell, row: Record<string, unknown>) => {
      cell.onTime += Number(row.onTime ?? 0); cell.late += Number(row.late ?? 0); cell.absent += Number(row.absent ?? 0)
    }
    const rates = (cell: Cell) => {
      const required = cell.onTime + cell.late + cell.absent
      return { required, attendance: percent(cell.onTime + cell.late, required), late: percent(cell.late, required), absence: percent(cell.absent, required) }
    }
    const placed = rows.map(row => ({ row, place: { branchId: num(row.branchId), departmentId: num(row.departmentId), teamId: num(row.teamId) } }))
      .filter(item => !group || inCardGroup(ctx.tree, group, item.place))
    const byDay = new Map<string, Cell>(), total = empty()
    for (const { row } of placed) {
      const cell = byDay.get(String(row.d)) ?? empty()
      add(cell, row); add(total, row)
      byDay.set(String(row.d), cell)
    }
    const days: Array<{ date: string } & ReturnType<typeof rates>> = []
    for (let day = from; day <= date; day = dayAfter(day, 1)) days.push({ date: day, ...rates(byDay.get(day) ?? empty()) })
    const units = cardGroupChildren(ctx.tree, group).map(child => {
      const target = parseCardGroup(child.group)!, cell = empty()
      for (const item of placed) if (inCardGroup(ctx.tree, target, item.place)) add(cell, item.row)
      const rate = rates(cell)
      return { group: child.group, name: child.name, level: child.level, expandable: child.expandable, ...rate, tone: toneOfRate(rate.absence, 5, 10) }
    }).filter(unit => unit.required > 0).sort((a, b) => (b.absence ?? 0) - (a.absence ?? 0) || byArabic(a.name, b.name))
    const summary = rates(total)
    return { from, to: date, window, group: this.groupLabel(ctx, group), summary: { ...summary, tone: toneOfRate(summary.absence, 5, 10) }, days, units }
  }
}
