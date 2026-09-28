// إضافة موظف (قرار المالك 16 سبتمبر): الحقول الإجبارية وشكلها.
// رقم الهوية / الإقامة أو رقم جواز السفر (قرار المالك 28 سبتمبر): أي صيغة لأي جنسية، وواحد منهم على الأقل.
// ملف صرف بلا imports — يستورده نموذج الموظف في الواجهة والخادم والتحديث الجماعي من ملف، فتبقى القاعدة واحدة.
// الإلزام عند الإنشاء؛ في التعديل يُفحص الحقل المرسل فقط، فملف قديم ناقص يفتح ويحفظ باقي حقوله.

export type NationalityKind = 'SAUDI' | 'EGYPTIAN' | 'RESIDENT' | 'UNKNOWN'

const normalized = (value: unknown) => String(value ?? '').trim().replace(/\s+/g, ' ').toLowerCase()
const SAUDI = new Set(['سعودي', 'سعودى', 'سعودية', 'سعوديه', 'السعودية', 'saudi', 'saudi arabia', 'sa', 'ksa'])
const EGYPTIAN = new Set(['مصري', 'مصرى', 'مصرية', 'مصريه', 'مصر', 'egyptian', 'egypt', 'eg'])
const UNKNOWN = new Set(['', 'أخرى', 'اخرى', 'أخري', 'اخري', 'غير محدد', 'other'])

/** سعودي، مصري، مقيم بجنسية أخرى مسماة، أو غير معروف (فارغ/«أخرى»). فئة التأمينات بس — مالهاش دعوة برقم الهوية. */
export function nationalityKind(nationality: unknown): NationalityKind {
  const value = normalized(nationality)
  if (SAUDI.has(value)) return 'SAUDI'
  if (EGYPTIAN.has(value)) return 'EGYPTIAN'
  return UNKNOWN.has(value) ? 'UNKNOWN' : 'RESIDENT'
}

// ===== رقم الهوية / الإقامة ورقم جواز السفر (قرار المالك 28 سبتمبر) =====
// من غير قواعد دولة: نفس الشكل لأي جنسية بعد التطبيع، والتفرد على القيمة المطبّعة (في الخادم).

export const NATIONAL_ID_MAX = 50
export const PASSPORT_NO_MAX = 40
export const NATIONAL_ID_PATTERN = /^[A-Z0-9-]{3,50}$/
export const PASSPORT_NO_PATTERN = /^[A-Z0-9-]{3,40}$/
/** الملحوظة تحت الخانتين في الشاشة. */
export const IDENTITY_HINT = 'رقم الهوية أو رقم جواز السفر — واحد منهم على الأقل'
export const IDENTITY_REQUIRED_MESSAGE = 'لازم رقم الهوية / الإقامة أو رقم جواز السفر — واحد منهم على الأقل'
/** وصف الشكل المسموح — نفس الكلام في رسالة الشاشة والخادم وعمود ملف Excel. */
export const identityFormatText = (max: number) => `حروف إنجليزية وأرقام وشرطة بس (من 3 لـ ${max})`
export const NATIONAL_ID_FORMAT_MESSAGE = `رقم الهوية / الإقامة: ${identityFormatText(NATIONAL_ID_MAX)}`
export const PASSPORT_NO_FORMAT_MESSAGE = `رقم جواز السفر: ${identityFormatText(PASSPORT_NO_MAX)}`

// مسافات من أي نوع + علامات الاتجاه والعرض الصفري اللي بتيجي مع النسخ من مستند أو موبايل عربي
const IDENTITY_INVISIBLE = /[\s\u061c\u200b-\u200f\u202a-\u202e\u2060-\u2069]/g

/** الرقم بالشكل اللي بيتحفظ ويتقارن بيه: من غير أي مسافات، الأرقام العربية/الفارسية لاتينية، والحروف الإنجليزية كبيرة. */
export function normalizeIdentityNumber(value: unknown): string {
  return String(value ?? '')
    .replace(IDENTITY_INVISIBLE, '')
    .replace(/[٠-٩]/g, digit => String(digit.charCodeAt(0) - 0x0660))
    .replace(/[۰-۹]/g, digit => String(digit.charCodeAt(0) - 0x06f0))
    .replace(/[a-z]/g, letter => letter.toUpperCase())
}

/** قيمة الخانة للحفظ: الرقم المطبّع، والفاضي null (= مسح)، وundefined يفضل undefined (= مش متبعت). */
export function identityValue(value: unknown): string | null | undefined {
  if (value === undefined) return undefined
  return normalizeIdentityNumber(value) || null
}

/** مشكلة شكل رقم الهوية / الإقامة أو null — أي جنسية. الفارغ مش هنا (الإلزام في employeeIdentityIssues). */
export function nationalIdIssue(value: unknown): string | null {
  const id = normalizeIdentityNumber(value)
  return !id || NATIONAL_ID_PATTERN.test(id) ? null : NATIONAL_ID_FORMAT_MESSAGE
}

