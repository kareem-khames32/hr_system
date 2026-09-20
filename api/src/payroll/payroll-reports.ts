import { BadRequestException } from '@nestjs/common'
import { Between, EntityManager, In } from 'typeorm'
import { MONTHLY_SALARY_COMPONENTS } from '../employees/compensation'
import { OvertimeEntry } from '../requests/entities/attendance.entities'
import { overtimeFinancialValue } from './overtime-financial'
import { payrollEmploymentCoverage } from './payroll-employment'
import { readLoanInstallmentPositions, type LoanInstallmentPosition } from './payroll-installment-balances'
import { PAYROLL_REVERSAL_LINES_TABLE, payrollLineNotReversedSql } from './payroll-reversal-sql'

// تقارير الرواتب (الخطوة 30 / RP-07, RP-08, RP-10, RP-12, PR-07): قراءة فقط، بلا أي كتابة.
// النطاق: null = كل الشركة، رقم موجب = فرع المستخدم، وأي قيمة أخرى = نطاق فارغ.
export type PayrollReportScope = number | null

const DATE_RE = /^\d{4}-\d{2}-\d{2}$/
const DAY_MS = 86_400_000

// ===== المال: قروش صحيحة BigInt وتقريب واحد نصف لأعلى لخانتين (قرار D4) =====
export function reportCents(value: unknown): bigint {
  if (value === null || value === undefined || value === '') return 0n
  const text = typeof value === 'number' ? (Number.isFinite(value) ? value.toFixed(2) : 'x') : String(value).trim()
  const match = /^(-)?(\d+)(?:\.(\d+))?$/.exec(text)
  if (!match) throw new BadRequestException('قيمة مالية غير صالحة في بيانات التقرير')
  const [, sign, whole, fraction = ''] = match
  let cents = BigInt(whole) * 100n + BigInt((fraction + '00').slice(0, 2))
  if (fraction.length > 2 && Number(fraction[2]) >= 5) cents += 1n
  return sign ? -cents : cents
}

export function reportMoney(cents: bigint): string {
  const negative = cents < 0n
  const abs = negative ? -cents : cents
  return `${negative ? '-' : ''}${abs / 100n}.${String(abs % 100n).padStart(2, '0')}`
}

const sumCents = (values: unknown[]) => values.reduce<bigint>((sum, value) => sum + reportCents(value), 0n)

function assertDate(value: string, label: string) {
  if (!DATE_RE.test(value) || new Date(`${value}T00:00:00Z`).toISOString().slice(0, 10) !== value) {
    throw new BadRequestException(`${label} غير صالح؛ الصيغة YYYY-MM-DD`)
  }
}

export function assertReportRange(from: string, to: string) {
  assertDate(from, 'تاريخ بداية الفترة')
  assertDate(to, 'تاريخ نهاية الفترة')
  if (from > to) throw new BadRequestException('بداية الفترة بعد نهايتها')
  if ((Date.parse(to) - Date.parse(from)) / DAY_MS > 366) throw new BadRequestException('فترة التقرير لا تتجاوز سنة واحدة')
}

const emptyScope = (scope: PayrollReportScope) => scope !== null && !(Number.isInteger(scope) && scope > 0)

function parseIds(value: unknown): number[] {
  if (typeof value !== 'string' || !value.trim()) return []
  try {
    const parsed = JSON.parse(value)
    return Array.isArray(parsed) ? parsed.filter(id => Number.isSafeInteger(id) && id > 0) : []
  } catch { return [] }
}

const toNumberOrNull = (value: unknown) => {
  if (value === null || value === undefined || value === '') return null
  const number = Number(value)
  return Number.isFinite(number) ? number : null
}

// ===== الأسماء التنظيمية والتسميات =====
export const PAYROLL_SCOPE_LABELS: Record<string, string> = {
  COMPANY: 'الشركة كاملة', BRANCH: 'فرع', DEPARTMENT: 'قسم', TEAM: 'فريق', COST_CENTER: 'مركز تكلفة', CUSTOM: 'قائمة مخصّصة',
}

export const PAYROLL_EXCLUSION_LABELS: Record<string, string> = {
  SUSPENDED: 'الموظف موقوف', ARCHIVED: 'ملف الموظف مؤرشف', EXC_JOINS_AFTER_PERIOD: 'بداية العمل بعد نهاية الفترة',
  EXC_ARCHIVED_NO_LAST_DAY: 'مؤرشف بلا تاريخ آخر يوم عمل — حدده عشان راتبه يتحسب',
  EXC_TERMINATED_BEFORE_PERIOD: 'انتهاء الخدمة قبل بداية الفترة', EXC_NO_ACTIVE_EMPLOYMENT: 'لا توجد مدة عمل مستحقة داخل الفترة',
  MANUAL: 'استبعاد يدوي', EXC_MANUAL: 'استبعاد يدوي', EXC_ALREADY_IN_RUN: 'مدرج في مسير آخر',
  // أكواد مصدر راتب شهر المسير (payroll-run-salary)
  NO_SALARY_DEFINED: 'لا يوجد راتب موثق لشهر المسير', SALARY_DAILY_HISTORY_ONLY: 'سجل الأجر بتواريخ يومية لا تحدد شهر الراتب',
  SALARY_PAYROLL_PERIOD_GAP: 'شهر المسير غير موثق في سجل الأجر الشهري', SALARY_PAYROLL_PERIOD_INVALID: 'سجل الأجر الشهري غير صالح لهذا الشهر',
  SALARY_HISTORY_INVALID: 'سجل الأجر لا يطابق بصمته الموثقة', SALARY_HISTORY_SCHEMA_MISSING: 'ترحيل سجل الأجر غير مطبق',
  SALARY_COMPONENT_INVALID: 'أحد مكونات الراتب غير صالح',
}

export const UNASSIGNED_REASON_LABELS = {
  DATA_ISSUE: 'بيانات الخدمة ناقصة أو متعارضة',
  EXCLUDED_IN_RUN: 'مستبعد في مسير للفترة',
  JOINED_AFTER_SNAPSHOT: 'أُضيف بعد تجميد لقطة المسير',
  IN_SCOPE_NOT_RECALCULATED: 'ضمن نطاق مسير لم يُعَد حسابه بعد تغيير بيانات الموظف',
  ONLY_CANCELLED_RUN: 'عضو في مسير ملغى فقط',
  NO_SALARY_DEFINED: 'لا يوجد راتب معرّف للموظف',
  NO_RUN_IN_PERIOD: 'لا يوجد أي مسير منشأ لهذه الفترة',
  OUT_OF_ALL_RUN_SCOPES: 'خارج نطاق كل المسيرات المنشأة للفترة',
  SUSPENDED: 'موقوف بلا أجر (غير مستحق في الفترة)',
  // C8 / الخطوة 31: بنده في مسير الفترة عُكس صرفه بسطر منفذ ولم يُصرف بمسير تكميلي بعد
  REVERSED_IN_RUN: 'عُكس صرف بنده في مسير للفترة ولم يُصرف بمسير تكميلي بعد',
} as const
export type UnassignedReasonCode = keyof typeof UNASSIGNED_REASON_LABELS
export const UNASSIGNED_REASON_CODES = Object.keys(UNASSIGNED_REASON_LABELS) as UnassignedReasonCode[]

interface OrgNames { branches: Map<number, string>; departments: Map<number, string>; teams: Map<number, string>; costCenters: Map<number, string> }

async function loadOrgNames(em: EntityManager): Promise<OrgNames> {
  const read = async (table: string) => new Map<number, string>(
    (await em.query(`SELECT [id], [name] FROM [${table}]`)).map((row: any) => [Number(row.id), String(row.name)]))
  return { branches: await read('branches'), departments: await read('departments'), teams: await read('teams'), costCenters: await read('cost_centers') }
}

interface RunRow {
  id: number; name: string | null; period: string; status: string; scopeType: string; scopeIds: string | null
  employeeIds: string | null; branchId: number | null; startDate: string; endDate: string; totalNet: string; createdAt: Date
  runType: string | null; parentRunId: number | null
}

const RUN_COLUMNS = `r.[id], r.[name], r.[period], r.[status], r.[scopeType], r.[scopeIds], r.[employeeIds], r.[branchId],
  CONVERT(varchar(10), r.[startDate], 23) AS [startDate], CONVERT(varchar(10), r.[endDate], 23) AS [endDate],
  CONVERT(varchar(40), r.[totalNet]) AS [totalNet], r.[createdAt], r.[runType], r.[parentRunId]`

const runTypeOf = (run: Pick<RunRow, 'runType'>) => run.runType === 'REVERSAL' || run.runType === 'SUPPLEMENTARY' ? run.runType : 'REGULAR'

export function payrollRunScopeLabel(run: Pick<RunRow, 'scopeType' | 'scopeIds' | 'employeeIds' | 'branchId'>, names: OrgNames) {
  const ids = run.scopeIds ? parseIds(run.scopeIds) : run.branchId ? [run.branchId] : []
  const named = (map: Map<number, string>, prefix: string) =>
    `${prefix}: ${ids.length ? ids.map(id => map.get(id) ?? `#${id}`).join('، ') : 'غير محدد'}`
  switch (run.scopeType) {
    case 'COMPANY': return PAYROLL_SCOPE_LABELS.COMPANY
    case 'BRANCH': return named(names.branches, 'فرع')
    case 'DEPARTMENT': return named(names.departments, 'قسم')
    case 'TEAM': return named(names.teams, 'فريق')
    case 'COST_CENTER': return named(names.costCenters, 'مركز تكلفة')
    case 'CUSTOM': return `قائمة مخصّصة (${parseIds(run.employeeIds).length} موظف)`
    default: return run.scopeType
  }
}

