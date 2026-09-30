'use client'

// العملة تبع الفرع (قرار المالك 30 سبتمبر): فرع مصري = جنيه، فرع سعودي = ريال، والفرع من غير دولة = عملة النظام — تسمية بس، مفيش تحويل.
// السياق بيتقري مرة لأي مستخدم داخل من GET /settings/currency-context (من غير أي صلاحية إعدادات) ويتخزن للجلسة:
// عملة النظام، وعملة فرع موظف الحساب، ورقم كل فرع في نطاقه وعملته.
// الاستخدام: const c = useCurrency(employee?.branchId) ثم `${amount.toLocaleString()} ${c}` — ومن غير فرع = عملة الشاشة العامة.
import { useEffect, useState } from 'react'
import { apiFetch, getCurrentUser, type CurrentUser } from './api'
// نفس قاعدة الخادم بالحرف (ملف صرف مشترك): دولة الفرع ← عملته، ومن غير دولة ← عملة النظام
export { branchCurrency } from '../../api/src/org/branch-currency'

export interface CurrencyContext {
  defaultCurrency: string
  ownCurrency: string | null
  branches: Array<{ id: number; currency: string }>
}

const LABELS: Record<string, string> = {
  SAR: 'ر.س',
  EGP: 'ج.م',
  USD: '$',
  AED: 'د.إ',
}
const NAMES: Record<string, string> = {
  SAR: 'ريال سعودي',
  EGP: 'جنيه مصري',
  USD: 'دولار أمريكي',
  AED: 'درهم إماراتي',
}

// الكود ← الرمز المختصر (ر.س / ج.م)؛ الفاضي = فاضي (مفيش افتراض ريال)
export const currencyLabel = (code?: string | null): string => (code ? LABELS[code] ?? code : '')
// الكود ← الاسم الكامل (جنيه مصري / ريال سعودي)
export const currencyName = (code?: string | null): string => (code ? NAMES[code] ?? code : '')

const KEY = 'hr_currency_context'
let cached: { userId: number | null; context: CurrencyContext } | null = null
let pending: Promise<CurrencyContext | null> | null = null
// بيزيد مع كل مسح للكاش: رد قديم وصل بعد المسح مايتخزنش فوق الجديد
let generation = 0
const listeners = new Set<(context: CurrencyContext | null) => void>()

const validContext = (value: unknown): value is CurrencyContext => {
  const row = value as CurrencyContext | null
  return !!row && typeof row.defaultCurrency === 'string' && (row.ownCurrency === null || typeof row.ownCurrency === 'string') &&
    Array.isArray(row.branches) && row.branches.every((branch) => Number.isSafeInteger(branch?.id) && typeof branch?.currency === 'string')
}

// الكاش لحساب الجلسة الحالي بس — حساب تاني في نفس التبويب مايورثش سياق اللي قبله
function cachedFor(userId: number | null): CurrencyContext | null {
  if (cached && cached.userId === userId) return cached.context
  if (typeof window === 'undefined') return null
  try {
    const stored = JSON.parse(sessionStorage.getItem(KEY) ?? 'null')
    if (stored && stored.userId === userId && validContext(stored.context)) {
      cached = stored
      return stored.context
    }
  } catch { /* تخزين غير متاح أو تالف: يتقري من الخادم */ }
  return null
}

/** سياق العملة (مع كاش الجلسة)؛ null لو مفيش جلسة أو الخادم ماردّش — الشاشة بتفضل من غير رمز عملة بدل رمز غلط. */
export async function loadCurrencyContext(): Promise<CurrencyContext | null> {
  const user = getCurrentUser()
  if (!user) return null
  const hit = cachedFor(user.id)
  if (hit) return hit
  if (!pending) {
    const started = generation
    const request: Promise<CurrencyContext | null> = apiFetch<CurrencyContext>('/settings/currency-context')
      .then((context) => {
        if (!validContext(context)) return null
        if (started !== generation) return context
        cached = { userId: user.id, context }
        try { sessionStorage.setItem(KEY, JSON.stringify(cached)) } catch { /* تخزين غير متاح */ }
        listeners.forEach((listener) => listener(context))
        return context
      })
      .catch(() => null)
      .finally(() => { if (pending === request) pending = null })
    pending = request
  }
  return pending
}

