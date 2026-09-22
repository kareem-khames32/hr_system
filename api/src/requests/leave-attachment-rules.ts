/**
 * مرفق الإجازة «بعد الرجوع» (قرار المالك 16 سبتمبر): نوع توقيت مرفقه AFTER_RETURN ومرفقه مطلوب بقاعدته
 * (REQUIRED، أو REQUIRED_ABOVE_DAYS والأيام فوق الحد) → الإجازة المعتمدة تبدأ PENDING حتى toDate + مهلة الأيام،
 * ثم UPLOADED بالرفع أو MISSED بعد انقضاء المهلة (وتتحول أيامها بدون راتب). حساب نقي بلا قاعدة بيانات.
 */
export const LEAVE_ATTACHMENT_STATUSES = ['PENDING', 'UPLOADED', 'MISSED'] as const
export type LeaveAttachmentStatus = typeof LEAVE_ATTACHMENT_STATUSES[number]

export interface LeaveAttachmentTypeRules {
  attachmentRule?: string | null; attachmentAboveDays?: number | null
  attachmentTiming?: string | null; attachmentDeadlineDays?: number | null
}

/** هل مرفق النوع مطلوب لهذه الإجازة بعدد أيامها؟ */
export function leaveAttachmentRequired(type: LeaveAttachmentTypeRules, days: number): boolean {
  if (type.attachmentRule === 'REQUIRED') return true
  if (type.attachmentRule === 'REQUIRED_ABOVE_DAYS') return Number(days) > Number(type.attachmentAboveDays ?? 0)
  return false
}

/** يوم + n أيام تقويمية بصيغة YYYY-MM-DD */
export function addCalendarDays(date: string, days: number): string {
  return new Date(Date.parse(`${String(date).slice(0, 10)}T12:00:00Z`) + Math.trunc(days) * 86400000).toISOString().slice(0, 10)
}

/**
 * حالة مرفق الإجازة وقت كتابتها معتمدة — حقل واحد للمسارين (leaves.attachmentRef):
 * - مرفق جاء مع الطلب (payload.attachmentUrl): UPLOADED بلا موعد — لا مهلة عليه ولا تحويل بدون راتب.
 * - نوع مرفقه «بعد الرجوع» ومطلوب: PENDING بموعد toDate + مهلة النوع (افتراضي 7)، أو UPLOADED لو أُرفق مع الطلب.
 * - غير ذلك (بلا مرفق ولا تتبع): null.
 */
export function initialLeaveAttachment(type: LeaveAttachmentTypeRules | null | undefined, leave: { toDate: string; days: number }, attachedRef?: unknown):
  { attachmentStatus: LeaveAttachmentStatus; attachmentDueDate: string | null; attachmentRef: string | null } | null {
  const ref = typeof attachedRef === 'string' && attachedRef.trim() ? attachedRef.trim().slice(0, 300) : null
  // المهلة تُتتبع لنوع «بعد الرجوع» المطلوب فقط؛ ما جاء مع الطلب يُسجَّل بلا موعد تسليم
  if (!type || type.attachmentTiming !== 'AFTER_RETURN' || !leaveAttachmentRequired(type, leave.days)) {
    return ref ? { attachmentStatus: 'UPLOADED', attachmentDueDate: null, attachmentRef: ref } : null
  }
  const configured = type.attachmentDeadlineDays == null ? NaN : Number(type.attachmentDeadlineDays)
  const deadline = Number.isInteger(configured) && configured >= 0 ? configured : 7
  const dueDate = addCalendarDays(leave.toDate, deadline)
  return ref ? { attachmentStatus: 'UPLOADED', attachmentDueDate: dueDate, attachmentRef: ref } : { attachmentStatus: 'PENDING', attachmentDueDate: dueDate, attachmentRef: null }
}

/** المهلة انقضت؟ اليوم بعد موعد التسليم (يوم الموعد نفسه ما زال مسموحًا) */
export const leaveAttachmentOverdue = (dueDate: string | null | undefined, today: string) => !!dueDate && today > String(dueDate).slice(0, 10)
