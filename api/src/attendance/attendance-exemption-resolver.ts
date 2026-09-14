import { BadRequestException, ConflictException } from '@nestjs/common'
import { EntityManager } from 'typeorm'
import { AttendanceExemption } from './attendance-exemption.entities'

export type AttendanceExemptionWindow = Pick<AttendanceExemption,
  'id' | 'employeeId' | 'status' | 'effectiveFrom' | 'effectiveTo' | 'terminatedFrom' |
  'overtimeEligibleOverride' | 'unpaidLeaveDeductibleOverride' | 'requiresCheckinForPresence'>

export interface AttendanceExemptionDefaults {
  overtimeEligible: boolean
  unpaidLeaveDeductible: boolean
}

export interface AttendanceExemptionDayPolicy {
  isExempt: boolean
  exemptionId: number | null
  overtimeEligible: boolean
  unpaidLeaveDeductible: boolean
  requiresCheckinForPresence: boolean
  overtimeSource: 'DEFAULT' | 'OVERRIDE' | 'NOT_EXEMPT'
  unpaidLeaveSource: 'DEFAULT' | 'OVERRIDE' | 'NOT_EXEMPT'
}

export const DEFAULT_ATTENDANCE_EXEMPTION_POLICY: Readonly<AttendanceExemptionDefaults> = Object.freeze({
  overtimeEligible: false,
  unpaidLeaveDeductible: true,
})

function dateOnly(date: string): string {
  if (typeof date !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(date) ||
    !Number.isFinite(Date.parse(`${date}T00:00:00Z`)) ||
    new Date(`${date}T00:00:00Z`).toISOString().slice(0, 10) !== date) {
    throw new BadRequestException('تاريخ نافذة استثناء الحضور غير صالح')
  }
  return date
}

function validateWindow(window: AttendanceExemptionWindow) {
  dateOnly(window.effectiveFrom)
  if (window.effectiveTo != null) dateOnly(window.effectiveTo)
  if (window.terminatedFrom != null) dateOnly(window.terminatedFrom)
  if (window.effectiveTo != null && window.effectiveTo < window.effectiveFrom) {
    throw new ConflictException(`نافذة استثناء الحضور #${window.id} تنتهي قبل بدايتها؛ راجع تاريخ القرار`)
  }
}

function includesDate(window: AttendanceExemptionWindow, date: string) {
  return window.status === 'APPROVED' && window.effectiveFrom <= date &&
    (window.effectiveTo == null || date <= window.effectiveTo) &&
    (window.terminatedFrom == null || date < window.terminatedFrom)
}

function overlapping(first: AttendanceExemptionWindow, second: AttendanceExemptionWindow) {
  const intersectionFrom = first.effectiveFrom > second.effectiveFrom ? first.effectiveFrom : second.effectiveFrom
  return includesDate(first, intersectionFrom) && includesDate(second, intersectionFrom)
}

function overlapError(first: AttendanceExemptionWindow, second: AttendanceExemptionWindow) {
  return new ConflictException({ code: 'ATTENDANCE-EXEMPTION-OVERLAP',
    message: `توجد نافذتا استثناء حضور متداخلتان #${first.id} و#${second.id}؛ راجعهما قبل حساب الحضور أو الرواتب`,
    exemptionIds: [first.id, second.id] })
}

// القراءة فقط: تضم النافذة المنتهية إذا كان جزء من تاريخها واقعًا داخل الفترة.
// فحص المنع عند الاعتماد يعاد داخل معاملة الخدمة وتحت قفل الموظف.
export async function loadAttendanceExemptions(
  em: EntityManager, employeeId: number, from: string, to: string,
): Promise<AttendanceExemption[]> {
  dateOnly(from); dateOnly(to)
  if (from > to) throw new BadRequestException('نهاية فترة استثناء الحضور تسبق بدايتها')
  if (!Number.isInteger(employeeId) || employeeId < 1 || employeeId > 2_147_483_647) {
    throw new BadRequestException('معرّف الموظف غير صالح لاستثناء الحضور')
  }
  const windows = await em.getRepository(AttendanceExemption).createQueryBuilder('exemption')
    .where('exemption.employeeId = :employeeId', { employeeId })
    .andWhere('exemption.status = :status', { status: 'APPROVED' })
    .andWhere('exemption.effectiveFrom <= :to', { to })
    .andWhere('(exemption.effectiveTo IS NULL OR exemption.effectiveTo >= :from)', { from })
    .andWhere('(exemption.terminatedFrom IS NULL OR exemption.terminatedFrom > :from)', { from })
    .orderBy('exemption.effectiveFrom', 'ASC').addOrderBy('exemption.id', 'ASC').getMany()
  for (let i = 0; i < windows.length; i++) {
    validateWindow(windows[i])
    for (let j = 0; j < i; j++) if (overlapping(windows[j], windows[i])) throw overlapError(windows[j], windows[i])
  }
  return windows
}

export function exemptionOnDate<T extends AttendanceExemptionWindow>(windows: readonly T[], date: string): T | null {
  dateOnly(date)
  let result: T | null = null
  for (const window of windows) {
    if (window.status !== 'APPROVED') continue
    validateWindow(window)
    if (!includesDate(window, date)) continue
    if (result) throw overlapError(result, window)
    result = window
  }
  return result
}

export function exemptionPolicyOnDate(
  windows: readonly AttendanceExemptionWindow[], date: string,
  defaults: Readonly<AttendanceExemptionDefaults> = DEFAULT_ATTENDANCE_EXEMPTION_POLICY,
): AttendanceExemptionDayPolicy {
  if (typeof defaults.overtimeEligible !== 'boolean' || typeof defaults.unpaidLeaveDeductible !== 'boolean') {
    throw new BadRequestException('الإعداد الافتراضي لاستثناء الحضور يجب أن يحدد استحقاق الإضافي وخصم الإجازة بلا أجر')
  }
  const window = exemptionOnDate(windows, date)
  if (!window) return { isExempt: false, exemptionId: null, overtimeEligible: true, unpaidLeaveDeductible: true,
    requiresCheckinForPresence: false, overtimeSource: 'NOT_EXEMPT', unpaidLeaveSource: 'NOT_EXEMPT' }
  return { isExempt: true, exemptionId: window.id,
    overtimeEligible: window.overtimeEligibleOverride ?? defaults.overtimeEligible,
    unpaidLeaveDeductible: window.unpaidLeaveDeductibleOverride ?? defaults.unpaidLeaveDeductible,
    requiresCheckinForPresence: window.requiresCheckinForPresence,
    overtimeSource: window.overtimeEligibleOverride == null ? 'DEFAULT' : 'OVERRIDE',
    unpaidLeaveSource: window.unpaidLeaveDeductibleOverride == null ? 'DEFAULT' : 'OVERRIDE' }
}
