import { BadRequestException, ConflictException, ForbiddenException, Injectable, NotFoundException } from '@nestjs/common'
import { InjectDataSource } from '@nestjs/typeorm'
import { DataSource, In, type EntityManager } from 'typeorm'
import { localDateOf } from '../attendance/attendance.service'
import { recordAudit } from '../audit/audit'
import type { JwtPayload } from '../auth/auth.service'
import { assertCompanyWideWrite, branchScopeOf, inBranchScope } from '../auth/guards'
import { StoredFile } from '../files/stored-file.entity'
import { readBranchCurrencyOf } from '../org/branch-currency-db'
import { RequestType } from '../requests/entities/request-type.entity'
import {
  ExpenseCategoryLimit, gradeLimitsOf, gradePolicy, PER_DIEM_NONE, PerDiemRate, perDiemCents, perDiemFields, perDiemIssue, perDiemText, pickRate, rateFields,
  categoryFields, EXPENSE_MIGRATION_MISSING, EXPENSE_REPORT_HANDLER, ExpenseCategory, ExpenseLine, ExpenseReport, expenseReportsReady, lineFields, lineIssue, LINES_MAX, lockReport, phaseEditable,
  REPORT_NOT_FOUND, REPORT_PHASE_LABELS, reportCode, reportFields, reportPhase, type ReportPhase,
} from './expense-reports'
import { ADVANCE_MIGRATION_MISSING, ADVANCE_NOT_FOUND, ADVANCE_STATUS_LABELS, advanceCode, TRAVEL_ADVANCE_HANDLER, TravelAdvance, travelAdvancesReady } from './travel-advances'

// B5.3 (أ): تقارير المصروفات — الموظف لتقاريره (مسودة وبنود وإيصالات)، وصاحب `expenses.manage` للفئات (تعريف للشركة كلها) ولقراءة تقارير
// موظفين نطاق فروعه (فرع الموظف الحالي). التقديم والاعتماد والصرف في محرك الطلبات (expense-reports.ts). أي تعديل تحت قفل صف التقرير،
// بترتيب الأقفال الواحد: صف الطلب ← صف التقرير ← صف السلفة.
// (ج) حدود الدرجات على الفئة وأسعار البدل اليومي تعريف للشركة كلها؛ وبند البدل اليومي مبلغه من الخادم (الأيام × سعر درجة الموظف للوجهة).
// (ب) سلف المأموريات: الموظف بيربط سلفته المصروفة بتقريره؛ وصاحب الصلاحية بيسجّل صرف سلف موظفين نطاقه وقفلها «اترجّعت نقدًا».

const NOT_EMPLOYEE = 'حسابك مش مربوط بملف موظف'
const NOT_EDITABLE = 'التقرير تحت الاعتماد أو اتعتمد — مايتعدّلش'
const LINE_NOT_FOUND = 'البند مش موجود'
const CATEGORY_NOT_FOUND = 'فئة المصروف مش موجودة'
const CATEGORY_NAME_TAKEN = 'فيه فئة بنفس الاسم'
const RECEIPT_INVALID = 'إيصال البند لازم يكون ملف رفعته إنت لنفسك من الشاشة دي'
const DELETE_FILED = 'تقرير اتقدّم قبل كده مايتمسحش'
const PER_DIEM_LOCKED = 'بند البدل اليومي مايتعدّلش — امسحه وضيفه تاني'
const GRADE_UNKNOWN = 'درجة من الدرجات مش موجودة'
const RATE_NOT_FOUND = 'سعر البدل اليومي مش موجود'
const RATE_TAKEN = 'فيه سعر مفعّل لنفس الوجهة والدرجة'
const RATE_CATEGORY = 'فئة المصروف بتاعة البدل مش موجودة أو مقفولة'
const ADVANCE_UNPAID = 'السلفة لسه مااتسجّلش صرفها — ماتتربطش بتقرير'
const ADVANCE_TAKEN = 'السلفة مربوطة بتقرير تاني — فكّها منه الأول'
const ADVANCE_CLOSED = 'السلفة اتقفلت قبل كده'
const ADVANCE_PAID = 'صرف السلفة متسجّل قبل كده'
const ADVANCE_LINKED = 'السلفة مربوطة بتقرير مصروفات — التسوية بتتم باعتماده'
const ADVANCE_NOTE = 'اكتب ملاحظة القفل (من حرفين لحد 300 حرف)'
const ADVANCE_STEP = 'الخطوة «اتصرفت» أو «اترجّعت»'
const flag = (value: unknown) => value === true || value === 1
const ymd = (value: unknown) => (value == null ? null : value instanceof Date ? value.toISOString().slice(0, 10) : String(value).slice(0, 10))
const idOf = (value: unknown) => (value == null ? null : Number(value))

