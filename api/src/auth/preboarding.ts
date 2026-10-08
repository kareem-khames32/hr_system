import { SetMetadata } from '@nestjs/common'

// B3.1-ب: بوابة التهيئة قبل المباشرة. حساب موظف تاريخ مباشرته لسه جاي (والميزة onboarding.preboarding مفتوحة) جلسته بتتفتح بعلامة
// preboardingUntil (تاريخ المباشرة) ومن غير أي صلاحية إدارية: لحد التاريخ ده الجلسة مابتفتحش غير المسارات المعلَّمة بـ@AllowPreboarding()
// (مستنداته، السياسات وإقرارها، مهامه، إشعاراته، وبيانات جلسته) — نفس شكل بوابة «غيّر كلمة المرور» (guards.ts). مفيش حالة موظف جديدة:
// الحكم بتاريخ المباشرة نفسه (actualStartDate، وإلا joinDate).

export const PREBOARDING_FEATURE = 'onboarding.preboarding'
export const PREBOARDING_ONLY = 'PREBOARDING_ONLY'
export const preboardingMessage = (until: string): string =>
  `حسابك في بوابة التهيئة لحد تاريخ مباشرتك ${until} — المتاح دلوقتي: مستنداتك، والسياسات، ومهامك`

/**
 * Codex P3K-B01: دور جلسة بوابة التهيئة. الجلسة المقيدة مابتشيلش دور الحساب (ولا صلاحياته): أحكام كتير بتدّي سلطة باسم الدور نفسه
 * (زي خطوة الموارد البشرية ومهام دورها)، فالجلسة بتتفتح بدور الموظف العادي لحد أول دخول بعد المباشرة.
 */
export const PREBOARDING_SESSION_ROLE = 'employee'

export const ALLOW_PREBOARDING_KEY = 'allowPreboarding'
/** المسار ده شغال لجلسة في بوابة التهيئة */
export const AllowPreboarding = () => SetMetadata(ALLOW_PREBOARDING_KEY, true)

const YMD = /^\d{4}-\d{2}-\d{2}$/
/** تاريخ النهارده بتوقيت النظام (YYYY-MM-DD) */
export const localYmd = (now: Date = new Date()): string =>
  `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`

/** الجلسة لسه في بوابة التهيئة؟ العلامة تاريخ سليم والنهارده قبله. من يوم المباشرة العلامة مالهاش أثر (من غير دخول جديد). */
export const preboardingActive = (payload: { preboardingUntil?: unknown } | null | undefined, today: string = localYmd()): boolean =>
  typeof payload?.preboardingUntil === 'string' && YMD.test(payload.preboardingUntil) && today < payload.preboardingUntil

export interface PreboardingAccount { id: number; role: string; employeeId?: number | null }
type PreboardingResolver = (employeeId: number) => Promise<string | null>
let resolver: PreboardingResolver | null = null
/** موديول التهيئة بيسجّل هنا اللي بيعرف تاريخ مباشرة الموظف وحالة الميزة (الدخول مابيستوردش موديول التهيئة) */
export const bindPreboarding = (next: PreboardingResolver | null): void => { resolver = next }

/** تاريخ المباشرة لو الحساب لازم يتفتح في بوابة التهيئة، وإلا null. مدير النظام وحساب من غير موظف برّه البوابة. */
export async function preboardingUntilOf(account: PreboardingAccount): Promise<string | null> {
  if (account.role === 'super_admin' || !account.employeeId || !resolver) return null
  const until = await resolver(Number(account.employeeId))
  return typeof until === 'string' && YMD.test(until) ? until : null
}
