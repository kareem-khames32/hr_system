'use client'

// «البدل الثابت الشهري» جوه «تابة البدلات» (طلب المالك 26 سبتمبر — أول استخدام «بدل ضغط عمل»):
// إسناد نوع بدل لموظفين بمبلغ شهري ثابت من شهر رواتب ولحد شهر اختياري؛ بينزل لوحده في مسير كل شهر بيغطيه سطر باسمه مع الراتب.
// مالوش أي مؤثرات (لا إضافي ولا خصومات ولا سقف ولا أقساط ولا نهاية خدمة)، والتعديل الوحيد تناسب المنضم/المغادر بأيام خدمته
// في الشهر. القائمة بالشهور اللي اتصرفت وحالة الشهر المختار، و«إيقاف» بسبب. النطاق (فرع الموظف) مفروض في الباك.

import { useEffect, useMemo, useState } from 'react'
import { CalendarClock, CheckCircle, PauseCircle, Plus } from 'lucide-react'
import { getCurrentUser, lockedBranchIdOf, type ApiBranch, type ApiDepartment, type ApiEmployee, type ApiTeam } from '@/lib/api'
import { branchScopeOfUser, canSeeBranch, type BranchScope } from '@/lib/branch-scope'
import { formatMoney } from '@/lib/money'
import EmptyState from '@/components/EmptyState'
import { ORG_TARGET_LEVELS, OrgTargetPicker, describeOrgTarget, initialOrgTarget, resolveOrgTarget, type OrgTarget } from '@/components/OrgTargetPicker'
import {
  createRecurringAllowance, fetchRecurringAllowances, stopRecurringAllowance,
  type AllowanceType, type RecurringAllowanceCreated, type RecurringAllowanceList, type RecurringAllowanceMonthState, type RecurringAllowancePhase, type RecurringAllowanceRow,
} from '@/lib/payroll-allowances-api'

const RUN_STATUS: Record<string, string> = { DRAFT: 'مسودة', CALCULATED: 'محسوب', APPROVED: 'معتمد', PAID: 'مصروف', CANCELLED: 'ملغى' }
const runLabel = (id: number, name: string | null) => name ? `${name} (#${id})` : `مسير #${id}`
const errorText = (e: unknown, fallback: string) => (e instanceof Error && e.message ? e.message : fallback)
const MONTH = /^\d{4}-(0[1-9]|1[0-2])$/
const AMOUNT = /^\d{1,12}(\.\d{1,2})?$/
const STATE_TONE: Record<RecurringAllowanceMonthState, string> = {
  PENDING: 'bg-gray-100 text-gray-600',
  IN_RUN: 'bg-warning-50 text-warning-700',
  NEEDS_RECALC: 'bg-danger-50 text-danger-600',
  APPROVED: 'bg-success-50 text-success-700',
  PAID: 'bg-success-50 text-success-700',
  REVERSED: 'bg-gray-100 text-gray-600',
  CANCELLED: 'bg-gray-100 text-gray-400 line-through',
  NOT_IN_SERVICE: 'bg-gray-100 text-gray-400',
}
const PHASE: Record<RecurringAllowancePhase, { label: string; tone: string }> = {
  ACTIVE: { label: 'ساري', tone: 'bg-success-50 text-success-700' },
  UPCOMING: { label: 'لسه ما بدأش', tone: 'bg-gray-100 text-gray-600' },
  ENDED: { label: 'خلص', tone: 'bg-gray-100 text-gray-500' },
  STOPPED: { label: 'موقوف', tone: 'bg-danger-50 text-danger-600' },
}
type RunBrief = { id: number; name: string | null; status: string; period?: string }

