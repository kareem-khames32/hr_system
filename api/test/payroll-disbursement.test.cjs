// صرف المسير موظف بموظف (قرار المالك 22 سبتمبر) — المنطق الصافي وخطافا المسير الكبير. لا SQL ولا خدمة.
const { test } = require('node:test')
const assert = require('node:assert/strict')
const fs = require('node:fs')
const path = require('node:path')
require('../node_modules/ts-node').register({ project: path.join(__dirname, '..', 'tsconfig.json'), transpileOnly: true })
require('../node_modules/reflect-metadata')
const disbursement = require('../src/payroll/payroll-disbursement')
const { bankSheetSources, buildBankSheet } = require('../src/payroll/bank-sheet')
const { payrollItemSettlementPayout } = require('../src/payroll/payroll-settlement-salary')
const read = file => fs.readFileSync(path.join(__dirname, '..', file), 'utf8').replace(/\r\n/g, '\n')
const codeOf = fn => { try { fn(); return null } catch (error) { return error.getResponse().code } }

const settlement = JSON.stringify({ settlementPayout: { caseId: 9, lastWorkingDay: '2026-08-10', label: 'تصفية — مصروف مع التصفية' } })
const items = [
  { id: 101, employeeId: 1, netPay: '6000.10', payMethod: 'transfer', breakdown: '{}' }, { id: 102, employeeId: 2, netPay: '3000.20', payMethod: 'cash', breakdown: '{}' },
  { id: 103, employeeId: 3, netPay: 5000.3, payMethod: 'mixed', breakdown: '{}' }, { id: 104, employeeId: 4, netPay: 2400, payMethod: 'transfer', breakdown: settlement },
  { id: 105, employeeId: 5, netPay: 0, payMethod: 'transfer', breakdown: '{}' },
]
const employees = [
  { id: 1, employeeCode: 'E001', fullName: 'سامي', branchId: 1, payMethod: 'transfer', bankName: 'بنك أ', iban: 'SA0000000000000000000001' },
  { id: 2, employeeCode: 'E002', fullName: 'نادر', branchId: 1, payMethod: 'cash' },
  { id: 3, employeeCode: 'E003', fullName: 'ليلى', branchId: 2, payMethod: 'mixed', bankTransferAmount: 2000, bankName: 'بنك ب', iban: 'SA0000000000000000000002' },
  { id: 4, employeeCode: 'E004', fullName: 'رامي', branchId: 1, payMethod: 'transfer' }, { id: 5, employeeCode: 'E005', fullName: 'صفر', branchId: 1, payMethod: 'transfer' },
]
const snapshot = (employee, departmentId, teamId) => ({ employeeId: employee.id, snapshot: { employeeCode: employee.employeeCode, fullName: employee.fullName, branchId: employee.branchId,
  branchName: `فرع ${employee.branchId}`, departmentId, departmentName: `قسم ${departmentId}`, teamId, teamName: teamId ? `فريق ${teamId}` : null } })
const members = [snapshot(employees[0], 10, 100), snapshot(employees[1], 10, null), snapshot(employees[2], 20, null), snapshot(employees[3], 20, null), snapshot(employees[4], 20, null)]
const mark = (itemId, status, extra = {}) => ({ itemId, status, amount: 0, bankAmount: 0, cashAmount: 0, payMethod: null, note: null, markedByUserId: 7, markedAt: new Date('2026-09-22T10:00:00Z'), ...extra })
const build = (runStatus, marks = [], branchScope = null) => disbursement.buildPayrollDisbursementRows({ runStatus, items, employees, members, marks, branchScope })
const rowOf = (result, employeeId) => result.rows.find(row => row.employeeId === employeeId)

