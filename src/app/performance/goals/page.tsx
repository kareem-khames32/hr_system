'use client'

// B3.6: «الأهداف» — أهدافي (اقتراح ومتابعة)، فريقي (اعتماد وتعديل لمرؤوسيني المباشرين)، وكل الأهداف (بصلاحية إدارة الأداء: الأقسام والشركة).
// (كانت شاشة عرض ببيانات وهمية؛ بقت على الخادم.)
import { useCallback, useEffect, useState } from 'react'
import { Plus, Target, X } from 'lucide-react'
import { MainLayout } from '@/components/layout'
import EmptyState from '@/components/EmptyState'
import { can, fetchDepartments, type ApiDepartment } from '@/lib/api'
import { formatDate } from '@/lib/dates'
import {
  GOAL_KIND_LABELS, changeGoal, closeGoal, createGoal, decideGoal, fetchAllGoals, fetchGoal, fetchMyGoals, fetchTeamGoals, linkGoalTask, progressGoal,
  type ApiGoal, type ApiGoalDetail, type GoalKind, type GoalOwnerType, type GoalStatus,
} from '@/lib/goals-api'

type Tab = 'mine' | 'team' | 'all'
const statusStyle: Record<GoalStatus, string> = {
  PROPOSED: 'bg-amber-50 text-amber-800', ACTIVE: 'bg-blue-50 text-blue-700', DONE: 'bg-green-50 text-green-700', CANCELLED: 'bg-gray-100 text-gray-500', REJECTED: 'bg-red-50 text-red-700',
}
const UPDATE_LABELS = { PROGRESS: 'تحديث تقدّم', CHANGE: 'تعديل', STATUS: 'حالة', EVIDENCE: 'مهمة دليل' } as const
const ownerText = (goal: ApiGoal) => (goal.ownerType === 'COMPANY' ? 'هدف الشركة' : goal.ownerType === 'DEPARTMENT' ? `قسم: ${goal.departmentName ?? '—'}` : goal.employeeName ?? '—')

