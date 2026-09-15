import type { ApiPayrollItem } from '@/lib/api'
import { formatMoney } from '../lib/money'

type Line = { installmentRef: string; loanRef: string; originalDuePeriod: string; eligible: boolean;
  dueAmount: string; deductedAmount: string; remainingAmount: string; outcome: string;
  continuation: { duePeriod: string } | null }
const labels: Record<string, string> = { DEDUCTED: 'خصم كامل', PARTIAL: 'خصم جزئي', CARRIED_NO_CAPACITY: 'ترحيل لعدم وجود متاح',
  SKIPPED_AND_EXTENDED: 'تأجيل كامل ومد الجدول', DEFERRED_MANUAL: 'تأجيل بطلب معتمد' }
// الخطوة 22 (B5): منسّق المبالغ الموحد — كان يطلع أرقامًا مخلوطة مثل ١٬٥٠٠.50
const money = (value: string) => formatMoney(value)

export function PayrollInstallmentBreakdown({ item, currency, compact = false }: { item: ApiPayrollItem; currency: string; compact?: boolean }) {
  let plan: any
  try { plan = JSON.parse(item.breakdown || '{}').installmentPlan } catch { return null }
  if (plan == null) return null
  const validMoney = (value: unknown) => typeof value === 'string' && /^\d+\.\d{2}$/.test(value)
  if (plan.version !== 'LOAN_ALLOCATION_V1_20260913' || !Array.isArray(plan.allocation?.lines) ||
      !validMoney(plan.budget?.availableBudget) || plan.allocation.lines.some((row: Line) => !row ||
        ![row.dueAmount, row.deductedAmount, row.remainingAmount].every(validMoney))) {
    return <p className="text-xs text-amber-700 my-2">تفصيل الأقساط غير مكتمل؛ راجع المسير قبل اعتماده.</p>
  }
  const rows = (plan.allocation.lines as Line[]).filter(row => row.eligible)
  const excluded = Array.isArray(plan.excludedClaimedIds) ? plan.excludedClaimedIds.length : 0
  if (!rows.length && !excluded) return null
  const content = <>
    <p className="text-xs text-gray-600 mb-3">المتاح للسلف بعد الخصومات السابقة وحماية الصافي: {money(plan.budget.availableBudget)} {currency}.
      {' '}{plan.policy?.mode === 'SKIP_AND_EXTEND' ? 'عند النقص: تأجيل القسط كاملًا ومد الجدول.' : 'عند النقص: خصم المتاح وترحيل الباقي للشهر التالي.'}</p>
    {excluded > 0 && <p className="text-xs text-amber-700 mb-3">استُبعد {excluded} قسطًا لوجود حجز سابق في مسير معتمد أو تصفية.</p>}
    {rows.length > 0 && <div className="overflow-x-auto"><table className="w-full text-sm text-right">
      <thead><tr className="bg-gray-50 text-gray-600"><th className="p-2">السلفة / القسط</th><th className="p-2">أصل الاستحقاق</th>
        <th className="p-2">المستحق</th><th className="p-2">خصم المسير</th><th className="p-2">المرحّل</th><th className="p-2">الإجراء</th></tr></thead>
      <tbody>{rows.map(row => <tr key={row.installmentRef} className="border-t border-gray-100 align-top">
        <td className="p-2">#{row.loanRef} / #{row.installmentRef}</td><td className="p-2">{row.originalDuePeriod}</td>
        <td className="p-2">{money(row.dueAmount)}</td><td className="p-2 font-semibold">{money(row.deductedAmount)}</td>
        <td className="p-2">{money(row.remainingAmount)}{row.continuation && <p className="text-xs text-gray-500">إلى {row.continuation.duePeriod}</p>}</td>
        <td className="p-2">{labels[row.outcome] ?? 'يحتاج مراجعة'}</td>
      </tr>)}</tbody>
    </table></div>}
    <p className="text-xs text-gray-500 mt-2">هذه خطة الأقساط المحفوظة مع المسير. تُحجز عند الاعتماد، ويُثبت الخصم والترحيل عند الصرف.</p>
  </>
  return compact ? <details className="text-right font-sans mt-2 min-w-40"><summary className="text-xs text-primary-700 cursor-pointer">تفاصيل أقساط السلف</summary>
    <div className="min-w-[560px] rounded-lg border p-3 my-2">{content}</div></details>
    : <section className="border border-gray-200 rounded-xl p-4 mb-6 break-inside-avoid"><h3 className="font-bold text-gray-800 mb-3">تفصيل أقساط السلف ({currency})</h3>{content}</section>
}
