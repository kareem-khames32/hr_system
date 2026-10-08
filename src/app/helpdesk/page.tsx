'use client'

// B3.10: «مركز الخدمات» — استفسارات الموظف للموارد البشرية بحالة خدمتها وتقييمه بعد الإقفال؛ وتقرير الاستفسارات لصاحب الصلاحية.
// الاستفسار نفسه طلب بيتقدّم من «الطلبات» (فئة «استفسارات»)، والرد عليه في تعليقات الطلب.
import { useCallback, useEffect, useState } from 'react'
import Link from 'next/link'
import { LifeBuoy, Star } from 'lucide-react'
import { MainLayout } from '@/components/layout'
import EmptyState from '@/components/EmptyState'
import { can } from '@/lib/api'
import { formatDate } from '@/lib/dates'
import { fetchHelpdeskReport, fetchMyInquiries, rateInquiry, type ApiHelpdeskReport, type ApiInquiry } from '@/lib/helpdesk-api'
import ArticlesManager from './ArticlesManager'
import KnowledgePanel from './KnowledgePanel'

type Tab = 'mine' | 'report' | 'articles'
const statusStyle: Record<ApiInquiry['serviceStatus'], string> = {
  OPEN: 'bg-amber-50 text-amber-800', IN_PROGRESS: 'bg-blue-50 text-blue-700', WAITING: 'bg-purple-50 text-purple-700', DONE: 'bg-green-50 text-green-700', CANCELLED: 'bg-gray-100 text-gray-500',
}
const hours = (value: number | null) => (value === null ? '—' : `${value} ساعة`)

