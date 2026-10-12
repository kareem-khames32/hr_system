'use client'

import { useEffect, useMemo, useState, type KeyboardEvent, type RefObject } from 'react'
import { Check, Mail, Search, SlidersHorizontal, User, X } from 'lucide-react'
import { searchMailContacts, type MailContact } from '@/lib/mail-api'
import { highlight, searchTerms } from './match'

/** لوحة اختيارات البحث */
export interface Adv { from: string; to: string; subject: string; after: string; before: string; attach: boolean; scope: 'folder' | 'all' }
// البحث بيدوّر في كل المجلدات إلا لو الموظف ضيّقه على المجلد ده
export const NO_ADV: Adv = { from: '', to: '', subject: '', after: '', before: '', attach: false, scope: 'all' }

type Suggestion = { kind: 'search'; text: string } | { kind: 'person'; p: MailContact } | { kind: 'message'; id: string; subject: string; who: string }

/** yyyy-mm-dd لليوم ناقص n يوم بتقويم الرياض (نفس توقيت فلتر التاريخ في الخادم) */
function daysAgo(n: number) {
  return new Intl.DateTimeFormat('en-CA', { timeZone: 'Asia/Riyadh' }).format(new Date(Date.now() - n * 86_400_000))
}

/**
 * بحث البريد: القايمة بتتفلتر وإنت بتكتب، وقايمة بتقترح ناس من دليل بريد الشركة والرسايل المطابقة، وشرايح بتضيّق النتايج بضغطة.
 */
export default function SearchBox(props: {
  inputRef: RefObject<HTMLInputElement>
  value: string
  onChange: (v: string) => void
  onSubmit: (v: string) => void
  onClear: () => void
  adv: Adv
  onAdv: (a: Adv) => void
  advOpen: boolean
  onToggleAdv: () => void
  unreadOnly: boolean
  onUnreadOnly: (v: boolean) => void
  searching: boolean
  folderLabel: string
  myEmail: string
  matches: { id: string; subject: string; who: string }[]
  onOpenMatch: (id: string) => void
}) {
  const { value, adv, onAdv } = props
  const [focused, setFocused] = useState(false)
  const [people, setPeople] = useState<MailContact[]>([])
  const [active, setActive] = useState(0)
  const word = value.trim()

  // ناس من دليل بريد الشركة
  useEffect(() => {
    if (word.length < 2 || /:/.test(word)) return setPeople([])
    let live = true
    const id = setTimeout(() => {
      searchMailContacts(word)
        .then((found) => live && setPeople(found.slice(0, 4)))
        .catch(() => undefined)
    }, 150)
    return () => {
      live = false
      clearTimeout(id)
    }
  }, [word])

  const suggestions = useMemo<Suggestion[]>(() => {
    if (!word) return []
    return [{ kind: 'search', text: word }, ...people.map((p) => ({ kind: 'person' as const, p })), ...props.matches.map((m) => ({ kind: 'message' as const, ...m }))]
  }, [word, people, props.matches])
  useEffect(() => setActive(0), [word])

  const terms = useMemo(() => searchTerms(value), [value])
  const showDrop = focused && suggestions.length > 0

  const pick = (s: Suggestion) => {
    if (s.kind === 'search') props.onSubmit(s.text)
    else if (s.kind === 'person') {
      // اختيار شخص بيدوّر على البريد اللي منه
      onAdv({ ...adv, from: s.p.email })
      props.onChange('')
      props.onSubmit('')
    } else props.onOpenMatch(s.id)
    setFocused(false)
    props.inputRef.current?.blur()
  }

  const onKey = (event: KeyboardEvent) => {
    if (event.key === 'ArrowDown' && showDrop) setActive((index) => (index + 1) % suggestions.length)
    else if (event.key === 'ArrowUp' && showDrop) setActive((index) => (index - 1 + suggestions.length) % suggestions.length)
    else if (event.key === 'Enter') {
      if (showDrop && suggestions[active]) pick(suggestions[active])
      else props.onSubmit(value)
    } else if (event.key === 'Escape') {
      setFocused(false)
      props.inputRef.current?.blur()
    } else return
    event.preventDefault()
  }

  const chip = (on: boolean, label: string, toggle: () => void) => (
    <button type="button" className={`inline-flex items-center gap-1 rounded-full px-3 py-1 text-xs ${on ? 'bg-primary-600 text-white' : 'bg-gray-100 text-gray-700 hover:bg-gray-200'}`}
      onMouseDown={(event) => event.preventDefault()} onClick={toggle}>
      {on && <Check size={12} />}
      {label}
    </button>
  )
  const week = daysAgo(7)
  const month = daysAgo(30)
  const fromMe = !!props.myEmail && adv.from.toLowerCase() === props.myEmail.toLowerCase()

  return (
    <div className="relative space-y-2" data-mail-search>
      <div className="flex items-center gap-2 bg-white border border-gray-200 rounded-xl px-3 py-1.5 focus-within:border-primary-500">
        <Search size={16} className="text-gray-400 shrink-0" />
        <input ref={props.inputRef} className="flex-1 min-w-0 py-1 text-sm outline-none bg-transparent" value={value} onChange={(event) => props.onChange(event.target.value)}
          onFocus={() => setFocused(true)} onBlur={() => setTimeout(() => setFocused(false), 120)} onKeyDown={onKey} placeholder="ابحث في البريد (from: / to: / subject:)"
          aria-autocomplete="list" aria-expanded={showDrop} />
        {adv.from && (
          <span className="inline-flex items-center gap-1 bg-gray-100 text-gray-700 rounded-full px-2 py-0.5 text-xs shrink-0">
            من: <span dir="ltr">{adv.from}</span>
            <button type="button" onClick={() => onAdv({ ...adv, from: '' })} aria-label="شيل المرسل">
              <X size={11} />
            </button>
          </span>
        )}
        {(value || props.searching || props.unreadOnly) && (
          <button type="button" className="p-1 rounded hover:bg-gray-100 text-gray-500" onClick={props.onClear} aria-label="امسح البحث">
            <X size={14} />
          </button>
        )}
        <button type="button" className={`p-1 rounded hover:bg-gray-100 ${props.advOpen ? 'text-primary-600' : 'text-gray-500'}`} onClick={props.onToggleAdv} title="اختيارات البحث">
          <SlidersHorizontal size={16} />
        </button>
      </div>

      {showDrop && (
        <div className="absolute top-11 start-0 w-full bg-white border border-gray-100 rounded-xl shadow-lg z-20 overflow-hidden" role="listbox">
          {suggestions.map((s, index) => (
            <div key={s.kind === 'search' ? 's' : s.kind === 'person' ? `p${s.p.email}` : `m${s.id}`} role="option" aria-selected={index === active}
              className={`flex items-center gap-2 px-3 py-2 text-sm cursor-pointer ${index === active ? 'bg-primary-50' : ''}`}
              onMouseDown={(event) => event.preventDefault()} onMouseEnter={() => setActive(index)} onClick={() => pick(s)}>
              {s.kind === 'search' && (
                <>
                  <Search size={14} className="text-gray-400 shrink-0" />
                  <span className="truncate">
                    ابحث عن <b>{s.text}</b>
                  </span>
                  <small className="text-gray-500 ms-auto shrink-0">{adv.scope === 'all' ? 'كل المجلدات' : props.folderLabel}</small>
                </>
              )}
              {s.kind === 'person' && (
                <>
                  <User size={14} className="text-gray-400 shrink-0" />
                  <span className="truncate">
                    {highlight(s.p.displayName, terms)}{' '}
                    <span className="text-gray-500" dir="ltr">
                      &lt;{highlight(s.p.email, terms)}&gt;
                    </span>
                  </span>
                </>
              )}
              {s.kind === 'message' && (
                <>
                  <Mail size={14} className="text-gray-400 shrink-0" />
                  <span className="truncate">
                    <b>{highlight(s.who, terms)}</b> — {highlight(s.subject, terms)}
                  </span>
                </>
              )}
            </div>
          ))}
        </div>
      )}

      {(props.searching || props.unreadOnly || focused) && (
        <div className="flex flex-wrap gap-1.5">
          {chip(adv.scope === 'all', 'كل المجلدات', () => onAdv({ ...adv, scope: adv.scope === 'all' ? 'folder' : 'all' }))}
          {chip(props.unreadOnly, 'غير المقروء', () => props.onUnreadOnly(!props.unreadOnly))}
          {chip(adv.attach, 'بمرفقات', () => onAdv({ ...adv, attach: !adv.attach }))}
          {chip(adv.after === week && !adv.before, 'آخر 7 أيام', () => onAdv({ ...adv, after: adv.after === week ? '' : week, before: '' }))}
          {chip(adv.after === month && !adv.before, 'آخر 30 يوم', () => onAdv({ ...adv, after: adv.after === month ? '' : month, before: '' }))}
          {props.myEmail && chip(fromMe, 'مني', () => onAdv({ ...adv, from: fromMe ? '' : props.myEmail }))}
        </div>
      )}
    </div>
  )
}

