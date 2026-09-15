'use client'

// الخطوة 22 (B5): شاشة التعارضات بإجراءات حل — «استبعاد الموظف من هذا المسير» بسبب مكتوب (المسودة: في تعريفها؛ المحسوب: بإعادة حساب بنسخة جديدة)،
// أو «فتح المسير الآخر» لمعالجة الحجز هناك. مسير خارج نطاق الصلاحية لا يُكشف رقمه ولا يُفتح.
import { useState } from 'react'
import { AlertCircle } from 'lucide-react'
import type { ApiPayrollConflict } from '../../lib/api'
import { excludePayrollRunMember, payrollRunErrorMessage } from '../../lib/payroll-runs-api'

const STATUS_TEXT: Record<string, string> = { DRAFT: 'مسودة', CALCULATED: 'محسوب', APPROVED: 'معتمد', PAID: 'مصروف', CANCELLED: 'ملغى' }

export interface PayrollConflictResolutionProps {
  title: string
  conflicts: readonly ApiPayrollConflict[]
  run: { id: number; status: string } | null
  employeeName: (employeeId: number) => string
  canExclude: boolean
  allowDraftConflicts?: boolean
  onOpenRun: (runId: number) => void
  onResolved: () => Promise<void> | void
}

export function PayrollConflictResolution({ title, conflicts, run, employeeName, canExclude, allowDraftConflicts, onOpenRun, onResolved }: PayrollConflictResolutionProps) {
  const [reasons, setReasons] = useState<Record<number, string>>({})
  const [busy, setBusy] = useState<number | null>(null)
  const [error, setError] = useState('')
  if (!conflicts.length) return null
  const blocking = conflicts.some(row => row.blocking)
  const excludable = canExclude && run !== null && ['DRAFT', 'CALCULATED'].includes(run.status)
  const exclude = async (employeeId: number) => {
    if (!run) return
    setBusy(employeeId); setError('')
    try {
      await excludePayrollRunMember(run.id, { employeeId, reason: (reasons[employeeId] ?? '').trim(), allowDraftConflicts })
      setReasons(current => { const next = { ...current }; delete next[employeeId]; return next })
      await onResolved()
    } catch (e) { setError(payrollRunErrorMessage(e, 'تعذر استبعاد الموظف من المسير')) }
    finally { setBusy(null) }
  }
  const seen = new Set<number>()
  return (
    <div role="alert" className={`rounded-xl border p-4 space-y-2 ${blocking ? 'bg-red-50 border-red-200 text-red-800' : 'bg-amber-50 border-amber-200 text-amber-900'}`}>
      <p className="font-bold flex items-center gap-2"><AlertCircle size={18} />{title}</p>
      <p className="text-sm">{blocking
        ? 'تعارض حاجب: الموظف محجوز في مسير معتمد أو مصروف لنفس الأيام. استبعده من هذا المسير بسبب، أو افتح المسير الآخر لمراجعة حجزه.'
        : 'تعارض مع مسودات أخرى. استبعد الموظف من أحد المسيرين بسبب مكتوب، أو افتح المسير الآخر وعالجه هناك؛ ويُعاد الفحص عند الاعتماد.'}</p>
      {error && <p className="rounded-lg bg-white/70 p-2 text-sm text-red-700">{error}</p>}
      <ul className="space-y-2 text-sm">
        {conflicts.map((conflict, index) => {
          const firstForEmployee = !seen.has(conflict.employeeId)
          seen.add(conflict.employeeId)
          const reason = reasons[conflict.employeeId] ?? ''
          return (
            <li key={`${conflict.employeeId}-${conflict.otherRunId}-${index}`} className="border-t border-black/5 pt-2 space-y-1">
              <p>
                {employeeName(conflict.employeeId)} — {conflict.name || (conflict.otherRunId != null ? `مسير #${conflict.otherRunId}` : 'مسير خارج نطاق الصلاحية')}
                {' '}({STATUS_TEXT[conflict.status] ?? conflict.status}) — {conflict.overlapDays} يوم متداخل{' '}
                <span dir="ltr">{conflict.startDate.slice(0, 10)} / {conflict.endDate.slice(0, 10)}</span>{conflict.blocking && <strong> — حاجب</strong>}
              </p>
              <div className="flex flex-wrap items-center gap-2">
                {conflict.otherRunId != null && <button type="button" onClick={() => onOpenRun(conflict.otherRunId!)} className="btn-secondary text-xs">فتح المسير الآخر #{conflict.otherRunId}</button>}
                {excludable && firstForEmployee && <>
                  <input value={reason} onChange={event => setReasons(current => ({ ...current, [conflict.employeeId]: event.target.value }))} maxLength={400}
                    className="input text-xs flex-1 min-w-48" placeholder="سبب استبعاد الموظف من هذا المسير (مطلوب)" aria-label={`سبب استبعاد ${employeeName(conflict.employeeId)}`} />
                  <button type="button" onClick={() => exclude(conflict.employeeId)} disabled={busy !== null || reason.trim().length < 3} className="btn-primary text-xs disabled:opacity-50">
                    {run?.status === 'CALCULATED' ? 'استبعاد من هذا المسير وإعادة حسابه' : 'استبعاد من هذا المسير'}
                  </button>
                </>}
              </div>
            </li>
          )
        })}
      </ul>
    </div>
  )
}
