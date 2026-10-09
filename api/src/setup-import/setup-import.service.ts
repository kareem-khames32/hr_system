import { randomUUID } from 'node:crypto'
import { BadRequestException, ForbiddenException, Injectable } from '@nestjs/common'
import { InjectDataSource } from '@nestjs/typeorm'
import { DataSource } from 'typeorm'
import { localDateOf } from '../attendance/attendance.service'
import type { JwtPayload } from '../auth/auth.service'
import { assertCompanyWideWrite, userHasPerm } from '../auth/guards'
import { readBulkFile, writeBulkWorkbook } from '../employees/employee-bulk-update.sheet'
import type { CreateEmployeeDto } from '../employees/employees.dto'
import { employeeCreateIssue, EmployeesService } from '../employees/employees.service'
import type { CreateBranchDto, CreateDepartmentDto } from '../org/org.dto'
import { ModulesService } from '../modules-registry/modules.service'
import type { ModuleKey } from '../modules-registry/registry'
import { OrgService } from '../org/org.service'
import { LeaveBalancesService } from '../requests/leave-balances.service'
import { RequestsService } from '../requests/requests.service'
import { balanceDraft, duplicatesIn, employeeDraft, IMPORT_COLUMNS, IMPORT_KIND_LABELS, IMPORT_KIND_NOTES, importRows, isImportKind, LEGACY_LOAN_REASON, loanDraft, OPENING_BALANCE_REASON, structureShapeIssues,
  type ImportKind, type ImportRow } from './setup-import'

// B6.1 (ب): مستوردات تجهيز العميل — لحساب بكل الفروع بصلاحية الإعدادات. المعاينة مابتكتبش حاجة؛ والتطبيق بيعيد بناء نفس الخطة من الملف ويرفض لو فيها أي
// خطأ، وبعدها بيكتب بخدمات الإنشاء القايمة نفسها (`OrgService.createBranch/createDepartment` و`EmployeesService.create`) — من غير إدخال مباشر في الجداول.
// الموجود قبل كده (فرع بكوده، قسم باسمه في فرعه، موظف برقم بصمته) بيتخطّى، فإعادة رفع نفس الملف آمنة.
// B6.1 (ج): الأرصدة الافتتاحية بخدمة تعديل الرصيد القايمة (`LeaveBalancesService.adjust` بسببها وسجلّها)، والسلف القائمة **طلبات سلفة بالنيابة**
// (`RequestsService.create`) بتمشي في سلسلة الاعتماد والسقوف العادية — مفيش مبلغ بيتكتب من الملف مباشرة.

export interface ImportUploadedFile { buffer: Buffer; originalname: string; size: number }
type Status = 'NEW' | 'EXISTS' | 'ERROR'
interface PlanRow { row: number; summary: string; status: Status; errors: string[]; work: Array<() => Promise<void>> }
interface BranchRef { id: number; code: string; name: string }
interface EmployeeRef { id: number; fullName: string; status: string }
const cents = (value: number) => Math.round(value * 100) / 100
// طلبات السلف اللي لسه قايمة أو اتنفذت: صف الملف اللي ليه طلب بنفس المبلغ والأقساط والشهر بيتخطّى
const LIVE_LOAN_REQUEST = ['SUBMITTED', 'UNDER_REVIEW', 'APPROVED', 'IN_EXECUTION', 'COMPLETED', 'RETURNED_FOR_INFO']

const lower = (value: string) => value.trim().toLowerCase()
const messageOf = (failure: unknown): string => {
  const response = (failure as { response?: { message?: unknown } })?.response?.message
  return String(Array.isArray(response) ? response[0] : response ?? (failure as { message?: unknown })?.message ?? failure)
}

// CRP6A-B01: كل نوع استيراد بحراس مساره الأصلي — صلاحية المسار وموديوله بجمهور تفعيله — فوق صلاحية الإعدادات ونطاق «كل الفروع».
// الاستيراد مايعدّيش حاجة المسار نفسه بيرفضها للحساب ده.
const IMPORT_KIND_GATES: Record<ImportKind, { perms: string[]; modules: ModuleKey[]; denied: string; closed: string }> = {
  structure: { perms: ['org.manage'], modules: ['org'], denied: 'استيراد الهيكل محتاج صلاحية إدارة الهيكل', closed: 'موديول الهيكل مقفول' },
  employees: { perms: ['employees.create'], modules: ['employees'], denied: 'استيراد الموظفين محتاج صلاحية إضافة موظف', closed: 'موديول الموظفين مقفول' },
  balances: { perms: ['leave_balances.manage'], modules: ['leave'], denied: 'استيراد الأرصدة محتاج صلاحية إدارة أرصدة الإجازات', closed: 'موديول الإجازات مقفول' },
  loans: { perms: ['requests.create_on_behalf', 'loans.exceptional'], modules: ['requests', 'loans'], denied: 'استيراد السلف محتاج صلاحية تقديم الطلبات بالنيابة وصلاحية السلفة الاستثنائية', closed: 'موديول السلف مقفول' },
}

