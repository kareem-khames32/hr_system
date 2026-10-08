'use client'

// B6.6: «المساعد» — مساعد القراءة: الموظف بيسأل والرد من نفس بيانات شاشاته (بهويته وصلاحياته ونطاقه). كل سؤال بيتسجّل.
// B6.7: مساعد التنفيذ — المساعد بيجهّز معاينة (مكافأة، طلب إجازة) ومفيش حاجة بتتنفّذ غير لما المستخدم يضغط «تأكيد».
// موديول ai وميزتي ai.read_assistant وai.action_assistant (مقفولين افتراضيًا).
import { useEffect, useState } from 'react'
import { Sparkles } from 'lucide-react'
import { MainLayout } from '@/components/layout'
import { apiFetch } from '@/lib/api'

interface AssistantStatus { available: boolean; actions?: boolean; limits: { questionMin: number; questionMax: number }; tools: Array<{ name: string; label: string }> }
interface Suggestion {
  id: number; kind: string; title: string; expiresAt: string; total: string | null; notice: string | null
  details: Array<{ label: string; value: string }>
  rows: Array<{ name: string; code: string | null; amount: string | null; ready: boolean; note: string | null; chain: string[] }>
}
interface AssistantAnswer { id: number; answer: string; sources: Array<{ name: string; label: string }>; suggestion?: Suggestion | null }
interface Turn { question: string; answer?: AssistantAnswer; error?: string; decision?: 'confirmed' | 'dismissed'; decisionError?: string; outcome?: string }

const SAMPLES = ['رصيدي كام؟', 'آخر قسيمة راتب ليا صافيها كام؟', 'إيه سياسات الشركة السارية؟', 'فيه طلبات مستنية موافقتي؟']
const outcomeOf = (result: Record<string, unknown>) => result.kind === 'BONUS_BULK'
  ? `اتسجّلت ${result.created} مكافأة (دفعة رقم ${result.batchId}) بإجمالي ${result.totalAmount}.`
  : `اتبعت الطلب رقم ${result.requestId} ودخل سلسلة اعتماده.`

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

  const patchTurn = (index: number, change: Partial<Turn>) => setTurns((list) => list.map((turn, at) => (at === index ? { ...turn, ...change } : turn)))

  async function decide(index: number, suggestion: Suggestion, confirm: boolean) {
    if (busy) return
    setBusy(true)
    try {
      if (confirm) {
        const done = await apiFetch<{ result: Record<string, unknown> }>(`/ai/actions/${suggestion.id}/confirm`, { method: 'POST' })
        patchTurn(index, { decision: 'confirmed', outcome: outcomeOf(done.result), decisionError: undefined })
      } else {
        await apiFetch(`/ai/actions/${suggestion.id}/dismiss`, { method: 'POST' })
        patchTurn(index, { decision: 'dismissed', decisionError: undefined })
      }
    } catch (cause) {
      // رفض الخادم (صلاحية، سقف، معاينة اتغيّرت أو قدمت): الاقتراح اتقفل — يتطلب من جديد
      patchTurn(index, { decision: 'dismissed', decisionError: cause instanceof Error ? cause.message : 'تعذر التنفيذ' })
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
          <p className="text-gray-500 mt-1">اسأل عن رصيدك وطلباتك وحضورك وقسيمتك وسياسات الشركة. الرد من بياناتك اللي بتشوفها في شاشاتك، والمساعد مابياخدش قرار.</p>
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
                  {turn.answer?.suggestion && (
                    <div className="card space-y-3 border border-primary-200" data-assistant-suggestion>
                      <div className="flex flex-wrap items-center justify-between gap-2">
                        <h2 className="text-lg font-semibold text-gray-800">{turn.answer.suggestion.title}</h2>
                        <span className="rounded-full bg-amber-100 text-amber-800 text-xs px-2 py-1">معاينة — لسه مااتنفّذش</span>
                      </div>
                      <dl className="grid grid-cols-1 sm:grid-cols-2 gap-x-6 gap-y-1 text-sm">
                        {turn.answer.suggestion.details.map((detail) => (
                          <div key={detail.label} className="flex gap-2"><dt className="text-gray-500">{detail.label}:</dt><dd className="text-gray-800">{detail.value}</dd></div>
                        ))}
                      </dl>
                      {turn.answer.suggestion.rows.length > 0 && (
                        <div className="overflow-x-auto">
                          <table className="w-full text-sm">
                            <thead><tr className="text-gray-500 border-b"><th className="text-start py-1">الموظف</th><th className="text-start py-1">المبلغ</th><th className="text-start py-1">سلسلة الاعتماد</th></tr></thead>
                            <tbody>
                              {turn.answer.suggestion.rows.map((row, at) => (
                                <tr key={at} className="border-b last:border-0">
                                  <td className="py-1">{row.name}{row.code ? <span className="text-gray-400 ms-1">({row.code})</span> : null}</td>
                                  <td className="py-1">{row.ready ? row.amount : <span className="text-amber-700">{row.note ?? 'مش هيتبعت'}</span>}</td>
                                  <td className="py-1 text-gray-600">{row.chain.join(' ← ')}</td>
                                </tr>
                              ))}
                            </tbody>
                          </table>
                        </div>
                      )}
                      {turn.answer.suggestion.total && <p className="font-semibold text-gray-800">الإجمالي: {turn.answer.suggestion.total}</p>}
                      {turn.answer.suggestion.notice && <p className="text-sm text-amber-800 bg-amber-50 rounded-lg p-2">{turn.answer.suggestion.notice}</p>}
                      {turn.decisionError && <div role="alert" className="bg-red-50 text-red-700 rounded-lg p-2 text-sm">{turn.decisionError} — اطلب المعاينة من المساعد تاني.</div>}
                      {turn.decision === 'confirmed' && <div role="status" className="bg-green-50 text-green-700 rounded-lg p-2 text-sm">{turn.outcome}</div>}
                      {turn.decision === 'dismissed' && !turn.decisionError && <div role="status" className="text-sm text-gray-500">اتلغى من غير تنفيذ.</div>}
                      {!turn.decision && (
                        <div className="flex flex-wrap gap-2">
                          <button type="button" className="btn-primary" data-assistant-confirm disabled={busy} onClick={() => decide(index, turn.answer!.suggestion!, true)}>تأكيد وتنفيذ</button>
                          <button type="button" className="btn-secondary" disabled={busy} onClick={() => decide(index, turn.answer!.suggestion!, false)}>إلغاء</button>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              ))}
              {busy && <div className="card text-gray-500" role="status">لحظة…</div>}
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
                <input className="input w-full" value={question} maxLength={status.limits.questionMax} onChange={(event) => setQuestion(event.target.value)}
                  placeholder={status.actions ? 'مثال: اعمل مكافأة 500 لفريق الإنتاج' : 'مثال: رصيدي كام؟'} />
              </label>
              <button type="submit" className="btn-primary" disabled={busy || question.trim().length < status.limits.questionMin}>اسأل</button>
            </form>
            <p className="text-xs text-gray-400">كل سؤال بيتسجّل في سجل استخدام المساعد. الأرقام من النظام مش من تقدير المساعد؛ لو فيه اختلاف فالشاشة هي المرجع.{status.actions ? ' أي طلب بيجهّزه المساعد مابيتنفّذش غير بعد تأكيدك.' : ''}</p>
          </>
        )}
      </div>
    </MainLayout>
  )
}
