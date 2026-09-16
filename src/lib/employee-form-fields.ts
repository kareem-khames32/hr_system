// قواعد ذهاب/عودة حقول نموذج الموظف: ما يُرسل عند الحفظ وكيف تعود القيمة المحفوظة للشاشة.
// دوال صرفة يستخدمها النموذج وشاشة التعديل وملف الموظف، وتختبرها api/test/employee-field-roundtrip.test.cjs.
import type { EmployeeFormState, QualRow, QualificationsPayload } from '@/components/EmployeeForm'
import type { ApiEmployee } from './api'

export interface SelectOption { value: string; label: string }

const validYmd = (value: string) => {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) return false
  const date = new Date(`${value}T12:00:00Z`)
  return Number.isFinite(date.getTime()) && date.toISOString().slice(0, 10) === value
}

// ===== الرصيد الافتتاحي المُرحّل =====
export type OpeningExpiryMode = 'end_of_year' | 'custom_date' | 'no_expiry'
export interface OpeningBalanceState { days: string; expiryMode: OpeningExpiryMode; expiryDate: string }

// حالة الحقول كما تُعبّأ من الرصيد المحفوظ — نفسها أساس المقارنة «هل تغيّر شيء؟»
// «حتى نهاية السنة» لا تُقرأ إلا من 31/12 السنة الجارية؛ 31/12 من سنة ماضية تاريخ
// محدد يبقى كما هو، وإلا كان تعديل عدد الأيام وحده يمدّ رصيدًا منتهيًا لسنة جديدة.
export function initialOpeningBalance(
  initial?: { openingBalanceDays?: number; openingBalanceExpiry?: string | null },
  currentYear: number = new Date().getFullYear()
): OpeningBalanceState {
  const days = initial?.openingBalanceDays && initial.openingBalanceDays > 0 ? String(initial.openingBalanceDays) : ''
  const expiry = initial?.openingBalanceExpiry
  if (expiry === null || expiry === undefined || expiry === '') {
    return { days, expiryMode: initial?.openingBalanceDays ? 'no_expiry' : 'end_of_year', expiryDate: '' }
  }
  const date = String(expiry).slice(0, 10)
  return date.slice(5) === '12-31' && date.slice(0, 4) === String(currentYear)
    ? { days, expiryMode: 'end_of_year', expiryDate: '' }
    : { days, expiryMode: 'custom_date', expiryDate: date }
}

const openingDays = (text: string) => {
  const trimmed = (text ?? '').trim()
  const value = Number(trimmed)
  return trimmed !== '' && Number.isFinite(value) && value > 0 ? value : null
}

export function openingBalanceExpiryValue(state: OpeningBalanceState, year: number): string | null {
  if (state.expiryMode === 'end_of_year') return `${year}-12-31`
  if (state.expiryMode === 'custom_date') return state.expiryDate || null
  return null
}

export function openingBalanceChanged(state: OpeningBalanceState, initial: OpeningBalanceState) {
  if (openingDays(state.days) !== openingDays(initial.days)) return true
  if (state.expiryMode !== initial.expiryMode) return true
  return state.expiryMode === 'custom_date' && state.expiryDate !== initial.expiryDate
}

// يُرسل الرصيد الافتتاحي فقط لموظف يستحق السنوي، وفي التعديل فقط إن غيّر المستخدم الأيام أو الصلاحية
// (إعادة إرسال القيمة المعبّأة كانت تُصفّر المستخدم منه في الخادم).
export function openingBalancePayload(input: {
  mode: 'add' | 'edit'; leaveEntitled: boolean; state: OpeningBalanceState; initial?: OpeningBalanceState; year: number
}): { openingBalanceDays?: number; openingBalanceExpiry?: string | null } {
  if (!input.leaveEntitled) return {}
  const days = openingDays(input.state.days)
  if (days === null) return {}
  if (input.mode === 'edit' && input.initial && !openingBalanceChanged(input.state, input.initial)) return {}
  return { openingBalanceDays: days, openingBalanceExpiry: openingBalanceExpiryValue(input.state, input.year) }
}

