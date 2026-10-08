'use client'

// B3.7: «دورات التقييم» (لإدارة الأداء) — دورة بنموذجها وفترتها وجمهورها ← إطلاق (تكليف لكل موظف بمديره) ← متابعة التسليم ← اعتماد النتايج وإعلانها.
// (كانت شاشة عرض ببيانات وهمية؛ بقت على الخادم.)
import { useCallback, useEffect, useState } from 'react'
import Link from 'next/link'
import { Plus, RefreshCcw, X } from 'lucide-react'
import { MainLayout } from '@/components/layout'
import EmptyState from '@/components/EmptyState'
import { fetchBranches, fetchDepartments, type ApiBranch, type ApiDepartment } from '@/lib/api'
import { formatDate } from '@/lib/dates'
import {
  REVIEW_CYCLE_KIND_LABELS, advanceReviewCycle, closeReviewCycle, createReviewCycle, fetchCycleAssignments, fetchReviewCycles, fetchReviewTemplates, launchReviewCycle,
  type ApiCycleAssignment, type ApiReviewCycle, type ApiReviewTemplate, type ReviewAudienceMode, type ReviewCycleKind, type ReviewCycleStatus,
} from '@/lib/reviews-api'
import RewardsPanel from './RewardsPanel'

const statusStyle: Record<ReviewCycleStatus, string> = { DRAFT: 'bg-gray-100 text-gray-700', ACTIVE: 'bg-green-50 text-green-700', CLOSED: 'bg-gray-100 text-gray-500' }

