'use client'

// B-ADD.16: شاشة البريد نفسها — المجلدات (ومعاها الصناديق المشتركة)، والقايمة (محادثات أو رسايل)، والقراءة، والكتابة.
// كل حاجة بتتقري من خادم البريد بدخول صاحب الجلسة؛ والكاش في ذاكرة الصفحة بس (cache.ts).
import { useCallback, useEffect, useMemo, useRef, useState, type ReactNode } from 'react'
import { ArrowRight, ChevronDown, ChevronLeft, Flag, Folder, Inbox, Mail, MailOpen, Paperclip, PenSquare, Send, ShieldAlert, Trash2, FileText } from 'lucide-react'
import { DISPLAY_LOCALE, formatDateTime } from '@/lib/dates'
import {
  fetchMailFolders, fetchMailList, isMailLocked, patchMailMessage, patchMailThread, removeMailMessage, removeMailThread,
  type ComposeDraft, type MailFolder, type MailFolders, type MailMessage, type MailPage, type MailPatch, type MailThreadPage, type SharedMailbox,
} from '@/lib/mail-api'
import { dropThread, fetchMessage, fetchThread, listCache, markOpened, messageCache, ownCaches } from './cache'
import Compose from './Compose'
import { highlight, matchesAll, searchTerms } from './match'
import SearchBox, { NO_ADV, SearchPanel, type Adv } from './SearchBox'
import { Avatar, MessageCard, ThreadView, type ReplyMode } from './Thread'

/** صف في القايمة: محادثة، أو رسالة واحدة لما المحادثات مقفولة */
interface Row {
  id: string; kind: 'thread' | 'message'; subject: string; who: string; date: string | null; count: number; unread: boolean; hasAttachments: boolean
  important: boolean; flagged: boolean; preview: string
  /** في البحث في كل المجلدات: الرسالة فين */
  folder?: string
}
interface Page { total: number; more: boolean; rows: Row[] }

// تفضيل عرض بس (مش محتوى بريد)
const THREADS_KEY = 'hr_mail_threads'
const PAGE = 50
const FOLDER_NAMES: Record<string, string> = { inbox: 'الوارد', drafts: 'المسودات', sent: 'المرسل', deleted: 'المحذوف', junk: 'غير المرغوب' }
const FOLDER_ICONS: Record<string, ReactNode> = { inbox: <Inbox size={16} />, drafts: <FileText size={16} />, sent: <Send size={16} />, deleted: <Trash2 size={16} />, junk: <ShieldAlert size={16} /> }

function stored(key: string, fallback: string) {
  try { return localStorage.getItem(key) ?? fallback } catch { return fallback }
}
function store(key: string, value: string) {
  try { localStorage.setItem(key, value) } catch { /* التخزين مقفول: الاختيار للصفحة دي بس */ }
}
const prefix = (p: string, subject: string) => (new RegExp(`^${p}:`, 'i').test(subject) ? subject : `${p}: ${subject}`)
const folderName = (folder: MailFolder) => FOLDER_NAMES[folder.key] ?? folder.name
const errorText = (cause: unknown, fallback: string) => (cause instanceof Error ? cause.message : fallback)