// «حتى تاريخ أحدده» يحتاج تاريخًا صالحًا غير ماضٍ؛ تاريخ محفوظ لم يُلمس لا يمنع حفظ باقي الملف.
export function openingBalanceIssue(input: {
  mode: 'add' | 'edit'; leaveEntitled: boolean; state: OpeningBalanceState; initial?: OpeningBalanceState; today: string
}): string | null {
  if (!input.leaveEntitled || openingDays(input.state.days) === null || input.state.expiryMode !== 'custom_date') return null
  const date = input.state.expiryDate
  if (!date) return 'اختر تاريخ انتهاء الرصيد الافتتاحي، أو اختر «بدون انتهاء»'
  if (!validYmd(date)) return 'تاريخ انتهاء الرصيد الافتتاحي غير صالح'
  const unchanged = input.mode === 'edit' && input.initial?.expiryMode === 'custom_date' && input.initial.expiryDate === date
  if (date < input.today && !unchanged) return 'تاريخ انتهاء الرصيد الافتتاحي لا يكون في الماضي'
  return null
}

// ===== دورة الراتب =====
export const DEFAULT_SALARY_CYCLE = 'monthly'
export const SALARY_CYCLE_OPTIONS: SelectOption[] = [
  { value: 'monthly', label: 'شهري' },
  { value: 'biweekly', label: 'كل أسبوعين' },
  { value: 'weekly', label: 'أسبوعي' },
]
// القيمة الظاهرة هي المرسلة: NULL المحفوظ يظهر «شهري» ويُحفظ monthly
export const salaryCycleValue = (value?: string | null) => (value && value.trim() ? value : DEFAULT_SALARY_CYCLE)

// ===== البريد =====
// عمود email لبريد العمل وحده؛ البريد الشخصي له عموده ولا يُنسخ إليه
export function employeeWorkEmailPayload(mode: 'add' | 'edit', workEmail: string, initialWorkEmail?: string): string | null | undefined {
  const email = (workEmail ?? '').trim()
  if (email) return email
  return mode === 'edit' && initialWorkEmail?.trim() ? null : undefined
}

// ===== العنوان «الحي، المدينة» =====
const ADDRESS_SEPARATOR = '،'
export function joinEmployeeAddress(district: string, city: string): string {
  const d = (district ?? '').trim(), c = (city ?? '').trim()
  // مدينة بلا حي تُحفظ بعد الفاصل كي تعود في خانة المدينة
  if (!d && c) return `${ADDRESS_SEPARATOR} ${c}`
  return [d, c].filter(Boolean).join(`${ADDRESS_SEPARATOR} `)
}
export function splitEmployeeAddress(address?: string | null): { district: string; city: string } {
  const value = (address ?? '').trim()
  if (!value) return { district: '', city: '' }
  const index = value.indexOf(ADDRESS_SEPARATOR)
  if (index === -1) return { district: value, city: '' }
  return { district: value.slice(0, index).trim(), city: value.slice(index + 1).trim() }
}
export const displayEmployeeAddress = (address?: string | null) =>
  (address ?? '').trim().replace(new RegExp(`^${ADDRESS_SEPARATOR}\\s*`), '').trim()

// ===== الاسم =====
const nameWords = (full?: string | null) => (full ?? '').trim().split(/\s+/).filter(Boolean)
export const normalizeFullName = (value?: string | null) => nameWords(value).join(' ')

// تقسيم الاسم العربي إلى أجزائه بحيث تُعيد إعادة التجميع الاسم الأصلي حرفياً
export function splitArabicName(full?: string | null) {
  const w = nameWords(full)
  const n = w.length
  return { first: n >= 1 ? w[0] : '', father: n >= 3 ? w[1] : '', grand: n >= 4 ? w.slice(2, n - 1).join(' ') : '', family: n >= 2 ? w[n - 1] : '' }
}
export function splitEnglishName(full?: string | null) {
  const w = nameWords(full)
  const n = w.length
  return { first: n >= 1 ? w[0] : '', middle: n >= 3 ? w.slice(1, n - 1).join(' ') : '', last: n >= 2 ? w[n - 1] : '' }
}

