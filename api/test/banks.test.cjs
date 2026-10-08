// B4.6 (ب) — جدول البنوك وكود بنك الموظف من آيبانه: حساب نقي بلا قاعدة بيانات.
// الجدول الفاضي = كشف البنك زي الأول بالحرف؛ ولما فيه بنوك دولة: آيبان سليم كوده مش في الجدول بيطلع عليه تنبيه (من غير تغيير مبلغ).
const { test } = require('node:test')
const assert = require('node:assert/strict')
const fs = require('node:fs')
const path = require('node:path')
const apiRoot = path.resolve(__dirname, '..')
require('../node_modules/ts-node').register({ project: path.join(apiRoot, 'tsconfig.json'), transpileOnly: true })
const banks = require('../src/payroll/banks')
const sheet = require('../src/payroll/bank-sheet')
const SA = code => `SA03${code}${'1'.repeat(18)}`
const EG = code => `EG38${code}${'2'.repeat(21)}`
const B = (country, ibanCode, nameAr, isActive = true) => ({ country, ibanCode, nameAr, isActive })
const CATALOG = [B('SA', '80', 'مصرف الراجحي'), B('SA', '10', 'البنك الأهلي'), B('SA', '45', 'بنك معطّل', false), B('EG', '0002', 'بنك مصر')]

test('BKU-01: كود البنك من الآيبان — السعودي رقمين والمصري 4 أرقام بعد خانتي التحقق؛ والآيبان الغلط من غير كود', () => {
  assert.deepEqual([banks.ibanBankRef(SA('80')), banks.ibanBankRef(` sa03 80${'1'.repeat(18)} `), banks.ibanBankRef(EG('0002'))],
    [{ country: 'SA', ibanCode: '80' }, { country: 'SA', ibanCode: '80' }, { country: 'EG', ibanCode: '0002' }])
  assert.deepEqual([banks.ibanBankRef('SA0380'), banks.ibanBankRef(`AE03${'1'.repeat(20)}`), banks.ibanBankRef(null), banks.ibanBankRef(''), banks.ibanBankRef(SA('80') + '1')], [null, null, null, null, null])
  assert.deepEqual([banks.bankOfIban(SA('80'), CATALOG).nameAr, banks.bankOfIban(EG('0002'), CATALOG).nameAr, banks.bankOfIban(SA('45'), CATALOG), banks.bankOfIban(SA('99'), CATALOG), banks.bankOfIban(SA('80'), [])],
    ['مصرف الراجحي', 'بنك مصر', null, null, null])
})

test('BKU-02: التنبيه بس لما الجدول فيه بنوك مفعّلة لدولة الآيبان والكود مش منهم', () => {
  const issue = iban => banks.bankCatalogIssue(iban, CATALOG)
  assert.deepEqual([issue(SA('80')), issue(EG('0002'))], [null, null])
  assert.match(issue(SA('99')), /كود البنك في الآيبان \(99\) مش في جدول البنوك/)
  assert.match(issue(SA('45')), /\(45\)/, 'البنك المعطّل مش من الجدول')
  assert.match(issue(EG('0003')), /\(0003\)/)
  // جدول فاضي، أو دولة مالهاش بنوك مفعّلة، أو آيبان غلط (ليه تنبيهه القايم): مفيش تنبيه
  assert.deepEqual([banks.bankCatalogIssue(SA('99'), []), banks.bankCatalogIssue(EG('0003'), [B('SA', '80', 'الراجحي')]), banks.bankCatalogIssue(SA('99'), [B('SA', '80', 'معطّل', false)]), issue('SA0380'), issue(null)],
    [null, null, null, null, null])
})

test('BKU-03: خانات البنك — الدولة والكود عند الإضافة بس، وطول الكود بدولته، والاسم والسويفت والتفعيل', () => {
  assert.deepEqual(banks.bankFields({ country: 'sa', ibanCode: ' 80 ', nameAr: '  مصرف   الراجحي ', swiftCode: 'rjhisari' }, true),
    { fields: { country: 'SA', ibanCode: '80', nameAr: 'مصرف الراجحي', swiftCode: 'RJHISARI', isActive: true }, error: null })
  assert.deepEqual(banks.bankFields({ country: 'EG', ibanCode: '0002', nameAr: 'بنك مصر', nameEn: ' Banque Misr ', isActive: false }, true).fields,
    { country: 'EG', ibanCode: '0002', nameAr: 'بنك مصر', nameEn: 'Banque Misr', isActive: false })
  for (const [input, creating, message] of [[{ country: 'AE', ibanCode: '80', nameAr: 'بنك' }, true, /مصر أو السعودية/], [{ country: 'SA', ibanCode: '080', nameAr: 'بنك' }, true, /2 أرقام/],
    [{ country: 'EG', ibanCode: '80', nameAr: 'بنك' }, true, /4 أرقام/], [{ country: 'SA', ibanCode: '8A', nameAr: 'بنك' }, true, /2 أرقام/], [{ country: 'SA', ibanCode: '80', nameAr: 'ب' }, true, /اسم البنك/],
    [{ country: 'SA', ibanCode: '80' }, true, /اسم البنك/], [{ ibanCode: '81' }, false, /مابيتغيّروش/], [{ country: 'EG' }, false, /مابيتغيّروش/], [{ swiftCode: 'ab' }, false, /السويفت/],
    [{ isActive: 'yes' }, false, /مفعّل/], [{ nameEn: 'x'.repeat(201) }, false, /200 حرف/]]) {
    const result = banks.bankFields(input, creating)
    assert.equal(result.fields, null, JSON.stringify(input)); assert.match(result.error, message)
  }
  assert.deepEqual(banks.bankFields({ nameEn: ' ', swiftCode: '', isActive: false }, false), { fields: { nameEn: null, swiftCode: null, isActive: false }, error: null })
})

