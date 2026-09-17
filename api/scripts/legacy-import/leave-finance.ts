// ===== مجال الإجازات والمالية (leave-finance) =====
// أنواع الإجازات (مطابقة أنواعنا المصنّفة بالكود/الاسم وإلا إنشاء) · أرصدة السنة الجارية مع تسوية المتبقي ليطابق القديم يوم النقل ·
// الإجازات المعتمدة والمعلّقة من بداية السنة والمستقبلية (+ مرفقاتها) · السلف/القروض بأقساطها · الخصومات والمكافآت والتسويات
// والمستحقات المعلّقة للمسيرات القادمة كقيود employee_obligations.
// كتابة مباشرة بـTypeORM (بلا خدمات تحقق ولا عزل فروع). المبالغ نصوص عشرية (سنتات BigInt) لا تمر عبر float.
// المرجع: scratchpad/migration/mapping-leave-finance.md — مُكيّف لشكل Resources في الـAPI القديم.

import * as fs from 'fs'
import * as path from 'path'
import { randomUUID } from 'crypto'
import type { EntityManager } from 'typeorm'
import { readRaw, rawFilePath, type Ctx, type Source } from './framework'
import { Employee } from '../../src/employees/employee.entity'
import { Branch } from '../../src/org/entities/branch.entity'
import { Department } from '../../src/org/entities/department.entity'
import { Team } from '../../src/org/entities/team.entity'
import { Leave, LeaveBalance, LeaveBalanceAdjustment, LeaveType } from '../../src/requests/entities/leave.entities'
import { EmployeeObligation, Loan, LoanInstallment } from '../../src/requests/entities/financial.entities'
import { Request } from '../../src/requests/entities/request.entity'
import { RequestAttachment } from '../../src/requests/entities/request-attachment.entity'
import { RequestType } from '../../src/requests/entities/request-type.entity'
import { RequestsConfig } from '../../src/requests/entities/requests-config.entity'
import { ApprovalChain } from '../../src/requests/entities/approval-chain.entity'
import { ApprovalStep } from '../../src/requests/entities/approval-step.entity'
import { StoredFile } from '../../src/files/stored-file.entity'
import { uploadsRoot } from '../../src/files/storage'
import { LeaveBalancesService } from '../../src/requests/leave-balances.service'
import { ApproverResolver, type ResolvedStep } from '../../src/requests/approver-resolver.service'
import { localDateOf } from '../../src/attendance/attendance.service'

const YEAR = new Date().getFullYear()

export const DOMAIN = 'leave-finance'
export const DEPENDS_ON: string[] = ['org', 'employees']

// المسارات من app/Modules/{Leave,Payroll,Employee}/Routes/api.php. مفاتيح lf-* خاصة بهذا المجال (لا تتعارض مع تعريفات مجالات أخرى).
export const SOURCES: Source[] = [
  // قائمة الموظفين تستبعد المؤرشفين افتراضيًا → قائمتان (الأرقام الوظيفية للربط + فروع/أقسام التوزيع الجماعي)
  { key: 'lf-employees', path: 'employees', paginated: true, params: { per_page: 100 } },
  { key: 'lf-employees-archived', path: 'employees', paginated: true, params: { per_page: 100, status: 'archived' } },
  { key: 'lf-leave-types', path: 'leaves/types', paginated: true, params: { per_page: 100 } },
  // LeaveBalanceResource: entitled/used/adjusted/carried/remaining + available_days (= المتاح الفعلي مع الطبقات الافتتاحية السارية)
  { key: 'lf-leave-balances', path: 'leaves/balance/{id}', each: { from: 'lf-employees' }, params: { year: YEAR } },
  { key: 'lf-leave-opening-lots', path: 'leaves/opening-balances/{id}', each: { from: 'lf-employees' }, params: { year: YEAR } },
  // date_from يفلتر start_date ≥ — شهر قبل السنة لالتقاط الإجازات العابرة لرأس السنة (تُصفّى بـend_date هنا)
  { key: 'lf-leaves', path: 'leaves', paginated: true, params: { per_page: 100, date_from: `${YEAR - 1}-12-01` } },
  // التنزيل يحتاج معرّفين: {parent_id} = معرّف طلب الإجازة، و{id} من attachments[].id في عنصر القائمة؛ الملف raw/<key>/<attachmentId>.<ext>
  { key: 'lf-leave-attachments', path: 'leaves/{parent_id}/attachments/{id}/download', each: { from: 'lf-leaves', idField: 'attachments[].id' }, binary: true },
  { key: 'lf-payroll-runs', path: 'payroll/runs', paginated: true },
  { key: 'lf-loans', path: 'payroll/loans', paginated: true },
  // القائمة بلا أقساط — التفاصيل تحمل installments
  { key: 'lf-loan-details', path: 'payroll/loans/{id}', each: { from: 'lf-loans' } },
  { key: 'lf-deduction-types', path: 'payroll/deduction-types', paginated: true },
  { key: 'lf-employee-deductions', path: 'payroll/employees/{id}/deductions', each: { from: 'lf-employees' } },
  { key: 'lf-employee-obligations', path: 'payroll/employees/{id}/obligations', each: { from: 'lf-employees' } },
  { key: 'lf-bonuses', path: 'payroll/bonuses', paginated: true },
  // يرجع paginator خام (current_page/data على المستوى الأعلى) — يُفك هنا بـflattenPaginator
  { key: 'lf-payroll-adjustments', path: 'payroll/adjustments', paginated: true, params: { per_page: 100 } },
  { key: 'lf-scoped-compensations', path: 'payroll/scoped-compensations' },
]

// ===================== أدوات =====================

type Any = Record<string, any>

const str = (v: unknown): string | null => {
  if (v == null) return null
  const s = String(v).trim()
  return s ? s : null
}
const clip = (v: unknown, max: number): string | null => {
  const s = str(v)
  return s == null ? null : s.length > max ? s.slice(0, max) : s
}
const dateKey = (v: unknown): string | null => {
  const s = String(v ?? '').slice(0, 10)
  return /^\d{4}-\d{2}-\d{2}$/.test(s) && !Number.isNaN(Date.parse(`${s}T00:00:00Z`)) ? s : null
}
const dateTime = (v: unknown): Date | null => {
  if (v == null || v === '') return null
  const d = new Date(String(v))
  return Number.isNaN(d.getTime()) ? null : d
}
const bool = (v: unknown): boolean => v === true || v === 1 || v === '1' || v === 'true'
const num = (v: unknown): number => {
  const n = Number(v)
  return Number.isFinite(n) ? n : 0
}
const round2 = (n: number) => Math.round(n * 100) / 100

// ----- المال: سنتات BigInt من نص/رقم JSON، تقريب نصف لأعلى -----
function cents(v: unknown): bigint | null {
  if (v == null || v === '') return null
  const s = typeof v === 'number' ? (Number.isFinite(v) ? v.toFixed(3) : '') : String(v).trim()
  const m = /^(-)?(\d+)(?:\.(\d*))?$/.exec(s)
  if (!m) return null
  const frac = (m[3] ?? '').padEnd(3, '0')
  let c = BigInt(m[2]) * 100n + BigInt(frac.slice(0, 2))
  if (Number(frac[2]) >= 5) c += 1n
  return m[1] ? -c : c
}
const money = (c: bigint): string => {
  const neg = c < 0n
  const a = neg ? -c : c
  return `${neg ? '-' : ''}${a / 100n}.${String(a % 100n).padStart(2, '0')}`
}
const divRound = (n: bigint, d: bigint): bigint => (d === 0n ? 0n : (n * 2n + d) / (2n * d))

// ----- الفترات YYYY-MM -----
const addMonths = (period: string, n: number): string => {
  const d = new Date(Date.UTC(Number(period.slice(0, 4)), Number(period.slice(5, 7)) - 1 + n, 1))
  return `${d.getUTCFullYear()}-${String(d.getUTCMonth() + 1).padStart(2, '0')}`
}
const maxPeriod = (a: string, b: string) => (a > b ? a : b)
// فترة المسير التي تحوي تاريخًا (دورة تبدأ يوم S: الفترة M = S من M-1 حتى S-1 من M)
const periodOfDate = (d: string, startDay: number) =>
  startDay > 1 && Number(d.slice(8, 10)) >= startDay ? addMonths(d.slice(0, 7), 1) : d.slice(0, 7)

