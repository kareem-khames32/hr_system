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
  appliesTo: 'all' | 'department' | 'employee'
  targetIds?: string[]
}

// البيانات الافتراضية
const defaultWorkDays: { [key: string]: boolean } = {
  sunday: true,
  monday: true,
  tuesday: true,
  wednesday: true,
  thursday: true,
  friday: false,
  saturday: false,
}

const initialRules: WorkRule[] = [
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
    appliesTo: 'all',
  },
  {
    id: '2',
    description: 'أول أحد في رمضان - إجازة',
    type: 'work_to_off',
    isActive: true,
    conditions: {
      dayOfWeek: ['sunday'],
      position: 'first',
      period: 'ramadan',
    },
    result: {
      isHoliday: true,
      holidayName: 'إجازة رمضان',
    },
    priority: 2,
    appliesTo: 'all',
  },
  {
    id: '3',
    description: 'كل خميس في رمضان - نصف يوم',
    type: 'half_day',
    isActive: true,
    conditions: {
      dayOfWeek: ['thursday'],
      position: 'every',
      period: 'ramadan',
    },
    result: {
      shiftId: 'half_morning',
    },
    priority: 3,
    appliesTo: 'all',
  },
]

export default function WorkDaysSettingsPage() {
  const [workDays, setWorkDays] = useState(defaultWorkDays)
  const [rules, setRules] = useState<WorkRule[]>(initialRules)
  const [hasChanges, setHasChanges] = useState(false)
  const [showAddRule, setShowAddRule] = useState(false)
  const [editingRule, setEditingRule] = useState<WorkRule | null>(null)
  const [expandedRules, setExpandedRules] = useState<string[]>(['1', '2', '3'])

  // تبديل يوم العمل
  const toggleWorkDay = (day: string) => {
    setWorkDays(prev => ({
      ...prev,
      [day]: !prev[day],
    }))
    setHasChanges(true)
  }

  // تبديل حالة القاعدة
  const toggleRuleActive = (ruleId: string) => {
    setRules(prev =>
      prev.map(rule =>
        rule.id === ruleId ? { ...rule, isActive: !rule.isActive } : rule
      )
    )
    setHasChanges(true)
  }

  // حذف قاعدة
  const deleteRule = (ruleId: string) => {
    if (confirm('هل أنت متأكد من حذف هذه القاعدة؟')) {
      setRules(prev => prev.filter(rule => rule.id !== ruleId))
      setHasChanges(true)
    }
  }

  // نسخ قاعدة
  const duplicateRule = (rule: WorkRule) => {
    const newRule: WorkRule = {
      ...rule,
      id: Date.now().toString(),
      description: rule.description + ' (نسخة)',
      isActive: false,
    }
    setRules(prev => [...prev, newRule])
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

  // حفظ التغييرات
  const saveChanges = () => {
    // هنا يتم الحفظ في الـ backend
    setHasChanges(false)
    alert('تم حفظ الإعدادات بنجاح!')
  }

  // إحصائيات
  const activeRulesCount = rules.filter(r => r.isActive).length
  const workDaysCount = Object.values(workDays).filter(Boolean).length

  return (
    <MainLayout>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-gray-800">إعدادات أيام العمل</h1>
            <p className="text-gray-500 mt-1">تحديد أيام العمل الأساسية والقواعد الاستثنائية</p>
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

        {/* Stats */}
        <div className="grid grid-cols-4 gap-4">
          <div className="card flex items-center gap-4">
            <div className="w-12 h-12 bg-primary-100 rounded-2xl flex items-center justify-center">
              <Calendar size={24} className="text-primary-600" />
            </div>
            <div>
              <p className="text-sm text-gray-500">أيام العمل</p>
              <p className="text-2xl font-bold text-gray-800">{workDaysCount} أيام</p>
            </div>
          </div>
          <div className="card flex items-center gap-4">
            <div className="w-12 h-12 bg-success-50 rounded-2xl flex items-center justify-center">
              <CheckCircle size={24} className="text-success-600" />
            </div>
            <div>
              <p className="text-sm text-gray-500">قواعد نشطة</p>
              <p className="text-2xl font-bold text-success-600">{activeRulesCount}</p>
            </div>
          </div>
          <div className="card flex items-center gap-4">
            <div className="w-12 h-12 bg-warning-50 rounded-2xl flex items-center justify-center">
              <Settings size={24} className="text-warning-600" />
            </div>
            <div>
              <p className="text-sm text-gray-500">إجمالي القواعد</p>
              <p className="text-2xl font-bold text-warning-600">{rules.length}</p>
            </div>
          </div>
          <div className="card flex items-center gap-4">
            <div className="w-12 h-12 bg-purple-100 rounded-2xl flex items-center justify-center">
              <Clock size={24} className="text-purple-600" />
            </div>
            <div>
              <p className="text-sm text-gray-500">ساعات العمل الأسبوعية</p>
              <p className="text-2xl font-bold text-purple-600">{workDaysCount * 8} ساعة</p>
            </div>
          </div>
        </div>

        {/* أيام العمل الأساسية */}
        <div className="card">
          <div className="flex items-center gap-3 mb-6">
            <div className="w-10 h-10 bg-primary-100 rounded-xl flex items-center justify-center">
              <Calendar size={20} className="text-primary-600" />
            </div>
            <div>
              <h2 className="text-lg font-bold text-gray-800">أيام العمل الأساسية</h2>
              <p className="text-sm text-gray-500">حدد أيام الدوام الرسمية في الأسبوع</p>
            </div>
          </div>

          <div className="flex items-center justify-center gap-3">
            {weekDays.map(day => (
              <button
                key={day.key}
                onClick={() => toggleWorkDay(day.key)}
                className={`w-20 h-24 rounded-2xl flex flex-col items-center justify-center gap-2 transition-all ${
                  workDays[day.key]
                    ? 'bg-primary-500 text-white shadow-lg shadow-primary-500/30'
                    : 'bg-gray-100 text-gray-400 hover:bg-gray-200'
                }`}
              >
                <span className="text-2xl font-bold">{day.shortName}</span>
                <span className="text-xs">{day.name}</span>
                <div className={`w-6 h-6 rounded-full flex items-center justify-center ${
                  workDays[day.key] ? 'bg-white/20' : 'bg-gray-200'
                }`}>
                  {workDays[day.key] ? (
                    <CheckCircle size={16} className="text-white" />
                  ) : (
                    <span className="text-gray-400 text-xs">✕</span>
                  )}
                </div>
              </button>
            ))}
          </div>

          <div className="mt-6 p-4 bg-blue-50 rounded-xl flex items-start gap-3">
            <Info size={20} className="text-blue-500 mt-0.5" />
            <div className="text-sm text-blue-700">
              <p className="font-medium">ملاحظة:</p>
              <p>هذه الأيام هي أيام العمل الافتراضية لجميع الموظفين. يمكنك إضافة قواعد استثنائية أدناه لتخصيص أيام معينة.</p>
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
                <p className="text-sm text-gray-500">قواعد خاصة تطبق على أيام محددة</p>
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
            {rules.map((rule, index) => {
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

            {rules.length === 0 && (
              <div className="text-center py-12 text-gray-500">
                <Settings size={48} className="mx-auto mb-4 text-gray-300" />
                <p>لا توجد قواعد استثنائية</p>
                <p className="text-sm mt-1">أضف قاعدة جديدة لتخصيص أيام العمل</p>
              </div>
            )}
          </div>
        </div>

        {/* Modal إضافة قاعدة */}
        {showAddRule && (
          <AddRuleModal
            onClose={() => setShowAddRule(false)}
            onAdd={(rule) => {
              setRules(prev => [...prev, { ...rule, id: Date.now().toString() }])
              setHasChanges(true)
              setShowAddRule(false)
            }}
          />
        )}
      </div>
    </MainLayout>
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
  const [isHoliday, setIsHoliday] = useState(false)
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
      appliesTo: 'all',
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
        <div className="p-6 border-b border-gray-100">
          <h2 className="text-xl font-bold text-gray-800">إضافة قاعدة جديدة</h2>
          <p className="text-gray-500 text-sm mt-1">أنشئ قاعدة استثنائية لأيام العمل</p>
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
