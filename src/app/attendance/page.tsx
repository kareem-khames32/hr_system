'use client'

import { useEffect, useMemo, useState } from 'react'
import { MainLayout } from '@/components/layout'
import { AttendanceFlexSummary } from '@/components/AttendanceFlexSummary'
import { NextDayCheckoutHint } from '@/components/NextDayCheckoutHint'
import Link from 'next/link'
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
  CheckCircle,
  XCircle,
  Timer,
  RefreshCw,
  Briefcase,
  Laptop,
} from 'lucide-react'
import {
  fetchDailyAttendance,
  fetchEmployees,
  fetchDepartments,
  fetchBranches,
  recomputeAttendanceDay,
  can,
  type ApiAttendanceDay,
  type ApiEmployee,
  type ApiDepartment,
  type ApiBranch,
} from '@/lib/api'
import { localDateStr, localToday } from '@/lib/dates'
import { downloadCsv } from '@/lib/csv'

// الصف المعروض — كل القيم محسوبة من السيرفر (لا حساب محلي)
interface AttendanceRecord {
  flexDay: ApiAttendanceDay
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
  status: string
  attendanceExempt: boolean
  shiftName: string
  shiftStart: string
  shiftEnd: string
  unscheduled: boolean
  scheduleSource: string | null
  lateMinutes: number
  excusedMinutes: number
  deductibleMinutes: number
  leaveConflict: boolean
  // بصمات خارج نافذتي الدخول والخروج (HH:mm مفصولة بفاصلة) — لمراجعة HR
  punchAnomalies: string | null
  // السماحية التي طُبّقت على اليوم (الوردية تغلب العامة) — null = بلا مرجع تأخير
  graceUsed: number | null
  // غياب لحظي لليوم الجاري (لم يبصم بعد بداية ورديته) — غير مخزّن
  live: boolean
  // مصدر وقتي اليوم لعمود «التحقق» (جهاز/يدوي/تصحيح معتمد) — من السيرفر
  punchSource: 'DEVICE' | 'MANUAL' | 'CORRECTION' | null
  manualReason: string | null
  location: string
}

// «بصم رغم الإجازة» يفتح سجل الإجازات على الصف نفسه مباشرة: الموظف في مربع البحث واليوم في فلتر
// التاريخ — بدل قائمة غير مفلترة يدوّر فيها المستخدم على الموظف من جديد. الكود أدقّ من الاسم في
// البحث، والاسم بديله لو الكود مش محفوظ (الصف بيعرض «#رقم» ساعتها).
const leaveConflictHref = (record: AttendanceRecord): string =>
  `/leaves?employee=${encodeURIComponent(record.employeeCode.startsWith('#') ? record.employeeName : record.employeeCode)}&date=${record.date}`

const formatWorkMinutes = (mins: number): string | null => {
  if (!mins || mins <= 0) return null
  return `${Math.floor(mins / 60)}:${String(mins % 60).padStart(2, '0')}`
}

// اليوم بالتوقيت المحلي — toISOString كانت تفتح يوم امبارح بعد منتصف الليل
const todayStr = () => localToday()

