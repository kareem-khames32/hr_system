'use client'
// B2.8: حوار التعليقات على الطلب أو المهمة — بيتحط في تفاصيل الطلب وفي كارت المهمة.
// الخادم هو اللي بيحكم: الحوار نفسه، والأسماء الظاهرة، وأدوار الإشارة المتاحة، وهل «داخلي» متاح. قبل ترحيل 093 المكوّن مابيعرضش حاجة.
import { useCallback, useEffect, useRef, useState } from 'react'
import { CornerDownLeft, Lock, MessageSquare, Paperclip, Send, X } from 'lucide-react'
import { fetchFileObjectUrl } from '../../lib/api'
import { formatDateTime } from '../../lib/dates'
import {
  addComment, commentAuthorLabel, fetchComments, uploadCommentFile, COMMENT_BODY_MAX, COMMENT_FILES_MAX, COMMENT_REPLIES_MAX,
  type ApiComment, type ApiCommentThread, type CommentKind,
} from '../../lib/comments-api'

interface Props { kind: CommentKind; id: number }

export default function CommentsThread({ kind, id }: Props) {
  const [thread, setThread] = useState<ApiCommentThread | null>(null)
  const [error, setError] = useState('')
  const [body, setBody] = useState('')
  const [internal, setInternal] = useState(false)
  const [targets, setTargets] = useState<string[]>([])
  const [replyTo, setReplyTo] = useState<string[]>([])
  const [files, setFiles] = useState<File[]>([])
  const [sending, setSending] = useState(false)
  const [sendError, setSendError] = useState('')
  const fileInput = useRef<HTMLInputElement>(null)
  // ضغطتين ورا بعض = تعليق واحد (الحالة بتتأخر عن الضغطة التانية)
  const running = useRef(false)
  // الملف اللي اترفع فعلًا: لو الإرسال اترفض ومحاولة تانية بنفس الملف، مايترفعش تاني
  const uploaded = useRef(new Map<File, number>())
  const subject = kind === 'requests' ? 'صاحب الطلب' : ''

  const load = useCallback(async (preselect: boolean) => {
    setError('')
    try {
      const loaded = await fetchComments(kind, id)
      setThread(loaded)
      // أول فتح: الإشارة الأولى المتاحة متعلّمة (صاحب الطلب بيسأل المعتمد الحالي، والمعتمد بيرد على صاحب الطلب)
      if (preselect) setTargets(loaded.targets.slice(0, 1).map(target => target.key))
      // إعادة التحميل: الدور اللي مابقاش متاح (الطلب اتحسم) والتعليق اللي مابقاش ظاهر بيتشالوا من الاختيار
      else {
        setTargets(current => current.filter(key => loaded.targets.some(target => target.key === key)))
        setReplyTo(current => current.filter(ref => loaded.comments.some(row => row.ref === ref)))
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'تعذر تحميل التعليقات')
    }
  }, [kind, id])

  useEffect(() => {
    setThread(null); setBody(''); setInternal(false); setReplyTo([]); setFiles([]); setSendError('')
    uploaded.current = new Map()
    void load(true)
  }, [load])

  const toggleTarget = (key: string) => setTargets(current => current.includes(key) ? current.filter(item => item !== key) : [...current, key])
  const toggleInternal = (value: boolean) => {
    setInternal(value)
    // الداخلي مايشاورش لصاحب الطلب (مش هيشوفه)، ومايردّش عليه تعليق ظاهر — والعكس: تعليق ظاهر مايردّش على داخلي
    if (value) setTargets(current => current.filter(key => key !== 'REQUESTER'))
    else setReplyTo(current => current.filter(ref => !thread?.comments.find(row => row.ref === ref)?.internal))
  }
  const reply = (comment: ApiComment) => {
    if (comment.internal && !internal) toggleInternal(true)
    setReplyTo(current => current.includes(comment.ref) || current.length >= COMMENT_REPLIES_MAX ? current : [...current, comment.ref])
  }
  const pickFiles = (list: FileList | null) => {
    const picked = [...files, ...Array.from(list ?? [])].slice(0, COMMENT_FILES_MAX)
    setFiles(picked)
    if (fileInput.current) fileInput.current.value = ''
  }
  const openFile = async (fileId: number) => {
    const url = await fetchFileObjectUrl(fileId)
    if (!url) { setSendError('تعذر فتح المرفق'); return }
    window.open(url, '_blank', 'noopener')
    setTimeout(() => URL.revokeObjectURL(url), 60_000)
  }

  const send = async () => {
    const text = body.trim()
    if (!text || running.current) return
    running.current = true
    setSending(true)
    setSendError('')
    try {
      const fileIds: number[] = []
      for (const file of files) {
        const known = uploaded.current.get(file)
        const fileId = known ?? (await uploadCommentFile(file)).id
        uploaded.current.set(file, fileId)
        fileIds.push(fileId)
      }
      await addComment(kind, id, { body: text, ...(internal ? { internal: true } : {}), ...(targets.length ? { targets } : {}), ...(replyTo.length ? { replyTo } : {}),
        ...(fileIds.length ? { fileIds } : {}) })
      setBody(''); setReplyTo([]); setFiles([])
      uploaded.current = new Map()
      await load(false)
    } catch (err) {
      setSendError(err instanceof Error ? err.message : 'تعذر إرسال التعليق')
    } finally {
      running.current = false
      setSending(false)
    }
  }

  if (error) return <div role="alert" className="bg-red-50 text-red-700 rounded-xl p-3 text-sm" data-comments-error>{error}</div>
  if (!thread) return <p className="text-sm text-gray-500" data-comments-loading>جاري تحميل التعليقات…</p>
  if (!thread.available) return null

  const label = (mine: boolean, author: ApiComment['author']) => commentAuthorLabel(kind, mine, author)
  const replied = replyTo.map(ref => thread.comments.find(row => row.ref === ref)).filter((row): row is ApiComment => !!row)

  return (
    <section className="space-y-3" data-comments={`${kind}:${id}`}>
      <h3 className="font-semibold text-gray-800 flex items-center gap-2"><MessageSquare size={18} className="text-primary-600" />التعليقات</h3>
      {thread.truncated && <p className="text-xs text-gray-500">الحوار أطول من المعروض: دي آخر {thread.comments.length} تعليق.</p>}
      {thread.comments.length === 0 ? <p className="text-sm text-gray-500" data-comments-empty>لسه مفيش تعليقات.</p> : (
        <ul className="space-y-2">
          {thread.comments.map(comment => (
            <li key={comment.ref} className={`rounded-xl p-3 text-sm ${comment.internal ? 'bg-amber-50 border border-amber-200' : comment.mine ? 'bg-primary-50' : 'bg-gray-50'}`} data-comment={comment.ref}>
              <div className="flex flex-wrap items-center justify-between gap-2 text-xs text-gray-500">
                <span className="font-medium text-gray-700" data-comment-author>
                  {label(comment.mine, comment.author)}{comment.author.subject && !comment.mine && subject ? ` — ${subject}` : ''}
                  {/* تعليق مسؤول المهمة «مش بتاعتي»: علامته جنب اسمه */}
                  {comment.eventLabel && <span className="badge bg-gray-100 text-gray-700 ms-2" data-comment-event-label>{comment.eventLabel}</span>}
                </span>
                <span>{formatDateTime(comment.createdAt)}</span>
              </div>
              {comment.internal && <p className="mt-1 text-xs text-amber-800 flex items-center gap-1" data-comment-internal><Lock size={12} />داخلي — مابيظهرش لصاحب الطلب</p>}
              <p className="mt-1 text-gray-800 whitespace-pre-wrap break-words">{comment.body}</p>
              {(comment.mentions.targets.length > 0 || comment.mentions.replies.length > 0) && (
                <p className="mt-1 text-xs text-gray-500" data-comment-mentions>
                  {comment.mentions.replies.length > 0 && <>رد على: {comment.mentions.replies.map(row => label(row.mine, row.author)).join('، ')}</>}
                  {comment.mentions.replies.length > 0 && comment.mentions.targets.length > 0 && ' · '}
                  {comment.mentions.targets.length > 0 && <>إشارة إلى: {comment.mentions.targets.map(target => target.label).join('، ')}</>}
                </p>
              )}
              {comment.files.length > 0 && (
                <div className="mt-2 flex flex-wrap gap-2">
                  {comment.files.map(file => (
                    <button key={file.id} type="button" className="text-xs underline text-primary-700 flex items-center gap-1" onClick={() => void openFile(file.id)}>
                      <Paperclip size={12} /><span className="break-all">{file.name}</span>
                    </button>
                  ))}
                </div>
              )}
              {!comment.mine && (
                <button type="button" className="mt-2 text-xs text-primary-700 flex items-center gap-1" onClick={() => reply(comment)} data-comment-reply>
                  <CornerDownLeft size={12} />رد
                </button>
              )}
            </li>
          ))}
        </ul>
      )}

      <div className="space-y-2" data-comment-form>
        <label className="label" htmlFor={`comment-${kind}-${id}`}>اكتب تعليق</label>
        <textarea id={`comment-${kind}-${id}`} className="input min-h-[72px]" maxLength={COMMENT_BODY_MAX} value={body} onChange={event => setBody(event.target.value)}
          placeholder={kind === 'requests' ? 'سؤال أو توضيح على الطلب ده' : 'سؤال أو توضيح على المهمة دي'} disabled={sending} />
        <p className="text-xs text-gray-400">{body.length} / {COMMENT_BODY_MAX}</p>
        {replied.length > 0 && (
          <div className="flex flex-wrap items-center gap-2 text-xs" data-comment-replying>
            <span className="text-gray-500">رد على:</span>
            {replied.map(comment => (
              <span key={comment.ref} className="badge bg-gray-100 text-gray-700 flex items-center gap-1">
                {label(comment.mine, comment.author)}
                <button type="button" aria-label="شيل الرد" onClick={() => setReplyTo(current => current.filter(item => item !== comment.ref))}><X size={12} /></button>
              </span>
            ))}
          </div>
        )}
        {thread.targets.length > 0 && (
          <div className="flex flex-wrap items-center gap-3 text-sm" data-comment-targets>
            <span className="text-gray-500 text-xs">إشعار إلى:</span>
            {thread.targets.map(target => (
              <label key={target.key} className="flex items-center gap-1">
                <input type="checkbox" checked={targets.includes(target.key)} disabled={sending || (internal && target.key === 'REQUESTER')} onChange={() => toggleTarget(target.key)} />
                {target.label}
              </label>
            ))}
          </div>
        )}
        {thread.canInternal && (
          <label className="flex items-center gap-2 text-sm" data-comment-internal-toggle>
            <input type="checkbox" checked={internal} disabled={sending} onChange={event => toggleInternal(event.target.checked)} />
            داخلي — مابيظهرش لصاحب الطلب
          </label>
        )}
        <div className="flex flex-wrap items-center gap-2 text-xs">
          <input ref={fileInput} type="file" multiple className="hidden" onChange={event => pickFiles(event.target.files)} />
          <button type="button" className="btn-secondary text-xs" disabled={sending || files.length >= COMMENT_FILES_MAX} onClick={() => fileInput.current?.click()}>
            <Paperclip size={14} className="inline me-1" />مرفق ({files.length} / {COMMENT_FILES_MAX})
          </button>
          {files.map((file, index) => (
            <span key={`${file.name}-${index}`} className="badge bg-gray-100 text-gray-700 flex items-center gap-1">
              <span className="break-all">{file.name}</span>
              <button type="button" aria-label="شيل المرفق" disabled={sending} onClick={() => setFiles(current => current.filter((_, position) => position !== index))}><X size={12} /></button>
            </span>
          ))}
        </div>
        {sendError && <div role="alert" className="bg-red-50 text-red-700 rounded-lg p-2 text-sm" data-comment-error>{sendError}</div>}
        <button type="button" className="btn-primary" disabled={sending || !body.trim()} onClick={() => void send()} data-comment-send>
          <Send size={14} className="inline me-1" />{sending ? 'جاري الإرسال…' : 'إرسال'}
        </button>
      </div>
    </section>
  )
}
