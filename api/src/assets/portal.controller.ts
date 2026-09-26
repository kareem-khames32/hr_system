import {
  Body,
  BadRequestException,
  Controller,
  Delete,
  Get,
  NotFoundException,
  Param,
  Patch,
  Query,
  UseGuards,
} from '@nestjs/common'
import { InjectRepository } from '@nestjs/typeorm'
import { ArrayMaxSize, IsArray, IsOptional, IsString, MaxLength } from 'class-validator'
import { Between, In, IsNull, LessThanOrEqual, MoreThanOrEqual, Not, Repository } from 'typeorm'
import type { JwtPayload } from '../auth/auth.service'
import { branchIdIn, branchScopeOf, CurrentUser, inBranchScope, JwtAuthGuard, RolesGuard, userHasPerm } from '../auth/guards'
import { AttendanceDay } from '../attendance/attendance.entities'
import { AttendanceService } from '../attendance/attendance.service'
import { currentHolidayAudienceMember, describeHolidayAudience, holidayAudienceMatches, holidayAudienceNames,
  parseHolidayAudienceColumn } from '../attendance/holiday-audience'
import type { HolidayAudience } from '../attendance/holiday-audience'
import { Employee } from '../employees/employee.entity'
import { Branch } from '../org/entities/branch.entity'
import { RequestApproval } from '../requests/entities/request-approval.entity'
import { Request } from '../requests/entities/request.entity'
import { RequestType } from '../requests/entities/request-type.entity'
import { Leave } from '../requests/entities/leave.entities'
import { saveInSqlBatches } from '../common/sql-batches'
import { RequestsService } from '../requests/requests.service'
import { LeaveAttachmentDeadlineJob } from '../requests/leave-attachment-deadline.job'
import { EmployeeDocument, PublicHoliday } from './assets.entities'
import { NotificationRead } from './notification-read.entity'
import { leaveView } from '../common/leave-contract'

// تصنيف صريح لكل إشعار — الواجهة تبني فلاترها من التصنيفات الموجودة فعلاً
type NotificationCategory = 'request' | 'approval' | 'leave' | 'attendance' | 'contract' | 'document'

interface NotificationItem {
  id: string
  kind: string
  category: NotificationCategory
  title: string
  body: string
  at: Date | string
  link: string
  // عناصر الإشعار المجمّع (عدّاد): عنصر لم يره المستخدم يرجّعه غير مقروء — لا تُرسل للواجهة
  keys?: string[]
}

// PATCH /notifications/read — ids محددة، وبدونها كل الإشعارات الظاهرة
class MarkNotificationsReadDto {
  @IsOptional()
  @IsArray()
  @ArrayMaxSize(100)
  @IsString({ each: true })
  @MaxLength(150, { each: true })
  ids?: string[]
}

// أقصى عدد إشعارات يرجع للجرس وشاشة الإشعارات
const NOTIFICATIONS_LIMIT = 15

// التقويم الموحّد + الإشعارات المشتقة (بلا جدول إشعارات — من الأحداث الفعلية؛
// المحفوظ حالة القراءة/الحذف لكل مستخدم فقط في notification_reads)
@UseGuards(JwtAuthGuard, RolesGuard)
@Controller()
export class PortalController {
  constructor(
    @InjectRepository(PublicHoliday)
    private readonly holidays: Repository<PublicHoliday>,
    @InjectRepository(Leave) private readonly leaves: Repository<Leave>,
    @InjectRepository(Employee)
    private readonly employees: Repository<Employee>,
    @InjectRepository(Request) private readonly requests: Repository<Request>,
    @InjectRepository(RequestType)
    private readonly requestTypes: Repository<RequestType>,
    @InjectRepository(RequestApproval)
    private readonly approvals: Repository<RequestApproval>,
    @InjectRepository(AttendanceDay)
    private readonly attendanceDays: Repository<AttendanceDay>,
    private readonly requestsService: RequestsService,
    @InjectRepository(Branch) private readonly branches: Repository<Branch>,
    @InjectRepository(NotificationRead)
    private readonly notificationReads: Repository<NotificationRead>,
    private readonly attendance: AttendanceService,
    private readonly leaveAttachments: LeaveAttachmentDeadlineJob
  ) {}

