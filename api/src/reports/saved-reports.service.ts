import { BadRequestException, ConflictException, Injectable, Logger, NotFoundException, Type } from '@nestjs/common'
import { ModuleRef } from '@nestjs/core'
import { InjectDataSource } from '@nestjs/typeorm'
import { DataSource, Not } from 'typeorm'
import { localDateOf } from '../attendance/attendance.service'
import { AuthService } from '../auth/auth.service'
import type { JwtPayload } from '../auth/auth.service'
import { userHasPerm } from '../auth/guards'
import { MailService } from '../auth/mail.service'
import { User } from '../auth/user.entity'
import { dateOnly } from '../employees/employee-suspension-rules'
import { ModulesService } from '../modules-registry/modules.service'
import { NotificationsService } from '../notifications/notifications.service'
import { FinancialReportService } from './financial-report.service'
import { REPORT_TITLES, isReportExportFormat, isReportKey, type ReportExportFormat, type ReportKey } from './report-export'
import { ReportsController } from './reports.controller'
import { SavedReport } from './saved-report.entity'
import {
  SAVED_REPORTS_FULL, SAVED_REPORTS_MAX, SAVED_REPORTS_MIGRATION_MISSING, SAVED_REPORT_FREQUENCY_LABELS, SAVED_REPORT_NAME_MAX, SAVED_REPORT_NAME_MIN,
  SAVED_REPORT_MAIL_FAILED, SAVED_REPORT_NAME_TAKEN, SAVED_REPORT_NOT_FOUND, SAVED_REPORT_PERIOD_REPORTS, SAVED_REPORT_SEND_HOUR, SAVED_REPORT_UNAVAILABLE,
  isSavedReportFrequency, parseSavedFilters,
  previousPeriod, savedFiltersNarrow, savedReportDue, savedReportName, savedReportsReady, type SavedReportFilters,
} from './saved-reports'

export interface SavedReportInput {
  name?: unknown; report?: unknown; frequency?: unknown; format?: unknown
  branchId?: unknown; departmentIds?: unknown; teamId?: unknown; period?: unknown
}

const sqlErrorNumber = (error: unknown): number =>
  Number((error as { driverError?: { number?: unknown }; number?: unknown })?.driverError?.number ?? (error as { number?: unknown })?.number)
const brief = (error: unknown): string => String((error as { message?: unknown })?.message ?? error).replace(/\s+/g, ' ').trim().slice(0, 300)

// B2.13-ب: التقرير المحفوظ (فلاتر باسم، لصاحبه بس) وإرساله المجدول بالبريد. الملف نفسه من ReportsController.exportFile:
// نفس دوال التقارير ونفس الصلاحية والنطاق — والإرسال المجدول بهوية صاحب التقرير **وقت الإرسال** مش وقت الحفظ.
@Injectable()
export class SavedReportsService {
  private readonly log = new Logger(SavedReportsService.name)

  constructor(@InjectDataSource() private readonly ds: DataSource, private readonly refs: ModuleRef, private readonly modules: ModulesService) {}

  private use<T>(type: Type<T>): T {
    return this.refs.get(type, { strict: false })
  }
  private get repo() { return this.ds.getRepository(SavedReport) }

  private view(row: SavedReport) {
    const filters = parseSavedFilters(row.filters)
    return {
      id: row.id, name: row.name, report: row.reportKey, reportTitle: REPORT_TITLES[row.reportKey as ReportKey] ?? row.reportKey,
      period: SAVED_REPORT_PERIOD_REPORTS.includes(row.reportKey) ? filters.period : null, filtered: savedFiltersNarrow(filters),
      frequency: row.frequency, format: row.format, lastSentOn: row.lastSentOn ? dateOnly(row.lastSentOn) : null, lastError: row.lastError,
    }
  }

  /** البريد شغال؟ (الخادم متظبط، وبريد الإشعارات مفتوح من الإعدادات — مقفول افتراضيًا) */
  private async mailReady(): Promise<boolean> {
    return this.use(MailService).isConfigured() && (await this.use(NotificationsService).emailRequested())
  }

  async list(user: JwtPayload) {
    const ready = await savedReportsReady(this.ds.manager)
    const rows = ready ? await this.repo.find({ where: { ownerUserId: user.sub }, order: { id: 'ASC' } }) : []
    return { ready, migrationMessage: ready ? null : SAVED_REPORTS_MIGRATION_MISSING, mailReady: await this.mailReady(), max: SAVED_REPORTS_MAX,
      canSave: userHasPerm(user, 'reports.save'),
      sendHour: SAVED_REPORT_SEND_HOUR, frequencies: SAVED_REPORT_FREQUENCY_LABELS, items: rows.map(row => this.view(row)) }
  }

  private async assertReady() {
    if (!(await savedReportsReady(this.ds.manager))) throw new BadRequestException(SAVED_REPORTS_MIGRATION_MISSING)
  }

  // تقرير حساب تاني = نفس رد رقم مش موجود
  private async own(user: JwtPayload, id: number): Promise<SavedReport> {
    await this.assertReady()
    const row = await this.repo.findOne({ where: { id, ownerUserId: user.sub } })
    if (!row) throw new NotFoundException(SAVED_REPORT_NOT_FOUND)
    return row
  }

