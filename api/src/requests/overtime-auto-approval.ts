// «اعتماد تلقائي» لفترة الإضافي المفتوحة (قرار المالك 28 سبتمبر): الإضافي المكتشف من البصمة في يوم خلص جوه فترة مفتوحة
// عليها العلامة بيتعتمد لوحده بنفس الاعتماد النهائي للطلب اليدوي (routeDetectedOvertime في requests.service). هنا النصوص
// والثوابت المشتركة بس — القرار نفسه في AttendanceService.overtimeAutoApproval والتنفيذ في RequestsService.
import { SYSTEM_APPROVAL_ROLE, type ResolvedStep } from './approver-resolver.service'

// النظام صاحب القرار: نفس اصطلاح سجلات النظام في request_approvals (approverId = 0)
export const SYSTEM_APPROVER_ID = 0
// أحداث سجل الإضافي (overtime_entry_events.eventType nvarchar(30))
export const OVERTIME_AUTO_APPROVED_EVENT = 'AUTO_APPROVED'
export const OVERTIME_AUTO_APPROVAL_FALLBACK_EVENT = 'AUTO_APPROVAL_FALLBACK'

export interface OvertimeAutoApprovalPeriod { id: number; name: string; branchId: number | null }

// الخطوة الوحيدة لطلب الإضافي المعتمد تلقائيًا — بتتسجل معتمدة في نفس المعاملة، فمفيش طلب بيفضل واقف عليها
export function systemApprovalStep(): ResolvedStep {
  return { stepOrder: 1, role: SYSTEM_APPROVAL_ROLE, approverEmployeeId: null, slaDays: null, escalateTo: null, dueAt: null, actedAt: null, action: null }
}

// تعليق قرار النظام وسبب حدث الاعتماد: «اعتماد تلقائي — فترة الإضافي «الاسم»». بيسمّي فترة «كل الفروع» أو فترة فرع الطلب
// نفسه بس — فترة فرع تاني (يوم عمل قبل نقل الموظف) مابتتسمّاش لأن اللي بيقرا الطلب ممكن يكون نطاقه فرع الطلب لوحده
export function overtimeAutoApprovalComment(periods: ReadonlyArray<OvertimeAutoApprovalPeriod>, requestBranchId: number | null): string {
  const named = periods.filter(period => period.branchId == null || period.branchId === requestBranchId).map(period => `«${period.name}»`)
  if (!named.length) return 'اعتماد تلقائي — فترة إضافي مفتوحة عليها «اعتماد تلقائي» في فرع يوم العمل'
  return `اعتماد تلقائي — ${named.length === 1 ? 'فترة الإضافي' : 'فترات الإضافي'} ${named.join('، ')}`
}

// سبب الرجوع للسلسلة: الاعتماد التلقائي اترفض بقاعدة من مسار الاعتماد نفسه (سقف، راتب شهر غير موثق، حد فترة مقفلة…)
export function overtimeAutoApprovalFallbackReason(reason: string): string {
  return `تعذّر الاعتماد التلقائي: ${reason} — الإضافي بيمشي في سلسلة الاعتماد العادية`
}
