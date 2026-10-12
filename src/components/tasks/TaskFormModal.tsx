'use client'
// B2.5: نموذج تكليف مهمة (جديدة أو تعديل). المسؤول موظف من اللي الحساب يقدر يكلّفهم (نفسه: مهمة شخصية؛ واللي تحته في الهيكل؛ وموظفي
// نطاقه بصلاحية «إدارة المهام» أو «تكليف أي موظف»)، أو دور وظيفي في فرع (لصاحب «إدارة المهام» بس). الخادم هو اللي بيحكم؛ القايمة هنا
// من نفس حكمه (GET /tasks/assignees). حد برّه القايمة مايتكلّفش مباشرة: طلب، ولما يتعتمد بيتحوّل مهمة (قواعد المالك 6 أكتوبر).
// B-ADD.1: «مجموعة» = مهمة جماعية بالاستهداف الموحد (الشركة ← فرع ← إدارة ← قسم ← فريق ← موظفين + «الكل ماعدا…» ومعاينة) — كل موظف
// في الجمهور بياخد مهمته هو. للمهمة الجديدة بس، ولصاحب «إدارة المهام» أو «تكليف أي موظف».
// B-ADD.18 (كلمة المالك 12 أكتوبر: «أسند مهمة بس لفريقي… لا أكتر ولا أقل»): التكليف لغيري للي تحته حد في الهيكل بس — اللي مالوش حد تحته
// النموذج عنده «مهمة شخصية» من غير اختيار مسؤول؛ والمدير «مجموعة» عنده منتقي «على مين؟» محدود باللي تحته (شجرته من الخادم).
// B-ADD.19 (كلمة المالك 12 أكتوبر): مرفقات مع المهمة الجديدة (شيت إكسل أو أي ملف من المسموح في إعدادات الملفات) — بتترفع وقت الحفظ وبتتربط
// بالمهمة في نفس إنشائها؛ ومع «مجموعة» نفس الملفات لكل اللي هياخدوا المهمة. بعد كده الإرفاق والشيل من كارت المهمة.
import { useRef, useState } from 'react'
import { Paperclip } from 'lucide-react'
import { uploadFile } from '../../lib/api'
import { EmployeePicker } from '../EmployeePicker'
import { OrgAudienceField } from '../OrgAudienceField'
import type { StoredAudience } from '../../lib/org-audience'
import { localToday } from '../../lib/dates'
import {
  createGroupTask, createTask, updateTask, TASK_ATTACHMENT_FILE_TYPE, TASK_ATTACHMENTS_MAX, TASK_GROUP_TREE_SOURCE, TASK_PRIORITY_LABELS,
  type ApiTask, type ApiTaskAssignees, type TaskInput, type TaskPriority,
} from '../../lib/tasks-api'

interface Props {
  assignees: ApiTaskAssignees
  /** مهمة موجودة = تعديل */
  task?: ApiTask | null
  onClose: () => void
  onSaved: (task: ApiTask) => void
  /** B-ADD.1: بعد مهمة جماعية (الشاشة بتحدّث قايمتها) */
  onGroupSaved?: () => void
}

