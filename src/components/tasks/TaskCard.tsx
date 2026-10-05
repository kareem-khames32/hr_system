'use client'
// B2.5: كارت المهمة العامة بأزرار اللي الحساب يقدر يعمله — المسؤول: جاري، مستنية (بسبب)، خلصت (بإثبات لو مطلوب).
// اللي بيديرها (صاحب «إدارة المهام»، أو اللي كلّف بيها وهو مدير مسؤولها): تعديل، إلغاء (بسبب)، إعادة فتح المقفولة (بسبب)، وإقفالها.
// الخادم هو اللي بيحكم (canWork / canManage).
import { useRef, useState } from 'react'
import { AlertTriangle, CheckCircle2, Clock, Paperclip, Pencil, RotateCcw, XCircle } from 'lucide-react'
import { fetchFileObjectUrl, uploadFile } from '../../lib/api'
import { setTaskStatus, TASK_PRIORITY_LABELS, TASK_STATUS_LABELS, type ApiTask, type TaskStatus } from '../../lib/tasks-api'

const STATUS_TONE: Record<TaskStatus, string> = {
  OPEN: 'bg-gray-100 text-gray-700',
  IN_PROGRESS: 'bg-primary-50 text-primary-700',
  WAITING: 'bg-warning-50 text-warning-700',
  DONE: 'bg-success-50 text-success-700',
  CANCELLED: 'bg-gray-100 text-gray-500',
}

interface Props {
  task: ApiTask
  onChanged: (task: ApiTask) => void
  onEdit?: (task: ApiTask) => void
  highlighted?: boolean
}

type Panel = null | 'done' | 'waiting' | 'cancel' | 'reopen'