export default function MailClient({ owner, me, onLocked }: {
  /** علامة الجلسة: الكاش بتاعها بس */
  owner: string
  /** عناوين صاحب الجلسة (بحروف صغيرة) — للرد على الكل وشريحة «مني» */
  me: string[]
  /** الخادم قال إن البريد اتقفل (المدة خلصت أو كلمة المرور اتغيّرت): الشاشة ترجع لـ«افتح بريدك» */
  onLocked: (message: string) => void
}) {
  ownCaches(owner)
  const [threadsOn, setThreadsOn] = useState(() => stored(THREADS_KEY, '1') === '1')
  const [folders, setFolders] = useState<MailFolders | null>(null)
  const [shared, setShared] = useState<SharedMailbox[]>([])
  /** مجلدات الصناديق المشتركة — بتتحمّل لما الصندوق يتفتح */
  const [sharedFolders, setSharedFolders] = useState<Record<string, MailFolders | 'error'>>({})
  const [expanded, setExpanded] = useState<string[]>([])
  /** '' = صندوق الموظف نفسه، وإلا عنوان صندوق مشترك */
  const [mbx, setMbx] = useState('')
  const [folder, setFolder] = useState('inbox')
  const [rows, setRows] = useState<Row[]>([])
  const [total, setTotal] = useState(0)
  const [more, setMore] = useState(false)
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [query, setQuery] = useState('')
  const [unreadOnly, setUnreadOnly] = useState(false)
  const [adv, setAdv] = useState<Adv>(NO_ADV)
  const [advOpen, setAdvOpen] = useState(false)
  const [openId, setOpenId] = useState<string | null>(null)
  /** الرسالة المفتوحة، أو آخر رسالة في المحادثة المفتوحة (أزرار الرد والاختصارات) */
  const [message, setMessage] = useState<MailMessage | null>(null)
  const [compose, setCompose] = useState<ComposeDraft | null>(null)
  const [error, setError] = useState('')
  const [notice, setNotice] = useState('')
  const searchBox = useRef<HTMLInputElement>(null)
  /** آخر طلب قايمة بس هو اللي يحدّث الشاشة (الكتابة السريعة بتبعت كذا طلب) */
  const seq = useRef(0)

  const advActive = !!(adv.from || adv.to || adv.subject || adv.after || adv.before || adv.attach)
  const searching = !!query || advActive
  // المسودات ونتايج البحث رسايل مفردة
  const threaded = threadsOn && folder !== 'drafts' && !searching
  const open = rows.find((row) => row.id === openId) ?? null
  // والموظف بيكتب، القايمة بتتفلتر باللي على الشاشة؛ ورد الخادم الدقيق بييجي بعده
  const terms = useMemo(() => searchTerms(search), [search])
  const typing = search.trim() !== query
  const visible = typing && terms.length ? rows.filter((row) => matchesAll([row.who, row.subject, row.preview], terms)) : rows
  const mark = (text: string) => (terms.length ? highlight(text, terms) : text)

  /** خطأ من الخادم: «البريد مقفول» بيرجّع لنموذج الفتح، وغيره بيتعرض */
  const fail = useCallback((cause: unknown) => {
    if (isMailLocked(cause)) return onLocked(errorText(cause, ''))
    setNotice(errorText(cause, 'تعذّر تنفيذ الطلب'))
  }, [onLocked])

  const loadFolders = useCallback(() =>
    fetchMailFolders()
      .then((found) => {
        setFolders(found)
        setShared(found.shared ?? [])
      })
      .catch((cause) => (isMailLocked(cause) ? onLocked(errorText(cause, '')) : setError(errorText(cause, 'تعذّر تحميل المجلدات')))), [onLocked])

  const loadShared = useCallback((address: string) =>
    fetchMailFolders(address)
      .then((found) => setSharedFolders((current) => ({ ...current, [address]: found })))
      .catch((cause) => (isMailLocked(cause) ? onLocked(errorText(cause, '')) : setSharedFolders((current) => ({ ...current, [address]: 'error' })))), [onLocked])

  const refreshFolders = () => {
    if (mbx) void loadShared(mbx)
    else void loadFolders()
  }

  const loadList = useCallback(async (offset = 0) => {
    const my = ++seq.current
    setLoading(true)
    const params = new URLSearchParams({ folder, offset: String(offset), limit: String(PAGE) })
    if (query) params.set('search', query)
    if (unreadOnly) params.set('unread', '1')
    if (mbx) params.set('mbx', mbx)
    if (adv.from) params.set('from', adv.from)
    if (adv.to) params.set('to', adv.to)
    if (adv.subject) params.set('subject', adv.subject)
    if (adv.after) params.set('after', adv.after)
    if (adv.before) params.set('before', adv.before)
    if (adv.attach) params.set('attach', '1')
    if (searching && adv.scope === 'all') params.set('scope', 'all')
    const kind = threaded ? 'conversations' : 'messages'
    const cacheKey = `${kind}?${params.toString()}`
    const cached = offset === 0 ? (listCache.get(cacheKey) as Page | undefined) : undefined
    if (cached) {
      setRows(cached.rows)
      setTotal(cached.total)
      setMore(cached.more)
    }
    const sentLike = folder === 'sent' || folder === 'drafts'
    try {
      let page: Page
      if (threaded) {
        const found = await fetchMailList<MailThreadPage>('conversations', params)
        page = { total: found.total, more: found.more, rows: found.items.map((item) => ({ id: item.id, kind: 'thread', subject: item.subject, who: (sentLike ? item.recipients : item.senders).join('، '),
          date: item.date, count: item.count, unread: item.unread > 0, hasAttachments: item.hasAttachments, important: item.important, flagged: item.flagged, preview: item.preview })) }
      } else {
        const found = await fetchMailList<MailPage>('messages', params)
        page = { total: found.total, more: found.more, rows: found.items.map((item) => ({ id: item.id, kind: 'message', subject: item.subject, who: sentLike ? item.to : item.from?.name || item.from?.address || '',
          date: item.date, count: 1, unread: !item.isRead, hasAttachments: item.hasAttachments, important: item.important, flagged: item.flagged, preview: item.preview, folder: item.folder?.name })) }
      }
      if (offset === 0) listCache.set(cacheKey, page)
      if (my !== seq.current) return
      setRows((previous) => (offset ? [...previous, ...page.rows.filter((row) => !previous.some((item) => item.id === row.id))] : page.rows))
      setTotal(page.total)
      setMore(page.more)
      setError('')
    } catch (cause) {
      if (my !== seq.current) return
      if (isMailLocked(cause)) onLocked(errorText(cause, ''))
      else setError(errorText(cause, 'تعذّر تحميل الرسايل'))
    } finally {
      if (my === seq.current) setLoading(false)
    }
  }, [folder, query, unreadOnly, mbx, threaded, adv, searching, onLocked])

  useEffect(() => { void loadFolders() }, [loadFolders])
  useEffect(() => {
    setOpenId(null)
    void loadList(0)
  }, [loadList])
  useEffect(() => {
    const id = setTimeout(() => setQuery(search.trim()), 300)
    return () => clearTimeout(id)
  }, [search])

  // رسالة مفردة (المحادثات مقفولة): تتجاب، تتعلّم مقروءة عندنا، واللي بعدها تتحمّل مسبقًا
  useEffect(() => {
    setMessage(null)
    if (!openId || open?.kind !== 'message') return
    let cancelled = false
    setMessage(messageCache.get(openId) ?? null)
    fetchMessage(openId, mbx)
      .then((loaded) => {
        if (cancelled) return
        setMessage(loaded)
        const index = rows.findIndex((row) => row.id === openId)
        if (rows[index + 1]?.kind === 'message') fetchMessage(rows[index + 1].id, mbx).catch(() => undefined)
        if (rows[index]?.unread) markOpened(openId, mbx)
        setRows((list) => list.map((row) => (row.id === openId ? { ...row, unread: false } : row)))
      })
      .catch(fail)
    return () => {
      cancelled = true
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [openId, fail])

  const patch = async (row: Row, body: MailPatch) => {
    try {
      if (row.kind === 'thread') await patchMailThread(row.id, folder, body, mbx)
      else await patchMailMessage(row.id, body, mbx)
      if (row.kind === 'thread') dropThread(row.id)
      else messageCache.delete(row.id)
      listCache.clear()
      if (body.folder) {
        setRows((list) => list.filter((item) => item.id !== row.id))
        if (openId === row.id) setOpenId(null)
      } else {
        setRows((list) => list.map((item) => (item.id === row.id ? { ...item, ...(body.isRead !== undefined && { unread: !body.isRead }), ...(body.flagged !== undefined && { flagged: body.flagged }) } : item)))
      }
      refreshFolders()
    } catch (cause) {
      fail(cause)
    }
  }

  const remove = async (row: Row) => {
    const index = rows.findIndex((item) => item.id === row.id)
    try {
      if (row.kind === 'thread') await removeMailThread(row.id, folder, mbx)
      else await removeMailMessage(row.id, mbx)
      if (row.kind === 'thread') dropThread(row.id)
      else messageCache.delete(row.id)
      listCache.clear()
      const rest = rows.filter((item) => item.id !== row.id)
      setRows(rest)
      // كمّل قراءة: روح للي بعدها
      if (openId === row.id) setOpenId(rest[Math.min(index, rest.length - 1)]?.id ?? null)
      refreshFolders()
    } catch (cause) {
      fail(cause)
    }
  }

  const replyTo = useCallback((m: MailMessage, mode: ReplyMode) => {
    const notMe = (address: string) => !!address && !me.includes(address.toLowerCase())
    const from = m.from?.address ? [m.from.address] : []
    const header = `${m.from?.name ?? ''} <${m.from?.address ?? ''}> — ${m.date ? formatDateTime(m.date) : ''}`
    // في المحادثة آخر رسالة غالبًا بتاعتي: الرد عليها بيروح لمستلميها
    const own = from.length > 0 && !notMe(from[0])
    const to = own ? m.to.map((a) => a.address).filter(notMe) : from
    const cc = (own ? m.cc : [...m.to, ...m.cc]).map((a) => a.address).filter((address) => notMe(address) && !to.includes(address))
    setCompose({ mode, refId: m.id, to: mode === 'forward' ? [] : to, cc: mode === 'replyAll' ? cc : [], bcc: [], subject: prefix(mode === 'forward' ? 'FW' : 'RE', m.subject),
      quote: `${mode === 'forward' ? 'تحويل رسالة' : 'رد على'}: ${header}` })
  }, [me])
  const reply = (mode: ReplyMode) => message && replyTo(message, mode)

  const openFolder = (box: string, key: string) => {
    setMbx(box)
    setFolder(key)
  }
  const toggleShared = (address: string) => {
    const isOpen = expanded.includes(address)
    setExpanded(isOpen ? expanded.filter((item) => item !== address) : [...expanded, address])
    if (!isOpen && !sharedFolders[address]) void loadShared(address)
  }

  // اختصارات الكيبورد
  useEffect(() => {
    const onKey = (event: KeyboardEvent) => {
      const element = event.target as HTMLElement
      if (compose || element.isContentEditable || ['INPUT', 'TEXTAREA', 'SELECT'].includes(element.tagName) || event.ctrlKey || event.metaKey || event.altKey) return
      const index = rows.findIndex((row) => row.id === openId)
      const go = (at: number) => rows[at] && setOpenId(rows[at].id)
      if (event.key === 'c') setCompose({ mode: 'new', to: [], cc: [], bcc: [], subject: '' })
      else if (event.key === 'j') go(index + 1)
      else if (event.key === 'k') go(Math.max(index - 1, 0))
      else if (event.key === 'r' && message) reply('reply')
      else if (event.key === 'a' && message) reply('replyAll')
      else if (event.key === 'f' && message) reply('forward')
      else if ((event.key === '#' || event.key === 'Delete') && open) void remove(open)
      else if ((event.key === 'u' || event.key === 'Escape') && openId) setOpenId(null)
      else if (event.key === '/') searchBox.current?.focus()
      else return
      event.preventDefault()
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  })

  const dayFormat = useMemo(() => ({
    time: new Intl.DateTimeFormat(DISPLAY_LOCALE, { hour: '2-digit', minute: '2-digit' }),
    date: new Intl.DateTimeFormat(DISPLAY_LOCALE, { day: 'numeric', month: 'short' }),
  }), [])
  const shortDate = (iso: string | null) => {
    if (!iso) return ''
    const date = new Date(iso)
    return date.toDateString() === new Date().toDateString() ? dayFormat.time.format(date) : dayFormat.date.format(date)
  }

  const boxFolders = mbx ? (sharedFolders[mbx] === 'error' ? null : (sharedFolders[mbx] as MailFolders | undefined)) : folders
  const allFolders = [...(boxFolders?.wellKnown ?? []), ...(boxFolders?.custom ?? [])]
  const current = allFolders.find((item) => item.key === folder)

  const folderTree = (box: string, tree: MailFolders, depth: number) => {
    const childrenOf = (id: string) => tree.custom.filter((item) => item.parentId === id)
    const button = (item: MailFolder, level: number): ReactNode => (
      <div key={item.id}>
        <button type="button" onClick={() => openFolder(box, item.key)} style={{ paddingInlineStart: 12 + level * 14 }}
          className={`w-full flex items-center gap-2 pe-3 py-1.5 rounded-lg text-sm text-start ${mbx === box && folder === item.key ? 'bg-primary-50 text-primary-700 font-bold' : 'text-gray-700 hover:bg-gray-50'}`}>
          <span className="shrink-0 text-gray-500">{FOLDER_ICONS[item.key] ?? <Folder size={16} />}</span>
          <span className="truncate flex-1">{folderName(item)}</span>
          {item.unread > 0 && item.key !== 'sent' && item.key !== 'deleted' && <b className="text-xs tabular-nums">{item.unread}</b>}
        </button>
        {childrenOf(item.id).map((child) => button(child, level + 1))}
      </div>
    )
    return (
      <>
        {tree.wellKnown.map((item) => button(item, depth))}
        {tree.custom.filter((item) => tree.rootIds.includes(item.id)).map((item) => button(item, depth))}
      </>
    )
  }

  const list = (
    <section className={`card p-0 overflow-hidden ${openId ? 'hidden lg:block' : ''}`} data-mail-list>
      <div className="flex items-center gap-2 px-3 py-2 border-b border-gray-100 flex-wrap">
        <strong className="text-gray-800">{current ? folderName(current) : ''}</strong>
        {mbx && <span className="badge bg-primary-50 text-primary-700">{shared.find((item) => item.address === mbx)?.name ?? mbx}</span>}
        <span className="text-xs text-gray-500 tabular-nums">{total}</span>
        <button type="button" onClick={() => setUnreadOnly(!unreadOnly)} className={`ms-auto rounded-full px-3 py-1 text-xs ${unreadOnly ? 'bg-primary-600 text-white' : 'bg-gray-100 text-gray-700 hover:bg-gray-200'}`}>
          غير المقروء
        </button>
      </div>
      <div className={`max-h-[70vh] overflow-auto divide-y divide-gray-50 ${loading ? 'opacity-70' : ''}`}>
        {visible.map((row) => (
          <div key={row.id} onClick={() => setOpenId(row.id)}
            onMouseEnter={() => (row.kind === 'thread' ? fetchThread(row.id, folder, mbx) : fetchMessage(row.id, mbx)).catch(() => undefined)}
            className={`group flex items-start gap-3 px-3 py-2 cursor-pointer ${openId === row.id ? 'bg-primary-50' : 'hover:bg-gray-50'}`}>
            <Avatar name={row.who} />
            <div className="min-w-0 flex-1">
              <div className="flex items-center gap-2">
                <span className={`truncate text-sm ${row.unread ? 'font-bold text-gray-900' : 'text-gray-700'}`}>{mark(row.who)}</span>
                {row.count > 1 && <span className="text-xs bg-gray-100 text-gray-600 rounded-full px-1.5 tabular-nums">{row.count}</span>}
                {row.hasAttachments && <Paperclip size={13} className="text-gray-400 shrink-0" />}
                {row.important && <span className="text-red-600 font-bold">!</span>}
                {row.folder && <span className="badge bg-gray-100 text-gray-600">{row.folder}</span>}
                <span className="ms-auto text-xs text-gray-500 tabular-nums shrink-0">{shortDate(row.date)}</span>
              </div>
              <div className={`truncate text-sm ${row.unread ? 'font-bold text-gray-900' : 'text-gray-700'}`}>{row.subject ? mark(row.subject) : '(من غير موضوع)'}</div>
              <div className="truncate text-xs text-gray-500">{mark(row.preview)}</div>
            </div>
            <div className="flex flex-col gap-1 opacity-60 group-hover:opacity-100" onClick={(event) => event.stopPropagation()}>
              <button type="button" className={`p-1 rounded hover:bg-gray-200 ${row.flagged ? 'text-red-600' : 'text-gray-500'}`} onClick={() => void patch(row, { flagged: !row.flagged })} title="علم للمتابعة">
                <Flag size={14} />
              </button>
              <button type="button" className="p-1 rounded hover:bg-gray-200 text-gray-500" onClick={() => void patch(row, { isRead: row.unread })} title={row.unread ? 'علّمها مقروءة' : 'علّمها غير مقروءة'}>
                {row.unread ? <MailOpen size={14} /> : <Mail size={14} />}
              </button>
              <button type="button" className="p-1 rounded hover:bg-gray-200 text-gray-500" onClick={() => void remove(row)} title="حذف (نقل للمحذوف)">
                <Trash2 size={14} />
              </button>
            </div>
          </div>
        ))}
        {!loading && !typing && visible.length === 0 && !error && <div className="p-8 text-center text-sm text-gray-500">{searching ? 'مفيش نتايج مطابقة' : 'المجلد فاضي'}</div>}
        {more && (
          <button type="button" className="w-full py-2 text-sm text-primary-600 hover:bg-gray-50 disabled:opacity-50" onClick={() => void loadList(rows.length)} disabled={loading}>
            حمّل أكتر
          </button>
        )}
      </div>
    </section>
  )

  const reader = (
    <section className={`min-w-0 space-y-3 ${openId ? '' : 'hidden lg:block'}`} data-mail-reader>
      {!open && <div className="card text-center text-sm text-gray-500 py-16">اختار رسالة عشان تقراها</div>}
      {open && (
        <>
          <div className="flex items-center gap-2 flex-wrap">
            <button type="button" className="p-2 rounded-lg hover:bg-gray-100 text-gray-600 lg:hidden" onClick={() => setOpenId(null)} title="رجوع للقايمة">
              <ArrowRight size={18} className="rtl:rotate-0 ltr:rotate-180" />
            </button>
            <button type="button" className="btn-secondary text-sm disabled:opacity-50" onClick={() => reply('reply')} disabled={!message}>رد</button>
            <button type="button" className="btn-secondary text-sm disabled:opacity-50" onClick={() => reply('replyAll')} disabled={!message}>رد على الكل</button>
            <button type="button" className="btn-secondary text-sm disabled:opacity-50" onClick={() => reply('forward')} disabled={!message}>تحويل</button>
            <select className="input w-auto text-sm py-2" value="" onChange={(event) => event.target.value && void patch(open, { folder: event.target.value })} aria-label="نقل إلى مجلد">
              <option value="">نقل إلى…</option>
              {allFolders.filter((item) => item.key !== folder).map((item) => (
                <option key={item.id} value={item.key}>{folderName(item)}</option>
              ))}
            </select>
            <button type="button" className="p-2 rounded-lg hover:bg-gray-100 text-gray-600" onClick={() => void remove(open)} title="حذف (نقل للمحذوف)">
              <Trash2 size={16} />
            </button>
          </div>
          {open.kind === 'thread' ? (
            <ThreadView key={`${mbx}/${folder}/${open.id}`} id={open.id} folder={folder} mbx={mbx} subject={open.subject} onReply={replyTo} onLatest={setMessage} onError={fail}
              onLoaded={() => {
                if (open.unread) {
                  setRows((items) => items.map((item) => (item.id === open.id ? { ...item, unread: false } : item)))
                  listCache.clear()
                  refreshFolders()
                }
              }} />
          ) : message ? (
            <div className="space-y-2">
              <h2 className="text-lg font-bold text-gray-800">{message.subject || '(من غير موضوع)'}</h2>
              <MessageCard message={message} mbx={mbx} inThread={false} onReply={replyTo} onError={fail} />
            </div>
          ) : (
            <div className="text-sm text-gray-500 p-4">جاري التحميل…</div>
          )}
        </>
      )}
    </section>
  )

  return (
    <div className="space-y-3" data-mail-client>
      <div className="flex items-start gap-3 flex-wrap">
        <button type="button" className="btn-primary flex items-center gap-2" onClick={() => setCompose({ mode: 'new', to: [], cc: [], bcc: [], subject: '' })}>
          <PenSquare size={16} />
          رسالة جديدة
        </button>
        <div className="flex-1 min-w-[16rem]">
          <SearchBox inputRef={searchBox} value={search} onChange={setSearch} onSubmit={(text) => setQuery(text.trim())}
            onClear={() => { setSearch(''); setQuery(''); setAdv(NO_ADV); setUnreadOnly(false) }}
            adv={adv} onAdv={setAdv} advOpen={advOpen} onToggleAdv={() => setAdvOpen(!advOpen)} unreadOnly={unreadOnly} onUnreadOnly={setUnreadOnly} searching={searching}
            folderLabel={current ? folderName(current) : 'المجلد ده'} myEmail={me[0] ?? ''} matches={typing ? visible.slice(0, 5) : []} onOpenMatch={(id) => setOpenId(id)} />
        </div>
      </div>
      {advOpen && <SearchPanel value={adv} onApply={(next) => { setAdv(next); setAdvOpen(false) }} onClose={() => setAdvOpen(false)} />}
      {notice && (
        <div role="alert" className="bg-red-50 text-red-700 rounded-xl p-3 text-sm flex items-center justify-between gap-3">
          {notice}
          <button type="button" className="text-xs hover:underline" onClick={() => setNotice('')}>إخفاء</button>
        </div>
      )}
      {error ? (
        <div role="alert" className="bg-red-50 text-red-700 rounded-xl p-4">{error}</div>
      ) : (
        <div className="grid gap-3 lg:grid-cols-[14rem_22rem_minmax(0,1fr)] items-start">
          <aside className={`card p-2 space-y-0.5 ${openId ? 'hidden lg:block' : ''}`} data-mail-folders>
            {folders ? folderTree('', folders, 0) : <div className="p-3 text-sm text-gray-500">جاري التحميل…</div>}
            {shared.map((box) => {
              const tree = sharedFolders[box.address]
              const isOpen = expanded.includes(box.address)
              const inboxUnread = tree && tree !== 'error' ? tree.wellKnown.find((item) => item.key === 'inbox')?.unread ?? 0 : 0
              return (
                <div key={box.address} className="pt-1 border-t border-gray-50">
                  <button type="button" className="w-full flex items-center gap-2 px-3 py-1.5 rounded-lg text-sm text-gray-700 hover:bg-gray-50 text-start" onClick={() => toggleShared(box.address)} title={box.address} aria-expanded={isOpen}>
                    {isOpen ? <ChevronDown size={14} /> : <ChevronLeft size={14} className="ltr:rotate-180" />}
                    <span className="truncate flex-1 font-medium">{box.name}</span>
                    {inboxUnread > 0 && <b className="text-xs tabular-nums">{inboxUnread}</b>}
                  </button>
                  {isOpen && tree === 'error' && <div className="px-3 py-1 text-xs text-gray-500">مالكش صلاحية على الصندوق ده على خادم البريد</div>}
                  {isOpen && !tree && <div className="px-3 py-1 text-xs text-gray-500">جاري التحميل…</div>}
                  {isOpen && tree && tree !== 'error' && folderTree(box.address, tree, 1)}
                </div>
              )
            })}
            <label className="flex items-center gap-2 px-3 pt-2 mt-1 border-t border-gray-50 text-xs text-gray-600">
              <input type="checkbox" checked={threadsOn} onChange={() => { store(THREADS_KEY, threadsOn ? '0' : '1'); setThreadsOn(!threadsOn) }} />
              اعرض كمحادثات
            </label>
            <div className="px-3 pb-1 text-[11px] text-gray-400" dir="ltr">c · r · a · f · j/k · # · /</div>
          </aside>
          {list}
          {reader}
        </div>
      )}
      {compose && (
        <Compose key={`${compose.mode}-${compose.refId ?? 'new'}`} draft={compose} mbx={mbx} onClose={() => setCompose(null)} onError={(cause) => { if (isMailLocked(cause)) onLocked(errorText(cause, '')) }}
          onSent={() => {
            setCompose(null)
            setNotice('')
            listCache.clear()
            if (compose.refId) for (const row of rows) dropThread(row.id)
            void loadList(0)
          }} />
      )}
    </div>
  )
}
