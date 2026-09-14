import type { ApiPayrollItem } from '@/lib/api'

// D13 / الخطوة 28: نتيجة محرك السياسة بوضع SHADOW محفوظة في تفصيل بند المسير نفسه؛ لا تُعاد قراءتها من المصادر الحية.
type Money = { lateness: string; shortfall: string; absence: string; total: string }
interface ShadowDay {
  date: string; overnight: boolean; punchIds: number[]; firstIn: string | null; lastOut: string | null
  workdayWindow: { from: string; to: string; overnight: boolean } | null
  inputs: { absent: boolean; rawLateSeconds: string; unexcusedLateMinutes: number; lateMinutes: number; shortfallMinutes: number }
  policy: Money; legacy: Money; matches: boolean
}
export interface PayrollShadowAttendance {
  engineMode: 'SHADOW'; paidResult: 'LEGACY'
  status: 'MATCHED' | 'DIFFERENT' | 'PARTIAL' | 'UNAVAILABLE' | 'UNSUPPORTED_POLICY' | 'ERROR'
  switchEligible: boolean; message: string
  totals?: { policy: Money | null; legacy: Money }
  provenWorkDays?: number
  unprovenDays?: Array<{ code: string; dates: string[] }>
  days?: ShadowDay[]
  differences?: Array<{ date: string | null; component: 'lateness' | 'shortfall' | 'absence'; legacy: string | null; policy: string | null; reason: string }>
}

const STATUS: Record<PayrollShadowAttendance['status'], { label: string; className: string }> = {
  MATCHED: { label: 'مطابق', className: 'badge badge-success' },
  DIFFERENT: { label: 'مختلف بأسباب مسجلة', className: 'badge badge-warning' },
  PARTIAL: { label: 'تكافؤ جزئي', className: 'badge badge-warning' },
  UNAVAILABLE: { label: 'المصادر غير مثبتة', className: 'badge bg-gray-100 text-gray-600' },
  UNSUPPORTED_POLICY: { label: 'إعداد غير مدعوم', className: 'badge bg-gray-100 text-gray-600' },
  ERROR: { label: 'تعذر الحساب', className: 'badge badge-danger' },
}
const COMPONENT_NAMES = { lateness: 'التأخير', shortfall: 'نقص الساعات', absence: 'الغياب' } as const
const exact = (value: unknown) => typeof value === 'string' && /^\d+\.\d{2,6}$/.test(value) ? value : null
const localClock = (iso: string | null) => {
  if (!iso) return '—'
  const value = new Date(iso)
  if (!Number.isFinite(value.getTime())) return '—'
  return `${String(value.getHours()).padStart(2, '0')}:${String(value.getMinutes()).padStart(2, '0')}`
}
const localDate = (iso: string) => {
  const value = new Date(iso)
  return `${value.getFullYear()}-${String(value.getMonth() + 1).padStart(2, '0')}-${String(value.getDate()).padStart(2, '0')}`
}

export function payrollShadowAttendance(item: Pick<ApiPayrollItem, 'breakdown'>): PayrollShadowAttendance | null {
  try {
    const shadow = JSON.parse(item.breakdown || '{}').policyShadow
    if (!shadow || shadow.engineMode !== 'SHADOW' || shadow.paidResult !== 'LEGACY' || !Object.prototype.hasOwnProperty.call(STATUS, shadow.status)) return null
    return shadow as PayrollShadowAttendance
  } catch { return null }
}

/** وصف نافذة يوم العمل: الليلية تمتد لصباح اليوم التالي وتُنسب كلها ليوم البداية. */
export function shadowWindowLabel(day: ShadowDay) {
  if (!day.workdayWindow?.overnight) return 'دوام نهاري'
  const to = new Date(day.workdayWindow.to)
  return `ليلية: البصمات حتى ${localClock(day.workdayWindow.to)} صباح ${Number.isFinite(to.getTime()) ? localDate(day.workdayWindow.to) : 'اليوم التالي'} تُحتسب ليوم ${day.date}`
}

