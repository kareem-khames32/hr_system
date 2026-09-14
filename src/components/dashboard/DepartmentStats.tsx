'use client'

// حضور اليوم لكل قسم من السيرفر (GET /dashboard/departments) بنطاق الفرع — بتعريفات
// كروت اليوم نفسها، و«بدون قسم» لمن لا قسم له حتى يطابق مجموع الأقسام الكروت
import { useEffect, useState } from 'react'
import Link from 'next/link'
import { can, fetchDepartmentStats, type ApiDepartmentDayStats } from '@/lib/api'

export default function DepartmentStats() {
  const [departments, setDepartments] = useState<ApiDepartmentDayStats[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  useEffect(() => {
    let cancelled = false
    fetchDepartmentStats()
      .then((data) => {
        if (!cancelled) setDepartments(data.departments)
      })
      .catch((e) => {
        if (!cancelled) setError(e instanceof Error ? e.message : 'تعذر تحميل إحصائيات الأقسام')
      })
      .finally(() => {
        if (!cancelled) setLoading(false)
      })
    return () => {
      cancelled = true
    }
  }, [])

  // تقارير الحضور تتطلب attendance.view_all — لا رابط ينتهي بشاشة «غير مصرح»
  const canViewReports = can('attendance.view_all')

  return (
    <div className="card">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h3 className="text-lg font-bold text-gray-800">إحصائيات الأقسام</h3>
          <p className="text-xs text-gray-400 mt-1">حضور اليوم حسب القسم</p>
        </div>
        {canViewReports && (
          <Link
            href="/attendance/reports"
            className="text-sm text-primary-500 hover:text-primary-600 font-medium"
          >
            عرض التفاصيل
          </Link>
        )}
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-10">
          <div className="w-8 h-8 border-2 border-primary-500 border-t-transparent rounded-full animate-spin" />
        </div>
      ) : error ? (
        <div className="bg-red-50 text-red-700 rounded-xl p-4">{error}</div>
      ) : departments.length === 0 ? (
        <p className="text-center text-sm text-gray-400 py-10">لا يوجد موظفون حاليون في نطاقك</p>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="table-header">
                <th className="text-right px-4 py-3 rounded-r-xl">القسم</th>
                <th className="text-center px-4 py-3">الموظفين</th>
                <th className="text-center px-4 py-3">الحاضرين</th>
                <th className="text-center px-4 py-3">غائب</th>
                <th className="text-center px-4 py-3">إجازة</th>
                <th
                  className="text-center px-4 py-3 rounded-l-xl"
                  title="الحاضرون ÷ (الحاضرون + الغائبون) — من حلّ موعد حضورهم اليوم؛ الإجازات ومن لم تبدأ ورديته خارج الحساب"
                >
                  نسبة الحضور
                </th>
              </tr>
            </thead>
            <tbody>
              {departments.map((dept) => {
                const due = dept.attended + dept.absent
                const attendanceRate = due > 0 ? Math.round((dept.attended / due) * 100) : null
                return (
                  <tr key={dept.id ?? 'none'} className="table-row">
                    <td
                      className={`table-cell font-medium ${dept.id === null ? 'text-gray-500' : 'text-gray-800'}`}
                    >
                      {dept.name}
                      {!!dept.exempt && <p className="text-xs text-gray-500 mt-1">مستثنى من الحضور: {dept.exempt}</p>}
                    </td>
                    <td className="table-cell text-center">{dept.employees}</td>
                    <td className="table-cell text-center">
                      <span className="text-success-600 font-medium">{dept.attended}</span>
                    </td>
                    <td className="table-cell text-center">
                      <span className="text-danger-600 font-medium">{dept.absent}</span>
                    </td>
                    <td className="table-cell text-center">
                      <span className="text-warning-600 font-medium">{dept.onLeave}</span>
                    </td>
                    <td className="table-cell text-center">
                      {attendanceRate === null ? (
                        <span className="text-gray-300">—</span>
                      ) : (
                        <div className="flex items-center justify-center gap-2">
                          <div className="w-20 h-2 bg-gray-200 rounded-full overflow-hidden">
                            <div
                              className={`h-full rounded-full transition-all ${
                                attendanceRate >= 90
                                  ? 'bg-success-500'
                                  : attendanceRate >= 75
                                  ? 'bg-warning-500'
                                  : 'bg-danger-500'
                              }`}
                              style={{ width: `${attendanceRate}%` }}
                            />
                          </div>
                          <span className="text-sm font-medium text-gray-600">{attendanceRate}%</span>
                        </div>
                      )}
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}
