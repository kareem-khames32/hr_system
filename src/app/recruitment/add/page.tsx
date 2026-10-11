'use client'

import { useEffect } from 'react'
import { useRouter } from 'next/navigation'

// طلب المالك 11 أكتوبر 2026 («مفيش بيانات ديمو»): الشاشة دي كانت شاشة عرض ببيانات ثابتة من غير خلفية (من التصميم الأول) واتشالت. إضافة الوظيفة ونشرها من «إدارة الوظائف» (B3.1).
// الرابط القديم بيتحوّل للشاشة الحقيقية، ومحتوى الصفحة القديمة في تاريخ git.
export default function RecruitmentAddRedirect() {
  const router = useRouter()
  useEffect(() => { router.replace('/recruitment/jobs') }, [router])
  return <p className="p-6 text-sm text-gray-400">جارٍ التحويل إلى إدارة الوظائف…</p>
}
