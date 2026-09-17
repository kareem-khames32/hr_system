// ===== مجال الموظفين: استيراد ملفات الموظفين من النظام القديم (logic-leap) =====
// المواصفة: mapping-employees.md — مكيّفة على شكل JSON الـAPI (EmployeeResource / ContractResource /
// EmployeeAllowanceResource / DocumentResource / مصفوفات نماذج المؤهلات).
// الكتابة مباشرة بـTypeORM بلا خدمات التحقق (لا عزل فروع ولا حقول إجبارية)؛ السجلات ذات البصمة/النسخ بمساعدات النظام نفسها:
//   سجل الأجر ← appendMonthlySalaryHistoryRevision، دوام الموظف ← appendAttendanceRuleVersion، فرع الموظف ← finishCalendarChange.
// لا يُطبع أي بيان شخصي — التنبيهات بالمعرّف القديم فقط.

import * as fs from 'fs'
import * as path from 'path'
import { randomUUID } from 'crypto'
import type { EntityManager } from 'typeorm'

import { rawDir, rawFilePath, readRaw, readRawEach, unusablePasswordHash, type Ctx, type Source } from './framework'

import { DocType, EmployeeDocument, JobTitle } from '../../src/assets/assets.entities'
import { DOC_TYPE_CODE_RE } from '../../src/assets/doc-types'
import { AttendanceRuleVersion } from '../../src/attendance/attendance-rule.entities'
import { appendAttendanceRuleVersion } from '../../src/attendance/attendance-rule-history'
import { finishCalendarChange, readCalendarSource } from '../../src/attendance/attendance-calendar-history'
import { User } from '../../src/auth/user.entity'
import { Employee } from '../../src/employees/employee.entity'
import { nextEmployeeCodeFrom } from '../../src/employees/employee-code'
import {
  EmployeeCertification, EmployeeEducation, EmployeeExperience, EmployeeLanguage, EmployeeSkill,
} from '../../src/employees/qualifications.entities'
import { StoredFile } from '../../src/files/stored-file.entity'
import { uploadsRoot } from '../../src/files/storage'
import { Branch } from '../../src/org/entities/branch.entity'
import { Department } from '../../src/org/entities/department.entity'
import { Team } from '../../src/org/entities/team.entity'
import { employeeSalaryStartContext, readSalaryCycleStartDay } from '../../src/payroll/payroll-salary-change'
import { appendMonthlySalaryHistoryRevision, readSalaryHistory, readSalaryHistoryCurrent } from '../../src/payroll/payroll-salary-history'
import { EmployeeStatusHistory } from '../../src/requests/entities/employment.entities'

export const DOMAIN = 'employees'
export const DEPENDS_ON: string[] = ['org']

const PAGE = { per_page: 100 }
const QUALIFICATION_KINDS = ['education', 'certifications', 'skills', 'languages', 'experiences'] as const

// قائمة الموظفين الافتراضية تستبعد المؤرشفين (EmployeeService::applyFilters) ⇒ قائمتان، ومصادر each لكل منهما
export const SOURCES: Source[] = [
  { key: 'employees', path: 'employees', paginated: true, params: PAGE },
  { key: 'employees-archived', path: 'employees', paginated: true, params: { ...PAGE, status: 'archived' } },
  { key: 'employee-contracts', path: 'contracts', paginated: true, params: PAGE },
  { key: 'employee-allowances', path: 'payroll/employees/{id}/allowances', each: { from: 'employees' } },
  { key: 'employee-allowances-archived', path: 'payroll/employees/{id}/allowances', each: { from: 'employees-archived' } },
  ...QUALIFICATION_KINDS.flatMap((kind): Source[] => [
    { key: `employee-${kind}`, path: `employees/{id}/${kind}`, each: { from: 'employees' } },
    { key: `employee-${kind}-archived`, path: `employees/{id}/${kind}`, each: { from: 'employees-archived' } },
  ]),
  { key: 'employee-documents', path: 'documents', paginated: true, params: PAGE },
  { key: 'employee-document-files', path: 'documents/{id}/download', each: { from: 'employee-documents' }, binary: true },
  { key: 'employee-document-types', path: 'settings/document-types' },
  // صورة الموظف: photo_url رابط تخزين عام (لا مسار API) — نفس نمط شعار الشركة في org؛ الملف يُطابق بالمعرّف أو باسم ملف الرابط
  { key: 'employee-photos', path: '{id}', each: { from: 'employees', idField: 'photo_url' }, binary: true },
  { key: 'employee-photos-archived', path: '{id}', each: { from: 'employees-archived', idField: 'photo_url' }, binary: true },
  // مراجع التعبئة الخلفية للمديرين (manager_id/leader_id = users.id، branch_manager_id = employees.id) —
  // نفس تعريف مصادر مجال org حرفيًا (البيان يدمج المفتاح المكرر؛ أي اختلاف يُرفض عند --manifest)
  { key: 'branches', path: 'settings/branches', paginated: true, params: { per_page: 200 } },
  { key: 'departments', path: 'settings/departments', paginated: true, params: { per_page: 200 } },
  { key: 'teams', path: 'settings/teams', paginated: true, params: { per_page: 200 } },
]

const PHOTO_KEYS = ['employee-photos', 'employee-photos-archived']
const REASON = 'ترحيل من النظام القديم'
const ACTOR_EMAIL = 'migration@local'

// ===================== أدوات القيم =====================

type Row = Record<string, any>

const text = (value: unknown): string | null => {
  if (value == null || typeof value === 'object') return null
  const s = String(value).trim()
  return s ? s : null
}

const isValidDate = (s: string) => {
  const d = new Date(`${s}T12:00:00Z`)
  return Number.isFinite(d.getTime()) && d.toISOString().slice(0, 10) === s && s >= '1900-01-01'
}

const localToday = (now: Date) =>
  `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`

function addMonths(date: string, months: number): string | null {
  const [y, m, d] = date.split('-').map(Number)
  const target = new Date(Date.UTC(y, m - 1 + months, 1, 12))
  const last = new Date(Date.UTC(target.getUTCFullYear(), target.getUTCMonth() + 1, 0, 12)).getUTCDate()
  target.setUTCDate(Math.min(d, last))
  const out = target.toISOString().slice(0, 10)
  return isValidDate(out) ? out : null
}

const timestamp = (value: unknown): Date | null => {
  const s = text(value)
  if (!s) return null
  const d = new Date(s)
  return Number.isFinite(d.getTime()) ? d : null
}

// المبالغ بالهللة (BigInt) — لا تمر بعدد عشري
function cents(value: unknown): bigint | null {
  if (value == null || value === '') return null
  let s: string
  if (typeof value === 'number') {
    if (!Number.isFinite(value)) return null
    s = value.toFixed(3)
  } else if (typeof value === 'string') s = value.trim().replace(/,/g, '')
  else return null
  const m = /^(-)?(\d{1,16})(?:\.(\d+))?$/.exec(s)
  if (!m) return null
  const frac = (m[3] ?? '').padEnd(3, '0')
  let c = BigInt(m[2]) * 100n + BigInt(frac.slice(0, 2))
  if (Number(frac[2]) >= 5) c += 1n
  return m[1] ? -c : c
}
const moneyText = (c: bigint): string => {
  const v = c < 0n ? 0n : c
  return `${v / 100n}.${String(v % 100n).padStart(2, '0')}`
}

const bool = (value: unknown): boolean | null => {
  if (value === true || value === 1 || value === '1' || value === 'true') return true
  if (value === false || value === 0 || value === '0' || value === 'false') return false
  return null
}

const intOrNull = (value: unknown): number | null => {
  const n = typeof value === 'number' ? value : typeof value === 'string' && /^-?\d+$/.test(value.trim()) ? Number(value) : NaN
  return Number.isSafeInteger(n) && n >= 0 && n <= 2147483647 ? n : null
}

const legacyIdOf = (value: unknown): string | null => {
  if (typeof value === 'number' && Number.isSafeInteger(value)) return String(value)
  if (typeof value === 'string' && /^\d+$/.test(value.trim())) return value.trim()
  return null
}

// ===================== سياق المجال =====================

class Importer {
  readonly em: EntityManager
  readonly today: string
  readonly createdFiles: string[] = []
  actorId = 0
  cycleStartDay: number | null = null

  constructor(readonly ctx: Ctx) {
    this.em = ctx.em
    this.today = localToday(ctx.now)
  }

  // ---------- تنبيهات ----------
  flag(kind: string, legacyId: string | number | null, message: string) {
    this.ctx.flag(kind, legacyId, message)
  }

