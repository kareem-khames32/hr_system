import type { CSSProperties } from 'react'
import clsx from 'clsx'

// ألوان الهوية (صفحة الدخول و«غيّر كلمة المرور»): أخضر مزرق غامق نازل لليل بلمسة ذهبي دافي —
// مقصود إنه بعيد عن أزرق النظام الأساسي («مش شاشة زرقا» — طلب المالك 26 سبتمبر)
export const BRAND_COLORS = {
  teal: '#0f5a50',
  deep: '#0b4640',
  forest: '#072d29',
  night: '#03110f',
  gold: '#e9b949',
  goldLight: '#f3d58a',
} as const

// توهج ذهبي فوق وتوهج زمردي تحت، فوق تدرّج من الأخضر المزرق لليل
const BACKDROP_IMAGE = [
  'radial-gradient(42% 34% at 90% 4%, rgba(243, 213, 138, 0.20), transparent 72%)',
  'radial-gradient(55% 45% at 8% 92%, rgba(16, 185, 129, 0.26), transparent 70%)',
  `linear-gradient(150deg, ${BRAND_COLORS.teal} 0%, ${BRAND_COLORS.deep} 30%, ${BRAND_COLORS.forest} 62%, ${BRAND_COLORS.night} 100%)`,
].join(', ')

// النقشة بتبهت ناحية الأطراف بدل ما تتقطع عند الحافة
const PATTERN_MASK = 'radial-gradient(120% 95% at 50% 35%, black 35%, transparent 90%)'
const PATTERN_STYLE: CSSProperties = { WebkitMaskImage: PATTERN_MASK, maskImage: PATTERN_MASK }

/**
 * نقشة نجمة ثمانية متشابكة (زخرفة إسلامية): نجمة في نص كل بلاطة 64×64، وخطوط بتوصّلها بجيرانها،
 * ومعيّن صغير عند تقاطع الأقطار. بتتكرر بـ<pattern> فتغطي أي مساحة بلا صور خارجية.
 */
function ArabesquePattern({ id, className, style }: { id: string; className?: string; style?: CSSProperties }) {
  return (
    <svg aria-hidden className={className} style={style} xmlns="http://www.w3.org/2000/svg">
      <defs>
        <pattern id={id} width="64" height="64" patternUnits="userSpaceOnUse">
          <g fill="none" stroke="currentColor" strokeWidth="1">
            <rect x="20" y="20" width="24" height="24" />
            <rect x="20" y="20" width="24" height="24" transform="rotate(45 32 32)" />
            <circle cx="32" cy="32" r="5" />
            <path d="M32 15V0M32 49v15M15 32H0M49 32h15" />
            <path d="M20 20 0 0M44 20 64 0M20 44 0 64M44 44l20 20" />
            <path d="M0 -7 7 0 0 7-7 0ZM64 -7l7 7-7 7-7-7ZM0 57l7 7-7 7-7-7ZM64 57l7 7-7 7-7-7Z" />
          </g>
        </pattern>
      </defs>
      <rect width="100%" height="100%" fill={`url(#${id})`} />
    </svg>
  )
}

/** وردة كبيرة (نجمتين ثمانيتين وحلقات) بتلف ببطء شديد — زخرفة بس */
function Rosette({ className }: { className?: string }) {
  return (
    <svg aria-hidden viewBox="0 0 200 200" fill="none" stroke="currentColor" className={className}>
      <circle cx="100" cy="100" r="96" strokeWidth="0.35" strokeDasharray="1.5 3.5" />
      <circle cx="100" cy="100" r="78" strokeWidth="0.4" />
      <rect x="45" y="45" width="110" height="110" strokeWidth="0.6" />
      <rect x="45" y="45" width="110" height="110" strokeWidth="0.6" transform="rotate(45 100 100)" />
      <rect x="66" y="66" width="68" height="68" strokeWidth="0.5" transform="rotate(22.5 100 100)" />
      <rect x="66" y="66" width="68" height="68" strokeWidth="0.5" transform="rotate(67.5 100 100)" />
      <circle cx="100" cy="100" r="22" strokeWidth="0.6" />
    </svg>
  )
}

interface BrandBackdropProps {
  /** معرّف النقشة — لازم يبقى فريد في الصفحة */
  patternId: string
  /** الوردة الكبيرة والتوهجات المتحركة — الشريط المضغوط على الموبايل بيخفيها بكلاس (hidden lg:block) */
  ornamentClassName?: string
  className?: string
}

/**
 * خلفية الهوية: التدرّج + النقشة + وردة وتوهجات بتتحرك بهدوء.
 * الأب لازم يبقى relative isolate. الحركة كلها من globals.css (ll-*) وبتقف مع «تقليل الحركة».
 */
export function BrandBackdrop({ patternId, ornamentClassName, className }: BrandBackdropProps) {
  return (
    <div
      aria-hidden
      className={clsx('pointer-events-none absolute inset-0 -z-10 overflow-hidden', className)}
      style={{ backgroundImage: BACKDROP_IMAGE }}
    >
      <ArabesquePattern
        id={patternId}
        className="absolute inset-0 h-full w-full text-[#f3d58a] opacity-[0.12]"
        style={PATTERN_STYLE}
      />
      <div className={ornamentClassName}>
        <div className="ll-drift absolute -top-28 -right-20 h-72 w-72 rounded-full bg-[#e9b949]/[0.14] blur-3xl" />
        <div className="ll-drift-slow absolute -bottom-28 -left-10 h-80 w-80 rounded-full bg-emerald-400/20 blur-3xl" />
        <Rosette className="ll-spin-slow absolute -bottom-44 -left-44 h-[36rem] w-[36rem] text-[#f3d58a]/25" />
      </div>
      {/* عمق خفيف تحت عشان الكلام الأبيض يفضل واضح */}
      <div className="absolute inset-x-0 bottom-0 h-1/2 bg-gradient-to-t from-[#03110f]/60 to-transparent" />
    </div>
  )
}
