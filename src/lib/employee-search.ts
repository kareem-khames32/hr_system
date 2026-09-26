// بحث الموظفين الموحّد — نفس المطابقة في كل منتقي موظف (EmployeePicker) وكل قائمة بحث عن موظفين:
// الاسم أو الكود. الاسم بتسامح في الإملاء العربي: الهمزات (أ/إ/آ/ٱ→ا، ؤ→و، ئ→ي)، التاء المربوطة (ة→ه)،
// الألف المقصورة (ى→ي)، الياء والكاف الفارسيتين، والتشكيل والتطويل وعلامات الاتجاه الخفية، والمسافات الزايدة.
// كلمات الاسم تطابق بأي ترتيب («علي محمد» تلاقي «محمد علي»)، ومن غير مسافات («عبدالله» = «عبد الله»).
// الكود من غير فرق بين الحروف الكبيرة والصغيرة، ومن غير شرطات («emp007» = «EMP-007»)، والأرقام العربية الهندية
// بتتقري لاتيني («٠٠٧» = «007»). رقم الموظف الداخلي (id) مش مفتاح بحث.

export interface EmployeeSearchFields {
  fullName?: string | null
  fullNameEn?: string | null
  employeeCode?: string | null
}

// علامات الاتجاه والمسافات الصفرية اللي بتيجي مع النص المنسوخ
const INVISIBLE = /[؜​-‏‪-‮⁦-⁩﻿]/g
// التشكيل (ومعاه الهمزة والمدة المركّبة بعد التفكيك) والتطويل وعلامات الحروف اللاتينية (é→e)
const MARKS = /[̀-ͯؐ-ًؚ-ٰٟۖ-ۭـ]/g
const ALEF = /[آأإٱ-ٳ]/g // آ أ إ ٱ
const TEH_MARBUTA = /ة/g // ة
const YEH = /[ىیئ]/g // ى ی ئ
const WAW_HAMZA = /ؤ/g // ؤ
const KEHEH = /ک/g // ک
const ARABIC_DIGITS = /[٠-٩۰-۹]/g
const SPACES = /\s+/g
// «المضغوط»: من غير مسافات ولا فواصل الأكواد
const SEPARATORS = /[\s\-_.\/\\]+/g

const latinDigit = (digit: string) => {
  const code = digit.charCodeAt(0)
  return String(code >= 0x06f0 ? code - 0x06f0 : code - 0x0660)
}

export function normalizeSearchText(value: unknown): string {
  if (value === null || value === undefined) return ''
  return String(value)
    .normalize('NFKD')
    .replace(INVISIBLE, '')
    .replace(MARKS, '')
    .replace(ALEF, 'ا')
    .replace(TEH_MARBUTA, 'ه')
    .replace(YEH, 'ي')
    .replace(WAW_HAMZA, 'و')
    .replace(KEHEH, 'ك')
    .replace(ARABIC_DIGITS, latinDigit)
    .toLowerCase()
    .replace(SPACES, ' ')
    .trim()
}

const compactOf = (normalized: string) => normalized.replace(SEPARATORS, '')

export interface EmployeeSearchKey {
  readonly name: string
  readonly code: string
  readonly codeCompact: string
  // كل الحقول بمسافة بينها (للكلمات بأي ترتيب) — ونسختها المضغوطة (حقل حقل، فالمضغوط مايعدّيش من حقل للتاني)
  readonly text: string
  readonly compact: string
}

interface CachedKey { fullName: unknown; fullNameEn: unknown; employeeCode: unknown; key: EmployeeSearchKey }
// التطبيع مرة واحدة لكل موظف: القوائم (600+) بتتفلتر مع كل حرف من غير ما تتطبّع من الأول
const keyCache = new WeakMap<object, CachedKey>()

export function employeeSearchKey(employee: EmployeeSearchFields): EmployeeSearchKey {
  const cached = keyCache.get(employee)
  if (cached && cached.fullName === employee.fullName && cached.fullNameEn === employee.fullNameEn && cached.employeeCode === employee.employeeCode) {
    return cached.key
  }
  const name = normalizeSearchText(employee.fullName)
  const code = normalizeSearchText(employee.employeeCode)
  const fields = [name, normalizeSearchText(employee.fullNameEn), code].filter(Boolean)
  const key: EmployeeSearchKey = { name, code, codeCompact: compactOf(code), text: fields.join(' '), compact: fields.map(compactOf).join(' ') }
  keyCache.set(employee, { fullName: employee.fullName, fullNameEn: employee.fullNameEn, employeeCode: employee.employeeCode, key })
  return key
}

export interface EmployeeSearchQuery {
  readonly text: string
  readonly tokens: readonly string[]
  readonly compact: string
}

// null = بحث فاضي (كل الموظفين)
export function parseEmployeeSearch(query: string | null | undefined): EmployeeSearchQuery | null {
  const text = normalizeSearchText(query)
  return text ? { text, tokens: text.split(' '), compact: compactOf(text) } : null
}

// ترتيب النتيجة: 0 الكود أو الاسم بالظبط، 1 بداية الاسم أو الكود، 2 بداية كلمة في الاسم، 3 أي جزء؛ و-1 = مفيش تطابق
export function employeeSearchRank(key: EmployeeSearchKey, query: EmployeeSearchQuery): number {
  const words = query.tokens.every((token) => key.text.includes(token))
  if (!words && !(query.compact && key.compact.includes(query.compact))) return -1
  if (key.name === query.text || (query.compact && key.codeCompact === query.compact)) return 0
  if (key.name.startsWith(query.text) || (query.compact && key.codeCompact.startsWith(query.compact))) return 1
  if (` ${key.name}`.includes(` ${query.tokens[0]}`)) return 2
  return 3
}

// دالة مطابقة جاهزة للاستعمال في filter — البحث بيتطبّع مرة واحدة
export function employeeSearchMatcher(query: string | null | undefined): (employee: EmployeeSearchFields) => boolean {
  const parsed = parseEmployeeSearch(query)
  if (!parsed) return () => true
  return (employee) => employeeSearchRank(employeeSearchKey(employee), parsed) >= 0
}

export const employeeMatchesSearch = (employee: EmployeeSearchFields, query: string | null | undefined): boolean =>
  employeeSearchMatcher(query)(employee)

// نتيجة المنتقي: المطابقين بالترتيب (الأقرب الأول، وبعدين ترتيب القائمة الأصلي)
export function searchEmployees<T extends EmployeeSearchFields>(employees: readonly T[], query: string | null | undefined): T[] {
  const parsed = parseEmployeeSearch(query)
  if (!parsed) return employees.slice()
  const ranked: { employee: T; rank: number; order: number }[] = []
  employees.forEach((employee, order) => {
    const rank = employeeSearchRank(employeeSearchKey(employee), parsed)
    if (rank >= 0) ranked.push({ employee, rank, order })
  })
  return ranked.sort((a, b) => a.rank - b.rank || a.order - b.order).map((row) => row.employee)
}
