'use client'

// B1.14 (الراتب الحي): «مستحقك التقديري لحد امبارح» للموظف عن نفسه — ورا الميزة الفرعية payroll.live_employee_view (مقفولة افتراضيًا).
// الميزة مقفولة = مفيش نداء ولا بطاقة. الأرقام من الخادم زي ما هي، ومكتوب عليها إنها تقديرية.
import { useEffect, useState } from 'react'
import { Wallet } from 'lucide-react'
import { currencyLabel } from '@/lib/currency'
import { useFeatureEnabled } from '@/lib/modules'
import { formatMoney } from '@/lib/money'
import { fetchMyLiveSalary, type MyLiveSalary } from '@/lib/payroll-live-api'

export const MY_LIVE_SALARY_FEATURE = 'payroll.live_employee_view'

export function MyLiveSalaryCard() {
  const enabled = useFeatureEnabled(MY_LIVE_SALARY_FEATURE)
  const [data, setData] = useState<MyLiveSalary | null>(null)

  useEffect(() => {
    if (!enabled) { setData(null); return }
    let cancelled = false
    fetchMyLiveSalary().then(result => { if (!cancelled) setData(result) }).catch(() => undefined)
    return () => { cancelled = true }
  }, [enabled])

  if (!enabled || !data?.available || !data.summary) return null
  const summary = data.summary
  const lines: Array<[string, number, 'plus' | 'minus']> = [
    ['الإضافي المعتمد', summary.overtime, 'plus'], ['التأخير', summary.lateness, 'minus'], ['النقص والانصراف المبكر', summary.shortfall, 'minus'],
    ['الغياب', summary.absence, 'minus'], ['إجازة بدون راتب', summary.unpaidLeave, 'minus'], ['الإيقاف', summary.suspension, 'minus'],
  ]
  return (
    <div className="card p-6" data-my-live-salary>
      <div className="flex items-center gap-2 mb-1">
        <Wallet size={20} className="text-primary-500" />
        <h3 className="font-bold text-gray-800">مستحقك التقديري لحد امبارح</h3>
      </div>
      <p className="text-xs text-gray-400 mb-3">من {data.startDate} لحد {data.upTo} ({summary.days} يوم)</p>
      <p className="text-2xl font-bold text-gray-800" dir="ltr">{formatMoney(summary.estimatedNet)} <span className="text-sm font-normal text-gray-400">{currencyLabel(data.currency)}</span></p>
      <ul className="mt-3 space-y-1 text-sm">
        <li className="flex justify-between text-gray-600"><span>استحقاق الأيام</span><span dir="ltr">{formatMoney(summary.earned)}</span></li>
        {lines.filter(([, amount]) => amount > 0).map(([label, amount, sign]) => (
          <li key={label} className={`flex justify-between ${sign === 'minus' ? 'text-red-700' : 'text-success-700'}`}>
            <span>{label}</span><span dir="ltr">{sign === 'minus' ? '−' : '+'}{formatMoney(amount)}</span>
          </li>
        ))}
        {data.pendingOvertime > 0 && <li className="flex justify-between text-amber-700"><span>إضافي في انتظار اعتماد</span><span>{data.pendingOvertime}</span></li>}
      </ul>
      {!summary.complete && <p className="mt-2 text-xs text-amber-700">فيه أيام لسه بتتحسب؛ الرقم هيتحدّث.</p>}
      <p className="mt-3 text-xs text-gray-400">{data.note}</p>
    </div>
  )
}
