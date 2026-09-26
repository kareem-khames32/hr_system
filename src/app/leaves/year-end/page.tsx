'use client'

import { Fragment, useEffect, useMemo, useRef, useState, type ReactNode } from 'react'
import Link from 'next/link'
import { AlertTriangle, CalendarCheck, CheckCircle2, Hourglass, Layers, Lock, RefreshCw, Search, Wallet, X } from 'lucide-react'
import { MainLayout } from '@/components/layout'
import { OrgTargetPicker, describeOrgTarget, initialOrgTarget, type OrgTarget } from '@/components/OrgTargetPicker'
import { can, fetchBranches, getCurrentUser, lockedBranchIdOf, type ApiBranch } from '@/lib/api'
import { branchScopeOfUser, type BranchScope } from '@/lib/branch-scope'
import { formatDateTime, localToday } from '@/lib/dates'
import { PayrollPeriodSelect, usePayrollMonthContext } from '@/components/DayRangeFilter'
import { formatMoney } from '@/lib/money'
import {
  SETTLEMENT_MODE_LABELS,
  closeLeaveYear,
  fetchYearEndPreview,
  fetchYearEndSettlements,
  settleLeaveBalance,
  type LeaveSettlement,
  type LeaveSettlementMode,
  type YearEndPreview,
  type YearEndRow,
} from '@/lib/leave-year-end-api'

// ===== إقفال سنة الإجازات =====
// لكل موظف في السنة المختارة: المستحق والمستخدم والمتبقي، واللي يترحّل للسنة الجاية (لحد سقف نوع السنوية)
// واللي يسقط، واللي اتسوّى. «تسوية رصيد موظف» تصفّر المتبقي (بدل في المسير أو تصفير بس)،
// و«إقفال السنة» يرحّل للكل أو لفرع ويفتح أرصدة السنة الجديدة — ينفع يتكرر من غير ما يرحّل مرتين.

const THIS_YEAR = Number(localToday().slice(0, 4))
// من 2020 لحد السنة الجاية — سنة قديمة فاتت لازم تفضل قابلة للإقفال
const FIRST_YEAR = 2020
const YEARS = Array.from({ length: THIS_YEAR + 1 - FIRST_YEAR + 1 }, (_, i) => String(FIRST_YEAR + i))
// الافتراضي السنة اللي فاتت — هي اللي بتتقفل عادة
const DEFAULT_YEAR = String(THIS_YEAR - 1)
const days = (v: unknown) => `${Number(v ?? 0)} يوم`

