'use client'

// B3.12: «لائحة الجزاءات» — المخالفات ودرجات تكرارها، وتوقيع الجزاء على موظف (معاينة رقم التكرار والجزاء ثم تأكيد)، وسجل الجزاءات.
// جزاء الخصم بيتعمل خصم مصنّف بسلسلته — مفيش مبلغ بيتكتب من هنا مباشرة.
import { useCallback, useEffect, useState } from 'react'
import { Gavel, Plus, X } from 'lucide-react'
import { MainLayout } from '@/components/layout'
import { fetchEmployees, type ApiEmployee } from '@/lib/api'
import { formatDate } from '@/lib/dates'
import {
  PENALTY_ACTION_LABELS, applyPenalty, cancelPenalty, createViolation, fetchPenalties, fetchViolations, previewPenalty, updateViolation,
  type ApiPenalty, type ApiPenaltyCatalog, type ApiPenaltyPreview, type PenaltyAction,
} from '@/lib/cases-api'

type Tab = 'apply' | 'catalog'
const today = () => new Date().toLocaleDateString('en-CA')

export default function PenaltiesPage() {
  const [tab, setTab] = useState<Tab>('apply')
  const [catalog, setCatalog] = useState<ApiPenaltyCatalog | null>(null)
  const [register, setRegister] = useState<ApiPenalty[]>([])
  const [employees, setEmployees] = useState<ApiEmployee[]>([])
  const [error, setError] = useState('')
  const [info, setInfo] = useState('')
  const [busy, setBusy] = useState(false)
  const [employeeId, setEmployeeId] = useState(0)
  const [violationId, setViolationId] = useState(0)
  const [incidentDate, setIncidentDate] = useState(today())
  const [period, setPeriod] = useState(today().slice(0, 7))
  const [caseId, setCaseId] = useState('')
  const [note, setNote] = useState('')
  const [preview, setPreview] = useState<ApiPenaltyPreview | null>(null)
  const [adding, setAdding] = useState(false)

  const load = useCallback(() => {
    setError('')
    fetchViolations().then(setCatalog).catch((cause) => setError(cause instanceof Error ? cause.message : 'تعذر تحميل اللائحة'))
    fetchPenalties().then((data) => setRegister(data.penalties)).catch(() => setRegister([]))
  }, [])
  useEffect(load, [load])
  useEffect(() => { fetchEmployees().then(setEmployees).catch(() => setEmployees([])) }, [])

  const run = async (work: () => Promise<string>) => {
    setBusy(true)
    setError('')
    setInfo('')
    try {
      setInfo(await work())
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'تعذر تنفيذ الإجراء')
    } finally {
      setBusy(false)
    }
  }
  const target = () => ({ employeeId, violationId, incidentDate })
  const look = () => run(async () => { setPreview(await previewPenalty(target())); return '' })
  const confirm = () => run(async () => {
    if (!preview) return ''
    const made = await applyPenalty({ ...target(), expectedOccurrence: preview.occurrence, ...(preview.needsPeriod ? { targetPeriod: period } : {}), ...(caseId.trim() ? { caseId: Number(caseId) } : {}), ...(note.trim() ? { note: note.trim() } : {}) })
    setPreview(null)
    setNote('')
    load()
    return `اتوقّع الجزاء: ${made.label}${made.deductionRequestId ? ` — واتعمل خصم مصنّف رقم ${made.deductionRequestId} في سلسلة اعتماده` : ''}.`
  })
  const cancel = (row: ApiPenalty, reason: string) => run(async () => { await cancelPenalty(row.id, reason); load(); return 'اتلغى الجزاء.' })
  const active = catalog?.violations.filter((row) => row.isActive) ?? []

  return (
    <MainLayout>
      <div className="space-y-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-800 flex items-center gap-2">
            <Gavel size={24} className="text-primary-600" />
            لائحة الجزاءات
          </h1>
          <p className="text-gray-500 mt-1">
            الجزاء من المخالفة ورقم تكرارها{catalog?.available ? ` (التكرار بيتحسب في ${catalog.windowDays} يوم)` : ''} — وجزاء الخصم بيتعمل خصم مصنّف بسلسلته
          </p>
        </div>
        <div className="flex items-center gap-2" role="tablist">
          {(['apply', 'catalog'] as Tab[]).map((key) => (
            <button key={key} role="tab" aria-selected={tab === key} onClick={() => setTab(key)}
              className={`px-4 py-2 rounded-full text-sm ${tab === key ? 'bg-primary-600 text-white' : 'bg-gray-100 text-gray-700 hover:bg-gray-200'}`}>
              {key === 'apply' ? 'توقيع جزاء والسجل' : 'اللائحة'}
            </button>
          ))}
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
        {catalog && !catalog.available && (
          <div role="status" className="bg-amber-50 text-amber-800 rounded-xl p-4">
            {catalog.message}
          </div>
        )}
        {tab === 'apply' && catalog?.available && (
          <div className="card space-y-3" data-apply-penalty>
            <h2 className="font-bold text-gray-800">توقيع جزاء</h2>
            <div className="flex items-end gap-3 flex-wrap">
              <label className="text-sm text-gray-600">
                الموظف
                <select className="input mt-1 min-w-48" value={employeeId} onChange={(e) => { setEmployeeId(Number(e.target.value)); setPreview(null) }}>
                  <option value={0}>اختار موظف</option>
                  {employees.map((employee) => (
                    <option key={employee.id} value={employee.id}>
                      {employee.fullName}
                    </option>
                  ))}
                </select>
              </label>
              <label className="text-sm text-gray-600">
                المخالفة
                <select className="input mt-1 min-w-48" value={violationId} onChange={(e) => { setViolationId(Number(e.target.value)); setPreview(null) }}>
                  <option value={0}>اختار مخالفة</option>
                  {active.map((row) => (
                    <option key={row.id} value={row.id}>
                      {row.category} — {row.name}
                    </option>
                  ))}
                </select>
              </label>
              <label className="text-sm text-gray-600">
                تاريخ الواقعة
                <input type="date" className="input mt-1" max={today()} value={incidentDate} onChange={(e) => { setIncidentDate(e.target.value); setPreview(null) }} />
              </label>
              <button onClick={look} disabled={busy || !employeeId || !violationId || !incidentDate} className="btn-secondary text-sm disabled:opacity-50">
                معاينة
              </button>
            </div>
            {preview && (
              <div className="bg-amber-50 rounded-xl p-4 space-y-3" data-penalty-preview>
                <p className="text-sm text-amber-900">
                  {preview.employeeName} — {preview.violationName}: <strong>{preview.occurrenceLabel}</strong> ← <strong>{preview.label}</strong>
                </p>
                <div className="flex items-end gap-3 flex-wrap">
                  {preview.needsPeriod && (
                    <label className="text-sm text-gray-600">
                      شهر المسير المستهدف
                      <input type="month" className="input mt-1" value={period} onChange={(e) => setPeriod(e.target.value)} />
                    </label>
                  )}
                  <label className="text-sm text-gray-600">
                    رقم ملف القضية (اختياري)
                    <input className="input mt-1 w-32" inputMode="numeric" value={caseId} onChange={(e) => setCaseId(e.target.value.replace(/\D/g, ''))} />
                  </label>
                  <label className="text-sm text-gray-600 flex-1 min-w-48">
                    ملاحظة (اختياري)
                    <input className="input mt-1 w-full" maxLength={1000} value={note} onChange={(e) => setNote(e.target.value)} />
                  </label>
                </div>
                <button onClick={confirm} disabled={busy || (preview.needsPeriod && !period)} className="btn-primary text-sm disabled:opacity-50">
                  تأكيد توقيع الجزاء
                </button>
              </div>
            )}
          </div>
        )}
        {tab === 'apply' && register.length > 0 && (
          <div className="card overflow-x-auto">
            <h2 className="font-bold text-gray-800 mb-3">سجل الجزاءات</h2>
            <table className="w-full text-sm" data-penalties>
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-3 py-2 text-right font-medium text-gray-600">الموظف</th>
                  <th className="px-3 py-2 text-right font-medium text-gray-600">المخالفة</th>
                  <th className="px-3 py-2 text-right font-medium text-gray-600">التكرار</th>
                  <th className="px-3 py-2 text-right font-medium text-gray-600">الجزاء</th>
                  <th className="px-3 py-2 text-right font-medium text-gray-600">الواقعة</th>
                  <th className="px-3 py-2 text-right font-medium text-gray-600">الحالة</th>
                  <th className="px-3 py-2" />
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {register.map((row) => (
                  <PenaltyRow key={row.id} row={row} busy={busy} onCancel={cancel} />
                ))}
              </tbody>
            </table>
          </div>
        )}
        {tab === 'catalog' && catalog?.available && (
          <div className="space-y-3">
            <div className="flex justify-end">
              <button onClick={() => setAdding(true)} className="btn-primary flex items-center gap-2 text-sm">
                <Plus size={16} />
                مخالفة جديدة
              </button>
            </div>
            {catalog.violations.length === 0 && <p className="text-sm text-gray-500">اللائحة فاضية لسه.</p>}
            {catalog.violations.map((row) => (
              <div key={row.id} className={`card ${row.isActive ? '' : 'opacity-60'}`}>
                <div className="flex items-start justify-between gap-3 flex-wrap">
                  <p className="font-medium text-gray-800">
                    {row.name} <span className="text-xs text-gray-400">· {row.category}</span>
                  </p>
                  <button onClick={() => run(async () => { setCatalog(await updateViolation(row.id, { isActive: !row.isActive })); return row.isActive ? 'المخالفة اتوقفت.' : 'المخالفة بقت متاحة.' })} disabled={busy}
                    className="text-primary-600 hover:underline text-xs disabled:opacity-50">
                    {row.isActive ? 'إيقاف' : 'إتاحة'}
                  </button>
                </div>
                <p className="text-sm text-gray-600 mt-2">{row.steps.map((step) => `${step.occurrenceLabel}: ${step.label}`).join(' ← ')}</p>
                {row.deductionTypeName && <p className="text-xs text-gray-500 mt-1">نوع الخصم: {row.deductionTypeName}</p>}
              </div>
            ))}
          </div>
        )}
      </div>
      {adding && catalog && <ViolationModal catalog={catalog} onClose={() => setAdding(false)} onDone={(next) => { setCatalog(next); setAdding(false) }} />}
    </MainLayout>
  )
}

