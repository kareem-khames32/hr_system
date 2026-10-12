'use client'

// B-ADD.15: طبقة الاجتماعات — مركّبة مرة واحدة في الـroot layout حوالين الإطار الدائم: جلسة الاجتماع (بتكمّل مع التنقل بين الشاشات)، و«الرنة»
// وطلبات الدخول في أي شاشة. السؤال الدوري (MeetGlobal) بيتركّب لما موديول الاجتماعات مفتوح للحساب بس — من غيره مفيش أي نداء.
import type { ReactNode } from 'react'
import { usePathname } from 'next/navigation'
import { useModuleEnabled } from '@/lib/modules'
import MeetGlobal from './MeetGlobal'
import { MeetSessionProvider } from './MeetSession'

export default function MeetLayer({ children }: { children: ReactNode }) {
  // مع كل انتقال الحساب بيتقري من جديد (بعد الدخول أو الخروج من غير إعادة تحميل)
  usePathname()
  const enabled = useModuleEnabled('meet')
  return (
    <MeetSessionProvider>
      {children}
      {enabled && <MeetGlobal />}
    </MeetSessionProvider>
  )
}
