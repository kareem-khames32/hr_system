import { BadRequestException } from '@nestjs/common'
import { RequestStatus } from './entities/request.entity'

// ============================================================
// State Machine الموحّدة — المصدر الوحيد لقواعد الانتقال
// DRAFT → SUBMITTED → UNDER_REVIEW → APPROVED → IN_EXECUTION → COMPLETED
//                \→ CANCELLED   \→ REJECTED / RETURNED_FOR_INFO
// RETURNED_FOR_INFO → SUBMITTED (يستكمل ويعيد التقديم)
// ============================================================

const TRANSITIONS: Record<RequestStatus, RequestStatus[]> = {
  DRAFT: ['SUBMITTED', 'CANCELLED'],
  SUBMITTED: ['UNDER_REVIEW', 'CANCELLED'],
  UNDER_REVIEW: ['APPROVED', 'REJECTED', 'RETURNED_FOR_INFO', 'CANCELLED'],
  RETURNED_FOR_INFO: ['SUBMITTED', 'CANCELLED'],
  // الاعتماد النهائي والتنفيذ معاملة واحدة (REQ-2)، فـAPPROVED الباقي = تنفيذ تعذّر
  // قبل الإصلاح: الإدارة تعيد تنفيذه أو تقفله بالرفض
  APPROVED: ['IN_EXECUTION', 'COMPLETED', 'REJECTED'],
  IN_EXECUTION: ['COMPLETED'],
  COMPLETED: [],
  REJECTED: [],
  CANCELLED: [],
}

export const canTransition = (
  from: RequestStatus,
  to: RequestStatus
): boolean => TRANSITIONS[from]?.includes(to) ?? false

// يرمي BadRequest برسالة واضحة لو الانتقال غير مسموح
export const assertTransition = (
  from: RequestStatus,
  to: RequestStatus
): void => {
  if (!canTransition(from, to)) {
    throw new BadRequestException(
      `انتقال غير مسموح: ${from} → ${to}`
    )
  }
}

// الحالات النهائية — لا رجوع منها
export const isTerminal = (status: RequestStatus): boolean =>
  TRANSITIONS[status].length === 0
