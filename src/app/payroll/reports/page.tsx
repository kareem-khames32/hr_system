'use client'

import { useEffect, useState, type ReactNode } from 'react'
import Link from 'next/link'
import { MainLayout } from '@/components/layout'
import {
  AlertTriangle,
  CreditCard,
  Download,
  FileText,
  Printer,
  RefreshCw,
} from 'lucide-react'
import { can, type ApiBranch, type ApiDepartment } from '@/lib/api'
import { FinancialReportLinks } from '@/app/reports/_financial/links'
import { DayRangeFilter, PayrollPeriodSelect, usePayrollDayRange, usePayrollMonthContext } from '@/components/DayRangeFilter'
import { dayRangeKey, payrollMonthBounds, periodOverlapsRange, validDayRange, type DayRange } from '@/lib/payroll-month-range'
import { downloadCsv } from '@/lib/csv'
import { useCurrency } from '@/lib/currency'
import {
  DAY_KIND_LABELS,
  EMPLOYEE_STATUS_LABELS,
  LOAN_STATUS_LABELS,
  OVERTIME_SOURCE_LABELS,
  OVERTIME_STATUS_LABELS,
  PAY_METHOD_LABELS,
  UNASSIGNED_REASON_OPTIONS,
  fetchPayrollLoansReport,
  fetchPayrollOvertimeReport,
  fetchPayrollRunsReport,
  fetchPayrollUnassignedReport,
  fetchPayrollVarianceReport,
  formatReportMoney,
  loansReportCsv,
  overtimeReportCsv,
  reportFileName,
  runRefLabel,
  runStatusLabel,
  runsReportCsv,
  sumReportMoney,
  unassignedReportCsv,
  varianceReportCsv,
  type CsvTable,
  type LoansReport,
  type OvertimeReport,
  type PayrollRunsReport,
  type UnassignedReport,
  type VarianceReport,
} from '@/lib/payroll-reports-api'

type Tab = 'runs' | 'unassigned' | 'overtime' | 'loans' | 'variance'

// تبسيط الرواتب (2026-09-15): «تقرير الرواتب» يعرض تبويب المسيرات وحده، وأي ?tab في الرابط يفتح المسيرات.
// تبويبات «موظفون بلا مسير» و«العمل الإضافي» و«السلف» و«الفروق بين شهرين» باقية أدناه غير معروضة، والـAPI باقٍ.
const TABS: Array<{ id: Tab; label: string; icon: typeof FileText; payroll: boolean }> = [
  { id: 'runs', label: 'المسيرات', icon: FileText, payroll: false },
]

const runStatusBadge: Record<string, string> = {
  CALCULATED: 'badge badge-primary', IN_REVIEW: 'badge badge-warning', APPROVED: 'badge badge-warning', PAID: 'badge badge-success', CANCELLED: 'badge bg-gray-100 text-gray-600',
}
const lookup = (map: Record<string, string>, code: string | null | undefined) => (code && map[code]) || (code ? 'غير معروف' : '—')

const previousMonth = (month: string) => {
  const [year, value] = month.split('-').map(Number)
  return value === 1 ? `${year - 1}-12` : `${year}-${String(value - 1).padStart(2, '0')}`
}

function Spinner() {
  return (
    <div className="flex items-center justify-center py-16">
      <div className="w-8 h-8 border-2 border-primary-500 border-t-transparent rounded-full animate-spin" />
    </div>
  )
}

function ErrorBanner({ message }: { message: string }) {
  return (
    <div role="alert" className="bg-red-50 text-red-700 rounded-xl p-4 flex items-center gap-2">
      <AlertTriangle size={18} />
      {message}
    </div>
  )
}

// زر التصدير ينتج ملف CSV فعليًا من الصفوف المعروضة، ويتعطل حين لا توجد صفوف
// تبسيط الرواتب (2026-09-15): نص الزر عربي بلا «CSV»
function ExportButton({ table, file }: { table: CsvTable | null; file: string }) {
  const empty = !table || table.rows.length === 0
  return (
    <button
      type="button"
      onClick={() => table && downloadCsv(file, table.header, table.rows)}
      disabled={empty}
      title={empty ? 'لا توجد صفوف للتصدير' : 'تصدير الصفوف المعروضة إلى ملف'}
      className="btn-secondary flex items-center gap-2 disabled:opacity-50"
    >
      <Download size={18} />
      تصدير ملف
    </button>
  )
}

function Stat({ label, value, tone = 'text-gray-800' }: { label: string; value: ReactNode; tone?: string }) {
  return (
    <div className="card">
      <p className="text-sm text-gray-500">{label}</p>
      <p className={`text-2xl font-bold mt-1 ${tone}`} dir="ltr">{value}</p>
    </div>
  )
}

function Th({ children, center = false }: { children: ReactNode; center?: boolean }) {
  return <th className={`px-4 py-3 ${center ? 'text-center' : 'text-right'} text-sm font-medium text-gray-600 whitespace-nowrap`}>{children}</th>
}

function EmptyRow({ colSpan, text }: { colSpan: number; text: string }) {
  return (
    <tr>
      <td colSpan={colSpan} className="text-center py-10 text-gray-400">{text}</td>
    </tr>
  )
}

interface OrgFilters { branchId: string; departmentId: string }

