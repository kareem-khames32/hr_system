'use client'

// تبويبات شاشة المسير بعد «المسيرات»: المدرجين بالمسير، موظفين ليس لديهم مسير، التضارب، الاستقطاعات («شيل خصم»).
// كل تبويب بشهر واحد، والنطاق (فرع الحساب) مفروض في الباك.

import { useEffect, useMemo, useState } from 'react'
import { AlertTriangle, Ban, Calendar, CheckCircle, Plus, Search, X } from 'lucide-react'
import { can, getCurrentUser, type ApiBranch, type ApiDepartment, type ApiEmployee, type ApiTeam } from '@/lib/api'
import { formatMoney } from '@/lib/money'
import EmptyState from '@/components/EmptyState'
import { OrgTargetPicker, describeOrgTarget, initialOrgTarget, resolveOrgTarget, type OrgTarget } from '@/components/OrgTargetPicker'
import {
  cancelDeductionWaiver, createDeductionWaiver, DEDUCTION_KIND_LABELS, DEDUCTION_KINDS, fetchDeductionWaivers, fetchPayrollConflicts,
  fetchPayrollDeductions, fetchPayrollIncluded, fetchPayrollWithoutRun,
  type DeductionKind, type DeductionWaiverCreated, type DeductionWaiverRow, type OverviewConflicts, type OverviewDeductions,
  type OverviewIncluded, type OverviewUnassigned,
} from '@/lib/payroll-overview-api'

export type PayrollOverviewTab = 'included' | 'unassigned' | 'conflicts' | 'deductions'

