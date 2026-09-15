'use client'

import { useEffect } from 'react'
import { useRouter } from 'next/navigation'

// تبسيط الرواتب (2026-09-15): «قسائم الراتب» أُخفيت؛ جدول المسير فيه عرض القسيمة وطباعتها لكل موظف.
// الرابط القديم يتحول لـ«مسير الرواتب». الـAPI باقٍ، ومحتوى الصفحة القديمة في تاريخ git.
export default function PayrollPayslipsRedirect() {
  const router = useRouter()
  useEffect(() => { router.replace('/payroll') }, [router])
  return <p className="p-6 text-sm text-gray-400">جارٍ التحويل إلى مسير الرواتب…</p>
}
