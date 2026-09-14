import { statusLabels, statusStyles } from '@/data/requestsCatalog'

import type { EmployeeStatus, CustodyStatus, OvertimeStatus } from '../../api/src/common/domain-status'
export type { EmployeeStatus, CustodyStatus, OvertimeStatus } from '../../api/src/common/domain-status'
type Badge = { label: string; className: string }

export const EMPLOYEE_STATUS: Record<EmployeeStatus, Badge> = {
  active: { label: 'نشط', className: 'bg-success-50 text-success-700' },
  probation: { label: 'تحت التجربة', className: 'bg-warning-50 text-warning-700' },
  notice_period: { label: 'فترة إشعار', className: 'bg-warning-50 text-warning-700' },
  suspended: { label: 'موقوف', className: 'bg-red-100 text-red-700' },
  terminated: { label: 'منتهي الخدمة', className: 'bg-gray-100 text-gray-600' },
  archived: { label: 'مؤرشف', className: 'bg-gray-100 text-gray-600' },
}

export const CUSTODY_STATUS: Record<CustodyStatus, Badge> = {
  PENDING_ACK: { label: 'بانتظار تأكيد الموظف', className: 'bg-amber-100 text-amber-700' },
  PENDING_MANAGER_CONFIRM: { label: 'بانتظار اعتماد المدير المباشر', className: 'bg-amber-100 text-amber-700' },
  ACTIVE: { label: 'عهدة نشطة', className: 'bg-success-50 text-success-700' },
  RETURN_REQUESTED: { label: 'سلّمها الموظف — بانتظار تأكيد الاستلام', className: 'bg-indigo-100 text-indigo-700' },
  RETURNED: { label: 'مُرجعة', className: 'bg-gray-100 text-gray-600' },
  TRANSFERRED: { label: 'منقولة لموظف آخر', className: 'bg-blue-100 text-blue-700' },
  LOST: { label: 'مفقودة', className: 'bg-red-100 text-red-700' },
  DAMAGED: { label: 'تالفة', className: 'bg-red-100 text-red-700' },
  REJECTED: { label: 'رفض المستلم الاستلام', className: 'bg-red-100 text-red-700' },
}

export const OVERTIME_STATUS: Record<OvertimeStatus, Badge> = {
  DETECTED: { label: 'مكتشف — بانتظار دورة الاعتماد', className: 'bg-gray-100 text-gray-600' },
  SUBMITTED: { label: 'مُقدّم للاعتماد', className: 'bg-warning-50 text-warning-700' },
  APPROVED: { label: 'معتمد — بانتظار المسير', className: 'bg-success-50 text-success-700' },
  REJECTED: { label: 'مرفوض', className: 'bg-red-100 text-red-700' },
  CANCELLED: { label: 'ملغى', className: 'bg-gray-100 text-gray-600' },
  PAID: { label: 'مدفوع', className: 'bg-success-50 text-success-700' },
}

const labelsOf = (config: Record<string, Badge>): Record<string, string> =>
  Object.fromEntries(Object.entries(config).map(([key, value]) => [key, value.label]))
const stylesOf = (config: Record<string, Badge>): Record<string, string> =>
  Object.fromEntries(Object.entries(config).map(([key, value]) => [key, value.className]))

export const employeeStatusLabels = labelsOf(EMPLOYEE_STATUS)
export const employeeStatusStyles = stylesOf(EMPLOYEE_STATUS)
export const custodyStatusLabels = labelsOf(CUSTODY_STATUS)
export const custodyStatusStyles = stylesOf(CUSTODY_STATUS)
export const overtimeStatusLabels = labelsOf(OVERTIME_STATUS)
export const overtimeStatusStyles = stylesOf(OVERTIME_STATUS)
export const requestStatusLabels: Record<string, string> = statusLabels
export const requestStatusStyles: Record<string, string> = statusStyles
export const payMethodLabels: Record<string, string> = {
  transfer: 'تحويل بنكي', cash: 'نقدي', visa: 'بطاقة راتب', cheque: 'شيك',
}
