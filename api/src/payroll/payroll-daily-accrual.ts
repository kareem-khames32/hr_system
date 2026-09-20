import { createHash } from 'node:crypto'
import type { EntityManager } from 'typeorm'

// أدوات تراكم المسير اليومي — بلا أي اعتماد على خدمات Nest، عشان خدمات الحضور والطلبات
// تقدر تعلّم أيام «متسخة» من غير ما تستورد موديول المسير (ولا حلقة اعتماد).

// كل يوم-موظف مخزّن، متسخ يعني: المدخلات اتغيرت بعد ما اليوم اتحسب، فالجار الليلي يعيده.
export const PAYROLL_ACCRUAL_ENABLED_KEY = 'payroll.daily_accrual_enabled'
export const PAYROLL_ACCRUAL_HOUR_KEY = 'payroll.daily_accrual_hour'
// حالات المسير اللي بيتراكم لها: المسودة والمحسوب بس؛ المعتمد والمصروف ما بيتلمسوش أبدًا
export const PAYROLL_ACCRUAL_OPEN_STATUSES = ['DRAFT', 'CALCULATED'] as const

export interface PayrollAccrualDayFacts {
  attendanceStatus: string | null
  workMinutes: number
  lateMinutes: number
  deductibleMinutes: number
  shortfallMinutes: number
  earlyLeaveMinutes: number
  overtimeMinutes: number
  overtimeAmount: number
  isAbsent: boolean
  isLeave: boolean
  isUnpaidLeave: boolean
  isSickLeave: boolean
  isSuspended: boolean
  isHolidayWork: boolean
  isExempt: boolean
  isWorkday: boolean
  earningsAmount: number
  latenessAmount: number
  shortfallAmount: number
  absenceAmount: number
  leaveAmount: number
  suspensionAmount: number
  components: Record<string, unknown>
}

// بصمة مدخلات اليوم: صف الحضور كما هو محفوظ + الإجازة والإيقاف والإضافي ودوام العطلة + أساس الأجر.
// أي تغيير في أي منها يغيّر البصمة، فاليوم يتعاد حتى لو حد نسي يعلّمه متسخ.
export function payrollAccrualInputsHash(inputs: unknown): string {
  return createHash('sha256').update(JSON.stringify(inputs ?? null)).digest('hex').slice(0, 64)
}

// المدخلات المأخوذة من صف يوم الحضور — نفس الحقول اللي بيقرأها حساب المسير، لا أكثر.
export function payrollAccrualAttendanceInput(row: {
  id?: number; status?: string | null; lateMinutes?: number | null; deductibleMinutes?: number | null
  shortfallMinutes?: number | null; earlyLeaveMinutes?: number | null; workMinutes?: number | null
  excusedMinutes?: number | null; countedWorkMinutes?: number | null; flexOutcome?: string | null
  attendanceRuleSnapshot?: unknown; computedAt?: Date | string | null
} | null | undefined) {
  if (!row) return null
  return {
    status: row.status ?? null,
    late: Number(row.lateMinutes ?? 0),
    deductible: Number(row.deductibleMinutes ?? 0),
    shortfall: Number(row.shortfallMinutes ?? 0),
    early: Number(row.earlyLeaveMinutes ?? 0),
    work: Number(row.workMinutes ?? 0),
    excused: Number(row.excusedMinutes ?? 0),
    counted: row.countedWorkMinutes == null ? null : Number(row.countedWorkMinutes),
    flex: row.flexOutcome ?? null,
    rule: row.attendanceRuleSnapshot ?? null,
  }
}

function dateList(dates: Iterable<string>): string[] {
  const out = new Set<string>()
  for (const date of dates) {
    const value = String(date).slice(0, 10)
    if (/^\d{4}-\d{2}-\d{2}$/.test(value)) out.add(value)
  }
  return [...out].sort()
}

// ===== علامة «متسخ» =====
// كتابة رخيصة جدًا: UPDATE واحد على الأيام الموجودة بس. اليوم اللي مالوش صف تراكم أصلًا
// «ناقص» — والمسير بيحسبه آخر الشهر عادي، فمش محتاج إدخال هنا.
// لا ترمي أبدًا: تعليم يوم متسخ ما يصحش يفشل اعتماد إذن أو مزامنة جهاز.
export async function markPayrollDaysDirty(
  em: EntityManager,
  employeeId: number | null | undefined,
  dates: Iterable<string>,
  reason: string
): Promise<number> {
  if (!Number.isFinite(Number(employeeId))) return 0
  const list = dateList(dates)
  if (!list.length) return 0
  try {
    let marked = 0
    // دفعات صغيرة: IN كبيرة جدًا بتكسر خطة الاستعلام
    for (let index = 0; index < list.length; index += 100) {
      const chunk = list.slice(index, index + 100)
      const placeholders = chunk.map((_value, position) => `@${position + 2}`).join(',')
      const result = await em.query(
        `UPDATE [payroll_daily_accrual] SET [isDirty] = 1, [dirtyReason] = @1, [dirtyAt] = SYSUTCDATETIME()
         WHERE [employeeId] = @0 AND [isDirty] = 0 AND CONVERT(varchar(10), [date], 23) IN (${placeholders});
         SELECT @@ROWCOUNT AS [marked];`,
        [Number(employeeId), String(reason).slice(0, 200), ...chunk]
      )
      marked += Number(result?.[0]?.marked ?? 0)
    }
    return marked
  } catch {
    // الجدول لسه ما اتعملش (ترحيل مش متطبق) أو قفل مؤقت — التراكم تحسين، مش شرط صحة
    return 0
  }
}

