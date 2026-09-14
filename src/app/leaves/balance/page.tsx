'use client'

import { downloadCsv } from '@/lib/csv'
import { localToday } from '@/lib/dates'
import { useLeaveCatalog } from '@/lib/leave-catalog'
import { Fragment, useEffect, useRef, useState } from 'react'
import { MainLayout } from '@/components/layout'
import {
  Search,
  Calendar,
  AlertTriangle,
  ChevronDown,
  Wallet,
  Clock,
  Plus,
  Minus,
  Download,
  Layers,
  Hourglass,
  X,
  RefreshCw,
} from 'lucide-react'
import {
  adjustLeaveBalance,
  ApiError,
  can,
  fetchBalancesBulk,
  fetchBranches,
  fetchDepartments,
  type ApiEmployeeBalances,
  type ApiBalance,
  type ApiBranch,
  type ApiDepartment,
  type ApiBalanceAdjustment,
} from '@/lib/api'

// ===== نموذج الرصيد بالطبقات — كما يحسبه السيرفر =====
// opening: الرصيد الافتتاحي المُرحّل (أيام/مستهلك/صلاحية/ساقط)
// entitled/entitledTaken: استحقاق السنة ومستهلكه — remaining: المتبقي النهائي

const TODAY = localToday()

interface EmployeeRow {
  emp: ApiEmployeeBalances['employee']
  balances: ApiBalance[]
  // تعذّر حساب رصيد هذا الموظف على السيرفر — يظهر خطأ في صفّه مش «—» كأنه بلا رصيد
  error?: string
}

// رصيد نوع معيّن من قائمة أرصدة الموظف
const balanceOf = (row: EmployeeRow, type: string): ApiBalance | undefined =>
  row.balances.find((b) => b.balanceType.toLowerCase() === type)

const remainingOf = (b?: ApiBalance) => (b ? Number(b.remaining) : 0)
const openingAvailable = (b?: ApiBalance) => (b ? Number(b.opening.available) : 0)

const expiringSoon = (b?: ApiBalance): boolean => {
  if (!b || !b.opening.expiry || b.opening.expired || Number(b.opening.available) <= 0)
    return false
  const diff =
    (new Date(b.opening.expiry).getTime() - new Date(TODAY).getTime()) /
    (1000 * 60 * 60 * 24)
  return diff > 0 && diff <= 90
}

