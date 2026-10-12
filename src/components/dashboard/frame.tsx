'use client'

// B-ADD.20: هيكل اللوحة الإحصائية — قسم بعنوان وسطر خلاصة ولينك لشاشته التفصيلية، ورسمة جوه كارت بتحميلها وخطئها لوحدها.
// مفيش جدول ولا قايمة صفوف هنا: التفصيل في الشاشة اللي اللينك بيودّي لها.
import { type ReactNode } from 'react'
import { ChevronLeft, RefreshCw } from 'lucide-react'
import ModuleLink from '@/components/ModuleLink'
import { ChartSkeleton } from './charts'

/** حالة تحميل قسم (ناتج useCard) */
export interface Loaded<T> { data: T | null; loading: boolean; error: string; reload: () => void }

/** قسم الحساب مايشوفش كارته: من غير نداء (الخادم كان هيرفضه) — والنتيجة null */
export const gate = <T,>(on: boolean, load: () => Promise<T>) => (): Promise<T | null> => (on ? load() : Promise.resolve(null))

export const sectionId = (key: string) => `dashboard-section-${key}`
/** المؤشر اللي فوق بيودّي لقسمه */
export const jumpTo = (key: string) => { document.getElementById(sectionId(key))?.scrollIntoView({ behavior: 'smooth', block: 'start' }) }

export function Section({ sectionKey, title, takeaway, icon, href, linkLabel, children }: {
  sectionKey: string
  title: string
  /** سطر واحد بيقول الخلاصة من أرقام القسم */
  takeaway?: ReactNode
  icon: ReactNode
  /** الشاشة اللي فيها التفاصيل — من غير لينك لو موديولها مقفول */
  href?: string
  linkLabel?: string
  children: ReactNode
}) {
  return (
    <section id={sectionId(sectionKey)} className="scroll-mt-20" data-dashboard-section={sectionKey}>
      <div className="flex flex-wrap items-end justify-between gap-x-4 gap-y-1 mb-3">
        <div className="min-w-0">
          <h2 className="flex items-center gap-2 text-lg font-bold text-gray-800">
            <span className="text-primary-500 shrink-0" aria-hidden="true">{icon}</span>
            {title}
          </h2>
          {takeaway && <p className="text-sm text-gray-500 mt-0.5" data-section-takeaway>{takeaway}</p>}
        </div>
        {href && (
          <ModuleLink href={href} fallback={null} className="inline-flex items-center gap-1 text-sm text-primary-600 hover:underline shrink-0">
            {linkLabel ?? 'التفاصيل'}
            <ChevronLeft size={14} />
          </ModuleLink>
        )}
      </div>
      {children}
    </section>
  )
}

export function Panel({ title, subtitle, loading, error, onRetry, wide = false, children, panelKey, skeleton = 'h-40', href, linkLabel }: {
  title: string
  subtitle?: ReactNode
  loading: boolean
  error: string
  onRetry: () => void
  /** بعرض عمودين على الشاشة الكبيرة — full = بعرض الشبكة كلها (3 أعمدة) */
  wide?: boolean | 'full'
  children: ReactNode
  panelKey: string
  /** ارتفاع هيكل التحميل */
  skeleton?: string
  /** شاشة تفصيل الرسمة دي لو غير شاشة القسم */
  href?: string
  linkLabel?: string
}) {
  return (
    <div className={`card min-w-0 ${wide === 'full' ? 'lg:col-span-3' : wide ? 'lg:col-span-2' : ''}`} data-dashboard-panel={panelKey}>
      <div className="flex flex-wrap items-start justify-between gap-2 mb-3">
        <div className="min-w-0">
          <h3 className="text-base font-bold text-gray-800">{title}</h3>
          {subtitle && <p className="text-xs text-gray-400 mt-0.5">{subtitle}</p>}
        </div>
        {href && (
          <ModuleLink href={href} fallback={null} className="inline-flex items-center gap-1 text-xs text-primary-600 hover:underline shrink-0">
            {linkLabel ?? 'التفاصيل'}
            <ChevronLeft size={12} />
          </ModuleLink>
        )}
      </div>
      {error ? (
        <p role="alert" className="bg-red-50 text-red-700 rounded-xl p-3 text-sm">
          {error}{' '}
          <button type="button" onClick={onRetry} className="underline inline-flex items-center gap-1"><RefreshCw size={12} />إعادة المحاولة</button>
        </p>
      ) : loading && !children ? (
        <ChartSkeleton height={skeleton} />
      ) : (
        <div className={loading ? 'opacity-60 transition-opacity' : undefined}>{children}</div>
      )}
    </div>
  )
}
