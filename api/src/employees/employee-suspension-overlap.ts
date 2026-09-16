import { BadRequestException } from '@nestjs/common'
import type { EntityManager } from 'typeorm'
import { dateOnly, overlappingSuspension, type SuspensionPeriod } from './employee-suspension-rules'
import { readEmployeeSuspensions } from './employee-suspensions'

// الإجازة مينفعش تتداخل مع إيقاف عن العمل (عكس «الإيقاف فوق إجازة» في employees.service).
// أيام الإيقاف = من fromDate لحد toDate الفعلي (بيتقدم عند الإنهاء المبكر)، والملغى مالوش أيام.

export const LEAVE_SUSPENSION_OVERLAP_MESSAGE = (suspension: Pick<SuspensionPeriod, 'fromDate' | 'toDate'>) =>
  `الموظف موقوف عن العمل من ${dateOnly(suspension.fromDate)} إلى ${dateOnly(suspension.toDate)} — الإجازة مينفعش تتداخل مع فترة الإيقاف`

/** رسالة الرفض لو مدى الإجازة بيتداخل مع إيقاف غير ملغى (الأقدم أولًا)، وإلا null. */
export function leaveSuspensionOverlapIssue(periods: readonly SuspensionPeriod[], fromDate: string, toDate: string): string | null {
  const ordered = [...periods].sort((a, b) => dateOnly(a.fromDate).localeCompare(dateOnly(b.fromDate)))
  const suspension = overlappingSuspension(ordered, fromDate, toDate)
  return suspension ? LEAVE_SUSPENSION_OVERLAP_MESSAGE(suspension) : null
}

/** التقديم (والموارد البشرية نيابةً) والتنفيذ عند الاعتماد: إجازة على أيام إيقاف تترفض. */
export async function assertLeaveOutsideSuspension(em: EntityManager, employeeId: number, fromDate: string, toDate: string) {
  const issue = leaveSuspensionOverlapIssue(await readEmployeeSuspensions(em, employeeId, { from: fromDate, to: toDate }), fromDate, toDate)
  if (issue) throw new BadRequestException(issue)
}
