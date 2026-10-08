'use client'

// B3.4-ب: «مقابلاتي» — المقابلات اللي الموظف محاور فيها، وبطاقة تقييمه (بتتسلّم مرة واحدة؛ وبطاقات الزملاء بتظهر بعد ما يسلّم بطاقته)
import { useCallback, useEffect, useState } from 'react'
import { ClipboardCheck, Star, X } from 'lucide-react'
import { MainLayout } from '@/components/layout'
import EmptyState from '@/components/EmptyState'
import { fetchFileObjectUrl } from '@/lib/api'
import {
  RECOMMENDATION_LABELS, fetchMyInterviews, interviewWhen, submitScorecard, type ApiInterview, type ApiInterviewsList, type InterviewRecommendation,
} from '@/lib/interviews-api'

export default function MyInterviewsPage() {
  const [data, setData] = useState<ApiInterviewsList | null>(null)
  const [error, setError] = useState('')
  const [open, setOpen] = useState<ApiInterview | null>(null)

  const load = useCallback(() => {
    setError('')
    fetchMyInterviews()
      .then(setData)
      .catch((cause) => setError(cause instanceof Error ? cause.message : 'تعذر تحميل المقابلات'))
  }, [])
  useEffect(load, [load])

  const openCv = async (fileId: number) => {
    const url = await fetchFileObjectUrl(fileId)
    if (!url) {
      setError('تعذر فتح السيرة الذاتية')
      return
    }
    window.open(url, '_blank', 'noopener')
    setTimeout(() => URL.revokeObjectURL(url), 60000)
  }

  return (
    <MainLayout>
      <div className="space-y-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-800 flex items-center gap-2">
            <ClipboardCheck size={24} className="text-primary-600" />
            مقابلاتي
          </h1>
          <p className="text-gray-500 mt-1">المقابلات اللي إنت محاور فيها — سلّم بطاقتك بعد المقابلة</p>
        </div>
        {error && (
          <div role="alert" className="bg-red-50 text-red-700 rounded-xl p-4">
            {error}
          </div>
        )}
        {data && data.interviews.length === 0 && <EmptyState title="مفيش مقابلات عندك دلوقتي" icon={ClipboardCheck} />}
        {data && data.interviews.length > 0 && (
          <div className="grid gap-4" data-my-interviews>
            {data.interviews.map((interview) => {
              const mine = interview.scorecards.find((card) => card.mine)
              return (
                <div key={interview.id} className="card space-y-3">
                  <div className="flex items-start justify-between gap-3 flex-wrap">
                    <div>
                      <h2 className="text-lg font-bold text-gray-800">{interview.candidateName}</h2>
                      <p className="text-sm text-gray-500 mt-1">
                        {interview.positionTitle ?? '—'} · <span dir="ltr">{interviewWhen(interview.scheduledAt)}</span> · {interview.durationMinutes} دقيقة · {interview.modeLabel}
                        {interview.location ? ` · ${interview.location}` : ''}
                      </p>
                      {interview.notes && <p className="text-sm text-gray-600 mt-1 whitespace-pre-line">{interview.notes}</p>}
                    </div>
                    <div className="flex items-center gap-2 flex-wrap">
                      {interview.cvFileId !== null && (
                        <button onClick={() => openCv(interview.cvFileId as number)} className="btn-secondary text-sm">
                          السيرة الذاتية
                        </button>
                      )}
                      {mine && !mine.submitted && (
                        <button onClick={() => setOpen(interview)} className="btn-primary text-sm">
                          تسليم البطاقة
                        </button>
                      )}
                    </div>
                  </div>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                    {interview.scorecards.map((card, index) => (
                      <div key={index} className="border border-gray-100 rounded-lg p-3 text-sm">
                        <div className="flex items-center justify-between gap-2">
                          <span className="font-medium text-gray-800">{card.mine ? 'بطاقتي' : card.interviewerName ?? 'محاور'}</span>
                          {card.submitted && card.rating !== null ? (
                            <span className="inline-flex items-center gap-1 text-amber-600">
                              <Star size={14} />
                              {card.rating} / 5 · {card.recommendationLabel}
                            </span>
                          ) : (
                            <span className="text-gray-400">{card.submitted ? 'سلّم بطاقته' : 'لسه ماسلّمش'}</span>
                          )}
                        </div>
                        {card.notes && <p className="text-gray-600 mt-2 whitespace-pre-line">{card.notes}</p>}
                      </div>
                    ))}
                  </div>
                </div>
              )
            })}
          </div>
        )}
      </div>
      {open && (
        <ScorecardModal
          interview={open}
          onClose={() => setOpen(null)}
          onDone={() => {
            setOpen(null)
            load()
          }}
        />
      )}
    </MainLayout>
  )
}