// نفس قاعدة assertRunAccess: الفرع المحفوظ في لقطة العضو، وإلا فرع مسير BRANCH القديم ذي الفرع الواحد.
function legacyBranchOf(run: Pick<RunRow, 'scopeType' | 'scopeIds' | 'branchId'>) {
  const ids = run.scopeIds ? parseIds(run.scopeIds) : [run.branchId]
  return run.scopeType === 'BRANCH' && ids.length === 1 ? ids[0] ?? null : null
}

interface MemberRow {
  runId: number; employeeId: number; membershipStatus: string | null; exclusionReason: string | null
  hasSnapshot: number; snapshotBranchId: string | null; capturedAt: string | null; fullName: string | null; employeeCode: string | null
}

const MEMBER_SELECT = `SELECT m.[runId], m.[employeeId], m.[membershipStatus], m.[exclusionReason],
  CASE WHEN ISJSON(CAST(m.[snapshot] AS nvarchar(max))) = 1 THEN 1 ELSE 0 END AS [hasSnapshot],
  CASE WHEN ISJSON(CAST(m.[snapshot] AS nvarchar(max))) = 1 THEN JSON_VALUE(CAST(m.[snapshot] AS nvarchar(max)), '$.branchId') END AS [snapshotBranchId],
  CASE WHEN ISJSON(CAST(m.[snapshot] AS nvarchar(max))) = 1 THEN JSON_VALUE(CAST(m.[snapshot] AS nvarchar(max)), '$.capturedAt') END AS [capturedAt],
  CASE WHEN ISJSON(CAST(m.[snapshot] AS nvarchar(max))) = 1 THEN JSON_VALUE(CAST(m.[snapshot] AS nvarchar(max)), '$.fullName') END AS [fullName],
  CASE WHEN ISJSON(CAST(m.[snapshot] AS nvarchar(max))) = 1 THEN JSON_VALUE(CAST(m.[snapshot] AS nvarchar(max)), '$.employeeCode') END AS [employeeCode]
  FROM [payroll_run_members] m`

const memberKey = (runId: number, employeeId: number) => `${runId}:${employeeId}`

// C8 / الخطوة 31: سطور عكس الصرف. بند الموظف الذي نُفّذ عكسه (POSTED) لم يعد صرفًا فعليًا: لا يدخل مجاميع الفترة ولا طرق الصرف ولا الفروق ولا تتبع الإضافي،
// وصرفه الفعلي هو بند المسير التكميلي المربوط. مسير العكس نفسه بلا بنود ويُعرض بسطوره سالبة.
interface ReversalLineRow { reversalRunId: number; originalRunId: number; employeeId: number; status: string; netPay: string }
async function loadReversalLines(em: EntityManager, originalRunIds?: number[]): Promise<ReversalLineRow[]> {
  if (originalRunIds && !originalRunIds.length) return []
  const filter = originalRunIds ? ` WHERE [originalRunId] IN (${originalRunIds.map(id => Number(id)).filter(Number.isSafeInteger).join(', ')})` : ''
  return em.query(`SELECT [reversalRunId], [originalRunId], [employeeId], [status], CONVERT(varchar(40), [netPay]) AS [netPay] FROM [${PAYROLL_REVERSAL_LINES_TABLE}]${filter}`)
}
const postedReversalKeys = (lines: ReversalLineRow[]) =>
  new Set(lines.filter(line => line.status === 'POSTED').map(line => memberKey(Number(line.originalRunId), Number(line.employeeId))))

function effectiveBranch(run: RunRow, member: MemberRow | undefined) {
  if (member && Number(member.hasSnapshot) === 1) return toNumberOrNull(member.snapshotBranchId)
  return legacyBranchOf(run)
}

const ITEM_MONEY_COLUMNS = ['basicSalary', 'allowances', 'overtimeAmount', 'otherAdditions', 'latenessDeduction', 'shortfallDeduction',
  'absenceDeduction', 'unpaidLeaveDeduction', 'loanInstallments', 'otherDeductions', 'socialInsuranceDeduction', 'netPay'] as const
type ItemMoneyColumn = typeof ITEM_MONEY_COLUMNS[number]
type ItemRow = { runId: number; employeeId: number; payMethod: string } & Record<ItemMoneyColumn, string>
const ITEM_SELECT = `SELECT i.[runId], i.[employeeId], i.[payMethod], ${ITEM_MONEY_COLUMNS.map(column => `CONVERT(varchar(40), i.[${column}]) AS [${column}]`).join(', ')}
  FROM [payroll_items] i`

const groupBy = <T, K>(rows: T[], key: (row: T) => K) => {
  const map = new Map<K, T[]>()
  for (const row of rows) map.set(key(row), [...(map.get(key(row)) ?? []), row])
  return map
}

// ===== ١) ملخص المسيرات: كل المسيرات حتى التي بلا فرع (LEFT JOIN منطقي) =====
export async function payrollRunsReport(em: EntityManager, scope: PayrollReportScope) {
  if (emptyScope(scope)) return { runs: [], byMethod: [], deductions: [] }
  const names = await loadOrgNames(em)
  const runs: RunRow[] = await em.query(`SELECT ${RUN_COLUMNS} FROM [payroll_runs] r ORDER BY r.[period] DESC, r.[id] DESC`)
  const members: MemberRow[] = await em.query(MEMBER_SELECT)
  const items: ItemRow[] = await em.query(ITEM_SELECT)
  const memberByKey = new Map(members.map(row => [memberKey(Number(row.runId), Number(row.employeeId)), row]))
  const itemsByRun = groupBy(items, row => Number(row.runId))
  const membersByRun = groupBy(members, row => Number(row.runId))
  const reversalLines = await loadReversalLines(em)
  const reversedKeys = postedReversalKeys(reversalLines)
  const linesByReversalRun = groupBy(reversalLines, row => Number(row.reversalRunId))
  const runById = new Map(runs.map(run => [Number(run.id), run]))

  const resultRuns = []
  const activeItems: Array<{ run: RunRow; item: ItemRow }> = []
  for (const run of runs) {
    const runType = runTypeOf(run)
    const base = {
      id: Number(run.id), name: run.name, period: run.period, status: run.status, scopeType: run.scopeType,
      scopeLabel: payrollRunScopeLabel(run, names), runType, parentRunId: run.parentRunId === null ? null : Number(run.parentRunId),
      branchId: run.branchId === null ? null : Number(run.branchId),
      branchName: run.branchId === null ? null : names.branches.get(Number(run.branchId)) ?? null,
      startDate: run.startDate, endDate: run.endDate,
      storedTotalNet: scope === null ? reportMoney(reportCents(run.totalNet)) : null,
    }
    if (runType === 'REVERSAL') {
      // مسير العكس: بلا بنود؛ موظفوه سطور عكسه وصافيه سالب مجموعها، ونطاق الفرع من لقطة العضو في المسير الأصلي
      const runLines = linesByReversalRun.get(Number(run.id)) ?? []
      const parent = runById.get(Number(run.parentRunId))
      const visibleLines = runLines.filter(line => scope === null ||
        (!!parent && effectiveBranch(parent, memberByKey.get(memberKey(Number(line.originalRunId), Number(line.employeeId)))) === scope))
      if (scope !== null && !visibleLines.length) continue
      resultRuns.push({ ...base, employees: visibleLines.length, excluded: 0, totalNet: reportMoney(-sumCents(visibleLines.map(line => line.netPay))),
        reversedEmployees: 0, reversedNet: '0.00', partial: scope !== null && visibleLines.length < runLines.length })
      continue
    }
    const runItems = itemsByRun.get(Number(run.id)) ?? []
    const runMembers = membersByRun.get(Number(run.id)) ?? []
    const inScope = (employeeId: number) => scope === null || effectiveBranch(run, memberByKey.get(memberKey(run.id, employeeId))) === scope
    const visibleItems = runItems.filter(item => inScope(Number(item.employeeId)))
    const visibleMembers = runMembers.filter(member => inScope(Number(member.employeeId)))
    const visible = scope === null || visibleItems.length > 0 || visibleMembers.length > 0 ||
      (!runItems.length && !runMembers.length && legacyBranchOf(run) === scope)
    if (!visible) continue
    const reversed = (item: ItemRow) => reversedKeys.has(memberKey(Number(run.id), Number(item.employeeId)))
    const reversedItems = visibleItems.filter(reversed)
    if (run.status !== 'CANCELLED') for (const item of visibleItems) if (!reversed(item)) activeItems.push({ run, item })
    resultRuns.push({
      ...base,
      employees: visibleItems.length,
      excluded: visibleMembers.filter(member => member.membershipStatus === 'EXCLUDED').length,
      totalNet: reportMoney(sumCents(visibleItems.map(item => item.netPay))),
      // بنود هذا المسير التي نُفّذ عكس صرفها (يقابلها سطر سالب في مسير العكس المربوط)
      reversedEmployees: reversedItems.length, reversedNet: reportMoney(sumCents(reversedItems.map(item => item.netPay))),
      partial: scope !== null && visibleItems.length < runItems.length,
    })
  }

  const methods = new Map<string, { count: number; total: bigint }>()
  for (const { item } of activeItems) {
    const row = methods.get(item.payMethod) ?? { count: 0, total: 0n }
    row.count++; row.total += reportCents(item.netPay)
    methods.set(item.payMethod, row)
  }
  const periods = new Map<string, { employees: number } & Record<ItemMoneyColumn, bigint>>()
  for (const { run, item } of activeItems) {
    const row = periods.get(run.period) ?? Object.assign({ employees: 0 }, Object.fromEntries(ITEM_MONEY_COLUMNS.map(column => [column, 0n])) as Record<ItemMoneyColumn, bigint>)
    row.employees++
    for (const column of ITEM_MONEY_COLUMNS) row[column] += reportCents(item[column])
    periods.set(run.period, row)
  }
  return {
    runs: resultRuns,
    byMethod: [...methods.entries()].map(([payMethod, row]) => ({ payMethod, count: row.count, total: reportMoney(row.total) })),
    deductions: [...periods.entries()].sort((a, b) => b[0].localeCompare(a[0])).map(([period, row]) => ({
      period, employees: row.employees,
      basic: reportMoney(row.basicSalary), allowances: reportMoney(row.allowances), overtime: reportMoney(row.overtimeAmount),
      otherAdditions: reportMoney(row.otherAdditions), lateness: reportMoney(row.latenessDeduction), shortfall: reportMoney(row.shortfallDeduction),
      absence: reportMoney(row.absenceDeduction), unpaidLeave: reportMoney(row.unpaidLeaveDeduction), loans: reportMoney(row.loanInstallments),
      otherDeductions: reportMoney(row.otherDeductions), net: reportMoney(row.netPay),
    })),
  }
}

