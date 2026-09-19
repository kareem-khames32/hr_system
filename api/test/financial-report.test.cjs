// التقارير المالية لشهر رواتب (تجميع بنود المسيرات): كشف الرواتب، ملخص التكلفة بالفرع والقسم، الخصومات بالنوع والموظف، الإضافي، السلف.
const { test } = require('node:test')
const assert = require('node:assert/strict')
const path = require('node:path')
require('../node_modules/ts-node').register({ project: path.join(__dirname, '..', 'tsconfig.json'), transpileOnly: true })
const {
  computeFinancialRow, buildPayrollRegister, buildPayrollCostSummary, buildDeductionsReport, buildOvertimeReport, buildLoansReport,
  installmentPosition, FR_NO_DEPARTMENT, FR_UNNAMED_TYPED,
} = require('../src/reports/financial-report')

const source = (over = {}) => ({
  runId: 1, runName: 'سبتمبر', runStatus: 'APPROVED', runType: null, employeeId: 1, employeeCode: 'EMP0001', fullName: 'أحمد',
  branchId: 1, branchName: 'المعادي', departmentId: 10, departmentName: 'المبيعات', costCenterId: null, costCenterName: null,
  itemPayMethod: 'transfer', employeePayMethod: 'transfer', bankTransferAmount: null,
  basicSalary: '5000.00', allowances: '1500.00', overtimeAmount: '0.00', overtimeHours: '0.00', otherAdditions: '0.00',
  latenessDeduction: '0.00', shortfallDeduction: '0.00', absenceDeduction: '0.00', unpaidLeaveDeduction: '0.00', loanInstallments: '0.00',
  otherDeductions: '0.00', socialInsuranceDeduction: '0.00', netPay: '6500.00',
  salaryComponents: JSON.stringify([
    { code: 'BASIC', earnedAmount: 5000 }, { code: 'HOUSING', earnedAmount: 1000 }, { code: 'TRANSPORT', earnedAmount: 500 },
    { code: 'PHONE', earnedAmount: 0 }, { code: 'WORK_NATURE', earnedAmount: 0 }, { code: 'OTHER', earnedAmount: 0 },
  ]),
  earnedComponents: null, obligationLines: null, leaveDeductionLines: null, overtimeEntryIds: null, employerInsurance: null,
  ...over,
})
const obligations = new Map([
  [11, { id: 11, type: 'CREDIT', category: 'allowance', label: 'بدل وجبة', typeName: null }],
  [12, { id: 12, type: 'CREDIT', category: 'bonus', label: 'مكافأة', typeName: 'مكافأة أداء' }],
  [13, { id: 13, type: 'DEBIT', category: 'typed_deduction', label: 'خصم', typeName: 'جزاء تأخير متكرر' }],
  [14, { id: 14, type: 'DEBIT', category: 'custody_shortfall', label: 'عجز عهدة', typeName: null }],
  [15, { id: 15, type: 'CREDIT', category: 'allowance', label: 'بدل دوام أيام العطلات', typeName: null, sourceRef: 'holiday_work:7:2026-09-05' }],
  [16, { id: 16, type: 'DEBIT', category: 'typed_deduction', label: 'خصم', typeName: null }],
])

