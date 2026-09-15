'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { MainLayout } from '@/components/layout'
import { AlertTriangle, Download, History } from 'lucide-react'
import { fetchAllRequests, fetchEmployees, type ApiEmployee, type ApiRequest } from '@/lib/api'
import { useCurrency } from '@/lib/currency'
import { downloadCsv, csvDateStamp } from '@/lib/csv'
import { formatMoney } from '@/lib/money'
import { BonusesWorkspace } from '@/components/payroll/BonusesWorkspace'

// C4 / الخطوة 27: شاشة المكافآت على موديول المكافآت (EX-05) — الاقتراح للموظف المختار نفسه، لا مكافأة للنفس،
// المدير يقترح لمرؤوسيه، فترة مسير مستهدفة، والحالة «معتمد — بانتظار الصرف» حتى يستهلك مسير مصروف القيد.
// طلبات BONUS القديمة من محرك الطلبات تُعرض للاطلاع فقط بتسميات صحيحة (الإنشاء الجديد عبرها مقفول).
const legacyStatus: Record<string, { label: string; className: string }> = {
  DRAFT: { label: 'مسودة', className: 'bg-gray-100 text-gray-600' },
  SUBMITTED: { label: 'مُقدَّم', className: 'bg-warning-100 text-warning-700' },
  UNDER_REVIEW: { label: 'قيد المراجعة', className: 'bg-warning-100 text-warning-700' },
  RETURNED_FOR_INFO: { label: 'معاد للاستكمال', className: 'bg-orange-100 text-orange-700' },
  APPROVED: { label: 'معتمد — قيد التنفيذ', className: 'bg-primary-100 text-primary-700' },
  IN_EXECUTION: { label: 'قيد التنفيذ', className: 'bg-indigo-100 text-indigo-700' },
  // COMPLETED يعني قُيّد في الدفتر فقط؛ الصرف يتبع المسير المصروف
  COMPLETED: { label: 'معتمد — قُيّد في الدفتر بانتظار الصرف', className: 'bg-primary-100 text-primary-700' },
  REJECTED: { label: 'مرفوض', className: 'bg-red-100 text-red-700' },
  CANCELLED: { label: 'ملغى', className: 'bg-gray-100 text-gray-600' },
}
const legacyMeta = (status: string) => legacyStatus[status] ?? { label: status, className: 'bg-gray-100 text-gray-600' }
const parsePayload = (raw?: string): { amount?: number; reason?: string; employeeId?: number } => {
  if (!raw) return {}
  try { return JSON.parse(raw) } catch { return {} }
}
// FE-06: المنسّق الواحد بتقريبه (لا toFixed الثنائي الذي يعطي 1.005 ← 1.00)
const amountText = (value: unknown) => value !== null && value !== '' && Number.isFinite(Number(value)) ? formatMoney(value) : '—'

