'use client'

import { useEffect, useState } from 'react'
import { MainLayout } from '@/components/layout'
import Link from 'next/link'
import {
  ArrowRight,
  Info,
  Save,
  Calendar,
  Clock,
  Timer,
  Wallet,
  CheckCircle2,
  AlertCircle,
} from 'lucide-react'
import { fetchConfig, updateConfig } from '@/lib/api'

// حقل سياسة — يعرض ويعدّل مفتاح إعداد فعلياً على الخادم
type FieldType = 'number' | 'text' | 'bool' | 'select'
interface PolicyField {
  key: string
  label: string
  type: FieldType
  hint?: string
  unit?: string
  min?: number // الحد الأدنى للحقول الرقمية (المقسوم عليه ≥ 1)
  options?: { value: string; label: string }[]
}
interface PolicyGroup {
  title: string
  icon: typeof Calendar
  iconBg: string
  iconColor: string
  fields: PolicyField[]
}

// المجموعات ومفاتيحها — كلها مفاتيح موجودة في إعدادات المحرك (requests_config)
const GROUPS: PolicyGroup[] = [
  {
    title: 'الإجازات',
    icon: Calendar,
    iconBg: 'bg-primary-50',
    iconColor: 'text-primary-500',
    fields: [
      { key: 'leave.annual_entitled', label: 'الإجازة السنوية', type: 'number', unit: 'يوم/سنة', hint: 'الاستحقاق الأساسي — نظام العمل السعودي 21 يوم' },
      {
        key: 'leave.accrual_mode', label: 'طريقة الاستحقاق', type: 'select',
        options: [
          { value: 'monthly', label: 'شهري (يتراكم كل شهر)' },
          { value: 'yearly', label: 'سنوي (دفعة واحدة)' },
          { value: 'daily', label: 'يومي (تراكمي)' },
        ],
      },
      { key: 'leave.probation_months', label: 'فترة التجربة قبل بدء الاستحقاق', type: 'number', unit: 'شهر' },
      { key: 'leave.carryover_max_days', label: 'الحد الأقصى للترحيل', type: 'number', unit: 'يوم' },
      { key: 'leave.carryover_expiry_months', label: 'صلاحية الرصيد المُرحّل', type: 'number', unit: 'شهر' },
    ],
  },
  {
    title: 'الحضور والتأخير',
    icon: Clock,
    iconBg: 'bg-blue-50',
    iconColor: 'text-blue-500',
    fields: [
      { key: 'attendance.grace_minutes', label: 'سماحية التأخير', type: 'number', unit: 'دقيقة', hint: 'التأخير ضمن هذه المدة لا يُحتسب' },
      { key: 'attendance.weekend_days', label: 'أيام نهاية الأسبوع', type: 'text', hint: 'رموز الأيام مفصولة بفاصلة — SUN,MON,TUE,WED,THU,FRI,SAT' },
      { key: 'payroll.late_deduction_enabled', label: 'خصم التأخير من الراتب', type: 'bool' },
    ],
  },
  {
    title: 'العمل الإضافي (الأوفرتايم)',
    icon: Timer,
    iconBg: 'bg-warning-50',
    iconColor: 'text-warning-500',
    fields: [
      { key: 'overtime.detection_threshold_hours', label: 'عتبة اكتشاف الأوفرتايم', type: 'number', unit: 'ساعة', hint: 'أقل من هذه المدة بعد الوردية لا يُكتشف كأوفرتايم' },
      { key: 'overtime.biometric_requires_confirmation', label: 'الأوفرتايم المكتشف يحتاج تأكيد المدير', type: 'bool' },
    ],
  },
  {
    title: 'المسير ونهاية الخدمة',
    icon: Wallet,
    iconBg: 'bg-success-50',
    iconColor: 'text-success-500',
    fields: [
      { key: 'eos.months_per_year', label: 'مكافأة نهاية الخدمة', type: 'number', unit: 'شهر/سنة', min: 0 },
      { key: 'payroll.cycle_start_day', label: 'يوم بداية دورة المسير', type: 'number', unit: 'من الشهر', min: 1 },
      { key: 'payroll.monthly_days', label: 'أيام الشهر للمسير', type: 'number', unit: 'يوم', min: 1 },
      { key: 'payroll.daily_hours', label: 'ساعات العمل اليومية', type: 'number', unit: 'ساعة', min: 1 },
    ],
  },
]

