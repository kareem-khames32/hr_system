'use client'

import { useEffect } from 'react'
import { useRouter } from 'next/navigation'

// تبسيط الرواتب (2026-09-15): «الإعفاءات المالية» أُخفيت من الواجهة؛ إلغاء الخصم يتم من جدول المسير مباشرة.
// الرابط القديم يتحول لـ«مسير الرواتب». الـAPI والمكونات المشتركة باقية، ومحتوى الصفحة القديمة في تاريخ git.
export default function PayrollExemptionsRedirect() {
  const router = useRouter()
  useEffect(() => { router.replace('/payroll') }, [router])
  return <p className="p-6 text-sm text-gray-400">جارٍ التحويل إلى مسير الرواتب…</p>
}
