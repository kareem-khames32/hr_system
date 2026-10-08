'use client'

// B3.4-ب: «المقابلات» — مسؤول التوظيف بيحدد مقابلة لمرشح بمحاوريها، وبيشوف بطاقات التقييم المسلّمة، وبيقفلها (تمّت) أو يلغيها.
// (كانت شاشة عرض ببيانات وهمية؛ بقت على الخادم.)
import { useCallback, useEffect, useState } from 'react'
import { Calendar, Plus, Star, X } from 'lucide-react'
import { MainLayout } from '@/components/layout'
import EmptyState from '@/components/EmptyState'
import { fetchFileObjectUrl } from '@/lib/api'
import {
  INTERVIEW_MODE_LABELS, closeInterview, fetchInterviewForm, fetchInterviews, interviewWhen, scheduleInterview,
  type ApiInterview, type ApiInterviewForm, type ApiInterviewsList, type InterviewMode, type InterviewStatus,
} from '@/lib/interviews-api'

const statusStyle: Record<InterviewStatus, string> = { SCHEDULED: 'bg-blue-50 text-blue-700', DONE: 'bg-green-50 text-green-700', CANCELLED: 'bg-gray-100 text-gray-600' }

export default function InterviewsPage() {
  const [data, setData] = useState<ApiInterviewsList | null>(null)
  const [form, setForm] = useState<ApiInterviewForm | null>(null)
  const [error, setError] = useState('')
  const [notice, setNotice] = useState('')
  const [adding, setAdding] = useState(false)
  const [busy, setBusy] = useState(0)

  const load = useCallback(() => {
    setError('')
    fetchInterviews()
      .then(setData)
      .catch((cause) => setError(cause instanceof Error ? cause.message : 'تعذر تحميل المقابلات'))
  }, [])
  useEffect(load, [load])
  useEffect(() => {
    fetchInterviewForm().then(setForm).catch(() => setForm(null))
  }, [])

  const close = async (interview: ApiInterview, status: 'DONE' | 'CANCELLED') => {
    setBusy(interview.id)
    setError('')
    try {
      await closeInterview(interview.id, status)
      load()
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'تعذر تغيير حالة المقابلة')
    } finally {
      setBusy(0)
    }
  }
  const openCv = async (fileId: number) => {
    const url = await fetchFileObjectUrl(fileId)
    if (!url) {
      setError('تعذر فتح السيرة الذاتية')
      return
    }
    window.open(url, '_blank', 'noopener')
    setTimeout(() => URL.revokeObjectURL(url), 60000)
  }

  return (
    <MainLayout>
      <div className="space-y-6">
        <div className="flex items-start justify-between gap-3 flex-wrap">
          <div>
            <h1 className="text-2xl font-bold text-gray-800 flex items-center gap-2">
              <Calendar size={24} className="text-primary-600" />
              المقابلات
            </h1>
            <p className="text-gray-500 mt-1">مواعيد مقابلات المرشحين ومحاوريها، وبطاقات التقييم اللي اتسلّمت</p>
          </div>
          {data?.available && (
            <button onClick={() => setAdding(true)} disabled={!form} className="btn-primary flex items-center gap-2 disabled:opacity-50">
              <Plus size={18} />
              تحديد مقابلة
            </button>
          )}
        </div>
        {error && (
          <div role="alert" className="bg-red-50 text-red-700 rounded-xl p-4">
            {error}
          </div>
        )}
        {notice && (
          <div role="status" className="bg-green-50 text-green-800 rounded-xl p-4">
            {notice}
          </div>
        )}
        {data && !data.available && (
          <div role="status" className="bg-amber-50 text-amber-800 rounded-xl p-4">
            {data.message}
          </div>
        )}
        {data?.available && data.interviews.length === 0 && <EmptyState title="مفيش مقابلات محددة لسه" icon={Calendar} />}
        {data?.available && data.interviews.length > 0 && (
          <div className="grid gap-4" data-interviews>
            {data.interviews.map((interview) => (
              <div key={interview.id} className="card space-y-3">
                <div className="flex items-start justify-between gap-3 flex-wrap">
                  <div>
                    <h2 className="text-lg font-bold text-gray-800">{interview.candidateName}</h2>
                    <p className="text-sm text-gray-500 mt-1">
                      {interview.positionTitle ?? '—'} · <span dir="ltr">{interviewWhen(interview.scheduledAt)}</span> · {interview.durationMinutes} دقيقة · {interview.modeLabel}
                      {interview.location ? ` · ${interview.location}` : ''}
                    </p>
                    {interview.notes && <p className="text-sm text-gray-600 mt-1 whitespace-pre-line">{interview.notes}</p>}
                  </div>
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className={`inline-block px-3 py-1 rounded-full text-xs ${statusStyle[interview.status]}`}>{interview.statusLabel}</span>
                    {interview.cvFileId !== null && (
                      <button onClick={() => openCv(interview.cvFileId as number)} className="btn-secondary text-sm">
                        السيرة الذاتية
                      </button>
                    )}
                    {interview.status === 'SCHEDULED' && (
                      <>
                        <button onClick={() => close(interview, 'DONE')} disabled={busy === interview.id} className="btn-primary text-sm disabled:opacity-50">
                          تمّت
                        </button>
                        <button onClick={() => close(interview, 'CANCELLED')} disabled={busy === interview.id} className="btn-secondary text-sm disabled:opacity-50">
                          إلغاء
                        </button>
                      </>
                    )}
                  </div>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  {interview.scorecards.map((card, index) => (
                    <div key={index} className="border border-gray-100 rounded-lg p-3 text-sm">
                      <div className="flex items-center justify-between gap-2">
                        <span className="font-medium text-gray-800">{card.interviewerName ?? 'محاور'}</span>
                        {card.submitted ? (
                          <span className="inline-flex items-center gap-1 text-amber-600">
                            <Star size={14} />
                            {card.rating} / 5 · {card.recommendationLabel}
                          </span>
                        ) : (
                          <span className="text-gray-400">لسه ماسلّمش البطاقة</span>
                        )}
                      </div>
                      {card.notes && <p className="text-gray-600 mt-2 whitespace-pre-line">{card.notes}</p>}
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
      {adding && form && (
        <ScheduleModal
          form={form}
          onClose={() => setAdding(false)}
          onDone={(made) => {
            setAdding(false)
            setNotice(made.invited ? `المقابلة اتحددت، واتبعتت ${made.invited} دعوة بالبريد.` : 'المقابلة اتحددت (من غير دعوات بريد).')
            load()
          }}
        />
      )}
    </MainLayout>
  )
}

function ScheduleModal({ form, onClose, onDone }: { form: ApiInterviewForm; onClose: () => void; onDone: (made: ApiInterview) => void }) {
  const [candidateId, setCandidateId] = useState('')
  const [date, setDate] = useState('')
  const [time, setTime] = useState('10:00')
  const [duration, setDuration] = useState('60')
  const [mode, setMode] = useState<InterviewMode>('ONSITE')
  const [location, setLocation] = useState('')
  const [notes, setNotes] = useState('')
  const [panel, setPanel] = useState<number[]>([])
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')

  const durationOk = /^\d{2,3}$/.test(duration.trim()) && Number(duration) >= 15 && Number(duration) <= 480
  const valid = candidateId !== '' && date !== '' && /^\d{2}:\d{2}$/.test(time) && durationOk && panel.length >= 1 && panel.length <= 8
  const toggle = (id: number) => setPanel((prev) => (prev.includes(id) ? prev.filter((item) => item !== id) : [...prev, id]))

  const submit = async () => {
    setSaving(true)
    setError('')
    try {
      onDone(await scheduleInterview({
        candidateId: Number(candidateId), scheduledAt: `${date}T${time}`, durationMinutes: Number(duration), mode,
        ...(location.trim() ? { location: location.trim() } : {}), ...(notes.trim() ? { notes: notes.trim() } : {}), interviewerEmployeeIds: panel,
      }))
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'تعذر تحديد المقابلة')
      setSaving(false)
    }
  }

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50" role="dialog" aria-modal="true" aria-label="تحديد مقابلة">
      <div className="bg-white rounded-2xl w-full max-w-2xl mx-4 max-h-[90vh] overflow-auto">
        <div className="p-6 border-b border-gray-100 flex items-center justify-between">
          <h2 className="text-xl font-bold text-gray-800">تحديد مقابلة</h2>
          <button onClick={onClose} className="p-2 hover:bg-gray-100 rounded-lg" aria-label="إغلاق">
            <X size={20} />
          </button>
        </div>
        <div className="p-6 space-y-4">
          {error && (
            <div role="alert" className="bg-red-50 text-red-700 rounded-xl p-3 text-sm">
              {error}
            </div>
          )}
          <label className="block text-sm text-gray-700">
            المرشح
            <select className="input w-full mt-1" value={candidateId} onChange={(e) => setCandidateId(e.target.value)}>
              <option value="">اختر المرشح</option>
              {form.candidates.map((row) => (
                <option key={row.id} value={row.id}>
                  {row.fullName} · {row.positionTitle}
                </option>
              ))}
            </select>
          </label>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
            <label className="block text-sm text-gray-700 col-span-2 sm:col-span-1">
              التاريخ
              <input type="date" className="input w-full mt-1" value={date} onChange={(e) => setDate(e.target.value)} />
            </label>
            <label className="block text-sm text-gray-700">
              الساعة
              <input type="time" className="input w-full mt-1" value={time} onChange={(e) => setTime(e.target.value)} />
            </label>
            <label className="block text-sm text-gray-700">
              المدة (دقيقة)
              <input type="number" min={15} max={480} className="input w-full mt-1" value={duration} onChange={(e) => setDuration(e.target.value)} />
            </label>
            <label className="block text-sm text-gray-700 col-span-2 sm:col-span-1">
              النوع
              <select className="input w-full mt-1" value={mode} onChange={(e) => setMode(e.target.value as InterviewMode)}>
                {(Object.keys(INTERVIEW_MODE_LABELS) as InterviewMode[]).map((key) => (
                  <option key={key} value={key}>
                    {INTERVIEW_MODE_LABELS[key]}
                  </option>
                ))}
              </select>
            </label>
          </div>
          <label className="block text-sm text-gray-700">
            المكان أو رابط الاجتماع (اختياري)
            <input className="input w-full mt-1" maxLength={300} value={location} onChange={(e) => setLocation(e.target.value)} />
          </label>
          <div>
            <p className="text-sm text-gray-700 mb-1">المحاورين ({panel.length} من 8)</p>
            <div className="border border-gray-200 rounded-lg max-h-44 overflow-auto divide-y divide-gray-100">
              {form.interviewers.map((row) => (
                <label key={row.id} className="flex items-center gap-2 px-3 py-2 text-sm text-gray-700 cursor-pointer hover:bg-gray-50">
                  <input type="checkbox" checked={panel.includes(row.id)} onChange={() => toggle(row.id)} />
                  <span>{row.fullName}</span>
                  <span className="text-xs text-gray-400">{row.employeeCode}</span>
                </label>
              ))}
              {form.interviewers.length === 0 && <p className="px-3 py-2 text-sm text-gray-500">مفيش موظفين في نطاق فروعك.</p>}
            </div>
            <p className="text-xs text-gray-500 mt-1">كل محاور بيسلّم بطاقته من «مقابلاتي»، ومابيشوفش بطاقات غيره قبل ما يسلّم.</p>
          </div>
          <label className="block text-sm text-gray-700">
            ملاحظات للمحاورين (اختياري)
            <textarea className="input w-full mt-1" rows={2} maxLength={1000} value={notes} onChange={(e) => setNotes(e.target.value)} />
          </label>
        </div>
        <div className="p-6 border-t border-gray-100 flex justify-end gap-2">
          <button onClick={onClose} className="btn-secondary">
            إلغاء
          </button>
          <button onClick={submit} disabled={!valid || saving} title="المرشح والموعد ومحاور واحد على الأقل مطلوبين" className="btn-primary disabled:opacity-50">
            تحديد المقابلة
          </button>
        </div>
      </div>
    </div>
  )
}
