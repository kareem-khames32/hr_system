'use strict'
// «بدل ضغط العمل» (قرار المالك 26 سبتمبر) — القواعد النقية بلا قاعدة بيانات:
//  - بيتصرف كامل فوق الصافي بعد الحماية والأقساط، والتعديل الوحيد تناسب أيام الخدمة بنفس قاعدة الراتب بالحرف.
//  - برّه كل أساس: المكونات الست بس هي أساس المؤثرات (grossMonthlySalary)، وحماية الصافي مابتشوفوش.
//  - التوافق للخلف: الصفر منه برّه كل بصمة (سجل الأجر والأجر الحالي ودليل طلب الزيادة)، والمدخل القديم بالست بس مقبول.
//  - ظاهر في القسيمة وسجل الراتب والتقارير والتصدير والتحديث الجماعي، ومحجوب زي باقي البيانات المالية.
// Run: node --test api/test/payroll-work-pressure.test.cjs
const { test } = require('node:test')
const assert = require('node:assert/strict')
const path = require('node:path')
require('../node_modules/reflect-metadata')
require('../node_modules/ts-node').register({ project: path.join(__dirname, '..', 'tsconfig.json'), transpileOnly: true })
const { grossMonthlySalary, paidMonthlySalary, MONTHLY_SALARY_COMPONENTS, PAID_SALARY_COMPONENTS, WORK_PRESSURE_ALLOWANCE } = require('../src/employees/compensation')
const pressure = require('../src/payroll/payroll-work-pressure')
const { protectPayrollObligations } = require('../src/payroll/payroll-obligation-protection')
const history = require('../src/payroll/payroll-salary-history')
const { normalizeMonthlySalaryPeriods } = require('../src/payroll/payroll-period-salary')
const { samePayrollRunSalarySource } = require('../src/payroll/payroll-run-salary')
const { withCurrentOptionalSalary, planEmployeeSalaryChange } = require('../src/payroll/payroll-salary-change')
const { projectPayrollItemLines } = require('../src/payroll/payroll-item-lines')
const { computeFinancialRow, FR_ALLOWANCE_BUCKETS } = require('../src/reports/financial-report')
const { BULK_FIELD_BY_KEY } = require('../src/employees/employee-bulk-update.fields')
const { SALARY_KEYS } = require('../src/employees/employee-bulk-update.plan')
const { employeeExportColumns } = require('../src/employees/employee-export')
const { projectEmployee } = require('../src/employees/employee-projection')
const { FINANCIAL_CHANGE_FIELDS, employeeChangeType } = require('../src/employees/employee-change-log')
const requests = require('../src/requests/salary-change-requests')
const { payrollLiveSourceContent } = require('../src/payroll/payroll-live-source-contract')

const six = { basicSalary: '6000.00', housingAllowance: '0.00', transportAllowance: '0.00', phoneAllowance: '0.00', workNatureAllowance: '0.00', otherAllowance: '0.00' }
const full = { fullCoverage: true, coverDays: 30, monthlyDays: 30 }
const joiner = { fullCoverage: false, coverDays: 22, monthlyDays: 30 }

test('WP-U1: the component catalogue — six effect components stay as they were, the seventh is paid only', () => {
  assert.equal(MONTHLY_SALARY_COMPONENTS.length, 6, 'أساس المؤثرات فضل ست مكونات')
  assert.ok(!MONTHLY_SALARY_COMPONENTS.some(component => component.key === 'workPressureAllowance'))
  assert.deepEqual(PAID_SALARY_COMPONENTS.map(component => component.key), [...MONTHLY_SALARY_COMPONENTS.map(component => component.key), 'workPressureAllowance'])
  assert.deepEqual({ ...WORK_PRESSURE_ALLOWANCE }, { key: 'workPressureAllowance', code: 'WORK_PRESSURE', nameAr: 'بدل ضغط العمل', nameEn: 'Work Pressure Allowance' })
  const employee = { basicSalary: 6000, housingAllowance: '500', workPressureAllowance: '1000.00' }
  assert.equal(grossMonthlySalary(employee), 6500, 'أساس نهاية الخدمة وبدل الرصيد وسعر اليوم من غير البدل')
  assert.equal(paidMonthlySalary(employee), 7500, 'الإجمالي المصروف (خطابات الراتب) شامل البدل')
  assert.equal(paidMonthlySalary({ basicSalary: 6000 }), 6000)
})