// لا أعمدة لأجزاء الاسم؛ التقسيم تخمين بعدد الكلمات. حين يكون مبهمًا يُعرض الاسم الكامل في خانة واحدة.
const ARABIC_COMPOUND = /^(عبد|ابو|أبو|بن|ابن|بنت|آل|ام|أم)$/
const ENGLISH_COMPOUND = /^(abd|abdel|abdul|abu|abou|bin|ibn|bint|al|el|de|da|di|van|von|der|le|la)$/i
export function arabicNameNeedsFullField(full?: string | null) {
  const w = nameWords(full)
  if (w.length <= 1) return false
  return w.length !== 4 || w.some(word => ARABIC_COMPOUND.test(word))
}
export function englishNameNeedsFullField(full?: string | null) {
  const w = nameWords(full)
  if (w.length <= 1) return false
  return w.length !== 3 || w.some(word => ENGLISH_COMPOUND.test(word))
}

type NameFields = Pick<EmployeeFormState, 'firstNameAr' | 'fatherNameAr' | 'grandNameAr' | 'familyNameAr' | 'firstNameEn' | 'middleNameEn' | 'lastNameEn' | 'nameArFull' | 'nameEnFull'>
export function employeeFullNameAr(form: NameFields) {
  if (form.nameArFull !== undefined) return normalizeFullName(form.nameArFull)
  return [form.firstNameAr, form.fatherNameAr, form.grandNameAr, form.familyNameAr].map(s => (s ?? '').trim()).filter(Boolean).join(' ')
}
export function employeeFullNameEn(form: NameFields) {
  if (form.nameEnFull !== undefined) return normalizeFullName(form.nameEnFull)
  return [form.firstNameEn, form.middleNameEn, form.lastNameEn].map(s => (s ?? '').trim()).filter(Boolean).join(' ')
}

// ===== القوائم من الكتالوجات =====
// الدرجات الفعّالة من كتالوج الدرجات؛ الدرجة المحفوظة المعطّلة أو غير المحمّلة تبقى خيارًا كي لا تُمسح بصمت
export function gradeSelectOptions(rows: Array<{ id: number; name: string; isActive?: boolean }>, current: string): SelectOption[] {
  const options = rows.filter(row => row.isActive !== false).map(row => ({ value: String(row.id), label: row.name }))
  if (current && !options.some(option => option.value === current)) {
    const stored = rows.find(row => String(row.id) === current)
    options.push({ value: current, label: stored ? `${stored.name} (معطّلة)` : `الدرجة المحفوظة #${current}` })
  }
  return options
}

// المسميات الفعّالة من كتالوج المسميات؛ العمود نصي فالقيمة هي المسمى نفسه، والمحفوظ خارج الكتالوج يبقى أول خيار
export function jobTitleSelectOptions(rows: Array<{ title: string; isActive?: boolean }>, current: string): SelectOption[] {
  const titles = Array.from(new Set(rows.filter(row => row.isActive !== false && row.title?.trim()).map(row => row.title)))
  const options = titles.map(title => ({ value: title, label: title }))
  if (current && !titles.includes(current)) options.unshift({ value: current, label: `${current} (القيمة الحالية)` })
  return options
}

// ===== مسح الحقول الاختيارية في التعديل =====
export const EMPLOYEE_CLEARABLE_FIELDS: Array<[keyof EmployeeFormState, keyof ApiEmployee]> = [
  ['departmentId', 'departmentId'], ['teamId', 'teamId'], ['managerId', 'managerEmployeeId'],
  ['costCenterId', 'costCenterId'], ['gradeId', 'gradeId'],
  ['contractEnd', 'contractEnd'], ['contractStart', 'contractStart'], ['contractType', 'contractType'],
  ['contractNumber', 'contractNumber'], ['contractDurationMonths', 'contractDurationMonths'],
  ['noticePeriodDays', 'noticePeriodDays'], ['bankName', 'bankName'], ['iban', 'iban'],
  ['birthDate', 'birthDate'], ['gender', 'gender'], ['maritalStatus', 'maritalStatus'],
  ['nationality', 'nationality'], ['nationalId', 'nationalId'], ['phone', 'phone'],
  ['personalEmail', 'personalEmail'], ['fingerprintCode', 'fingerprintCode'],
  ['emergencyName', 'emergencyContactName'], ['emergencyPhone', 'emergencyContactPhone'],
  ['birthPlace', 'birthPlace'], ['passportNo', 'passportNo'], ['passportExpiry', 'passportExpiry'],
  ['phoneAlt', 'phoneAlt'], ['country', 'country'], ['postalCode', 'postalCode'],
  ['emergencyRelation', 'emergencyRelation'], ['emergencyPhoneAlt', 'emergencyPhoneAlt'],
  ['actualStartDate', 'actualStartDate'], ['probationEndDate', 'probationEndDate'],
  ['salaryEntitlementStart', 'salaryEntitlementStart'],
  ['recruitmentSource', 'recruitmentSource'], ['workLocation', 'workLocation'],
  ['bankBranch', 'bankBranch'], ['gosiNumber', 'gosiNumber'], ['gosiBaseSalary', 'gosiBaseSalary'],
  ['housingAllowance', 'housingAllowance'], ['transportAllowance', 'transportAllowance'],
  ['phoneAllowance', 'phoneAllowance'], ['workNatureAllowance', 'workNatureAllowance'], ['otherAllowance', 'otherAllowance'],
  ['jobTitle', 'jobTitle'], ['workType', 'workType'], ['isGosiRegistered', 'isGosiRegistered'],
]