export default function GoalsPage() {
  const hr = can('performance.manage')
  const [tab, setTab] = useState<Tab>('mine')
  const [goals, setGoals] = useState<ApiGoal[]>([])
  const [shared, setShared] = useState<ApiGoal[]>([])
  const [weightTotal, setWeightTotal] = useState(0)
  const [reports, setReports] = useState<Array<{ id: number; fullName: string }>>([])
  const [isManager, setIsManager] = useState(false)
  const [canCompany, setCanCompany] = useState(false)
  const [departments, setDepartments] = useState<ApiDepartment[]>([])
  const [notice, setNotice] = useState('')
  const [error, setError] = useState('')
  const [loaded, setLoaded] = useState(false)
  const [adding, setAdding] = useState(false)
  const [open, setOpen] = useState<number | null>(null)

  const load = useCallback(() => {
    setError('')
    const done = (available: boolean, message?: string) => {
      setNotice(available ? '' : message ?? '')
      setLoaded(true)
    }
    const failed = (cause: unknown) => setError(cause instanceof Error ? cause.message : 'تعذر تحميل الأهداف')
    if (tab === 'mine') fetchMyGoals().then((data) => { setGoals(data.goals); setShared(data.shared); setWeightTotal(data.weightTotal); done(data.available, data.message) }).catch(failed)
    else if (tab === 'team') fetchTeamGoals().then((data) => { setGoals(data.goals); setShared([]); setReports(data.reports); setIsManager(data.manager); done(data.available, data.message) }).catch(failed)
    else fetchAllGoals().then((data) => { setGoals(data.goals); setShared([]); setCanCompany(data.canManageCompany); done(data.available, data.message) }).catch(failed)
  }, [tab])
  useEffect(load, [load])
  useEffect(() => {
    if (hr) fetchDepartments().then(setDepartments).catch(() => setDepartments([]))
  }, [hr])

  const canAdd = tab === 'mine' || (tab === 'team' && reports.length > 0) || (tab === 'all' && (departments.length > 0 || canCompany))
  const tabs: Array<[Tab, string]> = [['mine', 'أهدافي'], ['team', 'فريقي'], ...(hr ? ([['all', 'كل الأهداف']] as Array<[Tab, string]>) : [])]

  return (
    <MainLayout>
      <div className="space-y-6">
        <div className="flex items-start justify-between gap-3 flex-wrap">
          <div>
            <h1 className="text-2xl font-bold text-gray-800 flex items-center gap-2">
              <Target size={24} className="text-primary-600" />
              الأهداف
            </h1>
            <p className="text-gray-500 mt-1">اقترح هدفك ومديرك يعتمده، وتابع التقدّم — وأهداف قسمك والشركة قدامك</p>
          </div>
          {loaded && !notice && canAdd && (
            <button onClick={() => setAdding(true)} className="btn-primary flex items-center gap-2">
              <Plus size={18} />
              {tab === 'mine' ? 'اقترح هدف' : tab === 'team' ? 'هدف لمرؤوس' : 'هدف قسم أو شركة'}
            </button>
          )}
        </div>
        <div className="flex items-center gap-2 flex-wrap" role="tablist">
          {tabs.map(([key, label]) => (
            <button
              key={key}
              role="tab"
              aria-selected={tab === key}
              onClick={() => { setLoaded(false); setTab(key) }}
              className={`px-4 py-2 rounded-full text-sm ${tab === key ? 'bg-primary-600 text-white' : 'bg-gray-100 text-gray-700 hover:bg-gray-200'}`}
            >
              {label}
            </button>
          ))}
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
        {loaded && !notice && tab === 'mine' && goals.some((goal) => goal.status === 'ACTIVE') && (
          <p className={`text-sm ${weightTotal === 100 ? 'text-gray-500' : 'text-amber-700'}`}>
            مجموع أوزان أهدافك السارية: {weightTotal}%{weightTotal === 100 ? '' : ' — المفروض 100%'}
          </p>
        )}
        {loaded && !notice && tab === 'team' && !isManager && <EmptyState title="مالكش مرؤوسين مباشرين في الهيكل" icon={Target} />}
        {loaded && !notice && goals.length === 0 && !(tab === 'team' && !isManager) && <EmptyState title="مفيش أهداف هنا لسه" icon={Target} />}
        {loaded && !notice && goals.length > 0 && <GoalList goals={goals} showOwner={tab !== 'mine'} onOpen={setOpen} />}
        {loaded && !notice && shared.length > 0 && (
          <div className="space-y-3">
            <h2 className="text-lg font-bold text-gray-800">أهداف قسمك والشركة</h2>
            <GoalList goals={shared} showOwner onOpen={setOpen} />
          </div>
        )}
      </div>
      {adding && (
        <GoalModal
          tab={tab}
          reports={reports}
          departments={departments}
          canCompany={canCompany}
          parents={shared}
          onClose={() => setAdding(false)}
          onDone={() => { setAdding(false); load() }}
        />
      )}
      {open !== null && <GoalDetail id={open} onClose={() => { setOpen(null); load() }} />}
    </MainLayout>
  )
}

