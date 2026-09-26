// تحديث بيانات مجموعة موظفين من ملف (Excel/CSV) بكود الموظف.
// المعاينة بتقرا بس — مفيش أي حفظ. التطبيق: الصفوف السليمة بس، كل موظف في معاملته، عبر نفس مسار تعديل ملف الموظف
// (EmployeesService.update): الأجر في سجل الأجر المؤرخ، نقل الفرع في سجل فرع الموظف، وسجل التغييرات في نفس المعاملة.
import { BadRequestException, ConflictException, ForbiddenException, HttpException, Injectable, Logger } from '@nestjs/common'
import { plainToInstance } from 'class-transformer'
import { validate, type ValidationError } from 'class-validator'
import { DataSource } from 'typeorm'
import type { JwtPayload } from '../auth/auth.service'
import { andBranchScopeSql, branchScopeOf, inBranchScope, userHasPerm } from '../auth/guards'
import type { BranchScope } from '../auth/guards'
import { readCalendarSource } from '../attendance/attendance-calendar-history'
import { localDateOf } from '../attendance/attendance.service'
import { PAY_METHOD_LABELS } from '../payroll/pay-split'
import { payrollPeriodOfDate } from '../payroll/payroll-period'
import { readSalaryCycleStartDay } from '../payroll/payroll-salary-change'
import type { Employee } from './employee.entity'
import { UpdateEmployeeDto } from './employees.dto'
import { EmployeesService } from './employees.service'
import type { BulkUpdateOptionsDto, BulkUpdateTemplateDto } from './employee-bulk-update.dto'
import {
  BULK_CLEAR_WORD, BULK_CODE_HEADER, BULK_FIELD_BY_KEY, BULK_NAME_HEADER, BULK_SALARY_MONTH_HEADER, BULK_UPDATE_MAX_ROWS,
  bulkFieldsUseSalary, CONTRACT_TYPE_OPTIONS, GENDER_OPTIONS, parseBulkDate, parseBulkMonth, toCsv,
  type BulkFieldKey,
} from './employee-bulk-update.fields'
import {
  bulkLookupKeys, normalizeBulkCode, orderedBulkFields, planBulkUpdate, readBulkSheet, SALARY_KEYS, uniqueKey,
  type BulkEmployeeSnapshot, type BulkHolder, type BulkLookups, type BulkPlan, type BulkPlanRow, type BulkUniqueField,
} from './employee-bulk-update.plan'
import { BULK_CONTENT_TYPES, readBulkFile, writeBulkWorkbook, type BulkFileFormat, type BulkReferenceTable } from './employee-bulk-update.sheet'

export interface BulkUploadedFile { buffer: Buffer; originalname: string; size: number }
type Lookups = Omit<BulkLookups, 'employees' | 'people' | 'holders'>

const SNAPSHOT_SELECT = `SELECT e.[id], e.[employeeCode], e.[fullName], e.[status], e.[branchId], e.[departmentId], e.[teamId],
  e.[managerEmployeeId], e.[costCenterId], e.[gradeId], e.[jobTitle], e.[phone], e.[email], e.[nationalId], e.[nationality], e.[gender],
  CONVERT(varchar(10), e.[birthDate], 23) AS [birthDate], e.[fingerprintCode], e.[contractType],
  CONVERT(varchar(10), e.[contractStart], 23) AS [contractStart], CONVERT(varchar(10), e.[contractEnd], 23) AS [contractEnd],
  e.[bankName], e.[iban], e.[payMethod], CAST(e.[bankTransferAmount] AS nvarchar(80)) AS [bankTransferAmount], e.[gosiNumber],
  e.[isGosiRegistered], CAST(e.[gosiBaseSalary] AS nvarchar(80)) AS [gosiBaseSalary], e.[currency],
  ${SALARY_KEYS.map(key => `CAST(e.[${key}] AS nvarchar(80)) AS [${key}]`).join(', ')}
  FROM dbo.employees e`
