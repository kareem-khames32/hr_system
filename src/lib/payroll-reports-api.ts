import { apiFetch } from './api'

// تقارير الرواتب (الخطوة 30): المسيرات، بلا مسير، الإضافي بالمبالغ، السلف، الفروق — كل التصدير من هذه البناة
export type Money = string

export interface PayrollRunsReportRun {
  id: number; name: string | null; period: string; status: string; scopeType: string; scopeLabel: string
  branchId: number | null; branchName: string | null; startDate: string; endDate: string
  employees: number; excluded: number; totalNet: Money; storedTotalNet: Money | null; partial: boolean
  // C8 / الخطوة 31: نوع المسير وربطه، وبنوده التي نُفّذ عكس صرفها (لا تدخل مجاميع الفترة؛ مسير العكس يُعرض بسطوره سالبة)
  runType?: 'REGULAR' | 'REVERSAL' | 'SUPPLEMENTARY'; parentRunId?: number | null; reversedEmployees?: number; reversedNet?: Money
}
export interface PayrollRunsReport {
  runs: PayrollRunsReportRun[]
  byMethod: Array<{ payMethod: string; count: number; total: Money }>
  deductions: Array<{
    period: string; employees: number; basic: Money; allowances: Money; overtime: Money; otherAdditions: Money
    lateness: Money; shortfall: Money; absence: Money; unpaidLeave: Money; loans: Money; otherDeductions: Money; net: Money
  }>
}

export interface ReportRunRef { id: number | null; name: string | null; period: string; status: string; startDate: string; endDate: string }

export interface UnassignedRow {
  employeeId: number; employeeCode: string; fullName: string; status: string
  branchName: string | null; departmentName: string | null; teamName: string | null
  hireDate: string | null; leaveDate: string | null; coverFrom: string | null; coverTo: string | null; coverDays: number | null
  reason: string; reasonLabel: string; detail: string | null
  reasons: Array<{ code: string; label: string; detail: string | null; run: ReportRunRef | null }>
  lastRun: ReportRunRef | null
  pending: { installments: number; installmentsAmount: Money; approvedOvertime: number; obligations: number }
}
export interface UnassignedReport {
  period: string | null
  summary: { from: string; to: string; onJob: number; covered: number; unassigned: number; suspended: number; dataIssues: number; duplicates: number }
  runs: Array<ReportRunRef & { scopeLabel: string; members?: number; excluded?: number }>
  rows: UnassignedRow[]
  duplicates: Array<{ employeeId: number; employeeCode: string; fullName: string; runs: ReportRunRef[] }>
}

export interface OvertimeReportRow {
  id: number; employeeId: number; employeeCode: string | null; fullName: string | null; departmentName: string | null
  date: string; source: string; status: string; dayKind: string | null
  detectedMinutes: number | null; requestedMinutes: number | null; approvedMinutes: number | null; differenceMinutes: number | null
  multiplier: number | null; hourlyRate: number | null; amount: Money | null; amountSource: string; amountSourceLabel: string; issue: string | null
  approverId: number | null; approvedAt: string | null; run: ReportRunRef | null; deferredFromRunId: number | null
}
export interface OvertimeReport {
  period: string | null; from: string; to: string; rows: OvertimeReportRow[]
  summary: {
    entries: number; byStatus: Record<string, { count: number; minutes: number; amount: Money }>
    detectedMinutes: number; approvedMinutes: number; approvedAmount: Money; estimatedAmount: Money
    // allocatedAmount: جزء «داخل بنود المسيرات» الموزّع من بنود قديمة تجمع عدة سجلات؛ unallocatedInRunsAmount: قيمة بنود تعذر توزيعها (سجلاتها بلا قيمة)
    paidInRunsAmount: Money; allocatedAmount: Money; unallocatedInRunsAmount: Money; payrollColumnTotal: Money
    rejected: number; unresolved: number; withIssues: number; approvalRatio: number | null
  }
}

