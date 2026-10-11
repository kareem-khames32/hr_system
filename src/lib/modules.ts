'use client'

// الموديولات والمزايا المفعّلة للمستخدم الحالي (خطة التنفيذ — الجزء 3): القايمة الجانبية وحارس المسارات و<ModuleGate> بيبنوا عليها.
// بتتقري مرة للجلسة من GET /modules/enabled (بعد جمهور التفعيل) وتتخزن؛ الفرض الحقيقي في الخادم (الموديول المقفول بيرجع 404).
// الاستخدام: const enabled = useModules() ثم routeAvailable(path, enabled)، أو useModuleEnabled('recruitment').
import { useCallback, useEffect, useState } from 'react'
import { apiFetch, getCurrentUser, onApiRouteMissing, sessionMark } from './api'
// نفس سجل الخادم بالحرف (ملف بيانات صرف مشترك): الموديولات ومساراتها والمزايا والباقات
import { enabledSnapshot, routeAvailable } from '../../api/src/modules-registry/registry'
export {
  MODULE_GROUPS, MODULE_PRESETS, routeAvailable, routeOwner,
  type ModuleGroup, type ModuleKey, type ModulePreset,
} from '../../api/src/modules-registry/registry'

export interface EnabledModules {
  modules: string[]
  features: string[]
}

// افتراضي السجل (كل الموجود مفعّل، والمزايا على افتراضيها): قبل ما الحالة تتقري، ولو الخادم ماردّش —
// القايمة ماتفضاش، والخادم برضه بيرفض المقفول
export const DEFAULT_MODULES: EnabledModules = enabledSnapshot({ modules: {}, features: {} })

const KEY = 'hr_enabled_modules'
// بعد المدة دي الحالة بتتجدد في الخلفية: موديول اتفتح أو اتقفل من حساب تاني بيوصل للتبويبات المفتوحة من غير دخول جديد
const FRESH_MS = 5 * 60_000
// أقل مدة بين تجديدين سببهم مسار رجّع «مش موجود» (صفحة بتنادي مسار غلط ماتعملش سيل نداءات)
const MISS_REFRESH_MS = 30_000
// لو أول قراءة للجلسة فشلت: إعادة محاولة بعد المدة دي (الشاشات بتشتغل على افتراضي السجل لحد ما تنجح)
const RETRY_MS = 5_000
let cached: { session: string; enabled: EnabledModules; at: number } | null = null
let pending: { session: string; request: Promise<EnabledModules> } | null = null
// بيزيد مع كل مسح للكاش: رد قديم وصل بعد المسح مايتخزنش فوق الجديد
let generation = 0
let lastMissRefresh = 0
// أول قراءة للجلسة فشلت ولسه مانجحتش، ومؤقّت إعادة المحاولة
let failedOnce = false
let retryTimer: ReturnType<typeof setTimeout> | null = null
const listeners = new Set<() => void>()

const valid = (value: unknown): value is EnabledModules => {
  const row = value as EnabledModules | null
  return !!row && Array.isArray(row.modules) && Array.isArray(row.features) &&
    row.modules.every((item) => typeof item === 'string') && row.features.every((item) => typeof item === 'string')
}

// الكاش مربوط بالجلسة نفسها (رقم الحساب + آخر التوكن): دخول جديد بيقرا من جديد، وحساب تاني في نفس التبويب مايورثش.
// حساب بكلمة مرور مؤقتة مالوش جلسة هنا: الخادم قافل عليه كل حاجة غير «غيّر كلمة المرور»
const currentSession = (): string | null => {
  const user = getCurrentUser(), mark = sessionMark()
  // B2.17-ج: ونفس الحكاية لجلسة «فعّل تطبيق المصادقة الأول»
  return user && mark && !user.mustChangePassword && !user.totpSetupRequired ? `${user.id}:${mark}` : null
}

function cachedFor(session: string): { enabled: EnabledModules; at: number } | null {
  if (cached && cached.session === session) return cached
  if (typeof window === 'undefined') return null
  try {
    const stored = JSON.parse(sessionStorage.getItem(KEY) ?? 'null')
    if (stored && stored.session === session && valid(stored.enabled)) {
      cached = { session, enabled: stored.enabled, at: typeof stored.at === 'number' ? stored.at : 0 }
      return cached
    }
  } catch { /* تخزين غير متاح أو تالف: يتقري من الخادم */ }
  return null
}

const sameEnabled = (a: EnabledModules, b: EnabledModules) => a.modules.join() === b.modules.join() && a.features.join() === b.features.join()