function ScorecardModal({ interview, onClose, onDone }: { interview: ApiInterview; onClose: () => void; onDone: () => void }) {
  const [rating, setRating] = useState(0)
  const [recommendation, setRecommendation] = useState<InterviewRecommendation | ''>('')
  const [notes, setNotes] = useState('')
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')
  const valid = rating >= 1 && rating <= 5 && recommendation !== ''

  const submit = async () => {
    if (recommendation === '') return
    setSaving(true)
    setError('')
    try {
      await submitScorecard(interview.id, { rating, recommendation, ...(notes.trim() ? { notes: notes.trim() } : {}) })
      onDone()
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'تعذر تسليم البطاقة')
      setSaving(false)
    }
  }

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50" role="dialog" aria-modal="true" aria-label="بطاقة تقييم المقابلة">
      <div className="bg-white rounded-2xl w-full max-w-lg mx-4 max-h-[90vh] overflow-auto">
        <div className="p-6 border-b border-gray-100 flex items-center justify-between">
          <div>
            <h2 className="text-xl font-bold text-gray-800">بطاقة تقييم المقابلة</h2>
            <p className="text-sm text-gray-500 mt-1">
              {interview.candidateName} · {interview.positionTitle ?? '—'}
            </p>
          </div>
          <button onClick={onClose} className="p-2 hover:bg-gray-100 rounded-lg" aria-label="إغلاق">
            <X size={20} />
          </button>
        </div>
        <div className="p-6 space-y-4">
          {error && (
            <div role="alert" className="bg-red-50 text-red-700 rounded-xl p-3 text-sm">
              {error}
            </div>
          )}
          <div>
            <p className="text-sm text-gray-700 mb-2">التقييم</p>
            <div className="flex items-center gap-2">
              {[1, 2, 3, 4, 5].map((value) => (
                <button
                  key={value}
                  onClick={() => setRating(value)}
                  aria-pressed={rating === value}
                  aria-label={`${value} من 5`}
                  className={`w-10 h-10 rounded-lg border text-sm font-bold ${rating >= value ? 'border-amber-400 bg-amber-50 text-amber-700' : 'border-gray-200 text-gray-500 hover:bg-gray-50'}`}
                >
                  {value}
                </button>
              ))}
            </div>
          </div>
          <div>
            <p className="text-sm text-gray-700 mb-2">التوصية</p>
            <div className="grid grid-cols-3 gap-2">
              {(Object.keys(RECOMMENDATION_LABELS) as InterviewRecommendation[]).map((key) => (
                <button
                  key={key}
                  onClick={() => setRecommendation(key)}
                  aria-pressed={recommendation === key}
                  className={`rounded-xl border p-3 text-sm font-medium ${recommendation === key ? 'border-primary-500 bg-primary-50 text-primary-700' : 'border-gray-200 text-gray-700 hover:bg-gray-50'}`}
                >
                  {RECOMMENDATION_LABELS[key]}
                </button>
              ))}
            </div>
          </div>
          <label className="block text-sm text-gray-700">
            ملاحظات (اختياري)
            <textarea className="input w-full mt-1" rows={4} maxLength={2000} value={notes} onChange={(e) => setNotes(e.target.value)} />
          </label>
          <p className="text-xs text-gray-500">البطاقة بتتسلّم مرة واحدة ومابتتعدّلش، وبعدها بتشوف بطاقات باقي المحاورين اللي سلّموا.</p>
        </div>
        <div className="p-6 border-t border-gray-100 flex justify-end gap-2">
          <button onClick={onClose} className="btn-secondary">
            إلغاء
          </button>
          <button onClick={submit} disabled={!valid || saving} title="التقييم والتوصية مطلوبين" className="btn-primary disabled:opacity-50">
            تسليم البطاقة
          </button>
        </div>
      </div>
    </div>
  )
}