test('row: buckets from salary components, credits/debits by category, leave lines split, pay split, gross = columns', () => {
  const row = computeFinancialRow(source({
    otherAdditions: '450.00', otherDeductions: '300.00', unpaidLeaveDeduction: '700.00', latenessDeduction: '50.25', shortfallDeduction: '10.00',
    absenceDeduction: '216.66', loanInstallments: '500.00', socialInsuranceDeduction: '487.50', overtimeAmount: '312.50', overtimeHours: '5.50',
    overtimeEntryIds: '[1,2,3]', employerInsurance: '587.5', employeePayMethod: 'mixed', bankTransferAmount: '3000',
    obligationLines: JSON.stringify([
      { id: 11, type: 'CREDIT', amount: 200, collected: 200 }, { id: 12, type: 'CREDIT', amount: 150, collected: 150 },
      { id: 15, type: 'CREDIT', amount: 100, collected: 100 },
      { id: 13, type: 'DEBIT', amount: 250, collected: 200, carried: 50 }, { id: 14, type: 'DEBIT', amount: 100, collected: 100 },
    ]),
    leaveDeductionLines: JSON.stringify([
      { code: 'UNPAID_LEAVE', amount: 333.33 }, { code: 'SUSPENSION', amount: 166.67 }, { code: 'SICK_LEAVE_75', amount: 150.5 }, { code: 'SICK_LEAVE_0', amount: 49.5 },
    ]),
    netPay: '4998.09',
  }), obligations)
  assert.equal(row.buckets.get('HOUSING'), 100000n)
  assert.equal(row.buckets.get('TRANSPORT'), 50000n)
  assert.equal(row.buckets.has('UNSPLIT'), false)
  assert.equal(row.additions.get('allowance'), 20000n)
  assert.equal(row.additions.get('bonus'), 15000n)
  assert.equal(row.holidayWork, 10000n)
  assert.equal(row.deductions.TYPED, 20000n) // المحصل فعلًا بس، والمرحّل مش خصم الشهر
  assert.equal(row.deductions.OTHER_DEBITS, 10000n)
  assert.equal(row.deductions.UNPAID_LEAVE, 33333n)
  assert.equal(row.deductions.SUSPENSION, 16667n)
  assert.equal(row.deductions.SICK_CUT, 20000n)
  assert.equal(row.deductions.LATENESS, 5025n)
  assert.equal(row.deductions.SHORTFALL, 1000n)
  assert.equal(row.deductions.LOANS, 50000n)
  assert.equal(row.deductions.SOCIAL_INSURANCE, 48750n)
  assert.equal(row.gross, 500000n + 150000n + 31250n + 45000n)
  assert.equal(row.totalDeductions, 5025n + 1000n + 21666n + 70000n + 50000n + 30000n + 48750n)
  assert.equal(row.gross - row.totalDeductions, row.net)
  assert.equal(row.bank, 300000n)
  assert.equal(row.cash, 499809n - 300000n)
  assert.equal(row.overtimeMinutes, 330)
  assert.equal(row.overtimeEntries, 3)
  assert.equal(row.employerInsurance, 58750n)
})

test('row: legacy item with no breakdown keeps totals via explicit unsplit lines; cash/transfer split; negative net pays nothing', () => {
  const row = computeFinancialRow(source({ salaryComponents: null, earnedComponents: null, otherAdditions: '99.99', otherDeductions: '10.01',
    unpaidLeaveDeduction: '120.00', employeePayMethod: null, itemPayMethod: 'cash', netPay: '6459.98' }), new Map())
  assert.equal(row.buckets.get('UNSPLIT'), 150000n)
  assert.equal(row.additions.get('OTHER'), 9999n)
  assert.equal(row.deductions.OTHER_DEBITS, 1001n)
  assert.equal(row.deductions.UNPAID_LEAVE, 12000n)
  assert.equal(row.cash, 645998n)
  assert.equal(row.bank, 0n)
  // earnedComponents بدل salaryComponents، وفرق قرش القص يروح لأكبر بند مش عمود «غير مفصل»
  const earned = computeFinancialRow(source({ salaryComponents: null, earnedComponents: '[5000, 999.995, 500.004, 0, 0, 0]', allowances: '1500.00' }), new Map())
  assert.equal(earned.buckets.get('HOUSING'), 100000n)
  assert.equal(earned.buckets.get('TRANSPORT'), 50000n)
  assert.equal(earned.buckets.has('UNSPLIT'), false)
  const negative = computeFinancialRow(source({ netPay: '-15.00' }), new Map())
  assert.equal(negative.bank + negative.cash, 0n)
})

