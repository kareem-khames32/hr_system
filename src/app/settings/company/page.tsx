'use client'

import { useEffect, useRef, useState, type ReactNode } from 'react'
import { MainLayout } from '@/components/layout'
import Link from 'next/link'
import {
  ArrowRight,
  Building2,
  FileBadge,
  Info,
  Landmark,
  MapPin,
  Phone,
  Save,
  ShieldCheck,
  Upload,
  Trash2,
  CheckCircle2,
  AlertCircle,
} from 'lucide-react'
import { fetchConfig, updateConfig, uploadFile, fetchFileObjectUrl, getCurrentUser } from '@/lib/api'
import { COMPANY_NAME_PLACEHOLDER, isDataPlaceholder } from '@/lib/data-placeholders'

// بيانات الشركة — تُطبع في رأس المستندات المولَّدة من ملف الموظف وفي نصوصها
// (خطاب تعريف بالراتب، شهادة خبرة، خطابات البنك والسفارة، عقد العمل)، ومعاها أرقام المنشأة الرسمية وبنك الرواتب.
// مفاتيح إعدادات company.* تُنشأ فارغة عند إقلاع الخادم (والجديدة بترحيل 051). التعديل لحساب على مستوى الشركة بس.
interface CompanyField {
  key: string
  label: string
  hint?: string
  placeholder?: string
  max: number
  ltr?: boolean
  required?: boolean
  type?: 'text' | 'date' | 'email'
  /** تحقق خفيف — نفس قواعد الخادم (api/src/settings/company-profile.ts) */
  check?: (value: string) => string | null
  /** تنظيف قبل الحفظ (مثلاً شيل المسافات من الآيبان) */
  normalize?: (value: string) => string
  wide?: boolean
}

const digits = (min: number, max: number, message: string) => (value: string) =>
  new RegExp(`^\\d{${min},${max}}$`).test(value) ? null : message

interface CompanyCard {
  id: string
  title: string
  icon: ReactNode
  note?: string
  fields: CompanyField[]
}

