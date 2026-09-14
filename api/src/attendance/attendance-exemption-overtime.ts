import { BadRequestException } from '@nestjs/common'
import { EntityManager } from 'typeorm'
import { RequestsConfig } from '../requests/entities/requests-config.entity'
import { exemptionPolicyOnDate, loadAttendanceExemptions } from './attendance-exemption-resolver'

// EX-11: التقديم والتنفيذ يعيدان فحص قرار الاستثناء؛ الساعات تُقر صراحةً ولا تُستنتج من البصمة.
export async function assertExemptionOvertimeAllowed(em: EntityManager, employeeId: number, date: string) {
  const windows = await loadAttendanceExemptions(em, employeeId, date, date)
  const value = (await em.getRepository(RequestsConfig).findOneBy({ key: 'payroll.exempt_overtime_eligible' }))?.value ?? 'false'
  if (!['true', 'false'].includes(value)) throw new BadRequestException('إعداد استحقاق المستثنى للإضافي غير صالح')
  const policy = exemptionPolicyOnDate(windows, date, { overtimeEligible: value === 'true', unpaidLeaveDeductible: true })
  if (policy.isExempt && !policy.overtimeEligible) throw new BadRequestException(`الموظف مستثنى من الحضور بالقرار #${policy.exemptionId} وغير مستحق للعمل الإضافي في هذا اليوم`)
  return policy
}
