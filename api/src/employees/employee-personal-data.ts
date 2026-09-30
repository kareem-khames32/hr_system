// «تعديل الملف» من «ملفي الشخصي» (قرار المالك 30 سبتمبر): الموظف يشوف بياناته ويعدّل أي حاجة منها بطلب «تحديث بيانات شخصية»
// (PERSONAL_DATA_UPDATE، وجهته employee_record) — بيمشي في سلسلة اعتماده ويتطبق بعد الاعتماد النهائي.
// القايمة دي بس: البيانات الشخصية والهوية والتواصل وجهة الطوارئ. برّه القايمة عمدًا:
//   • الفرع والقسم والفريق والمسمى والمدير، الراتب والبدلات وطريقة الصرف — من الموارد البشرية.
//   • البنك والآيبان — طلبهم الآمن «تغيير الحساب البنكي» (payroll_bank_secure).
//   • كود الموظف ورقم البصمة وتواريخ التعيين والعقد والحالة.
//   • بريد العمل (email): عليه مطابقة حسابات المجال (domain-match) — البريد الشخصي (personalEmail) مالوش دعوة بالدخول.
//   • البلد (country): بيتحفظ كود دولة (SA/EG…) من قايمة الموارد البشرية.
// ملف صرف (بلا Nest ولا TypeORM): الخادم بيقرا منه القايمة البيضاء والتحقق، والواجهة نموذج «تعديل الملف» — فالقاعدة واحدة.
import { arabicFullNameIssue, birthDateIssue, EMPLOYEE_PHONE_PATTERN, employeeIdentityIssues, NATIONAL_ID_MAX, normalizeIdentityNumber,
  PASSPORT_NO_MAX } from './employee-required-fields'

export type PersonalDataKey =
  | 'fullName' | 'fullNameEn' | 'birthDate' | 'birthPlace' | 'gender' | 'nationality' | 'maritalStatus'
  | 'nationalId' | 'passportNo' | 'passportExpiry'
  | 'phone' | 'phoneAlt' | 'personalEmail' | 'address' | 'postalCode'
  | 'emergencyContactName' | 'emergencyRelation' | 'emergencyContactPhone' | 'emergencyPhoneAlt'

export type PersonalDataSection = 'personal' | 'identity' | 'contact' | 'emergency'
export type PersonalDataKind = 'text' | 'date' | 'select' | 'phone' | 'email' | 'identity'
export interface PersonalDataOption { value: string; label: string }
export interface PersonalDataField {
  key: PersonalDataKey
  label: string
  section: PersonalDataSection
  kind: PersonalDataKind
  /** طول العمود في employees */
  max: number
  /** إجباري في ملف الموظف: مايتمسحش (نفس تعديل الموارد البشرية) */
  required?: boolean
  feminine?: boolean
  options?: ReadonlyArray<PersonalDataOption>
  /** أرقام وبريد وحروف إنجليزية: الخانة من الشمال لليمين */
  ltr?: boolean
}

export const PERSONAL_DATA_SECTIONS: ReadonlyArray<{ key: PersonalDataSection; label: string }> = [
  { key: 'personal', label: 'البيانات الشخصية' },
  { key: 'identity', label: 'الهوية والجواز' },
  { key: 'contact', label: 'التواصل والعنوان' },
  { key: 'emergency', label: 'جهة اتصال الطوارئ' },
]

export const PERSONAL_GENDER_OPTIONS: ReadonlyArray<PersonalDataOption> = [{ value: 'male', label: 'ذكر' }, { value: 'female', label: 'أنثى' }]
export const PERSONAL_MARITAL_OPTIONS: ReadonlyArray<PersonalDataOption> = [
  { value: 'single', label: 'أعزب' }, { value: 'married', label: 'متزوج' }, { value: 'divorced', label: 'مطلق' }, { value: 'widowed', label: 'أرمل' },
]
// نفس أكواد نموذج الموظف عند الموارد البشرية (EmployeeForm)
export const PERSONAL_RELATION_OPTIONS: ReadonlyArray<PersonalDataOption> = [
  { value: 'spouse', label: 'زوج/زوجة' }, { value: 'parent', label: 'أب/أم' }, { value: 'sibling', label: 'أخ/أخت' },
  { value: 'child', label: 'ابن/ابنة' }, { value: 'other', label: 'أخرى' },
]