test('WP-U2: proration is the salary rule itself — full cycle pays in full, a joiner gets coverDays/monthlyDays truncated to the cent', () => {
  assert.equal(pressure.payrollProrateCents(100000, full), 100000)
  assert.equal(pressure.payrollProrateCents(100000, joiner), 73333, '1000 × 22 / 30 = 733.333… مقصوص 733.33')
  assert.equal(pressure.payrollProrateCents(100000, { fullCoverage: false, coverDays: 31, monthlyDays: 30 }), 100000, 'بسقف الشهر')
  assert.equal(pressure.payrollWorkPressurePay(0, full), null, 'من غير بدل = مفيش أثر خالص')
  assert.deepEqual(pressure.payrollWorkPressurePay(1000, full), { monthlyAmount: 1000, earnedAmount: 1000 })
  assert.deepEqual(pressure.payrollWorkPressurePay(1000, joiner), { monthlyAmount: 1000, earnedAmount: 733.33 })
  assert.deepEqual(pressure.payrollWorkPressurePay(10.15, { fullCoverage: false, coverDays: 3, monthlyDays: 30 }), { monthlyAmount: 10.15, earnedAmount: 1.01 }, '10.15 × 3/30 = 1.015 ← 1.01 بالقص')
  assert.throws(() => pressure.payrollWorkPressurePay(-1, full))
  assert.deepEqual(pressure.payrollWorkPressureSalaryLine({ monthlyAmount: 1000, earnedAmount: 733.33 }),
    { code: 'WORK_PRESSURE', nameAr: 'بدل ضغط العمل', nameEn: 'Work Pressure Allowance', monthlyAmount: 1000, earnedAmount: 733.33 })
})

test('WP-U3: the paid item adds the earned allowance in exact cents after everything else — nothing is taken from it', () => {
  const amounts = { allowances: 2600, netPay: 6045.09 }
  assert.equal(pressure.withWorkPressurePay(amounts, null), amounts, 'من غير بدل = نفس الأرقام بالحرف (نفس الكائن)')
  assert.deepEqual(pressure.withWorkPressurePay(amounts, { monthlyAmount: 1000, earnedAmount: 1000 }), { allowances: 3600, netPay: 7045.09 })
  assert.deepEqual(pressure.withWorkPressurePay({ allowances: 0.1, netPay: 0.2 }, { monthlyAmount: 0.1, earnedAmount: 0.1 }), { allowances: 0.2, netPay: 0.3 }, 'بالقروش مش بالكسور الثنائية')
  // صافي المؤثرات السالب (إجازة بلا أجر أكبر من الاستحقاق) بيفضل ظاهر: البدل مايغطيهوش — الاعتماد بيفحص الصافي من غيره
  assert.deepEqual(pressure.withWorkPressurePay({ allowances: 0, netPay: -200 }, { monthlyAmount: 1000, earnedAmount: 1000 }), { allowances: 1000, netPay: 800 })
  assert.equal(pressure.payrollItemWorkPressureEarned({}), 0)
  assert.equal(pressure.payrollItemWorkPressureEarned(null), 0)
  assert.equal(pressure.payrollItemWorkPressureEarned({ workPressureAllowance: { monthlyAmount: 1000, earnedAmount: 733.33 } }), 733.33)
  for (const broken of [{ workPressureAllowance: 5 }, { workPressureAllowance: { earnedAmount: -1 } }, { workPressureAllowance: { earnedAmount: '733.33' } }, { workPressureAllowance: [] }]) {
    assert.equal(pressure.payrollItemWorkPressureEarned(broken), null, JSON.stringify(broken))
  }
})

