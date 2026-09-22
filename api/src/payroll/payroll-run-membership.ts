import { BadRequestException } from '@nestjs/common'
import { EntityManager, In } from 'typeorm'
import { localDateOf } from '../attendance/attendance.service'
import { payrollSuspensionNote } from '../employees/employee-suspension-rules'
import { readEmployeeSuspensions } from '../employees/employee-suspensions'
import { Employee } from '../employees/employee.entity'
import { OffboardingCase } from '../offboarding/offboarding.entities'
import { payrollEmploymentCoverage, PayrollEmploymentCoverage } from './payroll-employment'
import { findPayrollConflicts, PayrollConflict } from './payroll-membership-guard'
import type { PayrollMemberSnapshot } from './payroll-membership.entities'
import { payrollSettlementCase, PayrollSettlementCase, SETTLEMENT_RUN_ROW_LABEL } from './payroll-settlement-salary'
import { PayrollRunSalarySelection, PayrollSalaryEvidenceMode, selectPayrollRunSalary } from './payroll-run-salary'
import {
  loadPayrollOrgHistory, PayrollOrgAt, PayrollOrgHistory, payrollDepartmentSet, payrollOrgAt, PayrollRunDefinition,
  payrollRunFilterMatches, payrollRunHasOrgFilters, payrollRunLastInScope,
} from './payroll-run-definition'

/**
 * الخطوتان 16 و17: اشتقاق أعضاء المسير — الدالة نفسها للمعاينة (قراءة فقط) وللحساب، فما يُعرض قبل الحساب هو ما يُحسب.
 * الترتيب: النطاق بمكان الموظف آخر يوم في الفترة ← الاستبعاد اليدوي ← علاقة العمل والتغطية ← راتب الشهر ← الحجز في مسير معتمد.
 * لا تكتب هذه الدالة أي صف؛ القفل يمرره المستدعي عبر beforeEvaluate في الحساب فقط.
 */
export type PayrollMembershipCode =
  | 'EXC_MANUAL_EXCLUSION' | 'TRANSFERRED_OUT' | 'EXC_OUT_OF_SCOPE' | 'EXC_ALREADY_IN_RUN' | 'EXC_EMPLOYMENT_DATA_INVALID'
  | 'SUSPENDED' | 'ARCHIVED' | 'EXC_ARCHIVED_NO_LAST_DAY' | 'EXC_JOINS_AFTER_PERIOD' | 'EXC_TERMINATED_BEFORE_PERIOD'
  | 'EXC_NO_ACTIVE_EMPLOYMENT'
  | string

export interface PayrollMembershipRow {
  employee: Employee
  status: 'INCLUDED' | 'EXCLUDED'
  code: PayrollMembershipCode | null
  message: string | null
  inclusionSource: 'SCOPE' | 'MANUAL_INCLUDE'
  /** مكان الموظف الذي تُثبت به عضويته في هذا المسير (آخر يوم في الفترة، أو آخر يوم كان فيه داخل النطاق لمن انتقل). */
  org: PayrollOrgAt
  orgAtEnd: PayrollOrgAt
  cases: OffboardingCase[]
  coverage: PayrollEmploymentCoverage | null
  salary: PayrollRunSalarySelection | null
  manualReason: string | null
  transferredOut: { lastInScopeDate: string; branchId: number | null; departmentId: number | null; teamId: number | null } | null
  alreadyInRun: PayrollConflict | null
  draftConflicts: PayrollConflict[]
  dataProblem: { code: string; message: string } | null
  /** قرار المالك (20 سبتمبر): الموقوف عضو في المسير — صفّه بيقول «موقوف من … إلى …» أو «رجع نشط من …». */
  suspensionNote: string | null
  /** شهر آخر يوم عمل: راتبه بيتصرف مع التصفية — داخل إجمالي المسير وبرّه المستحق للصرف وكشف البنك. */
  settlement: (PayrollSettlementCase & { label: string }) | null
}

export interface PayrollMembershipResolution {
  candidateCount: number
  rows: PayrollMembershipRow[]
  draftConflicts: PayrollConflict[]
  blockingConflicts: PayrollConflict[]
  unusedExclusions: PayrollRunDefinition['exclusions']
  history: PayrollOrgHistory
}

