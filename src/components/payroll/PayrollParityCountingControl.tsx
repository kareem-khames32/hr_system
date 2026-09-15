'use client'

// الخطوة 23 (B5، تصحيح المراجعة): مسير تجريبي «لا يُحتسب» في فترة التكافؤ — حامل «اعتماد المسير» يعلّمه أو يعيده بسبب مكتوب،
// ويُسجل حدث PARITY_COUNTING_CHANGED في سجل المسير؛ الخادم يتحقق من الصلاحية ونطاق الفرع والسبب.
import { useState } from 'react'
import { can } from '../../lib/api'
import { payrollRunErrorMessage, setPayrollRunParityCounting } from '../../lib/payroll-runs-api'
import { PARITY_COUNTING_CHANGED_EVENT } from './PayrollParityOperationsNote'

export interface PayrollParityCountingRun { id: number; status?: string; parityExcludedReason?: string | null }

export function PayrollParityCountingControl({ run, onChanged, canChange }: { run: PayrollParityCountingRun; onChanged: () => Promise<void> | void; canChange?: boolean }) {
  const [reason, setReason] = useState('')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')
  if (!run || run.status === 'CANCELLED') return null
  const allowed = canChange ?? can('payroll.approve')
  const excluded = !!run.parityExcludedReason
  const submit = async () => {
    setBusy(true); setError('')
    try {
      await setPayrollRunParityCounting(run.id, { counts: excluded, reason: reason.trim() })
      setReason('')
      window.dispatchEvent(new Event(PARITY_COUNTING_CHANGED_EVENT))
      await onChanged()
    } catch (e) { setError(payrollRunErrorMessage(e, 'تعذر تغيير احتساب المسير في فترة التكافؤ')) }
    finally { setBusy(false) }
  }
  return (
    <div className="rounded-xl border border-gray-100 bg-gray-50 p-3 space-y-2 text-sm">
      <p className={excluded ? 'text-amber-800' : 'text-gray-700'}>
        {excluded ? `هذا المسير معلّم تجريبيًا ولا يُحتسب في فترة التكافؤ: ${run.parityExcludedReason}` : 'هذا المسير يُحتسب في فترة التكافؤ متى كان SHADOW ومعتمدًا ومصروفًا بتقرير تكافؤ موقّع.'}
      </p>
      {error && <p role="alert" className="text-red-700">{error}</p>}
      {allowed && <div className="flex flex-wrap items-center gap-2">
        <input value={reason} onChange={e => setReason(e.target.value)} maxLength={400} className="input-field flex-1 min-w-64 text-xs"
          placeholder={excluded ? 'سبب إعادته للاحتساب (مطلوب)' : 'سبب تعليمه تجريبيًا (مطلوب)'} />
        <button type="button" onClick={submit} disabled={busy || reason.trim().length < 3} className="btn-secondary text-sm disabled:opacity-50">
          {excluded ? 'إعادته للاحتساب في فترة التكافؤ' : 'تعليمه تجريبيًا: لا يُحتسب في فترة التكافؤ'}
        </button>
      </div>}
    </div>
  )
}
