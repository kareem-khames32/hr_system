import { PAYROLL_DECISION_KEYS } from './payroll-decision-settings'
import type { PayrollRunStatus } from './payroll.entities'

// B5 / الخطوة 22 (SRS PR-11): انتقالات حالة المسير برموز PAYRUN-STATE، وفصل المهام بين من احتسب ومن يعتمد
// مع رخصة الشركة الصغيرة الموثقة، وقيد الصرف (من صرف والقناة والمرجع). منطق نقي بلا قاعدة بيانات.

export const PAYROLL_SELF_APPROVAL_KEY = PAYROLL_DECISION_KEYS.selfApprovalAllowed
// تصحيح المراجعة: تغيير الرخصة صلاحية مستقلة لا يمنحها إلا مدير النظام (SUPER_ADMIN_ONLY_GRANTS)؛ settings.manage وحدها لا تكفي،
// وإلا احتسب حامل الاحتساب والاعتماد والإعدادات المسير وفعّل الرخصة واعتمد بنفسه ثم أعادها.
export const PAYROLL_SELF_APPROVAL_LICENCE_PERMISSION = 'payroll.self_approval_licence'

/** رفض تغيير مفتاح الرخصة لمن لا يحمل صلاحيتها المستقلة؛ null = لا مانع (مفتاح آخر أو صلاحية قائمة). */
export function payrollSelfApprovalLicenceIssue(input: { key: string; canManageLicence: boolean }) {
  if (input.key !== PAYROLL_SELF_APPROVAL_KEY || input.canManageLicence) return null
  return { code: 'PAYRUN-SOD-LICENCE-PERMISSION',
    message: 'تغيير «رخصة الشركة الصغيرة» يتطلب صلاحية مستقلة يمنحها مدير النظام فقط؛ صلاحية الإعدادات وحدها لا تفك فصل المهام بين من احتسب المسير ومن يعتمده.' }
}
export const PAYROLL_CALCULATION_EVENT_TYPES = ['CREATED', 'CALCULATED', 'RECALCULATED'] as const

export const PAYROLL_RUN_STATUS_LABELS: Record<PayrollRunStatus, string> = {
  DRAFT: 'مسودة', CALCULATED: 'محسوب', APPROVED: 'معتمد', PAID: 'مصروف', CANCELLED: 'ملغى',
}

export const PAYROLL_PAY_CHANNELS = ['BANK_TRANSFER', 'CASH', 'CHEQUE', 'MIXED'] as const
export type PayrollPayChannel = typeof PAYROLL_PAY_CHANNELS[number]
export const PAYROLL_PAY_CHANNEL_LABELS: Record<PayrollPayChannel, string> = {
  BANK_TRANSFER: 'تحويل بنكي', CASH: 'نقدًا', CHEQUE: 'شيك', MIXED: 'مختلط حسب طريقة صرف كل موظف',
}
export const PAYROLL_PAY_REFERENCE_LIMITS = Object.freeze({ min: 3, max: 100 })

const statusLabel = (status: string) => PAYROLL_RUN_STATUS_LABELS[status as PayrollRunStatus] ?? status

/** PAYRUN-STATE-001 بنص SRS: الإجراء والحالة الحالية والحالات التي يتاح فيها. */
export function payrollRunStateIssue(action: string, status: string, allowed: readonly PayrollRunStatus[]) {
  return { code: 'PAYRUN-STATE-001', currentStatus: status, allowedStatuses: [...allowed],
    message: `لا يمكن تنفيذ «${action}» والمسير في حالة «${statusLabel(status)}». الإجراء متاح في الحالات: ${allowed.map(statusLabel).join('، ')}.` }
}

/** الرخصة مفعّلة فقط بالقيمة النصية true؛ غياب المفتاح أو أي قيمة أخرى = فصل المهام مطبق. */
export const payrollSelfApprovalAllowed = (value: string | null | undefined) => value === 'true'

/** PAYRUN-STATE-003: المعتمِد هو من احتسب آخر نسخة ولا رخصة مفعّلة؛ null = لا مانع. */
export function payrollSelfApprovalIssue(input: { calculatedBy: number | null; approverId: number; selfApprovalAllowed: boolean }) {
  if (input.calculatedBy === null || input.calculatedBy !== input.approverId || input.selfApprovalAllowed) return null
  return { code: 'PAYRUN-STATE-003', calculatedBy: input.calculatedBy,
    message: 'تعذّر الاعتماد: لا يجوز أن يكون المعتمِد هو من نفّذ الاحتساب أو المراجعة. يعتمد المسير مستخدم آخر يحمل صلاحية الاعتماد، أو تُفعَّل «رخصة الشركة الصغيرة» من إعدادات المسير فيُسجل استخدامها في حدث الاعتماد.' }
}

/** قيد الصرف: قناة من القائمة ومرجع مكتوب؛ الرفض برمز ورسالة عربية. */
export function payrollPayRecordIssue(input: { channel?: unknown; reference?: unknown }): { code: string; message: string } | null {
  if (typeof input.channel !== 'string' || !(PAYROLL_PAY_CHANNELS as readonly string[]).includes(input.channel)) {
    return { code: 'PAYRUN-PAY-CHANNEL', message: `اختر قناة الصرف: ${PAYROLL_PAY_CHANNELS.map(channel => PAYROLL_PAY_CHANNEL_LABELS[channel]).join('، ')}` }
  }
  const reference = typeof input.reference === 'string' ? input.reference.trim() : ''
  if (reference.length < PAYROLL_PAY_REFERENCE_LIMITS.min || reference.length > PAYROLL_PAY_REFERENCE_LIMITS.max) {
    return { code: 'PAYRUN-PAY-REFERENCE', message: `اكتب مرجع الصرف (رقم التحويل أو الشيك أو محضر التسليم) من ${PAYROLL_PAY_REFERENCE_LIMITS.min} إلى ${PAYROLL_PAY_REFERENCE_LIMITS.max} حرف` }
  }
  return null
}

export function payrollPayRecordOf(input: { channel?: unknown; reference?: unknown }): { channel: PayrollPayChannel; reference: string } {
  return { channel: input.channel as PayrollPayChannel, reference: String(input.reference).trim() }
}