function PenaltyRow({ row, busy, onCancel }: { row: ApiPenalty; busy: boolean; onCancel: (row: ApiPenalty, reason: string) => void }) {
  const [reason, setReason] = useState<string | null>(null)
  return (
    <tr className={row.status === 'CANCELLED' ? 'opacity-60' : ''}>
      <td className="px-3 py-2 text-gray-800">{row.employeeName}</td>
      <td className="px-3 py-2 text-gray-600">{row.violationName}</td>
      <td className="px-3 py-2 text-gray-600">{row.occurrenceLabel}</td>
      <td className="px-3 py-2 text-gray-600">
        {row.label}
        {row.deductionRequestId ? <span className="text-xs text-gray-400"> · خصم رقم {row.deductionRequestId}</span> : null}
        {row.caseId ? <span className="text-xs text-gray-400"> · قضية {row.caseId}</span> : null}
      </td>
      <td className="px-3 py-2 tabular-nums">{formatDate(row.incidentDate)}</td>
      <td className="px-3 py-2 text-gray-600">
        {row.statusLabel}
        {row.cancelReason ? <span className="text-xs text-gray-400"> · {row.cancelReason}</span> : null}
      </td>
      <td className="px-3 py-2 text-left whitespace-nowrap">
        {row.status === 'ACTIVE' && reason === null && (
          <button onClick={() => setReason('')} className="text-red-600 hover:underline text-xs">
            إلغاء
          </button>
        )}
        {reason !== null && (
          <span className="inline-flex items-center gap-2">
            <input className="input w-40 text-xs" maxLength={500} placeholder="سبب الإلغاء" value={reason} onChange={(e) => setReason(e.target.value)} />
            <button onClick={() => { onCancel(row, reason.trim()); setReason(null) }} disabled={busy || reason.trim().length < 3} className="text-red-600 hover:underline text-xs disabled:opacity-50">
              تأكيد
            </button>
          </span>
        )}
      </td>
    </tr>
  )
}