// الغلاف {data,meta,links} يفكه readRaw؛ الـpaginator الخام (current_page + data) لا — يُفك هنا
const flattenPaginator = (rows: Any[]): Any[] =>
  rows.flatMap((r) => (r && typeof r === 'object' && Array.isArray(r.data) && 'current_page' in r ? r.data : [r]))

const normAr = (s: unknown) =>
  String(s ?? '')
    .replace(/[ً-ْـ]/g, '')
    .replace(/[أإآ]/g, 'ا')
    .replace(/ة/g, 'ه')
    .replace(/ى/g, 'ي')
    .replace(/^\s*(ال)?اجازه\s+/, '')
    .replace(/\s+/g, ' ')
    .trim()
    .toLowerCase()

const normCode = (v: unknown): string | null => {
  const s = str(v)?.toUpperCase()
  if (!s) return null
  const digits = /^(?:EMP)?[-_ ]?0*(\d+)$/.exec(s)
  return digits ? `EMP-${digits[1].padStart(4, '0')}` : s
}

const ensureUnique = <T>(list: T[], key: (t: T) => string): T[] => {
  const seen = new Map<string, T>()
  for (const item of list) seen.set(key(item), item) // الأحدث يغلب (الصفحات بترتيب الملفات)
  return [...seen.values()]
}

async function save<T>(em: EntityManager, entity: new () => T, row: Record<string, unknown>): Promise<T & { id: number }> {
  const repo = em.getRepository(entity)
  return (await repo.save(repo.create(row as any) as any)) as T & { id: number }
}

// ===================== التشغيل =====================

type TypeInfo = { id: number; code: string; isPaid: boolean; balanceType: string }

export async function run(ctx: Ctx): Promise<void> {
  const em = ctx.em
  const today = localDateOf(ctx.now)

  // ---------- الموظفون: القديم ← الجديد ----------
  const legacyEmployees = ensureUnique([...readRaw<Any>('lf-employees-archived'), ...readRaw<Any>('lf-employees')], (e) => String(e.id))
  const legacyEmp = new Map(legacyEmployees.map((e) => [String(e.id), e]))
  const ours: Array<{ id: number; employeeCode: string | null; branchId: number | null; basic: string | null }> = await em.query(
    'SELECT [id],[employeeCode],[branchId],CONVERT(varchar(40),[basicSalary]) AS [basic] FROM [employees]'
  )
  const byCode = new Map<string, number>()
  for (const e of ours) {
    const c = normCode(e.employeeCode)
    if (c && !byCode.has(c)) byCode.set(c, e.id)
    if (e.employeeCode && !byCode.has(e.employeeCode.toUpperCase())) byCode.set(e.employeeCode.toUpperCase(), e.id)
  }
  const ourEmp = new Map(ours.map((e) => [e.id, e]))
  const userOfEmployee = new Map<number, number>()
  for (const u of (await em.query('SELECT [id],[employeeId] FROM [users] WHERE [employeeId] IS NOT NULL ORDER BY [id]')) as Array<{ id: number; employeeId: number }>)
    if (!userOfEmployee.has(u.employeeId)) userOfEmployee.set(u.employeeId, u.id)
  const migrationUser: number | null =
    ((await em.query("SELECT TOP (1) [id] FROM [users] WHERE [role]='super_admin' ORDER BY [id]")) as Array<{ id: number }>)[0]?.id ??
    ((await em.query('SELECT TOP (1) [id] FROM [users] ORDER BY [id]')) as Array<{ id: number }>)[0]?.id ??
    null

  const orphanSeen = new Set<string>()
  const empOf = (legacyId: unknown, number?: unknown): number | undefined => {
    if (legacyId == null) return undefined
    const mapped = ctx.ids.get('employee', legacyId as string) ?? ctx.ids.get('employees', legacyId as string)
    if (mapped && ourEmp.has(mapped)) return mapped
    const raw = number ?? legacyEmp.get(String(legacyId))?.employee_number
    const code = normCode(raw)
    return (code && byCode.get(code)) || (str(raw) ? byCode.get(String(raw).trim().toUpperCase()) : undefined)
  }
  const orphan = (kind: string, legacyEmployeeId: unknown, what: string) => {
    ctx.flag('ORPHAN_EMPLOYEE', `${kind}:${String(legacyEmployeeId ?? '—')}`, `موظف غير موجود عندنا — ${what} لم يُستورد`)
    orphanSeen.add(String(legacyEmployeeId))
  }
  const userOf = (legacyUserId: unknown): number | null =>
    legacyUserId == null ? null : ctx.ids.get('user', legacyUserId as string) ?? ctx.ids.get('users', legacyUserId as string) ?? null

  // ---------- إعدادات المسير: دورة القديم وأول فترة غير مصروفة P0 ----------
  const cfgRepo = em.getRepository(RequestsConfig)
  const cfg = async (key: string) => (await cfgRepo.findOne({ where: { key } }))?.value ?? null
  const ourStartDay = Math.max(1, Math.min(28, Number(await cfg('payroll.cycle_start_day')) || 1))
  const monthlyDays = BigInt(Math.max(1, Number(await cfg('payroll.monthly_days')) || 30))

  const runs = ensureUnique(readRaw<Any>('lf-payroll-runs'), (r) => String(r.id))
  const latestRun = [...runs].filter((r) => dateKey(r.period_start)).sort((a, b) => String(b.period_start).localeCompare(String(a.period_start)))[0]
  const srcStartDay = Number(latestRun?.cycle_start_day) || (latestRun ? Number(String(latestRun.period_start).slice(8, 10)) : ourStartDay) || ourStartDay
  if (latestRun && srcStartDay !== ourStartDay)
    ctx.flag('CYCLE_START_DAY_DIFFERS', latestRun.id, `بداية دورة المسير في القديم يوم ${srcStartDay} وعندنا يوم ${ourStartDay} — الفترات محسوبة بدورة القديم`)
  const paid = runs.filter((r) => r.status === 'paid' && (r.type ?? 'regular') === 'regular' && dateKey(r.period_end))
  let P0: string
  if (paid.length) {
    const lastEnd = paid.map((r) => dateKey(r.period_end)!).sort().pop()!
    P0 = addMonths(periodOfDate(lastEnd, ourStartDay), 1)
    for (const r of runs)
      if (!['paid', 'cancelled'].includes(String(r.status)) && dateKey(r.period_end) && dateKey(r.period_end)! > lastEnd)
        ctx.flag('OPEN_RUN_AFTER_LAST_PAID', r.id, `مسير غير مصروف في القديم (${String(r.status)}) بعد آخر مسير مصروف — لم يُرحّل؛ بنوده المعلّقة موجّهة لأول فترة غير مصروفة`)
  } else {
    P0 = periodOfDate(today, ourStartDay)
    ctx.flag('NO_PAID_RUN', null, `لا يوجد مسير مصروف في القديم — أول فترة للبنود المعلّقة = الفترة الجارية ${P0}`)
  }
  ctx.count(`first-unpaid-period:${P0}`, 0)
  const srcPeriod = (d: string) => periodOfDate(d, srcStartDay)
  const srcObligationPeriod = (d: string | null) => (d ? maxPeriod(P0, srcPeriod(d)) : P0)
  // القسط يُحصَّل في القديم عندما due_date ≤ نهاية شهر بداية المسير → دورة تبدأ بعد يوم 1 = شهر الاستحقاق + 1
  const srcInstallmentPeriod = (d: string) => (srcStartDay > 1 ? addMonths(d.slice(0, 7), 1) : d.slice(0, 7))

  const types = await importLeaveTypes(ctx)
  await applyLeavePolicy(ctx, legacyEmployees)
  await importLeaves(ctx, types, empOf, orphan, userOfEmployee, ourEmp)
  await importBalances(ctx, types, empOf, orphan, migrationUser, today)
  await importLoans(ctx, empOf, orphan, P0, srcInstallmentPeriod)
  await importObligations(ctx, {
    empOf,
    orphan,
    userOf,
    legacyEmployees,
    ourEmp,
    P0,
    srcPeriod,
    srcObligationPeriod,
    monthlyDays,
  })
  if (orphanSeen.size) ctx.count('orphan-legacy-employees', orphanSeen.size)
}

