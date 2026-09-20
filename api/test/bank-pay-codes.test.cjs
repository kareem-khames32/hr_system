// خط bank-pay-codes (قرار المالك 16 سبتمبر): طريقة الصرف «نقدي + بنك»، كشف البنوك، وكود الموظف من النظام.
// دوال صافية + فحص نصي للملفات؛ لا SQL ولا خدمة.
const { test } = require('node:test')
const assert = require('node:assert/strict')
const fs = require('node:fs')
const path = require('node:path')
require('../node_modules/ts-node').register({ project: path.join(__dirname, '..', 'tsconfig.json'), transpileOnly: true })
require('../node_modules/reflect-metadata')
const { payrollPaySplit, employeePayMethodIssue } = require('../src/payroll/pay-split')
const { buildBankSheet, NO_BANK_LABEL } = require('../src/payroll/bank-sheet')
const { formatEmployeeCode, nextEmployeeCodeFrom } = require('../src/employees/employee-code')
const { plainToInstance } = require('../node_modules/class-transformer')
const { validateSync } = require('../node_modules/class-validator')
const dto = require('../src/employees/employees.dto')
const root = path.resolve(__dirname, '..', '..')
const read = file => fs.readFileSync(path.join(root, file), 'utf8').replace(/\r\n/g, '\n')

test('تقسيم الصافي: نقدي كله نقدي، تحويل كله بنك، نقدي + بنك = مبلغ البنك والباقي نقدي بالقص', () => {
  assert.deepEqual(payrollPaySplit(5000, 'cash', null), { bank: 0, cash: 5000 })
  assert.deepEqual(payrollPaySplit(5000, 'transfer', 1000), { bank: 5000, cash: 0 })
  assert.deepEqual(payrollPaySplit(5000, 'visa', null), { bank: 5000, cash: 0 })
  assert.deepEqual(payrollPaySplit(5000, 'mixed', 3000), { bank: 3000, cash: 2000 })
  assert.deepEqual(payrollPaySplit('4321.559', 'mixed', '1000.10'), { bank: 1000.1, cash: 3321.45 })
  // الصافي أقل من مبلغ البنك: كله للبنك
  assert.deepEqual(payrollPaySplit(2500, 'mixed', 3000), { bank: 2500, cash: 0 })
  // صافي سالب أو صفر: لا صرف
  assert.deepEqual(payrollPaySplit(-50, 'mixed', 3000), { bank: 0, cash: 0 })
  assert.deepEqual(payrollPaySplit(0.1 + 0.2, 'mixed', 0.1), { bank: 0.1, cash: 0.2 })
})

test('فحص طريقة الصرف: مبلغ البنك > 0 في «نقدي + بنك»، والبنك والآيبان مطلوبان لما البنك داخل، والملف القديم الناقص يتحفظ', () => {
  const bank = { bankName: 'الراجحي', iban: 'SA0380000000608010167519' }
  assert.equal(employeePayMethodIssue({ payMethod: 'cash' }), null)
  assert.match(employeePayMethodIssue({ payMethod: 'mixed', ...bank }), /مبلغ التحويل البنكي/)
  assert.match(employeePayMethodIssue({ payMethod: 'mixed', bankTransferAmount: 0, ...bank }), /مبلغ التحويل البنكي/)
  assert.match(employeePayMethodIssue({ payMethod: 'mixed', bankTransferAmount: 500, iban: bank.iban }), /اسم البنك مطلوب/)
  assert.match(employeePayMethodIssue({ payMethod: 'transfer', bankName: 'الراجحي' }), /الآيبان مطلوب/)
  assert.equal(employeePayMethodIssue({ payMethod: 'mixed', bankTransferAmount: 500, ...bank }), null)
  assert.match(employeePayMethodIssue({ payMethod: 'cheque' }), /طريقة الصرف/)
  // ملف قديم «تحويل» بلا بنك: تعديل حقل تاني يتحفظ، لكن تغيير الطريقة أو البنك يطلب البيانات كاملة
  const legacy = { payMethod: 'transfer', bankName: null, iban: null }
  assert.equal(employeePayMethodIssue({ ...legacy }, legacy), null)
  assert.match(employeePayMethodIssue({ ...legacy, payMethod: 'mixed', bankTransferAmount: 100 }, legacy), /اسم البنك مطلوب/)
  assert.match(employeePayMethodIssue({ ...legacy, bankName: 'الأهلي' }, legacy), /الآيبان مطلوب/)
})