test('WP-U4: net protection never sees it — floor, cap and deduction room stay on 6000, and debts bigger than the salary leave the 1000 whole', () => {
  const debit = (id, amount) => ({ id, amount, category: 'custody_shortfall', deductionRequestId: null, effectiveDate: '2026-07-01' })
  // سقف 50% من الإجمالي المستحق: على 6000 = 3000 (مش 3500 على 7000)
  const capped = protectPayrollObligations({ earnedFixedGross: 6000, overtime: 0, unpaidLeave: 0, attendance: { lateness: 0, shortfall: 0, absence: 0 },
    credits: [], debits: [debit(1, 5000)], settings: { minNetGuarantee: null, netFloorPct: null, maxDeductionPctOfGross: '50' } })
  assert.equal(capped.trace.cap, '3000.000000'); assert.equal(capped.otherDeductions, 3000)
  assert.equal(capped.trace.balanceBeforeDeductions, '6000.00')
  // ديون أكبر من الراتب بلا أرضية ولا سقف: الحماية بتاخد الـ6000 كلها وتسيب الباقي مرحّل، والبدل برّه
  const drained = protectPayrollObligations({ earnedFixedGross: 6000, overtime: 0, unpaidLeave: 0, attendance: { lateness: 300, shortfall: 0, absence: 200 },
    credits: [], debits: [debit(2, 9000)], settings: { minNetGuarantee: null, netFloorPct: null, maxDeductionPctOfGross: null } })
  const sixNet = 6000 - drained.attendance.lateness - drained.attendance.absence - drained.otherDeductions
  assert.equal(sixNet, 0, 'الست اتاخدت كلها'); assert.equal(drained.loanSlot.netBeforeLoans, 0, 'ولا قسط يلاقي مكان')
  assert.equal(drained.lines.find(line => line.id === 2).carried, 3500, 'الباقي من الدين بيترحل مش بياخد من البدل')
  assert.deepEqual(pressure.withWorkPressurePay({ allowances: 0, netPay: sixNet }, pressure.payrollWorkPressurePay(1000, full)), { allowances: 1000, netPay: 1000 })
  // أرضية 10% من الإجمالي: على 6000 = 600
  const floored = protectPayrollObligations({ earnedFixedGross: 6000, overtime: 0, unpaidLeave: 0, attendance: { lateness: 0, shortfall: 0, absence: 0 },
    credits: [], debits: [debit(3, 9000)], settings: { minNetGuarantee: null, netFloorPct: '10', maxDeductionPctOfGross: null } })
  assert.equal(floored.trace.floor, '600.000000'); assert.equal(floored.otherDeductions, 5400)
})

test('WP-U5: a zero allowance stays out of every fingerprint — history, current source and request evidence saved before 071 still match', () => {
  const current = { ...six, currency: 'EGP' }
  const before = payrollLiveSourceContent(current).contentHash
  assert.equal(history.salaryCurrentSourceHash(current), before, 'الأجر الحالي بالست بس = نفس البصمة القديمة')
  assert.equal(history.salaryCurrentSourceHash({ ...current, workPressureAllowance: '0.00' }), before, 'البدل الصفري برّه البصمة')
  assert.equal(history.salaryCurrentSourceHash({ ...current, workPressureAllowance: null }), before)
  assert.notEqual(history.salaryCurrentSourceHash({ ...current, workPressureAllowance: '1000.00' }), before, 'البدل الفعلي داخل البصمة')
  const segment = { effectiveFrom: '2026-01-01', effectiveTo: null, currency: 'EGP', ...six }
  const input = { employeeId: 3, revision: 1, reason: 'دليل قديم', evidenceReference: 'old:1', currentSourceHash: 'a'.repeat(64) }
  const v1 = history.salaryHistoryContentHash({ ...input, segments: [segment] })
  assert.equal(history.salaryHistoryContentHash({ ...input, segments: [{ ...segment, workPressureAllowance: '0.00' }] }), v1)
  assert.notEqual(history.salaryHistoryContentHash({ ...input, segments: [{ ...segment, workPressureAllowance: '5.00' }] }), v1)
  const monthly = { ...input, cycleStartDay: 23, createdBy: 4, createdAt: '2026-09-14T12:00:00.000Z' }
  const period = { ...segment, effectivePayrollPeriod: '2026-09', effectiveToPayrollPeriod: null }
  const v2 = history.monthlySalaryHistoryContentHash({ ...monthly, segments: [period] })
  assert.equal(history.monthlySalaryHistoryContentHash({ ...monthly, segments: [{ ...period, workPressureAllowance: '0.00' }] }), v2)
  assert.notEqual(history.monthlySalaryHistoryContentHash({ ...monthly, segments: [{ ...period, workPressureAllowance: '1000.00' }] }), v2)
})

