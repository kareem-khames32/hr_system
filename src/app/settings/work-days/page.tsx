'use client'

import { useState } from 'react'
import { MainLayout } from '@/components/layout'
import {
  Calendar,
  Plus,
  Trash2,
  Save,
  Settings,
  AlertCircle,
  CheckCircle,
  Clock,
  Sun,
  Moon,
  ArrowLeftRight,
  Info,
  Copy,
  ToggleLeft,
  ToggleRight,
  ChevronDown,
  ChevronUp,
  Edit3,
  Users,
  Briefcase,
  X,
  UserPlus,
  Building2,
  Search,
  User,
} from 'lucide-react'

// أيام الأسبوع
const weekDays = [
  { key: 'sunday', name: 'الأحد', shortName: 'س' },
  { key: 'monday', name: 'الاثنين', shortName: 'ن' },
  { key: 'tuesday', name: 'الثلاثاء', shortName: 'ث' },
  { key: 'wednesday', name: 'الأربعاء', shortName: 'ر' },
  { key: 'thursday', name: 'الخميس', shortName: 'خ' },
  { key: 'friday', name: 'الجمعة', shortName: 'ج' },
  { key: 'saturday', name: 'السبت', shortName: 'س' },
]

// أنواع القواعد
const ruleTypes = [
  { id: 'off_to_work', name: 'تحويل إجازة ← دوام', color: 'bg-green-500', icon: Sun },
  { id: 'work_to_off', name: 'تحويل دوام ← إجازة', color: 'bg-red-500', icon: Moon },
  { id: 'change_shift', name: 'تغيير الوردية', color: 'bg-blue-500', icon: ArrowLeftRight },
  { id: 'half_day', name: 'نصف يوم', color: 'bg-orange-500', icon: Clock },
]

// مواقع اليوم في الفترة
const dayPositions = [
  { id: 'first', name: 'أول' },
  { id: 'second', name: 'ثاني' },
  { id: 'third', name: 'ثالث' },
  { id: 'fourth', name: 'رابع' },
  { id: 'last', name: 'آخر' },
  { id: 'every', name: 'كل' },
]

// الفترات الزمنية
const timePeriods = [
  { id: 'week', name: 'الأسبوع' },
  { id: 'month', name: 'الشهر' },
  { id: 'quarter', name: 'الربع' },
  { id: 'year', name: 'السنة' },
  { id: 'ramadan', name: 'رمضان' },
  { id: 'hijri_month', name: 'الشهر الهجري' },
]

// الورديات المتاحة
const availableShifts = [
  { id: 'default', name: 'الوردية الافتراضية', time: '08:00 - 17:00' },
  { id: 'morning', name: 'الوردية الصباحية', time: '07:00 - 15:00' },
  { id: 'evening', name: 'الوردية المسائية', time: '14:00 - 22:00' },
  { id: 'night', name: 'الوردية الليلية', time: '22:00 - 06:00' },
  { id: 'flexible', name: 'الدوام المرن', time: '08:00 - 16:00' },
  { id: 'ramadan', name: 'وردية رمضان', time: '10:00 - 15:00' },
  { id: 'half_morning', name: 'نصف يوم صباحي', time: '08:00 - 12:00' },
  { id: 'half_evening', name: 'نصف يوم مسائي', time: '13:00 - 17:00' },
]

// نوع القاعدة
interface WorkRule {
  id: string
  description: string
  type: 'off_to_work' | 'work_to_off' | 'change_shift' | 'half_day'
  isActive: boolean
  conditions: {
    dayOfWeek: string[]
    position: string
    period: string
    specificDate?: string
    dateRange?: { from: string; to: string }
  }
  result: {
    shiftId?: string
    isHoliday?: boolean
    holidayName?: string
  }
  priority: number
}

// نوع جدول العمل
interface WorkSchedule {
  id: string
  name: string
  description: string
  color: string
  isDefault: boolean
  workDays: { [key: string]: boolean }
  workHours: {
    start: string
    end: string
    breakStart: string
    breakEnd: string
  }
  rules: WorkRule[]
  employeeCount: number
}

// الألوان المتاحة للجداول
const scheduleColors = [
  { id: 'blue', name: 'أزرق', class: 'bg-blue-500' },
  { id: 'green', name: 'أخضر', class: 'bg-green-500' },
  { id: 'purple', name: 'بنفسجي', class: 'bg-purple-500' },
  { id: 'orange', name: 'برتقالي', class: 'bg-orange-500' },
  { id: 'pink', name: 'وردي', class: 'bg-pink-500' },
  { id: 'teal', name: 'تركوازي', class: 'bg-teal-500' },
  { id: 'indigo', name: 'نيلي', class: 'bg-indigo-500' },
  { id: 'red', name: 'أحمر', class: 'bg-red-500' },
]

// الجداول الافتراضية
const initialSchedules: WorkSchedule[] = [
  {
    id: '1',
    name: 'الجدول الأساسي',
    description: 'جمعة وسبت إجازة',
    color: 'blue',
    isDefault: true,
    workDays: {
      sunday: true,
      monday: true,
      tuesday: true,
      wednesday: true,
      thursday: true,
      friday: false,
      saturday: false,
    },
    workHours: {
      start: '08:00',
      end: '17:00',
      breakStart: '12:00',
      breakEnd: '13:00',
    },
    rules: [
      {
        id: '1',
        description: 'آخر سبت في الشهر - دوام رسمي',
        type: 'off_to_work',
        isActive: true,
        conditions: {
          dayOfWeek: ['saturday'],
          position: 'last',
          period: 'month',
        },
        result: {
          shiftId: 'default',
        },
        priority: 1,
      },
    ],
    employeeCount: 45,
  },
  {
    id: '2',
    name: 'جدول السبت فقط',
    description: 'السبت فقط إجازة - الجمعة دوام',
    color: 'green',
    isDefault: false,
    workDays: {
      sunday: true,
      monday: true,
      tuesday: true,
      wednesday: true,
      thursday: true,
      friday: true,
      saturday: false,
    },
    workHours: {
      start: '08:00',
      end: '16:00',
      breakStart: '12:00',
      breakEnd: '12:30',
    },
    rules: [],
    employeeCount: 23,
  },
]