/** اختيارات البحث: كل خانة مكتوبة لازم تطابق بالظبط، في المجلد الحالي أو كل المجلدات */
export function SearchPanel({ value, onApply, onClose }: { value: Adv; onApply: (a: Adv) => void; onClose: () => void }) {
  const [a, setA] = useState<Adv>(value)
  const field = (key: 'from' | 'to' | 'subject', label: string) => (
    <label className="block">
      <span className="label">{label}</span>
      <input className="input" value={a[key]} maxLength={200} onChange={(event) => setA({ ...a, [key]: event.target.value })} onKeyDown={(event) => event.key === 'Enter' && onApply(a)} />
    </label>
  )
  return (
    <div className="card space-y-3" data-mail-search-panel>
      <div className="grid gap-3 sm:grid-cols-3">
        {field('from', 'من')}
        {field('to', 'إلى')}
        {field('subject', 'الموضوع')}
      </div>
      <div className="grid gap-3 sm:grid-cols-2">
        <label className="block">
          <span className="label">من تاريخ</span>
          <input className="input" type="date" value={a.after} max={a.before || undefined} onChange={(event) => setA({ ...a, after: event.target.value })} />
        </label>
        <label className="block">
          <span className="label">إلى تاريخ</span>
          <input className="input" type="date" value={a.before} min={a.after || undefined} onChange={(event) => setA({ ...a, before: event.target.value })} />
        </label>
      </div>
      <label className="flex items-center gap-2 text-sm text-gray-700">
        <input type="checkbox" checked={a.attach} onChange={(event) => setA({ ...a, attach: event.target.checked })} />
        بمرفقات بس
      </label>
      <div className="flex items-center gap-2 justify-end">
        <button type="button" className="btn-secondary text-sm" onClick={() => setA({ ...NO_ADV, scope: a.scope })}>
          امسح
        </button>
        <button type="button" className="btn-secondary text-sm" onClick={onClose}>
          إغلاق
        </button>
        <button type="button" className="btn-primary text-sm" onClick={() => onApply(a)}>
          ابحث
        </button>
      </div>
    </div>
  )
}
