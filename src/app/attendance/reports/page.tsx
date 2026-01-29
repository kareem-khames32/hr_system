'use client'

import { useState } from 'react'
import { MainLayout } from '@/components/layout'
import {
  Search,
  Download,
  Calendar,
  Clock,
  Users,
  TrendingUp,
  TrendingDown,
  BarChart3,
  Filter,
  FileText,
  Printer,
} from 'lucide-react'

interface AttendanceReport {
  employeeId: string
  employeeName: string
  department: string
  workDays: number
  presentDays: number
  absentDays: number
  lateDays: number
  earlyLeaveDays: number
  overtimeHours: number
  attendanceRate: number
}

const reportData: AttendanceReport[] = [
  {
    employeeId: 'EMP001',
    employeeName: 'أحمد محمد علي',
    department: 'تقنية المعلومات',
    workDays: 22,
    presentDays: 21,
    absentDays: 1,
    lateDays: 2,
    earlyLeaveDays: 0,
    overtimeHours: 12,
    attendanceRate: 95.5,
  },
  {
    employeeId: 'EMP002',
    employeeName: 'سارة أحمد الخالدي',
    department: 'الموارد البشرية',
    workDays: 22,
    presentDays: 22,
    absentDays: 0,
    lateDays: 1,
    earlyLeaveDays: 1,
    overtimeHours: 8,
    attendanceRate: 100,
  },
  {
    employeeId: 'EMP003',
    employeeName: 'عمر سالم الحربي',
    department: 'المبيعات',
    workDays: 22,
    presentDays: 20,
    absentDays: 2,
    lateDays: 4,
    earlyLeaveDays: 2,
    overtimeHours: 0,
    attendanceRate: 90.9,
  },
  {
    employeeId: 'EMP004',
    employeeName: 'نورة محمد الدوسري',
    department: 'التسويق',
    workDays: 22,
    presentDays: 21,
    absentDays: 1,
    lateDays: 0,
    earlyLeaveDays: 0,
    overtimeHours: 15,
    attendanceRate: 95.5,
  },
  {
    employeeId: 'EMP005',
    employeeName: 'فهد عبدالله السعيد',
    department: 'تقنية المعلومات',
    workDays: 22,
    presentDays: 22,
    absentDays: 0,
    lateDays: 0,
    earlyLeaveDays: 0,
    overtimeHours: 20,
    attendanceRate: 100,
  },
]

const monthlyStats = [
  { month: 'يناير', rate: 94.5 },
  { month: 'فبراير', rate: 95.2 },
  { month: 'مارس', rate: 93.8 },
  { month: 'أبريل', rate: 96.1 },
  { month: 'مايو', rate: 95.8 },
  { month: 'يونيو', rate: 94.9 },
]

