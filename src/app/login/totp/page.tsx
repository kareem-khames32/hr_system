'use client'

import { useEffect, useState } from 'react'
import { LogOut, ShieldCheck } from 'lucide-react'
import { getCurrentUser, hasSession, logout as endSession } from '@/lib/api'
import { useBranding } from '@/lib/branding'
import { BrandLogo } from '@/components/branding/BrandLogo'
import { BrandBackdrop } from '@/components/branding/BrandBackdrop'
import { PoweredBy } from '@/components/branding/PoweredBy'
import TotpSetup from '@/components/security/TotpSetup'

// B2.17-ج: «فعّل تطبيق المصادقة الأول» — تحت /login فبتفتح من غير إطار النظام. اللي دوره تطبيق المصادقة إلزامي له ولسه مافعّلش
// بيتوجّه هنا، والخادم قافل عليه كل حاجة غير التفعيل.
export default function TotpGatePage() {
  const brand = useBranding()
  const [ready, setReady] = useState(false)
  const [name, setName] = useState('')

  useEffect(() => {
    if (!hasSession()) {
      window.location.href = '/login'
      return
    }
    const user = getCurrentUser()
    // مش مطلوب منه تفعيل (أو فعّل خلاص): مكانه النظام
    if (!user?.totpSetupRequired) {
      window.location.href = '/'
      return
    }
    setName(user.displayName ?? '')
    setReady(true)
  }, [])

  const logout = () => {
    void endSession().then(() => { window.location.href = '/login' })
  }

  if (!ready) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="w-8 h-8 border-2 border-primary-500 border-t-transparent rounded-full animate-spin" />
      </div>
    )
  }

  return (
    <div className="relative isolate min-h-screen overflow-hidden flex items-center justify-center p-4" dir="rtl">
      <BrandBackdrop patternId="ll-totp-gate-pattern" ornamentClassName="hidden sm:block" />
      <div className="ll-rise w-full max-w-md py-6">
        <div className="flex items-center justify-center gap-3 mb-6 min-h-12">
          {brand.ready && (
            <>
              <BrandLogo brand={brand} size="md" tone="dark" className="shrink-0" />
              <p title={brand.companyName} className="min-w-0 font-bold text-lg text-white leading-snug line-clamp-2 break-words"><bdi>{brand.companyName}</bdi></p>
            </>
          )}
        </div>
        <div className="bg-white rounded-3xl shadow-xl p-6 sm:p-8" data-totp-gate>
          <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-2xl bg-teal-50 text-teal-700 ring-1 ring-inset ring-teal-600/15">
            <ShieldCheck className="h-6 w-6" />
          </div>
          <h1 className="text-2xl font-extrabold text-gray-900 mb-2">فعّل تطبيق المصادقة</h1>
          <p className="text-sm leading-6 text-gray-500 mb-5">
            {name ? `أهلاً ${name}. ` : ''}دورك في النظام محتاج تحقق بتطبيق مصادقة على الموبايل. فعّله مرة واحدة وبعدها كل دخول هيطلب رمز من التطبيق.
          </p>
          <TotpSetup onEnabled={() => { window.location.href = '/' }} />
          <button type="button" onClick={logout} className="mt-6 flex items-center gap-2 text-sm text-gray-500 hover:text-gray-700">
            <LogOut size={16} />
            تسجيل الخروج
          </button>
        </div>
        <PoweredBy tone="dark" className="mt-6" />
      </div>
    </div>
  )
}