@Injectable()
export class ExpenseReportsService {
  constructor(@InjectDataSource() private readonly ds: DataSource) {}

  private async assertReady(em: EntityManager) {
    if (!(await expenseReportsReady(em))) throw new BadRequestException(EXPENSE_MIGRATION_MISSING)
  }

  private employeeOf(user: JwtPayload): number {
    if (!user.employeeId) throw new ForbiddenException(NOT_EMPLOYEE)
    return Number(user.employeeId)
  }

  private advanceView(row: TravelAdvance) {
    return { id: row.id, code: advanceCode(row.id), employeeId: row.employeeId, amount: Number(row.amount), purpose: row.purpose, status: row.status, statusLabel: ADVANCE_STATUS_LABELS[row.status] ?? row.status,
      paid: row.paidAt != null, paidAt: row.paidAt ?? null, reportId: idOf(row.reportId), requestId: row.requestId, closedAt: row.closedAt ?? null, closeNote: row.closeNote ?? null }
  }

  private categoryView(row: ExpenseCategory, limits: ExpenseCategoryLimit[] = []) {
    return { id: row.id, name: row.name, limitPerLine: row.limitPerLine == null ? null : Number(row.limitPerLine), limitMode: row.limitMode, receiptRequired: flag(row.receiptRequired), isActive: flag(row.isActive),
      gradeLimits: limits.filter(limit => limit.categoryId === row.id).map(limit => ({ gradeId: limit.gradeId, limitPerLine: Number(limit.limitPerLine) })) }
  }

  private rateView(row: PerDiemRate) {
    return { id: row.id, categoryId: row.categoryId, gradeId: idOf(row.gradeId), destination: row.destination, dailyAmount: Number(row.dailyAmount), isActive: flag(row.isActive) }
  }

  /** تقارير بحالتها الفعلية (حالة التقرير + حالة طلبه) وبنودها بحكم السياسة دلوقتي */
  private async reportViews(em: EntityManager, reports: ExpenseReport[]) {
    if (!reports.length) return []
    const lines = await em.getRepository(ExpenseLine).find({ where: { reportId: In(reports.map(row => row.id)) }, order: { expenseDate: 'ASC', id: 'ASC' } })
    const categories = new Map((await em.getRepository(ExpenseCategory).find()).map(row => [row.id, row]))
    const requestIds = reports.map(row => idOf(row.requestId)).filter((id): id is number => id !== null)
    const statuses = new Map<number, string>()
    if (requestIds.length) {
      const rows: Array<{ id: number; status: string }> = await em.query(`SELECT [id], [status] FROM dbo.requests WHERE [id] IN (${requestIds.map((_, index) => `@${index}`).join(', ')})`, requestIds)
      for (const row of rows) statuses.set(Number(row.id), String(row.status))
    }
    // (ب) السلفة المربوطة بكل تقرير: المفتوحة، أو اللي اتسوّت فيه
    const advances = (await travelAdvancesReady(em)) ? await em.getRepository(TravelAdvance).find({ where: { reportId: In(reports.map(row => row.id)), status: In(['OPEN', 'SETTLED']) }, order: { id: 'ASC' } }) : []
    // (ج) الحكم بدرجة صاحب كل تقرير دلوقتي (حد درجته على الفئة، وسعر بدله اليومي)
    const policies = new Map<number, Awaited<ReturnType<typeof gradePolicy>>>()
    for (const employeeId of new Set(reports.map(row => row.employeeId))) policies.set(employeeId, await gradePolicy(em, employeeId))
    return reports.map(report => {
      const requestId = idOf(report.requestId), policy = policies.get(report.employeeId)!
      const phase: ReportPhase = reportPhase(report.status, requestId === null ? null : statuses.get(requestId) ?? null)
      const own = lines.filter(line => line.reportId === report.id).map(line => {
        const category = categories.get(line.categoryId)
        const daily = line.perDiemRateId != null
        const issue = daily ? { warn: null, block: perDiemIssue(policy.rates, line, policy.gradeId) } : lineIssue(category, line, true, policy.limits.get(line.categoryId) ?? null)
        return { id: line.id, categoryId: line.categoryId, categoryName: category?.name ?? '—', expenseDate: ymd(line.expenseDate), amount: Number(line.amount), note: line.note ?? null,
          receiptFileId: idOf(line.receiptFileId), warning: issue.warn, problem: issue.block,
          perDiem: daily ? perDiemText(line.perDiemDays, policy.rates.find(rate => rate.id === line.perDiemRateId)) : null }
      })
      const totalCents = Math.round(own.reduce((sum, line) => sum + Math.round(line.amount * 100), 0))
      const linked = advances.find(row => idOf(row.reportId) === report.id) ?? null
      return { id: report.id, code: reportCode(report.id), employeeId: report.employeeId, title: report.title, tripFrom: ymd(report.tripFrom), tripTo: ymd(report.tripTo), phase, phaseLabel: REPORT_PHASE_LABELS[phase],
        editable: phaseEditable(phase), requestId, total: totalCents / 100, submittedAt: report.submittedAt ?? null, approvedAt: report.approvedAt ?? null, lines: own,
        advance: linked ? { id: linked.id, code: advanceCode(linked.id), amount: Number(linked.amount) } : null, net: linked ? (totalCents - Math.round(Number(linked.amount) * 100)) / 100 : null }
    })
  }