// الترتيب = ترتيب الخانات في النموذج وفي تعريف الطلب
export const PERSONAL_DATA_FIELDS: ReadonlyArray<PersonalDataField> = [
  { key: 'fullName', label: 'الاسم الكامل بالعربي', section: 'personal', kind: 'text', max: 200, required: true },
  { key: 'fullNameEn', label: 'الاسم بالإنجليزي', section: 'personal', kind: 'text', max: 200, ltr: true },
  { key: 'birthDate', label: 'تاريخ الميلاد', section: 'personal', kind: 'date', max: 10, required: true },
  { key: 'birthPlace', label: 'مكان الميلاد', section: 'personal', kind: 'text', max: 120 },
  { key: 'gender', label: 'الجنس', section: 'personal', kind: 'select', max: 10, required: true, options: PERSONAL_GENDER_OPTIONS },
  { key: 'nationality', label: 'الجنسية', section: 'personal', kind: 'text', max: 100, required: true, feminine: true },
  { key: 'maritalStatus', label: 'الحالة الاجتماعية', section: 'personal', kind: 'select', max: 20, feminine: true, options: PERSONAL_MARITAL_OPTIONS },
  { key: 'nationalId', label: 'رقم الهوية / الإقامة', section: 'identity', kind: 'identity', max: NATIONAL_ID_MAX, ltr: true },
  { key: 'passportNo', label: 'رقم جواز السفر', section: 'identity', kind: 'identity', max: PASSPORT_NO_MAX, ltr: true },
  { key: 'passportExpiry', label: 'تاريخ انتهاء الجواز', section: 'identity', kind: 'date', max: 10 },
  { key: 'phone', label: 'رقم الجوال', section: 'contact', kind: 'phone', max: 50, required: true, ltr: true },
  { key: 'phoneAlt', label: 'رقم جوال بديل', section: 'contact', kind: 'text', max: 30, ltr: true },
  { key: 'personalEmail', label: 'البريد الشخصي', section: 'contact', kind: 'email', max: 160, ltr: true },
  { key: 'address', label: 'العنوان', section: 'contact', kind: 'text', max: 500 },
  { key: 'postalCode', label: 'الرمز البريدي', section: 'contact', kind: 'text', max: 20, ltr: true },
  { key: 'emergencyContactName', label: 'اسم جهة الطوارئ', section: 'emergency', kind: 'text', max: 200 },
  { key: 'emergencyRelation', label: 'صلة القرابة', section: 'emergency', kind: 'select', max: 60, feminine: true, options: PERSONAL_RELATION_OPTIONS },
  { key: 'emergencyContactPhone', label: 'رقم جهة الطوارئ', section: 'emergency', kind: 'phone', max: 50, ltr: true },
  { key: 'emergencyPhoneAlt', label: 'رقم طوارئ بديل', section: 'emergency', kind: 'text', max: 30, ltr: true },
]

const FIELD_BY_KEY: ReadonlyMap<string, PersonalDataField> = new Map(PERSONAL_DATA_FIELDS.map(field => [field.key, field]))
export const PERSONAL_DATA_KEYS: ReadonlyArray<PersonalDataKey> = PERSONAL_DATA_FIELDS.map(field => field.key)
export const isPersonalDataKey = (key: unknown): key is PersonalDataKey => typeof key === 'string' && FIELD_BY_KEY.has(key)
export const personalDataField = (key: string): PersonalDataField | undefined => FIELD_BY_KEY.get(key)
/** اسم الخيار بالعربي (ذكر، متزوج، أب/أم…) — القيمة زي ما هي لو مش من الخيارات. */
export const personalDataOptionLabel = (key: string, value: unknown): string =>
  FIELD_BY_KEY.get(key)?.options?.find(option => option.value === value)?.label ?? String(value ?? '')

export const PERSONAL_DATE_EXAMPLE = '1990-01-31'
const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
export const PERSONAL_EMAIL_MESSAGE = 'البريد الشخصي غير صالح — اكتبه زي name@example.com'

// تاريخ بالشكل ده وموجود فعلًا في التقويم (2026-02-30 بيعدّي الشكل بس مش تاريخ)
const validDate = (value: string) => {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) return false
  const time = Date.parse(`${value}T12:00:00Z`)
  return Number.isFinite(time) && new Date(time).toISOString().slice(0, 10) === value
}

/**
 * القيمة المطلوبة من حمولة الطلب: undefined = مش مطلوب تغييرها (مش متبعتة، أو نص فاضي زي ما شاشة «الطلبات» بتبعت الخانة اللي
 * ماتلمستش، أو نوع غير النص والرقم)، null = مسح صريح، وغير كده النص بعد القص — ورقم الهوية/الجواز مطبّع (من غير مسافات، أرقام لاتينية،
 * حروف كبيرة). نفس معنى الفاضي والـnull في معالج «تحديث البيانات» القديم.
 */
export function personalDataRequestedValue(key: PersonalDataKey, raw: unknown): string | null | undefined {
  if (raw === null) return null
  if (typeof raw !== 'string' && typeof raw !== 'number') return undefined
  const text = String(raw).trim()
  if (!text) return undefined
  if (FIELD_BY_KEY.get(key)?.kind === 'identity') return normalizeIdentityNumber(text) || undefined
  return text
}

