'use client'

import { useEffect, useState } from 'react'
import { MainLayout } from '@/components/layout'
import { Gift } from 'lucide-react'
import { useCurrency } from '@/lib/currency'
import { bonusBadgeClass, fetchMyBonuses, formatBonusMoney, type MyBonusView } from '@/lib/bonuses-api'
import { BonusesWorkspace } from '@/components/payroll/BonusesWorkspace'

// C4 / الخطوة 27 (EX-05): الموظف يرى كل مكافأة مقترحة له من لحظة الاقتراح بحالتها وشهر مسيرها ومصير صرفها،
// و«مصروف» لا تظهر إلا بعد صرف مسير ذلك الشهر. المدير الهيكلي يجد تحتها مساحة اقتراح مكافآت مرؤوسيه ومتابعة اعتمادها.
export default function MyBonusesPage() {
  const currency = useCurrency()
  const [rows, setRows] = useState<MyBonusView[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  useEffect(() => {
    fetchMyBonuses()
      .then(setRows)
      .catch(e => setError(e instanceof Error ? e.message : 'تعذر تحميل مكافآتك'))
      .finally(() => setLoading(false))
  }, [])

  return (
    <MainLayout>
      <div className="space-y-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-800">مكافآتي</h1>
          <p className="text-gray-500 mt-1">المكافآت المقترحة لك بحالتها قبل نزول المسير وبعده</p>
        </div>
        {error && <div role="alert" className="bg-red-50 text-red-700 rounded-xl p-4">{error}</div>}
        <div className="card">
          <h3 className="font-bold text-gray-800 mb-4 flex items-center gap-2"><Gift size={20} className="text-success-500" />المكافآت المقترحة لي</h3>
          {loading ? (
            <div className="flex items-center justify-center py-10"><div className="w-8 h-8 border-2 border-primary-500 border-t-transparent rounded-full animate-spin" /></div>
          ) : rows.length === 0 ? (
            <p className="text-sm text-gray-400">لا توجد مكافآت مقترحة لك</p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="table-header">
                    <th className="text-right px-3 py-3">النوع</th>
                    <th className="text-right px-3 py-3">السبب</th>
                    <th className="text-center px-3 py-3">المبلغ ({currency})</th>
                    <th className="text-center px-3 py-3">شهر المسير</th>
                    <th className="text-right px-3 py-3">المُقترِح</th>
                    <th className="text-center px-3 py-3">الحالة</th>
                  </tr>
                </thead>
                <tbody>
                  {rows.map(row => (
                    <tr key={row.id} className="table-row align-top">
                      <td className="table-cell text-sm">{row.type.nameAr}<span className="block text-xs text-gray-400">{row.type.calcMethodLabel}: {row.inputValue}</span></td>
                      <td className="table-cell text-sm"><p className="text-gray-600 whitespace-pre-wrap">{row.reason}</p>
                        {row.decisionReason && <p className="text-xs text-gray-500">سبب القرار: {row.decisionReason}</p>}</td>
                      <td className="table-cell text-center font-mono text-success-700">{formatBonusMoney(row.amount)}<span className="block text-xs text-gray-400">{row.amountIsFinal ? 'نهائي' : 'تقديري'}</span>
                        {row.reversedAmount !== '0.00' && <span className="block text-xs text-red-600">مسترد {formatBonusMoney(row.reversedAmount)}</span>}</td>
                      <td className="table-cell text-center font-mono" dir="ltr">{row.targetPeriod}</td>
                      <td className="table-cell text-sm">{row.issuer.basisLabel}{row.issuer.name ? <span className="block text-xs text-gray-400">{row.issuer.name}</span> : null}</td>
                      <td className="table-cell text-center"><span className={`px-2 py-0.5 rounded-full text-xs ${bonusBadgeClass(row.status, row.payout?.state)}`}>{row.statusLabel}</span></td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
        <BonusesWorkspace currency={currency} mode="manager" />
      </div>
    </MainLayout>
  )
}
