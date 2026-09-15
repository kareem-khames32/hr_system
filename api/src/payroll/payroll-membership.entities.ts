import { Column, CreateDateColumn, Entity, Index, PrimaryGeneratedColumn } from 'typeorm'
import { utcDateTime } from './payroll-policy.entities'

// SPEC①: لقطة محددة للعرض والمراجعة؛ لا ننسخ سجل الموظف أو بيانات البنك والهوية.
export interface PayrollMemberSnapshot {
  version: 1
  capturedAt: string
  employeeCode: string
  fullName: string
  jobTitle?: string | null
  branchId: number | null
  departmentId: number | null
  teamId: number | null
  costCenterId: number | null
  coverFrom: string | null
  coverTo: string | null
  coverDays: number | null
  prorataFactor: number | null
  monthlyDays: number | null
  basicSalary: number | null
  allowances: number | null
  gross: number | null
  grossEarned: number | null
  branchName?: string | null
  departmentName?: string | null
  teamName?: string | null
  costCenterName?: string | null
  hireDate?: string | null
  leaveDate?: string | null
  monthlyComponents?: number[]
  earnedComponents?: number[]
  salaryComponents?: Array<{
    code: string; nameAr: string; nameEn: string; monthlyAmount: number; earnedAmount: number
  }>
  salaryMode?: string | null
  exemptDays?: number
  isAttendanceExempt?: boolean
  attendanceExemptions?: Array<{
    id: number; effectiveFrom: string; effectiveTo: string | null; terminatedFrom: string | null; reasonCode: string
    overtimeEligible: boolean; unpaidLeaveDeductible: boolean; overtimeSource: string; unpaidLeaveSource: string
  }>
  manualReason?: string
  // الخطوة 13: مصدر راتب شهر المسير (سجل شهري أو راتب ملف غير موثق في الوضع الانتقالي) أو سبب الاستبعاد.
  salarySource?: import('./payroll-run-salary').PayrollRunSalarySource | null
  salaryIssue?: { code: string; message: string } | null
  // الخطوتان 16 و17: مكان الموظف معتمد بآخر يوم في الفترة؛ من انتقل خارج النطاق أو حُجز في مسير معتمد يُحفظ سببه هنا.
  orgDate?: string | null
  orgIssues?: Array<{ code: string; message: string }>
  transferredOut?: { lastInScopeDate: string; branchId: number | null; branchName: string | null; departmentId: number | null
    departmentName: string | null; teamId: number | null; teamName: string | null } | null
  alreadyInRun?: { otherRunId: number | null; name: string | null; status: string; startDate: string; endDate: string; overlapDays: number; kind: string } | null
}

export type PayrollMembershipStatus = 'INCLUDED' | 'EXCLUDED'
export type PayrollInclusionSource = 'SCOPE' | 'MANUAL_INCLUDE'

@Entity('payroll_period_claims')
@Index('UQ_payroll_claim_active_dates', ['employeeId', 'startDate', 'endDate'], {
  unique: true, where: '[releasedAt] IS NULL',
})
export class PayrollPeriodClaim {
  @PrimaryGeneratedColumn()
  id: number

  @Column({ type: 'int' })
  employeeId: number

  @Index('IDX_payroll_claim_run')
  @Column({ type: 'int' })
  runId: number

  @Column({ type: 'date' })
  startDate: string

  @Column({ type: 'date' })
  endDate: string

  @Column({ type: 'nvarchar', length: 7 })
  periodKey: string

  @CreateDateColumn({ type: 'datetime2' })
  claimedAt: Date

  // نحفظ المطالبة المحررة للتدقيق. التقاطع غير المتطابق يحميه فحص الخدمة وقفل الموظف.
  @Column({ type: 'datetime2', nullable: true })
  releasedAt: Date | null
}

@Entity('payroll_run_events')
export class PayrollRunEvent {
  @PrimaryGeneratedColumn()
  id: number

  @Index('IDX_payroll_event_run')
  @Column({ type: 'int' })
  runId: number

  @Column({ type: 'nvarchar', length: 30 })
  eventType: string

  @Column({ type: 'int' })
  actorUserId: number

  @Column({ type: 'nvarchar', length: 500, nullable: true })
  reason: string | null

  @Column({ type: 'simple-json', nullable: true })
  payload: Record<string, unknown> | null

  // B5 (تصحيح المراجعة): الافتراضي GETDATE في حاوية SQL = ساعة UTC، ومشغل mssql يقرأ datetime2 بالتوقيت المحلي (useUTC=false)؛
  // المحوّل يعيد اللحظة الصحيحة فيطابق وقت الحدث في لوحة الأحداث وقت «احتسبه» (calculatedAt) للإجراء نفسه، دون تغيير مخطط العمود.
  @CreateDateColumn({ type: 'datetime2', transformer: utcDateTime })
  createdAt: Date
}
