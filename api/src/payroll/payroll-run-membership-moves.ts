import type { EntityManager } from 'typeorm'
import {
  PayrollRunDefinition, PayrollRunExclusion, PayrollRunFilters, payrollRunHasOrgFilters,
} from './payroll-run-definition'

/**
 * قرار المالك (20 سبتمبر): المسير قائمة دائمة باسمها («مسير فرع المعادي»، «مسير الموظفين المفصولين»...) لها معادلتها.
 * الموظف الذي يُوضع في مسير يبقى فيه كل شهر حتى ينقله المالك، فـ«إضافة لمسير» و«نقل لمسير آخر» تغييران في تعريف المسير
 * يسريان من الشهر المختار وما بعده — على كل مسير بنفس الاسم (سلسلة المسير) ما دام مفتوحًا، ولا يمسّان شهرًا معتمدًا أو مصروفًا.
 *
 * هذا الملف يحسب التغيير فقط (دالة صافية) ويقرأ سلسلة المسير؛ الحفظ وإعادة الحساب في PayrollService بمساراتها القائمة.
 */

// المسير المفتوح للتعديل: المسودة تُعدل في تعريفها، والمحسوب يُعدل بإعادة حسابه.
export const PAYROLL_MEMBERSHIP_OPEN_STATUSES = ['DRAFT', 'CALCULATED'] as const
export type PayrollMembershipOpenStatus = typeof PAYROLL_MEMBERSHIP_OPEN_STATUSES[number]

export interface PayrollRunSeriesRow {
  id: number
  name: string | null
  period: string
  status: string
  startDate: string
  endDate: string
  runType: string
}

export const payrollRunSeriesName = (name: string | null | undefined): string => (name ?? '').trim()

/**
 * مسيرات السلسلة نفسها (نفس الاسم) من شهر وما بعده وهي مفتوحة (مسودة أو محسوبة) وعادية.
 * الشهر المعتمد أو المصروف أو الملغى أو المسير التكميلي/العكسي خارج التغيير تمامًا.
 */
export async function findPayrollRunSeries(em: EntityManager, input: { name: string; fromPeriod: string; excludeRunId?: number | null }): Promise<PayrollRunSeriesRow[]> {
  const name = payrollRunSeriesName(input.name)
  if (!name) return []
  const rows: Array<Record<string, any>> = await em.query(`SELECT [id], [name], [period], [status],
      CONVERT(varchar(10), [startDate], 23) AS [startDate], CONVERT(varchar(10), [endDate], 23) AS [endDate],
      COALESCE([runType], 'REGULAR') AS [runType]
    FROM [payroll_runs]
    WHERE LTRIM(RTRIM([name])) = @0 AND [period] >= @1 AND [status] IN ('DRAFT', 'CALCULATED') AND COALESCE([runType], 'REGULAR') = 'REGULAR'
    ORDER BY [period], [id]`, [name, input.fromPeriod])
  return rows.map(row => ({ id: Number(row.id), name: row.name ?? null, period: String(row.period), status: String(row.status),
    startDate: String(row.startDate), endDate: String(row.endDate), runType: String(row.runType) }))
    .filter(row => input.excludeRunId == null || row.id !== input.excludeRunId)
}

/** مسيرات السلسلة التي لا يمسّها التغيير (معتمدة أو مصروفة أو قيد المراجعة) من الشهر نفسه وما بعده — تُعرض للمالك كما هي. */
export async function findPayrollRunSeriesLocked(em: EntityManager, input: { name: string; fromPeriod: string }): Promise<PayrollRunSeriesRow[]> {
  const name = payrollRunSeriesName(input.name)
  if (!name) return []
  const rows: Array<Record<string, any>> = await em.query(`SELECT [id], [name], [period], [status],
      CONVERT(varchar(10), [startDate], 23) AS [startDate], CONVERT(varchar(10), [endDate], 23) AS [endDate],
      COALESCE([runType], 'REGULAR') AS [runType]
    FROM [payroll_runs]
    WHERE LTRIM(RTRIM([name])) = @0 AND [period] >= @1 AND [status] IN ('IN_REVIEW', 'APPROVED', 'PAID')
    ORDER BY [period], [id]`, [name, input.fromPeriod])
  return rows.map(row => ({ id: Number(row.id), name: row.name ?? null, period: String(row.period), status: String(row.status),
    startDate: String(row.startDate), endDate: String(row.endDate), runType: String(row.runType) }))
}