const UNIQUE_COLUMNS: Record<BulkUniqueField, string> = { fingerprintCode: 'fingerprintCode', nationalId: 'nationalId', email: 'email' }
const CHUNK = 500

const bad = (message: string): never => { throw new BadRequestException({ code: 'BULK_UPDATE_INVALID', message }) }

/** اسم الملف كما رفعه المستخدم (multer بيقرأ الأسماء العربي latin1 أحيانًا). */
function uploadName(name: string): string {
  const raw = String(name ?? '').slice(0, 200)
  if (/[À-ÿ]/.test(raw)) {
    const decoded = Buffer.from(raw, 'latin1').toString('utf8')
    if (!decoded.includes('�')) return decoded
  }
  return raw || 'ملف'
}

function flattenValidation(errors: ValidationError[]): string[] {
  return errors.flatMap(error => [...Object.values(error.constraints ?? {}), ...flattenValidation(error.children ?? [])])
}

/** رسالة الخطأ للمستخدم: رسائل الخادم العربية كما هي، وغيرها جملة عامة (بلا تفاصيل داخلية أو بيانات). */
function rowErrorMessage(error: unknown): string {
  if (error instanceof HttpException) {
    const response = error.getResponse() as string | { message?: unknown }
    const message = typeof response === 'string' ? response : response?.message
    const text = Array.isArray(message) ? message.join('، ') : String(message ?? '')
    if (/[؀-ۿ]/.test(text)) return text
    return error.getStatus() === 403 ? 'مالكش صلاحية تعدّل الموظف ده' : 'تعذر حفظ الصف — راجع القيم'
  }
  return 'تعذر حفظ الصف — خطأ غير متوقع في الخادم، حاول تاني'
}

@Injectable()
export class EmployeeBulkUpdateService {
  private readonly logger = new Logger(EmployeeBulkUpdateService.name)

  constructor(
    private readonly ds: DataSource,
    private readonly employees: EmployeesService
  ) {}

  // ===== القراءة من قاعدة البيانات (دفعات ≤ 500 قيمة — حد باراميترات SQL Server 2100) =====

  private async chunked<T>(values: ReadonlyArray<string | number>, query: (placeholders: string, params: Array<string | number>) => Promise<T[]>) {
    const rows: T[] = []
    for (let start = 0; start < values.length; start += CHUNK) {
      const part = values.slice(start, start + CHUNK)
      rows.push(...await query(part.map((_, index) => `@${index}`).join(', '), [...part]))
    }
    return rows
  }

  private async snapshotsByCode(codes: string[]): Promise<Map<string, BulkEmployeeSnapshot>> {
    const rows = await this.chunked<BulkEmployeeSnapshot>(codes, (list, params) =>
      this.ds.query(`${SNAPSHOT_SELECT} WHERE UPPER(REPLACE(e.[employeeCode], ' ', '')) IN (${list})`, params))
    return new Map(rows.map(row => [normalizeBulkCode(row.employeeCode), row]))
  }

  private async snapshotsById(ids: number[], branchScope: BranchScope): Promise<BulkEmployeeSnapshot[]> {
    const rows = await this.chunked<BulkEmployeeSnapshot>(ids, (list, params) => {
      // فروع النطاق معاملات بعد أرقام الموظفين — مش ملزوقة في نص الاستعلام
      const all: unknown[] = [...params]
      const inScope = andBranchScopeSql('e.[branchId]', branchScope, all)
      return this.ds.query(`${SNAPSHOT_SELECT} WHERE e.[id] IN (${list}) ${inScope}`, all)
    })
    return rows.sort((a, b) => a.employeeCode.localeCompare(b.employeeCode, 'en', { numeric: true }))
  }

  private async people(ids: number[]) {
    const rows = await this.chunked<{ id: number; employeeCode: string; fullName: string }>([...new Set(ids)], (list, params) =>
      this.ds.query(`SELECT [id], [employeeCode], [fullName] FROM dbo.employees WHERE [id] IN (${list})`, params))
    return new Map(rows.map(row => [row.id, { employeeCode: row.employeeCode, fullName: row.fullName }]))
  }

