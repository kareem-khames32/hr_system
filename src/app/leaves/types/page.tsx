'use client'

import { useEffect, useMemo, useState } from 'react'
import { MainLayout } from '@/components/layout'
import { Plus, Edit2, Trash2, CheckCircle2, XCircle, CalendarDays, Gift, HeartPulse, Ban } from 'lucide-react'
import { can, createLeaveType, fetchLeaveTypes, updateLeaveType } from '@/lib/api'
import { DefinitionBranchField, useDefinitionBranches } from '@/components/DefinitionBranchField'

// ===== شاشة أنواع الإجازات (قرار المالك 16 سبتمبر) =====
// الفئة أول اختيار وبتغيّر باقي الفورم. كل تبويب يظهر حسب الفئة، وكل شرط هنا بيتطبق فعلًا
// في تقديم الطلب والرصيد والمسير (مش خانات للعرض).

type Category = 'ANNUAL' | 'OCCASION' | 'SICK' | 'UNPAID'
type TabKey = 'basic' | 'balance' | 'days' | 'pay' | 'conditions' | 'attachment'
type Tier = { fromDay: string; toDay: string; payPercent: string }

interface LeaveTypeRow {
  id: number
  code: string
  nameAr: string
  nameEn: string | null
  description: string | null
  isPaid: boolean
  isActive: boolean
  category: Category | null
  annualDays: number | string | null
  renewalBasis: string
  carryOverEnabled: boolean
  carryOverMaxDays: number | string | null
  // السنوية للموظف الجديد: الرصيد يبدأ بعد كام شهر من التعيين (فاضي = الإعداد العام)، وأول سنة بالنسبة ولا كاملة
  entitlementStartMonths?: number | null
  firstYearProrated?: boolean
  fixedDays: number | string | null
  maxTimesPerYear: number | null
  oncePerService: boolean
  sickPayTiers: string | null
  minDaysPerRequest: number | string | null
  maxDays: number | null
  noticeDays: number
  backdateAllowed: boolean
  backdateMaxDays: number | null
  countingMode: string
  halfDayAllowed: boolean
  attachmentRule: string
  attachmentAboveDays: number | null
  requiredAttachment: string | null
  attachmentTiming: string
  attachmentDeadlineDays: number
  // فرع النوع: null = كل الشركة (قرار المالك 16 سبتمبر)
  branchId?: number | null
}

const categories: Array<{ key: Category; label: string; hint: string; icon: typeof CalendarDays }> = [
  { key: 'ANNUAL', label: 'إجازة برصيد سنوي', hint: 'زي السنوية', icon: CalendarDays },
  { key: 'OCCASION', label: 'إجازة بمناسبة', hint: 'زي الزواج والوفاة — أيام ثابتة للمرة', icon: Gift },
  { key: 'SICK', label: 'إجازة مرضية', hint: 'رصيد سنوي، والأجر بيقل كل ما المدة تزيد', icon: HeartPulse },
  { key: 'UNPAID', label: 'إجازة بدون راتب', hint: 'مش مدفوعة، والأيام بتتخصم من الراتب', icon: Ban },
]
const categoryLabel = (c: string | null) => categories.find(x => x.key === c)?.label ?? '—'

const tabsFor = (c: Category): Array<[TabKey, string]> => [
  ['basic', 'البيانات الأساسية'],
  ...(c === 'ANNUAL' || c === 'SICK' ? [['balance', 'الرصيد'] as [TabKey, string]] : []),
  ...(c === 'OCCASION' ? [['days', 'عدد الأيام'] as [TabKey, string]] : []),
  ['pay', 'الأجر'],
  ['conditions', 'شروط الطلب'],
  ['attachment', 'المرفق'],
]

const defaultTiers: Tier[] = [
  { fromDay: '1', toDay: '30', payPercent: '100' },
  { fromDay: '31', toDay: '90', payPercent: '75' },
  { fromDay: '91', toDay: '', payPercent: '0' },
]

const str = (v: unknown) => (v === null || v === undefined ? '' : String(Number(v)))

