'use client'

import { useEffect, useState } from 'react'
import { MainLayout } from '@/components/layout'
import {
  ChevronRight,
  ChevronLeft,
  Calendar,
  Copy,
  Save,
  Search,
  Clock,
  Sun,
  Moon,
  Coffee,
  Home,
  RotateCcw,
  CheckCircle,
  AlertCircle,
  Printer,
  FileSpreadsheet,
  Settings,
  RefreshCw,
  Eye,
  Edit3,
  Layers,
  UserCheck,
  X,
} from 'lucide-react'
import {
  fetchWeekSchedule,
  upsertWeekSchedule,
  fetchEmployees,
  fetchDepartments,
  type ApiEmployee,
  type ApiDepartment,
} from '@/lib/api'

// أنواع البيانات
interface Shift {
  id: string
  name: string
  code: string
  color: string
  bgColor: string
  startTime: string
  endTime: string
  workHours: number
}

// صف الموظف في الجدول — الوردية من السيرفر (وردية واحدة لكل موظف/أسبوع)
interface EmployeeRow {
  id: number
  employeeCode: string
  employeeName: string
  department: string
  avatar: string
  position: string
}

// الورديات المتاحة
const shifts: Shift[] = [
  { id: 'morning', name: 'صباحي', code: 'ص', color: 'text-blue-700', bgColor: 'bg-blue-100', startTime: '08:00', endTime: '17:00', workHours: 8 },
  { id: 'ten', name: 'وردية 10', code: '10', color: 'text-sky-700', bgColor: 'bg-sky-100', startTime: '10:00', endTime: '19:00', workHours: 8 },
  { id: 'eleven', name: 'وردية 11', code: '11', color: 'text-violet-700', bgColor: 'bg-violet-100', startTime: '11:00', endTime: '20:00', workHours: 8 },
  { id: 'evening', name: 'مسائي', code: 'م', color: 'text-orange-700', bgColor: 'bg-orange-100', startTime: '14:00', endTime: '23:00', workHours: 8 },
  { id: 'night', name: 'ليلي', code: 'ل', color: 'text-purple-700', bgColor: 'bg-purple-100', startTime: '22:00', endTime: '07:00', workHours: 8 },
  { id: 'flexible', name: 'مرن', code: 'ر', color: 'text-green-700', bgColor: 'bg-green-100', startTime: '07:00', endTime: '19:00', workHours: 8 },
  { id: 'remote', name: 'عن بُعد', code: 'ب', color: 'text-cyan-700', bgColor: 'bg-cyan-100', startTime: '09:00', endTime: '18:00', workHours: 8 },
  { id: 'half_morning', name: 'نصف صباحي', code: 'ن', color: 'text-teal-700', bgColor: 'bg-teal-100', startTime: '08:00', endTime: '12:00', workHours: 4 },
  { id: 'off', name: 'إجازة', code: 'ج', color: 'text-gray-500', bgColor: 'bg-gray-100', startTime: '-', endTime: '-', workHours: 0 },
]

const OFF_SHIFT = shifts.find((s) => s.id === 'off')!
const DEFAULT_SHIFT = shifts[0] // صباحي — للموظف غير المجدوَل بعد

// الورديات القابلة للتعيين (ذات مواعيد فعلية فقط)
const assignableShifts = shifts.filter((s) => s.startTime !== '-')

// أيام الأسبوع
const weekDays = [
  { key: 'sunday', name: 'الأحد', shortName: 'أحد' },
  { key: 'monday', name: 'الاثنين', shortName: 'اثنين' },
  { key: 'tuesday', name: 'الثلاثاء', shortName: 'ثلاثاء' },
  { key: 'wednesday', name: 'الأربعاء', shortName: 'أربعاء' },
  { key: 'thursday', name: 'الخميس', shortName: 'خميس' },
  { key: 'friday', name: 'الجمعة', shortName: 'جمعة' },
  { key: 'saturday', name: 'السبت', shortName: 'سبت' },
]

const WEEKEND_DAYS = ['friday', 'saturday']

// ===== مفتاح الأسبوع = تاريخ الأحد بصيغة YYYY-MM-DD (السيرفر يطبّع لأي تاريخ) =====
const weekKeyOf = (d: Date) => {
  const x = new Date(d)
  x.setHours(12, 0, 0, 0)
  return x.toISOString().slice(0, 10)
}

const sundayOf = (d: Date) => {
  const x = new Date(d)
  x.setHours(12, 0, 0, 0)
  x.setDate(x.getDate() - x.getDay())
  return x
}