  fit(legacyId: string, field: string, value: unknown, max: number): string | null {
    const s = text(value)
    if (s == null) return null
    if (s.length > max) {
      this.flag('TRUNCATED', legacyId, `${field}: أطول من ${max} حرفًا — قُصّ (القيمة الكاملة في raw)`)
      return s.slice(0, max)
    }
    return s
  }

  date(legacyId: string, field: string, value: unknown): string | null {
    const s = text(value)
    if (!s) return null
    const d = /^(\d{4}-\d{2}-\d{2})/.exec(s)?.[1]
    if (d && isValidDate(d)) return d
    this.flag('INVALID_DATE', legacyId, `${field}: تاريخ غير صالح — تُرك فارغًا`)
    return null
  }

  // ---------- خريطة المعرّفات (أسماء أنواع مجال org محتملة) ----------
  mapped(aliases: string[], legacy: unknown): number | undefined {
    const id = legacyIdOf(legacy)
    if (id == null) return undefined
    for (const kind of aliases) {
      const found = this.ctx.ids.get(kind, id)
      if (found) return found
    }
    return undefined
  }

  // ---------- مستخدم الترحيل (فاعل السجلات الموثقة) ----------
  async ensureActor() {
    const known = this.ctx.ids.get('system_user', 'migration')
    const existing = (known && (await this.em.findOneBy(User, { id: known }))) || (await this.em.findOneBy(User, { email: ACTOR_EMAIL }))
    if (existing) {
      this.actorId = existing.id
    } else {
      const saved = await this.em.save(User, this.em.create(User, {
        email: ACTOR_EMAIL, passwordHash: unusablePasswordHash(), displayName: 'ترحيل النظام القديم', role: 'employee', isActive: false,
      }))
      this.actorId = saved.id
      this.ctx.count('system_user_created')
      this.flag('USER_PASSWORD_UNUSABLE', null, 'مستخدم الترحيل أُنشئ معطّلًا بكلمة مرور عشوائية غير قابلة للاستخدام')
    }
    this.ctx.ids.set('system_user', 'migration', this.actorId)
  }

