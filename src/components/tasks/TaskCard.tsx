'use client'
// B2.5: كارت المهمة العامة بأزرار اللي الحساب يقدر يعمله — المسؤول: جاري، مستنية (بسبب)، خلصت (بإثبات لو مطلوب).
// اللي بيديرها (صاحب «إدارة المهام»، أو اللي كلّف بيها وهو مدير مسؤولها): تعديل، إلغاء (بسبب)، إعادة فتح المقفولة (بسبب)، وإقفالها.
// الخادم هو اللي بيحكم (canWork / canManage).
// إضافة المالك 6 أكتوبر: المسؤول مايرفضش ولا يحوّل — له «مش بتاعتي» (تعليق بيبلّغ اللي كلّف) و«اطلب تمديد» (واللي بيدير المهمة يوافق أو
// يرفض)؛ واللي بيديرها يرجّع اللي خلصت للتعديل بسبب؛ والالتزام بالميعاد ومرات الرجوع ظاهرين؛ والتقييم لو ميزته مفتوحة والمهمة معلّمة.
import { Fragment, useRef, useState } from 'react'
import { AlertTriangle, CalendarClock, CheckCircle2, Clock, Hand, History, Paperclip, Pencil, RotateCcw, Star, XCircle } from 'lucide-react'
import { fetchFileObjectUrl, uploadFile } from '../../lib/api'
import { MessageSquare } from 'lucide-react'
import CommentsThread from '../comments/CommentsThread'
import TaskLog from './TaskLog'
import { addComment } from '../../lib/comments-api'
import { localToday } from '../../lib/dates'
import { decideTaskExtension, rateTask, requestTaskExtension, setTaskStatus, TASK_PRIORITY_LABELS, TASK_STATUS_LABELS, type ApiTask, type TaskStatus } from '../../lib/tasks-api'

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

type Panel = null | 'done' | 'waiting' | 'cancel' | 'reopen' | 'extend' | 'decline' | 'notMine' | 'rate'

