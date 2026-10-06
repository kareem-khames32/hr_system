import { Logger } from '@nestjs/common'
import type { EntityManager } from 'typeorm'
import type { BranchScope } from '../auth/guards'
import { payrollPeriodBounds, payrollPeriodOfDate } from '../payroll/payroll-period'
import { payrollLineNotReversedSql } from '../payroll/payroll-reversal-sql'
import { HIDDEN_RUN_TEXT, payrollRunRefVisibility } from '../payroll/payroll-run-visibility'

// B2.10: قواعد فترات الخدمة وإعادة التعيين — من غير حقن خدمة.
// الفترة المفتوحة هي صف الموظف نفسه (تاريخ تعيينه)، والجدول فيه الفترات المقفولة بس.

export const EMPLOYMENT_PERIODS_MIGRATION_MISSING = 'إعادة التعيين محتاجة ترحيل 20261006_095 على قاعدة البيانات'
export const REHIRE_REASON_MIN = 5
export const REHIRE_REASON_MAX = 500
// تاريخ المباشرة الجديد بحد أقصى سنة قدام (تاريخ بسنة غلط بيخرّج الموظف من كل الحسابات)
export const REHIRE_START_MAX_DAYS_AHEAD = 366

const logger = new Logger('EmploymentPeriods')
let ready: boolean | null = null, warned = false

/** الجدول موجود (ترحيل 095)؟ الموجود بس بيتحفظ: الناقص بيتفحص مع كل نداء (قاعدة CRP2N) */
export async function employmentPeriodsReady(em: EntityManager): Promise<boolean> {
  if (ready === true) return true
  const [row] = await em.query(`SELECT CASE WHEN OBJECT_ID(N'dbo.employment_periods', N'U') IS NOT NULL THEN 1 ELSE 0 END AS [ready]`)
  ready = Number(row?.ready) === 1
  if (!ready && !warned) { warned = true; logger.warn(EMPLOYMENT_PERIODS_MIGRATION_MISSING + ' — ملف الموظف والإرجاع القديم شغالين من غيره') }
  return ready
}

/** للاختبارات: نسيان حالة الجدول */
export function resetEmploymentPeriodsCache() { ready = null; warned = false }

/** يوم حقيقي بصيغة YYYY-MM-DD بالحرف */
export function isoDay(value: unknown): string | null {
  if (typeof value !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(value)) return null
  const parsed = new Date(`${value}T00:00:00Z`)
  return !Number.isNaN(parsed.getTime()) && parsed.toISOString().slice(0, 10) === value ? value : null
}

/** يوم + عدد أيام */
export const addDaysTo = (day: string, days: number): string => new Date(Date.parse(`${day}T00:00:00Z`) + days * 86400000).toISOString().slice(0, 10)

/** مفتاح صف رصيد إجازات اتجمّد مع فترة خدمة مقفولة: مش سنة ولا تاريخ، فمفيش قارئ رصيد بيشوفه */
export const frozenBalanceKey = (periodNo: number, key: string) => `P${periodNo}:${key}`

/** آخر يوم في آخر فترة خدمة مقفولة للموظف (اتعيّن تاني بعدها)، أو null. قبل الترحيل: null */
export async function closedServiceThrough(em: EntityManager, employeeId: number): Promise<string | null> {
  if (!(await employmentPeriodsReady(em))) return null
  const [row] = await em.query(`SELECT CONVERT(varchar(10), MAX([endDate]), 23) AS [endDate] FROM dbo.employment_periods WHERE [employeeId] = @0`, [employeeId])
  return isoDay(row?.endDate ?? null)
}

export interface RehireEmployee {
  id: number
  status: string
  joinDate?: string | null
  createdAt?: Date | string | null
}

export interface RehireGate {
  /** سبب الرفض لو «إعادة تعيين» مش متاحة للموظف دلوقتي */
  blocked: { code: string; message: string } | null
  /** رقم الفترة اللي هتتقفل */
  periodNo: number
  /** بداية الفترة الحالية (تاريخ التعيين، وإلا تاريخ إنشاء الملف — نفس أساس نهاية الخدمة) */
  currentStart: string | null
  lastWorkingDay: string | null
  caseId: number | null
  exitReason: string | null
  /** أول تاريخ مباشرة مقبول: بعد آخر يوم عمل، وبعد نهاية شهر الرواتب اللي هو فيه (بالدورة، وبنهاية أي مسير بيغطّي اليوم ده). null لو الإتاحة مقفولة */
  minStartDate: string | null
  maxStartDate: string
}