export default function TaskCard({ task, onChanged, onEdit, highlighted }: Props) {
  const [panel, setPanel] = useState<Panel>(null)
  const [note, setNote] = useState('')
  const [file, setFile] = useState<File | null>(null)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')
  const fileInput = useRef<HTMLInputElement>(null)
  // الملف اللي اترفع فعلًا: لو الإقفال اترفض ومحاولة تانية بنفس الملف، مايترفعش تاني
  const uploaded = useRef<{ file: File; id: number } | null>(null)
  const open = task.status === 'OPEN' || task.status === 'IN_PROGRESS' || task.status === 'WAITING'

  const change = async (status: TaskStatus, extra: { note?: string; proofNote?: string; proofFileId?: number } = {}) => {
    setBusy(true)
    setError('')
    try {
      onChanged(await setTaskStatus(task.id, { status, ...extra }))
      setPanel(null); setNote(''); setFile(null)
      uploaded.current = null
    } catch (err) {
      setError(err instanceof Error ? err.message : 'تعذر تغيير حالة المهمة')
    } finally { setBusy(false) }
  }

  const confirm = async () => {
    const text = note.trim()
    if (panel === 'waiting') { if (!text) { setError('اكتب المهمة مستنية إيه'); return } return change('WAITING', { note: text }) }
    if (panel === 'cancel') { if (!text) { setError('اكتب سبب الإلغاء'); return } return change('CANCELLED', { note: text }) }
    if (panel === 'reopen') { if (!text) { setError('اكتب سبب إعادة فتح المهمة'); return } return change('OPEN', { note: text }) }
    if (task.requiresProof && !text && !file) { setError('المهمة دي مطلوب لها إثبات: اكتب اللي اتعمل أو ارفع ملف'); return }
    setBusy(true)
    setError('')
    let proofFileId: number | undefined
    try {
      if (file) {
        if (uploaded.current?.file !== file) uploaded.current = { file, id: (await uploadFile(file, { entityType: 'task' })).id }
        proofFileId = uploaded.current.id
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'تعذر رفع ملف الإثبات')
      setBusy(false)
      return
    }
    return change('DONE', { ...(text ? { proofNote: text } : {}), ...(proofFileId ? { proofFileId } : {}) })
  }

  const openProof = async () => {
    if (!task.proofFileId) return
    const preview = window.open('', '_blank')
    if (preview) preview.opener = null
    try {
      const url = await fetchFileObjectUrl(task.proofFileId)
      if (!url) throw new Error('تعذر فتح ملف الإثبات')
      if (preview) preview.location.href = url
      setTimeout(() => URL.revokeObjectURL(url), 60_000)
    } catch (err) {
      preview?.close()
      setError(err instanceof Error ? err.message : 'تعذر فتح ملف الإثبات')
    }
  }

  return (
    <div className={`rounded-xl border p-4 ${highlighted ? 'border-primary-400 ring-2 ring-primary-100' : 'border-gray-200'} bg-white`} data-task-card={task.id}>
      <div className="flex flex-wrap items-start justify-between gap-2">
        <div className="min-w-0">
          <p className="font-medium text-gray-800 break-words">{task.title}</p>
          <p className="text-xs text-gray-500 mt-1">
            {task.assigneeRoleLabel ? `على دور: ${task.assigneeRoleLabel}` : `على: ${task.assigneeName ?? '—'}`}
            {task.branchName ? ` · ${task.branchName}` : ''}
            {task.createdByName ? ` · كلّف بيها: ${task.createdByName}` : ''}
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2 shrink-0">
          {task.priority === 'HIGH' && <span className="badge bg-red-50 text-red-700">أولوية {TASK_PRIORITY_LABELS.HIGH}</span>}
          <span className={`badge ${STATUS_TONE[task.status]}`}>{TASK_STATUS_LABELS[task.status]}</span>
        </div>
      </div>
      {task.description && <p className="text-sm text-gray-600 mt-2 whitespace-pre-wrap break-words">{task.description}</p>}
      <div className="flex flex-wrap items-center gap-3 mt-2 text-xs text-gray-600">
        {task.dueDate && (
          <span className={`flex items-center gap-1 ${task.overdue ? 'text-red-700 font-medium' : ''}`}>
            {task.overdue ? <AlertTriangle size={14} /> : <Clock size={14} />}
            <span dir="ltr">{task.dueDate}</span>{task.overdue ? ' — متأخرة' : ''}
          </span>
        )}
        {task.requiresProof && open && <span>لازم إثبات عند الإقفال</span>}
        {task.execution && <span>مهمة تنفيذ طلب معتمد — إقفالها بيكمّل الطلب</span>}
        {task.requestId && <a href={`/approvals-inbox?request=${task.requestId}`} className="text-primary-600 underline" data-task-request>افتح الطلب</a>}
        {task.statusNote && <span>{task.status === 'WAITING' ? 'مستنية: ' : task.status === 'CANCELLED' ? 'سبب الإلغاء: ' : task.status === 'OPEN' ? 'اتفتحت تاني: ' : ''}{task.statusNote}</span>}
        {task.closedByName && <span>{task.status === 'DONE' ? 'قفلها: ' : 'لغاها: '}{task.closedByName}</span>}
      </div>
      {(task.proofNote || task.proofFileId) && (
        <div className="mt-2 text-sm bg-success-50 text-success-700 rounded-lg p-2 flex flex-wrap items-center gap-2">
          <CheckCircle2 size={16} />
          {task.proofNote && <span className="break-words">{task.proofNote}</span>}
          {task.proofFileId && <button type="button" className="underline flex items-center gap-1" onClick={openProof}><Paperclip size={14} />ملف الإثبات</button>}
        </div>
      )}
      {error && <div role="alert" className="mt-2 bg-red-50 text-red-700 rounded-lg p-2 text-sm">{error}</div>}

      {panel ? (
        <div className="mt-3 space-y-2" data-task-panel={panel}>
          <label className="label" htmlFor={`task-note-${task.id}`}>
            {panel === 'done' ? `اللي اتعمل${task.requiresProof ? ' (أو ارفع ملف)' : ' (اختياري)'}${task.execution ? ' — بيتكتب في سجل الطلب وصاحبه بيشوفه' : ''}` : panel === 'waiting' ? 'المهمة مستنية إيه؟ *'
              : panel === 'reopen' ? 'سبب إعادة الفتح * (إثبات الإقفال اللي فات هيتشال)' : 'سبب الإلغاء *'}
          </label>
          <textarea id={`task-note-${task.id}`} className="input" rows={2} maxLength={panel === 'done' ? 1000 : 500} value={note} onChange={event => setNote(event.target.value)} />
          {panel === 'done' && (
            <div className="flex flex-wrap items-center gap-2 text-sm">
              <input ref={fileInput} type="file" className="hidden" accept=".pdf,.jpg,.jpeg,.png,.webp,.doc,.docx,.xls,.xlsx" onChange={event => setFile(event.target.files?.[0] ?? null)} />
              <button type="button" className="btn-secondary" disabled={busy} onClick={() => fileInput.current?.click()}><Paperclip size={14} className="inline ml-1" />{file ? file.name : 'ملف إثبات'}</button>
              {file && <button type="button" className="text-xs text-gray-500 underline" onClick={() => { setFile(null); if (fileInput.current) fileInput.current.value = '' }}>شيل الملف</button>}
            </div>
          )}
          <div className="flex gap-2">
            <button type="button" className={panel === 'cancel' ? 'btn-danger' : 'btn-primary'} disabled={busy} onClick={confirm}>
              {busy ? 'لحظة…' : panel === 'done' ? 'إقفال المهمة' : panel === 'waiting' ? 'تعليق' : panel === 'reopen' ? 'افتحها تاني' : 'إلغاء المهمة'}
            </button>
            <button type="button" className="btn-secondary" disabled={busy} onClick={() => { setPanel(null); setError('') }}>رجوع</button>
          </div>
        </div>
      ) : (
        <div className="flex flex-wrap gap-2 mt-3" data-task-actions>
          {task.canWork && task.status !== 'IN_PROGRESS' && <button type="button" className="btn-secondary" disabled={busy} onClick={() => change('IN_PROGRESS')}>{task.status === 'WAITING' ? 'كمّل' : 'ابدأ'}</button>}
          {task.canWork && task.status !== 'WAITING' && <button type="button" className="btn-secondary" disabled={busy} onClick={() => setPanel('waiting')}>مستنية</button>}
          {open && (task.canWork || task.canManage) && <button type="button" className="btn-primary" disabled={busy} onClick={() => setPanel('done')}>خلصت</button>}
          {open && task.canManage && onEdit && <button type="button" className="btn-secondary" disabled={busy} onClick={() => onEdit(task)}><Pencil size={14} className="inline ml-1" />تعديل</button>}
          {open && task.canManage && <button type="button" className="btn-secondary" disabled={busy} onClick={() => setPanel('cancel')}><XCircle size={14} className="inline ml-1" />إلغاء</button>}
          {!open && task.canManage && <button type="button" className="btn-secondary" disabled={busy} onClick={() => setPanel('reopen')}><RotateCcw size={14} className="inline ml-1" />افتحها تاني</button>}
        </div>
      )}
    </div>
  )
}
