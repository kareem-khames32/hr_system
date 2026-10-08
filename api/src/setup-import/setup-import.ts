import type { BulkCell } from '../employees/employee-bulk-update.fields'
import type { BulkSheet } from '../employees/employee-bulk-update.plan'

// B6.1 (ب): مستوردات تجهيز العميل من Excel — الهيكل (فروع وأقسام) والموظفين. هنا القواعد النقية: أعمدة كل قالب، وقراية الصفوف وفحص شكلها.
// الفحص على القاعدة (فرع موجود، قسم في الفرع، تكرار) في الخدمة. نفس نمط «التحديث الجماعي»: قالب ← معاينة من غير كتابة ← تطبيق.

// B6.1 (ج): الأرصدة الافتتاحية للإجازات والسلف القائمة. الرواتب مش هنا — «تحديث جماعي من Excel» القايم بيغطيها.
export const IMPORT_KINDS = ['structure', 'employees', 'balances', 'loans'] as const
export type ImportKind = (typeof IMPORT_KINDS)[number]
export const isImportKind = (value: unknown): value is ImportKind => (IMPORT_KINDS as readonly unknown[]).includes(value)
export const IMPORT_KIND_LABELS: Record<ImportKind, string> = { structure: 'الهيكل (الفروع والأقسام)', employees: 'الموظفين', balances: 'أرصدة الإجازات الافتتاحية', loans: 'السلف القائمة' }
export const IMPORT_MAX_ROWS = 2000

export interface ImportColumn { key: string; header: string; required: boolean; width: number; list?: string[]; note?: string; money?: boolean }
export const IMPORT_COLUMNS: Record<ImportKind, readonly ImportColumn[]> = {
  structure: [
    { key: 'branchCode', header: 'كود الفرع', required: true, width: 16, note: 'حروف إنجليزي وأرقام — بيتعرّف بيه الفرع في باقي الملفات' },
    { key: 'branchName', header: 'اسم الفرع', required: false, width: 28, note: 'مطلوب لفرع جديد' },
    { key: 'country', header: 'الدولة', required: false, width: 12, list: ['EG', 'SA'], note: 'مطلوبة لفرع جديد' },
    { key: 'department', header: 'القسم', required: false, width: 28, note: 'سيبه فاضي لو الصف لفرع بس' },
  ],
  employees: [
    { key: 'fingerprintCode', header: 'رقم البصمة', required: true, width: 14 },
    { key: 'fullName', header: 'الاسم الكامل بالعربي', required: true, width: 32 },
    { key: 'fullNameEn', header: 'الاسم بالإنجليزي', required: false, width: 28 },
    { key: 'birthDate', header: 'تاريخ الميلاد', required: true, width: 14, note: 'YYYY-MM-DD' },
    { key: 'gender', header: 'الجنس', required: true, width: 10, list: ['ذكر', 'أنثى'] },
    { key: 'nationality', header: 'الجنسية', required: true, width: 16 },
    { key: 'nationalId', header: 'رقم الهوية / الإقامة', required: false, width: 20, note: 'واحد من الاتنين: الهوية أو الجواز' },
    { key: 'passportNo', header: 'رقم جواز السفر', required: false, width: 18 },
    { key: 'phone', header: 'رقم الجوال', required: true, width: 18 },
    { key: 'joinDate', header: 'تاريخ التعيين', required: true, width: 14, note: 'YYYY-MM-DD' },
    { key: 'branchCode', header: 'كود الفرع', required: true, width: 14 },
    { key: 'department', header: 'القسم', required: true, width: 26 },
    { key: 'jobTitle', header: 'المسمى الوظيفي', required: true, width: 24 },
    { key: 'basicSalary', header: 'الراتب الأساسي', required: true, width: 16, money: true },
  ],
  balances: [
    { key: 'fingerprintCode', header: 'رقم البصمة', required: true, width: 14 },
    { key: 'balanceType', header: 'نوع الرصيد', required: true, width: 14, list: ['سنوية', 'مرضية'] },
    { key: 'remaining', header: 'الرصيد المتبقي بالأيام', required: true, width: 22, note: 'اللي المفروض يبان للموظف النهارده — الفرق بيتسجّل تعديل رصيد' },
  ],
  loans: [
    { key: 'fingerprintCode', header: 'رقم البصمة', required: true, width: 14 },
    { key: 'amount', header: 'المتبقي من السلفة', required: true, width: 18, money: true },
    { key: 'months', header: 'عدد الأقساط المتبقية', required: true, width: 20 },
    { key: 'firstInstallmentPeriod', header: 'شهر أول قسط', required: true, width: 14, note: 'YYYY-MM' },
  ],
}
/** سطور زيادة في تعليمات قالب كل نوع */
export const IMPORT_KIND_NOTES: Partial<Record<ImportKind, string[]>> = {
  balances: ['اكتب الرصيد اللي المفروض يبان للموظف النهارده؛ النظام بيحسب الفرق عن رصيده الحالي وبيسجّله تعديل رصيد بسبب «رصيد افتتاحي».'],
  loans: ['كل صف بيتعمل بيه طلب سلفة باسم الموظف بالمبلغ المتبقي وعدد الأقساط؛ الطلب بيمشي في سلسلة الاعتماد العادية، والسلفة بتتسجّل بعد اعتماده.'],
}
export const OPENING_BALANCE_REASON = 'رصيد افتتاحي — استيراد بيانات التجهيز'
export const LEGACY_LOAN_REASON = 'سلفة قائمة قبل النظام — استيراد بيانات التجهيز'

