'use client'

// B3.9: «دوراتي» — تسجيلات الموظف في التدريب بمواعيدها وحالتها وشهادته، وتقييمه للتدريب بعد الحضور (مرة واحدة). التسجيل بييجي من إدارة التدريب
// أو من «طلب تدريب» بعد اعتماده. (كانت شاشة عرض ببيانات وهمية؛ بقت على الخادم.)
import { useEffect, useState } from 'react'
import Link from 'next/link'
import { BookOpen, Star } from 'lucide-react'
import { MainLayout } from '@/components/layout'
import EmptyState from '@/components/EmptyState'
import { formatDate } from '@/lib/dates'
import { fetchMyTraining, rateTraining, type ApiMyTraining } from '@/lib/training-api'

export default function MyCoursesPage() {
  const [rows, setRows] = useState<ApiMyTraining[] | null>(null)
  const [error, setError] = useState('')
  const [rating, setRating] = useState<{ id: number; value: number; comment: string } | null>(null)
  const [busy, setBusy] = useState(false)

  useEffect(() => {
    fetchMyTraining().then((data) => setRows(data.enrollments)).catch((cause) => setError(cause instanceof Error ? cause.message : 'تعذر تحميل دوراتك'))
  }, [])

  const save = async () => {
    if (!rating) return
    setBusy(true)
    setError('')
    try {
      setRows((await rateTraining(rating.id, rating.value, rating.comment.trim() || undefined)).enrollments)
      setRating(null)
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'تعذر حفظ التقييم')
    } finally {
      setBusy(false)
    }
  }

  return (
    <MainLayout>
      <div className="space-y-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-800 flex items-center gap-2">
            <BookOpen size={24} className="text-primary-600" />
            دوراتي
          </h1>
          <p className="text-gray-500 mt-1">
            دوراتك التدريبية وشهاداتك · عايز دورة؟ قدّم{' '}
            <Link href="/requests" className="text-primary-600 hover:underline">
              «طلب تدريب»
            </Link>
          </p>
        </div>
        {error && (
          <div role="alert" className="bg-red-50 text-red-700 rounded-xl p-4">
            {error}
          </div>
        )}
        {rows && rows.length === 0 && <EmptyState title="مفيش دورات مسجّل فيها لسه" icon={BookOpen} />}
        {rows && rows.length > 0 && (
          <div className="grid gap-3" data-my-training>
            {rows.map((row) => (
              <div key={row.id} className="card space-y-2">
                <div className="flex items-start justify-between gap-3 flex-wrap">
                  <div>
                    <h2 className="font-bold text-gray-800">{row.courseName}</h2>
                    <p className="text-xs text-gray-500 mt-1">
                      {row.kindLabel} · {formatDate(row.startDate)} – {formatDate(row.endDate)}
                      {row.location ? ` · ${row.location}` : ''}
                      {row.trainer ? ` · المدرب: ${row.trainer}` : ''}
                      {row.durationHours !== null ? ` · ${row.durationHours} ساعة` : ''}
                    </p>
                  </div>
                  <span className="inline-block px-2 py-0.5 rounded-full text-xs bg-gray-100 text-gray-700">{row.sessionStatus === 'CANCELLED' ? row.sessionStatusLabel : row.statusLabel}</span>
                </div>
                {row.url && (
                  <a href={row.url} target="_blank" rel="noopener noreferrer" className="text-sm text-primary-600 hover:underline" dir="ltr">
                    {row.url}
                  </a>
                )}
                {row.result && <p className="text-sm text-gray-600">النتيجة: {row.result}</p>}
                {row.certificate && (
                  <p className="text-sm text-green-700">
                    شهادة بتاريخ {row.certificate.issueDate ? formatDate(row.certificate.issueDate) : '—'}
                    {row.certificate.expiryDate ? ` — صالحة لحد ${formatDate(row.certificate.expiryDate)}` : ' — من غير انتهاء'}
                  </p>
                )}
                {row.rating !== null && (
                  <p className="text-sm text-gray-600 tabular-nums">
                    تقييمك: {row.rating} / 5{row.ratingComment ? ` — «${row.ratingComment}»` : ''}
                  </p>
                )}
                {row.canRate && rating?.id !== row.id && (
                  <button onClick={() => setRating({ id: row.id, value: 5, comment: '' })} className="btn-secondary text-sm flex items-center gap-2">
                    <Star size={16} />
                    قيّم التدريب
                  </button>
                )}
                {rating?.id === row.id && (
                  <div className="bg-gray-50 rounded-xl p-3 space-y-2" data-rate>
                    <div className="flex items-center gap-1">
                      {[1, 2, 3, 4, 5].map((value) => (
                        <button key={value} onClick={() => setRating({ ...rating, value })} aria-label={`${value} من 5`} className={value <= rating.value ? 'text-amber-500' : 'text-gray-300'}>
                          <Star size={22} fill="currentColor" />
                        </button>
                      ))}
                    </div>
                    <textarea className="input w-full text-sm" rows={2} maxLength={500} placeholder="تعليقك (اختياري)" value={rating.comment} onChange={(e) => setRating({ ...rating, comment: e.target.value })} />
                    <div className="flex items-center gap-2">
                      <button onClick={save} disabled={busy} className="btn-primary text-sm disabled:opacity-50">
                        حفظ التقييم
                      </button>
                      <button onClick={() => setRating(null)} className="btn-secondary text-sm">
                        إلغاء
                      </button>
                    </div>
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </div>
    </MainLayout>
  )
}