  private async holders(field: BulkUniqueField, values: string[]) {
    const column = UNIQUE_COLUMNS[field]
    const rows = await this.chunked<BulkHolder & { value: string }>(values, (list, params) =>
      this.ds.query(`SELECT [id], [fullName], [branchId], [${column}] AS [value] FROM dbo.employees WHERE [${column}] IN (${list})`, params))
    const map = new Map<string, BulkHolder[]>()
    for (const row of rows) {
      const key = uniqueKey(field, String(row.value))
      map.set(key, [...(map.get(key) ?? []), { id: row.id, fullName: row.fullName, branchId: row.branchId }])
    }
    return map
  }

  private async catalogs(): Promise<Lookups> {
    const [branches, departments, teams, costCenters, grades, jobTitles] = await Promise.all([
      this.ds.query(`SELECT [id], [name], [isActive] FROM dbo.branches`),
      this.ds.query(`SELECT [id], [name], [branchId], [isActive] FROM dbo.departments`),
      this.ds.query(`SELECT [id], [name], [departmentId], [isActive] FROM dbo.teams`),
      this.ds.query(`SELECT [id], [code], [name], [isActive] FROM dbo.cost_centers`),
      this.ds.query(`SELECT [id], [name], [isActive] FROM dbo.grades`),
      this.ds.query(`SELECT [title], [isActive] FROM dbo.job_titles`),
    ])
    return { branches, departments, teams, costCenters, grades, jobTitles }
  }

  private async currentPayrollPeriod(): Promise<string | null> {
    try {
      return payrollPeriodOfDate(localDateOf(new Date()), await readSalaryCycleStartDay(this.ds.manager))
    } catch {
      return null
    }
  }

  // ===== الخطة =====

  private async buildPlan(file: BulkUploadedFile | undefined, body: BulkUpdateOptionsDto, user: JwtPayload, mode: 'preview' | 'apply') {
    if (!file?.buffer?.length) bad('ارفع الملف (Excel أو CSV)')
    const fileName = uploadName(file!.originalname)
    const sheet = await readBulkFile(file!.buffer, fileName)
    const parsed = readBulkSheet(sheet)
    const salaryMonth = body.salaryMonth?.trim() ? parseBulkMonth(body.salaryMonth) : null
    if (body.salaryMonth?.trim() && !salaryMonth) bad('«يسري من راتب شهر» بالشكل 2026-09')
    const keys = bulkLookupKeys(parsed)
    const employees = await this.snapshotsByCode(keys.codes)
    const managerIds = [...employees.values()].map(row => row.managerEmployeeId).filter((id): id is number => id !== null)
    const [people, catalogs, fingerprintCode, nationalId, email, currentPayrollPeriod] = await Promise.all([
      this.people(managerIds), this.catalogs(),
      this.holders('fingerprintCode', keys.fingerprintCodes), this.holders('nationalId', keys.nationalIds), this.holders('email', keys.emails),
      parsed.fields.some(key => BULK_FIELD_BY_KEY.get(key)?.salary) ? this.currentPayrollPeriod() : Promise.resolve(null),
    ])
    const plan = planBulkUpdate(parsed, { ...catalogs, employees, people, holders: { fingerprintCode, nationalId, email } }, {
      branchScope: branchScopeOf(user), today: localDateOf(new Date()), currentPayrollPeriod,
      canChangeSalary: userHasPerm(user, 'payroll.approve'), salaryMonth, mode,
    })
    // نفس تحقق حقول شاشة التعديل (UpdateEmployeeDto) على كل صف جاهز — الخطأ يبان في المعاينة مش وقت الحفظ
    for (const row of plan.rows.filter(row => row.status === 'ready' && Object.keys(row.update).length)) {
      const messages = flattenValidation(await validate(plainToInstance(UpdateEmployeeDto, row.update), { whitelist: true, forbidNonWhitelisted: true }))
      if (messages.length) {
        row.errors.push(...messages)
        row.status = 'error'
        row.update = {}
        row.salary = null
        row.branchChange = false
      }
    }
    plan.summary = { total: plan.rows.length, ready: plan.rows.filter(row => row.status === 'ready').length,
      unchanged: plan.rows.filter(row => row.status === 'unchanged').length, error: plan.rows.filter(row => row.status === 'error').length }
    const ready = plan.rows.filter(row => row.status === 'ready')
    plan.needs = { salary: ready.some(row => row.salary), salaryMonth: ready.some(row => row.salary && !row.salary.month), org: ready.some(row => row.branchChange) }
    return { plan, fileName, format: sheet.format, currentPayrollPeriod }
  }

