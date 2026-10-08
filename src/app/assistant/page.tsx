'use client'

// B6.6: «المساعد» — مساعد القراءة: الموظف بيسأل والرد من نفس بيانات شاشاته (بهويته وصلاحياته ونطاقه). للقراءة بس، وكل سؤال بيتسجّل.
// موديول ai وميزة ai.read_assistant (مقفولين افتراضيًا).
import { useEffect, useState } from 'react'
import { Sparkles } from 'lucide-react'
import { MainLayout } from '@/components/layout'
import { apiFetch } from '@/lib/api'

interface AssistantStatus { available: boolean; limits: { questionMin: number; questionMax: number }; tools: Array<{ name: string; label: string }> }
interface AssistantAnswer { id: number; answer: string; sources: Array<{ name: string; label: string }> }
interface Turn { question: string; answer?: AssistantAnswer; error?: string }

const SAMPLES = ['رصيدي كام؟', 'آخر قسيمة راتب ليا صافيها كام؟', 'إيه سياسات الشركة السارية؟', 'فيه طلبات مستنية موافقتي؟']

export default function AssistantPage() {
  const [status, setStatus] = useState<AssistantStatus | null>(null)
  const [error, setError] = useState('')
  const [question, setQuestion] = useState('')
  const [busy, setBusy] = useState(false)
  const [turns, setTurns] = useState<Turn[]>([])

  useEffect(() => {
    apiFetch<AssistantStatus>('/ai/status').then(setStatus).catch((cause) => setError(cause instanceof Error ? cause.message : 'تعذر تحميل المساعد'))
  }, [])

  async function ask(text: string) {
    const asked = text.trim()
    if (busy || asked.length < (status?.limits.questionMin ?? 2)) return
    setBusy(true); setError(''); setQuestion('')
    try {
      const answer = await apiFetch<AssistantAnswer>('/ai/ask', { method: 'POST', body: JSON.stringify({ question: asked }) })
      setTurns((list) => [...list, { question: asked, answer }])
    } catch (cause) {
      setTurns((list) => [...list, { question: asked, error: cause instanceof Error ? cause.message : 'تعذر الوصول للمساعد' }])
    } finally { setBusy(false) }
  }

  return (
    <MainLayout>
      <div className="space-y-6 max-w-3xl">
        <div>
          <h1 className="text-2xl font-bold text-gray-800 flex items-center gap-2">
            <Sparkles size={24} className="text-primary-600" />
            المساعد
          </h1>
          <p className="text-gray-500 mt-1">اسأل عن رصيدك وطلباتك وحضورك وقسيمتك وسياسات الشركة. الرد من بياناتك اللي بتشوفها في شاشاتك، والمساعد للقراءة بس ومابياخدش قرار.</p>
        </div>

        {error && <div role="alert" className="bg-red-50 text-red-700 rounded-xl p-4">{error}</div>}
        {status && !status.available && <div className="card text-amber-800 bg-amber-50" data-assistant-unavailable>المساعد مش متاح دلوقتي — مزوّد النموذج مش مضبوط على الخادم.</div>}

        {status?.available && (
          <>
            <div className="space-y-3" data-assistant-thread>
              {turns.map((turn, index) => (
                <div key={index} className="space-y-2">
                  <div className="card bg-primary-50 text-gray-800 text-start">{turn.question}</div>
                  {turn.error && <div role="alert" className="card bg-red-50 text-red-700">{turn.error}</div>}
                  {turn.answer && (
                    <div className="card space-y-2" data-assistant-answer>
                      <p className="text-gray-800 whitespace-pre-wrap">{turn.answer.answer}</p>
                      {turn.answer.sources.length > 0 && (
                        <div className="flex flex-wrap items-center gap-2 text-xs text-gray-500">
                          <span>المصدر:</span>
                          {turn.answer.sources.map((source) => <span key={source.name} className="rounded-full bg-gray-100 px-2 py-1">{source.label}</span>)}
                        </div>
                      )}
                    </div>
                  )}
                </div>
              ))}
              {busy && <div className="card text-gray-500" role="status">بيدوّر على الإجابة…</div>}
            </div>

            {turns.length === 0 && (
              <div className="flex flex-wrap gap-2">
                {SAMPLES.map((sample) => (
                  <button key={sample} type="button" className="rounded-full border border-gray-200 px-3 py-1.5 text-sm text-gray-700 hover:bg-gray-50" disabled={busy} onClick={() => ask(sample)}>{sample}</button>
                ))}
              </div>
            )}

            <form className="card flex flex-wrap items-end gap-3" data-assistant-form onSubmit={(event) => { event.preventDefault(); void ask(question) }}>
              <label className="flex-1 min-w-[16rem]">
                <span className="block text-sm text-gray-600 mb-1">سؤالك</span>
                <input className="input w-full" value={question} maxLength={status.limits.questionMax} onChange={(event) => setQuestion(event.target.value)} placeholder="مثال: رصيدي كام؟" />
              </label>
              <button type="submit" className="btn-primary" disabled={busy || question.trim().length < status.limits.questionMin}>اسأل</button>
            </form>
            <p className="text-xs text-gray-400">كل سؤال بيتسجّل في سجل استخدام المساعد. الأرقام من النظام مش من تقدير المساعد؛ لو فيه اختلاف فالشاشة هي المرجع.</p>
          </>
        )}
      </div>
    </MainLayout>
  )
}
