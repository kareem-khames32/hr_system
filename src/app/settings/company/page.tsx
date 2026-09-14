'use client'

import { useEffect, useRef, useState } from 'react'
import { MainLayout } from '@/components/layout'
import Link from 'next/link'
import {
  ArrowRight,
  Building2,
  Info,
  Save,
  Upload,
  Trash2,
  CheckCircle2,
  AlertCircle,
} from 'lucide-react'
import { fetchConfig, updateConfig, uploadFile, fetchFileObjectUrl } from '@/lib/api'

// بيانات الشركة — تُطبع في رأس المستندات المولَّدة من ملف الموظف وفي نصوصها
// (خطاب تعريف بالراتب، شهادة خبرة، خطابات البنك والسفارة، عقد العمل).
// مفاتيح إعدادات company.* تُنشأ فارغة عند إقلاع الخادم
interface CompanyField {
  key: string
  label: string
  hint?: string
  max: number
  ltr?: boolean
  required?: boolean
}
const FIELDS: CompanyField[] = [
  {
    key: 'company.name',
    label: 'اسم الشركة (عربي)',
    hint: 'الاسم الرسمي كاملاً كما يُكتب في الخطابات — بدونه لا تُنشأ الخطابات الرسمية',
    max: 200,
    required: true,
  },
  { key: 'company.name_en', label: 'اسم الشركة (إنجليزي)', max: 200, ltr: true },
  { key: 'company.commercial_register', label: 'رقم السجل التجاري', max: 50, ltr: true },
  { key: 'company.address', label: 'العنوان', max: 300 },
  { key: 'company.phone', label: 'الهاتف', max: 50, ltr: true },
]
const LOGO_KEY = 'company.logo_file_id'
const LOGO_MAX_BYTES = 2 * 1024 * 1024
const LOGO_TYPES = ['image/png', 'image/jpeg', 'image/webp']
const ALL_KEYS = [...FIELDS.map((f) => f.key), LOGO_KEY]

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
  const fileInput = useRef<HTMLInputElement>(null)

  useEffect(() => {
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
    if (dirtyKeys.length === 0) return
    setSaving(true)
    setError('')
    setSuccess('')
    try {
      const saved = { ...original }
      for (const key of dirtyKeys) {
        const value = (values[key] ?? '').trim()
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
            الاسم والسجل التجاري والشعار كما تظهر في المستندات المولَّدة من ملف الموظف
          </p>
        </div>

        {error && (
          <div className="bg-red-50 text-red-700 rounded-xl p-4 flex items-center gap-2">
            <AlertCircle size={20} />
            {error}
          </div>
        )}

        {!loading && missing.length > 0 && (
          <div className="bg-amber-50 text-amber-800 rounded-xl p-4 text-sm">
            بعض مفاتيح بيانات الشركة غير موجودة على الخادم بعد — أعد تشغيل الخادم لتُضاف
            فارغة ثم أعد تحميل الصفحة
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
              بدون اسم الشركة لا تُنشأ الخطابات الرسمية من ملف الموظف، والسجل التجاري والعنوان
              والهاتف يُطبعون فقط لو مضبوطين.
            </p>
          </div>
        </div>

        {loading ? (
          <div className="flex items-center justify-center py-20">
            <div className="w-8 h-8 border-2 border-primary-500 border-t-transparent rounded-full animate-spin" />
          </div>
        ) : (
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* الحقول */}
            <div className="card lg:col-span-2 space-y-4">
              <div className="flex items-center gap-3 mb-2">
                <div className="w-11 h-11 bg-gray-100 rounded-2xl flex items-center justify-center">
                  <Building2 size={22} className="text-gray-600" />
                </div>
                <h2 className="font-bold text-gray-800">بيانات المنشأة</h2>
              </div>
              {FIELDS.map((f) => (
                <div key={f.key}>
                  <label className="label">
                    {f.label}
                    {f.required && ' *'}
                  </label>
                  <input
                    type="text"
                    className="input"
                    dir={f.ltr ? 'ltr' : undefined}
                    maxLength={f.max}
                    value={values[f.key] ?? ''}
                    disabled={missing.includes(f.key)}
                    onChange={(e) => setVal(f.key, e.target.value)}
                  />
                  {f.hint && <p className="text-xs text-gray-400 mt-1">{f.hint}</p>}
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
              </div>

              {/* معاينة رأس المستند */}
              <div className="card">
                <h2 className="font-bold text-gray-800 mb-4">معاينة رأس المستند</h2>
                <div className="border border-gray-200 rounded-xl p-5 text-center">
                  {logoUrl && (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={logoUrl} alt="" className="h-14 mx-auto mb-2 object-contain" />
                  )}
                  <p className={`font-bold ${name ? 'text-gray-800' : 'text-gray-400'}`}>
                    {name || 'اسم الشركة غير مضبوط'}
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
                </div>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* شريط الحفظ السفلي — يظهر عند وجود تغييرات */}
      {!loading && (dirtyKeys.length > 0 || success) && (
        <div className="fixed bottom-0 inset-x-0 md:pr-64 z-30">
          <div className="bg-white border-t border-gray-200 shadow-lg px-6 py-3 flex items-center justify-between">
            {success ? (
              <span className="text-sm text-success-700 flex items-center gap-2">
                <CheckCircle2 size={18} />
                {success}
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
                disabled={saving || uploading || dirtyKeys.length === 0}
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
