'use client'

import { useEffect, useMemo, useState } from 'react'
import { MainLayout } from '@/components/layout'
import Link from 'next/link'
import {
  ArrowRight,
  UserPlus,
  CheckCircle2,
  Circle,
  Clock,
  ChevronDown,
  Laptop,
  FileText,
  KeyRound,
  Users,
  Wallet,
  AlertTriangle,
  Plus,
  Pencil,
  Ban,
  RotateCcw,
  ListChecks,
  X,
} from 'lucide-react'
import {
  fetchOnboarding,
  updateOnboardingTask,
  addOnboardingTask,
  fetchOnboardingTemplate,
  createOnboardingTemplateItem,
  updateOnboardingTemplateItem,
  updateConfig,
  type ApiOnboardingEmployee,
  type ApiOnboardingTask,
  type ApiOnboardingTemplateItem,
  type OnboardingParty,
} from '@/lib/api'
import { localDateStr, localToday } from '@/lib/dates'

const PARTIES: OnboardingParty[] = ['hr', 'it', 'custody', 'finance', 'manager']

const partyLabels: Record<OnboardingParty, string> = {
  hr: 'الموارد البشرية',
  it: 'تقنية المعلومات',
  custody: 'أمين العهدة',
  finance: 'المالية',
  manager: 'المدير المباشر',
}

const partyColors: Record<OnboardingParty, string> = {
  hr: 'bg-primary-50 text-primary-700',
  it: 'bg-blue-50 text-blue-700',
  custody: 'bg-amber-50 text-amber-700',
  finance: 'bg-teal-50 text-teal-700',
  manager: 'bg-indigo-50 text-indigo-700',
}

const partyIcons: Record<OnboardingParty, typeof FileText> = {
  hr: FileText,
  it: KeyRound,
  custody: Laptop,
  finance: Wallet,
  manager: Users,
}

// التقدّم = المغلقة (تمّت أو غير مطلوبة) من إجمالي المهام
const closedOf = (e: ApiOnboardingEmployee) =>
  e.tasks.filter((t) => t.status !== 'PENDING').length
const progressOf = (e: ApiOnboardingEmployee) =>
  e.tasks.length === 0 ? 0 : Math.round((closedOf(e) / e.tasks.length) * 100)

interface TaskDraft {
  label: string
  party: OnboardingParty
  dueDate: string
}

