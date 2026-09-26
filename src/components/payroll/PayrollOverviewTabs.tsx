'use client'

// تبويبات شاشة المسير بعد «المسيرات»: كل الموظفين والمسير (الجدول الموحد)، المدرجين بالمسير، موظفين ليس لديهم مسير،
// التضارب، الاستقطاعات («شيل خصم»). كل تبويب بشهر واحد، والنطاق (فرع الحساب) والفلترة مفروضين في الباك.
// طلب المالك (20 سبتمبر): فلاتر واحدة للتبويبات الثلاثة الأولى، وجدول موحد بعمود «المسير» ونقل جماعي بنافذة واحدة.

import { useEffect, useMemo, useState } from 'react'
import { AlertTriangle, ArrowLeftRight, Ban, Calendar, CheckCircle, Plus, Search, X } from 'lucide-react'
import { can, getCurrentUser, lockedBranchIdOf, type ApiBranch, type ApiDepartment, type ApiEmployee, type ApiTeam } from '@/lib/api'
import { branchScopeOfUser } from '@/lib/branch-scope'
import EmptyState from '@/components/EmptyState'
import { PayrollMonthLinesTable } from '@/components/payroll/PayrollMonthLinesTable'
import { PayrollEmployeeFilters, payrollReasonLabel } from '@/components/payroll/PayrollEmployeeFilters'
import { PayrollMoveToRunModal, type PayrollMoveCandidate } from '@/components/payroll/PayrollMoveToRunModal'
import { OrgTargetPicker, describeOrgTarget, initialOrgTarget, resolveOrgTarget, type OrgTarget } from '@/components/OrgTargetPicker'
import { usePayrollDayRange } from '@/components/DayRangeFilter'
import { dayRangeLabel, payrollMonthBounds } from '@/lib/payroll-month-range'
import {
  cancelDeductionWaiver, createDeductionWaiver, DEDUCTION_KIND_LABELS, DEDUCTION_KINDS, emptyPayrollOverviewFilters, fetchDeductionWaivers,
  fetchPayrollConflicts, fetchPayrollIncluded, fetchPayrollRoster, fetchPayrollWithoutRun,
  PAYROLL_EMPLOYMENT_STATUS_LABELS, PAYROLL_MEMBERSHIP_VIEW_LABELS,
  type DeductionKind, type DeductionWaiverCreated, type DeductionWaiverRow, type OverviewConflicts,
  type OverviewIncluded, type OverviewRoster, type OverviewUnassigned, type PayrollMembershipView, type PayrollOverviewFilterState,
} from '@/lib/payroll-overview-api'

export type PayrollOverviewTab = 'roster' | 'included' | 'unassigned' | 'conflicts' | 'deductions'
/** التبويبات اللي بتستعمل الفلاتر المشتركة (بحث وفرع وقسم وفريق ومسمى وحالة وتاريخ تعيين). */
export const PAYROLL_FILTERED_TABS: PayrollOverviewTab[] = ['roster', 'included', 'unassigned']

const RUN_STATUS: Record<string, string> = { DRAFT: 'مسودة', CALCULATED: 'محسوب', IN_REVIEW: 'قيد المراجعة', APPROVED: 'معتمد', PAID: 'مصروف', CANCELLED: 'ملغى' }
const runLabel = (id: number, name: string | null) => name ? `${name} (#${id})` : `مسير #${id}`
const errorText = (e: unknown, fallback: string) => (e instanceof Error && e.message ? e.message : fallback)

