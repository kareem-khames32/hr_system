'use client'

// قرار المالك (20 سبتمبر): «نقل لمسير آخر» — المسير قائمة دائمة باسمها، والنقل يسري من الشهر المختار ورايح.
// الشهر المعتمد أو المصروف ما يتغيرش، ومسير الشهر الجديد بينسخ القائمة الجديدة لوحده.
// نفس النافذة تُستعمل من صف الموظف في جدول المسير ومن قسم الرواتب في ملف الموظف.

import { useEffect, useState } from 'react'
import { ArrowLeftRight } from 'lucide-react'
import { can } from '@/lib/api'
import { PayrollPeriodSelect, usePayrollDayRange } from '@/components/DayRangeFilter'
import {
  addPayrollRunMembers, fetchEmployeePayrollRuns, payrollRunErrorMessage,
  type PayrollEmployeeRuns, type PayrollRunMemberRef, type PayrollRunMembershipResult,
} from '@/lib/payroll-runs-api'

const RUN_STATUS: Record<string, string> = { DRAFT: 'مسودة', CALCULATED: 'محسوب', IN_REVIEW: 'قيد المراجعة', APPROVED: 'معتمد', PAID: 'مصروف', CANCELLED: 'ملغى' }
const runLabel = (run: Pick<PayrollRunMemberRef, 'id' | 'name'>) => run.name ? `${run.name} (#${run.id})` : `مسير #${run.id}`

