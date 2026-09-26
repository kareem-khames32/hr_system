// خطة التحديث الجماعي: من صفوف الملف + بيانات النظام المقروءة → لكل صف الموظف والتغييرات (قديم → جديد) والأخطاء.
// صرفة بلا قاعدة بيانات: الخدمة تقرأ البيانات وتمررها هنا، والمعاينة والتطبيع يستخدموا نفس الخطة.
// القواعد نفسها بتاعة تعديل ملف الموظف تتفحص تاني عند الحفظ (EmployeesService.update) — هنا بتظهر قبل أي حفظ.
import { inBranchScope } from '../auth/guards'
import type { BranchScope } from '../auth/guards'
import { MONTHLY_SALARY_COMPONENTS } from './compensation'
import { birthDateIssue, nationalIdIssue } from './employee-required-fields'
import { employeePayMethodIssue, PAY_METHOD_LABELS } from '../payroll/pay-split'
import {
  arabicKey, BULK_FIELD_BY_KEY, BULK_FIELDS, BULK_UPDATE_MAX_ROWS, bulkCellText, CONTRACT_TYPE_OPTIONS, GENDER_OPTIONS, isBlankCell,
  isBulkFieldKey, latinDigits, looseDigits, mapBulkHeader, parseBulkField, parseBulkMonth,
  type BulkCell, type BulkColumnKey, type BulkFieldKey, type BulkParsed, type BulkSalaryKey,
} from './employee-bulk-update.fields'

export const SALARY_KEYS = MONTHLY_SALARY_COMPONENTS.map(component => component.key) as BulkSalaryKey[]

export interface BulkSheet { header: BulkCell[]; rows: Array<{ row: number; cells: BulkCell[] }> }
export interface BulkRecord {
  row: number
  code: string
  values: Map<BulkFieldKey, BulkParsed>
  salaryMonth: { ok: true; value: string } | { ok: false; error: string } | null
}
export interface BulkParsedFile {
  columns: Array<{ key: BulkColumnKey; header: string }>
  ignoredColumns: string[]
  fileErrors: string[]
  records: BulkRecord[]
  fields: BulkFieldKey[]
}

/** كود الموظف للمطابقة: أرقام لاتينية، بلا مسافات، حروف كبيرة. */
export const normalizeBulkCode = (cell: BulkCell) => latinDigits(bulkCellText(cell)).replace(/\s+/g, '').toUpperCase()

/** صفوف الملف بعد العناوين وتطبيع كل خلية (بلا قاعدة بيانات). الصف الفاضي كله بيتجاهل. */
export function readBulkSheet(sheet: BulkSheet): BulkParsedFile {
  const { columns, errors } = mapBulkHeader(sheet.header)
  const known = columns.filter(column => column.key) as Array<{ index: number; header: string; key: BulkColumnKey }>
  const fields = known.map(column => column.key).filter(isBulkFieldKey)
  const codeColumn = known.find(column => column.key === 'code')
  const monthColumn = known.find(column => column.key === 'salaryMonth')
  const records: BulkRecord[] = []
  if (codeColumn) {
    for (const { row, cells } of sheet.rows) {
      if (known.every(column => isBlankCell(cells[column.index]))) continue
      const values = new Map<BulkFieldKey, BulkParsed>()
      for (const column of known) {
        if (!isBulkFieldKey(column.key) || isBlankCell(cells[column.index])) continue
        values.set(column.key, parseBulkField(BULK_FIELD_BY_KEY.get(column.key)!, cells[column.index]))
      }
      const monthCell = monthColumn ? cells[monthColumn.index] : null
      const month = isBlankCell(monthCell) ? null : parseBulkMonth(monthCell)
      records.push({ row, code: normalizeBulkCode(cells[codeColumn.index]), values,
        salaryMonth: isBlankCell(monthCell) ? null : month ? { ok: true, value: month } : { ok: false, error: 'شهر غير صحيح — اكتبه بالشكل 2026-09' } })
    }
  }
  if (records.length > BULK_UPDATE_MAX_ROWS) errors.push(`الملف فيه ${records.length} صف — الحد ${BULK_UPDATE_MAX_ROWS} صف في المرة، قسّمه على أكتر من ملف`)
  return { columns: known.map(({ key, header }) => ({ key, header })), ignoredColumns: columns.filter(column => !column.key).map(column => column.header),
    fileErrors: errors, records, fields }
}

