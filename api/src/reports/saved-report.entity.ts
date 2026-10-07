import { Column, Entity, Index, PrimaryGeneratedColumn } from 'typeorm'

// B2.13-ب (ترحيل 098): تقرير محفوظ لحساب — نوع التقرير وفلاتره باسم، ودورية إرساله بالبريد لصاحبه. نفس الشكل في الترحيل بالحرف.
@Entity('saved_reports')
@Index('UX_saved_reports_owner_name', ['ownerUserId', 'name'], { unique: true })
export class SavedReport {
  @PrimaryGeneratedColumn({ primaryKeyConstraintName: 'PK_saved_reports' })
  id: number

  // صاحب التقرير: هو بس اللي بيشوفه وبينزّله وبيتبعت له
  @Column({ type: 'int' })
  ownerUserId: number

  @Column({ type: 'nvarchar', length: 120 })
  name: string

  // مفتاح التقرير في report-export.ts (REPORT_KEYS)
  @Column({ type: 'nvarchar', length: 30 })
  reportKey: string

  // JSON: الفلتر الموحد (فرع، أقسام، فريق) والفترة النسبية (شهر الرواتب الجاري أو السابق وقت التشغيل)
  @Column({ type: 'nvarchar', length: 4000 })
  filters: string

  // NONE | DAILY | WEEKLY | MONTHLY
  @Column({ type: 'nvarchar', length: 10 })
  frequency: string

  // xlsx | pdf
  @Column({ type: 'nvarchar', length: 5 })
  format: string

  // آخر يوم اتبعت فيه بالبريد (توقيت الشركة)
  @Column({ type: 'date', nullable: true })
  lastSentOn: string | null

  // سبب تعذّر آخر محاولة إرسال (بيتمسح مع أول إرسال ناجح)
  @Column({ type: 'nvarchar', length: 300, nullable: true })
  lastError: string | null

  @Column({ type: 'datetime2' })
  createdAt: Date
}