  // ---------- ملفات مرفوعة ----------
  copyToUploads(sourcePath: string, originalName: string, when: Date | null): { storedName: string; size: number } {
    const d = when ?? this.ctx.now
    const month = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`
    const extCandidate = path.extname(originalName) || path.extname(sourcePath)
    const ext = /^\.[a-z0-9]{1,10}$/i.test(extCandidate) ? extCandidate.toLowerCase() : ''
    const storedName = `legacy/${month}/${randomUUID()}${ext}`
    const target = path.resolve(uploadsRoot(), storedName)
    fs.mkdirSync(path.dirname(target), { recursive: true })
    fs.copyFileSync(sourcePath, target)
    this.createdFiles.push(target)
    return { storedName, size: fs.statSync(target).size }
  }

  cleanupFiles() {
    for (const file of this.createdFiles) {
      try { fs.unlinkSync(file) } catch { /* ملف لم يُنشأ أو حُذف */ }
    }
  }
}

const httpError = (err: unknown): string | null => {
  const e = err as { getStatus?: unknown; getResponse?: () => unknown; code?: unknown }
  if (typeof e?.getStatus !== 'function') return err instanceof Error && err.name === 'PayrollPeriodSalaryError' ? String(e.code ?? 'PAYROLL_PERIOD') : null
  const res = e.getResponse?.() as { code?: unknown } | string | undefined
  return typeof res === 'object' && res && typeof res.code === 'string' ? res.code : `HTTP_${(e.getStatus as () => number)()}`
}

// ===================== التحويلات =====================

const STATUS_MAP: Record<string, { status: Employee['status']; isActive: boolean }> = {
  active: { status: 'active', isActive: true },
  probation: { status: 'probation', isActive: true },
  suspended: { status: 'suspended', isActive: false },
  notice_period: { status: 'notice_period', isActive: true },
  pending_finalization: { status: 'notice_period', isActive: true },
  archived: { status: 'archived', isActive: false },
  terminated: { status: 'terminated', isActive: false },
}

const CONTRACT_TYPES: Record<string, string> = { fixed: 'fixed_term', open_ended: 'permanent' }
const PAY_METHODS: Record<string, 'transfer' | 'cash' | 'mixed'> = { bank: 'transfer', transfer: 'transfer', cash: 'cash', mixed: 'mixed', check: 'transfer' }

type Bucket = 'housingAllowance' | 'transportAllowance' | 'phoneAllowance' | 'workNatureAllowance' | 'otherAllowance'
function bucketOf(...names: unknown[]): Bucket {
  const s = names.map((n) => (typeof n === 'string' ? n : '')).join(' ').toLowerCase()
  if (/housing|سكن/.test(s)) return 'housingAllowance'
  if (/transport|مواصلات|انتقال|نقل/.test(s)) return 'transportAllowance'
  if (/work[\s_-]*nature|طبيعة/.test(s)) return 'workNatureAllowance'
  if (/phone|mobile|هاتف|جوال|اتصال/.test(s)) return 'phoneAllowance'
  return 'otherAllowance'
}

function degreeCode(value: string | null): { code: string; matched: boolean } {
  const s = (value ?? '').toLowerCase()
  if (/دكتوراه|phd|doctor/.test(s)) return { code: 'phd', matched: true }
  if (/ماجستير|master|msc|mba/.test(s)) return { code: 'master', matched: true }
  if (/بكالوريوس|ليسانس|bachelor|bsc|licen/.test(s)) return { code: 'bachelor', matched: true }
  if (/دبلوم|diploma/.test(s)) return { code: 'diploma', matched: true }
  if (/ثانوي|high\s*school|secondary/.test(s)) return { code: 'high_school', matched: true }
  if (['high_school', 'diploma', 'bachelor', 'master', 'phd', 'other'].includes(s.trim())) return { code: s.trim(), matched: true }
  return { code: 'other', matched: false }
}

const LANGUAGE_LEVELS: Record<string, string> = { basic: 'basic', conversational: 'good', good: 'good', fluent: 'very_good', very_good: 'very_good', native: 'native' }
const SKILL_LEVELS = new Set(['beginner', 'intermediate', 'advanced', 'expert'])

// ===================== التشغيل =====================

export async function run(ctx: Ctx): Promise<void> {
  if (!ctx.em.queryRunner?.isTransactionActive) {
    // مساعدات الأجر والتقويم تتطلب معاملة — مع --no-transaction نفتح معاملة للمجال
    await ctx.ds.transaction((em) => run({ ...ctx, em }))
    return
  }
  const imp = new Importer(ctx)
  try {
    await importAll(imp)
  } catch (err) {
    imp.cleanupFiles() // المعاملة ستُتراجع — لا ملفات يتيمة على القرص
    throw err
  }
}

async function importAll(imp: Importer) {
  const { ctx, em } = imp

  // ---------- قراءة raw ----------
  const byId = new Map<string, Row>()
  for (const key of ['employees', 'employees-archived']) {
    for (const row of readRaw<Row>(key)) {
      const id = legacyIdOf(row?.id)
      if (id == null) {
        imp.flag('EMPLOYEE_ROW_INVALID', null, `صف موظف بلا معرّف في ${key} — تُخطّي`)
        continue
      }
      byId.set(id, row)
    }
  }
  const rows = [...byId.entries()].sort((a, b) => Number(a[0]) - Number(b[0]))
  ctx.count('source_employee', rows.length)
  if (!rows.length) imp.flag('NO_SOURCE_EMPLOYEES', null, 'لا يوجد موظفون في raw (employees / employees-archived) — لم يُستورد شيء')

  const contractsByEmployee = new Map<string, Row[]>()
  for (const c of readRaw<Row>('employee-contracts')) {
    const empId = legacyIdOf(c?.employee_id)
    if (empId == null) continue
    const list = contractsByEmployee.get(empId) ?? []
    list.push(c)
    contractsByEmployee.set(empId, list)
  }
  const eachByEmployee = (keys: string[]) => {
    const out = new Map<string, Row[]>()
    for (const key of keys) {
      for (const group of readRawEach<Row>(key)) {
        for (const item of group.items) {
          if (!item || typeof item !== 'object') continue
          const empId = legacyIdOf(item.employee_id) ?? group.id
          const list = out.get(empId) ?? []
          list.push(item)
          out.set(empId, list)
        }
      }
    }
    return out
  }
  const allowancesByEmployee = eachByEmployee(['employee-allowances', 'employee-allowances-archived'])

  await imp.ensureActor()

  // ---------- الفرع البديل لمن بلا فرع ----------
  let placeholderBranchId: number | null = null
  const placeholderBranch = async () => {
    if (placeholderBranchId) return placeholderBranchId
    const code = 'LEGACY-NOBRANCH'
    const found = await em.findOneBy(Branch, { code })
    placeholderBranchId = found
      ? found.id
      : (await em.save(Branch, em.create(Branch, { name: 'فرع غير محدد (مرحّل)', code, isActive: true }))).id
    if (!found) ctx.count('placeholder_branch_created')
    return placeholderBranchId
  }

  // ---------- قيود التفرد الحالية ----------
  const existing = await em.find(Employee, { select: { id: true, employeeCode: true } })
  const usedCodes = new Set(existing.map((e) => e.employeeCode.toUpperCase()))
  const allCodes: string[] = existing.map((e) => e.employeeCode)
  const seenFingerprints = new Map<string, string>()
  const seenNationalIds = new Map<string, string>()
  const seenEmails = new Map<string, string>()

  const jobTitleCache = new Map<number, string | null>()
  const jobTitleText = async (legacyEmpId: string, row: Row): Promise<string | null> => {
    const newId = imp.mapped(['job_title', 'job_titles', 'job-title', 'jobTitle'], row.job_title_id)
    let title: string | null = null
    if (newId) {
      if (!jobTitleCache.has(newId)) jobTitleCache.set(newId, (await em.findOneBy(JobTitle, { id: newId }))?.title ?? null)
      title = jobTitleCache.get(newId) ?? null
      // مجال org قد يضيف « (رقم)» لتفادي تكرار الاسم — النص الأصلي بدونه
      const legacy = legacyIdOf(row.job_title_id)
      if (title && legacy && title.endsWith(` (${legacy})`)) title = title.slice(0, -` (${legacy})`.length)
    }
    title ??= text(row.job_title?.name) ?? text(row.job_title?.name_ar)
    if (!title) {
      imp.flag(row.job_title_id != null ? 'JOB_TITLE_UNMAPPED' : 'MISSING_JOB_TITLE', legacyEmpId,
        row.job_title_id != null ? 'المسمى الوظيفي غير موجود في خريطة org — تُرك فارغًا' : 'موظف بلا مسمى وظيفي')
      return null
    }
    return imp.fit(legacyEmpId, 'jobTitle', title, 100)
  }

  // ===== المرحلة 1: الموظفون =====
  type Pending = { legacyId: string; row: Row; values: Record<string, unknown>; codeIssue: string | null }
  const pending: Pending[] = []
  const imported: Array<{ legacyId: string; row: Row; employeeId: number; fresh: boolean }> = []

  for (const [legacyId, row] of rows) {
    const already = ctx.ids.get('employee', legacyId)
    if (already && (await em.existsBy(Employee, { id: already }))) {
      imported.push({ legacyId, row, employeeId: already, fresh: false })
      ctx.count('employee_already_imported')
      continue
    }

    const v: Record<string, unknown> = {}

    // الكود الوظيفي كما هو في النظام القديم
    const code = text(row.employee_number)
    let codeIssue: string | null = null
    if (!code) codeIssue = 'رقم الموظف فارغ في المصدر'
    else if (code.length > 20) codeIssue = 'رقم الموظف أطول من 20 حرفًا'
    else if (usedCodes.has(code.toUpperCase())) codeIssue = 'رقم الموظف مكرر (بلا تمييز حالة الأحرف)'
    if (!codeIssue && code) {
      usedCodes.add(code.toUpperCase())
      allCodes.push(code)
      v.employeeCode = code
      if (!/^EMP-\d+$/.test(code)) imp.flag('EMPLOYEE_CODE_FORMAT', legacyId, 'رقم الموظف لا يطابق EMP-#### — نُقل كما هو')
    }

    // البصمة كما هي حرفيًا
    const fp = row.biometric_id == null ? null : String(row.biometric_id)
    if (fp != null && fp !== '') {
      if (fp.length > 40) {
        imp.flag('FINGERPRINT_TOO_LONG', legacyId, 'رقم البصمة أطول من 40 حرفًا — تُرك فارغًا (القيمة في raw)')
      } else {
        v.fingerprintCode = fp
        const prev = seenFingerprints.get(fp.toUpperCase())
        if (prev) imp.flag('FINGERPRINT_DUPLICATE', legacyId, `رقم البصمة يطابق موظفًا آخر (بلا تمييز حالة الأحرف) — المعرّف القديم الآخر ${prev}`)
        else seenFingerprints.set(fp.toUpperCase(), legacyId)
      }
    } else imp.flag('MISSING_FINGERPRINT', legacyId, 'موظف بلا رقم بصمة')

    // الاسم
    let fullName = imp.fit(legacyId, 'fullName', row.name_ar, 200)
    if (!fullName) {
      fullName = imp.fit(legacyId, 'fullName', row.name_en, 200) ?? `(بدون اسم) ${code ?? legacyId}`
      imp.flag('MISSING_NAME_AR', legacyId, 'الاسم العربي فارغ — استُخدم الإنجليزي أو اسم مؤقت')
    }
    v.fullName = fullName
    v.fullNameEn = imp.fit(legacyId, 'fullNameEn', row.name_en, 200)

    // التواصل والهوية
    const email = text(row.email)?.toLowerCase() ?? null
    v.email = imp.fit(legacyId, 'email', email, 200)
    if (email) {
      const prev = seenEmails.get(email)
      if (prev) imp.flag('EMAIL_DUPLICATE', legacyId, `البريد مكرر مع المعرّف القديم ${prev}`)
      else seenEmails.set(email, legacyId)
    }
    v.personalEmail = imp.fit(legacyId, 'personalEmail', text(row.personal_email)?.toLowerCase(), 160)
    v.phone = imp.fit(legacyId, 'phone', row.mobile, 50)
    v.phoneAlt = imp.fit(legacyId, 'phoneAlt', row.phone_alt, 30)
    v.nationalId = imp.fit(legacyId, 'nationalId', row.national_id, 50)
    v.passportNo = imp.fit(legacyId, 'passportNo', row.passport_no, 40)
    v.passportExpiry = imp.date(legacyId, 'passportExpiry', row.passport_expiry)
    if (!v.nationalId && !v.passportNo) imp.flag('MISSING_IDENTITY', legacyId, 'لا رقم هوية ولا جواز')
    if (v.nationalId) {
      const key = String(v.nationalId)
      const prev = seenNationalIds.get(key)
      if (prev) imp.flag('NATIONAL_ID_DUPLICATE', legacyId, `رقم الهوية مكرر مع المعرّف القديم ${prev}`)
      else seenNationalIds.set(key, legacyId)
    }

    // البيانات الشخصية
    v.birthDate = imp.date(legacyId, 'birthDate', row.dob)
    if (!v.birthDate) imp.flag('MISSING_BIRTH_DATE', legacyId, 'تاريخ الميلاد غير مسجل')
    v.birthPlace = imp.fit(legacyId, 'birthPlace', row.birth_place, 120)
    const gender = text(row.gender)?.toLowerCase() ?? null
    v.gender = gender === 'male' || gender === 'female' ? gender : null
    if (!v.gender) imp.flag('MISSING_GENDER', legacyId, gender ? 'قيمة الجنس غير معروفة — تُركت فارغة' : 'الجنس غير مسجل')
    v.maritalStatus = imp.fit(legacyId, 'maritalStatus', row.marital_status, 20)
    v.nationality = imp.fit(legacyId, 'nationality', row.nationality, 100)
    if (!v.nationality) imp.flag('MISSING_NATIONALITY', legacyId, 'الجنسية غير مسجلة')
    v.country = imp.fit(legacyId, 'country', row.country, 60)
    const addressParts = [text(row.address), text(row.city), text(row.district)].filter((p): p is string => !!p)
    v.address = imp.fit(legacyId, 'address', addressParts.length ? addressParts.join(' — ') : null, 500)
    v.postalCode = imp.fit(legacyId, 'postalCode', row.postal_code, 20)
    v.emergencyContactName = imp.fit(legacyId, 'emergencyContactName', row.emergency_contact_name, 200)
    v.emergencyContactPhone = imp.fit(legacyId, 'emergencyContactPhone', row.emergency_contact_phone, 50)

    // التنظيم
    const branchId = imp.mapped(['branch', 'branches'], row.branch_id)
    if (!branchId) {
      imp.flag('MISSING_BRANCH', legacyId, row.branch_id != null ? 'فرع المصدر غير موجود في خريطة org — أُسند للفرع البديل' : 'موظف بلا فرع — أُسند للفرع البديل')
      v.branchId = await placeholderBranch()
    } else v.branchId = branchId
    const departmentId = imp.mapped(['department', 'departments'], row.department_id)
    v.departmentId = departmentId ?? null
    if (!departmentId) imp.flag('MISSING_DEPARTMENT', legacyId, row.department_id != null ? 'قسم المصدر غير موجود في خريطة org' : 'موظف بلا قسم')
    const teamId = imp.mapped(['team', 'teams'], row.team_id)
    v.teamId = teamId ?? null
    if (row.team_id != null && !teamId) imp.flag('TEAM_UNMAPPED', legacyId, 'فريق المصدر غير موجود في خريطة org')
    const gradeId = imp.mapped(['grade', 'grades'], row.grade_id)
    v.gradeId = gradeId ?? null
    if (row.grade_id != null && !gradeId) imp.flag('GRADE_UNMAPPED', legacyId, 'درجة المصدر غير موجودة في خريطة org')
    const costCenterId = imp.mapped(['cost_center', 'cost_centers', 'cost-center', 'costCenter'], row.cost_center_id)
    v.costCenterId = costCenterId ?? null
    if (row.cost_center_id != null && !costCenterId) imp.flag('COST_CENTER_UNMAPPED', legacyId, 'مركز تكلفة المصدر غير موجود في خريطة org')
    const scheduleId = imp.mapped(['work_schedule', 'work_schedules', 'work-schedule', 'workSchedule'], row.work_schedule_id)
    v.workScheduleId = scheduleId ?? null
    v.jobTitle = await jobTitleText(legacyId, row)

    // التوظيف والتواريخ (بداية العمل الفعلي = بداية استحقاق الراتب)
    const joinDate = imp.date(legacyId, 'joinDate', row.hire_date)
    const actual = imp.date(legacyId, 'actualStartDate', row.actual_start_date) ?? joinDate
    if (!joinDate) imp.flag('MISSING_JOIN_DATE', legacyId, 'تاريخ التعيين غير مسجل')
    v.joinDate = joinDate
    v.actualStartDate = actual
    v.salaryEntitlementStart = actual
    v.workType = imp.fit(legacyId, 'workType', row.work_type, 30)
    let probationEnd = imp.date(legacyId, 'probationEndDate', row.probation_end_date)
    const probationMonths = intOrNull(row.probation_months)
    if (!probationEnd && joinDate && probationMonths) {
      probationEnd = addMonths(joinDate, probationMonths)
      if (probationEnd) ctx.count('probation_end_derived')
    }
    v.probationEndDate = probationEnd
    v.recruitmentSource = imp.fit(legacyId, 'recruitmentSource', row.recruitment_source, 60)
    v.workLocation = imp.fit(legacyId, 'workLocation', row.work_location, 120)
    v.annualLeaveEntitled = bool(row.annual_leave_eligible) !== false

    // العقد الحالي (activeContract: status=active، الأحدث بداية ثم معرّفًا)
    const contracts = contractsByEmployee.get(legacyId) ?? []
    const current: Row | null = (row.active_contract && typeof row.active_contract === 'object' ? row.active_contract : null) ??
      [...contracts].filter((c) => c.status === 'active')
        .sort((a, b) => String(b.start_date ?? '').localeCompare(String(a.start_date ?? '')) || Number(b.id) - Number(a.id))[0] ?? null
    if (current) {
      const type = text(current.type)
      v.contractType = type ? CONTRACT_TYPES[type] ?? imp.fit(legacyId, 'contractType', type, 30) : null
      if (type && !CONTRACT_TYPES[type]) imp.flag('CONTRACT_TYPE_UNKNOWN', legacyId, 'نوع عقد غير معروف — نُقل كما هو')
      v.contractStart = imp.date(legacyId, 'contractStart', current.start_date)
      v.contractEnd = imp.date(legacyId, 'contractEnd', current.end_date)
      if (type === 'fixed' && !v.contractEnd) imp.flag('FIXED_CONTRACT_NO_END', legacyId, 'عقد محدد المدة بلا تاريخ نهاية')
      v.contractNumber = imp.fit(legacyId, 'contractNumber', current.contract_number, 60)
      v.contractDurationMonths = intOrNull(current.duration_months)
      v.noticePeriodDays = intOrNull(current.notice_period_days)
    } else if (text(row.status) !== 'archived') {
      imp.flag('NO_CONTRACT', legacyId, 'لا يوجد عقد ساري في المصدر')
    }

    // الحالة
    const srcStatus = text(row.status)?.toLowerCase() ?? ''
    const mappedStatus = STATUS_MAP[srcStatus] ?? STATUS_MAP.active
    if (!STATUS_MAP[srcStatus]) imp.flag('UNKNOWN_STATUS', legacyId, 'حالة غير معروفة في المصدر — استُوردت «نشط»')
    if (srcStatus === 'pending_finalization') imp.flag('PENDING_FINALIZATION', legacyId, 'حالة «بانتظار التصفية» لا مقابل لها — استُوردت «فترة إشعار»')
    if (srcStatus === 'suspended') imp.flag('SUSPENSION_NO_DATES', legacyId, 'موقوف في المصدر بلا تواريخ إيقاف (الـAPI لا يعرضها) — حُفظت الحالة «موقوف» بلا فترة في employee_suspensions')
    v.status = mappedStatus.status
    v.isActive = mappedStatus.isActive
    if (mappedStatus.status === 'archived' || mappedStatus.status === 'terminated') {
      let archivedAt = timestamp(row.archived_at)
      if (!archivedAt) {
        archivedAt = timestamp(row.updated_at) ?? imp.ctx.now
        imp.flag('ARCHIVED_AT_MISSING', legacyId, 'مؤرشف بلا تاريخ أرشفة — استُخدم آخر تحديث للسجل')
      }
      v.archivedAt = archivedAt
      let reason = text(row.archive_reason) ?? text(row.termination_reason)
      if (!reason) {
        reason = 'مرحّل من النظام القديم'
        imp.flag('ARCHIVE_REASON_MISSING', legacyId, 'مؤرشف بلا سبب — سُجل سبب افتراضي')
      }
      v.archiveReason = imp.fit(legacyId, 'archiveReason', reason, 300)
    }

    // الراتب والمكونات
    const currency = text(row.currency)?.toUpperCase() ?? 'SAR'
    v.currency = imp.fit(legacyId, 'currency', currency, 10)
    if (currency !== 'SAR' && currency !== 'EGP') imp.flag('CURRENCY_UNSUPPORTED', legacyId, 'عملة غير SAR/EGP — لن يُوثَّق سجل الأجر')
    v.salaryCycle = imp.fit(legacyId, 'salaryCycle', row.salary_cycle, 20)
    const basic = cents(row.basic_salary) ?? (current ? cents(current.basic_salary) : null)
    if (row.basic_salary == null && basic != null) imp.flag('BASIC_FROM_CONTRACT', legacyId, 'الراتب الأساسي غير مسجل على الموظف — أُخذ من العقد الساري')
    if (basic == null || basic <= 0n) imp.flag('MISSING_BASIC_SALARY', legacyId, 'الراتب الأساسي فارغ أو صفر')
    const basicCents = basic != null && basic > 0n ? basic : 0n
    v.basicSalary = basic == null ? null : moneyText(basicCents)
    const buckets = computeAllowances(imp, legacyId, row, allowancesByEmployee.get(legacyId) ?? [], basicCents)
    v.housingAllowance = moneyText(buckets.housingAllowance)
    v.transportAllowance = moneyText(buckets.transportAllowance)
    v.phoneAllowance = moneyText(buckets.phoneAllowance)
    v.workNatureAllowance = moneyText(buckets.workNatureAllowance)
    v.otherAllowance = moneyText(buckets.otherAllowance)

    // طريقة الصرف والبنك
    const payRaw = text(row.payment_method)?.toLowerCase() ?? null
    const payMethod = payRaw ? PAY_METHODS[payRaw] ?? 'transfer' : 'transfer'
    if (payRaw === 'check') imp.flag('PAY_METHOD_CHECK', legacyId, 'الصرف بشيك لا مقابل له — استُورد «تحويل بنكي»')
    else if (payRaw && !PAY_METHODS[payRaw]) imp.flag('PAY_METHOD_UNKNOWN', legacyId, 'طريقة صرف غير معروفة — استُوردت «تحويل بنكي»')
    v.payMethod = payMethod
    v.bankTransferAmount = null
    if (payMethod === 'mixed') {
      // المصدر يحفظ الجزء النقدي الثابت، ونظامنا يحفظ الجزء البنكي: تقريب = إجمالي الراتب − النقدي
      const cash = cents(row.preferred_cash_amount)
      const gross = basicCents + buckets.housingAllowance + buckets.transportAllowance + buckets.phoneAllowance + buckets.workNatureAllowance + buckets.otherAllowance
      if (cash != null && cash > 0n && gross - cash > 0n) {
        v.bankTransferAmount = moneyText(gross - cash)
        imp.flag('MIXED_SPLIT_APPROXIMATED', legacyId, 'نقدي + بنك: مبلغ البنك = إجمالي الراتب − المبلغ النقدي في المصدر (تقريبي، راجعه)')
      } else imp.flag('MIXED_SPLIT_UNCONVERTED', legacyId, 'نقدي + بنك بلا مبلغ نقدي صالح في المصدر — مبلغ البنك فارغ')
    }
    v.bankName = imp.fit(legacyId, 'bankName', row.bank_name, 100)
    v.bankBranch = imp.fit(legacyId, 'bankBranch', row.bank_branch, 120)
    const iban = text(row.iban)?.replace(/\s+/g, '').toUpperCase() ?? null
    v.iban = imp.fit(legacyId, 'iban', iban, 50)
    if (payMethod !== 'cash' && (!v.iban || !v.bankName)) imp.flag('MISSING_BANK_DETAILS', legacyId, 'صرف بنكي بلا آيبان أو اسم بنك')

    // التأمينات الاجتماعية
    v.gosiNumber = imp.fit(legacyId, 'gosiNumber', row.gosi_number, 40)
    v.isGosiRegistered = bool(row.is_gosi_registered)
    const gosiBase = cents(row.gosi_base_salary)
    v.gosiBaseSalary = gosiBase == null ? null : moneyText(gosiBase)

    // بيانات بلا عمود مقابل (تبقى في raw)
    if (text(row.notes)) imp.flag('UNMAPPED_FIELD', legacyId, 'ملاحظات الموظف: لا حقل مقابل — محفوظة في raw فقط')
    if (text(row.extension_number)) imp.flag('UNMAPPED_FIELD', legacyId, 'رقم التحويلة: لا حقل مقابل — محفوظ في raw فقط')
    if (intOrNull(row.children)) imp.flag('UNMAPPED_FIELD', legacyId, 'عدد الأبناء: لا حقل مقابل — محفوظ في raw فقط')

    const createdAt = timestamp(row.created_at)
    if (createdAt) v.createdAt = createdAt

    pending.push({ legacyId, row, values: v, codeIssue })
  }

  // الأكواد الصالحة أولًا ثم توليد أكواد EMP-#### للباقي من أكبر رقم (نفس قاعدة المولّد)
  pending.sort((a, b) => Number(!!a.codeIssue) - Number(!!b.codeIssue) || Number(a.legacyId) - Number(b.legacyId))
  for (const p of pending) {
    if (p.codeIssue) {
      const generated = nextEmployeeCodeFrom(allCodes)
      allCodes.push(generated)
      usedCodes.add(generated.toUpperCase())
      p.values.employeeCode = generated
      imp.flag('EMPLOYEE_CODE_GENERATED', p.legacyId, `${p.codeIssue} — وُلّد كود جديد`)
    }
    const saved = await em.save(Employee, em.create(Employee, p.values as any))
    ctx.ids.set('employee', p.legacyId, saved.id)
    ctx.count('employee')
    ctx.count(`employee_status_${saved.status}`)
    imported.push({ legacyId: p.legacyId, row: p.row, employeeId: saved.id, fresh: true })
    await em.save(EmployeeStatusHistory, em.create(EmployeeStatusHistory, {
      employeeId: saved.id, changeType: 'DATA', fieldName: 'legacy_import', oldValue: null, newValue: null,
      oldStatus: null as any, newStatus: 'change', changedByUserId: imp.actorId, reason: `${REASON} — رقم ${saved.employeeCode}`,
    }))
  }

  const userToLegacyEmployee = new Map<string, string>()
  for (const { legacyId, row } of imported) {
    const userId = legacyIdOf(row.user_id)
    if (userId) userToLegacyEmployee.set(userId, legacyId)
  }

  // ===== المرحلة 2: المدير المباشر + مديرو الأقسام وقادة الفرق ومديرو الفروع =====
  for (const { legacyId, row, employeeId } of imported) {
    const managerLegacy = legacyIdOf(row.manager_id)
    if (!managerLegacy) continue
    const managerId = ctx.ids.get('employee', managerLegacy)
    if (!managerId || managerId === employeeId) {
      imp.flag('MANAGER_UNMAPPED', legacyId, managerId ? 'الموظف مدير نفسه في المصدر — تُرك فارغًا' : 'المدير المباشر غير مستورد — تُرك فارغًا')
      continue
    }
    await em.update(Employee, { id: employeeId }, { managerEmployeeId: managerId })
    ctx.count('direct_manager_set')
  }
  await backfillOrgManagers(imp, userToLegacyEmployee)

  // ===== المرحلة 3: العقود السابقة في سجل التغييرات =====
  for (const { legacyId, row, employeeId } of imported) {
    const currentId = legacyIdOf(row.active_contract?.id)
    for (const c of contractsByEmployee.get(legacyId) ?? []) {
      const cid = legacyIdOf(c.id)
      if (!cid || cid === currentId || c.status === 'active' || ctx.ids.get('employee_contract_history', cid)) continue
      const h = await em.save(EmployeeStatusHistory, em.create(EmployeeStatusHistory, {
        employeeId, changeType: 'CONTRACT', fieldName: 'contract', oldValue: null,
        newValue: {
          type: CONTRACT_TYPES[String(c.type)] ?? text(c.type), contractNumber: text(c.contract_number),
          startDate: imp.date(legacyId, 'contract.start_date', c.start_date), endDate: imp.date(legacyId, 'contract.end_date', c.end_date),
          status: text(c.status), terminationReason: text(c.termination_reason), terminationDate: imp.date(legacyId, 'contract.termination_date', c.termination_date),
        },
        oldStatus: null as any, newStatus: 'change', changedByUserId: imp.actorId, reason: 'عقد سابق مرحّل من النظام القديم',
        ...(timestamp(c.created_at) ? { changedAt: timestamp(c.created_at)! } : {}),
      }))
      ctx.ids.set('employee_contract_history', cid, h.id)
      ctx.count('contract_history')
    }
  }

  // ===== المرحلة 4: المؤهلات =====
  await importQualifications(imp, eachByEmployee)

  // ===== المرحلة 5: المستندات والصور =====
  await importDocuments(imp, byId)
  await importPhotos(imp, imported)

  // ===== المرحلة 6: سجل الأجر + دوام الموظف + فرعه (السجلات الموثقة ببصمة) =====
  try {
    imp.cycleStartDay = await readSalaryCycleStartDay(em)
  } catch (err) {
    if (!httpError(err)) throw err
    imp.flag('SALARY_CYCLE_SETTING_MISSING', null, 'إعداد بداية دورة الرواتب غير مثبت — لم يُوثَّق سجل أجر لأي موظف')
  }
  for (const item of imported) await documentEmployee(imp, item)
}

// ===================== البدلات =====================

function computeAllowances(imp: Importer, legacyId: string, row: Row, assigned: Row[], basicCents: bigint): Record<Bucket, bigint> {
  const out: Record<Bucket, bigint> = { housingAllowance: 0n, transportAllowance: 0n, phoneAllowance: 0n, workNatureAllowance: 0n, otherAllowance: 0n }
  const otherNames = new Set<string>()
  const D = imp.today
  const live = assigned.filter((a) => a && !a.deleted_at)

  if (live.length) {
    for (const a of live) {
      const t: Row = a.allowance_type && typeof a.allowance_type === 'object' ? a.allowance_type : {}
      const effective = text(a.effective_date)?.slice(0, 10) ?? ''
      const end = text(a.end_date)?.slice(0, 10) ?? null
      if (bool(a.is_active) === false || (end && end < D)) continue
      if (effective && effective > D) {
        imp.flag('ALLOWANCE_FUTURE', legacyId, 'بدل يسري في تاريخ لاحق — لم يُضف للراتب الحالي (يُراجع في المسير)')
        continue
      }
      const nature = text(t.nature) ?? 'earning'
      const frequency = text(t.payment_frequency) ?? 'monthly'
      if (nature !== 'earning' || frequency !== 'monthly' || bool(a.is_recurring) === false || a.consumed_run_id != null) {
        imp.flag('ALLOWANCE_NOT_MONTHLY', legacyId, 'بند غير شهري/غير متكرر/خصم — ليس مكوّن راتب (مجال الرواتب)')
        continue
      }
      const method = text(a.calculation_method) ?? text(t.calculation_method) ?? 'fixed'
      let amount = cents(a.value) ?? 0n
      if (method === 'percentage') {
        amount = (basicCents * amount + 5000n) / 10000n
        imp.flag('ALLOWANCE_PERCENT_FROZEN', legacyId, 'بدل بنسبة من الأساسي — ثُبّت مبلغًا')
        if (text(t.percentage_base) && text(t.percentage_base) !== 'basic') imp.flag('ALLOWANCE_PERCENT_BASE', legacyId, 'قاعدة نسبة البدل ليست الأساسي — حُسبت من الأساسي')
      }
      const max = cents(t.max_amount)
      if (max != null && max > 0n && amount > max) {
        amount = max
        imp.flag('ALLOWANCE_CAPPED', legacyId, 'البدل تجاوز الحد الأقصى لنوعه — طُبق الحد')
      }
      if (amount < 0n) amount = 0n
      const bucket = bucketOf(t.name_en, t.name_ar, t.name)
      out[bucket] += amount
      if (bucket === 'otherAllowance') otherNames.add(String(a.allowance_type_id ?? t.id ?? ''))
      imp.ctx.count('allowance_component')
    }
  } else if (Array.isArray(row.allowances) && row.allowances.length) {
    for (const j of row.allowances as Row[]) {
      if (!j || typeof j !== 'object') continue
      let amount = cents(j.amount) ?? 0n
      if ((j.basis === 'percent' || j.basis === 'percentage') && j.percentage != null) {
        amount = (basicCents * (cents(j.percentage) ?? 0n) + 5000n) / 10000n
        imp.flag('ALLOWANCE_PERCENT_FROZEN', legacyId, 'بدل بنسبة من الأساسي — ثُبّت مبلغًا')
      }
      if (amount < 0n) amount = 0n
      const bucket = bucketOf(j.type, j.name)
      out[bucket] += amount
      if (bucket === 'otherAllowance') otherNames.add(String(j.type ?? j.name ?? ''))
      imp.ctx.count('allowance_component')
    }
    imp.flag('ALLOWANCE_FROM_JSON', legacyId, 'لا بدلات مُسندة في الرواتب — أُخذت من نسخة العرض على ملف الموظف')
  }
  if (otherNames.size > 1) imp.flag('OTHER_ALLOWANCE_MERGED', legacyId, `${otherNames.size} أنواع بدلات دُمجت في «بدلات أخرى»`)
  return out
}

// ===================== المديرون =====================

async function backfillOrgManagers(imp: Importer, userToLegacyEmployee: Map<string, string>) {
  const { ctx, em } = imp
  const employeeOfUser = (userId: unknown) => {
    const legacyUser = legacyIdOf(userId)
    const legacyEmp = legacyUser ? userToLegacyEmployee.get(legacyUser) : undefined
    return legacyEmp ? ctx.ids.get('employee', legacyEmp) : undefined
  }
  for (const d of readRaw<Row>('departments')) {
    if (d?.manager_id == null) continue
    const deptId = imp.mapped(['department', 'departments'], d.id)
    const managerId = employeeOfUser(d.manager_id)
    if (!deptId || !managerId) {
      imp.flag('DEPARTMENT_MANAGER_UNMAPPED', d.id ?? null, !deptId ? 'قسم غير موجود في خريطة org' : 'مدير القسم (مستخدم) غير مرتبط بموظف مستورد')
      continue
    }
    await em.update(Department, { id: deptId }, { managerEmployeeId: managerId })
    ctx.count('department_manager_set')
  }
  for (const t of readRaw<Row>('teams')) {
    if (t?.leader_id == null) continue
    const teamId = imp.mapped(['team', 'teams'], t.id)
    const leaderId = employeeOfUser(t.leader_id)
    if (!teamId || !leaderId) {
      imp.flag('TEAM_LEADER_UNMAPPED', t.id ?? null, !teamId ? 'فريق غير موجود في خريطة org' : 'قائد الفريق (مستخدم) غير مرتبط بموظف مستورد')
      continue
    }
    await em.update(Team, { id: teamId }, { leaderEmployeeId: leaderId })
    ctx.count('team_leader_set')
  }
  for (const b of readRaw<Row>('branches')) {
    if (b?.branch_manager_id == null) continue
    const branchId = imp.mapped(['branch', 'branches'], b.id)
    const managerId = ctx.ids.get('employee', String(b.branch_manager_id))
    if (!branchId || !managerId) {
      imp.flag('BRANCH_MANAGER_UNMAPPED', b.id ?? null, !branchId ? 'فرع غير موجود في خريطة org' : 'مدير الفرع غير مستورد')
      continue
    }
    await em.update(Branch, { id: branchId }, { managerEmployeeId: managerId })
    ctx.count('branch_manager_set')
  }
}

// ===================== المؤهلات =====================

async function importQualifications(imp: Importer, eachByEmployee: (keys: string[]) => Map<string, Row[]>) {
  const { ctx, em } = imp
  const forKind = (kind: string) => eachByEmployee([`employee-${kind}`, `employee-${kind}-archived`])
  const target = (legacyEmp: string, kind: string, rowId: unknown) => {
    const employeeId = ctx.ids.get('employee', legacyEmp)
    const rid = legacyIdOf(rowId)
    if (!employeeId) {
      imp.flag('QUALIFICATION_EMPLOYEE_UNMAPPED', rid, `${kind}: الموظف غير مستورد — تُخطّي`)
      return null
    }
    if (rid && ctx.ids.get(`employee_${kind}`, rid)) return null
    return { employeeId, rid }
  }
  const created = (value: unknown) => {
    const d = timestamp(value)
    return d ? { createdAt: d } : {}
  }

  for (const [legacyEmp, list] of forKind('education')) {
    for (const r of list) {
      if (r.deleted_at) continue
      const t = target(legacyEmp, 'education', r.id)
      if (!t) continue
      const degreeText = text(r.degree)
      const degree = degreeCode(degreeText)
      if (!degree.matched) imp.flag('DEGREE_UNMAPPED', t.rid, 'درجة المؤهل نص حر غير معروف — سُجلت «أخرى» (النص في raw)')
      const year = /\d{4}/.exec(String(r.year ?? ''))?.[0]
      if (text(r.year) && !year) imp.flag('GRADUATION_YEAR_INVALID', t.rid, 'سنة التخرج غير صالحة — تُركت فارغة')
      const saved = await em.save(EmployeeEducation, em.create(EmployeeEducation, {
        employeeId: t.employeeId, degree: degree.code,
        major: imp.fit(t.rid ?? legacyEmp, 'education.major', r.major, 150), institution: imp.fit(t.rid ?? legacyEmp, 'education.institution', r.institution, 200),
        graduationYear: year ? Number(year) : null, ...created(r.created_at),
      } as any))
      if (t.rid) ctx.ids.set('employee_education', t.rid, (saved as unknown as EmployeeEducation).id)
      ctx.count('education')
    }
  }
  for (const [legacyEmp, list] of forKind('certifications')) {
    for (const r of list) {
      if (r.deleted_at) continue
      const t = target(legacyEmp, 'certifications', r.id)
      if (!t) continue
      const name = imp.fit(t.rid ?? legacyEmp, 'certification.name', r.name, 200)
      if (!name) { imp.flag('QUALIFICATION_EMPTY', t.rid, 'شهادة بلا اسم — تُخطّيت'); continue }
      const saved = await em.save(EmployeeCertification, em.create(EmployeeCertification, {
        employeeId: t.employeeId, name, issuer: imp.fit(t.rid ?? legacyEmp, 'certification.issuer', r.issuer, 200),
        issueDate: imp.date(t.rid ?? legacyEmp, 'certification.issue_date', r.issue_date),
        expiryDate: imp.date(t.rid ?? legacyEmp, 'certification.expiry_date', r.expiry_date), ...created(r.created_at),
      } as any))
      if (t.rid) ctx.ids.set('employee_certifications', t.rid, (saved as unknown as EmployeeCertification).id)
      ctx.count('certification')
    }
  }
  for (const [legacyEmp, list] of forKind('experiences')) {
    for (const r of list) {
      if (r.deleted_at) continue
      const t = target(legacyEmp, 'experiences', r.id)
      if (!t) continue
      const company = imp.fit(t.rid ?? legacyEmp, 'experience.company', r.company, 200)
      if (!company) { imp.flag('QUALIFICATION_EMPTY', t.rid, 'خبرة بلا جهة — تُخطّيت'); continue }
      const saved = await em.save(EmployeeExperience, em.create(EmployeeExperience, {
        employeeId: t.employeeId, company, jobTitle: imp.fit(t.rid ?? legacyEmp, 'experience.position', r.position, 150),
        country: imp.fit(t.rid ?? legacyEmp, 'experience.country', r.country, 60),
        fromDate: imp.date(t.rid ?? legacyEmp, 'experience.start_date', r.start_date), toDate: imp.date(t.rid ?? legacyEmp, 'experience.end_date', r.end_date),
        leaveReason: imp.fit(t.rid ?? legacyEmp, 'experience.reason', r.reason, 300), ...created(r.created_at),
      } as any))
      if (t.rid) ctx.ids.set('employee_experiences', t.rid, (saved as unknown as EmployeeExperience).id)
      ctx.count('experience')
    }
  }
  for (const [legacyEmp, list] of forKind('skills')) {
    for (const r of list) {
      if (r.deleted_at) continue
      const t = target(legacyEmp, 'skills', r.id)
      if (!t) continue
      const name = imp.fit(t.rid ?? legacyEmp, 'skill.name', r.name, 150)
      if (!name) { imp.flag('QUALIFICATION_EMPTY', t.rid, 'مهارة بلا اسم — تُخطّيت'); continue }
      const level = text(r.level)?.toLowerCase() ?? null
      if (level && !SKILL_LEVELS.has(level)) imp.flag('SKILL_LEVEL_UNKNOWN', t.rid, 'مستوى مهارة غير معروف — تُرك فارغًا')
      const saved = await em.save(EmployeeSkill, em.create(EmployeeSkill, {
        employeeId: t.employeeId, name, level: level && SKILL_LEVELS.has(level) ? level : null, yearsExperience: null, ...created(r.created_at),
      } as any))
      if (t.rid) ctx.ids.set('employee_skills', t.rid, (saved as unknown as EmployeeSkill).id)
      ctx.count('skill')
    }
  }
  for (const [legacyEmp, list] of forKind('languages')) {
    for (const r of list) {
      if (r.deleted_at) continue
      const t = target(legacyEmp, 'languages', r.id)
      if (!t) continue
      const language = imp.fit(t.rid ?? legacyEmp, 'language.name', r.name, 80)
      if (!language) { imp.flag('QUALIFICATION_EMPTY', t.rid, 'لغة بلا اسم — تُخطّيت'); continue }
      const raw = text(r.level)?.toLowerCase() ?? null
      const level = raw ? LANGUAGE_LEVELS[raw] ?? null : null
      if (raw && !level) imp.flag('LANGUAGE_LEVEL_UNKNOWN', t.rid, 'مستوى لغة غير معروف — تُرك فارغًا')
      const saved = await em.save(EmployeeLanguage, em.create(EmployeeLanguage, {
        employeeId: t.employeeId, language, speaking: level, writing: level, reading: level, ...created(r.created_at),
      } as any))
      if (t.rid) ctx.ids.set('employee_languages', t.rid, (saved as unknown as EmployeeLanguage).id)
      ctx.count('language')
    }
  }
}

// ===================== المستندات والصور =====================

async function importDocuments(imp: Importer, employeesById: Map<string, Row>) {
  const { ctx, em } = imp
  const docs = readRaw<Row>('employee-documents')
  if (!docs.length) return

  const catalog = new Map((await em.find(DocType)).map((t) => [t.code, t]))
  const catalogNames = new Set([...catalog.values()].map((t) => t.nameAr))
  const sourceTypes = new Map(readRaw<Row>('employee-document-types').map((t) => [String(t.code ?? ''), t]))
  const resolveDocType = async (legacyDocId: string, value: unknown): Promise<string> => {
    const code = text(value)
    if (!code) {
      imp.flag('DOCUMENT_TYPE_MISSING', legacyDocId, 'مستند بلا نوع — سُجل «أخرى»')
      return 'other'
    }
    if (catalog.has(code)) return code
    if (code === 'certificate') {
      imp.flag('DOCUMENT_TYPE_MAPPED', legacyDocId, 'نوع «certificate» سُجل «شهادة المؤهل»')
      return 'qualification_certificate'
    }
    if (!DOC_TYPE_CODE_RE.test(code)) {
      imp.flag('DOCUMENT_TYPE_UNMAPPED', legacyDocId, 'كود نوع مستند غير صالح لكتالوجنا — سُجل «أخرى»')
      return 'other'
    }
    let nameAr = text(sourceTypes.get(code)?.name_ar) ?? code
    if (nameAr.length > 200) nameAr = nameAr.slice(0, 200)
    if (catalogNames.has(nameAr)) nameAr = `${nameAr.slice(0, 190)} (${code})`.slice(0, 200)
    const created = await em.save(DocType, em.create(DocType, { code, nameAr, isActive: true }))
    catalog.set(code, created)
    catalogNames.add(nameAr)
    ctx.count('doc_type_created')
    return code
  }

  for (const d of docs) {
    const docId = legacyIdOf(d?.id)
    if (!docId) continue
    if (ctx.ids.get('employee_document', docId)) continue
    const legacyEmp = legacyIdOf(d.employee_id)
    const employeeId = legacyEmp ? ctx.ids.get('employee', legacyEmp) : undefined
    if (!employeeId || !legacyEmp) {
      imp.flag('DOCUMENT_EMPLOYEE_UNMAPPED', docId, 'مستند لموظف غير مستورد — تُخطّي')
      continue
    }
    const emp = employeesById.get(legacyEmp) ?? {}
    const docType = await resolveDocType(docId, d.type)

    const meta: Row = d.metadata && typeof d.metadata === 'object' && !Array.isArray(d.metadata) ? d.metadata : {}
    let number = text(meta.number) ?? text(meta.document_number) ?? text(meta.id_number)
    if (!number) {
      if (docType === 'national_id' || docType === 'iqama') number = text(emp.national_id)
      else if (docType === 'passport') number = text(emp.passport_no)
      else if (docType === 'contract') number = text(emp.active_contract?.contract_number)
    }
    const title = text(d.title)
    const notesSrc = text(d.notes)
    const notesJoined = [title, notesSrc].filter((p): p is string => !!p).join(' — ')

    let fileRef: string | null = null
    let storedFileId: number | null = null
    const raw = rawFilePath('employee-document-files', docId)
    if (raw) {
      const originalName = (text(d.file_name) ?? raw.filename).slice(0, 300)
      const uploadedAt = timestamp(d.created_at)
      const copied = imp.copyToUploads(raw.path, originalName, uploadedAt)
      const expected = intOrNull(d.file_size)
      if (expected != null && expected !== copied.size) imp.flag('FILE_SIZE_MISMATCH', docId, 'حجم الملف المنسوخ يختلف عن الحجم المسجل في المصدر')
      const file = await em.save(StoredFile, em.create(StoredFile, {
        originalName, storedName: copied.storedName, mime: (text(d.mime_type) ?? raw.contentType).slice(0, 100), size: copied.size,
        entityType: docType === 'contract' ? 'contract' : 'document', employeeId,
        uploadedBy: imp.mapped(['user', 'users'], d.uploaded_by) ?? null, ...(uploadedAt ? { uploadedAt } : {}),
      } as any)) as unknown as StoredFile
      storedFileId = file.id
      fileRef = `file:${file.id}`
      ctx.count('stored_file')
    } else imp.flag('FILE_MISSING', docId, 'ملف المستند غير موجود في raw — سُجل المستند بلا مرفق')

    const saved = await em.save(EmployeeDocument, em.create(EmployeeDocument, {
      employeeId, docType, number: number ? imp.fit(docId, 'document.number', number, 100) : null,
      issueDate: imp.date(docId, 'document.issued_date', d.issued_date), expiryDate: imp.date(docId, 'document.expiry_date', d.expiry_date),
      fileRef, notes: notesJoined ? imp.fit(docId, 'document.notes', notesJoined, 500) : null,
    } as any)) as unknown as EmployeeDocument
    if (storedFileId) await em.update(StoredFile, { id: storedFileId }, { entityId: saved.id })
    ctx.ids.set('employee_document', docId, saved.id)
    ctx.count('document')
  }
}

async function importPhotos(imp: Importer, imported: Array<{ legacyId: string; row: Row; employeeId: number }>) {
  const { ctx, em } = imp
  // فهرس ملفات الصور: المعرّف في مصدر each هو الرابط نفسه، فالمطابقة باسم ملف الرابط (اسم التخزين الفريد في Laravel)
  const byBasename = new Map<string, { path: string; filename: string; contentType: string }>()
  for (const key of PHOTO_KEYS) {
    let names: string[] = []
    try { names = fs.readdirSync(rawDir(key)) } catch { names = [] }
    for (const name of names) {
      if (name.endsWith('.meta.json') || name.endsWith('.tmp')) continue
      const base = name.replace(/\.[^.]+$/, '')
      let meta: { contentType?: unknown; filename?: unknown } = {}
      try { meta = JSON.parse(fs.readFileSync(path.join(rawDir(key), `${base}.meta.json`), 'utf8').replace(/^﻿/, '')) } catch { meta = {} }
      const filename = typeof meta.filename === 'string' && meta.filename.trim() ? path.basename(meta.filename.trim()) : name
      const contentType = typeof meta.contentType === 'string' && meta.contentType.trim() ? meta.contentType.split(';')[0].trim() : `image/${path.extname(name).slice(1).toLowerCase().replace('jpg', 'jpeg')}`
      const entry = { path: path.join(rawDir(key), name), filename, contentType }
      for (const k of [filename, name, base]) byBasename.set(k.toLowerCase(), entry)
    }
  }
  const urlBasename = (url: string) => {
    try { return decodeURIComponent(path.posix.basename(new URL(url, 'http://legacy.local').pathname)).toLowerCase() } catch { return '' }
  }
  for (const { legacyId, row, employeeId } of imported) {
    const photoUrl = text(row.photo_url)
    if (!photoUrl || ctx.ids.get('employee_photo', legacyId)) continue
    const bn = urlBasename(photoUrl)
    const raw = PHOTO_KEYS.map((key) => rawFilePath(key, legacyId)).find((r) => !!r) ??
      (bn ? byBasename.get(bn) ?? [...byBasename.entries()].find(([k]) => k.endsWith(bn))?.[1] : undefined) ?? null
    if (!raw) {
      imp.flag('PHOTO_NOT_EXTRACTED', legacyId, 'للموظف صورة في المصدر لكنها غير موجودة في raw/employee-photos')
      continue
    }
    if (!raw.contentType.startsWith('image/')) {
      imp.flag('PHOTO_NOT_IMAGE', legacyId, 'ملف الصورة ليس صورة — تُخطّي')
      continue
    }
    const originalName = raw.filename.slice(0, 300)
    const copied = imp.copyToUploads(raw.path, originalName, null)
    const file = await em.save(StoredFile, em.create(StoredFile, {
      originalName, storedName: copied.storedName, mime: raw.contentType.slice(0, 100), size: copied.size,
      entityType: 'employee_photo', employeeId,
    } as any)) as unknown as StoredFile
    await em.update(Employee, { id: employeeId }, { photoFileId: file.id })
    ctx.ids.set('employee_photo', legacyId, file.id)
    ctx.count('photo')
  }
}

// ===================== السجلات الموثقة: الأجر والدوام والفرع =====================

async function documentEmployee(imp: Importer, item: { legacyId: string; row: Row; employeeId: number }) {
  const { ctx, em } = imp
  const { legacyId, row, employeeId } = item
  const employee = await em.findOne(Employee, {
    where: { id: employeeId },
    select: { id: true, status: true, currency: true, actualStartDate: true, joinDate: true, branchId: true, workScheduleId: true },
  })
  if (!employee) return
  const asDate = (value: unknown): string | null => {
    const s = value instanceof Date ? value.toISOString().slice(0, 10) : typeof value === 'string' ? value.slice(0, 10) : null
    return s && isValidDate(s) ? s : null
  }
  const startDate = asDate(employee.actualStartDate) ?? asDate(employee.joinDate)
  const effectiveFrom = startDate ?? imp.today

  // سجل الأجر: مراجعة شهرية أولى «يسري من راتب شهر» (نفس افتراض أجر التعيين: الشهر الجاري، أو شهر التعيين لو قريب)
  if (imp.cycleStartDay != null && employee.status !== 'archived' && employee.status !== 'terminated' &&
      (employee.currency === 'SAR' || employee.currency === 'EGP')) {
    try {
      const history = await readSalaryHistory(em, employeeId)
      if (history.revision === 0) {
        const current = await readSalaryHistoryCurrent(em, employeeId)
        if (current) {
          const amounts: Record<string, string> = {}
          let positive = false
          for (const key of ['basicSalary', 'housingAllowance', 'transportAllowance', 'phoneAllowance', 'workNatureAllowance', 'otherAllowance'] as const) {
            const value = current.current[key] ?? '0.00'
            amounts[key] = value
            if (!/^0+(?:\.0+)?$/.test(value)) positive = true
          }
          if (positive) {
            const context = employeeSalaryStartContext({ cycleStartDay: imp.cycleStartDay, today: imp.today, hireDate: startDate })
            await appendMonthlySalaryHistoryRevision(em, {
              employeeId, reason: 'أجر مرحّل من النظام القديم', evidenceReference: `${REASON} — ${String(current.employee.employeeCode).slice(0, 60)}`,
              currentSourceHash: current.currentSourceHash, cycleStartDay: imp.cycleStartDay, createdBy: imp.actorId,
              periods: [{ ...(amounts as any), currency: employee.currency as 'SAR' | 'EGP', effectivePayrollPeriod: context.defaultPayrollPeriod, effectiveToPayrollPeriod: null }],
            })
            ctx.count('salary_history_revision')
          } else ctx.count('salary_history_skipped_zero')
        }
      }
    } catch (err) {
      const code = httpError(err)
      if (!code) throw err
      imp.flag('SALARY_HISTORY_NOT_DOCUMENTED', legacyId, `تعذر توثيق سجل الأجر (${code}) — يُوثَّق من شاشة سجل الأجر`)
    }
  }

  // دوام الموظف (نسخة EMPLOYEE): تُكتب لو جدول المصدر فارغ أو مربوط؛ جدول غير مستورد بعد ⇒ مجال الحضور يكتبها
  const legacySchedule = legacyIdOf(row.work_schedule_id)
  if (legacySchedule && !employee.workScheduleId) {
    imp.flag('WORK_SCHEDULE_DEFERRED', legacyId, 'جدول عمل الموظف غير موجود في الخريطة بعد — مجال الحضور يسنده ويكتب نسخة الدوام')
  } else if (!(await em.existsBy(AttendanceRuleVersion, { sourceType: 'EMPLOYEE', sourceId: employeeId }))) {
    try {
      await appendAttendanceRuleVersion(em, {
        sourceType: 'EMPLOYEE', sourceId: employeeId, before: { workScheduleId: null, flexOverrideMode: 'INHERIT' },
        snapshot: { workScheduleId: employee.workScheduleId ?? null, flexOverrideMode: 'INHERIT' },
        effectiveFrom, actorUserId: imp.actorId, reason: 'دوام الموظف مرحّل من النظام القديم من تاريخ بدء العمل',
      })
      ctx.count('attendance_rule_version')
    } catch (err) {
      const code = httpError(err)
      if (!code) throw err
      imp.flag('ATTENDANCE_RULE_NOT_DOCUMENTED', legacyId, `تعذر تسجيل نسخة الدوام (${code})`)
    }
  }

  // فرع الموظف (نسخة EMPLOYEE_ORG عبر مغلف التقويم)
  try {
    const before = await readCalendarSource(em, 'EMPLOYEE', employeeId)
    if (before.revision === 0) {
      await finishCalendarChange(em, before, {
        effectiveFrom, reason: 'فرع الموظف مرحّل من النظام القديم من تاريخ بدء العمل',
        expectedRevision: before.revision, expectedCurrentSourceHash: before.currentSourceHash,
      }, imp.actorId)
      ctx.count('employee_org_version')
    }
  } catch (err) {
    const code = httpError(err)
    if (!code) throw err
    imp.flag('EMPLOYEE_ORG_NOT_DOCUMENTED', legacyId, `تعذر تسجيل نسخة فرع الموظف (${code})`)
  }
}
