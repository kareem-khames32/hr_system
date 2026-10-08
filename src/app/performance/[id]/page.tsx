'use client'

// B3.7: نموذج التقييم — الأقسام الموزونة (أهداف الفترة، وبنود التقدير والنص) ولوحة الأدلة من النظام جنبها. تسليم مرة واحدة؛ والنتيجة للموظف بعد
// الإعلان، وبيقرّ بيها بتعليق. (كانت شاشة عرض ببيانات وهمية؛ بقت على الخادم.)
import { useEffect, useState } from 'react'
import Link from 'next/link'
import { useParams } from 'next/navigation'
import { ClipboardCheck } from 'lucide-react'
import { MainLayout } from '@/components/layout'
import { formatDate } from '@/lib/dates'
import { acknowledgeReview, fetchReviewForm, submitReview, type ApiReviewForm, type ReviewAnswers, type ReviewEvidence, type ReviewResponseView } from '@/lib/reviews-api'

const STATUS_WORDS: Record<string, string> = { present: 'حاضر', late: 'متأخر', absent: 'غايب', early_leave: 'انصراف مبكر', leave: 'إجازة', partial_leave: 'إجازة جزئية', holiday: 'عطلة',
  missing_punch: 'بصمة ناقصة', mission: 'مأمورية', remote: 'عن بُعد', exempt: 'معفي' }