export interface LoansReportRow {
  loanId: number; requestId: number | null; employeeId: number; employeeCode: string; fullName: string; employeeStatus: string
  departmentName: string | null; branchName: string | null; status: string; disbursedAt: string | null
  principal: Money; paid: Money | null; remaining: Money | null; installments: number; paidInstallments: number
  currentInstallment: number | null; nextDueDate: string | null; overdueCount: number; overdueAmount: Money | null
  partialCount: number; deferredCount: number; expectedCloseDate: string | null; balanced: boolean; issue: string | null
  schedule: Array<{ id: number; dueDate: string; originalDueDate: string; amount: Money; paidAmount: Money; remainingAmount: Money; status: string; statusLabel: string; parentInstallmentId: number | null }>
}
export interface LoansReport {
  period: string | null; today: string; rows: LoansReportRow[]
  aging: Array<{ label: string; count: number; amount: Money }>
  forecast: Array<{ month: string; amount: Money }>
  afterService: Array<{ loanId: number; employeeId: number; employeeCode: string; fullName: string; employeeStatus: string; remaining: Money }>
  summary: { loans: number; principal: Money; paid: Money; remaining: Money; overdue: Money; unbalanced: number; issues: number
    period: { from: string; to: string; dueInPeriod: Money; payrollColumnTotal: Money; allocatedInRuns: Money } | null }
}

export interface VarianceRow {
  employeeId: number; employeeCode: string | null; fullName: string | null; currentRuns: number[]; previousRuns: number[]
  currentNet: Money; previousNet: Money; difference: Money; percent: number | null; direction: 'INCREASE' | 'DECREASE' | 'UNCHANGED'
  components: Array<{ key: string; label: string; current: Money; previous: Money; delta: Money; effect: Money }>
  causes: Array<{ code: string; label: string }>; residual: Money; unexplained: boolean; changed: boolean
}
export interface VarianceReport {
  period: string | null; comparePeriod: string | null; rows: VarianceRow[]; unexplained: VarianceRow[]
  totals: Array<{ key: string; label: string; current: Money; previous: Money; delta: Money }>
  summary: { employees: number; shown: number; increased: number; decreased: number; unexplained: number; currentRuns: number; previousRuns: number } | null
}

type QueryValue = string | number | boolean | null | undefined
export function reportQuery(params: Record<string, QueryValue>) {
  const search = new URLSearchParams()
  for (const [key, value] of Object.entries(params)) {
    if (value === undefined || value === null || value === '' || value === false) continue
    search.set(key, String(value))
  }
  const text = search.toString()
  return text ? `?${text}` : ''
}

export const fetchPayrollRunsReport = () => apiFetch<PayrollRunsReport>('/reports/payroll')
export const fetchPayrollUnassignedReport = (params: Record<string, QueryValue>) =>
  apiFetch<UnassignedReport>(`/reports/payroll/unassigned${reportQuery(params)}`)
export const fetchPayrollOvertimeReport = (params: Record<string, QueryValue>) =>
  apiFetch<OvertimeReport>(`/reports/payroll/overtime${reportQuery(params)}`)
export const fetchPayrollLoansReport = (params: Record<string, QueryValue>) =>
  apiFetch<LoansReport>(`/reports/payroll/loans${reportQuery(params)}`)
export const fetchPayrollVarianceReport = (params: Record<string, QueryValue>) =>
  apiFetch<VarianceReport>(`/reports/payroll/variance${reportQuery(params)}`)

// ===== التسميات =====
export const RUN_STATUS_LABELS: Record<string, string> = { CALCULATED: 'محسوب', IN_REVIEW: 'قيد المراجعة', APPROVED: 'معتمد', PAID: 'مصروف', CANCELLED: 'ملغى' }
export const OVERTIME_STATUS_LABELS: Record<string, string> = {
  DETECTED: 'مكتشف', SUBMITTED: 'مقدَّم للاعتماد', APPROVED: 'معتمد', PAID: 'مصروف', REJECTED: 'مرفوض', CANCELLED: 'ملغى',
}
export const OVERTIME_SOURCE_LABELS: Record<string, string> = { BIOMETRIC_DETECTED: 'مكتشف من البصمة', PRE_REQUESTED: 'طلب موظف' }
export const DAY_KIND_LABELS: Record<string, string> = { WEEKDAY: 'يوم عمل', WEEKEND: 'راحة أسبوعية', HOLIDAY: 'عطلة رسمية' }
export const LOAN_STATUS_LABELS: Record<string, string> = { APPROVED: 'معتمدة', DISBURSED: 'جاري السداد', SETTLED: 'مكتملة' }
export const EMPLOYEE_STATUS_LABELS: Record<string, string> = {
  active: 'نشط', probation: 'تحت التجربة', notice_period: 'فترة إشعار', suspended: 'موقوف', terminated: 'منتهي الخدمة', archived: 'مؤرشف',
}
export const PAY_METHOD_LABELS: Record<string, string> = { transfer: 'تحويل بنكي', cash: 'نقدًا', cheque: 'شيك', visa: 'فيزا' }
export const UNASSIGNED_REASON_OPTIONS: Array<{ code: string; label: string }> = [
  { code: 'DATA_ISSUE', label: 'بيانات الخدمة ناقصة أو متعارضة' },
  { code: 'EXCLUDED_IN_RUN', label: 'مستبعد في مسير للفترة' },
  { code: 'JOINED_AFTER_SNAPSHOT', label: 'أُضيف بعد تجميد لقطة المسير' },
  { code: 'IN_SCOPE_NOT_RECALCULATED', label: 'ضمن نطاق مسير لم يُعَد حسابه' },
  { code: 'ONLY_CANCELLED_RUN', label: 'عضو في مسير ملغى فقط' },
  { code: 'NO_SALARY_DEFINED', label: 'لا يوجد راتب معرّف' },
  { code: 'NO_RUN_IN_PERIOD', label: 'لا يوجد مسير للفترة' },
  { code: 'OUT_OF_ALL_RUN_SCOPES', label: 'خارج نطاق كل المسيرات' },
  { code: 'SUSPENDED', label: 'موقوف بلا أجر' },
  { code: 'REVERSED_IN_RUN', label: 'عُكس صرف بنده ولم يُصرف بمسير تكميلي' },
]

