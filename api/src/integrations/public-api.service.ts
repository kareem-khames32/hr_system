import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common'
import { InjectDataSource } from '@nestjs/typeorm'
import { DataSource } from 'typeorm'
import type { BranchScope } from '../auth/guards'
import { INTEGRATION_SCOPE_LABELS, INTEGRATION_SCOPES, type IntegrationIdentity } from './integration-keys'

// B6.3 (أ): قراءات `/public/v1` — حقول محددة بس (من غير راتب ولا هوية ولا آيبان ولا جوال)، ونطاق فروع المفتاح شرط في جملة القراءة نفسها
// بفرع الموظف/الوحدة الحالي. برّه النطاق = مش موجود. كل قراءة جملة واحدة (العدّ والصفحة في نفس الجملة).

export const PUBLIC_PAGE_DEFAULT = 50
export const PUBLIC_PAGE_MAX = 200
// نفس حالات ملف الموظف (common/domain-status.ts)
export const PUBLIC_EMPLOYEE_STATUSES = ['active', 'probation', 'notice_period', 'suspended', 'terminated', 'archived'] as const
const EMPLOYEE_COLUMNS = `e.[id], e.[employeeCode], e.[fullName], e.[fullNameEn], e.[jobTitle], e.[email], e.[branchId], e.[status], CONVERT(char(10), e.[joinDate], 23) AS [joinDate]`
/**
 * CRP6A-B03: أعمدة الموظف بأرقام مراجعه (القسم، الفريق، المدير) محكومة بفرع المرجع **الحالي**: مرجع فرعه برّه نطاق المفتاح بيرجع null — زي ما
 * الهيكل بيحجب القسم ده وقراءة المدير نفسه «مش موجود». نطاق الموظف لوحده مش كفاية (قسم اتنقل لفرع تاني، مدير من فرع تاني). مفتاح بكل الفروع: الأرقام زي ما هي.
 */
export function employeeColumns(scope: BranchScope, parameters: unknown[]): string {
  if (scope === null) return `${EMPLOYEE_COLUMNS}, e.[departmentId], e.[teamId], e.[managerEmployeeId]`
  if (!scope.length) return `${EMPLOYEE_COLUMNS}, CAST(NULL AS int) AS [departmentId], CAST(NULL AS int) AS [teamId], CAST(NULL AS int) AS [managerEmployeeId]`
  const marks = scope.map(id => { parameters.push(id); return `@${parameters.length - 1}` }).join(', ')
  return `${EMPLOYEE_COLUMNS},
    CASE WHEN EXISTS (SELECT 1 FROM dbo.departments rd WHERE rd.[id] = e.[departmentId] AND rd.[branchId] IN (${marks})) THEN e.[departmentId] END AS [departmentId],
    CASE WHEN EXISTS (SELECT 1 FROM dbo.teams rt INNER JOIN dbo.departments rtd ON rtd.[id] = rt.[departmentId] WHERE rt.[id] = e.[teamId] AND rtd.[branchId] IN (${marks})) THEN e.[teamId] END AS [teamId],
    CASE WHEN EXISTS (SELECT 1 FROM dbo.employees rm WHERE rm.[id] = e.[managerEmployeeId] AND rm.[branchId] IN (${marks})) THEN e.[managerEmployeeId] END AS [managerEmployeeId]`
}

// B6.3 (ب): حدود مدى التاريخ لكل قراءة
export const PUBLIC_ATTENDANCE_MAX_DAYS = 31
export const PUBLIC_LEAVES_MAX_DAYS = 366
const YMD = /^\d{4}-(0[1-9]|1[0-2])-(0[1-9]|[12]\d|3[01])$/
/** مدى تاريخ إجباري (from و to بصيغة YYYY-MM-DD، وfrom مش بعد to، وبحد أقصى للأيام) */
export function rangeOf(query: { from?: unknown; to?: unknown }, maxDays: number): { from: string; to: string } {
  const valid = (value: unknown): value is string => typeof value === 'string' && YMD.test(value) && !Number.isNaN(Date.parse(`${value}T00:00:00Z`)) && new Date(`${value}T00:00:00Z`).toISOString().slice(0, 10) === value
  if (!valid(query.from) || !valid(query.to)) throw new BadRequestException('from و to تواريخ بصيغة YYYY-MM-DD')
  if (query.from > query.to) throw new BadRequestException('from مش بعد to')
  const days = Math.round((Date.parse(`${query.to}T00:00:00Z`) - Date.parse(`${query.from}T00:00:00Z`)) / 86400000) + 1
  if (days > maxDays) throw new BadRequestException(`المدى ${maxDays} يوم بالكتير`)
  return { from: query.from, to: query.to }
}
/** رقم موظف اختياري في الاستعلام */
function employeeFilter(value: unknown): number | null {
  if (value === undefined || value === '') return null
  const id = Number(value)
  if (!Number.isSafeInteger(id) || id < 1) throw new BadRequestException('employeeId رقم موظف')
  return id
}

