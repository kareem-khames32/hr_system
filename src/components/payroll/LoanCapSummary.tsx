'use client'

import { AlertTriangle, ShieldCheck } from 'lucide-react'
import { formatLoanMoney, type LoanCapEvaluation } from '@/lib/loans-api'

// AD-02/04/05/06: السقف الفعّال ومصدره والمتبقي من الحدود الشهرية والمديونية — يظهر قبل التقديم وللمعتمد.
export function LoanCapSummary({ cap, currency, title = 'السقف الفعّال' }: { cap: LoanCapEvaluation; currency: string; title?: string }) {
  if (!cap.policy) {
    return (
      <div className="bg-gray-50 text-gray-600 rounded-xl p-3 text-sm flex items-center gap-2">
        <ShieldCheck size={16} />
        لا توجد سياسة سقوف سارية على هذا الموظف اليوم؛ لا يُطبق سقف على المبلغ.
      </div>
    )
  }
  return (
    <div className="rounded-xl border border-gray-200 p-4 space-y-3 text-sm">
      <div className="flex items-center justify-between gap-2 flex-wrap">
        <span className="font-medium text-gray-700">{title}</span>
        <span className="badge badge-primary">{cap.policy.name} — نسخة {cap.policy.version}</span>
      </div>
      <p className="text-2xl font-bold text-primary-600 font-mono">
        {cap.effectiveCap === null ? 'بلا سقف مبلغ' : formatLoanMoney(cap.effectiveCap)}
        {cap.effectiveCap !== null && <span className="text-sm text-gray-500 font-sans"> {currency}</span>}
      </p>
      {cap.governingLabel && <p className="text-gray-600">القيد الحاكم: <span className="font-medium">{cap.governingLabel}</span></p>}
      {cap.components.length > 0 && (
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="table-header">
                <th className="text-right px-3 py-2">القيد</th>
                <th className="text-center px-3 py-2">الحد</th>
                <th className="text-center px-3 py-2">المستهلك</th>
                <th className="text-center px-3 py-2">المتاح</th>
              </tr>
            </thead>
            <tbody>
              {cap.components.map(component => (
                <tr key={component.code} className={`table-row ${component.code === cap.governing ? 'bg-primary-50' : ''}`}>
                  <td className="table-cell">{component.label}</td>
                  <td className="table-cell text-center font-mono">{formatLoanMoney(component.limit)}</td>
                  <td className="table-cell text-center font-mono">{component.used === null ? '—' : formatLoanMoney(component.used)}</td>
                  <td className="table-cell text-center font-mono font-bold">{formatLoanMoney(component.available)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
      <p className="text-gray-600">
        المديونية القائمة: <span className="font-mono">{formatLoanMoney(cap.outstanding)}</span> · طلبات الفترة ({cap.window.from} ← {cap.window.to}):{' '}
        {cap.usage.requests}{cap.usage.maxRequests !== null ? ` من ${cap.usage.maxRequests} (المتبقي ${cap.usage.remainingRequests})` : ''} · يُعاد العداد في {cap.window.resetsOn}
      </p>
      {cap.maxInstallmentMonths !== null && <p className="text-gray-600">أقصى عدد أشهر للتقسيط: {cap.maxInstallmentMonths}</p>}
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
