'use client'

// B4.8 (ب): «حماية البيانات» — مدد الاحتفاظ لكل نوع بيانات (النظام بينبّه بمهمة ومابيمسحش)، وسجل حوادث التسريب بموعد إخطار 72 ساعة.
// بيانات على مستوى الشركة: لحساب بكل الفروع بصلاحية الإعدادات.
import { useCallback, useEffect, useState } from 'react'
import Link from 'next/link'
import { AlertTriangle, ShieldCheck } from 'lucide-react'
import { MainLayout } from '@/components/layout'
import { formatDateTime } from '@/lib/dates'
import {
  closeBreachIncident, createBreachIncident, fetchDataProtection, notifyBreachIncident, setRetentionMonths,
  type ApiBreachIncident, type ApiDataProtection,
} from '@/lib/data-protection-api'

const localNow = () => { const now = new Date(); return new Date(now.getTime() - now.getTimezoneOffset() * 60000).toISOString().slice(0, 16) }
const emptyForm = () => ({ title: '', details: '', discoveredAt: localNow(), affectedCount: '' })

export default function DataProtectionPage() {
  const [data, setData] = useState<ApiDataProtection | null>(null)
  const [error, setError] = useState('')
  const [info, setInfo] = useState('')
  const [busy, setBusy] = useState(false)
  const [form, setForm] = useState(emptyForm)
  const [months, setMonths] = useState<Record<string, string>>({})
  const [notes, setNotes] = useState<Record<number, string>>({})

  const load = useCallback(() => {
    fetchDataProtection().then(setData).catch((cause) => setError(cause instanceof Error ? cause.message : 'تعذر تحميل حماية البيانات'))
  }, [])
  useEffect(load, [load])

  async function run(work: () => Promise<ApiDataProtection>, done: string) {
    setBusy(true); setError(''); setInfo('')
    try {
      setData(await work())
      setInfo(done)
      return true
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'تعذر الحفظ')
      return false
    } finally {
      setBusy(false)
    }
  }

  async function saveRetention(key: string, current: number | null) {
    const text = (months[key] ?? (current === null ? '' : String(current))).trim()
    if (text !== '' && !/^\d{1,3}$/.test(text)) { setError('مدة الاحتفاظ بالشهور رقم صحيح، أو فاضي لو من غير مدة'); return }
    const ok = await run(() => setRetentionMonths(key, text === '' ? null : Number(text)), 'اتحفظت مدة الاحتفاظ')
    if (ok) setMonths((state) => { const next = { ...state }; delete next[key]; return next })
  }

  async function addIncident() {
    const ok = await run(() => createBreachIncident({ title: form.title.trim(), ...(form.details.trim() ? { details: form.details.trim() } : {}),
      // وقت المتصفح المحلي ← لحظة مطلقة (ISO)، عشان موعد الـ72 ساعة مايتأثرش بتوقيت الخادم
      discoveredAt: new Date(form.discoveredAt).toISOString(),
      ...(form.affectedCount.trim() ? { affectedCount: Number(form.affectedCount) } : {}) }), 'اتسجّلت الحادثة — موعد الإخطار محسوب من وقت الاكتشاف')
    if (ok) setForm(emptyForm())
  }

  const deadline = (incident: ApiBreachIncident) => {
    if (incident.status !== 'OPEN') return incident.notifiedLate ? 'اتبلّغت بعد الموعد' : '—'
    if (incident.overdue) return `الموعد فات من ${Math.abs(incident.hoursLeft ?? 0)} ساعة`
    return `فاضل ${incident.hoursLeft ?? 0} ساعة`
  }

  return (
    <MainLayout>
      <div className="space-y-6">
        <div>
          <Link href="/settings" className="text-sm text-primary-600 hover:underline">
            ← الإعدادات
          </Link>
          <h1 className="text-2xl font-bold text-gray-800 flex items-center gap-2 mt-2">
            <ShieldCheck size={24} className="text-primary-600" />
            حماية البيانات
          </h1>
          <p className="text-gray-500 mt-1">مدد الاحتفاظ بالبيانات وسجل حوادث التسريب. النظام بينبّه بمهمة مراجعة — ومابيمسحش أي بيانات لوحده.</p>
        </div>

        {error && <div role="alert" className="bg-red-50 text-red-700 rounded-xl p-4">{error}</div>}
        {info && <div role="status" className="bg-green-50 text-green-700 rounded-xl p-4">{info}</div>}

        {data && (
          <>
            <div className="card space-y-4" data-retention>
              <div>
                <h2 className="text-lg font-semibold text-gray-800">مدد الاحتفاظ</h2>
                <p className="text-sm text-gray-500 mt-1">المدة بالشهور لكل نوع (فاضي = من غير مدة). لما سجلات تعدّي مدتها، الموارد البشرية في فرعها بتاخد مهمة مراجعة كل يوم الصبح لحد ما تتقفل.</p>
              </div>
              {data.retention.map((type) => (
                <div key={type.key} className="grid grid-cols-1 md:grid-cols-4 gap-3 items-end border-t border-gray-100 pt-3" data-retention-type={type.key}>
                  <div className="md:col-span-2">
                    <p className="font-medium text-gray-800">{type.label}</p>
                    <p className="text-xs text-gray-500">{type.hint}{type.cutoff ? ` — اللي قبل ${type.cutoff} عدّى مدته` : ''}</p>
                  </div>
                  <div>
                    <label className="label" htmlFor={`retention-${type.key}`}>المدة بالشهور</label>
                    <input id={`retention-${type.key}`} className="input w-full" inputMode="numeric" maxLength={3} placeholder="من غير مدة"
                      value={months[type.key] ?? (type.months === null ? '' : String(type.months))} onChange={(event) => setMonths({ ...months, [type.key]: event.target.value.replace(/\D/g, '') })} />
                  </div>
                  <div className="flex items-center gap-3">
                    <button type="button" className="btn-secondary text-sm disabled:opacity-50" disabled={busy} onClick={() => saveRetention(type.key, type.months)}>حفظ</button>
                    <span className={`text-sm ${type.expired > 0 ? 'text-red-700 font-semibold' : 'text-gray-500'}`}>{type.months === null ? '—' : `${type.expired} عدّى مدته`}</span>
                  </div>
                </div>
              ))}
            </div>

            <div className="card space-y-4" data-breach-log>
              <div>
                <h2 className="text-lg font-semibold text-gray-800 flex items-center gap-2">
                  <AlertTriangle size={20} className="text-amber-600" />
                  سجل حوادث تسريب البيانات
                </h2>
                <p className="text-sm text-gray-500 mt-1">الحادثة لازم تتبلّغ للجهة المختصة خلال {data.notifyHours} ساعة من اكتشافها. سجّلها هنا والنظام بيحسب الموعد.</p>
              </div>
              {!data.incidentsAvailable ? (
                <div role="status" className="bg-amber-50 text-amber-800 rounded-xl p-4">سجل حوادث التسريب مش موجود — طبّق ترحيل 139.</div>
              ) : (
                <>
                  <div className="grid grid-cols-1 md:grid-cols-4 gap-3 items-end" data-breach-add>
                    <div className="md:col-span-2">
                      <label className="label" htmlFor="breach-title">عنوان الحادثة</label>
                      <input id="breach-title" className="input w-full" maxLength={200} value={form.title} onChange={(event) => setForm({ ...form, title: event.target.value })} />
                    </div>
                    <div>
                      <label className="label" htmlFor="breach-discovered">وقت الاكتشاف</label>
                      <input id="breach-discovered" type="datetime-local" className="input w-full" max={localNow()} value={form.discoveredAt} onChange={(event) => setForm({ ...form, discoveredAt: event.target.value })} />
                    </div>
                    <div>
                      <label className="label" htmlFor="breach-affected">عدد المتأثرين (اختياري)</label>
                      <input id="breach-affected" className="input w-full" inputMode="numeric" value={form.affectedCount} onChange={(event) => setForm({ ...form, affectedCount: event.target.value.replace(/\D/g, '') })} />
                    </div>
                    <div className="md:col-span-3">
                      <label className="label" htmlFor="breach-details">التفاصيل (اختياري)</label>
                      <textarea id="breach-details" className="input w-full" rows={2} maxLength={2000} value={form.details} onChange={(event) => setForm({ ...form, details: event.target.value })} />
                    </div>
                    <button type="button" className="btn-primary disabled:opacity-50" disabled={busy || form.title.trim().length < 3 || !form.discoveredAt} onClick={addIncident}>تسجيل الحادثة</button>
                  </div>
                  {data.incidents.length === 0 ? (
                    <p className="text-gray-500 text-sm">مفيش حوادث متسجّلة.</p>
                  ) : (
                    <div className="space-y-3">
                      {data.incidents.map((incident) => (
                        <div key={incident.id} className={`rounded-xl border p-4 space-y-2 ${incident.overdue ? 'border-red-200 bg-red-50' : 'border-gray-100'}`} data-breach-incident={incident.id}>
                          <div className="flex items-start justify-between gap-3 flex-wrap">
                            <div>
                              <p className="font-semibold text-gray-800">{incident.title}</p>
                              <p className="text-xs text-gray-500">
                                اكتُشفت {formatDateTime(incident.discoveredAt)} · موعد الإخطار {formatDateTime(incident.notifyBy)}
                                {incident.affectedCount !== null ? ` · المتأثرين ${incident.affectedCount}` : ''}
                              </p>
                            </div>
                            <div className="text-left">
                              <span className="inline-block px-3 py-1 rounded-full text-xs bg-gray-100 text-gray-700">{incident.statusLabel}</span>
                              <p className={`text-xs mt-1 ${incident.overdue || incident.notifiedLate ? 'text-red-700 font-semibold' : 'text-gray-500'}`}>{deadline(incident)}</p>
                            </div>
                          </div>
                          {incident.details && <p className="text-sm text-gray-700 whitespace-pre-wrap">{incident.details}</p>}
                          {incident.notifiedAt && <p className="text-xs text-gray-600">اتبلّغت {formatDateTime(incident.notifiedAt)}{incident.notificationNote ? ` — ${incident.notificationNote}` : ''}</p>}
                          {incident.closedAt && <p className="text-xs text-gray-600">اتقفلت {formatDateTime(incident.closedAt)}{incident.closeNote ? ` — ${incident.closeNote}` : ''}</p>}
                          {incident.status !== 'CLOSED' && (
                            <div className="flex flex-wrap items-center gap-2 pt-1">
                              <input className="input flex-1 min-w-[12rem]" maxLength={500} placeholder={incident.status === 'OPEN' ? 'الجهة اللي اتبلّغت ومرجع الإخطار' : 'ملاحظة الإقفال (اختياري)'}
                                value={notes[incident.id] ?? ''} onChange={(event) => setNotes({ ...notes, [incident.id]: event.target.value })} />
                              {incident.status === 'OPEN' && (
                                <button type="button" className="btn-primary text-sm disabled:opacity-50" disabled={busy || (notes[incident.id] ?? '').trim().length < 3}
                                  onClick={() => run(() => notifyBreachIncident(incident.id, (notes[incident.id] ?? '').trim()), 'اتسجّل الإخطار').then((ok) => { if (ok) setNotes({ ...notes, [incident.id]: '' }) })}>
                                  اتبلّغت
                                </button>
                              )}
                              <button type="button" className="btn-secondary text-sm disabled:opacity-50" disabled={busy}
                                onClick={() => run(() => closeBreachIncident(incident.id, incident.status === 'OPEN' ? '' : (notes[incident.id] ?? '').trim()), 'اتقفلت الحادثة')}>
                                إقفال
                              </button>
                            </div>
                          )}
                        </div>
                      ))}
                    </div>
                  )}
                </>
              )}
            </div>
          </>
        )}
      </div>
    </MainLayout>
  )
}