function GoalList({ goals, showOwner, onOpen }: { goals: ApiGoal[]; showOwner: boolean; onOpen: (id: number) => void }) {
  return (
    <div className="grid gap-3" data-goals>
      {goals.map((goal) => (
        <button key={goal.id} onClick={() => onOpen(goal.id)} className="card text-start hover:shadow-md transition-shadow">
          <div className="flex items-start justify-between gap-3">
            <div>
              <h3 className="font-bold text-gray-800">{goal.title}</h3>
              <p className="text-xs text-gray-500 mt-1">
                {showOwner ? `${ownerText(goal)} · ` : ''}
                {goal.kindLabel} · الوزن {goal.weight}% · {formatDate(goal.periodStart)} – {formatDate(goal.periodEnd)}
                {goal.parentTitle ? ` · تحت: ${goal.parentTitle}` : ''}
              </p>
            </div>
            <span className={`inline-block px-2 py-0.5 rounded-full text-xs whitespace-nowrap ${statusStyle[goal.status]}`}>{goal.statusLabel}</span>
          </div>
          {goal.targetValue !== null && (
            <div className="mt-3">
              <div className="flex items-center justify-between text-xs text-gray-500 tabular-nums">
                <span>
                  {goal.actualValue ?? '0.00'} من {goal.targetValue} {goal.unit ?? ''}
                </span>
                <span>{goal.progressPercent !== null ? `${goal.progressPercent}%` : '—'}</span>
              </div>
              <div className="mt-1 h-2 rounded-full bg-gray-100 overflow-hidden">
                <div className="h-full bg-primary-500 rounded-full" style={{ width: `${Math.min(100, goal.progressPercent ?? 0)}%` }} />
              </div>
            </div>
          )}
        </button>
      ))}
    </div>
  )
}