const OPEN_STATUSES = ['IN_CLEARANCE', 'IN_SETTLEMENT', 'SETTLED']
const MEMBER_OF_RUN = `(EXISTS (SELECT 1 FROM dbo.payroll_items i WHERE i.[runId] = r.[id] AND i.[employeeId] = @0)
  OR EXISTS (SELECT 1 FROM dbo.payroll_run_members m WHERE m.[runId] = r.[id] AND m.[employeeId] = @0))`
const INCLUDED_IN_RUN = `(EXISTS (SELECT 1 FROM dbo.payroll_items i WHERE i.[runId] = r.[id] AND i.[employeeId] = @0)
  OR EXISTS (SELECT 1 FROM dbo.payroll_run_members m WHERE m.[runId] = r.[id] AND m.[employeeId] = @0 AND (m.[membershipStatus] IS NULL OR m.[membershipStatus] = 'INCLUDED')))`
const PENDING_RUN = 'الموظف داخل في مسير لسه مااتعتمدش بيغطّي أيام من خدمته القديمة'

/**
 * هل «إعادة تعيين» متاحة للموظف، ومن أي تاريخ؟ قراءة بس. التنفيذ بينادي عليها جوه معاملته بعد قفل مالية الموظف وصفه،
 * فالحكم على الحالة المثبتة وقتها (ملف بيتقفل أو مسير بيتحسب أو إجازة بتتعتمد في نفس اللحظة مايعدّوش بحكم أقدم).
 * scope = نطاق فروع القارئ: مرجع مسير (شهره أو نهايته) بيدخل في الرد بس لو المسير من اللي القارئ يشوفهم للموظف
 * (`payrollRunRefVisibility`، نفس قاعدة مراجع المسيرات في باقي النظام). مسير معلّق مخفي: نفس المنع من غير شهره. وحد تاريخ جاي من
 * مسير مخفي: الإتاحة نفسها بتقف للقارئ ده، فمفيش تاريخ بيتعرض ولا بيتخمّن بتجربة تواريخ.
 */