  // ===== الموظف: تقاريره =====

  /** «مصروفاتي»: تقارير الحساب، والفئات المفعّلة، وعملة فرعه، ونوع الطلب اللي التقرير بيتقدّم بيه (لو متعرّف) */
  async mine(user: JwtPayload) {
    const em = this.ds.manager, employeeId = this.employeeOf(user)
    if (!(await expenseReportsReady(em))) return { ready: false, currency: null, requestTypeCode: null, advanceTypeCode: null, categories: [], reports: [], advances: [], perDiem: [] }
    const [person]: Array<{ branchId: number | null }> = await em.query('SELECT [branchId] FROM dbo.employees WHERE [id] = @0', [employeeId])
    const currencyOf = await readBranchCurrencyOf(em)
    const type = await em.getRepository(RequestType).findOne({ where: { destinationHandler: EXPENSE_REPORT_HANDLER, isActive: true }, order: { id: 'ASC' } })
    const categories = await em.getRepository(ExpenseCategory).find({ where: { isActive: true }, order: { name: 'ASC', id: 'ASC' } })
    // (ج) الموظف بيشوف حد درجته هو على الفئة، وسعر بدله اليومي لكل وجهة (سعر درجته، وإلا سعر كل الدرجات) لفئة مفعّلة
    const policy = await gradePolicy(em, employeeId)
    const open = new Set(categories.map(row => row.id))
    const perDiem = [...new Set(policy.rates.filter(rate => flag(rate.isActive)).map(rate => rate.destination))].sort((a, b) => a.localeCompare(b, 'ar'))
      .map(destination => pickRate(policy.rates, destination, policy.gradeId)).filter((rate): rate is PerDiemRate => !!rate && open.has(rate.categoryId))
      .map(rate => ({ destination: rate.destination, dailyAmount: Number(rate.dailyAmount) }))
    const reports = await em.getRepository(ExpenseReport).find({ where: { employeeId }, order: { id: 'DESC' } })
    // (ب) سلف المأموريات: نوع طلبها (لو متعرّف والترحيل متطبّق)، وسلف الحساب بحالتها
    const advancesReady = await travelAdvancesReady(em)
    const advanceType = advancesReady ? await em.getRepository(RequestType).findOne({ where: { destinationHandler: TRAVEL_ADVANCE_HANDLER, isActive: true }, order: { id: 'ASC' } }) : null
    const advances = advancesReady ? await em.getRepository(TravelAdvance).find({ where: { employeeId }, order: { id: 'DESC' } }) : []
    return { ready: true, currency: currencyOf(idOf(person?.branchId)), requestTypeCode: type?.code ?? null, advanceTypeCode: advanceType?.code ?? null,
      categories: categories.map(row => ({ ...this.categoryView(row), limitPerLine: policy.limits.get(row.id) ?? (row.limitPerLine == null ? null : Number(row.limitPerLine)) })),
      reports: await this.reportViews(em, reports), advances: advances.map(row => this.advanceView(row)), perDiem }
  }

