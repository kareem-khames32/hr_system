'use client'

import { useState } from 'react'
import { MainLayout } from '@/components/layout'
import {
  Calendar,
  Clock,
  Save,
  Settings,
  AlertCircle,
  CheckCircle,
  Sun,
  Moon,
  Coffee,
  Info,
  Plus,
  Trash2,
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

// إعدادات الإجازات
interface LeavePolicy {
  annualLeave: number
  sickLeave: number
  emergencyLeave: number
  unpaidLeaveAllowed: boolean
  accrualMethod: 'monthly' | 'yearly' | 'daily'
  accrualStartsAfter: 'probation' | 'joining' | '6months'
  probationPeriod: number
  carryOverAllowed: boolean
  maxCarryOver: number
  carryOverExpiry: number // months
  minLeaveDays: number
  maxConsecutiveDays: number
  advanceNoticeDays: number
  approvalLevels: number
}

// إعدادات الأوفرتايم
interface OvertimePolicy {
  enabled: boolean
  allowedDays: string[]
  requiresPreApproval: boolean
  minHoursPerDay: number
  maxHoursPerDay: number
  maxHoursPerWeek: number
  maxHoursPerMonth: number
  weekdayRate: number
  weekendRate: number
  holidayRate: number
  nightShiftRate: number
  nightShiftStart: string
  nightShiftEnd: string
  roundingRule: 'none' | '15min' | '30min' | '1hour'
  autoCalculateFromAttendance: boolean
  graceMinutesAfterShift: number
}

// الإعدادات الافتراضية
const defaultLeavePolicy: LeavePolicy = {
  annualLeave: 21,
  sickLeave: 30,
  emergencyLeave: 5,
  unpaidLeaveAllowed: true,
  accrualMethod: 'monthly',
  accrualStartsAfter: 'probation',
  probationPeriod: 3,
  carryOverAllowed: true,
  maxCarryOver: 10,
  carryOverExpiry: 3,
  minLeaveDays: 1,
  maxConsecutiveDays: 15,
  advanceNoticeDays: 7,
  approvalLevels: 1,
}

const defaultOvertimePolicy: OvertimePolicy = {
  enabled: true,
  allowedDays: ['sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday'],
  requiresPreApproval: true,
  minHoursPerDay: 1,
  maxHoursPerDay: 4,
  maxHoursPerWeek: 12,
  maxHoursPerMonth: 40,
  weekdayRate: 1.5,
  weekendRate: 2.0,
  holidayRate: 2.5,
  nightShiftRate: 1.75,
  nightShiftStart: '22:00',
  nightShiftEnd: '06:00',
  roundingRule: '15min',
  autoCalculateFromAttendance: false,
  graceMinutesAfterShift: 15,
}

export default function PoliciesPage() {
  const [leavePolicy, setLeavePolicy] = useState<LeavePolicy>(defaultLeavePolicy)
  const [overtimePolicy, setOvertimePolicy] = useState<OvertimePolicy>(defaultOvertimePolicy)
  const [hasChanges, setHasChanges] = useState(false)
  const [activeTab, setActiveTab] = useState<'leaves' | 'overtime'>('leaves')
  const [expandedSections, setExpandedSections] = useState<string[]>(['basic', 'accrual', 'overtime-basic', 'overtime-rates'])

  // تبديل قسم
  const toggleSection = (section: string) => {
    setExpandedSections(prev =>
      prev.includes(section)
        ? prev.filter(s => s !== section)
        : [...prev, section]
    )
  }

  // تحديث إعدادات الإجازات
  const updateLeavePolicy = (field: keyof LeavePolicy, value: any) => {
    setLeavePolicy(prev => ({ ...prev, [field]: value }))
    setHasChanges(true)
  }

  // تحديث إعدادات الأوفرتايم
  const updateOvertimePolicy = (field: keyof OvertimePolicy, value: any) => {
    setOvertimePolicy(prev => ({ ...prev, [field]: value }))
    setHasChanges(true)
  }

  // تبديل يوم الأوفرتايم
  const toggleOvertimeDay = (day: string) => {
    const newDays = overtimePolicy.allowedDays.includes(day)
      ? overtimePolicy.allowedDays.filter(d => d !== day)
      : [...overtimePolicy.allowedDays, day]
    updateOvertimePolicy('allowedDays', newDays)
  }

  // حفظ التغييرات
  const saveChanges = () => {
    setHasChanges(false)
    alert('تم حفظ السياسات بنجاح!')
  }

  return (
    <MainLayout>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-gray-800">سياسات الإجازات والأوفرتايم</h1>
            <p className="text-gray-500 mt-1">إدارة قواعد الإجازات والعمل الإضافي</p>
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
              حفظ السياسات
            </button>
          </div>
        </div>

        {/* Tabs */}
        <div className="card p-2">
          <div className="flex gap-2">
            <button
              onClick={() => setActiveTab('leaves')}
              className={`flex-1 flex items-center justify-center gap-2 px-4 py-3 rounded-xl font-medium transition-all ${
                activeTab === 'leaves'
                  ? 'bg-primary-500 text-white shadow-lg'
                  : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
              }`}
            >
              <Calendar size={20} />
              سياسات الإجازات
            </button>
            <button
              onClick={() => setActiveTab('overtime')}
              className={`flex-1 flex items-center justify-center gap-2 px-4 py-3 rounded-xl font-medium transition-all ${
                activeTab === 'overtime'
                  ? 'bg-primary-500 text-white shadow-lg'
                  : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
              }`}
            >
              <Clock size={20} />
              سياسات العمل الإضافي
            </button>
          </div>
        </div>

        {/* Leave Policies */}
        {activeTab === 'leaves' && (
          <div className="space-y-4">
            {/* Basic Leave Settings */}
            <div className="card">
              <button
                onClick={() => toggleSection('basic')}
                className="w-full flex items-center justify-between"
              >
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 bg-green-100 rounded-xl flex items-center justify-center">
                    <Calendar size={20} className="text-green-600" />
                  </div>
                  <div className="text-right">
                    <h3 className="font-bold text-gray-800">الاستحقاقات الأساسية</h3>
                    <p className="text-sm text-gray-500">تحديد عدد أيام الإجازات لكل نوع</p>
                  </div>
                </div>
                {expandedSections.includes('basic') ? (
                  <ChevronUp size={20} className="text-gray-400" />
                ) : (
                  <ChevronDown size={20} className="text-gray-400" />
                )}
              </button>

              {expandedSections.includes('basic') && (
                <div className="mt-6 pt-6 border-t border-gray-100">
                  <div className="grid grid-cols-4 gap-6">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        الإجازة السنوية (يوم/سنة)
                      </label>
                      <input
                        type="number"
                        value={leavePolicy.annualLeave}
                        onChange={e => updateLeavePolicy('annualLeave', parseInt(e.target.value))}
                        className="input w-full"
                      />
                      <p className="text-xs text-gray-400 mt-1">الحد الأدنى حسب نظام العمل: 21 يوم</p>
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        الإجازة المرضية (يوم/سنة)
                      </label>
                      <input
                        type="number"
                        value={leavePolicy.sickLeave}
                        onChange={e => updateLeavePolicy('sickLeave', parseInt(e.target.value))}
                        className="input w-full"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        الإجازة الطارئة (يوم/سنة)
                      </label>
                      <input
                        type="number"
                        value={leavePolicy.emergencyLeave}
                        onChange={e => updateLeavePolicy('emergencyLeave', parseInt(e.target.value))}
                        className="input w-full"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        إجازة بدون راتب
                      </label>
                      <select
                        value={leavePolicy.unpaidLeaveAllowed ? 'yes' : 'no'}
                        onChange={e => updateLeavePolicy('unpaidLeaveAllowed', e.target.value === 'yes')}
                        className="input w-full"
                      >
                        <option value="yes">مسموح</option>
                        <option value="no">غير مسموح</option>
                      </select>
                    </div>
                  </div>
                </div>
              )}
            </div>

            {/* Accrual Settings */}
            <div className="card">
              <button
                onClick={() => toggleSection('accrual')}
                className="w-full flex items-center justify-between"
              >
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 bg-blue-100 rounded-xl flex items-center justify-center">
                    <Settings size={20} className="text-blue-600" />
                  </div>
                  <div className="text-right">
                    <h3 className="font-bold text-gray-800">قواعد الاستحقاق</h3>
                    <p className="text-sm text-gray-500">كيفية حساب وتراكم الإجازات</p>
                  </div>
                </div>
                {expandedSections.includes('accrual') ? (
                  <ChevronUp size={20} className="text-gray-400" />
                ) : (
                  <ChevronDown size={20} className="text-gray-400" />
                )}
              </button>

              {expandedSections.includes('accrual') && (
                <div className="mt-6 pt-6 border-t border-gray-100 space-y-6">
                  <div className="grid grid-cols-4 gap-6">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        طريقة الاستحقاق
                      </label>
                      <select
                        value={leavePolicy.accrualMethod}
                        onChange={e => updateLeavePolicy('accrualMethod', e.target.value)}
                        className="input w-full"
                      >
                        <option value="monthly">شهري (X يوم/شهر)</option>
                        <option value="yearly">سنوي (دفعة واحدة)</option>
                        <option value="daily">يومي (تراكمي)</option>
                      </select>
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        بداية الاستحقاق
                      </label>
                      <select
                        value={leavePolicy.accrualStartsAfter}
                        onChange={e => updateLeavePolicy('accrualStartsAfter', e.target.value)}
                        className="input w-full"
                      >
                        <option value="joining">من تاريخ التعيين</option>
                        <option value="probation">بعد فترة التجربة</option>
                        <option value="6months">بعد 6 أشهر</option>
                      </select>
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        فترة التجربة (أشهر)
                      </label>
                      <input
                        type="number"
                        value={leavePolicy.probationPeriod}
                        onChange={e => updateLeavePolicy('probationPeriod', parseInt(e.target.value))}
                        className="input w-full"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        مستويات الموافقة
                      </label>
                      <select
                        value={leavePolicy.approvalLevels}
                        onChange={e => updateLeavePolicy('approvalLevels', parseInt(e.target.value))}
                        className="input w-full"
                      >
                        <option value={1}>مستوى واحد (المدير المباشر)</option>
                        <option value={2}>مستويان (المدير + HR)</option>
                        <option value={3}>ثلاث مستويات</option>
                      </select>
                    </div>
                  </div>

                  {/* Carry Over */}
                  <div className="p-4 bg-gray-50 rounded-xl">
                    <h4 className="font-medium text-gray-800 mb-4">إعدادات الترحيل</h4>
                    <div className="grid grid-cols-3 gap-6">
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">
                          السماح بالترحيل
                        </label>
                        <select
                          value={leavePolicy.carryOverAllowed ? 'yes' : 'no'}
                          onChange={e => updateLeavePolicy('carryOverAllowed', e.target.value === 'yes')}
                          className="input w-full"
                        >
                          <option value="yes">مسموح</option>
                          <option value="no">غير مسموح</option>
                        </select>
                      </div>
                      {leavePolicy.carryOverAllowed && (
                        <>
                          <div>
                            <label className="block text-sm font-medium text-gray-700 mb-2">
                              الحد الأقصى للترحيل (يوم)
                            </label>
                            <input
                              type="number"
                              value={leavePolicy.maxCarryOver}
                              onChange={e => updateLeavePolicy('maxCarryOver', parseInt(e.target.value))}
                              className="input w-full"
                            />
                          </div>
                          <div>
                            <label className="block text-sm font-medium text-gray-700 mb-2">
                              صلاحية الرصيد المرحل (أشهر)
                            </label>
                            <input
                              type="number"
                              value={leavePolicy.carryOverExpiry}
                              onChange={e => updateLeavePolicy('carryOverExpiry', parseInt(e.target.value))}
                              className="input w-full"
                            />
                          </div>
                        </>
                      )}
                    </div>
                  </div>

                  {/* Limits */}
                  <div className="p-4 bg-gray-50 rounded-xl">
                    <h4 className="font-medium text-gray-800 mb-4">حدود الإجازات</h4>
                    <div className="grid grid-cols-3 gap-6">
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">
                          الحد الأدنى للطلب (يوم)
                        </label>
                        <input
                          type="number"
                          value={leavePolicy.minLeaveDays}
                          onChange={e => updateLeavePolicy('minLeaveDays', parseInt(e.target.value))}
                          className="input w-full"
                        />
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">
                          الحد الأقصى المتتالي (يوم)
                        </label>
                        <input
                          type="number"
                          value={leavePolicy.maxConsecutiveDays}
                          onChange={e => updateLeavePolicy('maxConsecutiveDays', parseInt(e.target.value))}
                          className="input w-full"
                        />
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">
                          الإشعار المسبق (يوم)
                        </label>
                        <input
                          type="number"
                          value={leavePolicy.advanceNoticeDays}
                          onChange={e => updateLeavePolicy('advanceNoticeDays', parseInt(e.target.value))}
                          className="input w-full"
                        />
                      </div>
                    </div>
                  </div>
                </div>
              )}
            </div>

            {/* Summary */}
            <div className="card bg-gradient-to-br from-green-50 to-blue-50">
              <div className="flex items-center gap-3 mb-4">
                <Info size={20} className="text-blue-500" />
                <h3 className="font-bold text-gray-800">ملخص سياسة الإجازات</h3>
              </div>
              <div className="grid grid-cols-4 gap-4">
                <div className="p-3 bg-white rounded-xl text-center">
                  <p className="text-2xl font-bold text-green-600">{leavePolicy.annualLeave}</p>
                  <p className="text-sm text-gray-500">يوم سنوية</p>
                </div>
                <div className="p-3 bg-white rounded-xl text-center">
                  <p className="text-2xl font-bold text-blue-600">{leavePolicy.sickLeave}</p>
                  <p className="text-sm text-gray-500">يوم مرضية</p>
                </div>
                <div className="p-3 bg-white rounded-xl text-center">
                  <p className="text-2xl font-bold text-orange-600">{leavePolicy.emergencyLeave}</p>
                  <p className="text-sm text-gray-500">يوم طارئة</p>
                </div>
                <div className="p-3 bg-white rounded-xl text-center">
                  <p className="text-2xl font-bold text-purple-600">{leavePolicy.maxCarryOver}</p>
                  <p className="text-sm text-gray-500">يوم ترحيل</p>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Overtime Policies */}
        {activeTab === 'overtime' && (
          <div className="space-y-4">
            {/* Enable/Disable */}
            <div className="card">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className={`w-10 h-10 ${overtimePolicy.enabled ? 'bg-green-100' : 'bg-gray-100'} rounded-xl flex items-center justify-center`}>
                    <Clock size={20} className={overtimePolicy.enabled ? 'text-green-600' : 'text-gray-400'} />
                  </div>
                  <div>
                    <h3 className="font-bold text-gray-800">تفعيل العمل الإضافي</h3>
                    <p className="text-sm text-gray-500">السماح بتسجيل ساعات العمل الإضافي</p>
                  </div>
                </div>
                <button
                  onClick={() => updateOvertimePolicy('enabled', !overtimePolicy.enabled)}
                  className={`flex items-center gap-2 px-4 py-2 rounded-xl transition-all ${
                    overtimePolicy.enabled
                      ? 'bg-green-100 text-green-600'
                      : 'bg-gray-100 text-gray-500'
                  }`}
                >
                  {overtimePolicy.enabled ? <ToggleRight size={24} /> : <ToggleLeft size={24} />}
                  {overtimePolicy.enabled ? 'مفعّل' : 'معطّل'}
                </button>
              </div>
            </div>

            {overtimePolicy.enabled && (
              <>
                {/* Allowed Days */}
                <div className="card">
                  <button
                    onClick={() => toggleSection('overtime-days')}
                    className="w-full flex items-center justify-between"
                  >
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 bg-blue-100 rounded-xl flex items-center justify-center">
                        <Calendar size={20} className="text-blue-600" />
                      </div>
                      <div className="text-right">
                        <h3 className="font-bold text-gray-800">أيام العمل الإضافي</h3>
                        <p className="text-sm text-gray-500">تحديد الأيام المسموح فيها بالعمل الإضافي</p>
                      </div>
                    </div>
                    {expandedSections.includes('overtime-days') ? (
                      <ChevronUp size={20} className="text-gray-400" />
                    ) : (
                      <ChevronDown size={20} className="text-gray-400" />
                    )}
                  </button>

                  {expandedSections.includes('overtime-days') && (
                    <div className="mt-6 pt-6 border-t border-gray-100">
                      <p className="text-sm text-gray-600 mb-4">اختر الأيام التي يُسمح فيها بالعمل الإضافي:</p>
                      <div className="flex items-center justify-center gap-3">
                        {weekDays.map(day => (
                          <button
                            key={day.key}
                            onClick={() => toggleOvertimeDay(day.key)}
                            className={`w-16 h-20 rounded-2xl flex flex-col items-center justify-center gap-1 transition-all ${
                              overtimePolicy.allowedDays.includes(day.key)
                                ? 'bg-primary-500 text-white shadow-lg shadow-primary-500/30'
                                : 'bg-gray-100 text-gray-400 hover:bg-gray-200'
                            }`}
                          >
                            <span className="text-lg font-bold">{day.shortName}</span>
                            <span className="text-xs">{day.name}</span>
                            <div className={`w-5 h-5 rounded-full flex items-center justify-center ${
                              overtimePolicy.allowedDays.includes(day.key) ? 'bg-white/20' : 'bg-gray-200'
                            }`}>
                              {overtimePolicy.allowedDays.includes(day.key) ? (
                                <CheckCircle size={14} className="text-white" />
                              ) : (
                                <span className="text-gray-400 text-xs">✕</span>
                              )}
                            </div>
                          </button>
                        ))}
                      </div>
                    </div>
                  )}
                </div>

                {/* Basic Settings */}
                <div className="card">
                  <button
                    onClick={() => toggleSection('overtime-basic')}
                    className="w-full flex items-center justify-between"
                  >
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 bg-orange-100 rounded-xl flex items-center justify-center">
                        <Settings size={20} className="text-orange-600" />
                      </div>
                      <div className="text-right">
                        <h3 className="font-bold text-gray-800">الإعدادات الأساسية</h3>
                        <p className="text-sm text-gray-500">الحدود والقواعد العامة</p>
                      </div>
                    </div>
                    {expandedSections.includes('overtime-basic') ? (
                      <ChevronUp size={20} className="text-gray-400" />
                    ) : (
                      <ChevronDown size={20} className="text-gray-400" />
                    )}
                  </button>

                  {expandedSections.includes('overtime-basic') && (
                    <div className="mt-6 pt-6 border-t border-gray-100 space-y-6">
                      <div className="grid grid-cols-4 gap-6">
                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-2">
                            موافقة مسبقة
                          </label>
                          <select
                            value={overtimePolicy.requiresPreApproval ? 'yes' : 'no'}
                            onChange={e => updateOvertimePolicy('requiresPreApproval', e.target.value === 'yes')}
                            className="input w-full"
                          >
                            <option value="yes">مطلوبة</option>
                            <option value="no">غير مطلوبة</option>
                          </select>
                        </div>
                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-2">
                            الحد الأدنى/يوم (ساعة)
                          </label>
                          <input
                            type="number"
                            step="0.5"
                            value={overtimePolicy.minHoursPerDay}
                            onChange={e => updateOvertimePolicy('minHoursPerDay', parseFloat(e.target.value))}
                            className="input w-full"
                          />
                        </div>
                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-2">
                            الحد الأقصى/يوم (ساعة)
                          </label>
                          <input
                            type="number"
                            step="0.5"
                            value={overtimePolicy.maxHoursPerDay}
                            onChange={e => updateOvertimePolicy('maxHoursPerDay', parseFloat(e.target.value))}
                            className="input w-full"
                          />
                        </div>
                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-2">
                            تقريب الوقت
                          </label>
                          <select
                            value={overtimePolicy.roundingRule}
                            onChange={e => updateOvertimePolicy('roundingRule', e.target.value)}
                            className="input w-full"
                          >
                            <option value="none">بدون تقريب</option>
                            <option value="15min">15 دقيقة</option>
                            <option value="30min">30 دقيقة</option>
                            <option value="1hour">ساعة كاملة</option>
                          </select>
                        </div>
                      </div>

                      <div className="grid grid-cols-3 gap-6">
                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-2">
                            الحد الأقصى/أسبوع (ساعة)
                          </label>
                          <input
                            type="number"
                            value={overtimePolicy.maxHoursPerWeek}
                            onChange={e => updateOvertimePolicy('maxHoursPerWeek', parseInt(e.target.value))}
                            className="input w-full"
                          />
                        </div>
                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-2">
                            الحد الأقصى/شهر (ساعة)
                          </label>
                          <input
                            type="number"
                            value={overtimePolicy.maxHoursPerMonth}
                            onChange={e => updateOvertimePolicy('maxHoursPerMonth', parseInt(e.target.value))}
                            className="input w-full"
                          />
                        </div>
                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-2">
                            فترة السماح بعد الدوام (دقيقة)
                          </label>
                          <input
                            type="number"
                            value={overtimePolicy.graceMinutesAfterShift}
                            onChange={e => updateOvertimePolicy('graceMinutesAfterShift', parseInt(e.target.value))}
                            className="input w-full"
                          />
                          <p className="text-xs text-gray-400 mt-1">لا يُحسب إضافي قبل انتهاء هذه الفترة</p>
                        </div>
                      </div>

                      <div className="p-4 bg-blue-50 rounded-xl flex items-start gap-3">
                        <input
                          type="checkbox"
                          checked={overtimePolicy.autoCalculateFromAttendance}
                          onChange={e => updateOvertimePolicy('autoCalculateFromAttendance', e.target.checked)}
                          className="mt-1"
                        />
                        <div>
                          <p className="font-medium text-blue-800">حساب تلقائي من الحضور</p>
                          <p className="text-sm text-blue-600">حساب الساعات الإضافية تلقائياً بناءً على سجلات الحضور والانصراف</p>
                        </div>
                      </div>
                    </div>
                  )}
                </div>

                {/* Rates */}
                <div className="card">
                  <button
                    onClick={() => toggleSection('overtime-rates')}
                    className="w-full flex items-center justify-between"
                  >
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 bg-green-100 rounded-xl flex items-center justify-center">
                        <Coffee size={20} className="text-green-600" />
                      </div>
                      <div className="text-right">
                        <h3 className="font-bold text-gray-800">معاملات الأجر</h3>
                        <p className="text-sm text-gray-500">نسب مضاعفة أجر الساعة</p>
                      </div>
                    </div>
                    {expandedSections.includes('overtime-rates') ? (
                      <ChevronUp size={20} className="text-gray-400" />
                    ) : (
                      <ChevronDown size={20} className="text-gray-400" />
                    )}
                  </button>

                  {expandedSections.includes('overtime-rates') && (
                    <div className="mt-6 pt-6 border-t border-gray-100">
                      <div className="grid grid-cols-4 gap-6">
                        <div className="p-4 bg-blue-50 rounded-xl">
                          <div className="flex items-center gap-2 mb-3">
                            <Sun size={18} className="text-blue-600" />
                            <span className="font-medium text-gray-800">أيام العمل</span>
                          </div>
                          <div className="flex items-center gap-2">
                            <input
                              type="number"
                              step="0.25"
                              value={overtimePolicy.weekdayRate}
                              onChange={e => updateOvertimePolicy('weekdayRate', parseFloat(e.target.value))}
                              className="input w-20"
                            />
                            <span className="text-2xl font-bold text-blue-600">×</span>
                          </div>
                          <p className="text-xs text-gray-500 mt-2">مثال: {overtimePolicy.weekdayRate}× = {overtimePolicy.weekdayRate * 100}%</p>
                        </div>

                        <div className="p-4 bg-orange-50 rounded-xl">
                          <div className="flex items-center gap-2 mb-3">
                            <Coffee size={18} className="text-orange-600" />
                            <span className="font-medium text-gray-800">نهاية الأسبوع</span>
                          </div>
                          <div className="flex items-center gap-2">
                            <input
                              type="number"
                              step="0.25"
                              value={overtimePolicy.weekendRate}
                              onChange={e => updateOvertimePolicy('weekendRate', parseFloat(e.target.value))}
                              className="input w-20"
                            />
                            <span className="text-2xl font-bold text-orange-600">×</span>
                          </div>
                          <p className="text-xs text-gray-500 mt-2">مثال: {overtimePolicy.weekendRate}× = {overtimePolicy.weekendRate * 100}%</p>
                        </div>

                        <div className="p-4 bg-red-50 rounded-xl">
                          <div className="flex items-center gap-2 mb-3">
                            <Calendar size={18} className="text-red-600" />
                            <span className="font-medium text-gray-800">العطل الرسمية</span>
                          </div>
                          <div className="flex items-center gap-2">
                            <input
                              type="number"
                              step="0.25"
                              value={overtimePolicy.holidayRate}
                              onChange={e => updateOvertimePolicy('holidayRate', parseFloat(e.target.value))}
                              className="input w-20"
                            />
                            <span className="text-2xl font-bold text-red-600">×</span>
                          </div>
                          <p className="text-xs text-gray-500 mt-2">مثال: {overtimePolicy.holidayRate}× = {overtimePolicy.holidayRate * 100}%</p>
                        </div>

                        <div className="p-4 bg-purple-50 rounded-xl">
                          <div className="flex items-center gap-2 mb-3">
                            <Moon size={18} className="text-purple-600" />
                            <span className="font-medium text-gray-800">الوردية الليلية</span>
                          </div>
                          <div className="flex items-center gap-2">
                            <input
                              type="number"
                              step="0.25"
                              value={overtimePolicy.nightShiftRate}
                              onChange={e => updateOvertimePolicy('nightShiftRate', parseFloat(e.target.value))}
                              className="input w-20"
                            />
                            <span className="text-2xl font-bold text-purple-600">×</span>
                          </div>
                          <p className="text-xs text-gray-500 mt-2">{overtimePolicy.nightShiftStart} - {overtimePolicy.nightShiftEnd}</p>
                        </div>
                      </div>

                      {/* Night Shift Time */}
                      <div className="mt-6 p-4 bg-gray-50 rounded-xl">
                        <h4 className="font-medium text-gray-800 mb-4">تحديد وقت الوردية الليلية</h4>
                        <div className="grid grid-cols-2 gap-6">
                          <div>
                            <label className="block text-sm font-medium text-gray-700 mb-2">
                              بداية الليل
                            </label>
                            <input
                              type="time"
                              value={overtimePolicy.nightShiftStart}
                              onChange={e => updateOvertimePolicy('nightShiftStart', e.target.value)}
                              className="input w-full"
                            />
                          </div>
                          <div>
                            <label className="block text-sm font-medium text-gray-700 mb-2">
                              نهاية الليل
                            </label>
                            <input
                              type="time"
                              value={overtimePolicy.nightShiftEnd}
                              onChange={e => updateOvertimePolicy('nightShiftEnd', e.target.value)}
                              className="input w-full"
                            />
                          </div>
                        </div>
                      </div>
                    </div>
                  )}
                </div>

                {/* Summary */}
                <div className="card bg-gradient-to-br from-orange-50 to-yellow-50">
                  <div className="flex items-center gap-3 mb-4">
                    <Info size={20} className="text-orange-500" />
                    <h3 className="font-bold text-gray-800">ملخص سياسة العمل الإضافي</h3>
                  </div>
                  <div className="grid grid-cols-5 gap-4">
                    <div className="p-3 bg-white rounded-xl text-center">
                      <p className="text-2xl font-bold text-blue-600">{overtimePolicy.maxHoursPerDay}</p>
                      <p className="text-sm text-gray-500">ساعة/يوم</p>
                    </div>
                    <div className="p-3 bg-white rounded-xl text-center">
                      <p className="text-2xl font-bold text-green-600">{overtimePolicy.maxHoursPerWeek}</p>
                      <p className="text-sm text-gray-500">ساعة/أسبوع</p>
                    </div>
                    <div className="p-3 bg-white rounded-xl text-center">
                      <p className="text-2xl font-bold text-orange-600">{overtimePolicy.maxHoursPerMonth}</p>
                      <p className="text-sm text-gray-500">ساعة/شهر</p>
                    </div>
                    <div className="p-3 bg-white rounded-xl text-center">
                      <p className="text-2xl font-bold text-purple-600">{overtimePolicy.weekdayRate}×</p>
                      <p className="text-sm text-gray-500">أيام عادية</p>
                    </div>
                    <div className="p-3 bg-white rounded-xl text-center">
                      <p className="text-2xl font-bold text-red-600">{overtimePolicy.holidayRate}×</p>
                      <p className="text-sm text-gray-500">العطلات</p>
                    </div>
                  </div>
                </div>
              </>
            )}
          </div>
        )}
      </div>
    </MainLayout>
  )
}
