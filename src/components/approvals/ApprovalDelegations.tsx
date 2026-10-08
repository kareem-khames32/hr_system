'use client'
// B2.6-ب: «تفويض اعتماداتي» جوه «بانتظار موافقتي» — المعتمد يحدد بديل لفترة (كل الفئات أو فئات بعينها)، ويلغي تفويضه.
// صاحب «بانِي دورات الاعتماد» ينشئ ويلغي تفويض موظف في نطاقه. الخادم هو اللي بيحكم (canRevoke / canManageOthers).
import { useEffect, useState } from 'react'
import { ChevronDown, ChevronUp, UserCheck } from 'lucide-react'
import { EmployeePicker } from '../EmployeePicker'
import { fetchEmployeeDirectory, type ApiEmployeeDirectoryEntry } from '../../lib/api'
import { categoryLabels } from '../../data/requestsCatalog'
import {
  createDelegation, fetchDelegations, revokeDelegation, DELEGATION_DAYS_MAX, DELEGATION_STATE_LABELS, type ApiDelegation, type ApiDelegations,
} from '../../lib/delegations-api'

const STATE_TONE: Record<ApiDelegation['state'], string> = {
  ACTIVE: 'bg-success-50 text-success-700',
  UPCOMING: 'bg-primary-50 text-primary-700',
  ENDED: 'bg-gray-100 text-gray-500',
  REVOKED: 'bg-gray-100 text-gray-500',
}
const localDate = (date: Date) => `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`
const daysBetween = (from: string, to: string) => Math.round((Date.parse(`${to}T00:00:00Z`) - Date.parse(`${from}T00:00:00Z`)) / 86_400_000)
const categoriesText = (categories: string[] | null) =>
  categories === null ? 'كل الفئات' : categories.map(key => categoryLabels[key as keyof typeof categoryLabels] ?? key).join('، ')

