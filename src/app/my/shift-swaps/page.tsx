'use client'

// B5.5 (ج): «تبديل ورديتي» — طلبات تبديل الوردية اللي زميل طلبها معاك: بتوافق أو ترفض، والتبديل مابيتنفّذش غير بموافقتك واعتماد المدير.
// ميزة shifts.swap_consent (مقفولة افتراضيًا).
import { useCallback, useEffect, useState } from 'react'
import { ArrowLeftRight } from 'lucide-react'
import { MainLayout } from '@/components/layout'
import { apiFetch } from '@/lib/api'

interface SwapRow {
  requestId: number; requesterName: string | null; date: string | null; withDate: string | null
  status: 'PENDING' | 'ACCEPTED' | 'DECLINED'; statusLabel: string; note: string | null; decidedAt: string | null; open: boolean; requestStatus: string
}
const fetchMine = () => apiFetch<{ ready: boolean; rows: SwapRow[] }>('/attendance/swap-consents/mine')
const decide = (requestId: number, accept: boolean, note: string) => apiFetch<{ requestId: number }>(`/attendance/swap-consents/${requestId}`, { method: 'POST', body: JSON.stringify({ accept, note }) })

export default function MyShiftSwapsPage() {
  const [data, setData] = useState<{ ready: boolean; rows: SwapRow[] } | null>(null)
  const [error, setError] = useState('')
  const [info, setInfo] = useState('')
  const [busy, setBusy] = useState(false)
  const [notes, setNotes] = useState<Record<number, string>>({})

  const load = useCallback(() => {
    fetchMine().then(setData).catch((cause) => setError(cause instanceof Error ? cause.message : 'تعذر تحميل طلبات التبديل'))
  }, [])
  useEffect(load, [load])

  async function answer(requestId: number, accept: boolean) {
    setBusy(true); setError(''); setInfo('')
    try { await decide(requestId, accept, (notes[requestId] ?? '').trim()); setInfo(accept ? 'اتسجّلت موافقتك' : 'اتسجّل رفضك'); load() } catch (cause) { setError(cause instanceof Error ? cause.message : 'تعذر التنفيذ') } finally { setBusy(false) }
  }

  return (
    <MainLayout>
      <div className="space-y-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-800 flex items-center gap-2">
            <ArrowLeftRight size={24} className="text-primary-600" />
            تبديل ورديتي
          </h1>
          <p className="text-gray-500 mt-1">زميلك طلب يبدّل ورديته معاك. التبديل مابيتنفّذش غير بموافقتك وبعدها اعتماد المدير.</p>
        </div>

        {error && <div role="alert" className="bg-red-50 text-red-700 rounded-xl p-4">{error}</div>}
        {info && <div role="status" className="bg-green-50 text-green-700 rounded-xl p-4">{info}</div>}
        {data && !data.ready && <div className="card text-amber-800 bg-amber-50">جدول موافقات تبديل الوردية لسه مااتطبّقش (ترحيل 166).</div>}
        {data?.ready && data.rows.length === 0 && <div className="card text-gray-500">مفيش طلبات تبديل معاك.</div>}

        {(data?.rows ?? []).map((row) => (
          <div key={row.requestId} className="card space-y-2" data-swap-consent={row.requestId}>
            <div className="flex flex-wrap items-center gap-3">
              <b className="text-gray-800">{row.requesterName ?? 'زميل'}</b>
              <span className="text-sm text-gray-600">ورديته يوم <span dir="ltr">{row.date ?? '—'}</span> مقابل ورديتك يوم <span dir="ltr">{row.withDate ?? '—'}</span></span>
              <span className="text-xs text-gray-500" dir="ltr">#{row.requestId}</span>
              <span className={`mr-auto text-xs rounded-full px-3 py-1 ${row.status === 'ACCEPTED' ? 'bg-green-50 text-green-700' : row.status === 'DECLINED' ? 'bg-red-50 text-red-700' : 'bg-amber-50 text-amber-800'}`}>{row.statusLabel}</span>
            </div>
            {row.note && <p className="text-sm text-gray-600">ملاحظتك: {row.note}</p>}
            {row.open && (
              <div className="flex flex-wrap items-end gap-3">
                <label className="flex-1 min-w-48 text-sm text-gray-600">ملاحظة (اختياري)
                  <input className="input w-full mt-1" maxLength={300} value={notes[row.requestId] ?? ''} onChange={(event) => setNotes({ ...notes, [row.requestId]: event.target.value })} />
                </label>
                <button type="button" className="btn-primary disabled:opacity-50" disabled={busy} onClick={() => answer(row.requestId, true)}>موافق</button>
                <button type="button" className="btn-secondary disabled:opacity-50" disabled={busy} onClick={() => answer(row.requestId, false)}>مش موافق</button>
              </div>
            )}
            {!row.open && row.status === 'PENDING' && <p className="text-xs text-gray-500">الطلب مابقاش تحت الاعتماد.</p>}
          </div>
        ))}
      </div>
    </MainLayout>
  )
}
