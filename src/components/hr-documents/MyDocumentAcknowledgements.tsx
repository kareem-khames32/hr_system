'use client'

// B2.7-ب: مستندات الموظف اللي مطلوب إقراره بيها — «مستني إقرارك» واللي أقرّ بيه، وقارئ المستند وإقراره. مستعملة في «مستنداتي».
// الإقرار ببصمة الملف اللي اتعرض هنا بالظبط، وزراره مابيظهرش غير بعد ما الملف يتعرض فعلًا: ملف ماتحمّلش أو ماتعرضش = من غير إقرار.
// ورابط «افتح المستند» من «مهامي» بيفتح القارئ مباشرة (‎?ack=رقم المستند).
import { useCallback, useEffect, useRef, useState } from 'react'
import { CheckCircle2, FileCheck, RefreshCw, X } from 'lucide-react'
import PdfPreview from '@/components/PdfPreview'
import { ApiError } from '@/lib/api'
import { formatDate, formatDateTime } from '@/lib/dates'
import {
  acknowledgeHrDocument, downloadIssuedHrDocument, fetchHrDocumentAck, fetchMyHrDocumentAcks,
  type HrDocumentAckContent, type MyHrDocumentAck,
} from '@/lib/hr-documents'
import { POLICY_ACK_STATEMENT } from '@/lib/policies-api'
import { notifyTasksChanged } from '@/lib/tasks-api'

/** حالة المستند بكلام الموظف */
export const myDocumentAckText = (document: Pick<MyHrDocumentAck, 'state' | 'dueDate' | 'acknowledgedAt'>): string =>
  document.state === 'ACKNOWLEDGED' ? `أقرّيت بيه يوم ${formatDateTime(document.acknowledgedAt!)}`
    : document.state === 'OVERDUE' ? `موعد الإقرار عدّى (${formatDate(document.dueDate!)})`
      : document.dueDate ? `آخر موعد للإقرار ${formatDate(document.dueDate)}` : 'مستني إقرارك'

