'use client'

// B-ADD.23: «الاتصال» — مكالمة صوت جوه النظام برقم التحويلة (لوحة أرقام) أو بالاسم، وآخر مكالماتي. المكالمة نفسها عند MeetSessionProvider
// (في الإطار الدائم): بترن عند الطرف التاني في أي شاشة، وبتكمّل في نافذة صغيرة في الركن — مالهاش صفحة. من غير سنترال ولا أرقام تليفونات.
import { useCallback, useEffect, useMemo, useState } from 'react'
import Link from 'next/link'
import { Delete, Phone, PhoneIncoming, PhoneMissed, PhoneOff, PhoneOutgoing, Search, Video } from 'lucide-react'
import { MainLayout } from '@/components/layout'
import EmptyState from '@/components/EmptyState'
import { formatDateTime } from '@/lib/dates'
import { normalizeSearchText } from '@/lib/employee-search'
import {
  CALL_NOT_READY_TEXT, CALL_PRIVACY_TEXT, callPersonLine, fetchCalls, fetchMeetDirectory, MEET_BASE, MEET_INSECURE_TEXT, MEET_NOT_CONFIGURED_TEXT, meetErrorText,
  type CallEntry, type CallList, type CallState, type CallTarget, type MeetPerson,
} from '@/lib/meet-api'
import { MeetAvatar } from '@/components/meet/MeetBits'
import { useMeetSession } from '@/components/meet/MeetSession'

const STATE: Record<CallState, { label: string; style: string }> = {
  ringing: { label: 'بترن', style: 'bg-blue-50 text-blue-700' },
  active: { label: 'شغالة دلوقتي', style: 'bg-green-50 text-green-700' },
  answered: { label: 'اتردّ عليها', style: 'bg-gray-100 text-gray-600' },
  missed: { label: 'ماتردّش عليها', style: 'bg-amber-50 text-amber-700' },
  rejected: { label: 'اترفضت', style: 'bg-red-50 text-red-700' },
}
const KEYS = ['1', '2', '3', '4', '5', '6', '7', '8', '9', '', '0'] as const
const EXTENSION_MAX = 10
const REFRESH_MS = 30_000
// الأرقام العربية والفارسية بتتكتب أرقام عادية (زي خانة التحويلة في ملف الموظف)
const digitsOnly = (text: string) => text.replace(/[٠-٩]/g, (digit) => String(digit.charCodeAt(0) - 0x0660)).replace(/[۰-۹]/g, (digit) => String(digit.charCodeAt(0) - 0x06f0)).replace(/\D/g, '').slice(0, EXTENSION_MAX)

function durationText(seconds: number): string {
  const mm = String(Math.floor(seconds / 60)).padStart(2, '0'), ss = String(seconds % 60).padStart(2, '0')
  return `${mm}:${ss}`
}

