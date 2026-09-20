import { createHash } from 'node:crypto'
import { BadRequestException } from '@nestjs/common'
import { EntityManager, In } from 'typeorm'
import { Employee } from '../employees/employee.entity'
import { OffboardingCase } from '../offboarding/offboarding.entities'
import { payrollEmploymentCoverage } from './payroll-employment'
import { loadPayrollOrgHistory, payrollDepartmentSet, payrollOrgAt, payrollRunDefinitionOf, payrollRunFilterMatches } from './payroll-run-definition'
import type { PayrollScopeType } from './payroll.entities'
import { PAYROLL_REVERSAL_LINES_TABLE } from './payroll-reversal-sql'

/**
 * الخطوة 18 / PR-07 / RP-12: «موظفون بلا مسير في الفترة» — كل من له علاقة عمل في يوم واحد على الأقل من الفترة
 * وليس عضوًا داخلًا (INCLUDED) في مسير غير ملغى يتقاطع معها، ومعه السبب المرجح. قراءة فقط.
 */
export type PayrollUnassignedReason =
  | 'DATA_PROBLEM' | 'SUSPENDED' | 'EXCLUDED_IN_RUN' | 'DRAFT_NOT_CALCULATED' | 'ADDED_AFTER_SNAPSHOT' | 'CANCELLED_RUN_ONLY' | 'OUT_OF_ALL_RUNS'

export const PAYROLL_UNASSIGNED_REASON_LABELS: Record<PayrollUnassignedReason, string> = {
  DATA_PROBLEM: 'بيانات الخدمة تمنع حسابه',
  SUSPENDED: 'موقوف بلا أجر',
  EXCLUDED_IN_RUN: 'مستبعد من مسير',
  DRAFT_NOT_CALCULATED: 'داخل مسودة لم تُحتسب',
  ADDED_AFTER_SNAPSHOT: 'دخل نطاق مسير بعد آخر حساب له',
  CANCELLED_RUN_ONLY: 'عضو في مسير ملغى فقط',
  OUT_OF_ALL_RUNS: 'خارج نطاق كل المسيرات',
}

// أسباب الاستبعاد المحفوظة في payroll_run_members.exclusionReason بنص عربي للتقرير والمعاينة.
export const PAYROLL_EXCLUSION_LABELS: Record<string, string> = {
  // أكواد قديمة محفوظة في صفوف سابقة؛ قرار المالك (20 سبتمبر) ألغى الاستبعاد العام للموقوف والمؤرشف.
  SUSPENDED: 'الموظف موقوف',
  ARCHIVED: 'ملف الموظف مؤرشف',
  EXC_ARCHIVED_NO_LAST_DAY: 'مؤرشف بلا تاريخ آخر يوم عمل — حدده عشان راتبه يتحسب',
  EXC_JOINS_AFTER_PERIOD: 'بداية العمل بعد نهاية الفترة',
  EXC_TERMINATED_BEFORE_PERIOD: 'انتهاء الخدمة قبل بداية الفترة',
  EXC_NO_ACTIVE_EMPLOYMENT: 'لا توجد مدة عمل مستحقة داخل الفترة',
  EXC_MANUAL_EXCLUSION: 'استبعاد يدوي بسبب مكتوب',
  MANUAL: 'استبعاد يدوي',
  EXC_MANUAL: 'استبعاد يدوي',
  TRANSFERRED_OUT: 'انتقل خارج نطاق المسير قبل نهاية الفترة',
  EXC_OUT_OF_SCOPE: 'خارج نطاق المسير في آخر يوم من الفترة',
  EXC_ALREADY_IN_RUN: 'مدرج في مسير آخر معتمد أو مصروف لنفس الفترة',
  EXC_EMPLOYMENT_DATA_INVALID: 'بيانات الخدمة غير مكتملة أو متعارضة',
  NO_SALARY_DEFINED: 'لا يوجد راتب موثق لشهر المسير',
  SALARY_DAILY_HISTORY_ONLY: 'سجل الأجر بتواريخ يومية لا تحدد شهر الراتب',
  SALARY_PAYROLL_PERIOD_GAP: 'شهر المسير غير موثق في سجل الأجر الشهري',
  SALARY_PAYROLL_PERIOD_INVALID: 'سجل الأجر الشهري غير صالح لهذا الشهر',
  SALARY_HISTORY_INVALID: 'سجل الأجر لا يطابق بصمته الموثقة',
  SALARY_HISTORY_SCHEMA_MISSING: 'ترحيل سجل الأجر غير مطبق',
  SALARY_COMPONENT_INVALID: 'أحد مكونات راتب الملف غير صالح',
  // C8 / الخطوة 31: عضو المسير المصروف الذي نُفّذ عكس صرف بنده — بلا مسير في الفترة حتى يُصرف بمسير تكميلي
  PAYROLL_REVERSED: 'عُكس صرف بنده في هذا المسير ولم يُصرف بمسير تكميلي بعد',
}

