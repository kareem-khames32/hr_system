import { Column, Entity, PrimaryGeneratedColumn, type EntityManager } from 'typeorm'
import { payrollLineNotReversedSql } from '../payroll/payroll-reversal-sql'

// B5.9: بانِي التقارير — قاموس مصادر ثابت في الكود (كل مصدر بجداوله وأعمدته المسموحة وتعبير SQL لكل عمود)، وتعريف التقرير اختيار من القاموس بس:
// أعمدة، فلاتر، وتجميع بعمود. مفيش نص SQL من المستخدم: الأسماء مفاتيح في القاموس والقيم معاملات. كل مصدر بصلاحيته وموديولاته، وعمود الراتب
// بصلاحيته (صلاحية الحقل)، وكل الصفوف بفرع الموظف الحالي. ميزة فرعية `reports.builder` (مقفولة افتراضيًا).

export const REPORT_BUILDER_FEATURE = 'reports.builder'
export const REPORT_BUILDER_MIGRATION_MISSING = 'حفظ تقارير البانِي محتاج ترحيل 20261010_175 على قاعدة البيانات'
export const DEFINITION_NOT_FOUND = 'التقرير مش موجود'
export const DEFINITION_UNAVAILABLE = 'التقرير ده فيه بيانات مش متاحة لحسابك'
export const SOURCE_UNAVAILABLE = 'مصدر التقرير مش متاح لحسابك'
export const ROWS_MAX = 2000
export const COLUMNS_MAX = 12
export const FILTERS_MAX = 8
export const DEFINITIONS_MAX = 50
export const SHARED_ROLES_MAX = 10

export type ColumnType = 'text' | 'number' | 'date' | 'money'
export interface BuilderColumn {
  key: string; label: string; type: ColumnType
  /** تعبير SQL ثابت للعمود (من القاموس، مش من المستخدم) */
  sql: string
  /** صلاحية الحقل فوق صلاحية المصدر */
  perm?: string
  /** ينفع يتجمّع بيه */
  group?: boolean
  /** رقم بيتجمع في التجميع */
  sum?: boolean
}
export interface BuilderSource {
  key: string; label: string
  /** صلاحية المصدر فوق reports.view */
  perm: string
  /** موديولات لازم تكون مفعّلة */
  modules: readonly string[]
  from: string
  /** شرط ثابت للمصدر */
  where: string
  orderBy: string
  columns: readonly BuilderColumn[]
}

const WHO: BuilderColumn[] = [
  { key: 'employeeCode', label: 'كود الموظف', type: 'text', sql: 'e.[employeeCode]' },
  { key: 'fullName', label: 'اسم الموظف', type: 'text', sql: 'e.[fullName]', group: true },
]

