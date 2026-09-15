'use client'

// الخطوة 22 (B5) — مبسطة: لكل موظف سطر واحد «مدرج في مسير آخر لنفس الأيام» وزر «استبعاد من هذا المسير» بسبب جاهز
// (المسودة: في تعريفها؛ المحسوب: بإعادة حسابه). أرقام المسيرات الأخرى وتواريخها لا تُعرض.
import { useState } from 'react'
import { AlertCircle } from 'lucide-react'
import type { ApiPayrollConflict } from '../../lib/api'
import { excludePayrollRunMember, payrollRunErrorMessage } from '../../lib/payroll-runs-api'

const AUTO_REASON = 'مدرج في مسير آخر لنفس الأيام'

export interface PayrollConflictResolutionProps {
  title: string
  conflicts: readonly ApiPayrollConflict[]
  run: { id: number; status: string } | null
  employeeName: (employeeId: number) => string
  canExclude: boolean
  allowDraftConflicts?: boolean
  onResolved: () => Promise<void> | void
}

export function PayrollConflictResolution({ title, conflicts, run, employeeName, canExclude, allowDraftConflicts, onResolved }: PayrollConflictResolutionProps) {
  const [busy, setBusy] = useState<number | null>(null)
  const [error, setError] = useState('')
  if (!conflicts.length) return null
  const blocking = conflicts.some(row => row.blocking)
  const excludable = canExclude && run !== null && ['DRAFT', 'CALCULATED'].includes(run.status)
  const exclude = async (employeeId: number) => {
    if (!run) return
    setBusy(employeeId); setError('')
    try {
      await excludePayrollRunMember(run.id, { employeeId, reason: AUTO_REASON, allowDraftConflicts })
      await onResolved()
    } catch (e) { setError(payrollRunErrorMessage(e, 'تعذر استبعاد الموظف من المسير')) }
    finally { setBusy(null) }
  }
  const employeeIds = [...new Set(conflicts.map(row => row.employeeId))]
  return (
    <div role="alert" className={`rounded-xl border p-4 space-y-2 ${blocking ? 'bg-red-50 border-red-200 text-red-800' : 'bg-amber-50 border-amber-200 text-amber-900'}`}>
      <p className="font-bold flex items-center gap-2"><AlertCircle size={18} />{title}</p>
      {error && <p className="rounded-lg bg-white/70 p-2 text-sm text-red-700">{error}</p>}
      <ul className="space-y-2 text-sm">
        {employeeIds.map(employeeId => (
          <li key={employeeId} className="border-t border-black/5 pt-2 flex flex-wrap items-center justify-between gap-2">
            <span>{employeeName(employeeId)} — مدرج في مسير آخر لنفس الأيام</span>
            {excludable && <button type="button" onClick={() => exclude(employeeId)} disabled={busy !== null} className="btn-primary text-xs disabled:opacity-50">
              استبعاد من هذا المسير
            </button>}
          </li>
        ))}
      </ul>
    </div>
  )
}