function OrgFilterFields({ value, onChange, branches, departments }: {
  value: OrgFilters; onChange: (value: OrgFilters) => void; branches: ApiBranch[]; departments: ApiDepartment[]
}) {
  return (
    <>
      <div>
        <label className="label">الفرع</label>
        <select className="input" value={value.branchId} onChange={(e) => onChange({ ...value, branchId: e.target.value })}>
          <option value="">كل الفروع</option>
          {branches.map((branch) => <option key={branch.id} value={branch.id}>{branch.name}</option>)}
        </select>
      </div>
      <div>
        <label className="label">القسم</label>
        <select className="input" value={value.departmentId} onChange={(e) => onChange({ ...value, departmentId: e.target.value })}>
          <option value="">كل الأقسام</option>
          {departments.map((department) => <option key={department.id} value={department.id}>{department.name}</option>)}
        </select>
      </div>
    </>
  )
}

// ===== تبويب المسيرات =====
function RunsTab() {
  const currency = useCurrency()
  const [report, setReport] = useState<PayrollRunsReport | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const load = () => {
    setLoading(true); setError('')
    fetchPayrollRunsReport()
      .then(setReport)
      .catch((e) => setError(e instanceof Error ? e.message : 'تعذر تحميل تقرير المسيرات'))
      .finally(() => setLoading(false))
  }
  useEffect(load, [])
  // تبسيط الرواتب (2026-09-15): مسيرات عكس الصرف والتكميلي لا تظهر في التقرير ولا تدخل مجاميعه ولا ملف التصدير
  const runs = (report?.runs ?? []).filter((run) => run.runType !== 'REVERSAL' && run.runType !== 'SUPPLEMENTARY')
  // «من تاريخ / إلى تاريخ»: المسيرات اللي فترتها بتتقاطع مع المدى — الافتراضي شهر الرواتب الجاري
  const { range, setRange, context } = usePayrollDayRange()
  const shownRuns = range ? runs.filter((run) => periodOverlapsRange(run.startDate, run.endDate, range)) : runs
  const periodRows = (report?.deductions ?? []).filter((row) => {
    if (!range || !context || !/^\d{4}-(0[1-9]|1[0-2])$/.test(row.period)) return true
    const bounds = payrollMonthBounds(row.period, context.cycleStartDay)
    return periodOverlapsRange(bounds.from, bounds.to, range)
  })
  const active = shownRuns.filter((run) => run.status !== 'CANCELLED')
  const totalNet = sumReportMoney(active.map((run) => run.totalNet))
  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <p className="text-sm text-gray-500">
          كل المسيرات بما فيها مسيرات القسم والفريق والقائمة المخصّصة التي لا ترتبط بفرع، وكل مسير بصافيه وحالته.
          ومجاميع طرق الصرف والاستحقاقات والخصومات تحت من المسيرات المعتمدة والمصروفة وحدها — نفس أرقام كشف الرواتب المالي للشهر.
        </p>
        <div className="flex items-center gap-2">
          <button type="button" onClick={load} className="btn-secondary flex items-center gap-2"><RefreshCw size={18} />تحديث</button>
          <ExportButton table={report ? runsReportCsv({ ...report, runs: shownRuns }) : null} file={reportFileName('runs')} />
        </div>
      </div>
      <div className="card">
        <DayRangeFilter idPrefix="payroll-runs-report" value={range} onChange={setRange} cycleStartDay={context?.cycleStartDay} today={context?.today} />
      </div>
      {error && <ErrorBanner message={error} />}
      {loading ? <Spinner /> : report && (
        <>
          <div className="grid grid-cols-2 gap-4">
            <Stat label={`صافي المسيرات غير الملغاة (${currency})`} value={formatReportMoney(totalNet)} />
            <Stat label="عدد المسيرات" value={shownRuns.length} />
          </div>
          <div className="card overflow-x-auto">
            <h2 className="text-lg font-bold text-gray-800 mb-4">مسيرات الرواتب</h2>
            <table className="w-full">
              <thead className="bg-gray-50">
                <tr><Th>الاسم</Th><Th>الفترة</Th><Th>النطاق</Th><Th center>الحالة</Th><Th center>الموظفون</Th><Th center>المستبعدون</Th><Th center>صافي الإجمالي</Th></tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {shownRuns.map((run) => (
                  <tr key={run.id} className="hover:bg-gray-50">
                    <td className="px-4 py-3 font-medium text-gray-800">{run.name ?? `مسير ${run.period}`}</td>
                    <td className="px-4 py-3 text-gray-600">
                      {run.period}
                      <p className="text-xs text-gray-400" dir="ltr">{run.startDate} → {run.endDate}</p>
                    </td>
                    <td className="px-4 py-3 text-gray-600">{run.scopeLabel}</td>
                    <td className="px-4 py-3 text-center"><span className={runStatusBadge[run.status] ?? 'badge bg-gray-100 text-gray-600'}>{runStatusLabel(run.status)}</span></td>
                    <td className="px-4 py-3 text-center text-gray-600">{run.employees}</td>
                    <td className="px-4 py-3 text-center text-gray-600">{run.excluded}</td>
                    <td className="px-4 py-3 text-center font-bold text-gray-800" dir="ltr">{formatReportMoney(run.totalNet)}</td>
                  </tr>
                ))}
                {shownRuns.length === 0 && <EmptyRow colSpan={8} text={runs.length === 0 ? 'لا توجد مسيرات رواتب بعد' : 'لا توجد مسيرات في الفترة المختارة'} />}
              </tbody>
            </table>
          </div>
          <div className="grid grid-cols-3 gap-6">
            <div className="card">
              <h2 className="text-lg font-bold text-gray-800 mb-4">حسب طريقة الدفع</h2>
              <div className="space-y-3">
                {report.byMethod.map((method) => (
                  <div key={method.payMethod} className="flex items-center justify-between p-3 bg-gray-50 rounded-xl">
                    <span className="flex items-center gap-2 text-gray-700"><CreditCard size={18} className="text-primary-600" />{lookup(PAY_METHOD_LABELS, method.payMethod)} — {method.count} موظف</span>
                    <span className="font-bold text-primary-600" dir="ltr">{formatReportMoney(method.total)}</span>
                  </div>
                ))}
                {report.byMethod.length === 0 && <p className="text-sm text-gray-400">لا توجد بنود في مسيرات معتمدة أو مصروفة</p>}
              </div>
            </div>
            <div className="card col-span-2 overflow-x-auto">
              <h2 className="text-lg font-bold text-gray-800 mb-4">الاستحقاقات والخصومات حسب الفترة</h2>
              <table className="w-full text-sm">
                <thead className="bg-gray-50">
                  <tr><Th>الفترة</Th><Th center>الأساسي والبدلات</Th><Th center>الإضافي</Th><Th center>التأخير والنقص</Th><Th center>الغياب</Th><Th center>بدون راتب</Th><Th center>السلف</Th><Th center>خصومات أخرى</Th><Th center>الصافي</Th></tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {periodRows.map((row) => (
                    <tr key={row.period}>
                      <td className="px-4 py-3 font-medium">{row.period}</td>
                      <td className="px-4 py-3 text-center" dir="ltr">{formatReportMoney(row.basic)} + {formatReportMoney(row.allowances)}</td>
                      <td className="px-4 py-3 text-center text-success-600" dir="ltr">{formatReportMoney(row.overtime)}</td>
                      <td className="px-4 py-3 text-center text-red-600" dir="ltr">{formatReportMoney(row.lateness)} / {formatReportMoney(row.shortfall)}</td>
                      <td className="px-4 py-3 text-center text-red-600" dir="ltr">{formatReportMoney(row.absence)}</td>
                      <td className="px-4 py-3 text-center text-red-600" dir="ltr">{formatReportMoney(row.unpaidLeave)}</td>
                      <td className="px-4 py-3 text-center text-red-600" dir="ltr">{formatReportMoney(row.loans)}</td>
                      <td className="px-4 py-3 text-center text-red-600" dir="ltr">{formatReportMoney(row.otherDeductions)}</td>
                      <td className="px-4 py-3 text-center font-bold" dir="ltr">{formatReportMoney(row.net)}</td>
                    </tr>
                  ))}
                  {periodRows.length === 0 && <EmptyRow colSpan={9} text="لا توجد بيانات" />}
                </tbody>
              </table>
            </div>
          </div>
        </>
      )}
    </div>
  )
}