test('WP-U6: dated history takes the allowance as an optional seventh amount — old six-field input is still exact, a negative one is refused', () => {
  const old = normalizeMonthlySalaryPeriods([{ ...six, currency: 'EGP', effectivePayrollPeriod: '2026-08', effectiveToPayrollPeriod: null }], 23)[0]
  assert.equal(old.workPressureAllowance, '0.00')
  const dated = normalizeMonthlySalaryPeriods([
    { ...six, currency: 'EGP', effectivePayrollPeriod: '2026-08', effectiveToPayrollPeriod: '2026-08' },
    { ...six, workPressureAllowance: '1000', currency: 'EGP', effectivePayrollPeriod: '2026-09', effectiveToPayrollPeriod: null }], 23)
  assert.deepEqual(dated.map(row => [row.effectivePayrollPeriod, row.workPressureAllowance]), [['2026-08', '0.00'], ['2026-09', '1000.00']])
  assert.throws(() => normalizeMonthlySalaryPeriods([{ ...six, workPressureAllowance: '-1', currency: 'EGP', effectivePayrollPeriod: '2026-09', effectiveToPayrollPeriod: null }], 23))
  assert.throws(() => normalizeMonthlySalaryPeriods([{ ...six, workPressureAllowance: '1.001', currency: 'EGP', effectivePayrollPeriod: '2026-09', effectiveToPayrollPeriod: null }], 23), undefined, 'لا تقريب')
  const daily = history.normalizeSalaryHistorySegments([{ effectiveFrom: '2026-01-01', effectiveTo: null, currency: 'EGP', ...six }])[0]
  assert.equal(daily.workPressureAllowance, '0.00')
  const { basicSalary: _basic, ...missingBasic } = six
  assert.throws(() => normalizeMonthlySalaryPeriods([{ ...missingBasic, workPressureAllowance: '1.00', currency: 'EGP', effectivePayrollPeriod: '2026-09', effectiveToPayrollPeriod: null }], 23), undefined, 'الست فاضلة إلزامية')
})

test('WP-U7: a salary change that does not mention the allowance keeps the current one (never zeroes it), and a real change is dated', () => {
  const current = { ...six, workPressureAllowance: '1000.00', currency: 'EGP' }
  assert.deepEqual(withCurrentOptionalSalary({ ...six, basicSalary: '7000.00', currency: 'EGP' }, current), { ...six, basicSalary: '7000.00', workPressureAllowance: '1000.00', currency: 'EGP' })
  assert.deepEqual(withCurrentOptionalSalary({ ...six, workPressureAllowance: '0.00', currency: 'EGP' }, current).workPressureAllowance, '0.00', 'الصفر الصريح بيتسمع')
  const plan = planEmployeeSalaryChange({ history: { version: null, segments: [] }, current, salary: { ...six, basicSalary: '7000.00', currency: 'EGP' },
    effectivePayrollPeriod: '2026-09', currentPayrollPeriod: '2026-09', cycleStartDay: 23 })
  assert.equal(plan.current.workPressureAllowance, '1000.00'); assert.equal(plan.periods[0].workPressureAllowance, '1000.00')
  const raised = planEmployeeSalaryChange({ history: { version: null, segments: [] }, current, salary: { ...six, workPressureAllowance: '1500.00', currency: 'EGP' },
    effectivePayrollPeriod: '2026-09', currentPayrollPeriod: '2026-09', cycleStartDay: 23 })
  assert.equal(raised.currentChanged, true); assert.equal(raised.periods[0].workPressureAllowance, '1500.00')
})

