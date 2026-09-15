'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { MainLayout } from '@/components/layout'
import { AlertTriangle } from 'lucide-react'
import { useCurrency } from '@/lib/currency'
import { TypedDeductionsWorkspace } from '@/components/payroll/TypedDeductionsWorkspace'

// الخصومات: طلبات الخصم (المدير لفريقه والموارد البشرية لمجموعة) واعتمادها وأنواعها.
// خصومات الحضور والإجازة بدون راتب وأقساط السلف تُحسب آليًا وتظهر في جدول المسير نفسه.
export default function DeductionsPage() {
  const currency = useCurrency()
  // رابط القسيمة/المسير ?request=ID يفتح طلب الخصم المصنف مباشرة
  const [focusRequestId, setFocusRequestId] = useState<number | null>(null)
  useEffect(() => {
    const id = Number(new URLSearchParams(window.location.search).get('request'))
    if (Number.isSafeInteger(id) && id > 0) setFocusRequestId(id)
  }, [])

  return (
    <MainLayout>
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-gray-800">الخصومات</h1>
            <p className="text-gray-500 mt-1">طلبات الخصم واعتمادها وأنواعها</p>
          </div>
          <Link href="/payroll" className="btn-secondary">العودة للرواتب</Link>
        </div>

        <div className="bg-warning-50 border border-warning-200 rounded-xl p-3 flex items-center gap-2 text-sm text-warning-800">
          <AlertTriangle size={18} className="text-warning-600 shrink-0" />
          الخصم يدخل مسير شهره بعد آخر اعتماد؛ خصومات الحضور والإجازة بدون راتب والسلف تُحسب آليًا في المسير.
        </div>

        <TypedDeductionsWorkspace currency={currency} mode="admin" focusRequestId={focusRequestId} />
      </div>
    </MainLayout>
  )
}