export interface PayrollMembershipInput {
  run: { id: number | null; period: string; startDate: string; endDate: string }
  definition: PayrollRunDefinition
  salaryEvidenceMode: PayrollSalaryEvidenceMode
  today: string
  previousMembers?: Array<{ employeeId: number; membershipStatus: string | null; snapshot: PayrollMemberSnapshot | null }>
  /** الحساب يتحقق من النطاق ويقفل الموظفين المرتبين هنا قبل قراءة التغطية والراتب؛ المعاينة لا تمرره. */
  beforeEvaluate?: (rows: Array<{ employee: Employee; org: PayrollOrgAt }>) => Promise<void>
}

const ID_CHUNK = 500

/**
 * أ2: أرضية الاستحقاق نفسها التي تستعملها payrollEmploymentCoverage، فسبب الاستبعاد يطابق سبب غياب التغطية.
 * قرار المالك (20 سبتمبر): الإيقاف عن العمل والأرشفة وحدهما ما بقاش سبب استبعاد — الموقوف عضو،
 * والمؤرشف بتاريخ آخر يوم عمل موثّق بياخد أجر أيامه في شهر آخر يوم عمل، وبعد الشهر ده يختفي (EXC_TERMINATED_BEFORE_PERIOD).
 * المؤرشف/المنتهي بلا تاريخ آخر يوم عمل (أغلب المرحّلين من النظام القديم) يفضل مستبعد بسبب واضح.
 */
export function coverageExclusion(emp: PayrollCoverageEmployee, cases: ReadonlyArray<{ status: string; lastWorkingDay: string }>,
  startDate: string, endDate: string): PayrollMembershipCode {
  if ((emp.salaryEntitlementStart || emp.actualStartDate || emp.joinDate || '') > endDate) return 'EXC_JOINS_AFTER_PERIOD'
  const ends = cases.filter(kase => kase.status !== 'CANCELLED').map(kase => String(kase.lastWorkingDay).slice(0, 10))
  const ended = emp.status === 'archived' || emp.status === 'terminated'
  const archiveEnd = ended && !ends.length && emp.archivedAt && Number.isFinite(new Date(emp.archivedAt).getTime())
    ? localDateOf(new Date(emp.archivedAt)) : null
  const lastDay = [...ends, ...(archiveEnd ? [archiveEnd] : [])].sort().pop() ?? null
  if (lastDay && lastDay < startDate) return 'EXC_TERMINATED_BEFORE_PERIOD'
  if (ended && !lastDay) return 'EXC_ARCHIVED_NO_LAST_DAY'
  return 'EXC_NO_ACTIVE_EMPLOYMENT'
}

export interface PayrollCoverageEmployee {
  salaryEntitlementStart?: string | null; actualStartDate?: string | null; joinDate?: string | null
  archivedAt?: Date | string | null; status: string; isActive: boolean
}

/** سبب الاستبعاد بنص واضح على صف الموظف في المعاينة وفي جدول المسير. */
export const PAYROLL_COVERAGE_EXCLUSION_MESSAGES: Record<string, string> = {
  EXC_ARCHIVED_NO_LAST_DAY: 'مؤرشف بلا ملف إنهاء خدمة — افتح له ملف إنهاء خدمة بآخر يوم عمل عشان راتبه يتحسب',
  EXC_TERMINATED_BEFORE_PERIOD: 'انتهت خدمته قبل بداية الفترة؛ راتب آخر شهر في مسير الشهر اللي فيه آخر يوم عمل',
  EXC_JOINS_AFTER_PERIOD: 'بداية استحقاقه بعد نهاية الفترة',
  EXC_NO_ACTIVE_EMPLOYMENT: 'لا توجد مدة عمل مستحقة داخل الفترة',
}