const GENDERS: Record<string, 'male' | 'female'> = { 'ذكر': 'male', male: 'male', m: 'male', 'أنثى': 'female', 'انثى': 'female', female: 'female', f: 'female' }
const pad = (value: number) => String(value).padStart(2, '0')
/** نص الخلية: التاريخ بيتكتب YYYY-MM-DD (بتوقيت الملف)، والرقم من غير كسور زايدة، والفاضي '' */
export function cellText(cell: BulkCell): string {
  if (cell === null || cell === undefined) return ''
  if (cell instanceof Date) return Number.isNaN(cell.getTime()) ? '' : `${cell.getUTCFullYear()}-${pad(cell.getUTCMonth() + 1)}-${pad(cell.getUTCDate())}`
  if (typeof cell === 'number') return Number.isFinite(cell) ? String(cell) : ''
  return String(cell).trim().replace(/\s+/g, ' ')
}

export interface ImportRow { row: number; values: Record<string, string>; errors: string[] }
/**
 * صفوف الملف بمفاتيح أعمدة القالب: العناوين لازم تكون عناوين القالب (أي ترتيب، والعمود الزيادة مرفوض)، والصف الفاضي بيتشال، والخانة الإجبارية الفاضية خطأ على صفها.
 * خطأ الملف كله (عناوين، عدد صفوف) بيرجع في `fileError`.
 */
export function importRows(kind: ImportKind, sheet: BulkSheet): { rows: ImportRow[]; fileError: string | null } {
  const columns = IMPORT_COLUMNS[kind], headers = sheet.header.map(cellText)
  const unknown = headers.filter(header => header && !columns.some(column => column.header === header))
  if (unknown.length) return { rows: [], fileError: `عمود مش في القالب: ${unknown.slice(0, 5).join('، ')}` }
  if (new Set(headers.filter(Boolean)).size !== headers.filter(Boolean).length) return { rows: [], fileError: 'عمود مكرر في الملف' }
  const missing = columns.filter(column => column.required && !headers.includes(column.header)).map(column => column.header)
  if (missing.length) return { rows: [], fileError: `أعمدة ناقصة: ${missing.join('، ')}` }
  const rows: ImportRow[] = []
  for (const line of sheet.rows) {
    const values: Record<string, string> = {}
    for (const column of columns) { const at = headers.indexOf(column.header); values[column.key] = at < 0 ? '' : cellText(line.cells[at] ?? null) }
    if (Object.values(values).every(value => value === '')) continue
    rows.push({ row: line.row, values, errors: columns.filter(column => column.required && values[column.key] === '').map(column => `«${column.header}» مطلوب`) })
  }
  if (!rows.length) return { rows: [], fileError: 'الملف مافيهوش صفوف بيانات' }
  if (rows.length > IMPORT_MAX_ROWS) return { rows: [], fileError: `الملف أكتر من ${IMPORT_MAX_ROWS} صف — قسّمه` }
  return { rows, fileError: null }
}

/** فحص شكل صف هيكل (من غير قاعدة): كود الفرع، والدولة لو مكتوبة */
export function structureShapeIssues(values: Record<string, string>): string[] {
  const issues: string[] = []
  if (values.branchCode && !/^[A-Za-z0-9_-]{2,20}$/.test(values.branchCode)) issues.push('«كود الفرع» من حرفين لحد 20: حروف إنجليزي وأرقام وشرطة')
  if (values.country && !['EG', 'SA'].includes(values.country.toUpperCase())) issues.push('«الدولة» EG أو SA')
  if (values.branchName.length > 150 || values.department.length > 150) issues.push('الاسم 150 حرف بالكتير')
  return issues
}

