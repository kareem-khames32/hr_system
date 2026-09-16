// إضافة موظف (قرار المالك 16 سبتمبر): الحقول الإجبارية وقاعدة رقم الهوية / الإقامة حسب الجنسية.
// ملف صرف بلا imports — يستورده نموذج الموظف في الواجهة والخادم معًا فتبقى القاعدة واحدة.
// الإلزام عند الإنشاء؛ في التعديل يُفحص الحقل المرسل فقط، فملف قديم ناقص يفتح ويحفظ باقي حقوله.

export type NationalityKind = 'SAUDI' | 'EGYPTIAN' | 'RESIDENT' | 'UNKNOWN'

const normalized = (value: unknown) => String(value ?? '').trim().replace(/\s+/g, ' ').toLowerCase()
const SAUDI = new Set(['سعودي', 'سعودى', 'سعودية', 'سعوديه', 'السعودية', 'saudi', 'saudi arabia', 'sa', 'ksa'])
const EGYPTIAN = new Set(['مصري', 'مصرى', 'مصرية', 'مصريه', 'مصر', 'egyptian', 'egypt', 'eg'])
const UNKNOWN = new Set(['', 'أخرى', 'اخرى', 'أخري', 'اخري', 'غير محدد', 'other'])

/** سعودي، مصري، مقيم بجنسية أخرى مسماة، أو غير معروف (فارغ/«أخرى»). */
export function nationalityKind(nationality: unknown): NationalityKind {
  const value = normalized(nationality)
  if (SAUDI.has(value)) return 'SAUDI'
  if (EGYPTIAN.has(value)) return 'EGYPTIAN'
  return UNKNOWN.has(value) ? 'UNKNOWN' : 'RESIDENT'
}

/** الشكل المتوقع لرقم الهوية / الإقامة حسب الجنسية — يظهر تحت الخانة. */
export function nationalIdHint(nationality: unknown): string {
  switch (nationalityKind(nationality)) {
    case 'SAUDI': return 'الهوية الوطنية: 10 أرقام تبدأ بـ1'
    case 'EGYPTIAN': return 'الرقم القومي: 14 رقم يبدأ بـ2 أو 3، أو الإقامة: 10 أرقام تبدأ بـ2'
    case 'RESIDENT': return 'الإقامة: 10 أرقام تبدأ بـ2'
    default: return 'أرقام فقط (من 10 إلى 14 رقم) — اختار الجنسية عشان نتحقق من الطول'
  }
}

/** مشكلة رقم الهوية / الإقامة أو null. الفارغ لا يُفحص هنا (الإلزام منفصل). */
export function nationalIdIssue(nationalId: unknown, nationality: unknown): string | null {
  const id = String(nationalId ?? '').trim()
  if (!id) return null
  if (!/^\d+$/.test(id)) return 'رقم الهوية / الإقامة أرقام فقط'
  switch (nationalityKind(nationality)) {
    case 'SAUDI':
      return /^1\d{9}$/.test(id) ? null : 'رقم الهوية الوطنية للسعودي 10 أرقام ويبدأ بـ1'
    case 'EGYPTIAN':
      return /^[23]\d{13}$/.test(id) || /^2\d{9}$/.test(id) ? null
        : 'رقم الهوية للمصري: الرقم القومي 14 رقم يبدأ بـ2 أو 3، أو رقم الإقامة 10 أرقام يبدأ بـ2'
    case 'RESIDENT':
      return /^2\d{9}$/.test(id) ? null : 'رقم الإقامة لغير السعودي 10 أرقام ويبدأ بـ2'
    default:
      return /^\d{10,14}$/.test(id) ? null : 'رقم الهوية / الإقامة من 10 إلى 14 رقم'
  }
}

const validDate = (value: string) => /^\d{4}-\d{2}-\d{2}$/.test(value)
  && new Date(`${value}T12:00:00Z`).toISOString().slice(0, 10) === value

export function birthDateIssue(birthDate: unknown, today: string): string | null {
  const value = String(birthDate ?? '').trim()
  if (!value) return null
  if (!validDate(value)) return 'تاريخ الميلاد غير صحيح'
  if (value < '1900-01-01') return 'تاريخ الميلاد غير صحيح'
  if (value >= today) return 'تاريخ الميلاد لازم يكون قبل النهارده'
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

export interface EmployeeRequiredValues {
  fullName?: string | null
  birthDate?: string | null
  gender?: string | null
  nationality?: string | null
  nationalId?: string | null
  phone?: string | null
  fingerprintCode?: string | null
  joinDate?: string | null
  branchId?: string | number | null
  departmentId?: string | number | null
  jobTitle?: string | null
  basicSalary?: string | number | null
}
export type EmployeeRequiredKey = keyof EmployeeRequiredValues

// الترتيب = ترتيب الخانات في خطوات النموذج (1 شخصية، 2 وظيفية، 3 مالية)
export const EMPLOYEE_REQUIRED_FIELDS: ReadonlyArray<{ key: EmployeeRequiredKey; label: string; step: 1 | 2 | 3; feminine?: boolean }> = [
  { key: 'fullName', label: 'الاسم الكامل بالعربي', step: 1 },
  { key: 'birthDate', label: 'تاريخ الميلاد', step: 1 },
  { key: 'gender', label: 'الجنس', step: 1 },
  { key: 'nationality', label: 'الجنسية', step: 1, feminine: true },
  { key: 'nationalId', label: 'رقم الهوية / الإقامة', step: 1 },
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
    case 'nationalId': return nationalIdIssue(value, values.nationality)
    case 'phone': return EMPLOYEE_PHONE_PATTERN.test(String(value).trim()) ? null : 'رقم الجوال غير صالح'
    case 'fingerprintCode': return String(value).trim().length > 20 ? 'رقم البصمة لا يتجاوز 20 خانة' : null
    case 'joinDate': return validDate(String(value)) ? null : 'تاريخ التعيين غير صحيح'
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
 * edit: الفارغ مشكلة فقط لو كان محفوظًا بقيمة (مسح)، والشكل يُفحص فقط لو القيمة اتغيرت
 * (رقم الهوية يُعاد فحصه كذلك لو الجنسية اتغيرت)؛ الأجر في التعديل له مساره المستقل.
 */
export function employeeRequiredIssues(values: EmployeeRequiredValues, options: { mode: 'add' | 'edit'; initial?: EmployeeRequiredValues | null; today: string }) {
  const issues: Array<{ key: EmployeeRequiredKey; step: 1 | 2 | 3; message: string }> = []
  const initial = options.initial ?? {}
  for (const field of EMPLOYEE_REQUIRED_FIELDS) {
    if (options.mode === 'edit' && field.key === 'basicSalary') continue
    const value = values[field.key]
    if (isEmpty(value)) {
      if (options.mode === 'add') issues.push({ key: field.key, step: field.step, message: requiredFieldMessage(field) })
      else if (!isEmpty(initial[field.key])) issues.push({ key: field.key, step: field.step, message: `${requiredFieldMessage(field)} ولا يمكن مسحه` })
      continue
    }
    const changed = options.mode === 'add' || !same(value, initial[field.key])
      || (field.key === 'nationalId' && !same(values.nationality, initial.nationality))
    if (!changed) continue
    const issue = employeeFieldFormatIssue(field.key, values, options.today)
    if (issue) issues.push({ key: field.key, step: field.step, message: issue })
  }
  return issues
}
