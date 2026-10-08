'use client'

// B3.13: الرد على استبيان — للموظف المدعو، مرة واحدة. الاستبيان المجهول: الرد مابيتسجّلش باسمك ولا بيتربط بيك، والنتايج مجمّعة.
import { useEffect, useState } from 'react'
import Link from 'next/link'
import { useParams } from 'next/navigation'
import { ClipboardList } from 'lucide-react'
import { MainLayout } from '@/components/layout'
import { formatDate } from '@/lib/dates'
import { fetchSurveyForm, respondToSurvey, type ApiSurveyForm } from '@/lib/surveys-api'

export default function SurveyFormPage() {
  const params = useParams<{ id: string }>()
  const id = Number(params?.id)
  const [form, setForm] = useState<ApiSurveyForm | null>(null)
  const [answers, setAnswers] = useState<Record<string, number | string>>({})
  const [error, setError] = useState('')
  const [done, setDone] = useState(false)
  const [busy, setBusy] = useState(false)

  useEffect(() => {
    if (!Number.isSafeInteger(id) || id < 1) {
      setError('الاستبيان غير موجود')
      return
    }
    fetchSurveyForm(id).then(setForm).catch((cause) => setError(cause instanceof Error ? cause.message : 'تعذر تحميل الاستبيان'))
  }, [id])

  const set = (key: string, value: number | string) => setAnswers((prev) => ({ ...prev, [key]: value }))
  const complete = !!form && form.questions.every((question) => !question.required || (answers[question.key] !== undefined && answers[question.key] !== ''))
  const send = async () => {
    setBusy(true)
    setError('')
    try {
      // الفاضي مابيتبعتش (سؤال اختياري من غير إجابة)
      await respondToSurvey(id, Object.fromEntries(Object.entries(answers).filter(([, value]) => value !== '')))
      setDone(true)
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'تعذر إرسال الرد')
    } finally {
      setBusy(false)
    }
  }
  const scale = (key: string, min: number, max: number) => (
    <div className="flex items-center gap-1 flex-wrap">
      {Array.from({ length: max - min + 1 }, (_, index) => min + index).map((value) => (
        <button key={value} onClick={() => set(key, value)} aria-pressed={answers[key] === value}
          className={`w-9 h-9 rounded-full text-sm ${answers[key] === value ? 'bg-primary-600 text-white' : 'bg-gray-100 text-gray-700 hover:bg-gray-200'}`}>
          {value}
        </button>
      ))}
    </div>
  )

  return (
    <MainLayout>
      <div className="space-y-6 max-w-2xl">
        <div>
          <Link href="/surveys" className="text-sm text-primary-600 hover:underline">
            ← الاستبيانات
          </Link>
          <h1 className="text-2xl font-bold text-gray-800 flex items-center gap-2 mt-2">
            <ClipboardList size={24} className="text-primary-600" />
            {form ? form.title : 'استبيان'}
          </h1>
          {form && (
            <p className="text-gray-500 mt-1">
              {form.kindLabel}
              {form.closeDate ? ` · آخر يوم للرد ${formatDate(form.closeDate)}` : ''}
            </p>
          )}
        </div>
        {error && (
          <div role="alert" className="bg-red-50 text-red-700 rounded-xl p-4">
            {error}
          </div>
        )}
        {form?.isAnonymous && !done && !form.answered && (
          <div role="status" className="bg-blue-50 text-blue-800 rounded-xl p-4 text-sm">
            الاستبيان ده مجهول: ردّك مابيتسجّلش باسمك ولا بيتربط بحسابك، والنتايج بتتعرض مجمّعة لما الردود توصل {form.minGroup} على الأقل.
          </div>
        )}
        {(done || form?.answered) && (
          <div role="status" className="bg-green-50 text-green-800 rounded-xl p-4">
            ردّك اتسجّل — شكرًا.
          </div>
        )}
        {form && !form.open && !form.answered && !done && (
          <div role="status" className="bg-amber-50 text-amber-800 rounded-xl p-4">
            الاستبيان مابقاش مفتوح للرد.
          </div>
        )}
        {form && form.open && !form.answered && !done && (
          <div className="space-y-4" data-survey-form>
            {form.questions.map((question, index) => (
              <div key={question.key} className="card space-y-3">
                <p className="font-medium text-gray-800">
                  {index + 1}. {question.label}
                  {!question.required && <span className="text-xs text-gray-400"> · اختياري</span>}
                </p>
                {question.type === 'rating' && scale(question.key, 1, 5)}
                {question.type === 'enps' && scale(question.key, 0, 10)}
                {question.type === 'choice' && (
                  <div className="flex flex-wrap gap-2">
                    {(question.options ?? []).map((option) => (
                      <button key={option} onClick={() => set(question.key, option)} aria-pressed={answers[question.key] === option}
                        className={`px-3 py-1 rounded-full text-sm ${answers[question.key] === option ? 'bg-primary-600 text-white' : 'bg-gray-100 text-gray-700 hover:bg-gray-200'}`}>
                        {option}
                      </button>
                    ))}
                  </div>
                )}
                {question.type === 'text' && (
                  <textarea className="input w-full text-sm" rows={3} maxLength={2000} value={String(answers[question.key] ?? '')} onChange={(e) => set(question.key, e.target.value)} />
                )}
              </div>
            ))}
            <button onClick={send} disabled={busy || !complete} className="btn-primary disabled:opacity-50">
              إرسال الرد
            </button>
          </div>
        )}
      </div>
    </MainLayout>
  )
}
