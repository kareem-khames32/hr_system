'use client'

// طلب المالك (20 سبتمبر): فلاتر واحدة لتبويبي «المدرجين بالمسير» و«موظفين ليس لديهم مسير» وللجدول الموحد.
// كل الفلاتر بتشتغل مع بعض وبتتبعت للخادم (الفلترة هناك بنطاق الفرع)، وشارة بعدد الفلاتر المفعّلة و«مسح الفلاتر».

import { Filter, Search, X } from 'lucide-react'
import type { ApiBranch, ApiDepartment, ApiTeam } from '@/lib/api'
import { DayRangeFilter } from '@/components/DayRangeFilter'
import { linkedFilterOptions, UNASSIGNED_REASON_LABELS, type PayrollUnassignedReason } from '@/lib/payroll-runs-api'
import {
  emptyPayrollOverviewFilters, PAYROLL_EMPLOYMENT_STATUS_OPTIONS, payrollOverviewFilterCount,
  type OverviewRunOption, type PayrollEmploymentStatus, type PayrollOverviewFilterState,
} from '@/lib/payroll-overview-api'

const RUN_STATUS: Record<string, string> = { DRAFT: 'مسودة', CALCULATED: 'محسوب', IN_REVIEW: 'قيد المراجعة', APPROVED: 'معتمد', PAID: 'مصروف', CANCELLED: 'ملغى' }
export const payrollRunOptionLabel = (run: OverviewRunOption) =>
  `${run.name ? `${run.name} (#${run.id})` : `مسير #${run.id}`} — ${RUN_STATUS[run.status] ?? run.status}`
export const payrollReasonLabel = (code: string) => UNASSIGNED_REASON_LABELS[code as PayrollUnassignedReason] ?? code

export function PayrollEmployeeFilters({
  value, onChange, branches, departments, teams, jobTitles, runs, reasons, cycleStartDay, today, disabled,
  shownCount, totalCount, idPrefix = 'payroll-roster',
}: {
  value: PayrollOverviewFilterState
  onChange: (next: PayrollOverviewFilterState) => void
  branches: ApiBranch[]
  departments: ApiDepartment[]
  teams: ApiTeam[]
  jobTitles: string[]
  /** فلتر «في أنهي مسير» — بلاش قيمة = الفلتر ما يظهرش */
  runs?: OverviewRunOption[]
  /** فلتر «سبب عدم الإدراج» — بلاش قيمة = الفلتر ما يظهرش */
  reasons?: string[]
  cycleStartDay?: number | null
  today?: string | null
  disabled?: boolean
  shownCount: number
  totalCount: number
  idPrefix?: string
}) {
  const count = payrollOverviewFilterCount(value)
  const set = (patch: Partial<PayrollOverviewFilterState>) => onChange({ ...value, ...patch })
  // الفلاتر المترابطة: الأقسام جوّه الفرع المختار، والفرق جوّه القسم المختار
  const linked = linkedFilterOptions(branches, departments, teams, {
    branchIds: value.branchId ? [value.branchId] : [], departmentIds: value.departmentId ? [value.departmentId] : [],
    teamIds: [], employeeIds: [],
  })
  const pickBranch = (branchId: number | null) => {
    const nextDepartments = linkedFilterOptions(branches, departments, teams, { branchIds: branchId ? [branchId] : [], departmentIds: [], teamIds: [], employeeIds: [] }).departments
    const departmentId = value.departmentId && nextDepartments.some(row => row.id === value.departmentId) ? value.departmentId : null
    const nextTeams = linkedFilterOptions(branches, departments, teams, { branchIds: branchId ? [branchId] : [], departmentIds: departmentId ? [departmentId] : [], teamIds: [], employeeIds: [] }).teams
    set({ branchId, departmentId, teamId: value.teamId && nextTeams.some(row => row.id === value.teamId) ? value.teamId : null })
  }
  const pickDepartment = (departmentId: number | null) => {
    const nextTeams = linkedFilterOptions(branches, departments, teams, { branchIds: value.branchId ? [value.branchId] : [], departmentIds: departmentId ? [departmentId] : [], teamIds: [], employeeIds: [] }).teams
    set({ departmentId, teamId: value.teamId && nextTeams.some(row => row.id === value.teamId) ? value.teamId : null })
  }
  const toggleStatus = (status: PayrollEmploymentStatus) => set({
    statuses: value.statuses.includes(status) ? value.statuses.filter(row => row !== status) : [...value.statuses, status],
  })

  return (
    <div className="card space-y-3" data-payroll-employee-filters>
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div className="flex items-center gap-2 text-sm font-medium text-gray-700">
          <Filter size={16} className="text-gray-400" />
          الفلاتر
          {count > 0 && <span className="px-2 py-0.5 rounded-full bg-primary-50 text-primary-700 text-xs" data-active-filter-count>{count} فلتر مفعّل</span>}
        </div>
        <div className="flex items-center gap-3 text-sm text-gray-600">
          <span data-filtered-row-count>ظاهر <b>{shownCount}</b> من {totalCount} موظف</span>
          <button type="button" className="btn-secondary text-xs px-2 py-1 flex items-center gap-1 disabled:opacity-50" data-clear-filters
            disabled={disabled || count === 0} onClick={() => onChange({ ...emptyPayrollOverviewFilters(), membership: value.membership })}>
            <X size={13} /> مسح الفلاتر
          </button>
        </div>
      </div>

      <div className="flex flex-wrap items-end gap-3">
        <label className="flex flex-col gap-1 text-sm flex-1 min-w-[220px]">
          <span className="font-medium text-gray-700">بحث</span>
          <span className="relative block">
            <Search size={16} className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400" />
            <input id={`${idPrefix}-search`} type="text" className="input w-full pr-9" placeholder="دوّر بالاسم أو الكود..."
              disabled={disabled} value={value.search} onChange={event => set({ search: event.target.value })} />
          </span>
        </label>
        <label className="flex flex-col gap-1 text-sm">
          <span className="font-medium text-gray-700">الفرع</span>
          <select id={`${idPrefix}-branch`} className="input w-44" disabled={disabled} value={value.branchId ?? ''}
            onChange={event => pickBranch(event.target.value ? Number(event.target.value) : null)}>
            <option value="">كل الفروع</option>
            {branches.map(branch => <option key={branch.id} value={branch.id}>{branch.name}</option>)}
          </select>
        </label>
        <label className="flex flex-col gap-1 text-sm">
          <span className="font-medium text-gray-700">القسم</span>
          <select id={`${idPrefix}-department`} className="input w-44" disabled={disabled} value={value.departmentId ?? ''}
            onChange={event => pickDepartment(event.target.value ? Number(event.target.value) : null)}>
            <option value="">كل الأقسام</option>
            {linked.departments.map(row => <option key={row.id} value={row.id}>{row.name}</option>)}
          </select>
        </label>
        <label className="flex flex-col gap-1 text-sm">
          <span className="font-medium text-gray-700">الفريق</span>
          <select id={`${idPrefix}-team`} className="input w-40" disabled={disabled} value={value.teamId ?? ''}
            onChange={event => set({ teamId: event.target.value ? Number(event.target.value) : null })}>
            <option value="">كل الفرق</option>
            {linked.teams.map(row => <option key={row.id} value={row.id}>{row.name}</option>)}
          </select>
        </label>
        <label className="flex flex-col gap-1 text-sm">
          <span className="font-medium text-gray-700">المسمى الوظيفي</span>
          <select id={`${idPrefix}-job-title`} className="input w-48" disabled={disabled} value={value.jobTitle}
            onChange={event => set({ jobTitle: event.target.value })}>
            <option value="">كل المسميات</option>
            {jobTitles.map(title => <option key={title} value={title}>{title}</option>)}
          </select>
        </label>
        {runs && (
          <label className="flex flex-col gap-1 text-sm">
            <span className="font-medium text-gray-700">المسير</span>
            <select id={`${idPrefix}-run`} className="input w-56" disabled={disabled} value={value.runId ?? ''}
              onChange={event => set({ runId: event.target.value ? Number(event.target.value) : null })}>
              <option value="">كل المسيرات</option>
              {runs.map(run => <option key={run.id} value={run.id}>{payrollRunOptionLabel(run)}</option>)}
            </select>
          </label>
        )}
        {reasons && (
          <label className="flex flex-col gap-1 text-sm">
            <span className="font-medium text-gray-700">سبب عدم الإدراج</span>
            <select id={`${idPrefix}-reason`} className="input w-56" disabled={disabled} value={value.reasonCode}
              onChange={event => set({ reasonCode: event.target.value })}>
              <option value="">كل الأسباب</option>
              {reasons.map(code => <option key={code} value={code}>{payrollReasonLabel(code)}</option>)}
            </select>
          </label>
        )}
      </div>

      <div className="flex flex-wrap items-center gap-2 text-sm">
        <span className="font-medium text-gray-700">حالة الموظف</span>
        {PAYROLL_EMPLOYMENT_STATUS_OPTIONS.map(([status, label]) => (
          <label key={status} className={`flex items-center gap-1.5 rounded-full border px-3 py-1 text-xs cursor-pointer ${
            value.statuses.includes(status) ? 'border-primary-300 bg-primary-50 text-primary-700' : 'border-gray-200 text-gray-600'}`}>
            <input type="checkbox" className="rounded border-gray-300" data-status-filter={status} disabled={disabled}
              checked={value.statuses.includes(status)} onChange={() => toggleStatus(status)} />
            {label}
          </label>
        ))}
      </div>

      <div className="flex flex-wrap items-end gap-2">
        <span className="text-sm font-medium text-gray-700 mb-2">تاريخ التعيين</span>
        <DayRangeFilter idPrefix={`${idPrefix}-hire`} disabled={disabled} cycleStartDay={cycleStartDay} today={today} maxDays={null}
          value={value.hiredFrom && value.hiredTo ? { from: value.hiredFrom, to: value.hiredTo } : null}
          onChange={range => set({ hiredFrom: range.from, hiredTo: range.to })}
          onClear={() => set({ hiredFrom: null, hiredTo: null })} />
      </div>
    </div>
  )
}

export default PayrollEmployeeFilters
