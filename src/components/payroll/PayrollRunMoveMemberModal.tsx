'use client'

// قرار المالك (20 سبتمبر): «نقل لمسير آخر» — المسير قائمة دائمة باسمها، والنقل يسري من الشهر المختار ورايح.
// الشهر المعتمد أو المصروف ما يتغيرش، ومسير الشهر الجديد بينسخ القائمة الجديدة لوحده.
// النافذة نفسها واحدة في كل الشاشات (PayrollMoveToRunModal): جدول الشهر الموحد، وصف الموظف في جدول المسير، وملف الموظف.

import { useEffect, useState } from 'react'
import { can } from '@/lib/api'
import { PayrollPeriodSelect, usePayrollDayRange } from '@/components/DayRangeFilter'
import { PayrollMoveToRunModal } from '@/components/payroll/PayrollMoveToRunModal'
import {
  fetchEmployeePayrollRuns, payrollRunErrorMessage,
  type PayrollBulkMembershipResult, type PayrollEmployeeRuns, type PayrollRunMemberRef,
} from '@/lib/payroll-runs-api'

const RUN_STATUS: Record<string, string> = { DRAFT: 'مسودة', CALCULATED: 'محسوب', IN_REVIEW: 'قيد المراجعة', APPROVED: 'معتمد', PAID: 'مصروف', CANCELLED: 'ملغى' }
const runLabel = (run: Pick<PayrollRunMemberRef, 'id' | 'name'>) => run.name ? `${run.name} (#${run.id})` : `مسير #${run.id}`

/** غلاف بالاسم القديم على النافذة الموحدة — لموظف واحد من صفه أو من ملفه. */
export function PayrollRunMoveMemberModal({ employeeId, employeeName, period, fromRunId, fromRunName, onClose, onMoved }: {
  employeeId: number
  employeeName: string
  period: string
  /** المسير اللي الموظف فيه دلوقتي؛ بلاش قيمة = إضافة */
  fromRunId?: number | null
  fromRunName?: string | null
  onClose: () => void
  onMoved: (result: PayrollBulkMembershipResult) => Promise<void> | void
}) {
  return (
    <PayrollMoveToRunModal period={period} onClose={onClose} onDone={onMoved}
      employees={[{ employeeId, fullName: employeeName, runId: fromRunId ?? null, runName: fromRunName ?? null }]} />
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
  const [moving, setMoving] = useState<PayrollRunMemberRef | null | undefined>(undefined)
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
                <button type="button" className="btn-secondary text-xs px-2 py-1" data-move-employee-run={run.id} onClick={() => setMoving(run)}>نقل لمسير آخر</button>
              )}
            </div>
          ))}
        </div>
      ) : (
        <div className="flex flex-wrap items-center justify-between gap-2 rounded-xl bg-amber-50 p-3 text-sm text-amber-900">
          <span>مالوش مسير في شهر {period}.</span>
          {canMove && data.targets.length > 0 && <button type="button" className="btn-secondary text-xs px-2 py-1" onClick={() => setMoving(null)}>ضمّه لمسير</button>}
        </div>
      ))}
      {moving !== undefined && (
        <PayrollRunMoveMemberModal employeeId={employeeId} employeeName={employeeName} period={period}
          fromRunId={moving?.id ?? null} fromRunName={moving?.name ?? null}
          onClose={() => setMoving(undefined)}
          onMoved={result => {
            const done = result.results.find(row => row.outcome !== 'SKIPPED')
            setNotice(done
              ? `${done.outcome === 'MOVED' ? 'اتنقل' : 'اتضاف'} لـ${runLabel(result.target)} من شهر ${result.fromPeriod} ورايح${result.recalculated ? ' واتحسب تاني' : ''}.`
              : `ما اتغيّرش: ${result.results[0]?.skipReason ?? 'اتخطى'}`)
            setVersion(v => v + 1)
          }} />
      )}
    </div>
  )
}

export default PayrollRunMoveMemberModal