  private publicPlan(plan: BulkPlan) {
    return {
      columns: plan.columns,
      ignoredColumns: plan.ignoredColumns,
      fileErrors: plan.fileErrors,
      summary: plan.summary,
      needs: plan.needs,
      rows: plan.rows.map(({ update: _update, salary, branchChange, ...row }) => ({ ...row, salaryMonth: salary?.month ?? null, branchChange })),
    }
  }

  async preview(file: BulkUploadedFile | undefined, body: BulkUpdateOptionsDto, user: JwtPayload) {
    const { plan, fileName, format, currentPayrollPeriod } = await this.buildPlan(file, body, user, 'preview')
    return { fileName, format, currentPayrollPeriod, maxRows: BULK_UPDATE_MAX_ROWS, ...this.publicPlan(plan) }
  }

  // ===== التطبيق =====

  private salaryEvidence(body: BulkUpdateOptionsDto) {
    const reason = body.salaryReason?.trim() ?? '', evidence = body.salaryEvidence?.trim() ?? ''
    if (!reason || reason.length > 500) bad('اكتب سبب تغيير الراتب (لحد 500 حرف)')
    if (!evidence || evidence.length > 200) bad('اكتب مرجع قرار تغيير الراتب (رقم القرار أو الخطاب — لحد 200 حرف)')
    return { reason, evidence }
  }

  private orgChange(body: BulkUpdateOptionsDto) {
    const effectiveFrom = body.orgEffectiveFrom?.trim() ? parseBulkDate(body.orgEffectiveFrom) : null
    const reason = body.orgReason?.trim() ?? ''
    if (!effectiveFrom) bad('اختار تاريخ سريان نقل الفرع')
    if (effectiveFrom! > localDateOf(new Date())) bad('نقل الفرع من الملف يسري النهارده أو في تاريخ فات — النقل المستقبلي بطلب نقل')
    if (reason.length < 3 || reason.length > 500) bad('اكتب سبب نقل الفرع (من 3 لـ500 حرف)')
    return { effectiveFrom: effectiveFrom!, reason }
  }

  private async applyRow(row: BulkPlanRow, user: JwtPayload, context: {
    auditReason: string; salary: { reason: string; evidence: string } | null; org: { effectiveFrom: string; reason: string } | null
  }) {
    const id = row.employeeId!
    const scope = branchScopeOf(user)
    const dto: Record<string, unknown> = { ...row.update }
    if (row.branchChange) {
      const source = await readCalendarSource(this.ds.manager, 'EMPLOYEE', id)
      dto.calendarChange = { effectiveFrom: context.org!.effectiveFrom, reason: context.org!.reason,
        expectedRevision: source.revision, expectedCurrentSourceHash: source.currentSourceHash }
    }
    if (row.salary) {
      const current = await this.employees.salaryChangeContext(id, scope)
      const drift = current.current.currency !== row.salary.currency
        || SALARY_KEYS.some(key => (current.current[key] ?? null) !== row.salary!.current[key])
      if (drift) throw new ConflictException('الراتب الحالي اتغير من وقت قراءة الملف — اعمل معاينة تاني قبل التطبيق')
      dto.salaryChange = { expectedRevision: current.historyRevision, expectedCurrentSourceHash: current.currentSourceHash,
        effectivePayrollPeriod: row.salary.month, reason: context.salary!.reason, evidenceReference: context.salary!.evidence,
        salary: { ...row.salary.values, currency: row.salary.currency } }
    }
    const instance = plainToInstance(UpdateEmployeeDto, dto)
    const messages = flattenValidation(await validate(instance, { whitelist: true, forbidNonWhitelisted: true }))
    if (messages.length) throw new BadRequestException(messages)
    await this.employees.update(id, instance, scope, user.sub, {
      reason: context.auditReason, fields: Object.keys(row.update) as Array<keyof Employee>,
    })
  }

