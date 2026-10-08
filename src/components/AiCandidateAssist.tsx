'use client'

// B6.10: اقتراحات المساعد في شاشة المتقدمين — ملخص السيرة (لملاحظات الملف) وترتيب مقترح لمرشحي الوظيفة.
// اقتراح بس: الحفظ من مسار تعديل المرشح العادي، وقرار المستخدم (استخدمه زي ما هو / غيّره / تجاهله) بيتسجّل. مفيش قبول ولا رفض من المساعد.
import { useEffect, useState } from 'react'
import { Sparkles } from 'lucide-react'
import { apiFetch, updateCandidate, type ApiCandidate } from '@/lib/api'
import { useFeatureEnabled, useModuleEnabled } from '@/lib/modules'

interface CvSuggestion { id: number; label: string; text: string }
interface RankingSuggestion { id: number; label: string; order: Array<{ position: number | null; candidateId: number; fullName: string | null; reason: string | null }> }
const outcome = (id: number, body: { used: boolean; finalText?: string }) => apiFetch(`/ai/assist/${id}/outcome`, { method: 'POST', body: JSON.stringify(body) })

export function AiCandidateAssist({ candidate, onSaved }: { candidate: ApiCandidate; onSaved: () => void }) {
  const ai = useModuleEnabled('ai'), cvOn = useFeatureEnabled('recruitment.ai_cv'), rankingOn = useFeatureEnabled('recruitment.ai_ranking')
  const [cv, setCv] = useState<CvSuggestion | null>(null)
  const [text, setText] = useState('')
  const [ranking, setRanking] = useState<RankingSuggestion | null>(null)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')
  const [info, setInfo] = useState('')

  // مرشح تاني = اقتراحات جديدة
  useEffect(() => { setCv(null); setRanking(null); setText(''); setError(''); setInfo('') }, [candidate.id])

  const canCv = ai && cvOn && !!candidate.application?.cvFileId && candidate.stage !== 'hired'
  const canRank = ai && rankingOn && !!candidate.application?.jobId
  if (!canCv && !canRank) return null

  async function work(action: () => Promise<void>) {
    setBusy(true); setError(''); setInfo('')
    try { await action() } catch (cause) { setError(cause instanceof Error ? cause.message : 'تعذر الوصول للمساعد') } finally { setBusy(false) }
  }
  const askCv = () => work(async () => { const made = await apiFetch<CvSuggestion>(`/ai/assist/cv/${candidate.id}`, { method: 'POST' }); setCv(made); setText(made.text) })
  const saveCv = () => work(async () => {
    if (!cv || !text.trim()) return
    // الحفظ من مسار تعديل المرشح العادي، وبعده بيتسجّل إن الاقتراح اتستخدم (والخادم بيقارن النص)
    await updateCandidate(candidate.id, { notes: text.trim() })
    await outcome(cv.id, { used: true, finalText: text.trim() })
    setCv(null); setInfo('اتحفظ في ملاحظات المرشح.'); onSaved()
  })
  const dropCv = () => work(async () => { if (cv) await outcome(cv.id, { used: false }); setCv(null) })
  const askRanking = () => work(async () => setRanking(await apiFetch<RankingSuggestion>(`/ai/assist/ranking/${candidate.application!.jobId}`, { method: 'POST' })))
  const closeRanking = (used: boolean) => work(async () => { if (ranking) await outcome(ranking.id, { used }); setRanking(null) })

  return (
    <div className="mt-4 space-y-3" data-ai-candidate-assist>
      <div className="flex flex-wrap gap-2">
        {canCv && !cv && <button type="button" className="btn-secondary text-sm inline-flex items-center gap-1" disabled={busy} onClick={askCv}><Sparkles size={14} />ملخص السيرة من المساعد</button>}
        {canRank && !ranking && <button type="button" className="btn-secondary text-sm inline-flex items-center gap-1" disabled={busy} onClick={askRanking}><Sparkles size={14} />ترتيب مقترح لمرشحي الوظيفة</button>}
      </div>
      {error && <div role="alert" className="bg-red-50 text-red-700 rounded-lg p-2 text-sm">{error}</div>}
      {info && <div role="status" className="bg-green-50 text-green-700 rounded-lg p-2 text-sm">{info}</div>}
      {cv && (
        <div className="rounded-lg border border-amber-200 bg-amber-50 p-3 space-y-2" data-ai-suggestion>
          <p className="text-xs font-semibold text-amber-800">{cv.label}</p>
          <textarea className="input w-full text-sm" rows={6} maxLength={4000} value={text} onChange={(event) => setText(event.target.value)} />
          <p className="text-xs text-gray-500">راجع الملخص وعدّله؛ الحفظ بيكتبه مكان ملاحظات المرشح الحالية.</p>
          <div className="flex flex-wrap gap-2">
            <button type="button" className="btn-primary text-sm" disabled={busy || !text.trim()} onClick={saveCv}>احفظه في الملاحظات</button>
            <button type="button" className="btn-secondary text-sm" disabled={busy} onClick={dropCv}>تجاهل</button>
          </div>
        </div>
      )}
      {ranking && (
        <div className="rounded-lg border border-amber-200 bg-amber-50 p-3 space-y-2" data-ai-suggestion>
          <p className="text-xs font-semibold text-amber-800">{ranking.label}</p>
          <ol className="space-y-1 text-sm">
            {ranking.order.map((row) => (
              <li key={row.candidateId} className="flex flex-wrap gap-2">
                <span className="font-semibold text-gray-700">{row.position ?? '—'}</span>
                <span className="text-gray-800">{row.fullName ?? `مرشح #${row.candidateId}`}</span>
                <span className="text-gray-600">{row.reason ?? 'من غير ترتيب (ملاحظاته مش كفاية)'}</span>
              </li>
            ))}
          </ol>
          <p className="text-xs text-gray-500">الترتيب استرشادي من ملاحظات المرشحين بس، ومابيغيّرش مرحلة حد. نقل المرحلة والقبول والرفض قرارك.</p>
          <div className="flex flex-wrap gap-2">
            <button type="button" className="btn-secondary text-sm" disabled={busy} onClick={() => closeRanking(true)}>استفدت منه</button>
            <button type="button" className="btn-secondary text-sm" disabled={busy} onClick={() => closeRanking(false)}>تجاهل</button>
          </div>
        </div>
      )}
    </div>
  )
}
