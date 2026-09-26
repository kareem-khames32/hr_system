'use client'

// «تابة البدلات» في شاشة المسير: بدل بمبلغ ثابت لكل موظف في مسير شهر، على الشركة أو فرع أو أقسام أو فرق أو موظفين.
// كل موظف ليه سطر بيدخل «إضافات أخرى» في مسير الشهر باسم البدل (والقسيمة)، والمسير المسودة/المحسوب بياخده لما يتحسب تاني؛
// المعتمد والمصروف ما بيتغيرش. نفس شكل باقي التابات (الشهر + البحث فوق)، والنطاق (فرع الحساب) مفروض في الباك.

import { useEffect, useMemo, useState } from 'react'
import { Calendar, CheckCircle, Pencil, Plus, Search, Settings2, Wallet, X } from 'lucide-react'
import { can, getCurrentUser, lockedBranchIdOf, type ApiBranch, type ApiDepartment, type ApiEmployee, type ApiTeam } from '@/lib/api'
import { branchScopeOfUser, canSeeBranch, type BranchScope } from '@/lib/branch-scope'
import { formatMoney, sumMoney } from '@/lib/money'
import EmptyState from '@/components/EmptyState'
import { ORG_TARGET_LEVELS, OrgTargetPicker, describeOrgTarget, initialOrgTarget, resolveOrgTarget, type OrgTarget } from '@/components/OrgTargetPicker'
import { usePayrollDayRange } from '@/components/DayRangeFilter'
import { dayRangeLabel, payrollMonthBounds } from '@/lib/payroll-month-range'
import {
  cancelAllowanceGrant, cancelAllowanceLine, createAllowanceGrant, createAllowanceType, fetchAllowanceMonth, fetchAllowanceTypes, updateAllowanceType,
  type AllowanceGrantBatch, type AllowanceGrantCreated, type AllowanceGrantRow, type AllowanceLineState, type AllowanceMonth, type AllowanceType,
} from '@/lib/payroll-allowances-api'
import { PayrollMonthLinesTable } from '@/components/payroll/PayrollMonthLinesTable'
import { PayrollRecurringAllowances } from '@/components/payroll/PayrollRecurringAllowances'

const RUN_STATUS: Record<string, string> = { DRAFT: 'مسودة', CALCULATED: 'محسوب', IN_REVIEW: 'قيد المراجعة', APPROVED: 'معتمد', PAID: 'مصروف', CANCELLED: 'ملغى' }
const runLabel = (id: number, name: string | null) => name ? `${name} (#${id})` : `مسير #${id}`
const errorText = (e: unknown, fallback: string) => (e instanceof Error && e.message ? e.message : fallback)
const MONTH = /^\d{4}-(0[1-9]|1[0-2])$/
const AMOUNT = /^\d{1,12}(\.\d{1,2})?$/
const STATE_TONE: Record<AllowanceLineState, string> = {
  PENDING: 'bg-gray-100 text-gray-600',
  IN_RUN: 'bg-warning-50 text-warning-700',
  NEEDS_RECALC: 'bg-danger-50 text-danger-600',
  APPROVED: 'bg-success-50 text-success-700',
  PAID: 'bg-success-50 text-success-700',
  REVERSED: 'bg-gray-100 text-gray-600',
  CANCELLED: 'bg-gray-100 text-gray-400 line-through',
}
type RunBrief = { id: number; name: string | null; status: string }

function RunStatus({ status }: { status: string | null }) {
  const tone = status === 'PAID' || status === 'APPROVED' ? 'bg-success-50 text-success-700' : status === 'DRAFT' ? 'bg-gray-100 text-gray-600' : 'bg-warning-50 text-warning-700'
  return <span className={`px-2 py-0.5 rounded-full text-xs ${tone}`}>{status ? RUN_STATUS[status] ?? status : '—'}</span>
}