export async function rehireGate(em: EntityManager, emp: RehireEmployee, today: string, scope: BranchScope): Promise<RehireGate> {
  const [counter] = await em.query(`SELECT COALESCE(MAX([periodNo]), 0) + 1 AS [next] FROM dbo.employment_periods WHERE [employeeId] = @0`, [emp.id])
  const currentStart = isoDay(emp.joinDate ? String(emp.joinDate).slice(0, 10) : emp.createdAt ? new Date(emp.createdAt).toISOString().slice(0, 10) : null)
  const gate: RehireGate = { blocked: null, periodNo: Number(counter?.next) || 1, currentStart, lastWorkingDay: null, caseId: null, exitReason: null,
    minStartDate: null, maxStartDate: addDaysTo(today, REHIRE_START_MAX_DAYS_AHEAD) }
  const block = (code: string, message: string): RehireGate => ({ ...gate, blocked: { code, message } })
  if (!['terminated', 'archived'].includes(emp.status)) return block('REHIRE_NOT_ENDED', 'إعادة التعيين لموظف خدمته انتهت بس')
  if (!currentStart) return block('REHIRE_START_UNKNOWN', 'تاريخ تعيين الموظف الحالي مش صالح — صحّحه في ملفه الأول')
  const cases: Array<{ id: number; status: string; terminationReason: string | null; lastWorkingDay: string | null }> = await em.query(
    `SELECT [id], [status], [terminationReason], CONVERT(varchar(10), [lastWorkingDay], 23) AS [lastWorkingDay]
       FROM dbo.offboarding_cases WHERE [employeeId] = @0 AND [status] <> 'CANCELLED' ORDER BY [id]`, [emp.id])
  const open = cases.find(kase => OPEN_STATUSES.includes(kase.status))
  if (open) return block('REHIRE_OPEN_CASE', 'للموظف ملف إنهاء خدمة لسه مفتوح — اقفله قبل إعادة التعيين')
  // حالة مش معروفة = مش مقفول (القيمة المجهولة بتقفل)
  if (cases.some(kase => kase.status !== 'CLOSED')) return block('REHIRE_CASE_UNKNOWN', 'للموظف ملف إنهاء خدمة حالته مش معروفة — راجعه قبل إعادة التعيين')
  if (cases.some(kase => !isoDay(kase.lastWorkingDay))) return block('REHIRE_CASE_UNKNOWN', 'للموظف ملف إنهاء خدمة آخر يوم عمل فيه مش صالح — راجعه قبل إعادة التعيين')
  // ملف انتهى قبل بداية الفترة الحالية بتاع فترة أقدم (نفس عرف المسير والحضور)
  const current = cases.filter(kase => kase.lastWorkingDay! >= currentStart)
  if (!current.length) return block('REHIRE_NO_CLOSED_CASE',
    'إعادة التعيين لموظف خدمته انتهت بملف إنهاء مقفول ومتصفّي. الموظف ده مالوش ملف إنهاء لفترة خدمته الحالية — لو راجع يكمّل خدمته استخدم «إعادة تفعيل»')
  if (current.length > 1) return block('REHIRE_AMBIGUOUS_END', 'للموظف أكتر من ملف إنهاء لنفس فترة الخدمة — راجعهم قبل إعادة التعيين')
  const kase = current[0], lastWorkingDay = kase.lastWorkingDay!
  gate.lastWorkingDay = lastWorkingDay; gate.caseId = Number(kase.id); gate.exitReason = kase.terminationReason ?? 'resignation'

  // إجازة معتمدة بعد آخر يوم عمل (اتعتمدت في خدمته القديمة ومااتاخدتش): خصمها على رصيد الفترة اللي هتتجمّد، فإلغاؤها بعد إعادة التعيين
  // مايتعرفش يرجع على أنهي رصيد (CRP2V-B-B01). لازم تتلغى الأول، ورصيدها يرجع على خدمته القديمة
  const [future] = await em.query(`SELECT COUNT(*) AS [count] FROM dbo.leaves WHERE [employeeId] = @0 AND [status] = N'APPROVED' AND [toDate] > @1`, [emp.id, lastWorkingDay])
  if (Number(future?.count) > 0) return block('REHIRE_FUTURE_LEAVES',
    `للموظف إجازات معتمدة بعد آخر يوم عمل (${lastWorkingDay})، عددها ${Number(future.count)} — ألغها قبل إعادة التعيين عشان رصيدها يرجع على خدمته القديمة`)

  // شهر الرواتب اللي فيه آخر يوم عمل: بند واحد للموظف في مسير الشهر، وبنده اتصرف مع التصفية — المباشرة الجديدة بعده
  const [config] = await em.query(`SELECT [value] FROM dbo.requests_config WHERE [key] = N'payroll.cycle_start_day'`)
  const cycle = /^(?:[1-9]|[12][0-9]|3[01])$/.test(String(config?.value ?? '')) ? Number(config.value) : 23
  let periodEnd: string
  try { periodEnd = payrollPeriodBounds(payrollPeriodOfDate(lastWorkingDay, cycle), cycle).endDate }
  catch { return block('REHIRE_CASE_UNKNOWN', 'شهر رواتب آخر يوم عمل مش ممكن يتحدد — راجع دورة الرواتب وملف الإنهاء') }
  // مسيرات شهر آخر يوم عمل المحسومة للموظف: عادي، معتمد أو مصروف، والموظف فيه، وبنده مش معكوس (فمفيش حساب جاي يغيّر راتب أيامه الأخيرة)
  const settled: Array<{ id: number; endDate: string | null }> = await em.query(
    `SELECT r.[id], CONVERT(varchar(10), r.[endDate], 23) AS [endDate] FROM dbo.payroll_runs r
    WHERE r.[status] IN ('APPROVED', 'PAID') AND ISNULL(r.[runType], 'REGULAR') = 'REGULAR' AND r.[startDate] <= @1 AND r.[endDate] >= @1
      AND ${MEMBER_OF_RUN} AND ${payrollLineNotReversedSql('r.[id]', '@0')} ORDER BY r.[id]`, [emp.id, lastWorkingDay])
  // أي مسير بيغطّي آخر يوم عمل (فترته ممكن تعدّي نهاية الدورة): المباشرة بعد نهايته هو كمان
  const covering: Array<{ id: number; endDate: string | null }> = await em.query(
    `SELECT r.[id], CONVERT(varchar(10), r.[endDate], 23) AS [endDate] FROM dbo.payroll_runs r
    WHERE r.[status] <> 'CANCELLED' AND r.[startDate] <= @0 AND r.[endDate] >= @0 ORDER BY r.[id]`, [lastWorkingDay])
  // مسير لسه هيتحسب أو يتعاد حسابه وفيه أيام من خدمته القديمة: بعد إعادة التعيين هيستبعده وراتب الأيام دي يضيع
  const pending: Array<{ id: number; period: string | null }> = await em.query(
    `SELECT TOP (1) r.[id], r.[period] FROM dbo.payroll_runs r
      WHERE r.[status] IN ('DRAFT', 'CALCULATED') AND r.[startDate] <= @1 AND ${INCLUDED_IN_RUN} ORDER BY r.[id]`, [emp.id, lastWorkingDay])
  const bounding = [...settled, ...covering]
  const sees = await payrollRunRefVisibility(em, scope, [...bounding, ...pending].map(payrollRun => Number(payrollRun.id)), [emp.id])
  const latest = (days: Array<string | null | undefined>) => days.filter((day): day is string => !!isoDay(day)).sort().pop()!
  const dayAfter = (runs: typeof bounding) => addDaysTo(latest([lastWorkingDay, periodEnd, ...runs.map(payrollRun => payrollRun.endDate)]), 1)
  const minStartDate = dayAfter(bounding)

  // CRP2V-B-B04: شهر المسير للي يشوف المسير بس؛ لغيره نفس المنع من غير شهر ولا رقم ولا اسم
  if (pending.length) return block('REHIRE_PENDING_OLD_RUN', sees(Number(pending[0].id), emp.id)
    ? `${PENDING_RUN} (مسير شهر ${pending[0].period ?? '—'}) — اعتمده أو ألغيه قبل إعادة التعيين`
    : `${PENDING_RUN} — لازم يتعتمد أو يتلغى قبل إعادة التعيين`)
  // راتب شهر آخر يوم عمل: مسيره محسوم والموظف فيه، أو النظام مافيهوش مسير بدأ قبل اليوم ده أصلًا (ملف من قبل تشغيل الرواتب)
  if (!settled.length) {
    const payrollBefore = await em.query(`SELECT TOP (1) r.[id] FROM dbo.payroll_runs r WHERE r.[status] <> 'CANCELLED' AND r.[startDate] <= @0`, [lastWorkingDay])
    if (payrollBefore.length) return block('REHIRE_LAST_MONTH_OPEN',
      `مسير شهر آخر يوم عمل (${lastWorkingDay}) لسه مااتعتمدش أو الموظف مش فيه — راتب أيامه الأخيرة مصدره المسير ده؛ اعتمده قبل إعادة التعيين`)
  }
  // CRP2V-B-B04: الحد جاي من مسير القارئ مايشوفوش (نهايته أبعد من كل اللي شايفه): نهايته ماتتعرضش، ولا تتخمّن بتجربة تاريخ ورا تاريخ —
  // فالإتاحة نفسها بتقف للقارئ ده بسبب عام، وحساب يشوف المسير بياخد التاريخ ويكمّل
  if (dayAfter(bounding.filter(payrollRun => sees(Number(payrollRun.id), emp.id))) !== minStartDate) return block('REHIRE_HIDDEN_RUN',
    `أيام من خدمته القديمة داخلة في ${HIDDEN_RUN_TEXT} — إعادة التعيين محتاجة حساب يشوف المسير ده`)
  gate.minStartDate = minStartDate
  return gate
}