// ===== مرشحات الموظفين المشتركة =====
export interface PayrollReportEmployeeFilters { branchId?: number; departmentId?: number; teamId?: number; costCenterId?: number }

function employeeWhere(scope: PayrollReportScope, filters: PayrollReportEmployeeFilters, alias = 'e') {
  const where: string[] = []
  const params: unknown[] = []
  const add = (column: string, value: number | null | undefined) => {
    if (value === undefined || value === null) return
    params.push(value)
    where.push(`${alias}.[${column}] = @${params.length - 1}`)
  }
  add('branchId', scope)
  add('branchId', filters.branchId)
  add('departmentId', filters.departmentId)
  add('teamId', filters.teamId)
  add('costCenterId', filters.costCenterId)
  return { sql: where.length ? `WHERE ${where.join(' AND ')}` : '', params }
}

const runRef = (run: RunRow, scope: PayrollReportScope) => {
  // مسير خارج فرع المستخدم لا يُكشف اسمه ولا رقمه (نفس سياسة visibleConflicts).
  const own = scope === null || (run.scopeType === 'BRANCH' && legacyBranchOf(run) === scope)
  return { id: own ? Number(run.id) : null, name: own ? run.name : 'مسير خارج نطاق صلاحيتك', period: run.period, status: run.status,
    startDate: run.startDate, endDate: run.endDate }
}

const rangesOverlap = (a: { startDate: string; endDate: string }, b: { startDate: string; endDate: string }) =>
  a.startDate <= b.endDate && b.startDate <= a.endDate

function employeeInRunScope(run: RunRow, employee: { id: number; branchId: number | null; departmentId: number | null; teamId: number | null; costCenterId: number | null }) {
  const ids = run.scopeIds ? parseIds(run.scopeIds) : run.branchId ? [Number(run.branchId)] : []
  switch (run.scopeType) {
    case 'COMPANY': return true
    case 'BRANCH': return employee.branchId !== null && ids.includes(Number(employee.branchId))
    case 'DEPARTMENT': return employee.departmentId !== null && ids.includes(Number(employee.departmentId))
    case 'TEAM': return employee.teamId !== null && ids.includes(Number(employee.teamId))
    case 'COST_CENTER': return employee.costCenterId !== null && ids.includes(Number(employee.costCenterId))
    case 'CUSTOM': return parseIds(run.employeeIds).includes(Number(employee.id))
    default: return false
  }
}

export interface PayrollUnassignedOptions extends PayrollReportEmployeeFilters {
  from: string; to: string; reason?: string; includeSuspended?: boolean
}

