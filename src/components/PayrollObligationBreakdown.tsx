'use client'

import { useState } from 'react'
import Link from 'next/link'
import { can, type ApiPayrollItem } from '@/lib/api'
import { fetchPayslipObligations, formatDeductionMoney, type PayrollObligationDetail } from '@/lib/deductions-api'

// تتبع «الخصومات الأخرى» سطرًا سطرًا (قرار المالك: الخصم يُتتبع في الطلب والمسير والقسيمة):
// لكل بند محفوظ مع المسير نوعه وسببه وطلبه وسعر اليوم/الساعة المستخدم، والمحصل والمرحّل بعد حماية الصافي.
type Line = { id: number; type: 'DEBIT' | 'CREDIT'; amount: number; collected: number; carried: number; typed: boolean }

function savedLines(item: ApiPayrollItem): { lines: Line[] } | null {
  try {
    const breakdown = JSON.parse(item.breakdown || '{}')
    return { lines: Array.isArray(breakdown.obligationLines) ? breakdown.obligationLines as Line[] : [] }
  } catch { return null }
}

export function PayrollObligationBreakdown({ item, currency, details, compact = false }: {
  item: ApiPayrollItem; currency: string; details?: PayrollObligationDetail[] | null; compact?: boolean
}) {
  const [loaded, setLoaded] = useState<PayrollObligationDetail[] | null>(details ?? null)
  const [error, setError] = useState('')
  const saved = savedLines(item)
  if (!saved) return <p className="text-xs text-amber-700 my-2">تفصيل الخصومات المحفوظ غير صالح؛ راجع المسير قبل اعتماده.</p>
  const rows = details ?? loaded
  if (!saved.lines.length && !(rows?.length)) return null
  const requestLink = (requestId: number) => can('deductions.view') ? `/payroll/deductions?request=${requestId}` : '/my/deductions'
  const content = <>
    {!rows ? (
      <p className="text-xs text-gray-500">{error || 'جارٍ تحميل التفاصيل…'}</p>
    ) : (
      <div className="overflow-x-auto">
        <table className="w-full text-sm text-right">
          <thead><tr className="bg-gray-50 text-gray-600">
            <th className="p-2">البند</th><th className="p-2">النوع والسبب</th><th className="p-2">الحساب</th>
            <th className="p-2">المستحق</th><th className="p-2">المحصل</th><th className="p-2">المرحّل</th>
          </tr></thead>
          <tbody>
            {rows.map(row => (
              <tr key={row.obligationId} className="border-t border-gray-100 align-top">
                <td className="p-2 whitespace-nowrap">{row.type === 'CREDIT' ? 'إضافة' : 'خصم'}<p className="text-xs text-gray-500">{row.categoryLabel}</p>
                  {row.carriedFromObligationId ? <p className="text-xs text-gray-400">مرحّل من شهر سابق</p> : null}</td>
                <td className="p-2">
                  {row.deduction ? <>
                    <p className="font-medium text-gray-800">{row.deduction.reversal ? 'عكس ' : ''}{row.deduction.typeName ?? 'خصم مصنف'}
                      {row.deduction.installmentNo ? <span className="text-xs text-gray-500"> (قسط {row.deduction.installmentNo}/{row.deduction.installments})</span> : null}</p>
                    <p className="text-xs text-gray-600 whitespace-pre-wrap">{row.deduction.reason}</p>
                    <Link href={requestLink(row.deduction.requestId)} className="text-xs text-primary-700 underline">طلب الخصم</Link>
                  </> : row.bonus ? <>
                    <p className="font-medium text-gray-800">{row.bonus.reversal ? 'استرداد ' : ''}{row.bonus.typeName ?? 'مكافأة'}</p>
                    <p className="text-xs text-gray-600 whitespace-pre-wrap">{row.bonus.reason}</p>
                    <Link href={can('bonuses.view') ? `/payroll/bonuses?request=${row.bonus.requestId}` : '/my/bonuses'} className="text-xs text-primary-700 underline">طلب المكافأة</Link>
                  </> : <p className="text-gray-700">{row.label ?? '—'}</p>}
                </td>
                <td className="p-2 text-xs text-gray-600" dir="ltr">
                  {row.deduction?.units && row.deduction.rate ? `${row.deduction.units} × ${formatDeductionMoney(row.deduction.rate)}` : row.deduction?.formula ?? row.bonus?.formula ?? '—'}
                  {row.deduction?.units && row.deduction.rate ? <p dir="rtl" className="text-gray-400">{row.deduction.calcMethodLabel} — سعر الوحدة المستخدم</p> : null}
                </td>
                <td className="p-2 font-mono">{formatDeductionMoney(row.amount)}</td>
                <td className="p-2 font-mono font-semibold">{formatDeductionMoney(row.collected)}</td>
                <td className="p-2 font-mono">{formatDeductionMoney(row.carried)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    )}
    <p className="text-xs text-gray-500 mt-2">الخصومات والإضافات تُحجز عند اعتماد المسير وتُستهلك عند الصرف؛ المرحّل ينتقل للمسير التالي عند الصرف.</p>
  </>
  if (compact) {
    return (
      <details className="text-right font-sans mt-2 min-w-40" onToggle={event => {
        if ((event.currentTarget as HTMLDetailsElement).open && !rows) {
          fetchPayslipObligations(item.id).then(setLoaded).catch(err => setError(err instanceof Error ? err.message : 'تعذر تحميل التفاصيل'))
        }
      }}>
        <summary className="text-xs text-primary-700 cursor-pointer">تفاصيل الخصومات والإضافات الأخرى</summary>
        <div className="min-w-[640px] rounded-lg border p-3 my-2">{content}</div>
      </details>
    )
  }
  return <section className="border border-gray-200 rounded-xl p-4 mb-6 break-inside-avoid"><h3 className="font-bold text-gray-800 mb-3">تفصيل الخصومات والإضافات الأخرى ({currency})</h3>{content}</section>
}