  async createReport(user: JwtPayload, body: unknown) {
    const employeeId = this.employeeOf(user)
    const { fields, error } = reportFields(body)
    if (!fields) throw new BadRequestException(error)
    return this.ds.transaction(async em => {
      await this.assertReady(em)
      const now = new Date()
      const report = await em.getRepository(ExpenseReport).save(em.getRepository(ExpenseReport).create({ employeeId, ...fields, status: 'DRAFT', requestId: null, obligationId: null, totalAmount: null,
        createdAt: now, updatedAt: now, submittedAt: null, approvedAt: null }))
      return { id: report.id }
    })
  }

  /** تقرير الحساب تحت قفل صفه (بعد قفل طلبه لو له)، ولازم يكون في حالة بتتعدّل. تقرير حد تاني زي اللي مش موجود. */
  private async lockOwnEditable(em: EntityManager, user: JwtPayload, id: number): Promise<ExpenseReport> {
    const employeeId = this.employeeOf(user)
    await this.assertReady(em)
    const locked = await lockReport(em, id, null)
    if (!locked || locked.report.employeeId !== employeeId) throw new NotFoundException(REPORT_NOT_FOUND)
    if (!phaseEditable(reportPhase(locked.report.status, locked.linkedStatus))) throw new ConflictException(NOT_EDITABLE)
    return locked.report
  }

  async updateReport(user: JwtPayload, id: number, body: unknown) {
    const { fields, error } = reportFields(body)
    if (!fields) throw new BadRequestException(error)
    return this.ds.transaction(async em => {
      const report = await this.lockOwnEditable(em, user, id)
      await em.getRepository(ExpenseReport).update({ id: report.id }, { ...fields, updatedAt: new Date() })
      return { id: report.id }
    })
  }

  /** مسح مسودة عمرها ما اتقدّمت، ببنودها */
  async removeReport(user: JwtPayload, id: number) {
    return this.ds.transaction(async em => {
      const report = await this.lockOwnEditable(em, user, id)
      if (report.status !== 'DRAFT' || report.requestId != null) throw new ConflictException(DELETE_FILED)
      // سلفة مربوطة بالمسودة بتتفكّ (بتفضل مفتوحة لتقرير تاني)
      if (await travelAdvancesReady(em)) await em.getRepository(TravelAdvance).update({ reportId: report.id, status: 'OPEN' }, { reportId: null })
      await em.getRepository(ExpenseLine).delete({ reportId: report.id })
      await em.getRepository(ExpenseReport).delete({ id: report.id })
      return { removed: true }
    })
  }

  /** إضافة بند (من غير `lineId`) أو تعديله: الفئة مفعّلة ومش فوق حد «منع»، والإيصال ملف رفعه صاحب التقرير لنفسه بنوع «طلب» */
  async saveLine(user: JwtPayload, reportId: number, body: unknown, lineId?: number) {
    const { fields, error } = lineFields(body, localDateOf(new Date()))
    if (!fields) throw new BadRequestException(error)
    return this.ds.transaction(async em => {
      const report = await this.lockOwnEditable(em, user, reportId)
      const lines = em.getRepository(ExpenseLine)
      const existing = lineId == null ? null : await lines.findOne({ where: { id: lineId, reportId: report.id } })
      if (lineId != null && !existing) throw new NotFoundException(LINE_NOT_FOUND)
      if (!existing && (await lines.count({ where: { reportId: report.id } })) >= LINES_MAX) throw new BadRequestException(`التقرير ${LINES_MAX} بند بالكتير`)
      const category = await em.getRepository(ExpenseCategory).findOne({ where: { id: fields.categoryId } })
      if (!category) throw new BadRequestException(CATEGORY_NOT_FOUND)
      if (existing?.perDiemRateId != null) throw new BadRequestException(PER_DIEM_LOCKED)
      const issue = lineIssue(category, fields, false, (await gradePolicy(em, report.employeeId)).limits.get(category.id) ?? null)
      if (issue.block) throw new BadRequestException(issue.block)
      if (fields.receiptFileId !== null && fields.receiptFileId !== idOf(existing?.receiptFileId)) {
        const file = await em.getRepository(StoredFile).findOne({ where: { id: fields.receiptFileId } })
        if (!file || file.entityType !== 'request' || Number(file.uploadedBy) !== Number(user.sub) || Number(file.employeeId) !== report.employeeId) throw new BadRequestException(RECEIPT_INVALID)
      }
      const saved = existing ? await lines.save({ ...existing, ...fields }) : await lines.save(lines.create({ reportId: report.id, ...fields, createdAt: new Date() }))
      await em.getRepository(ExpenseReport).update({ id: report.id }, { updatedAt: new Date() })
      return { id: saved.id, warning: issue.warn }
    })
  }

