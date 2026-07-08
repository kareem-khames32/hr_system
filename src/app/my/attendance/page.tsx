'use client'

import { useEffect, useState } from 'react'
import { MainLayout } from '@/components/layout'
import {
  Calendar,
  CheckCircle,
  XCircle,
  AlertTriangle,
  Clock,
  UserX,
} from 'lucide-react'
import {
  fetchMonthlyAttendance,
  getCurrentUser,
  type ApiAttendanceDay,
} from '@/lib/api'

const weekdayNames = ['الأحد', 'الاثنين', 'الثلاثاء', 'الأربعاء', 'الخميس', 'الجمعة', 'السبت']

const weekdayOf = (date: string): string => {
  const d = new Date(date + 'T12:00:00')
  return Number.isNaN(d.getTime()) ? '—' : weekdayNames[d.getDay()]
}

// دقائق → H:mm
const formatMinutes = (mins: number): string | null => {
  const m = Number(mins)
  if (!m || m <= 0) return null
  return `${Math.floor(m / 60)}:${String(m % 60).padStart(2, '0')}`
}

const currentMonth = () => new Date().toISOString().slice(0, 7)

const statusConfig: Record<
  string,
  { label: string; className: string; icon: typeof CheckCircle }
> = {
  present: { label: 'حاضر', className: 'badge-success', icon: CheckCircle },
  late: { label: 'متأخر', className: 'badge-warning', icon: AlertTriangle },
  absent: { label: 'غائب', className: 'badge-danger', icon: XCircle },
  early_leave: { label: 'خروج مبكر', className: 'bg-orange-50 text-orange-600', icon: Clock },
  leave: { label: 'في إجازة', className: 'bg-indigo-50 text-indigo-600', icon: Calendar },
  holiday: { label: 'عطلة', className: 'bg-blue-50 text-blue-600', icon: Calendar },
}