@Injectable()
export class SetupImportService {
  constructor(@InjectDataSource() private readonly ds: DataSource, private readonly org: OrgService, private readonly employees: EmployeesService,
    private readonly balances: LeaveBalancesService, private readonly requests: RequestsService, private readonly modules: ModulesService) {}

  private kindOf(raw: unknown): ImportKind {
    if (!isImportKind(raw)) throw new BadRequestException('نوع الاستيراد مش معروف')
    return raw
  }

  /** حراس المسار الأصلي للنوع: صلاحياته كلها، وموديولاته مفعّلة للحساب ده (جمهور التفعيل داخل) — قبل أي قراءة للملف */
  private async assertKindAllowed(user: JwtPayload, kind: ImportKind): Promise<void> {
    const gate = IMPORT_KIND_GATES[kind]
    if (!gate.perms.every(perm => userHasPerm(user, perm))) throw new ForbiddenException(gate.denied)
    for (const module of gate.modules) if (!(await this.modules.allowedFor(module, user))) throw new BadRequestException(gate.closed)
  }

  /** قالب فاضي بعناوينه وملاحظاته */
  async template(user: JwtPayload, rawKind: unknown) {
    assertCompanyWideWrite(user)
    const kind = this.kindOf(rawKind)
    await this.assertKindAllowed(user, kind)
    const buffer = await writeBulkWorkbook({ columns: IMPORT_COLUMNS[kind].map(column => ({ header: column.header, width: column.width, text: !column.money, money: column.money, list: column.list, note: column.note })),
      rows: [], references: [], instructions: [`قالب استيراد ${IMPORT_KIND_LABELS[kind]}.`, 'الصف الأول عناوين — ماتغيّرهاش. املا من الصف التاني.', 'ارفع الملف للمعاينة الأول: مفيش حاجة بتتحفظ قبل ما تراجع النتيجة وتأكد.',
        'الموجود قبل كده بيتخطّى، فإعادة رفع نفس الملف آمنة.', ...(IMPORT_KIND_NOTES[kind] ?? [])] })
    return { buffer, fileName: `قالب-${IMPORT_KIND_LABELS[kind]}.xlsx`, asciiName: `import-${kind}-template.xlsx` }
  }

  private async branches(): Promise<Map<string, BranchRef>> {
    const rows: BranchRef[] = await this.ds.query('SELECT [id], [code], [name] FROM dbo.branches')
    return new Map(rows.filter(row => row.code).map(row => [lower(String(row.code)), { id: Number(row.id), code: String(row.code), name: row.name }]))
  }

  private async departments(): Promise<Map<string, number>> {
    const rows: Array<{ id: number; name: string; branchId: number }> = await this.ds.query('SELECT [id], [name], [branchId] FROM dbo.departments')
    return new Map(rows.map(row => [`${Number(row.branchId)}:${lower(row.name)}`, Number(row.id)]))
  }

