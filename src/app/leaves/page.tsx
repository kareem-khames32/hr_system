'use client'

import { useLeaveCatalog } from '@/lib/leave-catalog'

import { useEffect, useState } from 'react'
import { MainLayout } from '@/components/layout'
import {
  Search,
  Plus,
  Download,
  Calendar,
  CheckCircle,
  XCircle,
  Eye,
  ChevronLeft,
  ChevronRight,
  FileText,
  AlertTriangle,
} from 'lucide-react'
import Link from 'next/link'
import { downloadCsv } from '@/lib/csv'
import { fetchLeaves, revokeLeave, can, type ApiLeavePage } from '@/lib/api'
import { DayRangeFilter, usePayrollMonthContext } from '@/components/DayRangeFilter'
import { isDayKey, validDayRange, type DayRange } from '@/lib/payroll-month-range'

// سجل الإجازات — هذا هو «سجل الوجهة» بعد اكتمال الموافقات في محرك الطلبات.
// الاعتماد/الرفض يتم في صندوق الموافقات، وليس هنا.


// مدة الإجازة: نص اليوم بفترته بدل «0.5 يوم» (LEV-21)
const durationLabel = (days: number, period?: string) =>
  period === 'MORNING'
    ? 'نصف يوم صباحي'
    : period === 'EVENING'
      ? 'نصف يوم مسائي'
      : `${days} يوم`

const getStatusBadge = (status: string) => {
  switch (status) {
    case 'APPROVED':
      return (
        <span className="badge badge-success flex items-center gap-1">
          <CheckCircle size={12} />
          معتمدة
        </span>
      )
    case 'CANCELLED':
      return (
        <span className="badge bg-gray-100 text-gray-600 flex items-center gap-1">
          <XCircle size={12} />
          ملغاة
        </span>
      )
    default:
      // حالة غير معروفة — لا تُعرض أكواد خام أبداً
      return (
        <span className="badge bg-gray-100 text-gray-600 flex items-center gap-1">
          قيد المعالجة
        </span>
      )
  }
}

const PAGE_SIZE = 50
const EMPTY_PAGE: ApiLeavePage = {
  items: [],
  total: 0,
  page: 1,
  pageSize: PAGE_SIZE,
  stats: { all: 0, approved: 0, cancelled: 0, approvedDays: 0 },
}

