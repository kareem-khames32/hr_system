// السجل الوظيفي في ملف الموظف: عنوان عربي وقيم مقروءة لكل تغيير.
// الصفوف الحديثة تحمل changeType/fieldName/oldValue/newValue؛ الصفوف القديمة نصوص «salary:/team:/title:/iban:».
// دالة صرفة؛ قواميس الحالة وطريقة الدفع تُمرَّر من الصفحة.

export interface EmployeeHistoryRow {
  changeType?: string | null
  fieldName?: string | null
  oldValue?: unknown
  newValue?: unknown
  oldStatus?: string | null
  newStatus?: string | null
  reason?: string | null
  changedAt: string
  requestId?: number | null
}

export interface EmployeeHistoryView {
  date: string
  title: string
  from: string
  to: string
  reason: string
  requestId?: number
  color: string
}

export interface EmployeeHistoryLookups {
  teams?: Map<number, string>
  departments?: Map<number, string>
  branches?: Map<number, string>
  employees?: Map<number, string>
  grades?: Map<number, string>
  costCenters?: Map<number, string>
  currency: string
  statusLabels: Record<string, string>
  payMethodLabels: Record<string, string>
}

export const EMPLOYEE_FIELD_LABELS: Record<string, string> = {
  teamId: 'الفريق', team: 'الفريق', departmentId: 'الإدارة/القسم', branchId: 'الفرع',
  managerEmployeeId: 'المدير المباشر', jobTitle: 'المسمى الوظيفي', title: 'المسمى الوظيفي',
  gradeId: 'الدرجة الوظيفية', costCenterId: 'مركز التكلفة', workType: 'نوع التوظيف',
  iban: 'الحساب البنكي (IBAN)', bankName: 'اسم البنك', bankBranch: 'فرع البنك', payMethod: 'طريقة الصرف',
  salaryCycle: 'دورة الراتب', currency: 'العملة', gosiBaseSalary: 'الراتب الخاضع للتأمينات',
  basicSalary: 'الراتب الأساسي', salary: 'الراتب', housingAllowance: 'بدل السكن', transportAllowance: 'بدل المواصلات',
  phoneAllowance: 'بدل الهاتف', workNatureAllowance: 'بدل طبيعة العمل', otherAllowance: 'بدلات أخرى',
  contractType: 'نوع العقد', contractStart: 'تاريخ بداية العقد', contractEnd: 'تاريخ نهاية العقد',
  contractNumber: 'رقم العقد', contractDurationMonths: 'مدة العقد (أشهر)', contract: 'مدة العقد',
  phone: 'رقم الجوال', phoneAlt: 'رقم جوال بديل', address: 'العنوان', maritalStatus: 'الحالة الاجتماعية',
  emergencyContactName: 'اسم جهة اتصال الطوارئ', emergencyContactPhone: 'جوال جهة اتصال الطوارئ',
  emergencyRelation: 'صلة القرابة', emergencyPhoneAlt: 'هاتف طوارئ بديل', shift: 'الوردية', status: 'الحالة',
}

const WORK_TYPE: Record<string, string> = { full_time: 'دوام كامل', fulltime: 'دوام كامل', part_time: 'دوام جزئي', parttime: 'دوام جزئي', contract: 'عقد مؤقت', consultant: 'استشاري', intern: 'متدرب' }
const CONTRACT_TYPE: Record<string, string> = { permanent: 'دائم', fixed_term: 'محدد المدة', part_time: 'دوام جزئي', seasonal: 'موسمي' }
const SALARY_CYCLE: Record<string, string> = { monthly: 'شهري', biweekly: 'كل أسبوعين', weekly: 'أسبوعي' }
const MARITAL: Record<string, string> = { single: 'أعزب', married: 'متزوج', divorced: 'مطلق', widowed: 'أرمل' }
const RELATION: Record<string, string> = { spouse: 'زوج/زوجة', parent: 'أب/أم', sibling: 'أخ/أخت', child: 'ابن/ابنة', other: 'أخرى' }
const MONEY_FIELDS = /^(basicSalary|salary|housingAllowance|transportAllowance|phoneAllowance|workNatureAllowance|otherAllowance|gosiBaseSalary)$/

const COLORS: Record<string, string> = {
  STATUS: 'bg-primary-100 text-primary-600', SALARY: 'bg-success-100 text-success-600', BANK: 'bg-orange-100 text-orange-600',
  TEAM: 'bg-blue-100 text-blue-600', TITLE: 'bg-indigo-100 text-indigo-600', CONTRACT: 'bg-purple-100 text-purple-600',
  SHIFT: 'bg-amber-100 text-amber-700', DATA: 'bg-teal-100 text-teal-600',
}

const fmtDate = (value?: string | null) => (value ? String(value).slice(0, 10) : '—')
const isBlank = (value: unknown) => value === null || value === undefined || value === '' || value === '—'

