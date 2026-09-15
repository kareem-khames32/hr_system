'use client'

import type { ApiPayrollItem } from '../../lib/api'
import { LATENESS_TIER_MODE_LABELS, latenessTierEffects } from '../../lib/payroll-engine-api'
import { formatMoney } from '../../lib/money'

// الخطوة 21: أثر شريحة التأخير على القسيمة — كل يوم متأخر بمدى شريحته وطريقتها (كسر يوم أو مضاعف) والمعادلة والمبلغ، من نسخة الحساب المحفوظة.
// الخطوة 22 (B5): منسّق المبالغ الموحد (نفس جدول المسير والقسيمة)
const money = (amount: number) => formatMoney(amount)

export function PayrollLatenessTierBreakdown({ item, currency }: { item: Pick<ApiPayrollItem, 'breakdown'>; currency: string }) {
  const effects = latenessTierEffects(item.breakdown)
  if (!effects || !effects.rows.length) return null
  return <section className="rounded-xl border border-gray-200 p-4 space-y-3 mb-6 break-inside-avoid">
    <h3 className="font-bold text-gray-800">أثر شرائح التأخير</h3>
    <p className="text-sm text-gray-600">
      {effects.set?.setId ? `مجموعة الشرائح #${effects.set.setId} السارية من شهر ${effects.set.effectivePeriod} (من لقطة سياسة المسير)` : 'لا مجموعة شرائح لشهر المسير: التأخير يُخصم بالدقيقة'}.
      {' '}المبالغ بالـ{currency} قبل السقف اليومي وحماية الصافي.
    </p>
    <div className="overflow-x-auto"><table className="w-full text-sm whitespace-nowrap">
      <thead><tr className="table-header">
        {['اليوم', 'دقائق التأخير', 'الشريحة', 'الطريقة', 'المعادلة', 'مبلغ الشريحة'].map(label => <th key={label} className="p-2 text-center">{label}</th>)}
      </tr></thead>
      <tbody>{effects.rows.map(row => <tr key={row.date} className="border-t border-gray-100">
        <td className="p-2" dir="ltr">{row.date}</td>
        <td className="p-2 text-center font-mono">{row.trace.minutes}</td>
        <td className="p-2 text-center">{row.trace.matched ? `${row.trace.fromMinutes}–${row.trace.toMinutes ?? '∞'}${row.trace.label ? ` (${row.trace.label})` : ''}` : 'بلا شريحة مطابقة'}</td>
        <td className="p-2 text-center">{row.trace.mode === 'NO_MATCH_PER_MINUTE' ? 'بالدقيقة' : LATENESS_TIER_MODE_LABELS[row.trace.mode]}
          {row.trace.mode === 'MULTIPLIER' && <span className="font-mono"> × {Number(row.trace.value)}</span>}
          {row.trace.mode === 'FRACTION' && <span className="font-mono"> {Number(row.trace.value)} يوم</span>}</td>
        <td className="p-2 text-center text-xs">{row.trace.formula}</td>
        <td className="p-2 text-center font-mono">{money(row.trace.amount)}</td>
      </tr>)}</tbody>
    </table></div>
  </section>
}
