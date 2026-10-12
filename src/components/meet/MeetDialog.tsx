'use client'

// B-ADD.15: اجتماع فوري، أو اجتماع بميعاد (بتوقيت الجهاز)، أو تعديل اجتماع (لصاحبه).
import { useEffect, useRef, useState } from 'react'
import { getCurrentUser } from '@/lib/api'
import { createMeeting, fetchMeeting, meetErrorText, updateMeeting } from '@/lib/meet-api'
import { MeetModal } from './MeetBits'
import PeoplePicker from './PeoplePicker'

export type MeetDialogMode = 'instant' | 'schedule' | 'edit'

/** لحظة ← نص خانة datetime-local بتوقيت الجهاز */
function toLocalInput(value: Date): string {
  const pad = (part: number) => String(part).padStart(2, '0')
  return `${value.getFullYear()}-${pad(value.getMonth() + 1)}-${pad(value.getDate())}T${pad(value.getHours())}:${pad(value.getMinutes())}`
}

export default function MeetDialog({ mode, meetingId, onClose, onDone }: { mode: MeetDialogMode; meetingId?: string; onClose: () => void; onDone: (id: string) => void }) {
  const [title, setTitle] = useState(() => (mode === 'instant' ? `اجتماع فوري – ${getCurrentUser()?.displayName ?? ''}` : ''))
  // أقرب نص ساعة جاية
  const [when, setWhen] = useState(() => toLocalInput(new Date(Math.ceil((Date.now() + 5 * 60_000) / 1_800_000) * 1_800_000)))
  const [users, setUsers] = useState<number[]>([])
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
  const valid = !!title.trim() && (!scheduled || (!!startsAt && new Date(startsAt).getTime() > Date.now() - 60_000))

  const save = async () => {
    if (!valid || busy) return
    setBusy(true)
    setError('')
    try {
      const body = { title: title.trim(), inviteUserIds: users, lobby, ...(scheduled ? { startsAt } : {}) }
      if (mode === 'edit' && meetingId) {
        await updateMeeting(meetingId, body)
        onDone(meetingId)
      } else {
        onDone((await createMeeting(body)).id)
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
          <span className="mb-1 block">المدعوين</span>
          <PeoplePicker userIds={users} onChange={setUsers} />
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