// ===================== أنواع الإجازات =====================

const TYPE_SYNONYMS: Record<string, string> = {
  ANNUAL_LEAVE: 'ANNUAL', SICK_LEAVE: 'SICK', EXAMS: 'EXAM', DEATH: 'BEREAVEMENT', CONDOLENCE: 'BEREAVEMENT',
  NEWBORN: 'PATERNITY', BIRTH: 'PATERNITY', UNPAID_LEAVE: 'UNPAID', COMPENSATION: 'COMPENSATORY',
}

const paidOf = (t: Any): boolean => {
  if (t.salary_effect === 'unpaid') return false
  if (t.salary_effect === 'paid' || t.salary_effect === 'partial') return true
  return t.is_paid == null ? true : bool(t.is_paid)
}

async function importLeaveTypes(ctx: Ctx): Promise<Map<string, TypeInfo>> {
  const em = ctx.em
  const repo = em.getRepository(LeaveType)
  const existing = await repo.find()
  const used = new Set<number>()
  const out = new Map<string, TypeInfo>()
  const info = (t: LeaveType): TypeInfo => ({ id: t.id, code: t.code, isPaid: !!t.isPaid, balanceType: t.balanceType ?? 'none' })
  const source = ensureUnique(readRaw<Any>('lf-leave-types'), (t) => String(t.id))

  // الأنواع المرحّلة سابقًا (إعادة تشغيل)
  for (const t of source) {
    const mapped = ctx.ids.get('leave-type', t.id)
    const row = mapped ? existing.find((e) => e.id === mapped) : undefined
    if (row) {
      out.set(String(t.id), info(row))
      used.add(row.id)
    }
  }

  for (const t of source) {
    if (out.has(String(t.id))) continue
    const srcCode = str(t.code)?.toUpperCase().replace(/[^A-Z0-9_]/g, '_') ?? null
    const isPaid = paidOf(t)
    if (t.salary_effect === 'partial') ctx.flag('PARTIAL_PAY_TYPE', t.id, 'نوع بأجر جزئي في القديم — استُورد مدفوعًا (حدد نسبة الأجر يدويًا)')
    const free = (e: LeaveType) => !used.has(e.id)
    const byCode = (code: string | null) =>
      code ? existing.filter((e) => free(e) && e.code === code).sort((a, b) => Number(b.isActive) - Number(a.isActive))[0] : undefined
    const nameKey = normAr(t.name)
    const match =
      byCode(srcCode) ??
      byCode(srcCode ? TYPE_SYNONYMS[srcCode] ?? null : null) ??
      (nameKey ? existing.filter((e) => free(e) && normAr(e.nameAr) === nameKey).sort((a, b) => Number(b.isActive) - Number(a.isActive))[0] : undefined)

    const attachment = bool(t.requires_attachment)
      ? { attachmentRule: 'REQUIRED', attachmentTiming: 'WITH_REQUEST', requiredAttachment: 'مرفق' }
      : { attachmentRule: 'NONE' }
    const carry = num(t.carry_over_days)
    const common = {
      nameAr: clip(t.name, 200) ?? undefined,
      isPaid,
      maxDays: t.max_consecutive_days != null && num(t.max_consecutive_days) > 0 ? Math.round(num(t.max_consecutive_days)) : null,
      oncePerService: bool(t.once_per_service),
      isActive: t.is_active == null ? true : bool(t.is_active),
      ...attachment,
    }

    let row: LeaveType
    if (match) {
      const typed = match.balanceType === 'annual' || match.balanceType === 'sick'
      Object.assign(match, {
        ...common,
        nameAr: common.nameAr ?? match.nameAr,
        maxDays: common.maxDays ?? match.maxDays,
        ...(typed && (match.code === 'ANNUAL' || match.code === 'SICK')
          ? {
              annualDays: t.annual_days != null ? num(t.annual_days) : match.annualDays,
              renewalBasis: 'YEAR_START',
              carryOverEnabled: carry > 0,
              carryOverMaxDays: carry > 0 ? carry : null,
            }
          : {}),
      })
      row = await repo.save(match)
      if (!isPaid && match.category !== 'UNPAID') ctx.flag('TYPE_PAY_DIFFERS', t.id, `النوع طابق ${match.code} لكنه غير مدفوع في القديم — ضُبط غير مدفوع`)
      ctx.count('leave-type-matched')
    } else {
      const lower = str(t.code)?.toLowerCase()
      const category = lower === 'annual' ? 'ANNUAL' : lower === 'sick' ? 'SICK' : !isPaid ? 'UNPAID' : 'OCCASION'
      const balanceType = category === 'ANNUAL' ? 'annual' : category === 'SICK' ? 'sick' : 'none'
      let code = srcCode && srcCode.length <= 50 ? srcCode : null
      if (!code || existing.some((e) => e.code === code)) {
        if (!srcCode) ctx.flag('TYPE_CODE_MISSING', t.id, 'نوع بلا كود صالح — أُعطي كودًا مؤقتًا')
        code = `LEG_LT_${t.id}`
      }
      row = await save(em, LeaveType, {
        code,
        ...common,
        nameAr: common.nameAr ?? code,
        category,
        balanceType,
        annualDays: balanceType !== 'none' && t.annual_days != null ? num(t.annual_days) : null,
        renewalBasis: 'YEAR_START',
        carryOverEnabled: carry > 0,
        carryOverMaxDays: carry > 0 ? carry : null,
        countingMode: 'WORKING_DAYS',
        halfDayAllowed: true,
        noticeDays: 0,
        backdateAllowed: true,
      })
      existing.push(row)
      if (!common.nameAr) ctx.flag('TYPE_NAME_MISSING', t.id, 'نوع بلا اسم — سُمّي بالكود')
      ctx.count('leave-type-created')
    }
    if (bool(t.deducts_from_balance) && row.balanceType === 'none' && num(t.annual_days) > 0)
      ctx.flag('OWN_BALANCE_TYPE', t.id, `النوع ${row.code} له رصيد سنوي خاص في القديم (${num(t.annual_days)} يوم) — عندنا بلا رصيد؛ أرصدته غير مرحّلة`)
    if (t.applicable_gender && t.applicable_gender !== 'all')
      ctx.flag('GENDER_RESTRICTION_DROPPED', t.id, `النوع ${row.code} مقصور على جنس في القديم — القيد غير مدعوم عندنا`)
    used.add(row.id)
    out.set(String(t.id), info(row))
    ctx.ids.set('leave-type', t.id, row.id)
  }

  // الشاشة مثل القديم: أنواعنا المفعّلة بلا مقابل هناك تُعطَّل
  if (source.length) {
    for (const e of existing) {
      if (used.has(e.id) || !e.isActive) continue
      e.isActive = false
      await repo.save(e)
      ctx.flag('OUR_TYPE_DEACTIVATED', null, `نوع إجازة عندنا بلا مقابل في القديم عُطِّل: ${e.code}`)
      ctx.count('leave-type-deactivated')
    }
  }
  return out
}

// نوع إجازة محذوف في القديم ومرجوع إليه من طلب: يُنشأ معطّلًا
async function typeForLeave(ctx: Ctx, types: Map<string, TypeInfo>, item: Any): Promise<TypeInfo | null> {
  const legacyId = item.leave_type_id ?? item.leave_type?.id
  if (legacyId == null) return null
  const known = types.get(String(legacyId))
  if (known) return known
  const lt = item.leave_type ?? {}
  const repo = ctx.em.getRepository(LeaveType)
  const code = `LEG_LT_${legacyId}`
  const row =
    (await repo.findOne({ where: { code } })) ??
    (await save(ctx.em, LeaveType, {
      code,
      nameAr: clip(lt.name, 200) ?? code,
      isPaid: paidOf(lt),
      category: paidOf(lt) ? 'OCCASION' : 'UNPAID',
      balanceType: 'none',
      isActive: false,
      renewalBasis: 'YEAR_START',
      countingMode: 'WORKING_DAYS',
      noticeDays: 0,
      backdateAllowed: true,
    }))
  ctx.flag('DELETED_TYPE_IMPORTED', legacyId, 'نوع إجازة محذوف في القديم ومستخدم في طلبات — أُنشئ معطّلًا')
  ctx.ids.set('leave-type', legacyId, row.id)
  const inf = { id: row.id, code: row.code, isPaid: !!row.isPaid, balanceType: row.balanceType ?? 'none' }
  types.set(String(legacyId), inf)
  return inf
}

