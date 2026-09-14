'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { AlertTriangle } from 'lucide-react'
import { fetchCatalog } from '@/lib/api'

// وردية الكتالوج بسماحيتها — graceMinutes = NULL تعني أنها تتبع القيمة العامة
interface ShiftGrace {
  id: number
  name: string
  graceMinutes?: number | null
  isActive: boolean
}

// السماحية العامة (attendance.grace_minutes) تسري فقط على الورديات التي لا سماحية
// لها وعلى جداول العمل — سماحية الوردية تغلبها. يعرض أين تُتجاوَز حتى لا يُظن أن
// تغيير العامة يسري على الجميع
export function GraceOverridesNote({ globalGrace }: { globalGrace?: string | null }) {
  const [shifts, setShifts] = useState<ShiftGrace[] | null>(null)
  const [error, setError] = useState(false)

  useEffect(() => {
    fetchCatalog<ShiftGrace>('shifts')
      .then(setShifts)
      .catch(() => setError(true))
  }, [])

  if (error) {
    return (
      <p className="text-xs text-gray-400 mt-2">
        تعذّر تحميل الورديات — سماحية الوردية (إن حُدّدت) تغلب القيمة العامة
      </p>
    )
  }
  if (!shifts) return null
  const active = shifts.filter((s) => s.isActive)
  const overriding = active.filter((s) => s.graceMinutes != null)
  const following = active.length - overriding.length
  return (
    <div className="mt-2 space-y-1">
      {overriding.length > 0 && (
        <p className="flex items-start gap-1.5 text-xs text-amber-700">
          <AlertTriangle size={13} className="shrink-0 mt-0.5" />
          <span>
            متجاوَزة في {overriding.length} وردية (سماحيتها الخاصة هي السارية):{' '}
            {overriding.map((s) => `${s.name} (${s.graceMinutes} د)`).join('، ')}
          </span>
        </p>
      )}
      <p className="text-xs text-gray-500">
        {following > 0
          ? `تسري العامة${globalGrace ? ` (${globalGrace} د)` : ''} على ${following} وردية بلا سماحية خاصة وعلى جداول العمل`
          : 'كل الورديات النشطة لها سماحية خاصة — العامة تسري على جداول العمل فقط'}
        {' — '}
        <Link href="/attendance/shifts" className="text-primary-600 hover:underline">
          الورديات
        </Link>
      </p>
    </div>
  )
}