test('كشف البنوك: مبلغ البنك والنقدي لكل موظف، وإجمالي كل بنك، والنقدي الكامل خارج البنوك', () => {
  const sheet = buildBankSheet([
    { employeeId: 1, employeeCode: 'EMP0002', fullName: 'ب', payMethod: 'transfer', bankTransferAmount: null, bankName: 'الراجحي', iban: 'SA1', netPay: '4000.50' },
    { employeeId: 2, employeeCode: 'EMP0001', fullName: 'أ', payMethod: 'mixed', bankTransferAmount: '1500.00', bankName: 'الراجحي', iban: 'SA2', netPay: 3000 },
    { employeeId: 3, employeeCode: 'EMP0003', fullName: 'ج', payMethod: 'cash', bankTransferAmount: null, bankName: null, iban: null, netPay: 2000 },
    { employeeId: 4, employeeCode: 'EMP0004', fullName: 'د', payMethod: 'mixed', bankTransferAmount: 9000, bankName: '', iban: null, netPay: 1000.99 },
  ])
  assert.deepEqual(sheet.rows.map(row => [row.employeeCode, row.bankAmount, row.cashAmount]),
    [['EMP0001', 1500, 1500], ['EMP0002', 4000.5, 0], ['EMP0004', 1000.99, 0], ['EMP0003', 0, 2000]])
  assert.deepEqual(sheet.banks, [{ bankName: 'الراجحي', employees: 2, total: 5500.5 }, { bankName: NO_BANK_LABEL, employees: 1, total: 1000.99 }])
  assert.deepEqual(sheet.totals, { employees: 4, bank: 6501.49, cash: 3500, net: 10001.49 })
  assert.equal(sheet.rows.find(row => row.employeeId === 2).payMethodLabel, 'نقدي + بنك')
})

test('كود الموظف: EMP- + 4 أرقام (شكل النظام القديم)، والتالي = أكبر EMP-#### أو EMP#### + 1 مع تجاهل الأكواد الأخرى', () => {
  assert.equal(formatEmployeeCode(1), 'EMP-0001')
  assert.equal(formatEmployeeCode(12345), 'EMP-12345')
  assert.equal(nextEmployeeCodeFrom([]), 'EMP-0001')
  assert.equal(nextEmployeeCodeFrom(['EMP001', 'EMP0009', 'WAVE-02', 'EMP12A', null]), 'EMP-0010')
  // الأكواد المنقولة من النظام القديم بالشرطة بتكمل التسلسل
  assert.equal(nextEmployeeCodeFrom(['EMP-0397', 'EMP-0478', 'EMP0009', 'EMP-12A']), 'EMP-0479')
  assert.throws(() => formatEmployeeCode(0))
})

test('الـDTO: كود الموظف مش مدخل في الإضافة ولا التعديل (يتشال)، و«نقدي + بنك» مقبولة بمبلغ موجب', () => {
  const create = plainToInstance(dto.CreateEmployeeDto, { employeeCode: '!!bad code!!', payMethod: 'mixed', bankTransferAmount: '1500.5' })
  const createErrors = validateSync(create, { whitelist: true })
  assert.equal('employeeCode' in create, false)
  assert.equal(createErrors.some(error => ['employeeCode', 'payMethod', 'bankTransferAmount'].includes(error.property)), false)
  const update = plainToInstance(dto.UpdateEmployeeDto, { employeeCode: 'HACK1', payMethod: 'mixed', bankTransferAmount: -5 })
  const updateErrors = validateSync(update, { whitelist: true })
  assert.equal('employeeCode' in update, false)
  assert.ok(updateErrors.some(error => error.property === 'bankTransferAmount'))
})

test('الربط: البصمات برقم البصمة وحده، والتوليد داخل معاملة الإضافة بقفل، والشاشات والترحيل', () => {
  const attendance = read('api/src/attendance/attendance.service.ts')
  assert.match(attendance, /this\.employees\.find\(\{ where: \{ fingerprintCode: In\(chunk\) \} \}\)/)
  assert.doesNotMatch(attendance, /\{ employeeCode: In\(chunk\) \}/)
  assert.match(attendance, /\[emp\.fingerprintCode\]\s*\n\s*\.map/)
  const service = read('api/src/employees/employees.service.ts')
  assert.match(service, /await lockAttendanceRuleMutation\(em\)\n\s*const employeeCode = await generateEmployeeCode\(em\)/)
  assert.doesNotMatch(service, /fingerprintCode: data\.employeeCode|employeeCode: data\.fingerprintCode/)
  assert.match(read('api/src/employees/employee-code.ts'), /sp_getapplock @Resource = N'hr:employee-code-sequence'/)
  assert.match(read('src/app/attendance/manual-entry/page.tsx'), /employeeCode: punchCode/)
  const form = read('src/components/EmployeeForm.tsx')
  assert.doesNotMatch(form, /setField\('employeeCode'/)
  assert.match(form, /<option value="mixed">نقدي \+ بنك<\/option>/)
  assert.match(read('src/components/layout/Sidebar.tsx'), /\{ label: 'كشف البنوك', href: '\/payroll\/bank-sheet' \}/)
  assert.match(read('src/app/payroll/payslip/[id]/page.tsx'), /تحويل بنكي \{formatMoney\(employee\.paySplit\.bank\)\} — نقدي \{formatMoney\(employee\.paySplit\.cash\)\}/)
  const migration = read('docs/migrations/payroll/20260916_050_pay_method_mixed_employee_code.sql')
  assert.match(migration, /IF COL_LENGTH\(N'dbo\.employees', N'bankTransferAmount'\) IS NULL\s+ALTER TABLE dbo\.employees ADD \[bankTransferAmount\] decimal\(18,2\) NULL;/)
  assert.match(migration, /WHERE NULLIF\(LTRIM\(RTRIM\(e\.\[fingerprintCode\]\)\), N''\) IS NULL/)
  assert.doesNotMatch(migration, /\bDROP\b|\bDELETE\b/)
})
