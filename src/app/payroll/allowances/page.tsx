'use client'

import { useEffect } from 'react'
import { useRouter } from 'next/navigation'

// تبسيط الرواتب (2026-09-15): شاشة «البدلات» (قراءة فقط) أُخفيت؛ البدلات تظهر في جدول المسير وقسيمة الراتب.
// الرابط القديم يتحول لـ«مسير الرواتب». الحساب والـAPI باقيان، ومحتوى الصفحة القديمة في تاريخ git.
export default function PayrollAllowancesRedirect() {
  const router = useRouter()
  useEffect(() => { router.replace('/payroll') }, [router])
  return <p className="p-6 text-sm text-gray-400">جارٍ التحويل إلى مسير الرواتب…</p>
}
