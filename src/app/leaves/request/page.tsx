'use client'

import { useState } from 'react'
import { MainLayout } from '@/components/layout'
import {
  ArrowRight,
  Calendar,
  FileText,
  Upload,
  AlertCircle,
  CheckCircle2,
} from 'lucide-react'
import Link from 'next/link'

const leaveTypes = [
  { id: 'annual', name: 'إجازة سنوية', balance: 21, color: 'bg-blue-500' },
  { id: 'sick', name: 'إجازة مرضية', balance: 30, color: 'bg-red-500' },
  { id: 'emergency', name: 'إجازة طارئة', balance: 5, color: 'bg-orange-500' },
  { id: 'unpaid', name: 'إجازة بدون راتب', balance: null, color: 'bg-gray-500' },
  { id: 'marriage', name: 'إجازة زواج', balance: 5, color: 'bg-pink-500' },
  { id: 'maternity', name: 'إجازة أمومة', balance: 70, color: 'bg-purple-500' },
  { id: 'paternity', name: 'إجازة أبوة', balance: 3, color: 'bg-indigo-500' },
  { id: 'hajj', name: 'إجازة حج', balance: 15, color: 'bg-green-500' },
]

export default function LeaveRequestPage() {
  const [formData, setFormData] = useState({
    leaveType: '',
    startDate: '',
    endDate: '',
    reason: '',
    contactNumber: '',
    attachment: null as File | null,
  })

  const [calculatedDays, setCalculatedDays] = useState(0)

  const handleChange = (field: string, value: string | File | null) => {
    setFormData(prev => ({ ...prev, [field]: value }))

    if (field === 'startDate' || field === 'endDate') {
      const start = field === 'startDate' ? value : formData.startDate
      const end = field === 'endDate' ? value : formData.endDate
      if (start && end) {
        const startDate = new Date(start as string)
        const endDate = new Date(end as string)
        const diffTime = Math.abs(endDate.getTime() - startDate.getTime())
        const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24)) + 1
        setCalculatedDays(diffDays)
      }
    }
  }

  const selectedLeaveType = leaveTypes.find(t => t.id === formData.leaveType)

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    console.log('Submitting:', formData)
  }

  return (
    <MainLayout>
      <form onSubmit={handleSubmit} className="space-y-6 max-w-3xl mx-auto">
        {/* Header */}
        <div className="flex items-center gap-4">
          <Link href="/leaves" className="p-2 bg-gray-100 rounded-xl hover:bg-gray-200">
            <ArrowRight size={20} className="text-gray-600" />
          </Link>
          <div>
            <h1 className="text-2xl font-bold text-gray-800">طلب إجازة جديد</h1>
            <p className="text-gray-500 mt-1">قم بتعبئة النموذج لتقديم طلب الإجازة</p>
          </div>
        </div>

        {/* Leave Type Selection */}
        <div className="card">
          <h2 className="text-lg font-bold text-gray-800 mb-4">نوع الإجازة</h2>
          <div className="grid grid-cols-4 gap-3">
            {leaveTypes.map((type) => (
              <button
                key={type.id}
                type="button"
                onClick={() => handleChange('leaveType', type.id)}
                className={`p-4 rounded-xl border-2 text-right transition-all ${
                  formData.leaveType === type.id
                    ? 'border-primary-500 bg-primary-50'
                    : 'border-gray-200 hover:border-gray-300'
                }`}
              >
                <div className={`w-3 h-3 rounded-full ${type.color} mb-2`} />
                <p className="font-medium text-gray-800 text-sm">{type.name}</p>
                {type.balance !== null && (
                  <p className="text-xs text-gray-500 mt-1">الرصيد: {type.balance} يوم</p>
                )}
              </button>
            ))}
          </div>
        </div>

        {/* Date Selection */}
        <div className="card">
          <h2 className="text-lg font-bold text-gray-800 mb-4">تاريخ الإجازة</h2>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                تاريخ البداية <span className="text-red-500">*</span>
              </label>
              <input
                type="date"
                className="input w-full"
                value={formData.startDate}
                onChange={(e) => handleChange('startDate', e.target.value)}
                required
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                تاريخ النهاية <span className="text-red-500">*</span>
              </label>
              <input
                type="date"
                className="input w-full"
                value={formData.endDate}
                onChange={(e) => handleChange('endDate', e.target.value)}
                min={formData.startDate}
                required
              />
            </div>
          </div>

          {calculatedDays > 0 && (
            <div className="mt-4 p-4 bg-primary-50 rounded-xl flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Calendar size={20} className="text-primary-600" />
                <span className="text-primary-800">مدة الإجازة</span>
              </div>
              <span className="text-2xl font-bold text-primary-600">{calculatedDays} يوم</span>
            </div>
          )}

          {selectedLeaveType && selectedLeaveType.balance !== null && calculatedDays > selectedLeaveType.balance && (
            <div className="mt-4 p-4 bg-red-50 rounded-xl flex items-center gap-2 text-red-700">
              <AlertCircle size={20} />
              <span>مدة الإجازة المطلوبة تتجاوز الرصيد المتاح ({selectedLeaveType.balance} يوم)</span>
            </div>
          )}
        </div>

        {/* Details */}
        <div className="card">
          <h2 className="text-lg font-bold text-gray-800 mb-4">تفاصيل إضافية</h2>
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                سبب الإجازة <span className="text-red-500">*</span>
              </label>
              <textarea
                className="input w-full h-24"
                placeholder="اكتب سبب طلب الإجازة..."
                value={formData.reason}
                onChange={(e) => handleChange('reason', e.target.value)}
                required
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                رقم التواصل أثناء الإجازة
              </label>
              <input
                type="tel"
                className="input w-full"
                placeholder="+966 5X XXX XXXX"
                value={formData.contactNumber}
                onChange={(e) => handleChange('contactNumber', e.target.value)}
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                مرفقات (اختياري)
              </label>
              <div className="border-2 border-dashed border-gray-300 rounded-xl p-6 text-center hover:border-primary-500 transition-colors">
                <Upload size={32} className="text-gray-400 mx-auto mb-2" />
                <p className="text-sm text-gray-600">اسحب الملفات هنا أو</p>
                <label className="text-primary-600 font-medium cursor-pointer hover:underline">
                  <input
                    type="file"
                    className="hidden"
                    onChange={(e) => handleChange('attachment', e.target.files?.[0] || null)}
                  />
                  اختر ملف
                </label>
                <p className="text-xs text-gray-400 mt-2">PDF, JPG, PNG (الحد الأقصى 5MB)</p>
              </div>
            </div>
          </div>
        </div>

        {/* Summary */}
        {formData.leaveType && formData.startDate && formData.endDate && (
          <div className="card bg-gray-50">
            <h2 className="text-lg font-bold text-gray-800 mb-4">ملخص الطلب</h2>
            <div className="space-y-3">
              <div className="flex justify-between">
                <span className="text-gray-600">نوع الإجازة:</span>
                <span className="font-medium text-gray-800">{selectedLeaveType?.name}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-600">من:</span>
                <span className="font-medium text-gray-800">
                  {new Date(formData.startDate).toLocaleDateString('ar-SA')}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-600">إلى:</span>
                <span className="font-medium text-gray-800">
                  {new Date(formData.endDate).toLocaleDateString('ar-SA')}
                </span>
              </div>
              <div className="flex justify-between pt-3 border-t border-gray-200">
                <span className="text-gray-600">المدة:</span>
                <span className="font-bold text-primary-600">{calculatedDays} يوم</span>
              </div>
            </div>
          </div>
        )}

        {/* Actions */}
        <div className="flex items-center justify-between">
          <Link href="/leaves" className="btn-secondary">
            إلغاء
          </Link>
          <button
            type="submit"
            className="btn-primary flex items-center gap-2"
            disabled={!formData.leaveType || !formData.startDate || !formData.endDate || !formData.reason}
          >
            <CheckCircle2 size={18} />
            تقديم الطلب
          </button>
        </div>
      </form>
    </MainLayout>
  )
}