// ===== ٢) موظفون بلا مسير في الفترة (PR-07 / RP-12) =====
export async function payrollUnassignedReport(em: EntityManager, scope: PayrollReportScope, options: PayrollUnassignedOptions) {
  assertReportRange(options.from, options.to)
  const { from, to } = options
  const emptySummary = { from, to, onJob: 0, covered: 0, unassigned: 0, suspended: 0, dataIssues: 0, duplicates: 0 }
  if (emptyScope(scope)) return { summary: emptySummary, runs: [], rows: [], duplicates: [] }
  const names = await loadOrgNames(em)
  const filter = employeeWhere(scope, options)
  const componentColumns = MONTHLY_SALARY_COMPONENTS.map(component => `CONVERT(varchar(40), ISNULL(e.[${component.key}], 0)) AS [${component.key}]`).join(', ')
  const employees: any[] = await em.query(`SELECT e.[id], e.[employeeCode], e.[fullName], e.[branchId], e.[departmentId], e.[teamId], e.[costCenterId],
    e.[status], e.[isActive], CONVERT(varchar(10), e.[joinDate], 23) AS [joinDate], CONVERT(varchar(10), e.[actualStartDate], 23) AS [actualStartDate],
    e.[archivedAt], e.[createdAt], ${componentColumns}
    FROM [employees] e ${filter.sql} ORDER BY e.[employeeCode], e.[id]`, filter.params)
  const cases = groupBy(await em.query(`SELECT [employeeId], CONVERT(varchar(10), [lastWorkingDay], 23) AS [lastWorkingDay], [status] FROM [offboarding_cases]`),
    (row: any) => Number(row.employeeId))
  const runs: RunRow[] = await em.query(`SELECT ${RUN_COLUMNS} FROM [payroll_runs] r
    WHERE r.[startDate] <= CONVERT(date, @1, 23) AND r.[endDate] >= CONVERT(date, @0, 23) ORDER BY r.[startDate], r.[id]`, [from, to])
  const runIds = runs.map(run => Number(run.id))
  const runById = new Map(runs.map(run => [Number(run.id), run]))
  const inRuns = runIds.length ? `IN (${runIds.join(', ')})` : 'IN (NULL)'
  const members: MemberRow[] = runIds.length ? await em.query(`${MEMBER_SELECT} WHERE m.[runId] ${inRuns}`) : []
  const items: Array<{ runId: number; employeeId: number }> = runIds.length ? await em.query(`SELECT [runId], [employeeId] FROM [payroll_items] WHERE [runId] ${inRuns}`) : []
  const membersByEmployee = groupBy(members, row => Number(row.employeeId))
  const itemsByEmployee = groupBy(items, row => Number(row.employeeId))
  const reversedKeys = postedReversalKeys(await loadReversalLines(em, runIds))
  // آخر حساب للمسير بساعة قاعدة البيانات نفسها التي تكتب employees.createdAt — لا نقارن بساعة Node في capturedAt:
  // وقت إنشاء المسير أو أحدث حدث حساب/إعادة حساب مسجل عليه (كل ما عدا الاعتماد والصرف وإعادة الفتح والإلغاء).
  const snapshotAt = new Map<number, number>()
  for (const run of runs) snapshotAt.set(Number(run.id), new Date(run.createdAt).getTime())
  if (runIds.length) {
    const calculated: Array<{ runId: number; lastAt: Date }> = await em.query(`SELECT [runId], MAX([createdAt]) AS [lastAt] FROM [payroll_run_events]
      WHERE [runId] ${inRuns} AND [eventType] NOT IN ('APPROVED', 'PAID', 'REOPENED', 'CANCELLED') GROUP BY [runId]`)
    for (const event of calculated) {
      const time = new Date(event.lastAt).getTime()
      if (Number.isFinite(time) && time > (snapshotAt.get(Number(event.runId)) ?? 0)) snapshotAt.set(Number(event.runId), time)
    }
  }
  const lastRuns = new Map<number, any>((await em.query(`SELECT [employeeId], [runId], [period], [name], [status], [startDate], [endDate], [scopeType], [scopeIds], [branchId] FROM (
      SELECT i.[employeeId], r.[id] AS [runId], r.[period], r.[name], r.[status], r.[scopeType], r.[scopeIds], r.[branchId],
        CONVERT(varchar(10), r.[startDate], 23) AS [startDate], CONVERT(varchar(10), r.[endDate], 23) AS [endDate],
        ROW_NUMBER() OVER (PARTITION BY i.[employeeId] ORDER BY r.[endDate] DESC, r.[id] DESC) AS [rn]
      FROM [payroll_items] i INNER JOIN [payroll_runs] r ON r.[id] = i.[runId] WHERE r.[status] <> 'CANCELLED' AND ${payrollLineNotReversedSql('r.[id]', 'i.[employeeId]')}) x WHERE x.[rn] = 1`))
    .map((row: any) => [Number(row.employeeId), row]))
  const pendingInstallments = new Map<number, any>((await em.query(`SELECT l.[employeeId], COUNT(*) AS [count],
      CONVERT(varchar(40), SUM(i.[amount] - ISNULL(i.[paidAmount], 0))) AS [amount]
      FROM [loan_installments] i INNER JOIN [loans] l ON l.[id] = i.[loanId]
      WHERE (i.[financialStatus] = 'DUE' OR (i.[financialStatus] IS NULL AND i.[paid] = 0)) AND i.[dueDate] <= CONVERT(date, @0, 23)
      GROUP BY l.[employeeId]`, [to])).map((row: any) => [Number(row.employeeId), row]))
  const approvedOvertime = new Map<number, number>((await em.query(`SELECT [employeeId], COUNT(*) AS [count] FROM [overtime_entries]
      WHERE [status] = 'APPROVED' AND [date] BETWEEN CONVERT(date, @0, 23) AND CONVERT(date, @1, 23) GROUP BY [employeeId]`, [from, to]))
    .map((row: any) => [Number(row.employeeId), Number(row.count)]))
  const pendingObligations = new Map<number, number>((await em.query(`SELECT [employeeId], COUNT(*) AS [count] FROM [employee_obligations]
      WHERE [status] = 'PENDING' AND ([effectiveDate] IS NULL OR [effectiveDate] <= CONVERT(date, @0, 23)) GROUP BY [employeeId]`, [to]))
    .map((row: any) => [Number(row.employeeId), Number(row.count)]))

  const activeRuns = runs.filter(run => run.status !== 'CANCELLED')
  const summary = { ...emptySummary }
  const rows: any[] = []
  const duplicates: any[] = []
  const visibleRunIds = new Set<number>()
  for (const emp of employees) {
    const employeeId = Number(emp.id)
    const employee = { id: employeeId, branchId: toNumberOrNull(emp.branchId), departmentId: toNumberOrNull(emp.departmentId),
      teamId: toNumberOrNull(emp.teamId), costCenterId: toNumberOrNull(emp.costCenterId) }
    let coverage: ReturnType<typeof payrollEmploymentCoverage> = null
    let dataIssue: string | null = null
    try {
      coverage = payrollEmploymentCoverage({ ...emp, isActive: Boolean(emp.isActive) }, cases.get(employeeId) ?? [], from, to)
    } catch (error) {
      if (!(error instanceof BadRequestException)) throw error
      dataIssue = error.message
    }
    const suspended = !coverage && !dataIssue && emp.status === 'suspended'
    if (!coverage && !dataIssue && !suspended) continue // ليس على رأس العمل في الفترة

    const employeeMembers = membersByEmployee.get(employeeId) ?? []
    const rawItems = itemsByEmployee.get(employeeId) ?? []
    for (const row of [...employeeMembers, ...rawItems]) visibleRunIds.add(Number(row.runId))
    // C8: البند المعكوس صرفه بسطر منفذ لا يغطي الموظف في الفترة (يغطيه المسير التكميلي المربوط إن صُرف)
    const reversedIn = (runId: number) => reversedKeys.has(memberKey(runId, employeeId))
    const reversedRunIds = new Set<number>([...employeeMembers.filter(member => member.membershipStatus !== 'EXCLUDED'), ...rawItems]
      .map(row => Number(row.runId)).filter(reversedIn))
    const employeeItems = rawItems.filter(item => !reversedIn(Number(item.runId)))
    const includedRunIds = new Set<number>([
      ...employeeMembers.filter(member => member.membershipStatus !== 'EXCLUDED' && !reversedIn(Number(member.runId))).map(member => Number(member.runId)),
      ...employeeItems.map(item => Number(item.runId)),
    ])
    const includedActive = activeRuns.filter(run => includedRunIds.has(Number(run.id)))
    if (!suspended) summary.onJob++
    if (includedActive.length) {
      if (!suspended) summary.covered++
      const overlapping = includedActive.filter(run => includedActive.some(other => other.id !== run.id && rangesOverlap(run, other)))
      if (overlapping.length) {
        summary.duplicates++
        duplicates.push({ employeeId, employeeCode: emp.employeeCode, fullName: emp.fullName, runs: overlapping.map(run => runRef(run, scope)) })
      }
      continue
    }

    const reasons: Array<{ code: UnassignedReasonCode; label: string; detail: string | null; run: ReturnType<typeof runRef> | null }> = []
    const reason = (code: UnassignedReasonCode, detail: string | null = null, run: RunRow | null = null) =>
      reasons.push({ code, label: UNASSIGNED_REASON_LABELS[code], detail, run: run ? runRef(run, scope) : null })
    if (dataIssue) reason('DATA_ISSUE', dataIssue)
    if (suspended) reason('SUSPENDED')
    for (const member of employeeMembers.filter(row => row.membershipStatus === 'EXCLUDED')) {
      const run = runById.get(Number(member.runId))
      if (run && run.status !== 'CANCELLED') {
        const code = member.exclusionReason ?? 'EXC_MANUAL'
        reason('EXCLUDED_IN_RUN', PAYROLL_EXCLUSION_LABELS[code] ?? 'سبب استبعاد غير معروف — راجع المسير', run)
      }
    }
    for (const runId of reversedRunIds) {
      const run = runById.get(runId)
      if (run && run.status !== 'CANCELLED') reason('REVERSED_IN_RUN', 'نُفّذ عكس صرف بنده؛ اصرفه بمسير تكميلي مربوط بالمسير', run)
    }
    // أُضيف ملفه للنظام بعد آخر لقطة للمسير الذي يشمل نطاقه ⇒ «التحق بعد التجميد»، وإلا تغيّر تنظيمه بعد الحساب
    const addedAt = new Date(emp.createdAt).getTime()
    const joinedAfter: RunRow[] = [], notRecalculated: RunRow[] = []
    for (const run of activeRuns) {
      if (includedRunIds.has(Number(run.id)) || reversedRunIds.has(Number(run.id)) || employeeMembers.some(member => Number(member.runId) === Number(run.id))) continue
      if (!employeeInRunScope(run, employee)) continue
      if (Number.isFinite(addedAt) && addedAt > (snapshotAt.get(Number(run.id)) ?? 0)) joinedAfter.push(run)
      else notRecalculated.push(run)
    }
    for (const run of joinedAfter) reason('JOINED_AFTER_SNAPSHOT', 'أعد حساب المسير أو أنشئ مسيرًا يضمه', run)
    for (const run of notRecalculated) reason('IN_SCOPE_NOT_RECALCULATED', 'تغيّر فرع/قسم الموظف أو ملفه بعد الحساب؛ أعد حساب المسير', run)
    const cancelledOnly = runs.filter(run => run.status === 'CANCELLED' && includedRunIds.has(Number(run.id)))
    for (const run of cancelledOnly) reason('ONLY_CANCELLED_RUN', null, run)
    const gross = sumCents(MONTHLY_SALARY_COMPONENTS.map(component => emp[component.key]))
    if (gross <= 0n) reason('NO_SALARY_DEFINED', 'مكونات الراتب الست كلها صفر')
    if (!reasons.some(row => ['EXCLUDED_IN_RUN', 'REVERSED_IN_RUN', 'JOINED_AFTER_SNAPSHOT', 'IN_SCOPE_NOT_RECALCULATED', 'ONLY_CANCELLED_RUN'].includes(row.code))) {
      if (!activeRuns.length) reason('NO_RUN_IN_PERIOD')
      else reason('OUT_OF_ALL_RUN_SCOPES')
    }
    if (suspended) summary.suspended++
    else summary.unassigned++
    if (dataIssue) summary.dataIssues++
    if (suspended && !options.includeSuspended) continue
    const primary = reasons[0]
    if (options.reason && !reasons.some(row => row.code === options.reason)) continue
    const last = lastRuns.get(employeeId)
    const pending = pendingInstallments.get(employeeId)
    rows.push({
      employeeId, employeeCode: emp.employeeCode, fullName: emp.fullName, status: emp.status,
      branchId: employee.branchId, branchName: employee.branchId ? names.branches.get(employee.branchId) ?? null : null,
      departmentId: employee.departmentId, departmentName: employee.departmentId ? names.departments.get(employee.departmentId) ?? null : null,
      teamName: employee.teamId ? names.teams.get(employee.teamId) ?? null : null,
      hireDate: emp.actualStartDate || emp.joinDate || null, leaveDate: coverage?.leaveDate ?? null,
      coverFrom: coverage?.coverFrom ?? null, coverTo: coverage?.coverTo ?? null, coverDays: coverage?.coverDays ?? null,
      reason: primary.code, reasonLabel: primary.label, detail: primary.detail, reasons,
      lastRun: last ? runRef({ ...last, id: Number(last.runId) } as RunRow, scope) : null,
      pending: { installments: Number(pending?.count ?? 0), installmentsAmount: reportMoney(reportCents(pending?.amount ?? '0')),
        approvedOvertime: approvedOvertime.get(employeeId) ?? 0, obligations: pendingObligations.get(employeeId) ?? 0 },
    })
  }
  const runSummaries = runs.filter(run => scope === null || visibleRunIds.has(Number(run.id))).map(run => ({
    ...runRef(run, scope), scopeLabel: payrollRunScopeLabel(run, names),
    members: members.filter(member => Number(member.runId) === Number(run.id) && member.membershipStatus !== 'EXCLUDED').length,
    excluded: members.filter(member => Number(member.runId) === Number(run.id) && member.membershipStatus === 'EXCLUDED').length,
  }))
  return { summary, runs: scope === null ? runSummaries : runSummaries.map(({ members: _m, excluded: _e, ...run }) => run), rows, duplicates }
}

// ===== ٣) العمل الإضافي بالمبالغ (RP-07) =====
export interface PayrollOvertimeReportOptions extends PayrollReportEmployeeFilters { from: string; to: string; status?: string }

export const OVERTIME_AMOUNT_SOURCE_LABELS: Record<string, string> = {
  PAYROLL_ITEM: 'من بند المسير', PAYROLL_ITEM_ALLOCATED: 'موزّع من بند المسير بنسبة الساعات', APPROVAL_SNAPSHOT: 'لقطة الاعتماد',
  ESTIMATE: 'تقديري بالراتب الحالي', PENDING: 'لم يُعتمد بعد', NOT_PAYABLE: 'غير مستحق', UNRESOLVED: 'يحتاج مراجعة',
}

// ساعات مرجّحة بوحدات صحيحة: الساعات decimal(5,2) × المضاعف decimal(4,2) ⇒ ×10000 بلا أخطاء عشرية
export function overtimeWeightUnits(payableHours: unknown, multiplier: unknown): bigint | null {
  if (payableHours === null || payableHours === undefined || multiplier === null || multiplier === undefined) return null
  const hours = Number(payableHours), rate = Number(multiplier)
  if (!Number.isFinite(hours) || !Number.isFinite(rate) || hours < 0 || rate < 0) return null
  return BigInt(Math.round(hours * 100)) * BigInt(Math.round(rate * 100))
}

