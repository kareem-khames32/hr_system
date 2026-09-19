'use client'
import { useParams } from 'next/navigation'

import { useEffect, useState } from 'react'
import { MainLayout } from '@/components/layout'
import Link from 'next/link'
import {
  ArrowRight,
  Printer,
  MapPin,
  CreditCard,
  AlertTriangle,
} from 'lucide-react'
import {
  fetchPayslip,
  fetchBranches,
  type ApiPayrollItem,
  type ApiPayrollRun,
  type ApiEmployee,
  type ApiBranch,
} from '@/lib/api'
import { useCurrency } from '@/lib/currency'
import { PayrollAttendanceBreakdown } from '@/components/PayrollAttendanceBreakdown'
import { PayrollOvertimeBreakdown } from '@/components/PayrollOvertimeBreakdown'
import { PayrollInstallmentBreakdown } from '@/components/PayrollInstallmentBreakdown'
import { PayrollObligationBreakdown } from '@/components/PayrollObligationBreakdown'
import { PayrollLatenessTierBreakdown } from '@/components/payroll/PayrollLatenessTierBreakdown'
// تبسيط الرواتب (2026-09-15): الخصم الملغى يظهر سطرًا واحدًا «أُلغي خصم كذا بمبلغ كذا» بلا رقم القرار
import { PayrollExemptionPayslipSection } from '@/components/payroll/PayrollExemptionPayslipSection'
import { savedFinancialExemptions, type ExemptionComponent, type PayslipExemption } from '@/lib/financial-exemptions-api'
import type { PayrollObligationDetail } from '@/lib/deductions-api'
// الخطوة 22 (B5): منسّق المبالغ الموحد (نفس جدول المسير)، والتغطية والمعامل، وقيد الصرف
import { formatMoney, formatMoneyOrDash } from '@/lib/money'
import { payrollCoverageText, payrollItemCoverage } from '@/lib/payroll-item-totals'
import { PAY_CHANNEL_LABELS, type PayrollPayChannel, type PayrollRunScreenFields } from '@/lib/payroll-runs-api'
// طلب المالك 19 سبتمبر: الاستحقاقات والاستقطاعات بندًا بندًا بأسمائها من الخادم (نفس جدول المسير وتصديره)
import { PAYROLL_LINE_GROUP_LABELS, PAYROLL_LINE_TOTAL_LABELS, payrollItemColumnLines, type PayrollItemLines } from '@/lib/payroll-lines-api'

// سطر الخصم اللي عليه ملاحظة الإلغاء («الأصل قبل الإلغاء — أُلغي منه»): التأخير، والنقص بنوعيه، والغياب، والخصومات المسجلة كلها نوع واحد، والسلف
const exemptionComponentOf = (key: string): ExemptionComponent | undefined =>
  key === 'LATENESS' ? 'LATENESS' : key === 'SHORTFALL' || key === 'EARLY_LEAVE' ? 'SHORTFALL' : key === 'ABSENCE' ? 'ABSENCE'
    : key === 'LOAN' ? 'LOAN' : key.startsWith('TYPED:') ? 'TYPED' : undefined
// خصم اتلغى بالكامل ما بيطلعش بند؛ سطره يفضل ظاهر بصفر عشان يقول إنه اتلغى
const EXEMPTION_LINE_NAMES: Array<[ExemptionComponent, string]> = [['LATENESS', 'التأخير'], ['SHORTFALL', 'نقص الساعات'], ['ABSENCE', 'الغياب'], ['TYPED', 'الخصومات المسجلة'], ['LOAN', 'السلف']]

const runStatusLabels: Record<string, string> = {
  CALCULATED: 'محسوب',
  APPROVED: 'معتمد',
  PAID: 'مدفوع',
}

const payMethodLabels: Record<string, string> = {
  transfer: 'تحويل بنكي',
  cash: 'نقدي',
  mixed: 'نقدي + بنك',
  cheque: 'شيك',
  visa: 'فيزا',
}

