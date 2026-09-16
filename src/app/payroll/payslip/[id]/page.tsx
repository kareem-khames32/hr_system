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
import { formatMoney, formatMoneyOrDash, sumMoney } from '@/lib/money'
import { payrollCoverageText, payrollItemCoverage } from '@/lib/payroll-item-totals'
import { PAY_CHANNEL_LABELS, type PayrollPayChannel, type PayrollRunScreenFields } from '@/lib/payroll-runs-api'

type SavedSalaryComponent = {
  code: string; nameAr: string; nameEn: string; monthlyAmount: number; earnedAmount: number
}

function savedSalaryComponents(item: ApiPayrollItem): SavedSalaryComponent[] | null {
  try {
    const components = JSON.parse(item.breakdown || '{}').salaryComponents
    if (!Array.isArray(components) || !components.length || components.some(component =>
      !component || typeof component.code !== 'string' || typeof component.nameAr !== 'string' ||
      typeof component.nameEn !== 'string' || typeof component.earnedAmount !== 'number' ||
      !Number.isFinite(component.earnedAmount) || component.earnedAmount < 0)) return null
    if (new Set(components.map(component => component.code)).size !== components.length) return null
    const basic = components.find(component => component.code === 'BASIC')
    const allowanceCents = components.filter(component => component.code !== 'BASIC')
      .reduce((sum, component) => sum + Math.round(component.earnedAmount * 100), 0)
    // AL-11: التفصيل محفوظ وقت الحساب؛ القسيمة القديمة تعرض مجموعها التاريخي دون تخمين.
    if (!basic || Math.round(basic.earnedAmount * 100) !== Math.round(Number(item.basicSalary) * 100) ||
      allowanceCents !== Math.round(Number(item.allowances ?? 0) * 100)) return null
    return components
  } catch { return null }
}

const runStatusLabels: Record<string, string> = {
  CALCULATED: 'محسوب',
  APPROVED: 'معتمد',
  PAID: 'مدفوع',
}

const payMethodLabels: Record<string, string> = {
  transfer: 'تحويل بنكي',
  cash: 'نقداً',
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
  // سطور عمود الإجازة بلا أجر: «إجازة بدون راتب» + «خصم إجازة مرضية (بنسبة أجر 75%)» لكل نسبة (من الخادم)
  const [leaveDeductions, setLeaveDeductions] = useState<Array<{ code: string; label: string; amount: number }> | null>(null)

  useEffect(() => {
    setLoading(true)
    Promise.all([fetchPayslip(Number(params.id)), fetchBranches().catch(() => [] as ApiBranch[])])
      .then(([data, branches]) => {
        setObligationDetails((data as { obligationDetails?: PayrollObligationDetail[] }).obligationDetails ?? [])
        setFinancialExemptions((data as { financialExemptions?: PayslipExemption[] }).financialExemptions ?? [])
        setLeaveDeductions((data as { leaveDeductions?: Array<{ code: string; label: string; amount: number }> }).leaveDeductions ?? null)
        setItem(data.item)
        setRun(data.run)
        setEmployee(data.employee)
        setBranch(branches.find((b) => b.id === data.run.branchId) ?? null)
      })
      .catch((e) => setError(e instanceof Error ? e.message : 'تعذر تحميل قسيمة الراتب'))
      .finally(() => setLoading(false))
  }, [params.id])

  // تبسيط الرواتب (2026-09-15): السطور الإنجليزية تحت أسماء البنود أُزيلت
  const salaryComponents = item ? savedSalaryComponents(item) : null
  const salaryEarnings = item
    ? salaryComponents?.map(component => ({ name: component.nameAr, amount: component.earnedAmount })) ?? [
        { name: 'الراتب الأساسي', amount: Number(item.basicSalary) },
        {
          name: 'البدلات',
          amount: Number(item.allowances ?? 0),
        },
      ]
    : []
  const earnings = item
    ? [
        ...salaryEarnings,
        {
          name: 'العمل الإضافي',
          amount: Number(item.overtimeAmount),
        },
        {
          name: 'إضافات أخرى (مكافآت/بدلات)',
          amount: Number(item.otherAdditions ?? 0),
        },
      ]
    : []

  const deductions: Array<{ name: string; amount: number; component?: ExemptionComponent }> = item
    ? [
        { name: 'خصم التأخير', amount: Number(item.latenessDeduction), component: 'LATENESS' },
        { name: 'خصم نقص ساعات العمل', amount: Number(item.shortfallDeduction ?? 0), component: 'SHORTFALL' },
        { name: 'خصم الغياب', amount: Number(item.absenceDeduction ?? 0), component: 'ABSENCE' },
        ...(leaveDeductions?.length
          ? leaveDeductions.map(line => ({ name: line.label, amount: Number(line.amount) }))
          : [{ name: 'إجازة بدون راتب', amount: Number(item.unpaidLeaveDeduction) }]),
        { name: 'أقساط السلف', amount: Number(item.loanInstallments), component: 'LOAN' },
        { name: 'خصومات أخرى — تفصيلها أدناه', amount: Number(item.otherDeductions ?? 0), component: 'TYPED' },
      ]
    : []
  // القرار د: سطر الخصم نفسه يقول إنه أُلغي — المبلغ الملغى (والأصل قبله لخصومات الحضور) بجانب البند،
  // والسطر المختصر أسفل القسيمة يبقى كما هو. بلا رقم قرار ولا مصطلحات.
  const savedExemptions = item ? savedFinancialExemptions(item) : null
  const exemptionNote = (component?: ExemptionComponent) => {
    const total = component ? savedExemptions?.totals.byComponent[component] : undefined
    if (!component || !savedExemptions || !total) return null
    const requested = component === 'LATENESS' ? savedExemptions.requested.lateness : component === 'SHORTFALL' ? savedExemptions.requested.shortfall : component === 'ABSENCE' ? savedExemptions.requested.absence : null
    return `${requested ? `الأصل قبل الإلغاء ${formatMoney(requested)} — ` : ''}أُلغي منه ${formatMoney(total.exempted)}`
  }

  const totalEarnings = sumMoney(earnings.map(e => e.amount))
  const totalDeductions = sumMoney(deductions.map(d => d.amount))
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
                <span className="font-medium text-gray-800">{payMethodLabels[item.payMethod] ?? 'غير معروف'}</span>

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
                الاستحقاقات
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
                      <td className="px-4 py-3 font-bold text-success-800">إجمالي الاستحقاقات</td>
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
                الخصومات
              </h3>
              <div className="border border-gray-200 border-t-0 rounded-b-xl overflow-hidden">
                <table className="w-full">
                  <tbody>
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
                      <td className="px-4 py-3 font-bold text-danger-800">إجمالي الخصومات</td>
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