// حقل كان محمّلًا بقيمة ثم أُفرغ (أو اختير «اختر») يصل PATCH كـ null؛ غير المحمّل لا يُمس
export function clearedEmployeeFields(initial: Partial<EmployeeFormState>, form: EmployeeFormState): Partial<Record<keyof ApiEmployee, null>> {
  const cleared: Partial<Record<keyof ApiEmployee, null>> = {}
  for (const [field, target] of EMPLOYEE_CLEARABLE_FIELDS) {
    if (initial[field] != null && initial[field] !== '' && String(form[field] ?? '').trim() === '') cleared[target] = null
  }
  const hadEnglishName = [initial.firstNameEn, initial.middleNameEn, initial.lastNameEn, initial.nameEnFull].some(value => !!value?.trim())
  if (hadEnglishName && !employeeFullNameEn(form)) cleared.fullNameEn = null
  return cleared
}

// ===== صفوف المؤهلات المكتوبة بلا «+ إضافة» =====
export const QUALIFICATION_KINDS = ['education', 'certifications', 'experiences', 'skills', 'languages'] as const
const QUALIFICATION_REQUIRED: Record<keyof QualificationsPayload, { key: string; label: string; section: string }> = {
  education: { key: 'degree', label: 'المؤهل', section: 'التعليم' },
  certifications: { key: 'name', label: 'اسم الشهادة', section: 'الشهادات المهنية' },
  experiences: { key: 'company', label: 'اسم الشركة', section: 'الخبرات السابقة' },
  skills: { key: 'name', label: 'المهارة', section: 'المهارات' },
  languages: { key: 'language', label: 'اللغة', section: 'اللغات' },
}

// صف مكتوب حقله الإجباري ممتلئ يُضاف تلقائيًا عند الحفظ؛ صف ناقص يوقف الحفظ برسالة بدل ضياعه بصمت
export function settleQualificationDrafts(rows: QualificationsPayload, drafts: Record<keyof QualificationsPayload, QualRow>): {
  rows: QualificationsPayload; added: Array<keyof QualificationsPayload>; issue: string | null
} {
  const next: QualificationsPayload = { ...rows }
  const added: Array<keyof QualificationsPayload> = []
  for (const kind of QUALIFICATION_KINDS) {
    const draft = drafts[kind] ?? {}
    if (!Object.values(draft).some(value => typeof value === 'string' && value.trim())) continue
    const rule = QUALIFICATION_REQUIRED[kind]
    if (!draft[rule.key]?.trim()) {
      return { rows, added: [], issue: `في «${rule.section}» صف مكتوب لم يُضف و«${rule.label}» فارغ: أضف الصف أو امسحه قبل الحفظ` }
    }
    next[kind] = [...rows[kind], draft]
    added.push(kind)
  }
  return { rows: next, added, issue: null }
}

// ===== المستندات المحفوظة (شاشة التعديل) =====
export interface SavedEmployeeDocument { id: number; docType: string; number?: string | null; expiryDate?: string | null; fileRef?: string | null }
export const savedDocumentsOf = (documents: SavedEmployeeDocument[] | null | undefined, docType: string) =>
  (documents ?? []).filter(document => document.docType === docType)
