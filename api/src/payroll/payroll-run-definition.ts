import type { EntityManager } from 'typeorm'
import { isDisposableTestDatabase } from '../auth/jwt-secret'
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
  /**
   * قرار المالك (20 سبتمبر): المسير قائمة دائمة باسمه. الموظف المُضاف يدويًا من «موظفين ليس لديهم مسير» أو المنقول من مسير آخر
   * يُكتب هنا فيدخل المسير بالإضافة (OR) إلى الفلاتر، لا بالتقاطع معها — إضافة اسم لمسير فرع لا تُقلّص المسير إلى هذا الاسم.
   * العضوية دائمة: «إنشاء مسيرات الشهر الجديد» ينسخ القائمة كما هي، فيبقى الموظف في مسيره كل شهر حتى ينقله المالك.
   * لا تُستعمل في مسير القائمة وحدها (بلا فلاتر تنظيمية): هناك تُطوى في employeeIds نفسها.
   */
  includeEmployeeIds: number[]
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
  employeeIds: [], allEmployees: false, includeSubDepartments: true, includeEmployeeIds: [] })

export function payrollRunHasOrgFilters(filters: PayrollRunFilters) {
  return filters.branchIds.length + filters.departmentIds.length + filters.teamIds.length + filters.costCenterIds.length > 0
}

/**
 * قائمة الإضافة الدائمة لها معنى واحد فقط مع فلاتر تنظيمية أو «الشركة كلها» (تُضاف إليها بالـOR).
 * في مسير القائمة وحدها تُطوى داخل employeeIds نفسها، فلا يبقى وضع اختيار (mode) يتجاهلها عند اشتقاق الأعضاء.
 */