  private nameOf(raw: unknown): string {
    const name = savedReportName(raw)
    if (!name) throw new BadRequestException(`اسم التقرير من ${SAVED_REPORT_NAME_MIN} لـ${SAVED_REPORT_NAME_MAX} حرف`)
    return name
  }
  private frequencyOf(raw: unknown): string {
    if (!isSavedReportFrequency(raw)) throw new BadRequestException('دورية الإرسال غير معروفة')
    return raw
  }
  private formatOf(raw: unknown): ReportExportFormat {
    if (!isReportExportFormat(raw)) throw new BadRequestException('صيغة التصدير xlsx أو pdf')
    return raw
  }
  private async write<T>(work: () => Promise<T>): Promise<T> {
    try {
      return await work()
    } catch (error) {
      if (sqlErrorNumber(error) === 2601 || sqlErrorNumber(error) === 2627) throw new ConflictException(SAVED_REPORT_NAME_TAKEN)
      throw error
    }
  }

  async create(user: JwtPayload, input: SavedReportInput) {
    await this.assertReady()
    const name = this.nameOf(input.name)
    if (!isReportKey(input.report)) throw new BadRequestException('التقرير المطلوب غير معروف')
    const frequency = this.frequencyOf(input.frequency ?? 'NONE'), format = this.formatOf(input.format ?? 'xlsx')
    // الفلاتر بتتحكم بقواعد التقرير نفسه (موديوله، وصلاحية الرواتب، وفرع جوه نطاق القارئ)
    const filters: SavedReportFilters = await this.use(ReportsController).savedFilters(user, input.report, input)
    if ((await this.repo.count({ where: { ownerUserId: user.sub } })) >= SAVED_REPORTS_MAX) throw new BadRequestException(SAVED_REPORTS_FULL)
    const saved = await this.write(() => this.repo.save(this.repo.create({ ownerUserId: user.sub, name, reportKey: input.report as string,
      filters: JSON.stringify(filters), frequency, format, lastSentOn: null, lastError: null, createdAt: new Date() })))
    return this.view(saved)
  }

  /** تعديل الاسم أو دورية الإرسال أو الصيغة (الفلاتر والتقرير ثابتين: تقرير تاني = حفظ جديد) */
  async update(user: JwtPayload, id: number, input: SavedReportInput) {
    const row = await this.own(user, id)
    const changes: Partial<SavedReport> = {}
    if (input.name !== undefined) changes.name = this.nameOf(input.name)
    if (input.frequency !== undefined) changes.frequency = this.frequencyOf(input.frequency)
    if (input.format !== undefined) changes.format = this.formatOf(input.format)
    // تغيير الدورية بيمسح سبب التعذّر القديم (المحاولة الجاية هي اللي تتحكم)
    if (changes.frequency !== undefined && changes.frequency !== row.frequency) changes.lastError = null
    // بالحقول المتغيّرة وبرقم الصف وصاحبه — مش حفظ الكيان كله
    if (Object.keys(changes).length) await this.write(() => this.repo.update({ id: row.id, ownerUserId: user.sub }, changes))
    return this.view(await this.own(user, id))
  }

  async remove(user: JwtPayload, id: number) {
    const row = await this.own(user, id)
    await this.repo.delete({ id: row.id, ownerUserId: user.sub })
    return { ok: true }
  }

  /** ملف التقرير المحفوظ لصاحبه دلوقتي (بصلاحياته ونطاقه الحاليين) */
  async file(user: JwtPayload, id: number, format?: unknown) {
    const row = await this.own(user, id)
    const file = await this.build(user, row, format === undefined || format === '' ? this.formatOf(row.format) : this.formatOf(format), false)
    await file.audit()
    return file
  }

  private async queryOf(report: string, filters: SavedReportFilters): Promise<Record<string, string>> {
    const query: Record<string, string> = {}
    if (filters.branchId !== null) query.branchId = String(filters.branchId)
    if (filters.departmentIds !== null) query.departmentIds = filters.departmentIds.join(',')
    if (filters.teamId !== null) query.teamId = String(filters.teamId)
    if (SAVED_REPORT_PERIOD_REPORTS.includes(report)) {
      // الفترة النسبية بتتحسب دلوقتي بنفس دورة شهر الرواتب
      const financial = this.use(FinancialReportService)
      const current = await financial.periodOf()
      const range = filters.period === 'previous' ? await financial.periodOf(previousPeriod(current.period)) : current
      if (report === 'metrics') query.period = range.period
      else { query.from = range.startDate; query.to = range.endDate }
    }
    if (report === 'leaves') query.year = localDateOf(new Date()).slice(0, 4)
    return query
  }

  private async build(user: JwtPayload, row: SavedReport, format: ReportExportFormat, scheduled: boolean) {
    if (!isReportKey(row.reportKey)) throw new BadRequestException('التقرير المطلوب غير معروف')
    return this.use(ReportsController).exportFile(user, row.reportKey, format, await this.queryOf(row.reportKey, parseSavedFilters(row.filters)),
      { url: `/api/reports/saved/${row.id}/export`, savedReportId: row.id, scheduled })
  }