export interface PayrollRunMembershipPlan {
  filters: { branchIds: number[]; departmentIds: number[]; teamIds: number[]; employeeIds: number[]; allEmployees: boolean; includeEmployeeIds: number[] }
  exclusions: Array<{ employeeId: number; reason: string }>
  /** أسماء دخلت القائمة الدائمة فعلًا في هذا المسير */
  added: number[]
  /** أسماء كانت داخل المسير أصلًا (بفلاتره أو بقائمته) فلم يتغير لها شيء سوى رفع استبعاد سابق */
  alreadyMember: number[]
  removed: number[]
  changed: boolean
}

/**
 * التعريف الجديد بعد إضافة أسماء و/أو إخراج أسماء من مسير:
 * - الإضافة ترفع أي استبعاد سابق، وتكتب الاسم في قائمة الإضافة الدائمة (أو في قائمة المسير نفسها لمسير القائمة وحدها).
 *   «الشركة كلها» تضم الجميع أصلًا، فالإضافة فيها = رفع الاستبعاد.
 * - الإخراج يشيل الاسم من القائمتين، ويكتب استبعادًا بسببه إن كان سيظل داخل النطاق بفلاتر المسير.
 */
export function planPayrollRunMembership(definition: PayrollRunDefinition, input: { add?: number[]; remove?: number[]; reason: string }): PayrollRunMembershipPlan {
  const before: PayrollRunFilters = definition.filters
  const add = [...new Set((input.add ?? []).filter(id => Number.isSafeInteger(id) && id > 0))]
  const remove = new Set((input.remove ?? []).filter(id => Number.isSafeInteger(id) && id > 0))
  const listOnly = !before.allEmployees && !payrollRunHasOrgFilters(before)
  const employeeIds = new Set(before.employeeIds)
  const includeEmployeeIds = new Set(before.includeEmployeeIds)
  const priorExclusions: Array<PayrollRunExclusion | { employeeId: number; reason: string }> = definition.exclusions
  const exclusions = new Map<number, PayrollRunExclusion | { employeeId: number; reason: string }>(
    priorExclusions.map(row => [row.employeeId, row] as const))
  const added: number[] = [], alreadyMember: number[] = [], removed: number[] = []

  for (const employeeId of add) {
    if (remove.has(employeeId)) continue
    const hadExclusion = exclusions.delete(employeeId)
    const listed = employeeIds.has(employeeId) || includeEmployeeIds.has(employeeId)
    if (before.allEmployees) { (hadExclusion ? added : alreadyMember).push(employeeId); continue }
    if (listOnly) employeeIds.add(employeeId)
    else includeEmployeeIds.add(employeeId)
    if (listed && !hadExclusion) alreadyMember.push(employeeId)
    else added.push(employeeId)
  }

  for (const employeeId of remove) {
    const wasListed = employeeIds.delete(employeeId) || includeEmployeeIds.delete(employeeId)
    // يظل داخل النطاق بالفلاتر التنظيمية أو بـ«الشركة كلها» → لا يخرج إلا باستبعاد مكتوب السبب
    const needsExclusion = before.allEmployees || payrollRunHasOrgFilters(before)
    if (needsExclusion) exclusions.set(employeeId, { employeeId, reason: input.reason })
    else exclusions.delete(employeeId)
    if (wasListed || needsExclusion) removed.push(employeeId)
  }

  const sorted = (values: Iterable<number>) => [...values].sort((a, b) => a - b)
  const filters = { branchIds: before.branchIds, departmentIds: before.departmentIds, teamIds: before.teamIds,
    employeeIds: sorted(employeeIds), allEmployees: before.allEmployees, includeEmployeeIds: sorted(includeEmployeeIds) }
  const sameList = (a: number[], b: number[]) => a.length === b.length && a.every((value, index) => value === b[index])
  const changed = !sameList(filters.employeeIds, before.employeeIds) || !sameList(filters.includeEmployeeIds, before.includeEmployeeIds) ||
    exclusions.size !== priorExclusions.length ||
    priorExclusions.some(row => exclusions.get(row.employeeId)?.reason !== row.reason)
  return { filters, exclusions: [...exclusions.values()].map(row => ({ employeeId: row.employeeId, reason: row.reason }))
    .sort((a, b) => a.employeeId - b.employeeId), added, alreadyMember, removed, changed }
}

/** هل الموظف داخل قائمة هذا المسير الدائمة (بالاسم لا بالفلاتر)؟ */
export const payrollRunListsEmployee = (definition: PayrollRunDefinition, employeeId: number): boolean =>
  definition.filters.employeeIds.includes(employeeId) || definition.filters.includeEmployeeIds.includes(employeeId)