function numberToArabicWords(num: number, currency: string): string {
  // Simplified version - in real app would be more comprehensive
  const ones = ['', 'واحد', 'اثنان', 'ثلاثة', 'أربعة', 'خمسة', 'ستة', 'سبعة', 'ثمانية', 'تسعة']
  const tens = ['', 'عشرة', 'عشرون', 'ثلاثون', 'أربعون', 'خمسون', 'ستون', 'سبعون', 'ثمانون', 'تسعون']
  const hundreds = ['', 'مائة', 'مائتان', 'ثلاثمائة', 'أربعمائة', 'خمسمائة', 'ستمائة', 'سبعمائة', 'ثمانمائة', 'تسعمائة']
  const thousands = ['', 'ألف', 'ألفان', 'ثلاثة آلاف', 'أربعة آلاف', 'خمسة آلاف', 'ستة آلاف', 'سبعة آلاف', 'ثمانية آلاف', 'تسعة آلاف']

  if (num === 0) return 'صفر'

  const intPart = Math.floor(num)
  const decPart = Math.round((num - intPart) * 100)

  let result = ''

  // Thousands
  const th = Math.floor(intPart / 1000)
  if (th > 0 && th < 10) result += thousands[th] + ' '
  else if (th >= 10) result += `${th} ألف `

  // Hundreds
  const h = Math.floor((intPart % 1000) / 100)
  if (h > 0) result += hundreds[h] + ' '

  // Tens and Ones
  const t = Math.floor((intPart % 100) / 10)
  const o = intPart % 10

  if (t > 0 || o > 0) {
    if (result) result += 'و'
    if (t === 1) {
      if (o === 0) result += 'عشرة'
      else result += ones[o] + ' عشر'
    } else {
      if (o > 0) result += ones[o]
      if (t > 0) result += (o > 0 ? ' و' : '') + tens[t]
    }
  }

  result += ` ${currency}`

  if (decPart > 0) {
    result += ` و${decPart} من المئة`
  }

  return result + ' فقط لا غير'
}

