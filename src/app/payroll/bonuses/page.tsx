'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { MainLayout } from '@/components/layout'
import { useCurrency } from '@/lib/currency'
import { BonusesWorkspace } from '@/components/payroll/BonusesWorkspace'

// C4 / الخطوة 27: شاشة المكافآت على موديول المكافآت (EX-05) — الاقتراح للموظف المختار نفسه، لا مكافأة للنفس،
// المدير يقترح لمرؤوسيه، فترة مسير مستهدفة، والحالة «معتمد — بانتظار الصرف» حتى يستهلك مسير مصروف القيد.
// رابط «مكافأة» من جدول المسير: ?tab=create&employeeId=ID&period=YYYY-MM يفتح نموذج الاقتراح جاهزًا بالموظف والشهر.
type Initial = { focusRequestId: number | null; tab: 'create' | null; employeeId: number | null; period: string | null }

export default function BonusesPage() {
  const currency = useCurrency()
  // رابط القسيمة ?request=ID يفتح طلب المكافأة مباشرة
  const [initial, setInitial] = useState<Initial | null>(null)
  useEffect(() => {
    const params = new URLSearchParams(window.location.search)
    const id = Number(params.get('request'))
    const employeeId = Number(params.get('employeeId'))
    const period = params.get('period')
    setInitial({
      focusRequestId: Number.isSafeInteger(id) && id > 0 ? id : null,
      tab: params.get('tab') === 'create' ? 'create' : null,
      employeeId: Number.isSafeInteger(employeeId) && employeeId > 0 ? employeeId : null,
      period: period && /^\d{4}-(0[1-9]|1[0-2])$/.test(period) ? period : null,
    })
  }, [])

  return (
    <MainLayout>
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-gray-800">المكافآت</h1>
            <p className="text-gray-500 mt-1">اقتراح مكافأة لموظف أو مجموعة، واعتمادها، وصرفها مع مسير شهرها</p>
          </div>
          <Link href="/payroll" className="btn-secondary">العودة للرواتب</Link>
        </div>

        {initial && (
          <BonusesWorkspace currency={currency} mode="admin" focusRequestId={initial.focusRequestId}
            initialTab={initial.tab ?? undefined} initialEmployeeId={initial.employeeId} initialPeriod={initial.period} />
        )}
      </div>
    </MainLayout>
  )
}