test('WP-U8: approval compares the month salary including the allowance; a snapshot saved before 071 means zero', () => {
  const saved = { kind: 'MONTHLY_HISTORY', referencePeriod: '2026-09', currency: 'EGP', amounts: { ...six }, sourceRef: 'x', historyVersionId: 1, historyRevision: 1,
    historyContentHash: 'h', effectivePayrollPeriod: '2026-09', effectiveToPayrollPeriod: null, warning: null }
  const current = amounts => ({ ok: true, monthlyComponents: [6000, 0, 0, 0, 0, 0], workPressureAllowance: Number(amounts.workPressureAllowance ?? 0), source: { ...saved, amounts } })
  assert.equal(samePayrollRunSalarySource(saved, current({ ...six })), true, 'لقطة قديمة من غير البدل = صفر')
  assert.equal(samePayrollRunSalarySource(saved, current({ ...six, workPressureAllowance: '1000.00' })), false, 'بدل اتضاف بعد الحساب يوقف الاعتماد')
  assert.equal(samePayrollRunSalarySource({ ...saved, amounts: { ...six, workPressureAllowance: '1000.00' } }, current({ ...six, workPressureAllowance: '1000.00' })), true)
})

test('WP-U9: payslip lines, payroll register buckets, bulk update, export, change log and field masking all know the seventh component', () => {
  const salaryComponents = [...MONTHLY_SALARY_COMPONENTS.map((component, index) => ({ code: component.code, nameAr: component.nameAr, nameEn: component.nameEn,
    monthlyAmount: index ? 0 : 6000, earnedAmount: index ? 0 : 6000 })), pressure.payrollWorkPressureSalaryLine({ monthlyAmount: 1000, earnedAmount: 1000 })]
  salaryComponents[1].earnedAmount = 500; salaryComponents[1].monthlyAmount = 500
  const item = { basicSalary: 6000, allowances: 1500, overtimeAmount: 0, otherAdditions: 0, latenessDeduction: 0, shortfallDeduction: 0, absenceDeduction: 0,
    unpaidLeaveDeduction: 0, loanInstallments: 0, otherDeductions: 0, socialInsuranceDeduction: 0, netPay: 7500, breakdown: JSON.stringify({ salaryComponents }) }
  const lines = projectPayrollItemLines(item)
  assert.deepEqual(lines.earnings.map(line => [line.key, line.name, line.amount]),
    [['BASIC', 'الأساسي', 6000], ['SALARY:HOUSING', 'بدل السكن', 500], ['SALARY:WORK_PRESSURE', 'بدل ضغط العمل', 1000]], 'سطر القسيمة بعد باقي البدلات')
  assert.deepEqual(lines.totals, { earnings: 7500, deductions: 0, net: 7500 })
  assert.ok(FR_ALLOWANCE_BUCKETS.some(bucket => bucket.key === 'WORK_PRESSURE' && bucket.label === 'بدل ضغط العمل'))
  const row = computeFinancialRow({ runId: 1, runName: null, runStatus: 'PAID', employeeId: 5, employeeCode: 'E5', fullName: 'موظف', branchId: 1, branchName: 'ف',
    departmentId: null, departmentName: null, costCenterId: null, costCenterName: null, itemPayMethod: 'cash', ...item, salaryComponents: JSON.stringify(salaryComponents),
    earnedComponents: null, obligationLines: '[]', leaveDeductionLines: '[]', overtimeEntryIds: '[]' }, new Map())
  assert.equal(row.buckets.get('WORK_PRESSURE'), 100000n); assert.equal(row.gross, 750000n); assert.equal(row.net, 750000n)
  const field = BULK_FIELD_BY_KEY.get('workPressureAllowance')
  assert.equal(field.label, 'بدل ضغط العمل'); assert.equal(field.salary, true); assert.equal(field.kind, 'money')
  assert.ok(SALARY_KEYS.includes('workPressureAllowance'))
  const exported = employeeExportColumns(true).find(column => column.header === 'بدل ضغط العمل')
  assert.ok(exported?.finance, 'عمود مالي في التصدير'); assert.equal(employeeExportColumns(false).some(column => column.header === 'بدل ضغط العمل'), false)
  assert.equal(exported.value({ workPressureAllowance: 1000 }, {}), 1000)
  assert.ok(FINANCIAL_CHANGE_FIELDS.test('workPressureAllowance')); assert.equal(employeeChangeType('workPressureAllowance'), 'SALARY')
  const employee = { id: 7, basicSalary: 6000, workPressureAllowance: 1000, fullName: 'موظف' }
  assert.equal('workPressureAllowance' in projectEmployee(employee, { sub: 1, role: 'employee', employeeId: 8, permissions: [] }), false, 'محجوب عن غير المالية')
  assert.equal(projectEmployee(employee, { sub: 1, role: 'employee', employeeId: 7, permissions: [] }).workPressureAllowance, 1000, 'الموظف بيشوفه في بيانات راتبه')
})

