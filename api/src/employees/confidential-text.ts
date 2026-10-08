// CRP4C / CRP4D (P4C-B01، P4D-B01): نص من طلب سري ممكن يتنسخ لصف قايم بالتحديث (سبب حذف معال، وصف عهدة، سبب أرشفة في ملف الموظف)،
// ورابط إنشاء الصف مابيحميش النسخة دي. الحكم في التصدير على طبقتين:
//  1) **نوع الخانة (الضامن):** خانات «الكلام الحر» في جداول التصدير متحددة بالاسم (`FREE_TEXT_COLUMNS`). لو للموظف أي طلب سري (صاحبه أو
//     موضوعه)، مفيش طريقة نثبت بيها إن كلام خانة حرة مش منسوخ منه — فكل خانة كلام حر عنده بتطلع محجوبة، أيًا كان طولها أو لغتها أو شكلها أو
//     التحويل اللي الكاتب عمله عليها. القيم البنيوية (حالة، تاريخ، مبلغ، كود، اسم، رقم) بتفضل: دي بيانات السجل مش كلام الطلب.
//  2) **المحتوى (طبقة زيادة):** أي خانة نصية تانية (حتى جوه JSON) فيها نص سردي من حمولة الطلب السري بتتحجب هي كمان.
// حساب نقي من غير قاعدة بيانات.

export const CONFIDENTIAL_TEXT_MARK = '[محجوب: نص من طلب سري]'
/** علامة خانة الكلام الحر عند موظف له طلب سري (مصدرها مايتثبتش إنه آمن) */
export const FREE_TEXT_MARK = '[محجوب: للموظف طلب سري]'

/**
 * خانات الكلام الحر في ملف الموظف وجداول التصدير — الخانة اللي بيتكتب فيها سبب أو وصف أو ملاحظة بكلام حد. أي خانة نصية جديدة اسمها سردي
 * أو طولها 300 حرف فأكتر لازم تتصنّف هنا أو في `STRUCTURED_LONG_COLUMNS` (اختبار الوحدة بيقع لو اتنسيت).
 */
export const FREE_TEXT_COLUMNS: Readonly<Record<string, readonly string[]>> = {
  employees: ['archiveReason'],
  employee_documents: ['notes'],
  // سجل التغييرات: السبب، والقيمة قبل وبعد (ممكن تبقى قيمة خانة كلام حر زي سبب الأرشفة)
  employee_status_history: ['reason', 'oldValue', 'newValue', 'oldStatus', 'newStatus'],
  employment_periods: ['exitReason', 'rehireReason'],
  employee_experiences: ['leaveReason'],
  employee_custom_values: ['textValue'],
  dependents: ['removeReason'],
  leave_balance_adjustments: ['reason'],
  attendance_days: ['attendanceReviewReason'],
  attendance_punches: ['reason'],
  attendance_corrections: ['reason'],
  attendance_exemptions: ['reason', 'terminationReason'],
  employee_suspensions: ['reason', 'endReason'],
  employee_penalties: ['note', 'cancelReason'],
  loans: ['exceptionalReason'],
  deduction_requests: ['reason', 'decisionReason'],
  bonus_requests: ['reason', 'decisionReason'],
  employee_obligations: ['label'],
  custody_assignments: ['notes', 'condition'],
  letter_requests: ['purpose'],
  performance_goals: ['title', 'description', 'decisionReason'],
  onboarding_tasks: ['label', 'note'],
  offboarding_cases: ['terminationReason', 'notes', 'exitInterviewNotes'],
}
/**
 * خانات نصية طويلة أو اسمها شبه السردي وهي مش كلام حر: عنوان، مسمى وظيفي، كود سبب، مراجع ملفات، ولقطات JSON محسوبة — قيم سجل
 * (الحمولات واللقطات بتعدّي على حجب المحتوى).
 */
export const STRUCTURED_LONG_COLUMNS: Readonly<Record<string, readonly string[]>> = {
  employees: ['address', 'jobTitle'],
  employee_experiences: ['jobTitle'],
  attendance_exemptions: ['reasonCode'],
  promotions: ['fromTitle', 'toTitle'],
  employee_documents: ['fileRef'], employee_education: ['fileRef'], employee_certifications: ['fileRef'],
  leaves: ['attachmentRef'],
  loans: ['capSnapshot'],
  deduction_requests: ['attachmentRef', 'typeSnapshot', 'amountTrace', 'scopeSnapshot', 'steps', 'overrides', 'obligationIds'],
  bonus_requests: ['attachmentRef', 'typeSnapshot', 'amountTrace', 'scopeSnapshot', 'steps', 'overrides'],
  payroll_items: ['breakdown'],
  letter_requests: ['generatedPdfRef'],
  policy_acknowledgements: ['userAgent'],
  requests: ['payload', 'resolvedSteps'],
}

