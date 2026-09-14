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
  fetchActiveLeaveTypes,
  fetchMyBalances,
  fetchWorkingDays,
  createRequest,
  uploadFile,
  ApiError,
  type ApiBalance,
  type ApiLeaveTypeOption,
  type ApiRequest,
} from '@/lib/api'
import { statusLabels, type RequestStatus } from '@/data/requestsCatalog'

// نوع الإجازة من كتالوج السيرفر (الفعّال فقط) — النموذج الموحّد: طلب واحد «LEAVE» يحمل النوع
type ApiLeaveType = ApiLeaveTypeOption

type LeavePeriod = 'FULL' | 'MORNING' | 'EVENING'

const periodLabels: Record<LeavePeriod, string> = {
  FULL: 'يوم كامل',
  MORNING: 'النصف الصباحي',
  EVENING: 'النصف المسائي',
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
  })

  // نطاق اليوم: كامل أو نصف صباحي/مسائي (نصف اليوم = يوم واحد يُحتسب 0.5)
  const [period, setPeriod] = useState<LeavePeriod>('FULL')
  // أيام العمل الفعلية داخل المدى من السيرفر (نفس حساب الخصم) — مربوطة بالمدى المحسوب له
  const [workingDaysInfo, setWorkingDaysInfo] = useState<{
    from: string
    to: string
    total: number
    working: number
    skipped: string[]
  } | null>(null)
  // تعذّر حساب مدى — مربوط بالمدى نفسه: message = رسالة السيرفر لرفض 4xx (null = تعذّر
  // مؤقت)، rejected = 400 (المدى نفسه مرفوض، مثلاً أطول من الحد — وسيُرفض عند التقديم أيضاً)
  const [daysError, setDaysError] = useState<{
    from: string
    to: string
    message: string | null
    rejected: boolean
  } | null>(null)
  // مرجع الملف المرفوع (file:N) + اسمه للعرض + حالة الرفع
  const [attachmentRef, setAttachmentRef] = useState('')
  const [attachmentName, setAttachmentName] = useState('')
  const [uploading, setUploading] = useState(false)

  useEffect(() => {
    Promise.all([
      // endpoint الخدمة الذاتية (الفعّال فقط) — لا يحتاج settings.manage
      fetchActiveLeaveTypes(),
      fetchMyBalances().catch(() => [] as ApiBalance[]),
    ])
      .then(([types, bals]) => {
        setLeaveTypes(types)
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

  const isHalfDay = period !== 'FULL'

  const handleChange = (field: keyof typeof formData, value: string) => {
    setFormData((prev) => {
      const next = { ...prev, [field]: value }
      // نصف يوم = يوم واحد: النهاية تتبع البداية
      if (isHalfDay && field === 'startDate') next.endDate = value
      return next
    })
  }

  // تغيير نطاق اليوم: نصف يوم ⇒ النهاية = البداية (السيرفر يرفض غير ذلك)
  const changePeriod = (p: LeavePeriod) => {
    setPeriod(p)
    if (p !== 'FULL') setFormData((prev) => ({ ...prev, endDate: prev.startDate }))
  }

  // أيام العمل الفعلية من السيرفر لكل مدى (مؤجَّل + كاش لآخر مدى) —
  // نفس الحساب الذي يُخصم به الطلب (الويك إند والعطلات الرسمية لا تُحسب)
  useEffect(() => {
    const from = formData.startDate
    const to = formData.endDate
    if (!from || !to || from > to) {
      setWorkingDaysInfo(null)
      setDaysError(null)
      return
    }
    if (workingDaysInfo && workingDaysInfo.from === from && workingDaysInfo.to === to) return
    // ردّ مدى سابق يصل متأخراً (بعد تغيير التواريخ) يُهمل ولا يطغى على المدى الحالي
    let cancelled = false
    const timer = setTimeout(() => {
      // self: حساب الموظف نفسه (فرعه + ويك إند جدول عمله) = ما يُخصم عند التقديم
      fetchWorkingDays(from, to, { self: true })
        .then((res) => {
          if (cancelled) return
          setWorkingDaysInfo({ from, to, ...res })
          setDaysError(null)
        })
        .catch((err) => {
          if (cancelled) return
          setWorkingDaysInfo(null)
          // 4xx: رسالة السيرفر كما هي؛ غير ذلك تعذّر مؤقت والسيرفر يحسب عند التقديم
          const status = err instanceof ApiError ? err.status : 0
          setDaysError({
            from,
            to,
            message: status >= 400 && status < 500 && err instanceof Error ? err.message : null,
            rejected: status === 400,
          })
        })
    }, 400)
    return () => {
      cancelled = true
      clearTimeout(timer)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [formData.startDate, formData.endDate])

  const rangeSet =
    !!formData.startDate && !!formData.endDate && formData.startDate <= formData.endDate
  const daysInfo =
    rangeSet &&
    workingDaysInfo &&
    workingDaysInfo.from === formData.startDate &&
    workingDaysInfo.to === formData.endDate
      ? workingDaysInfo
      : null
  // خطأ الحساب للمدى الحالي فقط (خطأ مدى سابق لا يُعرض)
  const rangeError =
    rangeSet &&
    daysError &&
    daysError.from === formData.startDate &&
    daysError.to === formData.endDate
      ? daysError
      : null
  // المدة المحتسبة كما سيخصمها السيرفر: نصف يوم = 0.5، وإلا أيام العمل (null = لم تُحسب بعد)
  const effectiveDays: number | null = daysInfo
    ? daysInfo.working === 0
      ? 0
      : isHalfDay
        ? 0.5
        : daysInfo.working
    : null

  const selectedLeaveType = leaveTypes.find(t => t.code === formData.leaveType)
  const selectedBalance = selectedLeaveType ? balanceFor(selectedLeaveType) : null
  const attachmentRequired = (selectedLeaveType?.requiredAttachment ?? '').trim()

  // رفع فوري للمرفق — يخزّن مرجع file:N ليُرسل في payload.attachmentUrl
  const handleAttachment = async (file: File | null) => {
    if (!file) return
    setError('')
    setUploading(true)
    try {
      const res = await uploadFile(file, { entityType: 'request' })
      setAttachmentRef(res.ref)
      setAttachmentName(res.originalName ?? file.name)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'فشل رفع الملف')
    } finally {
      setUploading(false)
    }
  }

  // رسالة النجاح من الحالة الفعلية الراجعة (قد يُعتمد فوراً لو سلسلته «تنفيذ فوري»)
  // ومن الأيام المحتسبة على السيرفر
  const successMessage = (req: ApiRequest): string => {
    const label = statusLabels[req.status as RequestStatus] ?? req.status
    let days: unknown
    try {
      days = JSON.parse(req.payload ?? '{}').days
    } catch {
      days = undefined
    }
    const daysPart = typeof days === 'number' ? ` — المدة المحتسبة ${days} يوم` : ''
    if (req.status === 'SUBMITTED' || req.status === 'UNDER_REVIEW') {
      return `تم تقديم الطلب #${req.id} وهو الآن في مسار الموافقات (${label})${daysPart}`
    }
    if (['APPROVED', 'IN_EXECUTION', 'COMPLETED'].includes(req.status)) {
      return `تم تقديم الطلب #${req.id} واعتُمد مباشرة — الحالة: ${label}${daysPart}`
    }
    return `تم حفظ الطلب #${req.id} — الحالة: ${label}${daysPart}`
  }

  // الإرسال لمحرك الطلبات — طلب موحّد «LEAVE» والنوع في payload.leaveType.
  // السيرفر يعيد حساب أيام العمل الفعلية ويصحّح days، والرسائل العربية تُعرض كما هي
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!selectedLeaveType) return
    setError('')
    setSuccess('')
    if (attachmentRequired && !attachmentRef) {
      setError(`«${selectedLeaveType.nameAr}» تتطلب إرفاق: ${attachmentRequired}`)
      return
    }
    setSubmitting(true)
    try {
      const req = await createRequest('LEAVE', {
        fromDate: formData.startDate,
        // نصف يوم = يوم واحد (السيرفر يرفض غير ذلك)
        toDate: isHalfDay ? formData.startDate : formData.endDate,
        // حقل إلزامي — نفس حساب السيرفر، وهو يعيد الحساب ويصحّحه على أي حال
        days: effectiveDays ?? (isHalfDay ? 0.5 : 0),
        // نصف اليوم فقط — اليوم الكامل هو الافتراضي في السيرفر (لا «period: FULL» خام في الملخصات)
        ...(isHalfDay ? { period } : {}),
        leaveType: selectedLeaveType.code,
        reason: formData.reason,
        contactNumber: formData.contactNumber,
        ...(attachmentRef ? { attachmentUrl: attachmentRef } : {}),
      })
      setSuccess(successMessage(req))
      setFormData({
        leaveType: '',
        startDate: '',
        endDate: '',
        reason: '',
        contactNumber: '',
      })
      setAttachmentRef('')
      setAttachmentName('')
      setPeriod('FULL')
      setWorkingDaysInfo(null)
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
          <div className="mb-4">
            <label className="block text-sm font-medium text-gray-700 mb-2">نطاق اليوم</label>
            <select
              className="input w-full"
              value={period}
              onChange={(e) => changePeriod(e.target.value as LeavePeriod)}
            >
              {(Object.keys(periodLabels) as LeavePeriod[]).map((p) => (
                <option key={p} value={p}>
                  {periodLabels[p]}
                </option>
              ))}
            </select>
            {isHalfDay && (
              <p className="text-xs text-gray-500 mt-1.5">
                إجازة نصف يوم: تاريخ النهاية يطابق البداية ويُحتسب 0.5 يوم
              </p>
            )}
          </div>
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
                disabled={isHalfDay}
                required
              />
            </div>
          </div>

          {rangeSet && (
            <div className="mt-4 p-4 bg-primary-50 rounded-xl flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Calendar size={20} className="text-primary-600" />
                <span className="text-primary-800">المدة المحتسبة (أيام عمل)</span>
              </div>
              <span className="text-2xl font-bold text-primary-600">
                {effectiveDays === null ? (rangeError ? '—' : '…') : `${effectiveDays} يوم`}
              </span>
            </div>
          )}

          {/* تلميحات الحساب من السيرفر: كله عطلات / عطلات داخل المدى / رفض المدى (4xx برسالته) / تعذّر الحساب */}
          {daysInfo && daysInfo.working === 0 ? (
            <p className="flex items-center gap-1.5 text-xs text-red-700 bg-red-50 rounded-lg px-3 py-2 mt-2">
              <AlertCircle size={13} className="shrink-0" />
              كل الأيام المختارة عطلات (ويك إند/عطلة رسمية) — الطلب سيُرفض
            </p>
          ) : daysInfo && !isHalfDay && daysInfo.skipped.length > 0 ? (
            <p className="flex items-center gap-1.5 text-xs text-amber-700 bg-amber-50 rounded-lg px-3 py-2 mt-2">
              <AlertCircle size={13} className="shrink-0" />
              سيُخصم {daysInfo.working} يوم فقط — {daysInfo.skipped.length} يوم عطلة/ويك إند
              داخل المدى لا يُحسب
            </p>
          ) : rangeError?.message ? (
            <p className="flex items-center gap-1.5 text-xs text-red-700 bg-red-50 rounded-lg px-3 py-2 mt-2">
              <AlertCircle size={13} className="shrink-0" />
              {rangeError.message}
            </p>
          ) : rangeError ? (
            <p className="text-xs text-gray-500 mt-2">
              تعذّر حساب أيام العمل الآن — تُحسب على السيرفر عند التقديم
            </p>
          ) : rangeSet ? (
            <p className="text-xs text-gray-400 mt-2">
              أيام العمل الفعلية فقط (تُستبعد الويك إند والعطلات الرسمية) — نفس ما يُخصم من رصيدك
            </p>
          ) : null}

          {selectedLeaveType && selectedBalance !== null && affectsBalance(selectedLeaveType) && effectiveDays !== null && effectiveDays > selectedBalance && (
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
                {attachmentRequired ? (
                  <>
                    مرفق مطلوب: {attachmentRequired}{' '}
                    <span className="text-red-500">*</span>
                  </>
                ) : (
                  'مرفقات (اختياري)'
                )}
              </label>
              <div
                className={`border-2 border-dashed rounded-xl p-6 text-center transition-colors ${
                  attachmentRequired && !attachmentRef
                    ? 'border-red-300 hover:border-red-500'
                    : 'border-gray-300 hover:border-primary-500'
                }`}
              >
                {attachmentRef ? (
                  <div className="flex items-center justify-center gap-2 text-success-700">
                    <CheckCircle2 size={18} />
                    <span className="text-sm truncate max-w-[240px]">{attachmentName}</span>
                    <button
                      type="button"
                      className="text-red-500 text-xs underline"
                      onClick={() => {
                        setAttachmentRef('')
                        setAttachmentName('')
                      }}
                    >
                      إزالة
                    </button>
                  </div>
                ) : (
                  <>
                    <Upload size={32} className="text-gray-400 mx-auto mb-2" />
                    <p className="text-sm text-gray-600">اسحب الملفات هنا أو</p>
                    <label className="text-primary-600 font-medium cursor-pointer hover:underline">
                      <input
                        type="file"
                        className="hidden"
                        onChange={(e) => handleAttachment(e.target.files?.[0] ?? null)}
                      />
                      {uploading ? 'جارٍ الرفع...' : 'اختر ملف'}
                    </label>
                    <p className="text-xs text-gray-400 mt-2">PDF, JPG, PNG (الحد الأقصى 5MB)</p>
                  </>
                )}
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
              {isHalfDay && (
                <div className="flex justify-between">
                  <span className="text-gray-600">نطاق اليوم:</span>
                  <span className="font-medium text-gray-800">نصف يوم — {periodLabels[period]}</span>
                </div>
              )}
              <div className="flex justify-between pt-3 border-t border-gray-200">
                <span className="text-gray-600">المدة المحتسبة:</span>
                <span className="font-bold text-primary-600">
                  {effectiveDays === null ? (rangeError ? '—' : '…') : `${effectiveDays} يوم`}
                </span>
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
              !formData.reason ||
              // كل الأيام عطلات، أو المدى نفسه مرفوض (400) — السيرفر سيرفض
              effectiveDays === 0 ||
              !!rangeError?.rejected
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