test('BKU-04: كشف البنك — من غير جدول الصفوف زي الأول بالحرف؛ وبالجدول تنبيه كود البنك بعد تنبيهات الملف القايمة ومن غير تغيير مبلغ', () => {
  const source = (employeeId, iban, extra = {}) => ({ employeeId, employeeCode: `E${employeeId}`, fullName: `موظف ${employeeId}`, payMethod: 'transfer', bankTransferAmount: null, bankName: 'بنك', iban, netPay: 5000, ...extra })
  const sources = [source(1, SA('80')), source(2, SA('99')), source(3, 'SA03'), source(4, SA('99'), { payMethod: 'cash' }), source(5, SA('99'), { netPay: 0 }), source(6, EG('0003')), source(7, SA('99'), { bankName: null })]
  const before = sheet.buildBankSheet(sources)
  assert.deepEqual([sheet.buildBankSheet(sources, {}), sheet.buildBankSheet(sources, { banks: [] })], [before, before])
  const after = sheet.buildBankSheet(sources, { banks: CATALOG })
  const issues = rows => Object.fromEntries(rows.map(row => [row.employeeId, row.issue]))
  assert.deepEqual(Object.entries(issues(before.rows)).filter(([, issue]) => issue).map(([id]) => Number(id)), [3, 7], 'قبل: آيبان غلط وبنك ناقص بس')
  const now = issues(after.rows)
  assert.deepEqual([now[1], now[4], now[5], now[3], now[7]], [null, null, null, issues(before.rows)[3], issues(before.rows)[7]], 'السليم والنقدي والصفر زي ما هم، وتنبيه الملف القايم مقدّم')
  assert.match(now[2], /\(99\)/); assert.match(now[6], /\(0003\)/)
  // المبالغ والإجماليات زي ما هي؛ اللي زاد عدّ التنبيهات بس
  const strip = rows => rows.map(({ issue: _issue, ...row }) => row)
  assert.deepEqual([strip(after.rows), after.totals, after.banks], [strip(before.rows), before.totals, before.banks])
  assert.deepEqual([before.issues.employees, after.issues.employees], [2, 4])
})

test('BKU-06: شاشة الصرف — نفس تنبيه كشف البنك بنفس الجدول، ومن غيره الصفوف زي الأول', () => {
  const { buildPayrollDisbursementRows } = require('../src/payroll/payroll-disbursement')
  const employees = [{ id: 1, employeeCode: 'E1', fullName: 'موظف 1', branchId: 1, payMethod: 'transfer', bankTransferAmount: null, bankName: 'بنك', iban: SA('80') },
    { id: 2, employeeCode: 'E2', fullName: 'موظف 2', branchId: 1, payMethod: 'transfer', bankTransferAmount: null, bankName: 'بنك', iban: SA('99') }]
  const input = { runStatus: 'APPROVED', items: employees.map(emp => ({ id: emp.id * 10, employeeId: emp.id, netPay: 5000, payMethod: 'transfer', breakdown: null })), employees, members: [], marks: [], branchScope: null }
  const before = buildPayrollDisbursementRows(input)
  assert.deepEqual([before.rows.map(row => row.issue), buildPayrollDisbursementRows({ ...input, banks: [] })], [[null, null], before])
  const after = buildPayrollDisbursementRows({ ...input, banks: CATALOG })
  assert.deepEqual([after.rows.find(row => row.employeeId === 1).issue, /\(99\)/.test(after.rows.find(row => row.employeeId === 2).issue), after.rows.map(row => row.bankAmount)], [null, true, before.rows.map(row => row.bankAmount)])
})

test('BKU-05: مصدر الكود — مفيش عمود كود بنك على الموظف، والجدول من غير بذرة، والتنبيه في كشف البنك وشاشة الصرف من نفس القايمة', () => {
  const read = rel => fs.readFileSync(path.join(apiRoot, 'src', rel), 'utf8').replace(/\r\n/g, '\n')
  assert.doesNotMatch(read('employees/employee.entity.ts'), /bankCode|ibanCode/)
  assert.doesNotMatch(read('payroll/banks.service.ts'), /OnApplicationBootstrap|seed\(/, 'مفيش بذرة أكواد بنوك')
  assert.equal((read('payroll/bank-sheet.controller.ts').match(/\{ banks: banksCatalog \}/g) ?? []).length, 2, 'الكشف وإجمالي كل عملة بنفس الجدول')
  assert.match(read('payroll/payroll-disbursement.service.ts'), /banks: await readActiveBanks\(em\)/)
  assert.match(read('payroll/banks.ts'), /if \(!\(await banksReady\(em\)\)\) return \[\]/, 'قبل الترحيل: من غير تنبيه')
})
