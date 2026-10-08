import { createHash } from 'node:crypto'
import type { PayrollItem } from './payroll.entities'

// B1.12 (الأداء): تفصيل البند (breakdown) هو أتقل حاجة في المسير — تتبّع قواعد الحضور يوم بيوم، ومحرك السياسة، وأيام الخصم.
// كان بيتنسخ كله في رد تفاصيل المسير (~18 ميجا لـ500 موظف) وفي حدث الحساب قبل وبعد (~30 ميجا). التفصيل الكامل محفوظ في البند
// وبيتعرض في القسيمة (`GET /payroll/items/:id`)؛ هنا العرضين الخفاف: عرض شاشة المسير، وبند حدث الحساب.

/**
 * مفاتيح التفصيل اللي شاشة المسير بتقراها (`src/app/payroll/page.tsx` ومساعداتها): التغطية، وأيام البصمة الناقصة، وسطور الإجازة بلا أجر،
 * وسطور القيود، وخطة الأقساط، والإضافي، وعلامة «مصروف مع التصفية». أي مفتاح جديد الشاشة تقراه لازم يتضاف هنا
 * (`payroll-run-screen-view.test.cjs` بيثبّت اللي الشاشة بتقراه).
 */
export const PAYROLL_RUN_SCREEN_BREAKDOWN_KEYS = ['coverFrom', 'coverTo', 'coverDays', 'prorataFactor', 'monthlyDays', 'missingPunchDates',
  'leaveDeductionLines', 'obligationLines', 'installmentPlan', 'overtime', 'settlementPayout',
  // B4.4 (ج): الخصومات القانونية (ضريبة، صناديق) — مجاميع جدول المسير بتقرا مجموعها من هنا (مش عمود في البند)
  'statutory'] as const

/** تفصيل البند لشاشة المسير: مفاتيح الشاشة ومجاميع خصم الحضور (دقايق الإذن) بس. التفصيل اللي مش JSON بيرجع زي ما هو */
export function payrollRunScreenBreakdown(breakdown: string | null | undefined): string | null {
  if (!breakdown) return breakdown ?? null
  let detail: unknown
  try { detail = JSON.parse(breakdown) } catch { return breakdown }
  if (!detail || typeof detail !== 'object' || Array.isArray(detail)) return breakdown
  const source = detail as Record<string, unknown>, slim: Record<string, unknown> = {}
  for (const key of PAYROLL_RUN_SCREEN_BREAKDOWN_KEYS) if (key in source) slim[key] = source[key]
  const deductions = source.attendanceDeductions
  if (deductions && typeof deductions === 'object' && 'totals' in deductions) slim.attendanceDeductions = { totals: (deductions as { totals: unknown }).totals }
  return JSON.stringify(slim)
}

/**
 * عضو المسير لشاشة المسير: لقطته زي ما هي (الاسم والكود والمكان وسبب الاستبعاد وغيرهم)، من غير أتقل حاجتين الشاشة مابتقراهمش:
 * مكونات الراتب (`salaryComponents`، بتتعرض في القسيمة)، ومن مصدر الراتب نوعه وشهره وسريانه بس (اللي الشاشة بتكتبه تحت اسم الموظف).
 */
export function payrollRunScreenMember<T extends { snapshot?: unknown }>(member: T): T {
  const snapshot = member.snapshot
  if (!snapshot || typeof snapshot !== 'object') return member
  const { salaryComponents: _salaryComponents, salarySource, ...rest } = snapshot as Record<string, unknown>
  const source = salarySource && typeof salarySource === 'object' ? salarySource as Record<string, unknown> : null
  return { ...member, snapshot: { ...rest, ...(salarySource === undefined ? {} : { salarySource: source
    ? { kind: source.kind, referencePeriod: source.referencePeriod, effectivePayrollPeriod: source.effectivePayrollPeriod } : salarySource }) } }
}

/** بصمة التفصيل المحفوظ (sha256 للنص زي ما هو في البند) */
export const payrollBreakdownSha256 = (breakdown: string | null | undefined): string => createHash('sha256').update(breakdown ?? '', 'utf8').digest('hex')

/** بند المسير في حدث الحساب: كل أعمدته بأرقامها من غير التفصيل، ومكانه بصمته — اللي معاه البند المحفوظ يقدر يثبت إنه هو */
export function payrollEventItem(item: PayrollItem): Omit<PayrollItem, 'breakdown'> & { breakdownSha256: string } {
  const { breakdown, ...columns } = item
  return { ...columns, breakdownSha256: payrollBreakdownSha256(breakdown) }
}
