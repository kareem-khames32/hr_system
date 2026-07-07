'use client'

import { useState } from 'react'
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
  X,
  Download,
  Layers,
  Hourglass,
} from 'lucide-react'
import { branches as branchOptions, getBranchName } from '@/data/branches'

// ===== نموذج الرصيد بالطبقات =====
interface LeaveTypeBalance {
  entitled: number // الاستحقاق السنوي الكامل
  accrued: number // المتراكم فعلياً حتى اليوم (من تاريخ التعيين/بداية السنة)
  used: number // المستهلك
}

interface EmployeeBalances {
  id: string
  name: string
  avatar: string
  department: string
  branchId: string
  joinDate: string
  accrualRate: number // يوم/شهر
  // الرصيد الافتتاحي المُرحّل (من نظام سابق أو ترحيل سنوي)
  opening: {
    days: number
    usedFromOpening: number
    expiry: string | null // null = بلا انتهاء
  }
  annual: LeaveTypeBalance
  sick: LeaveTypeBalance
  emergency: LeaveTypeBalance
}

const TODAY = '2026-07-07'

const initialBalances: EmployeeBalances[] = [
  {
    id: 'EMP001',
    name: 'أحمد محمد علي',
    avatar: 'أ',
    department: 'تقنية المعلومات',
    branchId: '1',
    joinDate: '2023-03-15',
    accrualRate: 1.75,
    opening: { days: 6, usedFromOpening: 2, expiry: '2026-12-31' },
    annual: { entitled: 21, accrued: 10.5, used: 8 },
    sick: { entitled: 30, accrued: 30, used: 2 },
    emergency: { entitled: 5, accrued: 5, used: 1 },
  },
  {
    id: 'EMP006',
    name: 'سارة أحمد الزهراني',
    avatar: 'س',
    department: 'الموارد البشرية',
    branchId: '1',
    joinDate: '2022-01-10',
    accrualRate: 1.75,
    opening: { days: 10, usedFromOpening: 10, expiry: '2026-06-30' },
    annual: { entitled: 21, accrued: 10.5, used: 9 },
    sick: { entitled: 30, accrued: 30, used: 0 },
    emergency: { entitled: 5, accrued: 5, used: 2 },
  },
  {
    id: 'EMP007',
    name: 'خالد عبدالعزيز النمر',
    avatar: 'خ',
    department: 'المالية',
    branchId: '1',
    joinDate: '2024-06-01',
    accrualRate: 1.75,
    opening: { days: 0, usedFromOpening: 0, expiry: null },
    annual: { entitled: 21, accrued: 10.5, used: 10 },
    sick: { entitled: 30, accrued: 30, used: 5 },
    emergency: { entitled: 5, accrued: 5, used: 4 },
  },
  {
    id: 'EMP008',
    name: 'نورة سعيد الغامدي',
    avatar: 'ن',
    department: 'التسويق',
    branchId: '2',
    joinDate: '2021-09-20',
    accrualRate: 2.5, // 30 يوم/سنة بعد 5 سنوات خدمة
    opening: { days: 12, usedFromOpening: 4, expiry: '2026-09-30' },
    annual: { entitled: 30, accrued: 15, used: 6 },
    sick: { entitled: 30, accrued: 30, used: 1 },
    emergency: { entitled: 5, accrued: 5, used: 0 },
  },
  {
    id: 'EMP009',
    name: 'عمر ياسر الشهري',
    avatar: 'ع',
    department: 'المبيعات',
    branchId: '2',
    joinDate: '2025-11-01',
    accrualRate: 1.75,
    opening: { days: 15, usedFromOpening: 3, expiry: '2026-12-31' },
    annual: { entitled: 21, accrued: 14, used: 4 },
    sick: { entitled: 30, accrued: 30, used: 0 },
    emergency: { entitled: 5, accrued: 5, used: 1 },
  },
  {
    id: 'EMP010',
    name: 'ليلى حسن العتيبي',
    avatar: 'ل',
    department: 'تقنية المعلومات',
    branchId: '3',
    joinDate: '2023-02-01',
    accrualRate: 1.75,
    opening: { days: 4, usedFromOpening: 0, expiry: '2026-08-15' },
    annual: { entitled: 21, accrued: 10.5, used: 12 },
    sick: { entitled: 30, accrued: 30, used: 8 },
    emergency: { entitled: 5, accrued: 5, used: 3 },
  },
]

// المتبقي من المُرحّل (يسقط بعد انتهاء صلاحيته)
const openingRemaining = (e: EmployeeBalances): number => {
  if (e.opening.expiry && e.opening.expiry < TODAY) return 0
  return Math.max(0, e.opening.days - e.opening.usedFromOpening)
}

// المتبقي الكلي للسنوية = المُرحّل الساري + المتراكم − المستهلك من المتراكم
const annualRemaining = (e: EmployeeBalances): number =>
  openingRemaining(e) + Math.max(0, e.annual.accrued - e.annual.used)

