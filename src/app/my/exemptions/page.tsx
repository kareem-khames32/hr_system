'use client'

import { useEffect } from 'react'
import { useRouter } from 'next/navigation'

// تبسيط الرواتب (2026-09-15): «إعفاءاتي» أُخفيت؛ الخصم الملغى يظهر سطرًا واحدًا في قسيمة الراتب.
// الرابط القديم يتحول لـ«قسائم راتبي». الـAPI والمكونات المشتركة باقية، ومحتوى الصفحة القديمة في تاريخ git.
export default function MyExemptionsRedirect() {
  const router = useRouter()
  useEffect(() => { router.replace('/my/payslips') }, [router])
  return <p className="p-6 text-sm text-gray-400">جارٍ التحويل إلى قسائم راتبي…</p>
}
