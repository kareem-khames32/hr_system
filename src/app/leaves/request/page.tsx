'use client'

import { useEffect, useState } from 'react'
import { MainLayout } from '@/components/layout'
import {
  ArrowRight,
  Calendar,
  Upload,
  AlertCircle,
  CheckCircle2,
} from 'lucide-react'
import Link from 'next/link'
import {
  fetchLeaveTypes,
  fetchMyBalances,
  createRequest,
  type ApiBalance,
} from '@/lib/api'

// نوع الإجازة من كتالوج السيرفر — النموذج الموحّد: طلب واحد «LEAVE» يحمل النوع
interface ApiLeaveType {
  id: number
  code: string // ANNUAL, SICK, UNPAID...
  nameAr: string
  isPaid: boolean
  balanceSource: string | null // annual | sick | none
  requiredAttachment: string | null
  maxDays: number | null
  oncePerService: boolean
  isActive: boolean
}

// لون كل نوع حسب كوده (الأنواع نفسها تأتي من كتالوج أنواع الإجازة في السيرفر)
const TYPE_COLORS: Record<string, string> = {
  ANNUAL: 'bg-blue-500',
  SICK: 'bg-red-500',
  CASUAL: 'bg-orange-500',
  UNPAID: 'bg-gray-500',
  MARRIAGE: 'bg-pink-500',
  MATERNITY: 'bg-purple-500',
  PATERNITY: 'bg-indigo-500',
  HAJJ: 'bg-green-500',
  BEREAVEMENT: 'bg-slate-500',
  EXAM: 'bg-teal-500',
  COMPENSATORY: 'bg-cyan-500',
}

// هل النوع يخصم من رصيد (annual/sick...) أم لا (none/بلا مصدر)
const affectsBalance = (lt: ApiLeaveType) => {
  const s = (lt.balanceSource ?? '').toLowerCase()
  return s !== '' && s !== 'none'
}

