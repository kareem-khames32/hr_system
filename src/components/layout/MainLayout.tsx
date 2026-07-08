'use client'

import { useEffect, useState } from 'react'
import { getToken } from '@/lib/api'
import Sidebar from './Sidebar'
import Header from './Header'

interface MainLayoutProps {
  children: React.ReactNode
}

// حارس الدخول: كل شاشات النظام تمر من هنا — بلا توكن → صفحة اللوجين
export default function MainLayout({ children }: MainLayoutProps) {
  const [authed, setAuthed] = useState<boolean | null>(null)

  useEffect(() => {
    if (!getToken()) {
      window.location.href = '/login'
      return
    }
    setAuthed(true)
  }, [])

  // لا نعرض محتوى محمي قبل التحقق (يمنع وميض البيانات)
  if (!authed) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="w-8 h-8 border-2 border-primary-500 border-t-transparent rounded-full animate-spin" />
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <Sidebar />
      <div className="mr-72">
        <Header />
        <main className="p-8">
          {children}
        </main>
      </div>
    </div>
  )
}