test('register: dynamic columns only for used buckets/categories, footer totals equal the sum of rows', () => {
  const rows = [
    computeFinancialRow(source({ employeeId: 2, employeeCode: 'EMP0002', fullName: 'بسمة', otherAdditions: '200.00', netPay: '6700.00',
      obligationLines: JSON.stringify([{ id: 11, type: 'CREDIT', amount: 200, collected: 200 }]) }), obligations),
    computeFinancialRow(source({ latenessDeduction: '100.10', netPay: '6399.90', employerInsurance: '100' }), obligations),
    // نفس الموظف في مسير تكميلي: سطر منفصل، وعدد الموظفين مرة واحدة
    computeFinancialRow(source({ runId: 2, runName: 'تكميلي', runStatus: 'PAID', basicSalary: '0.00', allowances: '0.00', salaryComponents: null, netPay: '0.00' }), obligations),
  ]
  const register = buildPayrollRegister(rows, true)
  assert.deepEqual(register.columns.allowanceBuckets.map(column => column.key), ['HOUSING', 'TRANSPORT'])
  assert.deepEqual(register.columns.additions.map(column => [column.key, column.total]), [['allowance', '200.00']])
  assert.equal(register.columns.deductions.length, 10)
  assert.equal(register.totals.headcount, 2)
  assert.equal(register.totals.items, 3)
  assert.equal(register.totals.gross, '13200.00')
  assert.equal(register.totals.totalDeductions, '100.10')
  assert.equal(register.totals.net, '13099.90')
  assert.equal(register.totals.deductions.LATENESS, '100.10')
  assert.equal(register.totals.allowanceBuckets.HOUSING, '2000.00')
  assert.equal(register.totals.bank, '13099.90')
  assert.equal(register.totals.employerInsurance, '100.00')
  assert.deepEqual(register.rows.map(row => [row.employeeCode, row.runId]), [['EMP0001', 1], ['EMP0001', 2], ['EMP0002', 1]])
  assert.equal(register.rows[2].additions.allowance, '200.00')
  assert.equal(register.rows[0].allowanceBuckets.HOUSING, '1000.00')
  assert.equal(buildPayrollRegister(rows, false).totals.employerInsurance, null)
  assert.equal(buildPayrollRegister(rows, false).rows[1].employerInsurance, null)
})

test('cost summary: by branch and by department with headcount, overtime, employer share and company cost', () => {
  const rows = [
    computeFinancialRow(source({ overtimeAmount: '250.55', netPay: '6750.55', employerInsurance: '705.00' }), obligations),
    computeFinancialRow(source({ employeeId: 2, departmentId: 20, departmentName: 'الحسابات', loanInstallments: '500', netPay: '6000.00', employerInsurance: '705.50' }), obligations),
    computeFinancialRow(source({ employeeId: 3, branchId: 2, branchName: 'النصر', departmentId: null, departmentName: null, netPay: '6500.00' }), obligations),
  ]
  const summary = buildPayrollCostSummary(rows, true)
  assert.deepEqual(summary.byBranch.map(group => [group.name, group.headcount, group.gross]), [['المعادي', 2, '13250.55'], ['النصر', 1, '6500.00']])
  assert.equal(summary.byBranch[0].deductions, '500.00')
  assert.equal(summary.byBranch[0].overtime, '250.55')
  assert.equal(summary.byBranch[0].employerInsurance, '1410.50')
  assert.equal(summary.byBranch[0].totalCost, '14661.05')
  assert.deepEqual(summary.byDepartment.map(group => group.name), ['الحسابات', 'المبيعات', FR_NO_DEPARTMENT])
  assert.deepEqual(summary.byDepartment[2].branchNames, ['النصر'])
  assert.equal(summary.totals.headcount, 3)
  assert.equal(summary.totals.net, '19250.55')
  assert.equal(summary.totals.totalCost, '21161.05')
  assert.equal(buildPayrollCostSummary([], false).totals.employerInsurance, null)
  assert.equal(buildPayrollCostSummary(rows, false).totals.totalCost, summary.totals.gross)
})

