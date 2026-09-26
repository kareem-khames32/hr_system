'use client'

import { useState } from 'react'
import clsx from 'clsx'
import type { BrandingView } from '@/lib/branding'

type Size = 'sm' | 'md' | 'lg'

// الارتفاع ثابت والعرض على قد الشعار (مربع أو عريض) بحد أقصى — الشعار العريض بينزّل الاسم لسطر تحته (flex-wrap عند المستخدم)
const SIZES: Record<Size, { box: string; img: string; text: string }> = {
  sm: { box: 'h-10 min-w-10', img: 'h-10 max-w-[8rem]', text: 'text-lg' },
  md: { box: 'h-12 min-w-12', img: 'h-12 max-w-[10rem]', text: 'text-xl' },
  lg: { box: 'h-14 min-w-14', img: 'h-14 max-w-[12rem]', text: 'text-2xl' },
}

interface BrandLogoProps {
  brand: BrandingView
  size?: Size
  /** light = على خلفية فاتحة (القائمة والفورم)، dark = على التدرّج الغامق (الشعار جوه كارت أبيض عشان يبان) */
  tone?: 'light' | 'dark'
  className?: string
}

/**
 * شعار الشركة لو مضبوط، وإلا علامة بالحروف الأولى على نفس ألوان صفحة الدخول (أخضر مزرق غامق بحرف ذهبي).
 * لو الصورة فشلت في التحميل (اتمسحت أو الخادم وقع) بنرجع للعلامة بدل أيقونة صورة مكسورة.
 */
export function BrandLogo({ brand, size = 'md', tone = 'light', className }: BrandLogoProps) {
  const [failedUrl, setFailedUrl] = useState<string | null>(null)
  const s = SIZES[size]

  if (brand.logoUrl && failedUrl !== brand.logoUrl) {
    const url = brand.logoUrl
    const image = (
      // eslint-disable-next-line @next/next/no-img-element
      <img
        src={url}
        alt={`شعار ${brand.companyName}`}
        decoding="async"
        onError={() => setFailedUrl(url)}
        className={clsx('w-auto object-contain', tone === 'dark' ? 'h-full max-w-[10rem]' : s.img, tone === 'light' && className)}
      />
    )
    if (tone === 'light') return image
    return (
      <div className={clsx('flex items-center justify-center rounded-2xl bg-white px-2.5 py-1.5 shadow-lg shadow-black/20', s.box, className)}>
        {image}
      </div>
    )
  }

  return (
    <div
      aria-hidden
      className={clsx(
        'flex items-center justify-center rounded-2xl font-extrabold select-none aspect-square',
        s.box,
        s.text,
        tone === 'dark'
          ? 'bg-white/10 text-[#f3d58a] ring-1 ring-inset ring-white/25 backdrop-blur-md'
          : 'bg-gradient-to-br from-[#0f5a50] to-[#062925] text-[#f3d58a] shadow-lg shadow-[#062925]/25 ring-1 ring-inset ring-white/10',
        className
      )}
    >
      {brand.initials}
    </div>
  )
}