function DocumentAckReader({ documentId, onAcknowledged, onStale }: { documentId: number; onAcknowledged: () => void; onStale: (message: string) => void }) {
  const [content, setContent] = useState<HrDocumentAckContent | null>(null)
  const [fileUrl, setFileUrl] = useState<string | null>(null)
  // الملف: لسه بيتحمّل، اتعرض، أو اتعذّر (تحميلًا أو عرضًا)
  const [fileState, setFileState] = useState<'loading' | 'rendered' | 'failed'>('loading')
  const [error, setError] = useState('')
  const [agreed, setAgreed] = useState(false)
  const [saving, setSaving] = useState(false)
  const [attempt, setAttempt] = useState(0)
  const running = useRef(false)
  const stale = useRef(onStale)
  stale.current = onStale
  // المستند مابقاش عليه طلب إقرار (اتلغى)، أو اتغيّر بعد ما اتفتح: القارئ بيتقفل والقايمة بتتحمّل تاني
  const gone = useCallback((cause: unknown) => {
    if (!(cause instanceof ApiError) || ![404, 409].includes(cause.status)) return false
    stale.current(cause.status === 404 ? 'المستند ده مابقاش مطلوب إقرارك بيه.' : cause.message)
    return true
  }, [])

  const load = useCallback(async (isCurrent: () => boolean) => {
    setContent(null); setFileUrl(null); setFileState('loading'); setAgreed(false); setError('')
    let loaded: HrDocumentAckContent
    try {
      loaded = await fetchHrDocumentAck(documentId)
    } catch (cause) {
      if (isCurrent() && !gone(cause)) setError(cause instanceof Error ? cause.message : 'تعذر تحميل المستند')
      return
    }
    if (!isCurrent()) return
    setContent(loaded)
    try {
      const url = URL.createObjectURL(await downloadIssuedHrDocument(documentId))
      if (!isCurrent()) { URL.revokeObjectURL(url); return }
      setFileUrl(url)
    } catch (cause) {
      // ملف ماتحمّلش (ومنه ملف اتبدّل على التخزين): بيتقال هنا، ومن غير إقرار
      if (isCurrent()) { setFileState('failed'); setError(cause instanceof Error ? cause.message : 'تعذر تحميل ملف المستند') }
    }
  }, [documentId, gone])

  useEffect(() => {
    let current = true
    void load(() => current)
    return () => { current = false }
  }, [load, attempt])
  // رابط الملف المحلي بيتلغي لما يتبدّل أو القارئ يتقفل
  useEffect(() => () => { if (fileUrl) URL.revokeObjectURL(fileUrl) }, [fileUrl])

  // الملف اتعرض فعلًا: بعد ما أول صفحة تترسم
  const shown = !!content && fileState === 'rendered'
  const acknowledge = async () => {
    if (!content || !shown || !agreed || running.current) return
    running.current = true; setSaving(true); setError('')
    try {
      await acknowledgeHrDocument(content.id, content.contentHash)
      onAcknowledged()
    } catch (cause) {
      if (!gone(cause)) setError(cause instanceof Error ? cause.message : 'تعذر تسجيل الإقرار')
    } finally { running.current = false; setSaving(false) }
  }
  const retry = <button type="button" onClick={() => setAttempt(value => value + 1)} className="inline-flex items-center gap-1 underline"><RefreshCw size={14} />حاول تاني</button>

  if (!content) {
    return error
      ? <div role="alert" className="bg-red-50 text-red-700 rounded-xl p-4 text-sm">{error} {retry}</div>
      : <p role="status" className="text-sm text-gray-400 py-6 text-center">جارٍ تحميل المستند…</p>
  }
  return (
    <div className="space-y-4" data-document-ack-reader>
      <div>
        <h2 className="text-xl font-bold text-gray-800 flex items-center gap-2"><FileCheck size={20} className="text-primary-600 shrink-0" />{content.templateName}</h2>
        <p className="text-xs text-gray-500 mt-1"><span dir="ltr">{content.reference}</span> · {myDocumentAckText(content)}</p>
      </div>
      {fileUrl
        ? <div className="rounded-xl border border-gray-200 overflow-hidden" data-document-ack-file><PdfPreview url={fileUrl} subject="المستند" onStatus={setFileState} failureText="تعذر عرض ملف المستند." /></div>
        : fileState === 'loading' && <p role="status" className="text-sm text-gray-400 py-6 text-center">جارٍ تحميل ملف المستند…</p>}
      {error && <div role="alert" className="bg-red-50 text-red-700 rounded-xl p-3 text-sm">{error}</div>}
      {fileState === 'failed' && (
        <div role="alert" className="bg-amber-50 text-amber-800 rounded-xl p-3 text-sm" data-document-ack-file-failed>
          ملف المستند ماتعرضش، فمفيش إقرار من غير ما تشوفه. {retry} — ولو فضل كده بلّغ الموارد البشرية.
        </div>
      )}
      {content.state !== 'ACKNOWLEDGED' ? shown && (
        <div className="rounded-xl border border-primary-100 bg-primary-50/50 p-4 space-y-3" data-document-acknowledge>
          <label className="flex items-start gap-2 text-sm text-gray-800 cursor-pointer">
            <input type="checkbox" className="mt-1" checked={agreed} disabled={saving} onChange={event => setAgreed(event.target.checked)} />
            <span>قرأت المستند ده وأوافق عليه.</span>
          </label>
          <p className="text-xs text-gray-500">{POLICY_ACK_STATEMENT}</p>
          <button type="button" disabled={!agreed || saving} onClick={acknowledge} className="btn-primary disabled:opacity-50">
            {saving ? 'جارٍ التسجيل…' : 'قرأت وأوافق'}
          </button>
        </div>
      ) : (
        <p className="flex items-center gap-2 text-sm text-green-700" data-document-acknowledged><CheckCircle2 size={18} />{myDocumentAckText(content)}</p>
      )}
    </div>
  )
}