// قاعدة المالك كما تظهر في التابة (نفس التعليق في api/src/payroll/recurring-allowances.ts)
export const RECURRING_ALLOWANCE_RULE_HINT = 'بدل بمبلغ ثابت كل شهر لموظفين بالاسم (زي بدل ضغط عمل): بينزل لوحده مع الراتب سطر باسمه في مسير كل شهر من شهر البداية لحد شهر النهاية أو الإيقاف. ' +
  'مالوش أي مؤثرات: مش داخل في سعر ساعة الإضافي، ولا في خصم التأخير أو الغياب أو الانصراف المبكر أو نقص الساعات أو الإجازة بدون راتب، ' +
  'ولا في سقف الخصم وأرضية الصافي والأقساط (بيتصرف كامل)، ولا في مكافأة نهاية الخدمة. ' +
  'التعديل الوحيد: اللي بيبدأ أو بينتهي شغله جوه شهر الرواتب بياخده بنسبة أيام خدمته في الشهر (المبلغ ÷ 30 × أيام الخدمة، نفس حساب الراتب)، واللي مش في الخدمة الشهر ده ما ياخدوش.'

function RunLinks({ runs, onOpenRun }: { runs: RunBrief[]; onOpenRun: (id: number) => void }) {
  return <>{runs.map(run => <button key={run.id} type="button" className="underline" onClick={() => onOpenRun(run.id)}>{runLabel(run.id, run.name)}{run.period ? ` — ${run.period}` : ''}</button>)}</>
}

// نطاق فروع الحساب: null = كل الفروع، مصفوفة = فروعه بس — نفس مرآة branchScopeOf في الخادم
function useScope(): { locked: number | null; scope: BranchScope } {
  return useMemo(() => ({ locked: lockedBranchIdOf(getCurrentUser()), scope: branchScopeOfUser(getCurrentUser()) }), [])
}