// مطابقة وردية السيرفر مع الكتالوج المحلي (بالاسم ثم بالمواعيد)
const matchShift = (entry: { shiftName: string; startTime: string; endTime: string }): Shift => {
  const byName = shifts.find((s) => s.name === entry.shiftName)
  if (byName) return byName
  const byTimes = shifts.find(
    (s) => s.startTime === entry.startTime && s.endTime === entry.endTime
  )
  if (byTimes) return byTimes
  return {
    id: `custom-${entry.shiftName}`,
    name: entry.shiftName,
    code: entry.shiftName.charAt(0),
    color: 'text-gray-700',
    bgColor: 'bg-gray-100',
    startTime: entry.startTime,
    endTime: entry.endTime,
    workHours: 8,
  }
}

// القوالب الجاهزة — تعيّن وردية الأسبوع للموظفين المستهدفين
const templates = [
  { id: 'standard', name: 'دوام عادي', description: 'أحد-خميس صباحي، الجمعة والسبت إجازة', icon: Sun, shiftId: 'morning' },
  { id: 'flexible', name: 'دوام مرن', description: 'أحد-خميس مرن، الجمعة والسبت إجازة', icon: Coffee, shiftId: 'flexible' },
  { id: 'rotating', name: 'دوام متناوب', description: 'صباحي/مسائي بالتبادل', icon: RefreshCw, shiftId: 'evening' },
  { id: 'remote-hybrid', name: 'دوام هجين', description: '3 أيام حضوري + 2 عن بُعد', icon: Home, shiftId: 'remote' },
  { id: 'night', name: 'وردية ليلية', description: 'دوام ليلي مع إجازة منتصف الأسبوع', icon: Moon, shiftId: 'night' },
]

