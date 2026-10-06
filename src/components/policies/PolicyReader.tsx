'use client'

// B2.7-أ: قراءة نسخة سياسة (نص أو ملف PDF) والإقرار بيها. مستعملة في شاشة الإقرار عند الدخول وفي «سياساتي».
// الإقرار بيتبعت ببصمة النسخة اللي اتعرضت هنا بالظبط، وزرار الإقرار مابيظهرش غير بعد ما المحتوى يتعرض فعلًا: ملف ماتحمّلش أو ماتعرضش
// = من غير إقرار. ولو النسخة مابقتش السارية (نسخة جديدة اتنشرت، أو السياسة اتسحبت) أو الجلسة خلصت، الشاشة اللي فوق بتتحمّل تاني.
import { useCallback, useEffect, useRef, useState } from 'react'
import { CheckCircle2, FileText, RefreshCw } from 'lucide-react'
import PdfPreview from '@/components/PdfPreview'
import { ApiError } from '@/lib/api'
import { formatDate, formatDateTime } from '@/lib/dates'
import { acknowledgePolicy, fetchPolicyFileUrl, fetchPolicyVersion, POLICY_ACK_STATEMENT, type ApiPolicyContent } from '@/lib/policies-api'

export default function PolicyReader({ versionId, canAcknowledge, acknowledgedAt, onAcknowledged, onStale }: {
  versionId: number
  /** الموظف لسه مااقرّش بالنسخة دي: زرار الإقرار ظاهر */
  canAcknowledge: boolean
  /** وقت إقراره لو أقرّ */
  acknowledgedAt?: string | null
  onAcknowledged?: () => void
  /** النسخة مابقتش السارية أو مابقتش عليه: اللي فوق يحمّل قايمته تاني */
  onStale?: () => void
}) {
  const [content, setContent] = useState<ApiPolicyContent | null>(null)
  const [fileUrl, setFileUrl] = useState<string | null>(null)
  // الملف: لسه بيتحمّل، اتعرض، أو اتعذّر (تحميلًا أو عرضًا)
  const [fileState, setFileState] = useState<'loading' | 'rendered' | 'failed'>('loading')
  const [error, setError] = useState('')
  const [agreed, setAgreed] = useState(false)
  const [saving, setSaving] = useState(false)
  const [attempt, setAttempt] = useState(0)
  const stale = useRef(onStale)
  stale.current = onStale
  // النسخة مابقتش السارية أو مابقتش عليه (404/409)، أو الجلسة خلصت (401): اللي فوق يحمّل قايمته تاني (وهو اللي بيحوّل للدخول)
  const gone = useCallback((cause: unknown) => { if (cause instanceof ApiError && [401, 404, 409].includes(cause.status)) stale.current?.() }, [])

  const load = useCallback(async (isCurrent: () => boolean) => {
    setContent(null); setFileUrl(null); setFileState('loading'); setAgreed(false); setError('')
    let loaded: ApiPolicyContent
    try {
      loaded = await fetchPolicyVersion(versionId)
    } catch (cause) {
      if (isCurrent()) { setError(cause instanceof Error ? cause.message : 'تعذر تحميل السياسة'); gone(cause) }
      return
    }
    if (!isCurrent()) return
    setContent(loaded)
    if (loaded.kind !== 'FILE') return
    try {
      const url = await fetchPolicyFileUrl(versionId)
      if (!isCurrent()) { URL.revokeObjectURL(url); return }
      setFileUrl(url)
    } catch (cause) {
      if (isCurrent()) { setFileState('failed'); setError(cause instanceof Error ? cause.message : 'تعذر تحميل ملف السياسة') }
    }
  }, [versionId, gone])

  useEffect(() => {
    let current = true
    void load(() => current)
    return () => { current = false }
  }, [load, attempt])
  // رابط الملف المحلي بيتلغي لما يتبدّل أو الشاشة تتقفل
  useEffect(() => () => { if (fileUrl) URL.revokeObjectURL(fileUrl) }, [fileUrl])

  // المحتوى اتعرض فعلًا: النص دايمًا، والملف بعد ما أول صفحة تترسم
  const shown = !!content && (content.kind === 'TEXT' || fileState === 'rendered')
  const acknowledge = async () => {
    if (!content || !shown || !agreed || saving) return
    setSaving(true); setError('')
    try {
      await acknowledgePolicy(content.versionId, content.contentHash)
      onAcknowledged?.()
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'تعذر تسجيل الإقرار')
      gone(cause)
    } finally { setSaving(false) }
  }
  const retry = <button type="button" onClick={() => setAttempt(value => value + 1)} className="inline-flex items-center gap-1 underline"><RefreshCw size={14} />حاول تاني</button>

  if (!content) {
    return error
      ? <div role="alert" className="bg-red-50 text-red-700 rounded-xl p-4 text-sm">{error} {retry}</div>
      : <p role="status" className="text-sm text-gray-400 py-6 text-center">جارٍ تحميل السياسة…</p>
  }
  return (
    <div className="space-y-4" data-policy-reader>
      <div>
        <h2 className="text-xl font-bold text-gray-800 flex items-center gap-2"><FileText size={20} className="text-primary-600 shrink-0" />{content.title}</h2>
        <p className="text-xs text-gray-500 mt-1">
          {content.category ? `${content.category} · ` : ''}النسخة {content.versionNo} · سارية من {formatDate(content.effectiveDate)}
        </p>
      </div>
      {content.kind === 'TEXT'
        ? <div className="max-h-[55vh] overflow-y-auto rounded-xl border border-gray-200 bg-gray-50 p-4 text-sm leading-7 text-gray-800 whitespace-pre-wrap" data-policy-body>{content.bodyText}</div>
        : fileUrl
          ? <div className="rounded-xl border border-gray-200 overflow-hidden" data-policy-file><PdfPreview url={fileUrl} subject="السياسة" onStatus={setFileState} failureText="تعذر عرض ملف السياسة." /></div>
          : fileState === 'loading' && <p role="status" className="text-sm text-gray-400 py-6 text-center" data-policy-file-loading>جارٍ تحميل ملف السياسة…</p>}
      {error && <div role="alert" className="bg-red-50 text-red-700 rounded-xl p-3 text-sm">{error}</div>}
      {content.kind === 'FILE' && fileState === 'failed' && (
        <div role="alert" className="bg-amber-50 text-amber-800 rounded-xl p-3 text-sm" data-policy-file-failed>
          ملف السياسة ماتعرضش، فمفيش إقرار من غير ما تشوفه. {retry} — ولو فضل كده بلّغ الموارد البشرية.
        </div>
      )}
      {canAcknowledge ? shown && (
        <div className="rounded-xl border border-primary-100 bg-primary-50/50 p-4 space-y-3" data-policy-acknowledge>
          <label className="flex items-start gap-2 text-sm text-gray-800 cursor-pointer">
            <input type="checkbox" className="mt-1" checked={agreed} onChange={event => setAgreed(event.target.checked)} />
            <span>قرأت السياسة دي وأوافق عليها.</span>
          </label>
          <p className="text-xs text-gray-500">{POLICY_ACK_STATEMENT}</p>
          <button type="button" disabled={!agreed || saving} onClick={acknowledge} className="btn-primary disabled:opacity-50">
            {saving ? 'جارٍ التسجيل…' : 'قرأت وأوافق'}
          </button>
        </div>
      ) : acknowledgedAt ? (
        <p className="flex items-center gap-2 text-sm text-green-700" data-policy-acknowledged><CheckCircle2 size={18} />أقرّيت بالسياسة دي يوم {formatDateTime(acknowledgedAt)}</p>
      ) : null}
    </div>
  )
}