export function PayrollRecurringAllowances({ period, types, branches, departments, teams, employees, canWrite, matches, onOpenRun }: {
  period: string
  types: AllowanceType[]
  branches: ApiBranch[]
  departments: ApiDepartment[]
  teams: ApiTeam[]
  employees: ApiEmployee[]
  canWrite: boolean
  matches: (row: { fullName: string; employeeCode: string }) => boolean
  onOpenRun: (runId: number) => void
}) {
  const [data, setData] = useState<RecurringAllowanceList | null>(null)
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  const [version, setVersion] = useState(0)
  const [showForm, setShowForm] = useState(false)
  const [showAll, setShowAll] = useState(false)
  const [saved, setSaved] = useState<RecurringAllowanceCreated | null>(null)
  const [notice, setNotice] = useState<{ text: string; runs: RunBrief[] } | null>(null)
  const [stopping, setStopping] = useState<RecurringAllowanceRow | null>(null)

  useEffect(() => {
    if (!MONTH.test(period)) return
    let cancelled = false
    setLoading(true)
    setError('')
    fetchRecurringAllowances(period)
      .then(result => { if (!cancelled) setData(result) })
      .catch(e => { if (!cancelled) { setData(null); setError(errorText(e, 'تعذر تحميل البدل الثابت الشهري')) } })
      .finally(() => { if (!cancelled) setLoading(false) })
    return () => { cancelled = true }
  }, [period, version])
  useEffect(() => { setSaved(null); setNotice(null); setShowForm(false); setStopping(null) }, [period])

  // الافتراضي: اللي بيغطي الشهر المختار أو هيبدأ بعده؛ «اعرض الكل» يضيف اللي خلص أو اتوقف قبله
  const all = (data?.rows ?? []).filter(matches)
  const rows = all.filter(row => showAll || row.coversPeriod || row.phase === 'UPCOMING')
  const hidden = all.length - rows.length

  return (
    <div className="card space-y-3" data-recurring-allowances>
      <div className="flex items-center justify-between gap-3 flex-wrap">
        <div className="max-w-3xl">
          <h3 className="font-bold text-gray-800 flex items-center gap-1.5"><CalendarClock size={17} className="text-gray-400" /> البدل الثابت الشهري</h3>
          <p className="text-xs text-gray-500 leading-relaxed" data-recurring-allowance-rule>{RECURRING_ALLOWANCE_RULE_HINT}</p>
        </div>
        {canWrite && !showForm && MONTH.test(period) && data?.ready !== false && (
          <button type="button" className="btn-primary flex items-center gap-2 text-sm shrink-0" onClick={() => { setSaved(null); setNotice(null); setStopping(null); setShowForm(true) }}>
            <Plus size={16} /> إسناد بدل ثابت
          </button>
        )}
      </div>
      {showForm && (
        <RecurringForm period={period} types={types} branches={branches} departments={departments} teams={teams} employees={employees}
          onClose={() => setShowForm(false)} onSaved={result => { setSaved(result); setShowForm(false); setVersion(v => v + 1) }} />
      )}
      {saved && (
        <div className="p-3 rounded-xl bg-success-50 text-success-700 text-sm space-y-1" data-recurring-allowance-saved>
          <p className="font-medium">اتسند لـ {saved.created} موظف — {formatMoney(saved.amount)} كل شهر لكل موظف (الشهر {formatMoney(saved.monthlyTotal)})
            من {saved.fromPeriod}{saved.untilPeriod ? ` لحد ${saved.untilPeriod}` : ' لحد ما يتوقف'}.</p>
          {saved.skippedDuplicates > 0 && <p className="text-gray-600">اتخطّى {saved.skippedDuplicates} موظف عندهم نفس البدل في شهور متقاطعة.</p>}
          {saved.recalculateRuns.length ? (
            <p className="flex flex-wrap items-center gap-2">أعد حساب: <RunLinks runs={saved.recalculateRuns} onOpenRun={onOpenRun} /></p>
          ) : <p>مفيش مسير مفتوح للشهور دي فيه الموظفين دول — هيدخل أول ما يتحسب مسير الشهر.</p>}
        </div>
      )}
      {notice && (
        <div className="p-3 rounded-xl bg-gray-50 text-gray-700 text-sm space-y-1">
          <p>{notice.text}</p>
          {notice.runs.length > 0 && <p className="flex flex-wrap items-center gap-2">أعد حساب: <RunLinks runs={notice.runs} onOpenRun={onOpenRun} /></p>}
        </div>
      )}
      {stopping && (
        <StopForm row={stopping} onClose={() => setStopping(null)} onStopped={(text, runs) => { setNotice({ text, runs }); setStopping(null); setVersion(v => v + 1) }} />
      )}

      {!MONTH.test(period) ? null : loading || !data && !error ? (
        <div className="flex justify-center py-8"><div className="w-6 h-6 border-2 border-primary-500 border-t-transparent rounded-full animate-spin" /></div>
      ) : error ? <p className="text-sm text-danger-600">{error}</p> : data?.ready === false ? (
        <p className="text-sm text-warning-700">البدل الثابت الشهري محتاج ترحيل قاعدة البيانات 20260926_071 — كلّم مسؤول النظام.</p>
      ) : (
        <div className="border border-gray-100 rounded-xl overflow-hidden">
          <div className="p-3 border-b border-gray-100 flex flex-wrap items-center gap-3 text-sm">
            <span className="text-gray-600">مسير {period}: <span className="font-medium">{data?.totals.count ?? 0}</span> بدل ثابت
              لـ {data?.totals.employees ?? 0} موظف — <span className="font-mono text-success-700">{formatMoney(data?.totals.amount ?? 0)}</span></span>
            {(hidden > 0 || showAll) && (
              <label className="flex items-center gap-1.5 text-xs text-gray-500 mr-auto">
                <input type="checkbox" checked={showAll} onChange={e => setShowAll(e.target.checked)} /> اعرض اللي خلص أو اتوقف{hidden > 0 ? ` (${hidden})` : ''}
              </label>
            )}
          </div>
          {rows.length === 0 ? (
            <EmptyState title={all.length ? 'مفيش بدل ثابت ساري في الشهر ده' : 'مفيش بدل ثابت مسند'} className="shadow-none" />
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead><tr className="table-header">
                  <th className="table-cell text-right">الموظف</th><th className="table-cell text-right">البدل</th>
                  <th className="table-cell text-center">كل شهر</th><th className="table-cell text-right">الشهور</th>
                  <th className="table-cell text-center">مسير {period}</th><th className="table-cell text-right">اتصرف</th>
                  {canWrite && <th className="table-cell" />}
                </tr></thead>
                <tbody>
                  {rows.map(row => (
                    <tr key={row.id} className="table-row" data-recurring-allowance-row={row.id}>
                      <td className="table-cell">
                        <div className="font-medium text-gray-800">{row.fullName}</div>
                        <div className="text-xs text-gray-400">{row.employeeCode}{row.branchName ? ` · ${row.branchName}` : ''}{row.departmentName ? ` / ${row.departmentName}` : ''}</div>
                      </td>
                      <td className="table-cell"><div>{row.typeName}</div>{row.reason && <div className="text-xs text-gray-400">{row.reason}</div>}</td>
                      <td className="table-cell text-center font-mono text-success-700">{formatMoney(row.amount)}</td>
                      <td className="table-cell text-sm">
                        <div dir="ltr" className="text-right">{row.fromPeriod} ← {row.lastPeriod ?? '…'}</div>
                        <span className={`px-2 py-0.5 rounded-full text-xs ${PHASE[row.phase].tone}`}>
                          {row.status === 'STOPPED' && row.stoppedFromPeriod ? `موقوف من ${row.stoppedFromPeriod}` : PHASE[row.phase].label}
                        </span>
                        {row.status === 'STOPPED' && row.stopReason && <div className="text-xs text-gray-400">{row.stopReason}{row.stoppedByName ? ` — ${row.stoppedByName}` : ''}</div>}
                      </td>
                      <td className="table-cell text-center">
                        {row.month ? (
                          <div className="space-y-0.5">
                            <span className={`px-2 py-0.5 rounded-full text-xs ${STATE_TONE[row.month.state]}`}>{row.month.stateLabel}</span>
                            {row.month.state !== 'NOT_IN_SERVICE' && (
                              <div className="text-xs font-mono">{formatMoney(row.month.amount)}{row.month.amount > 0 && row.month.amount < row.amount ? ' (بنسبة أيام الخدمة)' : ''}</div>
                            )}
                            {row.month.runId && (
                              <button type="button" className="text-xs text-primary-600 hover:underline" onClick={() => onOpenRun(row.month!.runId!)}>
                                {runLabel(row.month.runId, row.month.runName)}{row.month.runStatus ? ` · ${RUN_STATUS[row.month.runStatus] ?? row.month.runStatus}` : ''}
                              </button>
                            )}
                          </div>
                        ) : <span className="text-gray-400">—</span>}
                      </td>
                      <td className="table-cell text-xs" data-recurring-paid-months>
                        {row.paidMonths.length ? <span dir="ltr">{row.paidMonths.join('، ')}</span> : <span className="text-gray-400">لسه</span>}
                      </td>
                      {canWrite && (
                        <td className="table-cell text-center">
                          {row.canStop && (
                            <button type="button" className="btn-secondary text-xs px-2 py-1 inline-flex items-center gap-1"
                              onClick={() => { setSaved(null); setNotice(null); setShowForm(false); setStopping(row) }}>
                              <PauseCircle size={13} /> إيقاف
                            </button>
                          )}
                        </td>
                      )}
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

function StopForm({ row, onClose, onStopped }: { row: RecurringAllowanceRow; onClose: () => void; onStopped: (text: string, runs: RunBrief[]) => void }) {
  const [fromPeriod, setFromPeriod] = useState(row.defaultStopFrom ?? '')
  const [reason, setReason] = useState('')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')
  const submit = async () => {
    setError('')
    if (fromPeriod && !MONTH.test(fromPeriod)) { setError('اختار شهر الإيقاف'); return }
    if (!reason.trim()) { setError('اكتب سبب الإيقاف'); return }
    setBusy(true)
    try {
      const result = await stopRecurringAllowance(row.id, { reason: reason.trim(), fromPeriod: fromPeriod || null })
      onStopped(`اتوقف «${row.typeName}» لـ ${row.fullName} من مسير ${result.stoppedFromPeriod}${result.cancelledMonths.length ? ` — اتشال من ${result.cancelledMonths.join('، ')}` : ''}.`,
        result.recalculateRuns)
    } catch (e) {
      setError(errorText(e, 'تعذر إيقاف البدل'))
    } finally {
      setBusy(false)
    }
  }
  return (
    <div className="border border-danger-100 rounded-xl p-4 space-y-3" data-recurring-allowance-stop>
      <p className="text-sm text-gray-700">إيقاف «{row.typeName}» ({formatMoney(row.amount)} كل شهر) لـ {row.fullName}: أي شهر مسيره لسه ما اتعتمدش ما ياخدوش،
        والشهور المعتمدة أو المصروفة قبله زي ما هي.</p>
      <div className="grid gap-3 md:grid-cols-[12rem_1fr]">
        <label className="flex flex-col gap-1 text-sm">
          <span className="font-medium text-gray-700">يتوقف من مسير</span>
          <input type="month" className="input w-full" dir="ltr" value={fromPeriod} min={row.defaultStopFrom ?? undefined} disabled={busy} onChange={e => setFromPeriod(e.target.value)} />
        </label>
        <label className="flex flex-col gap-1 text-sm">
          <span className="font-medium text-gray-700">السبب</span>
          <input className="input w-full" maxLength={500} value={reason} disabled={busy} onChange={e => setReason(e.target.value)} />
        </label>
      </div>
      {error && <p className="text-sm text-danger-600">{error}</p>}
      <div className="flex gap-2 justify-end">
        <button type="button" className="btn-secondary" disabled={busy} onClick={onClose}>رجوع</button>
        <button type="button" className="btn-primary disabled:opacity-50" disabled={busy} onClick={submit}>{busy ? 'بيوقف...' : 'أوقف'}</button>
      </div>
    </div>
  )
}

function RecurringForm({ period, types, branches, departments, teams, employees, onClose, onSaved }: {
  period: string; types: AllowanceType[]; branches: ApiBranch[]; departments: ApiDepartment[]; teams: ApiTeam[]; employees: ApiEmployee[]
  onClose: () => void; onSaved: (result: RecurringAllowanceCreated) => void
}) {
  const { locked, scope } = useScope()
  const usable = types.filter(type => type.isActive && (type.branchId == null || canSeeBranch(scope, type.branchId)))
  const [typeId, setTypeId] = useState<number | ''>(usable[0]?.id ?? '')
  const type = usable.find(row => row.id === typeId) ?? null
  // نوع خاص بفرع: الاستهداف جوه الفرع ده بس
  const lock = locked ?? type?.branchId ?? null
  const levels = lock != null ? ORG_TARGET_LEVELS.filter(level => level !== 'company') : ORG_TARGET_LEVELS
  const [target, setTarget] = useState<OrgTarget>(() => initialOrgTarget(lock, levels, scope))
  const [amount, setAmount] = useState('')
  const [fromPeriod, setFromPeriod] = useState(period)
  const [untilPeriod, setUntilPeriod] = useState('')
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
    if (!MONTH.test(fromPeriod)) { setError('اختار شهر البداية'); return }
    if (untilPeriod && (!MONTH.test(untilPeriod) || untilPeriod < fromPeriod)) { setError('شهر النهاية لازم يكون بعد شهر البداية أو فاضي'); return }
    if (needsPick) { setError('كمّل اختيار على مين'); return }
    if (!reason.trim()) { setError('اكتب السبب'); return }
    setBusy(true)
    try {
      onSaved(await createRecurringAllowance({ allowanceTypeId: type.id, amount: amount.trim(), targetLevel: target.level,
        branchId: target.level === 'company' ? null : target.branchId, departmentIds: target.level === 'departments' ? target.departmentIds : [],
        teamIds: target.level === 'teams' ? target.teamIds ?? [] : [], employeeIds: target.level === 'employees' ? target.employeeIds : [],
        fromPeriod, untilPeriod: untilPeriod || null, reason: reason.trim() }))
    } catch (e) {
      setError(errorText(e, 'تعذر الحفظ'))
    } finally {
      setBusy(false)
    }
  }

  if (!usable.length) {
    return (
      <div className="border border-gray-200 rounded-xl p-4 text-sm text-gray-600 flex items-center justify-between gap-3">
        <span>مفيش نوع بدل شغال — ضيف نوع الأول من «أنواع البدلات» (مثلًا «بدل ضغط عمل»).</span>
        <button type="button" className="btn-secondary" onClick={onClose}>رجوع</button>
      </div>
    )
  }

  return (
    <div className="border border-gray-200 rounded-xl p-4 space-y-3" data-recurring-allowance-form>
      <div className="grid gap-3 md:grid-cols-4">
        <label className="flex flex-col gap-1 text-sm">
          <span className="font-medium text-gray-700">البدل</span>
          <select className="input w-full" value={typeId} disabled={busy} onChange={e => setTypeId(e.target.value === '' ? '' : Number(e.target.value))}>
            {usable.map(row => <option key={row.id} value={row.id}>{row.name}{row.branchName ? ` (${row.branchName})` : ''}</option>)}
          </select>
        </label>
        <label className="flex flex-col gap-1 text-sm">
          <span className="font-medium text-gray-700">المبلغ كل شهر لكل موظف</span>
          <input className="input w-full" dir="ltr" inputMode="decimal" placeholder="0.00" value={amount} disabled={busy} onChange={e => setAmount(e.target.value)} />
        </label>
        <label className="flex flex-col gap-1 text-sm">
          <span className="font-medium text-gray-700">من مسير</span>
          <input type="month" className="input w-full" dir="ltr" value={fromPeriod} disabled={busy} onChange={e => setFromPeriod(e.target.value)} />
        </label>
        <label className="flex flex-col gap-1 text-sm">
          <span className="font-medium text-gray-700">لحد مسير (اختياري)</span>
          <input type="month" className="input w-full" dir="ltr" value={untilPeriod} min={fromPeriod || undefined} disabled={busy} onChange={e => setUntilPeriod(e.target.value)} />
        </label>
      </div>
      <OrgTargetPicker value={target} onChange={setTarget} branches={branches} departments={departments} teams={teams}
        employees={employees} levels={levels} lockedBranchId={lock} branchScope={scope} disabled={busy} />
      <label className="flex flex-col gap-1 text-sm">
        <span className="font-medium text-gray-700">السبب</span>
        <textarea className="input w-full" rows={2} maxLength={500} value={reason} disabled={busy} onChange={e => setReason(e.target.value)} />
      </label>
      {type && (
        <p className="text-xs text-gray-500 flex items-center gap-1.5">
          <CheckCircle size={13} className="text-gray-400 shrink-0" />
          هيتصرف «{type.name}»{amountValid ? ` ${formatMoney(amount.trim())} كل شهر` : ''} لـ {describeOrgTarget(target, branches, departments, teams)}
          {employees.length ? ` (${count} موظف دلوقتي — الاختيار بيتحول لأسماء الموظفين وقت الحفظ)` : ''} من مسير {MONTH.test(fromPeriod) ? fromPeriod : '…'}
          {untilPeriod ? ` لحد مسير ${untilPeriod}` : ' لحد ما يتوقف'}. اللي هيبدأ أو هيسيب الشغل في نص الشهر هياخده بنسبة أيام خدمته.
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

export default PayrollRecurringAllowances
