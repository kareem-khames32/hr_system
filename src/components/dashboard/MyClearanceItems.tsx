'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { ChevronLeft, ClipboardCheck } from 'lucide-react'
import { fetchMyClearanceItems, type ApiMyClearanceItem } from '@/lib/api'

// أسماء جهات إخلاء الطرف — نفس شاشة ملف إنهاء الخدمة
const partyLabels: Record<string, string> = {
  manager: 'المدير المباشر',
  custody: 'العهدة والأصول',
  it: 'تقنية المعلومات',
  finance: 'المالية',
  hr: 'الموارد البشرية',
}

// «بنود إخلاء عليّ» — بنود إخلاء الطرف المعلّقة على جهتي أو كمدير مباشر
// (تختفي عند الخلو) والإتمام من داخل ملف إنهاء الخدمة
export default function MyClearanceItems() {
  const [items, setItems] = useState<ApiMyClearanceItem[]>([])

  useEffect(() => {
    let cancelled = false
    fetchMyClearanceItems()
      .then((rows) => {
        if (!cancelled) setItems(rows)
      })
      .catch(() => {
        if (!cancelled) setItems([])
      })
    return () => {
      cancelled = true
    }
  }, [])

  if (items.length === 0) return null

  return (
    <div className="card p-5">
      <div className="flex items-center gap-2 mb-4">
        <ClipboardCheck size={18} className="text-warning-600" />
        <h3 className="font-bold text-gray-800">بنود إخلاء عليّ</h3>
        <span className="badge text-xs bg-warning-50 text-warning-700">
          {items.length}
        </span>
      </div>
      <div className="space-y-3">
        {items.map((it) => (
          <div
            key={it.itemId}
            className="flex items-center justify-between gap-4 p-3 bg-gray-50 rounded-xl"
          >
            <div className="min-w-0">
              <p className="font-medium text-gray-800 text-sm">
                {it.label}{' '}
                <span className="text-xs text-gray-400">
                  ({partyLabels[it.party] ?? 'جهة إخلاء'})
                </span>
              </p>
              <p className="text-xs text-gray-500">
                الموظف: {it.employeeName}
                {it.employeeCode && (
                  <span dir="ltr"> ({it.employeeCode})</span>
                )}{' '}
                — آخر يوم عمل:{' '}
                <span dir="ltr">{String(it.lastWorkingDay ?? '').slice(0, 10)}</span>
              </p>
            </div>
            <Link
              href={`/offboarding/${it.caseId}`}
              className="flex items-center gap-1.5 px-4 py-2 bg-primary-500 text-white rounded-xl text-sm font-medium hover:bg-primary-600 shrink-0"
            >
              فتح الملف
              <ChevronLeft size={16} />
            </Link>
          </div>
        ))}
      </div>
    </div>
  )
}