export default function HelpdeskPage() {
  const manage = can('helpdesk.manage')
  const [tab, setTab] = useState<Tab>('mine')
  const [rows, setRows] = useState<ApiInquiry[] | null>(null)
  const [report, setReport] = useState<ApiHelpdeskReport | null>(null)
  const [from, setFrom] = useState('')
  const [to, setTo] = useState('')
  const [error, setError] = useState('')
  const [rating, setRating] = useState<{ id: number; value: number; comment: string } | null>(null)
  const [busy, setBusy] = useState(false)

  const load = useCallback(() => {
    setError('')
    if (tab === 'articles') return
    if (tab === 'mine') fetchMyInquiries().then((data) => setRows(data.inquiries)).catch((cause) => setError(cause instanceof Error ? cause.message : 'تعذر تحميل استفساراتك'))
    else fetchHelpdeskReport(from && to ? { from, to } : undefined).then(setReport).catch((cause) => setError(cause instanceof Error ? cause.message : 'تعذر تحميل التقرير'))
  }, [tab, from, to])
  useEffect(load, [load])

  const save = async () => {
    if (!rating) return
    setBusy(true)
    setError('')
    try {
      setRows((await rateInquiry(rating.id, rating.value, rating.comment.trim() || undefined)).inquiries)
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
        <div className="flex items-start justify-between gap-3 flex-wrap">
          <div>
            <h1 className="text-2xl font-bold text-gray-800 flex items-center gap-2">
              <LifeBuoy size={24} className="text-primary-600" />
              مركز الخدمات
            </h1>
            <p className="text-gray-500 mt-1">اسأل الموارد البشرية وتابع الرد — الرد بييجي في تعليقات الاستفسار</p>
          </div>
          <Link href="/requests" className="btn-primary">
            استفسار جديد
          </Link>
        </div>
        {manage && (
          <div className="flex items-center gap-2" role="tablist">
            {(['mine', 'report', 'articles'] as Tab[]).map((key) => (
              <button key={key} role="tab" aria-selected={tab === key} onClick={() => setTab(key)}
                className={`px-4 py-2 rounded-full text-sm ${tab === key ? 'bg-primary-600 text-white' : 'bg-gray-100 text-gray-700 hover:bg-gray-200'}`}>
                {key === 'mine' ? 'استفساراتي' : key === 'report' ? 'التقرير' : 'المقالات'}
              </button>
            ))}
          </div>
        )}
        {error && (
          <div role="alert" className="bg-red-50 text-red-700 rounded-xl p-4">
            {error}
          </div>
        )}
        {tab === 'mine' && <KnowledgePanel />}
        {tab === 'articles' && manage && <ArticlesManager />}
        {tab === 'mine' && rows && rows.length === 0 && <EmptyState title="مفيش استفسارات ليك لسه" icon={LifeBuoy} />}
        {tab === 'mine' && rows && rows.length > 0 && (
          <div className="grid gap-3" data-inquiries>
            {rows.map((row) => (
              <div key={row.id} className="card space-y-2">
                <div className="flex items-start justify-between gap-3 flex-wrap">
                  <div>
                    <h2 className="font-bold text-gray-800">{row.typeName}</h2>
                    <p className="text-sm text-gray-600 mt-1">{row.subject}</p>
                    <p className="text-xs text-gray-500 mt-1">
                      {formatDate(row.createdAt)}
                      {row.dueDate && row.serviceStatus !== 'DONE' ? ` · الرد المتوقع قبل ${formatDate(row.dueDate)}` : ''}
                    </p>
                  </div>
                  <span className={`inline-block px-2 py-0.5 rounded-full text-xs ${statusStyle[row.serviceStatus]}`}>{row.serviceStatusLabel}</span>
                </div>
                <Link href={`/requests?request=${row.id}`} className="text-sm text-primary-600 hover:underline">
                  افتح الاستفسار والردود
                </Link>
                {row.rating !== null && (
                  <p className="text-sm text-gray-600 tabular-nums">
                    تقييمك: {row.rating} / 5{row.ratingComment ? ` — «${row.ratingComment}»` : ''}
                  </p>
                )}
                {row.canRate && rating?.id !== row.id && (
                  <button onClick={() => setRating({ id: row.id, value: 5, comment: '' })} className="btn-secondary text-sm flex items-center gap-2">
                    <Star size={16} />
                    قيّم الخدمة
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
        {tab === 'report' && (
          <div className="card flex items-end gap-3 flex-wrap">
            <label className="text-sm text-gray-600">
              من يوم
              <input type="date" className="input mt-1" value={from} onChange={(e) => setFrom(e.target.value)} />
            </label>
            <label className="text-sm text-gray-600">
              إلى يوم
              <input type="date" className="input mt-1" value={to} onChange={(e) => setTo(e.target.value)} />
            </label>
            {report && (
              <p className="text-xs text-gray-500">
                {formatDate(report.from)} – {formatDate(report.to)} · مهلة أول رد {report.firstResponseLimitHours} ساعة
              </p>
            )}
          </div>
        )}
        {tab === 'report' && report && (
          <div className="card overflow-x-auto">
            <table className="w-full text-sm" data-helpdesk-report>
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-3 py-2 text-start font-medium text-gray-600">النوع</th>
                  <th className="px-3 py-2 text-start font-medium text-gray-600">العدد</th>
                  <th className="px-3 py-2 text-start font-medium text-gray-600">مفتوح</th>
                  <th className="px-3 py-2 text-start font-medium text-gray-600">متوسط أول رد</th>
                  <th className="px-3 py-2 text-start font-medium text-gray-600">متوسط الحل</th>
                  <th className="px-3 py-2 text-start font-medium text-gray-600">عدّى مهلة الرد</th>
                  <th className="px-3 py-2 text-start font-medium text-gray-600">عدّى مهلة الحل</th>
                  <th className="px-3 py-2 text-start font-medium text-gray-600">الرضا</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {[...report.types.map((row) => ({ ...row, key: row.code })), { ...report.totals, key: 'ALL', name: 'الإجمالي' }].map((row) => (
                  <tr key={row.key} className={row.key === 'ALL' ? 'bg-gray-50 font-medium' : ''}>
                    <td className="px-3 py-2 text-gray-800">{row.name}</td>
                    <td className="px-3 py-2 tabular-nums">{row.total}</td>
                    <td className="px-3 py-2 tabular-nums">{row.open}</td>
                    <td className="px-3 py-2 tabular-nums">{hours(row.avgFirstResponseHours)}</td>
                    <td className="px-3 py-2 tabular-nums">{hours(row.avgResolutionHours)}</td>
                    <td className={`px-3 py-2 tabular-nums ${row.firstResponseBreached ? 'text-red-600' : ''}`}>{row.firstResponseBreached}</td>
                    <td className={`px-3 py-2 tabular-nums ${row.resolutionBreached ? 'text-red-600' : ''}`}>{row.resolutionBreached}</td>
                    <td className="px-3 py-2 tabular-nums">{row.satisfaction === null ? '—' : `${row.satisfaction} / 5 (${row.rated})`}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </MainLayout>
  )
}
