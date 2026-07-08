'use client'

import { useEffect, useState } from 'react'
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
} from 'lucide-react'
import {
  fetchEmployees,
  fetchEmployeeBalances,
  fetchBranches,
  fetchDepartments,
  type ApiEmployee,
  type ApiBalance,
  type ApiBranch,
  type ApiDepartment,
} from '@/lib/api'

// ===== نموذج الرصيد بالطبقات — كما يحسبه السيرفر =====
// opening: الرصيد الافتتاحي المُرحّل (أيام/مستهلك/صلاحية/ساقط)
// entitled/entitledTaken: استحقاق السنة ومستهلكه — remaining: المتبقي النهائي

const TODAY = new Date().toISOString().slice(0, 10)

interface EmployeeRow {
  emp: ApiEmployee
  balances: ApiBalance[]
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
  const [rows, setRows] = useState<EmployeeRow[]>([])
  const [branches, setBranches] = useState<ApiBranch[]>([])
  const [departments, setDepartments] = useState<ApiDepartment[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [searchQuery, setSearchQuery] = useState('')
  const [filterBranch, setFilterBranch] = useState('')
  const [expanded, setExpanded] = useState<number | null>(null)

  // الموظفون + أرصدة كل موظف من السيرفر (الطبقات محسوبة هناك)
  useEffect(() => {
    const load = async () => {
      try {
        const [emps, brs, deps] = await Promise.all([
          fetchEmployees(),
          fetchBranches(),
          fetchDepartments(),
        ])
        setBranches(brs)
        setDepartments(deps)
        const balancesPerEmp = await Promise.all(
          emps.map((e) =>
            fetchEmployeeBalances(e.id).catch(() => [] as ApiBalance[])
          )
        )
        setRows(emps.map((emp, i) => ({ emp, balances: balancesPerEmp[i] })))
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
              الرصيد بطبقاته لكل موظف: المُرحّل بصلاحيته + استحقاق السنة − المستهلك (محسوب من السيرفر)
            </p>
          </div>
          <button className="btn-secondary flex items-center gap-2">
            <Download size={18} />
            تصدير الأرصدة
          </button>
        </div>

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
                  <th className="text-center px-4 py-3" colSpan={3}>
                    السنوية (مستحق | مستهلك | متبقي)
                  </th>
                  <th className="text-center px-4 py-3" colSpan={3}>
                    المرضية
                  </th>
                  <th className="text-center px-4 py-3" colSpan={3}>
                    الطارئة
                  </th>
                  <th className="text-center px-4 py-3">مُرحّل</th>
                  <th className="text-center px-4 py-3">إجراءات</th>
                </tr>
              </thead>
              <tbody>
                {filtered.length === 0 && (
                  <tr>
                    <td colSpan={12} className="text-center py-10 text-gray-400">
                      لا توجد أرصدة لعرضها
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
                    <>
                      <tr
                        key={emp.id}
                        className={`table-row cursor-pointer ${isOpen ? 'bg-primary-50/30' : ''}`}
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
                            </div>
                          </div>
                        </td>
                        {/* السنوية */}
                        <td className="table-cell text-center text-sm text-gray-500">
                          {annual ? Number(annual.entitled) : '—'}
                        </td>
                        <td className="table-cell text-center text-sm text-red-500">
                          {annual ? Number(annual.totalTaken) : '—'}
                        </td>
                        <td className="table-cell text-center">
                          {annual ? (
                            <span
                              className={`font-bold ${annRem < 5 ? 'text-red-600' : 'text-success-600'}`}
                            >
                              {annRem}
                            </span>
                          ) : (
                            <span className="text-gray-300">—</span>
                          )}
                        </td>
                        {/* المرضية */}
                        <td className="table-cell text-center text-sm text-gray-500">
                          {sick ? Number(sick.entitled) : '—'}
                        </td>
                        <td className="table-cell text-center text-sm text-red-500">
                          {sick ? Number(sick.totalTaken) : '—'}
                        </td>
                        <td className="table-cell text-center font-bold text-gray-700">
                          {sick ? remainingOf(sick) : <span className="text-gray-300">—</span>}
                        </td>
                        {/* الطارئة */}
                        <td className="table-cell text-center text-sm text-gray-500">
                          {casual ? Number(casual.entitled) : '—'}
                        </td>
                        <td className="table-cell text-center text-sm text-red-500">
                          {casual ? Number(casual.totalTaken) : '—'}
                        </td>
                        <td className="table-cell text-center font-bold text-gray-700">
                          {casual ? remainingOf(casual) : <span className="text-gray-300">—</span>}
                        </td>
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
                        {/* إجراءات — التعديل اليدوي يتم عبر محرك الطلبات */}
                        <td className="table-cell text-center">
                          <div
                            className="flex items-center justify-center gap-1"
                            onClick={(e) => e.stopPropagation()}
                          >
                            <button
                              disabled
                              className="p-1.5 bg-success-50 text-success-600 rounded-lg opacity-40 cursor-not-allowed"
                              title="تعديل الرصيد يتم عبر محرك الطلبات"
                            >
                              <Plus size={14} />
                            </button>
                            <button
                              disabled
                              className="p-1.5 bg-red-50 text-red-600 rounded-lg opacity-40 cursor-not-allowed"
                              title="تعديل الرصيد يتم عبر محرك الطلبات"
                            >
                              <Minus size={14} />
                            </button>
                          </div>
                        </td>
                      </tr>

                      {/* التفصيل بالطبقات — قيم السيرفر */}
                      {isOpen && annual && (
                        <tr key={emp.id + '-detail'}>
                          <td colSpan={12} className="bg-gray-50/60 px-6 py-4">
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
                                  {Number(annual.entitled)} يوم
                                </p>
                                <p className="text-xs text-blue-600 mt-1">
                                  استحقاق الفترة {annual.period}
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
                                  {Number(annual.opening.available)} مُرحّل ساري +{' '}
                                  {Math.max(0, Number(annual.entitled) - Number(annual.entitledTaken))}{' '}
                                  من الاستحقاق
                                </p>
                              </div>
                            </div>
                          </td>
                        </tr>
                      )}
                    </>
                  )
                })}
              </tbody>
            </table>
          </div>
          )}
        </div>
      </div>
    </MainLayout>
  )
}
