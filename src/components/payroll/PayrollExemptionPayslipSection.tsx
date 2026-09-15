'use client'

import type { ApiPayrollItem } from '@/lib/api'
import { EXEMPTION_DISPOSITION_LABELS, savedFinancialExemptions, type PayslipExemption } from '@/lib/financial-exemptions-api'
import { formatMoney } from '@/lib/money'

// الخطوة 26 (EX-04 وقبول الخطوة): البند المُعفى في القسيمة بالمبلغ الأصلي والمُعفى والمبلغ بعد الإعفاء ورقم الإعفاء وسببه،
// والمانح بالدور لا بالاسم، وتذييل «إجمالي المبالغ المُعفاة في هذا المسير». لا يوجد خيار لإخفاء البند المُعفى.
export function PayrollExemptionPayslipSection({ item, currency, details }: { item: ApiPayrollItem; currency: string; details: PayslipExemption[] | null }) {
  const saved = savedFinancialExemptions(item)
  if (!saved || !saved.lines.length) return null
  const byId = new Map((details ?? []).map(row => [row.id, row]))
  const exemptionIds = [...new Set(saved.lines.map(line => line.exemptionId))].sort((a, b) => a - b)
  return (
    <section className="border border-success-200 rounded-xl p-4 mb-6 break-inside-avoid" aria-label="الإعفاءات المالية">
      <h3 className="font-bold text-gray-800 mb-3">الإعفاءات المالية في هذا المسير ({currency})</h3>
      <div className="overflow-x-auto">
        <table className="w-full text-sm text-right">
          <thead>
            <tr className="bg-gray-50 text-gray-600">
              <th className="p-2">البند</th><th className="p-2">المبلغ الأصلي</th><th className="p-2">المُعفى</th><th className="p-2">بعد الإعفاء</th><th className="p-2">القرار</th>
            </tr>
          </thead>
          <tbody>
            {saved.lines.map((line, index) => (
              <tr key={`${line.exemptionId}-${line.component}-${line.ref ?? 'all'}-${index}`} className="border-t border-gray-100 align-top">
                <td className="p-2">{line.label}{line.note ? <p className="text-xs text-gray-500">{line.note}</p> : null}</td>
                <td className="p-2 font-mono">{formatMoney(line.originalAmount)}</td>
                <td className="p-2 font-mono text-success-700">{formatMoney(line.exemptedAmount)}</td>
                <td className="p-2 font-mono font-semibold">{formatMoney(line.afterAmount)}</td>
                <td className="p-2 text-xs">مُعفى (إعفاء #{line.exemptionId}) — {EXEMPTION_DISPOSITION_LABELS[line.disposition] ?? line.disposition}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <div className="mt-3 space-y-2 text-sm">
        {exemptionIds.map(id => {
          const row = byId.get(id)
          const amount = saved.totals.byExemption.find(entry => entry.exemptionId === id)?.amount ?? '0.00'
          return (
            <div key={id} className="bg-gray-50 rounded-lg p-3">
              <p className="font-medium text-gray-800">إعفاء #{id}{row ? ` — ${row.targetLabel} — ${row.statusLabel}` : ''} — المبلغ المُعفى {formatMoney(amount)}</p>
              {row && <p className="text-xs text-gray-600">المانح: {row.grantorBasisLabel} · تاريخ المنح {String(row.grantedAt).slice(0, 10)}{row.approvedAt ? ` · اعتُمد ${String(row.approvedAt).slice(0, 10)}` : ''} · المصير: {row.dispositionLabel}</p>}
              {row && <p className="text-xs text-gray-700 whitespace-pre-wrap">السبب: {row.reason}</p>}
            </div>
          )
        })}
      </div>
      {saved.protectedItems.length > 0 && (
        <div className="mt-3 text-xs text-gray-600">
          <p className="font-medium">بنود غير قابلة للإعفاء بقيت كما هي:</p>
          <ul className="list-disc pr-5">
            {saved.protectedItems.map((row, index) => <li key={index}>{row.label} — {formatMoney(row.amount)}: {row.reason}</li>)}
          </ul>
        </div>
      )}
      <p className="mt-3 font-bold text-gray-800">إجمالي المبالغ المُعفاة في هذا المسير: {formatMoney(saved.totals.exempted)} {currency}</p>
      <p className="text-xs text-gray-500">المبلغ المُعفى لا يدخل في إجمالي الخصومات؛ أقساط السلف المشمولة تُؤجل للشهر التالي ولا يُسقط الدين.</p>
    </section>
  )
}