/** شرط نطاق الفروع على عمود: كل الفروع = من غير شرط؛ ولا فرع = ولا صف */
export function scopeClause(scope: BranchScope, column: string, parameters: unknown[]): string {
  if (scope === null) return ''
  if (!scope.length) return ' AND 1 = 0'
  const marks = scope.map(id => { parameters.push(id); return `@${parameters.length - 1}` })
  return ` AND ${column} IN (${marks.join(', ')})`
}
/** رقم صفحة وحجمها من الاستعلام (بحدود) */
export function pageOf(query: { page?: unknown; pageSize?: unknown }): { page: number; pageSize: number } {
  const number = (value: unknown, fallback: number) => (value === undefined || value === '' ? fallback : Number(value))
  const page = number(query.page, 1), pageSize = number(query.pageSize, PUBLIC_PAGE_DEFAULT)
  if (!Number.isSafeInteger(page) || page < 1 || page > 100000) throw new BadRequestException('page رقم صحيح من 1')
  if (!Number.isSafeInteger(pageSize) || pageSize < 1 || pageSize > PUBLIC_PAGE_MAX) throw new BadRequestException(`pageSize من 1 لـ${PUBLIC_PAGE_MAX}`)
  return { page, pageSize }
}

interface EmployeeRow { id: number; employeeCode: string; fullName: string; fullNameEn: string | null; jobTitle: string | null; email: string | null; branchId: number; departmentId: number | null;
  teamId: number | null; managerEmployeeId: number | null; status: string; joinDate: string | null; total?: number }
const employeeView = ({ total: _total, ...row }: EmployeeRow) => ({ ...row, id: Number(row.id), branchId: Number(row.branchId), departmentId: row.departmentId == null ? null : Number(row.departmentId),
  teamId: row.teamId == null ? null : Number(row.teamId), managerEmployeeId: row.managerEmployeeId == null ? null : Number(row.managerEmployeeId) })

@Injectable()
export class PublicApiService {
  constructor(@InjectDataSource() private readonly ds: DataSource) {}

  async employees(integration: IntegrationIdentity, query: { page?: unknown; pageSize?: unknown; status?: unknown; branchId?: unknown }) {
    const { page, pageSize } = pageOf(query)
    const parameters: unknown[] = []
    const columns = employeeColumns(integration.branchScope, parameters)
    let where = 'WHERE 1 = 1' + scopeClause(integration.branchScope, 'e.[branchId]', parameters)
    if (query.status !== undefined && query.status !== '') {
      if (!(PUBLIC_EMPLOYEE_STATUSES as readonly unknown[]).includes(query.status)) throw new BadRequestException(`status واحدة من: ${PUBLIC_EMPLOYEE_STATUSES.join(', ')}`)
      parameters.push(query.status); where += ` AND e.[status] = @${parameters.length - 1}`
    }
    if (query.branchId !== undefined && query.branchId !== '') {
      const branchId = Number(query.branchId)
      if (!Number.isSafeInteger(branchId) || branchId < 1) throw new BadRequestException('branchId رقم فرع')
      parameters.push(branchId); where += ` AND e.[branchId] = @${parameters.length - 1}`
    }
    parameters.push((page - 1) * pageSize, pageSize)
    const rows: EmployeeRow[] = await this.ds.query(`SELECT ${columns}, COUNT(*) OVER () AS [total] FROM dbo.employees e ${where}
      ORDER BY e.[id] OFFSET @${parameters.length - 2} ROWS FETCH NEXT @${parameters.length - 1} ROWS ONLY`, parameters)
    // صفحة بعد الآخر: مفيش صفوف ومفيش عدّ — العدّ في جملة لوحدها بنفس الشرط
    const total = rows.length ? Number(rows[0].total) : Number((await this.ds.query(`SELECT COUNT(*) AS [total] FROM dbo.employees e ${where}`, parameters.slice(0, -2)))[0]?.total ?? 0)
    return { page, pageSize, total, items: rows.map(employeeView) }
  }

