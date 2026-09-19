'use client'

// شاشة «دوام أيام العطلات» (تحت الحضور):
// - أمر دوام يوم عطلة = الموارد البشرية بتفتح يوم جمعة/سبت أو عطلة رسمية لموظفين (معتمد من الأول).
// - اللي بيجي بيتحسبله ساعاته من البصمة (أول دخول → آخر خروج) × سعر الساعة × المضاعف، وبينزل «بدل دوام أيام العطلات»
//   في استحقاقات مسير الشهر اللي فيه اليوم. اللي ماجاش مالوش حاجة ومابيتخصمش، واللي جه من نفسه من غير أمر أو طلب معتمد مالوش بدل.
// - طلبات الموظفين «دوام يوم عطلة» المعتمدة بتظهر هنا كمان (بتتلغي بس).
import { useEffect, useMemo, useState } from 'react'
import { AlertTriangle, Ban, CalendarCheck, Eye, Pencil, Plus, RefreshCw, X } from 'lucide-react'
import { MainLayout } from '@/components/layout'
import { OrgTargetPicker, describeOrgTarget, initialOrgTarget, resolveOrgTarget, type OrgTarget } from '@/components/OrgTargetPicker'
import {
  can,
  cancelHolidayWorkOrder,
  createHolidayWorkOrder,
  fetchBranches,
  fetchDepartments,
  fetchEmployees,
  fetchHolidayWorkOrder,
  fetchHolidayWorkOrders,
  fetchHolidayWorkSettings,
  fetchTeams,
  getCurrentUser,
  updateHolidayWorkOrder,
  updateHolidayWorkSettings,
  type ApiBranch,
  type ApiDepartment,
  type ApiEmployee,
  type ApiHolidayWorkOrder,
  type ApiTeam,
} from '@/lib/api'
import { formatMoney } from '@/lib/money'

type StatusFilter = 'ACTIVE' | 'CANCELLED' | 'ALL'
type KindFilter = 'ORDER' | 'REQUEST' | 'ALL'

const errorText = (cause: unknown, fallback: string) => (cause instanceof Error && cause.message ? cause.message : fallback)
const PAYROLL_STATE: Record<string, string> = { IN_DRAFT: 'محسوب في مسير لسه ما اتعتمدش', APPROVED_RUN: 'في مسير معتمد', PAID: 'اتصرف' }

interface FormState {
  id: number | null
  name: string
  target: OrgTarget
  dates: string[]
  dateInput: string
  multiplier: string
  note: string
}

function targetOf(order: ApiHolidayWorkOrder): OrgTarget {
  const base = { level: order.targetLevel, branchId: order.branchId, departmentIds: [], teamIds: [], employeeIds: [] } as OrgTarget
  if (order.targetLevel === 'departments') base.departmentIds = order.targetIds
  if (order.targetLevel === 'teams') base.teamIds = order.targetIds
  if (order.targetLevel === 'employees') base.employeeIds = order.targetIds
  return base
}

