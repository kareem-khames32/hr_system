'use client'

// B-ADD.15: اجتماع فوري، أو اجتماع بميعاد (بتوقيت الجهاز)، أو تعديل اجتماع (لصاحبه).
// B-ADD.22: وقت الإنشاء «على مين؟» بالاسم زي الأول، أو بالفلاتر المعتادة (OrgAudienceField: الشركة ← فرع ← إدارة ← قسم ← فريق ← موظفين بالاسم،
// و«الكل ماعدا…» ومعاينة «N موظف») للي معاه صلاحية شاشة من شاشات تحديد الجمهور. الخادم بيحوّل الجمهور لحسابات موظفينه مرة واحدة وقت الإنشاء.
import { useEffect, useRef, useState } from 'react'
import { can, getCurrentUser } from '@/lib/api'
import { createMeeting, fetchMeeting, MEET_AUDIENCE_PERMS, meetErrorText, updateMeeting, type MeetingCreated } from '@/lib/meet-api'
import type { StoredAudience } from '@/lib/org-audience'
import { OrgAudienceField } from '../OrgAudienceField'
import { MeetModal } from './MeetBits'
import PeoplePicker from './PeoplePicker'

export type MeetDialogMode = 'instant' | 'schedule' | 'edit'

/** لحظة ← نص خانة datetime-local بتوقيت الجهاز */
function toLocalInput(value: Date): string {
  const pad = (part: number) => String(part).padStart(2, '0')
  return `${value.getFullYear()}-${pad(value.getMonth() + 1)}-${pad(value.getDate())}T${pad(value.getHours())}:${pad(value.getMinutes())}`
}