  // ===== التقويم: عطلات + إجازات معتمدة في الشهر =====
  @Get('calendar')
  async calendar(@CurrentUser() user: JwtPayload, @Query('month') month: string, @Query('from') rangeFrom?: string, @Query('to') rangeTo?: string) {
    const today = new Date()
    const m = month || `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}`
    if (!/^\d{4}-(0[1-9]|1[0-2])$/.test(m)) throw new BadRequestException('الشهر غير صالح')
    const monthStart = `${m}-01`
    const monthEnd = `${m}-${String(new Date(Number(m.slice(0, 4)), Number(m.slice(5, 7)), 0).getDate()).padStart(2, '0')}`
    const validDate = (value: string) => /^\d{4}-\d{2}-\d{2}$/.test(value) && Number.isFinite(Date.parse(value)) && new Date(value).toISOString().slice(0, 10) === value
    const from = rangeFrom ?? monthStart
    const to = rangeTo ?? monthEnd
    if ((rangeFrom === undefined) !== (rangeTo === undefined) || !validDate(from) || !validDate(to) || from > to || (Date.parse(to) - Date.parse(from)) / 86400000 > 61 || to < monthStart || from > monthEnd) {
      throw new BadRequestException('اختر نطاقًا صحيحًا لا يتجاوز 62 يومًا ويتقاطع مع الشهر المطلوب')
    }
    const scope = branchScopeOf(user)
    const emps = await this.employees.find({
      where: scope !== null ? { branchId: branchIdIn(scope) } : {},
    })
    const empById = new Map(emps.map((e) => [e.id, e.fullName]))

    // عطلات دولة فرع المستخدم فقط — كما يحسبها الحضور (فرع بلا دولة = الكل)
    const myBranch = user.branchId
      ? await this.branches.findOne({ where: { id: user.branchId } })
      : null
    const country = String(myBranch?.country ?? '').trim().toUpperCase()
    const allHolidays = (await this.holidays.find({ order: { date: 'ASC' } })).filter(
      (h) => !country || !h.country || h.country.trim().toUpperCase() === country
    )
    // «تسري على» (ترحيل 070): العطلة المخصصة بتظهر لمين تخصه (بمكانه الحالي — عرض بس، حساب الأيام من التقويم المؤرخ)،
    // واللي معاه «تقويم النطاق» بيشوف كمان المخصصة لفروع نطاقه بوصف «تسري على» (الفرع/القسم/الفريق بالاسم والموظفين
    // بالعدد بس). العمود الخام بأرقام الموظفين مابيطلعش
    const viewAll = userHasPerm(user, 'calendar.view_all')
    const member = await currentHolidayAudienceMember(this.holidays.manager, user.employeeId)
    const names = await holidayAudienceNames(this.holidays.manager)
    const monthHolidays = allHolidays.filter(
      (h) => h.date <= monthEnd && (h.endDate || h.date) >= monthStart && h.date <= to && (h.endDate || h.date) >= from
    ).flatMap((h) => {
      let audience: HolidayAudience | null
      try { audience = parseHolidayAudienceColumn(h.audience ?? null, (message) => { throw new Error(message) }) } catch { return [] }
      if (audience && !holidayAudienceMatches(audience, member) && !(viewAll && inBranchScope(scope, audience.branchId))) return []
      return [{ id: h.id, name: h.name, date: h.date, endDate: h.endDate ?? null, country: h.country ?? null, targeted: !!audience,
        audienceText: describeHolidayAudience(audience, names) }]
    })
    const allLeaves = await this.leaves.find({
      where:
        scope !== null
          ? { status: 'APPROVED', employeeId: In(emps.map((e) => e.id)) }
          : { status: 'APPROVED' },
    })
    const visibleLeaves = userHasPerm(user, 'calendar.view_all')
      ? allLeaves
      : allLeaves.filter((l) => l.employeeId === user.employeeId)
    const monthLeaves = visibleLeaves.filter(
      (l) => l.fromDate <= monthEnd && l.toDate >= monthStart && l.fromDate <= to && l.toDate >= from
    )
    // أيام الإجازة داخل الشهر المعروض فقط: الممتدة لشهر آخر تُقصّ على حدوده وتُعدّ
    // أيام عملها بحاسبة التقديم نفسها (ويك إند الموظف + العطلات الرسمية)
    const leaves: Array<Omit<Leave, 'toJSON'> & { employeeName: string; daysInMonth: number; daysInRange: number }> = []
    const daysWithin = async (leave: Leave, start: string, end: string) => {
      const clippedFrom = leave.fromDate < start ? start : leave.fromDate
      const clippedTo = leave.toDate > end ? end : leave.toDate
      if (clippedFrom === leave.fromDate && clippedTo === leave.toDate) return Number(leave.days)
      const days = await this.attendance.workingDaysForEmployee(leave.employeeId, clippedFrom, clippedTo)
      return days.working * (leave.period === 'MORNING' || leave.period === 'EVENING' ? 0.5 : 1)
    }
    for (const l of monthLeaves) {
      const daysInMonth = await daysWithin(l, monthStart, monthEnd)
      const daysInRange = from === monthStart && to === monthEnd ? daysInMonth : await daysWithin(l, from, to)
      leaves.push({
        ...leaveView(l),
        employeeName: empById.get(l.employeeId) ?? `#${l.employeeId}`,
        daysInMonth,
        daysInRange,
      })
    }
    const weekendDays = await this.attendance.calendarWeekendDays(user.employeeId, user.branchId)
    return { month: m, from, to, holidays: monthHolidays, leaves, weekendDays }
  }