export const BUILDER_SOURCES: readonly BuilderSource[] = [
  { key: 'employees', label: 'الموظفين', perm: 'employees.view', modules: ['employees'],
    from: 'dbo.employees e LEFT JOIN dbo.branches b ON b.[id] = e.[branchId] LEFT JOIN dbo.departments d ON d.[id] = e.[departmentId] AND d.[branchId] = e.[branchId]',
    where: '1 = 1', orderBy: 'e.[employeeCode], e.[id]',
    columns: [...WHO.map(column => ({ ...column, group: false })),
      { key: 'branchName', label: 'الفرع', type: 'text', sql: 'b.[name]', group: true },
      { key: 'departmentName', label: 'القسم', type: 'text', sql: 'd.[name]', group: true },
      { key: 'jobTitle', label: 'المسمى الوظيفي', type: 'text', sql: 'e.[jobTitle]', group: true },
      { key: 'status', label: 'الحالة', type: 'text', sql: 'e.[status]', group: true },
      { key: 'contractType', label: 'نوع العقد', type: 'text', sql: 'e.[contractType]', group: true },
      { key: 'nationality', label: 'الجنسية', type: 'text', sql: 'e.[nationality]', group: true },
      { key: 'gender', label: 'النوع', type: 'text', sql: 'e.[gender]', group: true },
      { key: 'joinDate', label: 'تاريخ التعيين', type: 'date', sql: 'e.[joinDate]' },
      { key: 'basicSalary', label: 'الراتب الأساسي', type: 'money', sql: 'e.[basicSalary]', perm: 'payroll.view' }] },
  { key: 'attendance', label: 'الحضور', perm: 'attendance.view_all', modules: ['attendance'],
    from: 'dbo.attendance_days a INNER JOIN dbo.employees e ON e.[id] = a.[employeeId]', where: '1 = 1', orderBy: 'a.[date], e.[employeeCode], a.[id]',
    columns: [...WHO,
      { key: 'date', label: 'اليوم', type: 'date', sql: 'a.[date]', group: true },
      { key: 'status', label: 'حالة اليوم', type: 'text', sql: 'a.[status]', group: true },
      { key: 'shiftName', label: 'الوردية', type: 'text', sql: 'a.[shiftName]', group: true },
      { key: 'lateMinutes', label: 'دقايق التأخير', type: 'number', sql: 'a.[lateMinutes]', sum: true },
      { key: 'workMinutes', label: 'دقايق العمل', type: 'number', sql: 'a.[workMinutes]', sum: true }] },
  { key: 'leaves', label: 'الإجازات', perm: 'leaves.view_all', modules: ['leave'],
    from: 'dbo.leaves l INNER JOIN dbo.employees e ON e.[id] = l.[employeeId]', where: '1 = 1', orderBy: 'l.[fromDate], e.[employeeCode], l.[id]',
    columns: [...WHO,
      { key: 'leaveType', label: 'نوع الإجازة', type: 'text', sql: 'l.[leaveTypeCode]', group: true },
      { key: 'fromDate', label: 'من', type: 'date', sql: 'l.[fromDate]' },
      { key: 'toDate', label: 'إلى', type: 'date', sql: 'l.[toDate]' },
      { key: 'days', label: 'الأيام', type: 'number', sql: 'l.[days]', sum: true },
      { key: 'status', label: 'الحالة', type: 'text', sql: 'l.[status]', group: true }] },
  // الطلبات: الأنواع السرّية برّه المصدر كله (مش بتتعد ولا بتتعرض)
  { key: 'requests', label: 'الطلبات', perm: 'requests.view_all', modules: ['requests'],
    from: 'dbo.requests r INNER JOIN dbo.request_types t ON t.[code] = r.[typeCode] INNER JOIN dbo.employees e ON e.[id] = r.[requesterId]',
    where: 'ISNULL(t.[isConfidential], 0) = 0', orderBy: 'r.[id]',
    columns: [...WHO,
      { key: 'typeName', label: 'نوع الطلب', type: 'text', sql: 't.[nameAr]', group: true },
      { key: 'category', label: 'تصنيف الطلب', type: 'text', sql: 't.[category]', group: true },
      { key: 'status', label: 'الحالة', type: 'text', sql: 'r.[status]', group: true },
      { key: 'createdOn', label: 'تاريخ الطلب', type: 'date', sql: 'CONVERT(date, r.[createdAt])', group: true },
      { key: 'completedOn', label: 'تاريخ الاكتمال', type: 'date', sql: 'CONVERT(date, r.[completedAt])' }] },
  // الرواتب: بنود المسيرات المعتمدة والمصروفة اللي صرفها مااتعكسش
  { key: 'payroll', label: 'الرواتب', perm: 'payroll.view', modules: ['payroll'],
    from: 'dbo.payroll_items i INNER JOIN dbo.payroll_runs r ON r.[id] = i.[runId] INNER JOIN dbo.employees e ON e.[id] = i.[employeeId]',
    where: `r.[status] IN (N'APPROVED', N'PAID') AND ${payrollLineNotReversedSql('r.[id]', 'i.[employeeId]')}`, orderBy: 'r.[period], e.[employeeCode], i.[id]',
    columns: [...WHO,
      { key: 'period', label: 'شهر الرواتب', type: 'text', sql: 'r.[period]', group: true },
      { key: 'runName', label: 'المسير', type: 'text', sql: 'r.[name]', group: true },
      { key: 'basicSalary', label: 'الأساسي', type: 'money', sql: 'i.[basicSalary]' },
      { key: 'allowances', label: 'البدلات', type: 'money', sql: 'i.[allowances]' },
      { key: 'overtimeAmount', label: 'الإضافي', type: 'money', sql: 'i.[overtimeAmount]' },
      { key: 'netPay', label: 'الصافي', type: 'money', sql: 'i.[netPay]' }] },
]

export const sourceOf = (key: unknown): BuilderSource | null => BUILDER_SOURCES.find(source => source.key === key) ?? null

export const FILTER_OPS: Record<ColumnType, readonly string[]> = { text: ['eq', 'contains'], number: ['eq', 'gte', 'lte'], money: ['eq', 'gte', 'lte'], date: ['eq', 'gte', 'lte'] }
export const FILTER_OP_LABELS: Record<string, string> = { eq: 'يساوي', contains: 'يحتوي', gte: 'من / أكبر من أو يساوي', lte: 'لحد / أصغر من أو يساوي' }
const SQL_OPS: Record<string, string> = { eq: '=', gte: '>=', lte: '<=' }