  /**
   * (ج) بند بدل يومي: الموظف بيبعت الوجهة وعدد الأيام بس، والخادم بيحسب المبلغ = الأيام × سعر درجته للوجهة دلوقتي (تحت قفل التقرير)،
   * والبند بيتسجّل تحت فئة السعر. من غير إيصال ولا حد فئة.
   */
  async savePerDiem(user: JwtPayload, reportId: number, body: unknown) {
    const { fields, error } = perDiemFields(body, localDateOf(new Date()))
    if (!fields) throw new BadRequestException(error)
    return this.ds.transaction(async em => {
      const report = await this.lockOwnEditable(em, user, reportId)
      const lines = em.getRepository(ExpenseLine)
      if ((await lines.count({ where: { reportId: report.id } })) >= LINES_MAX) throw new BadRequestException(`التقرير ${LINES_MAX} بند بالكتير`)
      const policy = await gradePolicy(em, report.employeeId)
      const rate = pickRate(policy.rates, fields.destination, policy.gradeId)
      if (!rate) throw new BadRequestException(PER_DIEM_NONE)
      const category = await em.getRepository(ExpenseCategory).findOne({ where: { id: rate.categoryId } })
      if (!category || !flag(category.isActive)) throw new BadRequestException(RATE_CATEGORY)
      const amount = perDiemCents(fields.days, rate.dailyAmount) / 100
      const saved = await lines.save(lines.create({ reportId: report.id, categoryId: rate.categoryId, expenseDate: fields.expenseDate, amount, note: fields.note, receiptFileId: null, perDiemRateId: rate.id,
        perDiemDays: fields.days, createdAt: new Date() }))
      await em.getRepository(ExpenseReport).update({ id: report.id }, { updatedAt: new Date() })
      return { id: saved.id, amount, perDiem: perDiemText(fields.days, rate) }
    })
  }

  async removeLine(user: JwtPayload, reportId: number, lineId: number) {
    return this.ds.transaction(async em => {
      const report = await this.lockOwnEditable(em, user, reportId)
      const removed = await em.getRepository(ExpenseLine).delete({ id: lineId, reportId: report.id })
      if (!removed.affected) throw new NotFoundException(LINE_NOT_FOUND)
      await em.getRepository(ExpenseReport).update({ id: report.id }, { updatedAt: new Date() })
      return { removed: true }
    })
  }

  /**
   * (ب) ربط سلفة مأمورية بالتقرير أو فكّها (`advanceId: null`): التقرير في حالة بتتعدّل وتحت قفل صفه، وبعده صف السلفة — بتاعة صاحب التقرير
   * (وإلا «مش موجودة»)، مفتوحة، صرفها متسجّل، ومش مربوطة بتقرير تاني. سلفة واحدة للتقرير: الربط بيفكّ السابقة.
   */
  async attachAdvance(user: JwtPayload, reportId: number, body: unknown) {
    const raw = ((body ?? {}) as Record<string, unknown>).advanceId
    if (raw !== null && (typeof raw !== 'number' || !Number.isSafeInteger(raw) || raw < 1)) throw new BadRequestException(ADVANCE_NOT_FOUND)
    return this.ds.transaction(async em => {
      const report = await this.lockOwnEditable(em, user, reportId)
      if (!(await travelAdvancesReady(em))) throw new BadRequestException(ADVANCE_MIGRATION_MISSING)
      const advances = em.getRepository(TravelAdvance)
      if (raw !== null) {
        const advance = await advances.findOne({ where: { id: raw }, lock: { mode: 'pessimistic_write' } })
        if (!advance || advance.employeeId !== report.employeeId) throw new NotFoundException(ADVANCE_NOT_FOUND)
        if (advance.status !== 'OPEN') throw new ConflictException(ADVANCE_CLOSED)
        if (advance.paidAt == null) throw new BadRequestException(ADVANCE_UNPAID)
        if (advance.reportId != null && Number(advance.reportId) !== report.id) throw new ConflictException(ADVANCE_TAKEN)
      }
      await advances.update({ reportId: report.id, status: 'OPEN' }, { reportId: null })
      if (raw !== null) await advances.update({ id: raw }, { reportId: report.id })
      await em.getRepository(ExpenseReport).update({ id: report.id }, { updatedAt: new Date() })
      return { advanceId: raw }
    })
  }

  // ===== الإدارة: الفئات وتقارير الموظفين =====