export interface PayrollUnassignedRunRef {
  runId: number | null; name: string | null; status: string; period: string; startDate: string; endDate: string; exclusionReason: string | null
}
export interface PayrollUnassignedRow {
  employeeId: number; employeeCode: string; fullName: string; employmentStatus: string
  branchId: number | null; departmentId: number | null; teamId: number | null
  hireDate: string | null; leaveDate: string | null; coverFrom: string | null; coverTo: string | null; coverDays: number | null
  reasonCode: PayrollUnassignedReason; reasonText: string; runs: PayrollUnassignedRunRef[]
}
export interface PayrollUnassignedFilters { branchId?: number | null; departmentId?: number | null; teamId?: number | null }
export interface PayrollUnassignedReport {
  period: string; startDate: string; endDate: string; scopeBranchId: number | null
  filters: { branchId: number | null; departmentId: number | null; teamId: number | null }; includeSuspended: boolean
  reportHash: string
  totals: { employed: number; assigned: number; unassigned: number; byReason: Partial<Record<PayrollUnassignedReason, number>> }
  rows: PayrollUnassignedRow[]
}

interface RunRow {
  id: number; name: string | null; status: string; period: string; startDate: string; endDate: string; snapshotVersion: number
  scopeType: PayrollScopeType; scopeIds: string | null; employeeIds: string | null; branchId: number | null; definition: string | null
}

const ACTIVE = new Set(['CALCULATED', 'IN_REVIEW', 'APPROVED', 'PAID'])
const ID_CHUNK = 500
const runLabel = (ref: PayrollUnassignedRunRef) => `المسير #${ref.runId}${ref.name ? ` «${ref.name}»` : ''}`

export function payrollUnassignedReportHash(report: Omit<PayrollUnassignedReport, 'reportHash' | 'totals'>): string {
  return createHash('sha256').update(JSON.stringify({
    period: report.period, startDate: report.startDate, endDate: report.endDate, scopeBranchId: report.scopeBranchId,
    filters: report.filters, includeSuspended: report.includeSuspended,
    // حالة المسير المرجعي ليست جزءًا من البصمة: اعتماد مسير آخر لا يغير سبب عدم إدراج الموظف فلا يُسقط الإقرار؛
    // الإلغاء يغير كود السبب نفسه (CANCELLED_RUN_ONLY) فيُسقطه.
    rows: report.rows.map(row => [row.employeeId, row.reasonCode, row.coverFrom, row.coverTo,
      row.runs.map(ref => [ref.runId, ref.exclusionReason])]),
  })).digest('hex')
}

