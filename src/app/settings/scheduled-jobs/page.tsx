'use client'

import { Fragment, useCallback, useEffect, useState } from 'react'
import { Clock, RefreshCw } from 'lucide-react'
import { MainLayout } from '@/components/layout'
import { fetchScheduledJobs, type ApiScheduledJob, type ApiScheduledJobRun } from '@/lib/api'
import { formatDateTime } from '@/lib/dates'

// المهام المجدولة (خطة التنفيذ B1.4): كل مهمة بموعدها والجاية إمتى، وآخر تشغيل وآخر فشل، وعدد آخر 24 ساعة، وآخر 20 تشغيل.
// قراءة بس، لصاحب «إدارة الإعدادات» على كل الفروع. التشغيل نفسه مرة واحدة حتى لو فيه أكتر من نسخة من الـAPI.

const RUN_STATUS: Record<ApiScheduledJobRun['status'], { label: string; tone: string }> = {
  SUCCEEDED: { label: 'نجحت', tone: 'bg-green-50 text-green-700' },
  FAILED: { label: 'فشلت', tone: 'bg-red-50 text-red-700' },
  RUNNING: { label: 'شغالة', tone: 'bg-blue-50 text-blue-700' },
}

const durationText = (ms: number | null) => {
  if (ms == null) return '—'
  if (ms < 1000) return `${ms} مللي`
  const seconds = Math.round(ms / 1000)
  return seconds < 60 ? `${seconds} ث` : `${Math.floor(seconds / 60)} د ${seconds % 60} ث`
}

function RunBadge({ run }: { run: ApiScheduledJobRun }) {
  if (run.abandoned) return <span className="badge bg-amber-50 text-amber-800">وقفت من غير ما تخلص</span>
  const status = RUN_STATUS[run.status] ?? { label: run.status, tone: 'bg-gray-100 text-gray-700' }
  return <span className={`badge ${status.tone}`}>{status.label}</span>
}

export default function ScheduledJobsPage() {
  const [data, setData] = useState<{ timeZone: string; available: boolean; host: string; jobs: ApiScheduledJob[] } | null>(null)
  const [open, setOpen] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  const load = useCallback(() => {
    setLoading(true); setError('')
    fetchScheduledJobs()
      .then(setData)
      .catch(cause => setError(cause instanceof Error ? cause.message : 'تعذر تحميل المهام المجدولة'))
      .finally(() => setLoading(false))
  }, [])
  useEffect(load, [load])

  return (
    <MainLayout>
      <div className="space-y-6">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h1 className="text-2xl font-bold text-gray-800 flex items-center gap-2"><Clock size={24} className="text-primary-600" />المهام المجدولة</h1>
            <p className="text-gray-500 mt-1">
              مواعيد النظام وآخر تشغيل لكل مهمة — كل مهمة بتشتغل مرة واحدة في موعدها حتى لو فيه أكتر من نسخة
              {data && <> · التوقيت: <span dir="ltr" className="font-mono">{data.timeZone}</span></>}
            </p>
          </div>
          <button type="button" onClick={load} className="btn-secondary flex items-center gap-2"><RefreshCw size={18} />تحديث</button>
        </div>

        {error && <div role="alert" className="bg-red-50 text-red-700 rounded-xl p-4">{error}</div>}
        {data && !data.available && (
          <div className="bg-amber-50 text-amber-900 rounded-xl p-4" data-scheduled-jobs-unavailable>
            سجل التشغيل هيبدأ يتسجل بعد تطبيق ترحيل 079 على السيرفر. المهام نفسها شغالة في مواعيدها.
          </div>
        )}

        <div className="card overflow-x-auto">
          {loading && !data ? <p className="text-sm text-gray-400">جارٍ التحميل…</p> : (
            <table className="w-full text-sm" data-scheduled-jobs-table>
              <thead className="bg-gray-50">
                <tr>{['المهمة', 'آخر تشغيل', 'آخر فشل', 'آخر 24 ساعة', 'الجاية'].map(title =>
                  <th key={title} className="px-3 py-2 text-right font-medium text-gray-600 whitespace-nowrap">{title}</th>)}</tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {(data?.jobs ?? []).map(job => (
                  <Fragment key={job.id}>
                    <tr className="cursor-pointer hover:bg-gray-50" onClick={() => setOpen(current => current === job.id ? null : job.id)} data-scheduled-job={job.id}>
                      <td className="px-3 py-2">
                        <span className="font-medium text-gray-800">{job.label}</span>
                        <span className="block text-xs text-gray-500">{job.schedule}</span>
                        {!job.enabled && <span className="badge bg-gray-100 text-gray-600 mt-1">موديولها مقفول</span>}
                      </td>
                      <td className="px-3 py-2 whitespace-nowrap">
                        {job.lastRun ? (
                          <div className="space-y-1">
                            <RunBadge run={job.lastRun} />
                            <span className="block text-xs text-gray-500" dir="ltr">{formatDateTime(job.lastRun.startedAt)} · {durationText(job.lastRun.durationMs)}</span>
                          </div>
                        ) : <span className="text-gray-400">لسه</span>}
                      </td>
                      <td className="px-3 py-2 max-w-xs">
                        {job.lastFailure ? (
                          <div>
                            <span className="block text-xs text-gray-500" dir="ltr">{formatDateTime(job.lastFailure.startedAt)}</span>
                            <span className="block text-xs text-red-700 truncate" title={job.lastFailure.error ?? ''}>{job.lastFailure.error ?? '—'}</span>
                          </div>
                        ) : <span className="text-gray-400">—</span>}
                      </td>
                      <td className="px-3 py-2 whitespace-nowrap">
                        {job.last24h.runs} تشغيل{job.last24h.failed > 0 && <span className="text-red-700"> · {job.last24h.failed} فشل</span>}
                      </td>
                      <td className="px-3 py-2 whitespace-nowrap text-xs text-gray-600" dir="ltr">{job.nextRunAt ? formatDateTime(job.nextRunAt) : '—'}</td>
                    </tr>
                    {open === job.id && (
                      <tr>
                        <td colSpan={5} className="bg-gray-50 px-3 py-3">
                          {job.recent.length === 0 ? <p className="text-xs text-gray-500">مفيش تشغيل متسجل لسه</p> : (
                            <table className="w-full text-xs" data-scheduled-job-runs>
                              <thead><tr>{['البداية', 'النتيجة', 'المدة', 'السيرفر', 'الخطأ'].map(title =>
                                <th key={title} className="px-2 py-1 text-right font-medium text-gray-500">{title}</th>)}</tr></thead>
                              <tbody>
                                {job.recent.map(run => (
                                  <tr key={run.id}>
                                    <td className="px-2 py-1 whitespace-nowrap" dir="ltr">{formatDateTime(run.startedAt)}</td>
                                    <td className="px-2 py-1"><RunBadge run={run} /></td>
                                    <td className="px-2 py-1 whitespace-nowrap">{durationText(run.durationMs)}</td>
                                    <td className="px-2 py-1 font-mono text-gray-500" dir="ltr">{run.host ?? '—'}</td>
                                    <td className="px-2 py-1 text-red-700">{run.error ?? ''}</td>
                                  </tr>
                                ))}
                              </tbody>
                            </table>
                          )}
                        </td>
                      </tr>
                    )}
                  </Fragment>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </div>
    </MainLayout>
  )
}
