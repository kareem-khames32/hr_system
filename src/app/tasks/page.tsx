'use client'

// B2.5: قايمة كل المهام العامة في نطاق فروع الحساب (صلاحية «عرض كل المهام»): فلتر بالحالة والمتأخر والمسؤول، وتصدير المتأخر.
// التكليف والتعديل والإلغاء لصاحب «إدارة المهام» (الأزرار من الخادم: canManage).
import { useCallback, useEffect, useMemo, useState } from 'react'
import { Download, ListChecks, Plus } from 'lucide-react'
import { MainLayout } from '@/components/layout'
import { EmployeePicker } from '@/components/EmployeePicker'
import TaskCard from '@/components/tasks/TaskCard'
import TaskComplianceReport from '@/components/tasks/TaskComplianceReport'
import TaskFormModal from '@/components/tasks/TaskFormModal'
import { csvDateStamp, downloadCsv } from '@/lib/csv'
import {
  fetchTaskAssignees, fetchTasks, notifyTasksChanged, TASK_PRIORITY_LABELS, TASK_STATUS_LABELS, type ApiTask, type ApiTaskAssignees, type TaskListFilter,
} from '@/lib/tasks-api'

type AssigneeOption = ApiTaskAssignees['employees'][number]

const STATUS_FILTERS: Array<{ key: NonNullable<TaskListFilter['status']>; label: string }> = [
  { key: 'open', label: 'المفتوحة' },
  { key: 'done', label: 'اللي خلصت' },
  { key: 'cancelled', label: 'الملغية' },
  { key: 'all', label: 'الكل' },
]

export default function TasksPage() {
  const [status, setStatus] = useState<NonNullable<TaskListFilter['status']>>('open')
  const [overdue, setOverdue] = useState(false)
  const [assignee, setAssignee] = useState('')
  const [tasks, setTasks] = useState<ApiTask[]>([])
  const [available, setAvailable] = useState(true)
  const [assignees, setAssignees] = useState<ApiTaskAssignees | null>(null)
  const [seen, setSeen] = useState<Record<number, AssigneeOption>>({})
  const [form, setForm] = useState<{ task: ApiTask | null } | null>(null)
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(true)

  const load = useCallback(async () => {
    setError('')
    try {
      const result = await fetchTasks({ status: overdue ? 'open' : status, overdue, assigneeEmployeeId: assignee ? Number(assignee) : undefined })
      setTasks(result.tasks); setAvailable(result.available)
      setSeen(previous => {
        const next = { ...previous }
        for (const task of result.tasks) {
          if (task.assigneeEmployeeId && task.assigneeName) next[task.assigneeEmployeeId] = { id: task.assigneeEmployeeId, fullName: task.assigneeName, employeeCode: task.assigneeCode ?? '', jobTitle: null, branchName: null }
        }
        return next
      })
    } catch (err) {
      setError(err instanceof Error ? err.message : 'تعذر تحميل المهام')
    } finally { setLoading(false) }
  }, [status, overdue, assignee])

  useEffect(() => { void load() }, [load])
  useEffect(() => { fetchTaskAssignees().then(setAssignees).catch(() => setAssignees(null)) }, [])

  const overdueCount = useMemo(() => tasks.filter(task => task.overdue).length, [tasks])
  // فلتر «المسؤول»: اللي الحساب يقدر يكلّفهم + مسؤولي المهام اللي اتحمّلت — صاحب «عرض كل المهام» من غير «إدارة المهام» قايمة التكليف عنده فاضية
  const filterEmployees = useMemo(() => {
    const byId = new Map<number, AssigneeOption>(Object.values(seen).map(row => [row.id, row]))
    for (const row of assignees?.employees ?? []) byId.set(row.id, row)
    return [...byId.values()].sort((a, b) => a.fullName.localeCompare(b.fullName, 'ar'))
  }, [seen, assignees])
  const exportRows = () => downloadCsv(`tasks-${overdue ? 'overdue-' : ''}${csvDateStamp()}.csv`,
    ['المهمة', 'المسؤول', 'الفرع', 'الموعد', 'الحالة', 'الأولوية', 'كلّف بيها', 'متأخرة'],
    tasks.map(task => [task.title, task.assigneeRoleLabel ? `دور: ${task.assigneeRoleLabel}` : task.assigneeName ?? '', task.branchName ?? '', task.dueDate ?? '',
      TASK_STATUS_LABELS[task.status], TASK_PRIORITY_LABELS[task.priority], task.createdByName ?? '', task.overdue ? 'آه' : '']))

  return (
    <MainLayout>
      <div className="space-y-4" data-tasks-admin>
        <div className="flex flex-wrap items-center justify-between gap-3">
          <h1 className="text-xl font-bold text-gray-800 flex items-center gap-2"><ListChecks size={22} className="text-primary-600" />المهام</h1>
          <div className="flex flex-wrap gap-2">
            <button type="button" className="btn-secondary" disabled={!tasks.length} onClick={exportRows} data-export-tasks><Download size={16} className="inline me-1" />تصدير</button>
            {assignees?.canManage && available && (
              <button type="button" className="btn-primary" onClick={() => setForm({ task: null })}><Plus size={16} className="inline me-1" />مهمة جديدة</button>
            )}
          </div>
        </div>
        {error && <div role="alert" className="bg-red-50 text-red-700 rounded-xl p-3 text-sm">{error}</div>}
        {!available && (
          <div className="bg-amber-50 text-amber-900 rounded-xl p-3 text-sm" data-tasks-unavailable>المهام العامة هتشتغل بعد تطبيق ترحيل 088 على السيرفر.</div>
        )}

        <div className="card flex flex-wrap items-end gap-3" data-task-filters>
          <div className="flex flex-wrap gap-2" role="group" aria-label="حالة المهمة">
            {STATUS_FILTERS.map(item => (
              <button key={item.key} type="button" disabled={overdue} className={!overdue && status === item.key ? 'btn-primary' : 'btn-secondary'} onClick={() => setStatus(item.key)}>{item.label}</button>
            ))}
          </div>
          <label className="flex items-center gap-2 text-sm text-gray-700">
            <input type="checkbox" checked={overdue} onChange={event => setOverdue(event.target.checked)} />
            المتأخرة بس
          </label>
          <div className="min-w-[14rem] flex-1">
            <label className="label" htmlFor="tasks-assignee">المسؤول</label>
            <EmployeePicker id="tasks-assignee" employees={filterEmployees} value={assignee} onChange={id => setAssignee(id)} placeholder="كل الموظفين" />
          </div>
        </div>

        <div className="card space-y-3" data-task-list>
          <p className="text-sm text-gray-500">{tasks.length} مهمة{overdueCount ? ` · ${overdueCount} متأخرة` : ''}{tasks.length >= 500 ? ' (أول 500)' : ''}</p>
          {loading ? <p className="text-sm text-gray-500">جاري التحميل…</p>
            : tasks.length === 0 ? <p className="text-sm text-gray-500">مفيش مهام بالفلتر ده.</p>
              : tasks.map(task => <TaskCard key={task.id} task={task} onChanged={() => { notifyTasksChanged(); void load() }} onEdit={row => setForm({ task: row })} />)}
        </div>
        {available && <TaskComplianceReport />}
      </div>
      {form && assignees && (
        <TaskFormModal assignees={assignees} task={form.task} onClose={() => setForm(null)} onSaved={() => { setForm(null); notifyTasksChanged(); void load() }} />
      )}
    </MainLayout>
  )
}
