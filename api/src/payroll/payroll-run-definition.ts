import type { EntityManager } from 'typeorm'
import type { PayrollScopeType } from './payroll.entities'

/**
 * الخطوة 16: تعريف المسير (المسودة) — فلاتر مترابطة وقائمة واستبعادات بسبب إجباري.
 * داخل النوع الواحد OR (فرع 1 أو فرع 2)، وبين الأنواع AND (فرع 1 و قسم 4 و القائمة).
 * العضوية تُحدد بمكان الموظف في التنظيم آخر يوم في الفترة، لا بملفه الحالي.
 */
export const PAYROLL_RUN_DEFINITION_VERSION = 1 as const
export type PayrollRunSelectionMode = 'COMPANY' | 'FILTERS' | 'LIST' | 'FILTERED_LIST'

export interface PayrollRunFilters {
  branchIds: number[]
  departmentIds: number[]
  teamIds: number[]
  costCenterIds: number[]
  employeeIds: number[]
  allEmployees: boolean
  // التعريف الجديد يشمل الأقسام الفرعية للقسم المختار؛ نطاق القسم القديم يطابق القسم نفسه فقط كما حُسب.
  includeSubDepartments: boolean
}
export interface PayrollRunExclusion { employeeId: number; reason: string; byUserId: number | null; at: string | null }
export interface PayrollRunEmptyScope { reason: string; byUserId: number; at: string }
export interface PayrollRunDefinition {
  version: typeof PAYROLL_RUN_DEFINITION_VERSION
  source: 'DEFINITION' | 'LEGACY_SCOPE'
  mode: PayrollRunSelectionMode
  filters: PayrollRunFilters
  exclusions: PayrollRunExclusion[]
  emptyScope: PayrollRunEmptyScope | null
}

export interface PayrollRunDefinitionColumns {
  scopeType: PayrollScopeType
  scopeIds: string | null
  employeeIds: string | null
  branchId: number | null
  definition: string | null
}

const ids = (value: unknown): number[] => Array.isArray(value)
  ? [...new Set(value.map(Number).filter(id => Number.isSafeInteger(id) && id > 0 && id <= 2_147_483_647))].sort((a, b) => a - b)
  : []

export const emptyPayrollRunFilters = (): PayrollRunFilters => ({ branchIds: [], departmentIds: [], teamIds: [], costCenterIds: [],
  employeeIds: [], allEmployees: false, includeSubDepartments: true })

export function payrollRunHasOrgFilters(filters: PayrollRunFilters) {
  return filters.branchIds.length + filters.departmentIds.length + filters.teamIds.length + filters.costCenterIds.length > 0
}

export function payrollRunSelectionMode(filters: PayrollRunFilters): PayrollRunSelectionMode {
  if (filters.allEmployees) return 'COMPANY'
  if (filters.employeeIds.length) return payrollRunHasOrgFilters(filters) ? 'FILTERED_LIST' : 'LIST'
  return 'FILTERS'
}

/** التعريف المخزن على المسير، أو ترجمة نطاق المسير القديم (scopeType/scopeIds/employeeIds) إلى الفلاتر نفسها. */
export function payrollRunDefinitionOf(run: { definition?: string | null; scopeType: PayrollScopeType; scopeIds: string | null; employeeIds: string | null; branchId: number | null }): PayrollRunDefinition {
  if (run.definition) {
    let parsed: any
    try { parsed = JSON.parse(run.definition) } catch { parsed = null }
    if (!parsed || parsed.version !== PAYROLL_RUN_DEFINITION_VERSION || !parsed.filters || !Array.isArray(parsed.exclusions)) {
      throw new PayrollRunDefinitionError('PAYRUN-DEFINITION-INVALID', 'تعريف المسير المحفوظ غير صالح؛ راجع المسير قبل استخدامه')
    }
    const filters: PayrollRunFilters = { branchIds: ids(parsed.filters.branchIds), departmentIds: ids(parsed.filters.departmentIds), teamIds: ids(parsed.filters.teamIds),
      costCenterIds: ids(parsed.filters.costCenterIds), employeeIds: ids(parsed.filters.employeeIds), allEmployees: parsed.filters.allEmployees === true,
      includeSubDepartments: parsed.filters.includeSubDepartments !== false }
    const exclusions = parsed.exclusions.map((row: any) => ({ employeeId: Number(row.employeeId), reason: String(row.reason ?? ''),
      byUserId: row.byUserId == null ? null : Number(row.byUserId), at: row.at == null ? null : String(row.at) }))
    return { version: PAYROLL_RUN_DEFINITION_VERSION, source: 'DEFINITION', mode: payrollRunSelectionMode(filters), filters, exclusions,
      emptyScope: parsed.emptyScope && typeof parsed.emptyScope.reason === 'string' ? parsed.emptyScope : null }
  }
  const filters = emptyPayrollRunFilters()
  filters.includeSubDepartments = false
  let scopeIds: number[] = []
  try { scopeIds = run.scopeIds ? ids(JSON.parse(run.scopeIds)) : [] } catch { scopeIds = [] }
  let listIds: number[] = []
  try { listIds = run.employeeIds ? ids(JSON.parse(run.employeeIds)) : [] } catch { listIds = [] }
  switch (run.scopeType) {
    case 'COMPANY': filters.allEmployees = true; break
    case 'BRANCH': filters.branchIds = scopeIds.length ? scopeIds : ids([run.branchId]); break
    case 'DEPARTMENT': filters.departmentIds = scopeIds; break
    case 'TEAM': filters.teamIds = scopeIds; break
    case 'COST_CENTER': filters.costCenterIds = scopeIds; break
    case 'CUSTOM': filters.employeeIds = listIds; break
  }
  return { version: PAYROLL_RUN_DEFINITION_VERSION, source: 'LEGACY_SCOPE', mode: payrollRunSelectionMode(filters), filters, exclusions: [], emptyScope: null }
}

