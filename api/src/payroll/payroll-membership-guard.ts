import { BadRequestException, ConflictException } from '@nestjs/common'
import { EntityManager } from 'typeorm'
// C8 / الخطوة 31: بند المسير المعكوس صرفه (سطر عكس منفذ) لا يحجز الموظف؛ حجز فترته يُحرر عند التنفيذ فيُصرف بمسير تكميلي
import { payrollLineNotReversedSql } from './payroll-reversal-sql'

export interface PayrollConflictRun {
  id?: number
  startDate: string
  endDate: string
  period: string
}

export interface PayrollConflict {
  employeeId: number
  otherRunId: number
  name: string | null
  status: string
  startDate: string
  endDate: string
  overlapDays: number
  blocking: boolean
  kind: 'EXACT' | 'OVERLAP'
}

interface ConflictRow {
  employeeId: number
  otherRunId: number
  name: string | null
  status: string | null
  startDate: string
  endDate: string
}

// نترك مساحة لمعاملات الفترة؛ SQL Server يرفض أكثر من 2100 معامل في الطلب.
const ID_CHUNK_SIZE = 500
const DAY_MS = 86_400_000

function employeeIdsOf(employeeIds: number[]) {
  if (employeeIds.some(id => !Number.isInteger(id) || id < 1 || id > 2_147_483_647)) {
    throw new BadRequestException('أحد معرّفات موظفي المسير غير صالح')
  }
  return [...new Set(employeeIds)].sort((a, b) => a - b)
}

function dateTime(value: string) {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) return NaN
  const result = Date.parse(`${value}T00:00:00.000Z`)
  return Number.isFinite(result) && new Date(result).toISOString().slice(0, 10) === value
    ? result : NaN
}

function assertRun(run: PayrollConflictRun, requireId = false) {
  if (!Number.isFinite(dateTime(run.startDate)) || !Number.isFinite(dateTime(run.endDate)) ||
    run.startDate > run.endDate || !/^\d{4}-(0[1-9]|1[0-2])$/.test(run.period)) {
    throw new BadRequestException('فترة المسير غير صالحة لفحص حجز الموظفين')
  }
  if ((requireId || run.id !== undefined) &&
    (!Number.isInteger(run.id) || Number(run.id) < 1 || Number(run.id) > 2_147_483_647)) {
    throw new BadRequestException('معرّف المسير غير صالح')
  }
}

function requireTransaction(em: EntityManager) {
  if (!em.queryRunner?.isTransactionActive) {
    throw new Error('Payroll period claims require an active transaction')
  }
}

function placeholders(ids: number[], offset: number) {
  return ids.map((_, index) => `@${offset + index}`).join(', ')
}

// PR-06: القراءة تشمل العضويات القديمة والبنود، فلا يعتمد الحارس على اكتمال الهجرة.
// الاستدعاء من المعاينة لا يكتب شيئًا؛ الاعتماد يعيد الفحص تحت أقفال الموظفين.
export async function findPayrollConflicts(
  em: EntityManager, run: PayrollConflictRun, employeeIds: number[],
): Promise<PayrollConflict[]> {
  assertRun(run)
  const ids = employeeIdsOf(employeeIds)
  const found = new Map<string, PayrollConflict>()
  const add = (row: ConflictRow, activeClaim: boolean) => {
    const startDate = row.startDate
    const endDate = row.endDate
    const overlapFrom = startDate > run.startDate ? startDate : run.startDate
    const overlapTo = endDate < run.endDate ? endDate : run.endDate
    const conflict: PayrollConflict = {
      employeeId: Number(row.employeeId),
      otherRunId: Number(row.otherRunId),
      name: row.name ?? null,
      status: row.status ?? 'APPROVED',
      startDate,
      endDate,
      overlapDays: Math.round((dateTime(overlapTo) - dateTime(overlapFrom)) / DAY_MS) + 1,
      // المطالبة النشطة تظل حاجبة حتى لو كانت حالة المسير القديم غير متسقة.
      blocking: activeClaim || row.status === 'APPROVED' || row.status === 'PAID',
      kind: startDate === run.startDate && endDate === run.endDate ? 'EXACT' : 'OVERLAP',
    }
    const key = `${conflict.employeeId}:${conflict.otherRunId}:${startDate}:${endDate}`
    const previous = found.get(key)
    if (previous) previous.blocking ||= conflict.blocking
    else found.set(key, conflict)
  }

  for (let offset = 0; offset < ids.length; offset += ID_CHUNK_SIZE) {
    const chunk = ids.slice(offset, offset + ID_CHUNK_SIZE)
    const idParams = placeholders(chunk, 3)
    const params = [run.startDate, run.endDate, run.id ?? 0, ...chunk]
    const rows: ConflictRow[] = await em.query(`
      SELECT DISTINCT member.[employeeId], r.[id] AS [otherRunId], r.[name], r.[status],
        CONVERT(varchar(10), r.[startDate], 23) AS [startDate],
        CONVERT(varchar(10), r.[endDate], 23) AS [endDate]
      FROM [payroll_runs] r
      INNER JOIN (
        SELECT [employeeId], [runId] FROM [payroll_run_members]
        WHERE ([membershipStatus] = 'INCLUDED' OR [membershipStatus] IS NULL)
          AND [employeeId] IN (${idParams})
        UNION
        SELECT [employeeId], [runId] FROM [payroll_items]
        WHERE [employeeId] IN (${idParams})
      ) member ON member.[runId] = r.[id]
      WHERE r.[id] <> @2
        AND r.[status] IN ('CALCULATED', 'IN_REVIEW', 'APPROVED', 'PAID')
        AND r.[startDate] <= CONVERT(date, @1, 23)
        AND r.[endDate] >= CONVERT(date, @0, 23)
        AND ${payrollLineNotReversedSql('r.[id]', 'member.[employeeId]')}`, params)
    for (const row of rows) add(row, false)

    const claims: ConflictRow[] = await em.query(`
      SELECT c.[employeeId], c.[runId] AS [otherRunId], r.[name], r.[status],
        CONVERT(varchar(10), c.[startDate], 23) AS [startDate],
        CONVERT(varchar(10), c.[endDate], 23) AS [endDate]
      FROM [payroll_period_claims] c
      LEFT JOIN [payroll_runs] r ON r.[id] = c.[runId]
      WHERE c.[releasedAt] IS NULL AND c.[runId] <> @2
        AND c.[employeeId] IN (${idParams})
        AND c.[startDate] <= CONVERT(date, @1, 23)
        AND c.[endDate] >= CONVERT(date, @0, 23)`, params)
    for (const row of claims) add(row, true)
  }
  return [...found.values()].sort((a, b) => a.employeeId - b.employeeId ||
    a.otherRunId - b.otherRunId || a.startDate.localeCompare(b.startDate) ||
    a.endDate.localeCompare(b.endDate))
}