  async employee(integration: IntegrationIdentity, id: number) {
    const parameters: unknown[] = [id]
    const columns = employeeColumns(integration.branchScope, parameters)
    const [row]: EmployeeRow[] = await this.ds.query(`SELECT ${columns} FROM dbo.employees e WHERE e.[id] = @0${scopeClause(integration.branchScope, 'e.[branchId]', parameters)}`, parameters)
    // موظف برّه نطاق المفتاح = مش موجود (نفس الرد)
    if (!row) throw new NotFoundException('الموظف مش موجود')
    return employeeView(row)
  }

  async structure(integration: IntegrationIdentity) {
    const branchParameters: unknown[] = [], departmentParameters: unknown[] = []
    const branches: Array<Record<string, unknown>> = await this.ds.query(`SELECT b.[id], b.[code], b.[name], b.[nameEn], b.[country], b.[isActive] FROM dbo.branches b WHERE 1 = 1${scopeClause(integration.branchScope, 'b.[id]', branchParameters)}
      ORDER BY b.[id]`, branchParameters)
    const departments: Array<Record<string, unknown>> = await this.ds.query(`SELECT d.[id], d.[name], d.[nameEn], d.[code], d.[parentId], d.[branchId], d.[isActive] FROM dbo.departments d
      WHERE 1 = 1${scopeClause(integration.branchScope, 'd.[branchId]', departmentParameters)} ORDER BY d.[id]`, departmentParameters)
    // CRP6A-B03: أب الوحدة لو مش من الوحدات الراجعة (فرعه برّه نطاق المفتاح) بيبقى null — مفيش رقم من فرع برّه النطاق
    const shown = new Set(departments.map(row => Number(row.id)))
    return { branches: branches.map(row => ({ ...row, id: Number(row.id), isActive: !!row.isActive })),
      departments: departments.map(row => ({ ...row, id: Number(row.id), branchId: Number(row.branchId), parentId: row.parentId != null && shown.has(Number(row.parentId)) ? Number(row.parentId) : null, isActive: !!row.isActive })) }
  }

  /** صفحة من جملة قراءة واحدة (العدّ معاها)؛ صفحة بعد الآخر: العدّ بجملة بنفس الشرط */
  private async paged<T extends { total?: number }>(columns: string, source: string, orderBy: string, parameters: unknown[], page: number, pageSize: number): Promise<{ total: number; rows: T[] }> {
    const rows: T[] = await this.ds.query(`SELECT ${columns}, COUNT(*) OVER () AS [total] ${source} ORDER BY ${orderBy} OFFSET @${parameters.length} ROWS FETCH NEXT @${parameters.length + 1} ROWS ONLY`,
      [...parameters, (page - 1) * pageSize, pageSize])
    const total = rows.length ? Number(rows[0].total) : Number((await this.ds.query(`SELECT COUNT(*) AS [total] ${source}`, parameters))[0]?.total ?? 0)
    return { total, rows }
  }

  // B6.3 (ب): أيام الحضور المحسوبة في مدى (31 يوم بالكتير) لموظفين نطاق المفتاح
  async attendance(integration: IntegrationIdentity, query: { page?: unknown; pageSize?: unknown; from?: unknown; to?: unknown; employeeId?: unknown }) {
    const { page, pageSize } = pageOf(query), { from, to } = rangeOf(query, PUBLIC_ATTENDANCE_MAX_DAYS), employeeId = employeeFilter(query.employeeId)
    const parameters: unknown[] = [from, to]
    let where = 'WHERE a.[date] >= @0 AND a.[date] <= @1' + scopeClause(integration.branchScope, 'e.[branchId]', parameters)
    if (employeeId !== null) { parameters.push(employeeId); where += ` AND a.[employeeId] = @${parameters.length - 1}` }
    const { total, rows } = await this.paged<Record<string, unknown> & { total?: number }>(
      `a.[employeeId], CONVERT(char(10), a.[date], 23) AS [date], a.[status], a.[checkIn], a.[checkOut], a.[shiftName], a.[lateMinutes], a.[earlyLeaveMinutes]`,
      `FROM dbo.attendance_days a INNER JOIN dbo.employees e ON e.[id] = a.[employeeId] ${where}`, 'a.[date], a.[employeeId]', parameters, page, pageSize)
    return { page, pageSize, total, items: rows.map(({ total: _total, ...row }) => ({ ...row, employeeId: Number(row.employeeId), lateMinutes: Number(row.lateMinutes ?? 0), earlyLeaveMinutes: Number(row.earlyLeaveMinutes ?? 0) })) }
  }