  private async structurePlan(rows: ImportRow[], user: JwtPayload): Promise<PlanRow[]> {
    const branches = await this.branches(), departments = await this.departments()
    // فروع الملف الجديدة: أول صف بيعرّف الفرع؛ والمعرّف بعد الإنشاء بيتحط هنا للصفوف اللي بعده
    const fresh = new Map<string, { row: number; id: number | null }>(), seenDepartments = new Set<string>()
    return rows.map(line => {
      const { values } = line, errors = [...line.errors, ...structureShapeIssues(values)], work: PlanRow['work'] = []
      const code = lower(values.branchCode), existing = branches.get(code) ?? null
      let createsBranch = false, createsDepartment = false
      if (!errors.length && !existing && !fresh.has(code)) {
        if (values.branchName.length < 2) errors.push('«اسم الفرع» مطلوب لفرع جديد')
        if (!values.country) errors.push('«الدولة» مطلوبة لفرع جديد')
        if (!errors.length) {
          createsBranch = true
          const slot = { row: line.row, id: null as number | null }
          fresh.set(code, slot)
          work.push(async () => { slot.id = Number((await this.org.createBranch({ name: values.branchName, code: values.branchCode, country: values.country.toUpperCase() } as CreateBranchDto, null, user.sub)).id) })
        }
      }
      if (!errors.length && values.department) {
        const key = `${code}:${lower(values.department)}`
        if (seenDepartments.has(key)) errors.push('القسم ده مكرر في الملف لنفس الفرع')
        seenDepartments.add(key)
        if (!errors.length && !(existing && departments.has(`${existing.id}:${lower(values.department)}`))) {
          createsDepartment = true
          work.push(async () => {
            const branchId = existing?.id ?? fresh.get(code)?.id
            if (branchId == null) throw new Error('الفرع مااتعملش')
            await this.org.createDepartment({ name: values.department, branchId } as CreateDepartmentDto, null)
          })
        }
      }
      const summary = `${values.branchCode}${values.department ? ` ← ${values.department}` : ''}`
      return { row: line.row, summary, errors, work: errors.length ? [] : work, status: errors.length ? 'ERROR' as const : createsBranch || createsDepartment ? 'NEW' as const : 'EXISTS' as const }
    })
  }

  private async employeePlan(rows: ImportRow[], user: JwtPayload): Promise<PlanRow[]> {
    const branches = await this.branches(), departments = await this.departments(), today = localDateOf(new Date())
    const taken: Array<{ fingerprintCode: string | null; nationalId: string | null; passportNo: string | null }> = await this.ds.query('SELECT [fingerprintCode], [nationalId], [passportNo] FROM dbo.employees')
    const prints = new Set(taken.map(row => lower(String(row.fingerprintCode ?? ''))).filter(Boolean))
    const identities = new Set(taken.flatMap(row => [row.nationalId, row.passportNo]).map(value => lower(String(value ?? ''))).filter(Boolean))
    const repeated = [duplicatesIn(rows, 'fingerprintCode', 'رقم البصمة'), duplicatesIn(rows, 'nationalId', 'رقم الهوية / الإقامة'), duplicatesIn(rows, 'passportNo', 'رقم جواز السفر')]
    return rows.map(line => {
      const { values } = line, { draft, issues } = employeeDraft(values)
      const errors = [...line.errors, ...issues, ...repeated.map(map => map.get(line.row)).filter((text): text is string => !!text)]
      const branch = branches.get(lower(values.branchCode)) ?? null
      if (values.branchCode && !branch) errors.push('«كود الفرع» مش موجود — ارفع ملف الهيكل الأول')
      const departmentId = branch ? departments.get(`${branch.id}:${lower(values.department)}`) ?? null : null
      if (branch && values.department && departmentId === null) errors.push('«القسم» مش موجود في الفرع ده — ارفع ملف الهيكل الأول')
      const summary = `${values.fingerprintCode} — ${values.fullName}`
      // موظف برقم البصمة ده موجود: بيتخطّى (إعادة رفع نفس الملف)
      if (!errors.length && prints.has(lower(values.fingerprintCode))) return { row: line.row, summary, status: 'EXISTS' as const, errors: [], work: [] }
      const dto = { ...draft, branchId: branch?.id, departmentId: departmentId ?? undefined }
      if (!errors.length) {
        const issue = employeeCreateIssue(dto, today)
        if (issue) errors.push(issue)
        else if ([values.nationalId, values.passportNo].some(value => value && identities.has(lower(value)))) errors.push('رقم الهوية أو الجواز مسجّل لموظف تاني')
      }
      return { row: line.row, summary, errors, status: errors.length ? 'ERROR' as const : 'NEW' as const,
        work: errors.length ? [] : [async () => { await this.employees.create({ ...dto } as unknown as CreateEmployeeDto, user.sub, null) }] }
    })
  }

  private async employeesByPrint(): Promise<Map<string, EmployeeRef>> {
    const rows: Array<{ id: number; fingerprintCode: string | null; fullName: string; status: string }> = await this.ds.query('SELECT [id], [fingerprintCode], [fullName], [status] FROM dbo.employees')
    return new Map(rows.filter(row => row.fingerprintCode).map(row => [lower(String(row.fingerprintCode)), { id: Number(row.id), fullName: row.fullName, status: row.status }]))
  }

  /** الرصيد الحقيقي دلوقتي (المتبقي ناقص العجز) — null لو مفيش صف رصيد للنوع ده لسه */
  private async remainingOf(employeeId: number, balanceType: 'annual' | 'sick') {
    const view = await this.balances.balanceOf(employeeId, balanceType)
    return view ? { period: view.period, shown: view.remaining, real: cents(view.remaining - view.deficit) } : null
  }

