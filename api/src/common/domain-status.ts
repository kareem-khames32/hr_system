// Shared compile-time contracts only. Keep this file free of imports, runtime
// values and decorators so browser code can import these types safely.
export type EmployeeStatus = 'active' | 'probation' | 'notice_period' | 'suspended' | 'terminated' | 'archived'
export type AttendanceStatus = 'present' | 'late' | 'absent' | 'early_leave' | 'leave' | 'partial_leave' | 'holiday' | 'missing_punch' | 'mission' | 'remote' | 'exempt'
export type CustodyStatus = 'PENDING_ACK' | 'PENDING_MANAGER_CONFIRM' | 'ACTIVE' | 'RETURN_REQUESTED' | 'RETURNED' | 'TRANSFERRED' | 'LOST' | 'DAMAGED' | 'REJECTED'
export type OvertimeStatus = 'DETECTED' | 'SUBMITTED' | 'APPROVED' | 'PAID' | 'REJECTED' | 'CANCELLED'
export type LeaveStatus = 'APPROVED' | 'CANCELLED'
export type LeavePeriod = 'FULL' | 'MORNING' | 'EVENING'
export type LeaveTypeCode = string
// Catalog defaults are annual/sick/none; configured ledger codes remain valid.
export type BalanceType = 'annual' | 'sick' | 'none' | (string & {})
export type LoanStatus = 'APPROVED' | 'DISBURSED' | 'SETTLED'
// CANCELLED: ألغاه النظام (نقل مجدول مكرر لنفس الموظف — يُنفّذ الأول فقط) بسبب مسجل على طلبه
export type TransferStatus = 'SCHEDULED' | 'EXECUTED' | 'CANCELLED'
export type LetterStatus = 'GENERATED'
