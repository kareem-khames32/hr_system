'use client'

// B5.7: «بلاغات السلامة» — الموظف بيبلّغ عن حادث في فرعه وبيتابع حالة بلاغاته (التحقيق وتفاصيله عند مسؤول السلامة).
// موديول safety (مقفول افتراضيًا).
import { useCallback, useEffect, useState } from 'react'
import { ShieldCheck } from 'lucide-react'
import { MainLayout } from '@/components/layout'
import { apiFetch } from '@/lib/api'

interface Report { id: number; code: string; kind: string; kindLabel: string; occurredOn: string; location: string; description: string; status: string; statusLabel: string; createdAt: string }
interface MySafety { ready: boolean; kinds: Array<{ code: string; label: string }>; reports: Report[] }
const today = () => { const now = new Date(); return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}` }
const emptyForm = () => ({ kind: 'INJURY', occurredOn: today(), location: '', description: '', injured: 'SELF', injuredNote: '' })

export default function MySafetyPage() {
  const [data, setData] = useState<MySafety | null>(null)
  const [error, setError] = useState('')
  const [info, setInfo] = useState('')
  const [busy, setBusy] = useState(false)
  const [form, setForm] = useState(emptyForm())

  const load = useCallback(() => {
    apiFetch<MySafety>('/safety/my').then(setData).catch((cause) => setError(cause instanceof Error ? cause.message : 'تعذر تحميل بلاغاتك'))
  }, [])
  useEffect(load, [load])

  function changeKind(kind: string) {
    setForm({ ...form, kind, injured: kind === 'INJURY' ? (form.injured === 'NONE' ? 'SELF' : form.injured) : 'NONE' })
  }

  async function send() {
    if (form.location.trim().length < 2 || form.description.trim().length < 10) return setError('اكتب مكان الحادث ووصفه (10 حروف على الأقل)')
    if (form.injured === 'OTHER' && form.injuredNote.trim().length < 2) return setError('اكتب اسم المصاب')
    setBusy(true); setError(''); setInfo('')
    try {
      const result = await apiFetch<{ code: string }>('/safety/my', { method: 'POST', body: JSON.stringify({ kind: form.kind, occurredOn: form.occurredOn, location: form.location.trim(), description: form.description.trim(),
        injured: form.injured, injuredNote: form.injured === 'OTHER' ? form.injuredNote.trim() : undefined }) })
      setForm(emptyForm()); setInfo(`اتسجّل بلاغك برقم ${result.code}`); load()
    } catch (cause) { setError(cause instanceof Error ? cause.message : 'تعذر تسجيل البلاغ') } finally { setBusy(false) }
  }

  return (
    <MainLayout>
      <div className="space-y-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-800 flex items-center gap-2">
            <ShieldCheck size={24} className="text-primary-600" />
            بلاغات السلامة
          </h1>
          <p className="text-gray-500 mt-1">بلّغ عن إصابة أو تلف أو وضع غير آمن في فرعك، وتابع حالة بلاغاتك.</p>
        </div>

        {error && <div role="alert" className="bg-red-50 text-red-700 rounded-xl p-4">{error}</div>}
        {info && <div role="status" className="bg-green-50 text-green-700 rounded-xl p-4">{info}</div>}
        {data && !data.ready && <div className="card text-amber-800 bg-amber-50">جداول السلامة لسه ماتطبّقتش على قاعدة البيانات (ترحيلي 169 و170).</div>}

        {data?.ready && (
          <div className="card space-y-3" data-safety-report-form>
            <h2 className="text-lg font-semibold text-gray-800">بلاغ جديد</h2>
            <div className="flex flex-wrap items-end gap-3">
              <label className="text-sm text-gray-600">نوع الحادث
                <select className="input mt-1" value={form.kind} onChange={(event) => changeKind(event.target.value)}>
                  {data.kinds.map((kind) => <option key={kind.code} value={kind.code}>{kind.label}</option>)}
                </select>
              </label>
              <label className="text-sm text-gray-600">تاريخ الحادث
                <input type="date" className="input mt-1" max={today()} value={form.occurredOn} onChange={(event) => setForm({ ...form, occurredOn: event.target.value })} />
              </label>
              <label className="flex-1 min-w-52 text-sm text-gray-600">المكان
                <input className="input w-full mt-1" maxLength={200} value={form.location} onChange={(event) => setForm({ ...form, location: event.target.value })} />
              </label>
            </div>
            <label className="block text-sm text-gray-600">إيه اللي حصل؟
              <textarea className="input w-full mt-1" rows={3} maxLength={1000} value={form.description} onChange={(event) => setForm({ ...form, description: event.target.value })} />
            </label>
            <div className="flex flex-wrap items-end gap-3">
              <label className="text-sm text-gray-600">المصاب
                <select className="input mt-1" value={form.injured} onChange={(event) => setForm({ ...form, injured: event.target.value })}>
                  <option value="SELF">أنا</option>
                  <option value="OTHER">حد تاني</option>
                  {form.kind !== 'INJURY' && <option value="NONE">محدش اتصاب</option>}
                </select>
              </label>
              {form.injured === 'OTHER' && (
                <label className="flex-1 min-w-52 text-sm text-gray-600">اسم المصاب
                  <input className="input w-full mt-1" maxLength={120} value={form.injuredNote} onChange={(event) => setForm({ ...form, injuredNote: event.target.value })} />
                </label>
              )}
              <button type="button" className="btn-primary disabled:opacity-50" disabled={busy} onClick={send}>إرسال البلاغ</button>
            </div>
          </div>
        )}

        <div className="card space-y-3" data-safety-my-reports>
          <h2 className="text-lg font-semibold text-gray-800">بلاغاتي</h2>
          {!data || data.reports.length === 0 ? <p className="text-gray-500">مفيش بلاغات لسه.</p> : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="bg-gray-50 text-gray-600">
                  <tr>
                    <th className="table-header text-right">الرقم</th>
                    <th className="table-header text-right">النوع</th>
                    <th className="table-header text-center">التاريخ</th>
                    <th className="table-header text-right">المكان</th>
                    <th className="table-header text-right">الوصف</th>
                    <th className="table-header text-center">الحالة</th>
                  </tr>
                </thead>
                <tbody>
                  {data.reports.map((row) => (
                    <tr key={row.id} className="border-t border-gray-100">
                      <td className="table-cell font-mono" dir="ltr">{row.code}</td>
                      <td className="table-cell">{row.kindLabel}</td>
                      <td className="table-cell text-center" dir="ltr">{row.occurredOn}</td>
                      <td className="table-cell">{row.location}</td>
                      <td className="table-cell text-gray-600">{row.description}</td>
                      <td className={`table-cell text-center ${row.status === 'CLOSED' ? 'text-gray-500' : 'text-amber-700'}`}>{row.statusLabel}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>
    </MainLayout>
  )
}