/** القيم اللي الخدمة محتاجة تقراها من قاعدة البيانات قبل الخطة. */
export function bulkLookupKeys(file: BulkParsedFile) {
  const codes = new Set<string>(), fingerprintCodes = new Set<string>(), nationalIds = new Set<string>(), emails = new Set<string>()
  for (const record of file.records) {
    if (record.code) codes.add(record.code)
    const ok = (key: BulkFieldKey) => { const parsed = record.values.get(key); return parsed?.ok && typeof parsed.value === 'string' ? parsed.value : null }
    const manager = ok('manager'), fingerprint = ok('fingerprintCode'), nationalId = ok('nationalId'), email = ok('email')
    if (manager) codes.add(normalizeBulkCode(manager))
    if (fingerprint) fingerprintCodes.add(fingerprint)
    if (nationalId) nationalIds.add(nationalId)
    if (email) emails.add(email)
  }
  return { codes: [...codes], fingerprintCodes: [...fingerprintCodes], nationalIds: [...nationalIds], emails: [...emails] }
}

type Nullable<T> = { [K in keyof T]: T[K] | null }
export type BulkEmployeeSnapshot = Nullable<{
  departmentId: number; teamId: number; managerEmployeeId: number; costCenterId: number; gradeId: number; branchId: number
  jobTitle: string; phone: string; email: string; nationalId: string; nationality: string; gender: string; birthDate: string
  fingerprintCode: string; contractType: string; contractStart: string; contractEnd: string; bankName: string; iban: string
  payMethod: string; bankTransferAmount: string; gosiNumber: string; isGosiRegistered: boolean; gosiBaseSalary: string; currency: string
}> & Record<BulkSalaryKey, string | null> & { id: number; employeeCode: string; fullName: string; status: string }

export interface BulkRef { id: number; name: string; isActive?: boolean | null }
export interface BulkHolder { id: number; fullName: string; branchId: number | null }
export type BulkUniqueField = 'fingerprintCode' | 'nationalId' | 'email'
export interface BulkLookups {
  /** الموظفين اللي أكوادهم في الملف (موظفين ومديرين) — جوه وبرا النطاق — بمفتاح الكود المطبّع */
  employees: ReadonlyMap<string, BulkEmployeeSnapshot>
  /** عرض المدير الحالي بالمعرّف */
  people: ReadonlyMap<number, { employeeCode: string; fullName: string }>
  branches: BulkRef[]
  departments: Array<BulkRef & { branchId: number }>
  teams: Array<BulkRef & { departmentId: number }>
  costCenters: Array<BulkRef & { code: string }>
  grades: BulkRef[]
  jobTitles: Array<{ title: string; isActive?: boolean | null }>
  /** أصحاب القيم الفريدة الحاليين بمفتاح uniqueKey */
  holders: Record<BulkUniqueField, ReadonlyMap<string, BulkHolder[]>>
}
export interface BulkPlanOptions {
  /** نطاق فروع المنفّذ (branchScopeOf): null = كل الفروع، مصفوفة = الفروع دي بس */
  branchScope: BranchScope
  today: string
  /** شهر المسير الجاري؛ null = إعداد بداية الدورة مش مثبت */
  currentPayrollPeriod: string | null
  canChangeSalary: boolean
  /** «يسري من راتب شهر» العام من الشاشة (عمود الصف يغلبه) */
  salaryMonth: string | null
  mode: 'preview' | 'apply'
}
export interface BulkChange { field: string; label: string; old: string | null; new: string | null }
export interface BulkPlanRow {
  row: number
  code: string
  employeeId: number | null
  employeeName: string | null
  status: 'ready' | 'unchanged' | 'error'
  changes: BulkChange[]
  errors: string[]
  warnings: string[]
  /** حقول ملف الموظف المتغيرة بأسماء UpdateEmployeeDto */
  update: Record<string, string | number | boolean | null>
  salary: { month: string | null; values: Record<BulkSalaryKey, string>; currency: 'SAR' | 'EGP'
    /** الأجر الحالي زي ما اتقرا — التطبيق يرفض الصف لو اتغير قبل الحفظ */
    current: Record<BulkSalaryKey, string | null> } | null
  branchChange: boolean
}
export interface BulkPlan {
  columns: Array<{ key: BulkColumnKey; header: string }>
  ignoredColumns: string[]
  fileErrors: string[]
  rows: BulkPlanRow[]
  summary: { total: number; ready: number; unchanged: number; error: number }
  needs: { salary: boolean; salaryMonth: boolean; org: boolean }
}

