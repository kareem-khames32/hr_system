'use client'

// B-ADD.15: صفحة اجتماع واحد (/meet/<الكود>): قبل الدخول ← الانتظار ← الغرفة. شاشة الغرفة ومكتبتها بيتحمّلوا في المتصفح بس.
import dynamic from 'next/dynamic'
import { useParams, useRouter } from 'next/navigation'
import { useEffect } from 'react'
import { MainLayout } from '@/components/layout'
import { MEET_BASE } from '@/lib/meet-api'

const MeetRoom = dynamic(() => import('@/components/meet/MeetRoom'), {
  ssr: false,
  loading: () => <div className="flex justify-center py-24"><div className="h-8 w-8 animate-spin rounded-full border-2 border-primary-500 border-t-transparent" /></div>,
})

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i

export default function MeetRoomPage() {
  const router = useRouter()
  const id = String(useParams<{ id: string }>()?.id ?? '')
  const valid = UUID.test(id)
  // لينك مش كود اجتماع: رجوع للقايمة
  useEffect(() => {
    if (!valid) router.replace(MEET_BASE)
  }, [valid, router])

  return <MainLayout>{valid ? <MeetRoom key={id} id={id} /> : null}</MainLayout>
}