  // ===== الإشعارات المشتقة للمستخدم الحالي =====
  // read: قرأها المستخدم (محفوظة في notification_reads)، والمحذوف من قائمته لا يرجع
  @Get('notifications')
  async notifications(@CurrentUser() user: JwtPayload) {
    const items = await this.buildNotifications(user)
    const states = await this.readStates(user, items)
    return items
      .filter((n) => !states.get(n.id)?.dismissed)
      .slice(0, NOTIFICATIONS_LIMIT)
      .map((n) => ({
        id: n.id,
        kind: n.kind,
        category: n.category,
        title: n.title,
        body: n.body,
        at: n.at,
        link: n.link,
        read: !!states.get(n.id)?.read,
      }))
  }

  // تحديد كمقروء: ids محددة أو (بدونها) كل الإشعارات الظاهرة — مفتاح لا يخص
  // المستخدم حالياً يُتجاهل (لا صفوف لإشعارات غير قائمة)
  @Patch('notifications/read')
  async markNotificationsRead(
    @CurrentUser() user: JwtPayload,
    @Body() dto: MarkNotificationsReadDto
  ) {
    const items = await this.buildNotifications(user)
    const states = await this.readStates(user, items)
    const wanted = dto.ids?.length ? new Set(dto.ids) : null
    const targets = items.filter(
      (n) =>
        !states.get(n.id)?.dismissed &&
        !states.get(n.id)?.read &&
        (!wanted || wanted.has(n.id))
    )
    await this.saveStates(user, targets, false)
    return { ok: true, updated: targets.length }
  }

  // حذف إشعار من قائمة المستخدم (إخفاء) — المجمّع يظهر ثانيةً مع أول عنصر جديد فيه
  @Delete('notifications/:id')
  async dismissNotification(@CurrentUser() user: JwtPayload, @Param('id') id: string) {
    const item = (await this.buildNotifications(user)).find((n) => n.id === id)
    if (!item) throw new NotFoundException('الإشعار غير موجود أو لم يعد قائماً')
    await this.saveStates(user, [item], true)
    return { ok: true }
  }