export function PayrollShadowAttendanceBreakdown({ item, currency, compact = false }: { item: Pick<ApiPayrollItem, 'breakdown'>; currency: string; compact?: boolean }) {
  const shadow = payrollShadowAttendance(item)
  if (!shadow) return null
  const status = STATUS[shadow.status]
  const unprovenCount = new Set((shadow.unprovenDays ?? []).flatMap(row => row.dates)).size
  const contents = <div className="text-right space-y-3">
    <p className="text-xs text-gray-600">المصروف هو الحساب القديم. محرك السياسة يُحسب بجانبه من المصادر المثبتة (وضع الظل) للتأخير ونقص الساعات والغياب.</p>
    <p className="text-xs text-gray-700">{shadow.message}</p>
    {shadow.totals?.policy && <div className="overflow-x-auto"><table className="w-full text-sm text-right">
      <thead><tr className="bg-gray-50 text-gray-600"><th className="p-2">البند</th><th className="p-2">الحساب القديم ({currency})</th><th className="p-2">محرك السياسة ({currency})</th></tr></thead>
      <tbody>{(['lateness', 'shortfall', 'absence'] as const).map(key => <tr key={key} className="border-t border-gray-100">
        <td className="p-2">{COMPONENT_NAMES[key]}</td><td className="p-2 font-mono">{exact(shadow.totals!.legacy[key]) ?? '—'}</td><td className="p-2 font-mono">{exact(shadow.totals!.policy![key]) ?? '—'}</td>
      </tr>)}</tbody>
    </table></div>}
    {!!shadow.days?.length && <div className="overflow-x-auto"><table className="w-full text-sm text-right">
      <thead><tr className="bg-gray-50 text-gray-600"><th className="p-2">يوم العمل</th><th className="p-2">النافذة</th><th className="p-2">البصمات</th><th className="p-2">تأخير / نقص (دقيقة)</th><th className="p-2">السياسة: تأخير / نقص / غياب</th><th className="p-2">القديم: تأخير / نقص / غياب</th><th className="p-2">التطابق</th></tr></thead>
      <tbody>{shadow.days.map(day => <tr key={day.date} className="border-t border-gray-100 align-top">
        <td className="p-2 whitespace-nowrap">{day.date}</td>
        <td className="p-2 text-xs">{shadowWindowLabel(day)}</td>
        <td className="p-2 font-mono whitespace-nowrap">{day.inputs.absent ? 'غياب' : `${localClock(day.firstIn)} ← ${localClock(day.lastOut)}`}
          {day.overnight && day.lastOut && localDate(day.lastOut) > day.date && <p className="text-[10px] text-purple-600 font-sans">الانصراف صباح اليوم التالي</p>}</td>
        <td className="p-2 font-mono">{day.inputs.unexcusedLateMinutes} / {day.inputs.shortfallMinutes}</td>
        <td className="p-2 font-mono">{day.policy.lateness} / {day.policy.shortfall} / {day.policy.absence}</td>
        <td className="p-2 font-mono">{day.legacy.lateness} / {day.legacy.shortfall} / {day.legacy.absence}</td>
        <td className="p-2">{day.matches ? <span className="badge badge-success">مطابق</span> : <span className="badge badge-warning">مختلف</span>}</td>
      </tr>)}</tbody>
    </table></div>}
    {!!shadow.differences?.length && <ul className="text-xs text-amber-800 list-disc pr-4">{shadow.differences.slice(0, 20).map((row, index) =>
      <li key={index}>{row.date ?? 'مجموع الفترة'} — {COMPONENT_NAMES[row.component]}: القديم {row.legacy ?? '—'} والسياسة {row.policy ?? 'غير محسوب'} ({row.reason})</li>)}</ul>}
    {unprovenCount > 0 && <p className="text-xs text-gray-500" title={(shadow.unprovenDays ?? []).map(row => row.code).join('، ')}>أيام غير مثبتة المصدر لمحرك السياسة: {unprovenCount} (التكافؤ عليها غير محسوم)</p>}
  </div>
  return compact
    ? <details className="text-right font-sans mt-2 min-w-40"><summary className="text-xs text-primary-700 cursor-pointer">ظل السياسة: <span className={status.className}>{status.label}</span></summary><div className="min-w-[640px] rounded-lg border p-3 my-2">{contents}</div></details>
    : <section className="border border-gray-200 rounded-xl p-4 mb-6 break-inside-avoid"><h3 className="font-bold text-gray-800 mb-3">محرك السياسة بوضع الظل <span className={status.className}>{status.label}</span></h3>{contents}</section>
}