/** تاريخ المباشرة الجديد جوه الحدود؟ بيرجّع رسالة الرفض أو null */
export function rehireStartIssue(startDate: string, gate: Pick<RehireGate, 'minStartDate' | 'maxStartDate' | 'lastWorkingDay'>): { code: string; message: string } | null {
  if (!gate.minStartDate || startDate < gate.minStartDate) return { code: 'REHIRE_START_TOO_EARLY',
    message: `تاريخ المباشرة الجديد من ${gate.minStartDate ?? '—'} أو بعده: آخر يوم عمل في خدمته القديمة ${gate.lastWorkingDay ?? '—'}، وراتب شهر الرواتب اللي فيه اليوم ده اتحسب مع التصفية` }
  if (startDate > gate.maxStartDate) return { code: 'REHIRE_START_TOO_LATE', message: `تاريخ المباشرة الجديد بحد أقصى سنة قدام (${gate.maxStartDate})` }
  return null
}

/** مساحة سطر السبب في سجل الموظف */
export const HISTORY_REASON_MAX = 500
/** سطر سجل الموظف: التسمية ثم السبب. لو الاتنين أطول من مساحة السطر: السبب المكتوب لوحده كامل (مايتقصّش آخره — CRP2V-A-N01) */
export const reasonWithLabel = (label: string, reason: string): string =>
  !reason ? label : `${label} — ${reason}`.length <= HISTORY_REASON_MAX ? `${label} — ${reason}` : reason
