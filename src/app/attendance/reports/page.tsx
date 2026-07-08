'use client'

import { useEffect, useState } from 'react'
import { MainLayout } from '@/components/layout'
import {
  Search,
  Download,
  Clock,
  Users,
  TrendingUp,
  BarChart3,
  Printer,
} from 'lucide-react'
import { fetchAttendanceReport, fetchOvertimeReport } from '@/lib/api'

interface AttendanceReportRow {
  employeeId: number
  fullName: string
  employeeCode: string
  presentDays: number
  lateDays: number
  absentDays: number
  earlyLeaveDays: number
  totalLateMinutes: number
  totalWorkMinutes: number
}

interface OvertimeReportRow {
  employeeId: number
  fullName: string
  status: string
  entries: number
  actualHours: number
  payableHours: number
}

// دقائق → H:mm
const formatMinutes = (mins: number): string => {
  const m = Number(mins)
  if (!m || m <= 0) return '0:00'
  return `${Math.floor(m / 60)}:${String(m % 60).padStart(2, '0')}`
}

const overtimeStatusLabels: Record<string, string> = {
  PENDING: 'قيد التأكيد',
  CONFIRMED: 'مؤكد',
  REJECTED: 'مرفوض',
  PAID: 'مدفوع',
}

const currentMonth = () => new Date().toISOString().slice(0, 7)