/** مشكلة شكل رقم جواز السفر أو null. الفارغ مش هنا. */
export function passportNoIssue(value: unknown): string | null {
  const passport = normalizeIdentityNumber(value)
  return !passport || PASSPORT_NO_PATTERN.test(passport) ? null : PASSPORT_NO_FORMAT_MESSAGE
}

export interface EmployeeIdentityValues { nationalId?: string | null; passportNo?: string | null }
export type EmployeeIdentityKey = keyof EmployeeIdentityValues

/**
 * رقم الهوية / الإقامة أو رقم جواز السفر: واحد منهم على الأقل، وكل رقم مكتوب بالشكل المسموح.
 * add: الاتنين فاضيين = رسالة واحدة (مفتاحها nationalId)، وكل رقم مكتوب يُفحص شكله.
 * edit: مسح واحد مسموح لو التاني فاضل بعد الحفظ، ومسح الاتنين مرفوض؛ ملف قديم من غير الاتنين يحفظ باقي حقوله،
 * والشكل يُفحص للرقم اللي اتغير بس (بعد التطبيع — نفس الرقم بمسافات أو حروف صغيرة مش تغيير).
 */
export function employeeIdentityIssues(values: EmployeeIdentityValues, options: { mode: 'add' | 'edit'; initial?: EmployeeIdentityValues | null }) {
  const issues: Array<{ key: EmployeeIdentityKey; message: string }> = []
  const initial = options.initial ?? {}
  const nationalId = normalizeIdentityNumber(values.nationalId), passportNo = normalizeIdentityNumber(values.passportNo)
  if (!nationalId && !passportNo) {
    const had = normalizeIdentityNumber(initial.nationalId) || normalizeIdentityNumber(initial.passportNo)
    if (options.mode === 'add' || had) issues.push({ key: 'nationalId', message: IDENTITY_REQUIRED_MESSAGE })
    return issues
  }
  for (const [key, value, check] of [['nationalId', nationalId, nationalIdIssue], ['passportNo', passportNo, passportNoIssue]] as const) {
    if (!value || (options.mode === 'edit' && value === normalizeIdentityNumber(initial[key]))) continue
    const issue = check(value)
    if (issue) issues.push({ key, message: issue })
  }
  return issues
}

// تاريخ بالشكل ده وموجود فعلًا في التقويم. 2026-13-01 بيعدّي الشكل لكن Date بترجع Invalid،
// و.toISOString() ساعتها بترمي RangeError — يبقى 500 بدل رسالة عربية، فبنفحص القيمة الأول.
const validDate = (value: string) => {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) return false
  const time = Date.parse(`${value}T12:00:00Z`)
  return Number.isFinite(time) && new Date(time).toISOString().slice(0, 10) === value
}

export function birthDateIssue(birthDate: unknown, today: string): string | null {
  const value = String(birthDate ?? '').trim()
  if (!value) return null
  if (!validDate(value)) return 'تاريخ الميلاد غير صحيح'
  if (value < '1900-01-01') return 'تاريخ الميلاد غير صحيح'
  if (value >= today) return 'تاريخ الميلاد لازم يكون قبل النهارده'
  return null
}

/** تاريخ التعيين: تاريخ حقيقي، مش قبل 1900 (المُرحّلين عندهم 1900-01-01)، ومش أبعد من سنة قدّام — غلطة سنة بتخلق موظف مايدخلش أي مسير. */
export function joinDateIssue(joinDate: unknown, today: string): string | null {
  const value = String(joinDate ?? '').trim()
  if (!value) return null
  if (!validDate(value) || value < '1900-01-01') return 'تاريخ التعيين غير صحيح'
  const limit = `${Number(today.slice(0, 4)) + 1}${today.slice(4)}`
  if (value > limit) return 'تاريخ التعيين أبعد من سنة من النهارده — راجع السنة'
  return null
}
export function arabicFullNameIssue(fullName: unknown): string | null {
  const value = String(fullName ?? '').trim()
  if (!value) return null
  if (!/[؀-ۿ]/.test(value)) return 'الاسم الكامل لازم يكون بالعربي'
  if (value.split(/\s+/).length < 2) return 'اكتب الاسم الكامل بالعربي (الاسم الأول واسم العائلة على الأقل)'
  return null
}

export const EMPLOYEE_PHONE_PATTERN = /^[+\d][\d\s-]{6,20}$/

export interface EmployeeRequiredValues extends EmployeeIdentityValues {
  fullName?: string | null
  birthDate?: string | null
  gender?: string | null
  nationality?: string | null
  phone?: string | null
  fingerprintCode?: string | null
  joinDate?: string | null
  branchId?: string | number | null
  departmentId?: string | number | null
  jobTitle?: string | null
  basicSalary?: string | number | null
}
export type EmployeeRequiredKey = keyof EmployeeRequiredValues