type Form = {
  category: Category
  code: string; nameAr: string; nameEn: string; description: string; isActive: boolean
  annualDays: string; renewalBasis: string; carryOverEnabled: boolean; carryOverMaxDays: string
  entitlementStartMonths: string; firstYearProrated: boolean
  fixedDays: string; oncePerService: boolean; maxTimesPerYear: string
  tiers: Tier[]
  minDays: string; maxDays: string; noticeDays: string; backdateAllowed: boolean; backdateMaxDays: string
  countingMode: string; halfDayAllowed: boolean
  attachmentRule: string; attachmentAboveDays: string; attachmentName: string; attachmentTiming: string; attachmentDeadlineDays: string
  branchId: number | null
}

const newForm = (category: Category): Form => ({
  category, code: '', nameAr: '', nameEn: '', description: '', isActive: true,
  annualDays: category === 'ANNUAL' ? '21' : category === 'SICK' ? '120' : '',
  renewalBasis: 'YEAR_START', carryOverEnabled: false, carryOverMaxDays: '',
  entitlementStartMonths: category === 'ANNUAL' ? '0' : '', firstYearProrated: true,
  fixedDays: '', oncePerService: false, maxTimesPerYear: '',
  tiers: defaultTiers.map(t => ({ ...t })),
  minDays: '', maxDays: '', noticeDays: '0', backdateAllowed: true, backdateMaxDays: '',
  countingMode: category === 'UNPAID' ? 'ALL_DAYS' : 'WORKING_DAYS', halfDayAllowed: true,
  attachmentRule: category === 'SICK' ? 'REQUIRED' : 'NONE', attachmentAboveDays: '',
  attachmentName: category === 'SICK' ? 'تقرير طبي' : '', attachmentTiming: category === 'SICK' ? 'AFTER_RETURN' : 'WITH_REQUEST',
  attachmentDeadlineDays: '7',
  branchId: null,
})

const formOf = (t: LeaveTypeRow): Form => {
  let tiers: Tier[] = defaultTiers.map(x => ({ ...x }))
  try {
    const parsed = t.sickPayTiers ? JSON.parse(t.sickPayTiers) : null
    if (Array.isArray(parsed) && parsed.length) tiers = parsed.map((r: any) => ({ fromDay: str(r.fromDay), toDay: str(r.toDay), payPercent: str(r.payPercent) }))
  } catch { /* جدول تالف: يبدأ بالافتراضي */ }
  return {
    category: (t.category ?? 'OCCASION') as Category,
    code: t.code, nameAr: t.nameAr, nameEn: t.nameEn ?? '', description: t.description ?? '', isActive: t.isActive,
    annualDays: str(t.annualDays), renewalBasis: t.renewalBasis ?? 'YEAR_START', carryOverEnabled: !!t.carryOverEnabled, carryOverMaxDays: str(t.carryOverMaxDays),
    entitlementStartMonths: str(t.entitlementStartMonths), firstYearProrated: t.firstYearProrated !== false,
    fixedDays: str(t.fixedDays), oncePerService: !!t.oncePerService, maxTimesPerYear: str(t.maxTimesPerYear),
    tiers,
    minDays: str(t.minDaysPerRequest), maxDays: str(t.maxDays), noticeDays: str(t.noticeDays ?? 0), backdateAllowed: t.backdateAllowed !== false, backdateMaxDays: str(t.backdateMaxDays),
    countingMode: t.countingMode ?? 'WORKING_DAYS', halfDayAllowed: t.halfDayAllowed !== false,
    attachmentRule: t.attachmentRule ?? 'NONE', attachmentAboveDays: str(t.attachmentAboveDays), attachmentName: t.requiredAttachment ?? '',
    attachmentTiming: t.attachmentTiming ?? 'WITH_REQUEST', attachmentDeadlineDays: str(t.attachmentDeadlineDays ?? 7),
    branchId: t.branchId ?? null,
  }
}

const daysLabel = (t: LeaveTypeRow) => {
  if (t.category === 'ANNUAL' || t.category === 'SICK') return t.annualDays != null ? `${Number(t.annualDays)} في السنة` : 'من الرصيد السنوي'
  if (t.category === 'OCCASION') return t.fixedDays != null ? `${Number(t.fixedDays)} للمرة` : 'حسب الطلب'
  return t.maxDays != null ? `حتى ${t.maxDays} للطلب` : '—'
}

