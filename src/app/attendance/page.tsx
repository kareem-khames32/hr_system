'use client'

import { useEffect, useMemo, useState } from 'react'
import { MainLayout } from '@/components/layout'
import {
  Search,
  Download,
  Calendar,
  UserCheck,
  UserX,
  AlertTriangle,
  ChevronLeft,
  ChevronRight,
  MapPin,
  Camera,
  CheckCircle,
  XCircle,
  Timer,
} from 'lucide-react'
import {
  fetchDailyAttendance,
  fetchEmployees,
  fetchDepartments,
  fetchBranches,
  type ApiAttendanceDay,
  type ApiEmployee,
  type ApiDepartment,
  type ApiBranch,
} from '@/lib/api'

// الصف المعروض — كل القيم محسوبة من السيرفر (لا حساب محلي)
interface AttendanceRecord {
  id: number
  employeeId: number
  employeeCode: string
  employeeName: string
  avatar: string
  department: string
  date: string
  checkIn: string | null
  checkOut: string | null
  workHours: string | null
  status: ApiAttendanceDay['status']
  shiftName: string
  shiftStart: string
  shiftEnd: string
  lateMinutes: number
  location: string
}

const formatWorkMinutes = (mins: number): string | null => {
  if (!mins || mins <= 0) return null
  return `${Math.floor(mins / 60)}:${String(mins % 60).padStart(2, '0')}`
}

const todayStr = () => new Date().toISOString().slice(0, 10)

const shiftDate = (dateStr: string, delta: number): string => {
  const d = new Date(dateStr + 'T12:00:00')
  d.setDate(d.getDate() + delta)
  return d.toISOString().slice(0, 10)
}

const getStatusBadge = (status: AttendanceRecord['status']) => {
  switch (status) {
    case 'present':
      return (
        <span className="badge badge-success flex items-center gap-1">
          <CheckCircle size={12} />
          حاضر
        </span>
      )
    case 'absent':
      return (
        <span className="badge badge-danger flex items-center gap-1">
          <XCircle size={12} />
          غائب
        </span>
      )
    case 'late':
      return (
        <span className="badge badge-warning flex items-center gap-1">
          <AlertTriangle size={12} />
          متأخر
        </span>
      )
    case 'early_leave':
      return (
        <span className="badge bg-orange-50 text-orange-600 flex items-center gap-1">
          <Timer size={12} />
          خروج مبكر
        </span>
      )
  }
}