test('WP-U10: a raise request staged before 071 (six-field basis) is still valid; a new one carries the allowance with the same zero fingerprint', () => {
  const salary = { ...six, currency: 'SAR' }
  const currentSourceHash = history.salaryCurrentSourceHash(salary)
  const basis = { schemaVersion: requests.SALARY_CHANGE_BASIS_VERSION, requestId: 11, employeeId: 7, branchId: 2, historyRevision: 0, currentSourceHash, salary, stagedByUserId: 21 }
  const client = { newSalary: '6600.00', effectivePayrollPeriod: '2026-09', reason: 'قرار زيادة' }
  // البصمة بالمعادلة القديمة بالحرف (قبل ترحيل 071): الست بس
  const contentHash = payrollLiveSourceContent({ basis, newSalary: client.newSalary, effectivePayrollPeriod: client.effectivePayrollPeriod, reason: client.reason }).contentHash
  const stored = requests.readStoredSalaryChangePayload({ ...client, salaryChangeBasis: { ...basis, contentHash } })
  assert.equal(stored.salaryChangeBasis.contentHash, contentHash)
  assert.equal(stored.salaryChangeBasis.salary.workPressureAllowance, '0.00', 'الدليل القديم = بدل صفر')
  const withZero = requests.readStoredSalaryChangePayload({ ...client, salaryChangeBasis: { ...basis, salary: { ...salary, workPressureAllowance: '0.00' }, contentHash } })
  assert.equal(withZero.salaryChangeBasis.contentHash, contentHash, 'نفس البصمة بالبدل الصفري الصريح')
  assert.throws(() => requests.readStoredSalaryChangePayload({ ...client, salaryChangeBasis: { ...basis, salary: { ...salary, workPressureAllowance: '9.00' }, contentHash } }),
    error => error.getResponse?.().code === 'SALARY_REQUEST_BASIS_INVALID', 'بدل متلاعب فيه بعد التقديم بيوقف الطلب')
  assert.throws(() => requests.readStoredSalaryChangePayload({ ...client, salaryChangeBasis: { ...basis, salary: { ...salary, forged: '1.00' }, contentHash } }),
    error => error.getResponse?.().code === 'SALARY_REQUEST_BASIS_INVALID')
})