/** بيانات إنشاء موظف من صف الملف (الفرع والقسم بيتحلّوا في الخدمة). الراتب رقم موجب أو صفر بكسرين بالكتير، وإلا null مع خطأ. */
export function employeeDraft(values: Record<string, string>): { draft: Record<string, unknown>; issues: string[] } {
  const issues: string[] = []
  const gender = GENDERS[values.gender.toLowerCase()] ?? GENDERS[values.gender]
  if (values.gender && !gender) issues.push('«الجنس» ذكر أو أنثى')
  const salaryText = values.basicSalary.replace(/,/g, '')
  const salaryOk = /^\d{1,9}(\.\d{1,2})?$/.test(salaryText)
  if (values.basicSalary && !salaryOk) issues.push('«الراتب الأساسي» رقم بكسرين بالكتير')
  return { issues, draft: { fingerprintCode: values.fingerprintCode, fullName: values.fullName, fullNameEn: values.fullNameEn || undefined, birthDate: values.birthDate, gender, nationality: values.nationality,
    nationalId: values.nationalId || undefined, passportNo: values.passportNo || undefined, phone: values.phone, joinDate: values.joinDate, jobTitle: values.jobTitle, basicSalary: salaryOk ? Number(salaryText) : undefined } }
}

const BALANCE_TYPES: Record<string, 'annual' | 'sick'> = { 'سنوية': 'annual', 'سنوي': 'annual', annual: 'annual', 'مرضية': 'sick', 'مرضي': 'sick', sick: 'sick' }
/** صف رصيد افتتاحي: النوع (سنوية/مرضية) والمتبقي المطلوب بالأيام (صفر أو أكتر، بكسرين بالكتير) */
export function balanceDraft(values: Record<string, string>): { balanceType: 'annual' | 'sick' | null; days: number | null; issues: string[] } {
  const issues: string[] = []
  const balanceType = BALANCE_TYPES[values.balanceType.toLowerCase()] ?? null
  if (values.balanceType && !balanceType) issues.push('«نوع الرصيد» سنوية أو مرضية')
  const ok = /^\d{1,4}(\.\d{1,2})?$/.test(values.remaining)
  if (values.remaining && !ok) issues.push('«الرصيد المتبقي بالأيام» رقم من صفر بكسرين بالكتير')
  return { balanceType, days: ok ? Number(values.remaining) : null, issues }
}

/** صف سلفة قائمة: المتبقي (أكبر من صفر، نص بكسرين)، عدد الأقساط (1..120)، وشهر أول قسط YYYY-MM (خانة تاريخ بتتقري بشهرها) مش قبل الشهر الحالي */
export function loanDraft(values: Record<string, string>, currentPeriod: string): { amount: string | null; months: number | null; firstInstallmentPeriod: string | null; issues: string[] } {
  const issues: string[] = []
  const amountText = values.amount.replace(/,/g, '')
  const amountOk = /^\d{1,9}(\.\d{1,2})?$/.test(amountText) && Number(amountText) > 0
  if (values.amount && !amountOk) issues.push('«المتبقي من السلفة» رقم أكبر من صفر بكسرين بالكتير')
  const monthsOk = /^\d{1,3}$/.test(values.months) && Number(values.months) >= 1 && Number(values.months) <= 120
  if (values.months && !monthsOk) issues.push('«عدد الأقساط المتبقية» رقم صحيح من 1 لـ120')
  const period = /^\d{4}-(0[1-9]|1[0-2])(-\d{2})?$/.test(values.firstInstallmentPeriod) ? values.firstInstallmentPeriod.slice(0, 7) : null
  if (values.firstInstallmentPeriod && !period) issues.push('«شهر أول قسط» بصيغة YYYY-MM')
  else if (period && period < currentPeriod) issues.push('«شهر أول قسط» فات — اكتب الشهر الحالي أو اللي بعده')
  return { amount: amountOk ? Number(amountText).toFixed(2) : null, months: monthsOk ? Number(values.months) : null, firstInstallmentPeriod: period, issues }
}

/** قيم مكررة في عمود جوه الملف نفسه: رقم الصف ← رسالة */
export function duplicatesIn(rows: ImportRow[], key: string, label: string): Map<number, string> {
  const seen = new Map<string, number>(), out = new Map<number, string>()
  for (const row of rows) {
    const value = row.values[key]?.toLowerCase()
    if (!value) continue
    const first = seen.get(value)
    if (first === undefined) seen.set(value, row.row)
    else out.set(row.row, `«${label}» مكرر في الملف (الصف ${first})`)
  }
  return out
}