export default function WorkDaysSettingsPage() {
  const [schedules, setSchedules] = useState<WorkSchedule[]>(initialSchedules)
  const [selectedSchedule, setSelectedSchedule] = useState<WorkSchedule | null>(initialSchedules[0])
  const [hasChanges, setHasChanges] = useState(false)
  const [showAddSchedule, setShowAddSchedule] = useState(false)
  const [showEditSchedule, setShowEditSchedule] = useState(false)
  const [showAddRule, setShowAddRule] = useState(false)
  const [showAssignModal, setShowAssignModal] = useState(false)
  const [expandedRules, setExpandedRules] = useState<string[]>(['1'])

  // تبديل يوم العمل
  const toggleWorkDay = (day: string) => {
    if (!selectedSchedule) return

    const updatedSchedule = {
      ...selectedSchedule,
      workDays: {
        ...selectedSchedule.workDays,
        [day]: !selectedSchedule.workDays[day],
      },
    }

    setSelectedSchedule(updatedSchedule)
    setSchedules(prev =>
      prev.map(s => (s.id === updatedSchedule.id ? updatedSchedule : s))
    )
    setHasChanges(true)
  }

  // تبديل حالة القاعدة
  const toggleRuleActive = (ruleId: string) => {
    if (!selectedSchedule) return

    const updatedRules = selectedSchedule.rules.map(rule =>
      rule.id === ruleId ? { ...rule, isActive: !rule.isActive } : rule
    )

    const updatedSchedule = { ...selectedSchedule, rules: updatedRules }
    setSelectedSchedule(updatedSchedule)
    setSchedules(prev =>
      prev.map(s => (s.id === updatedSchedule.id ? updatedSchedule : s))
    )
    setHasChanges(true)
  }

  // حذف قاعدة
  const deleteRule = (ruleId: string) => {
    if (!selectedSchedule) return
    if (!confirm('هل أنت متأكد من حذف هذه القاعدة؟')) return

    const updatedRules = selectedSchedule.rules.filter(rule => rule.id !== ruleId)
    const updatedSchedule = { ...selectedSchedule, rules: updatedRules }
    setSelectedSchedule(updatedSchedule)
    setSchedules(prev =>
      prev.map(s => (s.id === updatedSchedule.id ? updatedSchedule : s))
    )
    setHasChanges(true)
  }

  // نسخ قاعدة
  const duplicateRule = (rule: WorkRule) => {
    if (!selectedSchedule) return

    const newRule: WorkRule = {
      ...rule,
      id: Date.now().toString(),
      description: rule.description + ' (نسخة)',
      isActive: false,
    }

    const updatedSchedule = {
      ...selectedSchedule,
      rules: [...selectedSchedule.rules, newRule],
    }
    setSelectedSchedule(updatedSchedule)
    setSchedules(prev =>
      prev.map(s => (s.id === updatedSchedule.id ? updatedSchedule : s))
    )
    setHasChanges(true)
  }

  // إضافة قاعدة جديدة
  const addRule = (rule: Omit<WorkRule, 'id'>) => {
    if (!selectedSchedule) return

    const newRule: WorkRule = {
      ...rule,
      id: Date.now().toString(),
    }

    const updatedSchedule = {
      ...selectedSchedule,
      rules: [...selectedSchedule.rules, newRule],
    }
    setSelectedSchedule(updatedSchedule)
    setSchedules(prev =>
      prev.map(s => (s.id === updatedSchedule.id ? updatedSchedule : s))
    )
    setHasChanges(true)
    setShowAddRule(false)
  }

  // حذف جدول
  const deleteSchedule = (scheduleId: string) => {
    const schedule = schedules.find(s => s.id === scheduleId)
    if (!schedule) return

    if (schedule.isDefault) {
      alert('لا يمكن حذف الجدول الافتراضي')
      return
    }

    if (schedule.employeeCount > 0) {
      if (!confirm(`هذا الجدول مرتبط بـ ${schedule.employeeCount} موظف. هل تريد حذفه؟ سيتم نقل الموظفين للجدول الافتراضي.`)) {
        return
      }
    } else {
      if (!confirm('هل أنت متأكد من حذف هذا الجدول؟')) {
        return
      }
    }

    setSchedules(prev => prev.filter(s => s.id !== scheduleId))
    if (selectedSchedule?.id === scheduleId) {
      setSelectedSchedule(schedules.find(s => s.isDefault) || schedules[0])
    }
    setHasChanges(true)
  }

  // تعيين كافتراضي
  const setAsDefault = (scheduleId: string) => {
    setSchedules(prev =>
      prev.map(s => ({
        ...s,
        isDefault: s.id === scheduleId,
      }))
    )
    setHasChanges(true)
  }

  // توسيع/طي القاعدة
  const toggleRuleExpanded = (ruleId: string) => {
    setExpandedRules(prev =>
      prev.includes(ruleId)
        ? prev.filter(id => id !== ruleId)
        : [...prev, ruleId]
    )
  }

  // الحصول على نوع القاعدة
  const getRuleType = (typeId: string) => {
    return ruleTypes.find(t => t.id === typeId) || ruleTypes[0]
  }

  // الحصول على الوردية
  const getShift = (shiftId: string) => {
    return availableShifts.find(s => s.id === shiftId) || availableShifts[0]
  }

  // الحصول على لون الجدول
  const getScheduleColor = (colorId: string) => {
    return scheduleColors.find(c => c.id === colorId) || scheduleColors[0]
  }

  // حفظ التغييرات
  const saveChanges = () => {
    setHasChanges(false)
    alert('تم حفظ الإعدادات بنجاح!')
  }

  // إحصائيات
  const totalEmployees = schedules.reduce((sum, s) => sum + s.employeeCount, 0)
  const activeRulesCount = selectedSchedule?.rules.filter(r => r.isActive).length || 0
  const workDaysCount = selectedSchedule
    ? Object.values(selectedSchedule.workDays).filter(Boolean).length
    : 0

  return (
    <MainLayout>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-gray-800">جداول العمل</h1>
            <p className="text-gray-500 mt-1">إدارة جداول العمل المختلفة وتعيينها للموظفين</p>
          </div>
          <div className="flex items-center gap-3">
            {hasChanges && (
              <span className="flex items-center gap-2 text-warning-600 bg-warning-50 px-3 py-2 rounded-lg">
                <AlertCircle size={18} />
                يوجد تغييرات غير محفوظة
              </span>
            )}
            <button
              onClick={saveChanges}
              disabled={!hasChanges}
              className={`btn-primary flex items-center gap-2 ${!hasChanges ? 'opacity-50 cursor-not-allowed' : ''}`}
            >
              <Save size={18} />
              حفظ الإعدادات
            </button>
          </div>
        </div>

        {/* إحصائيات عامة */}
        <div className="grid grid-cols-4 gap-4">
          <div className="card flex items-center gap-4">
            <div className="w-12 h-12 bg-primary-100 rounded-2xl flex items-center justify-center">
              <Briefcase size={24} className="text-primary-600" />
            </div>
            <div>
              <p className="text-sm text-gray-500">جداول العمل</p>
              <p className="text-2xl font-bold text-gray-800">{schedules.length}</p>
            </div>
          </div>
          <div className="card flex items-center gap-4">
            <div className="w-12 h-12 bg-success-50 rounded-2xl flex items-center justify-center">
              <Users size={24} className="text-success-600" />
            </div>
            <div>
              <p className="text-sm text-gray-500">إجمالي الموظفين</p>
              <p className="text-2xl font-bold text-success-600">{totalEmployees}</p>
            </div>
          </div>
          <div className="card flex items-center gap-4">
            <div className="w-12 h-12 bg-warning-50 rounded-2xl flex items-center justify-center">
              <Calendar size={24} className="text-warning-600" />
            </div>
            <div>
              <p className="text-sm text-gray-500">أيام العمل (الجدول المختار)</p>
              <p className="text-2xl font-bold text-warning-600">{workDaysCount} أيام</p>
            </div>
          </div>
          <div className="card flex items-center gap-4">
            <div className="w-12 h-12 bg-purple-100 rounded-2xl flex items-center justify-center">
              <Settings size={24} className="text-purple-600" />
            </div>
            <div>
              <p className="text-sm text-gray-500">قواعد نشطة (الجدول المختار)</p>
              <p className="text-2xl font-bold text-purple-600">{activeRulesCount}</p>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-12 gap-6">
          {/* قائمة الجداول */}
          <div className="col-span-4">
            <div className="card">
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-lg font-bold text-gray-800">جداول العمل</h2>
                <button
                  onClick={() => setShowAddSchedule(true)}
                  className="btn-primary flex items-center gap-2 text-sm py-2"
                >
                  <Plus size={16} />
                  جدول جديد
                </button>
              </div>

              <div className="space-y-3">
                {schedules.map(schedule => {
                  const color = getScheduleColor(schedule.color)
                  const isSelected = selectedSchedule?.id === schedule.id

                  return (
                    <div
                      key={schedule.id}
                      onClick={() => setSelectedSchedule(schedule)}
                      className={`p-4 rounded-xl border-2 cursor-pointer transition-all ${
                        isSelected
                          ? 'border-primary-500 bg-primary-50'
                          : 'border-gray-200 hover:border-gray-300 bg-white'
                      }`}
                    >
                      <div className="flex items-start gap-3">
                        <div className={`w-10 h-10 ${color.class} rounded-xl flex items-center justify-center flex-shrink-0`}>
                          <Calendar size={20} className="text-white" />
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2">
                            <h3 className="font-bold text-gray-800 truncate">{schedule.name}</h3>
                            {schedule.isDefault && (
                              <span className="px-2 py-0.5 bg-primary-100 text-primary-600 rounded-full text-xs font-medium">
                                افتراضي
                              </span>
                            )}
                          </div>
                          <p className="text-sm text-gray-500 mt-1">{schedule.description}</p>
                          <div className="flex items-center gap-4 mt-2 text-xs text-gray-400">
                            <span className="flex items-center gap-1">
                              <Users size={12} />
                              {schedule.employeeCount} موظف
                            </span>
                            <span className="flex items-center gap-1">
                              <Clock size={12} />
                              {schedule.workHours.start} - {schedule.workHours.end}
                            </span>
                          </div>
                        </div>
                      </div>

                      {/* أيام العمل */}
                      <div className="flex gap-1 mt-3">
                        {weekDays.map(day => (
                          <div
                            key={day.key}
                            className={`w-8 h-8 rounded-lg flex items-center justify-center text-xs font-bold ${
                              schedule.workDays[day.key]
                                ? `${color.class} text-white`
                                : 'bg-gray-100 text-gray-400'
                            }`}
                          >
                            {day.shortName}
                          </div>
                        ))}
                      </div>
                    </div>
                  )
                })}
              </div>
            </div>
          </div>

          {/* تفاصيل الجدول المختار */}
          <div className="col-span-8 space-y-6">
            {selectedSchedule ? (
              <>
                {/* معلومات الجدول */}
                <div className="card">
                  <div className="flex items-center justify-between mb-6">
                    <div className="flex items-center gap-3">
                      <div className={`w-12 h-12 ${getScheduleColor(selectedSchedule.color).class} rounded-xl flex items-center justify-center`}>
                        <Calendar size={24} className="text-white" />
                      </div>
                      <div>
                        <div className="flex items-center gap-2">
                          <h2 className="text-xl font-bold text-gray-800">{selectedSchedule.name}</h2>
                          {selectedSchedule.isDefault && (
                            <span className="px-2 py-1 bg-primary-100 text-primary-600 rounded-full text-xs font-medium">
                              الجدول الافتراضي
                            </span>
                          )}
                        </div>
                        <p className="text-gray-500">{selectedSchedule.description}</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <button
                        onClick={() => setShowAssignModal(true)}
                        className="btn-primary flex items-center gap-2 text-sm py-2"
                      >
                        <UserPlus size={16} />
                        تعيين للموظفين
                      </button>
                      {!selectedSchedule.isDefault && (
                        <button
                          onClick={() => setAsDefault(selectedSchedule.id)}
                          className="btn-secondary text-sm py-2"
                        >
                          تعيين كافتراضي
                        </button>
                      )}
                      <button
                        onClick={() => setShowEditSchedule(true)}
                        className="p-2 rounded-lg bg-gray-100 text-gray-600 hover:bg-gray-200"
                      >
                        <Edit3 size={18} />
                      </button>
                      {!selectedSchedule.isDefault && (
                        <button
                          onClick={() => deleteSchedule(selectedSchedule.id)}
                          className="p-2 rounded-lg bg-red-50 text-red-600 hover:bg-red-100"
                        >
                          <Trash2 size={18} />
                        </button>
                      )}
                    </div>
                  </div>

                  {/* ساعات العمل */}
                  <div className="grid grid-cols-2 gap-4 mb-6">
                    <div className="p-4 bg-gray-50 rounded-xl">
                      <div className="flex items-center gap-2 mb-2">
                        <Clock size={16} className="text-gray-400" />
                        <span className="text-sm text-gray-600">ساعات العمل</span>
                      </div>
                      <p className="text-lg font-bold text-gray-800">
                        {selectedSchedule.workHours.start} - {selectedSchedule.workHours.end}
                      </p>
                    </div>
                    <div className="p-4 bg-gray-50 rounded-xl">
                      <div className="flex items-center gap-2 mb-2">
                        <Clock size={16} className="text-gray-400" />
                        <span className="text-sm text-gray-600">وقت الاستراحة</span>
                      </div>
                      <p className="text-lg font-bold text-gray-800">
                        {selectedSchedule.workHours.breakStart} - {selectedSchedule.workHours.breakEnd}
                      </p>
                    </div>
                  </div>

                  {/* أيام العمل */}
                  <div>
                    <h3 className="text-sm font-medium text-gray-600 mb-3">أيام العمل</h3>
                    <div className="flex items-center justify-center gap-3">
                      {weekDays.map(day => (
                        <button
                          key={day.key}
                          onClick={() => toggleWorkDay(day.key)}
                          className={`w-16 h-20 rounded-2xl flex flex-col items-center justify-center gap-1 transition-all ${
                            selectedSchedule.workDays[day.key]
                              ? `${getScheduleColor(selectedSchedule.color).class} text-white shadow-lg`
                              : 'bg-gray-100 text-gray-400 hover:bg-gray-200'
                          }`}
                        >
                          <span className="text-xl font-bold">{day.shortName}</span>
                          <span className="text-xs">{day.name}</span>
                          <div className={`w-5 h-5 rounded-full flex items-center justify-center ${
                            selectedSchedule.workDays[day.key] ? 'bg-white/20' : 'bg-gray-200'
                          }`}>
                            {selectedSchedule.workDays[day.key] ? (
                              <CheckCircle size={14} className="text-white" />
                            ) : (
                              <span className="text-gray-400 text-xs">✕</span>
                            )}
                          </div>
                        </button>
                      ))}
                    </div>
                  </div>
                </div>

                {/* القواعد الاستثنائية */}
                <div className="card">
                  <div className="flex items-center justify-between mb-6">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 bg-warning-100 rounded-xl flex items-center justify-center">
                        <Settings size={20} className="text-warning-600" />
                      </div>
                      <div>
                        <h2 className="text-lg font-bold text-gray-800">القواعد الاستثنائية</h2>
                        <p className="text-sm text-gray-500">قواعد خاصة تطبق على هذا الجدول</p>
                      </div>
                    </div>
                    <button
                      onClick={() => setShowAddRule(true)}
                      className="btn-primary flex items-center gap-2"
                    >
                      <Plus size={18} />
                      إضافة قاعدة
                    </button>
                  </div>

                  {/* قائمة القواعد */}
                  <div className="space-y-4">
                    {selectedSchedule.rules.map((rule, index) => {
                      const ruleType = getRuleType(rule.type)
                      const RuleIcon = ruleType.icon
                      const isExpanded = expandedRules.includes(rule.id)

                      return (
                        <div
                          key={rule.id}
                          className={`border-2 rounded-2xl overflow-hidden transition-all ${
                            rule.isActive
                              ? 'border-gray-200 bg-white'
                              : 'border-gray-100 bg-gray-50 opacity-60'
                          }`}
                        >
                          {/* Header */}
                          <div
                            className="p-4 flex items-center justify-between cursor-pointer hover:bg-gray-50"
                            onClick={() => toggleRuleExpanded(rule.id)}
                          >
                            <div className="flex items-center gap-4">
                              <div className={`w-10 h-10 ${ruleType.color} rounded-xl flex items-center justify-center`}>
                                <RuleIcon size={20} className="text-white" />
                              </div>
                              <div>
                                <div className="flex items-center gap-2">
                                  <span className="text-xs text-gray-400">القاعدة #{index + 1}</span>
                                  <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${
                                    rule.isActive
                                      ? 'bg-success-100 text-success-600'
                                      : 'bg-gray-200 text-gray-500'
                                  }`}>
                                    {rule.isActive ? 'نشطة' : 'معطلة'}
                                  </span>
                                </div>
                                <h3 className="font-bold text-gray-800 mt-1">{rule.description}</h3>
                              </div>
                            </div>
                            <div className="flex items-center gap-2">
                              <span className={`px-3 py-1 rounded-lg text-sm ${ruleType.color} bg-opacity-10 ${ruleType.color.replace('bg-', 'text-')}`}>
                                {ruleType.name}
                              </span>
                              {isExpanded ? (
                                <ChevronUp size={20} className="text-gray-400" />
                              ) : (
                                <ChevronDown size={20} className="text-gray-400" />
                              )}
                            </div>
                          </div>

                          {/* Content */}
                          {isExpanded && (
                            <div className="px-4 pb-4 border-t border-gray-100">
                              <div className="mt-4 grid grid-cols-2 gap-6">
                                {/* الشرط */}
                                <div>
                                  <h4 className="text-sm font-medium text-gray-600 mb-3">الشرط:</h4>
                                  <div className="p-4 bg-gray-50 rounded-xl space-y-2">
                                    <div className="flex items-center gap-2">
                                      <span className="text-gray-500">اليوم =</span>
                                      <span className="px-2 py-1 bg-primary-100 text-primary-700 rounded-lg text-sm font-medium">
                                        {rule.conditions.dayOfWeek.map(d =>
                                          weekDays.find(w => w.key === d)?.name
                                        ).join('، ')}
                                      </span>
                                    </div>
                                    <div className="flex items-center gap-2">
                                      <span className="text-gray-400">AND</span>
                                    </div>
                                    <div className="flex items-center gap-2">
                                      <span className="text-gray-500">الموقع =</span>
                                      <span className="px-2 py-1 bg-warning-100 text-warning-700 rounded-lg text-sm font-medium">
                                        {dayPositions.find(p => p.id === rule.conditions.position)?.name}
                                      </span>
                                      <span className="text-gray-500">في</span>
                                      <span className="px-2 py-1 bg-purple-100 text-purple-700 rounded-lg text-sm font-medium">
                                        {timePeriods.find(p => p.id === rule.conditions.period)?.name}
                                      </span>
                                    </div>
                                  </div>
                                </div>

                                {/* النتيجة */}
                                <div>
                                  <h4 className="text-sm font-medium text-gray-600 mb-3">النتيجة:</h4>
                                  <div className="p-4 bg-gray-50 rounded-xl space-y-3">
                                    {rule.result.isHoliday ? (
                                      <div className="flex items-center gap-2">
                                        <Moon size={18} className="text-red-500" />
                                        <span className="text-gray-700">إجازة رسمية</span>
                                        {rule.result.holidayName && (
                                          <span className="text-gray-500">({rule.result.holidayName})</span>
                                        )}
                                      </div>
                                    ) : (
                                      <>
                                        <div className="flex items-center gap-2">
                                          <Sun size={18} className="text-green-500" />
                                          <span className="text-gray-700">يوم عمل رسمي</span>
                                        </div>
                                        {rule.result.shiftId && (
                                          <div className="flex items-center gap-2 mt-2">
                                            <Clock size={16} className="text-gray-400" />
                                            <span className="text-gray-500">الوردية:</span>
                                            <span className="px-2 py-1 bg-blue-100 text-blue-700 rounded-lg text-sm font-medium">
                                              {getShift(rule.result.shiftId).name}
                                            </span>
                                            <span className="text-xs text-gray-400">
                                              ({getShift(rule.result.shiftId).time})
                                            </span>
                                          </div>
                                        )}
                                      </>
                                    )}
                                  </div>
                                </div>
                              </div>

                              {/* Actions */}
                              <div className="mt-4 pt-4 border-t border-gray-100 flex items-center justify-between">
                                <div className="flex items-center gap-2">
                                  <button
                                    onClick={(e) => {
                                      e.stopPropagation()
                                      toggleRuleActive(rule.id)
                                    }}
                                    className={`flex items-center gap-2 px-3 py-2 rounded-lg transition-colors ${
                                      rule.isActive
                                        ? 'bg-success-50 text-success-600 hover:bg-success-100'
                                        : 'bg-gray-100 text-gray-500 hover:bg-gray-200'
                                    }`}
                                  >
                                    {rule.isActive ? (
                                      <ToggleRight size={18} />
                                    ) : (
                                      <ToggleLeft size={18} />
                                    )}
                                    {rule.isActive ? 'تعطيل' : 'تفعيل'}
                                  </button>
                                  <button
                                    onClick={(e) => {
                                      e.stopPropagation()
                                      duplicateRule(rule)
                                    }}
                                    className="flex items-center gap-2 px-3 py-2 rounded-lg bg-gray-100 text-gray-600 hover:bg-gray-200 transition-colors"
                                  >
                                    <Copy size={18} />
                                    نسخ
                                  </button>
                                </div>
                                <button
                                  onClick={(e) => {
                                    e.stopPropagation()
                                    deleteRule(rule.id)
                                  }}
                                  className="flex items-center gap-2 px-3 py-2 rounded-lg bg-red-50 text-red-600 hover:bg-red-100 transition-colors"
                                >
                                  <Trash2 size={18} />
                                  حذف
                                </button>
                              </div>
                            </div>
                          )}
                        </div>
                      )
                    })}

                    {selectedSchedule.rules.length === 0 && (
                      <div className="text-center py-12 text-gray-500">
                        <Settings size={48} className="mx-auto mb-4 text-gray-300" />
                        <p>لا توجد قواعد استثنائية</p>
                        <p className="text-sm mt-1">أضف قاعدة جديدة لتخصيص أيام العمل</p>
                      </div>
                    )}
                  </div>
                </div>

                {/* ملاحظة */}
                <div className="p-4 bg-blue-50 rounded-xl flex items-start gap-3">
                  <Info size={20} className="text-blue-500 mt-0.5" />
                  <div className="text-sm text-blue-700">
                    <p className="font-medium">كيفية تعيين الجدول للموظفين:</p>
                    <p className="mt-1">عند إضافة موظف جديد أو تعديل موظف حالي، يمكنك اختيار جدول العمل المناسب له من قائمة الجداول المتاحة.</p>
                  </div>
                </div>
              </>
            ) : (
              <div className="card flex items-center justify-center h-96 text-gray-500">
                <div className="text-center">
                  <Calendar size={48} className="mx-auto mb-4 text-gray-300" />
                  <p>اختر جدول عمل من القائمة</p>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Modal إضافة جدول */}
        {showAddSchedule && (
          <AddScheduleModal
            onClose={() => setShowAddSchedule(false)}
            onAdd={(schedule) => {
              const newSchedule: WorkSchedule = {
                ...schedule,
                id: Date.now().toString(),
                employeeCount: 0,
                rules: [],
              }
              setSchedules(prev => [...prev, newSchedule])
              setSelectedSchedule(newSchedule)
              setHasChanges(true)
              setShowAddSchedule(false)
            }}
          />
        )}

        {/* Modal تعديل جدول */}
        {showEditSchedule && selectedSchedule && (
          <EditScheduleModal
            schedule={selectedSchedule}
            onClose={() => setShowEditSchedule(false)}
            onSave={(updated) => {
              const updatedSchedule = { ...selectedSchedule, ...updated }
              setSchedules(prev =>
                prev.map(s => (s.id === updatedSchedule.id ? updatedSchedule : s))
              )
              setSelectedSchedule(updatedSchedule)
              setHasChanges(true)
              setShowEditSchedule(false)
            }}
          />
        )}

        {/* Modal إضافة قاعدة */}
        {showAddRule && (
          <AddRuleModal
            onClose={() => setShowAddRule(false)}
            onAdd={addRule}
          />
        )}

        {/* Modal تعيين الجدول للموظفين */}
        {showAssignModal && selectedSchedule && (
          <AssignScheduleModal
            schedule={selectedSchedule}
            onClose={() => setShowAssignModal(false)}
            onAssign={(count) => {
              // تحديث عدد الموظفين
              const updatedSchedule = {
                ...selectedSchedule,
                employeeCount: selectedSchedule.employeeCount + count,
              }
              setSchedules(prev =>
                prev.map(s => (s.id === updatedSchedule.id ? updatedSchedule : s))
              )
              setSelectedSchedule(updatedSchedule)
              setShowAssignModal(false)
              alert(`تم تعيين الجدول لـ ${count} موظف بنجاح!`)
            }}
          />
        )}
      </div>
    </MainLayout>
  )
}

// Modal إضافة جدول جديد
function AddScheduleModal({
  onClose,
  onAdd,
}: {
  onClose: () => void
  onAdd: (schedule: Omit<WorkSchedule, 'id' | 'employeeCount' | 'rules'>) => void
}) {
  const [name, setName] = useState('')
  const [description, setDescription] = useState('')
  const [color, setColor] = useState('blue')
  const [workDays, setWorkDays] = useState<{ [key: string]: boolean }>({
    sunday: true,
    monday: true,
    tuesday: true,
    wednesday: true,
    thursday: true,
    friday: false,
    saturday: false,
  })
  const [workHours, setWorkHours] = useState({
    start: '08:00',
    end: '17:00',
    breakStart: '12:00',
    breakEnd: '13:00',
  })

  const handleSubmit = () => {
    if (!name) {
      alert('الرجاء إدخال اسم الجدول')
      return
    }

    onAdd({
      name,
      description,
      color,
      isDefault: false,
      workDays,
      workHours,
    })
  }

  const toggleDay = (day: string) => {
    setWorkDays(prev => ({
      ...prev,
      [day]: !prev[day],
    }))
  }

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-2xl w-full max-w-2xl max-h-[90vh] overflow-y-auto">
        <div className="p-6 border-b border-gray-100 flex items-center justify-between">
          <div>
            <h2 className="text-xl font-bold text-gray-800">إضافة جدول عمل جديد</h2>
            <p className="text-gray-500 text-sm mt-1">أنشئ جدول عمل جديد للموظفين</p>
          </div>
          <button onClick={onClose} className="p-2 rounded-lg hover:bg-gray-100">
            <X size={20} className="text-gray-500" />
          </button>
        </div>

        <div className="p-6 space-y-6">
          {/* الاسم والوصف */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                اسم الجدول *
              </label>
              <input
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="مثال: جدول الإدارة"
                className="input w-full"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                الوصف
              </label>
              <input
                type="text"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="مثال: جمعة وسبت إجازة"
                className="input w-full"
              />
            </div>
          </div>

          {/* اللون */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              اللون
            </label>
            <div className="flex gap-3">
              {scheduleColors.map(c => (
                <button
                  key={c.id}
                  onClick={() => setColor(c.id)}
                  className={`w-10 h-10 rounded-xl ${c.class} transition-all ${
                    color === c.id
                      ? 'ring-4 ring-offset-2 ring-primary-300'
                      : 'hover:scale-110'
                  }`}
                />
              ))}
            </div>
          </div>

          {/* أيام العمل */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              أيام العمل
            </label>
            <div className="flex gap-2">
              {weekDays.map(day => (
                <button
                  key={day.key}
                  onClick={() => toggleDay(day.key)}
                  className={`w-14 h-16 rounded-xl flex flex-col items-center justify-center gap-1 transition-all ${
                    workDays[day.key]
                      ? `${scheduleColors.find(c => c.id === color)?.class || 'bg-blue-500'} text-white`
                      : 'bg-gray-100 text-gray-400 hover:bg-gray-200'
                  }`}
                >
                  <span className="text-lg font-bold">{day.shortName}</span>
                  <span className="text-xs">{workDays[day.key] ? 'دوام' : 'إجازة'}</span>
                </button>
              ))}
            </div>
          </div>

          {/* ساعات العمل */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              ساعات العمل
            </label>
            <div className="grid grid-cols-4 gap-4">
              <div>
                <label className="block text-xs text-gray-500 mb-1">بداية الدوام</label>
                <input
                  type="time"
                  value={workHours.start}
                  onChange={(e) => setWorkHours(prev => ({ ...prev, start: e.target.value }))}
                  className="input w-full"
                />
              </div>
              <div>
                <label className="block text-xs text-gray-500 mb-1">نهاية الدوام</label>
                <input
                  type="time"
                  value={workHours.end}
                  onChange={(e) => setWorkHours(prev => ({ ...prev, end: e.target.value }))}
                  className="input w-full"
                />
              </div>
              <div>
                <label className="block text-xs text-gray-500 mb-1">بداية الاستراحة</label>
                <input
                  type="time"
                  value={workHours.breakStart}
                  onChange={(e) => setWorkHours(prev => ({ ...prev, breakStart: e.target.value }))}
                  className="input w-full"
                />
              </div>
              <div>
                <label className="block text-xs text-gray-500 mb-1">نهاية الاستراحة</label>
                <input
                  type="time"
                  value={workHours.breakEnd}
                  onChange={(e) => setWorkHours(prev => ({ ...prev, breakEnd: e.target.value }))}
                  className="input w-full"
                />
              </div>
            </div>
          </div>
        </div>

        {/* Actions */}
        <div className="p-6 border-t border-gray-100 flex gap-3">
          <button onClick={handleSubmit} className="flex-1 btn-primary">
            إضافة الجدول
          </button>
          <button onClick={onClose} className="flex-1 btn-secondary">
            إلغاء
          </button>
        </div>
      </div>
    </div>
  )
}

// Modal تعديل جدول
function EditScheduleModal({
  schedule,
  onClose,
  onSave,
}: {
  schedule: WorkSchedule
  onClose: () => void
  onSave: (updated: Partial<WorkSchedule>) => void
}) {
  const [name, setName] = useState(schedule.name)
  const [description, setDescription] = useState(schedule.description)
  const [color, setColor] = useState(schedule.color)
  const [workHours, setWorkHours] = useState(schedule.workHours)

  const handleSubmit = () => {
    if (!name) {
      alert('الرجاء إدخال اسم الجدول')
      return
    }

    onSave({
      name,
      description,
      color,
      workHours,
    })
  }

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-2xl w-full max-w-lg">
        <div className="p-6 border-b border-gray-100 flex items-center justify-between">
          <h2 className="text-xl font-bold text-gray-800">تعديل الجدول</h2>
          <button onClick={onClose} className="p-2 rounded-lg hover:bg-gray-100">
            <X size={20} className="text-gray-500" />
          </button>
        </div>

        <div className="p-6 space-y-6">
          {/* الاسم والوصف */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              اسم الجدول *
            </label>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="input w-full"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              الوصف
            </label>
            <input
              type="text"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              className="input w-full"
            />
          </div>

          {/* اللون */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              اللون
            </label>
            <div className="flex gap-3">
              {scheduleColors.map(c => (
                <button
                  key={c.id}
                  onClick={() => setColor(c.id)}
                  className={`w-10 h-10 rounded-xl ${c.class} transition-all ${
                    color === c.id
                      ? 'ring-4 ring-offset-2 ring-primary-300'
                      : 'hover:scale-110'
                  }`}
                />
              ))}
            </div>
          </div>

          {/* ساعات العمل */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              ساعات العمل
            </label>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-xs text-gray-500 mb-1">بداية الدوام</label>
                <input
                  type="time"
                  value={workHours.start}
                  onChange={(e) => setWorkHours(prev => ({ ...prev, start: e.target.value }))}
                  className="input w-full"
                />
              </div>
              <div>
                <label className="block text-xs text-gray-500 mb-1">نهاية الدوام</label>
                <input
                  type="time"
                  value={workHours.end}
                  onChange={(e) => setWorkHours(prev => ({ ...prev, end: e.target.value }))}
                  className="input w-full"
                />
              </div>
              <div>
                <label className="block text-xs text-gray-500 mb-1">بداية الاستراحة</label>
                <input
                  type="time"
                  value={workHours.breakStart}
                  onChange={(e) => setWorkHours(prev => ({ ...prev, breakStart: e.target.value }))}
                  className="input w-full"
                />
              </div>
              <div>
                <label className="block text-xs text-gray-500 mb-1">نهاية الاستراحة</label>
                <input
                  type="time"
                  value={workHours.breakEnd}
                  onChange={(e) => setWorkHours(prev => ({ ...prev, breakEnd: e.target.value }))}
                  className="input w-full"
                />
              </div>
            </div>
          </div>
        </div>

        {/* Actions */}
        <div className="p-6 border-t border-gray-100 flex gap-3">
          <button onClick={handleSubmit} className="flex-1 btn-primary">
            حفظ التغييرات
          </button>
          <button onClick={onClose} className="flex-1 btn-secondary">
            إلغاء
          </button>
        </div>
      </div>
    </div>
  )
}

// Modal إضافة قاعدة جديدة
function AddRuleModal({
  onClose,
  onAdd,
}: {
  onClose: () => void
  onAdd: (rule: Omit<WorkRule, 'id'>) => void
}) {
  const [description, setDescription] = useState('')
  const [ruleType, setRuleType] = useState<WorkRule['type']>('off_to_work')
  const [selectedDays, setSelectedDays] = useState<string[]>([])
  const [position, setPosition] = useState('last')
  const [period, setPeriod] = useState('month')
  const [shiftId, setShiftId] = useState('default')
  const [holidayName, setHolidayName] = useState('')

  const handleSubmit = () => {
    if (!description || selectedDays.length === 0) {
      alert('الرجاء ملء جميع الحقول المطلوبة')
      return
    }

    onAdd({
      description,
      type: ruleType,
      isActive: true,
      conditions: {
        dayOfWeek: selectedDays,
        position,
        period,
      },
      result: {
        shiftId: ruleType !== 'work_to_off' ? shiftId : undefined,
        isHoliday: ruleType === 'work_to_off',
        holidayName: ruleType === 'work_to_off' ? holidayName : undefined,
      },
      priority: 1,
    })
  }

  const toggleDay = (day: string) => {
    setSelectedDays(prev =>
      prev.includes(day)
        ? prev.filter(d => d !== day)
        : [...prev, day]
    )
  }

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-2xl w-full max-w-2xl max-h-[90vh] overflow-y-auto">
        <div className="p-6 border-b border-gray-100 flex items-center justify-between">
          <div>
            <h2 className="text-xl font-bold text-gray-800">إضافة قاعدة جديدة</h2>
            <p className="text-gray-500 text-sm mt-1">أنشئ قاعدة استثنائية لأيام العمل</p>
          </div>
          <button onClick={onClose} className="p-2 rounded-lg hover:bg-gray-100">
            <X size={20} className="text-gray-500" />
          </button>
        </div>

        <div className="p-6 space-y-6">
          {/* الوصف */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              وصف القاعدة *
            </label>
            <input
              type="text"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="مثال: آخر سبت في الشهر - دوام رسمي"
              className="input w-full"
            />
          </div>

          {/* نوع القاعدة */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              نوع القاعدة *
            </label>
            <div className="grid grid-cols-2 gap-3">
              {ruleTypes.map(type => {
                const Icon = type.icon
                return (
                  <button
                    key={type.id}
                    onClick={() => setRuleType(type.id as WorkRule['type'])}
                    className={`p-4 rounded-xl border-2 text-right transition-all ${
                      ruleType === type.id
                        ? `border-primary-500 bg-primary-50`
                        : 'border-gray-200 hover:border-gray-300'
                    }`}
                  >
                    <div className="flex items-center gap-3">
                      <div className={`w-10 h-10 ${type.color} rounded-lg flex items-center justify-center`}>
                        <Icon size={20} className="text-white" />
                      </div>
                      <span className="font-medium text-gray-800">{type.name}</span>
                    </div>
                  </button>
                )
              })}
            </div>
          </div>

          {/* الشرط */}
          <div className="p-4 bg-gray-50 rounded-xl space-y-4">
            <h3 className="font-medium text-gray-800">الشرط:</h3>

            {/* اختيار الأيام */}
            <div>
              <label className="block text-sm text-gray-600 mb-2">اليوم *</label>
              <div className="flex gap-2 flex-wrap">
                {weekDays.map(day => (
                  <button
                    key={day.key}
                    onClick={() => toggleDay(day.key)}
                    className={`px-4 py-2 rounded-lg transition-all ${
                      selectedDays.includes(day.key)
                        ? 'bg-primary-500 text-white'
                        : 'bg-white border border-gray-200 text-gray-600 hover:border-primary-300'
                    }`}
                  >
                    {day.name}
                  </button>
                ))}
              </div>
            </div>

            {/* الموقع والفترة */}
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm text-gray-600 mb-2">الموقع</label>
                <select
                  value={position}
                  onChange={(e) => setPosition(e.target.value)}
                  className="input w-full"
                >
                  {dayPositions.map(p => (
                    <option key={p.id} value={p.id}>{p.name}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-sm text-gray-600 mb-2">في</label>
                <select
                  value={period}
                  onChange={(e) => setPeriod(e.target.value)}
                  className="input w-full"
                >
                  {timePeriods.map(p => (
                    <option key={p.id} value={p.id}>{p.name}</option>
                  ))}
                </select>
              </div>
            </div>
          </div>

          {/* النتيجة */}
          <div className="p-4 bg-gray-50 rounded-xl space-y-4">
            <h3 className="font-medium text-gray-800">النتيجة:</h3>

            {ruleType === 'work_to_off' ? (
              <div>
                <label className="block text-sm text-gray-600 mb-2">اسم الإجازة (اختياري)</label>
                <input
                  type="text"
                  value={holidayName}
                  onChange={(e) => setHolidayName(e.target.value)}
                  placeholder="مثال: إجازة رمضان"
                  className="input w-full"
                />
              </div>
            ) : (
              <div>
                <label className="block text-sm text-gray-600 mb-2">الوردية</label>
                <select
                  value={shiftId}
                  onChange={(e) => setShiftId(e.target.value)}
                  className="input w-full"
                >
                  {availableShifts.map(shift => (
                    <option key={shift.id} value={shift.id}>
                      {shift.name} ({shift.time})
                    </option>
                  ))}
                </select>
              </div>
            )}
          </div>
        </div>

        {/* Actions */}
        <div className="p-6 border-t border-gray-100 flex gap-3">
          <button onClick={handleSubmit} className="flex-1 btn-primary">
            إضافة القاعدة
          </button>
          <button onClick={onClose} className="flex-1 btn-secondary">
            إلغاء
          </button>
        </div>
      </div>
    </div>
  )
}

// بيانات الموظفين (للعرض فقط)
const sampleEmployees = [
  { id: '1', name: 'أحمد محمد السعيد', department: 'تقنية المعلومات', position: 'مطور برمجيات', scheduleId: '1' },
  { id: '2', name: 'فاطمة علي الحسن', department: 'الموارد البشرية', position: 'أخصائي موارد بشرية', scheduleId: '1' },
  { id: '3', name: 'محمد عبدالله الراشد', department: 'المالية', position: 'محاسب', scheduleId: '2' },
  { id: '4', name: 'نورة سعد العتيبي', department: 'التسويق', position: 'مدير تسويق', scheduleId: '1' },
  { id: '5', name: 'خالد إبراهيم المطيري', department: 'تقنية المعلومات', position: 'مدير تقنية', scheduleId: '1' },
  { id: '6', name: 'سارة أحمد الشمري', department: 'المبيعات', position: 'مندوب مبيعات', scheduleId: '2' },
  { id: '7', name: 'عبدالرحمن فهد القحطاني', department: 'المالية', position: 'مدير مالي', scheduleId: '1' },
  { id: '8', name: 'مريم حسن الدوسري', department: 'الموارد البشرية', position: 'مدير موارد بشرية', scheduleId: '1' },
]

const departments = [
  { id: 'it', name: 'تقنية المعلومات', employeeCount: 12 },
  { id: 'hr', name: 'الموارد البشرية', employeeCount: 8 },
  { id: 'finance', name: 'المالية', employeeCount: 10 },
  { id: 'sales', name: 'المبيعات', employeeCount: 15 },
  { id: 'marketing', name: 'التسويق', employeeCount: 7 },
]

// Modal تعيين الجدول للموظفين
function AssignScheduleModal({
  schedule,
  onClose,
  onAssign,
}: {
  schedule: WorkSchedule
  onClose: () => void
  onAssign: (count: number) => void
}) {
  const [scope, setScope] = useState<'individual' | 'department' | 'company' | 'custom'>('individual')
  const [selectedDepartment, setSelectedDepartment] = useState('')
  const [selectedEmployees, setSelectedEmployees] = useState<string[]>([])
  const [searchQuery, setSearchQuery] = useState('')

  // الموظفين المفلترين
  const filteredEmployees = sampleEmployees.filter(emp =>
    emp.name.includes(searchQuery) ||
    emp.department.includes(searchQuery) ||
    emp.position.includes(searchQuery)
  )

  // عدد الموظفين المتأثرين
  const getAffectedCount = () => {
    switch (scope) {
      case 'individual':
        return selectedEmployees.length
      case 'department':
        return departments.find(d => d.id === selectedDepartment)?.employeeCount || 0
      case 'company':
        return sampleEmployees.length
      case 'custom':
        return selectedEmployees.length
      default:
        return 0
    }
  }

  const handleSubmit = () => {
    const count = getAffectedCount()
    if (count === 0) {
      alert('الرجاء اختيار موظف واحد على الأقل')
      return
    }
    onAssign(count)
  }

  const toggleEmployee = (empId: string) => {
    setSelectedEmployees(prev =>
      prev.includes(empId)
        ? prev.filter(id => id !== empId)
        : [...prev, empId]
    )
  }

  const selectAllEmployees = () => {
    setSelectedEmployees(filteredEmployees.map(e => e.id))
  }

  const clearSelection = () => {
    setSelectedEmployees([])
  }

  const colorClass = scheduleColors.find(c => c.id === schedule.color)?.class || 'bg-blue-500'

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-2xl w-full max-w-3xl max-h-[90vh] overflow-hidden flex flex-col">
        <div className="p-6 border-b border-gray-100 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className={`w-12 h-12 ${colorClass} rounded-xl flex items-center justify-center`}>
              <Calendar size={24} className="text-white" />
            </div>
            <div>
              <h2 className="text-xl font-bold text-gray-800">تعيين جدول العمل</h2>
              <p className="text-gray-500 text-sm mt-1">تعيين "{schedule.name}" للموظفين</p>
            </div>
          </div>
          <button onClick={onClose} className="p-2 rounded-lg hover:bg-gray-100">
            <X size={20} className="text-gray-500" />
          </button>
        </div>

        <div className="p-6 flex-1 overflow-y-auto space-y-6">
          {/* نطاق التعيين */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-3">
              نطاق التعيين
            </label>
            <div className="grid grid-cols-4 gap-3">
              <button
                onClick={() => { setScope('individual'); setSelectedEmployees([]); }}
                className={`p-4 rounded-xl border-2 text-center transition-all ${
                  scope === 'individual'
                    ? 'border-primary-500 bg-primary-50'
                    : 'border-gray-200 hover:border-gray-300'
                }`}
              >
                <User size={24} className={`mx-auto mb-2 ${scope === 'individual' ? 'text-primary-600' : 'text-gray-400'}`} />
                <p className={`font-medium ${scope === 'individual' ? 'text-primary-700' : 'text-gray-700'}`}>
                  موظف واحد
                </p>
              </button>

              <button
                onClick={() => { setScope('department'); setSelectedEmployees([]); }}
                className={`p-4 rounded-xl border-2 text-center transition-all ${
                  scope === 'department'
                    ? 'border-primary-500 bg-primary-50'
                    : 'border-gray-200 hover:border-gray-300'
                }`}
              >
                <Briefcase size={24} className={`mx-auto mb-2 ${scope === 'department' ? 'text-primary-600' : 'text-gray-400'}`} />
                <p className={`font-medium ${scope === 'department' ? 'text-primary-700' : 'text-gray-700'}`}>
                  قسم كامل
                </p>
              </button>

              <button
                onClick={() => { setScope('company'); setSelectedEmployees([]); }}
                className={`p-4 rounded-xl border-2 text-center transition-all ${
                  scope === 'company'
                    ? 'border-primary-500 bg-primary-50'
                    : 'border-gray-200 hover:border-gray-300'
                }`}
              >
                <Building2 size={24} className={`mx-auto mb-2 ${scope === 'company' ? 'text-primary-600' : 'text-gray-400'}`} />
                <p className={`font-medium ${scope === 'company' ? 'text-primary-700' : 'text-gray-700'}`}>
                  الشركة كلها
                </p>
              </button>

              <button
                onClick={() => { setScope('custom'); setSelectedEmployees([]); }}
                className={`p-4 rounded-xl border-2 text-center transition-all ${
                  scope === 'custom'
                    ? 'border-primary-500 bg-primary-50'
                    : 'border-gray-200 hover:border-gray-300'
                }`}
              >
                <Users size={24} className={`mx-auto mb-2 ${scope === 'custom' ? 'text-primary-600' : 'text-gray-400'}`} />
                <p className={`font-medium ${scope === 'custom' ? 'text-primary-700' : 'text-gray-700'}`}>
                  اختيار متعدد
                </p>
              </button>
            </div>
          </div>

          {/* اختيار القسم */}
          {scope === 'department' && (
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                اختر القسم
              </label>
              <div className="grid grid-cols-2 gap-3">
                {departments.map(dept => (
                  <button
                    key={dept.id}
                    onClick={() => setSelectedDepartment(dept.id)}
                    className={`p-4 rounded-xl border-2 text-right transition-all ${
                      selectedDepartment === dept.id
                        ? 'border-primary-500 bg-primary-50'
                        : 'border-gray-200 hover:border-gray-300'
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <div>
                        <p className={`font-medium ${selectedDepartment === dept.id ? 'text-primary-700' : 'text-gray-800'}`}>
                          {dept.name}
                        </p>
                        <p className="text-sm text-gray-500 mt-1">
                          {dept.employeeCount} موظف
                        </p>
                      </div>
                      {selectedDepartment === dept.id && (
                        <CheckCircle size={20} className="text-primary-600" />
                      )}
                    </div>
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* رسالة الشركة كلها */}
          {scope === 'company' && (
            <div className="p-4 bg-warning-50 rounded-xl flex items-start gap-3">
              <AlertCircle size={20} className="text-warning-600 mt-0.5" />
              <div>
                <p className="font-medium text-warning-800">تنبيه</p>
                <p className="text-sm text-warning-700 mt-1">
                  سيتم تعيين هذا الجدول لجميع موظفي الشركة ({sampleEmployees.length} موظف).
                  سيتم استبدال جداولهم الحالية.
                </p>
              </div>
            </div>
          )}

          {/* اختيار الموظفين */}
          {(scope === 'individual' || scope === 'custom') && (
            <div>
              <div className="flex items-center justify-between mb-3">
                <label className="block text-sm font-medium text-gray-700">
                  {scope === 'individual' ? 'اختر موظف' : 'اختر الموظفين'}
                </label>
                {scope === 'custom' && (
                  <div className="flex gap-2">
                    <button onClick={selectAllEmployees} className="text-sm text-primary-600 hover:text-primary-700">
                      تحديد الكل
                    </button>
                    <span className="text-gray-300">|</span>
                    <button onClick={clearSelection} className="text-sm text-gray-500 hover:text-gray-700">
                      إلغاء التحديد
                    </button>
                  </div>
                )}
              </div>

              {/* بحث */}
              <div className="relative mb-3">
                <Search size={18} className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400" />
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="ابحث بالاسم أو القسم..."
                  className="input w-full pr-10"
                />
              </div>

              {/* قائمة الموظفين */}
              <div className="border border-gray-200 rounded-xl max-h-64 overflow-y-auto">
                {filteredEmployees.map(emp => (
                  <div
                    key={emp.id}
                    onClick={() => {
                      if (scope === 'individual') {
                        setSelectedEmployees([emp.id])
                      } else {
                        toggleEmployee(emp.id)
                      }
                    }}
                    className={`p-3 flex items-center gap-3 cursor-pointer border-b border-gray-100 last:border-0 hover:bg-gray-50 ${
                      selectedEmployees.includes(emp.id) ? 'bg-primary-50' : ''
                    }`}
                  >
                    <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${
                      selectedEmployees.includes(emp.id) ? 'bg-primary-500 text-white' : 'bg-gray-100 text-gray-500'
                    }`}>
                      {selectedEmployees.includes(emp.id) ? (
                        <CheckCircle size={20} />
                      ) : (
                        <User size={20} />
                      )}
                    </div>
                    <div className="flex-1">
                      <p className="font-medium text-gray-800">{emp.name}</p>
                      <p className="text-sm text-gray-500">
                        {emp.department} • {emp.position}
                      </p>
                    </div>
                    {emp.scheduleId !== schedule.id && (
                      <span className="text-xs text-gray-400 bg-gray-100 px-2 py-1 rounded">
                        جدول مختلف
                      </span>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* ملخص */}
          <div className="p-4 bg-gray-50 rounded-xl">
            <div className="flex items-center justify-between">
              <span className="text-gray-600">عدد الموظفين المتأثرين:</span>
              <span className="text-2xl font-bold text-primary-600">{getAffectedCount()}</span>
            </div>
          </div>
        </div>

        {/* Actions */}
        <div className="p-6 border-t border-gray-100 flex gap-3">
          <button
            onClick={handleSubmit}
            disabled={getAffectedCount() === 0}
            className={`flex-1 btn-primary flex items-center justify-center gap-2 ${
              getAffectedCount() === 0 ? 'opacity-50 cursor-not-allowed' : ''
            }`}
          >
            <UserPlus size={18} />
            تعيين الجدول
          </button>
          <button onClick={onClose} className="flex-1 btn-secondary">
            إلغاء
          </button>
        </div>
      </div>
    </div>
  )
}