export default function TaskFormModal({ assignees, task, onClose, onSaved, onGroupSaved }: Props) {
  const [title, setTitle] = useState(task?.title ?? '')
  const [description, setDescription] = useState(task?.description ?? '')
  const [target, setTarget] = useState<'employee' | 'role' | 'group'>(task?.assigneeRole ? 'role' : 'employee')
  const canGroup = !task && !!assignees.canAssignGroup
  // B-ADD.18: مالوش حد يكلّفه غير نفسه — المهمة الجديدة شخصية من غير منتقي (canAssignOthers غايبة = خادم قديم: السلوك القديم)
  const selfOnly = !task && assignees.canAssignOthers === false
  const me = assignees.employees.find(row => row.self)
  const inTree = assignees.groupWithin === 'tree'
  const [audience, setAudience] = useState<StoredAudience | null>(null)
  const [audienceComplete, setAudienceComplete] = useState(true)
  const [groupDone, setGroupDone] = useState<{ created: number; skipped: Array<{ employeeId: number; fullName: string; reason: string }> } | null>(null)
  const [employeeId, setEmployeeId] = useState(task?.assigneeEmployeeId ? String(task.assigneeEmployeeId) : selfOnly && me ? String(me.id) : '')
  const [role, setRole] = useState(task?.assigneeRole ?? '')
  const [branchId, setBranchId] = useState(task?.assigneeRole ? String(task.branchId) : assignees.branches.length === 1 ? String(assignees.branches[0].id) : '')
  const [dueDate, setDueDate] = useState(task?.dueDate ?? '')
  const [priority, setPriority] = useState<TaskPriority>(task?.priority ?? 'NORMAL')
  const [requiresProof, setRequiresProof] = useState(task?.requiresProof ?? false)
  const [needsRating, setNeedsRating] = useState(task?.needsRating ?? false)
  // نفسي = مهمة شخصية (بيشوفها صاحبها ومديره المباشر بس، ومن غير تقييم)
  const self = target === 'employee' && !!assignees.employees.find(row => String(row.id) === employeeId)?.self
  const canFlagRating = !!assignees.ratingEnabled && (target === 'group' || (target === 'employee' && !self))
  const options = assignees.employees.map(row => row.self ? { ...row, fullName: `${row.fullName} — نفسي (مهمة شخصية)` } : row)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')
  // B-ADD.19: مرفقات المهمة الجديدة. اللي اترفع فعلًا مابيترفعش تاني لو الحفظ اترفض ومحاولة تانية بنفس الملف
  const canAttach = !task && !!assignees.attachmentsAvailable
  const [files, setFiles] = useState<File[]>([])
  const uploaded = useRef(new Map<File, number>())
  const fileInput = useRef<HTMLInputElement>(null)
  const pickFiles = (list: FileList | null) => {
    setFiles(previous => [...previous, ...Array.from(list ?? [])].slice(0, TASK_ATTACHMENTS_MAX))
    if (fileInput.current) fileInput.current.value = ''
  }
  const uploadAttachments = async (): Promise<number[]> => {
    const ids: number[] = []
    for (const file of files) {
      const id = uploaded.current.get(file) ?? (await uploadFile(file, { entityType: TASK_ATTACHMENT_FILE_TYPE })).id
      uploaded.current.set(file, id)
      ids.push(id)
    }
    return ids
  }

  const save = async () => {
    setError('')
    if (title.trim().length < 2) { setError('اكتب عنوان المهمة'); return }
    if (target === 'employee' && !employeeId) { setError('اختار الموظف المسؤول عن المهمة'); return }
    if (target === 'role' && (!role || !branchId)) { setError('اختار الدور والفرع'); return }
    if (target === 'group') {
      if (!audienceComplete) { setError('كمّل اختيار «على مين؟» الأول'); return }
      setBusy(true)
      try {
        const attachmentFileIds = await uploadAttachments()
        const result = await createGroupTask({ title: title.trim(), description: description.trim() || undefined, dueDate: dueDate || undefined, priority, requiresProof,
          ...(assignees.ratingEnabled && needsRating ? { needsRating: true } : {}), audience, ...(attachmentFileIds.length ? { attachmentFileIds } : {}) })
        setGroupDone({ created: result.created, skipped: result.skipped })
      } catch (err) {
        setError(err instanceof Error ? err.message : 'تعذر حفظ المهمة الجماعية')
      } finally { setBusy(false) }
      return
    }
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
      const attachmentFileIds = task ? [] : await uploadAttachments()
      onSaved(task ? await updateTask(task.id, input) : await createTask({ ...input, description: input.description ?? undefined, ...(attachmentFileIds.length ? { attachmentFileIds } : {}) }))
    } catch (err) {
      setError(err instanceof Error ? err.message : 'تعذر حفظ المهمة')
    } finally { setBusy(false) }
  }

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4" onClick={() => !busy && onClose()}>
      <div className="bg-white rounded-2xl w-full max-w-lg p-6 shadow-xl max-h-[90vh] overflow-y-auto" role="dialog" aria-modal="true" aria-labelledby="task-form-title"
        onClick={event => event.stopPropagation()} data-task-form>
        <h2 id="task-form-title" className="text-lg font-semibold text-gray-800 mb-4">{task ? 'تعديل المهمة' : selfOnly ? 'مهمة شخصية' : 'مهمة جديدة'}</h2>
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
          {(assignees.canManage || canGroup) && (
            <div className="flex gap-4 flex-wrap text-sm" role="radiogroup" aria-label="المسؤول عن المهمة">
              <label className="flex items-center gap-2"><input type="radio" name="task-target" checked={target === 'employee'} onChange={() => setTarget('employee')} />موظف</label>
              {assignees.canManage && <label className="flex items-center gap-2"><input type="radio" name="task-target" checked={target === 'role'} onChange={() => setTarget('role')} />دور (كل حاملي الدور في الفرع)</label>}
              {canGroup && <label className="flex items-center gap-2"><input type="radio" name="task-target" checked={target === 'group'} onChange={() => setTarget('group')} />مجموعة (كل واحد بياخد مهمته)</label>}
            </div>
          )}
          {target === 'group' ? (
            <div data-task-group-audience>
              <OrgAudienceField value={audience} disabled={busy} onChange={(next, complete) => { setAudience(next); setAudienceComplete(complete) }}
                source={inTree ? TASK_GROUP_TREE_SOURCE : undefined} />
              <p className="text-xs text-gray-500 mt-1">كل موظف في الاختيار بياخد المهمة دي باسمه ويتابعها لوحده. إنت نفسك مش من المكلَّفين.</p>
              {inTree && <p className="text-xs text-gray-500 mt-1" data-task-group-tree-hint>الاختيار من اللي تحتك في الهيكل بس: «الفرع كله» هنا معناها كل اللي تحتك في الفرع ده.</p>}
            </div>
          ) : selfOnly ? (
            <p className="text-sm text-gray-600 bg-gray-50 rounded-xl p-3" data-task-self-only>
              مهمة شخصية ليك إنت: بتظهر لك ولمديرك المباشر بس. تكليف حد تاني للي تحته موظفين في الهيكل — محتاج حاجة من زميل؟ <a href="/requests" className="text-primary-600 underline">اعمل طلب</a>، ولما يتعتمد هيتحوّل مهمة.
            </p>
          ) : target === 'employee' ? (
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
          {canAttach && (
            <div data-task-form-attachments>
              <span className="label">مرفقات (اختياري)</span>
              <div className="flex flex-wrap items-center gap-2 text-xs">
                <input ref={fileInput} type="file" multiple className="hidden" onChange={event => pickFiles(event.target.files)} />
                <button type="button" className="btn-secondary text-xs" disabled={busy || files.length >= TASK_ATTACHMENTS_MAX} onClick={() => fileInput.current?.click()}>
                  <Paperclip size={14} className="inline me-1" />أرفق ملف ({files.length} / {TASK_ATTACHMENTS_MAX})
                </button>
                {files.map((file, index) => (
                  <span key={`${file.name}-${index}`} className="badge bg-gray-100 text-gray-700 flex items-center gap-1">
                    <span className="break-all">{file.name}</span>
                    <button type="button" className="text-gray-500 underline" disabled={busy} onClick={() => setFiles(previous => previous.filter((_, at) => at !== index))} aria-label={`شيل ${file.name}`}>شيل</button>
                  </span>
                ))}
              </div>
              <p className="text-xs text-gray-500 mt-1">
                شيت إكسل أو أي ملف من الأنواع والحجم المسموحين في إعدادات الملفات. {target === 'group' ? 'الملف بيظهر لكل اللي هياخدوا المهمة.' : 'المسؤول عن المهمة بيشوفه، ويقدر يرفع شغله على نفس المهمة.'}
              </p>
            </div>
          )}
          {canFlagRating && (
            <label className="flex items-center gap-2 text-sm text-gray-700" data-task-needs-rating>
              <input type="checkbox" checked={needsRating} onChange={event => setNeedsRating(event.target.checked)} />
              تحتاج تقييم (هتقيّم التنفيذ من 1 لـ5 بعد ما تخلص)
            </label>
          )}
        </div>
        {groupDone && (
          <div role="status" className="bg-green-50 text-green-800 rounded-xl p-3 text-sm mt-4" data-task-group-done>
            اتكلّف {groupDone.created} موظف بالمهمة.
            {groupDone.skipped.length > 0 && (
              <ul className="mt-2 text-amber-800 list-disc ps-5">
                {groupDone.skipped.map(row => <li key={row.employeeId}>{row.fullName}: {row.reason}</li>)}
              </ul>
            )}
          </div>
        )}
        <div className="flex justify-end gap-2 mt-5">
          {groupDone ? (
            <button type="button" className="btn-primary" onClick={() => (onGroupSaved ?? onClose)()}>تمام</button>
          ) : (
            <>
              <button type="button" className="btn-secondary" disabled={busy} onClick={onClose}>إلغاء</button>
              <button type="button" className="btn-primary" disabled={busy} onClick={save}>{busy ? 'جاري الحفظ…' : task || selfOnly ? 'حفظ' : 'تكليف'}</button>
            </>
          )}
        </div>
      </div>
    </div>
  )
}