export default function LeaveTypesPage() {
  const [rows, setRows] = useState<LeaveTypeRow[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [editing, setEditing] = useState<LeaveTypeRow | null>(null)
  const [form, setForm] = useState<Form | null>(null)
  const [tab, setTab] = useState<TabKey>('basic')
  const [formError, setFormError] = useState<string | null>(null)
  const [saving, setSaving] = useState(false)
  const canManage = can('settings.manage')
  // حساب الفرع يضيف لفرعه ويعدّل أنواع فرعه بس؛ أنواع الشركة عنده للعرض (قرار المالك 16 سبتمبر)
  const branchInfo = useDefinitionBranches()
  const canEditRow = (t: LeaveTypeRow) => canManage && branchInfo.canEdit(t.branchId)

  const load = async () => {
    try {
      setRows((await fetchLeaveTypes()) as LeaveTypeRow[])
      setError(null)
    } catch (err: any) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }
  useEffect(() => { load() }, [])

  const openNew = () => { setEditing(null); setForm(newForm('ANNUAL')); setTab('basic'); setFormError(null) }
  const openEdit = (t: LeaveTypeRow) => { setEditing(t); setForm(formOf(t)); setTab('basic'); setFormError(null) }
  const close = () => { setForm(null); setEditing(null); setFormError(null) }
  const set = <K extends keyof Form>(key: K, value: Form[K]) => setForm(f => (f ? { ...f, [key]: value } : f))

  const chooseCategory = (c: Category) => {
    if (!form) return
    const base = editing ? form : newForm(c)
    const next = { ...base, category: c, code: form.code, nameAr: form.nameAr, nameEn: form.nameEn, description: form.description, isActive: form.isActive }
    setForm(next)
    if (!tabsFor(c).some(([k]) => k === tab)) setTab('basic')
  }

  // التحقق قبل الإرسال (والباك بيتحقق تاني)
  const problem = useMemo(() => {
    if (!form) return null
    if (!editing) {
      if (!/^[A-Z][A-Z0-9_]*$/.test(form.code)) return 'الكود بالإنجليزي بحروف كبيرة، مثل ANNUAL'
      if (rows.some(r => r.code === form.code)) return `الكود ${form.code} مستخدم بالفعل`
    }
    if (form.nameAr.trim().length < 2) return 'اكتب الاسم بالعربي'
    const min = form.minDays === '' ? null : Number(form.minDays)
    const max = form.maxDays === '' ? null : Number(form.maxDays)
    if (min !== null && max !== null && max <= min) return 'أقصى عدد أيام في الطلب لازم يكون أكبر من أقل عدد أيام'
    if (form.category === 'SICK') {
      for (let i = 0; i < form.tiers.length; i++) {
        const t = form.tiers[i]
        if (t.fromDay === '' || t.payPercent === '') return `جدول الأجر — الصف ${i + 1} ناقص`
        if (Number(t.payPercent) < 0 || Number(t.payPercent) > 100) return `جدول الأجر — الصف ${i + 1}: النسبة من 0 لـ 100`
        if (t.toDay !== '' && Number(t.toDay) < Number(t.fromDay)) return `جدول الأجر — الصف ${i + 1}: «إلى يوم» قبل «من يوم»`
        if (i === 0 && Number(t.fromDay) !== 1) return 'جدول الأجر لازم يبدأ من يوم 1'
        if (i > 0) {
          const prev = form.tiers[i - 1]
          if (prev.toDay === '') return `جدول الأجر — الصف ${i}: مفتوح النهاية فمفيش صفوف بعده`
          if (Number(t.fromDay) !== Number(prev.toDay) + 1) return `جدول الأجر — الصف ${i + 1} لازم يبدأ من يوم ${Number(prev.toDay) + 1}`
        }
      }
    }
    if (form.category === 'ANNUAL' && form.entitlementStartMonths !== '' &&
      (!Number.isInteger(Number(form.entitlementStartMonths)) || Number(form.entitlementStartMonths) < 0 || Number(form.entitlementStartMonths) > 60)) {
      return 'الرصيد يبدأ بعد كام شهر: رقم صحيح من 0 لـ 60'
    }
    if (form.attachmentRule === 'REQUIRED_ABOVE_DAYS' && form.attachmentAboveDays === '') return 'حدد عدد الأيام اللي فوقها المرفق مطلوب'
    if (form.attachmentRule !== 'NONE' && !form.attachmentName.trim()) return 'اكتب اسم المرفق، مثلًا: تقرير طبي'
    return null
  }, [form, editing, rows])

  const save = async () => {
    if (!form) return
    if (problem) { setFormError(problem); return }
    const n = (v: string) => (v === '' ? null : Number(v))
    const c = form.category
    const payload: Record<string, unknown> = {
      category: c, nameAr: form.nameAr.trim(), nameEn: form.nameEn.trim() || null, description: form.description.trim() || null,
      annualDays: c === 'ANNUAL' || c === 'SICK' ? n(form.annualDays) : null,
      renewalBasis: form.renewalBasis,
      carryOverEnabled: c === 'ANNUAL' ? form.carryOverEnabled : false,
      carryOverMaxDays: c === 'ANNUAL' && form.carryOverEnabled ? n(form.carryOverMaxDays) : null,
      entitlementStartMonths: c === 'ANNUAL' ? n(form.entitlementStartMonths) : null,
      firstYearProrated: c === 'ANNUAL' ? form.firstYearProrated : true,
      fixedDays: c === 'OCCASION' ? n(form.fixedDays) : null,
      oncePerService: c === 'OCCASION' ? form.oncePerService : false,
      maxTimesPerYear: c === 'OCCASION' ? n(form.maxTimesPerYear) : null,
      sickPayTiers: c === 'SICK' ? form.tiers.map(t => ({ fromDay: Number(t.fromDay), toDay: t.toDay === '' ? null : Number(t.toDay), payPercent: Number(t.payPercent) })) : null,
      minDaysPerRequest: n(form.minDays), maxDays: n(form.maxDays),
      noticeDays: Number(form.noticeDays || 0), backdateAllowed: form.backdateAllowed,
      backdateMaxDays: form.backdateAllowed ? n(form.backdateMaxDays) : null,
      countingMode: form.countingMode, halfDayAllowed: form.halfDayAllowed,
      attachmentRule: form.attachmentRule,
      attachmentAboveDays: form.attachmentRule === 'REQUIRED_ABOVE_DAYS' ? n(form.attachmentAboveDays) : null,
      requiredAttachment: form.attachmentRule === 'NONE' ? null : form.attachmentName.trim(),
      attachmentTiming: form.attachmentTiming,
      attachmentDeadlineDays: Number(form.attachmentDeadlineDays || 7),
      isActive: form.isActive,
    }
    setSaving(true)
    setFormError(null)
    try {
      if (editing) await updateLeaveType(editing.id, payload)
      else await createLeaveType({ ...payload, code: form.code,
        ...(branchInfo.scope === null && form.branchId != null ? { branchId: form.branchId } : {}) })
      await load()
      close()
    } catch (err: any) {
      setFormError(err.message)
    } finally {
      setSaving(false)
    }
  }

  const toggleActive = async (t: LeaveTypeRow) => {
    try {
      await updateLeaveType(t.id, { isActive: !t.isActive })
      setRows(prev => prev.map(r => (r.id === t.id ? { ...r, isActive: !r.isActive } : r)))
    } catch (err: any) {
      setError(err.message)
    }
  }

  const field = 'block text-sm font-medium text-gray-700 mb-2'
  const check = 'w-4 h-4 rounded border-gray-300 text-primary-600 focus:ring-primary-500'

  return (
    <MainLayout>
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-gray-800">أنواع الإجازات</h1>
            <p className="text-gray-500 mt-1">كل نوع ليه رصيده وأجره وشروط طلبه ومرفقه</p>
            {canManage && branchInfo.scope !== null && (
              <p className="text-sm text-amber-700 mt-1">الأنواع اللي لكل الشركة هنا للعرض بس. تقدر تضيف نوع خاص بفرعك، ويظهر لموظفين فرعك بس.</p>
            )}
          </div>
          {canManage && !form && (
            <button onClick={openNew} className="btn-primary flex items-center gap-2">
              <Plus size={18} />
              إضافة نوع
            </button>
          )}
        </div>

        {error && <div className="bg-red-50 text-red-700 rounded-xl p-4">{error}</div>}

        {form && (
          <div className="card space-y-5">
            <div className="flex items-center justify-between">
              <h2 className="text-lg font-bold text-gray-800">{editing ? `تعديل «${editing.nameAr}»` : 'نوع إجازة جديد'}</h2>
              <button onClick={close} className="btn-secondary">إلغاء</button>
            </div>

            <div>
              <p className={field}>نوع الإجازة</p>
              <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
                {categories.map(({ key, label, hint, icon: Icon }) => (
                  <button
                    key={key}
                    type="button"
                    onClick={() => chooseCategory(key)}
                    className={`text-right rounded-xl border p-3 transition ${form.category === key ? 'border-primary-500 bg-primary-50' : 'border-gray-200 hover:border-gray-300'}`}
                  >
                    <Icon size={20} className={form.category === key ? 'text-primary-600' : 'text-gray-400'} />
                    <p className="font-semibold text-gray-800 mt-2">{label}</p>
                    <p className="text-xs text-gray-500 mt-1">{hint}</p>
                  </button>
                ))}
              </div>
            </div>

            <div className="flex gap-2 border-b border-gray-100 overflow-x-auto">
              {tabsFor(form.category).map(([key, label]) => (
                <button
                  key={key}
                  type="button"
                  onClick={() => setTab(key)}
                  className={`px-4 py-2 text-sm whitespace-nowrap border-b-2 -mb-px ${tab === key ? 'border-primary-600 text-primary-700 font-semibold' : 'border-transparent text-gray-500 hover:text-gray-700'}`}
                >
                  {label}
                </button>
              ))}
            </div>

            {tab === 'basic' && (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className={field}>الكود (إنجليزي) *</label>
                  <input className="input w-full font-mono" dir="ltr" value={form.code} disabled={!!editing}
                    placeholder="ANNUAL" onChange={e => set('code', e.target.value.toUpperCase().replace(/[^A-Z0-9_]/g, ''))} />
                </div>
                <div>
                  <label className={field}>الاسم بالعربي *</label>
                  <input className="input w-full" value={form.nameAr} onChange={e => set('nameAr', e.target.value)} placeholder="سنوية" />
                </div>
                <div>
                  <label className={field}>الاسم بالإنجليزي</label>
                  <input className="input w-full" dir="ltr" value={form.nameEn} onChange={e => set('nameEn', e.target.value)} placeholder="Annual leave" />
                </div>
                <DefinitionBranchField value={form.branchId} onChange={v => set('branchId', v)} editing={!!editing} info={branchInfo} disabled={saving} />
                <label className="flex items-center gap-2 mt-7">
                  <input type="checkbox" className={check} checked={form.isActive} onChange={e => set('isActive', e.target.checked)} />
                  <span className="text-sm text-gray-700">مفعّل</span>
                </label>
                <div className="md:col-span-2">
                  <label className={field}>الوصف (اختياري)</label>
                  <textarea className="input w-full" rows={2} value={form.description} onChange={e => set('description', e.target.value)} />
                </div>
              </div>
            )}

            {tab === 'balance' && (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className={field}>عدد الأيام في السنة</label>
                  <input type="number" min={0} className="input w-full" value={form.annualDays} onChange={e => set('annualDays', e.target.value)} />
                </div>
                <div>
                  <label className={field}>الرصيد بيتجدد في</label>
                  <select className="input w-full" value={form.renewalBasis} onChange={e => set('renewalBasis', e.target.value)}>
                    <option value="YEAR_START">بداية السنة</option>
                    <option value="HIRE_ANNIVERSARY">تاريخ تعيين الموظف</option>
                  </select>
                </div>
                {form.category === 'ANNUAL' && (
                  <>
                    <label className="flex items-center gap-2">
                      <input type="checkbox" className={check} checked={form.carryOverEnabled} onChange={e => set('carryOverEnabled', e.target.checked)} />
                      <span className="text-sm text-gray-700">الرصيد المتبقي يترحّل للسنة الجاية</span>
                    </label>
                    {form.carryOverEnabled && (
                      <div>
                        <label className={field}>أقصى عدد أيام ترحيل (فاضي = بدون حد)</label>
                        <input type="number" min={0} className="input w-full" value={form.carryOverMaxDays} onChange={e => set('carryOverMaxDays', e.target.value)} />
                      </div>
                    )}
                    <div className="md:col-span-2 border-t border-gray-100 pt-4">
                      <p className="text-sm font-semibold text-gray-800">الموظف الجديد</p>
                    </div>
                    <div>
                      <label className={field}>الرصيد يبدأ بعد كام شهر من التعيين (0 = من يوم التعيين)</label>
                      <input type="number" min={0} max={60} step={1} className="input w-full" value={form.entitlementStartMonths}
                        placeholder="فاضي = فترة التجربة من سياسات النظام" onChange={e => set('entitlementStartMonths', e.target.value)} />
                    </div>
                    <label className="flex items-center gap-2">
                      <input type="checkbox" className={check} checked={form.firstYearProrated} onChange={e => set('firstYearProrated', e.target.checked)} />
                      <span className="text-sm text-gray-700">أول سنة بالنسبة والتناسب (من يوم ما يستحق لآخر سنة الرصيد)، مش كاملة</span>
                    </label>
                    <p className="text-sm text-gray-500 md:col-span-2">
                      قبل يوم الاستحقاق رصيده السنوي صفر ومايقدرش يطلب سنوية. مثال: اتعيّن 1 مارس والرصيد بعد 6 شهور ⇐ يستحق من 1 سبتمبر؛
                      بالنسبة = 21 × (من 1 سبتمبر لآخر السنة) ÷ السنة، وكاملة = 21 يوم.
                    </p>
                  </>
                )}
                {form.category === 'SICK' && (
                  <p className="text-sm text-gray-500 md:col-span-2">الرصيد المرضي بيتحسب على السنة كلها، والأجر من تبويب «الأجر» على مجموع أيام المرض في السنة.</p>
                )}
              </div>
            )}

            {tab === 'days' && (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className={field}>عدد أيام ثابت للمرة الواحدة</label>
                  <input type="number" min={0} className="input w-full" value={form.fixedDays} onChange={e => set('fixedDays', e.target.value)} placeholder="مثال: 5" />
                </div>
                <div>
                  <label className={field}>أقصى عدد مرات في السنة (فاضي = بدون حد)</label>
                  <input type="number" min={1} className="input w-full" value={form.maxTimesPerYear} onChange={e => set('maxTimesPerYear', e.target.value)} />
                </div>
                <label className="flex items-center gap-2">
                  <input type="checkbox" className={check} checked={form.oncePerService} onChange={e => set('oncePerService', e.target.checked)} />
                  <span className="text-sm text-gray-700">مرة واحدة طول مدة الخدمة</span>
                </label>
              </div>
            )}

            {tab === 'pay' && (
              <div className="space-y-3">
                {(form.category === 'ANNUAL' || form.category === 'OCCASION') && <p className="text-sm text-gray-700">مدفوعة بالكامل.</p>}
                {form.category === 'UNPAID' && <p className="text-sm text-gray-700">بدون أجر، وأيامها بتتخصم من الراتب.</p>}
                {form.category === 'SICK' && (
                  <>
                    <p className="text-sm text-gray-600">نسبة الأجر حسب مجموع أيام المرض في السنة:</p>
                    <div className="overflow-x-auto">
                      <table className="w-full text-sm">
                        <thead>
                          <tr className="text-gray-500 border-b border-gray-100">
                            <th className="py-2 text-right font-medium">من يوم</th>
                            <th className="py-2 text-right font-medium">إلى يوم (فاضي = مفتوح)</th>
                            <th className="py-2 text-right font-medium">نسبة الأجر %</th>
                            <th />
                          </tr>
                        </thead>
                        <tbody>
                          {form.tiers.map((t, i) => (
                            <tr key={i} className="border-b border-gray-50">
                              {(['fromDay', 'toDay', 'payPercent'] as const).map(k => (
                                <td key={k} className="py-2 pl-2">
                                  <input type="number" min={0} className="input w-full" value={t[k]}
                                    onChange={e => set('tiers', form.tiers.map((row, j) => (j === i ? { ...row, [k]: e.target.value } : row)))} />
                                </td>
                              ))}
                              <td className="py-2">
                                {form.tiers.length > 1 && (
                                  <button type="button" title="حذف الصف" className="p-2 rounded-lg hover:bg-gray-100"
                                    onClick={() => set('tiers', form.tiers.filter((_, j) => j !== i))}>
                                    <Trash2 size={16} className="text-gray-500" />
                                  </button>
                                )}
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                    <button type="button" className="btn-secondary text-sm"
                      onClick={() => {
                        const last = form.tiers[form.tiers.length - 1]
                        const from = last && last.toDay !== '' ? String(Number(last.toDay) + 1) : ''
                        set('tiers', [...form.tiers, { fromDay: from, toDay: '', payPercent: '' }])
                      }}>
                      إضافة صف
                    </button>
                  </>
                )}
              </div>
            )}

            {tab === 'conditions' && (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className={field}>أقل عدد أيام في الطلب الواحد</label>
                  <input type="number" min={0} className="input w-full" value={form.minDays} onChange={e => set('minDays', e.target.value)} placeholder="بدون حد" />
                </div>
                <div>
                  <label className={field}>أقصى عدد أيام في الطلب الواحد</label>
                  <input type="number" min={0} className="input w-full" value={form.maxDays} onChange={e => set('maxDays', e.target.value)} placeholder="بدون حد" />
                </div>
                <div>
                  <label className={field}>يتقدم قبلها بكام يوم (0 = ينفع نفس اليوم)</label>
                  <input type="number" min={0} className="input w-full" value={form.noticeDays} onChange={e => set('noticeDays', e.target.value)} />
                </div>
                <div>
                  <label className={field}>طريقة حساب الأيام</label>
                  {form.category === 'SICK' || form.category === 'UNPAID' ? (
                    <p className="text-sm text-gray-600 pt-2">كل الأيام — عشان الطلب والرصيد والخصم في المسير يبقوا نفس الرقم.</p>
                  ) : (
                    <select className="input w-full" value={form.countingMode} onChange={e => set('countingMode', e.target.value)}>
                      <option value="ALL_DAYS">كل الأيام</option>
                      <option value="WORKING_DAYS">أيام العمل بس</option>
                    </select>
                  )}
                </div>
                <label className="flex items-center gap-2">
                  <input type="checkbox" className={check} checked={form.backdateAllowed} onChange={e => set('backdateAllowed', e.target.checked)} />
                  <span className="text-sm text-gray-700">ينفع يسجّل إجازة بتاريخ قديم</span>
                </label>
                {form.backdateAllowed && (
                  <div>
                    <label className={field}>أقصى كام يوم للورا (فاضي = الإعداد العام)</label>
                    <input type="number" min={0} className="input w-full" value={form.backdateMaxDays} onChange={e => set('backdateMaxDays', e.target.value)} />
                  </div>
                )}
                <label className="flex items-center gap-2">
                  <input type="checkbox" className={check} checked={form.halfDayAllowed} onChange={e => set('halfDayAllowed', e.target.checked)} />
                  <span className="text-sm text-gray-700">ينفع نص يوم</span>
                </label>
              </div>
            )}

            {tab === 'attachment' && (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className={field}>المرفق مطلوب؟</label>
                  <select className="input w-full" value={form.attachmentRule} onChange={e => set('attachmentRule', e.target.value)}>
                    <option value="NONE">لا</option>
                    <option value="OPTIONAL">اختياري</option>
                    <option value="REQUIRED">مطلوب</option>
                    <option value="REQUIRED_ABOVE_DAYS">مطلوب لو المدة أكتر من عدد أيام</option>
                  </select>
                </div>
                {form.attachmentRule === 'REQUIRED_ABOVE_DAYS' && (
                  <div>
                    <label className={field}>مطلوب لو المدة أكتر من (يوم)</label>
                    <input type="number" min={0} className="input w-full" value={form.attachmentAboveDays} onChange={e => set('attachmentAboveDays', e.target.value)} />
                  </div>
                )}
                {form.attachmentRule !== 'NONE' && (
                  <>
                    <div>
                      <label className={field}>اسم المرفق</label>
                      <input className="input w-full" value={form.attachmentName} onChange={e => set('attachmentName', e.target.value)} placeholder="تقرير طبي" />
                    </div>
                    <div>
                      <label className={field}>وقت الرفع</label>
                      <select className="input w-full" value={form.attachmentTiming} onChange={e => set('attachmentTiming', e.target.value)}>
                        <option value="WITH_REQUEST">مع الطلب</option>
                        <option value="AFTER_RETURN">بعد الرجوع من الإجازة</option>
                      </select>
                    </div>
                    {form.attachmentTiming === 'AFTER_RETURN' && (
                      <div className="md:col-span-2 grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div>
                          <label className={field}>مهلة الرفع بعد انتهاء الإجازة (يوم)</label>
                          <input type="number" min={1} className="input w-full" value={form.attachmentDeadlineDays} onChange={e => set('attachmentDeadlineDays', e.target.value)} />
                        </div>
                        <p className="text-sm text-gray-500 self-end">الموظف والموارد البشرية بيوصلهم تنبيه، ولو المرفق ماترفعش خلال المهلة، أيام الإجازة بتتحول بدون راتب وتتخصم.</p>
                      </div>
                    )}
                  </>
                )}
              </div>
            )}

            {formError && <div className="rounded-xl p-3 text-sm bg-red-50 text-red-700">{formError}</div>}

            <div className="flex justify-end gap-3 pt-2 border-t border-gray-100">
              <button onClick={close} className="btn-secondary">إلغاء</button>
              <button onClick={save} disabled={saving} className="btn-primary disabled:opacity-50">
                {saving ? 'جارٍ الحفظ...' : editing ? 'حفظ التغييرات' : 'إضافة النوع'}
              </button>
            </div>
          </div>
        )}

        {loading ? (
          <div className="flex items-center justify-center py-20">
            <div className="w-8 h-8 border-2 border-primary-500 border-t-transparent rounded-full animate-spin" />
          </div>
        ) : (
          <div className="card overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="table-header">
                  {['الاسم', 'الكود', 'النوع', 'الأيام', 'مدفوعة؟', 'متاح في', 'مفعّل؟', ''].map(h => (
                    <th key={h} className="table-cell text-right">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {rows.map(t => (
                  <tr key={t.id} className="table-row">
                    <td className="table-cell">
                      <p className="font-semibold text-gray-800">{t.nameAr}</p>
                    </td>
                    <td className="table-cell font-mono" dir="ltr">{t.code}</td>
                    <td className="table-cell">{categoryLabel(t.category)}</td>
                    <td className="table-cell">{daysLabel(t)}</td>
                    <td className="table-cell">{t.isPaid ? (t.category === 'SICK' ? 'حسب الجدول' : 'نعم') : 'لا'}</td>
                    <td className="table-cell">
                      <span className={t.branchId != null ? 'text-amber-700' : 'text-gray-600'}>{branchInfo.label(t.branchId)}</span>
                    </td>
                    <td className="table-cell">
                      {canEditRow(t) ? (
                        <button onClick={() => toggleActive(t)} className="flex items-center gap-1" title={t.isActive ? 'تعطيل' : 'تفعيل'}>
                          {t.isActive ? <CheckCircle2 size={16} className="text-success-600" /> : <XCircle size={16} className="text-gray-400" />}
                          <span className={t.isActive ? 'text-success-600' : 'text-gray-400'}>{t.isActive ? 'مفعّل' : 'معطّل'}</span>
                        </button>
                      ) : (
                        <span>{t.isActive ? 'مفعّل' : 'معطّل'}</span>
                      )}
                    </td>
                    <td className="table-cell">
                      {canManage && !canEditRow(t) && (
                        <span className="text-xs text-gray-400" title="نوع لكل الشركة — تعديله من حساب على مستوى الشركة">للعرض بس</span>
                      )}
                      {canEditRow(t) && (
                        <button onClick={() => openEdit(t)} title="تعديل" className="p-2 bg-gray-100 rounded-lg hover:bg-gray-200">
                          <Edit2 size={16} className="text-gray-600" />
                        </button>
                      )}
                    </td>
                  </tr>
                ))}
                {rows.length === 0 && (
                  <tr><td colSpan={8} className="table-cell text-center text-gray-500 py-10">لا توجد أنواع إجازات</td></tr>
                )}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </MainLayout>
  )
}