/**
 * بند مسير قديم يجمع عدة سجلات إضافي بقيمة واحدة: توزيع القيمة المصروفة فعلًا على سجلاتها بنسبة الساعات المرجّحة
 * (الساعات × المضاعف — نفس أساس الحساب القديم) بطريقة أكبر باقٍ، فمجموع القروش = قيمة البند بالضبط.
 * يعيد null حين يتعذر التوزيع بأمانة (ساعات ناقصة، أو أوزان صفرية مع قيمة موجبة) — لا صفر مخترع.
 */
export function allocateOvertimeItemCents(itemCents: bigint, weights: Array<{ id: number; units: bigint | null }>): Map<number, bigint> | null {
  if (itemCents < 0n || !weights.length || weights.some(row => row.units === null || row.units < 0n)) return null
  const total = weights.reduce((sum, row) => sum + (row.units as bigint), 0n)
  if (total === 0n) return itemCents === 0n ? new Map(weights.map(row => [row.id, 0n])) : null
  const shares = weights.map(row => ({ id: row.id, cents: itemCents * (row.units as bigint) / total, remainder: itemCents * (row.units as bigint) % total }))
  let left = itemCents - shares.reduce((sum, row) => sum + row.cents, 0n)
  for (const row of [...shares].sort((a, b) => (a.remainder === b.remainder ? a.id - b.id : a.remainder > b.remainder ? -1 : 1))) {
    if (left <= 0n) break
    row.cents += 1n; left -= 1n
  }
  return new Map(shares.map(row => [row.id, row.cents]))
}

interface OvertimeTrace {
  runId: number; amount: bigint | null; source: 'PAYROLL_ITEM' | 'PAYROLL_ITEM_ALLOCATED' | 'UNRESOLVED'
  hourlyRate: number | null; issue: string | null; itemKey: string | null
}

