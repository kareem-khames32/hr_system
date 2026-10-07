import type { EntityManager } from 'typeorm'

// B2.13-ب: قواعد التقرير المحفوظ والمجدول — ملف صرف (غير فحص وجود الجدول): الأسماء والدوريات ومتى يستحق الإرسال.

export const SAVED_REPORTS_MIGRATION_MISSING = 'التقارير المحفوظة محتاجة ترحيل 20261007_098 على قاعدة البيانات'
export const SAVED_REPORT_NOT_FOUND = 'التقرير المحفوظ غير موجود'
export const SAVED_REPORT_NAME_TAKEN = 'عندك تقرير محفوظ بنفس الاسم'
/** أسباب تعذّر الإرسال المجدول اللي بتتعرض لصاحب التقرير من غير تفاصيل الخادم */
/** هوية صاحب التقرير فضلت تتغيّر والملف بيتبني (CRP3D-B13-01) */
export const SAVED_REPORT_OWNER_CHANGING = 'حساب صاحب التقرير بيتغيّر والتقرير بيتجهّز — هيتبعت في الفحص الجاي'
export const SAVED_REPORT_MAIL_FAILED = 'تعذّر إرسال البريد؛ هيتجرّب تاني في الفحص الجاي'
export const SAVED_REPORT_UNAVAILABLE = 'التقرير ده مش متاح لحسابك دلوقتي'
export const SAVED_REPORT_NAME_MIN = 2
export const SAVED_REPORT_NAME_MAX = 120
/** حد التقارير المحفوظة للحساب الواحد */
export const SAVED_REPORTS_MAX = 30
export const SAVED_REPORTS_FULL = `وصلت لحد التقارير المحفوظة (${SAVED_REPORTS_MAX})؛ امسح تقرير قديم الأول`
/** الإرسال المجدول من الساعة دي (توقيت الشركة)؛ المهمة بتفحص كل ساعة فاللي فاته الميعاد بيتبعت في الفحص اللي بعده */
export const SAVED_REPORT_SEND_HOUR = 7

export const SAVED_REPORT_FREQUENCIES = ['NONE', 'DAILY', 'WEEKLY', 'MONTHLY'] as const
export type SavedReportFrequency = typeof SAVED_REPORT_FREQUENCIES[number]
export const isSavedReportFrequency = (value: unknown): value is SavedReportFrequency => SAVED_REPORT_FREQUENCIES.includes(value as SavedReportFrequency)
export const SAVED_REPORT_FREQUENCY_LABELS: Record<SavedReportFrequency, string> = {
  NONE: 'من غير إرسال', DAILY: 'كل يوم', WEEKLY: 'كل 7 أيام', MONTHLY: 'أول كل شهر',
}

export const SAVED_REPORT_PERIODS = ['current', 'previous'] as const
export type SavedReportPeriod = typeof SAVED_REPORT_PERIODS[number]
export const SAVED_REPORT_PERIOD_LABELS: Record<SavedReportPeriod, string> = { current: 'شهر الرواتب الجاري', previous: 'شهر الرواتب السابق' }
/** التقارير اللي ليها فترة (الباقي لحظي أو بالسنة الجارية) */
export const SAVED_REPORT_PERIOD_REPORTS: readonly string[] = ['attendance', 'overtime', 'metrics']

export interface SavedReportFilters {
  branchId: number | null
  departmentIds: number[] | null
  teamId: number | null
  /** فترة نسبية: بتتحسب وقت التشغيل، فالتقرير المجدول بيفضل على الشهر الصح */
  period: SavedReportPeriod
}

let ready: boolean | null = null
/** جدول ترحيل 098 موجود؟ الموجود بيتحفظ (المخطط مابيتشالش). الناقص مابيتحفظش: بيتفحص مع كل نداء لحد ما الترحيل يتطبق. */
export async function savedReportsReady(em: EntityManager): Promise<boolean> {
  if (ready === true) return true
  const [row] = await em.query(`SELECT CASE WHEN OBJECT_ID(N'dbo.saved_reports', N'U') IS NOT NULL THEN 1 ELSE 0 END AS [ready]`)
  ready = Number(row?.ready) === 1
  return ready
}
/** للاختبارات: نسيان حالة الجدول */
export function resetSavedReportsCache() { ready = null }

/** اسم التقرير بعد التنضيف، أو null لو مش صالح (فاضي، قصير، طويل، أو فيه حروف تحكم) */
export function savedReportName(raw: unknown): string | null {
  if (typeof raw !== 'string') return null
  const name = raw.replace(/\s+/g, ' ').trim()
  if (name.length < SAVED_REPORT_NAME_MIN || name.length > SAVED_REPORT_NAME_MAX) return null
  // eslint-disable-next-line no-control-regex
  return /[\u0000-\u001f\u007f]/.test(name) ? null : name
}

const positiveInt = (value: unknown): number | null => (Number.isInteger(value) && Number(value) > 0 ? Number(value) : null)

/** الفلاتر المحفوظة من نصها: أي حاجة مش مفهومة = من غير فلتر (والحكم الفعلي على النطاق وقت التشغيل) */
export function parseSavedFilters(text: unknown): SavedReportFilters {
  let raw: Record<string, unknown> = {}
  try {
    const parsed = JSON.parse(String(text ?? ''))
    if (parsed && typeof parsed === 'object' && !Array.isArray(parsed)) raw = parsed as Record<string, unknown>
  } catch { /* من غير فلتر */ }
  const departments = Array.isArray(raw.departmentIds) ? raw.departmentIds.map(positiveInt).filter((id): id is number => id !== null) : []
  return {
    branchId: positiveInt(raw.branchId), departmentIds: departments.length ? [...new Set(departments)] : null, teamId: positiveInt(raw.teamId),
    period: raw.period === 'previous' ? 'previous' : 'current',
  }
}

export const savedFiltersNarrow = (filters: SavedReportFilters): boolean =>
  filters.branchId !== null || filters.departmentIds !== null || filters.teamId !== null

const dayNumber = (day: string) => Math.round(Date.parse(`${day}T00:00:00Z`) / 86400000)

/**
 * التقرير المجدول مستحق الإرسال النهارده؟ مرة في اليوم بالكتير. «كل 7 أيام» و«أول كل شهر» من آخر إرسال مش من يوم ثابت: لو الخادم
 * كان واقف يوم الميعاد التقرير بيتبعت أول ما يرجع، والتقرير الجديد بيتبعت في أول فحص.
 */
export function savedReportDue(frequency: string, lastSentOn: string | null, today: string): boolean {
  if (!isSavedReportFrequency(frequency) || frequency === 'NONE') return false
  if (!lastSentOn) return true
  if (lastSentOn >= today) return false
  if (frequency === 'DAILY') return true
  if (frequency === 'WEEKLY') return dayNumber(today) - dayNumber(lastSentOn) >= 7
  return lastSentOn.slice(0, 7) < today.slice(0, 7)
}

/** شهر الرواتب اللي قبل YYYY-MM */
export function previousPeriod(period: string): string {
  const [year, month] = period.split('-').map(Number)
  return month === 1 ? `${year - 1}-12` : `${year}-${String(month - 1).padStart(2, '0')}`
}
