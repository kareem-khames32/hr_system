'use client'

import { useEffect } from 'react'
import { useRouter } from 'next/navigation'

// طلب المالك 11 أكتوبر 2026 («مفيش بيانات ديمو»): الشاشة دي كانت شاشة عرض ببيانات ثابتة من غير خلفية (من التصميم الأول) واتشالت. التقرير المخصص بيتبني ويتحفظ من «بانِي التقارير» (B5.9).
// الرابط القديم بيتحوّل للشاشة الحقيقية، ومحتوى الصفحة القديمة في تاريخ git.
export default function ReportsCustomRedirect() {
  const router = useRouter()
  useEffect(() => { router.replace('/reports') }, [router])
  return <p className="p-6 text-sm text-gray-400">جارٍ التحويل إلى لوحة التقارير…</p>
}