export async function payrollOvertimeReport(em: EntityManager, scope: PayrollReportScope, options: PayrollOvertimeReportOptions) {
  assertReportRange(options.from, options.to)
  const { from, to } = options
  const empty = { from, to, rows: [], summary: { entries: 0, byStatus: {}, detectedMinutes: 0, approvedMinutes: 0, approvedAmount: '0.00',
    estimatedAmount: '0.00', paidInRunsAmount: '0.00', allocatedAmount: '0.00', unallocatedInRunsAmount: '0.00', payrollColumnTotal: '0.00',
    rejected: 0, unresolved: 0, withIssues: 0, approvalRatio: null } }
  if (emptyScope(scope)) return empty
  const names = await loadOrgNames(em)
  const filter = employeeWhere(scope, options)
  const componentColumns = MONTHLY_SALARY_COMPONENTS.map(component => `CONVERT(varchar(40), ISNULL(e.[${component.key}], 0)) AS [${component.key}]`).join(', ')
  const employees: any[] = await em.query(`SELECT e.[id], e.[employeeCode], e.[fullName], e.[branchId], e.[departmentId], ${componentColumns}
    FROM [employees] e ${filter.sql}`, filter.params)
  const employeeById = new Map(employees.map(emp => [Number(emp.id), emp]))
  const ids = [...employeeById.keys()]
  const entries: OvertimeEntry[] = []
  for (let offset = 0; offset < ids.length; offset += 500) {
    entries.push(...await em.find(OvertimeEntry, { where: { employeeId: In(ids.slice(offset, offset + 500)), date: Between(from, to),
      ...(options.status ? { status: options.status as OvertimeEntry['status'] } : {}) }, order: { date: 'ASC', id: 'ASC' } }))
  }
  const config = new Map<string, string>((await em.query(`SELECT [key], [value] FROM [requests_config] WHERE [key] IN ('payroll.monthly_days', 'payroll.daily_hours')`))
    .map((row: any) => [row.key, row.value]))
  const monthlyDays = Number(config.get('payroll.monthly_days') ?? '30'), dailyHours = Number(config.get('payroll.daily_hours') ?? '8')
  // تتبع المصدر داخل بنود المسيرات غير الملغاة (يشمل الإضافي المرحّل لمسير لاحق).
  // البند الحديث يفصّل قيمة كل سجل (breakdown.overtime). البند القديم بمراجع فقط (overtimeEntryIds) تُوزَّع قيمته المصروفة
  // على سجلاته بنسبة الساعات المرجّحة؛ وما يتعذر توزيعه يبقى «يحتاج مراجعة» بقيمة مجهولة — لا يتحول المجهول إلى صفر أبدًا.
  const traces = new Map<number, OvertimeTrace>()
  const legacyItems: Array<{ key: string; runId: number; ids: number[]; cents: bigint; hoursCents: bigint; hourlyRate: number | null }> = []
  const involved = [...new Set(entries.map(entry => entry.employeeId))]
  const runRows = new Map<number, RunRow>()
  for (let offset = 0; offset < involved.length; offset += 500) {
    const chunk = involved.slice(offset, offset + 500)
    const rows: any[] = await em.query(`SELECT i.[runId], i.[employeeId], i.[breakdown], CONVERT(varchar(40), i.[overtimeAmount]) AS [itemOvertimeAmount],
      CONVERT(varchar(40), i.[overtimeHours]) AS [itemOvertimeHours], ${RUN_COLUMNS}
      FROM [payroll_items] i INNER JOIN [payroll_runs] r ON r.[id] = i.[runId]
      WHERE r.[status] <> 'CANCELLED' AND r.[endDate] >= CONVERT(date, @0, 23) AND i.[employeeId] IN (${chunk.map((_, index) => `@${index + 1}`).join(', ')})
        AND ${payrollLineNotReversedSql('r.[id]', 'i.[employeeId]')}`,
    [from, ...chunk])
    for (const row of rows) {
      runRows.set(Number(row.runId), row)
      let breakdown: any = null
      try { breakdown = row.breakdown ? JSON.parse(row.breakdown) : null } catch { breakdown = null }
      const details: any[] = Array.isArray(breakdown?.overtime) ? breakdown.overtime : []
      const hourlyRate = toNumberOrNull(breakdown?.hourRate)
      const detailed = new Set<number>()
      for (const trace of details) {
        if (!Number.isSafeInteger(trace?.id) || !Number.isFinite(trace?.amount)) continue
        detailed.add(trace.id)
        traces.set(trace.id, { runId: Number(row.runId), amount: reportCents(trace.amount), source: 'PAYROLL_ITEM',
          hourlyRate: toNumberOrNull(trace.hourlyRate) ?? hourlyRate, issue: null, itemKey: null })
      }
      const ids: number[] = Array.isArray(breakdown?.overtimeEntryIds)
        ? [...new Set<number>(breakdown.overtimeEntryIds.filter((id: unknown) => Number.isSafeInteger(id)))] : []
      if (!ids.length) continue
      const itemKey = `${row.runId}:${row.employeeId}`
      if (details.length) {
        // بند مفصّل يذكر سجلًا بلا قيمة صالحة له: مرتبط بالمسير وقيمته مجهولة
        for (const id of ids) if (!detailed.has(id) && !traces.has(id)) traces.set(id, { runId: Number(row.runId), amount: null, source: 'UNRESOLVED',
          hourlyRate, issue: 'بند المسير يذكر السجل دون قيمة مفصّلة صالحة له؛ راجع المسير', itemKey })
        continue
      }
      legacyItems.push({ key: itemKey, runId: Number(row.runId), ids, cents: reportCents(row.itemOvertimeAmount),
        hoursCents: reportCents(row.itemOvertimeHours), hourlyRate })
    }
  }
  // أوزان سجلات البنود القديمة: من سجلات التقرير، وما خرج عن الفترة أو المرشح يُقرأ للتوزيع فقط
  const entryById = new Map(entries.map(entry => [entry.id, entry]))
  const missingSources = [...new Set(legacyItems.flatMap(item => item.ids))].filter(id => !entryById.has(id))
  for (let offset = 0; offset < missingSources.length; offset += 500) {
    for (const entry of await em.find(OvertimeEntry, { where: { id: In(missingSources.slice(offset, offset + 500)) } })) entryById.set(entry.id, entry)
  }
  const unallocatedItems = new Map<string, bigint>()
  for (const item of legacyItems) {
    const sources = item.ids.map(id => entryById.get(id))
    const weights = item.ids.map((id, index) => ({ id, units: sources[index] ? overtimeWeightUnits(sources[index]!.payableHours, sources[index]!.rate) : null }))
    const complete = sources.every(Boolean) && weights.every(row => row.units !== null)
    const units = complete ? weights.reduce((sum, row) => sum + (row.units as bigint), 0n) : null
    const hoursNow = complete ? sources.reduce((sum, entry) => sum + BigInt(Math.round(Number(entry!.payableHours) * 100)), 0n) : null
    let issue: string | null = null
    if (!sources.every(Boolean)) issue = `بند المسير يذكر ${item.ids.length} سجل إضافي وبعضها لم يعد موجودًا`
    else if (hoursNow !== null && hoursNow !== item.hoursCents) {
      issue = `ساعات السجلات الحالية (${reportMoney(hoursNow)}) لا تطابق ساعات بند المسير (${reportMoney(item.hoursCents)})؛ راجع المسير`
    } else if (units !== null && item.hourlyRate !== null) {
      // هامش تقريب أجر الساعة المحفوظ لخانتين (0.005 لكل ساعة مرجّحة) + قرش
      const expected = Number(units) / 10000 * item.hourlyRate
      if (Math.abs(expected - Number(item.cents) / 100) > Number(units) / 10000 * 0.005 + 0.01) {
        issue = `قيمة بند المسير (${reportMoney(item.cents)}) لا تطابق الساعات × المضاعف × أجر الساعة (${expected.toFixed(2)})`
      }
    }
    if (item.ids.length === 1) {
      if (!traces.has(item.ids[0])) traces.set(item.ids[0], { runId: item.runId, amount: item.cents, source: 'PAYROLL_ITEM', hourlyRate: item.hourlyRate, issue, itemKey: null })
      continue
    }
    const shares = complete ? allocateOvertimeItemCents(item.cents, weights) : null
    if (!shares) unallocatedItems.set(item.key, item.cents)
    for (const id of item.ids) {
      if (traces.has(id)) continue
      traces.set(id, shares
        ? { runId: item.runId, amount: shares.get(id)!, source: 'PAYROLL_ITEM_ALLOCATED', hourlyRate: item.hourlyRate, issue, itemKey: item.key }
        : { runId: item.runId, amount: null, source: 'UNRESOLVED', hourlyRate: item.hourlyRate, itemKey: item.key,
          issue: issue ?? `بند مسير قديم يجمع ${item.ids.length} سجلات بقيمة ${reportMoney(item.cents)} دون تفصيل؛ تعذر توزيعها لنقص الساعات المستحقة` })
    }
  }
  const extraRunIds = [...new Set(entries.map(entry => entry.payrollRunId).filter(id => id && !runRows.has(Number(id))))]
  if (extraRunIds.length) for (const run of await em.query(`SELECT ${RUN_COLUMNS} FROM [payroll_runs] r WHERE r.[id] IN (${extraRunIds.map(Number).join(', ')})`)) runRows.set(Number(run.id), run)

  const byStatus: Record<string, { count: number; minutes: number; amount: bigint }> = {}
  let approvedAmount = 0n, estimatedAmount = 0n, paidInRuns = 0n, allocatedAmount = 0n, detectedMinutesTotal = 0, approvedMinutesTotal = 0, rejected = 0, unresolved = 0, withIssues = 0
  const unallocatedShown = new Set<string>()
  const rows = entries.map(entry => {
    const emp = employeeById.get(entry.employeeId)
    const snapshot = (entry.calculationSnapshot ?? {}) as Record<string, any>
    const approval = snapshot.approval, submission = snapshot.submission
    // دليل الاعتماد أولًا: طلب الفترة المقفولة بيتحسب من البصمات وقت الاعتماد (قبلها نفس دليل التقديم).
    const detectedMinutes = toNumberOrNull(approval?.evidence?.detectedMinutes ?? submission?.evidence?.detectedMinutes ??
      (entry.hoursActual == null ? null : Math.round(Number(entry.hoursActual) * 60)))
    const requestedMinutes = toNumberOrNull(submission?.requestedMinutes ?? (entry.hoursRequested == null ? null : Math.round(Number(entry.hoursRequested) * 60)))
    const payable = ['APPROVED', 'PAID'].includes(entry.status)
    let approvedMinutes = entry.approvedMinutes ?? (payable && entry.payableHours != null ? Math.round(Number(entry.payableHours) * 60) : null)
    let amount: bigint | null = null, amountSource = 'PENDING', multiplier = toNumberOrNull(entry.rate), hourlyRate: number | null = null, issue: string | null = null
    const trace = traces.get(entry.id)
    if (['REJECTED', 'CANCELLED'].includes(entry.status)) { amount = 0n; amountSource = 'NOT_PAYABLE'; approvedMinutes = null }
    else if (trace) {
      amount = trace.amount; amountSource = trace.source; issue = trace.issue
      if (trace.hourlyRate !== null) hourlyRate = trace.hourlyRate
      if (trace.source === 'UNRESOLVED' && trace.itemKey && unallocatedItems.has(trace.itemKey)) unallocatedShown.add(trace.itemKey)
    }
    else if (payable) {
      try {
        const value = overtimeFinancialValue(entry, 0)
        if (value.provenance === 'APPROVAL_SNAPSHOT') {
          amount = reportCents(value.amount); amountSource = 'APPROVAL_SNAPSHOT'; multiplier = value.multiplier; hourlyRate = value.hourlyRate
        } else if (entry.payableHours == null) {
          amountSource = 'UNRESOLVED'; issue = 'سجل إضافي قديم بلا ساعات مستحقة مثبتة'
        } else {
          const gross = Number(sumCents(MONTHLY_SALARY_COMPONENTS.map(component => emp?.[component.key]))) / 100
          hourlyRate = gross / monthlyDays / dailyHours
          amount = reportCents(Number(entry.payableHours) * Number(entry.rate) * hourlyRate); amountSource = 'ESTIMATE'
        }
      } catch (error: any) {
        amountSource = 'UNRESOLVED'; issue = error?.response?.message ?? error?.message ?? 'لقطة الإضافي غير صالحة'
      }
    }
    const status = byStatus[entry.status] ?? (byStatus[entry.status] = { count: 0, minutes: 0, amount: 0n })
    status.count++
    status.minutes += approvedMinutes ?? detectedMinutes ?? requestedMinutes ?? 0
    if (amount !== null) status.amount += amount
    if (detectedMinutes !== null && entry.status !== 'CANCELLED') detectedMinutesTotal += detectedMinutes
    if (payable && approvedMinutes !== null) approvedMinutesTotal += approvedMinutes
    if (payable && amount !== null && amountSource !== 'ESTIMATE') approvedAmount += amount
    if (payable && amount !== null && amountSource === 'ESTIMATE') estimatedAmount += amount
    if ((amountSource === 'PAYROLL_ITEM' || amountSource === 'PAYROLL_ITEM_ALLOCATED') && amount !== null) paidInRuns += amount
    if (amountSource === 'PAYROLL_ITEM_ALLOCATED' && amount !== null) allocatedAmount += amount
    if (entry.status === 'REJECTED') rejected++
    if (amountSource === 'UNRESOLVED') unresolved++
    if (issue) withIssues++
    const runId = trace?.runId ?? entry.payrollRunId ?? null
    const run = runId ? runRows.get(Number(runId)) : undefined
    return {
      id: entry.id, employeeId: entry.employeeId, employeeCode: emp?.employeeCode ?? null, fullName: emp?.fullName ?? null,
      departmentName: emp?.departmentId ? names.departments.get(Number(emp.departmentId)) ?? null : null,
      date: entry.date, source: entry.source, status: entry.status, dayKind: approval?.dayKind ?? null,
      detectedMinutes, requestedMinutes, approvedMinutes,
      differenceMinutes: detectedMinutes !== null && approvedMinutes !== null ? detectedMinutes - approvedMinutes : null,
      multiplier, hourlyRate: hourlyRate === null ? null : Math.round(hourlyRate * 1e4) / 1e4,
      amount: amount === null ? null : reportMoney(amount), amountSource, amountSourceLabel: OVERTIME_AMOUNT_SOURCE_LABELS[amountSource], issue,
      approverId: approval?.approverId ?? null, approvedAt: approval?.approvedAt ?? null,
      run: run ? runRef(run, scope) : null, deferredFromRunId: entry.deferredFromRunId ?? null,
    }
  })
  // عمود الإضافي في بنود المسيرات غير الملغاة المتداخلة مع الفترة (مطابقة RP-T2).
  const column = await em.query(`SELECT CONVERT(varchar(40), ISNULL(SUM(i.[overtimeAmount]), 0)) AS [total]
    FROM [payroll_items] i INNER JOIN [payroll_runs] r ON r.[id] = i.[runId] INNER JOIN [employees] e ON e.[id] = i.[employeeId]
    ${filter.sql ? `${filter.sql} AND` : 'WHERE'} r.[status] <> 'CANCELLED' AND r.[startDate] <= CONVERT(date, @${filter.params.length + 1}, 23)
      AND r.[endDate] >= CONVERT(date, @${filter.params.length}, 23) AND ${payrollLineNotReversedSql('r.[id]', 'i.[employeeId]')}`, [...filter.params, from, to])
  return {
    from, to, rows,
    summary: {
      entries: rows.length,
      byStatus: Object.fromEntries(Object.entries(byStatus).map(([key, value]) => [key, { count: value.count, minutes: value.minutes, amount: reportMoney(value.amount) }])),
      detectedMinutes: detectedMinutesTotal, approvedMinutes: approvedMinutesTotal,
      approvedAmount: reportMoney(approvedAmount), estimatedAmount: reportMoney(estimatedAmount), paidInRunsAmount: reportMoney(paidInRuns),
      // الموزّع جزء من داخل بنود المسيرات؛ غير الموزّع = قيمة بنود قديمة ظهرت سجلاتها بلا قيمة (تُحسب مرة لكل بند)
      allocatedAmount: reportMoney(allocatedAmount),
      unallocatedInRunsAmount: reportMoney([...unallocatedShown].reduce((sum, key) => sum + (unallocatedItems.get(key) ?? 0n), 0n)),
      payrollColumnTotal: reportMoney(reportCents(column[0]?.total ?? '0')), rejected, unresolved, withIssues,
      approvalRatio: detectedMinutesTotal > 0 ? Math.round(approvedMinutesTotal / detectedMinutesTotal * 10000) / 100 : null,
    },
  }
}

// ===== ٤) السلف والأرصدة وجدول الأقساط (RP-08) =====
export interface PayrollLoansReportOptions extends PayrollReportEmployeeFilters { status?: 'open' | 'settled' | 'all'; today: string; from?: string; to?: string }

export const INSTALLMENT_STATUS_LABELS: Record<string, string> = { DUE: 'مستحق', PARTIAL: 'سداد جزئي', DEFERRED: 'مؤجل', PAID: 'مسدد', SETTLED: 'مسوّى', REVERSED: 'مُلغى بعكس صرف مسير' }