// قوائم التهيئة محفوظة في الباك إند — مشتركة بين الجهات، والموعد من تاريخ الالتحاق
export default function OnboardingPage() {
  const [list, setList] = useState<ApiOnboardingEmployee[]>([])
  const [windowDays, setWindowDays] = useState<number | null>(null)
  const [canManageTemplate, setCanManageTemplate] = useState(false)
  const [expanded, setExpanded] = useState<number | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [busyTask, setBusyTask] = useState<number | null>(null)
  const [filter, setFilter] = useState<'active' | 'done' | 'all'>('active')
  // المهام اللي أقدر أتمّها فقط (جهتي/المدير المباشر)
  const [mineOnly, setMineOnly] = useState(false)
  // تعديل مهمة (HR): الوصف والجهة والموعد
  const [editing, setEditing] = useState<({ id: number } & TaskDraft) | null>(null)
  // مهمة إضافية لموظف بعينه (HR)
  const [adding, setAdding] = useState<({ employeeId: number } & TaskDraft) | null>(null)
  const [savingAdd, setSavingAdd] = useState(false)
  const [showTemplate, setShowTemplate] = useState(false)

  const today = localToday()

  const load = async (keepExpanded = false) => {
    setLoading(true)
    setError('')
    try {
      const res = await fetchOnboarding()
      setList(res.employees)
      setWindowDays(res.windowDays)
      setCanManageTemplate(res.canManageTemplate)
      if (!keepExpanded) {
        setExpanded(res.employees.find((e) => progressOf(e) < 100)?.id ?? null)
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'تعذر تحميل قوائم التهيئة')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    load()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  // استبدال المهمة برد السيرفر (الحالة ومن أتمّها ووقتها)
  const replaceTask = (t: ApiOnboardingTask) =>
    setList((prev) =>
      prev.map((e) =>
        e.id === t.employeeId
          ? { ...e, tasks: e.tasks.map((x) => (x.id === t.id ? t : x)) }
          : e
      )
    )

  const patchTask = async (
    task: ApiOnboardingTask,
    d: Parameters<typeof updateOnboardingTask>[1]
  ) => {
    setBusyTask(task.id)
    setError('')
    try {
      replaceTask(await updateOnboardingTask(task.id, d))
      return true
    } catch (err) {
      setError(err instanceof Error ? err.message : 'تعذر حفظ المهمة')
      return false
    } finally {
      setBusyTask(null)
    }
  }

  const toggleTask = (task: ApiOnboardingTask) =>
    patchTask(task, { status: task.status === 'DONE' ? 'PENDING' : 'DONE' })

  const saveEdit = async (task: ApiOnboardingTask) => {
    if (!editing) return
    const ok = await patchTask(task, {
      label: editing.label.trim(),
      party: editing.party,
      dueDate: editing.dueDate,
    })
    if (ok) setEditing(null)
  }

  const saveAdd = async () => {
    if (!adding) return
    setSavingAdd(true)
    setError('')
    try {
      const t = await addOnboardingTask(adding.employeeId, {
        label: adding.label.trim(),
        party: adding.party,
        dueDate: adding.dueDate,
      })
      setList((prev) =>
        prev.map((e) => (e.id === t.employeeId ? { ...e, tasks: [...e.tasks, t] } : e))
      )
      setAdding(null)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'تعذر إضافة المهمة')
    } finally {
      setSavingAdd(false)
    }
  }

  const inProgress = list.filter((e) => progressOf(e) < 100).length
  const overdueTasks = list.reduce(
    (s, e) =>
      s + e.tasks.filter((t) => t.status === 'PENDING' && t.dueDate < today).length,
    0
  )

  // الفلترة: الحالة + «مهامي فقط»
  const visible = useMemo(
    () =>
      list
        .map((e) => (mineOnly ? { ...e, tasks: e.tasks.filter((t) => t.canAct) } : e))
        .filter((e) => !mineOnly || e.tasks.length > 0)
        .filter((e) =>
          filter === 'all'
            ? true
            : filter === 'done'
            ? progressOf(e) === 100
            : progressOf(e) < 100
        ),
    [list, mineOnly, filter]
  )

  const renderTask = (emp: ApiOnboardingEmployee, task: ApiOnboardingTask) => {
    const TaskIcon = partyIcons[task.party] ?? FileText
    const done = task.status === 'DONE'
    const skipped = task.status === 'SKIPPED'
    const overdue = task.status === 'PENDING' && task.dueDate < today
    const busy = busyTask === task.id
    const draft = editing && editing.id === task.id ? editing : null
    return (
      <div
        key={task.id}
        className={`flex items-start gap-3 p-3 rounded-xl border transition-all ${
          done
            ? 'bg-success-50/50 border-success-100'
            : skipped
            ? 'bg-gray-50 border-gray-100'
            : overdue
            ? 'bg-red-50/50 border-red-200'
            : 'bg-white border-gray-100'
        }`}
      >
        <button
          onClick={() => toggleTask(task)}
          disabled={!task.canAct || busy}
          title={
            task.canAct
              ? done
                ? 'إعادة فتح المهمة'
                : 'تعليم المهمة كمكتملة'
              : skipped
              ? 'غير مطلوبة — تعيد فتحها الموارد البشرية'
              : 'ليست على جهتك — تتمّها جهتها أو الموارد البشرية'
          }
          className="shrink-0 mt-0.5 disabled:cursor-not-allowed"
        >
          {busy ? (
            <span className="block w-5 h-5 border-2 border-primary-500 border-t-transparent rounded-full animate-spin" />
          ) : done ? (
            <CheckCircle2 size={20} className="text-success-500" />
          ) : skipped ? (
            <Ban size={20} className="text-gray-300" />
          ) : (
            <Circle
              size={20}
              className={task.canAct ? 'text-gray-300 hover:text-primary-400' : 'text-gray-200'}
            />
          )}
        </button>
        <TaskIcon size={18} className="text-gray-400 shrink-0 mt-0.5" />
        <div className="flex-1 min-w-0">
          {draft ? (
            <div className="space-y-2">
              <input
                className="input w-full text-sm"
                value={draft.label}
                maxLength={200}
                onChange={(e) => setEditing({ ...draft, label: e.target.value })}
              />
              <div className="flex gap-2">
                <select
                  className="input flex-1 text-sm"
                  value={draft.party}
                  onChange={(e) =>
                    setEditing({ ...draft, party: e.target.value as OnboardingParty })
                  }
                >
                  {PARTIES.map((p) => (
                    <option key={p} value={p}>
                      {partyLabels[p]}
                    </option>
                  ))}
                </select>
                <input
                  type="date"
                  className="input text-sm"
                  value={draft.dueDate}
                  onChange={(e) => setEditing({ ...draft, dueDate: e.target.value })}
                />
              </div>
              <div className="flex gap-2 justify-end">
                <button onClick={() => setEditing(null)} className="btn-secondary text-sm">
                  إلغاء
                </button>
                <button
                  onClick={() => saveEdit(task)}
                  disabled={busy || draft.label.trim().length < 2 || !draft.dueDate}
                  title="الحفظ يحتاج وصفًا من حرفين على الأقل مع تاريخ استحقاق"
                  className="btn-primary text-sm disabled:opacity-50"
                >
                  حفظ
                </button>
              </div>
            </div>
          ) : (
            <>
              <p
                className={`text-sm font-medium ${
                  done || skipped ? 'text-gray-400 line-through' : 'text-gray-700'
                }`}
              >
                {task.label}
              </p>
              <div className="flex items-center gap-2 mt-1 flex-wrap">
                <span
                  className={`text-xs px-2 py-0.5 rounded-lg ${
                    partyColors[task.party] ?? 'bg-gray-100 text-gray-600'
                  }`}
                >
                  {partyLabels[task.party] ?? task.party}
                </span>
                <span
                  className={`text-xs flex items-center gap-1 ${
                    overdue ? 'text-red-500 font-medium' : 'text-gray-400'
                  }`}
                >
                  <Clock size={10} />
                  <span dir="ltr">{task.dueDate}</span>
                  {overdue && ' — متأخرة!'}
                </span>
                {skipped && <span className="text-xs text-gray-400">غير مطلوبة</span>}
              </div>
              {done && task.doneByName && (
                <p className="text-xs text-gray-400 mt-1">
                  تمّت بواسطة {task.doneByName}
                  {task.doneAt && (
                    <>
                      {' — '}
                      <span dir="ltr">{localDateStr(new Date(task.doneAt))}</span>
                    </>
                  )}
                </p>
              )}
            </>
          )}
        </div>
        {emp.canManage && !draft && (
          <div className="flex items-center gap-1 shrink-0">
            <button
              onClick={() =>
                setEditing({
                  id: task.id,
                  label: task.label,
                  party: task.party,
                  dueDate: task.dueDate,
                })
              }
              disabled={busy}
              className="p-1.5 rounded-lg hover:bg-gray-100"
              title="تعديل الوصف والجهة والموعد"
            >
              <Pencil size={14} className="text-gray-400" />
            </button>
            {skipped ? (
              <button
                onClick={() => patchTask(task, { status: 'PENDING' })}
                disabled={busy}
                className="p-1.5 rounded-lg hover:bg-gray-100"
                title="إعادة فتح المهمة"
              >
                <RotateCcw size={14} className="text-gray-400" />
              </button>
            ) : (
              !done && (
                <button
                  onClick={() => patchTask(task, { status: 'SKIPPED' })}
                  disabled={busy}
                  className="p-1.5 rounded-lg hover:bg-gray-100"
                  title="غير مطلوبة لهذا الموظف"
                >
                  <Ban size={14} className="text-gray-400" />
                </button>
              )
            )}
          </div>
        )}
      </div>
    )
  }

  const renderAdd = (emp: ApiOnboardingEmployee) =>
    adding && adding.employeeId === emp.id ? (
      <div className="mt-3 p-3 bg-white rounded-xl border border-dashed border-primary-200 flex items-center gap-2 flex-wrap">
        <input
          className="input flex-1 min-w-[220px] text-sm"
          placeholder="وصف المهمة"
          value={adding.label}
          maxLength={200}
          onChange={(e) => setAdding({ ...adding, label: e.target.value })}
        />
        <select
          className="input text-sm"
          value={adding.party}
          onChange={(e) => setAdding({ ...adding, party: e.target.value as OnboardingParty })}
        >
          {PARTIES.map((p) => (
            <option key={p} value={p}>
              {partyLabels[p]}
            </option>
          ))}
        </select>
        <input
          type="date"
          className="input text-sm"
          value={adding.dueDate}
          onChange={(e) => setAdding({ ...adding, dueDate: e.target.value })}
        />
        <button
          onClick={saveAdd}
          disabled={savingAdd || adding.label.trim().length < 2 || !adding.dueDate}
          title="الإضافة تحتاج وصفًا من حرفين على الأقل مع تاريخ استحقاق"
          className="btn-primary text-sm disabled:opacity-50"
        >
          إضافة
        </button>
        <button onClick={() => setAdding(null)} className="btn-secondary text-sm">
          إلغاء
        </button>
      </div>
    ) : (
      <button
        onClick={() =>
          setAdding({
            employeeId: emp.id,
            label: '',
            party: 'hr',
            dueDate: emp.joinDate && emp.joinDate > today ? emp.joinDate : today,
          })
        }
        className="mt-3 text-sm text-primary-600 hover:text-primary-700 flex items-center gap-1"
      >
        <Plus size={14} />
        إضافة مهمة لهذا الموظف
      </button>
    )

  return (
    <MainLayout>
      <div className="space-y-6">
        {/* Breadcrumb */}
        <div className="flex items-center gap-2 text-sm text-gray-500">
          <Link href="/employees" className="hover:text-primary-600">
            إدارة الموظفين
          </Link>
          <ArrowRight size={16} />
          <span className="text-gray-800">تهيئة الموظفين الجدد</span>
        </div>

        {/* Header */}
        <div className="flex items-center justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold text-gray-800">
              تهيئة الموظفين الجدد
            </h1>
            <p className="text-gray-500 mt-1">
              الملتحقون خلال آخر {windowDays ?? '…'} يوم والمنتظر التحاقهم — قائمة مهام
              محفوظة ومشتركة بين الموارد البشرية وتقنية المعلومات وأمين العهدة والمالية
              والمدير المباشر
            </p>
          </div>
          {canManageTemplate && (
            <button
              onClick={() => setShowTemplate(true)}
              className="btn-secondary flex items-center gap-2 shrink-0"
            >
              <ListChecks size={18} />
              قالب المهام
            </button>
          )}
        </div>

        {/* Error Banner */}
        {error && (
          <div className="bg-red-50 text-red-700 rounded-xl p-4">{error}</div>
        )}

        {/* Stats */}
        <div className="grid grid-cols-3 gap-4">
          <div className="card p-4 flex items-center gap-3">
            <div className="w-12 h-12 bg-primary-50 rounded-xl flex items-center justify-center">
              <UserPlus size={24} className="text-primary-500" />
            </div>
            <div>
              <p className="text-sm text-gray-500">قيد التهيئة</p>
              <p className="text-2xl font-bold text-gray-800">{inProgress}</p>
            </div>
          </div>
          <div className="card p-4 flex items-center gap-3">
            <div className="w-12 h-12 bg-success-50 rounded-xl flex items-center justify-center">
              <CheckCircle2 size={24} className="text-success-500" />
            </div>
            <div>
              <p className="text-sm text-gray-500">اكتملت تهيئتهم</p>
              <p className="text-2xl font-bold text-success-600">
                {list.length - inProgress}
              </p>
            </div>
          </div>
          <div className="card p-4 flex items-center gap-3">
            <div className="w-12 h-12 bg-red-100 rounded-xl flex items-center justify-center">
              <AlertTriangle size={24} className="text-red-500" />
            </div>
            <div>
              <p className="text-sm text-gray-500">مهام متأخرة</p>
              <p className="text-2xl font-bold text-red-600">{overdueTasks}</p>
            </div>
          </div>
        </div>

        {/* الفلاتر */}
        <div className="flex items-center justify-between gap-4 flex-wrap">
          <div className="flex items-center gap-1 bg-gray-100 rounded-xl p-1">
            {(
              [
                ['active', `قيد التهيئة (${inProgress})`],
                ['done', `مكتملة (${list.length - inProgress})`],
                ['all', `الكل (${list.length})`],
              ] as const
            ).map(([key, label]) => (
              <button
                key={key}
                onClick={() => setFilter(key)}
                className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                  filter === key
                    ? 'bg-white shadow-sm text-primary-600'
                    : 'text-gray-600 hover:text-gray-800'
                }`}
              >
                {label}
              </button>
            ))}
          </div>
          <label className="flex items-center gap-2 text-sm text-gray-600 cursor-pointer">
            <input
              type="checkbox"
              checked={mineOnly}
              onChange={(e) => setMineOnly(e.target.checked)}
              className="rounded"
            />
            المهام التي أستطيع إتمامها فقط
          </label>
        </div>

        {/* Loading */}
        {loading ? (
          <div className="flex items-center justify-center py-20">
            <div className="w-8 h-8 border-2 border-primary-500 border-t-transparent rounded-full animate-spin" />
          </div>
        ) : (
        /* Employees */
        <div className="space-y-4">
          {visible.length === 0 && (
            <div className="card p-12 text-center">
              <UserPlus size={48} className="mx-auto text-gray-300 mb-4" />
              <p className="text-gray-500">
                {list.length === 0
                  ? `لا يوجد موظفون جدد قيد التهيئة — يظهر هنا من التحق خلال آخر ${
                      windowDays ?? '…'
                    } يوم أو ينتظر التحاقه`
                  : 'لا يوجد موظفون مطابقون للفلتر الحالي'}
              </p>
            </div>
          )}
          {visible.map((emp) => {
            const pct = progressOf(emp)
            const isOpen = expanded === emp.id
            const upcoming = !!emp.joinDate && emp.joinDate > today
            return (
              <div key={emp.id} className="card overflow-hidden">
                {/* رأس الموظف */}
                <button
                  onClick={() => setExpanded(isOpen ? null : emp.id)}
                  className="w-full p-5 flex items-center justify-between hover:bg-gray-50/50 transition-colors"
                >
                  <div className="flex items-center gap-4">
                    <div className="w-12 h-12 bg-gradient-to-br from-primary-400 to-primary-600 rounded-xl flex items-center justify-center text-white font-bold">
                      {emp.fullName.charAt(0)}
                    </div>
                    <div className="text-right">
                      <div className="flex items-center gap-2 flex-wrap">
                        <h3 className="font-bold text-gray-800">{emp.fullName}</h3>
                        <span className="badge text-xs bg-indigo-100 text-indigo-700">
                          {emp.branchName}
                        </span>
                        {upcoming && (
                          <span className="badge text-xs bg-blue-100 text-blue-700">
                            لم يباشر بعد
                          </span>
                        )}
                        {pct === 100 && (
                          <span className="badge badge-success text-xs">مكتمل ✓</span>
                        )}
                      </div>
                      <p className="text-sm text-gray-500">
                        {emp.jobTitle ?? '—'} • {emp.employeeCode} • مباشرة:{' '}
                        <span dir="ltr">{emp.joinDate ?? '—'}</span>
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-4">
                    <div className="w-40">
                      <div className="flex items-center justify-between text-xs mb-1">
                        <span className="text-gray-400">
                          {closedOf(emp)}/{emp.tasks.length} مهام
                        </span>
                        <span
                          className={`font-bold ${
                            pct === 100 ? 'text-success-600' : 'text-gray-600'
                          }`}
                        >
                          {pct}%
                        </span>
                      </div>
                      <div className="h-2 bg-gray-100 rounded-full overflow-hidden">
                        <div
                          className={`h-full rounded-full transition-all ${
                            pct === 100 ? 'bg-success-500' : 'bg-primary-500'
                          }`}
                          style={{ width: `${pct}%` }}
                        />
                      </div>
                    </div>
                    <ChevronDown
                      size={20}
                      className={`text-gray-400 transition-transform ${
                        isOpen ? 'rotate-180' : ''
                      }`}
                    />
                  </div>
                </button>

                {/* قائمة المهام */}
                {isOpen && (
                  <div className="border-t border-gray-100 p-5 bg-gray-50/40">
                    {emp.tasks.length === 0 && (
                      <p className="text-sm text-gray-500 mb-3">
                        لا توجد مهام — قالب المهام فارغ أو كل بنوده معطّلة
                      </p>
                    )}
                    <div className="grid grid-cols-2 gap-3">
                      {emp.tasks.map((task) => renderTask(emp, task))}
                    </div>
                    {emp.canManage && renderAdd(emp)}
                  </div>
                )}
              </div>
            )
          })}
        </div>
        )}

        {showTemplate && (
          <TemplateModal
            windowDays={windowDays ?? 90}
            onClose={() => setShowTemplate(false)}
            onChanged={() => load(true)}
          />
        )}
      </div>
    </MainLayout>
  )
}

interface TplDraft {
  label: string
  party: OnboardingParty
  dueOffsetDays: string
  isActive: boolean
}

const toDraft = (r: ApiOnboardingTemplateItem): TplDraft => ({
  label: r.label,
  party: r.party,
  dueOffsetDays: String(r.dueOffsetDays),
  isActive: r.isActive,
})

// إزاحة صالحة: عدد صحيح من -60 إلى 365 (مرآة تحقق الباك)
const validOffset = (v: string) => {
  const n = Number(v)
  return v.trim() !== '' && Number.isInteger(n) && n >= -60 && n <= 365
}

// قالب المهام ونافذة «الموظف الجديد» (settings.manage) — التعديل يسري على من
// تُنسخ قائمته لأول مرة، والقوائم القائمة لا تتغير
function TemplateModal({
  windowDays,
  onClose,
  onChanged,
}: {
  windowDays: number
  onClose: () => void
  onChanged: () => void
}) {
  const [rows, setRows] = useState<ApiOnboardingTemplateItem[]>([])
  const [drafts, setDrafts] = useState<Record<number, TplDraft>>({})
  const [loading, setLoading] = useState(true)
  const [err, setErr] = useState('')
  const [saving, setSaving] = useState<number | 'new' | 'window' | null>(null)
  const [newItem, setNewItem] = useState<TplDraft>({
    label: '',
    party: 'hr',
    dueOffsetDays: '0',
    isActive: true,
  })
  const [windowSaved, setWindowSaved] = useState(String(windowDays))
  const [windowDraft, setWindowDraft] = useState(String(windowDays))
  const [changed, setChanged] = useState(false)

  useEffect(() => {
    fetchOnboardingTemplate()
      .then((r) => {
        setRows(r)
        setDrafts(Object.fromEntries(r.map((x) => [x.id, toDraft(x)])))
      })
      .catch((e) => setErr(e instanceof Error ? e.message : 'تعذر تحميل القالب'))
      .finally(() => setLoading(false))
  }, [])

  const isDirty = (r: ApiOnboardingTemplateItem) => {
    const d = drafts[r.id]
    return (
      !!d &&
      (d.label !== r.label ||
        d.party !== r.party ||
        Number(d.dueOffsetDays) !== r.dueOffsetDays ||
        d.isActive !== r.isActive)
    )
  }

  const setDraft = (id: number, patch: Partial<TplDraft>) =>
    setDrafts((p) => ({ ...p, [id]: { ...p[id], ...patch } }))

  const saveRow = async (r: ApiOnboardingTemplateItem) => {
    const d = drafts[r.id]
    setSaving(r.id)
    setErr('')
    try {
      const saved = await updateOnboardingTemplateItem(r.id, {
        label: d.label.trim(),
        party: d.party,
        dueOffsetDays: Number(d.dueOffsetDays),
        isActive: d.isActive,
      })
      setRows((p) => p.map((x) => (x.id === saved.id ? saved : x)))
      setDrafts((p) => ({ ...p, [saved.id]: toDraft(saved) }))
      setChanged(true)
    } catch (e) {
      setErr(e instanceof Error ? e.message : 'تعذر حفظ البند')
    } finally {
      setSaving(null)
    }
  }

  const addRow = async () => {
    setSaving('new')
    setErr('')
    try {
      const saved = await createOnboardingTemplateItem({
        label: newItem.label.trim(),
        party: newItem.party,
        dueOffsetDays: Number(newItem.dueOffsetDays),
      })
      setRows((p) => [...p, saved])
      setDrafts((p) => ({ ...p, [saved.id]: toDraft(saved) }))
      setNewItem({ label: '', party: 'hr', dueOffsetDays: '0', isActive: true })
      setChanged(true)
    } catch (e) {
      setErr(e instanceof Error ? e.message : 'تعذر إضافة البند')
    } finally {
      setSaving(null)
    }
  }

  const saveWindow = async () => {
    const n = Number(windowDraft)
    if (!Number.isInteger(n) || n < 1) {
      setErr('نافذة الموظف الجديد عدد أيام صحيح لا يقل عن 1')
      return
    }
    setSaving('window')
    setErr('')
    try {
      await updateConfig('onboarding.window_days', String(n))
      setWindowSaved(String(n))
      setChanged(true)
    } catch (e) {
      setErr(e instanceof Error ? e.message : 'تعذر حفظ النافذة')
    } finally {
      setSaving(null)
    }
  }

  const close = () => {
    if (changed) onChanged()
    onClose()
  }

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
      <div className="bg-white rounded-2xl w-full max-w-4xl mx-4 max-h-[90vh] overflow-hidden flex flex-col">
        <div className="p-6 border-b border-gray-100 flex items-center justify-between">
          <div>
            <h2 className="text-xl font-bold text-gray-800">قالب مهام التهيئة</h2>
            <p className="text-sm text-gray-500 mt-1">
              يُنسخ لكل موظف جديد عند أول ظهور له — تعديله لا يغيّر القوائم القائمة
            </p>
          </div>
          <button onClick={close} className="p-2 hover:bg-gray-100 rounded-lg">
            <X size={20} />
          </button>
        </div>
        <div className="flex-1 overflow-auto p-6 space-y-5">
          {err && (
            <div className="bg-red-50 text-red-700 rounded-xl p-3 text-sm">{err}</div>
          )}

          {/* نافذة الموظف الجديد — مفتاح الإعدادات onboarding.window_days */}
          <div className="bg-gray-50 rounded-xl p-4 flex items-center gap-3 flex-wrap">
            <span className="text-sm text-gray-700">يظهر الموظف في شاشة التهيئة حتى</span>
            <input
              type="number"
              min={1}
              className="input w-24 text-sm"
              value={windowDraft}
              onChange={(e) => setWindowDraft(e.target.value)}
            />
            <span className="text-sm text-gray-700">
              يوم من تاريخ التحاقه (والمنتظر التحاقه يظهر دائماً)
            </span>
            <button
              onClick={saveWindow}
              disabled={saving === 'window' || windowDraft === windowSaved}
              className="btn-secondary text-sm mr-auto disabled:opacity-50"
            >
              حفظ
            </button>
          </div>

          {loading ? (
            <div className="flex items-center justify-center py-10">
              <div className="w-8 h-8 border-2 border-primary-500 border-t-transparent rounded-full animate-spin" />
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-3 py-2 text-right font-medium text-gray-600">المهمة</th>
                    <th className="px-3 py-2 text-right font-medium text-gray-600">
                      الجهة المسؤولة
                    </th>
                    <th className="px-3 py-2 text-right font-medium text-gray-600">
                      الموعد (يوم من الالتحاق)
                    </th>
                    <th className="px-3 py-2 text-center font-medium text-gray-600">مفعّل</th>
                    <th className="px-3 py-2" />
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {rows.map((r) => {
                    const d = drafts[r.id] ?? toDraft(r)
                    return (
                      <tr key={r.id} className={d.isActive ? '' : 'opacity-60'}>
                        <td className="px-3 py-2">
                          <input
                            className="input w-full text-sm"
                            value={d.label}
                            maxLength={200}
                            onChange={(e) => setDraft(r.id, { label: e.target.value })}
                          />
                        </td>
                        <td className="px-3 py-2">
                          <select
                            className="input text-sm"
                            value={d.party}
                            onChange={(e) =>
                              setDraft(r.id, { party: e.target.value as OnboardingParty })
                            }
                          >
                            {PARTIES.map((p) => (
                              <option key={p} value={p}>
                                {partyLabels[p]}
                              </option>
                            ))}
                          </select>
                        </td>
                        <td className="px-3 py-2">
                          <input
                            type="number"
                            min={-60}
                            max={365}
                            className="input w-24 text-sm"
                            value={d.dueOffsetDays}
                            onChange={(e) => setDraft(r.id, { dueOffsetDays: e.target.value })}
                          />
                        </td>
                        <td className="px-3 py-2 text-center">
                          <input
                            type="checkbox"
                            checked={d.isActive}
                            onChange={(e) => setDraft(r.id, { isActive: e.target.checked })}
                          />
                        </td>
                        <td className="px-3 py-2">
                          <button
                            onClick={() => saveRow(r)}
                            disabled={
                              !isDirty(r) ||
                              saving === r.id ||
                              d.label.trim().length < 2 ||
                              !validOffset(d.dueOffsetDays)
                            }
                            title="الحفظ يحتاج وصفًا من حرفين على الأقل وموعدًا بالأيام بين -60 و365"
                            className="btn-primary text-sm disabled:opacity-50"
                          >
                            حفظ
                          </button>
                        </td>
                      </tr>
                    )
                  })}
                  {/* بند جديد */}
                  <tr className="bg-primary-50/30">
                    <td className="px-3 py-2">
                      <input
                        className="input w-full text-sm"
                        placeholder="مهمة جديدة..."
                        value={newItem.label}
                        maxLength={200}
                        onChange={(e) => setNewItem({ ...newItem, label: e.target.value })}
                      />
                    </td>
                    <td className="px-3 py-2">
                      <select
                        className="input text-sm"
                        value={newItem.party}
                        onChange={(e) =>
                          setNewItem({ ...newItem, party: e.target.value as OnboardingParty })
                        }
                      >
                        {PARTIES.map((p) => (
                          <option key={p} value={p}>
                            {partyLabels[p]}
                          </option>
                        ))}
                      </select>
                    </td>
                    <td className="px-3 py-2">
                      <input
                        type="number"
                        min={-60}
                        max={365}
                        className="input w-24 text-sm"
                        value={newItem.dueOffsetDays}
                        onChange={(e) =>
                          setNewItem({ ...newItem, dueOffsetDays: e.target.value })
                        }
                      />
                    </td>
                    <td />
                    <td className="px-3 py-2">
                      <button
                        onClick={addRow}
                        disabled={
                          saving === 'new' ||
                          newItem.label.trim().length < 2 ||
                          !validOffset(newItem.dueOffsetDays)
                        }
                        title="الإضافة تحتاج وصفًا من حرفين على الأقل وموعدًا بالأيام بين -60 و365"
                        className="btn-primary text-sm flex items-center gap-1 disabled:opacity-50"
                      >
                        <Plus size={14} />
                        إضافة
                      </button>
                    </td>
                  </tr>
                </tbody>
              </table>
            </div>
          )}
          <p className="text-xs text-gray-400">
            الموعد بالأيام من تاريخ الالتحاق: 0 = يوم المباشرة، 7 = بعد أسبوع، وبالسالب قبل
            المباشرة. البند المعطّل لا يُنسخ للموظفين الجدد.
          </p>
        </div>
        <div className="p-6 border-t border-gray-100 flex justify-end">
          <button onClick={close} className="btn-primary">
            إغلاق
          </button>
        </div>
      </div>
    </div>
  )
}