export default function AttendanceReportsPage() {
  const [selectedMonth, setSelectedMonth] = useState(currentMonth())
  const [searchTerm, setSearchTerm] = useState('')

  const [attendanceRows, setAttendanceRows] = useState<AttendanceReportRow[]>([])
  const [overtimeRows, setOvertimeRows] = useState<OvertimeReportRow[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  useEffect(() => {
    if (!selectedMonth) return
    setLoading(true)
    setError('')
    Promise.all([fetchAttendanceReport(selectedMonth), fetchOvertimeReport(selectedMonth)])
      .then(([att, ot]) => {
        setAttendanceRows(Array.isArray(att) ? att : [])
        setOvertimeRows(Array.isArray(ot) ? ot : [])
      })
      .catch((e) => setError(e instanceof Error ? e.message : 'تعذر تحميل التقارير'))
      .finally(() => setLoading(false))
  }, [selectedMonth])

  const filteredData = attendanceRows.filter(
    (emp) =>
      (emp.fullName ?? '').includes(searchTerm) ||
      (emp.employeeCode ?? '').toLowerCase().includes(searchTerm.toLowerCase())
  )

  const stats = {
    totalPresent: attendanceRows.reduce((sum, e) => sum + Number(e.presentDays), 0),
    totalAbsent: attendanceRows.reduce((sum, e) => sum + Number(e.absentDays), 0),
    totalLate: attendanceRows.reduce((sum, e) => sum + Number(e.lateDays), 0),
    totalOvertime: overtimeRows.reduce((sum, e) => sum + Number(e.payableHours), 0),
  }

  return (
    <MainLayout>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-gray-800">تقارير الحضور</h1>
            <p className="text-gray-500 mt-1">تحليل وإحصائيات الحضور والانصراف</p>
          </div>
          <div className="flex items-center gap-3">
            <button className="btn-secondary flex items-center gap-2">
              <Printer size={18} />
              طباعة
            </button>
            <button className="btn-primary flex items-center gap-2">
              <Download size={18} />
              تصدير Excel
            </button>
          </div>
        </div>

        {error && <div className="bg-red-50 text-red-700 rounded-xl p-4">{error}</div>}

        {/* Stats */}
        <div className="grid grid-cols-4 gap-4">
          <div className="card flex items-center gap-4">
            <div className="w-12 h-12 bg-primary-100 rounded-2xl flex items-center justify-center">
              <TrendingUp size={24} className="text-primary-600" />
            </div>
            <div>
              <p className="text-sm text-gray-500">أيام الحضور</p>
              <p className="text-2xl font-bold text-gray-800">{stats.totalPresent}</p>
            </div>
          </div>
          <div className="card flex items-center gap-4">
            <div className="w-12 h-12 bg-red-100 rounded-2xl flex items-center justify-center">
              <Users size={24} className="text-red-600" />
            </div>
            <div>
              <p className="text-sm text-gray-500">أيام الغياب</p>
              <p className="text-2xl font-bold text-gray-800">{stats.totalAbsent}</p>
            </div>
          </div>
          <div className="card flex items-center gap-4">
            <div className="w-12 h-12 bg-warning-50 rounded-2xl flex items-center justify-center">
              <Clock size={24} className="text-warning-600" />
            </div>
            <div>
              <p className="text-sm text-gray-500">أيام التأخير</p>
              <p className="text-2xl font-bold text-gray-800">{stats.totalLate}</p>
            </div>
          </div>
          <div className="card flex items-center gap-4">
            <div className="w-12 h-12 bg-success-50 rounded-2xl flex items-center justify-center">
              <BarChart3 size={24} className="text-success-600" />
            </div>
            <div>
              <p className="text-sm text-gray-500">ساعات إضافية مستحقة</p>
              <p className="text-2xl font-bold text-gray-800">{stats.totalOvertime}</p>
            </div>
          </div>
        </div>

        {/* Filters */}
        <div className="card">
          <div className="flex items-center gap-4">
            <div className="relative flex-1">
              <Search size={18} className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400" />
              <input
                type="text"
                placeholder="بحث عن موظف..."
                className="input pr-10 w-full"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
              />
            </div>
            <input
              type="month"
              className="input w-48"
              value={selectedMonth}
              onChange={(e) => setSelectedMonth(e.target.value)}
            />
          </div>
        </div>

        {loading ? (
          <div className="card flex items-center justify-center py-16">
            <div className="w-8 h-8 border-2 border-primary-500 border-t-transparent rounded-full animate-spin" />
          </div>
        ) : (
          <>
            {/* Attendance Report Table */}
            <div className="card overflow-hidden">
              <h2 className="text-lg font-bold text-gray-800 px-4 pt-4 pb-2">
                تقرير الحضور — {selectedMonth}
              </h2>
              <table className="w-full">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-4 py-3 text-right text-sm font-medium text-gray-600">الموظف</th>
                    <th className="px-4 py-3 text-center text-sm font-medium text-gray-600">حضور</th>
                    <th className="px-4 py-3 text-center text-sm font-medium text-gray-600">تأخير</th>
                    <th className="px-4 py-3 text-center text-sm font-medium text-gray-600">غياب</th>
                    <th className="px-4 py-3 text-center text-sm font-medium text-gray-600">خروج مبكر</th>
                    <th className="px-4 py-3 text-center text-sm font-medium text-gray-600">دقائق التأخير</th>
                    <th className="px-4 py-3 text-center text-sm font-medium text-gray-600">ساعات العمل</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {filteredData.length === 0 ? (
                    <tr>
                      <td colSpan={7} className="px-4 py-10 text-center text-gray-400">
                        لا توجد بيانات حضور لهذا الشهر
                      </td>
                    </tr>
                  ) : (
                    filteredData.map((emp) => (
                      <tr key={emp.employeeId} className="hover:bg-gray-50">
                        <td className="px-4 py-4">
                          <p className="font-medium text-gray-800">{emp.fullName}</p>
                          <p className="text-sm text-gray-500">{emp.employeeCode}</p>
                        </td>
                        <td className="px-4 py-4 text-center text-success-600 font-medium">
                          {Number(emp.presentDays)}
                        </td>
                        <td className="px-4 py-4 text-center text-warning-600 font-medium">
                          {Number(emp.lateDays)}
                        </td>
                        <td className="px-4 py-4 text-center text-red-600 font-medium">
                          {Number(emp.absentDays)}
                        </td>
                        <td className="px-4 py-4 text-center text-orange-600 font-medium">
                          {Number(emp.earlyLeaveDays)}
                        </td>
                        <td className="px-4 py-4 text-center text-gray-600 font-medium">
                          {Number(emp.totalLateMinutes)}
                        </td>
                        <td className="px-4 py-4 text-center text-blue-600 font-medium font-mono">
                          {formatMinutes(Number(emp.totalWorkMinutes))}
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>

            {/* Overtime Report Table */}
            <div className="card overflow-hidden">
              <h2 className="text-lg font-bold text-gray-800 px-4 pt-4 pb-2">
                تقرير الساعات الإضافية — {selectedMonth}
              </h2>
              <table className="w-full">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-4 py-3 text-right text-sm font-medium text-gray-600">الموظف</th>
                    <th className="px-4 py-3 text-center text-sm font-medium text-gray-600">الحالة</th>
                    <th className="px-4 py-3 text-center text-sm font-medium text-gray-600">عدد الأيام</th>
                    <th className="px-4 py-3 text-center text-sm font-medium text-gray-600">ساعات فعلية</th>
                    <th className="px-4 py-3 text-center text-sm font-medium text-gray-600">ساعات مستحقة</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {overtimeRows.length === 0 ? (
                    <tr>
                      <td colSpan={5} className="px-4 py-10 text-center text-gray-400">
                        لا توجد ساعات إضافية لهذا الشهر
                      </td>
                    </tr>
                  ) : (
                    overtimeRows.map((row, index) => (
                      <tr key={`${row.employeeId}-${row.status}-${index}`} className="hover:bg-gray-50">
                        <td className="px-4 py-4">
                          <p className="font-medium text-gray-800">{row.fullName}</p>
                        </td>
                        <td className="px-4 py-4 text-center">
                          <span
                            className={`px-3 py-1 rounded-full text-sm font-medium ${
                              row.status === 'PAID' || row.status === 'CONFIRMED'
                                ? 'bg-success-50 text-success-700'
                                : row.status === 'REJECTED'
                                ? 'bg-red-100 text-red-700'
                                : 'bg-warning-50 text-warning-700'
                            }`}
                          >
                            {overtimeStatusLabels[row.status] ?? row.status}
                          </span>
                        </td>
                        <td className="px-4 py-4 text-center text-gray-600 font-medium">
                          {Number(row.entries)}
                        </td>
                        <td className="px-4 py-4 text-center text-gray-600 font-medium">
                          {Number(row.actualHours)}
                        </td>
                        <td className="px-4 py-4 text-center text-blue-600 font-medium">
                          {Number(row.payableHours)}
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </>
        )}
      </div>
    </MainLayout>
  )
}