export async function payrollLoansReport(em: EntityManager, scope: PayrollReportScope, options: PayrollLoansReportOptions) {
  assertDate(options.today, 'تاريخ اليوم')
  if (options.from || options.to) assertReportRange(options.from ?? '', options.to ?? '')
  const empty = { today: options.today, rows: [], aging: [], forecast: [], afterService: [],
    summary: { loans: 0, principal: '0.00', paid: '0.00', remaining: '0.00', overdue: '0.00', unbalanced: 0, issues: 0, period: null as any } }
  if (emptyScope(scope)) return empty
  const names = await loadOrgNames(em)
  const filter = employeeWhere(scope, options)
  const loans: any[] = await em.query(`SELECT l.[id], l.[employeeId], l.[requestId], CONVERT(varchar(40), l.[amount]) AS [amount], l.[status], l.[disbursedAt],
    e.[employeeCode], e.[fullName], e.[status] AS [employeeStatus], e.[branchId], e.[departmentId]
    FROM [loans] l INNER JOIN [employees] e ON e.[id] = l.[employeeId] ${filter.sql} ORDER BY e.[employeeCode], l.[id]`, filter.params)
  const positionsByEmployee = new Map<number, LoanInstallmentPosition[] | Error>()
  for (const employeeId of new Set(loans.map(loan => Number(loan.employeeId)))) {
    try { positionsByEmployee.set(employeeId, await readLoanInstallmentPositions(em, employeeId)) }
    catch (error: any) { positionsByEmployee.set(employeeId, new Error(error?.response?.message ?? error?.message ?? 'رصيد السلفة غير متسق')) }
  }
  const bucketLabels = ['1-30 يومًا', '31-60 يومًا', '61-90 يومًا', 'أكثر من 90 يومًا']
  const aging = bucketLabels.map(label => ({ label, count: 0, amount: 0n }))
  const forecast = new Map<string, bigint>()
  let totalPrincipal = 0n, totalPaid = 0n, totalRemaining = 0n, totalOverdue = 0n, unbalanced = 0, issues = 0, dueInPeriod = 0n
  const rows: any[] = []
  for (const loan of loans) {
    const positions = positionsByEmployee.get(Number(loan.employeeId))
    const principal = reportCents(loan.amount)
    const base = { loanId: Number(loan.id), requestId: loan.requestId ?? null, employeeId: Number(loan.employeeId), employeeCode: loan.employeeCode,
      fullName: loan.fullName, employeeStatus: loan.employeeStatus,
      departmentName: loan.departmentId ? names.departments.get(Number(loan.departmentId)) ?? null : null,
      branchName: loan.branchId ? names.branches.get(Number(loan.branchId)) ?? null : null,
      status: loan.status, disbursedAt: loan.disbursedAt ?? null, principal: reportMoney(principal) }
    if (positions instanceof Error || positions === undefined) {
      issues++
      if (options.status !== 'settled') rows.push({ ...base, issue: positions?.message ?? 'تعذر قراءة الأقساط', paid: null, remaining: null,
        installments: 0, paidInstallments: 0, currentInstallment: null, nextDueDate: null, overdueCount: 0, overdueAmount: null,
        partialCount: 0, deferredCount: 0, expectedCloseDate: null, balanced: false, schedule: [] })
      continue
    }
    const own = positions.filter(row => Number(row.loanId) === Number(loan.id))
    // C8: ابن الترحيل المُلغى بعكس صرف مسير ليس جزءًا حيًا من السلسلة
    const children = new Map(own.filter(row => row.parentInstallmentId !== null && row.financialStatus !== 'REVERSED').map(row => [Number(row.parentInstallmentId), row]))
    const roots = own.filter(row => row.parentInstallmentId === null).sort((a, b) => a.originalDueDate.localeCompare(b.originalDueDate) || a.id - b.id)
    const chainOf = (root: LoanInstallmentPosition) => {
      const chain = [root]
      for (let next = children.get(root.id); next; next = children.get(next.id)) chain.push(next)
      return chain
    }
    const chains = roots.map(chainOf)
    const paid = sumCents(own.map(row => row.paidAmount)), remaining = sumCents(own.map(row => row.remainingAmount))
    const open = own.filter(row => row.financialStatus === 'DUE' && reportCents(row.remainingAmount) > 0n).sort((a, b) => a.dueDate.localeCompare(b.dueDate))
    const overdue = open.filter(row => row.dueDate < options.today)
    const overdueAmount = sumCents(overdue.map(row => row.remainingAmount))
    for (const row of overdue) {
      const days = Math.round((Date.parse(options.today) - Date.parse(row.dueDate)) / DAY_MS)
      const bucket = aging[days <= 30 ? 0 : days <= 60 ? 1 : days <= 90 ? 2 : 3]
      bucket.count++; bucket.amount += reportCents(row.remainingAmount)
    }
    for (const row of open) if (row.dueDate >= options.today) {
      const month = row.dueDate.slice(0, 7)
      forecast.set(month, (forecast.get(month) ?? 0n) + reportCents(row.remainingAmount))
    }
    if (options.from && options.to) dueInPeriod += sumCents(roots.filter(row => row.originalDueDate >= options.from! && row.originalDueDate <= options.to!).map(row => row.amount))
    const balanced = paid + remaining === principal
    const currentIndex = chains.findIndex(chain => chain.some(row => row.financialStatus === 'DUE' && reportCents(row.remainingAmount) > 0n))
    const row = { ...base, issue: null, paid: reportMoney(paid), remaining: reportMoney(remaining), installments: roots.length,
      paidInstallments: chains.filter(chain => ['PAID', 'SETTLED'].includes(chain[chain.length - 1].financialStatus)).length,
      currentInstallment: currentIndex >= 0 ? currentIndex + 1 : null, nextDueDate: open[0]?.dueDate ?? null,
      overdueCount: overdue.length, overdueAmount: reportMoney(overdueAmount),
      partialCount: own.filter(item => item.financialStatus === 'PARTIAL').length, deferredCount: own.filter(item => item.financialStatus === 'DEFERRED').length,
      expectedCloseDate: open.length ? open[open.length - 1].dueDate : null, balanced,
      schedule: own.map(item => ({ id: item.id, dueDate: item.dueDate, originalDueDate: item.originalDueDate, amount: item.amount, paidAmount: item.paidAmount,
        remainingAmount: item.remainingAmount, status: item.financialStatus, statusLabel: INSTALLMENT_STATUS_LABELS[item.financialStatus] ?? item.financialStatus,
        parentInstallmentId: item.parentInstallmentId })) }
    totalPrincipal += principal; totalPaid += paid; totalRemaining += remaining; totalOverdue += overdueAmount
    if (!balanced) unbalanced++
    if (options.status === 'open' && remaining === 0n) continue
    if (options.status === 'settled' && remaining > 0n) continue
    rows.push(row)
  }
  let period: any = null
  if (options.from && options.to) {
    const params = [...filter.params, options.from, options.to]
    // C8: بند الموظف المعكوس صرفه وحجز أقساطه المعكوس لا يُحتسبان مرة ثانية بجوار المسير التكميلي
    const runFilter = `${filter.sql ? `${filter.sql} AND` : 'WHERE'} r.[status] <> 'CANCELLED' AND r.[startDate] <= CONVERT(date, @${filter.params.length + 1}, 23) AND r.[endDate] >= CONVERT(date, @${filter.params.length}, 23)
      AND ${payrollLineNotReversedSql('r.[id]', 'e.[id]')}`
    const column = await em.query(`SELECT CONVERT(varchar(40), ISNULL(SUM(i.[loanInstallments]), 0)) AS [total] FROM [payroll_items] i
      INNER JOIN [payroll_runs] r ON r.[id] = i.[runId] INNER JOIN [employees] e ON e.[id] = i.[employeeId] ${runFilter}`, params)
    const allocations = await em.query(`SELECT CONVERT(varchar(40), ISNULL(SUM(a.[deductedAmount]), 0)) AS [total] FROM [loan_installment_allocations] a
      INNER JOIN [payroll_runs] r ON r.[id] = a.[payrollRunId] INNER JOIN [employees] e ON e.[id] = a.[employeeId] ${runFilter} AND a.[status] IN ('HELD', 'POSTED')`, params)
    period = { from: options.from, to: options.to, dueInPeriod: reportMoney(dueInPeriod),
      payrollColumnTotal: reportMoney(reportCents(column[0]?.total ?? '0')), allocatedInRuns: reportMoney(reportCents(allocations[0]?.total ?? '0')) }
  }
  return {
    today: options.today, rows,
    aging: aging.map(bucket => ({ label: bucket.label, count: bucket.count, amount: reportMoney(bucket.amount) })),
    forecast: [...forecast.entries()].sort((a, b) => a[0].localeCompare(b[0])).map(([month, amount]) => ({ month, amount: reportMoney(amount) })),
    afterService: rows.filter(row => row.remaining !== null && reportCents(row.remaining) > 0n && ['terminated', 'archived'].includes(row.employeeStatus))
      .map(row => ({ loanId: row.loanId, employeeId: row.employeeId, employeeCode: row.employeeCode, fullName: row.fullName, employeeStatus: row.employeeStatus, remaining: row.remaining })),
    summary: { loans: rows.length, principal: reportMoney(totalPrincipal), paid: reportMoney(totalPaid), remaining: reportMoney(totalRemaining),
      overdue: reportMoney(totalOverdue), unbalanced, issues, period },
  }
}

