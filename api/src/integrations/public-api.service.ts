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
const EMPLOYEE_COLUMNS = `e.[id], e.[employeeCode], e.[fullName], e.[fullNameEn], e.[jobTitle], e.[email], e.[branchId], e.[departmentId], e.[teamId], e.[managerEmployeeId], e.[status],
  CONVERT(char(10), e.[joinDate], 23) AS [joinDate]`

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
    const rows: EmployeeRow[] = await this.ds.query(`SELECT ${EMPLOYEE_COLUMNS}, COUNT(*) OVER () AS [total] FROM dbo.employees e ${where}
      ORDER BY e.[id] OFFSET @${parameters.length - 2} ROWS FETCH NEXT @${parameters.length - 1} ROWS ONLY`, parameters)
    // صفحة بعد الآخر: مفيش صفوف ومفيش عدّ — العدّ في جملة لوحدها بنفس الشرط
    const total = rows.length ? Number(rows[0].total) : Number((await this.ds.query(`SELECT COUNT(*) AS [total] FROM dbo.employees e ${where}`, parameters.slice(0, -2)))[0]?.total ?? 0)
    return { page, pageSize, total, items: rows.map(employeeView) }
  }

  async employee(integration: IntegrationIdentity, id: number) {
    const parameters: unknown[] = [id]
    const [row]: EmployeeRow[] = await this.ds.query(`SELECT ${EMPLOYEE_COLUMNS} FROM dbo.employees e WHERE e.[id] = @0${scopeClause(integration.branchScope, 'e.[branchId]', parameters)}`, parameters)
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
    return { branches: branches.map(row => ({ ...row, id: Number(row.id), isActive: !!row.isActive })),
      departments: departments.map(row => ({ ...row, id: Number(row.id), branchId: Number(row.branchId), parentId: row.parentId == null ? null : Number(row.parentId), isActive: !!row.isActive })) }
  }

  /** وصف المسارات (OpenAPI 3) — ثابت، من غير أي بيانات */
  openapi() {
    const page = [{ name: 'page', in: 'query', schema: { type: 'integer', minimum: 1, default: 1 } }, { name: 'pageSize', in: 'query', schema: { type: 'integer', minimum: 1, maximum: PUBLIC_PAGE_MAX, default: PUBLIC_PAGE_DEFAULT } }]
    const errors = { 401: { description: 'Missing or invalid key' }, 403: { description: 'The key lacks the required scope' }, 404: { description: 'Not found, or outside the key branch scope' }, 429: { description: 'Rate limit exceeded' } }
    const secured = (scope: string) => [{ integrationKey: [scope] }]
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
      },
    }
  }
}
