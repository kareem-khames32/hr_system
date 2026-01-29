'use client'

import { MainLayout } from '@/components/layout'
import Link from 'next/link'
import {
  ArrowRight,
  Download,
  Printer,
  Mail,
  Building2,
  Phone,
  MapPin,
  Calendar,
  User,
  CreditCard,
  FileText,
} from 'lucide-react'

// Mock payslip data
const payslipData = {
  // Company Info
  company: {
    name: 'شركة التقنية المتقدمة',
    nameEn: 'Advanced Tech Company',
    address: 'الرياض، المملكة العربية السعودية',
    phone: '+966 11 123 4567',
    email: 'hr@advtech.com.sa',
    logo: 'ATC',
    crNumber: '1010123456',
    vatNumber: '300123456789012',
  },

  // Employee Info
  employee: {
    id: 'EMP001',
    name: 'أحمد محمد علي السعيد',
    nameEn: 'Ahmed Mohammed Ali Alsaeed',
    department: 'تقنية المعلومات',
    jobTitle: 'مدير تقنية المعلومات',
    joinDate: '2020/03/15',
    nationality: 'سعودي',
    nationalId: '1234567890',
    bankName: 'بنك الراجحي',
    bankAccount: 'SA00 0000 0000 0000 0000 0000',
    gosiNumber: '1234567890',
  },

  // Payroll Period
  period: {
    month: 'يناير',
    year: '2026',
    startDate: '2026/01/01',
    endDate: '2026/01/31',
    payDate: '2026/01/28',
    workingDays: 22,
    actualDays: 22,
  },

  // Earnings
  earnings: [
    { name: 'الراتب الأساسي', nameEn: 'Basic Salary', amount: 15000 },
    { name: 'بدل السكن', nameEn: 'Housing Allowance', amount: 3750 },
    { name: 'بدل المواصلات', nameEn: 'Transportation Allowance', amount: 1500 },
    { name: 'بدل الهاتف', nameEn: 'Phone Allowance', amount: 500 },
    { name: 'بدل طبيعة العمل', nameEn: 'Nature of Work Allowance', amount: 500 },
    { name: 'العمل الإضافي', nameEn: 'Overtime', amount: 0 },
  ],

  // Deductions
  deductions: [
    { name: 'التأمينات الاجتماعية (9.75%)', nameEn: 'GOSI (9.75%)', amount: 1462.50 },
    { name: 'قسط السلفة', nameEn: 'Loan Installment', amount: 0 },
    { name: 'خصم الغياب', nameEn: 'Absence Deduction', amount: 0 },
    { name: 'خصم التأخير', nameEn: 'Late Deduction', amount: 0 },
    { name: 'خصومات أخرى', nameEn: 'Other Deductions', amount: 0 },
  ],

  // Leave Balance
  leaveBalance: {
    annual: { total: 30, used: 12, remaining: 18 },
    sick: { total: 30, used: 3, remaining: 27 },
  },

  // Loan Balance
  loanBalance: {
    total: 0,
    paid: 0,
    remaining: 0,
  },
}

function numberToArabicWords(num: number): string {
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

  result += ' ريال'

  if (decPart > 0) {
    result += ` و${decPart} هللة`
  }

  return result + ' سعودي فقط لا غير'
}

