'use client'

import { AlertTriangle, ShieldCheck } from 'lucide-react'
import { formatLoanMoney, type LoanCapEvaluation } from '@/lib/loans-api'

// القرار ب1: السقف سطر واحد — «المتاح لك الآن: كذا» والسبب لو كان هناك مانع.
// جدول القيود ورقم نسخة السياسة واسمها تفاصيل داخلية لا تُعرض؛ الخادم يبقى هو المرجع في الفحص.
export function LoanCapSummary({ cap, currency, title = 'المتاح لك الآن' }: { cap: LoanCapEvaluation; currency: string; title?: string }) {
  if (!cap.policy || cap.effectiveCap === null) {
    return (
      <div className="bg-gray-50 text-gray-600 rounded-xl p-3 text-sm flex items-center gap-2">
        <ShieldCheck size={16} />
        لا يوجد سقف على مبلغ السلفة حاليًا.
      </div>
    )
  }
  return (
    <div className="rounded-xl border border-gray-200 p-4 space-y-2 text-sm">
      <p className="text-gray-700">
        {title}: <span className="font-bold text-primary-600 font-mono text-lg">{formatLoanMoney(cap.effectiveCap)}</span> <span className="text-gray-500">{currency}</span>
      </p>
      {cap.governingLabel && <p className="text-gray-500">السبب: {cap.governingLabel}</p>}
      {cap.salary.note && <p className="text-amber-700">{cap.salary.note}</p>}
      {cap.violations.length > 0 && (
        <div role="alert" className="bg-red-50 text-red-700 rounded-lg p-3 space-y-1">
          {cap.violations.map(violation => (
            <p key={violation.code} className="flex items-start gap-2"><AlertTriangle size={14} className="mt-0.5 shrink-0" />{violation.message}</p>
          ))}
        </div>
      )}
    </div>
  )
}