export async function resolvePayrollRunMembership(em: EntityManager, input: PayrollMembershipInput): Promise<PayrollMembershipResolution> {
  const { run, definition } = input
  const { filters } = definition
  const history = await loadPayrollOrgHistory(em, input.today)
  const departments = payrollDepartmentSet(history, filters.departmentIds, filters.includeSubDepartments)
  const previousIncluded = new Map((input.previousMembers ?? [])
    .filter(member => member.membershipStatus !== 'EXCLUDED').map(member => [member.employeeId, member]))
  const repo = em.getRepository(Employee)
  // القائمة الثابتة لا تحتاج بقية الموظفين؛ الفلاتر تُطبق على الكل لأن المكان يُقرأ بتاريخ نهاية الفترة لا من الملف.
  const listOnly = definition.mode === 'LIST'
  const wanted = listOnly ? [...new Set([...filters.employeeIds, ...previousIncluded.keys()])] : null
  const employees: Employee[] = []
  if (wanted) {
    for (let offset = 0; offset < wanted.length; offset += ID_CHUNK) {
      employees.push(...await repo.find({ where: { id: In(wanted.slice(offset, offset + ID_CHUNK)) } }))
    }
    employees.sort((a, b) => a.id - b.id)
  } else employees.push(...await repo.find({ order: { id: 'ASC' } }))

  const inclusionSource: PayrollMembershipRow['inclusionSource'] = filters.employeeIds.length ? 'MANUAL_INCLUDE' : 'SCOPE'
  const candidates: Array<{ employee: Employee; org: PayrollOrgAt }> = []
  const outside: Array<{ employee: Employee; org: PayrollOrgAt; orgAtEnd: PayrollOrgAt; code: 'TRANSFERRED_OUT' | 'EXC_OUT_OF_SCOPE'; lastInScopeDate: string | null }> = []
  for (const employee of employees) {
    const orgAtEnd = payrollOrgAt(history, employee, run.endDate)
    if (payrollRunFilterMatches(filters, employee.id, orgAtEnd, departments)) { candidates.push({ employee, org: orgAtEnd }); continue }
    const listed = !filters.employeeIds.length || filters.employeeIds.includes(employee.id)
    const lastIn = payrollRunHasOrgFilters(filters) && listed
      ? payrollRunLastInScope(history, filters, employee, run.startDate, run.endDate, departments) : null
    if (lastIn) { outside.push({ employee, org: lastIn, orgAtEnd, code: 'TRANSFERRED_OUT', lastInScopeDate: lastIn.date }); continue }
    const previous = previousIncluded.get(employee.id)
    if (!previous) continue
    // عضو سابق خرج من النطاق لا يختفي صامتًا عند إعادة الحساب.
    const snapshot = previous.snapshot
    const moved = !!snapshot && (snapshot.branchId !== orgAtEnd.branchId || snapshot.departmentId !== orgAtEnd.departmentId || snapshot.teamId !== orgAtEnd.teamId)
    const org: PayrollOrgAt = snapshot ? { date: run.endDate, branchId: snapshot.branchId, departmentId: snapshot.departmentId, teamId: snapshot.teamId,
      costCenterId: snapshot.costCenterId, issues: [] } : orgAtEnd
    outside.push({ employee, org, orgAtEnd, code: moved ? 'TRANSFERRED_OUT' : 'EXC_OUT_OF_SCOPE', lastInScopeDate: null })
  }
  if (input.beforeEvaluate) await input.beforeEvaluate([...candidates, ...outside].sort((a, b) => a.employee.id - b.employee.id))

  const caseRows: OffboardingCase[] = []
  const evaluatedIds = candidates.map(row => row.employee.id)
  for (let offset = 0; offset < evaluatedIds.length; offset += ID_CHUNK) {
    caseRows.push(...await em.getRepository(OffboardingCase).find({ where: { employeeId: In(evaluatedIds.slice(offset, offset + ID_CHUNK)) } }))
  }
  const casesOf = (id: number) => caseRows.filter(row => row.employeeId === id)
  // قرار المالك (20 سبتمبر): الموقوف عضو في المسير — بنقرأ فترات إيقافه المتقاطعة مع الفترة عشان صفّه يقول حالته.
  const suspensions: Awaited<ReturnType<typeof readEmployeeSuspensions>> = []
  for (let offset = 0; offset < evaluatedIds.length; offset += ID_CHUNK) {
    suspensions.push(...await readEmployeeSuspensions(em, evaluatedIds.slice(offset, offset + ID_CHUNK), { from: run.startDate, to: run.endDate }))
  }
  const noteOf = (id: number) => payrollSuspensionNote(suspensions.filter(row => row.employeeId === id), run.startDate, run.endDate)
  const exclusions = new Map(definition.exclusions.map(row => [row.employeeId, row]))
  const rows: PayrollMembershipRow[] = outside.map(row => ({
    employee: row.employee, status: 'EXCLUDED', code: row.code, inclusionSource, org: row.org, orgAtEnd: row.orgAtEnd, cases: [],
    coverage: null, salary: null, manualReason: null, alreadyInRun: null, draftConflicts: [], dataProblem: null,
    suspensionNote: null, settlement: null,
    message: row.code === 'TRANSFERRED_OUT' ? 'انتقل خارج نطاق المسير قبل نهاية الفترة؛ العضوية بمكان الموظف في آخر يوم' : 'لم يعد داخل نطاق المسير في آخر يوم من الفترة',
    transferredOut: row.code === 'TRANSFERRED_OUT' ? { lastInScopeDate: row.lastInScopeDate ?? row.org.date, branchId: row.orgAtEnd.branchId,
      departmentId: row.orgAtEnd.departmentId, teamId: row.orgAtEnd.teamId } : null,
  }))
  const eligible: PayrollMembershipRow[] = []
  for (const { employee, org } of candidates) {
    const cases = casesOf(employee.id)
    const settled = payrollSettlementCase(cases, run.startDate, run.endDate)
    const base = { employee, org, orgAtEnd: org, cases, inclusionSource, manualReason: null, transferredOut: null, alreadyInRun: null,
      draftConflicts: [] as PayrollConflict[], dataProblem: null, coverage: null, salary: null,
      suspensionNote: noteOf(employee.id), settlement: settled ? { ...settled, label: SETTLEMENT_RUN_ROW_LABEL } : null }
    const manual = exclusions.get(employee.id)
    if (manual) {
      rows.push({ ...base, status: 'EXCLUDED', code: 'EXC_MANUAL_EXCLUSION', message: manual.reason, manualReason: manual.reason })
      continue
    }
    let coverage: PayrollEmploymentCoverage | null
    try { coverage = payrollEmploymentCoverage(employee, cases, run.startDate, run.endDate) }
    catch (error) {
      if (!(error instanceof BadRequestException)) throw error
      const message = `الموظف ${employee.employeeCode}: ${error.message}`
      rows.push({ ...base, status: 'EXCLUDED', code: 'EXC_EMPLOYMENT_DATA_INVALID', message, dataProblem: { code: 'EXC_EMPLOYMENT_DATA_INVALID', message } })
      continue
    }
    if (!coverage) {
      const code = coverageExclusion(employee, cases, run.startDate, run.endDate)
      rows.push({ ...base, status: 'EXCLUDED', code, message: PAYROLL_COVERAGE_EXCLUSION_MESSAGES[code] ?? null })
      continue
    }
    const salary = await selectPayrollRunSalary(em, employee, run.period, input.salaryEvidenceMode)
    if (!salary.ok) {
      rows.push({ ...base, coverage, salary, status: 'EXCLUDED', code: salary.code, message: salary.message })
      continue
    }
    eligible.push({ ...base, coverage, salary, status: 'INCLUDED', code: null, message: null })
  }
  const conflicts = eligible.length
    ? await findPayrollConflicts(em, { ...(run.id ? { id: run.id } : {}), period: run.period, startDate: run.startDate, endDate: run.endDate }, eligible.map(row => row.employee.id))
    : []
  const draftConflicts: PayrollConflict[] = []
  for (const row of eligible) {
    const own = conflicts.filter(conflict => conflict.employeeId === row.employee.id)
    const blocking = own.filter(conflict => conflict.blocking)
    if (blocking.length) {
      // الخطوة 17: الموظف المحجوز في مسير معتمد/مصروف يُستبعد بكود ورقم المسير الآخر بدل أن يوقف المسير كله.
      const other = blocking[0]
      rows.push({ ...row, status: 'EXCLUDED', code: 'EXC_ALREADY_IN_RUN', alreadyInRun: other,
        message: `مدرج في المسير #${other.otherRunId}${other.name ? ` «${other.name}»` : ''} (${other.status}) لفترة ${other.startDate} → ${other.endDate}` })
      continue
    }
    row.draftConflicts = own
    draftConflicts.push(...own)
    rows.push(row)
  }
  rows.sort((a, b) => a.employee.id - b.employee.id)
  const candidateIds = new Set(candidates.map(row => row.employee.id))
  return { candidateCount: candidates.length, rows, draftConflicts, blockingConflicts: conflicts.filter(conflict => conflict.blocking),
    unusedExclusions: definition.exclusions.filter(row => !candidateIds.has(row.employeeId)), history }
}
