'use client'

import type { ReactNode } from 'react'
import { useModules, type ModuleKey } from '@/lib/modules'

interface ModuleGateProps {
  // الموديول اللي الجزء ده تابع له (اختياري لو فيه ميزة)
  module?: ModuleKey
  // ميزة فرعية لازم تبقى مفعّلة
  feature?: string
  // بديل بيتعرض لو مقفول (الافتراضي: ولا حاجة)
  fallback?: ReactNode
  children: ReactNode
}

/**
 * جزء جوه شاشة مشتركة تابع لموديول (زي تاب «العهد» في ملف الموظف): بيختفي لو الموديول أو الميزة مقفولين.
 * عرض بس — الخادم هو اللي بيفرض (endpoints الموديول المقفول بترجع 404).
 */
export default function ModuleGate({ module, feature, fallback = null, children }: ModuleGateProps) {
  const enabled = useModules()
  // لسه بيتقري: مانعرضش الجزء ولا البديل (مفيش وميض)
  if (!enabled) return null
  if (module && !enabled.modules.includes(module)) return <>{fallback}</>
  if (feature && !enabled.features.includes(feature)) return <>{fallback}</>
  return <>{children}</>
}