  // حالة كل إشعار للمستخدم — المجمّع فيه عنصر لم يُرَ = غير مقروء وظاهر من جديد
  private async readStates(user: JwtPayload, items: NotificationItem[]) {
    const out = new Map<string, { read: boolean; dismissed: boolean }>()
    if (items.length === 0) return out
    const rows = await this.notificationReads.find({
      where: { userId: user.sub, notificationId: In(items.map((n) => n.id)) },
    })
    const byId = new Map(rows.map((r) => [r.notificationId, r]))
    for (const n of items) {
      const row = byId.get(n.id)
      if (!row) continue
      let seen: unknown = []
      try {
        seen = JSON.parse(row.seenKeys ?? '[]')
      } catch {
        /* لقطة تالفة = لا عناصر مرئية */
      }
      const seenSet = new Set(Array.isArray(seen) ? seen.map(String) : [])
      const fresh = (n.keys ?? []).some((k) => !seenSet.has(k))
      out.set(n.id, { read: !fresh, dismissed: !!row.dismissedAt && !fresh })
    }
    return out
  }

  // يحفظ القراءة/الحذف ولقطة عناصر المجمّع — إعادة مرة لو سبق طلبٌ متزامن بإدراج نفس المفتاح
  private async saveStates(user: JwtPayload, targets: NotificationItem[], dismiss: boolean) {
    if (targets.length === 0) return
    for (let attempt = 0; ; attempt++) {
      const existing = await this.notificationReads.find({
        where: { userId: user.sub, notificationId: In(targets.map((n) => n.id)) },
      })
      const byId = new Map(existing.map((r) => [r.notificationId, r]))
      const now = new Date()
      const rows = targets.map((n) => {
        const row =
          byId.get(n.id) ??
          this.notificationReads.create({ userId: user.sub, notificationId: n.id })
        row.readAt = now
        row.dismissedAt = dismiss ? now : null
        row.seenKeys = n.keys ? JSON.stringify(n.keys) : null
        return row
      })
      try {
        // «تعليم الكل» ممكن يبقى مئات الصفوف: على دفعات تحت حد SQL Server (2,100 قيمة للجملة)
        await saveInSqlBatches(this.notificationReads, rows)
        return
      } catch (e) {
        if (attempt >= 1) throw e
      }
    }
  }