// ===== تبويب بلا مسير =====
function UnassignedTab({ branches, departments }: { branches: ApiBranch[]; departments: ApiDepartment[] }) {
  // «من تاريخ / إلى تاريخ» أو شهر رواتب بضغطة — الافتراضي شهر الرواتب الجاري بدورة payroll.cycle_start_day (23 → 22)
  const { range, setRange, context } = usePayrollDayRange()
  const listRange = validDayRange(range)
  const [org, setOrg] = useState<OrgFilters>({ branchId: '', departmentId: '' })
  const [reason, setReason] = useState('')
  const [includeSuspended, setIncludeSuspended] = useState(false)
  const [report, setReport] = useState<UnassignedReport | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const load = () => {
    if (!listRange) return
    setLoading(true); setError('')
    fetchPayrollUnassignedReport({ from: listRange.from, to: listRange.to, branchId: org.branchId, departmentId: org.departmentId, reason, includeSuspended })
      .then(setReport)
      .catch((e) => { setReport(null); setError(e instanceof Error ? e.message : 'تعذر تحميل تقرير الموظفين بلا مسير') })
      .finally(() => setLoading(false))
  }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  useEffect(load, [listRange?.from, listRange?.to])
  const summary = report?.summary
  return (
    <div className="space-y-6">
      <div className="card space-y-4">
        <DayRangeFilter idPrefix="payroll-unassigned" value={range} onChange={setRange} cycleStartDay={context?.cycleStartDay} today={context?.today} />
        <div className="grid grid-cols-5 gap-4 items-end">
          <OrgFilterFields value={org} onChange={setOrg} branches={branches} departments={departments} />
          <div>
            <label className="label">السبب</label>
            <select className="input" value={reason} onChange={(e) => setReason(e.target.value)}>
              <option value="">كل الأسباب</option>
              {UNASSIGNED_REASON_OPTIONS.map((option) => <option key={option.code} value={option.code}>{option.label}</option>)}
            </select>
          </div>
          <label className="flex items-center gap-2 text-sm text-gray-700 pb-3">
            <input type="checkbox" checked={includeSuspended} onChange={(e) => setIncludeSuspended(e.target.checked)} />
            إظهار الموقوفين بلا أجر
          </label>
          <div className="flex items-center gap-2">
            <button type="button" onClick={load} disabled={loading || !listRange} className="btn-primary disabled:opacity-50">عرض</button>
            <ExportButton table={report ? unassignedReportCsv(report) : null} file={reportFileName('unassigned', report?.period ?? (listRange ? dayRangeKey(listRange) : null))} />
          </div>
        </div>
      </div>
      {error && <ErrorBanner message={error} />}
      {loading ? <Spinner /> : report && summary && (
        <>
          <p className="text-sm text-gray-500">
            الفترة <span dir="ltr">{summary.from} → {summary.to}</span>. كل من له علاقة عمل سارية يومًا واحدًا على الأقل ولا يوجد في مسير غير ملغى لهذه الفترة يظهر هنا مع السبب.
          </p>
          <div className="grid grid-cols-5 gap-4">
            <Stat label="على رأس العمل في الفترة" value={summary.onJob} />
            <Stat label="مشمولون في مسير" value={summary.covered} tone="text-success-600" />
            <Stat label="بلا مسير" value={summary.unassigned} tone={summary.unassigned ? 'text-red-600' : 'text-gray-800'} />
            <Stat label="موقوفون بلا أجر" value={summary.suspended} />
            <Stat label="ازدواج تغطية" value={summary.duplicates} tone={summary.duplicates ? 'text-red-600' : 'text-gray-800'} />
          </div>
          <div className={`rounded-xl p-3 text-sm ${summary.covered + summary.unassigned === summary.onJob ? 'bg-success-50 text-success-700' : 'bg-red-50 text-red-700'}`}>
            المشمولون ({summary.covered}) + بلا مسير ({summary.unassigned}) = {summary.covered + summary.unassigned} من {summary.onJob} على رأس العمل
            {summary.dataIssues > 0 && ` — منهم ${summary.dataIssues} ببيانات خدمة تحتاج تصحيحًا`}
          </div>
          {report.runs.length > 0 && (
            <div className="card">
              <h3 className="font-bold text-gray-800 mb-3">المسيرات المتداخلة مع الفترة</h3>
              <div className="flex flex-wrap gap-2">
                {report.runs.map((run, index) => (
                  <span key={`${run.id ?? 'x'}-${index}`} className="px-3 py-1 rounded-full bg-gray-100 text-sm text-gray-700">
                    {runRefLabel(run)} — {run.scopeLabel}{run.members !== undefined ? ` — ${run.members} عضو` : ''}
                  </span>
                ))}
              </div>
            </div>
          )}
          <div className="card overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-gray-50">
                <tr><Th>الموظف</Th><Th>الفرع / القسم</Th><Th center>الحالة</Th><Th center>التعيين</Th><Th center>أيام التغطية</Th><Th>السبب</Th><Th>آخر مسير</Th><Th>أرصدة معلقة</Th></tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {report.rows.map((row) => (
                  <tr key={row.employeeId} className="align-top hover:bg-gray-50">
                    <td className="px-4 py-3">
                      <Link href={`/employees/${row.employeeId}`} className="font-medium text-gray-800 hover:text-primary-600">{row.fullName}</Link>
                      <p className="text-xs text-gray-400">{row.employeeCode}</p>
                    </td>
                    <td className="px-4 py-3 text-gray-600">{row.branchName ?? '—'}<p className="text-xs text-gray-400">{row.departmentName ?? ''}</p></td>
                    <td className="px-4 py-3 text-center">{lookup(EMPLOYEE_STATUS_LABELS, row.status)}</td>
                    <td className="px-4 py-3 text-center" dir="ltr">{row.hireDate ?? '—'}{row.leaveDate && <p className="text-xs text-gray-400">حتى {row.leaveDate}</p>}</td>
                    <td className="px-4 py-3 text-center">{row.coverDays ?? '—'}</td>
                    <td className="px-4 py-3">
                      <span className="badge badge-warning">{row.reasonLabel}</span>
                      {row.detail && <p className="text-xs text-gray-500 mt-1">{row.detail}</p>}
                      {row.reasons.filter((item) => item.run).map((item, index) => (
                        <p key={index} className="text-xs text-gray-500 mt-1">{item.label}: {runRefLabel(item.run)}</p>
                      ))}
                      {row.reasons.length > 1 && (
                        <p className="text-xs text-gray-400 mt-1">أسباب أخرى: {row.reasons.slice(1).map((item) => item.label).join('، ')}</p>
                      )}
                    </td>
                    <td className="px-4 py-3 text-gray-600">{runRefLabel(row.lastRun)}</td>
                    <td className="px-4 py-3 text-xs text-gray-600">
                      {row.pending.installments > 0 && <p>أقساط: {row.pending.installments} ({formatReportMoney(row.pending.installmentsAmount)})</p>}
                      {row.pending.approvedOvertime > 0 && <p>إضافي معتمد: {row.pending.approvedOvertime}</p>}
                      {row.pending.obligations > 0 && <p>مديونيات: {row.pending.obligations}</p>}
                      {!row.pending.installments && !row.pending.approvedOvertime && !row.pending.obligations && '—'}
                    </td>
                  </tr>
                ))}
                {report.rows.length === 0 && <EmptyRow colSpan={8} text="كل الموظفين على رأس العمل مشمولون في مسير لهذه الفترة" />}
              </tbody>
            </table>
          </div>
          {report.duplicates.length > 0 && (
            <div className="card border border-red-200">
              <h3 className="font-bold text-red-700 mb-3">موظفون في أكثر من مسير متداخل</h3>
              <ul className="space-y-2 text-sm">
                {report.duplicates.map((row) => (
                  <li key={row.employeeId}>{row.fullName} ({row.employeeCode}): {row.runs.map(runRefLabel).join(' · ')}</li>
                ))}
              </ul>
            </div>
          )}
        </>
      )}
    </div>
  )
}

