// تحديث بيانات مجموعة موظفين من ملف (Excel أو CSV) بكود الموظف.
// ملف صرف بلا Nest ولا TypeORM ولا exceljs: الواجهة تستورده لقائمة الحقول، والخادم لقراءة CSV وتطبيع قيم الخلايا.
import { PAID_SALARY_COMPONENTS } from './compensation'
import { EMPLOYEE_PHONE_PATTERN } from './employee-required-fields'

export const BULK_UPDATE_MAX_ROWS = 2000
export const BULK_UPDATE_MAX_FILE_BYTES = 5 * 1024 * 1024
export const BULK_CODE_HEADER = 'كود الموظف'
export const BULK_NAME_HEADER = 'اسم الموظف'
export const BULK_SALARY_MONTH_HEADER = 'يسري من راتب شهر'
/** الكلمة اللي بتمسح قيمة حقل اختياري؛ الخلية الفاضية = بدون تغيير */
export const BULK_CLEAR_WORD = 'مسح'

export type BulkFieldGroup = 'personal' | 'job' | 'contract' | 'bank' | 'insurance' | 'salary'
export const BULK_FIELD_GROUPS: ReadonlyArray<{ key: BulkFieldGroup; label: string }> = [
  { key: 'personal', label: 'البيانات الشخصية' },
  { key: 'job', label: 'البيانات الوظيفية' },
  { key: 'contract', label: 'العقد' },
  { key: 'bank', label: 'البنك وطريقة الصرف' },
  { key: 'insurance', label: 'التأمينات الاجتماعية' },
  { key: 'salary', label: 'الراتب والبدلات' },
]

// أعمدة الراتب: المكونات السبعة المصروفة (آخرها «بدل ضغط العمل») — كود الموظف + البدل يكفي لتحديثه من ملف
export type BulkSalaryKey = typeof PAID_SALARY_COMPONENTS[number]['key']
export type BulkFieldKey =
  | 'phone' | 'email' | 'nationalId' | 'nationality' | 'gender' | 'birthDate'
  | 'fingerprintCode' | 'branch' | 'department' | 'team' | 'jobTitle' | 'costCenter' | 'grade' | 'manager'
  | 'contractType' | 'contractStart' | 'contractEnd'
  | 'bankName' | 'iban' | 'payMethod' | 'bankTransferAmount'
  | 'gosiNumber' | 'isGosiRegistered' | 'gosiBaseSalary'
  | BulkSalaryKey

export type BulkFieldKind = 'text' | 'phone' | 'email' | 'nationalId' | 'date' | 'enum' | 'money' | 'bool' | 'iban' | 'ref'
export interface BulkFieldOption { value: string; label: string; aliases?: string[] }
export interface BulkFieldDef {
  key: BulkFieldKey
  label: string
  group: BulkFieldGroup
  kind: BulkFieldKind
  maxLength?: number
  options?: BulkFieldOption[]
  /** «مسح» مسموحة (حقل اختياري) */
  clearable?: boolean
  /** رقم بيتكتب نص (أصفار في أوله) — عمود نص في Excel، وفرق الأصفار/الرموز في أوله بيتجاهل */
  textual?: boolean
  /** أجر: يحتاج صلاحية اعتماد المسير ويتحفظ في سجل الأجر بشهر سريان */
  salary?: boolean
  hint: string
  aliases?: string[]
}

export const GENDER_OPTIONS: BulkFieldOption[] = [
  { value: 'male', label: 'ذكر' }, { value: 'female', label: 'أنثى', aliases: ['انثي'] },
]
export const PAY_METHOD_OPTIONS: BulkFieldOption[] = [
  { value: 'transfer', label: 'تحويل بنكي', aliases: ['تحويل', 'بنك'] },
  { value: 'cash', label: 'نقدي', aliases: ['كاش'] },
  { value: 'mixed', label: 'نقدي + بنك', aliases: ['نقدي وبنك', 'نقدي+بنك', 'بنك + نقدي'] },
]
export const CONTRACT_TYPE_OPTIONS: BulkFieldOption[] = [
  { value: 'permanent', label: 'دائم', aliases: ['غير محدد المدة'] },
  { value: 'fixed_term', label: 'محدد المدة' },
  { value: 'part_time', label: 'دوام جزئي' },
  { value: 'seasonal', label: 'موسمي' },
]
export const YES_NO_OPTIONS: BulkFieldOption[] = [
  { value: 'true', label: 'نعم', aliases: ['yes', 'true', '1', 'مسجل', 'اه', 'ايوه'] },
  { value: 'false', label: 'لا', aliases: ['no', 'false', '0', 'غير مسجل', 'مش مسجل'] },
]

