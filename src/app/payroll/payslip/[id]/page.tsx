'use client'
import { useParams } from 'next/navigation'

import { useEffect, useState } from 'react'
import { MainLayout } from '@/components/layout'
import Link from 'next/link'
import {
  ArrowRight,
  Download,
  Printer,
  Mail,
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

  useEffect(() => {
    setLoading(true)
    Promise.all([fetchPayslip(Number(params.id)), fetchBranches().catch(() => [] as ApiBranch[])])
      .then(([data, branches]) => {
        setItem(data.item)
        setRun(data.run)
        setEmployee(data.employee)
        setBranch(branches.find((b) => b.id === data.run.branchId) ?? null)
      })
      .catch((e) => setError(e instanceof Error ? e.message : 'تعذر تحميل قسيمة الراتب'))
      .finally(() => setLoading(false))
  }, [params.id])

  const salaryComponents = item ? savedSalaryComponents(item) : null
  const salaryEarnings = item
    ? salaryComponents?.map(component => ({ name: component.nameAr, nameEn: component.nameEn, amount: component.earnedAmount })) ?? [
        { name: 'الراتب الأساسي', nameEn: 'Basic Salary', amount: Number(item.basicSalary) },
        {
          name: 'البدلات',
          nameEn: 'Allowances',
          amount: Number(item.allowances ?? 0),
        },
      ]
    : []
  const earnings = item
    ? [
        ...salaryEarnings,
        {
          name: 'العمل الإضافي',
          nameEn: `Overtime (${Number(item.overtimeHours)} h)`,
          amount: Number(item.overtimeAmount),
        },
        {
          name: 'إضافات أخرى (مكافآت/بدلات)',
          nameEn: 'Other Additions',
          amount: Number(item.otherAdditions ?? 0),
        },
      ]
    : []

  const deductions = item
    ? [
        {
          name: 'خصم التأخير',
          nameEn: `Lateness (${Number(item.lateMinutes)} min)`,
          amount: Number(item.latenessDeduction),
        },
        {
          name: 'خصم نقص ساعات العمل',
          nameEn: `Work shortfall (${Number(item.shortfallMinutes ?? 0)} min observed)`,
          amount: Number(item.shortfallDeduction ?? 0),
        },
        {
          name: 'خصم الغياب',
          nameEn: `Absence (${Number(item.absenceDays ?? 0)} d)`,
          amount: Number(item.absenceDeduction ?? 0),
        },
        {
          name: 'إجازة بدون راتب',
          nameEn: `Unpaid Leave (${Number(item.unpaidLeaveDays)} d)`,
          amount: Number(item.unpaidLeaveDeduction),
        },
        { name: 'أقساط السلف', nameEn: 'Loan Installments', amount: Number(item.loanInstallments) },
        {
          name: 'خصومات أخرى (عهدة/غرامة/تسوية)',
          nameEn: 'Other Deductions',
          amount: Number(item.otherDeductions ?? 0),
        },
      ]
    : []

  const totalEarnings = earnings.reduce((sum, e) => sum + e.amount, 0)
  const totalDeductions = deductions.reduce((sum, d) => sum + d.amount, 0)
  const netSalary = item ? Number(item.netPay) : 0
  const attendanceNotes = (() => {
    try {
      const detail = item?.breakdown ? JSON.parse(item.breakdown) : {}
      const windows = Array.isArray(detail.attendanceExemptions) ? detail.attendanceExemptions : []
      const notes = windows.map((window: { id: number; effectiveFrom: string; effectiveTo: string | null }) =>
        `خصومات الحضور غير مولّدة في أيام الاستثناء #${window.id} من ${window.effectiveFrom} إلى ${window.effectiveTo ?? 'نهاية مفتوحة'}`)
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
            <button className="btn-secondary flex items-center gap-2">
              <Mail size={18} />
              إرسال بالبريد
            </button>
            <button className="btn-secondary flex items-center gap-2">
              <Download size={18} />
              تحميل PDF
            </button>
            <button onClick={() => window.print()} className="btn-primary flex items-center gap-2">
              <Printer size={18} />
              طباعة
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
            <div className="flex items-center gap-4">
              <div className="w-20 h-20 bg-gradient-to-br from-primary-500 to-primary-600 rounded-2xl flex items-center justify-center text-white font-bold text-2xl">
                HR
              </div>
              <div>
                <h1 className="text-xl font-bold text-gray-800">{branch?.name ?? 'نظام الموارد البشرية'}</h1>
                <p className="text-gray-500">{branch?.nameEn ?? ''}</p>
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
              <p className="text-gray-500">Payslip</p>
              <p className="text-lg font-bold text-gray-800 mt-2">{run.period}</p>
            </div>
          </div>

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
                <span className="font-medium text-gray-800">{runStatusLabels[run.status] ?? run.status}</span>

                <span className="text-gray-500">طريقة الدفع:</span>
                <span className="font-medium text-gray-800">{payMethodLabels[item.payMethod] ?? item.payMethod}</span>

                <span className="text-gray-500">البنك:</span>
                <span className="font-medium text-gray-800">{employee.bankName ?? '—'}</span>

                <span className="text-gray-500">رقم الحساب (IBAN):</span>
                <span className="font-medium text-gray-800 font-mono text-xs">{employee.iban ?? '—'}</span>
              </div>
            </div>
          </div>

          {/* Salary Details */}
          <div className="grid grid-cols-2 gap-8 mb-8">
            {/* Earnings */}
            <div>
              <h3 className="font-bold text-success-700 bg-success-50 px-4 py-2 rounded-t-xl">
                الاستحقاقات (Earnings)
              </h3>
              <div className="border border-gray-200 border-t-0 rounded-b-xl overflow-hidden">
                <table className="w-full">
                  <tbody>
                    {earnings.map((earning, index) => (
                      <tr key={index} className={index % 2 === 0 ? 'bg-white' : 'bg-gray-50'}>
                        <td className="px-4 py-3 text-sm">
                          <div>
                            <p className="text-gray-800">{earning.name}</p>
                            <p className="text-gray-400 text-xs">{earning.nameEn}</p>
                          </div>
                        </td>
                        <td className="px-4 py-3 text-left font-mono font-medium text-success-600">
                          {earning.amount > 0 ? earning.amount.toLocaleString() : '-'}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                  <tfoot>
                    <tr className="bg-success-100">
                      <td className="px-4 py-3 font-bold text-success-800">إجمالي الاستحقاقات</td>
                      <td className="px-4 py-3 text-left font-mono font-bold text-success-800 text-lg">
                        {totalEarnings.toLocaleString()}
                      </td>
                    </tr>
                  </tfoot>
                </table>
              </div>
            </div>

            {/* Deductions */}
            <div>
              <h3 className="font-bold text-danger-700 bg-danger-50 px-4 py-2 rounded-t-xl">
                الخصومات (Deductions)
              </h3>
              <div className="border border-gray-200 border-t-0 rounded-b-xl overflow-hidden">
                <table className="w-full">
                  <tbody>
                    {deductions.map((deduction, index) => (
                      <tr key={index} className={index % 2 === 0 ? 'bg-white' : 'bg-gray-50'}>
                        <td className="px-4 py-3 text-sm">
                          <div>
                            <p className="text-gray-800">{deduction.name}</p>
                            <p className="text-gray-400 text-xs">{deduction.nameEn}</p>
                          </div>
                        </td>
                        <td className="px-4 py-3 text-left font-mono font-medium text-danger-600">
                          {deduction.amount > 0 ? deduction.amount.toLocaleString() : '-'}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                  <tfoot>
                    <tr className="bg-danger-100">
                      <td className="px-4 py-3 font-bold text-danger-800">إجمالي الخصومات</td>
                      <td className="px-4 py-3 text-left font-mono font-bold text-danger-800 text-lg">
                        {totalDeductions.toLocaleString()}
                      </td>
                    </tr>
                  </tfoot>
                </table>
              </div>
            </div>
          </div>

          {/* Net Salary */}
          {item && <PayrollAttendanceBreakdown item={item} currency={currency} />}
          {item && <PayrollOvertimeBreakdown item={item} currency={currency} />}
          {item && <PayrollInstallmentBreakdown item={item} currency={currency} />}
          {attendanceNotes.length > 0 && (
            <div className="bg-gray-50 border border-gray-200 rounded-xl p-4 mb-6 text-sm text-gray-700 space-y-1">
              {attendanceNotes.map((note, index) => <p key={index}>{note}</p>)}
              <p>استثناء الحضور لا يلغي أقساط السلف والمديونيات والخصومات الإدارية.</p>
            </div>
          )}
          <div className="bg-gradient-to-r from-primary-500 to-primary-600 rounded-2xl p-6 text-white mb-8">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-primary-100">صافي الراتب (Net Salary)</p>
                <p className="text-4xl font-bold mt-1">{netSalary.toLocaleString()} {currency}</p>
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
            <p className="text-xs text-gray-400 mt-1">
              This payslip is electronically generated and does not require a signature
            </p>
            <div className="mt-4 flex items-center justify-center gap-2">
              <div className="w-24 h-24 bg-gray-100 rounded-xl flex items-center justify-center">
                <span className="text-xs text-gray-400">QR Code</span>
              </div>
            </div>
          </div>
        </div>
        ) : null}
      </div>
    </MainLayout>
  )
}
