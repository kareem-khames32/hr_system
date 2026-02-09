'use client'

import { useState } from 'react'
import { MainLayout } from '@/components/layout'
import {
  User,
  Briefcase,
  Wallet,
  GraduationCap,
  FileText,
  Users,
  ChevronLeft,
  ChevronRight,
  Save,
  X,
  Upload,
  Calendar,
  Phone,
  Mail,
  MapPin,
  Building2,
  Clock,
  Sun,
  Moon,
  Coffee,
} from 'lucide-react'
import Link from 'next/link'

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

// جداول العمل المتاحة (يتم جلبها من الإعدادات)
const workSchedules: Array<{
  id: string
  name: string
  description: string
  color: string
  isDefault: boolean
  workDays: { [key: string]: boolean }
  workHours: { start: string; end: string }
  employeeCount: number
  rulesCount: number
}> = [
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
    },
    employeeCount: 45,
    rulesCount: 1,
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
    },
    employeeCount: 23,
    rulesCount: 0,
  },
]

// الألوان المتاحة للجداول
const scheduleColors: { [key: string]: string } = {
  blue: 'bg-blue-500',
  green: 'bg-green-500',
  purple: 'bg-purple-500',
  orange: 'bg-orange-500',
  pink: 'bg-pink-500',
  teal: 'bg-teal-500',
  indigo: 'bg-indigo-500',
  red: 'bg-red-500',
}

const steps = [
  { id: 1, title: 'البيانات الشخصية', icon: User },
  { id: 2, title: 'البيانات الوظيفية', icon: Briefcase },
  { id: 3, title: 'البيانات المالية', icon: Wallet },
  { id: 4, title: 'المؤهلات والخبرات', icon: GraduationCap },
  { id: 5, title: 'المستندات', icon: FileText },
]