const CARDS: CompanyCard[] = [
  {
    id: 'name',
    title: 'الاسم الرسمي',
    icon: <Building2 size={22} className="text-gray-600" />,
    fields: [
      {
        key: 'company.name',
        label: 'اسم الشركة (عربي)',
        hint: 'الاسم الرسمي كاملاً كما يُكتب في الخطابات — بدونه لا تُنشأ الخطابات الرسمية',
        max: 200,
        required: true,
        wide: true,
      },
      { key: 'company.name_en', label: 'اسم الشركة (إنجليزي)', max: 200, ltr: true, wide: true },
    ],
  },
  {
    id: 'registers',
    title: 'السجل والأرقام الرسمية',
    icon: <FileBadge size={22} className="text-gray-600" />,
    fields: [
      { key: 'company.commercial_register', label: 'رقم السجل التجاري', max: 50, ltr: true },
      {
        key: 'company.commercial_register_expiry',
        label: 'تاريخ انتهاء السجل التجاري',
        max: 10,
        type: 'date',
        check: (v) => (/^\d{4}-\d{2}-\d{2}$/.test(v) ? null : 'اكتب التاريخ صح'),
      },
      {
        key: 'company.vat_number',
        label: 'الرقم الضريبي',
        placeholder: '300000000000003',
        max: 15,
        ltr: true,
        check: digits(9, 15, 'الرقم الضريبي أرقام بس (من 9 لـ 15 رقم)'),
      },
      {
        key: 'company.unified_number',
        label: 'الرقم الموحد (700)',
        placeholder: '7000000000',
        max: 10,
        ltr: true,
        check: (v) => (/^7\d{9}$/.test(v) ? null : 'الرقم الموحد 10 أرقام ويبدأ بـ 7'),
      },
      {
        key: 'company.qiwa_establishment_number',
        label: 'رقم المنشأة في وزارة الموارد البشرية / قوى',
        placeholder: '1-2345678',
        max: 30,
        ltr: true,
        check: (v) => (/^[\d-]{1,30}$/.test(v) ? null : 'أرقام بس (ممكن بشرطة)'),
      },
    ],
  },
  {
    id: 'insurance',
    title: 'التأمينات الاجتماعية',
    icon: <ShieldCheck size={22} className="text-gray-600" />,
    note: 'اكتب رقم الدولة اللي الشركة مسجلة فيها — والتاني سيبه فاضي',
    fields: [
      {
        key: 'company.gosi_establishment_number',
        label: 'رقم المنشأة في التأمينات الاجتماعية (GOSI — السعودية)',
        max: 20,
        ltr: true,
        check: digits(1, 20, 'رقم منشأة التأمينات أرقام بس'),
      },
      {
        key: 'company.eg_insurance_establishment_number',
        label: 'رقم المنشأة في هيئة التأمينات الاجتماعية (مصر)',
        max: 20,
        ltr: true,
        check: digits(1, 20, 'رقم المنشأة في التأمينات المصرية أرقام بس'),
      },
    ],
  },
  {
    id: 'address',
    title: 'العنوان الوطني',
    icon: <MapPin size={22} className="text-gray-600" />,
    fields: [
      {
        key: 'company.national_address_building_no',
        label: 'رقم المبنى',
        max: 10,
        ltr: true,
        check: digits(1, 10, 'رقم المبنى أرقام بس'),
      },
      { key: 'company.national_address_street', label: 'الشارع', max: 150 },
      { key: 'company.national_address_district', label: 'الحي', max: 150 },
      { key: 'company.national_address_city', label: 'المدينة', max: 100 },
      {
        key: 'company.national_address_postal_code',
        label: 'الرمز البريدي',
        max: 5,
        ltr: true,
        check: digits(5, 5, 'الرمز البريدي 5 أرقام'),
      },
      {
        key: 'company.national_address_additional_no',
        label: 'الرقم الإضافي',
        max: 10,
        ltr: true,
        check: digits(1, 10, 'الرقم الإضافي أرقام بس'),
      },
      {
        key: 'company.address',
        label: 'العنوان في الخطابات',
        hint: 'سطر واحد بيتطبع في الخطابات والشهادات',
        max: 300,
        wide: true,
      },
    ],
  },
  {
    id: 'contact',
    title: 'التواصل',
    icon: <Phone size={22} className="text-gray-600" />,
    fields: [
      { key: 'company.phone', label: 'الهاتف', max: 50, ltr: true },
      {
        key: 'company.email',
        label: 'البريد الإلكتروني',
        placeholder: 'hr@company.com',
        max: 200,
        ltr: true,
        type: 'email',
        check: (v) => (/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(v) ? null : 'البريد الإلكتروني مش صحيح'),
      },
      {
        key: 'company.website',
        label: 'الموقع الإلكتروني',
        placeholder: 'www.company.com',
        max: 200,
        ltr: true,
        check: (v) =>
          /^(https?:\/\/)?[^\s/.]+(\.[^\s/.]+)+(\/\S*)?$/i.test(v) ? null : 'الموقع الإلكتروني مش صحيح (مثال: www.example.com)',
      },
    ],
  },
  {
    id: 'bank',
    title: 'بنك الرواتب',
    icon: <Landmark size={22} className="text-gray-600" />,
    note: 'الحساب اللي بتتصرف منه الرواتب — بيُستخدم في ملفات التحويل وحماية الأجور',
    fields: [
      { key: 'company.payroll_bank_name', label: 'اسم البنك', max: 150 },
      {
        key: 'company.payroll_iban',
        label: 'رقم الآيبان (IBAN)',
        placeholder: 'SA0000000000000000000000',
        hint: 'SA وبعده 22 رقم، أو EG وبعده 27 رقم',
        max: 40,
        ltr: true,
        normalize: (v) => v.replace(/\s+/g, '').toUpperCase(),
        check: (v) =>
          /^(SA\d{22}|EG\d{27})$/.test(v) ? null : 'الآيبان يبدأ بـ SA وبعده 22 رقم، أو EG وبعده 27 رقم',
      },
      {
        key: 'company.wps_establishment_id',
        label: 'رقم المنشأة في حماية الأجور / مدد',
        max: 30,
        ltr: true,
        check: (v) => (/^[A-Za-z0-9-]{1,30}$/.test(v) ? null : 'حروف إنجليزي وأرقام بس'),
      },
    ],
  },
]