const shiftDate = (dateStr: string, delta: number): string => {
  const d = new Date(dateStr + 'T12:00:00')
  d.setDate(d.getDate() + delta)
  return localDateStr(d)
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
    case 'leave':
      return (
        <span className="badge bg-indigo-50 text-indigo-600 flex items-center gap-1">
          <Calendar size={12} />
          في إجازة
        </span>
      )
    case 'holiday':
      return (
        <span className="badge bg-blue-50 text-blue-600 flex items-center gap-1">
          <Calendar size={12} />
          عطلة
        </span>
      )
    case 'partial_leave':
      return (
        <span className="badge bg-indigo-100 text-indigo-700 flex items-center gap-1">
          <Timer size={12} />
          إجازة جزئية
        </span>
      )
    case 'mission':
      return (
        <span
          className="badge bg-teal-50 text-teal-700 flex items-center gap-1"
          title="مأمورية معتمدة — يوم معذور بلا تأخير ولا غياب"
        >
          <Briefcase size={12} />
          مأمورية
        </span>
      )
    case 'remote':
      return (
        <span
          className="badge bg-cyan-50 text-cyan-700 flex items-center gap-1"
          title="عمل عن بُعد معتمد — يوم معذور بلا تأخير ولا غياب"
        >
          <Laptop size={12} />
          عمل عن بُعد
        </span>
      )
    case 'exempt':
      return <span className="badge bg-gray-100 text-gray-600">مستثنى من الحضور</span>
    case 'missing_punch':
      return (
        <span
          className="badge bg-rose-50 text-rose-700 flex items-center gap-1"
          title="يوم منقضٍ ببصمة طرف واحد (دخول بلا خروج أو العكس) — لا يُحسب حضوراً حتى تُصحَّح البصمة"
        >
          <AlertTriangle size={12} />
          بصمة ناقصة
        </span>
      )
  }
}

