'use client'

// B3.11: «الشكاوى والتحقيقات» — القضايا اللي الحساب مطّلع عليها (ملفها الكامل)، و«قضاياي» للموظف الطرف: الشاكي بيشوف حالة شكواه، والمشكو في
// حقه بيشوف الإخطار والقرار وله اعتراض في مهلة. الملف نفسه للمطّلعين عليه بس.
import { useCallback, useEffect, useState } from 'react'
import Link from 'next/link'
import { Plus, Scale, X } from 'lucide-react'
import { MainLayout } from '@/components/layout'
import EmptyState from '@/components/EmptyState'
import { fetchEmployees, type ApiEmployee } from '@/lib/api'
import { formatDate } from '@/lib/dates'
import { CASE_KIND_LABELS, fetchHandledCases, fetchMyCases, fetchMyPenalties, objectToCase, openCase, type ApiCaseSummary, type ApiMyCase, type ApiPenalty, type CaseKind } from '@/lib/cases-api'

export default function CasesPage() {
  const [handled, setHandled] = useState<Array<ApiCaseSummary & { investigating: boolean }> | null>(null)
  const [mine, setMine] = useState<ApiMyCase[]>([])
  // B3.12: جزاءات الموظف السارية
  const [penalties, setPenalties] = useState<ApiPenalty[]>([])
  const [canOpen, setCanOpen] = useState(false)
  const [notice, setNotice] = useState('')
  const [error, setError] = useState('')
  const [adding, setAdding] = useState(false)
  const [objecting, setObjecting] = useState<{ id: number; reason: string } | null>(null)
  const [busy, setBusy] = useState(false)

  const load = useCallback(() => {
    setError('')
    fetchHandledCases()
      .then((data) => { setHandled(data.cases); setCanOpen(data.canOpen); setNotice(data.available ? '' : data.message ?? '') })
      .catch((cause) => setError(cause instanceof Error ? cause.message : 'تعذر تحميل القضايا'))
    fetchMyCases().then((data) => setMine(data.cases)).catch(() => setMine([]))
    fetchMyPenalties().then((data) => setPenalties(data.penalties)).catch(() => setPenalties([]))
  }, [])
  useEffect(load, [load])

  const object = async () => {
    if (!objecting) return
    setBusy(true)
    setError('')
    try {
      setMine((await objectToCase(objecting.id, objecting.reason.trim())).cases)
      setObjecting(null)
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'تعذر تسجيل الاعتراض')
    } finally {
      setBusy(false)
    }
  }

  return (
    <MainLayout>
      <div className="space-y-6">
        <div className="flex items-start justify-between gap-3 flex-wrap">
          <div>
            <h1 className="text-2xl font-bold text-gray-800 flex items-center gap-2">
              <Scale size={24} className="text-primary-600" />
              الشكاوى والتحقيقات
            </h1>
            <p className="text-gray-500 mt-1">ملف القضية سرّي: مايشوفوش غير المطّلعين عليه</p>
          </div>
          {canOpen && !notice && (
            <button onClick={() => setAdding(true)} className="btn-primary flex items-center gap-2">
              <Plus size={18} />
              قضية جديدة
            </button>
          )}
        </div>
        {error && (
          <div role="alert" className="bg-red-50 text-red-700 rounded-xl p-4">
            {error}
          </div>
        )}
        {notice && (
          <div role="status" className="bg-amber-50 text-amber-800 rounded-xl p-4">
            {notice}
          </div>
        )}
        {penalties.length > 0 && (
          <div className="card space-y-2" data-my-penalties>
            <h2 className="text-lg font-bold text-gray-800">جزاءاتي السارية</h2>
            {penalties.map((row) => (
              <p key={row.id} className="text-sm text-gray-700">
                {row.violationName} — {row.occurrenceLabel}: {row.label} <span className="text-xs text-gray-400">· {formatDate(row.incidentDate)}</span>
              </p>
            ))}
          </div>
        )}
        {mine.length > 0 && (
          <div className="space-y-3" data-my-cases>
            <h2 className="text-lg font-bold text-gray-800">قضاياي</h2>
            {mine.map((row) => (
              <div key={row.id} className="card space-y-2">
                <div className="flex items-start justify-between gap-3 flex-wrap">
                  <p className="font-medium text-gray-800">
                    {row.title ?? row.kindLabel} <span className="text-xs text-gray-400">· {row.roleLabel}</span>
                  </p>
                  <span className="inline-block px-2 py-0.5 rounded-full text-xs bg-gray-100 text-gray-700">{row.statusLabel}</span>
                </div>
                {row.notices.map((entry, index) => (
                  <p key={index} className="text-sm text-gray-700 bg-amber-50 rounded-xl p-3 whitespace-pre-wrap">
                    إخطار ({formatDate(entry.at)}): {entry.body}
                  </p>
                ))}
                {row.outcomeLabel && (
                  <p className="text-sm text-gray-700">
                    القرار: {row.outcomeLabel}
                    {row.outcomeNote ? ` — ${row.outcomeNote}` : ''}
                  </p>
                )}
                {row.objected && <p className="text-sm text-gray-500">اعتراضك اتسجّل.</p>}
                {row.canObject && objecting?.id !== row.id && (
                  <button onClick={() => setObjecting({ id: row.id, reason: '' })} className="btn-secondary text-sm">
                    اعتراض على القرار{row.objectionUntil ? ` (لحد ${formatDate(row.objectionUntil)})` : ''}
                  </button>
                )}
                {objecting?.id === row.id && (
                  <div className="bg-gray-50 rounded-xl p-3 space-y-2" data-objection>
                    <textarea className="input w-full text-sm" rows={3} maxLength={10000} placeholder="سبب الاعتراض" value={objecting.reason} onChange={(e) => setObjecting({ ...objecting, reason: e.target.value })} />
                    <div className="flex items-center gap-2">
                      <button onClick={object} disabled={busy || !objecting.reason.trim()} className="btn-primary text-sm disabled:opacity-50">
                        تسجيل الاعتراض
                      </button>
                      <button onClick={() => setObjecting(null)} className="btn-secondary text-sm">
                        إلغاء
                      </button>
                    </div>
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
        {handled && handled.length > 0 && (
          <div className="space-y-3" data-handled-cases>
            <h2 className="text-lg font-bold text-gray-800">ملفات مطّلع عليها</h2>
            {handled.map((row) => (
              <Link key={row.id} href={`/cases/${row.id}`} className="card block hover:shadow-md transition-shadow">
                <div className="flex items-start justify-between gap-3 flex-wrap">
                  <div>
                    <p className="font-bold text-gray-800">{row.title}</p>
                    <p className="text-xs text-gray-500 mt-1">
                      {row.kindLabel} · فُتحت {formatDate(row.openedAt)}
                      {row.investigating ? ' · إنت المحقق' : ''}
                      {row.outcomeLabel ? ` · القرار: ${row.outcomeLabel}` : ''}
                    </p>
                  </div>
                  <span className="inline-block px-2 py-0.5 rounded-full text-xs bg-gray-100 text-gray-700">{row.statusLabel}</span>
                </div>
              </Link>
            ))}
          </div>
        )}
        {handled && !notice && handled.length === 0 && mine.length === 0 && penalties.length === 0 && <EmptyState title="مفيش قضايا ليك" icon={Scale} />}
      </div>
      {adding && <OpenCaseModal onClose={() => setAdding(false)} onDone={() => { setAdding(false); load() }} />}
    </MainLayout>
  )
}

function OpenCaseModal({ onClose, onDone }: { onClose: () => void; onDone: () => void }) {
  const [employees, setEmployees] = useState<ApiEmployee[]>([])
  const [kind, setKind] = useState<CaseKind>('COMPLAINT')
  const [title, setTitle] = useState('')
  const [description, setDescription] = useState('')
  const [complainant, setComplainant] = useState(0)
  const [respondent, setRespondent] = useState(0)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')

  useEffect(() => { fetchEmployees().then(setEmployees).catch(() => setEmployees([])) }, [])

  const save = async () => {
    setBusy(true)
    setError('')
    try {
      await openCase({ kind, title: title.trim(), ...(description.trim() ? { description: description.trim() } : {}), ...(complainant ? { complainantEmployeeId: complainant } : {}),
        ...(respondent ? { respondentEmployeeId: respondent } : {}) })
      onDone()
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'تعذر فتح القضية')
    } finally {
      setBusy(false)
    }
  }
  const picker = (label: string, value: number, change: (id: number) => void) => (
    <label className="block text-sm text-gray-600">
      {label}
      <select className="input mt-1 w-full" value={value} onChange={(e) => change(Number(e.target.value))}>
        <option value={0}>—</option>
        {employees.map((employee) => (
          <option key={employee.id} value={employee.id}>
            {employee.fullName}
          </option>
        ))}
      </select>
    </label>
  )

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50" role="dialog" aria-modal="true" aria-label="قضية جديدة">
      <div className="bg-white rounded-2xl w-full max-w-lg mx-4 max-h-[90vh] overflow-auto">
        <div className="p-6 border-b border-gray-100 flex items-center justify-between">
          <h2 className="text-xl font-bold text-gray-800">قضية جديدة</h2>
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
          <label className="block text-sm text-gray-600">
            النوع
            <select className="input mt-1 w-full" value={kind} onChange={(e) => setKind(e.target.value as CaseKind)}>
              {(Object.keys(CASE_KIND_LABELS) as CaseKind[]).map((key) => (
                <option key={key} value={key}>
                  {CASE_KIND_LABELS[key]}
                </option>
              ))}
            </select>
          </label>
          <label className="block text-sm text-gray-600">
            العنوان
            <input className="input mt-1 w-full" maxLength={200} value={title} onChange={(e) => setTitle(e.target.value)} />
          </label>
          <label className="block text-sm text-gray-600">
            الوصف
            <textarea className="input mt-1 w-full" rows={4} maxLength={10000} value={description} onChange={(e) => setDescription(e.target.value)} />
          </label>
          <div className="grid grid-cols-2 gap-3">
            {picker('الشاكي (اختياري)', complainant, setComplainant)}
            {picker('المشكو في حقه (اختياري)', respondent, setRespondent)}
          </div>
          <p className="text-xs text-gray-500">إنت أول مطّلع على الملف. المشكو في حقه أو مديره المباشر مايبقاش مطّلع ولا محقق.</p>
          <div className="flex items-center justify-end gap-2">
            <button onClick={onClose} className="btn-secondary text-sm">
              إلغاء
            </button>
            <button onClick={save} disabled={busy || title.trim().length < 3} className="btn-primary text-sm disabled:opacity-50">
              فتح القضية
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}
