import clsx from 'clsx'
import { PRODUCT_NAME } from '@/lib/product'

/** «بواسطة Logic Leap HR» — اسم المنتج صغير في آخر صفحة الدخول والقائمة الجانبية (الاسم الكبير للشركة) */
export function PoweredBy({ tone = 'light', className }: { tone?: 'light' | 'dark'; className?: string }) {
  return (
    <p
      className={clsx(
        'flex items-center justify-center gap-1.5 text-[11px] leading-none',
        tone === 'dark' ? 'text-white/60' : 'text-gray-400',
        className
      )}
    >
      {/* نجمة ثمانية صغيرة — نفس زخرفة صفحة الدخول */}
      <svg aria-hidden viewBox="0 0 16 16" className="h-3 w-3 shrink-0 text-[#d9a441]" fill="currentColor">
        <rect x="3.3" y="3.3" width="9.4" height="9.4" />
        <rect x="3.3" y="3.3" width="9.4" height="9.4" transform="rotate(45 8 8)" />
      </svg>
      <span>بواسطة</span>
      <bdi className={clsx('font-semibold tracking-wide', tone === 'dark' ? 'text-white/80' : 'text-gray-500')}>
        {PRODUCT_NAME}
      </bdi>
    </p>
  )
}