export default function MyDocumentAcknowledgements() {
  const [documents, setDocuments] = useState<MyHrDocumentAck[]>([])
  const [error, setError] = useState('')
  const [notice, setNotice] = useState('')
  const [open, setOpen] = useState<number | null>(null)

  const load = useCallback(() => {
    setError('')
    fetchMyHrDocumentAcks().then(data => setDocuments(data.documents)).catch(cause => setError(cause instanceof Error ? cause.message : 'تعذر تحميل المستندات المطلوب إقرارك بيها'))
  }, [])
  useEffect(() => {
    load()
    // «افتح المستند» من «مهامي»
    const id = Number(new URLSearchParams(window.location.search).get('ack'))
    if (Number.isSafeInteger(id) && id > 0) setOpen(id)
  }, [load])

  // اللي مستنيك الأول (المتأخر قبل اللي جوه موعده)، وبعدهم اللي أقرّيت بيه
  const rank = (document: MyHrDocumentAck) => (document.state === 'OVERDUE' ? 0 : document.state === 'PENDING' ? 1 : 2)
  const ordered = [...documents].sort((a, b) => rank(a) - rank(b) || b.id - a.id)
  const waiting = documents.filter(document => document.state !== 'ACKNOWLEDGED').length
  const read = (id: number) => { setNotice(''); setOpen(id) }
  // الإقرار قفل مهمته: عدّاد «مهامي» في القايمة الجانبية بيتقرا تاني
  const acknowledged = () => { setOpen(null); setNotice('اتسجّل إقرارك بالمستند.'); load(); notifyTasksChanged() }
  const stale = (message: string) => { setOpen(null); setNotice(message); load(); notifyTasksChanged() }

  return (
    <>
      {error && <div role="alert" className="bg-amber-50 text-amber-800 rounded-xl p-4 text-sm">{error}</div>}
      {notice && <div role="status" className="bg-primary-50 text-primary-800 rounded-xl p-4 text-sm" data-document-ack-notice>{notice}</div>}
      {ordered.length > 0 && (
        <div className="card p-4 sm:p-6 space-y-3" data-my-document-acks>
          <div className="flex items-start justify-between gap-3 flex-wrap">
            <h2 className="font-bold text-gray-800 flex items-center gap-2"><FileCheck size={18} className="text-primary-600" />مستندات مطلوب إقرارك بيها</h2>
            {waiting > 0 && <span className="badge badge-warning text-xs">مستنيك {waiting}</span>}
          </div>
          <ul className="divide-y divide-gray-100">
            {ordered.map(document => (
              <li key={document.id} className="py-3 flex flex-wrap items-center justify-between gap-3">
                <div className="min-w-0">
                  <p className="font-medium text-gray-800 break-words">{document.templateName}</p>
                  <p className={`text-xs mt-0.5 ${document.state === 'OVERDUE' ? 'text-red-600 font-medium' : 'text-gray-500'}`}>
                    <span dir="ltr">{document.reference}</span> · {myDocumentAckText(document)}
                  </p>
                </div>
                <button type="button" onClick={() => read(document.id)} className={document.state === 'ACKNOWLEDGED' ? 'btn-secondary' : 'btn-primary'}>
                  {document.state === 'ACKNOWLEDGED' ? 'قراءة' : 'اقرا ووافق'}
                </button>
              </li>
            ))}
          </ul>
        </div>
      )}
      {open !== null && (
        <div className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center p-4" onClick={() => setOpen(null)}>
          <div role="dialog" aria-modal="true" aria-label="مستند مطلوب إقرارك بيه" className="bg-white rounded-2xl shadow-xl w-full max-w-3xl max-h-[92vh] overflow-y-auto" onClick={event => event.stopPropagation()}>
            <div className="flex justify-end p-2">
              <button type="button" onClick={() => setOpen(null)} aria-label="إغلاق" className="p-2 rounded-lg text-gray-400 hover:bg-gray-100"><X size={20} /></button>
            </div>
            <div className="px-5 pb-5">
              <DocumentAckReader key={open} documentId={open} onAcknowledged={acknowledged} onStale={stale} />
            </div>
          </div>
        </div>
      )}
    </>
  )
}