export default function MeetDialog({ mode, meetingId, onClose, onDone }: { mode: MeetDialogMode; meetingId?: string; onClose: () => void; onDone: (id: string, created?: MeetingCreated) => void }) {
  const [title, setTitle] = useState(() => (mode === 'instant' ? `اجتماع فوري – ${getCurrentUser()?.displayName ?? ''}` : ''))
  // أقرب نص ساعة جاية
  const [when, setWhen] = useState(() => toLocalInput(new Date(Math.ceil((Date.now() + 5 * 60_000) / 1_800_000) * 1_800_000)))
  const [users, setUsers] = useState<number[]>([])
  // B-ADD.22: الدعوة بالفلاتر — في الإنشاء بس، وللي معاه صلاحية شجرة المنتقي ومعاينته
  const [canAudience] = useState(() => mode !== 'edit' && MEET_AUDIENCE_PERMS.some(can))
  const [byAudience, setByAudience] = useState(false)
  const [audience, setAudience] = useState<StoredAudience | null>(null)
  const [audienceComplete, setAudienceComplete] = useState(true)
  const [lobby, setLobby] = useState(true)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')
  const [loaded, setLoaded] = useState(mode !== 'edit')
  const [wasScheduled, setWasScheduled] = useState(mode === 'schedule')

  const closeRef = useRef(onClose)
  closeRef.current = onClose

  useEffect(() => {
    if (mode !== 'edit' || !meetingId) return
    fetchMeeting(meetingId).then((meeting) => {
      setTitle(meeting.title)
      if (meeting.startsAt) setWhen(toLocalInput(new Date(meeting.startsAt)))
      setWasScheduled(!!meeting.startsAt && meeting.status === 'scheduled')
      setUsers(meeting.invitees?.map((person) => person.id) ?? [])
      setLobby(meeting.lobby)
      setLoaded(true)
    }).catch((cause) => setError(meetErrorText(cause, 'تعذر تحميل الاجتماع')))
  }, [mode, meetingId])

  const scheduled = mode === 'schedule' || (mode === 'edit' && wasScheduled)
  const start = scheduled && when ? new Date(when) : null
  const startsAt = start && !Number.isNaN(start.getTime()) ? start.toISOString() : null
  const valid = !!title.trim() && (!scheduled || (!!startsAt && new Date(startsAt).getTime() > Date.now() - 60_000)) && (!byAudience || audienceComplete)

  const save = async () => {
    if (!valid || busy) return
    setBusy(true)
    setError('')
    try {
      const body = { title: title.trim(), lobby, ...(scheduled ? { startsAt } : {}) }
      if (mode === 'edit' && meetingId) {
        await updateMeeting(meetingId, { ...body, inviteUserIds: users })
        onDone(meetingId)
      } else {
        // المنتقي بيبعت null للشركة كلها: هنا كائن صريح، عشان الخانة الفاضية معناها «من غير فلاتر»
        const created = await createMeeting(byAudience ? { ...body, audience: audience ?? { mode: 'all' } } : { ...body, inviteUserIds: users })
        onDone(created.id, created)
      }
    } catch (cause) {
      setError(meetErrorText(cause, 'تعذر حفظ الاجتماع'))
      setBusy(false)
    }
  }

  const heading = mode === 'instant' ? 'اجتماع فوري' : mode === 'schedule' ? 'اجتماع بميعاد' : 'تعديل الاجتماع'
  const action = mode === 'instant' ? 'ابدأ دلوقتي' : mode === 'schedule' ? 'حدّد الميعاد' : 'حفظ'

  return (
    <MeetModal title={heading} onClose={onClose} wide
      footer={<>
        <button type="button" className="btn-primary disabled:opacity-50" onClick={save} disabled={!valid || busy || !loaded}>{action}</button>
        <button type="button" className="btn-secondary" onClick={onClose}>إلغاء</button>
      </>}>
      <div className="space-y-4">
        {error && <div role="alert" className="rounded-xl bg-red-50 p-3 text-sm text-red-700">{error}</div>}
        <label className="block text-sm text-gray-600">
          عنوان الاجتماع
          <input className="input mt-1" value={title} maxLength={200} onChange={(event) => setTitle(event.target.value)} autoFocus={mode !== 'instant'} />
        </label>
        {scheduled && (
          <label className="block text-sm text-gray-600">
            الميعاد
            <input className="input mt-1" type="datetime-local" value={when} onChange={(event) => setWhen(event.target.value)} />
            <span className="mt-1 block text-xs text-gray-400">بتوقيت جهازك — والاجتماع بيتفتح للدخول قبل ميعاده بربع ساعة</span>
          </label>
        )}
        <div className="text-sm text-gray-600">
          <div className="mb-1 flex flex-wrap items-center justify-between gap-2">
            <span>{canAudience ? 'على مين؟' : 'المدعوين'}</span>
            {canAudience && (
              <div className="inline-flex rounded-lg bg-gray-100 p-0.5 text-xs" role="tablist" aria-label="طريقة الدعوة" data-meet-invite-mode={byAudience ? 'audience' : 'names'}>
                {([[false, 'بالاسم'], [true, 'بالفلاتر']] as const).map(([value, label]) => (
                  <button key={label} type="button" role="tab" aria-selected={byAudience === value} disabled={busy} onClick={() => setByAudience(value)}
                    className={`rounded-md px-3 py-1 ${byAudience === value ? 'bg-white text-gray-800 shadow-sm' : 'text-gray-500 hover:text-gray-700'}`}>
                    {label}
                  </button>
                ))}
              </div>
            )}
          </div>
          {byAudience ? (
            <div data-meet-audience>
              <OrgAudienceField value={audience} disabled={busy} onChange={(next, complete) => { setAudience(next); setAudienceComplete(complete) }} />
              <p className="mt-1 text-xs text-gray-500">كل موظف في الاختيار له حساب على النظام بيتدعى دلوقتي (500 بالكتير) — اللي ينضم للقسم أو الفريق بعد كده مش مدعو، وإنت نفسك مش من المدعوين.</p>
            </div>
          ) : (
            <PeoplePicker userIds={users} onChange={setUsers} />
          )}
        </div>
        <label className="flex cursor-pointer items-start gap-3">
          <input type="checkbox" className="mt-1 h-4 w-4" checked={lobby} onChange={(event) => setLobby(event.target.checked)} />
          <span>
            <strong className="block text-sm text-gray-800">غرفة انتظار</strong>
            <span className="block text-xs text-gray-500">اللي مش مدعو ومعاه اللينك بيطلب الدخول، وإنت توافق أو ترفض. من غيرها أي حد معاه اللينك بيدخل على طول</span>
          </span>
        </label>
      </div>
    </MeetModal>
  )
}
