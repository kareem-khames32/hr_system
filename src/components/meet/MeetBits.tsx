'use client'

// B-ADD.15: قطع صغيرة مشتركة في شاشات الاجتماعات — دايرة الاسم، ونافذة التأكيد.
import type { ReactNode } from 'react'
import { X } from 'lucide-react'
import { hueOf, initialsOf } from '@/lib/meet-api'

export function MeetAvatar({ id, name, size = 32 }: { id: string | number; name: string; size?: number }) {
  return (
    <span aria-hidden="true" className="inline-flex shrink-0 items-center justify-center rounded-full font-semibold text-white"
      style={{ width: size, height: size, fontSize: size * 0.4, background: `hsl(${hueOf(id)} 45% 38%)` }}>
      {initialsOf(name)}
    </span>
  )
}

/** نافذة فوق الشاشة (فوق غرفة الاجتماع كمان) */
export function MeetModal({ title, onClose, footer, children, wide = false }: { title: string; onClose: () => void; footer?: ReactNode; children: ReactNode; wide?: boolean }) {
  return (
    <div className="fixed inset-0 z-[90] flex items-center justify-center bg-black/50" role="dialog" aria-modal="true" aria-label={title}>
      <div className={`mx-4 flex max-h-[90vh] w-full flex-col rounded-2xl bg-white text-gray-800 ${wide ? 'max-w-xl' : 'max-w-md'}`}>
        <div className="flex items-center justify-between border-b border-gray-100 p-5">
          <h2 className="text-lg font-bold text-gray-800">{title}</h2>
          <button type="button" onClick={onClose} className="rounded-lg p-2 hover:bg-gray-100" aria-label="إغلاق">
            <X size={20} />
          </button>
        </div>
        <div className="overflow-auto p-5">{children}</div>
        {footer && <div className="flex flex-wrap items-center gap-2 border-t border-gray-100 p-5">{footer}</div>}
      </div>
    </div>
  )
}