export default function ReviewFormPage() {
  const params = useParams<{ id: string }>()
  const id = Number(params?.id)
  const [form, setForm] = useState<ApiReviewForm | null>(null)
  const [error, setError] = useState('')
  const [answers, setAnswers] = useState<ReviewAnswers>({ sections: {}, goals: {} })
  const [comment, setComment] = useState('')
  const [ack, setAck] = useState('')
  const [busy, setBusy] = useState(false)

  useEffect(() => {
    if (!Number.isSafeInteger(id) || id < 1) {
      setError('التقييم غير موجود')
      return
    }
    fetchReviewForm(id).then(setForm).catch((cause) => setError(cause instanceof Error ? cause.message : 'تعذر تحميل التقييم'))
  }, [id])

  const setItem = (section: string, item: string, value: { rating?: number; text?: string }) =>
    setAnswers((prev) => ({ ...prev, sections: { ...prev.sections, [section]: { ...(prev.sections[section] ?? {}), [item]: value } } }))
  const setGoal = (goalId: number, value: { rating?: number; comment?: string }) =>
    setAnswers((prev) => ({ ...prev, goals: { ...prev.goals, [goalId]: { ...(prev.goals[goalId] ?? { rating: 0 }), ...value } } }))

  // كل بند مطلوب اتجاوب، وكل هدف اتقدّر (نفس حكم الخادم)
  const complete = !!form && form.template.sections.every((section) =>
    section.kind === 'GOALS'
      ? form.goals.every((goal) => (answers.goals[goal.id]?.rating ?? 0) >= 1)
      : section.items.every((item) => !item.required || (item.type === 'rating' ? (answers.sections[section.key]?.[item.key]?.rating ?? 0) >= 1 : (answers.sections[section.key]?.[item.key]?.text ?? '').trim() !== '')))

  const run = async (work: () => Promise<ApiReviewForm>) => {
    setBusy(true)
    setError('')
    try {
      setForm(await work())
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'تعذر تنفيذ الإجراء')
    } finally {
      setBusy(false)
    }
  }
  const submit = () => {
    // الفاضي مابيتبعتش (بند اختياري من غير إجابة)
    const sections: ReviewAnswers['sections'] = {}
    for (const [sectionKey, items] of Object.entries(answers.sections)) {
      for (const [itemKey, value] of Object.entries(items)) {
        if ((value.rating ?? 0) >= 1 || (value.text ?? '').trim() !== '') (sections[sectionKey] ??= {})[itemKey] = value.rating ? { rating: value.rating } : { text: (value.text ?? '').trim() }
      }
    }
    const goals: ReviewAnswers['goals'] = {}
    for (const [goalId, value] of Object.entries(answers.goals)) goals[goalId] = { rating: value.rating, ...(value.comment?.trim() ? { comment: value.comment.trim() } : {}) }
    void run(() => submitReview(id, { sections, goals }, comment.trim() || undefined))
  }

  const scale = form ? Array.from({ length: form.template.ratingMax }, (_, index) => index + 1) : []
  const Rating = ({ value, onPick }: { value: number; onPick: (rating: number) => void }) => (
    <div className="flex items-center gap-1 flex-wrap">
      {scale.map((rating) => (
        <button
          key={rating}
          onClick={() => onPick(rating)}
          aria-pressed={value === rating}
          aria-label={`${rating} من ${form?.template.ratingMax}`}
          className={`w-9 h-9 rounded-lg border text-sm font-bold ${value === rating ? 'border-primary-500 bg-primary-600 text-white' : 'border-gray-200 text-gray-600 hover:bg-gray-50'}`}
        >
          {rating}
        </button>
      ))}
    </div>
  )

  return (
    <MainLayout>
      <div className="space-y-6">
        <div>
          <p className="text-sm text-gray-500">
            <Link href="/performance" className="text-primary-600 hover:underline">
              التقييمات
            </Link>
          </p>
          <h1 className="text-2xl font-bold text-gray-800 flex items-center gap-2 mt-1">
            <ClipboardCheck size={24} className="text-primary-600" />
            {form ? `${form.relation === 'self' ? 'تقييمي' : form.employeeName ?? 'تقييم'} — ${form.cycleName}` : 'تقييم الأداء'}
          </h1>
          {form && (
            <p className="text-gray-500 mt-1">
              {form.kindLabel} · {formatDate(form.periodStart)} – {formatDate(form.periodEnd)} · {form.statusLabel}
            </p>
          )}
        </div>
        {error && (
          <div role="alert" className="bg-red-50 text-red-700 rounded-xl p-4">
            {error}
          </div>
        )}
        {form && (
          <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">
            <div className="xl:col-span-2 space-y-4">
              {form.finalScore !== null && (
                <div className="card flex items-center justify-between gap-3 flex-wrap">
                  <div>
                    <p className="text-sm text-gray-500">الدرجة النهائية</p>
                    <p className="text-3xl font-bold text-gray-800 tabular-nums">{form.finalScore} / 100</p>
                  </div>
                  {form.selfScore !== null && <p className="text-sm text-gray-500 tabular-nums">التقييم الذاتي: {form.selfScore} / 100</p>}
                </div>
              )}
              {form.canAcknowledge && (
                <div className="bg-purple-50 rounded-xl p-4 space-y-3" data-acknowledge>
                  <p className="text-sm font-medium text-purple-900">نتيجتك اتعلنت. أقرّ إنك اطلعت عليها (الإقرار مش موافقة — الاعتراض له مساره).</p>
                  <textarea className="input w-full text-sm" rows={2} maxLength={2000} placeholder="تعليقك (اختياري)" value={ack} onChange={(e) => setAck(e.target.value)} />
                  <button onClick={() => run(() => acknowledgeReview(id, ack.trim() || undefined))} disabled={busy} className="btn-primary text-sm disabled:opacity-50">
                    أقرّ بالاطلاع
                  </button>
                </div>
              )}
              {form.acknowledgement && (
                <p className="text-sm text-gray-600">
                  الموظف أقرّ بالاطلاع يوم {formatDate(form.acknowledgement.at)}
                  {form.acknowledgement.comment ? ` — «${form.acknowledgement.comment}»` : ''}
                </p>
              )}
              {form.canSubmit ? (
                <>
                  {form.template.sections.map((section) => (
                    <div key={section.key} className="card space-y-4">
                      <div className="flex items-center justify-between gap-2">
                        <h2 className="text-lg font-bold text-gray-800">{section.title}</h2>
                        <span className="text-xs text-gray-500">الوزن {section.weight}%</span>
                      </div>
                      {section.kind === 'GOALS' && form.goals.length === 0 && <p className="text-sm text-gray-500">مفيش أهداف سارية في فترة الدورة — القسم ده مش هيدخل في الدرجة.</p>}
                      {section.kind === 'GOALS' &&
                        form.goals.map((goal) => (
                          <div key={goal.id} className="space-y-2">
                            <p className="text-sm text-gray-800">
                              {goal.title} <span className="text-xs text-gray-500">· وزن {goal.weight}%{goal.targetValue !== null ? ` · ${goal.actualValue ?? '0.00'} من ${goal.targetValue} ${goal.unit ?? ''}` : ''}</span>
                            </p>
                            <Rating value={answers.goals[goal.id]?.rating ?? 0} onPick={(rating) => setGoal(goal.id, { rating })} />
                            <input className="input w-full text-sm" maxLength={2000} placeholder="تعليق على الهدف (اختياري)" value={answers.goals[goal.id]?.comment ?? ''} onChange={(e) => setGoal(goal.id, { comment: e.target.value })} />
                          </div>
                        ))}
                      {section.items.map((item) => (
                        <div key={item.key} className="space-y-2">
                          <p className="text-sm text-gray-800">
                            {item.label}
                            {item.required ? '' : <span className="text-xs text-gray-400"> (اختياري)</span>}
                          </p>
                          {item.type === 'rating' ? (
                            <Rating value={answers.sections[section.key]?.[item.key]?.rating ?? 0} onPick={(rating) => setItem(section.key, item.key, { rating })} />
                          ) : (
                            <textarea className="input w-full text-sm" rows={2} maxLength={2000} value={answers.sections[section.key]?.[item.key]?.text ?? ''} onChange={(e) => setItem(section.key, item.key, { text: e.target.value })} />
                          )}
                        </div>
                      ))}
                    </div>
                  ))}
                  <div className="card space-y-3">
                    <label className="block text-sm text-gray-700">
                      تعليق عام (اختياري)
                      <textarea className="input w-full mt-1" rows={3} maxLength={2000} value={comment} onChange={(e) => setComment(e.target.value)} />
                    </label>
                    <p className="text-xs text-gray-500">التقييم بيتسلّم مرة واحدة ومابيتعدّلش، ولوحة الأدلة بتتحفظ معاه زي ما هي دلوقتي.</p>
                    <div className="flex justify-end">
                      <button onClick={submit} disabled={!complete || busy} title="كل بند مطلوب لازم يتجاوب، وكل هدف يتقدّر" className="btn-primary disabled:opacity-50">
                        {form.relation === 'self' ? 'تسليم تقييمي الذاتي' : 'تسليم التقييم'}
                      </button>
                    </div>
                  </div>
                </>
              ) : (
                !form.self && !form.manager && <div className="card text-sm text-gray-600">مفيش تقييم مسلّم تقدر تشوفه دلوقتي.</div>
              )}
              {form.self && <ResponseCard title={form.relation === 'self' ? 'تقييمي الذاتي' : 'التقييم الذاتي للموظف'} response={form.self} form={form} />}
              {form.manager && <ResponseCard title="تقييم المدير" response={form.manager} form={form} />}
            </div>
            <EvidencePanel evidence={form.evidence} />
          </div>
        )}
      </div>
    </MainLayout>
  )
}

