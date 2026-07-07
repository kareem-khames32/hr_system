'use client'

import { useState } from 'react'
import { MainLayout } from '@/components/layout'
import {
  ChevronRight,
  ChevronLeft,
  Calendar,
  Users,
  Copy,
  Save,
  Download,
  Filter,
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

interface EmployeeSchedule {
  id: string
  employeeId: string
  employeeName: string
  department: string
  avatar: string
  position: string
  schedule: {
    [key: string]: {
      shiftId: string
      isLocked: boolean
      note?: string
      isException?: boolean
    }
  }
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
  { id: 'sick', name: 'مرضية', code: 'ض', color: 'text-red-700', bgColor: 'bg-red-100', startTime: '-', endTime: '-', workHours: 0 },
  { id: 'annual', name: 'سنوية', code: 'س', color: 'text-amber-700', bgColor: 'bg-amber-100', startTime: '-', endTime: '-', workHours: 0 },
]

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

// بيانات تجريبية للموظفين
const initialSchedules: EmployeeSchedule[] = [
  {
    id: '1',
    employeeId: 'EMP001',
    employeeName: 'أحمد محمد العلي',
    department: 'تقنية المعلومات',
    position: 'مطور برمجيات',
    avatar: 'أ',
    schedule: {
      sunday: { shiftId: 'morning', isLocked: false },
      monday: { shiftId: 'morning', isLocked: false },
      tuesday: { shiftId: 'remote', isLocked: false, note: 'عمل من المنزل' },
      wednesday: { shiftId: 'morning', isLocked: false },
      thursday: { shiftId: 'morning', isLocked: false },
      friday: { shiftId: 'off', isLocked: true },
      saturday: { shiftId: 'off', isLocked: true },
    },
  },
  {
    id: '2',
    employeeId: 'EMP002',
    employeeName: 'سارة أحمد الخالد',
    department: 'الموارد البشرية',
    position: 'أخصائي موارد بشرية',
    avatar: 'س',
    schedule: {
      sunday: { shiftId: 'flexible', isLocked: false },
      monday: { shiftId: 'flexible', isLocked: false },
      tuesday: { shiftId: 'flexible', isLocked: false },
      wednesday: { shiftId: 'flexible', isLocked: false },
      thursday: { shiftId: 'flexible', isLocked: false },
      friday: { shiftId: 'off', isLocked: true },
      saturday: { shiftId: 'off', isLocked: true },
    },
  },
  {
    id: '3',
    employeeId: 'EMP003',
    employeeName: 'محمد علي السعيد',
    department: 'المبيعات',
    position: 'مدير مبيعات',
    avatar: 'م',
    schedule: {
      sunday: { shiftId: 'evening', isLocked: false },
      monday: { shiftId: 'evening', isLocked: false },
      tuesday: { shiftId: 'off', isLocked: false },
      wednesday: { shiftId: 'evening', isLocked: false },
      thursday: { shiftId: 'evening', isLocked: false },
      friday: { shiftId: 'evening', isLocked: false },
      saturday: { shiftId: 'off', isLocked: true },
    },
  },
  {
    id: '4',
    employeeId: 'EMP004',
    employeeName: 'فاطمة عبدالله النور',
    department: 'المالية',
    position: 'محاسب',
    avatar: 'ف',
    schedule: {
      sunday: { shiftId: 'morning', isLocked: false },
      monday: { shiftId: 'morning', isLocked: false },
      tuesday: { shiftId: 'remote', isLocked: false },
      wednesday: { shiftId: 'remote', isLocked: false },
      thursday: { shiftId: 'morning', isLocked: false },
      friday: { shiftId: 'off', isLocked: true },
      saturday: { shiftId: 'off', isLocked: true },
    },
  },
  {
    id: '5',
    employeeId: 'EMP005',
    employeeName: 'خالد إبراهيم الحربي',
    department: 'الأمن',
    position: 'مشرف أمن',
    avatar: 'خ',
    schedule: {
      sunday: { shiftId: 'night', isLocked: false },
      monday: { shiftId: 'night', isLocked: false },
      tuesday: { shiftId: 'night', isLocked: false },
      wednesday: { shiftId: 'off', isLocked: false },
      thursday: { shiftId: 'off', isLocked: false },
      friday: { shiftId: 'night', isLocked: false },
      saturday: { shiftId: 'night', isLocked: false },
    },
  },
  {
    id: '6',
    employeeId: 'EMP006',
    employeeName: 'نورة سعد القحطاني',
    department: 'خدمة العملاء',
    position: 'ممثل خدمة عملاء',
    avatar: 'ن',
    schedule: {
      sunday: { shiftId: 'morning', isLocked: false },
      monday: { shiftId: 'evening', isLocked: false },
      tuesday: { shiftId: 'morning', isLocked: false },
      wednesday: { shiftId: 'evening', isLocked: false },
      thursday: { shiftId: 'morning', isLocked: false },
      friday: { shiftId: 'off', isLocked: true },
      saturday: { shiftId: 'off', isLocked: true },
    },
  },
  {
    id: '7',
    employeeId: 'EMP007',
    employeeName: 'عبدالرحمن محمد',
    department: 'تقنية المعلومات',
    position: 'مدير تقنية المعلومات',
    avatar: 'ع',
    schedule: {
      sunday: { shiftId: 'flexible', isLocked: false },
      monday: { shiftId: 'flexible', isLocked: false },
      tuesday: { shiftId: 'flexible', isLocked: false },
      wednesday: { shiftId: 'remote', isLocked: false },
      thursday: { shiftId: 'flexible', isLocked: false },
      friday: { shiftId: 'off', isLocked: true },
      saturday: { shiftId: 'morning', isLocked: false, isException: true, note: 'آخر سبت في الشهر' },
    },
  },
  {
    id: '8',
    employeeId: 'EMP008',
    employeeName: 'ريم خالد العتيبي',
    department: 'التسويق',
    position: 'أخصائي تسويق',
    avatar: 'ر',
    schedule: {
      sunday: { shiftId: 'morning', isLocked: false },
      monday: { shiftId: 'morning', isLocked: false },
      tuesday: { shiftId: 'sick', isLocked: true, note: 'إجازة مرضية' },
      wednesday: { shiftId: 'sick', isLocked: true, note: 'إجازة مرضية' },
      thursday: { shiftId: 'morning', isLocked: false },
      friday: { shiftId: 'off', isLocked: true },
      saturday: { shiftId: 'off', isLocked: true },
    },
  },
]

// ===== التخزين المؤرَّخ: كل أسبوع بجدوله المستقل =====
// مفتاح الأسبوع = تاريخ بداية الأسبوع (الأحد) بصيغة YYYY-MM-DD
const weekKeyOf = (d: Date) => {
  const x = new Date(d)
  x.setHours(12, 0, 0, 0)
  return x.toISOString().slice(0, 10)
}

const cloneWeek = (src: EmployeeSchedule[]): EmployeeSchedule[] =>
  src.map((e) => ({
    ...e,
    schedule: Object.fromEntries(
      Object.entries(e.schedule).map(([k, v]) => [k, { ...v }])
    ),
  }))

const withShiftAllWeek = (
  src: EmployeeSchedule[],
  empId: string,
  shiftId: string
): EmployeeSchedule[] =>
  cloneWeek(src).map((e) =>
    e.id === empId
      ? {
          ...e,
          schedule: Object.fromEntries(
            Object.entries(e.schedule).map(([day, v]) => [
              day,
              v.shiftId === 'off' || v.isLocked ? v : { ...v, shiftId },
            ])
          ),
        }
      : e
  )

// ديمو حساب التأخير: أحمد وردية 10 هذا الأسبوع، ووردية 11 الأسبوع القادم
const initialWeeklyData: Record<string, EmployeeSchedule[]> = {
  '2026-07-05': withShiftAllWeek(initialSchedules, '1', 'ten'),
  '2026-07-12': withShiftAllWeek(initialSchedules, '1', 'eleven'),
}

// القوالب الجاهزة
const templates = [
  { id: 'standard', name: 'دوام عادي', description: 'أحد-خميس صباحي، الجمعة والسبت إجازة', icon: Sun },
  { id: 'flexible', name: 'دوام مرن', description: 'أحد-خميس مرن، الجمعة والسبت إجازة', icon: Coffee },
  { id: 'rotating', name: 'دوام متناوب', description: 'صباحي/مسائي بالتبادل', icon: RefreshCw },
  { id: 'remote-hybrid', name: 'دوام هجين', description: '3 أيام حضوري + 2 عن بُعد', icon: Home },
  { id: 'night', name: 'وردية ليلية', description: 'دوام ليلي مع إجازة منتصف الأسبوع', icon: Moon },
]

export default function WeeklySchedulePage() {
  const [weeklyData, setWeeklyData] = useState<Record<string, EmployeeSchedule[]>>(initialWeeklyData)
  const [currentWeekStart, setCurrentWeekStart] = useState(new Date('2026-07-05'))

  // جدول الأسبوع المعروض — يُنشأ من النمط الأساسي إن لم يُخصَّص بعد
  const currentKey = weekKeyOf(currentWeekStart)
  const isCustomWeek = Boolean(weeklyData[currentKey])
  const schedules = weeklyData[currentKey] ?? cloneWeek(initialSchedules)
  const setSchedules = (
    updater: (prev: EmployeeSchedule[]) => EmployeeSchedule[]
  ) =>
    setWeeklyData((prev) => ({
      ...prev,
      [currentKey]: updater(prev[currentKey] ?? cloneWeek(initialSchedules)),
    }))
  const [searchQuery, setSearchQuery] = useState('')
  const [selectedDepartment, setSelectedDepartment] = useState('all')
  const [selectedCell, setSelectedCell] = useState<{ empId: string; day: string } | null>(null)
  const [hasChanges, setHasChanges] = useState(false)
  const [showTemplates, setShowTemplates] = useState(false)
  const [showCopyModal, setShowCopyModal] = useState(false)
  const [showBulkAssign, setShowBulkAssign] = useState(false)
  const [selectedEmployees, setSelectedEmployees] = useState<string[]>([])
  const [viewMode, setViewMode] = useState<'edit' | 'view'>('edit')

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
    const today = new Date()
    const dayOfWeek = today.getDay()
    const startOfWeek = new Date(today)
    startOfWeek.setDate(today.getDate() - dayOfWeek)
    setCurrentWeekStart(startOfWeek)
  }

  // تغيير وردية موظف
  const changeShift = (employeeId: string, day: string, shiftId: string) => {
    setSchedules(prev =>
      prev.map(emp => {
        if (emp.id === employeeId) {
          return {
            ...emp,
            schedule: {
              ...emp.schedule,
              [day]: {
                ...emp.schedule[day],
                shiftId,
              },
            },
          }
        }
        return emp
      })
    )
    setHasChanges(true)
    setSelectedCell(null)
  }

  // الحصول على الوردية
  const getShift = (shiftId: string) => {
    return shifts.find(s => s.id === shiftId) || shifts[0]
  }

  // تصفية الموظفين
  const filteredSchedules = schedules.filter(emp => {
    const matchesSearch =
      emp.employeeName.includes(searchQuery) ||
      emp.employeeId.toLowerCase().includes(searchQuery.toLowerCase())
    const matchesDepartment = selectedDepartment === 'all' || emp.department === selectedDepartment
    return matchesSearch && matchesDepartment
  })

  // الأقسام المتاحة
  const departments = Array.from(new Set(schedules.map(emp => emp.department)))

  // حفظ التغييرات — الجدول مخزَّن بمفتاح أسبوعه المؤرَّخ
  const saveChanges = () => {
    setHasChanges(false)
    alert(`تم حفظ جدول الأسبوع ${currentKey} — كل أسبوع يُخزَّن بتواريخه المستقلة`)
  }

  // نسخ فعلي من الأسبوع السابق إلى الأسبوع المعروض
  const copyFromPreviousWeek = () => {
    const prevDate = new Date(currentWeekStart)
    prevDate.setDate(prevDate.getDate() - 7)
    const prevKey = weekKeyOf(prevDate)
    const source = weeklyData[prevKey] ?? cloneWeek(initialSchedules)
    setWeeklyData((prev) => ({ ...prev, [currentKey]: cloneWeek(source) }))
    setShowCopyModal(false)
    setHasChanges(true)
  }

  // تطبيق قالب على موظفين محددين
  const applyTemplate = (templateId: string) => {
    const targetEmployees = selectedEmployees.length > 0 ? selectedEmployees : schedules.map(s => s.id)

    let templateSchedule: { [key: string]: { shiftId: string; isLocked: boolean } } = {}

    if (templateId === 'standard') {
      weekDays.forEach(day => {
        templateSchedule[day.key] = {
          shiftId: day.key === 'friday' || day.key === 'saturday' ? 'off' : 'morning',
          isLocked: day.key === 'friday' || day.key === 'saturday',
        }
      })
    } else if (templateId === 'flexible') {
      weekDays.forEach(day => {
        templateSchedule[day.key] = {
          shiftId: day.key === 'friday' || day.key === 'saturday' ? 'off' : 'flexible',
          isLocked: day.key === 'friday' || day.key === 'saturday',
        }
      })
    } else if (templateId === 'remote-hybrid') {
      templateSchedule = {
        sunday: { shiftId: 'morning', isLocked: false },
        monday: { shiftId: 'morning', isLocked: false },
        tuesday: { shiftId: 'remote', isLocked: false },
        wednesday: { shiftId: 'remote', isLocked: false },
        thursday: { shiftId: 'morning', isLocked: false },
        friday: { shiftId: 'off', isLocked: true },
        saturday: { shiftId: 'off', isLocked: true },
      }
    } else if (templateId === 'night') {
      templateSchedule = {
        sunday: { shiftId: 'night', isLocked: false },
        monday: { shiftId: 'night', isLocked: false },
        tuesday: { shiftId: 'night', isLocked: false },
        wednesday: { shiftId: 'off', isLocked: false },
        thursday: { shiftId: 'off', isLocked: false },
        friday: { shiftId: 'night', isLocked: false },
        saturday: { shiftId: 'night', isLocked: false },
      }
    }

    setSchedules(prev =>
      prev.map(emp =>
        targetEmployees.includes(emp.id)
          ? { ...emp, schedule: templateSchedule }
          : emp
      )
    )
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

  // حساب إجمالي ساعات العمل للموظف
  const calculateTotalHours = (schedule: EmployeeSchedule['schedule']) => {
    return Object.values(schedule).reduce((total, day) => {
      const shift = getShift(day.shiftId)
      return total + shift.workHours
    }, 0)
  }

  // إحصائيات
  const stats = {
    morning: schedules.reduce((sum, emp) =>
      sum + Object.values(emp.schedule).filter(s => s.shiftId === 'morning').length, 0),
    evening: schedules.reduce((sum, emp) =>
      sum + Object.values(emp.schedule).filter(s => s.shiftId === 'evening').length, 0),
    night: schedules.reduce((sum, emp) =>
      sum + Object.values(emp.schedule).filter(s => s.shiftId === 'night').length, 0),
    remote: schedules.reduce((sum, emp) =>
      sum + Object.values(emp.schedule).filter(s => s.shiftId === 'remote').length, 0),
    off: schedules.reduce((sum, emp) =>
      sum + Object.values(emp.schedule).filter(s => s.shiftId === 'off').length, 0),
  }

  // تحديد/إلغاء تحديد موظف
  const toggleEmployeeSelection = (empId: string) => {
    setSelectedEmployees(prev =>
      prev.includes(empId)
        ? prev.filter(id => id !== empId)
        : [...prev, empId]
    )
  }

  // تحديد الكل
  const selectAllEmployees = () => {
    if (selectedEmployees.length === filteredSchedules.length) {
      setSelectedEmployees([])
    } else {
      setSelectedEmployees(filteredSchedules.map(e => e.id))
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
              disabled={!hasChanges}
              className={`btn-primary flex items-center gap-2 ${!hasChanges ? 'opacity-50 cursor-not-allowed' : ''}`}
            >
              <Save size={18} />
              حفظ الجدول
            </button>
          </div>
        </div>

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
                <p className="text-sm text-gray-500">2026</p>
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
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="bg-gray-50">
                  {viewMode === 'edit' && (
                    <th className="p-3 w-12">
                      <input
                        type="checkbox"
                        checked={selectedEmployees.length === filteredSchedules.length && filteredSchedules.length > 0}
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
                {filteredSchedules.map(employee => (
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
                      const daySchedule = employee.schedule[day.key]
                      const shift = getShift(daySchedule.shiftId)
                      const isSelected = selectedCell?.empId === employee.id && selectedCell?.day === day.key
                      const isLocked = daySchedule.isLocked
                      const isException = daySchedule.isException

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
                              } ${isException ? 'ring-2 ring-warning-400' : ''}`}
                              title={daySchedule.note || ''}
                            >
                              {shift.name}
                              {daySchedule.note && (
                                <span className="absolute -top-1 -left-1 w-3 h-3 bg-warning-500 rounded-full" />
                              )}
                            </button>

                            {/* Shift Selector Dropdown */}
                            {isSelected && viewMode === 'edit' && (
                              <div className="absolute top-full mt-1 right-1/2 translate-x-1/2 bg-white rounded-xl shadow-xl border border-gray-200 z-20 min-w-[160px] py-2">
                                <div className="px-3 py-1.5 text-xs text-gray-500 border-b border-gray-100">
                                  اختر الوردية
                                </div>
                                {shifts.map(s => (
                                  <button
                                    key={s.id}
                                    onClick={() => changeShift(employee.id, day.key, s.id)}
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
                      <span className="font-bold text-gray-800">{calculateTotalHours(employee.schedule)}</span>
                      <span className="text-gray-400 text-xs block">ساعة</span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
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
            employees={filteredSchedules}
            selectedEmployees={selectedEmployees}
            shifts={shifts}
            weekDays={weekDays}
            onClose={() => setShowBulkAssign(false)}
            onAssign={(empIds, days, shiftId) => {
              setSchedules(prev =>
                prev.map(emp => {
                  if (empIds.includes(emp.id)) {
                    const newSchedule = { ...emp.schedule }
                    days.forEach(day => {
                      if (!newSchedule[day].isLocked) {
                        newSchedule[day] = { ...newSchedule[day], shiftId }
                      }
                    })
                    return { ...emp, schedule: newSchedule }
                  }
                  return emp
                })
              )
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
  employees: EmployeeSchedule[]
  selectedEmployees: string[]
  shifts: Shift[]
  weekDays: { key: string; name: string }[]
  onClose: () => void
  onAssign: (empIds: string[], days: string[], shiftId: string) => void
}) {
  const [selectedEmps, setSelectedEmps] = useState<string[]>(initialSelected)
  const [selectedDays, setSelectedDays] = useState<string[]>([])
  const [selectedShift, setSelectedShift] = useState('')

  const toggleEmployee = (empId: string) => {
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
    if (selectedEmps.length === 0 || selectedDays.length === 0 || !selectedShift) {
      alert('الرجاء اختيار الموظفين والأيام والوردية')
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
            <p className="text-gray-500 text-sm mt-1">تعيين وردية لمجموعة موظفين</p>
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

          {/* اختيار الأيام */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-3">الأيام</label>
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
            disabled={selectedEmps.length === 0 || selectedDays.length === 0 || !selectedShift}
            className="flex-1 btn-primary disabled:opacity-50 disabled:cursor-not-allowed"
          >
            تطبيق ({selectedEmps.length} موظف × {selectedDays.length} أيام)
          </button>
          <button onClick={onClose} className="flex-1 btn-secondary">
            إلغاء
          </button>
        </div>
      </div>
    </div>
  )
}