// قراءة من الخادم (نداء واحد للجلسة في نفس الوقت). لو الخادم ماردّش: المخزّن زي ما هو، أو افتراضي السجل من غير تخزين.
// الشاشات المفتوحة بتتبلّغ لو الحالة اتغيّرت فعلًا بس — نفس الحالة مابتعيدش رسم ولا نداءات.
function fetchModules(session: string): Promise<EnabledModules> {
  if (pending && pending.session === session) return pending.request
  const started = generation
  const kept = () => (cached && cached.session === session ? cached.enabled : DEFAULT_MODULES)
  const request: Promise<EnabledModules> = apiFetch<EnabledModules>('/modules/enabled')
    .then((enabled) => {
      if (!valid(enabled)) return kept()
      if (started !== generation) return enabled
      const previous = cached && cached.session === session ? cached.enabled : null
      const next = previous && sameEnabled(previous, enabled) ? previous : enabled
      cached = { session, enabled: next, at: Date.now() }
      try { sessionStorage.setItem(KEY, JSON.stringify(cached)) } catch { /* تخزين غير متاح */ }
      // الشاشات المفتوحة بتتبلّغ لو الحالة اتغيّرت، ولو دي أول قراءة ناجحة بعد فشل (كانت شغالة على افتراضي السجل)
      if (next !== previous && (previous || failedOnce)) listeners.forEach((listener) => listener())
      failedOnce = false
      return next
    })
    .catch(() => {
      // مفيش حالة مخزّنة والقراءة فشلت: جرّب تاني بعد شوية بدل ما التبويب يفضل على الافتراضي لحد الدخول الجاي
      if (!(cached && cached.session === session)) {
        failedOnce = true
        if (typeof window !== 'undefined' && !retryTimer) {
          retryTimer = setTimeout(() => { retryTimer = null; if (currentSession() === session && !cachedFor(session)) void fetchModules(session) }, RETRY_MS)
        }
      }
      return kept()
    })
    .finally(() => { if (pending?.request === request) pending = null })
  pending = { session, request }
  return request
}

/** المفعّل للمستخدم الحالي (مع كاش الجلسة). من غير جلسة، أو لو الخادم ماردّش: افتراضي السجل من غير ما يتخزن. */
export async function loadModules(): Promise<EnabledModules> {
  const session = currentSession()
  if (!session) return DEFAULT_MODULES
  const hit = cachedFor(session)
  if (!hit) return fetchModules(session)
  // المخزّن قديم: يتعرض زي ما هو، والجديد بيتقري في الخلفية
  if (Date.now() - hit.at > FRESH_MS) void fetchModules(session)
  return hit.enabled
}

/** بعد تفعيل أو قفل موديول من «الإعدادات ← الموديولات»: امسح الكاش والشاشات المفتوحة تقرا الحالة الجديدة. */
export const invalidateModules = () => {
  generation += 1
  cached = null
  pending = null
  lastMissRefresh = 0
  failedOnce = false
  if (retryTimer) { clearTimeout(retryTimer); retryTimer = null }
  try { if (typeof window !== 'undefined') sessionStorage.removeItem(KEY) } catch { /* تخزين غير متاح */ }
  listeners.forEach((listener) => listener())
}

// مسار رجّع 404 بشكل «مسار مش موجود»: غالبًا موديوله اتقفل من حساب تاني والتبويب ده لسه على الحالة القديمة — جدّد في الخلفية
onApiRouteMissing(() => {
  const session = currentSession()
  if (!session || Date.now() - lastMissRefresh < MISS_REFRESH_MS) return
  lastMissRefresh = Date.now()
  void fetchModules(session)
})

/** المفعّل للمستخدم الحالي — null لحد ما يتقري (أول رسم بعد الدخول بس؛ بعدها من كاش الجلسة). */
export function useModules(): EnabledModules | null {
  const session = currentSession()
  const [state, setState] = useState<{ session: string | null; enabled: EnabledModules } | null>(() => {
    const hit = session ? cachedFor(session) : null
    return hit ? { session, enabled: hit.enabled } : null
  })
  useEffect(() => {
    let active = true
    const read = () => { void loadModules().then((enabled) => { if (active) setState({ session, enabled }) }) }
    listeners.add(read)
    read()
    return () => { active = false; listeners.delete(read) }
  }, [session])
  // حالة جلسة تانية (دخول بحساب جديد من غير إعادة تحميل) ماتتعرضش للجلسة دي
  return state && state.session === session ? state.enabled : null
}

/** الموديول مفعّل؟ (false لحد ما الحالة تتقري — الجزء المشروط مايرمشش) */
export function useModuleEnabled(module: string): boolean {
  return !!useModules()?.modules.includes(module)
}

/** الميزة الفرعية مفعّلة؟ */
export function useFeatureEnabled(feature: string): boolean {
  return !!useModules()?.features.includes(feature)
}

/** المسار متاح بالموديولات المفعّلة؟ (true لحد ما الحالة تتقري — الحارس مايرفضش صفحة قبل ما يعرف) */
export function useRouteAvailable(pathname: string): boolean {
  const enabled = useModules()
  return !enabled || routeAvailable(pathname, enabled)
}

/** فلتر لينكات: `links.filter((link) => available(link.href))` — لينك لشاشة موديول مقفول مايتعرضش (مايوديش على «الصفحة دي مش متاحة») */
export function useRouteFilter(): (href: string) => boolean {
  const enabled = useModules()
  return useCallback((href: string) => !enabled || routeAvailable(href, enabled), [enabled])
}
