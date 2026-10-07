import { Column, Entity, PrimaryColumn } from 'typeorm'

// B2.5 — إضافة المالك 6 أكتوبر (ترحيل 096): حالة قواعد الإسناد والتقييم لمهمة. صف واحد لكل مهمة ليها حاجة من دول، ومفتاحه رقم المهمة.
// من غير صف = مهمة عادية (مش شخصية، من غير رجوع ولا تقييم ولا طلب تمديد).
// في جدول لوحده مش أعمدة على tasks: ترحيل 088 بيتحقق إن جدول tasks بأعمدته العشرين بالظبط، فعمود زيادة عليه كان هيوقّف إعادة تشغيل 088.
// نفس الشكل في الترحيل بالحرف.
@Entity('task_extras')
export class TaskExtra {
  @PrimaryColumn({ type: 'int', primaryKeyConstraintName: 'PK_task_extras' })
  taskId: number

  // «شخصية»: الموظف كلّف نفسه — بيشوفها صاحبها ومديره المباشر بس
  @Column({ type: 'bit' })
  isPersonal: boolean

  // مرات «رجّعها للتعديل»
  @Column({ type: 'int' })
  returnCount: number

  // «تحتاج تقييم»، وتقييم اللي كلّف بيها (1–5) وتعليقه — الميزة الفرعية tasks.rating
  @Column({ type: 'bit' })
  needsRating: boolean

  @Column({ type: 'tinyint', nullable: true })
  rating: number | null

  @Column({ type: 'nvarchar', length: 500, nullable: true })
  ratingNote: string | null

  // طلب تمديد الميعاد المعلّق من المسؤول: الموعد المطلوب وسببه (فاضيين = مفيش طلب معلّق)
  @Column({ type: 'date', nullable: true })
  extensionDueDate: string | null

  @Column({ type: 'nvarchar', length: 500, nullable: true })
  extensionReason: string | null
}