function HolidayWorkContent() {
  const canView = can('attendance.view_all') || can('attendance.manage')
  const canManage = can('attendance.manage')
  const lockedBranchId = useMemo(() => {
    const user = getCurrentUser()
    return user && user.role !== 'super_admin' && user.branchId ? user.branchId : null
  }, [])
  const [status, setStatus] = useState<StatusFilter>('ACTIVE')
  const [kind, setKind] = useState<KindFilter>('ALL')
  const [reload, setReload] = useState(0)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [notice, setNotice] = useState('')
  const [orders, setOrders] = useState<ApiHolidayWorkOrder[]>([])
  const [canSeeAmounts, setCanSeeAmounts] = useState(false)
  const [settings, setSettings] = useState<{ multiplier: number; canEdit: boolean } | null>(null)
  const [multiplierDraft, setMultiplierDraft] = useState('')
  const [branches, setBranches] = useState<ApiBranch[]>([])
  const [departments, setDepartments] = useState<ApiDepartment[]>([])
  const [teams, setTeams] = useState<ApiTeam[]>([])
  const [employees, setEmployees] = useState<ApiEmployee[]>([])
  const [form, setForm] = useState<FormState | null>(null)
  const [formError, setFormError] = useState('')
  const [saving, setSaving] = useState(false)
  const [detail, setDetail] = useState<ApiHolidayWorkOrder | null>(null)
  const [detailLoading, setDetailLoading] = useState(false)
  const [cancelling, setCancelling] = useState<{ order: ApiHolidayWorkOrder; reason: string } | null>(null)

  useEffect(() => {
    if (!canView) return
    let alive = true
    setLoading(true)
    setError('')
    fetchHolidayWorkOrders({ status, kind })
      .then(data => { if (!alive) return; setOrders(data.orders); setCanSeeAmounts(data.canSeeAmounts) })
      .catch(cause => alive && setError(errorText(cause, 'تعذر تحميل أوامر دوام أيام العطلات')))
      .finally(() => alive && setLoading(false))
    return () => { alive = false }
  }, [status, kind, reload, canView])

  useEffect(() => {
    if (!canView) return
    fetchHolidayWorkSettings().then(value => { setSettings(value); setMultiplierDraft(String(value.multiplier)) }).catch(() => setSettings(null))
    if (!canManage) return
    Promise.all([fetchBranches(), fetchDepartments(), fetchTeams(), fetchEmployees()])
      .then(([b, d, t, e]) => { setBranches(b); setDepartments(d); setTeams(t); setEmployees(e) })
      .catch(cause => setError(errorText(cause, 'تعذر تحميل الفروع والأقسام والموظفين')))
  }, [canView, canManage])

  const openCreate = () => {
    setFormError('')
    setForm({ id: null, name: '', target: initialOrgTarget(lockedBranchId), dates: [], dateInput: '', multiplier: settings ? String(settings.multiplier) : '1.5', note: '' })
  }
  const openEdit = (order: ApiHolidayWorkOrder) => {
    setFormError('')
    setForm({ id: order.id, name: order.name, target: targetOf(order), dates: [...order.dates], dateInput: '', multiplier: String(order.multiplier), note: order.note ?? '' })
  }
  const addDate = () => {
    if (!form) return
    const value = form.dateInput
    if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) { setFormError('اختار اليوم الأول'); return }
    setFormError('')
    setForm({ ...form, dates: [...new Set([...form.dates, value])].sort(), dateInput: '' })
  }

  const needsPick = (target: OrgTarget) => target.level !== 'company' && (target.branchId == null ||
    (target.level === 'departments' && !target.departmentIds.length) ||
    (target.level === 'teams' && !(target.teamIds ?? []).length) ||
    (target.level === 'employees' && !target.employeeIds.length))

  const save = async () => {
    if (!form || saving) return
    if (form.name.trim().length < 2) { setFormError('اكتب اسم للأمر (مثال: جرد المخزن يوم الجمعة)'); return }
    if (needsPick(form.target)) { setFormError('كمّل اختيار على مين'); return }
    if (!form.dates.length) { setFormError('زوّد يوم عطلة واحد على الأقل'); return }
    const input = {
      name: form.name.trim(), targetLevel: form.target.level, branchId: form.target.level === 'company' ? null : form.target.branchId,
      departmentIds: form.target.level === 'departments' ? form.target.departmentIds : [],
      teamIds: form.target.level === 'teams' ? form.target.teamIds ?? [] : [],
      employeeIds: form.target.level === 'employees' ? form.target.employeeIds : [],
      dates: form.dates, multiplier: form.multiplier.trim() || undefined, note: form.note.trim() || null,
    }
    setSaving(true)
    setFormError('')
    try {
      const result = form.id ? await updateHolidayWorkOrder(form.id, input) : await createHolidayWorkOrder(input)
      const cleared = result.overtime?.recomputed ? ` واتلغى الإضافي المكتشف في ${result.overtime.recomputed} يوم مغطى بالأمر.` : ''
      setNotice(`${form.id ? 'اتعدل' : 'اتحفظ'} الأمر «${result.order.name}». المسيرات اللي لسه ما اتعتمدتش لازم يتعاد حسابها عشان البدل ينزل فيها.${cleared}`)
      setForm(null)
      if (detail?.id === result.order.id) setDetail(result.order)
      setReload(value => value + 1)
    } catch (cause) {
      setFormError(errorText(cause, 'تعذر حفظ الأمر'))
    } finally {
      setSaving(false)
    }
  }

  const openDetail = async (order: ApiHolidayWorkOrder) => {
    setDetail(order)
    setDetailLoading(true)
    try {
      setDetail((await fetchHolidayWorkOrder(order.id)).order)
    } catch (cause) {
      setError(errorText(cause, 'تعذر تحميل تفاصيل الأمر'))
    } finally {
      setDetailLoading(false)
    }
  }

  const confirmCancel = async () => {
    if (!cancelling) return
    try {
      const result = await cancelHolidayWorkOrder(cancelling.order.id, cancelling.reason.trim() || undefined)
      setNotice(`اتلغى «${cancelling.order.name}». البدل هيتشال من المسيرات اللي لسه ما اتعتمدتش بعد إعادة حسابها، والمعتمد والمصروف ما بيتغيرش.`)
      if (detail?.id === result.order.id) setDetail(result.order)
      setCancelling(null)
      setReload(value => value + 1)
    } catch (cause) {
      setError(errorText(cause, 'تعذر إلغاء الأمر'))
    }
  }

  const saveMultiplier = async () => {
    try {
      const value = await updateHolidayWorkSettings(multiplierDraft.trim())
      setSettings(value)
      setMultiplierDraft(String(value.multiplier))
      setNotice(`المضاعف الافتراضي بقى ${value.multiplier} للأوامر والطلبات الجديدة.`)
    } catch (cause) {
      setError(errorText(cause, 'تعذر حفظ المضاعف'))
    }
  }

  if (!canView) return <p className="card text-gray-500">الشاشة دي محتاجة صلاحية عرض الحضور.</p>

  const count = form ? resolveOrgTarget(form.target, employees).length : 0
  const small = 'px-3 py-1.5 text-xs inline-flex items-center gap-1 disabled:opacity-50'

  return (
    <div className="space-y-6 pb-8">
      <header className="flex items-start justify-between gap-4">
        <div className="flex items-start gap-3 min-w-0">
          <span className="rounded-2xl p-3 bg-primary-50 text-primary-600"><CalendarCheck size={26} /></span>
          <div>
            <h1 className="text-2xl font-bold text-gray-800">دوام أيام العطلات</h1>
            <p className="text-gray-500 mt-1">
              افتح يوم عطلة (جمعة أو سبت أو عطلة رسمية) لموظفين: اللي بيجي بيتحسبله ساعاته من البصمة × سعر الساعة × المضاعف،
              وبينزل «بدل دوام أيام العطلات» في استحقاقات مسير الشهر. اللي ماجاش مابيتخصمش، واللي جه من نفسه من غير أمر أو طلب معتمد مالوش بدل.
            </p>
          </div>
        </div>
        <div className="flex gap-2 shrink-0">
          <button type="button" className="btn-secondary inline-flex items-center gap-2 disabled:opacity-50" disabled={loading} onClick={() => setReload(value => value + 1)}>
            <RefreshCw size={16} />تحديث
          </button>
          {canManage && (
            <button type="button" className="btn-primary inline-flex items-center gap-2" onClick={openCreate}>
              <Plus size={18} />أمر دوام جديد
            </button>
          )}
        </div>
      </header>

      <section className="card text-sm text-gray-600 space-y-2">
        <p><strong className="text-gray-800">سعر الساعة</strong> = إجمالي الراتب ÷ 30 ÷ ساعات اليوم (نفس أساس الإضافي). <strong className="text-gray-800">الساعات</strong> = من أول بصمة لآخر بصمة ناقص الاستراحة غير المدفوعة.</p>
        <p>الموظف كمان يقدر يقدّم طلب «دوام يوم عطلة» على أيام اشتغلها، ولما يتعتمد بيتحسب بنفس الطريقة. اليوم المغطى بأمر أو طلب ما بيطلعش عليه إضافي مكتشف.</p>
        {settings && (
          <div className="flex flex-wrap items-end gap-2 pt-1">
            <label className="flex flex-col gap-1">
              <span className="font-medium text-gray-700">المضاعف الافتراضي</span>
              <input className="input w-28" dir="ltr" inputMode="decimal" value={multiplierDraft} disabled={!settings.canEdit} onChange={event => setMultiplierDraft(event.target.value)} />
            </label>
            {settings.canEdit && String(settings.multiplier) !== multiplierDraft.trim() && (
              <button type="button" className="btn-secondary" onClick={saveMultiplier}>احفظ المضاعف</button>
            )}
            <span className="text-xs text-gray-500">بيتحط تلقائيًا في الأمر الجديد وفي الطلب المعتمد، ويتعدل لكل أمر لوحده.</span>
          </div>
        )}
      </section>

      {notice && (
        <div role="status" className="card bg-success-50 text-success-600 text-sm flex items-start justify-between gap-3">
          <span>{notice}</span>
          <button type="button" aria-label="إغلاق التنبيه" onClick={() => setNotice('')}><X size={16} /></button>
        </div>
      )}
      {error && (
        <div role="alert" className="card text-sm text-danger-600 flex items-start justify-between gap-3">
          <span className="flex items-center gap-2"><AlertTriangle size={16} />{error}</span>
          <button type="button" aria-label="إغلاق الخطأ" onClick={() => setError('')}><X size={16} /></button>
        </div>
      )}

      {form && (
        <section className="card space-y-4" aria-label="أمر دوام يوم عطلة">
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-bold text-gray-800">{form.id ? 'تعديل أمر الدوام' : 'أمر دوام يوم عطلة جديد'}</h2>
            <button type="button" aria-label="إغلاق" onClick={() => setForm(null)}><X size={18} /></button>
          </div>
          <label className="flex flex-col gap-1 text-sm">
            <span className="font-medium text-gray-700">اسم الأمر</span>
            <input className="input" maxLength={150} value={form.name} disabled={saving} placeholder="مثال: جرد المخزن يوم الجمعة" onChange={event => setForm({ ...form, name: event.target.value })} />
          </label>
          <OrgTargetPicker value={form.target} onChange={target => setForm({ ...form, target })} branches={branches} departments={departments} teams={teams}
            employees={employees} lockedBranchId={lockedBranchId} disabled={saving} />
          <div className="space-y-2 text-sm">
            <span className="font-medium text-gray-700">أيام العطلة</span>
            <div className="flex flex-wrap items-center gap-2">
              <input type="date" className="input w-44" value={form.dateInput} disabled={saving} onChange={event => setForm({ ...form, dateInput: event.target.value })} />
              <button type="button" className="btn-secondary" disabled={saving || !form.dateInput} onClick={addDate}>زوّد اليوم</button>
            </div>
            <div className="flex flex-wrap gap-2">
              {form.dates.length === 0 ? <span className="text-xs text-gray-500">لسه مفيش أيام.</span> : form.dates.map(date => (
                <span key={date} className="badge badge-primary inline-flex items-center gap-1" dir="ltr">
                  {date}
                  <button type="button" aria-label={`شيل ${date}`} disabled={saving} onClick={() => setForm({ ...form, dates: form.dates.filter(value => value !== date) })}><X size={12} /></button>
                </span>
              ))}
            </div>
            <p className="text-xs text-gray-500">لازم الأيام تكون عطلة (ويك إند أو عطلة رسمية) للفرع — يوم العمل العادي بيترفض.</p>
          </div>
          <div className="grid gap-3 md:grid-cols-2">
            <label className="flex flex-col gap-1 text-sm">
              <span className="font-medium text-gray-700">المضاعف</span>
              <input className="input" dir="ltr" inputMode="decimal" value={form.multiplier} disabled={saving} onChange={event => setForm({ ...form, multiplier: event.target.value })} />
            </label>
            <label className="flex flex-col gap-1 text-sm">
              <span className="font-medium text-gray-700">ملاحظة (اختياري)</span>
              <input className="input" maxLength={500} value={form.note} disabled={saving} onChange={event => setForm({ ...form, note: event.target.value })} />
            </label>
          </div>
          <p className="text-xs text-gray-500">
            هيتفتح الدوام لـ {describeOrgTarget(form.target, branches, departments, teams)}{employees.length ? ` (${count} موظف دلوقتي)` : ''}.
          </p>
          {formError && <p className="text-sm text-danger-600">{formError}</p>}
          <div className="flex gap-2 justify-end">
            <button type="button" className="btn-secondary" disabled={saving} onClick={() => setForm(null)}>رجوع</button>
            <button type="button" className="btn-primary disabled:opacity-50" disabled={saving} onClick={save}>{saving ? 'بيحفظ...' : 'احفظ'}</button>
          </div>
        </section>
      )}

      <section className="card space-y-4" aria-label="أوامر دوام أيام العطلات">
        <div className="flex flex-wrap gap-3 items-end">
          <label className="flex flex-col gap-1 text-sm min-w-[180px]">
            <span className="label">الحالة</span>
            <select className="input" value={status} onChange={event => setStatus(event.target.value as StatusFilter)}>
              <option value="ACTIVE">شغالة</option>
              <option value="CANCELLED">ملغية</option>
              <option value="ALL">الكل</option>
            </select>
          </label>
          <label className="flex flex-col gap-1 text-sm min-w-[180px]">
            <span className="label">النوع</span>
            <select className="input" value={kind} onChange={event => setKind(event.target.value as KindFilter)}>
              <option value="ALL">أوامر وطلبات</option>
              <option value="ORDER">أوامر الموارد البشرية</option>
              <option value="REQUEST">طلبات الموظفين المعتمدة</option>
            </select>
          </label>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full min-w-[960px]">
            <thead>
              <tr className="table-header">
                <th className="table-cell text-right">الأمر</th>
                <th className="table-cell text-right">على مين</th>
                <th className="table-cell text-right">الأيام</th>
                <th className="table-cell text-right">المضاعف</th>
                <th className="table-cell text-right">اللي جم</th>
                <th className="table-cell text-right">الساعات</th>
                {canSeeAmounts && <th className="table-cell text-right">المبلغ</th>}
                <th className="table-cell text-right">الحالة</th>
                <th className="table-cell text-right">الإجراءات</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr><td colSpan={9} className="table-cell text-center text-gray-500">جارٍ التحميل…</td></tr>
              ) : orders.length === 0 ? (
                <tr><td colSpan={9} className="table-cell text-center text-gray-500">مفيش أوامر دوام أيام عطلات هنا.</td></tr>
              ) : orders.map(order => (
                <tr key={order.id} className="table-row align-top">
                  <td className="table-cell">
                    <div className="font-medium text-gray-800">{order.name}</div>
                    <div className="text-xs text-gray-500">{order.kind === 'REQUEST' ? `طلب موظف #${order.sourceRequestId}` : `أمر #${order.id}`}{order.createdByName ? ` · ${order.createdByName}` : ''}</div>
                  </td>
                  <td className="table-cell max-w-xs text-sm">{order.targetText}</td>
                  <td className="table-cell text-sm" dir="ltr">{order.dates.join(' ، ')}</td>
                  <td className="table-cell" dir="ltr">× {order.multiplier}</td>
                  <td className="table-cell text-sm">{order.summary ? `${order.summary.cameEmployees} من ${order.summary.targetedEmployees}` : '—'}</td>
                  <td className="table-cell">{order.summary ? order.summary.totalHours : '—'}</td>
                  {canSeeAmounts && <td className="table-cell">{order.summary?.totalAmount != null ? formatMoney(order.summary.totalAmount) : '—'}</td>}
                  <td className="table-cell">
                    {order.status === 'ACTIVE' ? <span className="badge badge-success">شغال</span> : <span className="badge badge-danger">ملغي</span>}
                    {order.cancelReason && <div className="text-xs text-gray-500 mt-1">{order.cancelReason}</div>}
                  </td>
                  <td className="table-cell">
                    <div className="flex flex-wrap gap-2">
                      <button type="button" className={`btn-secondary ${small}`} onClick={() => openDetail(order)}><Eye size={14} />التفاصيل</button>
                      {order.canEdit && <button type="button" className={`btn-secondary ${small}`} onClick={() => openEdit(order)}><Pencil size={14} />تعديل</button>}
                      {order.canCancel && <button type="button" className={`btn-danger ${small}`} onClick={() => setCancelling({ order, reason: '' })}><Ban size={14} />إلغاء</button>}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      {cancelling && (
        <section className="card space-y-3" aria-label="إلغاء أمر الدوام">
          <h2 className="font-bold text-gray-800">إلغاء «{cancelling.order.name}»</h2>
          <p className="text-sm text-gray-600">البدل هيتشال من المسيرات اللي لسه ما اتعتمدتش بعد إعادة حسابها. المسير المعتمد أو المصروف ما بيتغيرش.</p>
          <input className="input" maxLength={300} placeholder="السبب (اختياري)" value={cancelling.reason} onChange={event => setCancelling({ ...cancelling, reason: event.target.value })} />
          <div className="flex gap-2 justify-end">
            <button type="button" className="btn-secondary" onClick={() => setCancelling(null)}>رجوع</button>
            <button type="button" className="btn-danger" onClick={confirmCancel}>إلغاء الأمر</button>
          </div>
        </section>
      )}

      {detail && (
        <section className="card space-y-4" aria-label="تفاصيل أمر الدوام">
          <div className="flex items-start justify-between gap-3">
            <div>
              <h2 className="text-lg font-bold text-gray-800">{detail.name}</h2>
              <p className="text-sm text-gray-500">{detail.targetText} — الأيام: <span dir="ltr">{detail.dates.join(' ، ')}</span> — المضاعف × {detail.multiplier}</p>
              {detail.note && <p className="text-sm text-gray-600 mt-1">{detail.note}</p>}
            </div>
            <button type="button" aria-label="إغلاق التفاصيل" onClick={() => setDetail(null)}><X size={18} /></button>
          </div>
          {detail.summary && (
            <p className="text-sm text-gray-700">
              جه {detail.summary.cameEmployees} من {detail.summary.targetedEmployees} موظف مستهدف — {detail.summary.totalHours} ساعة
              {detail.summary.totalAmount != null ? ` — ${formatMoney(detail.summary.totalAmount)}` : ''}
            </p>
          )}
          <div className="overflow-x-auto">
            <table className="w-full min-w-[820px]">
              <thead>
                <tr className="table-header">
                  <th className="table-cell text-right">الموظف</th>
                  <th className="table-cell text-right">اليوم</th>
                  <th className="table-cell text-right">أول دخول</th>
                  <th className="table-cell text-right">آخر خروج</th>
                  <th className="table-cell text-right">الساعات</th>
                  {canSeeAmounts && <th className="table-cell text-right">المبلغ</th>}
                  <th className="table-cell text-right">ملاحظة</th>
                </tr>
              </thead>
              <tbody>
                {detailLoading && !detail.rows ? (
                  <tr><td colSpan={7} className="table-cell text-center text-gray-500">جارٍ التحميل…</td></tr>
                ) : !(detail.rows ?? []).length ? (
                  <tr><td colSpan={7} className="table-cell text-center text-gray-500">لسه محدش من المستهدفين بصم في أيام الأمر اللي فاتت.</td></tr>
                ) : (detail.rows ?? []).map(row => (
                  <tr key={`${row.employeeId}-${row.date}`} className={`table-row ${row.counted ? '' : 'text-gray-400'}`}>
                    <td className="table-cell">
                      <div className="font-medium">{row.employeeName}</div>
                      <div className="text-xs text-gray-500">{row.employeeCode}</div>
                    </td>
                    <td className="table-cell" dir="ltr">{row.date}</td>
                    <td className="table-cell" dir="ltr">{row.checkIn ?? '—'}</td>
                    <td className="table-cell" dir="ltr">{row.checkOut ?? '—'}</td>
                    <td className="table-cell">{row.hours ?? '—'}</td>
                    {canSeeAmounts && (
                      <td className="table-cell">
                        {row.amount != null && row.counted ? formatMoney(row.amount) : '—'}
                        {row.counted && <div className="text-xs text-gray-500">{row.amountSource === 'PAYROLL' ? PAYROLL_STATE[row.payrollState ?? ''] ?? 'من المسير' : 'تقديري براتب الملف'}</div>}
                      </td>
                    )}
                    <td className="table-cell text-xs">{row.message ?? ''}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>
      )}
    </div>
  )
}

export default function HolidayWorkPage() {
  return <MainLayout><HolidayWorkContent /></MainLayout>
}
