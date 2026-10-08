import { Column, Entity, PrimaryGeneratedColumn, type EntityManager } from 'typeorm'
import { HOLIDAY_WORK_LABEL } from '../attendance/holiday-work'
import { PAID_SALARY_COMPONENTS } from '../employees/compensation'

// B4.3: بنود الراتب — جدول بيوصف كل بند بيظهر في القسيمة: كوده واسمه ونوعه (استحقاق/استقطاع) وخاضع للتأمين وللضريبة وطريقة التناسب وترتيبه.
// المبالغ مصدرها زي ما هو (خانات راتب الموظف، وأعمدة بند المسير، وقيود الدفتر)؛ الجدول بيوصف وبيرتّب بس.
// الترتيب بيتقري من هنا في القسيمة وجدول المسير (payroll-item-lines.ts)، و«خاضع للضريبة» بيقراه حساب الضريبة لما يتفعّل (B4.4).
// الكود شغال قبل ترحيل 135: الجدول مش موجود = الترتيب الثابت (نفس قيم البذرة).

export type SalaryItemKind = 'EARNING' | 'DEDUCTION'
/** SERVICE_DAYS = بيتناسب بأيام الخدمة في الفترة (المتعيّن أو الخارج في نصها)؛ NONE = مبلغه بييجي جاهز من مصدره */
export type SalaryItemProration = 'SERVICE_DAYS' | 'NONE'

// الأعمدة من غير افتراضي ولا فهرس عشان شكل الكيان = شكل الترحيل (فرق المخطط صفر)؛ الكود مايتكررش لأن البذرة بتضيف تحت قفل الجدول
@Entity('salary_items')
export class SalaryItem {
  @PrimaryGeneratedColumn({ primaryKeyConstraintName: 'PK_salary_items' })
  id: number

  @Column({ type: 'nvarchar', length: 40 })
  code: string

  @Column({ type: 'nvarchar', length: 120 })
  nameAr: string

  @Column({ type: 'nvarchar', length: 120 })
  nameEn: string

  @Column({ type: 'nvarchar', length: 12 })
  kind: SalaryItemKind

  /** وصف بس: حساب التأمينات بيقرا أجر التأمين المسجل في ملف الموظف */
  @Column({ type: 'bit' })
  insurable: boolean

  /** للاستحقاق: بيدخل وعاء الضريبة. للاستقطاع: بيقلل وعاء الضريبة */
  @Column({ type: 'bit' })
  taxable: boolean

  @Column({ type: 'nvarchar', length: 20 })
  proration: SalaryItemProration

  @Column({ type: 'int' })
  sortOrder: number

  /** بند قانوني (تأمينات، ضريبة، صناديق) */
  @Column({ type: 'bit' })
  statutory: boolean

  /** بيتحسب في المسير؟ البنود القانونية الجديدة = لأ لحد ما حاسبتها تتفعّل */
  @Column({ type: 'bit' })
  computed: boolean

  @Column({ type: 'int', nullable: true })
  updatedByUserId: number | null

  @Column({ type: 'datetime2', nullable: true })
  updatedAt: Date | null
}

export interface SalaryItemSeed {
  code: string; nameAr: string; nameEn: string; kind: SalaryItemKind
  insurable: boolean; taxable: boolean; proration: SalaryItemProration; sortOrder: number; statutory: boolean; computed: boolean
}

const earning = (code: string, nameAr: string, nameEn: string, sortOrder: number, extra: Partial<SalaryItemSeed> = {}): SalaryItemSeed =>
  ({ code, nameAr, nameEn, kind: 'EARNING', insurable: false, taxable: true, proration: 'NONE', sortOrder, statutory: false, computed: true, ...extra })
const deduction = (code: string, nameAr: string, nameEn: string, sortOrder: number, extra: Partial<SalaryItemSeed> = {}): SalaryItemSeed =>
  ({ code, nameAr, nameEn, kind: 'DEDUCTION', insurable: false, taxable: false, proration: 'NONE', sortOrder, statutory: false, computed: true, ...extra })

