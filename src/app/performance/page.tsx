'use client'

// B3.7: «التقييمات» — تقييماتي (التقييم الذاتي ونتيجتي بعد الإعلان) وتقييم فريقي (للمدير المقيِّم).
// (كانت شاشة عرض ببيانات وهمية؛ بقت على الخادم.)
import { useCallback, useEffect, useState } from 'react'
import Link from 'next/link'
import { ClipboardCheck } from 'lucide-react'
import { MainLayout } from '@/components/layout'
import EmptyState from '@/components/EmptyState'
import { formatDate } from '@/lib/dates'
import { fetchMyReviews, fetchTeamReviews, type ApiReviewRow, type ReviewStatus } from '@/lib/reviews-api'

type Tab = 'mine' | 'team'
const statusStyle: Record<ReviewStatus, string> = {
  OPEN: 'bg-amber-50 text-amber-800', COMPLETED: 'bg-blue-50 text-blue-700', APPROVED: 'bg-blue-50 text-blue-700', ANNOUNCED: 'bg-purple-50 text-purple-700', ACKNOWLEDGED: 'bg-green-50 text-green-700',
}

export default function ReviewsPage() {
  const [tab, setTab] = useState<Tab>('mine')
  const [rows, setRows] = useState<ApiReviewRow[] | null>(null)
  const [error, setError] = useState('')

  const load = useCallback(() => {
    setError('')
    setRows(null)
    ;(tab === 'mine' ? fetchMyReviews() : fetchTeamReviews())
      .then((data) => setRows(data.reviews))
      .catch((cause) => setError(cause instanceof Error ? cause.message : 'تعذر تحميل التقييمات'))
  }, [tab])
  useEffect(load, [load])

  // اللي مطلوب من القارئ دلوقتي في كل تقييم
  const todo = (row: ApiReviewRow) =>
    row.cycleStatus !== 'ACTIVE' ? null : tab === 'mine' ? (row.selfSubmitted ? null : `سلّم تقييمك الذاتي قبل ${formatDate(row.selfDueDate)}`) : row.managerSubmitted ? null : `سلّم تقييمك قبل ${formatDate(row.managerDueDate)}`

  return (
    <MainLayout>
      <div className="space-y-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-800 flex items-center gap-2">
            <ClipboardCheck size={24} className="text-primary-600" />
            التقييمات
          </h1>
          <p className="text-gray-500 mt-1">تقييمك الذاتي ونتيجتك بعد إعلانها، وتقييم فريقك لو إنت مدير</p>
        </div>
        <div className="flex items-center gap-2" role="tablist">
          {(['mine', 'team'] as Tab[]).map((key) => (
            <button
              key={key}
              role="tab"
              aria-selected={tab === key}
              onClick={() => setTab(key)}
              className={`px-4 py-2 rounded-full text-sm ${tab === key ? 'bg-primary-600 text-white' : 'bg-gray-100 text-gray-700 hover:bg-gray-200'}`}
            >
              {key === 'mine' ? 'تقييماتي' : 'تقييم فريقي'}
            </button>
          ))}
        </div>
        {error && (
          <div role="alert" className="bg-red-50 text-red-700 rounded-xl p-4">
            {error}
          </div>
        )}
        {rows && rows.length === 0 && <EmptyState title={tab === 'mine' ? 'مفيش تقييمات ليك دلوقتي' : 'مفيش تقييمات مطلوبة منك لفريقك'} icon={ClipboardCheck} />}
        {rows && rows.length > 0 && (
          <div className="grid gap-3" data-reviews>
            {rows.map((row) => (
              <Link key={row.id} href={`/performance/${row.id}`} className="card block hover:shadow-md transition-shadow">
                <div className="flex items-start justify-between gap-3 flex-wrap">
                  <div>
                    <h2 className="font-bold text-gray-800">
                      {tab === 'team' && row.employeeName ? `${row.employeeName} — ` : ''}
                      {row.cycleName}
                    </h2>
                    <p className="text-xs text-gray-500 mt-1">
                      {row.kindLabel} · {formatDate(row.periodStart)} – {formatDate(row.periodEnd)}
                    </p>
                    {todo(row) && <p className="text-sm text-amber-700 mt-2">{todo(row)}</p>}
                  </div>
                  <div className="text-left">
                    <span className={`inline-block px-2 py-0.5 rounded-full text-xs ${statusStyle[row.status]}`}>{row.statusLabel}</span>
                    {row.finalScore !== null && <p className="text-lg font-bold text-gray-800 mt-2 tabular-nums">{row.finalScore} / 100</p>}
                    {row.finalScore === null && row.selfScore !== null && <p className="text-xs text-gray-500 mt-2 tabular-nums">الذاتي: {row.selfScore} / 100</p>}
                  </div>
                </div>
              </Link>
            ))}
          </div>
        )}
      </div>
    </MainLayout>
  )
}
