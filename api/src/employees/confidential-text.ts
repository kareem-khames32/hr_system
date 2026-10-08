// CRP4C (P4C-B01): نص سردي من طلب سري ممكن يتنسخ لصف قايم بالتحديث (سبب حذف معال، وصف فقد عهدة، سبب أرشفة في ملف الموظف) — ورابط
// إنشاء الصف مابيحميش النسخة دي. فالتصدير بيحجب النص نفسه أينما اتنسخ: أي خانة نصية فيها نص سردي من طلب سري للموظف (كله، أو أوله لو
// النسخة مقطوعة أو قدامها بادئة) بتطلع بعلامة الحجب. حساب نقي من غير قاعدة بيانات.
//  - «سردي» = نص فيه مسافة أو حروف غير لاتينية (سبب، وصف، ملاحظة)، أو كلمة لاتينية واحدة تحت خانة اسمها سردي (reason، description، notes…).
//  - قيم البيانات مش سردية: الأكواد والحالات والأرقام والتواريخ (ANNUAL، archived، 2026-10-01، رقم موبايل). دي بتتطبق على السجل وبتبقى
//    بياناته، وحجبها كان هيمسح خانات سليمة (حالة الموظف، نوع الإجازة) عند أي موظف له طلب سري.

export const CONFIDENTIAL_TEXT_MARK = '[محجوب: نص من طلب سري]'
/** أقصر نص سردي بيتحجب، وأقصر نسخة مقطوعة بتتطابق، وطول البداية اللي بتكفي لتمييز نسخة مقطوعة قدامها بادئة */
const MIN_LENGTH = 4, MIN_PART_LENGTH = 8, HEAD_LENGTH = 20
/** خانات الحمولة اللي محتواها كلام مكتوب حتى لو كلمة لاتينية واحدة */
const NARRATIVE_KEY = /reason|description|note|comment|detail|text|justif|message|remark|explain|subject|title|complaint|statement/i
/** أرقام وتواريخ وأوقات وأكواد بحروف كبيرة — مش كلام */
const CODE = /^[A-Z0-9_\-:.\/+ ]*$/

const narrative = (text: string) => text.length >= MIN_LENGTH && (/\s/.test(text) || /[^\u0000-\u007f]/.test(text)) && !CODE.test(text)
/** شكل النص جوه خانة JSON نصية (علامات التنصيص والسطور بتتكتب بهروب) */
const jsonEscaped = (text: string) => JSON.stringify(text).slice(1, -1)

/** النصوص السردية في حمولات الطلبات السرية (كل الخانات النصية، بأي عمق) — من غير تكرار، والأطول أولًا */
export function confidentialTexts(payloads: ReadonlyArray<string | null | undefined>): string[] {
  const found = new Set<string>()
  const walk = (value: unknown, key: string) => {
    if (typeof value === 'string') {
      const text = value.trim()
      if (narrative(text) || (NARRATIVE_KEY.test(key) && text.length >= MIN_LENGTH && !CODE.test(text))) found.add(text)
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

/** الخانة فيها نص سردي من طلب سري؟ — النص كله (أو أول 20 حرف منه لو النسخة مقطوعة أو متزوّقة)، أو الخانة نفسها جزء من النص */
export function isConfidentialCopy(value: string, secrets: readonly string[]): boolean {
  const text = value.trim()
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
    if (typeof item === 'string') return isConfidentialCopy(item, secrets) ? CONFIDENTIAL_TEXT_MARK : item
    if (Array.isArray(item)) return item.map(scrub)
    if (item !== null && typeof item === 'object' && !(item instanceof Date) && !Buffer.isBuffer(item)) return Object.fromEntries(Object.entries(item as Record<string, unknown>).map(([key, entry]) => [key, scrub(entry)]))
    return item
  }
  return scrub(value) as T
}