export default function TaskCard({ task, onChanged, onEdit, highlighted }: Props) {
  const [panel, setPanel] = useState<Panel>(null)
  const [note, setNote] = useState('')
  const [extendTo, setExtendTo] = useState('')
  const [stars, setStars] = useState(0)
  const [file, setFile] = useState<File | null>(null)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')
  // B2.8: حوار المهمة — مقفول لحد ما يتفتح، ومفتوح لو المهمة جاية من لينك (إشعار إشارة)
  const [talk, setTalk] = useState(!!highlighted)
  const fileInput = useRef<HTMLInputElement>(null)
  // الملف اللي اترفع فعلًا: لو الإقفال اترفض ومحاولة تانية بنفس الملف، مايترفعش تاني
  const uploaded = useRef<{ file: File; id: number } | null>(null)
  const open = task.status === 'OPEN' || task.status === 'IN_PROGRESS' || task.status === 'WAITING'
  // سجل المهمة: مقفول لحد ما يتفتح، وبيتحمّل تاني بعد أي تغيير على المهمة
  const [history, setHistory] = useState(false)
  const logKey = [task.status, task.dueDate, task.assigneeEmployeeId, task.assigneeRole, task.returnCount, task.rating, task.extension?.dueDate, task.statusNote].join('|')
  const [said, setSaid] = useState(0)

  // إجراء من إجراءات قواعد الإسناد (تمديد، قرار، تقييم، «مش بتاعتي»): نفس شكل تغيير الحالة
  const act = async (run: () => Promise<ApiTask | void>, fallback: string) => {
    setBusy(true)
    setError('')
    try {
      const next = await run()
      if (next) onChanged(next)
      setPanel(null); setNote(''); setExtendTo(''); setStars(0)
    } catch (err) {
      setError(err instanceof Error ? err.message : fallback)
    } finally { setBusy(false) }
  }

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
    // «خلصت» = رجوع للتعديل (سببه بيوصل للمسؤول)، والملغية = إعادة فتح
    if (panel === 'reopen' && task.status === 'DONE' && !text) { setError('اكتب سبب رجوع المهمة للتعديل'); return }
    if (panel === 'reopen') { if (!text) { setError('اكتب سبب إعادة فتح المهمة'); return } return change('OPEN', { note: text }) }
    if (panel === 'extend') {
      if (!extendTo) { setError('اختار الموعد المطلوب'); return }
      if (text.length < 3) { setError('اكتب سبب طلب التمديد'); return }
      return act(() => requestTaskExtension(task.id, { dueDate: extendTo, reason: text }), 'تعذر إرسال طلب التمديد')
    }
    if (panel === 'decline') return act(() => decideTaskExtension(task.id, { approve: false, ...(text ? { note: text } : {}) }), 'تعذر الرد على طلب التمديد')
    if (panel === 'notMine') {
      if (!text) { setError('اكتب ليه المهمة مش بتاعتك'); return }
      return act(async () => { await addComment('tasks', task.id, { body: text, notMine: true }); setSaid(value => value + 1); setTalk(true) }, 'تعذر إرسال التعليق')
    }
    if (panel === 'rate') {
      if (stars < 1) { setError('اختار التقييم من 1 لـ5'); return }
      return act(() => rateTask(task.id, { rating: stars, ...(text ? { note: text } : {}) }), 'تعذر حفظ التقييم')
    }
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
          {task.personal && <span className="badge bg-gray-100 text-gray-700" data-task-personal>شخصية</span>}
          {task.needsRating && task.rating == null && <span className="badge bg-primary-50 text-primary-700" data-task-needs-rating>تحتاج تقييم</span>}
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
        {task.documentAck && <span>مهمة إقرار مستند — بتتقفل لما الموظف يقرّ بيه</span>}
        {task.documentAckId && task.status !== 'CANCELLED' && <a href={`/my/documents?ack=${task.documentAckId}`} className="text-primary-600 underline" data-task-document>افتح المستند</a>}
        {task.statusNote && <span>{task.status === 'WAITING' ? 'مستنية: ' : task.status === 'CANCELLED' ? 'سبب الإلغاء: ' : task.status === 'OPEN' ? 'اتفتحت تاني: ' : task.status === 'IN_PROGRESS' ? 'اترجّعت للتعديل: ' : ''}{task.statusNote}</span>}
        {task.complianceLabel && <span className={task.compliance?.onTime ? 'text-success-700' : 'text-red-700 font-medium'} data-task-compliance>{task.complianceLabel}</span>}
        {task.returnCount > 0 && <span className="text-warning-700" data-task-returns>اترجّعت للتعديل {task.returnCount === 1 ? 'مرة' : task.returnCount === 2 ? 'مرتين' : `${task.returnCount} مرات`}</span>}
        {task.closedByName && <span>{task.status === 'DONE' ? 'قفلها: ' : 'لغاها: '}{task.closedByName}</span>}
      </div>
      {(task.proofNote || task.proofFileId) && (
        <div className="mt-2 text-sm bg-success-50 text-success-700 rounded-lg p-2 flex flex-wrap items-center gap-2">
          <CheckCircle2 size={16} />
          {task.proofNote && <span className="break-words">{task.proofNote}</span>}
          {task.proofFileId && <button type="button" className="underline flex items-center gap-1" onClick={openProof}><Paperclip size={14} />ملف الإثبات</button>}
        </div>
      )}
      {task.rating != null && (
        <div className="mt-2 text-sm bg-primary-50 text-primary-700 rounded-lg p-2 flex flex-wrap items-center gap-2" data-task-rating>
          <Star size={16} /><span>تقييم التنفيذ: {task.rating} من 5</span>
          {task.ratingNote && <span className="break-words text-gray-700">— {task.ratingNote}</span>}
        </div>
      )}
      {task.extension && (
        <div className="mt-2 text-sm bg-warning-50 text-warning-700 rounded-lg p-2 flex flex-wrap items-center gap-2" data-task-extension>
          <CalendarClock size={16} />
          <span>طلب تمديد الميعاد لـ<span dir="ltr">{task.extension.dueDate}</span>{task.extension.reason ? `: ${task.extension.reason}` : ''}</span>
          {task.canDecideExtension && !panel && (
            <span className="flex gap-2">
              <button type="button" className="btn-primary text-xs" disabled={busy} onClick={() => void act(() => decideTaskExtension(task.id, { approve: true }), 'تعذر الرد على طلب التمديد')}>وافق</button>
              <button type="button" className="btn-secondary text-xs" disabled={busy} onClick={() => setPanel('decline')}>ارفض</button>
            </span>
          )}
        </div>
      )}
      {/* B2.8: مهمة تنفيذ طلب ومهمة إقرار مستند مالهمش حوار هنا (حوار الطلب على الطلب) */}
      {!task.execution && !task.documentAck && (
        <div className="mt-2" data-task-comments>
          <button type="button" className="text-xs text-primary-700 underline flex items-center gap-1" onClick={() => setTalk(value => !value)} aria-expanded={talk}>
            <MessageSquare size={14} />{talk ? 'إخفاء التعليقات' : 'التعليقات'}
          </button>
          {/* المفتاح على الغلاف: الحوار بيتحمّل تاني بعد تعليق «مش بتاعتي» من الكارت */}
          <Fragment key={said}>
            {talk && <div className="mt-2"><CommentsThread kind="tasks" id={task.id} /></div>}
          </Fragment>
        </div>
      )}
      {/* سجل المهمة (إضافة المالك): سطر لكل تغيير. مهمة تنفيذ طلب ومهمة إقرار مستند سجلهم تبع طلبهم أو مستندهم */}
      {!task.execution && !task.documentAck && (
        <div className="mt-2" data-task-history>
          <button type="button" className="text-xs text-primary-700 underline flex items-center gap-1" onClick={() => setHistory(value => !value)} aria-expanded={history}>
            <History size={14} />{history ? 'إخفاء سجل المهمة' : 'سجل المهمة'}
          </button>
          {history && <div className="mt-2"><TaskLog key={logKey} id={task.id} /></div>}
        </div>
      )}
      {error && <div role="alert" className="mt-2 bg-red-50 text-red-700 rounded-lg p-2 text-sm">{error}</div>}

      {panel ? (
        <div className="mt-3 space-y-2" data-task-panel={panel}>
          <label className="label" htmlFor={`task-note-${task.id}`}>
            {panel === 'done' ? `اللي اتعمل${task.requiresProof ? ' (أو ارفع ملف)' : ' (اختياري)'}${task.execution ? ' — بيتكتب في سجل الطلب وصاحبه بيشوفه' : ''}` : panel === 'waiting' ? 'المهمة مستنية إيه؟ *'
              : panel === 'reopen' ? (task.status === 'DONE' ? 'سبب الرجوع للتعديل * (إثبات الإقفال اللي فات هيتشال)' : 'سبب إعادة الفتح * (إثبات الإقفال اللي فات هيتشال)')
                : panel === 'extend' ? 'سبب طلب التمديد *' : panel === 'decline' ? 'سبب رفض التمديد (اختياري)' : panel === 'notMine' ? 'ليه المهمة مش بتاعتك؟ * (اللي كلّفك هيتبلّغ)'
                  : panel === 'rate' ? 'تعليق على التقييم (اختياري)' : 'سبب الإلغاء *'}
          </label>
          {panel === 'extend' && (
            <div>
              <label className="label" htmlFor={`task-extend-${task.id}`}>الموعد المطلوب *</label>
              <input id={`task-extend-${task.id}`} type="date" className="input" min={task.dueDate && task.dueDate >= localToday() ? task.dueDate : localToday()} value={extendTo} onChange={event => setExtendTo(event.target.value)} />
            </div>
          )}
          {panel === 'rate' && (
            <div className="flex items-center gap-1" role="radiogroup" aria-label="تقييم التنفيذ من 1 لـ5" data-task-stars>
              {[1, 2, 3, 4, 5].map(value => (
                <button key={value} type="button" role="radio" aria-checked={stars === value} aria-label={`${value} من 5`} className={value <= stars ? 'text-primary-600' : 'text-gray-300'} onClick={() => setStars(value)}>
                  <Star size={22} fill={value <= stars ? 'currentColor' : 'none'} />
                </button>
              ))}
            </div>
          )}
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
              {busy ? 'لحظة…' : panel === 'done' ? 'إقفال المهمة' : panel === 'waiting' ? 'تعليق' : panel === 'reopen' ? (task.status === 'DONE' ? 'رجّعها للتعديل' : 'افتحها تاني')
                : panel === 'extend' ? 'اطلب التمديد' : panel === 'decline' ? 'ارفض التمديد' : panel === 'notMine' ? 'ابعت' : panel === 'rate' ? 'احفظ التقييم' : 'إلغاء المهمة'}
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
          {/* المهمة اللي اتقيّمت اتقبلت: مالهاش رجوع للتعديل */}
          {task.rating == null && <>{!open && task.canManage && <button type="button" className="btn-secondary" disabled={busy} onClick={() => setPanel('reopen')}><RotateCcw size={14} className="inline ml-1" />{task.status === 'DONE' ? 'رجّعها للتعديل' : 'افتحها تاني'}</button>}</>}
          {task.canRate && <button type="button" className="btn-primary" disabled={busy} onClick={() => setPanel('rate')} data-task-rate><Star size={14} className="inline ml-1" />قيّم التنفيذ</button>}
          {task.canRequestExtension && <button type="button" className="btn-secondary" disabled={busy} onClick={() => setPanel('extend')} data-task-extend><CalendarClock size={14} className="inline ml-1" />اطلب تمديد</button>}
          {task.canNotMine && <button type="button" className="btn-secondary" disabled={busy} onClick={() => setPanel('notMine')} data-task-not-mine><Hand size={14} className="inline ml-1" />مش بتاعتي</button>}
        </div>
      )}
    </div>
  )
}
