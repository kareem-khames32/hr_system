'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { MainLayout } from '@/components/layout'
import {
  Search,
  Plus,
  Edit,
  Clock,
  Moon,
  Users,
  Calendar,
  Copy,
  X,
  AlertTriangle,
} from 'lucide-react'
import { can, fetchCatalog, createCatalogItem, updateCatalogItem } from '@/lib/api'
import { DefinitionBranchBadge, DefinitionBranchField, useDefinitionBranches } from '@/components/DefinitionBranchField'

interface Shift {
  id: number
  name: string
  startTime: string
  endTime: string
  shiftMode?: 'fixed' | 'flexible'
  flexEnabled?: boolean | null
  flexWindowMinutes?: number | null
  requiredWorkMinutes?: number | null
  attendanceRuleVersion?: number | null
  attendanceRuleEffectiveFrom?: string | null
  requiredHours?: number | null
  graceMinutes?: number | null
  overtimeThresholdHours?: number | null
  checkinFrom?: string | null
  checkinTo?: string | null
  checkoutFrom?: string | null
  checkoutTo?: string | null
  isActive: boolean
  // فرع الوردية: null = كل الشركة (قرار المالك 16 سبتمبر)
  branchId?: number | null
}

// ألوان الكروت — تُسنَد بالتناوب حسب ترتيب الوردية
const shiftColors = [
  'bg-primary-500',
  'bg-warning-500',
  'bg-purple-500',
  'bg-success-500',
  'bg-cyan-500',
  'bg-emerald-500',
]

// وردية ليلية = تنتهي بعد منتصف الليل (النهاية قبل البداية)
const isNightShift = (s: Shift) => s.endTime < s.startTime

// ساعات العمل محسوبة من وقتي البداية والنهاية
const workHours = (s: Shift): number => {
  const [sh, sm] = s.startTime.split(':').map(Number)
  const [eh, em] = s.endTime.split(':').map(Number)
  if ([sh, sm, eh, em].some((n) => Number.isNaN(n))) return 0
  let mins = eh * 60 + em - (sh * 60 + sm)
  if (mins <= 0) mins += 24 * 60
  return Math.round((mins / 60) * 10) / 10
}

// نافذة بصمة مختصرة "من – إلى" — تظهر فقط لو أحد الطرفين معرَّف
const windowText = (from?: string | null, to?: string | null): string | null =>
  from || to ? `${from ?? '—'} – ${to ?? '—'}` : null

const emptyForm = {
  name: '', startTime: '', endTime: '',
  shiftMode: 'fixed' as 'fixed' | 'flexible',
  requiredHours: '',
  flexEnabled: false,
  flexWindowMinutes: '',
  requiredWorkMinutes: '',
  effectiveFrom: '',
  changeReason: '',
  graceMinutes: '',
  overtimeThresholdHours: '',
  checkinFrom: '', checkinTo: '', checkoutFrom: '', checkoutTo: '',
  branchId: null as number | null,
}

const localToday = () => new Date().toLocaleDateString('en-CA')
const offsetTime = (start: string, minutes: number) => {
  if (!/^\d{2}:\d{2}$/.test(start) || !Number.isFinite(minutes)) return '—'
  const [hours, mins] = start.split(':').map(Number)
  const total = hours * 60 + mins + minutes
  return `${String(Math.floor(total / 60) % 24).padStart(2, '0')}:${String(total % 60).padStart(2, '0')}${total >= 1440 ? ' (+1 يوم)' : ''}`
}