export default function CallsPage() {
  const session = useMeetSession()
  const [data, setData] = useState<CallList | null>(null)
  const [people, setPeople] = useState<MeetPerson[] | null>(null)
  const [error, setError] = useState('')
  const [number, setNumber] = useState('')
  const [query, setQuery] = useState('')
  const [busy, setBusy] = useState(false)
  const [insecure, setInsecure] = useState(false)
  useEffect(() => { setInsecure(!window.isSecureContext) }, [])

  const load = useCallback(() => {
    fetchCalls().then(setData).catch((cause) => setError(meetErrorText(cause, 'تعذر تحميل المكالمات')))
  }, [])
  useEffect(() => {
    const timer = setInterval(() => { if (document.visibilityState === 'visible') load() }, REFRESH_MS)
    return () => clearInterval(timer)
  }, [load])
  // أول ما الشاشة تتفتح، وكل ما مكالمة تبدأ أو تخلص في التبويب: السجل بيتحدّث
  const inCall = session.call?.id ?? ''
  useEffect(() => { load() }, [inCall, load])

  const usable = !!data?.ready && !!data.configured
  useEffect(() => {
    if (!usable || people) return
    fetchMeetDirectory().then((directory) => setPeople(directory.users)).catch((cause) => setError(meetErrorText(cause, 'تعذر تحميل قايمة الأسماء')))
  }, [usable, people])

  const call = async (target: CallTarget) => {
    if (busy) return
    setBusy(true)
    setError('')
    try {
      await session.dial(target)
      setNumber('')
    } catch (cause) {
      setError(meetErrorText(cause, 'تعذر الاتصال'))
    } finally {
      setBusy(false)
    }
  }

  const matches = useMemo(() => {
    const wanted = normalizeSearchText(query)
    if (!people || !wanted) return []
    return people.filter((person) => normalizeSearchText(`${person.displayName} ${person.alias ?? ''} ${person.jobTitle ?? ''}`).includes(wanted)).slice(0, 30)
  }, [people, query])

  const blocked = busy || !!session.call
  const callIcon = (entry: CallEntry) => (entry.state === 'missed' || entry.state === 'rejected' ? <PhoneMissed size={20} /> : entry.direction === 'out' ? <PhoneOutgoing size={20} /> : <PhoneIncoming size={20} />)
  const smallCall = 'btn-secondary inline-flex items-center gap-1.5 !px-3 !py-1.5 text-sm disabled:opacity-50'

  return (
    <MainLayout>
      <div className="space-y-6">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <h1 className="flex items-center gap-2 text-2xl font-bold text-gray-800">
              <Phone size={24} className="text-primary-600" />
              الاتصال
            </h1>
            <p className="mt-1 text-gray-500">مكالمة صوت جوه النظام برقم التحويلة أو بالاسم — بترن عند زميلك وهو فاتح النظام</p>
          </div>
          <Link href={MEET_BASE} className="btn-secondary inline-flex items-center gap-2"><Video size={18} /> الاجتماعات</Link>
        </div>

        {insecure && <div role="alert" className="rounded-xl bg-amber-50 p-4 text-sm text-amber-800">{MEET_INSECURE_TEXT}</div>}
        {error && <div role="alert" className="rounded-xl bg-red-50 p-4 text-red-700" data-call-error>{error}</div>}

        {data && !data.ready && <EmptyState title={CALL_NOT_READY_TEXT} icon={PhoneOff} />}
        {data && data.ready && !data.configured && (
          <div className="card px-6 py-12 text-center">
            <PhoneOff size={48} className="mx-auto mb-4 text-gray-300" />
            <p className="font-semibold text-gray-700">{MEET_NOT_CONFIGURED_TEXT}</p>
            <p className="mt-1 text-sm text-gray-500">الاتصال شغال على خادم الاجتماعات نفسه — كلّم مدير النظام</p>
          </div>
        )}
        {!data && !error && <div className="flex justify-center py-16"><div className="h-8 w-8 animate-spin rounded-full border-2 border-primary-500 border-t-transparent" /></div>}

        {usable && data && (
          <>
            <div className="grid gap-6 lg:grid-cols-2">
              <section className="card space-y-4" data-call-pad>
                <h2 className="text-sm font-semibold text-gray-500">برقم التحويلة</h2>
                {data.extensions ? (
                  <form className="mx-auto max-w-xs space-y-3" onSubmit={(event) => { event.preventDefault(); if (number) void call({ extension: number }) }}>
                    <input className="input text-center font-mono text-2xl tracking-widest" dir="ltr" inputMode="numeric" autoComplete="off" placeholder="1001" aria-label="رقم التحويلة"
                      value={number} maxLength={EXTENSION_MAX} onChange={(event) => setNumber(digitsOnly(event.target.value))} />
                    <div className="grid grid-cols-3 gap-2" dir="ltr">
                      {KEYS.map((key, index) => (key ? (
                        <button key={key} type="button" className="rounded-xl bg-gray-100 py-3 font-mono text-xl text-gray-800 hover:bg-gray-200" onClick={() => setNumber((current) => digitsOnly(current + key))}>{key}</button>
                      ) : <span key={`gap-${index}`} />))}
                      <button type="button" className="inline-flex items-center justify-center rounded-xl bg-gray-100 py-3 text-gray-600 hover:bg-gray-200" onClick={() => setNumber((current) => current.slice(0, -1))} aria-label="امسح رقم">
                        <Delete size={20} />
                      </button>
                    </div>
                    <button type="submit" className="btn-primary inline-flex w-full items-center justify-center gap-2 disabled:opacity-50" disabled={!number || blocked} data-call-dial>
                      <Phone size={18} /> اتصال
                    </button>
                  </form>
                ) : (
                  <p className="rounded-xl bg-amber-50 p-3 text-sm text-amber-800">الاتصال برقم التحويلة محتاج ترحيل 188 (خانة رقم التحويلة) — اتصل بالاسم لحد ما يتطبق</p>
                )}
              </section>

              <section className="card space-y-3" data-call-names>
                <h2 className="text-sm font-semibold text-gray-500">بالاسم</h2>
                <div className="flex items-center gap-2 rounded-xl border border-gray-200 px-3 py-2">
                  <Search size={16} className="text-gray-400" />
                  <input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="دوّر بالاسم أو المسمى الوظيفي" aria-label="دوّر بالاسم أو المسمى الوظيفي" className="w-full bg-transparent text-sm focus:outline-none" />
                </div>
                <div className="max-h-72 overflow-auto rounded-xl border border-gray-100">
                  {!people && <div className="p-3 text-sm text-gray-500">جاري التحميل…</div>}
                  {people && !query.trim() && <div className="p-3 text-sm text-gray-500">اكتب اسم زميلك عشان تتصل بيه</div>}
                  {people && query.trim() && !matches.length && <div className="p-3 text-sm text-gray-500">مفيش نتايج</div>}
                  {matches.map((person) => (
                    <div key={person.id} className="flex items-center gap-3 px-3 py-2">
                      <MeetAvatar id={person.id} name={person.displayName} size={30} />
                      <span className="min-w-0 flex-1">
                        <strong className="block truncate text-sm text-gray-800">{person.displayName}</strong>
                        {person.jobTitle && <span className="block truncate text-xs text-gray-500">{person.jobTitle}</span>}
                      </span>
                      <button type="button" className={smallCall} disabled={blocked} onClick={() => void call({ userId: person.id })}><Phone size={14} /> اتصال</button>
                    </div>
                  ))}
                </div>
              </section>
            </div>

            <section className="space-y-3" data-call-log>
              <h2 className="text-sm font-semibold text-gray-500">آخر المكالمات</h2>
              {!data.calls.length && <EmptyState title="مفيش مكالمات لسه" icon={Phone} />}
              <div className="grid gap-3">
                {data.calls.map((entry) => (
                  <div key={entry.id} className="card flex flex-wrap items-center gap-4 p-4" data-call={entry.state}>
                    <div className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-xl ${entry.state === 'missed' || entry.state === 'rejected' ? 'bg-amber-50 text-amber-600' : 'bg-gray-100 text-gray-500'}`}>{callIcon(entry)}</div>
                    <div className="min-w-0 flex-1">
                      <strong className="block truncate text-gray-800">{entry.person.displayName}</strong>
                      <span className="block text-sm text-gray-500">
                        {entry.direction === 'out' ? 'إنت اتصلت' : 'اتصل بيك'} · {formatDateTime(entry.startedAt)}{callPersonLine(entry.person) ? ` · ${callPersonLine(entry.person)}` : ''}
                      </span>
                      <span className="mt-1 flex flex-wrap items-center gap-2">
                        <span className={`badge ${STATE[entry.state].style}`}>{STATE[entry.state].label}</span>
                        {entry.durationSeconds !== null && <span className="text-xs text-gray-500" dir="ltr">{durationText(entry.durationSeconds)}</span>}
                      </span>
                    </div>
                    <button type="button" className={smallCall} disabled={blocked} onClick={() => void call({ userId: entry.person.id })}><Phone size={14} /> اتصال</button>
                  </div>
                ))}
              </div>
              <p className="text-xs text-gray-400">{CALL_PRIVACY_TEXT} · الرنة {data.ringSeconds} ثانية وبعدها المكالمة بتتسجّل «ماتردّش عليها»</p>
            </section>
          </>
        )}
      </div>
    </MainLayout>
  )
}
