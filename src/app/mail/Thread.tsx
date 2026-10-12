'use client'

import { useEffect, useState } from 'react'
import { Download, Paperclip } from 'lucide-react'
import { formatDateTime } from '@/lib/dates'
import { downloadMailAttachment, type MailMessage, type MailThreadMessage } from '@/lib/mail-api'
import { fetchMessage, fetchThread, markOpened, messageCache, threadCache, threadKey } from './cache'
import MessageBody from './MessageBody'

export type ReplyMode = 'reply' | 'replyAll' | 'forward'

export function avatarColor(s: string) {
  let h = 0
  for (const c of s) h = (h * 31 + c.charCodeAt(0)) % 360
  return `hsl(${h} 45% 42%)`
}
const initial = (s: string) => ((s.trim()[0] ?? '?') || '?').toUpperCase()
const sizeLabel = (size: number) => (size > 1048576 ? `${(size / 1048576).toFixed(1)} MB` : `${Math.max(1, Math.ceil(size / 1024))} KB`)
const errorText = (cause: unknown, fallback: string) => (cause instanceof Error ? cause.message : fallback)

export function Avatar({ name, large }: { name: string; large?: boolean }) {
  return (
    <span className={`${large ? 'w-10 h-10 text-base' : 'w-8 h-8 text-sm'} shrink-0 rounded-full text-white flex items-center justify-center font-bold`} style={{ background: avatarColor(name || '?') }}>
      {initial(name || '?')}
    </span>
  )
}

/** رسالة مفتوحة: المرسل والمستلمين والمرفقات والنص */
export function MessageCard({ message, mbx, inThread, onReply, onCollapse, onError }: {
  message: MailMessage; mbx: string; inThread: boolean; onReply: (m: MailMessage, mode: ReplyMode) => void; onCollapse?: () => void; onError: (cause: unknown) => void
}) {
  // جوه المحادثة التاريخ المقتبس مخفي: الرسايل اللي قبلها فوقها على طول
  const [full, setFull] = useState(!inThread || !message.uniqueHtml)
  const who = message.from?.name || message.from?.address || ''
  return (
    <div className="bg-white border border-gray-100 rounded-2xl p-4 space-y-3" data-mail-card>
      <div className={`flex items-start gap-3 flex-wrap ${onCollapse ? 'cursor-pointer' : ''}`} onClick={onCollapse}>
        <Avatar name={who} large />
        <div className="min-w-0 flex-1">
          <div className="text-sm">
            <strong className="text-gray-800">{message.from?.name}</strong>{' '}
            <span className="text-gray-500" dir="ltr">
              &lt;{message.from?.address}&gt;
            </span>
          </div>
          <div className="text-xs text-gray-500 break-words">
            إلى: {message.to.map((a) => a.name || a.address).join('، ')}
            {message.cc.length > 0 && ` · نسخة: ${message.cc.map((a) => a.name || a.address).join('، ')}`}
          </div>
        </div>
        <span className="text-xs text-gray-500 tabular-nums">{message.date ? formatDateTime(message.date) : ''}</span>
        {inThread && (
          <span className="flex items-center gap-3 text-xs" onClick={(event) => event.stopPropagation()}>
            <button type="button" className="text-primary-600 hover:underline" onClick={() => onReply(message, 'reply')}>رد</button>
            <button type="button" className="text-primary-600 hover:underline" onClick={() => onReply(message, 'replyAll')}>رد على الكل</button>
            <button type="button" className="text-primary-600 hover:underline" onClick={() => onReply(message, 'forward')}>تحويل</button>
          </span>
        )}
      </div>
      {message.attachments.length > 0 && (
        <div className="flex flex-wrap gap-2" data-mail-attachments>
          {message.attachments.map((attachment) => (
            <button key={attachment.id} type="button" className="inline-flex items-center gap-2 bg-gray-50 hover:bg-gray-100 border border-gray-100 rounded-xl px-3 py-1.5 text-sm text-gray-700"
              onClick={() => downloadMailAttachment(message.id, attachment, mbx).catch(onError)} title="تنزيل المرفق">
              <Download size={14} />
              <span className="max-w-[14rem] truncate">{attachment.name}</span>
              <small className="text-gray-500 tabular-nums" dir="ltr">{sizeLabel(attachment.size)}</small>
            </button>
          ))}
        </div>
      )}
      <MessageBody html={full ? message.html : message.uniqueHtml} />
      {!full && (
        <button type="button" className="px-3 py-0.5 rounded-full bg-gray-100 text-gray-500 hover:bg-gray-200 text-sm" onClick={() => setFull(true)} title="اعرض الرسايل المقتبسة">
          •••
        </button>
      )}
    </div>
  )
}

/** رسالة مطوية في محادثة: سطر واحد، وبالضغط بتتفتح */
function CollapsedCard({ m, mbx, onOpen }: { m: MailThreadMessage; mbx: string; onOpen: () => void }) {
  const who = m.from?.name || m.from?.address || ''
  return (
    <div className={`flex items-center gap-3 bg-white border border-gray-100 rounded-2xl px-4 py-2 cursor-pointer hover:bg-gray-50 ${m.isRead ? '' : 'font-bold'}`} onClick={onOpen}
      onMouseEnter={() => fetchMessage(m.id, mbx).catch(() => undefined)}>
      <Avatar name={who} />
      <strong className="text-sm text-gray-800 shrink-0 max-w-[10rem] truncate">{who}</strong>
      <span className="text-sm text-gray-500 truncate flex-1">{m.preview}</span>
      {m.hasAttachments && <Paperclip size={13} className="text-gray-400 shrink-0" />}
      <span className="text-xs text-gray-500 tabular-nums shrink-0">{m.date ? formatDateTime(m.date) : ''}</span>
    </div>
  )
}