const DATE_HINT = 'تاريخ بالشكل 2026-01-31'
const MONEY_HINT = 'رقم بمنزلتين عشريتين على الأكثر'
const optionHint = (options: BulkFieldOption[]) => options.map(option => option.label).join(' / ')

export const BULK_FIELDS: ReadonlyArray<BulkFieldDef> = [
  { key: 'phone', label: 'رقم الجوال', group: 'personal', kind: 'phone', textual: true, hint: 'أرقام، ممكن تبدأ بـ+', aliases: ['الجوال', 'الموبايل', 'رقم الموبايل', 'mobile'] },
  { key: 'email', label: 'البريد الإلكتروني للعمل', group: 'personal', kind: 'email', maxLength: 200, clearable: true, hint: 'بريد صالح', aliases: ['البريد الالكتروني', 'الايميل', 'email'] },
  { key: 'nationalId', label: 'رقم الهوية / الإقامة', group: 'personal', kind: 'nationalId', textual: true, hint: 'أرقام بطول الجنسية', aliases: ['رقم الهوية', 'رقم الاقامة', 'الرقم القومي', 'national id'] },
  { key: 'nationality', label: 'الجنسية', group: 'personal', kind: 'text', maxLength: 100, hint: 'مثلاً: سعودي، مصري' },
  { key: 'gender', label: 'الجنس', group: 'personal', kind: 'enum', options: GENDER_OPTIONS, hint: optionHint(GENDER_OPTIONS), aliases: ['النوع'] },
  { key: 'birthDate', label: 'تاريخ الميلاد', group: 'personal', kind: 'date', hint: DATE_HINT },

  { key: 'fingerprintCode', label: 'رقم البصمة', group: 'job', kind: 'text', maxLength: 20, textual: true, hint: 'لحد 20 خانة — مايتكررش', aliases: ['كود البصمة'] },
  { key: 'branch', label: 'الفرع', group: 'job', kind: 'ref', hint: 'اسم الفرع زي ما هو في النظام' },
  { key: 'department', label: 'القسم', group: 'job', kind: 'ref', hint: 'اسم القسم في فرع الموظف' },
  { key: 'team', label: 'الفريق', group: 'job', kind: 'ref', clearable: true, hint: 'اسم الفريق في قسم الموظف' },
  { key: 'jobTitle', label: 'المسمى الوظيفي', group: 'job', kind: 'text', maxLength: 100, hint: 'من كتالوج المسميات الوظيفية', aliases: ['الوظيفة'] },
  { key: 'costCenter', label: 'مركز التكلفة', group: 'job', kind: 'ref', clearable: true, hint: 'كود مركز التكلفة أو اسمه' },
  { key: 'grade', label: 'الدرجة الوظيفية', group: 'job', kind: 'ref', clearable: true, hint: 'اسم الدرجة', aliases: ['الدرجة'] },
  { key: 'manager', label: 'كود المدير المباشر', group: 'job', kind: 'ref', clearable: true, textual: true, hint: 'كود الموظف اللي هيبقى مديره', aliases: ['المدير المباشر'] },

  { key: 'contractType', label: 'نوع العقد', group: 'contract', kind: 'enum', options: CONTRACT_TYPE_OPTIONS, hint: optionHint(CONTRACT_TYPE_OPTIONS) },
  { key: 'contractStart', label: 'بداية العقد', group: 'contract', kind: 'date', hint: DATE_HINT },
  { key: 'contractEnd', label: 'نهاية العقد', group: 'contract', kind: 'date', clearable: true, hint: DATE_HINT },

  { key: 'bankName', label: 'اسم البنك', group: 'bank', kind: 'text', maxLength: 100, hint: 'اسم البنك', aliases: ['البنك'] },
  { key: 'iban', label: 'الآيبان', group: 'bank', kind: 'iban', textual: true, hint: 'يبدأ برمز الدولة (SA…)', aliases: ['iban', 'رقم الايبان', 'رقم الحساب'] },
  { key: 'payMethod', label: 'طريقة الصرف', group: 'bank', kind: 'enum', options: PAY_METHOD_OPTIONS, hint: optionHint(PAY_METHOD_OPTIONS) },
  { key: 'bankTransferAmount', label: 'مبلغ التحويل البنكي', group: 'bank', kind: 'money', hint: 'مع «نقدي + بنك» بس' },

  { key: 'gosiNumber', label: 'رقم التأمينات', group: 'insurance', kind: 'text', maxLength: 40, textual: true, hint: 'رقم الاشتراك', aliases: ['رقم التأمينات الاجتماعية', 'gosi'] },
  { key: 'isGosiRegistered', label: 'مسجل في التأمينات', group: 'insurance', kind: 'bool', options: YES_NO_OPTIONS, hint: 'نعم / لا' },
  { key: 'gosiBaseSalary', label: 'الأجر التأميني', group: 'insurance', kind: 'money', hint: MONEY_HINT, aliases: ['الراتب الخاضع للتأمينات'] },

  ...PAID_SALARY_COMPONENTS.map(component => ({ key: component.key as BulkFieldKey, label: component.nameAr, group: 'salary' as const,
    kind: 'money' as const, salary: true, hint: MONEY_HINT })),
]

