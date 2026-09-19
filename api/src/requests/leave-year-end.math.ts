// ===== حساب «إقفال سنة الإجازات» — دوال صرفة بلا قاعدة بيانات (test/leave-year-end.test.cjs) =====
import { roundPayrollMoney } from '../payroll/payroll-money'
import { carryOverDays, round2, type BalanceTypeSettings } from './leave-balance-periods'

// المتبقي في آخر سنة الرصيد: يترحّل لحد سقف النوع (لو الترحيل مفعّل) والباقي يسقط.
// applied = المُرحّل فعلًا لو السنة اتقفلت (طبقة افتتاحية على السنة الجديدة)؛ وقتها اللي يتسوّى
// هو اللي سقط بس، لأن المُرحّل بقى جزء من رصيد السنة الجديدة
export function yearEndSplit(
  remaining: number,
  settings: Pick<BalanceTypeSettings, 'carryOverEnabled' | 'carryOverMaxDays'>,
  applied: number | null = null
) {
  const left = Math.max(0, round2(Number(remaining) || 0))
  const projected = carryOverDays(settings, left)
  const carried = applied ?? projected
  return {
    carried,
    lapsed: round2(Math.max(0, left - carried)),
    settleable: round2(Math.max(0, left - (applied ?? 0))),
    // الإقفال لسه هيحط مُرحّل على السنة الجديدة
    pendingCarry: applied === null && projected > 0,
  }
}

// بدل أيام الإجازة: الراتب الشهري الشامل ÷ 30 × الأيام، مقصوص لقرشين (قرار المالك: لا تقريب للفلوس).
// المبلغ من الراتب مباشرة مش من سعر اليوم المقصوص عشان القص مايتكررش
export function leaveSettlementAmount(days: number, monthlySalary: number, monthDays = 30) {
  const d = Number(days)
  const salary = Number(monthlySalary)
  if (!(d > 0) || !(salary > 0) || !(monthDays > 0)) return { dailyRate: 0, amount: 0 }
  return {
    dailyRate: roundPayrollMoney(salary / monthDays),
    amount: roundPayrollMoney((salary * d) / monthDays),
  }
}