  // الإشعارات الحالية للمستخدم (مرتبة بالأحدث) — بلا حالة قراءة
  private async buildNotifications(user: JwtPayload): Promise<NotificationItem[]> {
    const items: NotificationItem[] = []

    // 1) قرارات على طلباتي
    if (user.employeeId) {
      const myRequests = await this.requests.find({
        where: { requesterId: user.employeeId },
        order: { createdAt: 'DESC' },
        take: 50,
      })
      const reqById = new Map(myRequests.map((r) => [r.id, r]))
      if (myRequests.length > 0) {
        const acts = await this.approvals.find({
          where: { requestId: In(myRequests.map((r) => r.id)) },
          order: { actedAt: 'DESC' },
          take: 20,
        })
        const actLabel: Record<string, string> = {
          APPROVE: 'تمت الموافقة على',
          REJECT: 'تم رفض',
          RETURN: 'أُعيد لاستكمال معلومات',
          APPROVED: 'تمت الموافقة على',
          REJECTED: 'تم رفض',
          RETURNED_FOR_INFO: 'أُعيد لاستكمال معلومات',
          ESCALATED: 'تم تصعيد',
          CANCELLED: 'ألغى النظام', // إلغاء آلي (approverId = 0)
          EXECUTION_FAILED: 'تعذّر تنفيذ', // تنفيذ مجدول فشل — السبب في التعليق
        }
        // الاسم العربي للنوع — الكود لا يظهر للمستخدم أبداً
        const typeCodes = [...new Set(myRequests.map((r) => r.definitionCode || r.typeCode))]
        const typeRows = typeCodes.length
          ? await this.requestTypes.find({ where: { code: In(typeCodes) } })
          : []
        const nameByCode = new Map(typeRows.map((t) => [t.code, t.nameAr]))
        for (const a of acts) {
          const req = reqById.get(a.requestId)
          const typeName = req
            ? (nameByCode.get(req.definitionCode || req.typeCode) ?? 'طلب')
            : 'طلب'
          items.push({
            id: `act-${a.id}`,
            category: 'request',
            kind: ['APPROVE', 'APPROVED'].includes(a.action) ? 'success' : ['REJECT', 'REJECTED'].includes(a.action) ? 'error' : 'warning',
            title: `${actLabel[a.action] ?? a.action} طلبك`,
            body: `${typeName}${a.comment ? ` — ${a.comment}` : ''}`,
            at: a.actedAt,
            link: '/requests',
          })
        }
      }

      // 1ب) إجازة أُلغيت من الموارد البشرية (إلغاء مباشر — بلا طلب)
      const revoked = await this.leaves.find({
        where: {
          employeeId: user.employeeId,
          status: 'CANCELLED',
          revokedByUserId: Not(IsNull()),
        },
        order: { revokedAt: 'DESC' },
        take: 10,
      })
      for (const lv of revoked) {
        if (!lv.revokedAt) continue
        items.push({
          id: `leave-revoked-${lv.id}`,
          category: 'leave',
          kind: 'warning',
          title: 'أُلغيت إجازتك',
          body: `تم إلغاء إجازتك (${lv.fromDate} إلى ${lv.toDate}) بمعرفة الموارد البشرية — أُعيد رصيدك`,
          at: lv.revokedAt,
          link: '/my/leaves',
        })
      }

      // 1ج) الخصومات المصنفة (C2 / DD-08 قاعدة 4): الموظف يُخطر بكل تغيير حالة على خصم عليه
      const deductionEvents: Array<{ id: number; requestId: number; eventType: string; createdAt: Date; reason: string | null; typeSnapshot: string | null }> =
        await this.employees.manager.query(`SELECT TOP (20) e.[id], e.[requestId], e.[eventType], e.[createdAt], e.[reason], r.[typeSnapshot]
          FROM [deduction_request_events] e INNER JOIN [deduction_requests] r ON r.[id]=e.[requestId]
          WHERE r.[employeeId]=@0 AND e.[eventType] IN ('SUBMITTED','APPROVED','REJECTED','CANCELLED','REVERSED','CARRY_FORWARD','CARRY_SUSPENDED','CARRY_RESUMED','CARRY_DROPPED','OBJECTION_RESPONDED')
          ORDER BY e.[id] DESC`, [user.employeeId])
      const deductionTitles: Record<string, [string, NotificationItem['kind']]> = {
        SUBMITTED: ['خصم مقترح عليك قيد الاعتماد', 'warning'], APPROVED: ['اعتُمد خصم عليك', 'warning'], REJECTED: ['رُفض خصم كان مقترحًا عليك', 'success'],
        CANCELLED: ['أُلغي خصم عليك', 'success'], REVERSED: ['عُكس خصم عليك بقيد موجب', 'success'], CARRY_FORWARD: ['رُحّل جزء من خصم عليك للمسير التالي', 'info'],
        CARRY_SUSPENDED: ['عُلّق قسط خصم عليك بانتظار قرار الموارد البشرية', 'info'], CARRY_RESUMED: ['استُؤنف تحصيل قسط خصم عليك', 'warning'],
        CARRY_DROPPED: ['أُسقط قسط خصم عليك', 'success'], OBJECTION_RESPONDED: ['رُدّ على اعتراضك على خصم', 'info'],
      }
      for (const event of deductionEvents) {
        let typeName = 'خصم مصنف'
        try { typeName = JSON.parse(event.typeSnapshot ?? '{}').nameAr || typeName } catch { /* لقطة غير صالحة: الاسم العام */ }
        const [title, kind] = deductionTitles[event.eventType] ?? ['تحديث على خصم عليك', 'info']
        items.push({ id: `deduction-${event.id}`, category: 'request', kind, title, body: `${typeName} #${event.requestId}${event.reason ? ` — ${event.reason}` : ''}`.slice(0, 300),
          at: event.createdAt, link: '/my/deductions' })
      }
      // 1د) الإعفاء المالي (الخطوة 26 / EX-03 قاعدة 5): الموظف يُخطر بكل إعفاء عليه — المنح والاعتماد والتطبيق في المسير والإلغاء
      const exemptionEvents: Array<{ id: number; exemptionId: number; eventType: string; createdAt: Date; period: string }> =
        await this.employees.manager.query(`SELECT TOP (20) e.[id], e.[exemptionId], e.[eventType], e.[createdAt], x.[period]
          FROM [payroll_financial_exemption_events] e INNER JOIN [payroll_financial_exemptions] x ON x.[id]=e.[exemptionId]
          WHERE e.[employeeId]=@0 AND e.[eventType] IN ('GRANTED','APPROVED','APPLIED','REVOKED','REJECTED')
          ORDER BY e.[id] DESC`, [user.employeeId])
      const exemptionTitles: Record<string, [string, NotificationItem['kind']]> = {
        GRANTED: ['مُنح لك إعفاء مالي من خصم', 'success'], APPROVED: ['اعتُمد إعفاء مالي لك', 'success'], APPLIED: ['طُبق إعفاء مالي لك في مسير معتمد', 'success'],
        REVOKED: ['أُلغي إعفاء مالي كان لك قبل اعتماد المسير', 'warning'], REJECTED: ['رُفض إعفاء مالي كان مقترحًا لك', 'info'],
      }
      for (const event of exemptionEvents) {
        const [title, kind] = exemptionTitles[event.eventType] ?? ['تحديث على إعفاء مالي لك', 'info']
        items.push({ id: `exemption-${event.id}`, category: 'request', kind, title, body: `الإعفاء #${event.exemptionId} — مسير ${event.period}`, at: event.createdAt, link: '/my/exemptions' })
      }
    }

    // 2) تعارض بصمة×إجازة (آخر 7 أيام) — لمن يملك قرار الإلغاء
    const scope = branchScopeOf(user)
    // Reminders derive from current records on every read, including the first read after
    // downtime. Stable IDs include the expiry date: renewal removes the old reminder.
    const horizon = new Date(); horizon.setDate(horizon.getDate() + 60)
    const ymd = (d: Date) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
    const today = ymd(new Date())
    const canViewEmployees = userHasPerm(user, 'employees.view')
    const contractWhere: Record<string, unknown> = { contractEnd: LessThanOrEqual(ymd(horizon)), isActive: true, status: Not(In(['archived', 'terminated'])) }
    if (canViewEmployees) { if (scope !== null) contractWhere.branchId = branchIdIn(scope) }
    else contractWhere.id = user.employeeId || -1
    const expiringContracts = await this.employees.find({ where: contractWhere as any, order: { contractEnd: 'ASC' }, take: 5 })
    for (const emp of expiringContracts) {
      items.push({ id: `contract-expiry-${emp.id}-${emp.contractEnd}`, category: 'contract', kind: 'warning',
        title: emp.contractEnd < today ? 'عقد منتهي' : 'عقد ينتهي خلال 60 يومًا',
        body: `${emp.fullName} — تاريخ انتهاء العقد: ${emp.contractEnd}`, at: today,
        link: canViewEmployees ? `/employees/${emp.id}` : '/profile' })
    }
    const canViewDocuments = userHasPerm(user, 'documents.manage')
    const docEmployees = await this.employees.find({ where: canViewDocuments ? (scope !== null ? { branchId: branchIdIn(scope) } : {}) : { id: user.employeeId || -1 }, select: ['id', 'fullName'] })
    const documents = docEmployees.length ? await this.employees.manager.getRepository(EmployeeDocument).find({ where: {
      employeeId: In(docEmployees.map(e => e.id)), expiryDate: LessThanOrEqual(ymd(horizon)),
    }, order: { expiryDate: 'ASC' }, take: 5 }) : []
    const docNames = new Map(docEmployees.map(e => [e.id, e.fullName]))
    for (const doc of documents) {
      items.push({ id: `document-expiry-${doc.id}-${doc.expiryDate}`, category: 'document', kind: 'warning',
        title: doc.expiryDate < today ? 'مستند منتهي' : 'مستند ينتهي خلال 60 يومًا',
        body: `${docNames.get(doc.employeeId)} — مستند ينتهي بتاريخ ${doc.expiryDate}`, at: today,
        link: canViewDocuments ? '/employees/documents' : '/my/documents' })
    }
    if (userHasPerm(user, 'leaves.revoke')) {
      const since = new Date(Date.now() - 7 * 86400000)
      const sinceStr = `${since.getFullYear()}-${String(since.getMonth() + 1).padStart(2, '0')}-${String(since.getDate()).padStart(2, '0')}`
      const conflictWhere: Record<string, unknown> = {
        leaveConflict: true,
        date: MoreThanOrEqual(sinceStr),
      }
      if (scope !== null) conflictWhere.branchId = branchIdIn(scope)
      const conflicts = await this.attendanceDays.find({
        where: conflictWhere as any,
        order: { date: 'DESC' },
        take: 10,
      })
      if (conflicts.length > 0) {
        const empIds = [...new Set(conflicts.map((c) => c.employeeId))]
        const emps = await this.employees.find({ where: { id: In(empIds) } })
        const nameById = new Map(emps.map((e) => [e.id, e.fullName]))
        for (const c of conflicts) {
          items.push({
            id: `leave-conflict-${c.employeeId}-${c.date}`,
            category: 'leave',
            kind: 'warning',
            title: 'موظف بصم يوم إجازته',
            body: `${nameById.get(c.employeeId) ?? `#${c.employeeId}`} حضر يوم ${c.date} رغم إجازته المعتمدة — القرار: إلغاء الإجازة (يرجع الرصيد ويتحسب دوام) أو إبقاؤها`,
            at: c.date,
            link: '/leaves',
          })
        }
      }
    }

    // 2ب) بصمة ناقصة: يوم عمل منقضٍ ببصمة طرف واحد لا يُعدّ حضوراً — الموظف
    // يُنبَّه لتقديم تصحيح بصمة (رابط بنموذج معبّأ بالتاريخ والطرف الناقص)، ومن يدير
    // الحضور يُنبَّه بعددها في نطاقه (آخر 7 أيام)
    const weekAgo = new Date(Date.now() - 7 * 86400000)
    const weekAgoStr = `${weekAgo.getFullYear()}-${String(weekAgo.getMonth() + 1).padStart(2, '0')}-${String(weekAgo.getDate()).padStart(2, '0')}`
    if (user.employeeId) {
      const mine = await this.attendanceDays.find({
        where: {
          employeeId: user.employeeId,
          status: 'missing_punch',
          date: MoreThanOrEqual(weekAgoStr),
        },
        order: { date: 'DESC' },
        take: 5,
      })
      if (mine.length > 0) {
        // يوم له طلب تصحيح بصمة قيد المسار لا يُذكَّر به
        const corrections = await this.requests.find({
          where: {
            requesterId: user.employeeId,
            typeCode: 'PUNCH_CORRECTION',
            status: In(['DRAFT', 'SUBMITTED', 'UNDER_REVIEW', 'RETURNED_FOR_INFO', 'APPROVED', 'IN_EXECUTION']),
          },
        })
        const covered = new Set(
          corrections.map((r) => {
            try {
              return String(JSON.parse(r.payload ?? '{}').date ?? '')
            } catch {
              return ''
            }
          })
        )
        for (const d of mine) {
          if (covered.has(d.date)) continue
          items.push({
            id: `missing-punch-${d.date}`,
            category: 'attendance',
            kind: 'warning',
            title: 'بصمة ناقصة',
            body: d.checkIn
              ? `يوم ${d.date}: حضور ${d.checkIn} بلا انصراف — لا يُحسب حضوراً حتى تقدّم تصحيح بصمة`
              : `يوم ${d.date}: انصراف ${d.checkOut} بلا حضور — لا يُحسب حضوراً حتى تقدّم تصحيح بصمة`,
            at: d.date,
            link: `/requests?type=PUNCH_CORRECTION&date=${d.date}&punchType=${d.checkIn ? 'OUT' : 'IN'}`,
          })
        }
      }
    }
    if (userHasPerm(user, 'attendance.manage')) {
      const mpWhere: Record<string, unknown> = {
        status: 'missing_punch',
        date: MoreThanOrEqual(weekAgoStr),
      }
      if (scope !== null) mpWhere.branchId = branchIdIn(scope)
      const missingDays = await this.attendanceDays.find({
        where: mpWhere as any, select: ['employeeId', 'date'],
      })
      const missingCount = missingDays.length
      if (missingCount > 0) {
        items.push({
          id: 'missing-punch-scope',
          category: 'attendance',
          keys: missingDays.map(d => `${d.employeeId}|${d.date}`),
          kind: 'warning',
          title: 'بصمات ناقصة',
          body: `${missingCount} يوم عمل ببصمة طرف واحد خلال آخر 7 أيام — لا تُحسب حضوراً حتى تُصحَّح (طلب تصحيح بصمة من الموظف أو إدخال يدوي)`,
          at: new Date(),
          link: '/attendance',
        })
      }
    }

    // 3) طلبات بانتظار موافقتي (عدّاد) — نفس حساب صندوق الاعتماد: الخطوة الحالية
    // عليّ فعلاً أياً كان دوري، لا كل UNDER_REVIEW في الفرع
    const inbox = await this.requestsService.inbox(user)
    const pending = inbox.length
    if (pending > 0) {
      items.push({
        id: 'inbox-pending',
        category: 'approval',
        keys: inbox.map((r) => String(r.id)),
        kind: 'info',
        title: 'موافقات بانتظارك',
        body: `${pending} طلب بانتظار اعتمادك`,
        at: new Date(),
        link: '/approvals-inbox',
      })
    }

    // 3ب) طلب ألغاه النظام آلياً وكان بانتظار اعتمادي (آخر 7 أيام) — مثلاً أوفرتايم
    // مكتشف لم يعد حساب الحضور يبرره، فيعرف المعتمد لماذا اختفى من صندوقه
    for (const { act, request } of await this.requestsService.autoCancelledAwaiting(user, weekAgo)) {
      items.push({
        id: `auto-cancel-${act.id}`,
        category: 'approval',
        kind: 'warning',
        title: 'ألغى النظام طلباً كان بانتظار اعتمادك',
        body: `الطلب #${request.id}${act.comment ? ` — ${act.comment}` : ''}`,
        at: act.actedAt,
        link: '/approvals-inbox',
      })
    }

    // 3ج) تنفيذ مجدول تعذّر أو نقل مكرر ألغاه النظام — للموارد البشرية في نطاقها (الخطوة 7)
    for (const { act, request } of await this.requestsService.scheduledExecutionAlerts(user, weekAgo)) {
      const cancelled = act.action === 'CANCELLED'
      items.push({
        id: `scheduled-execution-${act.id}`,
        category: 'request',
        kind: cancelled ? 'warning' : 'error',
        title: cancelled ? 'ألغى النظام نقلًا مجدولًا مكررًا' : 'تعذّر تنفيذ طلب مجدول',
        body: `الطلب #${request.id}${act.comment ? ` — ${act.comment}` : ''}`,
        at: act.actedAt,
        link: request.typeCode === 'TEAM_TRANSFER' ? '/employees/transfers' : '/requests-console',
      })
    }

    // 3د) مرفق الإجازة «بعد الرجوع»: تذكير يومي بالمعلق وإخطار بالتحويل بدون راتب — للموظف وللموارد البشرية في نطاقها
    items.push(...await this.leaveAttachments.notificationsFor(user))

    return items.sort((a, b) => new Date(b.at).getTime() - new Date(a.at).getTime())
  }
}
