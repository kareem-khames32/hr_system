import { Column, CreateDateColumn, Entity, Index, PrimaryGeneratedColumn } from 'typeorm'

// ============ الخصومات المصنّفة (DD-01..DD-12) ============
// الكتالوج يحدد طريقة الحساب والحدود ونطاق المُنشئ وسلسلة الاعتماد؛ الطلب يُلتقط بنسخة النوع
// وسلسلته وقت الإنشاء، والقيد المالي لا يُنشأ في دفتر المديونيات إلا بعد آخر اعتماد.
// المبالغ العشرية تُقرأ من SQL Server كأرقام؛ الخدمة تحولها إلى نصوص دقيقة قبل أي حساب.

@Entity('deduction_types')
@Index('UX_deduction_types_code', ['code'], { unique: true })
export class DeductionType {
  @PrimaryGeneratedColumn({ primaryKeyConstraintName: 'PK_deduction_types' }) id: number
  @Column({ type: 'nvarchar', length: 40 }) code: string
  @Column({ type: 'nvarchar', length: 120 }) nameAr: string
  @Column({ type: 'nvarchar', length: 120, nullable: true }) nameEn: string | null
  @Column({ type: 'nvarchar', length: 20 }) category: string
  @Column({ type: 'nvarchar', length: 20 }) calcMethod: string
  @Column({ type: 'decimal', precision: 18, scale: 4, nullable: true }) defaultValue: number | string | null
  // خطوة المدخل للأيام/الساعات (مثل 0.25)؛ null = بلا خطوة
  @Column({ type: 'decimal', precision: 9, scale: 4, nullable: true }) valueStep: number | string | null
  @Column({ type: 'decimal', precision: 18, scale: 2, nullable: true }) minAmount: number | string | null
  @Column({ type: 'decimal', precision: 18, scale: 2, nullable: true }) maxAmount: number | string | null
  @Column({ type: 'decimal', precision: 9, scale: 4, nullable: true }) maxPctOfGross: number | string | null
  @Column({ type: 'bit' }) isExemptable: boolean
  @Column({ type: 'bit' }) installmentAllowed: boolean
  @Column({ type: 'int' }) maxInstallments: number
  @Column({ type: 'bit' }) requiresAttachment: boolean
  // CSV: DIRECT_MANAGER,TEAM_LEADER,DEPARTMENT_MANAGER,BRANCH_MANAGER,HR
  @Column({ type: 'nvarchar', length: 200 }) creatorScopes: string
  // CSV مرتب ينتهي دائمًا بـHR
  @Column({ type: 'nvarchar', length: 200 }) approvalSteps: string
  // تجاوز «أيام من الراتب» يضيف خطوة التصعيد؛ null = بلا تصعيد
  @Column({ type: 'decimal', precision: 9, scale: 4, nullable: true }) escalationDays: number | string | null
  @Column({ type: 'nvarchar', length: 30, nullable: true }) escalationStep: string | null
  @Column({ type: 'int' }) maxIncidentAgeDays: number
  @Column({ type: 'int' }) carryForwardPriority: number
  @Column({ type: 'int' }) version: number
  @Column({ type: 'bit' }) isActive: boolean
  // DD-01/03/04 (C2 إعادة العمل): الجهة المالكة (قسم)، والنطاق الوظيفي JSON {departmentIds,teamIds,employeeIds}،
  // ومصفوفة حد التصعيد لكل دور مُنشئ JSON {DIRECT_MANAGER:"1",...}
  @Column({ type: 'int', nullable: true }) ownerDepartmentId: number | null
  @Column({ type: 'nvarchar', length: 'MAX', nullable: true }) functionalScope: string | null
  @Column({ type: 'nvarchar', length: 'MAX', nullable: true }) basisEscalationDays: string | null
  @Column({ type: 'int', nullable: true }) updatedByUserId: number | null
  @CreateDateColumn({ type: 'datetime2', default: () => 'SYSUTCDATETIME()' }) createdAt: Date
  @Column({ type: 'datetime2', nullable: true }) updatedAt: Date | null
}

export type DeductionRequestStatus = 'IN_APPROVAL' | 'APPROVED' | 'REJECTED' | 'WITHDRAWN' | 'CANCELLED'

