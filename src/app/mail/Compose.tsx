'use client'

import { useEffect, useRef, useState, type KeyboardEvent } from 'react'
import { Maximize2, Minus, Paperclip, Send, Trash2, X } from 'lucide-react'
import { searchMailContacts, sendMail, type ComposeDraft, type MailContact } from '@/lib/mail-api'

const EMAIL_RE = /^[^\s@<>,;]+@[^\s@<>,;]+\.[^\s@<>,;]+$/
const MAX_BYTES = 25 * 1024 * 1024

/** خانة «إلى»: عناوين كشرايح + إكمال من دليل بريد الشركة */
function Recipients({ label, value, onChange, autoFocus }: { label: string; value: string[]; onChange: (v: string[]) => void; autoFocus?: boolean }) {
  const [text, setText] = useState('')
  const [hits, setHits] = useState<MailContact[]>([])
  const [active, setActive] = useState(0)

  useEffect(() => {
    const q = text.trim()
    if (q.length < 2) return setHits([])
    const id = setTimeout(() => searchMailContacts(q).then(setHits).catch(() => setHits([])), 200)
    return () => clearTimeout(id)
  }, [text])

  const add = (address: string) => {
    const clean = address.trim().replace(/[,;]$/, '')
    if (clean && !value.includes(clean)) onChange([...value, clean])
    setText('')
    setHits([])
  }

  const onKey = (event: KeyboardEvent<HTMLInputElement>) => {
    if ((event.key === 'Enter' || event.key === 'Tab') && hits[active]) {
      event.preventDefault()
      add(hits[active].email)
    } else if ((event.key === 'Enter' || event.key === ',' || event.key === ';') && EMAIL_RE.test(text.trim())) {
      event.preventDefault()
      add(text)
    } else if (event.key === 'Backspace' && !text && value.length) onChange(value.slice(0, -1))
    else if (event.key === 'ArrowDown') setActive((index) => Math.min(index + 1, hits.length - 1))
    else if (event.key === 'ArrowUp') setActive((index) => Math.max(index - 1, 0))
  }

  return (
    <div className="flex items-start gap-2 border-b border-gray-100 px-3 py-1.5">
      <span className="text-sm text-gray-500 pt-1 w-12 shrink-0">{label}</span>
      <div className="relative flex-1 flex flex-wrap items-center gap-1">
        {value.map((address) => (
          <span key={address} dir="ltr" className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-xs ${EMAIL_RE.test(address) ? 'bg-gray-100 text-gray-700' : 'bg-red-50 text-red-700'}`}>
            {address}
            <button type="button" onClick={() => onChange(value.filter((item) => item !== address))} aria-label="شيل العنوان">
              <X size={11} />
            </button>
          </span>
        ))}
        <input dir="ltr" className="flex-1 min-w-[8rem] py-1 text-sm outline-none bg-transparent" value={text} autoFocus={autoFocus}
          onChange={(event) => { setText(event.target.value); setActive(0) }} onKeyDown={onKey} onBlur={() => EMAIL_RE.test(text.trim()) && add(text)} />
        {hits.length > 0 && (
          <div className="absolute top-full start-0 mt-1 w-full max-w-md bg-white border border-gray-100 rounded-xl shadow-lg z-10 overflow-hidden">
            {hits.map((hit, index) => (
              <button key={hit.email} type="button" className={`w-full text-start px-3 py-1.5 text-sm flex items-center gap-2 ${index === active ? 'bg-primary-50' : 'hover:bg-gray-50'}`}
                onMouseDown={(event) => { event.preventDefault(); add(hit.email) }}>
                <strong className="text-gray-800">{hit.displayName}</strong>
                <span className="text-gray-500" dir="ltr">{hit.email}</span>
              </button>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}

const TOOLS: { cmd: string; label: string; title: string }[] = [
  { cmd: 'bold', label: 'B', title: 'عريض' },
  { cmd: 'italic', label: 'I', title: 'مايل' },
  { cmd: 'underline', label: 'U', title: 'تحته خط' },
  { cmd: 'insertUnorderedList', label: '•', title: 'قايمة نقط' },
  { cmd: 'insertOrderedList', label: '1.', title: 'قايمة أرقام' },
  { cmd: 'removeFormat', label: '⌫', title: 'شيل التنسيق' },
]

/** نافذة كتابة عايمة: تصغير وتكبير، نص منسّق، ومرفقات. الرد والتحويل: خادم البريد هو اللي بيبني الأصل المقتبس، ونص الموظف فوقه */
export default function Compose({ draft, mbx, onClose, onSent, onError }: { draft: ComposeDraft; mbx: string; onClose: () => void; onSent: () => void; onError: (cause: unknown) => void }) {
  const [d, setD] = useState(draft)
  const [showCc, setShowCc] = useState(draft.cc.length > 0 || draft.bcc.length > 0)
  const [files, setFiles] = useState<File[]>([])
  const [size, setSize] = useState<'normal' | 'min' | 'max'>('normal')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')
  const editor = useRef<HTMLDivElement>(null)
  const picker = useRef<HTMLInputElement>(null)

  useEffect(() => {
    if (draft.mode !== 'new' && !draft.to.length) return
    editor.current?.focus()
  }, [draft])

  const exec = (cmd: string) => {
    editor.current?.focus()
    document.execCommand(cmd, false)
  }

  const total = files.reduce((sum, file) => sum + file.size, 0)
  const send = async () => {
    if (busy) return
    if (!d.to.length && !d.cc.length && !d.bcc.length) return setError('اكتب مستلم واحد على الأقل')
    if ([...d.to, ...d.cc, ...d.bcc].some((address) => !EMAIL_RE.test(address))) return setError('فيه عنوان بريد مش صحيح')
    if (total > MAX_BYTES) return setError('المرفقات أكبر من 25 ميجا')
    setBusy(true)
    setError('')
    try {
      await sendMail(d, editor.current?.innerHTML ?? '', files, mbx)
      onSent()
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'تعذّر إرسال الرسالة')
      onError(cause)
      setBusy(false)
    }
  }

  const title = d.subject || (d.mode === 'new' ? 'رسالة جديدة' : d.mode === 'forward' ? 'تحويل' : 'رد')
  const frame = size === 'max' ? 'inset-4' : size === 'min' ? 'bottom-0 end-4 w-80' : 'bottom-0 end-4 w-[36rem] max-w-[calc(100vw-2rem)] h-[34rem] max-h-[calc(100vh-5rem)]'

  return (
    <div className={`fixed ${frame} z-50 bg-white border border-gray-200 rounded-t-2xl ${size === 'max' ? 'rounded-b-2xl' : ''} shadow-2xl flex flex-col`} role="dialog" aria-label={title}
      onKeyDown={(event) => { if ((event.ctrlKey || event.metaKey) && event.key === 'Enter') void send() }} data-mail-compose>
      <div className="flex items-center justify-between gap-2 bg-gray-800 text-white rounded-t-2xl px-4 py-2 cursor-pointer" onClick={() => size === 'min' && setSize('normal')}>
        <strong className="text-sm truncate">{title}</strong>
        <span className="flex items-center gap-1" onClick={(event) => event.stopPropagation()}>
          <button type="button" className="p-1 rounded hover:bg-white/20" onClick={() => setSize(size === 'min' ? 'normal' : 'min')} aria-label="تصغير">
            <Minus size={15} />
          </button>
          <button type="button" className="p-1 rounded hover:bg-white/20" onClick={() => setSize(size === 'max' ? 'normal' : 'max')} aria-label="تكبير">
            <Maximize2 size={14} />
          </button>
          <button type="button" className="p-1 rounded hover:bg-white/20" onClick={onClose} aria-label="إغلاق">
            <X size={15} />
          </button>
        </span>
      </div>
      {size !== 'min' && (
        <>
          <Recipients label="إلى" value={d.to} onChange={(to) => setD({ ...d, to })} autoFocus={!d.to.length} />
          {showCc ? (
            <>
              <Recipients label="نسخة" value={d.cc} onChange={(cc) => setD({ ...d, cc })} />
              <Recipients label="مخفية" value={d.bcc} onChange={(bcc) => setD({ ...d, bcc })} />
            </>
          ) : (
            <button type="button" className="self-start text-xs text-primary-600 hover:underline px-3 py-1" onClick={() => setShowCc(true)}>
              نسخة / نسخة مخفية
            </button>
          )}
          <input className="border-b border-gray-100 px-3 py-2 text-sm outline-none" value={d.subject} maxLength={500} onChange={(event) => setD({ ...d, subject: event.target.value })} placeholder="الموضوع" />
          <div className="flex items-center gap-1 border-b border-gray-100 px-2 py-1" dir="ltr">
            {TOOLS.map((tool) => (
              <button key={tool.cmd} type="button" title={tool.title} className="w-8 h-7 rounded hover:bg-gray-100 text-sm text-gray-700"
                onMouseDown={(event) => { event.preventDefault(); exec(tool.cmd) }}>
                {tool.label}
              </button>
            ))}
          </div>
          <div ref={editor} className="flex-1 min-h-[6rem] overflow-auto px-3 py-2 text-sm outline-none" contentEditable suppressContentEditableWarning dir="auto" role="textbox" aria-multiline="true" aria-label="نص الرسالة" />
          {d.quote && <div className="px-3 py-1 text-xs text-gray-500 border-t border-gray-100 truncate">{d.quote}</div>}
          {files.length > 0 && (
            <div className="flex flex-wrap gap-1 px-3 py-1 border-t border-gray-100">
              {files.map((file, index) => (
                <span key={`${file.name}-${index}`} className="inline-flex items-center gap-1 bg-gray-100 text-gray-700 rounded-full px-2 py-0.5 text-xs">
                  <Paperclip size={11} /> {file.name} · {(file.size / 1024 / 1024).toFixed(1)} MB
                  <button type="button" onClick={() => setFiles(files.filter((_, at) => at !== index))} aria-label="شيل المرفق">
                    <X size={11} />
                  </button>
                </span>
              ))}
              {total > MAX_BYTES && <span className="badge badge-danger">المرفقات أكبر من 25 ميجا</span>}
            </div>
          )}
          {error && (
            <div role="alert" className="mx-3 mb-1 bg-red-50 text-red-700 rounded-lg px-3 py-1.5 text-xs">
              {error}
            </div>
          )}
          <div className="flex items-center gap-2 px-3 py-2 border-t border-gray-100">
            <button type="button" className="btn-primary flex items-center gap-2 disabled:opacity-50" onClick={() => void send()} disabled={busy || total > MAX_BYTES}>
              <Send size={16} />
              {busy ? 'بنبعت…' : 'إرسال'}
            </button>
            <button type="button" className="p-2 rounded-lg hover:bg-gray-100 text-gray-600" onClick={() => picker.current?.click()} title="إرفاق ملف">
              <Paperclip size={17} />
            </button>
            <input ref={picker} type="file" multiple hidden onChange={(event) => { setFiles([...files, ...Array.from(event.target.files ?? [])].slice(0, 20)); event.target.value = '' }} />
            <span className="text-xs text-gray-400" dir="ltr">Ctrl+Enter</span>
            <button type="button" className="p-2 rounded-lg hover:bg-gray-100 text-gray-500 ms-auto" onClick={onClose} title="تجاهل الرسالة">
              <Trash2 size={16} />
            </button>
          </div>
        </>
      )}
    </div>
  )
}