const label = (map: Record<string, string>, code: string | null | undefined) =>
  code == null ? '—' : Object.prototype.hasOwnProperty.call(map, code) ? map[code] : code

export const runStatusLabel = (code: string) => label(RUN_STATUS_LABELS, code)
export const overtimeStatusLabel = (code: string) => label(OVERTIME_STATUS_LABELS, code)

// عرض المبلغ النصي كما هو بالقروش مع فواصل الآلاف بأرقام لاتينية (لا تحويل عبر Number)
export function formatReportMoney(value: Money | null | undefined) {
  if (value == null) return '—'
  const match = /^(-)?(\d+)\.(\d{2})$/.exec(String(value))
  if (!match) return '—'
  return `${match[1] ?? ''}${match[2].replace(/\B(?=(\d{3})+(?!\d))/g, ',')}.${match[3]}`
}

// جمع مبالغ نصية بالقروش الصحيحة (لا تمر عبر Number)
export function sumReportMoney(values: Array<Money | null | undefined>): Money {
  let total = BigInt(0)
  for (const value of values) {
    const match = /^(-)?(\d+)\.(\d{2})$/.exec(String(value ?? ''))
    if (!match) continue
    const cents = BigInt(match[2] + match[3])
    total += match[1] ? -cents : cents
  }
  const negative = total < BigInt(0)
  const abs = negative ? -total : total
  return `${negative ? '-' : ''}${abs / BigInt(100)}.${String(abs % BigInt(100)).padStart(2, '0')}`
}

export const runRefLabel = (run: ReportRunRef | null) =>
  run ? `${run.name ?? `مسير ${run.period}`} (${runStatusLabel(run.status)})` : '—'

export const minutesLabel = (minutes: number | null) => (minutes == null ? '—' : String(minutes))

// ===== بناة CSV (الصفوف المعروضة بعد المرشحات) =====
export interface CsvTable { header: string[]; rows: unknown[][] }

export function runsReportCsv(report: PayrollRunsReport): CsvTable {
  return {
    // تبسيط الرواتب (2026-09-15): عمود «جزئي لنطاقك» أُخفي من الملف كما أُخفيت ملاحظته من الصفحة
    header: ['رقم المسير', 'الاسم', 'الفترة', 'من', 'إلى', 'النطاق', 'الفرع', 'الحالة', 'الموظفون', 'المستبعدون', 'صافي الإجمالي'],
    rows: report.runs.map(run => [run.id, run.name ?? '', run.period, run.startDate, run.endDate, run.scopeLabel, run.branchName ?? '',
      runStatusLabel(run.status), run.employees, run.excluded, run.totalNet]),
  }
}