// ===== تبويب الإضافي =====
function OvertimeTab({ branches, departments }: { branches: ApiBranch[]; departments: ApiDepartment[] }) {
  const currency = useCurrency()
  // «من تاريخ / إلى تاريخ» أو شهر رواتب بضغطة — الافتراضي شهر الرواتب الجاري بدورة الإعداد لا بالشهر الميلادي
  const { range, setRange, context } = usePayrollDayRange()
  const listRange = validDayRange(range)
  const [org, setOrg] = useState<OrgFilters>({ branchId: '', departmentId: '' })
  const [status, setStatus] = useState('')
  const [report, setReport] = useState<OvertimeReport | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const load = () => {
    if (!listRange) return
    setLoading(true); setError('')
    fetchPayrollOvertimeReport({ from: listRange.from, to: listRange.to, branchId: org.branchId, departmentId: org.departmentId, status })
      .then(setReport)
      .catch((e) => { setReport(null); setError(e instanceof Error ? e.message : 'تعذر تحميل تقرير الإضافي') })
      .finally(() => setLoading(false))
  }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  useEffect(load, [listRange?.from, listRange?.to])
  const summary = report?.summary
  return (
    <div className="space-y-6">
      <div className="card space-y-4">
        <DayRangeFilter idPrefix="payroll-overtime" value={range} onChange={setRange} cycleStartDay={context?.cycleStartDay} today={context?.today} />
        <div className="grid grid-cols-4 gap-4 items-end">
          <OrgFilterFields value={org} onChange={setOrg} branches={branches} departments={departments} />
          <div>
            <label className="label">الحالة</label>
            <select className="input" value={status} onChange={(e) => setStatus(e.target.value)}>
              <option value="">كل الحالات</option>
              {Object.entries(OVERTIME_STATUS_LABELS).map(([code, text]) => <option key={code} value={code}>{text}</option>)}
            </select>
          </div>
          <div className="flex items-center gap-2">
            <button type="button" onClick={load} disabled={loading || !listRange} className="btn-primary disabled:opacity-50">عرض</button>
            <ExportButton table={report ? overtimeReportCsv(report) : null} file={reportFileName('overtime', report?.period ?? (listRange ? dayRangeKey(listRange) : null))} />
          </div>
        </div>
      </div>
      {error && <ErrorBanner message={error} />}
      {loading ? <Spinner /> : report && summary && (
        <>
          <div className="grid grid-cols-5 gap-4">
            <Stat label={`قيمة المعتمد (${currency})`} value={formatReportMoney(summary.approvedAmount)} tone="text-success-600" />
            <Stat label="تقديري لسجلات قديمة" value={formatReportMoney(summary.estimatedAmount)} />
            <Stat label="داخل بنود المسيرات" value={formatReportMoney(summary.paidInRunsAmount)} />
            <Stat label="عمود الإضافي في المسيرات" value={formatReportMoney(summary.payrollColumnTotal)} />
            <Stat label="نسبة المعتمد من المكتشف" value={summary.approvalRatio === null ? '—' : `${summary.approvalRatio}%`} />
          </div>
          <p className="text-sm text-gray-500">
            الفترة <span dir="ltr">{report.from} → {report.to}</span> — {summary.entries} سجل، مرفوض {summary.rejected}
            {summary.unresolved > 0 && <span className="text-red-600"> — {summary.unresolved} سجل يحتاج مراجعة مصدره</span>}. المرفوض يظهر بقيمة صفر ولا يدخل المجموع.
          </p>
          {summary.allocatedAmount !== '0.00' && (
            <p className="text-sm text-gray-500">
              منها {formatReportMoney(summary.allocatedAmount)} {currency} من بنود مسير قديمة تجمع عدة سجلات بقيمة واحدة: وُزّعت على سجلاتها بنسبة الساعات × المضاعف، ومجموع كل بند يطابق قيمته المصروفة.
            </p>
          )}
          {summary.unallocatedInRunsAmount !== '0.00' && (
            <p className="text-sm text-red-600">
              {formatReportMoney(summary.unallocatedInRunsAmount)} {currency} في بنود مسير قديمة تعذر توزيعها على سجلاتها (ساعات ناقصة)؛ تظهر سجلاتها بقيمة «—» ولا تدخل قيمة المعتمد.
            </p>
          )}
          <div className="card overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-gray-50">
                <tr><Th>الموظف</Th><Th center>التاريخ</Th><Th>المصدر</Th><Th center>الحالة</Th><Th center>مكتشف</Th><Th center>مطلوب</Th><Th center>معتمد</Th><Th center>الفرق</Th><Th center>المضاعف</Th><Th center>القيمة</Th><Th>مصدر القيمة</Th><Th>المسير</Th></tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {report.rows.map((row) => (
                  <tr key={row.id} className="hover:bg-gray-50">
                    <td className="px-4 py-3">{row.fullName ?? '—'}<p className="text-xs text-gray-400">{row.employeeCode ?? ''} {row.departmentName ? `— ${row.departmentName}` : ''}</p></td>
                    <td className="px-4 py-3 text-center" dir="ltr">{row.date}</td>
                    <td className="px-4 py-3">{lookup(OVERTIME_SOURCE_LABELS, row.source)}{row.dayKind && <p className="text-xs text-gray-400">{lookup(DAY_KIND_LABELS, row.dayKind)}</p>}</td>
                    <td className="px-4 py-3 text-center">{lookup(OVERTIME_STATUS_LABELS, row.status)}</td>
                    <td className="px-4 py-3 text-center">{row.detectedMinutes ?? '—'}</td>
                    <td className="px-4 py-3 text-center">{row.requestedMinutes ?? '—'}</td>
                    <td className="px-4 py-3 text-center">{row.approvedMinutes ?? '—'}</td>
                    <td className="px-4 py-3 text-center">{row.differenceMinutes ?? '—'}</td>
                    <td className="px-4 py-3 text-center" dir="ltr">{row.multiplier ?? '—'}</td>
                    <td className="px-4 py-3 text-center font-bold" dir="ltr">{formatReportMoney(row.amount)}</td>
                    <td className="px-4 py-3">{row.amountSourceLabel}{row.issue && <p className="text-xs text-red-600">{row.issue}</p>}</td>
                    <td className="px-4 py-3 text-gray-600">{row.run ? runRefLabel(row.run) : '—'}</td>
                  </tr>
                ))}
                {report.rows.length === 0 && <EmptyRow colSpan={12} text="لا يوجد عمل إضافي في هذه الفترة" />}
              </tbody>
            </table>
          </div>
        </>
      )}
    </div>
  )
}

