import { PAYROLL_STATUTORY_TOTAL_LABEL, payrollItemStatutoryCents } from './payroll-statutory'
import { payrollItemWorkPressureEarned } from './payroll-work-pressure'

// B1.6 (R03): الموظف اللي صافيه سالب بيمنع اعتماد المسير وصرفه (حماية الصافي). القايمة دي بتقول مين وليه، بالمبالغ اللي في البند نفسه،
// بدل رسالة فيها أرقام الموظفين بس. حساب صافي بلا قاعدة بيانات — نفس صافي المؤثرات اللي الاعتماد بيفحصه (من غير بدل ضغط العمل).

export type PayrollNegativeNetCause = 'UNPAID_LEAVE' | 'SOCIAL_INSURANCE' | 'DEDUCTIONS'
export interface PayrollNegativeNetLine { code: string; label: string; amount: number }
export interface PayrollNegativeNetRow {
  employeeId: number
  employeeCode: string | null
  fullName: string | null
  /** صافي المؤثرات (من غير بدل ضغط العمل) — سالب */
  net: number
  /** المستحق والإضافات بالموجب، والخصومات بالسالب — مجموعها = net */
  lines: PayrollNegativeNetLine[]
  cause: PayrollNegativeNetCause
  hint: string
}
export interface PayrollNegativeNetItem {
  employeeId: number
  basicSalary: unknown; allowances: unknown; overtimeAmount: unknown; otherAdditions: unknown
  latenessDeduction: unknown; shortfallDeduction: unknown; absenceDeduction: unknown; unpaidLeaveDeduction: unknown
  otherDeductions: unknown; socialInsuranceDeduction: unknown; loanInstallments: unknown; netPay: unknown
  breakdown?: string | null
}

export const PAYROLL_NEGATIVE_NET_HINTS: Record<PayrollNegativeNetCause, string> = {
  UNPAID_LEAVE: 'الإجازة بدون راتب (والإيقاف والمرضية) أكبر من مستحق الفترة. فعّل «حارس الفترة» من سياسات النظام وحدّث لقطة السياسة وأعد الحساب، أو راجع الإجازة.',
  SOCIAL_INSURANCE: 'التأمينات بتتخصم بعد حماية الصافي، وحصة الموظف أكبر من اللي فاضل له. راجع أجر التأمين أو «مسجل في التأمينات» للشهر ده.',
  DEDUCTIONS: 'الخصومات أكبر من مستحق الفترة. راجع البنود في تفصيل الموظف وأعد الحساب.',
}

const cents = (value: unknown) => Math.round(Number(value ?? 0) * 100)

/** null لو الصافي مش سالب */
export function explainPayrollNegativeNet(item: PayrollNegativeNetItem, identity: { employeeCode?: string | null; fullName?: string | null } = {}): PayrollNegativeNetRow | null {
  let breakdown: unknown = {}
  try { breakdown = item.breakdown ? JSON.parse(item.breakdown) : {} } catch { breakdown = {} }
  const workPressure = Math.round((payrollItemWorkPressureEarned(breakdown) ?? 0) * 100)
  const net = cents(item.netPay) - workPressure
  if (net >= 0) return null
  const earned = cents(item.basicSalary) + cents(item.allowances) - workPressure
  const additions = cents(item.overtimeAmount) + cents(item.otherAdditions)
  const unpaid = cents(item.unpaidLeaveDeduction)
  const attendance = cents(item.latenessDeduction) + cents(item.shortfallDeduction) + cents(item.absenceDeduction)
  const other = cents(item.otherDeductions), insurance = cents(item.socialInsuranceDeduction), loans = cents(item.loanInstallments)
  const lines: PayrollNegativeNetLine[] = [{ code: 'EARNED', label: 'المستحق (الراتب والبدلات)', amount: earned / 100 }]
  const add = (code: string, label: string, value: number, sign: 1 | -1) => { if (value) lines.push({ code, label, amount: sign * value / 100 }) }
  add('ADDITIONS', 'الإضافي والإضافات', additions, 1)
  add('UNPAID_LEAVE', 'الإجازة بدون راتب والإيقاف والمرضية', unpaid, -1)
  add('ATTENDANCE', 'الغياب والتأخير ونقص الساعات', attendance, -1)
  add('OTHER_DEDUCTIONS', 'الخصومات ودفتر المديونيات', other, -1)
  add('SOCIAL_INSURANCE', 'التأمينات (حصة الموظف)', insurance, -1)
  add('LOANS', 'أقساط السلف', loans, -1)
  // B4.4 (ب): الخصومات القانونية المحفوظة في التفصيل (ضريبة، صندوق) — جزء من الصافي المحفوظ، فلازم تبان في تفسيره
  add('STATUTORY', PAYROLL_STATUTORY_TOTAL_LABEL, payrollItemStatutoryCents(breakdown) ?? 0, -1)
  // السبب: الإجازة بدون راتب لوحدها أكبر من المستحق والإضافات = الرصيد سالب قبل أي خصم؛ وإلا التأمينات لو الصافي من غيرها مش سالب
  const cause: PayrollNegativeNetCause = unpaid > earned + additions ? 'UNPAID_LEAVE' : insurance > 0 && net + insurance >= 0 ? 'SOCIAL_INSURANCE' : 'DEDUCTIONS'
  return { employeeId: item.employeeId, employeeCode: identity.employeeCode ?? null, fullName: identity.fullName ?? null, net: net / 100, lines, cause,
    hint: PAYROLL_NEGATIVE_NET_HINTS[cause] }
}

/** رسالة الرفض لقارئ الرواتب: أول 3 بالاسم والصافي، والسبب الأكبر */
export function payrollNegativeNetMessage(rows: readonly PayrollNegativeNetRow[], action: 'اعتماد' | 'صرف'): string {
  const named = rows.slice(0, 3).map(row => `«${row.fullName ?? `#${row.employeeId}`}» (${row.net.toFixed(2)})`).join('، ')
  const more = rows.length > 3 ? ` و${rows.length - 3} كمان` : ''
  return `صافي ${rows.length} موظف سالب: ${named}${more}. ${rows[0]?.hint ?? ''} الـ${action} ممنوع لحد ما يتعالج ويتعاد الحساب.`
}
