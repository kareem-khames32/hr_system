'use client'

import { useEffect } from 'react'
import { useRouter } from 'next/navigation'

// طلب المالك 11 أكتوبر 2026 («مفيش بيانات ديمو»): الشاشة دي كانت شاشة عرض ببيانات ثابتة من غير خلفية (من التصميم الأول) واتشالت. التقييم بيتفتح من دورة تقييم («دورات التقييم»، B3.7) وبيتملى من «التقييمات».
// الرابط القديم بيتحوّل للشاشة الحقيقية، ومحتوى الصفحة القديمة في تاريخ git.
export default function PerformanceNewRedirect() {
  const router = useRouter()
  useEffect(() => { router.replace('/performance') }, [router])
  return <p className="p-6 text-sm text-gray-400">جارٍ التحويل إلى التقييمات…</p>
}
