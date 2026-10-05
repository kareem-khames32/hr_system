'use client'

import { useCallback, useEffect, useState } from 'react'
import { Inbox, RotateCcw } from 'lucide-react'
import { fetchQueueOverview, QUEUE_STATUS_LABELS, retryQueueJob, type ApiQueueOverview, type QueueJobStatus } from '@/lib/queue-api'
import { formatDateTime } from '@/lib/dates'

// B2.3: الطابور تحت «المهام المجدولة» — العدّ بكل حالة، والأحداث اللي لسه ماتوزعتش، وآخر المهام الميتة برسالتها و«إعادة» لكل واحدة.
const STATUS_ORDER: QueueJobStatus[] = ['PENDING', 'RUNNING', 'DONE', 'DEAD']

export default function QueuePanel() {
  const [data, setData] = useState<ApiQueueOverview | null>(null)
  const [error, setError] = useState('')
  const [busy, setBusy] = useState<string | null>(null)

  const load = useCallback(() => {
    setError('')
    fetchQueueOverview()
      .then(setData)
      .catch(cause => setError(cause instanceof Error ? cause.message : 'تعذر تحميل الطابور'))
  }, [])
  useEffect(load, [load])

  const retry = async (id: string) => {
    setBusy(id); setError('')
    try { await retryQueueJob(id); load() } catch (cause) { setError(cause instanceof Error ? cause.message : 'تعذرت إعادة المهمة') } finally { setBusy(null) }
  }

  return (
    <div className="card space-y-4" data-queue-panel>
      <h2 className="text-lg font-semibold text-gray-800 flex items-center gap-2"><Inbox size={20} className="text-primary-600" />الطابور</h2>
      <p className="text-sm text-gray-500">أحداث النظام (تعيين، طلب وصل لمعتمد، قرار طلب، اعتماد مسير، مستند هينتهي، انتهاء خدمة) ومهامها. العامل بيشتغل كل كام ثانية، والمهمة اللي بتفشل بتتعاد بعد مهلة.</p>
      {error && <div role="alert" className="bg-red-50 text-red-700 rounded-xl p-3 text-sm">{error}</div>}
      {data && !data.available && (
        <div className="bg-amber-50 text-amber-900 rounded-xl p-3 text-sm" data-queue-unavailable>
          الطابور هيشتغل بعد تطبيق ترحيل 086 على السيرفر. لحد كده الأحداث مابتتسجلش، والعمليات نفسها شغالة عادي.
        </div>
      )}
      {data?.available && (
        <>
          <div className="grid grid-cols-2 sm:grid-cols-5 gap-3" data-queue-counts>
            {STATUS_ORDER.map(status => (
              <div key={status} className={`rounded-xl p-3 ${status === 'DEAD' && data.jobs.DEAD > 0 ? 'bg-red-50' : 'bg-gray-50'}`}>
                <span className="block text-xs text-gray-500">{QUEUE_STATUS_LABELS[status]}</span>
                <span className="text-xl font-bold text-gray-800">{data.jobs[status] ?? 0}</span>
              </div>
            ))}
            <div className="rounded-xl p-3 bg-gray-50">
              <span className="block text-xs text-gray-500">أحداث لسه ماتوزعتش</span>
              <span className="text-xl font-bold text-gray-800">{data.outboxPending}</span>
            </div>
          </div>
          {data.dead.length > 0 && (
            <div className="overflow-x-auto">
              <table className="w-full text-sm" data-queue-dead>
                <thead className="bg-gray-50">
                  <tr>{['المهمة', 'المحاولات', 'آخر خطأ', 'إمتى', ''].map(title => <th key={title} className="px-3 py-2 text-right font-medium text-gray-600 whitespace-nowrap">{title}</th>)}</tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {data.dead.map(job => (
                    <tr key={job.id}>
                      <td className="px-3 py-2 font-mono text-xs" dir="ltr">{job.jobType} #{job.id}</td>
                      <td className="px-3 py-2 whitespace-nowrap">{job.attempts} من {job.maxAttempts}</td>
                      <td className="px-3 py-2 text-red-700 text-xs max-w-md">{job.lastError ?? '—'}</td>
                      <td className="px-3 py-2 whitespace-nowrap text-xs text-gray-600" dir="ltr">{job.finishedAt ? formatDateTime(job.finishedAt) : '—'}</td>
                      <td className="px-3 py-2">
                        <button type="button" className="btn-secondary flex items-center gap-1 text-xs" disabled={busy === job.id} onClick={() => retry(job.id)}>
                          <RotateCcw size={14} />إعادة
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </>
      )}
    </div>
  )
}