export default function AttendanceReportsPage() {
  const [selectedMonth, setSelectedMonth] = useState('2024-01')
  const [selectedDepartment, setSelectedDepartment] = useState('all')
  const [searchTerm, setSearchTerm] = useState('')

  const filteredData = reportData.filter((emp) => {
    const matchesSearch = emp.employeeName.includes(searchTerm)
    const matchesDept =
      selectedDepartment === 'all' || emp.department === selectedDepartment
    return matchesSearch && matchesDept
  })

  const stats = {
    avgAttendance: (
      reportData.reduce((sum, e) => sum + e.attendanceRate, 0) / reportData.length
    ).toFixed(1),
    totalAbsent: reportData.reduce((sum, e) => sum + e.absentDays, 0),
    totalLate: reportData.reduce((sum, e) => sum + e.lateDays, 0),
    totalOvertime: reportData.reduce((sum, e) => sum + e.overtimeHours, 0),
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

        {/* Stats */}
        <div className="grid grid-cols-4 gap-4">
          <div className="card flex items-center gap-4">
            <div className="w-12 h-12 bg-primary-100 rounded-2xl flex items-center justify-center">
              <TrendingUp size={24} className="text-primary-600" />
            </div>
            <div>
              <p className="text-sm text-gray-500">متوسط الحضور</p>
              <p className="text-2xl font-bold text-gray-800">{stats.avgAttendance}%</p>
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
              <p className="text-sm text-gray-500">ساعات إضافية</p>
              <p className="text-2xl font-bold text-gray-800">{stats.totalOvertime}</p>
            </div>
          </div>
        </div>

        {/* Chart */}
        <div className="card">
          <h2 className="text-lg font-bold text-gray-800 mb-4">معدل الحضور الشهري</h2>
          <div className="h-48 flex items-end gap-4">
            {monthlyStats.map((month, index) => (
              <div key={index} className="flex-1 flex flex-col items-center">
                <span className="text-sm font-medium text-gray-800 mb-2">{month.rate}%</span>
                <div
                  className="w-full bg-gradient-to-t from-primary-500 to-primary-400 rounded-t-lg transition-all hover:from-primary-600 hover:to-primary-500"
                  style={{ height: `${month.rate}%` }}
                />
                <span className="text-xs text-gray-500 mt-2">{month.month}</span>
              </div>
            ))}
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
            <select
              value={selectedDepartment}
              onChange={(e) => setSelectedDepartment(e.target.value)}
              className="input w-48"
            >
              <option value="all">كل الأقسام</option>
              <option value="تقنية المعلومات">تقنية المعلومات</option>
              <option value="الموارد البشرية">الموارد البشرية</option>
              <option value="المبيعات">المبيعات</option>
              <option value="التسويق">التسويق</option>
            </select>
          </div>
        </div>

        {/* Table */}
        <div className="card overflow-hidden">
          <table className="w-full">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-4 py-3 text-right text-sm font-medium text-gray-600">الموظف</th>
                <th className="px-4 py-3 text-right text-sm font-medium text-gray-600">القسم</th>
                <th className="px-4 py-3 text-center text-sm font-medium text-gray-600">أيام العمل</th>
                <th className="px-4 py-3 text-center text-sm font-medium text-gray-600">حضور</th>
                <th className="px-4 py-3 text-center text-sm font-medium text-gray-600">غياب</th>
                <th className="px-4 py-3 text-center text-sm font-medium text-gray-600">تأخير</th>
                <th className="px-4 py-3 text-center text-sm font-medium text-gray-600">خروج مبكر</th>
                <th className="px-4 py-3 text-center text-sm font-medium text-gray-600">إضافي</th>
                <th className="px-4 py-3 text-center text-sm font-medium text-gray-600">النسبة</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {filteredData.map((emp) => (
                <tr key={emp.employeeId} className="hover:bg-gray-50">
                  <td className="px-4 py-4">
                    <p className="font-medium text-gray-800">{emp.employeeName}</p>
                    <p className="text-sm text-gray-500">{emp.employeeId}</p>
                  </td>
                  <td className="px-4 py-4 text-gray-600">{emp.department}</td>
                  <td className="px-4 py-4 text-center text-gray-600">{emp.workDays}</td>
                  <td className="px-4 py-4 text-center text-success-600 font-medium">{emp.presentDays}</td>
                  <td className="px-4 py-4 text-center text-red-600 font-medium">{emp.absentDays}</td>
                  <td className="px-4 py-4 text-center text-warning-600 font-medium">{emp.lateDays}</td>
                  <td className="px-4 py-4 text-center text-orange-600 font-medium">{emp.earlyLeaveDays}</td>
                  <td className="px-4 py-4 text-center text-blue-600 font-medium">{emp.overtimeHours}h</td>
                  <td className="px-4 py-4 text-center">
                    <span
                      className={`px-3 py-1 rounded-full text-sm font-medium ${
                        emp.attendanceRate >= 95
                          ? 'bg-success-50 text-success-700'
                          : emp.attendanceRate >= 90
                          ? 'bg-warning-50 text-warning-700'
                          : 'bg-red-100 text-red-700'
                      }`}
                    >
                      {emp.attendanceRate}%
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </MainLayout>
  )
}
