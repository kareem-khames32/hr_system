'use client'
// «إيقاف مؤقت» عن العمل لفترة (قرار المالك 16 سبتمبر): من تاريخ، إلى تاريخ، والسبب — أو إنهاء إيقاف قائم بدري.
import { useState } from 'react'
import { localToday } from '@/lib/dates'
import {
  dayCountText,
  endEmployeeSuspension,
  inclusiveDays,
  isValidDate,
  suspendEmployee,
  suspensionEndPlan,
  suspensionInputIssue,
  suspensionPeriodText,
  SUSPENSION_REASON_MAX,
  type EmployeeSuspension,
} from '@/lib/employee-suspensions-api'

interface Props {
  employee: { id: number; name: string }
  // إيقاف ساري أو قادم = نافذة الإنهاء؛ بدونه = نافذة إيقاف جديد
  current?: Pick<EmployeeSuspension, 'id' | 'fromDate' | 'toDate' | 'reason' | 'status' | 'state'> | null
  onClose: () => void
  onSaved: (message: string) => void
}

export default function EmployeeSuspensionDialog({ employee, current, onClose, onSaved }: Props) {
  const today = localToday()
  const ending = !!current
  // إيقاف انتهى (مثلًا اتسجل بأثر رجعي غلط): يتلغى أو تتقدّم نهايته — الافتراضي الإلغاء
  const finished = current?.state === 'FINISHED'
  const [fromDate, setFromDate] = useState(today)
  const [toDate, setToDate] = useState('')
  const [returnDate, setReturnDate] = useState(current && (finished || current.fromDate > today) ? current.fromDate : today)
  const [reason, setReason] = useState('')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')

  const days = isValidDate(fromDate) && isValidDate(toDate) && toDate >= fromDate ? inclusiveDays(fromDate, toDate) : 0
  const endPlan = current ? suspensionEndPlan(current, returnDate, today) : null
  const cancels = !!endPlan?.ok && endPlan.status === 'CANCELLED'

  const submit = async () => {
    setError('')
    if (ending && current) {
      if (!endPlan?.ok) { setError(endPlan?.message ?? 'تاريخ الرجوع غير صحيح'); return }
    } else {
      const issue = suspensionInputIssue({ fromDate, toDate, reason })
      if (issue) { setError(issue); return }
    }
    setBusy(true)
    try {
      if (ending && current) {
        await endEmployeeSuspension(employee.id, current.id, { returnDate, reason: reason.trim() || undefined })
        onSaved(cancels ? `اتلغى إيقاف ${employee.name}`
          : finished && endPlan?.ok ? `اتعدلت نهاية إيقاف ${employee.name} — آخر يوم إيقاف ${endPlan.toDate}`
          : `اتنهى إيقاف ${employee.name} — راجع للعمل من ${returnDate}`)
      } else {
        await suspendEmployee(employee.id, { fromDate, toDate, reason: reason.trim() })
        onSaved(`اتسجل إيقاف ${employee.name} ${suspensionPeriodText({ fromDate, toDate })}`)
      }
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'تعذر حفظ الإيقاف')
    } finally {
      setBusy(false)
    }
  }

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4" onClick={() => !busy && onClose()}>
      <div className="bg-white rounded-2xl w-full max-w-md p-6 shadow-xl" role="dialog" aria-modal="true" aria-labelledby="employee-suspension-title" onClick={event => event.stopPropagation()}>
        <h3 id="employee-suspension-title" className="font-bold text-gray-800 text-lg mb-1">
          {ending ? (finished ? 'تصحيح إيقاف منتهي' : 'إنهاء الإيقاف عن العمل') : 'إيقاف مؤقت عن العمل'}
        </h3>
        <p className="text-sm text-gray-500 mb-4">{employee.name}</p>
        {error && <div role="alert" className="bg-red-50 text-red-700 rounded-xl p-3 mb-3 text-sm">{error}</div>}

        {ending && current ? (
          <div className="space-y-3">
            <div className="rounded-xl bg-gray-50 p-3 text-sm text-gray-700 space-y-1">
              <p>{finished ? 'الإيقاف' : 'الإيقاف الحالي'} {suspensionPeriodText(current)}</p>
              <p className="text-gray-500">السبب: {current.reason}</p>
            </div>
            <div>
              <label className="label" htmlFor="suspension-return-date">يرجع للعمل من *</label>
              <input id="suspension-return-date" type="date" className="input" max={current.toDate} value={returnDate} onChange={event => setReturnDate(event.target.value)} />
              <p className="text-xs text-gray-500 mt-1">
                {cancels ? 'الرجوع في يوم البداية أو قبله = إلغاء الإيقاف كله (مفيش أيام بتتخصم).'
                  : endPlan?.ok ? `آخر يوم إيقاف هيبقى ${endPlan.toDate}، والأيام بعده ترجع أيام عمل عادية.` : ''}
              </p>
              {finished && <p className="text-xs text-gray-500 mt-1">مينفعش التصحيح لو أيام الإيقاف دخلت مسير رواتب معتمد أو مصروف.</p>}
            </div>
            <div>
              <label className="label" htmlFor="suspension-end-reason">سبب الإنهاء (اختياري)</label>
              <textarea id="suspension-end-reason" className="input" rows={2} maxLength={SUSPENSION_REASON_MAX} value={reason} onChange={event => setReason(event.target.value)} />
            </div>
          </div>
        ) : (
          <div className="space-y-3">
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="label" htmlFor="suspension-from">من تاريخ *</label>
                <input id="suspension-from" type="date" className="input" value={fromDate} onChange={event => setFromDate(event.target.value)} />
              </div>
              <div>
                <label className="label" htmlFor="suspension-to">إلى تاريخ *</label>
                <input id="suspension-to" type="date" className="input" min={fromDate || undefined} value={toDate} onChange={event => setToDate(event.target.value)} />
              </div>
            </div>
            {days > 0 && <p className="text-sm text-gray-700">مدة الإيقاف: {dayCountText(days)}</p>}
            <div>
              <label className="label" htmlFor="suspension-reason">السبب *</label>
              <textarea id="suspension-reason" className="input" rows={3} maxLength={SUSPENSION_REASON_MAX} value={reason} onChange={event => setReason(event.target.value)} />
            </div>
            <p className="text-xs text-gray-500 leading-5">
              طول الفترة حالة الموظف «موقوف»، وأيامها مش غياب لكن بتتخصم من الراتب يوم بيوم زي الإجازة بدون راتب.
              بعد آخر يوم بيرجع «نشط» لوحده، وتقدر تنهي الإيقاف بدري.
            </p>
          </div>
        )}

        <div className="flex gap-3 mt-6 pt-4 border-t border-gray-100">
          <button type="button" className="btn-primary flex-1 disabled:opacity-50" onClick={submit}
            disabled={busy || (ending ? !endPlan?.ok : !fromDate || !toDate || reason.trim().length < 3)}>
            {busy ? 'جارٍ الحفظ...' : ending ? (cancels ? 'إلغاء الإيقاف' : finished ? 'تعديل نهاية الإيقاف' : 'إنهاء الإيقاف') : 'تأكيد الإيقاف'}
          </button>
          <button type="button" className="btn-secondary" disabled={busy} onClick={onClose}>إغلاق</button>
        </div>
      </div>
    </div>
  )
}