  // الأرصدة الافتتاحية: نفس صلاحية وموديول شاشة تعديل الرصيد، والكتابة بخدمتها (سبب، مفتاح عملية، سجل تعديلات، قفل الموظف)
  private async balancePlan(rows: ImportRow[], user: JwtPayload): Promise<PlanRow[]> {
    const people = await this.employeesByPrint(), seen = new Map<string, number>(), plan: PlanRow[] = []
    for (const line of rows) {
      const { values } = line, { balanceType, days, issues } = balanceDraft(values), errors = [...line.errors, ...issues]
      const person = people.get(lower(values.fingerprintCode)) ?? null
      if (values.fingerprintCode && !person) errors.push('«رقم البصمة» مش لموظف موجود — ارفع ملف الموظفين الأول')
      else if (person && ['archived', 'terminated'].includes(person.status)) errors.push('الموظف مؤرشف أو منتهية خدمته')
      const key = `${lower(values.fingerprintCode)}:${balanceType}`, first = seen.get(key)
      if (balanceType && first !== undefined) errors.push(`الموظف والنوع ده مكررين في الملف (الصف ${first})`)
      else if (balanceType) seen.set(key, line.row)
      const summary = `${values.fingerprintCode}${person ? ` — ${person.fullName}` : ''} · ${values.balanceType} ← ${values.remaining}`
      if (errors.length || !person || !balanceType || days === null) { plan.push({ row: line.row, summary, status: 'ERROR', errors: errors.length ? errors : ['الصف ناقص'], work: [] }); continue }
      const current = await this.remainingOf(person.id, balanceType)
      if (current && current.real === days) { plan.push({ row: line.row, summary, status: 'EXISTS', errors: [], work: [] }); continue }
      plan.push({ row: line.row, summary: `${summary}${current ? ` (الحالي ${current.real})` : ''}`, status: 'NEW', errors: [], work: [async () => {
        // الفرق بيتحسب وقت التطبيق من الرصيد وقتها، و`expectedRemaining` بيرفض لو الرصيد اتغيّر بين القراية والكتابة
        let now = await this.remainingOf(person.id, balanceType)
        if (!now) { await this.balances.ensureYearRows(localDateOf(new Date()).slice(0, 4)); now = await this.remainingOf(person.id, balanceType) }
        if (!now) throw new BadRequestException('مفيش رصيد من النوع ده للموظف في السنة الجارية')
        const delta = cents(days - now.real)
        if (delta === 0) return
        await this.balances.adjust(person.id, { balanceType, period: now.period, delta, reason: OPENING_BALANCE_REASON, idempotencyKey: randomUUID(), expectedRemaining: now.shown }, user.sub, null)
      }] })
    }
    return plan
  }

  // السلف القائمة: كل صف = طلب سلفة استثنائية بالنيابة (المتبقي على عدد الأقساط من شهر أول قسط) — بنفس صلاحيات الشاشة، والطلب بيمشي في الاعتماد والسقوف
  private async loanPlan(rows: ImportRow[], user: JwtPayload): Promise<PlanRow[]> {
    const people = await this.employeesByPrint(), currentPeriod = localDateOf(new Date()).slice(0, 7)
    const existing: Array<{ requesterId: number; payload: string | null }> = await this.ds.query(
      `SELECT [requesterId], [payload] FROM dbo.requests WHERE [typeCode] = N'LOAN' AND [status] IN (${LIVE_LOAN_REQUEST.map(status => `N'${status}'`).join(', ')})`)
    const signature = (employeeId: number, amount: unknown, months: unknown, period: unknown) => `${employeeId}:${Number(amount).toFixed(2)}:${Number(months)}:${String(period ?? '').slice(0, 7)}`
    const live = new Set<string>()
    for (const row of existing) {
      try { const payload = JSON.parse(row.payload || '{}'); live.add(signature(Number(row.requesterId), payload.amount, payload.months ?? 1, payload.firstInstallmentPeriod)) } catch { /* حمولة تالفة مابتتحسبش موجودة */ }
    }
    const seen = new Map<string, number>()
    return rows.map(line => {
      const { values } = line, draft = loanDraft(values, currentPeriod), errors = [...line.errors, ...draft.issues]
      const person = people.get(lower(values.fingerprintCode)) ?? null
      if (values.fingerprintCode && !person) errors.push('«رقم البصمة» مش لموظف موجود — ارفع ملف الموظفين الأول')
      else if (person && ['archived', 'terminated'].includes(person.status)) errors.push('الموظف مؤرشف أو منتهية خدمته')
      const summary = `${values.fingerprintCode}${person ? ` — ${person.fullName}` : ''} · ${values.amount} على ${values.months} قسط من ${values.firstInstallmentPeriod}`
      if (errors.length || !person || !draft.amount || !draft.months || !draft.firstInstallmentPeriod) return { row: line.row, summary, status: 'ERROR' as const, errors: errors.length ? errors : ['الصف ناقص'], work: [] }
      const key = signature(person.id, draft.amount, draft.months, draft.firstInstallmentPeriod), first = seen.get(key)
      if (first !== undefined) return { row: line.row, summary, status: 'ERROR' as const, errors: [`نفس السلفة مكررة في الملف (الصف ${first})`], work: [] }
      seen.set(key, line.row)
      if (live.has(key)) return { row: line.row, summary, status: 'EXISTS' as const, errors: [], work: [] }
      const payload = { amount: draft.amount, months: draft.months, exceptional: true, exceptionalCategory: 'OTHER', firstInstallmentPeriod: draft.firstInstallmentPeriod, reason: LEGACY_LOAN_REASON }
      return { row: line.row, summary, status: 'NEW' as const, errors: [], work: [async () => { await this.requests.create(user, { typeCode: 'LOAN', onBehalfEmployeeId: person.id, submit: true, payload }) }] }
    })
  }