/** مفتاح التفرد: رقم البصمة بحروف كبيرة، البريد بحروف صغيرة (زي ترتيب قاعدة البيانات غير الحساس لحالة الحروف). */
export function uniqueKey(field: BulkUniqueField, value: string): string {
  const text = value.trim()
  return field === 'email' ? text.toLowerCase() : field === 'fingerprintCode' ? text.toUpperCase() : text
}

const UNIQUE_LABEL: Record<BulkUniqueField, string> = { fingerprintCode: 'رقم البصمة', nationalId: 'رقم الهوية / الإقامة', email: 'البريد' }
const OPTION_LABEL = (options: Array<{ value: string; label: string }>, value: string | null) =>
  value === null ? null : options.find(option => option.value === value)?.label ?? value
const dateText = (value: unknown) => value === null || value === undefined || value === '' ? null : String(value).slice(0, 10)
const text = (value: unknown) => value === null || value === undefined || String(value).trim() === '' ? null : String(value).trim()
const byName = <T extends BulkRef>(rows: T[], name: string, keep: number | null) =>
  rows.filter(row => arabicKey(row.name) === arabicKey(name) && (row.isActive !== false || row.id === keep))

export function planBulkUpdate(file: BulkParsedFile, lookups: BulkLookups, options: BulkPlanOptions): BulkPlan {
  const fileErrors = [...file.fileErrors]
  const salaryColumns = file.fields.filter(key => BULK_FIELD_BY_KEY.get(key)?.salary)
  if (salaryColumns.length && !options.canChangeSalary) {
    fileErrors.push('تعديل الراتب والبدلات محتاج صلاحية «اعتماد المسير» — شيل أعمدة الراتب من الملف أو اطلب الصلاحية')
  }
  const inScope = (branchId: number | null) => inBranchScope(options.branchScope, branchId)
  const whose = (holder: BulkHolder) => inScope(holder.branchId) ? ` (${holder.fullName})` : ''
  const codeRows = new Map<string, number[]>()
  for (const record of file.records) if (record.code) codeRows.set(record.code, [...(codeRows.get(record.code) ?? []), record.row])

  const rows: BulkPlanRow[] = []
  // القيم الفريدة الجديدة في الملف كله: قيمة واحدة لصفين = الاتنين مرفوضين
  const claims: Record<BulkUniqueField, Map<string, number[]>> = { fingerprintCode: new Map(), nationalId: new Map(), email: new Map() }
  const claimed: Array<{ plan: BulkPlanRow; field: BulkUniqueField; key: string; value: string }> = []

  for (const record of file.records) {
    const plan: BulkPlanRow = { row: record.row, code: record.code, employeeId: null, employeeName: null, status: 'error', changes: [], errors: [],
      warnings: [], update: {}, salary: null, branchChange: false }
    rows.push(plan)
    const fieldError = (key: BulkFieldKey | string, message: string) => plan.errors.push(`${BULK_FIELD_BY_KEY.get(key as BulkFieldKey)?.label ?? key}: ${message}`)
    for (const [key, parsed] of record.values) if (!parsed.ok) fieldError(key, parsed.error)
    if (record.salaryMonth && !record.salaryMonth.ok) plan.errors.push(`يسري من راتب شهر: ${record.salaryMonth.error}`)
    if (!record.code) { plan.errors.unshift('كود الموظف فاضي'); continue }
    const duplicates = codeRows.get(record.code) ?? []
    if (duplicates.length > 1) plan.errors.unshift(`الكود متكرر في الملف (الصفوف ${duplicates.join('، ')}) — سيب صف واحد لكل موظف`)
    const employee = lookups.employees.get(record.code)
    if (!employee) { plan.errors.unshift(`كود الموظف «${record.code}» مش موجود`); continue }
    if (!inScope(employee.branchId)) { plan.errors.unshift('الموظف ده تبع فرع تاني — خارج صلاحية حسابك'); continue }
    plan.employeeId = employee.id
    plan.employeeName = employee.fullName

    const value = (key: BulkFieldKey): { given: false } | { given: true; value: string | boolean | null } => {
      const parsed = record.values.get(key)
      return parsed?.ok ? { given: true, value: parsed.value } : { given: false }
    }
    const change = (field: string, oldValue: string | null, newValue: string | null, label = BULK_FIELD_BY_KEY.get(field as BulkFieldKey)?.label ?? field) =>
      plan.changes.push({ field, label, old: oldValue, new: newValue })

    // ===== نصوص وأرقام وتواريخ على ملف الموظف =====
    const simple: Array<[BulkFieldKey, keyof BulkEmployeeSnapshot]> = [
      ['phone', 'phone'], ['email', 'email'], ['nationalId', 'nationalId'], ['nationality', 'nationality'], ['birthDate', 'birthDate'],
      ['fingerprintCode', 'fingerprintCode'], ['contractStart', 'contractStart'], ['contractEnd', 'contractEnd'], ['bankName', 'bankName'],
      ['iban', 'iban'], ['gosiNumber', 'gosiNumber'],
    ]
    for (const [key, column] of simple) {
      const given = value(key)
      if (!given.given) continue
      const def = BULK_FIELD_BY_KEY.get(key)!
      const before = def.kind === 'date' ? dateText(employee[column]) : text(employee[column])
      const next = given.value === null ? null : String(given.value)
      const same = key === 'email' || key === 'iban' ? (before ?? '').toLowerCase() === (next ?? '').toLowerCase() : before === next
      if (same) continue
      if (def.textual && before && next && /^\d+$/.test(next) && /^[+\d\s-]+$/.test(before) && looseDigits(before) === looseDigits(next)) {
        plan.warnings.push(`${def.label}: «${next}» هو نفس «${before}» من غير الأصفار/الرموز اللي في الأول (غالبًا Excel شالها) — اتساب زي ما هو`)
        continue
      }
      plan.update[column] = next
      change(key, before, next)
    }
    for (const [key, column, choices] of [['gender', 'gender', GENDER_OPTIONS], ['contractType', 'contractType', CONTRACT_TYPE_OPTIONS]] as const) {
      const given = value(key)
      if (!given.given || given.value === (employee[column] ?? null)) continue
      plan.update[column] = given.value as string
      change(key, OPTION_LABEL(choices, employee[column] as string | null), OPTION_LABEL(choices, given.value as string))
    }
    const registered = value('isGosiRegistered')
    if (registered.given && registered.value !== employee.isGosiRegistered) {
      plan.update.isGosiRegistered = registered.value as boolean
      change('isGosiRegistered', employee.isGosiRegistered === null ? null : employee.isGosiRegistered ? 'نعم' : 'لا', registered.value ? 'نعم' : 'لا')
    }
    const gosiSalary = value('gosiBaseSalary')
    if (gosiSalary.given && gosiSalary.value !== employee.gosiBaseSalary) {
      plan.update.gosiBaseSalary = Number(gosiSalary.value)
      change('gosiBaseSalary', employee.gosiBaseSalary, gosiSalary.value as string)
    }

    // هوية: رقم الهوية يتفحص بشكل الجنسية لو اتغير هو أو الجنسية؛ تاريخ الميلاد قبل النهارده
    if ('nationalId' in plan.update || 'nationality' in plan.update) {
      const issue = nationalIdIssue(plan.update.nationalId ?? employee.nationalId, plan.update.nationality ?? employee.nationality)
      if (issue) fieldError('nationalId', issue)
    }
    if (typeof plan.update.birthDate === 'string') {
      const issue = birthDateIssue(plan.update.birthDate, options.today)
      if (issue) fieldError('birthDate', issue)
    }

    // ===== الفرع ← القسم ← الفريق بالاسم =====
    let branchId = employee.branchId
    const branch = value('branch')
    if (branch.given && typeof branch.value === 'string') {
      const found = byName(lookups.branches, branch.value, employee.branchId)
      if (found.length !== 1) fieldError('branch', found.length ? `أكتر من فرع بنفس الاسم «${branch.value}»` : `الفرع «${branch.value}» مش موجود`)
      else if (found[0].id !== employee.branchId) {
        // حساب الفروع ينقل بين فروعه بس (حساب الفرع الواحد مايقدرش ينقل خالص)
        if (!inScope(found[0].id)) {
          fieldError('branch', options.branchScope !== null && options.branchScope.length > 1
            ? 'حساب الفروع مايقدرش ينقل موظف لفرع برّه فروعه' : 'حساب الفرع مايقدرش ينقل موظف لفرع تاني')
        } else {
          branchId = found[0].id
          plan.update.branchId = branchId
          plan.branchChange = true
          change('branch', lookups.branches.find(row => row.id === employee.branchId)?.name ?? null, found[0].name)
        }
      }
    }
    const branchName = lookups.branches.find(row => row.id === branchId)?.name ?? ''
    let departmentId = employee.departmentId
    const department = value('department')
    const currentDepartment = lookups.departments.find(row => row.id === employee.departmentId)
    if (department.given && typeof department.value === 'string') {
      const found = byName(lookups.departments.filter(row => row.branchId === branchId), department.value, employee.departmentId)
      if (found.length !== 1) fieldError('department', found.length ? `أكتر من قسم بنفس الاسم «${department.value}» في الفرع` : `القسم «${department.value}» مش موجود في فرع «${branchName}»`)
      else if (found[0].id !== employee.departmentId) {
        departmentId = found[0].id
        plan.update.departmentId = departmentId
        change('department', currentDepartment?.name ?? null, found[0].name)
      }
    } else if (plan.branchChange && currentDepartment && currentDepartment.branchId !== branchId) {
      fieldError('department', `النقل لفرع «${branchName}» محتاج اسم القسم الجديد في نفس الصف`)
    }
    const team = value('team')
    const currentTeam = lookups.teams.find(row => row.id === employee.teamId)
    if (team.given) {
      if (team.value === null) {
        if (employee.teamId !== null) { plan.update.teamId = null; change('team', currentTeam?.name ?? null, null) }
      } else if (typeof team.value === 'string') {
        const found = byName(lookups.teams.filter(row => row.departmentId === departmentId), team.value, employee.teamId)
        if (found.length !== 1) fieldError('team', found.length ? `أكتر من فريق بنفس الاسم «${team.value}» في القسم` : `الفريق «${team.value}» مش موجود في القسم`)
        else if (found[0].id !== employee.teamId) { plan.update.teamId = found[0].id; change('team', currentTeam?.name ?? null, found[0].name) }
      }
    } else if (departmentId !== employee.departmentId && currentTeam && currentTeam.departmentId !== departmentId) {
      plan.update.teamId = null
      change('team', currentTeam.name, null)
      plan.warnings.push(`الفريق «${currentTeam.name}» اتشال لأنه مش تبع القسم الجديد`)
    }

    // ===== المسمى ومركز التكلفة والدرجة والمدير =====
    const jobTitle = value('jobTitle')
    if (jobTitle.given && typeof jobTitle.value === 'string' && arabicKey(jobTitle.value) !== arabicKey(employee.jobTitle)) {
      const active = lookups.jobTitles.filter(row => row.isActive !== false && row.title?.trim())
      const found = active.find(row => arabicKey(row.title) === arabicKey(jobTitle.value))
      if (active.length && !found) fieldError('jobTitle', `«${jobTitle.value}» مش في كتالوج المسميات الوظيفية`)
      else {
        const next = found?.title ?? jobTitle.value
        plan.update.jobTitle = next
        change('jobTitle', text(employee.jobTitle), next)
      }
    }
    const costCenter = value('costCenter')
    const currentCost = lookups.costCenters.find(row => row.id === employee.costCenterId)
    if (costCenter.given) {
      if (costCenter.value === null) {
        if (employee.costCenterId !== null) { plan.update.costCenterId = null; change('costCenter', currentCost?.name ?? null, null) }
      } else if (typeof costCenter.value === 'string') {
        const wanted = costCenter.value
        const byCode = lookups.costCenters.filter(row => row.code.trim().toUpperCase() === wanted.toUpperCase())
        const found = byCode.length ? byCode : lookups.costCenters.filter(row => arabicKey(row.name) === arabicKey(wanted))
        if (found.length !== 1) fieldError('costCenter', found.length ? `أكتر من مركز تكلفة بنفس الاسم «${wanted}» — اكتب الكود` : `مركز التكلفة «${wanted}» مش موجود`)
        else if (found[0].id !== employee.costCenterId) {
          if (found[0].isActive === false) fieldError('costCenter', `مركز التكلفة «${found[0].name}» معطّل`)
          else { plan.update.costCenterId = found[0].id; change('costCenter', currentCost?.name ?? null, found[0].name) }
        }
      }
    }
    const grade = value('grade')
    const currentGrade = lookups.grades.find(row => row.id === employee.gradeId)
    if (grade.given) {
      if (grade.value === null) {
        if (employee.gradeId !== null) { plan.update.gradeId = null; change('grade', currentGrade?.name ?? null, null) }
      } else if (typeof grade.value === 'string') {
        const found = lookups.grades.filter(row => arabicKey(row.name) === arabicKey(grade.value))
        if (found.length !== 1) fieldError('grade', `الدرجة «${grade.value}» مش موجودة`)
        else if (found[0].id !== employee.gradeId) {
          if (found[0].isActive === false) fieldError('grade', `الدرجة «${found[0].name}» معطّلة — اختار درجة فعّالة`)
          else { plan.update.gradeId = found[0].id; change('grade', currentGrade?.name ?? null, found[0].name) }
        }
      }
    }
    const manager = value('manager')
    const currentManager = employee.managerEmployeeId === null ? null : lookups.people.get(employee.managerEmployeeId)
    const managerText = (person: { employeeCode: string; fullName: string } | null | undefined) => person ? `${person.employeeCode} — ${person.fullName}` : null
    if (manager.given) {
      if (manager.value === null) {
        if (employee.managerEmployeeId !== null) { plan.update.managerEmployeeId = null; change('manager', managerText(currentManager), null) }
      } else if (typeof manager.value === 'string') {
        const found = lookups.employees.get(normalizeBulkCode(manager.value))
        if (!found || !inScope(found.branchId)) fieldError('manager', `كود المدير «${manager.value}» مش موجود`)
        else if (found.id === employee.id) fieldError('manager', 'الموظف مايبقاش مدير مباشر لنفسه')
        else if (['terminated', 'archived'].includes(found.status)) fieldError('manager', `${found.fullName} منتهي خدمته أو مؤرشف`)
        else if (found.id !== employee.managerEmployeeId) { plan.update.managerEmployeeId = found.id; change('manager', managerText(currentManager), managerText(found)) }
      }
    }

    // ===== العقد =====
    if ('contractStart' in plan.update || 'contractEnd' in plan.update) {
      const start = ('contractStart' in plan.update ? plan.update.contractStart : dateText(employee.contractStart)) as string | null
      const end = ('contractEnd' in plan.update ? plan.update.contractEnd : dateText(employee.contractEnd)) as string | null
      if (start && end && end < start) fieldError('contractEnd', 'نهاية العقد قبل بدايته')
    }

    // ===== طريقة الصرف: على الحالة بعد الحفظ =====
    const payMethod = value('payMethod'), amount = value('bankTransferAmount')
    if (payMethod.given && payMethod.value !== (employee.payMethod ?? 'transfer')) {
      plan.update.payMethod = payMethod.value as string
      change('payMethod', PAY_METHOD_LABELS[employee.payMethod ?? 'transfer'] ?? employee.payMethod, PAY_METHOD_LABELS[payMethod.value as string])
    }
    const nextMethod = (plan.update.payMethod ?? employee.payMethod ?? 'transfer') as string
    if (amount.given && amount.value !== null) {
      if (nextMethod !== 'mixed') fieldError('bankTransferAmount', 'مبلغ التحويل البنكي بيتكتب بس مع «نقدي + بنك»')
      else if (!(Number(amount.value) > 0)) fieldError('bankTransferAmount', 'مبلغ التحويل البنكي أكبر من صفر')
      else if (amount.value !== employee.bankTransferAmount) {
        plan.update.bankTransferAmount = Number(amount.value)
        change('bankTransferAmount', employee.bankTransferAmount, amount.value as string)
      }
    }
    if (nextMethod !== 'mixed' && employee.bankTransferAmount !== null && 'payMethod' in plan.update) {
      plan.update.bankTransferAmount = null
      change('bankTransferAmount', employee.bankTransferAmount, null)
    }
    if (['payMethod', 'bankTransferAmount', 'bankName', 'iban'].some(key => key in plan.update)) {
      const pick = (key: 'bankName' | 'iban') => (key in plan.update ? plan.update[key] : employee[key]) as string | null
      const issue = employeePayMethodIssue({ payMethod: nextMethod,
        bankTransferAmount: 'bankTransferAmount' in plan.update ? plan.update.bankTransferAmount : employee.bankTransferAmount,
        bankName: pick('bankName'), iban: pick('iban') },
      { payMethod: employee.payMethod, bankTransferAmount: employee.bankTransferAmount, bankName: employee.bankName, iban: employee.iban })
      if (issue) plan.errors.push(`طريقة الصرف: ${issue}`)
    }

    // ===== الراتب والبدلات: تغيير واحد مؤرخ في سجل الأجر =====
    const salaryGiven = SALARY_KEYS.filter(key => value(key).given)
    if (salaryGiven.length && options.canChangeSalary) {
      const current = (key: BulkSalaryKey) => employee[key] ?? '0.00'
      const values = Object.fromEntries(SALARY_KEYS.map(key => {
        const given = value(key)
        return [key, given.given ? String(given.value) : current(key)]
      })) as Record<BulkSalaryKey, string>
      const changed = SALARY_KEYS.filter(key => values[key] !== current(key))
      if (changed.length) {
        const month = record.salaryMonth?.ok ? record.salaryMonth.value : options.salaryMonth
        if (employee.currency !== 'SAR' && employee.currency !== 'EGP') plan.errors.push('الراتب: عملة أجر الموظف مش محددة (ريال أو جنيه) — عدّلها من ملف الموظف الأول')
        else if (!options.currentPayrollPeriod) plan.errors.push('الراتب: إعداد بداية دورة الرواتب مش مثبت — راجعه قبل تعديل الأجر')
        else {
          if (month && month > options.currentPayrollPeriod) {
            plan.errors.push(`الراتب: «يسري من راتب شهر» ${month} بعد الشهر الجاري ${options.currentPayrollPeriod} — الزيادة المستقبلية بتتقدم بطلب زيادة راتب`)
          } else if (!month) {
            if (options.mode === 'apply') plan.errors.push('الراتب: حدد «يسري من راتب شهر»')
            else plan.warnings.push('الراتب: حدد «يسري من راتب شهر» قبل التطبيق')
          }
          plan.salary = { month, values, currency: employee.currency,
            current: Object.fromEntries(SALARY_KEYS.map(key => [key, employee[key]])) as Record<BulkSalaryKey, string | null> }
          for (const key of changed) change(key, employee[key], values[key])
        }
      }
    }

    if (plan.errors.length) continue
    for (const field of ['fingerprintCode', 'nationalId', 'email'] as const) {
      const next = plan.update[field]
      if (typeof next !== 'string' || !next) continue
      const key = uniqueKey(field, next)
      const holder = (lookups.holders[field].get(key) ?? []).find(row => row.id !== employee.id)
      if (holder) {
        plan.errors.push(`${UNIQUE_LABEL[field]} ${next} مسجل لموظف تاني${whose(holder)} — مايتكررش`)
        continue
      }
      claims[field].set(key, [...(claims[field].get(key) ?? []), plan.row])
      claimed.push({ plan, field, key, value: next })
    }
  }
  for (const { plan, field, key, value } of claimed) {
    const others = (claims[field].get(key) ?? []).filter(row => row !== plan.row)
    if (others.length) plan.errors.push(`${UNIQUE_LABEL[field]} ${value} متكرر في الملف (الصفوف ${[plan.row, ...others].sort((a, b) => a - b).join('، ')})`)
  }

  for (const plan of rows) {
    plan.status = plan.errors.length ? 'error' : plan.changes.length ? 'ready' : 'unchanged'
    if (plan.status !== 'ready') { plan.update = {}; plan.salary = null; plan.branchChange = false }
  }
  const ready = rows.filter(row => row.status === 'ready')
  return {
    columns: file.columns,
    ignoredColumns: file.ignoredColumns,
    fileErrors,
    rows,
    summary: { total: rows.length, ready: ready.length, unchanged: rows.filter(row => row.status === 'unchanged').length,
      error: rows.filter(row => row.status === 'error').length },
    needs: { salary: ready.some(row => row.salary), salaryMonth: ready.some(row => row.salary && !row.salary.month), org: ready.some(row => row.branchChange) },
  }
}

/** ترتيب الحقول في القالب والمعاينة = ترتيب الكتالوج. */
export const orderedBulkFields = (keys: readonly string[]) => BULK_FIELDS.filter(field => keys.includes(field.key)).map(field => field.key)