/** القيمة المحفوظة بشكل المقارنة: التاريخ YYYY-MM-DD، والفاضي null. */
export function personalDataStoredValue(key: PersonalDataKey, value: unknown): string | null {
  if (value === null || value === undefined) return null
  const text = String(value)
  if (!text.trim()) return null
  return FIELD_BY_KEY.get(key)?.kind === 'date' ? text.slice(0, 10) : text
}

export interface PersonalDataChange { key: PersonalDataKey; oldValue: string | null; newValue: string | null }
export type PersonalDataValues = Partial<Record<PersonalDataKey, unknown>>

/**
 * التغييرات الفعلية بترتيب الحقول: المطلوب تغييره ومختلف عن المحفوظ. رقم الهوية/الجواز بيتقارن بعد تطبيع الاتنين —
 * نفس الرقم بمسافات أو حروف صغيرة مش تغيير. مفتاح برّه القايمة مالوش أي أثر هنا (القايمة البيضاء بترفضه قبل كده).
 */
export function personalDataChanges(current: PersonalDataValues, payload: Record<string, unknown>): PersonalDataChange[] {
  const changes: PersonalDataChange[] = []
  for (const field of PERSONAL_DATA_FIELDS) {
    const next = personalDataRequestedValue(field.key, payload[field.key])
    if (next === undefined) continue
    const old = personalDataStoredValue(field.key, current[field.key])
    const same = field.kind === 'identity' ? (next ?? '') === normalizeIdentityNumber(old) : next === old
    if (!same) changes.push({ key: field.key, oldValue: old, newValue: next })
  }
  return changes
}

const requiredClearMessage = (field: PersonalDataField) => `${field.label} ${field.feminine ? 'مطلوبة ولا يمكن مسحها' : 'مطلوب ولا يمكن مسحه'}`

function formatIssue(field: PersonalDataField, value: string, today: string): string | null {
  switch (field.kind) {
    case 'date':
      if (!validDate(value) || value < '1900-01-01') return `${field.label} غير صحيح — اكتبه بالشكل ${PERSONAL_DATE_EXAMPLE}`
      return field.key === 'birthDate' ? birthDateIssue(value, today) : null
    case 'select':
      return field.options?.some(option => option.value === value) ? null
        : `${field.label}: اختار من القايمة (${(field.options ?? []).map(option => option.label).join(' / ')})`
    case 'phone':
      return EMPLOYEE_PHONE_PATTERN.test(value) ? null : `${field.label} غير صالح — أرقام بس (من 7 لـ 21 رقم)، وممكن يبدأ بـ +`
    case 'email':
      return EMAIL_PATTERN.test(value) ? null : PERSONAL_EMAIL_MESSAGE
    default:
      if (field.key !== 'fullName') return null
      if (value.length < 3) return 'الاسم الكامل 3 أحرف على الأقل'
      return arabicFullNameIssue(value)
  }
}

/**
 * أول مشكلة في التغييرات أو null — نفس قواعد تعديل الموارد البشرية: الإجباري (الاسم والميلاد والجنس والجنسية والجوال) مايتمسحش،
 * الاسم بالعربي واسمين على الأقل، الجوال ورقم الطوارئ بنفس الشكل، الميلاد تاريخ حقيقي قبل النهارده، ورقم الهوية أو الجواز: واحد منهم
 * على الأقل وشكل الرقم المتغير (employeeIdentityIssues). الطول بطول العمود. التفرد في الخادم (جوه معاملة الاعتماد تحت القفل).
 */
export function personalDataIssue(changes: ReadonlyArray<PersonalDataChange>, current: PersonalDataValues, today: string): string | null {
  for (const change of changes) {
    const field = FIELD_BY_KEY.get(change.key)
    if (!field) return 'الطلب فيه خانة مش من بياناتك الشخصية'
    if (field.kind === 'identity') continue
    if (change.newValue === null) {
      if (field.required) return requiredClearMessage(field)
      continue
    }
    // التاريخ والاختيار والجوال شكلهم بيحدد طولهم؛ النص والبريد بطول العمود
    if ((field.kind === 'text' || field.kind === 'email') && change.newValue.length > field.max) {
      return `${field.label} أطول من المسموح — بحد أقصى ${field.max} حرف`
    }
    const issue = formatIssue(field, change.newValue, today)
    if (issue) return issue
  }
  if (changes.some(change => change.key === 'nationalId' || change.key === 'passportNo')) {
    const next = (key: 'nationalId' | 'passportNo') => {
      const change = changes.find(item => item.key === key)
      return change ? change.newValue : personalDataStoredValue(key, current[key])
    }
    const initial = { nationalId: personalDataStoredValue('nationalId', current.nationalId), passportNo: personalDataStoredValue('passportNo', current.passportNo) }
    const identity = employeeIdentityIssues({ nationalId: next('nationalId'), passportNo: next('passportNo') }, { mode: 'edit', initial })[0]
    if (identity) return identity.message
  }
  return null
}