const RUN_STATUS: Record<string, string> = { DRAFT: 'مسودة', CALCULATED: 'محسوب', IN_REVIEW: 'قيد المراجعة', APPROVED: 'معتمد', PAID: 'مصروف', CANCELLED: 'ملغى' }
const runLabel = (id: number, name: string | null) => name ? `${name} (#${id})` : `مسير #${id}`
const errorText = (e: unknown, fallback: string) => (e instanceof Error && e.message ? e.message : fallback)
const thisMonth = () => {
  const now = new Date()
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`
}

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
  const [period, setPeriod] = useState(thisMonth)
  const [query, setQuery] = useState('')
  const matches = (row: { fullName: string; employeeCode: string }) =>
    !query.trim() || row.fullName.includes(query.trim()) || row.employeeCode.toLowerCase().includes(query.trim().toLowerCase())

  return (
    <div className="space-y-4" data-payroll-overview-tab={tab}>
      <div className="card flex flex-wrap items-end gap-4">
        <label className="flex flex-col gap-1 text-sm">
          <span className="font-medium text-gray-700 flex items-center gap-1.5"><Calendar size={15} className="text-gray-400" /> الشهر</span>
          <input type="month" className="input w-48" dir="ltr" value={period} onChange={e => setPeriod(e.target.value)} />
        </label>
        <div className="relative flex-1 min-w-[220px]">
          <Search size={16} className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400" />
          <input type="text" className="input w-full pr-9" placeholder="دوّر بالاسم أو الكود..." value={query} onChange={e => setQuery(e.target.value)} />
        </div>
      </div>
      {tab === 'included' && <IncludedTab period={period} matches={matches} onOpenRun={onOpenRun} />}
      {tab === 'unassigned' && <UnassignedTab period={period} matches={matches} onOpenRun={onOpenRun} />}
      {tab === 'conflicts' && <ConflictsTab period={period} matches={matches} onOpenRun={onOpenRun} />}
      {tab === 'deductions' && <DeductionsTab period={period} matches={matches} onOpenRun={onOpenRun}
        branches={branches} departments={departments} teams={teams} employees={employees} />}
    </div>
  )
}

type Matches = (row: { fullName: string; employeeCode: string }) => boolean

function IncludedTab({ period, matches, onOpenRun }: { period: string; matches: Matches; onOpenRun: (id: number) => void }) {
  const { data, error, loading } = useMonthData<OverviewIncluded>(period, fetchPayrollIncluded)
  if (loading) return <Loading />
  if (error) return <div className="card text-danger-600 text-sm">{error}</div>
  const rows = (data?.rows ?? []).filter(matches)
  return (
    <div className="card p-0 overflow-hidden">
      <div className="p-4 border-b border-gray-100 text-sm text-gray-600">
        {data ? <>في <b>{data.employees}</b> موظف مدرجين في <b>{data.runs}</b> مسير للشهر ده. المسودة اللي لسه ما اتحسبتش مش بتظهر هنا.</> : null}
      </div>
      {rows.length === 0 ? <EmptyState title="مفيش موظفين مدرجين في مسيرات الشهر ده" className="shadow-none" /> : (
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead><tr className="table-header">
              <th className="table-cell text-right">الموظف</th><th className="table-cell text-right">الفرع</th><th className="table-cell text-right">القسم</th>
              <th className="table-cell text-right">المسير</th><th className="table-cell text-center">الحالة</th><th className="table-cell text-center">الفترة</th>
            </tr></thead>
            <tbody>
              {rows.map(row => (
                <tr key={`${row.runId}:${row.employeeId}`} className="table-row">
                  <td className="table-cell"><div className="font-medium text-gray-800">{row.fullName}</div><div className="text-xs text-gray-400">{row.employeeCode}</div></td>
                  <td className="table-cell">{row.branchName ?? '—'}</td>
                  <td className="table-cell">{row.departmentName ?? '—'}</td>
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
  )
}

function UnassignedTab({ period, matches, onOpenRun }: { period: string; matches: Matches; onOpenRun: (id: number) => void }) {
  const { data, error, loading } = useMonthData<OverviewUnassigned>(period, fetchPayrollWithoutRun)
  if (loading) return <Loading />
  if (error) return <div className="card text-danger-600 text-sm">{error}</div>
  const rows = (data?.rows ?? []).filter(matches)
  const drafts = (data?.openRuns ?? []).filter(run => run.status === 'DRAFT' || run.status === 'CALCULATED')
  return (
    <div className="card p-0 overflow-hidden">
      <div className="p-4 border-b border-gray-100 text-sm text-gray-600 space-y-2">
        {data && <p>الفترة من {data.startDate} إلى {data.endDate} — <b>{data.rows.length}</b> موظف شغالين ومالهمش مسير.</p>}
        {rows.length > 0 && (drafts.length ? (
          <p className="flex flex-wrap items-center gap-2">
            <span>عشان تضيفهم: افتح مسير الشهر وعدّل تعريفه (أو أعد حسابه) —</span>
            {drafts.map(run => (
              <button key={run.id} type="button" className="btn-secondary text-xs px-2 py-1 flex items-center gap-1" onClick={() => onOpenRun(run.id)}>
                <Plus size={13} /> {runLabel(run.id, run.name)} <StatusBadge status={run.status} />
              </button>
            ))}
          </p>
        ) : <p className="text-gray-500">مفيش مسير مفتوح للشهر ده — اعمل «مسير جديد» من تبويب المسيرات.</p>)}
      </div>
      {rows.length === 0 ? <EmptyState title="كل الموظفين الشغالين ليهم مسير في الشهر ده" icon={CheckCircle} className="shadow-none" /> : (
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead><tr className="table-header">
              <th className="table-cell text-right">الموظف</th><th className="table-cell text-center">تاريخ التعيين</th>
              <th className="table-cell text-right">الفرع</th><th className="table-cell text-right">القسم</th><th className="table-cell text-right">السبب</th>
            </tr></thead>
            <tbody>
              {rows.map(row => (
                <tr key={row.employeeId} className="table-row">
                  <td className="table-cell"><div className="font-medium text-gray-800">{row.fullName}</div><div className="text-xs text-gray-400">{row.employeeCode}</div></td>
                  <td className="table-cell text-center" dir="ltr">{row.hireDate ?? '—'}</td>
                  <td className="table-cell">{row.branchName ?? '—'}</td>
                  <td className="table-cell">{row.departmentName ?? '—'}</td>
                  <td className="table-cell text-sm text-gray-600">{row.reasonText}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
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
  const { data, error, loading } = useMonthData<OverviewDeductions>(period, fetchPayrollDeductions, version)
  const waivers = useMonthData<DeductionWaiverRow[]>(period, fetchDeductionWaivers, version)
  const [kindFilter, setKindFilter] = useState<DeductionKind | ''>('')
  const [showForm, setShowForm] = useState(false)
  const [saved, setSaved] = useState<DeductionWaiverCreated | null>(null)
  const [cancelError, setCancelError] = useState('')
  const canWaive = can('payroll.calculate')
  useEffect(() => { setSaved(null); setShowForm(false) }, [period])

  const rows = (data?.rows ?? []).filter(row => (!kindFilter || row.kind === kindFilter) && matches(row))
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

      {/* الاستقطاعات المحسوبة */}
      {loading ? <Loading /> : error ? <div className="card text-danger-600 text-sm">{error}</div> : (
        <div className="card p-0 overflow-hidden">
          <div className="p-4 border-b border-gray-100 flex flex-wrap gap-2 items-center">
            <button type="button" onClick={() => setKindFilter('')}
              className={`px-3 py-1 rounded-lg text-sm ${kindFilter === '' ? 'bg-primary-500 text-white' : 'bg-gray-100 text-gray-600'}`}>الكل</button>
            {DEDUCTION_KINDS.filter(kind => data?.totals[kind]).map(kind => (
              <button key={kind} type="button" onClick={() => setKindFilter(kind)}
                className={`px-3 py-1 rounded-lg text-sm ${kindFilter === kind ? 'bg-primary-500 text-white' : 'bg-gray-100 text-gray-600'}`}>
                {DEDUCTION_KIND_LABELS[kind]} <span className="font-mono">{formatMoney(data?.totals[kind] ?? 0)}</span>
              </button>
            ))}
          </div>
          {rows.length === 0 ? <EmptyState title={data?.runs.length ? 'مفيش خصومات مطابقة' : 'مفيش مسيرات محسوبة للشهر ده'} className="shadow-none" /> : (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead><tr className="table-header">
                  <th className="table-cell text-right">الموظف</th><th className="table-cell text-right">الفرع / القسم</th>
                  <th className="table-cell text-right">نوع الخصم</th><th className="table-cell text-center">المبلغ</th><th className="table-cell text-right">المسير</th>
                </tr></thead>
                <tbody>
                  {rows.map((row, index) => (
                    <tr key={`${row.runId}:${row.employeeId}:${row.kind}:${index}`} className="table-row">
                      <td className="table-cell"><div className="font-medium text-gray-800">{row.fullName}</div><div className="text-xs text-gray-400">{row.employeeCode}</div></td>
                      <td className="table-cell text-sm">{row.branchName ?? '—'}{row.departmentName ? ` / ${row.departmentName}` : ''}</td>
                      <td className="table-cell">{DEDUCTION_KIND_LABELS[row.kind] ?? row.kindLabel}</td>
                      <td className="table-cell text-center font-mono text-danger-600">{formatMoney(row.amount)}</td>
                      <td className="table-cell"><button type="button" className="text-primary-600 hover:underline" onClick={() => onOpenRun(row.runId)}>{runLabel(row.runId, row.runName)}</button> <StatusBadge status={row.runStatus} /></td>
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

function WaiverForm({ period, branches, departments, teams, employees, onClose, onSaved }: {
  period: string; branches: ApiBranch[]; departments: ApiDepartment[]; teams: ApiTeam[]; employees: ApiEmployee[]
  onClose: () => void; onSaved: (result: DeductionWaiverCreated) => void
}) {
  const lockedBranchId = useMemo(() => {
    const user = getCurrentUser()
    return user && user.role !== 'super_admin' && user.branchId ? user.branchId : null
  }, [])
  const [kind, setKind] = useState<DeductionKind>('LATENESS')
  const [target, setTarget] = useState<OrgTarget>(() => initialOrgTarget(lockedBranchId))
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
        employees={employees} lockedBranchId={lockedBranchId} disabled={busy} />
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