export default function ShiftsPage() {
  const [shifts, setShifts] = useState<Shift[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  const [searchQuery, setSearchQuery] = useState('')
  const [showModal, setShowModal] = useState(false)
  const [editingShift, setEditingShift] = useState<Shift | null>(null)
  const [formData, setFormData] = useState(emptyForm)
  const [modalError, setModalError] = useState('')
  const [saving, setSaving] = useState(false)
  const [togglingId, setTogglingId] = useState<number | null>(null)
  const [pendingToggle, setPendingToggle] = useState<Shift | null>(null)
  const [toggleChange, setToggleChange] = useState({ effectiveFrom: '', changeReason: '' })
  const [toggleError, setToggleError] = useState('')
  // الإضافة/التعديل/التفعيل = كتابة كتالوج (settings.manage في الباك). قرار المالك 16 سبتمبر:
  // الوردية لكل الشركة افتراضيًا، وحساب الفرع يضيف وردية خاصة بفرعه ويعدّل ورديات فرعه بس —
  // ورديات الشركة عنده للعرض، ويعرف ده قبل ما يملأ الفورم
  const branchInfo = useDefinitionBranches()
  const [allowed, setAllowed] = useState(false)
  useEffect(() => { setAllowed(can('settings.manage')) }, [])
  const canManage = allowed && branchInfo.scope !== -1
  const branchScopedNotice = allowed && branchInfo.scope !== null
  const canEditShift = (shift: Shift) => canManage && branchInfo.canEdit(shift.branchId)

  const loadShifts = () => {
    setLoading(true)
    setError('')
    fetchCatalog<Shift>('shifts')
      .then((rows) => setShifts(rows))
      .catch((e) => setError(e instanceof Error ? e.message : 'تعذر تحميل الورديات'))
      .finally(() => setLoading(false))
  }

  useEffect(() => {
    loadShifts()
  }, [])

  const openAdd = () => {
    setEditingShift(null)
    setFormData({ ...emptyForm, effectiveFrom: localToday() })
    setModalError('')
    setShowModal(true)
  }

  const openEdit = (shift: Shift) => {
    setEditingShift(shift)
    const s = (v: unknown) => (v != null ? String(v) : '')
    setFormData({
      name: shift.name,
      startTime: shift.startTime,
      endTime: shift.endTime,
      shiftMode: shift.shiftMode ?? 'fixed',
      requiredHours: s(shift.requiredHours),
      flexEnabled: shift.flexEnabled ?? shift.shiftMode === 'flexible',
      flexWindowMinutes: s(shift.flexWindowMinutes),
      requiredWorkMinutes: s(shift.requiredWorkMinutes ?? (shift.requiredHours != null ? Math.round(Number(shift.requiredHours) * 60) : null)),
      effectiveFrom: shift.attendanceRuleEffectiveFrom && shift.attendanceRuleEffectiveFrom > localToday() ? shift.attendanceRuleEffectiveFrom : localToday(),
      changeReason: '',
      graceMinutes: s(shift.graceMinutes),
      overtimeThresholdHours: s(shift.overtimeThresholdHours),
      checkinFrom: s(shift.checkinFrom),
      checkinTo: s(shift.checkinTo),
      checkoutFrom: s(shift.checkoutFrom),
      checkoutTo: s(shift.checkoutTo),
      branchId: shift.branchId ?? null,
    })
    setModalError('')
    setShowModal(true)
  }

  const handleSave = async () => {
    if (!formData.effectiveFrom || !formData.changeReason.trim()) { setModalError('حدد تاريخ السريان وسبب الحفظ'); return }
    if (formData.flexEnabled && (!Number(formData.flexWindowMinutes) || !Number(formData.requiredWorkMinutes) || Number(formData.flexWindowMinutes) >= Number(formData.requiredWorkMinutes))) {
      setModalError('المرونة تحتاج نافذة موجبة وأقل من دقائق العمل المطلوبة'); return
    }
    setSaving(true)
    setModalError('')
    // القيم الاختيارية: فارغ → null (تُشتق من القيمة العامة/الافتراضي)
    const num = (v: string) => (v !== '' ? Number(v) : null)
    const txt = (v: string) => (v !== '' ? v : null)
    const payload = {
      name: formData.name,
      startTime: formData.startTime,
      endTime: formData.endTime,
      shiftMode: formData.flexEnabled ? 'flexible' : 'fixed',
      flexEnabled: formData.flexEnabled,
      flexWindowMinutes: num(formData.flexWindowMinutes),
      requiredWorkMinutes: num(formData.requiredWorkMinutes),
      effectiveFrom: formData.effectiveFrom,
      changeReason: formData.changeReason.trim(),
      requiredHours: num(formData.requiredHours),
      graceMinutes: num(formData.graceMinutes),
      overtimeThresholdHours: num(formData.overtimeThresholdHours),
      checkinFrom: txt(formData.checkinFrom),
      checkinTo: txt(formData.checkinTo),
      checkoutFrom: txt(formData.checkoutFrom),
      checkoutTo: txt(formData.checkoutTo),
    }
    try {
      if (editingShift) {
        await updateCatalogItem('shifts', editingShift.id, payload)
      } else {
        // حساب الشركة يختار الفرع؛ حساب الفرع يتضاف لفرعه تلقائيًا من الخادم
        await createCatalogItem('shifts', { ...payload,
          ...(branchInfo.scope === null && formData.branchId != null ? { branchId: formData.branchId } : {}) })
      }
      setShowModal(false)
      loadShifts()
    } catch (e) {
      setModalError(e instanceof Error ? e.message : 'تعذر حفظ الوردية')
    } finally {
      setSaving(false)
    }
  }

  const handleToggleActive = async (shift: Shift) => {
    if (!toggleChange.effectiveFrom || !toggleChange.changeReason.trim()) { setToggleError('حدد تاريخ السريان والسبب'); return }
    setTogglingId(shift.id)
    setToggleError('')
    try {
      await updateCatalogItem('shifts', shift.id, { isActive: !shift.isActive, ...toggleChange })
      setPendingToggle(null)
      loadShifts()
    } catch (e) {
      setToggleError(e instanceof Error ? e.message : 'تعذر تحديث حالة الوردية')
    } finally {
      setTogglingId(null)
    }
  }

  const filteredShifts = shifts.filter((shift) => shift.name.includes(searchQuery))

  const activeShifts = shifts.filter((s) => s.isActive)
  const inactiveShifts = shifts.filter((s) => !s.isActive)
  const nightShifts = shifts.filter((s) => isNightShift(s))

  return (
    <MainLayout>
      <div className="space-y-6">
        {/* Page Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-gray-800">الورديات</h1>
            <p className="text-gray-500 mt-1">تعريف وإدارة ورديات العمل</p>
          </div>
          {canManage && (
            <button onClick={openAdd} className="btn-primary flex items-center gap-2">
              <Plus size={18} />
              إضافة وردية
            </button>
          )}
        </div>

        {error && <div className="bg-red-50 text-red-700 rounded-xl p-4">{error}</div>}

        {branchScopedNotice && (
          <div className="rounded-xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-800 flex items-start gap-2">
            <AlertTriangle size={18} className="mt-0.5 shrink-0" />
            <span>
              الورديات اللي لكل الشركة هنا للعرض بس — تعديلها من حساب على مستوى الشركة.
              تقدر تضيف وردية خاصة بفرعك، وتتسند لموظفين فرعك بس.
            </span>
          </div>
        )}

        {/* Stats */}
        <div className="grid grid-cols-4 gap-4">
          <div className="card flex items-center gap-4">
            <div className="w-12 h-12 bg-primary-100 rounded-2xl flex items-center justify-center">
              <Clock size={24} className="text-primary-600" />
            </div>
            <div>
              <p className="text-sm text-gray-500">إجمالي الورديات</p>
              <p className="text-2xl font-bold text-gray-800">{shifts.length}</p>
            </div>
          </div>
          <div className="card flex items-center gap-4">
            <div className="w-12 h-12 bg-success-50 rounded-2xl flex items-center justify-center">
              <Clock size={24} className="text-success-600" />
            </div>
            <div>
              <p className="text-sm text-gray-500">ورديات نشطة</p>
              <p className="text-2xl font-bold text-success-600">{activeShifts.length}</p>
            </div>
          </div>
          <div className="card flex items-center gap-4">
            <div className="w-12 h-12 bg-warning-50 rounded-2xl flex items-center justify-center">
              <Users size={24} className="text-warning-600" />
            </div>
            <div>
              <p className="text-sm text-gray-500">ورديات غير نشطة</p>
              <p className="text-2xl font-bold text-warning-600">{inactiveShifts.length}</p>
            </div>
          </div>
          <div className="card flex items-center gap-4">
            <div className="w-12 h-12 bg-purple-100 rounded-2xl flex items-center justify-center">
              <Moon size={24} className="text-purple-600" />
            </div>
            <div>
              <p className="text-sm text-gray-500">ورديات ليلية</p>
              <p className="text-2xl font-bold text-purple-600">{nightShifts.length}</p>
            </div>
          </div>
        </div>

        {/* Search */}
        <div className="card">
          <div className="relative w-96">
            <Search size={18} className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400" />
            <input
              type="text"
              placeholder="بحث عن وردية..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="input pr-10"
            />
          </div>
        </div>

        {/* Shifts Grid */}
        {loading ? (
          <div className="card flex items-center justify-center py-16">
            <div className="w-8 h-8 border-2 border-primary-500 border-t-transparent rounded-full animate-spin" />
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {filteredShifts.map((shift, index) => {
              const color = shiftColors[index % shiftColors.length]
              const checkinWindow = windowText(shift.checkinFrom, shift.checkinTo)
              const checkoutWindow = windowText(shift.checkoutFrom, shift.checkoutTo)
              return (
                <div
                  key={shift.id}
                  className={`card relative overflow-hidden ${!shift.isActive ? 'opacity-60' : ''}`}
                >
                  {/* Color Bar */}
                  <div className={`absolute top-0 right-0 left-0 h-1.5 ${color}`} />

                  {/* Header */}
                  <div className="flex items-start justify-between mt-2">
                    <div className="flex items-center gap-3">
                      <div className={`w-12 h-12 ${color} bg-opacity-10 rounded-2xl flex items-center justify-center`}>
                        <span className={`${color.replace('bg-', 'text-')}`}>
                          {isNightShift(shift) ? <Moon size={18} /> : <Clock size={18} />}
                        </span>
                      </div>
                      <div>
                        <h3 className="font-bold text-gray-800">{shift.name}</h3>
                        <p className="text-sm text-gray-400">
                          {isNightShift(shift) ? 'وردية ليلية' : 'وردية نهارية'}
                        </p>
                        <DefinitionBranchBadge branchId={shift.branchId} info={branchInfo} />
                      </div>
                    </div>
                    <div className="flex items-center gap-1">
                      <span className={`px-2 py-1 rounded-lg text-xs font-medium ${color} bg-opacity-10 ${color.replace('bg-', 'text-')}`}>
                        #{shift.id}
                      </span>
                    </div>
                  </div>

                  {/* Time Info */}
                  <div className="mt-4 p-4 bg-gray-50 rounded-xl">
                    <div className="flex items-center justify-between">
                      <div className="text-center">
                        <p className="text-xs text-gray-400">بداية الدوام</p>
                        <p className="text-xl font-bold text-success-600 font-mono">{shift.startTime}</p>
                      </div>
                      <div className="flex-1 flex items-center justify-center">
                        <div className="w-20 h-0.5 bg-gray-200 relative">
                          <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 bg-white px-2">
                            <span className="text-xs text-gray-400">{workHours(shift)} ساعات</span>
                          </div>
                        </div>
                      </div>
                      <div className="text-center">
                        <p className="text-xs text-gray-400">نهاية الدوام</p>
                        <p className="text-xl font-bold text-danger-600 font-mono">{shift.endTime}</p>
                      </div>
                    </div>
                  </div>

                  {/* خصائص الوردية — كما هي محفوظة (فارغ = يرث القيمة العامة من السياسات) */}
                  <div className="mt-3 space-y-2">
                    {shift.attendanceRuleEffectiveFrom && <p className={`text-xs ${shift.attendanceRuleEffectiveFrom > localToday() ? 'text-amber-700' : 'text-gray-500'}`}>النسخة {shift.attendanceRuleVersion} · تسري من {shift.attendanceRuleEffectiveFrom}{shift.attendanceRuleEffectiveFrom > localToday() ? ' — إعداد مستقبلي' : ''}</p>}
                    <div className="flex flex-wrap items-center gap-1.5">
                      <span className="px-2 py-1 rounded-lg bg-gray-100 text-gray-600 text-xs font-medium">
                        {(shift.flexEnabled ?? shift.shiftMode === 'flexible') ? 'مرنة' : 'ثابتة'}
                      </span>
                      {shift.flexWindowMinutes != null && (
                        <span className="px-2 py-1 rounded-lg bg-gray-100 text-gray-600 text-xs">
                          نافذة {shift.startTime}–{offsetTime(shift.startTime, shift.flexWindowMinutes)} · المطلوب {shift.requiredWorkMinutes ?? Number(shift.requiredHours ?? 0) * 60} دقيقة
                        </span>
                      )}
                      {shift.flexEnabled == null && shift.shiftMode === 'flexible' && !shift.flexWindowMinutes && <span className="text-xs text-amber-700">تعريف قديم يحتاج ضبط نافذة صريحة قبل احتساب المرونة</span>}
                      <span
                        className="px-2 py-1 rounded-lg bg-gray-100 text-gray-600 text-xs"
                        title="سماحية التأخير — فارغة في الوردية تعني القيمة العامة من السياسات"
                      >
                        السماحية:{' '}
                        {shift.graceMinutes != null ? `${shift.graceMinutes} دقيقة` : 'عام'}
                      </span>
                      <span
                        className="px-2 py-1 rounded-lg bg-gray-100 text-gray-600 text-xs"
                        title="عتبة الأوفرتايم — فارغة في الوردية تعني القيمة العامة من السياسات"
                      >
                        الأوفرتايم:{' '}
                        {shift.overtimeThresholdHours != null
                          ? `${shift.overtimeThresholdHours} ساعة`
                          : 'عام'}
                      </span>
                    </div>
                    {(checkinWindow || checkoutWindow) && (
                      <div className="text-xs text-gray-500 space-y-0.5">
                        {checkinWindow && (
                          <p>
                            نافذة الدخول:{' '}
                            <span className="font-mono" dir="ltr">
                              {checkinWindow}
                            </span>
                          </p>
                        )}
                        {checkoutWindow && (
                          <p>
                            نافذة الخروج:{' '}
                            <span className="font-mono" dir="ltr">
                              {checkoutWindow}
                            </span>
                          </p>
                        )}
                      </div>
                    )}
                  </div>

                  {/* Footer */}
                  <div className="mt-4 pt-4 border-t border-gray-100 flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <Clock size={16} className="text-gray-400" />
                      <span className="text-sm text-gray-600" dir="ltr">
                        {shift.startTime} – {shift.endTime}
                      </span>
                    </div>
                    <div className="flex items-center gap-2">
                      <button
                        onClick={() => { setPendingToggle(shift); setToggleChange({ effectiveFrom: localToday(), changeReason: '' }); setToggleError('') }}
                        disabled={!canEditShift(shift) || togglingId === shift.id}
                        className={`px-2 py-1 rounded-lg text-xs font-medium transition-colors ${
                          shift.isActive
                            ? 'bg-success-50 text-success-600 hover:bg-success-100'
                            : 'bg-gray-100 text-gray-500 hover:bg-gray-200'
                        }`}
                      >
                        {togglingId === shift.id ? '...' : shift.isActive ? 'نشط' : 'غير نشط'}
                      </button>
                    </div>
                  </div>

                  {/* Actions */}
                  {canEditShift(shift) && (
                    <div className="mt-4 flex items-center gap-2">
                      <button
                        onClick={() => openEdit(shift)}
                        className="flex-1 btn-secondary text-sm py-2 flex items-center justify-center gap-1"
                      >
                        <Edit size={16} />
                        تعديل
                      </button>
                    </div>
                  )}
                </div>
              )
            })}

            {/* Add New Shift Card */}
            {canManage && (
              <button
                onClick={openAdd}
                className="card border-2 border-dashed border-gray-200 hover:border-primary-300 hover:bg-primary-50/50 transition-all flex flex-col items-center justify-center gap-4 min-h-[300px]"
              >
                <div className="w-16 h-16 bg-gray-100 rounded-2xl flex items-center justify-center">
                  <Plus size={32} className="text-gray-400" />
                </div>
                <div className="text-center">
                  <p className="font-medium text-gray-600">إضافة وردية جديدة</p>
                  <p className="text-sm text-gray-400 mt-1">أنشئ وردية عمل جديدة</p>
                </div>
              </button>
            )}
          </div>
        )}

        {/* Shift Assignment Section */}
        <div className="card">
          <h3 className="font-bold text-gray-800 mb-4">تعيين الورديات للموظفين</h3>
          <div className="grid grid-cols-3 gap-4">
            <Link href="/attendance/weekly-schedule" className="p-4 bg-gray-50 rounded-xl hover:bg-gray-100 transition-colors text-right">
              <Calendar size={24} className="text-primary-500 mb-2" />
              <p className="font-medium text-gray-800">الجدول الأسبوعي</p>
              <p className="text-sm text-gray-500 mt-1">عرض وتعديل جدول الورديات الأسبوعي</p>
            </Link>
            <Link href="/attendance/weekly-schedule" className="p-4 bg-gray-50 rounded-xl hover:bg-gray-100 transition-colors text-right">
              <Users size={24} className="text-success-500 mb-2" />
              <p className="font-medium text-gray-800">تعيين جماعي</p>
              <p className="text-sm text-gray-500 mt-1">تعيين وردية لمجموعة موظفين</p>
            </Link>
            <Link href="/attendance/weekly-schedule" className="p-4 bg-gray-50 rounded-xl hover:bg-gray-100 transition-colors text-right">
              <Copy size={24} className="text-warning-500 mb-2" />
              <p className="font-medium text-gray-800">نسخ من أسبوع سابق</p>
              <p className="text-sm text-gray-500 mt-1">نسخ جدول الورديات من أسبوع سابق</p>
            </Link>
          </div>
        </div>

        {/* Add / Edit Shift Modal */}
        {showModal && (
          <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded-2xl w-full max-w-xl max-h-[90vh] overflow-y-auto">
              <div className="p-6 border-b border-gray-100 flex items-center justify-between">
                <div>
                  <h2 className="text-xl font-bold text-gray-800">
                    {editingShift ? 'تعديل الوردية' : 'إضافة وردية جديدة'}
                  </h2>
                  <p className="text-sm text-gray-500 mt-1">
                    أوقات البداية والنهاية بصيغة HH:mm — مثال: 08:00
                  </p>
                </div>
                <button onClick={() => setShowModal(false)} className="p-2 hover:bg-gray-100 rounded-lg">
                  <X size={20} className="text-gray-500" />
                </button>
              </div>
              <div className="p-6 space-y-4">
                {modalError && (
                  <div className="bg-red-50 text-red-700 rounded-xl p-4">{modalError}</div>
                )}
                {/* نسخة مؤرخة تحفظ إعداد الأيام السابقة. */}
                {editingShift && (
                  <div className="flex items-start gap-2 p-3 rounded-xl bg-amber-50 border border-amber-100 text-amber-700 text-xs">
                    <AlertTriangle size={14} className="mt-0.5 shrink-0" />
                    <span>
                      تُحفظ أوقات الوردية في نسخة تبدأ من تاريخ السريان المختار. تبقى إعدادات الأيام السابقة محفوظة، والفترات المالية المقفلة محمية.
                    </span>
                  </div>
                )}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">اسم الوردية *</label>
                  <input
                    type="text"
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    className="input w-full"
                    placeholder="مثال: الوردية الصباحية"
                  />
                </div>
                <DefinitionBranchField
                  value={editingShift ? editingShift.branchId ?? null : formData.branchId}
                  onChange={(branchId) => setFormData({ ...formData, branchId })}
                  editing={!!editingShift}
                  info={branchInfo}
                  disabled={saving}
                />
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">بداية الدوام *</label>
                    <input
                      type="time"
                      value={formData.startTime}
                      onChange={(e) => setFormData({ ...formData, startTime: e.target.value })}
                      className="input w-full font-mono"
                      placeholder="08:00"
                      dir="ltr"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">نهاية الدوام *</label>
                    <input
                      type="time"
                      value={formData.endTime}
                      onChange={(e) => setFormData({ ...formData, endTime: e.target.value })}
                      className="input w-full font-mono"
                      placeholder="17:00"
                      dir="ltr"
                    />
                  </div>
                </div>
                {/* وردية ليلية (النهاية قبل البداية) — تُحسب عبر منتصف الليل */}
                {formData.startTime && formData.endTime && formData.endTime < formData.startTime && (
                  <div className="flex items-start gap-2 p-3 rounded-xl bg-purple-50 border border-purple-100 text-purple-700 text-xs">
                    <Moon size={14} className="mt-0.5 shrink-0" />
                    <span>
                      وردية ليلية تنتهي صباح اليوم التالي: بصمة الانصراف بعد منتصف الليل تُنسب ليوم
                      بداية الوردية، والانصراف المبكر والأوفرتايم يُحسبان على نهايتها في الغد.
                      نافذة الخروج (إن ضُبطت) تُكتب بساعات الصباح (مثل 05:00 – 09:00).
                    </span>
                  </div>
                )}

                <div className="space-y-3 rounded-xl bg-blue-50 p-4">
                  <label className="flex items-center gap-2 font-medium"><input type="checkbox" checked={formData.flexEnabled} onChange={e => setFormData({ ...formData, flexEnabled: e.target.checked })} />تفعيل نافذة الحضور المرنة</label>
                  <div className="grid grid-cols-2 gap-3">
                    <label className="text-sm">مدة النافذة (دقيقة)<input type="number" min="1" max="1439" step="1" className="input w-full" value={formData.flexWindowMinutes} onChange={e => setFormData({ ...formData, flexWindowMinutes: e.target.value })} /></label>
                    <label className="text-sm">العمل المطلوب (دقيقة)<input type="number" min="1" max="1440" step="1" className="input w-full" value={formData.requiredWorkMinutes} onChange={e => setFormData({ ...formData, requiredWorkMinutes: e.target.value })} /></label>
                  </div>
                  {formData.startTime && formData.flexWindowMinutes && <p className="text-sm">الحضور المسموح: {formData.startTime}–{offsetTime(formData.startTime, Number(formData.flexWindowMinutes))} · الانصراف بعد إكمال {Number(formData.requiredWorkMinutes) / 60 || '—'} ساعات.</p>}
                  <p className="text-xs text-blue-800">نقص ساعات العمل يُحسب مستقلًا عن التأخير. بعد النافذة يبدأ التأخير من بداية الدوام الرسمية، وإكمال الساعات لا يلغي التأخير ولا يمنح إضافيًا تلقائيًا.</p>
                </div>
                <div className="grid gap-3">
                  <label className="text-sm">تاريخ السريان<input type="date" required className="input w-full" value={formData.effectiveFrom} onChange={e => setFormData({ ...formData, effectiveFrom: e.target.value })} /></label>
                  <label className="text-sm">سبب الإنشاء أو التعديل<textarea required maxLength={500} className="input w-full" value={formData.changeReason} onChange={e => setFormData({ ...formData, changeReason: e.target.value })} /></label>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">سماحية التأخير (دقيقة)</label>
                    <input type="number" value={formData.graceMinutes}
                      onChange={(e) => setFormData({ ...formData, graceMinutes: e.target.value })}
                      className="input w-full" placeholder="عام" dir="ltr" />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">عتبة الأوفرتايم (ساعة)</label>
                    <input type="number" step="0.25" value={formData.overtimeThresholdHours}
                      onChange={(e) => setFormData({ ...formData, overtimeThresholdHours: e.target.value })}
                      className="input w-full" placeholder="عام" dir="ltr" />
                  </div>
                </div>
                <p className="text-xs text-gray-500">اتركهما فارغين لاستخدام القيمة العامة من السياسات.</p>

                {/* نوافذ البصمة — تصنيف الدخول/الخروج */}
                <div className="p-3 bg-gray-50 rounded-xl border border-gray-100">
                  <p className="text-sm font-medium text-gray-700 mb-2">نوافذ البصمة (اختياري)</p>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-xs text-gray-500 mb-1">نافذة الدخول (من – إلى)</label>
                      <div className="flex gap-2">
                        <input type="time" value={formData.checkinFrom} onChange={(e) => setFormData({ ...formData, checkinFrom: e.target.value })} className="input w-full font-mono" placeholder="07:00" dir="ltr" />
                        <input type="time" value={formData.checkinTo} onChange={(e) => setFormData({ ...formData, checkinTo: e.target.value })} className="input w-full font-mono" placeholder="11:00" dir="ltr" />
                      </div>
                    </div>
                    <div>
                      <label className="block text-xs text-gray-500 mb-1">نافذة الخروج (من – إلى)</label>
                      <div className="flex gap-2">
                        <input type="time" value={formData.checkoutFrom} onChange={(e) => setFormData({ ...formData, checkoutFrom: e.target.value })} className="input w-full font-mono" placeholder="16:00" dir="ltr" />
                        <input type="time" value={formData.checkoutTo} onChange={(e) => setFormData({ ...formData, checkoutTo: e.target.value })} className="input w-full font-mono" placeholder="21:00" dir="ltr" />
                      </div>
                    </div>
                  </div>
                  <p className="text-xs text-gray-400 mt-2">بصمة داخل نافذة الدخول = حضور، وداخل نافذة الخروج = انصراف (فبصمة مسائية وحيدة = خروج لا دخول). فارغة = السلوك الافتراضي.</p>
                </div>
              </div>
              <div className="p-6 border-t border-gray-100 flex items-center justify-end gap-3">
                <button onClick={() => setShowModal(false)} className="btn-secondary">
                  إلغاء
                </button>
                <button
                  onClick={handleSave}
                  className="btn-primary"
                  disabled={saving || !formData.name || !formData.startTime || !formData.endTime}
                >
                  {saving ? 'جارٍ الحفظ...' : editingShift ? 'حفظ التعديلات' : 'إضافة الوردية'}
                </button>
              </div>
            </div>
          </div>
        )}
        {pendingToggle && <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl w-full max-w-lg p-6 space-y-4">
            <h2 className="text-xl font-bold">{pendingToggle.isActive ? 'تعطيل' : 'تفعيل'} وردية «{pendingToggle.name}»</h2>
            <p className="text-sm text-gray-600">يسري تغيير الحالة من التاريخ المحدد مع بقاء سجل الوردية وأيامها السابقة.</p>
            {toggleError && <p role="alert" className="text-red-700">{toggleError}</p>}
            <label className="block">تاريخ السريان<input type="date" className="input w-full" value={toggleChange.effectiveFrom} onChange={e => setToggleChange({ ...toggleChange, effectiveFrom: e.target.value })} /></label>
            <label className="block">السبب<textarea maxLength={500} className="input w-full" value={toggleChange.changeReason} onChange={e => setToggleChange({ ...toggleChange, changeReason: e.target.value })} /></label>
            <div className="flex gap-3"><button className="btn-primary" disabled={togglingId !== null} onClick={() => handleToggleActive(pendingToggle)}>حفظ تغيير الحالة</button><button className="btn-secondary" disabled={togglingId !== null} onClick={() => setPendingToggle(null)}>إلغاء</button></div>
          </div>
        </div>}
      </div>
    </MainLayout>
  )
}
