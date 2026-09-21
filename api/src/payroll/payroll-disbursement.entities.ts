import { Check, Column, Entity, Index, PrimaryGeneratedColumn } from 'typeorm'
import { utcDateTime } from './payroll-policy.entities'

// صرف المسير موظف بموظف (قرار المالك 22 سبتمبر): موظف المالية حامل payroll.disburse بيعلّم على كل موظف في مسير معتمد
// «تم الصرف / لم يتم» — ولا بيغيّر أي مبلغ ولا أي حالة للمسير غير علامة الصرف.
//
// صف واحد لكل بند مسير (itemId فريد) بحالته الحالية ومن علّم ومتى وملاحظته؛ غياب الصف = «لم يتم».
// المبلغ وتقسيمه بنك/نقدي بيتثبتوا وقت «تم الصرف» (دليل اللي اتصرف فعلًا حتى لو طريقة صرف الموظف اتغيرت بعدها).
// كل نداء تعليم بيتسجل حدث على المسير (DISBURSEMENT_MARKED) فالتاريخ الكامل محفوظ في سجل المسير.
// العلامة مالهاش أي أثر مالي: قفل الإضافي وترحيل الأقساط والقيود بيحصلوا مرة واحدة بس عند «إقفال الصرف» (pay) للمسير كله.
export type PayrollDisbursementStatus = 'PAID' | 'UNPAID'

@Entity('payroll_item_disbursements')
@Index('UX_payroll_item_disbursement_item', ['itemId'], { unique: true })
@Index('IX_payroll_item_disbursement_run', ['runId', 'status'])
@Check('CK_payroll_item_disbursement_status', "[status] IN ('PAID','UNPAID')")
export class PayrollItemDisbursement {
  @PrimaryGeneratedColumn({ primaryKeyConstraintName: 'PK_payroll_item_disbursements' }) id: number
  @Column({ type: 'int' }) runId: number
  @Column({ type: 'int' }) itemId: number
  @Column({ type: 'int' }) employeeId: number
  @Column({ type: 'nvarchar', length: 10 }) status: PayrollDisbursementStatus
  // صافي البند وقت العلامة، وتقسيمه بنك/نقدي وطريقة الصرف وقتها (لصف «تم الصرف»)
  @Column({ type: 'decimal', precision: 18, scale: 2 }) amount: number
  @Column({ type: 'decimal', precision: 18, scale: 2 }) bankAmount: number
  @Column({ type: 'decimal', precision: 18, scale: 2 }) cashAmount: number
  @Column({ type: 'nvarchar', length: 20, nullable: true }) payMethod: string | null
  @Column({ type: 'nvarchar', length: 500, nullable: true }) note: string | null
  @Column({ type: 'int' }) markedByUserId: number
  @Column({ type: 'datetime2', transformer: utcDateTime }) markedAt: Date
}
