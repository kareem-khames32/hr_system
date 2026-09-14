'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { MainLayout } from '@/components/layout'
import {
  Search,
  UserMinus,
  ClipboardCheck,
  Calculator,
  BadgeCheck,
  Archive,
} from 'lucide-react'
import { fetchOffboardingCases, type ApiOffboardingCase } from '@/lib/api'
import { useCurrency } from '@/lib/currency'

// حالات ملف إنهاء الخدمة كما في الباك إند
const statusLabels: Record<string, string> = {
  IN_CLEARANCE: 'إخلاء طرف جارٍ',
  IN_SETTLEMENT: 'تصفية قيد المراجعة',
  SETTLED: 'معتمدة بانتظار آخر يوم',
  CLOSED: 'منتهية',
  CANCELLED: 'ملف ملغى',
}

const statusStyles: Record<string, string> = {
  IN_CLEARANCE: 'bg-warning-50 text-warning-600',
  IN_SETTLEMENT: 'bg-blue-100 text-blue-700',
  SETTLED: 'bg-indigo-100 text-indigo-700',
  CLOSED: 'bg-gray-100 text-gray-600',
  CANCELLED: 'bg-gray-100 text-gray-600',
}

const fmtDate = (v?: string | null) => (v ? String(v).slice(0, 10) : '—')