const expiringSoon = (e: EmployeeBalances): boolean => {
  if (!e.opening.expiry || openingRemaining(e) === 0) return false
  const diff =
    (new Date(e.opening.expiry).getTime() - new Date(TODAY).getTime()) /
    (1000 * 60 * 60 * 24)
  return diff > 0 && diff <= 90
}

export default function LeaveBalancesPage() {
  const [balances, setBalances] = useState(initialBalances)
  const [searchQuery, setSearchQuery] = useState('')
  const [filterBranch, setFilterBranch] = useState('')
  const [expanded, setExpanded] = useState<string | null>('EMP001')
  const [adjustModal, setAdjustModal] = useState<{
    emp: EmployeeBalances
    mode: 'add' | 'deduct'
  } | null>(null)
  const [adjustDays, setAdjustDays] = useState('')
  const [adjustReason, setAdjustReason] = useState('')

  const filtered = balances.filter(
    (e) =>
      (e.name.includes(searchQuery) || e.id.includes(searchQuery.toUpperCase())) &&
      (!filterBranch || e.branchId === filterBranch)
  )

  const stats = {
    totalRemaining: balances.reduce((s, e) => s + annualRemaining(e), 0),
    expiring: balances.filter(expiringSoon).length,
    lowBalance: balances.filter((e) => annualRemaining(e) < 5).length,
    totalOpening: balances.reduce((s, e) => s + openingRemaining(e), 0),
  }

  const confirmAdjust = () => {
    if (!adjustModal || !adjustDays) return
    const delta = Number(adjustDays) * (adjustModal.mode === 'add' ? -1 : 1)
    setBalances(
      balances.map((e) =>
        e.id === adjustModal.emp.id
          ? { ...e, annual: { ...e.annual, used: Math.max(0, e.annual.used + delta) } }
          : e
      )
    )
    setAdjustDays('')
    setAdjustReason('')
    setAdjustModal(null)
  }

  return (
    <MainLayout>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-gray-800">أرصدة الإجازات</h1>
            <p className="text-gray-500 mt-1">
              الرصيد بطبقاته لكل موظف: المُرحّل بصلاحيته + المتراكم من التعيين − المستهلك
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
              {branchOptions.map((b) => (
                <option key={b.id} value={b.id}>
                  {b.name}
                </option>
              ))}
            </select>
          </div>
        </div>

        {/* Balances Table */}
        <div className="card overflow-hidden p-0">
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
                {filtered.map((emp) => {
                  const annRem = annualRemaining(emp)
                  const openRem = openingRemaining(emp)
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
                              {emp.avatar}
                            </div>
                            <div>
                              <p className="font-medium text-gray-800">{emp.name}</p>
                              <p className="text-xs text-gray-400">
                                {emp.department} • {getBranchName(emp.branchId)}
                              </p>
                            </div>
                          </div>
                        </td>
                        {/* السنوية */}
                        <td className="table-cell text-center text-sm text-gray-500">
                          {emp.annual.entitled}
                        </td>
                        <td className="table-cell text-center text-sm text-red-500">
                          {emp.annual.used + emp.opening.usedFromOpening}
                        </td>
                        <td className="table-cell text-center">
                          <span
                            className={`font-bold ${annRem < 5 ? 'text-red-600' : 'text-success-600'}`}
                          >
                            {annRem}
                          </span>
                        </td>
                        {/* المرضية */}
                        <td className="table-cell text-center text-sm text-gray-500">
                          {emp.sick.entitled}
                        </td>
                        <td className="table-cell text-center text-sm text-red-500">
                          {emp.sick.used}
                        </td>
                        <td className="table-cell text-center font-bold text-gray-700">
                          {emp.sick.entitled - emp.sick.used}
                        </td>
                        {/* الطارئة */}
                        <td className="table-cell text-center text-sm text-gray-500">
                          {emp.emergency.entitled}
                        </td>
                        <td className="table-cell text-center text-sm text-red-500">
                          {emp.emergency.used}
                        </td>
                        <td className="table-cell text-center font-bold text-gray-700">
                          {emp.emergency.entitled - emp.emergency.used}
                        </td>
                        {/* المرحّل */}
                        <td className="table-cell text-center">
                          {openRem > 0 ? (
                            <div>
                              <span className="font-bold text-purple-600">+{openRem}</span>
                              {expiringSoon(emp) && (
                                <p className="text-[10px] text-warning-600">
                                  ينتهي {emp.opening.expiry}
                                </p>
                              )}
                            </div>
                          ) : (
                            <span className="text-gray-300">—</span>
                          )}
                        </td>
                        {/* إجراءات */}
                        <td className="table-cell text-center">
                          <div
                            className="flex items-center justify-center gap-1"
                            onClick={(e) => e.stopPropagation()}
                          >
                            <button
                              onClick={() => setAdjustModal({ emp, mode: 'add' })}
                              className="p-1.5 bg-success-50 text-success-600 rounded-lg hover:bg-success-100"
                              title="إضافة رصيد"
                            >
                              <Plus size={14} />
                            </button>
                            <button
                              onClick={() => setAdjustModal({ emp, mode: 'deduct' })}
                              className="p-1.5 bg-red-50 text-red-600 rounded-lg hover:bg-red-100"
                              title="خصم رصيد"
                            >
                              <Minus size={14} />
                            </button>
                          </div>
                        </td>
                      </tr>

                      {/* التفصيل بالطبقات */}
                      {isOpen && (
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
                                  {openRem} يوم
                                </p>
                                <p className="text-xs text-purple-600 mt-1">
                                  أصله {emp.opening.days} − استهلك {emp.opening.usedFromOpening}
                                </p>
                                <p className="text-xs mt-1 font-medium text-purple-700">
                                  {emp.opening.expiry
                                    ? `صالح حتى ${emp.opening.expiry}`
                                    : 'بدون تاريخ انتهاء'}
                                  {emp.opening.expiry && emp.opening.expiry < TODAY && (
                                    <span className="text-red-600"> — سقط بانتهاء صلاحيته</span>
                                  )}
                                </p>
                              </div>

                              <div className="p-4 bg-blue-50 rounded-xl border border-blue-100">
                                <div className="flex items-center gap-2 mb-2">
                                  <Clock size={16} className="text-blue-500" />
                                  <p className="text-sm font-bold text-blue-800">
                                    المتراكم هذه السنة
                                  </p>
                                </div>
                                <p className="text-2xl font-bold text-blue-700">
                                  {emp.annual.accrued} يوم
                                </p>
                                <p className="text-xs text-blue-600 mt-1">
                                  {emp.accrualRate} يوم/شهر × 6 أشهر (منذ يناير)
                                </p>
                                <p className="text-xs text-blue-500 mt-1">
                                  تاريخ التعيين: {emp.joinDate}
                                </p>
                              </div>

                              <div className="p-4 bg-red-50 rounded-xl border border-red-100">
                                <div className="flex items-center gap-2 mb-2">
                                  <Calendar size={16} className="text-red-500" />
                                  <p className="text-sm font-bold text-red-800">المستهلك</p>
                                </div>
                                <p className="text-2xl font-bold text-red-700">
                                  {emp.annual.used + emp.opening.usedFromOpening} يوم
                                </p>
                                <p className="text-xs text-red-600 mt-1">
                                  {emp.opening.usedFromOpening} من المُرحّل (يُستهلك أولاً) +{' '}
                                  {emp.annual.used} من المتراكم
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
                                  {annRem} يوم
                                </p>
                                <p className="text-xs text-success-600 mt-1">
                                  {openRem} مُرحّل + {Math.max(0, emp.annual.accrued - emp.annual.used)} متراكم
                                </p>
                                <p className="text-xs text-gray-500 mt-1">
                                  بنهاية السنة سيصل الاستحقاق إلى {emp.annual.entitled} يوم
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
        </div>

        {/* Adjustment Modal */}
        {adjustModal && (
          <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded-2xl w-full max-w-md">
              <div className="p-6 border-b border-gray-100 flex items-center justify-between">
                <h2 className="text-lg font-bold text-gray-800">
                  {adjustModal.mode === 'add' ? 'إضافة رصيد' : 'خصم رصيد'} —{' '}
                  {adjustModal.emp.name}
                </h2>
                <button
                  onClick={() => setAdjustModal(null)}
                  className="p-2 hover:bg-gray-100 rounded-lg"
                >
                  <X size={20} className="text-gray-500" />
                </button>
              </div>
              <div className="p-6 space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    عدد الأيام *
                  </label>
                  <input
                    type="number"
                    value={adjustDays}
                    onChange={(e) => setAdjustDays(e.target.value)}
                    className="input w-full"
                    min="0.5"
                    step="0.5"
                    placeholder="مثال: 2"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    السبب * (يُسجَّل في سجل التدقيق)
                  </label>
                  <textarea
                    value={adjustReason}
                    onChange={(e) => setAdjustReason(e.target.value)}
                    className="input w-full h-20 resize-none"
                    placeholder={
                      adjustModal.mode === 'add'
                        ? 'مثال: تعويض عمل يوم عطلة رسمية'
                        : 'مثال: تصحيح خطأ إدخال'
                    }
                  />
                </div>
              </div>
              <div className="p-6 border-t border-gray-100 flex items-center justify-end gap-3">
                <button onClick={() => setAdjustModal(null)} className="btn-secondary">
                  إلغاء
                </button>
                <button
                  onClick={confirmAdjust}
                  className="btn-primary"
                  disabled={!adjustDays || !adjustReason}
                >
                  تأكيد {adjustModal.mode === 'add' ? 'الإضافة' : 'الخصم'}
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </MainLayout>
  )
}