  /** الفئات كلها (بالمقفولة)، وتقارير موظفين نطاق الحساب اللي اتقدّمت — بفرع الموظف الحالي */
  async overview(user: JwtPayload) {
    const em = this.ds.manager, canEdit = branchScopeOf(user) === null
    if (!(await expenseReportsReady(em))) return { ready: false, canEdit, categories: [], grades: [], rates: [], reports: [], advances: [] }
    const scope = branchScopeOf(user), currencyOf = await readBranchCurrencyOf(em)
    const categories = await em.getRepository(ExpenseCategory).find({ order: { name: 'ASC', id: 'ASC' } })
    // (ج) حدود الدرجات، وأسعار البدل اليومي، والدرجات المفعّلة (لاختيارات الشاشة)
    const limits = await em.getRepository(ExpenseCategoryLimit).find({ order: { gradeId: 'ASC', id: 'ASC' } })
    const rates = await em.getRepository(PerDiemRate).find({ order: { destination: 'ASC', id: 'ASC' } })
    const grades: Array<{ id: number; name: string }> = (await em.query('SELECT [id], [name] FROM [grades] WHERE [isActive] = 1 ORDER BY [id]')).map((row: { id: number; name: string }) => ({ id: Number(row.id), name: row.name }))
    const filed = await em.getRepository(ExpenseReport).find({ where: { status: In(['SUBMITTED', 'APPROVED']) }, order: { id: 'DESC' }, take: 300 })
    // (ب) سلف المأموريات: المفتوحة كلها وآخر 100 اتقفلوا
    const advancesReady = await travelAdvancesReady(em)
    const advances = advancesReady ? [...await em.getRepository(TravelAdvance).find({ where: { status: 'OPEN' }, order: { id: 'DESC' } }),
      ...await em.getRepository(TravelAdvance).find({ where: { status: In(['SETTLED', 'RETURNED']) }, order: { id: 'DESC' }, take: 100 })] : []
    const employeeIds = [...new Set([...filed.map(row => row.employeeId), ...advances.map(row => row.employeeId)])]
    const people = new Map<number, { fullName: string; employeeCode: string | null; branchId: number | null }>()
    if (employeeIds.length) {
      const rows: Array<{ id: number; fullName: string; employeeCode: string | null; branchId: number | null }> = await em.query(
        `SELECT [id], [fullName], [employeeCode], [branchId] FROM dbo.employees WHERE [id] IN (${employeeIds.map((_, index) => `@${index}`).join(', ')})`, employeeIds)
      for (const row of rows) people.set(Number(row.id), { fullName: row.fullName, employeeCode: row.employeeCode ?? null, branchId: idOf(row.branchId) })
    }
    const visible = filed.filter(row => { const person = people.get(row.employeeId); return !!person && inBranchScope(scope, person.branchId) })
    const views = await this.reportViews(em, visible)
    const named = <T extends { employeeId: number }>(view: T) => { const person = people.get(view.employeeId)!; return { ...view, employeeName: person.fullName, employeeCode: person.employeeCode, currency: currencyOf(person.branchId) } }
    return { ready: true, canEdit, categories: categories.map(row => this.categoryView(row, limits)), grades, rates: rates.map(row => this.rateView(row)), reports: views.map(named),
      advances: advances.filter(row => { const person = people.get(row.employeeId); return !!person && inBranchScope(scope, person.branchId) }).map(row => named(this.advanceView(row))) }
  }