export function unassignedReportCsv(report: UnassignedReport): CsvTable {
  return {
    header: ['الرقم الوظيفي', 'الاسم', 'الفرع', 'القسم', 'الحالة', 'تاريخ التعيين', 'آخر يوم عمل', 'أيام التغطية', 'السبب', 'التفصيل',
      'كل الأسباب', 'آخر مسير', 'أقساط مستحقة', 'مبلغ الأقساط', 'إضافي معتمد غير مصروف', 'مديونيات معلقة'],
    rows: report.rows.map(row => [row.employeeCode, row.fullName, row.branchName ?? '', row.departmentName ?? '', label(EMPLOYEE_STATUS_LABELS, row.status),
      row.hireDate ?? '', row.leaveDate ?? '', row.coverDays ?? '', row.reasonLabel, row.detail ?? '',
      row.reasons.map(reason => `${reason.label}${reason.run ? ` — ${runRefLabel(reason.run)}` : ''}${reason.detail ? ` (${reason.detail})` : ''}`).join(' | '),
      runRefLabel(row.lastRun), row.pending.installments, row.pending.installmentsAmount, row.pending.approvedOvertime, row.pending.obligations]),
  }
}

export function overtimeReportCsv(report: OvertimeReport): CsvTable {
  return {
    header: ['الرقم الوظيفي', 'الاسم', 'القسم', 'التاريخ', 'المصدر', 'نوع اليوم', 'الحالة', 'الدقائق المكتشفة', 'الدقائق المطلوبة', 'الدقائق المعتمدة',
      'الفرق (مكتشف - معتمد)', 'المضاعف', 'أجر الساعة', 'القيمة', 'مصدر القيمة', 'ملاحظة', 'المسير'],
    rows: report.rows.map(row => [row.employeeCode ?? '', row.fullName ?? '', row.departmentName ?? '', row.date, label(OVERTIME_SOURCE_LABELS, row.source),
      row.dayKind ? label(DAY_KIND_LABELS, row.dayKind) : '', overtimeStatusLabel(row.status), row.detectedMinutes ?? '', row.requestedMinutes ?? '',
      row.approvedMinutes ?? '', row.differenceMinutes ?? '', row.multiplier ?? '', row.hourlyRate ?? '', row.amount ?? '', row.amountSourceLabel,
      row.issue ?? '', row.run ? runRefLabel(row.run) : '']),
  }
}

export function loansReportCsv(report: LoansReport): CsvTable {
  return {
    header: ['رقم السلفة', 'الرقم الوظيفي', 'الاسم', 'القسم', 'حالة الموظف', 'حالة السلفة', 'تاريخ الصرف', 'أصل المبلغ', 'المسدد', 'المتبقي',
      'القسط الحالي', 'عدد الأقساط', 'الأقساط المسددة', 'الاستحقاق التالي', 'أقساط متأخرة', 'مبلغ المتأخر', 'سداد جزئي', 'مؤجلة', 'الإقفال المتوقع', 'متوازن', 'ملاحظة'],
    rows: report.rows.map(row => [row.loanId, row.employeeCode, row.fullName, row.departmentName ?? '', label(EMPLOYEE_STATUS_LABELS, row.employeeStatus),
      label(LOAN_STATUS_LABELS, row.status), row.disbursedAt ? String(row.disbursedAt).slice(0, 10) : '', row.principal, row.paid ?? '', row.remaining ?? '',
      row.currentInstallment ? `${row.currentInstallment} من ${row.installments}` : '', row.installments, row.paidInstallments, row.nextDueDate ?? '',
      row.overdueCount, row.overdueAmount ?? '', row.partialCount, row.deferredCount, row.expectedCloseDate ?? '', row.balanced ? 'نعم' : 'لا', row.issue ?? '']),
  }
}

export function varianceReportCsv(report: VarianceReport): CsvTable {
  return {
    header: ['الرقم الوظيفي', 'الاسم', `صافي ${report.period ?? ''}`, `صافي ${report.comparePeriod ?? ''}`, 'الفرق', 'النسبة %', 'الاتجاه', 'البنود المتغيرة', 'الأسباب', 'غير مفسَّر'],
    rows: report.rows.map(row => [row.employeeCode ?? '', row.fullName ?? '', row.currentNet, row.previousNet, row.difference, row.percent ?? '',
      row.direction === 'INCREASE' ? 'زيادة' : row.direction === 'DECREASE' ? 'نقص' : 'بلا تغيير',
      row.components.map(component => `${component.label}: ${component.effect}`).join(' | '), row.causes.map(cause => cause.label).join('، '),
      row.unexplained ? row.residual : '']),
  }
}

export const reportFileName = (kind: string, period?: string | null) =>
  `payroll-${kind}${period ? `-${period}` : ''}-${new Date().toLocaleDateString('en-CA')}.csv`