export default function AttendancePage() {
  const [selectedDate, setSelectedDate] = useState(todayStr())
  const [selectedDepartment, setSelectedDepartment] = useState('all')
  const [selectedStatus, setSelectedStatus] = useState('all')
  const [selectedShift, setSelectedShift] = useState('all')
  const [searchQuery, setSearchQuery] = useState('')

  const [days, setDays] = useState<ApiAttendanceDay[]>([])
  const [employees, setEmployees] = useState<ApiEmployee[]>([])
  const [departments, setDepartments] = useState<ApiDepartment[]>([])
  const [branches, setBranches] = useState<ApiBranch[]>([])
  const [refsLoaded, setRefsLoaded] = useState(false)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [notice, setNotice] = useState('')
  // زر «إعادة حساب اليوم» لمن يملك إدارة الحضور فقط (الفرض الحقيقي في الباك)
  const [canManage, setCanManage] = useState(false)
  const [recomputing, setRecomputing] = useState(false)
  // يعيد تحميل سجل اليوم بعد إعادة الحساب
  const [reloadKey, setReloadKey] = useState(0)

  // المراجع (موظفون/أقسام/فروع) — مرة واحدة
  useEffect(() => {
    setCanManage(can('attendance.manage'))
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
  }, [selectedDate, reloadKey])

  // إعادة حساب اليوم المحدد لكل موظفي النطاق — بعد تصحيح بصمة/تعديل جدول؛
  // اليوم المنقضي يُسجَّل فيه غياب من لم يبصم (لو فاتته المهمة الليلية)
  const handleRecompute = async () => {
    if (recomputing) return
    if (!confirm(`إعادة حساب حضور يوم ${selectedDate} لكل الموظفين؟`)) return
    setRecomputing(true)
    setError('')
    setNotice('')
    try {
      const res = await recomputeAttendanceDay(selectedDate)
      setNotice(
        `تمت إعادة حساب ${res.recomputed} سجل` +
          (res.materialized > 0 ? ` وتسجيل ${res.materialized} يوم غياب` : '') +
          (res.failed > 0 ? ` — تعذّر ${res.failed}` : '')
      )
      setReloadKey((k) => k + 1)
    } catch (e) {
      setError(e instanceof Error ? e.message : 'تعذرت إعادة حساب اليوم')
    } finally {
      setRecomputing(false)
    }
  }

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
        flexDay: d,
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
        attendanceExempt: d.attendanceExempt === true,
        shiftName: d.shiftName,
        shiftStart: d.shiftStart,
        shiftEnd: d.shiftEnd,
        unscheduled: d.unscheduled === true,
        scheduleSource: d.scheduleSource ?? null,
        lateMinutes: Number(d.lateMinutes),
        excusedMinutes: Number((d as any).excusedMinutes ?? 0),
        deductibleMinutes: Number(d.deductibleMinutes ?? 0),
        leaveConflict: d.leaveConflict === true,
        punchAnomalies: d.punchAnomalies ?? null,
        graceUsed: d.graceUsed ?? null,
        live: d.live === true,
        punchSource: d.punchSource ?? null,
        manualReason: d.manualReason ?? null,
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
    if (selectedStatus === 'exempt' ? !r.attendanceExempt : selectedStatus !== 'all' && r.status !== selectedStatus) return false
    // «بلا وردية مُسندة»: جدول العمل الافتراضي مفترَض أو بلا وردية إطلاقاً
    if (
      selectedShift === 'unassigned' &&
      !(r.unscheduled || r.scheduleSource === 'default')
    )
      return false
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
    partialLeave: records.filter((r) => r.status === 'partial_leave').length,
    // بصمة طرف واحد ليوم منقضٍ — خارج عدّ «حاضر» حتى تُصحَّح
    missingPunch: records.filter((r) => r.status === 'missing_punch').length,
  }

  return (
    <MainLayout>
      <div className="space-y-6">
        {/* Page Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-gray-800">سجل الحضور</h1>
            <p className="text-gray-500 mt-1">متابعة حضور وانصراف الموظفين</p>
          </div>
          <div className="flex items-center gap-3">
            {canManage && (
              <button
                onClick={handleRecompute}
                disabled={recomputing}
                title="إعادة حساب حضور اليوم المحدد لكل الموظفين — بعد تصحيح بصمة أو تعديل جدول (واليوم المنقضي يُسجَّل فيه الغياب)"
                className="btn-secondary flex items-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <RefreshCw size={18} className={recomputing ? 'animate-spin' : ''} />
                إعادة حساب اليوم
              </button>
            )}
            <button disabled={loading || !filteredRecords.length} onClick={() => downloadCsv(`attendance-${selectedDate}.csv`, ['الكود', 'الموظف', 'القسم', 'التاريخ', 'الدخول', 'الخروج', 'ساعات العمل', 'الحالة', 'الوردية', 'دقائق التأخير', 'دقائق إذن معذور', 'دقائق إذن بخصم', 'مصدر البصمة', 'سبب التعديل'], filteredRecords.map((r) => [r.employeeCode, r.employeeName, r.department, r.date, r.checkIn, r.checkOut, r.workHours, ({ present: 'حاضر', absent: 'غائب', late: 'متأخر', early_leave: 'خروج مبكر', leave: 'إجازة', holiday: 'عطلة', partial_leave: 'إجازة جزئية', mission: 'مأمورية', remote: 'عمل عن بعد', missing_punch: 'بصمة ناقصة' } as Record<string, string>)[r.status] ?? r.status, r.shiftName, r.lateMinutes, r.excusedMinutes, r.deductibleMinutes, r.punchSource, r.manualReason]))} className="btn-secondary flex items-center gap-2">
              <Download size={18} />
              تصدير
            </button>
          </div>
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-6 gap-4">
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
              {stats.missingPunch > 0 && (
                <p
                  className="text-xs text-rose-600"
                  title="أيام منقضية ببصمة طرف واحد — لا تُعدّ حضوراً حتى تُصحَّح البصمة"
                >
                  + {stats.missingPunch} بصمة ناقصة (خارج العدّ)
                </p>
              )}
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
          <div className="card flex items-center gap-4">
            <div className="w-12 h-12 bg-indigo-100 rounded-2xl flex items-center justify-center">
              <Timer size={24} className="text-indigo-600" />
            </div>
            <div>
              <p className="text-sm text-gray-500">إجازة جزئية</p>
              <p className="text-2xl font-bold text-indigo-600">{stats.partialLeave}</p>
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
              <option value="leave">في إجازة</option>
              <option value="partial_leave">إجازة جزئية</option>
              <option value="holiday">عطلة</option>
              <option value="mission">مأمورية</option>
              <option value="remote">عمل عن بُعد</option>
              <option value="missing_punch">بصمة ناقصة</option>
              <option value="exempt">المستثنون من الحضور</option>
            </select>

            {/* Shift Filter — موظفون بلا وردية مُسندة */}
            <select
              value={selectedShift}
              onChange={(e) => setSelectedShift(e.target.value)}
              className="input w-44"
              title="لم تُسند لهم وردية ولا جدول عمل — طُبّق الجدول الافتراضي أو بلا وردية إطلاقاً"
            >
              <option value="all">كل الورديات</option>
              <option value="unassigned">بلا وردية مُسندة</option>
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
        {notice && (
          <div className="bg-success-50 text-success-700 rounded-xl p-4 flex items-center gap-2">
            <CheckCircle size={18} />
            {notice}
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
                        {record.unscheduled ? (
                          <span
                            className="badge bg-amber-100 text-amber-700"
                            title="لا وردية ولا جدول عمل مُسند ولا جدول افتراضي — البصمة بلا حساب تأخير أو أوفرتايم"
                          >
                            بلا وردية
                          </span>
                        ) : (
                          <>
                            <div className="text-sm font-medium text-gray-700">{record.shiftName}</div>
                            <div className="text-xs text-gray-400 font-mono" dir="ltr">
                              {record.shiftStart} - {record.shiftEnd}
                            </div>
                          </>
                        )}
                        {record.scheduleSource === 'default' && (
                          <div
                            className="text-[10px] text-amber-600"
                            title="لم تُسند للموظف وردية ولا جدول عمل — طُبّقت ساعات جدول العمل الافتراضي (العطلة الأسبوعية من إعداد الفرع/السياسات)"
                          >
                            جدول افتراضي (مفترَض)
                          </div>
                        )}
                        {/* الوردية المرنة لا تُطبَّق فيها السماحية — نافذة الحضور تغنيها */}
                        {record.graceUsed != null && !(record.flexDay.attendanceRuleSnapshot?.flexEnabled && (record.flexDay.attendanceRuleSnapshot.windowSupersedesGrace ?? true)) && (
                          <div
                            className="text-[10px] text-gray-400"
                            title="السماحية التي طُبّقت على هذا اليوم — سماحية الوردية إن حُدّدت لها، وإلا القيمة العامة"
                          >
                            سماحية {record.graceUsed} د
                          </div>
                        )}
                        <div className="text-[10px] text-gray-400" dir="ltr">{record.date}</div>
                      </td>
                      <td className="table-cell text-center">
                        {record.checkIn ? (
                          <><span className="font-mono text-success-600 font-medium">{record.checkIn}</span><NextDayCheckoutHint day={record} field="checkIn" /></>
                        ) : (
                          <span className="text-gray-400">-</span>
                        )}
                      </td>
                      <td className="table-cell text-center">
                        {record.checkOut ? (
                          <><span className="font-mono text-danger-600 font-medium">{record.checkOut}</span><NextDayCheckoutHint day={record} /></>
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
                        <div className="flex items-center justify-center gap-1.5 flex-wrap">
                          {getStatusBadge(record.status)}
                          {record.attendanceExempt && record.status !== 'exempt' && <span className="badge bg-gray-100 text-gray-600">مستثنى من الحضور</span>}
                          {record.leaveConflict && (
                            <Link
                              href={leaveConflictHref(record)}
                              className="badge bg-amber-100 text-amber-700 hover:bg-amber-200 flex items-center gap-1"
                              title="الموظف حضر يوم إجازته المعتمدة — يفتح سجل الإجازات على هذا الموظف ويومه: إلغاء الإجازة يحسبه دواماً ويرجع الرصيد"
                            >
                              <AlertTriangle size={12} />
                              بصم رغم الإجازة
                            </Link>
                          )}
                          {record.punchAnomalies && (
                            <span
                              className="badge bg-amber-50 text-amber-700 flex items-center gap-1"
                              title={`بصمات خارج نافذتي الدخول والخروج: ${record.punchAnomalies.split(',').join('، ')} — لم تُرمَ؛ راجعها أو صحّح البصمة`}
                            >
                              <AlertTriangle size={12} />
                              خارج النافذة: {record.punchAnomalies.split(',').slice(0, 3).join('، ')}
                              {record.punchAnomalies.split(',').length > 3 ? '…' : ''}
                            </span>
                          )}
                        </div>
                        <AttendanceFlexSummary day={record.flexDay} />
                        {record.live && (
                          <p
                            className="text-xs text-gray-400 mt-1"
                            title="غياب لحظي: بدأت ورديته ولم يسجّل بصمة — يُثبَّت بعد انتهاء اليوم"
                          >
                            لم يسجّل حضوراً حتى الآن
                          </p>
                        )}
                        {record.lateMinutes > 0 && (
                          <p className="text-xs text-warning-600 mt-1 font-medium">
                            متأخر {record.lateMinutes} دقيقة عن {record.shiftName}
                            {record.graceUsed != null && !(record.flexDay.attendanceRuleSnapshot?.flexEnabled && (record.flexDay.attendanceRuleSnapshot.windowSupersedesGrace ?? true)) && (
                              <span className="text-gray-400 font-normal">
                                {' '}(بعد سماح {record.graceUsed} د)
                              </span>
                            )}
                          </p>
                        )}
                        {record.excusedMinutes > 0 && (
                          <p className="text-xs text-success-600 mt-1 font-medium">
                            معذور بإذن: {record.excusedMinutes} د
                          </p>
                        )}
                        {record.deductibleMinutes > 0 && (
                          <p
                            className="text-xs text-amber-600 mt-1 font-medium"
                            title="دقائق إذن بخصم — تُخصم من الراتب"
                          >
                            {record.deductibleMinutes} د بخصم
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
                        {/* مصدر وقتي اليوم — كان 👆 ثابتاً حتى للإدخال اليدوي */}
                        <div className="flex items-center justify-center">
                          {record.punchSource === 'MANUAL' ? (
                            <span
                              className="badge bg-amber-50 text-amber-700"
                              title={`إدخال يدوي من HR${record.manualReason ? ` — السبب: ${record.manualReason}` : ''}`}
                            >
                              ✏️ يدوي
                            </span>
                          ) : record.punchSource === 'CORRECTION' ? (
                            <span className="badge bg-blue-50 text-blue-700" title="وقت من تصحيح بصمة معتمد">
                              📝 تصحيح
                            </span>
                          ) : record.punchSource === 'DEVICE' ? (
                            <span className="text-success-500" title="جهاز البصمة">👆</span>
                          ) : record.checkIn || record.checkOut ? (
                            <span
                              className="text-gray-400"
                              title="مصدر غير محدد — بصمة أقدم من تتبّع المصدر بلا رقم جهاز"
                            >
                              ؟
                            </span>
                          ) : (
                            <span className="text-gray-400">-</span>
                          )}
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
              عدد النتائج: <span className="font-medium text-gray-700">{filteredRecords.length}</span> سجل
            </p>
          </div>
        </div>

        {/* Legend */}
        <div className="card">
          <div className="flex items-center gap-8">
            <span className="text-sm font-medium text-gray-600">مصدر التحقق:</span>
            <div className="flex items-center gap-2">
              <span>👆</span>
              <span className="text-sm text-gray-600">جهاز البصمة</span>
            </div>
            <div className="flex items-center gap-2">
              <span>✏️</span>
              <span className="text-sm text-gray-600">إدخال يدوي (HR)</span>
            </div>
            <div className="flex items-center gap-2">
              <span>📝</span>
              <span className="text-sm text-gray-600">تصحيح بصمة معتمد</span>
            </div>
          </div>
        </div>
      </div>
    </MainLayout>
  )
}
