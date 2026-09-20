import { PAY_METHOD_LABELS, payrollPaySplit } from './pay-split'
import { roundPayrollMoney } from './payroll-money'

// كشف البنوك لمسير (قرار المالك): لكل موظف الكود والاسم والبنك والآيبان ومبلغ البنك والنقدي، وإجمالي كل بنك.
export const NO_BANK_LABEL = 'بدون بنك محدد'

export interface BankSheetSource {
  employeeId: number
  employeeCode: string
  fullName: string
  payMethod: string | null
  bankTransferAmount: unknown
  bankName: string | null
  iban: string | null
  netPay: unknown
  /** قرار المالك (20 سبتمبر): راتب آخر شهر بيتصرف مع التصفية — برّه كشف البنك تمامًا، ومبلغه بيتقال للعلم فقط. */
  settlementPayout?: { caseId: number; lastWorkingDay: string; label: string } | null
}

export interface BankSheetRow {
  employeeId: number; employeeCode: string; fullName: string; payMethod: string; payMethodLabel: string
  bankName: string | null; iban: string | null; netPay: number; bankAmount: number; cashAmount: number
}

const cents = (value: number) => Math.round(value * 100)

export function buildBankSheet(allSources: BankSheetSource[]) {
  // صفوف التصفية مش في الكشف ولا في مبلغ الصرف؛ بتتذكر في «مصروف مع التصفية» عشان حد ما يفتكرش إنها اتنسيت.
  const settlement = allSources.filter(source => source.settlementPayout)
  const sources = allSources.filter(source => !source.settlementPayout)
  const rows: BankSheetRow[] = sources.map(source => {
    const payMethod = source.payMethod ?? 'transfer'
    const split = payrollPaySplit(source.netPay, payMethod, source.bankTransferAmount)
    return { employeeId: source.employeeId, employeeCode: source.employeeCode, fullName: source.fullName, payMethod,
      payMethodLabel: PAY_METHOD_LABELS[payMethod] ?? payMethod, bankName: source.bankName?.trim() || null, iban: source.iban?.trim() || null,
      netPay: roundPayrollMoney(Number(source.netPay) || 0), bankAmount: split.bank, cashAmount: split.cash }
  })
  rows.sort((a, b) => (a.bankAmount > 0 ? 0 : 1) - (b.bankAmount > 0 ? 0 : 1)
    || (a.bankName ?? NO_BANK_LABEL).localeCompare(b.bankName ?? NO_BANK_LABEL, 'ar') || a.employeeCode.localeCompare(b.employeeCode, 'en'))
  const banks = new Map<string, { bankName: string; employees: number; totalCents: number }>()
  let bankCents = 0, cashCents = 0
  for (const row of rows) {
    bankCents += cents(row.bankAmount); cashCents += cents(row.cashAmount)
    if (row.bankAmount <= 0) continue
    const name = row.bankName ?? NO_BANK_LABEL
    const bank = banks.get(name) ?? { bankName: name, employees: 0, totalCents: 0 }
    bank.employees++; bank.totalCents += cents(row.bankAmount)
    banks.set(name, bank)
  }
  const settlementCents = settlement.reduce((sum, source) => sum + cents(roundPayrollMoney(Number(source.netPay) || 0)), 0)
  return {
    rows,
    banks: [...banks.values()].map(bank => ({ bankName: bank.bankName, employees: bank.employees, total: bank.totalCents / 100 })),
    totals: { employees: rows.length, bank: bankCents / 100, cash: cashCents / 100, net: (bankCents + cashCents) / 100 },
    settlement: { employees: settlement.length, total: settlementCents / 100,
      rows: settlement.map(source => ({ employeeId: source.employeeId, employeeCode: source.employeeCode, fullName: source.fullName,
        netPay: roundPayrollMoney(Number(source.netPay) || 0), lastWorkingDay: source.settlementPayout?.lastWorkingDay ?? null,
        caseId: source.settlementPayout?.caseId ?? null })) },
  }
}