@Entity('deduction_requests')
@Index('IX_deduction_requests_employee', ['employeeId'])
@Index('IX_deduction_requests_status', ['status'])
@Index('IX_deduction_requests_batch', ['batchId'])
export class DeductionRequest {
  @PrimaryGeneratedColumn({ primaryKeyConstraintName: 'PK_deduction_requests' }) id: number
  @Column({ type: 'int', nullable: true }) batchId: number | null
  @Column({ type: 'int' }) employeeId: number
  @Column({ type: 'int' }) deductionTypeId: number
  @Column({ type: 'int' }) typeVersion: number
  @Column({ type: 'nvarchar', length: 'MAX' }) typeSnapshot: string
  @Column({ type: 'nvarchar', length: 20 }) calcMethod: string
  @Column({ type: 'decimal', precision: 18, scale: 4 }) inputValue: number | string
  @Column({ type: 'decimal', precision: 18, scale: 2 }) estimatedAmount: number | string
  @Column({ type: 'decimal', precision: 18, scale: 2, nullable: true }) finalAmount: number | string | null
  @Column({ type: 'nvarchar', length: 'MAX' }) amountTrace: string
  @Column({ type: 'date' }) incidentDate: string
  @Column({ type: 'nvarchar', length: 1000 }) reason: string
  @Column({ type: 'nvarchar', length: 300, nullable: true }) attachmentRef: string | null
  // شهر المسير المستهدف YYYY-MM (مسير سبتمبر = 23 أغسطس → 22 سبتمبر)
  @Column({ type: 'nvarchar', length: 7 }) targetPeriod: string
  @Column({ type: 'int' }) installments: number
  @Column({ type: 'nvarchar', length: 20 }) status: DeductionRequestStatus
  @Column({ type: 'int' }) creatorUserId: number
  @Column({ type: 'int', nullable: true }) creatorEmployeeId: number | null
  @Column({ type: 'nvarchar', length: 30 }) scopeBasis: string
  @Column({ type: 'nvarchar', length: 'MAX' }) scopeSnapshot: string
  @Column({ type: 'nvarchar', length: 'MAX' }) steps: string
  @Column({ type: 'bit' }) escalated: boolean
  @Column({ type: 'bit' }) outOfScope: boolean
  @Column({ type: 'nvarchar', length: 'MAX', nullable: true }) overrides: string | null
  @Column({ type: 'nvarchar', length: 'MAX', nullable: true }) obligationIds: string | null
  @Column({ type: 'nvarchar', length: 1000, nullable: true }) decisionReason: string | null
  @Column({ type: 'int', nullable: true }) decidedByUserId: number | null
  @Column({ type: 'datetime2', nullable: true }) decidedAt: Date | null
  @Column({ type: 'int' }) revision: number
  @CreateDateColumn({ type: 'datetime2', default: () => 'SYSUTCDATETIME()' }) createdAt: Date
  @Column({ type: 'datetime2', nullable: true }) updatedAt: Date | null
}

@Entity('deduction_request_events')
@Index('IX_deduction_request_events_request', ['requestId'])
export class DeductionRequestEvent {
  @PrimaryGeneratedColumn({ primaryKeyConstraintName: 'PK_deduction_request_events' }) id: number
  @Column({ type: 'int' }) requestId: number
  @Column({ type: 'nvarchar', length: 40 }) eventType: string
  @Column({ type: 'int', nullable: true }) actorUserId: number | null
  @Column({ type: 'nvarchar', length: 20, nullable: true }) fromStatus: string | null
  @Column({ type: 'nvarchar', length: 20, nullable: true }) toStatus: string | null
  @Column({ type: 'int', nullable: true }) stepOrder: number | null
  @Column({ type: 'nvarchar', length: 1000, nullable: true }) reason: string | null
  @Column({ type: 'nvarchar', length: 'MAX', nullable: true }) payload: string | null
  @CreateDateColumn({ type: 'datetime2', default: () => 'SYSUTCDATETIME()' }) createdAt: Date
}

// الإنشاء الجماعي: لقطة الاختيار والمعاينة ونتيجة كل موظف (المُنشأ والمتخطى بسببه)
@Entity('deduction_batches')
export class DeductionBatch {
  @PrimaryGeneratedColumn({ primaryKeyConstraintName: 'PK_deduction_batches' }) id: number
  @Column({ type: 'int' }) deductionTypeId: number
  @Column({ type: 'nvarchar', length: 20 }) selectionMode: string
  @Column({ type: 'nvarchar', length: 'MAX' }) selection: string
  @Column({ type: 'nvarchar', length: 7 }) targetPeriod: string
  @Column({ type: 'nvarchar', length: 64 }) previewHash: string
  @Column({ type: 'int' }) candidateCount: number
  @Column({ type: 'int' }) createdCount: number
  @Column({ type: 'int' }) skippedCount: number
  @Column({ type: 'nvarchar', length: 'MAX' }) result: string
  @Column({ type: 'int' }) createdByUserId: number
  @CreateDateColumn({ type: 'datetime2', default: () => 'SYSUTCDATETIME()' }) createdAt: Date
}