// ===== تبويب السلف =====
function LoansTab({ branches, departments }: { branches: ApiBranch[]; departments: ApiDepartment[] }) {
  const currency = useCurrency()
  const [status, setStatus] = useState<'open' | 'settled' | 'all'>('open')
  const [org, setOrg] = useState<OrgFilters>({ branchId: '', departmentId: '' })
  // مطابقة فترة اختيارية: شهر رواتب بضغطة أو «من تاريخ / إلى تاريخ» — فاضي = من غير مطابقة
  const payrollMonth = usePayrollMonthContext()
  const [match, setMatch] = useState<DayRange | null>(null)
  const matchRange = validDayRange(match)
  const [report, setReport] = useState<LoansReport | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const load = () => {
    setLoading(true); setError('')
    fetchPayrollLoansReport({ status, branchId: org.branchId, departmentId: org.departmentId, from: matchRange?.from, to: matchRange?.to })
      .then(setReport)
      .catch((e) => { setReport(null); setError(e instanceof Error ? e.message : 'تعذر تحميل تقرير السلف') })
      .finally(() => setLoading(false))
  }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  useEffect(load, [])
  const summary = report?.summary
  return (
    <div className="space-y-6">
      <div className="card space-y-4">
        <div className="grid grid-cols-4 gap-4 items-end">
          <div>
            <label className="label">حالة الرصيد</label>
            <select className="input" value={status} onChange={(e) => setStatus(e.target.value as typeof status)}>
              <option value="open">ذات رصيد قائم</option>
              <option value="settled">مسددة بالكامل</option>
              <option value="all">الكل</option>
            </select>
          </div>
          <OrgFilterFields value={org} onChange={setOrg} branches={branches} departments={departments} />
          <div className="flex items-center gap-2">
            <button type="button" onClick={load} disabled={loading || (!!match && !matchRange)} className="btn-primary disabled:opacity-50">عرض</button>
            <ExportButton table={report ? loansReportCsv(report) : null} file={reportFileName('loans', report?.period ?? (matchRange ? dayRangeKey(matchRange) : null))} />
          </div>
        </div>
        <div>
          <p className="text-sm text-gray-600 mb-1">مطابقة فترة (اختياري): الأقساط المستحقة فيها مقابل عمود السلف في المسيرات</p>
          <DayRangeFilter idPrefix="payroll-loans-match" value={match} onChange={setMatch} onClear={() => setMatch(null)}
            cycleStartDay={payrollMonth?.cycleStartDay} today={payrollMonth?.today} />
        </div>
      </div>
      {error && <ErrorBanner message={error} />}
      {loading ? <Spinner /> : report && summary && (
        <>
          <div className="grid grid-cols-5 gap-4">
            <Stat label={`أصل السلف (${currency})`} value={formatReportMoney(summary.principal)} />
            <Stat label="المسدد" value={formatReportMoney(summary.paid)} tone="text-success-600" />
            <Stat label="المتبقي" value={formatReportMoney(summary.remaining)} tone="text-primary-600" />
            <Stat label="متأخر السداد" value={formatReportMoney(summary.overdue)} tone="text-red-600" />
            <Stat label="سلف غير متوازنة / بقراءة متعذرة" value={`${summary.unbalanced} / ${summary.issues}`} />
          </div>
          {summary.period && (
            <div className="rounded-xl p-3 text-sm bg-gray-50 text-gray-700">
              مطابقة <span dir="ltr">{summary.period.from} → {summary.period.to}</span>: أقساط مستحقة في الفترة {formatReportMoney(summary.period.dueInPeriod)} —
              عمود السلف في المسيرات {formatReportMoney(summary.period.payrollColumnTotal)} — المحتسب في المسيرات {formatReportMoney(summary.period.allocatedInRuns)}
            </div>
          )}
          <div className="card overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-gray-50">
                <tr><Th>الموظف</Th><Th center>السلفة</Th><Th center>الأصل</Th><Th center>المسدد</Th><Th center>المتبقي</Th><Th center>القسط الحالي</Th><Th center>الاستحقاق التالي</Th><Th center>المتأخر</Th><Th center>جزئي / مؤجل</Th><Th center>الإقفال المتوقع</Th></tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {report.rows.map((row) => (
                  <tr key={row.loanId} className="hover:bg-gray-50">
                    <td className="px-4 py-3">{row.fullName}<p className="text-xs text-gray-400">{row.employeeCode} — {lookup(EMPLOYEE_STATUS_LABELS, row.employeeStatus)}</p></td>
                    <td className="px-4 py-3 text-center">#{row.loanId}<p className="text-xs text-gray-400">{lookup(LOAN_STATUS_LABELS, row.status)}</p></td>
                    <td className="px-4 py-3 text-center" dir="ltr">{formatReportMoney(row.principal)}</td>
                    <td className="px-4 py-3 text-center text-success-600" dir="ltr">{formatReportMoney(row.paid)}</td>
                    <td className="px-4 py-3 text-center font-bold" dir="ltr">{formatReportMoney(row.remaining)}</td>
                    <td className="px-4 py-3 text-center">{row.currentInstallment ? `${row.currentInstallment} من ${row.installments}` : row.issue ? '—' : `مسددة (${row.paidInstallments} من ${row.installments})`}</td>
                    <td className="px-4 py-3 text-center" dir="ltr">{row.nextDueDate ?? '—'}</td>
                    <td className="px-4 py-3 text-center">{row.overdueCount ? <span className="badge bg-red-100 text-red-700">{row.overdueCount} — {formatReportMoney(row.overdueAmount)}</span> : '—'}</td>
                    <td className="px-4 py-3 text-center">{row.partialCount || row.deferredCount ? <span className="badge badge-primary">{row.partialCount} / {row.deferredCount}</span> : '—'}</td>
                    <td className="px-4 py-3 text-center" dir="ltr">
                      {row.expectedCloseDate ?? '—'}
                      {row.issue && <p className="text-xs text-red-600" dir="rtl">{row.issue}</p>}
                      {!row.issue && !row.balanced && <p className="text-xs text-red-600" dir="rtl">المسدد + المتبقي لا يساوي الأصل</p>}
                    </td>
                  </tr>
                ))}
                {report.rows.length === 0 && <EmptyRow colSpan={10} text="لا توجد سلف مطابقة" />}
              </tbody>
            </table>
          </div>
          <div className="grid grid-cols-3 gap-6">
            <div className="card">
              <h3 className="font-bold text-gray-800 mb-3">تقادم الأقساط المتأخرة</h3>
              <table className="w-full text-sm"><tbody className="divide-y divide-gray-100">
                {report.aging.map((bucket) => (
                  <tr key={bucket.label}><td className="py-2">{bucket.label}</td><td className="py-2 text-center">{bucket.count}</td><td className="py-2 text-left" dir="ltr">{formatReportMoney(bucket.amount)}</td></tr>
                ))}
              </tbody></table>
            </div>
            <div className="card">
              <h3 className="font-bold text-gray-800 mb-3">التحصيل المتوقع حسب شهر الاستحقاق</h3>
              <table className="w-full text-sm"><tbody className="divide-y divide-gray-100">
                {report.forecast.map((row) => (
                  <tr key={row.month}><td className="py-2" dir="ltr">{row.month}</td><td className="py-2 text-left" dir="ltr">{formatReportMoney(row.amount)}</td></tr>
                ))}
                {report.forecast.length === 0 && <tr><td className="py-4 text-center text-gray-400">لا أقساط مستقبلية</td></tr>}
              </tbody></table>
            </div>
            <div className="card">
              <h3 className="font-bold text-gray-800 mb-3">أرصدة بعد ترك الخدمة</h3>
              <ul className="space-y-2 text-sm">
                {report.afterService.map((row) => (
                  <li key={row.loanId} className="flex items-center justify-between">
                    <span>{row.fullName} ({lookup(EMPLOYEE_STATUS_LABELS, row.employeeStatus)})</span>
                    <span className="font-bold text-red-600" dir="ltr">{formatReportMoney(row.remaining)}</span>
                  </li>
                ))}
                {report.afterService.length === 0 && <li className="text-gray-400">لا توجد أرصدة على منتهين</li>}
              </ul>
            </div>
          </div>
        </>
      )}
    </div>
  )
}