export default function LeaveBalancesPage() {
  const leaveCatalog = useLeaveCatalog()
  const [rows, setRows] = useState<EmployeeRow[]>([])
  const [branches, setBranches] = useState<ApiBranch[]>([])
  const [departments, setDepartments] = useState<ApiDepartment[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [searchQuery, setSearchQuery] = useState('')
  const [filterBranch, setFilterBranch] = useState('')
  const [expanded, setExpanded] = useState<number | null>(null)
  const [adjustingEmployeeId, setAdjustingEmployeeId] = useState<number | null>(null)
  const [adjustType, setAdjustType] = useState('')
  const [adjustDelta, setAdjustDelta] = useState('')
  const [adjustReason, setAdjustReason] = useState('')
  const [adjustError, setAdjustError] = useState('')
  const [savingAdjustment, setSavingAdjustment] = useState(false)
  const [savedAdjustment, setSavedAdjustment] = useState<{ employeeName: string; audit: ApiBalanceAdjustment } | null>(null)
  const adjustmentBusy = useRef(false)
  const adjustmentOperation = useRef<{ fingerprint: string; key: string } | null>(null)
  const canAdjust = can('leave_balances.manage')
  const currentPeriod = String(new Date().getFullYear())

  const refreshBalances = async () => {
    setLoading(true)
    setError('')
    try {
      const list = await fetchBalancesBulk()
      setRows(list.map((r) => ({ emp: r.employee, balances: r.balances, error: r.error })))
    } catch (e) {
      setError(e instanceof Error ? e.message : 'تعذر تحديث الأرصدة')
    } finally {
      setLoading(false)
    }
  }

  const openAdjustment = (row: EmployeeRow) => {
    if (!canAdjust || row.error || adjustmentBusy.current) return
    const available = row.balances.filter((balance) => balance.period === currentPeriod)
    if (!available.length) return
    setAdjustingEmployeeId(row.emp.id)
    setAdjustType(available.find((balance) => balance.balanceType === 'annual')?.balanceType ?? available[0].balanceType)
    setAdjustDelta('')
    setAdjustReason('')
    setAdjustError('')
    adjustmentOperation.current = null
  }

  const adjustingEmployee = rows.find((row) => row.emp.id === adjustingEmployeeId)
  const adjustableBalances = adjustingEmployee?.balances.filter((balance) => balance.period === currentPeriod) ?? []
  const selectedBalance = adjustableBalances.find((balance) => balance.balanceType === adjustType)
  const deltaNumber = Number(adjustDelta)
  const validDelta = adjustDelta.trim() !== '' && Number.isFinite(deltaNumber) && deltaNumber !== 0 && Math.abs(deltaNumber) <= 9999.99 && Math.abs(deltaNumber * 100 - Math.round(deltaNumber * 100)) < 0.000001
  const beforeAdjustment = selectedBalance ? Number(selectedBalance.remaining) - Number(selectedBalance.deficit ?? 0) : 0
  const projectedRemaining = Math.round((beforeAdjustment + (validDelta ? deltaNumber : 0)) * 100) / 100
  const validReason = adjustReason.trim().length >= 3 && adjustReason.trim().length <= 500

  const saveAdjustment = async () => {
    if (adjustmentBusy.current || !canAdjust || !adjustingEmployee || !selectedBalance || !validDelta || !validReason || projectedRemaining < 0) return
    adjustmentBusy.current = true
    setSavingAdjustment(true)
    setAdjustError('')
    const input = {
      balanceType: selectedBalance.balanceType,
      period: selectedBalance.period,
      delta: deltaNumber,
      reason: adjustReason.trim(),
      expectedRemaining: Number(selectedBalance.remaining),
    }
    const fingerprint = JSON.stringify({ employeeId: adjustingEmployee.emp.id, ...input })
    try {
      if (adjustmentOperation.current?.fingerprint !== fingerprint) {
        adjustmentOperation.current = { fingerprint, key: crypto.randomUUID() }
      }
      const result = await adjustLeaveBalance(adjustingEmployee.emp.id, { ...input, idempotencyKey: adjustmentOperation.current.key })
      setSavedAdjustment({ employeeName: adjustingEmployee.emp.fullName, audit: result.adjustment })
      setRows((previous) => previous.map((row) => row.emp.id === adjustingEmployee.emp.id
        ? { ...row, balances: row.balances.map((balance) => balance.balanceType === result.balance.balanceType && balance.period === result.balance.period ? result.balance : balance) }
        : row))
      setAdjustingEmployeeId(null)
      adjustmentOperation.current = null
      await refreshBalances()
    } catch (e) {
      setAdjustError(e instanceof Error ? e.message : 'تعذر حفظ تعديل الرصيد')
      if (e instanceof ApiError && e.status === 409) await refreshBalances()
    } finally {
      adjustmentBusy.current = false
      setSavingAdjustment(false)
    }
  }

  // الموظفون وأرصدتهم (الطبقات محسوبة على السيرفر) من endpoint جماعي واحد بنطاق
  // الفرع (LEV-23) — كان نداء لكل موظف (~180) وأي فشل بيتبلع ويظهر «—» كأنه بلا رصيد
  useEffect(() => {
    const load = async () => {
      try {
        const [list, brs, deps] = await Promise.all([
          fetchBalancesBulk(),
          fetchBranches(),
          fetchDepartments(),
        ])
        setBranches(brs)
        setDepartments(deps)
        setRows(list.map((r) => ({ emp: r.employee, balances: r.balances, error: r.error })))
      } catch (e) {
        setError(e instanceof Error ? e.message : 'تعذر تحميل الأرصدة')
      } finally {
        setLoading(false)
      }
    }
    load()
  }, [])

  const branchName = (id?: number | null) =>
    branches.find((b) => b.id === id)?.name ?? '-'
  const depName = (id?: number) =>
    departments.find((d) => d.id === id)?.name ?? '-'

  const filtered = rows.filter(
    (r) =>
      (r.emp.fullName.includes(searchQuery) ||
        r.emp.employeeCode.toLowerCase().includes(searchQuery.toLowerCase())) &&
      (!filterBranch || String(r.emp.branchId) === filterBranch)
  )

  const balanceTypes = Array.from(new Set(rows.flatMap(row => row.balances.map(balance => balance.balanceType)))).sort()
  const balanceLabel = (source: string) => leaveCatalog.types.find(type => type.balanceSource?.toLowerCase() === source.toLowerCase())?.nameAr ?? ({ annual: 'الرصيد السنوي', sick: 'الرصيد المرضي', casual: 'الرصيد العارض' } as Record<string, string>)[source] ?? source
  const columnCount = 2 + balanceTypes.length * 3
  const stats = {
    totalRemaining: rows.reduce((s, r) => s + remainingOf(balanceOf(r, 'annual')), 0),
    expiring: rows.filter((r) => expiringSoon(balanceOf(r, 'annual'))).length,
    lowBalance: rows.filter(
      (r) => balanceOf(r, 'annual') && remainingOf(balanceOf(r, 'annual')) < 5
    ).length,
    totalOpening: rows.reduce((s, r) => s + openingAvailable(balanceOf(r, 'annual')), 0),
  }

  return (
    <MainLayout>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-gray-800">أرصدة الإجازات</h1>
            <p className="text-gray-500 mt-1">
              الرصيد بطبقاته لكل موظف: المُرحّل + الاستحقاق + التعديلات المسجلة − المستهلك (محسوب من الخادم)
            </p>
          </div>
          <button disabled={loading} onClick={() => downloadCsv('leave-balances.csv', ['الموظف', 'الكود', 'نوع الرصيد', 'السنة', 'استحقاق السنة', 'متراكم', 'افتتاحي ساري', 'صافي التعديلات', 'مستهلك', 'متبقي', 'خطأ'], filtered.flatMap(row => row.balances.length ? row.balances.map(balance => [row.emp.fullName, row.emp.employeeCode, balanceLabel(balance.balanceType), balance.period, balance.annualEntitlement, balance.accruedToDate ?? balance.entitled, balance.opening.available, balance.adjustmentDays ?? 0, balance.totalTaken, balance.remaining, row.error]) : [[row.emp.fullName, row.emp.employeeCode, '', '', '', '', '', '', '', '', row.error]]))} className="btn-secondary flex items-center gap-2">
            <Download size={18} />
            تصدير الأرصدة
          </button>
        </div>

        {savedAdjustment && (
          <div role="status" className="bg-green-50 text-green-800 rounded-xl p-4 flex items-start justify-between gap-3">
            <div>
              <p className="font-semibold">حُفظ تعديل رصيد {savedAdjustment.employeeName} — {balanceLabel(savedAdjustment.audit.balanceType)}</p>
              <p className="text-sm mt-1">قبل: {Number(savedAdjustment.audit.beforeRemaining)} يوم • التعديل: {Number(savedAdjustment.audit.delta) > 0 ? '+' : ''}{Number(savedAdjustment.audit.delta)} • بعد: {Number(savedAdjustment.audit.afterRemaining)} يوم</p>
              <p className="text-xs mt-1">سجل التدقيق #{savedAdjustment.audit.id} • السبب: {savedAdjustment.audit.reason}</p>
            </div>
            <button type="button" aria-label="إخفاء نتيجة التعديل" onClick={() => setSavedAdjustment(null)}><X size={18} /></button>
          </div>
        )}

        {/* Stats */}
        <div className="grid grid-cols-4 gap-4">
          <div className="card p-4 flex items-center gap-3">
            <div className="w-12 h-12 bg-primary-50 rounded-xl flex items-center justify-center">
              <Wallet size={24} className="text-primary-500" />
            </div>
            <div>
              <p className="text-sm text-gray-500">إجمالي المتبقي (سنوية)</p>
              <p className="text-2xl font-bold text-gray-800">{stats.totalRemaining} يوم</p>
            </div>
          </div>
          <div className="card p-4 flex items-center gap-3">
            <div className="w-12 h-12 bg-purple-100 rounded-xl flex items-center justify-center">
              <Layers size={24} className="text-purple-500" />
            </div>
            <div>
              <p className="text-sm text-gray-500">أرصدة مُرحّلة سارية</p>
              <p className="text-2xl font-bold text-purple-600">{stats.totalOpening} يوم</p>
            </div>
          </div>
          <div className="card p-4 flex items-center gap-3">
            <div className="w-12 h-12 bg-warning-50 rounded-xl flex items-center justify-center">
              <Hourglass size={24} className="text-warning-500" />
            </div>
            <div>
              <p className="text-sm text-gray-500">مُرحّل ينتهي خلال 90 يوم</p>
              <p className="text-2xl font-bold text-warning-600">{stats.expiring} موظف</p>
            </div>
          </div>
          <div className="card p-4 flex items-center gap-3">
            <div className="w-12 h-12 bg-red-100 rounded-xl flex items-center justify-center">
              <AlertTriangle size={24} className="text-red-500" />
            </div>
            <div>
              <p className="text-sm text-gray-500">رصيد منخفض (&lt; 5 أيام)</p>
              <p className="text-2xl font-bold text-red-600">{stats.lowBalance} موظف</p>
            </div>
          </div>
        </div>

        {/* Error Banner */}
        {error && (
          <div className="bg-red-50 text-red-700 rounded-xl p-4 flex items-center gap-2">
            <AlertTriangle size={18} />
            {error}
            <button type="button" disabled={loading} onClick={refreshBalances} className="mr-auto underline flex items-center gap-1"><RefreshCw size={14} />إعادة المحاولة</button>
          </div>
        )}
        {/* موظفون تعذّر حساب أرصدتهم على السيرفر — مش «بلا رصيد» */}
        {rows.some((r) => r.error) && (
          <div className="bg-red-50 text-red-700 rounded-xl p-4 flex items-center gap-2">
            <AlertTriangle size={18} />
            تعذّر حساب رصيد {rows.filter((r) => r.error).length} موظف — السبب ظاهر في صف كل موظف
          </div>
        )}

        {/* Filters */}
        <div className="card p-4">
          <div className="flex items-center gap-3">
            <div className="relative flex-1">
              <Search
                size={18}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400"
              />
              <input
                type="text"
                placeholder="بحث بالاسم أو الكود..."
                className="input pr-10 w-full"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
              />
            </div>
            <select
              value={filterBranch}
              onChange={(e) => setFilterBranch(e.target.value)}
              className="input w-56"
            >
              <option value="">كل الفروع</option>
              {branches.map((b) => (
                <option key={b.id} value={b.id}>
                  {b.name}
                </option>
              ))}
            </select>
          </div>
        </div>

        {/* Balances Table */}
        <div className="card overflow-hidden p-0">
          {loading ? (
            <div className="flex items-center justify-center py-16">
              <div className="w-8 h-8 border-2 border-primary-500 border-t-transparent rounded-full animate-spin" />
            </div>
          ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="table-header">
                  <th className="text-right px-4 py-3">الموظف</th>
                  {balanceTypes.map(source => <th key={source} className="text-center px-4 py-3" colSpan={3}>{balanceLabel(source)}<span className="block text-xs font-normal">مستحق السنة | مستهلك | متبقي</span></th>)}
                  <th className="text-center px-4 py-3">مُرحّل سنوي ساري</th>
                </tr>
              </thead>
              <tbody>
                {filtered.length === 0 && (
                  <tr>
                    <td colSpan={columnCount} className="text-center py-10 text-gray-400">
                      {error ? 'تعذّر تحميل الأرصدة — راجع رسالة الخطأ أعلاه' : 'لا توجد أرصدة لعرضها'}
                    </td>
                  </tr>
                )}
                {filtered.map((row) => {
                  const emp = row.emp
                  const annual = balanceOf(row, 'annual')
                  const sick = balanceOf(row, 'sick')
                  const casual = balanceOf(row, 'casual')
                  const annRem = remainingOf(annual)
                  const openRem = openingAvailable(annual)
                  const isOpen = expanded === emp.id
                  return (
                    <Fragment key={emp.id}>
                      <tr
                        key={emp.id}
                        className={`table-row cursor-pointer ${isOpen ? 'bg-primary-50/30' : ''} ${row.error ? 'bg-red-50/40' : ''}`}
                        onClick={() => setExpanded(isOpen ? null : emp.id)}
                      >
                        <td className="table-cell">
                          <div className="flex items-center gap-3">
                            <ChevronDown
                              size={16}
                              className={`text-gray-400 transition-transform ${isOpen ? 'rotate-180' : ''}`}
                            />
                            <div className="w-10 h-10 bg-gradient-to-br from-primary-400 to-primary-600 rounded-xl flex items-center justify-center text-white font-bold">
                              {emp.fullName.charAt(0)}
                            </div>
                            <div>
                              <p className="font-medium text-gray-800">{emp.fullName}</p>
                              <p className="text-xs text-gray-400">
                                {depName(emp.departmentId)} • {branchName(emp.branchId)}
                              </p>
                              {canAdjust && <button type="button" disabled={loading || savingAdjustment || !!row.error || !row.balances.some((balance) => balance.period === currentPeriod)} onClick={(event) => { event.stopPropagation(); openAdjustment(row) }} className="mt-2 text-xs font-semibold text-primary-700 hover:underline disabled:opacity-40 flex items-center gap-1"><Plus size={12} /><Minus size={12} />تعديل الرصيد</button>}
                              {row.error && (
                                <p className="text-[11px] font-medium text-red-600 flex items-center gap-1 mt-0.5">
                                  <AlertTriangle size={11} />
                                  تعذّر حساب رصيده: {row.error}
                                </p>
                              )}
                            </div>
                          </div>
                        </td>
                        {balanceTypes.map(source => {
                          const balance = row.balances.find(item => item.balanceType === source)
                          return <Fragment key={source}><td className="table-cell text-center text-sm">{balance ? Number(balance.annualEntitlement ?? balance.entitled) : '—'}{balance && balance.accruedToDate != null && <span className="block text-xs text-gray-500">متراكم {Number(balance.accruedToDate)}</span>}</td><td className="table-cell text-center text-sm text-red-600">{balance ? Number(balance.totalTaken) : '—'}</td><td className="table-cell text-center font-bold">{balance ? Number(balance.remaining) : '—'}{balance && Number(balance.deficit ?? 0) > 0 && <span className="block text-xs text-red-600">عجز {Number(balance.deficit)}</span>}</td></Fragment>
                        })}
                        {/* المرحّل */}
                        <td className="table-cell text-center">
                          {openRem > 0 ? (
                            <div>
                              <span className="font-bold text-purple-600">+{openRem}</span>
                              {expiringSoon(annual) && (
                                <p className="text-[10px] text-warning-600">
                                  ينتهي {annual?.opening.expiry}
                                </p>
                              )}
                            </div>
                          ) : (
                            <span className="text-gray-300">—</span>
                          )}
                        </td>

                      </tr>

                      {/* التفصيل بالطبقات — قيم السيرفر */}
                      {isOpen && annual && (
                        <tr key={emp.id + '-detail'}>
                          <td colSpan={columnCount} className="bg-gray-50/60 px-6 py-4">
                            <div className="grid grid-cols-4 gap-4">
                              <div className="p-4 bg-purple-50 rounded-xl border border-purple-100">
                                <div className="flex items-center gap-2 mb-2">
                                  <Layers size={16} className="text-purple-500" />
                                  <p className="text-sm font-bold text-purple-800">
                                    الرصيد الافتتاحي المُرحّل
                                  </p>
                                </div>
                                <p className="text-2xl font-bold text-purple-700">
                                  {Number(annual.opening.available)} يوم
                                </p>
                                <p className="text-xs text-purple-600 mt-1">
                                  أصله {Number(annual.opening.days)} − استهلك{' '}
                                  {Number(annual.opening.taken)}
                                </p>
                                <p className="text-xs mt-1 font-medium text-purple-700">
                                  {annual.opening.expiry
                                    ? `صالح حتى ${annual.opening.expiry}`
                                    : 'بدون تاريخ انتهاء'}
                                  {annual.opening.expired && (
                                    <span className="text-red-600"> — سقط بانتهاء صلاحيته</span>
                                  )}
                                </p>
                              </div>

                              <div className="p-4 bg-blue-50 rounded-xl border border-blue-100">
                                <div className="flex items-center gap-2 mb-2">
                                  <Clock size={16} className="text-blue-500" />
                                  <p className="text-sm font-bold text-blue-800">
                                    استحقاق السنة {annual.period}
                                  </p>
                                </div>
                                <p className="text-2xl font-bold text-blue-700">
                                  {Number(annual.annualEntitlement ?? annual.entitled)} يوم
                                </p>
                                <p className="text-xs text-blue-600 mt-1">
                                  المتراكم حتى اليوم:{' '}
                                  {Number(annual.accruedToDate ?? annual.entitled)} يوم
                                </p>
                                <p className="text-xs text-blue-500 mt-1">
                                  تاريخ التعيين: {emp.joinDate ?? '-'}
                                </p>
                              </div>

                              <div className="p-4 bg-red-50 rounded-xl border border-red-100">
                                <div className="flex items-center gap-2 mb-2">
                                  <Calendar size={16} className="text-red-500" />
                                  <p className="text-sm font-bold text-red-800">المستهلك</p>
                                </div>
                                <p className="text-2xl font-bold text-red-700">
                                  {Number(annual.totalTaken)} يوم
                                </p>
                                <p className="text-xs text-red-600 mt-1">
                                  {Number(annual.opening.taken)} من المُرحّل (يُستهلك أولاً) +{' '}
                                  {Number(annual.entitledTaken)} من الاستحقاق
                                </p>
                              </div>

                              <div className="p-4 bg-success-50 rounded-xl border border-success-100">
                                <div className="flex items-center gap-2 mb-2">
                                  <Wallet size={16} className="text-success-600" />
                                  <p className="text-sm font-bold text-success-800">
                                    المتبقي الآن
                                  </p>
                                </div>
                                <p className="text-2xl font-bold text-success-700">
                                  {Number(annual.remaining)} يوم
                                </p>
                                <p className="text-xs text-success-600 mt-1">
                                  {Number(annual.opening.available)} مُرحّل ساري + {Number(annual.entitled)} متراكم + {Number(annual.adjustmentDays ?? 0)} تعديل − {Number(annual.entitledTaken)} مستهلك من الاستحقاق
                                </p>
                              </div>
                            </div>
                          </td>
                        </tr>
                      )}
                    </Fragment>
                  )
                })}
              </tbody>
            </table>
          </div>
          )}
        </div>
      </div>
      {adjustingEmployee && (
        <div className="fixed inset-0 z-50 bg-black/50 flex items-center justify-center p-4" role="dialog" aria-modal="true" aria-labelledby="balance-adjust-title">
          <div className="bg-white rounded-2xl max-w-lg w-full max-h-[90vh] overflow-y-auto p-6 space-y-5">
            <div className="flex justify-between items-start gap-4">
              <div><h2 id="balance-adjust-title" className="text-xl font-bold text-gray-800">تعديل رصيد الإجازات</h2><p className="text-sm text-gray-500 mt-1">{adjustingEmployee.emp.fullName} • السنة {currentPeriod}</p></div>
              <button type="button" disabled={savingAdjustment} aria-label="إغلاق تعديل الرصيد" onClick={() => setAdjustingEmployeeId(null)} className="p-1 hover:bg-gray-100 rounded-lg disabled:opacity-40"><X size={20} /></button>
            </div>
            <div><label className="label" htmlFor="adjust-balance-type">نوع الرصيد</label><select id="adjust-balance-type" disabled={savingAdjustment} value={adjustType} onChange={(event) => setAdjustType(event.target.value)} className="input w-full">{adjustableBalances.map((balance) => <option key={balance.balanceType} value={balance.balanceType}>{balanceLabel(balance.balanceType)}</option>)}</select></div>
            <div><label className="label" htmlFor="adjust-balance-delta">فرق الأيام</label><input id="adjust-balance-delta" type="number" step="0.01" min="-9999.99" max="9999.99" disabled={savingAdjustment} value={adjustDelta} onChange={(event) => setAdjustDelta(event.target.value)} className="input w-full" dir="ltr" placeholder="2 أو -1.5" /><p className="text-xs text-gray-500 mt-1">موجب لإضافة أيام، وسالب لخصمها. حتى منزلتين عشريتين.</p></div>
            <div><label className="label" htmlFor="adjust-balance-reason">سبب التعديل</label><textarea id="adjust-balance-reason" rows={3} minLength={3} maxLength={500} disabled={savingAdjustment} value={adjustReason} onChange={(event) => setAdjustReason(event.target.value)} className="input w-full" placeholder="وضح سبب التصحيح ليُحفظ في سجل التدقيق" /></div>
            <div className="grid grid-cols-2 gap-3 bg-gray-50 rounded-xl p-4 text-center"><div><p className="text-xs text-gray-500">الرصيد قبل التعديل</p><p className="font-bold text-xl mt-1">{beforeAdjustment} يوم</p></div><div><p className="text-xs text-gray-500">المتوقع بعد التعديل</p><p className={`font-bold text-xl mt-1 ${projectedRemaining < 0 ? 'text-red-600' : 'text-primary-700'}`}>{validDelta ? `${projectedRemaining} يوم` : '—'}</p></div></div>
            {projectedRemaining < 0 && <p className="text-sm text-red-600">لا يمكن أن يصبح الرصيد بعد التعديل سالبًا.</p>}
            {adjustError && <div role="alert" className="rounded-xl bg-red-50 p-3 text-sm text-red-700">{adjustError}</div>}
            <p className="text-xs text-gray-500">يُحفظ التعديل باسم حسابك مع السبب والرصيد قبل وبعد. يتحقق الخادم من الرصيد الحالي عند الحفظ.</p>
            <div className="flex justify-end gap-3"><button type="button" disabled={savingAdjustment} onClick={() => setAdjustingEmployeeId(null)} className="btn-secondary">إلغاء</button><button type="button" disabled={savingAdjustment || loading || !selectedBalance || !validDelta || !validReason || projectedRemaining < 0} onClick={saveAdjustment} className="btn-primary disabled:opacity-50">{savingAdjustment ? 'جارٍ حفظ التعديل...' : 'تأكيد تعديل الرصيد'}</button></div>
          </div>
        </div>
      )}
    </MainLayout>
  )
}