function GoalModal({ tab, reports, departments, canCompany, parents, onClose, onDone }: {
  tab: Tab; reports: Array<{ id: number; fullName: string }>; departments: ApiDepartment[]; canCompany: boolean; parents: ApiGoal[]; onClose: () => void; onDone: () => void
}) {
  const [ownerType, setOwnerType] = useState<GoalOwnerType>(tab === 'all' ? (departments.length ? 'DEPARTMENT' : 'COMPANY') : 'EMPLOYEE')
  const [employeeId, setEmployeeId] = useState('')
  const [departmentId, setDepartmentId] = useState('')
  const [parentGoalId, setParentGoalId] = useState('')
  const [kind, setKind] = useState<GoalKind>('GOAL')
  const [title, setTitle] = useState('')
  const [description, setDescription] = useState('')
  const [weight, setWeight] = useState('0')
  const [targetValue, setTargetValue] = useState('')
  const [unit, setUnit] = useState('')
  const [periodStart, setPeriodStart] = useState('')
  const [periodEnd, setPeriodEnd] = useState('')
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')

  const weightOk = /^\d{1,3}$/.test(weight.trim()) && Number(weight) <= 100
  const targetOk = targetValue.trim() === '' || /^-?\d{1,12}(\.\d{1,2})?$/.test(targetValue.trim())
  const ownerOk = tab === 'mine' || (tab === 'team' && employeeId !== '') || (tab === 'all' && (ownerType === 'COMPANY' || departmentId !== ''))
  const valid = title.trim().length >= 3 && weightOk && targetOk && periodStart !== '' && periodEnd !== '' && periodEnd >= periodStart && ownerOk

  const submit = async () => {
    setSaving(true)
    setError('')
    try {
      await createGoal({
        ownerType, ...(tab === 'team' ? { employeeId: Number(employeeId) } : {}), ...(ownerType === 'DEPARTMENT' ? { departmentId: Number(departmentId) } : {}),
        ...(parentGoalId ? { parentGoalId: Number(parentGoalId) } : {}), kind, title: title.trim(), description: description.trim() || null, weight: Number(weight),
        targetValue: targetValue.trim() || null, unit: unit.trim() || null, periodStart, periodEnd,
      })
      onDone()
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'تعذر حفظ الهدف')
      setSaving(false)
    }
  }

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50" role="dialog" aria-modal="true" aria-label="هدف جديد">
      <div className="bg-white rounded-2xl w-full max-w-2xl mx-4 max-h-[90vh] overflow-auto">
        <div className="p-6 border-b border-gray-100 flex items-center justify-between">
          <div>
            <h2 className="text-xl font-bold text-gray-800">{tab === 'mine' ? 'اقترح هدف' : 'هدف جديد'}</h2>
            <p className="text-sm text-gray-500 mt-1">{tab === 'mine' ? 'بيتبعت لمديرك المباشر يعتمده' : 'بيبقى ساري على طول'}</p>
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
          {tab === 'team' && (
            <label className="block text-sm text-gray-700">
              الموظف
              <select className="input w-full mt-1" value={employeeId} onChange={(e) => setEmployeeId(e.target.value)}>
                <option value="">اختر المرؤوس</option>
                {reports.map((row) => (
                  <option key={row.id} value={row.id}>
                    {row.fullName}
                  </option>
                ))}
              </select>
            </label>
          )}
          {tab === 'all' && (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <label className="block text-sm text-gray-700">
                صاحب الهدف
                <select className="input w-full mt-1" value={ownerType} onChange={(e) => setOwnerType(e.target.value as GoalOwnerType)}>
                  {departments.length > 0 && <option value="DEPARTMENT">قسم</option>}
                  {canCompany && <option value="COMPANY">الشركة</option>}
                </select>
              </label>
              {ownerType === 'DEPARTMENT' && (
                <label className="block text-sm text-gray-700">
                  القسم
                  <select className="input w-full mt-1" value={departmentId} onChange={(e) => setDepartmentId(e.target.value)}>
                    <option value="">اختر القسم</option>
                    {departments.map((row) => (
                      <option key={row.id} value={row.id}>
                        {row.name}
                      </option>
                    ))}
                  </select>
                </label>
              )}
            </div>
          )}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <label className="block text-sm text-gray-700 sm:col-span-2">
              عنوان الهدف
              <input className="input w-full mt-1" maxLength={200} value={title} onChange={(e) => setTitle(e.target.value)} />
            </label>
            <label className="block text-sm text-gray-700">
              النوع
              <select className="input w-full mt-1" value={kind} onChange={(e) => setKind(e.target.value as GoalKind)}>
                {(Object.keys(GOAL_KIND_LABELS) as GoalKind[]).map((key) => (
                  <option key={key} value={key}>
                    {GOAL_KIND_LABELS[key]}
                  </option>
                ))}
              </select>
            </label>
          </div>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
            <label className="block text-sm text-gray-700">
              الوزن %
              <input type="number" min={0} max={100} className="input w-full mt-1" value={weight} onChange={(e) => setWeight(e.target.value)} />
            </label>
            <label className="block text-sm text-gray-700">
              المستهدف (اختياري)
              <input inputMode="decimal" className="input w-full mt-1" value={targetValue} onChange={(e) => setTargetValue(e.target.value)} />
            </label>
            <label className="block text-sm text-gray-700">
              الوحدة
              <input className="input w-full mt-1" maxLength={30} value={unit} onChange={(e) => setUnit(e.target.value)} />
            </label>
            {parents.length > 0 && tab === 'mine' && (
              <label className="block text-sm text-gray-700">
                تحت هدف
                <select className="input w-full mt-1" value={parentGoalId} onChange={(e) => setParentGoalId(e.target.value)}>
                  <option value="">من غير</option>
                  {parents.map((row) => (
                    <option key={row.id} value={row.id}>
                      {row.title}
                    </option>
                  ))}
                </select>
              </label>
            )}
          </div>
          <div className="grid grid-cols-2 gap-4">
            <label className="block text-sm text-gray-700">
              من
              <input type="date" className="input w-full mt-1" value={periodStart} onChange={(e) => setPeriodStart(e.target.value)} />
            </label>
            <label className="block text-sm text-gray-700">
              إلى
              <input type="date" className="input w-full mt-1" min={periodStart} value={periodEnd} onChange={(e) => setPeriodEnd(e.target.value)} />
            </label>
          </div>
          <label className="block text-sm text-gray-700">
            الوصف (اختياري)
            <textarea className="input w-full mt-1" rows={2} maxLength={1000} value={description} onChange={(e) => setDescription(e.target.value)} />
          </label>
        </div>
        <div className="p-6 border-t border-gray-100 flex justify-end gap-2">
          <button onClick={onClose} className="btn-secondary">
            إلغاء
          </button>
          <button onClick={submit} disabled={!valid || saving} title="العنوان والوزن والفترة مطلوبين" className="btn-primary disabled:opacity-50">
            حفظ
          </button>
        </div>
      </div>
    </div>
  )
}