  private async plan(user: JwtPayload, rawKind: unknown, file: ImportUploadedFile | undefined): Promise<{ kind: ImportKind; rows: PlanRow[] }> {
    assertCompanyWideWrite(user)
    const kind = this.kindOf(rawKind)
    await this.assertKindAllowed(user, kind)
    if (!file?.buffer?.length) throw new BadRequestException('ارفع ملف القالب')
    const { rows, fileError } = importRows(kind, await readBulkFile(file.buffer, file.originalname))
    if (fileError) throw new BadRequestException(fileError)
    const plans: Record<ImportKind, () => Promise<PlanRow[]>> = { structure: () => this.structurePlan(rows, user), employees: () => this.employeePlan(rows, user),
      balances: () => this.balancePlan(rows, user), loans: () => this.loanPlan(rows, user) }
    return { kind, rows: await plans[kind]() }
  }

  private report(kind: ImportKind, rows: PlanRow[]) {
    const count = (status: Status) => rows.filter(row => row.status === status).length
    return { kind, total: rows.length, toCreate: count('NEW'), existing: count('EXISTS'), withErrors: count('ERROR'), canApply: count('ERROR') === 0 && count('NEW') > 0,
      rows: rows.filter(row => row.status !== 'EXISTS').slice(0, 500).map(row => ({ row: row.row, summary: row.summary, status: row.status, errors: row.errors })) }
  }

  /** المعاينة: الخطة وأخطاؤها بالصف — من غير أي كتابة */
  async preview(user: JwtPayload, rawKind: unknown, file: ImportUploadedFile | undefined) {
    const { kind, rows } = await this.plan(user, rawKind, file)
    return this.report(kind, rows)
  }

  /**
   * التطبيق: نفس الخطة من الملف نفسه؛ أي صف فيه خطأ = مفيش حاجة بتتكتب. الكتابة صف بصف بخدمات الإنشاء القايمة (كل واحدة بمعاملتها وفحوصها)،
   * ولو خدمة رفضت صف: التطبيق بيقف عنده وبيقول اتعمل كام واللي وقف عنده ليه — واللي اتعمل بيتخطّى في إعادة الرفع.
   */
  async apply(user: JwtPayload, rawKind: unknown, file: ImportUploadedFile | undefined) {
    const { kind, rows } = await this.plan(user, rawKind, file)
    const report = this.report(kind, rows)
    if (report.withErrors) throw new BadRequestException({ message: `الملف فيه ${report.withErrors} صف بأخطاء — صلّحها وارفعه تاني (مفيش حاجة اتحفظت)`, report })
    let created = 0
    for (const row of rows.filter(item => item.status === 'NEW')) {
      try { for (const step of row.work) await step() } catch (failure) {
        return { kind, total: report.total, created, existing: report.existing, stoppedAt: { row: row.row, summary: row.summary, error: messageOf(failure) } }
      }
      created++
    }
    return { kind, total: report.total, created, existing: report.existing, stoppedAt: null }
  }
}