  /**
   * (ب) خطوة المالية على سلفة موظف في نطاق الحساب (فرعه الحالي، والحكم بعد قفل صف السلفة): «paid» تسجيل الصرف النقدي، و«returned» قفلها
   * «اترجّعت نقدًا» بملاحظة — لسلفة مصروفة مش مربوطة بتقرير. بيانات بس: مفيش قيد في الدفتر من هنا.
   */
  async advanceStep(user: JwtPayload, id: number, step: string, body: unknown) {
    if (step !== 'paid' && step !== 'returned') throw new BadRequestException(ADVANCE_STEP)
    const rawNote = ((body ?? {}) as Record<string, unknown>).note
    const note = typeof rawNote === 'string' ? rawNote.trim().replace(/\s+/g, ' ') : ''
    if (step === 'returned' && (note.length < 2 || note.length > 300)) throw new BadRequestException(ADVANCE_NOTE)
    return this.ds.transaction(async em => {
      if (!(await travelAdvancesReady(em))) throw new BadRequestException(ADVANCE_MIGRATION_MISSING)
      const advance = await em.getRepository(TravelAdvance).findOne({ where: { id }, lock: { mode: 'pessimistic_write' } })
      const [person]: Array<{ branchId: number | null }> = advance ? await em.query('SELECT [branchId] FROM dbo.employees WHERE [id] = @0', [advance.employeeId]) : []
      // سلفة موظف برّه النطاق زي اللي مش موجودة
      if (!advance || !person || !inBranchScope(branchScopeOf(user), idOf(person.branchId))) throw new NotFoundException(ADVANCE_NOT_FOUND)
      if (advance.status !== 'OPEN') throw new ConflictException(ADVANCE_CLOSED)
      const now = new Date()
      if (step === 'paid') {
        if (advance.paidAt != null) throw new ConflictException(ADVANCE_PAID)
        await em.getRepository(TravelAdvance).update({ id: advance.id }, { paidAt: now, paidByUserId: user.sub })
      } else {
        if (advance.paidAt == null) throw new BadRequestException(ADVANCE_UNPAID)
        if (advance.reportId != null) throw new ConflictException(ADVANCE_LINKED)
        await em.getRepository(TravelAdvance).update({ id: advance.id }, { status: 'RETURNED', closedAt: now, closedByUserId: user.sub, closeNote: note })
      }
      await recordAudit(em, { category: 'SETTINGS', action: step === 'paid' ? 'TRAVEL_ADVANCE_PAID' : 'TRAVEL_ADVANCE_RETURNED', entityType: 'travel_advance', entityId: String(advance.id), actorUserId: user.sub,
        branchId: idOf(person.branchId) ?? undefined, summary: `سلفة المأمورية ${advanceCode(advance.id)} بمبلغ ${Number(advance.amount)}: ${step === 'paid' ? 'اتسجّل صرفها' : 'اتقفلت «اترجّعت نقدًا»'}`,
        after: { status: step === 'paid' ? 'OPEN' : 'RETURNED', paid: true, employeeId: advance.employeeId } })
      return { id: advance.id }
    })
  }

  /** اسم الفئة مايتكررش: الحكم تحت قفل مدى على الاسم */
  private async assertNameFree(em: EntityManager, name: string, exceptId: number | null) {
    const rows: Array<{ id: number }> = await em.query('SELECT [id] FROM dbo.expense_categories WITH (UPDLOCK, HOLDLOCK) WHERE [name] = @0', [name])
    if (rows.some(row => Number(row.id) !== exceptId)) throw new ConflictException(CATEGORY_NAME_TAKEN)
  }

  /** (ج) حدود الدرجات على الفئة بتتكتب كلها مع بعض (تحت قفل صف الفئة أو في معاملة إنشائها): القديم بيتشال والجديد بيتحط */
  private async writeGradeLimits(em: EntityManager, categoryId: number, limits: Array<{ gradeId: number; limitPerLine: number }>, userId: number) {
    if (limits.length) {
      const found: Array<{ id: number }> = await em.query(`SELECT [id] FROM [grades] WHERE [id] IN (${limits.map((_, index) => `@${index}`).join(', ')})`, limits.map(row => row.gradeId))
      if (found.length !== limits.length) throw new BadRequestException(GRADE_UNKNOWN)
    }
    const repo = em.getRepository(ExpenseCategoryLimit)
    await repo.delete({ categoryId })
    const now = new Date()
    if (limits.length) await repo.save(limits.map(row => repo.create({ categoryId, gradeId: row.gradeId, limitPerLine: row.limitPerLine, updatedByUserId: userId, updatedAt: now })))
  }

  async createCategory(user: JwtPayload, body: unknown) {
    assertCompanyWideWrite(user)
    const grade = gradeLimitsOf(((body ?? {}) as Record<string, unknown>).gradeLimits)
    if (grade.error) throw new BadRequestException(grade.error)
    const { fields, error } = categoryFields(body)
    if (!fields) throw new BadRequestException(error)
    return this.ds.transaction(async em => {
      await this.assertReady(em)
      await this.assertNameFree(em, fields.name, null)
      const row = await em.getRepository(ExpenseCategory).save(em.getRepository(ExpenseCategory).create({ ...fields, updatedByUserId: user.sub, updatedAt: new Date() }))
      if (grade.limits) await this.writeGradeLimits(em, row.id, grade.limits, user.sub)
      await recordAudit(em, { category: 'SETTINGS', action: 'EXPENSE_CATEGORY_CREATED', entityType: 'expense_category', entityId: String(row.id), actorUserId: user.sub,
        summary: `فئة مصروف جديدة «${row.name}»`, after: { ...this.categoryView(row), gradeLimits: grade.limits ?? [] } })
      return { id: row.id }
    })
  }