export const BULK_FIELD_BY_KEY: ReadonlyMap<BulkFieldKey, BulkFieldDef> = new Map(BULK_FIELDS.map(field => [field.key, field]))
export const isBulkFieldKey = (value: unknown): value is BulkFieldKey => typeof value === 'string' && BULK_FIELD_BY_KEY.has(value as BulkFieldKey)
export const bulkFieldsUseSalary = (keys: readonly BulkFieldKey[]) => keys.some(key => BULK_FIELD_BY_KEY.get(key)?.salary)

// ===== تطبيع النص =====

/** أرقام عربية/فارسية → لاتينية، والفاصلة العشرية العربية → نقطة. */
export function latinDigits(value: string): string {
  return value
    .replace(/[٠-٩]/g, digit => String(digit.charCodeAt(0) - 0x0660))
    .replace(/[۰-۹]/g, digit => String(digit.charCodeAt(0) - 0x06f0))
    .replace(/٫/g, '.').replace(/٬/g, ',')
}

/** مفتاح مقارنة للأسماء والعناوين: بلا تشكيل ولا تطويل، والألف/الياء/التاء المربوطة موحدة. */
export function arabicKey(value: unknown): string {
  return latinDigits(String(value ?? ''))
    .replace(/[ً-ْٰـ]/g, '')
    .replace(/[أإآٱ]/g, 'ا').replace(/ى/g, 'ي').replace(/ة/g, 'ه').replace(/ؤ/g, 'و').replace(/ئ/g, 'ي')
    .replace(/[*:()[\]]/g, ' ')
    .replace(/\s+/g, ' ').trim().toLowerCase()
}

// ===== خلايا الملف =====

export type BulkCell = string | number | boolean | Date | null | undefined
const pad = (value: number, size = 2) => String(value).padStart(size, '0')

function validDate(year: number, month: number, day: number): string | null {
  if (!(year >= 1900 && year <= 2100 && month >= 1 && month <= 12 && day >= 1)) return null
  const leap = year % 4 === 0 && (year % 100 !== 0 || year % 400 === 0)
  if (day > [31, leap ? 29 : 28, 31, 30, 31, 30, 31, 31, 30, 31, 30, 31][month - 1]) return null
  return `${year}-${pad(month)}-${pad(day)}`
}

/** رقم بدون صيغة علمية ولا فواصل آلاف (أرقام الهوية الطويلة تفضل زي ما هي). */
function numberText(value: number): string {
  if (!Number.isFinite(value)) return String(value)
  return value.toLocaleString('en-US', { useGrouping: false, maximumFractionDigits: 20 })
}

