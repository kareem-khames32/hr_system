'use client'

import { useEffect, useState } from 'react'
import { Download } from 'lucide-react'

// B2.12 (ب): «ثبّت التطبيق على الجهاز» — بيظهر بس لما المتصفح نفسه يعرض التثبيت (حدث beforeinstallprompt: كروم وإيدج على أندرويد
// والكمبيوتر، وعلى HTTPS أو localhost)، وبيختفي بعد التثبيت. على iOS التثبيت من «مشاركة ← إضافة إلى الشاشة الرئيسية»: سفاري
// مابيبعتش الحدث، فالزرار مابيظهرش هناك.
type InstallPrompt = Event & { prompt: () => Promise<void>; userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }> }

export function InstallAppButton({ className = '' }: { className?: string }) {
  const [offer, setOffer] = useState<InstallPrompt | null>(null)

  useEffect(() => {
    const offered = (event: Event) => {
      // من غير شريط المتصفح الصغير: العرض بيتأجل لحد ما المستخدم يضغط الزرار
      event.preventDefault()
      setOffer(event as InstallPrompt)
    }
    const installed = () => setOffer(null)
    window.addEventListener('beforeinstallprompt', offered)
    window.addEventListener('appinstalled', installed)
    return () => {
      window.removeEventListener('beforeinstallprompt', offered)
      window.removeEventListener('appinstalled', installed)
    }
  }, [])

  if (!offer) return null

  const install = async () => {
    await offer.prompt()
    await offer.userChoice.catch(() => undefined)
    // العرض بيتستعمل مرة واحدة (قبول أو رفض): الزرار بيختفي لحد ما المتصفح يعرض تاني
    setOffer(null)
  }

  return (
    <button
      type="button"
      onClick={() => void install()}
      className={`flex w-full items-center justify-center gap-2 rounded-lg border border-primary-200 bg-primary-50 px-3 py-2 text-sm font-medium text-primary-700 hover:bg-primary-100 ${className}`}
      data-install-app
    >
      <Download size={16} />
      ثبّت التطبيق على الجهاز
    </button>
  )
}
