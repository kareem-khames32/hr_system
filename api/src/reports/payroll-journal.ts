import { costCenterCents, costCenterMoney, NO_COST_CENTER_NAME, type CostCenterReportRow } from './cost-center-report'

// B6.5: قيد المسير المحاسبي بمراكز التكلفة — من نفس صفوف تقرير مراكز التكلفة (بنود المسيرات المعتمدة من لقطة المسير)، بالقروش الصحيحة.
// قراءة بس: توزيع أعمدة البند على حسابات مدين/دائن لكل عملة ومركز. مدين = دائن لكل مركز؛ ولو الاستحقاقات ناقص الخصومات مش بتساوي الصافي
// المحفوظ، الفرق سطر صريح «فرق تسوية الصافي» (مابيتخبّاش في حساب تاني).

export type JournalSide = 'DEBIT' | 'CREDIT'
export interface JournalAccount { key: string; label: string; side: JournalSide; fields: readonly string[] }
/** الحسابات بالترتيب اللي بتطلع بيه. المفتاح ثابت (المحاسب بيربطه برقم الحساب في دليله). */
export const JOURNAL_ACCOUNTS: readonly JournalAccount[] = [
  { key: 'SALARIES', label: 'رواتب وبدلات', side: 'DEBIT', fields: ['basicSalary', 'allowances'] },
  { key: 'OVERTIME', label: 'عمل إضافي', side: 'DEBIT', fields: ['overtimeAmount'] },
  { key: 'OTHER_EARNINGS', label: 'إضافات أخرى ومكافآت', side: 'DEBIT', fields: ['otherAdditions'] },
  { key: 'EMPLOYER_INSURANCE', label: 'حصة صاحب العمل في التأمينات', side: 'DEBIT', fields: ['employerInsurance'] },
  { key: 'NET_PAYABLE', label: 'رواتب مستحقة الدفع (الصافي)', side: 'CREDIT', fields: ['netPay'] },
  { key: 'ATTENDANCE_DEDUCTIONS', label: 'خصومات الحضور (تأخير ونقص وغياب وإجازة بدون راتب)', side: 'CREDIT', fields: ['latenessDeduction', 'shortfallDeduction', 'absenceDeduction', 'unpaidLeaveDeduction'] },
  { key: 'LOANS', label: 'أقساط سلف الموظفين', side: 'CREDIT', fields: ['loanInstallments'] },
  { key: 'OTHER_DEDUCTIONS', label: 'خصومات أخرى', side: 'CREDIT', fields: ['otherDeductions'] },
  { key: 'INSURANCE_PAYABLE', label: 'تأمينات مستحقة (حصة الموظف وصاحب العمل)', side: 'CREDIT', fields: ['socialInsuranceDeduction', 'employerInsurance'] },
  { key: 'STATUTORY_PAYABLE', label: 'استقطاعات قانونية مستحقة', side: 'CREDIT', fields: ['statutoryDeductions'] },
]
export const NET_ADJUSTMENT = { key: 'NET_ADJUSTMENT', label: 'فرق تسوية الصافي' } as const

export interface JournalLine { account: string; label: string; debit: string; credit: string }
export interface JournalCenter { costCenterId: number | null; code: string | null; name: string; currency: string | null; headcount: number; lines: JournalLine[]; debit: string; credit: string; balanced: boolean
  /** الاستحقاقات ناقص الخصومات ناقص الصافي المحفوظ — غير الصفر بيطلع سطر «فرق تسوية الصافي» */
  adjustment: string }

/**
 * القيد من صفوف البنود: مجموعة لكل (عملة، مركز تكلفة). حصة صاحب العمل بتتحسب لو مصدرها متاح بس.
 * `currencyOf` = عملة فرع الصف في لقطة المسير (null = مش معروفة).
 */
