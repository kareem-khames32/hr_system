'use client'

import type { ApiPayrollItem } from '@/lib/api'
import { formatMoney } from '../lib/money'

interface DayTrace {
  date: string; rawShortfallMinutes: number; unexcusedLateMinutes: number
  paidPermissionCoveredMinutes: number; chargeableShortfallMinutes: number
  latenessAmount: number; shortfallAmount: number; permissionAmount: number; totalAmount: number
}
// الخطوة 22 (B5): منسّق المبالغ الموحد في شاشات الرواتب والقسيمة
const money = (amount: number) => formatMoney(amount)

export function PayrollAttendanceBreakdown({ item, currency }: { item: ApiPayrollItem; currency: string }) {
  let detail: { attendanceDeductions?: { days?: DayTrace[] };
    attendanceRules?: Array<{ date: string; reviewRequired: boolean; reviewReason: string }> }
  try { detail = JSON.parse(item.breakdown || '{}') } catch { return null }
  const days = detail.attendanceDeductions?.days
  if (!Array.isArray(days)) return null
  const relevant = days.filter(day => day.rawShortfallMinutes > 0 || day.unexcusedLateMinutes > 0 || day.permissionAmount > 0)
  const review = Array.isArray(detail.attendanceRules) ? detail.attendanceRules.filter(day => day.reviewRequired) : []
  return <section className="rounded-xl border border-gray-200 p-4 space-y-3">
    <h3 className="font-bold text-gray-800">مراجعة خصومات الحضور</h3>
    <p className="text-sm text-gray-600">المبالغ بالـ{currency}.</p>
    {review.length > 0 && <div className="rounded-lg bg-amber-50 p-3 text-sm text-amber-900">
      <p className="font-bold">مراجعة مطلوبة قبل اعتماد المسير</p>
      {review.map(day => <p key={day.date}>{day.date}: {day.reviewReason}</p>)}
    </div>}
    {relevant.length === 0 ? <p className="text-sm text-gray-500">لا توجد خصومات تأخير أو نقص ساعات أو أذونات مدفوعة في هذه النسخة.</p> :
      <div className="overflow-x-auto"><table className="w-full text-sm whitespace-nowrap">
        <thead><tr className="table-header">
          {['اليوم', 'التأخير قبل السماح (د)', 'النقص المرصود (د)', 'مغطى بإذن مدفوع (د)', 'النقص المحاسب (د)', 'خصم التأخير', 'خصم النقص', 'خصم الإذن', 'الإجمالي'].map(label => <th key={label} className="p-2 text-center">{label}</th>)}
        </tr></thead>
        <tbody>{relevant.map(day => <tr key={day.date} className="border-t border-gray-100">
          <td className="p-2" dir="ltr">{day.date}</td>
          {[day.unexcusedLateMinutes, day.rawShortfallMinutes, day.paidPermissionCoveredMinutes, day.chargeableShortfallMinutes].map((value, index) => <td key={index} className="p-2 text-center">{value}</td>)}
          {[day.latenessAmount, day.shortfallAmount, day.permissionAmount, day.totalAmount].map((value, index) => <td key={index} className="p-2 text-center font-mono">{money(value)}</td>)}
        </tr>)}</tbody>
      </table></div>}
    <p className="text-xs text-gray-500">النقص المرصود معلومة حضور. الخصم يُحسب بعد تطبيق السماحية وحدها. التقريب النهائي على إجمالي البند قد يُظهر فرق قرش عن جمع مبالغ الأيام المعروضة.</p>
  </section>
}