export interface BuilderFilter { column: string; op: string; value: string | number }
export interface BuilderDefinition { source: string; columns: string[]; filters: BuilderFilter[]; groupBy: string | null }

const validYmd = (value: unknown): value is string => {
  if (typeof value !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(value)) return false
  const date = new Date(`${value}T00:00:00Z`)
  return !Number.isNaN(date.getTime()) && date.toISOString().slice(0, 10) === value
}

/**
 * تعريف تقرير صالح على القاموس: مصدر معروف، أعمدة منه (من غير تكرار)، فلاتر بعامل يناسب نوع العمود وقيمة من نوعه، وتجميع بعمود بيتجمّع بيه.
 * الحكم على الصلاحيات مش هنا (`definitionColumns`).
 */
export function definitionOf(body: unknown): { definition: BuilderDefinition | null; error: string | null } {
  const input = (body ?? {}) as Record<string, unknown>
  const source = sourceOf(input.source)
  if (!source) return { definition: null, error: 'اختار مصدر التقرير' }
  const columnOf = (key: unknown) => source.columns.find(column => column.key === key) ?? null
  if (!Array.isArray(input.columns) || input.columns.length < 1 || input.columns.length > COLUMNS_MAX) return { definition: null, error: `اختار من عمود لحد ${COLUMNS_MAX} عمود` }
  if (input.columns.some(key => !columnOf(key)) || new Set(input.columns).size !== input.columns.length) return { definition: null, error: 'عمود من الأعمدة مش في المصدر أو مكرر' }
  const rawFilters = input.filters === undefined || input.filters === null ? [] : input.filters
  if (!Array.isArray(rawFilters) || rawFilters.length > FILTERS_MAX) return { definition: null, error: `الفلاتر قايمة لحد ${FILTERS_MAX}` }
  const filters: BuilderFilter[] = []
  for (const item of rawFilters as Array<Record<string, unknown>>) {
    const column = columnOf(item?.column)
    if (!column) return { definition: null, error: 'فلتر على عمود مش في المصدر' }
    if (typeof item.op !== 'string' || !FILTER_OPS[column.type].includes(item.op)) return { definition: null, error: `الفلتر على «${column.label}» بعامل مش مناسب` }
    const value = item.value
    const fits = column.type === 'date' ? validYmd(value)
      : column.type === 'text' ? typeof value === 'string' && value.trim().length >= 1 && value.length <= 200
        : typeof value === 'number' && Number.isFinite(value) && Math.abs(value) <= 1e12
    if (!fits) return { definition: null, error: `قيمة الفلتر على «${column.label}» مش صحيحة` }
    filters.push({ column: column.key, op: item.op, value: column.type === 'text' ? (value as string).trim() : (value as string | number) })
  }
  const noGroup = input.groupBy === undefined || input.groupBy === null || input.groupBy === ''
  if (!noGroup && !columnOf(input.groupBy)?.group) return { definition: null, error: 'التجميع بعمود مش بيتجمّع بيه' }
  return { definition: { source: source.key, columns: input.columns as string[], filters, groupBy: noGroup ? null : (input.groupBy as string) }, error: null }
}

/** كل الأعمدة اللي التعريف بيلمسها (معروضة، أو في فلتر، أو في تجميع) — صلاحية الحقل بتتحكم على كلها: الفلتر بعمود محجوب بيكشفه */
export function definitionColumns(definition: BuilderDefinition): BuilderColumn[] {
  const source = sourceOf(definition.source)
  if (!source) return []
  const keys = new Set([...definition.columns, ...definition.filters.map(filter => filter.column), ...(definition.groupBy ? [definition.groupBy] : [])])
  return source.columns.filter(column => keys.has(column.key))
}