// إعدادات الإجازات العامة من النوعين السنوي والمرضي + طريقة الاستحقاق الغالبة
async function applyLeavePolicy(ctx: Ctx, legacyEmployees: Any[]): Promise<void> {
  const repo = ctx.em.getRepository(RequestsConfig)
  const set = async (key: string, value: string) => {
    await repo.save(repo.create({ key, value }))
    ctx.count('leave-config-set')
  }
  const source = readRaw<Any>('lf-leave-types')
  const annual = source.find((t) => str(t.code)?.toLowerCase() === 'annual')
  const sick = source.find((t) => str(t.code)?.toLowerCase() === 'sick')
  if (annual?.annual_days != null) await set('leave.annual_entitled', String(num(annual.annual_days)))
  if (sick?.annual_days != null) await set('leave.sick_entitled', String(num(sick.annual_days)))
  if (annual?.carry_over_days != null) await set('leave.carryover_max_days', String(num(annual.carry_over_days)))

  // accrual_method: null = استحقاق كامل أول السنة (= yearly عندنا)، monthly/daily كما هي
  const live = legacyEmployees.filter((e) => !['archived', 'terminated', 'resigned'].includes(String(e.status)))
  if (live.length && live.some((e) => 'accrual_method' in e)) {
    const modeOf = (e: Any) => (e.accrual_method === 'monthly' || e.accrual_method === 'daily' ? e.accrual_method : 'yearly')
    const tally = new Map<string, number>()
    for (const e of live) tally.set(modeOf(e), (tally.get(modeOf(e)) ?? 0) + 1)
    const mode = [...tally.entries()].sort((a, b) => b[1] - a[1])[0][0]
    await set('leave.accrual_mode', mode)
    for (const e of live) if (modeOf(e) !== mode) ctx.flag('ACCRUAL_METHOD_DIFFERS', e.id, `طريقة استحقاق الموظف تختلف عن الطريقة العامة (${mode}) — رصيد اليوم مطابق، والتراكم بعده بالطريقة العامة`)
    const annualDays = annual?.annual_days != null ? num(annual.annual_days) : null
    for (const e of live)
      if (annualDays != null && e.annual_leave_days != null && num(e.annual_leave_days) > 0 && num(e.annual_leave_days) !== annualDays)
        ctx.flag('ENTITLEMENT_OVERRIDE', e.id, 'استحقاق سنوي خاص بالموظف يختلف عن النوع — مُسوّى في رصيد هذه السنة فقط')
  }
}

// ===================== الإجازات (طلبات + سجلات + مرفقات) =====================

const STRUCTURAL = ['direct_manager_of_requester', 'department_manager_of_requester', 'branch_manager_of_requester', 'receiving_team_manager', 'specific_employee']

async function resolvePendingSteps(
  em: EntityManager,
  resolver: ApproverResolver,
  definitionCode: string,
  req: { branchId: number | null; requesterId: number; payload: Any }
): Promise<{ steps: ResolvedStep[]; unresolved: boolean } | null> {
  const type = await em.getRepository(RequestType).findOne({ where: { code: definitionCode } })
  if (!type?.approvalChainId) return null
  const global = await em.getRepository(ApprovalChain).findOne({ where: { id: type.approvalChainId } })
  if (!global) return null
  let chain = global
  if (req.branchId) {
    const branchChain = await em.getRepository(ApprovalChain).findOne({ where: { code: global.code, branchId: req.branchId, isActive: true } })
    if (branchChain) chain = branchChain
  }
  if (!chain.isActive) return null
  const steps = await em.getRepository(ApprovalStep).find({ where: { chainId: chain.id }, order: { stepOrder: 'ASC' } })
  const out: ResolvedStep[] = []
  let unresolved = false
  for (const s of steps) {
    if (s.thresholdField && s.thresholdOp) {
      const v = Number(req.payload[s.thresholdField])
      const t = Number(s.thresholdValue)
      if (Number.isNaN(v)) continue
      const ok = s.thresholdOp === '>=' ? v >= t : s.thresholdOp === '>' ? v > t : s.thresholdOp === '<' ? v < t : s.thresholdOp === '<=' ? v <= t : true
      if (!ok) continue
    }
    if (type.isConfidential && s.approverRole === 'direct_manager_of_requester') continue
    const approverEmployeeId = await resolver.resolveApproverEmployee(s.approverRole, req.requesterId, req.payload, s.specificEmployeeId)
    if (STRUCTURAL.includes(s.approverRole) && !approverEmployeeId) unresolved = true
    out.push({
      stepOrder: s.stepOrder,
      role: s.approverRole,
      approverEmployeeId,
      slaDays: s.slaDays ?? null,
      escalateTo: s.escalateTo ?? null,
      dueAt: s.slaDays ? new Date(Date.now() + s.slaDays * 86400000).toISOString() : null,
      actedAt: null,
      action: null,
    })
  }
  return { steps: out, unresolved }
}

