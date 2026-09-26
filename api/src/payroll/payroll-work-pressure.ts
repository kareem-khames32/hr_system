import { WORK_PRESSURE_ALLOWANCE } from '../employees/compensation'

/**
 * بدل ضغط العمل في المسير (قرار المالك 26 سبتمبر) — خانة في راتب الموظف بتتصرف معاه «من غير مؤثرات»:
 * - حساب المسير كله ماشي على المكونات الست زي ما هو بالحرف: سعر اليوم والساعة (الإضافي والتأخير والغياب والنقص والخصومات
 *   المسعّرة بأيام أو ساعات من الراتب)، والإجازة بلا أجر والإيقاف والمرضية، وحماية الصافي (الأرضية والسقف ورصيد الخصم)،
 *   وخطة الأقساط، والتأمينات، ومحرك السياسة وتقرير التكافؤ — البدل مش داخل في أي أساس منهم.
 * - البدل بيتصرف كامل فوق الصافي بعد الحماية والتأمينات والأقساط: ولا خصم ولا قسط ولا دين بياخد منه، حتى لو الخصومات أكبر من الراتب.
 * - التعديل الوحيد: تناسب أيام الخدمة للي اتعيّن أو خرج جوه الفترة، بنفس قاعدة الراتب بالحرف (payrollProrateCents).
 * - في البند: جوه عمود «البدلات» والصافي (المصروف)، وسطر «بدل ضغط العمل» في salaryComponents، وbreakdown.workPressureAllowance؛
 *   الاعتماد والصرف بيطرحوه قبل ما يقارنوا خطة الأقساط أو يفحصوا الصافي السالب (المؤثرات بس هي اللي ممكن تبقى سالبة).
 * موظف من غير بدل (صفر) = البند والتفصيل واللقطة زي ما كانوا بالحرف.
 */
export interface PayrollWorkPressurePay { monthlyAmount: number; earnedAmount: number }
export interface PayrollProrationBasis { fullCoverage: boolean; coverDays: number; monthlyDays: number }

/** تناسب أيام الخدمة بالقروش — نفس قاعدة الراتب: الدورة الكاملة = الشهر كامل، وإلا ÷ أيام الشهر × أيام التغطية مقصوص وبسقف الشهر. */
export function payrollProrateCents(cents: number, basis: PayrollProrationBasis): number {
  return basis.fullCoverage ? cents : Math.min(cents, Math.trunc(cents * basis.coverDays / basis.monthlyDays))
}

/** البدل الشهري والمستحق منه للفترة؛ null لمن مالوش بدل (صفر) فمايتكتبش أي أثر. */
export function payrollWorkPressurePay(monthly: number, basis: PayrollProrationBasis): PayrollWorkPressurePay | null {
  const monthlyCents = Math.round(Number(monthly) * 100)
  if (!Number.isSafeInteger(monthlyCents) || monthlyCents < 0) throw new Error('بدل ضغط العمل الشهري لازم مبلغ غير سالب بمنزلتين')
  if (monthlyCents === 0) return null
  return { monthlyAmount: monthlyCents / 100, earnedAmount: payrollProrateCents(monthlyCents, basis) / 100 }
}

/** سطر «بدل ضغط العمل» في مكونات الراتب المحفوظة (القسيمة وجدول المسير والتقارير بتقراه زي باقي المكونات). */
export function payrollWorkPressureSalaryLine(pay: PayrollWorkPressurePay) {
  return { code: WORK_PRESSURE_ALLOWANCE.code, nameAr: WORK_PRESSURE_ALLOWANCE.nameAr, nameEn: WORK_PRESSURE_ALLOWANCE.nameEn,
    monthlyAmount: pay.monthlyAmount, earnedAmount: pay.earnedAmount }
}

/** البند المصروف: البدل المستحق بيتضاف للبدلات والصافي بالقروش بعد الحماية والتأمينات والأقساط — مفيش حاجة بتتخصم منه. */
export function withWorkPressurePay(amounts: { allowances: number; netPay: number }, pay: PayrollWorkPressurePay | null) {
  if (!pay) return amounts
  const cents = Math.round(pay.earnedAmount * 100)
  return { allowances: (Math.round(amounts.allowances * 100) + cents) / 100, netPay: (Math.round(amounts.netPay * 100) + cents) / 100 }
}

/** البدل المستحق المحفوظ في تفصيل البند: 0 لبند من غيره (أو أقدم منه)، وnull لقيمة تالفة. */
export function payrollItemWorkPressureEarned(breakdown: unknown): number | null {
  const pay = breakdown && typeof breakdown === 'object' ? (breakdown as { workPressureAllowance?: unknown }).workPressureAllowance : undefined
  if (pay === undefined || pay === null) return 0
  if (typeof pay !== 'object' || Array.isArray(pay)) return null
  const earned = (pay as { earnedAmount?: unknown }).earnedAmount
  return typeof earned === 'number' && Number.isFinite(earned) && earned >= 0 && Number.isSafeInteger(Math.round(earned * 100)) ? earned : null
}
