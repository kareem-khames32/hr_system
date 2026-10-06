import { Column, Entity, Index, PrimaryGeneratedColumn } from 'typeorm'

// B2.8 (ترحيل 093): تعليق في حوار على كيان (طلب أو مهمة). نفس الشكل في الترحيل بالحرف.
// سجل بيتضاف عليه بس: مفيش مسار تعديل ولا مسح. حق قراءته وكتابته هو حق الكيان نفسه (CommentsService.access).

@Entity('comments')
@Index('IX_comments_entity', ['entityType', 'entityId', 'id'])
export class Comment {
  @PrimaryGeneratedColumn({ primaryKeyConstraintName: 'PK_comments' })
  id: number

  @Column({ type: 'nvarchar', length: 30 })
  entityType: string

  @Column({ type: 'int' })
  entityId: number

  @Column({ type: 'int' })
  authorUserId: number

  // موظف الحساب وقت الكتابة: اسم الكاتب وحجبه بيتحكموا بيه، مش بربط الحساب دلوقتي (الحساب ممكن يتربط بموظف تاني بعدها)
  @Column({ type: 'int', nullable: true })
  authorEmployeeId: number | null

  @Column({ type: 'nvarchar', length: 2000 })
  body: string

  // داخلي: مابيرجعش لصاحب الموضوع (صاحب الطلب) في أي رد
  @Column({ type: 'bit' })
  internal: boolean

  // الإشارات: {"targets":["REQUESTER"],"replyTo":[12]} — أدوار الموضوع وأرقام تعليقات من نفس الحوار. من غير أسماء ولا أرقام موظفين
  @Column({ type: 'nvarchar', length: 'max', nullable: true })
  mentions: string | null

  @Column({ type: 'datetime2' })
  createdAt: Date
}