// الترتيب = رتبة السطر الثابتة قبل الجدول بالظبط (اختبار المطابقة بيثبتها): الأساسي 0، ومكونات الراتب 10 + ترتيبها، والباقي بخاناته
const SALARY_ITEM_INSURABLE: readonly string[] = ['BASIC', 'HOUSING']
export const SALARY_ITEM_SEED: readonly SalaryItemSeed[] = [
  ...PAID_SALARY_COMPONENTS.map((component, index) => earning(component.code, component.nameAr, component.nameEn, index === 0 ? 0 : 10 + index,
    { proration: 'SERVICE_DAYS', insurable: SALARY_ITEM_INSURABLE.includes(component.code) })),
  earning('SALARY_ALLOWANCES', 'البدلات الثابتة (مجمّعة)', 'Fixed Allowances (combined)', 19, { proration: 'SERVICE_DAYS' }),
  earning('OVERTIME', 'الإضافي', 'Overtime', 20),
  earning('HOLIDAY_WORK', HOLIDAY_WORK_LABEL, 'Holiday Work Allowance', 30),
  earning('ALLOWANCE', 'البدلات المصروفة', 'Granted Allowances', 40),
  earning('BONUS', 'المكافآت', 'Bonuses', 50),
  earning('CREDIT', 'إضافات الدفتر', 'Ledger Additions', 60),
  earning('OTHER_ADDITIONS', 'إضافات أخرى', 'Other Additions', 90),
  deduction('LATENESS', 'التأخير', 'Lateness', 100, { taxable: true }),
  deduction('DEDUCT_PERMISSION', 'إذن بخصم', 'Deducted Permission', 101, { taxable: true }),
  deduction('EARLY_LEAVE', 'الانصراف المبكر', 'Early Leave', 102, { taxable: true }),
  deduction('SHORTFALL', 'نقص الساعات', 'Hours Shortfall', 103, { taxable: true }),
  deduction('ABSENCE', 'الغياب', 'Absence', 104, { taxable: true }),
  deduction('UNPAID_LEAVE', 'إجازة بدون راتب', 'Unpaid Leave', 105, { taxable: true }),
  deduction('SUSPENSION', 'الإيقاف', 'Suspension', 106, { taxable: true }),
  deduction('SICK_LEAVE', 'خصم المرضية', 'Sick Leave Deduction', 107, { taxable: true }),
  deduction('TYPED_DEDUCTION', 'الخصومات المصنّفة', 'Typed Deductions', 110),
  deduction('DEBIT', 'خصومات الدفتر', 'Ledger Deductions', 120),
  deduction('OTHER_DEDUCTIONS', 'خصومات أخرى', 'Other Deductions', 130),
  deduction('LOAN', 'السلف', 'Loan Installments', 140),
  deduction('SOCIAL_INSURANCE', 'التأمينات (حصة الموظف)', 'Social Insurance (employee share)', 150, { taxable: true, statutory: true }),
  // مكان البنود القانونية الجاية — مابتتحسبش لحد ما حاسبتها تتفعّل (B4.4)
  deduction('INCOME_TAX', 'ضريبة كسب العمل', 'Salary Tax', 151, { statutory: true, computed: false }),
  deduction('MARTYRS_FUND', 'صندوق الشهداء', 'Martyrs Fund', 152, { statutory: true, computed: false }),
  deduction('HEALTH_INSURANCE', 'التأمين الصحي الشامل', 'Universal Health Insurance', 153, { statutory: true, computed: false }),
]

export type SalaryItemOrder = ReadonlyMap<string, number>
/** الترتيب الثابت (البذرة) — اللي القارئ بيشتغل بيه قبل ترحيل 135 ولما مايتبعتلوش ترتيب */
export const DEFAULT_SALARY_ITEM_ORDER: SalaryItemOrder = new Map(SALARY_ITEM_SEED.map(seed => [seed.code, seed.sortOrder]))

const SALARY_CODES: readonly string[] = PAID_SALARY_COMPONENTS.map(component => component.code)
const FAMILY_CODES: Readonly<Record<string, string>> = { ALLOWANCE: 'ALLOWANCE', BONUS: 'BONUS', CREDIT: 'CREDIT', TYPED: 'TYPED_DEDUCTION', DEBIT: 'DEBIT' }

/** كود بند الراتب لمفتاح سطر في القسيمة (SALARY:HOUSING ← HOUSING، ALLOWANCE:<اسم> ← ALLOWANCE…)؛ null = سطر مالوش بند (آخر الترتيب) */
export function salaryItemCodeOf(lineKey: string): string | null {
  const split = lineKey.indexOf(':')
  if (split < 0) return DEFAULT_SALARY_ITEM_ORDER.has(lineKey) ? lineKey : null
  const family = lineKey.slice(0, split)
  if (family === 'SALARY') { const code = lineKey.slice(split + 1); return SALARY_CODES.includes(code) && code !== 'BASIC' ? code : 'SALARY_ALLOWANCES' }
  return FAMILY_CODES[family] ?? null
}

/** رتبة سطر: ترتيب بنده من الجدول، وإلا الثابت؛ السطر اللي مالوش بند في الآخر (200 زي الأول) */
export function salaryItemRank(lineKey: string, order: SalaryItemOrder = DEFAULT_SALARY_ITEM_ORDER): number {
  const code = salaryItemCodeOf(lineKey)
  if (code == null) return 200
  return order.get(code) ?? DEFAULT_SALARY_ITEM_ORDER.get(code) ?? 200
}

let ready: boolean | null = null
/** الجدول موجود (ترحيل 135 اتطبق)؟ بيتحفظ لما يبقى موجود بس */
export async function salaryItemsReady(em: EntityManager): Promise<boolean> {
  if (ready === true) return true
  const [row] = await em.query(`SELECT CASE WHEN OBJECT_ID(N'dbo.salary_items', N'U') IS NOT NULL THEN 1 ELSE 0 END AS [ready]`)
  ready = Number(row?.ready) === 1
  return ready
}
/** للاختبارات: نسيان حالة الترحيل */
export function resetSalaryItemsCache() { ready = null }

/** ترتيب البنود من الجدول (كود ← ترتيب)؛ قبل الترحيل أو والجدول فاضي = الثابت */
export async function readSalaryItemOrder(em: EntityManager): Promise<SalaryItemOrder> {
  if (!(await salaryItemsReady(em))) return DEFAULT_SALARY_ITEM_ORDER
  const rows: Array<{ code: string; sortOrder: number }> = await em.query('SELECT [code], [sortOrder] FROM dbo.salary_items')
  return rows.length ? new Map(rows.map(row => [String(row.code), Number(row.sortOrder)])) : DEFAULT_SALARY_ITEM_ORDER
}
