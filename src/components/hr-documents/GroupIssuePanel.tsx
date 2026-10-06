'use client'

// B2.7-ب: نفس المستند لأكتر من موظف. الشاشة بتنادي مسار الإصدار نفسه لكل موظف، واحد ورا التاني (كل واحد مستنده ببياناته هو)، بمفتاح منع
// تكرار ثابت لكل موظف: إعادة المحاولة للي ماتمّش بنفس البيانات ونفس المفتاح، فالمستند مابيتصدرش مرتين حتى لو الرد الأول ضاع.
// البيانات اللي التشغيلة بدأت بيها بتتثبّت لحد «مجموعة جديدة»: تغيير الحقول فوق بعد البدء مابيدخلش في الإعادة.
// ولو المستخدم ساب الشاشة والتشغيلة شغالة: بتقف عند الموظف اللي عليه الدور (من غير إصدار مالوش شاشة تعرض نتيجته).
import { useEffect, useRef, useState } from 'react'
import { AlertTriangle, CheckCircle2, Loader2, Users, X, XCircle } from 'lucide-react'
import { EmployeePicker } from '@/components/EmployeePicker'
import { isUncertainWriteError } from '@/lib/api'
import { issueHrDocument, type HrDocumentEmployee, type HrDocumentIssueInput, type IssuedHrDocument } from '@/lib/hr-documents'

/** بيانات الإصدار المشتركة (من غير الموظف) */
export type GroupIssueInput = Omit<HrDocumentIssueInput, 'employeeId'>
export const GROUP_ISSUE_MAX = 200

type RowStatus = 'waiting' | 'running' | 'done' | 'failed' | 'uncertain'
type Row = { employee: HrDocumentEmployee; status: RowStatus; message?: string; document?: IssuedHrDocument }