function useMonthData<T>(period: string, load: (period: string) => Promise<T>, version = 0) {
  const [data, setData] = useState<T | null>(null)
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  useEffect(() => {
    if (!/^\d{4}-\d{2}$/.test(period)) return
    let cancelled = false
    setLoading(true)
    setError('')
    load(period)
      .then(result => { if (!cancelled) setData(result) })
      .catch(e => { if (!cancelled) { setData(null); setError(errorText(e, 'تعذر التحميل')) } })
      .finally(() => { if (!cancelled) setLoading(false) })
    return () => { cancelled = true }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [period, version])
  return { data, error, loading }
}

/**
 * نفس useMonthData بس بالفلاتر: الفلترة في الخادم، والكتابة في خانة البحث ما تفضلش تنده كل حرف (تأخير بسيط).
 * الجدول بيفضل ظاهر أثناء إعادة التحميل عشان الفلتر ما يرمشش.
 */
function useFilteredMonthData<T>(period: string, filters: PayrollOverviewFilterState, load: (period: string, filters: PayrollOverviewFilterState) => Promise<T>, version = 0) {
  const [data, setData] = useState<T | null>(null)
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  const key = JSON.stringify(filters)
  useEffect(() => {
    if (!/^\d{4}-\d{2}$/.test(period)) return
    let cancelled = false
    setLoading(true)
    const timer = setTimeout(() => {
      setError('')
      load(period, JSON.parse(key) as PayrollOverviewFilterState)
        .then(result => { if (!cancelled) setData(result) })
        .catch(e => { if (!cancelled) { setData(null); setError(errorText(e, 'تعذر التحميل')) } })
        .finally(() => { if (!cancelled) setLoading(false) })
    }, 250)
    return () => { cancelled = true; clearTimeout(timer) }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [period, key, version])
  return { data, error, loading }
}

function StatusBadge({ status }: { status: string | null }) {
  const tone = status === 'PAID' || status === 'APPROVED' ? 'bg-success-50 text-success-700' : status === 'DRAFT' ? 'bg-gray-100 text-gray-600' : 'bg-warning-50 text-warning-700'
  return <span className={`px-2 py-0.5 rounded-full text-xs ${tone}`}>{status ? RUN_STATUS[status] ?? status : '—'}</span>
}

function Loading() {
  return <div className="flex justify-center py-12"><div className="w-7 h-7 border-2 border-primary-500 border-t-transparent rounded-full animate-spin" /></div>
}

export function PayrollOverviewTabs({ tab, branches, departments, teams, employees, onOpenRun }: {
  tab: PayrollOverviewTab
  branches: ApiBranch[]
  departments: ApiDepartment[]
  teams: ApiTeam[]
  employees: ApiEmployee[]
  onOpenRun: (runId: number) => void
}) {
  // فاضي لحد ما نعرف شهر الرواتب الجاري (useMonthData مش بيحمّل غير YYYY-MM صحيح) — بدل تحميل مزدوج
  const [period, setPeriod] = useState('')
  // المسير فترة: الافتراضي شهر الرواتب الجاري (بدورة 23 يوم 25 سبتمبر = رواتب أكتوبر)، ونعرض حدوده الدقيقة
  const payrollMonth = usePayrollDayRange().context
  const [periodTouched, setPeriodTouched] = useState(false)
  useEffect(() => { if (payrollMonth && !periodTouched) setPeriod(payrollMonth.period) }, [payrollMonth, periodTouched])
  const periodRange = payrollMonth && /^\d{4}-(0[1-9]|1[0-2])$/.test(period) ? payrollMonthBounds(period, payrollMonth.cycleStartDay) : null
  const [query, setQuery] = useState('')
  const matches = (row: { fullName: string; employeeCode: string }) =>
    !query.trim() || row.fullName.includes(query.trim()) || row.employeeCode.toLowerCase().includes(query.trim().toLowerCase())
  // فلاتر مشتركة بين «الكل / المدرجين / بلا مسير» — بتفضل زي ما هي لما تبدّل بينهم ولما تغيّر الشهر
  const [filters, setFilters] = useState<PayrollOverviewFilterState>(emptyPayrollOverviewFilters)
  const filterProps = { branches, departments, teams, cycleStartDay: payrollMonth?.cycleStartDay ?? null, today: payrollMonth?.to ?? null }

  return (
    <div className="space-y-4" data-payroll-overview-tab={tab}>
      <div className="card flex flex-wrap items-end gap-4">
        <label className="flex flex-col gap-1 text-sm">
          <span className="font-medium text-gray-700 flex items-center gap-1.5"><Calendar size={15} className="text-gray-400" /> شهر الرواتب</span>
          <input type="month" className="input w-48" dir="ltr" value={period} onChange={e => { setPeriodTouched(true); setPeriod(e.target.value) }} />
          {periodRange && <span className="text-xs text-gray-500" data-payroll-period-range>{dayRangeLabel(periodRange)}</span>}
        </label>
        {!PAYROLL_FILTERED_TABS.includes(tab) && (
          <div className="relative flex-1 min-w-[220px]">
            <Search size={16} className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400" />
            <input type="text" className="input w-full pr-9" placeholder="دوّر بالاسم أو الكود..." value={query} onChange={e => setQuery(e.target.value)} />
          </div>
        )}
      </div>
      {tab === 'roster' && <RosterTab period={period} filters={filters} onFilters={setFilters} onOpenRun={onOpenRun} {...filterProps} />}
      {tab === 'included' && <IncludedTab period={period} filters={filters} onFilters={setFilters} onOpenRun={onOpenRun} {...filterProps} />}
      {tab === 'unassigned' && <UnassignedTab period={period} filters={filters} onFilters={setFilters} onOpenRun={onOpenRun} {...filterProps} />}
      {tab === 'conflicts' && <ConflictsTab period={period} matches={matches} onOpenRun={onOpenRun} />}
      {tab === 'deductions' && <DeductionsTab period={period} matches={matches} onOpenRun={onOpenRun}
        branches={branches} departments={departments} teams={teams} employees={employees} />}
    </div>
  )
}

type Matches = (row: { fullName: string; employeeCode: string }) => boolean
interface FilteredTabProps {
  period: string
  filters: PayrollOverviewFilterState
  onFilters: (next: PayrollOverviewFilterState) => void
  onOpenRun: (id: number) => void
  branches: ApiBranch[]
  departments: ApiDepartment[]
  teams: ApiTeam[]
  cycleStartDay: number | null
  today: string | null
}
const statusText = (status: string | null | undefined) => status ? PAYROLL_EMPLOYMENT_STATUS_LABELS[status] ?? status : '—'

function IncludedTab({ period, filters, onFilters, onOpenRun, branches, departments, teams, cycleStartDay, today }: FilteredTabProps) {
  // التبويب ده كله «مدرجين»، فمنظور الجدول الموحد ما ينطبقش عليه (الفلاتر مشتركة بينهم)
  const { data, error, loading } = useFilteredMonthData<OverviewIncluded>(period, { ...filters, membership: 'all' }, fetchPayrollIncluded)
  const rows = data?.rows ?? []
  return (
    <div className="space-y-4">
      <PayrollEmployeeFilters value={filters} onChange={onFilters} branches={branches} departments={departments} teams={teams}
        jobTitles={data?.jobTitleOptions ?? []} runs={data?.runOptions ?? []} cycleStartDay={cycleStartDay} today={today}
        shownCount={rows.length} totalCount={data?.total ?? 0} idPrefix="payroll-included" />
      {error && <div className="card text-danger-600 text-sm">{error}</div>}
      {loading && !data ? <Loading /> : (
        <div className="card p-0 overflow-hidden">
          <div className="p-4 border-b border-gray-100 text-sm text-gray-600">
            {data ? <>في <b>{data.employees}</b> موظف مدرجين في <b>{data.runs}</b> مسير للشهر ده. المسودة اللي لسه ما اتحسبتش مش بتظهر هنا.</> : null}
          </div>
          {rows.length === 0 ? <EmptyState title="مفيش موظفين مدرجين بالفلاتر دي" className="shadow-none" /> : (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead><tr className="table-header">
                  <th className="table-cell text-right">الموظف</th><th className="table-cell text-right">الفرع</th><th className="table-cell text-right">القسم</th>
                  <th className="table-cell text-right">الفريق</th><th className="table-cell text-right">المسمى الوظيفي</th><th className="table-cell text-center">الحالة الوظيفية</th>
                  <th className="table-cell text-center">تاريخ التعيين</th>
                  <th className="table-cell text-right">المسير</th><th className="table-cell text-center">حالة المسير</th><th className="table-cell text-center">الفترة</th>
                </tr></thead>
                <tbody>
                  {rows.map(row => (
                    <tr key={`${row.runId}:${row.employeeId}`} className="table-row">
                      <td className="table-cell"><div className="font-medium text-gray-800">{row.fullName}</div><div className="text-xs text-gray-400">{row.employeeCode}</div></td>
                      <td className="table-cell">{row.branchName ?? '—'}</td>
                      <td className="table-cell">{row.departmentName ?? '—'}</td>
                      <td className="table-cell">{row.teamName ?? '—'}</td>
                      <td className="table-cell">{row.jobTitle ?? '—'}</td>
                      <td className="table-cell text-center text-xs">{statusText(row.employmentStatus)}</td>
                      <td className="table-cell text-center text-xs text-gray-500" dir="ltr">{row.hireDate ?? '—'}</td>
                      <td className="table-cell"><button type="button" className="text-primary-600 hover:underline" onClick={() => onOpenRun(row.runId)}>{runLabel(row.runId, row.runName)}</button></td>
                      <td className="table-cell text-center"><StatusBadge status={row.runStatus} /></td>
                      <td className="table-cell text-center text-xs text-gray-500" dir="ltr">{row.startDate} → {row.endDate}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}
    </div>
  )
}

/**
 * قرار المالك (20 سبتمبر): جدول واحد لكل موظفي الشهر بعمود «المسير» ومنظور «الكل / المدرجين في مسير / بلا مسير»،
 * مع اختيار متعدد و«نقل لمسير…» بنافذة واحدة بتتعامل مع الخليط (اللي في مسير يتنقل، واللي بلاه يتضاف) ونتيجة لكل موظف.
 */
function RosterTab({ period, filters, onFilters, onOpenRun, branches, departments, teams, cycleStartDay, today }: FilteredTabProps) {
  const [version, setVersion] = useState(0)
  const { data, error, loading } = useFilteredMonthData<OverviewRoster>(period, filters, fetchPayrollRoster, version)
  const [picked, setPicked] = useState<number[]>([])
  const [moving, setMoving] = useState<PayrollMoveCandidate[] | null>(null)
  const canMove = can('payroll.calculate')
  useEffect(() => { setPicked([]) }, [period])

  const rows = data?.rows ?? []
  const pickedSet = new Set(picked)
  const allPicked = rows.length > 0 && rows.every(row => pickedSet.has(row.employeeId))
  const toggle = (employeeId: number) => setPicked(previous => previous.includes(employeeId) ? previous.filter(id => id !== employeeId) : [...previous, employeeId])
  const candidates = (ids: number[]): PayrollMoveCandidate[] => rows.filter(row => ids.includes(row.employeeId))
    .map(row => ({ employeeId: row.employeeId, fullName: row.fullName, employeeCode: row.employeeCode, runId: row.runId, runName: row.runName }))
  const view = (next: PayrollMembershipView) => onFilters({ ...filters, membership: next })

  return (
    <div className="space-y-4">
      {/* المنظور: نفس الجدول بعمود «المسير» — مش لازم تبدّل تبويبات عشان تشوف الكل */}
      <div className="flex flex-wrap items-center gap-1 bg-gray-100 rounded-xl p-1 w-fit" role="tablist" data-roster-view>
        {(Object.keys(PAYROLL_MEMBERSHIP_VIEW_LABELS) as PayrollMembershipView[]).map(value => (
          <button key={value} type="button" role="tab" aria-selected={filters.membership === value} data-roster-view-option={value}
            onClick={() => view(value)}
            className={`px-4 py-1.5 rounded-lg text-sm font-medium ${filters.membership === value ? 'bg-white text-primary-600 shadow-sm' : 'text-gray-600'}`}>
            {PAYROLL_MEMBERSHIP_VIEW_LABELS[value]}
            {data && <span className="text-xs text-gray-400 mr-1">({data.counts[value]})</span>}
          </button>
        ))}
      </div>

      <PayrollEmployeeFilters value={filters} onChange={onFilters} branches={branches} departments={departments} teams={teams}
        jobTitles={data?.jobTitleOptions ?? []} runs={data?.runOptions ?? []} reasons={data?.reasonOptions ?? []}
        cycleStartDay={cycleStartDay} today={today} shownCount={rows.length} totalCount={data?.total ?? 0} idPrefix="payroll-roster" />

      {canMove && (
        <div className="card flex flex-wrap items-center justify-between gap-3" data-roster-actions>
          <span className="text-sm text-gray-700">مختار <b data-picked-count>{picked.length}</b> موظف من {rows.length} ظاهرين</span>
          <div className="flex flex-wrap items-center gap-2">
            <button type="button" className="btn-secondary text-xs px-2 py-1 disabled:opacity-50" disabled={!picked.length} onClick={() => setPicked([])}>ألغِ الاختيار</button>
            <button type="button" className="btn-primary flex items-center gap-2 text-sm disabled:opacity-50" data-roster-move
              disabled={!picked.length} onClick={() => setMoving(candidates(picked))}>
              <ArrowLeftRight size={16} />
              {/* كلهم بلا مسير = «أضف لمسير…»، وإلا «نقل لمسير…» (النافذة بتتعامل مع الخليط في نداء واحد) */}
              {picked.every(id => rows.find(row => row.employeeId === id)?.runId == null)
                ? `أضف ${picked.length} لمسير…` : `نقل ${picked.length} لمسير…`}
            </button>
          </div>
        </div>
      )}

      {error && <div className="card text-danger-600 text-sm">{error}</div>}
      {loading && !data ? <Loading /> : (
        <div className="card p-0 overflow-hidden">
          {data && <div className="p-4 border-b border-gray-100 text-sm text-gray-600">
            الفترة من {data.startDate} إلى {data.endDate} — <b>{data.counts.all}</b> موظف في الشهر ده: {data.counts.assigned} في مسير و{data.counts.unassigned} بلا مسير.
          </div>}
          {rows.length === 0 ? <EmptyState title="مفيش موظفين بالفلاتر دي" icon={CheckCircle} className="shadow-none" /> : (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead><tr className="table-header">
                  {canMove && <th className="table-cell text-center w-10">
                    <input type="checkbox" aria-label="اختيار الكل" data-pick-all checked={allPicked}
                      onChange={() => setPicked(allPicked ? [] : rows.map(row => row.employeeId))} />
                  </th>}
                  <th className="table-cell text-right">الموظف</th><th className="table-cell text-right">الفرع</th><th className="table-cell text-right">القسم</th>
                  <th className="table-cell text-right">الفريق</th><th className="table-cell text-right">المسمى الوظيفي</th><th className="table-cell text-center">الحالة الوظيفية</th>
                  <th className="table-cell text-center">تاريخ التعيين</th><th className="table-cell text-right">المسير</th>
                  {canMove && <th className="table-cell text-center">إجراء</th>}
                </tr></thead>
                <tbody>
                  {rows.map(row => (
                    <tr key={row.employeeId} className="table-row">
                      {canMove && <td className="table-cell text-center">
                        <input type="checkbox" aria-label={`اختار ${row.fullName}`} data-pick-employee={row.employeeId}
                          checked={pickedSet.has(row.employeeId)} onChange={() => toggle(row.employeeId)} />
                      </td>}
                      <td className="table-cell"><div className="font-medium text-gray-800">{row.fullName}</div><div className="text-xs text-gray-400">{row.employeeCode}</div></td>
                      <td className="table-cell">{row.branchName ?? '—'}</td>
                      <td className="table-cell">{row.departmentName ?? '—'}</td>
                      <td className="table-cell">{row.teamName ?? '—'}</td>
                      <td className="table-cell">{row.jobTitle ?? '—'}</td>
                      <td className="table-cell text-center text-xs">{statusText(row.employmentStatus)}</td>
                      <td className="table-cell text-center text-xs text-gray-500" dir="ltr">{row.hireDate ?? '—'}</td>
                      <td className="table-cell">
                        {row.runId == null ? (
                          <><span className="text-amber-700 text-sm">بلا مسير</span>
                            {row.reasonCode && <div className="text-xs text-gray-400">{payrollReasonLabel(row.reasonCode)}</div>}</>
                        ) : (
                          <><button type="button" className="text-primary-600 hover:underline" onClick={() => onOpenRun(row.runId!)}>{runLabel(row.runId, row.runName)}</button>
                            {' '}<StatusBadge status={row.runStatus} />
                            {row.runCount > 1 && <div className="text-xs text-danger-600">و{row.runCount - 1} مسير كمان (شوف «التضارب»)</div>}</>
                        )}
                      </td>
                      {canMove && <td className="table-cell text-center">
                        <button type="button" className="btn-secondary text-xs px-2 py-1" data-move-employee={row.employeeId}
                          onClick={() => setMoving(candidates([row.employeeId]))}>
                          {row.runId == null ? 'أضف لمسير…' : 'نقل لمسير…'}
                        </button>
                      </td>}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {moving && (
        <PayrollMoveToRunModal employees={moving} period={period} cycleStartDay={cycleStartDay} today={today}
          onClose={() => setMoving(null)}
          onDone={() => { setPicked([]); setVersion(v => v + 1) }} />
      )}
    </div>
  )
}

/**
 * قرار المالك (20 سبتمبر): من هنا تختار موظف أو أكتر و«أضفهم لمسير…» — بيبقوا أعضاء دائمين في المسير ده من الشهر ده ورايح،
 * ومسير الشهر الجديد بينسخ القائمة زي ما هي. التبويب بيفضى منهم بعد الإضافة (وبعد حساب المسودة لو المسير لسه مسودة).
 */
function UnassignedTab({ period, filters, onFilters, onOpenRun, branches, departments, teams, cycleStartDay, today }: FilteredTabProps) {
  const [version, setVersion] = useState(0)
  // التبويب ده كله «بلا مسير»، فمنظور الجدول الموحد ما ينطبقش عليه (الفلاتر مشتركة بينهم)
  const { data, error, loading } = useFilteredMonthData<OverviewUnassigned>(period, { ...filters, membership: 'all' }, fetchPayrollWithoutRun, version)
  const [picked, setPicked] = useState<number[]>([])
  const [moving, setMoving] = useState<PayrollMoveCandidate[] | null>(null)
  const canAdd = can('payroll.calculate')
  useEffect(() => { setPicked([]) }, [period])

  const rows = data?.rows ?? []
  const drafts = (data?.openRuns ?? []).filter(run => run.status === 'DRAFT' || run.status === 'CALCULATED')
  const pickedSet = new Set(picked)
  const toggle = (employeeId: number) => setPicked(previous => previous.includes(employeeId) ? previous.filter(id => id !== employeeId) : [...previous, employeeId])
  const allPicked = rows.length > 0 && rows.every(row => pickedSet.has(row.employeeId))
  const candidates = (ids: number[]): PayrollMoveCandidate[] => rows.filter(row => ids.includes(row.employeeId))
    .map(row => ({ employeeId: row.employeeId, fullName: row.fullName, employeeCode: row.employeeCode, runId: null, runName: null }))

  return (
    <div className="space-y-4">
      <PayrollEmployeeFilters value={filters} onChange={onFilters} branches={branches} departments={departments} teams={teams}
        jobTitles={data?.jobTitleOptions ?? []} reasons={data?.reasonOptions ?? []} cycleStartDay={cycleStartDay} today={today}
        shownCount={rows.length} totalCount={data?.total ?? 0} idPrefix="payroll-unassigned" />
      {error && <div className="card text-danger-600 text-sm">{error}</div>}
      {loading && !data ? <Loading /> : (
        <div className="card p-0 overflow-hidden">
          <div className="p-4 border-b border-gray-100 text-sm text-gray-600 space-y-3">
            {data && <p>الفترة من {data.startDate} إلى {data.endDate} — <b>{data.total}</b> موظف شغالين ومالهمش مسير، ظاهر منهم <b>{rows.length}</b> بالفلاتر.</p>}
            {canAdd && (drafts.length ? (
              <div className="flex flex-wrap items-center gap-3" data-payroll-add-to-run>
                <span>مختار <b data-picked-count>{picked.length}</b> موظف</span>
                <button type="button" className="btn-primary flex items-center gap-2 text-sm disabled:opacity-50" data-unassigned-move
                  disabled={!picked.length} onClick={() => setMoving(candidates(picked))}>
                  <Plus size={16} /> أضف {picked.length || ''} لمسير…
                </button>
                {picked.length > 0 && <button type="button" className="btn-secondary text-xs px-2 py-1" onClick={() => setPicked([])}>ألغِ الاختيار</button>}
              </div>
            ) : <p className="text-gray-500">مفيش مسير مفتوح للشهر ده — اعمل «مسير جديد» من تبويب المسيرات.</p>)}
            {!canAdd && drafts.length > 0 && (
              <p className="flex flex-wrap items-center gap-2"><span>افتح مسير الشهر لمراجعته —</span>
                {drafts.map(run => <button key={run.id} type="button" className="btn-secondary text-xs px-2 py-1 flex items-center gap-1" onClick={() => onOpenRun(run.id)}>
                  {runLabel(run.id, run.name)} <StatusBadge status={run.status} /></button>)}
              </p>
            )}
          </div>
          {rows.length === 0 ? <EmptyState title="مفيش موظفين بلا مسير بالفلاتر دي" icon={CheckCircle} className="shadow-none" /> : (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead><tr className="table-header">
                  {canAdd && <th className="table-cell text-center w-10">
                    <input type="checkbox" aria-label="اختيار الكل" data-pick-all checked={allPicked}
                      onChange={() => setPicked(allPicked ? [] : rows.map(row => row.employeeId))} />
                  </th>}
                  <th className="table-cell text-right">الموظف</th><th className="table-cell text-center">تاريخ التعيين</th>
                  <th className="table-cell text-right">الفرع</th><th className="table-cell text-right">القسم</th><th className="table-cell text-right">الفريق</th>
                  <th className="table-cell text-right">المسمى الوظيفي</th><th className="table-cell text-center">الحالة الوظيفية</th>
                  <th className="table-cell text-right">السبب</th>
                  {canAdd && <th className="table-cell text-center">إجراء</th>}
                </tr></thead>
                <tbody>
                  {rows.map(row => (
                    <tr key={row.employeeId} className="table-row">
                      {canAdd && <td className="table-cell text-center">
                        <input type="checkbox" aria-label={`اختار ${row.fullName}`} data-pick-employee={row.employeeId}
                          checked={pickedSet.has(row.employeeId)} onChange={() => toggle(row.employeeId)} />
                      </td>}
                      <td className="table-cell"><div className="font-medium text-gray-800">{row.fullName}</div><div className="text-xs text-gray-400">{row.employeeCode}</div></td>
                      <td className="table-cell text-center" dir="ltr">{row.hireDate ?? '—'}</td>
                      <td className="table-cell">{row.branchName ?? '—'}</td>
                      <td className="table-cell">{row.departmentName ?? '—'}</td>
                      <td className="table-cell">{row.teamName ?? '—'}</td>
                      <td className="table-cell">{row.jobTitle ?? '—'}</td>
                      <td className="table-cell text-center text-xs">{statusText(row.employmentStatus)}</td>
                      <td className="table-cell text-sm text-gray-600">{row.reasonText}</td>
                      {canAdd && <td className="table-cell text-center">
                        <button type="button" className="btn-secondary text-xs px-2 py-1" data-move-employee={row.employeeId}
                          onClick={() => setMoving(candidates([row.employeeId]))}>أضف لمسير…</button>
                      </td>}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}
      {moving && (
        <PayrollMoveToRunModal employees={moving} period={period} cycleStartDay={cycleStartDay} today={today}
          onClose={() => setMoving(null)} onDone={() => { setPicked([]); setVersion(v => v + 1) }} />
      )}
    </div>
  )
}

function ConflictsTab({ period, matches, onOpenRun }: { period: string; matches: Matches; onOpenRun: (id: number) => void }) {
  const { data, error, loading } = useMonthData<OverviewConflicts>(period, fetchPayrollConflicts)
  if (loading) return <Loading />
  if (error) return <div className="card text-danger-600 text-sm">{error}</div>
  const rows = (data?.rows ?? []).filter(matches)
  const kindText = (row: OverviewConflicts['rows'][number]) =>
    row.kind === 'EXACT' ? 'نفس الفترة' : row.kind === 'OVERLAP' ? `فترات متداخلة (${row.overlapDays} يوم)` : 'نفس الشهر'
  return (
    <div className="card p-0 overflow-hidden">
      <div className="p-4 border-b border-gray-100 text-sm text-gray-600">
        موظفين داخلين في أكتر من مسير غير ملغى لنفس الشهر أو لفترات متداخلة. «يمنع الاعتماد» معناه إن المسير التاني معتمد أو مصروف أو حاجز الفترة.
      </div>
      {rows.length === 0 ? <EmptyState title="مفيش تضارب في الشهر ده" icon={CheckCircle} className="shadow-none" /> : (
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead><tr className="table-header">
              <th className="table-cell text-right">الموظف</th><th className="table-cell text-right">الفرع / القسم</th>
              <th className="table-cell text-right">المسير</th><th className="table-cell text-right">المسير التاني</th>
              <th className="table-cell text-center">نوع التضارب</th><th className="table-cell text-center">الأثر</th>
            </tr></thead>
            <tbody>
              {rows.map(row => (
                <tr key={`${row.employeeId}:${row.runId}:${row.otherRunId}`} className="table-row">
                  <td className="table-cell"><div className="font-medium text-gray-800">{row.fullName}</div><div className="text-xs text-gray-400">{row.employeeCode}</div></td>
                  <td className="table-cell text-sm">{row.branchName ?? '—'}{row.departmentName ? ` / ${row.departmentName}` : ''}</td>
                  <td className="table-cell"><button type="button" className="text-primary-600 hover:underline" onClick={() => onOpenRun(row.runId)}>{runLabel(row.runId, row.runName)}</button> <StatusBadge status={row.runStatus} /></td>
                  <td className="table-cell">
                    <button type="button" className="text-primary-600 hover:underline" onClick={() => onOpenRun(row.otherRunId)}>{runLabel(row.otherRunId, row.otherName)}</button> <StatusBadge status={row.otherStatus} />
                    <div className="text-xs text-gray-400" dir="ltr">{row.otherStartDate} → {row.otherEndDate}</div>
                  </td>
                  <td className="table-cell text-center text-sm">{kindText(row)}</td>
                  <td className="table-cell text-center">
                    {row.blocking
                      ? <span className="inline-flex items-center gap-1 text-xs text-danger-600"><AlertTriangle size={13} /> يمنع الاعتماد</span>
                      : <span className="text-xs text-warning-700">راجعه قبل الاعتماد</span>}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}

function DeductionsTab({ period, matches, onOpenRun, branches, departments, teams, employees }: {
  period: string; matches: Matches; onOpenRun: (id: number) => void
  branches: ApiBranch[]; departments: ApiDepartment[]; teams: ApiTeam[]; employees: ApiEmployee[]
}) {
  const [version, setVersion] = useState(0)
  const waivers = useMonthData<DeductionWaiverRow[]>(period, fetchDeductionWaivers, version)
  const [showForm, setShowForm] = useState(false)
  const [saved, setSaved] = useState<DeductionWaiverCreated | null>(null)
  const [cancelError, setCancelError] = useState('')
  const canWaive = can('payroll.calculate')
  useEffect(() => { setSaved(null); setShowForm(false) }, [period])

  const cancel = async (row: DeductionWaiverRow) => {
    if (!window.confirm(`إلغاء شيل «${row.kindLabel}» عن ${row.targetText}؟ المسيرات المفتوحة هترجع تخصمه بعد إعادة الحساب.`)) return
    setCancelError('')
    try {
      await cancelDeductionWaiver(row.id)
      setVersion(v => v + 1)
    } catch (e) {
      setCancelError(errorText(e, 'تعذر إلغاء القاعدة'))
    }
  }

  return (
    <div className="space-y-4">
      {/* شيل خصم */}
      <div className="card space-y-3">
        <div className="flex items-center justify-between gap-3 flex-wrap">
          <div>
            <h3 className="font-bold text-gray-800">شيل خصم</h3>
            <p className="text-xs text-gray-500">بيتطبق على مسيرات الشهر المسودة أو المحسوبة لما تتحسب تاني؛ المعتمد والمصروف ما بيتغيرش.</p>
          </div>
          {canWaive && !showForm && (
            <button type="button" className="btn-primary flex items-center gap-2 text-sm" onClick={() => { setSaved(null); setShowForm(true) }}>
              <Ban size={16} /> شيل خصم
            </button>
          )}
        </div>
        {showForm && (
          <WaiverForm period={period} branches={branches} departments={departments} teams={teams} employees={employees}
            onClose={() => setShowForm(false)} onSaved={result => { setSaved(result); setShowForm(false); setVersion(v => v + 1) }} />
        )}
        {saved && (
          <div className="p-3 rounded-xl bg-success-50 text-success-700 text-sm space-y-1">
            <p className="font-medium">اتحفظ.</p>
            {saved.recalculateRuns.length ? (
              <p className="flex flex-wrap items-center gap-2">أعد حساب:
                {saved.recalculateRuns.map(run => (
                  <button key={run.id} type="button" className="underline" onClick={() => onOpenRun(run.id)}>{runLabel(run.id, run.name)}</button>
                ))}
              </p>
            ) : <p>مفيش مسير مفتوح للشهر ده دلوقتي — هيتطبق أول ما يتحسب.</p>}
            {saved.lockedRuns.length > 0 && <p className="text-gray-600">مش هيأثر في: {saved.lockedRuns.map(run => `${runLabel(run.id, run.name)} (${RUN_STATUS[run.status] ?? run.status})`).join('، ')}</p>}
          </div>
        )}
        {cancelError && <p className="text-sm text-danger-600">{cancelError}</p>}
        {waivers.error ? <p className="text-sm text-danger-600">{waivers.error}</p> : (waivers.data ?? []).length === 0 ? (
          <p className="text-sm text-gray-400">مفيش خصومات متشالة في الشهر ده</p>
        ) : (
          <div className="divide-y divide-gray-100 border border-gray-100 rounded-xl">
            {(waivers.data ?? []).map(row => (
              <div key={row.id} className="p-3 flex items-start justify-between gap-3">
                <div className="text-sm">
                  <p className="font-medium text-gray-800">{row.kindLabel} — {row.targetText}</p>
                  <p className="text-gray-500">{row.reason}</p>
                  <p className="text-xs text-gray-400">{row.createdByName ?? ''}{row.createdAt ? ` · ${String(row.createdAt).slice(0, 10)}` : ''}</p>
                </div>
                {canWaive && row.canCancel && (
                  <button type="button" className="btn-secondary text-xs px-2 py-1 flex items-center gap-1" onClick={() => cancel(row)}>
                    <X size={13} /> إلغاء
                  </button>
                )}
              </div>
            ))}
          </div>
        )}
      </div>

      {/* طلب المالك 19 سبتمبر: كل بند استقطاع لكل موظف عمود باسمه (التأخير، الانصراف المبكر، النقص، الغياب، الإجازة، الإيقاف، المرضية،
          كل نوع خصم مسجل باسمه، السلف، التأمينات) — نفس تقسيم جدول المسير والقسيمة، وإجمالي كل بند في آخر الجدول */}
      <PayrollMonthLinesTable side="deductions" period={period} matches={matches} onOpenRun={onOpenRun} version={version} />
    </div>
  )
}

function WaiverForm({ period, branches, departments, teams, employees, onClose, onSaved }: {
  period: string; branches: ApiBranch[]; departments: ApiDepartment[]; teams: ApiTeam[]; employees: ApiEmployee[]
  onClose: () => void; onSaved: (result: DeductionWaiverCreated) => void
}) {
  const lockedBranchId = useMemo(() => {
    // حساب «كل الفروع» (مدير النظام أو من فتح له نطاق الشركة) مش مقفول على فرع — نفس مرآة branchScopeOf في الخادم
    return lockedBranchIdOf(getCurrentUser())
  }, [])
  // حساب الفروع المتعددة يختار فرع منها (الشركة كلها لحساب على مستوى الشركة بس)
  const branchScope = useMemo(() => branchScopeOfUser(getCurrentUser()), [])
  const [kind, setKind] = useState<DeductionKind>('LATENESS')
  const [target, setTarget] = useState<OrgTarget>(() => initialOrgTarget(lockedBranchId, undefined, branchScope))
  const [reason, setReason] = useState('')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')
  const needsPick = target.level !== 'company' && (target.branchId == null ||
    (target.level === 'departments' && !target.departmentIds.length) ||
    (target.level === 'teams' && !(target.teamIds ?? []).length) ||
    (target.level === 'employees' && !target.employeeIds.length))
  const count = resolveOrgTarget(target, employees).length

  const submit = async () => {
    setError('')
    if (needsPick) { setError('كمّل اختيار على مين'); return }
    if (!reason.trim()) { setError('اكتب السبب'); return }
    setBusy(true)
    try {
      onSaved(await createDeductionWaiver({ period, kind, targetLevel: target.level, branchId: target.level === 'company' ? null : target.branchId,
        departmentIds: target.level === 'departments' ? target.departmentIds : [], teamIds: target.level === 'teams' ? target.teamIds ?? [] : [],
        employeeIds: target.level === 'employees' ? target.employeeIds : [], reason: reason.trim() }))
    } catch (e) {
      setError(errorText(e, 'تعذر الحفظ'))
    } finally {
      setBusy(false)
    }
  }

  return (
    <div className="border border-gray-200 rounded-xl p-4 space-y-3" data-deduction-waiver-form>
      <div className="grid gap-3 md:grid-cols-2">
        <label className="flex flex-col gap-1 text-sm">
          <span className="font-medium text-gray-700">نوع الخصم</span>
          <select className="input w-full" value={kind} disabled={busy} onChange={e => setKind(e.target.value as DeductionKind)}>
            {DEDUCTION_KINDS.map(value => <option key={value} value={value}>{DEDUCTION_KIND_LABELS[value]}</option>)}
          </select>
        </label>
        <div className="text-sm flex flex-col gap-1">
          <span className="font-medium text-gray-700">الشهر</span>
          <span className="input w-full bg-gray-50" dir="ltr">{period}</span>
        </div>
      </div>
      <OrgTargetPicker value={target} onChange={setTarget} branches={branches} departments={departments} teams={teams}
        employees={employees} lockedBranchId={lockedBranchId} branchScope={branchScope} disabled={busy} />
      <label className="flex flex-col gap-1 text-sm">
        <span className="font-medium text-gray-700">السبب</span>
        <textarea className="input w-full" rows={2} maxLength={500} value={reason} disabled={busy} onChange={e => setReason(e.target.value)} />
      </label>
      <p className="text-xs text-gray-500">
        هيتشال «{DEDUCTION_KIND_LABELS[kind]}» عن {describeOrgTarget(target, branches, departments, teams)}{employees.length ? ` (${count} موظف دلوقتي)` : ''} في مسيرات {period} المفتوحة.
      </p>
      {error && <p className="text-sm text-danger-600">{error}</p>}
      <div className="flex gap-2 justify-end">
        <button type="button" className="btn-secondary" disabled={busy} onClick={onClose}>رجوع</button>
        <button type="button" className="btn-primary disabled:opacity-50" disabled={busy} onClick={submit}>{busy ? 'بيحفظ...' : 'احفظ'}</button>
      </div>
    </div>
  )
}

export default PayrollOverviewTabs
