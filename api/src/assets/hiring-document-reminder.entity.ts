import { Column, Entity, Index, PrimaryGeneratedColumn } from 'typeorm'

/**
 * تذكير «مسوغات التعيين» (ترحيل 075): الموارد البشرية بعتت للموظف إن ناقصه مستندات من المطلوبة للتعيين.
 * الصف سجل بس (مين بعت وإمتى وأكواد الناقص وقتها) — الإشعار نفسه بيتحسب وقت القراءة من آخر تذكير والناقص الحالي،
 * فبيختفي لوحده لما المستندات تكتمل، وتذكير جديد (رقم جديد) بيرجّعه حتى لو الموظف كان شاله.
 *
 * أسماء المفتاح والفهرس صريحة (مش hash) عشان ترحيل 075 يطابقها بالحرف وفرق المخطط يفضل صفرًا.
 * مفيش قيمة افتراضية لأي عمود: الخدمة بتكتب كل الأعمدة في الـinsert.
 */
@Entity('hiring_document_reminders')
@Index('IX_hiring_document_reminders_employee', ['employeeId'])
export class HiringDocumentReminder {
  @PrimaryGeneratedColumn({ primaryKeyConstraintName: 'PK_hiring_document_reminders' })
  id: number

  @Column({ type: 'int' })
  employeeId: number

  // الحساب اللي بعت التذكير (users.id)
  @Column({ type: 'int' })
  sentByUserId: number

  @Column({ type: 'datetime2' })
  sentAt: Date

  // أكواد أنواع المستندات اللي كانت ناقصة وقت التذكير — مصفوفة JSON (["contract","criminal_record"])
  @Column({ type: 'nvarchar', length: 400 })
  missingDocTypes: string
}
