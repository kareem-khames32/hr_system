// B-ADD.15: اختيارات الأجهزة (بتتحفظ في المتصفح)، وشرح ليه الكاميرا أو المايك أو مشاركة الشاشة ماشتغلتش.
import { MEET_INSECURE_TEXT } from '@/lib/meet-api'

export interface MeetPrefs {
  camId: string
  micId: string
  outId: string
  camOn: boolean
  micOn: boolean
}

const KEY = 'hr_meet_prefs'
const DEFAULTS: MeetPrefs = { camId: '', micId: '', outId: '', camOn: true, micOn: true }

export function loadPrefs(): MeetPrefs {
  try {
    const value = JSON.parse(localStorage.getItem(KEY) ?? 'null')
    if (value && typeof value === 'object') return { ...DEFAULTS, ...value }
  } catch { /* التخزين مقفول أو تالف */ }
  return { ...DEFAULTS }
}

export function savePrefs(prefs: MeetPrefs) {
  try { localStorage.setItem(KEY, JSON.stringify(prefs)) } catch { /* التخزين مقفول */ }
}

export type DeviceKind = 'camera' | 'mic' | 'screen'

/** المتصفح مابيدّيش كاميرا ولا مايك غير على رابط آمن (https أو localhost) */
export const mediaBlockedHere = (): boolean => typeof window !== 'undefined' && (!window.isSecureContext || !navigator.mediaDevices)

/** سبب فشل الكاميرا / المايك / مشاركة الشاشة بكلام واضح — null لو المستخدم هو اللي قفل نافذة الاختيار */
export function mediaErrorText(error: unknown, kind: DeviceKind): string | null {
  if (mediaBlockedHere()) return MEET_INSECURE_TEXT
  const name = (error as { name?: string } | null)?.name ?? ''
  const message = String((error as { message?: string } | null)?.message ?? '')
  if (kind === 'screen' && (name === 'NotAllowedError' || name === 'AbortError')) return null
  if (name === 'NotAllowedError' || name === 'PermissionDeniedError' || name === 'SecurityError') {
    if (/policy/i.test(message)) return 'إعدادات حماية الخادم مانعة الكاميرا أو المايك — كلّم مدير النظام'
    return kind === 'screen' ? 'المتصفح ماسمحش بمشاركة الشاشة'
      : 'الكاميرا أو المايك مقفولين للصفحة دي — افتح علامة القفل جنب عنوان الصفحة، واسمح بيهم، وحدّث الصفحة'
  }
  if (name === 'NotFoundError' || name === 'DevicesNotFoundError') return kind === 'camera' ? 'مفيش كاميرا متوصّلة بالجهاز' : 'مفيش مايك متوصّل بالجهاز'
  if (name === 'NotReadableError' || name === 'TrackStartError' || name === 'AbortError') return 'الجهاز مشغول في برنامج تاني — اقفله وجرّب تاني'
  if (name === 'OverconstrainedError' || name === 'ConstraintNotSatisfiedError') return 'الجهاز المختار مش متاح — اختار جهاز تاني'
  if (kind === 'screen' && name === 'NotSupportedError') return 'المتصفح ده مابيدعمش مشاركة الشاشة'
  return kind === 'camera' ? 'تعذر تشغيل الكاميرا' : kind === 'mic' ? 'تعذر تشغيل المايك' : 'تعذر مشاركة الشاشة'
}
