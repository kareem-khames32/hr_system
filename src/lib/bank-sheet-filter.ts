// كشف البنوك بالفلتر الموحد («الفرع ← الإدارة ← القسم ← الفريق»): الصفوف اللي في الفلتر بس، وكل الإجماليات (البنوك والإجمالي
// والبيانات الناقصة والمصروف مع التصفية) بتتحسب منها بنفس حساب الخادم بالظبط (buildBankSheet في api/src/payroll/bank-sheet.ts):
// الجمع بالقرش، وإجمالي كل بنك للصفوف اللي ليها تحويل بس، والبنوك بترتيب الصفوف. الشاشة ماتعرضش إجمالي الخادم جنب صفوف متفلترة.
import type { ApiBankSheet } from './api'

// نفس NO_BANK_LABEL في الخادم بالحرف
const NO_BANK_LABEL = 'بدون بنك محدد'
const cents = (value: number) => Math.round(value * 100)

export function filterBankSheet(sheet: ApiBankSheet, keep: (employeeId: number) => boolean): ApiBankSheet {
  const rows = sheet.rows.filter((row) => keep(row.employeeId))
  const banks = new Map<string, { bankName: string; employees: number; totalCents: number }>()
  let bankCents = 0, cashCents = 0, issueBankCents = 0, issueCashCents = 0
  for (const row of rows) {
    bankCents += cents(row.bankAmount)
    cashCents += cents(row.cashAmount)
    if (row.issue) {
      issueBankCents += cents(row.bankAmount)
      issueCashCents += cents(row.cashAmount)
    }
    if (row.bankAmount <= 0) continue
    const name = row.bankName ?? NO_BANK_LABEL
    const bank = banks.get(name) ?? { bankName: name, employees: 0, totalCents: 0 }
    bank.employees++
    bank.totalCents += cents(row.bankAmount)
    banks.set(name, bank)
  }
  const settlementRows = sheet.settlement.rows.filter((row) => keep(row.employeeId))
  const issueRows = rows.filter((row) => row.issue)
  return {
    run: sheet.run,
    rows,
    banks: [...banks.values()].map((bank) => ({ bankName: bank.bankName, employees: bank.employees, total: bank.totalCents / 100 })),
    totals: { employees: rows.length, bank: bankCents / 100, cash: cashCents / 100, net: (bankCents + cashCents) / 100 },
    issues: { employees: issueRows.length, bank: issueBankCents / 100, cash: issueCashCents / 100, rows: issueRows },
    settlement: {
      employees: settlementRows.length,
      total: settlementRows.reduce((sum, row) => sum + cents(row.netPay), 0) / 100,
      rows: settlementRows,
    },
  }
}