const outputSql = (column: BuilderColumn) => column.type === 'date' ? `CONVERT(varchar(10), ${column.sql}, 23)` : column.type === 'money' ? `CONVERT(varchar(40), ${column.sql})` : column.sql
const escapeLike = (value: string) => value.replace(/[\\%_[]/g, found => `\\${found}`)

export interface BuiltQuery { sql: string; params: unknown[]; headers: Array<{ key: string; label: string; type: ColumnType }> }
/**
 * استعلام التعريف: أعمدة القاموس بتعبيراتها، وقيم الفلاتر معاملات، وشرط النطاق (`scopeClause`، مبني برّه على `e.[branchId]` بمعاملاته في `params`).
 * من غير تجميع: الصفوف بترتيب المصدر. بتجميع: عمود التجميع، والعدد، ومجموع الأعمدة الرقمية المختارة. الحد `ROWS_MAX` + 1 (لمعرفة إن فيه أكتر).
 */
export function buildQuery(definition: BuilderDefinition, scopeClause: string, params: unknown[]): BuiltQuery {
  const source = sourceOf(definition.source)
  if (!source) throw new Error('unknown report source')
  const columnOf = (key: string) => source.columns.find(column => column.key === key)!
  const where = [source.where, ...(scopeClause ? [scopeClause] : [])]
  for (const filter of definition.filters) {
    const column = columnOf(filter.column)
    if (filter.op === 'contains') where.push(`${column.sql} LIKE @${params.push(`%${escapeLike(String(filter.value))}%`) - 1} ESCAPE N'\\'`)
    else where.push(`${column.sql} ${SQL_OPS[filter.op]} @${params.push(filter.value) - 1}`)
  }
  const top = `TOP (${ROWS_MAX + 1})`
  if (definition.groupBy) {
    const group = columnOf(definition.groupBy), sums = definition.columns.map(columnOf).filter(column => column.sum)
    return { params, headers: [{ key: group.key, label: group.label, type: group.type }, { key: 'count', label: 'العدد', type: 'number' }, ...sums.map(column => ({ key: column.key, label: `مجموع ${column.label}`, type: column.type }))],
      sql: `SELECT ${top} ${outputSql(group)} AS [c0], COUNT(*) AS [c1]${sums.map((column, index) => `, SUM(${column.sql}) AS [c${index + 2}]`).join('')} FROM ${source.from} WHERE ${where.join(' AND ')} GROUP BY ${group.sql} ORDER BY ${group.sql}` }
  }
  const columns = definition.columns.map(columnOf)
  return { params, headers: columns.map(column => ({ key: column.key, label: column.label, type: column.type })),
    sql: `SELECT ${top} ${columns.map((column, index) => `${outputSql(column)} AS [c${index}]`).join(', ')} FROM ${source.from} WHERE ${where.join(' AND ')} ORDER BY ${source.orderBy}` }
}

/** اسم التقرير بعد التنضيف، أو null */
export function definitionName(raw: unknown): string | null {
  if (typeof raw !== 'string') return null
  const name = raw.replace(/\s+/g, ' ').trim()
  return name.length < 2 || name.length > 120 ? null : name
}
/** أكواد الأدوار المشارَك معاها: قايمة نصوص من غير تكرار (وجودها في جدول الأدوار بيتفحص في الخدمة)، أو null لو مش صالحة */
export function sharedRolesOf(raw: unknown): string[] | null {
  if (raw === undefined || raw === null) return []
  if (!Array.isArray(raw) || raw.length > SHARED_ROLES_MAX || raw.some(code => typeof code !== 'string' || !/^[A-Za-z0-9_.-]{1,50}$/.test(code))) return null
  return [...new Set(raw as string[])]
}
export const parseSharedRoles = (text: string | null | undefined): string[] => String(text ?? '').split(',').filter(Boolean)

/** تعريف تقرير محفوظ من بانِي التقارير: لصاحبه، وممكن يتشارك مع أدوار (المشارَك معاه بيشغّله بصلاحياته ونطاقه هو) */
@Entity('report_definitions')
export class ReportDefinition {
  @PrimaryGeneratedColumn({ primaryKeyConstraintName: 'PK_report_definitions' })
  id: number

  @Column({ type: 'int' })
  ownerUserId: number

  @Column({ type: 'nvarchar', length: 120 })
  name: string

  @Column({ type: 'nvarchar', length: 30 })
  source: string

  /** JSON: الأعمدة والفلاتر والتجميع (مفاتيح من القاموس) */
  @Column({ type: 'nvarchar', length: 4000 })
  definition: string

  /** أكواد الأدوار المشارَك معاها مفصولة بفاصلة */
  @Column({ type: 'nvarchar', length: 600, nullable: true })
  sharedRoles: string | null

  @Column({ type: 'datetime2' })
  createdAt: Date

  @Column({ type: 'datetime2' })
  updatedAt: Date
}

let ready: boolean | null = null
/** جدول ترحيل 175 موجود؟ */
export async function reportDefinitionsReady(em: EntityManager): Promise<boolean> {
  if (ready === true) return true
  const [row] = await em.query(`SELECT CASE WHEN OBJECT_ID(N'dbo.report_definitions', N'U') IS NOT NULL THEN 1 ELSE 0 END AS [ready]`)
  ready = Number(row?.ready) === 1
  return ready
}
/** للاختبارات: نسيان حالة الترحيل */
export function resetReportDefinitionsCache() { ready = null }