// ===== ٥) الفروق بين فترتين (RP-10) =====
export const VARIANCE_COMPONENTS = [
  { key: 'basicSalary', label: 'الراتب الأساسي', sign: 1n, cause: 'WAGE_CHANGE' },
  { key: 'allowances', label: 'البدلات', sign: 1n, cause: 'WAGE_CHANGE' },
  { key: 'overtimeAmount', label: 'العمل الإضافي', sign: 1n, cause: 'OVERTIME' },
  { key: 'otherAdditions', label: 'إضافات أخرى', sign: 1n, cause: 'OTHER_ADDITIONS' },
  { key: 'latenessDeduction', label: 'خصم التأخير', sign: -1n, cause: 'ATTENDANCE_DEDUCTIONS' },
  { key: 'shortfallDeduction', label: 'خصم نقص الساعات', sign: -1n, cause: 'ATTENDANCE_DEDUCTIONS' },
  { key: 'absenceDeduction', label: 'خصم الغياب', sign: -1n, cause: 'ATTENDANCE_DEDUCTIONS' },
  { key: 'unpaidLeaveDeduction', label: 'إجازة بدون راتب', sign: -1n, cause: 'ATTENDANCE_DEDUCTIONS' },
  { key: 'loanInstallments', label: 'أقساط السلف', sign: -1n, cause: 'LOAN_INSTALLMENT' },
  { key: 'otherDeductions', label: 'خصومات أخرى', sign: -1n, cause: 'OTHER_DEDUCTIONS' },
  { key: 'socialInsuranceDeduction', label: 'التأمينات الاجتماعية (حصة الموظف)', sign: -1n, cause: 'SOCIAL_INSURANCE' },
] as const

export const VARIANCE_CAUSE_LABELS: Record<string, string> = {
  NEW_IN_PERIOD: 'انضمام أو دخول مسير جديد', LEFT_PERIOD: 'غير موجود في الفترة الحالية', WAGE_CHANGE: 'تغيير الأجر أو التناسب',
  OVERTIME: 'إضافي', OTHER_ADDITIONS: 'إضافة/مكافأة', ATTENDANCE_DEDUCTIONS: 'خصومات الحضور والإجازات',
  LOAN_INSTALLMENT: 'قسط سلفة', OTHER_DEDUCTIONS: 'خصم آخر', SOCIAL_INSURANCE: 'التأمينات الاجتماعية', UNEXPLAINED: 'غير مفسَّر',
}

export function previousPayrollPeriod(period: string) {
  if (!/^\d{4}-(0[1-9]|1[0-2])$/.test(period)) throw new BadRequestException('الشهر بصيغة YYYY-MM')
  const [year, month] = period.split('-').map(Number)
  return month === 1 ? `${year - 1}-12` : `${year}-${String(month - 1).padStart(2, '0')}`
}

export interface PayrollVarianceOptions { period?: string; comparePeriod?: string; minAmount?: number; minPercent?: number; includeUnchanged?: boolean }

export async function payrollVarianceReport(em: EntityManager, scope: PayrollReportScope, options: PayrollVarianceOptions) {
  for (const value of [options.period, options.comparePeriod]) if (value !== undefined) previousPayrollPeriod(value)
  if (emptyScope(scope)) return { period: options.period ?? null, comparePeriod: options.comparePeriod ?? null, rows: [], unexplained: [], totals: [], summary: null }
  const latest = options.period ?? (await em.query(`SELECT TOP (1) [period] FROM [payroll_runs] WHERE [status] <> 'CANCELLED' ORDER BY [period] DESC`))[0]?.period
  if (!latest) return { period: null, comparePeriod: null, rows: [], unexplained: [], totals: [], summary: null }
  const period = String(latest)
  const comparePeriod = options.comparePeriod ?? previousPayrollPeriod(period)
  if (period === comparePeriod) throw new BadRequestException('اختر فترتين مختلفتين للمقارنة')
  const runs: RunRow[] = await em.query(`SELECT ${RUN_COLUMNS} FROM [payroll_runs] r WHERE r.[status] <> 'CANCELLED' AND r.[period] IN (@0, @1)`, [period, comparePeriod])
  const runById = new Map(runs.map(run => [Number(run.id), run]))
  const runIds = [...runById.keys()]
  const inRuns = runIds.length ? `IN (${runIds.join(', ')})` : 'IN (NULL)'
  // C8: البند المعكوس صرفه لا يدخل الفروق؛ صرفه الفعلي بند المسير التكميلي
  const items: ItemRow[] = runIds.length ? await em.query(`${ITEM_SELECT} WHERE i.[runId] ${inRuns} AND ${payrollLineNotReversedSql('i.[runId]', 'i.[employeeId]')}`) : []
  const members: MemberRow[] = runIds.length ? await em.query(`${MEMBER_SELECT} WHERE m.[runId] ${inRuns}`) : []
  const memberByKey = new Map(members.map(row => [memberKey(Number(row.runId), Number(row.employeeId)), row]))
  const identities = new Map<number, any>((await em.query(`SELECT [id], [employeeCode], [fullName] FROM [employees]`)).map((row: any) => [Number(row.id), row]))
  type Totals = Record<string, bigint> & { netPay: bigint }
  const zero = (): Totals => Object.fromEntries([...VARIANCE_COMPONENTS.map(component => [component.key, 0n]), ['netPay', 0n]]) as Totals
  type Accumulator = { current: Totals | null; previous: Totals | null; currentRuns: number[]; previousRuns: number[]; name: string | null; code: string | null }
  const byEmployee = new Map<number, Accumulator>()
  for (const item of items) {
    const run = runById.get(Number(item.runId))!
    const member = memberByKey.get(memberKey(Number(item.runId), Number(item.employeeId)))
    if (scope !== null && effectiveBranch(run, member) !== scope) continue
    const employeeId = Number(item.employeeId)
    const row: Accumulator = byEmployee.get(employeeId) ?? { current: null, previous: null, currentRuns: [], previousRuns: [],
      name: member?.fullName ?? identities.get(employeeId)?.fullName ?? null, code: member?.employeeCode ?? identities.get(employeeId)?.employeeCode ?? null }
    const side = run.period === period ? 'current' : 'previous'
    const totals = row[side] ?? (row[side] = zero())
    for (const component of VARIANCE_COMPONENTS) totals[component.key] += reportCents(item[component.key])
    totals.netPay += reportCents(item.netPay)
    row[side === 'current' ? 'currentRuns' : 'previousRuns'].push(Number(item.runId))
    byEmployee.set(employeeId, row)
  }
  const minAmount = reportCents(options.minAmount ?? 0)
  const all: any[] = []
  const periodTotals = { current: zero(), previous: zero() }
  for (const [employeeId, row] of byEmployee) {
    const current = row.current ?? zero(), previous = row.previous ?? zero()
    for (const key of Object.keys(current)) { periodTotals.current[key] += current[key]; periodTotals.previous[key] += previous[key] }
    const netDelta = current.netPay - previous.netPay
    const components = VARIANCE_COMPONENTS.map(component => ({ key: component.key, label: component.label, cause: component.cause,
      current: current[component.key], previous: previous[component.key], delta: current[component.key] - previous[component.key],
      effect: (current[component.key] - previous[component.key]) * component.sign })).filter(component => component.delta !== 0n)
    const explained = components.reduce((sum, component) => sum + component.effect, 0n)
    const residual = netDelta - explained
    const causes = new Set<string>()
    if (!row.previous) causes.add('NEW_IN_PERIOD')
    if (!row.current) causes.add('LEFT_PERIOD')
    // الجديد أو الغائب عن إحدى الفترتين: كل بنوده تتغير بالضرورة، فسببه الانضمام/الغياب وحده لا أسباب البنود
    if (row.previous && row.current) for (const component of components) causes.add(component.cause)
    if (residual !== 0n) causes.add('UNEXPLAINED')
    // مثال RP-10: 1350 ÷ 7800 = 17.31% (تقريب لا قص)
    const percent = previous.netPay !== 0n ? Math.round(Number(netDelta) * 10000 / Number(previous.netPay)) / 100 : null
    all.push({
      employeeId, employeeCode: row.code, fullName: row.name, currentRuns: [...new Set(row.currentRuns)], previousRuns: [...new Set(row.previousRuns)],
      currentNet: reportMoney(current.netPay), previousNet: reportMoney(previous.netPay), difference: reportMoney(netDelta), percent,
      direction: netDelta > 0n ? 'INCREASE' : netDelta < 0n ? 'DECREASE' : 'UNCHANGED',
      components: components.map(component => ({ key: component.key, label: component.label, current: reportMoney(component.current),
        previous: reportMoney(component.previous), delta: reportMoney(component.delta), effect: reportMoney(component.effect) })),
      causes: [...causes].map(code => ({ code, label: VARIANCE_CAUSE_LABELS[code] })), residual: reportMoney(residual), unexplained: residual !== 0n,
      changed: netDelta !== 0n || components.length > 0 || !row.previous || !row.current,
    })
  }
  const abs = (value: bigint) => value < 0n ? -value : value
  const rows = all.filter(row => (options.includeUnchanged || row.changed) && abs(reportCents(row.difference)) >= minAmount &&
    (options.minPercent === undefined || row.percent === null || Math.abs(row.percent) >= options.minPercent))
    .sort((a, b) => Number(abs(reportCents(b.difference)) - abs(reportCents(a.difference))) || a.employeeId - b.employeeId)
  return {
    period, comparePeriod, rows, unexplained: rows.filter(row => row.unexplained),
    totals: [...VARIANCE_COMPONENTS.map(component => ({ key: component.key, label: component.label })), { key: 'netPay', label: 'الصافي' }]
      .map(component => ({ ...component, current: reportMoney(periodTotals.current[component.key]), previous: reportMoney(periodTotals.previous[component.key]),
        delta: reportMoney(periodTotals.current[component.key] - periodTotals.previous[component.key]) })),
    summary: { employees: all.length, shown: rows.length, increased: all.filter(row => row.direction === 'INCREASE').length,
      decreased: all.filter(row => row.direction === 'DECREASE').length, unexplained: all.filter(row => row.unexplained).length,
      currentRuns: runs.filter(run => run.period === period).length, previousRuns: runs.filter(run => run.period === comparePeriod).length },
  }
}