async function importLeaves(
  ctx: Ctx,
  types: Map<string, TypeInfo>,
  empOf: (id: unknown, number?: unknown) => number | undefined,
  orphan: (kind: string, id: unknown, what: string) => void,
  userOfEmployee: Map<number, number>,
  ourEmp: Map<number, { id: number; branchId: number | null }>
): Promise<void> {
  const em = ctx.em
  const resolver = new ApproverResolver(em.getRepository(Employee), em.getRepository(Team), em.getRepository(Department), em.getRepository(Branch))
  const yearStart = `${YEAR}-01-01`
  const items = ensureUnique(readRaw<Any>('lf-leaves'), (l) => String(l.id)).sort((a, b) => num(a.id) - num(b.id))

  for (const item of items) {
    const status = String(item.status ?? '')
    if (status !== 'approved' && status !== 'pending') {
      ctx.count(`leave-skipped-${status || 'unknown'}`)
      continue
    }
    const from = dateKey(item.start_date)
    let to = dateKey(item.end_date)
    if ((to ?? from ?? '') < yearStart) {
      ctx.count('leave-skipped-before-year')
      continue
    }
    if (ctx.ids.get('leave-request', item.id)) continue
    const employeeId = empOf(item.employee_id, item.employee?.employee_number)
    if (!employeeId) {
      orphan('leave', item.employee_id, `طلب إجازة ${item.id}`)
      continue
    }
    if (!from) {
      ctx.flag('LEAVE_DATE_MISSING', item.id, 'إجازة بلا تاريخ بداية صالح — لم تُستورد')
      continue
    }
    if (!to) {
      to = from
      ctx.flag('LEAVE_DATE_MISSING', item.id, 'إجازة بلا تاريخ نهاية — اعتُبرت يومًا واحدًا')
    }
    if (to < from) ctx.flag('INVALID_RANGE', item.id, 'تاريخ النهاية قبل البداية — استُوردت كما هي')
    const type = await typeForLeave(ctx, types, item)
    if (!type) {
      ctx.flag('LEAVE_TYPE_MISSING', item.id, 'إجازة بلا نوع — لم تُستورد')
      continue
    }
    const period = item.period === 'morning' ? 'MORNING' : item.period === 'evening' ? 'EVENING' : 'FULL'
    let days = num(item.total_days)
    if (!(days > 0)) {
      const span = Math.max(1, Math.round((Date.parse(`${to}T00:00:00Z`) - Date.parse(`${from}T00:00:00Z`)) / 86400000) + 1)
      days = period === 'FULL' ? span : 0.5
      ctx.flag('DAYS_RECOMPUTED', item.id, 'عدد أيام الإجازة فارغ — حُسب بالأيام التقويمية')
    }
    const createdAt = dateTime(item.created_at) ?? new Date(`${from}T09:00:00`)
    const branchId = ourEmp.get(employeeId)?.branchId ?? null
    if (!branchId) ctx.flag('LEAVE_NO_BRANCH', item.id, 'موظف الإجازة بلا فرع — الطلب بلا فرع')
    const payload: Any = {
      leaveTypeCode: type.code,
      leaveType: type.code,
      fromDate: from,
      toDate: to,
      days,
      period,
      reason: str(item.reason),
      attachmentUrl: null,
      legacy: { id: item.id, conflictWarning: item.conflict_warning ?? null },
    }
    const base = {
      typeCode: 'LEAVE',
      definitionCode: 'LEAVE',
      requesterId: employeeId,
      createdByUserId: userOfEmployee.get(employeeId) ?? null,
      branchId,
      createdAt,
      submittedAt: createdAt,
    }

    let req: Request & { id: number }
    let leave: (Leave & { id: number }) | null = null
    if (status === 'approved') {
      req = await save(em, Request, { ...base, status: 'COMPLETED', payload: JSON.stringify(payload), resolvedSteps: '[]', completedAt: dateTime(item.approved_at) ?? createdAt })
      leave = await save(em, Leave, {
        requestId: req.id,
        employeeId,
        leaveTypeCode: type.code,
        fromDate: from,
        toDate: to,
        days: days.toFixed(2),
        period,
        isUnpaid: !type.isPaid,
        status: 'APPROVED',
      })
      req.destinationRef = `LV-${YEAR}-${String(leave.id).padStart(6, '0')}`
      await em.getRepository(Request).save(req)
      ctx.ids.set('leave', item.id, leave.id)
      ctx.count('leave-approved')
    } else {
      const resolved = await resolvePendingSteps(em, resolver, 'LEAVE', { branchId, requesterId: employeeId, payload })
      const steps = resolved?.steps ?? []
      if (!resolved) ctx.flag('PENDING_NO_CHAIN', item.id, 'طلب إجازة معلّق ولا توجد سلسلة اعتماد مفعّلة لنوع الإجازة — يحتاج قرار الموارد البشرية')
      else if (resolved.unresolved) ctx.flag('PENDING_APPROVER_UNRESOLVED', item.id, 'طلب إجازة معلّق بخطوة بلا معتمد محدد (الهيكل ناقص)')
      req = await save(em, Request, {
        ...base,
        status: steps.length ? 'UNDER_REVIEW' : 'SUBMITTED',
        currentStep: steps.length ? steps[0].stepOrder : null,
        resolvedSteps: JSON.stringify(steps),
        payload: JSON.stringify(payload),
      })
      ctx.count('leave-pending')
    }
    ctx.ids.set('leave-request', item.id, req.id)

    // المرفقات
    const attachments: Any[] = Array.isArray(item.attachments) ? item.attachments : []
    let firstRef: string | null = null
    for (const att of attachments) {
      if (att?.id == null) continue
      const mappedFile = ctx.ids.get('leave-attachment', att.id)
      if (mappedFile) {
        firstRef ??= `file:${mappedFile}`
        continue
      }
      const file = rawFilePath('lf-leave-attachments', att.id)
      if (!file) {
        ctx.flag('ATTACHMENT_MISSING', att.id, `مرفق إجازة ${item.id} غير موجود في المستخرج — الإجازة استُوردت بدونه`)
        continue
      }
      const ym = (dateKey(item.created_at) ?? from).slice(0, 7)
      const dir = path.join(uploadsRoot(), ym)
      fs.mkdirSync(dir, { recursive: true })
      const ext = (path.extname(str(att.name) ?? file.filename) || path.extname(file.path)).toLowerCase().slice(0, 10)
      const target = path.join(dir, `${randomUUID()}${ext}`)
      fs.copyFileSync(file.path, target)
      const size = fs.statSync(target).size
      const stored = await save(em, StoredFile, {
        originalName: clip(att.name, 300) ?? clip(file.filename, 300) ?? `attachment-${att.id}${ext}`,
        storedName: path.relative(uploadsRoot(), target),
        mime: clip(att.mime_type, 100) ?? clip(file.contentType, 100) ?? 'application/octet-stream',
        size,
        entityType: 'request',
        entityId: req.id,
        uploadedBy: userOfEmployee.get(employeeId) ?? null,
        employeeId,
        uploadedAt: createdAt,
      })
      await save(em, RequestAttachment, { requestId: req.id, fileRef: `file:${stored.id}`, type: 'leave_attachment' })
      ctx.ids.set('leave-attachment', att.id, stored.id)
      firstRef ??= `file:${stored.id}`
      ctx.count('leave-attachment')
    }
    if (firstRef) {
      payload.attachmentUrl = firstRef
      req.payload = JSON.stringify(payload)
      await em.getRepository(Request).save(req)
      if (leave) await em.getRepository(Leave).update({ id: leave.id }, { attachmentStatus: 'UPLOADED', attachmentRef: firstRef })
    }
  }
}

// ===================== أرصدة السنة الجارية =====================

async function importBalances(
  ctx: Ctx,
  types: Map<string, TypeInfo>,
  empOf: (id: unknown, number?: unknown) => number | undefined,
  orphan: (kind: string, id: unknown, what: string) => void,
  migrationUser: number | null,
  today: string
): Promise<void> {
  const em = ctx.em
  const period = String(YEAR)
  const service = new LeaveBalancesService(em.getRepository(LeaveBalance), em.getRepository(Employee), em.getRepository(RequestsConfig))
  const lots = readRaw<Any>('lf-leave-opening-lots').filter((l) => num(l.effective_year) === YEAR)

  type Group = { legacyEmployeeId: string; employeeId: number; balanceType: string; legacyTypeIds: Set<string>; rows: Any[] }
  const groups = new Map<string, Group>()
  const noBalanceTypeFlagged = new Set<string>()
  for (const b of ensureUnique(readRaw<Any>('lf-leave-balances'), (x) => String(x.id))) {
    if (num(b.year) !== YEAR) continue
    const legacyTypeId = b.leave_type_id ?? b.leave_type?.id
    const type = legacyTypeId != null ? types.get(String(legacyTypeId)) : undefined
    if (!type) {
      ctx.flag('BALANCE_TYPE_UNKNOWN', b.id, 'رصيد لنوع غير معروف — لم يُستورد')
      continue
    }
    if (type.balanceType !== 'annual' && type.balanceType !== 'sick') {
      if ((num(b.used_days) > 0 || num(b.adjusted_days) !== 0 || num(b.carried_over_days) > 0) && !noBalanceTypeFlagged.has(type.code)) {
        noBalanceTypeFlagged.add(type.code)
        ctx.flag('BALANCE_NOT_MIGRATED', legacyTypeId, `أرصدة النوع ${type.code} لا مقابل لها عندنا (بلا رصيد) — غير مرحّلة`)
      }
      continue
    }
    const employeeId = empOf(b.employee_id)
    if (!employeeId) {
      orphan('balance', b.employee_id, `رصيد ${b.id}`)
      continue
    }
    const key = `${employeeId}:${type.balanceType}`
    const g = groups.get(key) ?? { legacyEmployeeId: String(b.employee_id), employeeId, balanceType: type.balanceType, legacyTypeIds: new Set<string>(), rows: [] }
    g.legacyTypeIds.add(String(legacyTypeId))
    g.rows.push(b)
    groups.set(key, g)
  }

  for (const g of groups.values()) {
    const legacyKey = `${g.legacyEmployeeId}:${g.balanceType}:${period}`
    if (ctx.ids.get('leave-balance', legacyKey)) continue
    if (g.rows.length > 1) ctx.flag('BALANCE_TYPES_SUMMED', legacyKey, `أكثر من نوع في القديم على رصيد ${g.balanceType} — جُمعت`)
    const sum = (f: (b: Any) => number) => round2(g.rows.reduce((s, b) => s + f(b), 0))
    const entitled = sum((b) => num(b.entitled_days))
    const used = sum((b) => num(b.used_days))
    const adjusted = sum((b) => num(b.adjusted_days) + num(b.carried_over_days))
    const srcAvail = sum((b) => (b.available_days != null ? num(b.available_days) : num(b.remaining_days) + num(b.opening_active)))

    const own = lots.filter((l) => String(l.employee_id) === g.legacyEmployeeId && g.legacyTypeIds.has(String(l.leave_type_id)))
    const openingDays = round2(own.reduce((s, l) => s + num(l.quantity), 0))
    const openingTaken = round2(own.reduce((s, l) => s + Math.max(0, num(l.quantity) - num(l.remaining_quantity)), 0))
    const live = own.filter((l) => num(l.remaining_quantity) > 0)
    const expiries = [...new Set(live.map((l) => dateKey(l.expires_at)))]
    const openingExpiry = !live.length || expiries.includes(null) ? null : (expiries as string[]).sort()[0]
    if (expiries.length > 1) ctx.flag('MULTI_EXPIRY_LOTS', legacyKey, 'طبقات افتتاحية بتواريخ انتهاء مختلفة — اعتُمد أقربها')

    const row = await save(em, LeaveBalance, {
      employeeId: g.employeeId,
      balanceType: g.balanceType,
      period,
      entitled: entitled.toFixed(2),
      taken: round2(used + openingTaken).toFixed(2),
      openingDays: openingDays.toFixed(2),
      openingTaken: openingTaken.toFixed(2),
      openingExpiry,
      adjustmentDays: adjusted.toFixed(2),
    })
    ctx.ids.set('leave-balance', legacyKey, row.id)
    ctx.count(`leave-balance-${g.balanceType}`)
    if (srcAvail < 0) ctx.flag('NEGATIVE_BALANCE', legacyKey, 'الرصيد المتاح في القديم سالب — استُورد كما هو')

    // التسوية: المتبقي بحساب خدمتنا (قبل قصّ الصفر) = المتاح في القديم اليوم
    const view = await service.balanceOf(g.employeeId, g.balanceType, today)
    if (!view) {
      ctx.flag('BALANCE_VIEW_UNRESOLVED', legacyKey, 'تعذّر حساب الرصيد بخدمتنا (تاريخ التعيين/أساس التجديد) — بلا تسوية')
      continue
    }
    const realRemaining = round2(view.remaining - view.deficit)
    const delta = round2(srcAvail - realRemaining)
    if (Math.abs(delta) < 0.005) continue
    const after = round2(adjusted + delta)
    await em.getRepository(LeaveBalance).update({ id: row.id }, { adjustmentDays: after.toFixed(2) as unknown as number })
    if (migrationUser) {
      await save(em, LeaveBalanceAdjustment, {
        employeeId: g.employeeId,
        balanceType: g.balanceType,
        period,
        idempotencyKey: `LEGACY-${g.legacyEmployeeId}-${g.balanceType}`.slice(0, 36),
        delta: delta.toFixed(2),
        beforeAdjustment: adjusted.toFixed(2),
        afterAdjustment: after.toFixed(2),
        beforeRemaining: realRemaining.toFixed(2),
        afterRemaining: srcAvail.toFixed(2),
        reason: 'ترحيل رصيد من النظام السابق',
        actorUserId: migrationUser,
      })
    } else ctx.flag('ADJUSTMENT_LOG_SKIPPED', legacyKey, 'لا يوجد مستخدم لتسجيل تسوية الرصيد — التسوية طُبّقت بلا سجل')
    ctx.count('leave-balance-reconciled')
  }
}