/** نص الخلية بعد القص؛ الفاصلة العليا في أول الخلية (تحييد Excel) بتتشال. */
export function bulkCellText(cell: BulkCell): string {
  if (cell === null || cell === undefined) return ''
  if (cell instanceof Date) {
    return Number.isFinite(cell.getTime()) ? `${cell.getUTCFullYear()}-${pad(cell.getUTCMonth() + 1)}-${pad(cell.getUTCDate())}` : ''
  }
  if (typeof cell === 'number') return numberText(cell)
  if (typeof cell === 'boolean') return cell ? 'نعم' : 'لا'
  return String(cell).replace(/^﻿/, '').trim().replace(/^'/, '').trim()
}

export const isBlankCell = (cell: BulkCell) => bulkCellText(cell) === ''
export const isClearWord = (cell: BulkCell) => arabicKey(bulkCellText(cell)) === arabicKey(BULK_CLEAR_WORD)

/** تاريخ YYYY-MM-DD من خلية: تاريخ Excel، رقم تسلسلي، 2026-01-31، 2026/1/31، أو 31/1/2026. */
export function parseBulkDate(cell: BulkCell): string | null {
  if (cell instanceof Date) return Number.isFinite(cell.getTime()) ? validDate(cell.getUTCFullYear(), cell.getUTCMonth() + 1, cell.getUTCDate()) : null
  const text = latinDigits(bulkCellText(cell))
  const serial = typeof cell === 'number' ? cell : /^\d{4,5}$/.test(text) ? Number(text) : NaN
  if (Number.isInteger(serial) && serial > 0 && serial < 2958466) {
    // رقم Excel التسلسلي: الأيام من 1899-12-30
    const date = new Date(Date.UTC(1899, 11, 30) + serial * 86400000)
    return validDate(date.getUTCFullYear(), date.getUTCMonth() + 1, date.getUTCDate())
  }
  let match = /^(\d{4})[-/.](\d{1,2})[-/.](\d{1,2})(?:[ T].*)?$/.exec(text)
  if (match) return validDate(Number(match[1]), Number(match[2]), Number(match[3]))
  match = /^(\d{1,2})[-/.](\d{1,2})[-/.](\d{4})$/.exec(text)
  if (match) return validDate(Number(match[3]), Number(match[2]), Number(match[1]))
  return null
}

/** شهر الراتب YYYY-MM من خلية: 2026-09، 2026/9، 9/2026، أو تاريخ. */
export function parseBulkMonth(cell: BulkCell): string | null {
  if (cell instanceof Date) return Number.isFinite(cell.getTime()) ? `${cell.getUTCFullYear()}-${pad(cell.getUTCMonth() + 1)}` : null
  const text = latinDigits(bulkCellText(cell))
  let match = /^(\d{4})[-/.](\d{1,2})$/.exec(text)
  if (match && Number(match[2]) >= 1 && Number(match[2]) <= 12) return `${match[1]}-${pad(Number(match[2]))}`
  match = /^(\d{1,2})[-/.](\d{4})$/.exec(text)
  if (match && Number(match[1]) >= 1 && Number(match[1]) <= 12) return `${match[2]}-${pad(Number(match[1]))}`
  const date = parseBulkDate(cell)
  return date ? date.slice(0, 7) : null
}

/** مبلغ نصي بمنزلتين «1234.50»، أو null لو مش مبلغ صالح غير سالب. */
export function parseBulkMoney(cell: BulkCell): string | null {
  let text: string
  if (typeof cell === 'number') {
    if (!Number.isFinite(cell) || cell < 0) return null
    const cents = Math.round(cell * 100)
    // حساب Excel العشري (1100.0000000000002) مقبول، أكتر من منزلتين فعلاً مرفوض
    if (Math.abs(cell * 100 - cents) > 1e-6) return null
    text = (cents / 100).toFixed(2)
  } else {
    text = latinDigits(bulkCellText(cell)).replace(/\s/g, '')
    if (/^\d{1,3}(,\d{3})+(\.\d+)?$/.test(text)) text = text.replace(/,/g, '')
  }
  const match = /^(\d+)(?:\.(\d{1,2}))?$/.exec(text)
  if (!match) return null
  const whole = match[1].replace(/^0+(?=\d)/, '')
  if (whole.length > 16) return null
  return `${whole}.${(match[2] ?? '').padEnd(2, '0')}`
}

export const moneyKey = (value: unknown): string | null => {
  if (value === null || value === undefined || value === '') return null
  return parseBulkMoney(typeof value === 'number' ? value : String(value))
}

export function optionOf(options: readonly BulkFieldOption[], cell: BulkCell): BulkFieldOption | null {
  const key = arabicKey(bulkCellText(cell))
  if (!key) return null
  return options.find(option => [option.value, option.label, ...(option.aliases ?? [])].some(candidate => arabicKey(candidate) === key)) ?? null
}

export type BulkParsed = { ok: true; value: string | boolean | null } | { ok: false; error: string }

/**
 * قيمة خلية حقل بعد التطبيع — null = مسح (للحقول اللي بتتمسح بس). الخلية الفاضية مش بتوصل هنا (= بدون تغيير).
 * الإسناد بالاسم (فرع/قسم/فريق/مدير…) بيرجع النص، وحله بالبيانات في الخطة.
 */
export function parseBulkField(def: BulkFieldDef, cell: BulkCell): BulkParsed {
  if (isClearWord(cell)) {
    return def.clearable ? { ok: true, value: null } : { ok: false, error: 'الحقل ده مطلوب وماينفعش يتمسح' }
  }
  const text = latinDigits(bulkCellText(cell))
  if (def.textual && /^\d+(\.\d+)?e\+\d+$/i.test(text)) {
    return { ok: false, error: 'الرقم اتحول لصيغة علمية (E+) في Excel — خلي العمود «نص» واكتب الرقم كامل' }
  }
  const tooLong = def.maxLength !== undefined && text.length > def.maxLength
  switch (def.kind) {
    case 'text':
    case 'ref': {
      const value = text.replace(/\s+/g, ' ')
      if (tooLong) return { ok: false, error: `بحد أقصى ${def.maxLength} حرف` }
      return { ok: true, value }
    }
    case 'phone': {
      const value = text.replace(/\s+/g, ' ')
      return EMPLOYEE_PHONE_PATTERN.test(value) ? { ok: true, value } : { ok: false, error: 'رقم جوال غير صالح' }
    }
    case 'email': {
      const value = text.toLowerCase()
      if (tooLong) return { ok: false, error: `بحد أقصى ${def.maxLength} حرف` }
      return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value) ? { ok: true, value } : { ok: false, error: 'بريد إلكتروني غير صالح' }
    }
    case 'nationalId': {
      const value = text.replace(/[\s-]/g, '')
      return /^\d{10,14}$/.test(value) ? { ok: true, value } : { ok: false, error: 'أرقام بس (من 10 لـ14 رقم)' }
    }
    case 'iban': {
      const value = text.replace(/[\s-]/g, '').toUpperCase()
      return /^[A-Z]{2}[A-Z0-9]{13,32}$/.test(value) ? { ok: true, value } : { ok: false, error: 'آيبان غير صالح (يبدأ برمز الدولة ثم أرقام/حروف)' }
    }
    case 'date': {
      const value = parseBulkDate(cell)
      return value ? { ok: true, value } : { ok: false, error: `تاريخ غير صحيح — اكتبه ${DATE_HINT.replace('تاريخ ', '')}` }
    }
    case 'money': {
      const value = parseBulkMoney(cell)
      return value ? { ok: true, value } : { ok: false, error: `مبلغ غير صالح — ${MONEY_HINT} ومش سالب` }
    }
    case 'enum':
    case 'bool': {
      const option = optionOf(def.options ?? [], cell)
      if (!option) return { ok: false, error: `القيمة «${bulkCellText(cell)}» مش من الاختيارات (${optionHint(def.options ?? [])})` }
      return { ok: true, value: def.kind === 'bool' ? option.value === 'true' : option.value }
    }
  }
}

