'use client'

// B2.5: «مهامي» — كل اللي على الحساب في مكان واحد: المهام العامة، ومهام التهيئة اللي على جهته، وبنود إخلاء الطرف اللي عليه.
// التهيئة والإخلاء بيتقفلوا من شاشاتهم (اللينك جنب كل بند). وتبويب «فريقي» للمدير المباشر: مهام مرؤوسيه، واللي كلّف بيه حد تحته في
// الهيكل (أو في نطاقه بصلاحية «تكليف أي موظف»)، وتقرير الالتزام عليهم (قواعد المالك 6 أكتوبر).
import { useCallback, useEffect, useRef, useState } from 'react'
import Link from 'next/link'
import { ClipboardCheck, ListChecks, Plus, UserMinus, UserPlus, Users } from 'lucide-react'
import { MainLayout } from '@/components/layout'
import TaskCard from '@/components/tasks/TaskCard'
import TaskComplianceReport from '@/components/tasks/TaskComplianceReport'
import TaskFormModal from '@/components/tasks/TaskFormModal'
import { localToday } from '@/lib/dates'
import { fetchMyTasks, fetchTask, fetchTaskAssignees, fetchTeamTasks, notifyTasksChanged, type ApiMyTasks, type ApiTask, type ApiTaskAssignees } from '@/lib/tasks-api'

// جهات التهيئة والإخلاء (نفس تسميات شاشتيهم)
const PARTY_LABELS: Record<string, string> = { hr: 'الموارد البشرية', it: 'تقنية المعلومات', custody: 'العهد', finance: 'المالية', manager: 'المدير المباشر' }

type Tab = 'mine' | 'team'