/** أعمدة التوافق: النوع الأدق الموجود يصبح scopeType للعرض والقراءة القديمة، والتعريف الكامل في definition. */
export function payrollRunDefinitionColumns(definition: PayrollRunDefinition): PayrollRunDefinitionColumns {
  const { filters } = definition
  const stored = JSON.stringify({ version: definition.version, filters, exclusions: definition.exclusions, emptyScope: definition.emptyScope })
  const base = { branchId: null, definition: stored }
  if (filters.allEmployees) return { ...base, scopeType: 'COMPANY', scopeIds: null, employeeIds: null }
  if (filters.employeeIds.length) return { ...base, scopeType: 'CUSTOM', scopeIds: null, employeeIds: JSON.stringify(filters.employeeIds) }
  if (filters.teamIds.length) return { ...base, scopeType: 'TEAM', scopeIds: JSON.stringify(filters.teamIds), employeeIds: null }
  if (filters.departmentIds.length) return { ...base, scopeType: 'DEPARTMENT', scopeIds: JSON.stringify(filters.departmentIds), employeeIds: null }
  if (filters.costCenterIds.length) return { ...base, scopeType: 'COST_CENTER', scopeIds: JSON.stringify(filters.costCenterIds), employeeIds: null }
  return { ...base, scopeType: 'BRANCH', scopeIds: JSON.stringify(filters.branchIds), employeeIds: null }
}

export class PayrollRunDefinitionError extends Error {
  constructor(readonly code: string, message: string, readonly details: Record<string, unknown> = {}) {
    super(message)
    this.name = 'PayrollRunDefinitionError'
  }
}

// ===== مكان الموظف في التنظيم بتاريخ =====
export interface PayrollOrgRef { branchId: number | null; departmentId: number | null; teamId: number | null; costCenterId: number | null }
export interface PayrollOrgIssue { code: string; message: string }
export interface PayrollOrgAt extends PayrollOrgRef { date: string; issues: PayrollOrgIssue[] }
export interface PayrollOrgEmployee { id: number; branchId?: number | null; departmentId?: number | null; teamId?: number | null; costCenterId?: number | null }

interface OrgVersionRow { version: number; effectiveFrom: string | null; legacyBaseline: boolean; branchId: number | null; valid: boolean }
interface TransferRow { id: number; employeeId: number; fromTeamId: number | null; toTeamId: number | null; effectiveDate: string; status: string }
export interface PayrollOrgHistory {
  today: string
  versions: Map<number, OrgVersionRow[]>
  transfers: Map<number, TransferRow[]>
  teamDepartment: Map<number, number | null>
  departmentBranch: Map<number, number | null>
  departmentParent: Map<number, number | null>
}

const dateText = (value: unknown) => typeof value === 'string' ? value.slice(0, 10) : value instanceof Date ? value.toISOString().slice(0, 10) : null