export default function ReviewCyclesPage() {
  const [cycles, setCycles] = useState<ApiReviewCycle[] | null>(null)
  const [canCompany, setCanCompany] = useState(false)
  const [notice, setNotice] = useState('')
  const [error, setError] = useState('')
  const [info, setInfo] = useState('')
  const [adding, setAdding] = useState(false)
  const [busy, setBusy] = useState(0)
  const [open, setOpen] = useState<{ cycle: ApiReviewCycle; assignments: ApiCycleAssignment[] } | null>(null)
  const [rewards, setRewards] = useState<ApiReviewCycle | null>(null)

  const load = useCallback(() => {
    setError('')
    fetchReviewCycles()
      .then((data) => { setCycles(data.cycles); setCanCompany(data.canCompany); setNotice(data.available ? '' : data.message ?? '') })
      .catch((cause) => setError(cause instanceof Error ? cause.message : 'تعذر تحميل الدورات'))
  }, [])
  useEffect(load, [load])

  const run = async (cycle: ApiReviewCycle, work: () => Promise<string>) => {
    setBusy(cycle.id)
    setError('')
    setInfo('')
    try {
      setInfo(await work())
      load()
      if (open?.cycle.id === cycle.id) setOpen(await fetchCycleAssignments(cycle.id))
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'تعذر تنفيذ الإجراء')
    } finally {
      setBusy(0)
    }
  }
  const show = async (cycle: ApiReviewCycle) => {
    setError('')
    try {
      setOpen(await fetchCycleAssignments(cycle.id))
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'تعذر تحميل التكليفات')
    }
  }

  return (
    <MainLayout>
      <div className="space-y-6">
        <div className="flex items-start justify-between gap-3 flex-wrap">
          <div>
            <h1 className="text-2xl font-bold text-gray-800 flex items-center gap-2">
              <RefreshCcw size={24} className="text-primary-600" />
              دورات التقييم
            </h1>
            <p className="text-gray-500 mt-1">
              دورة بنموذجها وجمهورها ← إطلاق ← متابعة التسليم ← اعتماد وإعلان ·{' '}
              <Link href="/performance/templates" className="text-primary-600 hover:underline">
                نماذج التقييم
              </Link>
            </p>
          </div>
          {cycles && !notice && (
            <button onClick={() => setAdding(true)} className="btn-primary flex items-center gap-2">
              <Plus size={18} />
              دورة جديدة
            </button>
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
        {notice && (
          <div role="status" className="bg-amber-50 text-amber-800 rounded-xl p-4">
            {notice}
          </div>
        )}
        {cycles && !notice && cycles.length === 0 && <EmptyState title="مفيش دورات تقييم لسه" icon={RefreshCcw} />}
        {cycles && cycles.length > 0 && (
          <div className="grid gap-4" data-cycles>
            {cycles.map((cycle) => (
              <div key={cycle.id} className="card space-y-3">
                <div className="flex items-start justify-between gap-3 flex-wrap">
                  <div>
                    <h2 className="text-lg font-bold text-gray-800">{cycle.name}</h2>
                    <p className="text-xs text-gray-500 mt-1">
                      {cycle.kindLabel} · {cycle.templateName ?? '—'} · {formatDate(cycle.periodStart)} – {formatDate(cycle.periodEnd)} · الذاتي قبل {formatDate(cycle.selfDueDate)} · المدير قبل{' '}
                      {formatDate(cycle.managerDueDate)}
                    </p>
                  </div>
                  <span className={`inline-block px-2 py-0.5 rounded-full text-xs ${statusStyle[cycle.status]}`}>{cycle.statusLabel}</span>
                </div>
                {cycle.status !== 'DRAFT' && (
                  <p className="text-sm text-gray-600 tabular-nums">
                    {cycle.counts.total} موظف · سلّموا الذاتي {cycle.counts.self} · المديرين سلّموا {cycle.counts.manager}
                    {cycle.counts.noManager > 0 ? ` · من غير مقيِّم ${cycle.counts.noManager}` : ''}
                  </p>
                )}
                <div className="flex items-center gap-2 flex-wrap">
                  {cycle.status === 'DRAFT' && (
                    <button onClick={() => run(cycle, async () => { const launched = await launchReviewCycle(cycle.id); return `الدورة اتطلقت لـ${launched.counts.total} موظف.` })} disabled={busy === cycle.id} className="btn-primary text-sm disabled:opacity-50">
                      إطلاق
                    </button>
                  )}
                  {cycle.status !== 'DRAFT' && (
                    <>
                      <button onClick={() => show(cycle)} className="btn-secondary text-sm">
                        التكليفات
                      </button>
                      <button onClick={() => run(cycle, async () => `اتعتمد ${(await advanceReviewCycle(cycle.id, 'APPROVED')).moved} تقييم.`)} disabled={busy === cycle.id} className="btn-secondary text-sm disabled:opacity-50">
                        اعتماد اللي اتسلّم
                      </button>
                      <button onClick={() => run(cycle, async () => `اتعلن ${(await advanceReviewCycle(cycle.id, 'ANNOUNCED')).moved} تقييم للموظفين.`)} disabled={busy === cycle.id} className="btn-secondary text-sm disabled:opacity-50">
                        إعلان المعتمد
                      </button>
                      <button onClick={() => setRewards(cycle)} className="btn-secondary text-sm">
                        المكافآت
                      </button>
                    </>
                  )}
                  {cycle.status === 'ACTIVE' && (
                    <button onClick={() => run(cycle, async () => { await closeReviewCycle(cycle.id); return 'الدورة اتقفلت — مفيش تسليم بعد كده.' })} disabled={busy === cycle.id} className="btn-secondary text-sm disabled:opacity-50">
                      قفل التسليم
                    </button>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
      {rewards && <RewardsPanel cycleId={rewards.id} cycleName={rewards.name} onClose={() => setRewards(null)} />}
      {adding && <CycleModal canCompany={canCompany} onClose={() => setAdding(false)} onDone={() => { setAdding(false); load() }} />}
      {open && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50" role="dialog" aria-modal="true" aria-label="تكليفات الدورة">
          <div className="bg-white rounded-2xl w-full max-w-3xl mx-4 max-h-[90vh] overflow-auto">
            <div className="p-6 border-b border-gray-100 flex items-center justify-between">
              <h2 className="text-xl font-bold text-gray-800">{open.cycle.name}</h2>
              <button onClick={() => setOpen(null)} className="p-2 hover:bg-gray-100 rounded-lg" aria-label="إغلاق">
                <X size={20} />
              </button>
            </div>
            <div className="p-6 overflow-x-auto">
              <table className="w-full text-sm" data-assignments>
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-3 py-2 text-right font-medium text-gray-600">الموظف</th>
                    <th className="px-3 py-2 text-right font-medium text-gray-600">المقيِّم</th>
                    <th className="px-3 py-2 text-right font-medium text-gray-600">الذاتي</th>
                    <th className="px-3 py-2 text-right font-medium text-gray-600">المدير</th>
                    <th className="px-3 py-2 text-right font-medium text-gray-600">الحالة</th>
                    <th className="px-3 py-2" />
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {open.assignments.map((row) => (
                    <tr key={row.id}>
                      <td className="px-3 py-2 text-gray-800">{row.employeeName}</td>
                      <td className="px-3 py-2 text-gray-600">{row.hasManager ? row.managerName ?? 'مدير' : <span className="text-amber-700">من غير مقيِّم</span>}</td>
                      <td className="px-3 py-2 tabular-nums">{row.selfScore ?? (row.selfSubmitted ? 'سلّم' : '—')}</td>
                      <td className="px-3 py-2 tabular-nums">{row.managerScore ?? (row.managerSubmitted ? 'سلّم' : '—')}</td>
                      <td className="px-3 py-2 text-gray-600">{row.statusLabel}</td>
                      <td className="px-3 py-2 text-left">
                        <Link href={`/performance/${row.id}`} className="text-primary-600 hover:underline">
                          فتح
                        </Link>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}
    </MainLayout>
  )
}

function CycleModal({ canCompany, onClose, onDone }: { canCompany: boolean; onClose: () => void; onDone: () => void }) {
  const [templates, setTemplates] = useState<ApiReviewTemplate[]>([])
  const [branches, setBranches] = useState<ApiBranch[]>([])
  const [departments, setDepartments] = useState<ApiDepartment[]>([])
  const [name, setName] = useState('')
  const [kind, setKind] = useState<ReviewCycleKind>('ANNUAL')
  const [templateId, setTemplateId] = useState('')
  const [periodStart, setPeriodStart] = useState('')
  const [periodEnd, setPeriodEnd] = useState('')
  const [selfDueDate, setSelfDueDate] = useState('')
  const [managerDueDate, setManagerDueDate] = useState('')
  const [audienceMode, setAudienceMode] = useState<ReviewAudienceMode>(canCompany ? 'COMPANY' : 'DEPARTMENTS')
  const [audienceIds, setAudienceIds] = useState<number[]>([])
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')

  useEffect(() => {
    fetchReviewTemplates().then((data) => setTemplates(data.templates.filter((row) => row.isActive))).catch(() => setTemplates([]))
    fetchBranches().then(setBranches).catch(() => setBranches([]))
    fetchDepartments().then(setDepartments).catch(() => setDepartments([]))
  }, [])

  const options = audienceMode === 'BRANCHES' ? branches.map((row) => ({ id: row.id, name: row.name })) : audienceMode === 'DEPARTMENTS' ? departments.map((row) => ({ id: row.id, name: row.name })) : []
  const toggle = (id: number) => setAudienceIds((prev) => (prev.includes(id) ? prev.filter((item) => item !== id) : [...prev, id]))
  const datesOk = periodStart !== '' && periodEnd !== '' && periodEnd >= periodStart && selfDueDate !== '' && managerDueDate !== '' && managerDueDate >= selfDueDate
  const valid = name.trim().length >= 3 && templateId !== '' && datesOk && (audienceMode === 'COMPANY' || audienceIds.length > 0)

  const submit = async () => {
    setSaving(true)
    setError('')
    try {
      await createReviewCycle({ name: name.trim(), kind, templateId: Number(templateId), periodStart, periodEnd, selfDueDate, managerDueDate, audienceMode, ...(audienceMode === 'COMPANY' ? {} : { audienceIds }) })
      onDone()
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'تعذر حفظ الدورة')
      setSaving(false)
    }
  }

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50" role="dialog" aria-modal="true" aria-label="دورة تقييم جديدة">
      <div className="bg-white rounded-2xl w-full max-w-2xl mx-4 max-h-[90vh] overflow-auto">
        <div className="p-6 border-b border-gray-100 flex items-center justify-between">
          <div>
            <h2 className="text-xl font-bold text-gray-800">دورة تقييم جديدة</h2>
            <p className="text-sm text-gray-500 mt-1">بتتعمل «مسودة» — التكليفات بتتعمل وقت الإطلاق</p>
          </div>
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
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <label className="block text-sm text-gray-700 sm:col-span-2">
              اسم الدورة
              <input className="input w-full mt-1" maxLength={200} value={name} onChange={(e) => setName(e.target.value)} />
            </label>
            <label className="block text-sm text-gray-700">
              النوع
              <select className="input w-full mt-1" value={kind} onChange={(e) => setKind(e.target.value as ReviewCycleKind)}>
                {(Object.keys(REVIEW_CYCLE_KIND_LABELS) as ReviewCycleKind[]).map((key) => (
                  <option key={key} value={key}>
                    {REVIEW_CYCLE_KIND_LABELS[key]}
                  </option>
                ))}
              </select>
            </label>
          </div>
          <label className="block text-sm text-gray-700">
            نموذج التقييم
            <select className="input w-full mt-1" value={templateId} onChange={(e) => setTemplateId(e.target.value)}>
              <option value="">اختر النموذج</option>
              {templates.map((row) => (
                <option key={row.id} value={row.id}>
                  {row.name}
                </option>
              ))}
            </select>
          </label>
          {templates.length === 0 && <p className="text-xs text-amber-700">مفيش نماذج متاحة — اعمل نموذج من «نماذج التقييم» الأول.</p>}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
            <label className="block text-sm text-gray-700">
              فترة التقييم من
              <input type="date" className="input w-full mt-1" value={periodStart} onChange={(e) => setPeriodStart(e.target.value)} />
            </label>
            <label className="block text-sm text-gray-700">
              إلى
              <input type="date" className="input w-full mt-1" min={periodStart} value={periodEnd} onChange={(e) => setPeriodEnd(e.target.value)} />
            </label>
            <label className="block text-sm text-gray-700">
              آخر يوم للذاتي
              <input type="date" className="input w-full mt-1" value={selfDueDate} onChange={(e) => setSelfDueDate(e.target.value)} />
            </label>
            <label className="block text-sm text-gray-700">
              آخر يوم للمدير
              <input type="date" className="input w-full mt-1" min={selfDueDate} value={managerDueDate} onChange={(e) => setManagerDueDate(e.target.value)} />
            </label>
          </div>
          <label className="block text-sm text-gray-700">
            الجمهور
            <select className="input w-full mt-1" value={audienceMode} onChange={(e) => { setAudienceMode(e.target.value as ReviewAudienceMode); setAudienceIds([]) }}>
              {canCompany && <option value="COMPANY">كل الشركة</option>}
              <option value="BRANCHES">فروع محددة</option>
              <option value="DEPARTMENTS">أقسام محددة</option>
            </select>
          </label>
          {audienceMode !== 'COMPANY' && (
            <div className="border border-gray-200 rounded-lg max-h-40 overflow-auto divide-y divide-gray-100">
              {options.map((row) => (
                <label key={row.id} className="flex items-center gap-2 px-3 py-2 text-sm text-gray-700 cursor-pointer hover:bg-gray-50">
                  <input type="checkbox" checked={audienceIds.includes(row.id)} onChange={() => toggle(row.id)} />
                  {row.name}
                </label>
              ))}
              {options.length === 0 && <p className="px-3 py-2 text-sm text-gray-500">مفيش اختيارات في نطاقك.</p>}
            </div>
          )}
        </div>
        <div className="p-6 border-t border-gray-100 flex justify-end gap-2">
          <button onClick={onClose} className="btn-secondary">
            إلغاء
          </button>
          <button onClick={submit} disabled={!valid || saving} title="الاسم والنموذج والتواريخ والجمهور مطلوبين" className="btn-primary disabled:opacity-50">
            حفظ
          </button>
        </div>
      </div>
    </div>
  )
}