export default function PoliciesPage() {
  const [values, setValues] = useState<Record<string, string>>({})
  const [original, setOriginal] = useState<Record<string, string>>({})
  const [known, setKnown] = useState<Set<string>>(new Set())
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')

  const load = async () => {
    try {
      const rows = await fetchConfig()
      const map: Record<string, string> = {}
      rows.forEach((r) => (map[r.key] = r.value))
      setValues(map)
      setOriginal(map)
      setKnown(new Set(rows.map((r) => r.key)))
      setError('')
    } catch (e) {
      setError(e instanceof Error ? e.message : 'تعذر تحميل السياسات')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    load()
  }, [])

  const setVal = (key: string, value: string) => {
    setValues((prev) => ({ ...prev, [key]: value }))
    setSuccess('')
  }

  const dirtyKeys = Object.keys(values).filter((k) => values[k] !== original[k])
  const fieldByKey = new Map(
    GROUPS.flatMap((g) => g.fields).map((f) => [f.key, f])
  )

  const handleSave = async () => {
    if (dirtyKeys.length === 0) return
    // تحقق الحقول الرقمية قبل الحفظ — قيمة فارغة/غير رقمية/أقل من الحد تُفسد
    // المحرك (المسير قسمة على صفر). نمنع الحفظ الجزئي بالتحقق أولاً
    for (const key of dirtyKeys) {
      const f = fieldByKey.get(key)
      if (f?.type === 'number') {
        const n = Number(values[key])
        const min = f.min ?? 0
        if (values[key] === '' || !Number.isFinite(n) || n < min) {
          setError(
            `«${f.label}» يجب أن يكون رقماً${min > 0 ? ` لا يقل عن ${min}` : ' غير سالب'}`
          )
          setSuccess('')
          return
        }
      }
    }
    setSaving(true)
    setError('')
    setSuccess('')
    try {
      for (const key of dirtyKeys) {
        await updateConfig(key, String(values[key]))
      }
      setOriginal({ ...values })
      setSuccess(`تم حفظ ${dirtyKeys.length} سياسة`)
    } catch (e) {
      setError(e instanceof Error ? e.message : 'تعذر حفظ السياسات')
    } finally {
      setSaving(false)
    }
  }

  const renderField = (f: PolicyField) => {
    const v = values[f.key] ?? ''
    if (f.type === 'bool') {
      const on = v === 'true'
      return (
        <button
          type="button"
          onClick={() => setVal(f.key, on ? 'false' : 'true')}
          className={`relative w-12 h-6 rounded-full transition-colors ${
            on ? 'bg-primary-500' : 'bg-gray-300'
          }`}
          aria-pressed={on}
        >
          <span
            className={`absolute top-0.5 w-5 h-5 bg-white rounded-full shadow transition-all ${
              on ? 'right-0.5' : 'right-6'
            }`}
          />
        </button>
      )
    }
    if (f.type === 'select') {
      return (
        <select
          className="input w-full max-w-xs"
          value={v}
          onChange={(e) => setVal(f.key, e.target.value)}
        >
          {f.options?.map((o) => (
            <option key={o.value} value={o.value}>
              {o.label}
            </option>
          ))}
        </select>
      )
    }
    return (
      <div className="flex items-center gap-2 max-w-xs">
        <input
          type={f.type === 'number' ? 'number' : 'text'}
          min={f.type === 'number' ? (f.min ?? 0) : undefined}
          className="input w-full"
          value={v}
          onChange={(e) => setVal(f.key, e.target.value)}
        />
        {f.unit && <span className="text-xs text-gray-400 whitespace-nowrap">{f.unit}</span>}
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
          <span className="text-gray-800">السياسات</span>
        </div>

        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-gray-800">سياسات الموارد البشرية</h1>
            <p className="text-gray-500 mt-1">
              القيم الفعلية لمحرك النظام — الإجازات والحضور والعمل الإضافي والمسير
            </p>
          </div>
        </div>

        {error && (
          <div className="bg-red-50 text-red-700 rounded-xl p-4 flex items-center gap-2">
            <AlertCircle size={20} />
            {error}
          </div>
        )}

        {/* Info */}
        <div className="p-4 bg-blue-50 rounded-xl flex items-start gap-3">
          <Info size={20} className="text-blue-500 mt-0.5" />
          <div className="text-sm text-blue-700">
            <p className="font-medium">هذه القيم تسري على النظام كله فوراً بعد الحفظ</p>
            <p className="mt-1">
              الاستحقاق يُطبَّق على الأرصدة الجديدة، وسماحية التأخير والأوفرتايم على الحساب اللاحق.
              الرصيد الافتتاحي وأنواع الإجازة الخاصة تُدار لكل موظف/نوع على حدة.
            </p>
          </div>
        </div>

        {loading ? (
          <div className="flex items-center justify-center py-20">
            <div className="w-8 h-8 border-2 border-primary-500 border-t-transparent rounded-full animate-spin" />
          </div>
        ) : (
          <div className="space-y-6">
            {GROUPS.map((g) => {
              const fields = g.fields.filter((f) => known.has(f.key))
              if (fields.length === 0) return null
              const GroupIcon = g.icon
              return (
                <div key={g.title} className="card">
                  <div className="flex items-center gap-3 mb-5">
                    <div className={`w-11 h-11 ${g.iconBg} rounded-2xl flex items-center justify-center`}>
                      <GroupIcon size={22} className={g.iconColor} />
                    </div>
                    <h2 className="font-bold text-gray-800">{g.title}</h2>
                  </div>
                  <div className="divide-y divide-gray-100">
                    {fields.map((f) => (
                      <div
                        key={f.key}
                        className="py-3 flex items-center justify-between gap-4 flex-wrap"
                      >
                        <div className="min-w-[200px]">
                          <p className="text-sm font-medium text-gray-800">{f.label}</p>
                          {f.hint && <p className="text-xs text-gray-400 mt-0.5">{f.hint}</p>}
                        </div>
                        {renderField(f)}
                      </div>
                    ))}
                  </div>
                </div>
              )
            })}
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
                {dirtyKeys.length} سياسة معدّلة بانتظار الحفظ
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
                disabled={saving || dirtyKeys.length === 0}
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