function Loading() {
  return <div className="flex justify-center py-12"><div className="w-7 h-7 border-2 border-primary-500 border-t-transparent rounded-full animate-spin" /></div>
}

function RunLinks({ runs, onOpenRun }: { runs: RunBrief[]; onOpenRun: (id: number) => void }) {
  return <>{runs.map(run => <button key={run.id} type="button" className="underline" onClick={() => onOpenRun(run.id)}>{runLabel(run.id, run.name)}</button>)}</>
}

export function PayrollAllowancesTab({ branches, departments, teams, employees, onOpenRun }: {
  branches: ApiBranch[]
  departments: ApiDepartment[]
  teams: ApiTeam[]
  employees: ApiEmployee[]
  onOpenRun: (runId: number) => void
}) {
  // الافتراضي شهر الرواتب الجاري (بدورة 23 يوم 25 سبتمبر = رواتب أكتوبر) بحدوده — نفس باقي تابات المسير؛
  // فاضي لحد ما نعرفه بدل تحميل الشهر التقويمي الأول
  const [period, setPeriod] = useState('')
  const payrollMonth = usePayrollDayRange().context
  const [periodTouched, setPeriodTouched] = useState(false)
  useEffect(() => { if (payrollMonth && !periodTouched) setPeriod(payrollMonth.period) }, [payrollMonth, periodTouched])
  const periodRange = payrollMonth && MONTH.test(period) ? payrollMonthBounds(period, payrollMonth.cycleStartDay) : null
  const [query, setQuery] = useState('')
  const [version, setVersion] = useState(0)
  const [data, setData] = useState<AllowanceMonth | null>(null)
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  const [types, setTypes] = useState<AllowanceType[]>([])
  const [typesError, setTypesError] = useState('')
  const [showForm, setShowForm] = useState(false)
  const [showTypes, setShowTypes] = useState(false)
  const [saved, setSaved] = useState<AllowanceGrantCreated | null>(null)
  const [notice, setNotice] = useState<{ text: string; runs: RunBrief[] } | null>(null)
  const [actionError, setActionError] = useState('')
  const [typeFilter, setTypeFilter] = useState<number | ''>('')
  const [showCancelled, setShowCancelled] = useState(false)
  const canWrite = can('payroll.calculate')

  useEffect(() => {
    if (!/^\d{4}-\d{2}$/.test(period)) return
    let cancelled = false
    setLoading(true)
    setError('')
    fetchAllowanceMonth(period)
      .then(result => { if (!cancelled) setData(result) })
      .catch(e => { if (!cancelled) { setData(null); setError(errorText(e, 'تعذر تحميل البدلات')) } })
      .finally(() => { if (!cancelled) setLoading(false) })
    return () => { cancelled = true }
  }, [period, version])

  const loadTypes = () => fetchAllowanceTypes().then(rows => { setTypes(rows); setTypesError('') }).catch(e => setTypesError(errorText(e, 'تعذر تحميل أنواع البدلات')))
  // eslint-disable-next-line react-hooks/exhaustive-deps
  useEffect(() => { loadTypes() }, [])
  useEffect(() => { setSaved(null); setNotice(null); setShowForm(false); setTypeFilter('') }, [period])

  const matches = (row: { fullName: string; employeeCode: string }) =>
    !query.trim() || row.fullName.includes(query.trim()) || row.employeeCode.toLowerCase().includes(query.trim().toLowerCase())
  const rows = (data?.rows ?? []).filter(row => (showCancelled || row.state !== 'CANCELLED') && (!typeFilter || row.allowanceTypeId === typeFilter) && matches(row))
  const shownTotal = sumMoney(rows.filter(row => row.state !== 'CANCELLED').map(row => row.amount))
  const cancelledCount = (data?.rows ?? []).filter(row => row.state === 'CANCELLED').length

  const cancelLine = async (row: AllowanceGrantRow) => {
    if (!window.confirm(`إلغاء «${row.typeName}» (${formatMoney(row.amount)}) لـ ${row.fullName}؟`)) return
    setActionError(''); setNotice(null); setSaved(null)
    try {
      const result = await cancelAllowanceLine(row.id)
      setNotice({ text: `اتلغى «${row.typeName}» لـ ${row.fullName}.`, runs: result.recalculateRuns })
      setVersion(v => v + 1)
    } catch (e) {
      setActionError(errorText(e, 'تعذر إلغاء البدل'))
    }
  }
  const cancelBatch = async (grant: AllowanceGrantBatch) => {
    if (!window.confirm(`إلغاء «${grant.typeName}» لكل الموظفين اللي مسيرهم لسه ما اتعتمدش (${grant.cancellableCount} موظف)؟`)) return
    setActionError(''); setNotice(null); setSaved(null)
    try {
      const result = await cancelAllowanceGrant(grant.id)
      setNotice({ text: `اتلغى «${grant.typeName}» لـ ${result.cancelled} موظف${result.locked ? `، و${result.locked} في مسير معتمد أو اتصرف فضلوا زي ما هم` : ''}.`,
        runs: result.recalculateRuns })
      setVersion(v => v + 1)
    } catch (e) {
      setActionError(errorText(e, 'تعذر إلغاء البدل'))
    }
  }

  return (
    <div className="space-y-4" data-payroll-overview-tab="allowances">
      <div className="card flex flex-wrap items-end gap-4">
        <label className="flex flex-col gap-1 text-sm">
          <span className="font-medium text-gray-700 flex items-center gap-1.5"><Calendar size={15} className="text-gray-400" /> شهر الرواتب</span>
          <input type="month" className="input w-48" dir="ltr" value={period} onChange={e => { setPeriodTouched(true); setPeriod(e.target.value) }} />
          {periodRange && <span className="text-xs text-gray-500" data-payroll-period-range>{dayRangeLabel(periodRange)}</span>}
        </label>
        <div className="relative flex-1 min-w-[220px]">
          <Search size={16} className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400" />
          <input type="text" className="input w-full pr-9" placeholder="دوّر بالاسم أو الكود..." value={query} onChange={e => setQuery(e.target.value)} />
        </div>
      </div>

      <div className="card space-y-3">
        <div className="flex items-center justify-between gap-3 flex-wrap">
          <div>
            <h3 className="font-bold text-gray-800">بدل لشهر واحد</h3>
            <p className="text-xs text-gray-500">بدل لمسير الشهر ده بس بمبلغ لكل موظف، بيظهر سطر باسمه في إضافات المسير والقسيمة. المسير المسودة أو المحسوب بياخده لما يتحسب تاني؛ المعتمد والمصروف ما بيتغيرش. (البدل اللي بينزل كل شهر من «البدل الثابت الشهري» تحت.)</p>
          </div>
          <div className="flex gap-2">
            <button type="button" className="btn-secondary flex items-center gap-2 text-sm" onClick={() => setShowTypes(v => !v)}>
              <Settings2 size={16} /> أنواع البدلات
            </button>
            {canWrite && !showForm && MONTH.test(period) && (
              <button type="button" className="btn-primary flex items-center gap-2 text-sm" onClick={() => { setSaved(null); setNotice(null); setShowForm(true) }}>
                <Plus size={16} /> صرف بدل
              </button>
            )}
          </div>
        </div>
        {showTypes && <TypesPanel types={types} error={typesError} branches={branches} canWrite={canWrite} onChanged={loadTypes} />}
        {showForm && (
          <GrantForm period={period} types={types} branches={branches} departments={departments} teams={teams} employees={employees}
            onClose={() => setShowForm(false)} onSaved={result => { setSaved(result); setShowForm(false); setVersion(v => v + 1) }} />
        )}
        {saved && (
          <div className="p-3 rounded-xl bg-success-50 text-success-700 text-sm space-y-1" data-allowance-saved>
            <p className="font-medium">اتصرف لـ {saved.created} موظف — {formatMoney(saved.amount)} لكل موظف (الإجمالي {formatMoney(saved.total)}).</p>
            {saved.skippedDuplicates > 0 && <p className="text-gray-600">اتخطّى {saved.skippedDuplicates} موظف واخدين نفس البدل في الشهر ده.</p>}
            {saved.recalculateRuns.length ? (
              <p className="flex flex-wrap items-center gap-2">أعد حساب: <RunLinks runs={saved.recalculateRuns} onOpenRun={onOpenRun} /></p>
            ) : <p>مفيش مسير مفتوح للشهر ده فيه الموظفين دول — هيدخل أول ما يتحسب.</p>}
            {saved.lockedRuns.length > 0 && (
              <p className="text-gray-600">
                {saved.lockedRuns.map(run => `${runLabel(run.id, run.name)} (${RUN_STATUS[run.status] ?? run.status})`).join('، ')} ما بيتغيرش — بدل موظفينه هيدخل أول مسير مفتوح بعده.
              </p>
            )}
          </div>
        )}
        {notice && (
          <div className="p-3 rounded-xl bg-gray-50 text-gray-700 text-sm space-y-1">
            <p>{notice.text}</p>
            {notice.runs.length > 0 && <p className="flex flex-wrap items-center gap-2">أعد حساب: <RunLinks runs={notice.runs} onOpenRun={onOpenRun} /></p>}
          </div>
        )}
        {actionError && <p className="text-sm text-danger-600">{actionError}</p>}
        {(data?.grants ?? []).length > 0 && (
          <div className="divide-y divide-gray-100 border border-gray-100 rounded-xl">
            {(data?.grants ?? []).map(grant => (
              <div key={grant.id} className="p-3 flex items-start justify-between gap-3">
                <div className="text-sm">
                  <p className="font-medium text-gray-800">{grant.typeName} — {formatMoney(grant.amount)} × {grant.activeCount} موظف — {grant.targetText}</p>
                  <p className="text-gray-500">{grant.reason}</p>
                  <p className="text-xs text-gray-400">{grant.createdByName ?? ''}{grant.createdAt ? ` · ${String(grant.createdAt).slice(0, 10)}` : ''}
                    {grant.activeCount < grant.employeeCount ? ` · اتلغى منه ${grant.employeeCount - grant.activeCount}` : ''}</p>
                </div>
                {canWrite && grant.canCancel && (
                  <button type="button" className="btn-secondary text-xs px-2 py-1 flex items-center gap-1 shrink-0" onClick={() => cancelBatch(grant)}>
                    <X size={13} /> إلغاء الكل
                  </button>
                )}
              </div>
            ))}
          </div>
        )}
      </div>

      {loading || (!period && !periodTouched) ? <Loading /> : error ? <div className="card text-danger-600 text-sm">{error}</div> : (
        <div className="card p-0 overflow-hidden">
          <div className="p-4 border-b border-gray-100 flex flex-wrap gap-2 items-center">
            <button type="button" onClick={() => setTypeFilter('')}
              className={`px-3 py-1 rounded-lg text-sm ${typeFilter === '' ? 'bg-primary-500 text-white' : 'bg-gray-100 text-gray-600'}`}>
              الكل <span className="font-mono">{formatMoney(data?.totals.amount ?? 0)}</span>
            </button>
            {(data?.totals.byType ?? []).map(entry => (
              <button key={entry.allowanceTypeId} type="button" onClick={() => setTypeFilter(entry.allowanceTypeId)}
                className={`px-3 py-1 rounded-lg text-sm ${typeFilter === entry.allowanceTypeId ? 'bg-primary-500 text-white' : 'bg-gray-100 text-gray-600'}`}>
                {entry.typeName} <span className="font-mono">{formatMoney(entry.amount)}</span> <span className="text-xs opacity-75">({entry.count})</span>
              </button>
            ))}
            {cancelledCount > 0 && (
              <label className="flex items-center gap-1.5 text-xs text-gray-500 mr-auto">
                <input type="checkbox" checked={showCancelled} onChange={e => setShowCancelled(e.target.checked)} /> اعرض الملغى ({cancelledCount})
              </label>
            )}
          </div>
          {rows.length === 0 ? (
            <EmptyState title={data?.rows.length ? 'مفيش بدلات مطابقة' : 'مفيش بدلات مصروفة للشهر ده'} icon={data?.rows.length ? undefined : Wallet} className="shadow-none" />
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead><tr className="table-header">
                  <th className="table-cell text-right">الموظف</th><th className="table-cell text-right">الفرع / القسم</th>
                  <th className="table-cell text-right">البدل</th><th className="table-cell text-center">المبلغ</th>
                  <th className="table-cell text-center">الحالة</th><th className="table-cell text-right">المسير</th>
                  {canWrite && <th className="table-cell" />}
                </tr></thead>
                <tbody>
                  {rows.map(row => (
                    <tr key={row.id} className="table-row">
                      <td className="table-cell"><div className="font-medium text-gray-800">{row.fullName}</div><div className="text-xs text-gray-400">{row.employeeCode}</div></td>
                      <td className="table-cell text-sm">{row.branchName ?? '—'}{row.departmentName ? ` / ${row.departmentName}` : ''}</td>
                      <td className="table-cell"><div>{row.typeName}</div>{row.reason && <div className="text-xs text-gray-400">{row.reason}</div>}</td>
                      <td className={`table-cell text-center font-mono ${row.state === 'CANCELLED' ? 'text-gray-400 line-through' : 'text-success-700'}`}>{formatMoney(row.amount)}</td>
                      <td className="table-cell text-center"><span className={`px-2 py-0.5 rounded-full text-xs ${STATE_TONE[row.state]}`}>{row.stateLabel}</span></td>
                      <td className="table-cell">
                        {row.runId ? <>
                          <button type="button" className="text-primary-600 hover:underline" onClick={() => onOpenRun(row.runId!)}>{runLabel(row.runId, row.runName)}</button> <RunStatus status={row.runStatus} />
                        </> : <span className="text-gray-400">—</span>}
                      </td>
                      {canWrite && (
                        <td className="table-cell text-center">
                          {row.canCancel && (
                            <button type="button" className="btn-secondary text-xs px-2 py-1 inline-flex items-center gap-1" onClick={() => cancelLine(row)}>
                              <X size={13} /> إلغاء
                            </button>
                          )}
                        </td>
                      )}
                    </tr>
                  ))}
                </tbody>
                <tfoot>
                  <tr className="bg-gray-50 font-bold">
                    <td className="table-cell" colSpan={3}>الإجمالي ({rows.filter(row => row.state !== 'CANCELLED').length} سطر)</td>
                    <td className="table-cell text-center font-mono text-success-700">{formatMoney(shownTotal)}</td>
                    <td className="table-cell" colSpan={canWrite ? 3 : 2} />
                  </tr>
                </tfoot>
              </table>
            </div>
          )}
        </div>
      )}

      {/* طلب المالك 26 سبتمبر: «البدل الثابت الشهري» (بدل ضغط عمل…) — بينزل كل شهر مع الراتب من غير أي مؤثرات */}
      <PayrollRecurringAllowances period={period} types={types} branches={branches} departments={departments} teams={teams} employees={employees}
        canWrite={canWrite} matches={matches} onOpenRun={onOpenRun} />

      {/* طلب المالك 19 سبتمبر: كل بنود الاستحقاق الداخلة مسيرات الشهر لكل موظف (مش البدلات اليدوية بس) — قراءة بس */}
      <PayrollMonthLinesTable side="earnings" period={period} matches={matches} onOpenRun={onOpenRun} version={version} />
    </div>
  )
}