export default function WeeklySchedulePage() {
  const [employees, setEmployees] = useState<ApiEmployee[]>([])
  const [departmentsList, setDepartmentsList] = useState<ApiDepartment[]>([])
  // وردية الأسبوع لكل موظف — من weekly_schedule_entries في السيرفر
  const [assignments, setAssignments] = useState<Record<number, Shift>>({})
  const [dirtyIds, setDirtyIds] = useState<number[]>([])
  const [currentWeekStart, setCurrentWeekStart] = useState(() => sundayOf(new Date()))
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')

  const [searchQuery, setSearchQuery] = useState('')
  const [selectedDepartment, setSelectedDepartment] = useState('all')
  const [selectedCell, setSelectedCell] = useState<{ empId: number; day: string } | null>(null)
  const [hasChanges, setHasChanges] = useState(false)
  const [showTemplates, setShowTemplates] = useState(false)
  const [showCopyModal, setShowCopyModal] = useState(false)
  const [showBulkAssign, setShowBulkAssign] = useState(false)
  const [selectedEmployees, setSelectedEmployees] = useState<number[]>([])
  const [viewMode, setViewMode] = useState<'edit' | 'view'>('edit')

  const currentKey = weekKeyOf(currentWeekStart)

  // الموظفون والأقسام — مرة واحدة
  useEffect(() => {
    Promise.all([fetchEmployees(), fetchDepartments()])
      .then(([emps, deps]) => {
        setEmployees(emps)
        setDepartmentsList(deps)
      })
      .catch((e) => setError(e instanceof Error ? e.message : 'تعذر تحميل الموظفين'))
  }, [])

  // جدول الأسبوع المعروض من السيرفر
  const loadWeek = (weekKey: string) => {
    setLoading(true)
    setError('')
    fetchWeekSchedule(weekKey)
      .then((entries) => {
        const map: Record<number, Shift> = {}
        for (const entry of entries) map[entry.employeeId] = matchShift(entry)
        setAssignments(map)
        setDirtyIds([])
        setHasChanges(false)
      })
      .catch((e) => setError(e instanceof Error ? e.message : 'تعذر تحميل الجدول'))
      .finally(() => setLoading(false))
  }

  useEffect(() => {
    loadWeek(currentKey)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currentKey])

  const depName = (id?: number) =>
    departmentsList.find((d) => d.id === id)?.name ?? '-'

  const rows: EmployeeRow[] = employees.map((e) => ({
    id: e.id,
    employeeCode: e.employeeCode,
    employeeName: e.fullName,
    department: depName(e.departmentId),
    avatar: e.fullName.charAt(0),
    position: e.jobTitle ?? '-',
  }))

  // وردية الموظف الفعلية لهذا الأسبوع
  const shiftOf = (empId: number): Shift => assignments[empId] ?? DEFAULT_SHIFT

  // حساب تاريخ نهاية الأسبوع
  const weekEnd = new Date(currentWeekStart)
  weekEnd.setDate(weekEnd.getDate() + 6)

  // تنسيق التاريخ
  const formatDate = (date: Date) => {
    return date.toLocaleDateString('ar-SA', { day: 'numeric', month: 'long' })
  }

  // الانتقال للأسبوع السابق
  const goToPreviousWeek = () => {
    const newDate = new Date(currentWeekStart)
    newDate.setDate(newDate.getDate() - 7)
    setCurrentWeekStart(newDate)
  }

  // الانتقال للأسبوع التالي
  const goToNextWeek = () => {
    const newDate = new Date(currentWeekStart)
    newDate.setDate(newDate.getDate() + 7)
    setCurrentWeekStart(newDate)
  }

  // العودة للأسبوع الحالي
  const goToCurrentWeek = () => {
    setCurrentWeekStart(sundayOf(new Date()))
  }

  // تغيير وردية موظف — التعيين للأسبوع كاملاً (نموذج السيرفر: وردية/موظف/أسبوع)
  const changeShift = (employeeId: number, shiftId: string) => {
    const shift = shifts.find((s) => s.id === shiftId)
    if (!shift || shift.startTime === '-') return
    setAssignments((prev) => ({ ...prev, [employeeId]: shift }))
    setDirtyIds((prev) => (prev.includes(employeeId) ? prev : [...prev, employeeId]))
    setHasChanges(true)
    setSelectedCell(null)
  }

  // تصفية الموظفين
  const filteredRows = rows.filter((emp) => {
    const matchesSearch =
      emp.employeeName.includes(searchQuery) ||
      emp.employeeCode.toLowerCase().includes(searchQuery.toLowerCase())
    const matchesDepartment = selectedDepartment === 'all' || emp.department === selectedDepartment
    return matchesSearch && matchesDepartment
  })

  // الأقسام المتاحة
  const departments = Array.from(new Set(rows.map((emp) => emp.department))).filter(
    (d) => d !== '-'
  )

  // حفظ التغييرات — upsert لكل موظف تغيّرت ورديته ثم إعادة تحميل الأسبوع
  const saveChanges = async () => {
    const entries = dirtyIds
      .filter((id) => assignments[id])
      .map((id) => ({
        weekStart: currentKey,
        employeeId: id,
        shiftName: assignments[id].name,
        startTime: assignments[id].startTime,
        endTime: assignments[id].endTime,
      }))
    if (entries.length === 0) {
      setHasChanges(false)
      return
    }
    setSaving(true)
    setError('')
    try {
      await upsertWeekSchedule(entries)
      loadWeek(currentKey)
    } catch (e) {
      setError(e instanceof Error ? e.message : 'تعذر حفظ الجدول')
    } finally {
      setSaving(false)
    }
  }

  // نسخ فعلي من الأسبوع السابق إلى الأسبوع المعروض (يُحفظ عند الضغط على حفظ)
  const copyFromPreviousWeek = async () => {
    const prevDate = new Date(currentWeekStart)
    prevDate.setDate(prevDate.getDate() - 7)
    const prevKey = weekKeyOf(prevDate)
    setError('')
    try {
      const entries = await fetchWeekSchedule(prevKey)
      const map: Record<number, Shift> = {}
      for (const entry of entries) map[entry.employeeId] = matchShift(entry)
      setAssignments(map)
      setDirtyIds(entries.map((e) => e.employeeId))
      setHasChanges(entries.length > 0)
    } catch (e) {
      setError(e instanceof Error ? e.message : 'تعذر نسخ جدول الأسبوع السابق')
    }
    setShowCopyModal(false)
  }

  // تطبيق قالب على موظفين محددين — يعيّن وردية الأسبوع
  const applyTemplate = (templateId: string) => {
    const template = templates.find((t) => t.id === templateId)
    if (!template) return
    const targetEmployees = selectedEmployees.length > 0 ? selectedEmployees : rows.map((r) => r.id)
    targetEmployees.forEach((id) => changeShift(id, template.shiftId))
    setShowTemplates(false)
    setSelectedEmployees([])
    setHasChanges(true)
  }

  // حساب تاريخ كل يوم
  const getDayDate = (dayIndex: number) => {
    const date = new Date(currentWeekStart)
    date.setDate(date.getDate() + dayIndex)
    return date.getDate()
  }

  // حساب إجمالي ساعات العمل للموظف (5 أيام عمل)
  const calculateTotalHours = (empId: number) => shiftOf(empId).workHours * 5

  // إحصائيات (خلايا الأيام: 5 أيام عمل × وردية الموظف، وعطلة نهاية الأسبوع يومان)
  const countCells = (shiftId: string) =>
    rows.filter((r) => shiftOf(r.id).id === shiftId).length * 5
  const stats = {
    morning: countCells('morning'),
    evening: countCells('evening'),
    night: countCells('night'),
    remote: countCells('remote'),
    off: rows.length * 2,
  }

  // تحديد/إلغاء تحديد موظف
  const toggleEmployeeSelection = (empId: number) => {
    setSelectedEmployees(prev =>
      prev.includes(empId)
        ? prev.filter(id => id !== empId)
        : [...prev, empId]
    )
  }

  // تحديد الكل
  const selectAllEmployees = () => {
    if (selectedEmployees.length === filteredRows.length) {
      setSelectedEmployees([])
    } else {
      setSelectedEmployees(filteredRows.map(e => e.id))
    }
  }

  return (
    <MainLayout>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-gray-800">الجدول الأسبوعي</h1>
            <p className="text-gray-500 mt-1">إدارة جداول الورديات الأسبوعية للموظفين</p>
          </div>
          <div className="flex items-center gap-3">
            {hasChanges && (
              <span className="flex items-center gap-2 text-warning-600 bg-warning-50 px-3 py-2 rounded-lg">
                <AlertCircle size={18} />
                يوجد تغييرات غير محفوظة
              </span>
            )}
            <div className="flex items-center bg-gray-100 rounded-lg p-1">
              <button
                onClick={() => setViewMode('view')}
                className={`flex items-center gap-1 px-3 py-1.5 rounded-md transition-colors ${
                  viewMode === 'view' ? 'bg-white shadow text-primary-600' : 'text-gray-500'
                }`}
              >
                <Eye size={16} />
                عرض
              </button>
              <button
                onClick={() => setViewMode('edit')}
                className={`flex items-center gap-1 px-3 py-1.5 rounded-md transition-colors ${
                  viewMode === 'edit' ? 'bg-white shadow text-primary-600' : 'text-gray-500'
                }`}
              >
                <Edit3 size={16} />
                تعديل
              </button>
            </div>
            <button
              onClick={saveChanges}
              disabled={!hasChanges || saving}
              className={`btn-primary flex items-center gap-2 ${!hasChanges || saving ? 'opacity-50 cursor-not-allowed' : ''}`}
            >
              <Save size={18} />
              {saving ? 'جارٍ الحفظ...' : 'حفظ الجدول'}
            </button>
          </div>
        </div>

        {/* Error Banner */}
        {error && (
          <div className="bg-red-50 text-red-700 rounded-xl p-4 flex items-center gap-2">
            <AlertCircle size={18} />
            {error}
          </div>
        )}

        {/* Week Navigation */}
        <div className="card">
          <div className="flex items-center justify-between">
            <button
              onClick={goToPreviousWeek}
              className="flex items-center gap-2 px-4 py-2 bg-gray-100 hover:bg-gray-200 rounded-lg transition-colors"
            >
              <ChevronRight size={20} />
              الأسبوع السابق
            </button>

            <div className="flex items-center gap-4">
              <button
                onClick={goToCurrentWeek}
                className="flex items-center gap-2 text-primary-600 hover:text-primary-700"
              >
                <RotateCcw size={18} />
                اليوم
              </button>
              <div className="text-center">
                <h2 className="text-xl font-bold text-gray-800">
                  {formatDate(currentWeekStart)} - {formatDate(weekEnd)}
                </h2>
                <p className="text-sm text-gray-500" dir="ltr">{currentKey}</p>
              </div>
            </div>

            <button
              onClick={goToNextWeek}
              className="flex items-center gap-2 px-4 py-2 bg-gray-100 hover:bg-gray-200 rounded-lg transition-colors"
            >
              الأسبوع التالي
              <ChevronLeft size={20} />
            </button>
          </div>
        </div>

        {/* Filters & Actions */}
        <div className="card">
          <div className="flex items-center justify-between flex-wrap gap-4">
            <div className="flex items-center gap-4 flex-wrap">
              {/* Search */}
              <div className="relative">
                <Search size={18} className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400" />
                <input
                  type="text"
                  placeholder="بحث عن موظف..."
                  value={searchQuery}
                  onChange={e => setSearchQuery(e.target.value)}
                  className="input pr-10 w-64"
                />
              </div>

              {/* Department Filter */}
              <select
                value={selectedDepartment}
                onChange={e => setSelectedDepartment(e.target.value)}
                className="input w-48"
              >
                <option value="all">كل الأقسام</option>
                {departments.map(dept => (
                  <option key={dept} value={dept}>
                    {dept}
                  </option>
                ))}
              </select>

              {selectedEmployees.length > 0 && (
                <span className="px-3 py-2 bg-primary-100 text-primary-700 rounded-lg text-sm">
                  {selectedEmployees.length} موظف محدد
                </span>
              )}
            </div>

            <div className="flex items-center gap-2 flex-wrap">
              <button
                onClick={() => setShowTemplates(true)}
                className="btn-secondary flex items-center gap-2"
              >
                <Layers size={18} />
                القوالب
              </button>
              <button
                onClick={() => setShowCopyModal(true)}
                className="btn-secondary flex items-center gap-2"
              >
                <Copy size={18} />
                نسخ من أسبوع
              </button>
              <button
                onClick={() => setShowBulkAssign(true)}
                className="btn-secondary flex items-center gap-2"
              >
                <UserCheck size={18} />
                تعيين جماعي
              </button>
              <div className="h-8 w-px bg-gray-200" />
              <button className="p-2 bg-gray-100 rounded-lg hover:bg-gray-200 transition-colors" title="طباعة">
                <Printer size={18} className="text-gray-600" />
              </button>
              <button className="p-2 bg-gray-100 rounded-lg hover:bg-gray-200 transition-colors" title="تصدير Excel">
                <FileSpreadsheet size={18} className="text-gray-600" />
              </button>
              <button className="p-2 bg-gray-100 rounded-lg hover:bg-gray-200 transition-colors" title="الإعدادات">
                <Settings size={18} className="text-gray-600" />
              </button>
            </div>
          </div>
        </div>

        {/* Shift Legend */}
        <div className="card">
          <div className="flex items-center gap-4 flex-wrap">
            <span className="text-sm text-gray-500 font-medium">دليل الورديات:</span>
            {shifts.map(shift => (
              <div key={shift.id} className="flex items-center gap-2">
                <div className={`px-2 py-1 ${shift.bgColor} ${shift.color} rounded text-xs font-bold`}>
                  {shift.code}
                </div>
                <span className="text-sm text-gray-600">{shift.name}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Schedule Table */}
        <div className="card overflow-hidden p-0">
          {loading ? (
            <div className="flex items-center justify-center py-16">
              <div className="w-8 h-8 border-2 border-primary-500 border-t-transparent rounded-full animate-spin" />
            </div>
          ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="bg-gray-50">
                  {viewMode === 'edit' && (
                    <th className="p-3 w-12">
                      <input
                        type="checkbox"
                        checked={selectedEmployees.length === filteredRows.length && filteredRows.length > 0}
                        onChange={selectAllEmployees}
                        className="w-4 h-4 rounded border-gray-300"
                      />
                    </th>
                  )}
                  <th className="text-right p-4 font-medium text-gray-600 min-w-[200px] sticky right-0 bg-gray-50 z-10">
                    الموظف
                  </th>
                  {weekDays.map((day, index) => (
                    <th key={day.key} className="p-3 font-medium text-gray-600 text-center min-w-[90px]">
                      <div className="text-sm">{day.name}</div>
                      <div className="text-xs text-gray-400 font-normal mt-1">{getDayDate(index)}</div>
                    </th>
                  ))}
                  <th className="p-3 font-medium text-gray-600 text-center w-20 bg-gray-50">
                    الساعات
                  </th>
                </tr>
              </thead>
              <tbody>
                {filteredRows.map(employee => (
                  <tr key={employee.id} className="border-t border-gray-100 hover:bg-gray-50/50">
                    {viewMode === 'edit' && (
                      <td className="p-3">
                        <input
                          type="checkbox"
                          checked={selectedEmployees.includes(employee.id)}
                          onChange={() => toggleEmployeeSelection(employee.id)}
                          className="w-4 h-4 rounded border-gray-300"
                        />
                      </td>
                    )}
                    {/* Employee Info */}
                    <td className="p-3 sticky right-0 bg-white z-10">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 bg-primary-100 rounded-full flex items-center justify-center flex-shrink-0">
                          <span className="text-primary-600 font-medium">{employee.avatar}</span>
                        </div>
                        <div className="min-w-0">
                          <p className="font-medium text-gray-800 truncate">{employee.employeeName}</p>
                          <p className="text-xs text-gray-500 truncate">{employee.position}</p>
                        </div>
                      </div>
                    </td>

                    {/* Schedule Cells */}
                    {weekDays.map(day => {
                      const isWeekend = WEEKEND_DAYS.includes(day.key)
                      const shift = isWeekend ? OFF_SHIFT : shiftOf(employee.id)
                      const isSelected = selectedCell?.empId === employee.id && selectedCell?.day === day.key
                      const isLocked = isWeekend
                      const isUnassigned = !isWeekend && !assignments[employee.id]

                      return (
                        <td key={day.key} className="p-1.5 text-center">
                          <div className="relative">
                            <button
                              onClick={() => {
                                if (viewMode === 'edit' && !isLocked) {
                                  setSelectedCell(isSelected ? null : { empId: employee.id, day: day.key })
                                }
                              }}
                              disabled={viewMode === 'view' || isLocked}
                              className={`w-full py-2.5 px-1 rounded-lg ${shift.bgColor} ${shift.color} font-medium text-sm transition-all relative ${
                                viewMode === 'edit' && !isLocked ? 'hover:opacity-80 cursor-pointer' : ''
                              } ${isSelected ? 'ring-2 ring-primary-500 ring-offset-1' : ''} ${
                                isLocked ? 'opacity-60 cursor-not-allowed' : ''
                              } ${isUnassigned ? 'opacity-50' : ''}`}
                              title={isUnassigned ? 'غير مجدوَل — الوردية الافتراضية' : ''}
                            >
                              {shift.name}
                            </button>

                            {/* Shift Selector Dropdown — التعيين لكل الأسبوع */}
                            {isSelected && viewMode === 'edit' && (
                              <div className="absolute top-full mt-1 right-1/2 translate-x-1/2 bg-white rounded-xl shadow-xl border border-gray-200 z-20 min-w-[160px] py-2">
                                <div className="px-3 py-1.5 text-xs text-gray-500 border-b border-gray-100">
                                  اختر وردية الأسبوع
                                </div>
                                {assignableShifts.map(s => (
                                  <button
                                    key={s.id}
                                    onClick={() => changeShift(employee.id, s.id)}
                                    className={`w-full px-3 py-2 text-right hover:bg-gray-50 flex items-center gap-2 ${
                                      s.id === shift.id ? 'bg-primary-50' : ''
                                    }`}
                                  >
                                    <div className={`w-6 h-6 ${s.bgColor} ${s.color} rounded flex items-center justify-center text-xs font-bold`}>
                                      {s.code}
                                    </div>
                                    <span className="text-sm text-gray-700">{s.name}</span>
                                    {s.id === shift.id && (
                                      <CheckCircle size={14} className="text-primary-500 mr-auto" />
                                    )}
                                  </button>
                                ))}
                              </div>
                            )}
                          </div>
                        </td>
                      )
                    })}

                    {/* Total Hours */}
                    <td className="p-3 text-center bg-gray-50/50">
                      <span className="font-bold text-gray-800">{calculateTotalHours(employee.id)}</span>
                      <span className="text-gray-400 text-xs block">ساعة</span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          )}
        </div>

        {/* Stats */}
        <div className="grid grid-cols-5 gap-4">
          <div className="card flex items-center gap-3 p-4">
            <div className="w-10 h-10 bg-blue-100 rounded-xl flex items-center justify-center">
              <Sun size={20} className="text-blue-600" />
            </div>
            <div>
              <p className="text-xs text-gray-500">صباحي</p>
              <p className="text-xl font-bold text-gray-800">{stats.morning}</p>
            </div>
          </div>
          <div className="card flex items-center gap-3 p-4">
            <div className="w-10 h-10 bg-orange-100 rounded-xl flex items-center justify-center">
              <Clock size={20} className="text-orange-600" />
            </div>
            <div>
              <p className="text-xs text-gray-500">مسائي</p>
              <p className="text-xl font-bold text-gray-800">{stats.evening}</p>
            </div>
          </div>
          <div className="card flex items-center gap-3 p-4">
            <div className="w-10 h-10 bg-purple-100 rounded-xl flex items-center justify-center">
              <Moon size={20} className="text-purple-600" />
            </div>
            <div>
              <p className="text-xs text-gray-500">ليلي</p>
              <p className="text-xl font-bold text-gray-800">{stats.night}</p>
            </div>
          </div>
          <div className="card flex items-center gap-3 p-4">
            <div className="w-10 h-10 bg-cyan-100 rounded-xl flex items-center justify-center">
              <Home size={20} className="text-cyan-600" />
            </div>
            <div>
              <p className="text-xs text-gray-500">عن بُعد</p>
              <p className="text-xl font-bold text-gray-800">{stats.remote}</p>
            </div>
          </div>
          <div className="card flex items-center gap-3 p-4">
            <div className="w-10 h-10 bg-gray-100 rounded-xl flex items-center justify-center">
              <Calendar size={20} className="text-gray-600" />
            </div>
            <div>
              <p className="text-xs text-gray-500">إجازات</p>
              <p className="text-xl font-bold text-gray-800">{stats.off}</p>
            </div>
          </div>
        </div>

        {/* Templates Modal */}
        {showTemplates && (
          <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded-2xl w-full max-w-lg">
              <div className="p-6 border-b border-gray-100 flex items-center justify-between">
                <div>
                  <h3 className="text-xl font-bold text-gray-800">القوالب الجاهزة</h3>
                  <p className="text-gray-500 text-sm mt-1">
                    {selectedEmployees.length > 0
                      ? `سيتم تطبيق القالب على ${selectedEmployees.length} موظف محدد`
                      : 'سيتم تطبيق القالب على جميع الموظفين'}
                  </p>
                </div>
                <button onClick={() => setShowTemplates(false)} className="p-2 hover:bg-gray-100 rounded-lg">
                  <X size={20} className="text-gray-500" />
                </button>
              </div>

              <div className="p-4 space-y-2">
                {templates.map(template => {
                  const Icon = template.icon
                  return (
                    <button
                      key={template.id}
                      onClick={() => applyTemplate(template.id)}
                      className="w-full p-4 bg-gray-50 hover:bg-gray-100 rounded-xl text-right transition-colors flex items-center gap-4"
                    >
                      <div className="w-12 h-12 bg-white rounded-xl flex items-center justify-center shadow-sm">
                        <Icon size={24} className="text-primary-600" />
                      </div>
                      <div>
                        <p className="font-medium text-gray-800">{template.name}</p>
                        <p className="text-sm text-gray-500">{template.description}</p>
                      </div>
                    </button>
                  )
                })}
              </div>

              <div className="p-4 border-t border-gray-100">
                <button onClick={() => setShowTemplates(false)} className="w-full btn-secondary">
                  إلغاء
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Copy from Previous Week Modal */}
        {showCopyModal && (
          <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded-2xl w-full max-w-md">
              <div className="p-6 border-b border-gray-100">
                <h3 className="text-xl font-bold text-gray-800">نسخ من أسبوع سابق</h3>
              </div>
              <div className="p-6">
                <p className="text-gray-600 mb-4">
                  سيتم نسخ جدول الأسبوع السابق وتطبيقه على الأسبوع الحالي.
                </p>
                <div className="p-4 bg-gray-50 rounded-xl">
                  <p className="text-sm text-gray-500">من:</p>
                  <p className="font-medium text-gray-800">
                    {formatDate(new Date(currentWeekStart.getTime() - 7 * 24 * 60 * 60 * 1000))}
                  </p>
                </div>
              </div>
              <div className="p-4 border-t border-gray-100 flex gap-3">
                <button onClick={copyFromPreviousWeek} className="flex-1 btn-primary">
                  نسخ الجدول
                </button>
                <button onClick={() => setShowCopyModal(false)} className="flex-1 btn-secondary">
                  إلغاء
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Bulk Assign Modal */}
        {showBulkAssign && (
          <BulkAssignModal
            employees={filteredRows}
            selectedEmployees={selectedEmployees}
            shifts={assignableShifts}
            weekDays={weekDays}
            onClose={() => setShowBulkAssign(false)}
            onAssign={(empIds, _days, shiftId) => {
              empIds.forEach((id) => changeShift(id, shiftId))
              setHasChanges(true)
              setShowBulkAssign(false)
            }}
          />
        )}
      </div>
    </MainLayout>
  )
}

// Modal التعيين الجماعي
function BulkAssignModal({
  employees,
  selectedEmployees: initialSelected,
  shifts,
  weekDays,
  onClose,
  onAssign,
}: {
  employees: EmployeeRow[]
  selectedEmployees: number[]
  shifts: Shift[]
  weekDays: { key: string; name: string }[]
  onClose: () => void
  onAssign: (empIds: number[], days: string[], shiftId: string) => void
}) {
  const [selectedEmps, setSelectedEmps] = useState<number[]>(initialSelected)
  const [selectedDays, setSelectedDays] = useState<string[]>([])
  const [selectedShift, setSelectedShift] = useState('')

  const toggleEmployee = (empId: number) => {
    setSelectedEmps(prev =>
      prev.includes(empId) ? prev.filter(id => id !== empId) : [...prev, empId]
    )
  }

  const toggleDay = (day: string) => {
    setSelectedDays(prev =>
      prev.includes(day) ? prev.filter(d => d !== day) : [...prev, day]
    )
  }

  const handleAssign = () => {
    if (selectedEmps.length === 0 || !selectedShift) {
      alert('الرجاء اختيار الموظفين والوردية')
      return
    }
    onAssign(selectedEmps, selectedDays, selectedShift)
  }

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-2xl w-full max-w-2xl max-h-[90vh] overflow-hidden flex flex-col">
        <div className="p-6 border-b border-gray-100 flex items-center justify-between">
          <div>
            <h3 className="text-xl font-bold text-gray-800">تعيين جماعي</h3>
            <p className="text-gray-500 text-sm mt-1">تعيين وردية الأسبوع لمجموعة موظفين</p>
          </div>
          <button onClick={onClose} className="p-2 hover:bg-gray-100 rounded-lg">
            <X size={20} className="text-gray-500" />
          </button>
        </div>

        <div className="p-6 space-y-6 overflow-y-auto flex-1">
          {/* اختيار الموظفين */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-3">
              الموظفين ({selectedEmps.length} محدد)
            </label>
            <div className="max-h-40 overflow-y-auto border border-gray-200 rounded-xl p-2 space-y-1">
              {employees.map(emp => (
                <label
                  key={emp.id}
                  className={`flex items-center gap-3 p-2 rounded-lg cursor-pointer transition-colors ${
                    selectedEmps.includes(emp.id) ? 'bg-primary-50' : 'hover:bg-gray-50'
                  }`}
                >
                  <input
                    type="checkbox"
                    checked={selectedEmps.includes(emp.id)}
                    onChange={() => toggleEmployee(emp.id)}
                    className="w-4 h-4 rounded border-gray-300"
                  />
                  <span className="text-sm text-gray-700">{emp.employeeName}</span>
                  <span className="text-xs text-gray-400">{emp.department}</span>
                </label>
              ))}
            </div>
          </div>

          {/* اختيار الأيام — الوردية تُطبَّق على الأسبوع كاملاً في السيرفر */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-3">
              الأيام (الوردية تُخزَّن لكل الأسبوع)
            </label>
            <div className="flex gap-2 flex-wrap">
              {weekDays.map(day => (
                <button
                  key={day.key}
                  onClick={() => toggleDay(day.key)}
                  className={`px-4 py-2 rounded-lg transition-all ${
                    selectedDays.includes(day.key)
                      ? 'bg-primary-500 text-white'
                      : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                  }`}
                >
                  {day.name}
                </button>
              ))}
            </div>
          </div>

          {/* اختيار الوردية */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-3">الوردية</label>
            <div className="grid grid-cols-3 gap-2">
              {shifts.map(shift => (
                <button
                  key={shift.id}
                  onClick={() => setSelectedShift(shift.id)}
                  className={`p-3 rounded-xl border-2 transition-all ${
                    selectedShift === shift.id
                      ? 'border-primary-500 bg-primary-50'
                      : 'border-gray-200 hover:border-gray-300'
                  }`}
                >
                  <div className={`w-8 h-8 ${shift.bgColor} ${shift.color} rounded-lg flex items-center justify-center text-sm font-bold mx-auto mb-2`}>
                    {shift.code}
                  </div>
                  <p className="text-sm text-gray-700 text-center">{shift.name}</p>
                </button>
              ))}
            </div>
          </div>
        </div>

        <div className="p-4 border-t border-gray-100 flex gap-3">
          <button
            onClick={handleAssign}
            disabled={selectedEmps.length === 0 || !selectedShift}
            className="flex-1 btn-primary disabled:opacity-50 disabled:cursor-not-allowed"
          >
            تطبيق ({selectedEmps.length} موظف)
          </button>
          <button onClick={onClose} className="flex-1 btn-secondary">
            إلغاء
          </button>
        </div>
      </div>
    </div>
  )
}
