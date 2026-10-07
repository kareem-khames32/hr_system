'use client'
// B2.5 (إضافة المالك 6 أكتوبر): سجل المهمة — سطر لكل تغيير عليها (تكليف، تحويل، موعد، حالة، رجوع للتعديل، طلب تمديد وقراره، تقييم) باسم
// اللي عمله ووقته. الخادم بيكتبه مع التغيير نفسه (جدول task_log)، وبيتقري للي يشوف المهمة (GET /tasks/:id/log). مش جزء من حوار التعليقات.
import { useEffect, useState } from 'react'
import { formatDateTime } from '../../lib/dates'
import { fetchTaskLog, type ApiTaskLog } from '../../lib/tasks-api'

export default function TaskLog({ id }: { id: number }) {
  const [log, setLog] = useState<ApiTaskLog | null>(null)
  const [error, setError] = useState('')

  useEffect(() => {
    let live = true
    fetchTaskLog(id)
      .then(value => { if (live) setLog(value) })
      .catch(err => { if (live) setError(err instanceof Error ? err.message : 'تعذر تحميل سجل المهمة') })
    return () => { live = false }
  }, [id])

  if (error) return <div role="alert" className="bg-red-50 text-red-700 rounded-lg p-2 text-sm">{error}</div>
  if (!log) return <p className="text-xs text-gray-500">جاري التحميل…</p>
  if (!log.available || log.lines.length === 0) return <p className="text-xs text-gray-500" data-task-log-empty>مفيش سطور في سجل المهمة.</p>
  return (
    <ul className="space-y-1 text-xs" data-task-log={id}>
      {log.truncated && <li className="text-gray-500">السجل أطول من المعروض: دي آخر {log.lines.length} سطر.</li>}
      {log.lines.map((line, index) => (
        <li key={index} className="flex flex-wrap items-baseline gap-2 border-b border-dashed border-gray-200 pb-1" data-task-log-line={line.event}>
          <span className="badge bg-gray-100 text-gray-700">{line.label}</span>
          <span className="text-gray-700 break-words">{line.body}</span>
          <span className="text-gray-500">— {line.mine ? 'أنت' : line.by ?? 'حساب'} · {formatDateTime(line.at)}</span>
        </li>
      ))}
    </ul>
  )
}