export default function GroupIssuePanel({ employees, input, ready, disabled, onIssued }: {
  employees: HrDocumentEmployee[]
  // null = القالب لسه مااختارش
  input: GroupIssueInput | null
  // القالب والحقول المطلوبة وموعد الإقرار كلهم سليمين
  ready: boolean
  disabled: boolean
  // بعد كل تشغيلة: السجل تحت بيتحمّل تاني
  onIssued: () => void
}) {
  const [members, setMembers] = useState<HrDocumentEmployee[]>([])
  // null = لسه مابدأش
  const [rows, setRows] = useState<Row[] | null>(null)
  const [running, setRunning] = useState(false)
  const busy = useRef(false)
  const alive = useRef(true)
  const snapshot = useRef<GroupIssueInput | null>(null)
  const keys = useRef(new Map<number, string>())
  const unresolved = rows?.filter(row => row.status === 'failed' || row.status === 'uncertain').length ?? 0
  const uncertain = rows?.some(row => row.status === 'uncertain') ?? false

  useEffect(() => { alive.current = true; return () => { alive.current = false } }, [])
  // تشغيلة شغالة، أو موظف ردّه ماوصلش: الخروج من الصفحة بيسأل الأول
  useEffect(() => {
    if (!running && !uncertain) return
    const handler = (event: BeforeUnloadEvent) => { event.preventDefault(); event.returnValue = '' }
    window.addEventListener('beforeunload', handler)
    return () => window.removeEventListener('beforeunload', handler)
  }, [running, uncertain])

  const update = (employeeId: number, change: Partial<Row>) => setRows(previous => previous?.map(row => (row.employee.id === employeeId ? { ...row, ...change } : row)) ?? previous)
  const issue = async (targets: HrDocumentEmployee[]) => {
    const base = snapshot.current
    if (busy.current || !base || !targets.length) return
    busy.current = true; setRunning(true)
    try {
      for (const employee of targets) {
        if (!alive.current) break
        update(employee.id, { status: 'running', message: undefined })
        const key = keys.current.get(employee.id) ?? crypto.randomUUID()
        keys.current.set(employee.id, key)
        try {
          const document = await issueHrDocument({ ...base, employeeId: employee.id, idempotencyKey: key })
          update(employee.id, { status: 'done', document })
        } catch (cause) {
          // انقطاع أو مهلة أو خطأ خادم: ممكن المستند اتحفظ والرد ضاع — «ماوصلش تأكيد»، والإعادة بنفس المفتاح
          update(employee.id, { status: isUncertainWriteError(cause) ? 'uncertain' : 'failed', message: cause instanceof Error ? cause.message : 'تعذر إصدار المستند' })
        }
      }
    } finally { busy.current = false; setRunning(false); onIssued() }
  }
  const start = () => {
    if (!input || !ready || !members.length || busy.current) return
    snapshot.current = input
    keys.current = new Map()
    setRows(members.map(employee => ({ employee, status: 'waiting' })))
    void issue(members)
  }
  const retry = () => { if (rows) void issue(rows.filter(row => row.status === 'failed' || row.status === 'uncertain').map(row => row.employee)) }
  const reset = () => {
    if (busy.current) return
    if (uncertain && !window.confirm('يوجد موظفون لم يصل تأكيد إصدار مستنداتهم، وقد تكون حُفظت. إذا بدأت مجموعة جديدة فلن تستطيع إعادة المحاولة لهم من هنا — راجع السجل أدناه. هل تتابع؟')) return
    snapshot.current = null
    keys.current = new Map()
    setRows(null); setMembers([])
  }

  return (
    <section className="card p-5 space-y-4" data-group-issue>
      <div>
        <h2 className="font-bold flex items-center gap-2"><Users size={18} className="text-primary-600" />المستند نفسه لأكثر من موظف</h2>
        <p className="text-xs text-gray-500 mt-1 leading-6">يصدر لكل موظف مستنده ببياناته، بالقالب والحقول وخيار الإقرار المحددة أعلاه. المعاينة أعلاه لموظف واحد.</p>
      </div>
      {!rows ? (
        <>
          <EmployeePicker id="group-issue-employee" employees={employees} value="" disabled={disabled || members.length >= GROUP_ISSUE_MAX}
            filter={employee => !members.some(member => member.id === employee.id)}
            onChange={(_id, employee) => { if (employee) setMembers(previous => (previous.some(member => member.id === employee.id) || previous.length >= GROUP_ISSUE_MAX ? previous : [...previous, employee])) }}
            inputClassName="text-sm" placeholder="أضف موظفًا للمجموعة — اكتب الاسم أو الرقم الوظيفي" aria-label="أضف موظفًا للمجموعة" />
          {members.length > 0 && (
            <ul className="flex flex-wrap gap-2" data-group-members>
              {members.map(member => (
                <li key={member.id} className="inline-flex items-center gap-1 rounded-full bg-gray-100 text-gray-700 text-xs ps-3 pe-1 py-1">
                  {member.fullName}
                  <button type="button" disabled={disabled} onClick={() => setMembers(previous => previous.filter(item => item.id !== member.id))} aria-label={`إزالة ${member.fullName} من المجموعة`} className="p-1 rounded-full hover:bg-gray-200"><X size={12} /></button>
                </li>
              ))}
            </ul>
          )}
          {members.length >= GROUP_ISSUE_MAX && <p className="text-xs text-amber-700">الحد الأقصى {GROUP_ISSUE_MAX} موظف في المجموعة الواحدة.</p>}
          {members.length > 0 && !ready && <p className="text-xs text-gray-500">اختر القالب وأكمل الحقول المطلوبة أعلاه أولًا.</p>}
          <button type="button" disabled={disabled || !ready || !input || !members.length} onClick={start} className="btn-primary disabled:opacity-40">
            {members.length ? `إصدار للموظفين المختارين (${members.length})` : 'إصدار للمجموعة'}
          </button>
        </>
      ) : (
        <>
          <ul className="divide-y divide-gray-100" data-group-results>
            {rows.map(row => (
              <li key={row.employee.id} className="py-2 flex flex-wrap items-center justify-between gap-3 text-sm" data-group-row={row.status}>
                <span className="font-medium text-gray-800">{row.employee.fullName} <span className="text-xs text-gray-400" dir="ltr">{row.employee.employeeCode}</span></span>
                {row.status === 'done' ? <span className="flex items-center gap-1 text-green-700 text-xs"><CheckCircle2 size={15} /><span dir="ltr">{row.document?.reference}</span></span>
                  : row.status === 'running' ? <span className="flex items-center gap-1 text-gray-500 text-xs"><Loader2 size={15} className="animate-spin" />جارٍ الإصدار…</span>
                    : row.status === 'waiting' ? <span className="text-gray-400 text-xs">في الانتظار</span>
                      : row.status === 'uncertain' ? <span className="flex items-center gap-1 text-amber-700 text-xs"><AlertTriangle size={15} />لم يصل تأكيد — {row.message}</span>
                        : <span className="flex items-center gap-1 text-red-700 text-xs"><XCircle size={15} />{row.message}</span>}
              </li>
            ))}
          </ul>
          {!running && unresolved > 0 && <p className="text-xs text-gray-500">إعادة المحاولة تتم بنفس بيانات هذه المجموعة؛ ما حُفظ فعلًا لا يصدر مرتين.</p>}
          <div className="flex flex-wrap gap-2">
            {unresolved > 0 && <button type="button" disabled={running} onClick={retry} className="btn-primary disabled:opacity-40">إعادة المحاولة لغير المكتمل ({unresolved})</button>}
            <button type="button" disabled={running} onClick={reset} className="btn-secondary disabled:opacity-40">مجموعة جديدة</button>
          </div>
        </>
      )}
    </section>
  )
}