/** قراءة فقط: نسخ فرع الموظف المؤرخة (EMPLOYEE_ORG) وحركات النقل والهيكل. */
export async function loadPayrollOrgHistory(em: EntityManager, today: string): Promise<PayrollOrgHistory> {
  const history: PayrollOrgHistory = { today, versions: new Map(), transfers: new Map(), teamDepartment: new Map(), departmentBranch: new Map(), departmentParent: new Map() }
  const versionRows: Array<Record<string, any>> = await em.query(`SELECT [sourceId], [version], CONVERT(varchar(10), [effectiveFrom], 23) AS [effectiveFrom],
    [legacyBaseline], [snapshot] FROM [attendance_rule_versions] WHERE [sourceType] = 'EMPLOYEE_ORG'`)
  for (const row of versionRows) {
    let branchId: number | null = null, valid = true
    try {
      const snapshot = typeof row.snapshot === 'string' ? JSON.parse(row.snapshot) : row.snapshot
      const data = snapshot?.data ?? snapshot
      if (!data || !Object.prototype.hasOwnProperty.call(data, 'branchId')) valid = false
      else branchId = data.branchId === null ? null : Number(data.branchId)
      if (branchId !== null && !(Number.isSafeInteger(branchId) && branchId > 0)) { valid = false; branchId = null }
    } catch { valid = false }
    const list = history.versions.get(Number(row.sourceId)) ?? []
    list.push({ version: Number(row.version), effectiveFrom: row.effectiveFrom ?? null, legacyBaseline: row.legacyBaseline === true || row.legacyBaseline === 1, branchId, valid })
    history.versions.set(Number(row.sourceId), list)
  }
  const transfers: Array<Record<string, any>> = await em.query(`SELECT [id], [employeeId], [fromTeamId], [toTeamId],
    CONVERT(varchar(10), [effectiveDate], 23) AS [effectiveDate], [status] FROM [transfers] WHERE [status] IN ('EXECUTED', 'SCHEDULED')`)
  for (const row of transfers) {
    const list = history.transfers.get(Number(row.employeeId)) ?? []
    list.push({ id: Number(row.id), employeeId: Number(row.employeeId), fromTeamId: row.fromTeamId == null ? null : Number(row.fromTeamId),
      toTeamId: row.toTeamId == null ? null : Number(row.toTeamId), effectiveDate: String(dateText(row.effectiveDate)), status: String(row.status) })
    history.transfers.set(Number(row.employeeId), list)
  }
  for (const row of await em.query(`SELECT [id], [departmentId] FROM [teams]`) as Array<Record<string, any>>) {
    history.teamDepartment.set(Number(row.id), row.departmentId == null ? null : Number(row.departmentId))
  }
  for (const row of await em.query(`SELECT [id], [branchId], [parentId] FROM [departments]`) as Array<Record<string, any>>) {
    history.departmentBranch.set(Number(row.id), row.branchId == null ? null : Number(row.branchId))
    history.departmentParent.set(Number(row.id), row.parentId == null ? null : Number(row.parentId))
  }
  return history
}

const positiveOrNull = (value: unknown) => Number.isSafeInteger(Number(value)) && Number(value) > 0 ? Number(value) : null

/**
 * مكان الموظف في يوم معين:
 * - الفرع من أحدث نسخة EMPLOYEE_ORG مؤرخة حتى اليوم، ثم النسخة الأساسية القديمة، ثم الملف لمن لا تاريخ له.
 * - الفريق والقسم من الملف، مع التراجع عن نقل نُفذ بعد اليوم، وتطبيق نقل مجدول مستقبلي يسري حتى اليوم.
 */
export function payrollOrgAt(history: PayrollOrgHistory, employee: PayrollOrgEmployee, date: string): PayrollOrgAt {
  const issues: PayrollOrgIssue[] = []
  const versions = history.versions.get(employee.id) ?? []
  if (versions.some(row => !row.valid)) issues.push({ code: 'ORG_HISTORY_INVALID', message: 'نسخة مؤرخة لفرع الموظف غير صالحة؛ استُخدمت بقية النسخ' })
  const usable = versions.filter(row => row.valid)
  const dated = usable.filter(row => row.effectiveFrom !== null && row.effectiveFrom <= date)
    .sort((a, b) => b.effectiveFrom!.localeCompare(a.effectiveFrom!) || b.version - a.version)[0]
  let branchId: number | null
  if (dated) branchId = dated.branchId
  else if (usable.length) {
    const legacy = usable.find(row => row.legacyBaseline)
    if (legacy) branchId = legacy.branchId
    else {
      branchId = positiveOrNull(employee.branchId)
      issues.push({ code: 'ORG_BRANCH_BEFORE_HISTORY', message: `لا توجد نسخة مؤرخة لفرع الموظف في ${date}؛ استُخدم فرع الملف الحالي` })
    }
  } else branchId = positiveOrNull(employee.branchId)

  let teamId = positiveOrNull(employee.teamId), departmentId = positiveOrNull(employee.departmentId)
  let moved = false, scheduledApplied = false
  const transfers = history.transfers.get(employee.id) ?? []
  const executedAfter = transfers.filter(row => row.status === 'EXECUTED' && row.effectiveDate > date)
    .sort((a, b) => b.effectiveDate.localeCompare(a.effectiveDate) || b.id - a.id)
  for (const row of executedAfter) {
    moved = true
    teamId = positiveOrNull(row.fromTeamId)
    if (teamId === null) issues.push({ code: 'ORG_TEAM_BEFORE_TRANSFER_UNKNOWN', message: `فريق الموظف قبل النقل المنفذ في ${row.effectiveDate} غير مسجل` })
  }
  const scheduled = transfers.filter(row => row.status === 'SCHEDULED' && row.effectiveDate <= date)
    .sort((a, b) => a.effectiveDate.localeCompare(b.effectiveDate) || a.id - b.id)
  for (const row of scheduled) {
    if (row.effectiveDate <= history.today) {
      issues.push({ code: 'ORG_TRANSFER_PENDING', message: `نقل مجدول بتاريخ ${row.effectiveDate} لم يُنفذ بعد؛ حُسب الموظف على مكانه الحالي` })
      continue
    }
    moved = true; scheduledApplied = true
    teamId = positiveOrNull(row.toTeamId)
  }
  if (moved) {
    departmentId = teamId === null ? null : history.teamDepartment.get(teamId) ?? null
    if (scheduledApplied && departmentId !== null) branchId = history.departmentBranch.get(departmentId) ?? branchId
  }
  return { date, branchId, departmentId, teamId, costCenterId: positiveOrNull(employee.costCenterId), issues }
}