  // B6.3 (ب): الإجازات المعتمدة اللي بتتقاطع مع مدى (سنة بالكتير) لموظفين نطاق المفتاح
  async leaves(integration: IntegrationIdentity, query: { page?: unknown; pageSize?: unknown; from?: unknown; to?: unknown; employeeId?: unknown }) {
    const { page, pageSize } = pageOf(query), { from, to } = rangeOf(query, PUBLIC_LEAVES_MAX_DAYS), employeeId = employeeFilter(query.employeeId)
    const parameters: unknown[] = [from, to]
    let where = `WHERE l.[status] = N'APPROVED' AND l.[fromDate] <= @1 AND l.[toDate] >= @0` + scopeClause(integration.branchScope, 'e.[branchId]', parameters)
    if (employeeId !== null) { parameters.push(employeeId); where += ` AND l.[employeeId] = @${parameters.length - 1}` }
    const { total, rows } = await this.paged<Record<string, unknown> & { total?: number }>(
      `l.[id], l.[employeeId], l.[leaveTypeCode], CONVERT(char(10), l.[fromDate], 23) AS [fromDate], CONVERT(char(10), l.[toDate], 23) AS [toDate], l.[days], l.[period], l.[isUnpaid]`,
      `FROM dbo.leaves l INNER JOIN dbo.employees e ON e.[id] = l.[employeeId] ${where}`, 'l.[fromDate], l.[id]', parameters, page, pageSize)
    return { page, pageSize, total, items: rows.map(({ total: _total, ...row }) => ({ ...row, id: Number(row.id), employeeId: Number(row.employeeId), days: Number(row.days), isUnpaid: !!row.isUnpaid })) }
  }

  // B6.3 (ب): ملخص مسيرات شهر — المعتمد والمصروف بس، وعدد وإجمالي صافي موظفين نطاق المفتاح (من غير أي مبلغ لموظف بعينه)
  async payrollRuns(integration: IntegrationIdentity, query: { period?: unknown }) {
    if (typeof query.period !== 'string' || !/^\d{4}-(0[1-9]|1[0-2])$/.test(query.period)) throw new BadRequestException('period بصيغة YYYY-MM')
    const parameters: unknown[] = [query.period]
    const rows: Array<Record<string, unknown>> = await this.ds.query(`SELECT r.[id], r.[name], r.[period], CONVERT(char(10), r.[startDate], 23) AS [startDate], CONVERT(char(10), r.[endDate], 23) AS [endDate], r.[status],
        COUNT(i.[id]) AS [employees], CONVERT(varchar(40), SUM(i.[netPay])) AS [totalNet]
      FROM dbo.payroll_runs r INNER JOIN dbo.payroll_items i ON i.[runId] = r.[id] INNER JOIN dbo.employees e ON e.[id] = i.[employeeId]
      WHERE r.[period] = @0 AND r.[status] IN (N'APPROVED', N'PAID')${scopeClause(integration.branchScope, 'e.[branchId]', parameters)}
      GROUP BY r.[id], r.[name], r.[period], r.[startDate], r.[endDate], r.[status] ORDER BY r.[id]`, parameters)
    return { period: query.period, runs: rows.map(row => ({ ...row, id: Number(row.id), employees: Number(row.employees), totalNet: String(row.totalNet) })) }
  }

