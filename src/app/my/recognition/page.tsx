'use client'

// B5.10 (ج): «التقدير» — كلمة شكر لزميل في فرعي، وقايمة تقدير الفرع. من غير أي أثر مالي. صاحب صلاحية إدارة الأداء يقدر يخفي كلمة من القايمة.
// ميزة performance.recognition (مقفولة افتراضيًا).
import { useCallback, useEffect, useState } from 'react'
import { Gift } from 'lucide-react'
import { MainLayout } from '@/components/layout'
import { apiFetch } from '@/lib/api'

interface Item { id: number; fromName: string; toName: string; message: string; createdAt: string; toMe: boolean; fromMe: boolean }
interface Data { ready: boolean; canSend: boolean; canModerate: boolean; perDay: number; colleagues: Array<{ id: number; fullName: string }>; feed: Item[] }
const B = '/performance/recognitions'

export default function RecognitionPage() {
  const [data, setData] = useState<Data | null>(null)
  const [form, setForm] = useState({ toEmployeeId: '', message: '' })
  const [error, setError] = useState('')
  const [info, setInfo] = useState('')
  const [busy, setBusy] = useState(false)

  const load = useCallback(() => {
    apiFetch<Data>(B).then(setData).catch((cause) => setError(cause instanceof Error ? cause.message : 'تعذر تحميل قايمة التقدير'))
  }, [])
  useEffect(load, [load])

  async function run(work: () => Promise<unknown>, done: string) {
    setBusy(true); setError(''); setInfo('')
    try { await work(); setInfo(done); load() } catch (cause) { setError(cause instanceof Error ? cause.message : 'تعذر تنفيذ الطلب') } finally { setBusy(false) }
  }
  const send = () => run(async () => {
    await apiFetch(B, { method: 'POST', body: JSON.stringify({ toEmployeeId: Number(form.toEmployeeId), message: form.message.trim() }) })
    setForm({ toEmployeeId: '', message: '' })
  }, 'اتبعتت كلمة الشكر')
  const hide = (item: Item) => run(() => apiFetch(`${B}/${item.id}`, { method: 'DELETE' }), 'اتخفت من القايمة')

  return (
    <MainLayout>
      <div className="space-y-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-800 flex items-center gap-2">
            <Gift size={24} className="text-primary-600" />
            التقدير
          </h1>
          <p className="text-gray-500 mt-1">اشكر زميل في فرعك على شغل كويس. الكلمة بتظهر لزملاء الفرع.</p>
        </div>

        {error && <div role="alert" className="bg-red-50 text-red-700 rounded-xl p-4">{error}</div>}
        {info && <div role="status" className="bg-green-50 text-green-700 rounded-xl p-4">{info}</div>}
        {data && !data.ready && <div className="card text-amber-800 bg-amber-50">جدول التقدير لسه مااتطبّقش على قاعدة البيانات (ترحيل 180).</div>}

        {data?.ready && data.canSend && (
          <div className="card space-y-3" data-recognition-form>
            <div className="flex flex-wrap items-end gap-3">
              <label className="text-sm text-gray-600">الزميل
                <select className="input mt-1" value={form.toEmployeeId} onChange={(event) => setForm({ ...form, toEmployeeId: event.target.value })}>
                  <option value="">اختار</option>
                  {data.colleagues.map((person) => <option key={person.id} value={person.id}>{person.fullName}</option>)}
                </select>
              </label>
              <label className="flex-1 min-w-64 text-sm text-gray-600">كلمة الشكر
                <input className="input w-full mt-1" maxLength={500} value={form.message} onChange={(event) => setForm({ ...form, message: event.target.value })} />
              </label>
              <button type="button" className="btn-primary disabled:opacity-50" disabled={busy || !form.toEmployeeId || form.message.trim().length < 5} onClick={send}>إرسال</button>
            </div>
            <p className="text-xs text-gray-500">{data.perDay} كلمات في اليوم بالكتير.</p>
          </div>
        )}

        {data?.ready && (
          <div className="card space-y-3" data-recognition-feed>
            <h2 className="text-lg font-semibold text-gray-800">قايمة التقدير</h2>
            {data.feed.length === 0 ? <p className="text-gray-500">مفيش كلمات شكر لسه.</p> : data.feed.map((item) => (
              <div key={item.id} className={`border-t border-gray-100 pt-2 text-sm ${item.toMe ? 'bg-primary-50 rounded-lg p-2' : ''}`}>
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <span className="font-medium text-gray-800">{item.fromName} ← {item.toName}</span>
                  <span className="flex items-center gap-3 text-xs text-gray-500">
                    <span dir="ltr">{new Date(item.createdAt).toLocaleDateString('ar-EG')}</span>
                    {data.canModerate && <button type="button" className="text-red-600" disabled={busy} onClick={() => hide(item)}>إخفاء</button>}
                  </span>
                </div>
                <p className="text-gray-700 mt-1">{item.message}</p>
              </div>
            ))}
          </div>
        )}
      </div>
    </MainLayout>
  )
}
