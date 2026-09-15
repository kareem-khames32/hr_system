'use client'

import type { ApiPayrollItem } from '@/lib/api'
import { savedFinancialExemptions, type ExemptionLine, type PayslipExemption } from '@/lib/financial-exemptions-api'
import { formatMoney } from '@/lib/money'

// تبسيط الرواتب (2026-09-15): كل خصم ملغى يظهر في القسيمة سطرًا واحدًا «أُلغي خصم <اسم البند> بمبلغ <المبلغ>»،
// بلا رقم الإعفاء ولا أساس المانح ولا البنود غير القابلة للإلغاء. التفصيل الكامل باقٍ محفوظًا في بند المسير.
// اسم البند هو اسمه المحفوظ بلا كلمة «خصم» في أوله وبلا ما يلي « — » (تاريخ اليوم أو رقم القيد).
const itemName = (line: ExemptionLine) => line.label.replace(/\s*—.*$/, '').replace(/^خصم\s+/, '').trim()

export function PayrollExemptionPayslipSection({ item, currency }: { item: ApiPayrollItem; currency: string; details: PayslipExemption[] | null }) {
  // الخصم الملغى فقط (الإسقاط)، لا التأجيل
  const lines = (savedFinancialExemptions(item)?.lines ?? []).filter(line => line.disposition === 'DROP' && Number(line.exemptedAmount) > 0)
  if (!lines.length) return null
  return (
    <section className="bg-success-50 border border-success-200 rounded-xl p-4 mb-6 text-sm text-success-800 space-y-1 break-inside-avoid" aria-label="الخصومات الملغاة">
      {lines.map((line, index) => (
        <p key={`${line.component}-${line.ref ?? 'all'}-${index}`}>أُلغي خصم {itemName(line)} بمبلغ {formatMoney(line.exemptedAmount)} {currency}</p>
      ))}
    </section>
  )
}
