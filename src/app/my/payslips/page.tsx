'use client'

import { useT } from '@/lib/i18n'
import { useEffect, useState } from 'react'
import { MainLayout } from '@/components/layout'
import Link from 'next/link'
import { DollarSign, Eye, FileText, Printer } from 'lucide-react'
import {
  fetchMyPayslips,
  type ApiPayrollItem,
  type ApiPayrollRun,
} from '@/lib/api'
import { useOwnCurrency } from '@/lib/currency'
import type { PayslipReversalInfo } from '@/lib/payroll-corrections-api'
// FE-06 (B5): المنسّق الواحد ونظام الأرقام الواحد، والخصومات من أعمدة البند نفسها كجدول المسير (ومنها نقص الساعات)
import { formatMoney } from '@/lib/money'
import { payrollItemDeductions } from '@/lib/payroll-item-totals'

// حالة مسير الفرع كما تظهر للموظف
const runStatusLabels: Record<string, string> = {
  CALCULATED: 'محسوب',
  APPROVED: 'معتمد',
  PAID: 'مصروف',
}

const runStatusColors: Record<string, string> = {
  CALCULATED: 'bg-blue-100 text-blue-700',
  APPROVED: 'bg-warning-50 text-warning-700',
  PAID: 'bg-success-50 text-success-700',
}

const payMethodLabels: Record<string, string> = {
  transfer: 'تحويل بنكي',
  cash: 'نقداً',
  cheque: 'شيك',
  visa: 'فيزا',
}

interface PayslipRow {
  item: ApiPayrollItem
  run: ApiPayrollRun
  // C8 / الخطوة 31: القسيمة التي عُكس صرفها تبقى في السجل موسومة بعكسها
  reversal?: PayslipReversalInfo | null
}

export default function MyPayslipsPage() {
  const t = useT()
  // B1.1: بيانات الحساب نفسه بعملة فرعه هو، حتى لو معاه صلاحيات إدارة (مش عملة الشاشة العامة)
  const currency = useOwnCurrency()
  const [rows, setRows] = useState<PayslipRow[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  useEffect(() => {
    fetchMyPayslips()
      .then(setRows)
      .catch((e) => setError(e instanceof Error ? e.message : 'تعذر تحميل قسائم راتبك'))
      .finally(() => setLoading(false))
  }, [])

  // الأحدث أولاً حسب الفترة
  const sorted = [...rows].sort((a, b) => b.run.period.localeCompare(a.run.period))
  const latest = sorted[0]

  return (
    <MainLayout>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-gray-800">{t('قسائم راتبي')}</h1>
            <p className="text-gray-500 mt-1">
              {t('قسائمك حسب مسيرات الرواتب المعتمدة أو المصروفة لفرعك')}
            </p>
          </div>
        </div>

        {error && <div className="bg-red-50 text-red-700 rounded-xl p-4">{t(error)}</div>}

        {loading ? (
          <div className="flex items-center justify-center py-20">
            <div className="w-8 h-8 border-2 border-primary-500 border-t-transparent rounded-full animate-spin" />
          </div>
        ) : (
          <>
            {/* آخر قسيمة */}
            {latest && (
              <div className="card bg-gradient-to-br from-primary-500 to-primary-600 text-white">
                <div className="flex items-center justify-between max-lg:gap-4">
                  <div className="max-lg:min-w-0 max-lg:break-words">
                    <p className="text-primary-100">{t('صافي آخر راتب — فترة')} {latest.run.period}</p>
                    <p className="text-4xl font-bold mt-1">
                      {formatMoney(latest.item.netPay)} {t(currency)}
                    </p>
                    <p className="text-primary-100 mt-2">
                      {sorted.length} {t('قسيمة راتب في سجلك')}
                    </p>
                  </div>
                  <div className="w-20 h-20 bg-white/20 rounded-2xl hidden sm:flex items-center justify-center max-lg:shrink-0">
                    <DollarSign size={40} className="text-white" />
                  </div>
                </div>
              </div>
            )}

            {/* Payslips Table */}
            <div className="card overflow-hidden p-0">
              {sorted.length === 0 ? (
                <div className="p-12 text-center">
                  <FileText size={48} className="mx-auto text-gray-300 mb-4" />
                  <p className="text-gray-500">
                    {t('لا توجد قسائم راتب لك بعد — تظهر القسيمة بعد اعتماد مسير فرعك')}
                  </p>
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full max-sm:whitespace-nowrap">
                    <thead>
                      <tr className="table-header">
                        <th className="text-start px-4 py-3">{t('الفترة')}</th>
                        <th className="text-center px-4 py-3">{t('حالة المسير')}</th>
                        <th className="text-center px-4 py-3">{t('الراتب الأساسي')}</th>
                        <th className="text-center px-4 py-3">{t('العمل الإضافي')}</th>
                        <th className="text-center px-4 py-3">{t('الخصومات')}</th>
                        <th className="text-center px-4 py-3">{t('الصافي')}</th>
                        <th className="text-center px-4 py-3">{t('طريقة الدفع')}</th>
                        <th className="text-center px-4 py-3">{t('القسيمة')}</th>
                      </tr>
                    </thead>
                    <tbody>
                      {sorted.map(({ item, run, reversal }) => (
                        <tr key={item.id} className="table-row">
                          <td className="table-cell">
                            <p className="font-bold text-gray-800" dir="ltr">
                              {run.period}
                            </p>
                            <p className="text-xs text-gray-400" dir="ltr">
                              {run.startDate?.slice(0, 10)} → {run.endDate?.slice(0, 10)}
                            </p>
                          </td>
                          <td className="table-cell text-center">
                            <span
                              className={`badge text-xs ${runStatusColors[run.status] ?? 'bg-gray-100 text-gray-600'}`}
                            >
                              {t(runStatusLabels[run.status] ?? 'غير معروف')}
                            </span>
                            {/* تبسيط الرواتب (2026-09-15): علامتا «تكميلي» و«عُكس صرفها» أُخفيتا */}
                            {reversal?.line && reversal.line.status !== 'POSTED' && (
                              <span className="badge text-xs ms-1 bg-amber-50 text-amber-800">{t('عكس بانتظار التنفيذ')}</span>
                            )}
                          </td>
                          <td className="table-cell text-center text-gray-600">
                            {formatMoney(item.basicSalary)}
                          </td>
                          <td className="table-cell text-center text-success-600 font-medium">
                            +{formatMoney(item.overtimeAmount)}
                          </td>
                          <td className="table-cell text-center text-red-600 font-medium">
                            -{formatMoney(payrollItemDeductions(item))}
                          </td>
                          <td className="table-cell text-center font-bold text-gray-800">
                            {formatMoney(item.netPay)} {t(currency)}
                          </td>
                          <td className="table-cell text-center text-sm text-gray-600">
                            {t(payMethodLabels[item.payMethod] ?? 'غير معروف')}
                          </td>
                          <td className="table-cell">
                            <div className="flex items-center justify-center gap-2">
                              <Link
                                href={`/payroll/payslip/${item.id}`}
                                title={t('عرض القسيمة')}
                                className="p-2 bg-gray-100 rounded-lg hover:bg-gray-200"
                              >
                                <Eye size={16} className="text-gray-600" />
                              </Link>
                              <Link
                                href={`/payroll/payslip/${item.id}`}
                                title={t('طباعة')}
                                className="p-2 bg-gray-100 rounded-lg hover:bg-gray-200"
                              >
                                <Printer size={16} className="text-gray-600" />
                              </Link>
                            </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          </>
        )}
      </div>
    </MainLayout>
  )
}