function ExpandedCard({ m, mbx, onReply, onCollapse, onLoaded, onError }: {
  m: MailThreadMessage; mbx: string; onReply: (msg: MailMessage, mode: ReplyMode) => void; onCollapse?: () => void; onLoaded: (msg: MailMessage) => void; onError: (cause: unknown) => void
}) {
  const [msg, setMsg] = useState<MailMessage | null>(messageCache.get(m.id) ?? null)
  const [error, setError] = useState('')
  useEffect(() => {
    let live = true
    fetchMessage(m.id, mbx)
      .then((loaded) => {
        if (!live) return
        setMsg(loaded)
        onLoaded(loaded)
      })
      .catch((cause) => {
        if (!live) return
        setError(errorText(cause, 'تعذّر تحميل الرسالة'))
        onError(cause)
      })
    return () => {
      live = false
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [m.id])
  if (error) return <div role="alert" className="bg-red-50 text-red-700 rounded-xl p-3 text-sm">{error}</div>
  if (!msg) return <div className="bg-white border border-gray-100 rounded-2xl p-4 text-sm text-gray-500">جاري التحميل…</div>
  return <MessageCard message={msg} mbx={mbx} inThread onReply={onReply} onCollapse={onCollapse} onError={onError} />
}

/**
 * محادثة كاملة، الأقدم أولًا: آخر رسالة والرسايل اللي مااتقرتش مفتوحين، والباقي سطر لكل رسالة وبيتفتح بالضغط. ردود الموظف نفسه داخلة.
 */
export function ThreadView({ id, folder, mbx, subject, onReply, onLatest, onLoaded, onError }: {
  id: string; folder: string; mbx: string; subject: string; onReply: (m: MailMessage, mode: ReplyMode) => void
  /** آخر رسالة — لأزرار الرد في الشريط واختصارات الكيبورد */
  onLatest: (m: MailMessage) => void
  onLoaded: () => void
  onError: (cause: unknown) => void
}) {
  const [msgs, setMsgs] = useState<MailThreadMessage[] | null>(threadCache.get(threadKey(id, folder, mbx)) ?? null)
  const [open, setOpen] = useState<Set<string>>(new Set())
  const [showAll, setShowAll] = useState(false)
  const [error, setError] = useState('')

  useEffect(() => {
    let live = true
    setError('')
    setShowAll(false)
    const apply = (list: MailThreadMessage[]) => {
      setMsgs(list)
      const last = list[list.length - 1]
      setOpen(new Set(list.filter((m) => !m.isRead || m === last).map((m) => m.id)))
    }
    const hit = threadCache.get(threadKey(id, folder, mbx))
    if (hit) apply(hit)
    else setMsgs(null)
    fetchThread(id, folder, mbx)
      .then((list) => {
        if (!live) return
        if (list !== hit) apply(list)
        onLoaded()
      })
      .catch((cause) => {
        if (!live) return
        setError(errorText(cause, 'تعذّر تحميل المحادثة'))
        onError(cause)
      })
    return () => {
      live = false
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id, folder, mbx])

  if (error) return <div role="alert" className="bg-red-50 text-red-700 rounded-xl p-3 text-sm">{error}</div>
  if (!msgs) return <div className="text-sm text-gray-500 p-4">جاري التحميل…</div>

  const toggle = (mid: string) =>
    setOpen((current) => {
      const next = new Set(current)
      if (next.has(mid)) next.delete(mid)
      else next.add(mid)
      return next
    })
  const lastId = msgs[msgs.length - 1]?.id
  // المحادثات الطويلة: الرسايل المقفولة اللي في النص بتتطوى في سطر واحد
  const hidden = !showAll && msgs.length > 4 ? msgs.slice(1, -2).filter((m) => !open.has(m.id)) : []
  const hiddenIds = new Set(hidden.map((m) => m.id))

  return (
    <div className="space-y-2" data-mail-thread>
      <h2 className="text-lg font-bold text-gray-800 flex items-center gap-2">
        {subject || msgs[0]?.subject || '(من غير موضوع)'}
        {msgs.length > 1 && <span className="text-xs bg-gray-100 text-gray-600 rounded-full px-2 py-0.5 tabular-nums">{msgs.length}</span>}
      </h2>
      {msgs.map((m) => {
        if (hiddenIds.has(m.id)) {
          return m.id === hidden[0].id ? (
            <button key={m.id} type="button" className="w-full text-center text-sm text-gray-500 bg-gray-50 hover:bg-gray-100 rounded-xl py-1.5" onClick={() => setShowAll(true)}>
              {hidden.length} رسالة أقدم
            </button>
          ) : null
        }
        return open.has(m.id) ? (
          <ExpandedCard key={m.id} m={m} mbx={mbx} onReply={onReply} onError={onError} onCollapse={msgs.length > 1 ? () => toggle(m.id) : undefined}
            onLoaded={(loaded) => {
              if (m.id === lastId) onLatest(loaded)
              if (!m.isRead) {
                markOpened(m.id, mbx)
                setMsgs((list) => list && list.map((row) => (row.id === m.id ? { ...row, isRead: true } : row)))
              }
            }} />
        ) : (
          <CollapsedCard key={m.id} m={m} mbx={mbx} onOpen={() => toggle(m.id)} />
        )
      })}
    </div>
  )
}