test('deductions: by kind with affected employees, typed by deduction type, other debits by category, merged per employee', () => {
  const rows = [
    computeFinancialRow(source({ latenessDeduction: '50.00', otherDeductions: '300.00', netPay: '6150.00',
      obligationLines: JSON.stringify([{ id: 13, type: 'DEBIT', amount: 200, collected: 200 }, { id: 14, type: 'DEBIT', amount: 100, collected: 100 }]) }), obligations),
    computeFinancialRow(source({ runId: 2, latenessDeduction: '25.00', netPay: '6475.00' }), obligations),
    computeFinancialRow(source({ employeeId: 2, employeeCode: 'EMP0002', otherDeductions: '40.00', netPay: '6460.00',
      obligationLines: JSON.stringify([{ id: 16, type: 'DEBIT', amount: 40, collected: 40 }]) }), obligations),
    computeFinancialRow(source({ employeeId: 3, employeeCode: 'EMP0003', netPay: '6500.00' }), obligations),
  ]
  const report = buildDeductionsReport(rows)
  const kind = key => report.kinds.find(row => row.key === key)
  assert.deepEqual([kind('LATENESS').amount, kind('LATENESS').employees], ['75.00', 1])
  assert.deepEqual([kind('TYPED').amount, kind('TYPED').employees], ['240.00', 2])
  assert.deepEqual([kind('OTHER_DEBITS').amount, kind('OTHER_DEBITS').employees], ['100.00', 1])
  assert.deepEqual(report.typedByType, [{ name: 'جزاء تأخير متكرر', amount: '200.00', employees: 1 }, { name: 'خصم', amount: '40.00', employees: 1 }])
  assert.deepEqual(report.otherByCategory, [{ name: 'عجز عهدة', amount: '100.00', employees: 1 }])
  assert.deepEqual(report.employees.map(row => [row.employeeCode, row.total]), [['EMP0001', '375.00'], ['EMP0002', '40.00']])
  assert.equal(report.employees[0].amounts.LATENESS, '75.00')
  assert.deepEqual(report.totals, { amount: '415.00', employees: 2 })
  // خصم مصنف من غير اسم نوع ولا نص
  const unnamed = buildDeductionsReport([computeFinancialRow(source({ otherDeductions: '5.00', netPay: '6495.00',
    obligationLines: JSON.stringify([{ id: 99, type: 'DEBIT', amount: 5, collected: 5 }]) }), new Map([[99, { id: 99, type: 'DEBIT', category: 'typed_deduction', label: null, typeName: null }]]))])
  assert.deepEqual(unnamed.typedByType, [{ name: FR_UNNAMED_TYPED, amount: '5.00', employees: 1 }])
})

test('overtime: minutes and amounts per employee (merged across runs) and per department', () => {
  const rows = [
    computeFinancialRow(source({ overtimeAmount: '100.00', overtimeHours: '2.50', overtimeEntryIds: '[1,2]', netPay: '6600.00' }), obligations),
    computeFinancialRow(source({ runId: 2, overtimeAmount: '40.00', overtimeHours: '1.00', overtimeEntryIds: '[3]', netPay: '6540.00' }), obligations),
    computeFinancialRow(source({ employeeId: 2, employeeCode: 'EMP0002', departmentId: null, departmentName: null, overtimeAmount: '60.00', overtimeHours: '1.25',
      overtimeEntryIds: '[4]', netPay: '6560.00' }), obligations),
    computeFinancialRow(source({ employeeId: 3, employeeCode: 'EMP0003' }), obligations),
  ]
  const report = buildOvertimeReport(rows)
  assert.deepEqual(report.employees.map(row => [row.employeeCode, row.entries, row.minutes, row.amount]), [['EMP0001', 3, 210, '140.00'], ['EMP0002', 1, 75, '60.00']])
  assert.deepEqual(report.departments.map(row => [row.name, row.employees, row.minutes, row.amount]), [['المبيعات', 1, 210, '140.00'], [FR_NO_DEPARTMENT, 1, 75, '60.00']])
  assert.deepEqual(report.totals, { employees: 2, entries: 4, minutes: 285, amount: '200.00', holidayWork: '0.00' })
})