export default function BonusesPage() {
  const currency = useCurrency()
  const [legacy, setLegacy] = useState<ApiRequest[]>([])
  const [employees, setEmployees] = useState<Map<number, ApiEmployee>>(new Map())
  const [legacyError, setLegacyError] = useState('')
  // رابط القسيمة ?request=ID يفتح طلب المكافأة مباشرة
  const [focusRequestId, setFocusRequestId] = useState<number | null>(null)
  useEffect(() => {
    const id = Number(new URLSearchParams(window.location.search).get('request'))
    if (Number.isSafeInteger(id) && id > 0) setFocusRequestId(id)
  }, [])

  useEffect(() => {
    Promise.all([fetchAllRequests({ typeCode: 'BONUS' }), fetchEmployees()])
      .then(([requests, emps]) => { setLegacy(requests); setEmployees(new Map(emps.map(emp => [emp.id, emp]))) })
      .catch(e => setLegacyError(e instanceof Error ? e.message : 'تعذر تحميل طلبات المكافآت القديمة'))
  }, [])

  const beneficiary = (req: ApiRequest) => {
    const payload = parsePayload(req.payload)
    const target = payload.employeeId ? employees.get(Number(payload.employeeId)) : employees.get(req.requesterId)
    return target?.fullName ?? `موظف #${payload.employeeId ?? req.requesterId}`
  }
  const exportLegacy = () => downloadCsv(`bonuses-legacy-${csvDateStamp()}.csv`,
    ['رقم الطلب', 'مقدم الطلب', 'المستفيد المقيد', 'السبب', 'المبلغ', 'التاريخ', 'الحالة'],
    legacy.map(req => {
      const payload = parsePayload(req.payload)
      return [req.id, employees.get(req.requesterId)?.fullName ?? `موظف #${req.requesterId}`, beneficiary(req), payload.reason ?? '',
        Number(payload.amount ?? 0).toFixed(2), (req.createdAt ?? '').slice(0, 10), legacyMeta(req.status).label]
    }))

  return (
    <MainLayout>
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-gray-800">المكافآت</h1>
            <p className="text-gray-500 mt-1">اقتراح مكافأة لموظف أو مجموعة أو فريق أو قسم أو فرع بمعاينة واستبعاد، واعتمادها، وصرفها في شهر مسيرها المستهدف</p>
          </div>
          <Link href="/payroll" className="btn-secondary">العودة للرواتب</Link>
        </div>

        <BonusesWorkspace currency={currency} mode="admin" focusRequestId={focusRequestId} />

        {(legacy.length > 0 || legacyError) && (
          <div className="card space-y-3">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <h3 className="font-bold text-gray-800 flex items-center gap-2"><History size={20} className="text-gray-500" />طلبات المكافآت القديمة من محرك الطلبات ({legacy.length})</h3>
              <button type="button" onClick={exportLegacy} disabled={legacy.length === 0} className="btn-secondary flex items-center gap-2 disabled:opacity-50"><Download size={16} />تصدير CSV</button>
            </div>
            <p className="text-sm text-gray-500">للاطلاع فقط: اقتراح مكافأة جديدة عبر محرك الطلبات مقفول ويمر من القسم أعلاه. قيد هذه الطلبات في الدفتر أُسند لشهر مسير تاريخ اعتمادها.</p>
            {legacyError && <div className="bg-red-50 text-red-700 rounded-xl p-3 text-sm flex items-center gap-2"><AlertTriangle size={16} />{legacyError}</div>}
            {legacy.length > 0 && (
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead>
                    <tr className="table-header">
                      <th className="text-right px-4 py-3">#</th>
                      <th className="text-right px-4 py-3">مقدم الطلب</th>
                      <th className="text-right px-4 py-3">المستفيد المقيد</th>
                      <th className="text-right px-4 py-3">السبب</th>
                      <th className="text-center px-4 py-3">المبلغ ({currency})</th>
                      <th className="text-center px-4 py-3">التاريخ</th>
                      <th className="text-center px-4 py-3">الحالة</th>
                    </tr>
                  </thead>
                  <tbody>
                    {legacy.map(req => {
                      const payload = parsePayload(req.payload)
                      const meta = legacyMeta(req.status)
                      return (
                        <tr key={req.id} className="table-row">
                          <td className="table-cell font-mono text-xs">{req.id}</td>
                          <td className="table-cell">{employees.get(req.requesterId)?.fullName ?? `موظف #${req.requesterId}`}</td>
                          <td className="table-cell">{beneficiary(req)}</td>
                          <td className="table-cell text-gray-600">{payload.reason ?? '—'}</td>
                          <td className="table-cell text-center font-mono text-success-700">{amountText(payload.amount)}</td>
                          <td className="table-cell text-center text-gray-500" dir="ltr">{(req.createdAt ?? '').slice(0, 10)}</td>
                          <td className="table-cell text-center"><span className={`px-2 py-0.5 rounded-full text-xs ${meta.className}`}>{meta.label}</span></td>
                        </tr>
                      )
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        )}
      </div>
    </MainLayout>
  )
}