export default function MyTasksPage() {
  const [tab, setTab] = useState<Tab>('mine')
  const [mine, setMine] = useState<ApiMyTasks | null>(null)
  const [team, setTeam] = useState<{ manager: boolean; tasks: ApiTask[] } | null>(null)
  const [assignees, setAssignees] = useState<ApiTaskAssignees | null>(null)
  // مهمة مفتوحة من لينك (بريد الإشعار) ومش في القايمتين: مثلًا مهمة أنشأتها لحد
  const [linked, setLinked] = useState<ApiTask | null>(null)
  const [linkedId, setLinkedId] = useState<number | null>(null)
  const [form, setForm] = useState<{ task: ApiTask | null } | null>(null)
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(true)
  // رقم المهمة اللي في اللينك لحد أول تحميل (لاختيار التبويب مرة واحدة)
  const linkedTab = useRef<number | null>(null)

  const load = useCallback(async () => {
    setError('')
    try {
      const [inbox, mineTeam, options] = await Promise.all([fetchMyTasks(), fetchTeamTasks(), fetchTaskAssignees()])
      setMine(inbox); setTeam(mineTeam); setAssignees(options)
      // لينك البريد لمهمة على حد من فريقي (تبليغ التأخير): الصفحة بتفتح على تبويب «فريقي» مرة واحدة، مش على «عليّ» والمهمة مش فيه
      const wanted = linkedTab.current
      if (wanted && !inbox.tasks.some(row => row.id === wanted) && mineTeam.tasks.some(row => row.id === wanted)) setTab('team')
      linkedTab.current = null
    } catch (err) {
      setError(err instanceof Error ? err.message : 'تعذر تحميل المهام')
    } finally { setLoading(false) }
  }, [])

  useEffect(() => {
    const id = Number(new URLSearchParams(window.location.search).get('task'))
    if (Number.isSafeInteger(id) && id > 0) {
      linkedTab.current = id
      setLinkedId(id)
      fetchTask(id).then(setLinked).catch(() => setError('المهمة اللي في اللينك مش موجودة أو مابقتش متاحة لك'))
    }
    void load()
  }, [load])

  // بعد أي تغيير: القايمتين والعدّاد من الخادم (المهمة ممكن تتنقل من تبويب لتاني)
  const changed = (task: ApiTask) => {
    if (linked?.id === task.id) setLinked(task)
    notifyTasksChanged()
    void load()
  }

  const today = localToday()
  const inLists = (id: number) => !!mine?.tasks.some(row => row.id === id) || !!team?.tasks.some(row => row.id === id)

  return (
    <MainLayout>
      <div className="space-y-4" data-my-tasks>
        <div className="flex flex-wrap items-center justify-between gap-3">
          <h1 className="text-xl font-bold text-gray-800 flex items-center gap-2"><ListChecks size={22} className="text-primary-600" />مهامي</h1>
          {assignees?.canAssign && assignees.available && (
            <button type="button" className="btn-primary" onClick={() => setForm({ task: null })} data-new-task><Plus size={16} className="inline me-1" />مهمة جديدة</button>
          )}
        </div>
        {error && <div role="alert" className="bg-red-50 text-red-700 rounded-xl p-3 text-sm">{error}</div>}
        {mine && !mine.available && (
          <div className="bg-amber-50 text-amber-900 rounded-xl p-3 text-sm" data-tasks-unavailable>
            المهام العامة هتشتغل بعد تطبيق ترحيل 088 على السيرفر. مهام التهيئة وبنود إخلاء الطرف ظاهرين زي ما هم.
          </div>
        )}

        {team?.manager && (
          <div className="flex gap-2" role="tablist">
            <button type="button" role="tab" aria-selected={tab === 'mine'} className={tab === 'mine' ? 'btn-primary' : 'btn-secondary'} onClick={() => setTab('mine')}>
              عليّ{mine ? ` (${mine.counts.open})` : ''}
            </button>
            <button type="button" role="tab" aria-selected={tab === 'team'} className={tab === 'team' ? 'btn-primary' : 'btn-secondary'} onClick={() => setTab('team')}>
              <Users size={16} className="inline me-1" />فريقي ({team.tasks.filter(row => ['OPEN', 'IN_PROGRESS', 'WAITING'].includes(row.status)).length})
            </button>
          </div>
        )}

        {linked && linkedId && !inLists(linked.id) && (
          <div className="card space-y-2" data-linked-task>
            <h2 className="font-semibold text-gray-800">المهمة اللي فتحتها</h2>
            <TaskCard task={linked} onChanged={changed} onEdit={task => setForm({ task })} highlighted />
          </div>
        )}

        {loading ? <p className="text-sm text-gray-500">جاري التحميل…</p> : tab === 'team' && team ? (
          <>
            <div className="card space-y-3" data-team-tasks>
              <p className="text-sm text-gray-500">مهام مرؤوسيك المباشرين واللي كلّفت بيه حد تاني: المفتوحة، واللي اتقفلت في آخر أسبوعين.</p>
              {team.tasks.length === 0 ? <p className="text-sm text-gray-500">مفيش مهام على فريقك.</p>
                : team.tasks.map(task => <TaskCard key={task.id} task={task} onChanged={changed} onEdit={row => setForm({ task: row })} highlighted={task.id === linkedId} />)}
            </div>
            <TaskComplianceReport />
          </>
        ) : mine && (
          <>
            <div className="card space-y-3" data-general-tasks>
              <h2 className="font-semibold text-gray-800 flex items-center gap-2"><ClipboardCheck size={18} className="text-primary-600" />مهام عليّ</h2>
              {mine.tasks.length === 0 ? <p className="text-sm text-gray-500">مفيش مهام مفتوحة عليك.</p>
                : mine.tasks.map(task => <TaskCard key={task.id} task={task} onChanged={changed} onEdit={row => setForm({ task: row })} highlighted={task.id === linkedId} />)}
            </div>

            {mine.onboarding.length > 0 && (
              <div className="card space-y-2" data-onboarding-tasks>
                <h2 className="font-semibold text-gray-800 flex items-center gap-2"><UserPlus size={18} className="text-primary-600" />تهيئة موظفين جدد</h2>
                <p className="text-sm text-gray-500">المهام اللي على جهتك. بتتقفل من شاشة «تهيئة الموظفين الجدد».</p>
                <ul className="divide-y divide-gray-100">
                  {mine.onboarding.map(task => (
                    <li key={task.taskId} className="py-2 flex flex-wrap items-center justify-between gap-2 text-sm">
                      <span className="min-w-0">
                        <span className="font-medium text-gray-800">{task.label}</span>
                        <span className="block text-xs text-gray-500">{task.employeeName} · {PARTY_LABELS[task.party] ?? task.party}</span>
                      </span>
                      <span className="flex items-center gap-3 shrink-0">
                        <span dir="ltr" className={`text-xs ${task.dueDate < today ? 'text-red-700 font-medium' : 'text-gray-600'}`}>{task.dueDate}</span>
                        <Link href="/employees/onboarding" className="text-primary-600 underline">افتح التهيئة</Link>
                      </span>
                    </li>
                  ))}
                </ul>
              </div>
            )}

            {mine.clearance.length > 0 && (
              <div className="card space-y-2" data-clearance-items>
                <h2 className="font-semibold text-gray-800 flex items-center gap-2"><UserMinus size={18} className="text-primary-600" />إخلاء طرف</h2>
                <p className="text-sm text-gray-500">البنود اللي عليك في ملفات إنهاء الخدمة. بتتقفل من ملف الإنهاء.</p>
                <ul className="divide-y divide-gray-100">
                  {mine.clearance.map(item => (
                    <li key={item.itemId} className="py-2 flex flex-wrap items-center justify-between gap-2 text-sm">
                      <span className="min-w-0">
                        <span className="font-medium text-gray-800">{item.label}</span>
                        <span className="block text-xs text-gray-500">{item.employeeName} · {PARTY_LABELS[item.party] ?? item.party}</span>
                      </span>
                      <span className="flex items-center gap-3 shrink-0">
                        <span className="text-xs text-gray-600">آخر يوم عمل <span dir="ltr">{item.lastWorkingDay}</span></span>
                        <Link href={`/offboarding/${item.caseId}`} className="text-primary-600 underline">افتح الملف</Link>
                      </span>
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </>
        )}
      </div>
      {form && assignees && (
        <TaskFormModal assignees={assignees} task={form.task} onClose={() => setForm(null)}
          onSaved={task => { setForm(null); changed(task) }} />
      )}
    </MainLayout>
  )
}
