import { ForbiddenException, Injectable } from '@nestjs/common'
import { InjectDataSource } from '@nestjs/typeorm'
import { DataSource } from 'typeorm'
import { announcementAudienceInScope, announcementLive, announcementsReady } from '../announcements/announcement-rules'
import { localDateOf } from '../attendance/attendance.service'
import type { JwtPayload } from '../auth/auth.service'
import { andBranchScopeSql, branchScopeOf, branchScopeSql, inBranchScope, userHasPerm } from '../auth/guards'
import type { BranchScope } from '../auth/guards'
import { handledCaseIds } from '../cases/case-access'
import { casesReady } from '../cases/case-rules'
import { documentAckSchemaReady } from '../hr-documents/document-acknowledgements'
import { ModulesService } from '../modules-registry/modules.service'
import type { ModuleKey } from '../modules-registry/registry'
import { parseOrgFilter } from '../org/org-filter-params'
import { reviewsReady } from '../performance/review-rules'
import { recruitmentJobsReady } from '../recruitment/recruitment-rules'
import { executionSchemaReady } from '../requests/execution-tasks'
import { surveysReady } from '../surveys/survey-rules'
import { trainingReady } from '../training/training-rules'

// B-ADD.7 (طلب المالك 11 أكتوبر 2026): «شريط الموديولات» في لوحة الإدارة — رقم أو اتنين من كل موديول، أعداد بس (من غير أسماء ولا مبالغ).
// كل بند بيرجع لو الموديول مفعّل للحساب (ModulesService.allowedFor) والحساب معاه صلاحية شاشة إدارته، والعدّ بنفس قاعدة نطاق قايمة الشاشة
// دي بالحرف (فرع السجل، أو فرع الموظف الحالي، أو جمهور السجل) — فالرقم هنا هو عدد اللي الحساب كان هيشوفه لو فتح الشاشة.
// فلتر اللوحة: الفرع بس (لازم من نطاق الحساب)؛ الإدارة والقسم والفريق مابيتطبقوش هنا (أغلب السجلات دي مالهاش قسم).

export type StripTone = 'green' | 'yellow' | 'red' | 'blue' | 'gray'
export interface ModuleTile { key: string; title: string; href: string; stats: Array<{ label: string; value: number; tone: StripTone; suffix?: string }> }

const idsOf = (json: unknown): number[] => {
  try { const value = json ? JSON.parse(String(json)) : []; return Array.isArray(value) ? value.map(Number).filter(id => Number.isInteger(id) && id > 0) : [] } catch { return [] }
}
const day10 = (value: unknown): string | null => {
  if (value === null || value === undefined || value === '') return null
  return value instanceof Date ? localDateOf(value) : String(value).slice(0, 10)
}

@Injectable()
export class DashboardModulesService {
  constructor(@InjectDataSource() private readonly ds: DataSource, private readonly modules: ModulesService) {}

  private async count(sql: string, params: unknown[]): Promise<Record<string, number>> {
    const [row] = await this.ds.query(sql, params)
    return Object.fromEntries(Object.entries(row ?? {}).map(([key, value]) => [key, Number(value ?? 0)]))
  }

