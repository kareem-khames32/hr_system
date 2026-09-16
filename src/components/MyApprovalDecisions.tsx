'use client'

import { useEffect, useState } from 'react'
import { History, ChevronDown, ChevronUp } from 'lucide-react'
import { apiFetch } from '@/lib/api'
import { requestStatusLabels } from '@/lib/status-labels'
import { DISPLAY_LOCALE } from '@/lib/dates'

interface Decision {
  id: number; requestId: number; step: number; action: string; comment: string | null
  actedAt: string; requestStatus: string; requestTitle: string
}
interface DecisionPage { items: Decision[]; nextCursor: string | null }
const labels: Record<string, string> = { APPROVED: 'اعتمدت', REJECTED: 'رفضت', RETURNED_FOR_INFO: 'أعدت للاستكمال' }

export default function MyApprovalDecisions({ onOpen, revision }: { onOpen: (id: number) => void; revision: number }) {
  const [open, setOpen] = useState(false)
  const [cursors, setCursors] = useState<(string | null)[]>([null])
  const [data, setData] = useState<DecisionPage>({ items: [], nextCursor: null })
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [retry, setRetry] = useState(0)
  const cursor = cursors[cursors.length - 1]
  useEffect(() => { setCursors([null]) }, [revision])
  useEffect(() => {
    if (!open) return
    let cancelled = false
    setLoading(true); setError('')
    apiFetch<DecisionPage>('/requests/my-decisions' + (cursor ? `?before=${encodeURIComponent(cursor)}` : ''))
      .then(page => { if (!cancelled) setData(page) })
      .catch(err => { if (!cancelled) setError(err instanceof Error ? err.message : 'تعذر تحميل قراراتك') })
      .finally(() => { if (!cancelled) setLoading(false) })
    return () => { cancelled = true }
  }, [open, cursor, revision, retry])
  return <section className="card p-5">
    <button type="button" aria-expanded={open} onClick={() => setOpen(value => !value)} className="flex w-full items-center gap-3 text-right">
      <History size={20} className="text-primary-600" />
      <span className="flex-1"><span className="block font-bold text-gray-800">قراراتي السابقة</span><span className="text-sm text-gray-500">القرارات التي اتخذتها على الطلبات، مع السبب والتاريخ</span></span>
      {open ? <ChevronUp size={18} /> : <ChevronDown size={18} />}
    </button>
    {open && <div className="mt-5">
      {error ? <div role="alert" className="rounded-xl bg-red-50 p-4 text-red-700">{error} <button type="button" onClick={() => setRetry(value => value + 1)} className="underline">إعادة المحاولة</button></div>
        : loading ? <p className="py-6 text-center text-gray-500">جارٍ تحميل القرارات…</p>
        : !data.items.length ? <p className="py-6 text-center text-gray-500">لم تسجّل قرارات على الطلبات بعد.</p>
        : <div className="overflow-x-auto"><table className="w-full text-right text-sm"><thead className="bg-gray-50 text-gray-500"><tr>
          <th className="p-3">الطلب</th><th className="p-3">قراري</th><th className="p-3">التاريخ</th><th className="p-3">التعليق</th><th className="p-3">حالة الطلب الآن</th>
        </tr></thead><tbody className="divide-y divide-gray-100">{data.items.map(item => <tr key={item.id}>
          <td className="p-3"><button type="button" onClick={() => onOpen(item.requestId)} className="font-medium text-primary-600 hover:underline">{item.requestTitle}<span dir="ltr" className="block text-xs">REQ-{item.requestId}</span></button></td>
          <td className="p-3 whitespace-nowrap">{labels[item.action] || 'قرار مسجل'}</td>
          <td className="p-3 whitespace-nowrap">{new Date(item.actedAt).toLocaleString(DISPLAY_LOCALE)}</td>
          <td className="p-3 min-w-48 max-w-md whitespace-pre-wrap break-words">{item.comment || '—'}</td>
          <td className="p-3">{requestStatusLabels[item.requestStatus as keyof typeof requestStatusLabels] || 'حالة مسجلة'}</td>
        </tr>)}</tbody></table></div>}
      {!error && !loading && <div className="mt-4 flex items-center justify-between"><button type="button" className="btn-secondary disabled:opacity-40" disabled={cursors.length < 2} onClick={() => setCursors(stack => stack.slice(0, -1))}>الأحدث</button><span className="text-xs text-gray-500">صفحة {cursors.length}</span><button type="button" className="btn-secondary disabled:opacity-40" disabled={!data.nextCursor} onClick={() => setCursors(stack => [...stack, data.nextCursor])}>الأقدم</button></div>}
    </div>}
  </section>
}