  /** التقارير المجدولة المستحقة النهارده (شغل المهمة بعد بواباتها) */
  async dueRows(today: string): Promise<SavedReport[]> {
    return (await this.repo.find({ where: { frequency: Not('NONE') }, order: { id: 'ASC' } }))
      .filter(row => savedReportDue(row.frequency, row.lastSentOn ? dateOnly(row.lastSentOn) : null, today))
  }

  /**
   * الإرسال المجدول (مهمة reports.scheduled، فحص كل ساعة): التقارير المستحقة النهارده بتتبعت لبريد صاحبها. كل تقرير بيتبني بهوية
   * صاحبه دلوقتي (الدور والصلاحيات والنطاق من الحساب وقت الإرسال): حساب اتقفل أو فقد صلاحية التقارير مابيتبعتلوش، وفلتر بقى برّه
   * نطاقه بيترفض من دالة التقرير. صف التقرير وهوية صاحبه بيتقروا لكل تقرير قبل بنائه (تقرير اتمسح أو اتوقف، أو صلاحية اتسحبت والحلقة
   * شغالة، مابيتبعتش بحكم قديم). من غير معاملة: كل تقرير لوحده، وتعذّر واحد مابيوقّفش الباقي.
   */
  async sendDue(now: Date = new Date()): Promise<{ due: number; sent: number; failed: number; skipped: string | null }> {
    const none = (skipped: string, due = 0) => ({ due, sent: 0, failed: 0, skipped })
    if (!(await this.modules.jobEnabled('reports.scheduled'))) return none('module')
    if (!(await savedReportsReady(this.ds.manager))) return none('migration')
    if (now.getHours() < SAVED_REPORT_SEND_HOUR) return none('hour')
    const today = localDateOf(now)
    const rows = await this.dueRows(today)
    if (!rows.length) return none('nothing')
    // البريد مقفول = ولا تقرير بيتبني (ولا سطر تدقيق)، والمستحق بيفضل مستحق لحد ما يتفتح
    if (!(await this.mailReady())) return none('mail', rows.length)
    const mail = this.use(MailService), auth = this.use(AuthService), users = this.ds.getRepository(User)
    let sent = 0, failed = 0, due = 0
    for (const listed of rows) {
      // الصف دلوقتي: اتمسح، أو دوريته اتغيّرت، أو اتبعت من تشغيل تاني = برّه
      const row = await this.repo.findOne({ where: { id: listed.id } })
      if (!row || !savedReportDue(row.frequency, row.lastSentOn ? dateOnly(row.lastSentOn) : null, today)) continue
      due += 1
      try {
        // هوية صاحب التقرير دلوقتي (حساب مفعّل بدوره وصلاحياته ونطاقه الحاليين)
        const account = await users.findOne({ where: { id: row.ownerUserId, isActive: true } })
        const [owner] = account ? await auth.accountPayloads([account]) : []
        if (!owner) throw new Error('حساب صاحب التقرير مقفول أو مش موجود')
        if (!owner.email) throw new Error('حساب صاحب التقرير من غير بريد')
        if (!userHasPerm(owner, 'reports.view') || !userHasPerm(owner, 'reports.save') || !(await this.modules.allowedFor('reports', owner))) {
          throw new Error('صاحب التقرير مابقاش معاه صلاحية التقارير وجدولتها')
        }
        const file = await this.build(owner, row, this.formatOf(row.format), true).catch((error) => {
          // موديول التقرير اتقفل لصاحبه: رد المسار «مش موجود» مايتعرضش له بنصه
          throw error instanceof NotFoundException ? new Error(SAVED_REPORT_UNAVAILABLE) : error
        })
        await mail.send({ to: owner.email, subject: `تقرير مجدول: ${row.name}`,
          text: `مرفق تقرير «${row.name}» (${REPORT_TITLES[row.reportKey as ReportKey] ?? row.reportKey}) بتاريخ ${today}.\nالتقرير اتبنى بصلاحياتك ونطاقك وقت الإرسال.`,
          attachments: [{ filename: file.fileName, content: file.buffer, contentType: file.contentType }] }).catch((error) => {
          // تفاصيل خادم البريد في لوج الخادم بس؛ صاحب التقرير بيشوف رسالة عامة
          this.log.warn(`scheduled report ${row.id} mail failed: ${brief(error)}`)
          throw new Error(SAVED_REPORT_MAIL_FAILED)
        })
        // سطر التدقيق بعد ما الرسالة تطلع فعلًا
        await file.audit()
        await this.repo.update({ id: row.id }, { lastSentOn: today, lastError: null })
        sent += 1
      } catch (error) {
        failed += 1
        this.log.warn(`scheduled report ${row.id} not sent: ${brief(error)}`)
        await this.repo.update({ id: row.id }, { lastError: brief(error) }).catch(() => undefined)
      }
    }
    return { due, sent, failed, skipped: due ? null : 'nothing' }
  }
}