export default function PayslipPage() {
  const params = useParams<{ id: string }>()
  const currency = useCurrency()
  const [item, setItem] = useState<ApiPayrollItem | null>(null)
  const [run, setRun] = useState<ApiPayrollRun | null>(null)
  const [employee, setEmployee] = useState<ApiEmployee | null>(null)
  const [branch, setBranch] = useState<ApiBranch | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  // تتبع كل قيد دفتر (الخصم المصنف بنوعه وسببه وطلبه وسعر اليوم) كما يعيده الخادم مع القسيمة
  const [obligationDetails, setObligationDetails] = useState<PayrollObligationDetail[] | null>(null)
  const [financialExemptions, setFinancialExemptions] = useState<PayslipExemption[] | null>(null)
  // بنود الاستحقاقات والاستقطاعات بأسمائها (سكن، انتقال، الإضافي، بدل العطلات، كل بدل ونوع خصم، الإيقاف والمرضية…) من الخادم
  const [lines, setLines] = useState<PayrollItemLines | null>(null)

  useEffect(() => {
    setLoading(true)
    Promise.all([fetchPayslip(Number(params.id)), fetchBranches().catch(() => [] as ApiBranch[])])
      .then(([data, branches]) => {
        setObligationDetails((data as { obligationDetails?: PayrollObligationDetail[] }).obligationDetails ?? [])
        setFinancialExemptions((data as { financialExemptions?: PayslipExemption[] }).financialExemptions ?? [])
        setLines((data as { lines?: PayrollItemLines }).lines ?? null)
        setItem(data.item)
        setRun(data.run)
        setEmployee(data.employee)
        setBranch(branches.find((b) => b.id === data.run.branchId) ?? null)
      })
      .catch((e) => setError(e instanceof Error ? e.message : 'تعذر تحميل قسيمة الراتب'))
      .finally(() => setLoading(false))
  }, [params.id])

  // طلب المالك 19 سبتمبر: كل استحقاق واستقطاع سطر باسمه كما قسمه الخادم (نفس جدول المسير وتصديره)، والمجاميع = أعمدة البند المحفوظة.
  // لو الخادم ما رجعش البنود (نسخة أقدم) تظهر أعمدة البند نفسها سطور عامة بنفس المجاميع.
  const itemLines: PayrollItemLines | null = item ? lines ?? payrollItemColumnLines(item) : null
  const earnings = (itemLines?.earnings ?? []).map(line => ({ name: line.name, amount: line.amount }))
  // القرار د: سطر الخصم نفسه يقول إنه أُلغي — المبلغ الملغى (والأصل قبله لخصومات الحضور) بجانب البند،
  // والسطر المختصر أسفل القسيمة يبقى كما هو. بلا رقم قرار ولا مصطلحات.
  const savedExemptions = item ? savedFinancialExemptions(item) : null
  const deductions: Array<{ name: string; amount: number; component?: ExemptionComponent }> = []
  const notedComponents = new Set<ExemptionComponent>()
  for (const line of itemLines?.deductions ?? []) {
    // ملاحظة الإلغاء مرة واحدة لكل نوع (الخصومات المسجلة كلها نوع واحد في قرار الإلغاء)
    const component = exemptionComponentOf(line.key)
    deductions.push({ name: line.name, amount: line.amount, component: component && !notedComponents.has(component) ? component : undefined })
    if (component) notedComponents.add(component)
  }
  for (const [component, name] of EXEMPTION_LINE_NAMES) {
    if (!notedComponents.has(component) && savedExemptions?.totals.byComponent[component]) deductions.push({ name, amount: 0, component })
  }
  const exemptionNote = (component?: ExemptionComponent) => {
    const total = component ? savedExemptions?.totals.byComponent[component] : undefined
    if (!component || !savedExemptions || !total) return null
    const requested = component === 'LATENESS' ? savedExemptions.requested.lateness : component === 'SHORTFALL' ? savedExemptions.requested.shortfall : component === 'ABSENCE' ? savedExemptions.requested.absence : null
    return `${requested ? `الأصل قبل الإلغاء ${formatMoney(requested)} — ` : ''}أُلغي منه ${formatMoney(total.exempted)}`
  }

  const totalEarnings = itemLines?.totals.earnings ?? 0
  const totalDeductions = itemLines?.totals.deductions ?? 0
  const paidRun = run as (ApiPayrollRun & PayrollRunScreenFields) | null
  const netSalary = item ? Number(item.netPay) : 0
  const attendanceNotes = (() => {
    try {
      const detail = item?.breakdown ? JSON.parse(item.breakdown) : {}
      const windows = Array.isArray(detail.attendanceExemptions) ? detail.attendanceExemptions : []
      const notes = windows.map((window: { effectiveFrom: string; effectiveTo: string | null }) =>
        `خصومات الحضور غير مولّدة في أيام استثناء الحضور من ${window.effectiveFrom} إلى ${window.effectiveTo ?? 'نهاية مفتوحة'}`)
      if (Number(detail.exemptUnpaidLeaveDays) > 0) notes.push(`إجازة بلا أجر ${detail.exemptUnpaidLeaveDays} يوم — غير مخصومة بقرار الاستثناء`)
      return notes as string[]
    } catch { return [] }
  })()

  return (
    <MainLayout>
      <div className="space-y-6">
        {/* Breadcrumb */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2 text-sm text-gray-500">
            <Link href="/payroll" className="hover:text-primary-600">
              الرواتب
            </Link>
            <ArrowRight size={16} />
            <span className="text-gray-800">قسيمة الراتب</span>
          </div>
          <div className="flex items-center gap-3">
            {/* «إرسال بالبريد» و«تحميل PDF» أُخفيا لأنهما بلا تنفيذ؛ الطباعة تتيح الحفظ PDF من المتصفح (الخطوة 30) */}
            <button type="button" onClick={() => window.print()} className="btn-primary flex items-center gap-2">
              <Printer size={18} />
              طباعة / حفظ
            </button>
          </div>
        </div>

        {/* Error Banner */}
        {error && (
          <div className="bg-red-50 text-red-700 rounded-xl p-4 flex items-center gap-2">
            <AlertTriangle size={18} />
            {error}
          </div>
        )}

        {loading ? (
          <div className="flex items-center justify-center py-16">
            <div className="w-8 h-8 border-2 border-primary-500 border-t-transparent rounded-full animate-spin" />
          </div>
        ) : item && run && employee ? (
        <div className="card max-w-4xl mx-auto" id="payslip">
          {/* Header */}
          <div className="flex items-start justify-between border-b border-gray-200 pb-6 mb-6">
            {/* تبسيط الرواتب (2026-09-15): مربع الشعار بحرفي «HR» اللاتينيين أُخفي؛ اسم الفرع يبقى عنوانًا للقسيمة */}
            <div className="flex items-center gap-4">
              <div>
                <h1 className="text-xl font-bold text-gray-800">{branch?.name ?? 'نظام الموارد البشرية'}</h1>
                <div className="flex items-center gap-4 mt-2 text-sm text-gray-500">
                  {branch?.city && (
                    <span className="flex items-center gap-1">
                      <MapPin size={14} />
                      {branch.city}
                    </span>
                  )}
                </div>
              </div>
            </div>
            <div className="text-left">
              <h2 className="text-2xl font-bold text-primary-600">قسيمة الراتب</h2>
              <p className="text-lg font-bold text-gray-800 mt-2">{run.period}</p>
            </div>
          </div>

          {/* تبسيط الرواتب (2026-09-15): شريطا عكس الصرف والمسير التكميلي أُخفيا من القسيمة */}

          {/* Employee Info */}
          <div className="grid grid-cols-2 gap-8 mb-8">
            <div className="space-y-4">
              <h3 className="font-bold text-gray-700 border-b border-gray-200 pb-2">بيانات الموظف</h3>
              <div className="grid grid-cols-2 gap-y-3 text-sm">
                <span className="text-gray-500">الاسم:</span>
                <span className="font-medium text-gray-800">{employee.fullName}</span>

                <span className="text-gray-500">الرقم الوظيفي:</span>
                <span className="font-medium text-gray-800 font-mono">{employee.employeeCode}</span>

                <span className="text-gray-500">المسمى الوظيفي:</span>
                <span className="font-medium text-gray-800">{employee.jobTitle ?? '—'}</span>

                <span className="text-gray-500">تاريخ التعيين:</span>
                <span className="font-medium text-gray-800">{employee.joinDate ?? '—'}</span>

                <span className="text-gray-500">رقم الهوية:</span>
                <span className="font-medium text-gray-800 font-mono">{employee.nationalId ?? '—'}</span>
              </div>
            </div>

            <div className="space-y-4">
              <h3 className="font-bold text-gray-700 border-b border-gray-200 pb-2">بيانات الدفع</h3>
              <div className="grid grid-cols-2 gap-y-3 text-sm">
                <span className="text-gray-500">الفترة:</span>
                <span className="font-medium text-gray-800">
                  {run.startDate} - {run.endDate}
                </span>

                <span className="text-gray-500">حالة المسير:</span>
                <span className="font-medium text-gray-800">{runStatusLabels[run.status] ?? 'غير معروف'}</span>

                {/* الخطوة 22 (B5): التغطية والمعامل وأساس الأيام من تفصيل البند المحفوظ */}
                <span className="text-gray-500">التغطية:</span>
                <span className="font-medium text-gray-800">{payrollCoverageText(payrollItemCoverage(item)) ?? '—'}</span>

                {run.status === 'PAID' && paidRun?.payReference && <>
                  <span className="text-gray-500">مرجع الصرف:</span>
                  <span className="font-medium text-gray-800">{PAY_CHANNEL_LABELS[paidRun.payChannel as PayrollPayChannel] ?? ''} {paidRun.payReference}</span>
                </>}

                <span className="text-gray-500">طريقة الدفع:</span>
                <span className="font-medium text-gray-800">{payMethodLabels[employee.payMethod ?? item.payMethod] ?? 'غير معروف'}</span>

                {employee.paySplit && <>
                  <span className="text-gray-500">الصرف:</span>
                  <span className="font-medium text-gray-800">تحويل بنكي {formatMoney(employee.paySplit.bank)} — نقدي {formatMoney(employee.paySplit.cash)}</span>
                </>}

                <span className="text-gray-500">البنك:</span>
                <span className="font-medium text-gray-800">{employee.bankName ?? '—'}</span>

                <span className="text-gray-500">رقم الحساب البنكي الدولي:</span>
                <span className="font-medium text-gray-800 font-mono text-xs">{employee.iban ?? '—'}</span>
              </div>
            </div>
          </div>

          {/* Salary Details */}
          <div className="grid grid-cols-2 gap-8 mb-8">
            {/* Earnings */}
            <div>
              <h3 className="font-bold text-success-700 bg-success-50 px-4 py-2 rounded-t-xl">
                {PAYROLL_LINE_GROUP_LABELS.earnings}
              </h3>
              <div className="border border-gray-200 border-t-0 rounded-b-xl overflow-hidden">
                <table className="w-full">
                  <tbody>
                    {earnings.map((earning, index) => (
                      <tr key={index} className={index % 2 === 0 ? 'bg-white' : 'bg-gray-50'}>
                        <td className="px-4 py-3 text-sm">
                          <div>
                            <p className="text-gray-800">{earning.name}</p>
                          </div>
                        </td>
                        <td className="px-4 py-3 text-left font-mono font-medium text-success-600">
                          {formatMoneyOrDash(earning.amount)}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                  <tfoot>
                    <tr className="bg-success-100">
                      <td className="px-4 py-3 font-bold text-success-800">{PAYROLL_LINE_TOTAL_LABELS.earnings}</td>
                      <td className="px-4 py-3 text-left font-mono font-bold text-success-800 text-lg">
                        {formatMoney(totalEarnings)}
                      </td>
                    </tr>
                  </tfoot>
                </table>
              </div>
            </div>

            {/* Deductions */}
            <div>
              <h3 className="font-bold text-danger-700 bg-danger-50 px-4 py-2 rounded-t-xl">
                {PAYROLL_LINE_GROUP_LABELS.deductions}
              </h3>
              <div className="border border-gray-200 border-t-0 rounded-b-xl overflow-hidden">
                <table className="w-full">
                  <tbody>
                    {deductions.length === 0 && <tr><td colSpan={2} className="px-4 py-3 text-sm text-gray-400">مفيش استقطاعات</td></tr>}
                    {deductions.map((deduction, index) => (
                      <tr key={index} className={index % 2 === 0 ? 'bg-white' : 'bg-gray-50'}>
                        <td className="px-4 py-3 text-sm">
                          <div>
                            <p className="text-gray-800">{deduction.name}</p>
                            {exemptionNote(deduction.component) && <p className="text-success-700 text-xs">{exemptionNote(deduction.component)}</p>}
                          </div>
                        </td>
                        <td className="px-4 py-3 text-left font-mono font-medium text-danger-600">
                          {formatMoneyOrDash(deduction.amount)}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                  <tfoot>
                    <tr className="bg-danger-100">
                      <td className="px-4 py-3 font-bold text-danger-800">{PAYROLL_LINE_TOTAL_LABELS.deductions}</td>
                      <td className="px-4 py-3 text-left font-mono font-bold text-danger-800 text-lg">
                        {formatMoney(totalDeductions)}
                      </td>
                    </tr>
                  </tfoot>
                </table>
              </div>
            </div>
          </div>

          {/* Net Salary */}
          {item && <PayrollAttendanceBreakdown item={item} currency={currency} />}
          {/* الخطوة 21: أثر شريحة التأخير لكل يوم (المدى والطريقة والمضاعف والمعادلة) */}
          {item && <PayrollLatenessTierBreakdown item={item} currency={currency} />}
          {item && <PayrollOvertimeBreakdown item={item} currency={currency} />}
          {item && <PayrollInstallmentBreakdown item={item} currency={currency} />}
          {item && <PayrollObligationBreakdown item={item} currency={currency} details={obligationDetails} />}
          {item && <PayrollExemptionPayslipSection item={item} currency={currency} details={financialExemptions} />}
          {attendanceNotes.length > 0 && (
            <div className="bg-gray-50 border border-gray-200 rounded-xl p-4 mb-6 text-sm text-gray-700 space-y-1">
              {attendanceNotes.map((note, index) => <p key={index}>{note}</p>)}
              <p>استثناء الحضور لا يلغي أقساط السلف والمديونيات والخصومات الإدارية.</p>
            </div>
          )}
          <div className="bg-gradient-to-r from-primary-500 to-primary-600 rounded-2xl p-6 text-white mb-8">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-primary-100">صافي الراتب</p>
                <p className="text-4xl font-bold mt-1">{formatMoney(netSalary)} {currency}</p>
                <p className="text-primary-200 text-sm mt-2">{numberToArabicWords(netSalary, currency)}</p>
              </div>
              <div className="w-20 h-20 bg-white/20 rounded-2xl flex items-center justify-center">
                <CreditCard size={40} />
              </div>
            </div>
          </div>

          {/* Footer */}
          <div className="border-t border-gray-200 pt-6 text-center">
            <p className="text-xs text-gray-400">
              هذه القسيمة صادرة إلكترونياً ولا تحتاج إلى توقيع
            </p>
          </div>
        </div>
        ) : null}
      </div>
    </MainLayout>
  )
}
