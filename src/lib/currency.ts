'use client'

// عملة النظام — تُقرأ مرة من إعدادات السيرفر (system.currency) وتُخزّن للجلسة
// الاستخدام: const c = useCurrency() ثم `${amount.toLocaleString()} ${c}`
import { useEffect, useState } from 'react'
import { can, fetchConfig } from './api'

const LABELS: Record<string, string> = {
  SAR: 'ر.س',
  EGP: 'ج.م',
  USD: '$',
  AED: 'د.إ',
}

const KEY = 'hr_currency'
let cached: string | null = null

export const currencyLabel = (code?: string | null): string =>
  LABELS[code ?? ''] ?? code ?? 'ر.س'

// يجلب كود العملة (مع كاش جلسة) — يرجع الرمز الجاهز للعرض
export async function loadCurrency(): Promise<string> {
  if (cached) return cached
  const stored =
    typeof window !== 'undefined' ? sessionStorage.getItem(KEY) : null
  if (stored) {
    cached = stored
    return stored
  }
  // الإعدادات لمن يملك settings.manage فقط؛ غيره يأخذ الافتراضي بلا طلب يرفضه الخادم
  if (!can('settings.manage')) return 'ر.س'
  try {
    const config = await fetchConfig()
    const code = config.find((c) => c.key === 'system.currency')?.value ?? 'SAR'
    const label = currencyLabel(code)
    cached = label
    if (typeof window !== 'undefined') sessionStorage.setItem(KEY, label)
    return label
  } catch {
    return 'ر.س'
  }
}

// بعد تغيير العملة من الإعدادات — امسح الكاش لتظهر فوراً
export const invalidateCurrency = () => {
  cached = null
  if (typeof window !== 'undefined') sessionStorage.removeItem(KEY)
}

// هوك جاهز للشاشات
export function useCurrency(): string {
  const [label, setLabel] = useState<string>(cached ?? 'ر.س')
  useEffect(() => {
    loadCurrency().then(setLabel)
  }, [])
  return label
}
