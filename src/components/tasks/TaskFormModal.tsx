'use client'
// B2.5: نموذج تكليف مهمة (جديدة أو تعديل). المسؤول موظف من اللي الحساب يقدر يكلّفهم (نفسه: مهمة شخصية؛ واللي تحته في الهيكل؛ وموظفي
// نطاقه بصلاحية «إدارة المهام» أو «تكليف أي موظف»)، أو دور وظيفي في فرع (لصاحب «إدارة المهام» بس). الخادم هو اللي بيحكم؛ القايمة هنا
// من نفس حكمه (GET /tasks/assignees). حد برّه القايمة مايتكلّفش مباشرة: طلب، ولما يتعتمد بيتحوّل مهمة (قواعد المالك 6 أكتوبر).
import { useState } from 'react'
import { EmployeePicker } from '../EmployeePicker'
import { localToday } from '../../lib/dates'
import { createTask, updateTask, TASK_PRIORITY_LABELS, type ApiTask, type ApiTaskAssignees, type TaskInput, type TaskPriority } from '../../lib/tasks-api'

interface Props {
  assignees: ApiTaskAssignees
  /** مهمة موجودة = تعديل */
  task?: ApiTask | null
  onClose: () => void
  onSaved: (task: ApiTask) => void
}

export default function TaskFormModal({ assignees, task, onClose, onSaved }: Props) {
  const [title, setTitle] = useState(task?.title ?? '')
  const [description, setDescription] = useState(task?.description ?? '')
  const [target, setTarget] = useState<'employee' | 'role'>(task?.assigneeRole ? 'role' : 'employee')
  const [employeeId, setEmployeeId] = useState(task?.assigneeEmployeeId ? String(task.assigneeEmployeeId) : '')
  const [role, setRole] = useState(task?.assigneeRole ?? '')
  const [branchId, setBranchId] = useState(task?.assigneeRole ? String(task.branchId) : assignees.branches.length === 1 ? String(assignees.branches[0].id) : '')
  const [dueDate, setDueDate] = useState(task?.dueDate ?? '')
  const [priority, setPriority] = useState<TaskPriority>(task?.priority ?? 'NORMAL')
  const [requiresProof, setRequiresProof] = useState(task?.requiresProof ?? false)
  const [needsRating, setNeedsRating] = useState(task?.needsRating ?? false)
  // نفسي = مهمة شخصية (بيشوفها صاحبها ومديره المباشر بس، ومن غير تقييم)
  const self = target === 'employee' && !!assignees.employees.find(row => String(row.id) === employeeId)?.self
  const canFlagRating = !!assignees.ratingEnabled && target === 'employee' && !self
  const options = assignees.employees.map(row => row.self ? { ...row, fullName: `${row.fullName} — نفسي (مهمة شخصية)` } : row)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')

  const save = async () => {
    setError('')
    if (title.trim().length < 2) { setError('اكتب عنوان المهمة'); return }
    if (target === 'employee' && !employeeId) { setError('اختار الموظف المسؤول عن المهمة'); return }
    if (target === 'role' && (!role || !branchId)) { setError('اختار الدور والفرع'); return }
    const input: TaskInput = { title: title.trim(), description: description.trim() || null, dueDate: dueDate || null, priority, requiresProof,
      ...(assignees.ratingEnabled ? { needsRating: canFlagRating && needsRating } : {}) }
    // في التعديل المسؤول بيتبعت لما يتغيّر بس: تحويل المهمة تكليف جديد بشروطه
    const sameEmployee = target === 'employee' && task?.assigneeEmployeeId === Number(employeeId)
    const sameRole = target === 'role' && task?.assigneeRole === role && task?.branchId === Number(branchId)
    if (!task || !(sameEmployee || sameRole)) {
      if (target === 'employee') input.assigneeEmployeeId = Number(employeeId)
      else { input.assigneeRole = role; input.branchId = Number(branchId) }
    }
    setBusy(true)
    try {
      onSaved(task ? await updateTask(task.id, input) : await createTask({ ...input, description: input.description ?? undefined }))
    } catch (err) {
      setError(err instanceof Error ? err.message : 'تعذر حفظ المهمة')
    } finally { setBusy(false) }
  }

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4" onClick={() => !busy && onClose()}>
      <div className="bg-white rounded-2xl w-full max-w-lg p-6 shadow-xl max-h-[90vh] overflow-y-auto" role="dialog" aria-modal="true" aria-labelledby="task-form-title"
        onClick={event => event.stopPropagation()} data-task-form>
        <h2 id="task-form-title" className="text-lg font-semibold text-gray-800 mb-4">{task ? 'تعديل المهمة' : 'مهمة جديدة'}</h2>
        {error && <div role="alert" className="bg-red-50 text-red-700 rounded-xl p-3 text-sm mb-3">{error}</div>}
        <div className="space-y-3">
          <div>
            <label className="label" htmlFor="task-title">العنوان *</label>
            <input id="task-title" className="input" maxLength={200} value={title} onChange={event => setTitle(event.target.value)} />
          </div>
          <div>
            <label className="label" htmlFor="task-description">التفاصيل</label>
            <textarea id="task-description" className="input" rows={3} maxLength={2000} value={description} onChange={event => setDescription(event.target.value)} />
          </div>
          {assignees.canManage && (
            <div className="flex gap-4 text-sm" role="radiogroup" aria-label="المسؤول عن المهمة">
              <label className="flex items-center gap-2"><input type="radio" name="task-target" checked={target === 'employee'} onChange={() => setTarget('employee')} />موظف</label>
              <label className="flex items-center gap-2"><input type="radio" name="task-target" checked={target === 'role'} onChange={() => setTarget('role')} />دور (كل حاملي الدور في الفرع)</label>
            </div>
          )}
          {target === 'employee' ? (
            <div>
              <label className="label" htmlFor="task-assignee">الموظف المسؤول *</label>
              <EmployeePicker id="task-assignee" employees={options} value={employeeId} onChange={id => setEmployeeId(id)} placeholder="اكتب الاسم أو الكود"
                missingLabel={() => task?.assigneeName ?? 'الموظف الحالي'} />
              {self && <p className="text-xs text-gray-500 mt-1" data-task-personal-hint>مهمة شخصية: بتظهر لك ولمديرك المباشر بس.</p>}
              {!assignees.canManage && (
                <p className="text-xs text-gray-500 mt-1" data-task-outside-hint>
                  تقدر تكلّف نفسك وأي حد تحتك في الهيكل. حد مش في فريقك؟ <a href="/requests" className="text-primary-600 underline">اعمل طلب</a>، ولما يتعتمد هيتحوّل مهمة.
                </p>
              )}
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="label" htmlFor="task-role">الدور *</label>
                <select id="task-role" className="input" value={role} onChange={event => setRole(event.target.value)}>
                  <option value="">اختار</option>
                  {assignees.roles.map(item => <option key={item.key} value={item.key}>{item.label}</option>)}
                </select>
              </div>
              <div>
                <label className="label" htmlFor="task-branch">الفرع *</label>
                <select id="task-branch" className="input" value={branchId} onChange={event => setBranchId(event.target.value)}>
                  <option value="">اختار</option>
                  {assignees.branches.map(item => <option key={item.id} value={item.id}>{item.name}</option>)}
                </select>
              </div>
            </div>
          )}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="label" htmlFor="task-due">الموعد</label>
              <input id="task-due" type="date" className="input" min={task?.dueDate && task.dueDate < localToday() ? undefined : localToday()} value={dueDate} onChange={event => setDueDate(event.target.value)} />
            </div>
            <div>
              <label className="label" htmlFor="task-priority">الأولوية</label>
              <select id="task-priority" className="input" value={priority} onChange={event => setPriority(event.target.value as TaskPriority)}>
                {(Object.keys(TASK_PRIORITY_LABELS) as TaskPriority[]).map(key => <option key={key} value={key}>{TASK_PRIORITY_LABELS[key]}</option>)}
              </select>
            </div>
          </div>
          <label className="flex items-center gap-2 text-sm text-gray-700">
            <input type="checkbox" checked={requiresProof} onChange={event => setRequiresProof(event.target.checked)} />
            لازم إثبات عند الإقفال (نص أو ملف)
          </label>
          {canFlagRating && (
            <label className="flex items-center gap-2 text-sm text-gray-700" data-task-needs-rating>
              <input type="checkbox" checked={needsRating} onChange={event => setNeedsRating(event.target.checked)} />
              تحتاج تقييم (هتقيّم التنفيذ من 1 لـ5 بعد ما تخلص)
            </label>
          )}
        </div>
        <div className="flex justify-end gap-2 mt-5">
          <button type="button" className="btn-secondary" disabled={busy} onClick={onClose}>إلغاء</button>
          <button type="button" className="btn-primary" disabled={busy} onClick={save}>{busy ? 'جاري الحفظ…' : task ? 'حفظ' : 'تكليف'}</button>
        </div>
      </div>
    </div>
  )
}