export default function OffboardingPage() {
  const router = useRouter()
  const currency = useCurrency()
  const [cases, setCases] = useState<ApiOffboardingCase[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [searchQuery, setSearchQuery] = useState('')
  const [filterStatus, setFilterStatus] = useState('')

  useEffect(() => {
    fetchOffboardingCases()
      .then(setCases)
      .catch((err) =>
        setError(err instanceof Error ? err.message : 'تعذر تحميل ملفات إنهاء الخدمة')
      )
      .finally(() => setLoading(false))
  }, [])

  const filtered = cases.filter(
    (c) =>
      ((c.employeeName ?? '').includes(searchQuery) ||
        (c.employeeCode ?? '').includes(searchQuery)) &&
      (!filterStatus || c.status === filterStatus)
  )

  // إحصائيات حقيقية من البيانات
  const stats = {
    inClearance: cases.filter((c) => c.status === 'IN_CLEARANCE').length,
    inSettlement: cases.filter((c) => c.status === 'IN_SETTLEMENT').length,
    settled: cases.filter((c) => c.status === 'SETTLED').length,
    closed: cases.filter((c) => c.status === 'CLOSED').length,
  }

  return (
    <MainLayout>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-gray-800">إنهاء الخدمة</h1>
            <p className="text-gray-500 mt-1">
              ملفات إخلاء الطرف والتصفية النهائية للاستقالة والتقاعد وأسباب إنهاء الخدمة الأخرى
            </p>
          </div>
        </div>

        {/* Error Banner */}
        {error && (
          <div className="bg-red-50 text-red-700 rounded-xl p-4">{error}</div>
        )}

        {/* Stats */}
        <div className="grid grid-cols-4 gap-4">
          <div className="card p-4 flex items-center gap-3">
            <div className="w-12 h-12 bg-warning-50 rounded-xl flex items-center justify-center">
              <ClipboardCheck size={24} className="text-warning-500" />
            </div>
            <div>
              <p className="text-sm text-gray-500">إخلاء طرف جارٍ</p>
              <p className="text-2xl font-bold text-warning-600">{stats.inClearance}</p>
            </div>
          </div>
          <div className="card p-4 flex items-center gap-3">
            <div className="w-12 h-12 bg-blue-100 rounded-xl flex items-center justify-center">
              <Calculator size={24} className="text-blue-600" />
            </div>
            <div>
              <p className="text-sm text-gray-500">تصفية قيد المراجعة</p>
              <p className="text-2xl font-bold text-blue-600">{stats.inSettlement}</p>
            </div>
          </div>
          <div className="card p-4 flex items-center gap-3">
            <div className="w-12 h-12 bg-indigo-100 rounded-xl flex items-center justify-center">
              <BadgeCheck size={24} className="text-indigo-600" />
            </div>
            <div>
              <p className="text-sm text-gray-500">معتمدة بانتظار آخر يوم</p>
              <p className="text-2xl font-bold text-indigo-600">{stats.settled}</p>
            </div>
          </div>
          <div className="card p-4 flex items-center gap-3">
            <div className="w-12 h-12 bg-gray-100 rounded-xl flex items-center justify-center">
              <Archive size={24} className="text-gray-500" />
            </div>
            <div>
              <p className="text-sm text-gray-500">منتهية</p>
              <p className="text-2xl font-bold text-gray-800">{stats.closed}</p>
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
                placeholder="بحث باسم الموظف أو الرقم الوظيفي..."
                className="input pr-10 w-full"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
              />
            </div>
            <select
              value={filterStatus}
              onChange={(e) => setFilterStatus(e.target.value)}
              className="input w-56"
            >
              <option value="">كل الحالات</option>
              {Object.entries(statusLabels).map(([id, label]) => (
                <option key={id} value={id}>
                  {label}
                </option>
              ))}
            </select>
          </div>
        </div>

        {/* Loading */}
        {loading ? (
          <div className="flex items-center justify-center py-20">
            <div className="w-8 h-8 border-2 border-primary-500 border-t-transparent rounded-full animate-spin" />
          </div>
        ) : (
          /* Cases Table */
          <div className="card overflow-hidden">
            <table className="w-full">
              <thead>
                <tr className="bg-gray-50 text-right">
                  <th className="py-3 px-4 text-sm font-medium text-gray-500">الموظف</th>
                  <th className="py-3 px-4 text-sm font-medium text-gray-500">آخر يوم عمل</th>
                  <th className="py-3 px-4 text-sm font-medium text-gray-500">الحالة</th>
                  <th className="py-3 px-4 text-sm font-medium text-gray-500">التصفية</th>
                  <th className="py-3 px-4 text-sm font-medium text-gray-500">تاريخ الفتح</th>
                </tr>
              </thead>
              <tbody>
                {filtered.map((c) => (
                  <tr
                    key={c.id}
                    onClick={() => router.push(`/offboarding/${c.id}`)}
                    className="border-t border-gray-50 hover:bg-gray-50/50 cursor-pointer"
                  >
                    <td className="py-3 px-4">
                      <p className="font-medium text-gray-800 text-sm">
                        {c.employeeName ?? c.employee?.fullName ?? `موظف #${c.employeeId}`}
                      </p>
                      <p className="text-xs text-gray-400" dir="ltr">
                        {c.employeeCode ?? c.employee?.employeeCode ?? ''}
                      </p>
                    </td>
                    <td className="py-3 px-4 text-sm text-gray-600" dir="ltr">
                      {fmtDate(c.lastWorkingDay)}
                    </td>
                    <td className="py-3 px-4">
                      <span
                        className={`badge text-xs ${statusStyles[c.status] ?? 'bg-gray-100 text-gray-600'}`}
                      >
                        {statusLabels[c.status] ?? c.status}
                      </span>
                    </td>
                    <td className="py-3 px-4">
                      <div className="flex items-center gap-2 flex-wrap">
                        {c.settlementNet != null && (
                          <span className="badge text-xs bg-success-50 text-success-700">
                            الصافي: {Number(c.settlementNet).toLocaleString()} {currency}
                          </span>
                        )}
                        {c.settlementDocRef && (
                          <span
                            className="badge text-xs bg-primary-50 text-primary-700 font-mono"
                            dir="ltr"
                          >
                            {c.settlementDocRef}
                          </span>
                        )}
                        {!c.settlementDocRef && c.settlementNet == null &&
                          !['IN_SETTLEMENT', 'SETTLED', 'CLOSED'].includes(c.status) && (
                            <span className="text-xs text-gray-300">—</span>
                          )}
                        {['IN_SETTLEMENT', 'SETTLED', 'CLOSED'].includes(c.status) && (
                          <Link
                            href={`/employees/${c.employeeId}/settlement?case=${c.id}`}
                            onClick={(e) => e.stopPropagation()}
                            className="text-xs px-2.5 py-1 bg-primary-50 text-primary-700 rounded-lg hover:bg-primary-100 flex items-center gap-1"
                          >
                            <Calculator size={12} />
                            التصفية
                          </Link>
                        )}
                      </div>
                    </td>
                    <td className="py-3 px-4 text-sm text-gray-600" dir="ltr">
                      {fmtDate(c.createdAt)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
            {filtered.length === 0 && (
              <div className="p-12 text-center">
                <UserMinus size={48} className="mx-auto text-gray-300 mb-4" />
                <p className="text-gray-500">لا توجد ملفات إنهاء خدمة مطابقة</p>
              </div>
            )}
          </div>
        )}
      </div>
    </MainLayout>
  )
}
