import { Column, Entity, PrimaryGeneratedColumn } from 'typeorm'

// B3.10 (ترحيل 122): تقييم الموظف لخدمة استفساره. نفس الشكل في الترحيل بالحرف (من غير افتراضي).
// الاستفسار نفسه طلب في محرك الطلبات (فئة «استفسارات»): اعتماد فوري، ومهمة تنفيذ على دور بمهلة، وردود في تعليقات الطلب — من غير جدول تذاكر.
@Entity('request_service_ratings')
export class RequestServiceRating {
  @PrimaryGeneratedColumn({ primaryKeyConstraintName: 'PK_request_service_ratings' })
  id: number

  @Column({ type: 'int' })
  requestId: number

  // من 1 لـ5
  @Column({ type: 'int' })
  rating: number

  @Column({ type: 'nvarchar', length: 500, nullable: true })
  comment: string | null

  @Column({ type: 'int' })
  createdByUserId: number

  @Column({ type: 'datetime2' })
  createdAt: Date
}
