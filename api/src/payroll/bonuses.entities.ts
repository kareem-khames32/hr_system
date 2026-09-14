import { Column, CreateDateColumn, Entity, Index, PrimaryGeneratedColumn } from 'typeorm'

// ============ المكافآت (C4 / الخطوة 27 — EX-05) ============
// الكتالوج يحدد طريقة الحساب والسقف ونطاق المُقترِح وسلسلة الاعتماد؛ الطلب يُلتقط بنسخة النوع وسلسلته
// وقت الاقتراح، وقيد الدفتر الموجب (CREDIT/bonus) لا يُنشأ للموظف المختار إلا بعد آخر اعتماد وبشهره المستهدف.
// المبالغ العشرية تُقرأ من SQL Server كأرقام؛ الخدمة تحولها إلى نصوص دقيقة قبل أي حساب.

@Entity('bonus_types')
@Index('UX_bonus_types_code', ['code'], { unique: true })
export class BonusType {
  @PrimaryGeneratedColumn({ primaryKeyConstraintName: 'PK_bonus_types' }) id: number
  @Column({ type: 'nvarchar', length: 40 }) code: string
  @Column({ type: 'nvarchar', length: 120 }) nameAr: string
  @Column({ type: 'nvarchar', length: 120, nullable: true }) nameEn: string | null
  @Column({ type: 'nvarchar', length: 20 }) calcMethod: string
  @Column({ type: 'decimal', precision: 18, scale: 4, nullable: true }) defaultValue: number | string | null
  @Column({ type: 'decimal', precision: 9, scale: 4, nullable: true }) valueStep: number | string | null
  @Column({ type: 'decimal', precision: 18, scale: 2, nullable: true }) minAmount: number | string | null
  @Column({ type: 'decimal', precision: 18, scale: 2, nullable: true }) maxAmount: number | string | null
  // سقف المكافأة الواحدة كنسبة من الأساسي؛ null = بلا سقف
  @Column({ type: 'decimal', precision: 9, scale: 4, nullable: true }) maxPctOfBase: number | string | null
  @Column({ type: 'bit' }) isTaxable: boolean
  @Column({ type: 'bit' }) isInsurable: boolean
  // CSV: DIRECT_MANAGER,TEAM_LEADER,DEPARTMENT_MANAGER,BRANCH_MANAGER,HR
  @Column({ type: 'nvarchar', length: 200 }) creatorScopes: string
  // CSV مرتب ينتهي دائمًا بـHR
  @Column({ type: 'nvarchar', length: 200 }) approvalSteps: string
  @Column({ type: 'decimal', precision: 9, scale: 4, nullable: true }) escalationDays: number | string | null
  @Column({ type: 'nvarchar', length: 30, nullable: true }) escalationStep: string | null
  @Column({ type: 'int' }) version: number
  @Column({ type: 'bit' }) isActive: boolean
  @Column({ type: 'int', nullable: true }) updatedByUserId: number | null
  @CreateDateColumn({ type: 'datetime2', default: () => 'SYSUTCDATETIME()' }) createdAt: Date
  @Column({ type: 'datetime2', nullable: true }) updatedAt: Date | null
}

@Entity('bonus_requests')
@Index('IX_bonus_requests_employee', ['employeeId'])
@Index('IX_bonus_requests_status', ['status'])
@Index('IX_bonus_requests_batch', ['batchId'])
export class BonusRequest {
  @PrimaryGeneratedColumn({ primaryKeyConstraintName: 'PK_bonus_requests' }) id: number
  @Column({ type: 'int', nullable: true }) batchId: number | null
  // الموظف المستفيد المختار (لا مقدم الطلب)
  @Column({ type: 'int' }) employeeId: number
  @Column({ type: 'int' }) bonusTypeId: number
  @Column({ type: 'int' }) typeVersion: number
  @Column({ type: 'nvarchar', length: 'MAX' }) typeSnapshot: string
  @Column({ type: 'nvarchar', length: 20 }) calcMethod: string
  @Column({ type: 'decimal', precision: 18, scale: 4 }) inputValue: number | string
  @Column({ type: 'decimal', precision: 18, scale: 2 }) estimatedAmount: number | string
  @Column({ type: 'decimal', precision: 18, scale: 2, nullable: true }) finalAmount: number | string | null
  @Column({ type: 'nvarchar', length: 'MAX' }) amountTrace: string
  @Column({ type: 'nvarchar', length: 1000 }) reason: string
  @Column({ type: 'nvarchar', length: 300, nullable: true }) attachmentRef: string | null
  // شهر المسير المستهدف YYYY-MM (مسير سبتمبر = 23 أغسطس → 22 سبتمبر)
  @Column({ type: 'nvarchar', length: 7 }) targetPeriod: string
  @Column({ type: 'nvarchar', length: 20 }) status: string
  @Column({ type: 'int' }) creatorUserId: number
  @Column({ type: 'int', nullable: true }) creatorEmployeeId: number | null
  @Column({ type: 'nvarchar', length: 30 }) scopeBasis: string
  @Column({ type: 'nvarchar', length: 'MAX' }) scopeSnapshot: string
  @Column({ type: 'nvarchar', length: 'MAX' }) steps: string
  @Column({ type: 'bit' }) escalated: boolean
  // تجاوز سقف النوع باستثناء مسجل لحامل bonuses.exceed_cap
  @Column({ type: 'bit' }) capExceeded: boolean
  @Column({ type: 'bit' }) outOfScope: boolean
  @Column({ type: 'nvarchar', length: 'MAX', nullable: true }) overrides: string | null
  // قيد الدفتر الموجب المُنشأ عند آخر اعتماد
  @Column({ type: 'int', nullable: true }) obligationId: number | null
  @Column({ type: 'nvarchar', length: 1000, nullable: true }) decisionReason: string | null
  @Column({ type: 'int', nullable: true }) decidedByUserId: number | null
  @Column({ type: 'datetime2', nullable: true }) decidedAt: Date | null
  @Column({ type: 'int' }) revision: number
  @CreateDateColumn({ type: 'datetime2', default: () => 'SYSUTCDATETIME()' }) createdAt: Date
  @Column({ type: 'datetime2', nullable: true }) updatedAt: Date | null
}

@Entity('bonus_request_events')
@Index('IX_bonus_request_events_request', ['requestId'])
export class BonusRequestEvent {
  @PrimaryGeneratedColumn({ primaryKeyConstraintName: 'PK_bonus_request_events' }) id: number
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

// الاقتراح الجماعي: لقطة الاختيار والمعاينة ونتيجة كل موظف (المُنشأ والمتخطى بسببه)
@Entity('bonus_batches')
export class BonusBatch {
  @PrimaryGeneratedColumn({ primaryKeyConstraintName: 'PK_bonus_batches' }) id: number
  @Column({ type: 'int' }) bonusTypeId: number
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
