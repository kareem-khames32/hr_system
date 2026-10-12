'use client'

// B-ADD.15: منتقي المدعوين — الحسابات النشطة بالاسم والمسمى الوظيفي (GET /meet/directory، مرة لكل تحميل صفحة).
// المطابقة بنفس تطبيع بحث الموظفين (الإملاء العربي) من src/lib/employee-search.ts.
import { useEffect, useMemo, useState } from 'react'
import { Plus, Search, X } from 'lucide-react'
import { normalizeSearchText } from '@/lib/employee-search'
import { fetchMeetDirectory, meetErrorText, type MeetPerson } from '@/lib/meet-api'
import { MeetAvatar } from './MeetBits'

let cache: Promise<MeetPerson[]> | null = null
function loadDirectory(): Promise<MeetPerson[]> {
  cache ??= fetchMeetDirectory().then((directory) => directory.users).catch((error) => {
    cache = null
    throw error
  })
  return cache
}

export default function PeoplePicker({ userIds, onChange }: { userIds: number[]; onChange: (userIds: number[]) => void }) {
  const [people, setPeople] = useState<MeetPerson[] | null>(null)
  const [error, setError] = useState('')
  const [query, setQuery] = useState('')

  useEffect(() => {
    loadDirectory().then(setPeople).catch((cause) => setError(meetErrorText(cause, 'تعذر تحميل قايمة الأسماء')))
  }, [])

  const byId = useMemo(() => new Map((people ?? []).map((person) => [person.id, person])), [people])
  const results = useMemo(() => {
    if (!people) return []
    const wanted = normalizeSearchText(query)
    return people.filter((person) => !userIds.includes(person.id) && (!wanted || normalizeSearchText(`${person.displayName} ${person.alias ?? ''} ${person.jobTitle ?? ''}`).includes(wanted))).slice(0, wanted ? 40 : 20)
  }, [people, query, userIds])

  return (
    <div className="space-y-2">
      {userIds.length > 0 && (
        <div className="flex flex-wrap gap-1.5">
          {userIds.map((id) => (
            <span key={id} className="inline-flex items-center gap-1 rounded-full bg-primary-50 px-2.5 py-1 text-xs text-primary-700">
              {byId.get(id)?.displayName ?? '…'}
              <button type="button" onClick={() => onChange(userIds.filter((other) => other !== id))} aria-label="شيل من المدعوين" className="rounded-full p-0.5 hover:bg-primary-100">
                <X size={12} />
              </button>
            </span>
          ))}
        </div>
      )}
      <div className="flex items-center gap-2 rounded-xl border border-gray-200 px-3 py-2">
        <Search size={16} className="text-gray-400" />
        <input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="دوّر بالاسم أو المسمى الوظيفي" aria-label="دوّر بالاسم أو المسمى الوظيفي"
          className="w-full bg-transparent text-sm focus:outline-none" />
      </div>
      <div className="max-h-56 overflow-auto rounded-xl border border-gray-100" role="listbox" aria-label="الأسماء">
        {error && <div className="p-3 text-sm text-red-700">{error}</div>}
        {!people && !error && <div className="p-3 text-sm text-gray-500">جاري التحميل…</div>}
        {people && !results.length && <div className="p-3 text-sm text-gray-500">مفيش نتايج</div>}
        {results.map((person) => (
          <button key={person.id} type="button" role="option" aria-selected="false" onClick={() => onChange([...userIds, person.id])}
            className="flex w-full items-center gap-3 px-3 py-2 text-start hover:bg-gray-50">
            <MeetAvatar id={person.id} name={person.displayName} size={30} />
            <span className="min-w-0 flex-1">
              <strong className="block truncate text-sm text-gray-800">{person.displayName}</strong>
              {person.jobTitle && <span className="block truncate text-xs text-gray-500">{person.jobTitle}</span>}
            </span>
            <Plus size={16} className="text-gray-400" />
          </button>
        ))}
      </div>
    </div>
  )
}