  async apply(file: BulkUploadedFile | undefined, body: BulkUpdateOptionsDto, user: JwtPayload) {
    const { plan, fileName } = await this.buildPlan(file, body, user, 'apply')
    if (plan.fileErrors.length) bad(plan.fileErrors.join(' — '))
    let selected: Set<number> | null = null
    if (body.rows?.trim()) {
      const numbers = body.rows.split(',').map(value => Number(value.trim()))
      if (numbers.some(value => !Number.isInteger(value) || value < 2)) bad('أرقام الصفوف المطلوبة غير صالحة')
      selected = new Set(numbers)
    }
    const chosen = plan.rows.filter(row => !selected || selected.has(row.row))
    const targets = chosen.filter(row => row.status === 'ready')
    const context = {
      auditReason: `تحديث جماعي من ملف «${fileName}»`.slice(0, 300),
      salary: targets.some(row => row.salary) ? this.salaryEvidence(body) : null,
      org: targets.some(row => row.branchChange) ? this.orgChange(body) : null,
    }
    const results: Array<{ row: number; code: string; employeeName: string | null; status: 'applied' | 'failed' | 'skipped'; changes: number; message: string | null }> = []
    for (const row of chosen) {
      const base = { row: row.row, code: row.code, employeeName: row.employeeName, changes: row.changes.length }
      if (row.status !== 'ready') {
        results.push({ ...base, status: 'skipped', message: row.status === 'unchanged' ? 'مفيش تغيير' : row.errors.join(' — ') })
        continue
      }
      try {
        await this.applyRow(row, user, context)
        results.push({ ...base, status: 'applied', message: null })
      } catch (error) {
        if (!(error instanceof HttpException)) {
          // بلا بيانات الموظف في السجل: رقم الصف ونوع الخطأ بس
          this.logger.error(`bulk update row ${row.row} failed: ${(error as { code?: string; name?: string })?.code ?? (error as Error)?.name ?? 'unknown'}`)
        }
        results.push({ ...base, status: 'failed', message: rowErrorMessage(error) })
      }
    }
    return {
      fileName,
      summary: {
        applied: results.filter(row => row.status === 'applied').length,
        failed: results.filter(row => row.status === 'failed').length,
        skipped: results.filter(row => row.status === 'skipped').length,
      },
      rows: results,
    }
  }

  // ===== القالب =====