  async strip(user: JwtPayload, raw: { branchId?: unknown }): Promise<{ modules: ModuleTile[] }> {
    const own = branchScopeOf(user)
    const filter = parseOrgFilter({ branchId: raw.branchId })
    if (filter.branchId !== null && !inBranchScope(own, filter.branchId)) {
      throw new ForbiddenException(own !== null && own.length > 1 ? 'حساب الفروع يشوف لوحة فروعه بس' : 'حساب الفرع يشوف لوحة فرعه بس')
    }
    // النطاق الفعلي: الفرع المختار من فلتر اللوحة (وهو من نطاق الحساب)، وإلا نطاق الحساب
    const scope: BranchScope = filter.branchId !== null ? [filter.branchId] : own
    const em = this.ds.manager, today = localDateOf(new Date())
    const open = async (module: ModuleKey, ...perms: string[]) => perms.some(perm => userHasPerm(user, perm)) && (await this.modules.allowedFor(module, user))
    const tiles: ModuleTile[] = []

    // التوظيف: وظايف مفتوحة (منشورة أو موقوفة) بفرعها، ومرشحين في المسار (فرعهم أو من غير فرع — نفس قاعدة قايمة المرشحين)
    if (await open('recruitment', 'candidates.manage')) {
      const candidateParams: unknown[] = []
      const candidateScope = scope === null ? '' : `AND (c.[branchId] IS NULL OR ${branchScopeSql('c.[branchId]', scope, candidateParams)})`
      const candidates = await this.count(`SELECT COUNT(*) AS n FROM [candidates] c WHERE c.[stage] NOT IN (N'hired', N'rejected') ${candidateScope}`, candidateParams)
      const stats: ModuleTile['stats'] = []
      if (await recruitmentJobsReady(em)) {
        const params: unknown[] = []
        const jobs = await this.count(`SELECT COUNT(*) AS n FROM [recruitment_jobs] j WHERE j.[status] IN (N'PUBLISHED', N'PAUSED') ${andBranchScopeSql('j.[branchId]', scope, params)}`, params)
        stats.push({ label: 'وظايف مفتوحة', value: jobs.n, tone: 'blue' })
      }
      stats.push({ label: 'مرشحين في المسار', value: candidates.n, tone: 'blue' })
      tiles.push({ key: 'recruitment', title: 'التوظيف', href: '/recruitment/jobs', stats })
    }

    // الأداء: دورات تقييم مفتوحة (جوه النطاق بقاعدة قايمة الدورات)، ونسبة اللي مديرهم خلّص تقييمهم — بفرع الموظف الحالي
    if ((await open('performance', 'performance.manage')) && (await reviewsReady(em))) {
      const cycles: Array<{ id: number; branchIds: string | null }> = await this.ds.query(`SELECT [id], [branchIds] FROM [review_cycles] WHERE [status] = N'ACTIVE'`)
      const visible = cycles.filter(cycle => {
        if (scope === null) return true
        const branches = idsOf(cycle.branchIds)
        return branches.length > 0 && branches.every(id => inBranchScope(scope, id))
      }).map(cycle => Number(cycle.id))
      let total = 0, done = 0
      if (visible.length) {
        const params: unknown[] = [...visible]
        const row = await this.count(
          `SELECT COUNT(*) AS total, SUM(CASE WHEN a.[managerSubmittedAt] IS NOT NULL THEN 1 ELSE 0 END) AS done
           FROM [review_assignments] a INNER JOIN [employees] e ON e.[id] = a.[employeeId]
           WHERE a.[cycleId] IN (${visible.map((_, index) => `@${index}`).join(', ')}) ${andBranchScopeSql('e.[branchId]', scope, params)}`, params)
        total = row.total; done = row.done
      }
      tiles.push({ key: 'performance', title: 'تقييم الأداء', href: '/performance/cycles', stats: [
        { label: 'دورات مفتوحة', value: visible.length, tone: 'blue' },
        { label: `اتقيّموا من ${total}`, value: total > 0 ? Math.round((done / total) * 100) : 0, tone: total > 0 && done < total ? 'yellow' : 'green', suffix: '%' },
      ] })
    }

    // التدريب: جلسات جاية (بفرع الجلسة — جلسة «كل الشركة» لحساب من غير نطاق بس)، ومقاعد محجوزة فيها لموظفين النطاق
    if ((await open('training', 'training.manage')) && (await trainingReady(em))) {
      const sessionParams: unknown[] = [today]
      const sessions = await this.count(
        `SELECT COUNT(*) AS n FROM [training_sessions] s WHERE s.[status] = N'PLANNED' AND s.[startDate] >= @0 ${andBranchScopeSql('s.[branchId]', scope, sessionParams)}`, sessionParams)
      const seatParams: unknown[] = [today]
      const seats = await this.count(
        `SELECT COUNT(*) AS n FROM [training_enrollments] en INNER JOIN [training_sessions] s ON s.[id] = en.[sessionId] INNER JOIN [employees] e ON e.[id] = en.[employeeId]
         WHERE s.[status] = N'PLANNED' AND s.[startDate] >= @0 AND en.[status] IN (N'ENROLLED', N'ATTENDED', N'COMPLETED')
           ${andBranchScopeSql('s.[branchId]', scope, seatParams)} ${andBranchScopeSql('e.[branchId]', scope, seatParams)}`, seatParams)
      tiles.push({ key: 'training', title: 'التدريب', href: '/training', stats: [
        { label: 'جلسات جاية', value: sessions.n, tone: 'blue' }, { label: 'مسجّلين فيها', value: seats.n, tone: 'blue' },
      ] })
    }

    // السلف: عدد السلف القايمة بس (المبالغ في تقاريرها) — بصلاحية عرض الرواتب زي كل قوايم السلف
    if (await open('loans', 'payroll.view')) {
      const params: unknown[] = []
      const loans = await this.count(
        `SELECT COUNT(*) AS n FROM [loans] l INNER JOIN [employees] e ON e.[id] = l.[employeeId] WHERE l.[status] <> N'SETTLED' ${andBranchScopeSql('e.[branchId]', scope, params)}`, params)
      tiles.push({ key: 'loans', title: 'السلف', href: '/payroll/loans', stats: [{ label: 'سلف قايمة', value: loans.n, tone: 'blue' }] })
    }

    // العهد: اللي مع الموظفين، واللي مستني (تسليم أو تأكيد أو ترجيع) — بفرع الموظف الحالي
    if (await open('custody', 'custody.assign')) {
      const params: unknown[] = []
      const custody = await this.count(
        `SELECT SUM(CASE WHEN c.[status] = N'ACTIVE' THEN 1 ELSE 0 END) AS held,
                SUM(CASE WHEN c.[status] IN (N'PENDING_ACK', N'PENDING_MANAGER_CONFIRM', N'RETURN_REQUESTED') THEN 1 ELSE 0 END) AS waiting
         FROM [custody_assignments] c INNER JOIN [employees] e ON e.[id] = c.[employeeId]
         WHERE c.[status] IN (N'ACTIVE', N'PENDING_ACK', N'PENDING_MANAGER_CONFIRM', N'RETURN_REQUESTED') ${andBranchScopeSql('e.[branchId]', scope, params)}`, params)
      tiles.push({ key: 'custody', title: 'العهد', href: '/employees/custody', stats: [
        { label: 'مع الموظفين', value: custody.held, tone: 'blue' }, { label: 'مستنية إجراء', value: custody.waiting, tone: 'yellow' },
      ] })
    }

    // التهيئة: موظفين عليهم مهام تهيئة لسه مفتوحة — بصلاحية عرض الموظفين (اللي بتشوف كل مهام التهيئة في شاشتها)
    if (await open('onboarding', 'employees.view')) {
      const params: unknown[] = []
      const onboarding = await this.count(
        `SELECT COUNT(DISTINCT t.[employeeId]) AS n FROM [onboarding_tasks] t INNER JOIN [employees] e ON e.[id] = t.[employeeId]
         WHERE t.[status] = N'PENDING' AND e.[status] NOT IN (N'terminated', N'archived') ${andBranchScopeSql('e.[branchId]', scope, params)}`, params)
      tiles.push({ key: 'onboarding', title: 'تهيئة الموظفين الجدد', href: '/employees/onboarding', stats: [{ label: 'موظفين تهيئتهم لسه مفتوحة', value: onboarding.n, tone: 'yellow' }] })
    }

    // إنهاء الخدمة: ملفات مفتوحة (إخلاء، تسوية، مستنية آخر يوم) — بفرع الموظف
    if (await open('offboarding', 'offboarding.manage')) {
      const params: unknown[] = []
      const cases = await this.count(
        `SELECT SUM(CASE WHEN c.[status] = N'IN_CLEARANCE' THEN 1 ELSE 0 END) AS clearance, SUM(CASE WHEN c.[status] IN (N'IN_SETTLEMENT', N'SETTLED') THEN 1 ELSE 0 END) AS settlement
         FROM [offboarding_cases] c INNER JOIN [employees] e ON e.[id] = c.[employeeId]
         WHERE c.[status] IN (N'IN_CLEARANCE', N'IN_SETTLEMENT', N'SETTLED') ${andBranchScopeSql('e.[branchId]', scope, params)}`, params)
      tiles.push({ key: 'offboarding', title: 'إنهاء الخدمة', href: '/offboarding', stats: [
        { label: 'في الإخلاء', value: cases.clearance, tone: 'yellow' }, { label: 'في التسوية', value: cases.settlement, tone: 'blue' },
      ] })
    }

    // المستندات: إقرارات مطلوبة ولسه ماتمتش (والمتأخر منها) — من غير المستندات المالية، وبفرع الموظف الحالي (أو فرع المستند لو من غير موظف)
    if (userHasPerm(user, 'documents.manage') && (await documentAckSchemaReady(em))) {
      const params: unknown[] = [today]
      const byEmployee = branchScopeSql('e.[branchId]', scope, params), byDocument = branchScopeSql('d.[branchId]', scope, params)
      const inScope = scope === null ? '' : `AND ((d.[employeeId] IS NOT NULL AND ${byEmployee}) OR (d.[employeeId] IS NULL AND ${byDocument}))`
      const acks = await this.count(
        `SELECT COUNT(*) AS pending, SUM(CASE WHEN d.[ackDueDate] IS NOT NULL AND d.[ackDueDate] < @0 THEN 1 ELSE 0 END) AS overdue
         FROM [hr_issued_documents] d LEFT JOIN [hr_document_acknowledgements] a ON a.[documentId] = d.[id] LEFT JOIN [employees] e ON e.[id] = d.[employeeId]
         WHERE d.[ackRequestedAt] IS NOT NULL AND a.[documentId] IS NULL AND ISNULL(d.[isFinancial], 0) = 0 AND (d.[employeeId] IS NULL OR e.[id] IS NOT NULL) ${inScope}`, params)
      tiles.push({ key: 'documents', title: 'إقرارات المستندات', href: '/employees/documents', stats: [
        { label: 'مستنية إقرار', value: acks.pending, tone: 'blue' }, { label: 'فات ميعادها', value: acks.overdue, tone: 'red' },
      ] })
    }

    // الإعلانات: المنشور الساري دلوقتي، جوه النطاق بقاعدة قايمة الإعلانات (جمهور الإعلان)
    if ((await open('announcements', 'announcements.manage')) && (await announcementsReady(em))) {
      const rows: Array<{ status: string; publishDate: unknown; expiryDate: unknown; audience: string | null }> = await this.ds.query(
        `SELECT TOP 300 [status], [publishDate], [expiryDate], [audience] FROM [announcements] WHERE [status] = N'PUBLISHED' ORDER BY [id] DESC`)
      const live = rows.filter(row => announcementLive(row, today) && announcementAudienceInScope(row.audience, scope)).length
      tiles.push({ key: 'announcements', title: 'الإعلانات', href: '/announcements', stats: [{ label: 'منشورة دلوقتي', value: live, tone: 'blue' }] })
    }

    // الاستبيانات: المفتوح دلوقتي جوه النطاق (جمهور الاستبيان)، ونسبة الرد على مستوى الاستبيان كله (نفس اللي في قايمته — مش مقسّمة)
    if ((await open('surveys', 'surveys.manage')) && (await surveysReady(em))) {
      const rows: Array<{ id: number; audience: string | null; closeDate: unknown }> = await this.ds.query(`SELECT [id], [audience], [closeDate] FROM [surveys] WHERE [status] = N'OPEN'`)
      const openNow = rows.filter(row => { const close = day10(row.closeDate); return (close === null || close >= today) && announcementAudienceInScope(row.audience, scope) }).map(row => Number(row.id))
      let invited = 0, responded = 0
      if (openNow.length) {
        const row = await this.count(
          `SELECT COUNT(*) AS invited, SUM(CASE WHEN [respondedOn] IS NULL THEN 0 ELSE 1 END) AS responded FROM [survey_invitations]
           WHERE [surveyId] IN (${openNow.map((_, index) => `@${index}`).join(', ')})`, openNow)
        invited = row.invited; responded = row.responded
      }
      tiles.push({ key: 'surveys', title: 'الاستبيانات', href: '/surveys', stats: [
        { label: 'مفتوحة', value: openNow.length, tone: 'blue' },
        { label: `ردّوا من ${invited}`, value: invited > 0 ? Math.round((responded / invited) * 100) : 0, tone: 'blue', suffix: '%' },
      ] })
    }

    // الدعم (الاستفسارات): المفتوح بتعريف تقرير الدعم — مش مسودة ولا مرفوض ولا ملغي، ومااتحلّش (مكتمل ومهمته اتقفلت) — بفرع الطلب
    if (await open('helpdesk', 'helpdesk.manage')) {
      const params: unknown[] = []
      const resolved = (await executionSchemaReady(em))
        ? `AND NOT (r.[status] = N'COMPLETED' AND EXISTS (SELECT 1 FROM [tasks] t WHERE t.[id] = r.[executionTaskId] AND t.[closedAt] IS NOT NULL))` : ''
      const inquiries = await this.count(
        `SELECT COUNT(*) AS n FROM [requests] r
         WHERE r.[typeCode] IN (SELECT [code] FROM [request_types] WHERE [category] = N'inquiries') AND r.[status] NOT IN (N'DRAFT', N'REJECTED', N'CANCELLED') ${resolved}
           ${andBranchScopeSql('r.[branchId]', scope, params)}`, params)
      tiles.push({ key: 'helpdesk', title: 'الدعم والاستفسارات', href: '/helpdesk', stats: [{ label: 'استفسارات مفتوحة', value: inquiries.n, tone: 'yellow' }] })
    }

    // القضايا: الاطلاع بالقضية مش بالفرع ولا بالصلاحية — العدّ هنا للقضايا المفتوحة اللي الحساب نفسه مطّلع عليها بس (نفس قايمة القضايا)
    if ((await open('cases', 'cases.investigate')) && (await casesReady(em))) {
      const mine = [...(await handledCaseIds(em, user))]
      let openCases = 0
      if (mine.length) {
        const row = await this.count(
          `SELECT COUNT(*) AS n FROM [hr_cases] WHERE [status] IN (N'OPEN', N'INVESTIGATING') AND [id] IN (${mine.map((_, index) => `@${index}`).join(', ')})`, mine)
        openCases = row.n
      }
      tiles.push({ key: 'cases', title: 'القضايا والتحقيقات', href: '/cases', stats: [{ label: 'قضايا مفتوحة معاك', value: openCases, tone: 'yellow' }] })
    }

    return { modules: tiles }
  }
}