export async function buildPayrollUnassignedReport(em: EntityManager, input: {
  period: string; startDate: string; endDate: string; branchScope: number | null; today: string
  filters?: PayrollUnassignedFilters; includeSuspended?: boolean
}): Promise<PayrollUnassignedReport> {
  const { startDate, endDate } = input
  const filters = { branchId: input.filters?.branchId ?? null, departmentId: input.filters?.departmentId ?? null, teamId: input.filters?.teamId ?? null }
  const history = await loadPayrollOrgHistory(em, input.today)
  const runs: RunRow[] = (await em.query(`SELECT [id], [name], [status], [period], CONVERT(varchar(10), [startDate], 23) AS [startDate],
      CONVERT(varchar(10), [endDate], 23) AS [endDate], [snapshotVersion], [scopeType], [scopeIds], [employeeIds], [branchId], [definition]
    FROM [payroll_runs] WHERE [startDate] <= CONVERT(date, @0, 23) AND [endDate] >= CONVERT(date, @1, 23) ORDER BY [id]`, [endDate, startDate]))
    .map((row: Record<string, any>) => ({ ...row, id: Number(row.id), snapshotVersion: Number(row.snapshotVersion ?? 0) }))
  const runIds = runs.map(run => run.id)
  const memberships = new Map<number, Array<{ run: RunRow; included: boolean; exclusionReason: string | null }>>()
  const push = (employeeId: number, value: { run: RunRow; included: boolean; exclusionReason: string | null }) => {
    const list = memberships.get(employeeId) ?? []
    list.push(value)
    memberships.set(employeeId, list)
  }
  for (let offset = 0; offset < runIds.length; offset += ID_CHUNK) {
    const chunk = runIds.slice(offset, offset + ID_CHUNK)
    const list = chunk.map((_, index) => `@${index}`).join(', ')
    const members: Array<Record<string, any>> = await em.query(`SELECT [runId], [employeeId], [membershipStatus], [exclusionReason]
      FROM [payroll_run_members] WHERE [runId] IN (${list})`, chunk)
    const items: Array<Record<string, any>> = await em.query(`SELECT [runId], [employeeId] FROM [payroll_items] WHERE [runId] IN (${list})`, chunk)
    // C8 / الخطوة 31: البند المعكوس صرفه بسطر منفذ لا يُحتسب إدراجًا في المسير
    const reversed = new Set((await em.query(`SELECT [originalRunId], [employeeId] FROM [${PAYROLL_REVERSAL_LINES_TABLE}] WHERE [status] = 'POSTED' AND [originalRunId] IN (${list})`, chunk) as Array<Record<string, any>>)
      .map(row => `${Number(row.originalRunId)}:${Number(row.employeeId)}`))
    for (const row of members) {
      const run = runs.find(candidate => candidate.id === Number(row.runId))!
      const wasReversed = reversed.has(`${run.id}:${Number(row.employeeId)}`)
      push(Number(row.employeeId), { run, included: row.membershipStatus !== 'EXCLUDED' && !wasReversed, exclusionReason: wasReversed ? 'PAYROLL_REVERSED' : row.exclusionReason ?? null })
    }
    for (const row of items) {
      const run = runs.find(candidate => candidate.id === Number(row.runId))!
      const known = memberships.get(Number(row.employeeId))?.some(entry => entry.run.id === run.id)
      const wasReversed = reversed.has(`${run.id}:${Number(row.employeeId)}`)
      if (!known) push(Number(row.employeeId), { run, included: !wasReversed, exclusionReason: wasReversed ? 'PAYROLL_REVERSED' : null })
    }
  }
  const definitions = new Map(runs.map(run => {
    try {
      const definition = payrollRunDefinitionOf(run)
      return [run.id, { definition, departments: payrollDepartmentSet(history, definition.filters.departmentIds, definition.filters.includeSubDepartments) }] as const
    } catch { return [run.id, null] as const }
  }))
  const employees = await em.getRepository(Employee).find({ order: { id: 'ASC' } })
  const cases: OffboardingCase[] = []
  const employeeIds = employees.map(row => row.id)
  for (let offset = 0; offset < employeeIds.length; offset += ID_CHUNK) {
    cases.push(...await em.getRepository(OffboardingCase).find({ where: { employeeId: In(employeeIds.slice(offset, offset + ID_CHUNK)) } }))
  }
  const filterDepartments = filters.departmentId ? payrollDepartmentSet(history, [filters.departmentId], true) : null
  const ref = (entry: { run: RunRow; exclusionReason: string | null }): PayrollUnassignedRunRef => ({ runId: entry.run.id, name: entry.run.name,
    status: entry.run.status, period: entry.run.period, startDate: entry.run.startDate, endDate: entry.run.endDate, exclusionReason: entry.exclusionReason })

  const rows: PayrollUnassignedRow[] = []
  let employed = 0, assigned = 0
  for (const employee of employees) {
    const own = cases.filter(row => row.employeeId === employee.id)
    let coverage: ReturnType<typeof payrollEmploymentCoverage> = null, problem: string | null = null
    try { coverage = payrollEmploymentCoverage(employee, own, startDate, endDate) }
    catch (error) { if (!(error instanceof BadRequestException)) throw error; problem = error.message }
    const suspended = !coverage && !problem && employee.status === 'suspended'
    if (!coverage && !problem && !(suspended && input.includeSuspended)) continue
    const org = payrollOrgAt(history, employee, coverage?.coverTo ?? endDate)
    if (input.branchScope !== null && org.branchId !== input.branchScope) continue
    if (filters.branchId && org.branchId !== filters.branchId) continue
    if (filterDepartments && (org.departmentId === null || !filterDepartments.has(org.departmentId))) continue
    if (filters.teamId && org.teamId !== filters.teamId) continue
    if (!suspended) employed++
    const entries = memberships.get(employee.id) ?? []
    if (entries.some(entry => entry.included && ACTIVE.has(entry.run.status))) { assigned++; continue }
    let reasonCode: PayrollUnassignedReason, reasonText: string, refs: PayrollUnassignedRunRef[] = []
    const excluded = entries.filter(entry => !entry.included && ACTIVE.has(entry.run.status))
    const scopeMatch = (status: (run: RunRow) => boolean) => runs.filter(run => status(run) && !entries.some(entry => entry.run.id === run.id)).filter(run => {
      const definition = definitions.get(run.id)
      return !!definition && payrollRunFilterMatches(definition.definition.filters, employee.id, payrollOrgAt(history, employee, run.endDate), definition.departments)
    })
    if (problem) {
      reasonCode = 'DATA_PROBLEM'; reasonText = `بيانات الخدمة تمنع حسابه: ${problem}`
    } else if (suspended) {
      reasonCode = 'SUSPENDED'; reasonText = 'موقوف بلا أجر مسجل في النظام'
    } else if (excluded.length) {
      reasonCode = 'EXCLUDED_IN_RUN'; refs = excluded.map(ref)
      reasonText = `مستبعد من ${refs.map(item => `${runLabel(item)}: ${PAYROLL_EXCLUSION_LABELS[item.exclusionReason ?? ''] ?? item.exclusionReason ?? 'سبب غير موثق'}`).join('؛ ')}`
    } else if (scopeMatch(run => run.status === 'DRAFT').length) {
      refs = scopeMatch(run => run.status === 'DRAFT').map(run => ref({ run, exclusionReason: null }))
      reasonCode = 'DRAFT_NOT_CALCULATED'; reasonText = `داخل نطاق ${refs.map(runLabel).join('، ')} ولم تُحتسب المسودة بعد`
    } else if (scopeMatch(run => ACTIVE.has(run.status)).length) {
      refs = scopeMatch(run => ACTIVE.has(run.status)).map(run => ref({ run, exclusionReason: null }))
      reasonCode = 'ADDED_AFTER_SNAPSHOT'
      reasonText = `داخل نطاق ${refs.map(runLabel).join('، ')} لكنه أُضيف أو انتقل إليه بعد آخر حساب له؛ أعد حساب المسودة أو أنشئ مسيرًا يضمه`
    } else if (entries.some(entry => entry.run.status === 'CANCELLED')) {
      refs = entries.filter(entry => entry.run.status === 'CANCELLED').map(ref)
      reasonCode = 'CANCELLED_RUN_ONLY'; reasonText = `عضو في مسير ملغى فقط: ${refs.map(runLabel).join('، ')}`
    } else {
      reasonCode = 'OUT_OF_ALL_RUNS'; reasonText = 'خارج نطاق كل المسيرات المنشأة لهذه الفترة'
    }
    rows.push({ employeeId: employee.id, employeeCode: employee.employeeCode, fullName: employee.fullName, employmentStatus: employee.status,
      branchId: org.branchId, departmentId: org.departmentId, teamId: org.teamId,
      hireDate: coverage?.hireDate ?? employee.actualStartDate ?? employee.joinDate ?? null, leaveDate: coverage?.leaveDate ?? null,
      coverFrom: coverage?.coverFrom ?? null, coverTo: coverage?.coverTo ?? null, coverDays: coverage?.coverDays ?? null,
      reasonCode, reasonText, runs: refs })
  }
  const byReason: Partial<Record<PayrollUnassignedReason, number>> = {}
  for (const row of rows) byReason[row.reasonCode] = (byReason[row.reasonCode] ?? 0) + 1
  const base = { period: input.period, startDate, endDate, scopeBranchId: input.branchScope, filters, includeSuspended: input.includeSuspended === true, rows }
  return { ...base, reportHash: payrollUnassignedReportHash(base),
    totals: { employed, assigned, unassigned: rows.filter(row => row.reasonCode !== 'SUSPENDED').length, byReason } }
}