/** نسخة من الصف بخانات الكلام الحر (غير الفاضية) محجوبة — لجدول معيّن */
export function maskFreeText<T>(row: T, table: string): T {
  const columns = FREE_TEXT_COLUMNS[table]
  if (!columns || row === null || typeof row !== 'object') return row
  const copy = { ...(row as Record<string, unknown>) }
  for (const column of columns) if (typeof copy[column] === 'string' && (copy[column] as string).trim() !== '') copy[column] = FREE_TEXT_MARK
  return copy as T
}

// ===== طبقة المحتوى =====

/** أقصر نص سردي بيتحجب بالمحتوى، وأقصر نسخة مقطوعة بتتطابق، وطول البداية اللي بتكفي لتمييز نسخة مقطوعة قدامها بادئة */
const MIN_LENGTH = 4, MIN_PART_LENGTH = 8, HEAD_LENGTH = 20
/** خانات الحمولة اللي محتواها كلام مكتوب حتى لو كلمة لاتينية واحدة */
const NARRATIVE_KEY = /reason|description|note|comment|detail|text|justif|message|remark|explain|subject|title|complaint|statement|condition|purpose/i
/** أرقام وتواريخ وأوقات وأكواد بحروف كبيرة — مش كلام (تحت خانة بيانات) */
const CODE = /^[A-Z0-9_\-:.\/+ ]*$/
/** أرقام وتواريخ وأوقات بس — دي الوحيدة اللي مش كلام حتى تحت خانة سردية */
const NUMERIC = /^[0-9\-:.\/+ ]*$/
/** توحيد المسافات (سطر جديد، تبويب، مسافات متكررة) — الكتّاب بيوحّدوها قبل الحفظ */
const squash = (text: string) => text.replace(/\s+/g, ' ').trim()

const narrative = (text: string) => text.length >= MIN_LENGTH && (/\s/.test(text) || /[^\u0000-\u007f]/.test(text)) && !CODE.test(text)
/** شكل النص جوه خانة JSON نصية (علامات التنصيص بتتكتب بهروب) */
const jsonEscaped = (text: string) => JSON.stringify(text).slice(1, -1)

/** النصوص السردية في حمولات الطلبات السرية (كل الخانات النصية، بأي عمق) بمسافات موحّدة — من غير تكرار، والأطول أولًا */
export function confidentialTexts(payloads: ReadonlyArray<string | null | undefined>): string[] {
  const found = new Set<string>()
  const walk = (value: unknown, key: string) => {
    if (typeof value === 'string') {
      const text = squash(value)
      if (narrative(text) || (NARRATIVE_KEY.test(key) && text.length >= MIN_LENGTH && !NUMERIC.test(text))) found.add(text)
    } else if (Array.isArray(value)) value.forEach(entry => walk(entry, key))
    else if (value !== null && typeof value === 'object') for (const [name, entry] of Object.entries(value as Record<string, unknown>)) walk(entry, name)
  }
  for (const payload of payloads) {
    if (typeof payload !== 'string' || !payload.trim()) continue
    // حمولة مش JSON: النص كله كلام
    try { walk(JSON.parse(payload), '') } catch { walk(payload, 'text') }
  }
  return [...found].sort((left, right) => right.length - left.length)
}

/** الخانة فيها نص سردي من طلب سري؟ — النص كله (أو أول 20 حرف منه لو النسخة مقطوعة أو متزوّقة)، أو الخانة نفسها جزء من النص. بمسافات موحّدة */
export function isConfidentialCopy(value: string, secrets: readonly string[]): boolean {
  const text = squash(value)
  if (text.length < MIN_LENGTH) return false
  return secrets.some(secret => {
    const head = secret.length > HEAD_LENGTH ? secret.slice(0, HEAD_LENGTH) : secret
    return text.includes(head) || text.includes(jsonEscaped(head)) || (text.length >= MIN_PART_LENGTH && narrative(text) && secret.includes(text))
  })
}

/** نسخة من القيمة بكل خانة نصية منسوخة من طلب سري محجوبة (المصفوفات والكائنات بأي عمق؛ التواريخ والأرقام زي ما هي) */
export function scrubConfidentialTexts<T>(value: T, secrets: readonly string[]): T {
  if (!secrets.length) return value
  const scrub = (item: unknown): unknown => {
    if (typeof item === 'string') return item === FREE_TEXT_MARK ? item : isConfidentialCopy(item, secrets) ? CONFIDENTIAL_TEXT_MARK : item
    if (Array.isArray(item)) return item.map(scrub)
    if (item !== null && typeof item === 'object' && !(item instanceof Date) && !Buffer.isBuffer(item)) return Object.fromEntries(Object.entries(item as Record<string, unknown>).map(([key, entry]) => [key, scrub(entry)]))
    return item
  }
  return scrub(value) as T
}