export default function LeavesPage() {
  const leaveCatalog = useLeaveCatalog()
  const leaveTypeMeta = (code: string) => ({ label: leaveCatalog.label(code), color: leaveCatalog.color(code) })
  const [selectedLeave, setSelectedLeave] = useState<ApiLeavePage['items'][number] | null>(null)
  const [activeTab, setActiveTab] = useState<'all' | 'APPROVED' | 'CANCELLED'>('all')
  const [searchQuery, setSearchQuery] = useState('')
  // البحث بيتبعت بعد ما الكتابة تقف — طلب واحد مش طلب لكل حرف
  const [search, setSearch] = useState('')
  const [selectedType, setSelectedType] = useState('all')
  // «من تاريخ / إلى تاريخ» اختياري (الإجازات المتقاطعة مع المدى) أو شهر رواتب بضغطة — فاضي = كل التواريخ
  const payrollMonth = usePayrollMonthContext()
  const [dateRange, setDateRange] = useState<DayRange | null>(null)
  const activeRange = validDayRange(dateRange, null)
  const fromFilter = activeRange?.from ?? ''
  const toFilter = activeRange?.to ?? ''
  const [page, setPage] = useState(1)

  const [data, setData] = useState<ApiLeavePage>(EMPTY_PAGE)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  // إلغاء إجازة معتمدة — بصلاحية leaves.revoke (تُحسم بعد الترطيب لتفادي اختلاف السيرفر)
  const [canRevoke, setCanRevoke] = useState(false)
  const [revokingId, setRevokingId] = useState<number | null>(null)

  // الفلترة والترقيم على السيرفر (LEV-22): المدى = الإجازات المتقاطعة معه
  const load = () => {
    setLoading(true)
    setError('')
    fetchLeaves({
      status: activeTab === 'all' ? undefined : activeTab,
      leaveType: selectedType === 'all' ? undefined : selectedType,
      q: search || undefined,
      from: fromFilter || undefined,
      to: toFilter || undefined,
      page,
      pageSize: PAGE_SIZE,
    })
      .then(setData)
      .catch((e) => setError(e instanceof Error ? e.message : 'تعذر تحميل سجل الإجازات'))
      .finally(() => setLoading(false))
  }

  useEffect(() => {
    setCanRevoke(can('leaves.revoke'))
  }, [])

  // وصلة «بصم رغم الإجازة» في كشف الحضور بتوصل للصف نفسه: الموظف يدخل مربع البحث واليوم يدخل
  // فلتر التاريخ الموجودين — بلا فلاتر جديدة. الرابط يُستهلك مرة واحدة فلا يرجع بعد أي تغيير فلتر.
  useEffect(() => {
    if (typeof window === 'undefined') return
    const qs = new URLSearchParams(window.location.search)
    const employee = (qs.get('employee') ?? '').trim()
    const date = (qs.get('date') ?? '').trim()
    if (!employee && !isDayKey(date)) return
    if (employee) {
      setSearchQuery(employee)
      setSearch(employee)
    }
    if (isDayKey(date)) setDateRange({ from: date, to: date })
    window.history.replaceState(null, '', window.location.pathname)
  }, [])

  useEffect(() => {
    const t = setTimeout(() => setSearch(searchQuery.trim()), 300)
    return () => clearTimeout(t)
  }, [searchQuery])

  // أي فلتر جديد يرجع لأول صفحة؛ التحميل مرة واحدة بعدها
  const filtersKey = `${activeTab}|${selectedType}|${search}|${fromFilter}|${toFilter}`
  const [lastFilters, setLastFilters] = useState(filtersKey)
  useEffect(() => {
    if (filtersKey !== lastFilters) {
      setLastFilters(filtersKey)
      if (page !== 1) {
        setPage(1)
        return
      }
    }
    load()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [filtersKey, page])

  // إلغاء إجازة معتمدة مباشرة: يرجّع الرصيد ويعيد حساب أيام الحضور فوراً
  const handleRevoke = async (id: number) => {
    if (revokingId !== null) return
    if (!confirm('هيرجع الرصيد وتُعاد أيام الحضور فوراً — متأكد؟')) return
    setRevokingId(id)
    setError('')
    try {
      await revokeLeave(id)
      load()
    } catch (e) {
      setError(e instanceof Error ? e.message : 'تعذر إلغاء الإجازة')
    } finally {
      setRevokingId(null)
    }
  }

  const rows = data.items
  const stats = data.stats
  const totalPages = Math.max(1, Math.ceil(data.total / PAGE_SIZE))
  const firstRow = data.total === 0 ? 0 : (page - 1) * PAGE_SIZE + 1
  const lastRow = Math.min(page * PAGE_SIZE, data.total)

  return (
    <MainLayout>
      <div className="space-y-6">
        {leaveCatalog.error && <div role="alert" className="bg-amber-50 text-amber-800 rounded-xl p-3 text-sm">تعذر تحميل أنواع الإجازات: {leaveCatalog.error} <button type="button" className="underline" onClick={leaveCatalog.retry}>إعادة المحاولة</button></div>}
        {/* Page Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-gray-800">سجل الإجازات المعتمدة</h1>
            <p className="text-gray-500 mt-1">
              الإجازات المعتمدة من محرك الطلبات — الموافقة تتم في صندوق الموافقات
            </p>
          </div>
          <div className="flex items-center gap-3">
            <button onClick={() => downloadCsv(`leaves-page-${page}.csv`, ['الموظف', 'الكود', 'نوع الإجازة', 'من', 'إلى', 'المدة', 'الحالة', 'رقم الطلب'], rows.map(row => [row.employeeName, row.employeeCode, leaveCatalog.label(row.leaveType), row.fromDate, row.toDate, durationLabel(Number(row.days), row.period), row.status === 'APPROVED' ? 'معتمدة' : row.status === 'CANCELLED' ? 'ملغاة' : row.status, row.requestId]))} disabled={loading} className="btn-secondary flex items-center gap-2">
              <Download size={18} />
              تصدير الصفحة CSV
            </button>
            <Link href="/leaves/request" className="btn-primary flex items-center gap-2">
              <Plus size={18} />
              طلب إجازة جديد
            </Link>
          </div>
        </div>

        {/* Stats Tabs */}
        <div className="grid grid-cols-4 gap-4">
          <button
            onClick={() => setActiveTab('all')}
            className={`card text-right transition-all ${
              activeTab === 'all' ? 'ring-2 ring-primary-500' : ''
            }`}
          >
            <div className="flex items-center justify-between">
              <div className="w-12 h-12 bg-gray-100 rounded-2xl flex items-center justify-center">
                <FileText size={24} className="text-gray-600" />
              </div>
              <div>
                <p className="text-sm text-gray-500">كل السجلات</p>
                <p className="text-3xl font-bold text-gray-800">{stats.all}</p>
              </div>
            </div>
          </button>

          <button
            onClick={() => setActiveTab('APPROVED')}
            className={`card text-right transition-all ${
              activeTab === 'APPROVED' ? 'ring-2 ring-success-500' : ''
            }`}
          >
            <div className="flex items-center justify-between">
              <div className="w-12 h-12 bg-success-50 rounded-2xl flex items-center justify-center">
                <CheckCircle size={24} className="text-success-600" />
              </div>
              <div>
                <p className="text-sm text-gray-500">معتمدة</p>
                <p className="text-3xl font-bold text-success-600">{stats.approved}</p>
              </div>
            </div>
          </button>

          <button
            onClick={() => setActiveTab('CANCELLED')}
            className={`card text-right transition-all ${
              activeTab === 'CANCELLED' ? 'ring-2 ring-danger-500' : ''
            }`}
          >
            <div className="flex items-center justify-between">
              <div className="w-12 h-12 bg-danger-50 rounded-2xl flex items-center justify-center">
                <XCircle size={24} className="text-danger-600" />
              </div>
              <div>
                <p className="text-sm text-gray-500">ملغاة</p>
                <p className="text-3xl font-bold text-danger-600">{stats.cancelled}</p>
              </div>
            </div>
          </button>

          <div className="card text-right">
            <div className="flex items-center justify-between">
              <div className="w-12 h-12 bg-primary-100 rounded-2xl flex items-center justify-center">
                <Calendar size={24} className="text-primary-600" />
              </div>
              <div>
                <p className="text-sm text-gray-500">أيام معتمدة</p>
                <p className="text-3xl font-bold text-primary-600">{stats.approvedDays}</p>
              </div>
            </div>
          </div>
        </div>

        {/* Filters */}
        <div className="card">
          <div className="flex flex-wrap items-end gap-4">
            {/* Search */}
            <div className="flex-1 min-w-[300px]">
              <div className="relative">
                <Search size={18} className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400" />
                <input
                  type="text"
                  placeholder="بحث بالاسم أو الرقم الوظيفي..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="input pr-10"
                />
              </div>
            </div>

            {/* Leave Type Filter */}
            <select
              value={selectedType}
              onChange={(e) => setSelectedType(e.target.value)}
              className="input w-48"
            >
              <option value="all">كل أنواع الإجازات</option>
              {leaveCatalog.types.map((type) => [type.code, leaveTypeMeta(type.code)] as const).map(([code, meta]) => (
                <option key={code} value={code}>
                  {meta.label}
                </option>
              ))}
            </select>

            {/* Date Range — الإجازات المتقاطعة مع المدى */}
            <DayRangeFilter idPrefix="leaves" value={dateRange} onChange={setDateRange} onClear={() => setDateRange(null)} maxDays={null}
              cycleStartDay={payrollMonth?.cycleStartDay} today={payrollMonth?.today} />
          </div>
        </div>

        {/* Error Banner */}
        {error && (
          <div className="bg-red-50 text-red-700 rounded-xl p-4 flex items-center gap-2">
            <AlertTriangle size={18} />
            {error}
          </div>
        )}

        {/* Leave Requests Table */}
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
                  <th className="text-right px-4 py-4">الموظف</th>
                  <th className="text-right px-4 py-4">نوع الإجازة</th>
                  <th className="text-center px-4 py-4">من</th>
                  <th className="text-center px-4 py-4">إلى</th>
                  <th className="text-center px-4 py-4">المدة</th>
                  <th className="text-center px-4 py-4">رقم الطلب</th>
                  <th className="text-center px-4 py-4">الحالة</th>
                  <th className="text-center px-4 py-4">الإجراءات</th>
                </tr>
              </thead>
              <tbody>
                {rows.length === 0 && (
                  <tr>
                    <td colSpan={8} className="text-center py-10 text-gray-400">
                      لا توجد إجازات مسجلة
                    </td>
                  </tr>
                )}
                {rows.map((request) => {
                  const meta = leaveTypeMeta(request.leaveType)
                  return (
                    <tr key={request.id} className="table-row">
                      <td className="table-cell">
                        <div className="flex items-center gap-3">
                          <div className="w-10 h-10 bg-gradient-to-br from-primary-400 to-primary-600 rounded-xl flex items-center justify-center text-white font-bold">
                            {(request.employeeName ?? 'م').charAt(0)}
                          </div>
                          <div>
                            <p className="font-medium text-gray-800">
                              {request.employeeName ?? `موظف ${request.employeeId}`}
                            </p>
                            <p className="text-sm text-gray-400 font-mono">
                              {request.employeeCode ?? '-'}
                            </p>
                          </div>
                        </div>
                      </td>
                      <td className="table-cell">
                        <div className="flex items-center gap-2">
                          <div className={`w-3 h-3 rounded-full ${meta.color}`} />
                          <span className="text-gray-700">{meta.label}</span>
                        </div>
                      </td>
                      <td className="table-cell text-center text-gray-600" dir="ltr">
                        {request.fromDate}
                      </td>
                      <td className="table-cell text-center text-gray-600" dir="ltr">
                        {request.toDate}
                      </td>
                      <td className="table-cell text-center">
                        <span className="font-bold text-primary-600">
                          {durationLabel(Number(request.days), request.period)}
                        </span>
                      </td>
                      <td className="table-cell text-center text-gray-500 font-mono">
                        {request.requestId ? `#${request.requestId}` : '-'}
                      </td>
                      <td className="table-cell text-center">{getStatusBadge(request.status)}</td>
                      <td className="table-cell">
                        <div className="flex items-center justify-center gap-1">
                          <button onClick={() => setSelectedLeave(request)} aria-label="عرض تفاصيل الإجازة" className="p-2 hover:bg-gray-100 rounded-lg transition-colors">
                            <Eye size={18} className="text-gray-500" />
                          </button>
                          {canRevoke && request.status === 'APPROVED' && (
                            <button
                              onClick={() => handleRevoke(request.id)}
                              disabled={revokingId !== null}
                              className="px-3 py-1.5 text-xs font-medium text-red-600 border border-red-200 rounded-lg hover:bg-red-50 disabled:opacity-50 whitespace-nowrap transition-colors"
                            >
                              {revokingId === request.id ? 'جارٍ الإلغاء...' : 'إلغاء الإجازة'}
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
          )}

          {/* Pagination — من السيرفر */}
          <div className="flex items-center justify-between px-4 py-4 border-t border-gray-100">
            <p className="text-sm text-gray-500">
              عرض <span className="font-medium text-gray-700">{firstRow}-{lastRow}</span> من{' '}
              <span className="font-medium text-gray-700">{data.total}</span> سجل
            </p>
            <div className="flex items-center gap-2">
              <button
                className="p-2 border border-gray-200 rounded-lg hover:bg-gray-50 disabled:opacity-40"
                disabled={page <= 1 || loading}
                onClick={() => setPage((p) => Math.max(1, p - 1))}
                title="الصفحة السابقة"
              >
                <ChevronRight size={18} />
              </button>
              <span className="px-4 py-2 bg-primary-500 text-white rounded-lg text-sm font-medium">
                {page} / {totalPages}
              </span>
              <button
                className="p-2 border border-gray-200 rounded-lg hover:bg-gray-50 disabled:opacity-40"
                disabled={page >= totalPages || loading}
                onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                title="الصفحة التالية"
              >
                <ChevronLeft size={18} />
              </button>
            </div>
          </div>
        </div>

        {/* Leave Types Legend */}
        <div className="card">
          <h3 className="text-sm font-bold text-gray-700 mb-4">أنواع الإجازات</h3>
          <div className="flex flex-wrap items-center gap-6">
            {leaveCatalog.types.map((type) => [type.code, leaveTypeMeta(type.code)] as const).map(([code, meta]) => (
              <div key={code} className="flex items-center gap-2">
                <div className={`w-4 h-4 rounded-full ${meta.color}`} />
                <span className="text-sm text-gray-600">{meta.label}</span>
              </div>
            ))}
          </div>
        </div>
      </div>
      {selectedLeave && <div role="dialog" aria-modal="true" aria-label="تفاصيل الإجازة" className="fixed inset-0 z-50 bg-black/50 flex items-center justify-center p-4"><div className="bg-white rounded-2xl w-full max-w-lg p-6 space-y-4"><h2 className="font-bold text-lg">{leaveCatalog.label(selectedLeave.leaveType)}</h2><p>{selectedLeave.employeeName || `موظف #${selectedLeave.employeeId}`}</p><p>{selectedLeave.fromDate} — {selectedLeave.toDate}</p><p>{durationLabel(Number(selectedLeave.days), selectedLeave.period)}</p>{getStatusBadge(selectedLeave.status)}{selectedLeave.requestId && <p className="text-sm text-gray-500">رقم الطلب: #{selectedLeave.requestId}</p>}<div className="flex justify-end"><button onClick={() => setSelectedLeave(null)} className="btn-secondary">إغلاق</button></div></div></div>}
    </MainLayout>
  )
}
