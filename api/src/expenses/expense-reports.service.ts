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
  categoryFields, EXPENSE_MIGRATION_MISSING, EXPENSE_REPORT_HANDLER, ExpenseCategory, ExpenseLine, ExpenseReport, expenseReportsReady, lineFields, lineIssue, LINES_MAX, lockReport, phaseEditable,
  REPORT_NOT_FOUND, REPORT_PHASE_LABELS, reportCode, reportFields, reportPhase, type ReportPhase,
} from './expense-reports'

// B5.3 (أ): تقارير المصروفات — الموظف لتقاريره (مسودة وبنود وإيصالات)، وصاحب `expenses.manage` للفئات (تعريف للشركة كلها) ولقراءة تقارير
// موظفين نطاق فروعه (فرع الموظف الحالي). التقديم والاعتماد والصرف في محرك الطلبات (expense-reports.ts). أي تعديل تحت قفل صف التقرير،
// بترتيب الأقفال الواحد: صف الطلب ← صف التقرير.

const NOT_EMPLOYEE = 'حسابك مش مربوط بملف موظف'
const NOT_EDITABLE = 'التقرير تحت الاعتماد أو اتعتمد — مايتعدّلش'
const LINE_NOT_FOUND = 'البند مش موجود'
const CATEGORY_NOT_FOUND = 'فئة المصروف مش موجودة'
const CATEGORY_NAME_TAKEN = 'فيه فئة بنفس الاسم'
const RECEIPT_INVALID = 'إيصال البند لازم يكون ملف رفعته إنت لنفسك من الشاشة دي'
const DELETE_FILED = 'تقرير اتقدّم قبل كده مايتمسحش'
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

  private categoryView(row: ExpenseCategory) {
    return { id: row.id, name: row.name, limitPerLine: row.limitPerLine == null ? null : Number(row.limitPerLine), limitMode: row.limitMode, receiptRequired: flag(row.receiptRequired), isActive: flag(row.isActive) }
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
    return reports.map(report => {
      const requestId = idOf(report.requestId)
      const phase: ReportPhase = reportPhase(report.status, requestId === null ? null : statuses.get(requestId) ?? null)
      const own = lines.filter(line => line.reportId === report.id).map(line => {
        const category = categories.get(line.categoryId)
        const issue = lineIssue(category, line, true)
        return { id: line.id, categoryId: line.categoryId, categoryName: category?.name ?? '—', expenseDate: ymd(line.expenseDate), amount: Number(line.amount), note: line.note ?? null,
          receiptFileId: idOf(line.receiptFileId), warning: issue.warn, problem: issue.block }
      })
      return { id: report.id, code: reportCode(report.id), employeeId: report.employeeId, title: report.title, tripFrom: ymd(report.tripFrom), tripTo: ymd(report.tripTo), phase, phaseLabel: REPORT_PHASE_LABELS[phase],
        editable: phaseEditable(phase), requestId, total: Math.round(own.reduce((sum, line) => sum + Math.round(line.amount * 100), 0)) / 100, submittedAt: report.submittedAt ?? null,
        approvedAt: report.approvedAt ?? null, lines: own }
    })
  }

  // ===== الموظف: تقاريره =====

  /** «مصروفاتي»: تقارير الحساب، والفئات المفعّلة، وعملة فرعه، ونوع الطلب اللي التقرير بيتقدّم بيه (لو متعرّف) */
  async mine(user: JwtPayload) {
    const em = this.ds.manager, employeeId = this.employeeOf(user)
    if (!(await expenseReportsReady(em))) return { ready: false, currency: null, requestTypeCode: null, categories: [], reports: [] }
    const [person]: Array<{ branchId: number | null }> = await em.query('SELECT [branchId] FROM dbo.employees WHERE [id] = @0', [employeeId])
    const currencyOf = await readBranchCurrencyOf(em)
    const type = await em.getRepository(RequestType).findOne({ where: { destinationHandler: EXPENSE_REPORT_HANDLER, isActive: true }, order: { id: 'ASC' } })
    const categories = await em.getRepository(ExpenseCategory).find({ where: { isActive: true }, order: { name: 'ASC', id: 'ASC' } })
    const reports = await em.getRepository(ExpenseReport).find({ where: { employeeId }, order: { id: 'DESC' } })
    return { ready: true, currency: currencyOf(idOf(person?.branchId)), requestTypeCode: type?.code ?? null, categories: categories.map(row => this.categoryView(row)), reports: await this.reportViews(em, reports) }
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
      const issue = lineIssue(category, fields, false)
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

  async removeLine(user: JwtPayload, reportId: number, lineId: number) {
    return this.ds.transaction(async em => {
      const report = await this.lockOwnEditable(em, user, reportId)
      const removed = await em.getRepository(ExpenseLine).delete({ id: lineId, reportId: report.id })
      if (!removed.affected) throw new NotFoundException(LINE_NOT_FOUND)
      await em.getRepository(ExpenseReport).update({ id: report.id }, { updatedAt: new Date() })
      return { removed: true }
    })
  }

  // ===== الإدارة: الفئات وتقارير الموظفين =====

  /** الفئات كلها (بالمقفولة)، وتقارير موظفين نطاق الحساب اللي اتقدّمت — بفرع الموظف الحالي */
  async overview(user: JwtPayload) {
    const em = this.ds.manager, canEdit = branchScopeOf(user) === null
    if (!(await expenseReportsReady(em))) return { ready: false, canEdit, categories: [], reports: [] }
    const scope = branchScopeOf(user), currencyOf = await readBranchCurrencyOf(em)
    const categories = await em.getRepository(ExpenseCategory).find({ order: { name: 'ASC', id: 'ASC' } })
    const filed = await em.getRepository(ExpenseReport).find({ where: { status: In(['SUBMITTED', 'APPROVED']) }, order: { id: 'DESC' }, take: 300 })
    const employeeIds = [...new Set(filed.map(row => row.employeeId))]
    const people = new Map<number, { fullName: string; employeeCode: string | null; branchId: number | null }>()
    if (employeeIds.length) {
      const rows: Array<{ id: number; fullName: string; employeeCode: string | null; branchId: number | null }> = await em.query(
        `SELECT [id], [fullName], [employeeCode], [branchId] FROM dbo.employees WHERE [id] IN (${employeeIds.map((_, index) => `@${index}`).join(', ')})`, employeeIds)
      for (const row of rows) people.set(Number(row.id), { fullName: row.fullName, employeeCode: row.employeeCode ?? null, branchId: idOf(row.branchId) })
    }
    const visible = filed.filter(row => { const person = people.get(row.employeeId); return !!person && inBranchScope(scope, person.branchId) })
    const views = await this.reportViews(em, visible)
    return { ready: true, canEdit, categories: categories.map(row => this.categoryView(row)),
      reports: views.map(view => { const person = people.get(view.employeeId)!; return { ...view, employeeName: person.fullName, employeeCode: person.employeeCode, currency: currencyOf(person.branchId) } }) }
  }

  /** اسم الفئة مايتكررش: الحكم تحت قفل مدى على الاسم */
  private async assertNameFree(em: EntityManager, name: string, exceptId: number | null) {
    const rows: Array<{ id: number }> = await em.query('SELECT [id] FROM dbo.expense_categories WITH (UPDLOCK, HOLDLOCK) WHERE [name] = @0', [name])
    if (rows.some(row => Number(row.id) !== exceptId)) throw new ConflictException(CATEGORY_NAME_TAKEN)
  }

  async createCategory(user: JwtPayload, body: unknown) {
    assertCompanyWideWrite(user)
    const { fields, error } = categoryFields(body)
    if (!fields) throw new BadRequestException(error)
    return this.ds.transaction(async em => {
      await this.assertReady(em)
      await this.assertNameFree(em, fields.name, null)
      const row = await em.getRepository(ExpenseCategory).save(em.getRepository(ExpenseCategory).create({ ...fields, updatedByUserId: user.sub, updatedAt: new Date() }))
      await recordAudit(em, { category: 'SETTINGS', action: 'EXPENSE_CATEGORY_CREATED', entityType: 'expense_category', entityId: String(row.id), actorUserId: user.sub,
        summary: `فئة مصروف جديدة «${row.name}»`, after: this.categoryView(row) })
      return { id: row.id }
    })
  }

  async updateCategory(user: JwtPayload, id: number, body: unknown) {
    assertCompanyWideWrite(user)
    const { fields, error } = categoryFields(body)
    if (!fields) throw new BadRequestException(error)
    return this.ds.transaction(async em => {
      await this.assertReady(em)
      const row = await em.getRepository(ExpenseCategory).findOne({ where: { id }, lock: { mode: 'pessimistic_write' } })
      if (!row) throw new NotFoundException(CATEGORY_NOT_FOUND)
      await this.assertNameFree(em, fields.name, row.id)
      const before = this.categoryView(row)
      await em.getRepository(ExpenseCategory).update({ id: row.id }, { ...fields, updatedByUserId: user.sub, updatedAt: new Date() })
      await recordAudit(em, { category: 'SETTINGS', action: 'EXPENSE_CATEGORY_UPDATED', entityType: 'expense_category', entityId: String(row.id), actorUserId: user.sub,
        summary: `تعديل فئة المصروف «${fields.name}»`, before, after: { id: row.id, ...fields } })
      return { id: row.id }
    })
  }
}
