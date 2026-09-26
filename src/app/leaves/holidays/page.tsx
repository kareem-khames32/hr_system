'use client'

import { useEffect, useState } from 'react'
import { MainLayout } from '@/components/layout'
import {
  Plus,
  Calendar,
  Edit2,
  Star,
  Sun,
  X,
  AlertTriangle,
  Trash2,
} from 'lucide-react'
import {
  can,
  fetchBranches,
  fetchCatalog,
  fetchConfig,
  fetchDepartments,
  fetchEmployees,
  fetchTeams,
  createCatalogItem,
  updateCatalogItem,
  deleteCatalogItem,
  type ApiBranch,
  type ApiDepartment,
  type ApiEmployee,
  type ApiTeam,
} from '@/lib/api'
import { buildCalendarChange, calendarScopeWritable, type PayrollCalendarChange } from '@/lib/payroll-calendar-api'
import { CalendarChangeFields, CalendarContextSummary, CalendarMutationDialog, CalendarScopeConfirmation, useCalendarContext } from '@/components/PayrollCalendarChange'
import { OrgTargetPicker, type OrgTarget } from '@/components/OrgTargetPicker'
import {
  describeHolidayAudience,
  holidayAudienceToTarget,
  holidayTargetIncomplete,
  holidayTargetToAudience,
  isHolidayAudience,
  type ApiHolidayAudience,
} from '@/lib/holiday-audience'

interface Holiday {
  id: number
  name: string
  date: string
  endDate?: string | null
  country?: string | null
  // «تسري على» (ترحيل 070): null = للكل؛ audienceText وصف جاهز من الخادم بالأسماء
  audience?: ApiHolidayAudience | null
  audienceText?: string
  audienceInvalid?: boolean
}

// «تسري على»: الشركة كلها افتراضيًا (نفس سلوك كل العطلات القديمة)
const EVERYONE: OrgTarget = { level: 'company', branchId: null, departmentIds: [], teamIds: [], employeeIds: [] }
const audienceOf = (h: Holiday): ApiHolidayAudience | null => (isHolidayAudience(h.audience) ? h.audience : null)
// «للكل» / «فرع المعادي» / «فرع المعادي — قسم المبيعات» / «3 موظفين» — وصف الخادم بالأسماء، وإلا بالعدد
const audienceLabel = (h: Holiday): string =>
  h.audienceInvalid ? 'تخصيص غير مقروء — راجع العطلة' : h.audienceText || describeHolidayAudience(audienceOf(h))

const daysOf = (h: Holiday): number => {
  if (!h.endDate) return 1
  const start = new Date(h.date).getTime()
  const end = new Date(h.endDate).getTime()
  if (isNaN(start) || isNaN(end) || end < start) return 1
  return Math.round((end - start) / 86400000) + 1
}

// أشهر السنة (0-11) اللي يلمسها مدى العطلة — من نص التاريخ (بلا إزاحة توقيت)،
// فالعطلة الممتدة تظهر في كل شهر من مداها مش في شهر بدايتها بس
const monthsOf = (h: Holiday): Set<number> => {
  const start = String(h.date).slice(0, 10)
  const endRaw = h.endDate ? String(h.endDate).slice(0, 10) : ''
  const end = endRaw && endRaw >= start ? endRaw : start
  let y = Number(start.slice(0, 4))
  let m = Number(start.slice(5, 7))
  const ey = Number(end.slice(0, 4))
  const em = Number(end.slice(5, 7))
  const out = new Set<number>()
  while ((y < ey || (y === ey && m <= em)) && out.size < 12) {
    out.add(m - 1)
    m += 1
    if (m > 12) {
      m = 1
      y += 1
    }
  }
  return out
}