// ===================== السلف والقروض =====================

async function importLoans(
  ctx: Ctx,
  empOf: (id: unknown, number?: unknown) => number | undefined,
  orphan: (kind: string, id: unknown, what: string) => void,
  P0: string,
  installmentPeriod: (due: string) => string
): Promise<void> {
  const em = ctx.em
  const details = new Map(readRaw<Any>('lf-loan-details').map((d) => [String(d.id), d]))
  const loans = ensureUnique(readRaw<Any>('lf-loans'), (l) => String(l.id)).map((l) => ({ ...l, ...(details.get(String(l.id)) ?? {}) }))
  for (const d of details.values()) if (!loans.some((l) => String(l.id) === String(d.id))) loans.push(d)

  const STATUS: Record<string, 'DISBURSED' | 'SETTLED'> = {
    active: 'DISBURSED', held: 'DISBURSED', pending_recovery: 'DISBURSED', fully_paid: 'SETTLED', closed: 'SETTLED', written_off: 'SETTLED',
  }
  for (const l of loans.sort((a, b) => num(a.id) - num(b.id))) {
    const srcStatus = String(l.status ?? '')
    if (srcStatus === 'pending' || srcStatus === 'rejected') {
      if (srcStatus === 'pending') ctx.flag('LOAN_REQUEST_PENDING', l.id, 'طلب سلفة معلّق في القديم — لم يُرحّل؛ يُقرَّر في القديم أو يُعاد تقديمه')
      ctx.count(`loan-skipped-${srcStatus}`)
      continue
    }
    const status = STATUS[srcStatus]
    if (!status) {
      ctx.flag('LOAN_STATUS_UNKNOWN', l.id, `حالة سلفة غير معروفة (${srcStatus}) — لم تُستورد`)
      continue
    }
    if (ctx.ids.get('loan', l.id)) continue
    const employeeId = empOf(l.employee_id)
    if (!employeeId) {
      orphan('loan', l.employee_id, `سلفة ${l.id}`)
      continue
    }
    if (srcStatus === 'held') ctx.flag('LOAN_HELD', l.id, 'سلفة موقوف تحصيلها في القديم — مسيرنا سيحصّلها (راجعها)')
    if (srcStatus === 'pending_recovery') ctx.flag('LOAN_PENDING_RECOVERY', l.id, 'سلفة بانتظار الاسترداد عند إنهاء الخدمة — استُوردت مصروفة')
    if (srcStatus === 'written_off') ctx.flag('LOAN_WRITTEN_OFF', l.id, 'سلفة مشطوبة — استُوردت مسددة، والأقساط المفتوحة أُغلقت')
    ctx.count(`loan-kind-${l.kind === 'loan' ? 'loan' : 'advance'}`)

    const amount = cents(l.approved_amount) ?? cents(l.total_amount)
    if (amount == null) {
      ctx.flag('LOAN_AMOUNT_MISSING', l.id, 'سلفة بلا مبلغ — لم تُستورد')
      continue
    }
    const disbursedAt = dateTime(l.disbursed_at)
    const derived = disbursedAt ?? (dateKey(l.start_date) ? new Date(`${dateKey(l.start_date)}T12:00:00`) : dateTime(l.created_at))
    if (!disbursedAt) ctx.flag('DISBURSED_AT_DERIVED', l.id, 'تاريخ الصرف غير متاح — استُخدم تاريخ البداية')

    // الأقساط: صفوف متسقة مع ثوابت readLoanInstallmentPositions (DUE بلا مسدد، PAID/SETTLED مسدد بالكامل)
    type Row = { dueDate: string; amount: bigint; state: 'DUE' | 'PAID' | 'SETTLED' }
    const rows: Row[] = []
    const installments: Any[] = Array.isArray(l.installments) ? [...l.installments] : []
    if (!details.has(String(l.id))) ctx.flag('LOAN_DETAIL_MISSING', l.id, 'تفاصيل السلفة غير مستخرجة — استُوردت بلا أقساط')
    let overdue = 0
    let remaining = 0n
    for (const i of installments.sort((a, b) => num(a.installment_number) - num(b.installment_number))) {
      const st = String(i.status ?? 'pending')
      if (st === 'cancelled' || st === 'skipped') {
        ctx.count(`loan-installment-skipped-${st}`)
        continue
      }
      let due = dateKey(i.due_date)
      if (!due) {
        const start = dateKey(l.start_date) ?? dateKey(l.created_at) ?? `${P0}-01`
        due = `${addMonths(start.slice(0, 7), Math.max(0, num(i.installment_number) - 1))}-01`
        ctx.flag('INSTALLMENT_DUE_DERIVED', i.id, 'قسط بلا تاريخ استحقاق — اشتُق من بداية السلفة')
      }
      const target = `${installmentPeriod(due)}-01`
      const amt = cents(i.amount) ?? 0n
      const paidAmt = cents(i.amount_paid) ?? 0n
      const carry = cents(i.carry_over_amount) ?? 0n
      if (st === 'paid' || st === 'settled_early') {
        const v = paidAmt > 0n ? paidAmt : amt
        if (v > 0n) rows.push({ dueDate: target, amount: v, state: st === 'paid' ? 'PAID' : 'SETTLED' })
        continue
      }
      if (st === 'waived') {
        if (amt > 0n) rows.push({ dueDate: target, amount: amt, state: 'SETTLED' })
        ctx.flag('INSTALLMENT_WAIVED', i.id, 'قسط معفى — استُورد مغلقًا')
        continue
      }
      // pending / partial / carried_over: المستحق = amount − amount_paid + carry_over
      if (carry > 0n) ctx.flag('CARRY_MERGED', i.id, 'مبلغ مرحّل من قسط سابق دُمج في هذا القسط')
      if (paidAmt > 0n) {
        rows.push({ dueDate: target, amount: paidAmt, state: 'PAID' })
        ctx.flag('PARTIAL_SPLIT', i.id, 'قسط مسدد جزئيًا — قُسم إلى جزء مسدد وجزء مستحق بنفس الشهر')
      }
      const open = amt - paidAmt + carry
      if (open <= 0n) continue
      if (status === 'SETTLED') {
        rows.push({ dueDate: target, amount: open, state: 'SETTLED' })
        if (srcStatus !== 'written_off') ctx.flag('LOAN_CLOSED_OPEN_INSTALLMENT', i.id, 'سلفة مغلقة بقسط مفتوح في القديم — أُغلق القسط')
        continue
      }
      rows.push({ dueDate: target, amount: open, state: 'DUE' })
      remaining += open
      if (target.slice(0, 7) < P0) overdue++
    }
    if (overdue) ctx.flag('OVERDUE_AT_CUTOVER', l.id, `${overdue} قسط مستحق قبل أول فترة غير مصروفة (${P0}) — متأخر عند النقل`)
    if (status === 'DISBURSED') {
      const expected = cents(l.remaining_balance)
      if (expected != null && expected !== remaining)
        ctx.flag('LOAN_BALANCE_MISMATCH', l.id, `مجموع الأقساط المستحقة ${money(remaining)} ≠ الرصيد المتبقي في القديم ${money(expected)}`)
      if (!rows.some((r) => r.state === 'DUE')) ctx.flag('LOAN_ACTIVE_NO_DUE', l.id, 'سلفة نشطة بلا أقساط مستحقة')
    }

    const exceptional = bool(l.is_exceptional)
    const category = ({ medical: 'MEDICAL', family: 'FAMILY', study: 'EDUCATION', other: 'OTHER' } as Record<string, string>)[String(l.reason_category)] ?? (exceptional ? 'OTHER' : null)
    const firstPeriod = rows.map((r) => r.dueDate.slice(0, 7)).sort()[0] ?? null
    const loan = await save(em, Loan, {
      requestId: null,
      employeeId,
      amount: money(amount),
      status,
      disbursedAt: derived,
      requestedAmount: money(cents(l.requested_amount) ?? cents(l.total_amount) ?? amount),
      isExceptional: exceptional,
      exceptionalCategory: exceptional ? category : null,
      exceptionalReason: exceptional ? clip(l.reason, 500) : null,
      firstInstallmentPeriod: firstPeriod,
      installmentMonths: l.installment_count != null ? Math.round(num(l.installment_count)) : rows.length || null,
      capSnapshot: l.cap_snapshot != null ? JSON.stringify(l.cap_snapshot) : null,
      createdByUserId: null,
    })
    ctx.ids.set('loan', l.id, loan.id)
    ctx.count(`loan-${status.toLowerCase()}`)
    const paidAt = dateTime(l.closed_at) ?? null
    for (const r of rows) {
      await save(em, LoanInstallment, {
        loanId: loan.id,
        dueDate: r.dueDate,
        amount: money(r.amount),
        paid: r.state !== 'DUE',
        paidAmount: r.state === 'DUE' ? '0.00' : money(r.amount),
        financialStatus: r.state,
        financialRevision: 1,
        parentInstallmentId: null,
        originalDueDate: r.dueDate,
        paidAt: r.state === 'DUE' ? null : paidAt,
      })
      ctx.count(`loan-installment-${r.state.toLowerCase()}`)
    }
  }
}

