import type { EntityManager } from 'typeorm'
import { MONTHLY_SALARY_COMPONENTS } from '../employees/compensation'
import type { PayrollLiveSourceSection } from './payroll-live-source-contract'
import { payrollLiveSourcePeriod } from './payroll-live-source-contract'
import { readSalaryHistory, salaryCurrentSourceHash, salaryHistorySchemaMissing, type SalaryHistoryCurrent } from './payroll-salary-history'
import { PayrollPeriodSalaryError, selectPayrollPeriodSalary } from './payroll-period-salary'

/** شهر المسير يختار راتبًا واحدًا؛ تغطية الخدمة تحدد التناسب فقط ولا تقسم قيمة الراتب بين الأيام. */
export async function readPayrollLiveCompensation(em: EntityManager, employeeId: number, periodStart: string, periodEnd: string, employment: PayrollLiveSourceSection, current: PayrollLiveSourceSection, policyCurrency: string | null): Promise<PayrollLiveSourceSection> {
  const period = payrollLiveSourcePeriod(periodStart, periodEnd)
  const previous = current.data as Record<string, any>
  const employeeRef = `employees:${employeeId}`
  const referencePeriod = period.endDate.slice(0, 7)
  const data: Record<string, any> = { ...previous, basis: 'SINGLE_PAYROLL_PERIOD_SALARY', referencePeriod, referencePeriodBasis: 'PERIOD_END_MONTH', historyVersion: null, historySegments: [], datedSegments: null, selectedSalary: null, missingPayrollPeriods: [], missingDates: [], currentSourceUnchanged: false }
  const issues: PayrollLiveSourceSection['issues'] = [], sourceRefs = [employeeRef]
  const result = (state: PayrollLiveSourceSection['state']): PayrollLiveSourceSection => ({ state, data, issues, sourceRefs })
  let history: Awaited<ReturnType<typeof readSalaryHistory>>
  try { history = await readSalaryHistory(em, employeeId) }
  catch (error: any) {
    if (salaryHistorySchemaMissing(error)) { issues.push({ code: 'COMPENSATION_HISTORY_SCHEMA_MISSING', message: 'سجل الأجر المؤرخ يحتاج تطبيق ترحيله قبل قراءة الفترات', sourceRef: employeeRef }); return result('MISSING') }
    if (error?.getResponse?.()?.code === 'SALARY_HISTORY_INVALID') { issues.push({ code: 'COMPENSATION_HISTORY_INVALID', message: 'سجل الأجر أو بصمته لا يطابق البيانات الموثقة؛ يلزم تصحيحه قبل الحساب', sourceRef: employeeRef }); return result('INVALID') }
    throw error
  }
  if (!history.version) { issues.push({ code: 'COMPENSATION_HISTORY_MISSING', message: 'لم يوثق تاريخ سريان الأجر لهذا الموظف؛ القيم الحالية لا تثبت راتب الفترة', sourceRef: employeeRef }); return result('MISSING') }
  data.historyVersion = history.version
  data.historySegments = history.segments
  const historyRef = `employee_salary_history_versions:${history.version.id}:revision:${history.revision}`
  sourceRefs.push(historyRef)
  try { data.currentSourceUnchanged = salaryCurrentSourceHash({ ...previous.current, currency: previous.currency } as SalaryHistoryCurrent) === history.version.currentSourceHash }
  catch { issues.push({ code: 'COMPENSATION_CURRENT_SOURCE_INVALID', message: 'قيمة الأجر الحالي لا يمكن مطابقتها بمصدر توثيق السجل', sourceRef: employeeRef }); return result('INVALID') }
  if (!data.currentSourceUnchanged) issues.push({ code: 'COMPENSATION_CURRENT_SOURCE_CHANGED', message: 'تغير الأجر أو العملة في ملف الموظف منذ توثيق السجل؛ راجع الفترات واحفظ مراجعة جديدة', sourceRef: historyRef })
  const coverage = (employment.data as any)?.coverage
  let validCoverage = false
  try {
    const checked = payrollLiveSourcePeriod(coverage?.from, coverage?.to)
    validCoverage = checked.startDate >= periodStart && checked.endDate <= periodEnd && coverage.days === checked.periodDays
  } catch { /* التغطية غير الصالحة لا تولد قائمة استحقاق فارغة تبدو صحيحة. */ }
  if (employment.state !== 'AVAILABLE' || !validCoverage) {
    issues.push({ code: 'COMPENSATION_EMPLOYMENT_COVERAGE_MISSING', message: 'تغطية خدمة الموظف غير مثبتة في هذه الفترة؛ لا تحدد القراءة أيام استحقاق الأجر', sourceRef: historyRef }); return result('UNSUPPORTED')
  }
  let selected: ReturnType<typeof selectPayrollPeriodSalary>
  try { selected = selectPayrollPeriodSalary(history, referencePeriod) }
  catch (error) {
    if (!(error instanceof PayrollPeriodSalaryError)) throw error
    if (error.state === 'MISSING') data.missingPayrollPeriods = [referencePeriod]
    issues.push({ code: error.code, message: error.message, sourceRef: historyRef })
    return result(error.state)
  }
  const row = selected.segment
  sourceRefs.push(...selected.sourceRefs.filter(ref => !sourceRefs.includes(ref)))
  if (!['EGP', 'SAR'].includes(policyCurrency ?? '') || row.currency !== policyCurrency) issues.push({ code: 'COMPENSATION_POLICY_CURRENCY_MISMATCH', message: 'عملة راتب شهر المسير لا تطابق عملة السياسة المختارة؛ لا يحول النظام العملة تلقائيًا', sourceRef: selected.sourceRef })
  if (issues.length) return result('UNSUPPORTED')
  const salary = Object.fromEntries(MONTHLY_SALARY_COMPONENTS.map(component => [component.key, row[component.key]]))
  data.selectedSalary = { referencePeriod, effectivePayrollPeriod: row.effectivePayrollPeriod, effectiveToPayrollPeriod: row.effectiveToPayrollPeriod, salary, currency: row.currency, sourceRef: selected.sourceRef, historyRevision: selected.historyRevision, historyContentHash: selected.historyContentHash }
  // اسم الحقل باقٍ للتوافق؛ العنصر الوحيد يغطي الخدمة بقيمة شهرية ثابتة، وليس شريحة زيادة يومية.
  data.datedSegments = [{ from: coverage.from, to: coverage.to, currency: row.currency, sourceRef: selected.sourceRef, salary }]
  return result('AVAILABLE')
}