// مدى العطلة في خانة الشهر: «يوم - يوم»، والممتدة عبر أكثر من شهر «يوم/شهر - يوم/شهر»
const rangeLabel = (h: Holiday): string => {
  const start = String(h.date).slice(0, 10)
  const end = h.endDate ? String(h.endDate).slice(0, 10) : ''
  const day = (s: string) => Number(s.slice(8, 10))
  const dayMonth = (s: string) => `${day(s)}/${Number(s.slice(5, 7))}`
  if (!end || end === start) return String(day(start))
  return start.slice(0, 7) === end.slice(0, 7)
    ? `${day(start)} - ${day(end)}`
    : `${dayMonth(start)} - ${dayMonth(end)}`
}

export default function HolidaysPage() {
  const [holidays, setHolidays] = useState<Holiday[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  // تنبيه الحفظ/الحذف من الباك (مثل: العطلة داخل فترة مسير رواتب قائم)
  const [notice, setNotice] = useState('')

  const [showModal, setShowModal] = useState(false)
  const [editing, setEditing] = useState<Holiday | null>(null)
  const [formName, setFormName] = useState('')
  const [formDate, setFormDate] = useState('')
  const [formEndDate, setFormEndDate] = useState('')
  const [formCountry, setFormCountry] = useState('')
  // «تسري على» — نفس منتقي الاستهداف الموحّد (الشركة كلها ← فرع ← أقسامه/فرقه/موظفينه)
  const [formTarget, setFormTarget] = useState<OrgTarget>(EVERYONE)
  const [org, setOrg] = useState<{ branches: ApiBranch[]; departments: ApiDepartment[]; teams: ApiTeam[]; employees: ApiEmployee[] } | null>(null)
  const [orgError, setOrgError] = useState('')
  const [saving, setSaving] = useState(false)
  const [saveError, setSaveError] = useState('')
  const [deletingId, setDeletingId] = useState<number | null>(null)
  const [deleteTarget, setDeleteTarget] = useState<Holiday | null>(null)
  const [calendarRefresh, setCalendarRefresh] = useState(0)
  const calendar = useCalendarContext('GLOBAL', 0, showModal)
  const currentHoliday = editing && calendar.context ? (calendar.context.current.holidays as Holiday[]).find(row => row.id === editing.id) : null
  useEffect(() => {
    if (!editing || !calendar.context) return
    const row = (calendar.context.current.holidays as Holiday[]).find(item => item.id === editing.id)
    if (!row) { setSaveError('العطلة غير موجودة في نسخة التقويم الحالية. أغلق النموذج وأعد تحميل القائمة.'); return }
    setFormName(row.name); setFormDate(row.date); setFormEndDate(row.endDate ?? ''); setFormCountry(row.country ?? '')
    // «تسري على» من نسخة التقويم الحالية نفسها (اللي الحفظ هيتقارن بيها)
    setFormTarget(holidayAudienceToTarget(audienceOf(row)))
  }, [calendar.context, editing])
  // الفروع والأقسام والفرق والموظفين للمنتقي — مرة واحدة أول ما النموذج يتفتح
  useEffect(() => {
    if (!showModal || org) return
    let alive = true
    setOrgError('')
    Promise.all([fetchBranches(), fetchDepartments(), fetchTeams().catch(() => [] as ApiTeam[]), fetchEmployees()])
      .then(([branches, departments, teams, employees]) => { if (alive) setOrg({ branches, departments, teams, employees }) })
      .catch((e) => { if (alive) setOrgError(e instanceof Error ? e.message : 'تعذر تحميل الفروع والموظفين') })
    return () => { alive = false }
  }, [showModal, org])
  // الحذف لمن يدير الإعدادات فقط (الباك يفرضها أيضاً)
  const [canManage, setCanManage] = useState(false)
  useEffect(() => setCanManage(can('settings.manage') && calendarScopeWritable('GLOBAL', 0)), [])

  const load = () => {
    setLoading(true)
    fetchCatalog<Holiday>('holidays')
      .then(setHolidays)
      .catch((e) => setError(e instanceof Error ? e.message : 'تعذر تحميل العطلات الرسمية'))
      .finally(() => setLoading(false))
  }

  useEffect(load, [])

  const openAdd = async () => {
    if (!can('settings.manage') || !calendarScopeWritable('GLOBAL', 0)) return
    setEditing(null)
    setFormName('')
    setFormDate('')
    setFormEndDate('')
    setFormCountry('')
    setFormTarget(EVERYONE)
    setSaveError('')
    try {
      const config = await fetchConfig()
      setFormCountry(config.find((row) => row.key === 'system.country')?.value ?? '')
    } catch (e) {
      setSaveError(`تعذر تحميل البلد الافتراضي؛ حدد البلد قبل الحفظ: ${e instanceof Error ? e.message : 'خطأ غير معروف'}`)
    }
    setShowModal(true)
  }

  // «إضافة عطلة» من التقويم الموحّد يفتح النموذج مباشرة: /leaves/holidays?add=1
  useEffect(() => {
    if (!can('settings.manage')) return
    if (new URLSearchParams(window.location.search).get('add') !== '1') return
    openAdd()
    // الرابط يُستهلك مرة واحدة — لا يُعاد فتح النموذج بعد الحفظ أو إعادة التحميل
    window.history.replaceState(null, '', window.location.pathname)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const openEdit = (h: Holiday) => {
    setEditing(h)
    setFormName(h.name)
    setFormDate(h.date)
    setFormEndDate(h.endDate ?? '')
    setFormCountry(h.country ?? '')
    setFormTarget(holidayAudienceToTarget(audienceOf(h)))
    setSaveError('')
    setShowModal(true)
  }

  const save = async () => {
    setSaveError('')
    if (!canManage || saving || (editing && !currentHoliday)) return
    // عطلة ممتدة: النهاية لا تسبق البداية (الباك يرفضها أيضاً)
    if (formEndDate && formEndDate < formDate) {
      setSaveError('تاريخ النهاية لا يسبق تاريخ البداية')
      return
    }
    if (holidayTargetIncomplete(formTarget)) {
      setSaveError('كمّل اختيار «تسري على»: الفرع، والأقسام أو الفرق أو الموظفين')
      return
    }
    let calendarChange: PayrollCalendarChange
    try { calendarChange = buildCalendarChange(calendar.context, calendar.evidence) }
    catch (cause) { setSaveError((cause as Error).message); return }
    setSaving(true)
    const payload: Record<string, unknown> = {
      name: formName,
      date: formDate,
      endDate: formEndDate || null,
      // الإضافة تبدأ ببلد النظام والتعديل بقيمة العطلة المحمّلة؛ فارغ = كل الدول.
      country: formCountry.trim(),
      // «تسري على»: null = للكل
      audience: holidayTargetToAudience(formTarget),
      calendarChange,
    }
    try {
      const saved: { warning?: string } = editing
        ? await updateCatalogItem('holidays', editing.id, payload)
        : await createCatalogItem('holidays', payload)
      setNotice(saved?.warning ?? '')
      setShowModal(false)
      setCalendarRefresh(value => value + 1)
      load()
    } catch (e) {
      setSaveError(e instanceof Error ? e.message : 'تعذر حفظ العطلة')
    } finally {
      setSaving(false)
    }
  }

  // إيقاف مؤرخ مع بقاء أدلة النسخ السابقة.
  const remove = async (h: Holiday, calendarChange: PayrollCalendarChange) => {
    setError('')
    setDeletingId(h.id)
    try {
      const r = await deleteCatalogItem('holidays', h.id, calendarChange)
      setNotice(r?.warning ?? '')
      load()
      setCalendarRefresh(value => value + 1)
    } catch (e) {
      setError(e instanceof Error ? e.message : 'تعذر حذف العطلة')
      throw e
    } finally {
      setDeletingId(null)
    }
  }

  const today = new Date().toISOString().slice(0, 10)
  const totalDays = holidays.reduce((sum, h) => sum + daysOf(h), 0)
  const upcoming = holidays.filter((h) => (h.endDate ?? h.date) >= today).length
  const multiDay = holidays.filter((h) => daysOf(h) > 1).length
  // النهاية قبل البداية (min لا يمنع الكتابة اليدوية) — تنبيه تحت الحقل ومنع الحفظ
  const endBeforeStart = !!formEndDate && !!formDate && formEndDate < formDate

  return (
    <MainLayout>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-gray-800">العطلات الرسمية</h1>
            <p className="text-gray-500 mt-1">إدارة العطلات الرسمية وأيامها</p>
          </div>
          <div className="flex items-center gap-3">
            {canManage && (
              <button onClick={openAdd} className="btn-primary flex items-center gap-2">
                <Plus size={18} />
                إضافة عطلة
              </button>
            )}
          </div>
        </div>

        {/* Error Banner */}
        <CalendarScopeConfirmation key={calendarRefresh} scope="GLOBAL" sourceId={0} canConfirm={canManage} disabled={showModal || !!deleteTarget} onConfirmed={() => { load(); calendar.reload() }} />
        {error && (
          <div className="bg-red-50 text-red-700 rounded-xl p-4 flex items-center gap-2">
            <AlertTriangle size={18} />
            {error}
          </div>
        )}
        {notice && (
          <div className="bg-amber-50 text-amber-800 rounded-xl p-4 flex items-center gap-2">
            <AlertTriangle size={18} />
            <span className="flex-1">{notice}</span>
            <button onClick={() => setNotice('')} className="p-1 hover:bg-amber-100 rounded-lg">
              <X size={16} />
            </button>
          </div>
        )}

        {/* Stats */}
        <div className="grid grid-cols-4 gap-4">
          <div className="card flex items-center gap-4">
            <div className="w-12 h-12 bg-primary-100 rounded-2xl flex items-center justify-center">
              <Calendar size={24} className="text-primary-600" />
            </div>
            <div>
              <p className="text-sm text-gray-500">إجمالي العطلات</p>
              <p className="text-2xl font-bold text-gray-800">{holidays.length}</p>
            </div>
          </div>
          <div className="card flex items-center gap-4">
            <div className="w-12 h-12 bg-green-100 rounded-2xl flex items-center justify-center">
              <Star size={24} className="text-green-600" />
            </div>
            <div>
              <p className="text-sm text-gray-500">عطلات قادمة</p>
              <p className="text-2xl font-bold text-gray-800">{upcoming}</p>
            </div>
          </div>
          <div className="card flex items-center gap-4">
            <div className="w-12 h-12 bg-blue-100 rounded-2xl flex items-center justify-center">
              <Calendar size={24} className="text-blue-600" />
            </div>
            <div>
              <p className="text-sm text-gray-500">عطلات متعددة الأيام</p>
              <p className="text-2xl font-bold text-gray-800">{multiDay}</p>
            </div>
          </div>
          <div className="card flex items-center gap-4">
            <div className="w-12 h-12 bg-purple-100 rounded-2xl flex items-center justify-center">
              <Sun size={24} className="text-purple-600" />
            </div>
            <div>
              <p className="text-sm text-gray-500">إجمالي الأيام</p>
              <p className="text-2xl font-bold text-gray-800">{totalDays}</p>
            </div>
          </div>
        </div>

        {loading ? (
          <div className="flex items-center justify-center py-16">
            <div className="w-8 h-8 border-2 border-primary-500 border-t-transparent rounded-full animate-spin" />
          </div>
        ) : (
        <>
        {/* Calendar View */}
        <div className="card">
          <h2 className="text-lg font-bold text-gray-800 mb-4">التقويم السنوي</h2>
          <div className="grid grid-cols-4 gap-4">
            {[
              'يناير', 'فبراير', 'مارس', 'أبريل',
              'مايو', 'يونيو', 'يوليو', 'أغسطس',
              'سبتمبر', 'أكتوبر', 'نوفمبر', 'ديسمبر'
            ].map((month, index) => {
              const monthHolidays = holidays.filter((h) => monthsOf(h).has(index))
              return (
                <div key={month} className="p-4 bg-gray-50 rounded-xl">
                  <h3 className="font-medium text-gray-800 mb-2">{month}</h3>
                  {monthHolidays.length > 0 ? (
                    <div className="space-y-2">
                      {monthHolidays.map((h) => (
                        <div
                          key={h.id}
                          title={`تسري على: ${audienceLabel(h)}`}
                          className={`p-2 rounded-lg text-xs ${audienceOf(h) || h.audienceInvalid ? 'bg-amber-100 text-amber-800' : 'bg-primary-100 text-primary-700'}`}
                        >
                          <div className="flex items-center gap-1">
                            <Star size={12} />
                            <span className="font-medium">{h.name}</span>
                          </div>
                          <span className="text-xs opacity-75">{rangeLabel(h)}</span>
                          {(audienceOf(h) || h.audienceInvalid) && <span className="block text-xs opacity-75">{audienceLabel(h)}</span>}
                        </div>
                      ))}
                    </div>
                  ) : (
                    <p className="text-xs text-gray-400">لا توجد إجازات</p>
                  )}
                </div>
              )
            })}
          </div>
        </div>

        {/* Holidays List */}
        <div className="card">
          <h2 className="text-lg font-bold text-gray-800 mb-4">قائمة الإجازات</h2>
          <div className="space-y-3">
            {holidays.map((holiday) => (
              <div
                key={holiday.id}
                className="flex items-center justify-between p-4 bg-gray-50 rounded-xl hover:bg-gray-100 transition-colors"
              >
                <div className="flex items-center gap-4">
                  <div className="w-12 h-12 rounded-xl flex items-center justify-center bg-primary-100 text-primary-700">
                    <Star size={24} />
                  </div>
                  <div>
                    <h3 className="font-medium text-gray-800">{holiday.name}</h3>
                    <p className="text-sm text-gray-500">
                      {holiday.date}
                      {holiday.endDate && ` - ${holiday.endDate}`}
                    </p>
                    <p className={`text-xs mt-1 ${audienceOf(holiday) || holiday.audienceInvalid ? 'text-amber-700' : 'text-gray-500'}`} data-holiday-audience>
                      تسري على: {audienceLabel(holiday)}
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-4">
                  <div className="text-left">
                    <span className="px-3 py-1 rounded-full text-xs font-medium bg-primary-100 text-primary-700">
                      {holiday.country || 'كل الدول'}
                    </span>
                    <p className="text-sm text-gray-500 mt-1">{daysOf(holiday)} يوم</p>
                  </div>
                  <div className="flex items-center gap-2">
                    {canManage && (
                      <button
                        onClick={() => openEdit(holiday)}
                        className="p-2 bg-white rounded-lg hover:bg-gray-200"
                      >
                        <Edit2 size={16} className="text-gray-600" />
                      </button>
                    )}
                    {canManage && (
                      <button
                        onClick={() => setDeleteTarget(holiday)}
                        disabled={deletingId === holiday.id}
                        className="p-2 bg-white rounded-lg hover:bg-red-50 disabled:opacity-50"
                        title="إيقاف العطلة من تاريخ"
                      >
                        <Trash2 size={16} className="text-red-600" />
                      </button>
                    )}
                  </div>
                </div>
              </div>
            ))}
            {holidays.length === 0 && (
              <p className="text-sm text-gray-400 text-center py-6">لا توجد عطلات مسجلة</p>
            )}
          </div>
        </div>
        </>
        )}
      </div>

      {deleteTarget && <CalendarMutationDialog scope="GLOBAL" sourceId={0} title={`إيقاف العطلة «${deleteTarget.name}» من تاريخ`} description="يحفظ الإيقاف نسخة للتقويم، وتبقى النسخ السابقة محفوظة. لا يصحح مسيرًا معتمدًا أو مصروفًا." onClose={() => setDeleteTarget(null)} onSave={change => remove(deleteTarget, change)} />}
      {/* Add/Edit Modal */}
      {showModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl w-full max-w-xl max-h-[90vh] overflow-y-auto p-6 shadow-xl">
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-bold text-gray-800 text-lg">
                {editing ? 'تعديل العطلة' : 'إضافة عطلة جديدة'}
              </h3>
              <button
                onClick={() => setShowModal(false)}
                className="p-2 hover:bg-gray-100 rounded-lg"
              >
                <X size={20} className="text-gray-500" />
              </button>
            </div>

            {saveError && (
              <div className="bg-red-50 text-red-700 rounded-xl p-4 mb-4 flex items-center gap-2">
                <AlertTriangle size={18} />
                {saveError}
              </div>
            )}

            <CalendarContextSummary context={calendar.context} loading={calendar.loading} error={calendar.error} />
            <fieldset disabled={saving || !calendar.context || calendar.context.currentMatchesHistory === false} className="space-y-4 mt-4">
              <div>
                <label className="label">اسم العطلة *</label>
                <input
                  type="text"
                  value={formName}
                  onChange={(e) => setFormName(e.target.value)}
                  className="input"
                  placeholder="مثال: عيد الفطر"
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="label">تاريخ البداية *</label>
                  <input
                    type="date"
                    value={formDate}
                    onChange={(e) => setFormDate(e.target.value)}
                    className="input"
                  />
                </div>
                <div>
                  <label className="label">تاريخ النهاية (اختياري)</label>
                  <input
                    type="date"
                    value={formEndDate}
                    min={formDate || undefined}
                    onChange={(e) => setFormEndDate(e.target.value)}
                    className="input"
                  />
                  {endBeforeStart && (
                    <p className="text-xs text-red-600 mt-1">
                      تاريخ النهاية لا يسبق تاريخ البداية
                    </p>
                  )}
                </div>
              </div>
              <div>
                <label className="label">الدولة (اختياري)</label>
                <input
                  type="text"
                  value={formCountry}
                  onChange={(e) => setFormCountry(e.target.value.toUpperCase())}
                  className="input"
                  placeholder="فارغ = كل الدول"
                  maxLength={5}
                  dir="ltr"
                />
                <p className="text-xs text-gray-400 mt-1">
                  تسري العطلة على فروع هذه الدولة فقط، وفارغ = كل الدول (الفرع بلا دولة تسري عليه كل العطلات)
                </p>
              </div>
              {/* «تسري على» (طلب المالك 26 سبتمبر): الكل أو فرع أو أقسام أو فرق أو موظفين بالاسم */}
              <div className="border-t border-gray-100 pt-4" data-holiday-audience-picker>
                <label className="label">تسري على</label>
                {orgError && <p role="alert" className="text-sm text-red-600 mb-2">{orgError}</p>}
                {org === null ? (
                  !orgError && <p className="text-sm text-gray-500">جارٍ تحميل الفروع والموظفين…</p>
                ) : (
                  <OrgTargetPicker
                    value={formTarget}
                    onChange={setFormTarget}
                    branches={org.branches}
                    departments={org.departments}
                    teams={org.teams}
                    employees={org.employees}
                    disabled={saving}
                  />
                )}
                <p className="text-xs text-gray-500 mt-2">
                  {formTarget.level === 'company'
                    ? 'العطلة لكل الموظفين (في دولتها).'
                    : 'العطلة للمختارين بس. غيرهم اليوم ده عندهم يوم عادي: بيتحسب شغل، واللي مايبصمش يتسجل غياب، والإجازة بتعدّه.'}
                  {formTarget.level === 'departments' && ' القسم بيشمل أقسامه الفرعية.'}
                </p>
              </div>
            </fieldset>
            <div className="mt-4"><CalendarChangeFields context={calendar.context} value={calendar.evidence} onChange={calendar.setEvidence} disabled={saving} /></div>

            <div className="flex items-center gap-3 mt-6 pt-4 border-t border-gray-100">
              <button
                onClick={save}
                disabled={saving || !calendar.context || calendar.context.currentMatchesHistory === false || !!(editing && !currentHoliday) || !formName || !formDate || endBeforeStart}
                className="btn-primary flex-1 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {saving ? 'جارٍ الحفظ...' : editing ? 'حفظ التعديلات' : 'إضافة العطلة'}
              </button>
              <button onClick={() => setShowModal(false)} className="btn-secondary">
                إلغاء
              </button>
            </div>
          </div>
        </div>
      )}
    </MainLayout>
  )
}
