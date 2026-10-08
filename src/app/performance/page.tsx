'use client'

// B3.7: «التقييمات» — تقييماتي (التقييم الذاتي ونتيجتي بعد الإعلان) وتقييم فريقي (للمدير المقيِّم).
// (كانت شاشة عرض ببيانات وهمية؛ بقت على الخادم.)
import { useCallback, useEffect, useState } from 'react'
import Link from 'next/link'
import { ClipboardCheck } from 'lucide-react'
import { MainLayout } from '@/components/layout'
import EmptyState from '@/components/EmptyState'
import { formatDate } from '@/lib/dates'
import { dismissReward, fetchMyReviews, fetchMyRewards, fetchTeamReviews, submitReward, type ApiMyReward, type ApiReviewRow, type ReviewStatus } from '@/lib/reviews-api'

type Tab = 'mine' | 'team'
const statusStyle: Record<ReviewStatus, string> = {
  OPEN: 'bg-amber-50 text-amber-800', COMPLETED: 'bg-blue-50 text-blue-700', APPROVED: 'bg-blue-50 text-blue-700', ANNOUNCED: 'bg-purple-50 text-purple-700', ACKNOWLEDGED: 'bg-green-50 text-green-700',
}

export default function ReviewsPage() {
  const [tab, setTab] = useState<Tab>('mine')
  const [rows, setRows] = useState<ApiReviewRow[] | null>(null)
  const [error, setError] = useState('')
  // B3.8: مكافآت مقترحة من نتيجة التقييم موجّهة للمدير — هو اللي بيقدّمها
  const [rewards, setRewards] = useState<ApiMyReward[]>([])
  const [info, setInfo] = useState('')
  const [busy, setBusy] = useState(0)

  const load = useCallback(() => {
    setError('')
    setRows(null)
    ;(tab === 'mine' ? fetchMyReviews() : fetchTeamReviews())
      .then((data) => setRows(data.reviews))
      .catch((cause) => setError(cause instanceof Error ? cause.message : 'تعذر تحميل التقييمات'))
    if (tab === 'team') fetchMyRewards().then((data) => setRewards(data.suggestions)).catch(() => setRewards([]))
  }, [tab])
  useEffect(load, [load])

  const reward = async (row: ApiMyReward, work: () => Promise<string>) => {
    setBusy(row.id)
    setError('')
    setInfo('')
    try {
      setInfo(await work())
      setRewards((await fetchMyRewards()).suggestions)
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'تعذر تنفيذ الإجراء')
    } finally {
      setBusy(0)
    }
  }

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
        {info && (
          <div role="status" className="bg-green-50 text-green-800 rounded-xl p-4">
            {info}
          </div>
        )}
        {tab === 'team' && rewards.length > 0 && (
          <div className="card space-y-3" data-my-rewards>
            <h2 className="font-bold text-gray-800">مكافآت مقترحة لفريقك من نتيجة التقييم</h2>
            <p className="text-xs text-gray-500">إنت اللي بتقدّم المكافأة — وبعدها بتمشي في سلسلة اعتمادها العادية.</p>
            {rewards.map((row) => (
              <div key={row.id} className="flex items-center justify-between gap-3 flex-wrap border-t border-gray-100 pt-3">
                <p className="text-sm text-gray-700">
                  {row.employeeName} — {row.cycleName} · {row.bandLabel} · {row.typeName} ({row.calcMethodLabel}: {row.inputValue}) · مسير {row.targetPeriod}
                </p>
                {row.canSubmit ? (
                  <div className="flex items-center gap-2">
                    <button onClick={() => reward(row, async () => { await submitReward(row.id); return `اتقدّمت مكافأة ${row.employeeName} ودخلت سلسلة الاعتماد.` })} disabled={busy === row.id} className="btn-primary text-sm disabled:opacity-50">
                      قدّم المكافأة
                    </button>
                    <button onClick={() => reward(row, async () => { await dismissReward(row.id); return 'اتصرف النظر عن الاقتراح.' })} disabled={busy === row.id} className="btn-secondary text-sm disabled:opacity-50">
                      صرف النظر
                    </button>
                  </div>
                ) : (
                  <span className="text-xs text-gray-500">
                    {row.statusLabel}
                    {row.bonusStatusLabel ? ` — ${row.bonusStatusLabel}` : ''}
                  </span>
                )}
              </div>
            ))}
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
