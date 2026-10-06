import { Check, Column, Entity, Index, PrimaryGeneratedColumn } from 'typeorm'

// B2.7-أ (ترحيل 091): مكتبة السياسات والإقرار.
//  السياسة: عنوان وجمهور «مين + فين» وإلزامية ومهلة سماح. محتواها في نسخ: النسخة بتتكتب مرة واحدة وقت النشر (نص أو ملف PDF) ببصمتها،
//  ومابتتعدلش بعدها — التعديل نسخة جديدة. والإقرار سطر بيتضاف بس: الموظف، والنسخة، والوقت، وبصمة اللي اتعرض، والـIP، والجهاز.
//  نفس الشكل في الترحيل بالحرف. الجداول برّه مسار الكود قبل الترحيل: كل قراءة بعد التأكد من وجودها (policy-rules.ts).

export const POLICY_STATUSES = ['DRAFT', 'PUBLISHED', 'WITHDRAWN'] as const
export type PolicyStatus = (typeof POLICY_STATUSES)[number]

@Entity('policies')
export class Policy {
  @PrimaryGeneratedColumn({ primaryKeyConstraintName: 'PK_policies' })
  id: number

  @Column({ type: 'nvarchar', length: 200 })
  title: string

  // تصنيف حر للعرض (لائحة داخلية، أمن المعلومات…)
  @Column({ type: 'nvarchar', length: 100, nullable: true })
  category: string | null

  // الجمهور «مين + فين» بنفس شكل جمهور نوع الطلب (requests/request-audience.ts) — فاضي = كل الموظفين
  @Column({ type: 'nvarchar', length: 2000, nullable: true })
  audience: string | null

  // إلزامية = بتظهر عند الدخول، وبعد مهلة السماح النظام مابيفتحش غير بعد الإقرار
  @Column({ type: 'bit' })
  isMandatory: boolean

  // مهلة السماح بالأيام من سريان النسخة (أو من تعيين الموظف لو بعدها). صفر = من غير مهلة
  @Column({ type: 'int' })
  graceDays: number

  // اليوم اللي السياسة بقت فيه إلزامية أو جمهورها اتغيّر (لو حصل بعد النشر): المهلة بتتحسب منه لو أبعد، فمحدش بيتقفل بمهلة خلصت قبل ما
  // الإلزام يبدأ. فاضي = من سريان النسخة
  @Column({ type: 'date', nullable: true })
  graceFrom: string | null

  // DRAFT: لسه مااتنشرتش · PUBLISHED: ليها نسخة منشورة · WITHDRAWN: اتسحبت (مابتقفلش حد، وإقراراتها باقية)
  @Column({ type: 'nvarchar', length: 20 })
  status: PolicyStatus

  @Column({ type: 'int' })
  createdByUserId: number

  @Column({ type: 'datetime2' })
  createdAt: Date

  @Column({ type: 'datetime2', nullable: true })
  withdrawnAt: Date | null

  @Column({ type: 'int', nullable: true })
  withdrawnByUserId: number | null
}

@Entity('policy_versions')
@Index('UQ_policy_versions_number', ['policyId', 'versionNo'], { unique: true })
// المحتوى نص أو ملف: واحد منهم بالظبط
@Check('CK_policy_versions_content', '([bodyText] IS NULL AND [fileId] IS NOT NULL) OR ([bodyText] IS NOT NULL AND [fileId] IS NULL)')
export class PolicyVersion {
  @PrimaryGeneratedColumn({ primaryKeyConstraintName: 'PK_policy_versions' })
  id: number

  @Column({ type: 'int' })
  policyId: number

  @Column({ type: 'int' })
  versionNo: number

  // المحتوى: نص، أو ملف PDF (واحد منهم بس)
  @Column({ type: 'nvarchar', length: 'max', nullable: true })
  bodyText: string | null

  @Column({ type: 'int', nullable: true })
  fileId: number | null

  // sha256 للمحتوى اللي بيتعرض (النص بترميز UTF-8، أو بايتات الملف) — بيتحسب وقت النشر
  @Column({ type: 'nvarchar', length: 64 })
  contentHash: string

  // التاريخ المحلي اللي النسخة بتسري منه
  @Column({ type: 'date' })
  effectiveDate: string

  // تغيير جوهري = الكل يقرّ من جديد. أول نسخة جوهرية دايمًا
  @Column({ type: 'bit' })
  isMaterial: boolean

  @Column({ type: 'datetime2' })
  publishedAt: Date

  @Column({ type: 'int' })
  publishedByUserId: number
}

@Entity('policy_acknowledgements')
@Index('UQ_policy_acknowledgements_version_employee', ['versionId', 'employeeId'], { unique: true })
@Index('IX_policy_acknowledgements_employee', ['employeeId', 'policyId'])
export class PolicyAcknowledgement {
  @PrimaryGeneratedColumn({ primaryKeyConstraintName: 'PK_policy_acknowledgements' })
  id: number

  @Column({ type: 'int' })
  policyId: number

  @Column({ type: 'int' })
  versionId: number

  // الموظف اللي أقرّ، والحساب اللي دخل بيه (الإقرار لنفسه بس)
  @Column({ type: 'int' })
  employeeId: number

  @Column({ type: 'int' })
  userId: number

  @Column({ type: 'datetime2' })
  acknowledgedAt: Date

  // بصمة النسخة اللي اتعرضت له وقت الإقرار
  @Column({ type: 'nvarchar', length: 64 })
  contentHash: string

  @Column({ type: 'nvarchar', length: 64, nullable: true })
  ip: string | null

  @Column({ type: 'nvarchar', length: 300, nullable: true })
  userAgent: string | null
}