  private referenceTables(fields: BulkFieldKey[], catalogs: Lookups, branchScope: BranchScope): BulkReferenceTable[] {
    const active = <T extends { isActive?: boolean | null }>(rows: T[]) => rows.filter(row => row.isActive !== false)
    const branches = active(catalogs.branches).filter(row => inBranchScope(branchScope, row.id))
    const branchName = new Map(catalogs.branches.map(row => [row.id, row.name]))
    const departments = active(catalogs.departments).filter(row => branches.some(branch => branch.id === row.branchId))
    const departmentOf = new Map(catalogs.departments.map(row => [row.id, row]))
    const tables: BulkReferenceTable[] = []
    const has = (key: BulkFieldKey) => fields.includes(key)
    if (has('branch')) tables.push({ title: 'الفروع', headers: ['الفرع'], rows: branches.map(row => [row.name]) })
    if (has('department') || has('branch')) {
      tables.push({ title: 'الأقسام', headers: ['القسم', 'الفرع'], rows: departments.map(row => [row.name, branchName.get(row.branchId) ?? '']) })
    }
    if (has('team')) {
      tables.push({ title: 'الفرق', headers: ['الفريق', 'القسم', 'الفرع'], rows: active(catalogs.teams)
        .filter(row => departments.some(department => department.id === row.departmentId))
        .map(row => [row.name, departmentOf.get(row.departmentId)?.name ?? '', branchName.get(departmentOf.get(row.departmentId)?.branchId ?? 0) ?? ''])})
    }
    if (has('jobTitle')) tables.push({ title: 'المسميات الوظيفية', headers: ['المسمى'], rows: active(catalogs.jobTitles).map(row => [row.title]) })
    if (has('grade')) tables.push({ title: 'الدرجات الوظيفية', headers: ['الدرجة'], rows: active(catalogs.grades).map(row => [row.name]) })
    if (has('costCenter')) tables.push({ title: 'مراكز التكلفة', headers: ['الكود', 'الاسم'], rows: active(catalogs.costCenters).map(row => [row.code, row.name]) })
    for (const key of ['gender', 'contractType', 'payMethod'] as const) {
      const def = BULK_FIELD_BY_KEY.get(key)!
      if (has(key)) tables.push({ title: def.label, headers: ['القيمة'], rows: (def.options ?? []).map(option => [option.label]) })
    }
    return tables
  }

  /** القيمة الحالية بنفس الشكل اللي الملف بيتقري بيه (أسماء واختيارات بالعربي، مبالغ بمنزلتين). */
  private templateValue(key: BulkFieldKey, row: BulkEmployeeSnapshot, catalogs: Lookups, people: Map<number, { employeeCode: string }>): string | null {
    const label = (options: Array<{ value: string; label: string }>, value: string | null) => value === null ? null : options.find(option => option.value === value)?.label ?? value
    switch (key) {
      case 'gender': return label(GENDER_OPTIONS, row.gender)
      case 'contractType': return label(CONTRACT_TYPE_OPTIONS, row.contractType)
      case 'payMethod': return row.payMethod ? PAY_METHOD_LABELS[row.payMethod] ?? row.payMethod : null
      case 'isGosiRegistered': return row.isGosiRegistered === null ? null : row.isGosiRegistered ? 'نعم' : 'لا'
      case 'branch': return catalogs.branches.find(item => item.id === row.branchId)?.name ?? null
      case 'department': return catalogs.departments.find(item => item.id === row.departmentId)?.name ?? null
      case 'team': return catalogs.teams.find(item => item.id === row.teamId)?.name ?? null
      case 'costCenter': return catalogs.costCenters.find(item => item.id === row.costCenterId)?.code ?? null
      case 'grade': return catalogs.grades.find(item => item.id === row.gradeId)?.name ?? null
      case 'manager': return row.managerEmployeeId === null ? null : people.get(row.managerEmployeeId)?.employeeCode ?? null
      default: {
        const value = (row as unknown as Record<string, unknown>)[key]
        return value === null || value === undefined ? null : String(value)
      }
    }
  }