// ===== تبويب الفروق =====
function VarianceTab() {
  // مقارنة مسيرين بالشهر (المسير بيتحدد بشهره) — والاختيار بيوضح أيام كل شهر رواتب بالظبط
  const payrollMonth = usePayrollMonthContext()
  const [period, setPeriod] = useState('')
  const [comparePeriod, setComparePeriod] = useState('')
  const [minAmount, setMinAmount] = useState('')
  const [minPercent, setMinPercent] = useState('')
  const [includeUnchanged, setIncludeUnchanged] = useState(false)
  const [report, setReport] = useState<VarianceReport | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const load = () => {
    setLoading(true); setError('')
    fetchPayrollVarianceReport({ period, comparePeriod: comparePeriod || (period ? previousMonth(period) : ''), minAmount, minPercent, includeUnchanged })
      .then((data) => { setReport(data); if (!period && data.period) { setPeriod(data.period); setComparePeriod(data.comparePeriod ?? '') } })
      .catch((e) => { setReport(null); setError(e instanceof Error ? e.message : 'تعذر تحميل تقرير الفروق') })
      .finally(() => setLoading(false))
  }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  useEffect(load, [])
  return (
    <div className="space-y-6">
      <div className="card">
        <div className="grid grid-cols-6 gap-4 items-end">
          <PayrollPeriodSelect id="variance-period" label="شهر الرواتب الحالي" value={period} cycleStartDay={payrollMonth?.cycleStartDay} today={payrollMonth?.today}
            onChange={(value) => { setPeriod(value); if (value) setComparePeriod(previousMonth(value)) }} />
          <PayrollPeriodSelect id="variance-compare-period" label="شهر المقارنة" value={comparePeriod} cycleStartDay={payrollMonth?.cycleStartDay} today={payrollMonth?.today}
            onChange={setComparePeriod} />
          <div>
            <label className="label">أقل فرق بالمبلغ</label>
            <input type="number" min="0" className="input" dir="ltr" value={minAmount} onChange={(e) => setMinAmount(e.target.value)} />
          </div>
          <div>
            <label className="label">أقل فرق بالنسبة %</label>
            <input type="number" min="0" className="input" dir="ltr" value={minPercent} onChange={(e) => setMinPercent(e.target.value)} />
          </div>
          <label className="flex items-center gap-2 text-sm text-gray-700 pb-3">
            <input type="checkbox" checked={includeUnchanged} onChange={(e) => setIncludeUnchanged(e.target.checked)} />
            إظهار من لم يتغير
          </label>
          <div className="flex items-center gap-2">
            <button type="button" onClick={load} disabled={loading} className="btn-primary disabled:opacity-50">عرض</button>
            <ExportButton table={report ? varianceReportCsv(report) : null} file={reportFileName('variance', report?.period)} />
          </div>
        </div>
      </div>
      {error && <ErrorBanner message={error} />}
      {loading ? <Spinner /> : report && (
        !report.summary ? <div className="card text-center text-gray-400 py-10">لا توجد مسيرات معتمدة أو مصروفة للمقارنة</div> : (
        <>
          <div className="grid grid-cols-5 gap-4">
            <Stat label="موظفون في الفترتين" value={report.summary.employees} />
            <Stat label="المعروض بعد العتبة" value={report.summary.shown} />
            <Stat label="زيادة" value={report.summary.increased} tone="text-success-600" />
            <Stat label="نقص" value={report.summary.decreased} tone="text-red-600" />
            <Stat label="فروق غير مفسَّرة" value={report.summary.unexplained} tone={report.summary.unexplained ? 'text-red-600' : 'text-gray-800'} />
          </div>
          <div className="card overflow-x-auto">
            <h3 className="font-bold text-gray-800 mb-3">الإجماليات حسب البند — {report.period} مقابل {report.comparePeriod}</h3>
            <table className="w-full text-sm">
              <thead className="bg-gray-50"><tr><Th>البند</Th><Th center>{report.period}</Th><Th center>{report.comparePeriod}</Th><Th center>الفرق</Th></tr></thead>
              <tbody className="divide-y divide-gray-100">
                {report.totals.map((row) => (
                  <tr key={row.key}><td className="px-4 py-2">{row.label}</td><td className="px-4 py-2 text-center" dir="ltr">{formatReportMoney(row.current)}</td><td className="px-4 py-2 text-center" dir="ltr">{formatReportMoney(row.previous)}</td><td className="px-4 py-2 text-center font-bold" dir="ltr">{formatReportMoney(row.delta)}</td></tr>
                ))}
              </tbody>
            </table>
          </div>
          <div className="card overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-gray-50"><tr><Th>الموظف</Th><Th center>الحالي</Th><Th center>المقارن</Th><Th center>الفرق</Th><Th center>%</Th><Th>تفسير الفرق</Th></tr></thead>
              <tbody className="divide-y divide-gray-100">
                {report.rows.map((row) => (
                  <tr key={row.employeeId} className="align-top hover:bg-gray-50">
                    <td className="px-4 py-3">{row.fullName ?? '—'}<p className="text-xs text-gray-400">{row.employeeCode ?? ''}</p></td>
                    <td className="px-4 py-3 text-center" dir="ltr">{formatReportMoney(row.currentNet)}</td>
                    <td className="px-4 py-3 text-center" dir="ltr">{formatReportMoney(row.previousNet)}</td>
                    <td className={`px-4 py-3 text-center font-bold ${row.direction === 'INCREASE' ? 'text-success-600' : row.direction === 'DECREASE' ? 'text-red-600' : ''}`} dir="ltr">{formatReportMoney(row.difference)}</td>
                    <td className="px-4 py-3 text-center" dir="ltr">{row.percent === null ? '—' : `${row.percent}%`}</td>
                    <td className="px-4 py-3 text-xs text-gray-600">
                      {row.causes.map((cause) => <span key={cause.code} className={`badge ${cause.code === 'UNEXPLAINED' ? 'bg-red-100 text-red-700' : 'badge-primary'} ml-1`}>{cause.label}</span>)}
                      {row.components.map((component) => <p key={component.key} className="mt-1">{component.label}: <span dir="ltr">{formatReportMoney(component.effect)}</span></p>)}
                      {row.unexplained && <p className="mt-1 text-red-600">متبقٍ غير مفسَّر: <span dir="ltr">{formatReportMoney(row.residual)}</span></p>}
                    </td>
                  </tr>
                ))}
                {report.rows.length === 0 && <EmptyRow colSpan={6} text="لا توجد فروق تتجاوز العتبة" />}
              </tbody>
            </table>
          </div>
          {report.unexplained.length > 0 && (
            <div className="card border border-red-200">
              <h3 className="font-bold text-red-700 mb-3">فروق غير مفسَّرة تحتاج مراجعة</h3>
              <ul className="space-y-1 text-sm">
                {report.unexplained.map((row) => <li key={row.employeeId}>{row.fullName} ({row.employeeCode}): متبقٍ <span dir="ltr">{formatReportMoney(row.residual)}</span></li>)}
              </ul>
            </div>
          )}
        </>
        )
      )}
    </div>
  )
}