function ResponseCard({ title, response, form }: { title: string; response: ReviewResponseView; form: ApiReviewForm }) {
  return (
    <div className="card space-y-3" data-response>
      <div className="flex items-center justify-between gap-2">
        <h2 className="text-lg font-bold text-gray-800">{title}</h2>
        <span className="text-sm text-gray-700 tabular-nums">{response.score !== null ? `${response.score} / 100` : 'من غير درجة'}</span>
      </div>
      {form.template.sections.map((section) => (
        <div key={section.key}>
          <p className="text-sm font-medium text-gray-700">{section.title}</p>
          <ul className="mt-1 space-y-1 text-sm text-gray-600">
            {section.kind === 'GOALS' &&
              (response.evidence?.goals ?? form.goals).filter((goal) => response.answers.goals[goal.id]).map((goal) => (
                <li key={goal.id}>
                  {goal.title}: <span className="tabular-nums font-medium text-gray-800">{response.answers.goals[goal.id].rating} / {form.template.ratingMax}</span>
                  {response.answers.goals[goal.id].comment ? ` — ${response.answers.goals[goal.id].comment}` : ''}
                </li>
              ))}
            {section.items.map((item) => {
              const answer = response.answers.sections[section.key]?.[item.key]
              return answer ? (
                <li key={item.key}>
                  {item.label}: {answer.rating !== undefined ? <span className="tabular-nums font-medium text-gray-800">{answer.rating} / {form.template.ratingMax}</span> : <span className="whitespace-pre-line">{answer.text}</span>}
                </li>
              ) : null
            })}
          </ul>
        </div>
      ))}
      {response.comment && <p className="text-sm text-gray-700 whitespace-pre-line border-t border-gray-100 pt-3">{response.comment}</p>}
      <p className="text-xs text-gray-400">اتسلّم يوم {formatDate(response.submittedAt)}</p>
    </div>
  )
}

function EvidencePanel({ evidence }: { evidence: ReviewEvidence }) {
  return (
    <aside className="card space-y-4 h-fit" data-evidence>
      <div>
        <h2 className="text-lg font-bold text-gray-800">أدلة من النظام</h2>
        <p className="text-xs text-gray-500 mt-1">
          للفترة {formatDate(evidence.period.from)} – {formatDate(evidence.period.to)} · للقراءة بس
        </p>
      </div>
      <div>
        <p className="text-sm font-medium text-gray-700">الحضور</p>
        <ul className="mt-1 text-sm text-gray-600 space-y-1 tabular-nums">
          <li>أيام مسجّلة: {evidence.attendance.days}</li>
          {Object.entries(evidence.attendance.byStatus).map(([status, count]) => (
            <li key={status}>
              {STATUS_WORDS[status] ?? status}: {count}
            </li>
          ))}
          <li>
            أيام تأخير: {evidence.attendance.lateDays} ({evidence.attendance.lateMinutes} دقيقة)
          </li>
        </ul>
      </div>
      <div>
        <p className="text-sm font-medium text-gray-700">المهام اللي ميعادها في الفترة</p>
        <ul className="mt-1 text-sm text-gray-600 space-y-1 tabular-nums">
          <li>الكل: {evidence.tasks.total}</li>
          <li>خلصت: {evidence.tasks.done}</li>
          <li>متأخرة: {evidence.tasks.overdue}</li>
        </ul>
      </div>
      <div>
        <p className="text-sm font-medium text-gray-700">الأهداف</p>
        {evidence.goals.length === 0 ? (
          <p className="mt-1 text-sm text-gray-500">مفيش أهداف في الفترة.</p>
        ) : (
          <ul className="mt-1 text-sm text-gray-600 space-y-1">
            {evidence.goals.map((goal) => (
              <li key={goal.id}>
                {goal.title}
                <span className="text-xs text-gray-500 tabular-nums">
                  {' '}
                  · وزن {goal.weight}%{goal.targetValue !== null ? ` · ${goal.actualValue ?? '0.00'} من ${goal.targetValue} ${goal.unit ?? ''}` : ''}
                </span>
              </li>
            ))}
          </ul>
        )}
      </div>
    </aside>
  )
}
