'use client'

// الخطوة 7 / ALDD-11 (B5): الصفحة المؤقتة كانت تقول إن المسير لا يحسب البدلات، وهذا يناقض الحساب الفعلي.
// المسير يحسب بدلات السكن والانتقال والهاتف وطبيعة العمل والأخرى من راتب شهر المسير في «سجل الأجر المؤرخ»
// متناسبة مع أيام التغطية على أساس 30 يومًا، وتُحفظ لكل موظف في تفصيل البند. هذه الصفحة تعرضها كما حُسبت (قراءة فقط).
import { useEffect, useState } from 'react'
import Link from 'next/link'
import { Info, Wallet } from 'lucide-react'
import { MainLayout } from '@/components/layout'
import { fetchPayrollRun, fetchPayrollRuns, type ApiPayrollItem, type ApiPayrollRun } from '@/lib/api'
import { useCurrency } from '@/lib/currency'
import { formatMoney, formatMoneyOrDash, sumMoney } from '@/lib/money'
import { payrollCoverageText, payrollItemCoverage } from '@/lib/payroll-item-totals'

const ALLOWANCE_CODES = ['HOUSING', 'TRANSPORT', 'PHONE', 'WORK_NATURE', 'OTHER'] as const
const ALLOWANCE_LABELS: Record<typeof ALLOWANCE_CODES[number], string> = {
  HOUSING: 'بدل السكن', TRANSPORT: 'بدل الانتقال', PHONE: 'بدل الهاتف', WORK_NATURE: 'بدل طبيعة العمل', OTHER: 'بدلات أخرى',
}
const STATUS_LABELS: Record<string, string> = { DRAFT: 'مسودة', CALCULATED: 'محسوب', APPROVED: 'معتمد', PAID: 'مصروف', CANCELLED: 'ملغى' }

/** بدلات البند المستحقة كما حُفظت وقت الحساب؛ البند القديم بلا تفصيل يعرض مجموعه التاريخي فقط. */
function savedAllowances(item: Pick<ApiPayrollItem, 'breakdown' | 'allowances'>) {
  try {
    const components = JSON.parse(item.breakdown || '{}').salaryComponents
    if (!Array.isArray(components)) return null
    const earned = (code: string) => {
      const row = components.find((component: { code?: string }) => component?.code === code)
      return typeof row?.earnedAmount === 'number' && Number.isFinite(row.earnedAmount) ? row.earnedAmount : 0
    }
    const monthly = (code: string) => {
      const row = components.find((component: { code?: string }) => component?.code === code)
      return typeof row?.monthlyAmount === 'number' && Number.isFinite(row.monthlyAmount) ? row.monthlyAmount : 0
    }
    return ALLOWANCE_CODES.map(code => ({ code, earned: earned(code), monthly: monthly(code) }))
  } catch { return null }
}