function GoalDetail({ id, onClose }: { id: number; onClose: () => void }) {
  const [goal, setGoal] = useState<ApiGoalDetail | null>(null)
  const [error, setError] = useState('')
  const [busy, setBusy] = useState(false)
  const [actual, setActual] = useState('')
  const [note, setNote] = useState('')
  const [reason, setReason] = useState('')
  const [target, setTarget] = useState('')
  const [weight, setWeight] = useState('')
  const [taskId, setTaskId] = useState('')

  useEffect(() => {
    fetchGoal(id).then(setGoal).catch((cause) => setError(cause instanceof Error ? cause.message : 'تعذر تحميل الهدف'))
  }, [id])

  const run = async (work: () => Promise<ApiGoalDetail>) => {
    setBusy(true)
    setError('')
    try {
      setGoal(await work())
      setActual(''); setNote(''); setReason(''); setTarget(''); setWeight(''); setTaskId('')
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'تعذر تنفيذ الإجراء')
    } finally {
      setBusy(false)
    }
  }
  const reasonOk = reason.trim().length >= 3
  const changeOk = reasonOk && (target.trim() !== '' || weight.trim() !== '')

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50" role="dialog" aria-modal="true" aria-label="تفاصيل الهدف">
      <div className="bg-white rounded-2xl w-full max-w-2xl mx-4 max-h-[90vh] overflow-auto">
        <div className="p-6 border-b border-gray-100 flex items-center justify-between">
          <div>
            <h2 className="text-xl font-bold text-gray-800">{goal?.title ?? 'الهدف'}</h2>
            {goal && (
              <p className="text-sm text-gray-500 mt-1">
                {ownerText(goal)} · {goal.kindLabel} · الوزن {goal.weight}% · {goal.statusLabel}
              </p>
            )}
          </div>
          <button onClick={onClose} className="p-2 hover:bg-gray-100 rounded-lg" aria-label="إغلاق">
            <X size={20} />
          </button>
        </div>
        <div className="p-6 space-y-5">
          {error && (
            <div role="alert" className="bg-red-50 text-red-700 rounded-xl p-3 text-sm">
              {error}
            </div>
          )}
          {goal && (
            <>
              {goal.description && <p className="text-sm text-gray-700 whitespace-pre-line">{goal.description}</p>}
              <p className="text-sm text-gray-600 tabular-nums">
                {formatDate(goal.periodStart)} – {formatDate(goal.periodEnd)}
                {goal.targetValue !== null ? ` · ${goal.actualValue ?? '0.00'} من ${goal.targetValue} ${goal.unit ?? ''}${goal.progressPercent !== null ? ` (${goal.progressPercent}%)` : ''}` : ''}
              </p>
              {goal.decisionReason && <p className="text-sm text-amber-700">سبب القرار: {goal.decisionReason}</p>}
              {goal.can.decide && (
                <div className="bg-amber-50 rounded-xl p-4 space-y-3">
                  <p className="text-sm font-medium text-amber-900">هدف مقترح مستني قرارك</p>
                  <input className="input w-full text-sm" maxLength={300} placeholder="السبب (مطلوب للرفض)" value={reason} onChange={(e) => setReason(e.target.value)} />
                  <div className="flex gap-2">
                    <button onClick={() => run(() => decideGoal(goal.id, 'approve', reason.trim() || undefined))} disabled={busy} className="btn-primary text-sm disabled:opacity-50">
                      اعتماد
                    </button>
                    <button onClick={() => run(() => decideGoal(goal.id, 'reject', reason.trim()))} disabled={busy || !reasonOk} className="btn-secondary text-sm disabled:opacity-50">
                      رفض
                    </button>
                  </div>
                </div>
              )}
              {goal.can.progress && (
                <div className="border border-gray-100 rounded-xl p-4 space-y-3">
                  <p className="text-sm font-medium text-gray-800">تحديث التقدّم</p>
                  <div className="flex gap-2 flex-wrap">
                    <input inputMode="decimal" className="input text-sm w-32" placeholder="الفعلي" value={actual} onChange={(e) => setActual(e.target.value)} />
                    <input className="input text-sm flex-1 min-w-[10rem]" maxLength={1000} placeholder="تعليق" value={note} onChange={(e) => setNote(e.target.value)} />
                    <button onClick={() => run(() => progressGoal(goal.id, actual.trim(), note.trim() || undefined))} disabled={busy || actual.trim() === ''} className="btn-primary text-sm disabled:opacity-50">
                      حفظ
                    </button>
                  </div>
                </div>
              )}
              {goal.can.change && (
                <div className="border border-gray-100 rounded-xl p-4 space-y-3">
                  <p className="text-sm font-medium text-gray-800">تعديل في نص الفترة (بسبب)</p>
                  <div className="flex gap-2 flex-wrap">
                    <input inputMode="decimal" className="input text-sm w-32" placeholder="مستهدف جديد" value={target} onChange={(e) => setTarget(e.target.value)} />
                    <input type="number" min={0} max={100} className="input text-sm w-28" placeholder="وزن جديد" value={weight} onChange={(e) => setWeight(e.target.value)} />
                    <input className="input text-sm flex-1 min-w-[10rem]" maxLength={300} placeholder="السبب" value={reason} onChange={(e) => setReason(e.target.value)} />
                    <button
                      onClick={() => run(() => changeGoal(goal.id, { ...(target.trim() ? { targetValue: target.trim() } : {}), ...(weight.trim() ? { weight: Number(weight) } : {}), reason: reason.trim() }))}
                      disabled={busy || !changeOk}
                      className="btn-secondary text-sm disabled:opacity-50"
                    >
                      تعديل
                    </button>
                  </div>
                </div>
              )}
              {goal.can.evidence && (
                <div className="flex gap-2 flex-wrap items-center">
                  <span className="text-sm text-gray-700">مهمة كدليل:</span>
                  <input inputMode="numeric" className="input text-sm w-32" placeholder="رقم المهمة" value={taskId} onChange={(e) => setTaskId(e.target.value)} />
                  <button onClick={() => run(() => linkGoalTask(goal.id, Number(taskId)))} disabled={busy || !/^\d+$/.test(taskId.trim())} className="btn-secondary text-sm disabled:opacity-50">
                    ربط
                  </button>
                </div>
              )}
              {goal.can.close && (
                <div className="flex gap-2 flex-wrap">
                  {goal.status === 'ACTIVE' && (
                    <button onClick={() => run(() => closeGoal(goal.id, 'DONE', note.trim() || undefined))} disabled={busy} className="btn-primary text-sm disabled:opacity-50">
                      اتحقق
                    </button>
                  )}
                  <button onClick={() => run(() => closeGoal(goal.id, 'CANCELLED', note.trim() || undefined))} disabled={busy} className="btn-secondary text-sm disabled:opacity-50">
                    {goal.status === 'PROPOSED' ? 'سحب المقترح' : 'إلغاء الهدف'}
                  </button>
                </div>
              )}
              <div>
                <h3 className="text-sm font-bold text-gray-800 mb-2">السجل</h3>
                <div className="space-y-2" data-goal-log>
                  {goal.updates.map((line) => (
                    <div key={line.id} className="border border-gray-100 rounded-lg p-3 text-sm">
                      <p className="text-gray-800">
                        {UPDATE_LABELS[line.kind]}
                        {line.actualValue !== null ? ` · الفعلي ${line.actualValue}` : ''}
                        {line.taskId !== null ? ` · مهمة ${line.taskId}` : ''}
                      </p>
                      {line.note && <p className="text-gray-600 mt-1 whitespace-pre-line">{line.note}</p>}
                      <p className="text-xs text-gray-400 mt-1">
                        {formatDate(line.at)}
                        {line.byName ? ` · ${line.byName}` : ''}
                      </p>
                    </div>
                  ))}
                </div>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  )
}
