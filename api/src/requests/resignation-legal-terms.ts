import { EG_TERMINATION_KEY } from '../employees/employee-suspension-paid'
import { statutoryNumber, verifiedStatutoryAt, type StatutoryEntry } from '../statutory/statutory'

// B4.5 (هـ): المدد القانونية لطلب الاستقالة من حزمة الدولة (C-EG-07، C-SA-06) — حساب نقي من غير قاعدة بيانات، وعرض بس.
// ورا إعداد مقفول بيتفتح من مسار الحسابات القانونية بس (الصف لازم «اتأكد»). مقفول = تفاصيل الطلب زي ما هي بالحرف.
//  - مدة الإخطار: من تاريخ تقديم الاستقالة (مصر بالشهور، السعودية بالأيام). آخر يوم عمل قبل نهايتها = «إخطار أقصر من القانوني».
//  - مهلة الرد: المدة اللي بعدها الاستقالة تعتبر مقبولة قانونًا لو صاحب العمل ماردّش. النظام بيعلّم إن المهلة عدّت بس — مابيعتمدش ولا بيغيّر حالة.

export const RESIGNATION_LEGAL_TERMS_KEY = 'requests.resignation_legal_terms.enabled'
// مفتاح مصر نفسه بتاع حد الإيقاف بأجر (صف واحد في الحزمة) — معرّف هناك مرة واحدة
export const EG_TERMINATION_TERMS_KEY = EG_TERMINATION_KEY
export const SA_TERMINATION_TERMS_KEY = 'sa.termination'

export interface ResignationLegalTerms {
  country: 'EG' | 'SA'
  /** نص مدة الإخطار كما في الحزمة («3 شهور» أو «30 يوم») */
  noticeLabel: string
  /** آخر يوم في مدة الإخطار القانونية محسوبة من تاريخ التقديم */
  noticeEndsOn: string
  /** آخر يوم عمل المطلوب قبل نهاية الإخطار القانوني */
  shortNotice: boolean
  replyDays: number
  /** آخر يوم لرد صاحب العمل؛ بعده الاستقالة تعتبر مقبولة قانونًا */
  replyDeadline: string
  replyOverdue: boolean
}

const DAY = /^\d{4}-\d{2}-\d{2}$/
const addDays = (date: string, days: number) => new Date(Date.parse(`${date}T12:00:00Z`) + days * 86400000).toISOString().slice(0, 10)
/** نفس اليوم بعد عدد شهور (ولو الشهر أقصر: آخر يوم فيه) */
function addMonths(date: string, months: number): string {
  const [year, month, day] = date.split('-').map(Number)
  const total = year * 12 + (month - 1) + months, targetYear = Math.floor(total / 12), targetMonth = total % 12
  const last = new Date(Date.UTC(targetYear, targetMonth + 1, 0)).getUTCDate()
  return `${targetYear}-${String(targetMonth + 1).padStart(2, '0')}-${String(Math.min(day, last)).padStart(2, '0')}`
}

/** المدد القانونية لاستقالة اتقدمت يوم submittedOn، أو null لو الدولة مالهاش صف أو التاريخ ناقص — أو صف يوم التقديم «محتاج تحقق» (P4A-B01) */
export function resignationLegalTerms(entries: readonly StatutoryEntry[], country: string | null | undefined,
  input: { submittedOn: string | null | undefined; lastWorkingDate: string | null | undefined; today: string }): ResignationLegalTerms | null {
  const submittedOn = String(input.submittedOn ?? '').slice(0, 10)
  if (!DAY.test(submittedOn) || !DAY.test(input.today)) return null
  let noticeLabel: string, noticeEndsOn: string, replyDays: number | null
  if (country === 'EG') {
    const row = verifiedStatutoryAt(entries, 'EG', EG_TERMINATION_TERMS_KEY, submittedOn)
    const months = statutoryNumber(row, 'notice_months')
    replyDays = statutoryNumber(row, 'resignation_reply_days')
    if (!row || months === null || !Number.isInteger(months) || months <= 0) return null
    noticeLabel = `${months} شهور`; noticeEndsOn = addMonths(submittedOn, months)
  } else if (country === 'SA') {
    const row = verifiedStatutoryAt(entries, 'SA', SA_TERMINATION_TERMS_KEY, submittedOn)
    const days = statutoryNumber(row, 'notice_employee_days')
    replyDays = statutoryNumber(row, 'resignation_silence_days')
    if (!row || days === null || !Number.isInteger(days) || days <= 0) return null
    noticeLabel = `${days} يوم`; noticeEndsOn = addDays(submittedOn, days)
  } else return null
  if (replyDays === null || !Number.isInteger(replyDays) || replyDays <= 0) return null
  const lastWorkingDate = String(input.lastWorkingDate ?? '').slice(0, 10)
  const replyDeadline = addDays(submittedOn, replyDays)
  return { country, noticeLabel, noticeEndsOn, shortNotice: DAY.test(lastWorkingDate) && lastWorkingDate < noticeEndsOn, replyDays, replyDeadline, replyOverdue: input.today > replyDeadline }
}