export default function LeaveRequestPage() {
  const [leaveTypes, setLeaveTypes] = useState<ApiLeaveType[]>([])
  const [balances, setBalances] = useState<ApiBalance[]>([])
  const [loading, setLoading] = useState(true)
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')

  const [formData, setFormData] = useState({
    leaveType: '', // كود نوع الإجازة مثل ANNUAL — يُرسل في payload.leaveType
    startDate: '',
    endDate: '',
    reason: '',
    contactNumber: '',
    attachment: null as File | null,
  })

  const [calculatedDays, setCalculatedDays] = useState(0)

  useEffect(() => {
    Promise.all([
      fetchLeaveTypes(),
      fetchMyBalances().catch(() => [] as ApiBalance[]),
    ])
      .then(([types, bals]) => {
        setLeaveTypes((types as ApiLeaveType[]).filter((t) => t.isActive))
        setBalances(bals)
      })
      .catch((e) => setError(e instanceof Error ? e.message : 'تعذر تحميل أنواع الإجازات'))
      .finally(() => setLoading(false))
  }, [])

  // رصيد النوع المحدد إن كان له مصدر رصيد (annual/sick/...)
  const balanceFor = (lt: ApiLeaveType): number | null => {
    const source = (lt.balanceSource ?? '').toLowerCase()
    if (!source || source === 'none') return null
    const bal = balances.find((b) => b.balanceType.toLowerCase() === source)
    return bal ? Number(bal.remaining) : null
  }

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

  const selectedLeaveType = leaveTypes.find(t => t.code === formData.leaveType)
  const selectedBalance = selectedLeaveType ? balanceFor(selectedLeaveType) : null

  // الإرسال لمحرك الطلبات — طلب موحّد «LEAVE» والنوع في payload.leaveType.
  // السيرفر يعيد حساب أيام العمل الفعلية ويصحّح days، والرسائل العربية تُعرض كما هي
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!selectedLeaveType) return
    setError('')
    setSuccess('')
    setSubmitting(true)
    try {
      const req = await createRequest('LEAVE', {
        fromDate: formData.startDate,
        toDate: formData.endDate,
        days: calculatedDays,
        leaveType: selectedLeaveType.code,
        reason: formData.reason,
        contactNumber: formData.contactNumber,
      })
      setSuccess(`تم تقديم الطلب بنجاح — رقم الطلب #${req.id} وهو الآن في مسار الموافقات`)
      setFormData({
        leaveType: '',
        startDate: '',
        endDate: '',
        reason: '',
        contactNumber: '',
        attachment: null,
      })
      setCalculatedDays(0)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'تعذر تقديم الطلب')
    } finally {
      setSubmitting(false)
    }
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

        {/* Success / Error Banners */}
        {success && (
          <div className="bg-success-50 text-success-700 rounded-xl p-4 flex items-center gap-2">
            <CheckCircle2 size={20} />
            {success}
          </div>
        )}
        {error && (
          <div className="bg-red-50 text-red-700 rounded-xl p-4 flex items-center gap-2">
            <AlertCircle size={20} />
            {error}
          </div>
        )}

        {/* Leave Type Selection — من كتالوج أنواع الإجازة في السيرفر */}
        <div className="card">
          <h2 className="text-lg font-bold text-gray-800 mb-4">نوع الإجازة</h2>
          {loading ? (
            <div className="flex items-center justify-center py-8">
              <div className="w-8 h-8 border-2 border-primary-500 border-t-transparent rounded-full animate-spin" />
            </div>
          ) : (
            <div className="grid grid-cols-4 gap-3">
              {leaveTypes.map((type) => {
                const remaining = balanceFor(type)
                return (
                  <button
                    key={type.code}
                    type="button"
                    onClick={() => handleChange('leaveType', type.code)}
                    className={`p-4 rounded-xl border-2 text-right transition-all ${
                      formData.leaveType === type.code
                        ? 'border-primary-500 bg-primary-50'
                        : 'border-gray-200 hover:border-gray-300'
                    }`}
                  >
                    <div className={`w-3 h-3 rounded-full ${TYPE_COLORS[type.code] ?? 'bg-gray-400'} mb-2`} />
                    <p className="font-medium text-gray-800 text-sm">{type.nameAr}</p>
                    {remaining !== null && affectsBalance(type) && (
                      <p className="text-xs text-gray-500 mt-1">الرصيد: {remaining} يوم</p>
                    )}
                    {!affectsBalance(type) && (
                      <p className="text-xs text-gray-400 mt-1">
                        {type.isPaid ? 'لا تُخصم من رصيد' : 'بدون راتب'}
                      </p>
                    )}
                  </button>
                )
              })}
            </div>
          )}
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
                <span className="text-primary-800">مدة الإجازة (المبدئية)</span>
              </div>
              <span className="text-2xl font-bold text-primary-600">{calculatedDays} يوم</span>
            </div>
          )}

          {calculatedDays > 0 && (
            <p className="text-xs text-gray-400 mt-2">
              يُعاد حساب الأيام على السيرفر بأيام العمل الفعلية فقط (تُستبعد الويك إند والعطلات الرسمية)
            </p>
          )}

          {selectedLeaveType && selectedBalance !== null && affectsBalance(selectedLeaveType) && calculatedDays > selectedBalance && (
            <div className="mt-4 p-4 bg-red-50 rounded-xl flex items-center gap-2 text-red-700">
              <AlertCircle size={20} />
              <span>مدة الإجازة المطلوبة تتجاوز الرصيد المتاح ({selectedBalance} يوم)</span>
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
                <span className="font-medium text-gray-800">{selectedLeaveType?.nameAr}</span>
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
                <span className="text-gray-600">المدة (المبدئية):</span>
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
            disabled={
              submitting ||
              !formData.leaveType ||
              !formData.startDate ||
              !formData.endDate ||
              !formData.reason
            }
          >
            <CheckCircle2 size={18} />
            {submitting ? 'جارٍ التقديم...' : 'تقديم الطلب'}
          </button>
        </div>
      </form>
    </MainLayout>
  )
}