export function employeeHistoryValue(field: string, value: unknown, lookups: EmployeeHistoryLookups): string {
  if (isBlank(value)) return '—'
  const text = typeof value === 'object' ? JSON.stringify(value) : String(value)
  const named = (map?: Map<number, string>) => map?.get(Number(value)) ?? `#${text}`
  switch (field) {
    case 'teamId': case 'team': return named(lookups.teams)
    case 'departmentId': return named(lookups.departments)
    case 'branchId': return named(lookups.branches)
    case 'managerEmployeeId': return named(lookups.employees)
    case 'gradeId': return named(lookups.grades)
    case 'costCenterId': return named(lookups.costCenters)
    case 'workType': return WORK_TYPE[text] ?? text
    case 'contractType': return CONTRACT_TYPE[text] ?? text
    case 'salaryCycle': return SALARY_CYCLE[text] ?? text
    case 'payMethod': return lookups.payMethodLabels[text] ?? text
    case 'maritalStatus': return MARITAL[text] ?? text
    case 'emergencyRelation': return RELATION[text] ?? text
    case 'status': return lookups.statusLabels[text] ?? text
    case 'contractStart': case 'contractEnd': return text.slice(0, 10)
  }
  if (MONEY_FIELDS.test(field)) {
    const amount = Number(value)
    return Number.isFinite(amount) ? `${amount.toLocaleString('en-US')} ${lookups.currency}`.trim() : text
  }
  if (typeof value === 'boolean') return value ? 'نعم' : 'لا'
  return text
}

function titleOf(changeType: string, field: string) {
  if (field === 'contract') return 'تجديد العقد'
  switch (changeType) {
    case 'SALARY': return MONEY_FIELDS.test(field) || field === 'currency' ? 'تغيير راتب' : 'تغيير بيانات مالية'
    case 'BANK': return field === 'iban' ? 'تغيير حساب بنكي' : 'تغيير بيانات بنكية'
    case 'TEAM': return field === 'teamId' || field === 'team' ? 'نقل بين فرق' : field === 'branchId' ? 'نقل بين فروع'
      : field === 'departmentId' ? 'نقل بين أقسام' : 'تغيير المدير المباشر'
    case 'TITLE': return 'تغيير المسمى الوظيفي'
    case 'CONTRACT': return 'تغيير بيانات العقد'
    case 'SHIFT': return 'تغيير الوردية'
    default: return 'تحديث بيانات'
  }
}

// الصفوف القديمة بلا changeType: نص «نوع:قيمة» في oldStatus/newStatus
function legacyHistory(row: EmployeeHistoryRow, lookups: EmployeeHistoryLookups, base: Pick<EmployeeHistoryView, 'date' | 'reason' | 'requestId'>): EmployeeHistoryView {
  const split = (value: string): [string | null, string] => {
    const index = value.indexOf(':')
    return index > -1 ? [value.slice(0, index), value.slice(index + 1)] : [null, value]
  }
  const [kind, toValue] = split(row.newStatus ?? '')
  const [, fromValue] = split(row.oldStatus ?? '')
  switch (kind) {
    case 'salary':
      return { ...base, title: 'تغيير راتب', from: `الراتب: ${Number(fromValue || 0).toLocaleString('en-US')} ${lookups.currency}`, to: `${Number(toValue || 0).toLocaleString('en-US')} ${lookups.currency}`, color: COLORS.SALARY }
    case 'team':
      return { ...base, title: 'نقل بين فرق', from: `الفريق: ${lookups.teams?.get(Number(fromValue)) ?? `#${fromValue}`}`, to: lookups.teams?.get(Number(toValue)) ?? `#${toValue}`, color: COLORS.TEAM }
    case 'title':
      return { ...base, title: 'ترقية', from: `المسمى: ${fromValue || '—'}`, to: toValue || '—', color: COLORS.TITLE }
    case 'iban':
      return { ...base, title: 'تغيير حساب بنكي', from: `الحساب: ${fromValue || '—'}`, to: toValue || '—', color: COLORS.BANK }
  }
  if ((row.newStatus ?? '') === 'data_update') return { ...base, title: 'تحديث بيانات', from: '—', to: '—', color: COLORS.DATA }
  return {
    ...base, title: 'تغيير حالة',
    from: lookups.statusLabels[row.oldStatus ?? ''] ?? (row.oldStatus || '—'),
    to: lookups.statusLabels[row.newStatus ?? ''] ?? (row.newStatus || '—'),
    color: COLORS.STATUS,
  }
}

export function describeEmployeeHistory(row: EmployeeHistoryRow, lookups: EmployeeHistoryLookups): EmployeeHistoryView {
  const base = { date: fmtDate(row.changedAt), reason: row.reason || '—', requestId: row.requestId ?? undefined }
  // تغيير مالي محجوب عن صلاحيات الحساب — الخادم أخفى القيم والسبب
  if (/^financial:/.test(row.oldStatus ?? '') || /^financial:/.test(row.newStatus ?? '')) {
    return { ...base, title: 'تغيير بيانات مالية', from: 'التفاصيل محجوبة', to: 'محجوبة', color: COLORS.SALARY }
  }
  if (row.changeType && row.changeType !== 'STATUS') {
    const field = row.fieldName || row.changeType.toLowerCase()
    if (field === 'legacy_data_update') return { ...base, title: 'تحديث بيانات', from: '—', to: '—', color: COLORS.DATA }
    const label = EMPLOYEE_FIELD_LABELS[field] ?? field
    return {
      ...base,
      title: titleOf(row.changeType, field),
      from: `${label}: ${employeeHistoryValue(field, row.oldValue, lookups)}`,
      to: employeeHistoryValue(field, row.newValue, lookups),
      color: COLORS[row.changeType] ?? COLORS.DATA,
    }
  }
  return legacyHistory(row, lookups, base)
}
