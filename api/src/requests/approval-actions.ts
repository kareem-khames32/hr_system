import type { ApprovalAction } from './entities/request-approval.entity'

const actions: Record<string, ApprovalAction> = {
  APPROVE: 'APPROVED', APPPROVE: 'APPROVED', APPROVED: 'APPROVED',
  REJECT: 'REJECTED', REJECTED: 'REJECTED',
  RETURN: 'RETURNED_FOR_INFO', RETURNED_FOR_INFO: 'RETURNED_FOR_INFO',
  DELEGATED: 'DELEGATED', ESCALATED: 'ESCALATED', CANCELLED: 'CANCELLED',
}

// Compatibility at read boundaries: never rewrite immutable approval audit rows.
export const normalizeApprovalAction = (value: unknown): ApprovalAction | null =>
  typeof value === 'string' && Object.prototype.hasOwnProperty.call(actions, value) ? actions[value] : null
