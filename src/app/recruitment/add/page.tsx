'use client'

import { useState } from 'react'
import { MainLayout } from '@/components/layout'
import {
  ArrowRight,
  ArrowLeft,
  Save,
  Briefcase,
  Building2,
  MapPin,
  DollarSign,
  Clock,
  FileText,
  CheckCircle2,
  Plus,
  X,
  GraduationCap,
  Star,
} from 'lucide-react'
import Link from 'next/link'

interface JobFormData {
  title: string
  department: string
  location: string
  type: string
  experienceMin: string
  experienceMax: string
  salaryMin: string
  salaryMax: string
  closingDate: string
  description: string
  responsibilities: string[]
  requirements: string[]
  benefits: string[]
  skills: string[]
  education: string
  remote: boolean
  urgent: boolean
}

export default function AddJobPage() {
  const [currentStep, setCurrentStep] = useState(1)
  const [formData, setFormData] = useState<JobFormData>({
    title: '',
    department: '',
    location: '',
    type: 'full-time',
    experienceMin: '',
    experienceMax: '',
    salaryMin: '',
    salaryMax: '',
    closingDate: '',
    description: '',
    responsibilities: [''],
    requirements: [''],
    benefits: [''],
    skills: [''],
    education: '',
    remote: false,
    urgent: false,
  })

  const [newResponsibility, setNewResponsibility] = useState('')
  const [newRequirement, setNewRequirement] = useState('')
  const [newBenefit, setNewBenefit] = useState('')
  const [newSkill, setNewSkill] = useState('')

  const steps = [
    { id: 1, title: 'معلومات أساسية', icon: Briefcase },
    { id: 2, title: 'الوصف والمتطلبات', icon: FileText },
    { id: 3, title: 'المميزات والمهارات', icon: Star },
    { id: 4, title: 'المراجعة والنشر', icon: CheckCircle2 },
  ]

  const handleChange = (field: keyof JobFormData, value: string | boolean) => {
    setFormData((prev) => ({ ...prev, [field]: value }))
  }

  const addListItem = (
    field: 'responsibilities' | 'requirements' | 'benefits' | 'skills',
    value: string,
    setter: (val: string) => void
  ) => {
    if (value.trim()) {
      setFormData((prev) => ({
        ...prev,
        [field]: [...prev[field].filter((item) => item), value.trim()],
      }))
      setter('')
    }
  }

  const removeListItem = (
    field: 'responsibilities' | 'requirements' | 'benefits' | 'skills',
    index: number
  ) => {
    setFormData((prev) => ({
      ...prev,
      [field]: prev[field].filter((_, i) => i !== index),
    }))
  }

  const renderStep = () => {
    switch (currentStep) {
      case 1:
        return (
          <div className="space-y-6">
            <h2 className="text-lg font-bold text-gray-800 mb-4">المعلومات الأساسية للوظيفة</h2>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  المسمى الوظيفي <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  className="input w-full"
                  placeholder="مثال: مطور واجهات أمامية"
                  value={formData.title}
                  onChange={(e) => handleChange('title', e.target.value)}
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  القسم <span className="text-red-500">*</span>
                </label>
                <select
                  className="input w-full"
                  value={formData.department}
                  onChange={(e) => handleChange('department', e.target.value)}
                >
                  <option value="">اختر القسم</option>
                  <option value="تقنية المعلومات">تقنية المعلومات</option>
                  <option value="الموارد البشرية">الموارد البشرية</option>
                  <option value="المبيعات">المبيعات</option>
                  <option value="المالية">المالية</option>
                  <option value="التسويق">التسويق</option>
                  <option value="إدارة المشاريع">إدارة المشاريع</option>
                  <option value="خدمة العملاء">خدمة العملاء</option>
                </select>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  موقع العمل <span className="text-red-500">*</span>
                </label>
                <select
                  className="input w-full"
                  value={formData.location}
                  onChange={(e) => handleChange('location', e.target.value)}
                >
                  <option value="">اختر الموقع</option>
                  <option value="الرياض">الرياض</option>
                  <option value="جدة">جدة</option>
                  <option value="الدمام">الدمام</option>
                  <option value="مكة المكرمة">مكة المكرمة</option>
                  <option value="المدينة المنورة">المدينة المنورة</option>
                  <option value="عن بُعد">عن بُعد</option>
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  نوع الوظيفة <span className="text-red-500">*</span>
                </label>
                <select
                  className="input w-full"
                  value={formData.type}
                  onChange={(e) => handleChange('type', e.target.value)}
                >
                  <option value="full-time">دوام كامل</option>
                  <option value="part-time">دوام جزئي</option>
                  <option value="contract">عقد مؤقت</option>
                  <option value="internship">تدريب</option>
                </select>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  سنوات الخبرة المطلوبة
                </label>
                <div className="flex items-center gap-2">
                  <input
                    type="number"
                    className="input w-full"
                    placeholder="من"
                    value={formData.experienceMin}
                    onChange={(e) => handleChange('experienceMin', e.target.value)}
                  />
                  <span className="text-gray-500">-</span>
                  <input
                    type="number"
                    className="input w-full"
                    placeholder="إلى"
                    value={formData.experienceMax}
                    onChange={(e) => handleChange('experienceMax', e.target.value)}
                  />
                  <span className="text-gray-500">سنة</span>
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  نطاق الراتب (ر.س)
                </label>
                <div className="flex items-center gap-2">
                  <input
                    type="number"
                    className="input w-full"
                    placeholder="من"
                    value={formData.salaryMin}
                    onChange={(e) => handleChange('salaryMin', e.target.value)}
                  />
                  <span className="text-gray-500">-</span>
                  <input
                    type="number"
                    className="input w-full"
                    placeholder="إلى"
                    value={formData.salaryMax}
                    onChange={(e) => handleChange('salaryMax', e.target.value)}
                  />
                </div>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  تاريخ انتهاء الإعلان
                </label>
                <input
                  type="date"
                  className="input w-full"
                  value={formData.closingDate}
                  onChange={(e) => handleChange('closingDate', e.target.value)}
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  المؤهل العلمي المطلوب
                </label>
                <select
                  className="input w-full"
                  value={formData.education}
                  onChange={(e) => handleChange('education', e.target.value)}
                >
                  <option value="">اختر المؤهل</option>
                  <option value="ثانوية">ثانوية عامة</option>
                  <option value="دبلوم">دبلوم</option>
                  <option value="بكالوريوس">بكالوريوس</option>
                  <option value="ماجستير">ماجستير</option>
                  <option value="دكتوراه">دكتوراه</option>
                </select>
              </div>
            </div>

            <div className="flex items-center gap-6">
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={formData.remote}
                  onChange={(e) => handleChange('remote', e.target.checked)}
                  className="w-5 h-5 rounded border-gray-300 text-primary-600 focus:ring-primary-500"
                />
                <span className="text-gray-700">يمكن العمل عن بُعد</span>
              </label>
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={formData.urgent}
                  onChange={(e) => handleChange('urgent', e.target.checked)}
                  className="w-5 h-5 rounded border-gray-300 text-primary-600 focus:ring-primary-500"
                />
                <span className="text-gray-700">توظيف عاجل</span>
              </label>
            </div>
          </div>
        )

      case 2:
        return (
          <div className="space-y-6">
            <h2 className="text-lg font-bold text-gray-800 mb-4">وصف الوظيفة والمتطلبات</h2>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                وصف الوظيفة <span className="text-red-500">*</span>
              </label>
              <textarea
                className="input w-full h-32"
                placeholder="اكتب وصفاً تفصيلياً للوظيفة..."
                value={formData.description}
                onChange={(e) => handleChange('description', e.target.value)}
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                المسؤوليات والمهام
              </label>
              <div className="space-y-2 mb-3">
                {formData.responsibilities
                  .filter((r) => r)
                  .map((item, index) => (
                    <div
                      key={index}
                      className="flex items-center gap-2 p-3 bg-gray-50 rounded-lg"
                    >
                      <span className="flex-1">{item}</span>
                      <button
                        onClick={() => removeListItem('responsibilities', index)}
                        className="text-red-500 hover:text-red-700"
                      >
                        <X size={18} />
                      </button>
                    </div>
                  ))}
              </div>
              <div className="flex items-center gap-2">
                <input
                  type="text"
                  className="input flex-1"
                  placeholder="أضف مسؤولية جديدة..."
                  value={newResponsibility}
                  onChange={(e) => setNewResponsibility(e.target.value)}
                  onKeyPress={(e) => {
                    if (e.key === 'Enter') {
                      addListItem('responsibilities', newResponsibility, setNewResponsibility)
                    }
                  }}
                />
                <button
                  onClick={() =>
                    addListItem('responsibilities', newResponsibility, setNewResponsibility)
                  }
                  className="btn-secondary"
                >
                  <Plus size={18} />
                </button>
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                المتطلبات والمؤهلات
              </label>
              <div className="space-y-2 mb-3">
                {formData.requirements
                  .filter((r) => r)
                  .map((item, index) => (
                    <div
                      key={index}
                      className="flex items-center gap-2 p-3 bg-gray-50 rounded-lg"
                    >
                      <span className="flex-1">{item}</span>
                      <button
                        onClick={() => removeListItem('requirements', index)}
                        className="text-red-500 hover:text-red-700"
                      >
                        <X size={18} />
                      </button>
                    </div>
                  ))}
              </div>
              <div className="flex items-center gap-2">
                <input
                  type="text"
                  className="input flex-1"
                  placeholder="أضف متطلب جديد..."
                  value={newRequirement}
                  onChange={(e) => setNewRequirement(e.target.value)}
                  onKeyPress={(e) => {
                    if (e.key === 'Enter') {
                      addListItem('requirements', newRequirement, setNewRequirement)
                    }
                  }}
                />
                <button
                  onClick={() => addListItem('requirements', newRequirement, setNewRequirement)}
                  className="btn-secondary"
                >
                  <Plus size={18} />
                </button>
              </div>
            </div>
          </div>
        )

      case 3:
        return (
          <div className="space-y-6">
            <h2 className="text-lg font-bold text-gray-800 mb-4">المميزات والمهارات المطلوبة</h2>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                مميزات الوظيفة
              </label>
              <div className="space-y-2 mb-3">
                {formData.benefits
                  .filter((b) => b)
                  .map((item, index) => (
                    <div
                      key={index}
                      className="flex items-center gap-2 p-3 bg-success-50 rounded-lg"
                    >
                      <CheckCircle2 size={18} className="text-success-600" />
                      <span className="flex-1">{item}</span>
                      <button
                        onClick={() => removeListItem('benefits', index)}
                        className="text-red-500 hover:text-red-700"
                      >
                        <X size={18} />
                      </button>
                    </div>
                  ))}
              </div>
              <div className="flex items-center gap-2">
                <input
                  type="text"
                  className="input flex-1"
                  placeholder="أضف ميزة جديدة..."
                  value={newBenefit}
                  onChange={(e) => setNewBenefit(e.target.value)}
                  onKeyPress={(e) => {
                    if (e.key === 'Enter') {
                      addListItem('benefits', newBenefit, setNewBenefit)
                    }
                  }}
                />
                <button
                  onClick={() => addListItem('benefits', newBenefit, setNewBenefit)}
                  className="btn-secondary"
                >
                  <Plus size={18} />
                </button>
              </div>
              <p className="text-xs text-gray-500 mt-2">
                مثال: تأمين طبي، بدل سكن، بدل مواصلات، إجازات مدفوعة...
              </p>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                المهارات المطلوبة
              </label>
              <div className="flex flex-wrap gap-2 mb-3">
                {formData.skills
                  .filter((s) => s)
                  .map((skill, index) => (
                    <span
                      key={index}
                      className="inline-flex items-center gap-1 px-3 py-1 bg-primary-100 text-primary-700 rounded-full text-sm"
                    >
                      {skill}
                      <button
                        onClick={() => removeListItem('skills', index)}
                        className="hover:text-primary-900"
                      >
                        <X size={14} />
                      </button>
                    </span>
                  ))}
              </div>
              <div className="flex items-center gap-2">
                <input
                  type="text"
                  className="input flex-1"
                  placeholder="أضف مهارة جديدة..."
                  value={newSkill}
                  onChange={(e) => setNewSkill(e.target.value)}
                  onKeyPress={(e) => {
                    if (e.key === 'Enter') {
                      addListItem('skills', newSkill, setNewSkill)
                    }
                  }}
                />
                <button
                  onClick={() => addListItem('skills', newSkill, setNewSkill)}
                  className="btn-secondary"
                >
                  <Plus size={18} />
                </button>
              </div>
              <p className="text-xs text-gray-500 mt-2">
                مثال: React, JavaScript, إدارة المشاريع, التواصل...
              </p>
            </div>
          </div>
        )

      case 4:
        return (
          <div className="space-y-6">
            <h2 className="text-lg font-bold text-gray-800 mb-4">مراجعة الإعلان الوظيفي</h2>

            <div className="bg-gray-50 rounded-2xl p-6 space-y-6">
              {/* Header */}
              <div className="flex items-start justify-between border-b border-gray-200 pb-6">
                <div>
                  <h3 className="text-2xl font-bold text-gray-800">{formData.title || 'المسمى الوظيفي'}</h3>
                  <div className="flex items-center gap-4 mt-2 text-gray-600">
                    <span className="flex items-center gap-1">
                      <Building2 size={16} />
                      {formData.department || 'القسم'}
                    </span>
                    <span className="flex items-center gap-1">
                      <MapPin size={16} />
                      {formData.location || 'الموقع'}
                    </span>
                    <span className="flex items-center gap-1">
                      <Clock size={16} />
                      {formData.type === 'full-time' ? 'دوام كامل' : formData.type === 'part-time' ? 'دوام جزئي' : formData.type === 'contract' ? 'عقد مؤقت' : 'تدريب'}
                    </span>
                  </div>
                </div>
                <div className="flex gap-2">
                  {formData.remote && (
                    <span className="px-3 py-1 bg-green-100 text-green-700 rounded-full text-sm">
                      عن بُعد
                    </span>
                  )}
                  {formData.urgent && (
                    <span className="px-3 py-1 bg-red-100 text-red-700 rounded-full text-sm">
                      عاجل
                    </span>
                  )}
                </div>
              </div>

              {/* Details Grid */}
              <div className="grid grid-cols-3 gap-4">
                <div className="p-4 bg-white rounded-xl">
                  <p className="text-sm text-gray-500">الخبرة المطلوبة</p>
                  <p className="font-medium text-gray-800">
                    {formData.experienceMin && formData.experienceMax
                      ? `${formData.experienceMin} - ${formData.experienceMax} سنوات`
                      : 'غير محدد'}
                  </p>
                </div>
                <div className="p-4 bg-white rounded-xl">
                  <p className="text-sm text-gray-500">نطاق الراتب</p>
                  <p className="font-medium text-gray-800">
                    {formData.salaryMin && formData.salaryMax
                      ? `${Number(formData.salaryMin).toLocaleString()} - ${Number(formData.salaryMax).toLocaleString()} ر.س`
                      : 'غير محدد'}
                  </p>
                </div>
                <div className="p-4 bg-white rounded-xl">
                  <p className="text-sm text-gray-500">المؤهل العلمي</p>
                  <p className="font-medium text-gray-800">{formData.education || 'غير محدد'}</p>
                </div>
              </div>

              {/* Description */}
              {formData.description && (
                <div>
                  <h4 className="font-medium text-gray-700 mb-2">وصف الوظيفة</h4>
                  <p className="text-gray-600">{formData.description}</p>
                </div>
              )}

              {/* Responsibilities */}
              {formData.responsibilities.filter((r) => r).length > 0 && (
                <div>
                  <h4 className="font-medium text-gray-700 mb-2">المسؤوليات</h4>
                  <ul className="space-y-1">
                    {formData.responsibilities
                      .filter((r) => r)
                      .map((item, i) => (
                        <li key={i} className="flex items-start gap-2 text-gray-600">
                          <span className="text-primary-500">•</span>
                          {item}
                        </li>
                      ))}
                  </ul>
                </div>
              )}

              {/* Requirements */}
              {formData.requirements.filter((r) => r).length > 0 && (
                <div>
                  <h4 className="font-medium text-gray-700 mb-2">المتطلبات</h4>
                  <ul className="space-y-1">
                    {formData.requirements
                      .filter((r) => r)
                      .map((item, i) => (
                        <li key={i} className="flex items-start gap-2 text-gray-600">
                          <span className="text-primary-500">•</span>
                          {item}
                        </li>
                      ))}
                  </ul>
                </div>
              )}

              {/* Benefits */}
              {formData.benefits.filter((b) => b).length > 0 && (
                <div>
                  <h4 className="font-medium text-gray-700 mb-2">المميزات</h4>
                  <div className="flex flex-wrap gap-2">
                    {formData.benefits
                      .filter((b) => b)
                      .map((item, i) => (
                        <span
                          key={i}
                          className="inline-flex items-center gap-1 px-3 py-1 bg-success-50 text-success-700 rounded-full text-sm"
                        >
                          <CheckCircle2 size={14} />
                          {item}
                        </span>
                      ))}
                  </div>
                </div>
              )}

              {/* Skills */}
              {formData.skills.filter((s) => s).length > 0 && (
                <div>
                  <h4 className="font-medium text-gray-700 mb-2">المهارات المطلوبة</h4>
                  <div className="flex flex-wrap gap-2">
                    {formData.skills
                      .filter((s) => s)
                      .map((skill, i) => (
                        <span
                          key={i}
                          className="px-3 py-1 bg-primary-100 text-primary-700 rounded-full text-sm"
                        >
                          {skill}
                        </span>
                      ))}
                  </div>
                </div>
              )}
            </div>
          </div>
        )

      default:
        return null
    }
  }

  return (
    <MainLayout>
      <div className="space-y-6">
        {/* Page Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-gray-800">إضافة وظيفة جديدة</h1>
            <p className="text-gray-500 mt-1">أنشئ إعلان وظيفي جديد</p>
          </div>
          <Link href="/recruitment" className="btn-secondary flex items-center gap-2">
            <X size={18} />
            إلغاء
          </Link>
        </div>

        {/* Progress Steps */}
        <div className="card">
          <div className="flex items-center justify-between">
            {steps.map((step, index) => (
              <div key={step.id} className="flex items-center">
                <div
                  className={`flex items-center gap-3 cursor-pointer ${
                    currentStep >= step.id ? 'text-primary-600' : 'text-gray-400'
                  }`}
                  onClick={() => setCurrentStep(step.id)}
                >
                  <div
                    className={`w-10 h-10 rounded-full flex items-center justify-center ${
                      currentStep > step.id
                        ? 'bg-success-500 text-white'
                        : currentStep === step.id
                        ? 'bg-primary-500 text-white'
                        : 'bg-gray-200 text-gray-500'
                    }`}
                  >
                    {currentStep > step.id ? (
                      <CheckCircle2 size={20} />
                    ) : (
                      <step.icon size={20} />
                    )}
                  </div>
                  <span className="font-medium">{step.title}</span>
                </div>
                {index < steps.length - 1 && (
                  <div
                    className={`w-24 h-0.5 mx-4 ${
                      currentStep > step.id ? 'bg-success-500' : 'bg-gray-200'
                    }`}
                  />
                )}
              </div>
            ))}
          </div>
        </div>

        {/* Form Content */}
        <div className="card">{renderStep()}</div>

        {/* Navigation Buttons */}
        <div className="flex items-center justify-between">
          <button
            onClick={() => setCurrentStep((prev) => Math.max(1, prev - 1))}
            className="btn-secondary flex items-center gap-2"
            disabled={currentStep === 1}
          >
            <ArrowRight size={18} />
            السابق
          </button>

          {currentStep < 4 ? (
            <button
              onClick={() => setCurrentStep((prev) => Math.min(4, prev + 1))}
              className="btn-primary flex items-center gap-2"
            >
              التالي
              <ArrowLeft size={18} />
            </button>
          ) : (
            <button className="btn-primary flex items-center gap-2">
              <Save size={18} />
              نشر الإعلان
            </button>
          )}
        </div>
      </div>
    </MainLayout>
  )
}