function useLockedBranchId() {
  return useMemo(() => {
    // حساب «كل الفروع» (مدير النظام أو من فتح له نطاق الشركة) مش مقفول على فرع — نفس مرآة branchScopeOf في الخادم
    return lockedBranchIdOf(getCurrentUser())
  }, [])
}

// نطاق فروع الحساب: null = كل الفروع، مصفوفة = فروعه بس (حساب الفروع المتعددة يختار فرع منها)
function useBranchScope(): BranchScope {
  return useMemo(() => branchScopeOfUser(getCurrentUser()), [])
}

function TypesPanel({ types, error, branches, canWrite, onChanged }: {
  types: AllowanceType[]; error: string; branches: ApiBranch[]; canWrite: boolean; onChanged: () => void
}) {
  const lockedBranchId = useLockedBranchId()
  const scope = useBranchScope()
  const [name, setName] = useState('')
  const [code, setCode] = useState('')
  const [branchId, setBranchId] = useState<number | ''>(lockedBranchId ?? '')
  const [busy, setBusy] = useState(false)
  const [message, setMessage] = useState('')
  const [editing, setEditing] = useState<{ id: number; name: string } | null>(null)

  const run = async (action: () => Promise<unknown>, done?: () => void) => {
    setBusy(true); setMessage('')
    try { await action(); done?.(); onChanged() } catch (e) { setMessage(errorText(e, 'تعذر الحفظ')) } finally { setBusy(false) }
  }
  const add = () => {
    if (!name.trim()) { setMessage('اكتب اسم البدل'); return }
    if (scope !== null && branchId === '') { setMessage('اختار الفرع'); return }
    run(() => createAllowanceType({ name: name.trim(), code: code.trim() || undefined, branchId: branchId === '' ? null : branchId }), () => { setName(''); setCode('') })
  }

  return (
    <div className="border border-gray-200 rounded-xl p-4 space-y-3" data-allowance-types>
      <p className="text-xs text-gray-500">النوع بيبقى للشركة كلها، أو خاص بفرع. «بدل دوام أيام العطلات» بيتحسب لوحده من أوامر الشغل في العطلات ومش محتاج نوع هنا.</p>
      {error && <p className="text-sm text-danger-600">{error}</p>}
      {types.length === 0 ? <p className="text-sm text-gray-400">مفيش أنواع بدلات لسه</p> : (
        <div className="divide-y divide-gray-100 border border-gray-100 rounded-xl">
          {types.map(type => (
            <div key={type.id} className="p-2.5 flex items-center justify-between gap-3 text-sm">
              {editing?.id === type.id ? (
                <div className="flex items-center gap-2 flex-1">
                  <input className="input flex-1" maxLength={120} value={editing.name} disabled={busy} onChange={e => setEditing({ id: type.id, name: e.target.value })} />
                  <button type="button" className="btn-primary text-xs px-2 py-1" disabled={busy}
                    onClick={() => run(() => updateAllowanceType(type.id, { name: editing.name.trim() }), () => setEditing(null))}>احفظ</button>
                  <button type="button" className="btn-secondary text-xs px-2 py-1" disabled={busy} onClick={() => setEditing(null)}>رجوع</button>
                </div>
              ) : (
                <div className={type.isActive ? '' : 'text-gray-400'}>
                  <span className="font-medium">{type.name}</span>
                  <span className="text-xs text-gray-400 mx-2" dir="ltr">{type.code}</span>
                  <span className="text-xs text-gray-500">{type.branchName ?? 'الشركة كلها'}</span>
                  {!type.isActive && <span className="text-xs mr-2">(موقوف)</span>}
                </div>
              )}
              {canWrite && type.canEdit && editing?.id !== type.id && (
                <div className="flex gap-1 shrink-0">
                  <button type="button" className="btn-secondary text-xs px-2 py-1 inline-flex items-center gap-1" disabled={busy}
                    onClick={() => setEditing({ id: type.id, name: type.name })}><Pencil size={12} /> اسم</button>
                  <button type="button" className="btn-secondary text-xs px-2 py-1" disabled={busy}
                    onClick={() => run(() => updateAllowanceType(type.id, { isActive: !type.isActive }))}>{type.isActive ? 'إيقاف' : 'تفعيل'}</button>
                </div>
              )}
            </div>
          ))}
        </div>
      )}
      {canWrite && (
        <div className="grid gap-2 md:grid-cols-[2fr_1fr_1.3fr_auto] items-end">
          <label className="flex flex-col gap-1 text-sm">
            <span className="font-medium text-gray-700">اسم البدل</span>
            <input className="input w-full" maxLength={120} placeholder="مثلًا: بدل انتقالات إضافي" value={name} disabled={busy} onChange={e => setName(e.target.value)} />
          </label>
          <label className="flex flex-col gap-1 text-sm">
            <span className="font-medium text-gray-700">الكود (اختياري)</span>
            <input className="input w-full" dir="ltr" maxLength={40} value={code} disabled={busy} onChange={e => setCode(e.target.value)} />
          </label>
          <label className="flex flex-col gap-1 text-sm">
            <span className="font-medium text-gray-700">لمين</span>
            <select className="input w-full" value={branchId} disabled={busy || lockedBranchId != null}
              onChange={e => setBranchId(e.target.value === '' ? '' : Number(e.target.value))}>
              {scope === null ? <option value="">الشركة كلها</option> : branchId === '' && <option value="" disabled>— اختار الفرع —</option>}
              {branches.filter(branch => (lockedBranchId == null || branch.id === lockedBranchId) && canSeeBranch(scope, branch.id)).map(branch => <option key={branch.id} value={branch.id}>{branch.name}</option>)}
            </select>
          </label>
          <button type="button" className="btn-primary flex items-center gap-1.5 disabled:opacity-50" disabled={busy} onClick={add}><Plus size={15} /> ضيف</button>
        </div>
      )}
      {message && <p className="text-sm text-danger-600">{message}</p>}
    </div>
  )
}