export default function MyAttendancePage() {
  const [employeeId, setEmployeeId] = useState<number | null>(null)
  const [noEmployee, setNoEmployee] = useState(false)
  const [month, setMonth] = useState(currentMonth())

  const [days, setDays] = useState<ApiAttendanceDay[]>([])
  const [summary, setSummary] = useState<Record<string, number>>({})
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  // هوية الموظف من الجلسة — بعد الـ mount
  useEffect(() => {
    const user = getCurrentUser()
    if (user?.employeeId) {
      setEmployeeId(user.employeeId)
    } else {
      setNoEmployee(true)
      setLoading(false)
    }
  }, [])

  // كشف الشهر — من السيرفر (مصدر الحقيقة)
  useEffect(() => {
    if (!employeeId || !month) return
    setLoading(true)
    setError('')
    fetchMonthlyAttendance(employeeId, month)
      .then((res) => {
        setDays(res.days)
        setSummary(res.summary)
      })
      .catch((e) => setError(e instanceof Error ? e.message : 'تعذر تحميل كشف حضورك'))
      .finally(() => setLoading(false))
  }, [employeeId, month])

  return (
    <MainLayout>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-gray-800">حضوري — {month}</h1>
            <p className="text-gray-500 mt-1">
              كشف حضورك يوم بيوم: الوردية والحالة والتأخير محسوبة من السيرفر
            </p>
          </div>
          <input
            type="month"
            value={month}
            onChange={(e) => setMonth(e.target.value)}
            className="input w-44"
          />
        </div>

        {error && <div className="bg-red-50 text-red-700 rounded-xl p-4">{error}</div>}

        {noEmployee ? (
          <div className="card p-12 text-center">
            <UserX size={48} className="mx-auto text-gray-300 mb-4" />
            <p className="text-gray-500">
              حسابك غير مرتبط بملف موظف — تواصل مع الموارد البشرية لربط حسابك
            </p>
          </div>
        ) : (
          <>
            {/* Summary */}
            <div className="grid grid-cols-6 gap-4">
              <div className="card p-4 text-center">
                <p className="text-2xl font-bold text-success-600">{Number(summary.present ?? 0)}</p>
                <p className="text-sm text-gray-500">يوم حضور</p>
              </div>
              <div className="card p-4 text-center">
                <p className="text-2xl font-bold text-warning-600">{Number(summary.late ?? 0)}</p>
                <p className="text-sm text-gray-500">يوم بتأخير</p>
              </div>
              <div className="card p-4 text-center">
                <p className="text-2xl font-bold text-red-600">{Number(summary.absent ?? 0)}</p>
                <p className="text-sm text-gray-500">غياب</p>
              </div>
              <div className="card p-4 text-center">
                <p className="text-2xl font-bold text-orange-600">{Number(summary.earlyLeave ?? 0)}</p>
                <p className="text-sm text-gray-500">خروج مبكر</p>
              </div>
              <div className="card p-4 text-center">
                <p className="text-2xl font-bold text-gray-800">{Number(summary.totalLateMinutes ?? 0)}</p>
                <p className="text-sm text-gray-500">إجمالي دقائق التأخير</p>
              </div>
              <div className="card p-4 text-center">
                <p className="text-2xl font-bold text-primary-600 font-mono">
                  {formatMinutes(Number(summary.totalWorkMinutes ?? 0)) ?? '0:00'}
                </p>
                <p className="text-sm text-gray-500">إجمالي ساعات العمل</p>
              </div>
            </div>

            {/* Day-by-day Sheet */}
            {loading ? (
              <div className="card flex items-center justify-center py-16">
                <div className="w-8 h-8 border-2 border-primary-500 border-t-transparent rounded-full animate-spin" />
              </div>
            ) : (
              <div className="card overflow-hidden p-0">
                <div className="overflow-x-auto">
                  <table className="w-full">
                    <thead>
                      <tr className="table-header">
                        <th className="text-right px-4 py-3">اليوم</th>
                        <th className="text-right px-4 py-3">التاريخ</th>
                        <th className="text-right px-4 py-3">وردية اليوم</th>
                        <th className="text-center px-4 py-3">الحضور</th>
                        <th className="text-center px-4 py-3">الانصراف</th>
                        <th className="text-center px-4 py-3">ساعات العمل</th>
                        <th className="text-center px-4 py-3">التأخير</th>
                        <th className="text-center px-4 py-3">الحالة</th>
                      </tr>
                    </thead>
                    <tbody>
                      {days.length === 0 ? (
                        <tr>
                          <td colSpan={8} className="table-cell text-center text-gray-400 py-10">
                            لا توجد سجلات حضور لك في هذا الشهر
                          </td>
                        </tr>
                      ) : (
                        days.map((row) => {
                          const cfg = statusConfig[row.status] ?? statusConfig.present
                          const StatusIcon = cfg.icon
                          const lateMinutes = Number(row.lateMinutes)
                          const excusedMinutes = Number(row.excusedMinutes ?? 0)
                          return (
                            <tr key={row.id} className="table-row">
                              <td className="table-cell font-medium text-gray-700">
                                {weekdayOf(row.date)}
                              </td>
                              <td className="table-cell font-mono text-sm text-gray-500" dir="ltr">
                                {row.date}
                              </td>
                              <td className="table-cell text-sm text-gray-600">
                                {row.shiftName} ({row.shiftStart}–{row.shiftEnd})
                              </td>
                              <td className="table-cell text-center">
                                {row.checkIn ? (
                                  <span className="font-mono text-success-600">{row.checkIn}</span>
                                ) : (
                                  <span className="text-gray-300">—</span>
                                )}
                              </td>
                              <td className="table-cell text-center">
                                {row.checkOut ? (
                                  <span className="font-mono text-danger-600">{row.checkOut}</span>
                                ) : (
                                  <span className="text-gray-300">—</span>
                                )}
                              </td>
                              <td className="table-cell text-center font-mono text-sm text-gray-600">
                                {formatMinutes(Number(row.workMinutes)) ?? '—'}
                              </td>
                              <td className="table-cell text-center">
                                {lateMinutes > 0 ? (
                                  <span className="text-warning-600 font-bold text-sm">
                                    {lateMinutes} دقيقة
                                  </span>
                                ) : (
                                  <span className="text-gray-300">—</span>
                                )}
                                {excusedMinutes > 0 && (
                                  <p className="text-xs text-success-600 mt-1 font-medium">
                                    معذور بإذن: {excusedMinutes} د
                                  </p>
                                )}
                              </td>
                              <td className="table-cell text-center">
                                <span className={`badge text-xs inline-flex items-center gap-1 ${cfg.className}`}>
                                  <StatusIcon size={12} />
                                  {cfg.label}
                                </span>
                              </td>
                            </tr>
                          )
                        })
                      )}
                    </tbody>
                  </table>
                </div>
              </div>
            )}
          </>
        )}
      </div>
    </MainLayout>
  )
}
