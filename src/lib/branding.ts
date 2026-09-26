import { useMemo, useSyncExternalStore } from 'react'
import { fetchBranding, type Branding } from './api'
import { PRODUCT_NAME } from './product'

// هوية الشركة (طلب المالك 26 سبتمبر): اسم الشركة وشعارها من «الإعدادات ← بيانات الشركة» فوق القائمة الجانبية
// وفي صفحة الدخول، واسم المنتج ثابت صغير («بواسطة Logic Leap HR»). النقطة عامة بلا توكن (GET /api/branding).
// جلب واحد لكل تحميل صفحة، ونسخة في sessionStorage للرسم الفوري في الصفحة الجاية، وإعادة الجلب لما شاشة
// «بيانات الشركة» تحفظ الاسم أو الشعار (حدث BRANDING_CHANGED) — من غير إعادة تحميل.
export { PRODUCT_NAME }

/** حدث نافذة بعد حفظ اسم الشركة أو شعارها — كل اللي بيعرض الهوية بيعيد جلبها */
export const BRANDING_CHANGED = 'hr:branding-changed'

const STORAGE_KEY = 'hr_branding'

interface BrandingState {
  branding: Branding | null
  /** وصلنا لقرار: رد الخادم أو نسخة الجلسة أو فشل الجلب (= الاحتياطي). قبله الشاشة بترسم هيكل بدل اسم احتياطي يومض ويتغيّر */
  settled: boolean
}

const PENDING: BrandingState = { branding: null, settled: false }
let state: BrandingState | null = null // null = نسخة الجلسة لسه ماتقرتش
let requested = false
let generation = 0
let listening = false
const listeners = new Set<() => void>()

const isBranding = (value: unknown): value is Branding => {
  if (!value || typeof value !== 'object') return false
  const row = value as Record<string, unknown>
  return (
    typeof row.productName === 'string' &&
    (row.companyName === null || typeof row.companyName === 'string') &&
    (row.logoUrl === null || typeof row.logoUrl === 'string')
  )
}

const readStored = (): Branding | null => {
  try {
    const raw = sessionStorage.getItem(STORAGE_KEY)
    if (!raw) return null
    const parsed: unknown = JSON.parse(raw)
    return isBranding(parsed) ? parsed : null
  } catch {
    return null
  }
}

const writeStored = (branding: Branding) => {
  try {
    sessionStorage.setItem(STORAGE_KEY, JSON.stringify(branding))
  } catch {
    /* تخزين غير متاح — الجلب كل صفحة بيكفي */
  }
}

const getSnapshot = (): BrandingState => {
  if (state === null) {
    const stored = readStored()
    state = stored ? { branding: stored, settled: true } : PENDING
  }
  return state
}

// على الخادم وأثناء الـhydration: هيكل (نسخة الجلسة مش موجودة هناك) — بعدها React بيرسم النسخة المحفوظة فورًا
const getServerSnapshot = (): BrandingState => PENDING

const publish = (next: BrandingState) => {
  state = next
  listeners.forEach((listener) => listener())
}

// رد قديم وصل بعد طلب أحدث (حفظ ورا حفظ) مايكتبش فوقه
const load = () => {
  const mine = ++generation
  fetchBranding()
    .then((branding) => {
      if (mine !== generation) return
      writeStored(branding)
      publish({ branding, settled: true })
    })
    .catch(() => {
      if (mine !== generation) return
      // الخادم مش متاح: آخر نسخة معروفة، وإلا الاحتياطي (اسم المنتج بلا شعار) — الدخول نفسه مايتعطلش
      const current = getSnapshot()
      if (!current.settled) publish({ branding: current.branding, settled: true })
    })
}

const subscribe = (listener: () => void) => {
  listeners.add(listener)
  if (!listening) {
    listening = true
    window.addEventListener(BRANDING_CHANGED, load)
  }
  // مرة واحدة لكل تحميل صفحة: التنقل جوّه النظام مايعيدش الجلب، والحدث بس هو اللي بيعيده
  if (!requested) {
    requested = true
    load()
  }
  return () => {
    listeners.delete(listener)
  }
}

// كلمات عامة في أول الاسم ماتنفعش علامة («شركة مهارة» ← م مش ش)
const GENERIC_WORDS = new Set(['شركة', 'الشركة', 'مؤسسة', 'المؤسسة', 'مجموعة', 'المجموعة', 'مصنع', 'مكتب', 'company', 'the', 'group'])
const firstLetter = (word: string) => word.match(/[A-Za-z0-9ء-ي]/)?.[0] ?? ''

/** العلامة البديلة لما مفيش شعار: الاسم اللاتيني بحرفين (Logic Leap HR ← LL)، والعربي بأول حرف من غير «ال» (المهارة ← م) */
export const brandInitials = (name: string): string => {
  const words = name.trim().split(/\s+/).filter((word) => firstLetter(word))
  const meaningful = words.filter((word) => !GENERIC_WORDS.has(word.toLowerCase()))
  const list = meaningful.length > 0 ? meaningful : words
  if (list.length === 0) return ''
  if (/[A-Za-z]/.test(firstLetter(list[0]))) {
    return list.slice(0, 2).map(firstLetter).filter((letter) => /[A-Za-z0-9]/.test(letter)).join('').toUpperCase()
  }
  return firstLetter(list[0].replace(/^ال(?=[ء-ي]{2,})/, ''))
}

export interface BrandingView {
  /** false لحد أول قرار — اعرض هيكل مكان الاسم والشعار */
  ready: boolean
  /** الاسم المعروض: اسم الشركة، ولو لسه مش مضبوط اسم المنتج */
  companyName: string
  /** اسم الشركة مضبوط فعلًا في «بيانات الشركة» */
  hasCompanyName: boolean
  /** رابط الشعار (عام) — null = مفيش شعار صالح، والشاشة بتعرض العلامة بالحروف */
  logoUrl: string | null
  initials: string
}

export function useBranding(): BrandingView {
  const current = useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot)
  return useMemo(() => {
    const configured = current.branding?.companyName?.trim() ?? ''
    const companyName = configured || PRODUCT_NAME
    return {
      ready: current.settled,
      companyName,
      hasCompanyName: configured.length > 0,
      logoUrl: current.branding?.logoUrl ?? null,
      initials: brandInitials(companyName),
    }
  }, [current])
}