  async updateCategory(user: JwtPayload, id: number, body: unknown) {
    assertCompanyWideWrite(user)
    const grade = gradeLimitsOf(((body ?? {}) as Record<string, unknown>).gradeLimits)
    if (grade.error) throw new BadRequestException(grade.error)
    const { fields, error } = categoryFields(body)
    if (!fields) throw new BadRequestException(error)
    return this.ds.transaction(async em => {
      await this.assertReady(em)
      const row = await em.getRepository(ExpenseCategory).findOne({ where: { id }, lock: { mode: 'pessimistic_write' } })
      if (!row) throw new NotFoundException(CATEGORY_NOT_FOUND)
      await this.assertNameFree(em, fields.name, row.id)
      const before = this.categoryView(row, await em.getRepository(ExpenseCategoryLimit).find({ where: { categoryId: row.id }, order: { gradeId: 'ASC' } }))
      await em.getRepository(ExpenseCategory).update({ id: row.id }, { ...fields, updatedByUserId: user.sub, updatedAt: new Date() })
      if (grade.limits) await this.writeGradeLimits(em, row.id, grade.limits, user.sub)
      await recordAudit(em, { category: 'SETTINGS', action: 'EXPENSE_CATEGORY_UPDATED', entityType: 'expense_category', entityId: String(row.id), actorUserId: user.sub,
        summary: `تعديل فئة المصروف «${fields.name}»`, before, after: { id: row.id, ...fields, gradeLimits: grade.limits ?? before.gradeLimits } })
      return { id: row.id }
    })
  }

  /**
   * (ج) إضافة سعر بدل يومي (من غير `id`) أو تعديله — تعريف للشركة كلها: الفئة موجودة ومفعّلة، والدرجة موجودة (أو كل الدرجات)، وسعر مفعّل واحد
   * للوجهة والدرجة (الحكم تحت قفل مدى على أسعار الوجهة). وبسطر تدقيق.
   */
  async saveRate(user: JwtPayload, body: unknown, id?: number) {
    assertCompanyWideWrite(user)
    const { fields, error } = rateFields(body)
    if (!fields) throw new BadRequestException(error)
    return this.ds.transaction(async em => {
      await this.assertReady(em)
      const rates = em.getRepository(PerDiemRate)
      const same: Array<{ id: number; gradeId: number | null; isActive: boolean | number }> = await em.query('SELECT [id], [gradeId], [isActive] FROM dbo.per_diem_rates WITH (UPDLOCK, HOLDLOCK) WHERE [destination] = @0', [fields.destination])
      const existing = id == null ? null : await rates.findOne({ where: { id }, lock: { mode: 'pessimistic_write' } })
      if (id != null && !existing) throw new NotFoundException(RATE_NOT_FOUND)
      if (fields.isActive && same.some(row => Number(row.id) !== id && flag(row.isActive) && idOf(row.gradeId) === fields.gradeId)) throw new ConflictException(RATE_TAKEN)
      const category = await em.getRepository(ExpenseCategory).findOne({ where: { id: fields.categoryId } })
      if (!category || (fields.isActive && !flag(category.isActive))) throw new BadRequestException(RATE_CATEGORY)
      if (fields.gradeId !== null && !(await em.query('SELECT [id] FROM [grades] WHERE [id] = @0', [fields.gradeId])).length) throw new BadRequestException(GRADE_UNKNOWN)
      const values = { ...fields, updatedByUserId: user.sub, updatedAt: new Date() }
      const row = existing ? { ...existing, ...values } : await rates.save(rates.create(values))
      if (existing) await rates.update({ id: existing.id }, values)
      await recordAudit(em, { category: 'SETTINGS', action: existing ? 'PER_DIEM_RATE_UPDATED' : 'PER_DIEM_RATE_CREATED', entityType: 'per_diem_rate', entityId: String(row.id), actorUserId: user.sub,
        summary: `${existing ? 'تعديل' : 'إضافة'} سعر البدل اليومي لـ«${fields.destination}»: ${fields.dailyAmount}`, before: existing ? this.rateView(existing) : undefined, after: { id: row.id, ...fields } })
      return { id: row.id }
    })
  }
}