export function PayrollRunMoveMemberModal({ employeeId, employeeName, period, fromRunId, onClose, onMoved }: {
  employeeId: number
  employeeName: string
  period: string
  /** المسير اللي الموظف فيه دلوقتي؛ بلاش قيمة = هيتحدد من مسيراته في الشهر ده */
  fromRunId?: number | null
  onClose: () => void
  onMoved: (result: PayrollRunMembershipResult) => Promise<void> | void
}) {
  const [data, setData] = useState<PayrollEmployeeRuns | null>(null)
  const [source, setSource] = useState<number | ''>(fromRunId ?? '')
  const [target, setTarget] = useState<number | ''>('')
  const [reason, setReason] = useState('')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')

  useEffect(() => {
    let cancelled = false
    fetchEmployeePayrollRuns(employeeId, period)
      .then(value => {
        if (cancelled) return
        setData(value)
        if (fromRunId == null && value.current.length === 1) setSource(value.current[0].id)
      })
      .catch(e => { if (!cancelled) setError(payrollRunErrorMessage(e, 'تعذر تحميل مسيرات الموظف')) })
    return () => { cancelled = true }
  }, [employeeId, period, fromRunId])

  const targets = (data?.targets ?? []).filter(run => run.id !== source)
  const submit = async () => {
    setError('')
    if (!target) { setError('اختار المسير المنقول إليه'); return }
    if (reason.trim().length < 3) { setError('اكتب سبب النقل'); return }
    setBusy(true)
    try {
      const result = await addPayrollRunMembers(Number(target), { employeeIds: [employeeId], reason: reason.trim(),
        ...(source ? { fromRunId: Number(source) } : {}) })
      await onMoved(result)
      onClose()
    } catch (e) {
      setError(payrollRunErrorMessage(e, 'تعذر نقل الموظف'))
    } finally { setBusy(false) }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4" role="dialog" aria-modal="true" aria-label={`نقل لمسير آخر — ${employeeName}`}>
      <div className="w-full max-w-lg rounded-2xl bg-white p-5 shadow-xl space-y-3 text-right" data-testid="payroll-move-member">
        <div className="flex items-center justify-between gap-2">
          <h3 className="font-bold text-gray-800 flex items-center gap-2"><ArrowLeftRight size={18} /> نقل لمسير آخر — {employeeName}</h3>
          <button type="button" onClick={onClose} disabled={busy} className="text-sm text-gray-500 disabled:opacity-50">إغلاق</button>
        </div>
        <p className="text-xs text-gray-500">
          النقل عضوية دائمة: يبدأ من شهر {period} ويكمّل كل شهر بعده (مسير الشهر الجديد بينسخ القائمة).
          الأشهر المعتمدة أو المصروفة ما بتتغيرش.
        </p>
        {error && <p role="alert" className="p-2 bg-red-50 text-red-700 rounded-lg text-sm">{error}</p>}
        {!data && !error && <p className="text-sm text-gray-400">جارٍ تحميل مسيرات الموظف…</p>}
        {data && (
          <div className="space-y-3 text-sm">
            <label className="flex flex-col gap-1">
              <span className="font-medium text-gray-700">من مسير</span>
              <select className="input w-full" value={source} disabled={busy || fromRunId != null} onChange={e => setSource(e.target.value ? Number(e.target.value) : '')}>
                <option value="">مش في أي مسير (إضافة بس)</option>
                {data.current.map(run => <option key={run.id} value={run.id}>{runLabel(run)} — {RUN_STATUS[run.status] ?? run.status}</option>)}
              </select>
            </label>
            <label className="flex flex-col gap-1">
              <span className="font-medium text-gray-700">إلى مسير</span>
              <select className="input w-full" value={target} disabled={busy} onChange={e => setTarget(e.target.value ? Number(e.target.value) : '')}>
                <option value="">اختار المسير</option>
                {targets.map(run => <option key={run.id} value={run.id}>{runLabel(run)} — {RUN_STATUS[run.status] ?? run.status}</option>)}
              </select>
              {!targets.length && <span className="text-xs text-gray-500">مفيش مسير تاني مفتوح في شهر {period}.</span>}
            </label>
            <label className="flex flex-col gap-1">
              <span className="font-medium text-gray-700">السبب</span>
              <input className="input w-full" maxLength={400} value={reason} disabled={busy} placeholder="مثال: اتنقل لفرع النصر" onChange={e => setReason(e.target.value)} />
            </label>
            <div className="flex gap-2 justify-end">
              <button type="button" className="btn-secondary text-sm" disabled={busy} onClick={onClose}>رجوع</button>
              <button type="button" className="btn-primary text-sm disabled:opacity-50" disabled={busy || !target || reason.trim().length < 3} onClick={submit}>
                {busy ? 'بينقل...' : 'انقل'}
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}

/**
 * قسم «مسير الموظف» في ملف الموظف (تبويب البيانات المالية): مسيره في الشهر المختار و«نقل لمسير آخر» منه.
 * النقل يسري من الشهر المختار ورايح، ولا يمسّ شهرًا معتمدًا أو مصروفًا.
 */
export function EmployeePayrollRunsCard({ employeeId, employeeName }: { employeeId: number; employeeName: string }) {
  const payrollMonth = usePayrollDayRange().context
  const [period, setPeriod] = useState('')
  const [touched, setTouched] = useState(false)
  const [data, setData] = useState<PayrollEmployeeRuns | null>(null)
  const [error, setError] = useState('')
  const [notice, setNotice] = useState('')
  const [version, setVersion] = useState(0)
  const [moving, setMoving] = useState<number | null>(null)
  const canMove = can('payroll.calculate')
  useEffect(() => { if (payrollMonth && !touched) setPeriod(payrollMonth.period) }, [payrollMonth, touched])
  useEffect(() => {
    if (!/^\d{4}-(0[1-9]|1[0-2])$/.test(period)) return
    let cancelled = false
    setError('')
    fetchEmployeePayrollRuns(employeeId, period)
      .then(value => { if (!cancelled) setData(value) })
      .catch(e => { if (!cancelled) { setData(null); setError(payrollRunErrorMessage(e, 'تعذر تحميل مسير الموظف')) } })
    return () => { cancelled = true }
  }, [employeeId, period, version])

  return (
    <div className="pt-6 border-t border-gray-100 space-y-4" data-employee-payroll-runs>
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h3 className="text-md font-bold text-gray-700">مسير الرواتب</h3>
          <p className="text-xs text-gray-500">المسير قائمة دائمة: الموظف يفضل فيه كل شهر لحد ما تنقله. النقل بيبدأ من الشهر المختار ورايح.</p>
        </div>
        <PayrollPeriodSelect id="employee-payroll-run-period" label="شهر الرواتب" value={period} className="w-52"
          cycleStartDay={payrollMonth?.cycleStartDay ?? null} today={payrollMonth?.to ?? null}
          onChange={next => { setTouched(true); setPeriod(next) }} />
      </div>
      {error && <p className="text-sm text-danger-600" role="alert">{error}</p>}
      {notice && <p className="text-sm text-success-700">{notice}</p>}
      {data && (data.current.length ? (
        <div className="divide-y divide-gray-100 border border-gray-100 rounded-xl">
          {data.current.map(run => (
            <div key={run.id} className="p-3 flex flex-wrap items-center justify-between gap-2 text-sm">
              <div>
                <p className="font-medium text-gray-800">{runLabel(run)}</p>
                <p className="text-xs text-gray-500">{RUN_STATUS[run.status] ?? run.status}{run.listed ? ' · مضاف بالاسم (عضوية دائمة)' : ' · داخل بنطاق المسير'}</p>
              </div>
              {canMove && ['DRAFT', 'CALCULATED'].includes(run.status) && (
                <button type="button" className="btn-secondary text-xs px-2 py-1" data-move-employee-run={run.id} onClick={() => setMoving(run.id)}>نقل لمسير آخر</button>
              )}
            </div>
          ))}
        </div>
      ) : (
        <div className="flex flex-wrap items-center justify-between gap-2 rounded-xl bg-amber-50 p-3 text-sm text-amber-900">
          <span>مالوش مسير في شهر {period}.</span>
          {canMove && data.targets.length > 0 && <button type="button" className="btn-secondary text-xs px-2 py-1" onClick={() => setMoving(0)}>ضمّه لمسير</button>}
        </div>
      ))}
      {moving !== null && (
        <PayrollRunMoveMemberModal employeeId={employeeId} employeeName={employeeName} period={period} fromRunId={moving || null}
          onClose={() => setMoving(null)}
          onMoved={result => {
            setNotice(`اتنقل لـ${runLabel(result.moved[0].to)} من شهر ${result.fromPeriod} ورايح${result.recalculated ? ' واتحسب تاني' : ''}.`)
            setVersion(v => v + 1)
          }} />
      )}
    </div>
  )
}

export default PayrollRunMoveMemberModal