/** أيام تغير مكان الموظف داخل (from, to]: سريان نسخ الفرع والنقل. */
export function payrollOrgChangeDates(history: PayrollOrgHistory, employeeId: number, from: string, to: string): string[] {
  const dates = new Set<string>()
  for (const row of history.versions.get(employeeId) ?? []) if (row.effectiveFrom && row.effectiveFrom > from && row.effectiveFrom <= to) dates.add(row.effectiveFrom)
  for (const row of history.transfers.get(employeeId) ?? []) if (row.effectiveDate > from && row.effectiveDate <= to) dates.add(row.effectiveDate)
  return [...dates].sort()
}

export function payrollDepartmentSet(history: PayrollOrgHistory, departmentIds: number[], includeChildren: boolean): Set<number> {
  const result = new Set(departmentIds)
  if (!includeChildren) return result
  let grew = true
  while (grew) {
    grew = false
    for (const [id, parent] of history.departmentParent) {
      if (parent !== null && result.has(parent) && !result.has(id)) { result.add(id); grew = true }
    }
  }
  return result
}

/** مطابقة موظف بمكانه لتعريف المسير: OR داخل النوع وAND بين الأنواع. */
export function payrollRunFilterMatches(filters: PayrollRunFilters, employeeId: number, org: PayrollOrgRef, departments: Set<number>): boolean {
  if (filters.allEmployees) return true
  if (!filters.employeeIds.length && !payrollRunHasOrgFilters(filters)) return false
  if (filters.employeeIds.length && !filters.employeeIds.includes(employeeId)) return false
  if (filters.branchIds.length && (org.branchId === null || !filters.branchIds.includes(org.branchId))) return false
  if (filters.departmentIds.length && (org.departmentId === null || !departments.has(org.departmentId))) return false
  if (filters.teamIds.length && (org.teamId === null || !filters.teamIds.includes(org.teamId))) return false
  if (filters.costCenterIds.length && (org.costCenterId === null || !filters.costCenterIds.includes(org.costCenterId))) return false
  return true
}

const dayBefore = (date: string) => new Date(Date.parse(`${date}T12:00:00Z`) - 86_400_000).toISOString().slice(0, 10)

/**
 * هل كان الموظف داخل نطاق فلاتر المسير في أي يوم من الفترة؟ يُفحص أول يوم وكل يوم تغيير وما قبله.
 * يعيد آخر يوم كان فيه داخل النطاق ومكانه فيه، أو null.
 */
export function payrollRunLastInScope(history: PayrollOrgHistory, filters: PayrollRunFilters, employee: PayrollOrgEmployee, from: string, to: string, departments: Set<number>): PayrollOrgAt | null {
  const checkpoints = new Set<string>([from])
  for (const date of payrollOrgChangeDates(history, employee.id, from, to)) { checkpoints.add(date); if (dayBefore(date) >= from) checkpoints.add(dayBefore(date)) }
  let last: PayrollOrgAt | null = null
  for (const date of [...checkpoints].sort()) {
    const org = payrollOrgAt(history, employee, date)
    if (payrollRunFilterMatches(filters, employee.id, org, departments)) last = org
  }
  return last
}
