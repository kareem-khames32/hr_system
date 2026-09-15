'use client'

import { useEffect } from 'react'
import { useRouter } from 'next/navigation'

// تبسيط الرواتب (2026-09-15): صفحة «التأمينات» كانت مرجعًا ثابتًا بلا بيانات فأُخفيت.
// الرابط القديم يتحول لـ«مسير الرواتب»، ومحتوى الصفحة القديمة في تاريخ git.
export default function PayrollGosiRedirect() {
  const router = useRouter()
  useEffect(() => { router.replace('/payroll') }, [router])
  return <p className="p-6 text-sm text-gray-400">جارٍ التحويل إلى مسير الرواتب…</p>
}