// ===================== القيود المعلّقة للمسيرات القادمة =====================

const CATEGORY_AR: Record<string, string> = {
  bonus: 'مكافأة', allowance: 'بدل', expense: 'مصروفات', adjustment: 'تسوية', custody_shortfall: 'عهدة مفقودة', deduction: 'خصم',
}

async function importObligations(
  ctx: Ctx,
  o: {
    empOf: (id: unknown, number?: unknown) => number | undefined
    orphan: (kind: string, id: unknown, what: string) => void
    userOf: (id: unknown) => number | null
    legacyEmployees: Any[]
    ourEmp: Map<number, { id: number; basic: string | null }>
    P0: string
    srcPeriod: (d: string) => string
    srcObligationPeriod: (d: string | null) => string
    monthlyDays: bigint
  }
): Promise<void> {
  const em = ctx.em
  const add = async (
    key: string,
    legacyForFlag: string | number,
    row: {
      employeeId: number
      type: 'DEBIT' | 'CREDIT'
      category: string
      amount: bigint | null
      label: string | null
      status: 'PENDING' | 'SUSPENDED'
      effectiveDate: string | null
      targetPeriod: string
      sourceRef: string
      createdByUserId?: number | null
      createdAt?: Date | null
    }
  ) => {
    if (ctx.ids.get('obligation', key)) return
    if (row.amount == null || row.amount <= 0n) {
      ctx.flag('OBLIGATION_AMOUNT_INVALID', legacyForFlag, 'بند مالي بمبلغ غير صالح أو صفر — لم يُستورد')
      return
    }
    const saved = await save(em, EmployeeObligation, {
      employeeId: row.employeeId,
      type: row.type,
      category: row.category.slice(0, 40),
      amount: money(row.amount),
      label: clip(row.label, 300) ?? CATEGORY_AR[row.category] ?? 'بند مرحّل',
      status: row.status,
      effectiveDate: row.effectiveDate,
      sourceRef: row.sourceRef.slice(0, 60),
      createdByUserId: row.createdByUserId ?? null,
      targetPeriod: row.targetPeriod,
      ...(row.createdAt ? { createdAt: row.createdAt } : {}),
    })
    ctx.ids.set('obligation', key, saved.id)
    ctx.count(`obligation-${key.split(':')[0]}-${row.status.toLowerCase()}`)
  }

  // 1) دفتر المديونيات/المستحقات القديم
  for (const r of ensureUnique(readRaw<Any>('lf-employee-obligations'), (x) => String(x.id))) {
    const st = String(r.status)
    if (st !== 'pending' && st !== 'suspended') {
      ctx.count(`obligation-src-skipped-${st}`)
      continue
    }
    const employeeId = o.empOf(r.employee_id)
    if (!employeeId) {
      o.orphan('obligation', r.employee_id, `بند مالي ${r.id}`)
      continue
    }
    const eff = dateKey(r.effective_date)
    const category = str(r.category) ?? 'adjustment'
    await add(`obl:${r.id}`, r.id, {
      employeeId,
      type: r.direction === 'credit' ? 'CREDIT' : 'DEBIT',
      category,
      amount: cents(r.amount),
      label: str(r.note) ?? CATEGORY_AR[category] ?? null,
      status: st === 'suspended' ? 'SUSPENDED' : 'PENDING',
      effectiveDate: eff,
      targetPeriod: o.srcObligationPeriod(eff),
      sourceRef: `legacy-obl:${r.id}`,
    })
    if (str(r.source_ref)) ctx.flag('OBLIGATION_SOURCE_REF', r.id, 'بند مرتبط بمصدر في القديم (عهدة/أصل) — المرجع القديم غير مربوط بسجلاتنا')
  }

  // 2) الخصومات المصنفة (المعتمدة غير المستهلكة + المعلّقة كـSUSPENDED)
  const dedTypes = new Map(readRaw<Any>('lf-deduction-types').map((t) => [String(t.id), t]))
  for (const d of ensureUnique(readRaw<Any>('lf-employee-deductions'), (x) => String(x.id))) {
    const st = String(d.status ?? 'approved')
    if (st !== 'approved' && st !== 'pending') {
      ctx.count(`deduction-skipped-${st}`)
      continue
    }
    if (st === 'approved' && d.is_active === false) {
      ctx.count('deduction-skipped-inactive')
      continue
    }
    const employeeId = o.empOf(d.employee_id)
    if (!employeeId) {
      o.orphan('deduction', d.employee_id, `خصم ${d.id}`)
      continue
    }
    const type = dedTypes.get(String(d.deduction_type_id))
    if (type && type.is_active === false) {
      ctx.flag('DEDUCTION_TYPE_INACTIVE', d.id, 'خصم على نوع معطّل (القديم لا يحصّله) — لم يُستورد')
      continue
    }
    const status = st === 'pending' ? 'SUSPENDED' : 'PENDING'
    if (st === 'pending') ctx.flag('DEDUCTION_UNAPPROVED', d.id, 'خصم بانتظار الاعتماد في القديم — استُورد موقوفًا (SUSPENDED) حتى قرار الموارد البشرية')
    const label = str(d.deduction_type) ?? str(type?.name_ar) ?? 'خصم'
    const createdByUserId = o.userOf(d.requested_by ?? d.created_by)
    const insts: Any[] = Array.isArray(d.installments) ? d.installments : []
    if (insts.length) {
      for (const i of insts) {
        if (String(i.status) !== 'pending') continue
        const due = dateKey(i.due_date)
        await add(`ded:${d.id}:${i.id ?? i.installment_no}`, d.id, {
          employeeId, type: 'DEBIT', category: 'deduction', amount: cents(i.amount), label, status,
          effectiveDate: due, targetPeriod: o.srcObligationPeriod(due), sourceRef: `legacy-ded:${d.id}`, createdByUserId,
        })
      }
      continue
    }
    // مبلغ ثابت، أو مجمّد يوم النقل من الراتب الأساسي
    const method = str(type?.calculation_method) ?? str(d.calculation_method) ?? 'fixed'
    let amount: bigint | null
    if (method === 'fixed') amount = cents(d.value)
    else {
      const basic = cents(o.ourEmp.get(employeeId)?.basic)
      const value = cents(d.value)
      if (basic == null || value == null) amount = null
      else if (method === 'percentage') amount = divRound(basic * value, 10000n)
      else amount = divRound(basic * value, 100n * o.monthlyDays)
      ctx.flag('AMOUNT_FROZEN_AT_CUTOVER', d.id, `خصم ${method === 'percentage' ? 'بنسبة' : 'بالأيام'} — ثُبّت مبلغًا على الراتب الأساسي الحالي`)
      if (method === 'percentage' && type?.percentage_base === 'basic_plus_allowances')
        ctx.flag('PCT_BASE_APPROX', d.id, 'نسبة من الأساسي + البدلات في القديم — حُسبت من الأساسي فقط؛ راجع المبلغ')
    }
    const eff = dateKey(d.effective_date)
    if (bool(d.is_recurring)) {
      // المسير القديم يخصمه كل فترة ما دام ساريًا — دفترنا لمرة واحدة: بند لكل فترة من أول فترة غير مصروفة حتى نهايته
      const first = o.srcObligationPeriod(eff)
      const end = dateKey(d.end_date)
      let last: string
      if (end) last = o.srcPeriod(end)
      else {
        last = addMonths(first, 11)
        ctx.flag('RECURRING_OPEN_ENDED', d.id, `خصم شهري بلا نهاية — وُلّد 12 شهرًا (${first} → ${last})`)
      }
      if (last < first) {
        ctx.count('deduction-skipped-ended')
        continue
      }
      for (let p = first, n = 1; p <= last && n <= 120; p = addMonths(p, 1), n++) {
        await add(`ded:${d.id}:${p}`, d.id, {
          employeeId, type: 'DEBIT', category: 'deduction', amount, label, status,
          effectiveDate: null, targetPeriod: p, sourceRef: `legacy-ded:${d.id}`, createdByUserId,
        })
      }
      continue
    }
    if (d.consumed_run_id != null) {
      ctx.count('deduction-skipped-consumed')
      continue
    }
    await add(`ded:${d.id}`, d.id, {
      employeeId, type: 'DEBIT', category: 'deduction', amount, label, status,
      effectiveDate: eff, targetPeriod: o.srcObligationPeriod(eff), sourceRef: `legacy-ded:${d.id}`, createdByUserId,
    })
  }

  // 3) المكافآت: pending = معتمدة بانتظار المسير؛ awaiting_approval = موقوفة حتى القرار
  for (const b of ensureUnique(readRaw<Any>('lf-bonuses'), (x) => String(x.id))) {
    const st = String(b.status)
    if (st !== 'pending' && st !== 'awaiting_approval') {
      ctx.count(`bonus-skipped-${st}`)
      continue
    }
    const employeeId = o.empOf(b.employee_id)
    if (!employeeId) {
      o.orphan('bonus', b.employee_id, `مكافأة ${b.id}`)
      continue
    }
    if (st === 'awaiting_approval') ctx.flag('BONUS_UNAPPROVED', b.id, 'مكافأة بانتظار الاعتماد في القديم — استُوردت موقوفة (SUSPENDED)')
    await add(`bonus:${b.id}`, b.id, {
      employeeId, type: 'CREDIT', category: 'bonus', amount: cents(b.amount), label: str(b.reason) ?? 'مكافأة',
      status: st === 'pending' ? 'PENDING' : 'SUSPENDED', effectiveDate: null, targetPeriod: o.P0,
      sourceRef: `legacy-bonus:${b.id}`, createdByUserId: o.userOf(b.issued_by_id), createdAt: dateTime(b.issued_at ?? b.created_at),
    })
  }

  // 4) تسويات المسير غير المطبقة
  for (const a of ensureUnique(flattenPaginator(readRaw<Any>('lf-payroll-adjustments')), (x) => String(x.id))) {
    const st = String(a.status)
    if (a.applied_at || (st !== 'approved' && st !== 'pending')) {
      ctx.count(`adjustment-skipped-${a.applied_at ? 'applied' : st}`)
      continue
    }
    const employeeId = o.empOf(a.employee_id, a.employee?.employee_number)
    if (!employeeId) {
      o.orphan('adjustment', a.employee_id, `تسوية ${a.id}`)
      continue
    }
    if (st === 'pending') ctx.flag('ADJ_UNAPPROVED', a.id, 'تسوية مسير بانتظار الاعتماد في القديم — استُوردت موقوفة (SUSPENDED)')
    await add(`adj:${a.id}`, a.id, {
      employeeId, type: String(a.direction).toUpperCase() === 'REISSUE' ? 'CREDIT' : 'DEBIT', category: 'adjustment',
      amount: cents(a.amount), label: str(a.reason) ?? 'تسوية مسير', status: st === 'approved' ? 'PENDING' : 'SUSPENDED',
      effectiveDate: null, targetPeriod: o.P0, sourceRef: `legacy-adj:${a.id}`,
    })
  }

  // 5) مكافآت/خصومات جماعية معلّقة → بند لكل موظف في النطاق يوم النقل
  const liveEmployees = o.legacyEmployees.filter((e) => !['archived', 'terminated', 'resigned'].includes(String(e.status)))
  for (const s of readRaw<Any>('lf-scoped-compensations')) {
    if (String(s.status) !== 'pending') {
      ctx.count(`scoped-skipped-${String(s.status)}`)
      continue
    }
    const scope = String(s.scope_type)
    const sid = String(s.scope_id ?? '')
    const members = liveEmployees.filter((e) =>
      scope === 'company' ? true
        : scope === 'branch' ? String(e.branch_id) === sid
          : scope === 'department' ? String(e.department_id) === sid
            : scope === 'team' ? String(e.team_id) === sid
              : scope === 'employee' ? String(e.id) === sid : false
    )
    if (!members.length) {
      ctx.flag('SCOPED_EMPTY', s.id, `بند جماعي (${scope}) بلا موظفين في نطاقه — لم يُستورد`)
      continue
    }
    ctx.flag('SCOPED_EXPANDED', s.id, `بند جماعي (${scope}) وُزّع على ${members.length} موظف`)
    const earning = s.direction === 'earning'
    for (const e of members) {
      const employeeId = o.empOf(e.id, e.employee_number)
      if (!employeeId) {
        o.orphan('scoped', e.id, `بند جماعي ${s.id}`)
        continue
      }
      await add(`scoped:${s.id}:${e.id}`, s.id, {
        employeeId, type: earning ? 'CREDIT' : 'DEBIT', category: earning ? 'bonus' : 'deduction', amount: cents(s.amount),
        label: str(s.reason) ?? (earning ? 'مكافأة جماعية' : 'خصم جماعي'), status: 'PENDING', effectiveDate: null,
        targetPeriod: o.P0, sourceRef: `legacy-scoped:${s.id}`, createdByUserId: o.userOf(s.issued_by),
      })
    }
  }
}
