import { BadRequestException, Injectable } from '@nestjs/common'
import { InjectDataSource } from '@nestjs/typeorm'
import { DataSource } from 'typeorm'
import { localDateOf } from '../attendance/attendance.service'
import type { JwtPayload } from '../auth/auth.service'
import { assertCompanyWideWrite } from '../auth/guards'
import { readBulkFile, writeBulkWorkbook } from '../employees/employee-bulk-update.sheet'
import type { CreateEmployeeDto } from '../employees/employees.dto'
import { employeeCreateIssue, EmployeesService } from '../employees/employees.service'
import type { CreateBranchDto, CreateDepartmentDto } from '../org/org.dto'
import { OrgService } from '../org/org.service'
import { duplicatesIn, employeeDraft, IMPORT_COLUMNS, IMPORT_KIND_LABELS, importRows, isImportKind, structureShapeIssues, type ImportKind, type ImportRow } from './setup-import'

// B6.1 (ب): مستوردات تجهيز العميل — لحساب بكل الفروع بصلاحية الإعدادات. المعاينة مابتكتبش حاجة؛ والتطبيق بيعيد بناء نفس الخطة من الملف ويرفض لو فيها أي
// خطأ، وبعدها بيكتب بخدمات الإنشاء القايمة نفسها (`OrgService.createBranch/createDepartment` و`EmployeesService.create`) — من غير إدخال مباشر في الجداول.
// الموجود قبل كده (فرع بكوده، قسم باسمه في فرعه، موظف برقم بصمته) بيتخطّى، فإعادة رفع نفس الملف آمنة.

export interface ImportUploadedFile { buffer: Buffer; originalname: string; size: number }
type Status = 'NEW' | 'EXISTS' | 'ERROR'
interface PlanRow { row: number; summary: string; status: Status; errors: string[]; work: Array<() => Promise<void>> }
interface BranchRef { id: number; code: string; name: string }

const lower = (value: string) => value.trim().toLowerCase()
const messageOf = (failure: unknown): string => {
  const response = (failure as { response?: { message?: unknown } })?.response?.message
  return String(Array.isArray(response) ? response[0] : response ?? (failure as { message?: unknown })?.message ?? failure)
}

@Injectable()
export class SetupImportService {
  constructor(@InjectDataSource() private readonly ds: DataSource, private readonly org: OrgService, private readonly employees: EmployeesService) {}

  private kindOf(raw: unknown): ImportKind {
    if (!isImportKind(raw)) throw new BadRequestException('نوع الاستيراد مش معروف')
    return raw
  }

  /** قالب فاضي بعناوينه وملاحظاته */
  async template(user: JwtPayload, rawKind: unknown) {
    assertCompanyWideWrite(user)
    const kind = this.kindOf(rawKind)
    const buffer = await writeBulkWorkbook({ columns: IMPORT_COLUMNS[kind].map(column => ({ header: column.header, width: column.width, text: !column.money, money: column.money, list: column.list, note: column.note })),
      rows: [], references: [], instructions: [`قالب استيراد ${IMPORT_KIND_LABELS[kind]}.`, 'الصف الأول عناوين — ماتغيّرهاش. املا من الصف التاني.', 'ارفع الملف للمعاينة الأول: مفيش حاجة بتتحفظ قبل ما تراجع النتيجة وتأكد.',
        'الموجود قبل كده بيتخطّى، فإعادة رفع نفس الملف آمنة.'] })
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

  private async plan(user: JwtPayload, rawKind: unknown, file: ImportUploadedFile | undefined): Promise<{ kind: ImportKind; rows: PlanRow[] }> {
    assertCompanyWideWrite(user)
    const kind = this.kindOf(rawKind)
    if (!file?.buffer?.length) throw new BadRequestException('ارفع ملف القالب')
    const { rows, fileError } = importRows(kind, await readBulkFile(file.buffer, file.originalname))
    if (fileError) throw new BadRequestException(fileError)
    return { kind, rows: kind === 'structure' ? await this.structurePlan(rows, user) : await this.employeePlan(rows, user) }
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