export function foldPayrollRunInclusions(filters: PayrollRunFilters): PayrollRunFilters {
  if (!filters.includeEmployeeIds.length) return filters
  if (filters.allEmployees) { filters.includeEmployeeIds = []; return filters }
  if (payrollRunHasOrgFilters(filters)) return filters
  filters.employeeIds = [...new Set([...filters.employeeIds, ...filters.includeEmployeeIds])].sort((a, b) => a - b)
  filters.includeEmployeeIds = []
  return filters
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
    const filters: PayrollRunFilters = foldPayrollRunInclusions({ branchIds: ids(parsed.filters.branchIds), departmentIds: ids(parsed.filters.departmentIds),
      teamIds: ids(parsed.filters.teamIds), costCenterIds: ids(parsed.filters.costCenterIds), employeeIds: ids(parsed.filters.employeeIds),
      allEmployees: parsed.filters.allEmployees === true, includeSubDepartments: parsed.filters.includeSubDepartments !== false,
      includeEmployeeIds: ids(parsed.filters.includeEmployeeIds) })
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
interface TransferRow { id: number; employeeId: number; fromTeamId: number | null; toTeamId: number | null; effectiveDate: string; status: string; requestId?: number | null; executedDate?: string | null }
/**
 * تغيير قسم أو فريق مسجل في سجل تغييرات الموظف (employee_status_history).
 * date = اليوم المحلي للتسجيل؛ القيمة الجديدة تسري منه. transferId لما يكون التغيير جزءًا من تنفيذ نقل،
 * فيسري بتاريخ سريان النقل لا بتاريخ تسجيله.
 */
export interface OrgFieldChangeRow {
  id: number; employeeId: number; field: 'departmentId' | 'teamId'; oldValue: number | null; newValue: number | null
  date: string; requestId: number | null; transferId: number | null; valid: boolean
}
export interface PayrollOrgHistory {
  today: string
  versions: Map<number, OrgVersionRow[]>
  transfers: Map<number, TransferRow[]>
  // تعديل القسم أو الفريق من ملف الموظف بلا حركة نقل له تاريخ؛ الأيام السابقة للتعديل تقرأ القيمة القديمة.
  fieldChanges?: Map<number, OrgFieldChangeRow[]>
  teamDepartment: Map<number, number | null>
  departmentBranch: Map<number, number | null>
  departmentParent: Map<number, number | null>
}

const dateText = (value: unknown) => typeof value === 'string' ? value.slice(0, 10) : value instanceof Date ? value.toISOString().slice(0, 10) : null
const localDay = (time: number) => { const d = new Date(time); return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}` }

/** قيمة معرّف من simple-json في سجل التغييرات: null مقبول، والرقم الموجب مقبول، وغيرهما غير صالح. */
function changeLogId(text: unknown): { ok: boolean; value: number | null } {
  if (text === null || text === undefined || text === '' || text === 'null') return { ok: true, value: null }
  let parsed: unknown
  try { parsed = JSON.parse(String(text)) } catch { return { ok: false, value: null } }
  if (parsed === null) return { ok: true, value: null }
  const value = Number(parsed)
  return Number.isSafeInteger(value) && value > 0 && value <= 2_147_483_647 ? { ok: true, value } : { ok: false, value: null }
}

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
  // executedAt يكتبه التطبيق بالتوقيت المحلي (useUTC=false)، فتاريخه المحلي هو نص العمود.
  const transfers: Array<Record<string, any>> = await em.query(`SELECT [id], [employeeId], [fromTeamId], [toTeamId], [requestId],
    CONVERT(varchar(10), [effectiveDate], 23) AS [effectiveDate], CONVERT(varchar(10), [executedAt], 23) AS [executedDate], [status]
    FROM [transfers] WHERE [status] IN ('EXECUTED', 'SCHEDULED')`)
  for (const row of transfers) {
    const list = history.transfers.get(Number(row.employeeId)) ?? []
    list.push({ id: Number(row.id), employeeId: Number(row.employeeId), fromTeamId: row.fromTeamId == null ? null : Number(row.fromTeamId),
      toTeamId: row.toTeamId == null ? null : Number(row.toTeamId), effectiveDate: String(dateText(row.effectiveDate)), status: String(row.status),
      requestId: row.requestId == null ? null : Number(row.requestId), executedDate: row.executedDate ?? null })
    history.transfers.set(Number(row.employeeId), list)
  }
  for (const row of await em.query(`SELECT [id], [departmentId] FROM [teams]`) as Array<Record<string, any>>) {
    history.teamDepartment.set(Number(row.id), row.departmentId == null ? null : Number(row.departmentId))
  }
  for (const row of await em.query(`SELECT [id], [branchId], [parentId] FROM [departments]`) as Array<Record<string, any>>) {
    history.departmentBranch.set(Number(row.id), row.branchId == null ? null : Number(row.branchId))
    history.departmentParent.set(Number(row.id), row.parentId == null ? null : Number(row.parentId))
  }
  // سجل تغييرات القسم/الفريق: changedAt افتراضيه GETDATE() بساعة خادم SQL، فيُحوّل إلى UTC ثم إلى اليوم المحلي للتطبيق.
  history.fieldChanges = new Map()
  const changes: Array<Record<string, any>> = await em.query(`SELECT [id], [employeeId], [fieldName], [requestId],
    CAST([oldValue] AS nvarchar(200)) AS [oldValue], CAST([newValue] AS nvarchar(200)) AS [newValue],
    CONVERT(varchar(19), DATEADD(minute, DATEDIFF(minute, GETDATE(), GETUTCDATE()), [changedAt]), 126) AS [changedAtUtc]
    FROM [employee_status_history] WHERE [fieldName] IN (N'departmentId', N'teamId')`)
  for (const row of changes) {
    const oldValue = changeLogId(row.oldValue), newValue = changeLogId(row.newValue)
    const time = Date.parse(`${row.changedAtUtc}Z`)
    const list = history.fieldChanges.get(Number(row.employeeId)) ?? []
    list.push({ id: Number(row.id), employeeId: Number(row.employeeId), field: row.fieldName === 'teamId' ? 'teamId' : 'departmentId',
      oldValue: oldValue.value, newValue: newValue.value, date: Number.isFinite(time) ? localDay(time) : '', requestId: row.requestId == null ? null : Number(row.requestId),
      transferId: null, valid: oldValue.ok && newValue.ok && Number.isFinite(time) })
    history.fieldChanges.set(Number(row.employeeId), list)
  }
  attachTransferChanges(history)
  return history
}

/** يربط صفوف السجل التي كتبها تنفيذ نقل بحركتها: بنفس الطلب، أو (نقل بلا طلب) بيوم التنفيذ والوجهة نفسيهما. */
export function attachTransferChanges(history: PayrollOrgHistory) {
  for (const [employeeId, rows] of history.fieldChanges ?? []) {
    const executed = (history.transfers.get(employeeId) ?? []).filter(row => row.status === 'EXECUTED')
    for (const row of rows) {
      const target = (transfer: TransferRow) => row.field === 'teamId' ? transfer.toTeamId
        : transfer.toTeamId === null ? null : history.teamDepartment.get(transfer.toTeamId) ?? null
      const owner = executed.find(transfer => transfer.requestId != null && row.requestId === transfer.requestId)
        ?? executed.find(transfer => transfer.requestId == null && row.requestId == null && transfer.executedDate === row.date && row.newValue === target(transfer))
      row.transferId = owner?.id ?? null
    }
  }
}

const positiveOrNull = (value: unknown) => Number.isSafeInteger(Number(value)) && Number(value) > 0 ? Number(value) : null

/**
 * مكان الموظف في يوم معين:
 * - الفرع من أحدث نسخة EMPLOYEE_ORG مؤرخة حتى اليوم، ثم النسخة الأساسية القديمة، ثم الملف لمن لا تاريخ له.
 * - الفريق والقسم من الملف، مع التراجع (من الأحدث للأقدم) عن كل نقل نُفذ بسريان بعد اليوم وكل تعديل ملف سُجل بعد اليوم،
 *   وتطبيق نقل مجدول مستقبلي يسري حتى اليوم.
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
  const transfers = history.transfers.get(employee.id) ?? []
  const changes = history.fieldChanges?.get(employee.id) ?? []
  if (changes.some(row => !row.valid)) issues.push({ code: 'ORG_CHANGE_LOG_INVALID', message: 'قيمة قسم أو فريق غير صالحة في سجل تغييرات الموظف؛ تُجوهل ذلك الصف' })
  // من الملف الحالي رجوعًا إلى اليوم المطلوب: كل تغيير سرى بعد اليوم يُعكس، الأحدث أولًا.
  const reverts: Array<{ date: string; order: number; apply: () => void }> = []
  for (const row of transfers.filter(item => item.status === 'EXECUTED' && item.effectiveDate > date)) {
    const own = changes.filter(change => change.valid && change.transferId === row.id)
    const ownTeam = own.find(change => change.field === 'teamId'), ownDepartment = own.find(change => change.field === 'departmentId')
    reverts.push({ date: row.effectiveDate, order: row.id, apply: () => {
      teamId = ownTeam ? ownTeam.oldValue : positiveOrNull(row.fromTeamId)
      if (teamId === null) issues.push({ code: 'ORG_TEAM_BEFORE_TRANSFER_UNKNOWN', message: `فريق الموظف قبل النقل المنفذ في ${row.effectiveDate} غير مسجل` })
      departmentId = ownDepartment ? ownDepartment.oldValue : teamId === null ? null : history.teamDepartment.get(teamId) ?? null
    } })
  }
  // تعديل القسم/الفريق من ملف الموظف (بلا نقل) يسري من يوم تسجيله؛ الفترات السابقة لا تتأثر به.
  for (const change of changes.filter(item => item.valid && item.transferId === null && item.date > date)) {
    reverts.push({ date: change.date, order: change.id, apply: () => { if (change.field === 'teamId') teamId = change.oldValue; else departmentId = change.oldValue } })
  }
  reverts.sort((a, b) => b.date.localeCompare(a.date) || b.order - a.order)
  for (const revert of reverts) revert.apply()

  let scheduledApplied = false
  const scheduled = transfers.filter(row => row.status === 'SCHEDULED' && row.effectiveDate <= date)
    .sort((a, b) => a.effectiveDate.localeCompare(b.effectiveDate) || a.id - b.id)
  for (const row of scheduled) {
    if (row.effectiveDate <= history.today) {
      issues.push({ code: 'ORG_TRANSFER_PENDING', message: `نقل مجدول بتاريخ ${row.effectiveDate} لم يُنفذ بعد؛ حُسب الموظف على مكانه الحالي` })
      continue
    }
    scheduledApplied = true
    teamId = positiveOrNull(row.toTeamId)
    departmentId = teamId === null ? null : history.teamDepartment.get(teamId) ?? null
  }
  if (scheduledApplied && departmentId !== null) branchId = history.departmentBranch.get(departmentId) ?? branchId
  return { date, branchId, departmentId, teamId, costCenterId: positiveOrNull(employee.costCenterId), issues }
}

/** أيام تغير مكان الموظف داخل (from, to]: سريان نسخ الفرع والنقل وتعديلات القسم/الفريق من الملف. */
export function payrollOrgChangeDates(history: PayrollOrgHistory, employeeId: number, from: string, to: string): string[] {
  const dates = new Set<string>()
  for (const row of history.versions.get(employeeId) ?? []) if (row.effectiveFrom && row.effectiveFrom > from && row.effectiveFrom <= to) dates.add(row.effectiveFrom)
  for (const row of history.transfers.get(employeeId) ?? []) if (row.effectiveDate > from && row.effectiveDate <= to) dates.add(row.effectiveDate)
  for (const row of history.fieldChanges?.get(employeeId) ?? []) if (row.valid && row.transferId === null && row.date > from && row.date <= to) dates.add(row.date)
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

/** مطابقة موظف بمكانه لتعريف المسير: OR داخل النوع وAND بين الأنواع، والمُضافون يدويًا يدخلون فوق الفلاتر كلها. */
export function payrollRunFilterMatches(filters: PayrollRunFilters, employeeId: number, org: PayrollOrgRef, departments: Set<number>): boolean {
  // عضوية دائمة أضافها المالك (من تبويب «بلا مسير» أو بنقل من مسير آخر) — لا تُقيدها فلاتر الفرع والقسم
  if (filters.includeEmployeeIds?.includes(employeeId)) return true
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

/**
 * الخطوة 16 (مراجعة): نقطتا الحساب القديمتان (POST /payroll/runs/calculate و/runs/calculate-defined) تنشئان أو تعيدان
 * الحساب في نداء واحد بلا نسخة سياسة ولا مسودة. على قاعدة الشركة (وأي قاعدة غير مؤقتة) مغلقتان؛ «مسير جديد» = POST /payroll/runs
 * ثم «احتساب المسودة» و«إعادة حساب المسير» كنقطتين منفصلتين. تبقيان فقط لقواعد الاختبار المؤقتة التي تبنيها اختبارات المحرك القديمة.
 */
export function payrollLegacyCalculateAllowed(database: unknown): boolean {
  return isDisposableTestDatabase(database)
}