test('DISB-01: وضع الصرف — بلا علامات (لم يبدأ / اتصرف كله مرة واحدة) أو موظف بموظف، ومتى التعليم مفتوح', () => {
  assert.equal(disbursement.payrollDisbursementMode('APPROVED', []), 'NOT_STARTED')
  assert.equal(disbursement.payrollDisbursementMode('APPROVED', [mark(101, 'UNPAID')]), 'NOT_STARTED', 'علامة اتلغت = مفيش علامات')
  assert.equal(disbursement.payrollDisbursementMode('APPROVED', [mark(101, 'PAID')]), 'PER_EMPLOYEE')
  assert.equal(disbursement.payrollDisbursementMode('PAID', []), 'RUN_LEVEL')
  assert.equal(disbursement.payrollDisbursementMode('PAID', [mark(101, 'PAID')]), 'PER_EMPLOYEE')
  assert.deepEqual([disbursement.payrollDisbursementOpen('APPROVED', 'NOT_STARTED'), disbursement.payrollDisbursementOpen('APPROVED', 'PER_EMPLOYEE'),
    disbursement.payrollDisbursementOpen('PAID', 'PER_EMPLOYEE'), disbursement.payrollDisbursementOpen('PAID', 'RUN_LEVEL'), disbursement.payrollDisbursementOpen('CALCULATED', 'NOT_STARTED')],
    ['OPEN', 'OPEN', 'LATE_ONLY', 'CLOSED', 'CLOSED'])
  assert.equal(disbursement.PAYROLL_DISBURSE_PERMISSION, 'payroll.disburse')
})

test('DISB-02: الصفوف من نفس دوال كشف البنوك (مصدر واحد)، وصف التصفية والصافي صفر لا يُعلَّمان', () => {
  const result = build('APPROVED')
  const sheet = buildBankSheet(bankSheetSources({ items, employees, members, branchScope: null, settlementOf: payrollItemSettlementPayout }))
  assert.deepEqual(result.rows.map(row => [row.employeeId, row.state, row.tickable]), [[1, 'UNPAID', true], [2, 'UNPAID', true], [3, 'UNPAID', true], [4, 'SETTLEMENT', false], [5, 'NO_AMOUNT', false]])
  for (const row of sheet.rows) assert.deepEqual([rowOf(result, row.employeeId).bankAmount, rowOf(result, row.employeeId).cashAmount, rowOf(result, row.employeeId).payMethodLabel],
    [row.bankAmount, row.cashAmount, row.payMethodLabel])
  assert.deepEqual([rowOf(result, 3).bankAmount, rowOf(result, 3).cashAmount], [2000, 3000.3])
  assert.deepEqual([rowOf(result, 4).stateLabel, rowOf(result, 4).settlement, rowOf(result, 4).netPay, rowOf(result, 4).bankAmount], ['مصروف مع التصفية', { caseId: 9, lastWorkingDay: '2026-08-10' }, 2400, 0])
  assert.deepEqual([rowOf(result, 1).departmentName, rowOf(result, 1).teamName, rowOf(result, 2).teamId], ['قسم 10', 'فريق 100', null])
  const totals = disbursement.summarizePayrollDisbursement(result.rows)
  assert.deepEqual([totals.payable, totals.settlement, totals.noAmount], [{ count: 3, total: sheet.totals.net, bank: sheet.totals.bank, cash: sheet.totals.cash }, { count: 1, total: 2400 }, 1])
  assert.deepEqual(totals.payable, { count: 3, total: 14000.6, bank: 8000.1, cash: 6000.5 }, 'الجمع بالقروش: لا كسور عائمة')
  // حساب الفرع يشوف موظفي فرعه بس
  assert.deepEqual(build('APPROVED', [], 2).rows.map(row => row.employeeId), [3])
})