// الترتيب = ترتيب الخانات في خطوات النموذج (1 شخصية، 2 وظيفية، 3 مالية).
// nationalId هنا خانة زوجية: رقم الهوية / الإقامة أو رقم جواز السفر — قاعدتها في employeeIdentityIssues
export const EMPLOYEE_REQUIRED_FIELDS: ReadonlyArray<{ key: EmployeeRequiredKey; label: string; step: 1 | 2 | 3; feminine?: boolean }> = [
  { key: 'fullName', label: 'الاسم الكامل بالعربي', step: 1 },
  { key: 'birthDate', label: 'تاريخ الميلاد', step: 1 },
  { key: 'gender', label: 'الجنس', step: 1 },
  { key: 'nationality', label: 'الجنسية', step: 1, feminine: true },
  { key: 'nationalId', label: 'رقم الهوية / الإقامة أو رقم جواز السفر', step: 1 },
  { key: 'phone', label: 'رقم الجوال', step: 1 },
  { key: 'fingerprintCode', label: 'رقم البصمة', step: 2 },
  { key: 'joinDate', label: 'تاريخ التعيين', step: 2 },
  { key: 'branchId', label: 'الفرع', step: 2 },
  { key: 'departmentId', label: 'القسم', step: 2 },
  { key: 'jobTitle', label: 'المسمى الوظيفي', step: 2 },
  { key: 'basicSalary', label: 'الراتب الأساسي', step: 3 },
]

export const requiredFieldMessage = (field: { label: string; feminine?: boolean }) => `${field.label} ${field.feminine ? 'مطلوبة' : 'مطلوب'}`
const isEmpty = (value: unknown) => value === null || value === undefined || String(value).trim() === ''
const same = (a: unknown, b: unknown) => String(a ?? '').trim() === String(b ?? '').trim()

/** مشكلة شكل قيمة غير فارغة (بلا فحص الإلزام). */
export function employeeFieldFormatIssue(key: EmployeeRequiredKey, values: EmployeeRequiredValues, today: string): string | null {
  const value = values[key]
  if (isEmpty(value)) return null
  switch (key) {
    case 'fullName': return arabicFullNameIssue(value)
    case 'birthDate': return birthDateIssue(value, today)
    case 'gender': return ['male', 'female'].includes(String(value)) ? null : 'اختار الجنس (ذكر أو أنثى)'
    case 'nationalId': return nationalIdIssue(value)
    case 'passportNo': return passportNoIssue(value)
    case 'phone': return EMPLOYEE_PHONE_PATTERN.test(String(value).trim()) ? null : 'رقم الجوال غير صالح'
    case 'fingerprintCode': return String(value).trim().length > 20 ? 'رقم البصمة لا يتجاوز 20 خانة' : null
    case 'joinDate': return joinDateIssue(value, today)
    case 'basicSalary': {
      const amount = Number(value)
      return Number.isFinite(amount) && amount > 0 ? null : 'الراتب الأساسي لازم يكون رقم أكبر من صفر'
    }
    default: return null
  }
}

/**
 * مشاكل الحقول الإجبارية بترتيب الخطوات.
 * add: كل حقل فارغ مطلوب، وكل حقل مكتوب يُفحص شكله.
 * edit: الفارغ مشكلة فقط لو كان محفوظًا بقيمة (مسح)، والشكل يُفحص فقط لو القيمة اتغيرت؛ الأجر في التعديل له مساره المستقل.
 * رقم الهوية / الجواز: واحد منهم على الأقل (employeeIdentityIssues) — الجنسية مالهاش دعوة بشكله.
 */
export function employeeRequiredIssues(values: EmployeeRequiredValues, options: { mode: 'add' | 'edit'; initial?: EmployeeRequiredValues | null; today: string }) {
  const issues: Array<{ key: EmployeeRequiredKey; step: 1 | 2 | 3; message: string }> = []
  const initial = options.initial ?? {}
  for (const field of EMPLOYEE_REQUIRED_FIELDS) {
    if (options.mode === 'edit' && field.key === 'basicSalary') continue
    if (field.key === 'nationalId') {
      for (const issue of employeeIdentityIssues(values, { mode: options.mode, initial })) issues.push({ ...issue, step: field.step })
      continue
    }
    const value = values[field.key]
    if (isEmpty(value)) {
      if (options.mode === 'add') issues.push({ key: field.key, step: field.step, message: requiredFieldMessage(field) })
      else if (!isEmpty(initial[field.key])) issues.push({ key: field.key, step: field.step, message: `${requiredFieldMessage(field)} ولا يمكن مسحه` })
      continue
    }
    const changed = options.mode === 'add' || !same(value, initial[field.key])
    if (!changed) continue
    const issue = employeeFieldFormatIssue(field.key, values, options.today)
    if (issue) issues.push({ key: field.key, step: field.step, message: issue })
  }
  return issues
}