export default function AddEmployeePage() {
  const [currentStep, setCurrentStep] = useState(1)
  const [leaveEntitled, setLeaveEntitled] = useState(true)
  const [selectedSchedule, setSelectedSchedule] = useState('')

  const nextStep = () => {
    if (currentStep < steps.length) {
      setCurrentStep(currentStep + 1)
    }
  }

  const prevStep = () => {
    if (currentStep > 1) {
      setCurrentStep(currentStep - 1)
    }
  }

  return (
    <MainLayout>
      <div className="space-y-6">
        {/* Page Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-gray-800">إضافة موظف جديد</h1>
            <p className="text-gray-500 mt-1">إدخال بيانات الموظف الجديد في النظام</p>
          </div>
          <Link href="/employees" className="btn-secondary flex items-center gap-2">
            <X size={18} />
            إلغاء
          </Link>
        </div>

        {/* Progress Steps */}
        <div className="card">
          <div className="flex items-center justify-between">
            {steps.map((step, index) => (
              <div key={step.id} className="flex items-center">
                <div className="flex flex-col items-center">
                  <div
                    className={`w-12 h-12 rounded-2xl flex items-center justify-center transition-all ${
                      currentStep === step.id
                        ? 'bg-primary-500 text-white shadow-lg shadow-primary-500/30'
                        : currentStep > step.id
                        ? 'bg-success-500 text-white'
                        : 'bg-gray-100 text-gray-400'
                    }`}
                  >
                    <step.icon size={22} />
                  </div>
                  <span
                    className={`mt-2 text-sm font-medium ${
                      currentStep === step.id
                        ? 'text-primary-600'
                        : currentStep > step.id
                        ? 'text-success-600'
                        : 'text-gray-400'
                    }`}
                  >
                    {step.title}
                  </span>
                </div>
                {index < steps.length - 1 && (
                  <div
                    className={`w-24 h-1 mx-4 rounded-full transition-all ${
                      currentStep > step.id ? 'bg-success-500' : 'bg-gray-200'
                    }`}
                  />
                )}
              </div>
            ))}
          </div>
        </div>

        {/* Form Content */}
        <div className="card">
          {/* Step 1: Personal Information */}
          {currentStep === 1 && (
            <div className="space-y-8">
              <h2 className="text-lg font-bold text-gray-800 border-b border-gray-100 pb-4">
                البيانات الشخصية
              </h2>

              {/* Photo Upload */}
              <div className="flex items-start gap-6">
                <div className="flex flex-col items-center gap-3">
                  <div className="w-32 h-32 bg-gray-100 rounded-2xl flex items-center justify-center border-2 border-dashed border-gray-200">
                    <User size={40} className="text-gray-300" />
                  </div>
                  <button className="btn-secondary text-sm py-2 px-4 flex items-center gap-2">
                    <Upload size={16} />
                    رفع صورة
                  </button>
                </div>

                <div className="flex-1 grid grid-cols-2 gap-4">
                  {/* Name Fields - Arabic */}
                  <div>
                    <label className="label">الاسم الأول (عربي) *</label>
                    <input type="text" className="input" placeholder="أحمد" />
                  </div>
                  <div>
                    <label className="label">اسم الأب (عربي) *</label>
                    <input type="text" className="input" placeholder="محمد" />
                  </div>
                  <div>
                    <label className="label">اسم الجد (عربي)</label>
                    <input type="text" className="input" placeholder="علي" />
                  </div>
                  <div>
                    <label className="label">اسم العائلة (عربي) *</label>
                    <input type="text" className="input" placeholder="السعيد" />
                  </div>
                </div>
              </div>

              {/* Name Fields - English */}
              <div className="grid grid-cols-4 gap-4">
                <div>
                  <label className="label">First Name *</label>
                  <input type="text" className="input" placeholder="Ahmed" dir="ltr" />
                </div>
                <div>
                  <label className="label">Middle Name</label>
                  <input type="text" className="input" placeholder="Mohammed" dir="ltr" />
                </div>
                <div>
                  <label className="label">Last Name *</label>
                  <input type="text" className="input" placeholder="Alsaeed" dir="ltr" />
                </div>
                <div>
                  <label className="label">الاسم الكامل (تلقائي)</label>
                  <input
                    type="text"
                    className="input bg-gray-50"
                    value="أحمد محمد علي السعيد"
                    disabled
                  />
                </div>
              </div>

              {/* Basic Info */}
              <div className="grid grid-cols-4 gap-4">
                <div>
                  <label className="label">تاريخ الميلاد *</label>
                  <div className="relative">
                    <input type="date" className="input pl-10" />
                    <Calendar size={18} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                  </div>
                </div>
                <div>
                  <label className="label">مكان الميلاد</label>
                  <input type="text" className="input" placeholder="الرياض" />
                </div>
                <div>
                  <label className="label">الجنس *</label>
                  <select className="input">
                    <option value="">اختر</option>
                    <option value="male">ذكر</option>
                    <option value="female">أنثى</option>
                  </select>
                </div>
                <div>
                  <label className="label">الحالة الاجتماعية *</label>
                  <select className="input">
                    <option value="">اختر</option>
                    <option value="single">أعزب</option>
                    <option value="married">متزوج</option>
                    <option value="divorced">مطلق</option>
                    <option value="widowed">أرمل</option>
                  </select>
                </div>
              </div>

              {/* Identity Documents */}
              <div className="grid grid-cols-4 gap-4">
                <div>
                  <label className="label">الجنسية *</label>
                  <select className="input">
                    <option value="">اختر</option>
                    <option value="SA">سعودي</option>
                    <option value="EG">مصري</option>
                    <option value="JO">أردني</option>
                    <option value="SY">سوري</option>
                    <option value="other">أخرى</option>
                  </select>
                </div>
                <div>
                  <label className="label">رقم الهوية / الإقامة *</label>
                  <input type="text" className="input" placeholder="1234567890" dir="ltr" />
                </div>
                <div>
                  <label className="label">رقم جواز السفر</label>
                  <input type="text" className="input" placeholder="A12345678" dir="ltr" />
                </div>
                <div>
                  <label className="label">تاريخ انتهاء الجواز</label>
                  <input type="date" className="input" />
                </div>
              </div>

              {/* Contact Info */}
              <h3 className="text-md font-bold text-gray-700 mt-8 border-b border-gray-100 pb-2">
                معلومات الاتصال
              </h3>
              <div className="grid grid-cols-3 gap-4">
                <div>
                  <label className="label">رقم الجوال *</label>
                  <div className="relative">
                    <input type="tel" className="input pl-10" placeholder="+966 50 123 4567" dir="ltr" />
                    <Phone size={18} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                  </div>
                </div>
                <div>
                  <label className="label">رقم جوال بديل</label>
                  <input type="tel" className="input" placeholder="+966 55 123 4567" dir="ltr" />
                </div>
                <div>
                  <label className="label">البريد الإلكتروني الشخصي</label>
                  <div className="relative">
                    <input type="email" className="input pl-10" placeholder="email@example.com" dir="ltr" />
                    <Mail size={18} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                  </div>
                </div>
              </div>

              {/* Address */}
              <h3 className="text-md font-bold text-gray-700 mt-8 border-b border-gray-100 pb-2">
                العنوان
              </h3>
              <div className="grid grid-cols-4 gap-4">
                <div>
                  <label className="label">البلد</label>
                  <select className="input">
                    <option value="SA">السعودية</option>
                    <option value="AE">الإمارات</option>
                    <option value="EG">مصر</option>
                  </select>
                </div>
                <div>
                  <label className="label">المدينة</label>
                  <input type="text" className="input" placeholder="الرياض" />
                </div>
                <div>
                  <label className="label">الحي</label>
                  <input type="text" className="input" placeholder="العليا" />
                </div>
                <div>
                  <label className="label">الرمز البريدي</label>
                  <input type="text" className="input" placeholder="12345" dir="ltr" />
                </div>
              </div>

              {/* Emergency Contact */}
              <h3 className="text-md font-bold text-gray-700 mt-8 border-b border-gray-100 pb-2">
                جهة اتصال للطوارئ
              </h3>
              <div className="grid grid-cols-4 gap-4">
                <div>
                  <label className="label">الاسم</label>
                  <input type="text" className="input" placeholder="اسم جهة الاتصال" />
                </div>
                <div>
                  <label className="label">صلة القرابة</label>
                  <select className="input">
                    <option value="">اختر</option>
                    <option value="spouse">زوج/زوجة</option>
                    <option value="parent">أب/أم</option>
                    <option value="sibling">أخ/أخت</option>
                    <option value="child">ابن/ابنة</option>
                    <option value="other">أخرى</option>
                  </select>
                </div>
                <div>
                  <label className="label">رقم الجوال</label>
                  <input type="tel" className="input" placeholder="+966 50 123 4567" dir="ltr" />
                </div>
                <div>
                  <label className="label">رقم بديل</label>
                  <input type="tel" className="input" placeholder="+966 50 123 4567" dir="ltr" />
                </div>
              </div>
            </div>
          )}

          {/* Step 2: Employment Information */}
          {currentStep === 2 && (
            <div className="space-y-8">
              <h2 className="text-lg font-bold text-gray-800 border-b border-gray-100 pb-4">
                البيانات الوظيفية
              </h2>

              {/* Employee ID */}
              <div className="grid grid-cols-4 gap-4">
                <div>
                  <label className="label">الرقم الوظيفي *</label>
                  <input type="text" className="input" placeholder="EMP001" dir="ltr" />
                  <p className="text-xs text-gray-400 mt-1">اتركه فارغاً للإنشاء التلقائي</p>
                </div>
                <div>
                  <label className="label">رقم البصمة</label>
                  <input type="text" className="input" placeholder="001" dir="ltr" />
                </div>
                <div>
                  <label className="label">تاريخ التعيين *</label>
                  <input type="date" className="input" />
                </div>
                <div>
                  <label className="label">تاريخ بداية العمل الفعلي</label>
                  <input type="date" className="input" />
                </div>
              </div>

              {/* Employment Type */}
              <div className="grid grid-cols-4 gap-4">
                <div>
                  <label className="label">نوع التوظيف *</label>
                  <select className="input">
                    <option value="">اختر</option>
                    <option value="fulltime">دوام كامل</option>
                    <option value="parttime">دوام جزئي</option>
                    <option value="contract">عقد مؤقت</option>
                    <option value="consultant">استشاري</option>
                    <option value="intern">متدرب</option>
                  </select>
                </div>
                <div>
                  <label className="label">حالة الموظف *</label>
                  <select className="input">
                    <option value="probation">فترة تجربة</option>
                    <option value="active">نشط</option>
                  </select>
                </div>
                <div>
                  <label className="label">تاريخ انتهاء فترة التجربة</label>
                  <input type="date" className="input" />
                </div>
                <div>
                  <label className="label">مصدر التوظيف</label>
                  <select className="input">
                    <option value="">اختر</option>
                    <option value="jobsite">موقع توظيف</option>
                    <option value="referral">ترشيح موظف</option>
                    <option value="agency">وكالة توظيف</option>
                    <option value="linkedin">LinkedIn</option>
                    <option value="other">أخرى</option>
                  </select>
                </div>
              </div>

              {/* Organization Position */}
              <h3 className="text-md font-bold text-gray-700 mt-8 border-b border-gray-100 pb-2">
                الموقع التنظيمي
              </h3>
              <div className="grid grid-cols-3 gap-4">
                <div>
                  <label className="label">الشركة *</label>
                  <select className="input">
                    <option value="main">الشركة الرئيسية</option>
                  </select>
                </div>
                <div>
                  <label className="label">الفرع *</label>
                  <select className="input">
                    <option value="">اختر</option>
                    <option value="riyadh">الرياض</option>
                    <option value="jeddah">جدة</option>
                    <option value="dammam">الدمام</option>
                  </select>
                </div>
                <div>
                  <label className="label">الإدارة/القسم *</label>
                  <select className="input">
                    <option value="">اختر</option>
                    <option value="it">تقنية المعلومات</option>
                    <option value="hr">الموارد البشرية</option>
                    <option value="finance">المالية</option>
                    <option value="sales">المبيعات</option>
                    <option value="marketing">التسويق</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-3 gap-4">
                <div>
                  <label className="label">الفريق</label>
                  <select className="input">
                    <option value="">بدون فريق (تابع للقسم مباشرة)</option>
                    <option value="it-dev">فريق التطوير</option>
                    <option value="it-sup">فريق الدعم الفني</option>
                    <option value="hr-rec">فريق التوظيف</option>
                    <option value="hr-emp">فريق شؤون الموظفين</option>
                  </select>
                  <p className="text-xs text-gray-400 mt-1">مدير الفريق سيكون المدير المباشر</p>
                </div>
                <div>
                  <label className="label">المسمى الوظيفي *</label>
                  <select className="input">
                    <option value="">اختر</option>
                    <option value="developer">مطور برمجيات</option>
                    <option value="analyst">محلل نظم</option>
                    <option value="manager">مدير</option>
                    <option value="specialist">أخصائي</option>
                  </select>
                </div>
                <div>
                  <label className="label">الدرجة الوظيفية</label>
                  <select className="input">
                    <option value="">اختر</option>
                    <option value="1">Grade 1</option>
                    <option value="2">Grade 2</option>
                    <option value="3">Grade 3</option>
                    <option value="4">Grade 4</option>
                    <option value="5">Grade 5</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-3 gap-4">
                <div>
                  <label className="label">المدير المباشر</label>
                  <select className="input">
                    <option value="">اختر (أو يتحدد من الفريق)</option>
                    <option value="team-leader">خالد عبدالله الشمري - قائد فريق التطوير</option>
                    <option value="dept-manager">أحمد محمد - مدير تقنية المعلومات</option>
                  </select>
                  <p className="text-xs text-gray-400 mt-1">يتحدد تلقائياً عند اختيار الفريق</p>
                </div>
                <div>
                  <label className="label">موقع العمل</label>
                  <input type="text" className="input" placeholder="المكتب الرئيسي" />
                </div>
                <div>
                  <label className="label">مركز التكلفة</label>
                  <select className="input">
                    <option value="">اختر</option>
                    <option value="cc001">CC001 - تقنية المعلومات</option>
                  </select>
                </div>
              </div>

              {/* Contract Info */}
              <h3 className="text-md font-bold text-gray-700 mt-8 border-b border-gray-100 pb-2">
                معلومات العقد
              </h3>
              <div className="grid grid-cols-4 gap-4">
                <div>
                  <label className="label">نوع العقد *</label>
                  <select className="input">
                    <option value="">اختر</option>
                    <option value="unlimited">غير محدد المدة</option>
                    <option value="limited">محدد المدة</option>
                    <option value="seasonal">موسمي</option>
                  </select>
                </div>
                <div>
                  <label className="label">رقم العقد</label>
                  <input type="text" className="input" placeholder="C-2026-001" dir="ltr" />
                </div>
                <div>
                  <label className="label">تاريخ بداية العقد *</label>
                  <input type="date" className="input" />
                </div>
                <div>
                  <label className="label">تاريخ نهاية العقد</label>
                  <input type="date" className="input" />
                </div>
              </div>

              <div className="grid grid-cols-4 gap-4">
                <div>
                  <label className="label">مدة العقد (أشهر)</label>
                  <input type="number" className="input" placeholder="24" />
                </div>
                <div>
                  <label className="label">فترة الإشعار (أيام)</label>
                  <input type="number" className="input" placeholder="30" />
                </div>
                <div className="col-span-2">
                  <label className="label">مرفق العقد</label>
                  <div className="flex items-center gap-2">
                    <input type="file" className="input flex-1" accept=".pdf" />
                  </div>
                </div>
              </div>

              {/* Work Schedule */}
              <h3 className="text-md font-bold text-gray-700 mt-8 border-b border-gray-100 pb-2 flex items-center gap-2">
                <Clock size={18} className="text-primary-500" />
                جدول العمل
              </h3>
              <p className="text-sm text-gray-500 mb-4">اختر جدول العمل الذي سيتبعه الموظف (يمكن إنشاء جداول جديدة من الإعدادات)</p>

              <div className="grid grid-cols-2 gap-4">
                {workSchedules.map((schedule) => {
                  const isSelected = selectedSchedule === schedule.id
                  const colorClass = scheduleColors[schedule.color] || 'bg-blue-500'
                  const workDaysCount = Object.values(schedule.workDays).filter(Boolean).length

                  return (
                    <div
                      key={schedule.id}
                      onClick={() => setSelectedSchedule(schedule.id)}
                      className={`p-4 rounded-xl border-2 cursor-pointer transition-all ${
                        isSelected
                          ? 'border-primary-500 bg-primary-50 shadow-lg shadow-primary-500/20'
                          : 'border-gray-200 hover:border-gray-300 hover:bg-gray-50'
                      }`}
                    >
                      <div className="flex items-start gap-3 mb-4">
                        <div className={`w-10 h-10 ${colorClass} rounded-xl flex items-center justify-center flex-shrink-0`}>
                          <Calendar size={20} className="text-white" />
                        </div>
                        <div className="flex-1">
                          <div className="flex items-center gap-2">
                            <p className={`font-bold ${isSelected ? 'text-primary-700' : 'text-gray-800'}`}>
                              {schedule.name}
                            </p>
                            {schedule.isDefault && (
                              <span className="px-2 py-0.5 bg-primary-100 text-primary-600 rounded-full text-xs font-medium">
                                افتراضي
                              </span>
                            )}
                          </div>
                          <p className="text-sm text-gray-500 mt-1">{schedule.description}</p>
                        </div>
                      </div>

                      <div className="space-y-3 text-sm">
                        <div className="flex items-center justify-between">
                          <span className="text-gray-500 flex items-center gap-1">
                            <Clock size={14} />
                            ساعات العمل:
                          </span>
                          <span className={`font-medium ${isSelected ? 'text-primary-700' : 'text-gray-700'}`}>
                            {schedule.workHours.start} - {schedule.workHours.end}
                          </span>
                        </div>
                        <div className="flex items-center justify-between">
                          <span className="text-gray-500">أيام العمل:</span>
                          <span className={`font-medium ${isSelected ? 'text-primary-700' : 'text-gray-700'}`}>
                            {workDaysCount} أيام في الأسبوع
                          </span>
                        </div>
                        <div className="flex items-center justify-between">
                          <span className="text-gray-500">عدد الموظفين:</span>
                          <span className={`font-medium ${isSelected ? 'text-primary-700' : 'text-gray-700'}`}>
                            {schedule.employeeCount} موظف
                          </span>
                        </div>
                      </div>

                      {/* أيام العمل */}
                      <div className="flex gap-1 mt-4 pt-3 border-t border-gray-100">
                        {weekDays.map(day => (
                          <div
                            key={day.key}
                            className={`w-8 h-8 rounded-lg flex items-center justify-center text-xs font-bold ${
                              schedule.workDays[day.key]
                                ? `${colorClass} text-white`
                                : 'bg-gray-100 text-gray-400'
                            }`}
                          >
                            {day.shortName}
                          </div>
                        ))}
                      </div>

                      {schedule.rulesCount > 0 && (
                        <div className="mt-3 text-xs text-gray-500">
                          <span className="px-2 py-1 bg-warning-100 text-warning-700 rounded">
                            {schedule.rulesCount} قاعدة استثنائية
                          </span>
                        </div>
                      )}
                    </div>
                  )
                })}
              </div>

              {selectedSchedule && (
                <div className="mt-4 p-4 bg-blue-50 rounded-xl flex items-start gap-3">
                  <Clock size={20} className="text-blue-500 mt-0.5" />
                  <div>
                    <p className="font-medium text-blue-800">
                      تم اختيار: {workSchedules.find(s => s.id === selectedSchedule)?.name}
                    </p>
                    <p className="text-sm text-blue-700 mt-1">
                      يمكن تغيير جدول العمل لاحقاً من صفحة الإعدادات أو من ملف الموظف
                    </p>
                  </div>
                </div>
              )}

              {/* Link to settings */}
              <div className="mt-4 p-4 bg-gray-50 rounded-xl flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <Building2 size={20} className="text-gray-400" />
                  <p className="text-sm text-gray-600">
                    لإنشاء جداول عمل جديدة أو تعديل الجداول الحالية
                  </p>
                </div>
                <a href="/settings/work-days" className="text-sm text-primary-600 hover:text-primary-700 font-medium">
                  الذهاب للإعدادات ←
                </a>
              </div>

              {/* Leave Entitlements */}
              <h3 className="text-md font-bold text-gray-700 mt-8 border-b border-gray-100 pb-2">
                استحقاقات الإجازات
              </h3>

              {/* Toggle for leave entitlement */}
              <div className={`p-4 rounded-xl flex items-center justify-between ${leaveEntitled ? 'bg-green-50' : 'bg-gray-50'}`}>
                <div className="flex items-center gap-3">
                  <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${leaveEntitled ? 'bg-green-100' : 'bg-gray-200'}`}>
                    <Calendar size={20} className={leaveEntitled ? 'text-green-600' : 'text-gray-400'} />
                  </div>
                  <div>
                    <p className="font-medium text-gray-800">يستحق إجازات سنوية</p>
                    <p className="text-sm text-gray-500">
                      {leaveEntitled ? 'الموظف يستحق إجازات سنوية' : 'الموظف لا يستحق إجازات سنوية'}
                    </p>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => setLeaveEntitled(!leaveEntitled)}
                  className={`px-4 py-2 rounded-xl font-medium transition-all ${
                    leaveEntitled
                      ? 'bg-green-500 text-white'
                      : 'bg-gray-200 text-gray-600'
                  }`}
                >
                  {leaveEntitled ? 'يستحق ✓' : 'لا يستحق'}
                </button>
              </div>

              {/* Leave fields - shown only if entitled */}
              {leaveEntitled && (
              <div className="space-y-4 mt-4">
                <div className="grid grid-cols-4 gap-4">
                  <div>
                    <label className="label">الإجازة السنوية (يوم/سنة) *</label>
                    <input type="number" className="input" placeholder="21" defaultValue="21" min="0" />
                    <p className="text-xs text-gray-400 mt-1">حسب نظام العمل السعودي</p>
                  </div>
                  <div>
                    <label className="label">طريقة الاستحقاق *</label>
                    <select className="input">
                      <option value="monthly">شهري (X يوم/شهر)</option>
                      <option value="yearly">سنوي (دفعة واحدة)</option>
                      <option value="daily">يومي (تراكمي)</option>
                    </select>
                  </div>
                  <div>
                    <label className="label">بداية الاستحقاق *</label>
                    <select className="input">
                      <option value="after_probation">بعد فترة التجربة</option>
                      <option value="from_joining">من تاريخ التعيين</option>
                      <option value="after_6months">بعد 6 أشهر</option>
                    </select>
                  </div>
                  <div>
                    <label className="label">فترة التجربة (أشهر)</label>
                    <input type="number" className="input" placeholder="3" defaultValue="3" />
                  </div>
                </div>

              <div className="grid grid-cols-4 gap-4 mt-4">
                <div>
                  <label className="label">الإجازة المرضية (يوم/سنة)</label>
                  <input type="number" className="input" placeholder="30" defaultValue="30" />
                </div>
                <div>
                  <label className="label">الإجازة الطارئة (يوم/سنة)</label>
                  <input type="number" className="input" placeholder="5" defaultValue="5" />
                </div>
                <div>
                  <label className="label">السماح بالترحيل</label>
                  <select className="input">
                    <option value="yes">نعم</option>
                    <option value="no">لا</option>
                    <option value="limited">محدود</option>
                  </select>
                </div>
                <div>
                  <label className="label">الحد الأقصى للترحيل (يوم)</label>
                  <input type="number" className="input" placeholder="10" defaultValue="10" />
                </div>
              </div>

              <div className="p-4 bg-blue-50 rounded-xl mt-4">
                <div className="flex items-start gap-3">
                  <Calendar size={20} className="text-blue-500 mt-0.5" />
                  <div>
                    <p className="font-medium text-blue-800">ملخص الاستحقاقات السنوية</p>
                    <div className="grid grid-cols-3 gap-4 mt-2 text-sm text-blue-700">
                      <div>إجازة سنوية: <strong>21 يوم</strong></div>
                      <div>إجازة مرضية: <strong>30 يوم</strong></div>
                      <div>إجازة طارئة: <strong>5 أيام</strong></div>
                    </div>
                  </div>
                </div>
              </div>
              </div>
              )}

              {/* Work Email */}
              <h3 className="text-md font-bold text-gray-700 mt-8 border-b border-gray-100 pb-2">
                البريد الإلكتروني للعمل
              </h3>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="label">البريد الإلكتروني للعمل</label>
                  <input type="email" className="input" placeholder="ahmed.m@company.com" dir="ltr" />
                  <p className="text-xs text-gray-400 mt-1">اتركه فارغاً للإنشاء التلقائي</p>
                </div>
              </div>
            </div>
          )}

          {/* Step 3: Financial Information */}
          {currentStep === 3 && (
            <div className="space-y-8">
              <h2 className="text-lg font-bold text-gray-800 border-b border-gray-100 pb-4">
                البيانات المالية
              </h2>

              {/* Salary */}
              <div className="grid grid-cols-4 gap-4">
                <div>
                  <label className="label">الراتب الأساسي *</label>
                  <input type="number" className="input" placeholder="10000" dir="ltr" />
                </div>
                <div>
                  <label className="label">العملة *</label>
                  <select className="input">
                    <option value="SAR">ريال سعودي (SAR)</option>
                    <option value="AED">درهم إماراتي (AED)</option>
                    <option value="EGP">جنيه مصري (EGP)</option>
                  </select>
                </div>
                <div>
                  <label className="label">طريقة الدفع *</label>
                  <select className="input">
                    <option value="bank">تحويل بنكي</option>
                    <option value="check">شيك</option>
                    <option value="cash">نقدي</option>
                  </select>
                </div>
                <div>
                  <label className="label">دورة الراتب</label>
                  <select className="input">
                    <option value="monthly">شهري</option>
                    <option value="biweekly">نصف شهري</option>
                    <option value="weekly">أسبوعي</option>
                  </select>
                </div>
              </div>

              {/* Allowances */}
              <h3 className="text-md font-bold text-gray-700 mt-8 border-b border-gray-100 pb-2">
                البدلات الثابتة
              </h3>
              <div className="grid grid-cols-4 gap-4">
                <div>
                  <label className="label">بدل السكن</label>
                  <input type="number" className="input" placeholder="2500" dir="ltr" />
                </div>
                <div>
                  <label className="label">بدل المواصلات</label>
                  <input type="number" className="input" placeholder="1000" dir="ltr" />
                </div>
                <div>
                  <label className="label">بدل الهاتف</label>
                  <input type="number" className="input" placeholder="500" dir="ltr" />
                </div>
                <div>
                  <label className="label">بدل طبيعة العمل</label>
                  <input type="number" className="input" placeholder="0" dir="ltr" />
                </div>
              </div>

              <div className="p-4 bg-primary-50 rounded-xl">
                <div className="flex items-center justify-between">
                  <span className="font-medium text-gray-700">إجمالي الراتب الشهري</span>
                  <span className="text-2xl font-bold text-primary-600">14,000 ر.س</span>
                </div>
              </div>

              {/* Bank Details */}
              <h3 className="text-md font-bold text-gray-700 mt-8 border-b border-gray-100 pb-2">
                المعلومات البنكية
              </h3>
              <div className="grid grid-cols-3 gap-4">
                <div>
                  <label className="label">اسم البنك *</label>
                  <select className="input">
                    <option value="">اختر</option>
                    <option value="alrajhi">بنك الراجحي</option>
                    <option value="alinma">بنك الإنماء</option>
                    <option value="snb">البنك الأهلي</option>
                    <option value="riyad">بنك الرياض</option>
                    <option value="sabb">بنك ساب</option>
                  </select>
                </div>
                <div>
                  <label className="label">اسم الفرع</label>
                  <input type="text" className="input" placeholder="فرع العليا" />
                </div>
                <div>
                  <label className="label">رقم الحساب (IBAN) *</label>
                  <input type="text" className="input" placeholder="SA00 0000 0000 0000 0000 0000" dir="ltr" />
                </div>
              </div>

              {/* Insurance */}
              <h3 className="text-md font-bold text-gray-700 mt-8 border-b border-gray-100 pb-2">
                التأمينات الاجتماعية
              </h3>
              <div className="grid grid-cols-3 gap-4">
                <div>
                  <label className="label">رقم التأمينات (GOSI)</label>
                  <input type="text" className="input" placeholder="1234567890" dir="ltr" />
                </div>
                <div>
                  <label className="label">خاضع للتأمينات</label>
                  <select className="input">
                    <option value="yes">نعم</option>
                    <option value="no">لا</option>
                  </select>
                </div>
                <div>
                  <label className="label">الراتب الخاضع للتأمينات</label>
                  <input type="number" className="input" placeholder="12500" dir="ltr" />
                </div>
              </div>
            </div>
          )}

          {/* Step 4: Qualifications */}
          {currentStep === 4 && (
            <div className="space-y-8">
              <h2 className="text-lg font-bold text-gray-800 border-b border-gray-100 pb-4">
                المؤهلات والخبرات
              </h2>

              {/* Education */}
              <h3 className="text-md font-bold text-gray-700 border-b border-gray-100 pb-2">
                التعليم
              </h3>
              <div className="p-4 bg-gray-50 rounded-xl space-y-4">
                <div className="grid grid-cols-4 gap-4">
                  <div>
                    <label className="label">المؤهل</label>
                    <select className="input">
                      <option value="">اختر</option>
                      <option value="phd">دكتوراه</option>
                      <option value="master">ماجستير</option>
                      <option value="bachelor">بكالوريوس</option>
                      <option value="diploma">دبلوم</option>
                      <option value="highschool">ثانوي</option>
                    </select>
                  </div>
                  <div>
                    <label className="label">التخصص</label>
                    <input type="text" className="input" placeholder="علوم الحاسب" />
                  </div>
                  <div>
                    <label className="label">الجامعة/المعهد</label>
                    <input type="text" className="input" placeholder="جامعة الملك سعود" />
                  </div>
                  <div>
                    <label className="label">سنة التخرج</label>
                    <input type="number" className="input" placeholder="2020" dir="ltr" />
                  </div>
                </div>
                <button className="text-sm text-primary-500 hover:text-primary-600 font-medium">
                  + إضافة مؤهل آخر
                </button>
              </div>

              {/* Certifications */}
              <h3 className="text-md font-bold text-gray-700 mt-8 border-b border-gray-100 pb-2">
                الشهادات المهنية
              </h3>
              <div className="p-4 bg-gray-50 rounded-xl space-y-4">
                <div className="grid grid-cols-4 gap-4">
                  <div>
                    <label className="label">اسم الشهادة</label>
                    <input type="text" className="input" placeholder="PMP" />
                  </div>
                  <div>
                    <label className="label">الجهة المانحة</label>
                    <input type="text" className="input" placeholder="PMI" />
                  </div>
                  <div>
                    <label className="label">تاريخ الحصول</label>
                    <input type="date" className="input" />
                  </div>
                  <div>
                    <label className="label">تاريخ الانتهاء</label>
                    <input type="date" className="input" />
                  </div>
                </div>
                <button className="text-sm text-primary-500 hover:text-primary-600 font-medium">
                  + إضافة شهادة أخرى
                </button>
              </div>

              {/* Previous Experience */}
              <h3 className="text-md font-bold text-gray-700 mt-8 border-b border-gray-100 pb-2">
                الخبرات السابقة
              </h3>
              <div className="p-4 bg-gray-50 rounded-xl space-y-4">
                <div className="grid grid-cols-3 gap-4">
                  <div>
                    <label className="label">اسم الشركة</label>
                    <input type="text" className="input" placeholder="شركة ABC" />
                  </div>
                  <div>
                    <label className="label">المسمى الوظيفي</label>
                    <input type="text" className="input" placeholder="مطور برمجيات" />
                  </div>
                  <div>
                    <label className="label">البلد</label>
                    <input type="text" className="input" placeholder="السعودية" />
                  </div>
                </div>
                <div className="grid grid-cols-3 gap-4">
                  <div>
                    <label className="label">من تاريخ</label>
                    <input type="date" className="input" />
                  </div>
                  <div>
                    <label className="label">إلى تاريخ</label>
                    <input type="date" className="input" />
                  </div>
                  <div>
                    <label className="label">سبب الترك</label>
                    <input type="text" className="input" placeholder="فرصة أفضل" />
                  </div>
                </div>
                <button className="text-sm text-primary-500 hover:text-primary-600 font-medium">
                  + إضافة خبرة أخرى
                </button>
              </div>

              {/* Skills */}
              <h3 className="text-md font-bold text-gray-700 mt-8 border-b border-gray-100 pb-2">
                المهارات
              </h3>
              <div className="p-4 bg-gray-50 rounded-xl space-y-4">
                <div className="grid grid-cols-3 gap-4">
                  <div>
                    <label className="label">المهارة</label>
                    <input type="text" className="input" placeholder="JavaScript" />
                  </div>
                  <div>
                    <label className="label">مستوى الإتقان</label>
                    <select className="input">
                      <option value="">اختر</option>
                      <option value="beginner">مبتدئ</option>
                      <option value="intermediate">متوسط</option>
                      <option value="advanced">متقدم</option>
                      <option value="expert">خبير</option>
                    </select>
                  </div>
                  <div>
                    <label className="label">سنوات الخبرة</label>
                    <input type="number" className="input" placeholder="5" dir="ltr" />
                  </div>
                </div>
                <button className="text-sm text-primary-500 hover:text-primary-600 font-medium">
                  + إضافة مهارة أخرى
                </button>
              </div>

              {/* Languages */}
              <h3 className="text-md font-bold text-gray-700 mt-8 border-b border-gray-100 pb-2">
                اللغات
              </h3>
              <div className="p-4 bg-gray-50 rounded-xl space-y-4">
                <div className="grid grid-cols-4 gap-4">
                  <div>
                    <label className="label">اللغة</label>
                    <select className="input">
                      <option value="">اختر</option>
                      <option value="ar">العربية</option>
                      <option value="en">الإنجليزية</option>
                      <option value="fr">الفرنسية</option>
                      <option value="other">أخرى</option>
                    </select>
                  </div>
                  <div>
                    <label className="label">مستوى التحدث</label>
                    <select className="input">
                      <option value="">اختر</option>
                      <option value="native">لغة أم</option>
                      <option value="fluent">طلق</option>
                      <option value="good">جيد</option>
                      <option value="basic">أساسي</option>
                    </select>
                  </div>
                  <div>
                    <label className="label">مستوى الكتابة</label>
                    <select className="input">
                      <option value="">اختر</option>
                      <option value="excellent">ممتاز</option>
                      <option value="good">جيد</option>
                      <option value="basic">أساسي</option>
                    </select>
                  </div>
                  <div>
                    <label className="label">مستوى القراءة</label>
                    <select className="input">
                      <option value="">اختر</option>
                      <option value="excellent">ممتاز</option>
                      <option value="good">جيد</option>
                      <option value="basic">أساسي</option>
                    </select>
                  </div>
                </div>
                <button className="text-sm text-primary-500 hover:text-primary-600 font-medium">
                  + إضافة لغة أخرى
                </button>
              </div>
            </div>
          )}

          {/* Step 5: Documents */}
          {currentStep === 5 && (
            <div className="space-y-8">
              <h2 className="text-lg font-bold text-gray-800 border-b border-gray-100 pb-4">
                المستندات
              </h2>

              <p className="text-gray-500">
                يرجى رفع المستندات المطلوبة. المستندات المحددة بـ (*) إلزامية.
              </p>

              {/* Required Documents */}
              <div className="grid grid-cols-2 gap-6">
                <div className="p-4 border-2 border-dashed border-gray-200 rounded-xl hover:border-primary-300 transition-colors">
                  <div className="flex items-center justify-between mb-4">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 bg-primary-50 rounded-lg flex items-center justify-center">
                        <FileText size={20} className="text-primary-500" />
                      </div>
                      <div>
                        <p className="font-medium text-gray-800">صورة الهوية / الإقامة *</p>
                        <p className="text-sm text-gray-400">PDF, JPG, PNG - حد أقصى 5MB</p>
                      </div>
                    </div>
                  </div>
                  <input type="file" className="w-full" accept=".pdf,.jpg,.jpeg,.png" />
                </div>

                <div className="p-4 border-2 border-dashed border-gray-200 rounded-xl hover:border-primary-300 transition-colors">
                  <div className="flex items-center justify-between mb-4">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 bg-primary-50 rounded-lg flex items-center justify-center">
                        <FileText size={20} className="text-primary-500" />
                      </div>
                      <div>
                        <p className="font-medium text-gray-800">صورة جواز السفر</p>
                        <p className="text-sm text-gray-400">PDF, JPG, PNG - حد أقصى 5MB</p>
                      </div>
                    </div>
                  </div>
                  <input type="file" className="w-full" accept=".pdf,.jpg,.jpeg,.png" />
                </div>

                <div className="p-4 border-2 border-dashed border-gray-200 rounded-xl hover:border-primary-300 transition-colors">
                  <div className="flex items-center justify-between mb-4">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 bg-primary-50 rounded-lg flex items-center justify-center">
                        <FileText size={20} className="text-primary-500" />
                      </div>
                      <div>
                        <p className="font-medium text-gray-800">شهادة المؤهل *</p>
                        <p className="text-sm text-gray-400">PDF - حد أقصى 5MB</p>
                      </div>
                    </div>
                  </div>
                  <input type="file" className="w-full" accept=".pdf" />
                </div>

                <div className="p-4 border-2 border-dashed border-gray-200 rounded-xl hover:border-primary-300 transition-colors">
                  <div className="flex items-center justify-between mb-4">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 bg-primary-50 rounded-lg flex items-center justify-center">
                        <FileText size={20} className="text-primary-500" />
                      </div>
                      <div>
                        <p className="font-medium text-gray-800">السيرة الذاتية</p>
                        <p className="text-sm text-gray-400">PDF, DOC - حد أقصى 5MB</p>
                      </div>
                    </div>
                  </div>
                  <input type="file" className="w-full" accept=".pdf,.doc,.docx" />
                </div>

                <div className="p-4 border-2 border-dashed border-gray-200 rounded-xl hover:border-primary-300 transition-colors">
                  <div className="flex items-center justify-between mb-4">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 bg-primary-50 rounded-lg flex items-center justify-center">
                        <FileText size={20} className="text-primary-500" />
                      </div>
                      <div>
                        <p className="font-medium text-gray-800">شهادات الخبرة</p>
                        <p className="text-sm text-gray-400">PDF - حد أقصى 5MB لكل ملف</p>
                      </div>
                    </div>
                  </div>
                  <input type="file" className="w-full" accept=".pdf" multiple />
                </div>

                <div className="p-4 border-2 border-dashed border-gray-200 rounded-xl hover:border-primary-300 transition-colors">
                  <div className="flex items-center justify-between mb-4">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 bg-primary-50 rounded-lg flex items-center justify-center">
                        <FileText size={20} className="text-primary-500" />
                      </div>
                      <div>
                        <p className="font-medium text-gray-800">صورة شخصية رسمية</p>
                        <p className="text-sm text-gray-400">JPG, PNG - حد أقصى 2MB</p>
                      </div>
                    </div>
                  </div>
                  <input type="file" className="w-full" accept=".jpg,.jpeg,.png" />
                </div>
              </div>
            </div>
          )}

          {/* Navigation Buttons */}
          <div className="flex items-center justify-between mt-8 pt-6 border-t border-gray-100">
            <button
              onClick={prevStep}
              disabled={currentStep === 1}
              className="btn-secondary flex items-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <ChevronRight size={18} />
              السابق
            </button>

            <div className="flex items-center gap-3">
              <button className="btn-secondary">حفظ كمسودة</button>
              {currentStep === steps.length ? (
                <button className="btn-success flex items-center gap-2">
                  <Save size={18} />
                  حفظ وإضافة الموظف
                </button>
              ) : (
                <button
                  onClick={nextStep}
                  className="btn-primary flex items-center gap-2"
                >
                  التالي
                  <ChevronLeft size={18} />
                </button>
              )}
            </div>
          </div>
        </div>
      </div>
    </MainLayout>
  )
}