export default function LeaveYearEndPage() {
  const [year, setYear] = useState(DEFAULT_YEAR)
  const [branches, setBranches] = useState<ApiBranch[]>([])
  const [lockedBranchId, setLockedBranchId] = useState<number | null>(null)
  // حساب الفروع المتعددة: يختار فرع منها (الشركة كلها لحساب على مستوى الشركة بس)
  const [branchScope, setBranchScope] = useState<BranchScope>(null)
  const [target, setTarget] = useState<OrgTarget>(() => initialOrgTarget(null, ['company', 'branch']))
  const [preview, setPreview] = useState<YearEndPreview | null>(null)
  const [history, setHistory] = useState<LeaveSettlement[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [notice, setNotice] = useState('')
  const [query, setQuery] = useState('')
  const [onlyOpen, setOnlyOpen] = useState(false)
  const [confirmClose, setConfirmClose] = useState(false)
  const [closing, setClosing] = useState(false)
  const [settling, setSettling] = useState<YearEndRow | null>(null)
  const canManage = can('leave_balances.manage')
  const canPay = can('payroll.calculate')

  useEffect(() => {
    const user = getCurrentUser()
    const locked = lockedBranchIdOf(user)
    const scope = branchScopeOfUser(user)
    setLockedBranchId(locked)
    setBranchScope(scope)
    setTarget(initialOrgTarget(locked, ['company', 'branch'], scope))
    fetchBranches().then(setBranches).catch(() => setBranches([]))
  }, [])

  // الشركة كلها = null؛ فرع لسه ما اتختارش = مانحمّلش
  const branchId = target.level === 'company' ? null : target.branchId
  const ready = target.level === 'company' || target.branchId != null

  const load = async () => {
    if (!ready) { setPreview(null); setHistory([]); setLoading(false); return }
    setLoading(true)
    setError('')
    try {
      // سجل التسويات فيه مبالغ — لإدارة الأرصدة بس
      const [p, h] = await Promise.all([fetchYearEndPreview(year, branchId), canManage ? fetchYearEndSettlements(year, { branchId }) : Promise.resolve([])])
      setPreview(p)
      setHistory(h)
    } catch (e) {
      setError(e instanceof Error ? e.message : 'تعذّر تحميل أرصدة السنة')
      setPreview(null)
    } finally {
      setLoading(false)
    }
  }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  useEffect(() => { load() }, [year, branchId, ready])

  const rows = useMemo(() => {
    const q = query.trim().toLowerCase()
    return (preview?.rows ?? []).filter((r) =>
      (!q || r.employee.fullName.toLowerCase().includes(q) || String(r.employee.employeeCode ?? '').toLowerCase().includes(q)) &&
      (!onlyOpen || (!r.error && (Number(r.settleable ?? 0) > 0 || !r.closed))))
  }, [preview, query, onlyOpen])

  const branchName = (id: number | null | undefined) => branches.find((b) => b.id === id)?.name ?? ''
  const s = preview?.settings
  const totals = preview?.totals

  const runClose = async () => {
    setClosing(true)
    setError('')
    try {
      const r = await closeLeaveYear(year, branchId)
      setNotice(`اتقفلت سنة ${year} لـ${describeOrgTarget(target, branches, [])}: ${r.summary.closed} موظف اتقفل رصيدهم` +
        (r.summary.pending ? `، و${r.summary.pending} لسه` : ''))
      setConfirmClose(false)
      await load()
    } catch (e) {
      setError(e instanceof Error ? e.message : 'تعذّر إقفال السنة')
      setConfirmClose(false)
    } finally {
      setClosing(false)
    }
  }

  return (
    <MainLayout>
      <div className="space-y-6">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold text-gray-800">إقفال سنة الإجازات</h1>
            <p className="text-gray-500 mt-1">المتبقي من الرصيد السنوي في آخر السنة: يترحّل لحد السقف، والباقي يسقط أو يتسوّى</p>
          </div>
          <button type="button" onClick={load} disabled={loading || !ready} className="btn-secondary flex items-center gap-2 disabled:opacity-50">
            <RefreshCw size={16} />
            تحديث
          </button>
        </div>

        <div className="card p-4 space-y-4">
          <div className="flex flex-wrap items-end gap-4">
            <div>
              <label className="label" htmlFor="year-end-year">السنة</label>
              <select id="year-end-year" className="input w-36" value={year} onChange={(e) => setYear(e.target.value)}>
                {[...YEARS].sort().reverse().map((y) => <option key={y} value={y}>{y}</option>)}
              </select>
            </div>
            <div className="relative flex-1 min-w-[220px]">
              <Search size={18} className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400" />
              <input className="input pr-10 w-full" placeholder="بحث بالاسم أو الكود..." value={query} onChange={(e) => setQuery(e.target.value)} />
            </div>
            <label className="flex items-center gap-2 text-sm text-gray-700 pb-2">
              <input type="checkbox" className="w-4 h-4 rounded border-gray-300" checked={onlyOpen} onChange={(e) => setOnlyOpen(e.target.checked)} />
              اللي لسه عليهم حاجة بس
            </label>
          </div>
          <OrgTargetPicker value={target} onChange={setTarget} branches={branches} levels={['company', 'branch']}
            lockedBranchId={lockedBranchId} branchScope={branchScope} disabled={closing} showCount={false} />
          {s && (
            <p className="text-sm text-gray-600 bg-gray-50 rounded-xl p-3">
              الترحيل: {s.carryOverEnabled ? (s.carryOverMaxDays == null ? 'المتبقي كله من غير حد' : `لحد ${Number(s.carryOverMaxDays)} يوم والباقي يسقط`) : 'مقفول — المتبقي كله يسقط'}
              {' · '}الموظف الجديد يستحق سنوي {Number(s.entitlementStartMonths) > 0 ? `بعد ${Number(s.entitlementStartMonths)} شهر من التعيين` : 'من يوم التعيين'}
              {' · '}أول سنة {s.firstYearProrated ? 'بالنسبة والتناسب' : 'كاملة'}
              {can('settings.manage') && <Link href="/leaves/types" className="text-primary-700 hover:underline mr-2">تعديل من أنواع الإجازات</Link>}
            </p>
          )}
        </div>

        {error && (
          <div className="bg-red-50 text-red-700 rounded-xl p-4 flex items-center gap-2" role="alert">
            <AlertTriangle size={18} />
            {error}
          </div>
        )}
        {notice && (
          <div className="bg-success-50 text-success-700 rounded-xl p-4 flex items-center gap-2">
            <CheckCircle2 size={18} />
            {notice}
            <button type="button" className="mr-auto" aria-label="إخفاء" onClick={() => setNotice('')}><X size={16} /></button>
          </div>
        )}

        {preview && totals && (
          <div className="grid grid-cols-2 lg:grid-cols-5 gap-4">
            <Stat icon={<Wallet size={22} className="text-primary-500" />} label="المتبقي" value={days(totals.remaining)} hint={`${totals.employees} موظف`} />
            <Stat icon={<Layers size={22} className="text-purple-500" />} label="يترحّل للسنة الجاية" value={days(totals.carried)} />
            <Stat icon={<Hourglass size={22} className="text-warning-500" />} label="يسقط" value={days(totals.lapsed)} />
            <Stat icon={<CalendarCheck size={22} className="text-success-600" />} label="اتسوّى" value={days(totals.settled)} />
            <Stat icon={<Lock size={22} className="text-gray-500" />} label="مستني الإقفال" value={`${totals.pending} موظف`} hint={`${totals.closed} اتقفل`} />
          </div>
        )}

        {preview && canManage && (
          <div className="card p-4 flex flex-wrap items-center gap-4">
            <div className="flex-1 min-w-[260px]">
              <p className="font-semibold text-gray-800">إقفال سنة {year} — {describeOrgTarget(target, branches, [])}</p>
              <p className="text-sm text-gray-500 mt-1">
                {!preview.ended
                  ? `السنة لسه ما خلصتش — الأرقام لحد النهارده ${preview.today}، والإقفال بعد 31 ديسمبر.`
                  : !preview.canClose
                    ? 'السنة دي اترحّلت على اللي بعدها خلاص — الإقفال للسنة اللي فاتت بس.'
                    : totals && totals.pending === 0
                      ? 'السنة مقفولة للكل. ينفع تعيد الإقفال لو فيه موظف اتضاف — مش هيرحّل مرتين.'
                      : 'بيرحّل المتبقي لحد السقف، والباقي يسقط، ويفتح رصيد السنة الجديدة. الإجازات المعتمدة في السنة الجديدة بتفضل محسوبة.'}
              </p>
            </div>
            <button type="button" className="btn-primary flex items-center gap-2 disabled:opacity-50" disabled={!preview.canClose || closing || loading}
              onClick={() => setConfirmClose(true)}>
              <Lock size={16} />
              إقفال السنة
            </button>
          </div>
        )}

        <div className="card overflow-hidden p-0">
          {!ready ? (
            <p className="text-center py-10 text-gray-500">اختار الفرع الأول</p>
          ) : loading ? (
            <div className="flex items-center justify-center py-16">
              <div className="w-8 h-8 border-2 border-primary-500 border-t-transparent rounded-full animate-spin" />
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="table-header">
                    {['الموظف', 'سنة الرصيد', 'المستحق', 'المستخدم', 'اتسوّى', 'المتبقي', 'يترحّل', 'يسقط', 'الحالة', ''].map((h, i) => (
                      <th key={i} className="table-cell text-right">{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {rows.length === 0 && (
                    <tr><td colSpan={10} className="table-cell text-center text-gray-500 py-10">مفيش موظفين ليهم رصيد سنوي في السنة دي</td></tr>
                  )}
                  {rows.map((r) => (
                    <tr key={r.employee.id} className={`table-row ${r.error ? 'bg-red-50/40' : ''}`}>
                      <td className="table-cell">
                        <p className="font-medium text-gray-800">{r.employee.fullName}</p>
                        <p className="text-xs text-gray-400">{r.employee.employeeCode}{branchName(r.employee.branchId) ? ` • ${branchName(r.employee.branchId)}` : ''}</p>
                        {r.eligibleFrom && <p className="text-[11px] text-amber-700">يستحق من {r.eligibleFrom}</p>}
                        {r.error && <p className="text-[11px] text-red-600">تعذّر حساب رصيده: {r.error}</p>}
                      </td>
                      {r.error ? <td className="table-cell text-gray-400" colSpan={9}>—</td> : (
                        <Fragment>
                          <td className="table-cell text-xs text-gray-600 whitespace-nowrap">{r.periodStart} ← {r.periodEnd}</td>
                          <td className="table-cell" title={`استحقاق السنة ${Number(r.accrued)} + مرحّل ${Number(r.opening)} + تعديل ${Number(r.adjustments)}`}>
                            {Number(r.entitledTotal)}
                            {Number(r.opening) > 0 && <span className="block text-[11px] text-purple-600">منها {Number(r.opening)} مرحّل</span>}
                          </td>
                          <td className="table-cell text-red-600">{Number(r.used)}</td>
                          <td className="table-cell text-success-700">{Number(r.settled) > 0 ? Number(r.settled) : '—'}</td>
                          <td className="table-cell font-bold">
                            {Number(r.remaining)}
                            {Number(r.deficit) > 0 && <span className="block text-[11px] text-red-600">عجز {Number(r.deficit)}</span>}
                          </td>
                          <td className="table-cell text-purple-700">{Number(r.carried)}</td>
                          <td className="table-cell text-warning-700">{Number(r.lapsed)}</td>
                          <td className="table-cell">
                            {r.closed
                              ? <span className="text-xs px-2 py-1 rounded-lg bg-success-50 text-success-700">اتقفلت</span>
                              : r.ended
                                ? <span className="text-xs px-2 py-1 rounded-lg bg-warning-50 text-warning-700">مستنية الإقفال</span>
                                : <span className="text-xs px-2 py-1 rounded-lg bg-gray-100 text-gray-600">جارية</span>}
                          </td>
                          <td className="table-cell">
                            {canManage && Number(r.settleable) > 0 && (
                              <button type="button" className="text-xs font-semibold text-primary-700 hover:underline whitespace-nowrap" onClick={() => setSettling(r)}>
                                تسوية رصيد موظف
                              </button>
                            )}
                          </td>
                        </Fragment>
                      )}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>

        {history.length > 0 && (
          <div className="card overflow-hidden p-0">
            <p className="font-semibold text-gray-800 px-4 pt-4">سجل التسويات — {year}</p>
            <div className="overflow-x-auto">
              <table className="w-full text-sm mt-2">
                <thead>
                  <tr className="table-header">
                    {['الموظف', 'الأيام', 'التسوية', 'المبلغ', 'شهر المسير', 'السبب', 'بواسطة', 'التاريخ'].map((h) => <th key={h} className="table-cell text-right">{h}</th>)}
                  </tr>
                </thead>
                <tbody>
                  {history.map((h) => (
                    <tr key={h.id} className="table-row">
                      <td className="table-cell">{h.employeeName} <span className="text-xs text-gray-400">{h.employeeCode}</span></td>
                      <td className="table-cell">{h.days}</td>
                      <td className="table-cell">{SETTLEMENT_MODE_LABELS[h.mode]}</td>
                      <td className="table-cell">{h.amount != null ? formatMoney(h.amount) : '—'}</td>
                      <td className="table-cell">{h.payrollPeriod ?? '—'}</td>
                      <td className="table-cell max-w-xs">{h.reason}</td>
                      <td className="table-cell">{h.actorName || 'أحد المستخدمين'}</td>
                      <td className="table-cell text-xs text-gray-500 whitespace-nowrap">{formatDateTime(h.createdAt)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </div>

      {confirmClose && preview && totals && (
        <div className="fixed inset-0 z-50 bg-black/50 flex items-center justify-center p-4" role="dialog" aria-modal="true" aria-labelledby="close-year-title">
          <div className="bg-white rounded-2xl max-w-lg w-full p-6 space-y-4">
            <h2 id="close-year-title" className="text-xl font-bold text-gray-800">إقفال سنة {year}</h2>
            <p className="text-sm text-gray-600">{describeOrgTarget(target, branches, [])} — {totals.employees} موظف</p>
            <div className="grid grid-cols-2 gap-3 bg-gray-50 rounded-xl p-4 text-center">
              <div><p className="text-xs text-gray-500">يترحّل للسنة الجديدة</p><p className="font-bold text-xl text-purple-700 mt-1">{days(totals.carried)}</p></div>
              <div><p className="text-xs text-gray-500">يسقط</p><p className="font-bold text-xl text-warning-700 mt-1">{days(totals.lapsed)}</p></div>
            </div>
            <p className="text-xs text-gray-500">لو عايز تصرف بدل للي هيسقط، سوّيه من «تسوية رصيد موظف» قبل أو بعد الإقفال. الإقفال مش هيرحّل مرتين لو اتعاد.</p>
            <div className="flex justify-end gap-3">
              <button type="button" className="btn-secondary" disabled={closing} onClick={() => setConfirmClose(false)}>إلغاء</button>
              <button type="button" className="btn-primary disabled:opacity-50" disabled={closing} onClick={runClose}>{closing ? 'جارٍ الإقفال...' : 'تأكيد الإقفال'}</button>
            </div>
          </div>
        </div>
      )}

      {settling && (
        <SettleDialog year={year} row={settling} canPay={canPay}
          onClose={() => setSettling(null)}
          onDone={async (message) => { setSettling(null); setNotice(message); await load() }} />
      )}
    </MainLayout>
  )
}

function Stat({ icon, label, value, hint }: { icon: ReactNode; label: string; value: string; hint?: string }) {
  return (
    <div className="card p-4 flex items-center gap-3">
      <div className="w-11 h-11 bg-gray-50 rounded-xl flex items-center justify-center">{icon}</div>
      <div>
        <p className="text-sm text-gray-500">{label}</p>
        <p className="text-xl font-bold text-gray-800">{value}</p>
        {hint && <p className="text-xs text-gray-400">{hint}</p>}
      </div>
    </div>
  )
}

// تسوية رصيد موظف: الأيام كلها اللي ينفع تتسوّى (من السيرفر)، بسبب، وصرف بدل في شهر مسير أو تصفير بس
function SettleDialog({ year, row, canPay, onClose, onDone }: {
  year: string
  row: YearEndRow
  canPay: boolean
  onClose: () => void
  onDone: (message: string) => void
}) {
  const [mode, setMode] = useState<LeaveSettlementMode>(canPay ? 'PAID' : 'ZEROED')
  // مسير الصرف بشهره — الافتراضي شهر الرواتب الجاري (بدورة 23 يوم 25 سبتمبر = رواتب أكتوبر) مش الشهر التقويمي، وبأيامه ظاهرة
  const payrollMonth = usePayrollMonthContext()
  const [month, setMonth] = useState('')
  useEffect(() => { if (payrollMonth) setMonth(current => current || payrollMonth.period) }, [payrollMonth])
  const [reason, setReason] = useState('')
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')
  const operation = useRef<{ fingerprint: string; key: string } | null>(null)
  const settleDays = Number(row.settleable ?? 0)
  const carriedAlready = row.closed && Number(row.carried) > 0
  const validReason = reason.trim().length >= 3 && reason.trim().length <= 500
  const validMonth = mode === 'ZEROED' || /^\d{4}-(0[1-9]|1[0-2])$/.test(month)

  const save = async () => {
    if (saving || !validReason || !validMonth) return
    setSaving(true)
    setError('')
    const input = { mode, reason: reason.trim(), payrollPeriod: mode === 'PAID' ? month : null, expectedDays: settleDays }
    const fingerprint = JSON.stringify({ employeeId: row.employee.id, year, ...input })
    if (operation.current?.fingerprint !== fingerprint) operation.current = { fingerprint, key: crypto.randomUUID() }
    try {
      const r = await settleLeaveBalance(year, row.employee.id, { ...input, idempotencyKey: operation.current.key })
      const s = r.settlement
      onDone(s.mode === 'PAID'
        ? `اتسوّى رصيد ${row.employee.fullName}: ${s.days} يوم = ${formatMoney(s.amount)} بدل في مسير ${s.payrollPeriod}`
        : `اتصفّر رصيد ${row.employee.fullName}: ${s.days} يوم`)
    } catch (e) {
      setError(e instanceof Error ? e.message : 'تعذّرت التسوية')
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="fixed inset-0 z-50 bg-black/50 flex items-center justify-center p-4" role="dialog" aria-modal="true" aria-labelledby="settle-title">
      <div className="bg-white rounded-2xl max-w-lg w-full max-h-[90vh] overflow-y-auto p-6 space-y-5">
        <div className="flex justify-between items-start gap-4">
          <div>
            <h2 id="settle-title" className="text-xl font-bold text-gray-800">تسوية رصيد موظف</h2>
            <p className="text-sm text-gray-500 mt-1">{row.employee.fullName} • سنة الرصيد {row.periodStart} ← {row.periodEnd}</p>
          </div>
          <button type="button" disabled={saving} aria-label="إغلاق" onClick={onClose} className="p-1 hover:bg-gray-100 rounded-lg disabled:opacity-40"><X size={20} /></button>
        </div>
        <div className="bg-gray-50 rounded-xl p-4 text-center">
          <p className="text-xs text-gray-500">الأيام اللي هتتسوّى والرصيد يبقى صفر</p>
          <p className="font-bold text-2xl text-primary-700 mt-1">{days(settleDays)}</p>
          {carriedAlready && <p className="text-xs text-purple-700 mt-2">السنة اتقفلت و{Number(row.carried)} يوم اترحّلوا لرصيد السنة الجديدة — التسوية على اللي سقط بس.</p>}
        </div>
        <div className="space-y-2">
          <label className="flex items-start gap-2 text-sm">
            <input type="radio" name="settle-mode" className="mt-1" checked={mode === 'PAID'} disabled={!canPay || saving} onChange={() => setMode('PAID')} />
            <span>
              <span className="font-medium text-gray-800">صرف بدل في المسير</span>
              <span className="block text-xs text-gray-500">الأيام × الراتب الشامل ÷ 30، ويظهر في القسيمة «بدل» في الشهر اللي تختاره.{!canPay && ' (محتاج صلاحية حساب الرواتب)'}</span>
            </span>
          </label>
          <label className="flex items-start gap-2 text-sm">
            <input type="radio" name="settle-mode" className="mt-1" checked={mode === 'ZEROED'} disabled={saving} onChange={() => setMode('ZEROED')} />
            <span>
              <span className="font-medium text-gray-800">تصفير بس</span>
              <span className="block text-xs text-gray-500">الرصيد يتصفّر من غير فلوس.</span>
            </span>
          </label>
        </div>
        {mode === 'PAID' && (
          <PayrollPeriodSelect id="settle-month" label="شهر المسير" value={month} onChange={setMonth} disabled={saving}
            cycleStartDay={payrollMonth?.cycleStartDay} today={payrollMonth?.today} />
        )}
        <div>
          <label className="label" htmlFor="settle-reason">السبب</label>
          <textarea id="settle-reason" rows={3} maxLength={500} className="input w-full" value={reason} disabled={saving}
            onChange={(e) => setReason(e.target.value)} placeholder="مثلًا: صرف رصيد نهاية السنة بموافقة الإدارة" />
        </div>
        {error && <div role="alert" className="rounded-xl bg-red-50 p-3 text-sm text-red-700">{error}</div>}
        <div className="flex justify-end gap-3">
          <button type="button" className="btn-secondary" disabled={saving} onClick={onClose}>إلغاء</button>
          <button type="button" className="btn-primary disabled:opacity-50" disabled={saving || !validReason || !validMonth || !(settleDays > 0)} onClick={save}>
            {saving ? 'جارٍ التسوية...' : mode === 'PAID' ? 'تأكيد الصرف' : 'تأكيد التصفير'}
          </button>
        </div>
      </div>
    </div>
  )
}