export function buildPayrollJournal(rows: readonly CostCenterReportRow[], insuranceAvailable: boolean, currencyOf: (row: CostCenterReportRow) => string | null) {
  type Acc = { costCenterId: number | null; code: string | null; name: string; currency: string | null; ids: Set<number>; sums: Map<string, bigint> }
  const groups = new Map<string, Acc>()
  const amount = (row: CostCenterReportRow, field: string): bigint => (field === 'employerInsurance' && !insuranceAvailable ? 0n : costCenterCents((row as Record<string, unknown>)[field]))
  for (const row of rows) {
    const centerId = row.costCenterId === null || row.costCenterId === undefined ? null : Number(row.costCenterId), currency = currencyOf(row)
    const key = `${currency ?? ''}|${centerId ?? 'none'}`
    let acc = groups.get(key)
    if (!acc) {
      acc = { costCenterId: centerId, code: centerId === null ? null : row.costCenterCode ?? null, name: centerId === null ? NO_COST_CENTER_NAME : row.costCenterName || `#${centerId}`, currency, ids: new Set(), sums: new Map() }
      groups.set(key, acc)
    }
    acc.ids.add(Number(row.employeeId))
    for (const account of JOURNAL_ACCOUNTS) acc.sums.set(account.key, (acc.sums.get(account.key) ?? 0n) + account.fields.reduce<bigint>((sum, field) => sum + amount(row, field), 0n))
  }
  const centers: JournalCenter[] = [...groups.values()].map(acc => {
    const lines: JournalLine[] = []
    let debit = 0n, credit = 0n
    for (const account of JOURNAL_ACCOUNTS) {
      const value = acc.sums.get(account.key) ?? 0n
      if (value === 0n) continue
      // مبلغ سالب على حساب (تسوية عكسية جوه المسير) بيتقلب للجانب التاني بقيمته الموجبة
      const side: JournalSide = value > 0n ? account.side : account.side === 'DEBIT' ? 'CREDIT' : 'DEBIT', absolute = value > 0n ? value : -value
      if (side === 'DEBIT') debit += absolute; else credit += absolute
      lines.push({ account: account.key, label: account.label, debit: side === 'DEBIT' ? costCenterMoney(absolute) : '0.00', credit: side === 'CREDIT' ? costCenterMoney(absolute) : '0.00' })
    }
    // الفرق بين الجانبين = الاستحقاقات − الخصومات − الصافي المحفوظ: سطر صريح على الجانب الناقص
    const adjustment = debit - credit
    if (adjustment !== 0n) {
      const absolute = adjustment > 0n ? adjustment : -adjustment
      lines.push({ account: NET_ADJUSTMENT.key, label: NET_ADJUSTMENT.label, debit: adjustment < 0n ? costCenterMoney(absolute) : '0.00', credit: adjustment > 0n ? costCenterMoney(absolute) : '0.00' })
      if (adjustment > 0n) credit += absolute; else debit += absolute
    }
    return { costCenterId: acc.costCenterId, code: acc.code, name: acc.name, currency: acc.currency, headcount: acc.ids.size, lines, debit: costCenterMoney(debit), credit: costCenterMoney(credit), balanced: debit === credit,
      adjustment: costCenterMoney(adjustment) }
  })
  // بالعملة ثم الاسم، و«بدون مركز تكلفة» آخر كل عملة
  centers.sort((a, b) => (a.currency ?? '').localeCompare(b.currency ?? '') || (a.costCenterId === null ? 1 : 0) - (b.costCenterId === null ? 1 : 0) || a.name.localeCompare(b.name, 'ar'))
  const byCurrency = new Map<string | null, { debit: bigint; credit: bigint }>()
  for (const center of centers) {
    const total = byCurrency.get(center.currency) ?? { debit: 0n, credit: 0n }
    total.debit += costCenterCents(center.debit); total.credit += costCenterCents(center.credit)
    byCurrency.set(center.currency, total)
  }
  return { centers, totals: [...byCurrency.entries()].map(([currency, total]) => ({ currency, debit: costCenterMoney(total.debit), credit: costCenterMoney(total.credit), balanced: total.debit === total.credit })),
    balanced: centers.every(center => center.balanced), adjusted: centers.filter(center => center.adjustment !== '0.00').length }
}
