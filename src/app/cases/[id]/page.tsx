'use client'

// B3.11: ملف قضية (للمطّلعين عليه بس) — الأطراف والمطّلعين والمحقق، والخط الزمني (إفادات، أدلة بمرفق، جلسات، إخطار ومحضر دفاع)، والقرار والإقفال.
// الخط الزمني بيتزوّد بس، والخادم بيحكم كل إجراء (العضوية، وتعارض المصالح، وشروط القرار).
import { useEffect, useMemo, useState } from 'react'
import Link from 'next/link'
import { useParams } from 'next/navigation'
import { Scale } from 'lucide-react'
import { MainLayout } from '@/components/layout'
import { fetchEmployees, fetchFileObjectUrl, type ApiEmployee } from '@/lib/api'
import { formatDate } from '@/lib/dates'
import {
  CASE_EVENT_LABELS, CASE_OUTCOME_LABELS, CASE_ROLE_LABELS, addCaseEvent, addCaseHandler, addCaseParty, closeCase, decideCase, fetchCaseFile, setCaseInvestigator, uploadCaseFile,
  type ApiCaseFile, type CaseEventKind, type CaseOutcome, type CasePartyRole,
} from '@/lib/cases-api'

export default function CaseFilePage() {
  const params = useParams<{ id: string }>()
  const id = Number(params?.id)
  const [file, setFile] = useState<ApiCaseFile | null>(null)
  const [employees, setEmployees] = useState<ApiEmployee[]>([])
  const [error, setError] = useState('')
  const [info, setInfo] = useState('')
  const [busy, setBusy] = useState(false)
  const [kind, setKind] = useState<CaseEventKind>('NOTE')
  const [body, setBody] = useState('')
  const [eventEmployee, setEventEmployee] = useState(0)
  const [attachment, setAttachment] = useState<File | null>(null)
  const [member, setMember] = useState(0)
  const [role, setRole] = useState<CasePartyRole>('WITNESS')
  const [outcome, setOutcome] = useState<CaseOutcome>('DISMISSED')
  const [note, setNote] = useState('')

  useEffect(() => {
    if (!Number.isSafeInteger(id) || id < 1) {
      setError('القضية غير موجودة')
      return
    }
    fetchCaseFile(id).then(setFile).catch((cause) => setError(cause instanceof Error ? cause.message : 'تعذر تحميل ملف القضية'))
    fetchEmployees().then(setEmployees).catch(() => setEmployees([]))
  }, [id])

  const run = async (work: () => Promise<ApiCaseFile>, done: string) => {
    setBusy(true)
    setError('')
    setInfo('')
    try {
      setFile(await work())
      setInfo(done)
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'تعذر تنفيذ الإجراء')
    } finally {
      setBusy(false)
    }
  }
  const needsParty = kind === 'STATEMENT' || kind === 'DEFENSE'
  const partyOptions = useMemo(() => (file?.parties ?? []).filter((row) => row.employeeId != null && (kind !== 'DEFENSE' || row.role === 'RESPONDENT')), [file, kind])
  const addEvent = () => run(async () => {
    const uploaded = attachment ? await uploadCaseFile(attachment) : null
    const made = await addCaseEvent(id, { kind, body: body.trim(), ...(needsParty && eventEmployee ? { employeeId: eventEmployee } : {}), ...(uploaded ? { fileId: uploaded.id } : {}) })
    setBody('')
    setAttachment(null)
    return made
  }, 'اتسجّل الحدث في الخط الزمني.')
  const openAttachment = async (fileId: number) => {
    const url = await fetchFileObjectUrl(fileId)
    if (url) window.open(url, '_blank', 'noopener')
    else setError('تعذر فتح المرفق')
  }
  const closed = file?.status === 'CLOSED'

  return (
    <MainLayout>
      <div className="space-y-6">
        <div>
          <Link href="/cases" className="text-sm text-primary-600 hover:underline">
            ← الشكاوى والتحقيقات
          </Link>
          <h1 className="text-2xl font-bold text-gray-800 flex items-center gap-2 mt-2">
            <Scale size={24} className="text-primary-600" />
            {file ? file.title : 'ملف قضية'}
          </h1>
          {file && (
            <p className="text-gray-500 mt-1">
              {file.kindLabel} · {file.statusLabel} · فُتحت {formatDate(file.openedAt)}
              {file.fromRequest ? ' · من طلب' : ''}
              {file.investigatorName ? ` · المحقق: ${file.investigatorName}` : ''}
              {file.outcomeLabel ? ` · القرار: ${file.outcomeLabel}` : ''}
            </p>
          )}
        </div>
        {error && (
          <div role="alert" className="bg-red-50 text-red-700 rounded-xl p-4">
            {error}
          </div>
        )}
        {info && (
          <div role="status" className="bg-green-50 text-green-800 rounded-xl p-4">
            {info}
          </div>
        )}
        {file && (
          <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">
            <div className="xl:col-span-2 space-y-4">
              {file.description && <div className="card text-sm text-gray-700 whitespace-pre-wrap">{file.description}</div>}
              <div className="card space-y-3" data-timeline>
                <h2 className="font-bold text-gray-800">الخط الزمني</h2>
                {file.events.length === 0 && <p className="text-sm text-gray-500">مفيش أحداث لسه.</p>}
                {file.events.map((entry) => (
                  <div key={entry.id} className="border-r-2 border-primary-200 pr-3">
                    <p className="text-xs text-gray-500">
                      {entry.kindLabel}
                      {entry.employeeName ? ` — ${entry.employeeName}` : ''} · {entry.byName ?? 'النظام'} · {formatDate(entry.at)}
                    </p>
                    <p className="text-sm text-gray-800 whitespace-pre-wrap mt-1">{entry.body}</p>
                    {entry.file && (
                      <button onClick={() => openAttachment(entry.file!.id)} className="text-xs text-primary-600 hover:underline mt-1">
                        مرفق: {entry.file.name}
                      </button>
                    )}
                  </div>
                ))}
              </div>
              {!closed && (
                <div className="card space-y-3" data-add-event>
                  <h2 className="font-bold text-gray-800">إضافة للخط الزمني</h2>
                  <div className="flex items-end gap-3 flex-wrap">
                    <label className="text-sm text-gray-600">
                      النوع
                      <select className="input mt-1" value={kind} onChange={(e) => { setKind(e.target.value as CaseEventKind); setEventEmployee(0) }}>
                        {(Object.keys(CASE_EVENT_LABELS) as CaseEventKind[]).map((key) => (
                          <option key={key} value={key}>
                            {CASE_EVENT_LABELS[key]}
                          </option>
                        ))}
                      </select>
                    </label>
                    {needsParty && (
                      <label className="text-sm text-gray-600">
                        صاحبها
                        <select className="input mt-1" value={eventEmployee} onChange={(e) => setEventEmployee(Number(e.target.value))}>
                          <option value={0}>اختار طرف</option>
                          {partyOptions.map((row) => (
                            <option key={row.id} value={row.employeeId ?? 0}>
                              {row.employeeName} ({row.roleLabel})
                            </option>
                          ))}
                        </select>
                      </label>
                    )}
                    <label className="text-sm text-gray-600">
                      مرفق (اختياري)
                      <input type="file" className="block mt-1 text-xs" onChange={(e) => setAttachment(e.target.files?.[0] ?? null)} />
                    </label>
                  </div>
                  <textarea className="input w-full text-sm" rows={4} maxLength={10000} placeholder="النص (محضر، إفادة، وصف الدليل…)" value={body} onChange={(e) => setBody(e.target.value)} />
                  <button onClick={addEvent} disabled={busy || !body.trim() || (needsParty && !eventEmployee)} className="btn-primary text-sm disabled:opacity-50">
                    تسجيل
                  </button>
                </div>
              )}
            </div>
            <div className="space-y-4">
              <div className="card space-y-2">
                <h2 className="font-bold text-gray-800">الأطراف</h2>
                {file.parties.length === 0 && <p className="text-sm text-gray-500">مفيش أطراف لسه.</p>}
                {file.parties.map((row) => (
                  <p key={row.id} className="text-sm text-gray-700">
                    {row.employeeName} <span className="text-xs text-gray-400">· {row.roleLabel}</span>
                  </p>
                ))}
                <h2 className="font-bold text-gray-800 pt-2">المطّلعين على الملف</h2>
                {file.handlers.map((row, index) => (
                  <p key={index} className="text-sm text-gray-700">
                    {row.name}
                    {row.investigator ? <span className="text-xs text-primary-600"> · المحقق</span> : null}
                  </p>
                ))}
              </div>
              {!closed && (
                <div className="card space-y-3" data-members>
                  <h2 className="font-bold text-gray-800">إضافة طرف أو مطّلع</h2>
                  <select className="input w-full" value={member} onChange={(e) => setMember(Number(e.target.value))}>
                    <option value={0}>اختار موظف</option>
                    {employees.map((employee) => (
                      <option key={employee.id} value={employee.id}>
                        {employee.fullName}
                      </option>
                    ))}
                  </select>
                  <div className="flex items-center gap-2 flex-wrap">
                    <select className="input" value={role} onChange={(e) => setRole(e.target.value as CasePartyRole)} aria-label="دور الطرف">
                      {(Object.keys(CASE_ROLE_LABELS) as CasePartyRole[]).map((key) => (
                        <option key={key} value={key}>
                          {CASE_ROLE_LABELS[key]}
                        </option>
                      ))}
                    </select>
                    <button onClick={() => run(() => addCaseParty(id, member, role), 'اتضاف الطرف.')} disabled={busy || !member} className="btn-secondary text-sm disabled:opacity-50">
                      طرف
                    </button>
                  </div>
                  <div className="flex items-center gap-2 flex-wrap">
                    <button onClick={() => run(() => addCaseHandler(id, member), 'اتضاف مطّلع على الملف.')} disabled={busy || !member} className="btn-secondary text-sm disabled:opacity-50">
                      مطّلع
                    </button>
                    <button onClick={() => run(() => setCaseInvestigator(id, member), 'اتعيّن المحقق.')} disabled={busy || !member} className="btn-secondary text-sm disabled:opacity-50">
                      محقق
                    </button>
                  </div>
                </div>
              )}
              {!closed && (
                <div className="card space-y-3" data-decision>
                  <h2 className="font-bold text-gray-800">القرار</h2>
                  <select className="input w-full" value={outcome} onChange={(e) => setOutcome(e.target.value as CaseOutcome)}>
                    {(Object.keys(CASE_OUTCOME_LABELS) as CaseOutcome[]).map((key) => (
                      <option key={key} value={key}>
                        {CASE_OUTCOME_LABELS[key]}
                      </option>
                    ))}
                  </select>
                  <textarea className="input w-full text-sm" rows={3} maxLength={2000} placeholder="حيثيات القرار" value={note} onChange={(e) => setNote(e.target.value)} />
                  <div className="flex items-center gap-2 flex-wrap">
                    <button onClick={() => run(() => decideCase(id, outcome, note.trim()), 'اتسجّل القرار.')} disabled={busy || !note.trim()} className="btn-primary text-sm disabled:opacity-50">
                      تسجيل القرار
                    </button>
                    {file.status === 'DECIDED' && (
                      <button onClick={() => run(() => closeCase(id), 'القضية اتقفلت.')} disabled={busy} className="btn-secondary text-sm disabled:opacity-50">
                        إقفال القضية
                      </button>
                    )}
                  </div>
                  <p className="text-xs text-gray-500">قرار غير الحفظ محتاج إخطار المشكو في حقه ومحضر دفاعه. تنفيذ الجزاء أو الفصل من موديوله.</p>
                </div>
              )}
              {file.outcomeNote && <div className="card text-sm text-gray-700">حيثيات القرار: {file.outcomeNote}</div>}
            </div>
          </div>
        )}
      </div>
    </MainLayout>
  )
}