// حساب من غير أي صلاحية إدارية (دور «موظف») = خدمة ذاتية بس
const hasAdminPermissions = (user: Pick<CurrentUser, 'role' | 'permissions'> | null | undefined) =>
  !!user && (user.role === 'super_admin' || (user.permissions ?? []).length > 0)

/**
 * كود العملة: فرع محدد في النطاق = عملته. من غير فرع (أو فرع برّه النطاق): الموظف من غير صلاحيات إدارية = عملة فرعه هو،
 * وغيره = عملة فرعه الوحيد في النطاق، أو العملة المشتركة لو كل فروع نطاقه بعملة واحدة، وإلا عملة النظام.
 */
export function currencyCodeFor(context: CurrencyContext | null, branchId?: number | null,
  user: Pick<CurrentUser, 'role' | 'permissions'> | null | undefined = getCurrentUser()): string {
  if (!context) return ''
  if (branchId != null) {
    const hit = context.branches.find((branch) => branch.id === Number(branchId))
    if (hit) return hit.currency
  }
  if (!hasAdminPermissions(user)) return context.ownCurrency ?? context.defaultCurrency
  const codes = [...new Set(context.branches.map((branch) => branch.currency))]
  return codes.length === 1 ? codes[0] : context.defaultCurrency
}

/** رمز العملة الجاهز للعرض لفرع (أو للشاشة العامة من غير فرع). */
export async function loadCurrency(branchId?: number | null): Promise<string> {
  return currencyLabel(currencyCodeFor(await loadCurrencyContext(), branchId))
}

// بعد تغيير عملة النظام أو دولة فرع — امسح الكاش والشاشات المفتوحة تقرا السياق الجديد
export const invalidateCurrency = () => {
  generation += 1
  cached = null
  pending = null
  try { if (typeof window !== 'undefined') sessionStorage.removeItem(KEY) } catch { /* تخزين غير متاح */ }
  listeners.forEach((listener) => listener(null))
  if (listeners.size) void loadCurrencyContext()
}

/** سياق العملة للشاشة (null لحد ما يتقري). */
export function useCurrencyContext(): CurrencyContext | null {
  const [context, setContext] = useState<CurrencyContext | null>(() => (cached && cached.userId === (getCurrentUser()?.id ?? null) ? cached.context : null))
  useEffect(() => {
    let active = true
    const listener = (next: CurrencyContext | null) => { if (active) setContext(next) }
    listeners.add(listener)
    loadCurrencyContext().then((next) => { if (active && next) setContext(next) })
    return () => { active = false; listeners.delete(listener) }
  }, [])
  return context
}

/** كود عملة الفرع (EGP / SAR) — فاضي لحد ما السياق يتقري. */
export function useCurrencyCode(branchId?: number | null): string {
  return currencyCodeFor(useCurrencyContext(), branchId)
}

// هوك جاهز للشاشات: رمز عملة فرع الموظف (ومن غير فرع = عملة الشاشة العامة)
export function useCurrency(branchId?: number | null): string {
  return currencyLabel(useCurrencyCode(branchId))
}

/** عملة الحساب نفسه (فرع موظفه) — لشاشات بياناته هو زي «ملفي». */
export function useOwnCurrency(): string {
  const context = useCurrencyContext()
  return currencyLabel(context ? context.ownCurrency ?? context.defaultCurrency : '')
}

/** للجداول اللي كل صف فيها لموظف: دالة ترجع رمز عملة فرع الصف. */
export function useBranchCurrency(): (branchId?: number | null) => string {
  const context = useCurrencyContext()
  return (branchId) => currencyLabel(currencyCodeFor(context, branchId))
}