// ===== العناوين =====

export type BulkColumnKey = BulkFieldKey | 'code' | 'name' | 'salaryMonth'
export interface BulkColumn { index: number; header: string; key: BulkColumnKey | null }

const HEADER_KEYS: ReadonlyArray<[BulkColumnKey, string[]]> = [
  ['code', [BULK_CODE_HEADER, 'الكود', 'كود', 'الرقم الوظيفي', 'employee code', 'code']],
  ['name', [BULK_NAME_HEADER, 'الاسم', 'الموظف', 'name']],
  ['salaryMonth', [BULK_SALARY_MONTH_HEADER, 'شهر السريان', 'يسري من شهر']],
  ...BULK_FIELDS.map(field => [field.key, [field.label, field.key, ...(field.aliases ?? [])]] as [BulkColumnKey, string[]]),
]
const HEADER_LOOKUP = new Map<string, BulkColumnKey>()
for (const [key, names] of HEADER_KEYS) for (const name of names) if (!HEADER_LOOKUP.has(arabicKey(name))) HEADER_LOOKUP.set(arabicKey(name), key)

/** عمود كل عنوان في الصف الأول؛ العمود المجهول key = null (بيتجاهل ويتقال عليه في المعاينة). */
export function mapBulkHeader(header: readonly BulkCell[]): { columns: BulkColumn[]; errors: string[] } {
  const columns: BulkColumn[] = []
  const errors: string[] = []
  const seen = new Map<BulkColumnKey, string>()
  header.forEach((cell, index) => {
    const text = bulkCellText(cell)
    if (!text) return
    let key = HEADER_LOOKUP.get(arabicKey(text)) ?? null
    if (key && seen.has(key)) {
      errors.push(`العمود «${text}» متكرر (نفس «${seen.get(key)}») — سيب عمود واحد بس`)
      key = null
    } else if (key) seen.set(key, text)
    columns.push({ index, header: text, key })
  })
  if (!seen.has('code')) errors.unshift(`الصف الأول لازم يكون فيه عمود «${BULK_CODE_HEADER}»`)
  const fields = columns.filter(column => column.key && isBulkFieldKey(column.key))
  if (!fields.length && seen.has('code')) errors.push('مفيش ولا عمود بيانات معروف غير الكود — نزّل القالب واستخدم عناوينه')
  return { columns, errors }
}

