import { Column, Entity, Index, PrimaryGeneratedColumn } from 'typeorm'
import { utcDateTime } from './payroll-policy.entities'

// تراكم المسير يومًا بيوم (قرار المالك 20 سبتمبر): بدل ما الشهر كله يتحسب مرة واحدة آخر الشهر
// (كان بياخد ساعات لـ580 موظف)، كل يوم بيتحسب ليلته ويتخزن هنا. آخر الشهر المسير بيقرأ الأيام
// المتراكمة بدل ما يعيد حساب كل يوم-موظف من الأول، ويحسب بس اللي ناقص أو «متسخ».
//
// المفتاح: (employeeId, period, date) — فريد. runId بيربط الصف بالمسير المفتوح اللي اتحسب له
// (بيتحدّث لو اتغير المسير المفتوح للشهر)، فالبحث بالمسير أو بالموظف والشهر الاتنين سريعين.
//
// «متسخ» (isDirty=1): حاجة اتغيرت في اليوم ده بعد ما اتحسب — تصحيح بصمة، إذن أو إجازة أو إضافي
// أو دوام عطلة اتعتمد متأخر، إيقاف، تغيير راتب. علامة رخيصة (UPDATE واحد) والجار الليلي هو اللي
// بيعيد الحساب. inputsHash بصمة المدخلات اللي اتحسب منها اليوم: لو اتغيرت بلا علامة، اليوم يتعاد.
@Entity('payroll_daily_accrual')
@Index('UX_payroll_daily_accrual_day', ['employeeId', 'period', 'date'], { unique: true })
@Index('IX_payroll_daily_accrual_run', ['runId', 'date'])
@Index('IX_payroll_daily_accrual_dirty', ['period', 'isDirty'])
export class PayrollDailyAccrual {
  @PrimaryGeneratedColumn({ primaryKeyConstraintName: 'PK_payroll_daily_accrual' }) id: number
  // المسير المفتوح (DRAFT/CALCULATED) اللي اتحسب له اليوم — NULL لو اليوم اتراكم بلا مسير بعد
  @Column({ type: 'int', nullable: true }) runId: number | null
  @Column({ type: 'int' }) employeeId: number
  // شهر المسير YYYY-MM
  @Column({ type: 'nvarchar', length: 7 }) period: string
  @Column({ type: 'date' }) date: string

  // ===== حقائق اليوم المحسوبة =====
  // تصنيف يوم الحضور كما حسبه محرك الحضور: present | absent | leave | holiday | weekend | exempt | missing_punch
  @Column({ type: 'nvarchar', length: 20, nullable: true }) attendanceStatus: string | null
  @Column({ type: 'int', default: 0 }) workMinutes: number
  @Column({ type: 'int', default: 0 }) lateMinutes: number
  // دقائق الإذن «بخصم» المتداخلة مع التأخير
  @Column({ type: 'int', default: 0 }) deductibleMinutes: number
  @Column({ type: 'int', default: 0 }) shortfallMinutes: number
  @Column({ type: 'int', default: 0 }) earlyLeaveMinutes: number
  @Column({ type: 'int', default: 0 }) overtimeMinutes: number
  @Column({ type: 'decimal', precision: 18, scale: 2, default: 0 }) overtimeAmount: number

  // أعلام اليوم
  @Column({ type: 'bit', default: false }) isAbsent: boolean
  @Column({ type: 'bit', default: false }) isLeave: boolean
  @Column({ type: 'bit', default: false }) isUnpaidLeave: boolean
  @Column({ type: 'bit', default: false }) isSickLeave: boolean
  @Column({ type: 'bit', default: false }) isSuspended: boolean
  @Column({ type: 'bit', default: false }) isHolidayWork: boolean
  @Column({ type: 'bit', default: false }) isExempt: boolean
  @Column({ type: 'bit', default: false }) isWorkday: boolean

  // ===== مبالغ اليوم (استرشادية للعرض والتقارير؛ المسير بيعيد جمعها من نفس صفوف الحضور) =====
  @Column({ type: 'decimal', precision: 18, scale: 2, default: 0 }) earningsAmount: number
  @Column({ type: 'decimal', precision: 18, scale: 2, default: 0 }) latenessAmount: number
  @Column({ type: 'decimal', precision: 18, scale: 2, default: 0 }) shortfallAmount: number
  @Column({ type: 'decimal', precision: 18, scale: 2, default: 0 }) absenceAmount: number
  @Column({ type: 'decimal', precision: 18, scale: 2, default: 0 }) leaveAmount: number
  @Column({ type: 'decimal', precision: 18, scale: 2, default: 0 }) suspensionAmount: number
  // تفصيل اليوم كامل (JSON) — مكوّنات الاستحقاق والخصم كما حُسبت، للتدقيق والقسيمة
  @Column({ type: 'nvarchar', length: 'MAX', nullable: true }) components: string | null

  // ===== الحالة =====
  // بصمة مدخلات اليوم (صف الحضور والإجازة والإضافي والإيقاف ودوام العطلة والراتب)
  @Column({ type: 'nvarchar', length: 64, nullable: true }) inputsHash: string | null
  @Column({ type: 'bit', default: false }) isDirty: boolean
  @Column({ type: 'nvarchar', length: 200, nullable: true }) dirtyReason: string | null
  @Column({ type: 'datetime2', nullable: true, transformer: utcDateTime }) computedAt: Date | null
  @Column({ type: 'datetime2', nullable: true, transformer: utcDateTime }) dirtyAt: Date | null
}
