'use client'

import { useEffect } from 'react'
import { useRouter } from 'next/navigation'

// طلب المالك 11 أكتوبر 2026 («مفيش بيانات ديمو»): الشاشة دي كانت شاشة عرض ببيانات ثابتة من غير خلفية (من التصميم الأول) واتشالت. تفاصيل الوظيفة ومتقدميها من «إدارة الوظائف» و«المتقدمين».
// الرابط القديم بيتحوّل للشاشة الحقيقية، ومحتوى الصفحة القديمة في تاريخ git.
export default function RecruitmentJobRedirect() {
  const router = useRouter()
  useEffect(() => { router.replace('/recruitment/jobs') }, [router])
  return <p className="p-6 text-sm text-gray-400">جارٍ التحويل إلى إدارة الوظائف…</p>
}
