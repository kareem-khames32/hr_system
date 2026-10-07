import { getCurrentUser, type CurrentUser } from '@/lib/api'
import { localToday } from '@/lib/dates'

// B3.1-ب: بوابة التهيئة قبل المباشرة — حساب موظف مباشرته لسه جاية بيفتح شاشات التهيئة بس (الخادم هو اللي بيفرضها: 403 بكود
// PREBOARDING_ONLY على أي مسار تاني؛ هنا للعرض والتوجيه)
export const PREBOARDING_HOME = '/my/documents'
export const PREBOARDING_PATHS = ['/my/documents', '/my/policies', '/my/tasks', '/notifications', '/profile/security']

/** تاريخ المباشرة لو الحساب لسه في بوابة التهيئة النهارده، وإلا null (من يوم المباشرة العلامة مالهاش أثر) */
export const preboardingUntil = (user: CurrentUser | null = getCurrentUser()): string | null => {
  const until = user?.preboardingUntil
  return typeof until === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(until) && localToday() < until ? until : null
}

export const preboardingPathAllowed = (pathname: string): boolean =>
  PREBOARDING_PATHS.some((path) => pathname === path || pathname.startsWith(`${path}/`))
