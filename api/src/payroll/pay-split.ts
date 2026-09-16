import { roundPayrollMoney } from './payroll-money'

// طريقة صرف الراتب (قرار المالك): نقدي / تحويل بنكي / نقدي + بنك. «visa» قيمة قديمة (بطاقة رواتب) تُعامل كتحويل بنكي.
export const PAY_METHODS = ['cash', 'transfer', 'mixed', 'visa'] as const
export type PayMethod = (typeof PAY_METHODS)[number]
export const PAY_METHOD_LABELS: Record<string, string> = { cash: 'نقدي', transfer: 'تحويل بنكي', mixed: 'نقدي + بنك', visa: 'بطاقة رواتب' }

/** البنك داخل في الصرف (تحويل كامل أو جزء) — البنك والآيبان مطلوبان. */
export const payMethodUsesBank = (method: string | null | undefined) => (method ?? 'transfer') !== 'cash'

/**
 * تقسيم صافي الراتب بين البنك والنقدي بالقروش (قص على منزلتين):
 * نقدي ← كله نقدي، تحويل ← كله بنك، نقدي + بنك ← مبلغ البنك المحدد والباقي نقدي (لو الصافي أقل من مبلغ البنك يروح كله للبنك).
 * صافي بالسالب أو صفر = لا صرف.
 */
export function payrollPaySplit(net: unknown, method: string | null | undefined, bankTransferAmount: unknown): { bank: number; cash: number } {
  const total = roundPayrollMoney(Math.max(0, Number(net) || 0))
  const kind = method ?? 'transfer'
  if (kind === 'cash') return { bank: 0, cash: total }
  if (kind !== 'mixed') return { bank: total, cash: 0 }
  const wanted = roundPayrollMoney(Math.max(0, Number(bankTransferAmount) || 0))
  const bankCents = Math.min(Math.round(wanted * 100), Math.round(total * 100))
  return { bank: bankCents / 100, cash: (Math.round(total * 100) - bankCents) / 100 }
}

type PayFields = { payMethod?: string | null; bankTransferAmount?: unknown; bankName?: string | null; iban?: string | null }

/**
 * فحص طريقة الصرف على الحالة بعد الحفظ. previous = الملف المحفوظ في التعديل:
 * ملف قديم «تحويل» ناقص البنك/الآيبان يحفظ باقي حقوله طالما طريقة الصرف لم تتغير.
 */
export function employeePayMethodIssue(next: PayFields, previous?: PayFields | null): string | null {
  const method = next.payMethod ?? 'transfer'
  if (!(PAY_METHODS as readonly string[]).includes(method)) return 'طريقة الصرف: نقدي أو تحويل بنكي أو نقدي + بنك'
  if (method === 'mixed' && !(Number(next.bankTransferAmount) > 0)) return 'في «نقدي + بنك» اكتب مبلغ التحويل البنكي (أكبر من صفر)'
  if (!payMethodUsesBank(method)) return null
  const legacyIncomplete = previous && (previous.payMethod ?? 'transfer') === method && !(previous.bankName?.trim() && previous.iban?.trim())
  if (legacyIncomplete && next.bankName === previous.bankName && next.iban === previous.iban) return null
  if (!next.bankName?.trim()) return 'اسم البنك مطلوب لما الصرف فيه تحويل بنكي'
  if (!next.iban?.trim()) return 'رقم الآيبان مطلوب لما الصرف فيه تحويل بنكي'
  return null
}