export default function AttendancePage() {
  const [selectedDate, setSelectedDate] = useState(todayStr())
  const [selectedDepartment, setSelectedDepartment] = useState('all')
  const [selectedStatus, setSelectedStatus] = useState('all')
  const [searchQuery, setSearchQuery] = useState('')

  const [days, setDays] = useState<ApiAttendanceDay[]>([])
  const [employees, setEmployees] = useState<ApiEmployee[]>([])
  const [departments, setDepartments] = useState<ApiDepartment[]>([])
  const [branches, setBranches] = useState<ApiBranch[]>([])
  const [refsLoaded, setRefsLoaded] = useState(false)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  // المراجع (موظفون/أقسام/فروع) — مرة واحدة
  useEffect(() => {
    Promise.all([fetchEmployees(), fetchDepartments(), fetchBranches()])
      .then(([emps, deps, brs]) => {
        setEmployees(emps)
        setDepartments(deps)
        setBranches(brs)
        setRefsLoaded(true)
      })
      .catch((e) => setError(e instanceof Error ? e.message : 'تعذر تحميل البيانات'))
  }, [])

  // سجل اليوم المحدد — من السيرفر (الحالة والتأخير محسوبان هناك)
  useEffect(() => {
    setLoading(true)
    setError('')
    fetchDailyAttendance(selectedDate)
      .then((rows) => setDays(rows))
      .catch((e) => setError(e instanceof Error ? e.message : 'تعذر تحميل سجل الحضور'))
      .finally(() => setLoading(false))
  }, [selectedDate])

  const records: AttendanceRecord[] = useMemo(() => {
    const empById = new Map(employees.map((e) => [e.id, e]))
    const depById = new Map(departments.map((d) => [d.id, d]))
    const branchById = new Map(branches.map((b) => [b.id, b]))
    return days.map((d) => {
      const emp = empById.get(d.employeeId)
      const dep = emp?.departmentId ? depById.get(emp.departmentId) : undefined
      const branch = d.branchId ? branchById.get(d.branchId) : undefined
      return {
        id: d.id,
        employeeId: d.employeeId,
        employeeCode: emp?.employeeCode ?? `#${d.employeeId}`,
        employeeName: emp?.fullName ?? `موظف ${d.employeeId}`,
        avatar: (emp?.fullName ?? 'م').charAt(0),
        department: dep?.name ?? '-',
        date: d.date,
        checkIn: d.checkIn ?? null,
        checkOut: d.checkOut ?? null,
        workHours: formatWorkMinutes(Number(d.workMinutes)),
        status: d.status,
        shiftName: d.shiftName,
        shiftStart: d.shiftStart,
        shiftEnd: d.shiftEnd,
        lateMinutes: Number(d.lateMinutes),
        location: branch?.name ?? '-',
      }
    })
  }, [days, employees, departments, branches])

  // التصفية والبحث — على العميل
  const filteredRecords = records.filter((r) => {
    if (
      searchQuery &&
      !r.employeeName.includes(searchQuery) &&
      !r.employeeCode.toLowerCase().includes(searchQuery.toLowerCase())
    )
      return false
    if (selectedDepartment !== 'all' && r.department !== selectedDepartment) return false
    if (selectedStatus !== 'all' && r.status !== selectedStatus) return false
    return true
  })

  const departmentOptions = Array.from(new Set(records.map((r) => r.department))).filter(
    (d) => d !== '-'
  )

  // الإحصائيات من صفوف السيرفر
  const stats = {
    total: records.length,
    present: records.filter((r) => r.status === 'present').length,
    absent: records.filter((r) => r.status === 'absent').length,
    late: records.filter((r) => r.status === 'late').length,
    earlyLeave: records.filter((r) => r.status === 'early_leave').length,
  }

  return (
    <MainLayout>
      <div className="space-y-6">
        {/* Page Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-gray-800">سجل الحضور والانصراف</h1>
            <p className="text-gray-500 mt-1">متابعة حضور وانصراف الموظفين</p>
          </div>
          <div className="flex items-center gap-3">
            <button className="btn-secondary flex items-center gap-2">
              <Download size={18} />
              تصدير
            </button>
          </div>
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-5 gap-4">
          <div className="card flex items-center gap-4">
            <div className="w-12 h-12 bg-gray-100 rounded-2xl flex items-center justify-center">
              <UserCheck size={24} className="text-gray-600" />
            </div>
            <div>
              <p className="text-sm text-gray-500">الإجمالي</p>
              <p className="text-2xl font-bold text-gray-800">{stats.total}</p>
            </div>
          </div>
          <div className="card flex items-center gap-4">
            <div className="w-12 h-12 bg-success-50 rounded-2xl flex items-center justify-center">
              <CheckCircle size={24} className="text-success-600" />
            </div>
            <div>
              <p className="text-sm text-gray-500">حاضر</p>
              <p className="text-2xl font-bold text-success-600">{stats.present}</p>
            </div>
          </div>
          <div className="card flex items-center gap-4">
            <div className="w-12 h-12 bg-danger-50 rounded-2xl flex items-center justify-center">
              <XCircle size={24} className="text-danger-600" />
            </div>
            <div>
              <p className="text-sm text-gray-500">غائب</p>
              <p className="text-2xl font-bold text-danger-600">{stats.absent}</p>
            </div>
          </div>
          <div className="card flex items-center gap-4">
            <div className="w-12 h-12 bg-warning-50 rounded-2xl flex items-center justify-center">
              <AlertTriangle size={24} className="text-warning-600" />
            </div>
            <div>
              <p className="text-sm text-gray-500">متأخر</p>
              <p className="text-2xl font-bold text-warning-600">{stats.late}</p>
            </div>
          </div>
          <div className="card flex items-center gap-4">
            <div className="w-12 h-12 bg-primary-100 rounded-2xl flex items-center justify-center">
              <Calendar size={24} className="text-primary-600" />
            </div>
            <div>
              <p className="text-sm text-gray-500">خروج مبكر</p>
              <p className="text-2xl font-bold text-primary-600">{stats.earlyLeave}</p>
            </div>
          </div>
        </div>

        {/* Filters */}
        <div className="card">
          <div className="flex flex-wrap items-center gap-4">
            {/* Date Picker */}
            <div className="flex items-center gap-2">
              <button
                onClick={() => setSelectedDate(shiftDate(selectedDate, -1))}
                className="p-2 bg-gray-100 rounded-lg hover:bg-gray-200 transition-colors"
              >
                <ChevronRight size={18} />
              </button>
              <div className="relative">
                <Calendar size={18} className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400" />
                <input
                  type="date"
                  value={selectedDate}
                  onChange={(e) => setSelectedDate(e.target.value)}
                  className="input pr-10 w-44"
                />
              </div>
              <button
                onClick={() => setSelectedDate(shiftDate(selectedDate, 1))}
                className="p-2 bg-gray-100 rounded-lg hover:bg-gray-200 transition-colors"
              >
                <ChevronLeft size={18} />
              </button>
              <button onClick={() => setSelectedDate(todayStr())} className="btn-secondary text-sm py-2">
                اليوم
              </button>
            </div>

            {/* Search */}
            <div className="flex-1 min-w-[250px]">
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

            {/* Department Filter */}
            <select
              value={selectedDepartment}
              onChange={(e) => setSelectedDepartment(e.target.value)}
              className="input w-44"
            >
              <option value="all">كل الأقسام</option>
              {departmentOptions.map((dep) => (
                <option key={dep} value={dep}>
                  {dep}
                </option>
              ))}
            </select>

            {/* Status Filter */}
            <select
              value={selectedStatus}
              onChange={(e) => setSelectedStatus(e.target.value)}
              className="input w-36"
            >
              <option value="all">كل الحالات</option>
              <option value="present">حاضر</option>
              <option value="absent">غائب</option>
              <option value="late">متأخر</option>
              <option value="early_leave">خروج مبكر</option>
            </select>
          </div>
        </div>

        {/* Error Banner */}
        {error && (
          <div className="bg-red-50 text-red-700 rounded-xl p-4 flex items-center gap-2">
            <AlertTriangle size={18} />
            {error}
          </div>
        )}

        {/* Attendance Table */}
        <div className="card overflow-hidden p-0">
          {loading || !refsLoaded ? (
            <div className="flex items-center justify-center py-16">
              <div className="w-8 h-8 border-2 border-primary-500 border-t-transparent rounded-full animate-spin" />
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="table-header">
                    <th className="text-right px-4 py-4">الموظف</th>
                    <th className="text-right px-4 py-4">القسم</th>
                    <th className="text-center px-4 py-4">وردية اليوم</th>
                    <th className="text-center px-4 py-4">الحضور</th>
                    <th className="text-center px-4 py-4">الانصراف</th>
                    <th className="text-center px-4 py-4">ساعات العمل</th>
                    <th className="text-center px-4 py-4">الحالة</th>
                    <th className="text-center px-4 py-4">الموقع</th>
                    <th className="text-center px-4 py-4">التحقق</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredRecords.length === 0 && (
                    <tr>
                      <td colSpan={9} className="text-center py-10 text-gray-400">
                        لا توجد سجلات حضور لهذا اليوم
                      </td>
                    </tr>
                  )}
                  {filteredRecords.map((record) => (
                    <tr key={record.id} className="table-row">
                      <td className="table-cell">
                        <div className="flex items-center gap-3">
                          <div className="w-10 h-10 bg-gradient-to-br from-primary-400 to-primary-600 rounded-xl flex items-center justify-center text-white font-bold">
                            {record.avatar}
                          </div>
                          <div>
                            <p className="font-medium text-gray-800">{record.employeeName}</p>
                            <p className="text-sm text-gray-400 font-mono">{record.employeeCode}</p>
                          </div>
                        </div>
                      </td>
                      <td className="table-cell text-gray-600">{record.department}</td>
                      <td className="table-cell text-center">
                        <div className="text-sm font-medium text-gray-700">{record.shiftName}</div>
                        <div className="text-xs text-gray-400 font-mono" dir="ltr">
                          {record.shiftStart} - {record.shiftEnd}
                        </div>
                        <div className="text-[10px] text-gray-400" dir="ltr">{record.date}</div>
                      </td>
                      <td className="table-cell text-center">
                        {record.checkIn ? (
                          <span className="font-mono text-success-600 font-medium">{record.checkIn}</span>
                        ) : (
                          <span className="text-gray-400">-</span>
                        )}
                      </td>
                      <td className="table-cell text-center">
                        {record.checkOut ? (
                          <span className="font-mono text-danger-600 font-medium">{record.checkOut}</span>
                        ) : (
                          <span className="text-gray-400">-</span>
                        )}
                      </td>
                      <td className="table-cell text-center">
                        {record.workHours ? (
                          <span className="font-mono text-gray-700">{record.workHours}</span>
                        ) : (
                          <span className="text-gray-400">-</span>
                        )}
                      </td>
                      <td className="table-cell text-center">
                        {getStatusBadge(record.status)}
                        {record.lateMinutes > 0 && (
                          <p className="text-xs text-warning-600 mt-1 font-medium">
                            متأخر {record.lateMinutes} دقيقة عن {record.shiftName}
                          </p>
                        )}
                      </td>
                      <td className="table-cell text-center">
                        <div className="flex items-center justify-center gap-1 text-sm text-gray-600">
                          <MapPin size={14} className="text-gray-400" />
                          {record.location}
                        </div>
                      </td>
                      <td className="table-cell text-center">
                        <div className="flex items-center justify-center">
                          <span className="text-success-500">👆</span>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          {/* Pagination */}
          <div className="flex items-center justify-between px-4 py-4 border-t border-gray-100">
            <p className="text-sm text-gray-500">
              عرض <span className="font-medium text-gray-700">1-{filteredRecords.length}</span> من{' '}
              <span className="font-medium text-gray-700">{filteredRecords.length}</span> سجل
            </p>
            <div className="flex items-center gap-2">
              <button className="p-2 border border-gray-200 rounded-lg hover:bg-gray-50">
                <ChevronRight size={18} />
              </button>
              <button className="px-4 py-2 bg-primary-500 text-white rounded-lg text-sm font-medium">
                1
              </button>
              <button className="p-2 border border-gray-200 rounded-lg hover:bg-gray-50">
                <ChevronLeft size={18} />
              </button>
            </div>
          </div>
        </div>

        {/* Legend */}
        <div className="card">
          <div className="flex items-center gap-8">
            <span className="text-sm font-medium text-gray-600">طرق التحقق:</span>
            <div className="flex items-center gap-2">
              <Camera size={16} className="text-primary-500" />
              <span className="text-sm text-gray-600">التعرف على الوجه</span>
            </div>
            <div className="flex items-center gap-2">
              <span>👆</span>
              <span className="text-sm text-gray-600">البصمة</span>
            </div>
            <div className="flex items-center gap-2">
              <span>💳</span>
              <span className="text-sm text-gray-600">البطاقة</span>
            </div>
            <div className="flex items-center gap-2">
              <span>✏️</span>
              <span className="text-sm text-gray-600">إدخال يدوي</span>
            </div>
          </div>
        </div>
      </div>
    </MainLayout>
  )
}