// ===== CSV =====

/** CSV بـUTF-8 (مع أو بدون BOM)؛ الفاصل «,» أو «;» أو Tab حسب سطر العناوين. الخلايا نصوص. */
export function parseCsv(input: string): string[][] {
  const text = input.replace(/^﻿/, '')
  const firstLine = text.slice(0, Math.max(0, text.search(/\r?\n/)) || text.length)
  const count = (char: string) => firstLine.split(char).length - 1
  const delimiter = [',', ';', '\t'].reduce((best, char) => count(char) > count(best) ? char : best, ',')
  const rows: string[][] = []
  let row: string[] = []
  let cell = ''
  let quoted = false
  for (let i = 0; i < text.length; i++) {
    const char = text[i]
    if (quoted) {
      if (char === '"') {
        if (text[i + 1] === '"') { cell += '"'; i++ } else quoted = false
      } else cell += char
    } else if (char === '"' && cell === '') quoted = true
    else if (char === delimiter) { row.push(cell); cell = '' }
    else if (char === '\n' || char === '\r') {
      if (char === '\r' && text[i + 1] === '\n') i++
      row.push(cell); rows.push(row); row = []; cell = ''
    } else cell += char
  }
  if (cell !== '' || row.length) { row.push(cell); rows.push(row) }
  return rows
}

const csvCell = (value: unknown) => {
  let text = value === null || value === undefined ? '' : String(value)
  // حقن المعادلات: نص يبدأ بـ= أو @ أو +/- مش متبوعة برقم بيتحيد بفاصلة عليا (القراءة بتشيلها)
  if (/^[=@\t\r]/.test(text) || /^[+-](?!\d)/.test(text)) text = `'${text}`
  return /[",\n\r;]/.test(text) ? `"${text.replace(/"/g, '""')}"` : text
}

/** CSV بـBOM عشان العربي يفتح سليم في Excel. */
export function toCsv(rows: ReadonlyArray<ReadonlyArray<unknown>>): string {
  return '﻿' + rows.map(row => row.map(csvCell).join(',')).join('\r\n') + '\r\n'
}

/** الأرقام بس بعد شيل الأصفار اللي في الأول — لمقارنة رقم فقد صفره أو + في Excel بقيمته المحفوظة. */
export const looseDigits = (value: unknown) => latinDigits(String(value ?? '')).replace(/\D/g, '').replace(/^0+/, '')