test('DISB-03: صف «تم الصرف» بتقسيمه المثبت وقت العلامة، والتعليم بعد الإقفال للي لسه ماتصرفلوش بس', () => {
  const paid = mark(103, 'PAID', { amount: 5000.3, bankAmount: 2000, cashAmount: 3000.3, payMethod: 'mixed', note: 'استلمت' })
  // طريقة صرف الموظف اتغيرت بعد العلامة: اللي اتصرف فعلًا مايتغيرش
  const later = employees.map(employee => employee.id === 3 ? { ...employee, payMethod: 'cash', bankTransferAmount: null } : employee)
  const open = disbursement.buildPayrollDisbursementRows({ runStatus: 'APPROVED', items, employees: later, members, marks: [paid, mark(101, 'UNPAID', { note: 'اتلغت' })], branchScope: null })
  assert.deepEqual([open.mode, rowOf(open, 3).state, rowOf(open, 3).payMethod, rowOf(open, 3).bankAmount, rowOf(open, 3).cashAmount, rowOf(open, 3).note, rowOf(open, 3).tickable],
    ['PER_EMPLOYEE', 'PAID', 'mixed', 2000, 3000.3, 'استلمت', true])
  assert.deepEqual([rowOf(open, 1).state, rowOf(open, 1).note, rowOf(open, 1).markedByUserId], ['UNPAID', 'اتلغت', 7])
  const closed = build('PAID', [paid])
  assert.deepEqual(closed.rows.map(row => [row.employeeId, row.state, row.tickable]), [[1, 'UNPAID', true], [2, 'UNPAID', true], [3, 'PAID', false], [4, 'SETTLEMENT', false], [5, 'NO_AMOUNT', false]])
  const totals = disbursement.summarizePayrollDisbursement(closed.rows)
  assert.deepEqual([totals.paid, totals.unpaid], [{ count: 1, total: 5000.3, bank: 2000, cash: 3000.3 }, { count: 2, total: 9000.3, bank: 6000.1, cash: 3000.2 }])
  // مسير اتصرف كله مرة واحدة بلا علامات: الكل مصروف ضمنيًا ولا علامة تتغير
  const runLevel = build('PAID')
  assert.deepEqual([runLevel.mode, runLevel.rows.filter(row => row.state === 'PAID').length, runLevel.rows.some(row => row.tickable)], ['RUN_LEVEL', 3, false])
  assert.deepEqual(disbursement.summarizePayrollDisbursement(runLevel.rows).unpaid, { count: 0, total: 0, bank: 0, cash: 0 })
})

test('DISB-04: الفلاتر كلها مع بعض — الفرع والقسم والفريق وطريقة الصرف والحالة والبحث بالاسم أو الكود', () => {
  const { rows } = build('APPROVED', [mark(101, 'PAID', { amount: 6000.1, bankAmount: 6000.1, cashAmount: 0, payMethod: 'transfer' })])
  const ids = filter => disbursement.filterPayrollDisbursementRows(rows, filter).map(row => row.employeeId)
  assert.deepEqual(ids({}), [1, 2, 3, 4, 5])
  assert.deepEqual(ids({ branchId: 1 }), [1, 2, 4, 5]); assert.deepEqual(ids({ departmentId: 10 }), [1, 2]); assert.deepEqual(ids({ teamId: 100 }), [1])
  assert.deepEqual(ids({ payMethod: 'cash' }), [2]); assert.deepEqual(ids({ state: 'PAID' }), [1]); assert.deepEqual(ids({ state: 'UNPAID' }), [2, 3])
  assert.deepEqual(ids({ search: ' e003 ' }), [3]); assert.deepEqual(ids({ search: 'ناد' }), [2])
  assert.deepEqual(ids({ branchId: 1, departmentId: 20, state: 'SETTLEMENT' }), [4]); assert.deepEqual(ids({ branchId: 2, payMethod: 'cash' }), [])
  assert.deepEqual(disbursement.summarizePayrollDisbursement(disbursement.filterPayrollDisbursementRows(rows, { departmentId: 10 })).paid, { count: 1, total: 6000.1, bank: 6000.1, cash: 0 })
})