  /** وصف المسارات (OpenAPI 3) — ثابت، من غير أي بيانات */
  openapi() {
    const page = [{ name: 'page', in: 'query', schema: { type: 'integer', minimum: 1, default: 1 } }, { name: 'pageSize', in: 'query', schema: { type: 'integer', minimum: 1, maximum: PUBLIC_PAGE_MAX, default: PUBLIC_PAGE_DEFAULT } }]
    const errors = { 401: { description: 'Missing or invalid key' }, 403: { description: 'The key lacks the required scope' }, 404: { description: 'Not found, or outside the key branch scope' }, 429: { description: 'Rate limit exceeded' } }
    const secured = (scope: string) => [{ integrationKey: [scope] }]
    const range = [{ name: 'from', in: 'query', required: true, schema: { type: 'string', format: 'date' } }, { name: 'to', in: 'query', required: true, schema: { type: 'string', format: 'date' } }]
    return {
      openapi: '3.0.3',
      info: { title: 'HR Public API', version: '1.0.0', description: 'Read-only integration API. Authenticate with an integration key: `Authorization: Bearer hrk_…` or `X-API-Key`. A key carries read scopes and a branch scope.' },
      servers: [{ url: '/api/public/v1' }],
      components: {
        securitySchemes: { integrationKey: { type: 'http', scheme: 'bearer', description: `Scopes: ${INTEGRATION_SCOPES.map(scope => `${scope} (${INTEGRATION_SCOPE_LABELS[scope]})`).join(', ')}` } },
        schemas: {
          Employee: { type: 'object', properties: { id: { type: 'integer' }, employeeCode: { type: 'string' }, fullName: { type: 'string' }, fullNameEn: { type: 'string', nullable: true }, jobTitle: { type: 'string', nullable: true },
            email: { type: 'string', nullable: true }, branchId: { type: 'integer' }, departmentId: { type: 'integer', nullable: true }, teamId: { type: 'integer', nullable: true }, managerEmployeeId: { type: 'integer', nullable: true },
            status: { type: 'string', enum: [...PUBLIC_EMPLOYEE_STATUSES] }, joinDate: { type: 'string', format: 'date', nullable: true } } },
        },
      },
      paths: {
        '/employees': { get: { summary: 'List employees in the key branch scope', security: secured('employees.read'),
          parameters: [...page, { name: 'status', in: 'query', schema: { type: 'string', enum: [...PUBLIC_EMPLOYEE_STATUSES] } }, { name: 'branchId', in: 'query', schema: { type: 'integer' } }],
          responses: { 200: { description: 'A page of employees', content: { 'application/json': { schema: { type: 'object', properties: { page: { type: 'integer' }, pageSize: { type: 'integer' }, total: { type: 'integer' },
            items: { type: 'array', items: { $ref: '#/components/schemas/Employee' } } } } } } }, ...errors } } },
        '/employees/{id}': { get: { summary: 'One employee', security: secured('employees.read'), parameters: [{ name: 'id', in: 'path', required: true, schema: { type: 'integer' } }],
          responses: { 200: { description: 'The employee', content: { 'application/json': { schema: { $ref: '#/components/schemas/Employee' } } } }, ...errors } } },
        '/structure': { get: { summary: 'Branches and departments in the key branch scope', security: secured('structure.read'), responses: { 200: { description: 'Branches and departments' }, ...errors } } },
        '/attendance': { get: { summary: `Computed attendance days in a date range (max ${PUBLIC_ATTENDANCE_MAX_DAYS} days)`, security: secured('attendance.read'),
          parameters: [...range, { name: 'employeeId', in: 'query', schema: { type: 'integer' } }, ...page], responses: { 200: { description: 'A page of attendance days' }, ...errors } } },
        '/leaves': { get: { summary: `Approved leaves overlapping a date range (max ${PUBLIC_LEAVES_MAX_DAYS} days)`, security: secured('leaves.read'),
          parameters: [...range, { name: 'employeeId', in: 'query', schema: { type: 'integer' } }, ...page], responses: { 200: { description: 'A page of approved leaves' }, ...errors } } },
        '/payroll/runs': { get: { summary: 'Approved and paid payroll runs of a month: employee count and total net for employees in the key branch scope (no per-employee amounts)', security: secured('payroll.read'),
          parameters: [{ name: 'period', in: 'query', required: true, schema: { type: 'string', pattern: '^\\d{4}-\\d{2}$' } }], responses: { 200: { description: 'Run summaries' }, ...errors } } },
      },
    }
  }
}
