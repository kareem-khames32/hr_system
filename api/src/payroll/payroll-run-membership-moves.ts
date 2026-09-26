import type { EntityManager } from 'typeorm'
import type { BranchScope } from '../auth/guards'
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

/**
 * نقل/إضافة مجموعة مختلطة في نداء واحد («نقل لمسير…» من الجدول الموحد): لكل موظف نتيجته بالاسم.
 * المتخطى بيرجع بسببه بالعربي عشان المالك يشوف كل صف لوحده بدل رسالة خطأ واحدة توقف الدفعة كلها.
 */
export const PAYROLL_BULK_MEMBERSHIP_OUTCOMES = ['MOVED', 'ADDED', 'SKIPPED'] as const
export type PayrollBulkMembershipOutcome = typeof PAYROLL_BULK_MEMBERSHIP_OUTCOMES[number]

export const PAYROLL_BULK_SKIP_LABELS: Record<string, string> = {
  ALREADY_IN_RUN: 'موجود في المسير ده أصلًا',
  LOCKED_RUN: 'مسيره الحالي في الشهر ده معتمد أو مصروف — الشهر المقفول ما يتغيرش',
  OUT_OF_BRANCH_SCOPE: 'خارج نطاق فرعك',
  SOURCE_OUT_OF_SCOPE: 'مسيره الحالي خارج نطاق فرعك',
  SOURCE_NO_NAME: 'مسيره الحالي قديم بلا اسم — اعمله من «مسير جديد» باسم ثابت قبل النقل',
  SOURCE_RUN_TYPE: 'مسيره الحالي تكميلي أو عكس صرف — غيّر العضوية من المسير العادي',
  EMPLOYEE_NOT_FOUND: 'الموظف مش موجود',
  FAILED: 'تعذر التنفيذ',
}
export const payrollBulkSkipText = (code: string, detail?: string | null): string =>
  detail && detail.trim() ? detail.trim() : PAYROLL_BULK_SKIP_LABELS[code] ?? 'اتخطى'

export interface PayrollBulkMembershipResultRow {
  employeeId: number
  fullName: string | null
  employeeCode: string | null
  outcome: PayrollBulkMembershipOutcome
  /** المسير اللي خرج منه (النقل) أو null (إضافة) */
  fromRunId: number | null
  fromRunName: string | null
  /** كود ونص سبب التخطي — فاضيين للناجح */
  skipCode: string | null
  skipReason: string | null
}

/** تقسيم الاختيار المختلط: مين ينتقل من أنهي مسير، مين يتضاف، ومين يتخطى وليه. دالة صافية. */
export interface PayrollBulkMembershipCandidate {
  employeeId: number
  fullName: string | null
  employeeCode: string | null
  /** فرع الموظف الآن (null = ملفه مش موجود) */
  branchId?: number | null
  exists: boolean
  /** مسيرات الشهر اللي هو فيها فعلًا (مرتبة بالـid) */
  homes: Array<{ id: number; name: string | null; status: string; runType: string; visible: boolean }>
}
export interface PayrollBulkMembershipSplit {
  /** مفاتيح المجموعات: null = إضافة (مش في أي مسير)، ورقم = نقل من المسير ده */
  groups: Array<{ fromRunId: number | null; employeeIds: number[] }>
  skipped: PayrollBulkMembershipResultRow[]
  namesById: Map<number, { fullName: string | null; employeeCode: string | null }>
  fromNames: Map<number, string | null>
}

export function splitPayrollBulkMembership(candidates: PayrollBulkMembershipCandidate[], input: { targetRunId: number; branchScope: BranchScope }): PayrollBulkMembershipSplit {
  const groups = new Map<number | null, number[]>()
  const skipped: PayrollBulkMembershipResultRow[] = []
  const namesById = new Map<number, { fullName: string | null; employeeCode: string | null }>()
  const fromNames = new Map<number, string | null>()
  const skip = (candidate: PayrollBulkMembershipCandidate, code: string, from?: { id: number; name: string | null }) => skipped.push({
    employeeId: candidate.employeeId, fullName: candidate.fullName, employeeCode: candidate.employeeCode, outcome: 'SKIPPED',
    fromRunId: from?.id ?? null, fromRunName: from?.name ?? null, skipCode: code, skipReason: payrollBulkSkipText(code),
  })
  for (const candidate of candidates) {
    namesById.set(candidate.employeeId, { fullName: candidate.fullName, employeeCode: candidate.employeeCode })
    if (!candidate.exists) { skip(candidate, 'EMPLOYEE_NOT_FOUND'); continue }
    if (input.branchScope !== null && (candidate.branchId == null || !input.branchScope.includes(Number(candidate.branchId)))) { skip(candidate, 'OUT_OF_BRANCH_SCOPE'); continue }
    if (candidate.homes.some(run => run.id === input.targetRunId)) { skip(candidate, 'ALREADY_IN_RUN'); continue }
    const home = candidate.homes[0] ?? null
    if (!home) { groups.set(null, [...(groups.get(null) ?? []), candidate.employeeId]); continue }
    if (!home.visible) { skip(candidate, 'SOURCE_OUT_OF_SCOPE', home); continue }
    if (home.runType !== 'REGULAR') { skip(candidate, 'SOURCE_RUN_TYPE', home); continue }
    if (!(PAYROLL_MEMBERSHIP_OPEN_STATUSES as readonly string[]).includes(home.status)) { skip(candidate, 'LOCKED_RUN', home); continue }
    if (!payrollRunSeriesName(home.name)) { skip(candidate, 'SOURCE_NO_NAME', home); continue }
    fromNames.set(home.id, home.name)
    groups.set(home.id, [...(groups.get(home.id) ?? []), candidate.employeeId])
  }
  // الإضافة أولًا (أبسط وأسرع)، بعدين النقل من كل مسير بترتيب ثابت
  const ordered = [...groups.entries()].sort((a, b) => (a[0] ?? 0) - (b[0] ?? 0))
  return { groups: ordered.map(([fromRunId, employeeIds]) => ({ fromRunId, employeeIds })), skipped, namesById, fromNames }
}