test('DISB-05: الملاحظة اختيارية بحد أقصى، ومتقصوصة', () => {
  assert.equal(disbursement.payrollDisbursementNote(undefined), null); assert.equal(disbursement.payrollDisbursementNote('   '), null)
  assert.equal(disbursement.payrollDisbursementNote('  تحويل 88 '), 'تحويل 88')
  assert.equal(codeOf(() => disbursement.payrollDisbursementNote(5)), 'PAYRUN-DISBURSE-NOTE')
  assert.equal(codeOf(() => disbursement.payrollDisbursementNote('ط'.repeat(disbursement.PAYROLL_DISBURSE_NOTE_MAX + 1))), 'PAYRUN-DISBURSE-NOTE')
})

test('DISB-06: خدمة الصرف لا تكتب غير جدول العلامات وحدث المسير، وآثار الصرف تفضل في pay() وحده مرة واحدة، وإعادة الفتح مرفوضة بعد أول علامة', () => {
  const service = read('src/payroll/payroll-disbursement.service.ts')
  const writes = [...service.matchAll(/getRepository\((\w+)\)\s*\.\s*(save|update|delete|remove|insert|upsert)\(/g)].map(match => `${match[1]}.${match[2]}`)
  assert.deepEqual([...new Set(writes)].sort(), ['PayrollRunEvent.save'], 'الكتابة المباشرة: حدث المسير فقط')
  assert.equal((service.match(/repo\.save\(/g) ?? []).length, 1, 'وعلامة الصرف عبر repo (جدول payroll_item_disbursements)')
  assert.ok(service.includes('const repo = em.getRepository(PayrollItemDisbursement)'))
  assert.doesNotMatch(service, /\.query\(`?\s*(UPDATE|DELETE|INSERT)/i)
  assert.doesNotMatch(service, /OvertimeEntry|LoanInstallment|postPayroll|reservePayroll|claimPayrollPeriod|\.status\s*=\s*'PAID'/, 'لا أثر مالي ولا تغيير حالة مسير من شاشة الصرف')
  assert.ok(service.includes('await lockPayrollRunForCorrection(em, runId)'), 'التعليم تحت قفل المسير نفسه')
  const controller = read('src/payroll/payroll-disbursement.controller.ts')
  assert.equal((controller.match(/@Perm\(PAYROLL_DISBURSE_PERMISSION\)\n  @Post\(/g) ?? []).length, 2, 'التعليم لحامل payroll.disburse وحده')
  assert.equal((controller.match(/@Perm\(PAYROLL_DISBURSE_PERMISSION, 'payroll\.view'\)\n  @Get\(/g) ?? []).length, 3)
  const payroll = read('src/payroll/payroll.service.ts')
  const pay = payroll.slice(payroll.indexOf('  async pay(user: JwtPayload'), payroll.indexOf('  // ===== الاستعلام (بنطاق الفرع)'))
  const close = pay.indexOf('closePayrollRunDisbursement(em, run, items, user.sub, dto.unpaidReason)')
  assert.ok(close > 0 && close < pay.indexOf("{ status: 'PAID', payrollRunId: runId }") && close < pay.indexOf('postPayrollInstallments('), 'فحص الإقفال قبل أي أثر مالي')
  assert.ok(close > pay.indexOf("if (run.status !== 'APPROVED')"), 'بعد فحص الحالة: الآثار في انتقال واحد APPROVED→PAID')
  assert.equal((pay.match(/run\.status = 'PAID'/g) ?? []).length, 2, 'انتقال PAID في pay وحده (مسير العكس والمسير العادي)')
  assert.ok(payroll.includes("if (status === 'CALCULATED') await assertPayrollRunNotDisbursed(em, runId)"))
  // ملف كشف البنوك لم يُعدَّل: نستورد منه فقط
  assert.ok(read('src/payroll/payroll-disbursement.ts').includes("from './bank-sheet'"))
})