function GrantForm({ period, types, branches, departments, teams, employees, onClose, onSaved }: {
  period: string; types: AllowanceType[]; branches: ApiBranch[]; departments: ApiDepartment[]; teams: ApiTeam[]; employees: ApiEmployee[]
  onClose: () => void; onSaved: (result: AllowanceGrantCreated) => void
}) {
  const lockedBranchId = useLockedBranchId()
  const scope = useBranchScope()
  const usable = types.filter(type => type.isActive && (type.branchId == null || canSeeBranch(scope, type.branchId)))
  const [typeId, setTypeId] = useState<number | ''>(usable[0]?.id ?? '')
  const type = usable.find(row => row.id === typeId) ?? null
  // نوع خاص بفرع: الاستهداف جوه الفرع ده بس
  const lock = lockedBranchId ?? type?.branchId ?? null
  const levels = lock != null ? ORG_TARGET_LEVELS.filter(level => level !== 'company') : ORG_TARGET_LEVELS
  const [target, setTarget] = useState<OrgTarget>(() => initialOrgTarget(lock, levels, scope))
  const [amount, setAmount] = useState('')
  const [reason, setReason] = useState('')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')
  useEffect(() => {
    setTarget(initialOrgTarget(lock, levels, scope))
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [lock])
  useEffect(() => {
    if (usable.length && !usable.some(row => row.id === typeId)) setTypeId(usable[0].id)
  }, [usable, typeId])

  const needsPick = target.level !== 'company' && (target.branchId == null ||
    (target.level === 'departments' && !target.departmentIds.length) ||
    (target.level === 'teams' && !(target.teamIds ?? []).length) ||
    (target.level === 'employees' && !target.employeeIds.length))
  const count = resolveOrgTarget(target, employees).length
  const amountValid = AMOUNT.test(amount.trim()) && Number(amount) > 0

  const submit = async () => {
    setError('')
    if (!type) { setError('اختار نوع البدل'); return }
    if (!amountValid) { setError('اكتب مبلغ موجب (بحد أقصى منزلتين عشريتين)'); return }
    if (needsPick) { setError('كمّل اختيار على مين'); return }
    if (!reason.trim()) { setError('اكتب السبب'); return }
    setBusy(true)
    try {
      onSaved(await createAllowanceGrant({ period, allowanceTypeId: type.id, amount: amount.trim(), targetLevel: target.level,
        branchId: target.level === 'company' ? null : target.branchId, departmentIds: target.level === 'departments' ? target.departmentIds : [],
        teamIds: target.level === 'teams' ? target.teamIds ?? [] : [], employeeIds: target.level === 'employees' ? target.employeeIds : [], reason: reason.trim() }))
    } catch (e) {
      setError(errorText(e, 'تعذر الحفظ'))
    } finally {
      setBusy(false)
    }
  }

  if (!usable.length) {
    return (
      <div className="border border-gray-200 rounded-xl p-4 text-sm text-gray-600 flex items-center justify-between gap-3">
        <span>مفيش نوع بدل شغال — ضيف نوع الأول من «أنواع البدلات».</span>
        <button type="button" className="btn-secondary" onClick={onClose}>رجوع</button>
      </div>
    )
  }

  return (
    <div className="border border-gray-200 rounded-xl p-4 space-y-3" data-allowance-grant-form>
      <div className="grid gap-3 md:grid-cols-3">
        <label className="flex flex-col gap-1 text-sm">
          <span className="font-medium text-gray-700">البدل</span>
          <select className="input w-full" value={typeId} disabled={busy} onChange={e => setTypeId(e.target.value === '' ? '' : Number(e.target.value))}>
            {usable.map(row => <option key={row.id} value={row.id}>{row.name}{row.branchName ? ` (${row.branchName})` : ''}</option>)}
          </select>
        </label>
        <label className="flex flex-col gap-1 text-sm">
          <span className="font-medium text-gray-700">المبلغ لكل موظف</span>
          <input className="input w-full" dir="ltr" inputMode="decimal" placeholder="0.00" value={amount} disabled={busy} onChange={e => setAmount(e.target.value)} />
        </label>
        <div className="text-sm flex flex-col gap-1">
          <span className="font-medium text-gray-700">الشهر</span>
          <span className="input w-full bg-gray-50" dir="ltr">{period}</span>
        </div>
      </div>
      <OrgTargetPicker value={target} onChange={setTarget} branches={branches} departments={departments} teams={teams}
        employees={employees} levels={levels} lockedBranchId={lock} branchScope={scope} disabled={busy} />
      <label className="flex flex-col gap-1 text-sm">
        <span className="font-medium text-gray-700">السبب</span>
        <textarea className="input w-full" rows={2} maxLength={500} value={reason} disabled={busy} onChange={e => setReason(e.target.value)} />
      </label>
      {type && (
        <p className="text-xs text-gray-500 flex items-center gap-1.5">
          <CheckCircle size={13} className="text-gray-400" />
          هيتصرف «{type.name}»{amountValid ? ` ${formatMoney(amount.trim())} لكل موظف` : ''} لـ {describeOrgTarget(target, branches, departments, teams)}
          {employees.length ? ` (${count} موظف دلوقتي${amountValid ? ` — الإجمالي ${formatMoney(Math.round(Number(amount) * 100) * count / 100)}` : ''})` : ''} في مسير {period}.
        </p>
      )}
      {error && <p className="text-sm text-danger-600">{error}</p>}
      <div className="flex gap-2 justify-end">
        <button type="button" className="btn-secondary" disabled={busy} onClick={onClose}>رجوع</button>
        <button type="button" className="btn-primary disabled:opacity-50" disabled={busy} onClick={submit}>{busy ? 'بيحفظ...' : 'احفظ'}</button>
      </div>
    </div>
  )
}

export default PayrollAllowancesTab