export default function PayrollReportsPage() {
  // تبسيط الرواتب (2026-09-15): تبويب المسيرات وحده، وأي ?tab في الرابط يفتح المسيرات.
  // الوصف تحت العنوان كان يعدّد التبويبات المخفية فأُخفي معها.
  const [tab, setTab] = useState<Tab>('runs')
  // التقارير المالية للشهر (كشف الرواتب، التكلفة، الخصومات، السلف، الإضافي، مراكز التكلفة) محتاجة صلاحية التقارير كمان
  const [canReports, setCanReports] = useState(false)
  useEffect(() => { setCanReports(can('reports.view')) }, [])

  return (
    <MainLayout>
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-gray-800">تقرير الرواتب</h1>
          </div>
          <button type="button" onClick={() => window.print()} className="btn-secondary flex items-center gap-2">
            <Printer size={18} />
            طباعة
          </button>
        </div>

        {canReports && <FinancialReportLinks title="التقارير المالية للشهر" />}

        <div className="card p-2">
          <div className="flex flex-wrap items-center gap-2">
            {TABS.map((item) => {
              const Icon = item.icon
              return (
                <button
                  key={item.id}
                  type="button"
                  onClick={() => setTab(item.id)}
                  className={`flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-medium transition-colors ${tab === item.id ? 'bg-primary-500 text-white' : 'text-gray-600 hover:bg-gray-100'}`}
                >
                  <Icon size={16} />
                  {item.label}
                </button>
              )
            })}
          </div>
        </div>

        {tab === 'runs' && <RunsTab />}
      </div>
    </MainLayout>
  )
}