const FIELDS: CompanyField[] = CARDS.flatMap((c) => c.fields)
const LOGO_KEY = 'company.logo_file_id'
const LOGO_MAX_BYTES = 2 * 1024 * 1024
const LOGO_TYPES = ['image/png', 'image/jpeg', 'image/webp']
const ALL_KEYS = [...FIELDS.map((f) => f.key), LOGO_KEY]
const FIELD_BY_KEY = new Map(FIELDS.map((f) => [f.key, f]))

const cleanValue = (key: string, value: string) => {
  const field = FIELD_BY_KEY.get(key)
  const trimmed = (value ?? '').trim()
  return field?.normalize ? field.normalize(trimmed) : trimmed
}
const fieldError = (field: CompanyField, value: string) => {
  const clean = cleanValue(field.key, value)
  return clean && field.check ? field.check(clean) : null
}

export default function CompanySettingsPage() {
  const [values, setValues] = useState<Record<string, string>>({})
  const [original, setOriginal] = useState<Record<string, string>>({})
  const [missing, setMissing] = useState<string[]>([])
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [uploading, setUploading] = useState(false)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')
  const [logoUrl, setLogoUrl] = useState<string | null>(null)
  const [readOnly, setReadOnly] = useState(false)
  const fileInput = useRef<HTMLInputElement>(null)

  useEffect(() => {
    // بيانات الشركة لكل الشركة — حساب الفرع يشوفها بس
    setReadOnly(getCurrentUser()?.role !== 'super_admin')
    fetchConfig()
      .then((rows) => {
        const map: Record<string, string> = {}
        rows.forEach((r) => {
          if (ALL_KEYS.includes(r.key)) map[r.key] = r.value ?? ''
        })
        setValues(map)
        setOriginal(map)
        // مفتاح غير موجود = الخادم لم يُعد تشغيله بعد إضافة المفاتيح
        setMissing(ALL_KEYS.filter((k) => !(k in map)))
      })
      .catch((e) => setError(e instanceof Error ? e.message : 'تعذر تحميل بيانات الشركة'))
      .finally(() => setLoading(false))
  }, [])

  // معاينة الشعار — رابط blob بالتوكن (يُلغى عند التغيير أو التفريغ)
  const logoId = Number(values[LOGO_KEY] || 0)
  useEffect(() => {
    if (!logoId) {
      setLogoUrl(null)
      return
    }
    let active = true
    let created: string | null = null
    fetchFileObjectUrl(logoId).then((url) => {
      if (!active) {
        if (url) URL.revokeObjectURL(url)
        return
      }
      created = url
      setLogoUrl(url)
    })
    return () => {
      active = false
      if (created) URL.revokeObjectURL(created)
    }
  }, [logoId])

  const dirtyKeys = ALL_KEYS.filter(
    (k) => !missing.includes(k) && (values[k] ?? '') !== (original[k] ?? '')
  )
  const errors = Object.fromEntries(
    FIELDS.map((f) => [f.key, fieldError(f, values[f.key] ?? '')] as const).filter(([, e]) => e)
  ) as Record<string, string>
  const dirtyErrors = dirtyKeys.filter((k) => errors[k])

  const setVal = (key: string, value: string) => {
    setValues((prev) => ({ ...prev, [key]: value }))
    setSuccess('')
  }

  // الشعار يُرفع فوراً (للحصول على معرّف الملف) ويُحفظ مرجعه مع باقي الحقول
  const handleLogo = async (file?: File) => {
    if (!file) return
    setError('')
    if (!LOGO_TYPES.includes(file.type)) {
      setError('الشعار صورة PNG أو JPG أو WEBP فقط')
      return
    }
    if (file.size > LOGO_MAX_BYTES) {
      setError('حجم الشعار لا يتجاوز 2MB')
      return
    }
    setUploading(true)
    try {
      const up = await uploadFile(file, { entityType: 'company_logo' })
      setVal(LOGO_KEY, String(up.id))
    } catch (e) {
      setError(e instanceof Error ? e.message : 'تعذر رفع الشعار')
    } finally {
      setUploading(false)
      if (fileInput.current) fileInput.current.value = ''
    }
  }

  const handleSave = async () => {
    if (dirtyKeys.length === 0 || readOnly) return
    if (dirtyErrors.length > 0) {
      setError('صحّح الحقول اللي عليها ملاحظة الأول')
      return
    }
    setSaving(true)
    setError('')
    setSuccess('')
    try {
      const saved = { ...original }
      for (const key of dirtyKeys) {
        const value = cleanValue(key, values[key] ?? '')
        await updateConfig(key, value)
        saved[key] = value
      }
      setValues((prev) => ({ ...prev, ...saved }))
      setOriginal(saved)
      setSuccess('تم حفظ بيانات الشركة — تظهر في المستندات المولَّدة من الآن')
    } catch (e) {
      setError(e instanceof Error ? e.message : 'تعذر حفظ بيانات الشركة')
    } finally {
      setSaving(false)
    }
  }

  const name = (values['company.name'] ?? '').trim()
  // قيمة مؤقتة كتبها ترحيل الخطوة 9 — تُعامل كاسم غير مضبوط
  const namePlaceholder = isDataPlaceholder(name)
  // تنبيه انتهاء السجل التجاري: منتهي أو فاضل عليه أقل من 60 يوم
  const crExpiry = (values['company.commercial_register_expiry'] ?? '').trim()
  const today = new Date().toLocaleDateString('en-CA')
  const crDaysLeft = /^\d{4}-\d{2}-\d{2}$/.test(crExpiry)
    ? Math.round((Date.parse(`${crExpiry}T00:00:00Z`) - Date.parse(`${today}T00:00:00Z`)) / 86_400_000)
    : null

  const renderField = (f: CompanyField) => {
    const err = errors[f.key]
    const disabled = missing.includes(f.key) || readOnly
    return (
      <div key={f.key} className={f.wide ? 'md:col-span-2' : undefined}>
        <label className="label">
          {f.label}
          {f.required && ' *'}
        </label>
        <input
          type={f.type ?? 'text'}
          className={`input ${err ? 'border-danger-500' : ''}`}
          dir={f.ltr ? 'ltr' : undefined}
          maxLength={f.max}
          placeholder={f.placeholder}
          value={values[f.key] ?? ''}
          disabled={disabled}
          onChange={(e) => setVal(f.key, e.target.value)}
        />
        {err ? (
          <p className="text-xs text-danger-600 mt-1">{err}</p>
        ) : (
          f.hint && <p className="text-xs text-gray-400 mt-1">{f.hint}</p>
        )}
      </div>
    )
  }

  return (
    <MainLayout>
      <div className="space-y-6 pb-24">
        {/* Breadcrumb */}
        <div className="flex items-center gap-2 text-sm text-gray-500">
          <Link href="/settings" className="hover:text-primary-600">
            الإعدادات
          </Link>
          <ArrowRight size={16} />
          <span className="text-gray-800">بيانات الشركة</span>
        </div>

        {/* Header */}
        <div>
          <h1 className="text-2xl font-bold text-gray-800">بيانات الشركة</h1>
          <p className="text-gray-500 mt-1">
            الاسم والسجلات والأرقام الرسمية والعنوان الوطني وبنك الرواتب والشعار
          </p>
        </div>

        {error && (
          <div className="bg-red-50 text-red-700 rounded-xl p-4 flex items-center gap-2">
            <AlertCircle size={20} />
            {error}
          </div>
        )}

        {!loading && readOnly && (
          <div className="bg-gray-50 text-gray-700 rounded-xl p-4 text-sm">
            بيانات الشركة لكل الشركة — بتتعدل من حساب على مستوى الشركة، وحسابك يشوفها بس
          </div>
        )}

        {!loading && missing.length > 0 && (
          <div className="bg-amber-50 text-amber-800 rounded-xl p-4 text-sm">
            بعض مفاتيح بيانات الشركة غير موجودة على الخادم بعد — أعد تشغيل الخادم لتُضاف
            فارغة ثم أعد تحميل الصفحة
          </div>
        )}

        {!loading && namePlaceholder && (
          <div className="bg-amber-50 text-amber-800 rounded-xl p-4 text-sm flex items-start gap-2">
            <AlertCircle size={18} className="mt-0.5 shrink-0" />
            <span>
              اسم الشركة الحالي قيمة مؤقتة كتبها ترحيل تنظيف البيانات («{COMPANY_NAME_PLACEHOLDER}»).
              أدخل الاسم الرسمي واحفظ — الخطابات الرسمية لا تُصدر بالاسم المؤقت.
            </span>
          </div>
        )}

        {!loading && crDaysLeft !== null && crDaysLeft <= 60 && (
          <div className="bg-amber-50 text-amber-800 rounded-xl p-4 text-sm flex items-center gap-2">
            <AlertCircle size={18} className="shrink-0" />
            {crDaysLeft < 0
              ? `السجل التجاري منتهي من ${-crDaysLeft} يوم — جدده وحدّث التاريخ`
              : `السجل التجاري بينتهي بعد ${crDaysLeft} يوم`}
          </div>
        )}

        {/* Info */}
        <div className="p-4 bg-blue-50 rounded-xl flex items-start gap-3">
          <Info size={20} className="text-blue-500 mt-0.5" />
          <div className="text-sm text-blue-700">
            <p className="font-medium">
              تُستخدم في خطاب التعريف بالراتب وشهادة الخبرة وخطابات البنك والسفارة وعقد العمل
            </p>
            <p className="mt-1">
              بدون اسم الشركة لا تُنشأ الخطابات الرسمية من ملف الموظف. أي خانة فاضية = مش مضبوطة ومش بتتطبع.
            </p>
          </div>
        </div>

        {loading ? (
          <div className="flex items-center justify-center py-20">
            <div className="w-8 h-8 border-2 border-primary-500 border-t-transparent rounded-full animate-spin" />
          </div>
        ) : (
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* الحقول في كروت */}
            <div className="lg:col-span-2 space-y-6">
              {CARDS.map((card) => (
                <div key={card.id} className="card space-y-4">
                  <div className="flex items-center gap-3">
                    <div className="w-11 h-11 bg-gray-100 rounded-2xl flex items-center justify-center">
                      {card.icon}
                    </div>
                    <div>
                      <h2 className="font-bold text-gray-800">{card.title}</h2>
                      {card.note && <p className="text-xs text-gray-500 mt-0.5">{card.note}</p>}
                    </div>
                  </div>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">{card.fields.map(renderField)}</div>
                </div>
              ))}
            </div>

            <div className="space-y-6">
              {/* الشعار */}
              <div className="card space-y-4">
                <h2 className="font-bold text-gray-800">شعار الشركة</h2>
                <div className="w-full h-36 bg-gray-50 rounded-2xl flex items-center justify-center border-2 border-dashed border-gray-200 overflow-hidden">
                  {logoUrl ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={logoUrl} alt="شعار الشركة" className="max-h-32 max-w-full object-contain" />
                  ) : (
                    <Building2 size={40} className="text-gray-300" />
                  )}
                </div>
                <p className="text-xs text-gray-500">
                  PNG أو JPG أو WEBP حتى 2MB — يظهر أعلى المستند المطبوع
                </p>
                <input
                  ref={fileInput}
                  type="file"
                  accept={LOGO_TYPES.join(',')}
                  className="hidden"
                  onChange={(e) => handleLogo(e.target.files?.[0])}
                />
                {!readOnly && (
                  <div className="flex gap-2">
                    <button
                      type="button"
                      onClick={() => fileInput.current?.click()}
                      className="btn-secondary text-sm flex items-center gap-2"
                      disabled={uploading || missing.includes(LOGO_KEY)}
                    >
                      <Upload size={16} />
                      {uploading ? 'جارٍ الرفع...' : logoId ? 'تغيير الشعار' : 'رفع شعار'}
                    </button>
                    {logoId > 0 && (
                      <button
                        type="button"
                        onClick={() => setVal(LOGO_KEY, '')}
                        className="btn-secondary text-sm flex items-center gap-2 text-danger-600"
                      >
                        <Trash2 size={16} />
                        إزالة
                      </button>
                    )}
                  </div>
                )}
              </div>

              {/* معاينة رأس المستند */}
              <div className="card">
                <h2 className="font-bold text-gray-800 mb-4">معاينة رأس المستند</h2>
                <div className="border border-gray-200 rounded-xl p-5 text-center">
                  {logoUrl && (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={logoUrl} alt="" className="h-14 mx-auto mb-2 object-contain" />
                  )}
                  <p className={`font-bold ${name && !namePlaceholder ? 'text-gray-800' : 'text-gray-400'}`}>
                    {name && !namePlaceholder ? name : 'اسم الشركة غير مضبوط'}
                  </p>
                  {values['company.name_en']?.trim() && (
                    <p className="text-sm text-gray-500" dir="ltr">
                      {values['company.name_en'].trim()}
                    </p>
                  )}
                  {values['company.commercial_register']?.trim() && (
                    <p className="text-xs text-gray-500 mt-1">
                      السجل التجاري:{' '}
                      <span dir="ltr">{values['company.commercial_register'].trim()}</span>
                    </p>
                  )}
                  {values['company.vat_number']?.trim() && (
                    <p className="text-xs text-gray-500 mt-1">
                      الرقم الضريبي: <span dir="ltr">{values['company.vat_number'].trim()}</span>
                    </p>
                  )}
                </div>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* شريط الحفظ السفلي — يظهر عند وجود تغييرات */}
      {!loading && !readOnly && (dirtyKeys.length > 0 || success) && (
        <div className="fixed bottom-0 inset-x-0 md:pr-64 z-30">
          <div className="bg-white border-t border-gray-200 shadow-lg px-6 py-3 flex items-center justify-between">
            {success ? (
              <span className="text-sm text-success-700 flex items-center gap-2">
                <CheckCircle2 size={18} />
                {success}
              </span>
            ) : dirtyErrors.length > 0 ? (
              <span className="text-sm text-danger-600">
                {dirtyErrors.length} حقل صيغته مش صحيحة — صحّحه قبل الحفظ
              </span>
            ) : (
              <span className="text-sm text-gray-500">
                {dirtyKeys.length} حقل معدّل بانتظار الحفظ
              </span>
            )}
            <div className="flex items-center gap-2">
              {dirtyKeys.length > 0 && (
                <button
                  onClick={() => {
                    setValues({ ...original })
                    setSuccess('')
                  }}
                  className="btn-secondary"
                  disabled={saving}
                >
                  تراجع
                </button>
              )}
              <button
                onClick={handleSave}
                className="btn-primary flex items-center gap-2"
                disabled={saving || uploading || dirtyKeys.length === 0 || dirtyErrors.length > 0}
              >
                <Save size={18} />
                {saving ? 'جارٍ الحفظ...' : 'حفظ التغييرات'}
              </button>
            </div>
          </div>
        </div>
      )}
    </MainLayout>
  )
}