// مدى كامل (إيقاف، تغيير راتب، نقل) — نفس الرخص، بلا سرد الأيام
export async function markPayrollRangeDirty(
  em: EntityManager,
  employeeId: number | null | undefined,
  fromDate: string | null | undefined,
  toDate: string | null | undefined,
  reason: string
): Promise<number> {
  if (!Number.isFinite(Number(employeeId))) return 0
  const from = String(fromDate ?? '').slice(0, 10), to = String(toDate ?? '').slice(0, 10)
  if (!/^\d{4}-\d{2}-\d{2}$/.test(from) || !/^\d{4}-\d{2}-\d{2}$/.test(to) || from > to) return 0
  try {
    const result = await em.query(
      `UPDATE [payroll_daily_accrual] SET [isDirty] = 1, [dirtyReason] = @3, [dirtyAt] = SYSUTCDATETIME()
       WHERE [employeeId] = @0 AND [isDirty] = 0 AND CONVERT(varchar(10), [date], 23) BETWEEN @1 AND @2;
       SELECT @@ROWCOUNT AS [marked];`,
      [Number(employeeId), from, to, String(reason).slice(0, 200)]
    )
    return Number(result?.[0]?.marked ?? 0)
  } catch {
    return 0
  }
}

// مجموعة موظفين على نفس المدى (قرار جماعي: نقل فريق، شيل خصم، تغيير سياسة)
export async function markPayrollEmployeesDirty(
  em: EntityManager,
  employeeIds: Iterable<number>,
  fromDate: string,
  toDate: string,
  reason: string
): Promise<number> {
  let marked = 0
  for (const employeeId of new Set(employeeIds)) marked += await markPayrollRangeDirty(em, employeeId, fromDate, toDate, reason)
  return marked
}

// SQL Server بيختار طلب ضحية في الـdeadlock (1205) — نفس نمط مزامنة الأجهزة
// (withDeadlockRetry في device-sync.service): نعيد نفس اليوم لحد 3 مرات بتباعد متزايد.
export async function withPayrollAccrualDeadlockRetry<T>(fn: () => Promise<T>, attempts = 3): Promise<T> {
  for (let attempt = 1; ; attempt++) {
    try { return await fn() } catch (error: any) {
      const deadlock = error?.driverError?.number === 1205 || error?.number === 1205
      if (!deadlock || attempt >= attempts) throw error
      await new Promise(resolve => setTimeout(resolve, 500 * attempt))
    }
  }
}

// كل تواريخ مدى شاملًا طرفيه (بالتوقيت المحلي للتاريخ، بلا انزلاق UTC)
export function payrollAccrualDates(fromDate: string, toDate: string, limit = 400): string[] {
  const out: string[] = []
  const from = Date.parse(`${fromDate}T12:00:00Z`), to = Date.parse(`${toDate}T12:00:00Z`)
  if (!Number.isFinite(from) || !Number.isFinite(to)) return out
  for (let time = from; time <= to && out.length < limit; time += 86400000) out.push(new Date(time).toISOString().slice(0, 10))
  return out
}

// قرار إعادة حساب اليوم: ناقص، أو متسخ، أو بصمة مدخلاته اتغيرت، أو لسه ما خلصش (اليوم/بكرة).
// أي «لأ» هنا معناها نعيد الحساب — التراكم ما بيخاطرش أبدًا بنتيجة مختلفة.
export function payrollAccrualNeedsCompute(
  stored: { isDirty?: boolean; inputsHash?: string | null; computedAt?: Date | null } | undefined | null,
  currentHash: string,
  date: string,
  today: string
): boolean {
  if (!stored || !stored.computedAt) return true
  if (stored.isDirty) return true
  if (stored.inputsHash !== currentHash) return true
  // اليوم الجاري وما بعده لسه ممكن يتغير (بصمة انصراف لسه ما جتش)
  return date >= today
}