function isUniqueViolation(error: unknown) {
  const pending: unknown[] = [error]
  const seen = new Set<object>()
  while (pending.length) {
    const next = pending.pop()
    if (!next || typeof next !== 'object' || seen.has(next)) continue
    seen.add(next)
    const value = next as Record<string, unknown>
    if ([2601, 2627].includes(Number(value.number))) return true
    for (const key of ['driverError', 'originalError', 'info', 'cause']) pending.push(value[key])
    for (const key of ['precedingErrors', 'errors']) {
      if (Array.isArray(value[key])) pending.push(...value[key] as unknown[])
    }
  }
  return false
}

// SPEC①: الحجز عند الاعتماد فقط. المستدعي يمسك قفل المسير وأقفال الموظفين المرتبة
// داخل هذه المعاملة، ويعتمد المسير فيها؛ لا توجد هنا معاملة مستقلة أو اعتماد جزئي.
export async function claimPayrollPeriod(
  em: EntityManager, run: PayrollConflictRun & { id: number }, employeeIds: number[],
): Promise<void> {
  requireTransaction(em)
  assertRun(run, true)
  const ids = employeeIdsOf(employeeIds)
  const blocking = (await findPayrollConflicts(em, run, ids)).filter(conflict => conflict.blocking)
  if (blocking.length) {
    const affectedIds = [...new Set(blocking.map(conflict => conflict.employeeId))]
    throw new ConflictException({
      code: blocking.some(conflict => conflict.kind === 'OVERLAP') ? 'PAYRUN-DUP-002' : 'PAYRUN-DUP-001',
      message: `تعذّر اعتماد المسير: الموظف رقم ${affectedIds[0]} مرتبط بحجز أو مسير معتمد أو مصروف على فترة متداخلة؛ راجع التعارض قبل الاعتماد`,
      employeeIds: affectedIds,
    })
  }

  for (let offset = 0; offset < ids.length; offset += ID_CHUNK_SIZE) {
    const chunk = ids.slice(offset, offset + ID_CHUNK_SIZE)
    const existing: { employeeId: number; startDate: string; endDate: string; periodKey: string }[] = await em.query(`
      SELECT [employeeId], CONVERT(varchar(10), [startDate], 23) AS [startDate],
        CONVERT(varchar(10), [endDate], 23) AS [endDate], [periodKey]
      FROM [payroll_period_claims]
      WHERE [runId] = @0 AND [releasedAt] IS NULL
        AND [employeeId] IN (${placeholders(chunk, 1)})`, [run.id, ...chunk])
    if (existing.some(claim => claim.startDate !== run.startDate || claim.endDate !== run.endDate ||
      claim.periodKey !== run.period)) {
      throw new ConflictException('المسير له حجز نشط بفترة مختلفة؛ يلزم مراجعة الحجز قبل الاعتماد')
    }
    const alreadyClaimed = new Set(existing.map(claim => Number(claim.employeeId)))
    const missing = chunk.filter(id => !alreadyClaimed.has(id))
    if (!missing.length) continue
    // معاملات المسير مشتركة بين الصفوف، وعدد الصفوف أقل من حد VALUES في SQL Server.
    const values = missing.map((_, index) =>
      `(@${index + 4}, @0, CONVERT(date, @1, 23), CONVERT(date, @2, 23), @3, SYSUTCDATETIME(), NULL)`)
    try {
      await em.query(`INSERT INTO [payroll_period_claims]
        ([employeeId], [runId], [startDate], [endDate], [periodKey], [claimedAt], [releasedAt])
        VALUES ${values.join(', ')}`, [run.id, run.startDate, run.endDate, run.period, ...missing])
    } catch (error) {
      if (!isUniqueViolation(error)) throw error
      throw new ConflictException({
        code: 'PAYRUN-DUP-003',
        message: 'تعذّر اعتماد المسير: حُجزت فترة أحد موظفيه بالتزامن من مسير آخر؛ أعد تحميل المسير وراجع التعارض',
      })
    }
  }
}

// الإلغاء أو إعادة الفتح يحرر الحجز في نفس معاملة الانتقال ويحفظه للتدقيق.
export async function releasePayrollClaims(em: EntityManager, runId: number): Promise<void> {
  requireTransaction(em)
  if (!Number.isInteger(runId) || runId < 1 || runId > 2_147_483_647) {
    throw new BadRequestException('معرّف المسير غير صالح')
  }
  await em.query(`UPDATE [payroll_period_claims] SET [releasedAt] = SYSUTCDATETIME()
    WHERE [runId] = @0 AND [releasedAt] IS NULL`, [runId])
}