  async template(body: BulkUpdateTemplateDto, user: JwtPayload): Promise<{ buffer: Buffer; fileName: string; contentType: string }> {
    const fields = orderedBulkFields(body.fields) as BulkFieldKey[]
    if (!fields.length) bad('اختار حقل واحد على الأقل')
    const salary = bulkFieldsUseSalary(fields)
    if (salary && !userHasPerm(user, 'payroll.approve')) throw new ForbiddenException('أعمدة الراتب والبدلات محتاجة صلاحية «اعتماد المسير»')
    const ids = [...new Set(body.employeeIds ?? [])]
    if (ids.length && !userHasPerm(user, 'employees.view')) throw new ForbiddenException('تعبئة القالب ببيانات الموظفين محتاجة صلاحية عرض الموظفين')
    const scope = branchScopeOf(user)
    const [snapshots, catalogs] = await Promise.all([ids.length ? this.snapshotsById(ids, scope) : Promise.resolve([]), this.catalogs()])
    const people = await this.people(snapshots.map(row => row.managerEmployeeId).filter((id): id is number => id !== null))
    const defs = fields.map(key => BULK_FIELD_BY_KEY.get(key)!)
    const header = [BULK_CODE_HEADER, BULK_NAME_HEADER, ...defs.map(def => def.label), ...(salary ? [BULK_SALARY_MONTH_HEADER] : [])]
    const rows = snapshots.map(row => [row.employeeCode, row.fullName,
      ...fields.map(key => this.templateValue(key, row, catalogs, people)), ...(salary ? [null] : [])])
    const format: BulkFileFormat = body.format === 'csv' ? 'csv' : 'xlsx'
    const fileName = `قالب-تحديث-بيانات-الموظفين-${localDateOf(new Date())}.${format}`
    if (format === 'csv') return { buffer: Buffer.from(toCsv([header, ...rows]), 'utf8'), fileName, contentType: BULK_CONTENT_TYPES.csv }

    const clearable = defs.filter(def => def.clearable).map(def => def.label)
    const buffer = await writeBulkWorkbook({
      columns: [
        { header: BULK_CODE_HEADER, width: 16, text: true, note: 'إجباري — كود الموظف في النظام' },
        { header: BULK_NAME_HEADER, width: 28, text: true, note: 'للمراجعة بس — مش بيتحفظ' },
        ...defs.map(def => ({ header: def.label, width: Math.max(16, def.label.length + 6), text: def.kind !== 'money',
          money: def.kind === 'money', list: def.options?.map(option => option.label),
          note: `${def.hint}${def.clearable ? ` — «${BULK_CLEAR_WORD}» تمسح القيمة` : ''}` })),
        ...(salary ? [{ header: BULK_SALARY_MONTH_HEADER, width: 18, text: true, note: 'شهر الراتب اللي التغيير بيبدأ منه، مثلاً 2026-09 — فاضي = الشهر المختار في الشاشة' }] : []),
      ],
      rows: rows.map(values => values.map((value, index) => {
        const def = index >= 2 ? defs[index - 2] : undefined
        return def?.kind === 'money' && value !== null ? Number(value) : value
      })),
      references: this.referenceTables(fields, catalogs, scope),
      instructions: [
        'تحديث بيانات مجموعة موظفين من الملف ده',
        `• عمود «${BULK_CODE_HEADER}» إجباري — كل صف لموظف واحد، والكود مايتكررش في الملف.`,
        `• عمود «${BULK_NAME_HEADER}» للمراجعة بس ومش بيتحفظ.`,
        '• الخلية الفاضية = من غير تغيير.' + (clearable.length ? ` عشان تمسح قيمة (${clearable.join('، ')}) اكتب «${BULK_CLEAR_WORD}».` : ''),
        '• الفرع والقسم والفريق والدرجة والمسمى بالاسم زي ما هو في ورقة «القوائم»، ومركز التكلفة بكوده، والمدير المباشر بكود الموظف.',
        '• التواريخ بالشكل 2026-01-31، والمبالغ أرقام بمنزلتين عشريتين على الأكثر.',
        ...(salary ? [`• الراتب والبدلات بتتسجل تغيير واحد مؤرخ في سجل الأجر: اكتب «${BULK_SALARY_MONTH_HEADER}» (مثلاً 2026-09) في العمود أو اختاره في الشاشة، ومعاه سبب ومرجع القرار في الشاشة.`] : []),
        '• نقل الموظف لفرع تاني محتاج اسم القسم الجديد في نفس الصف، وتاريخ سريان وسبب في الشاشة.',
        `• الحد ${BULK_UPDATE_MAX_ROWS} صف في الملف. بعد الرفع بتظهر معاينة بكل تغيير (القديم ← الجديد) والأخطاء قبل ما يتحفظ أي حاجة.`,
        '',
        ...defs.map(def => `${def.label}: ${def.hint}`),
      ],
    })
    return { buffer, fileName, contentType: BULK_CONTENT_TYPES.xlsx }
  }
}
