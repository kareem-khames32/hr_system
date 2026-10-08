import { BadRequestException } from '@nestjs/common'
import type { FileType } from '../files/file-type'

// B3.3-ب: قواعد التقديم من اللينك العام — من غير دخول، فكل قيمة بتتفحص هنا برسالتها، والطلبات محدودة بالعنوان.

export const PUBLIC_CAREERS_FEATURE = 'recruitment.public_careers'
export const SOURCE_PUBLIC = 'لينك عام'
/** السيرة الذاتية: PDF أو Word بس (وجوّه المسموح في إعداد الملفات)، وبحد أقصى أصغر من حد الرفع العام */
export const CV_FILE_TYPES: readonly FileType[] = ['pdf', 'doc', 'docx']
export const CV_MAX_MB = 5
export const CV_ENTITY_TYPE = 'candidate_cv'
export const CAREERS_NAME = 'الاسم الكامل مطلوب (من 3 لـ200 حرف)'
export const CAREERS_EMAIL = 'البريد الإلكتروني غير صالح'
export const CAREERS_PHONE = 'رقم الموبايل غير صالح'
export const CAREERS_CONSENT = 'لازم توافق على استخدام بياناتك في التوظيف عشان الطلب يتقدّم'
export const CAREERS_TOO_MANY = 'طلبات كتير من نفس المكان — حاول بعد شوية'
export const CAREERS_CV_SIZE = `حجم السيرة الذاتية أكبر من الحد (${CV_MAX_MB} ميجا)`

const text = (raw: unknown): string => (typeof raw === 'string' ? raw.replace(/\s+/g, ' ').trim() : '')

export function cleanApplicantName(raw: unknown): string {
  const value = text(raw)
  if (value.length < 3 || value.length > 200) throw new BadRequestException(CAREERS_NAME)
  return value
}
export function cleanApplicantEmail(raw: unknown): string {
  const value = text(raw).toLowerCase()
  if (value.length > 200 || !/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(value)) throw new BadRequestException(CAREERS_EMAIL)
  return value
}
/** الموبايل زي ما اتكتب (أرقام ومسافات و+ وشرطات وأقواس)، ومن 7 لـ15 رقم */
export function cleanApplicantPhone(raw: unknown): string {
  const value = text(raw)
  const digits = value.replace(/[٠-٩]/g, (digit) => String(digit.charCodeAt(0) - 0x660)).replace(/\D/g, '')
  if (value.length > 50 || !/^[\d٠-٩+\-() ]+$/.test(value) || digits.length < 7 || digits.length > 15) throw new BadRequestException(CAREERS_PHONE)
  return value
}
/** اسم الملف زي ما المتقدّم رفعه (multer بيقرا الأسماء العربي latin1 — نفس معالجة التعديل الجماعي للموظفين) */
export function uploadedFileName(name: unknown): string {
  const raw = String(name ?? '').slice(0, 300)
  if (/[À-ÿ]/.test(raw)) {
    const decoded = Buffer.from(raw, 'latin1').toString('utf8')
    if (!decoded.includes('�')) return decoded
  }
  return raw || 'cv'
}
/** الموافقة: القيمة الصريحة true (أو نصها من نموذج متعدد الأجزاء) */
export function assertConsent(raw: unknown): void {
  if (raw !== true && raw !== 'true') throw new BadRequestException(CAREERS_CONSENT)
}

/**
 * حد الطلبات من غير دخول، في ذاكرة العملية: لكل مفتاح (عنوان المتقدّم) عدد محاولات في نافذة زمنية، وسقف عام للكل. المحاولة بتتحسب
 * قبل أي شغل (حتى المرفوضة)، فالتخمين والإغراق محدودين.
 */
export class AttemptLimiter {
  private readonly hits = new Map<string, number[]>()
  private all: number[] = []
  constructor(private readonly perKey: number, private readonly total: number, private readonly windowMs: number, private readonly now: () => number = Date.now) {}

  /** true = مسموح (واتحسبت)، false = فوق الحد */
  take(key: string): boolean {
    const at = this.now(), from = at - this.windowMs
    this.all = this.all.filter((time) => time > from)
    const mine = (this.hits.get(key) ?? []).filter((time) => time > from)
    if (mine.length >= this.perKey || this.all.length >= this.total) { this.hits.set(key, mine); return false }
    mine.push(at); this.all.push(at)
    this.hits.set(key, mine)
    // المفاتيح اللي نافذتها خلصت بتتشال (الخريطة ماتكبرش من غير حد)
    if (this.hits.size > 5000) for (const [name, times] of this.hits) if (!times.some((time) => time > from)) this.hits.delete(name)
    return true
  }
  reset() { this.hits.clear(); this.all = [] }
}