export default function ApprovalDelegations() {
  const [open, setOpen] = useState(false)
  const [data, setData] = useState<ApiDelegations | null>(null)
  const [directory, setDirectory] = useState<ApiEmployeeDirectoryEntry[] | null>(null)
  const [error, setError] = useState('')
  const [formError, setFormError] = useState('')
  const [busy, setBusy] = useState(false)
  const [form, setForm] = useState({ delegatorId: '', delegateId: '', startDate: localDate(new Date()), endDate: '', categories: [] as string[], reason: '' })

  const load = async () => {
    try { setData(await fetchDelegations()); setError('') }
    catch (err) { setError(err instanceof Error ? err.message : 'تعذر تحميل التفويضات') }
  }
  useEffect(() => { void load() }, [])
  // دليل الموظفين (نفس منتقيات الشاشات غير الإدارية) بيتحمّل أول ما القسم يتفتح
  useEffect(() => {
    if (!open || directory) return
    fetchEmployeeDirectory().then(setDirectory).catch(() => setDirectory([]))
  }, [open, directory])

  const activeMine = data?.mine.find(row => row.state === 'ACTIVE') ?? null
  const actingFor = (data?.toMe ?? []).filter(row => row.state === 'ACTIVE')
  const summary = !data ? '' : !data.available ? 'هيشتغل بعد تطبيق ترحيل 090 على السيرفر'
    : [activeMine ? `اعتماداتك متفوّضة لـ${activeMine.delegateName ?? 'بديلك'} لحد ${activeMine.endDate}` : '',
      actingFor.length ? `بتعتمد بالنيابة عن ${actingFor.map(row => row.delegatorName ?? 'موظف').join('، ')}` : '']
      .filter(Boolean).join(' · ') || 'حدد بديل يعتمد مكانك وانت في إجازة أو مهمة'

  const submit = async () => {
    const today = localDate(new Date())
    if (!form.delegateId) { setFormError('اختار البديل'); return }
    if (!form.startDate || !form.endDate) { setFormError('حدد بداية ونهاية التفويض'); return }
    if (form.endDate < form.startDate) { setFormError('نهاية التفويض قبل بدايته'); return }
    if (form.endDate < today) { setFormError('فترة التفويض خلصت — اختار نهاية من النهارده أو بعده'); return }
    if (daysBetween(form.startDate, form.endDate) + 1 > DELEGATION_DAYS_MAX) { setFormError('فترة التفويض أقصاها سنة'); return }
    if (form.delegateId === form.delegatorId) { setFormError('البديل لازم يكون موظف تاني'); return }
    setBusy(true); setFormError('')
    try {
      await createDelegation({
        ...(form.delegatorId ? { delegatorEmployeeId: Number(form.delegatorId) } : {}),
        delegateEmployeeId: Number(form.delegateId), startDate: form.startDate, endDate: form.endDate,
        categories: form.categories.length ? form.categories : null, reason: form.reason.trim() || null,
      })
      setForm(current => ({ ...current, delegatorId: '', delegateId: '', endDate: '', categories: [], reason: '' }))
      await load()
    } catch (err) { setFormError(err instanceof Error ? err.message : 'تعذر تسجيل التفويض') }
    finally { setBusy(false) }
  }

  const revoke = async (row: ApiDelegation) => {
    setBusy(true); setError('')
    try { await revokeDelegation(row.id); await load() }
    catch (err) { setError(err instanceof Error ? err.message : 'تعذر إلغاء التفويض') }
    finally { setBusy(false) }
  }

  const rows = (list: ApiDelegation[], who: (row: ApiDelegation) => string) => (
    <ul className="divide-y divide-gray-100">
      {list.map(row => (
        <li key={row.id} className="py-3 flex flex-wrap items-center gap-x-3 gap-y-1 text-sm" data-delegation={row.id}>
          <span className="font-medium text-gray-800">{who(row)}</span>
          <span className="text-gray-500" dir="ltr">{row.startDate} → {row.endDate}</span>
          <span className="text-gray-500">{categoriesText(row.categories)}</span>
          <span className={`badge text-xs ${STATE_TONE[row.state]}`}>{DELEGATION_STATE_LABELS[row.state]}</span>
          {row.reason && <span className="text-gray-500 break-words">{row.reason}</span>}
          {row.canRevoke && <button type="button" className="btn-secondary text-red-700 ms-auto disabled:opacity-50" disabled={busy} onClick={() => revoke(row)}>إلغاء التفويض</button>}
        </li>
      ))}
    </ul>
  )

  return (
    <section className="card p-5" data-approval-delegations>
      <button type="button" aria-expanded={open} onClick={() => setOpen(value => !value)} className="flex w-full items-center gap-3 text-start">
        <UserCheck size={20} className="text-primary-600" />
        <span className="flex-1"><span className="block font-bold text-gray-800">تفويض اعتماداتي</span><span className="text-sm text-gray-500" data-delegation-summary>{summary}</span></span>
        {open ? <ChevronUp size={18} /> : <ChevronDown size={18} />}
      </button>
      {open && (
        <div className="mt-5 space-y-5">
          {error && <div role="alert" className="rounded-xl bg-red-50 p-3 text-sm text-red-700">{error}</div>}
          {data && !data.available && <p className="text-sm text-gray-500" data-delegations-unavailable>تفويض الاعتمادات هيشتغل بعد تطبيق ترحيل 090 على السيرفر.</p>}
          {data?.available && (
            <>
              <div className="rounded-xl border border-gray-200 p-4 space-y-3" data-delegation-form>
                <p className="text-sm text-gray-600">طول الفترة، الطلبات اللي مستنية اعتمادك بتظهر عند بديلك كمان، وقراره بيتسجّل «بالنيابة عنك». البديل مابيعتمدش طلبه هو، ولا طلب هو نفسه من معتمديه (الطلب ده بيفضل عندك).</p>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  {data.canManageOthers && (
                    <div>
                      <label className="label" htmlFor="delegation-delegator">المفوِّض (فاضي = أنا)</label>
                      <EmployeePicker id="delegation-delegator" employees={directory ?? []} value={form.delegatorId} onChange={id => setForm({ ...form, delegatorId: id })} placeholder="تفويض عن موظف تاني" />
                    </div>
                  )}
                  <div>
                    <label className="label" htmlFor="delegation-delegate">البديل *</label>
                    <EmployeePicker id="delegation-delegate" employees={directory ?? []} value={form.delegateId} onChange={id => setForm({ ...form, delegateId: id })} placeholder="اختار البديل" />
                  </div>
                  <div>
                    <label className="label" htmlFor="delegation-start">من *</label>
                    <input id="delegation-start" type="date" className="input" value={form.startDate} onChange={event => setForm({ ...form, startDate: event.target.value })} />
                  </div>
                  <div>
                    <label className="label" htmlFor="delegation-end">إلى *</label>
                    <input id="delegation-end" type="date" className="input" value={form.endDate} min={form.startDate} onChange={event => setForm({ ...form, endDate: event.target.value })} />
                  </div>
                </div>
                <fieldset>
                  <legend className="label">فئات الطلبات (من غير اختيار = كل الفئات)</legend>
                  <div className="flex flex-wrap gap-x-4 gap-y-2 text-sm text-gray-700">
                    {Object.entries(categoryLabels).map(([key, label]) => (
                      <label key={key} className="flex items-center gap-1.5">
                        <input type="checkbox" checked={form.categories.includes(key)}
                          onChange={event => setForm({ ...form, categories: event.target.checked ? [...form.categories, key] : form.categories.filter(item => item !== key) })} />
                        {label}
                      </label>
                    ))}
                  </div>
                </fieldset>
                <div>
                  <label className="label" htmlFor="delegation-reason">السبب (اختياري)</label>
                  <input id="delegation-reason" className="input" maxLength={300} value={form.reason} onChange={event => setForm({ ...form, reason: event.target.value })} />
                </div>
                {formError && <div role="alert" className="rounded-xl bg-red-50 p-3 text-sm text-red-700">{formError}</div>}
                <button type="button" className="btn-primary disabled:opacity-50" disabled={busy} onClick={submit}>{busy ? 'لحظة…' : 'تسجيل التفويض'}</button>
              </div>
              {actingFor.length > 0 && (
                <div data-delegations-to-me>
                  <h4 className="font-bold text-gray-800 text-sm mb-1">بتعتمد بالنيابة عن</h4>
                  {rows(data.toMe, row => row.delegatorName ?? 'موظف')}
                </div>
              )}
              {actingFor.length === 0 && data.toMe.length > 0 && (
                <div data-delegations-to-me>
                  <h4 className="font-bold text-gray-800 text-sm mb-1">هتعتمد بالنيابة عن</h4>
                  {rows(data.toMe, row => row.delegatorName ?? 'موظف')}
                </div>
              )}
              {data.mine.length > 0 && (
                <div data-delegations-mine>
                  <h4 className="font-bold text-gray-800 text-sm mb-1">تفويضاتي</h4>
                  {rows(data.mine, row => `البديل: ${row.delegateName ?? '—'}`)}
                </div>
              )}
              {data.canManageOthers && data.others.length > 0 && (
                <div data-delegations-others>
                  <h4 className="font-bold text-gray-800 text-sm mb-1">تفويضات موظفين في نطاقي</h4>
                  {rows(data.others, row => `${row.delegatorName ?? '—'} ← ${row.delegateName ?? '—'}`)}
                </div>
              )}
            </>
          )}
        </div>
      )}
    </section>
  )
}