export default function AllowancesPage() {
  const currency = useCurrency()
  const [runs, setRuns] = useState<ApiPayrollRun[]>([])
  const [runId, setRunId] = useState<number | null>(null)
  const [run, setRun] = useState<ApiPayrollRun | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  useEffect(() => {
    fetchPayrollRuns()
      .then(rows => {
        const usable = rows.filter(row => row.status !== 'DRAFT' && row.status !== 'CANCELLED')
        setRuns(usable)
        if (usable.length) setRunId(usable[0].id)
        else setLoading(false)
      })
      .catch(e => { setError(e instanceof Error ? e.message : 'تعذر تحميل المسيرات'); setLoading(false) })
  }, [])

  useEffect(() => {
    if (runId == null) return
    let cancelled = false
    setLoading(true)
    fetchPayrollRun(runId)
      .then(detail => { if (!cancelled) setRun(detail) })
      .catch(e => { if (!cancelled) setError(e instanceof Error ? e.message : 'تعذر تحميل بنود المسير') })
      .finally(() => { if (!cancelled) setLoading(false) })
    return () => { cancelled = true }
  }, [runId])

  const items = run?.items ?? []
  const nameOf = (employeeId: number) => run?.members?.find(member => member.employeeId === employeeId)?.snapshot?.fullName ?? `موظف #${employeeId}`
  const rows = items.map(item => ({ item, allowances: savedAllowances(item) }))
  const columnTotal = (code: typeof ALLOWANCE_CODES[number]) => sumMoney(rows.map(row => row.allowances?.find(entry => entry.code === code)?.earned ?? 0))

  return (
    <MainLayout>
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-gray-800">البدلات في المسير</h1>
            <p className="text-gray-500 mt-1">البدلات الثابتة المستحقة لكل موظف كما حُسبت في المسير المختار</p>
          </div>
          <div className="flex items-center gap-3">
            <Link href="/payroll/salary-history" className="btn-secondary text-sm">سجل الأجر المؤرخ</Link>
            <Link href="/payroll/bonuses" className="btn-secondary text-sm">المكافآت والإضافات</Link>
          </div>
        </div>

        <div className="card bg-blue-50 border border-blue-200">
          <div className="flex items-start gap-4">
            <div className="w-12 h-12 bg-blue-100 rounded-2xl flex items-center justify-center flex-shrink-0"><Info size={24} className="text-blue-600" /></div>
            <div className="text-sm text-blue-800 space-y-1">
              <h3 className="font-bold mb-1">من أين تأتي البدلات؟</h3>
              <p>المسير يحسب بدل السكن والانتقال والهاتف وطبيعة العمل والبدلات الأخرى من راتب شهر المسير في «سجل الأجر المؤرخ» (الزيادة تسري من شهر كامل بلا تقسيم).</p>
              <p>كل بدل يُستحق بنسبة أيام التغطية على أساس 30 يومًا (الموظف الجديد من تاريخ تعيينه)، ويدخل سعر يوم الغياب ضمن الأجر الشهري للمكونات الستة (D3).</p>
              <p>البدلات أو المكافآت لمرة واحدة تدخل المسير «إضافات أخرى» بعد اعتمادها من شاشة المكافآت. تعديل مبلغ بدل ثابت يتم من سجل الأجر، ويظهر هنا بعد إعادة حساب المسير.</p>
            </div>
          </div>
        </div>

        {error && <div className="bg-red-50 text-red-700 rounded-xl p-4">{error}</div>}

        <div className="card space-y-4">
          <div className="flex flex-wrap items-center gap-3">
            <Wallet size={20} className="text-primary-500" />
            <label htmlFor="allowances-run" className="font-medium text-gray-700">المسير:</label>
            <select id="allowances-run" className="input w-80" value={runId ?? ''} onChange={event => setRunId(Number(event.target.value))}>
              {runs.length === 0 && <option value="">لا توجد مسيرات محسوبة</option>}
              {runs.map(row => <option key={row.id} value={row.id}>{row.period} — {row.name ?? `مسير #${row.id}`} ({STATUS_LABELS[row.status] ?? row.status})</option>)}
            </select>
          </div>
          {loading ? (
            <div className="flex items-center justify-center py-12"><div className="w-8 h-8 border-2 border-primary-500 border-t-transparent rounded-full animate-spin" /></div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="table-header">
                    <th className="text-right px-4 py-3">الموظف</th>
                    {ALLOWANCE_CODES.map(code => <th key={code} className="text-center px-4 py-3">{ALLOWANCE_LABELS[code]}</th>)}
                    <th className="text-center px-4 py-3 bg-success-50">إجمالي البدلات المستحقة</th>
                  </tr>
                </thead>
                <tbody>
                  {rows.length === 0 && <tr><td colSpan={ALLOWANCE_CODES.length + 2} className="px-4 py-10 text-center text-sm text-gray-400">{run ? 'لا توجد بنود في هذا المسير' : 'اختر مسيرًا'}</td></tr>}
                  {rows.map(({ item, allowances }) => (
                    <tr key={item.id} className="table-row">
                      <td className="table-cell">
                        <p className="font-medium text-gray-800">{nameOf(item.employeeId)}</p>
                        {payrollCoverageText(payrollItemCoverage(item)) && <p className="text-xs text-gray-500">{payrollCoverageText(payrollItemCoverage(item))}</p>}
                      </td>
                      {ALLOWANCE_CODES.map(code => {
                        const entry = allowances?.find(row => row.code === code)
                        return <td key={code} className="table-cell text-center font-mono">
                          {allowances ? formatMoneyOrDash(entry?.earned) : '—'}
                          {entry && entry.monthly > 0 && entry.monthly !== entry.earned && <p className="text-xs text-gray-400 font-sans">شهريًا {formatMoney(entry.monthly)}</p>}
                        </td>
                      })}
                      <td className="table-cell text-center font-mono font-bold text-success-700 bg-success-50">
                        {formatMoney(item.allowances)}
                        {!allowances && <p className="text-xs text-gray-400 font-sans">بند سابق بلا تفصيل محفوظ</p>}
                      </td>
                    </tr>
                  ))}
                </tbody>
                {rows.length > 0 && <tfoot>
                  <tr className="bg-gray-100">
                    <td className="px-4 py-3 font-bold text-gray-800">الإجمالي ({currency})</td>
                    {ALLOWANCE_CODES.map(code => <td key={code} className="px-4 py-3 text-center font-mono font-bold">{formatMoney(columnTotal(code))}</td>)}
                    <td className="px-4 py-3 text-center font-mono font-bold text-success-700">{formatMoney(sumMoney(items.map(item => item.allowances)))}</td>
                  </tr>
                </tfoot>}
              </table>
            </div>
          )}
        </div>
      </div>
    </MainLayout>
  )
}
