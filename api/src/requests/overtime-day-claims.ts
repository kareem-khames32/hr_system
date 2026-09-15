import { BadRequestException, ConflictException } from '@nestjs/common'
import { EntityManager, In, IsNull, Not } from 'typeorm'
import type { OvertimeEvidence } from '../attendance/overtime-evidence'
import { OvertimeEntry } from './entities/attendance.entities'
import { OvertimeDayClaim, OvertimeEntryEvent } from './entities/overtime-workflow.entities'
// C8 / الخطوة 31: بند مسير عُكس صرفه بسطر منفذ لا يُحتسب فترة مالية مقفلة للموظف
import { payrollLineNotReversedSql } from '../payroll/payroll-reversal-sql'

export async function findActiveOvertimeEntries(em: EntityManager, employeeId: number, workDate: string) {
  return em.getRepository(OvertimeEntry).find({
    where: { employeeId, date: workDate, status: Not(In(['REJECTED', 'CANCELLED'])) }, order: { id: 'ASC' },
  })
}

export async function assertOvertimeDayAvailable(em: EntityManager, employeeId: number, workDate: string, exceptEntryId?: number) {
  const entries = (await findActiveOvertimeEntries(em, employeeId, workDate)).filter(entry => entry.id !== exceptEntryId)
  const claim = await em.getRepository(OvertimeDayClaim).findOneBy({ employeeId, workDate, releasedAt: IsNull() })
  if (entries.length || (claim && claim.entryId !== exceptEntryId)) {
    throw new ConflictException({ code: 'OVERTIME_DAY_ALREADY_CLAIMED', message: 'يوجد إضافي فعّال للموظف في هذا اليوم؛ راجع السجل المرتبط قبل تقديم طلب آخر', existingEntryId: entries[0]?.id ?? claim?.entryId, requestId: entries[0]?.requestId ?? null })
  }
}

function requireTransaction(em: EntityManager) {
  if (!em.queryRunner?.isTransactionActive) throw new Error('عملية حجز الإضافي تتطلب معاملة وقفل الموظف المالي')
}

// القفل المالي يملكه المستدعي قبل الطلب؛ لا نأخذه مرة أخرى داخل الحجز.
export async function claimOvertimeDay(em: EntityManager, entry: OvertimeEntry) {
  requireTransaction(em)
  await assertOvertimeDayAvailable(em, entry.employeeId, entry.date, entry.id)
  const repo = em.getRepository(OvertimeDayClaim)
  const existing = await repo.findOneBy({ entryId: entry.id, releasedAt: IsNull() })
  if (existing) {
    if (existing.employeeId !== entry.employeeId || existing.workDate !== entry.date) throw new ConflictException('حجز الإضافي لا يطابق يوم السجل')
    return existing
  }
  try {
    return await repo.save(repo.create({ employeeId: entry.employeeId, workDate: entry.date, entryId: entry.id, releasedAt: null }))
  } catch (error) {
    const detail = error as { number?: number; driverError?: { number?: number }; message?: string }
    if ([2601, 2627].includes(detail.driverError?.number ?? detail.number ?? 0) || /UQ_overtime_day_claim_active/i.test(detail.message ?? '')) {
      throw new ConflictException({ code: 'OVERTIME_DAY_ALREADY_CLAIMED', message: 'حُجز يوم الإضافي بطلب آخر بالتزامن؛ حدّث اليوم لعرض الطلب المرتبط' })
    }
    throw error
  }
}

export async function releaseOvertimeDayClaim(em: EntityManager, entryId: number) {
  requireTransaction(em)
  await em.getRepository(OvertimeDayClaim).update({ entryId, releasedAt: IsNull() }, { releasedAt: new Date() })
}

export async function appendOvertimeEvent(em: EntityManager, value: {
  entryId: number; requestId?: number | null; actorUserId?: number | null; eventType: string
  stepOrder?: number | null; reason?: string | null; payload?: Record<string, unknown> | null
}) {
  requireTransaction(em)
  const repo = em.getRepository(OvertimeEntryEvent)
  return repo.save(repo.create({ ...value, reason: value.reason?.slice(0, 500) ?? null }))
}

// هذه القيود تخص يوم التقديم؛ انتظار سلسلة الاعتماد لا يُسقط طلباً قُدم داخل المهلة.
export async function describeOvertimeSubmission(em: EntityManager, evidence: OvertimeEvidence, exceptEntryId?: number): Promise<Array<{ code: string; message: string }>> {
  const issues: Array<{ code: string; message: string }> = []
  const existing = (await findActiveOvertimeEntries(em, evidence.employeeId, evidence.workDate)).filter(entry => entry.id !== exceptEntryId)
  if (existing.length) issues.push({ code: 'OVERTIME_DAY_ALREADY_CLAIMED', message: `يوجد سجل إضافي فعّال #${existing[0].id} لهذا اليوم` })
  const today = new Date()
  const localToday = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}-${String(today.getDate()).padStart(2, '0')}`
  const age = Math.round((Date.parse(`${localToday}T00:00:00Z`) - Date.parse(`${evidence.workDate}T00:00:00Z`)) / 86400000)
  if (age > evidence.policy.backdateDays) issues.push({ code: 'OVERTIME_BACKDATE_LIMIT', message: `تجاوز يوم الطلب حد الأثر الرجعي المسموح (${evidence.policy.backdateDays} يوماً)` })
  // المسير يمسك صفه قبل القفل المالي؛ القراءة التاريخية هنا لا تنتظر صفه ولا تنشئ حجزاً مالياً.
  const closed: Array<{ period: string }> = await em.query(`SELECT DISTINCT r.[period] FROM [payroll_runs] r WITH (READUNCOMMITTED)
    WHERE r.[status] IN ('APPROVED','PAID') AND r.[endDate] >= @0 AND r.[startDate] <= @1
      AND (EXISTS (SELECT 1 FROM [payroll_items] i WITH (READUNCOMMITTED) WHERE i.[runId]=r.[id] AND i.[employeeId]=@2)
        OR EXISTS (SELECT 1 FROM [payroll_run_members] m WITH (READUNCOMMITTED) WHERE m.[runId]=r.[id] AND m.[employeeId]=@2 AND (m.[membershipStatus] IS NULL OR m.[membershipStatus]<>'EXCLUDED')))
      AND ${payrollLineNotReversedSql('r.[id]', '@2')}`,
  [evidence.workDate, localToday, evidence.employeeId])
  if (closed.length > evidence.policy.maxClosedPeriods) issues.push({ code: 'OVERTIME_CLOSED_PERIOD_LIMIT', message: `تجاوز يوم الطلب حد الفترات المالية المقفلة (${evidence.policy.maxClosedPeriods})` })
  return issues
}

export async function assertOvertimeSubmission(em: EntityManager, evidence: OvertimeEvidence, exceptEntryId?: number) {
  await assertOvertimeDayAvailable(em, evidence.employeeId, evidence.workDate, exceptEntryId)
  const issues = await describeOvertimeSubmission(em, evidence, exceptEntryId)
  if (issues.length) throw new BadRequestException({ message: issues.map(issue => issue.message).join('؛ '), issues })
}