test('loans: outstanding from DUE installments, month due/paid/remaining, overdue, deducted in payroll, settled loans hidden', () => {
  const loans = [
    { id: 1, employeeId: 1, employeeCode: 'EMP0001', fullName: 'أحمد', branchName: 'المعادي', departmentName: 'المبيعات', amount: '3000.00', status: 'DISBURSED' },
    { id: 2, employeeId: 1, employeeCode: 'EMP0001', fullName: 'أحمد', branchName: 'المعادي', departmentName: 'المبيعات', amount: '600.00', status: 'SETTLED' },
    { id: 3, employeeId: 2, employeeCode: 'EMP0002', fullName: 'بسمة', branchName: 'المعادي', departmentName: null, amount: '1000.00', status: 'SETTLED' },
  ]
  const installments = [
    { id: 1, loanId: 1, dueDate: '2026-07-22', amount: '1000.00', paidAmount: '1000.00', paid: true, financialStatus: 'PAID' },
    // اتأجل نصه: الأصل PARTIAL والباقي على ابنه
    { id: 2, loanId: 1, dueDate: '2026-08-22', amount: '1000.00', paidAmount: '400.00', paid: false, financialStatus: 'PARTIAL' },
    { id: 3, loanId: 1, dueDate: '2026-09-22', amount: '1000.00', paidAmount: null, paid: false, financialStatus: 'DUE' },
    { id: 4, loanId: 1, dueDate: '2026-09-10', amount: '600.00', paidAmount: null, paid: false, financialStatus: 'DUE', parentInstallmentId: 2 },
    { id: 5, loanId: 1, dueDate: '2026-10-22', amount: '1.00', paidAmount: null, paid: false, financialStatus: 'REVERSED', parentInstallmentId: 3 },
    // قسط قديم بحالة فاضية: من paid
    { id: 6, loanId: 2, dueDate: '2026-06-22', amount: '600.00', paidAmount: null, paid: 1, financialStatus: null },
    { id: 7, loanId: 3, dueDate: '2026-05-22', amount: '1000.00', paidAmount: '1000.00', paid: true, financialStatus: 'SETTLED' },
  ]
  const report = buildLoansReport({ loans, installments, startDate: '2026-08-23', endDate: '2026-09-22', deductedByEmployee: new Map([[1, 40000n], [7, 100n]]) })
  assert.equal(report.employees.length, 1)
  const row = report.employees[0]
  assert.equal(row.loansCount, 2)
  assert.equal(row.principal, '3600.00')
  assert.equal(row.paid, '2000.00')
  assert.equal(row.outstanding, '1600.00')
  assert.deepEqual([row.dueCount, row.dueAmount, row.duePaid, row.dueRemaining], [2, '1600.00', '0.00', '1600.00'])
  assert.equal(row.overdue, '0.00')
  assert.equal(row.deductedInPayroll, '400.00')
  assert.equal(row.loans[0].installments, 3)
  assert.equal(row.loans[0].nextDueDate, '2026-09-10')
  assert.deepEqual(report.totals, { employees: 1, loans: 2, principal: '3600.00', paid: '2000.00', outstanding: '1600.00', dueCount: 2, dueAmount: '1600.00',
    duePaid: '0.00', dueRemaining: '1600.00', overdue: '0.00', deductedInPayroll: '400.00' })
  // القسط المستحق قبل بداية الشهر ولسه ما اتسددش = متأخر
  const late = buildLoansReport({ loans: [loans[0]], installments: installments.filter(item => item.loanId === 1), startDate: '2026-09-23', endDate: '2026-10-22' })
  assert.equal(late.employees[0].overdue, '1600.00')
  assert.equal(late.employees[0].dueCount, 0)
  assert.deepEqual(installmentPosition({ amount: '10.00', paid: 0, financialStatus: null }), { status: 'DUE', amount: 1000n, paid: 0n, remaining: 1000n })
})