function ViolationModal({ catalog, onClose, onDone }: { catalog: ApiPenaltyCatalog; onClose: () => void; onDone: (next: ApiPenaltyCatalog) => void }) {
  const [category, setCategory] = useState('')
  const [name, setName] = useState('')
  const [steps, setSteps] = useState<Array<{ action: PenaltyAction; days: string }>>([{ action: 'WARNING', days: '' }])
  const [deductionTypeId, setDeductionTypeId] = useState(catalog.deductionTypes[0]?.id ?? 0)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')
  const needsDays = (action: PenaltyAction) => action === 'DEDUCT_DAYS' || action === 'SUSPENSION'
  const needsType = steps.some((step) => step.action === 'DEDUCT_DAYS')

  const save = async () => {
    setBusy(true)
    setError('')
    try {
      onDone(await createViolation({ category: category.trim(), name: name.trim(), steps: steps.map((step) => ({ action: step.action, ...(needsDays(step.action) ? { days: Number(step.days) } : {}) })),
        ...(needsType ? { deductionTypeId } : {}) }))
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'تعذر حفظ المخالفة')
      setBusy(false)
    }
  }

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50" role="dialog" aria-modal="true" aria-label="مخالفة جديدة">
      <div className="bg-white rounded-2xl w-full max-w-lg mx-4 max-h-[90vh] overflow-auto">
        <div className="p-6 border-b border-gray-100 flex items-center justify-between">
          <h2 className="text-xl font-bold text-gray-800">مخالفة جديدة</h2>
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
          <div className="grid grid-cols-2 gap-3">
            <label className="block text-sm text-gray-600">
              الفئة
              <input className="input mt-1 w-full" maxLength={100} value={category} onChange={(e) => setCategory(e.target.value)} />
            </label>
            <label className="block text-sm text-gray-600">
              المخالفة
              <input className="input mt-1 w-full" maxLength={200} value={name} onChange={(e) => setName(e.target.value)} />
            </label>
          </div>
          <div className="space-y-2">
            <p className="text-sm text-gray-600">درجات التكرار (لحد 4 — واللي بعدها بياخد آخر درجة)</p>
            {steps.map((step, index) => (
              <div key={index} className="flex items-center gap-2">
                <span className="text-xs text-gray-500 w-14">مرة {index + 1}</span>
                <select className="input" value={step.action} onChange={(e) => setSteps(steps.map((entry, at) => (at === index ? { action: e.target.value as PenaltyAction, days: '' } : entry)))}>
                  {(Object.keys(PENALTY_ACTION_LABELS) as PenaltyAction[]).map((key) => (
                    <option key={key} value={key}>
                      {PENALTY_ACTION_LABELS[key]}
                    </option>
                  ))}
                </select>
                {needsDays(step.action) && (
                  <input className="input w-24" inputMode="decimal" placeholder="أيام" value={step.days} onChange={(e) => setSteps(steps.map((entry, at) => (at === index ? { ...entry, days: e.target.value } : entry)))} />
                )}
                {steps.length > 1 && (
                  <button onClick={() => setSteps(steps.filter((_, at) => at !== index))} className="text-red-600 text-xs hover:underline">
                    شيل
                  </button>
                )}
              </div>
            ))}
            {steps.length < 4 && (
              <button onClick={() => setSteps([...steps, { action: 'WARNING', days: '' }])} className="text-primary-600 text-sm hover:underline">
                + درجة
              </button>
            )}
          </div>
          {needsType && (
            <label className="block text-sm text-gray-600">
              نوع الخصم المصنّف (أيام من الراتب)
              <select className="input mt-1 w-full" value={deductionTypeId} onChange={(e) => setDeductionTypeId(Number(e.target.value))}>
                {catalog.deductionTypes.length === 0 && <option value={0}>مفيش نوع خصم بالأيام — اعمله من الخصومات</option>}
                {catalog.deductionTypes.map((type) => (
                  <option key={type.id} value={type.id}>
                    {type.nameAr}
                  </option>
                ))}
              </select>
            </label>
          )}
          <div className="flex items-center justify-end gap-2">
            <button onClick={onClose} className="btn-secondary text-sm">
              إلغاء
            </button>
            <button onClick={save} disabled={busy || category.trim().length < 2 || name.trim().length < 3 || steps.some((step) => needsDays(step.action) && !(Number(step.days) > 0)) || (needsType && !deductionTypeId)}
              className="btn-primary text-sm disabled:opacity-50">
              حفظ المخالفة
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}
