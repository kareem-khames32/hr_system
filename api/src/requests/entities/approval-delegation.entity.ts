import { Column, Entity, Index, PrimaryGeneratedColumn } from 'typeorm'

// B2.6-ب (ترحيل 090): تفويض الاعتمادات — المفوِّض بيحدد بديل واحد لفترة، وخطواته الهيكلية (المسمّاة باسمه) بتبقى مستنية البديل كمان
// طول الفترة. الخطوات المفتوحة مابتتكتبش من جديد: القاعدة بتتقري وقت الصندوق والقرار. نفس الشكل في الترحيل بالحرف.
@Entity('approval_delegations')
@Index('IX_approval_delegations_delegate', ['delegateEmployeeId', 'startDate', 'endDate'])
@Index('IX_approval_delegations_delegator', ['delegatorEmployeeId', 'startDate', 'endDate'])
export class ApprovalDelegation {
  @PrimaryGeneratedColumn({ primaryKeyConstraintName: 'PK_approval_delegations' })
  id: number

  // المفوِّض: الموظف اللي خطوات الاعتماد مسمّاة باسمه
  @Column({ type: 'int' })
  delegatorEmployeeId: number

  // البديل: بيعتمد بالنيابة عنه طول الفترة
  @Column({ type: 'int' })
  delegateEmployeeId: number

  // الفترة بالتاريخ المحلي، والطرفين داخلين
  @Column({ type: 'date' })
  startDate: string

  @Column({ type: 'date' })
  endDate: string

  // فئات الطلبات المشمولة (JSON لقايمة) — فاضي = كل الفئات
  @Column({ type: 'nvarchar', length: 500, nullable: true })
  categories: string | null

  @Column({ type: 'nvarchar', length: 300, nullable: true })
  reason: string | null

  @Column({ type: 'int' })
  createdByUserId: number

  @Column({ type: 'datetime2' })
  createdAt: Date

  // الإلغاء: التفويض بيفضل للتاريخ ومابيتمسحش
  @Column({ type: 'datetime2', nullable: true })
  revokedAt: Date | null

  @Column({ type: 'int', nullable: true })
  revokedByUserId: number | null
}