export default function PayslipPage() {
  const totalEarnings = payslipData.earnings.reduce((sum, e) => sum + e.amount, 0)
  const totalDeductions = payslipData.deductions.reduce((sum, d) => sum + d.amount, 0)
  const netSalary = totalEarnings - totalDeductions

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
            <button className="btn-primary flex items-center gap-2">
              <Printer size={18} />
              طباعة
            </button>
          </div>
        </div>

        {/* Payslip Card */}
        <div className="card max-w-4xl mx-auto" id="payslip">
          {/* Header */}
          <div className="flex items-start justify-between border-b border-gray-200 pb-6 mb-6">
            <div className="flex items-center gap-4">
              <div className="w-20 h-20 bg-gradient-to-br from-primary-500 to-primary-600 rounded-2xl flex items-center justify-center text-white font-bold text-2xl">
                {payslipData.company.logo}
              </div>
              <div>
                <h1 className="text-xl font-bold text-gray-800">{payslipData.company.name}</h1>
                <p className="text-gray-500">{payslipData.company.nameEn}</p>
                <div className="flex items-center gap-4 mt-2 text-sm text-gray-500">
                  <span className="flex items-center gap-1">
                    <MapPin size={14} />
                    {payslipData.company.address}
                  </span>
                </div>
              </div>
            </div>
            <div className="text-left">
              <h2 className="text-2xl font-bold text-primary-600">قسيمة الراتب</h2>
              <p className="text-gray-500">Payslip</p>
              <p className="text-lg font-bold text-gray-800 mt-2">
                {payslipData.period.month} {payslipData.period.year}
              </p>
            </div>
          </div>

          {/* Employee Info */}
          <div className="grid grid-cols-2 gap-8 mb-8">
            <div className="space-y-4">
              <h3 className="font-bold text-gray-700 border-b border-gray-200 pb-2">بيانات الموظف</h3>
              <div className="grid grid-cols-2 gap-y-3 text-sm">
                <span className="text-gray-500">الاسم:</span>
                <span className="font-medium text-gray-800">{payslipData.employee.name}</span>

                <span className="text-gray-500">الرقم الوظيفي:</span>
                <span className="font-medium text-gray-800 font-mono">{payslipData.employee.id}</span>

                <span className="text-gray-500">القسم:</span>
                <span className="font-medium text-gray-800">{payslipData.employee.department}</span>

                <span className="text-gray-500">المسمى الوظيفي:</span>
                <span className="font-medium text-gray-800">{payslipData.employee.jobTitle}</span>

                <span className="text-gray-500">تاريخ التعيين:</span>
                <span className="font-medium text-gray-800">{payslipData.employee.joinDate}</span>

                <span className="text-gray-500">رقم الهوية:</span>
                <span className="font-medium text-gray-800 font-mono">{payslipData.employee.nationalId}</span>
              </div>
            </div>

            <div className="space-y-4">
              <h3 className="font-bold text-gray-700 border-b border-gray-200 pb-2">بيانات الدفع</h3>
              <div className="grid grid-cols-2 gap-y-3 text-sm">
                <span className="text-gray-500">الفترة:</span>
                <span className="font-medium text-gray-800">
                  {payslipData.period.startDate} - {payslipData.period.endDate}
                </span>

                <span className="text-gray-500">تاريخ الصرف:</span>
                <span className="font-medium text-gray-800">{payslipData.period.payDate}</span>

                <span className="text-gray-500">أيام العمل:</span>
                <span className="font-medium text-gray-800">{payslipData.period.workingDays} يوم</span>

                <span className="text-gray-500">البنك:</span>
                <span className="font-medium text-gray-800">{payslipData.employee.bankName}</span>

                <span className="text-gray-500">رقم الحساب:</span>
                <span className="font-medium text-gray-800 font-mono text-xs">{payslipData.employee.bankAccount}</span>

                <span className="text-gray-500">رقم التأمينات:</span>
                <span className="font-medium text-gray-800 font-mono">{payslipData.employee.gosiNumber}</span>
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
                    {payslipData.earnings.map((earning, index) => (
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
                    {payslipData.deductions.map((deduction, index) => (
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
          <div className="bg-gradient-to-r from-primary-500 to-primary-600 rounded-2xl p-6 text-white mb-8">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-primary-100">صافي الراتب (Net Salary)</p>
                <p className="text-4xl font-bold mt-1">{netSalary.toLocaleString()} ر.س</p>
                <p className="text-primary-200 text-sm mt-2">{numberToArabicWords(netSalary)}</p>
              </div>
              <div className="w-20 h-20 bg-white/20 rounded-2xl flex items-center justify-center">
                <CreditCard size={40} />
              </div>
            </div>
          </div>

          {/* Additional Info */}
          <div className="grid grid-cols-2 gap-8 mb-8">
            {/* Leave Balance */}
            <div className="p-4 bg-gray-50 rounded-xl">
              <h4 className="font-bold text-gray-700 mb-3">رصيد الإجازات</h4>
              <div className="space-y-2">
                <div className="flex justify-between text-sm">
                  <span className="text-gray-500">إجازة سنوية:</span>
                  <span className="font-medium">
                    {payslipData.leaveBalance.annual.remaining} من {payslipData.leaveBalance.annual.total} يوم
                  </span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-gray-500">إجازة مرضية:</span>
                  <span className="font-medium">
                    {payslipData.leaveBalance.sick.remaining} من {payslipData.leaveBalance.sick.total} يوم
                  </span>
                </div>
              </div>
            </div>

            {/* Loan Balance */}
            <div className="p-4 bg-gray-50 rounded-xl">
              <h4 className="font-bold text-gray-700 mb-3">رصيد السلفة</h4>
              {payslipData.loanBalance.total > 0 ? (
                <div className="space-y-2">
                  <div className="flex justify-between text-sm">
                    <span className="text-gray-500">إجمالي السلفة:</span>
                    <span className="font-medium">{payslipData.loanBalance.total.toLocaleString()} ر.س</span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-gray-500">المسدد:</span>
                    <span className="font-medium text-success-600">{payslipData.loanBalance.paid.toLocaleString()} ر.س</span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-gray-500">المتبقي:</span>
                    <span className="font-medium text-danger-600">{payslipData.loanBalance.remaining.toLocaleString()} ر.س</span>
                  </div>
                </div>
              ) : (
                <p className="text-gray-400 text-sm">لا توجد سلفة حالية</p>
              )}
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
      </div>
    </MainLayout>
  )
}
